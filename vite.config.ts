import { defineConfig, type Plugin } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import {
  SUBSET_FONTS,
  collectCharset,
  charsetHash,
  subsetWoff2,
} from "./scripts/subset-fonts.mjs";

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

/**
 * Production-only: subset the large CJK display fonts down to characters
 * actually used by UI/i18n. Dev keeps full faces. See scripts/subset-fonts.mjs.
 */
function subsetDisplayFonts(): Plugin {
  let charsetPromise: Promise<string> | null = null;
  const getCharset = () => {
    if (!charsetPromise) charsetPromise = collectCharset();
    return charsetPromise;
  };

  return {
    name: "subset-display-fonts",
    apply: "build",
    enforce: "pre",
    async load(id) {
      const file = id.split("?")[0];
      if (!/\.woff2$/i.test(file)) return null;
      if (file.includes(`${path.sep}node_modules${path.sep}`)) return null;

      const base = path.basename(file);
      if (!(base in SUBSET_FONTS)) return null;

      const charset = await getCharset();
      const input = await fs.readFile(file);
      const t0 = Date.now();
      const output = await subsetWoff2(input, charset);
      const hash = charsetHash(charset);
      const label = SUBSET_FONTS[base as keyof typeof SUBSET_FONTS];
      const pct = ((output.length / input.length) * 100).toFixed(1);
      this.info(
        `[subset-fonts] ${label}: ${(input.length / 1024).toFixed(0)} KB → ${(
          output.length / 1024
        ).toFixed(
          0,
        )} KB (${pct}%, ${[...charset].length} chars, hash ${hash}, ${
          Date.now() - t0
        }ms)`,
      );

      const name = base.replace(/\.woff2$/i, `.subset.woff2`);
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
  // Downlevel ES2020+ syntax (`?.`, `??`, etc.) so older Chrome/Edge/Firefox/
  // Safari/iOS browsers can parse the production bundle. Vite's default
  // (`modules`) leaves those operators intact.
  build: {
    target: "es2019",
    // Open-source: emit production source maps so DevTools can map minified
    // bundles back to original .ts / .scss. Maps are separate `*.map` files
    // (not inlined). Workbox globPatterns omit `*.map`, so PWA install size
    // is unaffected; maps only load when a developer opens DevTools.
    sourcemap: true,
    rollupOptions: {
      output: {
        // Split heavy vendors so the browser can parse/cache them separately
        // and so the entry chunk is smaller for Lighthouse bootup-time.
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (
            id.includes("pixi.js-legacy") ||
            id.includes("pixi.js" + path.sep) ||
            id.includes(`${path.sep}pixi.js${path.sep}`)
          ) {
            return "pixi";
          }
          // pixi package path variants
          if (/[/\\]pixi\.js[/\\]/.test(id) || /[/\\]@pixi[/\\]/.test(id)) {
            return "pixi";
          }
          if (id.includes("pixi-sound")) {
            return "pixi-sound";
          }
          if (id.includes("hammerjs")) {
            return "hammer";
          }
          if (id.includes("@dimforge/rapier2d") || id.includes("rapier2d-compat")) {
            return "rapier";
          }
        },
      },
    },
  },
  css: {
    // Dev: SCSS → original partials in browser Styles panel
    devSourcemap: true,
  },
  plugins: [
    assetsToWebp({ quality: 85 }),
    subsetDisplayFonts(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: [
        "favicon.ico",
        "favicon-16x16.png",
        "favicon-32x32.png",
        "favicon-48x48.png",
        "favicon-96x96.png",
        "apple-touch-icon.png",
      ],
      manifest: {
        name: "パズル⭐︎セカ | Puzzle × SEKAI",
        short_name: "Puzzle×SEKAI",
        description:
          "Project SEKAI 主题的方块消除游戏。收集成员、消除方块，挑战最高分！",
        lang: "zh-CN",
        theme_color: "#1a1a1e",
        background_color: "#1a1a1e",
        display: "standalone",
        orientation: "landscape",
        icons: [
          {
            src: "android-chrome-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "android-chrome-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "android-chrome-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // Precache the app shell + visual assets; heavy fonts and audio are
        // cached on first use to keep the install payload small.
        // Rapier (truePhysics) is ~1.7MB — runtime CacheFirst only, never precache.
        globPatterns: ["**/*.{js,css,html,webp,ico,png,svg}"],
        globIgnores: ["**/rapier-*.js", "**/rapier-*.js.map"],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /\.woff2$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "fonts",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
          {
            urlPattern: /\.mp3$/i,
            handler: "CacheFirst",
            options: {
              cacheName: "audio",
              expiration: {
                maxEntries: 80,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
              rangeRequests: true,
            },
          },
          {
            // truePhysics Rapier chunk (~1–2MB) — runtime cache, not precache
            urlPattern: /rapier/i,
            handler: "CacheFirst",
            options: {
              cacheName: "rapier",
              expiration: {
                maxEntries: 4,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
        ],
      },
    }),
  ],
});
