import * as PIXI from "pixi.js-legacy";
import { app, gameTicker } from ".";
import { getCoordinates, getOffset, moveToCoordinate } from "./utils";
import { CharacterData } from "./character-data";
import { ROWS, BOX_SIZE, LEFT_BORDER, FALL_SPEED } from "./config";
import { SpriteData, sprites, pieces } from "./states";

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
  const maxY = coordinates?.reduce(
    (acc, [x, y]) => {
      return y > acc[1] ? [x, y] : acc;
    },
    [0, 0],
  ) as [number, number];
  return coordinates?.filter(([_, y]) => y === maxY[1]) ?? [];
};

type FallEntry = SpriteData & { index: number };

/** Stack height below (x, y) for a single- or multi-cell piece of given orientation. */
const stackHeightBelow = (
  x: number,
  y: number,
  offset: number,
  singleCell: boolean,
): number => {
  if (singleCell || offset % 2 === 0) {
    return pieces
      .map((row) => row[x])
      .filter((_, i) => i > y)
      .reverse()
      .reduce((acc, row, i) => (row ? i + 1 : acc), 0);
  }
  return pieces
    .map((row) =>
      offset === 1 ? [row[x], row[x + 1]] : [row[x - 1], row[x]],
    )
    .filter((_, i) => i > y)
    .reverse()
    .reduce((acc, row, i) => (row[0] || row[1] ? i + 1 : acc), 0);
};

/** Write a piece onto the pieces grid at (x, targetY) — mirrors updateCoordinates. */
const placeOnTempGrid = (
  x: number,
  targetY: number,
  character: SpriteData["character"],
  isItem: boolean | undefined,
  isShrunk: boolean | undefined,
  offset: number,
) => {
  if (isItem) {
    pieces[targetY][x] = "Item";
    return;
  }
  if (isShrunk) {
    pieces[targetY][x] = character!.name;
    return;
  }
  if (character?.name === "NeneRobo" || character?.name === "Mikudayo") {
    pieces[targetY][x] = character.name;
    pieces[targetY][x - 1] = character.name;
    pieces[targetY - 1][x] = character.name;
    pieces[targetY - 1][x - 1] = character.name;
    return;
  }
  pieces[targetY][x] = character!.name;
  if (offset === 0) pieces[targetY - 1][x] = character!.name;
  if (offset === 1) pieces[targetY][x + 1] = character!.name;
  if (offset === 2) pieces[targetY + 1][x] = character!.name;
  if (offset === 3) pieces[targetY - 1][x] = character!.name;
};

/** Phase 1: simulate serial fall on a temp grid; return per-sprite land targets. */
const computeFallTargets = (
  canFall: FallEntry[],
): Map<PIXI.Sprite, { x: number; y: number }> => {
  const backup = pieces.map((row) => [...row]);
  const targets = new Map<PIXI.Sprite, { x: number; y: number }>();

  for (const { sprite, coordinates, character, isItem, isShrunk } of canFall) {
    const { x, y } = getCoordinates(sprite, "floor");
    const offset = getOffset(sprite);
    const singleCell = !!isItem || !!isShrunk;

    coordinates?.forEach(([cx, cy]) => (pieces[cy][cx] = null));

    const stackHeight = stackHeightBelow(x, y, offset, singleCell);
    const targetY =
      ROWS - 1 - stackHeight - (!singleCell && offset === 2 ? 1 : 0);
    targets.set(sprite, { x, y: targetY });
    placeOnTempGrid(x, targetY, character, isItem, isShrunk, offset);
  }

  backup.forEach((row, i) =>
    row.forEach((_, j) => {
      pieces[i][j] = backup[i][j];
    }),
  );
  return targets;
};

/** Phase 2: snap already-at-target sprites, animate the rest in parallel. */
const applyFallTargets = async (
  canFall: FallEntry[],
  targets: Map<PIXI.Sprite, { x: number; y: number }>,
) => {
  const staticList: FallEntry[] = [];
  const animList: FallEntry[] = [];

  for (const entry of canFall) {
    const target = targets.get(entry.sprite)!;
    const targetPixelY = BOX_SIZE * target.y + BOX_SIZE / 2;
    if (Math.abs(entry.sprite.y - targetPixelY) < 1) {
      staticList.push(entry);
    } else {
      animList.push(entry);
    }
  }

  for (const { sprite, index, character, isItem } of staticList) {
    const target = targets.get(sprite)!;
    moveToCoordinate(sprite, target.x, target.y);
    updateCoordinates(sprite, index, character, isItem);
  }

  if (animList.length === 0) return;

  for (const { coordinates } of animList) {
    coordinates?.forEach(([x, y]) => (pieces[y][x] = null));
  }

  const animTargets = animList.map((e) => ({
    entry: e,
    targetPixelY: BOX_SIZE * targets.get(e.sprite)!.y + BOX_SIZE / 2,
  }));

  await new Promise<void>((resolve) => {
    const tick = (delta: number) => {
      let allDone = true;
      for (const item of animTargets) {
        if (item.entry.sprite.y < item.targetPixelY) {
          item.entry.sprite.y += FALL_SPEED * delta;
          if (item.entry.sprite.y > item.targetPixelY)
            item.entry.sprite.y = item.targetPixelY;
          allDone = false;
        }
      }
      if (allDone) {
        gameTicker.remove(tick);
        for (const { sprite, index, character, isItem } of canFall) {
          const target = targets.get(sprite)!;
          sprite.x = BOX_SIZE * target.x + LEFT_BORDER + BOX_SIZE / 2;
          sprite.y = BOX_SIZE * target.y + BOX_SIZE / 2;
          updateCoordinates(sprite, index, character, isItem);
        }
        resolve();
      }
    };
    gameTicker.add(tick);
  });
};

export const fallChunk = async (sprites: SpriteData[]) => {
  const canFall = sprites
    .map((e, index) => ({ ...e, index }))
    .filter(({ sprite, coordinates }) =>
      findBottom({ sprite, coordinates }).every(([x, y]) => {
        return y + 1 < pieces.length && pieces[y + 1][x] === null;
      }),
    );
  if (canFall.length === 0) return;

  const targets = computeFallTargets(canFall);
  await applyFallTargets(canFall, targets);
  await fallChunk(sprites);
};

export const createParticles = (sprites: SpriteData[]) => {
  sprites.forEach((sp) => {
    const { x, y } = sp.sprite;
    const particleCount = 8;
    for (let i = 0; i < particleCount; i++) {
      const particle = new PIXI.Graphics();
      particle.beginFill(0xffffff);
      particle.drawCircle(0, 0, 4);
      particle.endFill();
      particle.x = x;
      particle.y = y;
      const angle = (i / particleCount) * Math.PI * 2;
      const speed = 2 + Math.random() * 3;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      app.stage.addChild(particle);

      let frame = 0;
      const animate = (delta: number) => {
        frame += delta;
        particle.x += vx * delta;
        particle.y += vy * delta;
        particle.alpha = 1 - frame / 20;
        particle.scale.set(1 - frame / 20);
        if (frame >= 20) {
          gameTicker.remove(animate);
          app.stage.removeChild(particle);
        }
      };
      gameTicker.add(animate);
    }
  });
};
