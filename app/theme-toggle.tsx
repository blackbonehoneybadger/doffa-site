"use client";

// Переключатель светлой/тёмной темы. Реальную смену делает CSS
// (переменные в globals.css) — этот компонент только переставляет
// атрибут data-theme на <html> и запоминает выбор в localStorage.
// Первичное значение при заходе на сайт уже выставлено блокирующим
// скриптом в layout.tsx (без него была бы вспышка не той темы).

import { useEffect, useState } from "react";

type Theme = "light" | "dark";
const STORAGE_KEY = "doffa-theme";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    // Первая отрисовка на клиенте должна совпасть с серверной (там всегда
    // "dark"), иначе React пожалуется на несовпадение гидратации — поэтому
    // читаем реальную тему не синхронно в теле эффекта, а микротаском сразу
    // после. Атрибут уже выставлен блокирующим скриптом в layout.tsx, так
    // что иконка на кнопке поправится практически мгновенно.
    Promise.resolve().then(() => {
      const current = document.documentElement.getAttribute("data-theme");
      if (current === "light" || current === "dark") setTheme(current);
    });
  }, []);

  function toggle() {
    const next: Theme = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // приватный режим / заблокированный localStorage — переключение всё равно сработает в рамках сессии
    }
  }

  return (
    <button
      onClick={toggle}
      aria-label={theme === "light" ? "Включить тёмную тему" : "Включить светлую тему"}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 text-cream/80 transition hover:text-gold ${className}`}
    >
      {theme === "light" ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      )}
    </button>
  );
}
