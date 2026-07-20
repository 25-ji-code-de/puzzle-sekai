/**
 * Pure-ish placement helpers (mock PIXI sprites — no renderer).
 */
import { describe, expect, it } from "vitest";
import type * as PIXI from "pixi.js-legacy";
import { BOX_SIZE, LEFT_BORDER, STAGE_HEIGHT, BOARD_ORIGIN_Y } from "../config";
import {
  anchorPixelX,
  anchorPixelY,
  placeSpriteAtAnchor,
  primaryFromSprite,
} from "./placement";

const mockSprite = (x = 0, y = 0, alive = true): PIXI.Sprite =>
  ({
    x,
    y,
    transform: alive ? {} : null,
  }) as unknown as PIXI.Sprite;

describe("anchorPixelX / anchorPixelY", () => {
  it("maps cell2 center of (0,0) onto playfield origin band", () => {
    const x = anchorPixelX("cell2", 0);
    const y = anchorPixelY("cell2", 0);
    expect(x).toBe(LEFT_BORDER + BOX_SIZE / 2);
    expect(y).toBe(BOARD_ORIGIN_Y + BOX_SIZE / 2);
  });

  it("maps big2x2 to top-left of bottom-right primary cell", () => {
    // primary (1,1) → top-left of that cell
    expect(anchorPixelX("big2x2", 1)).toBe(LEFT_BORDER + BOX_SIZE);
    expect(anchorPixelY("big2x2", 1)).toBe(BOARD_ORIGIN_Y + BOX_SIZE);
  });
});

describe("placeSpriteAtAnchor / primaryFromSprite", () => {
  it("round-trips cell2 primary with ceil", () => {
    const sp = mockSprite();
    placeSpriteAtAnchor(sp, "cell2", 3, 4);
    const p = primaryFromSprite(sp, "cell2", "ceil");
    expect(p).toEqual({ x: 3, y: 4 });
  });

  it("round-trips big2x2 primary with ceil", () => {
    const sp = mockSprite();
    placeSpriteAtAnchor(sp, "big2x2", 2, 5);
    const p = primaryFromSprite(sp, "big2x2", "ceil");
    expect(p).toEqual({ x: 2, y: 5 });
  });

  it("returns origin for destroyed sprite (null transform)", () => {
    const sp = mockSprite(999, 999, false);
    expect(primaryFromSprite(sp, "cell2")).toEqual({ x: 0, y: 0 });
  });

  it("uses default stage height consistently", () => {
    const sp = mockSprite();
    placeSpriteAtAnchor(sp, "item", 0, 0, STAGE_HEIGHT);
    expect(sp.y).toBe(anchorPixelY("item", 0, STAGE_HEIGHT));
  });
});
