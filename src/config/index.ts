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

/** Stage-px thresholds derived from cell fractions (single source for BOX_SIZE). */
export const touchStageThresholds = (boxSize: number = BOX_SIZE) => {
  const b = boxSize > 0 ? boxSize : BOX_SIZE;
  return {
    deadZone: b * TOUCH_DEAD_ZONE_CELLS,
    gridStep: b * TOUCH_GRID_STEP_CELLS,
    softDrop: b * TOUCH_SOFT_DROP_CELLS,
    softSteer: b * TOUCH_SOFT_STEER_CELLS,
    flickMin: b * TOUCH_FLICK_MIN_CELLS,
  };
};
