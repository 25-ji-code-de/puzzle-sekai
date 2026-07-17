/**
 * Shared runtime handles — PIXI app, tickers, input, main-loop state pointer.
 * Leaves import this module instead of the boot entry (index.ts) to avoid
 * pulling the full loader/boot graph and to break index ↔ states cycles.
 */
import * as PIXI from "pixi.js-legacy";
import * as Hammer from "hammerjs";
import { STAGE_WIDTH, STAGE_HEIGHT } from "./config";

const { Application } = PIXI;

/** Canvas buffer scale relative to logical stage (1 = full 1920×1080 buffer). */
export const FULL_RESOLUTION = 1;
/** Low-performance: half the pixels (~960×540 buffer, stage still 1920×1080). */
export const LOW_PERF_RESOLUTION = 0.5;

/**
 * Read persisted low-performance flag without importing the full settings graph
 * (runtime is loaded before store; avoid circular init).
 */
const readLowPerformanceFlag = (): boolean => {
  try {
    const raw = localStorage.getItem("puzzleSekaiSettings");
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return parsed?.lowPerformance === true;
  } catch {
    return false;
  }
};

const initialLowPerf = readLowPerformanceFlag();

export const app = new Application({
  width: STAGE_WIDTH,
  height: STAGE_HEIGHT,
  // Keep CSS letterbox size tied to logical stage; only the buffer shrinks.
  autoDensity: true,
  resolution: initialLowPerf ? LOW_PERF_RESOLUTION : FULL_RESOLUTION,
  // Prefer power-saving GPU profile when available.
  powerPreference: initialLowPerf ? "low-power" : "default",
});

/**
 * Switch renderer buffer resolution at runtime.
 * Stage coordinates stay STAGE_WIDTH × STAGE_HEIGHT; only back-buffer size changes.
 */
export const applyPerformanceMode = (lowPerformance: boolean): void => {
  const next = lowPerformance ? LOW_PERF_RESOLUTION : FULL_RESOLUTION;
  const renderer = app.renderer as PIXI.Renderer & {
    resolution: number;
    resize: (w: number, h: number) => void;
  };
  if (Math.abs(renderer.resolution - next) < 1e-6) return;
  renderer.resolution = next;
  // Re-apply logical size so the view buffer is rebuilt at the new resolution.
  renderer.resize(STAGE_WIDTH, STAGE_HEIGHT);
  try {
    const gl = (renderer as unknown as { gl?: WebGLRenderingContext }).gl;
    const canvas = app.view as HTMLCanvasElement;
    // Hint is only honored by some browsers at context creation; set when possible.
    if (canvas && lowPerformance) {
      canvas.dataset.perf = "low";
    } else if (canvas) {
      delete canvas.dataset.perf;
    }
    void gl;
  } catch {
    /* ignore */
  }
};

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
