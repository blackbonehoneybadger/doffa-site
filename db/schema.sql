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
