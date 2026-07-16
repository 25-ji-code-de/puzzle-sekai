/**
 * Next-piece preview sprite + intro fly animation.
 */
import * as PIXI from "pixi.js-legacy";
import { app, gameTicker } from "../index";
import {
  BOX_SIZE,
  SPEED,
  NEXT_CHARACTER_Y,
  NEXT_CHARACTER_X,
} from "../config";
import { getCurrentSettings, getSpeedMultiplier } from "../settings";
import { loadTexture } from "../assets/load-texture";

export const fly = (
  sprite: PIXI.Sprite,
  onExit: (sprite: PIXI.Sprite) => void,
) => {
  const settings = getCurrentSettings();
  const speedMultiplier = getSpeedMultiplier(settings);
  const handleFly = (delta: number) => {
    sprite.y -= 25 * SPEED * speedMultiplier * delta;
    if (sprite.y + 2 * BOX_SIZE < 0) {
      gameTicker.remove(handleFly);
      onExit(sprite);
    }
  };
  gameTicker.add(handleFly);
};

export const showNextPiece = async (file: string) => {
  const texture = await loadTexture(file);

  const preview = new PIXI.Sprite(texture);
  preview.anchor.x = 0.5;
  preview.anchor.y = 1;

  preview.y = NEXT_CHARACTER_Y;
  preview.x = NEXT_CHARACTER_X;

  app.stage.addChild(preview);
  return preview;
};
