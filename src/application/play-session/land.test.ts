/**
 * Post-land orchestration tests.
 *
 * Keep this suite narrow and mocked: it locks down match-gate bailouts,
 * top-out checks, scoring/combo behavior, and continuous-mode argument shaping
 * without pulling in real board / PIXI / Rapier state.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type * as PIXI from "pixi.js-legacy";
import type { CharacterData } from "../../characters/data";
import { BOARD_ORIGIN_Y, BOX_SIZE } from "../../config";

const mocks = vi.hoisted(() => ({
  commitLandedSprite: vi.fn(),
  settleBoard: vi.fn(async () => ({ cleared: false })),
  resetCombo: vi.fn(),
  runItemLandEffects: vi.fn(async () => ({ changed: false, scored: false })),
  runCharacterLandEffects: vi.fn(async () => ({
    changed: false,
    scored: false,
  })),
  isMatchOpen: vi.fn(() => true),
  isContinuousPhysics: vi.fn(() => false),
  projectToColumn: vi.fn((x: number) => Math.trunc(x / 100)),
  anyBodyAboveTopOut: vi.fn(() => false),
  pieceKindFrom: vi.fn(() => "cell2"),
  rotationToOrientation: vi.fn(() => 1),
  primaryFromSprite: vi.fn(() => ({ x: 2, y: 1 })),
}));

vi.mock("../../board", () => ({
  commitLandedSprite: mocks.commitLandedSprite,
  settleBoard: mocks.settleBoard,
}));

vi.mock("../../score", () => ({
  resetCombo: mocks.resetCombo,
}));

vi.mock("../fun-effects", () => ({
  runItemLandEffects: mocks.runItemLandEffects,
  runCharacterLandEffects: mocks.runCharacterLandEffects,
}));

vi.mock("./match-gate", () => ({
  isMatchOpen: mocks.isMatchOpen,
}));

vi.mock("../../board/dynamics", () => ({
  anyBodyAboveTopOut: mocks.anyBodyAboveTopOut,
  isContinuousPhysics: mocks.isContinuousPhysics,
  projectToColumn: mocks.projectToColumn,
}));

vi.mock("../../domain/types", () => ({
  pieceKindFrom: mocks.pieceKindFrom,
  rotationToOrientation: mocks.rotationToOrientation,
}));

vi.mock("../../presentation/placement", () => ({
  primaryFromSprite: mocks.primaryFromSprite,
}));

import { handleCharacterLand, handleItemLand } from "./land";

const makeSprite = (
  overrides: Partial<
    Pick<PIXI.Sprite, "x" | "y" | "rotation" | "transform">
  > = {},
): PIXI.Sprite =>
  ({
    x: 0,
    y: 0,
    rotation: 0,
    transform: {},
    ...overrides,
  }) as PIXI.Sprite;

const character: CharacterData = {
  name: "Ichika",
  file: "ichika.png",
  group: "Leo/need",
};

beforeEach(() => {
  mocks.commitLandedSprite.mockReset();
  mocks.settleBoard.mockReset().mockResolvedValue({ cleared: false });
  mocks.resetCombo.mockReset();
  mocks.runItemLandEffects.mockReset().mockResolvedValue({
    changed: false,
    scored: false,
  });
  mocks.runCharacterLandEffects.mockReset().mockResolvedValue({
    changed: false,
    scored: false,
  });
  mocks.isMatchOpen.mockReset().mockReturnValue(true);
  mocks.isContinuousPhysics.mockReset().mockReturnValue(false);
  mocks.projectToColumn
    .mockReset()
    .mockImplementation((x: number) => Math.trunc(x / 100));
  mocks.anyBodyAboveTopOut.mockReset().mockReturnValue(false);
  mocks.pieceKindFrom.mockReset().mockReturnValue("cell2");
  mocks.rotationToOrientation.mockReset().mockReturnValue(1);
  mocks.primaryFromSprite.mockReset().mockReturnValue({ x: 2, y: 1 });
});

describe("handleItemLand", () => {
  it("returns immediately when the match is already closed", async () => {
    mocks.isMatchOpen.mockReturnValue(false);

    const result = await handleItemLand(makeSprite(), 3, "item.png", 1, 2);

    expect(result).toEqual({ scored: false, topOut: false });
    expect(mocks.commitLandedSprite).not.toHaveBeenCalled();
    expect(mocks.runItemLandEffects).not.toHaveBeenCalled();
    expect(mocks.settleBoard).not.toHaveBeenCalled();
    expect(mocks.resetCombo).not.toHaveBeenCalled();
  });

  it("tops out grid items before commit when y is above the board", async () => {
    const result = await handleItemLand(makeSprite(), 2, "item.png", 4, -1);

    expect(result).toEqual({ scored: false, topOut: true });
    expect(mocks.commitLandedSprite).not.toHaveBeenCalled();
    expect(mocks.runItemLandEffects).not.toHaveBeenCalled();
    expect(mocks.settleBoard).not.toHaveBeenCalled();
  });

  it("bails after commit when the match closes before land effects", async () => {
    mocks.isMatchOpen.mockReturnValueOnce(true).mockReturnValueOnce(false);

    const sprite = makeSprite();
    const result = await handleItemLand(sprite, 7, "item.png", 1, 2);

    expect(result).toEqual({ scored: false, topOut: false });
    expect(mocks.commitLandedSprite).toHaveBeenCalledWith(
      sprite,
      7,
      undefined,
      true,
    );
    expect(mocks.runItemLandEffects).not.toHaveBeenCalled();
    expect(mocks.settleBoard).not.toHaveBeenCalled();
  });

  it("bails after land effects when the match closes before settle", async () => {
    mocks.isMatchOpen
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false);

    const result = await handleItemLand(makeSprite(), 1, "item.png", 5, 6);

    expect(result).toEqual({ scored: false, topOut: false });
    expect(mocks.runItemLandEffects).toHaveBeenCalledWith({
      itemFile: "item.png",
      x: 5,
      y: 6,
    });
    expect(mocks.settleBoard).not.toHaveBeenCalled();
  });

  it("resets combo when neither land effects nor settle score", async () => {
    const result = await handleItemLand(makeSprite(), 4, "item.png", 2, 3);

    expect(result).toEqual({ scored: false, topOut: false });
    expect(mocks.resetCombo).toHaveBeenCalledTimes(1);
  });

  it("keeps combo when settle clears after a grid item lands", async () => {
    mocks.settleBoard.mockResolvedValue({ cleared: true });

    const result = await handleItemLand(makeSprite(), 4, "item.png", 2, 3);

    expect(result).toEqual({ scored: true, topOut: false });
    expect(mocks.resetCombo).not.toHaveBeenCalled();
  });

  it("uses projected columns for continuous item land effects", async () => {
    mocks.isContinuousPhysics.mockReturnValue(true);
    mocks.projectToColumn.mockReturnValue(4);
    mocks.runItemLandEffects.mockResolvedValue({ changed: true, scored: true });

    const sprite = makeSprite({ x: 455, y: BOARD_ORIGIN_Y });
    const result = await handleItemLand(sprite, 2, "item.png", 99, 88);

    expect(result).toEqual({ scored: true, topOut: false });
    expect(mocks.projectToColumn).toHaveBeenCalledWith(455);
    expect(mocks.runItemLandEffects).toHaveBeenCalledWith({
      itemFile: "item.png",
      x: 4,
      y: 0,
    });
    expect(mocks.resetCombo).not.toHaveBeenCalled();
  });

  it("returns top-out after continuous settle when a body remains above the top line", async () => {
    mocks.isContinuousPhysics.mockReturnValue(true);
    mocks.anyBodyAboveTopOut.mockReturnValue(true);

    const sprite = makeSprite({ y: BOARD_ORIGIN_Y });
    const result = await handleItemLand(sprite, 2, "item.png", 1, 2);

    expect(result).toEqual({ scored: false, topOut: true });
    expect(mocks.settleBoard).toHaveBeenCalledTimes(1);
    expect(mocks.resetCombo).not.toHaveBeenCalled();
  });
});

describe("handleCharacterLand", () => {
  it("tops out grid characters at row 0 when upright", async () => {
    mocks.primaryFromSprite.mockReturnValue({ x: 3, y: 0 });
    mocks.rotationToOrientation.mockReturnValue(0);

    const sprite = makeSprite({ rotation: 0 });
    const result = await handleCharacterLand(sprite, 5, character);

    expect(result).toEqual({ scored: false, topOut: true });
    expect(mocks.pieceKindFrom).toHaveBeenCalledWith({
      characterName: "Ichika",
    });
    expect(mocks.primaryFromSprite).toHaveBeenCalledWith(sprite, "cell2");
    expect(mocks.commitLandedSprite).not.toHaveBeenCalled();
  });

  it("uses the continuous pixel top-out rule for characters", async () => {
    mocks.isContinuousPhysics.mockReturnValue(true);

    const result = await handleCharacterLand(
      makeSprite({ y: BOARD_ORIGIN_Y - BOX_SIZE - 1 }),
      5,
      character,
    );

    expect(result).toEqual({ scored: false, topOut: true });
    expect(mocks.commitLandedSprite).not.toHaveBeenCalled();
    expect(mocks.runCharacterLandEffects).not.toHaveBeenCalled();
  });

  it("keeps combo when character settle clears score", async () => {
    mocks.settleBoard.mockResolvedValue({ cleared: true });

    const sprite = makeSprite();
    const result = await handleCharacterLand(sprite, 6, character);

    expect(result).toEqual({ scored: true, topOut: false });
    expect(mocks.commitLandedSprite).toHaveBeenCalledWith(sprite, 6, character);
    expect(mocks.runCharacterLandEffects).toHaveBeenCalledWith({
      spriteIndex: 6,
      name: "Ichika",
      sprite,
    });
    expect(mocks.resetCombo).not.toHaveBeenCalled();
  });
});
