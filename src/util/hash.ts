/**
 * Shared FNV-1a 32-bit hash (pure, deterministic).
 * Used by daily seed and any other string→u32 mapping.
 */

/** FNV-1a 32-bit over UTF-16 code units (same as historical daily seed). */
export const fnv1a32 = (input: string): number => {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
};
