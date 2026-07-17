/**
 * Clear-rules unit tests (pure grid, no PIXI).
 */
import { describe, it, expect } from "vitest";
import { findClearChunk } from "./clear-rules";
import { CHAR } from "../characters/ids";
import { ITEM_TOKEN, type BoardGrid } from "../domain/types";
import { COLUMNS, ROWS } from "../config";

const emptyGrid = (): BoardGrid =>
  Array.from({ length: ROWS }, () =>
    Array.from({ length: COLUMNS }, () => null),
  );

describe("findClearChunk", () => {
  it("returns undefined on empty board", () => {
    expect(findClearChunk(emptyGrid())).toBeUndefined();
  });

  it("does not clear incomplete Leo/need (missing special)", () => {
    const g = emptyGrid();
    // required four without MikuLeo / Mikudayo
    g[7][0] = CHAR.Ichika;
    g[7][1] = CHAR.Saki;
    g[7][2] = CHAR.Honami;
    g[7][3] = CHAR.Shiho;
    expect(findClearChunk(g)).toBeUndefined();
  });

  it("clears complete Leo/need with unit Miku", () => {
    const g = emptyGrid();
    g[7][0] = CHAR.Ichika;
    g[7][1] = CHAR.Saki;
    g[7][2] = CHAR.Honami;
    g[7][3] = CHAR.Shiho;
    g[7][4] = CHAR.MikuLeo;
    const chunk = findClearChunk(g);
    expect(chunk).toBeDefined();
    expect(chunk!.length).toBe(5);
  });

  it("Mikudayo bridges as special for a complete required set", () => {
    const g = emptyGrid();
    g[7][0] = CHAR.Ichika;
    g[7][1] = CHAR.Saki;
    g[7][2] = CHAR.Honami;
    g[7][3] = CHAR.Shiho;
    g[7][4] = CHAR.Mikudayo;
    const chunk = findClearChunk(g);
    expect(chunk).toBeDefined();
    const names = new Set(chunk!.map(([x, y]) => g[y][x]));
    expect(names.has(CHAR.Mikudayo)).toBe(true);
  });

  it("items never participate in clears", () => {
    const g = emptyGrid();
    g[7][0] = CHAR.Ichika;
    g[7][1] = CHAR.Saki;
    g[7][2] = CHAR.Honami;
    g[7][3] = CHAR.Shiho;
    g[7][4] = CHAR.MikuLeo;
    g[6][0] = ITEM_TOKEN;
    const chunk = findClearChunk(g);
    expect(chunk).toBeDefined();
    // item cell must not appear in the clear set
    expect(chunk!.some(([x, y]) => g[y][x] === ITEM_TOKEN)).toBe(false);
  });

  it("disconnected same-group cells do not form one clear alone", () => {
    const g = emptyGrid();
    g[7][0] = CHAR.Ichika;
    g[0][5] = CHAR.Saki; // far away, not adjacent component with full set
    expect(findClearChunk(g)).toBeUndefined();
  });
});
