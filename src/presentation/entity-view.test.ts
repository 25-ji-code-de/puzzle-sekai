/**
 * Entity view registry tests (no PIXI runtime).
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  registerEntitySprite,
  unregisterEntitySprite,
  getEntitySprite,
  clearEntitySprites,
  entitySpriteCount,
  listEntityIds,
} from "./entity-view";
import { createEntityId, resetEntityIdSeq } from "../domain/types";

describe("entity-view map", () => {
  beforeEach(() => {
    clearEntitySprites();
    resetEntityIdSeq();
  });

  it("registers and resolves sprites by EntityId", () => {
    const id = createEntityId("t");
    const fake = { name: "sprite" } as unknown as PIXI.Sprite;
    registerEntitySprite(id, fake);
    expect(getEntitySprite(id)).toBe(fake);
    expect(entitySpriteCount()).toBe(1);
    expect(listEntityIds()).toEqual([id]);
  });

  it("unregisters and clears", () => {
    const id = createEntityId("t");
    const fake = { name: "sprite" } as unknown as PIXI.Sprite;
    registerEntitySprite(id, fake);
    unregisterEntitySprite(id);
    expect(getEntitySprite(id)).toBeUndefined();
    expect(entitySpriteCount()).toBe(0);
  });
});
