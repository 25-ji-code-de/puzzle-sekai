import { describe, expect, it } from "vitest";
import {
  assetKeyFromFile,
  resolveComOffset,
  COM_BY_ASSET,
} from "../com-table";
import { CHAR } from "../../../characters/ids";

describe("COM table", () => {
  it("has entries for all main characters", () => {
    expect(COM_BY_ASSET.ichika).toBeDefined();
    expect(COM_BY_ASSET.mizuki.x).toBeCloseTo(16.43, 1); // hair offsets right
    expect(COM_BY_ASSET.emu.y).toBeGreaterThan(0); // below cell2 anchor
  });

  it("resolves by character name", () => {
    const com = resolveComOffset({
      kind: "cell2",
      characterName: CHAR.Mizuki,
    });
    expect(com).toEqual(COM_BY_ASSET.mizuki);
  });

  it("resolves item by material key in path", () => {
    const com = resolveComOffset({
      kind: "item",
      itemFile: "/assets/material008-abc123.png",
    });
    expect(com).toEqual(COM_BY_ASSET.material008);
  });

  it("resolves via assetFile basename match", () => {
    expect(assetKeyFromFile("/src/assets/chara/honami.png")).toBe("honami");
    const com = resolveComOffset({
      kind: "cell2",
      assetFile: "http://localhost/assets/honami-DWedvCLJ.png",
    });
    expect(com).toEqual(COM_BY_ASSET.honami);
  });

  it("shrunk uses emu_shrunk", () => {
    expect(resolveComOffset({ kind: "shrunk", isShrunk: true })).toEqual(
      COM_BY_ASSET.emu_shrunk,
    );
  });

  it("falls back to kind default", () => {
    expect(resolveComOffset({ kind: "big2x2" })).toEqual({ x: 0, y: 0 });
  });
});
