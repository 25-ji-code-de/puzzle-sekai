/**
 * Match lifecycle controller.
 *
 * Authority split (do not invent another "is playing" flag outside these):
 *
 * | Concern                 | Source of truth                                      |
 * |-------------------------|------------------------------------------------------|
 * | Session semantics       | PlayPhase (menu / playing / paused / gameOver)       |
 * | Async land / spawn race | matchOpen (sync gate; closed the moment end begins)  |
 * | Piece fall / board VFX  | gameTicker                                           |
 * | Shell per-frame work    | MainLoopFn via setState — boot welcome / end flourish|
 * |                         | only. Gameplay never rides the main loop.            |
 *
 * Transition table:
 *
 * | Event           | PlayPhase | gameTicker | matchOpen | main loop        |
 * |-----------------|-----------|------------|-----------|------------------|
 * | start()         | playing   | start      | open      | park             |
 * | pausePlay()     | paused    | stop       | keep      | keep (parked)    |
 * | resumePlay()    | playing   | start      | keep      | keep (parked)    |
 * | topOut / timeUp | gameOver  | keep (VFX) | close     | flourish → park  |
 * | returnToMenu()  | menu      | reset      | close     | park             |
 *
 * Spawn is an explicit pump (`requestSpawn`), not a main-loop state.
 * There is no "falling" main-loop state — fall logic lives on gameTicker.
 */
import * as PIXI from "pixi.js-legacy";
import { app, gameTicker, resetGameTicker, setState } from "../runtime";
import type { MainLoopFn } from "../runtime";
import {
  createavatarSan,
  avatarFlyDown,
  createFlyingavatar,
  createFallingavatar,
} from "../characters/avatar";
import {
  barrel,
  curtain,
  createBarrel,
  gameOverCurtain,
} from "../props/objects";
import { BOX_SIZE, LEFT_BORDER } from "../config";
import {
  disposeAllActivePieces,
  initRNG,
  nextCharacter,
  showNextPiece,
} from "../active";
import {
  enterVisualCritical,
  leaveVisualCritical,
} from "../assets/bandwidth-gate";
import { loadTexture } from "../assets/load-texture";
import { rotationToOrientation } from "../domain/types";
import { primaryFromSprite } from "../presentation/placement";
import {
  resetScore,
  initScoreDisplay,
  disposeScoreDisplay,
  setTimeRemaining,
  getTimeRemaining,
  getScoreSummary,
  flushHighScoreIfNeeded,
  bindHighScoreLifecycle,
  finalizeRunForDan,
  getScore,
} from "../score";
import { scheduleSyncPush } from "../sync";
import {
  beginMatchSettingsOverride,
  clearActiveDailyDateKey,
  clearMatchSettingsOverride,
  getActiveDailyDateKey,
  getCurrentGameMode,
  getCurrentSettings,
  getUserSettings,
} from "../settings";
import {
  consumeQueuedReplayPlayback,
  activateReplayPlayback,
  beginReplayRecording,
  clearReplayPlayback,
  finishReplayRecording,
  flushReplayPlayback,
  isReplayPlayback,
  pauseReplayPlaybackClock,
  pauseReplayRecordingClock,
  resumeReplayPlaybackClock,
  resumeReplayRecordingClock,
} from "../replay";
import { dailyMatchSettings, dailySeed, utcDateKey } from "../domain/daily";
import { resetFunEffects, isFunModeOn } from "../fun/effects";
import { ensurePlayPack } from "../assets/play-pack";
import { setPlayPhase, getPlayPhase } from "../application/play-session/phase";
import {
  openMatch,
  closeMatch,
  isMatchOpen,
} from "../application/play-session/match-gate";
import { spawnNext } from "../application/play-session/spawn";
import {
  announceGameOver,
  announceMatchEnd,
  announceMatchStart,
  announceMenu,
  announcePaused,
  announceResumed,
  ensureLiveRegions,
} from "../a11y";
import { enterMenu } from "../ui/welcome";
import {
  disposePauseMenu,
  showPauseButton,
  hidePauseButton,
  showPauseMenu,
  isPauseMenuOpen,
} from "../ui/pause-menu";
import { disposeGameOverMenu, showGameOverMenu } from "../ui/game-over-menu";
import {
  stopBgm,
  playGameOverBgm,
  startPlayBgm,
  pauseBgmPlayback,
  resumeBgmPlayback,
  setBgmSessionPaused,
} from "../audio/session";
import { sprites, clearSpritesList, resetGrid } from "./board-state";
import { ensureContinuousReady, teardownContinuous } from "../board/dynamics";
import {
  displaySecondsFromMs,
  emptyTimeAttackSnapshot,
  isTimeAttackExpired,
  pauseTimeAttackClock,
  remainingMsAt,
  resumeTimeAttackClock,
  startTimeAttackClock,
  stopTimeAttackClock,
  type TimeAttackSnapshot,
} from "./time-attack";
import { hiddenPauseDecision } from "./hidden-pause";
import { devWarn } from "../util/dev-log";

export { welcome } from "../ui/welcome";
export { isPlayActive } from "../application/play-session/phase";
export { addDropScore } from "../score";
export { type SpriteData, sprites, setSprites } from "./board-state";
export { playMenuBgm, stopBgm } from "../audio/session";

/** Main-loop no-op: match play never advances on app.ticker. */
const parkMain: MainLoopFn = () => {};

const parkMainLoop = () => {
  setState(parkMain);
};

/** Timeout id for curtain / flourish; also used as "end already started" latch. */
let endAnimation: number | undefined;
/** True once an end path has begun (sync, before any await). */
let ending = false;
let avatarStab: PIXI.AnimatedSprite;
let nextPiece: PIXI.Sprite | undefined;
/** Latch so requestSpawn is not re-entered while a spawn cycle is in flight. */
let creating = false;

const tickReplayPlayback = () => {
  flushReplayPlayback();
};

/**
 * Time-attack clock: wall-clock deadline via performance.now(), driven by
 * gameTicker (not setInterval). Pure transitions live in `./time-attack`.
 *
 * - Running: `snap.endsAt` is the absolute deadline (performance.now scale).
 * - Paused: deadline cleared; remaining ms held in `snap.pausedRemainingMs`.
 * - Background tab: rAF/gameTicker may stop, but on resume the first tick
 *   re-reads performance.now() so lost wall time is applied correctly.
 */
let timeAttackSnap: TimeAttackSnapshot = emptyTimeAttackSnapshot();
let timeAttackHooked = false;
let hiddenPauseBound = false;

const nowMs = () =>
  typeof performance !== "undefined" ? performance.now() : Date.now();

const tickTimeAttack = () => {
  if (!timeAttackSnap.endsAt) return;
  const remainingMs = remainingMsAt(timeAttackSnap.endsAt, nowMs());
  const seconds = displaySecondsFromMs(remainingMs);
  if (seconds !== getTimeRemaining()) {
    setTimeRemaining(seconds);
  }
  if (isTimeAttackExpired(timeAttackSnap, nowMs())) {
    stopTimeAttackTimer();
    void endTimeAttack();
  }
};

const stopTimeAttackTimer = () => {
  if (timeAttackHooked) {
    // After resetGameTicker the old ticker is destroyed; remove is best-effort.
    try {
      gameTicker.remove(tickTimeAttack);
    } catch {
      /* ignore */
    }
    timeAttackHooked = false;
  }
  timeAttackSnap = stopTimeAttackClock();
};

const startTimeAttackTimer = () => {
  stopTimeAttackTimer();
  const duration = getCurrentSettings().timeAttackDuration;
  setTimeRemaining(duration);
  timeAttackSnap = startTimeAttackClock(duration, nowMs());
  if (!timeAttackHooked) {
    gameTicker.add(tickTimeAttack);
    timeAttackHooked = true;
  }
};

/** Freeze remaining wall time while gameTicker is stopped (user pause). */
const pauseTimeAttackTimer = () => {
  if (!timeAttackSnap.endsAt) return;
  timeAttackSnap = pauseTimeAttackClock(timeAttackSnap, nowMs());
  setTimeRemaining(displaySecondsFromMs(timeAttackSnap.pausedRemainingMs));
};

/** Resume from frozen remaining after pausePlay → resumePlay. */
const resumeTimeAttackTimer = () => {
  if (timeAttackSnap.endsAt || timeAttackSnap.pausedRemainingMs <= 0) return;
  timeAttackSnap = resumeTimeAttackClock(timeAttackSnap, nowMs());
  if (!timeAttackHooked) {
    gameTicker.add(tickTimeAttack);
    timeAttackHooked = true;
  }
};

/**
 * Auto-pause when the page becomes hidden. Returning to the tab does not
 * auto-resume; instead we surface the regular pause menu so the player opts in.
 */
const bindHiddenPauseLifecycle = () => {
  if (hiddenPauseBound || typeof document === "undefined") return;
  hiddenPauseBound = true;
  document.addEventListener("visibilitychange", () => {
    const phase = getPlayPhase();
    const decision = hiddenPauseDecision(
      document.visibilityState,
      phase,
      isPauseMenuOpen(),
    );
    if (decision.action === "pause") {
      pausePlay("hidden");
    } else if (decision.action === "showPauseMenu") {
      showPauseMenu();
    }
  });
};

/** Remove every gameplay-owned sprite + stop timers. */
const clearStage = () => {
  closeMatch();
  creating = false;
  ending = false;
  // Unbind controls / stop fall tickers / drop kinematic bodies BEFORE
  // destroying sprites. Otherwise leftover key/swipe handlers read
  // sprite.transform after PIXI nulls it (console spam + stuck inputs).
  disposeAllActivePieces();
  // Prefer destroy path so filters / display objects are released.
  sprites.forEach((sp) => {
    sp.sprite.filters = [];
    if (sp.sprite.parent) sp.sprite.parent.removeChild(sp.sprite);
    try {
      sp.sprite.destroy({ children: true, texture: false, baseTexture: false });
    } catch {
      try {
        app.stage.removeChild(sp.sprite);
      } catch {
        /* ignore */
      }
    }
  });
  clearSpritesList();
  // Detach countdown before destroy so we don't leave a stale hook flag.
  stopTimeAttackTimer();
  try {
    gameTicker.remove(tickReplayPlayback);
  } catch {
    /* ignore */
  }
  resetGameTicker();
  teardownContinuous();
  if (endAnimation) {
    clearTimeout(endAnimation);
    endAnimation = undefined;
  }
  stopBgm();
  if (avatarStab) {
    app.stage.removeChild(avatarStab);
  }
  app.stage.removeChild(avatarFlyDown);
  app.stage.removeChild(barrel);
  app.stage.removeChild(curtain);
  resetGrid();
  if (nextPiece) {
    app.stage.removeChild(nextPiece);
    nextPiece = undefined;
  }
};

const ensureNextPreview = async (): Promise<void> => {
  if (nextPiece || !nextCharacter) return;
  try {
    nextPiece = await showNextPiece(
      nextCharacter.preview ?? nextCharacter.file,
    );
  } catch (e) {
    devWarn("[start] next preview failed", e);
  }
};

const unlockCreate = () => {
  creating = false;
};

/**
 * Explicit spawn pump. Call when the board is ready for the next piece —
 * never install this as a MainLoopFn (it is not a per-frame state).
 */
const requestSpawn = () => {
  if (creating || ending || !isMatchOpen()) return;
  void runSpawn();
};

const runSpawn = async () => {
  if (creating || ending || !isMatchOpen()) return;
  creating = true;
  try {
    await spawnNext({
      getSpriteIndexBase: () => sprites.length,
      avatarStab,
      getNextPiece: () => nextPiece,
      setNextPiece: (s: PIXI.Sprite) => {
        nextPiece = s;
      },
      onTopOut: () => {
        // Close immediately so concurrent land handlers bail before end runs.
        closeMatch();
        unlockCreate();
        void endTopOut();
      },
      onSpawnComplete: () => {
        unlockCreate();
        if (isMatchOpen() && !ending) requestSpawn();
      },
      // Piece is now on gameTicker; main loop stays parked (no "falling" state).
      onFalling: () => {
        parkMainLoop();
      },
      onSpawnAborted: () => {
        unlockCreate();
      },
    });
  } catch (e) {
    devWarn("[spawn] failed", e);
    unlockCreate();
  }
};

/**
 * Begin a match. Invoked directly from UI / hotkeys — not via setState.
 * Parks the main loop immediately so async boot cannot be re-entered by tickMain.
 */
export const start = () => {
  parkMainLoop();
  ensureLiveRegions();
  bindHiddenPauseLifecycle();

  // Flush previous run while match-settings override (daily lock) still applies.
  flushHighScoreIfNeeded();
  clearMatchSettingsOverride();

  clearStage();
  setBgmSessionPaused(false);
  disposePauseMenu();
  disposeGameOverMenu();
  avatarStab = createavatarSan();
  app.stage.addChild(avatarStab);
  bindHighScoreLifecycle();
  resetScore();

  const queuedReplay = consumeQueuedReplayPlayback();
  if (queuedReplay) {
    activateReplayPlayback(queuedReplay);
    beginMatchSettingsOverride({
      ...getUserSettings(),
      ...queuedReplay.settings,
      selectedGroups: [...queuedReplay.settings.selectedGroups],
      funModes: { ...queuedReplay.settings.funModes },
    });
    initRNG(queuedReplay.seed);
  } else {
    clearReplayPlayback();
    const mode = getCurrentGameMode();
    // Daily: freeze gameplay rules + shared seed so all players share the day.
    if (mode === "daily") {
      beginMatchSettingsOverride(dailyMatchSettings(getUserSettings()));
      const dateKey = getActiveDailyDateKey() ?? utcDateKey();
      initRNG(dailySeed(dateKey));
    } else {
      // Seed match PRNG + piece bag (omit arg for fresh seed).
      initRNG();
    }
    beginReplayRecording();
  }

  initScoreDisplay();
  resetFunEffects();
  openMatch();
  gameTicker.start();
  if (isReplayPlayback()) {
    gameTicker.add(tickReplayPlayback);
  }

  // Hold play-BGM downloads until the first piece texture is ready (or deadline).
  enterVisualCritical();

  // Kick the first bag texture ASAP so preview/spawn don't wait behind the
  // full play-pack warm (which is fire-and-forget from play-session).
  if (nextCharacter) {
    void loadTexture(nextCharacter.preview ?? nextCharacter.file);
  }

  const boot = async () => {
    try {
      if (isFunModeOn("truePhysics")) {
        const ok = await ensureContinuousReady();
        if (!ok) {
          devWarn(
            "[start] truePhysics unavailable; match continues on grid path",
          );
        }
      }
      if (isReplayPlayback()) {
        await ensurePlayPack();
      }
      // One texture (or cache hit) — not the whole cast.
      await ensureNextPreview();
    } finally {
      // Always release BGM even if preview fails / match closed.
      leaveVisualCritical();
    }
    if (!isMatchOpen() || ending) return;
    requestSpawn();
  };
  void boot();

  // BGM starts immediately but getBgm waits on the gate for uncached tracks.
  startPlayBgm();
  const mode = getCurrentGameMode();
  if (mode === "timeAttack") {
    startTimeAttackTimer();
  }
  setPlayPhase({ type: "playing", mode });
  showPauseButton();
  announceMatchStart(mode);
};

export const pausePlay = (reason: "user" | "portrait" | "hidden" = "user") => {
  // User often leaves or refreshes while paused — checkpoint now.
  flushHighScoreIfNeeded();
  pauseReplayRecordingClock();
  pauseReplayPlaybackClock();
  // Freeze deadline before stopping the ticker so pause does not burn clock.
  pauseTimeAttackTimer();
  gameTicker.stop();
  setBgmSessionPaused(true);
  pauseBgmPlayback();
  const mode = getCurrentGameMode();
  setPlayPhase({ type: "paused", reason, mode });
  announcePaused();
};

export const resumePlay = () => {
  resumeBgmPlayback();
  setBgmSessionPaused(false);
  resumeReplayRecordingClock();
  resumeReplayPlaybackClock();
  // Re-arm deadline from frozen remaining before ticks resume.
  resumeTimeAttackTimer();
  if (!gameTicker.started) gameTicker.start();
  const mode = getCurrentGameMode();
  setPlayPhase({ type: "playing", mode });
  announceResumed();
};

export const returnToMenu = () => {
  leaveVisualCritical();
  // Persist before resetScore wipes the run total (while daily lock still applies).
  const summary = getScoreSummary();
  flushHighScoreIfNeeded();
  finishReplayRecording(summary);
  // Stop live-region score spam before resetScore fires onScoreChanged.
  announceMatchEnd();
  clearStage();
  clearMatchSettingsOverride();
  clearReplayPlayback();
  clearActiveDailyDateKey();
  disposeScoreDisplay();
  resetScore();
  resetFunEffects();
  setBgmSessionPaused(false);
  setPlayPhase({ type: "menu" });
  disposePauseMenu();
  disposeGameOverMenu();
  hidePauseButton();
  parkMainLoop();
  announceMenu();
  enterMenu();
};

const beginGameOver = (cause: "topOut" | "timeUp") => {
  ending = true;
  closeMatch();
  creating = false;
  stopTimeAttackTimer();
  // Drop live controls immediately so post-game key spam cannot drive a
  // still-falling piece (or a piece about to be destroyed on restart).
  disposeAllActivePieces();
  const summary = getScoreSummary();
  // Persist as soon as the run ends (before curtain / menu / restart).
  flushHighScoreIfNeeded();
  finishReplayRecording(summary);
  // Account dan: one append per match (latched).
  finalizeRunForDan();
  // Cloud sync (no-op when logged out). Replays themselves are local-only.
  if (!isReplayPlayback()) {
    scheduleSyncPush();
  }
  setPlayPhase({
    type: "gameOver",
    cause,
    mode: getCurrentGameMode(),
  });
  hidePauseButton();
  disposePauseMenu();
  announceGameOver(getScore());
  void playGameOverBgm();
};

/** Reach curtain → game-over menu once. Main loop stays parked. */
const finishWithCurtain = () => {
  if (nextPiece) {
    app.stage.removeChild(nextPiece);
    nextPiece = undefined;
  }
  createBarrel();
  gameOverCurtain(() => {
    parkMainLoop();
    showGameOverMenu();
  });
};

/** One-shot top-out end path (not a MainLoopFn). */
const endTopOut = async () => {
  if (ending) return;
  beginGameOver("topOut");

  const last = sprites[sprites.length - 1];
  if (last?.sprite && avatarStab && nextCharacter?.file) {
    try {
      app.stage.removeChild(avatarStab);
      if (nextPiece) {
        app.stage.removeChild(nextPiece);
        nextPiece = undefined;
      }
      createBarrel();
      await createFlyingavatar();
      const avatarFall = createFallingavatar();
      const lastSprite = last.sprite;
      const lastPieceOff = rotationToOrientation(lastSprite.rotation);
      const lastPieceCoor = primaryFromSprite(lastSprite, "cell2", "ceil");
      const overflow =
        lastPieceOff === 0 ? lastPieceCoor.y - 1 : lastPieceCoor.y;
      avatarFall.x = LEFT_BORDER + BOX_SIZE / 2 + BOX_SIZE * lastPieceCoor.x;
      avatarFall.y = (-1 + overflow) * BOX_SIZE + BOX_SIZE / 2;
      const speed = overflow === -2 ? 4 : 3;
      const moveDown = (delta: number) => {
        sprites.forEach((sp) => (sp.sprite.y += speed * delta));
        avatarFall.y += speed * delta;
      };
      app.ticker.add(moveDown);
      endAnimation = window.setTimeout(() => {
        app.ticker.remove(moveDown);
        gameOverCurtain(() => {
          parkMainLoop();
          showGameOverMenu();
        });
      }, 2000);
      return;
    } catch (e) {
      devWarn("[end] flourish failed, falling back", e);
    }
  }

  endAnimation = window.setTimeout(() => {
    finishWithCurtain();
  }, 0);
};

/** One-shot time-up end path (not a MainLoopFn). */
const endTimeAttack = async () => {
  if (ending) return;
  beginGameOver("timeUp");
  endAnimation = window.setTimeout(() => {
    finishWithCurtain();
  }, 0);
};
