// Аватар без загрузки файлов: цветной круг + инициал, оба детерминированы
// адресом кошелька — без API, без модерации, нельзя подменить чужой аватар.
const PALETTE: [string, string][] = [
  ["#d4af37", "#b87333"],
  ["#0f766e", "#134e4a"],
  ["#b87333", "#7c2d12"],
  ["#eab308", "#b45309"],
  ["#0d9488", "#d4af37"],
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function Identicon({ seed, label, size = 48 }: { seed: string; label?: string; size?: number }) {
  const h = hashString(seed);
  const [c1, c2] = PALETTE[h % PALETTE.length];
  const initial = (label?.trim()?.[0] ?? seed[0] ?? "?").toUpperCase();
  const gradId = `ident-${h}`;
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className="rounded-full" aria-hidden>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={c1} />
          <stop offset="100%" stopColor={c2} />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="24" fill={`url(#${gradId})`} />
      <text x="24" y="31" textAnchor="middle" fontSize="20" fontWeight="700" fill="#fffaf0">
        {initial}
      </text>
    </svg>
  );
}
