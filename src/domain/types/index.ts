/**
 * Domain type kernel — brands, occupants, events.
 * Pure types + tiny helpers; no PIXI / DOM.
 */

export type {
  Col,
  Row,
  Cell,
  Orientation,
  LooseCell,
} from "./cell";
export {
  col,
  row,
  cell,
  cellX,
  cellY,
  asOrientation,
  asCell,
  asLoose,
} from "./cell";

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
