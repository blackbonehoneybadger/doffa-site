// Сайт вокруг игры (решение владельца 28.09.2026): вкладка «Игра» с выбором
// «бот в Telegram / приложение на телефон», только DOFF в TON и ни слова о
// прежней монете. Здесь закреплено то, что легко сломать правкой текста.
// Запуск: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import nextConfig from "../next.config";
import { ECOSYSTEM } from "../app/config/ecosystem";
import { dict, LANGS } from "../app/content";

const ROOT = join(__dirname, "..");

test("старый адрес /download навсегда ведёт на вкладку «Игра»", async () => {
  const redirects = await nextConfig.redirects!();
  const r = redirects.find((x) => x.source === "/download");
  assert.ok(r, "перенаправления /download нет — старые ссылки упрутся в 404");
  assert.equal(r.destination, "/game");
  assert.equal(r.permanent, true);
});

test("кнопка бота ведёт по реферальной ссылке владельца", () => {
  assert.equal(ECOSYSTEM.game.telegramUrl, "https://t.me/doffadrakabot?start=ref_DF-000001");
});

test("приложение на телефон по умолчанию «в ожидании», ссылок в магазины нет", () => {
  assert.equal(ECOSYSTEM.status.mobileApp, "planned");
  assert.equal(ECOSYSTEM.game.app.ios, null);
  assert.equal(ECOSYSTEM.game.app.android, null);
});

test("страница «Игра»: выбор из двух, кнопка бота — ссылка в игру, магазины неактивны без адреса", () => {
  const page = readFileSync(join(ROOT, "app/game/page.tsx"), "utf8");
  assert.match(page, /id="choose"/, "блока выбора нет");
  assert.match(page, /Бот в Telegram/);
  assert.match(page, /Приложение на телефон/);
  assert.match(page, /href=\{telegram\}/, "кнопка бота не ведёт в игру");
  assert.match(page, /aria-disabled="true"/, "без адреса магазина кнопка обязана быть неактивной, а не «#»");
});

test("все 12 языков: вкладка «Игра», три плашки героя, ни «допечатка закрыта», ни «десять арен»", () => {
  assert.equal(LANGS.length, 12);
  for (const { code } of LANGS) {
    const t = dict[code];
    assert.ok(t.tabs.game?.trim(), `${code}: нет подписи вкладки «Игра»`);
    assert.equal(t.hero.chips.length, 3, `${code}: плашек героя не три`);
    assert.ok(t.spot.title.trim(), `${code}: нет блока игры`);
    const text = JSON.stringify(t);
    assert.doesNotMatch(text, /Закрыта ✅|Closed ✅|допечатки нет/i, `${code}: обещание закрытой допечатки`);
  }
  assert.match(dict.ru.flow.steps[1].d, /пятнадцать арен/);
});

// Прежняя монета на сайте не упоминается нигде (решение владельца 26.09.2026).
// Проверяются исходники и всё, что отдаётся посетителю из public/.
function* files(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* files(p);
    else yield p;
  }
}
const TEXT = new Set([".ts", ".tsx", ".js", ".mjs", ".json", ".css", ".md", ".txt", ".html", ".svg", ".xml"]);

test("ни одного упоминания прежней монеты и её сети в коде и в public/", () => {
  const bad: string[] = [];
  for (const dir of ["app", "public", "db", "docs"]) {
    for (const f of files(join(ROOT, dir))) {
      if (!TEXT.has(extname(f))) continue;
      const s = readFileSync(f, "utf8");
      if (/solana|phantom|\$DOFFA\b|jupiter/i.test(s)) bad.push(f.slice(ROOT.length + 1));
    }
  }
  for (const f of ["README.md"]) {
    if (/solana|\$DOFFA\b/i.test(readFileSync(join(ROOT, f), "utf8"))) bad.push(f);
  }
  assert.deepEqual(bad, []);
});
