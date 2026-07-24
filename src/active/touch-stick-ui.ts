/**
 * Floating virtual stick (DOM) — appears at finger-down, knob tracks offset.
 * Charge ring around the base fills while holding center → hard-drop when full.
 * pointer-events: none so it never steals touch from the canvas.
 */

const ROOT_ID = "touch-stick";

export type StickUi = {
  show: (clientX: number, clientY: number, radiusCssPx: number) => void;
  /** Knob offset in CSS px relative to base center (clamped by caller). */
  setKnob: (cssDx: number, cssDy: number, active: boolean) => void;
  /**
   * Hard-drop charge progress 0…1. 0 hides the ring glow; 1 = full.
   */
  setCharge: (progress: number) => void;
  hide: () => void;
  dispose: () => void;
};

const ensureRoot = (): HTMLDivElement => {
  let el = document.getElementById(ROOT_ID) as HTMLDivElement | null;
  if (el) return el;
  el = document.createElement("div");
  el.id = ROOT_ID;
  el.className = "touch-stick";
  el.setAttribute("aria-hidden", "true");
  el.innerHTML = [
    '<div class="touch-stick__base"></div>',
    '<div class="touch-stick__charge" aria-hidden="true"></div>',
    '<div class="touch-stick__knob"></div>',
  ].join("");
  document.body.appendChild(el);
  return el;
};

export const createStickUi = (): StickUi => {
  const root = ensureRoot();
  const knob = root.querySelector(".touch-stick__knob") as HTMLDivElement;
  const charge = root.querySelector(".touch-stick__charge") as HTMLDivElement;

  const hide = () => {
    root.classList.remove(
      "touch-stick--visible",
      "touch-stick--active",
      "touch-stick--charging",
      "touch-stick--charged",
    );
    knob.style.transform = "translate(-50%, -50%)";
    charge.style.setProperty("--charge-p", "0");
  };

  return {
    show: (clientX, clientY, radiusCssPx) => {
      const r = Math.max(28, radiusCssPx);
      root.style.setProperty("--stick-r", `${r}px`);
      root.style.left = `${clientX}px`;
      root.style.top = `${clientY}px`;
      root.classList.add("touch-stick--visible");
      root.classList.remove(
        "touch-stick--active",
        "touch-stick--charging",
        "touch-stick--charged",
      );
      knob.style.transform = "translate(-50%, -50%)";
      charge.style.setProperty("--charge-p", "0");
    },
    setKnob: (cssDx, cssDy, active) => {
      knob.style.transform = `translate(calc(-50% + ${cssDx}px), calc(-50% + ${cssDy}px))`;
      root.classList.toggle("touch-stick--active", active);
    },
    setCharge: (progress) => {
      const p = Math.max(0, Math.min(1, progress));
      // conic-gradient uses percent of full circle
      charge.style.setProperty("--charge-p", String(p * 100));
      root.classList.toggle("touch-stick--charging", p > 0.02 && p < 1);
      root.classList.toggle("touch-stick--charged", p >= 1);
    },
    hide,
    dispose: () => {
      hide();
    },
  };
};
