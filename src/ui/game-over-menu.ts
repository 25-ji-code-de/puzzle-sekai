/**
 * Game-over dialog shell: show / dispose, restart / menu / share actions.
 * Result body is built by game-over-summary.ts.
 */
import { t } from "../i18n";
import { getScoreSummary } from "../score";
import { start, returnToMenu } from "../application/play-session";
import { buildDialogButton, buildDialogShell } from "./dialog-button";
import { buildGameOverSummary } from "./game-over-summary";
import { shareScoreCard } from "./share-card";

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

  const summary = getScoreSummary();

  const shell = buildDialogShell({
    id: GAME_OVER_OVERLAY_ID,
    title: t("gameOver.title"),
    backdropAlpha: 0.55,
  });
  overlay = shell.overlay;
  const { card } = shell;
  card.classList.add("ui-dialog--game-over");

  card.appendChild(buildGameOverSummary(summary));

  const actions = document.createElement("div");
  actions.className = "go-actions";

  const shareBtn = buildDialogButton(t("gameOver.share"), "neutral", () => {
    const label = shareBtn.textContent;
    shareBtn.disabled = true;
    void shareScoreCard(summary)
      .catch((err: unknown) => {
        const name =
          err && typeof err === "object" && "name" in err
            ? String((err as { name: unknown }).name)
            : "";
        if (name === "AbortError") return;
        console.warn("[share]", err);
        shareBtn.textContent = t("gameOver.shareFailed");
        window.setTimeout(() => {
          if (shareBtn.isConnected) shareBtn.textContent = label;
        }, 1500);
      })
      .finally(() => {
        if (shareBtn.isConnected) shareBtn.disabled = false;
      });
  });
  actions.appendChild(shareBtn);

  const restart = () => {
    disposeGameOverMenu();
    start();
  };
  const quit = () => {
    disposeGameOverMenu();
    returnToMenu();
  };

  actions.appendChild(
    buildDialogButton(t("gameOver.restart"), "primary", restart),
  );
  actions.appendChild(buildDialogButton(t("gameOver.menu"), "danger", quit));
  card.appendChild(actions);

  document.body.appendChild(overlay);
};
