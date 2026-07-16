/**
 * Match teardown helpers shared by start / returnToMenu.
 */
import type * as PIXI from "pixi.js-legacy";
import { app, resetGameTicker } from "../../runtime";
import {
  sprites,
  clearSpritesList,
  resetPieces,
} from "../../game/board-state";
import { stopBgm } from "../../audio/session";

export type StageHandles = {
  avatarStab?: PIXI.AnimatedSprite | null;
  avatarFlyDown?: PIXI.DisplayObject | null;
  barrel?: PIXI.DisplayObject | null;
  curtain?: PIXI.DisplayObject | null;
  nextPiece?: PIXI.Sprite | null;
  stopTimeAttackTimer: () => void;
  clearEndAnimation: () => void;
};

/** Remove every gameplay-owned sprite + stop timers. */
export const clearMatchStage = (h: StageHandles): void => {
  sprites.forEach((sp) => app.stage.removeChild(sp.sprite));
  clearSpritesList();
  resetGameTicker();
  h.clearEndAnimation();
  stopBgm();
  h.stopTimeAttackTimer();
  if (h.avatarStab) app.stage.removeChild(h.avatarStab);
  if (h.avatarFlyDown) app.stage.removeChild(h.avatarFlyDown);
  if (h.barrel) app.stage.removeChild(h.barrel);
  if (h.curtain) app.stage.removeChild(h.curtain);
  resetPieces();
  if (h.nextPiece) app.stage.removeChild(h.nextPiece);
};
