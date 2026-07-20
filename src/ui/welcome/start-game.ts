/**
 * Start-match flow: fullscreen, landscape gate, hand off to play-session.start().
 */
import {
  start,
  pausePlay,
  resumePlay,
  preloadGame,
} from "../../application/play-session";
import {
  setCurrentGameMode,
  setActiveDailyDateKey,
  getUserSettings,
  type GameMode,
  queueReplayPlayback,
  type ReplayEntry,
} from "../../settings";
import { t } from "../../i18n";
import { isNativeBuild } from "../../auth/config";
import {
  requestAppFullscreen,
  waitForLandscape,
  startPlayOrientationGate,
  type OrientationGate,
} from "../display";

let orientationGate: OrientationGate | null = null;
let onTeardownMenu: (() => void) | null = null;
let onRemoveWelcomeSprite: (() => void) | null = null;

export const setStartGameHooks = (hooks: {
  teardownMenu: () => void;
  removeWelcomeSprite: () => void;
}) => {
  onTeardownMenu = hooks.teardownMenu;
  onRemoveWelcomeSprite = hooks.removeWelcomeSprite;
};

export const disposeOrientationGate = () => {
  orientationGate?.dispose();
  orientationGate = null;
};

const startThroughOrientationGate = () => {
  // Honour the display-mode setting: only fullscreen requests enter fullscreen
  // on game start. Windowed/borderless keep their current chrome.
  const displayMode = getUserSettings().displayMode;
  if (displayMode === "fullscreen") {
    // Must request fullscreen from this user-gesture stack; fire-and-forget so
    // a browser rejection (e.g. iOS Safari) never blocks game start.
    void requestAppFullscreen();
  } else if (isNativeBuild() && displayMode === "borderless") {
    void import("../../native/shell").then(({ applyWindowDisplayMode }) =>
      applyWindowDisplayMode("borderless"),
    );
  }

  onTeardownMenu?.();
  onRemoveWelcomeSprite?.();

  // Prefetch game chunk + background-warm play textures while waiting for
  // landscape / fullscreen. Start does not block on the full pack.
  preloadGame();

  // Don't start the match until landscape — otherwise pieces drop while the
  // player is still rotating the phone.
  disposeOrientationGate();
  orientationGate = waitForLandscape(t("display.rotateLandscape"), () => {
    // After the first landscape unlock, keep a pause/resume gate so flipping
    // back to portrait freezes the match instead of letting it run blind.
    orientationGate = startPlayOrientationGate({
      message: t("display.rotateLandscape"),
      onPause: () => pausePlay("portrait"),
      // Don't auto-resume if the player opened the pause menu / tab-hidden pause
      // before rotating back to landscape.
      onResume: () => {
        void Promise.all([
          import("../pause-menu"),
          import("../../application/play-session"),
        ]).then(([{ isPauseMenuOpen, showPauseMenu }, { getPlayPhase }]) => {
          if (isPauseMenuOpen()) return;
          const phase = getPlayPhase();
          if (phase.type === "paused" && phase.reason !== "portrait") {
            // Hidden-tab pause (or an explicit user pause without overlay) —
            // surface the menu instead of silently unfreezing.
            if (phase.reason === "hidden" || phase.reason === "user") {
              showPauseMenu();
            }
            return;
          }
          resumePlay();
        });
      },
    });
    start();
  });
};

export const startGame = (mode: GameMode) => {
  setCurrentGameMode(mode);
  startThroughOrientationGate();
};

export const startReplay = (entry: ReplayEntry) => {
  setCurrentGameMode(entry.mode);
  if (entry.mode === "daily") {
    setActiveDailyDateKey(entry.dailyDateKey ?? null);
  }
  queueReplayPlayback(entry);
  startThroughOrientationGate();
};
