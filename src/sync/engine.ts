/**
 * Sync meta + pull-merge-push engine.
 */
import { getAuthSnapshot, loadSession } from "../auth";
import { SYNC_META_KEY } from "../auth/config";
import { getStoragePort } from "../settings/storage";
import { fetchCloudSync, uploadCloudSync } from "./client";
import { exportLocalPicoData } from "./export-local";
import { importLocalPicoData } from "./import-local";
import { mergePicoData } from "./merge";
import type { PicoSyncData, SyncMeta } from "./types";
import { devWarn } from "../util/dev-log";
import { safeJsonParse } from "../util/json";
import { toNonNegInt } from "../util/number";

export type SyncStatus = "idle" | "syncing" | "ok" | "error";

type StatusListener = (s: SyncStatus) => void;
const statusListeners = new Set<StatusListener>();
let status: SyncStatus = "idle";
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let inFlight: Promise<void> | null = null;

export const getSyncStatus = (): SyncStatus => status;

export const onSyncStatus = (fn: StatusListener): (() => void) => {
  statusListeners.add(fn);
  return () => statusListeners.delete(fn);
};

const setStatus = (s: SyncStatus) => {
  status = s;
  for (const fn of statusListeners) {
    try {
      fn(s);
    } catch {
      /* ignore */
    }
  }
};

export const loadSyncMeta = (): SyncMeta => {
  const raw = getStoragePort().get(SYNC_META_KEY);
  if (!raw) return { version: 0, updatedAt: 0 };
  const o = safeJsonParse<Partial<SyncMeta>>(raw);
  if (!o) return { version: 0, updatedAt: 0 };
  return {
    version: toNonNegInt(o.version),
    updatedAt: toNonNegInt(o.updatedAt),
  };
};

export const saveSyncMeta = (meta: SyncMeta): void => {
  try {
    getStoragePort().set(SYNC_META_KEY, JSON.stringify(meta));
  } catch {
    /* ignore */
  }
};

const isLoggedIn = (): boolean => !!loadSession() && getAuthSnapshot().loggedIn;

const syncWithCloud = async (
  operation: "pullMergePush" | "pushLocal",
): Promise<boolean> => {
  if (!isLoggedIn()) return false;
  if (inFlight) {
    await inFlight;
    return status === "ok";
  }

  const run = (async () => {
    setStatus("syncing");
    try {
      // Always refresh the cloud version before upload to avoid stale writes.
      const cloud = await fetchCloudSync();
      if (!cloud) {
        setStatus("error");
        return;
      }
      const local = exportLocalPicoData();
      const merged = mergePicoData(local, cloud.data);
      importLocalPicoData(merged);
      const uploaded = await uploadCloudSync(merged, cloud.version);
      if (!uploaded) {
        setStatus("error");
        return;
      }
      // Re-import server echo (should match) and store version.
      importLocalPicoData(uploaded.data);
      saveSyncMeta({
        version: uploaded.version,
        updatedAt: uploaded.updated_at,
      });
      setStatus("ok");
    } catch (e) {
      devWarn(`[sync] ${operation}`, e);
      setStatus("error");
    }
  })();

  inFlight = run.finally(() => {
    inFlight = null;
  });
  await inFlight;
  return status === "ok";
};

/** GET cloud → merge with local → write local → POST merged. */
export const pullMergePush = (): Promise<boolean> =>
  syncWithCloud("pullMergePush");

/** Push after a run, merging against the latest cloud version first. */
export const pushLocal = (): Promise<boolean> => syncWithCloud("pushLocal");

/** Debounced push after game over (logged-in only). */
export const scheduleSyncPush = (delayMs = 800): void => {
  if (!isLoggedIn()) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    void pushLocal();
  }, delayMs);
};

/** @internal for tests */
export const _mergeOnly = (local: PicoSyncData, cloud: PicoSyncData | null) =>
  mergePicoData(local, cloud);
