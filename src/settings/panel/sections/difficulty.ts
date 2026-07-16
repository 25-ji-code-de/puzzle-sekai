import {
  getDifficultyLevel,
  getScoreMultiplierBreakdown,
  isEntertainmentMode,
} from "../../difficulty";
import { t } from "../../../i18n";
import { diffColorStyle } from "../../../ui/menu-utils";
import { makeSettingGroup, type SettingsSectionCtx } from "../widgets";

export const appendDifficultySection = (
  panel: HTMLElement,
  ctx: SettingsSectionCtx,
): void => {
  const { settings } = ctx;
  const summary = makeSettingGroup(t("settings.difficulty.label"));
  const breakdown = getScoreMultiplierBreakdown(settings);
  const mult = breakdown.final;
  const label = breakdown.difficultyLabel;
  const diffLevel = getDifficultyLevel(settings);
  const entOn = isEntertainmentMode(settings);

  const linesHtml = breakdown.lines
    .map(
      (line) =>
        `<div class="diff-line">
          <span>${line.label}</span>
          <span class="diff-line__factor">×${line.factor.toFixed(2)}</span>
        </div>`,
    )
    .join("");

  const card = document.createElement("div");
  card.className = "diff-card";
  card.innerHTML = `
    <div><span style="${diffColorStyle(diffLevel)}">${label}</span>${
      entOn
        ? ` <span class="diff-ent">${t("settings.difficulty.entertainment")}</span>`
        : ""
    }</div>
    <div class="diff-mult">
      <span class="font-numeric">×${mult.toFixed(2)}</span>
      <span class="diff-info">${t("settings.difficulty.info")}</span>
    </div>
  `;

  const tip = document.createElement("div");
  tip.className = "diff-card__tip";
  tip.innerHTML = `
    <div class="diff-tip-title">${t("settings.difficulty.breakdownTitle")}</div>
    ${linesHtml}
    <div class="diff-total">
      <span>${t("settings.difficulty.total")}</span>
      <span class="font-numeric">×${mult.toFixed(2)}</span>
    </div>
  `;
  card.appendChild(tip);
  const openTip = () => tip.classList.add("is-open");
  const closeTip = () => tip.classList.remove("is-open");
  card.onmouseenter = openTip;
  card.onmouseleave = closeTip;
  card.onclick = (e) => {
    e.stopPropagation();
    tip.classList.toggle("is-open");
  };

  summary.appendChild(card);
  panel.appendChild(summary);
};
