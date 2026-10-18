import { FillGradient } from "pixi.js";
import type { Graphics } from "pixi.js";
import { COLORS } from "./theme";

// Emitters as lab hardware: finned laser heads on a steel rail along the
// optical table's edge. See docs/DESIGN.md, Shapes.

/** The rail sits this far left of the cell's centre (in cells). */
const HEAD_SHIFT = 0.04;
/**
 * The laser head, in cells from its cell's centre: the finned body from
 * BODY_LEFT to BODY_RIGHT, a collar, then a nozzle tapering to the right
 * to its aperture at NOZZLE_TIP, where the beam leaves (PelletAnimator
 * starts it there).
 */
const BODY_LEFT = -0.44;
const BODY_RIGHT = 0.1;
const BODY_HEIGHT = 0.46;
const COLLAR_RIGHT = 0.16;
const COLLAR_HEIGHT = 0.36;
export const NOZZLE_TIP = 0.32;
const NOZZLE_BASE_HEIGHT = 0.28;
const NOZZLE_TIP_HEIGHT = 0.16;
const RAIL_WIDTH = 0.2;

/**
 * An emitter, centred on g's origin in a cell `size` pixels wide: a laser
 * head pointing right, with cooling fins on its body, a collar and a
 * nozzle tapering to the aperture the beam leaves from, and a small status
 * light. The selected one is outlined in the beam colour, and its aperture
 * and light glow.
 */
export function drawEmitter(
  g: Graphics,
  size: number,
  selected: boolean,
): void {
  const steel = () =>
    new FillGradient({
      type: "linear",
      start: { x: 0, y: 0 },
      end: { x: 0, y: 1 },
      colorStops: [
        { offset: 0, color: COLORS.emitterLight },
        { offset: 1, color: COLORS.emitterDark },
      ],
    });
  const edge = {
    width: selected ? 1.6 : 1.2,
    color: selected ? COLORS.beam : COLORS.emitterEdge,
    join: "round",
  } as const;
  const left = size * BODY_LEFT;
  const bodyRight = size * BODY_RIGHT;
  const h = size * BODY_HEIGHT;
  const collarRight = size * COLLAR_RIGHT;
  const collar = size * COLLAR_HEIGHT;
  const tip = size * NOZZLE_TIP;
  const base = (size * NOZZLE_BASE_HEIGHT) / 2;
  const end = (size * NOZZLE_TIP_HEIGHT) / 2;
  const nozzle = [collarRight, -base, tip, -end, tip, end, collarRight, base];

  g.clear()
    .roundRect(left + 1, -h / 2 + 2, tip - left, h, 6)
    .fill({ color: COLORS.shadow, alpha: 0.35 })
    .poly(nozzle)
    .fill(steel())
    .stroke(edge)
    .rect(bodyRight, -collar / 2, collarRight - bodyRight, collar)
    .fill(COLORS.railLight)
    .stroke(edge)
    .roundRect(left, -h / 2, bodyRight - left, h, 6)
    .fill(steel())
    .stroke(edge);
  for (let i = 0; i < 4; i++) {
    const x = left + size * (0.09 + i * 0.065);
    g.moveTo(x, -h / 2 + 4).lineTo(x, h / 2 - 4);
  }
  g.stroke({ width: 2, color: COLORS.emitterFin });
  for (let i = 0; i < 4; i++) {
    const x = left + size * (0.09 + i * 0.065) + 1.4;
    g.moveTo(x, -h / 2 + 4).lineTo(x, h / 2 - 4);
  }
  g.stroke({ width: 1, color: COLORS.bevelLight, alpha: 0.15 });

  // The aperture: the nozzle's flat front face, facing right.
  const face = size * 0.035;
  g.roundRect(tip - face, -end + 1.5, face, end * 2 - 3, face / 2).fill(
    selected ? COLORS.beam : COLORS.emitterLens,
  );
  if (selected) {
    g.circle(tip, 0, size * 0.09)
      .fill({ color: COLORS.beam, alpha: 0.35 })
      .circle(tip, 0, size * 0.035)
      .fill(COLORS.beamCore);
  }
  g.circle(bodyRight - size * 0.1, -h / 2 + 5, 1.8).fill(
    selected ? COLORS.beam : COLORS.emitterLed,
  );
}

/**
 * The steel rail the emitters sit on, along the launcher column of a board
 * `rows` cells high (`size` pixels each), bolted down between the rows.
 */
export function drawRail(g: Graphics, size: number, rows: number): void {
  const x = size / 2 - size * HEAD_SHIFT;
  const w = size * RAIL_WIDTH;
  const top = 4;
  const bottom = rows * size - 4;
  g.roundRect(x - w / 2 + 1, top + 2, w, bottom - top, 4)
    .fill({ color: COLORS.shadow, alpha: 0.35 })
    .roundRect(x - w / 2, top, w, bottom - top, 4)
    .fill(COLORS.mountDark)
    .stroke({ width: 1.2, color: COLORS.tableEdge })
    .moveTo(x, top + 4)
    .lineTo(x, bottom - 4)
    .stroke({ width: 2, color: COLORS.screwSlot });
  for (let row = 1; row < rows; row++) {
    g.circle(x, row * size, size * 0.04)
      .fill(COLORS.mountScrew)
      .stroke({ width: 0.9, color: COLORS.mountScrewEdge });
  }
}
