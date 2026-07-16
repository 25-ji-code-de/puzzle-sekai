/**
 * Shared modal primitives used by pause / game-over / overlays.
 * Styles live in styles/_dialog.scss — assign classes only.
 */
export type DialogButtonVariant = "primary" | "neutral" | "danger";

export const buildDialogButton = (
  label: string,
  variant: DialogButtonVariant,
  onClick: () => void,
): HTMLButtonElement => {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = `ui-btn ui-btn--${variant}`;
  btn.textContent = label;
  btn.onclick = onClick;
  return btn;
};

/** Centered dialog shell (backdrop + card). */
export const buildDialogShell = (opts: {
  id: string;
  title: string;
  backdropAlpha?: number;
  wide?: boolean;
}): { overlay: HTMLDivElement; card: HTMLDivElement; title: HTMLDivElement } => {
  const overlay = document.createElement("div");
  overlay.id = opts.id;
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.className =
    opts.backdropAlpha !== undefined && opts.backdropAlpha >= 0.75
      ? "ui-overlay ui-overlay--dim"
      : "ui-overlay";
  // Dynamic dim strength when not default
  if (opts.backdropAlpha !== undefined && opts.backdropAlpha < 0.75) {
    overlay.style.background = `rgba(0,0,0,${opts.backdropAlpha})`;
  }

  const card = document.createElement("div");
  card.className = opts.wide ? "ui-dialog ui-dialog--wide" : "ui-dialog";

  const title = document.createElement("div");
  title.className = "ui-dialog__title";
  title.textContent = opts.title;
  card.appendChild(title);
  overlay.appendChild(card);
  return { overlay, card, title };
};
