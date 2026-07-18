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
import {
  danColorStyle,
  danMessageKey,
  getDanSummary,
} from "../../score";
import {
  displayNameOf,
  getAuthSnapshot,
  isAuthConfigured,
  logout,
  onAuthChange,
  startLogin,
} from "../../auth";
import {
  getSyncStatus,
  onSyncStatus,
} from "../../sync";
import type { MessageKey } from "../../i18n";
import { ensureLiveRegions } from "../../a11y";
import { showSettingsPanel, disposeSettingsPanel } from "../../settings/panel";
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

const makeModeBtn = (label: string, mode: "endless" | "timeAttack") => {
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
  footer.appendChild(btnContainer);

  const toolbar = document.createElement("div");
  toolbar.className = "menu-toolbar";

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

  // Compact account CTA on the settings / toolbar row.
  const authChip = document.createElement("button");
  authChip.type = "button";
  authChip.className = "menu-auth menu-tool-btn";
  authChip.setAttribute("data-boot-interactive", "1");

  const paintAuthChip = () => {
    const snap = getAuthSnapshot();
    const sync = getSyncStatus();
    authChip.classList.toggle("menu-auth--guest", !snap.loggedIn);
    authChip.classList.toggle("menu-auth--user", snap.loggedIn);
    if (!snap.loggedIn) {
      authChip.textContent = t("auth.loginShort");
      authChip.title = isAuthConfigured()
        ? t("auth.login")
        : t("auth.notConfigured");
      authChip.disabled = !isAuthConfigured();
      return;
    }
    const name = displayNameOf(snap.user);
    let suffix = "";
    if (sync === "syncing") suffix = ` · ${t("auth.syncing")}`;
    else if (sync === "error") suffix = ` · ${t("auth.syncFailed")}`;
    authChip.textContent = name + suffix;
    authChip.title = t("auth.logout");
    authChip.disabled = false;
  };

  authChip.onclick = () => {
    const snap = getAuthSnapshot();
    if (!snap.loggedIn) {
      if (!isAuthConfigured()) {
        window.alert(t("auth.notConfigured"));
        return;
      }
      void startLogin().then((r) => {
        if (!r.ok && r.reason === "not_configured") {
          window.alert(t("auth.notConfigured"));
        }
      });
      return;
    }
    if (window.confirm(t("auth.logout"))) {
      logout();
      paintAuthChip();
    }
  };

  paintAuthChip();
  unsubAuth = onAuthChange(() => paintAuthChip());
  unsubSync = onSyncStatus(() => paintAuthChip());
  toolbar.appendChild(authChip);
  footer.appendChild(toolbar);

  menuOverlay.appendChild(footer);
  document.body.appendChild(menuOverlay);
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
      disposeSettingsPanel();
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
