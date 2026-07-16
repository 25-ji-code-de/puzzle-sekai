/**
 * Board geometry — pure atoms + medium helpers.
 *
 * Layers:
 *   kinds / cells / footprint  — pure, no PIXI, no global grid
 *   placement / grid-write     — medium (placement touches sprites; grid-write
 *                                takes an explicit BoardGrid)
 *
 * Gravity (core) and cantilever (physics) MUST call these — do not re-derive
 * anchor / footprint rules locally.
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
