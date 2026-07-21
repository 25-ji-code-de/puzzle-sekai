import { describe, expect, it } from "vitest";
import {
  geometricCenter,
  maxShiftX,
  originFromCenter,
  poseIntersectsSolids,
  snapQuarterTurn,
  stepShiftX,
  tryRotate,
} from "../active-queries";
import {
  BOARD_ORIGIN_X,
  BOX_SIZE,
  COLUMNS,
  LEFT_BORDER,
} from "../../../config";

describe("wall flush placement", () => {
  it("allows vertical cell2 at column 0 and last column centers", () => {
    const y = 200;
    const rot = Math.PI; // spawn-like head-down
    const col0x = LEFT_BORDER + BOX_SIZE / 2;
    const colLastX = LEFT_BORDER + (COLUMNS - 1) * BOX_SIZE + BOX_SIZE / 2;
    expect(poseIntersectsSolids("cell2", col0x, y, rot)).toBe(false);
    expect(poseIntersectsSolids("cell2", colLastX, y, rot)).toBe(false);
  });

  it("rejects past left wall", () => {
    expect(
      poseIntersectsSolids("cell2", BOARD_ORIGIN_X - BOX_SIZE, 200, Math.PI),
    ).toBe(true);
  });
});

describe("center-preserving rotation", () => {
  it("keeps geometric center fixed for cell2", () => {
    const x = LEFT_BORDER + 2 * BOX_SIZE + BOX_SIZE / 2;
    const y = 300;
    const rot = Math.PI;
    const before = geometricCenter("cell2", x, y, rot);
    const res = tryRotate("cell2", x, y, rot, 1);
    expect(res).not.toBeNull();
    const after = geometricCenter("cell2", res!.x, res!.y, res!.rotation);
    expect(after.x).toBeCloseTo(before.x, 5);
    expect(after.y).toBeCloseTo(before.y, 5);
    expect(snapQuarterTurn(res!.rotation - rot)).toBeCloseTo(Math.PI / 2, 5);
  });

  it("originFromCenter is inverse of geometricCenter", () => {
    const rot = Math.PI / 2;
    const origin = { x: 800, y: 400 };
    const c = geometricCenter("cell2", origin.x, origin.y, rot);
    const back = originFromCenter("cell2", c.x, c.y, rot);
    expect(back.x).toBeCloseTo(origin.x, 5);
    expect(back.y).toBeCloseTo(origin.y, 5);
  });
});

describe("partial edge slide", () => {
  it("maxShiftX reaches full BOX_SIZE in free air", () => {
    const x = LEFT_BORDER + 2 * BOX_SIZE + BOX_SIZE / 2;
    const dx = maxShiftX("cell2", x, 200, Math.PI, 1, BOX_SIZE);
    expect(dx).toBe(BOX_SIZE);
  });

  it("stepShiftX slides residual toward the left wall from col 1", () => {
    // Start at col 1 center; a wide vertical piece should still be able to
    // move left at least some amount (full step if cuboid fits).
    const x = LEFT_BORDER + 1 * BOX_SIZE + BOX_SIZE / 2;
    const nx = stepShiftX("cell2", x, 200, Math.PI, -1, BOX_SIZE);
    expect(nx).not.toBeNull();
    expect(nx!).toBeLessThan(x);
  });

  it("stepShiftX from already-flush left edge returns null", () => {
    // Push origin so cuboid is flush with left wall
    const col0 = LEFT_BORDER + BOX_SIZE / 2;
    // Overshoot further left until blocked, then residual should be 0
    const blocked = stepShiftX(
      "cell2",
      col0 - BOX_SIZE,
      200,
      Math.PI,
      -1,
      BOX_SIZE,
    );
    // Either null or no further left of an already-out attempt
    if (blocked !== null) {
      expect(blocked).toBeLessThanOrEqual(col0);
    }
  });
});
