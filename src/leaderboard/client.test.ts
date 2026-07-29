import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ScoreSummary } from "../score";

const getAccessToken = vi.fn<() => Promise<string | null>>();

vi.mock("../auth", () => ({ getAccessToken }));
vi.mock("../auth/config", () => ({ GATEWAY_BASE: "https://gateway.test" }));

const dailySummary = (overrides: Partial<ScoreSummary> = {}) =>
  ({
    mode: "daily",
    replaying: false,
    dailyDateKey: "2026-07-29",
    score: 12345,
    effectiveScore: 4321.9,
    entertainment: false,
    maxCombo: 8,
    playedSeconds: 95,
    ...overrides,
  }) as ScoreSummary;

describe("daily leaderboard client", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-29T12:00:00Z"));
    getAccessToken.mockReset();
    getAccessToken.mockResolvedValue("token");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ success: true }), { status: 202 }),
        ),
    );
  });

  it("submits a current, non-replay daily score with rule metadata", async () => {
    const { submitDailyScore } = await import("./client");

    expect(await submitDailyScore(dailySummary())).toBe(true);
    expect(fetch).toHaveBeenCalledOnce();
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("https://gateway.test/user/leaderboards/pico-daily");
    expect(init?.method).toBe("POST");
    expect(new Headers(init?.headers).get("Authorization")).toBe(
      "Bearer token",
    );
    expect(JSON.parse(String(init?.body))).toMatchObject({
      score: 12345,
      metadata: {
        daily_date: "2026-07-29",
        max_combo: 8,
        played_seconds: 95,
        rules_version: 1,
      },
    });
  });

  it.each([
    { replaying: true },
    { entertainment: true },
    { dailyDateKey: "2026-07-28" },
  ])("does not submit an ineligible result: %o", async (overrides) => {
    const { submitDailyScore } = await import("./client");

    expect(await submitDailyScore(dailySummary(overrides))).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    ["endless", "pico-endless"],
    ["timeAttack", "pico-time-attack"],
  ] as const)("submits normalized %s scores", async (mode, boardId) => {
    const { submitLeaderboardScore } = await import("./client");

    expect(await submitLeaderboardScore(dailySummary({ mode }))).toBe(true);
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe(`https://gateway.test/user/leaderboards/${boardId}`);
    expect(JSON.parse(String(init?.body))).toMatchObject({
      score: 4321,
      metadata: { mode, raw_score: 12345 },
    });
  });

  it("requires an access token", async () => {
    getAccessToken.mockResolvedValue(null);
    const { fetchDailyLeaderboard } = await import("./client");

    await expect(fetchDailyLeaderboard()).rejects.toThrow("AUTH_REQUIRED");
    expect(fetch).not.toHaveBeenCalled();
  });
});
