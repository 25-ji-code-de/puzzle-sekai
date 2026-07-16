/**
 * Live board occupancy — sprites list + grid name map.
 * Separated from game-flow state machine so board/* can depend on board
 * state without importing the full play session.
 */
import type * as PIXI from "pixi.js-legacy";
import { ROWS, COLUMNS } from "../config";
import type { CharacterName } from "../characters/ids";
import type { GroupName } from "../settings/types";
import type { BoardCell, BoardGrid } from "../domain/types";
import { ITEM_TOKEN } from "../domain/types";

export type { BoardCell, BoardGrid };
export { ITEM_TOKEN };

export interface SpriteData {
  sprite: PIXI.Sprite;
  coordinates?: [number, number][];
  character?: { name: CharacterName; group: GroupName | string };
  isItem?: boolean;
  /** Source asset path for items (carrot / fries detection) */
  itemFile?: string;
  /** Emu shrunk to 1 cell by えむちぢみ fun mode */
  isShrunk?: boolean;
}

export let sprites: SpriteData[] = [];
export const setSprites = (s: SpriteData[]) => {
  sprites = s;
};

export let pieces: BoardGrid = Array(ROWS)
  .fill(null)
  .map(() => [...Array(COLUMNS).fill(null)]);

export const resetPieces = () => {
  pieces = Array(ROWS)
    .fill(null)
    .map(() => [...Array(COLUMNS).fill(null)]);
};

export const clearSpritesList = () => {
  sprites = [];
};
