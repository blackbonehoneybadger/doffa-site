export type Size = { label: string; amount: number };
export type MenuItem = { name: string; sizes: Size[] };
export type MenuCategory = { id: string; emoji: string; title: string; items: MenuItem[] };

export const MENU: MenuCategory[] = [
  {
    id: "coffee",
    emoji: "☕",
    title: "Кофе",
    items: [
      { name: "Эспрессо",   sizes: [{ label: "140₽", amount: 140 }, { label: "180₽", amount: 180 }] },
      { name: "Американо",  sizes: [{ label: "140₽", amount: 140 }, { label: "180₽", amount: 180 }] },
      { name: "Макиато",    sizes: [{ label: "150₽", amount: 150 }] },
      { name: "Капучино",   sizes: [{ label: "160₽", amount: 160 }, { label: "180₽", amount: 180 }] },
      { name: "Латте",      sizes: [{ label: "160₽", amount: 160 }, { label: "180₽", amount: 180 }] },
      { name: "Макачино",   sizes: [{ label: "170₽", amount: 170 }, { label: "190₽", amount: 190 }] },
      { name: "Флэт уайт",  sizes: [{ label: "220₽", amount: 220 }] },
      { name: "Раф",        sizes: [{ label: "260₽", amount: 260 }] },
    ],
  },
  {
    id: "tea",
    emoji: "🍵",
    title: "Чай",
    items: [
      { name: "Ассам",         sizes: [{ label: "140₽", amount: 140 }, { label: "280₽", amount: 280 }] },
      { name: "Зелёный чай",   sizes: [{ label: "150₽", amount: 150 }, { label: "260₽", amount: 260 }] },
      { name: "Молочный улун", sizes: [{ label: "150₽", amount: 150 }, { label: "260₽", amount: 260 }] },
      { name: "Наглый фрукт",  sizes: [{ label: "180₽", amount: 180 }, { label: "350₽", amount: 350 }] },
      { name: "Облепиха",      sizes: [{ label: "180₽", amount: 180 }, { label: "350₽", amount: 350 }] },
      { name: "Малина",        sizes: [{ label: "180₽", amount: 180 }, { label: "350₽", amount: 350 }] },
      { name: "Имбирный",      sizes: [{ label: "180₽", amount: 180 }, { label: "350₽", amount: 350 }] },
    ],
  },
  {
    id: "cold",
    emoji: "🧊",
    title: "Холодные",
    items: [
      { name: "Айс латте",         sizes: [{ label: "220₽", amount: 220 }] },
      { name: "Фрапучино",         sizes: [{ label: "280₽", amount: 280 }] },
      { name: "Фрапе",             sizes: [{ label: "240₽", amount: 240 }] },
      { name: "Бамбл",             sizes: [{ label: "240₽", amount: 240 }, { label: "280₽", amount: 280 }] },
      { name: "Бабл ти",           sizes: [{ label: "250₽", amount: 250 }, { label: "280₽", amount: 280 }] },
      { name: "Колд брю",          sizes: [{ label: "300₽", amount: 300 }] },
      { name: "Мохито",            sizes: [{ label: "180₽", amount: 180 }] },
      { name: "Молочный коктейль", sizes: [{ label: "180₽", amount: 180 }] },
    ],
  },
];
