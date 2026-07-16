/**
 * Game-over choice overlay. Shown after the curtain finishes; offers
 * Restart (same mode, re-seed board) / Quit to menu. Replaces the old
 * "tap anywhere to restart" behaviour.
 */
import { t } from "./i18n";
import { domFontStyle } from "./fonts";
import { start, returnToMenu } from "./states";

const GAME_OVER_OVERLAY_ID = "game-over-overlay";

let overlay: HTMLDivElement | null = null;

export const isGameOverMenuOpen = (): boolean => !!overlay;

/** Hard remove overlay (locale rebuild / teardown / start / returnToMenu). */
export const disposeGameOverMenu = (): void => {
  overlay?.remove();
  overlay = null;
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

export const showGameOverMenu = (): void => {
  // Already open — no-op.
  if (overlay) return;
  document.getElementById(GAME_OVER_OVERLAY_ID)?.remove();

  overlay = document.createElement("div");
  overlay.id = GAME_OVER_OVERLAY_ID;
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.style.cssText = `
    position:fixed;top:0;right:0;bottom:0;left:0;z-index:10001;
    display:flex;align-items:center;justify-content:center;
    background:rgba(0,0,0,0.55);backdrop-filter:blur(3px);
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
  title.textContent = t("gameOver.title");
  card.appendChild(title);

  const restart = () => {
    disposeGameOverMenu();
    start(); // full re-init; resets timer/score/sprites, keeps current mode
  };
  const quit = () => {
    disposeGameOverMenu();
    returnToMenu();
  };

  card.appendChild(buildButton(t("gameOver.restart"), "primary", restart));
  card.appendChild(buildButton(t("gameOver.menu"), "danger", quit));

  overlay.appendChild(card);
  // Backdrop is non-interactive on purpose — no "tap to restart".
  document.body.appendChild(overlay);
};
