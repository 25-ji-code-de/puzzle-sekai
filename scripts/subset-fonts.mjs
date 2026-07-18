/**
 * Collect the set of characters the UI may render, then subset the large
 * CJK display fonts (Maoken / Nishiki) down to that set for production builds.
 *
 * Dev keeps the full faces for easy iteration. Production Vite transforms the
 * .woff2 imports via the plugin in vite.config.ts (same idea as assets-to-webp).
 *
 * Licenses: MaokenAssortedSans + Nishiki-teki are SIL OFL 1.1 (subsetting OK);
 * Roboto is Apache-2.0 and already tiny (latin subset), so it is left intact.
 *
 * Usage:
 *   yarn fonts:subset          # write report + sample files under .cache/font-subset
 *   yarn build                 # plugin subsets on the fly during vite build
 */
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import subsetFont from "subset-font";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "src");
const FONTS_DIR = path.join(SRC, "assets", "fonts");
const CACHE_DIR = path.join(ROOT, ".cache", "font-subset");

/** Fonts worth subsetting (filename → logical label). Skip mono — 18 KB already. */
export const SUBSET_FONTS = {
  "MaokenAssortedSans-Lite.woff2": "MaokenAssortedSans-Lite",
  "nishiki-teki.woff2": "Nishiki-teki",
};

/**
 * Characters that must always survive subsetting even if a scan misses them:
 * ASCII printables, common CJK punctuation, fullwidth digits, UI symbols.
 */
const SAFETY = (() => {
  let s = "";
  for (let c = 0x20; c <= 0x7e; c++) s += String.fromCharCode(c);
  s +=
    " …—–·×÷±" + // nbsp … — – · × ÷ ±
    "、。，．・：；？！｡｢｣､･" +
    "「」『』【】（）〔〕［］｛｝〈〉《》＜＞" +
    "〜～ー―☆★●○◆◇■□▲△▼▽♪※→←↑↓•‧·" +
    "⭐⭐︎✦✧✨" +
    "０１２３４５６７８９ＡＢＣＤＥＦ" +
    "〇一二三四五六七八九十百千万億" + // occasional numeric kanji
    "\n\r\t";
  return s;
})();

/** Recursively list files under dir matching predicate. */
async function walk(dir, pred, out = []) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === "assets" || ent.name === "node_modules") continue;
      // Still walk assets/chara? no — skip binary trees; only scan source.
      await walk(full, pred, out);
    } else if (pred(full)) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Pull string-literal contents out of a TS/JS source file.
 * Covers "...", '...', and static chunks of `...${}...`.
 * Not a full parser — good enough for i18n + UI copy.
 */
function extractStringLiterals(source) {
  const chunks = [];
  // Double / single quoted (no multiline)
  const q = /(['"])((?:\\.|(?!\1)[^\\])*)\1/g;
  let m;
  while ((m = q.exec(source))) chunks.push(m[2]);
  // Template literals — keep only the raw text between ${} holes
  const t = /`([^`\\]|\\.|\\[\s\S])*?`/g;
  while ((m = t.exec(source))) {
    const body = m[0].slice(1, -1);
    // Drop ${...} expressions
    chunks.push(body.replace(/\$\{[^}]*\}/g, ""));
  }
  return chunks;
}

/** Unescape common JS string escapes so we count real characters. */
function unescapeJs(str) {
  return str
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\u\{([0-9a-fA-F]+)\}/g, (_, h) =>
      String.fromCodePoint(parseInt(h, 16)),
    )
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) =>
      String.fromCharCode(parseInt(h, 16)),
    )
    .replace(/\\x([0-9a-fA-F]{2})/g, (_, h) =>
      String.fromCharCode(parseInt(h, 16)),
    )
    .replace(/\\([\\'"\`])/g, "$1");
}

/**
 * Build the full charset string (unique code points, order stable by code point).
 */
export async function collectCharset() {
  const set = new Set();
  const add = (text) => {
    for (const ch of text) {
      const cp = ch.codePointAt(0);
      // Skip most control chars except the ones we explicitly keep in SAFETY
      if (cp < 0x20 && ch !== "\n" && ch !== "\r" && ch !== "\t") continue;
      set.add(ch);
    }
  };

  add(SAFETY);

  // Prefer i18n locales (main copy) + the rest of src for hard-coded labels.
  const files = await walk(SRC, (f) =>
    /\.(ts|tsx|js|jsx|html|scss|css)$/.test(f),
  );

  for (const extra of [
    path.join(ROOT, "index.html"),
    path.join(ROOT, "public", "404.html"),
  ]) {
    try {
      await fs.access(extra);
      files.push(extra);
    } catch {
      /* optional path */
    }
  }

  for (const file of files) {
    const src = await fs.readFile(file, "utf8");
    // i18n / most UI: string literals
    for (const lit of extractStringLiterals(src)) {
      add(unescapeJs(lit));
    }
    // HTML bodies are not string literals — include raw markup text.
    if (file.endsWith(".html")) add(src);
  }

  // Stable output: sort by code point
  return [...set].sort((a, b) => a.codePointAt(0) - b.codePointAt(0)).join("");
}

export function charsetHash(charset) {
  return createHash("sha256")
    .update(charset, "utf8")
    .digest("hex")
    .slice(0, 12);
}

/**
 * Subset one font buffer down to charset. Returns woff2 bytes.
 */
export async function subsetWoff2(inputBuffer, charset) {
  return subsetFont(inputBuffer, charset, {
    targetFormat: "woff2",
    // Keep layout tables that affect metrics so fallback overrides still match.
    preserveNameIds: [0, 1, 2, 3, 4, 5, 6, 13, 14], // copyright..license URL
  });
}

/** CLI entry: write charset report + subset files into .cache/font-subset. */
async function main() {
  const charset = await collectCharset();
  const hash = charsetHash(charset);
  await fs.mkdir(CACHE_DIR, { recursive: true });
  await fs.writeFile(path.join(CACHE_DIR, "charset.txt"), charset, "utf8");
  await fs.writeFile(
    path.join(CACHE_DIR, "charset-meta.json"),
    JSON.stringify(
      {
        hash,
        uniqueChars: [...charset].length,
        generatedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
    "utf8",
  );

  console.log(
    `[fonts:subset] charset ${[...charset].length} chars (hash ${hash})`,
  );

  for (const [file, label] of Object.entries(SUBSET_FONTS)) {
    const inputPath = path.join(FONTS_DIR, file);
    const input = await fs.readFile(inputPath);
    const t0 = Date.now();
    const out = await subsetWoff2(input, charset);
    const outName = file.replace(/\.woff2$/i, `.${hash}.woff2`);
    const outPath = path.join(CACHE_DIR, outName);
    await fs.writeFile(outPath, out);
    const pct = ((out.length / input.length) * 100).toFixed(1);
    console.log(
      `[fonts:subset] ${label}: ${(input.length / 1024).toFixed(0)} KB → ${(
        out.length / 1024
      ).toFixed(0)} KB (${pct}%) in ${Date.now() - t0}ms`,
    );
    console.log(`               ${outPath}`);
  }
}

// Run when executed directly: node scripts/subset-fonts.mjs
const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
