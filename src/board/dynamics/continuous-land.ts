/**
 * Continuous-path land commit: assign entity id + register dynamic Rapier body.
 * Does NOT write BoardModel grid.
 */
import type * as PIXI from "pixi.js-legacy";
import type { CharacterData } from "../../characters/data";
import type { CharacterName } from "../../characters/ids";
import type { GroupName } from "../../settings/types";
import {
  makeBig2x2Entity,
  makeCell2Entity,
  makeItemEntity,
  makeShrunkEntity,
} from "../../domain/board";
import { pieceKindFrom } from "../../domain/types";
import { asCell } from "../../domain/types";
import { sprites } from "../../game/board-state";
import { registerEntitySprite } from "../../presentation/entity-view";
import { massOfKind } from "./colliders";
import { commitDynamicBody } from "./world";

/**
 * Land a sprite into the continuous physics world.
 * Creates domain entity identity and a dynamic rigid body.
 */
export const commitLandContinuous = (
  sprite: PIXI.Sprite,
  index: number,
  character?: Pick<CharacterData, "name"> & { group?: GroupName | "Special" },
  isItem: boolean = false,
): void => {
  let idx = sprites.findIndex((s) => s.sprite === sprite);
  if (idx < 0) idx = index;
  const entry = sprites[idx];
  if (!entry) return;

  const kind = pieceKindFrom({
    characterName: character?.name ?? entry.character?.name,
    isItem: isItem || entry.isItem,
    isShrunk: entry.isShrunk,
  });

  // Continuous path: cells stay undefined
  entry.cells = undefined;
  entry.mass = massOfKind(kind);
  entry.pose = { x: sprite.x, y: sprite.y, rotation: sprite.rotation };

  if (!entry.entityId) {
    const group = (entry.character?.group ??
      character?.group ??
      "Special") as GroupName | "Special";
    const charName = (character?.name ?? entry.character?.name) as
      | CharacterName
      | undefined;

    // Dummy single cell for entity factories that require cells[] shape
    const dummy = [asCell([0, 0])];

    if (kind === "item") {
      const ent = makeItemEntity({
        itemFile: entry.itemFile ?? "item",
        cells: dummy,
      });
      entry.entityId = ent.id;
      registerEntitySprite(ent.id, sprite);
    } else if (kind === "big2x2" && charName) {
      const ent = makeBig2x2Entity({
        character: charName,
        group,
        cells: dummy,
      });
      entry.entityId = ent.id;
      registerEntitySprite(ent.id, sprite);
    } else if (kind === "shrunk" && charName) {
      const ent = makeShrunkEntity({
        character: charName,
        cells: dummy,
      });
      entry.entityId = ent.id;
      registerEntitySprite(ent.id, sprite);
    } else if (charName) {
      const ent = makeCell2Entity({
        character: charName,
        group,
        cells: dummy,
        orientation: 0,
      });
      entry.entityId = ent.id;
      registerEntitySprite(ent.id, sprite);
    }
  }

  if (entry.entityId) {
    commitDynamicBody(entry.entityId, sprite, kind, {
      characterName: character?.name ?? entry.character?.name,
      itemFile: entry.itemFile,
      isShrunk: entry.isShrunk,
    });
  }
};
