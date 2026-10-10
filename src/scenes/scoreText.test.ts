import { describe, expect, it } from "vitest";
import { completionMessage, earnsStar, levelListLabel } from "./scoreText";

describe("earnsStar", () => {
  it("is earned at par and not above it", () => {
    expect(earnsStar(2, 2)).toBe(true);
    expect(earnsStar(3, 2)).toBe(false);
  });
});

describe("completionMessage", () => {
  it("awards a star at par", () => {
    expect(completionMessage(1, 1, undefined)).toBe(
      "★ Par! Level complete in 1 shot. Press Enter to continue.",
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

describe("levelListLabel", () => {
  it("shows locked, unplayed, completed and starred levels", () => {
    expect(levelListLabel(3, "Second try", 2, false, undefined)).toBe(
      "🔒 3. Second try",
    );
    expect(levelListLabel(3, "Second try", 2, true, undefined)).toBe(
      "3. Second try  ·  par 2",
    );
    expect(levelListLabel(3, "Second try", 2, true, 4)).toBe(
      "✓ 3. Second try  ·  best 4 / par 2",
    );
    expect(levelListLabel(3, "Second try", 2, true, 2)).toBe(
      "✓ 3. Second try  ·  best 2 / par 2  ★",
    );
  });
});
