/**
 * Native shell helpers (deep links for OAuth return + window chrome).
 * Only loaded when VITE_NATIVE=1.
 */
export {
  bootstrapNativeDeepLinks,
  injectOAuthCallback,
  isOAuthCallbackUrl,
} from "./deep-link";
export {
  openExternalUrl,
  applyWindowDisplayMode,
  applyImmersiveSystemUi,
  type WindowDisplayMode,
} from "./shell";
