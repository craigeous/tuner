/**
 * Interactive Piano Keyboard Component with Computer Keyboard Bindings.
 * Allows playing all notes and changing octaves from a physical keyboard or via touch/mouse.
 * Visually lights up when notes are detected from the microphone.
 */

import { freqFromNote, NOTE_NAMES_SHARP, NOTE_NAMES_FLAT, type NotationType } from '../audio/pitch.ts';
import type { ToneGenerator } from '../audio/toneGenerator.ts';

export interface PianoOptions {
  startOctave?: number;
  numOctaves?: number;
  a4?: number;
  notation?: NotationType;
  defaultLayout?: 'dual' | 'garageband';
}

export type NoteSelectCallback = (freq: number, noteName: string, octave: number) => void;

// --------------------------------------------------------------------------
// Key Mapping Tables (25 notes: 2 octaves + 1 final C)
// --------------------------------------------------------------------------

// 1. Dual-Row Layout: 2 Full Octaves with ZERO key conflicts
// Lower Octave: Z X C V B N M , (White) + S D G H J (Black)
// Upper Octave: Q W E R T Y U I (White) + 2 3 5 6 7 (Black)
const DUAL_ROW_MAP: Record<string, number> = {
  // Lower Octave (0 - 12)
  'KeyZ': 0, 'z': 0,
  'KeyS': 1, 's': 1,
  'KeyX': 2, 'x': 2,
  'KeyD': 3, 'd': 3,
  'KeyC': 4, 'c': 4,
  'KeyV': 5, 'v': 5,
  'KeyG': 6, 'g': 6,
  'KeyB': 7, 'b': 7,
  'KeyH': 8, 'h': 8,
  'KeyN': 9, 'n': 9,
  'KeyJ': 10, 'j': 10,
  'KeyM': 11, 'm': 11,
  'Comma': 12, ',': 12,

  // Upper Octave (12 - 24)
  'KeyQ': 12, 'q': 12,
  'Digit2': 13, '2': 13,
  'KeyW': 14, 'w': 14,
  'Digit3': 15, '3': 15,
  'KeyE': 16, 'e': 16,
  'KeyR': 17, 'r': 17,
  'Digit5': 18, '5': 18,
  'KeyT': 19, 't': 19,
  'Digit6': 20, '6': 20,
  'KeyY': 21, 'y': 21,
  'Digit7': 22, '7': 22,
  'KeyU': 23, 'u': 23,
  'KeyI': 24, 'i': 24,
};

const DUAL_ROW_HINTS: string[] = [
  'Z', 'S', 'X', 'D', 'C', 'V', 'G', 'B', 'H', 'N', 'J', 'M', // 0-11
  'Q', '2', 'W', '3', 'E', 'R', '5', 'T', '6', 'Y', '7', 'U', 'I', // 12-24
];

// 2. GarageBand / Ableton Layout
// Home row white keys: A S D F G H J K L ; '
// Top row black keys:  W E   T Y U   O P
// Octave Down: Z | Octave Up: X
const GARAGEBAND_MAP: Record<string, number> = {
  // Octave 1
  'KeyA': 0, 'a': 0,
  'KeyW': 1, 'w': 1,
  'KeyS': 2, 's': 2,
  'KeyE': 3, 'e': 3,
  'KeyD': 4, 'd': 4,
  'KeyF': 5, 'f': 5,
  'KeyT': 6, 't': 6,
  'KeyG': 7, 'g': 7,
  'KeyY': 8, 'y': 8,
  'KeyH': 9, 'h': 9,
  'KeyU': 10, 'u': 10,
  'KeyJ': 11, 'j': 11,
  // Octave 2
  'KeyK': 12, 'k': 12,
  'KeyO': 13, 'o': 13,
  'KeyL': 14, 'l': 14,
  'KeyP': 15, 'p': 15,
  'Semicolon': 16, ';': 16,
  'Quote': 17, "'": 17,
};

const GARAGEBAND_HINTS: string[] = [
  'A', 'W', 'S', 'E', 'D', 'F', 'T', 'G', 'Y', 'H', 'U', 'J',
  'K', 'O', 'L', 'P', ';', "'", '', '', '', '', '', '', '',
];

export class PianoKeyboard {
  private container: HTMLElement;
  private toneGen: ToneGenerator;
  private startOctave: number = 3;
  private numOctaves: number = 2; // 2 octaves = 24 keys + 1 (C to C)
  private a4: number = 440;
  private notation: NotationType = 'sharp';
  private activeDetectedMidi: number | null = null;
  private onNoteSelect?: NoteSelectCallback;

  // Keyboard binding settings
  private keyboardLayout: 'dual' | 'garageband' = 'dual';
  private showKeyHints: boolean = true;
  private heldKeyCodes: Set<string> = new Set();

  // Key elements mapped by MIDI number & by note index (0 to 24)
  private keyElements: Map<number, HTMLElement> = new Map();
  private indexElements: Map<number, HTMLElement> = new Map();

  constructor(container: HTMLElement, toneGen: ToneGenerator, options?: PianoOptions) {
    this.container = container;
    this.toneGen = toneGen;
    if (options?.startOctave !== undefined) this.startOctave = options.startOctave;
    if (options?.numOctaves !== undefined) this.numOctaves = options.numOctaves;
    if (options?.a4 !== undefined) this.a4 = options.a4;
    if (options?.notation !== undefined) this.notation = options.notation;
    if (options?.defaultLayout) this.keyboardLayout = options.defaultLayout;

    this.render();
  }

  public setOnNoteSelect(cb: NoteSelectCallback): void {
    this.onNoteSelect = cb;
  }

  public setA4(a4: number): void {
    this.a4 = a4;
    this.render();
  }

  public setNotation(notation: NotationType): void {
    this.notation = notation;
    this.render();
  }

  public setKeyboardLayout(layout: 'dual' | 'garageband'): void {
    this.keyboardLayout = layout;
    this.render();
  }

  public getKeyboardLayout(): 'dual' | 'garageband' {
    return this.keyboardLayout;
  }

  public toggleKeyHints(show?: boolean): void {
    this.showKeyHints = show !== undefined ? show : !this.showKeyHints;
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

  /**
   * Play a note by its index in the current 25-key range (0 to 24).
   */
  public playNoteIndex(index: number): boolean {
    const el = this.indexElements.get(index);
    if (!el) return false;

    const freq = parseFloat(el.getAttribute('data-freq') || '0');
    const noteName = el.getAttribute('data-note') || '';
    const octave = parseInt(el.getAttribute('data-octave') || '0', 10);

    this.toneGen.playNote(freq, 1.2);
    el.classList.add('active-played');

    if (this.onNoteSelect) {
      this.onNoteSelect(freq, noteName, octave);
    }

    return true;
  }

  /**
   * Handle physical computer keyboard press.
   * Returns true if the key was handled (piano note or octave shift).
   */
  public handleKeyDown(e: KeyboardEvent): boolean {
    // Ignore repeat events while holding a key to avoid stuttering
    if (e.repeat) {
      const activeMap = this.keyboardLayout === 'dual' ? DUAL_ROW_MAP : GARAGEBAND_MAP;
      if (e.code in activeMap || e.key in activeMap) {
        return true;
      }
      return false;
    }

    // 1. Check for Octave Shift bindings
    if (this.keyboardLayout === 'garageband') {
      if (e.code === 'KeyZ' || e.key === 'z' || e.key === 'Z') {
        e.preventDefault();
        this.shiftOctave(-1);
        return true;
      }
      if (e.code === 'KeyX' || e.key === 'x' || e.key === 'X') {
        e.preventDefault();
        this.shiftOctave(1);
        return true;
      }
    }

    // Common octave shift keys (brackets, arrows, - / +)
    if (e.code === 'BracketLeft' || e.key === '[' || e.key === 'ArrowLeft' || e.key === 'ArrowDown' || e.key === '-') {
      e.preventDefault();
      this.shiftOctave(-1);
      return true;
    }
    if (e.code === 'BracketRight' || e.key === ']' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === '+' || e.key === '=') {
      e.preventDefault();
      this.shiftOctave(1);
      return true;
    }

    // 2. Check for Piano Note bindings
    const activeMap = this.keyboardLayout === 'dual' ? DUAL_ROW_MAP : GARAGEBAND_MAP;
    let noteIndex: number | undefined;

    if (e.code in activeMap) {
      noteIndex = activeMap[e.code];
    } else if (e.key in activeMap) {
      noteIndex = activeMap[e.key];
    }

    if (noteIndex !== undefined) {
      e.preventDefault();
      this.heldKeyCodes.add(e.code);
      return this.playNoteIndex(noteIndex);
    }

    return false;
  }

  /**
   * Handle physical computer keyboard release.
   */
  public handleKeyUp(e: KeyboardEvent): boolean {
    this.heldKeyCodes.delete(e.code);

    const activeMap = this.keyboardLayout === 'dual' ? DUAL_ROW_MAP : GARAGEBAND_MAP;
    let noteIndex: number | undefined;

    if (e.code in activeMap) {
      noteIndex = activeMap[e.code];
    } else if (e.key in activeMap) {
      noteIndex = activeMap[e.key];
    }

    if (noteIndex !== undefined) {
      const el = this.indexElements.get(noteIndex);
      if (el) {
        el.classList.remove('active-played');
      }
      return true;
    }

    return false;
  }

  public render(): void {
    this.container.innerHTML = '';
    this.keyElements.clear();
    this.indexElements.clear();

    const wrapper = document.createElement('div');
    wrapper.className = 'piano-wrapper';

    // Toolbar (Octave Stepper + Layout Selector + Shortcut Legend)
    const toolbar = document.createElement('div');
    toolbar.className = 'piano-toolbar';

    // 1. Octave Stepper
    const octaveControls = document.createElement('div');
    octaveControls.className = 'piano-octave-controls';

    const prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.className = 'btn-octave';
    const downHint = this.keyboardLayout === 'garageband' ? '[Z]' : '[ [ ]';
    prevBtn.innerHTML = `&#9664; Octave Down <kbd class="kbd-hint">${downHint}</kbd>`;
    prevBtn.disabled = this.startOctave <= 1;
    prevBtn.addEventListener('click', () => this.shiftOctave(-1));

    const octaveLabel = document.createElement('span');
    octaveLabel.className = 'piano-range-label';
    const endOct = this.startOctave + this.numOctaves - 1;
    octaveLabel.textContent = `Range: C${this.startOctave} – B${endOct}`;

    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'btn-octave';
    const upHint = this.keyboardLayout === 'garageband' ? '[X]' : '[ ] ]';
    nextBtn.innerHTML = `Octave Up &#9654; <kbd class="kbd-hint">${upHint}</kbd>`;
    nextBtn.disabled = this.startOctave >= 6;
    nextBtn.addEventListener('click', () => this.shiftOctave(1));

    octaveControls.appendChild(prevBtn);
    octaveControls.appendChild(octaveLabel);
    octaveControls.appendChild(nextBtn);
    toolbar.appendChild(octaveControls);

    // 2. Layout Switcher & Key Hints Toggle
    const layoutGroup = document.createElement('div');
    layoutGroup.className = 'piano-layout-group';

    const layoutToggleWrap = document.createElement('div');
    layoutToggleWrap.className = 'layout-toggle-group';

    const btnDual = document.createElement('button');
    btnDual.type = 'button';
    btnDual.className = `btn-layout-toggle ${this.keyboardLayout === 'dual' ? 'active' : ''}`;
    btnDual.textContent = '2 Full Octaves (Z-M / Q-I)';
    btnDual.title = 'Lower octave on Z-M; Upper octave on Q-I with numbers 2-7 for sharps';
    btnDual.addEventListener('click', () => this.setKeyboardLayout('dual'));

    const btnGB = document.createElement('button');
    btnGB.type = 'button';
    btnGB.className = `btn-layout-toggle ${this.keyboardLayout === 'garageband' ? 'active' : ''}`;
    btnGB.textContent = 'GarageBand (A-K / W-U)';
    btnGB.title = 'White keys on A-K; Black keys on W-U; Octave shift on Z and X';
    btnGB.addEventListener('click', () => this.setKeyboardLayout('garageband'));

    layoutToggleWrap.appendChild(btnDual);
    layoutToggleWrap.appendChild(btnGB);
    layoutGroup.appendChild(layoutToggleWrap);

    const hintLabel = document.createElement('label');
    hintLabel.className = 'key-hint-toggle-label';
    hintLabel.innerHTML = `
      <input type="checkbox" ${this.showKeyHints ? 'checked' : ''} />
      <span>Key Badges</span>
    `;
    hintLabel.querySelector('input')?.addEventListener('change', (e) => {
      this.toggleKeyHints((e.target as HTMLInputElement).checked);
    });
    layoutGroup.appendChild(hintLabel);

    toolbar.appendChild(layoutGroup);
    wrapper.appendChild(toolbar);

    // 3. Informational Shortcut Legend
    const guide = document.createElement('div');
    guide.className = 'piano-keyboard-guide';
    const keysGuideText =
      this.keyboardLayout === 'dual'
        ? 'Row 1: <strong>Z–M</strong> (White) + <strong>S D G H J</strong> (Black) &bull; Row 2: <strong>Q–I</strong> (White) + <strong>2 3 5 6 7</strong> (Black)'
        : 'White Keys: <strong>A–K</strong> &bull; Black Keys: <strong>W E T Y U O P</strong> &bull; Octave Down: <strong>Z</strong> &bull; Octave Up: <strong>X</strong>';
    const octaveGuideText =
      this.keyboardLayout === 'dual'
        ? 'Press <strong>[</strong> and <strong>]</strong> (or <strong>◀</strong> / <strong>▶</strong> arrows)'
        : 'Press <strong>Z</strong> / <strong>X</strong> or <strong>[</strong> / <strong>]</strong>';

    guide.innerHTML = `
      <div class="guide-item">
        <span class="guide-badge">🎹 Play Keys:</span>
        <span class="guide-text">${keysGuideText}</span>
      </div>
      <div class="guide-item">
        <span class="guide-badge">🔄 Octave Shift:</span>
        <span class="guide-text">${octaveGuideText}</span>
      </div>
    `;
    wrapper.appendChild(guide);

    // 4. Keyboard Bed (Keys)
    const keyboard = document.createElement('div');
    keyboard.className = 'piano-keys-bed';
    keyboard.setAttribute('role', 'region');
    keyboard.setAttribute('aria-label', 'Interactive Piano Roll');

    const totalNotes = this.numOctaves * 12 + 1; // 25 notes for 2 octaves + final C
    const hintList = this.keyboardLayout === 'dual' ? DUAL_ROW_HINTS : GARAGEBAND_HINTS;

    for (let i = 0; i < totalNotes; i++) {
      const noteIndex = i % 12;
      const octave = this.startOctave + Math.floor(i / 12);
      const isBlack = [1, 3, 6, 8, 10].includes(noteIndex);
      const midi = (octave + 1) * 12 + noteIndex;
      const freq = freqFromNote(noteIndex, octave, this.a4);

      const rawName = this.notation === 'flat' ? NOTE_NAMES_FLAT[noteIndex] : NOTE_NAMES_SHARP[noteIndex];
      const displayName = `${rawName}${octave}`;
      const keyBindingHint = hintList[i] || '';

      const keyEl = document.createElement('button');
      keyEl.type = 'button';
      keyEl.className = isBlack ? 'piano-key black-key' : 'piano-key white-key';
      keyEl.setAttribute('data-midi', String(midi));
      keyEl.setAttribute('data-index', String(i));
      keyEl.setAttribute('data-freq', freq.toFixed(1));
      keyEl.setAttribute('data-note', rawName);
      keyEl.setAttribute('data-octave', String(octave));
      keyEl.setAttribute('aria-label', `${displayName} (${freq.toFixed(1)} Hz) [Key: ${keyBindingHint}]`);
      keyEl.setAttribute('tabindex', '0');

      // Top shortcut hint badge
      if (this.showKeyHints && keyBindingHint) {
        const hintSpan = document.createElement('span');
        hintSpan.className = 'key-binding-hint';
        hintSpan.textContent = keyBindingHint;
        keyEl.appendChild(hintSpan);
      }

      // Bottom note label
      const labelSpan = document.createElement('span');
      labelSpan.className = 'key-label';
      labelSpan.textContent = displayName;
      keyEl.appendChild(labelSpan);

      const playCurrentNote = (e: Event) => {
        e.preventDefault();
        this.playNoteIndex(i);
        setTimeout(() => keyEl.classList.remove('active-played'), 300);
      };

      keyEl.addEventListener('pointerdown', playCurrentNote);
      keyEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          playCurrentNote(e);
        }
      });

      this.keyElements.set(midi, keyEl);
      this.indexElements.set(i, keyEl);
      keyboard.appendChild(keyEl);
    }

    wrapper.appendChild(keyboard);
    this.container.appendChild(wrapper);
  }
}
