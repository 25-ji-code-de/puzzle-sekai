/**
 * Start-match flow: fullscreen, landscape gate, hand off to play state machine.
 */
import { setState } from "../../runtime";
import {
  getStartState,
  pausePlay,
  resumePlay,
  preloadGame,
} from "../../application/play-session";
import { setCurrentGameMode, type GameMode } from "../../settings";
import { t } from "../../i18n";
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

export const startGame = (mode: GameMode) => {
  setCurrentGameMode(mode);

  // Must request fullscreen from this user-gesture stack; fire-and-forget so
  // a browser rejection (e.g. iOS Safari) never blocks game start.
  void requestAppFullscreen();

  onTeardownMenu?.();
  onRemoveWelcomeSprite?.();

  // Prefetch game chunk while waiting for landscape / fullscreen.
  preloadGame();

  // Don't start the match until landscape — otherwise pieces drop while the
  // player is still rotating the phone.
  disposeOrientationGate();
  orientationGate = waitForLandscape(t("display.rotateLandscape"), () => {
    // After the first landscape unlock, keep a pause/resume gate so flipping
    // back to portrait freezes the match instead of letting it run blind.
    orientationGate = startPlayOrientationGate({
      message: t("display.rotateLandscape"),
      onPause: pausePlay,
      // Don't auto-resume if the player opened the pause menu before rotating.
      onResume: () => {
        void import("../pause-menu").then(({ isPauseMenuOpen }) => {
          if (isPauseMenuOpen()) return;
          resumePlay();
        });
      },
    });
    void getStartState().then((start) => setState(start));
  });
};
