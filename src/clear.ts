import { ROWS, COLUMNS } from "./config";
import { characterData } from "./character-data";

const groupMap = characterData
  .map((e) => [e.name, e.group])
  .reduce((obj, [key, val]) => {
    obj[key] = val;
    return obj;
  }, {} as { [name: string]: string });

// WxS special rule: need 4 members + (NeneRobo or MikuWxS)
const WXS_REGULAR = ["Tsukasa", "Emu", "Nene", "Rui"];
const WXS_SPECIAL = ["NeneRobo", "MikuWxS"];

// Mikudayo: acts as any group's Miku and can bridge adjacent groups
const MIKUDAYO_NAME = "Mikudayo";

// Non-Miku members for each group
const GROUP_NON_MIKU: Record<string, string[]> = {
  "Leo/need": ["Ichika", "Saki", "Honami", "Shiho"],
  "MORE MORE JUMP!": ["Minori", "Haruka", "Airi", "Shizuku"],
  "Vivid BAD SQUAD": ["Kohane", "An", "Akito", "Toya"],
  "Wonderlands×Showtime": WXS_REGULAR,
  "25時、ナイトコードで。": ["Kanade", "Mafuyu", "Ena", "Mizuki"],
};

export const findClearPieces = (pieces: (string | null)[][]) => {
  const chunks: [number, number][][][] = Array(ROWS)
    .fill(null)
    .map(() => [...Array(COLUMNS).fill(null)]);
  pieces.forEach((row, y) => {
    row.forEach((group, x) => {
      if (group === null) return;
      const visited: boolean[][] = Array(ROWS)
        .fill(null)
        .map(() => [...Array(COLUMNS).fill(false)]);
      const queue: [number, number][] = [[x, y]];
      const ret: [number, number][] = [];
      while (queue.length > 0) {
        const [x, y] = queue.pop()!;
        if (
          x === undefined ||
          y === undefined ||
          y > pieces.length ||
          x > row.length ||
          visited[y][x]
        )
          continue;
        ret.push([x, y]);
        const isPassable = (nx: number, ny: number) => {
          const target = pieces[ny]?.[nx];
          if (target == null) return false;
          if (target === "Item") return true;
          if (target === MIKUDAYO_NAME) return true; // Mikudayo bridges all groups
          return groupMap[target] === groupMap[group];
        };
        if (x - 1 >= 0 && isPassable(x - 1, y))
          queue.push([x - 1, y]);
        if (y - 1 >= 0 && isPassable(x, y - 1))
          queue.push([x, y - 1]);
        if (x + 1 < row.length && isPassable(x + 1, y))
          queue.push([x + 1, y]);
        if (y + 1 < pieces.length && isPassable(x, y + 1))
          queue.push([x, y + 1]);
        visited[y][x] = true;
      }
      chunks[y][x] = ret;
    });
  });

  const clearedSet = new Set<string>();
  const allChunks = chunks
    .reduce((acc, curr) => {
      return [...acc, ...curr];
    }, [] as [number, number][][])
    .filter((e) => e != null);

  for (const chunk of allChunks) {
    const names = Array.from(
      new Set(chunk.map(([x, y]) => pieces[y][x] as string)),
    ).filter((n) => n !== "Item");

    if (names.length === 0) continue;

    const hasMikudayo = names.includes(MIKUDAYO_NAME);

    // Group names in this chunk (excluding Mikudayo and Item)
    const groupNames = new Set(
      names.filter((n) => n !== MIKUDAYO_NAME).map((n) => groupMap[n]),
    );

    for (const gn of groupNames) {
      if (!gn) continue;

      if (gn === "Wonderlands×Showtime") {
        // WxS: 4 members + (NeneRobo or MikuWxS or Mikudayo)
        const hasRegular = WXS_REGULAR.every((m) => names.includes(m));
        const hasSpecial =
          names.some((n) => WXS_SPECIAL.includes(n)) || hasMikudayo;
        if (hasRegular && hasSpecial) {
          chunk.forEach(([cx, cy]) => clearedSet.add(`${cx},${cy}`));
        }
      } else {
        // Other groups: all 4 non-Miku + (Miku or Mikudayo)
        const nonMiku = GROUP_NON_MIKU[gn];
        if (!nonMiku) continue;
        const hasAll = nonMiku.every((m) => names.includes(m));
        const groupMikus = ["MikuLeo", "MikuMMJ", "MikuVBS", "Miku25ji"];
        const hasMiku =
          names.some((n) => groupMikus.includes(n)) || hasMikudayo;
        if (hasAll && hasMiku) {
          chunk.forEach(([cx, cy]) => clearedSet.add(`${cx},${cy}`));
        }
      }
    }
  }

  return clearedSet.size > 0
    ? Array.from(clearedSet).map((s) => {
        const [x, y] = s.split(",").map(Number);
        return [x, y] as [number, number];
      })
    : undefined;
};
