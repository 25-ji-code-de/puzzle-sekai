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
} from "../../piece";
import { createItem, getRandomItem } from "../../items";
import { getCoordinates, getMaxStackHeight } from "../../utils/coords";
import { getCurrentSettings, getItemDropChance } from "../../settings";
import { playLoadedSfx } from "../../audio/sfx";
import { sprites } from "../../game/board-state";
import { app } from "../../runtime";
import {
  handleItemLand,
  handleCharacterLand,
} from "./land";
import type { CharacterData } from "../../characters/data";

export type SpawnDeps = {
  /** Current sprites.length before push (land index base). */
  getSpriteIndexBase: () => number;
  /** Avatar stab animation while next piece flies out. */
  avatarStab: PIXI.AnimatedSprite;
  getNextPiece: () => PIXI.Sprite | undefined;
  setNextPiece: (s: PIXI.Sprite) => void;
  onTopOut: () => void;
  onSpawnComplete: () => void;
  /** Set falling ticker state while piece is in the air. */
  onFalling: () => void;
};

/**
 * One spawn cycle: either two items or one character.
 * Calls onSpawnComplete when ready for the next create(), onTopOut on fail.
 */
export const spawnNext = async (deps: SpawnDeps): Promise<void> => {
  const index = deps.getSpriteIndexBase();
  const maxHeight = getMaxStackHeight();
  const settings = getCurrentSettings();

  if (maxHeight < 5 && Math.random() < getItemDropChance(settings)) {
    const itemFile = getRandomItem();
    const dropped = [false, false];
    const onDropped = (id: number) => async (sprite: PIXI.Sprite) => {
      const { x, y } = getCoordinates(sprite);
      const outcome = await handleItemLand(sprite, index + id, itemFile, x, y);
      if (outcome.topOut) {
        deps.onTopOut();
      } else {
        dropped[id] = true;
        if (dropped.every((e) => e)) {
          deps.onSpawnComplete();
        }
      }
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
    deps.onFalling();
    return;
  }

  const character = randomCharacter() as CharacterData;
  const onDropped = async (sprite: PIXI.Sprite) => {
    const outcome = await handleCharacterLand(sprite, index, character);
    if (outcome.topOut) {
      deps.onTopOut();
    } else {
      deps.onSpawnComplete();
    }
  };

  const nextPiece = deps.getNextPiece();
  if (nextPiece) {
    deps.avatarStab.play();
    fly(nextPiece, async (s) => {
      deps.avatarStab.gotoAndStop(0);
      app.stage.removeChild(s);
      if (nextCharacter) {
        const preview = await showNextPiece(
          nextCharacter.preview ?? nextCharacter.file,
        );
        deps.setNextPiece(preview);
      }
      const piece = await createPiece(character.file, onDropped);
      sprites.push({ sprite: piece, character });
    });
  }

  if (character.sounds?.fall?.length) {
    const fallSounds = character.sounds.fall;
    const key = fallSounds[Math.floor(Math.random() * fallSounds.length)];
    playLoadedSfx(key, "voice", 0.5);
  }

  deps.onFalling();
};
