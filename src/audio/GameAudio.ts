import type { BounceKind } from "../game/types";
import { readStorage, writeStorage } from "../save/storage";
import { BOUNCE_SECONDS, EFFECTS, playBounce } from "./effects";
import type { SoundEffect } from "./effects";
import { DEFAULT_HARMONY, MUSIC_TRACKS } from "./music";
import type { Harmony, MusicTrack, MusicTrackId } from "./music";
import { Synth } from "./synth";
import { VoiceLimiter } from "./VoiceLimiter";

export type { SoundEffect } from "./effects";

/** Music and sound effects are switched on and off separately. */
export type AudioChannel = "music" | "effects";

const MASTER_VOLUME = 0.9;
/** The balance picked on the sound lab page: effects 80 %, music 45 %. */
const CHANNEL_VOLUMES: Record<AudioChannel, number> = {
  effects: 0.8,
  music: 0.45 * 0.6,
};
const CHANNEL_STORAGE_KEYS: Record<AudioChannel, string> = {
  music: "musicOn",
  effects: "effectsOn",
};
/** Before music and effects were separate, one setting muted both. */
const LEGACY_MUTED_STORAGE_KEY = "muted";

/** At most this many effects at once; goal and par sounds always play. */
const MAX_EFFECT_VOICES = 6;
/** Random pitch variation of everyday effects, in cents (± this much). */
const PITCH_VARIATION_CENTS = 25;
/** Music level while a celebration plays (ducking). */
const DUCKED_LEVEL = 0.25;
/** Resting music (see restMusic()): fade out, silence after the sound, return. */
const MUSIC_REST_FADE_SECONDS = 0.5;
const MUSIC_REST_PAUSE_SECONDS = 2;
const MUSIC_REST_RETURN_SECONDS = 4;
const CROSSFADE_SECONDS = 1.2;
const SCHEDULE_AHEAD_SECONDS = 0.15;
const SCHEDULER_INTERVAL_MS = 25;

interface PlayingTrack {
  id: MusicTrackId;
  track: MusicTrack;
  /** This track's own volume, for crossfading between tracks. */
  gain: GainNode;
  step: number;
  nextTime: number;
}

/** The audio graph, created on unlock(). */
interface Graph {
  ctx: AudioContext;
  channels: Record<AudioChannel, GainNode>;
  duck: GainNode;
  effectsSynth: Synth;
  musicSynth: Synth;
}

/**
 * Sound effects and background music, synthesized with the Web Audio API so
 * no audio files are needed (effects in effects.ts, music in music.ts).
 * Browsers only allow audio to start after a user gesture, so call `unlock()`
 * from a click or key press first; sounds played before that are skipped,
 * and the music starts on unlock.
 */
export class GameAudio {
  private graph?: Graph;
  private readonly limiter = new VoiceLimiter(MAX_EFFECT_VOICES);
  private wantedTrack?: MusicTrackId;
  private playing?: PlayingTrack;
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
    if (this.graph) {
      this.graph.channels[channel].gain.setTargetAtTime(
        on ? CHANNEL_VOLUMES[channel] : 0,
        this.graph.ctx.currentTime,
        0.02,
      );
    }
  }

  /**
   * Plays `id` as the background music. Switching to the track already
   * playing changes nothing; another track crossfades in.
   */
  setMusic(id: MusicTrackId): void {
    this.wantedTrack = id;
    if (this.graph) {
      this.startTrack(this.graph, id);
    }
  }

  /** Creates the audio graph and starts the music. Safe to call repeatedly. */
  unlock(): void {
    if (this.graph) {
      const { ctx } = this.graph;
      if (ctx.state === "suspended" && !document.hidden) {
        void ctx.resume();
      }
      return;
    }

    const ctx = new AudioContext();
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -14;
    compressor.ratio.value = 4;
    compressor.connect(ctx.destination);
    const master = ctx.createGain();
    master.gain.value = MASTER_VOLUME;
    master.connect(compressor);

    // Music goes through the duck gain, which celebrations lower briefly.
    const duck = ctx.createGain();
    duck.connect(master);
    const channel = (name: AudioChannel, to: AudioNode) => {
      const gain = ctx.createGain();
      gain.gain.value = this.enabled[name] ? CHANNEL_VOLUMES[name] : 0;
      gain.connect(to);
      return gain;
    };
    const channels = {
      effects: channel("effects", master),
      music: channel("music", duck),
    };

    // Each channel has its own reverb (and the music its echo), returning
    // into that channel, so switching a channel off silences its tails too.
    const impulse = reverbImpulse(ctx);
    const effectsSynth = new Synth(
      ctx,
      reverb(ctx, impulse, channels.effects),
      channels.effects,
    );
    const musicSynth = new Synth(
      ctx,
      reverb(ctx, impulse, channels.music),
      echo(ctx, channels.music),
    );

    const graph = { ctx, channels, duck, effectsSynth, musicSynth };
    this.graph = graph;

    // Pause audio while the tab is hidden; timers are throttled there anyway.
    document.addEventListener("visibilitychange", () => {
      void (document.hidden ? ctx.suspend() : ctx.resume());
    });
    setInterval(() => this.scheduleMusic(graph), SCHEDULER_INTERVAL_MS);
    if (this.wantedTrack) {
      this.startTrack(graph, this.wantedTrack);
    }
  }

  /**
   * Plays a sound effect, centred or at stereo position `pan` (-1 left …
   * 1 right; see columnPan()).
   */
  play(effect: SoundEffect, pan = 0): void {
    const graph = this.graph;
    if (!graph || !this.enabled.effects) {
      return;
    }
    const definition = EFFECTS[effect];
    const t = graph.ctx.currentTime;
    if (!this.limiter.tryStart(t, definition.seconds, definition.important)) {
      return;
    }
    const pitch = definition.important ? 1 : randomPitch();
    definition.play(
      graph.effectsSynth,
      this.effectsOutput(graph, pan, definition.seconds),
      t,
      pitch,
      this.harmonyAt(t),
    );
    if (definition.duckSeconds) {
      this.duckMusic(graph, t, definition.duckSeconds);
    }
    if (definition.restMusicSeconds) {
      this.restMusic(graph, t, definition.restMusicSeconds);
    }
  }

  /**
   * A bounce off a mirror, fixed mirror, reflector or glass mirror (`kind`) at stereo
   * position `pan`; each further bounce in the same shot is a note higher
   * on the music's scale.
   */
  playBounce(bounceNumber: number, pan = 0, kind: BounceKind = "mirror"): void {
    const graph = this.graph;
    if (!graph || !this.enabled.effects) {
      return;
    }
    const t = graph.ctx.currentTime;
    if (this.limiter.tryStart(t, BOUNCE_SECONDS[kind])) {
      playBounce(
        graph.effectsSynth,
        graph.channels.effects,
        t,
        bounceNumber,
        this.harmonyAt(t),
        kind,
        pan,
      );
    }
  }

  /**
   * Where an effect plays: the effects channel, through a stereo panner
   * (removed once the sound is over) when it is off centre.
   */
  private effectsOutput(graph: Graph, pan: number, seconds: number): AudioNode {
    if (pan === 0) {
      return graph.channels.effects;
    }
    const panner = graph.ctx.createStereoPanner();
    panner.pan.value = pan;
    panner.connect(graph.channels.effects);
    setTimeout(() => panner.disconnect(), (seconds + 1) * 1000);
    return panner;
  }

  /** The harmony of the music playing at time `t`, for tuned effects. */
  private harmonyAt(t: number): Harmony {
    const playing = this.playing;
    if (!playing) {
      return DEFAULT_HARMONY;
    }
    // playing.nextTime is when step playing.step starts.
    const { track } = playing;
    const stepSeconds = 60 / track.bpm / track.stepsPerBeat;
    const step =
      playing.step + Math.floor((t - playing.nextTime) / stepSeconds);
    return track.harmony(Math.max(0, step));
  }

  private startTrack(graph: Graph, id: MusicTrackId): void {
    if (this.playing?.id === id) {
      return;
    }
    const { ctx } = graph;
    const now = ctx.currentTime;

    // Fade the old track out. Notes it already scheduled play out under the
    // fading gain, which is then disconnected.
    const old = this.playing;
    if (old) {
      old.gain.gain.setValueAtTime(old.gain.gain.value, now);
      old.gain.gain.linearRampToValueAtTime(0, now + CROSSFADE_SECONDS);
      setTimeout(() => old.gain.disconnect(), (CROSSFADE_SECONDS + 6) * 1000);
    }

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(1, now + (old ? CROSSFADE_SECONDS : 0.3));
    gain.connect(graph.channels.music);
    this.playing = {
      id,
      track: MUSIC_TRACKS[id],
      gain,
      step: 0,
      nextTime: now + 0.1,
    };
  }

  /** Schedules the current track's notes due within the next moment. */
  private scheduleMusic(graph: Graph): void {
    const playing = this.playing;
    if (!playing || graph.ctx.state !== "running") {
      return;
    }
    const now = graph.ctx.currentTime;
    const { track } = playing;
    const stepSeconds = 60 / track.bpm / track.stepsPerBeat;
    if (playing.nextTime < now) {
      playing.nextTime = now;
    }
    while (playing.nextTime < now + SCHEDULE_AHEAD_SECONDS) {
      track.step(
        graph.musicSynth,
        playing.gain,
        playing.step,
        playing.nextTime,
        stepSeconds,
      );
      playing.step++;
      playing.nextTime += stepSeconds;
    }
  }

  /**
   * Silences the music from `t` while a sound of `seconds` rings out, then
   * brings it back slowly.
   */
  private restMusic(graph: Graph, t: number, seconds: number): void {
    const level = graph.duck.gain;
    level.cancelScheduledValues(t);
    level.setValueAtTime(level.value, t);
    level.linearRampToValueAtTime(0.0001, t + MUSIC_REST_FADE_SECONDS);
    level.setValueAtTime(0.0001, t + seconds + MUSIC_REST_PAUSE_SECONDS);
    level.linearRampToValueAtTime(
      1,
      t + seconds + MUSIC_REST_PAUSE_SECONDS + MUSIC_REST_RETURN_SECONDS,
    );
  }

  /** Lowers the music for `seconds` from `t`, then brings it back. */
  private duckMusic(graph: Graph, t: number, seconds: number): void {
    const level = graph.duck.gain;
    level.cancelScheduledValues(t);
    level.setValueAtTime(level.value, t);
    level.linearRampToValueAtTime(DUCKED_LEVEL, t + 0.08);
    level.setValueAtTime(DUCKED_LEVEL, t + seconds);
    level.linearRampToValueAtTime(1, t + seconds + 0.8);
  }
}

function randomPitch(): number {
  const cents = (Math.random() * 2 - 1) * PITCH_VARIATION_CENTS;
  return 2 ** (cents / 1200);
}

/** A decaying noise tail, the shape of a room's echo, for the reverbs. */
function reverbImpulse(ctx: AudioContext): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * 2.6);
  const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = impulse.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 3;
    }
  }
  return impulse;
}

/** A reverb returning into `to`; returns its input. */
function reverb(ctx: AudioContext, impulse: AudioBuffer, to: AudioNode) {
  const input = ctx.createGain();
  const convolver = ctx.createConvolver();
  convolver.buffer = impulse;
  const output = ctx.createGain();
  output.gain.value = 0.5;
  input.connect(convolver);
  convolver.connect(output);
  output.connect(to);
  return input;
}

/** A darkening 0.36 s echo returning into `to`; returns its input. */
function echo(ctx: AudioContext, to: AudioNode) {
  const input = ctx.createGain();
  const delay = ctx.createDelay(2);
  delay.delayTime.value = 0.36;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.35;
  const darken = ctx.createBiquadFilter();
  darken.type = "lowpass";
  darken.frequency.value = 2200;
  const output = ctx.createGain();
  output.gain.value = 0.5;
  input.connect(delay);
  delay.connect(darken);
  darken.connect(feedback);
  feedback.connect(delay);
  darken.connect(output);
  output.connect(to);
  return input;
}

function loadEnabled(channel: AudioChannel): boolean {
  const stored = readStorage(CHANNEL_STORAGE_KEYS[channel]);
  if (stored !== null) {
    return stored === "true";
  }
  return readStorage(LEGACY_MUTED_STORAGE_KEY) !== "true";
}
