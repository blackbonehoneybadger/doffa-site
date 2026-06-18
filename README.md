# DOFFA — Espresso Bar × Web3 (Solana)

Сайт кофейни **COFFEE DOFFA** (Карачаево-Черкесия, since 2021) и утилити-токен
`$DOFFA` на Solana. Идея: **1 проданная чашка = 1 сожжённый токен** → дефицит.

## Структура
- **корень** — сам сайт (Next.js 16 + TypeScript + Tailwind + framer-motion). Деплоится на Vercel.
- **`token/`** — скрипты выпуска/сжигания токена на Solana (см. `token/README.md` и `token/RUN-ON-YOUR-COMPUTER.md`).
- **`plan/`** — мастер-план проекта (PDF/Markdown).

## Запуск сайта локально
```bash
npm install
npm run dev      # http://localhost:3000
```

## Деплой на Vercel
1. Подключи этот репозиторий к Vercel (Add New → Project → Import).
2. **Root Directory: оставь корень** (`/`) — сайт лежит в корне.
3. Framework определится как Next.js → Deploy.

## Брендовые материалы
`public/brand/` — логотип, ночные фото кофейни, видео бариста (hero).

## Токен (кратко)
`$DOFFA`, Solana SPL, 6 decimals, 100 000 000. Сначала тест в devnet, потом mainnet.
Реальный выпуск, ликвидность и приём средств — необратимые шаги, делаются осознанно
и после консультации с юристом (см. `plan/`).

---
© DOFFA. Материалы носят информационный характер и не являются финансовой или
юридической консультацией.
