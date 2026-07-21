/**
 * Clear-rules unit tests (pure grid, no PIXI).
 */
import { describe, it, expect } from "vitest";
import {
  characterGroupOf,
  findClearChunk,
  isGroupComplete,
  isMikudayoName,
  namesConnected,
} from "./clear-rules";
import { CHAR } from "../characters/ids";
import { ITEM_TOKEN, type BoardGrid } from "../domain/types";
import { COLUMNS, ROWS } from "../config";
import { emptyBoardGrid } from "../test/empty-grid";

const emptyGrid = (): BoardGrid => emptyBoardGrid(ROWS, COLUMNS);
describe("characterGroupOf / isMikudayoName", () => {
  it("maps known characters and rejects empty", () => {
    expect(characterGroupOf(CHAR.Ichika)).toBe("Leo/need");
    expect(characterGroupOf(CHAR.An)).toBe("Vivid BAD SQUAD");
    expect(characterGroupOf(null)).toBeUndefined();
    expect(characterGroupOf(undefined)).toBeUndefined();
  });

  it("detects Mikudayo only", () => {
    expect(isMikudayoName(CHAR.Mikudayo)).toBe(true);
    expect(isMikudayoName(CHAR.MikuLeo)).toBe(false);
    expect(isMikudayoName(null)).toBe(false);
  });
});

describe("namesConnected / isGroupComplete", () => {
  it("same group connects; items never; Mikudayo bridges", () => {
    expect(namesConnected(CHAR.Ichika, CHAR.Saki)).toBe(true);
    expect(namesConnected(CHAR.Ichika, CHAR.An)).toBe(false);
    expect(namesConnected(CHAR.Ichika, ITEM_TOKEN)).toBe(false);
    expect(namesConnected(CHAR.Mikudayo, CHAR.An)).toBe(true);
    expect(namesConnected(null, CHAR.Saki)).toBe(false);
  });

  it("requires all members plus a special or Mikudayo", () => {
    const leo = new Set<string>([
      CHAR.Ichika,
      CHAR.Saki,
      CHAR.Honami,
      CHAR.Shiho,
    ]);
    expect(isGroupComplete("Leo/need", leo, false)).toBe(false);
    expect(isGroupComplete("Leo/need", leo, true)).toBe(true);
    leo.add(CHAR.MikuLeo);
    expect(isGroupComplete("Leo/need", leo, false)).toBe(true);
  });
});

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
