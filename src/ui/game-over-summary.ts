/**
 * DOM builder for the game-over result body (not the dialog shell / buttons).
 */
import { t } from "../i18n";
import {
  COMBO_PAD,
  formatMultiplier,
  GROUP_CLEAR_PAD,
  groupsForSummary,
  SCORE_PAD,
  scoreRankColorStyle,
  splitPaddedNumber,
  type ScoreSummary,
} from "../score";
import { getGroupDisplayColor } from "../settings";
import { diffColorStyle } from "./menu-utils";

/** Leading zeros dim, significant digits solid — mirrors in-game HUD. */
const makePaddedNumber = (
  n: number,
  len: number,
  className: string,
  solidColor?: string,
): HTMLElement => {
  const el = document.createElement("span");
  el.className = `${className} font-numeric-strong`;
  const { pad, solid } = splitPaddedNumber(n, len);
  if (pad) {
    const g = document.createElement("span");
    g.className = "go-num__pad";
    g.textContent = pad;
    el.appendChild(g);
  }
  if (solid) {
    const s = document.createElement("span");
    s.className = "go-num__solid";
    s.textContent = solid;
    if (solidColor) s.style.color = solidColor;
    el.appendChild(s);
  }
  return el;
};

/**
 * Layout:
 *   top:    [difficulty ×mult] ........ [rank]
 *   center: big score / small high score
 *   bottom: [group clears vertical] | [COMBO]
 */
export const buildGameOverSummary = (
  summary: ScoreSummary,
): HTMLDivElement => {
  const root = document.createElement("div");
  root.className = "go-summary";

  // —— Top: difficulty + mult | rank ——
  const top = document.createElement("div");
  top.className = "go-summary__top";

  const diffSide = document.createElement("div");
  diffSide.className = "go-summary__diff";

  const diffLabel = document.createElement("span");
  diffLabel.className = "go-summary__diff-label";
  diffLabel.textContent = summary.difficultyLabel;
  diffLabel.style.cssText = diffColorStyle(summary.difficulty);

  const mult = document.createElement("span");
  mult.className = "go-summary__mult font-numeric-strong";
  mult.textContent = formatMultiplier(summary.multiplier);

  diffSide.appendChild(diffLabel);
  diffSide.appendChild(mult);
  if (summary.entertainment) {
    const ent = document.createElement("span");
    ent.className = "go-summary__ent";
    ent.textContent = t("hsTags.entertainment");
    diffSide.appendChild(ent);
  }

  const rank = document.createElement("div");
  rank.className = "go-summary__rank";
  const rankLetter = document.createElement("div");
  rankLetter.className = "go-summary__rank-letter";
  if (summary.scoreRank) {
    rankLetter.textContent = summary.scoreRank;
    rankLetter.style.cssText = scoreRankColorStyle(summary.scoreRank);
    const caption = document.createElement("div");
    caption.className = "go-summary__rank-caption";
    caption.textContent = "SCORERANK";
    rank.appendChild(rankLetter);
    rank.appendChild(caption);
  } else {
    rankLetter.textContent = "—";
    rank.classList.add("go-summary__rank--empty");
    rank.appendChild(rankLetter);
  }

  top.appendChild(diffSide);
  top.appendChild(rank);
  root.appendChild(top);

  // —— Center: score + high ——
  const scoreBlock = document.createElement("div");
  scoreBlock.className = "go-summary__score-block";

  scoreBlock.appendChild(
    makePaddedNumber(summary.score, SCORE_PAD, "go-summary__score"),
  );

  const high = document.createElement("div");
  high.className = "go-summary__high";
  const highLab = document.createElement("span");
  highLab.className = "go-summary__high-label";
  highLab.textContent = `${t("gameOver.highScore")} `;
  high.appendChild(highLab);
  high.appendChild(
    makePaddedNumber(summary.highScore, SCORE_PAD, "go-summary__high-num"),
  );
  scoreBlock.appendChild(high);

  if (summary.isNewRecord) {
    const badge = document.createElement("div");
    badge.className = "go-summary__new-record";
    badge.textContent = t("gameOver.newRecord");
    scoreBlock.appendChild(badge);
  }

  root.appendChild(scoreBlock);

  // —— Bottom: groups | combo ——
  const bottom = document.createElement("div");
  bottom.className = "go-summary__bottom";

  const groups = document.createElement("div");
  groups.className = "go-summary__groups";
  const list = groupsForSummary(summary);
  if (list.length === 0) {
    const empty = document.createElement("div");
    empty.className = "go-summary__group-row go-summary__group-row--empty";
    empty.textContent = "—";
    groups.appendChild(empty);
  } else {
    for (const g of list) {
      const row = document.createElement("div");
      row.className = "go-summary__group-row";
      const name = document.createElement("span");
      name.className = "go-summary__group-name";
      name.textContent = g;
      name.title = g;
      name.style.color = getGroupDisplayColor(g);
      // Counts stay neutral (padded white), not brand-tinted.
      const count = makePaddedNumber(
        summary.groupClears[g] ?? 0,
        GROUP_CLEAR_PAD,
        "go-summary__group-count",
      );
      row.appendChild(name);
      row.appendChild(count);
      groups.appendChild(row);
    }
  }

  const combo = document.createElement("div");
  combo.className = "go-summary__combo";
  const comboLab = document.createElement("div");
  comboLab.className = "go-summary__combo-label";
  comboLab.textContent = t("gameOver.maxCombo");
  combo.appendChild(comboLab);
  combo.appendChild(
    makePaddedNumber(summary.maxCombo, COMBO_PAD, "go-summary__combo-value"),
  );

  bottom.appendChild(groups);
  bottom.appendChild(combo);
  root.appendChild(bottom);

  return root;
};
