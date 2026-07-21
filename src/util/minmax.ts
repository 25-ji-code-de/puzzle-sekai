/**
 * Finite number array extremes (pure).
 */

/** Maximum of `nums`; empty → `empty` (default -Infinity). */
export const maxOf = (
  nums: readonly number[],
  empty: number = Number.NEGATIVE_INFINITY,
): number => {
  if (!nums.length) return empty;
  let m = nums[0]!;
  for (let i = 1; i < nums.length; i++) {
    if (nums[i]! > m) m = nums[i]!;
  }
  return m;
};

/** Minimum of `nums`; empty → `empty` (default +Infinity). */
export const minOf = (
  nums: readonly number[],
  empty: number = Number.POSITIVE_INFINITY,
): number => {
  if (!nums.length) return empty;
  let m = nums[0]!;
  for (let i = 1; i < nums.length; i++) {
    if (nums[i]! < m) m = nums[i]!;
  }
  return m;
};
