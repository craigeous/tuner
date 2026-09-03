/**
 * Compact Live Pitch Monitor / Mini-Tuner Widget.
 * Can be embedded in any tab (Tone Generator, Piano Roll, Ear Trainer)
 * so musicians and vocalists can always see their note, pitch accuracy,
 * and cents offset while playing reference tones.
 */

import type { PitchFrame } from '../audio/audioInput.ts';

export interface MiniTunerOptions {
  showReferenceComparison?: boolean;
  compact?: boolean;
  label?: string;
}

export class MiniTuner {
  private container: HTMLElement;
  private options: MiniTunerOptions;

  // Cached DOM elements
  private noteLetterEl!: HTMLElement;
  private noteOctaveEl!: HTMLElement;
  private centsEl!: HTMLElement;
  private freqEl!: HTMLElement;
  private meterBarEl!: HTMLElement;
  private statusBadgeEl!: HTMLElement;
  private comparisonEl?: HTMLElement;

  constructor(container: HTMLElement, options: MiniTunerOptions = {}) {
    this.container = container;
    this.options = options;
    this.render();
  }

  public update(frame: PitchFrame, referenceFreq?: number, referenceNoteName?: string): void {
    if (!frame || !frame.note || frame.frequency <= 0) {
      this.resetUI();
      return;
    }

    const n = frame.note;
    this.noteLetterEl.textContent = `${n.noteName}`;
    this.noteOctaveEl.textContent = `${n.octave}`;

    const sign = n.cents > 0 ? '+' : '';
    this.centsEl.textContent = `${sign}${n.cents}¢`;
    this.freqEl.textContent = `${n.frequency.toFixed(1)} Hz`;

    // Position meter pointer (-50 cents = 0%, 0 cents = 50%, +50 cents = 100%)
    const clampedCents = Math.max(-50, Math.min(50, n.cents));
    const pct = ((clampedCents + 50) / 100) * 100;
    this.meterBarEl.style.left = `${pct}%`;

    // Visual color feedback
    const absCents = Math.abs(n.cents);
    this.statusBadgeEl.className = 'mini-status-badge';
    this.meterBarEl.className = 'mini-meter-needle';

    if (absCents <= 3) {
      this.statusBadgeEl.classList.add('in-tune');
      this.statusBadgeEl.textContent = '✓ IN TUNE';
      this.meterBarEl.classList.add('in-tune');
    } else if (absCents <= 8) {
      this.statusBadgeEl.classList.add('close');
      this.statusBadgeEl.textContent = n.cents < 0 ? '▲ SLIGHTLY FLAT' : '▼ SLIGHTLY SHARP';
      this.meterBarEl.classList.add('close');
    } else if (n.cents < 0) {
      this.statusBadgeEl.classList.add('flat');
      this.statusBadgeEl.textContent = `▲ TUNE UP (${Math.abs(n.cents)}¢)`;
      this.meterBarEl.classList.add('flat');
    } else {
      this.statusBadgeEl.classList.add('sharp');
      this.statusBadgeEl.textContent = `▼ TUNE DOWN (+${n.cents}¢)`;
      this.meterBarEl.classList.add('sharp');
    }

    // Comparison against active reference tone if provided
    if (this.comparisonEl && referenceFreq && referenceFreq > 0) {
      const diffCents = Math.round(1200 * Math.log2(frame.frequency / referenceFreq));
      const absDiff = Math.abs(diffCents);

      if (absDiff <= 3) {
        this.comparisonEl.innerHTML = `
          <span class="match-badge in-tune">🎯 Tone Matched!</span>
          <span>Target: <strong>${referenceNoteName || ''} (${referenceFreq.toFixed(1)} Hz)</strong></span>
        `;
      } else {
        const dir = diffCents < 0 ? `▲ Sing higher (${Math.abs(diffCents)}¢ flat)` : `▼ Sing lower (+${diffCents}¢ sharp)`;
        this.comparisonEl.innerHTML = `
          <span class="match-badge ${absDiff <= 10 ? 'close' : 'off'}">${dir}</span>
          <span>Target: <strong>${referenceNoteName || ''} (${referenceFreq.toFixed(1)} Hz)</strong></span>
        `;
      }
    }
  }

  private resetUI(): void {
    this.noteLetterEl.textContent = '-';
    this.noteOctaveEl.textContent = '';
    this.centsEl.textContent = '0¢';
    this.freqEl.textContent = '0.0 Hz';
    this.meterBarEl.style.left = '50%';
    this.meterBarEl.className = 'mini-meter-needle';
    this.statusBadgeEl.className = 'mini-status-badge';
    this.statusBadgeEl.textContent = 'Listening...';

    if (this.comparisonEl) {
      this.comparisonEl.innerHTML = '<span style="color: var(--text-muted);">Sing or play to match tone...</span>';
    }
  }

  private render(): void {
    const title = this.options.label || 'Live Pitch Monitor';

    this.container.innerHTML = `
      <div class="mini-tuner-card ${this.options.compact ? 'compact' : ''}">
        <div class="mini-tuner-top">
          <span class="mini-tuner-title">🎤 ${title}</span>
          <span class="mini-status-badge" id="mini-status">Listening...</span>
        </div>

        <div class="mini-tuner-body">
          <div class="mini-note-display">
            <span class="mini-note-letter" id="mini-note-letter">-</span>
            <span class="mini-note-octave" id="mini-note-octave"></span>
          </div>

          <div class="mini-gauge-track-wrap">
            <div class="mini-gauge-track">
              <div class="mini-safe-band"></div>
              <div class="mini-center-tick"></div>
              <div class="mini-meter-needle" id="mini-needle"></div>
            </div>
            <div class="mini-gauge-labels">
              <span>-50¢</span>
              <span>0¢</span>
              <span>+50¢</span>
            </div>
          </div>

          <div class="mini-stats">
            <span class="mini-cents" id="mini-cents">0¢</span>
            <span class="mini-freq" id="mini-freq">0.0 Hz</span>
          </div>
        </div>

        ${
          this.options.showReferenceComparison
            ? `<div class="mini-comparison-bar" id="mini-comparison">
                 <span style="color: var(--text-muted);">Sing or play to match tone...</span>
               </div>`
            : ''
        }
      </div>
    `;

    this.noteLetterEl = this.container.querySelector('#mini-note-letter')!;
    this.noteOctaveEl = this.container.querySelector('#mini-note-octave')!;
    this.centsEl = this.container.querySelector('#mini-cents')!;
    this.freqEl = this.container.querySelector('#mini-freq')!;
    this.meterBarEl = this.container.querySelector('#mini-needle')!;
    this.statusBadgeEl = this.container.querySelector('#mini-status')!;

    if (this.options.showReferenceComparison) {
      this.comparisonEl = this.container.querySelector('#mini-comparison')!;
    }
  }
}
