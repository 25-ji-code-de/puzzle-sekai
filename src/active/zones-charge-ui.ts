/**
 * Zones hard-drop charge — Cytus II click-note style:
 * fixed inner hit ring + outer scan ring that shrinks inward as charge fills.
 * When rings meet → ready / hard-drop. No stick pad.
 */

const ROOT_ID = "zones-charge";

export type ZonesChargeUi = {
  show: (clientX: number, clientY: number, radiusCssPx: number) => void;
  setProgress: (progress: number) => void;
  hide: () => void;
  dispose: () => void;
};

const ensureRoot = (): HTMLDivElement => {
  let el = document.getElementById(ROOT_ID) as HTMLDivElement | null;
  if (el) return el;
  el = document.createElement("div");
  el.id = ROOT_ID;
  el.className = "zones-charge";
  el.setAttribute("aria-hidden", "true");
  // Structure mirrors Cytus click notes:
  //  - outer: shrinking approach ring
  //  - inner: fixed perfect-timing ring
  //  - fill: soft disc (very light)
  //  - cross: thin aim marks
  el.innerHTML = [
    '<div class="zones-charge__outer"></div>',
    '<div class="zones-charge__inner"></div>',
    '<div class="zones-charge__fill"></div>',
    '<div class="zones-charge__cross zones-charge__cross--h"></div>',
    '<div class="zones-charge__cross zones-charge__cross--v"></div>',
  ].join("");
  document.body.appendChild(el);
  return el;
};

export const createZonesChargeUi = (): ZonesChargeUi => {
  const root = ensureRoot();
  const outer = root.querySelector(".zones-charge__outer") as HTMLDivElement;

  const hide = () => {
    root.classList.remove(
      "zones-charge--visible",
      "zones-charge--charging",
      "zones-charge--ready",
    );
    outer.style.setProperty("--outer-scale", "1.75");
  };

  return {
    show: (clientX, clientY, radiusCssPx) => {
      // Inner ring diameter ≈ note size; keep modest so it doesn't cover the board.
      const r = Math.max(18, Math.min(32, radiusCssPx));
      root.style.setProperty("--zc-r", `${r}px`);
      root.style.left = `${clientX}px`;
      root.style.top = `${clientY}px`;
      root.classList.add("zones-charge--visible");
      root.classList.remove("zones-charge--charging", "zones-charge--ready");
      // Start large (approach from outside), shrink toward 1.0 as charge fills.
      outer.style.setProperty("--outer-scale", "1.75");
    },
    setProgress: (progress) => {
      const p = Math.max(0, Math.min(1, progress));
      // Ease slightly so late charge still reads clearly.
      const t = p * p * (3 - 2 * p); // smoothstep
      // 1.75 → 1.0 as p: 0 → 1 (outer meets inner at full charge).
      const scale = 1.75 - 0.75 * t;
      outer.style.setProperty("--outer-scale", String(scale));
      root.classList.toggle("zones-charge--charging", p > 0.02 && p < 1);
      root.classList.toggle("zones-charge--ready", p >= 1);
    },
    hide,
    dispose: () => {
      hide();
    },
  };
};
