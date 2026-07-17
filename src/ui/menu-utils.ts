import {
  getCurrentSettings,
  loadHighScoreRecord,
  getDifficultyLabel,
  getDifficultyColor,
  DifficultyLevel,
} from "../settings";
import { t } from "../i18n";

/** CSS inline style for colored difficulty text (supports gradient for Append) */
export const diffColorStyle = (level: number): string => {
  if (level === 7) {
    return `background:linear-gradient(90deg,#ff88cc,#ddbbff);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;`;
  }
  const c = getDifficultyColor(level);
  return c ? `color:${c};` : "";
};

/** HTML for the main-menu high-score row (endless + time attack). */
export const highScoreRowHtml = (): string => {
  const settings = getCurrentSettings();
  const formatRecord = (score: number, diff: number, ent: boolean) => {
    const scoreStr = score.toString().padStart(6, "0");
    const star =
      diff >= 1 && diff <= 7
        ? getDifficultyLabel(diff as DifficultyLevel)
        : "—";
    const entTag = ent ? ` · ${t("hsTags.entertainment")}` : "";
    return { scoreStr, star, entTag, diff };
  };
  const endless = loadHighScoreRecord("endless");
  const timeAttack = loadHighScoreRecord("timeAttack", settings);
  const endlessHs = formatRecord(
    endless.score,
    endless.difficultyLevel,
    endless.entertainment,
  );
  const timeAttackHs = formatRecord(
    timeAttack.score,
    timeAttack.difficultyLevel,
    timeAttack.entertainment,
  );

  const column = (
    label: string,
    scoreColor: string,
    record: ReturnType<typeof formatRecord>,
  ) => `
    <div class="hs-col">
      <div class="hs-label font-caption">${label}</div>
      <div class="hs-value font-numeric-strong" style="color:${scoreColor}">${
        record.scoreStr
      }</div>
      <div class="hs-meta font-caption" style="${diffColorStyle(
        record.diff,
      )}">${record.star}${record.entTag}</div>
    </div>`;

  return `${column(t("menu.highScore.endless"), "#ff6b8a", endlessHs)}${column(
    t("menu.highScore.timeAttack"),
    "#44ff88",
    timeAttackHs,
  )}`;
};

export const refreshHighScoreRow = () => {
  const row = document.getElementById("high-score-row");
  if (!row) return;
  row.innerHTML = highScoreRowHtml();
};
