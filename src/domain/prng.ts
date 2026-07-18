/**
 * Match-scoped PRNG (mulberry32).
 *
 * Gameplay-affecting rolls (piece bag, item drop, columns, catalog, wonder
 * shuffle) must use {@link random} / {@link randomInt} / {@link chance} so a
 * seed can reproduce the sequence. Presentation-only noise (particles, BGM
 * pick, visual dust) may keep Math.random.
 *
 * Not a full bit-identical replay: timers, frame timing, and Rapier (if on)
 * still diverge. Seed is for daily-challenge / bug reproduction of the
 * discrete spawn stream.
 */

export type Rng = () => number;

/** Deterministic [0, 1) generator from a 32-bit seed. */
export const mulberry32 = (seed: number): Rng => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

let matchRng: Rng = Math.random;
let matchSeed: number | undefined;

/**
 * Install the match PRNG. Call once at match start (via initRNG).
 * @returns The seed actually used (generated if omitted).
 */
export const initMatchRng = (seed?: number): number => {
  const s =
    seed !== undefined
      ? seed >>> 0
      : (Date.now() ^ Math.floor(Math.random() * 0x100000000)) >>> 0;
  matchSeed = s;
  matchRng = mulberry32(s);
  return s;
};

/** Seed of the current match PRNG, if initMatchRng has run. */
export const getMatchSeed = (): number | undefined => matchSeed;

/** Reset to Math.random (menu / tests). */
export const clearMatchRng = (): void => {
  matchRng = Math.random;
  matchSeed = undefined;
};

/** Next float in [0, 1). */
export const random = (): number => matchRng();

/** Integer in [0, max). max <= 0 → 0. */
export const randomInt = (max: number): number => {
  if (max <= 0) return 0;
  return Math.floor(random() * max);
};

/** True with probability p (clamped conceptually to caller). */
export const chance = (p: number): boolean => random() < p;

/** Remove and return one random element (like splice(randomIndex, 1)[0]). */
export const takeRandom = <T>(list: T[]): T | undefined => {
  if (list.length === 0) return undefined;
  return list.splice(randomInt(list.length), 1)[0];
};
