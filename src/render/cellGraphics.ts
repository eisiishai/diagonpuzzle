import { FillGradient } from "pixi.js";
import type { Graphics } from "pixi.js";
import type { CellType } from "../game/types";
import { fillLevel, polygonBelow } from "./goalFill";
import { BONUS_COLORS, COLORS } from "./theme";

// Every piece is lab hardware standing on the optical table: pieces that
// turn or are held stand on round mounts, ones that can't turn on a
// square plate, and blocks cast a shadow. See docs/DESIGN.md, Shapes.

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

/** Blocks (walls) fill this much of their cell, from the centre. */
const BLOCK = 0.87;
const BLOCK_CORNER = 6;
/** Round mounts' radius, and mirror mounts' screws' distance out. */
const MOUNT_RADIUS = 0.78;
const MOUNT_SCREW = 0.62;
/** Half the thickness of a mirror's slab. */
const SLAB_HALF = 0.17;
/** The goal crystal's radius, held in its mount. */
const CRYSTAL_RADIUS = 0.66;
/** The bonus gem's radius, held in its mount. */
const GEM_RADIUS = 0.56;
/** A portal's violet field; ripples drift inward over it (BoardView). */
export const PORTAL_FIELD = 0.58;

/**
 * The pieces a breakable wall is already split into, in a square from
 * (-1, -1) to (1, 1) with its corners cut a little for the rounded block.
 * It falls apart into these when hit (BoardEffects).
 */
export const STONE_PIECES: readonly (readonly [number, number])[][] = [
  [
    [-1, -0.9],
    [-0.9, -1],
    [-0.05, -1],
    [0.1, -0.35],
    [-0.25, 0.05],
    [-1, 0.3],
  ],
  [
    [-0.05, -1],
    [0.9, -1],
    [1, -0.9],
    [1, -0.4],
    [0.45, -0.25],
    [0.1, -0.35],
  ],
  [
    [0.1, -0.35],
    [0.45, -0.25],
    [1, -0.4],
    [1, 0.45],
    [0.35, 0.3],
    [-0.25, 0.05],
  ],
  [
    [-1, 0.3],
    [-0.25, 0.05],
    [0.35, 0.3],
    [0.1, 1],
    [-0.9, 1],
    [-1, 0.9],
  ],
  [
    [0.35, 0.3],
    [1, 0.45],
    [1, 0.9],
    [0.9, 1],
    [0.1, 1],
  ],
];

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
    // A machined block: the hatching that marks a wall, with bevelled
    // edges, a shadow on the table and two screws.
    const e = half * BLOCK;
    drawShadow(g, e);
    const metal = new FillGradient({
      type: "linear",
      start: { x: 0, y: 0 },
      end: { x: 1, y: 1 },
      colorStops: [
        { offset: 0, color: COLORS.wallLight },
        { offset: 1, color: COLORS.wallDark },
      ],
    });
    g.roundRect(-e, -e, e * 2, e * 2, BLOCK_CORNER)
      .fill(metal)
      .stroke({ width: 1.2, color: COLORS.wallEdge });
    const h = e * 0.75;
    g.moveTo(-h, h)
      .lineTo(h, -h)
      .moveTo(-h, h * 0.1)
      .lineTo(h * 0.1, -h)
      .moveTo(-h * 0.1, h)
      .lineTo(h, h * 0.1)
      .stroke({ width: 4, color: COLORS.wallHatch, cap: "round" });
    drawBevel(g, e, 0.28);
    drawScrew(g, -e + 5.5, -e + 5.5, half * 0.06);
    drawScrew(g, e - 5.5, e - 5.5, half * 0.06);
  },
  breakable: (g, half) => {
    // A stone tile already split into pieces, held together until hit.
    const e = half * BLOCK;
    drawShadow(g, e);
    g.roundRect(-e, -e, e * 2, e * 2, BLOCK_CORNER).fill(COLORS.stoneCrack);
    STONE_PIECES.forEach((piece, i) => {
      g.poly(piece.flatMap(([x, y]) => [x * e, y * e]))
        .fill(i % 2 ? COLORS.stone : COLORS.stoneLight)
        .stroke({ width: 2.6, color: COLORS.stoneCrack, join: "round" });
    });
    g.roundRect(-e, -e, e * 2, e * 2, BLOCK_CORNER).stroke({
      width: 1.2,
      color: COLORS.stoneEdge,
    });
    drawBevel(g, e, 0.22);
  },
  reflector: (g, half) => {
    // A corner cube on a mount: three glass facets meeting at the centre,
    // which send light back the way it came. The beam turns back at the
    // rim (REFLECTOR_RADIUS in pathPoints.ts).
    drawDisc(g, half * MOUNT_RADIUS);
    const r = half * 0.56;
    const corner = (i: number) => {
      const angle = -Math.PI / 2 + (i * Math.PI) / 3;
      return [Math.cos(angle) * r, Math.sin(angle) * r];
    };
    COLORS.cubeFacets.forEach((color, k) => {
      g.poly([
        0,
        0,
        ...corner(2 * k),
        ...corner(2 * k + 1),
        ...corner(2 * k + 2),
      ]).fill({
        color,
        alpha: 0.85,
      });
    });
    for (let k = 0; k < 3; k++) {
      const [x, y] = corner(2 * k);
      g.moveTo(0, 0).lineTo(x, y);
    }
    g.stroke({ width: 1, color: COLORS.glassHighlight, alpha: 0.8 })
      .circle(0, 0, half * 0.6)
      .stroke({ width: 2.5, color: COLORS.glass })
      .circle(0, 0, half * 0.08)
      .fill(COLORS.glassHighlight);
  },
  portal: (g, half) => {
    // A steel ring bolted to the table round a violet field: the pellet
    // goes in here and comes out of the other one. BoardView draws the
    // ripples drifting inward over the field.
    const ring = half * 0.8;
    g.circle(0, 0, ring + 1.5)
      .fill({ color: COLORS.shadow, alpha: 0.35 })
      .circle(0, 0, ring)
      .fill(COLORS.portalRing)
      .stroke({ width: 1.2, color: COLORS.mountEdge });
    for (let i = 0; i < 4; i++) {
      const angle = Math.PI / 4 + (i * Math.PI) / 2;
      drawScrew(
        g,
        Math.cos(angle) * ring * 0.86,
        Math.sin(angle) * ring * 0.86,
        half * 0.06,
      );
    }
    const field = new FillGradient({
      type: "radial",
      center: { x: 0.5, y: 0.5 },
      innerRadius: 0,
      outerCenter: { x: 0.5, y: 0.5 },
      outerRadius: 0.5,
      colorStops: [
        { offset: 0, color: COLORS.portalWell },
        { offset: 0.65, color: COLORS.portalField },
        { offset: 1, color: COLORS.portal },
      ],
    });
    g.circle(0, 0, half * PORTAL_FIELD)
      .fill(field)
      .circle(0, 0, half * 0.1)
      .fill(COLORS.glassHighlight);
  },
  bonus: (g, half) => {
    // A prism gem held by six prongs, a hexagon cut into facets of every
    // bonus colour around a bright core. Its mount is drawn under it
    // (drawCellBase()); the gem turns slowly, so the colours swirl.
    const outer = half * GEM_RADIUS;
    const inner = outer * 0.32;
    const corner = (i: number, radius: number) => {
      const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
      return [Math.cos(angle) * radius, Math.sin(angle) * radius];
    };
    for (let i = 0; i < 6; i++) {
      const [x, y] = corner(i, outer + 3);
      g.circle(x, y, half * 0.08);
    }
    g.fill(COLORS.prong);
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
    // A cut crystal, lit from the top left, with a bright table in the
    // middle; its holder is drawn under it (drawCellBase()). When the goal
    // needs several hits, its facets light up from the bottom per hit.
    const r = half * CRYSTAL_RADIUS;
    const tips = [
      [0, -r],
      [r, 0],
      [0, r],
      [-r, 0],
    ];
    // Facets between the top and left tip, top and right, and so on.
    const facets = [
      [0, 0, ...tips[0], ...tips[3]],
      [0, 0, ...tips[0], ...tips[1]],
      [0, 0, ...tips[1], ...tips[2]],
      [0, 0, ...tips[2], ...tips[3]],
    ];
    const lit = required <= 1 ? 1 : hits / required;
    facets.forEach((facet, i) => {
      if (lit < 1) {
        g.poly(facet).fill(COLORS.crystalFacetsDark[i]);
      }
      const part = lit < 1 ? polygonBelow(facet, fillLevel(r, lit)) : facet;
      if (part.length > 0) {
        g.poly(part).fill(COLORS.crystalFacets[i]);
      }
    });
    const table = r * 0.38;
    g.poly([0, -table, table, 0, 0, table, -table, 0])
      .fill({ color: COLORS.crystalTable, alpha: lit >= 1 ? 1 : 0.25 })
      .moveTo(0, -r)
      .lineTo(0, r)
      .moveTo(-r, 0)
      .lineTo(r, 0)
      .stroke({ width: 1, color: 0xffffff, alpha: 0.35 })
      .poly([0, -r, r, 0, 0, r, -r, 0])
      .stroke({ width: 2, color: COLORS.success, join: "miter" });
  },
};

/**
 * What stands under a piece and doesn't move with it, drawn into `g` at
 * (x, y): the goal crystal's holder (a round mount with four prongs at
 * its tips) and the bonus gem's mount, so the crystal can breathe and the
 * gem turn on them. Nothing for other cells.
 */
export function drawCellBase(
  g: Graphics,
  cell: CellType,
  cellSize: number,
  x: number,
  y: number,
): void {
  const half = cellSize / 2;
  if (cell === "goal") {
    drawDisc(g, half * 0.8, x, y);
    const outer = half * 0.8;
    const inner = half * 0.62;
    for (const [dx, dy] of [
      [0, -1],
      [1, 0],
      [0, 1],
      [-1, 0],
    ]) {
      // A trapezoid pointing in, across the tip's direction.
      const across = [-dy, dx];
      const at = (along: number, side: number) => [
        x + dx * along + across[0] * side,
        y + dy * along + across[1] * side,
      ];
      g.poly([
        ...at(outer, -3.2),
        ...at(outer, 3.2),
        ...at(inner, 1.6),
        ...at(inner, -1.6),
      ]);
    }
    g.fill(COLORS.prong);
  } else if (cell === "bonus") {
    drawDisc(g, half * MOUNT_RADIUS, x, y);
  }
}

/** A round steel mount of radius `r` at (x, y): a stepped disc with a shadow. */
function drawDisc(g: Graphics, r: number, x = 0, y = 0): void {
  g.circle(x, y, r + 1.5)
    .fill({ color: COLORS.shadow, alpha: 0.35 })
    .circle(x, y, r)
    .fill(COLORS.mountDark)
    .stroke({ width: 1.2, color: COLORS.mountEdge })
    .circle(x, y, r * 0.8)
    .fill({ color: COLORS.mountLight, alpha: 0.35 });
}

function drawScrew(g: Graphics, x: number, y: number, r: number): void {
  g.circle(x, y, r)
    .fill(COLORS.mountScrew)
    .stroke({ width: 0.9, color: COLORS.mountScrewEdge });
}

/** The shadow a block `e` pixels from centre to edge casts on the table. */
function drawShadow(g: Graphics, e: number): void {
  g.roundRect(-e + 1, -e + 2, e * 2 + 2, e * 2 + 2, BLOCK_CORNER + 1)
    .fill({ color: COLORS.shadow, alpha: 0.2 })
    .roundRect(-e + 2, -e + 3, e * 2, e * 2, BLOCK_CORNER)
    .fill({ color: COLORS.shadow, alpha: 0.35 });
}

/**
 * Light along a block's top and left edges (at `light` strength) and
 * shade along its bottom and right, so it stands up from the table.
 */
function drawBevel(g: Graphics, e: number, light: number): void {
  const inset = 1.5;
  const end = BLOCK_CORNER + 1;
  g.moveTo(-e + inset, e - end)
    .lineTo(-e + inset, -e + end)
    .moveTo(-e + end, -e + inset)
    .lineTo(e - end, -e + inset)
    .stroke({ width: 2, color: COLORS.bevelLight, alpha: light, cap: "round" })
    .moveTo(-e + end, e - inset)
    .lineTo(e - end, e - inset)
    .moveTo(e - inset, -e + end)
    .lineTo(e - inset, e - end)
    .stroke({ width: 2, color: COLORS.shadow, alpha: 0.35, cap: "round" });
}

/**
 * A round mount under a mirror: the disc with two adjuster screws across
 * the glass. It turns with the mirror, so a flip reads as a part turning.
 */
function drawMount(g: Graphics, half: number): void {
  const r = half * MOUNT_RADIUS;
  drawDisc(g, r);
  // Across the glass, which is drawn as "\".
  const screw = (r * MOUNT_SCREW) / Math.SQRT2;
  for (const k of [-1, 1]) {
    drawScrew(g, k * screw, -k * screw, half * 0.075);
  }
}

/**
 * A slab along "\" from `from` to `to` (distances along the diagonal, in
 * pixels from the centre) in `color`: a bright face, a tinted body, a lit
 * outline and bevelled ends, edged in `highlight`. `alpha` dims it.
 */
function drawSlab(
  g: Graphics,
  half: number,
  from: number,
  to: number,
  {
    color = COLORS.glass,
    highlight = COLORS.glassHighlight,
    alpha = 1,
  }: { color?: number; highlight?: number; alpha?: number } = {},
): void {
  const th = half * SLAB_HALF;
  // Along the slab (a) and across it (b), turned to "\".
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
    .fill({ color, alpha: 0.85 * alpha })
    .poly(band(-th * 0.3, th))
    .fill({ color, alpha: 0.4 * alpha })
    .poly(band(-th, th))
    .stroke({ width: 1, color, alpha: 0.9 * alpha, join: "round" });
  const face = -th + 1.2;
  const [x0, y0] = at(from + 2, face);
  const [x1, y1] = at(to - 2, face);
  g.moveTo(x0, y0)
    .lineTo(x1, y1)
    .stroke({ width: 1.4, color: highlight, alpha, cap: "round" });
  for (const end of [from + 0.8, to - 0.8]) {
    const [ex0, ey0] = at(end, -th + 1);
    const [ex1, ey1] = at(end, th - 1);
    g.moveTo(ex0, ey0).lineTo(ex1, ey1);
  }
  g.stroke({ width: 1.5, color: highlight, alpha: 0.6 * alpha });
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
    drawSlab(g, half, from, to, { alpha: 0.8 });
  }
}

/**
 * A fixed mirror, drawn as "\": a matte steel slab on a square foot plate
 * bolted down at its corners: square where turning mirrors are round, so
 * it reads as one that doesn't turn. (Turned a quarter for "/", the plate
 * looks the same.)
 */
function drawFixedMirror(g: Graphics, half: number): void {
  const p = half * 0.72;
  g.roundRect(-p + 1, -p + 2, p * 2, p * 2, 3)
    .fill({ color: COLORS.shadow, alpha: 0.35 })
    .roundRect(-p, -p, p * 2, p * 2, 3)
    .fill(COLORS.footPlate)
    .stroke({ width: 1.2, color: COLORS.footPlateEdge });
  for (const [x, y] of [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ]) {
    drawScrew(g, x * (p - 4.5), y * (p - 4.5), half * 0.065);
  }
  const length = half * 0.7 * Math.SQRT2 * 0.92;
  drawSlab(g, half, -length, length, {
    color: COLORS.steel,
    highlight: COLORS.steelHighlight,
  });
}

/**
 * A one-way gate, drawn pointing right: an amber double chevron between
 * two steel guide rails bolted at both ends, the way the pellet may go
 * through; from any other side it stops.
 */
function drawGate(g: Graphics, half: number): void {
  const length = half * 0.8;
  const th = half * 0.16;
  for (const y of [-half * 0.78, half * 0.62]) {
    const steel = new FillGradient({
      type: "linear",
      start: { x: 0, y: 0 },
      end: { x: 0, y: 1 },
      colorStops: [
        { offset: 0, color: COLORS.railLight },
        { offset: 1, color: COLORS.railDark },
      ],
    });
    g.roundRect(-length + 1, y + 2, length * 2, th, 2)
      .fill({ color: COLORS.shadow, alpha: 0.35 })
      .roundRect(-length, y, length * 2, th, 2)
      .fill(steel);
    drawScrew(g, -length + 4, y + th / 2, half * 0.05);
    drawScrew(g, length - 4, y + th / 2, half * 0.05);
  }
  for (const x of [-half * 0.22, half * 0.2]) {
    g.moveTo(x - half * 0.2, -half * 0.34)
      .lineTo(x + half * 0.14, 0)
      .lineTo(x - half * 0.2, half * 0.34);
  }
  g.stroke({ width: 4, color: COLORS.gate, cap: "round", join: "round" });
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
