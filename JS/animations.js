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
    maxBurstParticles: lowPower ? 10 : 60,
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
      50% { box-shadow: 0 0 0 4px var(--nm-meter-color, #C00707); }
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
const _colorCache = {};
function resolveCssColorToRgb(colorStr) {
  if (!colorStr) return null;
  try {
    const s = String(colorStr).trim();
    if (_colorCache[s]) return _colorCache[s];

    // direct rgb(a)
    const m = s.match(/rgba?\(([^)]+)\)/);
    if (m) {
      const parts = m[1].split(',').map(p => p.trim());
      const r = parseInt(parts[0], 10) || 0;
      const g = parseInt(parts[1], 10) || 0;
      const b = parseInt(parts[2], 10) || 0;
      const a = parts[3] !== undefined ? parseFloat(parts[3]) : 1;
      _colorCache[s] = { r, g, b, a };
      return _colorCache[s];
    }

    // hex
    if (s[0] === '#') {
      let hex = s.slice(1);
      if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
      if (hex.length === 6) {
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        _colorCache[s] = { r, g, b, a: 1 };
        return _colorCache[s];
      }
    }

    // fallback: canvas approach
    if (!resolveCssColorToRgb._canvas) {
      resolveCssColorToRgb._canvas = document.createElement('canvas');
      resolveCssColorToRgb._canvas.width = 1;
      resolveCssColorToRgb._canvas.height = 1;
      resolveCssColorToRgb._ctx = resolveCssColorToRgb._canvas.getContext('2d', { willReadFrequently: true });
    }
    const ctx = resolveCssColorToRgb._ctx;
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = s;
    ctx.fillRect(0, 0, 1, 1);
    const data = ctx.getImageData(0, 0, 1, 1).data;
    _colorCache[s] = { r: data[0], g: data[1], b: data[2], a: data[3] / 255 };
    return _colorCache[s];
  } catch (e) { }
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
    const durationScale = 1.3;
    const speedScale = 0.77;
    const {
      color = (typeof UIManager !== 'undefined') ? UIManager.themeColor('--text-white', '#ffffff') : '#fff',
      velocity = 5,
      lifetime = 1000,
      spread = Math.PI * 2,
      size = 4
    } = options;

    const scaledLifetime = lifetime * durationScale;
    const scaledVelocity = velocity * speedScale;

    const scaledCount = Math.max(1, Math.min(AnimationRuntime.maxBurstParticles, Math.round(count * AnimationRuntime.particleScale)));

    const now = performance.now();

    for (let i = 0; i < scaledCount; i++) {
      const angle = Math.random() * spread;
      const speed = scaledVelocity * (0.8 + Math.random() * 0.4);

      // reuse element from pool when possible
      const particle = ParticleSystem._pool.length ? ParticleSystem._pool.pop() : document.createElement('div');

      const borderRadius = options.shape === 'square' ? '0px' : '50%';
      const glowStyle = options.glow ? `border: 1px solid #bd00ff; box-shadow: 1px 1px 0px rgba(0,0,0,0.5);` : '';

      particle.style.cssText = `
        position: fixed;
        left: 0;
        top: 0;
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        border-radius: ${borderRadius};
        pointer-events: none;
        z-index: 100000;
        transform: translate3d(${x}px, ${y}px, 0);
        will-change: transform, opacity;
        ${glowStyle}
      `;
      this.config.container.appendChild(particle);

      const vx = options.vx !== undefined ? options.vx * speedScale : Math.cos(angle) * speed;
      const vy = options.vy !== undefined ? options.vy * speedScale : Math.sin(angle) * speed;

      ParticleSystem._active.push({
        el: particle,
        x,
        y,
        vx,
        vy,
        start: now,
        lifetime: scaledLifetime,
        gravity: options.gravity || 0,
        accelY: options.accelY || 0,
        rotateSpeed: options.rotateSpeed || 0
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
    if (AnimationRuntime.lowPower && list.length > 80) {
      const excess = list.splice(0, list.length - 80);
      excess.forEach(p => { try { p.el.remove(); } catch(e){} ParticleSystem._pool.push(p.el); });
    }
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      const elapsed = now - p.start;
      if (!p.freezeDuration) {
        p.freezeDuration = 100 + Math.random() * 200;
      }
      if (elapsed < p.freezeDuration) {
        p.el.style.transform = `translate3d(${p.x}px, ${p.y}px, 0) scale(1)`;
        p.el.style.opacity = 1;
        continue;
      }
      const activeElapsed = elapsed - p.freezeDuration;
      const progress = activeElapsed / p.lifetime;
      if (progress >= 1) {
        try { p.el.remove(); } catch (e) { }
        // recycle element
        ParticleSystem._pool.push(p.el);
        list.splice(i, 1);
        continue;
      }

      // Physics model
      const tFrames = activeElapsed / 16;
      let px = p.x + p.vx * tFrames;
      let py = p.y + p.vy * tFrames;

      if (p.gravity) {
        py += 0.5 * p.gravity * tFrames * tFrames;
      }
      if (p.accelY) {
        py += 0.5 * p.accelY * tFrames * tFrames;
      }

      let transformStr = `translate3d(${px}px, ${py}px, 0)`;
      if (p.rotateSpeed) {
        const rotation = p.rotateSpeed * tFrames;
        transformStr += ` rotate(${rotation}deg)`;
      }

      p.el.style.transform = transformStr;
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
  static _pool = [];

  static show(x, y, value, options = {}) {
    // Defaults: hold for 1000ms, then fade over 200ms (total 1200ms)
    const DEFAULT_HOLD = 1000;
    const DEFAULT_FADE = 200;
    const DEFAULT_DURATION = DEFAULT_HOLD + DEFAULT_FADE;

    let targetX = Number(x);
    let targetY = Number(y);
    if (isNaN(targetX) || isNaN(targetY) || (targetX <= 0 && targetY <= 12)) {
      targetX = window.innerWidth / 2;
      targetY = window.innerHeight / 2;
    }

    const {
      color = (typeof UIManager !== 'undefined') ? UIManager.themeColor('--hp-red', '#C00707') : '#ff4444',
      scale = 1,
      // duration and fadeDelay are optional; when omitted we use sensible defaults
      duration,
      fadeDelay,
      container = document.body,
      isCrit = false,
      isMiss = false,
      stackKey, // optional override for grouping coordinate floats
      rotationRange = 8
    } = options;

    const effectiveDuration = Number(duration) || DEFAULT_DURATION;
    const effectiveFadeDelay = (typeof fadeDelay === 'number') ? Number(fadeDelay) : DEFAULT_HOLD;
    const sizeMultiplier = 1.5;
    const xOffset = 0;
    const driftX = (Math.random() * 10) - 5;
    const driftY = (Math.random() * 8) - 4;
    const travelX = (Math.random() - 0.5) * 30;
    const travelY = -50 - (Math.random() * 20);

    const div = FloatingDamageNumber._pool.length ? FloatingDamageNumber._pool.pop() : document.createElement('div');
    div.className = options.className || '';
    const displayValue = isMiss ? 'MISS' : value;
    const fontSize = isCrit ? 28 : 20;
    const baseRotation = (Math.random() - 0.5) * rotationRange;

    // Estimate width to prevent synchronous layout reads (layout thrashing) on creation
    const rectWidth = String(displayValue).length * (fontSize * scale * sizeMultiplier * 0.65);
    const clampXVal = Math.min(Math.max(targetX + xOffset, rectWidth / 2 + 8), Math.max(rectWidth / 2 + 8, window.innerWidth - rectWidth / 2 - 8));

    div.style.cssText = `
      position: fixed;
      left: 0;
      top: 0;
      font-family: 'Orbitron', monospace;
      color: ${color};
      font-weight: 900;
      letter-spacing: 0.5px;
      -webkit-text-stroke: 0.5px ${color};
      pointer-events: none;
      z-index: 999999;
      opacity: 1;
      transform: translate3d(${clampXVal}px, ${targetY}px, 0) translateX(-50%) rotate(${baseRotation}deg);
      text-shadow: 1px 1px 0 rgba(0, 0, 0, 0.8), 0 0 10px rgba(255, 255, 255, 0.16);
      will-change: transform, opacity;
      font-size: ${fontSize * scale * sizeMultiplier}px;
    `;
    div.textContent = displayValue;
    container.appendChild(div);

    // Manage stacking by rounded coordinates unless a stackKey is provided
    const key = stackKey || `coord:${Math.round(targetX)}_${Math.round(targetY)}`;
    if (!FloatingDamageNumber._coordActiveByKey) FloatingDamageNumber._coordActiveByKey = {};
    if (!FloatingDamageNumber._coordActiveByKey[key]) FloatingDamageNumber._coordActiveByKey[key] = [];
    FloatingDamageNumber._coordActiveByKey[key].push(div);

    // Register in centralized non-anchored list for a single RAF loop
    if (!FloatingDamageNumber._list) FloatingDamageNumber._list = [];
    const createdAt = performance.now();
    const item = {
      div,
      coordKey: key,
      x: clampXVal,
      y: targetY,
      driftX,
      driftY,
      travelX,
      travelY,
      createdAt,
      duration: effectiveDuration,
      fadeDelay: effectiveFadeDelay,
      isCrit,
      baseRotation,
      color,
      cycleText: !!options.cycleText,
      finalText: String(options.finalText !== undefined ? options.finalText : value)
    };
    FloatingDamageNumber._list.push(item);
    if (!FloatingDamageNumber._running) {
      FloatingDamageNumber._running = true;
      requestAnimationFrame(FloatingDamageNumber._tickNonAnchored);
    }

    return div;
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

FloatingDamageNumber.showAnchored = function (anchorElementOrRect, value, options = {}) {
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

  let anchorKey = opts.anchorKey || null;
  let baseX = window.innerWidth / 2;
  let baseY = window.innerHeight / 2;

  if (anchorElementOrRect instanceof Element) {
    const el = anchorElementOrRect;
    if (!anchorKey) anchorKey = el.dataset && el.dataset.enemyId ? String(el.dataset.enemyId) : null;

    // Check if positioning dataset is available to avoid layouts
    if (el.dataset.x) {
      const circleRect = (window.UIManager && typeof UIManager.getCircleRect === 'function')
        ? UIManager.getCircleRect()
        : (document.querySelector('.enemy-circle-container')?.getBoundingClientRect() || { left: 0, top: 0 });
      baseX = circleRect.left + Number(el.dataset.x);
      baseY = circleRect.top + Number(el.dataset.y);
    } else {
      const rect = el.getBoundingClientRect();
      baseX = rect.left + rect.width / 2;
      baseY = rect.top;
    }
  } else if (anchorElementOrRect && typeof anchorElementOrRect.left === 'number') {
    const rect = anchorElementOrRect;
    baseX = rect.left + rect.width / 2;
    baseY = rect.top;
  } else if (typeof anchorElementOrRect === 'function') {
    const rect = anchorElementOrRect();
    baseX = rect.left + rect.width / 2;
    baseY = rect.top;
  } else if (anchorElementOrRect && typeof anchorElementOrRect.x === 'number') {
    baseX = anchorElementOrRect.x;
    baseY = anchorElementOrRect.y;
  }

  if (isNaN(baseX) || isNaN(baseY)) {
    baseX = window.innerWidth / 2;
    baseY = window.innerHeight / 2;
  }

  const div = FloatingDamageNumber._anchoredPool.length ? FloatingDamageNumber._anchoredPool.pop() : document.createElement('div');
  div.className = 'floating-damage-number anchored';
  div.textContent = String(value);
  div.style.pointerEvents = 'none';
  div.style.position = 'fixed';
  div.style.zIndex = 999999;
  div.style.opacity = '1';
  div.style.whiteSpace = 'nowrap';
  div.style.willChange = 'transform, opacity';
  div.style.fontFamily = "'Orbitron', monospace";
  div.style.fontWeight = '900';
  div.style.letterSpacing = '0.5px';
  div.style.webkitTextStroke = `0.5px ${opts.color}`;
  div.style.textShadow = '1px 1px 0 rgba(0,0,0,0.8), 0 0 10px rgba(255,255,255,0.12)';
  div.style.color = opts.color;
  div.style.fontSize = `${(opts.isCrit ? 28 : 20) * opts.scale * 1.5}px`;
  opts.container.appendChild(div);

  // Estimate width instead of reading clientWidth to prevent layout thrashing
  const measuredWidth = String(value).length * ((opts.isCrit ? 28 : 20) * opts.scale * 1.5 * 0.65);

  const floatObj = {
    div,
    width: measuredWidth,
    baseX: baseX,
    baseY: baseY,
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
    baseColor: opts.color,
    cycleText: !!opts.cycleText,
    finalText: String(opts.finalText !== undefined ? opts.finalText : value)
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

FloatingDamageNumber._anchoredTick = function () {
  try {
    const now = performance.now();
    const list = FloatingDamageNumber._anchoredList;

    for (let i = list.length - 1; i >= 0; i--) {
      const f = list[i];
      if (!f || !f.div) {
        list.splice(i, 1);
        continue;
      }
      const elapsed = now - f.createdAt;
      if (!f.freezeDuration) {
        f.freezeDuration = 100 + Math.random() * 200;
      }
      if (elapsed < f.freezeDuration) {
        const baseX = f.baseX;
        const baseY = f.baseY;
        const clampX = (() => {
          const w = f.width || 80;
          const minX = w / 2 + 8;
          const maxX = window.innerWidth - w / 2 - 8;
          return Math.min(Math.max(baseX, minX), Math.max(minX, maxX));
        })();
        let slotIndex = 0;
        if (f.anchorKey && FloatingDamageNumber._anchoredActiveByKey[f.anchorKey]) {
          slotIndex = FloatingDamageNumber._anchoredActiveByKey[f.anchorKey].indexOf(f);
          if (slotIndex < 0) slotIndex = 0;
        }
        const yPos = baseY - f.offsetY - (slotIndex * f.gap);
        f.div.style.transform = `translate3d(${clampX}px, ${yPos}px, 0) translateX(-50%) rotate(${f.baseRotation}deg) scale(1)`;
        f.div.style.opacity = 1;
        continue;
      }
      const activeElapsed = elapsed - f.freezeDuration;
      const progress = activeElapsed / f.duration;
      const visibleDuration = Math.max(1, f.duration - f.fadeDelay);
      const fadeRaw = activeElapsed <= f.fadeDelay ? 0 : Math.min(1, (activeElapsed - f.fadeDelay) / visibleDuration);
      // Eased fade so anchored floats remain visible until the final moments
      const easedFade = Math.pow(fadeRaw, 2.6);
      const opacity = 1 - easedFade;

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
      } catch (e) { }

      const baseX = f.baseX;
      const baseY = f.baseY;

      const clampX = (() => {
        const w = f.width || 80;
        const minX = w / 2 + 8;
        const maxX = window.innerWidth - w / 2 - 8;
        return Math.min(Math.max(baseX, minX), Math.max(minX, maxX));
      })();

      const easeOut = 1 - Math.pow(1 - Math.max(0, Math.min(1, progress)), 3);
      const yPos = baseY - f.offsetY - (slotIndex * f.gap);
      const scaleValue = 1 + Math.max(0, Math.min(1, progress)) * 0.3;
      const wobbleAmplitude = f.isCrit ? 6 : 3;
      const wobble = Math.sin(Math.max(0, Math.min(1, progress)) * Math.PI * 2) * wobbleAmplitude * (1 - Math.max(0, Math.min(1, progress)));
      const driftX = (f.driftX || 0) * Math.min(1, progress);
      const driftY = (f.driftY || 0) * easeOut;

      f.div.style.transform = `translate3d(${clampX + driftX}px, ${yPos + driftY}px, 0) translateX(-50%) rotate(${f.baseRotation + wobble}deg) scale(${scaleValue})`;
      f.div.style.opacity = opacity;

      if (f.cycleText) {
        if (progress < 0.7) {
          const text = String(f.finalText || '');
          if (text.includes('AP')) {
            f.div.textContent = `+${Math.floor(Math.random() * 31)} AP`;
          } else if (text.includes('💎')) {
            f.div.textContent = `+${Math.floor(Math.random() * 4)} 💎`;
          } else if (text === 'Miss!') {
            const choices = [
              `+${Math.floor(Math.random() * 31)} AP`,
              `+${Math.floor(Math.random() * 4)} 💎`,
              'Miss!',
              `+${Math.floor(Math.random() * 15)} AP`
            ];
            f.div.textContent = choices[Math.floor(Math.random() * choices.length)];
          } else {
            f.div.textContent = Math.random() > 0.5 ? text : 'Miss!';
          }
        } else {
          f.div.textContent = f.finalText;
        }
      }

      if (progress >= 1) {
        try { f.div.remove(); } catch (e) { }
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
  } catch (err) {
    console.error("Error in FloatingDamageNumber._anchoredTick", err);
  } finally {
    if (FloatingDamageNumber._anchoredList.length > 0) {
      requestAnimationFrame(FloatingDamageNumber._anchoredTick);
    } else {
      FloatingDamageNumber._anchoredRunning = false;
    }
  }
};

FloatingDamageNumber._tickNonAnchored = function () {
  try {
    const now = performance.now();
    const list = FloatingDamageNumber._list || [];
    for (let i = list.length - 1; i >= 0; i--) {
      const f = list[i];
      if (!f || !f.div) {
        list.splice(i, 1);
        continue;
      }
      const elapsed = now - f.createdAt;
      if (!f.freezeDuration) {
        f.freezeDuration = 100 + Math.random() * 200;
      }
      if (elapsed < f.freezeDuration) {
        f.div.style.transform = `translate3d(${f.x}px, ${f.y}px, 0) translateX(-50%) rotate(${f.baseRotation}deg) scale(1)`;
        f.div.style.opacity = 1;
        continue;
      }
      const activeElapsed = elapsed - f.freezeDuration;
      const progress = activeElapsed / f.duration;
      const visibleDuration = Math.max(1, f.duration - f.fadeDelay);
      const fadeRaw = activeElapsed <= f.fadeDelay ? 0 : Math.min(1, (activeElapsed - f.fadeDelay) / visibleDuration);
      const easedFade = Math.pow(fadeRaw, 2.6);
      const opacity = 1 - easedFade;

      // stacked slot index based on coord map
      let slotIndex = 0;
      try {
        if (f.coordKey && FloatingDamageNumber._coordActiveByKey && FloatingDamageNumber._coordActiveByKey[f.coordKey]) {
          slotIndex = Math.max(0, FloatingDamageNumber._coordActiveByKey[f.coordKey].indexOf(f.div));
        }
      } catch (e) { }

      if (slotIndex > 0) {
        try {
          const v = variantForStack(f.color || f.div.style.color || '#ffffff', slotIndex);
          f.div.style.color = v;
          f.div.style.webkitTextStroke = `0.5px ${v}`;
        } catch (e) { }
      }

      const easeOut = 1 - Math.pow(1 - progress, 3);
      const dx = progress * (f.travelX !== undefined ? f.travelX : 0);
      const dy = easeOut * (f.travelY !== undefined ? f.travelY : -50);
      const scaleValue = 1 + Math.max(0, Math.min(1, progress)) * 0.3;
      const wobbleAmplitude = f.isCrit ? 6 : 3;
      const wobble = Math.sin(progress * Math.PI * 2) * wobbleAmplitude * (1 - progress);
      const driftX = (f.driftX || 0) * Math.min(1, progress);
      const driftY = (f.driftY || 0) * easeOut;

      f.div.style.transform = `translate3d(${f.x + dx + driftX}px, ${f.y + dy + driftY}px, 0) translateX(-50%) rotate(${f.baseRotation + wobble}deg) scale(${scaleValue})`;
      f.div.style.opacity = opacity;

      if (f.cycleText) {
        if (progress < 0.7) {
          const text = String(f.finalText || '');
          if (text.includes('AP')) {
            f.div.textContent = `+${Math.floor(Math.random() * 31)} AP`;
          } else if (text.includes('💎')) {
            f.div.textContent = `+${Math.floor(Math.random() * 4)} 💎`;
          } else if (text === 'Miss!') {
            const choices = [
              `+${Math.floor(Math.random() * 31)} AP`,
              `+${Math.floor(Math.random() * 4)} 💎`,
              'Miss!',
              `+${Math.floor(Math.random() * 15)} AP`
            ];
            f.div.textContent = choices[Math.floor(Math.random() * choices.length)];
          } else {
            f.div.textContent = Math.random() > 0.5 ? text : 'Miss!';
          }
        } else {
          f.div.textContent = f.finalText;
        }
      }

      if (progress >= 1) {
        try { f.div.remove(); } catch (e) { }
        // remove from coord map
        try {
          if (f.coordKey && FloatingDamageNumber._coordActiveByKey && FloatingDamageNumber._coordActiveByKey[f.coordKey]) {
            const arr = FloatingDamageNumber._coordActiveByKey[f.coordKey];
            const idx = arr.indexOf(f.div);
            if (idx !== -1) arr.splice(idx, 1);
            if (arr.length === 0) delete FloatingDamageNumber._coordActiveByKey[f.coordKey];
          }
        } catch (e) { }

        FloatingDamageNumber._pool.push(f.div);
        list.splice(i, 1);
      }
    }
  } catch (err) {
    console.error("Error in FloatingDamageNumber._tickNonAnchored", err);
  } finally {
    const list = FloatingDamageNumber._list || [];
    if (list.length > 0) {
      requestAnimationFrame(FloatingDamageNumber._tickNonAnchored);
    } else {
      FloatingDamageNumber._running = false;
    }
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
      } catch (e) { }
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
    element.style.opacity = '0';
    const delay = 100 + Math.random() * 200;
    setTimeout(() => {
      ensureAnimationStyles();
      element.style.setProperty('--nm-duration', `${duration}ms`);
      restartAnimationClass(element, 'nm-popup-scale');
    }, delay);
  }

  static scaleCentered(element, duration = 300) {
    element.style.opacity = '0';
    const delay = 100 + Math.random() * 200;
    setTimeout(() => {
      ensureAnimationStyles();
      element.style.setProperty('--nm-duration', `${duration}ms`);
      restartAnimationClass(element, 'nm-popup-scale-centered');
    }, delay);
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

// Enemy death animation (rainbow burst or custom unlocked visual cosmetics)
class EnemyDeathAnimation {
  static burst(x, y, isElite = false) {
    const state = typeof getGameState === 'function' ? getGameState() : null;
    const effect = state?.playerState?.equippedDeathEffect || 'Default';
    const particles = new ParticleSystem();

    if (isElite) {
      ScreenEffects.shake(20, 350);
    }

    if (effect === 'Confetti') {
      const count = Math.max(24, Math.round((isElite ? 100 : 60) * AnimationRuntime.particleScale));
      const colors = ['#ff66b2', '#3399ff', '#ffff66', '#33cc33', '#ff9933', '#cc33ff'];
      for (let i = 0; i < count; i++) {
        const color = colors[i % colors.length];
        const angle = -Math.PI + Math.PI * Math.random(); // upwards spread
        const speed = (isElite ? 12 : 8) * (0.7 + Math.random() * 0.6);
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;

        particles.emit(x, y, 1, {
          color: color,
          lifetime: isElite ? 1400 : 1000,
          vx: vx,
          vy: vy,
          gravity: 0.18,
          rotateSpeed: (Math.random() - 0.5) * 12,
          shape: 'square',
          size: Math.random() * 6 + (isElite ? 18 : 12),
          glow: true
        });
      }
    } else if (effect === 'Fire Blast') {
      const count = Math.max(24, Math.round((isElite ? 80 : 50) * AnimationRuntime.particleScale));
      const colors = ['#ff3300', '#ff6600', '#ff9900', '#ffcc00', '#7a7a7a', '#555555'];
      for (let i = 0; i < count; i++) {
        const color = colors[i % colors.length];
        const vx = (Math.random() - 0.5) * 6;
        const vy = -6 - Math.random() * 8;

        particles.emit(x, y, 1, {
          color: color,
          lifetime: 1000,
          vx: vx,
          vy: vy,
          accelY: -0.05,
          shape: 'circle',
          size: Math.random() * 10 + (isElite ? 22 : 14),
          glow: true
        });
      }
    } else if (effect === 'Void Slime') {
      const count = Math.max(16, Math.round((isElite ? 60 : 32) * AnimationRuntime.particleScale));
      const colors = ['#4a0e4e', '#8a2be2', '#a855f7', '#d500f9', '#2d142c'];
      for (let i = 0; i < count; i++) {
        const color = colors[i % colors.length];
        const angle = Math.random() * Math.PI * 2;
        const speed = (2.5 + Math.random() * 4);
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;

        particles.emit(x, y, 1, {
          color: color,
          lifetime: 1200,
          vx: vx,
          vy: vy,
          gravity: 0.08,
          shape: 'circle',
          size: Math.random() * 14 + (isElite ? 26 : 18),
          glow: true
        });
      }
    } else if (effect === 'Glitch Matrix') {
      const count = Math.max(30, Math.round((isElite ? 90 : 50) * AnimationRuntime.particleScale));
      const colors = ['#39ff14', '#00ff00', '#0f0', '#1f8b4c', '#003300'];
      for (let i = 0; i < count; i++) {
        const color = colors[i % colors.length];
        const vx = 0; // vertical drop
        const vy = 2 + Math.random() * 3;

        // Spawn slightly offset horizontally to look like a grid channel
        const spawnX = x + (Math.floor(Math.random() * 9) - 4) * 16;
        const spawnY = y + (Math.random() - 0.5) * 40;

        particles.emit(spawnX, spawnY, 1, {
          color: color,
          lifetime: 1400,
          vx: vx,
          vy: vy,
          accelY: 0.08,
          shape: 'square',
          size: Math.random() * 8 + 12,
          glow: true
        });
      }
    } else if (effect === 'Holy Beam') {
      // Create vertical golden light beam overlay
      const beam = document.createElement('div');
      beam.className = 'holy-light-beam';
      beam.style.left = `${x - 70}px`;
      beam.style.top = `0px`;
      beam.style.height = `100vh`;
      beam.style.width = `140px`;
      beam.style.boxShadow = `0 0 40px #ffd700, 0 0 80px #ffd700`;
      document.body.appendChild(beam);
      setTimeout(() => beam.remove(), 800);

      const count = Math.max(20, Math.round((isElite ? 70 : 40) * AnimationRuntime.particleScale));
      const colors = ['#ffffff', '#ffd700', '#fff0a6', '#fff9d6'];
      for (let i = 0; i < count; i++) {
        const color = colors[i % colors.length];
        const vx = (Math.random() - 0.5) * 3;
        const vy = -6 - Math.random() * 8;

        particles.emit(x, y, 1, {
          color: color,
          lifetime: 900,
          vx: vx,
          vy: vy,
          shape: 'circle',
          size: Math.random() * 8 + (isElite ? 16 : 10),
          glow: true
        });
      }
    } else if (effect === 'Rainbow Pixel') {
      const count = Math.max(24, Math.round((isElite ? 120 : 70) * AnimationRuntime.particleScale));
      const colors = ['#ff3366', '#ff9933', '#ffff33', '#33cc66', '#3399ff', '#9933ff'];
      for (let i = 0; i < count; i++) {
        const color = colors[i % colors.length];
        const angle = Math.random() * Math.PI * 2;
        const speed = (isElite ? 18 : 10) * (0.8 + Math.random() * 0.4);
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;

        particles.emit(x, y, 1, {
          color: color,
          lifetime: 1100,
          vx: vx,
          vy: vy,
          shape: 'square',
          size: Math.random() * 10 + (isElite ? 22 : 14),
          glow: true
        });
      }
    } else {
      // Default rainbow circle burst
      const count = Math.max(12, Math.round((isElite ? 80 : 40) * AnimationRuntime.particleScale));
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
          lifetime: isElite ? 1200 : 800,
          velocity: isElite ? 15 : 9,
          spread: Math.PI * 2,
          size: isElite ? 18 : 12,
          glow: true
        });
      }
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

    for (let i = 0; i < burstCount; i++) {
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
      const freezeDuration = 100 + Math.random() * 200;
      const animate = () => {
        const now = performance.now();
        const elapsed = now - startTime;
        if (elapsed < freezeDuration) {
          square.style.transform = `translate3d(${x - size / 2}px, ${y - size / 2}px, 0) scale(1)`;
          requestAnimationFrame(animate);
          return;
        }
        const activeElapsed = elapsed - freezeDuration;
        const progress = Math.min(1, activeElapsed / duration);
        // easeOutCubic
        const easeOut = 1 - Math.pow(1 - progress, 3);

        const curX = x + targetX * easeOut;
        const curY = y + targetY * easeOut;

        // Shrink slower at first, then faster
        const scale = 1 - Math.pow(progress, 2);

        square.style.transform = `translate3d(${curX - size / 2}px, ${curY - size / 2}px, 0) scale(${scale})`;

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
    const flashFreezeDuration = 100 + Math.random() * 200;

    const animateFlash = () => {
      const now = performance.now();
      const elapsed = now - flashStart;
      if (elapsed < flashFreezeDuration) {
        flash.style.transform = `translate3d(${x - 40}px, ${y - 40}px, 0) scale(1)`;
        requestAnimationFrame(animateFlash);
        return;
      }
      const activeElapsed = elapsed - flashFreezeDuration;
      const progress = Math.min(1, activeElapsed / flashDuration);
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

    const baseFreeze = 100 + Math.random() * 200;

    // 1-second safety fallback: force reset after 1s of inactivity
    cardElement.animResetTimeout = setTimeout(() => {
      cardElement.style.transform = cardElement.dataset.originalTransform || origTransform;
      cardElement.style.transition = '';
      cardElement.style.opacity = '';
      cardElement.style.willChange = '';
      delete cardElement.dataset.originalTransform;
      delete cardElement.dataset.activeAnimsCount;
    }, 1000 + baseFreeze);

    // 1. Squares collapse inwards
    for (let i = 0; i < burstCount; i++) {
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
        const now = performance.now();
        const elapsed = now - startTime;
        if (elapsed < baseFreeze) {
          square.style.transform = `translate3d(${cx + startX - size / 2}px, ${cy + startY - size / 2}px, 0) scale(1)`;
          requestAnimationFrame(animateCollapse);
          return;
        }
        const activeElapsed = elapsed - baseFreeze;
        const progress = Math.min(1, activeElapsed / collapseDuration);

        // easeInCubic to accelerate inwards
        const easeIn = Math.pow(progress, 3);

        const curX = cx + startX * (1 - easeIn);
        const curY = cy + startY * (1 - easeIn);

        square.style.transform = `translate3d(${curX - size / 2}px, ${curY - size / 2}px, 0) scale(${1 - progress})`;

        if (progress < 1) {
          requestAnimationFrame(animateCollapse);
        } else {
          square.remove();
        }
      };

      requestAnimationFrame(animateCollapse);
    }

    // 2. Card slides sideways and disappears briefly
    // Wait for collapse to mostly finish (e.g. 150ms + baseFreeze)
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
            for (let j = 0; j < reappearCount; j++) {
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
              const outFreeze = 100 + Math.random() * 200;

              const animateOut = () => {
                const now = performance.now();
                const elapsedOut = now - outStart;
                if (elapsedOut < outFreeze) {
                  sq.style.transform = `translate3d(${cx - sqSize / 2}px, ${cy - sqSize / 2}px, 0) scale(1)`;
                  requestAnimationFrame(animateOut);
                  return;
                }
                const activeElapsedOut = elapsedOut - outFreeze;
                const p2 = Math.min(1, activeElapsedOut / outDur);
                sq.style.transform = `translate3d(${cx + tx * Math.pow(p2, 0.5) - sqSize / 2}px, ${cy + ty * Math.pow(p2, 0.5) - sqSize / 2}px, 0) scale(${1 - p2})`;
                if (p2 < 1) requestAnimationFrame(animateOut);
                else sq.remove();
              };
              requestAnimationFrame(animateOut);
            }
          }, 100);
        }
      };
      requestAnimationFrame(slideAnimate);

    }, 150 + baseFreeze);
  }
}

class RetroTaskCompleteAnimation {
  static play(element, forceAnimId = null) {
    console.log('RetroTaskCompleteAnimation.play', element);
    const activePanel = element ? (element.closest('.pull-tab') || element.closest('.popup-container') || element.closest('.shop-overlay')) : null;
    const container = activePanel || document.body;

    const lowPower = typeof AnimationRuntime !== 'undefined' && AnimationRuntime.lowPower;
    const scaleFactor = typeof AnimationRuntime !== 'undefined' ? AnimationRuntime.particleScale : 1;

    // Retrieve task difficulty from TaskManager
    const taskId = element?.dataset?.id;
    const task = (taskId && typeof TaskManager !== 'undefined') ? TaskManager.getTaskById(taskId) : null;
    const difficulty = task ? task.difficulty : 'Easy';

    // Equipped animation ID
    let animId = forceAnimId;
    if (!animId) {
      try {
        const state = getGameState();
        animId = state.playerState.equippedCompletionAnimation || 'Default';
      } catch (e) {
        animId = 'Default';
      }
    }

    // Set intensity parameters based on difficulty (100x bolder!)
    let difficultyMultiplier = 1.0;
    let shakeAmt = 12;
    let shakeDur = 250;
    let flashColor = 'rgba(255, 215, 0, 0.2)';
    let flashDur = 300;

    if (difficulty === 'Medium') {
      difficultyMultiplier = 1.6;
      shakeAmt = 18;
      shakeDur = 300;
      flashColor = 'rgba(255, 215, 0, 0.28)';
    } else if (difficulty === 'Hard') {
      difficultyMultiplier = 2.5;
      shakeAmt = 26;
      shakeDur = 400;
      flashColor = 'rgba(255, 51, 102, 0.35)';
      flashDur = 400;
    } else if (difficulty === 'Ultra') {
      difficultyMultiplier = 4.0;
      shakeAmt = 35;
      shakeDur = 500;
      flashColor = 'rgba(255, 51, 102, 0.5)';
      flashDur = 500;
    }

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

    // Play intersecting diagonal cross slashes across the card (100x bolder!)
    if (element) {
      const slashColor = (difficulty === 'Hard' || difficulty === 'Ultra') ? '#FF3366' : '#FFD700';
      if (typeof RetroCritSlashAnimation !== 'undefined') {
        RetroCritSlashAnimation.play(element, slashColor);
        // Play a secondary offset slash for Medium, Hard, and Ultra to make it even bolder!
        if (difficulty !== 'Easy') {
          setTimeout(() => {
            try { RetroCritSlashAnimation.play(element, '#ffffff'); } catch (e) {}
          }, 120);
        }
      }
    }

    // Play screen flash & shake (juicy feedback)
    if (typeof ScreenEffects !== 'undefined') {
      if (ScreenEffects.flash) {
        ScreenEffects.flash(flashColor, flashDur);
      }
      if (ScreenEffects.shake) {
        ScreenEffects.shake(shakeAmt, shakeDur);
      }
    }

    // Spawn traveling particles based on type (increased counts and sizes!)
    const burstCount = Math.round((lowPower ? 25 : 55) * difficultyMultiplier * scaleFactor);

    if (animId === 'Confetti') {
      const colors = ['#FF3366', '#FF9933', '#FFFF33', '#33CCFF', '#33FF99', '#9933FF'];
      for (let i = 0; i < burstCount; i++) {
        const conf = document.createElement('div');
        const sizeW = (8 + Math.random() * 16) * scaleFactor;
        const sizeH = (16 + Math.random() * 24) * scaleFactor;
        const color = colors[Math.floor(Math.random() * colors.length)];

        conf.style.cssText = `
          position: fixed; left: 0; top: 0;
          width: ${sizeW}px; height: ${sizeH}px;
          background: ${color}; pointer-events: none;
          z-index: 999998; will-change: transform, opacity;
          border: 2px solid #bd00ff;
        `;
        container.appendChild(conf);

        const angle = (Math.PI * 2 * i) / burstCount + (Math.random() * 0.4 - 0.2);
        const velocity = (6 + Math.random() * 9) * (difficultyMultiplier * 0.6 + 0.4);
        let vx = Math.cos(angle) * velocity;
        let vy = Math.sin(angle) * velocity - 7;

        let x = cx;
        let y = cy;
        let life = 1.0;
        const decay = 0.004 + Math.random() * 0.003;
        const gravity = 0.18;
        let rot = Math.random() * 360;
        let rotSpeed = -15 + Math.random() * 30;

        const startTime = performance.now();
        const freezeDuration = 100 + Math.random() * 200;

        const animateConfetti = () => {
          const now = performance.now();
          const elapsed = now - startTime;
          if (elapsed < freezeDuration) {
            conf.style.transform = `translate3d(${cx - sizeW / 2}px, ${cy - sizeH / 2}px, 0) scale(1)`;
            conf.style.opacity = 1;
            requestAnimationFrame(animateConfetti);
            return;
          }
          vy += gravity;
          x += vx;
          y += vy;
          rot += rotSpeed;
          life -= decay;

          if (life > 0) {
            conf.style.transform = `translate3d(${x - sizeW / 2}px, ${y - sizeH / 2}px, 0) rotate(${rot}deg) scale(${life * 1.5})`;
            conf.style.opacity = life;
            requestAnimationFrame(animateConfetti);
          } else {
            try { conf.remove(); } catch (e) {}
          }
        };
        requestAnimationFrame(animateConfetti);
      }
    } 
    else if (animId === 'Gold Rush') {
      for (let i = 0; i < burstCount; i++) {
        const coin = document.createElement('div');
        coin.textContent = '🪙';
        coin.style.cssText = `
          position: fixed; left: 0; top: 0;
          font-size: ${Math.round((20 + Math.random() * 20) * scaleFactor)}px;
          pointer-events: none; z-index: 999998;
          will-change: transform, opacity;
          text-shadow: 0 0 10px #ffb300, 0 0 20px #ffea00;
        `;
        container.appendChild(coin);

        const angle = -Math.PI * 0.05 - (Math.PI * 0.9 * i) / burstCount + (Math.random() * 0.2 - 0.1);
        const velocity = (7 + Math.random() * 10) * (difficultyMultiplier * 0.6 + 0.4);
        let vx = Math.cos(angle) * velocity;
        let vy = Math.sin(angle) * velocity - 8;

        let x = cx;
        let y = cy;
        let life = 1.0;
        const decay = 0.003 + Math.random() * 0.003;
        const gravity = 0.25;

        const startTime = performance.now();
        const freezeDuration = 100 + Math.random() * 200;

        const animateCoin = () => {
          const now = performance.now();
          const elapsed = now - startTime;
          if (elapsed < freezeDuration) {
            coin.style.transform = `translate3d(${cx}px, ${cy}px, 0) scale(1)`;
            coin.style.opacity = 1;
            requestAnimationFrame(animateCoin);
            return;
          }
          vy += gravity;
          x += vx;
          y += vy;
          life -= decay;

          if (life > 0) {
            coin.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${life * 1.4})`;
            coin.style.opacity = life;
            requestAnimationFrame(animateCoin);
          } else {
            try { coin.remove(); } catch (e) {}
          }
        };
        requestAnimationFrame(animateCoin);
      }
    }
    else if (animId === 'Firework') {
      const colors = ['#FF1493', '#00FFFF', '#FFD700', '#7FFF00', '#FF4500', '#9400D3'];
      const miniBursts = Math.min(8, Math.ceil(difficultyMultiplier * 1.5));
      
      for (let b = 0; b < miniBursts; b++) {
        const fireworkColor = colors[Math.floor(Math.random() * colors.length)];
        const delay = b * 120;
        const offsetRange = b === 0 ? 0 : 80 + Math.random() * 100;
        const offsetAngle = Math.random() * Math.PI * 2;
        const bcx = cx + Math.cos(offsetAngle) * offsetRange;
        const bcy = cy + Math.sin(offsetAngle) * offsetRange;

        setTimeout(() => {
          const particlesPerFirework = Math.round(burstCount / 1.5);
          for (let i = 0; i < particlesPerFirework; i++) {
            const part = document.createElement('div');
            const size = (10 + Math.random() * 16) * scaleFactor;
            part.style.cssText = `
              position: fixed; left: 0; top: 0;
              width: ${size}px; height: ${size}px;
              border-radius: 50%;
              background: ${fireworkColor}; pointer-events: none;
              z-index: 999998; border: 3px solid #bd00ff;
              will-change: transform, opacity;
            `;
            container.appendChild(part);

            const angle = (Math.PI * 2 * i) / particlesPerFirework;
            const velocity = (4 + Math.random() * 8);
            const vx = Math.cos(angle) * velocity;
            const vy = Math.sin(angle) * velocity;

            let px = bcx;
            let py = bcy;
            let life = 1.0;
            const decay = 0.01 + Math.random() * 0.008;

            const animateFirework = () => {
              px += vx;
              py += vy;
              life -= decay;

              if (life > 0) {
                part.style.transform = `translate3d(${px - size / 2}px, ${py - size / 2}px, 0) scale(${life * 1.6})`;
                part.style.opacity = life;
                requestAnimationFrame(animateFirework);
              } else {
                try { part.remove(); } catch (e) {}
              }
            };
            requestAnimationFrame(animateFirework);
          }
        }, delay);
      }
    }
    else if (animId === 'Cosmic') {
      for (let i = 0; i < burstCount; i++) {
        const star = document.createElement('div');
        star.textContent = '⭐';
        star.style.cssText = `
          position: fixed; left: 0; top: 0;
          font-size: ${Math.round((16 + Math.random() * 20) * scaleFactor)}px;
          pointer-events: none; z-index: 999998;
          will-change: transform, opacity;
          text-shadow: 0 0 15px #fff, 0 0 30px var(--accent-gold, #ffd700);
        `;
        container.appendChild(star);

        const delay = Math.random() * 400;
        const speedY = -(3 + Math.random() * 5) * (difficultyMultiplier * 0.5 + 0.5);

        const startX = cx - 80 + Math.random() * 160;
        const startY = cy + 30 - Math.random() * 60;

        setTimeout(() => {
          let px = startX;
          let py = startY;
          let life = 1.0;
          const decay = 0.008 + Math.random() * 0.006;

          const animateStar = () => {
            py += speedY;
            px += Math.sin(py * 0.04) * 2.5;
            life -= decay;

            if (life > 0) {
              star.style.transform = `translate3d(${px}px, ${py}px, 0) scale(${life * (1.2 + 0.6 * Math.sin(py * 0.08))})`;
              star.style.opacity = life;
              requestAnimationFrame(animateStar);
            } else {
              try { star.remove(); } catch (e) {}
            }
          };
          requestAnimationFrame(animateStar);
        }, delay);
      }
    }
    else if (animId === 'Matrix') {
      const columns = Math.round(9 * difficultyMultiplier);
      const characters = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ$#@%&';

      for (let c = 0; c < columns; c++) {
        const delay = Math.random() * 300;
        const offset = rect ? (rect.left + (rect.width * c) / columns) : (cx - 200 + (400 * c) / columns);

        setTimeout(() => {
          const colLength = 6 + Math.floor(Math.random() * 8);
          const charsList = [];
          
          for (let charIdx = 0; charIdx < colLength; charIdx++) {
            const charDiv = document.createElement('div');
            charDiv.className = 'matrix-char';
            charDiv.style.cssText = `
              position: fixed;
              left: ${offset}px;
              color: ${charIdx === 0 ? '#ffffff' : '#39FF14'};
              font-family: monospace;
              font-size: ${Math.round((14 + Math.random() * 6) * scaleFactor)}px;
              font-weight: bold;
              text-shadow: 0 0 8px #39FF14, 0 0 15px #39FF14;
              pointer-events: none;
              z-index: 999998;
              will-change: transform, opacity;
            `;
            charDiv.textContent = characters[Math.floor(Math.random() * characters.length)];
            container.appendChild(charDiv);
            charsList.push(charDiv);
          }

          let px = offset;
          let py = rect ? rect.top - 30 : cy - 120;
          const dropSpeed = (4 + Math.random() * 7) * (difficultyMultiplier * 0.4 + 0.6);
          let duration = 800 + Math.random() * 400;
          const start = performance.now();

          const animateMatrix = () => {
            const elapsed = performance.now() - start;
            const progress = elapsed / duration;

            if (progress < 1) {
              py += dropSpeed;
              charsList.forEach((charDiv, index) => {
                const charY = py - (index * 16 * scaleFactor);
                charDiv.style.transform = `translate3d(0, ${charY}px, 0)`;
                charDiv.style.opacity = Math.max(0, 1.2 - progress - (index / colLength) * 0.4);
                if (Math.random() < 0.2) {
                  charDiv.textContent = characters[Math.floor(Math.random() * characters.length)];
                }
              });
              requestAnimationFrame(animateMatrix);
            } else {
              charsList.forEach(c => { try { c.remove(); } catch (err) {} });
            }
          };
          requestAnimationFrame(animateMatrix);
        }, delay);
      }
    }
    else if (animId === 'Holy Beam') {
      const beamCount = Math.min(4, Math.ceil(difficultyMultiplier * 1.2));
      for (let b = 0; b < beamCount; b++) {
        const delay = b * 180;
        const bOffset = (b - (beamCount - 1) / 2) * 80;

        setTimeout(() => {
          const holyBeam = document.createElement('div');
          holyBeam.className = 'holy-light-beam';
          holyBeam.style.left = `${cx + bOffset - 90}px`;
          holyBeam.style.top = '0px';
          holyBeam.style.width = '180px';
          holyBeam.style.height = '100vh';
          holyBeam.style.height = '100dvh';
          holyBeam.style.background = '#FFE664';
          holyBeam.style.borderLeft = '6px solid #FFFFFF';
          holyBeam.style.borderRight = '6px solid #FFFFFF';
          holyBeam.style.boxShadow = '8px 0 0 #ffaa00, -8px 0 0 #ffaa00';
          
          if (difficulty === 'Hard' || difficulty === 'Ultra') {
            holyBeam.style.background = '#FF64C8';
            holyBeam.style.borderLeft = '6px solid #FFFFFF';
            holyBeam.style.borderRight = '6px solid #FFFFFF';
            holyBeam.style.boxShadow = '8px 0 0 #d90077, -8px 0 0 #d90077';
          }
          document.body.appendChild(holyBeam);

          // Spawn ground sparks
          const sparkCount = Math.round(18 * difficultyMultiplier);
          for (let s = 0; s < sparkCount; s++) {
            const spark = document.createElement('div');
            const size = (8 + Math.random() * 12) * scaleFactor;
            const sparkColor = (difficulty === 'Hard' || difficulty === 'Ultra') ? '#ff66cc' : '#FFE664';
            spark.style.cssText = `
              position: fixed;
              left: ${cx + bOffset - 50 + Math.random() * 100}px;
              top: ${cy + 20}px;
              width: ${size}px; height: ${size}px;
              background: ${sparkColor};
              border: 2px solid #bd00ff;
              box-shadow: 2px 2px 0px rgba(0,0,0,0.4);
              pointer-events: none; z-index: 999999;
              will-change: transform, opacity;
            `;
            container.appendChild(spark);

            const speedY = -(2 + Math.random() * 6);
            const speedX = -4 + Math.random() * 8;
            let sx = parseFloat(spark.style.left);
            let sy = parseFloat(spark.style.top);
            let life = 1.0;
            const decay = 0.015 + Math.random() * 0.01;

            const animateSpark = () => {
              sy += speedY;
              sx += speedX;
              life -= decay;
              if (life > 0) {
                spark.style.transform = `translate3d(${sx - parseFloat(spark.style.left)}px, ${sy - parseFloat(spark.style.top)}px, 0) scale(${life * 1.5})`;
                spark.style.opacity = life;
                requestAnimationFrame(animateSpark);
              } else {
                try { spark.remove(); } catch (e) {}
              }
            };
            requestAnimationFrame(animateSpark);
          }

          setTimeout(() => {
            try { holyBeam.remove(); } catch (e) {}
          }, 800);
        }, delay);
      }
    }
    else {
      // Default sparkle (Standard Sparkle) - 100x bolder!
      const colors = (difficulty === 'Hard' || difficulty === 'Ultra')
        ? ['#FF3366', '#FF9933', '#FFFF33', '#33CCFF', '#33FF99', '#9933FF']
        : ['#FFD700', '#FFA500', '#FFF8DC', '#FFB33F'];

      for (let i = 0; i < burstCount; i++) {
        const square = document.createElement('div');
        const size = (16 + Math.random() * 24) * scaleFactor;
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
          border: 3px solid #bd00ff;
          will-change: transform, opacity;
        `;
        container.appendChild(square);

        const angle = (Math.PI * 2 * i) / burstCount + (Math.random() * 0.4 - 0.2);
        const velocity = (7 + Math.random() * 11) * (difficultyMultiplier * 0.5 + 0.5);
        let vx = Math.cos(angle) * velocity;
        let vy = Math.sin(angle) * velocity - 6;

        let x = cx;
        let y = cy;
        let life = 1.0;
        const decay = 0.004 + Math.random() * 0.003;
        const gravity = 0.22;

        const animateParticle = () => {
          vy += gravity;
          x += vx;
          y += vy;
          life -= decay;

          if (life > 0) {
            square.style.transform = `translate3d(${x - size / 2}px, ${y - size / 2}px, 0) scale(${life * 1.5})`;
            square.style.opacity = life;
            requestAnimationFrame(animateParticle);
          } else {
            try { square.remove(); } catch (e) { }
          }
        };
        requestAnimationFrame(animateParticle);
      }
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
      background: #00e5ff;
      border-left: 4px solid #ffffff;
      border-right: 4px solid #ffffff;
      box-shadow: 4px 0 0 #bd00ff, -4px 0 0 #bd00ff;
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
          background: #00e5ff; border: 2px solid #bd00ff; pointer-events: none; z-index: 13000;
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
          sq.style.transform = `translate3d(${cx + tx * p - size / 2}px, ${cy + ty * p - size / 2}px, 0) scale(${1 - p})`;
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
      background: rgba(255, 215, 0, 0.9);
      border-top: 8px solid #ffffff;
      box-shadow: inset 0 8px 0 #00e5ff, 0 4px 0 #000;
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
    for (let i = 0; i < particlesCount; i++) {
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
        border: 2px solid #bd00ff;
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
        const freezeDuration = 100 + Math.random() * 200;
        const animate = () => {
          const now = performance.now();
          const elapsed = now - start;
          if (elapsed < freezeDuration) {
            p.style.transform = 'translate3d(0px, 0px, 0) scale(1)';
            p.style.opacity = 1;
            requestAnimationFrame(animate);
            return;
          }
          const activeElapsed = elapsed - freezeDuration;
          const progress = Math.min(1, activeElapsed / duration);
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
    }, 900 + 300);
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
        const freezeDuration = 100 + Math.random() * 200;
        const animate = () => {
          const now = performance.now();
          const elapsed = now - start;
          if (elapsed < freezeDuration) {
            bubble.style.transform = 'translate3d(0px, 0px, 0) scale(1)';
            bubble.style.opacity = 1;
            requestAnimationFrame(animate);
            return;
          }
          const activeElapsed = elapsed - freezeDuration;
          const progress = Math.min(1, activeElapsed / duration);
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
  static play(cardElement, elementColor = '#ffb33f') {
    if (!cardElement) return;
    const rect = cardElement.getBoundingClientRect();

    // Create the absolute wrapper matching card bounds
    const wrapper = document.createElement('div');
    wrapper.className = 'crit-slash-wrapper';
    wrapper.style.left = `${rect.left}px`;
    wrapper.style.top = `${rect.top}px`;
    wrapper.style.width = `${rect.width}px`;
    wrapper.style.height = `${rect.height}px`;
    wrapper.style.overflow = 'visible';
    wrapper.style.setProperty('--slash-color', elementColor);

    // Create the two slashes with random angles
    const angle1 = Math.floor(Math.random() * 360);
    const angle2 = angle1 + 60 + Math.floor(Math.random() * 60);

    const slash1 = document.createElement('div');
    slash1.className = 'crit-slash-line slash-1';
    slash1.style.top = '50%';
    slash1.style.left = '50%';
    slash1.style.transformOrigin = 'center';
    slash1.style.transform = `translate(-50%, -50%) rotate(${angle1}deg)`;

    const slash2 = document.createElement('div');
    slash2.className = 'crit-slash-line slash-2';
    slash2.style.top = '50%';
    slash2.style.left = '50%';
    slash2.style.transformOrigin = 'center';
    slash2.style.transform = `translate(-50%, -50%) rotate(${angle2}deg)`;

    wrapper.appendChild(slash1);
    wrapper.appendChild(slash2);
    document.body.appendChild(wrapper);

    // Pause CSS animations during the freeze
    slash1.style.animationPlayState = 'paused';
    slash2.style.animationPlayState = 'paused';

    const freezeDuration = 100 + Math.random() * 200;
    setTimeout(() => {
      slash1.style.animationPlayState = 'running';
      slash2.style.animationPlayState = 'running';
    }, freezeDuration);

    // Trigger card shake
    cardElement.classList.add('crit-shaking');

    // Remove classes and elements after animation finishes
    setTimeout(() => {
      try { cardElement.classList.remove('crit-shaking'); } catch (e) { }
    }, 260 + freezeDuration);

    setTimeout(() => {
      try { wrapper.remove(); } catch (e) { }
    }, 450 + freezeDuration);
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
          left: ${cx - startSize / 2}px;
          top: ${cy - startSize / 2}px;
          width: ${startSize}px;
          height: ${startSize}px;
          border: ${borderSize}px solid #ffd700;
          box-shadow: 0 0 0 3px #bd00ff, inset 0 0 0 3px #bd00ff;
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
        box-shadow: 2px 2px 0px #bd00ff;
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
        sq.style.transform = `translate3d(${curX - size / 2}px, ${curY - size / 2}px, 0) scale(${1.2 - p * 1.2}) rotate(${p * 360}deg)`;
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
      left: ${cx - startSize / 2}px;
      top: ${cy - startSize / 2}px;
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
      left: ${cx - maxSize / 2}px;
      top: ${cy - maxSize / 2}px;
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

class DodgeTetherAnimation {
  static play(fromX, fromY, cardElement) {
    if (!cardElement) return;
    const rect = cardElement.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    // Create projectile
    const proj = document.createElement('div');
    proj.className = 'dodge-tether-projectile';
    proj.style.left = `${fromX}px`;
    proj.style.top = `${fromY}px`;
    document.body.appendChild(proj);

    const startTime = performance.now();
    const duration = 250; // 250ms

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(1, elapsed / duration);

      const curX = fromX + (cx - fromX) * progress;
      const curY = fromY + (cy - fromY) * progress;

      proj.style.left = `${curX}px`;
      proj.style.top = `${curY}px`;
      proj.style.transform = `translate(-50%, -50%) scale(${1 + progress * 0.3})`;

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        proj.remove();

        // Spawn collapsing forcefield
        const ff = document.createElement('div');
        ff.className = 'dodge-tether-forcefield';
        ff.style.left = `${cx}px`;
        ff.style.top = `${cy}px`;
        ff.style.width = `${rect.width}px`;
        ff.style.height = `${rect.height}px`;
        document.body.appendChild(ff);

        // Trigger transition to active state
        requestAnimationFrame(() => {
          ff.classList.add('active');
        });

        // Keep active for 1.2s, then fade out
        setTimeout(() => {
          ff.classList.remove('active');
          ff.classList.add('fade-out');
          setTimeout(() => ff.remove(), 300);
        }, 1200);
      }
    };

    requestAnimationFrame(animate);
  }
}

class RetroSlamWaveAnimation {
  static play(cardElement, color = '#ff2222') {
    if (!cardElement) return;
    const rect = cardElement.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const container = document.body;

    // Shake screen
    if (typeof ScreenEffects !== 'undefined' && ScreenEffects.shake) {
      ScreenEffects.shake(12, 300);
    }

    // Snappy Card Impact Bounce
    const origTransform = cardElement.style.transform || 'translate(-50%, -50%)';
    cardElement.style.transition = 'none';
    cardElement.style.willChange = 'transform';
    cardElement.style.transform = `${origTransform} scale(1.15) translateY(15px)`;

    setTimeout(() => {
      cardElement.style.transition = 'transform 150ms cubic-bezier(0.25, 0.8, 0.25, 1)';
      cardElement.style.transform = `${origTransform} scale(1.0)`;
      setTimeout(() => {
        cardElement.style.transition = '';
        cardElement.style.transform = '';
        cardElement.style.willChange = '';
      }, 150);
    }, 80);

    // Conical/concentric retro shockwave rings
    const ringCount = 3;
    for (let i = 0; i < ringCount; i++) {
      setTimeout(() => {
        const ring = document.createElement('div');
        const startSize = Math.min(rect.width, rect.height) * 0.4;
        ring.style.cssText = `
          position: fixed;
          left: ${cx - startSize / 2}px;
          top: ${cy - startSize / 2}px;
          width: ${startSize}px;
          height: ${startSize}px;
          border: 4px double ${color};
          background: transparent;
          pointer-events: none;
          z-index: 13400;
          will-change: transform, opacity;
          transform: translate3d(0, 0, 0) scale(1);
          opacity: 0.85;
        `;
        container.appendChild(ring);

        const start = performance.now();
        const duration = 500;

        const animate = () => {
          const progress = Math.min(1, (performance.now() - start) / duration);
          const scale = 1.0 + progress * 2.2;
          const opacity = 0.85 * (1 - Math.pow(progress, 2));

          ring.style.transform = `scale(${scale})`;
          ring.style.opacity = opacity;

          if (progress < 1) {
            requestAnimationFrame(animate);
          } else {
            ring.remove();
          }
        };
        requestAnimationFrame(animate);
      }, i * 150);
    }
  }
}

class RetroGlitchInvertAnimation {
  static play(color = '#ff2222', intensity = 1) {
    const container = document.body;

    // Glitchy flash overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: ${color};
      opacity: 0.15;
      pointer-events: none;
      z-index: 14998;
      will-change: opacity;
    `;
    container.appendChild(overlay);

    // Apply color inversion to body
    const originalFilter = document.body.style.filter || '';
    document.body.style.filter = `invert(0.8) hue-rotate(90deg) contrast(1.2)`;

    // Intense camera shake
    if (typeof ScreenEffects !== 'undefined' && ScreenEffects.shake) {
      ScreenEffects.shake(20 * intensity, 400);
    }

    // Glitch scanlines
    const lineCount = 6;
    for (let i = 0; i < lineCount; i++) {
      const line = document.createElement('div');
      const top = Math.random() * 100;
      const height = 4 + Math.random() * 10;
      line.style.cssText = `
        position: fixed;
        left: 0;
        right: 0;
        top: ${top}vh;
        height: ${height}px;
        background: #ffffff;
        opacity: 0.9;
        pointer-events: none;
        z-index: 14999;
        will-change: transform, opacity;
        transform: scaleX(0);
        transform-origin: left;
      `;
      container.appendChild(line);

      setTimeout(() => {
        line.style.transition = 'transform 100ms ease-out, opacity 100ms';
        line.style.transform = 'scaleX(1)';
        setTimeout(() => {
          line.style.opacity = '0';
          setTimeout(() => line.remove(), 100);
        }, 50 + Math.random() * 100);
      }, Math.random() * 200);
    }

    setTimeout(() => {
      document.body.style.filter = originalFilter;
      overlay.style.opacity = '0';
      setTimeout(() => overlay.remove(), 200);
    }, 250);
  }
}

class RetroEnergyBeamAnimation {
  static play(cardElement, color = '#00ffff') {
    if (!cardElement) return;
    const rect = cardElement.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const container = document.body;

    const beam = document.createElement('div');
    beam.style.cssText = `
      position: fixed;
      left: ${cx - 20}px;
      top: -100px;
      width: 40px;
      height: ${window.innerHeight + 200}px;
      background: ${color};
      border-left: 4px solid #ffffff;
      border-right: 4px solid #ffffff;
      box-shadow: 4px 0 0 #bd00ff, -4px 0 0 #bd00ff;
      pointer-events: none;
      z-index: 13500;
      opacity: 0;
      will-change: transform, opacity;
      transform: scaleX(0.2);
    `;
    container.appendChild(beam);

    if (typeof ScreenEffects !== 'undefined' && ScreenEffects.shake) {
      ScreenEffects.shake(8, 200);
    }

    const start = performance.now();
    const duration = Math.round(400 * 1.3);

    const animate = () => {
      const progress = Math.min(1, (performance.now() - start) / duration);

      let scaleX = 0.2;
      let opacity = 0;
      if (progress < 0.2) {
        // Fast fade-in and grow
        scaleX = 0.2 + (progress / 0.2) * 0.8;
        opacity = (progress / 0.2);
      } else if (progress < 0.7) {
        // Hold beam
        scaleX = 1.0;
        opacity = 1.0;
      } else {
        // Shrink and fade-out
        scaleX = 1.0 - ((progress - 0.7) / 0.3);
        opacity = 1.0 - ((progress - 0.7) / 0.3);
      }

      beam.style.transform = `scaleX(${scaleX})`;
      beam.style.opacity = opacity;

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        beam.remove();
      }
    };
    requestAnimationFrame(animate);
  }
}

class RetroOrbBurstAnimation {
  static play(cardElement, color = '#00ff66') {
    let cx = window.innerWidth / 2;
    let cy = window.innerHeight / 2;
    if (cardElement) {
      const rect = cardElement.getBoundingClientRect();
      cx = rect.left + rect.width / 2;
      cy = rect.top + rect.height / 2;
    }

    const container = document.body;
    const particleCount = 20;

    for (let i = 0; i < particleCount; i++) {
      const sq = document.createElement('div');
      const size = 10 + Math.random() * 12;
      sq.style.cssText = `
        position: fixed;
        left: 0;
        top: 0;
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        border: 2px solid #bd00ff;
        box-shadow: 2px 2px 0px rgba(0,0,0,0.3);
        pointer-events: none;
        z-index: 13600;
        will-change: transform, opacity;
      `;
      container.appendChild(sq);

      const angle = (i / particleCount) * Math.PI * 2 + (Math.random() * 0.4);
      const distance = 50 + Math.random() * 70;
      const tx = Math.cos(angle) * distance;
      const ty = Math.sin(angle) * distance;

      const start = performance.now();
      const duration = Math.round((400 + Math.random() * 200) * 1.3);

      const animate = () => {
        const progress = Math.min(1, (performance.now() - start) / duration);
        const easeOut = 1 - Math.pow(1 - progress, 2);

        // Add a slight retro wiggle using sin
        const wiggle = Math.sin(progress * Math.PI * 4) * 8;
        const curX = cx + tx * easeOut + (Math.cos(angle + Math.PI / 2) * wiggle);
        const curY = cy + ty * easeOut + (Math.sin(angle + Math.PI / 2) * wiggle);
        const scale = 1 - progress;

        sq.style.transform = `translate3d(${curX - size / 2}px, ${curY - size / 2}px, 0) scale(${scale})`;
        sq.style.opacity = 1 - progress;

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          sq.remove();
        }
      };
      requestAnimationFrame(animate);
    }
  }
}

class RetroPixelRainAnimation {
  static play(color = '#00ffff') {
    const container = document.body;
    const columns = Math.floor(window.innerWidth / 30);

    for (let i = 0; i < columns; i += 2) {
      setTimeout(() => {
        const drop = document.createElement('div');
        const size = 8 + Math.random() * 8;
        const startX = i * 30 + Math.random() * 15;

        drop.style.cssText = `
          position: fixed;
          left: ${startX}px;
          top: -20px;
          width: ${size}px;
          height: ${size}px;
          background: ${color};
          border: 2px solid #bd00ff;
          pointer-events: none;
          z-index: 13200;
          will-change: transform, opacity;
        `;
        container.appendChild(drop);

        const start = performance.now();
        const duration = Math.round((600 + Math.random() * 400) * 1.3);

        const animate = () => {
          const progress = Math.min(1, (performance.now() - start) / duration);
          const y = progress * window.innerHeight;

          drop.style.transform = `translate3d(0, ${y}px, 0) scale(${1 - progress * 0.3})`;
          drop.style.opacity = 1 - progress;

          if (progress < 1) {
            requestAnimationFrame(animate);
          } else {
            drop.remove();
          }
        };
        requestAnimationFrame(animate);
      }, Math.round(Math.random() * 400 * 1.3));
    }
  }
}

class RetroRagePulseAnimation {
  static play(cardElement, color = '#ff00ff') {
    if (!cardElement) return;

    // Save active shadow/transition state
    const origBoxShadow = cardElement.style.boxShadow || '';
    const origTransition = cardElement.style.transition || '';
    const origTransform = cardElement.style.transform || 'translate(-50%, -50%)';

    cardElement.style.transition = 'none';
    cardElement.style.willChange = 'transform, box-shadow';

    const start = performance.now();
    const duration = Math.round(500 * 1.3);

    const animate = () => {
      const progress = Math.min(1, (performance.now() - start) / duration);

      // Pulse size up/down rapid sine
      const pulse = 1.0 + Math.sin(progress * Math.PI * 4) * 0.12;
      const glowSize = 10 + Math.sin(progress * Math.PI * 4) * 15;

      cardElement.style.transform = `${origTransform} scale(${pulse})`;
      cardElement.style.boxShadow = `0 0 0 4px #ffffff, 0 0 0 8px ${color}`;

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        cardElement.style.transform = '';
        cardElement.style.boxShadow = origBoxShadow;
        cardElement.style.transition = origTransition;
        cardElement.style.willChange = '';
      }
    };
    requestAnimationFrame(animate);
  }
}

class RetroHellfireAnimation {
  static play(cardElement, color = '#ff4400', intensity = 1) {
    const container = document.body;
    const count = Math.round(30 * intensity);
    if (typeof ScreenEffects !== 'undefined' && ScreenEffects.shake) {
      ScreenEffects.shake(12 * intensity, 400);
    }

    // Spawn rising fire pixel columns
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const fire = document.createElement('div');
        const size = 12 + Math.random() * 20;
        const left = Math.random() * 100;
        fire.style.cssText = `
          position: fixed;
          left: ${left}vw;
          bottom: -50px;
          width: ${size}px;
          height: ${size * 2}px;
          background: ${color};
          border: 3px solid #ffcc00;
          box-shadow: 4px 4px 0px #bd00ff;
          border-radius: 4px;
          pointer-events: none;
          z-index: 13200;
          will-change: transform, opacity;
          opacity: 0.9;
        `;
        container.appendChild(fire);

        const start = performance.now();
        const duration = Math.round((600 + Math.random() * 500) * 1.3);
        const driftX = (Math.random() - 0.5) * 100;

        const animate = () => {
          const progress = Math.min(1, (performance.now() - start) / duration);
          const y = progress * -(window.innerHeight + 100);
          const x = Math.sin(progress * Math.PI * 2) * driftX;
          fire.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${1 - progress * 0.5})`;
          fire.style.opacity = 0.9 * (1 - progress);

          if (progress < 1) {
            requestAnimationFrame(animate);
          } else {
            fire.remove();
          }
        };
        requestAnimationFrame(animate);
      }, Math.round(Math.random() * 300 * 1.3));
    }
  }
}

class RetroSandstormAnimation {
  static play(cardElement, color = '#d4af37', intensity = 1) {
    const container = document.body;
    const count = Math.round(25 * intensity);
    if (typeof ScreenEffects !== 'undefined' && ScreenEffects.shake) {
      ScreenEffects.shake(6 * intensity, 600);
    }

    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const sand = document.createElement('div');
        const size = 6 + Math.random() * 10;
        const top = Math.random() * 100;
        sand.style.cssText = `
          position: fixed;
          left: -50px;
          top: ${top}vh;
          width: ${size}px;
          height: ${size}px;
          background: ${color};
           border: 1.5px solid #bd00ff;
          pointer-events: none;
          z-index: 13200;
          will-change: transform, opacity;
          opacity: 0.8;
          border-radius: 20%;
        `;
        container.appendChild(sand);

        const start = performance.now();
        const duration = Math.round((800 + Math.random() * 600) * 1.3);
        const startY = top;

        const animate = () => {
          const progress = Math.min(1, (performance.now() - start) / duration);
          const x = progress * (window.innerWidth + 100);
          const y = Math.sin(progress * Math.PI * 4) * 40;
          sand.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${progress * 360}deg)`;
          sand.style.opacity = 0.8 * (1 - progress);

          if (progress < 1) {
            requestAnimationFrame(animate);
          } else {
            sand.remove();
          }
        };
        requestAnimationFrame(animate);
      }, Math.round(Math.random() * 400 * 1.3));
    }
  }
}

class RetroMagicCircleAnimation {
  static play(cardElement, color = '#8a2be2', intensity = 1) {
    if (!cardElement) return;
    const rect = cardElement.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const container = document.body;

    const div = document.createElement('div');
    const size = Math.max(rect.width, rect.height) * 1.6;
    div.style.cssText = `
      position: fixed;
      left: ${cx - size / 2}px;
      top: ${cy - size / 2}px;
      width: ${size}px;
      height: ${size}px;
      pointer-events: none;
      z-index: 13100;
      will-change: transform, opacity;
      transform: scale(0.1) rotate(0deg);
      opacity: 0;
      transition: transform 390ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 390ms;
    `;

    // Neon glowing SVG magic circle design
    div.innerHTML = `
      <svg viewBox="0 0 100 100" style="width: 100%; height: 100%;">
        <circle cx="50" cy="50" r="45" fill="none" stroke="${color}" stroke-width="2.5" stroke-dasharray="6,4" />
        <circle cx="50" cy="50" r="38" fill="none" stroke="${color}" stroke-width="1" />
        <polygon points="50,15 80,70 20,70" fill="none" stroke="${color}" stroke-width="1.5" />
        <polygon points="50,85 80,30 20,30" fill="none" stroke="${color}" stroke-width="1.5" />
        <circle cx="50" cy="50" r="15" fill="none" stroke="${color}" stroke-width="1" stroke-dasharray="2,2" />
      </svg>
    `;
    container.appendChild(div);

    requestAnimationFrame(() => {
      div.style.transform = 'scale(1) rotate(45deg)';
      div.style.opacity = '0.9';
    });

    if (typeof ScreenEffects !== 'undefined' && ScreenEffects.shake) {
      ScreenEffects.shake(8 * intensity, 300);
    }

    setTimeout(() => {
      // Spinning expand & burst
      div.style.transition = 'transform 520ms ease-in, opacity 520ms';
      div.style.transform = 'scale(1.8) rotate(360deg)';
      div.style.opacity = '0';
      if (typeof RetroOrbBurstAnimation !== 'undefined') {
        RetroOrbBurstAnimation.play(cardElement, color);
      }
      setTimeout(() => div.remove(), 520);
    }, 1040);
  }
}

class RetroAcidSplashAnimation {
  static play(cardElement, color = '#32cd32', intensity = 1) {
    let cx = window.innerWidth / 2;
    let cy = window.innerHeight / 2;
    if (cardElement) {
      const rect = cardElement.getBoundingClientRect();
      cx = rect.left + rect.width / 2;
      cy = rect.top + rect.height / 2;
    }
    const container = document.body;
    const count = Math.round(20 * intensity);

    for (let i = 0; i < count; i++) {
      const drop = document.createElement('div');
      const size = 6 + Math.random() * 8;
      drop.style.cssText = `
        position: fixed;
        left: ${cx}px;
        top: ${cy}px;
        width: ${size}px;
        height: ${size * 1.5}px;
        background: ${color};
        border: 2px solid #bd00ff;
        border-radius: 50% 50% 40% 40%;
        pointer-events: none;
        z-index: 13300;
        will-change: transform, opacity;
      `;
      container.appendChild(drop);

      const angle = (Math.random() * Math.PI) - Math.PI; // Upwards spread
      const speed = (4 + Math.random() * 8) * 0.77;
      const vx = Math.cos(angle) * speed;
      let vy = Math.sin(angle) * speed - 2 * 0.77;

      const start = performance.now();
      const duration = Math.round((600 + Math.random() * 300) * 1.3);

      const animate = () => {
        const progress = Math.min(1, (performance.now() - start) / duration);
        // Gravity effect
        vy += 0.27;
        const curX = cx + vx * (progress * 25);
        const curY = cy + vy * (progress * 25) + (0.5 * 0.35 * Math.pow(progress * 25, 2));

        drop.style.transform = `translate3d(${curX}px, ${curY}px, 0) scale(${1 - progress * 0.4})`;
        drop.style.opacity = 1 - progress;

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          drop.remove();
        }
      };
      requestAnimationFrame(animate);
    }
  }
}

class RetroEarthShatterAnimation {
  static play(cardElement, color = '#00a86b', intensity = 1) {
    const container = document.body;
    if (typeof ScreenEffects !== 'undefined' && ScreenEffects.shake) {
      ScreenEffects.shake(22 * intensity, 500);
    }

    // Create rising ground rocks
    const shardCount = Math.round(15 * intensity);
    for (let i = 0; i < shardCount; i++) {
      const shard = document.createElement('div');
      const size = 15 + Math.random() * 25;
      const left = Math.random() * 100;
      shard.style.cssText = `
        position: fixed;
        left: ${left}vw;
        bottom: -40px;
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        border: 2px solid #332211;
        box-shadow: 4px 4px 0px #bd00ff;
        pointer-events: none;
        z-index: 13250;
        will-change: transform, opacity;
        transform: rotate(${Math.random() * 360}deg);
      `;
      container.appendChild(shard);

      const start = performance.now();
      const duration = Math.round((500 + Math.random() * 400) * 1.3);
      const jumpHeight = 100 + Math.random() * 250;

      const animate = () => {
        const progress = Math.min(1, (performance.now() - start) / duration);
        // Parabolic arc for rock throw
        const y = -Math.sin(progress * Math.PI) * jumpHeight;
        shard.style.transform = `translate3d(0, ${y}px, 0) rotate(${progress * 720}deg)`;
        shard.style.opacity = 1 - Math.pow(progress, 3);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          shard.remove();
        }
      };
      requestAnimationFrame(animate);
    }
  }
}

class RetroMatrixRainAnimation {
  static play(color = '#00ffff', intensity = 1) {
    const container = document.body;
    const columns = Math.floor(window.innerWidth / 25);
    const speedScale = intensity;

    for (let i = 0; i < columns; i += 2) {
      if (Math.random() > 0.6) continue;
      setTimeout(() => {
        const stream = document.createElement('div');
        stream.style.cssText = `
          position: fixed;
          left: ${i * 25}px;
          top: -150px;
          font-family: monospace;
          font-size: 14px;
          color: ${color};
          text-shadow: 0 0 8px ${color};
          white-space: nowrap;
          pointer-events: none;
          z-index: 13150;
          will-change: transform, opacity;
          writing-mode: vertical-rl;
        `;
        // Generate random binary sequence
        let str = '';
        const len = 5 + Math.floor(Math.random() * 10);
        for (let j = 0; j < len; j++) str += Math.random() > 0.5 ? '1' : '0';
        stream.textContent = str;
        container.appendChild(stream);

        const start = performance.now();
        const duration = (800 + Math.random() * 800) / speedScale;

        const animate = () => {
          const progress = Math.min(1, (performance.now() - start) / duration);
          const y = progress * (window.innerHeight + 200);
          stream.style.transform = `translate3d(0, ${y}px, 0)`;
          stream.style.opacity = 1 - progress;

          if (progress < 1) {
            requestAnimationFrame(animate);
          } else {
            stream.remove();
          }
        };
        requestAnimationFrame(animate);
      }, Math.random() * 500);
    }
  }
}

class RetroHolyBeamAnimation {
  static play(cardElement, color = '#ffffff', intensity = 1) {
    const container = document.body;
    const beamCount = Math.round(5 * intensity);

    if (typeof ScreenEffects !== 'undefined' && ScreenEffects.shake) {
      ScreenEffects.shake(8 * intensity, 400);
    }

    for (let i = 0; i < beamCount; i++) {
      setTimeout(() => {
        const beam = document.createElement('div');
        const startX = Math.random() * window.innerWidth;
        const angle = -45 + Math.random() * 90;
        beam.style.cssText = `
          position: fixed;
          left: ${startX}px;
          top: -100px;
          width: 60px;
          height: ${window.innerHeight + 300}px;
          background: ${color};
          border-left: 4px solid #ffffff;
          border-right: 4px solid #ffffff;
          box-shadow: 5px 0 0 #bd00ff, -5px 0 0 #bd00ff;
          pointer-events: none;
          z-index: 13450;
          opacity: 0;
          will-change: transform, opacity;
          transform: rotate(${angle}deg) scaleX(0.1);
          transform-origin: top center;
        `;
        container.appendChild(beam);

        const start = performance.now();
        const duration = Math.round(500 * 1.3);

        const animate = () => {
          const progress = Math.min(1, (performance.now() - start) / duration);
          let scaleX = 0.1;
          let opacity = 0;
          if (progress < 0.25) {
            scaleX = 0.1 + (progress / 0.25) * 0.9;
            opacity = progress / 0.25;
          } else if (progress < 0.75) {
            scaleX = 1.0;
            opacity = 1.0;
          } else {
            scaleX = 1.0 - (progress - 0.75) / 0.25;
            opacity = 1.0 - (progress - 0.75) / 0.25;
          }

          beam.style.transform = `rotate(${angle}deg) scaleX(${scaleX})`;
          beam.style.opacity = opacity;

          if (progress < 1) {
            requestAnimationFrame(animate);
          } else {
            beam.remove();
          }
        };
        requestAnimationFrame(animate);
      }, Math.round(i * 120 * 1.3));
    }
  }
}

class RetroRoyalCrownBurstAnimation {
  static play(cardElement, color = '#ff00ff', intensity = 1) {
    let cx = window.innerWidth / 2;
    let cy = window.innerHeight / 2;
    if (cardElement) {
      const rect = cardElement.getBoundingClientRect();
      cx = rect.left + rect.width / 2;
      cy = rect.top + rect.height / 2;
    }
    const container = document.body;
    const count = Math.round(16 * intensity);

    for (let i = 0; i < count; i++) {
      const crown = document.createElement('div');
      const size = 18 + Math.random() * 10;
      crown.style.cssText = `
        position: fixed;
        left: ${cx - size / 2}px;
        top: ${cy - size / 2}px;
        width: ${size}px;
        height: ${size}px;
        pointer-events: none;
        z-index: 13350;
        will-change: transform, opacity;
      `;
      // Crown retro blocky SVG shape
      crown.innerHTML = `
        <svg viewBox="0 0 24 24" style="width: 100%; height: 100%;">
          <path d="M2 4l3 5 7-6 7 6 3-5v14H2V4z" fill="${color}" stroke="#ffffff" stroke-width="1.5" />
        </svg>
      `;
      container.appendChild(crown);

      const angle = (i / count) * Math.PI * 2;
      const speed = (3 + Math.random() * 5) * 0.77;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;

      const start = performance.now();
      const duration = Math.round((600 + Math.random() * 300) * 1.3);

      const animate = () => {
        const progress = Math.min(1, (performance.now() - start) / duration);
        const curX = cx + vx * (progress * 35 * 0.77);
        const curY = cy + vy * (progress * 35 * 0.77);
        const rot = progress * 360;

        crown.style.transform = `translate3d(${curX - cx}px, ${curY - cy}px, 0) rotate(${rot}deg) scale(${1 - progress})`;
        crown.style.opacity = 1 - progress;

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          crown.remove();
        }
      };
      requestAnimationFrame(animate);
    }
  }
}

class RetroBloodTideAnimation {
  static play(color = '#dc143c', intensity = 1) {
    const container = document.body;
    const wave = document.createElement('div');
    wave.style.cssText = `
      position: fixed;
      left: 0;
      right: 0;
      bottom: -100px;
      height: 100px;
      background: ${color};
      border-top: 6px solid #ffffff;
      box-shadow: 0 -4px 0px #bd00ff;
      pointer-events: none;
      z-index: 13500;
      will-change: transform, opacity;
      opacity: 0.85;
    `;
    container.appendChild(wave);

    if (typeof ScreenEffects !== 'undefined' && ScreenEffects.shake) {
      ScreenEffects.shake(15 * intensity, 500);
    }

    const start = performance.now();
    const duration = Math.round(700 * 1.3);

    const animate = () => {
      const progress = Math.min(1, (performance.now() - start) / duration);
      let y = 0;
      let opacity = 0.85;

      if (progress < 0.3) {
        // Wave surges upward
        y = (progress / 0.3) * -220;
      } else if (progress < 0.7) {
        // Hold high and shake
        y = -220 + Math.sin(progress * Math.PI * 10) * 10;
      } else {
        // Wave retreats down
        y = -220 + ((progress - 0.7) / 0.3) * 220;
        opacity = 0.85 * (1 - (progress - 0.7) / 0.3);
      }

      wave.style.transform = `translate3d(0, ${y}px, 0)`;
      wave.style.opacity = opacity;

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        wave.remove();
      }
    };
    requestAnimationFrame(animate);
  }
}

class RetroLavaSpitAnimation {
  static play(cardElement, color = '#ff4500', intensity = 1) {
    let cx = window.innerWidth / 2;
    let cy = window.innerHeight / 2;
    if (cardElement) {
      const rect = cardElement.getBoundingClientRect();
      cx = rect.left + rect.width / 2;
      cy = rect.top + rect.height / 2;
    }
    const container = document.body;

    const ball = document.createElement('div');
    const size = 25 * intensity;
    ball.style.cssText = `
      position: fixed;
      left: ${cx - size / 2}px;
      top: ${cy - size / 2}px;
      width: ${size}px;
      height: ${size}px;
      background: #ffffff;
      border: 4px solid ${color};
      box-shadow: 0 0 0 3px #bd00ff;
      border-radius: 50%;
      pointer-events: none;
      z-index: 13600;
      will-change: transform, opacity;
    `;
    container.appendChild(ball);

    const targetX = window.innerWidth / 2;
    const targetY = window.innerHeight * 0.7; // Target user's area

    const start = performance.now();
    const duration = Math.round(600 * 1.3);

    const animate = () => {
      const progress = Math.min(1, (performance.now() - start) / duration);
      // Quadratic bezier trajectory (arc up)
      const currentX = cx + (targetX - cx) * progress;
      const linearY = cy + (targetY - cy) * progress;
      const arcY = linearY - Math.sin(progress * Math.PI) * 150;

      ball.style.transform = `translate3d(${currentX - cx}px, ${arcY - cy}px, 0) scale(${1 + progress * 0.5})`;

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        ball.remove();
        // Trigger splash burst explosion on impact
        if (typeof RetroOrbBurstAnimation !== 'undefined') {
          RetroOrbBurstAnimation.play(null, color);
        }
        if (typeof ScreenEffects !== 'undefined' && ScreenEffects.shake) {
          ScreenEffects.shake(14 * intensity, 250);
        }
      }
    };
    requestAnimationFrame(animate);
  }
}

class RetroSpectralSwordsAnimation {
  static play(cardElement, color = '#8a2be2', intensity = 1) {
    const container = document.body;
    const count = Math.round(8 * intensity);

    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const sword = document.createElement('div');
        const sizeW = 12;
        const sizeH = 45;
        const left = Math.random() * 80 + 10;
        const startY = -60;

        sword.style.cssText = `
          position: fixed;
          left: ${left}vw;
          top: ${startY}px;
          width: ${sizeW}px;
          height: ${sizeH}px;
          pointer-events: none;
          z-index: 13400;
          will-change: transform, opacity;
          opacity: 0.9;
        `;
        // Blocky pixel-art SVG sword pointing down
        sword.innerHTML = `
          <svg viewBox="0 0 10 30" style="width: 100%; height: 100%;">
            <path d="M4 0h2v18H4zm3 18v2H3v-2zm1 2v2H2v-2zm-3 2h2v4H4z" fill="${color}" stroke="#ffffff" stroke-width="0.8" />
          </svg>
        `;
        container.appendChild(sword);

        const start = performance.now();
        const duration = Math.round(400 * 1.3);
        const targetY = window.innerHeight * 0.7 + Math.random() * 100;

        const animate = () => {
          const progress = Math.min(1, (performance.now() - start) / duration);
          const y = startY + progress * (targetY - startY);
          sword.style.transform = `translate3d(0, ${y}px, 0)`;
          sword.style.opacity = 0.9 * (1 - progress * 0.2);

          if (progress < 1) {
            requestAnimationFrame(animate);
          } else {
            sword.remove();
          }
        };
        requestAnimationFrame(animate);
      }, Math.round(i * 100 * 1.3));
    }
  }
}

class RetroSolarFlareAnimation {
  static play(cardElement, color = '#ffd700', intensity = 1) {
    const container = document.body;
    const sun = document.createElement('div');
    const size = 150 * intensity;
    sun.style.cssText = `
      position: fixed;
      left: 50%;
      top: 50%;
      width: ${size}px;
      height: ${size}px;
      background: #ffffff;
      border: 6px solid ${color};
      box-shadow: 0 0 0 4px #bd00ff;
      border-radius: 50%;
      pointer-events: none;
      z-index: 13550;
      will-change: transform, opacity;
      transform: translate3d(-50%, -50%, 0) scale(0.1);
      opacity: 0;
    `;
    container.appendChild(sun);

    if (typeof ScreenEffects !== 'undefined' && ScreenEffects.shake) {
      ScreenEffects.shake(18 * intensity, 650);
    }

    const start = performance.now();
    const duration = Math.round(650 * 1.3);

    const animate = () => {
      const progress = Math.min(1, (performance.now() - start) / duration);
      let scale = 0.1;
      let opacity = 0;

      if (progress < 0.4) {
        scale = 0.1 + (progress / 0.4) * 1.5;
        opacity = (progress / 0.4) * 0.95;
      } else {
        scale = 1.6 + ((progress - 0.4) / 0.6) * 1.2;
        opacity = 0.95 * (1 - (progress - 0.4) / 0.6);
      }

      sun.style.transform = `translate3d(-50%, -50%, 0) scale(${scale})`;
      sun.style.opacity = opacity;

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        sun.remove();
      }
    };
    requestAnimationFrame(animate);
  }
}

class RetroVoidBlackHoleAnimation {
  static play(cardElement, color = '#4a0e4e', intensity = 1) {
    let cx = window.innerWidth / 2;
    let cy = window.innerHeight / 2;
    if (cardElement) {
      const rect = cardElement.getBoundingClientRect();
      cx = rect.left + rect.width / 2;
      cy = rect.top + rect.height / 2;
    }
    const container = document.body;

    // A swirling black center hole
    const hole = document.createElement('div');
    const size = 120 * intensity;
    hole.style.cssText = `
      position: fixed;
      left: ${cx - size / 2}px;
      top: ${cy - size / 2}px;
      width: ${size}px;
      height: ${size}px;
      background: #000000;
      border: 6px solid ${color};
      box-shadow: 0 0 0 4px #bd00ff;
      border-radius: 50%;
      pointer-events: none;
      z-index: 13700;
      will-change: transform, opacity;
      transform: scale(0.1) rotate(0deg);
      opacity: 0;
    `;
    container.appendChild(hole);

    // Temp scale animation on the boss card itself if present
    const origTransform = cardElement ? cardElement.style.transform : '';
    if (cardElement) {
      cardElement.style.transition = `transform ${Math.round(600 * 1.3)}ms cubic-bezier(0.25, 0.8, 0.25, 1)`;
      cardElement.style.transform = `${origTransform} scale(0.85)`;
    }

    if (typeof ScreenEffects !== 'undefined' && ScreenEffects.shake) {
      ScreenEffects.shake(25 * intensity, 750);
    }

    const start = performance.now();
    const duration = Math.round(800 * 1.3);

    const animate = () => {
      const progress = Math.min(1, (performance.now() - start) / duration);
      let scale = 0.1;
      let opacity = 0;

      if (progress < 0.3) {
        scale = 0.1 + (progress / 0.3) * 0.9;
        opacity = (progress / 0.3);
      } else if (progress < 0.85) {
        scale = 1.0;
        opacity = 1.0;
      } else {
        scale = 1.0 - (progress - 0.85) / 0.15;
        opacity = 1.0 - (progress - 0.85) / 0.15;
      }

      hole.style.transform = `scale(${scale}) rotate(${progress * 720}deg)`;
      hole.style.opacity = opacity;

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        hole.remove();
        if (cardElement) {
          cardElement.style.transform = origTransform;
          cardElement.style.transition = '';
        }
        // Big flash overlay on completion
        if (typeof ScreenEffects !== 'undefined' && ScreenEffects.flash) {
          ScreenEffects.flash('rgba(255, 255, 255, 0.7)', 250);
        }
      }
    };
    requestAnimationFrame(animate);
  }
}

// ============================================================
// WEAPON HIT ANIMATIONS
// One dispatcher class — all animations scoped to enemy card elements only.
// No full-screen overlays. play() is the single entry point.
// ============================================================
class WeaponHitAnimation {

  static _cardCenter(card) {
    if (!card) return { x: window.innerWidth / 2, y: window.innerHeight / 2, w: 80, h: 100, r: { left: window.innerWidth / 2 - 40, top: window.innerHeight / 2 - 50 } };
    const r = card.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height, r };
  }

  static _overlay(card) {
    const c = this._cardCenter(card);
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;left:0;top:0;pointer-events:none;z-index:13100;will-change:transform,opacity;';
    document.body.appendChild(el);
    return { el, c };
  }

  static _raf(duration, onFrame, onDone) {
    const scaledDuration = duration * 1.3;
    const start = performance.now();
    const tick = () => {
      const p = Math.min(1, (performance.now() - start) / scaledDuration);
      onFrame(p);
      if (p < 1) requestAnimationFrame(tick);
      else if (onDone) onDone();
    };
    requestAnimationFrame(tick);
  }

  static _shakeCard(card, intensity, duration) {
    // Animate an overlay div instead of touching card.style.transform,
    // so the game's layout transform is never disturbed.
    if (!card) return;
    const scaledDuration = duration * 1.3;
    const c = this._cardCenter(card);
    const el = document.createElement('div');
    el.style.cssText = `position:fixed;left:${c.r.left}px;top:${c.r.top}px;width:${c.w}px;height:${c.h}px;pointer-events:none;z-index:13099;border-radius:6px;background:transparent;will-change:transform;`;
    document.body.appendChild(el);
    const start = performance.now();
    const tick = () => {
      const p = Math.min(1, (performance.now() - start) / scaledDuration);
      if (p >= 1) { try { el.remove(); } catch (e) { } return; }
      el.style.transform = `translateX(${(Math.random() - 0.5) * intensity * 2 * (1 - p)}px)`;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    // Safety cleanup
    setTimeout(() => { try { el.remove(); } catch (e) { } }, scaledDuration + 120);
  }

  static _squishCard(card, scaleY, duration) {
    // Animate an overlay div that covers the card instead of touching
    // card.style.transform — prevents permanent size mutation on the card.
    if (!card) return;
    const scaledDuration = duration * 1.3;
    const c = this._cardCenter(card);
    const el = document.createElement('div');
    el.style.cssText = `position:fixed;left:${c.r.left}px;top:${c.r.top}px;width:${c.w}px;height:${c.h}px;pointer-events:none;z-index:13099;border-radius:6px;background:rgba(0,0,0,0.08);transform-origin:center center;will-change:transform;`;
    document.body.appendChild(el);
    const inDur = Math.round(scaledDuration * 0.28);
    const outDur = scaledDuration - inDur;
    // Phase 1: squish
    el.style.transition = `transform ${inDur}ms cubic-bezier(0.25,0,0,1)`;
    requestAnimationFrame(() => { el.style.transform = `scaleY(${scaleY})`; });
    const t1 = setTimeout(() => {
      // Phase 2: spring back
      el.style.transition = `transform ${outDur}ms cubic-bezier(0.2,1.6,0.4,1)`;
      el.style.transform = 'scaleY(1)';
      const t2 = setTimeout(() => { try { el.remove(); } catch (e) { } }, outDur + 60);
      el._t2 = t2;
    }, inDur + 12);
    el._t1 = t1;
    // Safety: always remove after full duration
    setTimeout(() => { try { el.remove(); } catch (e) { } }, scaledDuration + 300);
  }

  static _tintCard(card, color, duration) {
    // Use a fixed overlay instead of touching card.style.background.
    if (!card) return;
    const scaledDuration = duration * 1.3;
    const c = this._cardCenter(card);
    const el = document.createElement('div');
    el.style.cssText = `position:fixed;left:${c.r.left}px;top:${c.r.top}px;width:${c.w}px;height:${c.h}px;pointer-events:none;z-index:13098;border-radius:6px;background:${color};will-change:opacity;`;
    document.body.appendChild(el);
    // Fade in quickly, then fade out
    el.style.opacity = '0';
    requestAnimationFrame(() => {
      el.style.transition = `opacity ${Math.round(scaledDuration * 0.15)}ms ease-out`;
      el.style.opacity = '1';
      setTimeout(() => {
        el.style.transition = `opacity ${Math.round(scaledDuration * 0.6)}ms ease-in`;
        el.style.opacity = '0';
        setTimeout(() => { try { el.remove(); } catch (e) { } }, Math.round(scaledDuration * 0.6) + 50);
      }, Math.round(scaledDuration * 0.35));
    });
    // Safety cleanup
    setTimeout(() => { try { el.remove(); } catch (e) { } }, scaledDuration + 200);
  }


  static _cardParticles(card, count, color, speed, size, lifetime) {
    if (!card) return;
    const c = this._cardCenter(card);
    const sys = new ParticleSystem({ container: document.body });
    const n = Math.max(2, Math.round(count * (typeof AnimationRuntime !== 'undefined' ? AnimationRuntime.particleScale : 1)));
    for (let i = 0; i < n; i++) {
      sys.emit(c.x + (Math.random() - 0.5) * c.w * 0.8, c.y + (Math.random() - 0.5) * c.h * 0.8, 1,
        { color, lifetime, velocity: speed, spread: Math.PI * 2, size });
    }
  }

  static play(weaponName, card, opts = {}) {
    try {
      switch (weaponName) {
        case 'Rusty Sword': this._rustBurst(card, opts); break;
        case 'Great Hammer': this._gravityCrush(card, opts); break;
        case 'Dagger': this._rapidJabFlash(card, opts); break;
        case 'Bomb': this._smokeCloud(card, opts); break;
        case 'Buckler': this._shieldRing(card, opts); break;
        case 'Grimoire': this._arcaneRuneBurst(card, opts); break;
        case 'Vampire Dagger': this._bloodVeinCrack(card, opts); break;
        case 'Bazooka': this._explosionBloom(card, opts); break;
        case 'Uzi': this._bulletHail(card, opts); break;
        case 'Thunder Hammer': this._lightningStrike(card, opts); break;
        case 'Lazer': this._beamPierce(card, opts); break;
        case 'Vine Spell': this._vineWrap(card, opts); break;
        case 'Death Spell': this._reaperArc(card, opts); break;
        case 'Heavy Hammer': this._anvilDrop(card, opts); break;
        case 'Echo Bow': this._arrowTrail(card, opts); break;
        case 'Aegis': this._aegisWard(card, opts); break;
        default: break;
      }
    } catch (e) { console.warn('[WeaponHitAnimation]', e); }
  }

  static _rustBurst(card) {
    if (!card) return;
    const isLow = typeof AnimationRuntime !== 'undefined' && AnimationRuntime.lowPower;
    const sf = isLow ? 0.5 : 1.0;

    this._tintCard(card, 'rgba(180, 110, 50, 0.6)', 220);
    this._shakeCard(card, 12 * sf, 350);

    const c = this._cardCenter(card);
    const sys = new ParticleSystem({ container: document.body });
    const cols = ['#b8860b', '#8b6914', '#c8a04a', '#e0c060'];
    const n = Math.max(4, Math.round((isLow ? 10 : 24) * (typeof AnimationRuntime !== 'undefined' ? AnimationRuntime.particleScale : 1)));

    for (let i = 0; i < n; i++) {
      sys.emit(
        c.x + (Math.random() - 0.5) * c.w * 0.8,
        c.y + (Math.random() - 0.5) * c.h * 0.7,
        1,
        {
          color: cols[i % 4],
          lifetime: 550,
          velocity: 5.0 * sf,
          spread: Math.PI * 2,
          size: 6 * sf
        }
      );
    }

    const { el } = this._overlay(card);
    el.style.cssText += `width:${c.w}px;height:${c.h}px;left:${c.r.left}px;top:${c.r.top}px;border-radius:6px;border:5px solid #b8860b;background:transparent;box-shadow: 0 0 0 4px #bd00ff;`;
    this._raf(350, p => {
      el.style.opacity = 1 - p;
      el.style.transform = `scale(${1.0 + (1 - p) * 0.08})`;
    }, () => el.remove());
  }

  static _gravityCrush(card) {
    if (!card) return;
    const isLow = typeof AnimationRuntime !== 'undefined' && AnimationRuntime.lowPower;
    const sf = isLow ? 0.5 : 1.0;

    this._squishCard(card, isLow ? 0.58 : 0.45, 400);
    this._tintCard(card, 'rgba(59, 7, 100, 0.6)', 300);
    this._shakeCard(card, 15 * sf, 400);

    const c = this._cardCenter(card);
    if (!isLow) {
      // Expanding gravitational rings
      const { el: ring } = this._overlay(card);
      const ringSize = Math.max(c.w, c.h) * 1.5;
      ring.style.cssText += `width:${ringSize}px;height:${ringSize}px;left:${c.x - ringSize / 2}px;top:${c.y - ringSize / 2}px;border-radius:50%;border:6px solid #8b5cf6;box-shadow:0 0 0 4px #bd00ff;background:transparent;`;
      this._raf(400, p => {
        ring.style.transform = `scale(${0.3 + p * 1.1})`;
        ring.style.opacity = 1 - p;
      }, () => ring.remove());

      // Dark falling particles
      const sys = new ParticleSystem({ container: document.body });
      for (let i = 0; i < 8; i++) {
        sys.emit(
          c.x + (Math.random() - 0.5) * c.w,
          c.y - c.h / 2,
          1,
          {
            color: '#3b0764',
            lifetime: 400,
            velocity: 4,
            spread: Math.PI / 4,
            size: 6
          }
        );
      }
    }
  }

  static _rapidJabFlash(card) {
    if (!card) return;
    const isLow = typeof AnimationRuntime !== 'undefined' && AnimationRuntime.lowPower;
    const sf = isLow ? 0.5 : 1.0;
    const c = this._cardCenter(card);

    const flashDur = Math.round(65 * 1.3);
    const intervals = isLow ? [0, Math.round(80 * 1.3), Math.round(160 * 1.3)] : [0, Math.round(60 * 1.3), Math.round(120 * 1.3), Math.round(180 * 1.3)];
    intervals.forEach(d => {
      setTimeout(() => {
        this._tintCard(card, 'rgba(255, 255, 255, 0.85)', 65);
        if (!isLow) {
          // Add diagonal slash slits
          const { el } = this._overlay(card);
          const deg = (Math.random() > 0.5 ? 45 : -45) + (Math.random() - 0.5) * 15;
          el.style.cssText += `width:${c.w * 1.4}px;height:6px;left:${c.x - c.w * 0.7}px;top:${c.y + (Math.random() - 0.5) * c.h * 0.5}px;background:#fff;border: 1.5px solid #bd00ff;transform:rotate(${deg}deg);`;
          this._raf(65, p => { el.style.opacity = 1 - p; }, () => el.remove());
        }
      }, d);
    });
    this._shakeCard(card, 8 * sf, 300);
  }

  static _smokeCloud(card, { allCards = [] } = {}) {
    const isLow = typeof AnimationRuntime !== 'undefined' && AnimationRuntime.lowPower;
    const sf = isLow ? 0.5 : 1.0;
    const targets = allCards.length ? allCards : (card ? [card] : []);

    targets.forEach(tgt => {
      if (!tgt) return;
      const c = this._cardCenter(tgt);
      const { el } = this._overlay(tgt);
      const size = Math.max(c.w, c.h) * (isLow ? 1.4 : 1.9);
      el.style.cssText += `width:${size}px;height:${size}px;left:${c.x - size / 2}px;top:${c.y - size / 2}px;border-radius:50%;background:#f97316;border:6px solid #505050;box-shadow: 0 0 0 4px #bd00ff;`;

      this._raf(500, p => {
        el.style.transform = `scale(${0.2 + p * 0.95})`;
        el.style.opacity = p < 0.35 ? p / 0.35 : 1 - (p - 0.35) / 0.65;
      }, () => el.remove());

      this._shakeCard(tgt, 10 * sf, 350);

      if (!isLow) {
        // Emit embers
        const sys = new ParticleSystem({ container: document.body });
        for (let i = 0; i < 12; i++) {
          sys.emit(
            c.x + (Math.random() - 0.5) * c.w * 0.4,
            c.y + (Math.random() - 0.5) * c.h * 0.4,
            1,
            {
              color: Math.random() > 0.5 ? '#f97316' : '#ef4444',
              lifetime: 450,
              velocity: 4,
              spread: Math.PI * 2,
              size: 5
            }
          );
        }
      }
    });
  }

  static _shieldRing(card) {
    if (!card) return;
    const isLow = typeof AnimationRuntime !== 'undefined' && AnimationRuntime.lowPower;
    const sf = isLow ? 0.5 : 1.0;
    const c = this._cardCenter(card);
    const { el } = this._overlay(card);
    const size = Math.max(c.w, c.h) * (isLow ? 1.4 : 2.0);

    el.style.cssText += `width:${size}px;height:${size}px;left:${c.x - size / 2}px;top:${c.y - size / 2}px;border-radius:50%;border:6px solid rgba(255, 215, 0, 0.95);background:transparent;box-shadow:0 0 0 4px #bd00ff;`;

    this._raf(500, p => {
      el.style.transform = `scale(${0.4 + p * 0.8})`;
      el.style.opacity = 1 - p;
    }, () => el.remove());

    this._tintCard(card, 'rgba(255, 215, 0, 0.45)', 300);

    if (!isLow) {
      // Golden star particles
      const sys = new ParticleSystem({ container: document.body });
      for (let i = 0; i < 10; i++) {
        sys.emit(c.x, c.y, 1, {
          color: '#ffd700',
          lifetime: 500,
          velocity: 3.5,
          spread: Math.PI * 2,
          size: 5
        });
      }
    }
  }

  static _arcaneRuneBurst(card) {
    if (!card) return;
    const isLow = typeof AnimationRuntime !== 'undefined' && AnimationRuntime.lowPower;
    const sf = isLow ? 0.5 : 1.0;
    const c = this._cardCenter(card);

    const runes = isLow ? ['✦', '✧', '⊕', '⊗'] : ['☯', '卍', '☽', '☼', '✦', '✧', '⊕', '⊗'];
    runes.forEach((r, i) => {
      const el = document.createElement('div');
      const angle = (i / runes.length) * Math.PI * 2;
      el.textContent = r;
      el.style.cssText = `position:fixed;pointer-events:none;z-index:13110;left:${c.x}px;top:${c.y}px;font-size:${isLow ? '18px' : '30px'};color:#c084fc;text-shadow:-2px -2px 0 #bd00ff, 2px -2px 0 #bd00ff, -2px 2px 0 #bd00ff, 2px 2px 0 #bd00ff, 0 0 0 3px #ffffff;will-change:transform,opacity;transform:translate(-50%,-50%);`;
      document.body.appendChild(el);

      const dist = isLow ? 44 : 90;
      this._raf(500, p => {
        const d = p * dist;
        el.style.transform = `translate(calc(-50% + ${Math.cos(angle) * d}px),calc(-50% + ${Math.sin(angle) * d}px)) scale(${1 - p * 0.4}) rotate(${p * 270}deg)`;
        el.style.opacity = 1 - Math.pow(p, 2.0);
      }, () => el.remove());
    });

    this._tintCard(card, 'rgba(192, 132, 252, 0.55)', 250);
  }

  static _bloodVeinCrack(card) {
    if (!card) return;
    const isLow = typeof AnimationRuntime !== 'undefined' && AnimationRuntime.lowPower;
    const sf = isLow ? 0.5 : 1.0;
    const c = this._cardCenter(card);
    const { el } = this._overlay(card);

    el.style.cssText += `width:${c.w}px;height:${c.h}px;left:${c.r.left}px;top:${c.r.top}px;border-radius:6px;background:transparent;box-shadow:inset 0 0 0 4px rgba(220,20,60,0.95);border:4px solid #bd00ff;`;
    this._raf(550, p => {
      el.style.opacity = p < 0.2 ? p / 0.2 : 1 - (p - 0.2) / 0.8;
      el.style.transform = `scale(${1.0 + Math.sin(p * Math.PI) * 0.05})`;
    }, () => el.remove());

    const sys = new ParticleSystem({ container: document.body });
    const n = Math.max(4, Math.round((isLow ? 8 : 18) * (typeof AnimationRuntime !== 'undefined' ? AnimationRuntime.particleScale : 1)));
    for (let i = 0; i < n; i++) {
      setTimeout(() => {
        sys.emit(
          c.x + (Math.random() - 0.5) * c.w * 0.7,
          c.y + (Math.random() - 0.5) * c.h * 0.5,
          1,
          {
            color: '#c00028',
            lifetime: 550,
            velocity: 4.0 * sf,
            spread: Math.PI * 1.5,
            size: 6 * sf
          }
        );
      }, Math.round(i * (isLow ? 30 : 18) * 1.3));
    }

    this._tintCard(card, 'rgba(200, 0, 40, 0.5)', 250);
    this._shakeCard(card, 8 * sf, 260);
  }

  static _explosionBloom(card, { allCards = [] } = {}) {
    const isLow = typeof AnimationRuntime !== 'undefined' && AnimationRuntime.lowPower;
    const sf = isLow ? 0.5 : 1.0;
    const targets = allCards.length ? allCards : (card ? [card] : []);

    if (typeof ScreenEffects !== 'undefined' && ScreenEffects.flash) {
      ScreenEffects.flash('rgba(255, 120, 0, 0.25)', 200);
    }

    targets.forEach((tgt, idx) => {
      if (!tgt) return;
      const isPrimary = idx === 0;
      const c = this._cardCenter(tgt);
      const { el } = this._overlay(tgt);
      const scaleMultiplier = isPrimary ? (isLow ? 1.6 : 2.2) : (isLow ? 1.1 : 1.6);
      const size = scaleMultiplier * Math.max(c.w, c.h);

      el.style.cssText += `width:${size}px;height:${size}px;left:${c.x - size / 2}px;top:${c.y - size / 2}px;border-radius:50%;background:#ff7800;border:6px solid #ffffff;box-shadow:0 0 0 4px #bd00ff;`;

      const dur = isPrimary ? 550 : 380;
      this._raf(dur, p => {
        el.style.transform = `scale(${0.1 + p})`;
        el.style.opacity = p < 0.25 ? p / 0.25 : 1 - (p - 0.25) / 0.75;
      }, () => el.remove());

      this._shakeCard(tgt, isPrimary ? 16 * sf : 10 * sf, 300);
      this._cardParticles(tgt, isPrimary ? (isLow ? 10 : 24) : (isLow ? 5 : 12), '#ff8800', 8 * sf, 6 * sf, 450);
    });
  }

  static _bulletHail(card, { fireRate = 6 } = {}) {
    if (!card) return;
    const isLow = typeof AnimationRuntime !== 'undefined' && AnimationRuntime.lowPower;
    const sf = isLow ? 0.5 : 1.0;
    const c = this._cardCenter(card);
    const count = isLow ? Math.min(fireRate, 7) : Math.min(fireRate * 2, 14);

    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const el = document.createElement('div');
        const sz = isLow ? (6 + Math.random() * 6) : (10 + Math.random() * 8);
        const offsetX = (Math.random() - 0.5) * c.w * 0.8;
        const offsetY = (Math.random() - 0.5) * c.h * 0.8;

        el.style.cssText = `position:fixed;pointer-events:none;z-index:13110;left:${c.x + offsetX - sz / 2}px;top:${c.y + offsetY - sz / 2}px;width:${sz}px;height:${sz}px;border-radius:50%;background:#fff5b4;border:2px solid #bd00ff;will-change:opacity,transform;`;
        document.body.appendChild(el);

        this._raf(120, p => {
          el.style.transform = `scale(${1 + p * 0.4})`;
          el.style.opacity = 1 - p;
        }, () => el.remove());
      }, Math.round(i * (isLow ? 45 : 28) * 1.3));
    }
    this._shakeCard(card, 6 * sf, 350);
  }

  static _lightningStrike(card, { isCrit = false } = {}) {
    if (!card) return;
    const isLow = typeof AnimationRuntime !== 'undefined' && AnimationRuntime.lowPower;
    const sf = isLow ? 0.5 : 1.0;
    const c = this._cardCenter(card);
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    const bH = c.h * 1.6, bW = 60;

    svg.setAttribute('width', String(bW));
    svg.setAttribute('height', String(bH));
    svg.style.cssText = `position:fixed;pointer-events:none;z-index:13110;left:${c.x - bW / 2}px;top:${c.y - bH}px;overflow:visible;`;

    let d = `M${bW / 2},0`;
    const segments = 6;
    for (let s = 1; s <= segments; s++) {
      d += ` L${bW / 2 + (s % 2 === 0 ? -18 : 18) * (isCrit ? 1.5 : 1.1)},${(s / segments) * bH}`;
    }

    const outlinePath = document.createElementNS(NS, 'path');
    outlinePath.setAttribute('d', d);
    outlinePath.setAttribute('stroke', '#bd00ff');
    outlinePath.setAttribute('stroke-width', isCrit ? (isLow ? '12' : '18') : (isLow ? '8' : '12'));
    outlinePath.setAttribute('fill', 'none');

    const path = document.createElementNS(NS, 'path');
    path.setAttribute('d', d);
    path.setAttribute('stroke', isCrit ? '#fffbeb' : '#facc15');
    path.setAttribute('stroke-width', isCrit ? (isLow ? '6' : '9') : (isLow ? '4' : '6'));
    path.setAttribute('fill', 'none');

    svg.appendChild(outlinePath);
    svg.appendChild(path);
    document.body.appendChild(svg);

    this._raf(350, p => {
      svg.style.opacity = 1 - Math.pow(p, 1.8);
      svg.style.transform = `scaleX(${1.0 + (1 - p) * 0.3})`;
    }, () => svg.remove());

    this._tintCard(card, 'rgba(250, 204, 21, 0.75)', 180);
    this._shakeCard(card, isCrit ? 18 * sf : 12 * sf, 300);

    if (isCrit || !isLow) {
      const count = isCrit ? 18 : 8;
      this._cardParticles(card, count, Math.random() > 0.5 ? '#facc15' : '#00e5ff', 6 * sf, 5 * sf, 400);
    }
  }

  static _beamPierce(card, { secondaryCard = null } = {}) {
    if (!card) return;
    const isLow = typeof AnimationRuntime !== 'undefined' && AnimationRuntime.lowPower;
    const sf = isLow ? 0.5 : 1.0;
    const c = this._cardCenter(card);
    const { el } = this._overlay(card);
    const beamHeight = isLow ? 8 : 16;

    el.style.cssText += `left:${c.r.left}px;top:${c.y - beamHeight / 2}px;width:${c.w}px;height:${beamHeight}px;background:#60a5fa;border-top:3px solid #ffffff;border-bottom:3px solid #ffffff;box-shadow: 0 3px 0 #3b82f6, 0 -3px 0 #3b82f6;border-radius:4px;`;

    this._raf(300, p => {
      el.style.transform = `scaleY(${p < 0.2 ? p / 0.2 : 1 - (p - 0.2) / 0.8})`;
      el.style.opacity = p < 0.15 ? p / 0.15 : 1 - (p - 0.15) / 0.85;
    }, () => el.remove());

    this._tintCard(card, 'rgba(78, 163, 255, 0.65)', 200);
    this._shakeCard(card, 6 * sf, 200);

    if (secondaryCard && secondaryCard !== card) {
      const cs = this._cardCenter(secondaryCard);
      const NS = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(NS, 'svg');
      const minX = Math.min(c.x, cs.x) - 40, minY = Math.min(c.y, cs.y) - 60;
      const maxX = Math.max(c.x, cs.x) + 40, maxY = Math.max(c.y, cs.y) + 40;

      svg.style.cssText = `position:fixed;pointer-events:none;z-index:13105;left:${minX}px;top:${minY}px;width:${maxX - minX}px;height:${maxY - minY}px;overflow:visible;`;
      const mx = (c.x + cs.x) / 2 - minX, my = Math.min(c.y, cs.y) - 60 - minY;

      const mkL = (xa, ya, xb, yb, col) => {
        const g = document.createElementNS(NS, 'g');
        const outL = document.createElementNS(NS, 'path');
        outL.setAttribute('d', `M${xa},${ya} Q${mx},${my} ${xb},${yb}`);
        outL.setAttribute('stroke', '#bd00ff');
        outL.setAttribute('stroke-width', isLow ? '7' : '12');
        outL.setAttribute('fill', 'none');
        g.appendChild(outL);

        const l = document.createElementNS(NS, 'path');
        l.setAttribute('d', `M${xa},${ya} Q${mx},${my} ${xb},${yb}`);
        l.setAttribute('stroke', col);
        l.setAttribute('stroke-width', isLow ? '3' : '6');
        l.setAttribute('fill', 'none');
        g.appendChild(l);
        return g;
      };

      svg.appendChild(mkL(c.x - minX, c.y - minY, cs.x - minX, cs.y - minY, '#60a5fa'));

      document.body.appendChild(svg);

      this._raf(500, p => {
        svg.style.opacity = 1 - p;
      }, () => svg.remove());

      setTimeout(() => {
        this._tintCard(secondaryCard, 'rgba(78, 163, 255, 0.7)', 220);
        this._shakeCard(secondaryCard, 8 * sf, 200);
      }, 130);
    }
  }

  static _vineWrap(card) {
    if (!card) return;
    const isLow = typeof AnimationRuntime !== 'undefined' && AnimationRuntime.lowPower;
    const sf = isLow ? 0.5 : 1.0;
    const c = this._cardCenter(card);
    const { el } = this._overlay(card);
    const borderWidth = isLow ? 4 : 8;

    el.style.cssText += `width:${c.w + 10}px;height:${c.h + 10}px;left:${c.r.left - 5}px;top:${c.r.top - 5}px;border-radius:10px;border:${borderWidth}px solid rgba(34, 197, 94, 0.95);background:transparent;box-shadow:0 0 0 4px #bd00ff;`;

    this._raf(650, p => {
      const scaleVal = p < 0.15 ? 0.8 + (p / 0.15) * 0.2 : p < 0.75 ? (1.0 - (p - 0.15) / 0.6 * 0.12) : 0.88;
      el.style.transform = `scale(${scaleVal})`;
      el.style.opacity = p < 0.15 ? p / 0.15 : p < 0.75 ? 1.0 : 1 - (p - 0.75) / 0.25;
    }, () => el.remove());

    const count = isLow ? 6 : 15;
    this._cardParticles(card, count, '#22c55e', 3 * sf, 5 * sf, 500);
    this._tintCard(card, 'rgba(34, 197, 94, 0.35)', 400);
  }

  static _reaperArc(card, { isResisted = false } = {}) {
    if (!card) return;
    const isLow = typeof AnimationRuntime !== 'undefined' && AnimationRuntime.lowPower;
    const sf = isLow ? 0.5 : 1.0;
    const c = this._cardCenter(card);
    const el = document.createElement('div');
    const sz = Math.max(c.w, c.h) * (isLow ? 1.0 : 1.8);

    el.textContent = '☽';
    el.style.cssText = `position:fixed;pointer-events:none;z-index:13120;left:${c.x}px;top:${c.y}px;font-size:${sz}px;line-height:1;color:${isResisted ? '#ef4444' : '#31105e'};text-shadow:-3px -3px 0 #bd00ff, 3px -3px 0 #bd00ff, -3px 3px 0 #bd00ff, 3px 3px 0 #bd00ff, 0 0 0 4px #ffffff;will-change:transform,opacity;transform:translate(-50%,-50%) rotate(-80deg) scale(0.3);`;
    document.body.appendChild(el);

    this._raf(600, p => {
      el.style.transform = `translate(-50%,-50%) rotate(${-80 + p * 240}deg) scale(${p < 0.35 ? 0.3 + (p / 0.35) * 0.7 : 1.0 - (p - 0.35) / 0.65 * 0.6})`;
      el.style.opacity = p < 0.2 ? p / 0.2 : 1 - (p - 0.2) / 0.8;
    }, () => el.remove());

    this._tintCard(card, isResisted ? 'rgba(239, 68, 68, 0.45)' : 'rgba(30, 0, 60, 0.75)', 400);
    this._shakeCard(card, isResisted ? 14 * sf : 8 * sf, 350);

    if (!isLow) {
      const sys = new ParticleSystem({ container: document.body });
      for (let i = 0; i < 15; i++) {
        sys.emit(c.x + (Math.random() - 0.5) * c.w, c.y + c.h / 2, 1, {
          color: isResisted ? '#ef4444' : '#a78bfa',
          lifetime: 600,
          velocity: -4,
          spread: Math.PI / 6,
          size: 6
        });
      }
    }
  }

  static _anvilDrop(card, { isCrit = false } = {}) {
    if (!card) return;
    const isLow = typeof AnimationRuntime !== 'undefined' && AnimationRuntime.lowPower;
    const sf = isLow ? 0.5 : 1.0;
    const c = this._cardCenter(card);

    this._squishCard(card, isLow ? 0.55 : 0.42, 400);
    this._tintCard(card, isCrit ? 'rgba(255, 140, 0, 0.55)' : 'rgba(80, 80, 80, 0.65)', 250);
    this._shakeCard(card, isCrit ? 18 * sf : 12 * sf, 350);

    const anvil = document.createElement('div');
    anvil.innerHTML = `<span style="font-size:${isLow ? '36px' : '64px'};text-shadow:0 0 10px rgba(0,0,0,0.8);filter:brightness(0.9);">█▄▄▄▄█</span>`;
    anvil.style.cssText = `position:fixed;pointer-events:none;z-index:13125;left:${c.x}px;top:${c.y - 200}px;will-change:transform,opacity;transform:translate(-50%,-50%);font-family:monospace;color:#6b7280;`;
    document.body.appendChild(anvil);

    const fallDuration = 200;
    this._raf(fallDuration, p => {
      const y = (c.y - 200) + p * 200;
      anvil.style.top = `${y}px`;
      anvil.style.opacity = p < 0.15 ? p / 0.15 : 1.0;
    }, () => {
      anvil.style.transition = `opacity ${Math.round(150 * 1.3)}ms ease-out`;
      anvil.style.opacity = '0';
      setTimeout(() => anvil.remove(), Math.round(150 * 1.3));

      const particleCount = isCrit ? 18 : 8;
      const col = isCrit ? '#ff8800' : '#d1d5db';
      this._cardParticles(card, particleCount, col, 7 * sf, 6 * sf, 450);
    });
  }

  static _arrowTrail(card, { echoBowHitIndex = 0 } = {}) {
    if (!card) return;
    const isLow = typeof AnimationRuntime !== 'undefined' && AnimationRuntime.lowPower;
    const sf = isLow ? 0.5 : 1.0;
    const isDouble = echoBowHitIndex > 0 && (echoBowHitIndex % 3 === 0);
    const c = this._cardCenter(card);
    const tw = c.w * (isDouble ? 1.35 : 0.85);
    const col = isDouble ? '#d946ef' : '#c4b5fd';

    const lineCount = isDouble ? 3 : 1;
    for (let i = 0; i < lineCount; i++) {
      const { el } = this._overlay(card);
      const yOffset = isDouble ? (i - 1) * 12 : 0;
      el.style.cssText += `left:${c.x - tw / 2}px;top:${c.y + yOffset - (isDouble ? 3 : 1.5)}px;width:${tw}px;height:${isDouble ? '6px' : '3px'};border-radius:3px;background:${col};border-top:1px solid #ffffff;border-bottom:1px solid #ffffff;box-shadow: 0 2px 0 #bd00ff;`;
      this._raf(isDouble ? 450 : 280, p => {
        el.style.opacity = p < 0.1 ? p / 0.1 : 1 - (p - 0.1) / 0.9;
        el.style.transform = `scaleX(${1.0 + p * 0.2})`;
      }, () => el.remove());
    }

    const arrow = document.createElement('div');
    arrow.innerHTML = `<span style="font-size:${isDouble ? '28px' : '18px'};color:${col};text-shadow:-1.5px -1.5px 0 #bd00ff, 1.5px -1.5px 0 #bd00ff, -1.5px 1.5px 0 #bd00ff, 1.5px 1.5px 0 #bd00ff;">➤</span>`;
    arrow.style.cssText = `position:fixed;pointer-events:none;z-index:13125;left:${c.x - tw / 2}px;top:${c.y}px;transform:translate(-50%,-50%);will-change:transform;`;
    document.body.appendChild(arrow);
    this._raf(isDouble ? 350 : 220, p => {
      arrow.style.left = `${c.x - tw / 2 + p * tw}px`;
      arrow.style.opacity = 1 - p;
    }, () => arrow.remove());

    if (isDouble) {
      this._tintCard(card, 'rgba(200, 100, 255, 0.45)', 250);
      const count = isLow ? 6 : 15;
      this._cardParticles(card, count, '#d946ef', 4 * sf, 5 * sf, 350);
    }
    this._shakeCard(card, isDouble ? 8 * sf : 4 * sf, 220);
  }

  static _aegisWard(card) {
    if (!card) return;
    const isLow = typeof AnimationRuntime !== 'undefined' && AnimationRuntime.lowPower;
    const sf = isLow ? 0.5 : 1.0;
    const c = this._cardCenter(card);

    const stamp = document.createElement('div');
    stamp.textContent = '🛡';
    stamp.style.cssText = `position:fixed;pointer-events:none;z-index:13115;left:${c.x}px;top:${c.y}px;font-size:${Math.min(c.w, c.h) * (isLow ? 0.8 : 1.4)}px;line-height:1;filter:drop-shadow(3px 3px 0px #bd00ff) drop-shadow(-3px -3px 0px #bd00ff);will-change:transform,opacity;transform:translate(-50%,-50%) scale(0.1);`;
    document.body.appendChild(stamp);

    this._raf(650, p => {
      stamp.style.transform = `translate(-50%,-50%) scale(${p < 0.3 ? 0.1 + (p / 0.3) * 0.9 : 1.0}) rotate(${(1 - p) * 15}deg)`;
      stamp.style.opacity = p < 0.25 ? p / 0.25 : p < 0.65 ? 1.0 : 1 - (p - 0.65) / 0.35;
    }, () => stamp.remove());

    const { el: outline } = this._overlay(card);
    const crestBorder = isLow ? 4 : 8;
    outline.style.cssText += `width:${c.w + 12}px;height:${c.h + 12}px;left:${c.r.left - 6}px;top:${c.r.top - 6}px;border-radius:10px;border:${crestBorder}px solid rgba(96,165,250,0.95);background:transparent;box-shadow:0 0 0 4px #bd00ff;`;
    this._raf(750, p => {
      outline.style.opacity = p < 0.15 ? p / 0.15 : 1 - (p - 0.15) / 0.85;
      outline.style.transform = `scale(${1.0 + (1 - p) * 0.05})`;
    }, () => outline.remove());

    if (!isLow) {
      const { el: grid } = this._overlay(card);
      grid.style.cssText += `width:${c.w}px;height:${c.h}px;left:${c.r.left}px;top:${c.r.top}px;border-radius:6px;background:rgba(96, 165, 250, 0.15);border: 2px dashed rgba(96, 165, 250, 0.8);`;
      this._raf(700, p => {
        grid.style.opacity = p < 0.2 ? p / 0.2 : 1 - (p - 0.2) / 0.8;
      }, () => grid.remove());
    }

    this._tintCard(card, 'rgba(96, 165, 250, 0.45)', 300);
  }
}




