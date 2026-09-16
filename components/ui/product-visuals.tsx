import type { ReactElement, ComponentType } from "react";
import type { ProductVisualKey } from "@/types";

/**
 * Ürün fotoğrafı yerine kullanılan, elle tasarlanmış premium SVG
 * illüstrasyonlar. Gerçek marka logoları/telifli görseller kullanılmaz;
 * bunun yerine her ürün tipi için jenerik ama "gerçekçi" hissettiren,
 * gradyanlı/gölgeli bir illüstrasyon üretilir.
 */

function GroundShadow({ cx = 120, cy = 208, rx = 62, ry = 10 }: { cx?: number; cy?: number; rx?: number; ry?: number }) {
  return <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="#0d111d" opacity="0.14" />;
}

function GamingPcVisual() {
  return (
    <svg viewBox="0 0 240 220" className="h-full w-full" role="img" aria-label="Oyuncu bilgisayarı illüstrasyonu">
      <defs>
        <linearGradient id="pc-case" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#232a3d" />
          <stop offset="100%" stopColor="#0e1220" />
        </linearGradient>
        <linearGradient id="pc-glass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2c3550" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#12162a" stopOpacity="0.95" />
        </linearGradient>
        <radialGradient id="pc-fan" cx="50%" cy="50%" r="55%">
          <stop offset="0%" stopColor="#b98cff" />
          <stop offset="55%" stopColor="#7c3aed" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="pc-fan-blue" cx="50%" cy="50%" r="55%">
          <stop offset="0%" stopColor="#7fd9ff" />
          <stop offset="55%" stopColor="#3fa9ff" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#3fa9ff" stopOpacity="0" />
        </radialGradient>
      </defs>

      <GroundShadow />

      <rect x="66" y="26" width="108" height="176" rx="14" fill="url(#pc-case)" />
      <rect x="66" y="26" width="108" height="176" rx="14" fill="none" stroke="#333c56" strokeWidth="1.5" />

      {/* tempered glass side panel */}
      <rect x="80" y="40" width="80" height="148" rx="8" fill="url(#pc-glass)" stroke="#3a4463" strokeWidth="1" />

      {/* fans */}
      <circle cx="120" cy="86" r="24" fill="url(#pc-fan-blue)" />
      <circle cx="120" cy="86" r="24" fill="none" stroke="#4b5678" strokeWidth="1.5" />
      <circle cx="120" cy="150" r="24" fill="url(#pc-fan)" />
      <circle cx="120" cy="150" r="24" fill="none" stroke="#4b5678" strokeWidth="1.5" />

      {/* top vents */}
      {Array.from({ length: 5 }).map((_, i) => (
        <rect key={i} x={82 + i * 8} y="14" width="4" height="10" rx="2" fill="#3a4463" />
      ))}

      {/* front io */}
      <rect x="72" y="36" width="10" height="3" rx="1.5" fill="#5a6690" />
      <rect x="72" y="42" width="14" height="3" rx="1.5" fill="#5a6690" />

      {/* feet */}
      <rect x="72" y="200" width="14" height="6" rx="2" fill="#12162a" />
      <rect x="154" y="200" width="14" height="6" rx="2" fill="#12162a" />

      {/* glossy edge highlight */}
      <rect x="68" y="28" width="4" height="172" rx="2" fill="#ffffff" opacity="0.06" />
    </svg>
  );
}

function PhoneVisual() {
  return (
    <svg viewBox="0 0 240 220" className="h-full w-full" role="img" aria-label="Akıllı telefon illüstrasyonu">
      <defs>
        <linearGradient id="phone-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e7e9ee" />
          <stop offset="100%" stopColor="#b9bfcc" />
        </linearGradient>
        <linearGradient id="phone-screen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2b3350" />
          <stop offset="45%" stopColor="#4b5678" />
          <stop offset="100%" stopColor="#131828" />
        </linearGradient>
      </defs>

      <GroundShadow cx={120} cy={210} rx={40} ry={8} />

      <rect x="86" y="10" width="68" height="196" rx="20" fill="url(#phone-body)" />
      <rect x="89" y="13" width="62" height="190" rx="17" fill="url(#phone-screen)" />

      {/* dynamic island */}
      <rect x="108" y="22" width="24" height="7" rx="3.5" fill="#0a0e17" opacity="0.85" />

      {/* subtle app grid suggestion */}
      {Array.from({ length: 3 }).map((_, row) =>
        Array.from({ length: 3 }).map((_, col) => (
          <rect
            key={`${row}-${col}`}
            x={98 + col * 16}
            y={44 + row * 16}
            width="11"
            height="11"
            rx="3.5"
            fill="#ffffff"
            opacity={0.14 + ((row + col) % 3) * 0.06}
          />
        ))
      )}

      {/* home indicator */}
      <rect x="108" y="192" width="24" height="3" rx="1.5" fill="#ffffff" opacity="0.35" />

      {/* side buttons */}
      <rect x="83" y="60" width="3" height="16" rx="1.5" fill="#9aa1b5" />
      <rect x="83" y="84" width="3" height="16" rx="1.5" fill="#9aa1b5" />
      <rect x="154" y="70" width="3" height="24" rx="1.5" fill="#9aa1b5" />

      {/* glossy highlight */}
      <rect x="90" y="14" width="6" height="188" rx="3" fill="#ffffff" opacity="0.25" />
    </svg>
  );
}

function HeadphonesVisual() {
  return (
    <svg viewBox="0 0 240 220" className="h-full w-full" role="img" aria-label="Kablosuz kulaklık illüstrasyonu">
      <defs>
        <linearGradient id="hp-band" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3a4157" />
          <stop offset="100%" stopColor="#1c2233" />
        </linearGradient>
        <radialGradient id="hp-cup" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#4a5268" />
          <stop offset="55%" stopColor="#262c3e" />
          <stop offset="100%" stopColor="#12151f" />
        </radialGradient>
      </defs>

      <GroundShadow cx={120} cy={200} rx={55} ry={9} />

      <path
        d="M62 130 C62 74 92 40 120 40 C148 40 178 74 178 130"
        fill="none"
        stroke="url(#hp-band)"
        strokeWidth="12"
        strokeLinecap="round"
      />

      <g>
        <ellipse cx="62" cy="150" rx="26" ry="34" fill="url(#hp-cup)" />
        <ellipse cx="62" cy="150" rx="17" ry="24" fill="#0d111d" opacity="0.55" />
        <ellipse cx="55" cy="138" rx="6" ry="9" fill="#ffffff" opacity="0.12" />
      </g>
      <g>
        <ellipse cx="178" cy="150" rx="26" ry="34" fill="url(#hp-cup)" />
        <ellipse cx="178" cy="150" rx="17" ry="24" fill="#0d111d" opacity="0.55" />
        <ellipse cx="171" cy="138" rx="6" ry="9" fill="#ffffff" opacity="0.12" />
      </g>

      {/* brand accent dots */}
      <circle cx="62" cy="150" r="4" fill="#7c3aed" />
      <circle cx="178" cy="150" r="4" fill="#7c3aed" />
    </svg>
  );
}

function SneakerVisual() {
  return (
    <svg viewBox="0 0 240 220" className="h-full w-full" role="img" aria-label="Spor ayakkabı illüstrasyonu">
      <defs>
        <linearGradient id="sneaker-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e7e9ee" />
        </linearGradient>
        <linearGradient id="sneaker-sole" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#ffcfa0" />
        </linearGradient>
      </defs>

      <GroundShadow cx={126} cy={176} rx={72} ry={10} />

      {/* sole */}
      <path
        d="M40 158 C40 148 52 146 66 146 L182 146 C196 146 206 152 206 162 C206 170 196 174 182 174 L58 174 C46 174 40 168 40 158 Z"
        fill="url(#sneaker-sole)"
        stroke="#f2b789"
        strokeWidth="1.5"
      />

      {/* upper body */}
      <path
        d="M52 146 C50 118 66 96 96 90 C118 86 150 90 168 104 C182 114 192 128 196 144 C168 150 100 150 52 146 Z"
        fill="url(#sneaker-body)"
        stroke="#cfd4de"
        strokeWidth="1.5"
      />

      {/* diagonal side panel (generic, not a real logo) */}
      <path
        d="M88 138 C104 118 128 108 156 112 C142 128 122 138 96 142 Z"
        fill="#7c3aed"
        opacity="0.9"
      />

      {/* laces */}
      {Array.from({ length: 4 }).map((_, i) => (
        <line
          key={i}
          x1={104 + i * 12}
          y1={100 + i * 2}
          x2={92 + i * 12}
          y2={112 + i * 2}
          stroke="#aab3cf"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      ))}

      {/* heel tab */}
      <path d="M168 104 C182 100 196 104 200 116 C196 126 186 130 176 128 Z" fill="#131828" />
    </svg>
  );
}

function VacuumVisual() {
  return (
    <svg viewBox="0 0 240 220" className="h-full w-full" role="img" aria-label="Robot süpürge illüstrasyonu">
      <defs>
        <radialGradient id="vac-body" cx="38%" cy="32%" r="75%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="55%" stopColor="#e4e7ee" />
          <stop offset="100%" stopColor="#c4c9d6" />
        </radialGradient>
      </defs>

      <GroundShadow cx={120} cy={188} rx={66} ry={11} />

      <ellipse cx="120" cy="150" rx="76" ry="76" fill="url(#vac-body)" />
      <ellipse cx="120" cy="150" rx="76" ry="76" fill="none" stroke="#d3d7e0" strokeWidth="1.5" />

      {/* inner ring detail */}
      <circle cx="120" cy="150" r="60" fill="none" stroke="#d3d7e0" strokeWidth="1" opacity="0.7" />

      {/* sensor turret */}
      <circle cx="120" cy="120" r="16" fill="#131828" />
      <circle cx="120" cy="120" r="7" fill="#3fa9ff" opacity="0.85" />
      <circle cx="116" cy="116" r="2.4" fill="#ffffff" opacity="0.8" />

      {/* buttons */}
      <circle cx="150" cy="150" r="5" fill="#7c3aed" />
      <circle cx="164" cy="150" r="5" fill="#aab3cf" />

      {/* highlight sheen */}
      <path d="M70 118 C82 100 104 90 120 90 C104 96 88 108 80 126 Z" fill="#ffffff" opacity="0.55" />
    </svg>
  );
}

function WatchVisual() {
  return (
    <svg viewBox="0 0 240 220" className="h-full w-full" role="img" aria-label="Akıllı saat illüstrasyonu">
      <defs>
        <linearGradient id="watch-band" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2b3350" />
          <stop offset="100%" stopColor="#131828" />
        </linearGradient>
        <linearGradient id="watch-case" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e7e9ee" />
          <stop offset="100%" stopColor="#b9bfcc" />
        </linearGradient>
        <linearGradient id="watch-screen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#232c46" />
          <stop offset="100%" stopColor="#0a0e17" />
        </linearGradient>
      </defs>

      <GroundShadow cx={120} cy={206} rx={46} ry={8} />

      {/* bands */}
      <rect x="98" y="14" width="44" height="46" rx="12" fill="url(#watch-band)" />
      <rect x="98" y="160" width="44" height="46" rx="12" fill="url(#watch-band)" />

      {/* case */}
      <rect x="76" y="58" width="88" height="104" rx="26" fill="url(#watch-case)" />
      <rect x="76" y="58" width="88" height="104" rx="26" fill="none" stroke="#aab3cf" strokeWidth="1.5" />

      {/* crown */}
      <rect x="162" y="98" width="10" height="16" rx="3" fill="#c7cbd8" />

      {/* screen */}
      <rect x="88" y="70" width="64" height="80" rx="18" fill="url(#watch-screen)" />
      <circle cx="120" cy="110" r="20" fill="none" stroke="#3fa9ff" strokeWidth="3" opacity="0.8" />
      <path d="M120 98 L120 110 L130 116" stroke="#7fd9ff" strokeWidth="3" strokeLinecap="round" fill="none" />
      <rect x="104" y="128" width="32" height="6" rx="3" fill="#7c3aed" opacity="0.85" />

      {/* highlight */}
      <path d="M92 74 C98 70 108 68 116 68" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" opacity="0.3" fill="none" />
    </svg>
  );
}

function TabletVisual() {
  return (
    <svg viewBox="0 0 240 220" className="h-full w-full" role="img" aria-label="Tablet illüstrasyonu">
      <defs>
        <linearGradient id="tablet-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#eef0f5" />
          <stop offset="100%" stopColor="#c7cbd8" />
        </linearGradient>
        <linearGradient id="tablet-screen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2b3350" />
          <stop offset="50%" stopColor="#3fa9ff" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#131828" />
        </linearGradient>
      </defs>

      <GroundShadow cx={120} cy={196} rx={66} ry={9} />

      <rect x="46" y="26" width="148" height="166" rx="18" fill="url(#tablet-body)" />
      <rect x="58" y="38" width="124" height="142" rx="6" fill="url(#tablet-screen)" />

      {/* front camera */}
      <circle cx="120" cy="31" r="2.4" fill="#8890a8" />

      {/* app grid suggestion */}
      {Array.from({ length: 2 }).map((_, row) =>
        Array.from({ length: 4 }).map((_, col) => (
          <rect
            key={`${row}-${col}`}
            x={70 + col * 26}
            y={54 + row * 30}
            width="16"
            height="16"
            rx="5"
            fill="#ffffff"
            opacity={0.16 + ((row + col) % 3) * 0.06}
          />
        ))
      )}

      <rect x="90" y="150" width="60" height="8" rx="4" fill="#ffffff" opacity="0.18" />

      {/* glossy edge */}
      <rect x="48" y="28" width="6" height="162" rx="3" fill="#ffffff" opacity="0.3" />
    </svg>
  );
}

function LaptopVisual() {
  return (
    <svg viewBox="0 0 240 220" className="h-full w-full" role="img" aria-label="Dizüstü bilgisayar illüstrasyonu">
      <defs>
        <linearGradient id="laptop-screen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2b3350" />
          <stop offset="55%" stopColor="#131828" />
          <stop offset="100%" stopColor="#05070f" />
        </linearGradient>
        <linearGradient id="laptop-base" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e7e9ee" />
          <stop offset="100%" stopColor="#b9bfcc" />
        </linearGradient>
      </defs>

      <GroundShadow cx={120} cy={188} rx={82} ry={10} />

      {/* screen */}
      <rect x="58" y="34" width="124" height="86" rx="8" fill="#c7cbd8" />
      <rect x="64" y="40" width="112" height="74" rx="4" fill="url(#laptop-screen)" />
      <rect x="76" y="52" width="52" height="6" rx="3" fill="#3fa9ff" opacity="0.6" />
      <rect x="76" y="64" width="80" height="5" rx="2.5" fill="#ffffff" opacity="0.14" />
      <rect x="76" y="74" width="64" height="5" rx="2.5" fill="#ffffff" opacity="0.14" />
      <circle cx="150" cy="96" r="10" fill="#7c3aed" opacity="0.85" />

      {/* base */}
      <path d="M40 120 L200 120 L214 148 C216 152 213 156 208 156 L32 156 C27 156 24 152 26 148 Z" fill="url(#laptop-base)" />
      <rect x="104" y="130" width="32" height="4" rx="2" fill="#8890a8" />

      {/* keyboard hint */}
      {Array.from({ length: 8 }).map((_, i) => (
        <rect key={i} x={58 + i * 16} y="140" width="10" height="4" rx="1.5" fill="#8890a8" opacity="0.5" />
      ))}
    </svg>
  );
}

function PerfumeVisual() {
  return (
    <svg viewBox="0 0 240 220" className="h-full w-full" role="img" aria-label="Parfüm şişesi illüstrasyonu">
      <defs>
        <linearGradient id="perfume-glass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fbe3d4" stopOpacity="0.9" />
          <stop offset="55%" stopColor="#ffcfa0" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#f2b789" stopOpacity="0.85" />
        </linearGradient>
        <linearGradient id="perfume-cap" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3a4157" />
          <stop offset="100%" stopColor="#1c2233" />
        </linearGradient>
        <radialGradient id="perfume-liquid" cx="35%" cy="20%" r="90%">
          <stop offset="0%" stopColor="#c9a6ff" />
          <stop offset="100%" stopColor="#7c3aed" />
        </radialGradient>
      </defs>

      <GroundShadow cx={120} cy={200} rx={52} ry={9} />

      {/* cap */}
      <rect x="100" y="18" width="40" height="26" rx="8" fill="url(#perfume-cap)" />
      <rect x="112" y="8" width="16" height="14" rx="4" fill="#4b5678" />

      {/* neck */}
      <rect x="110" y="42" width="20" height="16" fill="#e7e9ee" opacity="0.9" />

      {/* bottle body */}
      <path
        d="M84 58 L156 58 L166 92 C170 104 170 180 158 190 C148 198 92 198 82 190 C70 180 70 104 74 92 Z"
        fill="url(#perfume-glass)"
        stroke="#e3a877"
        strokeWidth="1.5"
      />

      {/* liquid fill */}
      <path
        d="M80 120 C70 150 74 182 82 190 C92 198 148 198 158 190 C166 182 170 150 160 120 Z"
        fill="url(#perfume-liquid)"
        opacity="0.85"
      />

      {/* label */}
      <rect x="94" y="128" width="52" height="30" rx="4" fill="#ffffff" opacity="0.85" />
      <rect x="102" y="136" width="36" height="4" rx="2" fill="#5b21b6" opacity="0.7" />
      <rect x="102" y="146" width="24" height="3" rx="1.5" fill="#5b21b6" opacity="0.45" />

      {/* glossy highlight */}
      <path d="M88 68 C82 90 80 120 84 150" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" opacity="0.45" fill="none" />
    </svg>
  );
}

function AirfryerVisual() {
  return (
    <svg viewBox="0 0 240 220" className="h-full w-full" role="img" aria-label="Airfryer illüstrasyonu">
      <defs>
        <linearGradient id="fryer-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2b3350" />
          <stop offset="55%" stopColor="#1c2233" />
          <stop offset="100%" stopColor="#12162a" />
        </linearGradient>
        <linearGradient id="fryer-basket" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e7e9ee" />
          <stop offset="100%" stopColor="#b9bfcc" />
        </linearGradient>
        <radialGradient id="fryer-dial" cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#b98cff" />
          <stop offset="100%" stopColor="#7c3aed" />
        </radialGradient>
      </defs>

      <GroundShadow cx={120} cy={198} rx={70} ry={10} />

      {/* main body */}
      <path
        d="M54 70 C54 44 82 30 120 30 C158 30 186 44 186 70 L186 168 C186 180 176 188 164 188 L76 188 C64 188 54 180 54 168 Z"
        fill="url(#fryer-body)"
      />

      {/* top vents */}
      {Array.from({ length: 6 }).map((_, i) => (
        <rect key={i} x={92 + i * 10} y="40" width="5" height="10" rx="2.5" fill="#3a4463" />
      ))}

      {/* control panel */}
      <circle cx="120" cy="100" r="22" fill="url(#fryer-dial)" />
      <circle cx="120" cy="100" r="22" fill="none" stroke="#5b21b6" strokeWidth="1.5" opacity="0.6" />
      <rect x="110" y="98" width="20" height="4" rx="2" fill="#ffffff" opacity="0.8" />
      <rect x="90" y="130" width="60" height="6" rx="3" fill="#4b5678" />

      {/* basket drawer */}
      <path
        d="M66 150 L174 150 L168 182 C167 186 163 188 159 188 L81 188 C77 188 73 186 72 182 Z"
        fill="url(#fryer-basket)"
        stroke="#c7cbd8"
        strokeWidth="1.5"
      />
      <rect x="104" y="162" width="32" height="6" rx="3" fill="#8890a8" />

      {/* glossy edge highlight */}
      <path d="M62 74 C62 54 84 40 110 36" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" opacity="0.14" fill="none" />
    </svg>
  );
}

type RealProductVisualKey = Exclude<ProductVisualKey, "generic">;

const productVisuals: Record<RealProductVisualKey, () => ReactElement> = {
  "gaming-pc": GamingPcVisual,
  phone: PhoneVisual,
  headphones: HeadphonesVisual,
  sneaker: SneakerVisual,
  vacuum: VacuumVisual,
  watch: WatchVisual,
  tablet: TabletVisual,
  laptop: LaptopVisual,
  perfume: PerfumeVisual,
  airfryer: AirfryerVisual,
};

export function ProductVisual({ visual, className }: { visual: RealProductVisualKey; className?: string }) {
  const Visual = productVisuals[visual];
  return (
    <div className={className}>
      <Visual />
    </div>
  );
}

const genericToneClasses = {
  brand: { gradient: "from-brand-100 to-brand-50", text: "text-brand-600" },
  navy: { gradient: "from-navy-100 to-navy-50", text: "text-navy-600" },
  violet: { gradient: "from-violet-100 to-violet-50", text: "text-violet-600" },
  emerald: { gradient: "from-emerald-100 to-emerald-50", text: "text-emerald-600" },
  sky: { gradient: "from-sky-100 to-sky-50", text: "text-sky-600" },
  rose: { gradient: "from-rose-100 to-rose-50", text: "text-rose-600" },
  amber: { gradient: "from-amber-100 to-amber-50", text: "text-amber-600" },
} as const;

export type GenericVisualTone = keyof typeof genericToneClasses;

/**
 * Elle çizilmiş özel illüstrasyonu olmayan (mock/kategori) ürünler için jenerik
 * fakat premium hissettiren, gradyanlı blob zemin + ikon kombinasyonu.
 */
export function GenericCategoryVisual({
  icon: Icon,
  tone = "navy",
  className,
}: {
  icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  tone?: GenericVisualTone;
  className?: string;
}) {
  const { gradient, text } = genericToneClasses[tone];

  return (
    <div className={className ? `${className} relative flex items-center justify-center` : "relative flex items-center justify-center"}>
      <div className={`absolute h-[74%] w-[74%] rounded-[38%] bg-gradient-to-br ${gradient} shadow-inner`} aria-hidden />
      <div className="absolute bottom-[9%] h-[9%] w-[52%] rounded-full bg-navy-900/10 blur-md" aria-hidden />
      <Icon size={52} strokeWidth={1.5} className={`relative drop-shadow-sm ${text}`} />
    </div>
  );
}
