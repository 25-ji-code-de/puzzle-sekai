const AUTH_PENDING_KEY = "puzzleSekaiAuthPending";

type AuthPendingHandler = (pending: boolean) => void;

const handlers = new Set<AuthPendingHandler>();

export const getAuthPending = (): boolean => {
  try {
    return sessionStorage.getItem(AUTH_PENDING_KEY) === "1";
  } catch {
    return false;
  }
};

export const setAuthPending = (pending: boolean): void => {
  try {
    if (pending) sessionStorage.setItem(AUTH_PENDING_KEY, "1");
    else sessionStorage.removeItem(AUTH_PENDING_KEY);
  } catch {
    /* private mode */
  }

  for (const handler of handlers) handler(pending);
};

export const onAuthPendingChange = (
  handler: AuthPendingHandler,
): (() => void) => {
  handlers.add(handler);
  return () => handlers.delete(handler);
};
