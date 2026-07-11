import * as PIXI from "pixi.js-legacy";
import { app, bgSprite, setState } from ".";
import { start, stopBgm, playBgm } from "./states";

let welcomeSprite: PIXI.Sprite;
let promptText: PIXI.Text;
let welcomeInitialized = false;
let modalEl: HTMLDivElement | null = null;

export const welcome = () => {
  if (welcomeInitialized) return;
  welcomeInitialized = true;

  // Show HTML modal with welcome.png background and dark overlay
  const welcomeUrl = (app.loader.resources["welcome"]?.texture as any)?.baseTexture?.resource?.url || "";

  modalEl = document.createElement("div");
  modalEl.style.cssText = `
    position:fixed;top:0;left:0;width:100%;height:100%;z-index:9999;cursor:pointer;
    display:flex;align-items:center;justify-content:center;
    background: url(${welcomeUrl}) center/cover no-repeat;
  `;

  // Dark overlay
  const overlay = document.createElement("div");
  overlay.style.cssText = `
    position:absolute;top:0;left:0;width:100%;height:100%;
    background:rgba(0,0,0,0.55);
    transition: opacity 0.3s ease;
  `;
  modalEl.appendChild(overlay);

  // Content wrapper
  const content = document.createElement("div");
  content.style.cssText = `
    position:relative;z-index:1;text-align:center;
    padding:40px 60px;border-radius:16px;
    background:rgba(0,0,0,0.45);border:2px solid rgba(180,220,255,0.35);
    backdrop-filter:blur(6px);
    box-shadow:0 8px 40px rgba(0,0,0,0.6),0 0 60px rgba(100,200,255,0.08) inset;
  `;

  const title = document.createElement("div");
  title.textContent = "パズル⭐︎セカ";
  title.style.cssText = `
    font-size:42px;font-weight:700;color:#fff;letter-spacing:3px;
    text-shadow:0 2px 12px rgba(100,200,255,0.4);
    font-family:'Hiragino Sans','Yu Gothic',sans-serif;
    margin-bottom:24px;
  `;
  content.appendChild(title);

  const subtitle = document.createElement("div");
  subtitle.textContent = "～ Puzzle × SEKAI ～";
  subtitle.style.cssText = `
    font-size:16px;color:rgba(180,220,255,0.7);letter-spacing:4px;
    margin-bottom:24px;
  `;
  content.appendChild(subtitle);

  const desc = document.createElement("div");
  desc.innerHTML = "收集 Project SEKAI 的成员<br>消除方块，达成最高分！";
  desc.style.cssText = `
    font-size:15px;color:rgba(255,255,255,0.6);line-height:1.8;
    margin-bottom:24px;
  `;
  content.appendChild(desc);

  const controlsLink = document.createElement("div");
  controlsLink.textContent = "▶ 点击查看操作说明";
  controlsLink.style.cssText = `
    font-size:13px;color:rgba(180,220,255,0.6);cursor:pointer;
    margin-bottom:24px;transition:color .15s;
  `;
  controlsLink.onmouseenter = () => controlsLink.style.color = "rgba(180,220,255,1)";
  controlsLink.onmouseleave = () => controlsLink.style.color = "rgba(180,220,255,0.6)";
  content.appendChild(controlsLink);

  // Controls table overlay
  const tableOverlay = document.createElement("div");
  tableOverlay.style.cssText = `
    position:fixed;top:0;left:0;width:100%;height:100%;z-index:10000;
    display:none;align-items:center;justify-content:center;
    background:rgba(0,0,0,0.7);backdrop-filter:blur(4px);cursor:pointer;
  `;
  const tableCard = document.createElement("div");
  tableCard.style.cssText = `
    background:rgba(15,20,40,0.95);border:2px solid rgba(100,200,255,0.3);
    border-radius:14px;padding:28px 36px;max-width:520px;width:90%;
    box-shadow:0 10px 40px rgba(0,0,0,0.6);
  `;
  tableCard.innerHTML = `
    <div style="font-size:18px;font-weight:700;color:#fff;text-align:center;margin-bottom:18px;letter-spacing:2px;">操作说明</div>
    <table style="width:100%;border-collapse:collapse;font-size:13px;color:rgba(255,255,255,0.75);">
      <tr style="border-bottom:1px solid rgba(100,200,255,0.15);">
        <td style="padding:8px 0;font-weight:700;color:rgba(180,220,255,0.8);">键盘</td>
        <td style="padding:8px 0;">← → 左右移动</td>
      </tr>
      <tr style="border-bottom:1px solid rgba(100,200,255,0.1);">
        <td style="padding:8px 0;font-weight:700;color:rgba(180,220,255,0.8);"></td>
        <td style="padding:8px 0;">↑ / X　顺时针旋转</td>
      </tr>
      <tr style="border-bottom:1px solid rgba(100,200,255,0.1);">
        <td style="padding:8px 0;font-weight:700;color:rgba(180,220,255,0.8);"></td>
        <td style="padding:8px 0;">Z / Ctrl　逆时针旋转</td>
      </tr>
      <tr style="border-bottom:1px solid rgba(100,200,255,0.1);">
        <td style="padding:8px 0;font-weight:700;color:rgba(180,220,255,0.8);"></td>
        <td style="padding:8px 0;">↓　加速下落</td>
      </tr>
      <tr style="border-bottom:1px solid rgba(100,200,255,0.1);">
        <td style="padding:8px 0;font-weight:700;color:rgba(180,220,255,0.8);"></td>
        <td style="padding:8px 0;">Space　直接落到底部</td>
      </tr>
      <tr style="border-bottom:1px solid rgba(100,200,255,0.1);">
        <td style="padding:8px 0;font-weight:700;color:rgba(180,220,255,0.8);"></td>
        <td style="padding:8px 0;">R　重新开始</td>
      </tr>
      <tr style="border-bottom:1px solid rgba(100,200,255,0.15);">
        <td style="padding:8px 0;font-weight:700;color:rgba(180,220,255,0.8);">手机</td>
        <td style="padding:8px 0;">← → 滑动　左右移动</td>
      </tr>
      <tr style="border-bottom:1px solid rgba(100,200,255,0.1);">
        <td style="padding:8px 0;font-weight:700;color:rgba(180,220,255,0.8);"></td>
        <td style="padding:8px 0;">点击左/右半屏　旋转</td>
      </tr>
      <tr style="border-bottom:1px solid rgba(100,200,255,0.1);">
        <td style="padding:8px 0;font-weight:700;color:rgba(180,220,255,0.8);"></td>
        <td style="padding:8px 0;">下滑　直接落到底部</td>
      </tr>
      <tr>
        <td style="padding:8px 0;font-weight:700;color:rgba(180,220,255,0.8);"></td>
        <td style="padding:8px 0;">长按　加速下落</td>
      </tr>
    </table>
    <div style="text-align:center;margin-top:16px;font-size:12px;color:rgba(255,255,255,0.35);">点击任意处关闭</div>
  `;
  tableOverlay.appendChild(tableCard);
  document.body.appendChild(tableOverlay);

  controlsLink.onclick = (e) => {
    e.stopPropagation();
    tableOverlay.style.display = "flex";
  };
  tableOverlay.onclick = () => {
    tableOverlay.style.display = "none";
  };

  const prompt = document.createElement("div");
  prompt.textContent = "CLICK TO CONTINUE";
  prompt.style.cssText = `
    font-size:18px;font-weight:700;color:rgba(255,255,255,0.85);
    letter-spacing:6px;margin-top:24px;
    animation:promptPulse 1.8s ease-in-out infinite;
  `;
  content.appendChild(prompt);

  // Add keyframes for pulse animation
  const style = document.createElement("style");
  style.textContent = `
    @keyframes promptPulse {
      0%,100% { opacity: 1; }
      50% { opacity: 0.3; }
    }
  `;
  modalEl.appendChild(style);

  modalEl.appendChild(content);
  document.body.appendChild(modalEl);

  const onModalClick = () => {
    overlay.style.opacity = "0";
    modalEl!.style.opacity = "0";
    modalEl!.style.transition = "opacity 0.4s ease";
    tableOverlay.remove();

    setTimeout(() => {
      modalEl?.remove();
      modalEl = null;
    }, 400);

    // Play welcome BGM (after user gesture for AudioContext)
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

const showWelcomePage = () => {
  // Add background to stage now that modal is dismissed
  if (bgSprite && !bgSprite.parent) {
    app.stage.addChild(bgSprite);
  }

  const texture = app.loader.resources["welcome"]?.texture;
  if (!texture) return;

  welcomeSprite = new PIXI.Sprite(texture);
  welcomeSprite.anchor.set(0.5);
  welcomeSprite.x = app.renderer.width / 2;
  welcomeSprite.y = app.renderer.height / 2;
  welcomeSprite.eventMode = "static";
  welcomeSprite.cursor = "pointer";
  app.stage.addChild(welcomeSprite);

  promptText = new PIXI.Text("TAP TO START", {
    fontSize: 42,
    fontWeight: "bold",
    fill: 0xffffff,
    align: "center",
  });
  promptText.anchor.set(0.5);
  promptText.x = app.renderer.width / 2;
  promptText.y = app.renderer.height * 0.75;

  const barWidth = 600;
  const barHeight = 70;
  const bar = new PIXI.Graphics();
  for (let i = 0; i < barWidth; i++) {
    const progress = i / barWidth;
    const alpha = Math.sin(progress * Math.PI) * 0.4;
    bar.beginFill(0x000000, alpha);
    bar.drawRect(i - barWidth / 2, -barHeight / 2, 1, barHeight);
    bar.endFill();
  }
  bar.x = app.renderer.width / 2;
  bar.y = app.renderer.height * 0.75;

  app.stage.addChild(bar);
  app.stage.addChild(promptText);

  let blinkTimer = 0;
  const blink = (delta: number) => {
    blinkTimer += delta;
    promptText.alpha = Math.abs(Math.sin(blinkTimer * 0.05));
  };
  app.ticker.add(blink);

  const onStart = () => {
    app.ticker.remove(blink);
    app.stage.removeChild(welcomeSprite);
    app.stage.removeChild(promptText);
    app.stage.removeChild(bar);

    window.removeEventListener("keydown", onStart);
    window.removeEventListener("pointerdown", onStart);
    setState(start);
  };

  window.addEventListener("keydown", onStart, { once: true });
  window.addEventListener("pointerdown", onStart, { once: true });
};
