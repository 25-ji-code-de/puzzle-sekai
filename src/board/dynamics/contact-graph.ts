/**
 * Pure contact-graph adjacency from poses (testable without Rapier).
 */
import type { PieceKind } from "../../domain/types";
import { entitiesTouching, CONTACT_GAP, type ProximityEntity } from "./proximity";
import type { Pose } from "./pose";

export type GraphNode = {
  id: string;
  kind: PieceKind;
  pose: Pose;
  /** Items never participate in character clear graphs. */
  isItem: boolean;
};

/** Undirected adjacency list for non-item nodes within CONTACT_GAP. */
export const buildContactAdjacency = (
  nodes: GraphNode[],
  gap: number = CONTACT_GAP,
): Map<string, string[]> => {
  const adj = new Map<string, string[]>();
  const chars = nodes.filter((n) => !n.isItem);
  for (const n of chars) adj.set(n.id, []);

  for (let i = 0; i < chars.length; i++) {
    for (let j = i + 1; j < chars.length; j++) {
      const a = chars[i];
      const b = chars[j];
      const pa: ProximityEntity = { kind: a.kind, pose: a.pose };
      const pb: ProximityEntity = { kind: b.kind, pose: b.pose };
      if (entitiesTouching(pa, pb, gap)) {
        adj.get(a.id)!.push(b.id);
        adj.get(b.id)!.push(a.id);
      }
    }
  }
  return adj;
};
