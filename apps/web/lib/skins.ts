type TableSkinDefinition = {
  label: string;
  backgroundGradientClass: string;
  auraClass: string;
};

type CardSkinDefinition = {
  label: string;
  surfaceClass: string;
  textClass: string;
  placeholderClass: string;
  backClass: string;
  suitRedClass: string;
  suitBlackClass: string;
};

// Neue Table-Skins: Jeder Eintrag braucht exakt diese Pflichtfelder:
// - label
// - backgroundGradientClass
// - auraClass
export const TABLE_SKINS = {
  vault: {
    label: "Vault Classic",
    backgroundGradientClass: "from-zinc-800 via-zinc-950",
    auraClass: "bg-[radial-gradient(circle_at_center,_rgba(20,83,45,0.2)_0%,_transparent_70%)]",
  },
  noir: {
    label: "Noir Steel",
    backgroundGradientClass: "from-zinc-700 via-zinc-900",
    auraClass: "bg-[radial-gradient(circle_at_center,_rgba(63,63,70,0.35)_0%,_transparent_70%)]",
  },
  neon: {
    label: "Neon Grid",
    backgroundGradientClass: "from-cyan-900/70 via-zinc-950",
    auraClass: "bg-[radial-gradient(circle_at_center,_rgba(6,182,212,0.22)_0%,_transparent_70%)]",
  },
} as const satisfies Record<string, TableSkinDefinition>;

// Neue Card-Skins: Jeder Eintrag braucht exakt diese Pflichtfelder:
// - label
// - surfaceClass
// - textClass
// - placeholderClass
// - backClass
// - suitRedClass
// - suitBlackClass
export const CARD_SKINS = {
  classic: {
    label: "Classic",
    surfaceClass: "bg-white",
    textClass: "text-black",
    placeholderClass: "bg-zinc-800 border-2 border-dashed border-zinc-700 scale-95",
    backClass: "bg-zinc-900 border border-zinc-700",
    suitRedClass: "text-red-600",
    suitBlackClass: "text-zinc-900",
  },
  noir: {
    label: "Noir",
    surfaceClass: "bg-zinc-200",
    textClass: "text-zinc-900",
    placeholderClass: "bg-zinc-900 border-2 border-dashed border-zinc-600 scale-95",
    backClass: "bg-zinc-800 border border-zinc-600",
    suitRedClass: "text-red-700",
    suitBlackClass: "text-zinc-900",
  },
  neon: {
    label: "Neon",
    surfaceClass: "bg-cyan-50 border border-cyan-300/60",
    textClass: "text-cyan-950",
    placeholderClass: "bg-zinc-900 border-2 border-dashed border-cyan-800/80 scale-95",
    backClass: "bg-cyan-950/80 border border-cyan-500/50",
    suitRedClass: "text-fuchsia-600",
    suitBlackClass: "text-cyan-950",
  },
} as const satisfies Record<string, CardSkinDefinition>;

export type TableSkin = keyof typeof TABLE_SKINS;
export type CardSkin = keyof typeof CARD_SKINS;

export const DEFAULT_TABLE_SKIN: TableSkin = "vault";
export const DEFAULT_CARD_SKIN: CardSkin = "classic";

export function isTableSkin(value: string): value is TableSkin {
  return value in TABLE_SKINS;
}

export function isCardSkin(value: string): value is CardSkin {
  return value in CARD_SKINS;
}
