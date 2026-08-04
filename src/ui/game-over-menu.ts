/**
 * Game-over dialog shell: show / dispose, restart / menu / share actions.
 * Result body is built by game-over-summary.ts.
 */
import { t } from "../i18n";
import { getScoreSummary } from "../score";
import { start, returnToMenu } from "../application/play-session";
import {
  getReplayPlaybackEntry,
  isReplayPlayback,
  queueReplayPlayback,
} from "../replay";
import type { FocusTrapHandle } from "../a11y";
import {
  armDialogFocus,
  buildDialogButton,
  buildDialogShell,
} from "./dialog-button";
import { buildGameOverSummary } from "./game-over-summary";
import { devWarn } from "../util/dev-log";
import {
  fetchBilibiliToyLeaderboard,
  isBilibiliToyAvailable,
  waitForBilibiliToyScore,
} from "../integrations/bilibili-toy";

const GAME_OVER_OVERLAY_ID = "game-over-overlay";

let overlay: HTMLDivElement | null = null;
let focusTrap: FocusTrapHandle | null = null;

export const isGameOverMenuOpen = (): boolean => !!overlay;

/** Hard remove overlay (locale rebuild / teardown / start / returnToMenu). */
export const disposeGameOverMenu = (): void => {
  focusTrap?.release({ restore: false });
  focusTrap = null;
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

  if (!summary.entertainment && !summary.replaying) {
    const rank = document.createElement("div");
    rank.className = "go-leaderboard-rank";
    const bilibili = isBilibiliToyAvailable();
    const serverLabel = t(
      bilibili ? "leaderboard.serverBilibili" : "leaderboard.serverOfficial",
    );
    rank.textContent = `${serverLabel} · ${t("leaderboard.submitting")}`;
    card.appendChild(rank);
    void (
      bilibili
        ? waitForBilibiliToyScore().then(() =>
            fetchBilibiliToyLeaderboard(summary.mode),
          )
        : import("../leaderboard/client").then(
            async ({ fetchLeaderboard, waitForScoreSubmission }) => {
              await waitForScoreSubmission();
              return fetchLeaderboard(summary.mode);
            },
          )
    )
      .then((board) => {
        rank.textContent = `${serverLabel} · ${
          board.me
            ? t("leaderboard.myRank", {
                rank: board.me.rank,
                total: board.total,
              })
            : t("leaderboard.notRanked")
        }`;
      })
      .catch(() => {
        rank.textContent = `${serverLabel} · ${t("leaderboard.unavailable")}`;
      });
  }

  const actions = document.createElement("div");
  actions.className = "go-actions";

  const shareBtn = buildDialogButton(t("gameOver.share"), "neutral", () => {
    const label = shareBtn.textContent;
    shareBtn.disabled = true;
    void import("./share-card")
      .then(({ shareScoreCard }) => shareScoreCard(summary))
      .catch((err: unknown) => {
        const name =
          err && typeof err === "object" && "name" in err
            ? String((err as { name: unknown }).name)
            : "";
        if (name === "AbortError") return;
        devWarn("[share]", err);
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
    if (isReplayPlayback()) {
      const entry = getReplayPlaybackEntry();
      if (entry) queueReplayPlayback(entry);
    }
    start();
  };
  const quit = () => {
    disposeGameOverMenu();
    returnToMenu();
  };

  const restartBtn = buildDialogButton(
    isReplayPlayback() ? t("replay.watchAgain") : t("gameOver.restart"),
    "primary",
    restart,
  );
  actions.appendChild(restartBtn);
  actions.appendChild(buildDialogButton(t("gameOver.menu"), "danger", quit));
  card.appendChild(actions);

  document.body.appendChild(overlay);
  focusTrap = armDialogFocus(overlay, {
    initialFocus: restartBtn,
  });
};
