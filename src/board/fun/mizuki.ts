/**
 * ポテトと瑞希 — Mizuki teleports above fries; eats adjacent fries.
 */
import { getOffset, moveToCoordinate } from "../../utils/coords";
import { addScore } from "../../score";
import { ROWS, COLUMNS } from "../../config";
import { SpriteData, sprites, pieces } from "../../game/board-state";
import { isFunModeOn } from "../../fun/effects";
import { isFriesItem } from "../../items";
import { updateCoordinates, fallChunk } from "../core";
import { createParticles } from "../particles";
import { removeSpritesFromBoard } from "../mutate";
import { DIRS_ORTHO } from "../grid";

export const applyMizukiShift = async (
  itemX: number,
  itemY: number,
): Promise<void> => {
  if (!isFunModeOn("mizukiShift")) return;

  type Cand = { index: number; dist: number };
  let best: Cand | null = null;
  for (let i = 0; i < sprites.length; i++) {
    const sp = sprites[i];
    if (sp.character?.name !== "Mizuki" || !sp.coordinates?.length) continue;
    const dist = Math.min(
      ...sp.coordinates.map(
        ([x, y]) => Math.abs(x - itemX) + Math.abs(y - itemY),
      ),
    );
    if (!best || dist < best.dist) best = { index: i, dist };
  }
  if (!best) return;

  const mizukiIndex = best.index;
  const mizuki = sprites[mizukiIndex];
  const targetY = itemY - 1;
  if (targetY < 0) return;

  const tryCols = [itemX, itemX - 1, itemX + 1].filter(
    (c) => c >= 0 && c < COLUMNS,
  );

  const cellsFor = (
    orientation: number,
    ax: number,
    ay: number,
  ): [number, number][] | null => {
    switch (orientation) {
      case 0:
        if (ay < 1 || ay >= ROWS || ax < 0 || ax >= COLUMNS) return null;
        return [
          [ax, ay],
          [ax, ay - 1],
        ];
      case 1:
        if (ay < 0 || ay >= ROWS || ax < 0 || ax + 1 >= COLUMNS) return null;
        return [
          [ax, ay],
          [ax + 1, ay],
        ];
      case 2:
        if (ay < 0 || ay + 1 >= ROWS || ax < 0 || ax >= COLUMNS) return null;
        return [
          [ax, ay],
          [ax, ay + 1],
        ];
      case 3:
        if (ay < 0 || ay >= ROWS || ax - 1 < 0 || ax >= COLUMNS) return null;
        return [
          [ax, ay],
          [ax - 1, ay],
        ];
      default:
        return null;
    }
  };

  mizuki.coordinates?.forEach(([x, y]) => {
    pieces[y][x] = null;
  });

  const isFree = (cells: [number, number][]) =>
    cells.every(([x, y]) => pieces[y][x] === null);

  const currentOrient = getOffset(mizuki.sprite);
  let placed = false;

  const tryPlace = (col: number, orientation: number, rotation: number) => {
    const cells = cellsFor(orientation, col, targetY);
    if (!cells || !isFree(cells)) return false;
    mizuki.sprite.rotation = rotation;
    moveToCoordinate(mizuki.sprite, col, targetY);
    updateCoordinates(mizuki.sprite, mizukiIndex, mizuki.character);
    return true;
  };

  for (const col of tryCols) {
    if (tryPlace(col, currentOrient, mizuki.sprite.rotation)) {
      placed = true;
      break;
    }
    if (currentOrient !== 0 && tryPlace(col, 0, Math.PI)) {
      placed = true;
      break;
    }
  }

  if (!placed) {
    updateCoordinates(mizuki.sprite, mizukiIndex, mizuki.character);
    return;
  }

  await fallChunk(sprites);
};

/**
 * Any fries orthogonally adjacent to a Mizuki is eaten.
 * Re-checks after fall in case new adjacencies form.
 */
export const tryMizukiEatFries = async (): Promise<boolean> => {
  if (!isFunModeOn("mizukiShift")) return false;

  let anyEaten = false;

  while (true) {
    const mizukiCells: [number, number][] = [];
    for (const sp of sprites) {
      if (sp.character?.name !== "Mizuki" || !sp.coordinates?.length) continue;
      for (const c of sp.coordinates) mizukiCells.push(c);
    }
    if (mizukiCells.length === 0) break;

    const toEat: SpriteData[] = [];
    for (const sp of sprites) {
      if (!sp.isItem || !sp.itemFile || !sp.coordinates?.length) continue;
      if (!isFriesItem(sp.itemFile)) continue;
      const [fx, fy] = sp.coordinates[0];
      const touches = mizukiCells.some(([mx, my]) =>
        DIRS_ORTHO.some(([dx, dy]) => mx + dx === fx && my + dy === fy),
      );
      if (touches) toEat.push(sp);
    }
    if (toEat.length === 0) break;

    addScore(toEat.length);
    createParticles(toEat);
    removeSpritesFromBoard(toEat);
    anyEaten = true;
    await fallChunk(sprites);
  }

  return anyEaten;
};
