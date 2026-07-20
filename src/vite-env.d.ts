/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SEKAI_PASS_ISSUER?: string;
  readonly VITE_SEKAI_PASS_CLIENT_ID?: string;
  readonly VITE_GATEWAY_BASE?: string;
  readonly VITE_SYNC_PROJECT?: string;
  /** "1" when building for Tauri / Capacitor shells (see .env.native). */
  readonly VITE_NATIVE?: string;
  /** OAuth redirect_uri for native shells (custom URL scheme). */
  readonly VITE_NATIVE_REDIRECT_URI?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
