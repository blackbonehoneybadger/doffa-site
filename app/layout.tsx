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

// Описание в поиске и в превью ссылки — это первое, что видит человек, и
// единственное, что он видит, если по ссылке не перейдёт. Поэтому здесь ровно
// то, что есть на самом деле: работающая игра в Telegram и выпущенная монета
// в TON. Обещаний про обмен и вывод тут нет — они ещё не включены.
const ОПИСАНИЕ =
  "COFFEE DOFFA — кофейня из Карачаево-Черкесии со своей игровой экономикой: боковой файтинг DOFFA DRAKA прямо в Telegram, одиннадцать бойцов и десять арен, зёрна за игру и монета DOFF в сети TON. Честный, прозрачный, халяльный по духу проект.";
const КОРОТКО =
  "Дерись в DOFFA DRAKA прямо в Telegram, копи зёрна и получай DOFF в сети TON. Since 2021.";

export const metadata: Metadata = {
  title: "DOFFA — Espresso Bar × DOFFA DRAKA · TON",
  description: ОПИСАНИЕ,
  metadataBase: new URL("https://doffa.coffee"),
  openGraph: {
    title: "DOFFA — Espresso Bar × DOFFA DRAKA",
    description: КОРОТКО,
    type: "website",
    locale: "ru_RU",
    siteName: "DOFFA",
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "DOFFA Espresso Bar × DOFFA DRAKA" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "DOFFA — Espresso Bar × DOFFA DRAKA",
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
