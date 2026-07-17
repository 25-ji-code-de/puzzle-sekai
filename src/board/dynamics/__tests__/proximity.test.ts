import { describe, expect, it } from "vitest";
import {
  columnCenterX,
  projectToColumn,
  entitiesTouching,
  CONTACT_GAP,
} from "../proximity";
import { BOARD_ORIGIN_X, BOX_SIZE, COLUMNS } from "../../../config";

describe("projectToColumn", () => {
  it("maps left edge of col 0", () => {
    expect(projectToColumn(BOARD_ORIGIN_X + 1)).toBe(0);
  });
  it("clamps outside board", () => {
    expect(projectToColumn(BOARD_ORIGIN_X - 1000)).toBe(0);
    expect(projectToColumn(BOARD_ORIGIN_X + COLUMNS * BOX_SIZE + 500)).toBe(
      COLUMNS - 1,
    );
  });
  it("columnCenterX is consistent", () => {
    for (let c = 0; c < COLUMNS; c++) {
      expect(projectToColumn(columnCenterX(c))).toBe(c);
    }
  });
});

describe("entitiesTouching", () => {
  it("detects overlapping shrunk pieces", () => {
    expect(
      entitiesTouching(
        { kind: "shrunk", pose: { x: 100, y: 100, rotation: 0 } },
        { kind: "shrunk", pose: { x: 100 + BOX_SIZE, y: 100, rotation: 0 } },
        CONTACT_GAP,
      ),
    ).toBe(true);
  });
  it("rejects far pieces", () => {
    expect(
      entitiesTouching(
        { kind: "shrunk", pose: { x: 0, y: 0, rotation: 0 } },
        { kind: "shrunk", pose: { x: BOX_SIZE * 4, y: 0, rotation: 0 } },
        CONTACT_GAP,
      ),
    ).toBe(false);
  });
});
