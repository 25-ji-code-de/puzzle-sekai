/**
 * Domain board package.
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
  createEntityId,
  makeCell2Entity,
  makeBig2x2Entity,
  makeItemEntity,
  makeShrunkEntity,
} from "./entity";
