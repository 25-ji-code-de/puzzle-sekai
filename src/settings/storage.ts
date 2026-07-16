/**
 * Storage port — single place for localStorage access.
 */
export interface StoragePort {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
  keys(): string[];
}

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
