import { describe, expect, it } from "vitest";
import { completionMessage, levelListRow } from "./scoreText";

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
});
