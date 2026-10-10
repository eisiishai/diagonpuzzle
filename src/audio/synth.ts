// Small sound-making building blocks on the Web Audio API, shared by the
// sound effects and the music. Designed with the sound lab page; see
// docs/DESIGN.md, Sound.

export function midi(note: number): number {
  return 440 * 2 ** ((note - 69) / 12);
}

/** Where a voice goes; reverb and echo are sends on top of it. */
interface Routing {
  dest: AudioNode;
  /** Amount sent to the shared reverb, 0–1. */
  wet?: number;
  /** Amount sent to the shared echo, 0–1. */
  echo?: number;
}

export interface ToneOptions extends Routing {
  type?: OscillatorType;
  /** Start frequency (Hz); f2 makes the pitch sweep to it. */
  f: number;
  f2?: number;
  t: number;
  /** Attack and decay, in seconds. */
  a?: number;
  d?: number;
  vol?: number;
  /** An optional lowpass/bandpass/highpass filter, swept to filterEnd. */
  filter?: { type?: BiquadFilterType; f: number; q?: number };
  filterEnd?: number;
}

export interface HeldOptions extends Routing {
  type?: OscillatorType;
  f: number;
  t: number;
  /** Total length, attack and release, in seconds. */
  dur: number;
  a?: number;
  r?: number;
  vol?: number;
  cutoff?: number;
  /** Detuning of the layered oscillators, in cents. */
  detunes?: number[];
}

export interface NoiseOptions extends Routing {
  t: number;
  a?: number;
  d?: number;
  vol?: number;
  type?: BiquadFilterType;
  f?: number;
  f2?: number;
  q?: number;
}

export interface BellOptions extends Routing {
  f: number;
  t: number;
  d?: number;
  vol?: number;
  ratio?: number;
  index?: number;
}

/**
 * Plays notes and noises into the given audio graph. Every voice gets its own
 * short-lived nodes, which the browser releases when they finish.
 */
export class Synth {
  readonly ctx: AudioContext;
  private readonly reverbIn: AudioNode;
  private readonly echoIn: AudioNode;
  private readonly noiseBuffer: AudioBuffer;

  constructor(ctx: AudioContext, reverbIn: AudioNode, echoIn: AudioNode) {
    this.ctx = ctx;
    this.reverbIn = reverbIn;
    this.echoIn = echoIn;
    this.noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  }

  /** One oscillator note with a quick attack and an exponential decay. */
  tone(o: ToneOptions): void {
    const { type = "sine", f, f2 = f, t, a = 0.005, d = 0.2, vol = 0.3 } = o;
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(f, t);
    if (f2 !== f) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(f2, 1), t + a + d);
    }
    let source: AudioNode = osc;
    if (o.filter) {
      const filter = this.ctx.createBiquadFilter();
      filter.type = o.filter.type ?? "lowpass";
      filter.Q.value = o.filter.q ?? 1;
      filter.frequency.setValueAtTime(o.filter.f, t);
      if (o.filterEnd) {
        filter.frequency.exponentialRampToValueAtTime(o.filterEnd, t + a + d);
      }
      osc.connect(filter);
      source = filter;
    }
    source.connect(this.envelope(t, a, d, vol, o));
    osc.start(t);
    osc.stop(t + a + d + 0.05);
  }

  /** A sustained note of layered, detuned oscillators: pads and bass. */
  held(o: HeldOptions): void {
    const {
      type = "sawtooth",
      f,
      t,
      dur,
      a = 0.4,
      r = 0.6,
      vol = 0.05,
      cutoff = 1200,
      detunes = [-7, 7],
    } = o;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(vol, t + a);
    gain.gain.setValueAtTime(vol, t + Math.max(a, dur - r));
    gain.gain.linearRampToValueAtTime(0.0001, t + dur);
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = cutoff;
    filter.connect(gain);
    gain.connect(this.route(o));
    for (const detune of detunes) {
      const osc = this.ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = f;
      osc.detune.value = detune;
      osc.connect(filter);
      osc.start(t);
      osc.stop(t + dur + 0.05);
    }
  }

  /** Filtered noise: clicks, hisses and drum sounds. */
  noise(o: NoiseOptions): void {
    const {
      t,
      a = 0.003,
      d = 0.2,
      vol = 0.2,
      type = "bandpass",
      f = 1000,
      f2 = f,
      q = 1,
    } = o;
    const source = this.ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.Q.value = q;
    filter.frequency.setValueAtTime(f, t);
    if (f2 !== f) {
      filter.frequency.exponentialRampToValueAtTime(f2, t + a + d);
    }
    source.connect(filter);
    filter.connect(this.envelope(t, a, d, vol, o));
    source.start(t, Math.random() * 1.5);
    source.stop(t + a + d + 0.05);
  }

  /** A bell made by frequency modulation: bright at first, then mellow. */
  bell(o: BellOptions): void {
    const { f, t, d = 1.6, vol = 0.12, ratio = 3.5, index = 2.2 } = o;
    const carrier = this.ctx.createOscillator();
    carrier.frequency.value = f;
    const modulator = this.ctx.createOscillator();
    modulator.frequency.value = f * ratio;
    const depth = this.ctx.createGain();
    depth.gain.setValueAtTime(f * index, t);
    depth.gain.exponentialRampToValueAtTime(f * 0.05, t + d);
    modulator.connect(depth);
    depth.connect(carrier.frequency);
    carrier.connect(this.envelope(t, 0.004, d, vol, o));
    carrier.start(t);
    modulator.start(t);
    carrier.stop(t + d + 0.05);
    modulator.stop(t + d + 0.05);
  }

  /** Plays MIDI `notes` one after another, `spacing` seconds apart. */
  notes(
    notes: number[],
    t: number,
    spacing: number,
    play: (f: number, t: number) => void,
  ): void {
    notes.forEach((note, i) => play(midi(note), t + i * spacing));
  }

  private envelope(
    t: number,
    a: number,
    d: number,
    vol: number,
    routing: Routing,
  ): GainNode {
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + a);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
    gain.connect(this.route(routing));
    return gain;
  }

  /** A node feeding `dest`, with reverb and echo sends when asked for. */
  private route({ dest, wet = 0, echo = 0 }: Routing): AudioNode {
    const out = this.ctx.createGain();
    out.connect(dest);
    const send = (amount: number, to: AudioNode) => {
      const gain = this.ctx.createGain();
      gain.gain.value = amount;
      out.connect(gain);
      gain.connect(to);
    };
    if (wet > 0) {
      send(wet, this.reverbIn);
    }
    if (echo > 0) {
      send(echo, this.echoIn);
    }
    return out;
  }
}
