// Runtime state for entertainment fun-mode effects (gameplay)

import { getCurrentSettings } from "../settings";
import type { FunModeId } from "./modes";

/** Residual slow after Kanade lands; multiplies piece fall speed. Decays each spawn. */
let kanadeSlowResidual = 1;

/** Shizuku mirror: swap left/right move with left/right rotate */
let controlsSwapped = false;

export const isFunModeOn = (id: FunModeId): boolean => {
  const flags = getCurrentSettings().funModes;
  return !!flags?.[id];
};

export const resetFunEffects = () => {
  kanadeSlowResidual = 1;
  controlsSwapped = false;
};

// ---- カナデの余韻 ----

/** Call when a new falling piece is created. Returns extra speed mult from residual. */
export const consumeKanadeSlowForSpawn = (): number => {
  if (!isFunModeOn("kanadeSlow")) {
    kanadeSlowResidual = 1;
    return 1;
  }
  const mult = kanadeSlowResidual;
  // Decay toward 1 each piece after Kanade's wave
  if (kanadeSlowResidual < 1) {
    kanadeSlowResidual = Math.min(1, kanadeSlowResidual + 0.1);
  }
  return mult;
};

/** Kanade herself always falls at half speed when mode on */
export const getKanadeSelfSpeedMult = (): number =>
  isFunModeOn("kanadeSlow") ? 0.5 : 1;

/** After Kanade lands, start / refresh residual slow wave */
export const onKanadeLanded = () => {
  if (!isFunModeOn("kanadeSlow")) return;
  kanadeSlowResidual = 0.5;
};

/** Clearing Kanade ends residual immediately */
export const onKanadeCleared = () => {
  if (!isFunModeOn("kanadeSlow")) return;
  kanadeSlowResidual = 1;
};

export const getKanadeSlowResidual = () => kanadeSlowResidual;

// ---- 雫のミラー ----

export const isControlsSwapped = () =>
  isFunModeOn("shizukuSwap") && controlsSwapped;

export const setControlsSwapped = (on: boolean) => {
  controlsSwapped = on && isFunModeOn("shizukuSwap");
};

export const onShizukuCleared = (shihoOnBoard: boolean) => {
  if (!isFunModeOn("shizukuSwap")) return;
  if (shihoOnBoard) return;
  controlsSwapped = true;
};

export const onShihoLanded = () => {
  if (!isFunModeOn("shizukuSwap")) return;
  controlsSwapped = false;
};

export const cancelShizukuSwapIfShihoPresent = (shihoOnBoard: boolean) => {
  if (shihoOnBoard) controlsSwapped = false;
};
