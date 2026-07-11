import * as PIXI from "pixi.js-legacy";
import sound from "pixi-sound";
import { app, gameTicker } from ".";
import { getCoordinates, getOffset, moveToCoordinate } from "./utils";
import { CharacterData, groupSounds } from "./character-data";
import { addScore } from "./score";
import { ROWS, BOX_SIZE, LEFT_BORDER, FALL_SPEED } from "./config";
import { SpriteData, sprites, pieces, setSprites } from "./states";

export const updateCoordinates = (
  sprite: PIXI.Sprite,
  index: number,
  character?: Pick<CharacterData, "name">,
  isItem: boolean = false,
) => {
  const { x, y } = getCoordinates(sprite);
  const orientation = (Math.fround(sprite.rotation / Math.PI) * 2 + 2) % 4;
  if (isItem) {
    pieces[y][x] = "Item";
    sprites[index].coordinates = [[x, y]];
    return;
  }
  if (character) {
    if (character.name === "NeneRobo" || character.name === "Mikudayo") {
      pieces[y - 1][x] = character.name;
      pieces[y - 1][x - 1] = character.name;
      pieces[y][x] = character.name;
      pieces[y][x - 1] = character.name;
      sprites[index].coordinates = [
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
        sprites[index].coordinates = [
          [x, y],
          [x, y - 1],
        ];
        break;
      case 1:
        pieces[y][x] = character.name;
        pieces[y][x + 1] = character.name;
        sprites[index].coordinates = [
          [x, y],
          [x + 1, y],
        ];
        break;
      case 2:
        pieces[y][x] = character.name;
        pieces[y + 1][x] = character.name;
        sprites[index].coordinates = [
          [x, y],
          [x, y + 1],
        ];
        break;
      case 3:
        pieces[y][x] = character.name;
        pieces[y][x - 1] = character.name;
        sprites[index].coordinates = [
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

export const fallChunk = async (sprites: SpriteData[]) => {
  const canFall = sprites
    .map((e, index) => ({ ...e, index }))
    .filter(({ sprite, coordinates }) =>
      findBottom({ sprite, coordinates }).every(([x, y]) => {
        return y + 1 < pieces.length && pieces[y + 1][x] === null;
      }),
    );
  if (canFall.length === 0) return;

  // Phase 1: Simulate original serial algorithm on temporary grid to compute targets
  const backup = pieces.map((row) => [...row]);
  const targets = new Map<PIXI.Sprite, { x: number; y: number }>();

  for (const { sprite, coordinates, character, isItem } of canFall) {
    const { x, y } = getCoordinates(sprite, "floor");
    const offset = getOffset(sprite);

    // Clear old cells on temp grid (mirrors original: coordinates.forEach → pieces[y][x] = null)
    coordinates?.forEach(([cx, cy]) => (pieces[cy][cx] = null));

    // Compute target using same logic as original fall()
    const stackHeight = offset % 2 === 0
      ? pieces
          .map((row) => row[x])
          .filter((_, i) => i > y)
          .reverse()
          .reduce((acc, row, i) => (row ? i + 1 : acc), 0)
      : pieces
          .map((row) =>
            offset === 1 ? [row[x], row[x + 1]] : [row[x - 1], row[x]],
          )
          .filter((_, i) => i > y)
          .reverse()
          .reduce((acc, row, i) => (row[0] || row[1] ? i + 1 : acc), 0);

    const targetY = ROWS - 1 - stackHeight - (offset === 2 ? 1 : 0);
    targets.set(sprite, { x, y: targetY });

    // Place on temp grid (mirrors what updateCoordinates does)
    if (isItem) {
      pieces[targetY][x] = "Item";
    } else if (character?.name === "NeneRobo" || character?.name === "Mikudayo") {
      pieces[targetY][x] = character.name;
      pieces[targetY][x - 1] = character.name;
      pieces[targetY - 1][x] = character.name;
      pieces[targetY - 1][x - 1] = character.name;
    } else {
      pieces[targetY][x] = character!.name;
      if (offset === 0) pieces[targetY - 1][x] = character!.name;
      if (offset === 1) pieces[targetY][x + 1] = character!.name;
      if (offset === 2) pieces[targetY + 1][x] = character!.name;
      if (offset === 3) pieces[targetY - 1][x] = character!.name;
    }
  }

  // Restore original grid
  backup.forEach((row, i) => row.forEach((_, j) => { pieces[i][j] = backup[i][j]; }));

  // Phase 2: Compute pixel positions and separate static vs animated
  const staticList: typeof canFall = [];
  const animList: (typeof canFall)[number][] = [];

  for (const entry of canFall) {
    const target = targets.get(entry.sprite)!;
    const targetPixelY = BOX_SIZE * target.y + BOX_SIZE / 2;
    if (Math.abs(entry.sprite.y - targetPixelY) < 1) {
      staticList.push(entry);
    } else {
      animList.push(entry);
    }
  }

  // Place static sprites immediately
  for (const { sprite, index, character, isItem } of staticList) {
    const target = targets.get(sprite)!;
    moveToCoordinate(sprite, target.x, target.y);
    updateCoordinates(sprite, index, character, isItem);
  }

  // Animate moving sprites simultaneously
  if (animList.length > 0) {
    // Clear old grid cells for animated sprites
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
            if (item.entry.sprite.y > item.targetPixelY) item.entry.sprite.y = item.targetPixelY;
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
  }

  await fallChunk(sprites);
};

export const clearChunk = async (chunk: [number, number][]) => {
  const toRemove = sprites.filter((sprite) => {
    return (
      sprite.coordinates &&
      chunk.find((e) =>
        sprite.coordinates?.find((c) => c.join(",") === e.join(",")),
      )
    );
  });

  if (toRemove.length === 0) return;

  addScore(chunk.length);

  // Determine group voice to play
  const clearedGroup = toRemove.find((sp) => sp.character?.group)?.character?.group;
  const groupVoiceKey = clearedGroup && groupSounds[clearedGroup]
    ? groupSounds[clearedGroup] : null;

  // Start group voice and record start time
  const voiceStart = groupVoiceKey ? performance.now() : 0;
  if (groupVoiceKey) {
    sound.play(groupVoiceKey, { volume: 0.5 });
  }

  // Phase 1: Turn white instantly
  toRemove.forEach((sp) => {
    const colorMatrix = new PIXI.filters.ColorMatrixFilter();
    colorMatrix.desaturate();
    colorMatrix.brightness(3, false);
    sp.sprite.filters = [colorMatrix];
  });

  await new Promise((r) => setTimeout(r, 150));

  // Phase 2: Glow effect
  const glowFilters = toRemove.map(() => {
    const colorMatrix = new PIXI.filters.ColorMatrixFilter();
    colorMatrix.desaturate();
    colorMatrix.brightness(5, false);
    return colorMatrix;
  });

  let glowFrame = 0;
  const glowDuration = 30;
  await new Promise<void>((resolve) => {
    const glowAnim = (delta: number) => {
      glowFrame += delta;
      const progress = glowFrame / glowDuration;
      const brightness = 5 + progress * 5;
      toRemove.forEach((sp, i) => {
        glowFilters[i].brightness(brightness, false);
        sp.sprite.filters = [glowFilters[i]];
        sp.sprite.alpha = 1 - progress * 0.5;
        sp.sprite.scale.set(1 + progress * 0.3);
      });
      if (glowFrame >= glowDuration) {
        gameTicker.remove(glowAnim);
        // Phase 3: Create particles and remove
        createParticles(toRemove);
        toRemove.forEach((sp) => {
          sp.coordinates?.forEach(([x, y]) => {
            pieces[y][x] = null;
          });
          app.stage.removeChild(sp.sprite);
        });
        setSprites(sprites.filter(
          (s) => !toRemove.find((sp) => s.sprite === sp.sprite),
        ));
        resolve();
      }
    };
    gameTicker.add(glowAnim);
  });

  // Phase 4: Fall pieces
  await fallChunk(sprites);

  // Wait remaining time so total from voice start = 2200ms
  if (groupVoiceKey) {
    const elapsed = performance.now() - voiceStart;
    const remaining = 2200 - elapsed;
    if (remaining > 0) {
      await new Promise((r) => setTimeout(r, remaining));
    }
  }
};

const createParticles = (sprites: SpriteData[]) => {
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
