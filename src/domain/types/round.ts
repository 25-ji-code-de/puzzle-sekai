/**
 * Rounding mode when mapping sprite pixels → primary cell.
 */
export type RoundMethod = "floor" | "ceil" | "round";

export const ROUND_METHODS = ["floor", "ceil", "round"] as const;

export const isRoundMethod = (v: unknown): v is RoundMethod =>
  typeof v === "string" && (ROUND_METHODS as readonly string[]).includes(v);
