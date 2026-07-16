/**
 * Presentation layer: EntityId → PIXI.Sprite registry.
 * Domain logic uses entity ids; rendering looks up sprites here.
 * SpriteData still holds a back-reference for gradual migration.
 */
import type * as PIXI from "pixi.js-legacy";
import type { EntityId } from "../domain/types";
import { resetEntityIdSeq } from "../domain/types";

const byId = new Map<EntityId, PIXI.Sprite>();

export const registerEntitySprite = (
  id: EntityId,
  sprite: PIXI.Sprite,
): void => {
  byId.set(id, sprite);
};

export const unregisterEntitySprite = (id: EntityId): void => {
  byId.delete(id);
};

export const getEntitySprite = (id: EntityId): PIXI.Sprite | undefined =>
  byId.get(id);

export const hasEntitySprite = (id: EntityId): boolean => byId.has(id);

export const clearEntitySprites = (): void => {
  byId.clear();
  resetEntityIdSeq();
};

/** Snapshot of registered ids (debug / tests). */
export const listEntityIds = (): EntityId[] => [...byId.keys()];

export const entitySpriteCount = (): number => byId.size;
