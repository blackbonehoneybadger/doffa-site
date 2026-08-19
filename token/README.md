# DOFFA token — изолированные операционные скрипты

Текущий mainnet-токен `$DOFFA` уже выпущен, а mint/freeze authority отозваны.
Команды выпуска сохранены прежде всего для воспроизводимости и devnet-тестов;
для текущего минта штатно нужны только `verify` и, при реальной операции,
`burn`.

> ⚠️ Деньги и ключи — только в твоих руках. Эти скрипты ничего не отправляют никому,
> кроме сети Solana. Файл `owner.json` и `.env` **никогда не коммитятся** (см. `.gitignore`).

## Статус зависимостей и граница риска

На 2026-08-19 `npm audit` этой отдельной папки сообщает **13 известных
проблем (3 high, 10 moderate)** в legacy-цепочке Solana/Metaplex. Для ключевой
high-проблемы `bigint-buffer` исправленной версии пока нет. Эти зависимости
**не входят** в Next.js-сайт, Vercel их не устанавливает, и root-аудит сайта
после обновления чистый.

До переноса операций на современный стек:

- не ставь и не запускай эту папку на production-сервере;
- используй отдельную чистую машину/VM, доверенный HTTPS RPC и только нужный
  `owner.json` с правами `600`;
- не передавай скриптам данные от посетителей сайта;
- после операции удаляй локальный keypair из рабочей машины и сверяй
  транзакцию в Solscan.

Уязвимость здесь не замаскирована downgrade-ом: автоматический downgrade
`@solana/spl-token`, предлагаемый npm, несовместим с кодом и небезопасен.

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

## Двойной предохранитель mainnet

`create`, `burn` и `revoke` на mainnet выполняются только при наличии **двух**
явных подтверждений одновременно: временной env-переменной и CLI-флага с
точным mint. Не записывай подтверждение в `.env`.

PowerShell — пример burn существующего минта:

```powershell
$env:DOFFA_MAINNET_CONFIRMATION = "I_UNDERSTAND_TRANSACTIONS_ARE_IRREVERSIBLE"
npm run burn -- 1 sale_20260819_001 receipt_hash_here --confirm-mainnet=57aAfCuXx7uuc8g8P9kTxR65TKQtZsFDJeKhdD5xu6uo
Remove-Item Env:DOFFA_MAINNET_CONFIRMATION
```

Bash/zsh:

```bash
DOFFA_MAINNET_CONFIRMATION=I_UNDERSTAND_TRANSACTIONS_ARE_IRREVERSIBLE \
  npm run burn -- 1 sale_20260819_001 receipt_hash_here \
  --confirm-mainnet=57aAfCuXx7uuc8g8P9kTxR65TKQtZsFDJeKhdD5xu6uo
```

Для создания нового минта точный флаг —
`--confirm-mainnet=CREATE_NEW_MINT`. Эта команда **не нужна** для уже
существующего DOFFA и не должна запускаться «для проверки».

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
Этот раздел относится только к осознанному выпуску **нового** токена, не к
существующему DOFFA.

1. Полностью прогнать и сверить цикл в devnet.
2. В `.env` поставить `CLUSTER=mainnet-beta`.
3. Вместо `npm run airdrop` — пополнить кошелёк реальными SOL.
4. `METADATA_URI` — только постоянное хранилище.
5. Для каждой изменяющей операции отдельно использовать двойное подтверждение
   выше; после каждой транзакции сверять mint, получателя и supply в Solscan.
6. Только после независимой проверки отзывать authorities.
7. Опубликовать Solscan-ссылку на сайте.

> Перед mainnet — обязательно прогнать весь цикл в devnet и (по плану) показать
> конструкцию юристу. Реальный выпуск — необратим.
