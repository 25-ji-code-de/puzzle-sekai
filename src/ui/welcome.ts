import * as PIXI from "pixi.js-legacy";
import { app, bgSprite, setState } from "../index";
import { start, playMenuBgm, pausePlay, resumePlay } from "../game/states";
import { setCurrentGameMode } from "../settings";
import { t, onLocaleChange } from "../i18n";
import { domFontStyle } from "./fonts";
import { highScoreRowHtml, refreshHighScoreRow } from "./menu-utils";
import {
  showSettingsPanel,
  disposeSettingsPanel,
} from "../settings/panel";
import {
  showControlsOverlay,
  showAboutOverlay,
  disposeMenuOverlays,
} from "./overlays";
import { clearAppCaches } from "../settings";
import {
  requestAppFullscreen,
  waitForLandscape,
  startPlayOrientationGate,
  type OrientationGate,
} from "./display";
import { isPauseMenuOpen } from "./pause-menu";
import { unlockAudio } from "../audio/bgm";
// Hashed cover URL — applied to the static HTML shell after the app bundle loads.
import welcomeImg from "../assets/welcome.png";

let welcomeSprite: PIXI.Sprite;
let modalEl: HTMLDivElement | null = null;
let clickPromptEl: HTMLDivElement | null = null;
let dimOverlayEl: HTMLDivElement | null = null;
let orientationGate: OrientationGate | null = null;
/** True once all boot assets are ready and the shell accepts a click/key. */
let welcomeReady = false;
let bootShellShown = false;
let bootLocaleListening = false;
let lastLoadProgress = 0;

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

// ============== 第一个页面：游戏概述（解决音频限制） ==============

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
    // Sync copy with the full i18n module (early HTML script already set a
    // best-effort locale string; this covers any drift / late init).
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

    // Unlock AudioContext on the gesture stack before any await in playMenuBgm.
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
    setTimeout(() => showWelcomePage(), 400);
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

// ============== 第二个页面：游戏欢迎页（H5 风格） ==============

let menuOverlay: HTMLDivElement | null = null;

const showWelcomePage = () => {
  if (menuOverlay) return; // Prevent duplicate menu

  if (bgSprite && !bgSprite.parent) {
    app.stage.addChild(bgSprite);
  }

  // Re-add the welcome cover sprite — it gets removed on `startGame`, so it
  // may still exist as an object but be detached from the stage. Only create a
  // new one if it never existed.
  if (!welcomeSprite) {
    const texture = app.loader.resources["welcome"]?.texture;
    if (!texture) return;
    welcomeSprite = new PIXI.Sprite(texture);
    welcomeSprite.anchor.set(0.5);
    welcomeSprite.x = app.renderer.width / 2;
    welcomeSprite.y = app.renderer.height / 2;
  }
  if (!welcomeSprite.parent) {
    app.stage.addChild(welcomeSprite);
  }

  buildMenu();

  // Register locale change listener ONCE (not inside buildMenu to avoid exponential growth)
  onLocaleChange(() => {
    disposeSettingsPanel();
    disposeMenuOverlays();
    if (menuOverlay) {
      menuOverlay.remove();
      menuOverlay = null;
      buildMenu();
    }
  });
};

/**
 * Re-enter the welcome menu from gameplay (e.g. pause → Quit to menu).
 * Restores the welcome cover/bg, the menu BGM (bgm161), and shows the menu.
 */
export const enterMenu = () => {
  showWelcomePage();
  // Menu BGM: stop any leftover game/game-over BGM, then lazy-load & loop bgm161.
  // Also idle-prefetches play + game-over tracks once the menu track is warm.
  void playMenuBgm();
};

/** Build (or rebuild) the menu DOM overlay. Sprites are kept across locale changes. */
const buildMenu = () => {
  if (menuOverlay) return;

  // Leaving gameplay: drop the landscape gate if a previous session left one.
  orientationGate?.dispose();
  orientationGate = null;

  menuOverlay = document.createElement("div");
  menuOverlay.id = "main-menu-overlay";
  menuOverlay.style.cssText = `
    position:fixed;top:0;left:0;width:100%;height:100%;z-index:9999;
    display:flex;flex-direction:column;
    pointer-events:none;
  `;

  const header = document.createElement("div");
  header.className = "menu-header";
  header.style.cssText = `
    text-align:center;padding:40px 20px 20px;
    pointer-events:none;
  `;
  header.innerHTML = `
    <div class="menu-title" style="font-size:36px;color:#fff;letter-spacing:2px;
      text-shadow:0 2px 20px rgba(0,0,0,0.8),0 0 40px rgba(100,200,255,0.3);
      ${domFontStyle("brand")}">
      ${t("menu.title")}
    </div>
    <div class="menu-subtitle" style="font-size:14px;color:rgba(255,255,255,0.6);letter-spacing:6px;margin-top:8px;
      text-shadow:0 1px 10px rgba(0,0,0,0.8);">
      ${t("menu.subtitle")}
    </div>
  `;
  menuOverlay.appendChild(header);

  const spacer = document.createElement("div");
  spacer.style.cssText = "flex:1;pointer-events:none;";
  menuOverlay.appendChild(spacer);

  const footer = document.createElement("div");
  footer.className = "menu-footer";
  footer.style.cssText = `
    padding:20px 24px 28px;
    padding-bottom:max(28px, env(safe-area-inset-bottom, 0px));
    background:linear-gradient(transparent, rgba(0,0,0,0.7) 30%, rgba(0,0,0,0.85));
    pointer-events:auto;
  `;

  const highScoreRow = document.createElement("div");
  highScoreRow.id = "high-score-row";
  highScoreRow.className = "menu-highscore";
  highScoreRow.style.cssText = `
    display:flex;justify-content:center;gap:32px;margin-bottom:20px;
    font-size:14px;color:rgba(255,255,255,0.5);
  `;
  highScoreRow.innerHTML = highScoreRowHtml();
  footer.appendChild(highScoreRow);

  const btnContainer = document.createElement("div");
  btnContainer.className = "menu-modes";
  btnContainer.style.cssText = `
    display:flex;gap:12px;margin-bottom:16px;
  `;

  const makeModeBtn = (label: string, mode: "endless" | "timeAttack") => {
    const btn = document.createElement("button");
    btn.className = "menu-mode-btn";
    btn.style.cssText = `
      flex:1;padding:10px 16px;border:none;border-radius:8px;
      background:linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.6) 50%, rgba(0,0,0,0) 100%);
      cursor:pointer;
      ${domFontStyle("action")}
      transition:all 0.3s ease;
      pointer-events:auto;
    `;
    btn.innerHTML = `<span style="font-size:20px;color:#fff;">${label}</span>`;
    btn.onmouseenter = () => {
      btn.style.background =
        "linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.75) 50%, rgba(0,0,0,0) 100%)";
    };
    btn.onmouseleave = () => {
      btn.style.background =
        "linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.6) 50%, rgba(0,0,0,0) 100%)";
    };
    btn.onclick = () => startGame(mode);
    return btn;
  };

  btnContainer.appendChild(makeModeBtn(t("menu.endless"), "endless"));
  btnContainer.appendChild(makeModeBtn(t("menu.timeAttack"), "timeAttack"));
  footer.appendChild(btnContainer);

  const toolbar = document.createElement("div");
  toolbar.className = "menu-toolbar";
  toolbar.style.cssText = `
    display:flex;justify-content:center;gap:24px;flex-wrap:wrap;
  `;

  const makeToolbarBtn = (label: string, onClick: () => void) => {
    const btn = document.createElement("button");
    btn.className = "menu-tool-btn";
    btn.style.cssText = `
      padding:10px 20px;border:1px solid rgba(255,255,255,0.3);border-radius:8px;
      background:rgba(255,255,255,0.1);color:rgba(255,255,255,0.8);font-size:15px;
      cursor:pointer;${domFontStyle("body")}
      transition:all 0.2s ease;pointer-events:auto;
    `;
    btn.textContent = label;
    btn.onmouseenter = () => {
      btn.style.background = "rgba(255,255,255,0.2)";
      btn.style.borderColor = "rgba(255,255,255,0.5)";
    };
    btn.onmouseleave = () => {
      btn.style.background = "rgba(255,255,255,0.1)";
      btn.style.borderColor = "rgba(255,255,255,0.3)";
    };
    btn.onclick = onClick;
    return btn;
  };

  toolbar.appendChild(
    makeToolbarBtn(t("menu.settings"), () =>
      showSettingsPanel({ onClosed: refreshHighScoreRow }),
    ),
  );
  toolbar.appendChild(makeToolbarBtn(t("menu.controls"), showControlsOverlay));
  toolbar.appendChild(makeToolbarBtn(t("menu.about"), showAboutOverlay));

  const clearCacheBtn = makeToolbarBtn(
    t("settings.data.clearCache"),
    async () => {
      if (!window.confirm(t("settings.data.clearCacheConfirm"))) return;
      clearCacheBtn.disabled = true;
      const prev = clearCacheBtn.textContent;
      clearCacheBtn.textContent = t("settings.data.working");
      try {
        await clearAppCaches();
        clearCacheBtn.textContent = t("settings.data.clearCacheDone");
        setTimeout(() => {
          clearCacheBtn.textContent = prev;
          clearCacheBtn.disabled = false;
        }, 1500);
      } catch {
        clearCacheBtn.textContent = t("settings.data.clearFailed");
        setTimeout(() => {
          clearCacheBtn.textContent = prev;
          clearCacheBtn.disabled = false;
        }, 1500);
      }
    },
  );
  toolbar.appendChild(clearCacheBtn);
  footer.appendChild(toolbar);

  menuOverlay.appendChild(footer);

  const style = document.createElement("style");
  style.textContent = `
    @keyframes slideUp {
      from { transform: translateY(100%); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    /* Portrait phone / narrow menu layout */
    @media (orientation: portrait) and (max-width: 900px) {
      #main-menu-overlay .menu-header {
        padding: max(28px, env(safe-area-inset-top, 0px)) 16px 12px !important;
      }
      #main-menu-overlay .menu-title {
        font-size: 28px !important;
        letter-spacing: 1px !important;
      }
      #main-menu-overlay .menu-subtitle {
        font-size: 12px !important;
        letter-spacing: 3px !important;
      }
      #main-menu-overlay .menu-footer {
        padding: 16px 16px max(20px, env(safe-area-inset-bottom, 0px)) !important;
      }
      #main-menu-overlay .menu-highscore {
        gap: 20px !important;
        margin-bottom: 14px !important;
      }
      #main-menu-overlay .menu-modes {
        flex-direction: column !important;
        gap: 10px !important;
        margin-bottom: 12px !important;
      }
      #main-menu-overlay .menu-mode-btn {
        width: 100% !important;
        padding: 14px 16px !important;
        background: rgba(0,0,0,0.45) !important;
        border: 1px solid rgba(180,220,255,0.25) !important;
      }
      #main-menu-overlay .menu-mode-btn span {
        font-size: 18px !important;
      }
      #main-menu-overlay .menu-toolbar {
        gap: 8px !important;
      }
      #main-menu-overlay .menu-tool-btn {
        flex: 1 1 calc(50% - 8px);
        min-width: 0;
        padding: 10px 8px !important;
        font-size: 13px !important;
        text-align: center;
      }
    }
  `;
  menuOverlay.appendChild(style);
  document.body.appendChild(menuOverlay);
};

const startGame = (mode: "endless" | "timeAttack") => {
  setCurrentGameMode(mode);

  // Must request fullscreen from this user-gesture stack; fire-and-forget so
  // a browser rejection (e.g. iOS Safari) never blocks game start.
  void requestAppFullscreen();

  // Drop the menu immediately so the rotate prompt is the only UI.
  if (menuOverlay) {
    menuOverlay.remove();
    menuOverlay = null;
  }
  if (welcomeSprite) {
    app.stage.removeChild(welcomeSprite);
  }

  // Don't start the match until landscape — otherwise pieces drop while the
  // player is still rotating the phone.
  orientationGate?.dispose();
  orientationGate = waitForLandscape(t("display.rotateLandscape"), () => {
    // After the first landscape unlock, keep a pause/resume gate so flipping
    // back to portrait freezes the match instead of letting it run blind.
    orientationGate = startPlayOrientationGate({
      message: t("display.rotateLandscape"),
      onPause: pausePlay,
      // Don't auto-resume if the player opened the pause menu before rotating.
      // Orientation-only freezes should resume; manual pauses must stay paused.
      onResume: () => {
        if (isPauseMenuOpen()) return;
        resumePlay();
      },
    });
    setState(start);
  });
};
