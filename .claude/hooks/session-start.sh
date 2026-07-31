#!/bin/bash
# SessionStart hook для Claude Code on the web.
# Ставит зависимости, чтобы в сессии сразу работали typecheck, lint, tests и build.
# Локальные сессии не трогаем — выходим сразу.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(pwd)}"

# npm install (а не ci): идемпотентно и лучше переиспользует кэш контейнера.
# Скрипты пакетов не нужны — Playwright-браузеры уже в образе (/opt/pw-browsers).
npm install --no-audit --no-fund

echo "SessionStart: зависимости установлены ($(node --version), npm $(npm --version))"
