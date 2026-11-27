// Sound, synthesized with the Web Audio API: no files, nothing to load. Every effect is a short
// oscillator envelope. A game that has no audio context yet (before the first user gesture)
// queues nothing and makes no sound; the first gesture creates it.

export function createSound() {
  let context = null;
  let muted = false;
  /** One master gain for every note, so the volume is set in a single place. */
  let volume = 1;

  function ensure() {
    if (context === null) {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        context = new AudioContext();
      } catch {
        context = null;
      }
    }
    if (context !== null && context.state === 'suspended') context.resume();
    return context;
  }

  /** One note: an oscillator that slides from `from` to `to` Hz over `seconds`, then stops. */
  function note(from, to, seconds, type, gain, when) {
    const ctx = ensure();
    if (ctx === null || muted) return;
    const start = ctx.currentTime + (when || 0);
    const oscillator = ctx.createOscillator();
    const envelope = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(from, start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, to), start + seconds);
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(gain * volume, start + 0.01);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
    oscillator.connect(envelope);
    envelope.connect(ctx.destination);
    oscillator.start(start);
    oscillator.stop(start + seconds + 0.02);
  }

  return {
    /** Call on the first user gesture so later sounds have a context to play in. */
    unlock() {
      ensure();
    },
    /** A volume from 0 (silent) to 1 (full), applied to every note. */
    setVolume(value) {
      volume = Math.max(0, Math.min(1, value));
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    isMuted() {
      return muted;
    },
    jump() {
      note(300, 700, 0.14, 'sine', 0.12);
    },
    corn() {
      note(880, 880, 0.08, 'sine', 0.1);
      note(1320, 1320, 0.12, 'sine', 0.08, 0.06);
    },
    feather() {
      note(660, 660, 0.07, 'triangle', 0.1);
      note(880, 880, 0.07, 'triangle', 0.1, 0.06);
      note(1320, 1320, 0.12, 'triangle', 0.1, 0.12);
    },
    hit() {
      note(160, 60, 0.25, 'sawtooth', 0.16);
    },
    mud() {
      note(220, 110, 0.18, 'sine', 0.08);
    },
    stage() {
      note(523, 523, 0.1, 'triangle', 0.1);
      note(659, 659, 0.1, 'triangle', 0.1, 0.09);
      note(784, 784, 0.16, 'triangle', 0.1, 0.18);
    },
    gobble() {
      // A turkey's gobble: three quick low warbles.
      note(180, 120, 0.09, 'square', 0.05);
      note(180, 120, 0.09, 'square', 0.05, 0.11);
      note(220, 90, 0.16, 'square', 0.06, 0.22);
    },
    caught() {
      note(392, 392, 0.18, 'triangle', 0.12);
      note(330, 330, 0.18, 'triangle', 0.12, 0.16);
      note(262, 196, 0.4, 'triangle', 0.12, 0.32);
    },
    escaped() {
      note(523, 523, 0.12, 'triangle', 0.12);
      note(659, 659, 0.12, 'triangle', 0.12, 0.11);
      note(784, 784, 0.12, 'triangle', 0.12, 0.22);
      note(1047, 1047, 0.3, 'triangle', 0.12, 0.33);
    },
  };
}
