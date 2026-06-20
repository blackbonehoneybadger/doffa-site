# CloudShop POS Интеграция

Система Proof of Coffee Burn использует CloudShop в качестве источника правды для оплаченных чеков.

## Архитектура

```
CloudShop (POS)
    ↓
    └─→ Webhook (оплаченные чеки)
         ↓
         app/api/webhook/pos/ (парсит, считает кофе, хеширует)
         ↓
         Возвращает burn_command оператору
         ↓
         npm run burn -- qty check_id receipt_hash
         ↓
         Solana блокчейн (на вечность с мемо)
         ↓
Публичная проверка:
   - app/api/cloudshop/sales (читает оплаченные чеки)
   - app/api/proof/compare (компарит CloudShop vs Solana burns)
   - Дашборд показывает синхронизацию
```

## Environment Variables

```bash
# Обязательно для работы webhook'а
CLOUDSHOP_API_KEY=sk_test_...           # API ключ CloudShop
CLOUDSHOP_ACCOUNT_ID=acc_...            # ID аккаунта (терминала)

# Для хеширования receipts (универсально для всех POS)
RECEIPT_HASH_SALT=doffa-devnet-salt-change-on-mainnet
```

## Webhook

**URL endpoint:**
```
POST /api/webhook/pos
```

**Payload (пример из CloudShop):**
```json
{
  "id": "check_12345",
  "status": "PAID",
  "total_sum": 14000,
  "items": [
    {
      "name": "Флэт уайт",
      "quantity": 1,
      "category_name": "Кофе"
    }
  ],
  "payments": [
    {
      "method": "наличные",
      "sum": 14000
    }
  ],
  "created_at": "2025-06-18T15:30:00Z"
}
```

**Правила:**
- Только `status == "PAID"` триггерят burn
- Наличные (cash) + карта (card) — обе валидны, если в CloudShop
- Считаются товары с категорией или названием, содержащим: кофе, coffee, напиток, drink, эспрессо, americano, cappuccino, latte, макиато, флэт
- Один товар = один токен для сжигания

**Response (успешно):**
```json
{
  "ok": true,
  "check_id": "check_12345",
  "qty": 1,
  "amount_rubles": "140.00",
  "receipt_hash": "a1b2c3d4e5f6g7h8",
  "payment_method": "наличные",
  "burn_command": "cd token && npm run burn -- 1 \"check_12345\" \"a1b2c3d4e5f6g7h8\"",
  "instructions": [...]
}
```

**Response (ошибка — чек не оплачен):**
```json
{
  "ok": false,
  "error": "Check is not PAID, or no coffee items found",
  "hint": "Только оплаченные чеки с кофе/напитками триггерят burn"
}
```

## API Endpoints

### 1. Получить последние продажи из CloudShop
```
GET /api/cloudshop/sales
```

**Response:**
```json
{
  "ok": true,
  "sales": [
    {
      "check_id": "check_12345",
      "quantity": 1,
      "amount_rubles": 140,
      "payment_method": "наличные",
      "timestamp": 1718715000000
    }
  ],
  "total_cups": 42,
  "period_days": 7
}
```

### 2. Сравнить CloudShop vs Solana Burns
```
GET /api/proof/compare
```

**Response:**
```json
{
  "cloudshop_cups": 42,
  "solana_burns": 42,
  "mismatch": 0,
  "mismatch_percent": 0,
  "status": "perfect",
  "message": "✓ Синхронизация идеальна: 42 чашек кофе = 42 сожженных DOFFA",
  "cloudshop_sales": [...],
  "solana_transactions": [...]
}
```

**Status значения:**
- `perfect` — совпадают идеально
- `warning` — небольшое расхождение (≤2 чашки)
- `error` — большое расхождение
- `no_data` — пока нет данных

## Для оператора

### 1. CloudShop уже отправил нам webhook
```bash
# Сервер вернул JSON с burn_command, например:
# "cd token && npm run burn -- 1 \"check_12345\" \"a1b2c3d4e5f6g7h8\""

# Запускаем:
cd token && npm run burn -- 1 "check_12345" "a1b2c3d4e5f6g7h8"

# На выходе:
# 🔥 Готово.
#    TX:      5KqG...
#    Solscan: https://solscan.io/token/FVE...
```

### 2. Проверить синхронизацию
```bash
curl https://doffa.coffee/api/proof/compare
```

Если видите мисматч — проверьте:
- CloudShop оплачивает чеки с категорией "Кофе"
- На сервере токена запущена burn-команда (логи в systemd)
- API ключ CloudShop валиден

## Безопасность

1. **Webhook signature** — CloudShop отправляет `X-CloudShop-Signature` (SHA256)
2. **API key** — хранится только в `.env`, никогда не коммитится
3. **Receipt hash** — анонимный SHA256(check_id|amount|ts|SALT), без PII покупателя
4. **Blockchain** — мемо с хешем навсегда в Solana, не может быть подделано

## Разработка

```bash
# Локально эмулировать webhook
curl -X POST http://localhost:3000/api/webhook/pos \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test_check_001",
    "status": "PAID",
    "total_sum": 14000,
    "items": [{ "name": "Флэт уайт", "quantity": 1, "category_name": "Кофе" }],
    "payments": [{ "method": "карта", "sum": 14000 }],
    "created_at": "2025-06-18T15:30:00Z"
  }'
```

## Миграция с других POS систем

Если сейчас используете Square / Shopify / Stripe:
1. Переключить физический кассовый терминал на CloudShop
2. Обновить webhook URL в текущей системе
3. Удалить конфиги старых POS
4. Тестировать на devnet перед mainnet

## Support

- CloudShop docs: https://help.cloudshop.ru/api
- Solana RPC: https://api.devnet.solana.com
- Solscan explorer: https://solscan.io/
