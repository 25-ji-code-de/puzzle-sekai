/**
 * にんじん嫌い — carrot allergy fun mode.
 * Ena/Akito touching a carrot are silently cleared.
 */
import { app } from "../../index";
import {
  SpriteData,
  sprites,
  pieces,
} from "../../game/board-state";
import { isFunModeOn } from "../../fun/effects";
import { isCarrotItem } from "../../items";
import { voiceVol } from "../../settings";
import { DIRS_SELF_ORTHO, cellKey, parseCellKey } from "../grid";
import { playClearAnimation } from "../clear-vfx";
import { spritesInChunk } from "../mutate";
import { addScore } from "../../score";
import {
  onKanadeCleared,
  onShizukuCleared,
} from "../../fun/effects";

const playCarrotAllergySfx = (name?: string) => {
  const key =
    name === "Akito" ? "carrotAkito" : name === "Ena" ? "carrotEna" : null;
  if (!key) return;
  const sfx = app.loader.resources[key]?.sound;
  if (sfx) sfx.play({ volume: voiceVol(0.5) });
};

/** Silent clear of allergy victims (no group voice / wonder blast). */
const silentClearChunk = async (chunk: [number, number][]): Promise<void> => {
  const toRemove = spritesInChunk(chunk);
  if (toRemove.length === 0) return;

  if (toRemove.some((sp) => sp.character?.name === "Kanade")) {
    onKanadeCleared();
  }
  if (toRemove.some((sp) => sp.character?.name === "Shizuku")) {
    const shihoOnBoard = sprites.some(
      (sp) =>
        sp.character?.name === "Shiho" &&
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
    if (!sp.coordinates?.length) continue;
    if (sp.isItem) continue;
    if (sp.character?.name !== "Ena" && sp.character?.name !== "Akito") continue;
    const hit = sp.coordinates.some(([cx, cy]) =>
      allergyCells.has(cellKey(cx, cy)),
    );
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
    for (const [cx, cy] of sp.coordinates!) {
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

  for (let y = 0; y <= landY; y++) {
    for (const [dx, dy] of DIRS_SELF_ORTHO) {
      const nx = itemX + dx;
      const ny = y + dy;
      if (
        ny < 0 ||
        nx < 0 ||
        ny >= pieces.length ||
        nx >= (pieces[ny]?.length ?? 0)
      ) {
        continue;
      }
      const name = pieces[ny][nx];
      if (name === "Ena" || name === "Akito") {
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
  if (!sp?.coordinates?.length) return false;
  if (sp.character?.name !== "Ena" && sp.character?.name !== "Akito") {
    return false;
  }

  let touchesCarrot = false;
  outer: for (const [cx, cy] of sp.coordinates) {
    for (const [dx, dy] of DIRS_SELF_ORTHO) {
      const nx = cx + dx;
      const ny = cy + dy;
      for (const itemSp of sprites) {
        if (!itemSp.isItem || !itemSp.itemFile || !itemSp.coordinates) continue;
        if (!isCarrotItem(itemSp.itemFile)) continue;
        if (itemSp.coordinates.some(([ix, iy]) => ix === nx && iy === ny)) {
          touchesCarrot = true;
          break outer;
        }
      }
    }
  }

  if (!touchesCarrot) return false;

  playCarrotAllergySfx(sp.character?.name);
  const chunk: [number, number][] = sp.coordinates.map(([x, y]) => [x, y]);
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
    if (sp.character?.name !== "Ena" && sp.character?.name !== "Akito") continue;
    if (!sp.coordinates?.length) continue;
    for (const [cx, cy] of sp.coordinates) {
      for (const [dx, dy] of DIRS_SELF_ORTHO) {
        const nx = cx + dx;
        const ny = cy + dy;
        for (const itemSp of sprites) {
          if (!itemSp.isItem || !itemSp.itemFile || !itemSp.coordinates) continue;
          if (!isCarrotItem(itemSp.itemFile)) continue;
          if (itemSp.coordinates.some(([ix, iy]) => ix === nx && iy === ny)) {
            allergyCells.add(cellKey(cx, cy));
          }
        }
      }
    }
  }
  if (allergyCells.size === 0) return false;
  return clearAllergyCells(allergyCells);
};
