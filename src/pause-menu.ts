/**
 * Pause overlay shown during gameplay. Reuses the portrait pause machinery
 * (`pausePlay`/`resumePlay`) and offers Continue / Restart / Quit to menu.
 */
import { t } from "./i18n";
import { domFontStyle } from "./fonts";
import {
  pausePlay,
  resumePlay,
  start,
  returnToMenu,
  isPlayActive,
} from "./states";
import { isPortrait } from "./display";

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
  pauseBtn.style.cssText = `
    position:fixed;top:max(12px, env(safe-area-inset-top, 0px));left:12px;
    z-index:9000;width:44px;height:44px;border-radius:10px;
    border:1px solid rgba(255,255,255,0.25);
    background:rgba(0,0,0,0.4);color:rgba(255,255,255,0.85);
    display:flex;align-items:center;justify-content:center;cursor:pointer;
    pointer-events:auto;backdrop-filter:blur(4px);transition:filter 0.2s ease;
    ${domFontStyle("body")}
  `;
  pauseBtn.innerHTML = `<span style="font-size:16px;letter-spacing:1px;line-height:1;">‖</span>`;
  pauseBtn.title = t("pause.button");
  pauseBtn.onmouseenter = () => (pauseBtn!.style.filter = "brightness(1.3)");
  pauseBtn.onmouseleave = () => (pauseBtn!.style.filter = "none");
  pauseBtn.onclick = () => togglePauseMenu();

  // Update aria/tooltip if locale changes after creation.
  // (The label glyph ‖ is locale-independent.)
  document.body.appendChild(pauseBtn);
};

export const hidePauseButton = (): void => {
  pauseBtn?.remove();
  pauseBtn = null;
};

const buildButton = (
  label: string,
  variant: "primary" | "neutral" | "danger",
  onClick: () => void,
): HTMLButtonElement => {
  const btn = document.createElement("button");
  btn.type = "button";
  const tones = {
    primary:
      "background:rgba(100,200,255,0.18);border:1px solid rgba(100,200,255,0.45);color:rgba(220,240,255,0.95);",
    neutral:
      "background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.3);color:rgba(255,255,255,0.85);",
    danger:
      "background:rgba(255,80,100,0.14);border:1px solid rgba(255,100,120,0.4);color:rgba(255,200,210,0.95);",
  }[variant];
  btn.style.cssText = `
    width:100%;padding:13px 16px;border-radius:8px;cursor:pointer;
    transition:all 0.2s ease;${domFontStyle("action")}
    ${tones}
  `;
  btn.textContent = label;
  btn.onmouseenter = () => {
    btn.style.filter = "brightness(1.25)";
  };
  btn.onmouseleave = () => {
    btn.style.filter = "none";
  };
  btn.onclick = onClick;
  return btn;
};

export const showPauseMenu = (): void => {
  // No-op during a portrait rotate freeze (rotate prompt is on top, z 20000),
  // or if no match is active, or if already open.
  if (!isPlayActive() || isPortrait() || overlay) return;

  // Already-showing path: prevent duplicate.
  document.getElementById(PAUSE_OVERLAY_ID)?.remove();
  overlay = document.createElement("div");
  overlay.id = PAUSE_OVERLAY_ID;
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.style.cssText = `
    position:fixed;inset:0;z-index:10001;
    display:flex;align-items:center;justify-content:center;
    background:rgba(0,0,0,0.7);backdrop-filter:blur(4px);
    animation:fadeIn 0.2s ease;
  `;

  const card = document.createElement("div");
  card.style.cssText = `
    background:rgba(20,25,50,0.95);border:1px solid rgba(100,200,255,0.3);
    border-radius:16px;padding:28px 32px;min-width:240px;max-width:320px;width:86%;
    box-shadow:0 20px 60px rgba(0,0,0,0.5);
    display:flex;flex-direction:column;gap:12px;pointer-events:auto;
  `;

  const title = document.createElement("div");
  title.style.cssText = `
    font-size:22px;color:#fff;text-align:center;margin-bottom:6px;letter-spacing:2px;
    ${domFontStyle("heading")}
  `;
  title.textContent = t("pause.title");
  card.appendChild(title);

  const resume = () => {
    hidePauseMenu();
    resumePlay();
  };
  const restart = () => {
    hidePauseMenu();
    start(); // full re-init; resets timer/score/sprites
  };
  const quit = () => {
    hidePauseMenu();
    returnToMenu();
  };

  card.appendChild(buildButton(t("pause.resume"), "primary", resume));
  card.appendChild(buildButton(t("pause.restart"), "neutral", restart));
  card.appendChild(buildButton(t("pause.menu"), "danger", quit));

  overlay.appendChild(card);
  overlay.onclick = (e) => {
    // Clicking the backdrop resumes (外出しで戻る convenience).
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
  pausePlay(); // freeze ticker / BGM / timer first
  showPauseMenu();
};
