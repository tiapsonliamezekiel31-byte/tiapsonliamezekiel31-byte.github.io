/**
 * NEMESIS ROGUELIKE — ANIMATION SYSTEM
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
    flashMinInterval: lowPower ? 110 : 70,
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
  const hueShift = slotIndex * 10; // 10° per stacked slot
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
  
  emit(x, y, count = 10, options = {}) {
    const {
      color = (typeof UIManager !== 'undefined') ? UIManager.themeColor('--text-white', '#ffffff') : '#fff',
      velocity = 5,
      lifetime = 1000,
      spread = Math.PI * 2,
      size = 4
    } = options;
    
    const scaledCount = Math.max(1, Math.min(AnimationRuntime.maxBurstParticles, Math.round(count * AnimationRuntime.particleScale)));

    for (let i = 0; i < scaledCount; i++) {
      const angle = Math.random() * spread;
      const speed = velocity * (0.8 + Math.random() * 0.4);
      
      const particle = document.createElement('div');
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
      const startTime = Date.now();
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = elapsed / lifetime;
        
        if (progress >= 1) {
          particle.remove();
          return;
        }
        
        const px = x + (vx * elapsed / 16);
        const py = y + (vy * elapsed / 16);
        particle.style.transform = `translate3d(${px}px, ${py}px, 0)`;
        particle.style.opacity = 1 - progress;
        
        requestAnimationFrame(animate);
      };
      
      animate();
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

    const clampX = () => {
      const rect = div.getBoundingClientRect();
      const minX = rect.width / 2 + 8;
      const maxX = window.innerWidth - rect.width / 2 - 8;
      return Math.min(Math.max(x + xOffset, minX), Math.max(minX, maxX));
    };

    // Manage stacking by rounded coordinates unless a stackKey is provided
    const key = stackKey || `coord:${Math.round(x)}_${Math.round(y)}`;
    if (!FloatingDamageNumber._coordActiveByKey) FloatingDamageNumber._coordActiveByKey = {};
    if (!FloatingDamageNumber._coordActiveByKey[key]) FloatingDamageNumber._coordActiveByKey[key] = [];
    FloatingDamageNumber._coordActiveByKey[key].push(div);

    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const visibleDuration = Math.max(1, effectiveDuration - effectiveFadeDelay);
      const progress = elapsed / effectiveDuration;

      if (progress >= 1) {
        try { div.remove(); } catch (e) {}
        // remove from stack map
        const arr = FloatingDamageNumber._coordActiveByKey[key];
        if (arr) {
          const idx = arr.indexOf(div);
          if (idx !== -1) arr.splice(idx, 1);
          if (arr.length === 0) delete FloatingDamageNumber._coordActiveByKey[key];
        }
        return;
      }

      const slotIndex = (FloatingDamageNumber._coordActiveByKey[key] || []).indexOf(div) || 0;

      // Apply slight hue shift and darken for stacked coordinate floats as well
      try {
        const base = color || div.style.color || '#ffffff';
        const v = variantForStack(base, slotIndex);
        div.style.color = v;
        div.style.webkitTextStroke = `0.5px ${v}`;
      } catch (e) {}

      const yOffset = progress * -50;
      const fadeRaw = elapsed <= effectiveFadeDelay ? 0 : Math.min(1, (elapsed - effectiveFadeDelay) / visibleDuration);
      // Eased fade: keep opacity high until near the end, then fade quickly
      const easedFade = Math.pow(fadeRaw, 2.6);
      const opacity = 1 - easedFade;
      const scaleValue = 1 + progress * 0.3;

      // Smooth wobble: sinusoidal decreasing amplitude to avoid rapid random shaking
      const wobbleAmplitude = isCrit ? 6 : 3; // degrees
      const wobble = Math.sin(progress * Math.PI * 2) * wobbleAmplitude * (1 - progress);

      div.style.transform = `translate3d(${clampX()}px, ${y + yOffset}px, 0) translateX(-50%) rotate(${baseRotation + wobble}deg) scale(${scaleValue})`;
      div.style.opacity = opacity;

      requestAnimationFrame(animate);
    };

    animate();
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

  const floatObj = {
    div,
    anchorRectFn,
    anchorKey: anchorKey ? String(anchorKey) : null,
    createdAt: Date.now(),
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
  const now = Date.now();
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
      const rectDiv = f.div.getBoundingClientRect();
      const minX = rectDiv.width / 2 + 8;
      const maxX = window.innerWidth - rectDiv.width / 2 - 8;
      return Math.min(Math.max(baseX, minX), Math.max(minX, maxX));
    })();

    const yPos = baseY - f.offsetY - (slotIndex * f.gap);
    const scaleValue = 1 + Math.max(0, Math.min(1, progress)) * 0.3;
    const wobbleAmplitude = f.isCrit ? 6 : 3;
    const wobble = Math.sin(Math.max(0, Math.min(1, progress)) * Math.PI * 2) * wobbleAmplitude * (1 - Math.max(0, Math.min(1, progress)));

    f.div.style.transform = `translate3d(${clampX}px, ${yPos}px, 0) translateX(-50%) rotate(${f.baseRotation + wobble}deg) scale(${scaleValue})`;
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
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
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
      // end the animation and hide overlay — reset background so it doesn't stay opaque
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
    element.textContent = `COMBO ×${combo}`;
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
    
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
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
