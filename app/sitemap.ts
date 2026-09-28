import type { MetadataRoute } from "next";

// Карта сайта doffa.coffee. Игра DOFFA DRAKA — главная и единственная; кофейня
// и мерч рядом. /download больше не страница, а перенаправление на /game.
const BASE = "https://doffa.coffee";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["", "/game", "/transparency", "/merch", "/profile"];
  return routes.map((path) => ({
    url: `${BASE}${path}`,
    changeFrequency: "weekly",
    priority: path === "" ? 1 : path === "/game" ? 0.9 : 0.7,
  }));
}
