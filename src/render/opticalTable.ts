import { FillGradient } from "pixi.js";
import type { Graphics } from "pixi.js";
import { mixColor } from "./color";
import { arcPoints } from "./polyline";
import type { Point } from "./polyline";
import { COLORS } from "./theme";

/** Tapped holes: radius, and how far edge holes sit in from the edge. */
const HOLE_RADIUS = 0.06;
const EDGE_INSET = 0.16;
/** Corner screws: how far in from the corners, and their radius. */
const SCREW_INSET = 0.18;
const SCREW_RADIUS = 0.082;
/** Lines of the brushed grain, this many pixels apart. */
const GRAIN_SPACING = 3;
const CORNER_RADIUS = 10;

/**
 * Where the optical table's tapped holes are, for a board `width` × `height`
 * cells, in pixels from the panel's top left: one at every corner of a
 * cell, those on the edge moved in a little; none at the panel's four
 * corners, where its screws are.
 */
export function tableHoles(
  width: number,
  height: number,
  cellSize: number,
): Point[] {
  const inset = cellSize * EDGE_INSET;
  const along = (i: number, last: number) =>
    i * cellSize + (i === 0 ? inset : i === last ? -inset : 0);
  const holes: Point[] = [];
  for (let y = 0; y <= height; y++) {
    for (let x = 0; x <= width; x++) {
      const corner = (x === 0 || x === width) && (y === 0 || y === height);
      if (!corner) {
        holes.push({ x: along(x, width), y: along(y, height) });
      }
    }
  }
  return holes;
}

/**
 * Draws the optical table into `g` with its top left at g's origin: an
 * anodised plate with a brushed sheen, tapped holes instead of grid lines,
 * four corner screws and a bevelled edge. `tint` is the chapter's light
 * (see docs/DESIGN.md, Chapter light), or null for none.
 */
export function drawTable(
  g: Graphics,
  width: number,
  height: number,
  cellSize: number,
  tint: number | null,
): void {
  const w = width * cellSize;
  const h = height * cellSize;
  const plate = new FillGradient({
    type: "linear",
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
    colorStops: [
      { offset: 0, color: COLORS.tableLight },
      {
        offset: 0.45,
        color: mixColor(COLORS.tableLight, COLORS.tableDark, 0.65),
      },
      {
        offset: 0.55,
        color: mixColor(COLORS.tableLight, COLORS.tableDark, 0.35),
      },
      { offset: 1, color: COLORS.tableDark },
    ],
  });
  g.roundRect(0, 0, w, h, CORNER_RADIUS).fill(plate);
  if (tint !== null) {
    g.roundRect(0, 0, w, h, CORNER_RADIUS).fill({ color: tint, alpha: 0.05 });
  }
  for (let y = GRAIN_SPACING; y < h - 1; y += GRAIN_SPACING) {
    g.moveTo(2, y + 0.5).lineTo(w - 2, y + 0.5);
  }
  g.stroke({ width: 1, color: COLORS.tableGrain, alpha: 0.025 });

  const rim =
    tint === null
      ? COLORS.tableHoleRim
      : mixColor(COLORS.tableHoleRim, tint, 0.35);
  const radius = cellSize * HOLE_RADIUS;
  const holes = tableHoles(width, height, cellSize);
  for (const { x, y } of holes) {
    g.circle(x, y, radius);
  }
  g.fill(COLORS.tableHole);
  // Light from above catches the far (lower) wall of each hole.
  for (const { x, y } of holes) {
    const lip = arcPoints(x, y, radius, 0.1 * Math.PI, 0.9 * Math.PI, 6);
    g.moveTo(lip[0].x, lip[0].y);
    for (const p of lip.slice(1)) {
      g.lineTo(p.x, p.y);
    }
  }
  g.stroke({ width: 1, color: rim, alpha: 0.9 });

  const inset = cellSize * SCREW_INSET;
  const screw = cellSize * SCREW_RADIUS;
  for (const [x, y] of [
    [inset, inset],
    [w - inset, inset],
    [inset, h - inset],
    [w - inset, h - inset],
  ]) {
    g.circle(x, y, screw)
      .fill(COLORS.screw)
      .stroke({ width: 1, color: COLORS.screwEdge })
      .moveTo(x - screw * 0.6, y - screw * 0.6)
      .lineTo(x + screw * 0.6, y + screw * 0.6)
      .stroke({ width: 1.2, color: COLORS.screwSlot });
  }

  g.roundRect(0, 0, w, h, CORNER_RADIUS).stroke({
    width: 2,
    color:
      tint === null ? COLORS.tableEdge : mixColor(COLORS.tableEdge, tint, 0.3),
  });
  g.roundRect(2.5, 2.5, w - 5, h - 5, CORNER_RADIUS - 2).stroke({
    width: 1,
    color: COLORS.tableGrain,
    alpha: 0.08,
  });
}
