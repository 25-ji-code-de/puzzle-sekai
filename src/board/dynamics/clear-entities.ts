/**
 * Continuous-space group clear: contact components + shared group rules.
 */
import type { CharacterName } from "../../characters/ids";
import type { GroupName } from "../../settings/types";
import {
  characterGroupOf,
  isGroupComplete,
  isMikudayoName,
  namesConnected,
} from "../clear-rules";
import { buildContactAdjacency, type GraphNode } from "./contact-graph";

export type EntityClearView = GraphNode & {
  characterName?: CharacterName | string;
};

/**
 * Find entity ids that should be cleared under continuous group rules.
 * Whole entities only — never partial footprints.
 */
export const findClearEntities = (entities: EntityClearView[]): string[] => {
  const chars = entities.filter((e) => !e.isItem && e.characterName);
  if (chars.length === 0) return [];

  const adj = buildContactAdjacency(chars);
  // Filter edges by name-level connection (group / Mikudayo bridge)
  for (const e of chars) {
    const neighbors = adj.get(e.id) ?? [];
    const filtered = neighbors.filter((nid) => {
      const other = chars.find((c) => c.id === nid);
      if (!other?.characterName || !e.characterName) return false;
      return namesConnected(e.characterName, other.characterName);
    });
    adj.set(e.id, filtered);
  }

  const visited = new Set<string>();
  const toClear = new Set<string>();

  for (const seed of chars) {
    if (visited.has(seed.id)) continue;
    const queue = [seed.id];
    visited.add(seed.id);
    const component: EntityClearView[] = [];

    while (queue.length) {
      const id = queue.pop()!;
      const node = chars.find((c) => c.id === id);
      if (!node) continue;
      component.push(node);
      for (const n of adj.get(id) ?? []) {
        if (visited.has(n)) continue;
        visited.add(n);
        queue.push(n);
      }
    }

    const names = new Set(
      component.map((c) => c.characterName!).filter(Boolean),
    );
    if (names.size === 0) continue;

    const hasMikudayo = [...names].some((n) => isMikudayoName(n));
    const groups = new Set<GroupName>();
    for (const n of names) {
      if (isMikudayoName(n)) continue;
      const g = characterGroupOf(n as CharacterName);
      if (g && g !== "Special") groups.add(g);
    }

    const completed = new Set<GroupName>();
    for (const group of groups) {
      if (isGroupComplete(group, names, hasMikudayo)) completed.add(group);
    }
    if (completed.size === 0) continue;

    for (const c of component) {
      const name = c.characterName!;
      if (isMikudayoName(name)) {
        toClear.add(c.id);
        continue;
      }
      const g = characterGroupOf(name as CharacterName);
      if (g && g !== "Special" && completed.has(g)) {
        toClear.add(c.id);
      }
    }
  }

  return [...toClear];
};
