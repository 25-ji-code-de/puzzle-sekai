/**
 * Board geometry barrel.
 * Pure math from domain/piece; types from domain/types (no re-declaration).
 * PIXI placement stays local.
 */
export type {
  PieceKind,
  Cell,
  ReadonlyCell,
  Orientation,
  Primary,
  Col,
  Row,
  RoundMethod,
  BoardGrid,
} from "../../domain/types";

// BoardGrid also from piece grid-write for historical import paths
export type { BoardGrid as GeometryBoardGrid } from "../../domain/piece";

export {
  isBig2x2Name,
  pieceKindFrom,
  PIECE_KINDS,
  col,
  row,
  cell,
  asCell,
  asOrientation,
  asPrimary,
  primary,
  cellToXY,
  pickMaxY,
  pickMinY,
  pickMinX,
  pickMaxX,
  bottomCells,
  maxFootprintY,
  translateCells,
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
  rotationToOrientation,
  orientationToRotation,
} from "../../domain/piece";

export { primaryFromSprite, placeSpritePrimary } from "./sprite-primary";
export {
  anchorPixelX,
  anchorPixelY,
  placeSpriteAtAnchor,
} from "./placement";
