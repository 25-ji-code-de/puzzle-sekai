import * as PIXI from "pixi.js-legacy";
import sound from "pixi-sound";
import { app, gameTicker } from ".";
import { getCoordinates, getOffset, moveToCoordinate } from "./utils";
import { CharacterData, groupSounds } from "./character-data";
import { addScore } from "./score";
import { ROWS, COLUMNS, BOX_SIZE, LEFT_BORDER, FALL_SPEED } from "./config";
import { SpriteData, sprites, pieces, setSprites } from "./states";
import { isFunModeOn, onKanadeCleared, onShizukuCleared, cancelShizukuSwapIfShihoPresent } from "./fun-effects";

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
  // Shrunk Emu (えむちぢみ): always 1 cell
  if (sprites[index]?.isShrunk && character) {
    pieces[y][x] = character.name;
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

  for (const { sprite, coordinates, character, isItem, isShrunk } of canFall) {
    const { x, y } = getCoordinates(sprite, "floor");
    const offset = getOffset(sprite);
    const singleCell = !!isItem || !!isShrunk;

    // Clear old cells on temp grid
    coordinates?.forEach(([cx, cy]) => (pieces[cy][cx] = null));

    // Compute target using same logic as original fall()
    // Items / shrunk pieces are 1x1; character offset===2 means a 2-cell vertical piece
    const stackHeight = singleCell || offset % 2 === 0
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

    const targetY =
      ROWS - 1 - stackHeight - (!singleCell && offset === 2 ? 1 : 0);
    targets.set(sprite, { x, y: targetY });

    // Place on temp grid (mirrors what updateCoordinates does)
    if (isItem) {
      pieces[targetY][x] = "Item";
    } else if (isShrunk) {
      pieces[targetY][x] = character!.name;
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

  if (toRemove.some((sp) => sp.character?.name === "Kanade")) {
    onKanadeCleared();
  }
  if (toRemove.some((sp) => sp.character?.name === "Shizuku")) {
    const shihoOnBoard = sprites.some(
      (sp) =>
        sp.character?.name === "Shiho" &&
        !toRemove.find((r) => r.sprite === sp.sprite),
    );
    onShizukuCleared(shihoOnBoard);
  }

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

  // Wonder Blast: Rui + NeneRobo in same clear → random board blast
  if (isFunModeOn("wonderBlast")) {
    applyWonderBlast(toRemove);
  }

  // Phase 4: Fall pieces
  await fallChunk(sprites);

  // えむちぢみ: after gravity settles, shrink Emus adjacent to Mafuyu
  await tryEmuShrink();

  // After gravity, cancel swap if Shiho is (still / newly) on board
  cancelShizukuSwapIfShihoPresent(
    sprites.some((sp) => sp.character?.name === "Shiho"),
  );

  // Wait remaining time so total from voice start = 2200ms
  if (groupVoiceKey) {
    const elapsed = performance.now() - voiceStart;
    const remaining = 2200 - elapsed;
    if (remaining > 0) {
      await new Promise((r) => setTimeout(r, remaining));
    }
  }
};

/**
 * itemAllergy (にんじん嫌い): when a carrot lands, any Ena/Akito it touched
 * along the fall path (same cell or orthogonal neighbor) is cleared instantly.
 * The carrot item itself is never cleared.
 */
export const applyCarrotAllergy = async (
  itemX: number,
  landY: number,
): Promise<boolean> => {
  if (!isFunModeOn("itemAllergy")) return false;

  const dirs: [number, number][] = [
    [0, 0],
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];
  const allergyCells = new Set<string>();

  // Scan the whole fall column so mid-fall side-touches are caught on land
  for (let y = 0; y <= landY; y++) {
    for (const [dx, dy] of dirs) {
      const nx = itemX + dx;
      const ny = y + dy;
      if (
        ny < 0 ||
        nx < 0 ||
        ny >= pieces.length ||
        nx >= (pieces[ny]?.length ?? 0)
      ) {
        continue;
      }
      const name = pieces[ny][nx];
      if (name === "Ena" || name === "Akito") {
        allergyCells.add(`${nx},${ny}`);
      }
    }
  }

  if (allergyCells.size === 0) return false;

  // Expand to whole multi-cell sprites (Ena/Akito are 2 cells) so score matches cells removed
  const chunkKeys = new Set<string>();
  for (const sp of sprites) {
    if (!sp.coordinates?.length) continue;
    const hit = sp.coordinates.some(([cx, cy]) =>
      allergyCells.has(`${cx},${cy}`),
    );
    if (!hit) continue;
    for (const [cx, cy] of sp.coordinates) {
      chunkKeys.add(`${cx},${cy}`);
    }
  }
  if (chunkKeys.size === 0) return false;

  const chunk: [number, number][] = [...chunkKeys].map((key) => {
    const [x, y] = key.split(",").map(Number);
    return [x, y] as [number, number];
  });

  // clearChunk removes whole multi-cell sprites, awards score, fallChunk
  await clearChunk(chunk);
  return true;
};

/**
 * mizukiShift fun mode: after a fries item lands, teleport the nearest Mizuki
 * so she sits directly above it (anchor at (itemX, itemY-1)).
 * Prefer keeping orientation; fall back to vertical 2-cell. Skip if no room.
 * Then gravity-fall pieces that were above her old seat.
 */
export const applyMizukiShift = async (itemX: number, itemY: number) => {
  if (!isFunModeOn("mizukiShift")) return;

  type Cand = { index: number; dist: number };
  let best: Cand | null = null;

  for (let i = 0; i < sprites.length; i++) {
    const sp = sprites[i];
    if (sp.character?.name !== "Mizuki" || !sp.coordinates?.length) continue;
    const dist = Math.min(
      ...sp.coordinates.map(
        ([x, y]) => Math.abs(x - itemX) + Math.abs(y - itemY),
      ),
    );
    // Stable: first wins ties (strict <)
    if (!best || dist < best.dist) {
      best = { index: i, dist };
    }
  }
  if (!best) return;

  const mizukiIndex = best.index;
  const mizuki = sprites[mizukiIndex];
  const targetX = itemX;
  const targetY = itemY - 1;
  if (targetY < 0 || targetX < 0 || targetX >= COLUMNS) return;

  // Cells occupied by a 2-cell piece with given orientation at anchor (ax, ay)
  const cellsFor = (
    orientation: number,
    ax: number,
    ay: number,
  ): [number, number][] | null => {
    switch (orientation) {
      case 0: // vertical, anchor bottom
        if (ay < 1 || ay >= ROWS || ax < 0 || ax >= COLUMNS) return null;
        return [
          [ax, ay],
          [ax, ay - 1],
        ];
      case 1: // horizontal, extend right
        if (ay < 0 || ay >= ROWS || ax < 0 || ax + 1 >= COLUMNS) return null;
        return [
          [ax, ay],
          [ax + 1, ay],
        ];
      case 2: // vertical, anchor top
        if (ay < 0 || ay + 1 >= ROWS || ax < 0 || ax >= COLUMNS) return null;
        return [
          [ax, ay],
          [ax, ay + 1],
        ];
      case 3: // horizontal, extend left
        if (ay < 0 || ay >= ROWS || ax - 1 < 0 || ax >= COLUMNS) return null;
        return [
          [ax, ay],
          [ax - 1, ay],
        ];
      default:
        return null;
    }
  };

  const isFree = (cells: [number, number][]) =>
    cells.every(([x, y]) => pieces[y][x] === null);

  // Clear old Mizuki cells so self-collision doesn't block the move
  mizuki.coordinates?.forEach(([x, y]) => {
    pieces[y][x] = null;
  });

  const currentOrient = getOffset(mizuki.sprite);
  let placed = false;

  const tryPlace = (orientation: number, rotation: number) => {
    const cells = cellsFor(orientation, targetX, targetY);
    if (!cells || !isFree(cells)) return false;
    mizuki.sprite.rotation = rotation;
    moveToCoordinate(mizuki.sprite, targetX, targetY);
    updateCoordinates(mizuki.sprite, mizukiIndex, mizuki.character);
    return true;
  };

  // Prefer keeping current orientation
  if (tryPlace(currentOrient, mizuki.sprite.rotation)) {
    placed = true;
  } else if (currentOrient !== 0) {
    // Fall back to vertical 2-cell with bottom at (itemX, itemY-1)
    // orientation 0 ⇔ rotation Math.PI (matches createPiece default)
    if (tryPlace(0, Math.PI)) {
      placed = true;
    }
  }

  if (!placed) {
    // Restore old board cells; sprite pixel position unchanged
    updateCoordinates(mizuki.sprite, mizukiIndex, mizuki.character);
    return;
  }

  await fallChunk(sprites);
};

/**
 * emuShrink (えむちぢみ): if Mafuyu is orthogonally adjacent to a full-size Emu,
 * shrink Emu to 1 cell, choosing the cell farthest from the nearest Mafuyu
 * (tie-break: farther on the axis of separation). Then gravity-fall pieces.
 * Re-checks after fall in case new adjacencies form.
 */
export const tryEmuShrink = async (): Promise<boolean> => {
  if (!isFunModeOn("emuShrink")) return false;

  let anyShrunk = false;

  // Loop: shrink may free cells → fall → new adjacencies
  while (true) {
    const mafuyuCells: [number, number][] = [];
    for (const sp of sprites) {
      if (sp.character?.name !== "Mafuyu" || !sp.coordinates?.length) continue;
      for (const c of sp.coordinates) mafuyuCells.push(c);
    }
    if (mafuyuCells.length === 0) break;

    const mafuyuCx =
      mafuyuCells.reduce((s, [x]) => s + x, 0) / mafuyuCells.length;
    const mafuyuCy =
      mafuyuCells.reduce((s, [, y]) => s + y, 0) / mafuyuCells.length;

    const minDistToMafuyu = (cell: [number, number]) =>
      Math.min(
        ...mafuyuCells.map(
          ([mx, my]) => Math.abs(cell[0] - mx) + Math.abs(cell[1] - my),
        ),
      );

    /** Prefer cell farther from Mafuyu; on tie, farther on separation axis. */
    const pickKeepCell = (emuCells: [number, number][]): [number, number] => {
      const emuCx = emuCells.reduce((s, [x]) => s + x, 0) / emuCells.length;
      const emuCy = emuCells.reduce((s, [, y]) => s + y, 0) / emuCells.length;
      const axis: 0 | 1 =
        Math.abs(emuCx - mafuyuCx) >= Math.abs(emuCy - mafuyuCy) ? 0 : 1;

      return emuCells.slice().sort((a, b) => {
        const da = minDistToMafuyu(a);
        const db = minDistToMafuyu(b);
        if (db !== da) return db - da;

        const axisDistA = Math.abs(
          a[axis] - (axis === 0 ? mafuyuCx : mafuyuCy),
        );
        const axisDistB = Math.abs(
          b[axis] - (axis === 0 ? mafuyuCx : mafuyuCy),
        );
        if (axisDistB !== axisDistA) return axisDistB - axisDistA;

        // Stable final tie-break: lower on board, then righter
        if (b[1] !== a[1]) return b[1] - a[1];
        return b[0] - a[0];
      })[0];
    };

    let shrunkThisPass = false;

    for (let i = 0; i < sprites.length; i++) {
      const sp = sprites[i];
      if (sp.character?.name !== "Emu") continue;
      if (sp.isShrunk || !sp.coordinates || sp.coordinates.length < 2) continue;

      const adjacent = sp.coordinates.some(([ex, ey]) =>
        mafuyuCells.some(
          ([mx, my]) => Math.abs(ex - mx) + Math.abs(ey - my) === 1,
        ),
      );
      if (!adjacent) continue;

      const keep = pickKeepCell(sp.coordinates);

      // Null discarded Emu cells
      for (const [x, y] of sp.coordinates) {
        if (x !== keep[0] || y !== keep[1]) {
          pieces[y][x] = null;
        }
      }

      sp.isShrunk = true;
      sp.coordinates = [keep];

      // Visual: 1-cell centered sprite (like items)
      const sprite = sp.sprite;
      sprite.anchor.set(0.5, 0.5);
      sprite.rotation = 0;
      sprite.width = BOX_SIZE;
      sprite.height = BOX_SIZE;
      sprite.x = BOX_SIZE * keep[0] + LEFT_BORDER + BOX_SIZE / 2;
      sprite.y = BOX_SIZE * keep[1] + BOX_SIZE / 2;

      pieces[keep[1]][keep[0]] = "Emu";

      shrunkThisPass = true;
      anyShrunk = true;
    }

    if (!shrunkThisPass) break;

    // Gravity after shrinking (discarded cells may free supports)
    await fallChunk(sprites);
  }

  return anyShrunk;
};

/**
 * When Rui and NeneRobo are both in a cleared set, randomly blast extra pieces.
 * blastCount = 2 + 2 * (Rui/NeneRobo sprites in the clear), capped at 12 / half board.
 * Multi-cell sprites (NeneRobo, Mikudayo, 2-cell chars) are removed whole.
 */
const applyWonderBlast = (cleared: SpriteData[]) => {
  const hasRui = cleared.some((sp) => sp.character?.name === "Rui");
  const hasNeneRobo = cleared.some((sp) => sp.character?.name === "NeneRobo");
  if (!hasRui || !hasNeneRobo) return;

  const ruiNeneCount = cleared.filter(
    (sp) =>
      sp.character?.name === "Rui" || sp.character?.name === "NeneRobo",
  ).length;
  const halfBoard = Math.floor((ROWS * COLUMNS) / 2);
  const blastTarget = Math.min(12, halfBoard, 2 + 2 * ruiNeneCount);
  if (blastTarget <= 0) return;

  // Shuffle remaining board sprites
  const candidates = sprites
    .filter((sp) => sp.coordinates && sp.coordinates.length > 0)
    .slice();
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = candidates[i];
    candidates[i] = candidates[j];
    candidates[j] = tmp;
  }

  const blastRemove: SpriteData[] = [];
  let cellsCleared = 0;
  for (const sp of candidates) {
    if (cellsCleared >= blastTarget) break;
    blastRemove.push(sp);
    cellsCleared += sp.coordinates?.length ?? 1;
  }
  if (blastRemove.length === 0) return;

  if (blastRemove.some((sp) => sp.character?.name === "Kanade")) {
    onKanadeCleared();
  }

  // One combo step for the blast wave; score by cells removed
  addScore(cellsCleared);
  createParticles(blastRemove);
  blastRemove.forEach((sp) => {
    sp.coordinates?.forEach(([x, y]) => {
      pieces[y][x] = null;
    });
    app.stage.removeChild(sp.sprite);
  });
  setSprites(
    sprites.filter((s) => !blastRemove.find((sp) => s.sprite === sp.sprite)),
  );
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
