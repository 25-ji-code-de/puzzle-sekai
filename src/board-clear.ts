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
import { recheckCarrotAllergy, tryEmuShrink, applyWonderBlast } from "./board-fun";

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
    sound.play(groupVoiceKey, { volume: 0.5 });
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

  // Phase 4: Fall pieces
  await fallChunk(sprites);

  // After gravity: carrot allergy may connect newly
  await recheckCarrotAllergy();

  // えむちぢみ: after gravity settles, shrink Emus adjacent to Mafuyu
  await tryEmuShrink();

  // After gravity, cancel swap if Shiho is (still / newly) on board
  cancelShizukuSwapIfShihoPresent(
    sprites.some((sp) => sp.character?.name === "Shiho"),
  );

  // Wait remaining time so total from voice start = 2200ms
  if (groupVoiceKey) {
    const elapsed = performance.now() - voiceStart;
    const remaining = 2200 - elapsed;
    if (remaining > 0) {
      await new Promise((r) => setTimeout(r, remaining));
    }
  }
};
