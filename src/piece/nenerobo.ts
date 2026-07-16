/**
 * 2×2 piece (NeneRobo / Mikudayo): geometry helpers + active controller.
 */
import * as PIXI from "pixi.js-legacy";
import "pixi-sound";
import { app, gameTicker } from "../index";
import {
  LEFT_BORDER,
  RIGHT_BORDER,
  BOX_SIZE,
  SPEED,
  COLUMNS,
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
  stackHeightBelow,
  activeLandPixelY,
} from "../board/geometry";
import { bindPieceControls } from "./controls";
import { createActiveFall } from "./active-fall";
import { loadTexture } from "./load-texture";

export const getNeneRoboCoordinates = (
  sprite: PIXI.Sprite,
  method: "floor" | "ceil" | "round" = "ceil",
): { x: number; y: number } => {
  return {
    x: Math[method]((sprite.x - BOX_SIZE - LEFT_BORDER) / BOX_SIZE),
    y: Math[method]((sprite.y - BOX_SIZE) / BOX_SIZE),
  };
};

export const getNeneRoboStackHeight = (sprite: PIXI.Sprite): number => {
  const { x, y } = getNeneRoboCoordinates(sprite);
  // Legacy filter: index + 1 > y  ⇔  index > y - 1
  return stackHeightBelow(pieces, [x, x + 1], y - 1);
};

const landYFor = (sprite: PIXI.Sprite): number =>
  activeLandPixelY(
    "big2x2",
    getNeneRoboStackHeight(sprite),
    0,
    app.renderer.height,
  );

export const createNeneRobo = async (
  file: string,
  onDropped: (sprite: PIXI.Sprite) => void,
) => {
  const texture = await loadTexture(file);
  const nenerobo = new PIXI.Sprite(texture);

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

  const canLift =
    file.toLowerCase().includes("nenerobo") ||
    file.toLowerCase().includes("mikudayo");

  const moveLeft = () => {
    const { x, y } = getNeneRoboCoordinates(nenerobo, "ceil");
    if (y <= 0 && x > 0 && !pieces[0][x - 1]) {
      nenerobo.x -= BOX_SIZE;
      fall.onMoved();
    } else if (x > 0 && !pieces[y][x - 1] && !pieces[y + 1][x - 1]) {
      nenerobo.x -= BOX_SIZE;
      fall.onMoved();
    }
  };

  const moveRight = () => {
    const { x, y } = getNeneRoboCoordinates(nenerobo, "ceil");
    if (y <= 0 && x + 2 < COLUMNS && !pieces[0][x + 2]) {
      nenerobo.x += BOX_SIZE;
      fall.onMoved();
    } else if (x + 2 < COLUMNS && !pieces[y][x + 2] && !pieces[y + 1][x + 2]) {
      nenerobo.x += BOX_SIZE;
      fall.onMoved();
    }
  };

  /** Easter egg: Shift+↑ / swipe up lifts one cell when free. */
  const tryLift = () => {
    if (!canLift) return;
    const { x, y } = getNeneRoboCoordinates(nenerobo, "ceil");
    if (y <= 0) return;
    const above = y - 1;
    if (pieces[above]?.[x] || pieces[above]?.[x + 1]) return;
    nenerobo.y -= BOX_SIZE;
    fall.onMoved();
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

/** Post-land gravity helper for 2×2 pieces (used by board settle paths if needed). */
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
