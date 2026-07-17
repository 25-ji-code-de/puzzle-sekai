/**
 * Domain type kernel — single source for branded primitives, kinds, occupants, events.
 * Pure types + small helpers; no PIXI / DOM.
 *
 * Rules:
 * - Col / Row / EntityId / Cell / Orientation / PieceKind defined ONLY here.
 * - Prefer brand constructors (col, row, cell, createEntityId) over bare `as`.
 * - Use assertNever on discriminated unions.
 * - App code imports brands from here (not via domain/piece).
 */

export type {
  Col,
  Row,
  Cell,
  ReadonlyCell,
  Orientation,
  Primary,
  LooseCell,
  LoosePrimary,
} from "./cell";
export {
  ORIENTATIONS,
  col,
  row,
  cell,
  cellX,
  cellY,
  asCell,
  cellsEqual,
  asOrientation,
  isOrientation,
  primary,
  asPrimary,
} from "./cell";

export type { PieceKind, Big2x2Name } from "./piece-kind";
export {
  PIECE_KINDS,
  isPieceKind,
  isBig2x2Name,
  pieceKindFrom,
} from "./piece-kind";

export type { RoundMethod } from "./round";
export { ROUND_METHODS, isRoundMethod } from "./round";

export { rotationToOrientation, orientationToRotation } from "./rotation";

export type {
  ItemToken,
  CellToken,
  BoardCell,
  BoardGrid,
  Occupant,
} from "./occupant";
export {
  ITEM_TOKEN,
  isCharacterName,
  isCellToken,
  tokenToOccupant,
  occupantToToken,
  asBoardCell,
} from "./occupant";

export type { EntityId } from "./entity";
export { createEntityId, resetEntityIdSeq } from "./entity";

export type { ClearReason, GameEvent } from "./events";

export { assertNever } from "./assert";
