/**
 * ポテトと瑞希 — Mizuki teleports above fries; eats adjacent fries.
 * Grid: cell ortho. Continuous: pose teleport + proximity eat.
 */
import { addScore } from "../../score";
import { BOX_SIZE, COLUMNS, ROWS } from "../../config";
import {
  SpriteData,
  sprites,
  getGrid,
  getBoardModel,
} from "../../game/board-state";
import { isFunModeOn } from "../../fun/effects";
import { isFriesItem } from "../../items";
import { SFX_EFFECT_BASE } from "../../settings";
import { playLoadedSfx } from "../../audio/sfx";
import { commitLandedSprite, fallChunk } from "../core";
import { createParticles } from "../particles";
import { removeSpritesFromBoard } from "../mutate";
import { DIRS_ORTHO } from "../grid";
import type { Cell } from "../../domain/types";
import { asOrientation, rotationToOrientation } from "../../domain/types";
import { footprintFromPrimary } from "../../domain/piece";
import { placeSpriteAtAnchor } from "../../presentation/placement";
import { CHAR } from "../../characters/ids";
import { characterTouchesItem } from "../contact";
import { isContinuousPhysics, setBodyPose, wakeBody } from "../dynamics";

/** 2-cell footprint for primary (ax,ay) if every cell is on-board; else null. */
const cellsFor = (
  orientation: number,
  ax: number,
  ay: number,
): Cell[] | null => {
  const cells = footprintFromPrimary(
    { x: ax, y: ay },
    asOrientation(orientation),
    "cell2",
  );
  const inBoard = cells.every(
    ([x, y]) => x >= 0 && x < COLUMNS && y >= 0 && y < ROWS,
  );
  return inBoard ? cells : null;
};

export const applyMizukiShift = async (
  itemX: number,
  itemY: number,
): Promise<void> => {
  if (!isFunModeOn("mizukiShift")) return;

  if (isContinuousPhysics()) {
    // Find nearest fries item sprite and nearest Mizuki
    const fries = sprites.filter(
      (sp) => sp.isItem && sp.itemFile && isFriesItem(sp.itemFile),
    );
    if (!fries.length) return;
    let bestM: SpriteData | null = null;
    let bestDist = Infinity;
    let bestF: SpriteData | null = null;
    for (const m of sprites) {
      if (m.character?.name !== CHAR.Mizuki) continue;
      for (const f of fries) {
        const d = Math.hypot(m.sprite.x - f.sprite.x, m.sprite.y - f.sprite.y);
        if (d < bestDist) {
          bestDist = d;
          bestM = m;
          bestF = f;
        }
      }
    }
    if (!bestM || !bestF) return;
    // Teleport above fries
    const tx = bestF.sprite.x;
    const ty = bestF.sprite.y - BOX_SIZE;
    bestM.sprite.x = tx;
    bestM.sprite.y = ty;
    if (bestM.entityId) {
      setBodyPose(bestM.entityId, tx, ty, bestM.sprite.rotation);
      wakeBody(bestM.entityId);
    }
    await fallChunk(sprites);
    return;
  }

  type Cand = { index: number; dist: number };
  let best: Cand | null = null;
  for (let i = 0; i < sprites.length; i++) {
    const sp = sprites[i];
    if (sp.character?.name !== CHAR.Mizuki || !sp.cells?.length) continue;
    const dist = Math.min(
      ...sp.cells.map(([x, y]) => Math.abs(x - itemX) + Math.abs(y - itemY)),
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

  if (mizuki.cells?.length) {
    getBoardModel().clear(mizuki.cells as Cell[]);
  }

  const grid = getGrid();
  const isFree = (cells: Cell[]) =>
    cells.every(([x, y]) => grid[y][x] === null);

  const currentOrient = rotationToOrientation(mizuki.sprite.rotation);
  let placed = false;

  const tryPlace = (col: number, orientation: number, rotation: number) => {
    const cells = cellsFor(orientation, col, targetY);
    if (!cells || !isFree(cells)) return false;
    mizuki.sprite.rotation = rotation;
    placeSpriteAtAnchor(mizuki.sprite, "cell2", col, targetY);
    commitLandedSprite(mizuki.sprite, mizukiIndex, mizuki.character);
    return true;
  };

  for (const col of tryCols) {
    if (tryPlace(col, currentOrient, mizuki.sprite.rotation)) {
      placed = true;
      break;
    }
    // fall back to vertical (orient 0 / rotation π)
    if (currentOrient !== 0 && tryPlace(col, 0, Math.PI)) {
      placed = true;
      break;
    }
  }

  if (!placed) {
    commitLandedSprite(mizuki.sprite, mizukiIndex, mizuki.character);
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
    if (isContinuousPhysics()) {
      const toEat: SpriteData[] = [];
      for (const sp of sprites) {
        if (!sp.isItem || !sp.itemFile || !isFriesItem(sp.itemFile)) continue;
        const touched = sprites.some(
          (m) =>
            m.character?.name === CHAR.Mizuki &&
            characterTouchesItem(m, isFriesItem) &&
            // characterTouchesItem checks any fries; ensure this fries
            Math.hypot(m.sprite.x - sp.sprite.x, m.sprite.y - sp.sprite.y) <
              BOX_SIZE * 1.6,
        );
        if (touched) toEat.push(sp);
      }
      if (toEat.length === 0) break;
      addScore(toEat.length);
      createParticles(toEat);
      // Crunch SFX once per eat wave (even if multiple fries).
      playLoadedSfx("nom", "sfx", SFX_EFFECT_BASE);
      removeSpritesFromBoard(toEat);
      anyEaten = true;
      await fallChunk(sprites);
      continue;
    }

    const mizukiCells: [number, number][] = [];
    for (const sp of sprites) {
      if (sp.character?.name !== CHAR.Mizuki || !sp.cells?.length) continue;
      for (const c of sp.cells) mizukiCells.push(c);
    }
    if (mizukiCells.length === 0) break;

    const toEat: SpriteData[] = [];
    for (const sp of sprites) {
      if (!sp.isItem || !sp.itemFile || !sp.cells?.length) continue;
      if (!isFriesItem(sp.itemFile)) continue;
      const [fx, fy] = sp.cells[0];
      const touches = mizukiCells.some(([mx, my]) =>
        DIRS_ORTHO.some(([dx, dy]) => mx + dx === fx && my + dy === fy),
      );
      if (touches) toEat.push(sp);
    }
    if (toEat.length === 0) break;

    addScore(toEat.length);
    createParticles(toEat);
    playLoadedSfx("nom", "sfx", SFX_EFFECT_BASE);
    removeSpritesFromBoard(toEat);
    anyEaten = true;
    await fallChunk(sprites);
  }

  return anyEaten;
};
