import { query } from "./db";

export type User = {
  wallet_address: string;
  nickname: string | null;
  avatar_url: string | null;
  created_at: string;
  last_login_at: string;
};

export type LoyaltyAccount = {
  wallet_address: string;
  bonus_points: number;
};

export type LoyaltyPurchase = {
  id: number;
  item: string;
  amount_cents: number | null;
  points_earned: number;
  created_at: string;
};

/** Создаёт пользователя при первом входе или обновляет last_login_at при повторном. */
export async function upsertUserLogin(wallet: string): Promise<User> {
  const rows = await query<User>(
    `insert into users (wallet_address) values ($1)
     on conflict (wallet_address) do update set last_login_at = now()
     returning *`,
    [wallet],
  );
  await query(
    `insert into loyalty_accounts (wallet_address) values ($1)
     on conflict (wallet_address) do nothing`,
    [wallet],
  );
  return rows[0];
}

export async function getUser(wallet: string): Promise<User | null> {
  const rows = await query<User>(`select * from users where wallet_address = $1`, [wallet]);
  return rows[0] ?? null;
}

export async function updateProfile(
  wallet: string,
  fields: { nickname?: string; avatarUrl?: string },
): Promise<User> {
  const rows = await query<User>(
    `update users set nickname = coalesce($2, nickname), avatar_url = coalesce($3, avatar_url)
     where wallet_address = $1 returning *`,
    [wallet, fields.nickname ?? null, fields.avatarUrl ?? null],
  );
  return rows[0];
}

export async function getLoyalty(
  wallet: string,
): Promise<{ account: LoyaltyAccount | null; purchases: LoyaltyPurchase[] }> {
  const [accounts, purchases] = await Promise.all([
    query<LoyaltyAccount>(`select wallet_address, bonus_points from loyalty_accounts where wallet_address = $1`, [
      wallet,
    ]),
    query<LoyaltyPurchase>(
      `select id, item, amount_cents, points_earned, created_at from loyalty_purchases
       where wallet_address = $1 order by created_at desc limit 20`,
      [wallet],
    ),
  ]);
  return { account: accounts[0] ?? null, purchases };
}
