import { startReplay } from "../../../ui/welcome/start-game";
import { getDifficultyLabel } from "../../index";
import {
  listReplaySummaries,
  loadReplayEntry,
  type ReplaySummary,
} from "../../../replay";
import { t } from "../../../i18n";
import { padStartDigits } from "../../../util/pad";
import {
  makeOptionsRow,
  makeSettingGroup,
  type SettingsSectionCtx,
} from "../widgets";

const modeLabel = (summary: ReplaySummary): string => {
  if (summary.mode === "timeAttack") return t("menu.timeAttack");
  if (summary.mode === "daily") {
    return summary.dailyDateKey
      ? `${t("menu.daily")} · ${summary.dailyDateKey}`
      : t("menu.daily");
  }
  return t("menu.endless");
};

const replayLine = (summary: ReplaySummary): string => {
  const bits = [
    modeLabel(summary),
    `${t("gameOver.score")} ${padStartDigits(summary.score, 6)}`,
    `${t("gameOver.difficulty")} ${getDifficultyLabel(summary.difficulty)}`,
    summary.scoreRank,
  ];
  if (summary.entertainment) bits.push(t("hsTags.entertainment"));
  return bits.join(" · ");
};

const replaySubtitle = (summary: ReplaySummary): string =>
  new Date(summary.savedAt).toLocaleString();

export const appendReplaySection = (
  panel: HTMLElement,
  ctx: SettingsSectionCtx,
): void => {
  const group = makeSettingGroup(t("settings.replays.label"));
  const options = makeOptionsRow();
  options.classList.add("setting-options--stack");

  const rows = listReplaySummaries();
  if (rows.length === 0) {
    const empty = document.createElement("div");
    empty.className = "setting-help setting-help--muted";
    empty.textContent = t("settings.replays.empty");
    options.appendChild(empty);
    group.appendChild(options);
    panel.appendChild(group);
    return;
  }

  for (const summary of rows) {
    const row = document.createElement("div");
    row.className = "setting-opt";
    row.setAttribute("role", "button");
    row.tabIndex = 0;

    const openReplay = () => {
      const entry = loadReplayEntry(summary.id);
      if (!entry) return;
      ctx.close();
      window.setTimeout(() => startReplay(entry), 0);
    };

    row.onclick = openReplay;
    row.onkeydown = (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      openReplay();
    };

    const title = document.createElement("div");
    title.textContent = replayLine(summary);
    row.appendChild(title);

    const sub = document.createElement("div");
    sub.className = "setting-opt-sub";
    sub.textContent = `${replaySubtitle(summary)} · ${t("settings.replays.watch")}`;
    row.appendChild(sub);

    options.appendChild(row);
  }

  const help = document.createElement("div");
  help.className = "setting-help setting-help--muted";
  help.textContent = t("settings.replays.help");
  options.appendChild(help);

  group.appendChild(options);
  panel.appendChild(group);
};
