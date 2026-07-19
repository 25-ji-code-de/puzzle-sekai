/**
 * Character id / file-token matcher pure tests.
 */
import { describe, it, expect } from "vitest";
import {
  CHAR,
  characterFromFile,
  fileIsBig2x2,
  fileIsCharacter,
  isAllergyAvoiderFile,
  isAllergyAvoiderName,
} from "./ids";

describe("characterFromFile", () => {
  it("matches known path tokens case-insensitively", () => {
    expect(characterFromFile("/assets/chara/nenerobo.png")).toBe(CHAR.NeneRobo);
    expect(characterFromFile("MIKUDAYO_big.webp")).toBe(CHAR.Mikudayo);
    expect(characterFromFile("foo/Mizuki_1.png")).toBe(CHAR.Mizuki);
    expect(characterFromFile("kanade_fall")).toBe(CHAR.Kanade);
  });

  it("returns undefined for unknown paths", () => {
    expect(characterFromFile("ichika.png")).toBeUndefined();
    expect(characterFromFile("")).toBeUndefined();
  });

  it("prefers longer tokens before short ones (nenerobo before nene-like)", () => {
    // "nenerobo" is listed before generic tokens; ensure it still wins
    expect(characterFromFile("nenerobo_small.png")).toBe(CHAR.NeneRobo);
  });
});

describe("fileIsCharacter / fileIsBig2x2", () => {
  it("fileIsCharacter checks exact id match", () => {
    expect(fileIsCharacter("assets/ena.png", CHAR.Ena)).toBe(true);
    expect(fileIsCharacter("assets/ena.png", CHAR.Akito)).toBe(false);
  });

  it("fileIsBig2x2 only for NeneRobo / Mikudayo", () => {
    expect(fileIsBig2x2("nenerobo.png")).toBe(true);
    expect(fileIsBig2x2("mikudayo.png")).toBe(true);
    expect(fileIsBig2x2("emu.png")).toBe(false);
  });
});

describe("allergy avoiders", () => {
  it("name predicate is Ena or Akito", () => {
    expect(isAllergyAvoiderName(CHAR.Ena)).toBe(true);
    expect(isAllergyAvoiderName(CHAR.Akito)).toBe(true);
    expect(isAllergyAvoiderName(CHAR.An)).toBe(false);
    expect(isAllergyAvoiderName(null)).toBe(false);
    expect(isAllergyAvoiderName(undefined)).toBe(false);
  });

  it("file predicate mirrors name predicate", () => {
    expect(isAllergyAvoiderFile("ena_1.png")).toBe(true);
    expect(isAllergyAvoiderFile("akito.webp")).toBe(true);
    expect(isAllergyAvoiderFile("toya.png")).toBe(false);
  });
});
