/**
 * Branded grid primitives — SINGLE source for the whole app.
 *
 * Why brands (not plain number):
 *   number looks the same for column, row, pixel, stack height, score.
 *   Col / Row make swapped arguments a compile error, not a runtime ghost cell.
 *
 * Prefer helpers (col/row/cell/asOrientation) over bare `as` casts at call sites.
 */

/** Board column index (0 .. COLUMNS-1). Not a pixel, not a row. */
export type Col = number & { readonly __brand: "Col" };

/** Board row index (0 .. ROWS-1). Not a pixel, not a column. */
export type Row = number & { readonly __brand: "Row" };

/** Mutable footprint cell [col, row]. */
export type Cell = [Col, Row];

/** Readonly cell for snapshots / public APIs. */
export type ReadonlyCell = readonly [Col, Row];

/** Piece facing in 90° slots (0 head-down … 3). */
export type Orientation = 0 | 1 | 2 | 3;

export const ORIENTATIONS = [0, 1, 2, 3] as const;

export const col = (n: number): Col => n as Col;
export const row = (n: number): Row => n as Row;

export const cell = (x: number, y: number): Cell => [col(x), row(y)];

export const cellX = (c: ReadonlyCell | Cell): Col => c[0];
export const cellY = (c: ReadonlyCell | Cell): Row => c[1];

/** Accept legacy [number, number] from untyped call sites; brand as Cell. */
export type LooseCell = readonly [number, number] | [number, number];

export const asCell = (c: LooseCell): Cell => cell(c[0], c[1]);

export const cellsEqual = (a: ReadonlyCell, b: ReadonlyCell): boolean =>
  a[0] === b[0] && a[1] === b[1];

export const asOrientation = (n: number): Orientation =>
  (((n % 4) + 4) % 4) as Orientation;

export const isOrientation = (n: unknown): n is Orientation =>
  typeof n === "number" && Number.isInteger(n) && n >= 0 && n <= 3;

/** Primary / anchor in grid space (branded axes). */
export type Primary = { readonly x: Col; readonly y: Row };

export const primary = (x: number, y: number): Primary => ({
  x: col(x),
  y: row(y),
});

/** Loose primary from sprites / legacy APIs before branding. */
export type LoosePrimary = { readonly x: number; readonly y: number };

export const asPrimary = (p: LoosePrimary): Primary => primary(p.x, p.y);
