import { describe, expect, it } from "vitest";
import { parseLevel } from "../levels/parse";
import { LevelSession } from "./LevelSession";
import { MirrorPlacement } from "./MirrorPlacement";

// Empty cells: (1,0), (0,1), (2,1) and (1,2). Row 0 fires into the goal
// once a "\" is placed at (1,0).
const BOARD = String.raw`
  # . #
  . # .
  # . G
`;

function newPlacement(): { session: LevelSession; placement: MirrorPlacement } {
  const session = new LevelSession(parseLevel(BOARD), 1, "mirrorBackslash");
  return { session, placement: new MirrorPlacement(session) };
}

describe("MirrorPlacement with a mouse", () => {
  it("previews empty cells under the mouse only", () => {
    const { placement } = newPlacement();
    expect(placement.preview).toBeNull();
    placement.hover({ x: 1, y: 0 }, "mouse");
    expect(placement.preview).toEqual({
      position: { x: 1, y: 0 },
      placeable: true,
    });
    placement.hover({ x: 0, y: 0 }, "mouse");
    expect(placement.preview).toBeNull();
    placement.hover({ x: 1, y: 0 }, "touch");
    expect(placement.preview).toBeNull();
    placement.hover({ x: 1, y: 0 }, "mouse");
    placement.hover(null, "mouse");
    expect(placement.preview).toBeNull();
  });

  it("places at once on a click", () => {
    const { session, placement } = newPlacement();
    placement.hover({ x: 1, y: 0 }, "mouse");
    expect(placement.tap({ x: 1, y: 0 }, "mouse")).toBe("placed");
    expect(session.placedMirror).toEqual({ x: 1, y: 0 });
    expect(placement.preview).toBeNull();
  });

  it("ignores clicks on cells that aren't empty, and during a shot", () => {
    const { session, placement } = newPlacement();
    expect(placement.tap({ x: 0, y: 0 }, "mouse")).toBe("ignored");
    session.fire(1);
    expect(placement.tap({ x: 1, y: 0 }, "mouse")).toBe("ignored");
    expect(session.mirrorInHand).toBe(true);
  });

  it("shows a hovered cell as not placeable during a shot", () => {
    const { session, placement } = newPlacement();
    session.fire(1);
    placement.hover({ x: 1, y: 0 }, "mouse");
    expect(placement.preview?.placeable).toBe(false);
  });
});

describe("MirrorPlacement on a touch screen", () => {
  it("previews on a first tap and places on a second tap on the same cell", () => {
    const { session, placement } = newPlacement();
    expect(placement.tap({ x: 1, y: 0 }, "touch")).toBe("previewed");
    expect(placement.preview?.position).toEqual({ x: 1, y: 0 });
    expect(placement.choosingByKeyboard).toBe(false);
    expect(session.mirrorInHand).toBe(true);

    expect(placement.tap({ x: 2, y: 1 }, "touch")).toBe("previewed");
    expect(placement.preview?.position).toEqual({ x: 2, y: 1 });
    expect(placement.tap({ x: 2, y: 1 }, "touch")).toBe("placed");
    expect(session.placedMirror).toEqual({ x: 2, y: 1 });
  });

  it("keeps the tapped cell shown while a mouse moves", () => {
    const { placement } = newPlacement();
    placement.tap({ x: 1, y: 0 }, "touch");
    placement.hover({ x: 2, y: 1 }, "mouse");
    expect(placement.preview?.position).toEqual({ x: 1, y: 0 });
  });
});

describe("MirrorPlacement with the keyboard", () => {
  it("starts on an empty cell in the selected row", () => {
    const { session, placement } = newPlacement();
    session.select(2);
    expect(placement.start()).toBe(true);
    expect(placement.choosingByKeyboard).toBe(true);
    expect(placement.preview?.position).toEqual({ x: 1, y: 2 });
  });

  it("starts on the first empty cell when the selected row has none", () => {
    const session = new LevelSession(parseLevel(". #\n# G"), 1, "mirrorSlash");
    session.select(1);
    const placement = new MirrorPlacement(session);
    placement.start();
    expect(placement.preview?.position).toEqual({ x: 0, y: 0 });
  });

  it("doesn't start without a mirror in hand, or during a shot", () => {
    const { session, placement } = newPlacement();
    session.fire(1);
    expect(placement.start()).toBe(false);
    session.finishShot();
    placement.tap({ x: 1, y: 0 }, "mouse");
    expect(placement.start()).toBe(false);
    expect(placement.choosingByKeyboard).toBe(false);
  });

  it("moves within the board and places", () => {
    const { session, placement } = newPlacement();
    session.select(0);
    placement.start();
    expect(placement.key("up")).toBe("moved");
    expect(placement.preview?.position).toEqual({ x: 1, y: 0 });
    placement.key("right");
    placement.key("right");
    expect(placement.preview).toEqual({
      position: { x: 2, y: 0 },
      placeable: false,
    });
    expect(placement.key("place")).toBe("ignored");
    expect(placement.choosingByKeyboard).toBe(true);
    placement.key("down");
    expect(placement.key("place")).toBe("placed");
    expect(session.placedMirror).toEqual({ x: 2, y: 1 });
    expect(placement.choosingByKeyboard).toBe(false);
  });

  it("cancels, hiding the cursor", () => {
    const { session, placement } = newPlacement();
    placement.start();
    expect(placement.key("cancel")).toBe("cancelled");
    expect(placement.choosingByKeyboard).toBe(false);
    expect(placement.preview).toBeNull();
    expect(session.mirrorInHand).toBe(true);
  });

  it("ignores keys when not choosing", () => {
    const { placement } = newPlacement();
    expect(placement.key("up")).toBe("ignored");
  });

  it("places on a tap at the keyboard cursor's cell", () => {
    const { session, placement } = newPlacement();
    session.select(0);
    placement.start();
    expect(placement.tap({ x: 1, y: 0 }, "touch")).toBe("placed");
  });
});

describe("MirrorPlacement.clear", () => {
  it("hides the preview and stops choosing", () => {
    const { placement } = newPlacement();
    placement.start();
    placement.clear();
    expect(placement.choosingByKeyboard).toBe(false);
    expect(placement.preview).toBeNull();
    placement.hover({ x: 1, y: 0 }, "mouse");
    placement.clear();
    expect(placement.preview).toBeNull();
  });

  it("shows nothing in a level without a player mirror", () => {
    const session = new LevelSession(parseLevel(BOARD));
    const placement = new MirrorPlacement(session);
    placement.hover({ x: 1, y: 0 }, "mouse");
    expect(placement.preview).toBeNull();
    expect(placement.start()).toBe(false);
  });
});
