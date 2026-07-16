/**
 * Low-level board mutations shared by clear animation and fun-mode effects.
 */
import { app } from "../index";
import {
  SpriteData,
  sprites,
  pieces,
  setSprites,
} from "../game/board-state";

/** Wipe footprint cells, remove from stage, and drop from sprites[]. */
export const removeSpritesFromBoard = (toRemove: SpriteData[]): void => {
  toRemove.forEach((sp) => {
    sp.coordinates?.forEach(([x, y]) => {
      pieces[y][x] = null;
    });
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
