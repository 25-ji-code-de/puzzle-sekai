/**
 * Play-session control surface for UI and boot.
 * Phase is sync/local; match control loads game/states on demand so the
 * heavy board/piece graph is not in the initial JS parse path.
 */
export {
  getPlayPhase,
  setPlayPhase,
  isPlayActive,
  isPlayingPhase,
  isPausedPhase,
  type PlayPhase,
} from "./phase";

type StatesMod = typeof import("../../game/states");

let statesMod: StatesMod | null = null;
let statesPromise: Promise<StatesMod> | null = null;

/** Load (or reuse) the match state machine chunk. */
export const loadGameStates = (): Promise<StatesMod> => {
  if (statesMod) return Promise.resolve(statesMod);
  if (!statesPromise) {
    statesPromise = import("../../game/states").then((m) => {
      statesMod = m;
      return m;
    });
  }
  return statesPromise;
};

/** Idle-prewarm the game chunk (call after boot shell is ready). */
export const preloadGame = (): void => {
  void loadGameStates();
  void import("../../ui/pause-menu");
};

export const start = (): void => {
  void loadGameStates().then((m) => m.start());
};

export const pausePlay = (): void => {
  void loadGameStates().then((m) => m.pausePlay());
};

export const resumePlay = (): void => {
  void loadGameStates().then((m) => m.resumePlay());
};

export const returnToMenu = (): void => {
  void loadGameStates().then((m) => m.returnToMenu());
};

/** Resolve the ticker entry for starting a match (used by start-game). */
export const getStartState = (): Promise<(delta: number) => void> =>
  loadGameStates().then((m) => m.start as (delta: number) => void);
