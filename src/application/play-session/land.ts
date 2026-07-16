/**
 * Post-land orchestration: fun land hooks → settle board → combo reset.
 */
import type * as PIXI from "pixi.js-legacy";
import type { CharacterData } from "../../characters/data";
import { updateCoordinates, settleBoard } from "../../board";
import { resetCombo } from "../../score";
import { getCoordinates } from "../../utils/coords";
import {
  runItemLandEffects,
  runCharacterLandEffects,
} from "../fun-effects";

export type LandOutcome = {
  scored: boolean;
  topOut: boolean;
};

export const handleItemLand = async (
  sprite: PIXI.Sprite,
  spriteIndex: number,
  itemFile: string,
  x: number,
  y: number,
): Promise<LandOutcome> => {
  if (y < 0) return { scored: false, topOut: true };
  updateCoordinates(sprite, spriteIndex, undefined, true);
  const landFx = await runItemLandEffects({ itemFile, x, y });
  const { cleared } = await settleBoard();
  const scored = !!(landFx.scored || cleared);
  if (!scored) resetCombo();
  return { scored, topOut: false };
};

export const handleCharacterLand = async (
  sprite: PIXI.Sprite,
  spriteIndex: number,
  character: CharacterData,
): Promise<LandOutcome> => {
  const { y } = getCoordinates(sprite);
  const orientation = (Math.fround(sprite.rotation / Math.PI) * 2 + 2) % 4;
  if (y < 0 || (orientation === 0 && y <= 0)) {
    return { scored: false, topOut: true };
  }
  updateCoordinates(sprite, spriteIndex, character);
  const landFx = await runCharacterLandEffects({
    spriteIndex,
    name: character.name,
  });
  const { cleared } = await settleBoard();
  const scored = !!(landFx.scored || cleared);
  if (!scored) resetCombo();
  return { scored, topOut: false };
};
