/**
 * Unified pixel mapping: active land Y matches placeSprite primary Y.
 */
import { describe, it, expect } from "vitest";
import {
  activeLandPixelY,
  activeLandPrimaryRow,
  primaryToPixel,
  boardOriginY,
} from "./pixel";
import { BOX_SIZE, OFFSET_BOTTOM, ROWS, STAGE_HEIGHT } from "../../config";

describe("BOARD_ORIGIN pixel mapping", () => {
  it("boardOriginY places floor under last row with OFFSET_BOTTOM", () => {
    const oy = boardOriginY(STAGE_HEIGHT);
    const floorY = oy + ROWS * BOX_SIZE;
    expect(floorY).toBe(STAGE_HEIGHT - OFFSET_BOTTOM);
  });

  it("activeLandPixelY equals primaryToPixel for empty board stack 0", () => {
    for (const kind of ["cell2", "item", "big2x2"] as const) {
      const orient = 0;
      const stack = 0;
      const row = activeLandPrimaryRow(kind, stack, orient);
      const fromActive = activeLandPixelY(kind, stack, orient, STAGE_HEIGHT);
      const fromPrimary = primaryToPixel(kind, 3, row, STAGE_HEIGHT).y;
      expect(fromActive).toBe(fromPrimary);
    }
  });

  it("upright cell2 primary is one row higher", () => {
    const stack = 2;
    expect(activeLandPrimaryRow("cell2", stack, 2)).toBe(
      activeLandPrimaryRow("cell2", stack, 0) - 1,
    );
    const y0 = activeLandPixelY("cell2", stack, 0, STAGE_HEIGHT);
    const y2 = activeLandPixelY("cell2", stack, 2, STAGE_HEIGHT);
    expect(y0 - y2).toBe(BOX_SIZE);
  });
});
