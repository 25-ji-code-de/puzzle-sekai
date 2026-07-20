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
    // https scheme keeps Web Crypto / secure-context APIs available.
    // CapacitorHttp (enabled below) bypasses CORS for IdP token exchange.
    androidScheme: "https",
  },
  android: {
    allowMixedContent: false,
    backgroundColor: "#1a1a1e",
  },
  plugins: {
    CapacitorHttp: {
      // Native HTTP for all fetch/XHR — IdP + gateway calls skip CORS on
      // the Capacitor origin (https://localhost).
      enabled: true,
    },
  },
};

export default config;
