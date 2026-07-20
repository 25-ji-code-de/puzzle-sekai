import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor Android shell. iOS is intentionally omitted.
 * webDir is the Vite native build output (`yarn build:native`).
 */
const config: CapacitorConfig = {
  appId: "de.nightcord.puzzlesekai",
  appName: "Puzzle SEKAI",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
  android: {
    allowMixedContent: false,
    backgroundColor: "#1a1a1e",
  },
  plugins: {
    // Deep links for OAuth return: puzzlesekai://auth/callback
    // Intent filters are added under android/ after `cap add android`.
  },
};

export default config;
