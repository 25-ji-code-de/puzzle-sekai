/**
 * Domain pure piece math (no PIXI).
 * Brands Col/Row/Cell/Orientation/PieceKind: domain/types only.
 */
export type {
  PieceKind,
  Big2x2Name,
  Cell,
  ReadonlyCell,
  Orientation,
  Primary,
  LooseCell,
  LoosePrimary,
  Col,
  Row,
  RoundMethod,
  EntityId,
} from "../types";
export {
  PIECE_KINDS,
  isPieceKind,
  isBig2x2Name,
  pieceKindFrom,
  ORIENTATIONS,
  col,
  row,
  cell,
  cellX,
  cellY,
  asCell,
  asLoose,
  cellsEqual,
  asOrientation,
  isOrientation,
  primary,
  asPrimary,
  ROUND_METHODS,
  isRoundMethod,
  rotationToOrientation,
  orientationToRotation,
  createEntityId,
} from "../types";

export {
  cellToXY,
  pickMaxY,
  pickMinY,
  pickMinX,
  pickMaxX,
  bottomCells,
  maxFootprintY,
  translateCells,
} from "./cells";

export {
  footprintFromPrimary,
  anchorFromFootprint,
  orientFromFootprint,
} from "./footprint";

export {
  columnsForPiece,
  stackHeightBelow,
  stackHeightForPrimary,
} from "./stack";

export {
  activeLandPixelY,
  activeDropPixelY,
  activeLandPrimaryRow,
  primaryToPixel,
  boardOriginY,
  cellCenterX,
  cellCenterY,
  cellTopLeftX,
  cellTopLeftY,
  BOARD_ORIGIN_X,
  BOARD_ORIGIN_Y,
} from "./pixel";

export { footprintCollides, willCollidePrimary } from "./collision";

export type { BoardGrid } from "./grid-write";
export {
  writeFootprint,
  clearFootprint,
  maxDropDistance,
  isUnsupported,
  dropFootprint,
  cloneGrid,
  copyGridInto,
} from "./grid-write";
