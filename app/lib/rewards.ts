// Ступени реферальных бонусов DOFFA — ваучеры в кофейне и в игровой экономике.
export type ReferralReward = {
  at: number;
  id: string;
  title: string;
  titleEn: string;
  desc: string;
};

export const REFERRAL_REWARDS: ReferralReward[] = [
  {
    at: 3,
    id: "espresso",
    title: "Бесплатный эспрессо",
    titleEn: "Free espresso",
    desc: "Ваучер на одну чашку в кофейне DOFFA — покажи логин бариста.",
  },
  {
    at: 5,
    id: "breakfast",
    title: "Бесплатный завтрак",
    titleEn: "Free breakfast",
    desc: "Завтрак в DOFFA для тебя и гостя, которого ты привёл.",
  },
  {
    at: 10,
    id: "cups500",
    title: "Ваучер 500 Cups",
    titleEn: "500 Cups voucher",
    desc: "Бонусная энергия в DOFFA Crazy 8 — дополнительный забег в игре.",
  },
  {
    at: 25,
    id: "merch",
    title: "Мерч DOFFA",
    titleEn: "DOFFA merch",
    desc: "Чехол для кружки или фартук — на выбор, пока есть на складе.",
  },
  {
    at: 50,
    id: "vip",
    title: "VIP в кофейне",
    titleEn: "Café VIP",
    desc: "Именной статус: приоритет заказа и именной стакан на стойке.",
  },
];

export function unlockedRewards(referralCount: number): ReferralReward[] {
  return REFERRAL_REWARDS.filter((r) => referralCount >= r.at);
}

export function nextReward(referralCount: number): ReferralReward | null {
  return REFERRAL_REWARDS.find((r) => referralCount < r.at) ?? null;
}
