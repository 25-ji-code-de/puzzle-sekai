import * as PIXI from "pixi.js-legacy";
import sound from "pixi-sound";
import { app, gameTicker, hammerManager, resetGameTicker, setState } from ".";
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
import { createItem, items } from "./items";
import { resetScore, initScoreDisplay, resetCombo } from "./score";
import { updateCoordinates, clearChunk } from "./board";
import { welcome as _welcome } from "./welcome";

export { welcome } from "./welcome";
export { addDropScore } from "./score";

export interface SpriteData {
  sprite: PIXI.Sprite;
  coordinates?: [number, number][];
  character?: Pick<CharacterData, "name" | "group">;
  isItem?: boolean;
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

export const stopBgm = () => {
  bgmActive = false;
  if (bgmPlaying) {
    bgmPlaying.stop();
  }
};

export const playBgm = (sound: PIXI.sound.Sound, options: { loop: boolean; volume: number }) => {
  bgmPlaying = sound;
  bgmPlaying.play(options);
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

const start = () => {
  sprites.forEach((sp) => {
    app.stage.removeChild(sp.sprite);
  });
  sprites = [];
  resetGameTicker();
  endAnimation = undefined;
  stopBgm();
  if (avatarStab) {
    app.stage.removeChild(avatarStab);
  }
  avatarStab = createavatarSan();
  app.stage.addChild(avatarStab);
  app.stage.removeChild(avatarFlyDown);
  app.stage.removeChild(barrel);
  app.stage.removeChild(curtain);
  pieces = Array(ROWS)
    .fill(null)
    .map(() => [...Array(COLUMNS).fill(null)]);
  if (nextPiece) {
    app.stage.removeChild(nextPiece);
  }
  resetScore();
  initScoreDisplay();
  initRNG();
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
};
export { start };

const create = async () => {
  if (created) return;
  const index = sprites.length;
  const maxHeight = getMaxStackHeight();
  if (maxHeight < 5 && Math.random() < 0.1) {
    const itemFile = items[Math.floor(Math.random() * items.length)];
    let dropped = [false, false];
    const onDropped = (id: number) => async (sprite: PIXI.Sprite) => {
      const { y } = getCoordinates(sprite);
      if (y < 0) {
        setState(end);
      } else {
        updateCoordinates(sprite, index + id, undefined, true);
        let chunk = findClearPieces(pieces);
        let cleared = false;
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
      ),
      createItem(
        itemFile,
        positions.splice(Math.floor(Math.random() * positions.length))[0],
        onDropped(1),
      ),
    ]);
    itemSprites.forEach((item) => {
      sprites.push({ sprite: item, isItem: true });
    });
  } else {
    const character = randomCharacter();
    const onDropped = async (sprite: PIXI.Sprite) => {
      const { y } = getCoordinates(sprite);
      const orientation = (Math.fround(sprite.rotation / Math.PI) * 2 + 2) % 4;

      if (y < 0 || (orientation === 0 && y <= 0)) {
        setState(end);
      } else {
        updateCoordinates(sprite, index, character);
        let chunk = findClearPieces(pieces);
        let cleared = false;
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

const end = async () => {
  if (!endAnimation) {
    // Play game over BGM: 182.1 once, then loop 182.2
    stopBgm();
    const bgm182_1 = app.loader.resources["bgm182_1"]?.sound as PIXI.sound.Sound | undefined;
    const bgm182_2 = app.loader.resources["bgm182_2"]?.sound;
    if (bgm182_1 && bgm182_2) {
      bgm182_1.play({ loop: false, volume: 0.3 }, () => {
        playBgm(bgm182_2 as PIXI.sound.Sound, { loop: true, volume: 0.3 });
      });
    }

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
      const moveDown = () => {
        sprites.forEach((sp) => (sp.sprite.y += speed));
        avatarFlyDown.y += speed;
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

const ended = () => {
  const restartGame = () => {
    setState(start);
    hammerManager.off("tap", restartGame);
  };
  hammerManager.on("tap", restartGame);
};
