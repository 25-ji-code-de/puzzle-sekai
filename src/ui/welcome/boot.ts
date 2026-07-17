/**
 * Boot welcome shell: static HTML adopt, load progress, click-to-continue.
 * Layout for #boot-welcome lives in index.html (LCP). Fallback uses same classes.
 */
import { t, onLocaleChange } from "../../i18n";
import { unlockAudio } from "../../audio/bgm";
import { playMenuBgm } from "../../audio/session";
import welcomeImg from "../../assets/welcome.png";

let modalEl: HTMLDivElement | null = null;
let clickPromptEl: HTMLDivElement | null = null;
let dimOverlayEl: HTMLDivElement | null = null;
/** True once all boot assets are ready and the shell accepts a click/key. */
let welcomeReady = false;
let bootShellShown = false;
let bootLocaleListening = false;
let lastLoadProgress = 0;

/** Called after the boot shell is dismissed (audio unlocked, menu should open). */
let onBootContinue: (() => void) | null = null;

export const setOnBootContinue = (fn: () => void) => {
  onBootContinue = fn;
};

const formatLoadingPrompt = (pct: number): string =>
  `${t("loading")} ${Math.floor(pct)}%`;

const refreshBootPromptText = () => {
  if (!clickPromptEl || welcomeReady) return;
  clickPromptEl.textContent = formatLoadingPrompt(lastLoadProgress);
};

const refreshBootCopy = () => {
  if (!modalEl) return;
  const title = modalEl.querySelector(".welcome-title");
  const subtitle = modalEl.querySelector(".welcome-subtitle");
  const desc = modalEl.querySelector(".welcome-desc");
  const disc = modalEl.querySelector(".welcome-disclaimer");
  if (title) title.textContent = t("welcome.title");
  if (subtitle) subtitle.textContent = t("welcome.subtitle");
  if (desc) desc.innerHTML = t("welcome.desc");
  if (disc) {
    disc.innerHTML =
      t("welcome.disclaimer") +
      ' · <a class="welcome-disclaimer__link" href="https://github.com/25-ji-code-de/puzzle-sekai" target="_blank" rel="noopener noreferrer">GitHub</a>';
  }
  if (welcomeReady && clickPromptEl) {
    clickPromptEl.textContent = t("welcome.click");
  } else {
    refreshBootPromptText();
  }
};

/**
 * Upgrade the static HTML shell once the app bundle is running:
 * - set the welcome cover background (hashed URL from Vite)
 * - attach locale font scheme classes (CSS vars from fonts.ts)
 */
const enhanceBootShell = (shell: HTMLDivElement) => {
  shell.style.backgroundImage = `url(${welcomeImg})`;

  const title = shell.querySelector(".welcome-title") as HTMLElement | null;
  const subtitle = shell.querySelector(
    ".welcome-subtitle",
  ) as HTMLElement | null;
  const desc = shell.querySelector(".welcome-desc") as HTMLElement | null;
  title?.classList.add("font-brand");
  subtitle?.classList.add("font-brand");
  desc?.classList.add("font-body");
  clickPromptEl?.classList.add("font-action");
};

/**
 * Fallback only: recreate the shell if index.html's static node is missing.
 * Uses the same classes as index.html critical CSS (no duplicate cssText).
 */
const createBootShellFallback = (): HTMLDivElement => {
  const shell = document.createElement("div");
  shell.id = "boot-welcome";
  shell.style.backgroundImage = `url(${welcomeImg})`;

  const overlay = document.createElement("div");
  overlay.className = "boot-welcome__dim";
  shell.appendChild(overlay);

  const content = document.createElement("div");
  content.className = "welcome-card";
  content.innerHTML = `
    <h1 class="welcome-title font-brand">${t("welcome.title")}</h1>
    <div class="welcome-subtitle font-brand">${t("welcome.subtitle")}</div>
    <div class="welcome-desc font-body">${t("welcome.desc")}</div>
    <div class="welcome-click font-action">${formatLoadingPrompt(0)}</div>
    <p class="welcome-disclaimer">${t("welcome.disclaimer")} · <a class="welcome-disclaimer__link" href="https://github.com/25-ji-code-de/puzzle-sekai" target="_blank" rel="noopener noreferrer">GitHub</a></p>
  `;
  shell.appendChild(content);
  document.body.appendChild(shell);
  return shell;
};

export const showBootWelcome = () => {
  if (bootShellShown) return;
  bootShellShown = true;

  let shell = document.getElementById("boot-welcome") as HTMLDivElement | null;
  if (!shell) {
    shell = createBootShellFallback();
  }

  modalEl = shell;
  dimOverlayEl = shell.querySelector(".boot-welcome__dim");
  clickPromptEl = shell.querySelector(".welcome-click");
  enhanceBootShell(shell);
  refreshBootCopy();

  if (!bootLocaleListening) {
    bootLocaleListening = true;
    onLocaleChange(() => refreshBootCopy());
  }
};

export const setWelcomeLoadProgress = (pct: number) => {
  lastLoadProgress = Math.max(0, Math.min(100, pct));
  refreshBootPromptText();
};

export const markWelcomeReady = () => {
  welcomeReady = true;
  if (clickPromptEl) {
    clickPromptEl.textContent = t("welcome.click");
    clickPromptEl.style.animation = "promptPulse 1.8s ease-in-out infinite";
  }
  if (modalEl) {
    modalEl.style.cursor = "pointer";
  }

  const continueOnce = () => {
    if (!welcomeReady || !modalEl) return;
    welcomeReady = false;
    window.removeEventListener("keydown", onKey);
    modalEl.removeEventListener("click", onClick);

    unlockAudio();
    void playMenuBgm();

    if (dimOverlayEl) dimOverlayEl.style.opacity = "0";
    modalEl.style.opacity = "0";
    modalEl.style.transition = "opacity 0.4s ease";
    const shell = modalEl;
    setTimeout(() => {
      shell?.remove();
      modalEl = null;
      clickPromptEl = null;
      dimOverlayEl = null;
      onBootContinue?.();
    }, 400);
  };

  const onClick = () => continueOnce();
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      continueOnce();
    }
  };
  modalEl?.addEventListener("click", onClick);
  window.addEventListener("keydown", onKey);
};

/**
 * Game-state entry used by the ticker. The real shell is shown earlier via
 * {@link showBootWelcome}; this is a no-op once that has run.
 */
export const welcome = () => {
  showBootWelcome();
};
