import * as PIXI from "pixi.js-legacy";
import "pixi-sound";
import { app, gameTicker, hammerManager } from ".";
import {
  LEFT_BORDER,
  RIGHT_BORDER,
  BOX_SIZE,
  COLUMNS,
  SPEED,
  NEXT_CHARACTER_Y,
  NEXT_CHARACTER_X,
  OFFSET_BOTTOM,
  FALL_DELAY,
  FALL_SPEED,
} from "./config";
import {
  getCoordinates,
  willCollide,
  getStackHeight,
  getOffset,
} from "./utils";
import { characterData, CharacterData } from "./character-data";
import { createNeneRobo } from "./nenerobo";
import { addDropScore } from "./score";
import {
  getCurrentSettings,
  getSpeedMultiplier,
  getSpawnRotation,
  sfxVol,
  SFX_MOVE_BASE,
  SFX_LAND_BASE,
} from "./settings";
import {
  isControlsSwapped,
  onShihoLanded,
  consumeKanadeSlowForSpawn,
  getKanadeSelfSpeedMult,
  onKanadeLanded,
} from "./fun-effects";
import { getMizukiLockColumns, getCarrotHazardColumns } from "./board";

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

// Get filtered character list based on selected groups
const getFilteredCharacterData = (): CharacterData[] => {
  const settings = getCurrentSettings();
  return characterData.filter(
    (c) =>
      settings.selectedGroups.includes(c.group as any) ||
      (c.group === "Special" && settings.funModes?.mikudayo),
  );
};

export let nextCharacter: CharacterData | undefined;
let characterList: CharacterData[] = [];

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
export const fall = (
  sprite: PIXI.Sprite,
  onFall?: (sprite: PIXI.Sprite) => void,
) => {
  let timer: number;
  const cleanup = () => {
    gameTicker.remove(checkOffset);
    onFall && onFall(sprite);
  };

  const checkOffset = (delta: number) => {
    // each frame we spin the bunny around a bit
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
    } else {
      if (!timer) {
        timer = setTimeout(() => {
          sprite.y =
            app.renderer.height -
            (BOX_SIZE / 2 + OFFSET_BOTTOM) -
            (offset === 2 ? BOX_SIZE : 0) -
            BOX_SIZE * stackHeight;
          cleanup();
        }, FALL_DELAY);
      }
    }
  };

  // Listen for frame updates
  gameTicker.add(checkOffset);
};
export const initRNG = () => {
  const filtered = getFilteredCharacterData();
  characterList = [...filtered];
  nextCharacter = characterList.splice(
    Math.floor(Math.random() * characterList.length),
    1,
  )[0];
};
export const randomCharacter = (): CharacterData => {
  if (characterList.length === 0) {
    const filtered = getFilteredCharacterData();
    characterList = [...filtered];
  }
  let res: CharacterData;
  if (!nextCharacter) {
    res = characterList.splice(
      Math.floor(Math.random() * characterList.length),
      1,
    )[0];
    return res;
  } else {
    res = { ...nextCharacter };
    nextCharacter = characterList.splice(
      Math.floor(Math.random() * characterList.length),
      1,
    )[0];
  }
  return res;
};

export const showNextPiece = async (file: string) => {
  const texture =
    app.loader.resources[file]?.texture ??
    (await new Promise((resolve) => {
      app.loader
        .add(file)
        .load((_, resources) => resolve(resources[file]!.texture!));
    }));

  const kasumi = new PIXI.Sprite(texture);
  kasumi.anchor.x = 0.5;
  kasumi.anchor.y = 1;

  kasumi.y = NEXT_CHARACTER_Y;
  kasumi.x = NEXT_CHARACTER_X;

  app.stage.addChild(kasumi);
  return kasumi;
};

export const createPiece = async (
  file: string,
  onDropped: (sprite: PIXI.Sprite) => void,
) => {
  // load the texture we need

  if (file.includes("nenerobo") || file.includes("mikudayo")) return await createNeneRobo(file, onDropped);
  const texture =
    app.loader.resources[file]?.texture ??
    (await new Promise((resolve) => {
      app.loader
        .add(file)
        .load((_, resources) => resolve(resources[file]!.texture!));
    }));

  const kasumi = new PIXI.Sprite(texture);

  const isMizuki = file.toLowerCase().includes("mizuki");
  const isAllergyAvoider =
    file.toLowerCase().includes("ena") ||
    file.toLowerCase().includes("akito");
  // ポテトと瑞希: if fries on board and open columns exist, lock Mizuki to those cols
  const mizukiLockCols = isMizuki ? getMizukiLockColumns() : [];
  const mizukiLocked = mizukiLockCols.length > 0;
  // にんじん嫌い: Ena/Akito skip carrot hazard columns (cannot voluntarily land there)
  const carrotHazards = isAllergyAvoider ? getCarrotHazardColumns() : [];
  const avoidCarrotCols = carrotHazards.length > 0;

  // Spawn: Mizuki prefers contact cols; Ena/Akito avoid contact cols
  let spawnCol: number | undefined;
  if (mizukiLocked) {
    spawnCol = mizukiLockCols[Math.floor(mizukiLockCols.length / 2)];
  } else if (avoidCarrotCols) {
    // Prefer center among columns that do NOT contact carrots
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
  kasumi.x =
    spawnCol !== undefined
      ? LEFT_BORDER + spawnCol * BOX_SIZE + BOX_SIZE / 2
      : (LEFT_BORDER + RIGHT_BORDER) / 2 - BOX_SIZE / 2;
  kasumi.y = -BOX_SIZE / 2;

  kasumi.anchor.x = 0.5;
  kasumi.anchor.y = 0.25;

  // inverted (default, head-down) or upright — see settings.spawnOrientation
  kasumi.rotation = getSpawnRotation();
  // app.stage.addChild(bunny);

  let dropped: number | undefined = undefined;
  const settings = getCurrentSettings();
  const speedMultiplier = getSpeedMultiplier(settings);
  const isKanade = file.toLowerCase().includes("kanade");
  const funSpeedMult =
    consumeKanadeSlowForSpawn() *
    (isKanade ? getKanadeSelfSpeedMult() : 1);
  let speed = SPEED * speedMultiplier * funSpeedMult;
  let dropScore = 0;

  /** When locked, left/right move only among allowed columns (skip others). */
  const currentCol = () =>
    Math.round((kasumi.x - LEFT_BORDER - BOX_SIZE / 2) / BOX_SIZE);

  const pieceY = () => {
    const rawY = (kasumi.y - BOX_SIZE / 2) / BOX_SIZE;
    return Math.max(0, Math.ceil(rawY));
  };

  const tryShiftToCol = (fromCol: number, targetCol: number, y: number) => {
    if (targetCol < 0 || targetCol >= COLUMNS || targetCol === fromCol) return;
    if (willCollide(targetCol, y, kasumi.rotation)) return;
    kasumi.x += (targetCol - fromCol) * BOX_SIZE;
    onMoved();
  };

  /** Jump among locked columns only (Mizuki + fries). Snap if off-list. */
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

  /** Skip forbidden columns (Ena/Akito + carrot). */
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

  const onMoved = () => {
    if (dropped) {
      clearTimeout(dropped);
      dropped = undefined;
    }
    const sound = app.loader.resources.move.sound;
    if (sound.isPlaying) {
      sound.stop();
    }
    sound.play({ volume: sfxVol(SFX_MOVE_BASE) });
  };

  const moveUp = () => {
    const { x, y } = getCoordinates(kasumi, "ceil");
    if (y >= 0 && !willCollide(x, y - 1, kasumi.rotation)) {
      kasumi.y -= BOX_SIZE;
      onMoved();
    }
  };

  const moveLeft = () => moveToAllowedCol(-1);

  const moveRight = () => moveToAllowedCol(1);
  const rotateCW = () => {
    const { x, y } = getCoordinates(kasumi, "ceil");
    if (!willCollide(x, y, kasumi.rotation + Math.PI / 2)) {
      const offset = (getOffset(kasumi) - 1) / 2;
      kasumi.rotation = offset * Math.PI;
      onMoved();
    }
  };

  const rotateCCW = () => {
    const { x, y } = getCoordinates(kasumi, "ceil");
    if (!willCollide(x, y, kasumi.rotation - Math.PI / 2)) {
      const offset = (getOffset(kasumi) + 1) / 2;
      kasumi.rotation = offset * Math.PI;
      onMoved();
    }
  };

  const hardDrop = () => {
    const offset = getOffset(kasumi);
    const stackHeight = getStackHeight(kasumi);
    const newY =
      app.renderer.height -
      (BOX_SIZE / 2 + OFFSET_BOTTOM) -
      (offset === 2 ? BOX_SIZE : 0) -
      BOX_SIZE * stackHeight;
    const distance = Math.floor((newY - kasumi.y) / BOX_SIZE);
    dropScore += distance * 5;
    kasumi.y = newY;
    onMoved();
  };

  const softDrop = () => {
    speed = SPEED * 4 * speedMultiplier * funSpeedMult;
  };

  const normalSpeed = () => {
    speed = SPEED * speedMultiplier * funSpeedMult;
  };

  const handleKeyPress = (event: KeyboardEvent) => {
    const swapped = isControlsSwapped();
    switch (event.key.toLowerCase()) {
      case "arrowleft":
        swapped ? moveRight() : moveLeft();
        break;
      case "arrowright":
        swapped ? moveLeft() : moveRight();
        break;
      case "arrowup":
        // Easter egg: Emu can lift one cell with Shift+↑
        if (event.shiftKey && file.toLowerCase().includes("emu")) {
          moveUp();
          break;
        }
        swapped ? rotateCCW() : rotateCW();
        break;
      case "x":
        swapped ? rotateCCW() : rotateCW();
        break;
      case "z":
      case "control":
        swapped ? rotateCW() : rotateCCW();
        break;
      case "arrowdown":
        softDrop();
        break;
      case " ":
        hardDrop();
        break;
    }
  };

  const handleKeyUp = (event: KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      speed = SPEED * speedMultiplier * funSpeedMult;
    }
  };

  // Mobile: swipe left/right move, tap left/right rotate — swap pairs when mirrored
  const handleSwipeLeft = () =>
    isControlsSwapped() ? moveRight() : moveLeft();
  const handleSwipeRight = () =>
    isControlsSwapped() ? moveLeft() : moveRight();
  // Easter egg (Emu): swipe up = lift one cell (same as Shift+↑)
  const handleSwipeUp = () => {
    if (file.toLowerCase().includes("emu")) moveUp();
  };
  const handleTap = (e: HammerInput) => {
    const leftHalf = e.center.x < window.innerWidth / 2;
    if (isControlsSwapped()) {
      leftHalf ? rotateCW() : rotateCCW();
    } else {
      leftHalf ? rotateCCW() : rotateCW();
    }
  };

  window.addEventListener("keydown", handleKeyPress, false);
  window.addEventListener("keyup", handleKeyUp, false);

  hammerManager.on("swipeleft", handleSwipeLeft);
  hammerManager.on("swiperight", handleSwipeRight);
  hammerManager.on("swipedown", hardDrop);
  hammerManager.on("swipeup", handleSwipeUp);
  hammerManager.on("press", softDrop);
  hammerManager.on("pressup", normalSpeed);
  hammerManager.on("tap", handleTap);

  app.stage.addChild(kasumi);

  const cleanup = () => {
    window.removeEventListener("keydown", handleKeyPress, false);
    window.removeEventListener("keyup", handleKeyUp, false);

    hammerManager.off("swiperight", handleSwipeRight);
    hammerManager.off("tap", handleTap);
    hammerManager.off("swipeleft", handleSwipeLeft);
    hammerManager.off("swipedown", hardDrop);
    hammerManager.off("swipeup", handleSwipeUp);
    hammerManager.off("press", softDrop);
    hammerManager.off("pressup", normalSpeed);

    gameTicker.remove(checkOffset);

    // Add accumulated drop score
    if (dropScore > 0) {
      addDropScore(dropScore);
    }

    if (file.toLowerCase().includes("shiho")) {
      onShihoLanded();
    }
    if (isKanade) {
      onKanadeLanded();
    }

    onDropped(kasumi);
  };
  const checkOffset = (delta: number) => {
    // each frame we spin the bunny around a bit
    const offset = getOffset(kasumi);
    const stackHeight = getStackHeight(kasumi);
    const dropHeight =
      app.renderer.height -
      (BOX_SIZE / 2 + OFFSET_BOTTOM) -
      BOX_SIZE * stackHeight -
      (offset === 2 ? BOX_SIZE : 0);
    if (kasumi.y < dropHeight) {
      const prevY = kasumi.y;
      kasumi.y += speed * delta;
      if (kasumi.y > dropHeight) kasumi.y = dropHeight;
      // Accumulate score based on actual movement
      const moved = Math.floor((kasumi.y - prevY) / BOX_SIZE);
      if (moved > 0) {
        const mult = speed > SPEED ? 2 : 1;
        dropScore += moved * mult;
      }
    } else {
      if (!dropped) {
        dropped = setTimeout(() => {
          app.loader.resources.land.sound.play({ volume: sfxVol(SFX_LAND_BASE) });
          kasumi.y =
            app.renderer.height -
            (BOX_SIZE / 2 + OFFSET_BOTTOM) -
            (offset === 2 ? BOX_SIZE : 0) -
            BOX_SIZE * stackHeight;
          cleanup();
        }, 200);
      }
    }
  };
  // Listen for frame updates
  gameTicker.add(checkOffset);

  return kasumi;
};
