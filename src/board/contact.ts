/**
 * Item / character contact helpers for fun modes (allergy, mizuki lock).
 * Pure grid math lives in contact-math.ts (unit-testable without PIXI).
 */
import { sprites, getGrid } from "../game/board-state";
import { isFunModeOn } from "../fun/effects";
import { isCarrotItem, isFriesItem } from "../items";
import { isContinuousPhysics, entitiesTouching } from "./dynamics";
import { pieceKindFrom } from "../domain/types";
import {
  contactColumnsForItemOnGrid,
  continuousContactColumnsForItem,
} from "./contact-math";

export {
  cellsTouch,
  contactColumnsForItemOnGrid,
  continuousContactColumnsForItem,
  landYInColumnFromGrid,
} from "./contact-math";

const contactColumnsForItem = (itemX: number, itemY: number): number[] =>
  contactColumnsForItemOnGrid(getGrid(), itemX, itemY);

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
