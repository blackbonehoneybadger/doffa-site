// Юнит-тесты чистой логики каталога (билдер фильтра + парсер query), без БД.
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildCatalogFilter, parseCatalogSearchParams } from "../app/lib/merch/catalog";

test("buildCatalogFilter: без фильтров — пустой where, дефолтная сортировка", () => {
  const r = buildCatalogFilter({});
  assert.equal(r.where, "");
  assert.deepEqual(r.params, []);
  assert.equal(r.order, "p.created_at desc");
});

test("buildCatalogFilter: поиск ищет по title и short_desc одним плейсхолдером", () => {
  const r = buildCatalogFilter({ q: "кожа" });
  assert.match(r.where, /p\.title ilike \$1 or p\.short_desc ilike \$1/);
  assert.deepEqual(r.params, ["%кожа%"]);
});

test("buildCatalogFilter: категория/продавец/цена нумеруют плейсхолдеры по порядку", () => {
  const r = buildCatalogFilter({ categoryId: 3, sellerId: 7, minPriceCents: 1000, maxPriceCents: 5000 });
  assert.match(r.where, /p\.category_id = \$1/);
  assert.match(r.where, /p\.seller_id = \$2/);
  assert.match(r.where, /p\.price_cents >= \$3/);
  assert.match(r.where, /p\.price_cents <= \$4/);
  assert.deepEqual(r.params, [3, 7, 1000, 5000]);
});

test("buildCatalogFilter: startIndex сдвигает нумерацию (для второго запроса)", () => {
  const r = buildCatalogFilter({ q: "x" }, 5);
  assert.match(r.where, /\$5/);
});

test("buildCatalogFilter: inStockOnly и acceptsDoffaOnly — без параметров", () => {
  const r = buildCatalogFilter({ inStockOnly: true, acceptsDoffaOnly: true });
  assert.match(r.where, /p\.status = 'in_stock' and p\.in_stock_qty > 0/);
  assert.match(r.where, /p\.accepts_doffa = true/);
  assert.deepEqual(r.params, []);
});

test("buildCatalogFilter: сортировки маппятся корректно", () => {
  assert.equal(buildCatalogFilter({ sort: "price_asc" }).order, "p.price_cents asc");
  assert.equal(buildCatalogFilter({ sort: "price_desc" }).order, "p.price_cents desc");
  assert.match(buildCatalogFilter({ sort: "popular" }).order, /sales_count desc/);
});

test("parseCatalogSearchParams: разбирает строки и переводит цену в центы", () => {
  const f = parseCatalogSearchParams({ q: "ремень", category: "2", seller: "9", min: "10", max: "50", stock: "1", doffa: "1", sort: "price_asc", page: "3" });
  assert.equal(f.q, "ремень");
  assert.equal(f.categoryId, 2);
  assert.equal(f.sellerId, 9);
  assert.equal(f.minPriceCents, 1000);
  assert.equal(f.maxPriceCents, 5000);
  assert.equal(f.inStockOnly, true);
  assert.equal(f.acceptsDoffaOnly, true);
  assert.equal(f.sort, "price_asc");
  assert.equal(f.page, 3);
});

test("parseCatalogSearchParams: неизвестная сортировка → newest, пустые → null", () => {
  const f = parseCatalogSearchParams({ sort: "hacky" });
  assert.equal(f.sort, "newest");
  assert.equal(f.categoryId, null);
  assert.equal(f.minPriceCents, null);
  assert.equal(f.page, 1);
});

test("parseCatalogSearchParams: массивные значения берут первый элемент", () => {
  const f = parseCatalogSearchParams({ q: ["a", "b"] });
  assert.equal(f.q, "a");
});
