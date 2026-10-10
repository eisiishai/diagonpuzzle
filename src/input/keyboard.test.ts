import { describe, expect, it } from "vitest";
import { keyAction } from "./keyboard";
import type { KeyPress } from "./keyboard";

function press(key: string, extra: Partial<KeyPress> = {}) {
  return keyAction({
    key,
    shiftKey: false,
    ctrlKey: false,
    altKey: false,
    metaKey: false,
    repeat: false,
    ...extra,
  });
}

describe("keyAction", () => {
  it("maps arrows, WASD and the action keys, ignoring letter case", () => {
    expect(press("ArrowUp").action).toBe("selectUp");
    expect(press("w").action).toBe("selectUp");
    expect(press("D").action).toBe("selectRight");
    expect(press("Enter").action).toBe("fire");
    expect(press(" ").action).toBe("fire");
    expect(press("p").action).toBe("place");
    expect(press("Escape").action).toBe("back");
    expect(press("r").action).toBe("restart");
  });

  it("leaves unused keys to the browser", () => {
    expect(press("x")).toEqual({ used: false });
    expect(press("Tab")).toEqual({ used: false });
  });

  it("uses Shift+N for the hidden skip, and N alone for nothing", () => {
    expect(press("N", { shiftKey: true }).action).toBe("skipLevel");
    expect(press("n")).toEqual({ used: false });
  });

  it("keeps other keys working with Shift held", () => {
    expect(press("ArrowDown", { shiftKey: true }).action).toBe("selectDown");
  });

  it("leaves Ctrl, Alt and Meta combinations to the browser", () => {
    for (const modifier of ["ctrlKey", "altKey", "metaKey"] as const) {
      expect(press("r", { [modifier]: true })).toEqual({ used: false });
    }
  });

  it("repeats selection while a key is held, but no one-shot action", () => {
    expect(press("ArrowDown", { repeat: true }).action).toBe("selectDown");
    for (const key of ["Enter", "p", "Escape", "r", "m", "f"]) {
      expect(press(key, { repeat: true })).toEqual({ used: true });
    }
    expect(press("N", { shiftKey: true, repeat: true })).toEqual({
      used: true,
    });
  });
});
