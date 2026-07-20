/**
 * Pure presentation helpers for run score summaries.
 * No DOM / canvas — used by game-over UI and share-card.
 */
import { GAME_GROUPS, type GroupName } from "../settings/types";
import type { ScoreSummary } from "./model";
import { padStartDigits, splitPaddedDigits } from "../util/pad";
import { formatTimesMult } from "../util/format";

export const padDigits = (n: number, len: number): string =>
  padStartDigits(n, len);

/**
 * Split a zero-padded number into dim leading zeros + solid significant digits.
 * When value is 0, the final "0" stays solid (still significant).
 */
export const splitPaddedNumber = (
  n: number,
  len: number,
): { pad: string; solid: string } => splitPaddedDigits(n, len);

/** Official unit order: Leo/need → MMJ → VBS → WxS → 25時. */
export const groupsForSummary = (summary: ScoreSummary): GroupName[] => {
  const wanted = new Set<GroupName>(summary.selectedGroups);
  for (const g of Object.keys(summary.groupClears) as GroupName[]) {
    if ((summary.groupClears[g] ?? 0) > 0) wanted.add(g);
  }
  return GAME_GROUPS.filter((g) => wanted.has(g));
};

export const formatMultiplier = (mult: number): string => formatTimesMult(mult);

export const SCORE_PAD = 8;
export const COMBO_PAD = 4;
export const GROUP_CLEAR_PAD = 4;
