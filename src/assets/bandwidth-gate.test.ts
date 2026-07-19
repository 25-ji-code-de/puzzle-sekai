/**
 * Visual-critical bandwidth gate pure tests.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  enterVisualCritical,
  isVisualCritical,
  leaveVisualCritical,
  whenAudioAllowed,
} from "./bandwidth-gate";

beforeEach(() => {
  leaveVisualCritical();
  vi.useFakeTimers();
});

afterEach(() => {
  leaveVisualCritical();
  vi.useRealTimers();
});

describe("visual critical window", () => {
  it("starts non-critical; enter/leave toggles", () => {
    expect(isVisualCritical()).toBe(false);
    enterVisualCritical(1000);
    expect(isVisualCritical()).toBe(true);
    leaveVisualCritical();
    expect(isVisualCritical()).toBe(false);
  });

  it("auto-leaves after deadline", () => {
    enterVisualCritical(500);
    expect(isVisualCritical()).toBe(true);
    vi.advanceTimersByTime(499);
    expect(isVisualCritical()).toBe(true);
    vi.advanceTimersByTime(1);
    expect(isVisualCritical()).toBe(false);
  });

  it("whenAudioAllowed resolves immediately when free", async () => {
    await expect(whenAudioAllowed()).resolves.toBeUndefined();
  });

  it("whenAudioAllowed waits until leave", async () => {
    enterVisualCritical(10_000);
    let done = false;
    const p = whenAudioAllowed().then(() => {
      done = true;
    });
    expect(done).toBe(false);
    leaveVisualCritical();
    await p;
    expect(done).toBe(true);
  });

  it("whenAudioAllowed also unblocks on deadline", async () => {
    enterVisualCritical(200);
    const p = whenAudioAllowed();
    vi.advanceTimersByTime(200);
    await p;
    expect(isVisualCritical()).toBe(false);
  });
});
