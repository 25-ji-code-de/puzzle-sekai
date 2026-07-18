/**
 * Unit tests for SFX resolution + playback routing.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const play = vi.fn();
const stop = vi.fn();
const loaderSound = { play, stop, isPlaying: false, isLoaded: true };
const aliasSound = { play, stop, isPlaying: false, isLoaded: true };

const soundExists = vi.fn();
const soundFind = vi.fn();

vi.mock("../runtime", () => ({
  app: {
    loader: {
      resources: {
        move: { sound: loaderSound },
        land: { sound: loaderSound },
      } as Record<string, { sound?: typeof loaderSound }>,
    },
  },
}));

vi.mock("../characters/data", () => ({
  characterData: [{ name: "Ichika", sounds: { fall: ["voice/ichika_1"] } }],
  groupSounds: {},
}));

vi.mock("../settings", () => ({
  sfxVol: (base: number) => base * 0.5,
  voiceVol: (base: number) => base * 0.8,
  SFX_MOVE_BASE: 0.4,
  SFX_LAND_BASE: 0.5,
  SFX_EFFECT_BASE: 0.45,
}));

vi.mock("pixi-sound", () => ({
  default: {
    exists: (key: string) => soundExists(key),
    find: (key: string) => soundFind(key),
    add: vi.fn(),
  },
}));

describe("resolveSound / playLoadedSfx", () => {
  beforeEach(() => {
    play.mockClear();
    stop.mockClear();
    soundExists.mockReset();
    soundFind.mockReset();
    vi.resetModules();
  });

  it("prefers PIXI loader resources", async () => {
    const mod = await import("./sfx");
    expect(mod.resolveSound("move")).toBe(loaderSound);
    mod.playLoadedSfx("move", "sfx", 0.4);
    expect(play).toHaveBeenCalledWith({ volume: 0.2 });
  });

  it("falls back to pixi-sound aliases (character voices)", async () => {
    soundExists.mockReturnValue(true);
    soundFind.mockReturnValue(aliasSound);
    const mod = await import("./sfx");
    expect(mod.resolveSound("voice/ichika_1")).toBe(aliasSound);
    mod.playLoadedSfx("voice/ichika_1", "voice", 0.5);
    expect(play).toHaveBeenCalledWith({ volume: 0.4 });
  });

  it("no-ops when key is missing", async () => {
    soundExists.mockReturnValue(false);
    const mod = await import("./sfx");
    expect(mod.resolveSound("missing-key")).toBeNull();
    mod.playLoadedSfx("missing-key", "sfx", 1);
    expect(play).not.toHaveBeenCalled();
  });

  it("replayLoadedSfx stops before play when already playing", async () => {
    const busy = { play, stop, isPlaying: true, isLoaded: true };
    soundExists.mockReturnValue(true);
    soundFind.mockReturnValue(busy);
    const mod = await import("./sfx");
    mod.replayLoadedSfx("voice/x", "voice", 0.5);
    expect(stop).toHaveBeenCalled();
    expect(play).toHaveBeenCalled();
  });

  it("defers play until isLoaded (avoids buffer double-assign)", async () => {
    vi.useFakeTimers();
    const late = { play, stop, isPlaying: false, isLoaded: false };
    soundExists.mockReturnValue(true);
    soundFind.mockReturnValue(late);
    const mod = await import("./sfx");
    mod.playLoadedSfx("voice/late", "voice", 0.5);
    expect(play).not.toHaveBeenCalled();
    late.isLoaded = true;
    await vi.advanceTimersByTimeAsync(40);
    expect(play).toHaveBeenCalledWith({ volume: 0.4 });
    vi.useRealTimers();
  });
});
