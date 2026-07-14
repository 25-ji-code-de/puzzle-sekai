import * as PIXI from "pixi.js-legacy";
import { app, bgSprite, setState } from ".";
import { start, stopBgm, playBgm } from "./states";
import {
  SpeedLevel,
  TimeAttackDuration,
  ItemDropRate,
  GAME_GROUPS,
  GROUP_LABELS,
  getSpeedLabel,
  getTimeLabel,
  ITEM_DROP_RATES,
  getItemDropLabel,
  ITEM_DROP_SCORE_FACTORS,
  getCurrentSettings,
  updateCurrentSettings,
  setCurrentGameMode,
  loadHighScoreRecord,
  getDifficultyLabel,
  getDifficultyLevel,
  getDifficultyColor,
  getScoreMultiplierBreakdown,
  isEntertainmentMode,
  DifficultyLevel,
} from "./settings";
import { FUN_MODE_DEFS, FunModeId, scaleItemLinkedFactor } from "./fun-modes";
import { t, setLocale, onLocaleChange, SUPPORTED_LOCALES, getLocale, Locale } from "./i18n";

import maokenFontUrl from "./assets/fonts/MaokenAssortedSans-Lite.woff2";
import nishikiFontUrl from "./assets/fonts/nishiki-teki.woff2";
import droidSansMonoFontUrl from "./assets/fonts/DroidSansMono.woff2";

/** CSS inline style for colored difficulty text (supports gradient for Append) */
const diffColorStyle = (level: number): string => {
  if (level === 7) {
    return `background:linear-gradient(90deg,#ff88cc,#ddbbff);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;`;
  }
  const c = getDifficultyColor(level);
  return c ? `color:${c};` : "";
};

let welcomeSprite: PIXI.Sprite;
let welcomeInitialized = false;
let modalEl: HTMLDivElement | null = null;

// 加载字体
const loadFonts = async () => {
  try {
    const [maoken, nishiki, droidMono] = await Promise.all([
      new FontFace('MaokenAssortedSans', `url(${maokenFontUrl})`).load(),
      new FontFace('NishikiTeki', `url(${nishikiFontUrl})`).load(),
      new FontFace('DroidSansMono', `url(${droidSansMonoFontUrl})`).load(),
    ]);
    document.fonts.add(maoken);
    document.fonts.add(nishiki);
    document.fonts.add(droidMono);
  } catch (e) {
    console.warn('Failed to load fonts:', e);
  }
};
loadFonts();

// ============== 第一个页面：游戏概述（解决音频限制） ==============

export const welcome = () => {
  if (welcomeInitialized) return;
  welcomeInitialized = true;

  const welcomeUrl = (app.loader.resources["welcome"]?.texture as any)?.baseTexture?.resource?.url || "";

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
      font-family:'NishikiTeki','MaokenAssortedSans','Hiragino Sans','Yu Gothic',sans-serif;margin-bottom:24px;">
      ${t("welcome.title")}
    </div>
    <div style="font-size:16px;color:rgba(180,220,255,0.7);letter-spacing:4px;margin-bottom:24px;">
      ${t("welcome.subtitle")}
    </div>
    <div style="font-size:15px;color:rgba(255,255,255,0.6);line-height:1.8;margin-bottom:24px;">
      ${t("welcome.desc")}
    </div>
    <div style="font-size:18px;color:rgba(255,255,255,0.85);
      letter-spacing:6px;margin-top:24px;animation:promptPulse 1.8s ease-in-out infinite;">
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

    setTimeout(() => { modalEl?.remove(); modalEl = null; }, 400);

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
let settingsContainer: HTMLDivElement | null = null;

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
    // Close settings panel if open (it will be recreated with new locale on next open)
    if (settingsContainer) {
      settingsContainer.remove();
      settingsContainer = null;
    }
    // Rebuild menu with new locale
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

  // 主菜单覆盖层
  menuOverlay = document.createElement("div");
  menuOverlay.style.cssText = `
    position:fixed;top:0;left:0;width:100%;height:100%;z-index:9999;
    display:flex;flex-direction:column;
    pointer-events:none;
  `;

  // 顶部标题区域
  const header = document.createElement("div");
  header.style.cssText = `
    text-align:center;padding:40px 20px 20px;
    pointer-events:none;
  `;
  header.innerHTML = `
    <div style="font-size:36px;color:#fff;letter-spacing:2px;
      text-shadow:0 2px 20px rgba(0,0,0,0.8),0 0 40px rgba(100,200,255,0.3);
      font-family:'NishikiTeki','MaokenAssortedSans','Hiragino Sans','Yu Gothic',sans-serif;">
      ${t("menu.title")}
    </div>
    <div style="font-size:12px;color:rgba(255,255,255,0.6);letter-spacing:6px;margin-top:8px;
      text-shadow:0 1px 10px rgba(0,0,0,0.8);">
      ${t("menu.subtitle")}
    </div>
  `;
  menuOverlay.appendChild(header);

  // 中间留空，让背景显示
  const spacer = document.createElement("div");
  spacer.style.cssText = "flex:1;pointer-events:none;";
  menuOverlay.appendChild(spacer);

  // 底部菜单区域
  const footer = document.createElement("div");
  footer.style.cssText = `
    padding:20px 24px 40px;
    background:linear-gradient(transparent, rgba(0,0,0,0.7) 30%, rgba(0,0,0,0.85));
    pointer-events:auto;
  `;

  // 最高分显示（全局榜 + 打出该分时的难度档 + 娱乐标记）
  const settings = getCurrentSettings();
  const endlessRecord = loadHighScoreRecord("endless");
  const timeAttackRecord = loadHighScoreRecord("timeAttack", settings);
  const formatHs = (score: number, diff: number, ent: boolean) => {
    const scoreStr = score.toString().padStart(6, "0");
    const star =
      diff >= 1 && diff <= 7
        ? getDifficultyLabel(diff as DifficultyLevel)
        : "";
    const entTag = ent ? ` · ${t("hsTags.entertainment")}` : "";
    return { scoreStr, star, entTag, diff };
  };
  const endlessHs = formatHs(
    endlessRecord.score,
    endlessRecord.difficultyLevel,
    endlessRecord.entertainment,
  );
  const taHs = formatHs(
    timeAttackRecord.score,
    timeAttackRecord.difficultyLevel,
    timeAttackRecord.entertainment,
  );

  const highScoreRow = document.createElement("div");
  highScoreRow.id = "high-score-row";
  highScoreRow.style.cssText = `
    display:flex;justify-content:center;gap:32px;margin-bottom:20px;
    font-size:12px;color:rgba(255,255,255,0.5);
  `;
  highScoreRow.innerHTML = `
    <div style="text-align:center;">
      <div style="font-size:10px;opacity:0.6;margin-bottom:2px;">${t("menu.highScore.endless")}</div>
      <div style="font-size:18px;color:#ff6b8a;font-family:'DroidSansMono',monospace;">${endlessHs.scoreStr}</div>
      <div style="font-size:11px;margin-top:2px;${diffColorStyle(endlessHs.diff)}">${endlessHs.star || "—"}${endlessHs.entTag}</div>
    </div>
    <div style="text-align:center;">
      <div style="font-size:10px;opacity:0.6;margin-bottom:2px;">${t("menu.highScore.timeAttack")}</div>
      <div style="font-size:18px;color:#44ff88;font-family:'DroidSansMono',monospace;">${taHs.scoreStr}</div>
      <div style="font-size:11px;margin-top:2px;${diffColorStyle(taHs.diff)}">${taHs.star || "—"}${taHs.entTag}</div>
    </div>
  `;
  footer.appendChild(highScoreRow);

  // 模式选择按钮
  const btnContainer = document.createElement("div");
  btnContainer.style.cssText = `
    display:flex;gap:12px;margin-bottom:16px;
  `;

  // 无尽模式按钮
  const endlessBtn = document.createElement("button");
  endlessBtn.style.cssText = `
    flex:1;padding:10px 16px;border:none;border-radius:8px;
    background:linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.6) 50%, rgba(0,0,0,0) 100%);
    cursor:pointer;
    font-family:'NishikiTeki','MaokenAssortedSans','Hiragino Sans','Yu Gothic',sans-serif;
    transition:all 0.3s ease;
    pointer-events:auto;
  `;
  endlessBtn.innerHTML = `
    <span style="font-size:18px;color:#fff;">${t("menu.endless")}</span>
  `;
  endlessBtn.onmouseenter = () => {
    endlessBtn.style.background = "linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.75) 50%, rgba(0,0,0,0) 100%)";
  };
  endlessBtn.onmouseleave = () => {
    endlessBtn.style.background = "linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.6) 50%, rgba(0,0,0,0) 100%)";
  };
  endlessBtn.onclick = () => startGame("endless");
  btnContainer.appendChild(endlessBtn);

  // 限时挑战按钮
  const timeAttackBtn = document.createElement("button");
  timeAttackBtn.style.cssText = `
    flex:1;padding:10px 16px;border:none;border-radius:8px;
    background:linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.6) 50%, rgba(0,0,0,0) 100%);
    cursor:pointer;
    font-family:'NishikiTeki','MaokenAssortedSans','Hiragino Sans','Yu Gothic',sans-serif;
    transition:all 0.3s ease;
    pointer-events:auto;
  `;
  timeAttackBtn.innerHTML = `
    <span style="font-size:18px;color:#fff;">${t("menu.timeAttack")}</span>
  `;
  timeAttackBtn.onmouseenter = () => {
    timeAttackBtn.style.background = "linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.75) 50%, rgba(0,0,0,0) 100%)";
  };
  timeAttackBtn.onmouseleave = () => {
    timeAttackBtn.style.background = "linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.6) 50%, rgba(0,0,0,0) 100%)";
  };
  timeAttackBtn.onclick = () => startGame("timeAttack");
  btnContainer.appendChild(timeAttackBtn);

  footer.appendChild(btnContainer);

  // 底部工具栏
  const toolbar = document.createElement("div");
  toolbar.style.cssText = `
    display:flex;justify-content:center;gap:24px;
  `;

  const settingsBtn = document.createElement("button");
  settingsBtn.style.cssText = `
    padding:10px 20px;border:1px solid rgba(255,255,255,0.3);border-radius:8px;
    background:rgba(255,255,255,0.1);color:rgba(255,255,255,0.8);font-size:13px;
    cursor:pointer;font-family:'Hiragino Sans','Yu Gothic',sans-serif;
    transition:all 0.2s ease;pointer-events:auto;
  `;
  settingsBtn.textContent = t("menu.settings");
  settingsBtn.onmouseenter = () => {
    settingsBtn.style.background = "rgba(255,255,255,0.2)";
    settingsBtn.style.borderColor = "rgba(255,255,255,0.5)";
  };
  settingsBtn.onmouseleave = () => {
    settingsBtn.style.background = "rgba(255,255,255,0.1)";
    settingsBtn.style.borderColor = "rgba(255,255,255,0.3)";
  };
  settingsBtn.onclick = () => showSettingsPanel();
  toolbar.appendChild(settingsBtn);

  const controlsBtn = document.createElement("button");
  controlsBtn.style.cssText = `
    padding:10px 20px;border:1px solid rgba(255,255,255,0.3);border-radius:8px;
    background:rgba(255,255,255,0.1);color:rgba(255,255,255,0.8);font-size:13px;
    cursor:pointer;font-family:'Hiragino Sans','Yu Gothic',sans-serif;
    transition:all 0.2s ease;pointer-events:auto;
  `;
  controlsBtn.textContent = t("menu.controls");
  controlsBtn.onmouseenter = () => {
    controlsBtn.style.background = "rgba(255,255,255,0.2)";
    controlsBtn.style.borderColor = "rgba(255,255,255,0.5)";
  };
  controlsBtn.onmouseleave = () => {
    controlsBtn.style.background = "rgba(255,255,255,0.1)";
    controlsBtn.style.borderColor = "rgba(255,255,255,0.3)";
  };
  controlsBtn.onclick = () => showControlsOverlay();
  toolbar.appendChild(controlsBtn);

  footer.appendChild(toolbar);
  menuOverlay.appendChild(footer);

  // 添加全局样式
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

// 设置面板（从右侧滑出）
const showSettingsPanel = () => {
  if (settingsContainer) return;

  const settings = getCurrentSettings();

  // 创建容器
  settingsContainer = document.createElement("div");
  settingsContainer.style.cssText = `
    position:fixed;top:0;left:0;width:100%;height:100%;z-index:10000;
    display:flex;justify-content:flex-end;
  `;

  // 背景遮罩
  const backdrop = document.createElement("div");
  backdrop.style.cssText = `
    position:absolute;top:0;left:0;width:100%;height:100%;
    background:rgba(0,0,0,0.5);
  `;
  backdrop.onclick = () => closeSettingsPanel();
  settingsContainer.appendChild(backdrop);

  // 设置面板
  const settingsPanel = document.createElement("div");
  settingsPanel.style.cssText = `
    position:relative;width:320px;height:100%;
    background:rgba(15,20,40,0.95);border-left:1px solid rgba(100,200,255,0.2);
    box-shadow:-10px 0 40px rgba(0,0,0,0.5);
    padding:24px;overflow-y:auto;
    animation:slideIn 0.3s ease;
  `;

  const style = document.createElement("style");
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }
    @keyframes slideOut {
      from { transform: translateX(0); }
      to { transform: translateX(100%); }
    }
    .setting-group { margin-bottom:24px; }
    .setting-label {
      font-size:13px;color:rgba(180,220,255,0.8);margin-bottom:10px;
      letter-spacing:1px;
    }
    .setting-options { display:flex;gap:6px;flex-wrap:wrap; }
    .setting-opt {
      padding:8px 12px;border-radius:6px;font-size:13px;cursor:pointer;
      background:rgba(100,200,255,0.1);border:1px solid rgba(100,200,255,0.2);
      color:rgba(255,255,255,0.7);transition:all 0.2s ease;
      font-family:'NishikiTeki','MaokenAssortedSans','Hiragino Sans','Yu Gothic',sans-serif;
    }
    .setting-opt:hover { background:rgba(100,200,255,0.2); }
    .setting-opt.active {
      background:rgba(100,200,255,0.3);border-color:rgba(100,200,255,0.8);
      color:#fff;
    }
    .setting-opt.group-opt {
      flex:1;min-width:80px;text-align:center;
    }
    .setting-opt.group-opt.active {
      background:rgba(100,200,255,0.4);border-color:#4488ff;
    }
  `;
  settingsPanel.appendChild(style);

  // 标题
  const header = document.createElement("div");
  header.style.cssText = `
    display:flex;justify-content:space-between;align-items:center;
    margin-bottom:24px;padding-bottom:16px;
    border-bottom:1px solid rgba(100,200,255,0.1);
  `;
  header.innerHTML = `
    <div style="font-size:18px;color:#fff;letter-spacing:1px;">${t("settings.title")}</div>
  `;

  const closeBtn = document.createElement("button");
  closeBtn.style.cssText = `
    width:32px;height:32px;border:none;border-radius:6px;
    background:rgba(255,255,255,0.1);color:#fff;font-size:18px;
    cursor:pointer;transition:all 0.2s ease;
  `;
  closeBtn.textContent = "✕";
  closeBtn.onmouseenter = () => closeBtn.style.background = "rgba(255,255,255,0.2)";
  closeBtn.onmouseleave = () => closeBtn.style.background = "rgba(255,255,255,0.1)";
  closeBtn.onclick = () => closeSettingsPanel();
  header.appendChild(closeBtn);
  settingsPanel.appendChild(header);

  // 语言切换
  const langGroup = document.createElement("div");
  langGroup.className = "setting-group";
  langGroup.innerHTML = `<div class="setting-label">${t("settings.lang.label")}</div>`;
  const langOptions = document.createElement("div");
  langOptions.className = "setting-options";
  const currentLocale = getLocale();
  SUPPORTED_LOCALES.forEach(({ value, label }) => {
    const opt = document.createElement("div");
    opt.className = `setting-opt ${value === currentLocale ? "active" : ""}`;
    opt.textContent = label;
    opt.onclick = () => {
      setLocale(value as Locale);
      refreshSettingsPanel();
    };
    langOptions.appendChild(opt);
  });
  langGroup.appendChild(langOptions);
  settingsPanel.appendChild(langGroup);

  // 速度设置
  const speedGroup = document.createElement("div");
  speedGroup.className = "setting-group";
  speedGroup.innerHTML = `<div class="setting-label">${t("settings.speed.label")}</div>`;

  const speedOptions = document.createElement("div");
  speedOptions.className = "setting-options";
  for (let i = 1; i <= 5; i++) {
    const level = i as SpeedLevel;
    const opt = document.createElement("div");
    opt.className = `setting-opt ${level === settings.speedLevel ? "active" : ""}`;
    opt.textContent = getSpeedLabel(level);
    opt.onclick = () => {
      settings.speedLevel = level;
      updateCurrentSettings(settings);
      refreshSettingsPanel();
    };
    speedOptions.appendChild(opt);
  }
  speedGroup.appendChild(speedOptions);
  settingsPanel.appendChild(speedGroup);

  // 限时模式时长
  const timeGroup = document.createElement("div");
  timeGroup.className = "setting-group";
  timeGroup.innerHTML = `<div class="setting-label">${t("settings.ta.label")}</div>`;

  const timeOptions = document.createElement("div");
  timeOptions.className = "setting-options";
  ([60, 90, 120, 180] as TimeAttackDuration[]).forEach((duration) => {
    const opt = document.createElement("div");
    opt.className = `setting-opt ${duration === settings.timeAttackDuration ? "active" : ""}`;
    opt.textContent = getTimeLabel(duration);
    opt.onclick = () => {
      settings.timeAttackDuration = duration;
      updateCurrentSettings(settings);
      refreshSettingsPanel();
    };
    timeOptions.appendChild(opt);
  });
  timeGroup.appendChild(timeOptions);
  settingsPanel.appendChild(timeGroup);

  // 团体选择
  const groupGroup = document.createElement("div");
  groupGroup.className = "setting-group";
  groupGroup.innerHTML = `<div class="setting-label">${t("settings.groups.label")}</div>`;

  const groupOptions = document.createElement("div");
  groupOptions.className = "setting-options";
  GAME_GROUPS.forEach((group) => {
    const isSelected = settings.selectedGroups.includes(group);
    const opt = document.createElement("div");
    opt.className = `setting-opt group-opt ${isSelected ? "active" : ""}`;
    opt.textContent = GROUP_LABELS[group];
    opt.onclick = () => {
      const idx = settings.selectedGroups.indexOf(group);
      if (idx >= 0) {
        if (settings.selectedGroups.length > 3) {
          settings.selectedGroups.splice(idx, 1);
        }
      } else {
        if (settings.selectedGroups.length < 5) {
          settings.selectedGroups.push(group);
        }
      }
      updateCurrentSettings(settings);
      refreshSettingsPanel();
    };
    groupOptions.appendChild(opt);
  });
  groupGroup.appendChild(groupOptions);
  settingsPanel.appendChild(groupGroup);

  // 道具掉落概率
  const itemGroup = document.createElement("div");
  itemGroup.className = "setting-group";
  itemGroup.innerHTML = `<div class="setting-label">${t("settings.item.label")}</div>`;
  const itemOptions = document.createElement("div");
  itemOptions.className = "setting-options";
  const currentItemRate = (settings.itemDropRate ?? 10) as ItemDropRate;
  ITEM_DROP_RATES.forEach((rate) => {
    const opt = document.createElement("div");
    opt.className = `setting-opt ${rate === currentItemRate ? "active" : ""}`;
    opt.title = t("settings.item.tooltip", { factor: ITEM_DROP_SCORE_FACTORS[rate].toFixed(2) });
    opt.innerHTML = `<div>${getItemDropLabel(rate)}</div>
      <div style="font-size:10px;opacity:0.65;margin-top:2px;">×${ITEM_DROP_SCORE_FACTORS[rate].toFixed(2)}</div>`;
    opt.onclick = () => {
      settings.itemDropRate = rate;
      updateCurrentSettings(settings);
      refreshSettingsPanel();
    };
    itemOptions.appendChild(opt);
  });
  itemGroup.appendChild(itemOptions);
  settingsPanel.appendChild(itemGroup);

  // 娯楽モード
  if (!settings.funModes) {
    settings.funModes = { ...FUN_MODE_DEFS.reduce((acc, d) => {
      acc[d.id] = false;
      return acc;
    }, {} as Record<FunModeId, boolean>) };
  }

  const funGroup = document.createElement("div");
  funGroup.className = "setting-group";
  funGroup.innerHTML = `<div class="setting-label">${t("settings.fun.label")}</div>`;

  const funOptions = document.createElement("div");
  funOptions.className = "setting-options";
  funOptions.style.flexDirection = "column";
  funOptions.style.alignItems = "stretch";

  const funChipRow = document.createElement("div");
  funChipRow.className = "setting-options";

  const funHelp = document.createElement("div");
  funHelp.style.cssText = `
    margin-top:10px;padding:10px 12px;border-radius:8px;
    background:rgba(0,0,0,0.25);border:1px solid rgba(100,200,255,0.15);
    color:rgba(255,255,255,0.7);font-size:12px;line-height:1.55;min-height:3.2em;
    white-space:pre-wrap;
  `;
  funHelp.textContent = t("settings.fun.help");

  FUN_MODE_DEFS.forEach((def) => {
    const on = !!settings.funModes[def.id];
    const opt = document.createElement("div");
    opt.className = `setting-opt ${on ? "active" : ""}`;
    opt.title = t(`fun.${def.id}.description`);
    const shownFactor = def.itemLinked
      ? scaleItemLinkedFactor(def.scoreFactor, currentItemRate)
      : def.scoreFactor;
    const factorNote = def.itemLinked ? t("settings.fun.itemLinked") : "";
    opt.innerHTML = `<div style="font-size:13px;">${t(`fun.${def.id}.name`)}</div>
      <div style="font-size:10px;opacity:0.65;margin-top:2px;">${t(`fun.${def.id}.subtitle`)} · ×${shownFactor.toFixed(2)}${factorNote}</div>`;
    opt.onmouseenter = () => {
      funHelp.textContent = t(`fun.${def.id}.description`);
    };
    opt.onclick = () => {
      settings.funModes[def.id] = !settings.funModes[def.id];
      updateCurrentSettings(settings);
      refreshSettingsPanel();
    };
    funChipRow.appendChild(opt);
  });

  funOptions.appendChild(funChipRow);
  funOptions.appendChild(funHelp);
  funGroup.appendChild(funOptions);
  settingsPanel.appendChild(funGroup);

  // 难度摘要（只读，含娱乐最终倍率 + 明细 tooltip）
  const diffSummary = document.createElement("div");
  diffSummary.className = "setting-group";
  const breakdown = getScoreMultiplierBreakdown(settings);
  const mult = breakdown.final;
  const label = breakdown.difficultyLabel;
  const diffLevel = getDifficultyLevel(settings);
  const entOn = isEntertainmentMode(settings);

  const linesHtml = breakdown.lines
    .map(
      (line) =>
        `<div style="display:flex;justify-content:space-between;gap:12px;padding:3px 0;border-bottom:1px solid rgba(255,255,255,0.06);">
          <span style="color:rgba(255,255,255,0.75);">${line.label}</span>
          <span style="font-family:DroidSansMono,monospace;color:#aaccff;white-space:nowrap;">×${line.factor.toFixed(2)}</span>
        </div>`,
    )
    .join("");

  const card = document.createElement("div");
  card.style.cssText = `
    position:relative;padding:12px 14px;border-radius:8px;
    background:rgba(100,200,255,0.12);border:1px solid rgba(100,200,255,0.25);
    color:#fff;font-size:14px;line-height:1.6;cursor:help;
  `;
  card.innerHTML = `
    <div><span style="${diffColorStyle(diffLevel)}">${label}</span>${entOn ? ` <span style="color:#ffcc66;">${t("settings.difficulty.entertainment")}</span>` : ""}</div>
    <div style="font-family:DroidSansMono,monospace;color:#aaccff;">
      ×${mult.toFixed(2)}
      <span style="font-size:11px;opacity:0.55;margin-left:6px;">${t("settings.difficulty.info")}</span>
    </div>
  `;

  const tip = document.createElement("div");
  tip.style.cssText = `
    display:none;position:absolute;left:0;right:0;bottom:calc(100% + 8px);z-index:20;
    padding:12px 14px;border-radius:10px;
    background:rgba(12,16,32,0.97);border:1px solid rgba(100,200,255,0.35);
    box-shadow:0 8px 28px rgba(0,0,0,0.45);font-size:12px;line-height:1.45;
  `;
  tip.innerHTML = `
    <div style="font-size:11px;color:rgba(180,220,255,0.8);letter-spacing:1px;margin-bottom:8px;">${t("settings.difficulty.breakdownTitle")}</div>
    ${linesHtml}
    <div style="display:flex;justify-content:space-between;gap:12px;padding-top:8px;margin-top:4px;border-top:1px solid rgba(100,200,255,0.25);font-weight:600;">
      <span>${t("settings.difficulty.total")}</span>
      <span style="font-family:DroidSansMono,monospace;color:#fff;">×${mult.toFixed(2)}</span>
    </div>
  `;
  card.appendChild(tip);
  card.onmouseenter = () => {
    tip.style.display = "block";
  };
  card.onmouseleave = () => {
    tip.style.display = "none";
  };
  // mobile: tap to toggle
  card.onclick = (e) => {
    e.stopPropagation();
    tip.style.display = tip.style.display === "block" ? "none" : "block";
  };

  diffSummary.innerHTML = `<div class="setting-label">${t("settings.difficulty.label")}</div>`;
  diffSummary.appendChild(card);
  settingsPanel.appendChild(diffSummary);

  settingsContainer.appendChild(settingsPanel);
  document.body.appendChild(settingsContainer);
};

// 刷新设置面板
const refreshSettingsPanel = () => {
  if (settingsContainer) {
    settingsContainer.remove();
    settingsContainer = null;
    showSettingsPanel();
  }
};

// 关闭设置面板
const closeSettingsPanel = () => {
  if (settingsContainer) {
    const settingsPanel = settingsContainer.querySelector("div:nth-child(2)") as HTMLElement;
    if (settingsPanel) {
      settingsPanel.style.animation = "slideOut 0.3s ease forwards";
    }
    setTimeout(() => {
      settingsContainer?.remove();
      settingsContainer = null;
      refreshHighScoreRow();
    }, 300);
  }
};

// 刷新主菜单最高分（TA 时长 / 娱乐纪录变化时）
const refreshHighScoreRow = () => {
  const row = document.getElementById("high-score-row");
  if (!row) return;
  const settings = getCurrentSettings();
  const endlessRecord = loadHighScoreRecord("endless");
  const timeAttackRecord = loadHighScoreRecord("timeAttack", settings);
  const formatHs = (score: number, diff: number, ent: boolean) => {
    const scoreStr = score.toString().padStart(6, "0");
    const star =
      diff >= 1 && diff <= 7
        ? getDifficultyLabel(diff as DifficultyLevel)
        : "—";
    const entTag = ent ? ` · ${t("hsTags.entertainment")}` : "";
    return { scoreStr, star, entTag, diff };
  };
  const endlessHs = formatHs(
    endlessRecord.score,
    endlessRecord.difficultyLevel,
    endlessRecord.entertainment,
  );
  const taHs = formatHs(
    timeAttackRecord.score,
    timeAttackRecord.difficultyLevel,
    timeAttackRecord.entertainment,
  );
  row.innerHTML = `
    <div style="text-align:center;">
      <div style="font-size:10px;opacity:0.6;margin-bottom:2px;">${t("menu.highScore.endless")}</div>
      <div style="font-size:18px;color:#ff6b8a;font-family:'DroidSansMono',monospace;">${endlessHs.scoreStr}</div>
      <div style="font-size:11px;margin-top:2px;${diffColorStyle(endlessHs.diff)}">${endlessHs.star}${endlessHs.entTag}</div>
    </div>
    <div style="text-align:center;">
      <div style="font-size:10px;opacity:0.6;margin-bottom:2px;">${t("menu.highScore.timeAttack")}</div>
      <div style="font-size:18px;color:#44ff88;font-family:'DroidSansMono',monospace;">${taHs.scoreStr}</div>
      <div style="font-size:11px;margin-top:2px;${diffColorStyle(taHs.diff)}">${taHs.star}${taHs.entTag}</div>
    </div>
  `;
};


// 开始游戏
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

// 操作说明覆盖层
const showControlsOverlay = () => {
  const overlay = document.createElement("div");
  overlay.style.cssText = `
    position:fixed;top:0;left:0;width:100%;height:100%;z-index:10000;
    display:flex;align-items:center;justify-content:center;
    background:rgba(0,0,0,0.8);backdrop-filter:blur(4px);
    animation:fadeIn 0.3s ease;
  `;

  const card = document.createElement("div");
  card.style.cssText = `
    background:rgba(20,25,50,0.95);border:1px solid rgba(100,200,255,0.3);
    border-radius:16px;padding:28px 32px;max-width:480px;width:90%;
    box-shadow:0 20px 60px rgba(0,0,0,0.5);
  `;
  card.innerHTML = `
    <div style="font-size:20px;color:#fff;text-align:center;margin-bottom:20px;letter-spacing:2px;">
      ${t("controls.title")}
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:14px;color:rgba(255,255,255,0.8);">
      <tr style="border-bottom:1px solid rgba(100,200,255,0.1);">
        <td style="padding:10px 0;color:#667eea;width:80px;">${t("controls.keyboard")}</td>
        <td style="padding:10px 0;">${t("controls.moveLeftRight")}</td>
      </tr>
      <tr style="border-bottom:1px solid rgba(100,200,255,0.1);">
        <td style="padding:10px 0;"></td>
        <td style="padding:10px 0;">${t("controls.rotateClockwise")}</td>
      </tr>
      <tr style="border-bottom:1px solid rgba(100,200,255,0.1);">
        <td style="padding:10px 0;"></td>
        <td style="padding:10px 0;">${t("controls.rotateCounter")}</td>
      </tr>
      <tr style="border-bottom:1px solid rgba(100,200,255,0.1);">
        <td style="padding:10px 0;"></td>
        <td style="padding:10px 0;">${t("controls.softDrop")}</td>
      </tr>
      <tr style="border-bottom:1px solid rgba(100,200,255,0.1);">
        <td style="padding:10px 0;"></td>
        <td style="padding:10px 0;">${t("controls.hardDrop")}</td>
      </tr>
      <tr style="border-bottom:1px solid rgba(100,200,255,0.15);">
        <td style="padding:10px 0;"></td>
        <td style="padding:10px 0;">${t("controls.restart")}</td>
      </tr>
      <tr style="border-bottom:1px solid rgba(100,200,255,0.1);">
        <td style="padding:10px 0;color:#f5576c;">${t("controls.mobile")}</td>
        <td style="padding:10px 0;">${t("controls.swipeMove")}</td>
      </tr>
      <tr style="border-bottom:1px solid rgba(100,200,255,0.1);">
        <td style="padding:10px 0;"></td>
        <td style="padding:10px 0;">${t("controls.tapRotate")}</td>
      </tr>
      <tr style="border-bottom:1px solid rgba(100,200,255,0.1);">
        <td style="padding:10px 0;"></td>
        <td style="padding:10px 0;">${t("controls.swipeHardDrop")}</td>
      </tr>
      <tr>
        <td style="padding:10px 0;"></td>
        <td style="padding:10px 0;">${t("controls.pressSoftDrop")}</td>
      </tr>
    </table>
    <div style="text-align:center;margin-top:20px;">
      <button style="padding:10px 24px;border:1px solid rgba(255,255,255,0.3);border-radius:8px;
        background:rgba(255,255,255,0.1);color:#fff;font-size:14px;cursor:pointer;
        transition:all 0.2s ease;" onclick="this.parentElement.parentElement.parentElement.remove()">
        ${t("controls.close")}
      </button>
    </div>
  `;
  overlay.appendChild(card);
  overlay.onclick = (e) => {
    if (e.target === overlay) overlay.remove();
  };
  document.body.appendChild(overlay);
};
