/**
 * Entity identity brands (domain kernel).
 * Full BoardEntity union lands in Phase B with BoardModel.
 */

export type EntityId = string & { readonly __brand: "EntityId" };

let nextEntitySeq = 1;

export const createEntityId = (prefix = "e"): EntityId =>
  `${prefix}_${nextEntitySeq++}` as EntityId;

export const resetEntityIdSeq = (): void => {
  nextEntitySeq = 1;
};
