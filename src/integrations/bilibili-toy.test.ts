import { afterEach, describe, expect, it, vi } from "vitest";
import type { ScoreSummary } from "../score/model";

const makeSummary = (overrides: Partial<ScoreSummary> = {}): ScoreSummary =>
  ({
    score: 100,
    effectiveScore: 150.8,
    mode: "endless",
    replaying: false,
    entertainment: false,
    isNewRecord: true,
    ...overrides,
  }) as ScoreSummary;

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("Bilibili Toy integration", () => {
  it("is a no-op when the Toy SDK is unavailable", async () => {
    const { initializeBilibiliToy, submitBilibiliToyScore } =
      await import("./bilibili-toy");

    await expect(initializeBilibiliToy()).resolves.toBeUndefined();
    await expect(submitBilibiliToyScore(makeSummary())).resolves.toBe(false);
  });

  it("initializes the Toy channel and submits a standard score", async () => {
    const toy = {
      getAbilities: vi.fn().mockResolvedValue({ abilities: ["rank"] }),
      getUserProfile: vi
        .fn()
        .mockResolvedValue({ nickname: "Test", avatar: "avatar" }),
      reportAction: vi.fn().mockResolvedValue(undefined),
      submitScore: vi.fn().mockResolvedValue(undefined),
      setCloudStorage: vi.fn().mockResolvedValue(undefined),
    };
    vi.stubGlobal("window", { toy });
    const { initializeBilibiliToy, submitBilibiliToyScore } =
      await import("./bilibili-toy");

    await initializeBilibiliToy();
    await expect(
      submitBilibiliToyScore(makeSummary({ mode: "timeAttack" })),
    ).resolves.toBe(true);

    expect(toy.getAbilities).toHaveBeenCalledOnce();
    expect(toy.getUserProfile).toHaveBeenCalledOnce();
    expect(toy.submitScore).toHaveBeenCalledWith({ board: 2, score: 150 });
    expect(toy.setCloudStorage).toHaveBeenCalledWith({
      puzzleSekaiHighScore_timeAttack: 100,
    });
    expect(toy.reportAction).toHaveBeenCalledWith({
      userEventId: "game_start",
    });
    expect(toy.reportAction).toHaveBeenCalledWith({
      userEventId: "game_over",
    });
  });

  it("uses raw daily score and skips entertainment runs", async () => {
    const toy = {
      submitScore: vi.fn().mockResolvedValue(undefined),
    };
    vi.stubGlobal("window", { toy });
    const { submitBilibiliToyScore } = await import("./bilibili-toy");

    await submitBilibiliToyScore(
      makeSummary({ mode: "daily", score: 80, effectiveScore: 999 }),
    );
    await submitBilibiliToyScore(makeSummary({ entertainment: true }));

    expect(toy.submitScore).toHaveBeenCalledOnce();
    expect(toy.submitScore).toHaveBeenCalledWith({ board: 3, score: 80 });
  });

  it("still requests the profile when ability discovery fails", async () => {
    const toy = {
      getAbilities: vi.fn().mockRejectedValue(new Error("unsupported")),
      getUserProfile: vi.fn().mockResolvedValue({ nickname: "Toy user" }),
    };
    vi.stubGlobal("window", { toy });
    const { initializeBilibiliToy, getBilibiliToySnapshot } =
      await import("./bilibili-toy");

    await initializeBilibiliToy();

    expect(toy.getUserProfile).toHaveBeenCalledOnce();
    expect(getBilibiliToySnapshot().profile?.nickname).toBe("Toy user");
  });

  it("keeps waiting for a profile that resolves after authorization", async () => {
    vi.useFakeTimers();
    let resolveProfile: ((profile: { nickname: string }) => void) | undefined;
    const profilePromise = new Promise<{ nickname: string }>((resolve) => {
      resolveProfile = resolve;
    });
    const toy = {
      getAbilities: vi.fn().mockResolvedValue({ abilities: [] }),
      getUserProfile: vi.fn().mockReturnValue(profilePromise),
    };
    vi.stubGlobal("window", { toy });
    const { initializeBilibiliToy, getBilibiliToySnapshot } =
      await import("./bilibili-toy");

    const initialization = initializeBilibiliToy();
    await vi.advanceTimersByTimeAsync(5000);
    expect(getBilibiliToySnapshot().profileStatus).toBe("waiting");

    resolveProfile?.({ nickname: "Authorized user" });
    await initialization;
    expect(getBilibiliToySnapshot().profileStatus).toBe("ready");
    expect(getBilibiliToySnapshot().profile?.nickname).toBe("Authorized user");
  });

  it("reads Bilibili cloud scores and normalizes Toy rankings", async () => {
    const toy = {
      getUserProfile: vi.fn().mockResolvedValue({ nickname: "B user" }),
      getCloudStorage: vi.fn().mockResolvedValue({
        puzzleSekaiHighScore_endless: 321,
        puzzleSekaiHighScore_timeAttack: "654",
        puzzleSekaiHighScore_daily: 987,
      }),
      getRankList: vi.fn().mockResolvedValue({
        list: [
          { rank: 1, score: 987, nickname: "B user" },
          { rank: 2, score: 900, user_info: { name: "Other" } },
        ],
        total: 2,
      }),
      getMyRank: vi
        .fn()
        .mockResolvedValue({ ranked: true, rank: 1, score: 987 }),
    };
    vi.stubGlobal("window", { toy });
    const {
      initializeBilibiliToy,
      getBilibiliToySnapshot,
      fetchBilibiliToyLeaderboard,
    } = await import("./bilibili-toy");

    await initializeBilibiliToy();
    expect(getBilibiliToySnapshot().cloudScores).toEqual({
      endless: 321,
      timeAttack: 654,
      daily: 987,
    });
    await expect(fetchBilibiliToyLeaderboard("daily")).resolves.toMatchObject({
      total: 2,
      me: { rank: 1, score: 987, display_name: null },
      entries: [
        { rank: 1, score: 987, display_name: "B user" },
        { rank: 2, score: 900, display_name: "Other" },
      ],
    });
    expect(toy.getRankList).toHaveBeenCalledWith({
      board: 3,
      period: "day",
      limit: 50,
    });
    expect(toy.getMyRank).toHaveBeenCalledWith({ board: 3, period: "day" });
  });
});
