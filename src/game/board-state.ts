/**
 * Live board occupancy — facade over domain BoardModel + sprite list.
 */
import type * as PIXI from "pixi.js-legacy";
import type { CharacterName } from "../characters/ids";
import type { GroupName } from "../settings/types";
import type { BoardCell, BoardGrid } from "../domain/types";
import { ITEM_TOKEN } from "../domain/types";
import { getLiveBoard, resetLiveBoard } from "../domain/board";

export type { BoardCell, BoardGrid };
export { ITEM_TOKEN };

export interface SpriteData {
  sprite: PIXI.Sprite;
  coordinates?: [number, number][];
  character?: { name: CharacterName; group: GroupName | string };
  isItem?: boolean;
  itemFile?: string;
  isShrunk?: boolean;
}

export let sprites: SpriteData[] = [];
export const setSprites = (s: SpriteData[]) => {
  sprites = s;
};

/** Live grid — always the BoardModel singleton grid reference. */
export let pieces: BoardGrid = getLiveBoard().grid;

export const resetPieces = () => {
  const model = resetLiveBoard();
  pieces = model.grid;
};

export const clearSpritesList = () => {
  sprites = [];
};

/** Access the domain BoardModel; rebinds `pieces` to its grid. */
export const getBoardModel = () => {
  const model = getLiveBoard();
  pieces = model.grid;
  return model;
};
