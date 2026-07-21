export const COLUMNS = 6;
export const ROWS = 8;
export const BOX_SIZE = 133; //90
export const LEFT_BORDER = 530;
export const RIGHT_BORDER = LEFT_BORDER + BOX_SIZE * COLUMNS;
export const SPEED = 1.5;

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

/** Pixels per horizontal input event in continuous (truePhysics) mode. */
export const CONTINUOUS_MOVE_STEP = 8;

/** Horizontal step scaled to the piece's fall speed (faster fall → faster strafe). */
export const continuousMoveStep = (baseSpeed: number): number =>
  CONTINUOUS_MOVE_STEP * (baseSpeed / SPEED);
