/**
 * Boot entry — loader, boot welcome, main ticker. Runtime handles live in
 * `./runtime` so gameplay leaves do not import this boot graph.
 *
 * Heavy match code (game/states → board/piece) is not imported here; it loads
 * when the player starts a match (see application/play-session).
 */
import * as PIXI from "pixi.js-legacy";
import "./style.scss";
// Non-critical DOM chrome (menus/dialogs/settings) — does not block first paint.
// Boot LCP CSS is inlined in index.html.
void import("./styles/ui-chrome.scss");

import land from "./assets/sounds/land.mp3";
import move from "./assets/sounds/move.mp3";
import emuShrinkSfx from "./assets/sounds/effects/47_004_007.mp3";
import carrotAkitoSfx from "./assets/sounds/effects/2509_004_002.mp3";
import carrotEnaSfx from "./assets/sounds/effects/2509_004_003.mp3";
import bg from "./assets/bg.png";
import { characterData } from "./characters/data";
import { avatarTextures } from "./characters/avatar";
import gameOver from "./assets/gameOver.png";
import avatar from "./assets/chara/avatar.png";
import welcomeImg from "./assets/welcome.png";
import barrelTexture from "./assets/objects/barrel.png";
import { items } from "./items";
import { initializeFontSystem } from "./ui/fonts";
import {
  showBootWelcome,
  setWelcomeLoadProgress,
  markWelcomeReady,
  welcome,
} from "./ui/welcome";
import { prefetchMenuBgm } from "./audio/bgm";
import { preloadGame } from "./application/play-session";
import { app, setState, tickMain, setBgSprite } from "./runtime";

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

// Initial main-loop state (boot shell only — not the match FSM)
setState(welcome);

// Register play textures for boot loader.
// Character fall / group-clear voices are registered lazily in audio/sfx
// on first play — avoids multi‑MB downloads on the welcome screen.
characterData.forEach((character) => {
  app.loader.add(character.file);
  if (character.preview) {
    app.loader.add(character.preview);
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
        // Restart only after game chunk is available
        void import("./application/play-session").then(({ getStartState }) => {
          void getStartState().then((start) => setState(start));
        });
      } else if (key === "escape" || key === "p") {
        event.preventDefault();
        void import("./ui/pause-menu").then(({ togglePauseMenu }) => {
          togglePauseMenu();
        });
      }
    });

    void fontsReady;
    markWelcomeReady();
    prefetchMenuBgm();

    // Idle-prewarm match code so first "Start" is snappy without blocking boot parse
    const warm = () => preloadGame();
    if (typeof requestIdleCallback === "function") {
      requestIdleCallback(warm, { timeout: 2500 });
    } else {
      setTimeout(warm, 1);
    }

    app.ticker.add((delta) => {
      tickMain(delta);
    });
  });
