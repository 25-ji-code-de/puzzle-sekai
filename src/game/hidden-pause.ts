/**
 * Pure policy for document visibility → pause UI.
 * Wired from game/states bindHiddenPauseLifecycle (DOM side).
 */
export type VisibilityStateLike = "hidden" | "visible" | string;

export type PhaseLike =
  | { type: "playing" }
  | { type: "paused"; reason: "user" | "portrait" | "hidden" | string }
  | { type: string; reason?: string };

export type HiddenPauseAction =
  { action: "none" } | { action: "pause" } | { action: "showPauseMenu" };

/**
 * When the tab hides while playing → pause with reason "hidden".
 * When returning visible from that pause (and no pause menu yet) → show menu
 * so the player opts in (we never auto-resume).
 */
export const hiddenPauseDecision = (
  visibility: VisibilityStateLike,
  phase: PhaseLike,
  pauseMenuOpen: boolean,
): HiddenPauseAction => {
  if (visibility === "hidden") {
    if (phase.type === "playing") return { action: "pause" };
    return { action: "none" };
  }
  if (
    visibility === "visible" &&
    phase.type === "paused" &&
    phase.reason === "hidden" &&
    !pauseMenuOpen
  ) {
    return { action: "showPauseMenu" };
  }
  return { action: "none" };
};
