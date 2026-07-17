/**
 * Board geometry barrel.
 * Pure math re-exported from domain/piece; PIXI placement stays local.
 */
export type { PieceKind, Cell, Orientation, BoardGrid } from "../../domain/piece";
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
  activeLandPrimaryRow,
  primaryToPixel,
  boardOriginY,
  cellCenterX,
  cellCenterY,
  cellTopLeftX,
  cellTopLeftY,
  BOARD_ORIGIN_X,
  BOARD_ORIGIN_Y,
  footprintCollides,
  willCollidePrimary,
  writeFootprint,
  clearFootprint,
  maxDropDistance,
  isUnsupported,
  dropFootprint,
  cloneGrid,
  copyGridInto,
} from "../../domain/piece";

export type { RoundMethod } from "./sprite-primary";
export { primaryFromSprite, placeSpritePrimary } from "./sprite-primary";
export {
  anchorPixelX,
  anchorPixelY,
  placeSpriteAtAnchor,
} from "./placement";
