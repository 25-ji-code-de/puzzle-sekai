/**
 * Clear presentation: white flash → glow → particles → remove from board.
 * ColorMatrixFilter desaturate+brightness is the intended look (white flash).
 * Tint alone cannot wash character textures to white.
 *
 * prefers-reduced-motion: skip glow tween + particles; brief flash then remove.
 */
import * as PIXI from "pixi.js-legacy";
import { prefersReducedMotion } from "../a11y";
import { gameTicker } from "../runtime";
import type { SpriteData } from "../game/board-state";
import { removeSpritesFromBoard } from "./mutate";
import { createParticles } from "./particles";

/** Desaturate → glow → burst → remove. */
export const playClearAnimation = async (
  toRemove: SpriteData[],
): Promise<void> => {
  if (toRemove.length === 0) return;

  // Phase 1: Turn white instantly (matrix filter — tint cannot do this).
  toRemove.forEach((sp) => {
    const colorMatrix = new PIXI.filters.ColorMatrixFilter();
    colorMatrix.desaturate();
    colorMatrix.brightness(3, false);
    sp.sprite.filters = [colorMatrix];
  });

  if (prefersReducedMotion()) {
    // One short flash so the clear still reads, then remove — no glow/particles.
    await new Promise((r) => setTimeout(r, 40));
    toRemove.forEach((sp) => {
      sp.sprite.filters = [];
    });
    removeSpritesFromBoard(toRemove);
    return;
  }

  await new Promise((r) => setTimeout(r, 150));

  // Phase 2: Glow brighter while fading / scaling up.
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
      const progress = Math.min(1, glowFrame / glowDuration);
      const brightness = 5 + progress * 5;
      toRemove.forEach((sp, i) => {
        glowFilters[i].brightness(brightness, false);
        sp.sprite.filters = [glowFilters[i]];
        sp.sprite.alpha = 1 - progress * 0.5;
        sp.sprite.scale.set(1 + progress * 0.3);
      });
      if (glowFrame >= glowDuration) {
        gameTicker.remove(glowAnim);
        createParticles(toRemove);
        // Drop filters before destroy so FBOs are released with the sprite path.
        toRemove.forEach((sp) => {
          sp.sprite.filters = [];
        });
        removeSpritesFromBoard(toRemove);
        resolve();
      }
    };
    gameTicker.add(glowAnim);
  });
};
