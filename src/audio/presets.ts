/**
 * Instrument Tuning Presets and Vocal Range Profiles.
 */

export interface PresetNote {
  label: string;      // e.g. "6: E2" or "Tenor High C5"
  name: string;       // "E"
  octave: number;     // 2
  noteIndex: number;  // 0-11 (C=0, C#=1, etc.)
  midi: number;
}

export interface Preset {
  id: string;
  name: string;
  category: 'instruments' | 'voice' | 'general';
  description: string;
  notes: PresetNote[];
}

export const INSTRUMENT_PRESETS: Preset[] = [
  {
    id: 'chromatic',
    name: 'Chromatic (All)',
    category: 'general',
    description: 'Detects any musical note across all octaves. Ideal for any instrument, piano, or voice.',
    notes: [], // empty = all notes
  },
  {
    id: 'guitar-standard',
    name: 'Guitar (Standard)',
    category: 'instruments',
    description: 'Standard 6-string guitar tuning (E2 - A2 - D3 - G3 - B3 - E4).',
    notes: [
      { label: '6: E2', name: 'E', octave: 2, noteIndex: 4, midi: 40 },
      { label: '5: A2', name: 'A', octave: 2, noteIndex: 9, midi: 45 },
      { label: '4: D3', name: 'D', octave: 3, noteIndex: 2, midi: 50 },
      { label: '3: G3', name: 'G', octave: 3, noteIndex: 7, midi: 55 },
      { label: '2: B3', name: 'B', octave: 3, noteIndex: 11, midi: 59 },
      { label: '1: E4', name: 'E', octave: 4, noteIndex: 4, midi: 64 },
    ],
  },
  {
    id: 'guitar-drop-d',
    name: 'Guitar (Drop D)',
    category: 'instruments',
    description: 'Drop D tuning (D2 - A2 - D3 - G3 - B3 - E4). Popular in rock and metal.',
    notes: [
      { label: '6: D2', name: 'D', octave: 2, noteIndex: 2, midi: 38 },
      { label: '5: A2', name: 'A', octave: 2, noteIndex: 9, midi: 45 },
      { label: '4: D3', name: 'D', octave: 3, noteIndex: 2, midi: 50 },
      { label: '3: G3', name: 'G', octave: 3, noteIndex: 7, midi: 55 },
      { label: '2: B3', name: 'B', octave: 3, noteIndex: 11, midi: 59 },
      { label: '1: E4', name: 'E', octave: 4, noteIndex: 4, midi: 64 },
    ],
  },
  {
    id: 'guitar-dadgad',
    name: 'Guitar (DADGAD)',
    category: 'instruments',
    description: 'Celtic and acoustic fingerstyle tuning (D2 - A2 - D3 - G3 - A3 - D4).',
    notes: [
      { label: '6: D2', name: 'D', octave: 2, noteIndex: 2, midi: 38 },
      { label: '5: A2', name: 'A', octave: 2, noteIndex: 9, midi: 45 },
      { label: '4: D3', name: 'D', octave: 3, noteIndex: 2, midi: 50 },
      { label: '3: G3', name: 'G', octave: 3, noteIndex: 7, midi: 55 },
      { label: '2: A3', name: 'A', octave: 3, noteIndex: 9, midi: 57 },
      { label: '1: D4', name: 'D', octave: 4, noteIndex: 2, midi: 62 },
    ],
  },
  {
    id: 'bass-4',
    name: 'Bass (4-String)',
    category: 'instruments',
    description: 'Standard 4-string electric bass (E1 - A1 - D2 - G2).',
    notes: [
      { label: '4: E1', name: 'E', octave: 1, noteIndex: 4, midi: 28 },
      { label: '3: A1', name: 'A', octave: 1, noteIndex: 9, midi: 33 },
      { label: '2: D2', name: 'D', octave: 2, noteIndex: 2, midi: 38 },
      { label: '1: G2', name: 'G', octave: 2, noteIndex: 7, midi: 43 },
    ],
  },
  {
    id: 'bass-5',
    name: 'Bass (5-String)',
    category: 'instruments',
    description: '5-string electric bass with low B (B0 - E1 - A1 - D2 - G2).',
    notes: [
      { label: '5: B0', name: 'B', octave: 0, noteIndex: 11, midi: 23 },
      { label: '4: E1', name: 'E', octave: 1, noteIndex: 4, midi: 28 },
      { label: '3: A1', name: 'A', octave: 1, noteIndex: 9, midi: 33 },
      { label: '2: D2', name: 'D', octave: 2, noteIndex: 2, midi: 38 },
      { label: '1: G2', name: 'G', octave: 2, noteIndex: 7, midi: 43 },
    ],
  },
  {
    id: 'ukulele-soprano',
    name: 'Ukulele (Standard C)',
    category: 'instruments',
    description: 'Standard re-entrant Soprano/Concert/Tenor tuning (G4 - C4 - E4 - A4).',
    notes: [
      { label: '4: G4', name: 'G', octave: 4, noteIndex: 7, midi: 67 },
      { label: '3: C4', name: 'C', octave: 4, noteIndex: 0, midi: 60 },
      { label: '2: E4', name: 'E', octave: 4, noteIndex: 4, midi: 64 },
      { label: '1: A4', name: 'A', octave: 4, noteIndex: 9, midi: 69 },
    ],
  },
  {
    id: 'violin',
    name: 'Violin',
    category: 'instruments',
    description: 'Standard orchestral violin tuning in perfect fifths (G3 - D4 - A4 - E5).',
    notes: [
      { label: '4: G3', name: 'G', octave: 3, noteIndex: 7, midi: 55 },
      { label: '3: D4', name: 'D', octave: 4, noteIndex: 2, midi: 62 },
      { label: '2: A4', name: 'A', octave: 4, noteIndex: 9, midi: 69 },
      { label: '1: E5', name: 'E', octave: 5, noteIndex: 4, midi: 76 },
    ],
  },
  {
    id: 'cello',
    name: 'Cello',
    category: 'instruments',
    description: 'Standard cello tuning in fifths (C2 - G2 - D3 - A3).',
    notes: [
      { label: '4: C2', name: 'C', octave: 2, noteIndex: 0, midi: 36 },
      { label: '3: G2', name: 'G', octave: 2, noteIndex: 7, midi: 43 },
      { label: '2: D3', name: 'D', octave: 3, noteIndex: 2, midi: 50 },
      { label: '1: A3', name: 'A', octave: 3, noteIndex: 9, midi: 57 },
    ],
  },
  {
    id: 'voice-tenor',
    name: 'Voice: Tenor',
    category: 'voice',
    description: 'High male voice range typically from C3 (131 Hz) to C5 (523 Hz).',
    notes: [
      { label: 'Low C3', name: 'C', octave: 3, noteIndex: 0, midi: 48 },
      { label: 'E3', name: 'E', octave: 3, noteIndex: 4, midi: 52 },
      { label: 'G3', name: 'G', octave: 3, noteIndex: 7, midi: 55 },
      { label: 'Mid C4', name: 'C', octave: 4, noteIndex: 0, midi: 60 },
      { label: 'E4', name: 'E', octave: 4, noteIndex: 4, midi: 64 },
      { label: 'G4', name: 'G', octave: 4, noteIndex: 7, midi: 67 },
      { label: 'High C5', name: 'C', octave: 5, noteIndex: 0, midi: 72 },
    ],
  },
  {
    id: 'voice-baritone',
    name: 'Voice: Baritone',
    category: 'voice',
    description: 'Mid male voice range typically from A2 (110 Hz) to A4 (440 Hz).',
    notes: [
      { label: 'Low A2', name: 'A', octave: 2, noteIndex: 9, midi: 45 },
      { label: 'C3', name: 'C', octave: 3, noteIndex: 0, midi: 48 },
      { label: 'E3', name: 'E', octave: 3, noteIndex: 4, midi: 52 },
      { label: 'A3', name: 'A', octave: 3, noteIndex: 9, midi: 57 },
      { label: 'C4', name: 'C', octave: 4, noteIndex: 0, midi: 60 },
      { label: 'E4', name: 'E', octave: 4, noteIndex: 4, midi: 64 },
      { label: 'High A4', name: 'A', octave: 4, noteIndex: 9, midi: 69 },
    ],
  },
  {
    id: 'voice-bass',
    name: 'Voice: Bass',
    category: 'voice',
    description: 'Deep male voice range typically from E2 (82 Hz) to E4 (330 Hz).',
    notes: [
      { label: 'Low E2', name: 'E', octave: 2, noteIndex: 4, midi: 40 },
      { label: 'G2', name: 'G', octave: 2, noteIndex: 7, midi: 43 },
      { label: 'C3', name: 'C', octave: 3, noteIndex: 0, midi: 48 },
      { label: 'E3', name: 'E', octave: 3, noteIndex: 4, midi: 52 },
      { label: 'G3', name: 'G', octave: 3, noteIndex: 7, midi: 55 },
      { label: 'C4', name: 'C', octave: 4, noteIndex: 0, midi: 60 },
      { label: 'High E4', name: 'E', octave: 4, noteIndex: 4, midi: 64 },
    ],
  },
  {
    id: 'voice-soprano',
    name: 'Voice: Soprano',
    category: 'voice',
    description: 'High female voice range typically from C4 (261 Hz) to C6 (1046 Hz).',
    notes: [
      { label: 'Low C4', name: 'C', octave: 4, noteIndex: 0, midi: 60 },
      { label: 'E4', name: 'E', octave: 4, noteIndex: 4, midi: 64 },
      { label: 'G4', name: 'G', octave: 4, noteIndex: 7, midi: 67 },
      { label: 'C5', name: 'C', octave: 5, noteIndex: 0, midi: 72 },
      { label: 'E5', name: 'E', octave: 5, noteIndex: 4, midi: 76 },
      { label: 'G5', name: 'G', octave: 5, noteIndex: 7, midi: 79 },
      { label: 'High C6', name: 'C', octave: 6, noteIndex: 0, midi: 84 },
    ],
  },
  {
    id: 'voice-alto',
    name: 'Voice: Alto / Contralto',
    category: 'voice',
    description: 'Lower female voice range typically from F3 (175 Hz) to F5 (698 Hz).',
    notes: [
      { label: 'Low F3', name: 'F', octave: 3, noteIndex: 5, midi: 53 },
      { label: 'A3', name: 'A', octave: 3, noteIndex: 9, midi: 57 },
      { label: 'C4', name: 'C', octave: 4, noteIndex: 0, midi: 60 },
      { label: 'F4', name: 'F', octave: 4, noteIndex: 5, midi: 65 },
      { label: 'A4', name: 'A', octave: 4, noteIndex: 9, midi: 69 },
      { label: 'C5', name: 'C', octave: 5, noteIndex: 0, midi: 72 },
      { label: 'High F5', name: 'F', octave: 5, noteIndex: 5, midi: 77 },
    ],
  },
];
