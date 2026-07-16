/**
 * Fun plugin wrapper — carrot allergy post-gravity recheck.
 */
import {
  recheckCarrotAllergy,
} from "../../../board/fun/allergy";
import type { FunEffect } from "../types";

export const allergyEffect: FunEffect = {
  id: "itemAllergy",
  async onSettled() {
    const scored = await recheckCarrotAllergy();
    return { changed: scored, scored };
  },
};
