import { Container, Graphics, Sprite, Text } from "pixi.js";
import { prefersReducedMotion } from "./ambient";
import { colorCycle } from "./color";
import { backLightTexture } from "./glow";
import { BONUS_COLORS, COLORS, textStyle } from "./theme";
import type { ChapterLight } from "./theme";

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
/** The back light at rest, and how long a flare of it takes to fade. */
const LIGHT_REST = 0.75;
const FLARE_MS = 1600;
/** The prism light turns once through the bonus colours in this time. */
const PRISM_CYCLE_MS = 24000;

/**
 * Quiet surroundings of the board, behind it: a faint light in the
 * chapter's colour as if the board were lit from behind, and technical
 * corner ticks with small labels. Nothing here glows. See docs/DESIGN.md,
 * Art direction.
 */
export class BoardSurround extends Container {
  private readonly light: Sprite;
  private readonly chapterLight: ChapterLight;
  private timeMs = 0;
  /** Time into a flare of the light, while it lasts; see flare(). */
  private flareMs: number | null = null;

  /**
   * `panel` is the board's panel in this container's coordinates, and
   * `chapterLight` the colour of the light behind it.
   */
  constructor(
    panel: { x: number; y: number; width: number; height: number },
    labels: CornerLabels,
    chapterLight: ChapterLight,
  ) {
    super();
    this.eventMode = "none";
    this.chapterLight = chapterLight;

    const light = new Sprite(backLightTexture());
    this.light = light;
    light.alpha = LIGHT_REST;
    light.tint = chapterLight === "prism" ? BONUS_COLORS[0] : chapterLight;
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

  /** The light brightens for a moment and fades back (reaching the goal). */
  flare(): void {
    if (!prefersReducedMotion()) {
      this.flareMs = 0;
    }
  }

  /** Fades a flare, and turns the prism light through its colours. */
  update(deltaMs: number): void {
    if (prefersReducedMotion()) {
      return;
    }
    this.timeMs += deltaMs;
    if (this.chapterLight === "prism") {
      this.light.tint = colorCycle(BONUS_COLORS, this.timeMs, PRISM_CYCLE_MS);
    }
    if (this.flareMs !== null) {
      this.flareMs += deltaMs;
      const t = this.flareMs / FLARE_MS;
      if (t >= 1) {
        this.flareMs = null;
        this.light.alpha = LIGHT_REST;
      } else {
        // Up quickly, then slowly back down.
        const up = Math.min(1, t * 6);
        this.light.alpha = LIGHT_REST + (1 - LIGHT_REST) * up * (1 - t);
      }
    }
  }
}
