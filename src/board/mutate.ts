/**
 * Low-level board mutations shared by clear animation and fun-mode effects.
 */
import { app } from "../runtime";
import {
  SpriteData,
  sprites,
  setSprites,
  getBoardModel,
} from "../game/board-state";
import type { Cell } from "../domain/types";
import { unregisterEntitySprite } from "../presentation/entity-view";
import {
  continuousRemoveBody,
  isContinuousPhysics,
} from "./dynamics";

/** Wipe footprint cells, remove from stage, drop sprites[], unregister entity views. */
export const removeSpritesFromBoard = (toRemove: SpriteData[]): void => {
  const model = getBoardModel();
  const continuous = isContinuousPhysics();
  toRemove.forEach((sp) => {
    if (!continuous && sp.cells?.length) {
      model.clear(sp.cells as Cell[]);
    }
    if (continuous && sp.entityId) {
      continuousRemoveBody(sp.entityId);
    }
    if (sp.entityId) {
      unregisterEntitySprite(sp.entityId);
    }
    // Drop filters before destroy so ColorMatrix FBOs are released.
    sp.sprite.filters = [];
    if (sp.sprite.parent) {
      sp.sprite.parent.removeChild(sp.sprite);
    }
    // Destroy display object only — keep shared BaseTexture from the loader.
    try {
      sp.sprite.destroy({ children: true, texture: false, baseTexture: false });
    } catch {
      try {
        app.stage.removeChild(sp.sprite);
      } catch {
        /* ignore */
      }
    }
  });
  setSprites(
    sprites.filter((s) => !toRemove.find((sp) => s.sprite === sp.sprite)),
  );
};

/** Sprites whose cells intersect any cell in `chunk`. */
export const spritesInChunk = (chunk: [number, number][]): SpriteData[] => {
  const keys = new Set(chunk.map(([x, y]) => `${x},${y}`));
  return sprites.filter(
    (sprite) => !!sprite.cells?.some(([x, y]) => keys.has(`${x},${y}`)),
  );
};
