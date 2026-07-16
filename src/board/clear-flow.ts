/**
 * Clear cascade orchestration + group clear entry point.
 */
import sound from "pixi-sound";
import { groupSounds } from "../characters/data";
import { addScore } from "../score";
import { sprites, pieces } from "../game/board-state";
import {
  isFunModeOn,
  onKanadeCleared,
  onShizukuCleared,
  cancelShizukuSwapIfShihoPresent,
} from "../fun/effects";
import { fallChunk } from "./core";
import {
  recheckCarrotAllergy,
  tryMizukiEatFries,
  tryEmuShrink,
  applyWonderBlast,
} from "./fun";
import { findClearPieces } from "./clear-rules";
import { playClearAnimation } from "./clear-vfx";
import { spritesInChunk } from "./mutate";
import { voiceVol } from "../settings";

/**
 * After gravity + cantilever tips settle: re-check fun contacts.
 * Tips can create new adjacencies (e.g. Emu next to Mafuyu) that the
 * pre-fall checks never saw — must re-run until quiet.
 * Returns true if any effect fired (may have cleared / shrunk / eaten).
 */
const runPostGravityEffects = async (): Promise<boolean> => {
  let changed = false;
  if (await recheckCarrotAllergy()) changed = true;
  if (await tryMizukiEatFries()) changed = true;
  if (await tryEmuShrink()) changed = true;
  cancelShizukuSwapIfShihoPresent(
    sprites.some((sp) => sp.character?.name === "Shiho"),
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
    if (await recheckCarrotAllergy()) {
      changed = true;
      cleared = true;
    }
    if (await tryMizukiEatFries()) {
      changed = true;
      cleared = true;
    }
    if (await tryEmuShrink()) {
      changed = true;
    }
    cancelShizukuSwapIfShihoPresent(
      sprites.some((sp) => sp.character?.name === "Shiho"),
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

  if (toRemove.some((sp) => sp.character?.name === "Kanade")) {
    onKanadeCleared();
  }
  if (toRemove.some((sp) => sp.character?.name === "Shizuku")) {
    const shihoOnBoard = sprites.some(
      (sp) =>
        sp.character?.name === "Shiho" &&
        !toRemove.find((r) => r.sprite === sp.sprite),
    );
    onShizukuCleared(shihoOnBoard);
  }

  addScore(chunk.length);

  const clearedGroup = toRemove.find((sp) => sp.character?.group)?.character
    ?.group;
  const groupVoiceKey =
    !silent && clearedGroup && groupSounds[clearedGroup]
      ? groupSounds[clearedGroup]
      : null;

  const voiceStart = groupVoiceKey ? performance.now() : 0;
  if (groupVoiceKey) {
    sound.play(groupVoiceKey, { volume: voiceVol(0.5) });
  }

  await playClearAnimation(toRemove);

  // Wonder Blast: Rui + NeneRobo in same clear → random board blast
  if (isFunModeOn("wonderBlast")) {
    applyWonderBlast(toRemove);
  }

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
