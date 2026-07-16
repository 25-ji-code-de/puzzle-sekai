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
import type { Cell } from "./geometry";
import { unregisterEntitySprite } from "../presentation/entity-view";

/** Wipe footprint cells, remove from stage, drop sprites[], unregister entity views. */
export const removeSpritesFromBoard = (toRemove: SpriteData[]): void => {
  const model = getBoardModel();
  toRemove.forEach((sp) => {
    if (sp.coordinates?.length) {
      model.clear(sp.coordinates as Cell[]);
    }
    if (sp.entityId) {
      unregisterEntitySprite(sp.entityId);
    }
    app.stage.removeChild(sp.sprite);
  });
  setSprites(
    sprites.filter((s) => !toRemove.find((sp) => s.sprite === sp.sprite)),
  );
};

/** Sprites whose coordinates intersect any cell in `chunk`. */
export const spritesInChunk = (chunk: [number, number][]): SpriteData[] => {
  const keys = new Set(chunk.map(([x, y]) => `${x},${y}`));
  return sprites.filter(
    (sprite) =>
      !!sprite.coordinates?.some(([x, y]) => keys.has(`${x},${y}`)),
  );
};
