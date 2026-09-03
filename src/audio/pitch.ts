/**
 * Audio pitch detection and music theory conversion utilities.
 */

export const NOTE_NAMES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
export const NOTE_NAMES_FLAT  = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const;
export const SOLFEGE_NAMES    = ['Do', 'Di', 'Re', 'Ri', 'Mi', 'Fa', 'Fi', 'Sol', 'Si', 'La', 'Li', 'Ti'] as const;

export type NotationType = 'sharp' | 'flat' | 'solfege';

export interface NoteInfo {
  frequency: number;
  targetFrequency: number;
  midi: number;
  noteIndex: number;
  noteName: string;
  accidental: string;
  octave: number;
  cents: number;
  solfege: string;
  inTune: boolean; // within tolerance (e.g. +/- 3 cents)
}

/**
 * Convert a frequency in Hz to NoteInfo relative to an A4 calibration (default 440 Hz).
 */
export function noteFromPitch(frequency: number, a4: number = 440, notation: NotationType = 'sharp'): NoteInfo | null {
  if (frequency <= 0 || !isFinite(frequency)) {
    return null;
  }

  // MIDI note number formula: 69 + 12 * log2(f / A4)
  const fractionalMidi = 69 + 12 * Math.log2(frequency / a4);
  const roundedMidi = Math.round(fractionalMidi);
  const cents = Math.round((fractionalMidi - roundedMidi) * 100);

  // Exact frequency of the nearest chromatic note
  const targetFrequency = a4 * Math.pow(2, (roundedMidi - 69) / 12);

  // Note index: 0 = C, 1 = C#/Db, ..., 9 = A, 11 = B
  const noteIndex = ((roundedMidi % 12) + 12) % 12;
  const octave = Math.floor(roundedMidi / 12) - 1;

  let baseName = '';
  let accidental = '';

  if (notation === 'flat') {
    const raw = NOTE_NAMES_FLAT[noteIndex];
    baseName = raw[0];
    accidental = raw.length > 1 ? '♭' : '';
  } else if (notation === 'solfege') {
    baseName = SOLFEGE_NAMES[noteIndex];
    accidental = '';
  } else {
    const raw = NOTE_NAMES_SHARP[noteIndex];
    baseName = raw[0];
    accidental = raw.length > 1 ? '♯' : '';
  }

  const solfege = SOLFEGE_NAMES[noteIndex];

  return {
    frequency: Math.round(frequency * 10) / 10,
    targetFrequency: Math.round(targetFrequency * 10) / 10,
    midi: fractionalMidi,
    noteIndex,
    noteName: baseName + accidental,
    accidental,
    octave,
    cents,
    solfege,
    inTune: Math.abs(cents) <= 3,
  };
}

/**
 * Calculate the exact frequency for a given note and octave (e.g. noteIndex 9, octave 4 = A4 = 440Hz).
 */
export function freqFromNote(noteIndex: number, octave: number, a4: number = 440): number {
  const midi = (octave + 1) * 12 + noteIndex;
  return a4 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Calculate the frequency for a given MIDI note number.
 */
export function freqFromMidi(midi: number, a4: number = 440): number {
  return a4 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Normalized Square Difference Function (NSDF) / Autocorrelation pitch detector with parabolic interpolation.
 * Excellent accuracy across wide frequency range (25 Hz - 2500 Hz), covering bass, guitar, violin, and human voice.
 */
export interface PitchResult {
  frequency: number;
  confidence: number;
  rms: number;
}

export function autoCorrelate(
  buffer: Float32Array,
  sampleRate: number,
  minFreq: number = 30,
  maxFreq: number = 2200,
  noiseGateThreshold: number = 0.002
): PitchResult {
  const bufferLength = buffer.length;

  // 1. Calculate Root-Mean-Square (RMS) volume to gate silence/ambient noise
  let sumSquares = 0;
  for (let i = 0; i < bufferLength; i++) {
    const val = buffer[i];
    sumSquares += val * val;
  }
  const rms = Math.sqrt(sumSquares / bufferLength);

  if (rms < noiseGateThreshold) {
    return { frequency: 0, confidence: 0, rms };
  }

  // 2. Remove DC bias (center the signal)
  let sum = 0;
  for (let i = 0; i < bufferLength; i++) {
    sum += buffer[i];
  }
  const mean = sum / bufferLength;

  // 3. Search bounds for period lags
  // e.g. at 48kHz, minPeriod for 2200Hz is ~21; maxPeriod for 30Hz is 1600.
  const minPeriod = Math.max(4, Math.floor(sampleRate / maxFreq));
  const maxPeriod = Math.min(bufferLength - 1, Math.ceil(sampleRate / minFreq));

  // 4. Compute Normalized Autocorrelation / NSDF
  // NSDF: r(tau) / sqrt(m(0) * m(tau)) where m(tau) is power
  let bestPeriod = -1;
  let maxCorrelation = -1;

  // We look for the first significant peak after zero-crossing or dip to prevent octave doubling
  let hasDipped = false;
  const correlations = new Float32Array(maxPeriod + 2);

  // Compute energy for normalization
  let runningEnergy0 = 0;
  let runningEnergyTau = 0;
  for (let i = 0; i < bufferLength - maxPeriod; i++) {
    const v = buffer[i] - mean;
    runningEnergy0 += v * v;
  }

  for (let tau = minPeriod; tau <= maxPeriod; tau++) {
    let dotProduct = 0;
    runningEnergyTau = 0;
    const limit = bufferLength - tau;

    for (let i = 0; i < limit; i++) {
      const v1 = buffer[i] - mean;
      const v2 = buffer[i + tau] - mean;
      dotProduct += v1 * v2;
      runningEnergyTau += v2 * v2;
    }

    const norm = Math.sqrt(runningEnergy0 * runningEnergyTau);
    const r = norm > 0 ? dotProduct / norm : 0;
    correlations[tau] = r;

    // Detect first dip below 0.2
    if (!hasDipped && r < 0.2) {
      hasDipped = true;
    }

    // Only search for peaks after the initial zero-lag correlation has dipped
    if (hasDipped && tau > minPeriod) {
      const prev = correlations[tau - 1];
      const prev2 = correlations[tau - 2];

      // Local peak at tau - 1
      if (prev > prev2 && prev > r && prev > 0.45) {
        if (prev > maxCorrelation) {
          maxCorrelation = prev;
          bestPeriod = tau - 1;

          // If correlation is exceptionally high (>= 0.90), we have found the fundamental period!
          if (prev >= 0.90) {
            break;
          }
        }
      }
    }
  }

  if (bestPeriod === -1 || maxCorrelation < 0.45) {
    return { frequency: 0, confidence: maxCorrelation > 0 ? maxCorrelation : 0, rms };
  }

  // 5. Parabolic interpolation around bestPeriod for sub-sample precision
  const k = bestPeriod;
  const y1 = correlations[k - 1];
  const y2 = correlations[k];
  const y3 = correlations[k + 1];

  const denominator = 2 * (2 * y2 - y1 - y3);
  let delta = 0;
  if (Math.abs(denominator) > 1e-6) {
    delta = (y3 - y1) / denominator;
  }

  // Clamp delta to [-0.5, 0.5]
  delta = Math.max(-0.5, Math.min(0.5, delta));
  const refinedPeriod = k + delta;
  const detectedFreq = sampleRate / refinedPeriod;

  // Sanity check
  if (detectedFreq < minFreq * 0.9 || detectedFreq > maxFreq * 1.1) {
    return { frequency: 0, confidence: 0, rms };
  }

  return {
    frequency: detectedFreq,
    confidence: maxCorrelation,
    rms,
  };
}
