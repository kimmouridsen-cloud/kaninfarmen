/**
 * Lyd er pynt — spillet må aldrig fejle på den konto.
 * Tiny WebAudio synth used until real sound files are added. Every call is
 * guarded so a missing AudioContext never breaks gameplay.
 */
type Kind = 'hop' | 'munch' | 'bump' | 'hurt' | 'dizzy' | 'shout' | 'clover' | 'boost' | 'caught' | 'gameover' | 'start' | 'combo';

class Synth {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private lastHop = 0;
  muted = false;

  unlock(): void {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.35;
        const comp = this.ctx.createDynamicsCompressor();
        this.master.connect(comp);
        comp.connect(this.ctx.destination);
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
    } catch {
      this.ctx = null;
    }
  }

  private tone(freq: number, dur: number, type: OscillatorType = 'square', vol = 0.5, slide = 0, delay = 0): void {
    if (!this.ctx || !this.master || this.muted) return;
    try {
      const t0 = this.ctx.currentTime + delay;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t0);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
      g.gain.setValueAtTime(vol, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      o.connect(g);
      g.connect(this.master);
      o.start(t0);
      o.stop(t0 + dur + 0.02);
    } catch {
      /* ignore */
    }
  }

  private noise(dur: number, vol = 0.3, delay = 0): void {
    if (!this.ctx || !this.master || this.muted) return;
    try {
      const t0 = this.ctx.currentTime + delay;
      const buf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * dur), this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const g = this.ctx.createGain();
      g.gain.value = vol;
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 1200;
      src.connect(f);
      f.connect(g);
      g.connect(this.master);
      src.start(t0);
    } catch {
      /* ignore */
    }
  }

  play(kind: Kind): void {
    if (!this.ctx) return;
    const now = performance.now();
    switch (kind) {
      case 'hop':
        if (now - this.lastHop < 90) return;
        this.lastHop = now;
        this.noise(0.05, 0.08);
        break;
      case 'munch':
        this.tone(660, 0.07, 'square', 0.25, 200);
        this.tone(880, 0.09, 'square', 0.2, 300, 0.06);
        break;
      case 'combo':
        this.tone(880, 0.08, 'square', 0.25);
        this.tone(1175, 0.1, 'square', 0.25, 0, 0.07);
        this.tone(1568, 0.14, 'square', 0.25, 0, 0.14);
        break;
      case 'clover':
        this.tone(523, 0.08, 'triangle', 0.35);
        this.tone(784, 0.1, 'triangle', 0.35, 0, 0.08);
        this.tone(1047, 0.16, 'triangle', 0.35, 0, 0.16);
        break;
      case 'boost':
        this.tone(300, 0.25, 'sawtooth', 0.2, 600);
        break;
      case 'bump':
        this.noise(0.12, 0.35);
        this.tone(140, 0.12, 'square', 0.3, -60);
        break;
      case 'hurt':
        this.noise(0.15, 0.4);
        this.tone(220, 0.35, 'sawtooth', 0.4, -150);
        break;
      case 'dizzy':
        for (let i = 0; i < 6; i++) this.tone(500 - i * 40, 0.12, 'sine', 0.25, 60, i * 0.11);
        break;
      case 'shout':
        this.tone(160, 0.25, 'sawtooth', 0.45, 40);
        this.tone(120, 0.3, 'square', 0.3, -30, 0.2);
        break;
      case 'caught':
        this.noise(0.2, 0.4);
        this.tone(200, 0.5, 'sawtooth', 0.4, -170);
        break;
      case 'gameover':
        this.tone(392, 0.25, 'square', 0.3, 0, 0);
        this.tone(330, 0.25, 'square', 0.3, 0, 0.25);
        this.tone(262, 0.6, 'square', 0.3, -60, 0.5);
        break;
      case 'start':
        this.tone(523, 0.1, 'square', 0.3);
        this.tone(659, 0.1, 'square', 0.3, 0, 0.1);
        this.tone(784, 0.2, 'square', 0.3, 0, 0.2);
        break;
    }
  }
}

export const sfx = new Synth();
