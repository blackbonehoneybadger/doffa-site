"use client";

import { useEffect } from "react";

const KEY = "doffa-visit-counted";

/** Один раз за сессию браузера увеличивает счётчик просмотров на сервере. */
export function VisitBeacon() {
  useEffect(() => {
    try {
      if (sessionStorage.getItem(KEY)) return;
      sessionStorage.setItem(KEY, "1");
    } catch {
      /* private mode — всё равно попробуем учесть */
    }
    void fetch("/api/visit", { method: "POST", keepalive: true }).catch(() => {});
  }, []);
  return null;
}
