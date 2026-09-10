import type { AvatarConfig } from "../lib/types";

/**
 * Avatar 2D original do HabitUP, desenhado em SVG em camadas.
 * Assets 100% próprios, criados para este projeto.
 */

export const SKIN_TONES: Record<string, string> = {
  skin_light: "#f6c79e",
  skin_tan: "#e6a76c",
  skin_brown: "#b57844",
  skin_deep: "#83532e",
};

const HAIR_COLOR = "#33241a";
const EYE_COLOR = "#2b1c12";
const SHOE_COLOR = "#3f2d20";

const BG_DEFAULT = {
  from: "#17153a",
  to: "#3b2a6e",
};

const BG_LEVEL10 = {
  from: "#3f0d12",
  to: "#a1352f",
};

function Head({
  skin,
  hair,
  hairCur,
  headwear,
  accessory,
}: {
  skin: string;
  hair: string;
  hairCur?: string;
  headwear: string | null;
  accessory: string | null;
}) {
  return (
    <g id="head">
      {/* fundo do cabelo (atrás da cabeça) */}
      <path
        d="M64 92 A36 36 0 0 1 136 92 Z"
        fill={hair}
      />
      {/* orelhas */}
      <circle cx="62" cy="94" r="7" fill={skin} />
      <circle cx="138" cy="94" r="7" fill={skin} />
      {/* rosto */}
      <circle cx="100" cy="96" r="36" fill={skin} />
      {/* olhos */}
      <circle cx="87" cy="92" r="4" fill={EYE_COLOR} />
      <circle cx="113" cy="92" r="4" fill={EYE_COLOR} />
      <circle cx="88.5" cy="90.5" r="1.3" fill="#fff" />
      <circle cx="114.5" cy="90.5" r="1.3" fill="#fff" />
      {/* bochechas */}
      <circle cx="78" cy="102" r="4" fill="#ff9a9e" opacity="0.55" />
      <circle cx="122" cy="102" r="4" fill="#ff9a9e" opacity="0.55" />
      {/* sorriso */}
      <path d="M89 106 Q100 116 111 106" fill="none" stroke={EYE_COLOR} strokeWidth="2.5" strokeLinecap="round" />
      {/* cabelo (frente) */}
      <HairFront hair={hair} hairCur={hairCur} />
      {/* chapéus */}
      {headwear === "cap_10" && <Cap />}
      {/* acessórios */}
      {accessory === "headband_streak3" && <Headband />}
      {accessory === "headphones_50" && <Headphones />}
    </g>
  );
}

function HairFront({ hair, hairCur }: { hair: string; hairCur?: string }) {
  return (
    <g id="hair-front">
      <path
        d="M66 92 Q60 60 100 58 Q140 60 134 92 Q128 70 116 68 Q104 66 100 72 Q90 72 82 80 Z"
        fill={hair}
      />
      {(hair === "mohawk" || hair === "hair_mohawk") && (
        <path
          d="M94 30 L92 96 L98 104 L104 96 L102 34 Q96 26 94 30 Z"
          fill={hairCur ?? hair}
        />
      )}
    </g>
  );
}

function Cap() {
  return (
    <g id="cap">
      <path
        d="M68 84 Q68 56 100 56 Q132 56 132 84 Q120 82 100 82 Q80 82 68 84 Z"
        fill="#1d4ed8"
      />
      <path d="M64 84 Q100 74 136 84 Q100 92 64 84 Z" fill="#1e40af" />
      <circle cx="100" cy="57" r="3.5" fill="#facc15" />
      <path d="M118 76 l4 -5 l4 5 z" fill="#facc15" />
    </g>
  );
}

function Headband() {
  return (
    <g id="headband">
      <path
        d="M63 84 Q100 66 137 84"
        fill="none"
        stroke="#ef4444"
        strokeWidth="9"
        strokeLinecap="round"
      />
      <rect x="130" y="78" width="10" height="20" rx="4" fill="#dc2626" transform="rotate(20 130 78)" />
      <path d="M133 96 l7 16 5 -2 -4 -14 z" fill="#b91c1c" />
    </g>
  );
}

function Headphones() {
  return (
    <g id="headphones">
      <path
        d="M62 92 Q62 60 100 60 Q138 60 138 92"
        fill="none"
        stroke="#334155"
        strokeWidth="9"
        strokeLinecap="round"
      />
      <rect x="53" y="88" width="17" height="26" rx="8" fill="#f43f5e" />
      <rect x="130" y="88" width="17" height="26" rx="8" fill="#f43f5e" />
      <rect x="57" y="108" width="10" height="7" rx="3" fill="#be123c" />
      <rect x="134" y="108" width="10" height="7" rx="3" fill="#be123c" />
    </g>
  );
}

function Top({ id }: { id: string }) {
  switch (id) {
    case "shirt_first_step":
      return (
        <g id="top-firststep">
          <rect x="58" y="130" width="16" height="18" rx="6" fill="#16a34a" />
          <rect x="126" y="130" width="16" height="18" rx="6" fill="#16a34a" />
          <rect x="74" y="128" width="52" height="60" rx="18" fill="#22c55e" />
          <circle cx="100" cy="152" r="10" fill="#fff" />
          <path d="M96 152 h8 M100 148 v8" stroke="#166534" strokeWidth="2.5" strokeLinecap="round" />
        </g>
      );
    case "jacket_streak7":
      return (
        <g id="top-jacket">
          <rect x="56" y="130" width="18" height="18" rx="7" fill="#1e3a8a" />
          <rect x="126" y="130" width="18" height="18" rx="7" fill="#1e3a8a" />
          <rect x="72" y="126" width="56" height="62" rx="20" fill="#2563eb" />
          <path d="M100 130 L94 152 L100 186 L106 152 Z" fill="#1e3a8a" />
          <path d="M84 130 L100 140 L116 130 L110 124 L90 124 Z" fill="#60a5fa" />
          <rect x="78" y="148" width="10" height="14" rx="3" fill="#dbeafe" />
          <rect x="112" y="148" width="10" height="14" rx="3" fill="#dbeafe" />
        </g>
      );
    case "outfit_level5":
      return (
        <g id="top-level5">
          <rect x="56" y="128" width="18" height="20" rx="7" fill="#6d28d9" />
          <rect x="126" y="128" width="18" height="20" rx="7" fill="#6d28d9" />
          <rect x="72" y="124" width="56" height="64" rx="20" fill="#7c3aed" />
          <path d="M88 132 L100 152 L112 132 L106 126 L94 126 Z" fill="#facc15" />
          <path d="M100 154 L90 172 L100 188 L110 172 Z" fill="#a78bfa" />
          <circle cx="100" cy="146" r="6" fill="#facc15" />
          <path d="M94 168 h12 M100 162 v12" stroke="#facc15" strokeWidth="2" />
        </g>
      );
    default:
      return (
        <g id="top-default">
          <rect x="58" y="132" width="16" height="16" rx="6" fill="#e5e7eb" />
          <rect x="126" y="132" width="16" height="16" rx="6" fill="#e5e7eb" />
          <rect x="74" y="130" width="52" height="58" rx="18" fill="#f3f4f6" />
          <path d="M94 130 L100 142 L106 130 L112 130 L100 150 L88 130 Z" fill="#d1d5db" transform="translate(0 12)" />
        </g>
      );
  }
}

function Body({ skin, topId }: { skin: string; topId: string }) {
  return (
    <g id="body">
      {/* pernas */}
      <rect x="84" y="182" width="14" height="26" rx="6" fill={skin} />
      <rect x="102" y="182" width="14" height="26" rx="6" fill={skin} />
      {/* sapatos */}
      <rect x="79" y="206" width="24" height="11" rx="5" fill={SHOE_COLOR} />
      <rect x="97" y="206" width="24" height="11" rx="5" fill={SHOE_COLOR} />
      {/* braços */}
      <rect x="62" y="128" width="10" height="36" rx="5" fill={skin} />
      <rect x="128" y="128" width="10" height="36" rx="5" fill={skin} />
      {/* pescoço */}
      <rect x="94" y="128" width="12" height="8" fill={skin} />
      {/* torso */}
      <rect x="76" y="126" width="48" height="58" rx="16" fill={skin} />
      {/* roupa */}
      <Top id={topId} />
    </g>
  );
}

function Background({ id }: { id: string | null }) {
  const idn = id ?? "bg_default";
  if (idn === "bg_level10") {
    return (
      <g id="bg-level10" clipPath="url(#avatarClip)">
        <rect x="0" y="0" width="200" height="240" fill={`url(#avatarGrad_${idn})`} />
        <circle cx="150" cy="46" r="30" fill="#fbbf24" opacity="0.85" />
        <path d="M0 190 Q50 150 100 185 Q150 210 200 175 L200 240 L0 240 Z" fill="#2d0a33" />
        <path d="M0 205 Q80 170 200 205 L200 240 L0 240 Z" fill="#170724" />
        <circle cx="40" cy="70" r="6" fill="#f9a8d4" opacity="0.8" />
        <circle cx="120" cy="130" r="8" fill="#fdba74" opacity="0.7" />
        <circle cx="70" cy="160" r="5" fill="#a5f3fc" opacity="0.6" />
      </g>
    );
  }
  return (
    <g id="bg-default" clipPath="url(#avatarClip)">
      <rect x="0" y="0" width="200" height="240" fill={`url(#avatarGrad_${idn})`} />
      <circle cx="40" cy="40" r="2.5" fill="#c4b5fd" opacity="0.7" />
      <circle cx="150" cy="60" r="2" fill="#c4b5fd" opacity="0.5" />
      <circle cx="90" cy="150" r="2" fill="#c4b5fd" opacity="0.6" />
      <circle cx="60" cy="115" r="1.6" fill="#c4b5fd" opacity="0.5" />
      <circle cx="165" cy="150" r="2.2" fill="#c4b5fd" opacity="0.6" />
    </g>
  );
}

function Effect({ id }: { id: string | null }) {
  if (id !== "aura_30") return null;
  return (
    <g id="effect-aura" clipPath="url(#avatarClip)">
      <ellipse cx="100" cy="120" rx="92" ry="100" fill="url(#avatarGlow)" className="aura-pulse" />
      <circle cx="60" cy="70" r="4" fill="#fde047" className="sparkle" />
      <circle cx="152" cy="120" r="3" fill="#fde047" className="sparkle" />
      <path d="M30 120 l3 6 6 3 -6 3 -3 6 -3 -6 -6 -3 6 -3 z" fill="#fde047" opacity="0.8" className="sparkle" />
    </g>
  );
}

export function AvatarPreview({
  config,
  width,
  className,
}: {
  config: AvatarConfig;
  width?: number | string;
  className?: string;
}) {
  const skin = SKIN_TONES[config.skin] ?? SKIN_TONES.skin_light;
  const hair = config.hair;
  return (
    <svg
      viewBox="0 0 200 240"
      width={width}
      className={className}
      role="img"
      aria-label="Seu personagem"
    >
      <defs>
        <clipPath id={`avatarClip`}>
          <rect x="0" y="0" width="200" height="240" rx="22" />
        </clipPath>
        <linearGradient id="avatarGrad_bg_default" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={BG_DEFAULT.from} />
          <stop offset="100%" stopColor={BG_DEFAULT.to} />
        </linearGradient>
        <linearGradient id="avatarGrad_bg_level10" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={BG_LEVEL10.from} />
          <stop offset="100%" stopColor={BG_LEVEL10.to} />
        </linearGradient>
        <radialGradient id="avatarGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fde047" stopOpacity="0.55" />
          <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
        </radialGradient>
      </defs>

      <Background id={config.background} />
      <Effect id={config.effect} />
      <g className="avatar-float">
        <Body skin={skin} topId={config.top} />
        <Head
          skin={skin}
          hair={hair === "short" || hair === "hair_short" ? HAIR_COLOR : "#7c3aed"}
          hairCur={hair === "mohawk" || hair === "hair_mohawk" ? "#22d3ee" : undefined}
          headwear={config.headwear}
          accessory={config.accessory}
        />
      </g>
    </svg>
  );
}