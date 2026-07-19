import {
  getCurrentSettings,
  loadBestHighScoreRecord,
  listHighScoreRecords,
  getDifficultyLabel,
  getDifficultyColor,
  DifficultyLevel,
  GameMode,
  HighScoreRecord,
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

// --- view state for cycling high-score buckets on the welcome menu ---
let endlessCursor: number | null = null;
let timeAttackCursor: number | null = null;
let timeAttackCursorDuration: number | null = null;
let dailyCursor: number | null = null;

/** Reset cycle cursors (call on full menu rebuild). */
export const resetHighScoreViewState = () => {
  endlessCursor = null;
  timeAttackCursor = null;
  timeAttackCursorDuration = null;
  dailyCursor = null;
};

const recordsEqual = (a: HighScoreRecord, b: HighScoreRecord): boolean =>
  a.score === b.score &&
  a.difficultyLevel === b.difficultyLevel &&
  a.entertainment === b.entertainment;

const recordForColumn = (
  mode: GameMode,
  cursor: number | null,
): HighScoreRecord => {
  const settings = getCurrentSettings();
  const list = listHighScoreRecords(mode, settings);
  if (cursor != null && cursor >= 0 && cursor < list.length) {
    return list[cursor];
  }
  return loadBestHighScoreRecord(mode, settings);
};

/** Advance the cycle cursor for a mode column. */
export const cycleHighScoreColumn = (mode: GameMode): void => {
  const settings = getCurrentSettings();
  const list = listHighScoreRecords(mode, settings);
  if (list.length <= 1) return;

  const advance = (cursor: number | null): number => {
    if (cursor == null) {
      const best = loadBestHighScoreRecord(mode, settings);
      const i = list.findIndex((r) => recordsEqual(r, best));
      return ((i >= 0 ? i : 0) + 1) % list.length;
    }
    return (cursor + 1) % list.length;
  };

  if (mode === "timeAttack") {
    const duration = settings.timeAttackDuration;
    if (timeAttackCursorDuration !== duration) {
      timeAttackCursor = null;
      timeAttackCursorDuration = duration;
    }
    timeAttackCursor = advance(timeAttackCursor);
    timeAttackCursorDuration = duration;
  } else if (mode === "daily") {
    dailyCursor = advance(dailyCursor);
  } else {
    endlessCursor = advance(endlessCursor);
  }
};

/** HTML for the main-menu high-score row (endless + time attack). */
export const highScoreRowHtml = (): string => {
  const settings = getCurrentSettings();

  // Invalidate TA cursor if duration changed since last paint
  if (
    timeAttackCursor != null &&
    timeAttackCursorDuration !== settings.timeAttackDuration
  ) {
    timeAttackCursor = null;
    timeAttackCursorDuration = settings.timeAttackDuration;
  }

  const formatRecord = (score: number, diff: number, ent: boolean) => {
    const scoreStr = score.toString().padStart(6, "0");
    const star =
      diff >= 1 && diff <= 7
        ? getDifficultyLabel(diff as DifficultyLevel)
        : "—";
    const entTag = ent ? ` · ${t("hsTags.entertainment")}` : "";
    return { scoreStr, star, entTag, diff };
  };

  const endless = recordForColumn("endless", endlessCursor);
  const timeAttack = recordForColumn("timeAttack", timeAttackCursor);
  const daily = recordForColumn("daily", dailyCursor);
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
  const dailyHs = formatRecord(
    daily.score,
    daily.difficultyLevel,
    daily.entertainment,
  );

  const tip = t("menu.highScore.tapToSwitch");
  const column = (
    mode: GameMode,
    label: string,
    scoreColor: string,
    record: ReturnType<typeof formatRecord>,
  ) => `
    <div class="hs-col" data-mode="${mode}" role="button" tabindex="0" title="${tip}" aria-label="${tip}">
      <div class="hs-label font-caption">${label}</div>
      <div class="hs-value font-numeric-strong" style="color:${scoreColor}">${
        record.scoreStr
      }</div>
      <div class="hs-meta font-caption" style="${diffColorStyle(
        record.diff,
      )}">${record.star}${record.entTag}</div>
    </div>`;

  return `${column(
    "endless",
    t("menu.highScore.endless"),
    "#ff6b8a",
    endlessHs,
  )}${column(
    "timeAttack",
    t("menu.highScore.timeAttack"),
    "#44ff88",
    timeAttackHs,
  )}${column("daily", t("menu.highScore.daily"), "#6bcbff", dailyHs)}`;
};

export const refreshHighScoreRow = () => {
  const row = document.getElementById("high-score-row");
  if (!row) return;
  row.innerHTML = highScoreRowHtml();
};

/** Handle click / keyboard on a high-score column (delegated). */
export const handleHighScoreRowEvent = (e: Event): void => {
  const target = e.target as HTMLElement | null;
  if (!target) return;
  const col = target.closest(".hs-col") as HTMLElement | null;
  if (!col) return;

  if (e.type === "keydown") {
    const ke = e as KeyboardEvent;
    if (ke.key !== "Enter" && ke.key !== " ") return;
    ke.preventDefault();
  }

  const mode = col.dataset.mode as GameMode | undefined;
  if (mode !== "endless" && mode !== "timeAttack" && mode !== "daily") return;
  cycleHighScoreColumn(mode);
  refreshHighScoreRow();
};
