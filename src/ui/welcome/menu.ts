/**
 * Main menu overlay: mode buttons, toolbar, high score row.
 * Styles: styles/_menu.scss
 */
import * as PIXI from "pixi.js-legacy";
import { app, bgSprite } from "../../runtime";
import { STAGE_WIDTH, STAGE_HEIGHT } from "../../config";
import { playMenuBgm } from "../../audio/session";
import { clearAppCaches } from "../../settings";
import { t, onLocaleChange } from "../../i18n";
import {
  highScoreRowHtml,
  refreshHighScoreRow,
  resetHighScoreViewState,
  handleHighScoreRowEvent,
} from "../menu-utils";
import { danColorStyle, danMessageKey, getDanSummary } from "../../score";
import type { MessageKey } from "../../i18n";
import { ensureLiveRegions } from "../../a11y";
import {
  showControlsOverlay,
  showAboutOverlay,
  disposeMenuOverlays,
} from "../overlays";
import {
  disposeOrientationGate,
  setStartGameHooks,
  startGame,
} from "./start-game";
import { setPlayPhase } from "../../application/play-session";

let welcomeSprite: PIXI.Sprite;
let menuOverlay: HTMLDivElement | null = null;
let localeListening = false;
let unsubAuth: (() => void) | null = null;
let unsubSync: (() => void) | null = null;
let bootstrappedCloudSync = false;

let authMod: typeof import("../../auth") | null = null;
let authPromise: Promise<typeof import("../../auth")> | null = null;
let syncMod: typeof import("../../sync") | null = null;
let syncPromise: Promise<typeof import("../../sync")> | null = null;
let settingsPanelMod: typeof import("../../settings/panel") | null = null;
let settingsPanelPromise: Promise<
  typeof import("../../settings/panel")
> | null = null;

const ensureAuth = (): Promise<typeof import("../../auth")> => {
  if (authMod) return Promise.resolve(authMod);
  if (!authPromise) {
    authPromise = import("../../auth").then((mod) => {
      authMod = mod;
      return mod;
    });
  }
  return authPromise;
};

const ensureSync = (): Promise<typeof import("../../sync")> => {
  if (syncMod) return Promise.resolve(syncMod);
  if (!syncPromise) {
    syncPromise = import("../../sync").then((mod) => {
      syncMod = mod;
      return mod;
    });
  }
  return syncPromise;
};

const ensureSettingsPanel = (): Promise<
  typeof import("../../settings/panel")
> => {
  if (settingsPanelMod) return Promise.resolve(settingsPanelMod);
  if (!settingsPanelPromise) {
    settingsPanelPromise = import("../../settings/panel").then((mod) => {
      settingsPanelMod = mod;
      return mod;
    });
  }
  return settingsPanelPromise;
};

const teardownMenu = () => {
  unsubAuth?.();
  unsubAuth = null;
  unsubSync?.();
  unsubSync = null;
  if (menuOverlay) {
    menuOverlay.remove();
    menuOverlay = null;
  }
};

const removeWelcomeSprite = () => {
  if (welcomeSprite) {
    app.stage.removeChild(welcomeSprite);
  }
};

setStartGameHooks({ teardownMenu, removeWelcomeSprite });

const makeModeBtn = (
  label: string,
  mode: "endless" | "timeAttack" | "daily",
) => {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "menu-mode-btn";
  const span = document.createElement("span");
  span.textContent = label;
  btn.appendChild(span);
  btn.onclick = () => startGame(mode);
  return btn;
};

const makeToolbarBtn = (label: string, onClick: () => void) => {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "menu-tool-btn";
  btn.textContent = label;
  btn.onclick = onClick;
  return btn;
};

/** Build (or rebuild) the menu DOM overlay. Sprites are kept across locale changes. */
const buildMenu = () => {
  if (menuOverlay) return;

  void ensureSettingsPanel();

  disposeOrientationGate();

  menuOverlay = document.createElement("div");
  menuOverlay.id = "main-menu-overlay";
  menuOverlay.setAttribute("role", "navigation");
  menuOverlay.setAttribute("aria-label", t("a11y.mainMenu"));

  const header = document.createElement("div");
  header.className = "menu-header";
  const title = document.createElement("div");
  title.className = "menu-title";
  title.id = "main-menu-title";
  title.textContent = t("menu.title");
  const subtitle = document.createElement("div");
  subtitle.className = "menu-subtitle";
  subtitle.textContent = t("menu.subtitle");
  header.appendChild(title);
  header.appendChild(subtitle);

  const danSnap = getDanSummary();
  const danChip = document.createElement("div");
  danChip.className = "menu-dan";
  const danLabel = t(danMessageKey(danSnap.dan) as MessageKey);
  danChip.textContent = danSnap.ornament
    ? `${danLabel} ${danSnap.ornament}`
    : danLabel;
  danChip.style.cssText = danColorStyle(danSnap.dan);
  header.appendChild(danChip);

  menuOverlay.appendChild(header);

  const spacer = document.createElement("div");
  spacer.className = "menu-spacer";
  menuOverlay.appendChild(spacer);

  const footer = document.createElement("div");
  footer.className = "menu-footer";

  resetHighScoreViewState();
  const highScoreRow = document.createElement("div");
  highScoreRow.id = "high-score-row";
  highScoreRow.className = "menu-highscore";
  highScoreRow.innerHTML = highScoreRowHtml();
  highScoreRow.addEventListener("click", handleHighScoreRowEvent);
  highScoreRow.addEventListener("keydown", handleHighScoreRowEvent);
  footer.appendChild(highScoreRow);

  const btnContainer = document.createElement("div");
  btnContainer.className = "menu-modes";
  btnContainer.appendChild(makeModeBtn(t("menu.endless"), "endless"));
  btnContainer.appendChild(makeModeBtn(t("menu.timeAttack"), "timeAttack"));
  btnContainer.appendChild(makeModeBtn(t("menu.daily"), "daily"));
  footer.appendChild(btnContainer);

  const toolbar = document.createElement("div");
  toolbar.className = "menu-toolbar";

  toolbar.appendChild(
    makeToolbarBtn(t("menu.settings"), () => {
      void ensureSettingsPanel().then(({ showSettingsPanel }) => {
        showSettingsPanel({ onClosed: refreshHighScoreRow });
      });
    }),
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

  // Compact account CTA on the settings / toolbar row.
  const authChip = document.createElement("button");
  authChip.type = "button";
  authChip.className = "menu-auth menu-tool-btn";
  authChip.setAttribute("data-boot-interactive", "1");
  authChip.textContent = t("auth.loginShort");
  authChip.title = t("auth.login");
  authChip.disabled = true;
  /** True while OAuth is in-flight (browser open → deep-link return → token). */
  let authPending = false;

  const setAuthPending = (pending: boolean) => {
    authPending = pending;
    try {
      if (pending) sessionStorage.setItem("puzzleSekaiAuthPending", "1");
      else sessionStorage.removeItem("puzzleSekaiAuthPending");
    } catch {
      /* private mode */
    }
  };

  try {
    authPending = sessionStorage.getItem("puzzleSekaiAuthPending") === "1";
  } catch {
    authPending = false;
  }

  const paintAuthChip = async () => {
    const auth = await ensureAuth();
    const snap = auth.getAuthSnapshot();
    const syncStatus = syncMod?.getSyncStatus() ?? "idle";
    authChip.classList.toggle("menu-auth--guest", !snap.loggedIn);
    authChip.classList.toggle("menu-auth--user", snap.loggedIn);
    authChip.classList.toggle(
      "menu-auth--pending",
      authPending && !snap.loggedIn,
    );

    if (snap.loggedIn) {
      // Successful login clears the pending flag.
      if (authPending) setAuthPending(false);
      const name = auth.displayNameOf(snap.user);
      let suffix = "";
      if (syncStatus === "syncing") suffix = ` · ${t("auth.syncing")}`;
      else if (syncStatus === "error") suffix = ` · ${t("auth.syncFailed")}`;
      authChip.textContent = name + suffix;
      authChip.title = t("auth.logout");
      authChip.disabled = false;
      return;
    }

    if (authPending) {
      authChip.textContent = t("auth.loggingIn");
      authChip.title = t("auth.loggingIn");
      authChip.disabled = true;
      return;
    }

    authChip.textContent = t("auth.loginShort");
    authChip.title = auth.isAuthConfigured()
      ? t("auth.login")
      : t("auth.notConfigured");
    authChip.disabled = !auth.isAuthConfigured();
  };

  const attachAuthChip = async () => {
    const auth = await ensureAuth();
    if (!unsubAuth) {
      unsubAuth = auth.onAuthChange(() => {
        void paintAuthChip();
      });
    }
    await paintAuthChip();
  };

  authChip.onclick = () => {
    void ensureAuth().then((auth) => {
      const snap = auth.getAuthSnapshot();
      if (!snap.loggedIn) {
        if (!auth.isAuthConfigured()) {
          window.alert(t("auth.notConfigured"));
          return;
        }
        // Show "Signing in…" immediately so return-from-browser doesn't look stuck.
        setAuthPending(true);
        void paintAuthChip();
        void auth.startLogin().then((r) => {
          if (!r.ok) {
            setAuthPending(false);
            void paintAuthChip();
            if (r.reason === "not_configured") {
              window.alert(t("auth.notConfigured"));
            }
          }
          // On success we leave pending=true until onAuthChange / deep-link completes.
        });
        return;
      }
      if (window.confirm(t("auth.logout"))) {
        auth.logout();
        setAuthPending(false);
        void paintAuthChip();
        return;
      }
      void ensureSync().then((sync) => {
        if (!bootstrappedCloudSync) bootstrappedCloudSync = true;
        if (!unsubSync) {
          unsubSync = sync.onSyncStatus(() => {
            void paintAuthChip();
          });
        }
        void sync.pullMergePush();
        void paintAuthChip();
      });
    });
  };

  void attachAuthChip();
  toolbar.appendChild(authChip);
  footer.appendChild(toolbar);

  menuOverlay.appendChild(footer);
  document.body.appendChild(menuOverlay);

  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(
      () => {
        void ensureAuth().then((auth) => {
          if (!auth.getAuthSnapshot().loggedIn || bootstrappedCloudSync) return;
          void ensureSync().then((sync) => {
            bootstrappedCloudSync = true;
            if (!unsubSync) {
              unsubSync = sync.onSyncStatus(() => {
                void paintAuthChip();
              });
            }
            void sync.pullMergePush();
            void paintAuthChip();
          });
        });
      },
      { timeout: 2500 },
    );
  }
};

export const showWelcomePage = () => {
  if (menuOverlay) return;
  ensureLiveRegions();

  if (bgSprite && !bgSprite.parent) {
    app.stage.addChild(bgSprite);
  }

  if (!welcomeSprite) {
    const texture = app.loader.resources["welcome"]?.texture;
    if (!texture) return;
    welcomeSprite = new PIXI.Sprite(texture);
    welcomeSprite.anchor.set(0.5);
    welcomeSprite.x = STAGE_WIDTH / 2;
    welcomeSprite.y = STAGE_HEIGHT / 2;
  }
  if (!welcomeSprite.parent) {
    app.stage.addChild(welcomeSprite);
  }

  buildMenu();

  if (!localeListening) {
    localeListening = true;
    onLocaleChange(() => {
      void ensureSettingsPanel().then(({ disposeSettingsPanel }) => {
        disposeSettingsPanel();
      });
      disposeMenuOverlays();
      if (menuOverlay) {
        menuOverlay.remove();
        menuOverlay = null;
        buildMenu();
      }
    });
  }
};

/**
 * Re-enter the welcome menu from gameplay (e.g. pause → Quit to menu).
 * Restores the welcome cover/bg, the menu BGM (bgm161), and shows the menu.
 */
export const enterMenu = () => {
  showWelcomePage();
  setPlayPhase({ type: "menu" });
  void playMenuBgm();
};
