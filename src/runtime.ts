/**
 * Shared runtime handles — PIXI app, tickers, input, main-loop state pointer.
 * Leaves import this module instead of the boot entry (index.ts) to avoid
 * pulling the full loader/boot graph and to break index ↔ states cycles.
 */
import * as PIXI from "pixi.js-legacy";
import * as Hammer from "hammerjs";
import { STAGE_WIDTH, STAGE_HEIGHT } from "./config";

const { Application } = PIXI;

export const app = new Application({
  width: STAGE_WIDTH,
  height: STAGE_HEIGHT,
});

export let bgSprite: PIXI.Sprite;
export const setBgSprite = (s: PIXI.Sprite) => {
  bgSprite = s;
};

export const hammerManager = new Hammer.Manager(app.view);
hammerManager.add(new Hammer.Swipe());
hammerManager.add(new Hammer.Tap());
hammerManager.add(new Hammer.Press());

export let gameTicker = new PIXI.Ticker();
export const resetGameTicker = () => {
  gameTicker.destroy();
  gameTicker = new PIXI.Ticker();
};

/** Main-loop phase callback (driven by app.ticker). */
export type MainLoopFn = (delta: number) => void;

let state: MainLoopFn = () => {};
export const setState = (nextState: MainLoopFn) => {
  state = nextState;
};
export const getState = (): MainLoopFn => state;

/** Advance the main FSM one frame (called from boot after wiring). */
export const tickMain = (delta: number) => {
  state(delta);
};
