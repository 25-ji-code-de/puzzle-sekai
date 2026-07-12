import { ROWS, COLUMNS } from "./config";
import { characterData } from "./character-data";

/** name → group */
const groupMap: Record<string, string> = Object.fromEntries(
  characterData.map((c) => [c.name, c.group]),
);

/** Wildcard that counts as any group's special and bridges adjacent groups */
const MIKUDAYO = "Mikudayo";

/**
 * Clear rules per group:
 * - required: all must be present
 * - specials: need any one (Mikudayo also counts)
 */
const GROUP_RULES: Record<string, { required: string[]; specials: string[] }> = {
  "Leo/need": {
    required: ["Ichika", "Saki", "Honami", "Shiho"],
    specials: ["MikuLeo"],
  },
  "MORE MORE JUMP!": {
    required: ["Minori", "Haruka", "Airi", "Shizuku"],
    specials: ["MikuMMJ"],
  },
  "Vivid BAD SQUAD": {
    required: ["Kohane", "An", "Akito", "Toya"],
    specials: ["MikuVBS"],
  },
  "Wonderlands×Showtime": {
    required: ["Tsukasa", "Emu", "Nene", "Rui"],
    specials: ["NeneRobo", "MikuWxS"],
  },
  "25時、ナイトコードで。": {
    required: ["Kanade", "Mafuyu", "Ena", "Mizuki"],
    specials: ["Miku25ji"],
  },
};

const DIRS: [number, number][] = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

const cellKey = (x: number, y: number) => `${x},${y}`;

/** Same group, or either side is Mikudayo. Item never bridges. */
const isConnected = (a: string | null, b: string | null): boolean => {
  if (a == null || b == null) return false;
  if (a === "Item" || b === "Item") return false;
  if (a === MIKUDAYO || b === MIKUDAYO) return true;
  return !!groupMap[a] && groupMap[a] === groupMap[b];
};

const isGroupComplete = (
  group: string,
  names: Set<string>,
  hasMikudayo: boolean,
): boolean => {
  const rule = GROUP_RULES[group];
  if (!rule) return false;
  const hasRequired = rule.required.every((n) => names.has(n));
  const hasSpecial =
    hasMikudayo || rule.specials.some((n) => names.has(n));
  return hasRequired && hasSpecial;
};

const inBounds = (pieces: (string | null)[][], x: number, y: number) =>
  y >= 0 && x >= 0 && y < pieces.length && x < (pieces[y]?.length ?? 0);

/** Collect undirected connected components (Mikudayo bridges groups). */
const findComponents = (pieces: (string | null)[][]): [number, number][][] => {
  const visited = Array.from({ length: ROWS }, () =>
    Array<boolean>(COLUMNS).fill(false),
  );
  const components: [number, number][][] = [];

  for (let y = 0; y < pieces.length; y++) {
    for (let x = 0; x < pieces[y].length; x++) {
      const seed = pieces[y][x];
      if (seed == null || seed === "Item" || visited[y][x]) continue;

      const queue: [number, number][] = [[x, y]];
      const component: [number, number][] = [];
      visited[y][x] = true;

      while (queue.length > 0) {
        const [cx, cy] = queue.pop()!;
        if (!inBounds(pieces, cx, cy)) continue;

        component.push([cx, cy]);
        const current = pieces[cy][cx];

        for (const [dx, dy] of DIRS) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (!inBounds(pieces, nx, ny) || visited[ny][nx]) continue;
          if (!isConnected(current, pieces[ny][nx])) continue;
          visited[ny][nx] = true;
          queue.push([nx, ny]);
        }
      }

      components.push(component);
    }
  }

  return components;
};

export const findClearPieces = (
  pieces: (string | null)[][],
): [number, number][] | undefined => {
  const cleared = new Set<string>();

  for (const component of findComponents(pieces)) {
    const names = new Set(
      component.map(([x, y]) => pieces[y][x]!).filter((n) => n !== "Item"),
    );
    if (names.size === 0) continue;

    const hasMikudayo = names.has(MIKUDAYO);
    const groups = new Set(
      [...names].filter((n) => n !== MIKUDAYO).map((n) => groupMap[n]).filter(Boolean),
    );

    const completed = new Set<string>();
    for (const group of groups) {
      if (isGroupComplete(group, names, hasMikudayo)) {
        completed.add(group);
      }
    }
    if (completed.size === 0) continue;

    // Clear only completed groups + shared Mikudayo
    for (const [x, y] of component) {
      const name = pieces[y][x]!;
      if (name === MIKUDAYO || completed.has(groupMap[name])) {
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
