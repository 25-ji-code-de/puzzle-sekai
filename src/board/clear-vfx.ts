/**
 * Clear presentation: white flash → glow → particles → remove from board.
 * Uses tint/alpha/scale only (no ColorMatrixFilter offscreen passes).
 */
import { gameTicker } from "../runtime";
import type { SpriteData } from "../game/board-state";
import { removeSpritesFromBoard } from "./mutate";
import { createParticles } from "./particles";

const WHITE_FLASH = 0xffffff;

/** Flash → glow/scale → burst → remove. */
export const playClearAnimation = async (
  toRemove: SpriteData[],
): Promise<void> => {
  if (toRemove.length === 0) return;

  // Phase 1: flash white via tint (cheap; no filter FBO).
  const prevTints = toRemove.map((sp) => sp.sprite.tint);
  toRemove.forEach((sp) => {
    sp.sprite.filters = [];
    sp.sprite.tint = WHITE_FLASH;
  });

  await new Promise((r) => setTimeout(r, 150));

  // Phase 2: scale up + fade (still tint white).
  let glowFrame = 0;
  const glowDuration = 30;
  await new Promise<void>((resolve) => {
    const glowAnim = (delta: number) => {
      glowFrame += delta;
      const progress = Math.min(1, glowFrame / glowDuration);
      toRemove.forEach((sp) => {
        sp.sprite.tint = WHITE_FLASH;
        sp.sprite.alpha = 1 - progress * 0.5;
        sp.sprite.scale.set(1 + progress * 0.3);
      });
      if (glowFrame >= glowDuration) {
        gameTicker.remove(glowAnim);
        createParticles(toRemove);
        // Restore tint before destroy path (harmless if sprite is dropped).
        toRemove.forEach((sp, i) => {
          sp.sprite.tint = prevTints[i] ?? 0xffffff;
        });
        removeSpritesFromBoard(toRemove);
        resolve();
      }
    };
    gameTicker.add(glowAnim);
  });
};
