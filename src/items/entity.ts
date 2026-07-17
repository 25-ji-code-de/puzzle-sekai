/**
 * Falling item entity (create + auto-fall via shared active-fall loop).
 */
import * as PIXI from "pixi.js-legacy";
import "pixi-sound";
import { app } from "../runtime";
import { LEFT_BORDER, BOX_SIZE, SPEED, STAGE_HEIGHT } from "../config";
import { activeLandPixelY, stackHeightForPrimary } from "../domain/piece";
import { primaryFromSprite } from "../presentation/placement";
import { getGrid } from "../game/board-state";
import { loadTexture } from "../assets/load-texture";
import { createActiveFall } from "../active/active-fall";
import {
  castDownY,
  createActiveBody,
  isContinuousPhysics,
} from "../board/dynamics";

const landYFor = (item: PIXI.Sprite): number => {
  if (isContinuousPhysics()) {
    return castDownY("item", item.x, item.y, item.rotation, item);
  }
  const primary = primaryFromSprite(item, "item", "floor");
  return activeLandPixelY(
    "item",
    stackHeightForPrimary(getGrid(), primary, 0, "item"),
    0,
    STAGE_HEIGHT,
  );
};

const startItemFall = (
  item: PIXI.Sprite,
  onLand: (sprite: PIXI.Sprite) => void,
) => {
  // Items always soft-drop (4×) with instant land lock, no move SFX.
  const fall = createActiveFall(item, SPEED, {
    softDropMult: 4,
    moveSfx: false,
    landSfx: true,
    landLockMs: 0,
  });
  fall.softDrop();
  fall.start(
    () => landYFor(item),
    () => landYFor(item),
    () => onLand(item),
  );
};

export const fallItem = (
  item: PIXI.Sprite,
  onFall?: (sprite: PIXI.Sprite) => void,
) => {
  startItemFall(item, (s) => onFall?.(s));
};

export const createItem = async (
  file: string,
  index: number,
  onDropped: (sprite: PIXI.Sprite) => void,
) => {
  const texture = await loadTexture(file);
  const item = new PIXI.Sprite(texture);

  item.x = LEFT_BORDER + index * BOX_SIZE + BOX_SIZE / 2;
  item.y = -BOX_SIZE / 2;

  item.anchor.x = 0.5;
  item.anchor.y = 0.5;

  item.rotation = 0;

  app.stage.addChild(item);
  if (isContinuousPhysics()) {
    createActiveBody(item, "item", { itemFile: file, assetFile: file });
  }
  startItemFall(item, onDropped);

  return item;
};
