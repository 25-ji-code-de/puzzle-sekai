/**
 * Boot welcome shell: static HTML adopt, load progress, click-to-continue.
 */
import { t, onLocaleChange } from "../../i18n";
import { domFontStyle } from "../fonts";
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
  if (title) title.innerHTML = t("welcome.title");
  if (subtitle) subtitle.innerHTML = t("welcome.subtitle");
  if (desc) desc.innerHTML = t("welcome.desc");
  if (welcomeReady && clickPromptEl) {
    clickPromptEl.textContent = t("welcome.click");
  } else {
    refreshBootPromptText();
  }
};

/**
 * Upgrade the static HTML shell once the app bundle is running:
 * - set the welcome cover background (hashed URL from Vite)
 * - switch typography to the locale-aware CSS variable stacks
 */
const enhanceBootShell = (shell: HTMLDivElement) => {
  shell.style.backgroundImage = `url(${welcomeImg})`;

  const title = shell.querySelector(".welcome-title") as HTMLElement | null;
  const subtitle = shell.querySelector(
    ".welcome-subtitle",
  ) as HTMLElement | null;
  const desc = shell.querySelector(".welcome-desc") as HTMLElement | null;
  if (title) title.style.cssText += domFontStyle("brand");
  if (subtitle) subtitle.style.cssText += domFontStyle("brand");
  if (desc) desc.style.cssText += domFontStyle("body");
  if (clickPromptEl) clickPromptEl.style.cssText += domFontStyle("action");
};

/**
 * Fallback only: recreate the shell if index.html's static node is missing
 * (e.g. unexpected document, tests). Prefer the HTML shell for LCP.
 */
const createBootShellFallback = (): HTMLDivElement => {
  const shell = document.createElement("div");
  shell.id = "boot-welcome";
  shell.style.cssText = `
    position:fixed;top:0;right:0;bottom:0;left:0;z-index:9999;cursor:default;
    display:flex;align-items:center;justify-content:center;
    background-color:#0a0a12;
    background-image:url(${welcomeImg});
    background-position:center;background-size:cover;background-repeat:no-repeat;
  `;

  const overlay = document.createElement("div");
  overlay.className = "boot-welcome__dim";
  overlay.style.cssText = `
    position:absolute;top:0;right:0;bottom:0;left:0;background:rgba(0,0,0,0.55);transition:opacity 0.3s ease;
  `;
  shell.appendChild(overlay);

  const content = document.createElement("div");
  content.className = "welcome-card";
  content.style.cssText = `
    position:relative;z-index:1;text-align:center;
    padding:40px 60px;border-radius:16px;
    background:rgba(0,0,0,0.45);border:2px solid rgba(180,220,255,0.35);
    backdrop-filter:blur(6px);
    box-shadow:0 8px 40px rgba(0,0,0,0.6),0 0 60px rgba(100,200,255,0.08) inset;
  `;
  content.innerHTML = `
    <div class="welcome-title" style="font-size:42px;color:#fff;letter-spacing:3px;
      text-shadow:0 2px 12px rgba(100,200,255,0.4);margin:0 0 24px;
      ${domFontStyle("brand")}">
      ${t("welcome.title")}
    </div>
    <div class="welcome-subtitle" style="font-size:17px;color:rgba(180,220,255,0.7);letter-spacing:4px;margin:0 0 24px;${domFontStyle(
      "brand",
    )}">
      ${t("welcome.subtitle")}
    </div>
    <div class="welcome-desc" style="font-size:16px;color:rgba(255,255,255,0.6);line-height:1.85;margin:0 0 24px;${domFontStyle(
      "body",
    )}">
      ${t("welcome.desc")}
    </div>
    <div class="welcome-click" style="font-size:20px;color:rgba(255,255,255,0.85);
      letter-spacing:0.14em;margin-top:24px;${domFontStyle("action")}">
      ${formatLoadingPrompt(0)}
    </div>
  `;
  shell.appendChild(content);
  document.body.appendChild(shell);
  return shell;
};

/**
 * Adopt the static `#boot-welcome` shell from index.html (already painted for
 * LCP). Only creates a fallback DOM tree if that node is missing.
 * Progress lives in the click prompt until {@link markWelcomeReady}.
 */
export const showBootWelcome = () => {
  if (bootShellShown) return;
  bootShellShown = true;

  const existing = document.getElementById(
    "boot-welcome",
  ) as HTMLDivElement | null;
  modalEl = existing ?? createBootShellFallback();
  dimOverlayEl = modalEl.querySelector(
    ".boot-welcome__dim",
  ) as HTMLDivElement | null;
  clickPromptEl = modalEl.querySelector(
    ".welcome-click",
  ) as HTMLDivElement | null;

  if (existing) {
    enhanceBootShell(existing);
    refreshBootCopy();
  }

  if (!bootLocaleListening) {
    bootLocaleListening = true;
    onLocaleChange(() => {
      if (!modalEl) return;
      refreshBootCopy();
    });
  }
};

/** Update the boot-shell prompt with loader progress (0–100). */
export const setWelcomeLoadProgress = (pct: number) => {
  lastLoadProgress = Math.max(0, Math.min(100, pct));
  refreshBootPromptText();
};

/**
 * Assets are ready — swap the loading prompt for "click to continue" and
 * arm the click/key handlers that unlock audio and open the main menu.
 */
export const markWelcomeReady = () => {
  if (welcomeReady) return;
  if (!bootShellShown) showBootWelcome();
  welcomeReady = true;

  if (clickPromptEl) {
    clickPromptEl.textContent = t("welcome.click");
    clickPromptEl.style.animation = "promptPulse 1.8s ease-in-out infinite";
  }
  if (modalEl) {
    modalEl.style.cursor = "pointer";
  }

  const onModalClick = () => {
    if (!welcomeReady || !modalEl) return;

    unlockAudio();

    if (dimOverlayEl) dimOverlayEl.style.opacity = "0";
    modalEl.style.opacity = "0";
    modalEl.style.transition = "opacity 0.4s ease";

    setTimeout(() => {
      modalEl?.remove();
      modalEl = null;
      clickPromptEl = null;
      dimOverlayEl = null;
    }, 400);

    void playMenuBgm();

    window.removeEventListener("keydown", onModalClick);
    setTimeout(() => onBootContinue?.(), 400);
  };

  window.addEventListener("keydown", onModalClick, { once: true });
  modalEl?.addEventListener("click", onModalClick, { once: true });
};

/**
 * Game-state entry used by the ticker. The real shell is shown earlier via
 * {@link showBootWelcome}; this is a no-op once that has run.
 */
export const welcome = () => {
  showBootWelcome();
};
