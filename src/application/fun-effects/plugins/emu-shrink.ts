/**
 * Fun plugin — Emu shrink after settle.
 */
import { tryEmuShrink } from "../../../board/fun/emu-shrink";
import type { FunEffect } from "../types";

export const emuShrinkEffect: FunEffect = {
  id: "emuShrink",
  async onSettled(ctx) {
    if (!ctx.isOn("emuShrink")) return { changed: false };
    const changed = await tryEmuShrink();
    return { changed };
  },
};
