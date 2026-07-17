/**
 * Settings side panel — shell + section composition.
 * Styles: styles/_settings-panel.scss
 */
import { getCurrentSettings } from "../store";
import { t } from "../../i18n";
import type { SettingsSectionCtx } from "./widgets";
import { appendLanguageSection } from "./sections/language";
import { appendAudioSection } from "./sections/audio";
import { appendPerformanceSection } from "./sections/performance";
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
    ".settings-panel",
  ) as HTMLElement | null;
  if (settingsPanel) {
    settingsPanel.classList.add("is-closing");
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
  settingsContainer.className = "settings-root";

  const backdrop = document.createElement("div");
  backdrop.className = "settings-backdrop";
  backdrop.onclick = () => closeSettingsPanel();
  settingsContainer.appendChild(backdrop);

  const settingsPanel = document.createElement("div");
  settingsPanel.className = "settings-panel";

  const header = document.createElement("div");
  header.className = "settings-header";
  const title = document.createElement("div");
  title.className = "settings-title";
  title.textContent = t("settings.title");
  header.appendChild(title);

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "settings-close";
  closeBtn.textContent = "✕";
  closeBtn.onclick = () => closeSettingsPanel();
  header.appendChild(closeBtn);
  settingsPanel.appendChild(header);

  const ctx: SettingsSectionCtx = {
    settings,
    refresh: refreshSettingsPanel,
  };

  appendLanguageSection(settingsPanel, ctx);
  appendAudioSection(settingsPanel, ctx);
  appendPerformanceSection(settingsPanel, ctx);
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
