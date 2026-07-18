/**
 * Continuous-space proximity helpers (no Rapier dependency).
 */
import { BOARD_ORIGIN_X, BOX_SIZE, COLUMNS, LEFT_BORDER } from "../../config";
import type { PieceKind } from "../../domain/types";
import type { LocalPoint } from "./alpha-shape";
import { aabbGap, poseAabb, type Pose } from "./pose";

/** Gap (px) under which two pieces are considered adjacent for clears / fun modes. */
export const CONTACT_GAP = 8;

export const projectToColumn = (worldX: number): number => {
  const col = Math.floor((worldX - BOARD_ORIGIN_X) / BOX_SIZE);
  return Math.max(0, Math.min(COLUMNS - 1, col));
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
