import { GATEWAY_BASE } from "../auth/config";
import { getAccessToken } from "../auth";
import { utcDateKey } from "../domain/daily";
import type { ScoreSummary } from "../score";
import type {
  LeaderboardEntry,
  LeaderboardMode,
  LeaderboardResult,
} from "./types";

export type {
  LeaderboardEntry,
  LeaderboardMode,
  LeaderboardResult,
} from "./types";

export const DAILY_BOARD_ID = "pico-daily";
export const DAILY_RULES_VERSION = 1;
export const BOARD_IDS = {
  daily: DAILY_BOARD_ID,
  endless: "pico-endless",
  timeAttack: "pico-time-attack",
} as const;
export type DailyLeaderboard = LeaderboardResult;

let pendingSubmission: Promise<boolean> | null = null;

const authorizedFetch = async (path: string, init?: RequestInit) => {
  const token = await getAccessToken();
  if (!token) throw new Error("AUTH_REQUIRED");
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (init?.body) headers.set("Content-Type", "application/json");
  const response = await fetch(`${GATEWAY_BASE}${path}`, { ...init, headers });
  if (!response.ok) throw new Error(`LEADERBOARD_HTTP_${response.status}`);
  return response;
};

export const fetchLeaderboard = async (
  mode: LeaderboardMode = "daily",
): Promise<DailyLeaderboard> => {
  const response = await authorizedFetch(
    `/user/leaderboards/${BOARD_IDS[mode]}?limit=50`,
  );
  const payload = (await response.json()) as {
    entries?: LeaderboardEntry[];
    me?: LeaderboardEntry | null;
    total?: number;
    leaderboard?: { period_start?: string; period_end?: string };
  };
  return {
    entries: payload.entries ?? [],
    me: payload.me ?? null,
    total: payload.total ?? 0,
    period_start: payload.leaderboard?.period_start ?? utcDateKey(),
    period_end: payload.leaderboard?.period_end ?? utcDateKey(),
  };
};

export const fetchDailyLeaderboard = (): Promise<DailyLeaderboard> =>
  fetchLeaderboard("daily");

export const submitLeaderboardScore = (
  summary: ScoreSummary,
): Promise<boolean> => {
  if (summary.replaying || summary.entertainment) {
    return Promise.resolve(false);
  }
  if (summary.mode === "daily" && summary.dailyDateKey !== utcDateKey()) {
    return Promise.resolve(false);
  }

  const boardId = BOARD_IDS[summary.mode];
  const leaderboardScore =
    summary.mode === "daily"
      ? summary.score
      : Math.floor(summary.effectiveScore);

  pendingSubmission = authorizedFetch(`/user/leaderboards/${boardId}`, {
    method: "POST",
    body: JSON.stringify({
      submission_id: crypto.randomUUID(),
      score: leaderboardScore,
      metadata: {
        mode: summary.mode,
        raw_score: summary.score,
        daily_date: summary.dailyDateKey,
        max_combo: summary.maxCombo,
        played_seconds: summary.playedSeconds,
        difficulty: summary.difficulty,
        rules_version: DAILY_RULES_VERSION,
      },
    }),
  })
    .then(() => true)
    .catch(() => false);
  return pendingSubmission;
};

export const submitDailyScore = submitLeaderboardScore;

export const waitForScoreSubmission = async (): Promise<void> => {
  await pendingSubmission;
};

export const waitForDailySubmission = waitForScoreSubmission;
