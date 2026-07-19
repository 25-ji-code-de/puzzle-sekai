/**
 * Domain type kernel helper tests — pure, no PIXI / DOM.
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  asBoardCell,
  asOrientation,
  assertNever,
  cell,
  cellsEqual,
  createEntityId,
  isCellToken,
  isCharacterName,
  isOrientation,
  isPieceKind,
  isRoundMethod,
  isBig2x2Name,
  ITEM_TOKEN,
  occupantToToken,
  orientationToRotation,
  pieceKindFrom,
  primary,
  resetEntityIdSeq,
  rotationToOrientation,
  tokenToOccupant,
} from "./index";
import { CHAR } from "../../characters/ids";

describe("cell / orientation brands", () => {
  it("cell packs branded axes", () => {
    const c = cell(2, 5);
    expect(c).toEqual([2, 5]);
    expect(cellsEqual(c, cell(2, 5))).toBe(true);
    expect(cellsEqual(c, cell(2, 6))).toBe(false);
  });

  it("asOrientation wraps negatives and >3", () => {
    expect(asOrientation(0)).toBe(0);
    expect(asOrientation(4)).toBe(0);
    expect(asOrientation(-1)).toBe(3);
    expect(asOrientation(5)).toBe(1);
  });

  it("isOrientation rejects non-integers and OOB", () => {
    expect(isOrientation(2)).toBe(true);
    expect(isOrientation(2.5)).toBe(false);
    expect(isOrientation(-1)).toBe(false);
    expect(isOrientation(4)).toBe(false);
    expect(isOrientation("0")).toBe(false);
  });

  it("primary brands coordinates", () => {
    expect(primary(1, 2)).toEqual({ x: 1, y: 2 });
  });
});

describe("rotation ↔ orientation", () => {
  it("spawn base π maps orient 0 → π", () => {
    expect(orientationToRotation(0)).toBeCloseTo(Math.PI);
    expect(orientationToRotation(1)).toBeCloseTo(Math.PI + Math.PI / 2);
    expect(orientationToRotation(0, 0)).toBeCloseTo(0);
  });

  it("rotationToOrientation recovers common facings", () => {
    expect(rotationToOrientation(Math.PI)).toBe(0);
    expect(rotationToOrientation(Math.PI + Math.PI / 2)).toBe(1);
    expect(rotationToOrientation(0)).toBe(2);
  });
});

describe("piece kind", () => {
  it("isPieceKind whitelist", () => {
    expect(isPieceKind("cell2")).toBe(true);
    expect(isPieceKind("big2x2")).toBe(true);
    expect(isPieceKind("item")).toBe(true);
    expect(isPieceKind("shrunk")).toBe(true);
    expect(isPieceKind("cell3")).toBe(false);
  });

  it("pieceKindFrom priority: item > shrunk > big2x2 > cell2", () => {
    expect(pieceKindFrom({ isItem: true, isShrunk: true })).toBe("item");
    expect(pieceKindFrom({ isShrunk: true })).toBe("shrunk");
    expect(pieceKindFrom({ characterName: CHAR.NeneRobo })).toBe("big2x2");
    expect(pieceKindFrom({ characterName: CHAR.Mikudayo })).toBe("big2x2");
    expect(pieceKindFrom({ characterName: CHAR.Ichika })).toBe("cell2");
  });

  it("isBig2x2Name only NeneRobo / Mikudayo", () => {
    expect(isBig2x2Name(CHAR.NeneRobo)).toBe(true);
    expect(isBig2x2Name(CHAR.Mikudayo)).toBe(true);
    expect(isBig2x2Name(CHAR.Nene)).toBe(false);
    expect(isBig2x2Name(null)).toBe(false);
  });
});

describe("occupant tokens", () => {
  it("character / item guards", () => {
    expect(isCharacterName(CHAR.An)).toBe(true);
    expect(isCharacterName("NotAChar")).toBe(false);
    expect(isCellToken(ITEM_TOKEN)).toBe(true);
    expect(isCellToken(CHAR.Kohane)).toBe(true);
    expect(isCellToken("x")).toBe(false);
  });

  it("token ↔ occupant round-trips", () => {
    expect(tokenToOccupant(null)).toEqual({ kind: "empty" });
    expect(tokenToOccupant(ITEM_TOKEN)).toEqual({ kind: "item" });
    expect(tokenToOccupant(CHAR.Toya)).toEqual({
      kind: "character",
      name: CHAR.Toya,
    });
    expect(occupantToToken({ kind: "empty" })).toBeNull();
    expect(occupantToToken({ kind: "item" })).toBe(ITEM_TOKEN);
    expect(occupantToToken({ kind: "character", name: CHAR.Toya })).toBe(
      CHAR.Toya,
    );
  });

  it("asBoardCell coerces invalid to null", () => {
    expect(asBoardCell(undefined)).toBeNull();
    expect(asBoardCell(null)).toBeNull();
    expect(asBoardCell(ITEM_TOKEN)).toBe(ITEM_TOKEN);
    expect(asBoardCell(CHAR.Emu)).toBe(CHAR.Emu);
    expect(asBoardCell("garbage")).toBeNull();
  });
});

describe("entity id / round / assertNever", () => {
  beforeEach(() => {
    resetEntityIdSeq();
  });

  it("createEntityId increments and accepts prefix", () => {
    expect(createEntityId()).toBe("e_1");
    expect(createEntityId("p")).toBe("p_2");
    resetEntityIdSeq();
    expect(createEntityId()).toBe("e_1");
  });

  it("isRoundMethod whitelist", () => {
    expect(isRoundMethod("floor")).toBe(true);
    expect(isRoundMethod("ceil")).toBe(true);
    expect(isRoundMethod("round")).toBe(true);
    expect(isRoundMethod("trunc")).toBe(false);
  });

  it("assertNever throws", () => {
    expect(() => assertNever("x" as never)).toThrow(/Unexpected value/);
    expect(() => assertNever(1 as never, "nope")).toThrow("nope");
  });
});
