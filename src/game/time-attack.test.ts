import { describe, expect, it } from "vitest";
import {
  displaySecondsFromMs,
  emptyTimeAttackSnapshot,
  isTimeAttackExpired,
  pauseTimeAttackClock,
  remainingMsAt,
  resumeTimeAttackClock,
  startTimeAttackClock,
  stopTimeAttackClock,
} from "./time-attack";

describe("displaySecondsFromMs", () => {
  it("ceils partial seconds so the last second still shows 1", () => {
    expect(displaySecondsFromMs(1)).toBe(1);
    expect(displaySecondsFromMs(1000)).toBe(1);
    expect(displaySecondsFromMs(1001)).toBe(2);
    expect(displaySecondsFromMs(0)).toBe(0);
    expect(displaySecondsFromMs(-50)).toBe(0);
  });
});

describe("time-attack clock transitions", () => {
  const t0 = 10_000;

  it("starts a deadline from duration", () => {
    const snap = startTimeAttackClock(60, t0);
    expect(snap.endsAt).toBe(t0 + 60_000);
    expect(snap.pausedRemainingMs).toBe(0);
    expect(remainingMsAt(snap.endsAt, t0)).toBe(60_000);
  });

  it("freezes remaining on pause and restores on resume", () => {
    let snap = startTimeAttackClock(30, t0);
    // 5s elapsed
    snap = pauseTimeAttackClock(snap, t0 + 5_000);
    expect(snap.endsAt).toBe(0);
    expect(snap.pausedRemainingMs).toBe(25_000);
    expect(displaySecondsFromMs(snap.pausedRemainingMs)).toBe(25);

    // resume 10s later wall-clock — remaining still 25s
    snap = resumeTimeAttackClock(snap, t0 + 15_000);
    expect(snap.pausedRemainingMs).toBe(0);
    expect(snap.endsAt).toBe(t0 + 15_000 + 25_000);
    expect(remainingMsAt(snap.endsAt, t0 + 15_000)).toBe(25_000);
  });

  it("pause is a no-op when not running", () => {
    const empty = emptyTimeAttackSnapshot();
    expect(pauseTimeAttackClock(empty, t0)).toEqual(empty);
  });

  it("resume is a no-op when already running or empty remaining", () => {
    const running = startTimeAttackClock(10, t0);
    expect(resumeTimeAttackClock(running, t0 + 1)).toEqual(running);
    const zeroPaused = { endsAt: 0, pausedRemainingMs: 0 };
    expect(resumeTimeAttackClock(zeroPaused, t0)).toEqual(zeroPaused);
  });

  it("stop clears both fields", () => {
    const snap = stopTimeAttackClock();
    expect(snap).toEqual({ endsAt: 0, pausedRemainingMs: 0 });
  });

  it("detects expiry only while running", () => {
    const snap = startTimeAttackClock(1, t0);
    expect(isTimeAttackExpired(snap, t0 + 999)).toBe(false);
    expect(isTimeAttackExpired(snap, t0 + 1000)).toBe(true);
    const paused = pauseTimeAttackClock(snap, t0 + 500);
    expect(isTimeAttackExpired(paused, t0 + 9999)).toBe(false);
  });
});
