import type { Metadata } from "next";
import ProfileClient from "./ProfileClient";

export const metadata: Metadata = {
  title: "Профиль · DOFFA",
  description: "Личный кабинет DOFFA — вход по Solana-кошельку, никнейм и бонусы кофейни.",
};

export default function ProfilePage() {
  return <ProfileClient />;
}
