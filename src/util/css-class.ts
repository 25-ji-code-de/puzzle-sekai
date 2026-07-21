/**
 * CSS className join helpers (pure).
 */

/** Join truthy class tokens and collapse whitespace. */
export const joinClassNames = (
  ...parts: Array<string | false | null | undefined>
): string =>
  parts
    .filter((p): p is string => typeof p === "string" && p.length > 0)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
