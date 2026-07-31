import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getProductBySlug, getRelatedProducts } from "../../../lib/merch/catalog";
import { formatPrice } from "../../../lib/merch/format";
import { PRODUCT_STATUS_LABEL, MERCH_FLAGS, type ProductStatus } from "../../../config/merch";

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p) return { title: "Товар не найден — DOFFA Merch" };
  return {
    title: `${p.title} — DOFFA Merch`,
    description: p.short_desc ?? p.full_desc ?? p.title,
    alternates: { canonical: `/merch/products/${p.slug}` },
    openGraph: {
      title: p.title,
      description: p.short_desc ?? p.title,
      images: p.main_image ? [{ url: p.main_image }] : undefined,
    },
  };
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-white/8 py-2 text-sm">
      <span className="text-cream/50">{k}</span>
      <span className="text-right text-cream/80">{v}</span>
    </div>
  );
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p) notFound();

  const related = await getRelatedProducts({ id: p.id, category_id: p.category_id });
  const canBuy = MERCH_FLAGS.fiatPaymentsEnabled || (p.accepts_doffa && MERCH_FLAGS.doffaPaymentsEnabled);
  const status = p.status as ProductStatus;
  const gallery = p.images.length ? p.images : p.main_image ? [{ url: p.main_image, alt: p.main_image_alt }] : [];

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-5 pb-28 pt-28">
      <nav className="text-xs text-cream/45">
        <Link href="/merch" className="hover:text-gold">DOFFA Merch</Link>
        <span className="mx-2">/</span>
        <Link href="/merch#catalog" className="hover:text-gold">Каталог</Link>
        {p.category_name && <><span className="mx-2">/</span><span className="text-cream/60">{p.category_name}</span></>}
      </nav>

      <div className="mt-6 grid gap-10 lg:grid-cols-2">
        {/* ГАЛЕРЕЯ */}
        <div>
          <div className="relative aspect-square w-full overflow-hidden rounded-3xl bg-gradient-to-br from-espresso/25 to-ink/40">
            {gallery[0] ? (
              <Image src={gallery[0].url} alt={gallery[0].alt ?? p.title} fill sizes="(max-width:1024px) 100vw, 50vw" unoptimized className="object-cover" />
            ) : (
              <span className="flex h-full items-center justify-center text-xs uppercase tracking-widest text-cream/30">нет фото</span>
            )}
          </div>
          {gallery.length > 1 && (
            <div className="mt-3 grid grid-cols-4 gap-3">
              {gallery.slice(0, 8).map((img, i) => (
                <div key={i} className="relative aspect-square overflow-hidden rounded-xl bg-ink/40">
                  <Image src={img.url} alt={img.alt ?? `${p.title} ${i + 1}`} fill sizes="120px" unoptimized className="object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ИНФО */}
        <div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-gold/15 px-2.5 py-0.5 text-[11px] font-semibold text-gold">{PRODUCT_STATUS_LABEL[status] ?? status}</span>
            <Link href={`/merch?seller=${p.seller_id}#catalog`} className="text-xs text-cream/50 hover:text-gold">{p.shop_name}</Link>
          </div>
          <h1 className="display mt-3 text-3xl font-extrabold leading-tight text-cream-soft sm:text-4xl">{p.title}</h1>

          <div className="mt-5 flex flex-wrap items-baseline gap-3">
            <span className="display text-3xl font-extrabold text-cream-soft">{formatPrice(p.price_cents, p.currency)}</span>
            {p.accepts_doffa && (
              <span className="rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs font-semibold text-gold">
                Можно оплатить в DOFFA
              </span>
            )}
          </div>
          {p.accepts_doffa && (
            <p className="mt-2 text-[11px] leading-relaxed text-cream/45">
              Цена в DOFFA рассчитывается по актуальной котировке с ограниченным временем действия при оформлении.
            </p>
          )}

          {p.short_desc && <p className="mt-5 text-sm leading-relaxed text-cream/75">{p.short_desc}</p>}

          {/* Варианты */}
          {p.variants.length > 0 && (
            <div className="mt-6">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-cream/45">Варианты</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {p.variants.map((v) => (
                  <span key={v.id} className="rounded-lg border border-white/12 bg-white/[0.03] px-3 py-1.5 text-xs text-cream/75">
                    {[v.name, v.size, v.color].filter(Boolean).join(" · ")}
                    {v.price_delta_cents ? ` (+${formatPrice(v.price_delta_cents, p.currency)})` : ""}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Покупка — гейтинг, checkout ещё готовится */}
          <div className="mt-7 flex flex-wrap gap-3">
            {canBuy && status !== "out_of_stock" ? (
              <Link href={`/merch/cart?add=${p.slug}`} className="rounded-full bg-gradient-to-r from-gold to-copper px-7 py-3 font-bold text-ink transition hover:brightness-110">
                Купить
              </Link>
            ) : (
              <span className="rounded-full border border-cream/20 px-7 py-3 font-semibold text-cream/50">
                {status === "out_of_stock" ? "Нет в наличии" : "Оформление заказа подключается"}
              </span>
            )}
            <a href="#seller" className="rounded-full border border-cream/25 px-7 py-3 font-semibold text-cream transition hover:border-gold hover:text-gold">
              Задать вопрос продавцу
            </a>
          </div>

          {/* Характеристики */}
          <div className="mt-8">
            {p.material && <Row k="Материал" v={p.material} />}
            {p.making_method && <Row k="Изготовление" v={p.making_method} />}
            {p.ship_from_region && <Row k="Отправка из" v={p.ship_from_region} />}
            {p.ship_regions && <Row k="Регионы доставки" v={p.ship_regions} />}
            {p.shipping_cost_cents != null && <Row k="Стоимость доставки" v={formatPrice(p.shipping_cost_cents, p.currency)} />}
            {p.pickup_available && <Row k="Самовывоз" v="Доступен" />}
          </div>
        </div>
      </div>

      {/* Полное описание */}
      {p.full_desc && (
        <section className="mt-14">
          <h2 className="display text-2xl font-bold text-cream-soft">Описание</h2>
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-cream/75">{p.full_desc}</p>
        </section>
      )}

      {/* Продавец / возврат */}
      <section id="seller" className="mt-14 scroll-mt-24">
        <div className="card rounded-3xl p-6">
          <h2 className="display text-lg font-bold text-cream-soft">Продавец: {p.shop_name}</h2>
          <p className="mt-2 text-sm leading-relaxed text-cream/65">
            За качество, отправку и условия отвечает продавец согласно правилам площадки.
          </p>
          {p.seller_return_policy && <p className="mt-3 text-sm leading-relaxed text-cream/60">Возврат: {p.seller_return_policy}</p>}
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <Link href={`/merch?seller=${p.seller_id}#catalog`} className="font-semibold text-gold hover:underline">Все товары продавца →</Link>
            <Link href="/legal/returns" className="text-cream/55 hover:text-gold">Правила возврата</Link>
          </div>
        </div>
        <p className="mt-4 text-[11px] text-cream/40">
          Отзывы появятся после подтверждённых заказов — выдуманных рейтингов и отзывов у нас нет.
        </p>
      </section>

      {/* Похожие */}
      {related.length > 0 && (
        <section className="mt-14">
          <h2 className="display text-2xl font-bold text-cream-soft">Похожие товары</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-3">
            {related.map((r) => (
              <Link key={r.id} href={`/merch/products/${r.slug}`} className="card group overflow-hidden rounded-2xl transition hover:border-gold/40">
                <div className="relative aspect-[4/3] w-full bg-gradient-to-br from-espresso/25 to-ink/40">
                  {r.main_image ? (
                    <Image src={r.main_image} alt={r.main_image_alt ?? r.title} fill sizes="33vw" unoptimized className="object-cover" />
                  ) : (
                    <span className="flex h-full items-center justify-center text-[11px] uppercase tracking-widest text-cream/30">нет фото</span>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="display text-sm font-bold text-cream-soft">{r.title}</h3>
                  <span className="mt-1 block text-sm font-extrabold text-cream-soft">{formatPrice(r.price_cents, r.currency)}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="mt-14">
        <Link href="/merch#catalog" className="text-sm font-semibold text-gold transition hover:text-amber">← В каталог</Link>
      </div>
    </main>
  );
}
