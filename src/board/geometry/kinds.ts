/**
 * Atomic piece-kind classification (pure).
 */

export type PieceKind = "cell2" | "big2x2" | "item" | "shrunk";

export const isBig2x2Name = (name?: string | null): boolean =>
  name === "NeneRobo" || name === "Mikudayo";

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
