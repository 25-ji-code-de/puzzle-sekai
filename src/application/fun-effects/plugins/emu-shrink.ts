/**
 * Fun plugin wrapper — Emu shrink after settle.
 */
import { tryEmuShrink } from "../../../board/fun/emu-shrink";
import type { FunEffect } from "../types";

export const emuShrinkEffect: FunEffect = {
  id: "emuShrink",
  async onSettled() {
    const changed = await tryEmuShrink();
    return { changed };
  },
};
