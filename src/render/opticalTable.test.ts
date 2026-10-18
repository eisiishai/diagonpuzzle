import { describe, expect, it } from "vitest";
import { tableHoles } from "./opticalTable";

describe("tableHoles", () => {
  const holes = tableHoles(3, 2, 10);

  it("puts a hole at every cell corner but the panel's four", () => {
    // (3 + 1) × (2 + 1) corners, less the panel's four.
    expect(holes).toHaveLength(8);
    expect(holes).toContainEqual({ x: 10, y: 10 });
    expect(holes).toContainEqual({ x: 20, y: 10 });
    expect(holes).not.toContainEqual({ x: 0, y: 0 });
  });

  it("moves holes on the edge in a little", () => {
    expect(holes).toContainEqual({ x: 10, y: 1.6 });
    expect(holes).toContainEqual({ x: 1.6, y: 10 });
    expect(holes).toContainEqual({ x: 28.4, y: 10 });
    expect(holes).toContainEqual({ x: 20, y: 18.4 });
  });
});
