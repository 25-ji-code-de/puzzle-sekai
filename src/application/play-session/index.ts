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
  isGameOverPhase,
  type PlayPhase,
} from "./phase";

export { openMatch, closeMatch, isMatchOpen } from "./match-gate";

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

/** Background-warm play textures (never blocks Start). */
const warmPlayPack = (): void => {
  void import("../../assets/play-pack").then((m) => {
    void m.ensurePlayPack();
  });
};

/**
 * Idle-prewarm the game chunk + play textures (call after boot shell is ready).
 * Play-pack is best-effort: Start does not await it; spawn uses loadTexture JIT.
 */
export const preloadGame = (): void => {
  void loadGameStates();
  void import("../../ui/pause-menu");
  warmPlayPack();
  // If truePhysics is already enabled in settings, warm Rapier early.
  void import("../../settings").then(({ getCurrentSettings }) => {
    if (getCurrentSettings().funModes?.truePhysics) {
      void import("../../board/dynamics").then((m) => m.warmRapier());
    }
  });
};

export const start = (): void => {
  // Do not await the full play pack — that made Restart wait for every group PNG.
  warmPlayPack();
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

/**
 * Resolve the ticker entry for starting a match (used by start-game / R).
 * Only waits for the game chunk. Textures load on demand via loadTexture;
 * ensurePlayPack keeps warming in the background.
 */
export const getStartState = (): Promise<(delta: number) => void> => {
  warmPlayPack();
  return loadGameStates().then((m) => m.start as (delta: number) => void);
};
