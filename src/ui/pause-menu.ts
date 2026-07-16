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
} from "../game/states";
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
  pauseBtn.setAttribute("aria-label", t("pause.button"));
  pauseBtn.title = t("pause.button");
  pauseBtn.style.cssText = `
    position:fixed;top:max(14px, env(safe-area-inset-top, 0px));left:14px;
    z-index:9000;width:42px;height:42px;border-radius:50%;
    border:1px solid rgba(100,200,255,0.35);
    background:linear-gradient(160deg, rgba(30,40,70,0.72), rgba(10,14,30,0.78));
    color:rgba(220,240,255,0.95);
    display:flex;align-items:center;justify-content:center;cursor:pointer;
    pointer-events:auto;
    backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);
    box-shadow:0 4px 16px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.12);
    transition:transform 0.15s ease, box-shadow 0.2s ease, border-color 0.2s ease, background 0.2s ease;
    padding:0;outline:none;
  `;
  pauseBtn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false"
      style="display:block;pointer-events:none;">
      <rect x="3" y="2" width="3.5" height="12" rx="1.2" fill="currentColor"/>
      <rect x="9.5" y="2" width="3.5" height="12" rx="1.2" fill="currentColor"/>
    </svg>
  `;
  pauseBtn.onmouseenter = () => {
    pauseBtn!.style.transform = "scale(1.08)";
    pauseBtn!.style.borderColor = "rgba(100,200,255,0.65)";
    pauseBtn!.style.boxShadow =
      "0 6px 20px rgba(0,0,0,0.4), 0 0 14px rgba(100,200,255,0.25), inset 0 1px 0 rgba(255,255,255,0.18)";
  };
  pauseBtn.onmouseleave = () => {
    pauseBtn!.style.transform = "scale(1)";
    pauseBtn!.style.borderColor = "rgba(100,200,255,0.35)";
    pauseBtn!.style.boxShadow =
      "0 4px 16px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.12)";
  };
  pauseBtn.onmousedown = () => {
    pauseBtn!.style.transform = "scale(0.94)";
  };
  pauseBtn.onmouseup = () => {
    pauseBtn!.style.transform = "scale(1.08)";
  };
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
