/**
 * Board public API for gameplay (orchestration only).
 * Fun modes: import application/fun-effects or board/fun/* from plugins only.
 * Pure piece math: domain/piece; PIXI placement: presentation/placement.
 */
export { commitLandedSprite, fallChunk } from "./core";
export { createParticles } from "./particles";

export {
  getItemContactColumns,
  getCarrotHazardColumns,
  getMizukiLockColumns,
} from "./contact";

export { tryCantileverPhysics } from "./physics";

export { clearChunk, settleBoard } from "./clear-flow";
