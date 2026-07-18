/**
 * Pure presentation helpers for run score summaries.
 * No DOM / canvas — used by game-over UI and share-card.
 */
import { GAME_GROUPS, type GroupName } from "../settings";
import type { ScoreSummary } from "./model";

export const padDigits = (n: number, len: number): string =>
  String(Math.max(0, Math.floor(n))).padStart(len, "0");

/**
 * Split a zero-padded number into dim leading zeros + solid significant digits.
 * When value is 0, the final "0" stays solid (still significant).
 */
export const splitPaddedNumber = (
  n: number,
  len: number,
): { pad: string; solid: string } => {
  const padded = padDigits(n, len);
  const first = padded.search(/[^0]/);
  const split = first === -1 ? Math.max(0, padded.length - 1) : first;
  return { pad: padded.slice(0, split), solid: padded.slice(split) };
};

/** Official unit order: Leo/need → MMJ → VBS → WxS → 25時. */
export const groupsForSummary = (summary: ScoreSummary): GroupName[] => {
  const wanted = new Set<GroupName>(summary.selectedGroups);
  for (const g of Object.keys(summary.groupClears) as GroupName[]) {
    if ((summary.groupClears[g] ?? 0) > 0) wanted.add(g);
  }
  return GAME_GROUPS.filter((g) => wanted.has(g));
};

export const formatMultiplier = (mult: number): string => `×${mult.toFixed(2)}`;

export const SCORE_PAD = 8;
export const COMBO_PAD = 4;
export const GROUP_CLEAR_PAD = 4;
