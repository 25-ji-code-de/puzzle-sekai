/**
 * Drive Rapier until the board is quiet (sleep / low velocity) or timeout.
 */
import { gameTicker } from "../../runtime";
import { allSettledBodies, stepWorld, syncSpritesFromBodies } from "./world";
import { clamp } from "../../util/clamp";

const EPS_V = 12; // px/s
const EPS_W = 0.2; // rad/s
const QUIET_FRAMES = 12;
const HARD_TIMEOUT_MS = 4000;
const MAX_SUBSTEPS = 3;

const bodyQuiet = (
  body: import("@dimforge/rapier2d-compat").RigidBody,
): boolean => {
  if (body.isSleeping()) return true;
  const lv = body.linvel();
  const av = body.angvel();
  return Math.hypot(lv.x, lv.y) < EPS_V && Math.abs(av) < EPS_W;
};

const worldIsQuiet = (): boolean => {
  const bodies = allSettledBodies();
  if (bodies.length === 0) return true;
  return bodies.every((e) => bodyQuiet(e.body));
};

/**
 * Run physics until settled or timeout.
 * Returns whether anything meaningfully moved (for cascade guards).
 */
export const settleWorld = async (): Promise<{ moved: boolean }> => {
  if (allSettledBodies().length === 0) {
    syncSpritesFromBodies();
    return { moved: false };
  }

  // Wake everything so stacks re-evaluate after a clear
  for (const e of allSettledBodies()) {
    e.body.wakeUp();
  }

  let quietStreak = 0;
  let moved = false;
  const t0 = performance.now();

  await new Promise<void>((resolve) => {
    const tick = (delta: number) => {
      // delta is PIXI frames (~1 at 60fps)
      const dt = Math.min(delta, MAX_SUBSTEPS) / 60;
      const sub = clamp(Math.ceil(delta), 1, MAX_SUBSTEPS);
      for (let i = 0; i < sub; i++) {
        stepWorld(dt / sub);
      }

      if (!worldIsQuiet()) {
        quietStreak = 0;
        moved = true;
      } else {
        quietStreak += 1;
      }

      const timedOut = performance.now() - t0 > HARD_TIMEOUT_MS;
      if (quietStreak >= QUIET_FRAMES || timedOut) {
        gameTicker.remove(tick);
        // Snap residual micro-velocities to sleep
        for (const e of allSettledBodies()) {
          if (bodyQuiet(e.body) && !e.body.isSleeping()) {
            e.body.setLinvel({ x: 0, y: 0 }, true);
            e.body.setAngvel(0, true);
            e.body.sleep();
          }
        }
        syncSpritesFromBodies();
        resolve();
      }
    };
    gameTicker.add(tick);
  });

  return { moved };
};
