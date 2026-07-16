/**
 * Fun-mode plugin contract.
 * Implementations mutate board via existing helpers for now; later phases
 * return pure { board, events } results.
 */
import type { FunModeId } from "../../fun/modes";
import type { SpriteData } from "../../game/board-state";
import type { GameEvent } from "../../domain/events";

export type FunContext = {
  /** Whether this mode is currently enabled in settings. */
  isOn: (id: FunModeId) => boolean;
};

export type FunResult = {
  /** True if the board changed (triggers re-settle). */
  changed: boolean;
  /** True if a scoring clear-like effect happened (combo). */
  scored?: boolean;
  events?: GameEvent[];
};

export interface FunEffect {
  readonly id: FunModeId;
  /** After a gravity settle step (contacts / shrink / eat). */
  onSettled?(ctx: FunContext): Promise<FunResult> | FunResult;
  /** After a group clear animation (e.g. wonder blast). */
  onCleared?(
    ctx: FunContext,
    cleared: SpriteData[],
  ): Promise<FunResult> | FunResult;
}
