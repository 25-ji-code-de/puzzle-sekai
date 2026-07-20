import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor Android shell. iOS is intentionally omitted.
 * webDir is the Vite native build output (`yarn build:native`).
 */
const config: CapacitorConfig = {
  appId: "net.de5.nightcord.puzzlesekai",
  appName: "Puzzle SEKAI",
  webDir: "dist",
  server: {
    // https keeps Web Crypto / secure-context APIs available.
    androidScheme: "https",
  },
  android: {
    allowMixedContent: false,
    backgroundColor: "#1a1a1e",
  },
  plugins: {
    // Do NOT enable global CapacitorHttp — it patches fetch/XHR and can break
    // large binary audio loads (BGM/voice via pixi-sound). OAuth uses explicit
    // CapacitorHttp.request in src/native/http.ts instead.
    CapacitorHttp: {
      enabled: false,
    },
  },
};

export default config;
