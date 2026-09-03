/**
 * Interactive Piano Keyboard Component.
 * Plays notes on click/touch/keyboard, and visually lights up when notes are detected from the microphone.
 */

import { freqFromNote, NOTE_NAMES_SHARP, NOTE_NAMES_FLAT, type NotationType } from '../audio/pitch.ts';
import type { ToneGenerator } from '../audio/toneGenerator.ts';

export interface PianoOptions {
  startOctave?: number;
  numOctaves?: number;
  a4?: number;
  notation?: NotationType;
}

export type NoteSelectCallback = (freq: number, noteName: string, octave: number) => void;

export class PianoKeyboard {
  private container: HTMLElement;
  private toneGen: ToneGenerator;
  private startOctave: number = 3;
  private numOctaves: number = 2; // 2 octaves = 24 keys + 1 (C to C)
  private a4: number = 440;
  private notation: NotationType = 'sharp';
  private activeDetectedMidi: number | null = null;
  private onNoteSelect?: NoteSelectCallback;

  // Key elements mapped by MIDI number
  private keyElements: Map<number, HTMLElement> = new Map();

  constructor(container: HTMLElement, toneGen: ToneGenerator, options?: PianoOptions) {
    this.container = container;
    this.toneGen = toneGen;
    if (options?.startOctave !== undefined) this.startOctave = options.startOctave;
    if (options?.numOctaves !== undefined) this.numOctaves = options.numOctaves;
    if (options?.a4 !== undefined) this.a4 = options.a4;
    if (options?.notation !== undefined) this.notation = options.notation;

    this.render();
  }

  public setOnNoteSelect(cb: NoteSelectCallback): void {
    this.onNoteSelect = cb;
  }

  public setA4(a4: number): void {
    this.a4 = a4;
  }

  public setNotation(notation: NotationType): void {
    this.notation = notation;
    this.render();
  }

  public shiftOctave(delta: number): void {
    const next = this.startOctave + delta;
    if (next >= 1 && next <= 6) {
      this.startOctave = next;
      this.render();
    }
  }

  public getStartOctave(): number {
    return this.startOctave;
  }

  /**
   * Highlights the key corresponding to detected pitch from the microphone.
   */
  public highlightMidi(midi: number | null): void {
    if (this.activeDetectedMidi !== null && this.activeDetectedMidi !== midi) {
      const prevEl = this.keyElements.get(this.activeDetectedMidi);
      if (prevEl) {
        prevEl.classList.remove('mic-detected');
      }
    }

    this.activeDetectedMidi = midi;

    if (midi !== null) {
      const el = this.keyElements.get(midi);
      if (el) {
        el.classList.add('mic-detected');
      }
    }
  }

  public render(): void {
    this.container.innerHTML = '';
    this.keyElements.clear();

    const wrapper = document.createElement('div');
    wrapper.className = 'piano-wrapper';

    // Top control bar for Octave Shift
    const controls = document.createElement('div');
    controls.className = 'piano-controls';

    const prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.className = 'btn-octave';
    prevBtn.innerHTML = '&#9664; Octave Down';
    prevBtn.disabled = this.startOctave <= 1;
    prevBtn.addEventListener('click', () => this.shiftOctave(-1));

    const octaveLabel = document.createElement('span');
    octaveLabel.className = 'piano-range-label';
    const endOct = this.startOctave + this.numOctaves - 1;
    octaveLabel.textContent = `Range: C${this.startOctave} – B${endOct}`;

    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'btn-octave';
    nextBtn.innerHTML = 'Octave Up &#9654;';
    nextBtn.disabled = this.startOctave >= 6;
    nextBtn.addEventListener('click', () => this.shiftOctave(1));

    controls.appendChild(prevBtn);
    controls.appendChild(octaveLabel);
    controls.appendChild(nextBtn);
    wrapper.appendChild(controls);

    // Keyboard bed
    const keyboard = document.createElement('div');
    keyboard.className = 'piano-keys-bed';
    keyboard.setAttribute('role', 'region');
    keyboard.setAttribute('aria-label', 'Interactive Piano Roll');

    const totalNotes = this.numOctaves * 12 + 1; // e.g. 25 notes for 2 octaves + final C

    for (let i = 0; i < totalNotes; i++) {
      const noteIndex = i % 12;
      const octave = this.startOctave + Math.floor(i / 12);
      const isBlack = [1, 3, 6, 8, 10].includes(noteIndex);
      const midi = (octave + 1) * 12 + noteIndex;
      const freq = freqFromNote(noteIndex, octave, this.a4);

      const rawName = this.notation === 'flat' ? NOTE_NAMES_FLAT[noteIndex] : NOTE_NAMES_SHARP[noteIndex];
      const displayName = `${rawName}${octave}`;

      const keyEl = document.createElement('button');
      keyEl.type = 'button';
      keyEl.className = isBlack ? 'piano-key black-key' : 'piano-key white-key';
      keyEl.setAttribute('data-midi', String(midi));
      keyEl.setAttribute('data-freq', freq.toFixed(1));
      keyEl.setAttribute('aria-label', `${displayName} (${freq.toFixed(1)} Hz)`);
      keyEl.setAttribute('tabindex', '0');

      const labelSpan = document.createElement('span');
      labelSpan.className = 'key-label';
      labelSpan.textContent = displayName;
      keyEl.appendChild(labelSpan);

      const playCurrentNote = (e: Event) => {
        e.preventDefault();
        this.toneGen.playNote(freq, 1.2);
        keyEl.classList.add('active-played');
        setTimeout(() => keyEl.classList.remove('active-played'), 300);

        if (this.onNoteSelect) {
          this.onNoteSelect(freq, rawName, octave);
        }
      };

      keyEl.addEventListener('pointerdown', playCurrentNote);
      keyEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          playCurrentNote(e);
        }
      });

      this.keyElements.set(midi, keyEl);
      keyboard.appendChild(keyEl);
    }

    wrapper.appendChild(keyboard);
    this.container.appendChild(wrapper);
  }
}
