/* Simple SoundManager using WebAudio for synthesized game sounds */
class SoundManager {
  static init(enabled = true, volume = 0.6) {
    this.enabled = !!enabled;
    this.volume = typeof volume === 'number' ? volume : 0.6;
    try {
      if (!this.audioCtx) this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (!this.master) {
        this.master = this.audioCtx.createGain();
        this.master.gain.value = this.volume;
        this.master.connect(this.audioCtx.destination);
      }
    } catch (e) {
      console.warn('WebAudio not available', e);
      this.enabled = false;
    }
  }

  static setVolume(v) {
    this.volume = v;
    if (this.master) this.master.gain.value = v;
  }

  static play(key, opts = {}) {
    if (!this.enabled) return;
    if (!this.audioCtx) this.init(this.enabled, this.volume);
    try {
      switch (key) {
        case 'attack': this._playFile('assets/sounds/attack.mp3', opts); break;
        case 'crit': this._playSequence([900, 1200], [0.06, 0.09], 'sawtooth', 0.14); break;
        case 'hit': this._playTone(220, 0.12, 'square', 0.16); break;
        case 'kill': this._playSequence([800, 1000, 1200], [0.06,0.06,0.08], 'sine', 0.16); break;
        case 'heal': this._playSequence([520,660], [0.06,0.12], 'sine', 0.12); break;
        case 'revive': this._playSequence([680,860,1040], [0.06,0.06,0.12], 'triangle', 0.14); break;
        case 'pet': this._playTone(1100, 0.12, 'triangle', 0.12); break;
        case 'miss': this._playTone(1200, 0.04, 'square', 0.06); break;
        case 'coin': this._playSequence([1000,1200], [0.04,0.06], 'triangle', 0.14); break;
        case 'checkin': this._playSequence([400,520,660], [0.06,0.08,0.12], 'sine', 0.12); break;
        case 'death': this._playSequence([200,160,120], [0.12,0.12,0.18], 'sine', 0.18); break;
        default: this._playTone(600, 0.05, 'sine', 0.08); break;
      }
    } catch (e) { console.warn('Sound play failed', e); }
  }

  static _playTone(freq, duration = 0.1, type = 'sine', gain = 0.1) {
    const ctx = this.audioCtx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.value = gain;
    o.connect(g);
    g.connect(this.master);
    const now = ctx.currentTime;
    g.gain.setValueAtTime(gain, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + duration);
    o.start(now);
    o.stop(now + duration + 0.02);
  }

  static _playSequence(freqs = [], durs = [], type = 'sine', gain = 0.12) {
    const ctx = this.audioCtx;
    let t = ctx.currentTime;
    for (let i = 0; i < freqs.length; i++) {
      const f = freqs[i];
      const d = durs[i] || 0.08;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.value = f;
      g.gain.value = gain * (1 - i * 0.08);
      o.connect(g);
      g.connect(this.master);
      g.gain.setValueAtTime(g.gain.value, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + d);
      o.start(t);
      o.stop(t + d + 0.02);
      t += d * 0.9;
    }
  }

  static _playFile(path, opts = {}) {
    try {
      const a = new Audio(path);
      a.volume = typeof opts.volume === 'number' ? opts.volume * this.volume : this.volume;
      if (opts.loop) a.loop = true;
      a.play().catch(e => console.warn('Audio play failed', e));
    } catch (e) {
      console.warn('Play file failed', e);
    }
  }
}

// Initialize with defaults; UIManager will re-init with config values
SoundManager.init(true, 0.6);

window.SoundManager = SoundManager;
