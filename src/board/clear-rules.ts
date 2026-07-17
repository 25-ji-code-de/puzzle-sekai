/**
 * Pure clear-detection rules: connected components + group completion.
 */
import { ROWS, COLUMNS } from "../config";
import { characterData } from "../characters/data";
import { CHAR, type CharacterName } from "../characters/ids";
import type { GroupName } from "../settings/types";
import { ITEM_TOKEN, type BoardCell, type BoardGrid } from "../domain/types";
import { DIRS_ORTHO, cellKey, inBounds } from "./grid";

/** name → group */
const groupMap: Partial<Record<CharacterName, GroupName | "Special">> =
  Object.fromEntries(characterData.map((c) => [c.name, c.group]));

/** Wildcard that counts as any group's special and bridges adjacent groups */
const MIKUDAYO = CHAR.Mikudayo;

/**
 * Clear rules per group:
 * - required: all must be present
 * - specials: need any one (Mikudayo also counts)
 */
const GROUP_RULES: Record<
  GroupName,
  { required: CharacterName[]; specials: CharacterName[] }
> = {
  "Leo/need": {
    required: [CHAR.Ichika, CHAR.Saki, CHAR.Honami, CHAR.Shiho],
    specials: [CHAR.MikuLeo],
  },
  "MORE MORE JUMP!": {
    required: [CHAR.Minori, CHAR.Haruka, CHAR.Airi, CHAR.Shizuku],
    specials: [CHAR.MikuMMJ],
  },
  "Vivid BAD SQUAD": {
    required: [CHAR.Kohane, CHAR.An, CHAR.Akito, CHAR.Toya],
    specials: [CHAR.MikuVBS],
  },
  "Wonderlands×Showtime": {
    required: [CHAR.Tsukasa, CHAR.Emu, CHAR.Nene, CHAR.Rui],
    specials: [CHAR.NeneRobo, CHAR.MikuWxS],
  },
  "25時、ナイトコードで。": {
    required: [CHAR.Kanade, CHAR.Mafuyu, CHAR.Ena, CHAR.Mizuki],
    specials: [CHAR.Miku25ji],
  },
};

/** Same group, or either side is Mikudayo. Item never bridges. */
const isConnected = (a: BoardCell, b: BoardCell): boolean => {
  if (a == null || b == null) return false;
  if (a === ITEM_TOKEN || b === ITEM_TOKEN) return false;
  if (a === MIKUDAYO || b === MIKUDAYO) return true;
  return !!groupMap[a] && groupMap[a] === groupMap[b];
};

const isGroupComplete = (
  group: GroupName,
  names: Set<string>,
  hasMikudayo: boolean,
): boolean => {
  const rule = GROUP_RULES[group];
  if (!rule) return false;
  const hasRequired = rule.required.every((n) => names.has(n));
  const hasSpecial = hasMikudayo || rule.specials.some((n) => names.has(n));
  return hasRequired && hasSpecial;
};

/** Collect undirected connected components (Mikudayo bridges groups). */
const findComponents = (grid: BoardGrid): [number, number][][] => {
  const visited = Array.from({ length: ROWS }, () =>
    Array<boolean>(COLUMNS).fill(false),
  );
  const components: [number, number][][] = [];

  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      const seed = grid[y][x];
      if (seed == null || seed === ITEM_TOKEN || visited[y][x]) continue;

      const queue: [number, number][] = [[x, y]];
      const component: [number, number][] = [];
      visited[y][x] = true;

      while (queue.length > 0) {
        const [cx, cy] = queue.pop()!;
        if (!inBounds(grid, cx, cy)) continue;

        component.push([cx, cy]);
        const current = grid[cy][cx];

        for (const [dx, dy] of DIRS_ORTHO) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (!inBounds(grid, nx, ny) || visited[ny][nx]) continue;
          if (!isConnected(current, grid[ny][nx])) continue;
          visited[ny][nx] = true;
          queue.push([nx, ny]);
        }
      }

      components.push(component);
    }
  }

  return components;
};

export const findClearChunk = (
  grid: BoardGrid,
): [number, number][] | undefined => {
  const cleared = new Set<string>();

  for (const component of findComponents(grid)) {
    const names = new Set(
      component.map(([x, y]) => grid[y][x]!).filter((n) => n !== ITEM_TOKEN),
    );
    if (names.size === 0) continue;

    const hasMikudayo = names.has(MIKUDAYO);
    const groups = new Set(
      [...names]
        .filter((n) => n !== MIKUDAYO)
        .map((n) => groupMap[n as CharacterName])
        .filter((g): g is GroupName => !!g && g !== "Special"),
    );

    const completed = new Set<GroupName>();
    for (const group of groups) {
      if (isGroupComplete(group, names, hasMikudayo)) {
        completed.add(group);
      }
    }
    if (completed.size === 0) continue;

    // Clear only completed groups + shared Mikudayo
    for (const [x, y] of component) {
      const name = grid[y][x]!;
      if (name === MIKUDAYO) {
        cleared.add(cellKey(x, y));
        continue;
      }
      const g = groupMap[name as CharacterName];
      if (g && g !== "Special" && completed.has(g)) {
        cleared.add(cellKey(x, y));
      }
    }
  }

  if (cleared.size === 0) return undefined;
  return [...cleared].map((key) => {
    const [x, y] = key.split(",").map(Number);
    return [x, y] as [number, number];
  });
};
