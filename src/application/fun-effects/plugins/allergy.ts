/**
 * Fun plugin — carrot allergy (land + settle).
 */
import {
  applyCarrotAllergy,
  applyCarrotAllergyOnCharacter,
  recheckCarrotAllergy,
} from "../../../board/fun/allergy";
import { isCarrotItem } from "../../../items";
import { isAllergyAvoiderName } from "../../../characters/ids";
import type { FunEffect } from "../types";

export const allergyEffect: FunEffect = {
  id: "itemAllergy",
  async onItemLand(ctx, { itemFile, x, y }) {
    if (!ctx.isOn("itemAllergy") || !isCarrotItem(itemFile)) {
      return { changed: false };
    }
    const scored = await applyCarrotAllergy(x, y);
    return { changed: scored, scored };
  },
  async onCharacterLand(ctx, { spriteIndex, name }) {
    if (!ctx.isOn("itemAllergy") || !isAllergyAvoiderName(name)) {
      return { changed: false };
    }
    const scored = await applyCarrotAllergyOnCharacter(spriteIndex);
    return { changed: scored, scored };
  },
  async onSettled(ctx) {
    if (!ctx.isOn("itemAllergy")) return { changed: false };
    const scored = await recheckCarrotAllergy();
    return { changed: scored, scored };
  },
};
