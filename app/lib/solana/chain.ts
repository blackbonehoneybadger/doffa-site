// Чтение реальных данных $DOFFA из блокчейна Solana — серверная сторона.
//
// Зачем отдельно от app/solana.ts: тот модуль работает в браузере (кошелёк,
// клиентские запросы). Здесь — чтение на сервере, с кэшем Next и с RPC-адресом
// из НЕ-публичной переменной SOLANA_RPC, чтобы платный эндпоинт с ключом в URL
// не утёк в браузерный bundle.
//
// Приватные ключи здесь не используются: всё это операции чтения. Подписывать
// транзакции сайт не умеет и не должен.
//
// Правило то же, что и у внешних API: нет ответа — null. Ни одна цифра на
// странице не должна быть придуманной, поэтому недоступный RPC означает
// «данных нет», а не «ноль».

import { MERCH_SERVER } from "../../config/merch.server";
import { asNumber, prop } from "../external/http";

/** Ответ RPC или null. Исключения наружу не летят. */
async function rpc(method: string, params: unknown[], revalidate: number): Promise<unknown | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(MERCH_SERVER.solanaRpc, {
      method: "POST",
      signal: controller.signal,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      next: { revalidate },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as unknown;
    // JSON-RPC отдаёт 200 и на ошибку — её надо ловить отдельно.
    if (prop(json, "error")) return null;
    return prop(json, "result") ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Переводит сумму в минимальных единицах в человекочитаемую по decimals. */
export function toUiAmount(raw: string | number, decimals: number): number | null {
  const s = String(raw);
  if (!/^\d+$/.test(s)) return null;
  const n = Number(s) / 10 ** decimals;
  return Number.isFinite(n) ? n : null;
}

export type Supply = { total: number; decimals: number };

/** Разбор ответа getTokenSupply. */
export function parseSupply(result: unknown): Supply | null {
  const value = prop(result, "value");
  if (!value) return null;
  const decimals = asNumber(prop(value, "decimals"));
  if (decimals === null) return null;

  // uiAmount может прийти null у больших значений — тогда считаем из amount.
  const ui = asNumber(prop(value, "uiAmount"));
  const total = ui !== null ? ui : toUiAmount(String(prop(value, "amount") ?? ""), decimals);
  return total === null ? null : { total, decimals: Math.trunc(decimals) };
}

/** Реальная эмиссия токена сейчас. null — RPC недоступен. */
export async function getSupply(mint: string): Promise<Supply | null> {
  // 10 минут: эмиссия меняется только при сжигании, чаще спрашивать незачем.
  return parseSupply(await rpc("getTokenSupply", [mint], 600));
}

export type MintAuthorities = {
  /** null означает, что право выпуска отозвано навсегда. */
  mintAuthority: string | null;
  /** null означает, что право заморозки отозвано навсегда. */
  freezeAuthority: string | null;
};

/** Разбор getAccountInfo(jsonParsed) по mint-аккаунту. */
export function parseMintAuthorities(result: unknown): MintAuthorities | null {
  const info = prop(prop(prop(prop(result, "value"), "data"), "parsed"), "info");
  if (!info) return null;
  const mintAuthority = prop(info, "mintAuthority");
  const freezeAuthority = prop(info, "freezeAuthority");
  return {
    mintAuthority: typeof mintAuthority === "string" ? mintAuthority : null,
    freezeAuthority: typeof freezeAuthority === "string" ? freezeAuthority : null,
  };
}

/**
 * Кто может выпускать и замораживать токен. Это проверяемый факт: сайт
 * утверждает, что права отозваны, — теперь это подтверждается сетью, а не
 * словами в тексте.
 */
export async function getMintAuthorities(mint: string): Promise<MintAuthorities | null> {
  // Права отзываются один раз и навсегда — час кэша с запасом.
  return parseMintAuthorities(
    await rpc("getAccountInfo", [mint, { encoding: "jsonParsed" }], 3600),
  );
}

/** Разбор getTokenAccountsByOwner: суммируем все токен-аккаунты владельца. */
export function parseOwnerBalance(result: unknown): number | null {
  const value = prop(result, "value");
  if (!Array.isArray(value)) return null;

  let total = 0;
  for (const acc of value) {
    const amount = prop(
      prop(prop(prop(prop(acc, "account"), "data"), "parsed"), "info"),
      "tokenAmount",
    );
    const ui = asNumber(prop(amount, "uiAmount"));
    if (ui !== null) total += ui;
  }
  // Пустой список — это честный ноль: аккаунтов нет, значит и токенов нет.
  return total;
}

/** Баланс $DOFFA у адреса. null — RPC недоступен (ноль означал бы «пусто»). */
export async function getTokenBalance(owner: string, mint: string): Promise<number | null> {
  return parseOwnerBalance(
    // 5 минут: баланс фонда меняется при выплатах.
    await rpc("getTokenAccountsByOwner", [owner, { mint }, { encoding: "jsonParsed" }], 300),
  );
}

/**
 * Сколько токенов сожжено — как разница между первоначальной эмиссией и текущей.
 * Для SPL-токена сжигание уменьшает supply, а выпустить новые нельзя, если право
 * mint отозвано, поэтому разница и есть объём сжигания.
 *
 * null — если текущая эмиссия неизвестна. Отрицательный результат означает, что
 * заявленная первоначальная эмиссия не сходится с сетью: в этом случае честнее
 * не показывать ничего, чем показать минус.
 */
export function burnedFromSupply(initialSupply: number, current: Supply | null): number | null {
  if (!current) return null;
  const burned = initialSupply - current.total;
  return burned >= 0 ? burned : null;
}
