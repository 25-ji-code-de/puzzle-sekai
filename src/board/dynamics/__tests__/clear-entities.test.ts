import { describe, expect, it } from "vitest";
import { buildContactAdjacency } from "../contact-graph";
import { findClearEntities } from "../clear-entities";
import { CHAR } from "../../../characters/ids";
import { BOX_SIZE } from "../../../config";

const pose = (x: number, y: number, rotation = 0) => ({ x, y, rotation });

describe("buildContactAdjacency", () => {
  it("connects nearby non-item nodes", () => {
    const nodes = [
      {
        id: "a",
        kind: "item" as const,
        pose: pose(0, 0),
        isItem: true,
      },
      {
        id: "b",
        kind: "shrunk" as const,
        pose: pose(0, 0),
        isItem: false,
      },
      {
        id: "c",
        kind: "shrunk" as const,
        pose: pose(BOX_SIZE + 4, 0),
        isItem: false,
      },
    ];
    const adj = buildContactAdjacency(nodes, 8);
    expect(adj.has("a")).toBe(false);
    expect(adj.get("b")).toContain("c");
    expect(adj.get("c")).toContain("b");
  });

  it("does not connect distant nodes", () => {
    const nodes = [
      {
        id: "b",
        kind: "shrunk" as const,
        pose: pose(0, 0),
        isItem: false,
      },
      {
        id: "c",
        kind: "shrunk" as const,
        pose: pose(BOX_SIZE * 3, 0),
        isItem: false,
      },
    ];
    const adj = buildContactAdjacency(nodes, 8);
    expect(adj.get("b")).toEqual([]);
  });
});

describe("findClearEntities", () => {
  it("clears a complete Leo/need group with MikuLeo", () => {
    // Pack four required + special in a tight row
    const names = [
      CHAR.Ichika,
      CHAR.Saki,
      CHAR.Honami,
      CHAR.Shiho,
      CHAR.MikuLeo,
    ];
    const entities = names.map((characterName, i) => ({
      id: `e${i}`,
      kind: "shrunk" as const,
      pose: pose(i * BOX_SIZE, 0),
      isItem: false,
      characterName,
    }));
    const cleared = findClearEntities(entities);
    expect(cleared.length).toBe(5);
  });

  it("does not clear incomplete groups", () => {
    const entities = [CHAR.Ichika, CHAR.Saki].map((characterName, i) => ({
      id: `e${i}`,
      kind: "shrunk" as const,
      pose: pose(i * BOX_SIZE, 0),
      isItem: false,
      characterName,
    }));
    expect(findClearEntities(entities)).toEqual([]);
  });
});
