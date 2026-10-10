import { Container, Text } from "pixi.js";
import type { TextStyleOptions } from "pixi.js";
import type { AudioChannel, GameAudio } from "../audio/GameAudio";

export const UI_COLORS = {
  text: 0xe8ecf4,
  dim: 0x7c859b,
  highlight: 0xfbbf24,
  success: 0x4ade80,
};

export const TEXT_STYLE: TextStyleOptions = {
  fill: UI_COLORS.text,
  fontSize: 20,
  fontFamily: "sans-serif",
};

/** Makes a Text clickable, with a pointer cursor. */
export function makeClickable<T extends Text>(
  text: T,
  onTap: () => void,
  onHover?: () => void,
): T {
  text.eventMode = "static";
  text.cursor = "pointer";
  text.on("pointertap", onTap);
  if (onHover) {
    text.on("pointerover", onHover);
  }
  return text;
}

const AUDIO_LABELS: Record<AudioChannel, { on: string; off: string }> = {
  music: { on: "♪ Music on (M)", off: "♪ Music off (M)" },
  effects: { on: "🔊 Sounds on (F)", off: "🔇 Sounds off (F)" },
};
const AUDIO_TOGGLE_GAP = 24;

/**
 * Clickable on/off labels for music and sound effects, side by side. With
 * align "right" the group ends at x = 0; with "center" it is centred on it.
 */
export class AudioControls extends Container {
  private readonly audio: GameAudio;
  private readonly align: "right" | "center";
  private readonly labels: Record<AudioChannel, Text>;

  constructor(audio: GameAudio, align: "right" | "center") {
    super();
    this.audio = audio;
    this.align = align;
    const label = (channel: AudioChannel) =>
      makeClickable(new Text({ style: TEXT_STYLE }), () =>
        this.toggle(channel),
      );
    this.labels = { music: label("music"), effects: label("effects") };
    this.addChild(this.labels.music, this.labels.effects);
    this.refresh();
  }

  toggle(channel: AudioChannel): void {
    this.audio.toggle(channel);
    this.refresh();
  }

  /** Updates the labels and lines them up again, as their widths change. */
  private refresh(): void {
    const { music, effects } = this.labels;
    for (const channel of ["music", "effects"] as const) {
      const text = AUDIO_LABELS[channel];
      this.labels[channel].text = this.audio.isOn(channel) ? text.on : text.off;
    }
    const width = music.width + AUDIO_TOGGLE_GAP + effects.width;
    music.x = this.align === "right" ? -width : -width / 2;
    effects.x = music.x + music.width + AUDIO_TOGGLE_GAP;
  }
}
