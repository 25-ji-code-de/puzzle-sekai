/**
 * Domain pure piece math (no PIXI).
 * Presentation helpers stay in board/geometry (placement / sprite-primary).
 */
export type { PieceKind } from "./kinds";
export { isBig2x2Name, pieceKindFrom } from "./kinds";

export type { Cell } from "./cells";
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

export type { Orientation } from "./footprint";
export {
  asOrientation,
  footprintFromPrimary,
  anchorFromFootprint,
  orientFromFootprint,
} from "./footprint";

export {
  columnsForPiece,
  stackHeightBelow,
  stackHeightForPrimary,
} from "./stack";

export { activeLandPixelY, activeDropPixelY } from "./active-land";

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
