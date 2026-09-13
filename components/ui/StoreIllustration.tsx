export function StoreIllustration() {
  return (
    <svg
      viewBox="0 0 320 240"
      className="mx-auto h-auto w-full max-w-[280px]"
      role="img"
      aria-label="PazarBuy mağaza illüstrasyonu"
    >
      <defs>
        <linearGradient id="storeRoof" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ff8a3d" />
          <stop offset="100%" stopColor="#ff6a12" />
        </linearGradient>
      </defs>

      {/* ground shadow */}
      <ellipse cx="160" cy="222" rx="120" ry="10" fill="#050710" opacity="0.25" />

      {/* boxes */}
      <rect x="34" y="150" width="46" height="46" rx="4" fill="#f2b789" />
      <rect x="34" y="150" width="46" height="14" rx="4" fill="#e59a5f" />
      <rect x="240" y="140" width="52" height="56" rx="4" fill="#ffcfa0" />
      <rect x="240" y="140" width="52" height="14" rx="4" fill="#f2b789" />

      {/* store body */}
      <rect x="76" y="118" width="168" height="98" rx="6" fill="#0d111d" />
      <rect x="94" y="140" width="52" height="76" rx="3" fill="#141a2b" />
      <rect x="176" y="140" width="52" height="76" rx="3" fill="#141a2b" />
      <rect x="94" y="140" width="52" height="76" rx="3" fill="none" stroke="#2b3350" strokeWidth="2" />
      <rect x="176" y="140" width="52" height="76" rx="3" fill="none" stroke="#2b3350" strokeWidth="2" />

      {/* awning */}
      <path d="M64 118 L256 118 L244 92 L76 92 Z" fill="url(#storeRoof)" />
      {Array.from({ length: 7 }).map((_, i) => (
        <path
          key={i}
          d={`M${76 + i * 25.7} 92 L${64 + i * 27.4} 118 L${64 + (i + 1) * 27.4} 118 L${76 + (i + 1) * 25.7} 92 Z`}
          fill={i % 2 === 0 ? "#fff5ec" : "transparent"}
          opacity="0.9"
        />
      ))}

      {/* sign */}
      <rect x="118" y="60" width="84" height="28" rx="8" fill="#ffffff" />
      <text
        x="160"
        y="79"
        textAnchor="middle"
        fontSize="13"
        fontWeight="700"
        fill="#ff6a12"
        fontFamily="inherit"
      >
        PazarBuy
      </text>
    </svg>
  );
}
