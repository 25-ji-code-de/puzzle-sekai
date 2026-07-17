/**
 * Live match occupancy — sprites list + BoardModel grid.
 *
 * - `sprites[]`: ordered settled set (PIXI ownership + iteration)
 * - presentation Map: EntityId → Sprite index (see presentation/entity-view)
 * - grid: always BoardModel.grid via getGrid() — never a stale export alias
 */
import type * as PIXI from "pixi.js-legacy";
import type { CharacterName } from "../characters/ids";
import type { GroupName } from "../settings/types";
import type { BoardGrid, Cell, EntityId } from "../domain/types";
import { getLiveBoard, resetLiveBoard } from "../domain/board";
import { clearEntitySprites } from "../presentation/entity-view";

export interface SpriteData {
  sprite: PIXI.Sprite;
  /** Settled footprint in grid space (branded cells). */
  cells?: Cell[];
  character?: { name: CharacterName; group: GroupName | "Special" };
  isItem?: boolean;
  itemFile?: string;
  isShrunk?: boolean;
  /** Domain entity id once settled (assigned in commitLandedSprite / shrink). */
  entityId?: EntityId;
}

export let sprites: SpriteData[] = [];
export const setSprites = (s: SpriteData[]) => {
  sprites = s;
};

/** Live occupancy grid — always the BoardModel singleton grid reference. */
export const getGrid = (): BoardGrid => getLiveBoard().grid;

export const resetGrid = () => {
  resetLiveBoard();
  clearEntitySprites();
};

export const clearSpritesList = () => {
  sprites = [];
  clearEntitySprites();
};

/** Access the domain BoardModel. */
export const getBoardModel = () => getLiveBoard();
