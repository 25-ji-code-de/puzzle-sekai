/**
 * Best-effort integration with the Bilibili Toy SDK.
 *
 * The SDK is injected by index.html and exposes a singleton as window.toy.
 * The game must remain fully playable outside Bilibili, so every call is
 * capability-checked and failures are intentionally non-fatal.
 */
import type { ScoreSummary } from "../score/model";
import { devWarn } from "../util/dev-log";
import type { LeaderboardEntry, LeaderboardResult } from "../leaderboard/types";

export interface ToyProfile {
  avatar?: string;
  nickname?: string;
}

export type BilibiliToyLeaderboardMode = "daily" | "endless" | "timeAttack";
export type BilibiliToyRankPeriod = "all" | "month" | "week" | "day";
export type BilibiliToyCloudScores = Record<BilibiliToyLeaderboardMode, number>;

export type ToyProfileStatus =
  | "idle"
  | "loading"
  | "waiting"
  | "ready"
  | "login-required"
  | "authorization-denied"
  | "unsupported"
  | "connection-error"
  | "error";

export interface BilibiliToySnapshot {
  available: boolean;
  initialized: boolean;
  profile: ToyProfile | null;
  profileStatus: ToyProfileStatus;
  profileError: string | null;
  cloudScores: BilibiliToyCloudScores;
}

interface ToyApi {
  getAbilities?: () => Promise<{ abilities?: string[] }>;
  getUserProfile?: () => Promise<ToyProfile>;
  getCloudStorage?: (keys: string[]) => Promise<Record<string, unknown>>;
  setCloudStorage?: (items: Record<string, unknown>) => Promise<void>;
  submitScore?: (options: { board: number; score: number }) => Promise<void>;
  getRankList?: (options: {
    board: number;
    period: BilibiliToyRankPeriod;
    limit: number;
  }) => Promise<unknown>;
  getMyRank?: (options: {
    board: number;
    period: BilibiliToyRankPeriod;
  }) => Promise<unknown>;
  reportAction?: (options: { userEventId: string }) => Promise<void>;
}

type ToyWindow = Window & { toy?: ToyApi };

const CLOUD_SCORE_PREFIX = "puzzleSekaiHighScore";
const SCORE_LIMIT = 2 ** 24 - 1;
const TOY_REQUEST_TIMEOUT_MS = 5000;
const TOY_DISCOVERY_TIMEOUT_MS = 15000;
const TOY_PROFILE_SLOW_MS = 5000;

let activeToy: ToyApi | null = null;
let initialization: Promise<void> | null = null;
let pendingToyScoreSubmission: Promise<boolean> | null = null;
let snapshot: BilibiliToySnapshot = {
  available: false,
  initialized: false,
  profile: null,
  profileStatus: "idle",
  profileError: null,
  cloudScores: { daily: 0, endless: 0, timeAttack: 0 },
};
const listeners = new Set<(state: BilibiliToySnapshot) => void>();

const callToyWithTimeout = async <T>(
  call: () => Promise<T> | undefined,
  label: string,
): Promise<T | undefined> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`[bilibili-toy] ${label} timed out`)),
      TOY_REQUEST_TIMEOUT_MS,
    );
  });
  try {
    return await Promise.race([Promise.resolve().then(call), timeout]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
};

const publish = () => {
  for (const listener of listeners) listener(snapshot);
};

export const getBilibiliToySnapshot = (): BilibiliToySnapshot => snapshot;

export const subscribeBilibiliToy = (
  listener: (state: BilibiliToySnapshot) => void,
): (() => void) => {
  listeners.add(listener);
  listener(snapshot);
  return () => listeners.delete(listener);
};

const readToy = (): ToyApi | null => {
  if (typeof window === "undefined") return null;
  const candidate = (window as ToyWindow).toy;
  return candidate && typeof candidate === "object" ? candidate : null;
};

/** Match the SDK's channel-selection environments without relying on its minified internals. */
const isToyRuntime = (): boolean => {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }
  const userAgent = navigator.userAgent || "";
  if (/BiliApp/i.test(userAgent) || /BiliHarmony/i.test(userAgent)) {
    return true;
  }
  if (/(^|\.)bilibili\.com$/i.test(window.location.hostname)) return true;
  try {
    return window.self !== window.top;
  } catch {
    // Cross-origin frame access is intentionally treated as embedded.
    return true;
  }
};

const waitForToy = async (): Promise<ToyApi | null> => {
  const immediate = readToy();
  if (immediate || !isToyRuntime()) return immediate;

  const deadline = Date.now() + TOY_DISCOVERY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await new Promise<void>((resolve) => setTimeout(resolve, 50));
    const toy = readToy();
    if (toy) return toy;
  }
  return null;
};

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const profileFailureStatus = (error: unknown): ToyProfileStatus => {
  const type =
    error && typeof error === "object" && "type" in error
      ? String((error as { type?: unknown }).type)
      : "";
  if (type === "not_logged_in") return "login-required";
  if (type === "user_denied") return "authorization-denied";
  if (type === "unsupported") return "unsupported";
  if (["timeout", "network_error"].includes(type)) {
    return "connection-error";
  }

  const message = errorMessage(error).toLowerCase();
  if (/not[_ -]?logged|login required/.test(message)) {
    return "login-required";
  }
  if (/user_denied|consent denied|data consent denied/.test(message)) {
    return "authorization-denied";
  }
  if (/unsupported|not supported/.test(message)) return "unsupported";
  if (/handshake|parent request|timed? out|timeout|network/.test(message)) {
    return "connection-error";
  }
  return "error";
};

const toyBoardForMode = (mode: BilibiliToyLeaderboardMode): number => {
  if (mode === "timeAttack") return 2;
  if (mode === "daily") return 3;
  return 1;
};

const toyPeriodForMode = (
  mode: BilibiliToyLeaderboardMode,
): BilibiliToyRankPeriod => (mode === "daily" ? "day" : "all");

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const finiteNumber = (value: unknown): number | null => {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
};

const firstArray = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value;
  const record = asRecord(value);
  for (const key of ["entries", "list", "items", "rank_list", "data"]) {
    if (Array.isArray(record?.[key])) return record[key] as unknown[];
  }
  return [];
};

const normalizeToyEntry = (
  value: unknown,
  index: number,
): LeaderboardEntry | null => {
  const record = asRecord(value);
  if (!record) return null;
  const user = asRecord(record.user_info) ?? asRecord(record.user);
  const rank =
    finiteNumber(record.rank ?? record.rank_num ?? record.order) ?? index + 1;
  const score = finiteNumber(record.score ?? record.value ?? record.points);
  if (score === null) return null;
  const displayName =
    record.nickname ??
    record.uname ??
    record.name ??
    user?.nickname ??
    user?.uname ??
    user?.name;
  return {
    rank: Math.max(1, Math.floor(rank)),
    score: Math.floor(score),
    display_name: typeof displayName === "string" ? displayName : null,
    is_public: true,
  };
};

const normalizeToyRankList = (value: unknown): LeaderboardEntry[] =>
  firstArray(value)
    .map((entry, index) => normalizeToyEntry(entry, index))
    .filter((entry): entry is LeaderboardEntry => entry !== null);

const normalizeToyMyRank = (value: unknown): LeaderboardEntry | null => {
  const record = asRecord(value);
  if (record?.ranked === false || record?.is_ranked === false) return null;
  return normalizeToyEntry(record ?? value, 0);
};

const toyLeaderboardResult = (
  list: unknown,
  myRank: unknown,
): LeaderboardResult => {
  const entries = normalizeToyRankList(list);
  const root = asRecord(list);
  const total =
    finiteNumber(root?.total ?? root?.total_count ?? root?.count) ??
    entries.length;
  return {
    entries,
    me: normalizeToyMyRank(myRank),
    total: Math.max(entries.length, Math.floor(total)),
    period_start: "",
    period_end: "",
  };
};

const cloudKeyForMode = (mode: BilibiliToyLeaderboardMode): string =>
  `${CLOUD_SCORE_PREFIX}_${mode}`;

const syncToyCloudScores = async (toy: ToyApi): Promise<void> => {
  if (!toy.getCloudStorage) return;
  try {
    const values = await callToyWithTimeout(
      () =>
        toy.getCloudStorage?.([
          cloudKeyForMode("endless"),
          cloudKeyForMode("timeAttack"),
          cloudKeyForMode("daily"),
        ]),
      "getCloudStorage",
    );
    if (!values) return;
    const cloudScores = { ...snapshot.cloudScores };
    for (const mode of ["endless", "timeAttack", "daily"] as const) {
      const score = finiteNumber(values[cloudKeyForMode(mode)]);
      if (score !== null && score >= 0) cloudScores[mode] = Math.floor(score);
    }
    snapshot = { ...snapshot, cloudScores };
    publish();
  } catch (error: unknown) {
    devWarn("[bilibili-toy] cloud score read failed", error);
  }
};

const report = (toy: ToyApi, userEventId: string): void => {
  if (!toy.reportAction) return;
  void Promise.resolve()
    .then(() => toy.reportAction?.({ userEventId }))
    .catch((error: unknown) => {
      devWarn(`[bilibili-toy] ${userEventId} failed`, error);
    });
};

/** Initialize the SDK when running inside a Bilibili Toy page. */
export const initializeBilibiliToy = (): Promise<void> => {
  if (initialization) return initialization;
  initialization = (async () => {
    // Keep a discovery fallback for cached HTML or unusually slow SDK loads.
    const toy = await waitForToy();
    if (!toy) {
      if (isToyRuntime()) {
        snapshot = {
          ...snapshot,
          initialized: true,
          profileStatus: "connection-error",
          profileError: "Toy SDK was not loaded",
        };
        publish();
      }
      return;
    }

    activeToy = toy;
    snapshot = {
      ...snapshot,
      available: true,
      profileStatus: "loading",
      profileError: null,
    };
    publish();

    try {
      await callToyWithTimeout(() => toy.getAbilities?.(), "getAbilities");
    } catch (error: unknown) {
      devWarn("[bilibili-toy] ability discovery failed", error);
    }
    report(toy, "game_start");

    let profileFinished = false;
    const slowTimer = setTimeout(() => {
      if (profileFinished) return;
      snapshot = {
        ...snapshot,
        initialized: true,
        profileStatus: "waiting",
      };
      publish();
    }, TOY_PROFILE_SLOW_MS);

    try {
      // The SDK may keep this pending while its parent handles login or consent.
      // Do not abandon the request: a later approval should still update the UI.
      const profile =
        (await Promise.resolve().then(() => toy.getUserProfile?.())) ?? null;
      profileFinished = true;
      snapshot = {
        ...snapshot,
        profile,
        profileStatus: profile ? "ready" : "error",
        profileError: profile ? null : "getUserProfile is unavailable",
      };
    } catch (error: unknown) {
      profileFinished = true;
      snapshot = {
        ...snapshot,
        profileStatus: profileFailureStatus(error),
        profileError: errorMessage(error),
      };
      devWarn("[bilibili-toy] initialization failed", error);
    } finally {
      clearTimeout(slowTimer);
    }
    if (snapshot.profileStatus === "ready") {
      await syncToyCloudScores(toy);
    }
    snapshot = { ...snapshot, initialized: true };
    publish();
  })();
  return initialization;
};

export const fetchBilibiliToyLeaderboard = async (
  mode: BilibiliToyLeaderboardMode,
): Promise<LeaderboardResult> => {
  await initializeBilibiliToy();
  const toy = activeToy ?? readToy();
  if (!toy?.getRankList) throw new Error("TOY_RANK_UNAVAILABLE");
  const board = toyBoardForMode(mode);
  const period = toyPeriodForMode(mode);
  const [listResult, myRankResult] = await Promise.allSettled([
    callToyWithTimeout(
      () => toy.getRankList?.({ board, period, limit: 50 }),
      "getRankList",
    ),
    toy.getMyRank
      ? callToyWithTimeout(
          () => toy.getMyRank?.({ board, period }),
          "getMyRank",
        )
      : Promise.resolve(undefined),
  ]);
  if (listResult.status === "rejected") throw listResult.reason;
  return toyLeaderboardResult(
    listResult.value,
    myRankResult.status === "fulfilled" ? myRankResult.value : undefined,
  );
};

const boardForMode = (mode: ScoreSummary["mode"]): number => {
  if (mode === "timeAttack") return 2;
  if (mode === "daily") return 3;
  return 1;
};

/** Submit a standard, non-replay run to Toy cloud storage and ranking. */
export const submitBilibiliToyScore = async (
  summary: ScoreSummary,
): Promise<boolean> => {
  if (summary.replaying || summary.entertainment || summary.score <= 0) {
    return false;
  }

  const submission = (async (): Promise<boolean> => {
    if (!activeToy) await initializeBilibiliToy();
    const toy = activeToy ?? readToy();
    if (!toy) return false;
    activeToy = toy;

    const score = Math.min(
      SCORE_LIMIT,
      Math.max(
        -SCORE_LIMIT - 1,
        Math.floor(
          summary.mode === "daily" ? summary.score : summary.effectiveScore,
        ),
      ),
    );
    const operations: Promise<unknown>[] = [];
    if (toy.submitScore) {
      operations.push(
        Promise.resolve().then(() =>
          toy.submitScore?.({ board: boardForMode(summary.mode), score }),
        ),
      );
    }
    if (summary.isNewRecord && toy.setCloudStorage) {
      operations.push(
        Promise.resolve().then(() =>
          toy.setCloudStorage?.({
            [cloudKeyForMode(summary.mode)]: summary.score,
          }),
        ),
      );
    }
    if (toy.reportAction) {
      operations.push(
        Promise.resolve().then(() =>
          toy.reportAction?.({ userEventId: "game_over" }),
        ),
      );
    }

    if (operations.length === 0) return false;
    const results = await Promise.allSettled(operations);
    const succeeded = results.some((result) => result.status === "fulfilled");
    if (succeeded && summary.isNewRecord) {
      snapshot = {
        ...snapshot,
        cloudScores: {
          ...snapshot.cloudScores,
          [summary.mode]: summary.score,
        },
      };
      publish();
    }
    if (!succeeded) {
      devWarn("[bilibili-toy] score sync failed", results);
    }
    return succeeded;
  })();
  pendingToyScoreSubmission = submission;
  return submission;
};

export const waitForBilibiliToyScore = async (): Promise<void> => {
  await pendingToyScoreSubmission;
};

export const isBilibiliToyAvailable = (): boolean => isToyRuntime();

export const isBilibiliToyReady = (): boolean =>
  snapshot.profileStatus === "ready";
