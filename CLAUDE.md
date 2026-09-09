# TunerLab Developer Guide

Local high-performance web app for instrument and vocal pitch detection and tone generation.

## Commands

- `npm run dev` — starts local Vite dev server at http://localhost:5173
- `npm run build` — runs TypeScript compiler check (`tsc`) and bundles static production assets via `vite build` to `dist/`
- `npm run preview` — previews production build at http://localhost:4173

## Architecture & Code Map

- `src/audio/pitch.ts`:
  - `autoCorrelate(buffer, sampleRate, minFreq, maxFreq, noiseGate)`: Normalized Square Difference Function with parabolic interpolation across peaks.
  - `noteFromPitch(freq, a4, notation)`: Converts Hz to MIDI, note name, accidental, octave, cents offset, Solfège name, and inTune boolean (±3¢).
  - `freqFromNote(...)` and `freqFromMidi(...)`: Inverse frequency calculations based on A4 reference.
- `src/audio/audioInput.ts`:
  - Microphone capture via `navigator.mediaDevices.getUserMedia`.
  - Audio graph: `MediaStreamSourceNode -> BiquadFilter (highpass 32Hz) -> BiquadFilter (lowpass 2600Hz) -> AnalyserNode (fftSize 4096)`.
  - Maintains rolling pitch history and moving median smoothing window to reject transient noise.
- `src/audio/toneGenerator.ts`:
  - Synthesizer for reference tones, plucked notes, and continuous drones with 4 timbres: `acoustic`, `sine`, `reed`, `triangle`.
- `src/audio/presets.ts`:
  - Instrument tunings (Guitar, Bass, Ukulele, Violin, Cello) and vocal range profiles (Bass, Baritone, Tenor, Alto, Soprano).
- `src/ui/tunerGauge.ts`:
  - HTML5 Canvas arc needle gauge with spring physics and stroboscopic error pattern.
- `src/ui/pitchHistoryGraph.ts`:
  - Dual-mode visualizer: 4.5-second scrolling pitch stability trace (shows vocal vibrato / pitch drift) and live oscilloscope waveform.
- `src/ui/pianoKeyboard.ts`:
  - Interactive piano keys with octave shift controls and microphone pitch illumination.
- `src/ui/earTrainer.ts`:
  - Pitch match ear training challenge with circular progress ring and streak counter.
- `src/ui/sheetMusicStaff.ts`:
  - Interactive sheet music staff with clef selection, note placement, melody sequencer, and microphone pitch reflection.
- `src/main.ts`:
  - Application wiring, event listeners, localStorage persistence, and keyboard shortcuts.
