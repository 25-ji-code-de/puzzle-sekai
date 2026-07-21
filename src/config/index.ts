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
