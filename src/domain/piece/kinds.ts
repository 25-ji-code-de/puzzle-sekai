/**
 * Piece kind — re-export only; definition lives in domain/types/piece-kind.
 */
export type { PieceKind, Big2x2Name } from "../types/piece-kind";
export {
  PIECE_KINDS,
  isPieceKind,
  isBig2x2Name,
  pieceKindFrom,
} from "../types/piece-kind";
