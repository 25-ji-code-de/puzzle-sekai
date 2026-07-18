/**
 * Recompute alpha-weighted COM table → src/board/dynamics/com-table.ts
 * Usage: node scripts/gen-com-table.mjs
 *
 * Formula: for each texel with alpha ≥ 24, weight = a/255;
 * COM in texture space → body-local (anchor origin, +Y down).
 */
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const ALPHA = 24;
const BOX = 133;
const charaDir = path.join(root, "src/assets/chara");
const itemsDir = path.join(root, "src/assets/objects");

const cell2 = [
  "ichika",
  "saki",
  "honami",
  "shiho",
  "miku_leo",
  "minori",
  "haruka",
  "airi",
  "shizuku",
  "miku_mmj",
  "kohane",
  "an",
  "akito",
  "toya",
  "miku_vbs",
  "tsukasa",
  "emu",
  "nene",
  "rui",
  "miku_wxs",
  "kanade",
  "mafuyu",
  "ena",
  "mizuki",
  "miku_25ji",
];
const big2x2 = ["nenerobo", "mikudayo"];

async function comOf(file, anchorX, anchorY, dispW, dispH) {
  const { data, info } = await sharp(file)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  let m = 0;
  let mx = 0;
  let my = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const a = data[(y * w + x) * 4 + 3];
      if (a < ALPHA) continue;
      const weight = a / 255;
      m += weight;
      mx += weight * (x + 0.5);
      my += weight * (y + 0.5);
    }
  }
  if (m <= 0) return null;
  const cx = mx / m;
  const cy = my / m;
  const scaleX = dispW / w;
  const scaleY = dispH / h;
  return {
    x: +(cx * scaleX - anchorX * dispW).toFixed(2),
    y: +(cy * scaleY - anchorY * dispH).toFixed(2),
  };
}

const entries = [];

for (const name of cell2) {
  const file = path.join(charaDir, `${name}.png`);
  const meta = await sharp(file).metadata();
  const com = await comOf(file, 0.5, 0.25, meta.width, meta.height);
  entries.push([name, com]);
}
for (const name of big2x2) {
  const file = path.join(charaDir, `${name}.png`);
  const meta = await sharp(file).metadata();
  const com = await comOf(file, 0.5, 0.5, meta.width, meta.height);
  entries.push([name, com]);
}
{
  const file = path.join(charaDir, "emu.png");
  const com = await comOf(file, 0.5, 0.5, BOX, BOX);
  entries.push(["emu_shrunk", com]);
}
for (const f of fs
  .readdirSync(itemsDir)
  .filter((x) => /^material\d+\.png$/i.test(x))) {
  const file = path.join(itemsDir, f);
  const meta = await sharp(file).metadata();
  const com = await comOf(file, 0.5, 0.5, meta.width, meta.height);
  entries.push([f.replace(/\.png$/i, ""), com]);
}

// Keep the hand-written lookup helpers; only refresh COM_BY_ASSET numbers.
const tablePath = path.join(root, "src/board/dynamics/com-table.ts");
let src = fs.readFileSync(tablePath, "utf8");
const start = src.indexOf("export const COM_BY_ASSET");
const end = src.indexOf("/** Kind defaults");
if (start < 0 || end < 0) {
  console.error("Could not find COM_BY_ASSET block in com-table.ts");
  process.exit(1);
}
const block = [
  "export const COM_BY_ASSET: Readonly<Record<string, ComOffset>> = {",
  ...entries.map(
    ([k, com]) => `  ${JSON.stringify(k)}: { x: ${com.x}, y: ${com.y} },`,
  ),
  "};",
  "",
  "",
].join("\n");
src = src.slice(0, start) + block + src.slice(end);
fs.writeFileSync(tablePath, src);
console.log(`Updated ${entries.length} COM entries in com-table.ts`);
