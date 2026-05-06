class RestTimer {
  remaining = $state(0);
  defaultSeconds = 180;
  #endAt = 0;
  #intervalId = null;

  #clearInterval() {
    if (this.#intervalId !== null) {
      clearInterval(this.#intervalId);
      this.#intervalId = null;
    }
  }

  #signalDone() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) {
        const ctx = new Ctx();
        const beep = (offsetSec, freq) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.value = freq;
          gain.gain.setValueAtTime(0.0001, ctx.currentTime + offsetSec);
          gain.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + offsetSec + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + offsetSec + 0.35);
          osc.connect(gain).connect(ctx.destination);
          osc.start(ctx.currentTime + offsetSec);
          osc.stop(ctx.currentTime + offsetSec + 0.4);
        };
        beep(0, 880);
        beep(0.45, 880);
        beep(0.9, 1175);
        setTimeout(() => ctx.close(), 1500);
      }
    } catch {}
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([200, 100, 200]);
    }
  }

  #tick = () => {
    const remaining = Math.max(0, Math.round((this.#endAt - Date.now()) / 1000));
    this.remaining = remaining;
    if (remaining === 0) {
      this.#clearInterval();
      this.#signalDone();
    }
  };

  start = (seconds = this.defaultSeconds) => {
    this.#clearInterval();
    this.#endAt = Date.now() + seconds * 1000;
    this.remaining = seconds;
    this.#intervalId = setInterval(this.#tick, 250);
  };

  cancel = () => {
    this.#clearInterval();
    this.remaining = 0;
  };

  adjust = (deltaSeconds) => {
    if (this.remaining === 0) return;
    this.#endAt += deltaSeconds * 1000;
    this.#tick();
  };

  format = (totalSeconds) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };
}

export const restTimer = new RestTimer();
