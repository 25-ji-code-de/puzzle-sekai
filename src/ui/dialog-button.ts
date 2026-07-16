/**
 * Shared modal primitives used by pause / game-over menus.
 */
import { domFontStyle } from "./fonts";

export type DialogButtonVariant = "primary" | "neutral" | "danger";

const TONES: Record<DialogButtonVariant, string> = {
  primary:
    "background:rgba(100,200,255,0.18);border:1px solid rgba(100,200,255,0.45);color:rgba(220,240,255,0.95);",
  neutral:
    "background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.3);color:rgba(255,255,255,0.85);",
  danger:
    "background:rgba(255,80,100,0.14);border:1px solid rgba(255,100,120,0.4);color:rgba(255,200,210,0.95);",
};

export const buildDialogButton = (
  label: string,
  variant: DialogButtonVariant,
  onClick: () => void,
): HTMLButtonElement => {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.style.cssText = `
    width:100%;padding:13px 16px;border-radius:8px;cursor:pointer;
    transition:all 0.2s ease;${domFontStyle("action")}
    ${TONES[variant]}
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

/** Centered dialog shell (backdrop + card). */
export const buildDialogShell = (opts: {
  id: string;
  title: string;
  backdropAlpha?: number;
}): { overlay: HTMLDivElement; card: HTMLDivElement } => {
  const overlay = document.createElement("div");
  overlay.id = opts.id;
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  const alpha = opts.backdropAlpha ?? 0.7;
  overlay.style.cssText = `
    position:fixed;top:0;right:0;bottom:0;left:0;z-index:10001;
    display:flex;align-items:center;justify-content:center;
    background:rgba(0,0,0,${alpha});backdrop-filter:blur(4px);
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
  title.textContent = opts.title;
  card.appendChild(title);
  overlay.appendChild(card);
  return { overlay, card };
};
