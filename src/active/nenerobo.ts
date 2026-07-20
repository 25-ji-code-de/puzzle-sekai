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
  STAGE_HEIGHT,
} from "../config";
import { getGrid } from "../game/board-state";
import { addDropScore } from "../score";
import {
  getCurrentSettings,
  getSpeedMultiplier,
  getSpawnRotation,
} from "../settings";
import {
  setReplayLiveControlTarget,
  type ReplayControlTarget,
} from "../replay";
import { consumeKanadeSlowForSpawn } from "../fun/effects";
import {
  activeLandPixelY,
  stackHeightForPrimary,
  willCollidePrimary,
} from "../domain/piece";
import { primaryFromSprite } from "../presentation/placement";
import { fileIsBig2x2 } from "../characters/ids";
import { bindPieceControls } from "./controls";
import { createActiveFall } from "./active-fall";
import { isDisplayAlive, registerActivePiece } from "./lifecycle";
import { loadTexture } from "../assets/load-texture";
import {
  canPlaceAt,
  castDownY,
  createActiveBody,
  isContinuousPhysics,
  removeActiveBody,
  stepShiftX,
  tryRotate,
} from "../board/dynamics";

const KIND = "big2x2" as const;
/** 2×2 footprint is orientation-independent for collision / stack. */
const ORIENT = 0 as const;

const landYFor = (sprite: PIXI.Sprite): number => {
  if (!isDisplayAlive(sprite)) return 0;
  if (isContinuousPhysics()) {
    return castDownY(KIND, sprite.x, sprite.y, sprite.rotation, sprite);
  }
  const primary = primaryFromSprite(sprite, KIND, "floor");
  return activeLandPixelY(
    KIND,
    stackHeightForPrimary(getGrid(), primary, ORIENT, KIND),
    ORIENT,
    STAGE_HEIGHT,
  );
};

/**
 * Shift primary by (dx, dy) if the domain footprint is free.
 * Pixel step only while actively falling (land Y uses OFFSET_BOTTOM).
 */
const tryMovePrimary = (
  sprite: PIXI.Sprite,
  dx: number,
  dy: number,
  onMoved: () => void,
): boolean => {
  if (!isDisplayAlive(sprite)) return false;
  if (isContinuousPhysics()) {
    if (dx !== 0 && dy === 0) {
      const dir: -1 | 1 = dx > 0 ? 1 : -1;
      const nx = stepShiftX(
        KIND,
        sprite.x,
        sprite.y,
        sprite.rotation,
        dir,
        Math.abs(dx) * BOX_SIZE,
        sprite,
      );
      if (nx === null) return false;
      sprite.x = nx;
      onMoved();
      return true;
    }
    const nx = sprite.x + dx * BOX_SIZE;
    const ny = sprite.y + dy * BOX_SIZE;
    if (!canPlaceAt(KIND, nx, ny, sprite.rotation, sprite)) return false;
    sprite.x = nx;
    sprite.y = ny;
    onMoved();
    return true;
  }
  const { x, y } = primaryFromSprite(sprite, KIND, "ceil");
  const next = { x: x + dx, y: y + dy };
  if (willCollidePrimary(getGrid(), next, ORIENT, KIND)) return false;
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
    if (!isDisplayAlive(nenerobo)) return;
    tryMovePrimary(nenerobo, -1, 0, fall.onMoved);
  };

  const moveRight = () => {
    if (!isDisplayAlive(nenerobo)) return;
    tryMovePrimary(nenerobo, 1, 0, fall.onMoved);
  };

  /** Easter egg: Shift+↑ / swipe up lifts one cell when free. */
  const tryLift = () => {
    if (!canLift || !isDisplayAlive(nenerobo)) return;
    tryMovePrimary(nenerobo, 0, -1, fall.onMoved);
  };

  const rotateCW = () => {
    if (!isDisplayAlive(nenerobo)) return;
    if (isContinuousPhysics()) {
      const res = tryRotate(
        KIND,
        nenerobo.x,
        nenerobo.y,
        nenerobo.rotation,
        1,
        nenerobo,
      );
      if (!res) return;
      nenerobo.x = res.x;
      nenerobo.y = res.y;
      nenerobo.rotation = res.rotation;
      fall.onMoved();
      return;
    }
    nenerobo.rotation += Math.PI / 2;
    fall.onMoved();
  };

  const rotateCCW = () => {
    if (!isDisplayAlive(nenerobo)) return;
    if (isContinuousPhysics()) {
      const res = tryRotate(
        KIND,
        nenerobo.x,
        nenerobo.y,
        nenerobo.rotation,
        -1,
        nenerobo,
      );
      if (!res) return;
      nenerobo.x = res.x;
      nenerobo.y = res.y;
      nenerobo.rotation = res.rotation;
      fall.onMoved();
      return;
    }
    nenerobo.rotation -= Math.PI / 2;
    fall.onMoved();
  };

  const hardDrop = () => {
    if (!isDisplayAlive(nenerobo)) return;
    const newY = landYFor(nenerobo);
    const distance = Math.floor((newY - nenerobo.y) / BOX_SIZE);
    fall.addHardDropScore(distance);
    nenerobo.y = newY;
    fall.onMoved();
  };

  const controls: ReplayControlTarget = {
    moveLeft,
    moveRight,
    rotateCW,
    rotateCCW,
    hardDrop,
    softDrop: fall.softDrop,
    normalSpeed: fall.normalSpeed,
    tryLift: canLift ? tryLift : undefined,
  };

  const unbind = bindPieceControls(controls);
  setReplayLiveControlTarget(controls);

  app.stage.addChild(nenerobo);

  if (isContinuousPhysics()) {
    createActiveBody(nenerobo, KIND, {
      assetFile: file,
    });
  }

  const release = registerActivePiece(() => {
    setReplayLiveControlTarget(null);
    unbind();
    fall.stop();
    if (isContinuousPhysics()) removeActiveBody(nenerobo);
  });

  const finish = () => {
    release();
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
