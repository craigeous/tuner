/**
 * Interactive Sheet Music Staff Component with Complete Time Signature & Timing Controls.
 * Supports choosing clef (Treble, Bass, Alto, Tenor), arbitrary time signatures with separate
 * top (beats/measure) and bottom (beat unit) selectors, note durations (Whole, Half, Quarter,
 * Eighth, Sixteenth), in-place timing editing of placed notes, automatic measure barlines,
 * metronome click on playback, and real-time microphone pitch tracking.
 */

import { freqFromMidi } from '../audio/pitch.ts';
import type { ToneGenerator } from '../audio/toneGenerator.ts';
import type { PitchFrame } from '../audio/audioInput.ts';
import { MiniTuner } from './miniTuner.ts';

export type ClefType = 'treble' | 'bass' | 'alto' | 'tenor';
export type AccidentalType = '' | '#' | 'b';
export type NoteDurationType = 'whole' | 'half' | 'quarter' | 'eighth' | 'sixteenth';

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
  sixteenth: 0.25,
};

export class SheetMusicStaff {
  private container: HTMLElement;
  private toneGen: ToneGenerator;
  private a4: number;

  // Staff & Timing State
  private activeClef: ClefType = 'treble';
  private timeSigTop: number = 4; // Top piece: beats per measure (1 to 32)
  private timeSigBottom: number = 4; // Bottom piece: beat unit (1, 2, 4, 8, 16, 32)
  private activeAccidental: AccidentalType = '';
  private activeDuration: NoteDurationType = 'quarter';
  private placedNotes: PlacedNote[] = [];
  private selectedNoteIndex: number | null = null;

  // Playback & Metronome State
  private tempoBpm: number = 100;
  private isPlayingSequence: boolean = false;
  private playbackTimeoutId: number | null = null;
  private activePlayingNoteIndex: number | null = null;
  private enableMetronome: boolean = true;
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
  private selectionStatusEl!: HTMLElement;

  // Coordinates & Layout Constants
  private readonly staffLeft = 120;
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
   * Set custom time signature top and bottom pieces.
   * top = Beats per measure (e.g. 2, 3, 4, 5, 6, 7, 9, 12)
   * bottom = Beat note value (1=whole, 2=half, 4=quarter, 8=eighth, 16=sixteenth, 32=thirty-second)
   */
  public setTimeSignature(top: number, bottom: number): void {
    this.timeSigTop = Math.max(1, Math.min(32, Math.round(top)));
    this.timeSigBottom = Math.max(1, Math.min(32, Math.round(bottom)));
    this.render();
  }

  public getTimeSignature(): { top: number; bottom: number } {
    return { top: this.timeSigTop, bottom: this.timeSigBottom };
  }

  /**
   * Calculates measure length in quarter-note equivalent beats.
   * e.g., in 4/4: 4 * (4/4) = 4 beats
   *       in 3/4: 3 * (4/4) = 3 beats
   *       in 6/8: 6 * (4/8) = 3 beats
   *       in 7/8: 7 * (4/8) = 3.5 beats
   *       in 5/4: 5 * (4/4) = 5 beats
   */
  public getBeatsPerMeasure(): number {
    return this.timeSigTop * (4 / this.timeSigBottom);
  }

  public setDuration(duration: NoteDurationType): void {
    this.activeDuration = duration;

    // If a note is currently selected, update its duration directly!
    if (this.selectedNoteIndex !== null && this.placedNotes[this.selectedNoteIndex]) {
      const note = this.placedNotes[this.selectedNoteIndex];
      note.duration = duration;
      note.beats = DURATION_BEATS[duration];
      this.renderNotes();
      this.updateSelectionStatus();
    }
  }

  public setAccidental(accidental: AccidentalType): void {
    this.activeAccidental = accidental;

    // If a note is currently selected, update its accidental directly!
    if (this.selectedNoteIndex !== null && this.placedNotes[this.selectedNoteIndex]) {
      const note = this.placedNotes[this.selectedNoteIndex];
      note.accidental = accidental;
      const { midi, freq } = this.stepToNoteInfo(note.diatonicStep, accidental);
      note.midi = midi;
      note.freq = freq;
      this.renderNotes();
      this.updateSelectionStatus();
    }
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
    const letter = n.noteName[0];
    const letterIdx = DIATONIC_LETTERS.indexOf(letter);
    if (letterIdx === -1) return;

    const diatonicStep = n.octave * 7 + letterIdx;
    const config = CLEF_CONFIGS[this.activeClef];
    const stepDiff = diatonicStep - config.bottomLineStep;
    const y = this.line1Y - stepDiff * this.stepHeight;

    this.micIndicatorGroupEl.style.display = 'block';
    this.micIndicatorGroupEl.innerHTML = `
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
    if (this.placedNotes.length >= 20) {
      alert('Staff has reached maximum notes (20 notes). Clear or delete notes to add more.');
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
    this.selectedNoteIndex = this.placedNotes.length - 1;
    this.toneGen.playNote(freq, 0.8, 'acoustic');
    this.renderNotes();
    this.updateSelectionStatus();
  }

  public removeLastNote(): void {
    if (this.placedNotes.length > 0) {
      this.placedNotes.pop();
      if (this.selectedNoteIndex !== null && this.selectedNoteIndex >= this.placedNotes.length) {
        this.selectedNoteIndex = null;
      }
      this.renderNotes();
      this.updateSelectionStatus();
    }
  }

  public clearNotes(): void {
    this.stopPlayback();
    this.placedNotes = [];
    this.selectedNoteIndex = null;
    this.renderNotes();
    this.updateSelectionStatus();
  }

  public loadExampleMelody(): void {
    this.stopPlayback();
    this.placedNotes = [];
    this.selectedNoteIndex = null;

    if (this.activeClef === 'treble') {
      if (this.timeSigTop === 3) {
        // Waltz rhythm in 3/4
        const steps = [28, 30, 32, 33, 32, 30, 28, 32, 35]; // C4 D4 E4 F4 E4 D4 C4 E4 G4
        const durs: NoteDurationType[] = ['half', 'quarter', 'half', 'quarter', 'quarter', 'quarter', 'quarter', 'half', 'quarter'];
        steps.forEach((s, i) => {
          const { octave, baseLetter, midi, freq } = this.stepToNoteInfo(s, '');
          const dur = durs[i] || 'quarter';
          this.placedNotes.push({
            id: `ex_${i}`,
            diatonicStep: s,
            baseLetter,
            accidental: '',
            octave,
            midi,
            freq,
            duration: dur,
            beats: DURATION_BEATS[dur],
          });
        });
      } else {
        // Ode to Joy melody
        const steps = [32, 32, 33, 34, 34, 33, 32, 31, 30, 30, 31, 32, 32, 31, 31];
        steps.slice(0, 12).forEach((s, i) => {
          const { octave, baseLetter, midi, freq } = this.stepToNoteInfo(s, '');
          const dur: NoteDurationType = i === 11 ? 'half' : 'quarter';
          this.placedNotes.push({
            id: `ex_${i}`,
            diatonicStep: s,
            baseLetter,
            accidental: '',
            octave,
            midi,
            freq,
            duration: dur,
            beats: DURATION_BEATS[dur],
          });
        });
      }
    } else {
      // Arpeggio pattern
      const base = CLEF_CONFIGS[this.activeClef].bottomLineStep;
      const offsets = [0, 2, 4, 7, 9, 7, 4, 0];
      offsets.forEach((off, i) => {
        const s = base + off;
        const { octave, baseLetter, midi, freq } = this.stepToNoteInfo(s, '');
        this.placedNotes.push({
          id: `ex_${i}`,
          diatonicStep: s,
          baseLetter,
          accidental: '',
          octave,
          midi,
          freq,
          duration: 'quarter',
          beats: 1,
        });
      });
    }

    this.renderNotes();
    this.updateSelectionStatus();
  }

  public startPlayback(): void {
    if (this.placedNotes.length === 0) return;
    this.isPlayingSequence = true;
    this.playBtnEl.innerHTML = '<span>⏹️</span> Stop';
    this.playBtnEl.classList.add('active');

    let idx = 0;
    const secondsPerBeat = 60 / this.tempoBpm;

    const playNext = () => {
      if (!this.isPlayingSequence) return;

      if (idx >= this.placedNotes.length) {
        this.stopPlayback();
        return;
      }

      const note = this.placedNotes[idx];
      this.activePlayingNoteIndex = idx;
      this.renderNotes();

      const noteDurationSeconds = note.beats * secondsPerBeat;

      // Metronome click on beat
      if (this.enableMetronome) {
        const isMeasureStart = idx === 0 || this.isMeasureBoundary(idx);
        const clickFreq = isMeasureStart ? 1100 : 750;
        this.toneGen.playNote(clickFreq, 0.035, 'sine');
      }

      this.toneGen.playNote(note.freq, Math.max(0.1, noteDurationSeconds * 0.92), 'acoustic');

      idx++;
      this.playbackTimeoutId = window.setTimeout(playNext, noteDurationSeconds * 1000);
    };

    playNext();
  }

  private isMeasureBoundary(noteIdx: number): boolean {
    const beatsPerMeasure = this.getBeatsPerMeasure();
    let sum = 0;
    for (let i = 0; i < noteIdx; i++) {
      sum += this.placedNotes[i].beats;
    }
    return sum > 0 && Math.abs(sum % beatsPerMeasure) < 0.01;
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

  private updateSelectionStatus(): void {
    if (!this.selectionStatusEl) return;

    if (this.selectedNoteIndex !== null && this.placedNotes[this.selectedNoteIndex]) {
      const n = this.placedNotes[this.selectedNoteIndex];
      this.selectionStatusEl.innerHTML = `
        <div class="note-selected-pill">
          <span>🎯 Note ${this.selectedNoteIndex + 1}: <strong>${n.baseLetter}${n.accidental}${n.octave}</strong> (${n.duration}, ${n.beats} beat${n.beats === 1 ? '' : 's'})</span>
          <span class="selection-action-tip">👉 Click Duration or Accidental buttons above to edit timing in-place.</span>
          <button type="button" class="btn-deselect-note" id="btn-deselect-note" title="Deselect note">✕</button>
        </div>
      `;
      this.selectionStatusEl.querySelector('#btn-deselect-note')?.addEventListener('click', () => {
        this.selectedNoteIndex = null;
        this.renderNotes();
        this.updateSelectionStatus();
      });
    } else {
      this.selectionStatusEl.innerHTML = '';
    }
  }

  private renderLedgerLines(x: number, stepDiff: number): string {
    let out = '';
    const halfWidth = 14;

    if (stepDiff <= -2) {
      for (let s = -2; s >= stepDiff; s -= 2) {
        const ly = this.line1Y - s * this.stepHeight;
        out += `<line x1="${x - halfWidth}" y1="${ly}" x2="${x + halfWidth}" y2="${ly}" stroke="rgba(255, 255, 255, 0.7)" stroke-width="1.8" />`;
      }
    }

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
    const spacing = count > 1 ? Math.min(52, availableWidth / count) : 60;
    const beatsPerMeasure = this.getBeatsPerMeasure();

    let accumulatedBeats = 0;
    let measureCount = 1;

    this.placedNotes.forEach((n, idx) => {
      const x = this.staffLeft + 35 + idx * spacing;
      const y = this.stepToY(n.diatonicStep);
      const config = CLEF_CONFIGS[this.activeClef];
      const stepDiff = n.diatonicStep - config.bottomLineStep;

      const stemUp = stepDiff < 4;
      const stemHeight = 36;
      const stemX = stemUp ? x + 6.5 : x - 6.5;
      const stemY2 = stemUp ? y - stemHeight : y + stemHeight;

      const isPlaying = idx === this.activePlayingNoteIndex;
      const isSelected = idx === this.selectedNoteIndex;

      let noteColor = '#f8fafc';
      if (isPlaying) noteColor = '#10b981';
      else if (isSelected) noteColor = '#38bdf8';

      const glowFilter = isPlaying
        ? 'filter: drop-shadow(0 0 10px #10b981);'
        : isSelected
          ? 'filter: drop-shadow(0 0 8px #38bdf8);'
          : '';

      const isHollow = n.duration === 'whole' || n.duration === 'half';
      const hasStem = n.duration !== 'whole';

      let accidentalText = '';
      if (n.accidental === '#') accidentalText = '♯';
      if (n.accidental === 'b') accidentalText = '♭';

      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', `placed-note-group ${isPlaying ? 'playing' : ''} ${isSelected ? 'selected' : ''}`);
      g.setAttribute('data-idx', String(idx));
      g.style.cursor = 'pointer';

      // Build flags for eighth and sixteenth notes
      let flagsSvg = '';
      if (n.duration === 'eighth' && hasStem) {
        flagsSvg = stemUp
          ? `<path d="M ${stemX} ${stemY2} Q ${stemX + 10} ${stemY2 + 10} ${stemX + 8} ${stemY2 + 20}" stroke="${noteColor}" stroke-width="2" fill="none" />`
          : `<path d="M ${stemX} ${stemY2} Q ${stemX + 10} ${stemY2 - 10} ${stemX + 8} ${stemY2 - 20}" stroke="${noteColor}" stroke-width="2" fill="none" />`;
      } else if (n.duration === 'sixteenth' && hasStem) {
        flagsSvg = stemUp
          ? `
            <path d="M ${stemX} ${stemY2} Q ${stemX + 10} ${stemY2 + 8} ${stemX + 8} ${stemY2 + 16}" stroke="${noteColor}" stroke-width="2" fill="none" />
            <path d="M ${stemX} ${stemY2 + 7} Q ${stemX + 10} ${stemY2 + 15} ${stemX + 8} ${stemY2 + 23}" stroke="${noteColor}" stroke-width="2" fill="none" />
          `
          : `
            <path d="M ${stemX} ${stemY2} Q ${stemX + 10} ${stemY2 - 8} ${stemX + 8} ${stemY2 - 16}" stroke="${noteColor}" stroke-width="2" fill="none" />
            <path d="M ${stemX} ${stemY2 - 7} Q ${stemX + 10} ${stemY2 - 15} ${stemX + 8} ${stemY2 - 23}" stroke="${noteColor}" stroke-width="2" fill="none" />
          `;
      }

      g.innerHTML = `
        <!-- Click target hitbox -->
        <rect x="${x - 18}" y="${Math.min(y, stemY2) - 10}" width="36" height="${Math.abs(stemHeight) + 25}" fill="transparent" />

        <!-- Selection Halo Ring -->
        ${isSelected ? `<circle cx="${x}" cy="${y}" r="14" fill="rgba(56, 189, 248, 0.2)" stroke="#38bdf8" stroke-width="1.5" stroke-dasharray="3 2" />` : ''}

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

        <!-- Flags -->
        ${flagsSvg}

        <!-- Pitch & Duration Label below -->
        <text x="${x}" y="206" font-size="10" font-weight="700" fill="${noteColor}" text-anchor="middle" font-family="monospace">
          ${n.baseLetter}${n.accidental}${n.octave}
        </text>
        <text x="${x}" y="218" font-size="9" font-weight="600" fill="var(--text-muted)" text-anchor="middle">
          ${n.duration}
        </text>

        <!-- Delete button on hover -->
        <circle cx="${x}" cy="230" r="6.5" fill="#ef4444" class="note-delete-btn" />
        <text x="${x}" y="233" font-size="10" font-weight="bold" fill="#fff" text-anchor="middle" pointer-events="none">&times;</text>
      `;

      // Click note to select and edit its timing/duration, or delete
      g.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.classList.contains('note-delete-btn')) {
          e.stopPropagation();
          this.placedNotes.splice(idx, 1);
          if (this.selectedNoteIndex === idx) this.selectedNoteIndex = null;
          else if (this.selectedNoteIndex !== null && this.selectedNoteIndex > idx) this.selectedNoteIndex--;
          this.renderNotes();
          this.updateSelectionStatus();
        } else {
          e.stopPropagation();
          this.selectedNoteIndex = idx;
          this.toneGen.playNote(n.freq, 0.8, 'acoustic');
          this.renderNotes();
          this.updateSelectionStatus();
        }
      });

      this.notesGroupEl.appendChild(g);

      // Measure Barline calculation based on custom time signature
      accumulatedBeats += n.beats;
      if (idx < count - 1 && accumulatedBeats >= beatsPerMeasure - 0.001) {
        const barX = x + spacing / 2;
        const barG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        barG.innerHTML = `
          <line x1="${barX}" y1="80" x2="${barX}" y2="144" stroke="rgba(255, 255, 255, 0.55)" stroke-width="1.8" />
          <text x="${barX + 4}" y="74" font-size="9" font-weight="bold" fill="var(--text-muted)">m.${measureCount + 1}</text>
        `;
        this.notesGroupEl.appendChild(barG);
        measureCount++;
        accumulatedBeats = 0;
      }
    });
  }

  public render(): void {
    const clefConfig = CLEF_CONFIGS[this.activeClef];
    const beatsPerMeasure = this.getBeatsPerMeasure();
    const beatsDisplay = beatsPerMeasure % 1 === 0 ? beatsPerMeasure : beatsPerMeasure.toFixed(2);

    this.container.innerHTML = `
      <div class="sheet-music-card">
        <!-- Tab Header with Clef and Instructions -->
        <div class="sheet-header">
          <div class="sheet-title-wrap">
            <h2>Interactive Sheet Music Staff</h2>
            <p>Pick clef, set any custom time signature (top & bottom pieces), place notes on staff lines, and edit timing in-place.</p>
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

          <!-- 2. Time Signature: Separate Top & Bottom Piece Selectors -->
          <div class="toolbar-group time-sig-custom-group">
            <span class="group-label">Time Signature:</span>
            <div class="time-sig-fraction-box">
              <!-- Top piece (Count / Beats per Measure) -->
              <div class="time-sig-piece" title="Top Number: Number of beats per measure">
                <span class="sig-piece-label">Beats</span>
                <div class="sig-stepper-wrap">
                  <button type="button" class="btn-sig-step" id="btn-sig-top-minus" title="Decrease beats per measure">-</button>
                  <input type="number" id="time-sig-top-input" min="1" max="32" value="${this.timeSigTop}" class="sig-num-input" aria-label="Beats per measure" />
                  <button type="button" class="btn-sig-step" id="btn-sig-top-plus" title="Increase beats per measure">+</button>
                </div>
              </div>

              <span class="time-sig-fraction-slash">/</span>

              <!-- Bottom piece (Beat Unit note value) -->
              <div class="time-sig-piece" title="Bottom Number: Note value that gets 1 beat">
                <span class="sig-piece-label">Note Value</span>
                <select id="time-sig-bottom-select" class="sig-unit-select" aria-label="Beat unit note value">
                  <option value="1" ${this.timeSigBottom === 1 ? 'selected' : ''}>1 (Whole)</option>
                  <option value="2" ${this.timeSigBottom === 2 ? 'selected' : ''}>2 (Half)</option>
                  <option value="4" ${this.timeSigBottom === 4 ? 'selected' : ''}>4 (Quarter)</option>
                  <option value="8" ${this.timeSigBottom === 8 ? 'selected' : ''}>8 (Eighth)</option>
                  <option value="16" ${this.timeSigBottom === 16 ? 'selected' : ''}>16 (Sixteenth)</option>
                  <option value="32" ${this.timeSigBottom === 32 ? 'selected' : ''}>32 (Thirty-second)</option>
                </select>
              </div>
            </div>

            <!-- Quick Presets -->
            <div class="time-sig-quick-pills">
              <button type="button" class="mini-pill-btn ${this.timeSigTop === 4 && this.timeSigBottom === 4 ? 'active' : ''}" data-preset-top="4" data-preset-bottom="4">4/4</button>
              <button type="button" class="mini-pill-btn ${this.timeSigTop === 3 && this.timeSigBottom === 4 ? 'active' : ''}" data-preset-top="3" data-preset-bottom="4">3/4</button>
              <button type="button" class="mini-pill-btn ${this.timeSigTop === 2 && this.timeSigBottom === 4 ? 'active' : ''}" data-preset-top="2" data-preset-bottom="4">2/4</button>
              <button type="button" class="mini-pill-btn ${this.timeSigTop === 6 && this.timeSigBottom === 8 ? 'active' : ''}" data-preset-top="6" data-preset-bottom="8">6/8</button>
              <button type="button" class="mini-pill-btn ${this.timeSigTop === 5 && this.timeSigBottom === 4 ? 'active' : ''}" data-preset-top="5" data-preset-bottom="4">5/4</button>
              <button type="button" class="mini-pill-btn ${this.timeSigTop === 7 && this.timeSigBottom === 8 ? 'active' : ''}" data-preset-top="7" data-preset-bottom="8">7/8</button>
            </div>
          </div>

          <!-- 3. Note Duration / Timing -->
          <div class="toolbar-group">
            <span class="group-label">Note Timing:</span>
            <div class="pill-buttons">
              <button type="button" class="pill-btn ${this.activeDuration === 'quarter' ? 'active' : ''}" data-duration="quarter" title="Quarter Note (1 beat)">
                ♩ Quarter (1b)
              </button>
              <button type="button" class="pill-btn ${this.activeDuration === 'half' ? 'active' : ''}" data-duration="half" title="Half Note (2 beats)">
                𝅗𝅥 Half (2b)
              </button>
              <button type="button" class="pill-btn ${this.activeDuration === 'whole' ? 'active' : ''}" data-duration="whole" title="Whole Note (4 beats)">
                𝅝 Whole (4b)
              </button>
              <button type="button" class="pill-btn ${this.activeDuration === 'eighth' ? 'active' : ''}" data-duration="eighth" title="Eighth Note (0.5 beat)">
                ♪ 8th (0.5b)
              </button>
              <button type="button" class="pill-btn ${this.activeDuration === 'sixteenth' ? 'active' : ''}" data-duration="sixteenth" title="Sixteenth Note (0.25 beat)">
                𝅘𝅥𝅯 16th (0.25b)
              </button>
            </div>
          </div>

          <!-- 4. Accidental Selector -->
          <div class="toolbar-group">
            <span class="group-label">Pitch:</span>
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

          <!-- 5. Playback and Actions -->
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

        <!-- Note Selection Timing Status Bar -->
        <div id="sheet-selection-status"></div>

        <!-- Tempo & Timing Options Strip -->
        <div class="sheet-options-strip">
          <div class="tempo-control-wrap">
            <label for="sheet-tempo-slider">Playback Tempo:</label>
            <input type="range" id="sheet-tempo-slider" min="40" max="220" step="5" value="${this.tempoBpm}" />
            <span class="value-text" id="sheet-tempo-val">${this.tempoBpm} BPM</span>
          </div>

          <label class="sheet-checkbox-label" title="Play audible woodblock click on beats during playback">
            <input type="checkbox" id="sheet-metronome-toggle" ${this.enableMetronome ? 'checked' : ''} />
            <span>🥁 Metronome Beat Click</span>
          </label>

          <label class="sheet-checkbox-label">
            <input type="checkbox" id="sheet-mic-toggle" ${this.showMicIndicator ? 'checked' : ''} />
            <span>🎤 Live Mic Pitch on Staff</span>
          </label>

          <span class="sheet-clef-desc">
            <strong>${clefConfig.name} • ${this.timeSigTop}/${this.timeSigBottom} Time</strong> (${beatsDisplay} beats/measure)
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
              ${clefConfig.symbol}
            </text>

            <!-- Dynamic Time Signature (Top / Bottom Numbers) -->
            <text x="${this.staffLeft + 2}" y="108" font-size="${this.timeSigTop > 9 ? '18' : '22'}" font-weight="900" fill="#38bdf8" text-anchor="middle" pointer-events="none">
              ${this.timeSigTop}
            </text>
            <text x="${this.staffLeft + 2}" y="136" font-size="${this.timeSigBottom > 9 ? '18' : '22'}" font-weight="900" fill="#38bdf8" text-anchor="middle" pointer-events="none">
              ${this.timeSigBottom}
            </text>

            <!-- Interactive Clickable Staff Area -->
            <rect id="staff-interaction-area" x="${this.staffLeft + 16}" y="30" width="${this.staffRight - this.staffLeft - 16}" height="175" fill="transparent" style="cursor: crosshair;" />

            <!-- Group for Placed Notes & Measure Barlines -->
            <g id="staff-notes-group"></g>

            <!-- Group for Hover Ghost Note -->
            <g id="staff-ghost-group" pointer-events="none" style="display: none;"></g>

            <!-- Group for Microphone Live Pitch Indicator -->
            <g id="staff-mic-group" pointer-events="none" style="display: none;"></g>
          </svg>
        </div>

        <div class="sheet-footer-hint">
          <span>💡 <strong>Timing Tips:</strong> Customize both pieces of the time signature (any beats per measure / any note unit). Click any placed note on the staff to select it, then click duration buttons above to change its timing in real-time.</span>
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
    this.selectionStatusEl = this.container.querySelector('#sheet-selection-status')!;

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

    // Wire Time Signature Top and Bottom inputs
    const topInput = this.container.querySelector<HTMLInputElement>('#time-sig-top-input')!;
    topInput.addEventListener('change', () => {
      const val = parseInt(topInput.value, 10);
      if (!isNaN(val) && val >= 1) {
        this.setTimeSignature(val, this.timeSigBottom);
      }
    });

    this.container.querySelector('#btn-sig-top-minus')?.addEventListener('click', () => {
      if (this.timeSigTop > 1) {
        this.setTimeSignature(this.timeSigTop - 1, this.timeSigBottom);
      }
    });

    this.container.querySelector('#btn-sig-top-plus')?.addEventListener('click', () => {
      if (this.timeSigTop < 32) {
        this.setTimeSignature(this.timeSigTop + 1, this.timeSigBottom);
      }
    });

    const bottomSelect = this.container.querySelector<HTMLSelectElement>('#time-sig-bottom-select')!;
    bottomSelect.addEventListener('change', () => {
      const val = parseInt(bottomSelect.value, 10);
      if (!isNaN(val) && val >= 1) {
        this.setTimeSignature(this.timeSigTop, val);
      }
    });

    // Wire Quick Presets
    this.container.querySelectorAll<HTMLButtonElement>('[data-preset-top]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const top = parseInt(btn.getAttribute('data-preset-top') || '4', 10);
        const bottom = parseInt(btn.getAttribute('data-preset-bottom') || '4', 10);
        this.setTimeSignature(top, bottom);
      });
    });

    // Wire Duration buttons
    this.container.querySelectorAll<HTMLButtonElement>('[data-duration]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.container.querySelectorAll('[data-duration]').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const dur = btn.getAttribute('data-duration') as NoteDurationType;
        this.setDuration(dur);
      });
    });

    // Wire Accidental buttons
    this.container.querySelectorAll<HTMLButtonElement>('[data-accidental]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.container.querySelectorAll('[data-accidental]').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const acc = (btn.getAttribute('data-accidental') || '') as AccidentalType;
        this.setAccidental(acc);
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

    // Wire Metronome Toggle
    this.container.querySelector<HTMLInputElement>('#sheet-metronome-toggle')?.addEventListener('change', (e) => {
      this.enableMetronome = (e.target as HTMLInputElement).checked;
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

        <!-- Ghost Label with Duration -->
        <rect x="${pt.x - 26}" y="${snappedY - 26}" width="52" height="18" rx="4" fill="#0f172a" stroke="#38bdf8" stroke-width="1" />
        <text x="${pt.x}" y="${snappedY - 13}" font-size="10" font-weight="700" fill="#38bdf8" text-anchor="middle" font-family="monospace">
          ${noteLabel} (${this.activeDuration})
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

    // Deselect note when clicking background
    this.container.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.placed-note-group') && !target.closest('.pill-btn') && !target.closest('.note-selected-pill') && !target.closest('.time-sig-fraction-box')) {
        if (this.selectedNoteIndex !== null) {
          this.selectedNoteIndex = null;
          this.renderNotes();
          this.updateSelectionStatus();
        }
      }
    });

    this.renderNotes();
    this.updateSelectionStatus();
  }
}
