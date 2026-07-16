/**
 * Board geometry — pure atoms + medium helpers.
 *
 * Layers:
 *   kinds / cells / footprint / stack / active-land / collision — pure
 *   placement / grid-write / sprite-primary — medium
 *
 * Gravity, cantilever, active piece fall, collision, and items MUST call
 * these — do not re-derive anchor / footprint / land-Y rules locally.
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

export type { RoundMethod } from "./sprite-primary";
export { primaryFromSprite, placeSpritePrimary } from "./sprite-primary";

export {
  anchorPixelX,
  anchorPixelY,
  placeSpriteAtAnchor,
} from "./placement";

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
