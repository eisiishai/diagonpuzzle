import type { Graphics } from "pixi.js";
import type { CellType } from "../game/types";
import { diamondFill } from "./goalFill";
import { BONUS_COLORS, COLORS } from "./theme";

/** Goal hits so far and needed, for a goal that needs several hits. */
export interface GoalHits {
  hits: number;
  required: number;
}

/**
 * Draws one cell type into `g`, centred on g's origin, in a cell `half`
 * pixels from centre to edge.
 */
type CellDrawer = (g: Graphics, half: number, goalHits: GoalHits) => void;

/**
 * How each cell type looks. Mirrors (and glass mirrors) are both drawn as
 * "\"; drawCell() rotates "/" by 90°. New block types are added here (the type check fails
 * until they are).
 */
const CELL_DRAWERS: Record<CellType, CellDrawer> = {
  empty: () => {},
  mirrorBackslash: drawMirror,
  mirrorSlash: drawMirror,
  glassBackslash: drawGlassMirror,
  glassSlash: drawGlassMirror,
  wall: (g, half) => {
    // A dark block with diagonal hatching.
    const edge = half * 0.87;
    g.roundRect(-edge, -edge, edge * 2, edge * 2, 6)
      .fill(COLORS.wall)
      .stroke({ width: 1.5, color: COLORS.wallEdge });
    const h = edge * 0.75;
    g.moveTo(-h, h)
      .lineTo(h, -h)
      .moveTo(-h, h * 0.1)
      .lineTo(h * 0.1, -h)
      .moveTo(-h * 0.1, h)
      .lineTo(h, h * 0.1)
      .stroke({ width: 4, color: COLORS.wallHatch, cap: "round" });
  },
  breakable: (g, half) => {
    // A stone block with cracks running through it: it breaks when hit.
    const edge = half * 0.87;
    g.roundRect(-edge, -edge, edge * 2, edge * 2, 6)
      .fill(COLORS.stone)
      .stroke({ width: 1.5, color: COLORS.stoneEdge });
    const crack = (points: number[]) => {
      g.moveTo(points[0] * edge, points[1] * edge);
      for (let i = 2; i < points.length; i += 2) {
        g.lineTo(points[i] * edge, points[i + 1] * edge);
      }
    };
    crack([-0.2, -0.98, -0.05, -0.55, -0.28, -0.2, 0.05, 0.15]);
    crack([0.05, 0.15, -0.12, 0.55, 0.08, 0.98]);
    crack([0.05, 0.15, 0.45, 0.3, 0.6, 0.72]);
    crack([0.98, -0.45, 0.55, -0.35, 0.38, -0.65]);
    crack([-0.98, 0.35, -0.6, 0.45, -0.5, 0.75]);
    g.stroke({
      width: 2.5,
      color: COLORS.stoneCrack,
      cap: "round",
      join: "round",
    });
  },
  reflector: (g, half) => {
    // A round retroreflector: a glass ring around the three facets of a
    // corner cube, which send light back the way it came. The beam turns
    // back at the ring (REFLECTOR_RADIUS in pathPoints.ts).
    const outer = half * 0.6;
    g.circle(0, 0, outer)
      .fill(COLORS.panel)
      .stroke({ width: 3, color: COLORS.glass });
    const facet = outer * 0.78;
    for (const angle of [-Math.PI / 2, Math.PI / 6, (Math.PI * 5) / 6]) {
      g.moveTo(0, 0).lineTo(Math.cos(angle) * facet, Math.sin(angle) * facet);
    }
    g.stroke({ width: 1.5, color: COLORS.glassHighlight, cap: "round" })
      .circle(0, 0, half * 0.1)
      .fill(COLORS.glassHighlight);
  },
  bonus: (g, half) => {
    // A prism gem: a hexagon cut into facets of every bonus colour around a
    // bright core. It turns slowly, so the colours swirl.
    const outer = half * 0.62;
    const inner = half * 0.2;
    const corner = (i: number, radius: number) => {
      const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
      return [Math.cos(angle) * radius, Math.sin(angle) * radius];
    };
    for (let i = 0; i < 6; i++) {
      g.poly([0, 0, ...corner(i, outer), ...corner(i + 1, outer)]).fill(
        BONUS_COLORS[i],
      );
    }
    for (let i = 0; i < 6; i++) {
      const [cx, cy] = corner(i, outer);
      g.moveTo(0, 0).lineTo(cx, cy);
    }
    g.stroke({ width: 1, color: COLORS.panel, alpha: 0.6 });
    const hexagon = (radius: number) =>
      Array.from({ length: 6 }, (_, i) => corner(i, radius)).flat();
    g.poly(hexagon(outer))
      .stroke({ width: 2, color: COLORS.glassHighlight, join: "miter" })
      .poly(hexagon(inner))
      .fill(COLORS.beamCore);
  },
  goal: (g, half, { hits, required }) => {
    // A crystal: a diamond outline around a solid diamond. When the goal
    // needs several hits, the core fills from the bottom per hit.
    const outer = half * 0.85;
    const inner = half * 0.4;
    g.poly([0, -outer, outer, 0, 0, outer, -outer, 0]).stroke({
      width: 3,
      color: COLORS.success,
      join: "miter",
    });
    if (required <= 1) {
      g.poly([0, -inner, inner, 0, 0, inner, -inner, 0]).fill(COLORS.success);
      return;
    }
    g.poly([0, -inner, inner, 0, 0, inner, -inner, 0]).stroke({
      width: 1.5,
      color: COLORS.success,
      alpha: 0.5,
      join: "miter",
    });
    const filled = diamondFill(inner, hits / required);
    if (filled.length > 0) {
      g.poly(filled).fill(COLORS.success);
    }
  },
};

/** A glass bar with a bright centre line, drawn as "\". */
function drawMirror(g: Graphics, half: number): void {
  const reach = half * 0.7;
  g.moveTo(-reach, -reach)
    .lineTo(reach, reach)
    .stroke({ width: 7, color: COLORS.glass, cap: "round" })
    .moveTo(-reach + 2, -reach + 2)
    .lineTo(reach - 2, reach - 2)
    .stroke({ width: 1.5, color: COLORS.glassHighlight, cap: "round" });
}

/**
 * A glass mirror, drawn as "\": the mirror's bar broken into three panes
 * with gaps between them, so it reads as fragile.
 */
function drawGlassMirror(g: Graphics, half: number): void {
  const reach = half * 0.7;
  const pane = (2 * reach) / 3;
  const gap = half * 0.09;
  for (let i = 0; i < 3; i++) {
    const from = -reach + i * pane + (i > 0 ? gap / 2 : 0);
    const to = -reach + (i + 1) * pane - (i < 2 ? gap / 2 : 0);
    g.moveTo(from, from).lineTo(to, to);
  }
  g.stroke({ width: 7, color: COLORS.glass, alpha: 0.75 });
  for (let i = 0; i < 3; i++) {
    const from = -reach + i * pane + gap;
    const to = -reach + (i + 1) * pane - gap;
    g.moveTo(from, from).lineTo(to, to);
  }
  g.stroke({ width: 1.5, color: COLORS.glassHighlight, cap: "round" });
}

/**
 * Draws `cell` into `g`, centred on g's origin, resetting any rotation,
 * scale and fade left from animations.
 */
export function drawCell(
  g: Graphics,
  cell: CellType,
  cellSize: number,
  goalHits: GoalHits,
): void {
  g.clear();
  g.rotation =
    cell === "mirrorSlash" || cell === "glassSlash" ? Math.PI / 2 : 0;
  g.scale.set(1);
  g.alpha = 1;
  CELL_DRAWERS[cell](g, cellSize / 2, goalHits);
}
