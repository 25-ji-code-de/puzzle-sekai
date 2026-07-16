import {
  getDifficultyLevel,
  getScoreMultiplierBreakdown,
  isEntertainmentMode,
} from "../../difficulty";
import { t } from "../../../i18n";
import { domFontStyle } from "../../../ui/fonts";
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
        `<div style="display:flex;justify-content:space-between;gap:12px;padding:3px 0;border-bottom:1px solid rgba(255,255,255,0.06);">
          <span style="color:rgba(255,255,255,0.75);">${line.label}</span>
          <span style="${domFontStyle(
            "numeric",
          )}color:#aaccff;white-space:nowrap;">×${line.factor.toFixed(2)}</span>
        </div>`,
    )
    .join("");

  const card = document.createElement("div");
  card.style.cssText = `
    position:relative;padding:12px 14px;border-radius:8px;
    background:rgba(100,200,255,0.12);border:1px solid rgba(100,200,255,0.25);
    color:#fff;font-size:15px;line-height:1.65;cursor:help;
  `;
  card.innerHTML = `
    <div><span style="${diffColorStyle(diffLevel)}">${label}</span>${
      entOn
        ? ` <span style="color:#ffcc66;">${t(
            "settings.difficulty.entertainment",
          )}</span>`
        : ""
    }</div>
    <div style="color:#aaccff;">
      <span style="${domFontStyle("numeric")}">×${mult.toFixed(2)}</span>
      <span style="font-size:13px;opacity:0.55;margin-left:6px;${domFontStyle(
        "body",
      )}">${t("settings.difficulty.info")}</span>
    </div>
  `;

  const tip = document.createElement("div");
  tip.style.cssText = `
    display:none;position:absolute;left:0;right:0;bottom:calc(100% + 8px);z-index:20;
    padding:12px 14px;border-radius:10px;
    background:rgba(12,16,32,0.97);border:1px solid rgba(100,200,255,0.35);
    box-shadow:0 8px 28px rgba(0,0,0,0.45);font-size:14px;line-height:1.5;
  `;
  tip.innerHTML = `
    <div style="font-size:13px;color:rgba(180,220,255,0.8);letter-spacing:1px;margin-bottom:8px;">${t(
      "settings.difficulty.breakdownTitle",
    )}</div>
    ${linesHtml}
    <div style="display:flex;justify-content:space-between;gap:12px;padding-top:8px;margin-top:4px;border-top:1px solid rgba(100,200,255,0.25);font-weight:600;">
      <span>${t("settings.difficulty.total")}</span>
      <span style="${domFontStyle("numeric")}color:#fff;">×${mult.toFixed(
        2,
      )}</span>
    </div>
  `;
  card.appendChild(tip);
  card.onmouseenter = () => {
    tip.style.display = "block";
  };
  card.onmouseleave = () => {
    tip.style.display = "none";
  };
  card.onclick = (e) => {
    e.stopPropagation();
    tip.style.display = tip.style.display === "block" ? "none" : "block";
  };

  summary.appendChild(card);
  panel.appendChild(summary);
};
