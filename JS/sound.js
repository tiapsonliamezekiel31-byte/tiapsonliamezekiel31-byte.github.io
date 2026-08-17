/* Simple SoundManager using WebAudio for synthesized game sounds */
class SoundManager {
  static _bufferCache = new Map();
  static weaponSoundMap = {
    'Rusty Sword': 'assets/sounds/rustysword.mp3',
    'Great Hammer': 'assets/sounds/greathammer.mp3',
    'Dagger': 'assets/sounds/dagger.mp3',
    'Bomb': 'assets/sounds/bomb.mp3',
    'Buckler': 'assets/sounds/buckler.mp3',
    'Grimoire': 'assets/sounds/grimoire.mp3',
    'Vampire Dagger': 'assets/sounds/vampiredagger.mp3',
    'Bazooka': 'assets/sounds/bazooka.mp3',
    'Uzi': 'assets/sounds/uzi.mp3',
    'Thunder Hammer': 'assets/sounds/thunderhammer.mp3',
    'Lazer': 'assets/sounds/lazer.mp3',
    'Vine Spell': 'assets/sounds/vinespell.mp3',
    'Death Spell': 'assets/sounds/deathspell.mp3',
    'Echo Bow': 'assets/sounds/echobow.mp3',
    'Aegis': 'assets/sounds/aegishsield.mp3'
  };

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
        case 'attack': this.playWeaponAttack(opts.weaponName, opts); break;
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
        case 'lootbox_drop': this._playSequence([300, 450, 600], [0.08, 0.08, 0.12], 'sine', 0.15); break;
        case 'lootbox_open': this._playSequence([500, 650, 800, 950, 1100], [0.06, 0.06, 0.06, 0.08, 0.15], 'triangle', 0.2); break;
        case 'dog_bark': this._playSequence([380, 280, 380], [0.07, 0.03, 0.09], 'sawtooth', 0.12); break;
        case 'cat_meow': this._playSequence([580, 880], [0.08, 0.14], 'triangle', 0.12); break;
        case 'frog_croak': this._playSequence([110, 90, 110], [0.11, 0.04, 0.11], 'square', 0.16); break;
        case 'bunny_squeak': this._playTone(1450, 0.07, 'sine', 0.08); break;
        case 'fox_bark': this._playSequence([780, 680], [0.05, 0.08], 'triangle', 0.1); break;
        case 'raccoon_chirp': this._playSequence([980, 1180, 980, 1180], [0.03, 0.03, 0.03, 0.03], 'sine', 0.09); break;
        case 'pig_grunt': this._playSequence([95, 75], [0.14, 0.14], 'square', 0.18); break;
        case 'owl_hoot': this._playSequence([340, 340, 440, 440], [0.09, 0.09, 0.09, 0.14], 'sine', 0.13); break;
        case 'cow_moo': this._playSequence([170, 140, 110], [0.18, 0.28, 0.38], 'sine', 0.15); break;
        case 'lion_roar': this._playSequence([100, 80, 60, 40], [0.18, 0.18, 0.28, 0.38], 'sawtooth', 0.22); break;
        case 'tick': this._playTone(1800, 0.03, 'sine', 0.15); break;
        case 'heartbeat': this._playSequence([480, 220], [0.015, 0.03], 'triangle', 0.16); break;
        default: this._playTone(600, 0.05, 'sine', 0.08); break;
      }
    } catch (e) { console.warn('Sound play failed', e); }
  }

  static playWeaponAttack(weaponName, opts = {}) {
    const path = this.weaponSoundMap[weaponName] || 'assets/sounds/attack.mp3';
    const repeats = Math.max(1, Math.floor(Number(opts.repeats || 1)));
    const gapMs = Math.max(0, Math.floor(Number(opts.gapMs || 42)));

    for (let i = 0; i < repeats; i++) {
      if (i === 0) {
        this._playFile(path, opts);
      } else {
        setTimeout(() => this._playFile(path, opts), i * gapMs);
      }
    }
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

  static async _loadBuffer(path) {
    if (this._bufferCache.has(path)) return this._bufferCache.get(path);
    try {
      const resp = await fetch(path);
      const arrayBuf = await resp.arrayBuffer();
      const audioBuf = await this.audioCtx.decodeAudioData(arrayBuf);
      this._bufferCache.set(path, audioBuf);
      return audioBuf;
    } catch(e) { return null; }
  }

  static _playFile(path, opts = {}) {
    try {
      const cached = this._bufferCache.get(path);
      if (cached && this.audioCtx) {
        const src = this.audioCtx.createBufferSource();
        src.buffer = cached;
        const g = this.audioCtx.createGain();
        g.gain.value = typeof opts.volume === 'number' ? opts.volume * this.volume : this.volume;
        src.connect(g);
        g.connect(this.master);
        if (opts.loop) src.loop = true;
        src.start();
        return;
      }
      this._loadBuffer(path);
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
