# Runbook: выпуск токена DOFFA

**Всё выполняется на твоём компьютере.** Ни один шаг отсюда нельзя сделать в
облачной сессии или в CI: подпись требует приватного ключа, а ключу от
100 000 000 токенов место только у тебя.

Порядок обязателен: devnet целиком → метаданные → mainnet. Пропускать нельзя,
потому что три операции в конце необратимы.

---

## Что понадобится

- Node.js 20+ (`node -v`)
- Кошелёк `E4tvCMvkrpMeVKE8SvcLgxk6D2jovQ3SB97s2umSwLUr` с ~0.02 SOL (сейчас 0.4371 — хватает)
- Аккаунт на Pinata / NFT.Storage / Irys для метаданных
- 30–40 минут

---

## Часть 0. Подготовка

```bash
git clone https://github.com/blackbonehoneybadger/doffa-site.git
cd doffa-site
git checkout migration/new-doffa-token
cd token
npm install
cp .env.example .env
```

---

## Часть 1. Devnet — репетиция

Здесь всё бесплатно и ничего необратимого. Смысл части — убедиться, что
скрипты делают ровно то, что заявлено, **до** того как это коснётся реальных
денег.

### 1.1 Тестовый ключ и SOL

`.env` уже настроен на devnet. Меняем только путь к ключу:

```
DOFFA_KEYPAIR_PATH=./devnet-owner.json
```

```bash
npm run token:keygen     # тестовый ключ, только devnet
npm run token:airdrop    # 2 тестовых SOL
```

Если airdrop откажет — открой https://faucet.solana.com, выбери **devnet**,
вставь адрес, который напечатал `token:keygen`.

### 1.2 Полный цикл

```bash
npm run token:check-wallet   # предполётная проверка, ничего не меняет
npm run token:create         # создать mint (supply = 0)
npm run token:account        # токен-аккаунт владельца
npm run token:mint           # выпустить 100 000 000
npm run token:verify         # сверка с сетью
```

`token:verify` обязан показать: decimals 6, supply 100 000 000, баланс
владельца 100 000 000. Расхождение — стоп, покажи мне вывод.

### 1.3 Проверить защиты

```bash
npm run token:mint           # должен ОТКАЗАТЬ: эмиссия уже выпущена
npm run token:create         # должен ОТКАЗАТЬ: mint уже создан
```

Оба отказа — это правильно. Если хоть один прошёл, останавливаемся.

### 1.4 Сжигание и отзыв

```bash
npm run token:burn -- 1000
npm run token:verify         # supply стал 99 999 000
npm run token:revoke         # на devnet без подтверждающей фразы
npm run token:verify         # mint/freeze authority = None
npm run token:mint           # должен ОТКАЗАТЬ: authority отозван
```

Последний отказ — самая важная проверка всей репетиции: он подтверждает, что
после отзыва допечатать токены невозможно.

### 1.5 Прислать результат

Пришли мне вывод последнего `token:verify` и адрес devnet-mint. Я запишу их в
`docs/DEVNET-TOKEN-REPORT.md`. **Без этого шага к mainnet не переходим.**

---

## Часть 2. Метаданные

Критично: `METADATA_URI` записывается в блокчейн один раз и после отзыва
authority **не переписывается**. Если хостинг исчезнет — токен навсегда
останется без имени и логотипа.

Поэтому только IPFS или Arweave. Vercel, свой сервер, ngrok — нельзя, скрипт
такие ссылки отклоняет.

### 2.1 Загрузить логотип

Файл `token/metadata/logo-512.png` (512×512, 60 КБ) на любой из:

- **Pinata** — https://pinata.cloud, бесплатный тариф
- **NFT.Storage** — https://nft.storage, бесплатно
- **Irys / Arweave** — https://irys.xyz, платно, но навсегда

### 2.2 Подставить ссылку в JSON

В `token/metadata/doffa.json` заменить **оба** вхождения
`REPLACE_WITH_PERMANENT_LOGO_URL` — в `image` и в `properties.files[0].uri`.

```bash
node -e "const j=require('./metadata/doffa.json');
if(JSON.stringify(j).includes('REPLACE_WITH')) throw new Error('ссылка не подставлена');
console.log('OK, image:', j.image)"
```

### 2.3 Загрузить JSON туда же

Полученную ссылку **на JSON** записать в `token/.env`:

```
DOFFA_METADATA_URI=https://gateway.pinata.cloud/ipfs/bafy...
```

### 2.4 Проверить в инкогнито

Открой обе ссылки в приватном окне браузера. Если файл виден только тебе —
кошельки покажут пустоту.

---

## Часть 3. Mainnet

⚠️ Начинать только после успешной Части 1 и загруженных метаданных.

### 3.1 Переключить сеть и импортировать боевой ключ

В `token/.env`:

```
DOFFA_CLUSTER=mainnet-beta
DOFFA_KEYPAIR_PATH=./owner.json
```

```bash
npm run token:import -- E4tvCMvkrpMeVKE8SvcLgxk6D2jovQ3SB97s2umSwLUr
```

Скрипт спросит приватный ключ. **Ввод скрыт**, ключ никуда не отправляется и
записывается только в локальный файл, закрытый `.gitignore`. Принимает base58
из Phantom (Настройки → Безопасность → Экспорт приватного ключа) или
JSON-массив из 64 чисел.

Скрипт сверит ключ с адресом и откажется, если он от другого кошелька.

> 🔒 Никому не показывай этот ключ — ни мне, ни кому-либо ещё. Ни один человек
> и ни один инструмент не должен его просить.

### 3.2 Проверить бэкап восстановлением

**Не пропускай этот шаг.** Удали кошелёк из Phantom и восстанови из
сохранённой seed-фразы. Пока восстановление не проверено — считай, что копии
нет.

Первый миллион DOFFA потерян ровно потому, что этого никто не сделал.

### 3.3 Выпуск

```bash
npm run token:check-wallet   # должен сказать «ГОТОВ к выпуску»
npm run token:create
npm run token:account
npm run token:metadata
npm run token:mint
npm run token:verify
```

После каждой команды скрипт печатает подпись транзакции и ссылку на explorer.
**Сохрани их все** — они пойдут в `docs/MAINNET-TOKEN-REPORT.md`.

### 3.4 СТОП

Здесь останавливаемся. Пришли мне:

- адрес нового mint;
- вывод `token:verify`;
- все подписи транзакций.

Я сверю всё с сетью независимо, обновлю сайт (`NEXT_PUBLIC_DOFFA_MINT`,
`NEXT_PUBLIC_DOFFA_METADATA_URI`) и подготовлю отчёт.

### 3.5 Отзыв полномочий — только после сверки

```bash
npm run token:revoke
```

Скрипт потребует ввести точно: `REVOKE DOFFA AUTHORITIES`

После этого допечатать токены нельзя **никогда и никому**, включая тебя.
Отменяющей операции не существует.

---

## Часть 4. Vercel

В настройках проекта → Environment Variables:

| Переменная | Значение |
|---|---|
| `NEXT_PUBLIC_DOFFA_MINT` | адрес нового mint |
| `NEXT_PUBLIC_DOFFA_METADATA_URI` | ссылка на JSON |
| `NEXT_PUBLIC_DOFFA_OWNER_WALLET` | `E4tvCMvkrpMeVKE8SvcLgxk6D2jovQ3SB97s2umSwLUr` |

⚠️ Приватный ключ в Vercel не добавляется **никогда**. Все переменные выше —
публичные данные, их видно в блокчейне и так.

---

## Необратимые операции

| Операция | Что нельзя отменить |
|---|---|
| Создание mint | адрес остаётся в сети навсегда |
| Отзыв mint authority | допечатать токены — никогда и никому |
| Отзыв freeze authority | заморозить аккаунт — никогда |
| `token:burn` | сожжённое не восстановить |
| `token:burn-legacy` | старые 99 млн исчезнут навсегда |
| Потеря ключа владельца | доступ к 100 000 000 теряется |

Обратимо: правки сайта, переменные Vercel, всё в devnet, а также выпуск
эмиссии — **пока mint authority не отозван**.

---

## План отката сайта

Если после деплоя что-то сломалось:

1. **Быстро:** в Vercel → Deployments → предыдущий рабочий → Promote to
   Production. Занимает секунды.
2. **Через код:** `git revert <commit>` и пуш — Vercel пересоберёт сам.
3. **Только переменные:** убрать `NEXT_PUBLIC_DOFFA_MINT` — сайт вернётся к
   честному «Mainnet token not deployed yet», ничего не сломав.

Токен от этого не пострадает: он живёт в блокчейне независимо от сайта.
