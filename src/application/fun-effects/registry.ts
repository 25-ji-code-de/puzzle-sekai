/**
 * Fun-effect registry — clear-flow calls these instead of importing plugins.
 */
import { isFunModeOn } from "../../fun/effects";
import type { SpriteData } from "../../game/board-state";
import type { FunContext, FunEffect, FunResult } from "./types";
import { allergyEffect } from "./plugins/allergy";
import { mizukiEffect } from "./plugins/mizuki";
import { emuShrinkEffect } from "./plugins/emu-shrink";
import { wonderBlastEffect } from "./plugins/wonder-blast";

const PLUGINS: FunEffect[] = [
  allergyEffect,
  mizukiEffect,
  emuShrinkEffect,
  wonderBlastEffect,
];

const ctx: FunContext = {
  isOn: isFunModeOn,
};

const empty: FunResult = { changed: false };

export const runSettledEffects = async (): Promise<{
  changed: boolean;
  scored: boolean;
}> => {
  let changed = false;
  let scored = false;
  for (const plugin of PLUGINS) {
    if (!plugin.onSettled) continue;
    if (!ctx.isOn(plugin.id) && plugin.id !== "itemAllergy") {
      // still call if plugin gates internally — most gate themselves
    }
    const result = await plugin.onSettled(ctx);
    if (result.changed) changed = true;
    if (result.scored) scored = true;
  }
  return { changed, scored };
};

export const runClearedEffects = async (
  cleared: SpriteData[],
): Promise<FunResult> => {
  let changed = false;
  for (const plugin of PLUGINS) {
    if (!plugin.onCleared) continue;
    const result = (await plugin.onCleared(ctx, cleared)) ?? empty;
    if (result.changed) changed = true;
  }
  return { changed };
};
