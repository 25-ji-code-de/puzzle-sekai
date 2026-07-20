/**
 * Bandwidth scheduling for match start.
 *
 * While "visual critical" is active, non-essential audio downloads should wait
 * so the first piece texture can claim the pipe on slow networks.
 *
 * Leave is driven by first preview/texture readiness (or a hard deadline).
 */
export type NetworkHints = {
  /** User enabled data-saver. */
  saveData: boolean;
  /** Effective type is slow-2g / 2g / 3g (or unknown connection with saveData). */
  slow: boolean;
  /** Very constrained: saveData or 2g-class. */
  verySlow: boolean;
};

export type NavConnection = {
  saveData?: boolean;
  effectiveType?: string;
};

const readConnection = (): NavConnection | null => {
  try {
    const nav = navigator as Navigator & { connection?: NavConnection };
    return nav.connection ?? null;
  } catch {
    return null;
  }
};

/** Pure mapping from Network Information API fields (testable without navigator). */
export const networkHintsFromConnection = (
  c: NavConnection | null | undefined,
): NetworkHints => {
  const saveData = c?.saveData === true;
  const et = (c?.effectiveType ?? "").toLowerCase();
  const verySlow = saveData || et === "slow-2g" || et === "2g";
  const slow = verySlow || et === "3g";
  return { saveData, slow, verySlow };
};

export const getNetworkHints = (): NetworkHints =>
  networkHintsFromConnection(readConnection());

/** Default hold window — long enough for one PNG on slow 3G, not forever. */
const DEFAULT_DEADLINE_MS = 4000;
const SLOW_DEADLINE_MS = 6000;

let critical = false;
let deadlineTimer: ReturnType<typeof setTimeout> | null = null;
let waiters: Array<() => void> = [];

const flushWaiters = () => {
  const list = waiters;
  waiters = [];
  for (const w of list) w();
};

export const isVisualCritical = (): boolean => critical;

/**
 * Hold noncritical audio downloads until leave (or deadline).
 * Re-enter is a no-op if already critical (extends deadline).
 */
export const enterVisualCritical = (deadlineMs?: number): void => {
  const hints = getNetworkHints();
  const ms =
    deadlineMs ?? (hints.verySlow ? SLOW_DEADLINE_MS : DEFAULT_DEADLINE_MS);

  critical = true;
  if (deadlineTimer) {
    clearTimeout(deadlineTimer);
    deadlineTimer = null;
  }
  deadlineTimer = setTimeout(() => {
    leaveVisualCritical();
  }, ms);
};

/** Release audio downloads. Safe to call multiple times. */
export const leaveVisualCritical = (): void => {
  if (deadlineTimer) {
    clearTimeout(deadlineTimer);
    deadlineTimer = null;
  }
  if (!critical && waiters.length === 0) return;
  critical = false;
  flushWaiters();
};

/**
 * Resolves when noncritical audio may start downloading.
 * Immediate if not in a visual-critical window.
 */
export const whenAudioAllowed = (): Promise<void> => {
  if (!critical) return Promise.resolve();
  return new Promise((resolve) => {
    waiters.push(resolve);
  });
};
