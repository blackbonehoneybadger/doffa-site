# DOFFA — кофейня × Solana × Telegram

Один репозиторий, три части:

```
doffa-site/
├── app/          ← сайт (Next.js) — деплой на Vercel
├── bot/          ← касса-бот (Telegram) — деплой на Railway
├── token/        ← скрипты выпуска токена (запуск локально, один раз)
├── plan/         ← мастер-план проекта
└── public/       ← картинки, видео, логотип для сайта
```

---

## Сайт (`/`)

**Стек:** Next.js + TypeScript + Tailwind + Framer Motion  
**Деплой:** Vercel (автоматически при пуше в main)  
**Root Directory в Vercel:** `/` (корень)

```bash
npm install
npm run dev      # http://localhost:3000
```

---

## Бот-касса (`/bot/`)

**Стек:** Telegraf + TypeScript + SQLite (better-sqlite3) + Solana  
**Деплой:** Railway (автоматически при пуше)  
**Root Directory в Railway:** `bot`

Как работает:
1. `/go` — открыть смену
2. `/menu` — выбрать напиток из меню (кнопки)
3. После каждой продажи — автоматически сжигает `BURN_PER_CUP` токенов `$DOFFA` на Solana
4. `/stats` — итог смены
5. `/stop` — закрыть смену

```bash
cd bot
npm install
cp .env.example .env   # заполни переменные
npm run dev
```

**Переменные Railway:**
| Имя | Описание |
|-----|----------|
| `DOFFA_BOT_TOKEN` | Токен от @BotFather |
| `ADMIN_IDS` | Telegram ID бариста через запятую |
| `DOFFA_MINT` | Адрес контракта токена $DOFFA |
| `OWNER_KEYPAIR` | Приватный ключ кошелька (JSON-массив) |
| `SOLANA_RPC` | RPC Solana (devnet или mainnet) |
| `BURN_PER_CUP` | Сколько токенов сжигать за чашку |
| `DB_PATH` | Путь к SQLite (`/data/doffa.db`) |

---

## Токен (`/token/`)

Одноразовые скрипты выпуска токена на Solana devnet/mainnet.  
Запускаются локально, не деплоятся никуда.  
См. `token/RUN-ON-YOUR-COMPUTER.md`.

---

## Идея

**1 проданная чашка = 1 сожжённый токен $DOFFA → дефицит.**

Каждая транзакция навсегда записана в блокчейне Solana.
