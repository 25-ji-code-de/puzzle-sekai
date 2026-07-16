/**
 * Shared active-piece fall loop: gravity, soft-drop speed, drop score, land lock.
 */
import type * as PIXI from "pixi.js-legacy";
import { app, gameTicker } from "../index";
import { BOX_SIZE, SPEED } from "../config";
import { sfxVol, SFX_LAND_BASE, SFX_MOVE_BASE } from "../settings";

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

const LAND_LOCK_MS = 200;
const SOFT_DROP_MULT = 4;

export const createActiveFall = (
  sprite: PIXI.Sprite,
  baseSpeed: number,
): ActiveFall => {
  let speed = baseSpeed;
  let dropScore = 0;
  let landTimer: number | undefined;
  let falling = false;

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
    const sound = app.loader.resources.move.sound;
    if (sound.isPlaying) {
      sound.stop();
    }
    sound.play({ volume: sfxVol(SFX_MOVE_BASE) });
  };

  return {
    softDrop: () => {
      speed = baseSpeed * SOFT_DROP_MULT;
    },
    normalSpeed: () => {
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
          landTimer = window.setTimeout(() => {
            landTimer = undefined;
            app.loader.resources.land.sound.play({
              volume: sfxVol(SFX_LAND_BASE),
            });
            sprite.y = getLandY();
            // Detach fall ticker before onLand so re-entrant work is clean
            if (checkOffset) {
              gameTicker.remove(checkOffset);
              checkOffset = null;
            }
            falling = false;
            onLand();
          }, LAND_LOCK_MS);
        }
      };

      gameTicker.add(checkOffset);
    },
  };
};
