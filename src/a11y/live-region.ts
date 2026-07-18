/**
 * DOM live regions for screen-reader status (score / phase / timer).
 * Canvas remains visual-only; this is the non-visual status channel.
 *
 * Two regions:
 *  - polite  — score/combo and routine updates (queued, not interrupting)
 *  - assertive — phase changes (pause, game over, time critical)
 */

const POLITE_ID = "a11y-live-polite";
const ASSERTIVE_ID = "a11y-live-assertive";

let politeEl: HTMLDivElement | null = null;
let assertiveEl: HTMLDivElement | null = null;

const ensureRegion = (
  id: string,
  politeness: "polite" | "assertive",
): HTMLDivElement => {
  let el = document.getElementById(id) as HTMLDivElement | null;
  if (el) return el;
  el = document.createElement("div");
  el.id = id;
  el.setAttribute("role", "status");
  el.setAttribute("aria-live", politeness);
  el.setAttribute("aria-atomic", "true");
  // Visually hidden but available to AT (not display:none).
  el.style.cssText = [
    "position:absolute",
    "width:1px",
    "height:1px",
    "padding:0",
    "margin:-1px",
    "overflow:hidden",
    "clip:rect(0,0,0,0)",
    "white-space:nowrap",
    "border:0",
  ].join(";");
  document.body.appendChild(el);
  return el;
};

/** Create (or reuse) the live regions. Idempotent; safe on every boot. */
export const ensureLiveRegions = (): void => {
  if (typeof document === "undefined") return;
  politeEl = ensureRegion(POLITE_ID, "polite");
  assertiveEl = ensureRegion(ASSERTIVE_ID, "assertive");
};

const write = (el: HTMLDivElement | null, text: string): void => {
  if (!el) return;
  const msg = text.trim();
  if (!msg) return;
  // Clear then set so identical consecutive strings still fire on some AT.
  el.textContent = "";
  // Double rAF: give the clear a chance to flush before the new text.
  const set = () => {
    if (el.isConnected) el.textContent = msg;
  };
  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(() => requestAnimationFrame(set));
  } else {
    window.setTimeout(set, 0);
  }
};

export type AnnounceOptions = {
  /** Default polite. Use assertive for phase / time-critical. */
  politeness?: "polite" | "assertive";
};

/** Speak `text` via the matching live region. */
export const announce = (text: string, opts: AnnounceOptions = {}): void => {
  ensureLiveRegions();
  const polite = opts.politeness !== "assertive";
  write(polite ? politeEl : assertiveEl, text);
};

/** Tear down (tests / full page teardown). */
export const disposeLiveRegions = (): void => {
  politeEl?.remove();
  assertiveEl?.remove();
  politeEl = null;
  assertiveEl = null;
};
