# DOFFA — кофейня × Solana × игровая экономика

Репозиторий сайта экосистемы DOFFA:

```
doffa-site/
├── app/          ← сайт (Next.js) — деплой на Vercel
├── token/        ← скрипты выпуска токена (запуск локально, один раз)
├── db/           ← SQL-схема БД (пользователи, сессии, лояльность)
├── plan/         ← мастер-план проекта
└── public/       ← картинки, видео, логотип для сайта
```

Игра **DOFFA Crazy 8** и её сервер живут в отдельном репозитории
(`zapisnoy-kozel`) — здесь только сайт `doffa.coffee`.

Модель экономики: **Tap → Cups → DOFFA Crazy 8 → победа → Claim → $DOFFA**.
Cups — внутренняя игровая энергия (не токен), $DOFFA — награда на Solana.

---

## Сайт (`/`)

**Стек:** Next.js + TypeScript + Tailwind + Framer Motion  
**Деплой:** Vercel (автоматически при пуше в main)  
**Root Directory в Vercel:** `/` (корень)

```bash
npm install
npm run dev      # http://localhost:3000
```

### Видео на главной (`/admin`)

Владелец заходит на `/admin` по общему паролю и загружает до 10 видео —
сайт каждый день автоматически показывает следующее по кругу. Пока ничего
не загружено, крутится дефолтное `/public/brand/hero.mp4`.

**Разовая настройка на Vercel (без этого загрузка не заработает):**
1. Vercel → проект → **Storage** → **Create Database** → **Blob** → подключить к проекту
   (это автоматически добавит переменную `BLOB_READ_WRITE_TOKEN`)
2. **Settings → Environment Variables** — добавить:

| Имя | Описание |
|-----|----------|
| `ADMIN_UPLOAD_PASSWORD` | Пароль для входа на `/admin` |
| `ADMIN_SESSION_SECRET` | Отдельная случайная строка ≥32 символов для админ-сессий (не путать с `SESSION_SECRET`) |
| `SESSION_SECRET` | Случайная строка ≥32 символов для пользовательских nonce/HMAC (в production **обязателен**) |
| `DATABASE_URL` | Postgres (Neon) — или `POSTGRES_URL` из Vercel Storage |
| `BLOB_READ_WRITE_TOKEN` | Обычно ставится автоматически при создании Blob |

Локально для разработки — те же переменные в `.env.local` (не коммитится).

### Личный кабинет (`/profile`)

Вход без пароля — по Solana-кошельку (подключил кошелёк → подписал сообщение →
вошёл). Хранит никнейм и бонусные баллы в Postgres (Neon, через Vercel Storage).
Баланс $DOFFA на странице — реальный, читается напрямую из блокчейна, в базе не
хранится. Сессии серверные (таблица `sessions`), вход — одноразовый nonce
(`used_nonces`). Rate limit по IP (и кошельку на verify) — таблица `auth_rate_limits`.

**Разовая настройка на Vercel:**
1. Vercel → проект → **Storage** → **Create Database** → **Postgres** (Neon) → подключить к проекту
   (это добавит переменную `DATABASE_URL` — либо `POSTGRES_URL`, код читает обе)
2. Применить схему один раз:
   ```bash
   # локально, с DATABASE_URL из шага 1 (Vercel → Storage → .env.local tab)
   npm run migrate
   ```
   Либо вставить содержимое `db/schema.sql` вручную в Vercel → Storage → база → **Query**.

В production без `SESSION_SECRET` эндпоинты `/api/auth/*` отвечают **503** (fail-closed).
Админка дополнительно требует `ADMIN_SESSION_SECRET` и `ADMIN_UPLOAD_PASSWORD`.

---

## Токен (`/token/`)

Одноразовые скрипты выпуска токена $DOFFA на Solana.  
Запускаются локально, не деплоятся никуда. Mint отозван навсегда, эмиссия
100 000 000. См. `token/RUN-ON-YOUR-COMPUTER.md`.

---

## Экосистема

- **$DOFFA** — SPL-токен на Solana (mainnet), награда за победы в игре.
- **Cups** — внутренняя игровая энергия, не продаётся и токеном не является.
- **DOFFA Crazy 8** — карточная игра экосистемы (отдельный репозиторий).

Каждая транзакция $DOFFA навсегда записана в блокчейне Solana.
