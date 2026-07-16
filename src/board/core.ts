/**
 * Board gravity + coordinate write.
 *
 * Orchestrates geometry atoms (footprint / anchor / grid-write / placement).
 * No local re-derivation of anchor or footprint rules.
 */
import type * as PIXI from "pixi.js-legacy";
import { gameTicker } from "../runtime";
import { getCoordinates, getOffset } from "../utils/coords";
import type { CharacterData } from "../characters/data";
import { FALL_SPEED } from "../config";
import { SpriteData, sprites, pieces, getBoardModel } from "../game/board-state";
import { isFunModeOn } from "../fun/effects";
import {
  type Cell,
  type PieceKind,
  pieceKindFrom,
  asOrientation,
  footprintFromPrimary,
  anchorFromFootprint,
  anchorPixelY,
  placeSpriteAtAnchor,
  isUnsupported,
  primaryFromSprite,
} from "./geometry";
import { ITEM_TOKEN, type CellToken } from "../domain/types";

const kindOf = (entry: {
  character?: Pick<CharacterData, "name"> | SpriteData["character"];
  isItem?: boolean;
  isShrunk?: boolean;
}): PieceKind =>
  pieceKindFrom({
    characterName: entry.character?.name,
    isItem: entry.isItem,
    isShrunk: entry.isShrunk,
  });

/**
 * Land a sprite into the board grid from its current pixel pose.
 * Builds footprint via geometry atoms, then writes grid + coordinates.
 * big2x2 uses bottom-right primaryFromSprite; cell2 uses cell-center coords.
 */
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

  const kind = pieceKindFrom({
    characterName: character?.name ?? sprites[idx].character?.name,
    isItem: isItem || sprites[idx].isItem,
    isShrunk: sprites[idx].isShrunk,
  });
  // big2x2 primary is bottom-right; cell2 uses cell-center getCoordinates
  const primary =
    kind === "big2x2"
      ? primaryFromSprite(sprite, "big2x2")
      : getCoordinates(sprite);
  const orient = asOrientation(getOffset(sprite));
  const cells = footprintFromPrimary(primary, orient, kind);
  const name: CellToken | undefined =
    kind === "item"
      ? ITEM_TOKEN
      : (character?.name ?? sprites[idx].character?.name);
  if (!name) return;

  getBoardModel().write(cells, name);
  sprites[idx].coordinates = cells.map(([x, y]) => [x, y] as Cell);
};

type FallEntry = SpriteData & { index: number };

const cellName = (entry: FallEntry): CellToken | null => {
  if (entry.isItem) return ITEM_TOKEN;
  return entry.character?.name ?? null;
};

type FallPlan = {
  entry: FallEntry;
  kind: PieceKind;
  /** Drop distance in rows (>0) */
  dy: number;
  /** Destination footprint */
  dest: Cell[];
  /** Start / end pixel Y for the sprite center (or 2×2 center) */
  startPixelY: number;
  endPixelY: number;
};

/**
 * Simulate gravity for all currently unsupported pieces via BoardModel.
 * Pure coordinate math on the grid — never re-derives footprint from rotation.
 */
const planFalls = (canFall: FallEntry[]): FallPlan[] => {
  const model = getBoardModel();

  const tagged = canFall
    .map((entry) => {
      const token = cellName(entry);
      const coords = (entry.coordinates ?? []) as Cell[];
      if (!token || !coords.length) return null;
      return { entry, token, coords, id: entry.index };
    })
    .filter(
      (x): x is {
        entry: FallEntry;
        token: CellToken;
        coords: Cell[];
        id: number;
      } => !!x,
    );

  const byId = new Map(tagged.map((t) => [t.id, t.entry]));

  const domainPlans = model.planGravity(
    tagged.map(({ token, coords, id }) => ({ token, coords, id })),
  );

  const plans: FallPlan[] = [];
  for (const gp of domainPlans) {
    const entry = gp.id !== undefined ? byId.get(gp.id) : undefined;
    if (!entry) continue;
    const kind = kindOf(entry);
    const orient = asOrientation(getOffset(entry.sprite));
    const endAnchor = anchorFromFootprint(gp.to, kind, orient);
    plans.push({
      entry,
      kind,
      dy: gp.dy,
      dest: gp.to,
      startPixelY: entry.sprite.y,
      endPixelY: anchorPixelY(kind, endAnchor.y),
    });
  }
  return plans;
};

/** Sync live sprites[] entry coordinates after a planned fall. */
const syncLiveCoordinates = (entry: FallEntry, dest: Cell[]) => {
  entry.coordinates = dest.map(([x, y]) => [x, y] as Cell);
  const live = sprites[entry.index];
  if (live && live.sprite === entry.sprite) {
    live.coordinates = entry.coordinates;
    return;
  }
  const found = sprites.find((s) => s.sprite === entry.sprite);
  if (found) found.coordinates = entry.coordinates;
};

/** Commit one fall plan: place sprite, write coords + grid. */
const commitFall = (plan: FallPlan) => {
  const { entry, dest, kind } = plan;
  const orient = asOrientation(getOffset(entry.sprite));
  const anchor = anchorFromFootprint(dest, kind, orient);
  placeSpriteAtAnchor(entry.sprite, kind, anchor.x, anchor.y);
  // Write coordinates / grid directly — do NOT call updateCoordinates
  // (it re-derives footprint from rotation and can desync after a tip).
  syncLiveCoordinates(entry, dest);
  const token = cellName(entry);
  if (token) getBoardModel().write(dest, token);
};

/** Animate planned falls, then write footprints + coordinates. */
const applyFalls = async (plans: FallPlan[]) => {
  if (!plans.length) return;

  for (const { entry } of plans) {
    if (entry.coordinates?.length) {
      getBoardModel().clear(entry.coordinates as Cell[]);
    }
  }

  const anim = plans.filter((p) => Math.abs(p.startPixelY - p.endPixelY) >= 1);
  const instant = plans.filter(
    (p) => Math.abs(p.startPixelY - p.endPixelY) < 1,
  );

  for (const p of instant) commitFall(p);
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
          p.entry.sprite.y = p.endPixelY;
        }
      }
      if (allDone) {
        gameTicker.remove(tick);
        for (const p of anim) commitFall(p);
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
      .filter(({ coordinates }) =>
        isUnsupported(pieces, (coordinates ?? []) as Cell[]),
      );

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
