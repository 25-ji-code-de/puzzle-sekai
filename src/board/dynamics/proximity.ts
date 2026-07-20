/**
 * Continuous-space proximity helpers (no Rapier dependency).
 */
import {
  BOARD_ORIGIN_X,
  BOARD_ORIGIN_Y,
  BOX_SIZE,
  COLUMNS,
  LEFT_BORDER,
  ROWS,
} from "../../config";
import type { PieceKind } from "../../domain/types";
import type { LocalPoint } from "./alpha-shape";
import { aabbGap, poseAabb, type Pose } from "./pose";
import { clampInt } from "../../util/clamp";

/** Gap (px) under which two pieces are considered adjacent for clears / fun modes. */
export const CONTACT_GAP = 8;

export const projectToColumn = (worldX: number): number => {
  const col = Math.floor((worldX - BOARD_ORIGIN_X) / BOX_SIZE);
  return clampInt(col, 0, COLUMNS - 1);
};

/**
 * Map world Y (sprite center / anchor) to a board row index.
 * Symmetric with {@link projectToColumn}; used when fun plugins need a row
 * hint under continuous physics (grid path already has cell coords).
 */
export const projectToRow = (worldY: number): number => {
  const row = Math.floor((worldY - BOARD_ORIGIN_Y) / BOX_SIZE);
  return clampInt(row, 0, ROWS - 1);
};

/** Center X of a column (cell center). */
export const columnCenterX = (col: number): number =>
  LEFT_BORDER + col * BOX_SIZE + BOX_SIZE / 2;

export type ProximityEntity = {
  kind: PieceKind;
  pose: Pose;
  /** Optional alpha-hull local points for tighter proximity. */
  localPoints?: LocalPoint[] | null;
};

export const entitiesTouching = (
  a: ProximityEntity,
  b: ProximityEntity,
  gap: number = CONTACT_GAP,
): boolean => {
  const aa = poseAabb(a.kind, a.pose, a.localPoints);
  const ba = poseAabb(b.kind, b.pose, b.localPoints);
  return aabbGap(aa, ba) <= gap;
};
