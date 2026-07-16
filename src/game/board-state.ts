/**
 * Live board occupancy — facade over domain BoardModel + sprite list.
 * Separated from game-flow state machine so board/* can depend on occupancy
 * without importing the full play session.
 *
 * entityId links a settled SpriteData row to a domain BoardEntity identity.
 * Full Map<EntityId, Sprite> presentation split can land later; today the
 * sprite remains on SpriteData for PIXI ownership.
 */
import type * as PIXI from "pixi.js-legacy";
import type { CharacterName } from "../characters/ids";
import type { GroupName } from "../settings/types";
import type { BoardCell, BoardGrid, EntityId } from "../domain/types";
import { ITEM_TOKEN } from "../domain/types";
import { getLiveBoard, resetLiveBoard } from "../domain/board";
import { clearEntitySprites } from "../presentation/entity-view";

export type { BoardCell, BoardGrid, EntityId };
export { ITEM_TOKEN };

export interface SpriteData {
  sprite: PIXI.Sprite;
  coordinates?: [number, number][];
  character?: { name: CharacterName; group: GroupName | "Special" };
  isItem?: boolean;
  itemFile?: string;
  isShrunk?: boolean;
  /** Domain entity id once settled (assigned in updateCoordinates / shrink). */
  entityId?: EntityId;
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
  clearEntitySprites();
};

export const clearSpritesList = () => {
  sprites = [];
  clearEntitySprites();
};

/** Access the domain BoardModel; rebinds `pieces` to its grid. */
export const getBoardModel = () => {
  const model = getLiveBoard();
  pieces = model.grid;
  return model;
};
