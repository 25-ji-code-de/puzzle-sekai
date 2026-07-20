/**
 * String padding helpers (pure).
 */

/** Left-pad with zeros to `len` (non-negative floor of n). */
export const padStartDigits = (n: number, len: number): string =>
  String(Math.max(0, Math.floor(n))).padStart(len, "0");

/**
 * Split a zero-padded number into dim leading zeros + solid significant digits.
 * When value is 0, the final "0" stays solid (still significant).
 */
export const splitPaddedDigits = (
  n: number,
  len: number,
): { pad: string; solid: string } => {
  const padded = padStartDigits(n, len);
  const first = padded.search(/[^0]/);
  const split = first === -1 ? Math.max(0, padded.length - 1) : first;
  return { pad: padded.slice(0, split), solid: padded.slice(split) };
};
