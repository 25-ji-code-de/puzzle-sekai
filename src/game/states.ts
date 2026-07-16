/**
 * Play state machine: start / spawn / land / pause / game-over / menu return.
 */
import * as PIXI from "pixi.js-legacy";
import sound from "pixi-sound";
import { app, gameTicker, resetGameTicker, setState } from "../runtime";
import {
  createavatarSan,
  avatarFlyDown,
  createFlyingavatar,
  createFallingavatar,
} from "../characters/avatar";
import { barrel, curtain, createBarrel, gameOverCurtain } from "../props/objects";
import { COLUMNS, BOX_SIZE, LEFT_BORDER } from "../config";
import {
  initRNG,
  nextCharacter,
  randomCharacter,
  fly,
  createPiece,
  showNextPiece,
} from "../piece";
import { getOffset, getCoordinates, getMaxStackHeight } from "../utils/coords";
import { createItem, getRandomItem, isCarrotItem, isFriesItem } from "../items";
import {
  resetScore,
  initScoreDisplay,
  resetCombo,
  setTimeRemaining,
  decrementTime,
} from "../score";
import {
  updateCoordinates,
  settleBoard,
  applyCarrotAllergy,
  applyCarrotAllergyOnCharacter,
  applyMizukiShift,
} from "../board";
import {
  getCurrentGameMode,
  getCurrentSettings,
  getItemDropChance,
  voiceVol,
} from "../settings";
import { resetFunEffects } from "../fun/effects";
import { CHAR } from "../characters/ids";
import { setPlayPhase } from "../application/play-session";
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
import { sprites, clearSpritesList, resetPieces } from "./board-state";

export { welcome } from "../ui/welcome";
export { addDropScore } from "../score";
export {
  type SpriteData,
  sprites,
  setSprites,
  pieces,
} from "./board-state";
export { playMenuBgm, stopBgm } from "../audio/session";

let endAnimation: number | undefined;
let avatarStab: PIXI.AnimatedSprite;
let nextPiece: PIXI.Sprite;

// Time attack timer
let timeAttackInterval: number | undefined;
/** True while gameplay is frozen for a portrait pause; the timer skips
 * decrementing so portrait time never counts against the player. */
let playPaused = false;

let created = false;

// Stop time attack timer
const stopTimeAttackTimer = () => {
  if (timeAttackInterval) {
    clearInterval(timeAttackInterval);
    timeAttackInterval = undefined;
  }
};

// Start time attack timer
const startTimeAttackTimer = () => {
  stopTimeAttackTimer();
  const settings = getCurrentSettings();
  setTimeRemaining(settings.timeAttackDuration);

  // Don't decrement while paused (portrait): just re-arm for the next tick.
  timeAttackInterval = window.setInterval(() => {
    if (playPaused) return;
    const isTimeUp = decrementTime();
    if (isTimeUp) {
      stopTimeAttackTimer();
      setState(endTimeAttack);
    }
  }, 1000);
};

// True while a match is running (between `start` and game-over / menu return).
// The pause menu and pause button only respond while this is true.
let playActive = false;
export const isPlayActive = () => playActive;
const setPlayActive = (v: boolean) => {
  playActive = v;
};

/** Remove every gameplay-owned sprite + stop timers. Shared by `start`
 * (before re-seeding) and `returnToMenu` (leaving the match). */
const clearStage = () => {
  sprites.forEach((sp) => app.stage.removeChild(sp.sprite));
  clearSpritesList();
  resetGameTicker();
  endAnimation = undefined;
  stopBgm();
  stopTimeAttackTimer();
  if (avatarStab) {
    app.stage.removeChild(avatarStab);
  }
  app.stage.removeChild(avatarFlyDown);
  app.stage.removeChild(barrel);
  app.stage.removeChild(curtain);
  resetPieces();
  if (nextPiece) {
    app.stage.removeChild(nextPiece);
  }
};

const start = () => {
  clearStage();
  playPaused = false;
  setBgmSessionPaused(false);
  disposePauseMenu(); // drop any stale pause overlay (e.g. "r" restart from pause)
  disposeGameOverMenu(); // drop game-over choice if "r" / restart was pressed
  avatarStab = createavatarSan();
  app.stage.addChild(avatarStab);
  resetScore();
  initScoreDisplay();
  initRNG();
  resetFunEffects();
  gameTicker.start();
  setState(create);
  if (nextCharacter) {
    showNextPiece(nextCharacter.preview ?? nextCharacter.file).then(
      (s) => (nextPiece = s),
    );
  }

  startPlayBgm();

  // Start timer for time attack mode
  const mode = getCurrentGameMode();
  if (mode === "timeAttack") {
    startTimeAttackTimer();
  }
  setPlayActive(true);
  setPlayPhase({ type: "playing", mode });
  showPauseButton();
};
export { start };

const create = async () => {
  if (created) return;
  const index = sprites.length;
  const maxHeight = getMaxStackHeight();
  if (maxHeight < 5 && Math.random() < getItemDropChance(getCurrentSettings())) {
    const itemFile = getRandomItem();
    let dropped = [false, false];
    const onDropped = (id: number) => async (sprite: PIXI.Sprite) => {
      const { x, y } = getCoordinates(sprite);
      if (y < 0) {
        setState(end);
      } else {
        updateCoordinates(sprite, index + id, undefined, true);
        // にんじん嫌い: carrot touching Ena/Akito clears those chars (not the carrot)
        let allergyCleared = false;
        if (isCarrotItem(itemFile)) {
          allergyCleared = await applyCarrotAllergy(x, y);
        }
        // ポテトと瑞希: fries land �?nearest board Mizuki moves above fries
        if (isFriesItem(itemFile)) {
          await applyMizukiShift(x, y);
        }
        // Gravity + tips + fun contacts + clears until the board is quiet.
        // Must run AFTER tips so emuShrink / allergy / fries see new adjacencies.
        const { cleared: settledCleared } = await settleBoard();
        if (!allergyCleared && !settledCleared) resetCombo();
        dropped[id] = true;
        if (dropped.every((e) => e)) {
          setState(create);
          created = false;
        }
      }
    };
    const positions = Array(COLUMNS)
      .fill(0)
      .map((_, i) => i);

    const itemSprites = await Promise.all([
      createItem(
        itemFile,
        positions.splice(Math.floor(Math.random() * positions.length))[0],
        onDropped(0),
      ).then((item) => {
        // Register as soon as the sprite exists so early land can't miss sprites[]
        if (!sprites.some((s) => s.sprite === item)) {
          sprites.push({ sprite: item, isItem: true, itemFile });
        }
        return item;
      }),
      createItem(
        itemFile,
        positions.splice(Math.floor(Math.random() * positions.length))[0],
        onDropped(1),
      ).then((item) => {
        if (!sprites.some((s) => s.sprite === item)) {
          sprites.push({ sprite: item, isItem: true, itemFile });
        }
        return item;
      }),
    ]);
    void itemSprites;
  } else {
    const character = randomCharacter();
    const onDropped = async (sprite: PIXI.Sprite) => {
      const { y } = getCoordinates(sprite);
      const orientation = (Math.fround(sprite.rotation / Math.PI) * 2 + 2) % 4;

      if (y < 0 || (orientation === 0 && y <= 0)) {
        setState(end);
      } else {
        updateCoordinates(sprite, index, character);
        // にんじん嫌い: Ena/Akito landing next to carrot �?clear character
        let allergyCleared = false;
        if (character.name === CHAR.Ena || character.name === CHAR.Akito) {
          allergyCleared = await applyCarrotAllergyOnCharacter(index);
        }
        // Gravity + tips + fun contacts + clears until the board is quiet.
        // Must run AFTER tips so emuShrink / allergy / fries see new adjacencies.
        const { cleared: settledCleared } = await settleBoard();
        if (!allergyCleared && !settledCleared) resetCombo();

        setState(create);
        created = false;
      }
    };

    if (nextPiece) {
      avatarStab.play();
      fly(nextPiece, async (s) => {
        avatarStab.gotoAndStop(0);
        app.stage.removeChild(s);
        if (nextCharacter) {
          nextPiece = await showNextPiece(
            nextCharacter.preview ?? nextCharacter.file,
          );
        }

        const piece = await createPiece(character.file, onDropped);

        sprites.push({ sprite: piece, character });
      });
    }

    if (character.sounds?.fall) {
      const fallSounds = character.sounds.fall;
      const key = fallSounds[Math.floor(Math.random() * fallSounds.length)];
      sound.play(key, { volume: voiceVol(0.5) });
    }
  }

  setState(falling);
};

const falling = () => {};

/** Pause gameplay: freeze the falling ticker and stop ticking the timer. */
export const pausePlay = () => {
  gameTicker.stop();
  playPaused = true;
  setBgmSessionPaused(true);
  pauseBgmPlayback();
  const mode = getCurrentGameMode();
  setPlayPhase({ type: "paused", reason: "user", mode });
};

/** Resume gameplay after a pause (caller ensures ticker is restarted). */
export const resumePlay = () => {
  // Resume BGM before clearing playPaused so a same-tick checkBGM can't
  // mis-detect the still-paused track as finished and start a new song.
  resumeBgmPlayback();
  playPaused = false;
  setBgmSessionPaused(false);
  // pausePlay stopped the ticker; start it again so pieces resume falling.
  if (!gameTicker.started) gameTicker.start();
  const mode = getCurrentGameMode();
  setPlayPhase({ type: "playing", mode });
};

/**
 * Abandon the current match and return to the welcome menu. Tears down the
 * board, stops timers/BGM, drops the pause overlay, and shows the menu. The
 * match state is fully cleared �?calling `start` again later re-seeds it.
 */
export const returnToMenu = () => {
  clearStage();
  resetScore();
  resetFunEffects();
  playPaused = false;
  setBgmSessionPaused(false);
  setPlayActive(false);
  setPlayPhase({ type: "menu" });
  disposePauseMenu();
  disposeGameOverMenu();
  hidePauseButton();
  setState(() => {}); // idle state while the menu shows
  enterMenu();
};

const end = async () => {
  if (!endAnimation) {
    // Stop time attack timer if running
    stopTimeAttackTimer();
    setPlayActive(false);
    setPlayPhase({
      type: "gameOver",
      cause: "topOut",
      mode: getCurrentGameMode(),
    });
    hidePauseButton();
    disposePauseMenu();

    // Play game over BGM: 182.1 once, then loop 182.2
    void playGameOverBgm();

    if (nextCharacter?.file) {
      app.stage.removeChild(avatarStab);
      if (nextPiece) {
        app.stage.removeChild(nextPiece);
      }
      createBarrel();
      await createFlyingavatar();
      const avatarFlyDown = createFallingavatar();

      const lastPieceOff = getOffset(sprites[sprites.length - 1].sprite);
      const lastPieceCoor = getCoordinates(sprites[sprites.length - 1].sprite);

      const overflow =
        lastPieceOff === 0 ? lastPieceCoor.y - 1 : lastPieceCoor.y;
      avatarFlyDown.x = LEFT_BORDER + BOX_SIZE / 2 + BOX_SIZE * lastPieceCoor.x;
      avatarFlyDown.y = (-1 + overflow) * BOX_SIZE + BOX_SIZE / 2;
      const speed = overflow === -2 ? 4 : 3;
      const moveDown = (delta: number) => {
        sprites.forEach((sp) => (sp.sprite.y += speed * delta));
        avatarFlyDown.y += speed * delta;
      };
      const dur = overflow === -2 ? 2000 : 2000;
      app.ticker.add(moveDown);

      endAnimation = setTimeout(() => {
        app.ticker.remove(moveDown);
        gameOverCurtain(() => {
          setState(ended);
        });
      }, dur);
    }
  }
};

// Time attack end - time ran out
const endTimeAttack = async () => {
  if (!endAnimation) {
    stopTimeAttackTimer();
    setPlayActive(false);
    setPlayPhase({
      type: "gameOver",
      cause: "timeUp",
      mode: getCurrentGameMode(),
    });
    hidePauseButton();
    disposePauseMenu();

    // Play game over BGM
    void playGameOverBgm();

    // Show game over curtain
    if (nextPiece) {
      app.stage.removeChild(nextPiece);
    }
    createBarrel();
    gameOverCurtain(() => {
      setState(ended);
    });
  }
};

const ended = () => {
  // Present Restart / Back-to-menu choices instead of tap-to-restart.
  showGameOverMenu();
};
