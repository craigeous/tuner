/**
 * Audio Synthesizer and Reference Tone Generator.
 * Uses Web Audio API to play reference tones, continuous drones, and plucked notes.
 */

export type TimbreType = 'sine' | 'acoustic' | 'triangle' | 'reed';

export class ToneGenerator {
  private audioCtx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private droneGain: GainNode | null = null;
  private droneOscillators: (OscillatorNode | GainNode)[] = [];
  private isDroneActive = false;
  private currentDroneFreq = 440;
  private currentTimbre: TimbreType = 'acoustic';
  private volume = 0.5;

  constructor() {
    // Lazy initialized on first user gesture
  }

  private ensureContext(): AudioContext {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();

      this.masterGain = this.audioCtx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, this.audioCtx.currentTime);
      this.masterGain.connect(this.audioCtx.destination);
    }

    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    return this.audioCtx;
  }

  public setVolume(val: number): void {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.audioCtx && this.masterGain) {
      const now = this.audioCtx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.linearRampToValueAtTime(this.volume, now + 0.03);
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  public setTimbre(timbre: TimbreType): void {
    this.currentTimbre = timbre;
    if (this.isDroneActive) {
      // Re-trigger drone with new timbre
      this.startDrone(this.currentDroneFreq, timbre);
    }
  }

  public getTimbre(): TimbreType {
    return this.currentTimbre;
  }

  /**
   * Play a note once with natural acoustic envelope (attack, decay, sustain, release).
   */
  public playNote(frequency: number, duration: number = 1.2, timbre: TimbreType = this.currentTimbre): void {
    const ctx = this.ensureContext();
    const now = ctx.currentTime;

    const noteGain = ctx.createGain();
    noteGain.connect(this.masterGain!);

    // Build timbre synth voices
    this.buildSynthVoice(ctx, noteGain, frequency, timbre, now, duration, false);
  }

  /**
   * Start a continuous drone on a specific frequency.
   */
  public startDrone(frequency: number, timbre: TimbreType = this.currentTimbre): void {
    const ctx = this.ensureContext();
    this.stopDrone();

    this.currentDroneFreq = frequency;
    this.currentTimbre = timbre;
    this.isDroneActive = true;

    const now = ctx.currentTime;
    const droneGain = ctx.createGain();
    droneGain.gain.setValueAtTime(0, now);
    droneGain.gain.linearRampToValueAtTime(0.7, now + 0.08); // gentle fade-in
    droneGain.connect(this.masterGain!);
    this.droneGain = droneGain;

    this.buildSynthVoice(ctx, droneGain, frequency, timbre, now, 0, true);
  }

  /**
   * Update the frequency of the currently playing drone without interrupting the sound.
   */
  public updateDroneFrequency(frequency: number): void {
    if (!this.isDroneActive || !this.audioCtx) return;
    this.currentDroneFreq = frequency;
    const now = this.audioCtx.currentTime;

    for (const item of this.droneOscillators) {
      if (item instanceof OscillatorNode) {
        const mult = (item as unknown as { __harmonicMult?: number }).__harmonicMult || 1;
        item.frequency.cancelScheduledValues(now);
        item.frequency.exponentialRampToValueAtTime(Math.max(20, frequency * mult), now + 0.05);
      }
    }
  }

  /**
   * Stop the active drone.
   */
  public stopDrone(): void {
    if (!this.isDroneActive || !this.audioCtx) return;
    this.isDroneActive = false;

    if (this.droneGain) {
      const now = this.audioCtx.currentTime;
      this.droneGain.gain.cancelScheduledValues(now);
      this.droneGain.gain.linearRampToValueAtTime(0.0001, now + 0.08);

      setTimeout(() => {
        for (const item of this.droneOscillators) {
          if (item instanceof OscillatorNode) {
            try { item.stop(); item.disconnect(); } catch {}
          }
        }
        this.droneOscillators = [];
        this.droneGain?.disconnect();
        this.droneGain = null;
      }, 100);
    }
  }

  public isDronePlaying(): boolean {
    return this.isDroneActive;
  }

  public getDroneFrequency(): number {
    return this.currentDroneFreq;
  }

  /**
   * Internal helper to build synthesized harmonic voices.
   */
  private buildSynthVoice(
    ctx: AudioContext,
    destination: GainNode,
    frequency: number,
    timbre: TimbreType,
    startTime: number,
    duration: number,
    isContinuous: boolean
  ): void {
    const oscillators: (OscillatorNode | GainNode)[] = [];

    if (timbre === 'sine') {
      // Pure clean sine wave
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, startTime);
      osc.connect(destination);
      osc.start(startTime);
      oscillators.push(osc);

      if (!isContinuous) {
        destination.gain.setValueAtTime(0, startTime);
        destination.gain.linearRampToValueAtTime(0.8, startTime + 0.03);
        destination.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
        osc.stop(startTime + duration + 0.05);
      }
    } else if (timbre === 'triangle') {
      // Soft flute-like triangle
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(frequency, startTime);
      osc.connect(destination);
      osc.start(startTime);
      oscillators.push(osc);

      if (!isContinuous) {
        destination.gain.setValueAtTime(0, startTime);
        destination.gain.linearRampToValueAtTime(0.8, startTime + 0.02);
        destination.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
        osc.stop(startTime + duration + 0.05);
      }
    } else if (timbre === 'reed') {
      // Clarinet / Reed: Fundamental + odd harmonics with low-pass filter
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(Math.min(3500, frequency * 5), startTime);
      filter.connect(destination);

      const harmonics = [
        { mult: 1, gain: 0.7 },
        { mult: 3, gain: 0.25 },
        { mult: 5, gain: 0.08 },
      ];

      for (const h of harmonics) {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(frequency * h.mult, startTime);
        (osc as unknown as { __harmonicMult: number }).__harmonicMult = h.mult;
        g.gain.setValueAtTime(h.gain, startTime);
        osc.connect(g);
        g.connect(filter);
        osc.start(startTime);
        oscillators.push(osc);

        if (!isContinuous) {
          osc.stop(startTime + duration + 0.05);
        }
      }

      if (!isContinuous) {
        destination.gain.setValueAtTime(0, startTime);
        destination.gain.linearRampToValueAtTime(0.8, startTime + 0.03);
        destination.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
      }
    } else {
      // 'acoustic': Warm multi-harmonic string sound with gentle lowpass filter and pluck envelope
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(Math.min(5000, frequency * 6), startTime);
      filter.connect(destination);

      // Fundamental, 2nd, 3rd, and 4th harmonics
      const harmonics = [
        { mult: 1, gain: 0.65, type: 'sine' as OscillatorType },
        { mult: 2, gain: 0.25, type: 'triangle' as OscillatorType },
        { mult: 3, gain: 0.12, type: 'sine' as OscillatorType },
        { mult: 4, gain: 0.05, type: 'sine' as OscillatorType },
      ];

      for (const h of harmonics) {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = h.type;
        osc.frequency.setValueAtTime(frequency * h.mult, startTime);
        (osc as unknown as { __harmonicMult: number }).__harmonicMult = h.mult;
        g.gain.setValueAtTime(h.gain, startTime);
        osc.connect(g);
        g.connect(filter);
        osc.start(startTime);
        oscillators.push(osc);

        if (!isContinuous) {
          osc.stop(startTime + duration + 0.05);
        }
      }

      if (!isContinuous) {
        // Guitar/piano pluck envelope: quick attack (0.015s), exponential decay
        destination.gain.setValueAtTime(0, startTime);
        destination.gain.linearRampToValueAtTime(0.85, startTime + 0.015);
        destination.gain.exponentialRampToValueAtTime(0.2, startTime + 0.35);
        destination.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
      }
    }

    if (isContinuous) {
      this.droneOscillators = oscillators;
    }
  }
}
