/**
 * Storage port — single place for localStorage access.
 *
 * For boot-time flags that must not import the full settings graph
 * (e.g. runtime.ts lowPerformance), prefer {@link readStorageJsonFlag}.
 */
export interface StoragePort {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
  keys(): string[];
}

/**
 * Read a boolean field from a JSON object stored under `key` without going
 * through the settings store. Safe for early boot (no import cycles).
 * Falls back to direct localStorage if the storage port is unavailable.
 */
export const readStorageJsonFlag = (
  key: string,
  field: string,
  fallback = false,
): boolean => {
  try {
    const raw =
      typeof localStorage !== "undefined" ? localStorage.getItem(key) : null;
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return parsed?.[field] === true;
  } catch {
    return fallback;
  }
};

export const localStoragePort: StoragePort = {
  get(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn("storage set failed", key, e);
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn("storage remove failed", key, e);
    }
  },
  keys() {
    try {
      const out: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k) out.push(k);
      }
      return out;
    } catch {
      return [];
    }
  },
};

/** Process-wide default; tests can replace via setStoragePort. */
let port: StoragePort = localStoragePort;

export const getStoragePort = (): StoragePort => port;
export const setStoragePort = (next: StoragePort): void => {
  port = next;
};
