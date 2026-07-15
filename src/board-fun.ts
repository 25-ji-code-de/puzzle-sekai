import { app } from ".";
import { getOffset, moveToCoordinate } from "./utils";
import { addScore } from "./score";
import { ROWS, COLUMNS, BOX_SIZE, LEFT_BORDER } from "./config";
import { SpriteData, sprites, pieces, setSprites } from "./states";
import { isFunModeOn, onKanadeCleared } from "./fun-effects";
import { isCarrotItem, isFriesItem } from "./items";
import { updateCoordinates, fallChunk, createParticles } from "./board-core";
import { clearChunk } from "./board-clear";

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
 * ポテトと瑞希: any fries orthogonally adjacent to a Mizuki is eaten —
 * fries vanish, score is awarded, then gravity re-runs.
 * Re-checks after fall in case new adjacencies form.
 * Returns true if at least one fries was eaten.
 */
export const tryMizukiEatFries = async (): Promise<boolean> => {
  if (!isFunModeOn("mizukiShift")) return false;

  const dirs: [number, number][] = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];

  let anyEaten = false;

  while (true) {
    const mizukiCells: [number, number][] = [];
    for (const sp of sprites) {
      if (sp.character?.name !== "Mizuki" || !sp.coordinates?.length) continue;
      for (const c of sp.coordinates) mizukiCells.push(c);
    }
    if (mizukiCells.length === 0) break;

    const toEat: SpriteData[] = [];
    for (const sp of sprites) {
      if (!sp.isItem || !sp.itemFile || !sp.coordinates?.length) continue;
      if (!isFriesItem(sp.itemFile)) continue;
      const [fx, fy] = sp.coordinates[0];
      const touches = mizukiCells.some(([mx, my]) =>
        dirs.some(([dx, dy]) => mx + dx === fx && my + dy === fy),
      );
      if (touches) toEat.push(sp);
    }
    if (toEat.length === 0) break;

    // Extra score for snacks nabbed (combo step, same unit as a 1-cell clear)
    addScore(toEat.length);
    createParticles(toEat);
    removeSpritesFromBoard(toEat);
    anyEaten = true;
    await fallChunk(sprites);
  }

  return anyEaten;
};

// ---------- えむちぢみ (emu shrink) ----------

const collectMafuyuCells = (): [number, number][] => {
  const cells: [number, number][] = [];
  for (const sp of sprites) {
    if (sp.character?.name !== "Mafuyu" || !sp.coordinates?.length) continue;
    for (const c of sp.coordinates) cells.push(c);
  }
  return cells;
};

const centroid = (cells: [number, number][]): [number, number] => {
  const cx = cells.reduce((s, [x]) => s + x, 0) / cells.length;
  const cy = cells.reduce((s, [, y]) => s + y, 0) / cells.length;
  return [cx, cy];
};

/** Prefer cell farther from Mafuyu; on tie, farther on separation axis. */
const pickKeepCell = (
  emuCells: [number, number][],
  mafuyuCells: [number, number][],
): [number, number] => {
  const [mafuyuCx, mafuyuCy] = centroid(mafuyuCells);
  const [emuCx, emuCy] = centroid(emuCells);
  const axis: 0 | 1 =
    Math.abs(emuCx - mafuyuCx) >= Math.abs(emuCy - mafuyuCy) ? 0 : 1;

  const minDistToMafuyu = (cell: [number, number]) =>
    Math.min(
      ...mafuyuCells.map(
        ([mx, my]) => Math.abs(cell[0] - mx) + Math.abs(cell[1] - my),
      ),
    );

  return emuCells.slice().sort((a, b) => {
    const da = minDistToMafuyu(a);
    const db = minDistToMafuyu(b);
    if (db !== da) return db - da;

    const axisRef = axis === 0 ? mafuyuCx : mafuyuCy;
    const axisDistA = Math.abs(a[axis] - axisRef);
    const axisDistB = Math.abs(b[axis] - axisRef);
    if (axisDistB !== axisDistA) return axisDistB - axisDistA;

    // Stable final tie-break: lower on board, then righter
    if (b[1] !== a[1]) return b[1] - a[1];
    return b[0] - a[0];
  })[0];
};

const isAdjacentToAny = (
  cells: [number, number][],
  others: [number, number][],
): boolean =>
  cells.some(([ex, ey]) =>
    others.some(([mx, my]) => Math.abs(ex - mx) + Math.abs(ey - my) === 1),
  );

/** Shrink one full-size Emu to a single cell. Returns true if shrunk. */
const shrinkEmuSprite = (
  sp: SpriteData,
  mafuyuCells: [number, number][],
): boolean => {
  if (sp.character?.name !== "Emu") return false;
  if (sp.isShrunk || !sp.coordinates || sp.coordinates.length < 2) return false;
  if (!isAdjacentToAny(sp.coordinates, mafuyuCells)) return false;

  const keep = pickKeepCell(sp.coordinates, mafuyuCells);

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
  sprite.x = BOX_SIZE * keep[0] + LEFT_BORDER + BOX_SIZE / 2;
  sprite.y = BOX_SIZE * keep[1] + BOX_SIZE / 2;

  pieces[keep[1]][keep[0]] = "Emu";

  const sfx = app.loader.resources["emuShrink"]?.sound;
  if (sfx) sfx.play({ volume: 0.5 });
  return true;
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
    const mafuyuCells = collectMafuyuCells();
    if (mafuyuCells.length === 0) break;

    let shrunkThisPass = false;
    for (const sp of sprites) {
      if (shrinkEmuSprite(sp, mafuyuCells)) {
        shrunkThisPass = true;
        anyShrunk = true;
      }
    }

    if (!shrunkThisPass) break;

    // Gravity after shrinking (discarded cells may free supports)
    await fallChunk(sprites);
  }

  return anyShrunk;
};

// ---------- Wonder Blast ----------

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

const anyPairAdjacent = (
  groupA: SpriteData[],
  groupB: SpriteData[],
): boolean => {
  for (const a of groupA) {
    if (!a.coordinates?.length) continue;
    for (const b of groupB) {
      if (!b.coordinates?.length) continue;
      if (cellsOrthogonallyAdjacent(a.coordinates, b.coordinates)) return true;
    }
  }
  return false;
};

const shuffleInPlace = <T>(list: T[]): T[] => {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = list[i];
    list[i] = list[j];
    list[j] = tmp;
  }
  return list;
};

/** Pick sprites until `blastTarget` cells are covered. */
const pickBlastTargets = (
  candidates: SpriteData[],
  blastTarget: number,
): { remove: SpriteData[]; cellsCleared: number } => {
  const remove: SpriteData[] = [];
  let cellsCleared = 0;
  for (const sp of candidates) {
    if (cellsCleared >= blastTarget) break;
    remove.push(sp);
    cellsCleared += sp.coordinates?.length ?? 1;
  }
  return { remove, cellsCleared };
};

const removeSpritesFromBoard = (toRemove: SpriteData[]) => {
  toRemove.forEach((sp) => {
    sp.coordinates?.forEach(([x, y]) => {
      pieces[y][x] = null;
    });
    app.stage.removeChild(sp.sprite);
  });
  setSprites(
    sprites.filter((s) => !toRemove.find((sp) => s.sprite === sp.sprite)),
  );
};

/**
 * When Rui and NeneRobo are both in a cleared set AND share an edge (orthogonal
 * adjacency of any of their cells), randomly blast extra pieces.
 * blastCount = 2 + 2 * (Rui/NeneRobo sprites in the clear), capped at 12 / half board.
 * Multi-cell sprites (NeneRobo, Mikudayo, 2-cell chars) are removed whole.
 */
export const applyWonderBlast = (cleared: SpriteData[]) => {
  const ruiSprites = cleared.filter((sp) => sp.character?.name === "Rui");
  const neneRoboSprites = cleared.filter(
    (sp) => sp.character?.name === "NeneRobo",
  );
  if (ruiSprites.length === 0 || neneRoboSprites.length === 0) return;
  if (!anyPairAdjacent(ruiSprites, neneRoboSprites)) return;

  const ruiNeneCount = ruiSprites.length + neneRoboSprites.length;
  const halfBoard = Math.floor((ROWS * COLUMNS) / 2);
  const blastTarget = Math.min(12, halfBoard, 2 + 2 * ruiNeneCount);
  if (blastTarget <= 0) return;

  const candidates = shuffleInPlace(
    sprites.filter((sp) => sp.coordinates && sp.coordinates.length > 0).slice(),
  );
  const { remove, cellsCleared } = pickBlastTargets(candidates, blastTarget);
  if (remove.length === 0) return;

  if (remove.some((sp) => sp.character?.name === "Kanade")) {
    onKanadeCleared();
  }

  // One combo step for the blast wave; score by cells removed
  addScore(cellsCleared);
  createParticles(remove);
  removeSpritesFromBoard(remove);
};
