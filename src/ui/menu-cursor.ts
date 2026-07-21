/**
 * Pure high-score list cursor math (no settings / i18n / DOM).
 */

/**
 * Next index when cycling a high-score list.
 * Pure: first click jumps to item after current best, then +1 wrap.
 */
export const nextHighScoreCursor = (
  listLength: number,
  cursor: number | null,
  bestIndex: number,
): number | null => {
  if (listLength <= 1) return cursor;
  if (cursor == null) {
    const i = bestIndex >= 0 ? bestIndex : 0;
    return (i + 1) % listLength;
  }
  return (cursor + 1) % listLength;
};
