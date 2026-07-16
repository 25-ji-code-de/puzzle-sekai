/**
 * Falling item entity (create + auto-fall).
 */
import * as PIXI from "pixi.js-legacy";
import "pixi-sound";
import { app, gameTicker } from "../index";
import { LEFT_BORDER, BOX_SIZE, SPEED, OFFSET_BOTTOM } from "../config";
import { getStackHeight } from "../utils/coords";
import { sfxVol, SFX_LAND_BASE } from "../settings";

export const fallItem = (
  item: PIXI.Sprite,
  onFall?: (sprite: PIXI.Sprite) => void,
) => {
  const cleanup = () => {
    gameTicker.remove(checkOffset);
    onFall && onFall(item);
  };

  const checkOffset = (delta: number) => {
    const stackHeight = getStackHeight(item);
    const dropHeight =
      app.renderer.height -
      (BOX_SIZE / 2 + OFFSET_BOTTOM) -
      BOX_SIZE * stackHeight;
    if (item.y < dropHeight) {
      item.y += SPEED * 4 * delta;
    } else {
      app.loader.resources.land.sound.play({ volume: sfxVol(SFX_LAND_BASE) });
      item.y =
        app.renderer.height -
        (BOX_SIZE / 2 + OFFSET_BOTTOM) -
        BOX_SIZE * stackHeight;
      cleanup();
    }
  };

  gameTicker.add(checkOffset);
};

export const createItem = async (
  file: string,
  index: number,
  onDropped: (sprite: PIXI.Sprite) => void,
) => {
  const texture =
    app.loader.resources[file]?.texture ??
    (await new Promise((resolve) => {
      app.loader
        .add(file)
        .load((_, resources) => resolve(resources[file]!.texture!));
    }));

  const item = new PIXI.Sprite(texture);

  item.x = LEFT_BORDER + index * BOX_SIZE + BOX_SIZE / 2;
  item.y = -BOX_SIZE / 2;

  item.anchor.x = 0.5;
  item.anchor.y = 0.5;

  item.rotation = 0;

  app.stage.addChild(item);

  const cleanup = () => {
    gameTicker.remove(checkOffset);
    onDropped(item);
  };
  const checkOffset = (delta: number) => {
    const stackHeight = getStackHeight(item);
    const dropHeight =
      app.renderer.height -
      (BOX_SIZE / 2 + OFFSET_BOTTOM) -
      BOX_SIZE * stackHeight;
    if (item.y < dropHeight) {
      item.y += SPEED * 4 * delta;
    } else {
      app.loader.resources.land.sound.play({ volume: sfxVol(SFX_LAND_BASE) });
      item.y =
        app.renderer.height -
        (BOX_SIZE / 2 + OFFSET_BOTTOM) -
        BOX_SIZE * stackHeight;
      cleanup();
    }
  };
  gameTicker.add(checkOffset);

  return item;
};
