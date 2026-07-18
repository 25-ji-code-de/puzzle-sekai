/**
 * Play state machine: start / spawn / land / pause / game-over / menu return.
 */
import * as PIXI from "pixi.js-legacy";
import { app, gameTicker, resetGameTicker, setState } from "../runtime";
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
import { initRNG, nextCharacter, showNextPiece } from "../active";
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
  setTimeRemaining,
  decrementTime,
  flushHighScoreIfNeeded,
  bindHighScoreLifecycle,
  finalizeRunForDan,
} from "../score";
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

/** Timeout id for curtain / flourish; also used as "end already started" latch. */
let endAnimation: number | undefined;
/** True once an end path has begun (sync, before any await). */
let ending = false;
let avatarStab: PIXI.AnimatedSprite;
let nextPiece: PIXI.Sprite | undefined;
/** Latch so create is not re-entered while a spawn cycle is in flight. */
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
      setState(endTimeAttack);
    }
  }, 1000);
};

/** Remove every gameplay-owned sprite + stop timers. */
const clearStage = () => {
  closeMatch();
  creating = false;
  ending = false;
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

const create = async () => {
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
        setState(end);
      },
      onSpawnComplete: () => {
        unlockCreate();
        if (isMatchOpen() && !ending) setState(create);
      },
      onFalling: () => setState(falling),
      onSpawnAborted: () => {
        unlockCreate();
      },
    });
  } catch (e) {
    console.warn("[create] spawn failed", e);
    unlockCreate();
  }
};

const falling = () => {};

const start = () => {
  // `setState(start)` is driven every frame by the main ticker. Switch off
  // immediately so clearStage / initRNG are not re-run while async boot awaits
  // textures / Rapier — otherwise every frame wipes the just-spawned board.
  setState(falling);

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
    setState(create);
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

export { start };

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
  resetScore();
  resetFunEffects();
  setBgmSessionPaused(false);
  setPlayPhase({ type: "menu" });
  disposePauseMenu();
  disposeGameOverMenu();
  hidePauseButton();
  setState(() => {});
  enterMenu();
};

const beginGameOver = (cause: "topOut" | "timeUp") => {
  ending = true;
  closeMatch();
  creating = false;
  stopTimeAttackTimer();
  // Persist as soon as the run ends (before curtain / menu / restart).
  flushHighScoreIfNeeded();
  // Account dan: one append per match (latched).
  finalizeRunForDan();
  setPlayPhase({
    type: "gameOver",
    cause,
    mode: getCurrentGameMode(),
  });
  hidePauseButton();
  disposePauseMenu();
  void playGameOverBgm();
};

/** Always reach curtain → ended → menu. */
const finishWithCurtain = () => {
  if (nextPiece) {
    app.stage.removeChild(nextPiece);
    nextPiece = undefined;
  }
  createBarrel();
  gameOverCurtain(() => {
    setState(ended);
  });
};

const end = async () => {
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
          setState(ended);
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

const endTimeAttack = async () => {
  if (ending) return;
  beginGameOver("timeUp");
  endAnimation = window.setTimeout(() => {
    finishWithCurtain();
  }, 0);
};

const ended = () => {
  showGameOverMenu();
};
