import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Вкладка «Скачать» стала вкладкой «Игра» (решение владельца 28.09.2026):
  // старый адрес /download жив в чужих ссылках и в поисковиках, поэтому он не
  // пропадает, а ведёт на /game. 308 — навсегда, поисковик перенесёт вес.
  async redirects() {
    return [{ source: "/download", destination: "/game", permanent: true }];
  },
};

export default nextConfig;
