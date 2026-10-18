import { describe, expect, it } from "vitest";
import { CHAPTERS } from "../levels/levels";
import { CHAPTER_LIGHTS } from "./theme";

describe("CHAPTER_LIGHTS", () => {
  it("gives every chapter a light, and the secret one the prism's", () => {
    expect(CHAPTER_LIGHTS).toHaveLength(CHAPTERS.length);
    CHAPTERS.forEach((chapter, i) =>
      expect(CHAPTER_LIGHTS[i] === "prism").toBe(chapter.secret === true),
    );
  });
});
