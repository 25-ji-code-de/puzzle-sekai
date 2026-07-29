export {
  PASS_ISSUER,
  PASS_CLIENT_ID,
  GATEWAY_BASE,
  SYNC_PROJECT,
  AUTH_STORAGE_KEY,
  SYNC_META_KEY,
  NATIVE_REDIRECT_URI,
  isAuthConfigured,
  isNativeBuild,
  redirectUri,
} from "./config";
export { startLogin, handleRedirectCallback, logout } from "./oidc";
export type { LoginStartResult, CallbackResult } from "./oidc";
export { getAuthPending, setAuthPending, onAuthPendingChange } from "./pending";
export {
  loadSession,
  clearSession,
  getAccessToken,
  savePkcePending,
  loadPkcePending,
  clearPkcePending,
  PKCE_SESSION_KEY,
  type AuthSession,
  type AuthUser,
  type PkcePending,
} from "./session";
export {
  getAuthSnapshot,
  onAuthChange,
  notifyAuthChanged,
  displayNameOf,
  type AuthSnapshot,
} from "./user";
export {
  auth as sekaiAuth,
  AUTH_SCOPE,
  AUTH_STORAGE_PREFIX,
  migrateLegacyAuthBlob,
} from "./client";
