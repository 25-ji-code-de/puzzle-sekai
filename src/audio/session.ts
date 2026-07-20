/**
 * Match BGM session: menu intro→loop, in-game rotation, game-over stinger chain.
 * Separated from the play state machine so audio concerns stay in audio/.
 *
 * Play BGM downloads wait for bandwidth-gate (first piece texture) so they do
 * not compete with character sprites on slow networks.
 */
import type * as PIXI from "pixi.js-legacy";
import { gameTicker } from "../runtime";
import {
  BGM_BASE_VOLUME,
  ensureBgm,
  getBgm,
  peekBgm,
  prefetchPlayBgm,
  setLiveBgm,
  stopAllBgmAliases,
  unlockAudio,
  type BgmKey,
} from "./bgm";
import { devWarn } from "../util/dev-log";

let bgmPlaying: PIXI.sound.Sound | undefined;
let bgmActive = false;

/** Shared intro-instance handle for menu / game-over stinger chains. */
let stingerIntroInst: {
  stop?: () => void;
  off?: (e: string, fn: () => void) => void;
} | null = null;
let stingerIntroOnEnd: (() => void) | null = null;

let bgmSwitching = false;
/** While true, checkBGM must not treat a paused track as finished. */
let sessionPaused = false;

export const setBgmSessionPaused = (paused: boolean) => {
  sessionPaused = paused;
};

const detachStingerIntro = () => {
  if (stingerIntroInst && stingerIntroOnEnd) {
    try {
      stingerIntroInst.off?.("end", stingerIntroOnEnd);
    } catch {
      /* ignore */
    }
  }
  stingerIntroInst = null;
  stingerIntroOnEnd = null;
};

export const stopBgm = () => {
  bgmActive = false;
  detachStingerIntro();
  if (bgmPlaying) {
    try {
      bgmPlaying.stop();
    } catch (e) {
      devWarn("[audio] stopBgm failed", e);
    }
  }
  stopAllBgmAliases();
};

export const playBgm = (
  s: PIXI.sound.Sound,
  options: { loop: boolean; volume?: number } = { loop: true },
) => {
  // Never call play() until isLoaded — otherwise pixi-sound re-enters load()
  // and can throw InvalidStateError on AudioBufferSourceNode.buffer.
  if (!s.isLoaded) {
    console.warn("[audio] playBgm called before sound was loaded");
    return;
  }
  bgmPlaying = s;
  setLiveBgm(s);
  try {
    bgmPlaying.play({
      loop: options.loop,
      volume: options.volume ?? BGM_BASE_VOLUME,
    });
  } catch {
    /* ignore */
  }
};

type PlayInstance = {
  on: (e: string, fn: () => void) => void;
  stop?: () => void;
};

/**
 * Play non-loop intro, then switch to loop when it ends.
 * Same chain used by menu (161) and game-over (182).
 */
const playIntroThenLoop = async (
  introKey: BgmKey,
  loopKey: BgmKey,
): Promise<void> => {
  stopBgm();
  const [intro, loop] = await ensureBgm(introKey, loopKey);
  if (!intro?.isLoaded) return;

  bgmPlaying = intro;
  setLiveBgm(intro);
  const onEnd = () => {
    stingerIntroInst = null;
    stingerIntroOnEnd = null;
    if (loop?.isLoaded) playBgm(loop, { loop: true });
  };
  stingerIntroOnEnd = onEnd;

  try {
    const result = intro.play({ loop: false, volume: BGM_BASE_VOLUME });
    const attach = (inst: PlayInstance) => {
      stingerIntroInst = inst;
      inst.on("end", onEnd);
    };
    if (result instanceof Promise) {
      // Should not happen when isLoaded; still guard.
      void result.then((inst) => attach(inst as PlayInstance));
    } else if (result) {
      attach(result as PlayInstance);
    }
  } catch {
    /* ignore */
  }
};

/** Menu: 161.1 intro → 161.2 loop. */
export const playMenuBgm = async () => {
  unlockAudio();
  await playIntroThenLoop("bgm161_1", "bgm161_2");
  // Do not prefetch play/game-over tracks here — that pulls multi-MB audio
  // while the player is still on the menu. Match start loads them just-in-time.
};

/** Game over: 182.1 intro → 182.2 loop. */
export const playGameOverBgm = async () => {
  await playIntroThenLoop("bgm182_1", "bgm182_2");
};

const playNextBGM = async () => {
  if (!bgmActive || bgmSwitching) return;
  bgmSwitching = true;
  try {
    const pick: BgmKey = Math.random() < 0.7 ? "bgm038" : "bgm168";
    // Prefer already-warm tracks so a cache hit can play during visual-critical
    // without starting a new multi-MB download.
    const ready =
      peekBgm(pick) ?? peekBgm(pick === "bgm038" ? "bgm168" : "bgm038");
    // getBgm waits on whenAudioAllowed for play keys (see bgm.ts).
    const s = ready ?? (await getBgm(pick));
    if (!bgmActive || !s?.isLoaded) return;
    bgmPlaying = s;
    setLiveBgm(s);
    try {
      bgmPlaying.play({ loop: false, volume: BGM_BASE_VOLUME });
    } catch {
      /* ignore */
    }
    // Warm the rest only after the first piece has claimed the pipe.
    prefetchPlayBgm();
  } finally {
    bgmSwitching = false;
  }
};

const checkBGM = () => {
  if (!bgmActive) {
    gameTicker.remove(checkBGM);
    return;
  }
  if (sessionPaused || bgmSwitching) return;
  if (bgmPlaying && !bgmPlaying.isPlaying) {
    void playNextBGM();
  }
};

/**
 * Start in-match BGM rotation (non-loop tracks).
 * Does not fire a 4-track prefetch up front — that raced first piece textures.
 * Downloads wait for bandwidth-gate via getBgm / prefetchPlayBgm.
 */
export const startPlayBgm = () => {
  bgmActive = true;
  void playNextBGM();
  gameTicker.remove(checkBGM);
  gameTicker.add(checkBGM);
};

export const pauseBgmPlayback = () => {
  try {
    if (bgmPlaying) bgmPlaying.pause();
  } catch {
    /* ignore */
  }
};

export const resumeBgmPlayback = () => {
  try {
    if (bgmPlaying && bgmActive) bgmPlaying.resume();
  } catch {
    /* ignore */
  }
};
