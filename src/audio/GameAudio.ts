import { readStorage, writeStorage } from "../save/storage";

export type SoundEffect =
  "fire" | "wall" | "exit" | "loop" | "goal" | "par" | "allPar";

/** Music and sound effects are switched on and off separately. */
export type AudioChannel = "music" | "effects";

const MASTER_VOLUME = 0.8;
const CHANNEL_VOLUMES: Record<AudioChannel, number> = {
  music: 0.1,
  effects: 0.35,
};
const CHANNEL_STORAGE_KEYS: Record<AudioChannel, string> = {
  music: "musicOn",
  effects: "effectsOn",
};
/** Before music and effects were separate, one setting muted both. */
const LEGACY_MUTED_STORAGE_KEY = "muted";

// Placeholder music: an arpeggiated Am–F–C–G loop in eighth notes.
const MUSIC_BPM = 96;
const MUSIC_STEP_SECONDS = 60 / MUSIC_BPM / 2;
const MUSIC_CHORDS = [
  [57, 60, 64],
  [53, 57, 60],
  [48, 52, 55],
  [55, 59, 62],
];
const ARPEGGIO = [0, 1, 2, 1, 0, 1, 2, 1];
const SCHEDULE_AHEAD_SECONDS = 0.2;

function midiToFrequency(note: number): number {
  return 440 * 2 ** ((note - 69) / 12);
}

/**
 * Sound effects and background music, synthesized with the Web Audio API so
 * no audio files are needed. Browsers only allow audio to start after a user
 * gesture, so call `unlock()` from a click or key press first; sounds played
 * before that are silently skipped.
 */
export class GameAudio {
  private context?: AudioContext;
  private channels?: Record<AudioChannel, GainNode>;
  private musicStep = 0;
  private nextMusicTime = 0;
  private readonly enabled: Record<AudioChannel, boolean> = {
    music: loadEnabled("music"),
    effects: loadEnabled("effects"),
  };

  isOn(channel: AudioChannel): boolean {
    return this.enabled[channel];
  }

  /** Switches music or sound effects on or off; the choice is remembered. */
  toggle(channel: AudioChannel): void {
    const on = !this.enabled[channel];
    this.enabled[channel] = on;
    writeStorage(CHANNEL_STORAGE_KEYS[channel], String(on));
    if (this.context && this.channels) {
      this.channels[channel].gain.setTargetAtTime(
        on ? CHANNEL_VOLUMES[channel] : 0,
        this.context.currentTime,
        0.02,
      );
    }
  }

  /** Creates the audio context and starts the music. Safe to call repeatedly. */
  unlock(): void {
    if (this.context) {
      if (this.context.state === "suspended" && !document.hidden) {
        void this.context.resume();
      }
      return;
    }

    const context = new AudioContext();
    this.context = context;
    const master = context.createGain();
    master.gain.value = MASTER_VOLUME;
    master.connect(context.destination);
    const channel = (name: AudioChannel) => {
      const gain = context.createGain();
      gain.gain.value = this.enabled[name] ? CHANNEL_VOLUMES[name] : 0;
      gain.connect(master);
      return gain;
    };
    this.channels = { music: channel("music"), effects: channel("effects") };

    // Pause audio while the tab is hidden; timers are throttled there anyway.
    document.addEventListener("visibilitychange", () => {
      void (document.hidden ? context.suspend() : context.resume());
    });

    this.nextMusicTime = context.currentTime + 0.1;
    setInterval(() => this.scheduleMusic(), 50);
  }

  play(effect: SoundEffect): void {
    const t = this.context?.currentTime;
    if (t === undefined) {
      return;
    }
    switch (effect) {
      case "fire":
        this.tone(880, 440, 0.09, "square", t, 0.5);
        break;
      case "wall":
        this.tone(160, 50, 0.18, "sine", t, 1);
        break;
      case "exit":
        this.tone(420, 180, 0.3, "triangle", t, 0.8);
        break;
      case "loop":
        this.tone(300, 320, 0.15, "sawtooth", t, 0.4);
        this.tone(300, 280, 0.15, "sawtooth", t + 0.15, 0.4);
        break;
      case "goal":
        this.notes([72, 76, 79, 84], t, 0.09, 0.18, "triangle", 0.9);
        break;
      case "par":
        // The goal tune a fourth higher, then high sparkles.
        this.notes([77, 81, 84, 89], t, 0.08, 0.2, "triangle", 0.9);
        this.notes([96, 101, 100, 105], t + 0.36, 0.07, 0.12, "sine", 0.5);
        break;
      case "allPar":
        // A rising run, a held chord, and sparkles on top.
        this.notes(
          [72, 74, 76, 77, 79, 81, 83, 84],
          t,
          0.06,
          0.12,
          "square",
          0.35,
        );
        for (const note of [72, 76, 79, 84]) {
          const f = midiToFrequency(note);
          this.tone(f, f * 1.001, 1.4, "triangle", t + 0.5, 0.7);
        }
        this.notes(
          [96, 100, 103, 108, 103, 108],
          t + 0.6,
          0.11,
          0.15,
          "sine",
          0.45,
        );
        break;
    }
  }

  /** Mirror bounce; each further bounce in the same shot is a step higher. */
  playBounce(bounceNumber: number): void {
    const t = this.context?.currentTime;
    if (t === undefined) {
      return;
    }
    const f = 600 * 2 ** ((Math.min(bounceNumber - 1, 10) * 2) / 12);
    this.tone(f, f * 1.02, 0.07, "triangle", t, 0.7);
  }

  /** Plays `notes` (MIDI numbers) one after another, `spacing` seconds apart. */
  private notes(
    notes: number[],
    startTime: number,
    spacing: number,
    duration: number,
    type: OscillatorType,
    volume: number,
  ): void {
    notes.forEach((note, i) => {
      const f = midiToFrequency(note);
      this.tone(f, f, duration, type, startTime + i * spacing, volume);
    });
  }

  private tone(
    startFrequency: number,
    endFrequency: number,
    duration: number,
    type: OscillatorType,
    startTime: number,
    volume: number,
    destination = this.channels?.effects,
  ): void {
    if (!this.context || !destination) {
      return;
    }
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(startFrequency, startTime);
    oscillator.frequency.exponentialRampToValueAtTime(
      endFrequency,
      startTime + duration,
    );
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(volume, startTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
    oscillator.connect(gain).connect(destination);
    oscillator.start(startTime);
    oscillator.stop(startTime + duration + 0.02);
  }

  /** Schedules the music notes due within the next moment. */
  private scheduleMusic(): void {
    if (!this.context || this.context.state !== "running") {
      return;
    }
    const now = this.context.currentTime;
    if (this.nextMusicTime < now) {
      this.nextMusicTime = now;
    }
    while (this.nextMusicTime < now + SCHEDULE_AHEAD_SECONDS) {
      const step = this.musicStep % ARPEGGIO.length;
      const bar = Math.floor(this.musicStep / ARPEGGIO.length);
      const chord = MUSIC_CHORDS[bar % MUSIC_CHORDS.length];
      const t = this.nextMusicTime;

      const melody = midiToFrequency(chord[ARPEGGIO[step]] + 12);
      this.tone(
        melody,
        melody,
        MUSIC_STEP_SECONDS * 0.9,
        "triangle",
        t,
        0.6,
        this.channels?.music,
      );
      if (step % 4 === 0) {
        const bass = midiToFrequency(chord[0] - 12);
        this.tone(
          bass,
          bass,
          MUSIC_STEP_SECONDS * 3.5,
          "sine",
          t,
          1,
          this.channels?.music,
        );
      }

      this.musicStep++;
      this.nextMusicTime += MUSIC_STEP_SECONDS;
    }
  }
}

function loadEnabled(channel: AudioChannel): boolean {
  const stored = readStorage(CHANNEL_STORAGE_KEYS[channel]);
  if (stored !== null) {
    return stored === "true";
  }
  return readStorage(LEGACY_MUTED_STORAGE_KEY) !== "true";
}
