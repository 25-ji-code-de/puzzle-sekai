/**
 * えむちぢみ — Mafuyu adjacent to full-size Emu shrinks Emu to 1 cell.
 */
import { BOX_SIZE } from "../../config";
import { SpriteData, sprites, getBoardModel } from "../../game/board-state";
import { isFunModeOn } from "../../fun/effects";
import { fallChunk } from "../core";
import { SFX_EFFECT_BASE } from "../../settings";
import { isAdjacentToAny } from "../grid";
import { placeSpriteAtAnchor } from "../geometry";
import { makeShrunkEntity } from "../../domain/board/entity";
import { registerEntitySprite } from "../../presentation/entity-view";
import { CHAR } from "../../characters/ids";
import { playLoadedSfx } from "../../audio/sfx";

const collectMafuyuCells = (): [number, number][] => {
  const cells: [number, number][] = [];
  for (const sp of sprites) {
    if (sp.character?.name !== CHAR.Mafuyu || !sp.coordinates?.length) continue;
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

    if (b[1] !== a[1]) return b[1] - a[1];
    return b[0] - a[0];
  })[0];
};

/** Shrink one full-size Emu to a single cell. Returns true if shrunk. */
const shrinkEmuSprite = (
  sp: SpriteData,
  mafuyuCells: [number, number][],
): boolean => {
  if (sp.character?.name !== CHAR.Emu) return false;
  if (sp.isShrunk || !sp.coordinates || sp.coordinates.length < 2) return false;
  if (!isAdjacentToAny(sp.coordinates, mafuyuCells)) return false;

  const keep = pickKeepCell(sp.coordinates, mafuyuCells);

  const model = getBoardModel();
  const drop = sp.coordinates.filter(
    ([x, y]) => x !== keep[0] || y !== keep[1],
  );
  if (drop.length) model.clear(drop as any);

  sp.isShrunk = true;
  sp.coordinates = [keep];

  const sprite = sp.sprite;
  sprite.anchor.set(0.5, 0.5);
  sprite.width = BOX_SIZE;
  sprite.height = BOX_SIZE;
  placeSpriteAtAnchor(sprite, "shrunk", keep[0], keep[1]);

  model.write([keep as any], CHAR.Emu);
  const ent = makeShrunkEntity({ character: CHAR.Emu, cells: [keep as any] });
  sp.entityId = ent.id;
  registerEntitySprite(ent.id, sprite);

  playLoadedSfx("emuShrink", "sfx", SFX_EFFECT_BASE);
  return true;
};

/**
 * If Mafuyu is orthogonally adjacent to a full-size Emu, shrink Emu to 1 cell.
 * Re-checks after fall in case new adjacencies form.
 */
export const tryEmuShrink = async (): Promise<boolean> => {
  if (!isFunModeOn("emuShrink")) return false;

  let anyShrunk = false;

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

    await fallChunk(sprites);
  }

  return anyShrunk;
};
