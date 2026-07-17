/**
 * Board entity model (logic identity independent of PIXI sprites).
 * Presentation keeps Map<EntityId, Sprite> separately.
 */
import type { CharacterName } from "../../characters/ids";
import type { GroupName } from "../../settings/types";
import type { Cell, Orientation, EntityId } from "../types";
import { createEntityId } from "../types";

export type BoardEntity =
  | {
      readonly id: EntityId;
      readonly kind: "cell2";
      readonly character: CharacterName;
      readonly group: GroupName | "Special";
      readonly cells: readonly Cell[];
      readonly orientation: Orientation;
    }
  | {
      readonly id: EntityId;
      readonly kind: "big2x2";
      readonly character: CharacterName;
      readonly group: GroupName | "Special";
      readonly cells: readonly Cell[];
      readonly orientation: Orientation;
    }
  | {
      readonly id: EntityId;
      readonly kind: "item";
      readonly itemFile: string;
      readonly cells: readonly Cell[];
    }
  | {
      readonly id: EntityId;
      readonly kind: "shrunk";
      readonly character: CharacterName;
      readonly cells: readonly Cell[];
    };

/** Build a cell2 entity at the given footprint. */
export const makeCell2Entity = (opts: {
  character: CharacterName;
  group: GroupName | "Special";
  cells: Cell[];
  orientation: Orientation;
}): BoardEntity => ({
  id: createEntityId("c2"),
  kind: "cell2",
  character: opts.character,
  group: opts.group,
  cells: opts.cells,
  orientation: opts.orientation,
});

export const makeBig2x2Entity = (opts: {
  character: CharacterName;
  group: GroupName | "Special";
  cells: Cell[];
  orientation?: Orientation;
}): BoardEntity => ({
  id: createEntityId("b2"),
  kind: "big2x2",
  character: opts.character,
  group: opts.group,
  cells: opts.cells,
  orientation: opts.orientation ?? 0,
});

export const makeItemEntity = (opts: {
  itemFile: string;
  cells: Cell[];
}): BoardEntity => ({
  id: createEntityId("it"),
  kind: "item",
  itemFile: opts.itemFile,
  cells: opts.cells,
});

export const makeShrunkEntity = (opts: {
  character: CharacterName;
  cells: Cell[];
}): BoardEntity => ({
  id: createEntityId("sh"),
  kind: "shrunk",
  character: opts.character,
  cells: opts.cells,
});
