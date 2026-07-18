/**
 * Canvas share card: draw PNG from ScoreSummary, then Web Share / download.
 * Presentation numbers/groups come from score/summary-format (shared with DOM UI).
 */
import { getLocale, t } from "../i18n";
import {
  COMBO_PAD,
  formatMultiplier,
  getScoreRankColor,
  getScoreRankGlow,
  GROUP_CLEAR_PAD,
  groupsForSummary,
  padDigits,
  SCORE_PAD,
  splitPaddedNumber,
  type ScoreSummary,
} from "../score";
import { getDifficultyColor, getGroupDisplayColor } from "../settings";

// Portrait share image. Content is sized to fill most of the canvas
// (not sparse type on a big empty plate) so chat thumbnails still read.
const CARD_W = 1080;
const CARD_H = 1440;
const PAD = 48;

/**
 * Draw zero-padded number with dim leading zeros. Returns total width.
 * Roboto is registered at 400 + 600 — pad zeros use Regular, significant
 * digits use SemiBold when `strong` is set (700 heavy, 500 light). Digit
 * advances match under tabular figures.
 */
const fillPaddedNumber = (
  ctx: CanvasRenderingContext2D,
  n: number,
  len: number,
  x: number,
  y: number,
  align: "left" | "center" | "right",
  solidColor: string,
  opts?: { padColor?: string; strong?: boolean },
): number => {
  const padColor = opts?.padColor ?? "rgba(255, 255, 255, 0.28)";
  const strong = opts?.strong ?? false;
  const { pad, solid } = splitPaddedNumber(n, len);

  const baseFont = ctx.font;
  const sizeFamily = baseFont.replace(/^(?:\d{3}|bold|normal)\s+/i, "");
  const regularFont = `400 ${sizeFamily}`;
  const strongFont = `600 ${sizeFamily}`;

  // Prefer tabular figures so pad-aligned scores line up (Roboto is not mono).
  const prevVariant = (ctx as CanvasRenderingContext2D & {
    fontVariantNumeric?: string;
  }).fontVariantNumeric;
  try {
    (
      ctx as CanvasRenderingContext2D & { fontVariantNumeric?: string }
    ).fontVariantNumeric = "tabular-nums";
  } catch {
    /* older browsers */
  }

  ctx.font = regularFont;
  const grayW = pad ? ctx.measureText(pad).width : 0;
  ctx.font = strong ? strongFont : regularFont;
  const solidW = solid ? ctx.measureText(solid).width : 0;
  const total = grayW + solidW;

  let cursor =
    align === "center"
      ? x - total / 2
      : align === "right"
        ? x - total
        : x;
  const prevAlign = ctx.textAlign;
  ctx.textAlign = "left";

  if (pad) {
    ctx.font = regularFont;
    ctx.fillStyle = padColor;
    ctx.fillText(pad, cursor, y);
    cursor += grayW;
  }
  if (solid) {
    ctx.font = strong ? strongFont : regularFont;
    ctx.fillStyle = solidColor;
    ctx.fillText(solid, cursor, y);
  }

  ctx.textAlign = prevAlign;
  ctx.font = baseFont;
  try {
    (
      ctx as CanvasRenderingContext2D & { fontVariantNumeric?: string }
    ).fontVariantNumeric = prevVariant ?? "";
  } catch {
    /* ignore */
  }
  return total;
};

const displayFontFamily = (): string => {
  const locale = getLocale();
  if (locale === "zh") {
    return "MaokenAssortedSans, 'PingFang SC', 'Microsoft YaHei', sans-serif";
  }
  return "NishikiTeki, 'Hiragino Sans', 'Segoe UI', sans-serif";
};

const monoFontFamily = (): string =>
  "Roboto, Arial, Helvetica, sans-serif";

const waitFonts = async (): Promise<void> => {
  try {
    await Promise.race([
      document.fonts.ready,
      new Promise<void>((resolve) => {
        window.setTimeout(resolve, 800);
      }),
    ]);
  } catch {
    // draw with system fallbacks
  }
};

const roundRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) => {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
};

const drawCard = (summary: ScoreSummary): HTMLCanvasElement => {
  const canvas = document.createElement("canvas");
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d context unavailable");

  const bg = ctx.createLinearGradient(0, 0, 0, CARD_H);
  bg.addColorStop(0, "#141a34");
  bg.addColorStop(0.55, "#0e1224");
  bg.addColorStop(1, "#0a0d18");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  const glow = ctx.createRadialGradient(
    CARD_W * 0.5,
    CARD_H * 0.32,
    40,
    CARD_W * 0.5,
    CARD_H * 0.32,
    CARD_W * 0.55,
  );
  glow.addColorStop(0, "rgba(100, 200, 255, 0.16)");
  glow.addColorStop(1, "rgba(100, 200, 255, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  ctx.strokeStyle = "rgba(100, 200, 255, 0.45)";
  ctx.lineWidth = 5;
  roundRect(ctx, 18, 18, CARD_W - 36, CARD_H - 36, 32);
  ctx.stroke();

  const display = displayFontFamily();
  const mono = monoFontFamily();
  const leftX = PAD;
  const rightX = CARD_W - PAD;
  let y = PAD + 4;

  // —— Compact header: brand + mode ——
  ctx.fillStyle = "#ffffff";
  ctx.font = `400 40px ${display}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText(t("menu.title"), CARD_W / 2, y);
  y += 52;

  ctx.fillStyle = "rgba(220, 240, 255, 0.62)";
  ctx.font = `400 26px ${display}`;
  const modeText =
    summary.mode === "timeAttack" ? t("menu.timeAttack") : t("menu.endless");
  ctx.fillText(modeText, CARD_W / 2, y);
  y += 52;

  // —— Difficulty row (left) ——
  const diffColor =
    summary.difficulty >= 1 && summary.difficulty <= 7
      ? getDifficultyColor(summary.difficulty)
      : "#aaccff";
  const multText = formatMultiplier(summary.multiplier);

  ctx.textAlign = "left";
  ctx.fillStyle = diffColor;
  ctx.font = `400 56px ${display}`;
  ctx.fillText(summary.difficultyLabel, leftX, y);
  const diffW = ctx.measureText(summary.difficultyLabel).width;

  ctx.fillStyle = "rgba(220, 240, 255, 0.92)";
  ctx.font = `600 32px ${mono}`;
  ctx.fillText(multText, leftX + diffW + 18, y + 16);

  if (summary.entertainment) {
    const ent = t("hsTags.entertainment");
    ctx.font = `600 32px ${mono}`;
    const multW = ctx.measureText(multText).width;
    ctx.font = `400 24px ${display}`;
    const entW = ctx.measureText(ent).width + 28;
    const entX = leftX + diffW + 18 + multW + 18;
    ctx.fillStyle = "rgba(255, 220, 140, 0.12)";
    ctx.strokeStyle = "rgba(255, 220, 140, 0.45)";
    ctx.lineWidth = 2;
    roundRect(ctx, entX, y + 12, entW, 38, 18);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(255, 220, 140, 0.95)";
    ctx.fillText(ent, entX + 14, y + 18);
  }

  // —— Rank (right, large) ——
  const RANK_PX = 148;
  const rankTop = y - 18;
  ctx.textAlign = "right";
  if (summary.scoreRank) {
    const rankLetter = summary.scoreRank;
    ctx.fillStyle = getScoreRankColor(rankLetter);
    ctx.font = `400 ${RANK_PX}px ${display}`;
    ctx.shadowColor = getScoreRankGlow(rankLetter);
    ctx.shadowBlur = 28;
    ctx.fillText(rankLetter, rightX, rankTop);
    ctx.shadowBlur = 0;

    const letterW = ctx.measureText(rankLetter).width;
    const letterLeft = rightX - letterW;
    const caption = "SCORERANK";
    // Size caption to sit under the letter without anisotropic squash.
    ctx.font = `600 28px ${mono}`;
    const capW = ctx.measureText(caption).width;
    const targetW = letterW * 0.9;
    const s = capW > 0 ? Math.min(1, targetW / capW) : 1;
    ctx.save();
    ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
    ctx.textAlign = "center";
    ctx.translate(letterLeft + letterW / 2, rankTop + RANK_PX + 6);
    ctx.scale(s, s);
    ctx.fillText(caption, 0, 0);
    ctx.restore();
  } else {
    ctx.fillStyle = "rgba(255, 255, 255, 0.22)";
    ctx.font = `400 72px ${display}`;
    ctx.fillText("—", rightX, rankTop + 20);
  }

  // Clear the rank block before hero score.
  y = Math.max(y + 70, rankTop + RANK_PX + 44);

  // —— Hero score (dominates the card) ——
  ctx.textAlign = "center";
  ctx.font = `600 168px ${mono}`;
  ctx.shadowColor = "rgba(255, 107, 138, 0.35)";
  ctx.shadowBlur = 28;
  fillPaddedNumber(
    ctx,
    summary.score,
    SCORE_PAD,
    CARD_W / 2,
    y,
    "center",
    "#ff6b8a",
    { strong: true },
  );
  ctx.shadowBlur = 0;
  y += 180;

  // High score under hero
  const highLab = `${t("gameOver.highScore")} `;
  ctx.font = `400 32px ${display}`;
  const highLabW = ctx.measureText(highLab).width;
  ctx.font = `600 32px ${mono}`;
  const highNumW = ctx.measureText(
    padDigits(summary.highScore, SCORE_PAD),
  ).width;
  const highStart = CARD_W / 2 - (highLabW + highNumW) / 2;
  ctx.textAlign = "left";
  ctx.font = `400 32px ${display}`;
  ctx.fillStyle = "rgba(255, 255, 255, 0.52)";
  ctx.fillText(highLab, highStart, y);
  ctx.font = `600 32px ${mono}`;
  fillPaddedNumber(
    ctx,
    summary.highScore,
    SCORE_PAD,
    highStart + highLabW,
    y,
    "left",
    "rgba(255, 255, 255, 0.94)",
    { strong: true },
  );
  y += 52;

  if (summary.isNewRecord) {
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffd76a";
    ctx.font = `400 40px ${display}`;
    ctx.shadowColor = "rgba(255, 215, 106, 0.5)";
    ctx.shadowBlur = 16;
    ctx.fillText(t("gameOver.newRecord"), CARD_W / 2, y);
    ctx.shadowBlur = 0;
    y += 52;
  }

  // Divider
  y += 12;
  ctx.strokeStyle = "rgba(100, 200, 255, 0.22)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(PAD + 12, y);
  ctx.lineTo(CARD_W - PAD - 12, y);
  ctx.stroke();
  y += 36;

  // —— Bottom band: groups (left) | combo (right) ——
  // Stretch this band toward the footer so the card doesn't feel top-heavy.
  const groups = groupsForSummary(summary);
  const footerReserve = 56;
  const bottomTop = y;
  const bottomBottom = CARD_H - PAD - footerReserve;
  const comboTop = bottomTop;

  const groupCount = Math.max(1, groups.length);
  const groupRowH = Math.min(
    64,
    Math.max(48, Math.floor((bottomBottom - bottomTop - 8) / groupCount)),
  );
  const groupCountX = leftX + Math.floor(CARD_W * 0.48);

  ctx.textAlign = "left";
  if (groups.length === 0) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.32)";
    ctx.font = `400 36px ${display}`;
    ctx.fillText("—", leftX, bottomTop);
  } else {
    let gy = bottomTop;
    for (const g of groups) {
      ctx.fillStyle = getGroupDisplayColor(g);
      ctx.font = `400 36px ${display}`;
      ctx.textAlign = "left";
      ctx.fillText(g, leftX, gy);
      ctx.font = `600 44px ${mono}`;
      fillPaddedNumber(
        ctx,
        summary.groupClears[g] ?? 0,
        GROUP_CLEAR_PAD,
        groupCountX,
        gy,
        "left",
        "#ffffff",
        { strong: true },
      );
      gy += groupRowH;
    }
  }

  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
  ctx.font = `400 28px ${display}`;
  ctx.fillText(t("gameOver.maxCombo"), rightX, comboTop);
  ctx.font = `600 108px ${mono}`;
  fillPaddedNumber(
    ctx,
    summary.maxCombo,
    COMBO_PAD,
    rightX,
    comboTop + 48,
    "right",
    "#ffffff",
    { strong: true },
  );

  // Footer subtitle pinned to bottom
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
  ctx.font = `400 26px ${display}`;
  ctx.fillText(t("menu.subtitle"), CARD_W / 2, CARD_H - PAD - 10);

  return canvas;
};

const canvasToFile = (canvas: HTMLCanvasElement): Promise<File> =>
  new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("toBlob failed"));
        return;
      }
      resolve(
        new File([blob], "puzzle-sekai-score.png", { type: "image/png" }),
      );
    }, "image/png");
  });

const downloadFile = (file: File) => {
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
};

const canShareFiles = (file: File): boolean => {
  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
  };
  if (typeof nav.share !== "function") return false;
  if (typeof nav.canShare !== "function") return false;
  try {
    return nav.canShare({ files: [file] });
  } catch {
    return false;
  }
};

export const shareScoreCard = async (
  summary: ScoreSummary,
): Promise<void> => {
  await waitFonts();
  const canvas = drawCard(summary);
  const file = await canvasToFile(canvas);
  const text = t("gameOver.shareText", { score: summary.score });
  const title = t("menu.title");

  if (canShareFiles(file)) {
    try {
      await navigator.share({ files: [file], title, text });
      return;
    } catch (err) {
      const name =
        err && typeof err === "object" && "name" in err
          ? String((err as { name: unknown }).name)
          : "";
      if (name === "AbortError") return;
    }
  }

  downloadFile(file);
};
