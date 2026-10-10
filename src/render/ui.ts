import { Text } from "pixi.js";
import type { TextStyleOptions } from "pixi.js";
import type { GameAudio } from "../audio/GameAudio";

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

/** Clickable sound on/off label, kept in sync with the audio's muted state. */
export class SoundToggle extends Text {
  private readonly audio: GameAudio;

  constructor(audio: GameAudio) {
    super({ style: TEXT_STYLE });
    this.audio = audio;
    makeClickable(this, () => this.toggle());
    this.refresh();
  }

  toggle(): void {
    this.audio.toggleMuted();
    this.refresh();
  }

  private refresh(): void {
    this.text = this.audio.muted ? "🔇 Sound off (M)" : "🔊 Sound on (M)";
  }
}
