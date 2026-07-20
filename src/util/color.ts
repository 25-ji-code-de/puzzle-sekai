/**
 * Shared color string helpers (pure, no DOM).
 */

/** Parse `#rrggbb` / `rrggbb` → RGB components, or null. */
export const parseHexRgb = (
  hex: string,
): { r: number; g: number; b: number } | null => {
  const raw = hex.replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(raw)) return null;
  const n = parseInt(raw, 16);
  if (Number.isNaN(n)) return null;
  return {
    r: (n >> 16) & 255,
    g: (n >> 8) & 255,
    b: n & 255,
  };
};

/** Convert `#rrggbb` → 0xrrggbb for PixiJS (invalid → white). */
export const hexToPixi = (hex: string): number => {
  const rgb = parseHexRgb(hex);
  if (!rgb) return 0xffffff;
  return (rgb.r << 16) | (rgb.g << 8) | rgb.b;
};

/**
 * Parse `#rrggbb` into `rgba(r, g, b, alpha)`. Returns null if not a 6-digit hex.
 */
export const hexToRgba = (hex: string, alpha: number): string | null => {
  const rgb = parseHexRgb(hex);
  if (!rgb) return null;
  const a = Number.isFinite(alpha) ? alpha : 1;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${a})`;
};
