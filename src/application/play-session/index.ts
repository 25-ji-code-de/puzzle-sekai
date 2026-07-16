/**
 * Play-session application API (phase + re-exports of control surface).
 * Full FSM still lives in game/states for now; phase tracks high-level mode.
 */
export {
  getPlayPhase,
  setPlayPhase,
  isPlayingPhase,
  isPausedPhase,
  type PlayPhase,
} from "./phase";
