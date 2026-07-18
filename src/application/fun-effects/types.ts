/**
 * Fun-mode plugin contract.
 * Plugins run as direct hooks from land/settle/clear — there is no domain event bus.
 */
import type { FunModeId } from "../../fun/modes";
import type { SpriteData } from "../../game/board-state";
import type { CharacterName } from "../../characters/ids";

export type FunContext = {
  isOn: (id: FunModeId) => boolean;
};

export type FunResult = {
  changed: boolean;
  scored?: boolean;
};

export type ItemLandArgs = {
  itemFile: string;
  x: number;
  y: number;
};

export type CharacterLandArgs = {
  spriteIndex: number;
  name: CharacterName;
  /** Live sprite ref — preferred over index (indices go stale after clears). */
  sprite?: import("pixi.js-legacy").Sprite;
};

export interface FunEffect {
  readonly id: FunModeId;
  /** After gravity settle step (contacts / shrink / eat). */
  onSettled?(ctx: FunContext): Promise<FunResult> | FunResult;
  /** After a group clear animation (e.g. wonder blast). */
  onCleared?(
    ctx: FunContext,
    cleared: SpriteData[],
  ): Promise<FunResult> | FunResult;
  /** Item just landed (before full settle). */
  onItemLand?(
    ctx: FunContext,
    args: ItemLandArgs,
  ): Promise<FunResult> | FunResult;
  /** Character piece just landed (before full settle). */
  onCharacterLand?(
    ctx: FunContext,
    args: CharacterLandArgs,
  ): Promise<FunResult> | FunResult;
}
