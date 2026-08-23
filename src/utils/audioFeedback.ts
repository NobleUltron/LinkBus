/**
 * Lightweight Web Audio API sound generator for scanner feedback.
 * Does not require external audio files or network requests.
 */

class SoundEffects {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => undefined);
    }
    return this.ctx;
  }

  /**
   * Crisp high-frequency dual-tone beep for successful scans & boarding approval.
   */
  public playSuccessBeep() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      // Primary oscillator (pleasant 1046 Hz - C6)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now); // A5
      osc.frequency.exponentialRampToValueAtTime(1320, now + 0.08); // E6

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.16);

      // Trigger haptic vibration on mobile
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(80);
      }
    } catch {
      // Audio autoplay policy fail-safe
    }
  }

  /**
   * Low double-buzz alert for already-boarded or cancelled tickets.
   */
  public playWarningBuzz() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.setValueAtTime(180, now + 0.1);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.26);

      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }
    } catch {
      // Audio autoplay policy fail-safe
    }
  }
}

export const soundEffects = new SoundEffects();
