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
  decrementTime,
  flushHighScoreIfNeeded,
  bindHighScoreLifecycle,
  finalizeRunForDan,
} from "../score";
import { scheduleSyncPush } from "../sync";
import { getCurrentGameMode, getCurrentSettings } from "../settings";
import { resetFunEffects, isFunModeOn } from "../fun/effects";
import { setPlayPhase, isPausedPhase } from "../application/play-session/phase";
import {
  openMatch,
  closeMatch,
  isMatchOpen,
} from "../application/play-session/match-gate";
import { spawnNext } from "../application/play-session/spawn";
import { enterMenu } from "../ui/welcome";
import {
  disposePauseMenu,
  showPauseButton,
  hidePauseButton,
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
let timeAttackInterval: number | undefined;

const stopTimeAttackTimer = () => {
  if (timeAttackInterval) {
    clearInterval(timeAttackInterval);
    timeAttackInterval = undefined;
  }
};

const startTimeAttackTimer = () => {
  stopTimeAttackTimer();
  const settings = getCurrentSettings();
  setTimeRemaining(settings.timeAttackDuration);
  timeAttackInterval = window.setInterval(() => {
    if (isPausedPhase()) return;
    const isTimeUp = decrementTime();
    if (isTimeUp) {
      stopTimeAttackTimer();
      void endTimeAttack();
    }
  }, 1000);
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
  resetGameTicker();
  teardownContinuous();
  if (endAnimation) {
    clearTimeout(endAnimation);
    endAnimation = undefined;
  }
  stopBgm();
  stopTimeAttackTimer();
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
    console.warn("[start] next preview failed", e);
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
    console.warn("[spawn] failed", e);
    unlockCreate();
  }
};

/**
 * Begin a match. Invoked directly from UI / hotkeys — not via setState.
 * Parks the main loop immediately so async boot cannot be re-entered by tickMain.
 */
export const start = () => {
  parkMainLoop();

  clearStage();
  setBgmSessionPaused(false);
  disposePauseMenu();
  disposeGameOverMenu();
  avatarStab = createavatarSan();
  app.stage.addChild(avatarStab);
  // Flush previous run (restart / re-entry) before wiping memory.
  flushHighScoreIfNeeded();
  bindHighScoreLifecycle();
  resetScore();
  initScoreDisplay();
  // Seed match PRNG + piece bag (omit arg for fresh seed; pass seed for daily/repro).
  initRNG();
  resetFunEffects();
  openMatch();
  gameTicker.start();

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
          console.warn(
            "[start] truePhysics unavailable; match continues on grid path",
          );
        }
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
};

export const pausePlay = () => {
  // User often leaves or refreshes while paused — checkpoint now.
  flushHighScoreIfNeeded();
  gameTicker.stop();
  setBgmSessionPaused(true);
  pauseBgmPlayback();
  const mode = getCurrentGameMode();
  setPlayPhase({ type: "paused", reason: "user", mode });
};

export const resumePlay = () => {
  resumeBgmPlayback();
  setBgmSessionPaused(false);
  if (!gameTicker.started) gameTicker.start();
  const mode = getCurrentGameMode();
  setPlayPhase({ type: "playing", mode });
};

export const returnToMenu = () => {
  leaveVisualCritical();
  // Persist before resetScore wipes the run total.
  flushHighScoreIfNeeded();
  clearStage();
  disposeScoreDisplay();
  resetScore();
  resetFunEffects();
  setBgmSessionPaused(false);
  setPlayPhase({ type: "menu" });
  disposePauseMenu();
  disposeGameOverMenu();
  hidePauseButton();
  parkMainLoop();
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
  // Persist as soon as the run ends (before curtain / menu / restart).
  flushHighScoreIfNeeded();
  // Account dan: one append per match (latched).
  finalizeRunForDan();
  // Cloud sync (no-op when logged out).
  scheduleSyncPush();
  setPlayPhase({
    type: "gameOver",
    cause,
    mode: getCurrentGameMode(),
  });
  hidePauseButton();
  disposePauseMenu();
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
      console.warn("[end] flourish failed, falling back", e);
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
