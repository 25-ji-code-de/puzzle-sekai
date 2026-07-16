import * as PIXI from "pixi.js-legacy";
import sound from "pixi-sound";
import { app, gameTicker } from ".";
import { groupSounds } from "./character-data";
import { addScore } from "./score";
import { sprites, pieces, setSprites } from "./states";
import {
  isFunModeOn,
  onKanadeCleared,
  onShizukuCleared,
  cancelShizukuSwapIfShihoPresent,
} from "./fun-effects";
import { fallChunk, createParticles } from "./board-core";
import {
  recheckCarrotAllergy,
  tryMizukiEatFries,
  tryEmuShrink,
  applyWonderBlast,
} from "./board-fun";
import { findClearPieces } from "./clear";
import { voiceVol } from "./settings";

/**
 * After gravity + cantilever tips settle: re-check fun contacts.
 * Tips can create new adjacencies (e.g. Emu next to Mafuyu) that the
 * pre-fall checks never saw — must re-run until quiet.
 * Returns true if any effect fired (may have cleared / shrunk / eaten).
 */
const runPostGravityEffects = async (): Promise<boolean> => {
  let changed = false;
  // Allergy / fries count as "cleared" for combo purposes upstream
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
      // clearChunk already falls + runs post effects once; outer loop
      // re-settles for tip-created contacts / further clears.
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
  const toRemove = sprites.filter((sprite) => {
    return (
      sprite.coordinates &&
      chunk.find((e) =>
        sprite.coordinates?.find((c) => c.join(",") === e.join(",")),
      )
    );
  });

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

  // Determine group voice to play (skip for silent allergy clears)
  const clearedGroup = toRemove.find((sp) => sp.character?.group)?.character?.group;
  const groupVoiceKey =
    !silent && clearedGroup && groupSounds[clearedGroup]
      ? groupSounds[clearedGroup]
      : null;

  // Start group voice and record start time
  const voiceStart = groupVoiceKey ? performance.now() : 0;
  if (groupVoiceKey) {
    sound.play(groupVoiceKey, { volume: voiceVol(0.5) });
  }

  // Phase 1: Turn white instantly
  toRemove.forEach((sp) => {
    const colorMatrix = new PIXI.filters.ColorMatrixFilter();
    colorMatrix.desaturate();
    colorMatrix.brightness(3, false);
    sp.sprite.filters = [colorMatrix];
  });

  await new Promise((r) => setTimeout(r, 150));

  // Phase 2: Glow effect
  const glowFilters = toRemove.map(() => {
    const colorMatrix = new PIXI.filters.ColorMatrixFilter();
    colorMatrix.desaturate();
    colorMatrix.brightness(5, false);
    return colorMatrix;
  });

  let glowFrame = 0;
  const glowDuration = 30;
  await new Promise<void>((resolve) => {
    const glowAnim = (delta: number) => {
      glowFrame += delta;
      const progress = glowFrame / glowDuration;
      const brightness = 5 + progress * 5;
      toRemove.forEach((sp, i) => {
        glowFilters[i].brightness(brightness, false);
        sp.sprite.filters = [glowFilters[i]];
        sp.sprite.alpha = 1 - progress * 0.5;
        sp.sprite.scale.set(1 + progress * 0.3);
      });
      if (glowFrame >= glowDuration) {
        gameTicker.remove(glowAnim);
        // Phase 3: Create particles and remove
        createParticles(toRemove);
        toRemove.forEach((sp) => {
          sp.coordinates?.forEach(([x, y]) => {
            pieces[y][x] = null;
          });
          app.stage.removeChild(sp.sprite);
        });
        setSprites(sprites.filter(
          (s) => !toRemove.find((sp) => s.sprite === sp.sprite),
        ));
        resolve();
      }
    };
    gameTicker.add(glowAnim);
  });

  // Wonder Blast: Rui + NeneRobo in same clear → random board blast
  if (isFunModeOn("wonderBlast")) {
    applyWonderBlast(toRemove);
  }

  // Phase 4: Fall + tips, then re-check fun contacts until quiet.
  // A tip can create new Emu/Mafuyu (etc.) adjacencies that pre-fall
  // checks missed — loop so they fire this turn, not on the next land.
  for (let guard = 0; guard < 16; guard++) {
    await fallChunk(sprites);
    const changed = await runPostGravityEffects();
    if (!changed) break;
  }

  // Wait remaining time so total from voice start = 2200ms
  if (groupVoiceKey) {
    const elapsed = performance.now() - voiceStart;
    const remaining = 2200 - elapsed;
    if (remaining > 0) {
      await new Promise((r) => setTimeout(r, remaining));
    }
  }
};
