/**
 * Shared runtime handles — PIXI app, tickers, input, main-loop state pointer.
 * Leaves import this module instead of the boot entry (index.ts) to avoid
 * pulling the full loader/boot graph and to break index ↔ states cycles.
 */
import * as PIXI from "pixi.js-legacy";
import * as Hammer from "hammerjs";
import { STAGE_WIDTH, STAGE_HEIGHT } from "./config";

/**
 * PIXI.TextMetrics samples glyphs via getImageData on a shared offscreen canvas.
 * Chrome warns when that context was created without willReadFrequently. The
 * library hard-codes getContext('2d'); swap the canvas once at boot so score HUD
 * text (and every other PIXI.Text) stays quiet.
 */
try {
  const metrics = PIXI.TextMetrics as unknown as {
    _canvas?: HTMLCanvasElement;
    _context?: CanvasRenderingContext2D | null;
  };
  const prev = metrics._canvas;
  const canvas =
    typeof document !== "undefined" ? document.createElement("canvas") : null;
  if (canvas) {
    canvas.width = Math.max(1, prev?.width ?? 10);
    canvas.height = Math.max(1, prev?.height ?? 10);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (ctx) {
      metrics._canvas = canvas;
      metrics._context = ctx;
    }
  }
} catch {
  /* older / non-DOM environments */
}

const { Application } = PIXI;

/** Canvas buffer scale relative to logical stage (1 = full 1920×1080 buffer). */
export const FULL_RESOLUTION = 1;
/**
 * Low-performance: half linear resolution → ~1/4 the pixels.
 * Stage / interaction coordinates stay STAGE_WIDTH × STAGE_HEIGHT.
 */
export const LOW_PERF_RESOLUTION = 0.5;

/**
 * Read persisted low-performance flag without importing the full settings graph
 * (runtime is loaded before store; avoid circular init).
 * Logic lives in settings/storage so boot and store share one shape.
 */
import { readStorageJsonFlag } from "./settings/storage";
import { SETTINGS_KEY } from "./settings/types";

const readLowPerformanceFlag = (): boolean =>
  readStorageJsonFlag(SETTINGS_KEY, "lowPerformance");

const initialLowPerf = readLowPerformanceFlag();
const initialResolution = initialLowPerf
  ? LOW_PERF_RESOLUTION
  : FULL_RESOLUTION;

// Keep filter FBOs in step with the main buffer (default is always 1).
PIXI.settings.FILTER_RESOLUTION = initialResolution;

/**
 * IMPORTANT: do NOT enable autoDensity.
 * autoDensity writes canvas.style.width/height = logical stage px (1920×1080),
 * which fights our CSS letterbox (height:100%; width:auto) and breaks layout
 * on every screen size. Display size is owned by style.scss only.
 */
export const app = new Application({
  width: STAGE_WIDTH,
  height: STAGE_HEIGHT,
  autoDensity: false,
  resolution: initialResolution,
});

/** Clear any inline size PIXI may have set so CSS letterbox stays in charge. */
const clearViewInlineSize = (): void => {
  const canvas = app.view as HTMLCanvasElement;
  if (!canvas?.style) return;
  canvas.style.removeProperty("width");
  canvas.style.removeProperty("height");
};

clearViewInlineSize();
if (initialLowPerf) {
  (app.view as HTMLCanvasElement).dataset.perf = "low";
}

/**
 * Logical stage size for gameplay / UI layout.
 *
 * NEVER use `app.renderer.height` / `.width` for game math: those return the
 * **buffer** pixel size (`stage × resolution`). Under low-performance mode
 * that is ~960×540, which cuts land Y / curtain / welcome placement in half.
 * Prefer STAGE_WIDTH / STAGE_HEIGHT from config, or this helper.
 */
export const stageSize = () => ({
  width: STAGE_WIDTH,
  height: STAGE_HEIGHT,
});

/**
 * Switch renderer buffer resolution at runtime.
 * - Logical stage stays STAGE_WIDTH × STAGE_HEIGHT (game math unchanged).
 * - Back-buffer becomes stage × resolution (0.5 → ~960×540).
 * - CSS still letterboxes the canvas; we never set fixed inline CSS sizes.
 */
export const applyPerformanceMode = (lowPerformance: boolean): void => {
  const next = lowPerformance ? LOW_PERF_RESOLUTION : FULL_RESOLUTION;
  const renderer = app.renderer as PIXI.AbstractRenderer & {
    resolution: number;
    resize: (w: number, h: number) => void;
  };

  PIXI.settings.FILTER_RESOLUTION = next;

  if (Math.abs(renderer.resolution - next) >= 1e-6) {
    renderer.resolution = next;
    // Rebuild the view buffer at the new resolution for the same logical size.
    renderer.resize(STAGE_WIDTH, STAGE_HEIGHT);
  }

  clearViewInlineSize();

  const canvas = app.view as HTMLCanvasElement;
  if (lowPerformance) {
    canvas.dataset.perf = "low";
  } else {
    delete canvas.dataset.perf;
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

/**
 * Shell per-frame callback on app.ticker (boot welcome, rare end flourish).
 * Match session semantics live in PlayPhase; piece fall / board VFX use
 * gameTicker. Do not reintroduce gameplay as a MainLoopFn.
 */
export type MainLoopFn = (delta: number) => void;

let state: MainLoopFn = () => {};
export const setState = (nextState: MainLoopFn) => {
  state = nextState;
};
export const getState = (): MainLoopFn => state;

/** Advance the shell main-loop callback one frame (wired from boot). */
export const tickMain = (delta: number) => {
  state(delta);
};
