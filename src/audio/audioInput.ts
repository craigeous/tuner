/**
 * Audio Input and Microphone Pitch Tracking Engine.
 * Handles microphone capture, filtering, pitch detection, and history tracking.
 */

import { autoCorrelate, noteFromPitch, type NoteInfo, type NotationType } from './pitch.ts';

export interface PitchFrame {
  timestamp: number;
  frequency: number;
  rawFrequency: number;
  confidence: number;
  rms: number;
  note: NoteInfo | null;
  waveformData: Float32Array;
  spectrumData: Uint8Array;
}

export type FrameListener = (frame: PitchFrame) => void;

export class AudioInputEngine {
  private audioCtx: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private highpassFilter: BiquadFilterNode | null = null;
  private lowpassFilter: BiquadFilterNode | null = null;
  private analyserNode: AnalyserNode | null = null;

  private isRunning = false;
  private animFrameId: number | null = null;

  // Buffer configuration
  private readonly fftSize = 4096;
  private timeDataBuffer: Float32Array<ArrayBuffer> = new Float32Array(new ArrayBuffer(this.fftSize * 4));
  private freqDataBuffer: Uint8Array<ArrayBuffer> = new Uint8Array(new ArrayBuffer(this.fftSize / 2));

  // Smoothing buffers (median filter over last 3 valid pitch detections)
  private pitchHistoryWindow: number[] = [];
  private readonly maxPitchSmoothing = 3;

  // Settings
  private a4 = 440;
  private notation: NotationType = 'sharp';
  private noiseGateThreshold = 0.008;
  private rawAudioMode = true; // disable browser AGC/noise suppression for music

  // Rolling pitch history for UI graph (last ~300 frames)
  private history: { time: number; freq: number; cents: number; inTune: boolean; rms: number }[] = [];
  private readonly maxHistoryLength = 300;

  // Listeners
  private listeners: Set<FrameListener> = new Set();

  constructor() {}

  public isListening(): boolean {
    return this.isRunning;
  }

  public setA4(hz: number): void {
    this.a4 = Math.max(400, Math.min(480, hz));
  }

  public getA4(): number {
    return this.a4;
  }

  public setNotation(notation: NotationType): void {
    this.notation = notation;
  }

  public getNotation(): NotationType {
    return this.notation;
  }

  public setNoiseGate(threshold: number): void {
    this.noiseGateThreshold = Math.max(0.001, Math.min(0.08, threshold));
  }

  public getNoiseGate(): number {
    return this.noiseGateThreshold;
  }

  public setRawAudioMode(enableRaw: boolean): void {
    this.rawAudioMode = enableRaw;
    if (this.isRunning) {
      // Restart with new constraints
      this.stop();
      this.start();
    }
  }

  public getRawAudioMode(): boolean {
    return this.rawAudioMode;
  }

  public subscribe(listener: FrameListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public getHistory() {
    return this.history;
  }

  public clearHistory(): void {
    this.history = [];
  }

  /**
   * Start listening to the microphone.
   */
  public async start(): Promise<void> {
    if (this.isRunning) return;

    try {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();

      if (this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }

      // Constraints for musical instruments & vocal pitch tracking
      const audioConstraints: MediaTrackConstraints = this.rawAudioMode
        ? {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          }
        : {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: false,
          };

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
        video: false,
      });

      this.sourceNode = this.audioCtx.createMediaStreamSource(this.mediaStream);

      // Low-cut high-pass filter at 32Hz (eliminates DC thumps and table vibrations)
      this.highpassFilter = this.audioCtx.createBiquadFilter();
      this.highpassFilter.type = 'highpass';
      this.highpassFilter.frequency.setValueAtTime(32, this.audioCtx.currentTime);

      // High-cut low-pass filter at 2600Hz (cuts unwanted high hiss above musical fundamentals)
      this.lowpassFilter = this.audioCtx.createBiquadFilter();
      this.lowpassFilter.type = 'lowpass';
      this.lowpassFilter.frequency.setValueAtTime(2600, this.audioCtx.currentTime);

      // Analyser Node
      this.analyserNode = this.audioCtx.createAnalyser();
      this.analyserNode.fftSize = this.fftSize;
      this.analyserNode.smoothingTimeConstant = 0.1;

      // Audio routing graph: Source -> Highpass -> Lowpass -> Analyser
      this.sourceNode.connect(this.highpassFilter);
      this.highpassFilter.connect(this.lowpassFilter);
      this.lowpassFilter.connect(this.analyserNode);

      this.isRunning = true;
      this.processLoop();
    } catch (err) {
      console.error('Failed to open microphone:', err);
      this.stop();
      throw err;
    }
  }

  /**
   * Stop listening and release microphone.
   */
  public stop(): void {
    this.isRunning = false;

    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }

    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.highpassFilter) {
      this.highpassFilter.disconnect();
      this.highpassFilter = null;
    }

    if (this.lowpassFilter) {
      this.lowpassFilter.disconnect();
      this.lowpassFilter = null;
    }

    if (this.analyserNode) {
      this.analyserNode.disconnect();
      this.analyserNode = null;
    }

    if (this.audioCtx) {
      this.audioCtx.close();
      this.audioCtx = null;
    }

    this.pitchHistoryWindow = [];

    // Notify listeners with empty frame
    const emptyFrame: PitchFrame = {
      timestamp: performance.now(),
      frequency: 0,
      rawFrequency: 0,
      confidence: 0,
      rms: 0,
      note: null,
      waveformData: new Float32Array(0),
      spectrumData: new Uint8Array(0),
    };
    this.listeners.forEach((fn) => fn(emptyFrame));
  }

  private processLoop = (): void => {
    if (!this.isRunning || !this.analyserNode || !this.audioCtx) return;

    this.analyserNode.getFloatTimeDomainData(this.timeDataBuffer);
    this.analyserNode.getByteFrequencyData(this.freqDataBuffer);

    const sampleRate = this.audioCtx.sampleRate;
    const pitchResult = autoCorrelate(
      this.timeDataBuffer,
      sampleRate,
      25,
      2300,
      this.noiseGateThreshold
    );

    let smoothedFreq = 0;
    const rawFreq = pitchResult.frequency;

    if (rawFreq > 0) {
      // Add to short median filter window
      this.pitchHistoryWindow.push(rawFreq);
      if (this.pitchHistoryWindow.length > this.maxPitchSmoothing) {
        this.pitchHistoryWindow.shift();
      }

      // Calculate median to eliminate outlier jumps
      const sorted = [...this.pitchHistoryWindow].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      smoothedFreq = sorted[mid];
    } else {
      // Silence: decay smoothing window
      if (this.pitchHistoryWindow.length > 0) {
        this.pitchHistoryWindow.shift();
      }
    }

    const note = smoothedFreq > 0 ? noteFromPitch(smoothedFreq, this.a4, this.notation) : null;
    const now = performance.now();

    // Append to rolling history
    if (smoothedFreq > 0 && note) {
      this.history.push({
        time: now,
        freq: smoothedFreq,
        cents: note.cents,
        inTune: note.inTune,
        rms: pitchResult.rms,
      });
      if (this.history.length > this.maxHistoryLength) {
        this.history.shift();
      }
    }

    const frame: PitchFrame = {
      timestamp: now,
      frequency: smoothedFreq,
      rawFrequency: rawFreq,
      confidence: pitchResult.confidence,
      rms: pitchResult.rms,
      note,
      waveformData: this.timeDataBuffer,
      spectrumData: this.freqDataBuffer,
    };

    this.listeners.forEach((fn) => fn(frame));

    this.animFrameId = requestAnimationFrame(this.processLoop);
  };
}
