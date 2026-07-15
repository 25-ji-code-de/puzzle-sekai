import * as PIXI from "pixi.js-legacy";
import { app, bgSprite, setState } from ".";
import { start, stopBgm, playBgm } from "./states";
import { setCurrentGameMode } from "./settings";
import { t, onLocaleChange } from "./i18n";
import { domFontStyle } from "./fonts";
import { highScoreRowHtml, refreshHighScoreRow } from "./menu-utils";
import {
  showSettingsPanel,
  disposeSettingsPanel,
} from "./settings-panel";
import {
  showControlsOverlay,
  showAboutOverlay,
  disposeMenuOverlays,
} from "./menu-overlays";

let welcomeSprite: PIXI.Sprite;
let welcomeInitialized = false;
let modalEl: HTMLDivElement | null = null;

// ============== 第一个页面：游戏概述（解决音频限制） ==============

export const welcome = () => {
  if (welcomeInitialized) return;
  welcomeInitialized = true;

  const welcomeUrl =
    (app.loader.resources["welcome"]?.texture as any)?.baseTexture?.resource
      ?.url || "";

  modalEl = document.createElement("div");
  modalEl.style.cssText = `
    position:fixed;top:0;left:0;width:100%;height:100%;z-index:9999;cursor:pointer;
    display:flex;align-items:center;justify-content:center;
    background: url(${welcomeUrl}) center/cover no-repeat;
  `;

  const overlay = document.createElement("div");
  overlay.style.cssText = `
    position:absolute;top:0;left:0;width:100%;height:100%;
    background:rgba(0,0,0,0.55);
    transition: opacity 0.3s ease;
  `;
  modalEl.appendChild(overlay);

  const content = document.createElement("div");
  content.style.cssText = `
    position:relative;z-index:1;text-align:center;
    padding:40px 60px;border-radius:16px;
    background:rgba(0,0,0,0.45);border:2px solid rgba(180,220,255,0.35);
    backdrop-filter:blur(6px);
    box-shadow:0 8px 40px rgba(0,0,0,0.6),0 0 60px rgba(100,200,255,0.08) inset;
  `;

  content.innerHTML = `
    <div style="font-size:42px;color:#fff;letter-spacing:3px;
      text-shadow:0 2px 12px rgba(100,200,255,0.4);
      ${domFontStyle("brand")}margin-bottom:24px;">
      ${t("welcome.title")}
    </div>
    <div style="font-size:17px;color:rgba(180,220,255,0.7);letter-spacing:4px;margin-bottom:24px;${domFontStyle(
      "brand",
    )}">
      ${t("welcome.subtitle")}
    </div>
    <div style="font-size:16px;color:rgba(255,255,255,0.6);line-height:1.85;margin-bottom:24px;${domFontStyle(
      "body",
    )}">
      ${t("welcome.desc")}
    </div>
    <div style="font-size:20px;color:rgba(255,255,255,0.85);
      letter-spacing:0.14em;margin-top:24px;animation:promptPulse 1.8s ease-in-out infinite;${domFontStyle(
        "action",
      )}">
      ${t("welcome.click")}
    </div>
  `;

  const style = document.createElement("style");
  style.textContent = `@keyframes promptPulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`;
  modalEl.appendChild(style);
  modalEl.appendChild(content);
  document.body.appendChild(modalEl);

  const onModalClick = () => {
    overlay.style.opacity = "0";
    modalEl!.style.opacity = "0";
    modalEl!.style.transition = "opacity 0.4s ease";

    setTimeout(() => {
      modalEl?.remove();
      modalEl = null;
    }, 400);

    stopBgm();
    const bgm161 = app.loader.resources["bgm161"]?.sound;
    if (bgm161) {
      playBgm(bgm161 as PIXI.sound.Sound, { loop: true, volume: 0.3 });
    }

    window.removeEventListener("keydown", onModalClick);
    setTimeout(() => showWelcomePage(), 400);
  };

  window.addEventListener("keydown", onModalClick, { once: true });
  modalEl.addEventListener("click", onModalClick, { once: true });
};

// ============== 第二个页面：游戏欢迎页（H5 风格） ==============

let menuOverlay: HTMLDivElement | null = null;

const showWelcomePage = () => {
  if (menuOverlay) return; // Prevent duplicate menu

  if (bgSprite && !bgSprite.parent) {
    app.stage.addChild(bgSprite);
  }

  if (!welcomeSprite) {
    const texture = app.loader.resources["welcome"]?.texture;
    if (!texture) return;
    welcomeSprite = new PIXI.Sprite(texture);
    welcomeSprite.anchor.set(0.5);
    welcomeSprite.x = app.renderer.width / 2;
    welcomeSprite.y = app.renderer.height / 2;
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

/** Build (or rebuild) the menu DOM overlay. Sprites are kept across locale changes. */
const buildMenu = () => {
  if (menuOverlay) return;

  menuOverlay = document.createElement("div");
  menuOverlay.style.cssText = `
    position:fixed;top:0;left:0;width:100%;height:100%;z-index:9999;
    display:flex;flex-direction:column;
    pointer-events:none;
  `;

  const header = document.createElement("div");
  header.style.cssText = `
    text-align:center;padding:40px 20px 20px;
    pointer-events:none;
  `;
  header.innerHTML = `
    <div style="font-size:36px;color:#fff;letter-spacing:2px;
      text-shadow:0 2px 20px rgba(0,0,0,0.8),0 0 40px rgba(100,200,255,0.3);
      ${domFontStyle("brand")}">
      ${t("menu.title")}
    </div>
    <div style="font-size:14px;color:rgba(255,255,255,0.6);letter-spacing:6px;margin-top:8px;
      text-shadow:0 1px 10px rgba(0,0,0,0.8);">
      ${t("menu.subtitle")}
    </div>
  `;
  menuOverlay.appendChild(header);

  const spacer = document.createElement("div");
  spacer.style.cssText = "flex:1;pointer-events:none;";
  menuOverlay.appendChild(spacer);

  const footer = document.createElement("div");
  footer.style.cssText = `
    padding:20px 24px 28px;
    background:linear-gradient(transparent, rgba(0,0,0,0.7) 30%, rgba(0,0,0,0.85));
    pointer-events:auto;
  `;

  const highScoreRow = document.createElement("div");
  highScoreRow.id = "high-score-row";
  highScoreRow.style.cssText = `
    display:flex;justify-content:center;gap:32px;margin-bottom:20px;
    font-size:14px;color:rgba(255,255,255,0.5);
  `;
  highScoreRow.innerHTML = highScoreRowHtml();
  footer.appendChild(highScoreRow);

  const btnContainer = document.createElement("div");
  btnContainer.style.cssText = `
    display:flex;gap:12px;margin-bottom:16px;
  `;

  const makeModeBtn = (label: string, mode: "endless" | "timeAttack") => {
    const btn = document.createElement("button");
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
  toolbar.style.cssText = `
    display:flex;justify-content:center;gap:24px;
  `;

  const makeToolbarBtn = (label: string, onClick: () => void) => {
    const btn = document.createElement("button");
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
  `;
  menuOverlay.appendChild(style);
  document.body.appendChild(menuOverlay);
};

const startGame = (mode: "endless" | "timeAttack") => {
  setCurrentGameMode(mode);

  if (menuOverlay) {
    menuOverlay.remove();
    menuOverlay = null;
  }

  if (welcomeSprite) {
    app.stage.removeChild(welcomeSprite);
  }

  setState(start);
};
