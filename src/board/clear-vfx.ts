/**
 * Clear presentation: white flash â†?glow â†?particles â†?remove from board.
 * No fun-mode imports â€?safe for allergy / silent clears without cycles.
 */
import * as PIXI from "pixi.js-legacy";
import { gameTicker } from "../runtime";
import type { SpriteData } from "../game/board-state";
import { removeSpritesFromBoard } from "./mutate";
import { createParticles } from "./particles";

/** Desaturate â†?glow â†?burst â†?remove. */
export const playClearAnimation = async (
  toRemove: SpriteData[],
): Promise<void> => {
  if (toRemove.length === 0) return;

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
        removeSpritesFromBoard(toRemove);
        resolve();
      }
    };
    gameTicker.add(glowAnim);
  });
};
