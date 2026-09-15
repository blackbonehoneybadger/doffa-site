import type { Metadata } from "next";
import { headers } from "next/headers";
import ProfileClient from "./ProfileClient";

export const metadata: Metadata = {
  title: "Профиль · DOFFA",
  description: "Личный кабинет DOFFA — вход по кошельку TON без пароля, никнейм и бонусы кофейни.",
};

// Страница считается на сервере: адрес манифеста TON Connect должен совпадать с
// происхождением, с которого открыт сайт, а его знает только запрос. Вычислять
// адрес в браузере значило бы отрисовать страницу дважды — сначала без него.
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "doffa.coffee";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return <ProfileClient manifestUrl={`${proto}://${host}/tonconnect-manifest.json`} />;
}
