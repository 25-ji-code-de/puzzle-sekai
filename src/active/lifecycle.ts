/**
 * Active-piece lifecycle registry.
 *
 * Controls / fall tickers / kinematic bodies are only cleaned up on natural land
 * unless the match tears down mid-fall. clearStage / restart must dispose every
 * live controller before destroying sprites, or key/swipe handlers keep reading
 * `sprite.transform` after PIXI nulls it.
 */
const disposers = new Set<() => void>();

/** Register a dispose callback; returns a one-shot that removes + runs it. */
export const registerActivePiece = (dispose: () => void): (() => void) => {
  let ran = false;
  const wrapped = () => {
    if (ran) return;
    ran = true;
    disposers.delete(wrapped);
    dispose();
  };
  disposers.add(wrapped);
  return wrapped;
};

/** Tear down every live active piece (controls, fall loop, kinematic body). */
export const disposeAllActivePieces = (): void => {
  for (const d of [...disposers]) d();
  disposers.clear();
};

/**
 * True when a PIXI display object is still safe to read pose from.
 * After `destroy()`, PIXI nulls `transform` — that is the public signal
 * (`_destroyed` is protected and not usable from our TS types).
 */
export const isDisplayAlive = (obj: {
  transform: unknown | null;
}): boolean => obj.transform != null;
