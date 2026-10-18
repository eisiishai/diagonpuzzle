import { describe, expect, it } from "vitest";
import {
  completionMessage,
  firstShotHintMessage,
  hintLabel,
  introMessage,
  levelListRow,
} from "./scoreText";

describe("completionMessage", () => {
  it("awards a star at par", () => {
    expect(completionMessage(1, 1, undefined)).toBe(
      "★ Par! Level complete in 1 shot. Press Enter to continue.",
    );
  });

  it("hints at replaying levels when every level is at par", () => {
    expect(completionMessage(1, 1, undefined, true)).toBe(
      "★ Par! Level complete in 1 shot. Every level is at par! Replay any level: something new awaits there.",
    );
  });

  it("names the par when above it", () => {
    expect(completionMessage(3, 2, undefined)).toBe(
      "Level complete in 3 shots. Par is 2: try again for a ★. Press Enter to continue.",
    );
  });

  it("reports a new best or the existing one", () => {
    expect(completionMessage(2, 2, 4)).toContain("New best! (was 4)");
    expect(completionMessage(5, 2, 3)).toContain("Best: 3 shots.");
  });
});

describe("levelListRow", () => {
  const row = (...args: Parameters<typeof levelListRow>) =>
    levelListRow(...args);

  it("shows locked, unplayed and skipped levels", () => {
    expect(row(3, "Second try", 2, false, undefined)).toEqual({
      state: "locked",
      title: "3. Second try",
      detail: "",
    });
    expect(row(3, "Second try", 2, true, undefined)).toEqual({
      state: "open",
      title: "3. Second try",
      detail: "par 2",
    });
    expect(row(3, "Second try", 2, true, undefined, true).detail).toBe(
      "skipped · par 2",
    );
  });

  it("tells completed, starred and golden levels apart", () => {
    expect(row(3, "Second try", 2, true, 4)).toEqual({
      state: "done",
      title: "3. Second try",
      detail: "best 4 / par 2",
    });
    expect(row(3, "Second try", 2, true, 2).state).toBe("star");
    expect(row(3, "Second try", 2, true, 2, false, true).state).toBe("golden");
  });

  it("gives the secret chapter's levels a prism star at par", () => {
    expect(row(46, "Long game", 5, true, 5, false, false, true).state).toBe(
      "prism",
    );
    expect(row(46, "Long game", 5, true, 6, false, false, true).state).toBe(
      "done",
    );
  });
});

describe("introMessage", () => {
  const plain = {
    bonusToFind: false,
    goalHits: 1,
    hasBreakable: false,
    hasReflector: false,
    hasGlass: false,
    hasFixed: false,
    hasPortal: false,
    hasGate: false,
  };

  it("explains how to play on a plain level", () => {
    expect(introMessage(plain)).toContain("Aim with ↑/↓");
  });

  it("names the newest thing in the level, in order of priority", () => {
    expect(
      introMessage({
        bonusToFind: true,
        playerMirror: "mirrorSlash",
        goalHits: 2,
        hasBreakable: true,
        hasReflector: true,
        hasGlass: true,
        hasFixed: true,
        hasPortal: true,
        hasGate: true,
      }),
    ).toContain("bonus target");
    expect(
      introMessage({ ...plain, hasPortal: true, hasGate: true }),
    ).toContain("One-way gates");
    expect(
      introMessage({ ...plain, hasFixed: true, hasPortal: true }),
    ).toContain("Portals");
    expect(
      introMessage({ ...plain, hasGlass: true, hasFixed: true }),
    ).toContain("Steel mirrors");
    expect(
      introMessage({ ...plain, hasReflector: true, hasGlass: true }),
    ).toContain("Glass mirrors");
    expect(
      introMessage({
        ...plain,
        playerMirror: "mirrorSlash",
        goalHits: 2,
        hasBreakable: true,
        hasReflector: true,
      }),
    ).toContain("reflectors");
    expect(
      introMessage({
        ...plain,
        playerMirror: "mirrorSlash",
        goalHits: 2,
        hasBreakable: true,
      }),
    ).toContain("Place your / mirror");
    expect(
      introMessage({ ...plain, goalHits: 3, hasBreakable: true }),
    ).toContain("needs 3 hits");
    expect(introMessage({ ...plain, hasBreakable: true })).toContain(
      "Cracked walls",
    );
  });

  it("shows the backslash mirror's symbol", () => {
    expect(
      introMessage({ ...plain, playerMirror: "mirrorBackslash" }),
    ).toContain("Place your \\ mirror");
  });
});

describe("hints", () => {
  it("labels the hint button by how far the hints are open", () => {
    expect(hintLabel(0, 120_000)).toBe("HINT · H");
    expect(hintLabel(1, 120_000)).toBe("HINT 2 IN 2:00");
    expect(hintLabel(1, 84_500)).toBe("HINT 2 IN 1:25");
    expect(hintLabel(1, 9_000)).toBe("HINT 2 IN 0:09");
    expect(hintLabel(1, -5)).toBe("HINT 2 IN 0:00");
    expect(hintLabel(2, 0)).toBe("HINT 2 · H");
  });

  it("names the first move, and asks for a restart after shots", () => {
    expect(firstShotHintMessage(false, 0)).toBe(
      "Hint 2: from the start, fire the framed emitter first: it begins a par solution.",
    );
    expect(firstShotHintMessage(true, 2)).toBe(
      "Hint 2: from the start, place your mirror, then fire the framed emitter first: it begins a par solution. Restart to try it.",
    );
  });
});
