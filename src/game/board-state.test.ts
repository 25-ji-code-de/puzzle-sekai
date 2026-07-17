/**
 * Live board-state facade tests (no PIXI).
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  getGrid,
  getBoardModel,
  resetGrid,
  clearSpritesList,
} from "./board-state";
import { getLiveBoard } from "../domain/board";
import {
  registerEntitySprite,
  unregisterEntitySprite,
  hasEntitySprite,
  clearEntitySprites,
  getEntitySprite,
} from "../presentation/entity-view";
import {
  createEntityId,
  resetEntityIdSeq,
  cell,
  ITEM_TOKEN,
} from "../domain/types";

describe("board-state grid identity", () => {
  beforeEach(() => {
    resetGrid();
    clearSpritesList();
  });

  it("getGrid() always returns the live BoardModel grid", () => {
    expect(getGrid()).toBe(getLiveBoard().grid);
    expect(getGrid()).toBe(getBoardModel().grid);
  });

  it("resetGrid replaces occupancy and clears entity views", () => {
    const model = getBoardModel();
    model.write([cell(0, 0)], ITEM_TOKEN);
    const id = createEntityId("t");
    registerEntitySprite(id, { dummy: true } as any);
    expect(hasEntitySprite(id)).toBe(true);

    resetGrid();
    expect(getGrid()).toBe(getLiveBoard().grid);
    expect(getGrid().every((row) => row.every((c) => c == null))).toBe(true);
    expect(hasEntitySprite(id)).toBe(false);
  });
});

describe("entity re-register hygiene", () => {
  beforeEach(() => {
    clearEntitySprites();
    resetEntityIdSeq();
  });

  it("unregistering old id before re-register prevents map leak", () => {
    const oldId = createEntityId("c2");
    const newId = createEntityId("sh");
    const spriteA = { tag: "a" } as any;
    const spriteB = { tag: "b" } as any;

    registerEntitySprite(oldId, spriteA);
    expect(getEntitySprite(oldId)).toBe(spriteA);

    // emu-shrink pattern: drop old id, register new
    unregisterEntitySprite(oldId);
    registerEntitySprite(newId, spriteB);

    expect(hasEntitySprite(oldId)).toBe(false);
    expect(getEntitySprite(newId)).toBe(spriteB);
  });
});
