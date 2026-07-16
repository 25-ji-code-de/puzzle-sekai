// Entertainment / fun-mode definitions (no gameplay logic here)
// Display strings (name / subtitle / description) live in i18n: fun.<id>.*

export const FUN_MODE_IDS = [
  "mikudayo",
  "kanadeSlow",
  "wonderBlast",
  "shizukuSwap",
  "itemAllergy",
  "mizukiShift",
  "emuShrink",
  /** Simplified tip physics: one-sided support → tip toward hang → fall */
  "cantilever",
  /** Full rigid-body physics (placeholder — not implemented yet) */
  "truePhysics",
] as const;

/** Physics sub-modes are mutually exclusive. */
export const PHYSICS_FUN_MODE_IDS = ["cantilever", "truePhysics"] as const;
export type PhysicsFunModeId = (typeof PHYSICS_FUN_MODE_IDS)[number];

export type FunModeId = (typeof FUN_MODE_IDS)[number];

export type FunModeFlags = Record<FunModeId, boolean>;

export type FunModeDef = {
  id: FunModeId;
  /**
   * Score factor when enabled.
   * - Harder modes: >1
   * - Easier modes: <1
   * If itemLinked, this is the factor at the baseline 10% item rate and is
   * scaled with the actual item drop rate (see getFunModeMultiplier).
   */
  scoreFactor: number;
  /**
   * Mode depends on items (carrot / fries). Factor is scaled so that
   * more items → effect triggers more → easier → factor moves toward 1
   * from the hard side, or deeper below 1 from the easy side...
   * For hard item-linked modes (factor>1): higher drop rate → higher factor.
   * For easy item-linked modes (factor<1): higher drop rate → lower factor (more help).
   */
  itemLinked?: boolean;
};

export const DEFAULT_FUN_MODES: FunModeFlags = {
  mikudayo: false,
  kanadeSlow: false,
  wonderBlast: false,
  shizukuSwap: false,
  itemAllergy: false,
  mizukiShift: false,
  emuShrink: false,
  cantilever: false,
  truePhysics: false,
};

export const FUN_MODE_DEFS: FunModeDef[] = [
  { id: "mikudayo", scoreFactor: 0.85 },
  { id: "kanadeSlow", scoreFactor: 0.9 },
  { id: "wonderBlast", scoreFactor: 0.8 },
  { id: "shizukuSwap", scoreFactor: 1.15 },
  { id: "itemAllergy", scoreFactor: 1.1, itemLinked: true },
  { id: "mizukiShift", scoreFactor: 1.12, itemLinked: true },
  { id: "emuShrink", scoreFactor: 1.08 },
  // Physics engines — harder (board becomes less predictable)
  { id: "cantilever", scoreFactor: 1.12 },
  { id: "truePhysics", scoreFactor: 1.2 },
];

export function normalizeFunModes(raw: unknown): FunModeFlags {
  const result = { ...DEFAULT_FUN_MODES };
  if (!raw || typeof raw !== "object") return result;
  const obj = raw as Record<string, unknown>;
  for (const id of FUN_MODE_IDS) {
    if (typeof obj[id] === "boolean") result[id] = obj[id];
  }
  // Physics engines are mutually exclusive — prefer cantilever if both set
  if (result.cantilever && result.truePhysics) {
    result.truePhysics = false;
  }
  return result;
}

export function isEntertainmentMode(flags: FunModeFlags): boolean {
  return FUN_MODE_IDS.some((id) => flags[id]);
}

/**
 * Scale an item-linked mode factor by drop rate (baseline 10% = 1.0).
 * Hard modes (factor > 1): more items → more disruption → higher factor.
 * Easy modes (factor < 1): more items → more help → lower factor.
 * At 0% items the linked effect almost never fires → factor pulled toward 1.
 */
export function scaleItemLinkedFactor(
  baseFactor: number,
  itemDropRatePercent: number,
): number {
  // weight: 0%→0, 10%→1, 30%→1.5 (clamped)
  const weight = Math.min(1.5, Math.max(0, itemDropRatePercent / 10));
  // Interpolate between 1 (no effect) and baseFactor (full effect at 10%+)
  // weight 0 → 1, weight 1 → baseFactor, weight 1.5 → slightly beyond base
  return 1 + (baseFactor - 1) * weight;
}

/** Product of enabled factors, clamped. itemDropRatePercent scales item-linked modes. */
export function getFunModeMultiplier(
  flags: FunModeFlags,
  itemDropRatePercent: number = 10,
): number {
  let product = 1;
  for (const def of FUN_MODE_DEFS) {
    if (!flags[def.id]) continue;
    const factor = def.itemLinked
      ? scaleItemLinkedFactor(def.scoreFactor, itemDropRatePercent)
      : def.scoreFactor;
    product *= factor;
  }
  return Math.min(1.6, Math.max(0.45, product));
}
