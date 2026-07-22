/**
 * Boot entry — loader, boot welcome, main ticker. Runtime handles live in
 * `./runtime` so gameplay leaves do not import this boot graph.
 *
 * Heavy match code (game/states → board/piece) is not imported here; it loads
 * when the player starts a match (see application/play-session).
 *
 * Texture packs:
 *  - Shell (this file): bg / welcome / basic SFX — gates welcome "ready"
 *  - Play (`assets/play-pack`): selected-group characters + items + avatar props
 *    — idle-prewarmed after shell; spawn loads JIT if still missing
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
import nomSfx from "./assets/sounds/effects/nom.mp3";
import wonderBlastASfx from "./assets/sounds/effects/099_0156_06_013.mp3";
import wonderBlastBSfx from "./assets/sounds/effects/099_0156_10_014.mp3";
import bg from "./assets/bg.png";
import welcomeImg from "./assets/welcome.png";
import { initializeFontSystem } from "./ui/fonts";
import {
  showBootWelcome,
  setWelcomeLoadProgress,
  markWelcomeReady,
  welcome,
} from "./ui/welcome";
import { ensureLiveRegions } from "./a11y";
import { prefetchMenuBgm } from "./audio/bgm";
import { preloadGame } from "./application/play-session";
import { ensurePlayPack } from "./assets/play-pack";
import { app, setState, tickMain, setBgSprite } from "./runtime";

// Re-export runtime for any remaining `from "./index"` consumers.
export {
  app,
  bgSprite,
  setBgSprite,
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

// Shell main-loop entry only (boot welcome). Match control is never a MainLoopFn.
setState(welcome);

// Shell pack only — play textures load via ensurePlayPack after ready / on Start.
// Character fall / group-clear voices stay lazy in audio/sfx.
app.stage.sortableChildren = true;

const fontsReady = initializeFontSystem();

ensureLiveRegions();
showBootWelcome();
app.loader.onProgress.add(() => {
  setWelcomeLoadProgress(app.loader.progress);
});

app.loader
  .add("background", bg)
  .add("move", move)
  .add("land", land)
  .add("emuShrink", emuShrinkSfx)
  .add("carrotAkito", carrotAkitoSfx)
  .add("carrotEna", carrotEnaSfx)
  .add("nom", nomSfx)
  .add("wonderBlastA", wonderBlastASfx)
  .add("wonderBlastB", wonderBlastBSfx)
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
        // Must go through startGame (teardown menu/cover + orientation gate).
        // Raw start() leaves main-menu DOM and welcome sprite on stage.
        void import("./application/play-session").then(({ getPlayPhase }) => {
          if (getPlayPhase().type === "boot") return;
          void Promise.all([
            import("./ui/welcome/start-game"),
            import("./settings"),
          ]).then(([{ startGame }, { getCurrentGameMode }]) => {
            startGame(getCurrentGameMode());
          });
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

    // Idle-prewarm match code + play textures so first "Start" is snappy
    // without blocking welcome "ready" on character WebPs.
    const warm = () => {
      preloadGame();
      void ensurePlayPack();
    };
    if (typeof requestIdleCallback === "function") {
      requestIdleCallback(warm, { timeout: 2500 });
    } else {
      setTimeout(warm, 1);
    }

    app.ticker.add((delta) => {
      tickMain(delta);
    });
  });
