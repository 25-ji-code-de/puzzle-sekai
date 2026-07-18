/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SEKAI_PASS_ISSUER?: string;
  readonly VITE_SEKAI_PASS_CLIENT_ID?: string;
  readonly VITE_GATEWAY_BASE?: string;
  readonly VITE_SYNC_PROJECT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
