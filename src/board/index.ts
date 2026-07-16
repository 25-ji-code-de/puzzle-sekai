/**
 * Board public API — re-exports split modules.
 *
 *  - geometry:   pure footprint / anchor / grid-write atoms
 *  - core:       coordinate write + gravity
 *  - contact:    item contact-column helpers for spawn filters
 *  - fun/*:      entertainment-mode side effects (carrot / mizuki / emu / blast)
 *  - physics:    cantilever tip physics
 *  - clear-flow: clear animation + post-clear cascade
 *  - particles:  burst VFX
 */
export {
  type Cell,
  type PieceKind,
  type Orientation,
  type BoardGrid,
  isBig2x2Name,
  pieceKindFrom,
  footprintFromPrimary,
  anchorFromFootprint,
  orientFromFootprint,
  placeSpriteAtAnchor,
  writeFootprint,
  clearFootprint,
  maxDropDistance,
  isUnsupported,
  bottomCells,
  columnsForPiece,
  stackHeightBelow,
  stackHeightForPrimary,
  activeLandPixelY,
  activeDropPixelY,
} from "./geometry";

export { updateCoordinates, fallChunk } from "./core";
export { createParticles } from "./particles";

export {
  getItemContactColumns,
  getCarrotHazardColumns,
  getMizukiLockColumns,
} from "./contact";

export {
  applyCarrotAllergy,
  applyCarrotAllergyOnCharacter,
  recheckCarrotAllergy,
  applyMizukiShift,
  tryMizukiEatFries,
  tryEmuShrink,
  applyWonderBlast,
} from "./fun";

export { tryCantileverPhysics } from "./physics";

export { clearChunk, settleBoard } from "./clear-flow";
