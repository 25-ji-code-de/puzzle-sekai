import { ROWS, COLUMNS } from "../config";
import { sprites, pieces } from "../game/board-state";
import { isFunModeOn } from "../fun/effects";
import { isCarrotItem, isFriesItem } from "../items";

/** Same cell or orthogonal neighbor */
const cellsTouch = (ax: number, ay: number, bx: number, by: number) => {
  const d = Math.abs(ax - bx) + Math.abs(ay - by);
  return d === 0 || d === 1;
};

/**
 * Landing row (bottom cell) for a piece falling in `col` under gravity,
 * assuming the column is a solid stack from the bottom (post-gravity).
 * Returns -1 if the column is full.
 */
const landYInColumn = (col: number): number => {
  if (col < 0 || col >= COLUMNS) return -1;
  // First occupied cell from the top; land on the cell above it
  for (let y = 0; y < ROWS; y++) {
    if (pieces[y][col] != null) {
      return y - 1;
    }
  }
  return ROWS - 1; // empty column → rest on floor
};

/**
 * Cells occupied by a default-orientation (vertical 2-cell) character
 * after landing with bottom at (col, landY).
 */
const landedVerticalCells = (
  col: number,
  landY: number,
): [number, number][] | null => {
  if (landY < 0 || landY >= ROWS || col < 0 || col >= COLUMNS) return null;
  // Need room for the upper cell (spawn orientation is vertical)
  if (landY < 1) return null;
  return [
    [col, landY],
    [col, landY - 1],
  ];
};

/**
 * ContactColumns: columns where a default-orientation character, after falling and
 * landing under gravity, would touch the given item (same cell or edge-adjacent).
 */
const contactColumnsForItem = (itemX: number, itemY: number): number[] => {
  const cols: number[] = [];
  for (let col = 0; col < COLUMNS; col++) {
    const landY = landYInColumn(col);
    const cells = landedVerticalCells(col, landY);
    if (!cells) continue;
    if (cells.some(([x, y]) => cellsTouch(x, y, itemX, itemY))) {
      cols.push(col);
    }
  }
  return cols;
};

/**
 * Unified ContactColumns for all items matching `itemPred` (e.g. isCarrotItem / isFriesItem).
 * A column is included if landing a vertical 2-cell piece there would contact
 * at least one matching item.
 */
export const getItemContactColumns = (
  itemPred: (file: string) => boolean,
): number[] => {
  const cols = new Set<number>();
  for (const sp of sprites) {
    if (!sp.isItem || !sp.itemFile || !sp.coordinates?.length) continue;
    if (!itemPred(sp.itemFile)) continue;
    const [ix, iy] = sp.coordinates[0];
    for (const c of contactColumnsForItem(ix, iy)) {
      cols.add(c);
    }
  }
  return [...cols].sort((a, b) => a - b);
};

/** にんじん嫌い: columns Ena/Akito must NOT use (contact carrots). */
export const getCarrotHazardColumns = (): number[] => {
  if (!isFunModeOn("itemAllergy")) return [];
  return getItemContactColumns(isCarrotItem);
};

/** ポテトと瑞希: columns Mizuki MUST use when any valid fries contact col exists. */
export const getMizukiLockColumns = (): number[] => {
  if (!isFunModeOn("mizukiShift")) return [];
  return getItemContactColumns(isFriesItem);
};
