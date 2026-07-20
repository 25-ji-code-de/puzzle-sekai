/**
 * Native shell helpers (deep links for OAuth return).
 * Only loaded when VITE_NATIVE=1.
 */
export {
  bootstrapNativeDeepLinks,
  injectOAuthCallback,
  isOAuthCallbackUrl,
} from "./deep-link";
