/**
 * ショウタイム爆破 — Rui + NeneRobo clear adjacency blasts random cells.
 */
import { addScore } from "../../score";
import { ROWS, COLUMNS } from "../../config";
import { SpriteData, sprites } from "../../game/board-state";
import { onKanadeCleared } from "../../fun/effects";
import { createParticles } from "../particles";
import { removeSpritesFromBoard } from "../mutate";
import { anyPairAdjacent, shuffleInPlace } from "../grid";
import { CHAR } from "../../characters/ids";

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
    cellsCleared += sp.cells?.length ?? 1;
  }
  return { remove, cellsCleared };
};

/**
 * When Rui and NeneRobo are both in a cleared set AND share an edge,
 * randomly blast extra pieces.
 */
export const applyWonderBlast = (cleared: SpriteData[]) => {
  const ruiSprites = cleared.filter((sp) => sp.character?.name === CHAR.Rui);
  const neneRoboSprites = cleared.filter(
    (sp) => sp.character?.name === CHAR.NeneRobo,
  );
  if (ruiSprites.length === 0 || neneRoboSprites.length === 0) return;
  if (!anyPairAdjacent(ruiSprites, neneRoboSprites)) return;

  const ruiNeneCount = ruiSprites.length + neneRoboSprites.length;
  const halfBoard = Math.floor((ROWS * COLUMNS) / 2);
  const blastTarget = Math.min(12, halfBoard, 2 + 2 * ruiNeneCount);
  if (blastTarget <= 0) return;

  const candidates = shuffleInPlace(
    sprites.filter((sp) => sp.cells && sp.cells.length > 0).slice(),
  );
  const { remove, cellsCleared } = pickBlastTargets(candidates, blastTarget);
  if (remove.length === 0) return;

  if (remove.some((sp) => sp.character?.name === CHAR.Kanade)) {
    onKanadeCleared();
  }

  addScore(cellsCleared);
  createParticles(remove);
  removeSpritesFromBoard(remove);
};
