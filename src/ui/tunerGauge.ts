/**
 * Tuner Needle Gauge and Precision Strobe Visualizer.
 * High-performance Canvas renderer with smooth spring physics and stroboscopic motion.
 */

import type { NoteInfo } from '../audio/pitch.ts';

export class TunerGauge {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  // Spring physics for smooth needle movement
  private currentCents = 0;
  private targetCents = 0;
  private needleVelocity = 0;
  private hasActiveNote = false;

  // Strobe animation state
  private strobeOffset = 0;
  private lastTime = performance.now();

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true })!;
    this.handleResize();
    window.addEventListener('resize', this.handleResize);
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

  public update(note: NoteInfo | null): void {
    if (note && note.frequency > 0) {
      this.hasActiveNote = true;
      this.targetCents = Math.max(-50, Math.min(50, note.cents));
    } else {
      this.hasActiveNote = false;
      this.targetCents = 0;
    }
    this.renderFrame();
  }

  private renderFrame = (): void => {
    const now = performance.now();
    const dt = Math.min(0.1, (now - this.lastTime) / 1000);
    this.lastTime = now;

    // Smooth critically damped spring physics for the needle
    const stiffness = 120;
    const damping = 16;
    const force = (this.targetCents - this.currentCents) * stiffness;
    const dampingForce = -this.needleVelocity * damping;
    const acceleration = force + dampingForce;

    this.needleVelocity += acceleration * dt;
    this.currentCents += this.needleVelocity * dt;

    // Strobe motion: speed and direction proportional to cents error
    if (this.hasActiveNote) {
      // Rotate / translate strobe bar
      const speed = this.currentCents * 35; // pixels per second
      this.strobeOffset = (this.strobeOffset + speed * dt) % 40;
    }

    this.draw();
  };

  public draw(): void {
    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    if (width === 0 || height === 0) return;

    this.ctx.clearRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height * 0.72;
    const radius = Math.min(width * 0.44, height * 0.62);

    // 1. Draw outer gauge arc
    const startAngle = Math.PI * 0.82;
    const endAngle = Math.PI * 2.18;
    const totalAngle = endAngle - startAngle;

    this.ctx.save();

    // Arc background track
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    this.ctx.lineWidth = 10;
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    this.ctx.lineCap = 'round';
    this.ctx.stroke();

    // Center in-tune safe zone (green highlight on arc between -5 and +5 cents)
    const zeroAngle = startAngle + totalAngle * 0.5;
    const safeAngleDelta = (5 / 100) * totalAngle;

    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, radius, zeroAngle - safeAngleDelta, zeroAngle + safeAngleDelta);
    this.ctx.lineWidth = 12;
    this.ctx.strokeStyle = 'rgba(16, 185, 129, 0.45)';
    this.ctx.stroke();

    // 2. Draw tick marks & labels
    const ticks = [
      { cents: -50, label: '-50' },
      { cents: -40, label: '' },
      { cents: -30, label: '-30' },
      { cents: -20, label: '' },
      { cents: -10, label: '-10' },
      { cents: 0,   label: '0' },
      { cents: 10,  label: '+10' },
      { cents: 20,  label: '' },
      { cents: 30,  label: '+30' },
      { cents: 40,  label: '' },
      { cents: 50,  label: '+50' },
    ];

    for (const tick of ticks) {
      const frac = (tick.cents + 50) / 100;
      const angle = startAngle + frac * totalAngle;
      const isMajor = tick.cents % 10 === 0;
      const isZero = tick.cents === 0;

      const innerR = isZero ? radius - 18 : isMajor ? radius - 14 : radius - 8;
      const outerR = radius + 6;

      const x1 = centerX + Math.cos(angle) * innerR;
      const y1 = centerY + Math.sin(angle) * innerR;
      const x2 = centerX + Math.cos(angle) * outerR;
      const y2 = centerY + Math.sin(angle) * outerR;

      this.ctx.beginPath();
      this.ctx.moveTo(x1, y1);
      this.ctx.lineTo(x2, y2);
      this.ctx.lineWidth = isZero ? 3.5 : isMajor ? 2 : 1;
      this.ctx.strokeStyle = isZero ? '#10b981' : isMajor ? 'rgba(255, 255, 255, 0.45)' : 'rgba(255, 255, 255, 0.2)';
      this.ctx.stroke();

      // Tick text label
      if (tick.label) {
        const textR = radius - 28;
        const tx = centerX + Math.cos(angle) * textR;
        const ty = centerY + Math.sin(angle) * textR;

        this.ctx.fillStyle = isZero ? '#10b981' : 'rgba(255, 255, 255, 0.5)';
        this.ctx.font = isZero ? '600 13px system-ui, sans-serif' : '500 11px system-ui, sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(tick.label, tx, ty);
      }
    }

    // 3. Draw Needle
    const clampedCents = Math.max(-50, Math.min(50, this.currentCents));
    const needleFrac = (clampedCents + 50) / 100;
    const needleAngle = startAngle + needleFrac * totalAngle;

    // Determine needle color based on tuning accuracy
    const absCents = Math.abs(clampedCents);
    let needleColor = '#ef4444'; // Red
    let glowColor = 'rgba(239, 68, 68, 0.5)';

    if (!this.hasActiveNote) {
      needleColor = 'rgba(255, 255, 255, 0.25)';
      glowColor = 'transparent';
    } else if (absCents <= 3) {
      needleColor = '#10b981'; // Emerald Green (Dead-on)
      glowColor = 'rgba(16, 185, 129, 0.8)';
    } else if (absCents <= 7) {
      needleColor = '#84cc16'; // Lime Green (Very close)
      glowColor = 'rgba(132, 204, 22, 0.6)';
    } else if (absCents <= 15) {
      needleColor = '#f59e0b'; // Amber (Close)
      glowColor = 'rgba(245, 158, 11, 0.5)';
    }

    // Needle shadow / glow
    if (this.hasActiveNote) {
      this.ctx.shadowColor = glowColor;
      this.ctx.shadowBlur = 12;
    }

    const needleLength = radius + 2;
    const nx = centerX + Math.cos(needleAngle) * needleLength;
    const ny = centerY + Math.sin(needleAngle) * needleLength;

    // Draw tapered needle
    const perpAngle = needleAngle + Math.PI / 2;
    const baseW = 5;
    const bx1 = centerX + Math.cos(perpAngle) * baseW;
    const by1 = centerY + Math.sin(perpAngle) * baseW;
    const bx2 = centerX - Math.cos(perpAngle) * baseW;
    const by2 = centerY - Math.sin(perpAngle) * baseW;

    this.ctx.beginPath();
    this.ctx.moveTo(bx1, by1);
    this.ctx.lineTo(nx, ny);
    this.ctx.lineTo(bx2, by2);
    this.ctx.closePath();
    this.ctx.fillStyle = needleColor;
    this.ctx.fill();

    // Reset shadow
    this.ctx.shadowBlur = 0;

    // Needle pivot hub
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, 9, 0, Math.PI * 2);
    this.ctx.fillStyle = '#1e293b';
    this.ctx.fill();
    this.ctx.lineWidth = 3;
    this.ctx.strokeStyle = needleColor;
    this.ctx.stroke();

    // 4. Precision Strobe Strip at bottom
    const strobeY = height - 26;
    const strobeW = Math.min(width * 0.75, 360);
    const strobeH = 14;
    const strobeX = centerX - strobeW / 2;

    // Strobe background container
    this.ctx.fillStyle = '#0f172a';
    this.ctx.beginPath();
    this.ctx.roundRect(strobeX, strobeY, strobeW, strobeH, 7);
    this.ctx.fill();
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();

    // Clip to strobe container
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.roundRect(strobeX, strobeY, strobeW, strobeH, 7);
    this.ctx.clip();

    // Draw strobe pattern bars
    const barWidth = 12;
    const spacing = 24;
    const startX = strobeX - 40 + (this.strobeOffset % spacing);

    for (let x = startX; x < strobeX + strobeW + 40; x += spacing) {
      this.ctx.fillStyle = this.hasActiveNote
        ? absCents <= 3
          ? 'rgba(16, 185, 129, 0.9)'
          : absCents <= 10
          ? 'rgba(245, 158, 11, 0.7)'
          : 'rgba(239, 68, 68, 0.7)'
        : 'rgba(255, 255, 255, 0.1)';
      this.ctx.fillRect(x, strobeY, barWidth, strobeH);
    }

    // Center lock line on strobe
    this.ctx.beginPath();
    this.ctx.moveTo(centerX, strobeY);
    this.ctx.lineTo(centerX, strobeY + strobeH);
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    this.ctx.restore();
    this.ctx.restore();
  }
}
