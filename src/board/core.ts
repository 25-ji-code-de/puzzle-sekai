/**
 * Board gravity + land commit.
 *
 * Orchestrates domain piece math + presentation placement.
 * No local re-derivation of anchor or footprint rules.
 */
import type * as PIXI from "pixi.js-legacy";
import { gameTicker } from "../runtime";
import type { CharacterData } from "../characters/data";
import { FALL_SPEED } from "../config";
import {
  SpriteData,
  sprites,
  getGrid,
  getBoardModel,
} from "../game/board-state";
import { isFunModeOn } from "../fun/effects";
import type { Cell, CellToken, PieceKind } from "../domain/types";
import {
  ITEM_TOKEN,
  asOrientation,
  pieceKindFrom,
  rotationToOrientation,
} from "../domain/types";
import {
  footprintFromPrimary,
  anchorFromFootprint,
  isUnsupported,
} from "../domain/piece";
import {
  placeSpriteAtAnchor,
  primaryFromSprite,
  anchorPixelY,
} from "../presentation/placement";
import {
  makeCell2Entity,
  makeBig2x2Entity,
  makeItemEntity,
  makeShrunkEntity,
} from "../domain/board";
import type { CharacterName } from "../characters/ids";
import type { GroupName } from "../settings/types";
import { registerEntitySprite } from "../presentation/entity-view";

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

const orientOf = (sprite: PIXI.Sprite) =>
  asOrientation(rotationToOrientation(sprite.rotation));

/**
 * Land a sprite into the board grid from its current pixel pose.
 * Builds footprint, writes grid, assigns entity id, then snaps pixels.
 */
export const commitLandedSprite = (
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
  const primary = primaryFromSprite(sprite, kind);
  const orient = orientOf(sprite);
  const cells = footprintFromPrimary(primary, orient, kind);
  const name: CellToken | undefined =
    kind === "item"
      ? ITEM_TOKEN
      : character?.name ?? sprites[idx].character?.name;
  if (!name) return;

  getBoardModel().write(cells, name);
  sprites[idx].cells = cells;

  // Assign domain entity identity once on land (stable across later gravity).
  if (!sprites[idx].entityId) {
    const group = (sprites[idx].character?.group ?? "Special") as
      | GroupName
      | "Special";
    const charName = (character?.name ?? sprites[idx].character?.name) as
      | CharacterName
      | undefined;
    if (kind === "item") {
      const ent = makeItemEntity({
        itemFile: sprites[idx].itemFile ?? "item",
        cells,
      });
      sprites[idx].entityId = ent.id;
      registerEntitySprite(ent.id, sprite);
    } else if (kind === "big2x2" && charName) {
      const ent = makeBig2x2Entity({
        character: charName,
        group,
        cells,
        orientation: orient,
      });
      sprites[idx].entityId = ent.id;
      registerEntitySprite(ent.id, sprite);
    } else if (kind === "shrunk" && charName) {
      const ent = makeShrunkEntity({
        character: charName,
        cells,
      });
      sprites[idx].entityId = ent.id;
      registerEntitySprite(ent.id, sprite);
    } else if (charName) {
      const ent = makeCell2Entity({
        character: charName,
        group,
        cells,
        orientation: orient,
      });
      sprites[idx].entityId = ent.id;
      registerEntitySprite(ent.id, sprite);
    }
  }

  const anchor = anchorFromFootprint(cells, kind, orient);
  placeSpriteAtAnchor(sprite, kind, anchor.x, anchor.y);
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
 * Simulate gravity for all currently unsupported footprints via BoardModel.
 * Pure coordinate math on the grid — never re-derives footprint from rotation.
 */
const planFalls = (canFall: FallEntry[]): FallPlan[] => {
  const model = getBoardModel();

  const tagged = canFall
    .map((entry) => {
      const token = cellName(entry);
      const coords = entry.cells ?? [];
      if (!token || !coords.length) return null;
      return { entry, token, coords, id: entry.index };
    })
    .filter(
      (
        x,
      ): x is {
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
    const orient = orientOf(entry.sprite);
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

/** Sync live sprites[] entry cells after a planned fall. */
const syncLiveCells = (entry: FallEntry, dest: Cell[]) => {
  entry.cells = dest;
  const live = sprites[entry.index];
  if (live && live.sprite === entry.sprite) {
    live.cells = entry.cells;
    return;
  }
  const found = sprites.find((s) => s.sprite === entry.sprite);
  if (found) found.cells = entry.cells;
};

/** Commit one fall plan: place sprite, write cells + grid. */
const commitFall = (plan: FallPlan) => {
  const { entry, dest, kind } = plan;
  const orient = orientOf(entry.sprite);
  const anchor = anchorFromFootprint(dest, kind, orient);
  placeSpriteAtAnchor(entry.sprite, kind, anchor.x, anchor.y);
  // Write cells / grid directly — do NOT call commitLandedSprite
  // (it re-derives footprint from rotation and can desync after a tip).
  syncLiveCells(entry, dest);
  const token = cellName(entry);
  if (token) getBoardModel().write(dest, token);
};

/** Animate planned falls, then write footprints + cells. */
const applyFalls = async (plans: FallPlan[]) => {
  if (!plans.length) return;

  for (const { entry } of plans) {
    if (entry.cells?.length) {
      getBoardModel().clear(entry.cells);
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
 * Cell-driven: drop by footprint, never by rotation/orientation.
 * Hard-capped loop so empty-cells / desync can't freeze the tab.
 */
export const fallChunk = async (spritesList: SpriteData[]) => {
  const MAX_STEPS = 48;

  for (let step = 0; step < MAX_STEPS; step++) {
    const canFall = spritesList
      .map((e, index) => ({ ...e, index }))
      .filter(({ cells }) => isUnsupported(getGrid(), cells ?? []));

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
