/**
 * Fun plugin wrapper — Wonder Blast on clear.
 */
import { isFunModeOn } from "../../../fun/effects";
import { applyWonderBlast } from "../../../board/fun/wonder-blast";
import type { SpriteData } from "../../../game/board-state";
import type { FunEffect } from "../types";

export const wonderBlastEffect: FunEffect = {
  id: "wonderBlast",
  onCleared(_ctx, cleared: SpriteData[]) {
    if (!isFunModeOn("wonderBlast")) return { changed: false };
    const before = cleared.length;
    applyWonderBlast(cleared);
    // applyWonderBlast mutates board directly; treat as changed when mode on
    void before;
    return { changed: true };
  },
};
