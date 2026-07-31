import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",

    // Не исходники приложения — правила Next/TS к ним неприменимы.
    //
    // .claude/skills — служебные CommonJS-скрипты для агентов. Они по своей
    // природе используют require(), из-за чего TS-правило no-require-imports
    // давало 14 ошибок на файлы, которые в бандл вообще не попадают.
    ".claude/**",

    // archive/legacy-doffa-token — заархивированные скрипты старого токена.
    // Они рабочие и нужны, чтобы сжечь legacy-эмиссию, но развитию не
    // подлежат: править их стиль под текущие правила смысла нет.
    "archive/**",
  ]),
]);

export default eslintConfig;
