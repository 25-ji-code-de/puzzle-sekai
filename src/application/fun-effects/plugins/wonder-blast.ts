/**
 * Fun plugin — Wonder Blast on clear.
 */
import { applyWonderBlast } from "../../../board/fun/wonder-blast";
import type { SpriteData } from "../../../game/board-state";
import type { FunEffect } from "../types";

export const wonderBlastEffect: FunEffect = {
  id: "wonderBlast",
  async onCleared(ctx, cleared: SpriteData[]) {
    if (!ctx.isOn("wonderBlast")) return { changed: false };
    const blasted = await applyWonderBlast(cleared);
    return { changed: blasted, scored: blasted };
  },
};
