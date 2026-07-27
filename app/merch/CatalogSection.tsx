import Link from "next/link";
import Image from "next/image";
import {
  listPublishedProducts,
  listActiveCategories,
  listApprovedSellers,
  parseCatalogSearchParams,
  type CatalogFilters,
} from "../lib/merch/catalog";
import { formatPrice } from "../lib/merch/format";
import { convertMinor, getRates, type Rates } from "../lib/external/fx";
import { PRODUCT_STATUS_LABEL, type ProductStatus } from "../config/merch";

const field =
  "mt-1 w-full rounded-lg border border-white/12 bg-ink/40 px-3 py-2 text-sm text-cream outline-none transition focus:border-gold/50";
const labelCls = "block text-[11px] font-semibold uppercase tracking-wider text-cream/45";

// Приблизительный эквивалент цены в другой валюте. Настоящая цена — та, что
// указал продавец; эта строка справочная, поэтому со знаком «≈» и мелким
// шрифтом. Нет курса — нет строки.
function ApproxPrice({ cents, currency, rates }: { cents: number; currency: string; rates: Rates | null }) {
  if (!rates) return null;
  const target = currency.toUpperCase() === "USD" ? "EUR" : "USD";
  const converted = convertMinor(cents, currency, target, rates);
  if (converted === null) return null;
  return <span className="text-[11px] text-cream/40">≈ {formatPrice(converted, target)}</span>;
}

function StatusPill({ status }: { status: string }) {
  const s = status as ProductStatus;
  const tone =
    s === "in_stock" ? "bg-teal/15 text-teal"
    : s === "out_of_stock" ? "bg-white/10 text-cream/50"
    : "bg-gold/15 text-gold";
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${tone}`}>{PRODUCT_STATUS_LABEL[s] ?? status}</span>;
}

const PERPAGE = 12;

export default async function CatalogSection({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const filters: CatalogFilters = { ...parseCatalogSearchParams(searchParams), perPage: PERPAGE };
  const [{ items, total, dbAvailable }, categories, sellers, rates] = await Promise.all([
    listPublishedProducts(filters),
    listActiveCategories(),
    listApprovedSellers(),
    // Курсы — вспомогательная величина: getRates() сам вернёт null, если
    // источник недоступен, и тогда эквивалент просто не показывается.
    getRates(),
  ]);

  const page = filters.page ?? 1;
  const pages = Math.max(1, Math.ceil(total / PERPAGE));
  const q = filters.q ?? "";

  // Ссылка на страницу пагинации с сохранением фильтров.
  const pageHref = (p: number) => {
    const usp = new URLSearchParams();
    if (q) usp.set("q", q);
    if (filters.categoryId != null) usp.set("category", String(filters.categoryId));
    if (filters.sellerId != null) usp.set("seller", String(filters.sellerId));
    if (filters.minPriceCents != null) usp.set("min", String(filters.minPriceCents / 100));
    if (filters.maxPriceCents != null) usp.set("max", String(filters.maxPriceCents / 100));
    if (filters.inStockOnly) usp.set("stock", "1");
    if (filters.acceptsDoffaOnly) usp.set("doffa", "1");
    if (filters.sort && filters.sort !== "newest") usp.set("sort", filters.sort);
    usp.set("page", String(p));
    return `/merch?${usp.toString()}#catalog`;
  };

  return (
    <div className="mt-8">
      {/* Фильтры — серверная GET-форма, deep-linkable, работает без JS. */}
      <form method="get" action="/merch#catalog" className="card rounded-2xl p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <label className={labelCls} htmlFor="q">Поиск</label>
            <input id="q" name="q" defaultValue={q} placeholder="Название или описание" className={field} />
          </div>
          <div>
            <label className={labelCls} htmlFor="category">Категория</label>
            <select id="category" name="category" defaultValue={filters.categoryId ?? ""} className={field}>
              <option value="" className="bg-ink">Все</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id} className="bg-ink">{c.name} ({c.count})</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="seller">Продавец</label>
            <select id="seller" name="seller" defaultValue={filters.sellerId ?? ""} className={field}>
              <option value="" className="bg-ink">Все</option>
              {sellers.map((s) => (
                <option key={s.id} value={s.id} className="bg-ink">{s.shop_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="min">Цена от</label>
            <input id="min" name="min" type="number" min="0" inputMode="numeric" defaultValue={filters.minPriceCents != null ? filters.minPriceCents / 100 : ""} className={field} />
          </div>
          <div>
            <label className={labelCls} htmlFor="max">Цена до</label>
            <input id="max" name="max" type="number" min="0" inputMode="numeric" defaultValue={filters.maxPriceCents != null ? filters.maxPriceCents / 100 : ""} className={field} />
          </div>
          <div>
            <label className={labelCls} htmlFor="sort">Сортировка</label>
            <select id="sort" name="sort" defaultValue={filters.sort ?? "newest"} className={field}>
              <option value="newest" className="bg-ink">Сначала новые</option>
              <option value="price_asc" className="bg-ink">Дешевле</option>
              <option value="price_desc" className="bg-ink">Дороже</option>
              <option value="popular" className="bg-ink">Популярные</option>
            </select>
          </div>
          <div className="flex items-end gap-4">
            <label className="flex items-center gap-2 text-xs text-cream/70">
              <input type="checkbox" name="stock" value="1" defaultChecked={filters.inStockOnly} className="h-4 w-4 accent-gold" /> В наличии
            </label>
            <label className="flex items-center gap-2 text-xs text-cream/70">
              <input type="checkbox" name="doffa" value="1" defaultChecked={filters.acceptsDoffaOnly} className="h-4 w-4 accent-gold" /> Оплата DOFFA
            </label>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="submit" className="rounded-full bg-gradient-to-r from-gold to-copper px-6 py-2 text-sm font-bold text-ink transition hover:brightness-110">
            Применить
          </button>
          <Link href="/merch#catalog" className="rounded-full border border-cream/25 px-6 py-2 text-sm font-semibold text-cream transition hover:border-gold hover:text-gold">
            Сбросить
          </Link>
        </div>
      </form>

      {/* Результаты / пустое состояние */}
      {items.length === 0 ? (
        <div className="card mt-8 rounded-3xl p-10 text-center">
          <h3 className="display text-xl font-bold text-cream-soft">
            {dbAvailable && (q || filters.categoryId != null || filters.sellerId != null)
              ? "Ничего не найдено"
              : "Товары появятся после публикации продавцами"}
          </h3>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-cream/60">
            {dbAvailable && (q || filters.categoryId != null || filters.sellerId != null)
              ? "Попробуйте изменить фильтры или сбросить их."
              : "Каталог наполняется проверенными продавцами. Мы не выкладываем выдуманные товары и фотографии."}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/merch/become-a-seller" className="rounded-full bg-gradient-to-r from-gold to-copper px-6 py-2.5 text-sm font-bold text-ink transition hover:brightness-110">Стать продавцом</Link>
            <Link href="/merch/custom-leather" className="rounded-full border border-cream/25 px-6 py-2.5 text-sm font-semibold text-cream transition hover:border-gold hover:text-gold">Заказать изделие из кожи</Link>
          </div>
        </div>
      ) : (
        <>
          <p className="mt-6 text-sm text-cream/50">Найдено: {total}</p>
          <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((p) => (
              <Link key={p.id} href={`/merch/products/${p.slug}`} className="card group flex flex-col overflow-hidden rounded-2xl transition hover:border-gold/40">
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-espresso/25 to-ink/40">
                  {p.main_image ? (
                    <Image src={p.main_image} alt={p.main_image_alt ?? p.title} fill sizes="(max-width:768px) 100vw, 33vw" unoptimized className="object-cover transition group-hover:scale-[1.03]" />
                  ) : (
                    <span className="flex h-full items-center justify-center text-[11px] uppercase tracking-widest text-cream/30">нет фото</span>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="display text-base font-bold text-cream-soft">{p.title}</h3>
                    <StatusPill status={p.status} />
                  </div>
                  {p.short_desc && <p className="mt-1.5 flex-1 text-sm leading-relaxed text-cream/60 line-clamp-2">{p.short_desc}</p>}
                  <div className="mt-3 flex items-center justify-between">
                    <span className="flex items-baseline gap-1.5">
                      <span className="display text-lg font-extrabold text-cream-soft">{formatPrice(p.price_cents, p.currency)}</span>
                      <ApproxPrice cents={p.price_cents} currency={p.currency} rates={rates} />
                    </span>
                    {p.accepts_doffa && <span className="rounded-full border border-gold/30 bg-gold/10 px-2 py-0.5 text-[10px] font-semibold text-gold">DOFFA</span>}
                  </div>
                  <span className="mt-1 text-[11px] text-cream/40">{p.shop_name}</span>
                </div>
              </Link>
            ))}
          </div>

          {pages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-3 text-sm">
              {page > 1 && <Link href={pageHref(page - 1)} className="rounded-full border border-cream/25 px-4 py-1.5 text-cream transition hover:border-gold hover:text-gold">← Назад</Link>}
              <span className="text-cream/50">Стр. {page} из {pages}</span>
              {page < pages && <Link href={pageHref(page + 1)} className="rounded-full border border-cream/25 px-4 py-1.5 text-cream transition hover:border-gold hover:text-gold">Вперёд →</Link>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
