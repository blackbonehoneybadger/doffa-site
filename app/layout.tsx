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
  title: "DOFFA — Espresso Bar × Web3 · Solana",
  description:
    "COFFEE DOFFA — кофейня из Карачаево-Черкесии. Каждая проданная чашка сжигает один токен $DOFFA. Честный, прозрачный, халяльный проект.",
  metadataBase: new URL("https://doffa.coffee"),
  openGraph: {
    title: "DOFFA — Espresso Bar × Web3",
    description:
      "Каждая проданная чашка сжигает один токен $DOFFA. Since 2021.",
    type: "website",
    locale: "ru_RU",
    siteName: "DOFFA",
    images: [{ url: "/og.jpg", width: 1200, height: 630, alt: "DOFFA Espresso Bar" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "DOFFA — Espresso Bar × Web3",
    description: "Каждая проданная чашка сжигает один токен $DOFFA. Since 2021.",
    images: ["/og.jpg"],
  },
};

export const viewport: Viewport = {
  themeColor: "#14100e",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
      className={`${display.variable} ${sans.variable} h-full antialiased`}
    >
      <body className="grain min-h-full flex flex-col">{children}</body>
    </html>
  );
}
