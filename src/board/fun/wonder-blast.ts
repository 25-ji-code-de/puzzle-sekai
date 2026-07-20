/**
 * ショウタイム爆破 — Rui + NeneRobo clear adjacency blasts random cells/entities.
 */
import { addScore } from "../../score";
import { ROWS, COLUMNS } from "../../config";
import { SpriteData, sprites } from "../../game/board-state";
import { onKanadeCleared } from "../../fun/effects";
import { SFX_EFFECT_BASE } from "../../settings";
import { playLoadedSfx } from "../../audio/sfx";
import { playClearAnimation } from "../clear-vfx";
import { anyPairAdjacent, shuffleInPlace } from "../grid";
import { CHAR } from "../../characters/ids";
import { entitiesTouching, isContinuousPhysics, massOfKind } from "../dynamics";
import { pieceKindFrom } from "../../domain/types";

const scoreUnits = (sp: SpriteData): number => {
  if (typeof sp.mass === "number") return sp.mass;
  if (sp.cells?.length) return sp.cells.length;
  return massOfKind(
    pieceKindFrom({
      characterName: sp.character?.name,
      isItem: sp.isItem,
      isShrunk: sp.isShrunk,
    }),
  );
};

/** Pick sprites until `blastTarget` mass units are covered. */
const pickBlastTargets = (
  candidates: SpriteData[],
  blastTarget: number,
): { remove: SpriteData[]; cellsCleared: number } => {
  const remove: SpriteData[] = [];
  let cellsCleared = 0;
  for (const sp of candidates) {
    if (cellsCleared >= blastTarget) break;
    remove.push(sp);
    cellsCleared += scoreUnits(sp);
  }
  return { remove, cellsCleared };
};

const continuousPairTouch = (
  aList: SpriteData[],
  bList: SpriteData[],
): boolean => {
  for (const a of aList) {
    const aKind = pieceKindFrom({
      characterName: a.character?.name,
      isShrunk: a.isShrunk,
    });
    for (const b of bList) {
      const bKind = pieceKindFrom({
        characterName: b.character?.name,
        isShrunk: b.isShrunk,
      });
      if (
        entitiesTouching(
          {
            kind: aKind,
            pose: {
              x: a.sprite.x,
              y: a.sprite.y,
              rotation: a.sprite.rotation,
            },
          },
          {
            kind: bKind,
            pose: {
              x: b.sprite.x,
              y: b.sprite.y,
              rotation: b.sprite.rotation,
            },
          },
        )
      ) {
        return true;
      }
    }
  }
  return false;
};

/**
 * When Rui and NeneRobo are both in a cleared set AND share an edge,
 * randomly blast extra pieces (same white-flash VFX as a normal clear).
 * @returns true if any sprites were removed by the blast.
 */
export const applyWonderBlast = async (
  cleared: SpriteData[],
): Promise<boolean> => {
  const ruiSprites = cleared.filter((sp) => sp.character?.name === CHAR.Rui);
  const neneRoboSprites = cleared.filter(
    (sp) => sp.character?.name === CHAR.NeneRobo,
  );
  if (ruiSprites.length === 0 || neneRoboSprites.length === 0) return false;

  const adjacent = isContinuousPhysics()
    ? continuousPairTouch(ruiSprites, neneRoboSprites)
    : anyPairAdjacent(ruiSprites, neneRoboSprites);
  if (!adjacent) return false;

  const ruiNeneCount = ruiSprites.length + neneRoboSprites.length;
  const halfBoard = Math.floor((ROWS * COLUMNS) / 2);
  const blastCap = Math.min(12, halfBoard);
  const blastTarget = Math.min(blastCap, 2 + 2 * ruiNeneCount);
  if (blastTarget <= 0) return false;

  // Only remaining board pieces — the Rui/NeneRobo clear already finished its VFX.
  const candidates = shuffleInPlace(
    sprites
      .filter((sp) =>
        isContinuousPhysics()
          ? !!sp.entityId
          : !!(sp.cells && sp.cells.length > 0),
      )
      .slice(),
  );
  const { remove, cellsCleared } = pickBlastTargets(candidates, blastTarget);
  if (remove.length === 0) return false;

  if (remove.some((sp) => sp.character?.name === CHAR.Kanade)) {
    onKanadeCleared();
  }

  // Rui + NeneRobo showtime: random pick of the two blast lines.
  const blastKey = Math.random() < 0.5 ? "wonderBlastA" : "wonderBlastB";
  playLoadedSfx(blastKey, "sfx", SFX_EFFECT_BASE);

  addScore(cellsCleared);
  // Full clear presentation so blasted pieces are obvious (flash → glow → particles).
  await playClearAnimation(remove);
  return true;
};
