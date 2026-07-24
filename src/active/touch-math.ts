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

/**
 * Virtual stick — **velocity superposition** (stage px, down-positive Y).
 *
 *   v_player = v_base_fall + v_stick
 *
 * Stick offset in **radius units** (NOT clamped to the unit disk for velocity):
 * - **sx** = stageDx / radius  → horizontal rate (can be |sx| > 1 outside the ring)
 * - **sy** = stageDy / radius  → vertical; +sy arms soft-drop
 *
 * The visual knob still clamps to the ring. Velocity uses absolute distance so
 * flinging across the screen is faster than "full push" on the rim.
 *
 * A small radial dead zone zeros tiny jiggle; beyond that, components scale
 * with distance (linear, no upper clamp on sx/sy).
 */
export type StickSample = {
  /**
   * Horizontal rate in "radii" of stick travel (stage space).
   * |sx|=1 ≈ rim full-push; |sx|>1 when finger is outside the drawn ring.
   */
  sx: number;
  /** Vertical rate in radii (down +). May exceed ±1 outside the ring. */
  sy: number;
  /** |offset| / radius (uncapped; >1 outside ring). */
  magFrac: number;
  /** Soft-drop when sy ≥ softVy (same units). */
  softDrop: boolean;
  /** Knob offset clamped to radius (stage px) for drawing. */
  knobDx: number;
  knobDy: number;
};

export type StickCurveOpts = {
  radiusStage: number;
  deadFrac: number;
  softVy: number;
};

/**
 * Map finger offset → stick velocity components (absolute distance / radius).
 */
export const sampleStick = (
  stageDx: number,
  stageDy: number,
  opts: StickCurveOpts,
): StickSample => {
  const r = opts.radiusStage > 0 ? opts.radiusStage : 1;
  const mag = Math.hypot(stageDx, stageDy);
  const magFrac = mag / r;
  const dead = Math.max(0, Math.min(0.95, opts.deadFrac));

  // Visual knob: clamp to ring only for drawing.
  const drawScale = mag > r && mag > 0 ? r / mag : 1;
  const knobDx = stageDx * drawScale;
  const knobDy = stageDy * drawScale;

  if (magFrac <= dead || mag < 1e-6) {
    return {
      sx: 0,
      sy: 0,
      magFrac,
      softDrop: false,
      knobDx,
      knobDy,
    };
  }

  // Absolute distance in radii — not clamped; outside ring → |sx| > 1.
  // Hard dead zone only (zero inside); no soft remap so rim ≈ 1 and farther is faster.
  const sx = stageDx / r;
  const sy = stageDy / r;

  const softDrop = sy >= opts.softVy;

  return { sx, sy, magFrac, softDrop, knobDx, knobDy };
};

/**
 * Soft-drop with hysteresis on the vertical component so tiny wobble
 * does not thrash soft-drop on/off.
 */
export const softDropWithHysteresis = (
  sample: StickSample,
  alreadySoft: boolean,
  _softVy: number,
  softVyRelease: number,
): boolean => {
  if (sample.softDrop) return true;
  if (!alreadySoft) return false;
  return sample.sy >= softVyRelease;
};

/** @deprecated Prefer sampleStick.softDrop. */
export const stickSoftDropArmed = (
  stageDyFromOrigin: number,
  radiusStage: number,
  softFrac: number,
): boolean => {
  if (!(radiusStage > 0)) return false;
  return stageDyFromOrigin / radiusStage >= softFrac;
};

/** @deprecated Prefer softDropWithHysteresis. */
export const stickSoftDropReleased = (
  stageDyFromOrigin: number,
  radiusStage: number,
  releaseFrac: number,
): boolean => {
  if (!(radiusStage > 0)) return true;
  return stageDyFromOrigin / radiusStage < releaseFrac;
};

/** @deprecated angle model removed — kept only if something still imports. */
export const angleFromDownDeg = (stageDx: number, stageDy: number): number =>
  (Math.atan2(stageDx, stageDy) * 180) / Math.PI;

/** @deprecated magnitude-only gain; use sx/sy components instead. */
export const magnitudeGain = (
  magFrac: number,
  deadFrac: number,
  fullFrac: number,
): number => {
  const dead = Math.max(0, Math.min(0.95, deadFrac));
  const full = Math.max(dead + 0.05, Math.min(1, fullFrac));
  if (magFrac <= dead) return 0;
  if (magFrac >= full) return 1;
  const t = (magFrac - dead) / (full - dead);
  return t * t;
};
