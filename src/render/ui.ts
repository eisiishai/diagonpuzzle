import { Container, Graphics, Rectangle, Text } from "pixi.js";
import type { AudioChannel, GameAudio } from "../audio/GameAudio";
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
  icon?: IconDrawer;
  /** Text after the label in its own colour, such as a golden star. */
  badge?: { text: string; color: number };
  onTap: () => void;
  onHover?: () => void;
}

const PADDING_X = 16;
const MIN_HEIGHT = 44;
const ICON_SIZE = 16;
const ICON_GAP = 8;
const BADGE_GAP = 8;

/**
 * A rounded, outlined button. `selected` shows keyboard focus (and pointer
 * hover); a disabled button is dimmed and ignores the pointer.
 */
export class Button extends Container {
  private readonly options: ButtonOptions;
  private readonly background = new Graphics();
  private readonly icon = new Graphics();
  private readonly labelText: Text;
  private readonly badgeText?: Text;
  private variant: ButtonVariant;
  private _selected = false;
  private _disabled = false;
  private hovered = false;

  constructor(options: ButtonOptions) {
    super();
    this.options = options;
    this.variant = options.variant ?? "secondary";
    this.labelText = new Text({
      text: options.label,
      style: textStyle("label", options.large ? { fontSize: 24 } : {}),
    });
    this.addChild(this.background, this.icon, this.labelText);
    if (options.badge) {
      this.badgeText = new Text({
        text: options.badge.text,
        style: textStyle("label", {
          ...(options.large ? { fontSize: 24 } : {}),
          fill: options.badge.color,
        }),
      });
      this.addChild(this.badgeText);
    }

    this.eventMode = "static";
    this.cursor = "pointer";
    this.on("pointertap", () => {
      if (!this._disabled) {
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
      this.redraw();
    });
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
    this.labelText.text = label;
    this.redraw();
  }

  private redraw(): void {
    const { width, icon, large } = this.options;
    const { variant } = this;
    const active = !this._disabled && (this._selected || this.hovered);
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
    const badgeWidth = this.badgeText ? BADGE_GAP + this.badgeText.width : 0;
    const contentWidth = iconWidth + this.labelText.width + badgeWidth;
    const w = width ?? contentWidth + 2 * PADDING_X;
    const h = Math.max(MIN_HEIGHT, this.labelText.height + (large ? 24 : 16));

    const g = this.background.clear().roundRect(0, 0, w, h, 6);
    if (primary) {
      g.fill(active ? COLORS.text : COLORS.success);
    } else {
      g.fill(active ? COLORS.emitterSelected : COLORS.panel).stroke({
        width: active ? 2 : 1.5,
        color: active ? COLORS.beam : COLORS.buttonBorder,
      });
    }

    const left = (w - contentWidth) / 2;
    this.labelText.position.set(
      left + iconWidth,
      Math.round((h - this.labelText.height) / 2),
    );
    if (this.badgeText) {
      this.badgeText.alpha = this._disabled ? 0.4 : 1;
      this.badgeText.position.set(
        this.labelText.x + this.labelText.width + BADGE_GAP,
        Math.round((h - this.badgeText.height) / 2),
      );
    }
    this.icon.clear();
    if (icon) {
      icon(this.icon, textColor);
      this.icon.position.set(left + ICON_SIZE / 2, h / 2);
    }
    this.hitArea = new Rectangle(0, 0, w, h);
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
