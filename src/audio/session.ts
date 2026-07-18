/**
 * Match BGM session: menu loop, in-game rotation, game-over stinger chain.
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

let bgmPlaying: PIXI.sound.Sound | undefined;
let bgmActive = false;
let gameOverIntroInst: {
  stop?: () => void;
  off?: (e: string, fn: () => void) => void;
} | null = null;
let gameOverIntroOnEnd: (() => void) | null = null;
let bgmSwitching = false;
/** While true, checkBGM must not treat a paused track as finished. */
let sessionPaused = false;

export const setBgmSessionPaused = (paused: boolean) => {
  sessionPaused = paused;
};

export const stopBgm = () => {
  bgmActive = false;
  if (gameOverIntroInst && gameOverIntroOnEnd) {
    try {
      gameOverIntroInst.off?.("end", gameOverIntroOnEnd);
    } catch {
      /* ignore */
    }
  }
  gameOverIntroInst = null;
  gameOverIntroOnEnd = null;
  if (bgmPlaying) {
    try {
      bgmPlaying.stop();
    } catch {
      /* ignore */
    }
  }
  stopAllBgmAliases();
};

export const playBgm = (
  s: PIXI.sound.Sound,
  options: { loop: boolean; volume?: number } = { loop: true },
) => {
  bgmPlaying = s;
  setLiveBgm(s);
  bgmPlaying.play({
    loop: options.loop,
    volume: options.volume ?? BGM_BASE_VOLUME,
  });
};

export const playMenuBgm = async () => {
  unlockAudio();
  stopBgm();
  const s = await getBgm("bgm161");
  if (!s) return;
  playBgm(s, { loop: true });
  // Do not prefetch play/game-over tracks here — that pulls multi‑MB audio
  // while the player is still on the menu. Match start loads them just-in-time.
};

export const playGameOverBgm = async () => {
  stopBgm();
  const [intro, loop] = await ensureBgm("bgm182_1", "bgm182_2");
  if (!intro) return;

  bgmPlaying = intro;
  setLiveBgm(intro);
  const onEnd = () => {
    gameOverIntroInst = null;
    gameOverIntroOnEnd = null;
    if (loop) playBgm(loop, { loop: true });
  };
  gameOverIntroOnEnd = onEnd;

  const result = intro.play({ loop: false, volume: BGM_BASE_VOLUME });
  type PlayInstance = {
    on: (e: string, fn: () => void) => void;
    stop?: () => void;
  };
  const attach = (inst: PlayInstance) => {
    gameOverIntroInst = inst;
    inst.on("end", onEnd);
  };
  if (result instanceof Promise) {
    void result.then((inst) => attach(inst as PlayInstance));
  } else if (result) {
    attach(result as PlayInstance);
  }
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
    if (!bgmActive || !s) return;
    bgmPlaying = s;
    setLiveBgm(s);
    bgmPlaying.play({ loop: false, volume: BGM_BASE_VOLUME });
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
