import {
  Container,
  FillGradient,
  Graphics,
  Rectangle,
  Text,
  Ticker,
} from "pixi.js";
import type { AudioChannel, GameAudio } from "../audio/GameAudio";
import { prefersReducedMotion } from "./ambient";
import { mixColor } from "./color";
import { easeOutCubic } from "./easing";
import { arcPoints } from "./polyline";
import { COLORS, textStyle } from "./theme";

/** Primary: the main action, lit green glass. Secondary: everything else, keys. */
export type ButtonVariant = "primary" | "secondary";

/** Draws a small icon centred on (0, 0) in `color`. */
export type IconDrawer = (g: Graphics, color: number) => void;

export interface ButtonOptions {
  label: string;
  variant?: ButtonVariant;
  /** Larger text, for the title screen's main action. */
  large?: boolean;
  /** Fixed width; otherwise the button fits its label. */
  width?: number;
  /** An icon before the label, in the label's colour. */
  icon?: IconDrawer;
  /**
   * A list row instead of a centred label: `leading` draws an icon in its
   * own colours in a column on the left (given the label's colour, for
   * icons that follow it), the label is left-aligned after it, and
   * `detail` is right-aligned in the number font.
   */
  row?: { leading: IconDrawer; detail: string };
  /**
   * A tile instead (give `width` and `height`): `label` (a level number)
   * centred in the number font, and `icon` below it in its own colours
   * (given the label's colour). `name` names the button for the test hook
   * instead of the label.
   */
  tile?: { icon: IconDrawer; name: string };
  /** Fixed height; otherwise it fits the label. */
  height?: number;
  onTap: () => void;
  onHover?: () => void;
  /**
   * Asked before a tap counts: a button in a scrolling list doesn't take
   * the tap that ends a drag of the list.
   */
  allowTap?: () => boolean;
}

const PADDING_X = 16;
const MIN_HEIGHT = 44;
const ICON_SIZE = 16;
const ICON_GAP = 8;
/** Width of a row's icon column, from the button's left edge. */
const ROW_ICON_COLUMN = 44;
/** How fast the highlight eases in and out: its fraction per millisecond. */
const GLOW_SPEED = 1 / 120;
/** Pressing squeezes the button to this scale. */
const PRESS_SCALE = 0.97;
/** A key's status light: its centre from the left edge, and the room it takes. */
const LED_X = 15;
const LED_ROOM = 14;
/** The highlight beam: its inset from the sides, and up from the bottom. */
const BEAM_INSET = 14;
const BEAM_RAISE = 7;
/** Next level lighting up: the beam's run, the fade and the pulse, in ms. */
const REVEAL_TRAVEL_MS = 380;
const REVEAL_FADE_MS = 220;
const REVEAL_PULSE_MS = 650;

/** Played when any button is tapped; see setButtonTapSound(). */
let tapSound: (() => void) | undefined;

/** Sets the sound every button makes when tapped. */
export function setButtonTapSound(play: () => void): void {
  tapSound = play;
}

/**
 * A button as lab hardware (see docs/DESIGN.md, Buttons): an instrument key,
 * a steel plate with a recessed face and a status light, or for the main
 * action green glass lit from inside. `selected` shows keyboard focus (and
 * pointer hover): a beam fires under the label and the status light comes
 * on, easing in; pressing squeezes it slightly. A disabled button is
 * dimmed and ignores the pointer.
 */
export class Button extends Container {
  private readonly options: ButtonOptions;
  /** Everything drawn, scaled around the centre when pressed. */
  private readonly body = new Container();
  /** The main action's halo, under the button. */
  private readonly glow = new Graphics();
  /** The beam running under the button and the pulse, as it lights up. */
  private readonly revealLayer = new Graphics();
  /** The key it was, fading out as it lights up; see lightUp(). */
  private readonly fading = new Graphics();
  private readonly background = new Graphics();
  /** The highlight beam and the status light, over the plate. */
  private readonly highlight = new Graphics();
  private readonly icon = new Graphics();
  private readonly labelText: Text;
  private readonly detailText?: Text;
  private variant: ButtonVariant;
  private _selected = false;
  private _disabled = false;
  private hovered = false;
  private pressed = false;
  /** The highlight's strength, easing towards 1 while active and 0 otherwise. */
  private glowAmount = 0;
  /** Time since lightUp() while the button lights up; null otherwise. */
  private revealMs: number | null = null;
  private size = { width: 0, height: 0 };
  /** Where the label sits, before the highlight lifts it. */
  private labelY = 0;
  private readonly tick = (ticker: Ticker) => {
    this.updateReveal(ticker.deltaMS);
    this.updateGlow(ticker.deltaMS);
  };

  constructor(options: ButtonOptions) {
    super();
    this.options = options;
    // PixiJS's own name for a container; the test hook finds buttons by it.
    this.label = options.tile?.name ?? options.label;
    this.variant = options.variant ?? "secondary";
    this.labelText = new Text({
      text: options.label,
      style: options.tile
        ? textStyle("value", { fontSize: 20 })
        : textStyle("label", options.large ? { fontSize: 24 } : {}),
    });
    this.body.addChild(
      this.revealLayer,
      this.glow,
      this.fading,
      this.background,
      this.highlight,
      this.icon,
      this.labelText,
    );
    if (options.row) {
      this.detailText = new Text({
        text: options.row.detail,
        style: textStyle("value"),
      });
      this.body.addChild(this.detailText);
    }
    this.addChild(this.body);

    this.eventMode = "static";
    this.cursor = "pointer";
    this.on("pointertap", () => {
      if (!this._disabled && options.allowTap?.() !== false) {
        tapSound?.();
        options.onTap();
      }
    });
    this.on("pointerover", () => {
      this.hovered = true;
      this.redraw();
      if (!this._disabled) {
        options.onHover?.();
      }
    });
    this.on("pointerout", () => {
      this.hovered = false;
      this.setPressed(false);
      this.redraw();
    });
    this.on("pointerdown", () => this.setPressed(!this._disabled));
    this.on("pointerup", () => this.setPressed(false));
    this.on("pointerupoutside", () => this.setPressed(false));
    Ticker.shared.add(this.tick);
    this.on("destroyed", () => Ticker.shared.remove(this.tick));
    this.redraw();
  }

  get selected(): boolean {
    return this._selected;
  }

  set selected(value: boolean) {
    this._selected = value;
    this.redraw();
  }

  get disabled(): boolean {
    return this._disabled;
  }

  set disabled(value: boolean) {
    this._disabled = value;
    this.cursor = value ? "default" : "pointer";
    this.redraw();
  }

  setVariant(variant: ButtonVariant): void {
    this.variant = variant;
    this.revealMs = null;
    this.redraw();
  }

  /**
   * Becomes the main action with a moment of its own: a green beam runs
   * under it from the left, and it lights as the beam arrives, with one
   * soft pulse. At once when the player prefers reduced motion.
   */
  lightUp(): void {
    this.variant = "primary";
    this.revealMs = prefersReducedMotion() ? null : 0;
    this.redraw();
  }

  setLabel(label: string): void {
    this.label = label;
    this.labelText.text = label;
    this.redraw();
  }

  private get active(): boolean {
    return !this._disabled && (this._selected || this.hovered);
  }

  private get primary(): boolean {
    return this.variant === "primary";
  }

  /** How far the button has lit up as the main action, 0 to 1. */
  private get lit(): number {
    if (this.revealMs === null) {
      return 1;
    }
    return Math.min(
      1,
      Math.max(0, (this.revealMs - REVEAL_TRAVEL_MS) / REVEAL_FADE_MS),
    );
  }

  private setPressed(pressed: boolean): void {
    this.pressed = pressed && !prefersReducedMotion();
    this.body.scale.set(this.pressed ? PRESS_SCALE : 1);
  }

  private updateGlow(deltaMs: number): void {
    const target = this.active ? 1 : 0;
    if (this.glowAmount === target) {
      return;
    }
    const step = prefersReducedMotion() ? 1 : deltaMs * GLOW_SPEED;
    this.glowAmount =
      target > this.glowAmount
        ? Math.min(target, this.glowAmount + step)
        : Math.max(target, this.glowAmount - step);
    this.drawHighlight();
  }

  private updateReveal(deltaMs: number): void {
    if (this.revealMs === null) {
      return;
    }
    const before = this.lit;
    this.revealMs += deltaMs;
    const end = REVEAL_TRAVEL_MS + REVEAL_FADE_MS + REVEAL_PULSE_MS;
    if (this.revealMs >= end) {
      this.revealMs = null;
      this.revealLayer.clear();
      this.redraw();
      return;
    }
    if (before < 0.5 !== this.lit < 0.5) {
      this.redraw();
    }
    this.fading.alpha = 1 - this.lit;
    this.background.alpha = this.lit;
    this.drawReveal();
  }

  /**
   * The beam running under the button from the left as it lights up, and
   * the pulse spreading from it once lit.
   */
  private drawReveal(): void {
    const g = this.revealLayer.clear();
    const ms = this.revealMs;
    if (ms === null) {
      return;
    }
    const { width, height } = this.size;
    if (ms < REVEAL_TRAVEL_MS + REVEAL_FADE_MS) {
      const along = easeOutCubic(Math.min(1, ms / REVEAL_TRAVEL_MS));
      const fade =
        ms < REVEAL_TRAVEL_MS
          ? 1
          : 1 - (ms - REVEAL_TRAVEL_MS) / REVEAL_FADE_MS;
      const y = height + 4;
      const x = Math.max(1, width * along);
      g.moveTo(0, y)
        .lineTo(x, y)
        .stroke({
          width: 8,
          color: COLORS.success,
          alpha: 0.15 * fade,
          cap: "round",
        })
        .moveTo(0, y)
        .lineTo(x, y)
        .stroke({
          width: 4,
          color: COLORS.success,
          alpha: 0.6 * fade,
          cap: "round",
        })
        .moveTo(0, y)
        .lineTo(x, y)
        .stroke({ width: 1.2, color: COLORS.beamCore, alpha: fade })
        .circle(x, y, 3)
        .fill({ color: COLORS.beamCore, alpha: fade });
    }
    const pulse = (ms - REVEAL_TRAVEL_MS - 120) / REVEAL_PULSE_MS;
    if (pulse > 0 && pulse < 1) {
      const spread = 2 + 14 * easeOutCubic(pulse);
      g.roundRect(
        -spread,
        -spread,
        width + 2 * spread,
        height + 2 * spread,
        6 + spread,
      ).stroke({ width: 2, color: COLORS.success, alpha: 0.55 * (1 - pulse) });
    }
  }

  /**
   * The highlight at its eased strength: a beam firing under the label
   * from the left (along a tile's bottom edge), the status light coming
   * on, the label lifting a little, and the main action's halo.
   */
  private drawHighlight(): void {
    const amount = this.glowAmount;
    const g = this.highlight.clear();
    const halo = this.glow.clear();
    this.labelText.y = this.labelY - (this.options.tile ? 0 : 2 * amount);
    const { width, height } = this.size;
    const accent = this.primary ? COLORS.success : COLORS.beam;
    if (this.hasLight) {
      g.circle(LED_X, height / 2, 2.6).fill(
        mixColor(COLORS.emitterLed, accent, amount),
      );
      if (amount > 0) {
        g.circle(LED_X, height / 2, 6).fill({
          color: accent,
          alpha: 0.25 * amount,
        });
      }
    }
    if (amount <= 0) {
      return;
    }
    if (this.primary) {
      for (const [spread, alpha] of [
        [2, 0.3],
        [5, 0.16],
        [9, 0.08],
      ]) {
        halo
          .roundRect(
            -spread,
            -spread,
            width + 2 * spread,
            height + 2 * spread,
            6 + spread,
          )
          .stroke({ width: 3, color: accent, alpha: alpha * amount });
      }
    }
    const tile = Boolean(this.options.tile);
    const inset = tile ? 6 : BEAM_INSET;
    const y = height - (tile ? 4 : BEAM_RAISE);
    const length = (width - 2 * inset) * easeOutCubic(amount);
    if (length < 0.5) {
      return;
    }
    const line = () => g.moveTo(inset, y).lineTo(inset + length, y);
    line().stroke({ width: 9, color: accent, alpha: 0.12, cap: "round" });
    line().stroke({ width: 4, color: accent, alpha: 0.6, cap: "round" });
    line().stroke({ width: 1.2, color: COLORS.beamCore, cap: "round" });
  }

  /** Keys (not tiles, rows or the main action) carry a status light. */
  private get hasLight(): boolean {
    const { row, tile } = this.options;
    return !this.primary && !row && !tile;
  }

  /** The key: a steel plate with a recessed face, `w` × `h`, into `g`. */
  private drawKey(g: Graphics, w: number, h: number, recessed: boolean): void {
    const steel = new FillGradient({
      type: "linear",
      start: { x: 0, y: 0 },
      end: { x: 0, y: 1 },
      colorStops: [
        { offset: 0, color: COLORS.keyLight },
        { offset: 1, color: COLORS.keyDark },
      ],
    });
    g.roundRect(1, 2, w, h, 6)
      .fill({ color: COLORS.shadow, alpha: 0.35 })
      .roundRect(0, 0, w, h, 6)
      .fill(steel)
      .stroke({ width: 1.2, color: COLORS.wallEdge })
      .moveTo(6, 1.5)
      .lineTo(w - 6, 1.5)
      .stroke({ width: 1.5, color: COLORS.bevelLight, alpha: 0.28 })
      .moveTo(6, h - 1.5)
      .lineTo(w - 6, h - 1.5)
      .stroke({ width: 1.5, color: COLORS.shadow, alpha: 0.35 });
    if (recessed) {
      g.roundRect(4, 4, w - 8, h - 8, 4)
        .fill({ color: COLORS.keyFace, alpha: 0.35 })
        .stroke({ width: 1, color: COLORS.bevelLight, alpha: 0.08 });
    }
  }

  /** The main action: green glass lit from inside, `w` × `h`, into `g`. */
  private drawGlass(g: Graphics, w: number, h: number, bright: boolean): void {
    const glass = new FillGradient({
      type: "linear",
      start: { x: 0, y: 0 },
      end: { x: 0, y: 1 },
      colorStops: [
        {
          offset: 0,
          color: bright
            ? mixColor(COLORS.glassTop, 0xffffff, 0.35)
            : COLORS.glassTop,
        },
        {
          offset: 1,
          color: bright
            ? mixColor(COLORS.glassBottom, COLORS.success, 0.5)
            : COLORS.glassBottom,
        },
      ],
    });
    g.roundRect(1, 2, w, h, 6)
      .fill({ color: COLORS.shadow, alpha: 0.35 })
      .roundRect(0, 0, w, h, 6)
      .fill(glass)
      .stroke({ width: 1.2, color: COLORS.glassEdge })
      .moveTo(6, 1.6)
      .lineTo(w - 6, 1.6)
      .stroke({ width: 1.4, color: 0xffffff, alpha: 0.6 });
  }

  private redraw(): void {
    const { width, height, icon, large, row, tile } = this.options;
    const { active } = this;
    // While lighting up, the label keeps the key's colours until half lit.
    const primary = this.primary && this.lit >= 0.5;

    const textColor = this._disabled
      ? COLORS.buttonBorder
      : primary
        ? COLORS.glassText
        : active
          ? COLORS.text
          : COLORS.dim;
    this.labelText.style.fill = textColor;
    this.labelText.style.fontWeight = primary ? "700" : "500";

    // Every key has room for its status light, so a key and the main action
    // with the same label are as wide; only a key's label moves over.
    const lightRoom = !row && !tile ? LED_ROOM : 0;
    const iconWidth = icon ? ICON_SIZE + ICON_GAP : 0;
    const contentWidth = iconWidth + this.labelText.width;
    const w = width ?? contentWidth + 2 * PADDING_X + lightRoom;
    const h =
      height ?? Math.max(MIN_HEIGHT, this.labelText.height + (large ? 24 : 16));
    this.size = { width: w, height: h };

    const g = this.background.clear();
    if (this.primary) {
      this.drawGlass(g, w, h, active);
    } else {
      this.drawKey(g, w, h, !tile);
    }
    const fading = this.fading.clear();
    if (this.revealMs !== null) {
      this.drawKey(fading, w, h, true);
    }
    this.fading.alpha = 1 - this.lit;
    this.background.alpha = this.revealMs === null ? 1 : this.lit;
    this.background.alpha *= this._disabled ? 0.6 : 1;

    this.icon.clear();
    if (tile) {
      this.labelY = Math.round(h * 0.4 - this.labelText.height / 2);
      this.labelText.position.set(
        Math.round((w - this.labelText.width) / 2),
        this.labelY,
      );
      tile.icon(this.icon, textColor);
      this.icon.alpha = this._disabled ? 0.6 : 1;
      this.icon.scale.set(0.8);
      this.icon.position.set(w / 2, Math.round(h * 0.72));
    } else if (row) {
      this.labelY = Math.round((h - this.labelText.height) / 2);
      this.labelText.position.set(ROW_ICON_COLUMN, this.labelY);
      row.leading(this.icon, textColor);
      this.icon.alpha = this._disabled ? 0.6 : 1;
      this.icon.position.set(ROW_ICON_COLUMN / 2, h / 2);
      const detail = this.detailText!;
      detail.style.fill = this._disabled ? COLORS.buttonBorder : COLORS.dim;
      detail.position.set(
        w - PADDING_X - detail.width,
        Math.round((h - detail.height) / 2),
      );
    } else {
      const left = (w - contentWidth + (primary ? 0 : lightRoom)) / 2;
      this.labelY = Math.round((h - this.labelText.height) / 2);
      this.labelText.position.set(left + iconWidth, this.labelY);
      if (icon) {
        icon(this.icon, textColor);
        this.icon.position.set(left + ICON_SIZE / 2, h / 2);
      }
    }

    // Pressing scales around the centre; the highlight and squeeze never
    // change the button's size as layout sees it.
    this.body.pivot.set(w / 2, h / 2);
    this.body.position.set(w / 2, h / 2);
    this.hitArea = new Rectangle(0, 0, w, h);
    this.boundsArea = new Rectangle(0, 0, w, h);
    this.drawHighlight();
    this.drawReveal();
  }
}

/** A beamed pair of eighth notes. */
export const musicIcon: IconDrawer = (g, color) => {
  g.moveTo(-3, 5)
    .lineTo(-3, -6)
    .lineTo(7, -8)
    .lineTo(7, 3)
    .stroke({ width: 2, color, cap: "round", join: "round" })
    .circle(-5, 5, 2.6)
    .circle(5, 3, 2.6)
    .fill(color);
};

/** A speaker, with sound waves when on and a cross when off. */
export function speakerIcon(on: boolean): IconDrawer {
  return (g, color) => {
    g.poly([-8, -3, -4, -3, 1, -7, 1, 7, -4, 3, -8, 3]).fill(color);
    if (on) {
      // Waves as short straight pieces, not Graphics.arc(): see polyline.ts.
      for (const radius of [5, 9]) {
        const [first, ...rest] = arcPoints(1, 0, radius, -0.8, 0.8, 6);
        g.moveTo(first.x, first.y);
        for (const p of rest) {
          g.lineTo(p.x, p.y);
        }
        g.stroke({ width: 1.8, color, cap: "round", join: "round" });
      }
    } else {
      g.moveTo(4, -4)
        .lineTo(10, 4)
        .moveTo(10, -4)
        .lineTo(4, 4)
        .stroke({ width: 1.8, color, cap: "round" });
    }
  };
}

const AUDIO_GAP = 10;

/**
 * On/off buttons for music and sound effects, side by side. With align
 * "right" the group ends at x = 0; with "center" it is centred on it.
 */
export class AudioControls extends Container {
  private readonly audio: GameAudio;
  private readonly align: "right" | "center";

  constructor(audio: GameAudio, align: "right" | "center") {
    super();
    this.audio = audio;
    this.align = align;
    this.createButtons();
  }

  toggle(channel: AudioChannel): void {
    this.audio.toggle(channel);
    this.createButtons();
  }

  // Rebuilt on each change, since the speaker icon differs between on and off.
  private createButtons(): void {
    this.removeChildren().forEach((child) => child.destroy({ children: true }));
    const musicOn = this.audio.isOn("music");
    const effectsOn = this.audio.isOn("effects");
    const music = new Button({
      label: `MUSIC ${musicOn ? "ON" : "OFF"} · M`,
      icon: musicIcon,
      onTap: () => this.toggle("music"),
    });
    const effects = new Button({
      label: `SOUNDS ${effectsOn ? "ON" : "OFF"} · F`,
      icon: speakerIcon(effectsOn),
      onTap: () => this.toggle("effects"),
    });
    const width = music.width + AUDIO_GAP + effects.width;
    music.x = this.align === "right" ? -width : -width / 2;
    effects.x = music.x + music.width + AUDIO_GAP;
    this.addChild(music, effects);
  }
}

/** Inset of a wait bar from its button's sides and bottom edge. */
const WAIT_BAR_INSET = 8;

/**
 * A thin, faint bar along the bottom of a button, filling from left to
 * right while the player waits for what the button will offer (the
 * second hint, a skip back). Subtle on purpose: nothing else changes
 * while the player thinks. Redrawn only as it grows by a whole pixel.
 */
export class WaitBar extends Graphics {
  private readonly button: Button;
  private readonly color: number;
  private _length = 0;

  constructor(button: Button, color: number) {
    super();
    this.button = button;
    this.color = color;
    button.addChild(this);
  }

  /** The bar's length in pixels; 0 while hidden. */
  get length(): number {
    return this._length;
  }

  /** Shows `fraction` of the wait done, 0 to 1; 0 hides the bar. */
  setProgress(fraction: number): void {
    const { width, height } = this.button;
    const full = width - 2 * WAIT_BAR_INSET;
    const length = Math.round(full * Math.min(1, Math.max(0, fraction)));
    if (length === this._length) {
      return;
    }
    this._length = length;
    this.clear();
    if (length > 0) {
      this.rect(WAIT_BAR_INSET, height - WAIT_BAR_INSET, length, 2).fill({
        color: this.color,
        alpha: 0.4,
      });
    }
  }
}
