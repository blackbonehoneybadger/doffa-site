import type { MetadataRoute } from "next";

// Карта сайта doffa.coffee. Публичные маршруты экосистемы DOFFA Games
// (Shelf → Arena → Heroes), токена и кофейни. Прежних игр в карте нет.
const BASE = "https://doffa.coffee";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    "",
    "/shelf",
    "/arena",
    "/game", // DOFFA Heroes
    "/token",
    "/transparency",
    "/merch",
    "/download",
    "/profile",
  ];
  return routes.map((path) => ({
    url: `${BASE}${path}`,
    changeFrequency: "weekly",
    priority: path === "" ? 1 : 0.7,
  }));
}
