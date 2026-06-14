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

// Временные данные для дашборда (до mainnet-запуска).
export const MOCK = {
  burned: 12_840,
  cupsSold: 12_840,
  reserve: 30_000_000,
};

type Dict = {
  nav: { story: string; how: string; token: string; burns: string; menu: string; buy: string; roadmap: string; faq: string; contact: string };
  hero: { kicker: string; title1: string; title2: string; sub: string; ctaBuy: string; ctaMenu: string; soon: string; mediaCaption: string };
  story: { tag: string; title: string; body: string[] };
  how: { tag: string; title: string; sub: string; steps: { t: string; d: string }[] };
  token: { tag: string; title: string; sub: string; rows: { k: string; v: string }[]; alloc: { name: string; pct: number }[] };
  burns: { tag: string; title: string; supply: string; burned: string; left: string; cups: string; note: string };
  menu: { tag: string; title: string; sub: string };
  buy: { tag: string; title: string; sub: string; connect: string; soon: string; points: string[] };
  roadmap: { tag: string; title: string; phases: { n: string; t: string; d: string; done?: boolean }[] };
  faq: { tag: string; title: string; items: { q: string; a: string }[] };
  contact: { tag: string; title: string; sub: string; address: string; addressVal: string; hours: string; hoursVal: string; ig: string };
  legal: string;
};

export const dict: Record<Lang, Dict> = {
  ru: {
    nav: { story: "История", how: "Как это работает", token: "Токеномика", burns: "Сжигания", menu: "Меню", buy: "Купить", roadmap: "Дорожная карта", faq: "FAQ", contact: "Контакты" },
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
    menu: { tag: "Кофейня", title: "Меню", sub: "Скоро добавим полное меню с ценами и фотографиями напитков из DOFFA." },
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
      sub: "Карачаево-Черкесская Республика. Точные адрес, телефон и часы добавим по уточнению от владельца.",
      address: "Адрес",
      addressVal: "Карачаево-Черкесия, аул (уточняется)",
      hours: "Часы работы",
      hoursVal: "Ежедневно (уточняется)",
      ig: "Instagram",
    },
    legal:
      "$DOFFA — утилити-токен, связанный с кофейней DOFFA. Это не ценная бумага, не инвестиционный продукт и не предложение о покупке ценных бумаг. Материалы сайта носят информационный характер и не являются финансовой, юридической или налоговой консультацией. Криптоактивы волатильны и рискованны. Участвуйте ответственно и в рамках законов вашей юрисдикции.",
  },
  en: {
    nav: { story: "Story", how: "How it works", token: "Tokenomics", burns: "Burns", menu: "Menu", buy: "Buy", roadmap: "Roadmap", faq: "FAQ", contact: "Contact" },
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
    menu: { tag: "Coffee bar", title: "Menu", sub: "Full menu with prices and drink photos from DOFFA coming soon." },
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
      sub: "Karachay-Cherkess Republic. Exact address, phone and hours will be added once confirmed by the owner.",
      address: "Address",
      addressVal: "Karachay-Cherkessia, aul (TBC)",
      hours: "Hours",
      hoursVal: "Daily (TBC)",
      ig: "Instagram",
    },
    legal:
      "$DOFFA is a utility token connected to the DOFFA coffee bar. It is not a security, not an investment product, and not an offer to sell securities. Site materials are informational only and are not financial, legal or tax advice. Crypto assets are volatile and risky. Participate responsibly and within the laws of your jurisdiction.",
  },
};
