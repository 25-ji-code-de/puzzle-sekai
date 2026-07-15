import { defineConfig, type Plugin } from "vite";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

/**
 * Production-only: rewrite PNG/JPEG imports under src/assets to compressed WebP.
 * Dev keeps original sources for fast HMR and easy editing.
 */
function assetsToWebp(options: { quality?: number } = {}): Plugin {
  const quality = options.quality ?? 85;
  return {
    name: "assets-to-webp",
    apply: "build",
    enforce: "pre",
    async load(id) {
      const file = id.split("?")[0];
      if (!/\.(png|jpe?g)$/i.test(file)) return null;
      if (file.includes(`${path.sep}node_modules${path.sep}`)) return null;

      // Slightly lower quality for large full-screen backgrounds.
      const base = path.basename(file).toLowerCase();
      const isFullScreen =
        base === "bg.png" || base === "welcome.png" || base === "gameover.png";
      const q = isFullScreen ? Math.min(quality, 80) : quality;

      const input = await fs.readFile(file);
      const output = await sharp(input)
        .webp({ quality: q, alphaQuality: 90, effort: 4 })
        .toBuffer();

      const name = `${path.basename(file, path.extname(file))}.webp`;
      const referenceId = this.emitFile({
        type: "asset",
        name,
        source: output,
      });
      return `export default import.meta.ROLLUP_FILE_URL_${referenceId};`;
    },
  };
}

export default defineConfig({
  base: "./",
  plugins: [assetsToWebp({ quality: 85 })],
});
