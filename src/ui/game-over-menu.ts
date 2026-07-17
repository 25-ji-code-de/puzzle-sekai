/**
 * Game-over choice overlay. Shown after the curtain finishes; offers
 * Restart (same mode, re-seed board) / Quit to menu. Replaces the old
 * "tap anywhere to restart" behaviour.
 */
import { t } from "../i18n";
import { start, returnToMenu } from "../application/play-session";
import { buildDialogButton, buildDialogShell } from "./dialog-button";

const GAME_OVER_OVERLAY_ID = "game-over-overlay";

let overlay: HTMLDivElement | null = null;

export const isGameOverMenuOpen = (): boolean => !!overlay;

/** Hard remove overlay (locale rebuild / teardown / start / returnToMenu). */
export const disposeGameOverMenu = (): void => {
  overlay?.remove();
  overlay = null;
};

export const showGameOverMenu = (): void => {
  if (overlay) return;
  document.getElementById(GAME_OVER_OVERLAY_ID)?.remove();

  const shell = buildDialogShell({
    id: GAME_OVER_OVERLAY_ID,
    title: t("gameOver.title"),
    backdropAlpha: 0.55,
  });
  overlay = shell.overlay;
  const { card } = shell;

  const restart = () => {
    disposeGameOverMenu();
    start();
  };
  const quit = () => {
    disposeGameOverMenu();
    returnToMenu();
  };

  card.appendChild(
    buildDialogButton(t("gameOver.restart"), "primary", restart),
  );
  card.appendChild(buildDialogButton(t("gameOver.menu"), "danger", quit));

  document.body.appendChild(overlay);
};
