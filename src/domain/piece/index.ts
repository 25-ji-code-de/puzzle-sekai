/**
 * Domain piece math facade — pure only (no PIXI).
 * Imports individual pure geometry modules (not the geometry barrel) to
 * avoid pulling placement → coords → board-state into domain init.
 */

export type { PieceKind } from "../../board/geometry/kinds";
export { isBig2x2Name, pieceKindFrom } from "../../board/geometry/kinds";

export type { Cell } from "../../board/geometry/cells";
export {
  cellToXY,
  pickMaxY,
  pickMinY,
  pickMinX,
  pickMaxX,
  bottomCells,
  maxFootprintY,
  translateCells,
} from "../../board/geometry/cells";

export type { Orientation } from "../../board/geometry/footprint";
export {
  asOrientation,
  footprintFromPrimary,
  anchorFromFootprint,
  orientFromFootprint,
} from "../../board/geometry/footprint";

export {
  columnsForPiece,
  stackHeightBelow,
  stackHeightForPrimary,
} from "../../board/geometry/stack";

export {
  activeLandPixelY,
  activeDropPixelY,
} from "../../board/geometry/active-land";

export {
  footprintCollides,
  willCollidePrimary,
} from "../../board/geometry/collision";

export type { BoardGrid } from "../../board/geometry/grid-write";
export {
  writeFootprint,
  clearFootprint,
  maxDropDistance,
  isUnsupported,
  dropFootprint,
  cloneGrid,
  copyGridInto,
} from "../../board/geometry/grid-write";
