/**
 * Boot entry — loader, boot welcome, main ticker. Runtime handles live in
 * `./runtime` so gameplay leaves do not import this boot graph.
 */
import * as PIXI from "pixi.js-legacy";
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
import {
  app,
  setState,
  tickMain,
  setBgSprite,
} from "./runtime";

// Re-export runtime for any remaining `from "./index"` consumers.
export {
  app,
  bgSprite,
  setBgSprite,
  hammerManager,
  gameTicker,
  resetGameTicker,
  setState,
  getState,
  tickMain,
} from "./runtime";
export type { MainLoopFn } from "./runtime";

document.querySelector(".game")?.appendChild(app.view);

const main = document.querySelector(".main");
window.addEventListener("resize", () => {
  (main as HTMLDivElement).style.height = window.innerHeight + "px";
});

// Initial main-loop state
setState(welcome);

// load the texture we need
characterData.forEach((character) => {
  app.loader.add(character.file);
  if (character.preview) {
    app.loader.add(character.preview);
  }
  character.sounds?.fall?.forEach((voice) => {
    if (!sound.exists(voice)) {
      sound.add(voice, { url: voice });
    }
  });
});
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

showBootWelcome();
app.loader.onProgress.add(() => {
  setWelcomeLoadProgress(app.loader.progress);
});

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

    const bgSpr = new PIXI.Sprite(resources.background?.texture);
    bgSpr.position.x = 0;
    bgSpr.position.y = 0;
    setBgSprite(bgSpr);

    window.addEventListener("keydown", (event) => {
      const key = event.key.toLowerCase();
      if (key === "r") {
        setState(start);
      } else if (key === "escape" || key === "p") {
        event.preventDefault();
        togglePauseMenu();
      }
    });

    void fontsReady;
    markWelcomeReady();
    prefetchMenuBgm();

    app.ticker.add((delta) => {
      tickMain(delta);
    });
  });
