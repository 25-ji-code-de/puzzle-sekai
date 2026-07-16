/**
 * Fun plugin wrapper — Mizuki eats fries after settle.
 */
import { tryMizukiEatFries } from "../../../board/fun/mizuki";
import type { FunEffect } from "../types";

export const mizukiEffect: FunEffect = {
  id: "mizukiShift",
  async onSettled() {
    const scored = await tryMizukiEatFries();
    return { changed: scored, scored };
  },
};
