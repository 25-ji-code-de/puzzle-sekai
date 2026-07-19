/**
 * Board entity factory pure tests.
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  makeBig2x2Entity,
  makeCell2Entity,
  makeItemEntity,
  makeShrunkEntity,
} from "./entity";
import { cell, resetEntityIdSeq } from "../types";
import { CHAR } from "../../characters/ids";

describe("board entity factories", () => {
  beforeEach(() => {
    resetEntityIdSeq();
  });

  it("makeCell2Entity stamps kind, character, and footprint", () => {
    const e = makeCell2Entity({
      character: CHAR.Ichika,
      group: "Leo/need",
      cells: [cell(1, 2), cell(1, 1)],
      orientation: 0,
    });
    expect(e.kind).toBe("cell2");
    expect(e.id).toBe("c2_1");
    if (e.kind !== "cell2") throw new Error("kind");
    expect(e.character).toBe(CHAR.Ichika);
    expect(e.group).toBe("Leo/need");
    expect(e.cells).toEqual([
      [1, 2],
      [1, 1],
    ]);
    expect(e.orientation).toBe(0);
  });

  it("makeBig2x2Entity defaults orientation to 0", () => {
    const e = makeBig2x2Entity({
      character: CHAR.NeneRobo,
      group: "Wonderlands×Showtime",
      cells: [cell(2, 3), cell(1, 3), cell(2, 2), cell(1, 2)],
    });
    expect(e.kind).toBe("big2x2");
    expect(e.id).toBe("b2_1");
    if (e.kind !== "big2x2") throw new Error("kind");
    expect(e.orientation).toBe(0);
    expect(e.character).toBe(CHAR.NeneRobo);
  });

  it("makeItemEntity carries itemFile only", () => {
    const e = makeItemEntity({
      itemFile: "material008.png",
      cells: [cell(0, 0)],
    });
    expect(e.kind).toBe("item");
    expect(e.id).toBe("it_1");
    if (e.kind !== "item") throw new Error("kind");
    expect(e.itemFile).toBe("material008.png");
    expect(e.cells).toEqual([[0, 0]]);
  });

  it("makeShrunkEntity keeps character + single cell", () => {
    const e = makeShrunkEntity({
      character: CHAR.Emu,
      cells: [cell(3, 4)],
    });
    expect(e.kind).toBe("shrunk");
    expect(e.id).toBe("sh_1");
    if (e.kind !== "shrunk") throw new Error("kind");
    expect(e.character).toBe(CHAR.Emu);
  });

  it("ids increment across factories", () => {
    makeCell2Entity({
      character: CHAR.Saki,
      group: "Leo/need",
      cells: [cell(0, 0)],
      orientation: 1,
    });
    const second = makeItemEntity({ itemFile: "x", cells: [cell(1, 1)] });
    expect(second.id).toBe("it_2");
  });
});
