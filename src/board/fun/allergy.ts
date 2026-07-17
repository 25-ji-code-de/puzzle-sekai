/**
 * にんじん嫌い — carrot allergy fun mode.
 * Ena/Akito touching a carrot are silently cleared.
 */
import { SpriteData, sprites, getGrid } from "../../game/board-state";
import {
  isFunModeOn,
  onKanadeCleared,
  onShizukuCleared,
} from "../../fun/effects";
import { isCarrotItem } from "../../items";
import { DIRS_SELF_ORTHO, cellKey, parseCellKey } from "../grid";
import { playClearAnimation } from "../clear-vfx";
import { spritesInChunk } from "../mutate";
import { addScore } from "../../score";
import { CHAR, isAllergyAvoiderName } from "../../characters/ids";
import { playLoadedSfx } from "../../audio/sfx";

const playCarrotAllergySfx = (name?: string) => {
  const key =
    name === CHAR.Akito
      ? "carrotAkito"
      : name === CHAR.Ena
      ? "carrotEna"
      : null;
  if (!key) return;
  playLoadedSfx(key, "voice", 0.5);
};

/** Silent clear of allergy victims (no group voice / wonder blast). */
const silentClearChunk = async (chunk: [number, number][]): Promise<void> => {
  const toRemove = spritesInChunk(chunk);
  if (toRemove.length === 0) return;

  if (toRemove.some((sp) => sp.character?.name === CHAR.Kanade)) {
    onKanadeCleared();
  }
  if (toRemove.some((sp) => sp.character?.name === CHAR.Shizuku)) {
    const shihoOnBoard = sprites.some(
      (sp) =>
        sp.character?.name === CHAR.Shiho &&
        !toRemove.find((r) => r.sprite === sp.sprite),
    );
    onShizukuCleared(shihoOnBoard);
  }

  addScore(chunk.length);
  await playClearAnimation(toRemove);
};

const clearAllergyCells = async (
  allergyCells: Set<string>,
): Promise<boolean> => {
  const toClear: SpriteData[] = [];
  for (const sp of sprites) {
    if (!sp.cells?.length) continue;
    if (sp.isItem) continue;
    if (!isAllergyAvoiderName(sp.character?.name)) continue;
    const hit = sp.cells.some(([cx, cy]) => allergyCells.has(cellKey(cx, cy)));
    if (!hit) continue;
    toClear.push(sp);
  }
  if (toClear.length === 0) return false;

  const played = new Set<string>();
  for (const sp of toClear) {
    const n = sp.character?.name;
    if (n && !played.has(n)) {
      playCarrotAllergySfx(n);
      played.add(n);
    }
  }

  const chunkKeys = new Set<string>();
  for (const sp of toClear) {
    for (const [cx, cy] of sp.cells!) {
      chunkKeys.add(cellKey(cx, cy));
    }
  }
  const chunk: [number, number][] = [...chunkKeys].map(parseCellKey);
  await silentClearChunk(chunk);
  return true;
};

export const applyCarrotAllergy = async (
  itemX: number,
  landY: number,
): Promise<boolean> => {
  if (!isFunModeOn("itemAllergy")) return false;

  const allergyCells = new Set<string>();
  const grid = getGrid();

  for (let y = 0; y <= landY; y++) {
    for (const [dx, dy] of DIRS_SELF_ORTHO) {
      const nx = itemX + dx;
      const ny = y + dy;
      if (
        ny < 0 ||
        nx < 0 ||
        ny >= grid.length ||
        nx >= (grid[ny]?.length ?? 0)
      ) {
        continue;
      }
      const name = grid[ny][nx];
      if (isAllergyAvoiderName(name)) {
        allergyCells.add(cellKey(nx, ny));
      }
    }
  }

  if (allergyCells.size === 0) return false;
  return clearAllergyCells(allergyCells);
};

/**
 * Reverse direction: Ena/Akito just landed — clear them if any cell is
 * orthogonally adjacent to a carrot item.
 */
export const applyCarrotAllergyOnCharacter = async (
  characterIndex: number,
): Promise<boolean> => {
  if (!isFunModeOn("itemAllergy")) return false;
  const sp = sprites[characterIndex];
  if (!sp?.cells?.length) return false;
  if (!isAllergyAvoiderName(sp.character?.name)) {
    return false;
  }

  let touchesCarrot = false;
  outer: for (const [cx, cy] of sp.cells) {
    for (const [dx, dy] of DIRS_SELF_ORTHO) {
      const nx = cx + dx;
      const ny = cy + dy;
      for (const itemSp of sprites) {
        if (!itemSp.isItem || !itemSp.itemFile || !itemSp.cells) continue;
        if (!isCarrotItem(itemSp.itemFile)) continue;
        if (itemSp.cells.some(([ix, iy]) => ix === nx && iy === ny)) {
          touchesCarrot = true;
          break outer;
        }
      }
    }
  }

  if (!touchesCarrot) return false;

  playCarrotAllergySfx(sp.character?.name);
  const chunk: [number, number][] = sp.cells.map(([x, y]) => [x, y]);
  await silentClearChunk(chunk);
  return true;
};

/**
 * After gravity: any Ena/Akito that ends orthogonally adjacent to a carrot
 * is cleared (silent, no unit voice).
 */
export const recheckCarrotAllergy = async (): Promise<boolean> => {
  if (!isFunModeOn("itemAllergy")) return false;

  const allergyCells = new Set<string>();
  for (const sp of sprites) {
    if (!isAllergyAvoiderName(sp.character?.name)) continue;
    if (!sp.cells?.length) continue;
    for (const [cx, cy] of sp.cells) {
      for (const [dx, dy] of DIRS_SELF_ORTHO) {
        const nx = cx + dx;
        const ny = cy + dy;
        for (const itemSp of sprites) {
          if (!itemSp.isItem || !itemSp.itemFile || !itemSp.cells) continue;
          if (!isCarrotItem(itemSp.itemFile)) continue;
          if (itemSp.cells.some(([ix, iy]) => ix === nx && iy === ny)) {
            allergyCells.add(cellKey(cx, cy));
          }
        }
      }
    }
  }
  if (allergyCells.size === 0) return false;
  return clearAllergyCells(allergyCells);
};
