# DOFFA POS — Telegram-бот бариста.
# Детерминированный деплой: Node 22, только папка bot/, без автодетекта.
# Railway видит этот Dockerfile в корне и собирает по нему (Root Directory оставь пустым).
FROM node:22-slim

# Инструменты на случай нативной сборки better-sqlite3
# (обычно ставится prebuilt-бинарь под node 22, но подстрахуемся).
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app/bot

# Сначала только манифесты — слой с зависимостями кешируется.
COPY bot/package.json bot/package-lock.json ./
RUN npm ci

# Затем исходники бота.
COPY bot/ ./

# База SQLite. Для постоянного хранения примонтируй Railway Volume на /data
# и задай переменную DB_PATH=/data/doffa.db в Variables.
ENV DB_PATH=/app/bot/data/doffa.db
ENV NODE_ENV=production

# npm start → tsx src/index.ts
CMD ["npm", "start"]
