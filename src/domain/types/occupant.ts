/**
 * Board grid occupant model.
 *
 * Storage form remains a compact token string for compatibility with the
 * existing (string|null)[][] grid. Use Occupant objects at domain boundaries
 * when building richer APIs.
 */

import type { CharacterName } from "../../characters/ids";
import { CHAR } from "../../characters/ids";

/** Marker written into the grid for non-character items. */
export const ITEM_TOKEN = "Item" as const;
export type ItemToken = typeof ITEM_TOKEN;

/** Compact grid cell value (legacy-compatible). */
export type CellToken = CharacterName | ItemToken;
export type BoardCell = CellToken | null;

/** Board grid of compact tokens. */
export type BoardGrid = BoardCell[][];

/** Richer occupant form for future BoardModel / snapshots. */
export type Occupant =
  | { readonly kind: "character"; readonly name: CharacterName }
  | { readonly kind: "item" }
  | { readonly kind: "empty" };

const CHAR_NAME_SET = new Set<string>(Object.values(CHAR));

export const isCharacterName = (v: unknown): v is CharacterName =>
  typeof v === "string" && CHAR_NAME_SET.has(v);

export const isCellToken = (v: unknown): v is CellToken =>
  v === ITEM_TOKEN || isCharacterName(v);

export const tokenToOccupant = (token: BoardCell): Occupant => {
  if (token == null) return { kind: "empty" };
  if (token === ITEM_TOKEN) return { kind: "item" };
  return { kind: "character", name: token };
};

export const occupantToToken = (occ: Occupant): BoardCell => {
  switch (occ.kind) {
    case "empty":
      return null;
    case "item":
      return ITEM_TOKEN;
    case "character":
      return occ.name;
  }
};

/** Coerce unknown grid string into BoardCell (invalid → null). */
export const asBoardCell = (v: string | null | undefined): BoardCell => {
  if (v == null) return null;
  if (v === ITEM_TOKEN) return ITEM_TOKEN;
  if (isCharacterName(v)) return v;
  return null;
};
