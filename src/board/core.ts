import type * as PIXI from "pixi.js-legacy";
import { gameTicker } from "../index";
import {
  getCoordinates,
  getOffset,
  moveToCoordinate,
} from "../utils/coords";
import { CharacterData } from "../characters/data";
import { ROWS, BOX_SIZE, LEFT_BORDER, FALL_SPEED } from "../config";
import { SpriteData, sprites, pieces } from "../game/board-state";
import { isFunModeOn } from "../fun/effects";

export const updateCoordinates = (
  sprite: PIXI.Sprite,
  index: number,
  character?: Pick<CharacterData, "name">,
  isItem: boolean = false,
) => {
  // Prefer live index by sprite ref — fixed indices go stale after clears / async item spawn
  let idx = sprites.findIndex((s) => s.sprite === sprite);
  if (idx < 0) idx = index;
  if (!sprites[idx]) return;

  const { x, y } = getCoordinates(sprite);
  const orientation = (Math.fround(sprite.rotation / Math.PI) * 2 + 2) % 4;
  if (isItem) {
    if (y >= 0 && y < pieces.length && x >= 0 && x < (pieces[y]?.length ?? 0)) {
      pieces[y][x] = "Item";
    }
    sprites[idx].coordinates = [[x, y]];
    return;
  }
  // Shrunk Emu (えむちぢみ): always 1 cell
  if (sprites[idx]?.isShrunk && character) {
    pieces[y][x] = character.name;
    sprites[idx].coordinates = [[x, y]];
    return;
  }
  if (character) {
    if (character.name === "NeneRobo" || character.name === "Mikudayo") {
      pieces[y - 1][x] = character.name;
      pieces[y - 1][x - 1] = character.name;
      pieces[y][x] = character.name;
      pieces[y][x - 1] = character.name;
      sprites[idx].coordinates = [
        [x, y],
        [x - 1, y],
        [x, y - 1],
        [x - 1, y - 1],
      ];
      return;
    }
    switch (orientation) {
      case 0:
        pieces[y][x] = character.name;
        pieces[y - 1][x] = character.name;
        sprites[idx].coordinates = [
          [x, y],
          [x, y - 1],
        ];
        break;
      case 1:
        pieces[y][x] = character.name;
        pieces[y][x + 1] = character.name;
        sprites[idx].coordinates = [
          [x, y],
          [x + 1, y],
        ];
        break;
      case 2:
        pieces[y][x] = character.name;
        pieces[y + 1][x] = character.name;
        sprites[idx].coordinates = [
          [x, y],
          [x, y + 1],
        ];
        break;
      case 3:
        pieces[y][x] = character.name;
        pieces[y][x - 1] = character.name;
        sprites[idx].coordinates = [
          [x, y],
          [x - 1, y],
        ];
        break;
    }
  }
};

const findBottom = (sprite: SpriteData) => {
  const coordinates = sprite.coordinates;
  if (!coordinates?.length) return [] as [number, number][];
  const maxY = coordinates.reduce((acc, [, y]) => Math.max(acc, y), -Infinity);
  return coordinates.filter(([, y]) => y === maxY) as [number, number][];
};

type FallEntry = SpriteData & { index: number };

const isBig2x2 = (character: SpriteData["character"] | undefined) =>
  character?.name === "NeneRobo" || character?.name === "Mikudayo";

/**
 * Grid cell whose center is the sprite position (matches updateCoordinates /
 * getCoordinates primary cell, and physics pickAnchorCell).
 *
 * 2-cell footprints MUST use orientation — always picking lower/left sinks
 * upright (orient 2) and left-facing (orient 3) pieces by one full cell
 * while leaving grid occupancy correct (ghost gap under the next drop).
 */
const anchorFromCoords = (
  coords: [number, number][],
  character: SpriteData["character"] | undefined,
  isItem?: boolean,
  isShrunk?: boolean,
  orientation: number = 0,
): { x: number; y: number } => {
  if (!coords.length) return { x: 0, y: 0 };
  if (isBig2x2(character) || isItem || isShrunk || coords.length === 1) {
    return {
      x: Math.max(...coords.map(([x]) => x)),
      y: Math.max(...coords.map(([, y]) => y)),
    };
  }
  // Same rules as board/physics pickAnchorCell
  switch (orientation) {
    case 0: {
      // vertical head-down — primary = lower cell
      const c = coords.reduce((a, b) => (a[1] >= b[1] ? a : b));
      return { x: c[0], y: c[1] };
    }
    case 1: {
      // horizontal — primary = left cell
      const c = coords.reduce((a, b) => (a[0] <= b[0] ? a : b));
      return { x: c[0], y: c[1] };
    }
    case 2: {
      // vertical head-up — primary = upper cell
      const c = coords.reduce((a, b) => (a[1] <= b[1] ? a : b));
      return { x: c[0], y: c[1] };
    }
    case 3: {
      // horizontal — primary = right cell
      const c = coords.reduce((a, b) => (a[0] >= b[0] ? a : b));
      return { x: c[0], y: c[1] };
    }
    default: {
      const c = coords.reduce((a, b) => (a[1] >= b[1] ? a : b));
      return { x: c[0], y: c[1] };
    }
  }
};

/** Pixel position for a sprite whose anchor cell is (ax, ay). */
const placeSpriteFromAnchor = (
  sprite: PIXI.Sprite,
  character: SpriteData["character"] | undefined,
  ax: number,
  ay: number,
) => {
  if (isBig2x2(character)) {
    // Center of 2×2 = shared corner of the four cells
    sprite.x = LEFT_BORDER + ax * BOX_SIZE;
    sprite.y = ay * BOX_SIZE;
    return;
  }
  moveToCoordinate(sprite, ax, ay);
};

const cellName = (entry: FallEntry): string => {
  if (entry.isItem) return "Item";
  return entry.character?.name ?? "Piece";
};

/**
 * How many rows the footprint can drop before hitting floor / another piece.
 * Uses live `pieces` (caller must have already cleared this entry's cells).
 */
const maxDropDistance = (coords: [number, number][]): number => {
  if (!coords.length) return 0;
  let drop = Infinity;
  for (const [x, y] of coords) {
    let d = 0;
    for (let ny = y + 1; ny < ROWS; ny++) {
      if (pieces[ny]?.[x] != null) break;
      d++;
    }
    drop = Math.min(drop, d);
  }
  return drop === Infinity ? 0 : drop;
};

/** Write a footprint into the grid. */
const writeFootprint = (coords: [number, number][], name: string) => {
  for (const [x, y] of coords) {
    if (y >= 0 && y < ROWS && x >= 0 && x < (pieces[y]?.length ?? 0)) {
      pieces[y][x] = name;
    }
  }
};

/** Clear a footprint from the grid. */
const clearFootprint = (coords: [number, number][]) => {
  for (const [x, y] of coords) {
    if (y >= 0 && y < ROWS && x >= 0 && x < (pieces[y]?.length ?? 0)) {
      pieces[y][x] = null;
    }
  }
};

type FallPlan = {
  entry: FallEntry;
  /** Drop distance in rows (>0) */
  dy: number;
  /** Destination footprint */
  dest: [number, number][];
  /** Start / end pixel Y for the sprite center (or 2×2 center) */
  startPixelY: number;
  endPixelY: number;
};

/**
 * Simulate gravity for all currently unsupported pieces.
 * Pure coordinate math — never re-derives footprint from sprite rotation.
 * Process lowest pieces first so upper pieces stack on them correctly.
 */
const planFalls = (canFall: FallEntry[]): FallPlan[] => {
  // Work on a live-mutated pieces grid, restore after planning
  const backup = pieces.map((row) => [...row]);
  const plans: FallPlan[] = [];

  // Lowest first so they claim landing spots before pieces above them
  const ordered = [...canFall].sort((a, b) => {
    const ay = Math.max(...(a.coordinates ?? [[0, -1]]).map(([, y]) => y));
    const by = Math.max(...(b.coordinates ?? [[0, -1]]).map(([, y]) => y));
    return by - ay;
  });

  // Clear all falling pieces first so they don't block each other mid-plan
  for (const entry of ordered) {
    if (entry.coordinates?.length) clearFootprint(entry.coordinates);
  }

  for (const entry of ordered) {
    const coords = (entry.coordinates ?? []) as [number, number][];
    if (!coords.length) continue;

    const dy = maxDropDistance(coords);
    const dest = coords.map(([x, y]) => [x, y + dy] as [number, number]);
    writeFootprint(dest, cellName(entry));

    const orientation = getOffset(entry.sprite);
    const startAnchor = anchorFromCoords(
      coords,
      entry.character,
      entry.isItem,
      entry.isShrunk,
      orientation,
    );
    const endAnchor = anchorFromCoords(
      dest,
      entry.character,
      entry.isItem,
      entry.isShrunk,
      orientation,
    );

    // Use the live sprite Y as start (may already be mid-pixel after a tip)
    // and compute end from destination anchor.
    const endPixelY = isBig2x2(entry.character)
      ? endAnchor.y * BOX_SIZE
      : BOX_SIZE * endAnchor.y + BOX_SIZE / 2;

    plans.push({
      entry,
      dy,
      dest,
      startPixelY: entry.sprite.y,
      endPixelY,
    });

    // Keep x aligned to the destination column (no horizontal drift)
    void startAnchor;
  }

  // Restore real grid — applyFalls will commit for real
  backup.forEach((row, i) =>
    row.forEach((_, j) => {
      pieces[i][j] = backup[i][j];
    }),
  );

  return plans.filter((p) => p.dy > 0);
};

/** Animate planned falls, then write footprints + coordinates. */
const applyFalls = async (plans: FallPlan[]) => {
  if (!plans.length) return;

  // Clear old cells before animation
  for (const { entry } of plans) {
    if (entry.coordinates?.length) clearFootprint(entry.coordinates);
  }

  // Snap ones already at end (no visible travel)
  const anim = plans.filter(
    (p) => Math.abs(p.startPixelY - p.endPixelY) >= 1,
  );
  const instant = plans.filter(
    (p) => Math.abs(p.startPixelY - p.endPixelY) < 1,
  );

  const commit = (plan: FallPlan) => {
    const { entry, dest } = plan;
    const orientation = getOffset(entry.sprite);
    const anchor = anchorFromCoords(
      dest,
      entry.character,
      entry.isItem,
      entry.isShrunk,
      orientation,
    );
    placeSpriteFromAnchor(entry.sprite, entry.character, anchor.x, anchor.y);
    // Write coordinates / grid directly — do NOT call updateCoordinates
    // (it re-derives footprint from rotation and can desync after a tip).
    entry.coordinates = dest.map(([x, y]) => [x, y] as [number, number]);
    // Also update the live sprites[] entry (entry is a shallow copy)
    const live = sprites[entry.index];
    if (live && live.sprite === entry.sprite) {
      live.coordinates = entry.coordinates;
    } else {
      const found = sprites.find((s) => s.sprite === entry.sprite);
      if (found) found.coordinates = entry.coordinates;
    }
    writeFootprint(dest, cellName(entry));
  };

  for (const p of instant) commit(p);

  if (anim.length === 0) return;

  await new Promise<void>((resolve) => {
    const tick = (delta: number) => {
      let allDone = true;
      for (const p of anim) {
        if (p.entry.sprite.y < p.endPixelY) {
          p.entry.sprite.y += FALL_SPEED * delta;
          if (p.entry.sprite.y > p.endPixelY) p.entry.sprite.y = p.endPixelY;
          allDone = false;
        } else if (p.entry.sprite.y > p.endPixelY) {
          // already past (shouldn't happen) — snap
          p.entry.sprite.y = p.endPixelY;
        }
      }
      if (allDone) {
        gameTicker.remove(tick);
        for (const p of anim) commit(p);
        resolve();
      }
    };
    gameTicker.add(tick);
  });
};

/**
 * Gravity settle + optional cantilever tips.
 * Coordinate-driven: drop by footprint, never by rotation/orientation.
 * Hard-capped loop so empty-coords / desync can't freeze the tab.
 */
export const fallChunk = async (spritesList: SpriteData[]) => {
  const MAX_STEPS = 48;

  for (let step = 0; step < MAX_STEPS; step++) {
    const canFall = spritesList
      .map((e, index) => ({ ...e, index }))
      .filter(({ coordinates }) => {
        if (!coordinates?.length) return false;
        const bottom = findBottom({ coordinates } as SpriteData);
        if (!bottom.length) return false;
        return bottom.every(
          ([x, y]) => y + 1 < ROWS && pieces[y + 1]?.[x] === null,
        );
      });

    if (canFall.length > 0) {
      const plans = planFalls(canFall);
      if (plans.length === 0) {
        // Marked unsupported but no drop distance — stop to avoid spin
        break;
      }
      await applyFalls(plans);
      continue;
    }

    // Vertical gravity settled → maybe tip overhangs
    if (isFunModeOn("cantilever")) {
      const { tryCantileverPhysics } = await import("./physics");
      if (await tryCantileverPhysics(spritesList)) {
        continue; // tip may free more falls
      }
    }
    break;
  }
};

// Particle VFX lives in ./particles — re-exported from board/index.