import * as PIXI from "pixi.js-legacy";
import sound from "pixi-sound";
import { app, gameTicker } from ".";
import { getCoordinates, getOffset, moveToCoordinate } from "./utils";
import { CharacterData, groupSounds } from "./character-data";
import { addScore } from "./score";
import { ROWS, COLUMNS, BOX_SIZE, LEFT_BORDER, FALL_SPEED } from "./config";
import { SpriteData, sprites, pieces, setSprites } from "./states";
import { isFunModeOn, onKanadeCleared, onShizukuCleared, cancelShizukuSwapIfShihoPresent } from "./fun-effects";
import { isCarrotItem, isFriesItem } from "./items";

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

export const clearChunk = async (
  chunk: [number, number][],
  options?: { silent?: boolean },
) => {
  const silent = options?.silent === true;
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

  // Determine group voice to play (skip for silent allergy clears)
  const clearedGroup = toRemove.find((sp) => sp.character?.group)?.character?.group;
  const groupVoiceKey =
    !silent && clearedGroup && groupSounds[clearedGroup]
      ? groupSounds[clearedGroup]
      : null;

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

  // After gravity: carrot allergy may connect newly
  await recheckCarrotAllergy();

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
  return clearAllergyCells(allergyCells);
};

/**
 * Reverse direction: Ena/Akito just landed — clear them if any cell is
 * orthogonally adjacent to a carrot item.
 */
export const applyCarrotAllergyOnCharacter = async (
  characterIndex: number,
): Promise<boolean> => {
  if (!isFunModeOn("itemAllergy")) return false;
  const sp = sprites[characterIndex];
  if (!sp?.coordinates?.length) return false;
  if (sp.character?.name !== "Ena" && sp.character?.name !== "Akito") {
    return false;
  }

  const dirs: [number, number][] = [
    [0, 0],
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];

  let touchesCarrot = false;
  outer: for (const [cx, cy] of sp.coordinates) {
    for (const [dx, dy] of dirs) {
      const nx = cx + dx;
      const ny = cy + dy;
      for (const itemSp of sprites) {
        if (!itemSp.isItem || !itemSp.itemFile || !itemSp.coordinates) continue;
        if (!isCarrotItem(itemSp.itemFile)) continue;
        if (itemSp.coordinates.some(([ix, iy]) => ix === nx && iy === ny)) {
          touchesCarrot = true;
          break outer;
        }
      }
    }
  }

  if (!touchesCarrot) return false;

  playCarrotAllergySfx(sp.character?.name);
  const chunk: [number, number][] = sp.coordinates.map(([x, y]) => [x, y]);
  await clearChunk(chunk, { silent: true });
  return true;
};

const playCarrotAllergySfx = (name?: string) => {
  const key =
    name === "Akito" ? "carrotAkito" : name === "Ena" ? "carrotEna" : null;
  if (!key) return;
  const sfx = app.loader.resources[key]?.sound;
  if (sfx) sfx.play({ volume: 0.5 });
};

const clearAllergyCells = async (
  allergyCells: Set<string>,
): Promise<boolean> => {
  // Collect whole Ena/Akito sprites that hit, and play their SFX once each
  const toClear: SpriteData[] = [];
  for (const sp of sprites) {
    if (!sp.coordinates?.length) continue;
    if (sp.isItem) continue;
    if (sp.character?.name !== "Ena" && sp.character?.name !== "Akito") continue;
    const hit = sp.coordinates.some(([cx, cy]) =>
      allergyCells.has(`${cx},${cy}`),
    );
    if (!hit) continue;
    toClear.push(sp);
  }
  if (toClear.length === 0) return false;

  const played = new Set<string>();
  for (const sp of toClear) {
    const n = sp.character?.name;
    if (n && !played.has(n)) {
      playCarrotAllergySfx(n);
      played.add(n);
    }
  }

  const chunkKeys = new Set<string>();
  for (const sp of toClear) {
    for (const [cx, cy] of sp.coordinates!) {
      chunkKeys.add(`${cx},${cy}`);
    }
  }
  const chunk: [number, number][] = [...chunkKeys].map((key) => {
    const [x, y] = key.split(",").map(Number);
    return [x, y] as [number, number];
  });
  await clearChunk(chunk, { silent: true });
  return true;
};

/**
 * After gravity: any Ena/Akito that ends orthogonally adjacent to a carrot
 * is cleared (silent, no unit voice).
 */
export const recheckCarrotAllergy = async (): Promise<boolean> => {
  if (!isFunModeOn("itemAllergy")) return false;

  const dirs: [number, number][] = [
    [0, 0],
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];

  const allergyCells = new Set<string>();
  for (const sp of sprites) {
    if (sp.character?.name !== "Ena" && sp.character?.name !== "Akito") continue;
    if (!sp.coordinates?.length) continue;
    for (const [cx, cy] of sp.coordinates) {
      for (const [dx, dy] of dirs) {
        const nx = cx + dx;
        const ny = cy + dy;
        for (const itemSp of sprites) {
          if (!itemSp.isItem || !itemSp.itemFile || !itemSp.coordinates) continue;
          if (!isCarrotItem(itemSp.itemFile)) continue;
          if (itemSp.coordinates.some(([ix, iy]) => ix === nx && iy === ny)) {
            allergyCells.add(`${cx},${cy}`);
          }
        }
      }
    }
  }
  if (allergyCells.size === 0) return false;
  return clearAllergyCells(allergyCells);
};

/** Same cell or orthogonal neighbor */
const cellsTouch = (ax: number, ay: number, bx: number, by: number) => {
  const d = Math.abs(ax - bx) + Math.abs(ay - by);
  return d === 0 || d === 1;
};

/**
 * Landing row (bottom cell) for a piece falling in `col` under gravity,
 * assuming the column is a solid stack from the bottom (post-gravity).
 * Returns -1 if the column is full.
 */
const landYInColumn = (col: number): number => {
  if (col < 0 || col >= COLUMNS) return -1;
  // First occupied cell from the top; land on the cell above it
  for (let y = 0; y < ROWS; y++) {
    if (pieces[y][col] != null) {
      return y - 1;
    }
  }
  return ROWS - 1; // empty column → rest on floor
};

/**
 * Cells occupied by a default-orientation (vertical 2-cell) character
 * after landing with bottom at (col, landY).
 */
const landedVerticalCells = (
  col: number,
  landY: number,
): [number, number][] | null => {
  if (landY < 0 || landY >= ROWS || col < 0 || col >= COLUMNS) return null;
  // Need room for the upper cell (spawn orientation is vertical)
  if (landY < 1) return null;
  return [
    [col, landY],
    [col, landY - 1],
  ];
};

/**
 * ContactColumns: columns where a default-orientation character, after falling and
 * landing under gravity, would touch the given item (same cell or edge-adjacent).
 */
const contactColumnsForItem = (itemX: number, itemY: number): number[] => {
  const cols: number[] = [];
  for (let col = 0; col < COLUMNS; col++) {
    const landY = landYInColumn(col);
    const cells = landedVerticalCells(col, landY);
    if (!cells) continue;
    if (cells.some(([x, y]) => cellsTouch(x, y, itemX, itemY))) {
      cols.push(col);
    }
  }
  return cols;
};

/**
 * Unified ContactColumns for all items matching `itemPred` (e.g. isCarrotItem / isFriesItem).
 * A column is included if landing a vertical 2-cell piece there would contact
 * at least one matching item.
 */
export const getItemContactColumns = (
  itemPred: (file: string) => boolean,
): number[] => {
  const cols = new Set<number>();
  for (const sp of sprites) {
    if (!sp.isItem || !sp.itemFile || !sp.coordinates?.length) continue;
    if (!itemPred(sp.itemFile)) continue;
    const [ix, iy] = sp.coordinates[0];
    for (const c of contactColumnsForItem(ix, iy)) {
      cols.add(c);
    }
  }
  return [...cols].sort((a, b) => a - b);
};

/** にんじん嫌い: columns Ena/Akito must NOT use (contact carrots). */
export const getCarrotHazardColumns = (): number[] => {
  if (!isFunModeOn("itemAllergy")) return [];
  return getItemContactColumns(isCarrotItem);
};

/** ポテトと瑞希: columns Mizuki MUST use when any valid fries contact col exists. */
export const getMizukiLockColumns = (): number[] => {
  if (!isFunModeOn("mizukiShift")) return [];
  return getItemContactColumns(isFriesItem);
};

/**
 * When fries land: move the nearest board Mizuki to sit above the fries
 * (prefer column fx, else fx±1 if open; anchor bottom at row fy-1).
 */
export const applyMizukiShift = async (
  itemX: number,
  itemY: number,
): Promise<void> => {
  if (!isFunModeOn("mizukiShift")) return;

  // Nearest Mizuki already on board
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
    if (!best || dist < best.dist) best = { index: i, dist };
  }
  if (!best) return;

  const mizukiIndex = best.index;
  const mizuki = sprites[mizukiIndex];
  const targetY = itemY - 1;
  if (targetY < 0) return;

  // Prefer fries column, then left, then right — must be in bounds & free for placement
  const tryCols = [itemX, itemX - 1, itemX + 1].filter(
    (c) => c >= 0 && c < COLUMNS,
  );

  const cellsFor = (
    orientation: number,
    ax: number,
    ay: number,
  ): [number, number][] | null => {
    switch (orientation) {
      case 0:
        if (ay < 1 || ay >= ROWS || ax < 0 || ax >= COLUMNS) return null;
        return [
          [ax, ay],
          [ax, ay - 1],
        ];
      case 1:
        if (ay < 0 || ay >= ROWS || ax < 0 || ax + 1 >= COLUMNS) return null;
        return [
          [ax, ay],
          [ax + 1, ay],
        ];
      case 2:
        if (ay < 0 || ay + 1 >= ROWS || ax < 0 || ax >= COLUMNS) return null;
        return [
          [ax, ay],
          [ax, ay + 1],
        ];
      case 3:
        if (ay < 0 || ay >= ROWS || ax - 1 < 0 || ax >= COLUMNS) return null;
        return [
          [ax, ay],
          [ax - 1, ay],
        ];
      default:
        return null;
    }
  };

  // Clear old cells first
  mizuki.coordinates?.forEach(([x, y]) => {
    pieces[y][x] = null;
  });

  const isFree = (cells: [number, number][]) =>
    cells.every(([x, y]) => pieces[y][x] === null);

  const currentOrient = getOffset(mizuki.sprite);
  let placed = false;

  const tryPlace = (col: number, orientation: number, rotation: number) => {
    const cells = cellsFor(orientation, col, targetY);
    if (!cells || !isFree(cells)) return false;
    mizuki.sprite.rotation = rotation;
    moveToCoordinate(mizuki.sprite, col, targetY);
    updateCoordinates(mizuki.sprite, mizukiIndex, mizuki.character);
    return true;
  };

  for (const col of tryCols) {
    if (tryPlace(col, currentOrient, mizuki.sprite.rotation)) {
      placed = true;
      break;
    }
    // fall back to vertical (orient 0 / rotation π)
    if (currentOrient !== 0 && tryPlace(col, 0, Math.PI)) {
      placed = true;
      break;
    }
  }

  if (!placed) {
    // restore
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

      // Visual: 1-cell size, keep original rotation/orientation
      const sprite = sp.sprite;
      sprite.anchor.set(0.5, 0.5);
      sprite.width = BOX_SIZE;
      sprite.height = BOX_SIZE;
      // Center on the kept cell; do not reset rotation
      sprite.x = BOX_SIZE * keep[0] + LEFT_BORDER + BOX_SIZE / 2;
      sprite.y = BOX_SIZE * keep[1] + BOX_SIZE / 2;

      pieces[keep[1]][keep[0]] = "Emu";

      // えむちぢみ SFX (once per shrink)
      const sfx = app.loader.resources["emuShrink"]?.sound;
      if (sfx) {
        sfx.play({ volume: 0.5 });
      }

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
 * When Rui and NeneRobo are both in a cleared set AND share an edge (orthogonal
 * adjacency of any of their cells), randomly blast extra pieces.
 * blastCount = 2 + 2 * (Rui/NeneRobo sprites in the clear), capped at 12 / half board.
 * Multi-cell sprites (NeneRobo, Mikudayo, 2-cell chars) are removed whole.
 */
const cellsOrthogonallyAdjacent = (
  a: [number, number][],
  b: [number, number][],
): boolean => {
  for (const [ax, ay] of a) {
    for (const [bx, by] of b) {
      if (Math.abs(ax - bx) + Math.abs(ay - by) === 1) return true;
    }
  }
  return false;
};

const applyWonderBlast = (cleared: SpriteData[]) => {
  const ruiSprites = cleared.filter((sp) => sp.character?.name === "Rui");
  const neneRoboSprites = cleared.filter(
    (sp) => sp.character?.name === "NeneRobo",
  );
  if (ruiSprites.length === 0 || neneRoboSprites.length === 0) return;

  // Require at least one Rui cell orthogonally adjacent to one NeneRobo cell
  let adjacent = false;
  for (const rui of ruiSprites) {
    if (!rui.coordinates?.length) continue;
    for (const nene of neneRoboSprites) {
      if (!nene.coordinates?.length) continue;
      if (cellsOrthogonallyAdjacent(rui.coordinates, nene.coordinates)) {
        adjacent = true;
        break;
      }
    }
    if (adjacent) break;
  }
  if (!adjacent) return;

  const ruiNeneCount = ruiSprites.length + neneRoboSprites.length;
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
