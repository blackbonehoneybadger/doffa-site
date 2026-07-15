// Слой доступа к каталогу маркетплейса (server-only). Читает ТОЛЬКО публичные
// товары одобренных продавцов. Если БД не подключена/недоступна — функции
// возвращают пустой результат (честный empty state), а не падают.
//
// Чистый билдер фильтра (`buildCatalogFilter`) отделён от исполнения и покрыт
// тестами без БД.
import { query } from "../db";
import { PUBLIC_PRODUCT_STATUSES } from "../../config/merch";

export type CatalogSort = "newest" | "price_asc" | "price_desc" | "popular";

export type CatalogFilters = {
  q?: string;
  categoryId?: number | null;
  sellerId?: number | null;
  minPriceCents?: number | null;
  maxPriceCents?: number | null;
  inStockOnly?: boolean;
  acceptsDoffaOnly?: boolean;
  sort?: CatalogSort;
  page?: number;
  perPage?: number;
};

export type ProductCard = {
  id: number;
  slug: string;
  title: string;
  short_desc: string | null;
  price_cents: number;
  currency: string;
  accepts_doffa: boolean;
  status: string;
  in_stock_qty: number;
  seller_slug: string;
  shop_name: string;
  category_name: string | null;
  main_image: string | null;
  main_image_alt: string | null;
};

const PUBLIC_STATUS_SQL = PUBLIC_PRODUCT_STATUSES.map((s) => `'${s}'`).join(",");

const ORDER_BY: Record<CatalogSort, string> = {
  newest: "p.created_at desc",
  price_asc: "p.price_cents asc",
  price_desc: "p.price_cents desc",
  popular: "sales_count desc, p.created_at desc",
};

/**
 * Чистый билдер WHERE/ORDER/params для каталога. Публичные статусы и одобренный
 * продавец фиксируются в базовом запросе (executor), здесь — пользовательские
 * фильтры. Плейсхолдеры Postgres начинаются с $startIndex.
 */
export function buildCatalogFilter(
  filters: CatalogFilters,
  startIndex = 1,
): { where: string; params: unknown[]; order: string } {
  const clauses: string[] = [];
  const params: unknown[] = [];
  let i = startIndex;

  if (filters.q && filters.q.trim()) {
    clauses.push(`(p.title ilike $${i} or p.short_desc ilike $${i})`);
    params.push(`%${filters.q.trim()}%`);
    i++;
  }
  if (filters.categoryId != null) {
    clauses.push(`p.category_id = $${i}`); params.push(filters.categoryId); i++;
  }
  if (filters.sellerId != null) {
    clauses.push(`p.seller_id = $${i}`); params.push(filters.sellerId); i++;
  }
  if (filters.minPriceCents != null) {
    clauses.push(`p.price_cents >= $${i}`); params.push(filters.minPriceCents); i++;
  }
  if (filters.maxPriceCents != null) {
    clauses.push(`p.price_cents <= $${i}`); params.push(filters.maxPriceCents); i++;
  }
  if (filters.inStockOnly) {
    clauses.push(`p.status = 'in_stock' and p.in_stock_qty > 0`);
  }
  if (filters.acceptsDoffaOnly) {
    clauses.push(`p.accepts_doffa = true`);
  }

  const where = clauses.length ? `and ${clauses.join(" and ")}` : "";
  const order = ORDER_BY[filters.sort ?? "newest"] ?? ORDER_BY.newest;
  return { where, params, order };
}

const CARD_SELECT = `
  select p.id, p.slug, p.title, p.short_desc, p.price_cents, p.currency,
         p.accepts_doffa, p.status, p.in_stock_qty,
         s.slug as seller_slug, s.shop_name,
         c.name as category_name,
         img.url as main_image, img.alt as main_image_alt,
         coalesce(oi.cnt, 0) as sales_count
  from merch_products p
  join merch_sellers s on s.id = p.seller_id and s.status = 'approved'
  left join merch_categories c on c.id = p.category_id
  left join merch_product_images img on img.product_id = p.id and img.is_main = true
  left join (
    select oi.product_id, count(*)::int as cnt
    from merch_order_items oi
    join merch_orders_shop o on o.id = oi.order_id and o.status in ('paid','processing','shipped','delivered')
    group by oi.product_id
  ) oi on oi.product_id = p.id
  where p.status in (${PUBLIC_STATUS_SQL})`;

export async function listPublishedProducts(
  filters: CatalogFilters,
): Promise<{ items: ProductCard[]; total: number; dbAvailable: boolean }> {
  const perPage = Math.min(Math.max(filters.perPage ?? 12, 1), 48);
  const page = Math.max(filters.page ?? 1, 1);
  const { where, params, order } = buildCatalogFilter(filters);
  try {
    const rows = await query<ProductCard>(
      `${CARD_SELECT} ${where} order by ${order} limit ${perPage} offset ${(page - 1) * perPage}`,
      params,
    );
    const countRows = await query<{ count: number }>(
      `select count(*)::int as count from merch_products p
       join merch_sellers s on s.id = p.seller_id and s.status = 'approved'
       where p.status in (${PUBLIC_STATUS_SQL}) ${where}`,
      params,
    );
    return { items: rows, total: countRows[0]?.count ?? 0, dbAvailable: true };
  } catch {
    // БД не подключена/нет таблиц — честный пустой каталог, без падения.
    return { items: [], total: 0, dbAvailable: false };
  }
}

export type ProductDetail = ProductCard & {
  category_id: number | null;
  seller_id: number;
  full_desc: string | null;
  material: string | null;
  making_method: string | null;
  ship_from_region: string | null;
  ship_regions: string | null;
  shipping_cost_cents: number | null;
  pickup_available: boolean;
  seller_return_policy: string | null;
  seller_accepts_doffa: boolean;
  images: { url: string; alt: string | null }[];
  variants: { id: number; name: string; size: string | null; color: string | null; material: string | null; price_delta_cents: number; stock_qty: number }[];
};

export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  try {
    const rows = await query<ProductDetail & { category_id: number | null; seller_id: number }>(
      `select p.*, s.slug as seller_slug, s.shop_name, s.return_policy as seller_return_policy,
              s.accepts_doffa as seller_accepts_doffa, c.name as category_name,
              img.url as main_image, img.alt as main_image_alt
       from merch_products p
       join merch_sellers s on s.id = p.seller_id and s.status = 'approved'
       left join merch_categories c on c.id = p.category_id
       left join merch_product_images img on img.product_id = p.id and img.is_main = true
       where p.slug = $1 and p.status in (${PUBLIC_STATUS_SQL})
       limit 1`,
      [slug],
    );
    const p = rows[0];
    if (!p) return null;
    const images = await query<{ url: string; alt: string | null }>(
      `select url, alt from merch_product_images where product_id = $1 order by is_main desc, sort asc`,
      [p.id],
    );
    const variants = await query<ProductDetail["variants"][number]>(
      `select id, name, size, color, material, price_delta_cents, stock_qty
       from merch_product_variants where product_id = $1 order by id asc`,
      [p.id],
    );
    return { ...p, images, variants };
  } catch {
    return null;
  }
}

export async function listActiveCategories(): Promise<{ id: number; slug: string; name: string; count: number }[]> {
  try {
    // Только НЕ пустые категории (есть хотя бы один публичный товар).
    return await query(
      `select c.id, c.slug, c.name, count(p.id)::int as count
       from merch_categories c
       join merch_products p on p.category_id = c.id and p.status in (${PUBLIC_STATUS_SQL})
       join merch_sellers s on s.id = p.seller_id and s.status = 'approved'
       where c.is_active = true
       group by c.id, c.slug, c.name
       having count(p.id) > 0
       order by c.sort asc, c.name asc`,
    );
  } catch {
    return [];
  }
}

export async function listApprovedSellers(): Promise<{ id: number; slug: string; shop_name: string }[]> {
  try {
    return await query(
      `select distinct s.id, s.slug, s.shop_name
       from merch_sellers s
       join merch_products p on p.seller_id = s.id and p.status in (${PUBLIC_STATUS_SQL})
       where s.status = 'approved'
       order by s.shop_name asc`,
    );
  } catch {
    return [];
  }
}

const SORTS: CatalogSort[] = ["newest", "price_asc", "price_desc", "popular"];

/** Разбирает query-параметры каталога (строки) в типизированные фильтры. */
export function parseCatalogSearchParams(sp: Record<string, string | string[] | undefined>): CatalogFilters {
  const one = (k: string): string | undefined => {
    const v = sp[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const num = (k: string): number | null => {
    const v = one(k);
    if (v == null || v.trim() === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const sortRaw = one("sort") as CatalogSort | undefined;
  return {
    q: one("q") || undefined,
    categoryId: num("category"),
    sellerId: num("seller"),
    minPriceCents: num("min") != null ? Math.round(num("min")! * 100) : null,
    maxPriceCents: num("max") != null ? Math.round(num("max")! * 100) : null,
    inStockOnly: one("stock") === "1",
    acceptsDoffaOnly: one("doffa") === "1",
    sort: sortRaw && SORTS.includes(sortRaw) ? sortRaw : "newest",
    page: Math.max(num("page") ?? 1, 1),
  };
}

export async function getRelatedProducts(product: Pick<ProductDetail, "id" | "category_id">): Promise<ProductCard[]> {
  try {
    const { items } = await listPublishedProducts({ categoryId: product.category_id, perPage: 4 });
    return items.filter((p) => p.id !== product.id).slice(0, 3);
  } catch {
    return [];
  }
}
