/**
 * Fun registry gating: modes off → hooks skipped; modes on → plugins run.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const isFunModeOn = vi.fn();
const onItemLand = vi.fn(async () => ({ changed: true, scored: true }));
const onCharacterLand = vi.fn(async () => ({ changed: true, scored: true }));
const onSettled = vi.fn(async () => ({ changed: false }));
const onCleared = vi.fn(async () => ({ changed: true }));
const mizukiItemLand = vi.fn(async () => ({ changed: true }));

vi.mock("../../fun/effects", () => ({
  isFunModeOn: (id: string) => isFunModeOn(id),
}));

vi.mock("./plugins/allergy", () => ({
  allergyEffect: {
    id: "itemAllergy",
    onItemLand,
    onCharacterLand,
    onSettled,
  },
}));

vi.mock("./plugins/mizuki", () => ({
  mizukiEffect: {
    id: "mizukiShift",
    onItemLand: mizukiItemLand,
    onSettled: vi.fn(async () => ({ changed: false })),
  },
}));

vi.mock("./plugins/emu-shrink", () => ({
  emuShrinkEffect: {
    id: "emuShrink",
    onSettled: vi.fn(async () => ({ changed: false })),
  },
}));

vi.mock("./plugins/wonder-blast", () => ({
  wonderBlastEffect: {
    id: "wonderBlast",
    onCleared,
  },
}));

describe("fun-effects registry gating", () => {
  beforeEach(() => {
    isFunModeOn.mockReset();
    onItemLand.mockClear();
    onCharacterLand.mockClear();
    onSettled.mockClear();
    onCleared.mockClear();
    mizukiItemLand.mockClear();
    vi.resetModules();
  });

  it("skips item-land plugins when mode is off", async () => {
    isFunModeOn.mockReturnValue(false);
    const { runItemLandEffects } = await import("./registry");
    const r = await runItemLandEffects({
      itemFile: "/assets/carrot.png",
      x: 1,
      y: 2,
    });
    expect(r.changed).toBe(false);
    expect(onItemLand).not.toHaveBeenCalled();
    expect(mizukiItemLand).not.toHaveBeenCalled();
  });

  it("runs item-land when itemAllergy is on", async () => {
    isFunModeOn.mockImplementation((id: string) => id === "itemAllergy");
    const { runItemLandEffects } = await import("./registry");
    const r = await runItemLandEffects({
      itemFile: "/assets/carrot.png",
      x: 1,
      y: 2,
    });
    expect(onItemLand).toHaveBeenCalled();
    expect(r.scored).toBe(true);
    expect(r.changed).toBe(true);
  });

  it("runs character-land only for enabled allergy mode", async () => {
    isFunModeOn.mockImplementation((id: string) => id === "itemAllergy");
    const { runCharacterLandEffects } = await import("./registry");
    await runCharacterLandEffects({
      spriteIndex: 0,
      name: "Ena" as never,
    });
    expect(onCharacterLand).toHaveBeenCalled();
  });

  it("runs wonder blast onCleared only when mode on", async () => {
    isFunModeOn.mockImplementation((id: string) => id === "wonderBlast");
    const { runClearedEffects } = await import("./registry");
    const r = await runClearedEffects([]);
    expect(onCleared).toHaveBeenCalled();
    expect(r.changed).toBe(true);
  });
});
