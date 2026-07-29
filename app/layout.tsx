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

export const metadata: Metadata = {
  title: "DOFFA — Espresso Bar × DOFFA Games · Solana",
  description:
    "COFFEE DOFFA — кофейня из Карачаево-Черкесии со своей игровой экономикой DOFFA Games: тапай и копи зёрна, проходи главы в DOFFA Heroes и забирай подтверждённые награды $DOFFA на Solana. Честный, прозрачный, халяльный проект.",
  metadataBase: new URL("https://doffa.coffee"),
  openGraph: {
    title: "DOFFA — Espresso Bar × DOFFA Games",
    description:
      "Собирай зёрна, входи в DOFFA Heroes и забирай награды $DOFFA на Solana. Since 2021.",
    type: "website",
    locale: "ru_RU",
    siteName: "DOFFA",
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "DOFFA Espresso Bar × DOFFA Games" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "DOFFA — Espresso Bar × DOFFA Games",
    description: "Собирай зёрна, входи в DOFFA Heroes и забирай награды $DOFFA на Solana. Since 2021.",
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
