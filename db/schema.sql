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
