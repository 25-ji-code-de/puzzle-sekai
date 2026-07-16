/**
 * Domain piece math facade.
 *
 * Pure footprint / collision / stack / land-Y atoms currently live under
 * `board/geometry`. This module is the stable domain entry; geometry remains
 * the implementation home until a physical move (optional later).
 */
export type {
  PieceKind,
  Cell,
  Orientation,
  BoardGrid,
  RoundMethod,
} from "../../board/geometry";

export {
  isBig2x2Name,
  pieceKindFrom,
  cellToXY,
  pickMaxY,
  pickMinY,
  pickMinX,
  pickMaxX,
  bottomCells,
  maxFootprintY,
  translateCells,
  asOrientation,
  footprintFromPrimary,
  anchorFromFootprint,
  orientFromFootprint,
  columnsForPiece,
  stackHeightBelow,
  stackHeightForPrimary,
  activeLandPixelY,
  activeDropPixelY,
  footprintCollides,
  willCollidePrimary,
  writeFootprint,
  clearFootprint,
  maxDropDistance,
  isUnsupported,
  dropFootprint,
  cloneGrid,
  copyGridInto,
} from "../../board/geometry";

// PIXI-touching placement stays importable for presentation adapters only.
export {
  primaryFromSprite,
  placeSpritePrimary,
  placeSpriteAtAnchor,
  anchorPixelX,
  anchorPixelY,
} from "../../board/geometry";
