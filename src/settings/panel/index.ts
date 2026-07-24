/**
 * Settings side panel — shell + section composition.
 * Styles: styles/_settings-panel.scss
 */
import {
  prefersReducedMotion,
  trapFocus,
  type FocusTrapHandle,
} from "../../a11y";
import { getUserSettings } from "../store";
import { t } from "../../i18n";
import type { SettingsSectionCtx } from "./widgets";
import { appendLanguageSection } from "./sections/language";
import { appendAudioSection } from "./sections/audio";
import { appendPerformanceSection } from "./sections/performance";
import { appendDisplaySection } from "./sections/display";
import { appendTouchControlSection } from "./sections/touch-controls";
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
import { appendReplaySection } from "./sections/replays";
import { appendDataSection } from "./sections/data";

export interface SettingsPanelOptions {
  /** Called after the panel finishes its close animation and is removed. */
  onClosed?: () => void;
}

let settingsContainer: HTMLDivElement | null = null;
let onClosedCallback: (() => void) | null = null;
let focusTrap: FocusTrapHandle | null = null;

const PANEL_CLOSE_MS = 300;
const PANEL_CLOSE_MS_REDUCED = 0;

/** Immediately tear down the panel (no animation). Used on locale rebuild. */
export const disposeSettingsPanel = () => {
  focusTrap?.release({ restore: false });
  focusTrap = null;
  settingsContainer?.remove();
  settingsContainer = null;
  onClosedCallback = null;
};

export const closeSettingsPanel = () => {
  if (!settingsContainer) return;

  const settingsPanel = settingsContainer.querySelector(
    ".settings-panel",
  ) as HTMLElement | null;
  const delay = prefersReducedMotion()
    ? PANEL_CLOSE_MS_REDUCED
    : PANEL_CLOSE_MS;
  if (settingsPanel && delay > 0) {
    settingsPanel.classList.add("is-closing");
  }
  focusTrap?.release();
  focusTrap = null;
  setTimeout(() => {
    settingsContainer?.remove();
    settingsContainer = null;
    const cb = onClosedCallback;
    onClosedCallback = null;
    cb?.();
  }, delay);
};

const refreshSettingsPanel = () => {
  if (!settingsContainer) return;
  const opts: SettingsPanelOptions = {
    onClosed: onClosedCallback ?? undefined,
  };
  focusTrap?.release({ restore: false });
  focusTrap = null;
  settingsContainer.remove();
  settingsContainer = null;
  onClosedCallback = opts.onClosed ?? null;
  showSettingsPanel(opts);
};

export const showSettingsPanel = (options: SettingsPanelOptions = {}) => {
  if (settingsContainer) return;

  onClosedCallback = options.onClosed ?? null;
  const settings = getUserSettings();

  settingsContainer = document.createElement("div");
  settingsContainer.className = "settings-root";
  settingsContainer.setAttribute("role", "dialog");
  settingsContainer.setAttribute("aria-modal", "true");

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
  title.id = "settings-panel-title";
  title.textContent = t("settings.title");
  settingsContainer.setAttribute("aria-labelledby", title.id);
  header.appendChild(title);

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "settings-close";
  closeBtn.setAttribute("aria-label", t("controls.close"));
  closeBtn.textContent = "✕";
  closeBtn.onclick = () => closeSettingsPanel();
  header.appendChild(closeBtn);
  settingsPanel.appendChild(header);

  const ctx: SettingsSectionCtx = {
    settings,
    refresh: refreshSettingsPanel,
    close: closeSettingsPanel,
  };

  appendLanguageSection(settingsPanel, ctx);
  appendAudioSection(settingsPanel, ctx);
  appendPerformanceSection(settingsPanel, ctx);
  appendDisplaySection(settingsPanel, ctx);
  appendTouchControlSection(settingsPanel, ctx);
  appendSpeedSection(settingsPanel, ctx);
  appendTimeAttackSection(settingsPanel, ctx);
  appendGroupsSection(settingsPanel, ctx);
  appendItemDropSection(settingsPanel, ctx);
  appendOrientationSection(settingsPanel, ctx);
  appendFunModesSection(settingsPanel, ctx);
  appendDifficultySection(settingsPanel, ctx);
  appendReplaySection(settingsPanel, ctx);
  appendDataSection(settingsPanel);

  settingsContainer.appendChild(settingsPanel);
  document.body.appendChild(settingsContainer);
  focusTrap = trapFocus(settingsContainer, {
    initialFocus: closeBtn,
    onEscape: () => closeSettingsPanel(),
  });
};
