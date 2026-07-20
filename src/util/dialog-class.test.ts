import { describe, expect, it } from "vitest";
import {
  dialogButtonClassName,
  dialogCardClassName,
  dialogOverlayClassName,
  settingOptClassName,
} from "./dialog-class";

describe("dialogOverlayClassName", () => {
  it("dims only at alpha ≥ 0.75", () => {
    expect(dialogOverlayClassName(undefined)).toBe("ui-overlay");
    expect(dialogOverlayClassName(0.5)).toBe("ui-overlay");
    expect(dialogOverlayClassName(0.75)).toBe("ui-overlay ui-overlay--dim");
    expect(dialogOverlayClassName(1)).toBe("ui-overlay ui-overlay--dim");
  });
});

describe("dialogCardClassName / button / setting opt", () => {
  it("card wide flag", () => {
    expect(dialogCardClassName(false)).toBe("ui-dialog");
    expect(dialogCardClassName(true)).toBe("ui-dialog ui-dialog--wide");
  });
  it("button variants", () => {
    expect(dialogButtonClassName("primary")).toBe("ui-btn ui-btn--primary");
    expect(dialogButtonClassName("danger")).toBe("ui-btn ui-btn--danger");
  });
  it("setting opt active + extra", () => {
    expect(settingOptClassName(false)).toBe("setting-opt");
    expect(settingOptClassName(true, "extra")).toBe("setting-opt extra active");
  });
});
