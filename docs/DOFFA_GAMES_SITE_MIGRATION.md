# Миграция публичного позиционирования игры → DOFFA Games / DOFFA Bean Duel

Дата: 2026-07-15

Публичное игровое направление на сайте `doffa.coffee` переименовано:

- **Игровое направление:** `DOFFA Games`
- **Главная публичная игра:** `DOFFA Bean Duel`

Старая карточная игра **DOFFA Crazy 8** (репозиторий `zapisnoy-kozel`,
«Записной Козёл») **не удалена из игрового кода**, но на официальном сайте больше
не отображается, не рекламируется и не упоминается как активный продукт.

Официальный mint $DOFFA: `57aAfCuXx7uuc8g8P9kTxR65TKQtZsFDJeKhdD5xu6uo`

---

## Где упоминалась Crazy 8 (и что сделано)

| Файл | Было | Стало |
|---|---|---|
| `app/content.ts` | «DOFFA Crazy 8», «карточная игра / card game» во всех 12 языках (flow, roadmap, FAQ, hero-title) | «DOFFA Bean Duel», формулировки про дуэль; шаг «Входи в дуэль», эмодзи 🃏→⚔️ |
| `app/layout.tsx` | SEO/OG: «играй в DOFFA Crazy 8» | «DOFFA Games», «дуэли DOFFA Bean Duel» |
| `app/page.tsx` | комментарий + `GAME_URL` = `zapisnoy-kozel.vercel.app` хардкод; кнопка 🃏; маркиза «1 чашка = 1 токен» | ссылка из `ECOSYSTEM.game.webUrl` (env), кнопка ⚔️ с гейтингом, маркиза «Tap · Duel · Claim / DOFFA Bean Duel / DOFFA Games» |
| `app/download/page.tsx` | «Скачать DOFFA Crazy 8», «карточная игра», хардкод ссылок на старую игру/релизы | «Скачать DOFFA Games», Bean Duel, ссылки и APK-метаданные из конфигурации, честный статус «готовится» |
| `app/solana.ts` | комментарий «награда игровой экосистемы DOFFA Crazy 8» | «DOFFA Games (Bean Duel)» |
| `README.md` | «DOFFA Crazy 8 … карточная игра» | «DOFFA Games / DOFFA Bean Duel» |

## Что удалено из публичного интерфейса

- Название **Crazy 8** — из навигации, главной, страницы игры, Download, FAQ, SEO,
  Open Graph, sitemap, structured data и всех 12 переводов.
- Формулировки **«карточная игра / card game»** во всех языках.
- Подпись маркизы **«1 чашка = 1 токен»** (намёк на «чашки как валюту»).
- Хардкод-ссылки на старую игру (`zapisnoy-kozel.vercel.app`) из публичных кнопок —
  теперь ссылка берётся из `NEXT_PUBLIC_GAME_WEB_URL`, и пока не задана, кнопка ведёт
  на `/game` со статусом «готовится» (без фальшивой ссылки).

## Какие ссылки заменены

| Раньше | Теперь |
|---|---|
| `GAME_URL = "https://zapisnoy-kozel.vercel.app"` (хардкод) | `ECOSYSTEM.game.webUrl` ← `NEXT_PUBLIC_GAME_WEB_URL` |
| `APK_URL = ".../zapisnoy-kozel/releases"` (хардкод) | `ECOSYSTEM.game.apk.url` ← `NEXT_PUBLIC_ANDROID_APK_URL` |

## Новые публичные маршруты

- **`/game`** — DOFFA Bean Duel: механика, способности (preview со статусами),
  тапалка/зёрна, 5 шагов, наградная модель (демо-интерфейс, не гарантированная сумма).
- **`/transparency`** — Reward Vault и сжигание: только реальные данные и честные
  статусы, ссылки на Solscan; без придуманных адресов и цифр.
- **`/sitemap.xml`** — карта сайта (без старой игры).

## Что сохранено только в истории репозитория

- Игровой код **Crazy 8 / Записной Козёл** — в отдельном игровом репозитории
  (`zapisnoy-kozel`); из него ничего не удалялось.
- Внутренний аудит-документ `docs/SITE_ECOSYSTEM_AUDIT.md` — исторический,
  содержит упоминания прежней модели; это внутренняя документация, не публичный
  интерфейс.

## Статусы функций новой игры

Берутся из `app/config/ecosystem.ts` (env `NEXT_PUBLIC_*`). Значения по умолчанию,
пока прод-переменные не заданы:

| Функция | Статус по умолчанию |
|---|---|
| Выплата наград (claims) | **Testing** |
| Reward Vault (публичный адрес) | **Planned** (пока `NEXT_PUBLIC_REWARD_VAULT_ADDRESS` пуст) |
| Сжигание (on-chain burn) | **Planned** |
| DEX-пул DOFFA/SOL | **Planned** |
| Android APK | **Planned** (пока `NEXT_PUBLIC_ANDROID_APK_URL` пуст) |
| Веб-версия Bean Duel | зависит от `NEXT_PUBLIC_GAME_WEB_URL` |
| Способности (Бросок зерна, Уклонение, Кофейный плеск, Щит) | **Planned** (продуктовый preview) |

«Работает» (Live) показывается только когда функция реально подключена. Демонстрации
интерфейса подписаны как демонстрация, а не как гарантированная сумма/живая транзакция.

## Переменные окружения (игровое направление)

```
NEXT_PUBLIC_GAMES_NAME=DOFFA Games
NEXT_PUBLIC_PRIMARY_GAME_NAME=DOFFA Bean Duel
NEXT_PUBLIC_DOFFA_MINT=57aAfCuXx7uuc8g8P9kTxR65TKQtZsFDJeKhdD5xu6uo
NEXT_PUBLIC_REWARD_POOL_INITIAL=1000000
NEXT_PUBLIC_REWARD_VAULT_ADDRESS=      # пусто → Reward Vault: Planned
NEXT_PUBLIC_GAME_WEB_URL=              # пусто → кнопка «Игра готовится»
NEXT_PUBLIC_ANDROID_APK_URL=           # пусто → «Android-версия готовится»
NEXT_PUBLIC_ANDROID_VERSION=
NEXT_PUBLIC_ANDROID_SIZE=
NEXT_PUBLIC_ANDROID_SHA256=
NEXT_PUBLIC_PLAYER_REWARD_PERCENT=80
NEXT_PUBLIC_BURN_PERCENT=20
NEXT_PUBLIC_CLAIMS_STATUS=             # live | testing | planned | paused
NEXT_PUBLIC_BURN_STATUS=
NEXT_PUBLIC_DEX_URL=
NEXT_PUBLIC_SOLSCAN_TOKEN_URL=
```

Приватные ключи и серверные токены в `NEXT_PUBLIC_*` **не хранятся**.

## Обновление 2026-07-19: механика Bean Duel → соло-забег

Игра переведена с PvP-дуэли на **соло-забег с волнами врагов**:
автоатака при остановке, управление движением/уклонением, выбор усиления между
волнами. Обновлены: все 12 локалей `content.ts` (цепочка «Tap → Зёрна → Забег →
$DOFFA», шаги, claimNote, FAQ), `/game` (механика, способности, наградная модель:
«подтверждённое прохождение забега» вместо «победы»), `/download`. Токеномика не
изменилась: зёрна — входной билет (не выводятся), награда $DOFFA — только из
Reward Vault по правилам/лимитам/бюджету, распределение из конфигурации (80/20),
никаких ставок. Название DOFFA Bean Duel сохранено (меняется через
NEXT_PUBLIC_PRIMARY_GAME_NAME).
