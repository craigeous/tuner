# TunerLab — Instrument & Vocal Tuner

A high-precision, low-latency web application designed for tuning musical instruments and training vocal intonation. Runs locally on your laptop in any modern browser with zero external runtime dependencies.

## Features

- **Microphone Pitch Detection**:
  - Sub-cent accurate pitch tracking using **Normalized Square Difference Function (NSDF) / Autocorrelation** with parabolic peak interpolation.
  - Frequency range from ~25 Hz (Low B on 5-string bass) to 2200 Hz (high vocal / violin registers).
  - Noise gate threshold control and DC-offset/high-pass & low-pass filtering.
  - "Raw Musician Audio" mode (bypasses browser echo cancellation & speech suppression that often distorts sustained musical notes).
- **Visual Tuner Interface**:
  - Large note letter, accidental (`♯` / `♭`), octave, and Solfège (`Do-Re-Mi`) readouts.
  - Smooth spring-damped **needle arc gauge** (-50¢ to +50¢).
  - Dynamic color feedback: Emerald Green (in tune within ±3¢), Lime (±8¢), Amber, and Red.
  - **Stroboscopic precision tuner bar**: Scrolls left when flat, scrolls right when sharp, and stops dead-still when in tune.
- **Instrument Presets & Vocal Profiles**:
  - Chromatic (all notes C0 to B8)
  - Guitar (Standard, Drop D, DADGAD)
  - Bass Guitar (Standard 4-String, 5-String with low B)
  - Ukulele (Standard Soprano/Concert/Tenor)
  - Orchestral Strings (Violin, Cello)
  - Vocal Range Guides (Tenor, Baritone, Bass, Soprano, Alto)
  - *Click any string/note button to hear the reference pitch instantly, and watch it auto-highlight as you play.*
- **Reference Tone & Drone Generator**:
  - Play single notes with acoustic pluck envelopes or continuous sustained drones.
  - 4 synthesized timbres: Acoustic Pluck, Pure Sine, Clarinet / Mellow Reed, and Flute / Warm Triangle.
  - Exact frequency slider with 0.1 Hz resolution and master volume/mute.
- **Interactive Piano Roll**:
  - Full keyboard with octave shift controls (C1 to C8).
  - Click to play reference notes.
  - **Dynamic pitch match visualization**: Keys light up when detected by the microphone!
- **Pitch Match Trainer (Ear & Voice Training)**:
  - Interactive intonation exercise: hear a target pitch, then sing or play into the mic to match it.
  - Real-time animated bullseye ring, streak counter, and audio chime confirmations.

## Live Demo

- **Hosted Web App:** [https://craigeous.github.io/tuner/](https://craigeous.github.io/tuner/)
  *(Works on desktop and mobile phones with full microphone access over trusted HTTPS).*

## Getting Started

### Prerequisites

- Node.js (v18+)

### Development

```bash
# Install dependencies (already completed)
npm install

# Start local development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Production Build

```bash
npm run build
npm run preview
```

Or serve the static `dist/` directory with any static server:
```bash
python3 -m http.server 8000 -d dist
```

## Keyboard Shortcuts

| Shortcut | Action |
| --- | --- |
| `Space` | Toggle Microphone input on/off |
| `1` | Switch to Tuner tab |
| `2` | Switch to Tone Generator tab |
| `3` | Switch to Piano Roll tab |
| `4` | Switch to Pitch Match Trainer tab |
| `D` | Toggle continuous drone on/off |
| `M` | Mute / Unmute audio |

## Architecture

- `src/audio/pitch.ts`: Autocorrelation DSP, parabolic interpolation, frequency-to-note math, Solfège mapping, and A4 calibration.
- `src/audio/audioInput.ts`: Web Audio API `getUserMedia` capture, Biquad filters, `AnalyserNode`, moving median smoothing, and rolling pitch history buffer.
- `src/audio/toneGenerator.ts`: Web Audio synthesizer with multi-harmonic timbres, ADSR plucks, continuous drone loop, and master gain.
- `src/audio/presets.ts`: Tuning presets for guitar, bass, ukulele, violin, cello, and vocal range profiles.
- `src/ui/tunerGauge.ts`: High-DPI Canvas gauge with spring physics needle and stroboscopic precision bar.
- `src/ui/pitchHistoryGraph.ts`: Real-time scrolling pitch trace (vocal vibrato & stability) and oscilloscope waveform visualizer.
- `src/ui/pianoKeyboard.ts`: Interactive piano roll with microphone pitch illumination.
- `src/ui/earTrainer.ts`: Pitch match trainer with circular progress ring, streak tracker, and audio reward.
- `src/main.ts`: Main controller, event wiring, and keyboard shortcuts.
- `src/style.css`: Studio audio dark aesthetic with high-contrast LED accents.
