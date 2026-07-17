/**
 * Domain / application event stream (Phase A skeleton).
 * Presentation and audio will subscribe in later phases.
 */

import type { CharacterName } from "../../characters/ids";
import type { GroupName } from "../../settings/types";
import type { ReadonlyCell } from "./cell";
import type { EntityId } from "./entity";

export type ClearReason = "clear" | "blast" | "allergy" | "eat" | "shrink";

export type GameEvent =
  | { readonly type: "entityLanded"; readonly entityId: EntityId }
  | {
      readonly type: "cellsCleared";
      readonly cells: readonly ReadonlyCell[];
      readonly groups: readonly GroupName[];
      readonly silent: boolean;
    }
  | {
      readonly type: "entitiesRemoved";
      readonly ids: readonly EntityId[];
      readonly reason: ClearReason;
    }
  | {
      readonly type: "entityTransformed";
      readonly id: EntityId;
      readonly character: CharacterName;
      readonly reason: "emuShrink";
    }
  | { readonly type: "comboChanged"; readonly combo: number }
  | { readonly type: "scoreAdded"; readonly delta: number; readonly total: number }
  | { readonly type: "controlsSwap"; readonly on: boolean }
  | { readonly type: "speedMultChanged"; readonly mult: number };
