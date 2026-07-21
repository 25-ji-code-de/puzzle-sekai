/**
 * Lazy-load Rapier2D WASM for truePhysics.
 * Idempotent; never statically imported from boot shell.
 */
import { devWarn } from "../../util/dev-log";

export type RapierMod = typeof import("@dimforge/rapier2d-compat");

let mod: RapierMod | null = null;
let initPromise: Promise<RapierMod> | null = null;
let loadFailed = false;

/** True after a successful init in this session. */
export const isRapierReady = (): boolean => !!mod;

/** True if WASM/module load already failed (session-local). */
export const isRapierLoadFailed = (): boolean => loadFailed;

/** Download + RAPIER.init(); idempotent. Rejects once on hard failure. */
export const loadRapier = (): Promise<RapierMod> => {
  if (mod) return Promise.resolve(mod);
  if (loadFailed) {
    return Promise.reject(new Error("Rapier load previously failed"));
  }
  if (!initPromise) {
    initPromise = import("@dimforge/rapier2d-compat")
      .then(async (RAPIER) => {
        // compat build: init() boots WASM; may be a no-op if already inited
        await RAPIER.init();
        mod = RAPIER;
        return RAPIER;
      })
      .catch((err) => {
        loadFailed = true;
        initPromise = null;
        devWarn("[truePhysics] Rapier failed to load", err);
        throw err;
      });
  }
  return initPromise;
};

/** Best-effort warm (settings toggle / boot). */
export const warmRapier = (): void => {
  if (mod || loadFailed) return;
  void loadRapier().catch(() => {
    /* logged in loadRapier */
  });
};
