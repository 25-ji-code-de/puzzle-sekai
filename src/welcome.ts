import * as PIXI from "pixi.js-legacy";
import { app, bgSprite, setState } from ".";
import { start, stopBgm, playBgm } from "./states";
import {
  GameSettings,
  SpeedLevel,
  TimeAttackDuration,
  GroupName,
  GAME_GROUPS,
  GROUP_LABELS,
  SPEED_LABELS,
  TIME_LABELS,
  getCurrentSettings,
  updateCurrentSettings,
  setCurrentGameMode,
  loadHighScore,
} from "./settings";

import maokenFontUrl from "./assets/fonts/MaokenAssortedSans-Lite.woff2";
import nishikiFontUrl from "./assets/fonts/nishiki-teki.woff2";
import droidSansMonoFontUrl from "./assets/fonts/DroidSansMono.woff2";

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
      パズル⭐︎セカ
    </div>
    <div style="font-size:16px;color:rgba(180,220,255,0.7);letter-spacing:4px;margin-bottom:24px;">
      ～ Puzzle × SEKAI ～
    </div>
    <div style="font-size:15px;color:rgba(255,255,255,0.6);line-height:1.8;margin-bottom:24px;">
      收集 Project SEKAI 的成员<br>消除方块，达成最高分！
    </div>
    <div style="font-size:18px;color:rgba(255,255,255,0.85);
      letter-spacing:6px;margin-top:24px;animation:promptPulse 1.8s ease-in-out infinite;">
      CLICK TO CONTINUE
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
  if (bgSprite && !bgSprite.parent) {
    app.stage.addChild(bgSprite);
  }

  const texture = app.loader.resources["welcome"]?.texture;
  if (!texture) return;

  welcomeSprite = new PIXI.Sprite(texture);
  welcomeSprite.anchor.set(0.5);
  welcomeSprite.x = app.renderer.width / 2;
  welcomeSprite.y = app.renderer.height / 2;
  app.stage.addChild(welcomeSprite);

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
      パズル⭐︎セカ
    </div>
    <div style="font-size:12px;color:rgba(255,255,255,0.6);letter-spacing:6px;margin-top:8px;
      text-shadow:0 1px 10px rgba(0,0,0,0.8);">
      PUZZLE × SEKAI
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

  // 最高分显示
  const settings = getCurrentSettings();
  const endlessHigh = loadHighScore("endless");
  const timeAttackHigh = loadHighScore("timeAttack", settings);

  const highScoreRow = document.createElement("div");
  highScoreRow.style.cssText = `
    display:flex;justify-content:center;gap:32px;margin-bottom:20px;
    font-size:12px;color:rgba(255,255,255,0.5);
  `;
  highScoreRow.innerHTML = `
    <div style="text-align:center;">
      <div style="font-size:10px;opacity:0.6;margin-bottom:2px;">ENDLESS</div>
      <div style="font-size:18px;color:#ff6b8a;font-family:'DroidSansMono',monospace;">${endlessHigh.toString().padStart(6, '0')}</div>
    </div>
    <div style="text-align:center;">
      <div style="font-size:10px;opacity:0.6;margin-bottom:2px;">TIME ATTACK</div>
      <div style="font-size:18px;color:#44ff88;font-family:'DroidSansMono',monospace;">${timeAttackHigh.toString().padStart(6, '0')}</div>
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
    <span style="font-size:18px;color:#fff;">エンドレス / 无尽模式</span>
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
    <span style="font-size:18px;color:#fff;">タイムアタック / 限时挑战</span>
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
  settingsBtn.textContent = "設定";
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
  controlsBtn.textContent = "操作説明";
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
    <div style="font-size:18px;color:#fff;letter-spacing:1px;">設定</div>
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

  // 速度设置
  const speedGroup = document.createElement("div");
  speedGroup.className = "setting-group";
  speedGroup.innerHTML = `<div class="setting-label">速度レベル</div>`;

  const speedOptions = document.createElement("div");
  speedOptions.className = "setting-options";
  for (let i = 1; i <= 5; i++) {
    const level = i as SpeedLevel;
    const opt = document.createElement("div");
    opt.className = `setting-opt ${level === settings.speedLevel ? "active" : ""}`;
    opt.textContent = SPEED_LABELS[level];
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
  timeGroup.innerHTML = `<div class="setting-label">タイムアタック時間</div>`;

  const timeOptions = document.createElement("div");
  timeOptions.className = "setting-options";
  ([60, 90, 120, 180] as TimeAttackDuration[]).forEach((duration) => {
    const opt = document.createElement("div");
    opt.className = `setting-opt ${duration === settings.timeAttackDuration ? "active" : ""}`;
    opt.textContent = TIME_LABELS[duration];
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
  groupGroup.innerHTML = `<div class="setting-label">出現グループ（最少3个）</div>`;

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
    }, 300);
  }
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
      操作説明
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:14px;color:rgba(255,255,255,0.8);">
      <tr style="border-bottom:1px solid rgba(100,200,255,0.1);">
        <td style="padding:10px 0;color:#667eea;width:80px;">键盘</td>
        <td style="padding:10px 0;">← → 左右移动</td>
      </tr>
      <tr style="border-bottom:1px solid rgba(100,200,255,0.1);">
        <td style="padding:10px 0;"></td>
        <td style="padding:10px 0;">↑ / X 顺时针旋转</td>
      </tr>
      <tr style="border-bottom:1px solid rgba(100,200,255,0.1);">
        <td style="padding:10px 0;"></td>
        <td style="padding:10px 0;">Z / Ctrl 逆时针旋转</td>
      </tr>
      <tr style="border-bottom:1px solid rgba(100,200,255,0.1);">
        <td style="padding:10px 0;"></td>
        <td style="padding:10px 0;">↓ 加速下落</td>
      </tr>
      <tr style="border-bottom:1px solid rgba(100,200,255,0.1);">
        <td style="padding:10px 0;"></td>
        <td style="padding:10px 0;">Space 直接落到底部</td>
      </tr>
      <tr style="border-bottom:1px solid rgba(100,200,255,0.15);">
        <td style="padding:10px 0;"></td>
        <td style="padding:10px 0;">R 重新开始</td>
      </tr>
      <tr style="border-bottom:1px solid rgba(100,200,255,0.1);">
        <td style="padding:10px 0;color:#f5576c;">手机</td>
        <td style="padding:10px 0;">← → 滑动 左右移动</td>
      </tr>
      <tr style="border-bottom:1px solid rgba(100,200,255,0.1);">
        <td style="padding:10px 0;"></td>
        <td style="padding:10px 0;">点击左/右半屏 旋转</td>
      </tr>
      <tr style="border-bottom:1px solid rgba(100,200,255,0.1);">
        <td style="padding:10px 0;"></td>
        <td style="padding:10px 0;">下滑 直接落到底部</td>
      </tr>
      <tr>
        <td style="padding:10px 0;"></td>
        <td style="padding:10px 0;">长按 加速下落</td>
      </tr>
    </table>
    <div style="text-align:center;margin-top:20px;">
      <button style="padding:10px 24px;border:1px solid rgba(255,255,255,0.3);border-radius:8px;
        background:rgba(255,255,255,0.1);color:#fff;font-size:14px;cursor:pointer;
        transition:all 0.2s ease;" onclick="this.parentElement.parentElement.parentElement.remove()">
        閉じる
      </button>
    </div>
  `;
  overlay.appendChild(card);
  overlay.onclick = (e) => {
    if (e.target === overlay) overlay.remove();
  };
  document.body.appendChild(overlay);
};
