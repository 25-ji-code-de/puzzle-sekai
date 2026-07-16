/**
 * Branded grid primitives + Orientation (domain kernel).
 */

export type Col = number & { readonly __brand: "Col" };
export type Row = number & { readonly __brand: "Row" };
export type Cell = readonly [Col, Row];

export type Orientation = 0 | 1 | 2 | 3;

export const col = (n: number): Col => n as Col;
export const row = (n: number): Row => n as Row;

export const cell = (x: number, y: number): Cell => [col(x), row(y)];

export const cellX = (c: Cell | readonly [number, number]): number => c[0];
export const cellY = (c: Cell | readonly [number, number]): number => c[1];

export const asOrientation = (n: number): Orientation =>
  (((n % 4) + 4) % 4) as Orientation;

/** Loose [number, number] used by legacy call sites — prefer Cell. */
export type LooseCell = readonly [number, number] | [number, number];

export const asCell = (c: LooseCell): Cell => cell(c[0], c[1]);
export const asLoose = (c: Cell): [number, number] => [c[0], c[1]];
