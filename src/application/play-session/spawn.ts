/**
 * Spawn next piece or item pair for the match loop.
 */
import type * as PIXI from "pixi.js-legacy";
import { COLUMNS } from "../../config";
import {
  nextCharacter,
  randomCharacter,
  fly,
  createPiece,
  showNextPiece,
} from "../../active";
import { createItem, getRandomItem } from "../../items";
import { maxOccupiedHeight } from "../../domain/piece";
import { primaryFromSprite } from "../../presentation/placement";
import { getGrid, sprites } from "../../game/board-state";
import { getCurrentSettings, getItemDropChance } from "../../settings";
import { playLoadedSfx } from "../../audio/sfx";
import { app } from "../../runtime";
import { handleItemLand, handleCharacterLand } from "./land";
import { isMatchOpen } from "./match-gate";
import type { CharacterData } from "../../characters/data";
import {
  highestBodyTop,
  isContinuousPhysics,
} from "../../board/dynamics";
import {
  BOX_SIZE,
  ROWS,
  STAGE_HEIGHT,
  OFFSET_BOTTOM,
} from "../../config";

export type SpawnDeps = {
  /** Current sprites.length before push (land index base). */
  getSpriteIndexBase: () => number;
  /** Avatar stab animation while next piece flies out. */
  avatarStab: PIXI.AnimatedSprite;
  getNextPiece: () => PIXI.Sprite | undefined;
  setNextPiece: (s: PIXI.Sprite) => void;
  onTopOut: () => void;
  onSpawnComplete: () => void;
  /**
   * Piece is airborne on gameTicker. Caller should keep the main loop parked
   * (there is no "falling" MainLoopFn — fall logic is not on app.ticker).
   */
  onFalling: () => void;
  /** Spawn could not start a piece (caller should unlock create latch). */
  onSpawnAborted?: () => void;
};

const refreshNextPreview = async (deps: SpawnDeps): Promise<void> => {
  if (!nextCharacter) return;
  const preview = await showNextPiece(
    nextCharacter.preview ?? nextCharacter.file,
  );
  deps.setNextPiece(preview);
};

/**
 * One spawn cycle: either two items or one character.
 * Calls onSpawnComplete when ready for the next create(), onTopOut on fail.
 * Never hard-depends on a pre-existing next preview sprite.
 */
export const spawnNext = async (deps: SpawnDeps): Promise<void> => {
  if (!isMatchOpen()) {
    deps.onSpawnAborted?.();
    return;
  }

  const index = deps.getSpriteIndexBase();
  let maxHeight: number;
  if (isContinuousPhysics()) {
    // Approximate occupied rows from highest body top
    const top = highestBodyTop();
    const floor = STAGE_HEIGHT - OFFSET_BOTTOM;
    const filledPx = Math.max(0, floor - top);
    maxHeight = Math.min(ROWS, Math.ceil(filledPx / BOX_SIZE));
  } else {
    maxHeight = maxOccupiedHeight(getGrid());
  }
  const settings = getCurrentSettings();

  if (maxHeight < 5 && Math.random() < getItemDropChance(settings)) {
    const itemFile = getRandomItem();
    const dropped = [false, false];
    const finished = [false, false];

    const finishPair = () => {
      if (finished.every(Boolean) && dropped.every(Boolean) && isMatchOpen()) {
        deps.onSpawnComplete();
      }
    };

    const onDropped = (id: number) => async (sprite: PIXI.Sprite) => {
      if (!isMatchOpen()) {
        finished[id] = true;
        return;
      }
      const { x, y } = primaryFromSprite(sprite, "item", "ceil");
      const outcome = await handleItemLand(sprite, index + id, itemFile, x, y);
      finished[id] = true;
      if (!isMatchOpen()) return;
      if (outcome.topOut) {
        deps.onTopOut();
        return;
      }
      dropped[id] = true;
      finishPair();
    };

    const positions = Array(COLUMNS)
      .fill(0)
      .map((_, i) => i);
    await Promise.all([
      createItem(
        itemFile,
        positions.splice(Math.floor(Math.random() * positions.length))[0],
        onDropped(0),
      ).then((item) => {
        if (!sprites.some((s) => s.sprite === item)) {
          sprites.push({ sprite: item, isItem: true, itemFile });
        }
        return item;
      }),
      createItem(
        itemFile,
        positions.splice(Math.floor(Math.random() * positions.length))[0],
        onDropped(1),
      ).then((item) => {
        if (!sprites.some((s) => s.sprite === item)) {
          sprites.push({ sprite: item, isItem: true, itemFile });
        }
        return item;
      }),
    ]);
    if (isMatchOpen()) deps.onFalling();
    return;
  }

  const character = randomCharacter() as CharacterData | undefined;
  if (!character?.file) {
    deps.onSpawnAborted?.();
    return;
  }

  const onDropped = async (sprite: PIXI.Sprite) => {
    if (!isMatchOpen()) return;
    const outcome = await handleCharacterLand(sprite, index, character);
    if (!isMatchOpen()) return;
    if (outcome.topOut) {
      deps.onTopOut();
    } else {
      deps.onSpawnComplete();
    }
  };

  const beginPiece = async () => {
    const piece = await createPiece(character.file, onDropped);
    if (!sprites.some((s) => s.sprite === piece)) {
      sprites.push({ sprite: piece, character });
    }
  };

  const preview = deps.getNextPiece();
  if (preview) {
    deps.avatarStab.play();
    fly(preview, async (s) => {
      deps.avatarStab.gotoAndStop(0);
      app.stage.removeChild(s);
      if (!isMatchOpen()) return;
      // Kick next preview without blocking the falling piece.
      void refreshNextPreview(deps);
      await beginPiece();
    });
  } else {
    // No preview yet (async race / empty bag recovery): still spawn.
    void refreshNextPreview(deps);
    await beginPiece();
  }

  if (character.sounds?.fall?.length) {
    const fallSounds = character.sounds.fall;
    const key = fallSounds[Math.floor(Math.random() * fallSounds.length)];
    playLoadedSfx(key, "voice", 0.5);
  }

  if (isMatchOpen()) deps.onFalling();
};
