/**
 * Unified pixel mapping: active land Y matches placeSprite primary Y.
 */
import { describe, it, expect } from "vitest";
import {
  activeDropPixelY,
  activeLandPixelY,
  activeLandPrimaryRow,
  boardOriginY,
  cellCenterX,
  cellCenterY,
  cellTopLeftX,
  cellTopLeftY,
  primaryToPixel,
} from "./pixel";
import {
  BOX_SIZE,
  LEFT_BORDER,
  OFFSET_BOTTOM,
  ROWS,
  STAGE_HEIGHT,
} from "../../config";

describe("BOARD_ORIGIN pixel mapping", () => {
  it("boardOriginY places floor under last row with OFFSET_BOTTOM", () => {
    const oy = boardOriginY(STAGE_HEIGHT);
    const floorY = oy + ROWS * BOX_SIZE;
    expect(floorY).toBe(STAGE_HEIGHT - OFFSET_BOTTOM);
  });

  it("cell center / top-left follow BOX_SIZE steps from LEFT_BORDER", () => {
    expect(cellTopLeftX(0)).toBe(LEFT_BORDER);
    expect(cellTopLeftX(2)).toBe(LEFT_BORDER + 2 * BOX_SIZE);
    expect(cellCenterX(0)).toBe(LEFT_BORDER + BOX_SIZE / 2);
    expect(cellTopLeftY(0, STAGE_HEIGHT)).toBe(boardOriginY(STAGE_HEIGHT));
    expect(cellCenterY(1, STAGE_HEIGHT)).toBe(
      boardOriginY(STAGE_HEIGHT) + BOX_SIZE + BOX_SIZE / 2,
    );
  });

  it("primaryToPixel: cell2 uses center; big2x2 uses top-left of primary", () => {
    expect(primaryToPixel("cell2", 1, 2, STAGE_HEIGHT)).toEqual({
      x: cellCenterX(1),
      y: cellCenterY(2, STAGE_HEIGHT),
    });
    expect(primaryToPixel("big2x2", 3, 4, STAGE_HEIGHT)).toEqual({
      x: cellTopLeftX(3),
      y: cellTopLeftY(4, STAGE_HEIGHT),
    });
  });

  it("activeLandPixelY equals primaryToPixel for empty board stack 0", () => {
    for (const kind of ["cell2", "item", "big2x2"] as const) {
      const orient = 0;
      const stack = 0;
      const row = activeLandPrimaryRow(kind, stack, orient);
      const fromActive = activeLandPixelY(kind, stack, orient, STAGE_HEIGHT);
      const fromPrimary = primaryToPixel(kind, 3, row, STAGE_HEIGHT).y;
      expect(fromActive).toBe(fromPrimary);
      expect(activeDropPixelY(kind, stack, orient, STAGE_HEIGHT)).toBe(
        fromActive,
      );
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
