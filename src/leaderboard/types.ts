export type LeaderboardMode = "daily" | "endless" | "timeAttack";

export type LeaderboardServer = "official" | "bilibili";

export interface LeaderboardEntry {
  rank: number;
  score: number;
  display_name: string | null;
  is_public: boolean;
}

export interface LeaderboardResult {
  entries: LeaderboardEntry[];
  me: LeaderboardEntry | null;
  total: number;
  period_start: string;
  period_end: string;
}
