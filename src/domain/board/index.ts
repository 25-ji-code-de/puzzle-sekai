/**
 * Domain board package: occupancy model + entity factories.
 */
export {
  BoardModel,
  getLiveBoard,
  resetLiveBoard,
  type FootprintEntry,
  type GravityPlan,
} from "./model";

export type { BoardEntity } from "./entity";
export {
  makeCell2Entity,
  makeBig2x2Entity,
  makeItemEntity,
  makeShrunkEntity,
} from "./entity";
