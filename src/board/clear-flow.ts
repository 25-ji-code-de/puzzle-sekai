/**
 * Clear cascade orchestration + group clear entry point.
 * Fun contacts after settle go through application/fun-effects registry.
 */
import { groupSounds } from "../characters/data";
import { addScore } from "../score";
import { sprites, pieces } from "../game/board-state";
import {
  onKanadeCleared,
  onShizukuCleared,
  cancelShizukuSwapIfShihoPresent,
} from "../fun/effects";
import { fallChunk } from "./core";
import { findClearPieces } from "./clear-rules";
import { playClearAnimation } from "./clear-vfx";
import { spritesInChunk } from "./mutate";
import { playLoadedSfx } from "../audio/sfx";
import { CHAR } from "../characters/ids";
import {
  runSettledEffects,
  runClearedEffects,
} from "../application/fun-effects";

/**
 * After gravity + cantilever tips settle: re-check fun contacts via plugins.
 */
const runPostGravityEffects = async (): Promise<boolean> => {
  const { changed } = await runSettledEffects();
  cancelShizukuSwapIfShihoPresent(
    sprites.some((sp) => sp.character?.name === CHAR.Shiho),
  );
  return changed;
};

/**
 * Full board settle: gravity + tips → fun contacts → clears → repeat
 * until nothing moves. Call after any land / tip that may rearrange cells.
 *
 * `cleared` is true if any scoring clear / allergy / fries eat happened
 * (used by land handlers for combo reset).
 */
export const settleBoard = async (): Promise<{ cleared: boolean }> => {
  let cleared = false;
  for (let guard = 0; guard < 32; guard++) {
    await fallChunk(sprites);

    let changed = false;
    const settled = await runSettledEffects();
    if (settled.changed) changed = true;
    if (settled.scored) cleared = true;
    cancelShizukuSwapIfShihoPresent(
      sprites.some((sp) => sp.character?.name === CHAR.Shiho),
    );

    let chunk = findClearPieces(pieces);
    while (chunk !== undefined) {
      changed = true;
      cleared = true;
      await clearChunk(chunk);
      chunk = findClearPieces(pieces);
    }

    if (!changed) break;
  }
  return { cleared };
};

export const clearChunk = async (
  chunk: [number, number][],
  options?: { silent?: boolean },
) => {
  const silent = options?.silent === true;
  const toRemove = spritesInChunk(chunk);

  if (toRemove.length === 0) return;

  if (toRemove.some((sp) => sp.character?.name === CHAR.Kanade)) {
    onKanadeCleared();
  }
  if (toRemove.some((sp) => sp.character?.name === CHAR.Shizuku)) {
    const shihoOnBoard = sprites.some(
      (sp) =>
        sp.character?.name === CHAR.Shiho &&
        !toRemove.find((r) => r.sprite === sp.sprite),
    );
    onShizukuCleared(shihoOnBoard);
  }

  addScore(chunk.length);

  const clearedGroup = toRemove.find((sp) => sp.character?.group)?.character
    ?.group;
  const groupVoiceKey =
    !silent &&
    clearedGroup &&
    clearedGroup !== "Special" &&
    groupSounds[clearedGroup]
      ? groupSounds[clearedGroup]
      : null;

  const voiceStart = groupVoiceKey ? performance.now() : 0;
  if (groupVoiceKey) {
    playLoadedSfx(groupVoiceKey, "voice", 0.5);
  }

  await playClearAnimation(toRemove);

  // Wonder Blast and other clear-time fun plugins
  await runClearedEffects(toRemove);

  // Fall + tips, then re-check fun contacts until quiet.
  for (let guard = 0; guard < 16; guard++) {
    await fallChunk(sprites);
    const changed = await runPostGravityEffects();
    if (!changed) break;
  }

  if (groupVoiceKey) {
    const elapsed = performance.now() - voiceStart;
    const remaining = 2200 - elapsed;
    if (remaining > 0) {
      await new Promise((r) => setTimeout(r, remaining));
    }
  }
};
