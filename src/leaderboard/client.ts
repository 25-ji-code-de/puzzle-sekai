import { GATEWAY_BASE } from "../auth/config";
import { getAccessToken } from "../auth";
import { utcDateKey } from "../domain/daily";
import type { ScoreSummary } from "../score";

export const DAILY_BOARD_ID = "pico-daily";
export const DAILY_RULES_VERSION = 1;

export interface LeaderboardEntry {
  rank: number;
  score: number;
  display_name: string | null;
  is_public: boolean;
}

export interface DailyLeaderboard {
  entries: LeaderboardEntry[];
  me: LeaderboardEntry | null;
  total: number;
  period_start: string;
  period_end: string;
}

let pendingDailySubmission: Promise<boolean> | null = null;

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

export const fetchDailyLeaderboard = async (): Promise<DailyLeaderboard> => {
  const response = await authorizedFetch(
    `/user/leaderboards/${DAILY_BOARD_ID}?limit=50`,
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

export const submitDailyScore = (summary: ScoreSummary): Promise<boolean> => {
  if (
    summary.mode !== "daily" ||
    summary.replaying ||
    summary.dailyDateKey !== utcDateKey()
  ) {
    return Promise.resolve(false);
  }

  pendingDailySubmission = authorizedFetch(
    `/user/leaderboards/${DAILY_BOARD_ID}`,
    {
      method: "POST",
      body: JSON.stringify({
        submission_id: crypto.randomUUID(),
        score: summary.score,
        metadata: {
          daily_date: summary.dailyDateKey,
          max_combo: summary.maxCombo,
          played_seconds: summary.playedSeconds,
          rules_version: DAILY_RULES_VERSION,
        },
      }),
    },
  )
    .then(() => true)
    .catch(() => false);
  return pendingDailySubmission;
};

export const waitForDailySubmission = async (): Promise<void> => {
  await pendingDailySubmission;
};
