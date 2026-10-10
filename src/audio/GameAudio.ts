export type SoundEffect = "fire" | "wall" | "exit" | "loop" | "goal";

const MUTED_STORAGE_KEY = "diagonpuzzle.muted";
const MASTER_VOLUME = 0.8;
const EFFECTS_VOLUME = 0.35;
const MUSIC_VOLUME = 0.1;

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
  private master?: GainNode;
  private effects?: GainNode;
  private music?: GainNode;
  private musicStep = 0;
  private nextMusicTime = 0;
  private _muted = loadMuted();

  get muted(): boolean {
    return this._muted;
  }

  toggleMuted(): void {
    this._muted = !this._muted;
    saveMuted(this._muted);
    if (this.context && this.master) {
      this.master.gain.setTargetAtTime(
        this._muted ? 0 : MASTER_VOLUME,
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
    this.master = context.createGain();
    this.master.gain.value = this._muted ? 0 : MASTER_VOLUME;
    this.master.connect(context.destination);
    this.effects = context.createGain();
    this.effects.gain.value = EFFECTS_VOLUME;
    this.effects.connect(this.master);
    this.music = context.createGain();
    this.music.gain.value = MUSIC_VOLUME;
    this.music.connect(this.master);

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
        [72, 76, 79, 84].forEach((note, i) => {
          const f = midiToFrequency(note);
          this.tone(f, f, 0.18, "triangle", t + i * 0.09, 0.9);
        });
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

  private tone(
    startFrequency: number,
    endFrequency: number,
    duration: number,
    type: OscillatorType,
    startTime: number,
    volume: number,
    destination = this.effects,
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
        this.music,
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
          this.music,
        );
      }

      this.musicStep++;
      this.nextMusicTime += MUSIC_STEP_SECONDS;
    }
  }
}

// Storage can be unavailable (private windows, blocked site data); default to
// sound on.
function loadMuted(): boolean {
  try {
    return localStorage.getItem(MUTED_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function saveMuted(muted: boolean): void {
  try {
    localStorage.setItem(MUTED_STORAGE_KEY, String(muted));
  } catch {
    // Not remembered between visits; nothing else to do.
  }
}
