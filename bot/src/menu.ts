export type Size = { label: string; amount: number };
export type MenuItem = { name: string; sizes: Size[] };
export type MenuCategory = { id: string; emoji: string; title: string; items: MenuItem[] };

export const MENU: MenuCategory[] = [
  {
    id: "coffee",
    emoji: "☕",
    title: "Кофе",
    items: [
      { name: "Эспрессо",   sizes: [{ label: "100₽", amount: 100 }, { label: "140₽", amount: 140 }] },
      { name: "Американо",  sizes: [{ label: "100₽", amount: 100 }, { label: "140₽", amount: 140 }] },
      { name: "Макиато",    sizes: [{ label: "100₽", amount: 100 }] },
      { name: "Капучино",   sizes: [{ label: "140₽", amount: 140 }, { label: "180₽", amount: 180 }] },
      { name: "Латте",      sizes: [{ label: "140₽", amount: 140 }, { label: "180₽", amount: 180 }] },
      { name: "Макаино",    sizes: [{ label: "150₽", amount: 150 }, { label: "170₽", amount: 170 }] },
      { name: "Флэт уайт",  sizes: [{ label: "180₽", amount: 180 }] },
      { name: "Раф",        sizes: [{ label: "180₽", amount: 180 }] },
    ],
  },
  {
    id: "tea",
    emoji: "🍵",
    title: "Чай",
    items: [
      { name: "Ассам",         sizes: [{ label: "80₽", amount: 80 }, { label: "200₽", amount: 200 }] },
      { name: "Зелёный чай",   sizes: [{ label: "80₽", amount: 80 }, { label: "200₽", amount: 200 }] },
      { name: "Молочный улун", sizes: [{ label: "90₽", amount: 90 }, { label: "220₽", amount: 220 }] },
      { name: "Нагой фрукт",  sizes: [{ label: "100₽", amount: 100 }, { label: "280₽", amount: 280 }] },
      { name: "Облепиха",      sizes: [{ label: "150₽", amount: 150 }, { label: "300₽", amount: 300 }] },
      { name: "Малина",        sizes: [{ label: "150₽", amount: 150 }, { label: "300₽", amount: 300 }] },
      { name: "Имбирный",      sizes: [{ label: "150₽", amount: 150 }, { label: "300₽", amount: 300 }] },
    ],
  },
  {
    id: "cold",
    emoji: "🧊",
    title: "Холодные",
    items: [
      { name: "Айс латте",         sizes: [{ label: "180₽", amount: 180 }] },
      { name: "Фраппучино",        sizes: [{ label: "200₽", amount: 200 }] },
      { name: "Фрапе",             sizes: [{ label: "180₽", amount: 180 }] },
      { name: "Бамбл",             sizes: [{ label: "180₽", amount: 180 }, { label: "200₽", amount: 200 }] },
      { name: "Бабл ти",           sizes: [{ label: "280₽", amount: 280 }] },
      { name: "Колд брю",          sizes: [{ label: "200₽", amount: 200 }] },
      { name: "Мохито",            sizes: [{ label: "150₽", amount: 150 }] },
      { name: "Молочный коктейль", sizes: [{ label: "150₽", amount: 150 }] },
    ],
  },
];
