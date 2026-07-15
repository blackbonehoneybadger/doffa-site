import type { MetadataRoute } from "next";

// Карта сайта doffa.coffee. Публичные маршруты игрового направления DOFFA Games
// (Bean Duel) и кофейни. Прежней карточной игры в карте нет.
const BASE = "https://doffa.coffee";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["", "/game", "/transparency", "/merch", "/download", "/profile"];
  return routes.map((path) => ({
    url: `${BASE}${path}`,
    changeFrequency: "weekly",
    priority: path === "" ? 1 : 0.7,
  }));
}
