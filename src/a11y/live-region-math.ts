/**
 * Pure helpers for a11y live-region text (no DOM).
 */

/** True if the string should be spoken (non-empty after trim). */
export const shouldSpeakText = (text: string): boolean =>
  text.trim().length > 0;

/**
 * Double-write pattern: clear then set so identical consecutive strings
 * still fire on some assistive tech. Returns the trimmed message or "".
 */
export const prepareLiveMessage = (text: string): string => text.trim();
