/**
 * Clear cascade orchestration + group clear entry point.
 * Fun contacts after settle go through application/fun-effects registry.
 * truePhysics: continuous contact clears instead of grid findClearChunk.
 */
import { groupSounds } from "../characters/data";
import { addScore, recordGroupClear } from "../score";
import type { GroupName } from "../settings";
import { sprites, getGrid, type SpriteData } from "../game/board-state";
import {
  onKanadeCleared,
  onShizukuCleared,
  cancelShizukuSwapIfShihoPresent,
} from "../fun/effects";
import { fallChunk } from "./core";
import { findClearChunk } from "./clear-rules";
import { playClearAnimation } from "./clear-vfx";
import { spritesInChunk } from "./mutate";
import { playLoadedSfx } from "../audio/sfx";
import { CHAR } from "../characters/ids";
import {
  runSettledEffects,
  runClearedEffects,
} from "../application/fun-effects";
import {
  findClearEntities,
  isContinuousPhysics,
  massOfKind,
} from "./dynamics";
import { pieceKindFrom } from "../domain/types";

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

const scoreUnitsOf = (sp: SpriteData): number => {
  if (typeof sp.mass === "number") return sp.mass;
  if (sp.cells?.length) return sp.cells.length;
  return massOfKind(
    pieceKindFrom({
      characterName: sp.character?.name,
      isItem: sp.isItem,
      isShrunk: sp.isShrunk,
    }),
  );
};

const findContinuousClearSprites = (): SpriteData[] => {
  const views = sprites
    .filter((sp) => sp.entityId)
    .map((sp) => ({
      id: sp.entityId as string,
      kind: pieceKindFrom({
        characterName: sp.character?.name,
        isItem: sp.isItem,
        isShrunk: sp.isShrunk,
      }),
      pose: {
        x: sp.sprite.x,
        y: sp.sprite.y,
        rotation: sp.sprite.rotation,
      },
      isItem: !!sp.isItem,
      characterName: sp.character?.name,
    }));
  const ids = new Set(findClearEntities(views));
  return sprites.filter((sp) => sp.entityId && ids.has(sp.entityId));
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
  const continuous = isContinuousPhysics();

  for (let guard = 0; guard < 32; guard++) {
    await fallChunk(sprites);

    let changed = false;
    const settled = await runSettledEffects();
    if (settled.changed) changed = true;
    if (settled.scored) cleared = true;
    cancelShizukuSwapIfShihoPresent(
      sprites.some((sp) => sp.character?.name === CHAR.Shiho),
    );

    if (continuous) {
      let toRemove = findContinuousClearSprites();
      while (toRemove.length > 0) {
        changed = true;
        cleared = true;
        await clearSprites(toRemove);
        toRemove = findContinuousClearSprites();
      }
    } else {
      let chunk = findClearChunk(getGrid());
      while (chunk !== undefined) {
        changed = true;
        cleared = true;
        await clearChunk(chunk);
        chunk = findClearChunk(getGrid());
      }
    }

    if (!changed) break;
  }
  return { cleared };
};

/** Shared clear path for a known sprite list (grid or continuous). */
export const clearSprites = async (
  toRemove: SpriteData[],
  options?: { silent?: boolean },
) => {
  const silent = options?.silent === true;
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

  const units = toRemove.reduce((sum, sp) => sum + scoreUnitsOf(sp), 0);
  addScore(units);

  // Tally completed units present in this clear (excludes Special / items).
  // Multi-group clears (Mikudayo bridge) increment each completed unit once.
  const clearedUnits = new Set<GroupName>();
  for (const sp of toRemove) {
    const g = sp.character?.group;
    if (g && g !== "Special") clearedUnits.add(g as GroupName);
  }
  for (const g of clearedUnits) recordGroupClear(g);

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

export const clearChunk = async (
  chunk: [number, number][],
  options?: { silent?: boolean },
) => {
  const toRemove = spritesInChunk(chunk);
  await clearSprites(toRemove, options);
};
