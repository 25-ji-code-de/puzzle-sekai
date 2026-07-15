/**
 * Board public API — re-exports split modules.
 *
 *  - board-core:    coordinate write + gravity + particles
 *  - board-contact: item contact-column helpers for spawn filters
 *  - board-fun:     entertainment-mode side effects (carrot / mizuki / emu / blast)
 *  - board-clear:   clear animation + post-clear cascade
 */

export { updateCoordinates, fallChunk } from "./board-core";

export {
  getItemContactColumns,
  getCarrotHazardColumns,
  getMizukiLockColumns,
} from "./board-contact";

export {
  applyCarrotAllergy,
  applyCarrotAllergyOnCharacter,
  recheckCarrotAllergy,
  applyMizukiShift,
  tryMizukiEatFries,
  tryEmuShrink,
} from "./board-fun";

export { clearChunk } from "./board-clear";
