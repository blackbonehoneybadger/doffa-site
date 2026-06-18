// Контент сайта DOFFA на двух языках. Тексты для согласования с владельцем.
// Числа в дашборде сжиганий — ВРЕМЕННЫЕ (mock), до реального запуска токена.

export type Lang = "ru" | "en";

export const TOKEN = {
  symbol: "$DOFFA",
  network: "Solana",
  supply: 100_000_000,
  decimals: 6,
  since: 2021,
  instagram: "https://www.instagram.com/coffeedoffa",
  instagramHandle: "@coffeedoffa",
};

// Контакты кофейни (реальные данные).
export const CONTACT = {
  phoneDisplay: "+7 928 764-27-68",
  phoneTel: "+79287642768",
  whatsapp: "https://wa.me/79287642768",
  map: "https://maps.app.goo.gl/27uFoNANjXDcSHVX9",
};

// Фото кофейни для секции «Галерея» (лежат в public/brand/).
export const GALLERY: { src: string; alt: string }[] = [
  { src: "/brand/latteart-blue.jpg", alt: "Латте-арт в синей чашке" },
  { src: "/brand/interior-sunset.jpg", alt: "Зал кофейни на закате" },
  { src: "/brand/coldbrew-logo.jpg", alt: "Холодный кофе на фоне логотипа DOFFA" },
  { src: "/brand/flatwhite-dark.jpg", alt: "Флэт уайт и стакан воды" },
  { src: "/brand/bar-golden.jpg", alt: "Барная стойка в золотой час" },
  { src: "/brand/flowercup.jpg", alt: "Капучино в цветочной чашке" },
];

// Временные данные для дашборда (до mainnet-запуска).
export const MOCK = {
  burned: 12_840,
  cupsSold: 12_840,
  reserve: 30_000_000,
};

type Dict = {
  nav: { story: string; how: string; token: string; burns: string; menu: string; gallery: string; buy: string; roadmap: string; faq: string; contact: string };
  hero: { kicker: string; title1: string; title2: string; sub: string; ctaBuy: string; ctaMenu: string; soon: string; mediaCaption: string };
  story: { tag: string; title: string; body: string[] };
  how: { tag: string; title: string; sub: string; steps: { t: string; d: string }[] };
  token: { tag: string; title: string; sub: string; rows: { k: string; v: string }[]; alloc: { name: string; pct: number }[] };
  burns: { tag: string; title: string; supply: string; burned: string; left: string; cups: string; note: string };
  menu: { tag: string; title: string; sub: string; note: string; groups: { title: string; items: { name: string; price: string }[] }[] };
  gallery: { tag: string; title: string; sub: string };
  buy: { tag: string; title: string; sub: string; connect: string; soon: string; points: string[] };
  roadmap: { tag: string; title: string; phases: { n: string; t: string; d: string; done?: boolean }[] };
  faq: { tag: string; title: string; items: { q: string; a: string }[] };
  contact: { tag: string; title: string; sub: string; address: string; addressVal: string; phone: string; phoneVal: string; hours: string; hoursVal: string; ig: string; mapCta: string };
  legal: string;
};

export const dict: Record<Lang, Dict> = {
  ru: {
    nav: { story: "История", how: "Как это работает", token: "Токеномика", burns: "Сжигания", menu: "Меню", gallery: "Галерея", buy: "Купить", roadmap: "Дорожная карта", faq: "FAQ", contact: "Контакты" },
    hero: {
      kicker: "COFFEE DOFFA · ESPRESSO BAR · SINCE 2021",
      title1: "Каждая чашка",
      title2: "сжигает токен",
      sub: "Кофейня из аула в Карачаево-Черкесии, сделанная своими руками. Один проданный кофе — один сожжённый $DOFFA. Чем больше людей пьют — тем реже становится токен.",
      ctaBuy: "Купить $DOFFA",
      ctaMenu: "Смотреть меню",
      soon: "Скоро",
      mediaCaption: "Руки бариста · скоро видео",
    },
    story: {
      tag: "История",
      title: "Настоящая кофейня, а не мем",
      body: [
        "DOFFA — это эспрессо-бар, который с 2021 года живёт в горах Карачаево-Черкесии. Его построили своими руками: тёплый свет, уютная стойка, ароматный кофе и кот, встречающий гостей у входа.",
        "Мы решили связать любимое дело с честной идеей: у DOFFA есть собственный токен на блокчейне Solana, обеспеченный не обещаниями, а реальными чашками кофе.",
        "Это прозрачный и халяльный по духу проект про труд, гостеприимство и сообщество — а не про спекуляцию.",
      ],
    },
    how: {
      tag: "Механика",
      title: "1 чашка = 1 сожжённый токен",
      sub: "Простая и честная механика дефицита, которую может проверить каждый.",
      steps: [
        { t: "Продаём кофе", d: "Гость покупает чашку в DOFFA — как обычно, за рубли. Никакой обязательной крипты." },
        { t: "Сжигаем токен", d: "За каждую проданную чашку из резерва сжигается один $DOFFA. Транзакцию подписывает владелец." },
        { t: "Публикуем burn", d: "Каждое сжигание видно в блокчейне (Solscan) и в дашборде на сайте. Раз в неделю — Burn Report." },
      ],
    },
    token: {
      tag: "Токеномика",
      title: "$DOFFA на Solana",
      sub: "Прозрачное распределение. Mint и freeze authority отзываются после запуска — никто не сможет допечатать или заморозить токены.",
      rows: [
        { k: "Сеть", v: "Solana (SPL)" },
        { k: "Тикер", v: "$DOFFA" },
        { k: "Decimals", v: "6" },
        { k: "Общий выпуск", v: "100 000 000" },
        { k: "Mint authority", v: "Отозван" },
        { k: "Freeze authority", v: "Отозван" },
      ],
      alloc: [
        { name: "Ликвидность DEX", pct: 40 },
        { name: "Coffee Burn Reserve", pct: 30 },
        { name: "Команда (lock)", pct: 10 },
        { name: "Маркетинг", pct: 10 },
        { name: "Резерв", pct: 10 },
      ],
    },
    burns: {
      tag: "Прозрачность",
      title: "Дашборд сжиганий",
      supply: "Общий выпуск",
      burned: "Сожжено",
      left: "Осталось",
      cups: "Продано чашек",
      note: "Демо-данные до запуска токена. После mainnet здесь будут реальные цифры из блокчейна.",
    },
    menu: {
      tag: "Кофейня",
      title: "Меню",
      sub: "Реальное меню кофейни DOFFA. Две цены — два объёма.",
      note: "+ сироп 40 ₽ · + мёд 30 ₽",
      groups: [
        {
          title: "Кофе",
          items: [
            { name: "Эспрессо",      price: "100 / 140 ₽" },
            { name: "Американо",     price: "100 / 140 ₽" },
            { name: "Макиато",       price: "100 ₽" },
            { name: "Капучино",      price: "140 / 160 ₽" },
            { name: "Латте",         price: "140 / 160 ₽" },
            { name: "Макачино",      price: "150 / 170 ₽" },
            { name: "Флэт уайт",     price: "180 ₽" },
            { name: "Раф",           price: "190 ₽" },
          ],
        },
        {
          title: "Чай",
          items: [
            { name: "Ассам",         price: "80 / 200 ₽" },
            { name: "Зелёный чай",   price: "80 / 200 ₽" },
            { name: "Молочный улун", price: "90 / 220 ₽" },
            { name: "Наглый фрукт",  price: "100 / 250 ₽" },
            { name: "Облепиха",      price: "150 / 300 ₽" },
            { name: "Малина",        price: "150 / 300 ₽" },
            { name: "Имбирный",      price: "150 / 300 ₽" },
          ],
        },
        {
          title: "Холодные напитки",
          items: [
            { name: "Айс латте",         price: "" },
            { name: "Фрапучино",         price: "" },
            { name: "Фрапе",             price: "" },
            { name: "Бамбл",             price: "" },
            { name: "Бабл ти",           price: "" },
            { name: "Колд брю",          price: "" },
            { name: "Мохито",            price: "" },
            { name: "Молочный коктейль", price: "" },
          ],
        },
      ],
    },
    gallery: {
      tag: "Атмосфера",
      title: "DOFFA вживую",
      sub: "Кадры из кофейни: кофе, латте-арт, зал и виды на горы Карачаево-Черкесии.",
    },
    buy: {
      tag: "Купить и хранить",
      title: "Купить $DOFFA",
      sub: "Без посредников и без хранения ваших денег нами. Покупка и обмен идут напрямую из вашего кошелька через DEX.",
      connect: "Подключить кошелёк",
      soon: "Доступно после запуска токена",
      points: [
        "Хранение — в вашем кошельке (Phantom / Solflare), не у нас.",
        "Обмен $DOFFA ↔ USDT — через Jupiter / Raydium.",
        "Покупка за рубли — через сторонний лицензированный сервис.",
      ],
    },
    roadmap: {
      tag: "План",
      title: "Дорожная карта",
      phases: [
        { n: "01", t: "Бренд и сайт", d: "Фирстиль, премиальный сайт RU/EN, материалы кофейни.", done: true },
        { n: "02", t: "Тест-токен (devnet)", d: "Выпуск тестового $DOFFA, обкатка сжигания и обмена." },
        { n: "03", t: "Юридическая структура", d: "Консультация с юристом, дисклеймеры, юрисдикции." },
        { n: "04", t: "Запуск в mainnet", d: "Реальный выпуск, метаданные, отзыв authority, Solscan." },
        { n: "05", t: "Ликвидность и старт", d: "Пул на Raydium, публичный запуск, первый burn." },
        { n: "06", t: "CoinGecko / CMC", d: "Заявки на агрегаторы после появления объёма." },
      ],
    },
    faq: {
      tag: "Вопросы",
      title: "Частые вопросы",
      items: [
        { q: "Это мем-койн?", a: "Нет. За токеном стоит реальная работающая кофейня и реальные продажи. Каждая чашка уменьшает количество токенов." },
        { q: "Нужно платить за кофе токеном?", a: "Нет. Кофе покупается как обычно. Токен — отдельная история про прозрачный дефицит и сообщество." },
        { q: "Где хранятся мои токены?", a: "Только в вашем личном кошельке. Сайт ничего не хранит и не имеет доступа к вашим средствам." },
        { q: "Это инвестиция?", a: "Нет. Мы не обещаем доход и не даём финансовых советов. Участвуйте только из интереса к проекту и кофейне." },
      ],
    },
    contact: {
      tag: "Контакты",
      title: "Загляните в DOFFA",
      sub: "Эспрессо-бар в ауле Псаучье-Дахе, Хабезский район, Карачаево-Черкесия. Заходите на кофе или напишите нам.",
      address: "Адрес",
      addressVal: "КЧР, аул Псаучье-Дахе, ул. Калмыкова, 10",
      phone: "Телефон",
      phoneVal: CONTACT.phoneDisplay,
      hours: "Часы работы",
      hoursVal: "Ежедневно, 07:00–22:00",
      ig: "Instagram",
      mapCta: "Открыть на карте",
    },
    legal:
      "$DOFFA — утилити-токен, связанный с кофейней DOFFA. Это не ценная бумага, не инвестиционный продукт и не предложение о покупке ценных бумаг. Материалы сайта носят информационный характер и не являются финансовой, юридической или налоговой консультацией. Криптоактивы волатильны и рискованны. Участвуйте ответственно и в рамках законов вашей юрисдикции.",
  },
  en: {
    nav: { story: "Story", how: "How it works", token: "Tokenomics", burns: "Burns", menu: "Menu", gallery: "Gallery", buy: "Buy", roadmap: "Roadmap", faq: "FAQ", contact: "Contact" },
    hero: {
      kicker: "COFFEE DOFFA · ESPRESSO BAR · SINCE 2021",
      title1: "Every cup",
      title2: "burns a token",
      sub: "A hand-built coffee bar in the mountains of Karachay-Cherkessia. One coffee sold — one $DOFFA burned. The more people drink, the rarer the token becomes.",
      ctaBuy: "Buy $DOFFA",
      ctaMenu: "View menu",
      soon: "Soon",
      mediaCaption: "Barista hands · video soon",
    },
    story: {
      tag: "Story",
      title: "A real coffee bar, not a meme",
      body: [
        "DOFFA is an espresso bar that has lived in the mountains of Karachay-Cherkessia since 2021. It was built by hand: warm light, a cozy bar, fragrant coffee, and a cat greeting guests at the door.",
        "We tied our craft to an honest idea: DOFFA has its own token on the Solana blockchain, backed not by promises but by real cups of coffee.",
        "A transparent, halal-spirited project about work, hospitality and community — not speculation.",
      ],
    },
    how: {
      tag: "Mechanics",
      title: "1 cup = 1 burned token",
      sub: "A simple, honest scarcity mechanic anyone can verify.",
      steps: [
        { t: "We sell coffee", d: "A guest buys a cup at DOFFA as usual, in local currency. No crypto required." },
        { t: "We burn a token", d: "For every cup sold, one $DOFFA is burned from the reserve. The owner signs the transaction." },
        { t: "We publish the burn", d: "Every burn is visible on-chain (Solscan) and on the site dashboard. A weekly Burn Report keeps it honest." },
      ],
    },
    token: {
      tag: "Tokenomics",
      title: "$DOFFA on Solana",
      sub: "Transparent distribution. Mint and freeze authority are revoked after launch — no one can print or freeze tokens.",
      rows: [
        { k: "Network", v: "Solana (SPL)" },
        { k: "Ticker", v: "$DOFFA" },
        { k: "Decimals", v: "6" },
        { k: "Total supply", v: "100,000,000" },
        { k: "Mint authority", v: "Revoked" },
        { k: "Freeze authority", v: "Revoked" },
      ],
      alloc: [
        { name: "DEX liquidity", pct: 40 },
        { name: "Coffee Burn Reserve", pct: 30 },
        { name: "Team (lock)", pct: 10 },
        { name: "Marketing", pct: 10 },
        { name: "Reserve", pct: 10 },
      ],
    },
    burns: {
      tag: "Transparency",
      title: "Burn dashboard",
      supply: "Total supply",
      burned: "Burned",
      left: "Remaining",
      cups: "Cups sold",
      note: "Demo data before token launch. After mainnet these will be real on-chain numbers.",
    },
    menu: {
      tag: "Coffee bar",
      title: "Menu",
      sub: "DOFFA's real menu. Two prices — two sizes.",
      note: "+ syrup 40 ₽ · + honey 30 ₽",
      groups: [
        {
          title: "Coffee",
          items: [
            { name: "Espresso",     price: "100 / 140 ₽" },
            { name: "Americano",    price: "100 / 140 ₽" },
            { name: "Macchiato",    price: "100 ₽" },
            { name: "Cappuccino",   price: "140 / 160 ₽" },
            { name: "Latte",        price: "140 / 160 ₽" },
            { name: "Mochaccino",   price: "150 / 170 ₽" },
            { name: "Flat white",   price: "180 ₽" },
            { name: "Raf",          price: "190 ₽" },
          ],
        },
        {
          title: "Tea",
          items: [
            { name: "Assam",        price: "80 / 200 ₽" },
            { name: "Green tea",    price: "80 / 200 ₽" },
            { name: "Milk oolong",  price: "90 / 220 ₽" },
            { name: "Cheeky fruit", price: "100 / 250 ₽" },
            { name: "Sea buckthorn",price: "150 / 300 ₽" },
            { name: "Raspberry",    price: "150 / 300 ₽" },
            { name: "Ginger",       price: "150 / 300 ₽" },
          ],
        },
        {
          title: "Ice drinks",
          items: [
            { name: "Iced latte",    price: "" },
            { name: "Frappuccino",   price: "" },
            { name: "Frappe",        price: "" },
            { name: "Bumble",        price: "" },
            { name: "Bubble tea",    price: "" },
            { name: "Cold brew",     price: "" },
            { name: "Mojito",        price: "" },
            { name: "Milkshake",     price: "" },
          ],
        },
      ],
    },
    gallery: {
      tag: "Atmosphere",
      title: "DOFFA in real life",
      sub: "Shots from the coffee bar: coffee, latte art, the room and views of the Karachay-Cherkessia mountains.",
    },
    buy: {
      tag: "Buy & hold",
      title: "Buy $DOFFA",
      sub: "No middlemen, and we never hold your money. Buying and swapping happen straight from your own wallet via a DEX.",
      connect: "Connect wallet",
      soon: "Available after token launch",
      points: [
        "Custody stays in your wallet (Phantom / Solflare), never with us.",
        "Swap $DOFFA ↔ USDT via Jupiter / Raydium.",
        "Fiat on-ramp via a licensed third-party provider.",
      ],
    },
    roadmap: {
      tag: "Plan",
      title: "Roadmap",
      phases: [
        { n: "01", t: "Brand & site", d: "Identity, premium RU/EN website, coffee-bar assets.", done: true },
        { n: "02", t: "Test token (devnet)", d: "Mint a test $DOFFA, rehearse burns and swaps." },
        { n: "03", t: "Legal structure", d: "Lawyer review, disclaimers, jurisdictions." },
        { n: "04", t: "Mainnet launch", d: "Real mint, metadata, authority revoke, Solscan." },
        { n: "05", t: "Liquidity & launch", d: "Raydium pool, public launch, first burn." },
        { n: "06", t: "CoinGecko / CMC", d: "Aggregator listings once volume appears." },
      ],
    },
    faq: {
      tag: "Questions",
      title: "Frequently asked",
      items: [
        { q: "Is this a meme coin?", a: "No. There's a real working coffee bar and real sales behind the token. Every cup reduces the token count." },
        { q: "Do I pay for coffee with the token?", a: "No. Coffee is bought as usual. The token is a separate story about transparent scarcity and community." },
        { q: "Where are my tokens stored?", a: "Only in your personal wallet. The site stores nothing and has no access to your funds." },
        { q: "Is this an investment?", a: "No. We promise no returns and give no financial advice. Take part out of interest in the project and the coffee bar." },
      ],
    },
    contact: {
      tag: "Contact",
      title: "Drop by DOFFA",
      sub: "An espresso bar in the village of Psauche-Dakhe, Khabez district, Karachay-Cherkessia. Come for a coffee or message us.",
      address: "Address",
      addressVal: "Psauche-Dakhe, Kalmykova St. 10, Karachay-Cherkessia",
      phone: "Phone",
      phoneVal: CONTACT.phoneDisplay,
      hours: "Hours",
      hoursVal: "Daily, 07:00–22:00",
      ig: "Instagram",
      mapCta: "Open in maps",
    },
    legal:
      "$DOFFA is a utility token connected to the DOFFA coffee bar. It is not a security, not an investment product, and not an offer to sell securities. Site materials are informational only and are not financial, legal or tax advice. Crypto assets are volatile and risky. Participate responsibly and within the laws of your jurisdiction.",
  },
};
