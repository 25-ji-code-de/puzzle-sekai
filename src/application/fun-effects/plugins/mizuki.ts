/**
 * Fun plugin — Mizuki fries shift / eat.
 */
import { applyMizukiShift, tryMizukiEatFries } from "../../../board/fun/mizuki";
import { isFriesItem } from "../../../items";
import type { FunEffect } from "../types";

export const mizukiEffect: FunEffect = {
  id: "mizukiShift",
  async onItemLand(ctx, { itemFile, x, y }) {
    if (!ctx.isOn("mizukiShift") || !isFriesItem(itemFile)) {
      return { changed: false };
    }
    await applyMizukiShift(x, y);
    return { changed: true };
  },
  async onSettled(ctx) {
    if (!ctx.isOn("mizukiShift")) return { changed: false };
    const scored = await tryMizukiEatFries();
    return { changed: scored, scored };
  },
};
