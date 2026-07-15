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
