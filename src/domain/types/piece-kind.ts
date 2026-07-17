/**
 * Piece geometry kind — SINGLE definition.
 */
import { CHAR, type CharacterName } from "../../characters/ids";

export type PieceKind = "cell2" | "big2x2" | "item" | "shrunk";

export const PIECE_KINDS = ["cell2", "big2x2", "item", "shrunk"] as const;

export const isPieceKind = (v: unknown): v is PieceKind =>
  typeof v === "string" && (PIECE_KINDS as readonly string[]).includes(v);

/** Characters that occupy a 2×2 footprint. */
export type Big2x2Name = typeof CHAR.NeneRobo | typeof CHAR.Mikudayo;

export const isBig2x2Name = (name?: string | null): name is Big2x2Name =>
  name === CHAR.NeneRobo || name === CHAR.Mikudayo;

export const pieceKindFrom = (opts: {
  characterName?: string | null;
  isItem?: boolean;
  isShrunk?: boolean;
}): PieceKind => {
  if (opts.isItem) return "item";
  if (opts.isShrunk) return "shrunk";
  if (isBig2x2Name(opts.characterName)) return "big2x2";
  return "cell2";
};

/** Grid token written for non-item character cells is CharacterName. */
export type { CharacterName };
