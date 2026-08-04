import { t } from "../i18n";
import {
  armDialogFocus,
  buildDialogButton,
  buildDialogShell,
} from "../ui/dialog-button";
import type { FocusTrapHandle } from "../a11y";
import { fetchLeaderboard, type LeaderboardMode } from "./client";
import type { LeaderboardServer, LeaderboardResult } from "./types";
import {
  fetchBilibiliToyLeaderboard,
  getBilibiliToySnapshot,
  isBilibiliToyAvailable,
} from "../integrations/bilibili-toy";

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
  entries: LeaderboardResult["entries"],
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

  const serverControls = document.createElement("div");
  serverControls.className = "leaderboard-server-controls";
  let activeServer: LeaderboardServer = isBilibiliToyAvailable()
    ? "bilibili"
    : "official";

  const controls = document.createElement("div");
  controls.className = "leaderboard-controls";
  let activeMode: LeaderboardMode = "daily";

  const body = document.createElement("div");
  body.className = "leaderboard-loading";
  body.textContent = t("leaderboard.loading");
  shell.card.appendChild(body);

  const cloudScore = document.createElement("div");
  cloudScore.className = "leaderboard-cloud-score";
  shell.card.insertBefore(cloudScore, body);

  const updateCloudScore = () => {
    if (activeServer !== "bilibili") {
      cloudScore.hidden = true;
      return;
    }
    const score = getBilibiliToySnapshot().cloudScores[activeMode];
    cloudScore.hidden = false;
    cloudScore.textContent = `${t("leaderboard.bilibiliBest")}: ${score.toLocaleString()}`;
  };

  const load = (mode: LeaderboardMode) => {
    activeMode = mode;
    controls.querySelectorAll("button").forEach((button) => {
      button.classList.toggle("active", button.dataset.mode === activeMode);
    });
    updateCloudScore();
    body.className = "leaderboard-loading";
    body.textContent = t("leaderboard.loading");
    void (
      activeServer === "bilibili"
        ? fetchBilibiliToyLeaderboard(mode)
        : fetchLeaderboard(mode)
    )
      .then((board) => renderRows(body, board.entries))
      .catch((error: unknown) => {
        body.className = "leaderboard-empty";
        body.textContent =
          error instanceof Error && error.message === "AUTH_REQUIRED"
            ? t("leaderboard.signIn")
            : t("leaderboard.failed");
      });
  };

  const loadServer = (server: LeaderboardServer) => {
    activeServer = server;
    serverControls.querySelectorAll("button").forEach((button) => {
      button.classList.toggle("active", button.dataset.server === activeServer);
    });
    load(activeMode);
  };

  for (const server of ["official", "bilibili"] as const) {
    if (server === "bilibili" && !isBilibiliToyAvailable()) continue;
    const button = buildDialogButton(
      t(
        server === "official"
          ? "leaderboard.serverOfficial"
          : "leaderboard.serverBilibili",
      ),
      "neutral",
      () => loadServer(server),
    );
    button.dataset.server = server;
    serverControls.appendChild(button);
  }
  shell.card.insertBefore(serverControls, cloudScore);
  for (const mode of ["daily", "endless", "timeAttack"] as const) {
    const button = buildDialogButton(
      t(`leaderboard.mode.${mode}`),
      "neutral",
      () => load(mode),
    );
    button.dataset.mode = mode;
    controls.appendChild(button);
  }
  shell.card.insertBefore(controls, body);

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

  loadServer(activeServer);
};
