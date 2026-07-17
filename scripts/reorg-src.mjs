/**
 * One-shot source reorganization:
 * 1. Move flat src/*.ts into domain folders
 * 2. Rewrite relative imports for new depths
 * 3. Leave content splits to follow-up steps
 *
 * Run from repo root: node scripts/reorg-src.mjs
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "src");

/** old baseless module id (without .ts) -> new path relative to src/ */
const MOVE_MAP = {
  config: "config/index",
  utils: "utils/coords",
  "character-data": "characters/data",
  avatar: "characters/avatar",
  items: "items/index",
  "fun-modes": "fun/modes",
  "fun-effects": "fun/effects",
  clear: "board/clear-rules",
  "board-core": "board/core",
  "board-physics": "board/physics",
  "board-contact": "board/contact",
  "board-clear": "board/clear-flow",
  "board-fun": "board/fun/index",
  board: "board/index",
  piece: "piece/index",
  nenerobo: "piece/nenerobo",
  objects: "props/objects",
  score: "score/index",
  settings: "settings/index",
  "settings-panel": "settings/panel",
  bgm: "audio/bgm",
  fonts: "ui/fonts",
  display: "ui/display",
  "menu-utils": "ui/menu-utils",
  "menu-overlays": "ui/overlays",
  "pause-menu": "ui/pause-menu",
  "game-over-menu": "ui/game-over-menu",
  welcome: "ui/welcome",
  states: "game/states",
};

/** Files that stay put (entry + assets + i18n + scss + d.ts) */
const STAY = new Set(["index.ts", "style.scss", "assets.d.ts", "types.d.ts"]);

function toPosix(p) {
  return p.split(path.sep).join("/");
}

function dirnameOfModule(modPath) {
  // "board/core" -> "board", "config/index" -> "config", "score/index" -> "score"
  const parts = modPath.split("/");
  parts.pop();
  return parts.join("/") || ".";
}

function relativeImport(fromDir, toMod) {
  // fromDir: "board" or "ui" or "." (src root)
  // toMod: "utils/coords" or "board/clear-flow" or "i18n" or "index" (entry)
  const fromAbs = fromDir === "." ? "" : fromDir;
  const toParts = toMod.split("/");
  const toFile = toParts.pop();
  const toDir = toParts.join("/");

  let rel = path.posix.relative(fromAbs || ".", toDir || ".");
  if (!rel || rel === "") rel = ".";
  let result = rel === "." ? `./${toFile}` : `${rel}/${toFile}`;

  // Prefer directory imports for */index
  if (result.endsWith("/index")) {
    result = result.slice(0, -"/index".length) || ".";
    if (!result.startsWith(".")) result = `./${result}`;
  }
  if (!result.startsWith(".")) result = `./${result}`;
  return result;
}

function rewriteImportSource(spec, fromDir) {
  // handle side-effect and value imports
  // only rewrite relative imports starting with ./ or ../
  if (!spec.startsWith(".")) return null;

  // assets, style, i18n stay under src
  if (
    spec.startsWith("./assets/") ||
    spec.startsWith("./i18n") ||
    spec === "./style.scss" ||
    spec.startsWith("./assets")
  ) {
    // depth-adjust only
    if (fromDir === ".") return null;
    const depth = fromDir.split("/").length;
    const prefix = "../".repeat(depth);
    return prefix + spec.slice(2); // strip ./
  }

  // from "." meaning index.ts (entry)
  if (spec === "." || spec === "./") {
    if (fromDir === ".") return null;
    const depth = fromDir.split("/").length;
    return "../".repeat(depth) + "index";
  }

  // strip leading ./ or ../ and .ts
  let cleaned = spec.replace(/^\.\//, "");
  // handle already-nested relative (shouldn't happen in flat layout)
  if (cleaned.startsWith("../")) {
    // leave alone if already multi-level (pre-existing)
    return null;
  }
  cleaned = cleaned.replace(/\.ts$/, "");

  // map known modules
  const mapped = MOVE_MAP[cleaned];
  if (mapped) {
    return relativeImport(fromDir, mapped);
  }

  // i18n stays
  if (cleaned === "i18n" || cleaned.startsWith("i18n/")) {
    if (fromDir === ".") return null;
    const depth = fromDir.split("/").length;
    return "../".repeat(depth) + cleaned;
  }

  return null;
}

function rewriteFileContent(content, fromDir) {
  // rewrite import/export ... from "..."
  return content.replace(
    /(\bfrom\s+|import\s*\(\s*)(["'])([^"']+)\2/g,
    (full, prefix, quote, spec) => {
      const next = rewriteImportSource(spec, fromDir);
      if (!next) return full;
      return `${prefix}${quote}${next}${quote}`;
    },
  );
}

async function ensureDir(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

async function main() {
  const moved = [];

  for (const [oldId, newRel] of Object.entries(MOVE_MAP)) {
    const oldPath = path.join(SRC, `${oldId}.ts`);
    const newPath = path.join(SRC, `${newRel}.ts`);
    try {
      await fs.access(oldPath);
    } catch {
      // already moved or missing
      continue;
    }
    const raw = await fs.readFile(oldPath, "utf8");
    const fromDir = dirnameOfModule(newRel);
    const rewritten = rewriteFileContent(raw, fromDir === "" ? "." : fromDir);
    await ensureDir(newPath);
    await fs.writeFile(newPath, rewritten, "utf8");
    await fs.unlink(oldPath);
    moved.push(`${oldId}.ts -> ${newRel}.ts`);
  }

  // rewrite index.ts imports (stays at src root)
  const indexPath = path.join(SRC, "index.ts");
  const indexRaw = await fs.readFile(indexPath, "utf8");
  const indexNew = rewriteFileContent(indexRaw, ".");
  await fs.writeFile(indexPath, indexNew, "utf8");
  moved.push("index.ts (imports rewritten)");

  // utils/index.ts barrel
  const utilsIndex = path.join(SRC, "utils/index.ts");
  await ensureDir(utilsIndex);
  await fs.writeFile(utilsIndex, `export * from "./coords";\n`, "utf8");

  // characters/index optional
  await fs.writeFile(
    path.join(SRC, "characters/index.ts"),
    `export * from "./data";\nexport * from "./avatar";\n`,
    "utf8",
  );

  // fun/index
  await fs.writeFile(
    path.join(SRC, "fun/index.ts"),
    `export * from "./modes";\nexport * from "./effects";\n`,
    "utf8",
  );

  console.log("Moved:");
  for (const m of moved) console.log("  ", m);
  console.log("Done mechanical reorg.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
