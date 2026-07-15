import { t } from "./i18n";
import { domFontStyle } from "./fonts";

const CONTROLS_OVERLAY_ID = "controls-overlay";
const ABOUT_OVERLAY_ID = "about-overlay";

/** Drop ephemeral menu overlays (e.g. on locale change). */
export const disposeMenuOverlays = () => {
  document.getElementById(ABOUT_OVERLAY_ID)?.remove();
  document.getElementById(CONTROLS_OVERLAY_ID)?.remove();
};

export const showControlsOverlay = () => {
  const overlay = document.createElement("div");
  overlay.id = CONTROLS_OVERLAY_ID;
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
    <div style="font-size:22px;color:#fff;text-align:center;margin-bottom:20px;letter-spacing:2px;${domFontStyle(
      "heading",
    )}">
      ${t("controls.title")}
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:16px;color:rgba(255,255,255,0.8);${domFontStyle(
      "body",
    )}">
      <tr style="border-bottom:1px solid rgba(100,200,255,0.1);">
        <td style="padding:10px 0;color:#667eea;width:80px;">${t(
          "controls.keyboard",
        )}</td>
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
      <button type="button" class="overlay-close-btn" style="padding:10px 24px;border:1px solid rgba(255,255,255,0.3);border-radius:8px;
        background:rgba(255,255,255,0.1);color:#fff;font-size:15px;cursor:pointer;
        transition:all 0.2s ease;">
        ${t("controls.close")}
      </button>
    </div>
  `;
  overlay.appendChild(card);
  const closeBtn = card.querySelector(".overlay-close-btn") as HTMLButtonElement;
  closeBtn.onclick = () => overlay.remove();
  overlay.onclick = (e) => {
    if (e.target === overlay) overlay.remove();
  };
  document.body.appendChild(overlay);
};

export const showAboutOverlay = () => {
  // Only one about dialog at a time
  document.getElementById(ABOUT_OVERLAY_ID)?.remove();

  const overlay = document.createElement("div");
  overlay.id = ABOUT_OVERLAY_ID;
  overlay.style.cssText = `
    position:fixed;top:0;left:0;width:100%;height:100%;z-index:10000;
    display:flex;align-items:center;justify-content:center;
    background:rgba(0,0,0,0.8);backdrop-filter:blur(4px);
    animation:fadeIn 0.3s ease;
  `;

  const link = (text: string, href: string) =>
    `<a class="about-link" href="${href}" target="_blank" rel="noopener">${text}</a>`;
  const row = (label: string, content: string, last = false) => `
    <div style="display:flex;gap:12px;align-items:baseline;padding:11px 0;
      ${last ? "" : "border-bottom:1px solid rgba(100,200,255,0.1);"}">
      <span style="flex:0 0 72px;font-size:13px;color:rgba(180,220,255,0.7);${domFontStyle(
        "caption",
      )}">${label}</span>
      <span style="flex:1;font-size:15px;color:rgba(255,255,255,0.85);line-height:1.5;${domFontStyle(
        "body",
      )}">${content}</span>
    </div>`;

  const card = document.createElement("div");
  card.style.cssText = `
    background:rgba(20,25,50,0.95);border:1px solid rgba(100,200,255,0.3);
    border-radius:16px;padding:24px 28px;max-width:480px;width:90%;
    max-height:min(85vh,720px);overflow-y:auto;
    box-shadow:0 20px 60px rgba(0,0,0,0.5);
  `;
  card.innerHTML = `
    <style>
      .about-link {
        color:rgba(170,210,255,0.9);text-decoration:none;
        transition:color .15s ease;
      }
      .about-link:hover { color:#dcefff;text-decoration:underline; }
      .about-legal p { margin:0 0 10px; }
      .about-legal p:last-child { margin-bottom:0; }
    </style>
    <div style="font-size:22px;color:#fff;text-align:center;margin-bottom:16px;letter-spacing:2px;${domFontStyle(
      "heading",
    )}">
      ${t("about.title")}
    </div>
    ${row(
      t("footer.original"),
      `${link(
        "Pazuru-Pico",
        "https://github.com/hamzaabamboo/pazuru-pico",
      )} (${link("HamP", "https://ham-san.net/")})`,
    )}
    ${row(
      t("footer.inspiration"),
      link(
        "BanG Dream! ☆PICO ～OHMORI～ Ep.9",
        "https://www.youtube.com/watch?v=q5YETLAebUY",
      ),
    )}
    ${row(
      t("footer.thisProject"),
      link("GitHub", "https://github.com/25-ji-code-de/puzzle-sekai"),
    )}
    ${row(
      t("footer.author"),
      link(
        "bili_47177171806",
        "https://space.bilibili.com/3546904856103196",
      ),
    )}
    ${row(
      t("footer.support"),
      link(t("about.afdian"), "https://afdian.com/a/1806P"),
    )}
    ${row(
      t("footer.feedback"),
      link(
        t("about.reportIssue"),
        "https://github.com/25-ji-code-de/puzzle-sekai/issues/new",
      ),
      true,
    )}
    <div class="about-legal" style="margin-top:18px;padding:14px 14px 12px;border-radius:10px;
      background:rgba(0,0,0,0.28);border:1px solid rgba(255,255,255,0.08);
      font-size:13px;line-height:1.7;color:rgba(255,255,255,0.62);${domFontStyle(
        "caption",
      )}">
      <p style="font-size:14px;color:rgba(255,255,255,0.85);margin-bottom:12px;${domFontStyle(
        "body",
      )}"><strong>${t("about.disclaimerTitle")}</strong></p>
      <p>${t("about.disclaimerP1")}</p>
      <p>${t("about.disclaimerP2")}</p>
      <p>${t("about.disclaimerP3")}</p>
      <p>${t("about.disclaimerP4")}</p>
      <p style="margin-top:12px;font-size:12px;opacity:0.8;">${t(
        "about.disclaimerAgree",
      )}</p>
    </div>
    <div style="text-align:center;margin-top:20px;">
      <button type="button" class="overlay-close-btn" style="padding:10px 24px;border:1px solid rgba(255,255,255,0.3);border-radius:8px;
        background:rgba(255,255,255,0.1);color:#fff;font-size:15px;cursor:pointer;
        transition:all 0.2s ease;">
        ${t("controls.close")}
      </button>
    </div>
  `;
  overlay.appendChild(card);
  const closeBtn = card.querySelector(".overlay-close-btn") as HTMLButtonElement;
  closeBtn.onclick = () => overlay.remove();
  overlay.onclick = (e) => {
    if (e.target === overlay) overlay.remove();
  };
  document.body.appendChild(overlay);
};
