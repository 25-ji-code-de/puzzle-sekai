/**
 * Post-land orchestration: fun land hooks → settle board → combo reset.
 */
import type * as PIXI from "pixi.js-legacy";
import type { CharacterData } from "../../characters/data";
import { commitLandedSprite, settleBoard } from "../../board";
import { resetCombo } from "../../score";
import { pieceKindFrom, rotationToOrientation } from "../../domain/types";
import { primaryFromSprite } from "../../presentation/placement";
import { runItemLandEffects, runCharacterLandEffects } from "../fun-effects";
import { isMatchOpen } from "./match-gate";

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
  if (!isMatchOpen()) return { scored: false, topOut: false };
  if (y < 0) return { scored: false, topOut: true };
  commitLandedSprite(sprite, spriteIndex, undefined, true);
  if (!isMatchOpen()) return { scored: false, topOut: false };
  const landFx = await runItemLandEffects({ itemFile, x, y });
  if (!isMatchOpen()) return { scored: false, topOut: false };
  const { cleared } = await settleBoard();
  if (!isMatchOpen()) return { scored: false, topOut: false };
  const scored = !!(landFx.scored || cleared);
  if (!scored) resetCombo();
  return { scored, topOut: false };
};

export const handleCharacterLand = async (
  sprite: PIXI.Sprite,
  spriteIndex: number,
  character: CharacterData,
): Promise<LandOutcome> => {
  if (!isMatchOpen()) return { scored: false, topOut: false };
  const kind = pieceKindFrom({ characterName: character.name });
  const { y } = primaryFromSprite(sprite, kind);
  const orientation = rotationToOrientation(sprite.rotation);
  if (y < 0 || (orientation === 0 && y <= 0)) {
    return { scored: false, topOut: true };
  }
  commitLandedSprite(sprite, spriteIndex, character);
  if (!isMatchOpen()) return { scored: false, topOut: false };
  const landFx = await runCharacterLandEffects({
    spriteIndex,
    name: character.name,
  });
  if (!isMatchOpen()) return { scored: false, topOut: false };
  const { cleared } = await settleBoard();
  if (!isMatchOpen()) return { scored: false, topOut: false };
  const scored = !!(landFx.scored || cleared);
  if (!scored) resetCombo();
  return { scored, topOut: false };
};
