/**
 * Settings side panel — shell + section composition.
 */
import { getCurrentSettings } from "../store";
import { t } from "../../i18n";
import { domFontStyle } from "../../ui/fonts";
import { SETTINGS_PANEL_CSS } from "./styles";
import type { SettingsSectionCtx } from "./widgets";
import { appendLanguageSection } from "./sections/language";
import { appendAudioSection } from "./sections/audio";
import {
  appendSpeedSection,
  appendTimeAttackSection,
} from "./sections/speed-time";
import { appendGroupsSection } from "./sections/groups";
import {
  appendItemDropSection,
  appendOrientationSection,
} from "./sections/items-orientation";
import { appendFunModesSection } from "./sections/fun-modes";
import { appendDifficultySection } from "./sections/difficulty";
import { appendDataSection } from "./sections/data";

export interface SettingsPanelOptions {
  /** Called after the panel finishes its close animation and is removed. */
  onClosed?: () => void;
}

let settingsContainer: HTMLDivElement | null = null;
let onClosedCallback: (() => void) | null = null;

/** Immediately tear down the panel (no animation). Used on locale rebuild. */
export const disposeSettingsPanel = () => {
  settingsContainer?.remove();
  settingsContainer = null;
  onClosedCallback = null;
};

export const closeSettingsPanel = () => {
  if (!settingsContainer) return;

  const settingsPanel = settingsContainer.querySelector(
    "div:nth-child(2)",
  ) as HTMLElement | null;
  if (settingsPanel) {
    settingsPanel.style.animation = "slideOut 0.3s ease forwards";
  }
  setTimeout(() => {
    settingsContainer?.remove();
    settingsContainer = null;
    const cb = onClosedCallback;
    onClosedCallback = null;
    cb?.();
  }, 300);
};

const refreshSettingsPanel = () => {
  if (!settingsContainer) return;
  const opts: SettingsPanelOptions = {
    onClosed: onClosedCallback ?? undefined,
  };
  settingsContainer.remove();
  settingsContainer = null;
  onClosedCallback = opts.onClosed ?? null;
  showSettingsPanel(opts);
};

export const showSettingsPanel = (options: SettingsPanelOptions = {}) => {
  if (settingsContainer) return;

  onClosedCallback = options.onClosed ?? null;
  const settings = getCurrentSettings();

  settingsContainer = document.createElement("div");
  settingsContainer.style.cssText = `
    position:fixed;top:0;left:0;width:100%;height:100%;z-index:10000;
    display:flex;justify-content:flex-end;
  `;

  const backdrop = document.createElement("div");
  backdrop.style.cssText = `
    position:absolute;top:0;left:0;width:100%;height:100%;
    background:rgba(0,0,0,0.5);
  `;
  backdrop.onclick = () => closeSettingsPanel();
  settingsContainer.appendChild(backdrop);

  const settingsPanel = document.createElement("div");
  settingsPanel.style.cssText = `
    position:relative;width:320px;height:100%;
    background:rgba(15,20,40,0.95);border-left:1px solid rgba(100,200,255,0.2);
    box-shadow:-10px 0 40px rgba(0,0,0,0.5);
    padding:24px;overflow-y:auto;
    animation:slideIn 0.3s ease;
  `;

  const style = document.createElement("style");
  style.textContent = SETTINGS_PANEL_CSS;
  settingsPanel.appendChild(style);

  const header = document.createElement("div");
  header.style.cssText = `
    display:flex;justify-content:space-between;align-items:center;
    margin-bottom:24px;padding-bottom:16px;
    border-bottom:1px solid rgba(100,200,255,0.1);
  `;
  header.innerHTML = `
    <div style="font-size:20px;color:#fff;letter-spacing:1px;${domFontStyle(
      "heading",
    )}">${t("settings.title")}</div>
  `;

  const closeBtn = document.createElement("button");
  closeBtn.style.cssText = `
    width:32px;height:32px;border:none;border-radius:6px;
    background:rgba(255,255,255,0.1);color:#fff;font-size:18px;
    cursor:pointer;transition:all 0.2s ease;
  `;
  closeBtn.textContent = "✕";
  closeBtn.onmouseenter = () =>
    (closeBtn.style.background = "rgba(255,255,255,0.2)");
  closeBtn.onmouseleave = () =>
    (closeBtn.style.background = "rgba(255,255,255,0.1)");
  closeBtn.onclick = () => closeSettingsPanel();
  header.appendChild(closeBtn);
  settingsPanel.appendChild(header);

  const ctx: SettingsSectionCtx = {
    settings,
    refresh: refreshSettingsPanel,
  };

  appendLanguageSection(settingsPanel, ctx);
  appendAudioSection(settingsPanel, ctx);
  appendSpeedSection(settingsPanel, ctx);
  appendTimeAttackSection(settingsPanel, ctx);
  appendGroupsSection(settingsPanel, ctx);
  appendItemDropSection(settingsPanel, ctx);
  appendOrientationSection(settingsPanel, ctx);
  appendFunModesSection(settingsPanel, ctx);
  appendDifficultySection(settingsPanel, ctx);
  appendDataSection(settingsPanel);

  settingsContainer.appendChild(settingsPanel);
  document.body.appendChild(settingsContainer);
};
