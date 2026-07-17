/**
 * Standard 2-cell active piece controller.
 */
import * as PIXI from "pixi.js-legacy";
import "pixi-sound";
import { app, gameTicker } from "../runtime";
import {
  LEFT_BORDER,
  RIGHT_BORDER,
  BOX_SIZE,
  COLUMNS,
  SPEED,
  FALL_DELAY,
  FALL_SPEED,
} from "../config";
import { getGrid } from "../game/board-state";
import {
  activeLandPixelY,
  stackHeightForPrimary,
  willCollidePrimary,
} from "../domain/piece";
import { asOrientation, rotationToOrientation } from "../domain/types";
import { primaryFromSprite } from "../presentation/placement";
import { createNeneRobo } from "./nenerobo";
import { addDropScore } from "../score";
import {
  getCurrentSettings,
  getSpeedMultiplier,
  getSpawnRotation,
} from "../settings";
import {
  onShihoLanded,
  consumeKanadeSlowForSpawn,
  getKanadeSelfSpeedMult,
  onKanadeLanded,
} from "../fun/effects";
import {
  getMizukiLockColumns,
  getCarrotHazardColumns,
} from "../board/contact";
import {
  CHAR,
  fileIsBig2x2,
  fileIsCharacter,
  isAllergyAvoiderFile,
} from "../characters/ids";
import { bindPieceControls } from "./controls";
import { createActiveFall } from "./active-fall";
import { loadTexture } from "../assets/load-texture";

export { nextCharacter, initRNG, randomCharacter } from "./rng";
export { fly, showNextPiece } from "./preview";
export { createNeneRobo, neneRoboFall } from "./nenerobo";

/** Index of the value in `list` nearest to `target`. Assumes list is non-empty. */
const nearestIndex = (list: number[], target: number): number => {
  let idx = 0;
  let best = Math.abs(list[0] - target);
  for (let i = 1; i < list.length; i++) {
    const d = Math.abs(list[i] - target);
    if (d < best) {
      best = d;
      idx = i;
    }
  }
  return idx;
};

/** Land / drop pixel Y for a live standard piece. */
const landYFor = (sprite: PIXI.Sprite): number => {
  const orient = asOrientation(rotationToOrientation(sprite.rotation));
  const primary = primaryFromSprite(sprite, "cell2", "floor");
  return activeLandPixelY(
    "cell2",
    stackHeightForPrimary(getGrid(), primary, orient, "cell2"),
    orient,
    app.renderer.height,
  );
};

/** Legacy post-land fall helper for standard pieces. */
export const fall = (
  sprite: PIXI.Sprite,
  onFall?: (sprite: PIXI.Sprite) => void,
) => {
  let timer: number | undefined;
  const cleanup = () => {
    gameTicker.remove(checkOffset);
    onFall && onFall(sprite);
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

export const createPiece = async (
  file: string,
  onDropped: (sprite: PIXI.Sprite) => void,
) => {
  if (fileIsBig2x2(file)) {
    return await createNeneRobo(file, onDropped);
  }

  const texture = await loadTexture(file);
  const piece = new PIXI.Sprite(texture);

  const isMizuki = fileIsCharacter(file, CHAR.Mizuki);
  const isAllergyAvoider = isAllergyAvoiderFile(file);
  const mizukiLockCols = isMizuki ? getMizukiLockColumns() : [];
  const mizukiLocked = mizukiLockCols.length > 0;
  const carrotHazards = isAllergyAvoider ? getCarrotHazardColumns() : [];
  const avoidCarrotCols = carrotHazards.length > 0;

  // Spawn: Mizuki prefers contact cols; Ena/Akito avoid contact cols
  let spawnCol: number | undefined;
  if (mizukiLocked) {
    spawnCol = mizukiLockCols[Math.floor(mizukiLockCols.length / 2)];
  } else if (avoidCarrotCols) {
    const mid = Math.floor(COLUMNS / 2);
    const free = Array.from({ length: COLUMNS }, (_, c) => c).filter(
      (c) => !carrotHazards.includes(c),
    );
    if (free.length > 0) {
      spawnCol = free.reduce(
        (best, c) => (Math.abs(c - mid) < Math.abs(best - mid) ? c : best),
        free[0],
      );
    }
  }
  piece.x =
    spawnCol !== undefined
      ? LEFT_BORDER + spawnCol * BOX_SIZE + BOX_SIZE / 2
      : (LEFT_BORDER + RIGHT_BORDER) / 2 - BOX_SIZE / 2;
  piece.y = -BOX_SIZE / 2;
  piece.anchor.x = 0.5;
  piece.anchor.y = 0.25;
  piece.rotation = getSpawnRotation();

  const settings = getCurrentSettings();
  const speedMultiplier = getSpeedMultiplier(settings);
  const isKanade = fileIsCharacter(file, CHAR.Kanade);
  const funSpeedMult =
    consumeKanadeSlowForSpawn() * (isKanade ? getKanadeSelfSpeedMult() : 1);
  const baseSpeed = SPEED * speedMultiplier * funSpeedMult;
  const activeFall = createActiveFall(piece, baseSpeed);

  const currentCol = () =>
    Math.round((piece.x - LEFT_BORDER - BOX_SIZE / 2) / BOX_SIZE);

  const pieceY = () => {
    const rawY = (piece.y - BOX_SIZE / 2) / BOX_SIZE;
    return Math.max(0, Math.ceil(rawY));
  };

  const tryShiftToCol = (fromCol: number, targetCol: number, y: number) => {
    if (targetCol < 0 || targetCol >= COLUMNS || targetCol === fromCol) return;
    if (
      willCollidePrimary(
        getGrid(),
        { x: targetCol, y },
        asOrientation(rotationToOrientation(piece.rotation)),
        "cell2",
      )
    ) {
      return;
    }
    piece.x += (targetCol - fromCol) * BOX_SIZE;
    activeFall.onMoved();
  };

  const moveAlongLockedCols = (direction: -1 | 1) => {
    const col = currentCol();
    const y = pieceY();
    const sorted = mizukiLockCols;
    let idx = sorted.indexOf(col);
    if (idx < 0) {
      idx = nearestIndex(sorted, col);
      tryShiftToCol(col, sorted[idx], y);
      return;
    }
    const nextIdx = idx + direction;
    if (nextIdx < 0 || nextIdx >= sorted.length) return;
    tryShiftToCol(col, sorted[nextIdx], y);
  };

  const moveAvoidingHazards = (direction: -1 | 1) => {
    const col = currentCol();
    let next = col + direction;
    while (next >= 0 && next < COLUMNS && carrotHazards.includes(next)) {
      next += direction;
    }
    tryShiftToCol(col, next, pieceY());
  };

  const moveFree = (direction: -1 | 1) => {
    tryShiftToCol(currentCol(), currentCol() + direction, pieceY());
  };

  const moveToAllowedCol = (direction: -1 | 1) => {
    if (mizukiLocked) {
      moveAlongLockedCols(direction);
      return;
    }
    if (avoidCarrotCols) {
      moveAvoidingHazards(direction);
      return;
    }
    moveFree(direction);
  };

  const moveUp = () => {
    const { x, y } = primaryFromSprite(piece, "cell2", "ceil");
    if (
      y >= 0 &&
      !willCollidePrimary(
        getGrid(),
        { x, y: y - 1 },
        asOrientation(rotationToOrientation(piece.rotation)),
        "cell2",
      )
    ) {
      piece.y -= BOX_SIZE;
      activeFall.onMoved();
    }
  };

  const canLift = fileIsCharacter(file, CHAR.Emu);

  const rotateCW = () => {
    const { x, y } = primaryFromSprite(piece, "cell2", "ceil");
    if (
      !willCollidePrimary(
        getGrid(),
        { x, y },
        asOrientation(rotationToOrientation(piece.rotation + Math.PI / 2)),
        "cell2",
      )
    ) {
      const offset = (rotationToOrientation(piece.rotation) - 1) / 2;
      piece.rotation = offset * Math.PI;
      activeFall.onMoved();
    }
  };

  const rotateCCW = () => {
    const { x, y } = primaryFromSprite(piece, "cell2", "ceil");
    if (
      !willCollidePrimary(
        getGrid(),
        { x, y },
        asOrientation(rotationToOrientation(piece.rotation - Math.PI / 2)),
        "cell2",
      )
    ) {
      const offset = (rotationToOrientation(piece.rotation) + 1) / 2;
      piece.rotation = offset * Math.PI;
      activeFall.onMoved();
    }
  };

  const hardDrop = () => {
    const newY = landYFor(piece);
    const distance = Math.floor((newY - piece.y) / BOX_SIZE);
    activeFall.addHardDropScore(distance);
    piece.y = newY;
    activeFall.onMoved();
  };

  const unbind = bindPieceControls({
    moveLeft: () => moveToAllowedCol(-1),
    moveRight: () => moveToAllowedCol(1),
    rotateCW,
    rotateCCW,
    hardDrop,
    softDrop: activeFall.softDrop,
    normalSpeed: activeFall.normalSpeed,
    tryLift: canLift ? moveUp : undefined,
  });

  app.stage.addChild(piece);

  const finish = () => {
    unbind();
    activeFall.stop();
    const dropScore = activeFall.getDropScore();
    if (dropScore > 0) addDropScore(dropScore);

    if (fileIsCharacter(file, CHAR.Shiho)) {
      onShihoLanded();
    }
    if (isKanade) {
      onKanadeLanded();
    }

    onDropped(piece);
  };

  activeFall.start(
    () => landYFor(piece),
    () => landYFor(piece),
    finish,
  );

  return piece;
};
