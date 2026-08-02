# DOFFA token — скрипты выпуска $DOFFA на Solana

Набор простых команд, чтобы **создать, заминтить, сжигать и защитить** токен `$DOFFA`.
Сначала всё делаем в **devnet** (тестовая сеть, бесплатно), потом — в mainnet.

> ⚠️ Деньги и ключи — только в твоих руках. Эти скрипты ничего не отправляют никому,
> кроме сети Solana. Файл `owner.json` и `.env` **никогда не коммитятся** (см. `.gitignore`).

## Что нужно один раз
- Node.js 20+
- `npm install` в этой папке
- `cp .env.example .env` и при желании поправить значения

## Порядок команд (devnet-тест)
```bash
npm install                 # поставить зависимости
cp .env.example .env        # создать конфиг (CLUSTER=devnet по умолчанию)

npm run keygen              # 1. создать ключ владельца (owner.json) — ХРАНИ В ТАЙНЕ
npm run airdrop             # 2. получить тестовые SOL (только devnet)
npm run create             # 3. выпустить токен + метаданные + заминтить весь объём
npm run verify             # 4. проверить: объём, decimals, права
npm run burn -- 15         # 5. сжечь, напр., 15 токенов («продали 15 чашек»)
npm run revoke             # 6. отозвать mint/freeze authority (доверие)
```

## Параметры (в `.env`)
| Переменная | Значение по умолчанию | Что это |
|---|---|---|
| `CLUSTER` | `devnet` | Сеть: `devnet` (тест) или `mainnet-beta` (реальная) |
| `TOKEN_NAME` | `DOFFA` | Имя токена |
| `TOKEN_SYMBOL` | `DOFFA` | Тикер |
| `TOKEN_DECIMALS` | `6` | Знаков после запятой |
| `TOKEN_SUPPLY` | `100000000` | Общий выпуск (100 млн) |
| `METADATA_URI` | — | Ссылка на JSON с лого/именем (Arweave/IPFS) |
| `KEYPAIR_PATH` | `./owner.json` | Файл ключа владельца |
| `MINT_ADDRESS` | — | Адрес токена (заполнится сам после `create`) |

## Метаданные токена (лого)
`METADATA_URI` должен указывать на JSON вида:
```json
{
  "name": "DOFFA",
  "symbol": "DOFFA",
  "description": "1 проданная чашка кофе = 1 сожжённый токен. COFFEE DOFFA, since 2021.",
  "image": "https://<постоянное-хранилище>/doffa-logo.png"
}
```
Логотип и этот JSON заливаются на постоянное децентрализованное хранилище
(Arweave / IPFS / Shadow Drive) — добавим отдельным шагом.

## Переход на mainnet
1. В `.env` поставить `CLUSTER=mainnet-beta`.
2. Вместо `npm run airdrop` — пополнить кошелёк реальными SOL.
3. `METADATA_URI` — только постоянное хранилище.
4. Прогнать `create → verify → revoke`.
5. Опубликовать Solscan-ссылку на сайте.

> Перед mainnet — обязательно прогнать весь цикл в devnet и (по плану) показать
> конструкцию юристу. Реальный выпуск — необратим.
