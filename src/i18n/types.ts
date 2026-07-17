/**
 * Nested string-key paths for locale dictionaries (dot-separated).
 * Derived from the English catalog as the canonical shape.
 */
import type { en } from "./locales/en";

/** Join nested object paths whose leaves are strings. */
type Join<K, P> = K extends string | number
  ? P extends string | number
    ? `${K}.${P}`
    : never
  : never;

/** Recursively collect paths to string leaves. */
type PathsToStringProps<T> = T extends string
  ? never
  : {
      [K in keyof T & (string | number)]: T[K] extends string
        ? `${K}`
        : T[K] extends Record<string, unknown>
        ? Join<K, PathsToStringProps<T[K]>>
        : never;
    }[keyof T & (string | number)];

/** Canonical message keys from the English locale tree. */
export type MessageKey = PathsToStringProps<typeof en>;

/** Locale dictionary shape (must cover all English string leaves). */
export type LocaleTree = typeof en;
