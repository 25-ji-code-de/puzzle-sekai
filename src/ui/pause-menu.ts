/**
 * Pause overlay shown during gameplay. Reuses the portrait pause machinery
 * (`pausePlay`/`resumePlay`) and offers Continue / Restart / Quit to menu.
 */
import { t } from "../i18n";
import {
  pausePlay,
  resumePlay,
  start,
  returnToMenu,
  isPlayActive,
} from "../application/play-session";
import { isPortrait } from "./display";
import { buildDialogButton, buildDialogShell } from "./dialog-button";

const PAUSE_OVERLAY_ID = "pause-overlay";
const PAUSE_BTN_ID = "pause-button";

let overlay: HTMLDivElement | null = null;
let pauseBtn: HTMLButtonElement | null = null;

export const isPauseMenuOpen = (): boolean => !!overlay;

/** Hard remove overlay (locale rebuild / teardown / returnToMenu). */
export const disposePauseMenu = (): void => {
  overlay?.remove();
  overlay = null;
};

/** Fixed on-screen pause button, shown while a match runs. */
export const showPauseButton = (): void => {
  if (pauseBtn) return;
  pauseBtn = document.createElement("button");
  pauseBtn.type = "button";
  pauseBtn.id = PAUSE_BTN_ID;
  pauseBtn.className = "pause-fab";
  pauseBtn.setAttribute("aria-label", t("pause.button"));
  pauseBtn.title = t("pause.button");
  pauseBtn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <rect x="3" y="2" width="3.5" height="12" rx="1.2" fill="currentColor"/>
      <rect x="9.5" y="2" width="3.5" height="12" rx="1.2" fill="currentColor"/>
    </svg>
  `;
  pauseBtn.onclick = () => togglePauseMenu();
  document.body.appendChild(pauseBtn);
};

export const hidePauseButton = (): void => {
  pauseBtn?.remove();
  pauseBtn = null;
};

export const showPauseMenu = (): void => {
  if (!isPlayActive() || isPortrait() || overlay) return;

  document.getElementById(PAUSE_OVERLAY_ID)?.remove();
  const shell = buildDialogShell({
    id: PAUSE_OVERLAY_ID,
    title: t("pause.title"),
    backdropAlpha: 0.7,
  });
  overlay = shell.overlay;
  const { card } = shell;

  const resume = () => {
    hidePauseMenu();
    resumePlay();
  };
  const restart = () => {
    hidePauseMenu();
    start();
  };
  const quit = () => {
    hidePauseMenu();
    returnToMenu();
  };

  card.appendChild(buildDialogButton(t("pause.resume"), "primary", resume));
  card.appendChild(buildDialogButton(t("pause.restart"), "neutral", restart));
  card.appendChild(buildDialogButton(t("pause.menu"), "danger", quit));

  overlay.onclick = (e) => {
    if (e.target === overlay) resume();
  };
  document.body.appendChild(overlay);
};

export const hidePauseMenu = (): void => {
  overlay?.remove();
  overlay = null;
};

/** Toggle pause from a hotkey (Esc / P). Only toggles when a match is active. */
export const togglePauseMenu = (): void => {
  if (!isPlayActive() || isPortrait()) return;
  if (overlay) {
    hidePauseMenu();
    resumePlay();
    return;
  }
  pausePlay();
  showPauseMenu();
};
