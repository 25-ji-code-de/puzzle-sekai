import * as PIXI from "pixi.js-legacy";
import sound from "pixi-sound";
import { app, gameTicker, resetGameTicker, setState } from ".";
import {
  createavatarSan,
  avatarFlyDown,
  createFlyingavatar,
  createFallingavatar,
} from "./avatar";
import { barrel, curtain, createBarrel, gameOverCurtain } from "./objects";
import { ROWS, COLUMNS, BOX_SIZE, LEFT_BORDER } from "./config";
import {
  initRNG,
  nextCharacter,
  randomCharacter,
  fly,
  createPiece,
  showNextPiece,
} from "./piece";
import { getOffset, getCoordinates, getMaxStackHeight } from "./utils";
import { CharacterData } from "./character-data";
import { findClearPieces } from "./clear";
import { createItem, getRandomItem, isCarrotItem, isFriesItem } from "./items";
import {
  resetScore,
  initScoreDisplay,
  resetCombo,
  setTimeRemaining,
  decrementTime,
} from "./score";
import {
  updateCoordinates,
  clearChunk,
  applyCarrotAllergy,
  applyCarrotAllergyOnCharacter,
  applyMizukiShift,
  tryMizukiEatFries,
  tryEmuShrink,
} from "./board";
import { welcome as _welcome } from "./welcome";
import { getCurrentGameMode, getCurrentSettings, getItemDropChance } from "./settings";
import { resetFunEffects } from "./fun-effects";
import { enterMenu } from "./welcome";
import { disposePauseMenu, showPauseButton, hidePauseButton } from "./pause-menu";
import { disposeGameOverMenu, showGameOverMenu } from "./game-over-menu";

export { welcome } from "./welcome";
export { addDropScore } from "./score";

export interface SpriteData {
  sprite: PIXI.Sprite;
  coordinates?: [number, number][];
  character?: Pick<CharacterData, "name" | "group">;
  isItem?: boolean;
  /** Source asset path for items (carrot / fries detection) */
  itemFile?: string;
  /** Emu shrunk to 1 cell by えむちぢみ fun mode */
  isShrunk?: boolean;
}
export let sprites: SpriteData[] = [];
export const setSprites = (s: SpriteData[]) => { sprites = s; };
export let pieces: (string | null)[][] = Array(ROWS).map(() => [
  ...Array(COLUMNS).fill(null),
]);

let endAnimation: number | undefined;

let avatarStab: PIXI.AnimatedSprite;

let nextPiece: PIXI.Sprite;

let bgmPlaying: PIXI.sound.Sound;
let bgmActive = false;
/** Instance of game-over intro (182.1) so we can cancel the chain on restart */
let gameOverIntroInst: { stop?: () => void; off?: (e: string, fn: () => void) => void } | null = null;
let gameOverIntroOnEnd: (() => void) | null = null;

// Time attack timer
let timeAttackInterval: number | undefined;
/** True while gameplay is frozen for a portrait pause; the timer skips
 * decrementing so portrait time never counts against the player. */
let playPaused = false;

export const stopBgm = () => {
  bgmActive = false;
  // Cancel game-over 182.1 → 182.2 chain
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
  // Also hard-stop known game-over tracks (may not be in bgmPlaying yet)
  const g1 = app.loader.resources["bgm182_1"]?.sound as PIXI.sound.Sound | undefined;
  const g2 = app.loader.resources["bgm182_2"]?.sound as PIXI.sound.Sound | undefined;
  try {
    g1?.stop();
  } catch {
    /* ignore */
  }
  try {
    g2?.stop();
  } catch {
    /* ignore */
  }
};

export const playBgm = (sound: PIXI.sound.Sound, options: { loop: boolean; volume: number }) => {
  bgmPlaying = sound;
  bgmPlaying.play(options);
};

const playGameOverBgm = () => {
  stopBgm();
  const bgm182_1 = app.loader.resources["bgm182_1"]?.sound as PIXI.sound.Sound | undefined;
  const bgm182_2 = app.loader.resources["bgm182_2"]?.sound;
  if (!bgm182_1 || !bgm182_2) return;

  bgmPlaying = bgm182_1;
  const onEnd = () => {
    gameOverIntroInst = null;
    gameOverIntroOnEnd = null;
    playBgm(bgm182_2 as PIXI.sound.Sound, { loop: true, volume: 0.3 });
  };
  gameOverIntroOnEnd = onEnd;

  const result = bgm182_1.play({ loop: false, volume: 0.3 });
  const attach = (inst: { on: (e: string, fn: () => void) => void; stop?: () => void }) => {
    gameOverIntroInst = inst;
    inst.on("end", onEnd);
  };
  if (result instanceof Promise) {
    result.then((inst) => attach(inst as any));
  } else if (result) {
    attach(result as any);
  }
};

let created = false;

// BGM polling
const playNextBGM = () => {
  if (!bgmActive) return;
  const rand = Math.random();
  const bgmKey = rand < 0.7 ? "bgm038" : "bgm168";
  const sound = app.loader.resources[bgmKey]?.sound;
  if (sound) {
    bgmPlaying = sound as PIXI.sound.Sound;
    bgmPlaying.play({ loop: false, volume: 0.3 });
  }
};

const checkBGM = () => {
  if (!bgmActive) {
    gameTicker.remove(checkBGM);
    return;
  }
  if (bgmPlaying && !bgmPlaying.isPlaying) {
    playNextBGM();
  }
};

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
  sprites = [];
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
  pieces = Array(ROWS)
    .fill(null)
    .map(() => [...Array(COLUMNS).fill(null)]);
  if (nextPiece) {
    app.stage.removeChild(nextPiece);
  }
};

const start = () => {
  clearStage();
  playPaused = false;
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

  bgmActive = true;
  playNextBGM();
  gameTicker.remove(checkBGM);
  gameTicker.add(checkBGM);

  // Start timer for time attack mode
  const mode = getCurrentGameMode();
  if (mode === "timeAttack") {
    startTimeAttackTimer();
  }
  setPlayActive(true);
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
        // ポテトと瑞希: fries land → nearest board Mizuki moves above fries
        if (isFriesItem(itemFile)) {
          await applyMizukiShift(x, y);
        }
        // ポテトと瑞希: Mizuki touching fries → eat fries for bonus score
        const friesEaten = await tryMizukiEatFries();
        // えむちぢみ: Mafuyu adjacent to Emu → shrink Emu to 1 cell
        await tryEmuShrink();
        let chunk = findClearPieces(pieces);
        let cleared = allergyCleared || friesEaten;
        while (chunk !== undefined) {
          cleared = true;
          await clearChunk(chunk);
          chunk = findClearPieces(pieces);
        }
        if (!cleared) resetCombo();
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
        // にんじん嫌い: Ena/Akito landing next to carrot → clear character
        let allergyCleared = false;
        if (character.name === "Ena" || character.name === "Akito") {
          allergyCleared = await applyCarrotAllergyOnCharacter(index);
        }
        // ポテトと瑞希: Mizuki landing next to fries → eat fries for bonus score
        let friesEaten = false;
        if (character.name === "Mizuki") {
          friesEaten = await tryMizukiEatFries();
        }
        // えむちぢみ: Mafuyu adjacent to Emu → shrink Emu to 1 cell
        await tryEmuShrink();
        let chunk = findClearPieces(pieces);
        let cleared = allergyCleared || friesEaten;
        while (chunk !== undefined) {
          cleared = true;
          await clearChunk(chunk);
          chunk = findClearPieces(pieces);
        }
        if (!cleared) resetCombo();

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
      sound.play(key, { volume: 0.5 });
    }
  }

  setState(falling);
};

const falling = () => {};

/** Pause gameplay: freeze the falling ticker and stop ticking the timer. */
export const pausePlay = () => {
  gameTicker.stop();
  playPaused = true;
  try {
    if (bgmPlaying) bgmPlaying.pause();
  } catch {
    /* ignore */
  }
};

/** Resume gameplay after a pause (caller ensures ticker is restarted). */
export const resumePlay = () => {
  playPaused = false;
  // pausePlay stopped the ticker; start it again so pieces resume falling.
  if (!gameTicker.started) gameTicker.start();
  try {
    if (bgmPlaying && bgmActive) bgmPlaying.play();
  } catch {
    /* ignore */
  }
};

/**
 * Abandon the current match and return to the welcome menu. Tears down the
 * board, stops timers/BGM, drops the pause overlay, and shows the menu. The
 * match state is fully cleared — calling `start` again later re-seeds it.
 */
export const returnToMenu = () => {
  clearStage();
  resetScore();
  resetFunEffects();
  playPaused = false;
  setPlayActive(false);
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
    hidePauseButton();
    disposePauseMenu();

    // Play game over BGM: 182.1 once, then loop 182.2
    playGameOverBgm();

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
    hidePauseButton();
    disposePauseMenu();

    // Play game over BGM
    playGameOverBgm();

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
