/**
 * Local profiling build: skip WebP rewrite + CJK font subset.
 * Does NOT produce shippable assets (full fonts / unoptimized images).
 *
 *   yarn build:fast
 *   # or: PUZZLE_SEKAI_FAST_BUILD=1 yarn build
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const viteBin = path.join(root, "node_modules", "vite", "bin", "vite.js");

const result = spawnSync(process.execPath, [viteBin, "build"], {
  cwd: root,
  stdio: "inherit",
  env: {
    ...process.env,
    PUZZLE_SEKAI_FAST_BUILD: "1",
  },
});

process.exit(result.status ?? 1);
