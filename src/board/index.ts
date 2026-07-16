/**
 * Board public API for gameplay (orchestration only).
 * Fun modes: import application/fun-effects or board/fun/* from plugins only.
 * Geometry pure math: prefer domain/piece; PIXI placement from board/geometry.
 */
export { updateCoordinates, fallChunk } from "./core";
export { createParticles } from "./particles";

export {
  getItemContactColumns,
  getCarrotHazardColumns,
  getMizukiLockColumns,
} from "./contact";

export { tryCantileverPhysics } from "./physics";

export { clearChunk, settleBoard } from "./clear-flow";
