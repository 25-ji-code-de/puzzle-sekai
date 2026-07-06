import * as PIXI from "pixi.js-legacy";
import "pixi-sound";
import { app, gameTicker } from ".";
import { LEFT_BORDER, BOX_SIZE, SPEED, OFFSET_BOTTOM } from "./config";
import { getStackHeight } from "./utils";
import material205 from "./assets/objects/material205.png";
import material218 from "./assets/objects/material218.png";
import material221 from "./assets/objects/material221.png";
import material222 from "./assets/objects/material222.png";
import material225 from "./assets/objects/material225.png";
import material226 from "./assets/objects/material226.png";

export const items = [material205, material218, material221, material222, material225, material226];

export const fallItem = (
  item: PIXI.Sprite,
  onFall?: (sprite: PIXI.Sprite) => void,
) => {
  const cleanup = () => {
    gameTicker.remove(checkOffset);
    onFall && onFall(item);
  };

  const checkOffset = () => {
    const stackHeight = getStackHeight(item);
    const dropHeight =
      app.renderer.height -
      (BOX_SIZE / 2 + OFFSET_BOTTOM) -
      BOX_SIZE * stackHeight;
    if (item.y < dropHeight) {
      item.y += SPEED * 4;
    } else {
      app.loader.resources.land.sound.play({ volume: 0.5 });
      item.y =
        app.renderer.height -
        (BOX_SIZE / 2 + OFFSET_BOTTOM) -
        BOX_SIZE * stackHeight;
      cleanup();
    }
    // each frame we spin the bunny around a bit
  };

  // Listen for frame updates
  gameTicker.add(checkOffset);
};

export const createItem = async (
  file: string,
  index: number,
  onDropped: (sprite: PIXI.Sprite) => void,
) => {
  // load the texture we need
  const texture =
    app.loader.resources[file]?.texture ??
    (await new Promise((resolve) => {
      app.loader
        .add(file)
        .load((_, resources) => resolve(resources[file]?.texture));
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
  const checkOffset = () => {
    // each frame we spin the bunny around a bit
    const stackHeight = getStackHeight(item);
    const dropHeight =
      app.renderer.height -
      (BOX_SIZE / 2 + OFFSET_BOTTOM) -
      BOX_SIZE * stackHeight;
    if (item.y < dropHeight) {
      item.y += SPEED * 4;
    } else {
      app.loader.resources.land.sound.play({ volume: 0.5 });
      item.y =
        app.renderer.height -
        (BOX_SIZE / 2 + OFFSET_BOTTOM) -
        BOX_SIZE * stackHeight;
      cleanup();
    }
  };
  // Listen for frame updates
  gameTicker.add(checkOffset);

  return item;
};
