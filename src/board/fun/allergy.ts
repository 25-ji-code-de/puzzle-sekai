/**
 * にんじん嫌い — carrot allergy fun mode.
 * Ena/Akito touching a carrot are silently cleared.
 * Grid path: cell ortho. Continuous: body proximity.
 */
import type * as PIXI from "pixi.js-legacy";
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
import { characterTouchesItem } from "../contact";
import { isContinuousPhysics, massOfKind } from "../dynamics";
import { pieceKindFrom } from "../../domain/types";
import { BOX_SIZE } from "../../config";
// Vite URL keys — same pattern as character fall voices.
// Loader aliases "carrotAkito"/"carrotEna" often have no .sound attached.
import carrotAkitoSfx from "../../assets/sounds/effects/2509_004_002.mp3";
import carrotEnaSfx from "../../assets/sounds/effects/2509_004_003.mp3";

/** Continuous allergy contact: looser than generic CONTACT_GAP so stacks still trigger. */
const ALLERGY_CONTACT_GAP = Math.max(24, BOX_SIZE * 0.2);

const playCarrotAllergySfx = (name?: string) => {
  const url =
    name === CHAR.Akito
      ? carrotAkitoSfx
      : name === CHAR.Ena
        ? carrotEnaSfx
        : null;
  if (!url) return;
  playLoadedSfx(url, "voice", 0.55);
};

const scoreUnits = (sp: SpriteData): number => {
  if (typeof sp.mass === "number") return sp.mass;
  if (sp.cells?.length) return sp.cells.length;
  return massOfKind(
    pieceKindFrom({
      characterName: sp.character?.name,
      isItem: sp.isItem,
      isShrunk: sp.isShrunk,
    }),
  );
};

/** Silent clear of allergy victims (no group voice / wonder blast). */
const silentClearSprites = async (toRemove: SpriteData[]): Promise<void> => {
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

  addScore(toRemove.reduce((s, sp) => s + scoreUnits(sp), 0));
  await playClearAnimation(toRemove);
};

const silentClearChunk = async (chunk: [number, number][]): Promise<void> => {
  await silentClearSprites(spritesInChunk(chunk));
};

const playAllergyVoices = (toClear: SpriteData[]): void => {
  const played = new Set<string>();
  for (const sp of toClear) {
    const n = sp.character?.name;
    if (n && !played.has(n)) {
      playCarrotAllergySfx(n);
      played.add(n);
    }
  }
};

const clearAllergySprites = async (toClear: SpriteData[]): Promise<boolean> => {
  if (toClear.length === 0) return false;
  playAllergyVoices(toClear);
  await silentClearSprites(toClear);
  return true;
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

  playAllergyVoices(toClear);

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

  if (isContinuousPhysics()) {
    return recheckCarrotAllergy();
  }

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
 * Prefer live sprite ref — spawn-time index goes stale after mid-fall clears.
 */
const resolveLandedCharacter = (
  characterIndex: number,
  sprite?: PIXI.Sprite,
): SpriteData | undefined => {
  if (sprite) {
    const found = sprites.find((s) => s.sprite === sprite);
    if (found) return found;
  }
  const byIndex = sprites[characterIndex];
  if (byIndex && isAllergyAvoiderName(byIndex.character?.name)) return byIndex;
  for (let i = sprites.length - 1; i >= 0; i--) {
    if (isAllergyAvoiderName(sprites[i].character?.name)) return sprites[i];
  }
  return undefined;
};

/**
 * Reverse direction: Ena/Akito just landed — clear them if adjacent to a carrot.
 */
export const applyCarrotAllergyOnCharacter = async (
  characterIndex: number,
  sprite?: PIXI.Sprite,
): Promise<boolean> => {
  if (!isFunModeOn("itemAllergy")) return false;
  const sp = resolveLandedCharacter(characterIndex, sprite);
  if (!sp) return false;
  if (!isAllergyAvoiderName(sp.character?.name)) return false;

  if (isContinuousPhysics()) {
    if (!characterTouchesItem(sp, isCarrotItem, ALLERGY_CONTACT_GAP)) {
      return false;
    }
    playCarrotAllergySfx(sp.character?.name);
    await silentClearSprites([sp]);
    return true;
  }

  if (!sp.cells?.length) return false;

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
 * After gravity: any Ena/Akito adjacent to a carrot is cleared + allergy voice.
 */
export const recheckCarrotAllergy = async (): Promise<boolean> => {
  if (!isFunModeOn("itemAllergy")) return false;

  if (isContinuousPhysics()) {
    const toClear = sprites.filter(
      (sp) =>
        isAllergyAvoiderName(sp.character?.name) &&
        characterTouchesItem(sp, isCarrotItem, ALLERGY_CONTACT_GAP),
    );
    return clearAllergySprites(toClear);
  }

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
