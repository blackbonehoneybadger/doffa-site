import "server-only";

// Подключение к Postgres (Neon, через Vercel Storage). Ленивая инициализация —
// чтобы страницы, которые не трогают базу, не падали при отсутствующей
// переменной окружения на локальной машине без подключённой БД.
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let client: NeonQueryFunction<false, false> | null = null;

function getClient(): NeonQueryFunction<false, false> {
  if (client) return client;
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) {
    throw new Error(
      "База данных не подключена. Зайди в Vercel → Storage → Create Database → Postgres → Connect to Project.",
    );
  }
  client = neon(url);
  return client;
}

export async function query<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
  const sql = getClient();
  const rows = await sql.query(text, params);
  return rows as T[];
}
