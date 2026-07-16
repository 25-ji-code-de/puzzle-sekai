/**
 * 2×2 piece (NeneRobo / Mikudayo): active controller.
 *
 * Single coordinate convention: domain **bottom-right primary**
 * via primaryFromSprite / willCollidePrimary / stackHeightForPrimary.
 */
import * as PIXI from "pixi.js-legacy";
import "pixi-sound";
import { app, gameTicker } from "../runtime";
import {
  LEFT_BORDER,
  RIGHT_BORDER,
  BOX_SIZE,
  SPEED,
  FALL_DELAY,
  FALL_SPEED,
} from "../config";
import { pieces } from "../game/board-state";
import { addDropScore } from "../score";
import {
  getCurrentSettings,
  getSpeedMultiplier,
  getSpawnRotation,
} from "../settings";
import { consumeKanadeSlowForSpawn } from "../fun/effects";
import {
  activeLandPixelY,
  primaryFromSprite,
  stackHeightForPrimary,
  willCollidePrimary,
  type RoundMethod,
} from "../board/geometry";
import { fileIsBig2x2 } from "../characters/ids";
import { bindPieceControls } from "./controls";
import { createActiveFall } from "./active-fall";
import { loadTexture } from "../assets/load-texture";

const KIND = "big2x2" as const;
/** 2×2 footprint is orientation-independent for collision / stack. */
const ORIENT = 0 as const;

/** Bottom-right primary of the live 2×2 sprite. */
export const getNeneRoboCoordinates = (
  sprite: PIXI.Sprite,
  method: RoundMethod = "ceil",
): { x: number; y: number } => primaryFromSprite(sprite, KIND, method);

export const getNeneRoboStackHeight = (sprite: PIXI.Sprite): number => {
  const primary = getNeneRoboCoordinates(sprite, "floor");
  return stackHeightForPrimary(pieces, primary, ORIENT, KIND);
};

const landYFor = (sprite: PIXI.Sprite): number =>
  activeLandPixelY(
    KIND,
    getNeneRoboStackHeight(sprite),
    ORIENT,
    app.renderer.height,
  );

/**
 * Shift primary by (dx, dy) if the domain footprint is free.
 * Pixel step only — do not placeSpritePrimary while actively falling
 * (active land Y uses OFFSET_BOTTOM; settled placement does not).
 */
const tryMovePrimary = (
  sprite: PIXI.Sprite,
  dx: number,
  dy: number,
  onMoved: () => void,
): boolean => {
  const { x, y } = getNeneRoboCoordinates(sprite, "ceil");
  const next = { x: x + dx, y: y + dy };
  if (willCollidePrimary(pieces, next, ORIENT, KIND)) return false;
  sprite.x += dx * BOX_SIZE;
  sprite.y += dy * BOX_SIZE;
  onMoved();
  return true;
};

export const createNeneRobo = async (
  file: string,
  onDropped: (sprite: PIXI.Sprite) => void,
) => {
  const texture = await loadTexture(file);
  const nenerobo = new PIXI.Sprite(texture);

  // Spawn near center; primaryFromSprite maps center → bottom-right primary
  nenerobo.x = (LEFT_BORDER + RIGHT_BORDER) / 2 - BOX_SIZE;
  nenerobo.y = -BOX_SIZE / 2;
  nenerobo.anchor.x = 0.5;
  nenerobo.anchor.y = 0.5;
  nenerobo.rotation = getSpawnRotation();

  const settings = getCurrentSettings();
  const speedMultiplier = getSpeedMultiplier(settings);
  const funSpeedMult = consumeKanadeSlowForSpawn();
  const baseSpeed = SPEED * speedMultiplier * funSpeedMult;
  const fall = createActiveFall(nenerobo, baseSpeed);

  const canLift = fileIsBig2x2(file);

  const moveLeft = () => {
    tryMovePrimary(nenerobo, -1, 0, fall.onMoved);
  };

  const moveRight = () => {
    tryMovePrimary(nenerobo, 1, 0, fall.onMoved);
  };

  /** Easter egg: Shift+↑ / swipe up lifts one cell when free. */
  const tryLift = () => {
    if (!canLift) return;
    tryMovePrimary(nenerobo, 0, -1, fall.onMoved);
  };

  const rotateCW = () => {
    nenerobo.rotation += Math.PI / 2;
    fall.onMoved();
  };

  const rotateCCW = () => {
    nenerobo.rotation -= Math.PI / 2;
    fall.onMoved();
  };

  const hardDrop = () => {
    const newY = landYFor(nenerobo);
    const distance = Math.floor((newY - nenerobo.y) / BOX_SIZE);
    fall.addHardDropScore(distance);
    nenerobo.y = newY;
    fall.onMoved();
  };

  const unbind = bindPieceControls({
    moveLeft,
    moveRight,
    rotateCW,
    rotateCCW,
    hardDrop,
    softDrop: fall.softDrop,
    normalSpeed: fall.normalSpeed,
    tryLift: canLift ? tryLift : undefined,
  });

  app.stage.addChild(nenerobo);

  const finish = () => {
    unbind();
    fall.stop();
    const dropScore = fall.getDropScore();
    if (dropScore > 0) addDropScore(dropScore);
    onDropped(nenerobo);
  };

  fall.start(
    () => landYFor(nenerobo),
    () => landYFor(nenerobo),
    finish,
  );

  return nenerobo;
};

export const neneRoboFall = (
  sprite: PIXI.Sprite,
  onFell: (sprite: PIXI.Sprite) => void,
) => {
  let timer: number | undefined;
  const cleanup = () => {
    gameTicker.remove(checkOffset);
    onFell(sprite);
  };
  const checkOffset = (delta: number) => {
    const dropHeight = landYFor(sprite);
    if (sprite.y < dropHeight) {
      sprite.y += FALL_SPEED * delta;
      if (timer) clearTimeout(timer);
    } else if (!timer) {
      timer = window.setTimeout(() => {
        sprite.y = landYFor(sprite);
        cleanup();
      }, FALL_DELAY);
    }
  };
  gameTicker.add(checkOffset);
};
