/**
 * Play-session control surface for UI.
 * Re-exports game control API so menus do not import game/states internals.
 */
export {
  getPlayPhase,
  setPlayPhase,
  isPlayingPhase,
  isPausedPhase,
  type PlayPhase,
} from "./phase";

// Control API implemented in game/states — single facade for UI
export {
  start,
  pausePlay,
  resumePlay,
  returnToMenu,
  isPlayActive,
} from "../../game/states";
