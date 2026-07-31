-- Схема пользователей DOFFA: вход по Solana-кошельку, профиль, лояльность кофейни.
-- Применяется один раз через scripts/migrate.mjs (см. README) или вручную в
-- Vercel → Storage → выбранная база → Query.

create table if not exists users (
  wallet_address text primary key,
  nickname text,
  avatar_url text,
  created_at timestamptz not null default now(),
  last_login_at timestamptz not null default now()
);

create table if not exists loyalty_accounts (
  wallet_address text primary key references users(wallet_address) on delete cascade,
  bonus_points integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists loyalty_purchases (
  id bigserial primary key,
  wallet_address text not null references users(wallet_address) on delete cascade,
  item text not null,
  amount_cents integer,
  points_earned integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists loyalty_purchases_wallet_idx on loyalty_purchases (wallet_address);

-- Одноразовые nonce для входа: после успешной проверки подписи хэш nonce
-- записывается сюда, и повторная отправка того же токена+подписи отклоняется
-- (защита от replay). Строки живут не дольше срока годности самого nonce.
create table if not exists used_nonces (
  nonce_hash text primary key,
  expires_at timestamptz not null
);

create index if not exists used_nonces_expires_idx on used_nonces (expires_at);

-- Серверные сессии пользователя: в cookie лежит только случайный opaque id,
-- а срок жизни, привязка к кошельку и возможность отзыва — здесь. Это позволяет
-- гасить конкретную сессию, видеть время входа и истекать по expires_at.
create table if not exists sessions (
  id text primary key,
  wallet_address text not null references users(wallet_address) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  user_agent text
);

create index if not exists sessions_wallet_idx on sessions (wallet_address);
create index if not exists sessions_expires_idx on sessions (expires_at);

-- Серверные сессии админ-панели (/admin). В cookie — только случайный opaque id,
-- подписанный отдельным ADMIN_SESSION_SECRET; срок и возможность отзыва — здесь.
create table if not exists admin_sessions (
  id text primary key,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  ip text,
  user_agent text
);

create index if not exists admin_sessions_expires_idx on admin_sessions (expires_at);

-- Учёт неудачных попыток входа в админку по IP — для rate limit и временной
-- блокировки после серии неверных паролей.
-- Старая форма (id/attempted_at/success) несовместима: пересоздаём таблицу.
-- Данные rate-limit эфемерны, терять их безопасно.
drop table if exists admin_login_attempts;

create table if not exists admin_login_attempts (
  ip text primary key,
  fail_count integer not null default 0,
  first_failed_at timestamptz not null default now(),
  locked_until timestamptz
);

create index if not exists admin_login_attempts_locked_idx on admin_login_attempts (locked_until);

-- Простой счётчик посещений сайта (одна строка на ключ) — для админ-дашборда.
-- Не критичен: сбой записи молча игнорируется на стороне API.
create table if not exists site_stats (
  key text primary key,
  value bigint not null default 0,
  updated_at timestamptz not null default now()
);

-- Заявки на кожаные изделия на заказ (форма /merch). Персональные данные
-- клиента; наружу не отдаём, доступ — только на бэкенде.
create table if not exists merch_orders (
  id bigserial primary key,
  name text not null,
  contact text not null,
  product_type text,
  quantity text,
  personalization text,
  perso_text text,
  idea text,
  deadline text,
  budget text,
  location text,
  created_at timestamptz not null default now()
);

create index if not exists merch_orders_created_idx on merch_orders (created_at);

-- Rate limit на форму заказа по IP (антиспам).
create table if not exists merch_order_attempts (
  ip text primary key,
  count integer not null default 0,
  window_start timestamptz not null default now()
);

-- ============================================================================
-- DOFFA Marketplace (раздел «Мерч»): продавцы, товары, заказы, оплата.
-- Многовендорная площадка. Товары публикуются продавцами только после
-- одобрения администратором. Персональные и платёжные данные наружу не отдаём.
-- Статусы/enum-ы держим строками с CHECK — без внешнего ORM, под общую SQL-схему.
-- ============================================================================

-- Продавцы. Публично видны только со status='approved'.
create table if not exists merch_sellers (
  id bigserial primary key,
  slug text unique not null,
  owner_wallet text references users(wallet_address) on delete set null,
  shop_name text not null,
  legal_name text,
  logo_url text,
  description text,
  contact_email text,
  contact_phone text,
  region text,
  shipping_methods text,
  payment_methods text,
  return_policy text,
  accepts_doffa boolean not null default false,
  status text not null default 'applied'
    check (status in ('applied','under_review','approved','suspended','rejected')),
  connected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists merch_sellers_status_idx on merch_sellers (status);

-- Заявки на подключение продавца (форма /merch/become-a-seller).
create table if not exists merch_seller_applications (
  id bigserial primary key,
  ref text unique not null,
  name text not null,
  shop_name text not null,
  email text not null,
  contact text,
  country text,
  city text,
  products_desc text,
  links text,
  shipping_methods text,
  accepts_fiat boolean not null default false,
  wants_doffa boolean not null default false,
  status text not null default 'under_review'
    check (status in ('applied','under_review','approved','suspended','rejected')),
  created_at timestamptz not null default now()
);
create index if not exists merch_seller_apps_created_idx on merch_seller_applications (created_at);

-- Категории — создаются/редактируются администратором.
create table if not exists merch_categories (
  id bigserial primary key,
  slug text unique not null,
  name text not null,
  parent_id bigint references merch_categories(id) on delete set null,
  sort integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Товары. Публично видны только НЕ hidden/moderation статусы.
create table if not exists merch_products (
  id bigserial primary key,
  slug text unique not null,
  seller_id bigint not null references merch_sellers(id) on delete cascade,
  category_id bigint references merch_categories(id) on delete set null,
  title text not null,
  short_desc text,
  full_desc text,
  price_cents bigint not null default 0,
  currency text not null default 'RUB',
  accepts_doffa boolean not null default false,
  in_stock_qty integer not null default 0 check (in_stock_qty >= 0),
  material text,
  making_method text,
  ship_from_region text,
  ship_regions text,
  shipping_cost_cents bigint,
  pickup_available boolean not null default false,
  status text not null default 'moderation'
    check (status in ('in_stock','made_to_order','preorder','out_of_stock','hidden','moderation')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists merch_products_seller_idx on merch_products (seller_id);
create index if not exists merch_products_status_idx on merch_products (status);
create index if not exists merch_products_category_idx on merch_products (category_id);

-- Варианты товара (размер, цвет, материал).
create table if not exists merch_product_variants (
  id bigserial primary key,
  product_id bigint not null references merch_products(id) on delete cascade,
  name text not null,
  size text,
  color text,
  material text,
  price_delta_cents bigint not null default 0,
  stock_qty integer not null default 0 check (stock_qty >= 0),
  sku text
);
create index if not exists merch_variants_product_idx on merch_product_variants (product_id);

-- Изображения товара. main + сортировка + alt.
create table if not exists merch_product_images (
  id bigserial primary key,
  product_id bigint not null references merch_products(id) on delete cascade,
  url text not null,
  alt text,
  sort integer not null default 0,
  is_main boolean not null default false
);
create index if not exists merch_images_product_idx on merch_product_images (product_id);

-- Загруженные файлы (логотипы/эскизы/референсы кастомных заказов, фото товаров).
create table if not exists merch_uploaded_assets (
  id bigserial primary key,
  url text not null,
  mime text not null,
  size_bytes bigint not null,
  uploaded_by_wallet text references users(wallet_address) on delete set null,
  purpose text,
  created_at timestamptz not null default now()
);

-- Заказы. Разбивка на подзаказы по продавцам — через seller_id на заказе.
create table if not exists merch_orders_shop (
  id bigserial primary key,
  ref text unique not null,
  buyer_wallet text references users(wallet_address) on delete set null,
  buyer_name text,
  buyer_email text,
  buyer_phone text,
  country text, region text, city text, address text, postcode text, comment text,
  seller_id bigint references merch_sellers(id) on delete set null,
  shipping_method text,
  payment_method text not null check (payment_method in ('fiat','doffa')),
  subtotal_cents bigint not null default 0,
  shipping_cents bigint not null default 0,
  fee_cents bigint not null default 0,
  seller_amount_cents bigint not null default 0,
  total_cents bigint not null default 0,
  seller_payout_status text not null default 'pending'
    check (seller_payout_status in ('pending','sent','held')),
  status text not null default 'pending_payment'
    check (status in ('pending_payment','paid','processing','shipped','delivered','cancelled','refunded','disputed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists merch_orders_shop_status_idx on merch_orders_shop (status);
create index if not exists merch_orders_shop_seller_idx on merch_orders_shop (seller_id);

-- Позиции заказа (снимок цены на момент покупки).
create table if not exists merch_order_items (
  id bigserial primary key,
  order_id bigint not null references merch_orders_shop(id) on delete cascade,
  product_id bigint references merch_products(id) on delete set null,
  variant_id bigint references merch_product_variants(id) on delete set null,
  title_snapshot text not null,
  unit_price_cents bigint not null,
  qty integer not null check (qty > 0),
  line_total_cents bigint not null
);
create index if not exists merch_order_items_order_idx on merch_order_items (order_id);

-- Платежи (fiat и DOFFA). Для DOFFA храним подтверждённую подпись транзакции.
create table if not exists merch_payments (
  id bigserial primary key,
  order_id bigint not null references merch_orders_shop(id) on delete cascade,
  method text not null check (method in ('fiat','doffa')),
  provider text,
  provider_ref text,
  amount_cents bigint,
  doffa_amount_base numeric,        -- сумма в минимальных единицах DOFFA (с учётом decimals)
  tx_signature text,                -- подпись Solana-транзакции
  status text not null default 'pending'
    check (status in ('pending','confirmed','failed','refunded')),
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  unique (tx_signature)             -- одна транзакция не оплачивает два заказа
);
create index if not exists merch_payments_order_idx on merch_payments (order_id);

-- Котировки цены в DOFFA (ограниченное время действия).
create table if not exists merch_doffa_quotes (
  id bigserial primary key,
  order_ref text not null,
  price_cents bigint not null,
  doffa_amount_base numeric not null,
  rate_source text,
  rate_price_usd numeric,
  tolerance_bps integer not null default 100,   -- допустимое отклонение, 1% = 100 bps
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists merch_doffa_quotes_order_idx on merch_doffa_quotes (order_ref);

-- Отгрузки.
create table if not exists merch_shipments (
  id bigserial primary key,
  order_id bigint not null references merch_orders_shop(id) on delete cascade,
  carrier text,
  tracking_number text,
  shipped_at timestamptz,
  delivered_at timestamptz,
  status text not null default 'pending'
);

-- Кастомные заявки на кожаные изделия — расширяем существующую merch_orders
-- статусом и номером заявки (см. форму /merch/custom-leather).
alter table merch_orders add column if not exists ref text;
alter table merch_orders add column if not exists status text not null default 'new';
alter table merch_orders add column if not exists sizes text;
alter table merch_orders add column if not exists material text;
alter table merch_orders add column if not exists color text;
alter table merch_orders add column if not exists shipping_method text;
alter table merch_orders add column if not exists logo_asset_url text;

-- Журнал действий модерации/админа.
create table if not exists merch_audit_log (
  id bigserial primary key,
  actor text,
  action text not null,
  entity_type text,
  entity_id text,
  meta text,
  created_at timestamptz not null default now()
);
create index if not exists merch_audit_created_idx on merch_audit_log (created_at);
