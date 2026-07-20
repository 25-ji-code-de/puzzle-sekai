/**
 * Spawn gate + early abort tests (mocked active/board/land).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  isMatchOpen: vi.fn(() => true),
  isContinuousPhysics: vi.fn(() => false),
  highestBodyTop: vi.fn(() => 0),
  maxOccupiedHeight: vi.fn(() => 3),
  getCurrentSettings: vi.fn(() => ({ itemDropRate: 10 })),
  getItemDropChance: vi.fn(() => 0),
  chance: vi.fn(() => false),
  getGrid: vi.fn(() => []),
  nextCharacter: { name: "Ichika", file: "ichika.png", group: "Leo/need" },
  randomCharacter: vi.fn(),
  fly: vi.fn(),
  createPiece: vi.fn(),
  showNextPiece: vi.fn(async () => ({})),
  createItem: vi.fn(),
  getRandomItem: vi.fn(() => "item.png"),
  handleItemLand: vi.fn(),
  handleCharacterLand: vi.fn(),
  primaryFromSprite: vi.fn(() => ({ x: 0, y: 0 })),
  playLoadedSfx: vi.fn(),
  takeRandom: vi.fn(),
  sprites: [] as unknown[],
}));

vi.mock("./match-gate", () => ({
  isMatchOpen: mocks.isMatchOpen,
}));

vi.mock("../../board/dynamics", () => ({
  isContinuousPhysics: mocks.isContinuousPhysics,
  highestBodyTop: mocks.highestBodyTop,
}));

vi.mock("../../domain/piece", () => ({
  maxOccupiedHeight: mocks.maxOccupiedHeight,
}));

vi.mock("../../settings", () => ({
  getCurrentSettings: mocks.getCurrentSettings,
  getItemDropChance: mocks.getItemDropChance,
}));

vi.mock("../../domain/prng", () => ({
  chance: mocks.chance,
  takeRandom: mocks.takeRandom,
}));

vi.mock("../../game/board-state", () => ({
  getGrid: mocks.getGrid,
  sprites: mocks.sprites,
}));

vi.mock("../../active", () => ({
  get nextCharacter() {
    return mocks.nextCharacter;
  },
  randomCharacter: mocks.randomCharacter,
  fly: mocks.fly,
  createPiece: mocks.createPiece,
  showNextPiece: mocks.showNextPiece,
}));

vi.mock("../../items", () => ({
  createItem: mocks.createItem,
  getRandomItem: mocks.getRandomItem,
}));

vi.mock("./land", () => ({
  handleItemLand: mocks.handleItemLand,
  handleCharacterLand: mocks.handleCharacterLand,
}));

vi.mock("../../presentation/placement", () => ({
  primaryFromSprite: mocks.primaryFromSprite,
}));

vi.mock("../../audio/sfx", () => ({
  playLoadedSfx: mocks.playLoadedSfx,
}));

vi.mock("../../runtime", () => ({
  app: { stage: { addChild: vi.fn() } },
}));

import { spawnNext, type SpawnDeps } from "./spawn";

const makeDeps = (overrides: Partial<SpawnDeps> = {}): SpawnDeps => {
  return {
    getSpriteIndexBase: () => 0,
    avatarStab: { gotoAndPlay: vi.fn() } as unknown as SpawnDeps["avatarStab"],
    getNextPiece: () => undefined,
    setNextPiece: vi.fn(),
    onTopOut: vi.fn(),
    onSpawnComplete: vi.fn(),
    onFalling: vi.fn(),
    onSpawnAborted: vi.fn(),
    ...overrides,
  };
};

beforeEach(() => {
  mocks.isMatchOpen.mockReset().mockReturnValue(true);
  mocks.isContinuousPhysics.mockReset().mockReturnValue(false);
  mocks.maxOccupiedHeight.mockReset().mockReturnValue(3);
  mocks.getItemDropChance.mockReset().mockReturnValue(0);
  mocks.chance.mockReset().mockReturnValue(false);
  mocks.createPiece.mockReset();
  mocks.fly.mockReset();
  mocks.showNextPiece.mockReset().mockResolvedValue({});
});

describe("spawnNext", () => {
  it("aborts immediately when the match is closed", async () => {
    mocks.isMatchOpen.mockReturnValue(false);
    const onSpawnAborted = vi.fn();
    const onSpawnComplete = vi.fn();
    const deps = makeDeps({ onSpawnAborted, onSpawnComplete });
    await spawnNext(deps);
    expect(onSpawnAborted).toHaveBeenCalledTimes(1);
    expect(mocks.createPiece).not.toHaveBeenCalled();
    expect(onSpawnComplete).not.toHaveBeenCalled();
  });

  it("uses continuous height estimate when truePhysics is on", async () => {
    mocks.isContinuousPhysics.mockReturnValue(true);
    mocks.highestBodyTop.mockReturnValue(900);
    // Force item path off so we exercise character path briefly then gate out mid-way
    mocks.chance.mockReturnValue(false);
    mocks.isMatchOpen
      .mockReturnValueOnce(true) // entry
      .mockReturnValue(false); // later checks
    const deps = makeDeps();
    await spawnNext(deps);
    expect(mocks.highestBodyTop).toHaveBeenCalled();
    expect(mocks.maxOccupiedHeight).not.toHaveBeenCalled();
  });
});
