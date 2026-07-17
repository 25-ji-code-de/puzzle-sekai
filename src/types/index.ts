/**
 * App-wide types barrel — preferred import path for shared brands & conventions.
 *
 *   import type { Cell, Col, Row, Orientation, PieceKind, EntityId } from "../types";
 *   import { col, row, cell, asOrientation, pieceKindFrom, CHAR } from "../types";
 *
 * Do NOT re-declare Cell / Orientation / PieceKind / EntityId / RoundMethod
 * in feature modules — re-export from here if needed.
 */
export type {
  Col,
  Row,
  Cell,
  ReadonlyCell,
  Orientation,
  Primary,
  LooseCell,
  LoosePrimary,
  PieceKind,
  Big2x2Name,
  RoundMethod,
  EntityId,
  ItemToken,
  CellToken,
  BoardCell,
  BoardGrid,
  Occupant,
  ClearReason,
  GameEvent,
} from "../domain/types";

export {
  ORIENTATIONS,
  col,
  row,
  cell,
  cellX,
  cellY,
  asCell,
  asLoose,
  cellsEqual,
  asOrientation,
  isOrientation,
  primary,
  asPrimary,
  PIECE_KINDS,
  isPieceKind,
  isBig2x2Name,
  pieceKindFrom,
  ROUND_METHODS,
  isRoundMethod,
  rotationToOrientation,
  orientationToRotation,
  ITEM_TOKEN,
  isCharacterName,
  isCellToken,
  tokenToOccupant,
  occupantToToken,
  asBoardCell,
  createEntityId,
  resetEntityIdSeq,
  assertNever,
} from "../domain/types";

export type { CharacterName } from "../characters/ids";
export {
  CHAR,
  characterFromFile,
  fileIsCharacter,
  fileIsBig2x2,
  isAllergyAvoiderName,
  isAllergyAvoiderFile,
} from "../characters/ids";

export type {
  GroupName,
  GameMode,
  GameSettings,
  SpeedLevel,
  SpawnOrientation,
  ItemDropRate,
  TimeAttackDuration,
  DifficultyLevel,
  HighScoreRecord,
} from "../settings/types";
export {
  GAME_GROUPS,
  DEFAULT_SETTINGS,
  SPEED_MULTIPLIERS,
  SPAWN_ORIENTATIONS,
  ITEM_DROP_RATES,
} from "../settings/types";

export type { MessageKey, LocaleTree } from "../i18n/types";
export type { Locale } from "../i18n";

export type {
  FunModeId,
  PhysicsFunModeId,
  FunModeDef,
  FunModeFlags,
} from "../fun/modes";
export {
  FUN_MODE_IDS,
  PHYSICS_FUN_MODE_IDS,
  FUN_MODE_DEFS,
  DEFAULT_FUN_MODES,
} from "../fun/modes";

export type { PlayPhase } from "../application/play-session/phase";
export type { DialogButtonVariant } from "../ui/dialog-button";
export type { FontScheme, FontFamilyRole } from "../ui/fonts";
