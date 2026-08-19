// Только для offline/CI-проверки `next build`. Production/Vercel продолжает
// скачивать настоящие Google Fonts и встраивать их через next/font.
module.exports = new Proxy(Object.create(null), {
  get(_target, property) {
    const url = decodeURIComponent(String(property));
    const family = url.includes("Manrope") ? "Manrope" : "Unbounded";
    return `@font-face { font-family: '${family}'; font-style: normal; font-weight: 100 900; src: url(mock-${family}.woff2) format('woff2'); }`;
  },
});
