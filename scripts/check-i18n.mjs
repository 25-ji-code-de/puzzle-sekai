/**
 * Fail if nested string-leaf paths differ across en / ja / zh locale trees.
 * Run via `yarn i18n:check` (also part of `yarn ci`).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const localesDir = path.join(root, "src", "i18n", "locales");

/** Strip TS so Node can import locale modules without a transpile step. */
function loadLocaleTs(filePath, exportName) {
  let src = fs.readFileSync(filePath, "utf8");
  // `export const en = { ... };` → `export const en = { ... };` (already ESM)
  // Drop pure type-only noise if any; keep object literal.
  src = src.replace(/^export\s+const\s+(\w+)\s*=\s*/, "export const $1 = ");
  const tmp = path.join(
    root,
    ".cache",
    `i18n-check-${exportName}-${Date.now()}.mjs`,
  );
  fs.mkdirSync(path.dirname(tmp), { recursive: true });
  fs.writeFileSync(tmp, src, "utf8");
  return import(pathToFileURL(tmp).href).then(async (mod) => {
    try {
      fs.unlinkSync(tmp);
    } catch {
      /* ignore */
    }
    return mod[exportName];
  });
}

function leafPaths(obj, prefix = "") {
  const out = [];
  if (obj === null || typeof obj !== "object") {
    if (typeof obj === "string" && prefix) out.push(prefix);
    return out;
  }
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string") out.push(p);
    else if (v && typeof v === "object") out.push(...leafPaths(v, p));
  }
  return out.sort();
}

const locales = [
  { file: "en.ts", name: "en" },
  { file: "ja.ts", name: "ja" },
  { file: "zh.ts", name: "zh" },
];

const trees = {};
for (const { file, name } of locales) {
  trees[name] = await loadLocaleTs(path.join(localesDir, file), name);
}

const sets = Object.fromEntries(
  Object.entries(trees).map(([name, tree]) => [name, new Set(leafPaths(tree))]),
);

const base = "en";
const baseSet = sets[base];
let failed = false;

for (const name of Object.keys(sets)) {
  if (name === base) continue;
  const other = sets[name];
  const missing = [...baseSet].filter((k) => !other.has(k));
  const extra = [...other].filter((k) => !baseSet.has(k));
  if (missing.length || extra.length) {
    failed = true;
    console.error(`[i18n] ${name} diverges from ${base}:`);
    for (const k of missing) console.error(`  - missing: ${k}`);
    for (const k of extra) console.error(`  + extra:   ${k}`);
  }
}

const counts = Object.fromEntries(
  Object.entries(sets).map(([n, s]) => [n, s.size]),
);
console.log(
  `[i18n] leaf keys — ${Object.entries(counts)
    .map(([n, c]) => `${n}=${c}`)
    .join(", ")}`,
);

if (failed) {
  process.exit(1);
}
console.log("[i18n] OK — locale trees match");
