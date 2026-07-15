import { defineConfig, type Plugin } from "vite";
import { VitePWA } from "vite-plugin-pwa";
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
  plugins: [
    assetsToWebp({ quality: 85 }),
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
          "A Puyo-puyo-inspired puzzle game with Project SEKAI characters.",
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
        globPatterns: ["**/*.{js,css,html,webp,ico,png,svg}"],
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
        ],
      },
    }),
  ],
});
