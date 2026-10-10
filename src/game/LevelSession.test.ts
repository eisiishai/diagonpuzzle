import { describe, expect, it } from "vitest";
import { parseLevel } from "../levels/parse";
import { LevelSession } from "./LevelSession";

// Row 0 misses but flips its mirror; row 0 then wins (see solver tests).
// Row 1 always exits.
const BOARD = String.raw`
  / .
  \ G
`;

function newSession(): LevelSession {
  return new LevelSession(parseLevel(BOARD));
}

describe("LevelSession", () => {
  it("starts aiming at the middle row with no shots", () => {
    const session = newSession();
    expect(session.phase).toBe("aiming");
    expect(session.shots).toBe(0);
    expect(session.selectedRow).toBe(1);
    expect(session.board).toBe(session.startBoard);
    expect(session.canFire).toBe(true);
  });

  it("clamps the selection to the board", () => {
    const session = newSession();
    session.moveSelection(-5);
    expect(session.selectedRow).toBe(0);
    session.select(9);
    expect(session.selectedRow).toBe(1);
  });

  it("updates board and shots when firing, and waits for the shot to finish", () => {
    const session = newSession();
    const result = session.fire(0);
    expect(result?.outcome).toBe("exit");
    expect(session.selectedRow).toBe(0);
    expect(session.shots).toBe(1);
    expect(session.board).toBe(result?.board);
    expect(session.board.cells[0][0]).toBe("mirrorBackslash");
    expect(session.phase).toBe("firing");

    expect(session.fire(1)).toBeNull();
    expect(session.shots).toBe(1);

    expect(session.finishShot()).toBe("exit");
    expect(session.phase).toBe("aiming");
  });

  it("fires from the selected row by default", () => {
    const session = newSession();
    session.select(0);
    expect(session.fire()?.path[0]).toMatchObject({ x: 0, y: 0 });
  });

  it("completes the level when a shot reaches the goal", () => {
    const session = newSession();
    session.fire(0);
    session.finishShot();
    session.fire(0);
    expect(session.finishShot()).toBe("goal");
    expect(session.phase).toBe("complete");
    expect(session.shots).toBe(2);
    expect(session.canFire).toBe(false);
    expect(session.fire(0)).toBeNull();

    session.select(1);
    expect(session.selectedRow).toBe(0);
  });

  it("needs as many goal hits as the level asks for, keeping the board", () => {
    const session = new LevelSession(parseLevel(". G"), 2);
    session.fire(0);
    expect(session.finishShot()).toBe("goal");
    expect(session.hits).toBe(1);
    expect(session.phase).toBe("aiming");
    expect(session.canFire).toBe(true);

    session.fire(0);
    session.finishShot();
    expect(session.hits).toBe(2);
    expect(session.phase).toBe("complete");

    session.restart();
    expect(session.hits).toBe(0);
  });

  it("keeps mirror flips from a goal hit for the next shot", () => {
    // Row 0 is turned down into the goal by "\", which flips on the way.
    const session = new LevelSession(
      parseLevel(String.raw`
        . \ .
        . G .
      `),
      2,
    );
    session.fire(0);
    expect(session.finishShot()).toBe("goal");
    expect(session.board.cells[0][1]).toBe("mirrorSlash");
  });

  it("rejects finishShot() without a shot in progress", () => {
    expect(() => newSession().finishShot()).toThrow("no shot in progress");
  });

  it.each(["aiming", "firing", "complete"] as const)(
    "restarts from the %s phase",
    (phase) => {
      const session = newSession();
      session.fire(0);
      if (phase !== "firing") {
        session.finishShot();
      }
      if (phase === "complete") {
        session.fire(0);
        session.finishShot();
      }
      expect(session.phase).toBe(phase);

      session.restart();
      expect(session.phase).toBe("aiming");
      expect(session.shots).toBe(0);
      expect(session.board).toBe(session.startBoard);
      expect(session.selectedRow).toBe(0);
      expect(() => session.finishShot()).toThrow();
    },
  );
});

describe("LevelSession bonus targets", () => {
  it("removes a bonus target hit until a restart, which brings it back", () => {
    const session = new LevelSession(parseLevel(". * G\n. . ."));
    session.fire(0);
    expect(session.finishShot()).toBe("bonus");
    expect(session.phase).toBe("aiming");
    expect(session.board.cells[0][1]).toBe("empty");
    session.fire(0);
    expect(session.finishShot()).toBe("goal");

    session.restart();
    expect(session.board.cells[0][1]).toBe("bonus");
  });
});

describe("LevelSession player-placed mirror", () => {
  // Row 0 passes the empty cell and exits; with a "\" placed there it turns
  // down into the goal.
  const MIRROR_BOARD = String.raw`
    . . .
    # G .
  `;
  const newMirrorSession = () =>
    new LevelSession(parseLevel(MIRROR_BOARD), 1, "mirrorBackslash");

  it("places the mirror on an empty cell without taking a shot, once", () => {
    const session = newMirrorSession();
    expect(session.mirrorInHand).toBe(true);
    expect(session.placedMirror).toBeNull();
    expect(session.canPlace({ x: 0, y: 1 })).toBe(false);
    expect(session.place({ x: 1, y: 0 })).toBe(true);
    expect(session.board.cells[0][1]).toBe("mirrorBackslash");
    expect(session.mirrorInHand).toBe(false);
    expect(session.placedMirror).toEqual({ x: 1, y: 0 });
    expect(session.shots).toBe(0);
    expect(session.place({ x: 2, y: 0 })).toBe(false);
    session.fire(0);
    expect(session.finishShot()).toBe("goal");
  });

  it("has no mirror to place unless the level gives one", () => {
    const session = new LevelSession(parseLevel(MIRROR_BOARD));
    expect(session.mirrorInHand).toBe(false);
    expect(session.place({ x: 1, y: 0 })).toBe(false);
  });

  it("can't place during a shot or after completion", () => {
    const session = newMirrorSession();
    session.fire(0);
    expect(session.place({ x: 1, y: 0 })).toBe(false);
    session.finishShot();
    expect(session.place({ x: 1, y: 0 })).toBe(true);
    session.fire(0);
    session.finishShot();
    expect(session.phase).toBe("complete");
    session.restart();
    session.fire(0);
    session.finishShot();
    expect(session.canPlace({ x: 1, y: 0 })).toBe(true);
  });

  it("takes the placed mirror back on restart", () => {
    const session = newMirrorSession();
    session.place({ x: 1, y: 0 });
    session.restart();
    expect(session.board.cells[0][1]).toBe("empty");
    expect(session.mirrorInHand).toBe(true);
    expect(session.placedMirror).toBeNull();
  });
});
