/**
 * Pitch History Trace and Oscilloscope Waveform Visualizer.
 * Provides real-time visual feedback for vocalists and instrumentalists to observe
 * pitch stability, vibrato width, pitch slides, and time-domain waveforms.
 */

import type { PitchFrame } from '../audio/audioInput.ts';

export type VisualizerMode = 'pitch-history' | 'waveform';

export class PitchHistoryGraph {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private mode: VisualizerMode = 'pitch-history';

  // Rolling history of points: { x: timestamp, cents: number, inTune: boolean, hasSound: boolean }
  private history: { time: number; cents: number; inTune: boolean; hasSound: boolean }[] = [];
  private lastWaveform: Float32Array = new Float32Array(0);

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true })!;
    this.handleResize();
    window.addEventListener('resize', this.handleResize);
  }

  public setMode(mode: VisualizerMode): void {
    this.mode = mode;
    this.draw();
  }

  public getMode(): VisualizerMode {
    return this.mode;
  }

  public handleResize = (): void => {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.resetTransform();
    this.ctx.scale(dpr, dpr);
    this.draw();
  };

  public update(frame: PitchFrame): void {
    const now = frame.timestamp;

    if (frame.frequency > 0 && frame.note) {
      this.history.push({
        time: now,
        cents: frame.note.cents,
        inTune: frame.note.inTune,
        hasSound: true,
      });
    } else {
      this.history.push({
        time: now,
        cents: 0,
        inTune: false,
        hasSound: false,
      });
    }

    // Keep the last ~4.5 seconds of history
    const windowMs = 4500;
    while (this.history.length > 0 && now - this.history[0].time > windowMs) {
      this.history.shift();
    }

    this.lastWaveform = frame.waveformData;
    this.draw();
  }

  public clear(): void {
    this.history = [];
    this.draw();
  }

  public draw(): void {
    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    if (w === 0 || h === 0) return;

    this.ctx.clearRect(0, 0, w, h);

    if (this.mode === 'waveform') {
      this.drawWaveform(w, h);
    } else {
      this.drawPitchHistory(w, h);
    }
  }

  private drawPitchHistory(w: number, h: number): void {
    const centerY = h / 2;
    const halfRangeCents = 50; // -50 to +50 cents
    const scaleY = (h * 0.42) / halfRangeCents;

    // 1. Draw horizontal grid lines
    const gridCents = [-50, -25, 0, 25, 50];
    for (const c of gridCents) {
      const y = centerY - c * scaleY;
      const isZero = c === 0;

      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(w, y);
      this.ctx.lineWidth = isZero ? 1.5 : 1;
      this.ctx.strokeStyle = isZero ? 'rgba(16, 185, 129, 0.4)' : 'rgba(255, 255, 255, 0.07)';
      this.ctx.stroke();

      // Label
      this.ctx.fillStyle = isZero ? 'rgba(16, 185, 129, 0.7)' : 'rgba(255, 255, 255, 0.3)';
      this.ctx.font = '10px system-ui, sans-serif';
      this.ctx.textAlign = 'right';
      this.ctx.fillText((c > 0 ? `+${c}` : `${c}`) + '¢', w - 8, y - 3);
    }

    // 2. In-tune shaded band (+/- 5 cents)
    const bandTop = centerY - 5 * scaleY;
    const bandHeight = 10 * scaleY;
    this.ctx.fillStyle = 'rgba(16, 185, 129, 0.08)';
    this.ctx.fillRect(0, bandTop, w, bandHeight);

    // 3. Draw Pitch Trail
    if (this.history.length < 2) return;

    const windowMs = 4500;
    const now = this.history[this.history.length - 1].time;

    let segmentActive = false;

    for (let i = 0; i < this.history.length; i++) {
      const pt = this.history[i];
      const age = now - pt.time;
      const x = w - (age / windowMs) * w;
      const y = centerY - pt.cents * scaleY;

      if (!pt.hasSound) {
        segmentActive = false;
        continue;
      }

      if (!segmentActive) {
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        segmentActive = true;
      } else {
        this.ctx.lineTo(x, y);
      }

      // Color coding based on cents
      const absCents = Math.abs(pt.cents);
      const strokeColor = absCents <= 3
        ? '#10b981' // Green
        : absCents <= 12
        ? '#f59e0b' // Amber
        : '#ef4444'; // Red

      // Draw short segment
      if (i > 0 && this.history[i - 1].hasSound) {
        this.ctx.lineWidth = 3;
        this.ctx.strokeStyle = strokeColor;
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
      }
    }

    // Draw current head point pulse
    const last = this.history[this.history.length - 1];
    if (last && last.hasSound) {
      const headY = centerY - last.cents * scaleY;
      const headColor = Math.abs(last.cents) <= 3 ? '#10b981' : Math.abs(last.cents) <= 12 ? '#f59e0b' : '#ef4444';

      this.ctx.beginPath();
      this.ctx.arc(w - 4, headY, 5, 0, Math.PI * 2);
      this.ctx.fillStyle = headColor;
      this.ctx.shadowColor = headColor;
      this.ctx.shadowBlur = 8;
      this.ctx.fill();
      this.ctx.shadowBlur = 0;
    }
  }

  private drawWaveform(w: number, h: number): void {
    const centerY = h / 2;

    // Center baseline
    this.ctx.beginPath();
    this.ctx.moveTo(0, centerY);
    this.ctx.lineTo(w, centerY);
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();

    if (!this.lastWaveform || this.lastWaveform.length === 0) return;

    // Draw audio oscilloscope line
    this.ctx.beginPath();
    const sliceWidth = w / 512;
    let x = 0;

    // Downsample buffer to 512 samples for clean crisp wave
    const step = Math.floor(this.lastWaveform.length / 512);

    for (let i = 0; i < 512; i++) {
      const sample = this.lastWaveform[i * step] || 0;
      const y = centerY + sample * (h * 0.42);

      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
      x += sliceWidth;
    }

    this.ctx.lineWidth = 2;
    this.ctx.strokeStyle = '#38bdf8'; // Cyan
    this.ctx.shadowColor = 'rgba(56, 189, 248, 0.6)';
    this.ctx.shadowBlur = 6;
    this.ctx.stroke();
    this.ctx.shadowBlur = 0;
  }
}
