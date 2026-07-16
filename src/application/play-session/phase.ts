/**
 * Typed play-session phase (domain/application).
 * UI and pause gates should narrow on this instead of parallel booleans alone.
 */
import type { GameMode } from "../../settings/types";

export type PlayPhase =
  | { readonly type: "boot" }
  | { readonly type: "menu" }
  | { readonly type: "playing"; readonly mode: GameMode }
  | { readonly type: "settling"; readonly mode: GameMode }
  | { readonly type: "paused"; readonly reason: "user" | "portrait"; readonly mode: GameMode }
  | { readonly type: "gameOver"; readonly cause: "topOut" | "timeUp"; readonly mode: GameMode }
  | { readonly type: "idle" };

let phase: PlayPhase = { type: "boot" };

export const getPlayPhase = (): PlayPhase => phase;

export const setPlayPhase = (next: PlayPhase): void => {
  phase = next;
};

export const isPlayingPhase = (p: PlayPhase = phase): boolean =>
  p.type === "playing" || p.type === "settling";

export const isPausedPhase = (p: PlayPhase = phase): boolean =>
  p.type === "paused";
