/**
 * NEMESIS ROGUELIKE â€” ANIMATION SYSTEM
 * Particles, screen shake, floating numbers, popups, juicy effects
 */

const AnimationRuntime = (() => {
  const isMobileViewport = window.matchMedia && window.matchMedia('(max-width: 900px)').matches;
  const touchCapable = typeof navigator !== 'undefined' && (navigator.maxTouchPoints || 0) > 0;
  const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const lowPower = isMobileViewport || touchCapable || reducedMotion;

  return {
    lowPower,
    particleScale: lowPower ? 0.6 : 1,
    maxBurstParticles: lowPower ? 18 : 60,
    flashMinInterval: lowPower ? 60 : 70,
    shakeMinInterval: lowPower ? 80 : 40,
    shakeIntensityScale: lowPower ? 0.7 : 1,
    apCrackleMinInterval: lowPower ? 120 : 80
  };
})();

let animationStylesInjected = false;
function ensureAnimationStyles() {
  if (animationStylesInjected) return;
  animationStylesInjected = true;

  const style = document.createElement('style');
  style.id = 'nemesis-animation-keyframes';
  style.textContent = `
    @keyframes nmFadeOut {
      from { opacity: 1; }
      to { opacity: 0; }
    }

    @keyframes nmPopupScale {
      0% { transform: scale(0); opacity: 0; }
      70% { transform: scale(1.1); }
      100% { transform: scale(1); opacity: 1; }
    }

    @keyframes nmPopupScaleCentered {
      0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
      70% { transform: translate(-50%, -50%) scale(1.1); }
      100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
    }

    @keyframes nmMeterPulse {
      0%, 100% { box-shadow: 0 0 0 0 var(--nm-meter-color, #C00707); }
      50% { box-shadow: 0 0 20px 5px var(--nm-meter-color, #C00707); }
    }

    @keyframes nmMeterShimmer {
      0%, 100% { background-color: transparent; }
      50% { background-color: var(--nm-meter-color, #134E8E); }
    }

    @keyframes nmComboScale {
      0% { transform: scale(0.5); opacity: 0; }
      50% { transform: scale(1.2); }
      100% { transform: scale(1); opacity: 1; }
    }

    @keyframes nmComboShatter {
      0% { transform: scale(1); opacity: 1; }
      100% { transform: scale(0.3); opacity: 0; }
    }

    .nm-popup-scale { animation: nmPopupScale var(--nm-duration, 300ms) ease-out forwards; }
    .nm-popup-scale-centered { animation: nmPopupScaleCentered var(--nm-duration, 300ms) ease-out forwards; }
    .nm-meter-pulse { animation: nmMeterPulse var(--nm-duration, 300ms) ease-out; }
    .nm-meter-shimmer { animation: nmMeterShimmer var(--nm-duration, 400ms) ease-in-out; }
    .nm-combo-scale { animation: nmComboScale 200ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
    .nm-combo-shatter { animation: nmComboShatter 300ms ease-in forwards; }
    .nm-screen-flash { animation: nmFadeOut var(--nm-duration, 200ms) ease-out forwards; }
  `;
  document.head.appendChild(style);
}

function restartAnimationClass(element, className) {
  if (!element) return;
  element.classList.remove(className);
  requestAnimationFrame(() => element.classList.add(className));
}

// Color helpers: resolve CSS color to RGB, convert to HSL, and produce slight hue/darkness variants
function resolveCssColorToRgb(colorStr) {
  if (!colorStr) return null;
  try {
    const s = String(colorStr).trim();
    // direct rgb(a)
    const m = s.match(/rgba?\(([^)]+)\)/);
    if (m) {
      const parts = m[1].split(',').map(p => p.trim());
      const r = parseInt(parts[0], 10) || 0;
      const g = parseInt(parts[1], 10) || 0;
      const b = parseInt(parts[2], 10) || 0;
      const a = parts[3] !== undefined ? parseFloat(parts[3]) : 1;
      return { r, g, b, a };
    }

    // hex
    if (s[0] === '#') {
      let hex = s.slice(1);
      if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
      if (hex.length === 6) {
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        return { r, g, b, a: 1 };
      }
    }

    // fallback: ask the browser to resolve the color
    const el = document.createElement('div');
    el.style.color = s;
    el.style.display = 'none';
    document.body.appendChild(el);
    const resolved = getComputedStyle(el).color;
    document.body.removeChild(el);
    const mm = resolved.match(/rgba?\(([^)]+)\)/);
    if (mm) {
      const parts = mm[1].split(',').map(p => p.trim());
      const r = parseInt(parts[0], 10) || 0;
      const g = parseInt(parts[1], 10) || 0;
      const b = parseInt(parts[2], 10) || 0;
      const a = parts[3] !== undefined ? parseFloat(parts[3]) : 1;
      return { r, g, b, a };
    }
  } catch (e) {}
  return null;
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h = h * 60;
  }
  return { h: h || 0, s: s * 100, l: l * 100 };
}

function hslToCss(h, s, l) {
  return `hsl(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%)`;
}

function variantForStack(baseColor, slotIndex) {
  const rgb = resolveCssColorToRgb(baseColor);
  if (!rgb) return baseColor;
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  // stronger hue shift per slot and progressively darker for clearer separation
  const hueShift = slotIndex * 10; // 10Â° per stacked slot
  const newH = (hsl.h + hueShift) % 360;
  const newL = Math.max(8, hsl.l - slotIndex * 8); // darken ~8% per slot
  return hslToCss(newH, hsl.s, newL);
}

class ParticleSystem {
  constructor(config = {}) {
    this.particles = [];
    this.config = {
      container: config.container || document.body,
      ...config
    };
  }
  // Global pools and active list shared across all ParticleSystem instances
  static _pool = [];
  static _active = [];
  static _tickRunning = false;

  emit(x, y, count = 10, options = {}) {
    const {
      color = (typeof UIManager !== 'undefined') ? UIManager.themeColor('--text-white', '#ffffff') : '#fff',
      velocity = 5,
      lifetime = 1000,
      spread = Math.PI * 2,
      size = 4
    } = options;

    const scaledCount = Math.max(1, Math.min(AnimationRuntime.maxBurstParticles, Math.round(count * AnimationRuntime.particleScale)));

    const now = performance.now();

    for (let i = 0; i < scaledCount; i++) {
      const angle = Math.random() * spread;
      const speed = velocity * (0.8 + Math.random() * 0.4);

      // reuse element from pool when possible
      const particle = ParticleSystem._pool.length ? ParticleSystem._pool.pop() : document.createElement('div');
      particle.style.cssText = `
        position: fixed;
        left: 0;
        top: 0;
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        border-radius: 50%;
        pointer-events: none;
        z-index: 10000;
        transform: translate3d(${x}px, ${y}px, 0);
        will-change: transform, opacity;
      `;
      this.config.container.appendChild(particle);

      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;

      ParticleSystem._active.push({
        el: particle,
        x,
        y,
        vx,
        vy,
        start: now,
        lifetime
      });
    }

    // ensure the global tick is running
    if (!ParticleSystem._tickRunning) {
      ParticleSystem._tickRunning = true;
      requestAnimationFrame(ParticleSystem._tick);
    }
  }

  static _tick() {
    const now = performance.now();
    const list = ParticleSystem._active;
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      const elapsed = now - p.start;
      const progress = elapsed / p.lifetime;
      if (progress >= 1) {
        try { p.el.remove(); } catch (e) {}
        // recycle element
        ParticleSystem._pool.push(p.el);
        list.splice(i, 1);
        continue;
      }

      // simple linear movement scaled to frame time
      const px = p.x + (p.vx * (elapsed / 16));
      const py = p.y + (p.vy * (elapsed / 16));
      p.el.style.transform = `translate3d(${px}px, ${py}px, 0)`;
      p.el.style.opacity = 1 - progress;
    }

    if (list.length > 0) {
      requestAnimationFrame(ParticleSystem._tick);
    } else {
      ParticleSystem._tickRunning = false;
    }
  }
}

class FloatingDamageNumber {
  static show(x, y, value, options = {}) {
    // Defaults: hold for 1000ms, then fade over 200ms (total 1200ms)
    const DEFAULT_HOLD = 1000;
    const DEFAULT_FADE = 200;
    const DEFAULT_DURATION = DEFAULT_HOLD + DEFAULT_FADE;

    const {
      color = (typeof UIManager !== 'undefined') ? UIManager.themeColor('--hp-red', '#C00707') : '#ff4444',
      scale = 1,
      // duration and fadeDelay are optional; when omitted we use sensible defaults
      duration,
      fadeDelay,
      container = document.body,
      isCrit = false,
      isMiss = false,
      stackKey // optional override for grouping coordinate floats
    } = options;

    const effectiveDuration = Number(duration) || DEFAULT_DURATION;
    const effectiveFadeDelay = (typeof fadeDelay === 'number') ? Number(fadeDelay) : DEFAULT_HOLD;
    const sizeMultiplier = 1.5;
    const xOffset = 0;
    const driftX = (Math.random() * 10) - 5;
    const driftY = (Math.random() * 8) - 4;

    const div = document.createElement('div');
    const displayValue = isMiss ? 'MISS' : value;
    const fontSize = isCrit ? 28 : 20;
    const baseRotation = (Math.random() - 0.5) * 8;

    div.style.cssText = `
      position: fixed;
      left: 0;
      top: 0;
      font-family: 'Press Start 2P', monospace;
      color: ${color};
      font-weight: 900;
      letter-spacing: 0.5px;
      -webkit-text-stroke: 0.5px ${color};
      pointer-events: none;
      z-index: 13050;
      transform: translate3d(${x + xOffset}px, ${y}px, 0) translateX(-50%) rotate(${baseRotation}deg);
      text-shadow: 1px 1px 0 rgba(0, 0, 0, 0.8), 0 0 10px rgba(255, 255, 255, 0.16);
      will-change: transform, opacity;
      font-size: ${fontSize * scale * sizeMultiplier}px;
    `;
    div.textContent = displayValue;
    container.appendChild(div);
    // cache width to avoid repeated layout reads
    const rectWidth = (div.getBoundingClientRect() || {}).width || 0;
    const clampXVal = (() => {
      const minX = rectWidth / 2 + 8;
      const maxX = window.innerWidth - rectWidth / 2 - 8;
      return Math.min(Math.max(x + xOffset, minX), Math.max(minX, maxX));
    })();

    // Manage stacking by rounded coordinates unless a stackKey is provided
    const key = stackKey || `coord:${Math.round(x)}_${Math.round(y)}`;
    if (!FloatingDamageNumber._coordActiveByKey) FloatingDamageNumber._coordActiveByKey = {};
    if (!FloatingDamageNumber._coordActiveByKey[key]) FloatingDamageNumber._coordActiveByKey[key] = [];
    FloatingDamageNumber._coordActiveByKey[key].push(div);

    // Register in centralized non-anchored list for a single RAF loop
    if (!FloatingDamageNumber._list) FloatingDamageNumber._list = [];
    const createdAt = performance.now();
    const item = {
      div,
      x: clampXVal,
      y,
      driftX,
      driftY,
      createdAt,
      duration: effectiveDuration,
      fadeDelay: effectiveFadeDelay,
      isCrit,
      baseRotation,
      color
    };
    FloatingDamageNumber._list.push(item);

    if (!FloatingDamageNumber._running) {
      FloatingDamageNumber._running = true;
      requestAnimationFrame(FloatingDamageNumber._tickNonAnchored);
    }
  }

  static showBurst(x, y, totalValue, options = {}) {
    const {
      bursts = 1,
      spreadX = 18,
      spreadY = 6,
      staggerMs = 55,
      values = null,
      ...rest
    } = options;

    const count = Math.max(1, Math.floor(Number(bursts) || 1));
    const numericTotal = Number(totalValue) || 0;
    const burstValues = Array.isArray(values) && values.length
      ? values.map(v => Number(v) || 0)
      : Array.from({ length: count }, (_, index) => {
          const base = Math.floor(numericTotal / count);
          const remainder = Math.abs(numericTotal % count);
          const sign = numericTotal < 0 ? -1 : 1;
          return sign * (base + (index < remainder ? 1 : 0));
        });

    burstValues.forEach((value, index) => {
      setTimeout(() => {
        const offsetX = ((index - (burstValues.length - 1) / 2) * spreadX) + (Math.random() * 6 - 3);
        const offsetY = (Math.random() * spreadY) - (spreadY / 2);
        FloatingDamageNumber.show(x + offsetX, y + offsetY, Math.abs(value), {
          ...rest,
          isCrit: !!rest.isCrit && index === 0,
          scale: rest.scale || 1
        });
      }, index * staggerMs);
    });
  }
}

// ============================================================
// Anchored floating numbers (attached to DOM elements)
// ============================================================

// Pool and active lists
FloatingDamageNumber._anchoredPool = [];
FloatingDamageNumber._anchoredList = []; // all active anchored floats
FloatingDamageNumber._anchoredActiveByKey = {}; // anchorKey -> [floatObj,...]
FloatingDamageNumber._anchoredRunning = false;

FloatingDamageNumber.showAnchored = function(anchorElementOrRect, value, options = {}) {
  // Defaults: hold for 1000ms, then fade over 200ms (total 1200ms)
  const DEFAULT_HOLD = 1000;
  const DEFAULT_FADE = 200;
  const DEFAULT_DURATION = DEFAULT_HOLD + DEFAULT_FADE;

  const opts = Object.assign({
    color: (typeof UIManager !== 'undefined') ? UIManager.themeColor('--hp-red', '#C00707') : '#ff4444',
    scale: 1,
    // duration is total lifetime (hold + fade)
    duration: DEFAULT_DURATION,
    // fadeDelay is the time to hold before starting fade
    fadeDelay: DEFAULT_HOLD,
    gap: 28,
    offsetY: 12,
    container: document.body,
    isCrit: false,
    anchorKey: null
  }, options || {});

  const effectiveDuration = Number(opts.duration) || DEFAULT_DURATION;

  let anchorRectFn = null;
  let anchorKey = opts.anchorKey || null;

  if (anchorElementOrRect instanceof Element) {
    const el = anchorElementOrRect;
    anchorRectFn = () => el.getBoundingClientRect();
    if (!anchorKey) anchorKey = el.dataset && el.dataset.enemyId ? String(el.dataset.enemyId) : null;
  } else if (anchorElementOrRect && typeof anchorElementOrRect.left === 'number') {
    const rect = anchorElementOrRect;
    anchorRectFn = () => rect;
  } else if (typeof anchorElementOrRect === 'function') {
    anchorRectFn = anchorElementOrRect;
  } else if (anchorElementOrRect && typeof anchorElementOrRect.x === 'number') {
    const r = { left: anchorElementOrRect.x, top: anchorElementOrRect.y, width: anchorElementOrRect.w || 0, height: anchorElementOrRect.h || 0 };
    anchorRectFn = () => r;
  } else {
    // fallback to center of viewport
    anchorRectFn = () => ({ left: window.innerWidth/2, top: window.innerHeight/2, width: 0, height: 0 });
  }

  const div = FloatingDamageNumber._anchoredPool.length ? FloatingDamageNumber._anchoredPool.pop() : document.createElement('div');
  div.className = 'floating-damage-number anchored';
  div.textContent = String(value);
  div.style.pointerEvents = 'none';
  div.style.position = 'fixed';
  div.style.zIndex = 10002;
  div.style.whiteSpace = 'nowrap';
  div.style.willChange = 'transform, opacity';
  div.style.fontFamily = "'Press Start 2P', monospace";
  div.style.fontWeight = '900';
  div.style.letterSpacing = '0.5px';
  div.style.webkitTextStroke = `0.5px ${opts.color}`;
  div.style.textShadow = '1px 1px 0 rgba(0,0,0,0.8), 0 0 10px rgba(255,255,255,0.12)';
  div.style.color = opts.color;
  div.style.fontSize = `${(opts.isCrit ? 28 : 20) * opts.scale * 1.5}px`;
  opts.container.appendChild(div);
  const measuredWidth = div.getBoundingClientRect().width || 80;

  const floatObj = {
    div,
    width: measuredWidth,
    anchorRectFn,
    anchorKey: anchorKey ? String(anchorKey) : null,
    driftX: (Math.random() * 10) - 5,
    driftY: (Math.random() * 8) - 4,
    createdAt: performance.now(),
    duration: effectiveDuration,
    fadeDelay: Number(opts.fadeDelay) || DEFAULT_HOLD,
    scale: opts.scale,
    gap: Number(opts.gap) || 28,
    offsetY: Number(opts.offsetY) || 12,
    isCrit: !!opts.isCrit,
    baseRotation: (Math.random() - 0.5) * 8,
    baseColor: opts.color
  };

  FloatingDamageNumber._anchoredList.push(floatObj);

  if (floatObj.anchorKey) {
    if (!FloatingDamageNumber._anchoredActiveByKey[floatObj.anchorKey]) FloatingDamageNumber._anchoredActiveByKey[floatObj.anchorKey] = [];
    FloatingDamageNumber._anchoredActiveByKey[floatObj.anchorKey].push(floatObj);
  }

  if (!FloatingDamageNumber._anchoredRunning) {
    FloatingDamageNumber._anchoredRunning = true;
    requestAnimationFrame(FloatingDamageNumber._anchoredTick);
  }

  return div;
};

FloatingDamageNumber._anchoredTick = function() {
  const now = performance.now();
  const list = FloatingDamageNumber._anchoredList;

  for (let i = list.length - 1; i >= 0; i--) {
    const f = list[i];
    const elapsed = now - f.createdAt;
    const progress = elapsed / f.duration;
    const visibleDuration = Math.max(1, f.duration - f.fadeDelay);
    const fadeRaw = elapsed <= f.fadeDelay ? 0 : Math.min(1, (elapsed - f.fadeDelay) / visibleDuration);
    // Eased fade so anchored floats remain visible until the final moments
    const easedFade = Math.pow(fadeRaw, 2.6);
    const opacity = 1 - easedFade;

    let rect = null;
    try { rect = f.anchorRectFn(); } catch (e) { rect = { left: 0, top: 0, width: 0, height: 0 }; }

    let slotIndex = 0;
    if (f.anchorKey && FloatingDamageNumber._anchoredActiveByKey[f.anchorKey]) {
      slotIndex = FloatingDamageNumber._anchoredActiveByKey[f.anchorKey].indexOf(f);
      if (slotIndex < 0) slotIndex = 0;
    }

    // Apply slight hue shift and darken for stacked floats so they remain visually distinct
    try {
      const base = f.baseColor || f.div.style.color || '#ffffff';
      const v = variantForStack(base, slotIndex);
      f.div.style.color = v;
      f.div.style.webkitTextStroke = `0.5px ${v}`;
    } catch (e) {}

    const baseX = rect.left + (rect.width || 0)/2;
    const baseY = rect.top || 0;

    const clampX = (() => {
      const w = f.width || 80;
      const minX = w / 2 + 8;
      const maxX = window.innerWidth - w / 2 - 8;
      return Math.min(Math.max(baseX, minX), Math.max(minX, maxX));
    })();

    const yPos = baseY - f.offsetY - (slotIndex * f.gap);
    const scaleValue = 1 + Math.max(0, Math.min(1, progress)) * 0.3;
    const wobbleAmplitude = f.isCrit ? 6 : 3;
    const wobble = Math.sin(Math.max(0, Math.min(1, progress)) * Math.PI * 2) * wobbleAmplitude * (1 - Math.max(0, Math.min(1, progress)));
    const driftX = (f.driftX || 0) * Math.min(1, progress);
    const driftY = (f.driftY || 0) * Math.min(1, progress);

    f.div.style.transform = `translate3d(${clampX + driftX}px, ${yPos + driftY}px, 0) translateX(-50%) rotate(${f.baseRotation + wobble}deg) scale(${scaleValue})`;
    f.div.style.opacity = opacity;

    if (progress >= 1) {
      try { f.div.remove(); } catch (e) {}
      list.splice(i, 1);
      if (f.anchorKey && FloatingDamageNumber._anchoredActiveByKey[f.anchorKey]) {
        const arr = FloatingDamageNumber._anchoredActiveByKey[f.anchorKey];
        const idx = arr.indexOf(f);
        if (idx !== -1) arr.splice(idx, 1);
        if (arr.length === 0) delete FloatingDamageNumber._anchoredActiveByKey[f.anchorKey];
      }
      FloatingDamageNumber._anchoredPool.push(f.div);
    }
  }

  if (FloatingDamageNumber._anchoredList.length > 0) {
    requestAnimationFrame(FloatingDamageNumber._anchoredTick);
  } else {
    FloatingDamageNumber._anchoredRunning = false;
  }
};

// Non-anchored floats centralized tick
FloatingDamageNumber._tickNonAnchored = function() {
  const now = performance.now();
  const list = FloatingDamageNumber._list || [];
  for (let i = list.length - 1; i >= 0; i--) {
    const f = list[i];
    const elapsed = now - f.createdAt;
    const progress = elapsed / f.duration;
    const visibleDuration = Math.max(1, f.duration - f.fadeDelay);
    const fadeRaw = elapsed <= f.fadeDelay ? 0 : Math.min(1, (elapsed - f.fadeDelay) / visibleDuration);
    const easedFade = Math.pow(fadeRaw, 2.6);
    const opacity = 1 - easedFade;

    // stacked slot index based on coord map
    let slotIndex = 0;
    try {
      const key = Object.keys(FloatingDamageNumber._coordActiveByKey || {}).find(k => (FloatingDamageNumber._coordActiveByKey[k] || []).indexOf(f.div) !== -1);
      if (key) slotIndex = (FloatingDamageNumber._coordActiveByKey[key] || []).indexOf(f.div) || 0;
    } catch (e) {}

    try {
      const v = variantForStack(f.color || f.div.style.color || '#ffffff', slotIndex);
      f.div.style.color = v;
      f.div.style.webkitTextStroke = `0.5px ${v}`;
    } catch (e) {}

    const yOffset = progress * -50;
    const scaleValue = 1 + Math.max(0, Math.min(1, progress)) * 0.3;
    const wobbleAmplitude = f.isCrit ? 6 : 3;
    const wobble = Math.sin(progress * Math.PI * 2) * wobbleAmplitude * (1 - progress);
    const driftX = (f.driftX || 0) * Math.min(1, progress);
    const driftY = (f.driftY || 0) * Math.min(1, progress);

    f.div.style.transform = `translate3d(${f.x + driftX}px, ${f.y + yOffset + driftY}px, 0) translateX(-50%) rotate(${f.baseRotation + wobble}deg) scale(${scaleValue})`;
    f.div.style.opacity = opacity;

    if (progress >= 1) {
      try { f.div.remove(); } catch (e) {}
      // remove from coord map
      try {
        const key = Object.keys(FloatingDamageNumber._coordActiveByKey || {}).find(k => (FloatingDamageNumber._coordActiveByKey[k] || []).indexOf(f.div) !== -1);
        if (key) {
          const arr = FloatingDamageNumber._coordActiveByKey[key];
          const idx = arr.indexOf(f.div);
          if (idx !== -1) arr.splice(idx, 1);
          if (arr.length === 0) delete FloatingDamageNumber._coordActiveByKey[key];
        }
      } catch (e) {}

      list.splice(i, 1);
    }
  }

  if (list.length > 0) {
    requestAnimationFrame(FloatingDamageNumber._tickNonAnchored);
  } else {
    FloatingDamageNumber._running = false;
  }
};

// Screen effects
class ScreenEffects {
  static lastShakeAt = 0;
  static lastFlashAt = 0;
  static flashOverlay = null;
  static flashRemoveTimer = null;

  static shake(intensity = 10, duration = 200) {
    const now = performance.now();
    if (now - this.lastShakeAt < AnimationRuntime.shakeMinInterval) {
      return;
    }
    this.lastShakeAt = now;

    const element = document.documentElement;
    const scaledIntensity = intensity * AnimationRuntime.shakeIntensityScale;
    const startTime = performance.now();
    
    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = elapsed / duration;
      
      if (progress >= 1) {
        element.style.transform = '';
        return;
      }
      
      const remainingIntensity = scaledIntensity * (1 - progress);
      const x = (Math.random() - 0.5) * remainingIntensity * 2;
      const y = (Math.random() - 0.5) * remainingIntensity * 2;
      
      element.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      requestAnimationFrame(animate);
    };
    
    animate();
  }
  
  static flash(color = 'rgba(255, 255, 255, 0.3)', duration = 200) {
    const now = performance.now();
    if (now - this.lastFlashAt < AnimationRuntime.flashMinInterval) {
      return;
    }
    this.lastFlashAt = now;

    ensureAnimationStyles();

    if (!this.flashOverlay) {
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
         pointer-events: none;
         will-change: opacity, background;
         z-index: 100500; /* ensure above any other UI overlays */
         mix-blend-mode: normal;
         background-blend-mode: normal;
      `;
      this.flashOverlay = overlay;
      // append at end of body so it sits on top
      document.body.appendChild(overlay);
    }

    this.flashOverlay.style.background = color;
    this.flashOverlay.style.setProperty('--nm-duration', `${duration}ms`);
    restartAnimationClass(this.flashOverlay, 'nm-screen-flash');

    if (this.flashRemoveTimer) {
      clearTimeout(this.flashRemoveTimer);
    }
    this.flashRemoveTimer = setTimeout(() => {
      // end the animation and hide overlay â€” reset background so it doesn't stay opaque
      try {
        this.flashOverlay?.classList.remove('nm-screen-flash');
        this.flashOverlay.style.background = 'transparent';
        this.flashOverlay.style.removeProperty('--nm-duration');
      } catch (e) {}
    }, duration + 16);
  }
  
  static fadeToWhite(duration = 500) {
    this.flash('rgba(255, 255, 255, 0.5)', duration);
  }
  
  static fadeToBlack(duration = 500) {
    this.flash('rgba(0, 0, 0, 0.5)', duration);
  }
}

// Popup animations (scale + fade)
class PopupAnimation {
  static scale(element, duration = 300) {
    ensureAnimationStyles();
    element.style.setProperty('--nm-duration', `${duration}ms`);
    restartAnimationClass(element, 'nm-popup-scale');
  }

  static scaleCentered(element, duration = 300) {
    ensureAnimationStyles();
    element.style.setProperty('--nm-duration', `${duration}ms`);
    restartAnimationClass(element, 'nm-popup-scale-centered');
  }
}

// Meter/Bar animations (pulse, shimmer, crackle)
class MeterAnimation {
  static pulse(element, color = (typeof UIManager !== 'undefined') ? UIManager.themeColor('--hp-red', '#C00707') : '#ff4444', duration = 300) {
    ensureAnimationStyles();
    element.style.setProperty('--nm-meter-color', color);
    element.style.setProperty('--nm-duration', `${duration}ms`);
    restartAnimationClass(element, 'nm-meter-pulse');
  }
  
  static shimmer(element, color = (typeof UIManager !== 'undefined') ? UIManager.themeColor('--mana-blue', '#134E8E') : '#00ff00', duration = 400) {
    ensureAnimationStyles();
    element.style.setProperty('--nm-meter-color', color);
    element.style.setProperty('--nm-duration', `${duration}ms`);
    restartAnimationClass(element, 'nm-meter-shimmer');
  }
  
  static crackle(element, color = (typeof UIManager !== 'undefined') ? UIManager.themeColor('--ap-gold', '#FFB33F') : '#ffd700', duration = 300, count = 5) {
    const now = performance.now();
    const last = Number(element.dataset.lastCrackleAt || 0);
    if (now - last < AnimationRuntime.apCrackleMinInterval) {
      return;
    }
    element.dataset.lastCrackleAt = String(now);

    const rect = element.getBoundingClientRect();
    const particles = new ParticleSystem({ container: element.parentElement });
    const adjustedCount = Math.max(1, Math.round(count * AnimationRuntime.particleScale));
    
    for (let i = 0; i < adjustedCount; i++) {
      const x = rect.left + Math.random() * rect.width;
      const y = rect.top + Math.random() * rect.height;
      
      particles.emit(x, y, 3, {
        color: color,
        lifetime: duration,
        velocity: 3,
        size: 2
      });
    }
  }
}

// Typewriter effect for dialogue
class TypewriterEffect {
  static type(element, text, speed = 50) {
    element.textContent = '';
    let index = 0;
    
    const type = () => {
      if (index < text.length) {
        element.textContent += text[index];
        index++;
        setTimeout(type, speed);
      }
    };
    
    type();
  }
}

// Combo indicator animation (scale + shatter on miss)
class ComboAnimation {
  static show(element, combo) {
    ensureAnimationStyles();
    element.textContent = `COMBO Ã—${combo}`;
    restartAnimationClass(element, 'nm-combo-scale');
  }
  
  static shatter(element) {
    ensureAnimationStyles();
    const rect = element.getBoundingClientRect();
    const particles = new ParticleSystem();
    
    particles.emit(rect.left + rect.width / 2, rect.top + rect.height / 2, 20, {
      color: (typeof UIManager !== 'undefined') ? UIManager.themeColor('--danger-red', '#C00707') : '#ff6b6b',
      lifetime: 600,
      velocity: 8,
      spread: Math.PI * 2,
      size: 3
    });
    
    restartAnimationClass(element, 'nm-combo-shatter');
  }
}

// Enemy death animation (rainbow burst)
class EnemyDeathAnimation {
  static burst(x, y, isElite = false) {
    const particles = new ParticleSystem();
    const count = Math.max(6, Math.round((isElite ? 40 : 20) * AnimationRuntime.particleScale));
    const colors = (typeof UIManager !== 'undefined') ? [
      UIManager.themeColor('--accent-red', '#C00707'),
      UIManager.themeColor('--palette-orange', '#FF4400'),
      UIManager.themeColor('--ap-gold', '#FFB33F'),
      UIManager.themeColor('--mana-blue', '#134E8E'),
      UIManager.themeColor('--text-white', '#ffffff'),
      UIManager.themeColor('--accent-purple', '#A15CFF')
    ] : ['#ff0000', '#ff7700', '#ffff00', '#00ff00', '#0088ff', '#ff00ff'];

    for (let i = 0; i < count; i++) {
      const color = colors[i % colors.length];
      particles.emit(x, y, 1, {
        color: color,
        lifetime: isElite ? 1000 : 600,
        velocity: isElite ? 10 : 6,
        spread: Math.PI * 2,
        size: isElite ? 4 : 2
      });
    }
    
    if (isElite) {
      ScreenEffects.shake(15, 300);
    }
  }
}

// Consumable drop animation
class ConsumableDropAnimation {
  static drop(fromX, fromY, toX, toY, consumableIcon, duration = 800) {
    const icon = document.createElement('div');
    icon.textContent = consumableIcon;
    icon.style.cssText = `
      position: fixed;
      left: 0;
      top: 0;
      font-size: 24px;
      pointer-events: none;
      z-index: 9999;
      transform: translate3d(${fromX}px, ${fromY}px, 0);
      will-change: transform, opacity;
    `;
    document.body.appendChild(icon);
    
    const startTime = performance.now();
    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(1, elapsed / duration);
      
      if (progress >= 1) {
        icon.remove();
        return;
      }
      
      // Ease-in, arc path
      const x = fromX + (toX - fromX) * progress;
      const arcHeight = -30 * Math.sin(progress * Math.PI);
      const y = fromY + (toY - fromY) * progress + arcHeight;
      
      icon.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      icon.style.opacity = 1 - (progress > 0.8 ? (progress - 0.8) / 0.2 : 0);
      
      requestAnimationFrame(animate);
    };
    
    animate();
  }
}

// Damage modification animation (HP bar changes)
class HpBarAnimation {
  static animateChange(element, oldValue, newValue, maxValue, duration = 300) {
    const oldPercent = (oldValue / maxValue) * 100;
    const newPercent = (newValue / maxValue) * 100;
    
    element.style.width = oldPercent + '%';
    element.style.transition = `width ${duration}ms ease-out`;
    requestAnimationFrame(() => {
      element.style.width = newPercent + '%';
    });
  }
}

class RetroHitAnimation {
  static play(x, y, color = '#ff0044') {
    const container = document.body;
    const burstCount = 10;
    
    for(let i = 0; i < burstCount; i++) {
      const square = document.createElement('div');
      const size = 16 + Math.random() * 32;
      
      square.style.cssText = `
        position: fixed;
        left: 0;
        top: 0;
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        pointer-events: none;
        z-index: 13000;
        will-change: transform, opacity;
      `;
      container.appendChild(square);
      
      const angle = (i / burstCount) * Math.PI * 2 + (Math.random() * 0.5);
      const distance = 60 + Math.random() * 80;
      
      const targetX = Math.cos(angle) * distance;
      const targetY = Math.sin(angle) * distance;
      
      const startTime = performance.now();
      const duration = 450 + Math.random() * 250;
      
      const animate = () => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(1, elapsed / duration);
        // easeOutCubic
        const easeOut = 1 - Math.pow(1 - progress, 3);
        
        const curX = x + targetX * easeOut;
        const curY = y + targetY * easeOut;
        
        // Shrink slower at first, then faster
        const scale = 1 - Math.pow(progress, 2);
        
        square.style.transform = `translate3d(${curX - size/2}px, ${curY - size/2}px, 0) scale(${scale})`;
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          square.remove();
        }
      };
      
      requestAnimationFrame(animate);
    }
    
    // Quick flash square
    const flash = document.createElement('div');
    flash.style.cssText = `
      position: fixed;
      left: 0;
      top: 0;
      width: 80px;
      height: 80px;
      background: #ffffff;
      pointer-events: none;
      z-index: 13001;
      will-change: transform, opacity;
    `;
    container.appendChild(flash);
    
    const flashStart = performance.now();
    const flashDuration = 200;
    
    const animateFlash = () => {
      const elapsed = performance.now() - flashStart;
      const progress = Math.min(1, elapsed / flashDuration);
      flash.style.transform = `translate3d(${x - 40}px, ${y - 40}px, 0) scale(${1 + progress * 0.8}) rotate(${progress * 90}deg)`;
      flash.style.opacity = 1 - Math.pow(progress, 1.5);
      if (progress < 1) requestAnimationFrame(animateFlash);
      else flash.remove();
    };
    requestAnimationFrame(animateFlash);
  }
}

class RetroDodgeAnimation {
  static play(cardElement, color = '#00e5ff') {
    if (!cardElement) return;

    const container = document.body;
    const rect = cardElement.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const lowPower = typeof AnimationRuntime !== 'undefined' && AnimationRuntime.lowPower;
    const scaleFactor = typeof AnimationRuntime !== 'undefined' ? AnimationRuntime.particleScale : 1;
    const burstCount = lowPower ? 6 : 12;

    // Coordinate overlapping animations on the card
    const origTransform = cardElement.dataset.originalTransform !== undefined 
      ? cardElement.dataset.originalTransform 
      : (cardElement.style.transform || 'translate(-50%, -50%)');
      
    if (cardElement.dataset.originalTransform === undefined) {
      cardElement.dataset.originalTransform = origTransform;
    }
    
    cardElement.dataset.activeAnimsCount = Number(cardElement.dataset.activeAnimsCount || 0) + 1;
    
    if (cardElement.animResetTimeout) {
      clearTimeout(cardElement.animResetTimeout);
    }

    const resetCard = () => {
      cardElement.dataset.activeAnimsCount = Math.max(0, Number(cardElement.dataset.activeAnimsCount || 0) - 1);
      if (Number(cardElement.dataset.activeAnimsCount || 0) === 0) {
        cardElement.style.transform = cardElement.dataset.originalTransform;
        cardElement.style.transition = '';
        cardElement.style.opacity = '';
        cardElement.style.willChange = '';
        delete cardElement.dataset.originalTransform;
        delete cardElement.dataset.activeAnimsCount;
      }
    };

    // 1-second safety fallback: force reset after 1s of inactivity
    cardElement.animResetTimeout = setTimeout(() => {
      cardElement.style.transform = cardElement.dataset.originalTransform || origTransform;
      cardElement.style.transition = '';
      cardElement.style.opacity = '';
      cardElement.style.willChange = '';
      delete cardElement.dataset.originalTransform;
      delete cardElement.dataset.activeAnimsCount;
    }, 1000);
    
    // 1. Squares collapse inwards
    for(let i = 0; i < burstCount; i++) {
      const square = document.createElement('div');
      const size = (10 + Math.random() * 20) * scaleFactor;
      
      square.style.cssText = `
        position: fixed;
        left: 0;
        top: 0;
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        pointer-events: none;
        z-index: 13000;
        will-change: transform, opacity;
      `;
      container.appendChild(square);
      
      const angle = (i / burstCount) * Math.PI * 2 + (Math.random() * 0.5);
      const startDistance = 60 + Math.random() * 40;
      
      const startX = Math.cos(angle) * startDistance;
      const startY = Math.sin(angle) * startDistance;
      
      const startTime = performance.now();
      const collapseDuration = 200 + Math.random() * 100;
      
      const animateCollapse = () => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(1, elapsed / collapseDuration);
        
        // easeInCubic to accelerate inwards
        const easeIn = Math.pow(progress, 3);
        
        const curX = cx + startX * (1 - easeIn);
        const curY = cy + startY * (1 - easeIn);
        
        square.style.transform = `translate3d(${curX - size/2}px, ${curY - size/2}px, 0) scale(${1 - progress})`;
        
        if (progress < 1) {
          requestAnimationFrame(animateCollapse);
        } else {
          square.remove();
        }
      };
      
      requestAnimationFrame(animateCollapse);
    }

    // 2. Card slides sideways and disappears briefly
    // Wait for collapse to mostly finish (e.g. 150ms)
    setTimeout(() => {
      const slideDistance = 40; // Slide to the right
      const slideDuration = 150;
      const slideStart = performance.now();
      
      // Temporarily disable CSS transitions on the card itself to prevent layout thrashing
      cardElement.style.transition = 'none';
      cardElement.style.willChange = 'transform, opacity';
      
      const slideAnimate = () => {
        const elapsed = performance.now() - slideStart;
        const progress = Math.min(1, elapsed / slideDuration);
        
        // Move horizontally and fade out
        cardElement.style.transform = `${origTransform} translateX(${slideDistance * progress}px)`;
        cardElement.style.opacity = 1 - progress;
        
        if (progress < 1) {
          requestAnimationFrame(slideAnimate);
        } else {
          // Stay invisible for a split second, then slide back
          setTimeout(() => {
            resetCard();
            
            // Reappear burst (outward)
            const reappearCount = lowPower ? 4 : 8;
            for(let j = 0; j < reappearCount; j++) {
               const sq = document.createElement('div');
               const sqSize = 15 * scaleFactor;
               sq.style.cssText = `
                 position: fixed; left: 0; top: 0;
                 width: ${sqSize}px; height: ${sqSize}px; background: ${color};
                 pointer-events: none; z-index: 13000;
                 will-change: transform, opacity;
               `;
               container.appendChild(sq);
               
               const a = (j / reappearCount) * Math.PI * 2;
               const dist = 30 + Math.random() * 20;
               const tx = Math.cos(a) * dist;
               const ty = Math.sin(a) * dist;
               
               const outStart = performance.now();
               const outDur = 200;
               
               const animateOut = () => {
                 const p2 = Math.min(1, (performance.now() - outStart) / outDur);
                 sq.style.transform = `translate3d(${cx + tx * Math.pow(p2, 0.5) - sqSize/2}px, ${cy + ty * Math.pow(p2, 0.5) - sqSize/2}px, 0) scale(${1 - p2})`;
                 if (p2 < 1) requestAnimationFrame(animateOut);
                 else sq.remove();
               };
               requestAnimationFrame(animateOut);
            }
          }, 100);
        }
      };
      requestAnimationFrame(slideAnimate);
      
    }, 150);
  }
}

class RetroTaskCompleteAnimation {
  static play(element) {
    console.log('RetroTaskCompleteAnimation.play', element);
    const activePanel = element ? (element.closest('.pull-tab') || element.closest('.popup-container') || element.closest('.shop-overlay')) : null;
    const container = activePanel || document.body;

    const lowPower = typeof AnimationRuntime !== 'undefined' && AnimationRuntime.lowPower;
    const scaleFactor = typeof AnimationRuntime !== 'undefined' ? AnimationRuntime.particleScale : 1;
    const burstCount = lowPower ? 10 : 20;
    const colors = ['#FFD700', '#FFA500', '#FFF8DC', '#FFB33F'];

    // Determine center; fallback to screen center if no rect
    let cx = window.innerWidth / 2;
    let cy = window.innerHeight / 2;
    let rect = null;
    if (element) {
      rect = element.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        cx = rect.left + rect.width / 2;
        cy = rect.top + rect.height / 2;
      }
    }

    // Particle burst
    for(let i = 0; i < burstCount; i++) {
      const square = document.createElement('div');
      const size = (10 + Math.random() * 12) * scaleFactor;
      const color = colors[Math.floor(Math.random() * colors.length)];
      
      square.style.cssText = `
        position: fixed;
        left: 0;
        top: 0;
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        pointer-events: none;
        z-index: 999998;
        will-change: transform, opacity;
      `;
      container.appendChild(square);
      
      // Arc motion variables
      const angle = (Math.PI * 2 * i) / burstCount + (Math.random() * 0.5);
      const velocity = 4 + Math.random() * 5;
      let vx = Math.cos(angle) * velocity;
      let vy = Math.sin(angle) * velocity - 3; // initial upward bias
      
      let x = cx;
      let y = cy;
      let life = 1.0;
      const decay = 0.012 + Math.random() * 0.008; // slightly longer life
      const gravity = 0.18;
      
      const animateParticle = () => {
        vy += gravity;
        x += vx;
        y += vy;
        life -= decay;
        
        if (life > 0) {
          square.style.transform = `translate3d(${x - size/2}px, ${y - size/2}px, 0) scale(${life})`;
          requestAnimationFrame(animateParticle);
        } else {
          square.remove();
        }
      };
      requestAnimationFrame(animateParticle);
    }
  }
}

class RetroBossEntranceAnimation {
  static play(bossCard) {
    if (!bossCard) return;

    // 1. Red overlay flash
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed; inset: 0;
      background: rgba(255, 0, 0, 0.4);
      pointer-events: none; z-index: 15000;
      mix-blend-mode: multiply;
      transition: opacity 2s ease-out;
      will-change: opacity;
    `;
    document.body.appendChild(overlay);
    
    // 2. Glitch lines
    const glitchLinesCount = (typeof AnimationRuntime !== 'undefined' && AnimationRuntime.lowPower) ? 3 : 5;
    for (let i = 0; i < glitchLinesCount; i++) {
      const line = document.createElement('div');
      const top = Math.random() * 100;
      const height = 2 + Math.random() * 8;
      line.style.cssText = `
        position: fixed; left: 0; right: 0;
        top: ${top}vh; height: ${height}px;
        background: #fff; opacity: 0.8;
        pointer-events: none; z-index: 15001;
        mix-blend-mode: overlay;
        transform: scaleX(0);
        transform-origin: ${Math.random() > 0.5 ? 'left' : 'right'};
        will-change: transform, opacity;
      `;
      document.body.appendChild(line);
      
      const animateGlitch = () => {
        line.style.transition = 'transform 100ms steps(3), opacity 100ms';
        line.style.transform = 'scaleX(1)';
        setTimeout(() => {
          line.style.opacity = '0';
          setTimeout(() => line.remove(), 100);
        }, 50 + Math.random() * 150);
      };
      setTimeout(animateGlitch, Math.random() * 200);
    }

    // 3. Screen shake (intense)
    if (typeof ScreenEffects !== 'undefined' && ScreenEffects.shake) {
      ScreenEffects.shake(20, 600);
    }

    // 4. Boss card slam
    const origTransform = bossCard.style.transform || 'translate(-50%, -50%)';
    bossCard.style.transition = 'none';
    bossCard.style.transform = `${origTransform} scale(3) translateY(-100px)`;
    bossCard.style.opacity = '0';
    bossCard.style.willChange = 'transform, opacity';
    
    // Force reflow
    void bossCard.offsetWidth;

    bossCard.style.transition = 'transform 300ms cubic-bezier(0.1, 0.9, 0.2, 1), opacity 300ms ease-out';
    bossCard.style.transform = `${origTransform} scale(1) translateY(0)`;
    bossCard.style.opacity = '1';

    // Cleanup overlay and inline styles
    setTimeout(() => {
      overlay.style.opacity = '0';
      setTimeout(() => {
        overlay.remove();
        bossCard.style.transition = '';
        bossCard.style.transform = '';
        bossCard.style.opacity = '';
        bossCard.style.willChange = '';
      }, 2000);
    }, 100);
  }
}

class RetroWarpAnimation {
  static play(cardElement) {
    if (!cardElement) return;

    const rect = cardElement.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const container = document.body;

    const lowPower = typeof AnimationRuntime !== 'undefined' && AnimationRuntime.lowPower;
    const scaleFactor = typeof AnimationRuntime !== 'undefined' ? AnimationRuntime.particleScale : 1;

    // Beam effect
    const beam = document.createElement('div');
    beam.style.cssText = `
      position: fixed;
      left: ${rect.left + rect.width * 0.1}px;
      top: -100px;
      width: ${rect.width * 0.8}px;
      height: ${rect.top + 100}px;
      background: linear-gradient(180deg, rgba(0, 229, 255, 0) 0%, rgba(0, 229, 255, 0.8) 100%);
      pointer-events: none;
      z-index: 12999;
      mix-blend-mode: screen;
      transform-origin: bottom;
      transform: scaleY(0);
      transition: transform 150ms ease-in, opacity 200ms ease-out;
      will-change: transform, opacity;
    `;
    container.appendChild(beam);

    // Initial card state
    const origTransform = cardElement.style.transform || 'translate(-50%, -50%)';
    cardElement.style.transition = 'none';
    cardElement.style.transform = `${origTransform} scaleY(0) scaleX(0.2)`;
    cardElement.style.opacity = '0';
    cardElement.style.filter = 'brightness(2) contrast(1.5)';
    cardElement.style.willChange = 'transform, opacity, filter';
    
    void cardElement.offsetWidth; // Reflow

    // 1. Beam down
    beam.style.transform = 'scaleY(1)';

    setTimeout(() => {
      // 2. Card materializes
      cardElement.style.transition = 'transform 300ms steps(5), opacity 150ms, filter 400ms';
      cardElement.style.transform = `${origTransform} scaleY(1) scaleX(1)`;
      cardElement.style.opacity = '1';
      cardElement.style.filter = 'brightness(1) contrast(1)';

      // Fade beam
      beam.style.opacity = '0';
      setTimeout(() => beam.remove(), 200);

      // Clean up inline styles once done
      setTimeout(() => {
        cardElement.style.transition = '';
        cardElement.style.transform = '';
        cardElement.style.opacity = '';
        cardElement.style.filter = '';
        cardElement.style.willChange = '';
      }, 400);

      // Particle scatter
      const scatterCount = lowPower ? 4 : 8;
      for (let i = 0; i < scatterCount; i++) {
        const sq = document.createElement('div');
        const size = (4 + Math.random() * 4) * scaleFactor;
        sq.style.cssText = `
          position: fixed; left: 0; top: 0;
          width: ${size}px; height: ${size}px;
          background: #00e5ff; pointer-events: none; z-index: 13000;
          will-change: transform, opacity;
        `;
        container.appendChild(sq);

        const a = Math.random() * Math.PI * 2;
        const dist = 20 + Math.random() * 30;
        const tx = Math.cos(a) * dist;
        const ty = Math.sin(a) * dist;

        const outStart = performance.now();
        const outDur = 300;

        const animateOut = () => {
          const p = Math.min(1, (performance.now() - outStart) / outDur);
          sq.style.transform = `translate3d(${cx + tx * p - size/2}px, ${cy + ty * p - size/2}px, 0) scale(${1 - p})`;
          if (p < 1) requestAnimationFrame(animateOut);
          else sq.remove();
        };
        requestAnimationFrame(animateOut);
      }
    }, 150);
  }
}


class RetroLevelUpAnimation {
  static play() {
    const container = document.body;

    const lowPower = typeof AnimationRuntime !== 'undefined' && AnimationRuntime.lowPower;
    const scaleFactor = typeof AnimationRuntime !== 'undefined' ? AnimationRuntime.particleScale : 1;

    // 1. Ascension Pillar (Light from bottom covering full width)
    const pillar = document.createElement('div');
    pillar.style.cssText = `
      position: fixed;
      left: 0;
      bottom: 0;
      width: 100vw;
      height: 100vh;
      background: linear-gradient(0deg, rgba(255, 215, 0, 0.7) 0%, rgba(0, 229, 255, 0.3) 50%, rgba(255, 255, 255, 0) 100%);
      transform: scaleY(0);
      transform-origin: bottom;
      pointer-events: none;
      z-index: 14000;
      mix-blend-mode: screen;
      transition: transform 400ms cubic-bezier(0.1, 0.8, 0.3, 1), opacity 400ms ease-in;
      will-change: transform, opacity;
    `;
    container.appendChild(pillar);

    // Trigger pillar to expand vertically
    setTimeout(() => {
      pillar.style.transform = 'scaleY(1)';
    }, 50);

    // 2. Floating glowing particles moving up across the entire screen width
    const particlesCount = lowPower ? 20 : 45; // more particles since it's full screen now!
    for(let i = 0; i < particlesCount; i++) {
      const p = document.createElement('div');
      const size = (6 + Math.random() * 12) * scaleFactor;
      const isGold = Math.random() > 0.5;
      
      // Span across the entire viewport width
      const startX = Math.random() * window.innerWidth;
      
      p.style.cssText = `
        position: fixed;
        left: ${startX}px;
        bottom: -20px;
        width: ${size}px;
        height: ${size}px;
        background: ${isGold ? '#FFD700' : '#00e5ff'};
        box-shadow: 0 0 10px ${isGold ? '#FFD700' : '#00e5ff'};
        pointer-events: none;
        z-index: 14001;
        will-change: transform, opacity;
      `;
      container.appendChild(p);

      const delay = Math.random() * 500;
      const duration = 800 + Math.random() * 800;
      const drift = -30 + Math.random() * 60; // slightly wider drift

      setTimeout(() => {
        const start = performance.now();
        const animate = () => {
          const progress = Math.min(1, (performance.now() - start) / duration);
          const y = window.innerHeight - (progress * window.innerHeight * 1.25); // Shoot past top
          const currentX = startX + drift * Math.sin(progress * Math.PI * 2);
          
          p.style.transform = `translate3d(${currentX - startX}px, ${y - window.innerHeight}px, 0) scale(${1 - progress * 0.4})`;
          p.style.opacity = 1 - progress;

          if (progress < 1) requestAnimationFrame(animate);
          else p.remove();
        };
        requestAnimationFrame(animate);
      }, delay);
    }

    // Cleanup pillar
    setTimeout(() => {
      pillar.style.opacity = '0';
      setTimeout(() => pillar.remove(), 400);
    }, 900);
  }
}

class RetroHealAnimation {
  static play(x = window.innerWidth / 2, y = window.innerHeight) {
    const container = document.body;

    const lowPower = typeof AnimationRuntime !== 'undefined' && AnimationRuntime.lowPower;
    const scaleFactor = typeof AnimationRuntime !== 'undefined' ? AnimationRuntime.particleScale : 1;
    
    // Bubble particles
    const bubbleCount = lowPower ? 8 : 15;
    for (let i = 0; i < bubbleCount; i++) {
      const bubble = document.createElement('div');
      const size = (6 + Math.random() * 8) * scaleFactor;
      bubble.style.cssText = `
        position: fixed;
        left: ${x - 40 + Math.random() * 80}px;
        top: ${y - 40}px;
        width: ${size}px;
        height: ${size}px;
        background: #00ff66;
        border: 1px solid #fff;
        pointer-events: none;
        z-index: 14002;
        border-radius: 2px; // slightly rounded retro bubble
        will-change: transform, opacity;
      `;
      container.appendChild(bubble);

      const drift = -15 + Math.random() * 30;
      const startX = parseFloat(bubble.style.left);
      const startY = parseFloat(bubble.style.top);
      const duration = 600 + Math.random() * 400;
      const delay = Math.random() * 200;

      setTimeout(() => {
        const start = performance.now();
        const animate = () => {
          const progress = Math.min(1, (performance.now() - start) / duration);
          const currentY = startY - (progress * 150); // float up
          const currentX = startX + drift * Math.sin(progress * Math.PI * 4); // wiggle
          
          bubble.style.transform = `translate3d(${currentX - startX}px, ${currentY - startY}px, 0) scale(${1 - progress * 0.3})`;
          bubble.style.opacity = 1 - progress;

          if (progress < 1) requestAnimationFrame(animate);
          else bubble.remove();
        };
        requestAnimationFrame(animate);
      }, delay);
    }
  }
}

class RetroCritSlashAnimation {
  static play(cardElement) {
    if (!cardElement) return;

    const container = document.body;
    const rect = cardElement.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const lowPower = typeof AnimationRuntime !== 'undefined' && AnimationRuntime.lowPower;
    const scaleFactor = typeof AnimationRuntime !== 'undefined' ? AnimationRuntime.particleScale : 1;

    // 1. Heavy screen effects
    if (typeof ScreenEffects !== 'undefined') {
      ScreenEffects.shake(12, 200);
      ScreenEffects.flash('rgba(255, 0, 68, 0.18)', 150);
    }

    // Coordinate overlapping animations on the card
    const origTransform = cardElement.dataset.originalTransform !== undefined 
      ? cardElement.dataset.originalTransform 
      : (cardElement.style.transform || 'translate(-50%, -50%)');
      
    if (cardElement.dataset.originalTransform === undefined) {
      cardElement.dataset.originalTransform = origTransform;
    }
    
    cardElement.dataset.activeAnimsCount = Number(cardElement.dataset.activeAnimsCount || 0) + 1;
    
    if (cardElement.animResetTimeout) {
      clearTimeout(cardElement.animResetTimeout);
    }

    const resetCard = () => {
      cardElement.dataset.activeAnimsCount = Math.max(0, Number(cardElement.dataset.activeAnimsCount || 0) - 1);
      if (Number(cardElement.dataset.activeAnimsCount || 0) === 0) {
        cardElement.style.transform = cardElement.dataset.originalTransform;
        cardElement.style.transition = '';
        cardElement.style.opacity = '';
        cardElement.style.willChange = '';
        delete cardElement.dataset.originalTransform;
        delete cardElement.dataset.activeAnimsCount;
      }
    };

    // 1-second safety fallback: force reset after 1s of inactivity
    cardElement.animResetTimeout = setTimeout(() => {
      cardElement.style.transform = cardElement.dataset.originalTransform || origTransform;
      cardElement.style.transition = '';
      cardElement.style.opacity = '';
      cardElement.style.willChange = '';
      delete cardElement.dataset.originalTransform;
      delete cardElement.dataset.activeAnimsCount;
    }, 1000);

    // 2. Snap scale card with skew for distortion
    cardElement.style.transition = 'none';
    cardElement.style.willChange = 'transform';
    cardElement.style.transform = `${origTransform} scale(1.18) skew(4deg, 4deg)`;
    
    setTimeout(() => {
      cardElement.style.transform = `${origTransform} scale(0.92) skew(-2deg, -2deg)`;
      setTimeout(() => {
        resetCard();
      }, 100);
    }, 80);

    // 3. Double diagonal X-slash particles
    const slashLength = Math.min(rect.width, rect.height) * 0.95;
    const steps = lowPower ? 6 : 10;
    
    const drawSlash = (angleRad) => {
      for (let i = 0; i < steps; i++) {
        const sq = document.createElement('div');
        const size = (16 + Math.random() * 8) * scaleFactor; // larger bolder particles
        
        const offset = (i - steps / 2) * (slashLength / steps);
        const px = cx + Math.cos(angleRad) * offset;
        const py = cy + Math.sin(angleRad) * offset;

        sq.style.cssText = `
          position: fixed;
          left: ${px - size / 2}px;
          top: ${py - size / 2}px;
          width: ${size}px;
          height: ${size}px;
          background: #ff0044;
          border: 2px solid #ffd700;
          box-shadow: 0 0 12px rgba(255, 0, 68, 0.6);
          pointer-events: none;
          z-index: 13500;
          will-change: transform, opacity;
          border-radius: 2px;
        `;
        container.appendChild(sq);

        // Sequence delays to simulate a cutting motion
        const delay = i * 15;
        setTimeout(() => {
          const start = performance.now();
          const duration = 250;
          const animate = () => {
            const progress = Math.min(1, (performance.now() - start) / duration);
            sq.style.transform = `scale(${1.2 - progress * 1.2}) rotate(${progress * 90}deg)`;
            sq.style.opacity = 1 - progress;
            if (progress < 1) requestAnimationFrame(animate);
            else sq.remove();
          };
          requestAnimationFrame(animate);
        }, delay);
      }
    };

    // Draw both diagonals of the X
    drawSlash(-Math.PI / 4); // Top-left to bottom-right
    setTimeout(() => {
      drawSlash(Math.PI / 4);  // Bottom-left to top-right
    }, 60); // slightly staggered for maximum style
  }
}

class RetroComboFinisherAnimation {
  static play(cardElement) {
    if (!cardElement) return;

    const rect = cardElement.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const container = document.body;

    const lowPower = typeof AnimationRuntime !== 'undefined' && AnimationRuntime.lowPower;
    const scaleFactor = typeof AnimationRuntime !== 'undefined' ? AnimationRuntime.particleScale : 1;

    // 1. Heavy screen effects
    if (typeof ScreenEffects !== 'undefined') {
      ScreenEffects.shake(15, 350);
      ScreenEffects.flash('rgba(255, 204, 0, 0.16)', 200);
    }

    // Coordinate overlapping animations on the card
    const origTransform = cardElement.dataset.originalTransform !== undefined 
      ? cardElement.dataset.originalTransform 
      : (cardElement.style.transform || 'translate(-50%, -50%)');
      
    if (cardElement.dataset.originalTransform === undefined) {
      cardElement.dataset.originalTransform = origTransform;
    }
    
    cardElement.dataset.activeAnimsCount = Number(cardElement.dataset.activeAnimsCount || 0) + 1;
    
    if (cardElement.animResetTimeout) {
      clearTimeout(cardElement.animResetTimeout);
    }

    const resetCard = () => {
      cardElement.dataset.activeAnimsCount = Math.max(0, Number(cardElement.dataset.activeAnimsCount || 0) - 1);
      if (Number(cardElement.dataset.activeAnimsCount || 0) === 0) {
        cardElement.style.transform = cardElement.dataset.originalTransform;
        cardElement.style.transition = '';
        cardElement.style.opacity = '';
        cardElement.style.willChange = '';
        delete cardElement.dataset.originalTransform;
        delete cardElement.dataset.activeAnimsCount;
      }
    };

    // 1-second safety fallback: force reset after 1s of inactivity
    cardElement.animResetTimeout = setTimeout(() => {
      cardElement.style.transform = cardElement.dataset.originalTransform || origTransform;
      cardElement.style.transition = '';
      cardElement.style.opacity = '';
      cardElement.style.willChange = '';
      delete cardElement.dataset.originalTransform;
      delete cardElement.dataset.activeAnimsCount;
    }, 1000);

    // 2. Snappy Card Impact Bounce
    cardElement.style.transition = 'none';
    cardElement.style.willChange = 'transform';
    cardElement.style.transform = `${origTransform} scale(1.22) translateY(20px)`;
    
    setTimeout(() => {
      cardElement.style.transform = `${origTransform} scale(0.9) translateY(-10px)`;
      setTimeout(() => {
        resetCard();
      }, 120);
    }, 80);

    // 3. Double Gold shockwave rings (expanding squares)
    const createRing = (delay, borderSize, maxScale) => {
      setTimeout(() => {
        const ring = document.createElement('div');
        const startSize = Math.min(rect.width, rect.height) * 0.5;
        ring.style.cssText = `
          position: fixed;
          left: ${cx - startSize/2}px;
          top: ${cy - startSize/2}px;
          width: ${startSize}px;
          height: ${startSize}px;
          border: ${borderSize}px solid #ffd700;
          box-shadow: 0 0 20px #ffaa00, inset 0 0 10px #ffd700;
          background: rgba(255, 215, 0, 0.05);
          pointer-events: none;
          z-index: 13400;
          will-change: transform, opacity;
          border-radius: 6px;
        `;
        container.appendChild(ring);

        const start = performance.now();
        const duration = 450;
        const animateRing = () => {
          const progress = Math.min(1, (performance.now() - start) / duration);
          const scale = 1 + progress * (maxScale - 1);
          ring.style.transform = `scale(${scale})`;
          ring.style.opacity = 1 - progress;
          if (progress < 1) requestAnimationFrame(animateRing);
          else ring.remove();
        };
        requestAnimationFrame(animateRing);
      }, delay);
    };

    createRing(0, 6, 3.8);   // Outer Ring
    if (!lowPower) {
      createRing(100, 4, 3.2); // Inner staggered ring
    }

    // 4. Exploding golden square particles
    const particleCount = lowPower ? 12 : 24;
    for (let i = 0; i < particleCount; i++) {
      const sq = document.createElement('div');
      const size = (12 + Math.random() * 10) * scaleFactor;
      sq.style.cssText = `
        position: fixed;
        left: 0; top: 0;
        width: ${size}px; height: ${size}px;
        background: #ffd700;
        border: 2px solid #ff5500;
        box-shadow: 0 0 10px #ffaa00;
        pointer-events: none;
        z-index: 13401;
        will-change: transform, opacity;
        border-radius: 1px;
      `;
      container.appendChild(sq);

      const angle = (i / particleCount) * Math.PI * 2 + (Math.random() * 0.4 - 0.2);
      const velocity = 6 + Math.random() * 8;
      const vx = Math.cos(angle) * velocity;
      const vy = Math.sin(angle) * velocity;

      const pStart = performance.now();
      const pDur = 500 + Math.random() * 200;

      const animateParticle = () => {
        const p = Math.min(1, (performance.now() - pStart) / pDur);
        const curX = cx + vx * p * 18;
        const curY = cy + vy * p * 18;
        sq.style.transform = `translate3d(${curX - size/2}px, ${curY - size/2}px, 0) scale(${1.2 - p * 1.2}) rotate(${p * 360}deg)`;
        sq.style.opacity = 1 - p;

        if (p < 1) requestAnimationFrame(animateParticle);
        else sq.remove();
      };
      requestAnimationFrame(animateParticle);
    }
  }
}

class RetroWeaknessAnimation {
  static play(cardElement, color = '#ff0000') {
    if (!cardElement) return;
    const rect = cardElement.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const container = document.body;

    const circle = document.createElement('div');
    const startSize = Math.max(rect.width, rect.height) * 2.0;
    
    circle.style.cssText = `
      position: fixed;
      left: ${cx - startSize/2}px;
      top: ${cy - startSize/2}px;
      width: ${startSize}px;
      height: ${startSize}px;
      border: 6px solid ${color};
      border-radius: 50%;
      pointer-events: none;
      z-index: 13600;
      will-change: transform, opacity;
      transform: translate3d(0, 0, 0) scale(1) rotate(0deg);
    `;
    container.appendChild(circle);

    const start = performance.now();
    const duration = 500;
    
    const animate = () => {
      const progress = Math.min(1, (performance.now() - start) / duration);
      const currentScale = 1 - progress;
      const currentRotation = progress * 360;
      const opacity = 1 - Math.pow(progress, 3);
      
      circle.style.transform = `scale(${currentScale}) rotate(${currentRotation}deg)`;
      circle.style.opacity = opacity;

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        circle.remove();
      }
    };
    requestAnimationFrame(animate);
  }
}

class RetroResistanceAnimation {
  static play(cardElement, color = '#0000ff') {
    if (!cardElement) return;
    const rect = cardElement.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const container = document.body;

    const square = document.createElement('div');
    const maxSize = Math.max(rect.width, rect.height) * 2.0;
    
    square.style.cssText = `
      position: fixed;
      left: ${cx - maxSize/2}px;
      top: ${cy - maxSize/2}px;
      width: ${maxSize}px;
      height: ${maxSize}px;
      border: 6px solid ${color};
      pointer-events: none;
      z-index: 13600;
      will-change: transform, opacity;
      transform: translate3d(0, 0, 0) scale(0.1) rotate(0deg);
    `;
    container.appendChild(square);

    const start = performance.now();
    const duration = 500;
    
    const animate = () => {
      const progress = Math.min(1, (performance.now() - start) / duration);
      const currentScale = 0.1 + progress * 0.9;
      const currentRotation = progress * 360;
      const opacity = 1 - Math.pow(progress, 3);
      
      square.style.transform = `scale(${currentScale}) rotate(${currentRotation}deg)`;
      square.style.opacity = opacity;

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        square.remove();
      }
    };
    requestAnimationFrame(animate);
  }
}
