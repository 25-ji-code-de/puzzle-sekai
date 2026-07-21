/**
 * Small pure list / number helpers.
 */

/** Index of the value in `list` nearest to `target`. Assumes list is non-empty. */
export const nearestIndex = (
  list: readonly number[],
  target: number,
): number => {
  let idx = 0;
  let best = Math.abs(list[0]! - target);
  for (let i = 1; i < list.length; i++) {
    const d = Math.abs(list[i]! - target);
    if (d < best) {
      best = d;
      idx = i;
    }
  }
  return idx;
};
