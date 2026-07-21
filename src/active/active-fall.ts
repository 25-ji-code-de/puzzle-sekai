/**
 * Shared active-piece fall loop: gravity, soft-drop speed, drop score, land lock.
 */
import type * as PIXI from "pixi.js-legacy";
import { gameTicker } from "../runtime";
import { BOX_SIZE, SPEED } from "../config";
import { SFX_LAND_BASE, SFX_MOVE_BASE } from "../settings";
import { playLoadedSfx, replayLoadedSfx } from "../audio/sfx";
import { isDisplayAlive } from "./lifecycle";

export type ActiveFall = {
  softDrop: () => void;
  normalSpeed: () => void;
  /** Cancel pending land timer + play move SFX (call after any player move). */
  onMoved: () => void;
  /** Hard-drop cells × 5. */
  addHardDropScore: (distanceCells: number) => void;
  /** Accumulated soft/hard drop score since start. */
  getDropScore: () => number;
  /**
   * Begin per-frame gravity. `getDropHeight` is the y the sprite may not pass;
   * `getLandY` is the snapped y used when the land timer fires.
   */
  start: (
    getDropHeight: () => number,
    getLandY: () => number,
    onLand: () => void,
  ) => void;
  /** Remove the fall ticker (does not fire onLand). */
  stop: () => void;
};

export type ActiveFallOptions = {
  /** Soft-drop multiplier (default 4). Items can use this as continuous speed. */
  softDropMult?: number;
  /** Play move SFX on onMoved (default true). */
  moveSfx?: boolean;
  /** Play land SFX on lock (default true). */
  landSfx?: boolean;
  /** Land lock delay ms (default 200). Items often use 0 for instant. */
  landLockMs?: number;
};

const DEFAULT_LAND_LOCK_MS = 200;
const DEFAULT_SOFT_DROP_MULT = 4;

export const createActiveFall = (
  sprite: PIXI.Sprite,
  baseSpeed: number,
  options: ActiveFallOptions = {},
): ActiveFall => {
  const softDropMult = options.softDropMult ?? DEFAULT_SOFT_DROP_MULT;
  const moveSfx = options.moveSfx !== false;
  const landSfx = options.landSfx !== false;
  const landLockMs = options.landLockMs ?? DEFAULT_LAND_LOCK_MS;

  let speed = baseSpeed;
  let dropScore = 0;
  let landTimer: number | undefined;
  let falling = false;
  /** Throttle move clicks so continuous ARR (~30 Hz) does not thrash audio. */
  let lastMoveSfxAt = 0;
  const MOVE_SFX_MIN_MS = 55;

  const clearLandTimer = () => {
    if (landTimer !== undefined) {
      clearTimeout(landTimer);
      landTimer = undefined;
    }
  };

  let checkOffset: ((delta: number) => void) | null = null;

  const stop = () => {
    clearLandTimer();
    if (checkOffset) {
      gameTicker.remove(checkOffset);
      checkOffset = null;
    }
    falling = false;
  };

  const onMoved = () => {
    clearLandTimer();
    if (!moveSfx) return;
    const now = performance.now();
    if (now - lastMoveSfxAt < MOVE_SFX_MIN_MS) return;
    lastMoveSfxAt = now;
    replayLoadedSfx("move", "sfx", SFX_MOVE_BASE);
  };

  const fireLand = (getLandY: () => number, onLand: () => void) => {
    if (!isDisplayAlive(sprite)) {
      stop();
      return;
    }
    if (landSfx) playLoadedSfx("land", "sfx", SFX_LAND_BASE);
    sprite.y = getLandY();
    if (checkOffset) {
      gameTicker.remove(checkOffset);
      checkOffset = null;
    }
    falling = false;
    onLand();
  };

  return {
    softDrop: () => {
      if (!isDisplayAlive(sprite)) return;
      speed = baseSpeed * softDropMult;
    },
    normalSpeed: () => {
      if (!isDisplayAlive(sprite)) return;
      speed = baseSpeed;
    },
    onMoved,
    addHardDropScore: (distanceCells: number) => {
      if (distanceCells > 0) dropScore += distanceCells * 5;
    },
    getDropScore: () => dropScore,
    stop,
    start: (getDropHeight, getLandY, onLand) => {
      if (falling) stop();
      falling = true;

      checkOffset = (delta: number) => {
        if (!isDisplayAlive(sprite)) {
          stop();
          return;
        }
        const dropHeight = getDropHeight();
        if (sprite.y < dropHeight) {
          const prevY = sprite.y;
          sprite.y += speed * delta;
          if (sprite.y > dropHeight) sprite.y = dropHeight;
          const moved = Math.floor((sprite.y - prevY) / BOX_SIZE);
          if (moved > 0) {
            const mult = speed > SPEED ? 2 : 1;
            dropScore += moved * mult;
          }
        } else if (landTimer === undefined) {
          if (landLockMs <= 0) {
            fireLand(getLandY, onLand);
            return;
          }
          landTimer = window.setTimeout(() => {
            landTimer = undefined;
            fireLand(getLandY, onLand);
          }, landLockMs);
        }
      };

      gameTicker.add(checkOffset);
    },
  };
};
