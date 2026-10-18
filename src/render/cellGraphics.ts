import type { Graphics } from "pixi.js";
import type { CellType } from "../game/types";
import { diamondFill } from "./goalFill";
import { arcPoints } from "./polyline";
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

/** Cells drawn as a "\" piece turned a quarter turn. */
const SLASHES: readonly CellType[] = [
  "mirrorSlash",
  "glassSlash",
  "fixedSlash",
];

/** How far drawCell() turns each one-way gate, drawn pointing right. */
const GATE_ROTATIONS: Partial<Record<CellType, number>> = {
  gateRight: 0,
  gateDown: Math.PI / 2,
  gateLeft: Math.PI,
  gateUp: -Math.PI / 2,
};

/**
 * How each cell type looks. Mirrors (and glass and fixed mirrors) are drawn as
 * "\"; drawCell() rotates "/" by 90°, and one-way gates, drawn pointing
 * right, to their direction. New block types are added here (the type check fails
 * until they are).
 */
const CELL_DRAWERS: Record<CellType, CellDrawer> = {
  empty: () => {},
  mirrorBackslash: drawMirror,
  mirrorSlash: drawMirror,
  glassBackslash: drawGlassMirror,
  glassSlash: drawGlassMirror,
  fixedBackslash: drawFixedMirror,
  fixedSlash: drawFixedMirror,
  gateRight: drawGate,
  gateLeft: drawGate,
  gateUp: drawGate,
  gateDown: drawGate,
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
  portal: (g, half) => {
    // A violet ring around a dark well, with three curved vanes swirling
    // into it: the pellet goes in here and comes out of the other one.
    // BoardView turns it slowly.
    const outer = half * 0.66;
    g.circle(0, 0, outer)
      .fill(COLORS.portalCore)
      .stroke({ width: 3.5, color: COLORS.portal });
    for (let i = 0; i < 3; i++) {
      const start = (i / 3) * Math.PI * 2;
      const vane = arcPoints(0, 0, outer * 0.62, start, start + 1.4, 8);
      g.moveTo(vane[0].x, vane[0].y);
      for (const p of vane.slice(1)) {
        g.lineTo(p.x, p.y);
      }
    }
    g.stroke({ width: 2, color: COLORS.portal, alpha: 0.75, cap: "round" })
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

/** A mirror mount's radius, and its screws' distance from the centre. */
const MOUNT_RADIUS = 0.78;
const MOUNT_SCREW = 0.62;
/** Half the thickness of a mirror's glass slab. */
const SLAB_HALF = 0.17;

/**
 * A round steel mount under a mirror, as on an optics table: a stepped
 * disc with two adjuster screws across the glass. It turns with the
 * mirror, so a flip reads as a part turning.
 */
function drawMount(g: Graphics, half: number): void {
  const r = half * MOUNT_RADIUS;
  g.circle(0, 0, r + 1.5)
    .fill({ color: 0x000000, alpha: 0.35 })
    .circle(0, 0, r)
    .fill(COLORS.mountDark)
    .stroke({ width: 1.2, color: COLORS.mountEdge })
    .circle(0, 0, r * 0.8)
    .fill({ color: COLORS.mountLight, alpha: 0.35 });
  // Across the glass, which is drawn as "".
  const screw = (r * MOUNT_SCREW) / Math.SQRT2;
  for (const k of [-1, 1]) {
    g.circle(k * screw, -k * screw, half * 0.075)
      .fill(COLORS.mountScrew)
      .stroke({ width: 0.9, color: COLORS.mountScrewEdge });
  }
}

/**
 * A slab of glass along "\" from `from` to `to` (distances along the
 * diagonal, in pixels from the centre): a bright mirrored face, a tinted
 * body, a lit outline and bevelled ends. `alpha` dims it.
 */
function drawSlab(
  g: Graphics,
  half: number,
  from: number,
  to: number,
  alpha = 1,
): void {
  const th = half * SLAB_HALF;
  // Along the glass (a) and across it (b), turned to "\".
  const at = (a: number, b: number) => [
    (a - b) / Math.SQRT2,
    (a + b) / Math.SQRT2,
  ];
  const band = (b0: number, b1: number) => [
    ...at(from, b0),
    ...at(to, b0),
    ...at(to, b1),
    ...at(from, b1),
  ];
  g.poly(band(-th, -th * 0.3))
    .fill({ color: COLORS.glass, alpha: 0.85 * alpha })
    .poly(band(-th * 0.3, th))
    .fill({ color: COLORS.glass, alpha: 0.4 * alpha })
    .poly(band(-th, th))
    .stroke({
      width: 1,
      color: COLORS.glass,
      alpha: 0.9 * alpha,
      join: "round",
    });
  const face = -th + 1.2;
  const [x0, y0] = at(from + 2, face);
  const [x1, y1] = at(to - 2, face);
  g.moveTo(x0, y0)
    .lineTo(x1, y1)
    .stroke({ width: 1.4, color: COLORS.glassHighlight, alpha, cap: "round" });
  for (const end of [from + 0.8, to - 0.8]) {
    const [ex0, ey0] = at(end, -th + 1);
    const [ex1, ey1] = at(end, th - 1);
    g.moveTo(ex0, ey0).lineTo(ex1, ey1);
  }
  g.stroke({ width: 1.5, color: COLORS.glassHighlight, alpha: 0.6 * alpha });
}

/** A mirror, drawn as "\": a bevelled glass slab on a round mount. */
function drawMirror(g: Graphics, half: number): void {
  const length = half * 0.7 * Math.SQRT2;
  drawMount(g, half);
  drawSlab(g, half, -length, length);
}

/**
 * A glass mirror, drawn as "\": on the same mount, its slab broken into
 * three panes with gaps between them, so it reads as fragile.
 */
function drawGlassMirror(g: Graphics, half: number): void {
  const length = half * 0.7 * Math.SQRT2;
  const pane = (2 * length) / 3;
  const gap = half * 0.09 * Math.SQRT2;
  drawMount(g, half);
  for (let i = 0; i < 3; i++) {
    const from = -length + i * pane + (i > 0 ? gap / 2 : 0);
    const to = -length + (i + 1) * pane - (i < 2 ? gap / 2 : 0);
    drawSlab(g, half, from, to, 0.8);
  }
}

/**
 * A fixed mirror, drawn as "\": a matte steel bar with a dull centre line,
 * bolted down at both ends, so it reads as one that doesn't turn.
 */
function drawFixedMirror(g: Graphics, half: number): void {
  const reach = half * 0.7;
  g.moveTo(-reach, -reach)
    .lineTo(reach, reach)
    .stroke({ width: 7, color: COLORS.steel, cap: "round" })
    .moveTo(-reach + 4, -reach + 4)
    .lineTo(reach - 4, reach - 4)
    .stroke({ width: 1.5, color: COLORS.steelHighlight, cap: "round" });
  const bolt = reach * 0.92;
  for (const end of [-bolt, bolt]) {
    g.circle(end, end, half * 0.11)
      .fill(COLORS.steelBolt)
      .stroke({ width: 1.5, color: COLORS.steel });
  }
}

/**
 * A one-way gate, drawn pointing right: an amber arrow between two dark
 * rails, the way the pellet may go through; from any other side it stops.
 */
function drawGate(g: Graphics, half: number): void {
  const rail = half * 0.8;
  for (const y of [-half * 0.82, half * 0.68]) {
    g.roundRect(-rail, y, rail * 2, half * 0.14, 2);
  }
  g.fill(COLORS.gateRail);
  const tip = half * 0.42;
  const back = -half * 0.12;
  const wing = half * 0.4;
  g.moveTo(-half * 0.5, 0)
    .lineTo(tip - 3, 0)
    .stroke({ width: 4, color: COLORS.gate, cap: "round" })
    .moveTo(back, -wing)
    .lineTo(tip, 0)
    .lineTo(back, wing)
    .stroke({ width: 4, color: COLORS.gate, cap: "round", join: "round" });
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
    GATE_ROTATIONS[cell] ?? (SLASHES.includes(cell) ? Math.PI / 2 : 0);
  g.scale.set(1);
  g.alpha = 1;
  CELL_DRAWERS[cell](g, cellSize / 2, goalHits);
}
