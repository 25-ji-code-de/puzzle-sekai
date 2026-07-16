import * as PIXI from "pixi.js-legacy";
import * as Hammer from "hammerjs";
import sound from "pixi-sound";
import "./style.scss";
import land from "./assets/sounds/land.mp3";
import move from "./assets/sounds/move.mp3";
import emuShrinkSfx from "./assets/sounds/effects/47_004_007.mp3";
import carrotAkitoSfx from "./assets/sounds/effects/2509_004_002.mp3";
import carrotEnaSfx from "./assets/sounds/effects/2509_004_003.mp3";
import bg from "./assets/bg.png";
import { characterData, groupSounds } from "./characters/data";
import { avatarTextures } from "./characters/avatar";
import gameOver from "./assets/gameOver.png";
import avatar from "./assets/chara/avatar.png";
import welcomeImg from "./assets/welcome.png";
import barrelTexture from "./assets/objects/barrel.png";
import { start, welcome } from "./game/states";
import { items } from "./items";
import { initializeFontSystem } from "./ui/fonts";
import { togglePauseMenu } from "./ui/pause-menu";
import {
  showBootWelcome,
  setWelcomeLoadProgress,
  markWelcomeReady,
} from "./ui/welcome";
import { prefetchMenuBgm } from "./audio/bgm";

// The application will create a renderer using WebGL, if possible,
// with a fallback to a canvas render. It will also setup the ticker
// and the root stage PIXI.Container

const { Application } = PIXI;

export const app = new Application({
  width: 1920,
  height: 1080,
});

export let bgSprite: PIXI.Sprite;

// The application will create a canvas element for you that you
// can then insert into the DOM
document.querySelector(".game")?.appendChild(app.view);

const main = document.querySelector(".main");
window.addEventListener("resize", () => {
  (main as HTMLDivElement).style.height = window.innerHeight + "px";
});

export const hammerManager = new Hammer.Manager(app.view);
hammerManager.add(new Hammer.Swipe());
hammerManager.add(new Hammer.Tap());
hammerManager.add(new Hammer.Press());

export let gameTicker = new PIXI.Ticker();
export const resetGameTicker = () => {
  gameTicker.destroy();
  gameTicker = new PIXI.Ticker();
};

let state: (delta: number) => void = welcome;
export const setState = (nextState: typeof state) => {
  state = nextState;
};

// load the texture we need
characterData.forEach((character) => {
  app.loader.add(character.file);
  if (character.preview) {
    app.loader.add(character.preview);
  }
  // Register voice sounds with pixi-sound (bypass PIXI loader to avoid ArrayBuffer detach)
  character.sounds?.fall?.forEach((voice) => {
    if (!sound.exists(voice)) {
      sound.add(voice, { url: voice });
    }
  });
});
// Register group clear sounds
Object.values(groupSounds).forEach((url) => {
  if (!sound.exists(url)) {
    sound.add(url, { url });
  }
});
items.forEach((img) => {
  app.loader.add(img);
});
avatarTextures.forEach((t) => app.loader.add(t));
app.stage.sortableChildren = true;

const fontsReady = initializeFontSystem();

// Adopt the static #boot-welcome shell from index.html; progress updates its prompt.
showBootWelcome();
app.loader.onProgress.add(() => {
  setWelcomeLoadProgress(app.loader.progress);
});

// BGM is lazy-loaded by scene via src/bgm.ts — not part of the boot loader.
app.loader
  .add(avatar)
  .add("background", bg)
  .add(barrelTexture)
  .add("move", move)
  .add("land", land)
  .add("emuShrink", emuShrinkSfx)
  .add("carrotAkito", carrotAkitoSfx)
  .add("carrotEna", carrotEnaSfx)
  .add("gameOver", gameOver)
  .add("welcome", welcomeImg)
  .load((_loader, resources) => {
    setWelcomeLoadProgress(100);

    const bg = new PIXI.Sprite(resources.background?.texture);

    bg.position.x = 0;
    bg.position.y = 0;

    // Store background for later - don't add to stage yet
    bgSprite = bg;

    window.addEventListener("keydown", (event) => {
      const key = event.key.toLowerCase();
      if (key === "r") {
        // Always allow restart, including during game-over BGM / curtain
        setState(start);
      } else if (key === "escape" || key === "p") {
        // Toggle manual pause menu during play (no-op when portrait-gated).
        event.preventDefault();
        togglePauseMenu();
      }
    });

    // Don't block on fontsReady — metric-matched local fallbacks paint
    // immediately (font-display: swap), and the web faces swap in later.
    void fontsReady;
    markWelcomeReady();
    // Start pulling menu BGM now so click-to-continue usually plays instantly.
    // Play / game-over tracks wait until the player is on the menu.
    prefetchMenuBgm();

    app.ticker.add((delta) => {
      state(delta);
    });
  });
