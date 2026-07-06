import { ROWS, COLUMNS } from "./config";
import { characterData } from "./character-data";

const groupMap = characterData
  .map((e) => [e.name, e.group])
  .reduce((obj, [key, val]) => {
    obj[key] = val;
    return obj;
  }, {} as { [name: string]: string });

const groupMembers = characterData.reduce((acc, curr) => {
  return {
    ...acc,
    [curr.group]: acc[curr.group]
      ? [...acc[curr.group], curr.name]
      : [curr.name],
  };
}, {} as { [key: string]: string[] });

// WxS special rule: need 4 members + (NeneRobo or MikuWxS)
const WXS_REGULAR = ["Tsukasa", "Emu", "Nene", "Rui"];
const WXS_SPECIAL = ["NeneRobo", "MikuWxS"];

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
        if (
          x - 1 >= 0 &&
          (groupMap[pieces[y][x - 1] ?? ""] === groupMap[group] ||
            pieces[y][x - 1] === "Item")
        )
          queue.push([x - 1, y]);
        if (
          y - 1 >= 0 &&
          (groupMap[pieces[y - 1][x] ?? ""] === groupMap[group] ||
            pieces[y - 1][x] === "Item")
        )
          queue.push([x, y - 1]);
        if (
          x + 1 < row.length &&
          (groupMap[pieces[y][x + 1] ?? ""] === groupMap[group] ||
            pieces[y][x + 1] === "Item")
        )
          queue.push([x + 1, y]);
        if (
          y + 1 < pieces.length &&
          (groupMap[pieces[y + 1][x] ?? ""] === groupMap[group] ||
            pieces[y + 1][x] === "Item")
        )
          queue.push([x, y + 1]);
        visited[y][x] = true;
      }
      chunks[y][x] = ret;
    });
  });

  const members = chunks
    .reduce((acc, curr) => {
      return [...acc, ...curr];
    }, [] as [number, number][][])
    .filter((e) => e != null)
    .filter((chunk) => {
      const names = Array.from(
        new Set(chunk.map(([x, y]) => pieces[y][x] as string)),
      ).filter((n) => n !== "Item");

      if (names.length === 0) return false;

      const groupName = groupMap[names[0]];

      // WxS special rule: 4 regular members + (NeneRobo or MikuWxS)
      if (groupName === "Wonderlands×Showtime") {
        const regularCount = names.filter((n) =>
          WXS_REGULAR.includes(n),
        ).length;
        const hasSpecial = names.some((n) => WXS_SPECIAL.includes(n));
        return regularCount >= 4 && hasSpecial;
      }

      // Other groups: all members must be present
      return (
        groupMembers[groupName]?.length === names.length
      );
    })
    .reduce((acc, curr) => (acc.length > curr.length ? acc : curr), []);

  return members.length > 0 ? members : undefined;
};
