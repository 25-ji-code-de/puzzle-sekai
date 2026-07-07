import * as PIXI from "pixi.js-legacy";
import sound from "pixi-sound";
import { app, gameTicker } from ".";
import { getCoordinates } from "./utils";
import { CharacterData, groupSounds } from "./character-data";
import { fall } from "./piece";
import { neneRoboFall } from "./nenerobo";
import { fallItem } from "./items";
import { addScore } from "./score";
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
    if (character.name === "NeneRobo") {
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
  let canFall = sprites
    .map((e, index) => ({ ...e, index }))
    .filter(({ sprite, coordinates }) =>
      findBottom({ sprite, coordinates }).every(([x, y]) => {
        return y + 1 < pieces.length && pieces[y + 1][x] === null;
      }),
    );
  if (canFall.length > 0) {
    await canFall
      .map(({ sprite, coordinates, character, index, isItem }) => () =>
        new Promise<void>((resolve) => {
          if (coordinates) {
            coordinates.forEach(([x, y]) => (pieces[y][x] = null));
            if (isItem) {
              return fallItem(sprite, (sprite) => {
                updateCoordinates(sprite, index, character, true);
                resolve();
              });
            }
            if (character?.name === "NeneRobo") {
              neneRoboFall(sprite, (sprite) => {
                updateCoordinates(sprite, index, character);
                resolve();
              });
            } else {
              fall(sprite, (sprite) => {
                updateCoordinates(sprite, index, character);
                resolve();
              });
            }
          }
        }),
      )
      .reduce((acc, p) => {
        return acc.then(p);
      }, Promise.resolve());
    await fallChunk(sprites);
  }
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

  // Determine group voice to play after animation
  const clearedGroup = toRemove.find((sp) => sp.character?.group)?.character?.group;
  const groupVoiceKey = clearedGroup && groupSounds[clearedGroup]
    ? groupSounds[clearedGroup] : null;

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
  const glowAnim = () => {
    glowFrame++;
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
    }
  };
  gameTicker.add(glowAnim);

  await new Promise((r) => setTimeout(r, 500));

  // Play group voice after animation, wait for it to finish
  if (groupVoiceKey) {
    sound.play(groupVoiceKey, { volume: 0.5 });
    await new Promise((r) => setTimeout(r, 2200));
  }

  fallChunk(sprites);
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
      const animate = () => {
        frame++;
        particle.x += vx;
        particle.y += vy;
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
