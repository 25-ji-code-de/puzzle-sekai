/**
 * Standard 2-cell active piece controller.
 */
import * as PIXI from "pixi.js-legacy";
import "pixi-sound";
import { app, gameTicker } from "../index";
import {
  LEFT_BORDER,
  RIGHT_BORDER,
  BOX_SIZE,
  COLUMNS,
  SPEED,
  OFFSET_BOTTOM,
  FALL_DELAY,
  FALL_SPEED,
} from "../config";
import {
  getCoordinates,
  willCollide,
  getStackHeight,
  getOffset,
} from "../utils/coords";
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
import { bindPieceControls } from "./controls";
import { createActiveFall } from "./active-fall";
import { loadTexture } from "./load-texture";

export { nextCharacter, initRNG, randomCharacter } from "./rng";
export { fly, showNextPiece } from "./preview";
export {
  createNeneRobo,
  neneRoboFall,
  getNeneRoboCoordinates,
  getNeneRoboStackHeight,
} from "./nenerobo";

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
    const offset = getOffset(sprite);
    const stackHeight = getStackHeight(sprite);
    const dropHeight =
      app.renderer.height -
      (BOX_SIZE / 2 + OFFSET_BOTTOM) -
      BOX_SIZE * stackHeight -
      (offset === 2 ? BOX_SIZE : 0);
    if (sprite.y < dropHeight) {
      sprite.y += FALL_SPEED * delta;
      if (timer) clearTimeout(timer);
    } else if (!timer) {
      timer = window.setTimeout(() => {
        sprite.y =
          app.renderer.height -
          (BOX_SIZE / 2 + OFFSET_BOTTOM) -
          (offset === 2 ? BOX_SIZE : 0) -
          BOX_SIZE * stackHeight;
        cleanup();
      }, FALL_DELAY);
    }
  };

  gameTicker.add(checkOffset);
};

const standardDropHeight = (sprite: PIXI.Sprite) => {
  const offset = getOffset(sprite);
  const stackHeight = getStackHeight(sprite);
  return (
    app.renderer.height -
    (BOX_SIZE / 2 + OFFSET_BOTTOM) -
    BOX_SIZE * stackHeight -
    (offset === 2 ? BOX_SIZE : 0)
  );
};

const standardLandY = (sprite: PIXI.Sprite) => {
  const offset = getOffset(sprite);
  const stackHeight = getStackHeight(sprite);
  return (
    app.renderer.height -
    (BOX_SIZE / 2 + OFFSET_BOTTOM) -
    (offset === 2 ? BOX_SIZE : 0) -
    BOX_SIZE * stackHeight
  );
};

export const createPiece = async (
  file: string,
  onDropped: (sprite: PIXI.Sprite) => void,
) => {
  if (file.includes("nenerobo") || file.includes("mikudayo")) {
    return await createNeneRobo(file, onDropped);
  }

  const texture = await loadTexture(file);
  const piece = new PIXI.Sprite(texture);

  const isMizuki = file.toLowerCase().includes("mizuki");
  const isAllergyAvoider =
    file.toLowerCase().includes("ena") ||
    file.toLowerCase().includes("akito");
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
  const isKanade = file.toLowerCase().includes("kanade");
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
    if (willCollide(targetCol, y, piece.rotation)) return;
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
    const { x, y } = getCoordinates(piece, "ceil");
    if (y >= 0 && !willCollide(x, y - 1, piece.rotation)) {
      piece.y -= BOX_SIZE;
      activeFall.onMoved();
    }
  };

  const canLift = file.toLowerCase().includes("emu");

  const rotateCW = () => {
    const { x, y } = getCoordinates(piece, "ceil");
    if (!willCollide(x, y, piece.rotation + Math.PI / 2)) {
      const offset = (getOffset(piece) - 1) / 2;
      piece.rotation = offset * Math.PI;
      activeFall.onMoved();
    }
  };

  const rotateCCW = () => {
    const { x, y } = getCoordinates(piece, "ceil");
    if (!willCollide(x, y, piece.rotation - Math.PI / 2)) {
      const offset = (getOffset(piece) + 1) / 2;
      piece.rotation = offset * Math.PI;
      activeFall.onMoved();
    }
  };

  const hardDrop = () => {
    const newY = standardLandY(piece);
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

    if (file.toLowerCase().includes("shiho")) {
      onShihoLanded();
    }
    if (isKanade) {
      onKanadeLanded();
    }

    onDropped(piece);
  };

  activeFall.start(
    () => standardDropHeight(piece),
    () => standardLandY(piece),
    finish,
  );

  return piece;
};
