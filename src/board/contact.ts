import { ROWS, COLUMNS } from "../config";
import { sprites, getGrid } from "../game/board-state";
import { isFunModeOn } from "../fun/effects";
import { isCarrotItem, isFriesItem } from "../items";
import { manhattan } from "./grid";
import { footprintFromPrimary } from "../domain/piece";
import {
  isContinuousPhysics,
  projectToColumn,
  entitiesTouching,
} from "./dynamics";
import { pieceKindFrom } from "../domain/types";

/** Same cell or orthogonal neighbor */
const cellsTouch = (ax: number, ay: number, bx: number, by: number) =>
  manhattan(ax, ay, bx, by) <= 1;

/**
 * Landing row (bottom cell) for a piece falling in `col` under gravity,
 * assuming the column is a solid stack from the bottom (post-gravity).
 * Returns -1 if the column is full.
 */
const landYInColumn = (col: number): number => {
  if (col < 0 || col >= COLUMNS) return -1;
  const grid = getGrid();
  for (let y = 0; y < ROWS; y++) {
    if (grid[y][col] != null) {
      return y - 1;
    }
  }
  return ROWS - 1;
};

/**
 * ContactColumns: columns where a default-orientation character, after falling and
 * landing under gravity, would touch the given item (same cell or edge-adjacent).
 */
const contactColumnsForItem = (itemX: number, itemY: number): number[] => {
  const cols: number[] = [];
  for (let col = 0; col < COLUMNS; col++) {
    const landY = landYInColumn(col);
    // Default spawn is vertical head-down (orient 0); need room for upper cell.
    if (landY < 1) continue;
    const cells = footprintFromPrimary({ x: col, y: landY }, 0, "cell2");
    if (cells.some(([x, y]) => cellsTouch(x, y, itemX, itemY))) {
      cols.push(col);
    }
  }
  return cols;
};

/**
 * Continuous: columns whose center is near the item body, or would touch via
 * proximity when a virtual cell2 rests near the item X.
 */
const continuousContactColumnsForItem = (itemSpriteX: number): number[] => {
  const centerCol = projectToColumn(itemSpriteX);
  const cols = new Set<number>();
  for (const d of [-1, 0, 1]) {
    const c = centerCol + d;
    if (c >= 0 && c < COLUMNS) cols.add(c);
  }
  return [...cols].sort((a, b) => a - b);
};

/**
 * Unified ContactColumns for all items matching `itemPred`.
 */
export const getItemContactColumns = (
  itemPred: (file: string) => boolean,
): number[] => {
  if (isContinuousPhysics()) {
    const cols = new Set<number>();
    for (const sp of sprites) {
      if (!sp.isItem || !sp.itemFile) continue;
      if (!itemPred(sp.itemFile)) continue;
      for (const c of continuousContactColumnsForItem(sp.sprite.x)) {
        cols.add(c);
      }
    }
    return [...cols].sort((a, b) => a - b);
  }

  const cols = new Set<number>();
  for (const sp of sprites) {
    if (!sp.isItem || !sp.itemFile || !sp.cells?.length) continue;
    if (!itemPred(sp.itemFile)) continue;
    const [ix, iy] = sp.cells[0];
    for (const c of contactColumnsForItem(ix, iy)) {
      cols.add(c);
    }
  }
  return [...cols].sort((a, b) => a - b);
};

/** にんじん嫌い: columns Ena/Akito must NOT use (contact carrots). */
export const getCarrotHazardColumns = (): number[] => {
  if (!isFunModeOn("itemAllergy")) return [];
  // Continuous space has no column gates — proximity allergy still runs.
  if (isContinuousPhysics()) return [];
  return getItemContactColumns(isCarrotItem);
};

/** ポテトと瑞希: columns Mizuki MUST use when any valid fries contact col exists. */
export const getMizukiLockColumns = (): number[] => {
  if (!isFunModeOn("mizukiShift")) return [];
  // Continuous space has no column gates — teleport / eat still run.
  if (isContinuousPhysics()) return [];
  return getItemContactColumns(isFriesItem);
};

/** Continuous proximity: is character sprite touching any matching item? */
export const characterTouchesItem = (
  characterSp: (typeof sprites)[number],
  itemPred: (file: string) => boolean,
  gap?: number,
): boolean => {
  if (!characterSp.character) return false;
  const charKind = pieceKindFrom({
    characterName: characterSp.character.name,
    isShrunk: characterSp.isShrunk,
  });
  const charEnt = {
    kind: charKind,
    pose: {
      x: characterSp.sprite.x,
      y: characterSp.sprite.y,
      rotation: characterSp.sprite.rotation,
    },
  };
  for (const sp of sprites) {
    if (!sp.isItem || !sp.itemFile || !itemPred(sp.itemFile)) continue;
    const itemEnt = {
      kind: pieceKindFrom({ isItem: true }) as "item",
      pose: {
        x: sp.sprite.x,
        y: sp.sprite.y,
        rotation: sp.sprite.rotation,
      },
    };
    if (entitiesTouching(charEnt, itemEnt, gap)) return true;
  }
  return false;
};
