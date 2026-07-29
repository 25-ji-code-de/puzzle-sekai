import { t } from "../i18n";
import {
  armDialogFocus,
  buildDialogButton,
  buildDialogShell,
} from "../ui/dialog-button";
import type { FocusTrapHandle } from "../a11y";
import { fetchDailyLeaderboard } from "./client";

let overlay: HTMLDivElement | null = null;
let focusTrap: FocusTrapHandle | null = null;

export const closeDailyLeaderboard = (): void => {
  focusTrap?.release();
  focusTrap = null;
  overlay?.remove();
  overlay = null;
};

const renderRows = (
  host: HTMLElement,
  entries: Awaited<ReturnType<typeof fetchDailyLeaderboard>>["entries"],
) => {
  host.replaceChildren();
  if (entries.length === 0) {
    host.textContent = t("leaderboard.empty");
    host.className = "leaderboard-empty";
    return;
  }
  const list = document.createElement("ol");
  list.className = "leaderboard-list";
  for (const entry of entries) {
    const row = document.createElement("li");
    row.className = "leaderboard-row";
    const rank = document.createElement("span");
    rank.className = "leaderboard-rank";
    rank.textContent = `#${entry.rank}`;
    const name = document.createElement("span");
    name.className = "leaderboard-name";
    name.textContent = entry.display_name ?? t("leaderboard.anonymous");
    const score = document.createElement("strong");
    score.textContent = entry.score.toLocaleString();
    row.append(rank, name, score);
    list.appendChild(row);
  }
  host.appendChild(list);
};

export const showDailyLeaderboard = (): void => {
  if (overlay) return;
  const shell = buildDialogShell({
    id: "daily-leaderboard-overlay",
    title: t("leaderboard.title"),
    backdropAlpha: 0.55,
  });
  overlay = shell.overlay;
  shell.card.classList.add("ui-dialog--leaderboard");

  const body = document.createElement("div");
  body.className = "leaderboard-loading";
  body.textContent = t("leaderboard.loading");
  shell.card.appendChild(body);

  const close = buildDialogButton(
    t("controls.close"),
    "neutral",
    closeDailyLeaderboard,
  );
  const footer = document.createElement("div");
  footer.className = "ui-dialog__footer";
  footer.appendChild(close);
  shell.card.appendChild(footer);
  document.body.appendChild(overlay);
  focusTrap = armDialogFocus(overlay, {
    initialFocus: close,
    onEscape: closeDailyLeaderboard,
  });

  void fetchDailyLeaderboard()
    .then((board) => renderRows(body, board.entries))
    .catch((error: unknown) => {
      body.className = "leaderboard-empty";
      body.textContent =
        error instanceof Error && error.message === "AUTH_REQUIRED"
          ? t("leaderboard.signIn")
          : t("leaderboard.failed");
    });
};
