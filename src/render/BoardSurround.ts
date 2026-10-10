import { Container, Graphics, Sprite, Text } from "pixi.js";
import { backLightTexture } from "./glow";
import { COLORS, textStyle } from "./theme";

/** Labels at the board's four corners. */
export interface CornerLabels {
  topLeft: string;
  topRight: string;
  bottomLeft: string;
  bottomRight: string;
}

/** Corner ticks sit this far outside the panel; each arm is this long. */
const TICK_GAP = 8;
const TICK_ARM = 12;
const LABEL_GAP = 5;

/**
 * Quiet surroundings of the board, behind it: a faint light as if the
 * board were lit from behind, and technical corner ticks with small
 * labels. Nothing here glows. See docs/DESIGN.md, Art direction.
 */
export class BoardSurround extends Container {
  /**
   * `panel` is the board's panel in this container's coordinates.
   */
  constructor(
    panel: { x: number; y: number; width: number; height: number },
    labels: CornerLabels,
  ) {
    super();
    this.eventMode = "none";

    const light = new Sprite(backLightTexture());
    light.anchor.set(0.5);
    light.position.set(panel.x + panel.width / 2, panel.y + panel.height / 2);
    light.width = panel.width * 2;
    light.height = panel.height * 2.2;
    this.addChild(light);

    const left = panel.x - TICK_GAP;
    const right = panel.x + panel.width + TICK_GAP;
    const top = panel.y - TICK_GAP;
    const bottom = panel.y + panel.height + TICK_GAP;
    const ticks = new Graphics();
    for (const [x, y, sx, sy] of [
      [left, top, 1, 1],
      [right, top, -1, 1],
      [left, bottom, 1, -1],
      [right, bottom, -1, -1],
    ]) {
      ticks
        .moveTo(x + sx * TICK_ARM, y)
        .lineTo(x, y)
        .lineTo(x, y + sy * TICK_ARM);
    }
    ticks.stroke({ width: 1.5, color: COLORS.marking, cap: "square" });
    this.addChild(ticks);

    const label = (text: string, x: number, y: number, alignRight: boolean) => {
      const view = new Text({
        text,
        style: textStyle("value", { fontSize: 11, fill: COLORS.markingText }),
      });
      view.anchor.set(alignRight ? 1 : 0, 0.5);
      view.position.set(x, y);
      this.addChild(view);
    };
    const inset = TICK_ARM + LABEL_GAP;
    label(labels.topLeft, left + inset, top, false);
    label(labels.topRight, right - inset, top, true);
    label(labels.bottomLeft, left + inset, bottom, false);
    label(labels.bottomRight, right - inset, bottom, true);
  }
}
