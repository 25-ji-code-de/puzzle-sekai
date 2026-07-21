import { describe, expect, it } from "vitest";
import {
  TIME_CRITICAL_SEC,
  formatTimerClock,
  scoreAnnounceKind,
  shouldAnnounceTimeLow,
  shouldSpeakScore,
} from "./announce-format";

describe("formatTimerClock", () => {
  it("formats mm:ss", () => {
    expect(formatTimerClock(0)).toBe("0:00");
    expect(formatTimerClock(9)).toBe("0:09");
    expect(formatTimerClock(65)).toBe("1:05");
    expect(formatTimerClock(600)).toBe("10:00");
  });
  it("floors fractional and clamps negative", () => {
    expect(formatTimerClock(9.9)).toBe("0:09");
    expect(formatTimerClock(-3)).toBe("0:00");
  });
});

describe("shouldAnnounceTimeLow", () => {
  it("ignores above critical band", () => {
    expect(shouldAnnounceTimeLow(11, -1)).toBe(false);
    expect(shouldAnnounceTimeLow(TIME_CRITICAL_SEC + 1, 0)).toBe(false);
  });
  it("fires at critical and below when second changes", () => {
    expect(shouldAnnounceTimeLow(10, -1)).toBe(true);
    expect(shouldAnnounceTimeLow(10, 10)).toBe(false);
    expect(shouldAnnounceTimeLow(9, 10)).toBe(true);
  });
});

describe("score announce helpers", () => {
  it("picks combo line only when combo > 1", () => {
    expect(scoreAnnounceKind(1)).toBe("score");
    expect(scoreAnnounceKind(0)).toBe("score");
    expect(scoreAnnounceKind(2)).toBe("scoreCombo");
  });
  it("speaks only when score or combo changes", () => {
    expect(shouldSpeakScore(100, 1, 100, 1)).toBe(false);
    expect(shouldSpeakScore(101, 1, 100, 1)).toBe(true);
    expect(shouldSpeakScore(100, 2, 100, 1)).toBe(true);
  });
});
