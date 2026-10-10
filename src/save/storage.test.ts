import { afterEach, describe, expect, it, vi } from "vitest";
import { readStorage, removeStorage, writeStorage } from "./storage";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("storage", () => {
  it("reads, writes and removes values under the game's prefix", () => {
    const values = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    });
    writeStorage("progress", "saved");
    expect(values.get("diagonpuzzle.progress")).toBe("saved");
    expect(readStorage("progress")).toBe("saved");
    removeStorage("progress");
    expect(readStorage("progress")).toBeNull();
  });

  it("works without remembering when storage throws", () => {
    const fail = () => {
      throw new Error("blocked");
    };
    vi.stubGlobal("localStorage", {
      getItem: fail,
      setItem: fail,
      removeItem: fail,
    });
    expect(readStorage("progress")).toBeNull();
    expect(() => writeStorage("progress", "saved")).not.toThrow();
    expect(() => removeStorage("progress")).not.toThrow();
  });

  it("works without remembering when storage is missing", () => {
    vi.stubGlobal("localStorage", undefined);
    expect(readStorage("progress")).toBeNull();
    expect(() => writeStorage("progress", "saved")).not.toThrow();
    expect(() => removeStorage("progress")).not.toThrow();
  });
});
