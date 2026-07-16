/**
 * Simplified physics engines for entertainment modes.
 * - cantilever: rigid-body tip over a one-sided support (seesaw / pry-up feel)
 * - truePhysics: registered only (not implemented yet)
 *
 * 2×2 pieces (NeneRobo / Mikudayo) tip the same way as horizontal 2-cell pieces:
 * only one bottom column supported → rotate 90° over the support edge.
 */

import { gameTicker } from "../index";
import { BOX_SIZE, COLUMNS, LEFT_BORDER, ROWS } from "../config";
import { SpriteData, pieces } from "../game/board-state";
import { getOffset } from "../utils/coords";
import { isFunModeOn } from "../fun/effects";
import { cellKey } from "./grid";
import {
  type Cell,
  type PieceKind,
  pieceKindFrom,
  bottomCells as bottomCellsOf,
  maxFootprintY,
  anchorFromFootprint,
  orientFromFootprint,
  placeSpriteAtAnchor,
  writeFootprint,
} from "./geometry";

/** Slightly slower than a snap so the pry-up arc reads clearly. */
const TIP_ROTATE_FRAMES = 18;

type TipMember = { sp: SpriteData; index: number };

type TipPlan = {
  members: TipMember[];
  /** +1 tip right (CW), -1 tip left (CCW) */
  dir: 1 | -1;
  /** Supported bottom cell nearest the hang (defines the ledge) */
  pivot: { x: number; y: number };
};

const kindOf = (sp: SpriteData): PieceKind =>
  pieceKindFrom({
    characterName: sp.character?.name,
    isItem: sp.isItem,
    isShrunk: sp.isShrunk,
  });

const buildOccupancy = (list: SpriteData[]): Map<string, number> => {
  const map = new Map<string, number>();
  list.forEach((sp, index) => {
    sp.coordinates?.forEach(([x, y]) => {
      map.set(cellKey(x, y), index);
    });
  });
  return map;
};

/** Cells of a piece that rest on the floor or on a different piece. */
const supportCells = (
  sp: SpriteData,
  occupancy: Map<string, number>,
  selfIndex: number,
): [number, number][] => {
  if (!sp.coordinates?.length) return [];
  const supported: [number, number][] = [];
  for (const [x, y] of sp.coordinates) {
    if (y + 1 >= ROWS) {
      supported.push([x, y]);
      continue;
    }
    const below = occupancy.get(cellKey(x, y + 1));
    if (below !== undefined && below !== selfIndex) {
      supported.push([x, y]);
    }
  }
  return supported;
};

const bottomCells = (sp: SpriteData): Cell[] =>
  bottomCellsOf((sp.coordinates ?? []) as Cell[]);

/**
 * Roots must span ≥2 columns so there is a hang side vs support side.
 * Covers horizontal 2-cell pieces AND 2×2 NeneRobo/Mikudayo.
 */
const canSpanHorizontally = (sp: SpriteData): boolean => {
  if (sp.isItem || sp.isShrunk) return false;
  if (!sp.coordinates || sp.coordinates.length < 2) return false;
  return new Set(sp.coordinates.map(([x]) => x)).size >= 2;
};

/**
 * Rigid tip group: anything that only rests on the group rides along
 * (and will be pried up if it sits on the support side).
 * Anything that rests on the group AND has other support pins the whole tip.
 */
const collectTipGroup = (
  list: SpriteData[],
  occupancy: Map<string, number>,
  rootIndex: number,
): number[] | null => {
  const group = new Set<number>([rootIndex]);
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < list.length; i++) {
      if (group.has(i)) continue;
      const sp = list[i];
      if (!sp.coordinates?.length) continue;

      let restsOnGroup = false;
      let hasExternalSupport = false;
      for (const [x, y] of sp.coordinates) {
        if (y + 1 >= ROWS) {
          hasExternalSupport = true;
          continue;
        }
        const below = occupancy.get(cellKey(x, y + 1));
        if (below === undefined) continue;
        if (group.has(below)) restsOnGroup = true;
        else hasExternalSupport = true;
      }

      if (!restsOnGroup) continue;
      if (hasExternalSupport) return null; // pinned
      group.add(i);
      changed = true;
    }
  }
  return [...group];
};

/**
 * Ledge fulcrum = hang-side bottom corner of the pivot (support) cell.
 * Pixel space, y-down.
 */
const fulcrumPixel = (
  pivot: { x: number; y: number },
  dir: 1 | -1,
): { x: number; y: number } => {
  const x =
    dir === 1
      ? LEFT_BORDER + (pivot.x + 1) * BOX_SIZE
      : LEFT_BORDER + pivot.x * BOX_SIZE;
  const y = (pivot.y + 1) * BOX_SIZE;
  return { x, y };
};

/**
 * 90° grid remap around the ledge corner (matches fulcrumPixel rotation).
 *
 * tip right (dir=+1), pivot P — CW around bottom-right of P:
 *   support P      → hang column, same row
 *   hang H         → one row below hang column
 *   cell above P   → pryed up & over to the right
 *   2×2 top-right  → swings down-right with the hang
 *
 * tip left mirrored.
 */
const rotateCell = (
  x: number,
  y: number,
  pivot: { x: number; y: number },
  dir: 1 | -1,
): [number, number] => {
  const { x: px, y: py } = pivot;
  if (dir === 1) {
    // CW 90° around corner (px+1, py+1)
    return [px + py - y + 1, py + x - px];
  }
  // CCW 90° around corner (px, py+1)
  return [px + y - py - 1, py - x + px];
};

/** Rotate a pixel point around fulcrum by angle θ (y-down, +θ = CW). */
const rotatePoint = (
  x: number,
  y: number,
  fx: number,
  fy: number,
  theta: number,
): { x: number; y: number } => {
  const dx = x - fx;
  const dy = y - fy;
  const c = Math.cos(theta);
  const s = Math.sin(theta);
  return {
    x: fx + dx * c - dy * s,
    y: fy + dx * s + dy * c,
  };
};

const cellsFreeForGroup = (
  targets: [number, number][],
  groupSet: Set<number>,
  occupancy: Map<string, number>,
): boolean => {
  const seen = new Set<string>();
  for (const [x, y] of targets) {
    if (x < 0 || x >= COLUMNS || y < 0 || y >= ROWS) return false;
    const owner = occupancy.get(cellKey(x, y));
    if (owner !== undefined && !groupSet.has(owner)) return false;
    const k = cellKey(x, y);
    if (seen.has(k)) return false;
    seen.add(k);
  }
  return true;
};

const choosePivot = (
  supportedBottom: [number, number][],
  dir: 1 | -1,
): { x: number; y: number } => {
  const pick =
    dir === 1
      ? supportedBottom.reduce((a, b) => (a[0] >= b[0] ? a : b))
      : supportedBottom.reduce((a, b) => (a[0] <= b[0] ? a : b));
  return { x: pick[0], y: pick[1] };
};

const planTipForRoot = (
  list: SpriteData[],
  occupancy: Map<string, number>,
  rootIndex: number,
): TipPlan | null => {
  const root = list[rootIndex];
  if (!canSpanHorizontally(root)) return null;

  const bottom = bottomCells(root);
  // Need at least two bottom cells (horizontal span on the base row)
  if (bottom.length < 2) return null;

  const supported = supportCells(root, occupancy, rootIndex);
  const supportedBottom = bottom.filter(([x, y]) =>
    supported.some(([sx, sy]) => sx === x && sy === y),
  );
  const hangBottom = bottom.filter(
    ([x, y]) => !supportedBottom.some(([sx, sy]) => sx === x && sy === y),
  );

  // Unstable only when some bottom cells are held and some hang
  if (supportedBottom.length === 0 || hangBottom.length === 0) return null;

  const maxSupX = Math.max(...supportedBottom.map(([x]) => x));
  const minSupX = Math.min(...supportedBottom.map(([x]) => x));
  const minHangX = Math.min(...hangBottom.map(([x]) => x));
  const maxHangX = Math.max(...hangBottom.map(([x]) => x));
  // Hang must be entirely on one side of the support span
  const hangRight = minHangX > maxSupX;
  const hangLeft = maxHangX < minSupX;
  if (hangRight === hangLeft) return null;
  const dir: 1 | -1 = hangRight ? 1 : -1;

  const groupIdx = collectTipGroup(list, occupancy, rootIndex);
  if (!groupIdx) return null;

  const pivot = choosePivot(supportedBottom, dir);
  const groupSet = new Set(groupIdx);

  const allTargets: [number, number][] = [];
  for (const gi of groupIdx) {
    for (const [x, y] of list[gi].coordinates ?? []) {
      allTargets.push(rotateCell(x, y, pivot, dir));
    }
  }
  if (!cellsFreeForGroup(allTargets, groupSet, occupancy)) return null;

  return {
    members: groupIdx.map((index) => ({ sp: list[index], index })),
    dir,
    pivot,
  };
};

const findTipPlan = (list: SpriteData[]): TipPlan | null => {
  const occupancy = buildOccupancy(list);
  // Lowest first — foundations tip before free-floating tops
  const order = list
    .map((sp, index) => ({
      index,
      maxY: maxFootprintY((sp.coordinates ?? []) as Cell[]),
      // Prefer wider / bigger roots first (2×2 before a 2-cell sitting on it)
      area: sp.coordinates?.length ?? 0,
    }))
    .filter((e) => e.maxY >= 0)
    .sort((a, b) => b.maxY - a.maxY || b.area - a.area);

  for (const { index } of order) {
    const plan = planTipForRoot(list, occupancy, index);
    if (plan) return plan;
  }
  return null;
};

/** Write footprint directly — never re-derive cells from sprite math after a tip. */
const commitTipLanding = (sp: SpriteData, newCells: Cell[]) => {
  const name = sp.isItem ? "Item" : sp.character?.name;
  if (!name || !newCells.length) {
    sp.coordinates = newCells;
    return;
  }

  const kind = kindOf(sp);
  const orient = orientFromFootprint(newCells, kind);
  const anchor = anchorFromFootprint(newCells, kind, orient);

  // Snap rotation so later gravity / updateCoordinates stay consistent
  if (kind === "cell2") {
    // Match piece.ts convention: spawn at π, orient 0 → π, orient 1 → π + π/2, …
    // getOffset: (rotation/π * 2 + 2) % 4 — we only need getOffset === orient.
    const current = getOffset(sp.sprite);
    const delta = ((orient - current) % 4 + 4) % 4;
    sp.sprite.rotation += (delta * Math.PI) / 2;
  }

  placeSpriteAtAnchor(sp.sprite, kind, anchor.x, anchor.y);
  sp.coordinates = newCells.map(([x, y]) => [x, y] as Cell);
  writeFootprint(pieces, newCells, name);
};

/**
 * Rigid-body tip: every member orbits the shared ledge fulcrum.
 * Pieces on the support side arc upward (翘起来), hang side swings down.
 * 2×2 squares rotate as a rigid body the same way.
 */
const animateTip = (plan: TipPlan): Promise<void> => {
  const { members, dir, pivot } = plan;
  const fulcrum = fulcrumPixel(pivot, dir);
  const angleEnd = dir * (Math.PI / 2);

  type Pose = {
    startX: number;
    startY: number;
    startRot: number;
    newCells: [number, number][];
  };

  const poses: Pose[] = members.map(({ sp }) => {
    const coords = (sp.coordinates ?? []) as [number, number][];
    return {
      startX: sp.sprite.x,
      startY: sp.sprite.y,
      startRot: sp.sprite.rotation,
      newCells: coords.map(([x, y]) => rotateCell(x, y, pivot, dir)),
    };
  });

  for (const { sp } of members) {
    sp.sprite.zIndex = (sp.sprite.zIndex || 0) + 100;
  }

  // Clear grid occupancy during the arc
  for (const { sp } of members) {
    sp.coordinates?.forEach(([x, y]) => {
      if (pieces[y]?.[x] != null) pieces[y][x] = null;
    });
    sp.coordinates = undefined;
  }

  return new Promise((resolve) => {
    let frame = 0;
    const tick = (delta: number) => {
      // Clamp so a long hitch can't skip the end snap / resolve forever
      frame += Math.min(delta, 3);
      const t = Math.min(1, frame / TIP_ROTATE_FRAMES);
      // Ease-in: slow at balance, then accelerates (gravity on the lever)
      const e = t * t;
      const theta = angleEnd * e;

      members.forEach(({ sp }, i) => {
        const p = poses[i];
        const pos = rotatePoint(p.startX, p.startY, fulcrum.x, fulcrum.y, theta);
        sp.sprite.x = pos.x;
        sp.sprite.y = pos.y;
        sp.sprite.rotation = p.startRot + theta;
      });

      if (t >= 1) {
        gameTicker.remove(tick);
        members.forEach(({ sp }, i) => {
          const p = poses[i];
          sp.sprite.rotation = p.startRot + angleEnd;
          sp.sprite.zIndex = Math.max(0, (sp.sprite.zIndex || 0) - 100);
          // Commit cells by tip geometry — never via getCoordinates
          commitTipLanding(sp, p.newCells);
        });
        resolve();
      }
    };
    gameTicker.add(tick);
  });
};

/**
 * Run cantilever tip once gravity has settled.
 * Returns true if a tip happened (caller should re-run gravity).
 */
export const tryCantileverPhysics = async (
  list: SpriteData[],
): Promise<boolean> => {
  if (!isFunModeOn("cantilever")) return false;

  const plan = findTipPlan(list);
  if (!plan) return false;
  await animateTip(plan);
  return true;
};
