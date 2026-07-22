/**
 * Pure touch-gesture helpers (no DOM). All thresholds are **stage units**
 * after letterbox conversion — not raw CSS pixels.
 */

export type AxisLock = "none" | "h" | "v";

export type FlickKind = "hardDrop" | "lift" | null;

export type ClientToStageScale = {
  /** client px → stage px (X) */
  sx: number;
  /** client px → stage px (Y) */
  sy: number;
};

/** Letterbox-aware scale from canvas CSS box to logical stage. */
export const clientToStageScale = (
  rect: { width: number; height: number },
  stageWidth: number,
  stageHeight: number,
): ClientToStageScale => {
  const sx = rect.width > 0 ? stageWidth / rect.width : 1;
  const sy = rect.height > 0 ? stageHeight / rect.height : 1;
  return {
    sx: Number.isFinite(sx) && sx > 0 ? sx : 1,
    sy: Number.isFinite(sy) && sy > 0 ? sy : 1,
  };
};

export const clientDeltaToStage = (
  clientDx: number,
  clientDy: number,
  scale: ClientToStageScale,
): { dx: number; dy: number } => ({
  dx: clientDx * scale.sx,
  dy: clientDy * scale.sy,
});

/**
 * Lock pan axis after leaving the dead zone (stage px).
 * Ambiguous diagonals → vertical so hard-drop flicks don't steal columns.
 */
export const resolveAxisLock = (
  stageDx: number,
  stageDy: number,
  deadZoneStage: number,
  dominance: number,
): AxisLock => {
  const adx = Math.abs(stageDx);
  const ady = Math.abs(stageDy);
  if (adx < deadZoneStage && ady < deadZoneStage) return "none";
  if (adx >= ady * dominance) return "h";
  if (ady >= adx * dominance) return "v";
  return "v";
};

/** True when total stage travel is still a tap candidate. */
export const isWithinDeadZone = (
  stageDx: number,
  stageDy: number,
  deadZoneStage: number,
): boolean =>
  Math.abs(stageDx) <= deadZoneStage && Math.abs(stageDy) <= deadZoneStage;

/**
 * Consume horizontal stage delta into discrete column steps.
 * Positive remainder/steps = right; negative = left.
 */
export const consumeGridSteps = (
  accumStageX: number,
  stepStagePx: number,
): { steps: number; remainder: number } => {
  if (!(stepStagePx > 0) || !Number.isFinite(accumStageX)) {
    return { steps: 0, remainder: accumStageX };
  }
  const steps = Math.trunc(accumStageX / stepStagePx);
  return {
    steps,
    remainder: accumStageX - steps * stepStagePx,
  };
};

export type FlickOpts = {
  /** Stage px / ms (down positive for hard drop). */
  hardVelocity: number;
  liftVelocity: number;
  /** Min |stage dy|. */
  minDistance: number;
  /** |dy| must be >= verticalRatio * |dx|. */
  verticalRatio?: number;
};

/**
 * Classify an intentional flick in **stage** space.
 * velocityY: stage-px/ms, down positive.
 */
export const classifyFlick = (
  velocityY: number,
  distanceY: number,
  distanceX: number,
  opts: FlickOpts,
): FlickKind => {
  if (!Number.isFinite(velocityY) || !Number.isFinite(distanceY)) return null;
  const ady = Math.abs(distanceY);
  const adx = Math.abs(distanceX);
  if (ady < opts.minDistance) return null;
  const ratio = opts.verticalRatio ?? 1.8;
  if (ady < adx * ratio) return null;

  if (distanceY > 0 && velocityY >= opts.hardVelocity) return "hardDrop";
  if (distanceY < 0 && -velocityY >= opts.liftVelocity) return "lift";
  return null;
};

/** Soft-drop arm when held stage dy exceeds threshold (down positive). */
export const shouldArmSoftDrop = (
  stageDyFromOrigin: number,
  thresholdStage: number,
): boolean => stageDyFromOrigin >= thresholdStage;

/** Soft-drop release hysteresis. */
export const shouldReleaseSoftDrop = (
  stageDyFromOrigin: number,
  thresholdStage: number,
): boolean => stageDyFromOrigin < thresholdStage * 0.45;

/** Tap if short enough and still in dead zone (stage units). */
export const isTapGesture = (
  durationMs: number,
  stageDx: number,
  stageDy: number,
  deadZoneStage: number,
  tapMaxMs: number,
): boolean =>
  durationMs <= tapMaxMs && isWithinDeadZone(stageDx, stageDy, deadZoneStage);

/**
 * Soft-drop + lateral steer: allow H when soft-drop is armed and lateral
 * stage travel from origin clears an extra threshold.
 */
export const canSoftDropSteer = (
  stageDxFromOrigin: number,
  softSteerStage: number,
): boolean => Math.abs(stageDxFromOrigin) >= softSteerStage;
