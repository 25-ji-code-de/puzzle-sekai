/**
 * Auth UI snapshot + listeners.
 */
import { loadSession, type AuthUser } from "./session";

export type AuthSnapshot = {
  loggedIn: boolean;
  user: AuthUser | null;
};

type Listener = (snap: AuthSnapshot) => void;

const listeners = new Set<Listener>();

export const getAuthSnapshot = (): AuthSnapshot => {
  const session = loadSession();
  return {
    loggedIn: !!session,
    user: session?.user ?? null,
  };
};

export const onAuthChange = (fn: Listener): (() => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};

export const notifyAuthChanged = (): void => {
  const snap = getAuthSnapshot();
  for (const fn of listeners) {
    try {
      fn(snap);
    } catch (e) {
      console.warn("[auth] listener", e);
    }
  }
};

/**
 * Prefer trimmed displayName; fall back to username.
 * Pure helper so UI formatting is testable without a session.
 */
export const displayNameFromParts = (
  displayName?: string | null,
  username?: string | null,
): string => {
  const d = displayName?.trim();
  if (d) return d;
  return username?.trim() || "";
};

export const displayNameOf = (user: AuthUser | null): string => {
  if (!user) return "";
  return displayNameFromParts(user.displayName, user.username);
};
