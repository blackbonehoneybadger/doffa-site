import type { Metadata, Viewport } from "next";
import { Unbounded, Manrope } from "next/font/google";
import "./globals.css";

const display = Unbounded({
  variable: "--font-display-src",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "600", "700", "800"],
  display: "swap",
});

const sans = Manrope({
  variable: "--font-sans-src",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

// Описание в поиске и в превью ссылки — первое, что видит человек, и
// единственное, что он видит, если по ссылке не перейдёт. С 28.09.2026 сайт
// строится вокруг игры: DOFFA DRAKA — главная и единственная игра проекта.
// Здесь ровно то, что есть на самом деле: работающая игра в Telegram и
// выпущенная монета в TON. Обещаний про обмен и вывод нет — они ещё не включены.
const ОПИСАНИЕ =
  "DOFFA DRAKA — боковой файтинг прямо в Telegram: одиннадцать бойцов, пятнадцать арен, турниры и бои с живыми соперниками. Зёрна за игру, монета DOFF в сети TON. Игра выросла из горной кофейни DOFFA в Карачаево-Черкесии.";
const КОРОТКО =
  "Дерись в DOFFA DRAKA прямо в Telegram: 11 бойцов, 15 арен, турниры. Зёрна за игру, DOFF в сети TON.";

export const metadata: Metadata = {
  title: "DOFFA DRAKA — файтинг в Telegram · DOFF в TON",
  description: ОПИСАНИЕ,
  metadataBase: new URL("https://doffa.coffee"),
  openGraph: {
    title: "DOFFA DRAKA — файтинг в Telegram",
    description: КОРОТКО,
    type: "website",
    locale: "ru_RU",
    siteName: "DOFFA",
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "DOFFA DRAKA — файтинг в Telegram" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "DOFFA DRAKA — файтинг в Telegram",
    description: КОРОТКО,
    images: ["/og.jpg"],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf6ee" },
    { media: "(prefers-color-scheme: dark)", color: "#1c140f" },
  ],
};

// Ставим data-theme ДО гидратации React, синхронным инлайн-скриптом —
// иначе при заходе со светлой системной темой страница на долю секунды
// мигнёт тёмной вёрсткой, а потом перекрасится в светлую.
const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("doffa-theme");if(t!=="light"&&t!=="dark"){t=matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";}document.documentElement.setAttribute("data-theme",t);}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
      className={`${display.variable} ${sans.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="grain min-h-full flex flex-col">
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        {children}
      </body>
    </html>
  );
}
