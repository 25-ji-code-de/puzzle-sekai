/**
 * Domain pure piece math (no PIXI).
 * Brands (Cell / Orientation / PieceKind / …) live in domain/types — import there.
 */
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
  maxOccupiedHeight,
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
  createEmptyBoardGrid,
  writeFootprint,
  clearFootprint,
  maxDropDistance,
  isUnsupported,
  dropFootprint,
  cloneGrid,
  copyGridInto,
} from "./grid-write";
