/**
 * Typed play-session phase — single source of match lifecycle state.
 */
import type { GameMode } from "../../settings/types";

export type PlayPhase =
  | { readonly type: "boot" }
  | { readonly type: "menu" }
  | { readonly type: "playing"; readonly mode: GameMode }
  | {
      readonly type: "paused";
      readonly reason: "user" | "portrait";
      readonly mode: GameMode;
    }
  | {
      readonly type: "gameOver";
      readonly cause: "topOut" | "timeUp";
      readonly mode: GameMode;
    }
  | { readonly type: "idle" };

let phase: PlayPhase = { type: "boot" };

export const getPlayPhase = (): PlayPhase => phase;

export const setPlayPhase = (next: PlayPhase): void => {
  phase = next;
};

/** Match is running (including user/portrait pause). */
export const isPlayActive = (p: PlayPhase = phase): boolean =>
  p.type === "playing" || p.type === "paused";

export const isPlayingPhase = (p: PlayPhase = phase): boolean =>
  p.type === "playing";

export const isPausedPhase = (p: PlayPhase = phase): boolean =>
  p.type === "paused";

export const isGameOverPhase = (p: PlayPhase = phase): boolean =>
  p.type === "gameOver";
