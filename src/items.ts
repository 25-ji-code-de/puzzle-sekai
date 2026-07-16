import * as PIXI from "pixi.js-legacy";
import "pixi-sound";
import { app, gameTicker } from ".";
import { LEFT_BORDER, BOX_SIZE, SPEED, OFFSET_BOTTOM } from "./config";
import { getStackHeight } from "./utils";
import { sfxVol, SFX_LAND_BASE } from "./settings";

// Import all item images
import material008 from "./assets/objects/material008.png";
import material013 from "./assets/objects/material013.png";
import material044 from "./assets/objects/material044.png";
import material105 from "./assets/objects/material105.png";
import material106 from "./assets/objects/material106.png";
import material107 from "./assets/objects/material107.png";
import material108 from "./assets/objects/material108.png";
import material109 from "./assets/objects/material109.png";
import material110 from "./assets/objects/material110.png";
import material111 from "./assets/objects/material111.png";
import material112 from "./assets/objects/material112.png";
import material113 from "./assets/objects/material113.png";
import material205 from "./assets/objects/material205.png";
import material218 from "./assets/objects/material218.png";
import material221 from "./assets/objects/material221.png";
import material222 from "./assets/objects/material222.png";
import material225 from "./assets/objects/material225.png";
import material226 from "./assets/objects/material226.png";

// Item groups - each group contains variants of the same item
const itemGroups: string[][] = [
  [material008, material013],           // Group A: 008, 013 (carrots / にんじん)
  [material044, material105, material106, material107, material108, material109, material110, material111, material112, material113], // Group B: 044, 105-113 (fries / ポテト)
  [material218, material221],           // Group C: 218, 221
  [material222, material225],           // Group D: 222, 225
  [material205],                        // Group E: 205 (no variants)
  [material226],                        // Group F: 226 (no variants)
];

/** Group A: carrot materials (にんじん) — used by itemAllergy fun mode */
export const CARROT_ITEMS = [material008, material013];
export const isCarrotItem = (file: string) => CARROT_ITEMS.includes(file);

/** Group B: fries / ポテト / 薯条 — used by mizukiShift fun mode */
export const FRIES_ITEMS: readonly string[] = itemGroups[1];
export const isFriesItem = (file: string): boolean =>
  FRIES_ITEMS.includes(file);

// Get a random item - first select group, then select variant
export const getRandomItem = (): string => {
  // Select a random group
  const group = itemGroups[Math.floor(Math.random() * itemGroups.length)];
  // Select a random variant from the group
  return group[Math.floor(Math.random() * group.length)];
};

// For backward compatibility, export a flat list of all items
export const items = itemGroups.flat();

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
  // Listen for frame updates
  gameTicker.add(checkOffset);

  return item;
};
