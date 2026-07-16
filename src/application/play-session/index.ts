/**
 * Play-session control surface for UI and boot.
 * Phase lives here; control functions are implemented in game/states.
 */
export {
  getPlayPhase,
  setPlayPhase,
  isPlayActive,
  isPlayingPhase,
  isPausedPhase,
  type PlayPhase,
} from "./phase";

export {
  start,
  pausePlay,
  resumePlay,
  returnToMenu,
} from "../../game/states";
