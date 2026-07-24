export const COLUMNS = 6;
export const ROWS = 8;
export const BOX_SIZE = 133; //90
export const LEFT_BORDER = 530;
export const RIGHT_BORDER = LEFT_BORDER + BOX_SIZE * COLUMNS;
export const SPEED = 1.5;

/**
 * App ship version (package.json → vite `define` → `__APP_VERSION__`).
 * Prefer this over hard-coding "1.x.y" in UI / SEO copy.
 */
export const APP_VERSION: string =
  typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "0.0.0-dev";

/** Canvas / PIXI Application size (must match runtime Application). */
export const STAGE_HEIGHT = 1080;
export const STAGE_WIDTH = 1920;

/** Bottom margin of the playfield above the canvas bottom edge. */
export const OFFSET_BOTTOM = 26;

/**
 * Top-left Y of cell (0,0) in canvas space.
 * STAGE_HEIGHT - OFFSET_BOTTOM - ROWS * BOX_SIZE (may be slightly negative).
 * Single origin for active land, gravity placement, and tip fulcrums.
 */
export const BOARD_ORIGIN_Y = STAGE_HEIGHT - OFFSET_BOTTOM - ROWS * BOX_SIZE;

/** Left X of column 0 (= LEFT_BORDER). */
export const BOARD_ORIGIN_X = LEFT_BORDER;

export const NEXT_CHARACTER_X = 1540;
export const NEXT_CHARACTER_Y = 480;

export const avatar_X = 1466;
export const avatar_Y = 175;

export const FALL_DELAY = 10;
export const FALL_SPEED = 8 * SPEED;

/**
 * Continuous (truePhysics) horizontal strafe speed, in px per PIXI ticker
 * delta unit (≈ px/frame at 60fps). Matches the fall integration style so
 * hold-to-move feels as smooth as gravity.
 * 4 → ~240 px/s ≈ 1.8 cells/s at base SPEED.
 */
export const CONTINUOUS_STRAFE_SPEED = 4;

/** Strafe speed scaled to the piece's fall speed (faster fall → faster strafe). */
export const continuousStrafeSpeed = (baseSpeed: number): number =>
  CONTINUOUS_STRAFE_SPEED * (baseSpeed / SPEED);

/**
 * One-shot horizontal nudge (swipe / replay / tap-via-action) in continuous mode.
 * Hold-to-move does NOT use this — it integrates per frame instead.
 */
export const CONTINUOUS_MOVE_STEP = 8;

/** One-shot step scaled to fall speed. */
export const continuousMoveStep = (baseSpeed: number): number =>
  CONTINUOUS_MOVE_STEP * (baseSpeed / SPEED);

/**
 * Touch direct-drag tuning — **stage / cell units**, not raw CSS px.
 * Convert client → stage via letterbox scale, then compare to BOX_SIZE fractions
 * so phones of different sizes feel the same relative to the board.
 */
/** Max press duration that still counts as a rotate tap (ms). */
export const TOUCH_TAP_MAX_MS = 280;
/** Dead zone before pan vs tap lock (cells of stage travel). */
export const TOUCH_DEAD_ZONE_CELLS = 0.2;
/** Grid: stage travel per column step (cells). Higher = less twitchy. */
export const TOUCH_GRID_STEP_CELLS = 0.85;
/**
 * truePhysics drag gain: stage dx *= gain (1 = 1:1 finger).
 * Below 1 damps twitch without changing collision step size.
 */
export const TOUCH_CONTINUOUS_GAIN = 0.6;
/** Soft-drop arm distance (cells down from touch origin). */
export const TOUCH_SOFT_DROP_CELLS = 0.32;
/**
 * Soft-drop + steer: extra lateral cells from origin before H is allowed
 * while soft-dropping (on top of dead zone).
 */
export const TOUCH_SOFT_STEER_CELLS = 0.28;
/** Min |stage dy| for a flick (cells). */
export const TOUCH_FLICK_MIN_CELLS = 0.55;
/**
 * Flick velocity in **stage px / ms** (down positive for hard drop).
 * Independent of CSS pixel density after letterbox conversion.
 * ~2.6 ≈ intentional snap, not a slow drag release.
 */
export const TOUCH_FLICK_HARD_VEL_STAGE = 2.6;
export const TOUCH_FLICK_LIFT_VEL_STAGE = 2.2;
/**
 * Axis dominance: |primary| must exceed |secondary| * ratio to lock H/V.
 * Higher = less accidental H lock on mostly-vertical flicks.
 */
export const TOUCH_AXIS_DOMINANCE = 1.45;
/**
 * Flick must be this much more vertical than horizontal (|dy| >= ratio * |dx|).
 */
export const TOUCH_FLICK_VERTICAL_RATIO = 1.8;

/**
 * Floating virtual stick (finger-down) — **velocity superposition**:
 *   v_final = v_base_fall + v_stick(position)
 *
 * Stick position in **radii** of the drawn ring (absolute distance):
 * - **vx** ∝ sx = stageDx / radius  (can exceed ±1 outside the ring → faster)
 * - **vy** ∝ sy = stageDy / radius  (+sy soft-drop on top of base gravity)
 * - **hold in center** → charge ring → hard-drop when full
 *
 * Rim |sx|=1 is the "full push" reference rate; farther travel is faster.
 */
/** Desktop / large: stick base radius in cells. */
export const TOUCH_STICK_RADIUS_CELLS = 1.35;
/** Phone / narrow: larger ring. */
export const TOUCH_STICK_RADIUS_CELLS_COMPACT = 1.85;
/** Idle when |offset| / radius below this (knob still tracks). */
export const TOUCH_STICK_DEAD_FRAC = 0.14;
export const TOUCH_STICK_DEAD_FRAC_COMPACT = 0.16;
/**
 * Soft-drop when stick's down component (sy) exceeds this (0…1 after clamp).
 * Release hysteresis uses a lower threshold.
 */
export const TOUCH_STICK_SOFT_VY = 0.28;
export const TOUCH_STICK_SOFT_VY_COMPACT = 0.3;
export const TOUCH_STICK_SOFT_VY_RELEASE = 0.14;
export const TOUCH_STICK_SOFT_VY_RELEASE_COMPACT = 0.15;
/**
 * Hard-drop charge: hold stick near center this long (ms) to fill the ring.
 * - **direct** hold from press (never left center): ~0.5s
 * - **return** after leaving dead zone then coming back: 3s (intentional, not accidental)
 * Leaving the charge radius cancels progress.
 */
export const TOUCH_STICK_HARD_CHARGE_MS = 480;
export const TOUCH_STICK_HARD_CHARGE_MS_COMPACT = 520;
/**
 * Charge after leaving dead zone then returning (ms).
 * Longer than direct hold so re-centering after steer doesn't hard-drop by accident;
 * shorter than 3s so deliberate mid-piece hard-drop still feels usable.
 * ~2.4s ≈ 3s − 0.6s (user preference).
 */
export const TOUCH_STICK_HARD_CHARGE_RETURN_MS = 2400;
export const TOUCH_STICK_HARD_CHARGE_RETURN_MS_COMPACT = 2500;
/**
 * Stay within this magFrac (of stick radius) to keep charging hard-drop.
 * Slightly larger than deadFrac so tiny finger noise doesn't reset.
 */
export const TOUCH_STICK_HARD_CHARGE_FRAC = 0.22;
export const TOUCH_STICK_HARD_CHARGE_FRAC_COMPACT = 0.24;
/**
 * Grid mode: column step interval at |sx|=1 (ms). Higher = slower.
 * Step rate scales with |sx|.
 */
export const TOUCH_STICK_GRID_STEP_MS = 180;
export const TOUCH_STICK_GRID_STEP_MS_COMPACT = 210;
export const TOUCH_STICK_GRID_STEP_MIN_MS = 90;
export const TOUCH_STICK_GRID_STEP_MIN_MS_COMPACT = 105;
/**
 * Continuous (truePhysics) stick rate at |sx|=1 (rim of the drawn stick),
 * as a fraction of keyboard hold strafe. Finger outside the ring → |sx|>1
 * → faster than this (absolute distance / radius, uncapped).
 */
export const TOUCH_STICK_STRAFE_MULT = 0.78;
export const TOUCH_STICK_STRAFE_MULT_COMPACT = 0.7;
/**
 * Safety cap on |sx| (radii of travel) so a full-screen fling cannot
 * teleport the piece. ~4 radii ≈ 4× rim speed.
 */
export const TOUCH_STICK_SX_MAX = 4;
export const TOUCH_STICK_SX_MAX_COMPACT = 3.5;

export type TouchStickProfile = {
  radiusCells: number;
  deadFrac: number;
  softVy: number;
  softVyRelease: number;
  /** Direct center-hold charge (ms). */
  hardChargeMs: number;
  /** Charge after leaving dead zone then returning (ms). */
  hardChargeReturnMs: number;
  hardChargeFrac: number;
  gridStepMs: number;
  gridStepMinMs: number;
  /** Strafe rate at |sx|=1 (rim); outside ring scales above this. */
  strafeMult: number;
  /** Cap |sx| in radii of travel. */
  sxMax: number;
};

/** Desktop / large-screen stick + pace. */
export const TOUCH_STICK_PROFILE_DESKTOP: TouchStickProfile = {
  radiusCells: TOUCH_STICK_RADIUS_CELLS,
  deadFrac: TOUCH_STICK_DEAD_FRAC,
  softVy: TOUCH_STICK_SOFT_VY,
  softVyRelease: TOUCH_STICK_SOFT_VY_RELEASE,
  hardChargeMs: TOUCH_STICK_HARD_CHARGE_MS,
  hardChargeReturnMs: TOUCH_STICK_HARD_CHARGE_RETURN_MS,
  hardChargeFrac: TOUCH_STICK_HARD_CHARGE_FRAC,
  gridStepMs: TOUCH_STICK_GRID_STEP_MS,
  gridStepMinMs: TOUCH_STICK_GRID_STEP_MIN_MS,
  strafeMult: TOUCH_STICK_STRAFE_MULT,
  sxMax: TOUCH_STICK_SX_MAX,
};

/** Phone / compact: bigger ring, calmer max rates, slightly longer direct charge. */
export const TOUCH_STICK_PROFILE_COMPACT: TouchStickProfile = {
  radiusCells: TOUCH_STICK_RADIUS_CELLS_COMPACT,
  deadFrac: TOUCH_STICK_DEAD_FRAC_COMPACT,
  softVy: TOUCH_STICK_SOFT_VY_COMPACT,
  softVyRelease: TOUCH_STICK_SOFT_VY_RELEASE_COMPACT,
  hardChargeMs: TOUCH_STICK_HARD_CHARGE_MS_COMPACT,
  hardChargeReturnMs: TOUCH_STICK_HARD_CHARGE_RETURN_MS_COMPACT,
  hardChargeFrac: TOUCH_STICK_HARD_CHARGE_FRAC_COMPACT,
  gridStepMs: TOUCH_STICK_GRID_STEP_MS_COMPACT,
  gridStepMinMs: TOUCH_STICK_GRID_STEP_MIN_MS_COMPACT,
  strafeMult: TOUCH_STICK_STRAFE_MULT_COMPACT,
  sxMax: TOUCH_STICK_SX_MAX_COMPACT,
};

/**
 * Stage-px thresholds derived from cell fractions (single source for BOX_SIZE).
 * Pass radiusCells to use compact vs desktop stick size.
 */
export const touchStageThresholds = (
  boxSize: number = BOX_SIZE,
  radiusCells: number = TOUCH_STICK_RADIUS_CELLS,
) => {
  const b = boxSize > 0 ? boxSize : BOX_SIZE;
  const r = radiusCells > 0 ? radiusCells : TOUCH_STICK_RADIUS_CELLS;
  return {
    deadZone: b * TOUCH_DEAD_ZONE_CELLS,
    gridStep: b * TOUCH_GRID_STEP_CELLS,
    softDrop: b * TOUCH_SOFT_DROP_CELLS,
    softSteer: b * TOUCH_SOFT_STEER_CELLS,
    flickMin: b * TOUCH_FLICK_MIN_CELLS,
    stickRadius: b * r,
  };
};
