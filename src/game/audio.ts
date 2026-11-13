/**
 * Procedural Web Audio synthesizer for Bosta Dour.
 * AudioContext initializes lazily on first user gesture (HTML5 Web export safe).
 */
class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted = false;

  public unlock(): void {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(mute: boolean): void {
    this.muted = mute;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    return this.muted;
  }

  private playTone(
    freqStart: number,
    freqEnd: number,
    duration: number,
    type: OscillatorType,
    gainPeak: number,
    delay = 0
  ): void {
    if (this.muted || !this.ctx) return;
    const now = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), now + duration);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(gainPeak, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  public playHop(high = false): void {
    const jitter = 0.94 + Math.random() * 0.12;
    if (high) {
      this.playTone(230 * jitter, 520 * jitter, 0.14, 'triangle', 0.14);
    } else {
      this.playTone(170 * jitter, 270 * jitter, 0.08, 'sine', 0.07);
    }
  }

  public playLaneSwitch(): void {
    const jitter = 0.95 + Math.random() * 0.1;
    this.playTone(320 * jitter, 420 * jitter, 0.06, 'sine', 0.06);
  }

  public playCoin(): void {
    const jitter = 0.96 + Math.random() * 0.08;
    this.playTone(740 * jitter, 1180 * jitter, 0.09, 'sine', 0.11);
    this.playTone(1180 * jitter, 1480 * jitter, 0.11, 'sine', 0.08, 0.045);
  }

  public playHistoricalCoin(): void {
    const notes = [587.33, 739.99, 880.0, 1174.66];
    notes.forEach((n, idx) => {
      this.playTone(n, n * 1.015, 0.17, 'triangle', 0.13, idx * 0.06);
    });
  }

  public playDouble2X(): void {
    this.playTone(440, 880, 0.12, 'triangle', 0.13, 0);
    this.playTone(659.25, 1318.5, 0.16, 'sine', 0.12, 0.06);
  }

  public playMagnet(): void {
    this.playTone(280, 560, 0.14, 'sine', 0.12, 0);
    this.playTone(420, 840, 0.15, 'triangle', 0.1, 0.05);
  }

  public playPlatinumBadge(): void {
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98];
    notes.forEach((n, idx) => {
      this.playTone(n, n * 1.02, 0.24, 'triangle', 0.15, idx * 0.075);
    });
  }

  public playStumble(): void {
    this.playTone(180, 68, 0.2, 'sawtooth', 0.14);
    this.playTone(120, 55, 0.18, 'triangle', 0.12, 0.03);
  }

  public playCrash(): void {
    this.playTone(190, 42, 0.34, 'sawtooth', 0.22);
    this.playTone(130, 35, 0.36, 'square', 0.12, 0.04);
  }

  public playLandmark(): void {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      this.playTone(n, n * 1.02, 0.16, 'triangle', 0.13, idx * 0.07);
    });
  }

  public playRevive(): void {
    const notes = [392.0, 523.25, 659.25, 783.99];
    notes.forEach((n, idx) => {
      this.playTone(n, n * 1.04, 0.14, 'sine', 0.14, idx * 0.055);
    });
  }

  public playVictory(): void {
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    notes.forEach((n, idx) => {
      this.playTone(n, n * 1.01, 0.22, 'triangle', 0.15, idx * 0.08);
    });
  }
}

export const soundEngine = new SoundEngine();
