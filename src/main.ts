/**
 * TunerLab - Main Application Entry Point.
 * Integrates Microphone Pitch Detection, Tone Generator, Visual Gauge,
 * Pitch History Trace, Interactive Piano Keyboard, and Ear Trainer.
 */

import './style.css';
import { AudioInputEngine, type PitchFrame } from './audio/audioInput.ts';
import { ToneGenerator, type TimbreType } from './audio/toneGenerator.ts';
import { TunerGauge } from './ui/tunerGauge.ts';
import { PitchHistoryGraph, type VisualizerMode } from './ui/pitchHistoryGraph.ts';
import { PianoKeyboard } from './ui/pianoKeyboard.ts';
import { EarTrainer } from './ui/earTrainer.ts';
import { MiniTuner } from './ui/miniTuner.ts';
import { SheetMusicStaff } from './ui/sheetMusicStaff.ts';
import { INSTRUMENT_PRESETS, type Preset, type PresetNote } from './audio/presets.ts';
import { NOTE_NAMES_SHARP, NOTE_NAMES_FLAT, freqFromNote, type NotationType } from './audio/pitch.ts';

// --------------------------------------------------------------------------
// Core State & Engines
// --------------------------------------------------------------------------
const audioInput = new AudioInputEngine();
const toneGen = new ToneGenerator();

let currentPreset: Preset = INSTRUMENT_PRESETS[1]; // default Guitar Standard
let currentNotation: NotationType = 'sharp';
let currentA4 = 440;

// Tone generator panel state
let genNoteIndex = 9; // A
let genOctave = 4;
let genFreq = 440;
let genTimbre: TimbreType = 'acoustic';

// Load stored preferences
try {
  const savedA4 = localStorage.getItem('tunerlab_a4');
  if (savedA4) currentA4 = Number(savedA4) || 440;

  const savedNotation = localStorage.getItem('tunerlab_notation');
  if (savedNotation) currentNotation = savedNotation as NotationType;

  const savedPresetId = localStorage.getItem('tunerlab_preset');
  if (savedPresetId) {
    const found = INSTRUMENT_PRESETS.find((p) => p.id === savedPresetId);
    if (found) currentPreset = found;
  }
} catch {}

audioInput.setA4(currentA4);
audioInput.setNotation(currentNotation);

// --------------------------------------------------------------------------
// Build Application HTML Structure
// --------------------------------------------------------------------------
const appRoot = document.querySelector<HTMLDivElement>('#app')!;
appRoot.innerHTML = `
  <!-- App Header -->
  <header class="app-header">
    <div class="brand-section">
      <div class="brand-logo" aria-hidden="true">&#9836;</div>
      <div class="brand-title">
        <h1>TunerLab</h1>
        <p>Instrument & Vocal Chromatic Tuner</p>
      </div>
    </div>

    <div class="header-controls">
      <!-- Master Mic Button -->
      <button type="button" class="btn-mic-toggle" id="btn-master-mic" aria-label="Toggle Microphone Input">
        <span class="mic-pulse-dot"></span>
        <span id="mic-status-label">Start Listening</span>
      </button>

      <!-- A4 Calibration -->
      <div class="control-badge" title="Calibration reference pitch (Standard: 440 Hz)">
        <label for="a4-display">A4 Ref</label>
        <button type="button" class="stepper-btn" id="btn-a4-minus" aria-label="Decrease A4 pitch">-</button>
        <span class="value-text" id="a4-display">${currentA4} Hz</span>
        <button type="button" class="stepper-btn" id="btn-a4-plus" aria-label="Increase A4 pitch">+</button>
      </div>

      <!-- Notation Selector -->
      <div class="control-badge">
        <label for="notation-select">Keys</label>
        <select class="app-select" id="notation-select" aria-label="Select musical notation style">
          <option value="sharp" ${currentNotation === 'sharp' ? 'selected' : ''}>Sharps (♯)</option>
          <option value="flat" ${currentNotation === 'flat' ? 'selected' : ''}>Flats (♭)</option>
          <option value="solfege" ${currentNotation === 'solfege' ? 'selected' : ''}>Solfège (Do-Re-Mi)</option>
        </select>
      </div>

      <!-- Volume & Mute -->
      <div class="control-badge" title="Master output volume">
        <label for="master-volume">Vol</label>
        <input type="range" id="master-volume" min="0" max="1" step="0.05" value="0.6" style="width: 70px;" aria-label="Output Volume" />
        <button type="button" class="stepper-btn" id="btn-mute" title="Mute Audio">🔊</button>
      </div>
    </div>
  </header>

  <!-- Navigation Tabs -->
  <nav class="nav-tabs" role="tablist">
    <button type="button" class="tab-btn active" data-tab="tuner" role="tab" aria-selected="true">
      <span>🎯</span> Tuner
    </button>
    <button type="button" class="tab-btn" data-tab="generator" role="tab" aria-selected="false">
      <span>🔊</span> Tone Generator
    </button>
    <button type="button" class="tab-btn" data-tab="piano" role="tab" aria-selected="false">
      <span>🎹</span> Piano Roll
    </button>
    <button type="button" class="tab-btn" data-tab="trainer" role="tab" aria-selected="false">
      <span>🎯</span> Pitch Match
    </button>
    <button type="button" class="tab-btn" data-tab="sheet" role="tab" aria-selected="false">
      <span>🎼</span> Sheet Music
    </button>
  </nav>

  <!-- Tab Contents -->
  <main class="tab-content">
    <!-- ==================== TAB 1: TUNER ==================== -->
    <section class="tab-panel active" id="panel-tuner" role="tabpanel">
      <!-- Hero Tuner Card -->
      <div class="tuner-hero-card" id="tuner-hero-card">
        <!-- Big Note Display -->
        <div class="note-display-container">
          <div class="note-badge-wrap">
            <span class="note-main-letter" id="note-letter">-</span>
            <span class="note-accidental" id="note-accidental"></span>
            <span class="note-octave" id="note-octave"></span>
          </div>
          <div class="note-solfege-sub" id="note-solfege">Play a note or sing into microphone</div>
        </div>

        <!-- Direction Badge -->
        <div class="tuning-guidance-badge" id="tuning-guidance">Waiting for sound...</div>

        <!-- Numeric Stats -->
        <div class="numeric-stats-row">
          <div class="stat-pill">
            <span class="stat-label">Offset</span>
            <span class="stat-val cents-val" id="stat-cents">0.0¢</span>
          </div>
          <div class="stat-pill">
            <span class="stat-label">Detected</span>
            <span class="stat-val" id="stat-freq">0.0 Hz</span>
          </div>
          <div class="stat-pill">
            <span class="stat-label">Target Note</span>
            <span class="stat-val" id="stat-target-freq">0.0 Hz</span>
          </div>
        </div>

        <!-- Canvas Arc Gauge & Strobe -->
        <div class="gauge-canvas-container">
          <canvas id="tuner-gauge-canvas"></canvas>
        </div>
      </div>

      <!-- Presets & Strings Card -->
      <div class="preset-card">
        <div class="preset-header">
          <div class="preset-title-wrap">
            <h3 id="preset-title">${currentPreset.name}</h3>
            <p id="preset-desc">${currentPreset.description}</p>
          </div>
          <select class="app-select" id="preset-select" aria-label="Select instrument tuning or vocal profile">
            ${INSTRUMENT_PRESETS.map(
              (p) => `<option value="${p.id}" ${p.id === currentPreset.id ? 'selected' : ''}>${p.name}</option>`
            ).join('')}
          </select>
        </div>
        <div class="preset-pills-container" id="preset-strings-container"></div>
      </div>

      <!-- Live Visualizer & Input Bar -->
      <div class="visualizer-card">
        <div class="visualizer-header">
          <h3 id="viz-title">Pitch Stability Trace</h3>
          <div class="viz-toggle-group">
            <button type="button" class="viz-toggle-btn active" data-viz="pitch-history">Pitch Trace</button>
            <button type="button" class="viz-toggle-btn" data-viz="waveform">Waveform</button>
          </div>
        </div>

        <div class="viz-canvas-container">
          <canvas id="pitch-trace-canvas"></canvas>
        </div>

        <!-- VU Level & Microphone Sensitivity Controls -->
        <div class="audio-meter-bar">
          <div class="meter-row-top">
            <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">MIC LEVEL</span>
            <div class="vu-meter-wrap">
              <div class="vu-meter-level" id="vu-meter-bar"></div>
            </div>
            <button type="button" class="btn-boost-quick ${audioInput.getInputGain() >= 3 ? 'active' : ''}" id="btn-quick-ipad-boost" title="Preamp boost for iPad Pro/Air mic arrays">
              ⚡ iPad / Quiet Mic Boost
            </button>
          </div>

          <div class="meter-controls-grid">
            <!-- Digital Preamp Boost Slider -->
            <div class="gate-control-wrap" title="Software preamp gain multiplier. Boosts quiet tablet microphone arrays.">
              <label for="mic-gain-slider">Preamp Gain:</label>
              <input type="range" id="mic-gain-slider" min="1" max="10" step="0.5" value="${audioInput.getInputGain()}" style="width: 80px;" />
              <span class="value-text" id="mic-gain-label" style="min-width: 42px;">${audioInput.getInputGain().toFixed(1)}x</span>
            </div>

            <!-- Noise Gate Slider -->
            <div class="gate-control-wrap" title="Lower values detect softer notes; higher values filter out background noise">
              <label for="noise-gate-slider">Gate:</label>
              <input type="range" id="noise-gate-slider" min="0.0003" max="0.02" step="0.0003" value="${audioInput.getNoiseGate()}" style="width: 80px;" />
              <span class="value-text" id="noise-gate-label" style="min-width: 48px;">${(audioInput.getNoiseGate() * 1000).toFixed(1)}m</span>
            </div>

            <!-- Auto Gain Control Toggle -->
            <div class="gate-control-wrap">
              <label title="Engages hardware automatic gain leveling in iPadOS/browser">
                <input type="checkbox" id="auto-gain-toggle" ${audioInput.getAutoGainControl() ? 'checked' : ''} />
                Auto-Gain (AGC)
              </label>
            </div>

            <!-- Raw Audio Toggle -->
            <div class="gate-control-wrap">
              <label title="Disables echo cancellation and noise suppression for instruments">
                <input type="checkbox" id="raw-audio-toggle" ${audioInput.getRawAudioMode() ? 'checked' : ''} />
                Raw Musician Audio
              </label>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ==================== TAB 2: TONE GENERATOR ==================== -->
    <section class="tab-panel" id="panel-generator" role="tabpanel">
      <div class="tone-card">
        <div class="tone-header">
          <h2>Reference Tone & Drone Generator</h2>
          <p>Generate clean reference tones to tune instruments by ear or practice vocal pitch matching.</p>
        </div>

        <!-- Live Pitch & Tone Matcher on Generator Tab -->
        <div id="generator-mini-tuner"></div>

        <div class="tone-playback-bar">
          <button type="button" class="btn-big-play" id="btn-play-tone">
            <span>🔊</span> Play Note (${NOTE_NAMES_SHARP[genNoteIndex]}${genOctave} &bull; ${genFreq.toFixed(1)} Hz)
          </button>
          <button type="button" class="btn-drone-toggle" id="btn-drone-toggle">
            <span>〰️</span> Start Continuous Drone
          </button>
        </div>

        <div class="tone-pitch-selector-grid">
          <!-- 12 Chromatic Notes -->
          <div class="control-panel-box">
            <h4>1. Select Note</h4>
            <div class="note-grid-12" id="tone-note-grid">
              ${NOTE_NAMES_SHARP.map(
                (name, idx) =>
                  `<button type="button" class="note-grid-btn ${idx === genNoteIndex ? 'active' : ''}" data-idx="${idx}">${name}</button>`
              ).join('')}
            </div>
          </div>

          <!-- Octave & Timbre -->
          <div class="control-panel-box">
            <h4>2. Octave & Timbre</h4>
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <span style="color: var(--text-muted); font-size: 0.85rem;">Octave:</span>
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <button type="button" class="stepper-btn" id="btn-gen-oct-minus">-</button>
                <span class="value-text" id="gen-oct-display">${genOctave}</span>
                <button type="button" class="stepper-btn" id="btn-gen-oct-plus">+</button>
              </div>
            </div>

            <div style="margin-top: 0.5rem;">
              <span style="color: var(--text-muted); font-size: 0.82rem; display: block; margin-bottom: 0.4rem;">Sound Timbre:</span>
              <div class="timbre-selector-row">
                <button type="button" class="timbre-btn active" data-timbre="acoustic">
                  <span>🎸</span> Acoustic Pluck
                </button>
                <button type="button" class="timbre-btn" data-timbre="sine">
                  <span>〰️</span> Pure Sine
                </button>
                <button type="button" class="timbre-btn" data-timbre="reed">
                  <span>🎷</span> Clarinet / Reed
                </button>
                <button type="button" class="timbre-btn" data-timbre="triangle">
                  <span>🪈</span> Flute / Warm
                </button>
              </div>
            </div>

            <div style="margin-top: 0.85rem;">
              <div style="display: flex; justify-content: space-between; font-size: 0.82rem; color: var(--text-muted); margin-bottom: 0.2rem;">
                <span>Exact Frequency:</span>
                <span style="font-family: var(--font-mono); color: var(--accent-cyan); font-weight: 600;" id="gen-freq-display">${genFreq.toFixed(1)} Hz</span>
              </div>
              <input type="range" id="gen-freq-slider" min="50" max="1500" step="0.5" value="${genFreq}" style="width: 100%;" />
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ==================== TAB 3: PIANO ROLL ==================== -->
    <section class="tab-panel" id="panel-piano" role="tabpanel">
      <div class="piano-section-card">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
          <div>
            <h2 style="font-size: 1.25rem; font-weight: 700; color: #fff;">Interactive Piano Roll</h2>
            <p style="font-size: 0.82rem; color: var(--text-muted);">
              Click or tap keys to play reference notes. Keys light up dynamically when heard through the microphone!
            </p>
          </div>
        </div>

        <!-- Live Pitch Monitor on Piano Tab -->
        <div id="piano-mini-tuner"></div>

        <div id="piano-container"></div>
      </div>
    </section>

    <!-- ==================== TAB 4: PITCH MATCH TRAINER ==================== -->
    <section class="tab-panel" id="panel-trainer" role="tabpanel">
      <div id="trainer-container"></div>
    </section>

    <!-- ==================== TAB 5: SHEET MUSIC ==================== -->
    <section class="tab-panel" id="panel-sheet" role="tabpanel">
      <div id="sheet-container"></div>
    </section>
  </main>

  <!-- Footer with keyboard shortcuts -->
  <footer class="app-footer">
    <div class="footer-shortcuts">
      <span>Shortcuts:</span>
      <kbd>Space</kbd> Mic &bull;
      <kbd>1-5</kbd> Tabs &bull;
      <kbd>Z-M / Q-I</kbd> Play Piano &bull;
      <kbd>[ / ]</kbd> Octaves &bull;
      <kbd>D</kbd> Drone &bull;
      <kbd>M</kbd> Mute
    </div>
    <div>TunerLab &bull; Web Audio & DSP Pitch Detection</div>
  </footer>
`;

// --------------------------------------------------------------------------
// Initialize UI Component Instances
// --------------------------------------------------------------------------
const gaugeCanvas = document.querySelector<HTMLCanvasElement>('#tuner-gauge-canvas')!;
const tunerGauge = new TunerGauge(gaugeCanvas);

const traceCanvas = document.querySelector<HTMLCanvasElement>('#pitch-trace-canvas')!;
const pitchVisualizer = new PitchHistoryGraph(traceCanvas);

const pianoContainer = document.querySelector<HTMLElement>('#piano-container')!;
const piano = new PianoKeyboard(pianoContainer, toneGen, {
  startOctave: 3,
  numOctaves: 2,
  a4: currentA4,
  notation: currentNotation,
});

const trainerContainer = document.querySelector<HTMLElement>('#trainer-container')!;
const earTrainer = new EarTrainer(trainerContainer, toneGen, currentA4);

const genMiniTunerContainer = document.querySelector<HTMLElement>('#generator-mini-tuner')!;
const genMiniTuner = new MiniTuner(genMiniTunerContainer, {
  label: 'Live Voice / Instrument Pitch Matcher',
  showReferenceComparison: true,
});

const pianoMiniTunerContainer = document.querySelector<HTMLElement>('#piano-mini-tuner')!;
const pianoMiniTuner = new MiniTuner(pianoMiniTunerContainer, {
  label: 'Live Microphone Pitch Tracker',
  compact: true,
});

const sheetContainer = document.querySelector<HTMLElement>('#sheet-container')!;
const sheetMusic = new SheetMusicStaff(sheetContainer, toneGen, currentA4);

// --------------------------------------------------------------------------
// DOM Elements Cache
// --------------------------------------------------------------------------
const btnMasterMic = document.querySelector<HTMLButtonElement>('#btn-master-mic')!;
const micStatusLabel = document.querySelector<HTMLSpanElement>('#mic-status-label')!;
const noteLetter = document.querySelector<HTMLSpanElement>('#note-letter')!;
const noteAccidental = document.querySelector<HTMLSpanElement>('#note-accidental')!;
const noteOctave = document.querySelector<HTMLSpanElement>('#note-octave')!;
const noteSolfege = document.querySelector<HTMLDivElement>('#note-solfege')!;
const tuningGuidance = document.querySelector<HTMLDivElement>('#tuning-guidance')!;
const statCents = document.querySelector<HTMLSpanElement>('#stat-cents')!;
const statFreq = document.querySelector<HTMLSpanElement>('#stat-freq')!;
const statTargetFreq = document.querySelector<HTMLSpanElement>('#stat-target-freq')!;
const vuMeterBar = document.querySelector<HTMLDivElement>('#vu-meter-bar')!;
const tunerHeroCard = document.querySelector<HTMLDivElement>('#tuner-hero-card')!;

// --------------------------------------------------------------------------
// Microphone Audio Processing Callback
// --------------------------------------------------------------------------
audioInput.subscribe((frame: PitchFrame) => {
  // 1. Update VU Meter
  const vuPct = Math.min(100, Math.round(frame.rms * 350));
  if (vuMeterBar) {
    vuMeterBar.style.width = `${vuPct}%`;
  }

  // 2. Update Visualizer (Pitch Trace or Waveform)
  pitchVisualizer.update(frame);

  // 3. Update Ear Trainer
  earTrainer.updatePitch(frame);

  // 4. Update in-tab Mini Tuners & Sheet Music Live Pitch
  const activeGenNoteLabel = `${NOTE_NAMES_SHARP[genNoteIndex]}${genOctave}`;
  genMiniTuner.update(frame, genFreq, activeGenNoteLabel);
  pianoMiniTuner.update(frame);
  sheetMusic.updatePitch(frame);

  // 5. Update Main Tuner Display
  if (frame.note && frame.frequency > 0) {
    const n = frame.note;
    noteLetter.textContent = n.noteName[0];
    noteAccidental.textContent = n.accidental;
    noteOctave.textContent = String(n.octave);
    noteSolfege.textContent = `Solfège: ${n.solfege} ${n.octave}`;

    // Cents offset text
    const sign = n.cents > 0 ? '+' : '';
    statCents.textContent = `${sign}${n.cents}¢`;
    statFreq.textContent = `${n.frequency.toFixed(1)} Hz`;
    statTargetFreq.textContent = `${n.targetFrequency.toFixed(1)} Hz`;

    // Direction guidance and badge classes
    tunerHeroCard.className = 'tuner-hero-card';
    tuningGuidance.className = 'tuning-guidance-badge';

    if (Math.abs(n.cents) <= 3) {
      tunerHeroCard.classList.add('in-tune');
      tuningGuidance.classList.add('in-tune');
      tuningGuidance.textContent = '✓ PERFECT IN TUNE';
    } else if (Math.abs(n.cents) <= 8) {
      tunerHeroCard.classList.add('close-tune');
      if (n.cents < 0) {
        tuningGuidance.classList.add('flat');
        tuningGuidance.textContent = '▲ SLIGHTLY FLAT';
      } else {
        tuningGuidance.classList.add('sharp');
        tuningGuidance.textContent = '▼ SLIGHTLY SHARP';
      }
    } else {
      if (n.cents < 0) {
        tunerHeroCard.classList.add('flat-tune');
        tuningGuidance.classList.add('flat');
        tuningGuidance.textContent = `▲ TUNE UP (${Math.abs(n.cents)}¢ FLAT)`;
      } else {
        tunerHeroCard.classList.add('sharp-tune');
        tuningGuidance.classList.add('sharp');
        tuningGuidance.textContent = `▼ TUNE DOWN (+${n.cents}¢ SHARP)`;
      }
    }

    // Update gauge needle
    tunerGauge.update(n);

    // Light up key on piano
    piano.highlightMidi(Math.round(n.midi));

    // Update Preset string highlight
    highlightPresetString(n.midi, Math.abs(n.cents) <= 3);
  } else {
    // Silence or mic off
    tunerGauge.update(null);
    piano.highlightMidi(null);
    highlightPresetString(null, false);

    if (audioInput.isListening()) {
      tuningGuidance.textContent = 'Listening for notes...';
      tuningGuidance.className = 'tuning-guidance-badge';
    } else {
      tuningGuidance.textContent = 'Microphone off. Click Start Listening.';
      tuningGuidance.className = 'tuning-guidance-badge';
    }
  }
});

// --------------------------------------------------------------------------
// Preset Strings Rendering & Auto-highlighting
// --------------------------------------------------------------------------
const presetSelect = document.querySelector<HTMLSelectElement>('#preset-select')!;
const presetStringsContainer = document.querySelector<HTMLDivElement>('#preset-strings-container')!;
const presetTitle = document.querySelector<HTMLHeadingElement>('#preset-title')!;
const presetDesc = document.querySelector<HTMLParagraphElement>('#preset-desc')!;

function renderPresetStrings(): void {
  presetTitle.textContent = currentPreset.name;
  presetDesc.textContent = currentPreset.description;
  presetStringsContainer.innerHTML = '';

  if (currentPreset.notes.length === 0) {
    // Chromatic: render 12 chromatic note buttons
    const chromaticWrap = document.createElement('div');
    chromaticWrap.style.display = 'flex';
    chromaticWrap.style.flexWrap = 'wrap';
    chromaticWrap.style.gap = '0.5rem';

    const names = currentNotation === 'flat' ? NOTE_NAMES_FLAT : NOTE_NAMES_SHARP;
    names.forEach((name, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'string-btn';
      const freq = freqFromNote(idx, 4, currentA4);
      btn.innerHTML = `
        <span class="string-name">${name}4</span>
        <span class="string-freq">${freq.toFixed(1)} Hz</span>
      `;
      btn.title = `Click to hear ${name}4 reference pitch`;
      btn.addEventListener('click', () => {
        toneGen.playNote(freq, 1.2);
      });
      chromaticWrap.appendChild(btn);
    });
    presetStringsContainer.appendChild(chromaticWrap);
    return;
  }

  currentPreset.notes.forEach((item: PresetNote) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'string-btn';
    btn.setAttribute('data-midi', String(item.midi));

    const freq = freqFromNote(item.noteIndex, item.octave, currentA4);
    btn.innerHTML = `
      <span class="string-name">${item.label}</span>
      <span class="string-freq">${freq.toFixed(1)} Hz</span>
    `;
    btn.title = `Click to hear ${item.label} reference tone`;

    btn.addEventListener('click', () => {
      toneGen.playNote(freq, 1.5);
    });

    presetStringsContainer.appendChild(btn);
  });
}

function highlightPresetString(detectedMidi: number | null, inTune: boolean): void {
  const buttons = presetStringsContainer.querySelectorAll<HTMLButtonElement>('.string-btn');
  buttons.forEach((btn) => {
    const midiAttr = btn.getAttribute('data-midi');
    if (!midiAttr || detectedMidi === null) {
      btn.classList.remove('active-target', 'in-tune-string');
      return;
    }

    const targetMidi = Number(midiAttr);
    // Closest string if within 1.5 semitones
    if (Math.abs(detectedMidi - targetMidi) <= 1.2) {
      btn.classList.add('active-target');
      if (inTune) {
        btn.classList.add('in-tune-string');
      } else {
        btn.classList.remove('in-tune-string');
      }
    } else {
      btn.classList.remove('active-target', 'in-tune-string');
    }
  });
}

presetSelect.addEventListener('change', () => {
  const selected = INSTRUMENT_PRESETS.find((p) => p.id === presetSelect.value);
  if (selected) {
    currentPreset = selected;
    localStorage.setItem('tunerlab_preset', selected.id);
    renderPresetStrings();
  }
});

renderPresetStrings();

// --------------------------------------------------------------------------
// Microphone Start / Stop Toggle
// --------------------------------------------------------------------------
async function toggleMicrophone(): Promise<void> {
  if (audioInput.isListening()) {
    audioInput.stop();
    btnMasterMic.classList.remove('listening');
    micStatusLabel.textContent = 'Start Listening';
  } else {
    // Check for Secure Context / mediaDevices support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const isMobileHttp = window.location.protocol === 'http:' && window.location.hostname !== 'localhost';
      if (isMobileHttp) {
        const httpsUrl = `https://${window.location.hostname}:5174/`;
        if (confirm(`Mobile browsers require HTTPS for microphone access.\n\nOpen the HTTPS version at ${httpsUrl}?`)) {
          window.location.href = httpsUrl;
          return;
        }
      }
      alert('Microphone access is not supported over insecure HTTP. Please use https:// on mobile.');
      return;
    }

    try {
      micStatusLabel.textContent = 'Connecting...';
      await audioInput.start();
      btnMasterMic.classList.add('listening');
      micStatusLabel.textContent = 'Microphone Active';
    } catch (err) {
      micStatusLabel.textContent = 'Mic Error (Click to retry)';
      btnMasterMic.classList.remove('listening');
      alert('Could not access microphone. Please ensure microphone permissions are granted.');
    }
  }
}

btnMasterMic.addEventListener('click', toggleMicrophone);

// --------------------------------------------------------------------------
// A4 Calibration Controls
// --------------------------------------------------------------------------
const a4Display = document.querySelector<HTMLSpanElement>('#a4-display')!;
const btnA4Minus = document.querySelector<HTMLButtonElement>('#btn-a4-minus')!;
const btnA4Plus = document.querySelector<HTMLButtonElement>('#btn-a4-plus')!;

function setA4(newA4: number): void {
  currentA4 = Math.max(415, Math.min(466, newA4));
  a4Display.textContent = `${currentA4} Hz`;
  audioInput.setA4(currentA4);
  piano.setA4(currentA4);
  earTrainer.setA4(currentA4);
  sheetMusic.setA4(currentA4);
  updateGenFrequency();
  renderPresetStrings();
  localStorage.setItem('tunerlab_a4', String(currentA4));
}

btnA4Minus.addEventListener('click', () => setA4(currentA4 - 1));
btnA4Plus.addEventListener('click', () => setA4(currentA4 + 1));

// --------------------------------------------------------------------------
// Notation Style Selector
// --------------------------------------------------------------------------
const notationSelect = document.querySelector<HTMLSelectElement>('#notation-select')!;
notationSelect.addEventListener('change', () => {
  currentNotation = notationSelect.value as NotationType;
  audioInput.setNotation(currentNotation);
  piano.setNotation(currentNotation);
  renderPresetStrings();
  localStorage.setItem('tunerlab_notation', currentNotation);
});

// --------------------------------------------------------------------------
// Volume & Mute Controls
// --------------------------------------------------------------------------
const masterVolumeSlider = document.querySelector<HTMLInputElement>('#master-volume')!;
const btnMute = document.querySelector<HTMLButtonElement>('#btn-mute')!;
let isMuted = false;
let previousVolume = 0.6;

masterVolumeSlider.addEventListener('input', () => {
  const val = parseFloat(masterVolumeSlider.value);
  toneGen.setVolume(val);
  isMuted = val === 0;
  btnMute.textContent = isMuted ? '🔇' : '🔊';
});

btnMute.addEventListener('click', () => {
  if (isMuted) {
    isMuted = false;
    masterVolumeSlider.value = String(previousVolume || 0.6);
    toneGen.setVolume(previousVolume || 0.6);
    btnMute.textContent = '🔊';
  } else {
    previousVolume = parseFloat(masterVolumeSlider.value);
    isMuted = true;
    masterVolumeSlider.value = '0';
    toneGen.setVolume(0);
    btnMute.textContent = '🔇';
  }
});

// --------------------------------------------------------------------------
// Microphone Preamp Sensitivity, Noise Gate & Audio Mode
// --------------------------------------------------------------------------
const micGainSlider = document.querySelector<HTMLInputElement>('#mic-gain-slider')!;
const micGainLabel = document.querySelector<HTMLSpanElement>('#mic-gain-label')!;
const btnQuickIpadBoost = document.querySelector<HTMLButtonElement>('#btn-quick-ipad-boost')!;
const noiseGateSlider = document.querySelector<HTMLInputElement>('#noise-gate-slider')!;
const noiseGateLabel = document.querySelector<HTMLSpanElement>('#noise-gate-label')!;
const autoGainToggle = document.querySelector<HTMLInputElement>('#auto-gain-toggle')!;
const rawAudioToggle = document.querySelector<HTMLInputElement>('#raw-audio-toggle')!;

function updateGainDisplay(gain: number): void {
  audioInput.setInputGain(gain);
  micGainSlider.value = String(gain);
  micGainLabel.textContent = `${gain.toFixed(1)}x`;
  btnQuickIpadBoost.classList.toggle('active', gain >= 3.0);
  try {
    localStorage.setItem('tunerlab_mic_gain', String(gain));
  } catch {}
}

micGainSlider.addEventListener('input', () => {
  const val = parseFloat(micGainSlider.value);
  updateGainDisplay(val);
});

btnQuickIpadBoost.addEventListener('click', () => {
  const current = audioInput.getInputGain();
  const nextGain = current >= 3.0 ? 1.0 : 4.0;
  updateGainDisplay(nextGain);
});

noiseGateSlider.addEventListener('input', () => {
  const val = parseFloat(noiseGateSlider.value);
  audioInput.setNoiseGate(val);
  noiseGateLabel.textContent = `${(val * 1000).toFixed(1)}m`;
  try {
    localStorage.setItem('tunerlab_noise_gate', String(val));
  } catch {}
});

autoGainToggle.addEventListener('change', () => {
  audioInput.setAutoGainControl(autoGainToggle.checked);
});

rawAudioToggle.addEventListener('change', () => {
  audioInput.setRawAudioMode(rawAudioToggle.checked);
});

// --------------------------------------------------------------------------
// Visualizer Mode Toggle
// --------------------------------------------------------------------------
const vizButtons = document.querySelectorAll<HTMLButtonElement>('.viz-toggle-btn');
const vizTitle = document.querySelector<HTMLHeadingElement>('#viz-title')!;

vizButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    vizButtons.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    const mode = btn.getAttribute('data-viz') as VisualizerMode;
    pitchVisualizer.setMode(mode);
    vizTitle.textContent = mode === 'waveform' ? 'Live Audio Waveform' : 'Pitch Stability Trace';
  });
});

// --------------------------------------------------------------------------
// Tabs Switching
// --------------------------------------------------------------------------
const tabButtons = document.querySelectorAll<HTMLButtonElement>('.tab-btn');
const tabPanels = document.querySelectorAll<HTMLElement>('.tab-panel');
let currentTab: string = 'tuner';

function switchTab(tabId: string): void {
  currentTab = tabId;
  tabButtons.forEach((btn) => {
    const isActive = btn.getAttribute('data-tab') === tabId;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', String(isActive));
  });

  tabPanels.forEach((panel) => {
    const isTarget = panel.id === `panel-${tabId}`;
    panel.classList.toggle('active', isTarget);
  });

  // Recompute canvas dimensions on tab switch
  if (tabId === 'tuner') {
    setTimeout(() => {
      tunerGauge.handleResize();
      pitchVisualizer.handleResize();
    }, 50);
  }
}

tabButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const tab = btn.getAttribute('data-tab');
    if (tab) switchTab(tab);
  });
});

// --------------------------------------------------------------------------
// Tone Generator Tab Controls
// --------------------------------------------------------------------------
const btnPlayTone = document.querySelector<HTMLButtonElement>('#btn-play-tone')!;
const btnDroneToggle = document.querySelector<HTMLButtonElement>('#btn-drone-toggle')!;
const toneNoteButtons = document.querySelectorAll<HTMLButtonElement>('.note-grid-btn');
const genOctDisplay = document.querySelector<HTMLSpanElement>('#gen-oct-display')!;
const btnGenOctMinus = document.querySelector<HTMLButtonElement>('#btn-gen-oct-minus')!;
const btnGenOctPlus = document.querySelector<HTMLButtonElement>('#btn-gen-oct-plus')!;
const genFreqDisplay = document.querySelector<HTMLSpanElement>('#gen-freq-display')!;
const genFreqSlider = document.querySelector<HTMLInputElement>('#gen-freq-slider')!;
const timbreButtons = document.querySelectorAll<HTMLButtonElement>('.timbre-btn');

function updateGenFrequency(): void {
  genFreq = freqFromNote(genNoteIndex, genOctave, currentA4);
  genFreqDisplay.textContent = `${genFreq.toFixed(1)} Hz`;
  genFreqSlider.value = String(genFreq);

  const noteName = NOTE_NAMES_SHARP[genNoteIndex];
  btnPlayTone.innerHTML = `<span>🔊</span> Play Note (${noteName}${genOctave} &bull; ${genFreq.toFixed(1)} Hz)`;

  if (toneGen.isDronePlaying()) {
    toneGen.updateDroneFrequency(genFreq);
  }
}

toneNoteButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    toneNoteButtons.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    genNoteIndex = Number(btn.getAttribute('data-idx'));
    updateGenFrequency();
  });
});

btnGenOctMinus.addEventListener('click', () => {
  if (genOctave > 1) {
    genOctave--;
    genOctDisplay.textContent = String(genOctave);
    updateGenFrequency();
  }
});

btnGenOctPlus.addEventListener('click', () => {
  if (genOctave < 7) {
    genOctave++;
    genOctDisplay.textContent = String(genOctave);
    updateGenFrequency();
  }
});

genFreqSlider.addEventListener('input', () => {
  genFreq = parseFloat(genFreqSlider.value);
  genFreqDisplay.textContent = `${genFreq.toFixed(1)} Hz`;
  btnPlayTone.innerHTML = `<span>🔊</span> Play Custom (${genFreq.toFixed(1)} Hz)`;
  if (toneGen.isDronePlaying()) {
    toneGen.updateDroneFrequency(genFreq);
  }
});

timbreButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    timbreButtons.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    genTimbre = btn.getAttribute('data-timbre') as TimbreType;
    toneGen.setTimbre(genTimbre);
  });
});

btnPlayTone.addEventListener('click', () => {
  toneGen.playNote(genFreq, 1.5, genTimbre);
});

btnDroneToggle.addEventListener('click', () => {
  if (toneGen.isDronePlaying()) {
    toneGen.stopDrone();
    btnDroneToggle.classList.remove('active');
    btnDroneToggle.innerHTML = '<span>〰️</span> Start Continuous Drone';
  } else {
    toneGen.startDrone(genFreq, genTimbre);
    btnDroneToggle.classList.add('active');
    btnDroneToggle.innerHTML = '<span>⏹️</span> Stop Continuous Drone';
  }
});

// Link piano key select to tone generator
piano.setOnNoteSelect((freq, name, octave) => {
  genFreq = freq;
  genOctave = octave;
  const noteIdx = NOTE_NAMES_SHARP.indexOf(name as any);
  if (noteIdx !== -1) genNoteIndex = noteIdx;

  genOctDisplay.textContent = String(genOctave);
  genFreqDisplay.textContent = `${genFreq.toFixed(1)} Hz`;
  genFreqSlider.value = String(genFreq);

  toneNoteButtons.forEach((b) => {
    b.classList.toggle('active', Number(b.getAttribute('data-idx')) === genNoteIndex);
  });

  btnPlayTone.innerHTML = `<span>🔊</span> Play Note (${name}${octave} &bull; ${genFreq.toFixed(1)} Hz)`;
});

// --------------------------------------------------------------------------
// Keyboard Shortcuts
// --------------------------------------------------------------------------
window.addEventListener('keydown', (e) => {
  // Ignore when typing in inputs/selects
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;

  // If on Piano tab, let piano handle musical note keys and octave changes!
  if (currentTab === 'piano') {
    const handled = piano.handleKeyDown(e);
    if (handled) return;
  }

  if (e.code === 'Space') {
    e.preventDefault();
    toggleMicrophone();
  } else if (e.key === '1') {
    switchTab('tuner');
  } else if (e.key === '2') {
    switchTab('generator');
  } else if (e.key === '3') {
    switchTab('piano');
  } else if (e.key === '4') {
    switchTab('trainer');
  } else if (e.key === '5') {
    switchTab('sheet');
  } else if (e.key.toLowerCase() === 'd' && currentTab !== 'piano') {
    btnDroneToggle.click();
  } else if (e.key.toLowerCase() === 'm' && currentTab !== 'piano') {
    btnMute.click();
  }
});

window.addEventListener('keyup', (e) => {
  if (currentTab === 'piano') {
    piano.handleKeyUp(e);
  }
});
