/**
 * Board public API — re-exports split modules.
 *
 *  - core:       coordinate write + gravity
 *  - contact:    item contact-column helpers for spawn filters
 *  - fun/*:      entertainment-mode side effects (carrot / mizuki / emu / blast)
 *  - physics:    cantilever tip physics
 *  - clear-flow: clear animation + post-clear cascade
 *  - particles:  burst VFX
 */
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
