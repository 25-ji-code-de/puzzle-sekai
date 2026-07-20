/**
 * Dynamics facade: grid vs continuous (truePhysics) backend switch.
 */
import { isFunModeOn } from "../../fun/effects";
import { isRapierLoadFailed, warmRapier, loadRapier } from "./rapier-loader";
import {
  destroyWorld,
  ensureWorld,
  hasPhysicsWorld,
  removeBody,
} from "./world";
import { settleWorld } from "./settle";
import type { EntityId } from "../../domain/types";
import { devWarn } from "../../util/dev-log";

/** Session flag: truePhysics requested but Rapier failed → stay on grid. */
let continuousDisabledThisSession = false;

export const isContinuousPhysics = (): boolean => {
  if (continuousDisabledThisSession) return false;
  if (isRapierLoadFailed()) return false;
  return isFunModeOn("truePhysics");
};

export const disableContinuousThisSession = (): void => {
  continuousDisabledThisSession = true;
  devWarn(
    "[truePhysics] Disabled for this session; falling back to grid physics.",
  );
};

export const resetContinuousSessionFlag = (): void => {
  continuousDisabledThisSession = false;
};

/** Warm-download Rapier when user enables the mode or boots with it on. */
export const warmContinuousPhysics = (): void => {
  if (!isFunModeOn("truePhysics")) return;
  warmRapier();
};

/**
 * Ensure world is ready before first spawn.
 * On failure, disables continuous mode for the session and returns false.
 */
export const ensureContinuousReady = async (): Promise<boolean> => {
  if (!isFunModeOn("truePhysics")) return false;
  if (continuousDisabledThisSession) return false;
  try {
    await loadRapier();
    await ensureWorld();
    return true;
  } catch (e) {
    devWarn("[truePhysics] ensureContinuousReady failed", e);
    disableContinuousThisSession();
    destroyWorld();
    return false;
  }
};

export const teardownContinuous = (): void => {
  destroyWorld();
};

export const continuousSettle = (): Promise<{ moved: boolean }> => {
  if (!hasPhysicsWorld()) return Promise.resolve({ moved: false });
  return settleWorld();
};

export const continuousRemoveBody = (entityId: EntityId | undefined): void => {
  if (!entityId) return;
  removeBody(entityId);
};

// Re-exports for call sites
export { warmRapier, loadRapier } from "./rapier-loader";
export {
  createActiveBody,
  removeActiveBody,
  syncActiveFromSprite,
  commitDynamicBody,
  rebuildBodyKind,
  setBodyPose,
  wakeBody,
  allSettledBodies,
  anyBodyAboveTopOut,
  highestBodyTop,
  hasPhysicsWorld,
  getBodyEntry,
  localPointsForSprite,
} from "./world";
export {
  castDownY,
  canPlaceAt,
  tryShiftX,
  tryRotate,
  maxShiftX,
  stepShiftX,
} from "./active-queries";
export { commitLandContinuous } from "./continuous-land";
export { findClearEntities } from "./clear-entities";
export { massOfKind } from "./colliders";
export {
  CONTACT_GAP,
  projectToColumn,
  projectToRow,
  columnCenterX,
  entitiesTouching,
} from "./proximity";
export { settleWorld } from "./settle";
export { buildAlphaShape, convexHull } from "./alpha-shape";
export { resolveComOffset, COM_BY_ASSET, type ComOffset } from "./com-table";
