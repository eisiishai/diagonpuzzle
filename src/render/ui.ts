import { Container, Graphics, Rectangle, Text, Ticker } from "pixi.js";
import type { AudioChannel, GameAudio } from "../audio/GameAudio";
import { prefersReducedMotion } from "./ambient";
import { arcPoints } from "./polyline";
import { COLORS, textStyle } from "./theme";

/** Primary: the main action, filled. Secondary: everything else, outlined. */
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
}

const PADDING_X = 16;
const MIN_HEIGHT = 44;
const ICON_SIZE = 16;
const ICON_GAP = 8;
/** Width of a row's icon column, from the button's left edge. */
const ROW_ICON_COLUMN = 44;
/** How fast the hover glow eases in and out: its fraction per millisecond. */
const GLOW_SPEED = 1 / 120;
/** Pressing squeezes the button to this scale. */
const PRESS_SCALE = 0.97;

/** Played when any button is tapped; see setButtonTapSound(). */
let tapSound: (() => void) | undefined;

/** Sets the sound every button makes when tapped. */
export function setButtonTapSound(play: () => void): void {
  tapSound = play;
}

/**
 * A rounded, outlined button. `selected` shows keyboard focus (and pointer
 * hover) with a soft glow that eases in; pressing squeezes it slightly. A
 * disabled button is dimmed and ignores the pointer.
 */
export class Button extends Container {
  private readonly options: ButtonOptions;
  /** Everything drawn, scaled around the centre when pressed. */
  private readonly body = new Container();
  private readonly glow = new Graphics();
  private readonly background = new Graphics();
  private readonly icon = new Graphics();
  private readonly labelText: Text;
  private readonly detailText?: Text;
  private variant: ButtonVariant;
  private _selected = false;
  private _disabled = false;
  private hovered = false;
  private pressed = false;
  /** The glow's strength, easing towards 1 while active and 0 otherwise. */
  private glowAmount = 0;
  private size = { width: 0, height: 0 };
  private readonly tick = (ticker: Ticker) => this.updateGlow(ticker.deltaMS);

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
    this.body.addChild(this.glow, this.background, this.icon, this.labelText);
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
      if (!this._disabled) {
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
    this.drawGlow();
  }

  /** A soft halo around the button, in its accent colour. */
  private drawGlow(): void {
    const g = this.glow.clear();
    const amount = this.glowAmount;
    if (amount <= 0) {
      return;
    }
    const { width, height } = this.size;
    const color = this.variant === "primary" ? COLORS.success : COLORS.beam;
    for (const [spread, alpha] of [
      [2, 0.22],
      [5, 0.12],
      [9, 0.06],
    ]) {
      g.roundRect(
        -spread,
        -spread,
        width + 2 * spread,
        height + 2 * spread,
        6 + spread,
      ).stroke({ width: 3, color, alpha: alpha * amount });
    }
  }

  private redraw(): void {
    const { width, height, icon, large, row, tile } = this.options;
    const { variant, active } = this;
    const primary = variant === "primary";

    const textColor = this._disabled
      ? COLORS.buttonBorder
      : primary
        ? COLORS.background
        : active
          ? COLORS.text
          : COLORS.dim;
    this.labelText.style.fill = textColor;
    this.labelText.style.fontWeight = primary ? "700" : "500";

    const iconWidth = icon ? ICON_SIZE + ICON_GAP : 0;
    const contentWidth = iconWidth + this.labelText.width;
    const w = width ?? contentWidth + 2 * PADDING_X;
    const h =
      height ?? Math.max(MIN_HEIGHT, this.labelText.height + (large ? 24 : 16));
    this.size = { width: w, height: h };

    const g = this.background.clear().roundRect(0, 0, w, h, 6);
    if (primary) {
      g.fill(active ? COLORS.text : COLORS.success);
    } else {
      g.fill(active ? COLORS.emitterSelected : COLORS.panel).stroke({
        width: active ? 2 : 1.5,
        color: active ? COLORS.beam : COLORS.buttonBorder,
      });
    }

    this.icon.clear();
    if (tile) {
      this.labelText.position.set(
        Math.round((w - this.labelText.width) / 2),
        Math.round(h * 0.4 - this.labelText.height / 2),
      );
      tile.icon(this.icon, textColor);
      this.icon.alpha = this._disabled ? 0.6 : 1;
      this.icon.scale.set(0.8);
      this.icon.position.set(w / 2, Math.round(h * 0.72));
    } else if (row) {
      this.labelText.position.set(
        ROW_ICON_COLUMN,
        Math.round((h - this.labelText.height) / 2),
      );
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
      const left = (w - contentWidth) / 2;
      this.labelText.position.set(
        left + iconWidth,
        Math.round((h - this.labelText.height) / 2),
      );
      if (icon) {
        icon(this.icon, textColor);
        this.icon.position.set(left + ICON_SIZE / 2, h / 2);
      }
    }

    // Pressing scales around the centre; the glow and squeeze never change
    // the button's size as layout sees it.
    this.body.pivot.set(w / 2, h / 2);
    this.body.position.set(w / 2, h / 2);
    this.hitArea = new Rectangle(0, 0, w, h);
    this.boundsArea = new Rectangle(0, 0, w, h);
    this.drawGlow();
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
