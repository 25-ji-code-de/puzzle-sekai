/**
 * Fun-effect registry — single entry for land / settle / clear hooks.
 */
import { isFunModeOn } from "../../fun/effects";
import type { SpriteData } from "../../game/board-state";
import type { CharacterName } from "../../characters/ids";
import type {
  FunContext,
  FunEffect,
  FunResult,
  ItemLandArgs,
  CharacterLandArgs,
} from "./types";
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

const merge = (into: FunResult, next: FunResult): FunResult => ({
  changed: into.changed || next.changed,
  scored: !!(into.scored || next.scored),
});

export const runSettledEffects = async (): Promise<FunResult> => {
  let acc: FunResult = { changed: false };
  for (const plugin of PLUGINS) {
    if (!plugin.onSettled || !ctx.isOn(plugin.id)) continue;
    acc = merge(acc, await plugin.onSettled(ctx));
  }
  return acc;
};

export const runClearedEffects = async (
  cleared: SpriteData[],
): Promise<FunResult> => {
  let acc: FunResult = { changed: false };
  for (const plugin of PLUGINS) {
    if (!plugin.onCleared || !ctx.isOn(plugin.id)) continue;
    acc = merge(acc, (await plugin.onCleared(ctx, cleared)) ?? { changed: false });
  }
  return acc;
};

export const runItemLandEffects = async (
  args: ItemLandArgs,
): Promise<FunResult> => {
  let acc: FunResult = { changed: false };
  for (const plugin of PLUGINS) {
    if (!plugin.onItemLand || !ctx.isOn(plugin.id)) continue;
    acc = merge(acc, await plugin.onItemLand(ctx, args));
  }
  return acc;
};

export const runCharacterLandEffects = async (
  args: CharacterLandArgs,
): Promise<FunResult> => {
  let acc: FunResult = { changed: false };
  for (const plugin of PLUGINS) {
    if (!plugin.onCharacterLand || !ctx.isOn(plugin.id)) continue;
    acc = merge(acc, await plugin.onCharacterLand(ctx, args));
  }
  return acc;
};

// re-export arg types for callers
export type { ItemLandArgs, CharacterLandArgs, CharacterName };
