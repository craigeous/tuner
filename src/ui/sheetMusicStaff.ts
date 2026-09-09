/**
 * Interactive Sheet Music Staff Component.
 * Supports choosing clef (Treble, Bass, Alto, Tenor), placing notes with
 * accidentals and durations, playback sequencing, and real-time microphone
 * pitch tracking directly onto the staff lines and spaces.
 */

import { freqFromMidi } from '../audio/pitch.ts';
import type { ToneGenerator } from '../audio/toneGenerator.ts';
import type { PitchFrame } from '../audio/audioInput.ts';
import { MiniTuner } from './miniTuner.ts';

export type ClefType = 'treble' | 'bass' | 'alto' | 'tenor';
export type AccidentalType = '' | '#' | 'b';
export type NoteDurationType = 'whole' | 'half' | 'quarter' | 'eighth';

export interface PlacedNote {
  id: string;
  diatonicStep: number;
  baseLetter: string;
  accidental: AccidentalType;
  octave: number;
  midi: number;
  freq: number;
  duration: NoteDurationType;
  beats: number;
}

interface ClefConfig {
  name: string;
  symbol: string;
  bottomLineStep: number; // Diatonic step of Line 1 (bottom line)
  referenceDescription: string;
  clefSvgPath?: string;
}

const CLEF_CONFIGS: Record<ClefType, ClefConfig> = {
  treble: {
    name: 'Treble Clef',
    symbol: '𝄞',
    bottomLineStep: 30, // E4 = 4 * 7 + 2
    referenceDescription: 'Standard for voice, guitar, violin, flute, right-hand piano',
  },
  bass: {
    name: 'Bass Clef',
    symbol: '𝄢',
    bottomLineStep: 18, // G2 = 2 * 7 + 4
    referenceDescription: 'Standard for bass guitar, cello, trombone, left-hand piano',
  },
  alto: {
    name: 'Alto Clef',
    symbol: '𝄡',
    bottomLineStep: 24, // F3 = 3 * 7 + 3 (C4 on Line 3)
    referenceDescription: 'Standard for viola and alto trombone',
  },
  tenor: {
    name: 'Tenor Clef',
    symbol: '𝄡',
    bottomLineStep: 22, // D3 = 3 * 7 + 1 (C4 on Line 4)
    referenceDescription: 'Standard for upper cello, bassoon, and tenor trombone',
  },
};

const DIATONIC_LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const SEMITONES_FROM_C: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

const DURATION_BEATS: Record<NoteDurationType, number> = {
  whole: 4,
  half: 2,
  quarter: 1,
  eighth: 0.5,
};

export class SheetMusicStaff {
  private container: HTMLElement;
  private toneGen: ToneGenerator;
  private a4: number;

  // Staff State
  private activeClef: ClefType = 'treble';
  private activeAccidental: AccidentalType = '';
  private activeDuration: NoteDurationType = 'quarter';
  private placedNotes: PlacedNote[] = [];
  private tempoBpm: number = 100;
  private isPlayingSequence: boolean = false;
  private playbackTimeoutId: number | null = null;
  private activePlayingNoteIndex: number | null = null;
  private showMicIndicator: boolean = true;

  // Cached DOM & SVG elements
  private svgEl!: SVGSVGElement;
  private ghostGroupEl!: SVGGElement;
  private notesGroupEl!: SVGGElement;
  private micIndicatorGroupEl!: SVGGElement;
  private miniTuner!: MiniTuner;
  private tempoLabelEl!: HTMLElement;
  private tempoSliderEl!: HTMLInputElement;
  private playBtnEl!: HTMLButtonElement;

  // Coordinates & Layout Constants
  private readonly staffLeft = 110;
  private readonly staffRight = 770;
  private readonly line1Y = 144; // Bottom line (Line 1)
  private readonly stepHeight = 8; // Half of line spacing (16px / 2 = 8px)

  constructor(container: HTMLElement, toneGen: ToneGenerator, a4: number = 440) {
    this.container = container;
    this.toneGen = toneGen;
    this.a4 = a4;

    this.render();
  }

  public setA4(a4: number): void {
    this.a4 = a4;
    // Recalculate placed note frequencies
    for (const n of this.placedNotes) {
      n.freq = freqFromMidi(n.midi, this.a4);
    }
    this.renderNotes();
  }

  public setClef(clef: ClefType): void {
    this.activeClef = clef;
    this.render();
  }

  /**
   * Updates the live microphone marker on the staff in real-time.
   */
  public updatePitch(frame: PitchFrame): void {
    if (this.miniTuner) {
      this.miniTuner.update(frame);
    }

    if (!this.showMicIndicator || !this.micIndicatorGroupEl) return;

    if (!frame || !frame.note || frame.frequency <= 0) {
      this.micIndicatorGroupEl.style.display = 'none';
      return;
    }

    const n = frame.note;
    // Determine diatonic step from detected note name and octave
    const letter = n.noteName[0];
    const letterIdx = DIATONIC_LETTERS.indexOf(letter);
    if (letterIdx === -1) return;

    const diatonicStep = n.octave * 7 + letterIdx;
    const config = CLEF_CONFIGS[this.activeClef];
    const stepDiff = diatonicStep - config.bottomLineStep;
    const y = this.line1Y - stepDiff * this.stepHeight;

    // Show mic indicator at the current note's pitch height
    this.micIndicatorGroupEl.style.display = 'block';
    this.micIndicatorGroupEl.innerHTML = `
      <!-- Glowing halo -->
      <circle cx="70" cy="${y}" r="11" fill="rgba(16, 185, 129, 0.25)" class="mic-halo-pulse" />
      <circle cx="70" cy="${y}" r="6.5" fill="#10b981" stroke="#fff" stroke-width="1.8" />
      <text x="82" y="${y + 4}" font-size="11" font-weight="700" fill="#10b981" font-family="monospace">
        ${n.noteName}${n.octave} ${n.cents > 0 ? '+' : ''}${n.cents}¢
      </text>
      ${this.renderLedgerLines(70, stepDiff)}
    `;
  }

  private stepToY(diatonicStep: number): number {
    const config = CLEF_CONFIGS[this.activeClef];
    const stepDiff = diatonicStep - config.bottomLineStep;
    return this.line1Y - stepDiff * this.stepHeight;
  }

  private yToStep(y: number): number {
    const config = CLEF_CONFIGS[this.activeClef];
    const stepDiff = Math.round((this.line1Y - y) / this.stepHeight);
    return config.bottomLineStep + stepDiff;
  }

  private stepToNoteInfo(step: number, accidental: AccidentalType) {
    const octave = Math.floor(step / 7);
    const letterIdx = ((step % 7) + 7) % 7;
    const baseLetter = DIATONIC_LETTERS[letterIdx];

    let semitone = SEMITONES_FROM_C[baseLetter];
    if (accidental === '#') semitone += 1;
    if (accidental === 'b') semitone -= 1;

    const midi = (octave + 1) * 12 + semitone;
    const freq = freqFromMidi(midi, this.a4);

    return { octave, baseLetter, midi, freq };
  }

  public addNoteAtStep(step: number): void {
    if (this.placedNotes.length >= 16) {
      alert('Staff is full (16 notes maximum). Click "Clear Staff" to start a new sequence.');
      return;
    }

    const { octave, baseLetter, midi, freq } = this.stepToNoteInfo(step, this.activeAccidental);

    const newNote: PlacedNote = {
      id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      diatonicStep: step,
      baseLetter,
      accidental: this.activeAccidental,
      octave,
      midi,
      freq,
      duration: this.activeDuration,
      beats: DURATION_BEATS[this.activeDuration],
    };

    this.placedNotes.push(newNote);
    this.toneGen.playNote(freq, 0.9, 'acoustic');
    this.renderNotes();
  }

  public removeLastNote(): void {
    if (this.placedNotes.length > 0) {
      this.placedNotes.pop();
      this.renderNotes();
    }
  }

  public clearNotes(): void {
    this.stopPlayback();
    this.placedNotes = [];
    this.renderNotes();
  }

  public loadExampleMelody(): void {
    this.stopPlayback();
    this.placedNotes = [];

    if (this.activeClef === 'treble') {
      // Ode to Joy snippet (Treble)
      const steps = [
        32, 32, 33, 34, 34, 33, 32, 31, 30, 30, 31, 32, 32, 31, 31, // E4 E4 F4 G4 G4 F4 E4 D4 C4 C4 D4 E4 E4 D4 D4
      ];
      for (const s of steps.slice(0, 12)) {
        const { octave, baseLetter, midi, freq } = this.stepToNoteInfo(s, '');
        this.placedNotes.push({
          id: `ex_${Math.random()}`,
          diatonicStep: s,
          baseLetter,
          accidental: '',
          octave,
          midi,
          freq,
          duration: 'quarter',
          beats: 1,
        });
      }
    } else {
      // C Major Arpeggio for Bass/Alto/Tenor
      const base = CLEF_CONFIGS[this.activeClef].bottomLineStep;
      const offsets = [0, 2, 4, 7, 9, 7, 4, 2];
      for (const off of offsets) {
        const s = base + off;
        const { octave, baseLetter, midi, freq } = this.stepToNoteInfo(s, '');
        this.placedNotes.push({
          id: `ex_${Math.random()}`,
          diatonicStep: s,
          baseLetter,
          accidental: '',
          octave,
          midi,
          freq,
          duration: 'quarter',
          beats: 1,
        });
      }
    }

    this.renderNotes();
  }

  public startPlayback(): void {
    if (this.placedNotes.length === 0) return;
    this.isPlayingSequence = true;
    this.playBtnEl.innerHTML = '<span>⏹️</span> Stop';
    this.playBtnEl.classList.add('active');

    let idx = 0;

    const playNext = () => {
      if (!this.isPlayingSequence) return;

      if (idx >= this.placedNotes.length) {
        this.stopPlayback();
        return;
      }

      const note = this.placedNotes[idx];
      this.activePlayingNoteIndex = idx;
      this.renderNotes();

      const secondsPerBeat = 60 / this.tempoBpm;
      const noteDurationSeconds = note.beats * secondsPerBeat;

      this.toneGen.playNote(note.freq, noteDurationSeconds * 0.95, 'acoustic');

      idx++;
      this.playbackTimeoutId = window.setTimeout(playNext, noteDurationSeconds * 1000);
    };

    playNext();
  }

  public stopPlayback(): void {
    this.isPlayingSequence = false;
    if (this.playbackTimeoutId !== null) {
      clearTimeout(this.playbackTimeoutId);
      this.playbackTimeoutId = null;
    }
    this.activePlayingNoteIndex = null;
    if (this.playBtnEl) {
      this.playBtnEl.innerHTML = '<span>▶️</span> Play Melody';
      this.playBtnEl.classList.remove('active');
    }
    this.renderNotes();
  }

  private renderLedgerLines(x: number, stepDiff: number): string {
    let out = '';
    const halfWidth = 14;

    // Ledger lines below Line 1 (stepDiff <= -2)
    if (stepDiff <= -2) {
      for (let s = -2; s >= stepDiff; s -= 2) {
        const ly = this.line1Y - s * this.stepHeight;
        out += `<line x1="${x - halfWidth}" y1="${ly}" x2="${x + halfWidth}" y2="${ly}" stroke="rgba(255, 255, 255, 0.7)" stroke-width="1.8" />`;
      }
    }

    // Ledger lines above Line 5 (stepDiff >= 10, since Line 5 is stepDiff 8)
    if (stepDiff >= 10) {
      for (let s = 10; s <= stepDiff; s += 2) {
        const ly = this.line1Y - s * this.stepHeight;
        out += `<line x1="${x - halfWidth}" y1="${ly}" x2="${x + halfWidth}" y2="${ly}" stroke="rgba(255, 255, 255, 0.7)" stroke-width="1.8" />`;
      }
    }

    return out;
  }

  private renderNotes(): void {
    if (!this.notesGroupEl) return;
    this.notesGroupEl.innerHTML = '';

    const count = this.placedNotes.length;
    if (count === 0) return;

    const availableWidth = this.staffRight - this.staffLeft - 40;
    const spacing = count > 1 ? Math.min(55, availableWidth / count) : 60;

    this.placedNotes.forEach((n, idx) => {
      const x = this.staffLeft + 35 + idx * spacing;
      const y = this.stepToY(n.diatonicStep);
      const config = CLEF_CONFIGS[this.activeClef];
      const stepDiff = n.diatonicStep - config.bottomLineStep;

      // Stem orientation: stems up for notes below middle line (stepDiff < 4), stems down for notes on/above Line 3
      const stemUp = stepDiff < 4;
      const stemHeight = 36;
      const stemX = stemUp ? x + 6.5 : x - 6.5;
      const stemY2 = stemUp ? y - stemHeight : y + stemHeight;

      const isPlaying = idx === this.activePlayingNoteIndex;
      const noteColor = isPlaying ? '#10b981' : '#f8fafc';
      const glowFilter = isPlaying ? 'filter: drop-shadow(0 0 10px #10b981);' : '';

      // Hollow notehead for whole and half notes
      const isHollow = n.duration === 'whole' || n.duration === 'half';
      const hasStem = n.duration !== 'whole';

      let accidentalText = '';
      if (n.accidental === '#') accidentalText = '♯';
      if (n.accidental === 'b') accidentalText = '♭';

      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', `placed-note-group ${isPlaying ? 'playing' : ''}`);
      g.setAttribute('data-idx', String(idx));
      g.style.cursor = 'pointer';

      g.innerHTML = `
        <!-- Click target hitbox -->
        <rect x="${x - 18}" y="${Math.min(y, stemY2) - 10}" width="36" height="${Math.abs(stemHeight) + 25}" fill="transparent" />

        <!-- Ledger lines -->
        ${this.renderLedgerLines(x, stepDiff)}

        <!-- Accidental -->
        ${
          accidentalText
            ? `<text x="${x - 17}" y="${y + 5}" font-size="16" font-weight="700" fill="${noteColor}">${accidentalText}</text>`
            : ''
        }

        <!-- Notehead -->
        <ellipse cx="${x}" cy="${y}" rx="7.2" ry="5.4"
          transform="rotate(-22 ${x} ${y})"
          fill="${isHollow ? '#020617' : noteColor}"
          stroke="${noteColor}"
          stroke-width="${isHollow ? '2.5' : '0'}"
          style="${glowFilter}"
        />

        <!-- Stem -->
        ${
          hasStem
            ? `<line x1="${stemX}" y1="${y}" x2="${stemX}" y2="${stemY2}" stroke="${noteColor}" stroke-width="1.8" />`
            : ''
        }

        <!-- Flag for eighth notes -->
        ${
          n.duration === 'eighth' && hasStem
            ? stemUp
              ? `<path d="M ${stemX} ${stemY2} Q ${stemX + 10} ${stemY2 + 10} ${stemX + 8} ${stemY2 + 20}" stroke="${noteColor}" stroke-width="2" fill="none" />`
              : `<path d="M ${stemX} ${stemY2} Q ${stemX + 10} ${stemY2 - 10} ${stemX + 8} ${stemY2 - 20}" stroke="${noteColor}" stroke-width="2" fill="none" />`
            : ''
        }

        <!-- Pitch Label below -->
        <text x="${x}" y="210" font-size="11" font-weight="700" fill="${noteColor}" text-anchor="middle" font-family="monospace">
          ${n.baseLetter}${n.accidental}${n.octave}
        </text>

        <!-- Delete button on hover -->
        <circle cx="${x}" cy="226" r="7" fill="#ef4444" class="note-delete-btn" />
        <text x="${x}" y="229" font-size="10" font-weight="bold" fill="#fff" text-anchor="middle" pointer-events="none">&times;</text>
      `;

      // Click to solo play or delete note
      g.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.classList.contains('note-delete-btn')) {
          e.stopPropagation();
          this.placedNotes.splice(idx, 1);
          this.renderNotes();
        } else {
          this.toneGen.playNote(n.freq, 1.0, 'acoustic');
        }
      });

      this.notesGroupEl.appendChild(g);
    });
  }

  public render(): void {
    const config = CLEF_CONFIGS[this.activeClef];

    this.container.innerHTML = `
      <div class="sheet-music-card">
        <!-- Tab Header with Clef and Instructions -->
        <div class="sheet-header">
          <div class="sheet-title-wrap">
            <h2>Interactive Sheet Music Staff</h2>
            <p>Pick a clef, select note values and accidentals, then click anywhere on the staff lines to place notes and compose melodies.</p>
          </div>

          <!-- Embedded Live Pitch Monitor -->
          <div id="sheet-mini-tuner" style="width: 100%; max-width: 440px;"></div>
        </div>

        <!-- Controls Toolbar -->
        <div class="sheet-toolbar">
          <!-- 1. Clef Selector -->
          <div class="toolbar-group">
            <span class="group-label">Clef:</span>
            <div class="pill-buttons">
              <button type="button" class="pill-btn ${this.activeClef === 'treble' ? 'active' : ''}" data-clef="treble" title="Treble Clef (G-Clef)">
                𝄞 Treble
              </button>
              <button type="button" class="pill-btn ${this.activeClef === 'bass' ? 'active' : ''}" data-clef="bass" title="Bass Clef (F-Clef)">
                𝄢 Bass
              </button>
              <button type="button" class="pill-btn ${this.activeClef === 'alto' ? 'active' : ''}" data-clef="alto" title="Alto Clef (C-Clef)">
                𝄡 Alto
              </button>
              <button type="button" class="pill-btn ${this.activeClef === 'tenor' ? 'active' : ''}" data-clef="tenor" title="Tenor Clef (C-Clef)">
                𝄡 Tenor
              </button>
            </div>
          </div>

          <!-- 2. Accidental Selector -->
          <div class="toolbar-group">
            <span class="group-label">Accidental:</span>
            <div class="pill-buttons">
              <button type="button" class="pill-btn ${this.activeAccidental === '' ? 'active' : ''}" data-accidental="" title="Natural">
                ♮ Natural
              </button>
              <button type="button" class="pill-btn ${this.activeAccidental === '#' ? 'active' : ''}" data-accidental="#" title="Sharp">
                ♯ Sharp
              </button>
              <button type="button" class="pill-btn ${this.activeAccidental === 'b' ? 'active' : ''}" data-accidental="b" title="Flat">
                ♭ Flat
              </button>
            </div>
          </div>

          <!-- 3. Note Duration -->
          <div class="toolbar-group">
            <span class="group-label">Duration:</span>
            <div class="pill-buttons">
              <button type="button" class="pill-btn ${this.activeDuration === 'quarter' ? 'active' : ''}" data-duration="quarter" title="Quarter Note (1 beat)">
                ♩ Quarter
              </button>
              <button type="button" class="pill-btn ${this.activeDuration === 'half' ? 'active' : ''}" data-duration="half" title="Half Note (2 beats)">
                𝅗𝅥 Half
              </button>
              <button type="button" class="pill-btn ${this.activeDuration === 'whole' ? 'active' : ''}" data-duration="whole" title="Whole Note (4 beats)">
                𝅝 Whole
              </button>
              <button type="button" class="pill-btn ${this.activeDuration === 'eighth' ? 'active' : ''}" data-duration="eighth" title="Eighth Note (0.5 beat)">
                ♪ Eighth
              </button>
            </div>
          </div>

          <!-- 4. Playback and Actions -->
          <div class="toolbar-group">
            <div class="playback-actions">
              <button type="button" class="btn-sheet-play" id="btn-sheet-play">
                <span>▶️</span> Play Melody
              </button>
              <button type="button" class="btn-sheet-action" id="btn-sheet-undo" title="Undo last note">
                <span>↩️</span> Undo
              </button>
              <button type="button" class="btn-sheet-action" id="btn-sheet-clear" title="Clear all notes">
                <span>🗑️</span> Clear
              </button>
              <button type="button" class="btn-sheet-action" id="btn-sheet-example" title="Load example melody">
                <span>🎲</span> Example
              </button>
            </div>
          </div>
        </div>

        <!-- Tempo & Mic Options Strip -->
        <div class="sheet-options-strip">
          <div class="tempo-control-wrap">
            <label for="sheet-tempo-slider">Tempo:</label>
            <input type="range" id="sheet-tempo-slider" min="50" max="200" step="5" value="${this.tempoBpm}" />
            <span class="value-text" id="sheet-tempo-val">${this.tempoBpm} BPM</span>
          </div>

          <label class="sheet-checkbox-label">
            <input type="checkbox" id="sheet-mic-toggle" ${this.showMicIndicator ? 'checked' : ''} />
            <span>Show Microphone Pitch Tracking on Staff</span>
          </label>

          <span class="sheet-clef-desc">
            <strong>${config.name}:</strong> ${config.referenceDescription}
          </span>
        </div>

        <!-- SVG Sheet Music Canvas -->
        <div class="sheet-svg-wrapper">
          <svg class="staff-svg" id="staff-svg" viewBox="0 0 800 240" preserveAspectRatio="xMidYMid meet">
            <!-- Background Glow for Staff Area -->
            <rect x="20" y="20" width="760" height="200" rx="10" fill="#040814" stroke="rgba(255, 255, 255, 0.08)" />

            <!-- The 5 Staff Lines -->
            <line x1="${this.staffLeft - 50}" y1="80" x2="${this.staffRight}" y2="80" stroke="rgba(255, 255, 255, 0.55)" stroke-width="1.8" />
            <line x1="${this.staffLeft - 50}" y1="96" x2="${this.staffRight}" y2="96" stroke="rgba(255, 255, 255, 0.55)" stroke-width="1.8" />
            <line x1="${this.staffLeft - 50}" y1="112" x2="${this.staffRight}" y2="112" stroke="rgba(255, 255, 255, 0.55)" stroke-width="1.8" />
            <line x1="${this.staffLeft - 50}" y1="128" x2="${this.staffRight}" y2="128" stroke="rgba(255, 255, 255, 0.55)" stroke-width="1.8" />
            <line x1="${this.staffLeft - 50}" y1="144" x2="${this.staffRight}" y2="144" stroke="rgba(255, 255, 255, 0.55)" stroke-width="1.8" />

            <!-- Start & End Vertical Bar Lines -->
            <line x1="${this.staffLeft - 50}" y1="80" x2="${this.staffLeft - 50}" y2="144" stroke="rgba(255, 255, 255, 0.7)" stroke-width="2.5" />
            <line x1="${this.staffRight}" y1="80" x2="${this.staffRight}" y2="144" stroke="rgba(255, 255, 255, 0.7)" stroke-width="2.5" />
            <line x1="${this.staffRight - 6}" y1="80" x2="${this.staffRight - 6}" y2="144" stroke="rgba(255, 255, 255, 0.4)" stroke-width="1.5" />

            <!-- Clef Symbol -->
            <text x="${this.staffLeft - 38}" y="${this.activeClef === 'treble' ? 142 : this.activeClef === 'bass' ? 134 : 124}"
              font-size="${this.activeClef === 'treble' ? '68' : '52'}"
              fill="#38bdf8"
              font-weight="bold"
              pointer-events="none"
              style="user-select: none;">
              ${config.symbol}
            </text>

            <!-- 4/4 Time Signature -->
            <text x="${this.staffLeft - 2}" y="108" font-size="22" font-weight="900" fill="#94a3b8" text-anchor="middle" pointer-events="none">4</text>
            <text x="${this.staffLeft - 2}" y="136" font-size="22" font-weight="900" fill="#94a3b8" text-anchor="middle" pointer-events="none">4</text>

            <!-- Interactive Clickable Staff Area -->
            <rect id="staff-interaction-area" x="${this.staffLeft}" y="30" width="${this.staffRight - this.staffLeft}" height="175" fill="transparent" style="cursor: crosshair;" />

            <!-- Group for Placed Notes -->
            <g id="staff-notes-group"></g>

            <!-- Group for Hover Ghost Note -->
            <g id="staff-ghost-group" pointer-events="none" style="display: none;"></g>

            <!-- Group for Microphone Live Pitch Indicator -->
            <g id="staff-mic-group" pointer-events="none" style="display: none;"></g>
          </svg>
        </div>

        <div class="sheet-footer-hint">
          <span>💡 <strong>Tip:</strong> Hover over any line or space to preview the note name, click to place it, and click placed notes to play them.</span>
        </div>
      </div>
    `;

    // Cache elements
    this.svgEl = this.container.querySelector('#staff-svg')!;
    this.ghostGroupEl = this.container.querySelector('#staff-ghost-group')!;
    this.notesGroupEl = this.container.querySelector('#staff-notes-group')!;
    this.micIndicatorGroupEl = this.container.querySelector('#staff-mic-group')!;
    this.playBtnEl = this.container.querySelector('#btn-sheet-play')!;
    this.tempoLabelEl = this.container.querySelector('#sheet-tempo-val')!;
    this.tempoSliderEl = this.container.querySelector('#sheet-tempo-slider')!;

    // Mini Tuner inside Sheet Music tab
    const miniContainer = this.container.querySelector<HTMLElement>('#sheet-mini-tuner')!;
    this.miniTuner = new MiniTuner(miniContainer, {
      label: 'Live Pitch Monitor (Staff)',
      compact: true,
    });

    // Wire Clef Selection buttons
    this.container.querySelectorAll<HTMLButtonElement>('[data-clef]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const c = btn.getAttribute('data-clef') as ClefType;
        if (c) this.setClef(c);
      });
    });

    // Wire Accidental buttons
    this.container.querySelectorAll<HTMLButtonElement>('[data-accidental]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.container.querySelectorAll('[data-accidental]').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeAccidental = (btn.getAttribute('data-accidental') || '') as AccidentalType;
      });
    });

    // Wire Duration buttons
    this.container.querySelectorAll<HTMLButtonElement>('[data-duration]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.container.querySelectorAll('[data-duration]').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.activeDuration = btn.getAttribute('data-duration') as NoteDurationType;
      });
    });

    // Wire Playback Buttons
    this.playBtnEl.addEventListener('click', () => {
      if (this.isPlayingSequence) {
        this.stopPlayback();
      } else {
        this.startPlayback();
      }
    });

    this.container.querySelector('#btn-sheet-undo')?.addEventListener('click', () => this.removeLastNote());
    this.container.querySelector('#btn-sheet-clear')?.addEventListener('click', () => this.clearNotes());
    this.container.querySelector('#btn-sheet-example')?.addEventListener('click', () => this.loadExampleMelody());

    // Wire Tempo Slider
    this.tempoSliderEl.addEventListener('input', () => {
      this.tempoBpm = parseInt(this.tempoSliderEl.value, 10);
      this.tempoLabelEl.textContent = `${this.tempoBpm} BPM`;
    });

    // Wire Mic Toggle
    this.container.querySelector<HTMLInputElement>('#sheet-mic-toggle')?.addEventListener('change', (e) => {
      this.showMicIndicator = (e.target as HTMLInputElement).checked;
      if (!this.showMicIndicator && this.micIndicatorGroupEl) {
        this.micIndicatorGroupEl.style.display = 'none';
      }
    });

    // Wire SVG Mouse Hover & Click Interaction
    const interactionArea = this.container.querySelector<SVGRectElement>('#staff-interaction-area')!;

    const getSvgCoordinates = (e: MouseEvent) => {
      const pt = this.svgEl.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const ctm = this.svgEl.getScreenCTM();
      if (ctm) {
        return pt.matrixTransform(ctm.inverse());
      }
      return { x: e.offsetX, y: e.offsetY };
    };

    interactionArea.addEventListener('mousemove', (e) => {
      const pt = getSvgCoordinates(e);
      const step = this.yToStep(pt.y);
      const snappedY = this.stepToY(step);
      const config = CLEF_CONFIGS[this.activeClef];
      const stepDiff = step - config.bottomLineStep;

      const { octave, baseLetter } = this.stepToNoteInfo(step, this.activeAccidental);
      const noteLabel = `${baseLetter}${this.activeAccidental}${octave}`;

      this.ghostGroupEl.style.display = 'block';
      this.ghostGroupEl.innerHTML = `
        <!-- Ledger Lines -->
        ${this.renderLedgerLines(pt.x, stepDiff)}

        <!-- Ghost Notehead -->
        <ellipse cx="${pt.x}" cy="${snappedY}" rx="7.2" ry="5.4" transform="rotate(-22 ${pt.x} ${snappedY})" fill="rgba(56, 189, 248, 0.45)" stroke="#38bdf8" stroke-width="1.5" />

        <!-- Ghost Label -->
        <rect x="${pt.x - 20}" y="${snappedY - 24}" width="40" height="17" rx="4" fill="#0f172a" stroke="#38bdf8" stroke-width="1" />
        <text x="${pt.x}" y="${snappedY - 12}" font-size="11" font-weight="700" fill="#38bdf8" text-anchor="middle" font-family="monospace">
          ${noteLabel}
        </text>
      `;
    });

    interactionArea.addEventListener('mouseleave', () => {
      this.ghostGroupEl.style.display = 'none';
    });

    interactionArea.addEventListener('click', (e) => {
      const pt = getSvgCoordinates(e);
      const step = this.yToStep(pt.y);
      this.addNoteAtStep(step);
    });

    // Render placed notes
    this.renderNotes();
  }
}
