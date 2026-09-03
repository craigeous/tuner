/**
 * Pitch Match and Ear Training Mode.
 * Helps vocalists and instrumentalists train intonation by hearing a reference note
 * and matching it with their voice or instrument.
 */

import { freqFromNote, NOTE_NAMES_SHARP } from '../audio/pitch.ts';
import type { ToneGenerator } from '../audio/toneGenerator.ts';
import { MiniTuner } from './miniTuner.ts';
import type { PitchFrame } from '../audio/audioInput.ts';

export class EarTrainer {
  private container: HTMLElement;
  private toneGen: ToneGenerator;
  private a4: number = 440;

  // Target note state
  private targetNoteIndex = 9; // A
  private targetOctave = 4;    // 4 (A4 = 440Hz)
  private targetFreq = 440;

  // Streak & Match score
  private matchHoldStartTime: number | null = null;
  private streak = 0;
  private isMatched = false;

  // DOM elements
  private targetNoteDisplay!: HTMLElement;
  private targetFreqDisplay!: HTMLElement;
  private statusText!: HTMLElement;
  private matchRingProgress!: SVGCircleElement;
  private streakBadge!: HTMLElement;
  private miniTuner!: MiniTuner;

  constructor(container: HTMLElement, toneGen: ToneGenerator, a4: number = 440) {
    this.container = container;
    this.toneGen = toneGen;
    this.a4 = a4;
    this.updateTargetFreq();
    this.render();
  }

  public setA4(a4: number): void {
    this.a4 = a4;
    this.updateTargetFreq();
    this.updateUI();
  }

  private updateTargetFreq(): void {
    this.targetFreq = freqFromNote(this.targetNoteIndex, this.targetOctave, this.a4);
  }

  public setTarget(noteIndex: number, octave: number): void {
    this.targetNoteIndex = noteIndex;
    this.targetOctave = octave;
    this.updateTargetFreq();
    this.resetMatch();
    this.updateUI();
  }

  public randomTarget(): void {
    // Pick note between C3 and A4 (comfortable vocal & instrument range)
    const totalNotes = 22; // C3 to A4
    const rand = Math.floor(Math.random() * totalNotes);
    this.targetNoteIndex = rand % 12;
    this.targetOctave = 3 + Math.floor(rand / 12);
    this.updateTargetFreq();
    this.resetMatch();
    this.updateUI();
    this.playTargetTone();
  }

  public playTargetTone(): void {
    this.toneGen.playNote(this.targetFreq, 1.8, 'acoustic');
  }

  public toggleTargetDrone(): void {
    if (this.toneGen.isDronePlaying()) {
      this.toneGen.stopDrone();
    } else {
      this.toneGen.startDrone(this.targetFreq, 'sine');
    }
  }

  public resetMatch(): void {
    this.matchHoldStartTime = null;
    this.isMatched = false;
    if (this.matchRingProgress) {
      this.matchRingProgress.style.strokeDashoffset = '283';
    }
    if (this.statusText) {
      this.statusText.textContent = 'Sing or play into the mic to match...';
      this.statusText.className = 'trainer-status-text';
    }
  }

  public updatePitch(frame: PitchFrame): void {
    const targetLabel = `${NOTE_NAMES_SHARP[this.targetNoteIndex]}${this.targetOctave}`;
    if (this.miniTuner) {
      this.miniTuner.update(frame, this.targetFreq, targetLabel);
    }

    const note = frame?.note;
    if (!note || note.frequency <= 0) {
      this.resetMatch();
      return;
    }

    // Compare note to target note
    const targetMidi = (this.targetOctave + 1) * 12 + this.targetNoteIndex;
    const diffMidi = note.midi - targetMidi;
    const totalCentsDiff = diffMidi * 100;
    const absCents = Math.abs(totalCentsDiff);

    if (absCents <= 7) {
      // In tune match zone!
      const now = performance.now();
      if (!this.matchHoldStartTime) {
        this.matchHoldStartTime = now;
      }

      const holdDuration = now - this.matchHoldStartTime;
      const targetDuration = 700; // 0.7s steady hold to register success
      const progress = Math.min(1, holdDuration / targetDuration);

      // Update ring animation (circumference = 2 * PI * 45 ≈ 283)
      const offset = 283 * (1 - progress);
      this.matchRingProgress.style.strokeDashoffset = `${offset}`;

      if (progress >= 1 && !this.isMatched) {
        this.isMatched = true;
        this.streak++;
        this.statusText.textContent = `🎯 Excellent! Pitch Matched (${note.cents > 0 ? '+' : ''}${note.cents}¢)`;
        this.statusText.className = 'trainer-status-text matched';
        this.streakBadge.textContent = `Streak: ${this.streak} 🔥`;

        // Play gentle audio confirmation chime
        this.toneGen.playNote(this.targetFreq * 2, 0.4, 'sine');

        // Automatically roll a new target note after 1.4 seconds
        setTimeout(() => {
          if (this.isMatched) {
            this.randomTarget();
          }
        }, 1400);
      } else if (!this.isMatched) {
        this.statusText.textContent = `Holding steady... ${(progress * 100).toFixed(0)}%`;
        this.statusText.className = 'trainer-status-text holding';
      }
    } else {
      // Out of zone
      this.matchHoldStartTime = null;
      this.matchRingProgress.style.strokeDashoffset = '283';

      if (Math.abs(diffMidi) > 2) {
        this.statusText.textContent = `Heard: ${note.noteName}${note.octave} (${note.frequency} Hz)`;
      } else if (totalCentsDiff > 0) {
        this.statusText.textContent = `Too Sharp (+${Math.round(absCents)}¢) — lower your pitch`;
      } else {
        this.statusText.textContent = `Too Flat (-${Math.round(absCents)}¢) — raise your pitch`;
      }
      this.statusText.className = 'trainer-status-text';
    }
  }

  private updateUI(): void {
    const noteName = NOTE_NAMES_SHARP[this.targetNoteIndex];
    if (this.targetNoteDisplay) {
      this.targetNoteDisplay.textContent = `${noteName}${this.targetOctave}`;
    }
    if (this.targetFreqDisplay) {
      this.targetFreqDisplay.textContent = `${this.targetFreq.toFixed(1)} Hz`;
    }
  }

  public render(): void {
    this.container.innerHTML = `
      <div class="trainer-card">
        <div class="trainer-header">
          <div class="trainer-title-wrap">
            <h3>Pitch Match Trainer</h3>
            <p class="trainer-subtitle">Listen to the target note, then sing or play into your mic to match it.</p>
          </div>
          <span class="trainer-streak-badge" id="trainer-streak">Streak: ${this.streak} 🔥</span>
        </div>

        <div class="trainer-target-area">
          <div class="trainer-ring-container">
            <svg class="trainer-match-ring" viewBox="0 0 100 100" width="120" height="120">
              <circle cx="50" cy="50" r="45" class="ring-bg"></circle>
              <circle cx="50" cy="50" r="45" class="ring-progress" id="trainer-ring-prog"></circle>
            </svg>
            <div class="trainer-note-center">
              <span class="trainer-note-name" id="trainer-note-name">${NOTE_NAMES_SHARP[this.targetNoteIndex]}${this.targetOctave}</span>
              <span class="trainer-note-freq" id="trainer-note-freq">${this.targetFreq.toFixed(1)} Hz</span>
            </div>
          </div>

          <div class="trainer-actions">
            <button type="button" class="btn-trainer btn-play-target" id="btn-play-target">
              <span class="btn-icon">🔊</span> Play Reference Tone
            </button>
            <button type="button" class="btn-trainer btn-drone-target" id="btn-drone-target">
              <span class="btn-icon">〰️</span> Toggle Continuous Drone
            </button>
            <button type="button" class="btn-trainer btn-new-target" id="btn-new-target">
              <span class="btn-icon">🎲</span> New Random Note
            </button>
          </div>
        </div>

        <div class="trainer-feedback">
          <div class="trainer-status-text" id="trainer-status">Sing or play into the mic to match...</div>
        </div>

        <div id="trainer-mini-tuner" style="margin-top: 0.75rem;"></div>
      </div>
    `;

    this.targetNoteDisplay = this.container.querySelector('#trainer-note-name')!;
    this.targetFreqDisplay = this.container.querySelector('#trainer-note-freq')!;
    this.statusText = this.container.querySelector('#trainer-status')!;
    this.matchRingProgress = this.container.querySelector('#trainer-ring-prog')!;
    this.streakBadge = this.container.querySelector('#trainer-streak')!;

    const miniTunerContainer = this.container.querySelector<HTMLElement>('#trainer-mini-tuner')!;
    this.miniTuner = new MiniTuner(miniTunerContainer, {
      label: 'Live Pitch Monitor (Trainer)',
      showReferenceComparison: false,
      compact: true,
    });

    this.container.querySelector('#btn-play-target')?.addEventListener('click', () => this.playTargetTone());
    this.container.querySelector('#btn-drone-target')?.addEventListener('click', () => this.toggleTargetDrone());
    this.container.querySelector('#btn-new-target')?.addEventListener('click', () => this.randomTarget());
  }
}
