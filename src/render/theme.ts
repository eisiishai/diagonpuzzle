// The "Laser lab" art direction: colours, fonts and glow, defined once.
// See docs/DESIGN.md, Art direction.

import { AdvancedBloomFilter, GlowFilter } from "pixi-filters";
import type { Filter, TextStyleOptions } from "pixi.js";

export const COLORS = {
  background: 0x0a0e18,
  panel: 0x0f1728,
  panelBorder: 0x24375a,
  buttonBorder: 0x2a3b5c,
  grid: 0x172540,
  text: 0xe6f1ff,
  dim: 0x9fb6d6,
  beam: 0xff4d7d,
  beamCore: 0xfff3f6,
  glass: 0x6fb6ec,
  glassHighlight: 0xf2fbff,
  success: 0x3dffb4,
  star: 0xffe08a,
  wall: 0x18233a,
  wallEdge: 0x34466b,
  wallHatch: 0x26365a,
  emitterIdle: 0x3b5a86,
  emitterSelected: 0x11223a,
} as const;

/**
 * The bonus target's prism colours: its gem facets, sparkles and bursts.
 * The only multicoloured piece on the board, so it stands out from the goal.
 */
export const BONUS_COLORS = [
  0xff5fd2, 0xffa45c, 0xffe08a, 0x3dffb4, 0x5fd8ff, 0xa98bff,
] as const;

/** The same background as a CSS colour, for the page and the renderer. */
export const BACKGROUND_CSS = "#0a0e18";

const UI_FONT = ["Chakra Petch", "Segoe UI", "sans-serif"];
const MONO_FONT = ["JetBrains Mono", "ui-monospace", "monospace"];

/** Font faces the game uses; loaded before any text is created (main.ts). */
export const FONT_FACES = [
  '500 20px "Chakra Petch"',
  '700 20px "Chakra Petch"',
  '500 20px "JetBrains Mono"',
];

export type TextKind = "title" | "heading" | "body" | "label" | "value";

const TEXT_KINDS: Record<TextKind, TextStyleOptions> = {
  title: {
    fontFamily: UI_FONT,
    fontWeight: "700",
    fontSize: 56,
    letterSpacing: 6,
    fill: COLORS.text,
  },
  heading: {
    fontFamily: UI_FONT,
    fontWeight: "700",
    fontSize: 22,
    letterSpacing: 1.8,
    fill: COLORS.text,
  },
  body: {
    fontFamily: UI_FONT,
    fontWeight: "500",
    fontSize: 19,
    fill: COLORS.text,
  },
  label: {
    fontFamily: UI_FONT,
    fontWeight: "500",
    fontSize: 15,
    letterSpacing: 1,
    fill: COLORS.dim,
  },
  value: {
    fontFamily: MONO_FONT,
    fontWeight: "500",
    fontSize: 16,
    fill: COLORS.dim,
  },
};

/** A text style of the given kind, with optional changes. */
export function textStyle(
  kind: TextKind,
  overrides: TextStyleOptions = {},
): TextStyleOptions {
  return { ...TEXT_KINDS[kind], ...overrides };
}

/**
 * Filters render at resolution 1 by default, which blurs everything under
 * them on high-density screens; render at the screen's resolution instead.
 */
function crisp<T extends Filter>(filter: T): T {
  filter.resolution = "inherit";
  return filter;
}

/**
 * Bloom for the board and effects: only bright things (beam, mirrors, goal,
 * stars) glow, in their own colour; dark panels and grid are unaffected.
 */
export function createBloom(): Filter {
  const bloom = crisp(
    new AdvancedBloomFilter({
      threshold: 0.45,
      bloomScale: 1.1,
      brightness: 1,
      blur: 6,
      quality: 6,
    }),
  );
  bloom.padding = 24;
  return bloom;
}

/** A coloured halo around a single object, such as the title. */
export function createGlow(color: number, strength = 2): Filter {
  return crisp(
    new GlowFilter({
      color,
      distance: 18,
      outerStrength: strength,
      innerStrength: 0,
      quality: 0.3,
    }),
  );
}
