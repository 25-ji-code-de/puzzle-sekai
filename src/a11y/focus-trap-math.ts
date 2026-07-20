/**
 * Pure focus-trap tab-order helpers (no DOM required for tests).
 */

/**
 * Next element index when Tab / Shift+Tab wraps inside a trap.
 * Returns null if list is empty (caller should focus root).
 */
export const nextTabIndex = (
  listLength: number,
  activeIndex: number,
  shiftKey: boolean,
): number | null => {
  if (listLength <= 0) return null;
  if (listLength === 1) return 0;
  if (shiftKey) {
    if (activeIndex <= 0) return listLength - 1;
    return activeIndex - 1;
  }
  if (activeIndex < 0 || activeIndex >= listLength - 1) return 0;
  return activeIndex + 1;
};

/**
 * Whether Tab should wrap: active is outside the list, or at the edge.
 */
export const shouldWrapTab = (
  listLength: number,
  activeIndex: number,
  shiftKey: boolean,
): boolean => {
  if (listLength === 0) return true;
  if (activeIndex < 0) return true;
  if (shiftKey) return activeIndex === 0;
  return activeIndex === listLength - 1;
};
