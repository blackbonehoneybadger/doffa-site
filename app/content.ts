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

// Видео кофейни — показываются в верхней части сайта, сразу после hero.
export const VIDEOS: { src: string; alt: string }[] = [
  { src: "/brand/icedlatte.mp4", alt: "Налив айс-латте" },
  { src: "/brand/cat.mp4", alt: "Кот кофейни DOFFA" },
];

// Фото кофейни для секции «Галерея» (лежат в public/brand/).
export const GALLERY: { src: string; alt: string }[] = [
  { src: "/brand/latteart-blue.jpg", alt: "Латте-арт в синей чашке" },
  { src: "/brand/interior-sunset.jpg", alt: "Зал кофейни на закате" },
  { src: "/brand/coldbrew-logo.jpg", alt: "Холодный кофе на фоне логотипа DOFFA" },
  { src: "/brand/flatwhite-dark.jpg", alt: "Флэт уайт и стакан воды" },
  { src: "/brand/latteart-black.jpg", alt: "Латте-арт в чёрной чашке" },
  { src: "/brand/bar-golden.jpg", alt: "Барная стойка в золотой час" },
  { src: "/brand/flatwhite-hand.jpg", alt: "Флэт уайт в руке" },
  { src: "/brand/flowercup.jpg", alt: "Капучино в цветочной чашке" },
  { src: "/brand/logo-sign.jpg", alt: "Вывеска DOFFA Espresso Bar" },
];

// Состояние дашборда до запуска реальных сжиганий.
// Честный ноль: пока никто не сжёг ни одного токена — burned = 0, в обороте весь выпуск.
// Никаких выдуманных цифр: всё, что показывается, либо читается из блокчейна, либо это явный ноль.
export const MOCK = {
  burned: 0,
  cupsSold: 0,
  reserve: 30_000_000,
};

type Dict = {
  nav: { story: string; how: string; token: string; burns: string; proof: string; menu: string; gallery: string; buy: string; roadmap: string; faq: string; contact: string };
  hero: { kicker: string; title1: string; title2: string; sub: string; ctaBuy: string; ctaMenu: string; soon: string; mediaCaption: string };
  story: { tag: string; title: string; body: string[] };
  how: { tag: string; title: string; sub: string; steps: { t: string; d: string }[] };
  token: { tag: string; title: string; sub: string; rows: { k: string; v: string }[]; alloc: { name: string; pct: number }[] };
  burns: { tag: string; title: string; supply: string; burned: string; left: string; cups: string; note: string; live: string; verify: string; liveNote: string; demoBadge: string; demoNote: string };
  proof: {
    tag: string;
    title: string;
    sub: string;
    colTime: string;
    colAmount: string;
    colSale: string;
    colHash: string;
    colVerify: string;
    colStatus: string;
    statusVerified: string;
    empty: string;
    loading: string;
    mismatchWarn: string;
    trustTag: string;
    trustTitle: string;
    trustSub: string;
    trustSteps: { icon: string; t: string; d: string }[];
  };
  verify: {
    tag: string;
    title: string;
    sub: string;
    mintLabel: string;
    reserveLabel: string;
    reserveNote: string;
    clusterLabel: string;
    clusterVal: string;
    viewToken: string;
    viewHolders: string;
  };
  menu: { tag: string; title: string; sub: string; note: string; groups: { title: string; items: { name: string; price: string }[] }[] };
  videos: { tag: string; title: string; sub: string };
  gallery: { tag: string; title: string; sub: string };
  buy: { tag: string; title: string; sub: string; connect: string; soon: string; points: string[]; connected: string; balanceLabel: string; install: string; demoNote: string; disconnect: string };
  roadmap: { tag: string; title: string; phases: { n: string; t: string; d: string; done?: boolean }[] };
  faq: { tag: string; title: string; items: { q: string; a: string }[] };
  contact: { tag: string; title: string; sub: string; address: string; addressVal: string; phone: string; phoneVal: string; hours: string; hoursVal: string; ig: string; mapCta: string };
  legal: string;
};

export const dict: Record<Lang, Dict> = {
  ru: {
    nav: { story: "История", how: "Как это работает", token: "Токеномика", burns: "Сжигания", proof: "Доказательства", menu: "Меню", gallery: "Галерея", buy: "Купить", roadmap: "Дорожная карта", faq: "FAQ", contact: "Контакты" },
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
        { t: "Продаём кофе в CloudShop", d: "Гость покупает чашку в DOFFA — как обычно, за рубли (наличные или карта). Чек регистрируется в CloudShop как PAID. Никакой обязательной крипты." },
        { t: "Сжигаем токен в блокчейне", d: "За каждую оплаченную чашку из резерва сжигается один $DOFFA. Транзакция уходит в Solana с мемо, связывающим её с ID чека из CloudShop." },
        { t: "Проверяем в блокчейне", d: "Дашборд показывает реальные цифры: сколько чашек продали в CloudShop vs сколько токенов сожгли. Любой может перепроверить в Solscan и в CloudShop API." },
      ],
    },
    token: {
      tag: "Токеномика",
      title: "$DOFFA на Solana",
      sub: "Прозрачное распределение. На mainnet mint и freeze authority будут отозваны при запуске — статус всегда можно проверить в Solscan. Сейчас токен живёт на devnet (тест).",
      rows: [
        { k: "Сеть", v: "Solana · devnet (тест)" },
        { k: "Тикер", v: "$DOFFA" },
        { k: "Decimals", v: "6" },
        { k: "Общий выпуск", v: "100 000 000" },
        { k: "Mint authority", v: "Devnet ✓ · Mainnet: ожидается" },
        { k: "Freeze authority", v: "Devnet ✓ · Mainnet: ожидается" },
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
      note: "Пока сожжений нет: в обороте весь выпуск. Цифры появятся, когда система начнёт сжигать токены за реальные продажи в mainnet.",
      live: "Live · devnet",
      verify: "Проверить в Solscan",
      liveNote: "Цифры читаются напрямую из блокчейна Solana (тест-токен на devnet). Их никто не вписывает вручную — любой может перепроверить в Solscan.",
      demoBadge: "DEVNET DEMO · НЕ РЕАЛЬНЫЕ ДЕНЬГИ",
      demoNote: "Это демонстрация на тестовой сети Solana (devnet). Токены здесь не имеют ценности, реальные деньги не задействованы.",
    },
    proof: {
      tag: "Публичный аудит",
      title: "История сжиганий",
      sub: "Каждая запись в этой таблице — транзакция в блокчейне Solana. Они не редактируются и не удаляются. Проверить может любой.",
      colTime: "Дата",
      colAmount: "Сожжено",
      colSale: "ID продажи",
      colHash: "Хеш квитанции",
      colVerify: "TX",
      colStatus: "Статус",
      statusVerified: "Подтверждено",
      empty: "Подтверждённых сжиганий пока нет — devnet demo. Первая запись появится, когда система начнёт сжигать токены за оплаченные чеки CloudShop.",
      loading: "Читаем блокчейн…",
      mismatchWarn: "⚠ Продажи в CloudShop не совпадают с burns в блокчейне",
      trustTag: "Система доверия",
      trustTitle: "Почему это нельзя подделать",
      trustSub: "Данные о сжиганиях хранятся исключительно в блокчейне Solana. Источник правды — оплаченные чеки в CloudShop. Сайт только читает эти данные из двух источников и не может их подменять.",
      trustSteps: [
        {
          icon: "🧾",
          t: "Оплаченный чек в CloudShop",
          d: "Гость покупает кофе и платит (наличные или карта) — чек помечен как PAID в CloudShop. Система вебхука отправляет нам только оплаченные чеки, сервер считает товары с категорией «кофе» и вычисляет анонимный SHA-256 хеш (без PII).",
        },
        {
          icon: "🔥",
          t: "Burn в блокчейне Solana",
          d: "Оператор запускает команду burn с ID чека и receipt_hash. Транзакция уходит в Solana с мемо «DOFFA coffee burn | check_id | hash» — эта строка навсегда записана в блокчейн, её никто не может изменить.",
        },
        {
          icon: "🔍",
          t: "Публичная проверка",
          d: "Дашборд показывает: сколько чашек продали в CloudShop vs сколько токенов сожгли в Solana. Мисматч = ошибка на сервере. Любой может перепроверить в Solscan и в CloudShop API.",
        },
      ],
    },
    verify: {
      tag: "Проверка",
      title: "Проверь сам",
      sub: "Не верь на слово — проверяй в блокчейне. Все адреса ниже открыты в Solscan.",
      mintLabel: "Адрес токена (mint)",
      reserveLabel: "Кошелёк Burn Reserve",
      reserveNote: "Кошелёк, из которого сжигаются токены за проданные чашки. Держателей и сжигания видно в Solscan.",
      clusterLabel: "Сеть",
      clusterVal: "Solana devnet (тест)",
      viewToken: "Открыть токен в Solscan",
      viewHolders: "Смотреть держателей",
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
            { name: "Айс латте",         price: "180 ₽" },
            { name: "Фрапучино",         price: "200 ₽" },
            { name: "Фрапе",             price: "180 ₽" },
            { name: "Бамбл",             price: "180 / 200 ₽" },
            { name: "Бабл ти",           price: "250 / 280 ₽" },
            { name: "Колд брю",          price: "200 ₽" },
            { name: "Мохито",            price: "150 ₽" },
            { name: "Молочный коктейль", price: "150 ₽" },
          ],
        },
      ],
    },
    videos: {
      tag: "В движении",
      title: "Живые кадры",
      sub: "Налив айс-латте и кот, который встречает гостей.",
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
      connected: "Кошелёк",
      balanceLabel: "Ваш баланс",
      install: "Установить Phantom",
      demoNote: "Демо на тестовой сети (devnet). Подключите Phantom, чтобы увидеть баланс тест-токена $DOFFA. Реальных денег здесь нет.",
      disconnect: "Отключить",
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
      "$DOFFA — экспериментальный комьюнити/утилити-токен, связанный с кофейней DOFFA. Это НЕ инвестиция и НЕ обещание прибыли. Токен не является ценной бумагой, инвестиционным продуктом или предложением о покупке ценных бумаг. Мы не гарантируем никакого дохода и не даём финансовых советов. Продажи кофе не обеспечивают и не гарантируют цену токена — связь между чашкой и сжиганием носит символический характер. Криптоактивы крайне волатильны и рискованны: можно потерять все вложенные средства. Сейчас проект работает на тестовой сети (devnet), где токены не имеют денежной ценности. Материалы сайта носят информационный характер и не являются финансовой, юридической или налоговой консультацией. Участвуйте только из интереса к проекту, ответственно и в рамках законов вашей юрисдикции.",
  },
  en: {
    nav: { story: "Story", how: "How it works", token: "Tokenomics", burns: "Burns", proof: "Proof", menu: "Menu", gallery: "Gallery", buy: "Buy", roadmap: "Roadmap", faq: "FAQ", contact: "Contact" },
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
        { t: "Sell coffee in CloudShop", d: "A guest buys a cup at DOFFA — the usual way, in local currency (cash or card). The receipt is logged in CloudShop as PAID. No crypto required." },
        { t: "Burn token on-chain", d: "For every paid cup, one $DOFFA is burned from the reserve. The transaction goes to Solana with a memo linking it to the CloudShop receipt ID." },
        { t: "Verify on-chain", d: "The dashboard shows real numbers: cups sold in CloudShop vs tokens burned in Solana. Anyone can re-verify on Solscan and CloudShop's API." },
      ],
    },
    token: {
      tag: "Tokenomics",
      title: "$DOFFA on Solana",
      sub: "Transparent distribution. On mainnet, mint and freeze authority will be revoked at launch — the status is always verifiable on Solscan. Right now the token lives on devnet (test).",
      rows: [
        { k: "Network", v: "Solana · devnet (test)" },
        { k: "Ticker", v: "$DOFFA" },
        { k: "Decimals", v: "6" },
        { k: "Total supply", v: "100,000,000" },
        { k: "Mint authority", v: "Devnet ✓ · Mainnet: pending" },
        { k: "Freeze authority", v: "Devnet ✓ · Mainnet: pending" },
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
      note: "No burns yet: the full supply is in circulation. Numbers appear once the system starts burning tokens for real mainnet sales.",
      live: "Live · devnet",
      verify: "Verify on Solscan",
      liveNote: "These numbers are read straight from the Solana blockchain (devnet test token). Nobody types them in by hand — anyone can re-check them on Solscan.",
      demoBadge: "DEVNET DEMO · NO REAL MONEY",
      demoNote: "This is a demo on Solana's test network (devnet). Tokens here have no value and no real money is involved.",
    },
    proof: {
      tag: "Public audit",
      title: "Burn history",
      sub: "Every row in this table is a Solana blockchain transaction. It cannot be edited or deleted. Anyone can verify it.",
      colTime: "Date",
      colAmount: "Burned",
      colSale: "Sale ID",
      colHash: "Receipt hash",
      colVerify: "TX",
      colStatus: "Status",
      statusVerified: "Verified",
      empty: "No verified burns yet — devnet demo. The first entry appears once the system starts burning tokens for paid CloudShop receipts.",
      loading: "Reading the blockchain…",
      mismatchWarn: "⚠ CloudShop sales don't match the blockchain burns",
      trustTag: "Trust system",
      trustTitle: "Why this cannot be faked",
      trustSub: "Burn data is stored exclusively on the Solana blockchain. The source of truth is paid receipts in CloudShop. The website only reads from these two sources — it can never falsify data.",
      trustSteps: [
        {
          icon: "🧾",
          t: "Paid receipt in CloudShop",
          d: "A guest buys coffee and pays (cash or card) — the receipt is marked PAID in CloudShop. The webhook only sends us paid receipts; our server counts coffee items and computes an anonymous SHA-256 hash — zero buyer PII.",
        },
        {
          icon: "🔥",
          t: "Burn on the blockchain",
          d: "The operator runs the burn command with the receipt ID and hash. The transaction goes to Solana with memo 'DOFFA coffee burn | check_id | hash' — permanently etched into the blockchain, unchangeable by anyone.",
        },
        {
          icon: "🔍",
          t: "Public verification",
          d: "The dashboard shows: cups sold in CloudShop vs tokens burned in Solana. A mismatch signals a server error. Anyone can verify both on Solscan and CloudShop's API.",
        },
      ],
    },
    verify: {
      tag: "Verify",
      title: "Check it yourself",
      sub: "Don't take our word for it — verify on-chain. Every address below opens in Solscan.",
      mintLabel: "Token address (mint)",
      reserveLabel: "Burn Reserve wallet",
      reserveNote: "The wallet tokens are burned from for cups sold. Holders and burns are visible on Solscan.",
      clusterLabel: "Network",
      clusterVal: "Solana devnet (test)",
      viewToken: "Open token on Solscan",
      viewHolders: "View holders",
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
            { name: "Iced latte",    price: "180 ₽" },
            { name: "Frappuccino",   price: "200 ₽" },
            { name: "Frappe",        price: "180 ₽" },
            { name: "Bumble",        price: "180 / 200 ₽" },
            { name: "Bubble tea",    price: "250 / 280 ₽" },
            { name: "Cold brew",     price: "200 ₽" },
            { name: "Mojito",        price: "150 ₽" },
            { name: "Milkshake",     price: "150 ₽" },
          ],
        },
      ],
    },
    videos: {
      tag: "In motion",
      title: "Live shots",
      sub: "An iced-latte pour and the cat that greets every guest.",
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
      connected: "Wallet",
      balanceLabel: "Your balance",
      install: "Install Phantom",
      demoNote: "Demo on the test network (devnet). Connect Phantom to see your $DOFFA test-token balance. No real money here.",
      disconnect: "Disconnect",
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
      "$DOFFA is an experimental community/utility token connected to the DOFFA coffee bar. It is NOT an investment and NOT a promise of profit. The token is not a security, not an investment product, and not an offer to sell securities. We promise no returns and give no financial advice. Coffee sales do not back or guarantee the token price — the link between a cup and a burn is symbolic. Crypto assets are highly volatile and risky: you can lose everything you put in. The project currently runs on a test network (devnet), where tokens have no monetary value. Site materials are informational only and are not financial, legal or tax advice. Take part out of interest in the project, responsibly, and within the laws of your jurisdiction.",
  },
};
