/**
 * NEMESIS ROGUELIKE — UI SYSTEM
 * HUD, enemy circle, spinner, buttons, pull-tabs
 */

class HUDMinimizer {
  static huds = {
    draggableHud: {
      id: 'draggableHud',
      name: 'PLAYER HUD',
      icon: '❤️',
      storageKey: 'nemesis_hud_minimized_draggableHud'
    },
    quickAddHud: {
      id: 'quickAddHud',
      name: 'QUICK ADD',
      icon: '⚡',
      storageKey: 'nemesis_hud_minimized_quickAddHud'
    },
    statsHudWidget: {
      id: 'statsHudWidget',
      name: 'RUN STATS',
      icon: '📊',
      storageKey: 'nemesis_hud_minimized_statsHudWidget'
    },
    nemesisTauntHud: {
      id: 'nemesisTauntHud',
      name: 'TAUNT',
      icon: '👾',
      storageKey: 'nemesis_hud_minimized_nemesisTauntHud'
    },
    nemesisChallengeHud: {
      id: 'nemesisChallengeHud',
      name: 'CHALLENGE',
      icon: '🎯',
      storageKey: 'nemesis_hud_minimized_nemesisChallengeHud'
    },
    weeklyHeatmapPanel: {
      id: 'weeklyHeatmapPanel',
      name: 'HEATMAP',
      icon: '🔥',
      storageKey: 'nemesis_hud_minimized_weeklyHeatmapPanel'
    },
    weaponStrip: {
      id: 'weaponStrip',
      name: 'WEAPONS',
      icon: '⚔️',
      storageKey: 'nemesis_hud_minimized_weaponStrip'
    },
    satchelPanel: {
      id: 'satchelPanel',
      name: 'SATCHEL',
      icon: '🎒',
      storageKey: 'nemesis_hud_minimized_satchelPanel'
    },
    runCompletionPanel: {
      id: 'runCompletionPanel',
      name: 'RUN COMPLETION',
      icon: '🏁',
      storageKey: 'nemesis_hud_minimized_runCompletionPanel'
    },
    eventBannerPanel: {
      id: 'eventBannerPanel',
      name: 'EVENTS',
      icon: '⛩️',
      storageKey: 'nemesis_hud_minimized_eventBannerPanel'
    },
    buffPanel: {
      id: 'buffPanel',
      name: 'BUFFS',
      icon: '✨',
      storageKey: 'nemesis_hud_minimized_buffPanel'
    },
    scoreHud: {
      id: 'scoreHud',
      name: 'SCORE',
      icon: '🔺',
      storageKey: 'nemesis_hud_minimized_scoreHud'
    }
  };

  static init() {
    if (localStorage.getItem('nemesis_stats_hud_collapsed') === 'true') {
      localStorage.setItem('nemesis_hud_minimized_statsHudWidget', 'true');
      localStorage.removeItem('nemesis_stats_hud_collapsed');
    }
    this.renderDock();
  }

  static isMinimized(hudId) {
    const config = this.huds[hudId];
    if (!config) return false;
    return localStorage.getItem(config.storageKey) === 'true';
  }

  static minimize(hudId) {
    const config = this.huds[hudId];
    if (!config) return;
    localStorage.setItem(config.storageKey, 'true');
    const el = document.getElementById(hudId);
    if (el) {
      el.classList.add('is-hud-minimized');
    }
    this.renderDock();
  }

  static unminimize(hudId) {
    const config = this.huds[hudId];
    if (!config) return;
    localStorage.setItem(config.storageKey, 'false');
    const el = document.getElementById(hudId);
    if (el) {
      el.classList.remove('is-hud-minimized');
    }
    this.renderDock();
  }

  static toggle(hudId) {
    if (this.isMinimized(hudId)) {
      this.unminimize(hudId);
    } else {
      this.minimize(hudId);
    }
  }

  static attachDblClick(el, hudId) {
    if (!el || el._hasDblClickMin) return;
    el._hasDblClickMin = true;
    el.title = (el.title ? el.title + ' | ' : '') + 'Double-click to minimize';
    el.addEventListener('dblclick', (e) => {
      if (e.target.closest('input, textarea, select, button, a')) return;
      e.stopPropagation();
      HUDMinimizer.minimize(hudId);
    });
  }

  static setupDockInteractions(dock) {
    if (!dock || dock._hasInteractions) return;
    dock._hasInteractions = true;

    let isScrubbing = false;
    let activeChip = null;

    const getChipAtPoint = (x, y) => {
      const el = document.elementFromPoint(x, y);
      return el ? el.closest('.minimized-hud-chip') : null;
    };

    const updateScrubHighlight = (x, y) => {
      const chip = getChipAtPoint(x, y);
      if (chip !== activeChip) {
        if (activeChip) activeChip.classList.remove('is-scrub-active');
        activeChip = chip;
        if (activeChip) activeChip.classList.add('is-scrub-active');
      }
    };

    const onPointerDown = (e) => {
      isScrubbing = true;
      dock.classList.add('is-scrubbing');
      updateScrubHighlight(e.clientX, e.clientY);
      try { dock.setPointerCapture(e.pointerId); } catch (err) {}
    };

    const onPointerMove = (e) => {
      if (!isScrubbing) return;
      updateScrubHighlight(e.clientX, e.clientY);
    };

    const onPointerUp = (e) => {
      if (!isScrubbing) return;
      isScrubbing = false;
      dock.classList.remove('is-scrubbing');
      
      const targetChip = activeChip || getChipAtPoint(e.clientX, e.clientY);
      if (activeChip) {
        activeChip.classList.remove('is-scrub-active');
        activeChip = null;
      }

      if (targetChip && targetChip.dataset.hudId) {
        HUDMinimizer.unminimize(targetChip.dataset.hudId);
      }
      try { dock.releasePointerCapture(e.pointerId); } catch (err) {}
    };

    dock.addEventListener('pointerdown', onPointerDown);
    dock.addEventListener('pointermove', onPointerMove);
    dock.addEventListener('pointerup', onPointerUp);
    dock.addEventListener('pointercancel', onPointerUp);
  }

  static renderDock() {
    let dock = document.getElementById('minimizedHudDock');
    if (!dock) {
      dock = document.createElement('div');
      dock.id = 'minimizedHudDock';
      dock.className = 'minimized-hud-dock';
      document.body.appendChild(dock);
    }

    dock.innerHTML = '';
    this.setupDockInteractions(dock);

    const isTycoon = document.body.classList.contains('tycoon-active');
    let activeMinCount = 0;

    Object.keys(this.huds).forEach(hudId => {
      const config = this.huds[hudId];
      const el = document.getElementById(hudId);
      
      if (!el) return;

      this.attachDblClick(el, hudId);

      if (hudId === 'weaponStrip') {
        const topLeft = document.querySelector('.game-top-left');
        if (topLeft) {
          this.attachDblClick(topLeft, 'weaponStrip');
        }
      }

      const isMin = this.isMinimized(hudId);

      if (isMin) {
        el.classList.add('is-hud-minimized');
        if (hudId === 'weaponStrip') {
          const topLeft = document.querySelector('.game-top-left');
          if (topLeft) topLeft.classList.add('is-hud-minimized');
        }

        if (!isTycoon) {
          if (hudId === 'nemesisChallengeHud') {
            const state = (typeof getGameState === 'function') ? getGameState() : null;
            if (!state?.systemState?.dailyChallenge?.active) return;
          }
          if (hudId === 'eventBannerPanel') {
            if (el.style.display === 'none' && !el.classList.contains('is-hud-minimized')) return;
          }
          if (hudId === 'buffPanel') {
            if (!el.children || el.children.length === 0) return;
          }

          activeMinCount++;
          const chip = document.createElement('div');
          chip.className = 'minimized-hud-chip';
          chip.dataset.hudId = hudId;
          chip.dataset.hudName = config.name;
          chip.title = `${config.name} — Hold & slide to select`;
          chip.innerHTML = `<span class="chip-icon">${config.icon}</span>`;
          dock.appendChild(chip);
        }
      } else {
        el.classList.remove('is-hud-minimized');
        if (hudId === 'weaponStrip') {
          const topLeft = document.querySelector('.game-top-left');
          if (topLeft) topLeft.classList.remove('is-hud-minimized');
        }
      }
    });

    if (activeMinCount === 0) {
      dock.style.display = 'none';
    } else {
      dock.style.display = 'flex';
    }
  }
}

if (typeof window !== 'undefined') {
  window.HUDMinimizer = HUDMinimizer;
}

class UIManager {
  static checkInSequenceToken = 0;
  static eventListenersBound = false;
  static resizeScheduled = false;
  static spinnerFrameId = null;
  static spinnerAngle = 0;
  static spinnerLastFrameAt = 0;
  static queuedAttackTargetId = null;
  static queuedAttackCount = 0;
  static dailyDragState = null;
  static dailyDragSuppressUntil = 0;
  static dailyBloodOathTimer = null;
  static todoDragState = null;
  static todoDragSuppressUntil = 0;
  static quickDayDeadline = null; // timestamp or null – default deadline for new todos
  static _dailyHistoryCache = {};
  static _updateDailiesTimer = null;
  static _stageBackdropKey = '';
  static circleRectCache = null;
  static enemyPositionsCache = null;
  static _themeColorCache = new Map();
  static _refreshScheduled = false;

  static getCircleRect() {
    if (!this.circleRectCache) {
      const circle = document.querySelector('.enemy-circle-container');
      const rect = circle ? circle.getBoundingClientRect() : { left: 0, top: 0, width: 620, height: 620 };
      this.circleRectCache = {
        left: Math.round(rect.left),
        top: Math.round(rect.top),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      };
    }
    return this.circleRectCache;
  }

  static getAttributeColor(attribute) {
    const palette = getGameState()?.config?.attributeColors || {};
    return palette[String(attribute || '').toUpperCase()] || '#7a7a7a';
  }

  static getTextColorForHex(hex) {
    const normalized = String(hex || '').replace('#', '');
    if (normalized.length !== 6) return '#ffffff';
    const r = parseInt(normalized.slice(0, 2), 16);
    const g = parseInt(normalized.slice(2, 4), 16);
    const b = parseInt(normalized.slice(4, 6), 16);
    const luminance = (0.299 * r) + (0.587 * g) + (0.114 * b);
    return luminance > 150 ? '#14161d' : '#ffffff';
  }

  static shadeColor(hex, amount = -18) {
    const normalized = String(hex || '').replace('#', '');
    if (normalized.length !== 6) return '#2d2d2d';
    let r = parseInt(normalized.slice(0, 2), 16);
    let g = parseInt(normalized.slice(2, 4), 16);
    let b = parseInt(normalized.slice(4, 6), 16);

    r = Math.max(0, Math.min(255, r + amount));
    g = Math.max(0, Math.min(255, g + amount));
    b = Math.max(0, Math.min(255, b + amount));

    const rHex = r.toString(16).padStart(2, '0');
    const gHex = g.toString(16).padStart(2, '0');
    const bHex = b.toString(16).padStart(2, '0');
    return `#${rHex}${gHex}${bHex}`;
  }

  static STAGE_BACKDROPS = {
    1: { A: { src: 'assets/backgrounds/volcano.jpg', mobilePosition: 'center 48%', desktopPosition: 'center 50%' }, B: { src: 'assets/backgrounds/volcano.jpg', mobilePosition: 'center 48%', desktopPosition: 'center 50%' } },
    2: { A: { src: 'assets/backgrounds/desert.jpg', mobilePosition: 'center 42%', desktopPosition: 'center 44%' }, B: { src: 'assets/backgrounds/desert.jpg', mobilePosition: 'center 42%', desktopPosition: 'center 44%' } },
    3: { A: { src: 'assets/backgrounds/forest.jpg', mobilePosition: 'center 30%', desktopPosition: 'center 34%' }, B: { src: 'assets/backgrounds/forest.jpg', mobilePosition: 'center 30%', desktopPosition: 'center 34%' } },
    4: { A: { src: 'assets/backgrounds/cave.jpg', mobilePosition: 'center center', desktopPosition: 'center center' }, B: { src: 'assets/backgrounds/cave.jpg', mobilePosition: 'center center', desktopPosition: 'center center' } },
    5: { A: { src: 'assets/backgrounds/mountain.jpg', mobilePosition: 'center 28%', desktopPosition: 'center 32%' }, B: { src: 'assets/backgrounds/mountain.jpg', mobilePosition: 'center 28%', desktopPosition: 'center 32%' } },
    6: { A: { src: 'assets/backgrounds/graveyard.jpg', mobilePosition: 'center 42%', desktopPosition: 'center 44%' }, B: { src: 'assets/backgrounds/graveyard.jpg', mobilePosition: 'center 42%', desktopPosition: 'center 44%' } },
    7: { A: { src: 'assets/backgrounds/download.jpg', mobilePosition: 'center 40%', desktopPosition: 'center 42%' }, B: { src: 'assets/backgrounds/download.jpg', mobilePosition: 'center 40%', desktopPosition: 'center 42%' } },
    8: { A: { src: 'assets/backgrounds/swamp.jpg', mobilePosition: 'center 38%', desktopPosition: 'center 40%' }, B: { src: 'assets/backgrounds/swamp.jpg', mobilePosition: 'center 38%', desktopPosition: 'center 40%' } },
    9: { A: { src: 'assets/backgrounds/void.jpg', mobilePosition: 'center center', desktopPosition: 'center center' }, B: { src: 'assets/backgrounds/void.jpg', mobilePosition: 'center center', desktopPosition: 'center center' } },
    10: { A: { src: 'assets/backgrounds/isle.jpg', mobilePosition: 'center 32%', desktopPosition: 'center 34%' }, B: { src: 'assets/backgrounds/isle.jpg', mobilePosition: 'center 32%', desktopPosition: 'center 34%' } },
    11: { A: { src: 'assets/backgrounds/sea.jpg', mobilePosition: 'center 36%', desktopPosition: 'center 38%' }, B: { src: 'assets/backgrounds/sea.jpg', mobilePosition: 'center 36%', desktopPosition: 'center 38%' } }
  };

  static scheduleUpdateDailiesList(delay = 120) {
    if (UIManager._updateDailiesTimer) clearTimeout(UIManager._updateDailiesTimer);
    UIManager._updateDailiesTimer = setTimeout(() => {
      UIManager._updateDailiesTimer = null;
      try { UIManager.updateDailiesList(); } catch (e) { console.error('updateDailiesList error', e); }
    }, delay);
  }

  static accelerateBackground(multiplier = 2.0, duration = 2000) {
    const gameArea = document.getElementById('gameArea') || document.body;
    gameArea.classList.add('bg-accelerate-2x');
    if (UIManager._bgAccelTimer) clearTimeout(UIManager._bgAccelTimer);
    UIManager._bgAccelTimer = setTimeout(() => {
      gameArea.classList.remove('bg-accelerate-2x');
      UIManager._bgAccelTimer = null;
    }, duration);
  }

  static applyTaskChargingEffect(card, durationMs, onComplete) {
    if (!card) {
      if (onComplete) onComplete();
      return;
    }
    const isEnemyCard = card.classList.contains('enemy-card');
    const animTime = Math.max(100, durationMs);
    if (!isEnemyCard) {
      card.style.transition = `transform ${animTime}ms cubic-bezier(0.25, 1, 0.5, 1), filter ${animTime}ms ease, box-shadow ${animTime}ms ease`;
    }
    requestAnimationFrame(() => {
      card.classList.add('card-charging-compress');
    });

    const vibrateLeadTime = Math.min(200, Math.max(100, animTime * 0.3));
    const vibrateDelay = Math.max(0, animTime - vibrateLeadTime);

    const vibrateTimer = setTimeout(() => {
      card.classList.add('card-charging-vibrate');
    }, vibrateDelay);

    setTimeout(() => {
      clearTimeout(vibrateTimer);
      if (!isEnemyCard) {
        card.style.transition = '';
      }
      card.classList.remove('card-charging-compress', 'card-charging-vibrate');
      if (onComplete) onComplete();
    }, animTime);
  }

  static showDailyApReward(card, amount, options = {}) {
    const rect = card?.getBoundingClientRect?.();
    if (!rect) return;

    FloatingDamageNumber.show(
      rect.left + rect.width / 2,
      Math.max(12, rect.top - 18),
      `+${Math.ceil(amount)} AP`,
      { color: UIManager.themeColor('--ap-gold', '#FFB33F'), cycleText: false, countUp: true, ...options }
    );
  }

  static showDailyKeysReward(card, amount, options = {}) {
    const rect = card?.getBoundingClientRect?.();
    if (!rect) return;

    FloatingDamageNumber.show(
      rect.left + rect.width / 2,
      Math.max(12, rect.top - 18),
      `+${amount} Keys 🔑`,
      { color: '#ffd700', cycleText: false, countUp: true, ...options }
    );
  }

  static spawnDiamondFloatingPopup(x, y, amount, options = {}) {
    if (!amount || amount <= 0) return;
    try {
      FloatingDamageNumber.show(x, y, `+${amount} 💎`, {
        color: '#00e5ff',
        scale: 1.2,
        cycleText: false,
        countUp: true,
        ...options
      });
      if (typeof ParticleSystem !== 'undefined') {
        const p = new ParticleSystem();
        p.emit(x, y, 8, {
          color: '#00e5ff',
          glow: true,
          size: 3,
          velocity: 3,
          lifetime: 800
        });
      }
    } catch (e) {
      console.warn("Failed to spawn diamond floating popup", e);
    }
  }

  static showDeductionPopup(x, y, rewards) {
    let offset = 0;
    if (rewards) {
      if (rewards.ap < 0) {
        FloatingDamageNumber.show(x, y - offset, `${rewards.ap} AP`, { color: '#ef4444', isMiss: true });
        offset += 22;
      }
      if (rewards.gold < 0) {
        FloatingDamageNumber.show(x, y - offset, `${rewards.gold} Gold`, { color: '#ef4444', isMiss: true });
        offset += 22;
      }
      if (rewards.diamonds < 0) {
        FloatingDamageNumber.show(x, y - offset, `${rewards.diamonds} 💎`, { color: '#ef4444', isMiss: true });
        offset += 22;
      }
    }
    if (offset === 0) {
      FloatingDamageNumber.show(x, y, '-0 Rewards', { color: '#ef4444', isMiss: true });
    }
  }

  // Mutator display metadata: emoji, color, one-line description
  static MUTATOR_META = {
    vampiric: { icon: '🩸', color: '#C00707', label: 'Vampiric', desc: 'Heals itself when it deals damage' },
    regenerator: { icon: '🌿', color: '#30C85A', label: 'Regenerator', desc: 'Heals every check-in' },
    rallyist: { icon: '📣', color: '#FFB84D', label: 'Rallyist', desc: 'Multiplies damage of all enemies by 1.2x per Rallyist' },
    swift: { icon: '⚡', color: '#FFD700', label: 'Swift', desc: 'Bypasses dodge and shields' },
    necromancer: { icon: '☠️', color: '#6B3E8B', label: 'Necromancer', desc: 'May revive dead allies when it attacks' }
  };

  static parseEnemyElementEntry(entry) {
    if (!entry || entry === '-') return null;

    const primaryEntry = entry.split(',')[0].trim();
    if (!primaryEntry) return null;

    const [element, grade] = primaryEntry.split(/\s+/);
    return {
      element: element ? element.trim() : null,
      grade: grade ? grade.trim() : null,
      raw: primaryEntry
    };
  }

  static themeColor(varName, fallback) {
    const cached = this._themeColorCache.get(varName);
    if (cached !== undefined) return cached;
    try {
      if (typeof document === 'undefined') { this._themeColorCache.set(varName, fallback); return fallback; }
      const v = getComputedStyle(document.documentElement).getPropertyValue(varName);
      if (v && v.trim()) { this._themeColorCache.set(varName, v.trim()); return v.trim(); }
    } catch (e) { }
    this._themeColorCache.set(varName, fallback);
    return fallback;
  }

  static invalidateThemeCache() { this._themeColorCache.clear(); }

  static getEnemyElementColor(entry) {
    const state = getGameState();
    const parsed = this.parseEnemyElementEntry(entry);
    if (!parsed || !parsed.element) {
      return state.config.enemyElementColors?.default || UIManager.themeColor('--palette-orange', '#FF4400');
    }

    return state.config.enemyElementColors?.[parsed.element] || state.config.enemyElementColors?.default || UIManager.themeColor('--palette-orange', '#FF4400');
  }

  static getSpinnerElement() {
    return document.getElementById('spinner');
  }

  static setSpinnerDuration(duration) {
    const state = getGameState();
    if (!state.combatState) state.combatState = {};
    state.combatState.spinnerSpeedOverrideMs = duration === '333ms' ? 333 : Number.parseFloat(duration) * 1000 || 1000;
    this.syncSpinnerSpeed();
  }

  static getSpinnerSpeedMs() {
    const state = getGameState();
    if (!state.combatState) state.combatState = {};

    const spinner = this.getSpinnerElement();

    const hoveredEnemyId = String(state.combatState.hoveredEnemyId || '');
    const attackTargetId = String(state.combatState.attackSpinnerTargetId || '');
    const attackPressed = !!state.combatState.attackSpinnerPressed;
    const attackActive = !!state.combatState.attackSpinnerActive;
    const attackTouching = attackTargetId && hoveredEnemyId && hoveredEnemyId === attackTargetId;

    if (attackPressed || (attackActive && attackTouching)) {
      return 1600;
    }

    return Number(state.combatState.spinnerSpeedOverrideMs) || 1000;
  }

  static syncSpinnerSpeed() {
    this.ensureSpinnerLoop();
  }

  static ensureSpinnerLoop() {
    return;
  }

  static beginAttackSpinner(targetId) {
    const state = getGameState();
    if (!state.combatState) state.combatState = {};
    state.combatState.attackSpinnerPressed = true;
    state.combatState.attackSpinnerActive = true;
    state.combatState.attackSpinnerTargetId = targetId ? String(targetId) : null;
    this.syncSpinnerSpeed();
  }

  static releaseAttackSpinnerPress() {
    const state = getGameState();
    if (!state.combatState) state.combatState = {};
    state.combatState.attackSpinnerPressed = false;
    this.syncSpinnerSpeed();
  }

  static finishAttackSpinner() {
    const state = getGameState();
    if (!state.combatState) state.combatState = {};
    state.combatState.attackSpinnerPressed = false;
    state.combatState.attackSpinnerActive = false;
    state.combatState.attackSpinnerTargetId = null;
    this.syncSpinnerSpeed();
  }

  static setHoveredEnemyId(enemyId) {
    const state = getGameState();
    if (!state.combatState) state.combatState = {};
    state.combatState.hoveredEnemyId = enemyId ? String(enemyId) : null;
    this.syncSpinnerSpeed();
  }

  static initializeUI() {
    document.body.innerHTML = '';
    
    // Ensure daily challenge is initialized
    const state = getGameState();
    if (state.systemState && !state.systemState.dailyChallenge) {
      if (typeof generateDailyChallenge === 'function') {
        generateDailyChallenge();
      }
    }

    this.createHudWidget();
    this.createNemesisTauntHud();
    this.createChallengeHud();
    this.createScoreHud();
    this.createQuickAddHud();
    this.createFocusCircleWidget();
    this.createNavigationMenu();
    this.createGameArea();
    if (typeof HUDMinimizer !== 'undefined') {
      HUDMinimizer.init();
    }
    this.createActionButtons();
    this.createPullTabs();
    this.createShopPanel();
    this.setupJoystickModeToggle();
    this.setupTodoJoystickModeToggle();
    this.bindEventListeners();
    this.adjustLayout();
    this.ensureSpinnerLoop();
    this.refreshGameUI();

    // Request notification permissions if supported
    if ('Notification' in window && Notification.permission === 'default') {
      try {
        Notification.requestPermission();
      } catch (e) {
        console.warn("Failed to request notification permission:", e);
      }
    }

    // Start deadline check loop if not already running
    if (!window.deadlineCheckInterval) {
      window.deadlineCheckInterval = setInterval(() => {
        try {
          if (typeof TaskManager !== 'undefined' && typeof TaskManager.checkDailyDeadlines === 'function') {
            TaskManager.checkDailyDeadlines();
          }
        } catch (e) {
          console.error("Error checking deadlines", e);
        }
      }, 10000); // Every 10 seconds
    }
  }

  static adjustLayout() {
    const gameArea = document.getElementById('gameArea');
    if (!gameArea) return;
    gameArea.style.top = '0px';
    gameArea.style.height = `calc(100% - 60px)`;
  }

  static createHudWidget() {
    const hud = document.createElement('div');
    hud.id = 'draggableHud';
    hud.className = 'draggable-hud';
    hud.innerHTML = `
      <button class="hud-minimize-btn" title="Minimize Player HUD" onclick="event.stopPropagation(); HUDMinimizer.minimize('draggableHud')">－</button>
      <div class="impending-damage-number" id="pendingDmgRow" style="display: none;">
        <span id="pendingDmgValue">-0</span>
      </div>
      <div class="hud-resources">
        <div class="hud-resource">
          <div class="hud-bar hp-bar"><div id="hpFill" class="fill" style="width: 100%"></div></div>
          <div class="hud-resource-text"><span id="hpValue">100</span>/<span id="hpMax">100</span></div>
        </div>
        <div class="hud-resource">
          <div class="hud-bar mana-bar"><div id="manaFill" class="fill" style="width: 100%"></div></div>
          <div class="hud-resource-text"><span id="manaValue">0</span>/<span id="manaMax">0</span></div>
        </div>
        <div class="hud-resource">
          <div class="hud-bar ap-bar"><div id="apFill" class="fill" style="width: 100%"></div></div>
          <div class="hud-resource-text"><span id="apValue">0</span>/<span id="apMax">0</span></div>
        </div>
      </div>
      <div class="hud-currencies">
        <span>💰 <span id="goldValue">0</span></span>
        <span>💎 <span id="diamondValue">0</span></span>
      </div>
    `;
    document.body.appendChild(hud);

    const apResource = hud.querySelector('.ap-bar')?.closest('.hud-resource');
    if (apResource) {
      apResource.style.cursor = 'pointer';
      apResource.addEventListener('click', (e) => {
        e.stopPropagation();
        if (typeof PopupsManager !== 'undefined' && typeof PopupsManager.showBreakdownAlert === 'function') {
          const state = getGameState();
          const scheduledDailies = TaskManager.getAllDailies().filter(d => TaskManager.isDailyScheduled(d, TaskManager.getCurrentGameDateKey()));
          const dailyApTotal = scheduledDailies.reduce((sum, daily) => {
            const reward = state.config.taskRewards[daily.difficulty];
            return sum + (reward?.ap || 0);
          }, 0);

          const completeDayBonus = Number(state.systemState?.completeDayApBonus) || 0;
          const todoCont = TaskManager.getTodoContributions();

          const message = `
            <div style="margin-bottom: 8px;">• <strong>From Dailies:</strong> ${Math.round(dailyApTotal)} AP</div>
            <div style="margin-bottom: 8px;">• <strong>Day Completion Bonus:</strong> ${Math.round(completeDayBonus)} AP</div>
            <div style="margin-bottom: 8px;">• <strong>From Active Todos:</strong> ${Math.round(todoCont.ap)} AP/day</div>
            <hr style="border-color: rgba(255,255,255,0.1); margin: 8px 0;">
            <div style="font-size: 12px; color: #FFB33F;">⚡ <strong>Total Max AP:</strong> ${state.playerState.maxAp} AP</div>
            <p style="margin-top: 12px; font-size: 9px; color: var(--text-muted); line-height: 1.3;">
              * Pending Todo contribution is calculated as: <code>Todo Reward / max(1, Days Remaining)</code>. Complete them before deadlines to increase your max capacity!
            </p>
          `;
          PopupsManager.showBreakdownAlert('⚡ MAX AP BREAKDOWN', message);
        }
      });
    }

    let isDragging = false;
    let startX = 0, startY = 0, initialLeft = 0, initialTop = 0;

    const savedPos = localStorage.getItem('nemesis_hud_pos');
    if (savedPos) {
      try {
        const { left, top } = JSON.parse(savedPos);
        hud.style.right = 'auto';
        hud.style.left = left + 'px';
        hud.style.top = top + 'px';
      } catch (e) { }
    }

    let latestX = 0, latestY = 0;
    let rafId = null;

    const onPointerMove = (e) => {
      if (!isDragging) return;
      e.preventDefault();
      latestX = e.clientX;
      latestY = e.clientY;

      if (!rafId) {
        rafId = requestAnimationFrame(() => {
          const dx = latestX - startX;
          const dy = latestY - startY;
          let newLeft = initialLeft + dx;
          let newTop = initialTop + dy;

          const rect = hud.getBoundingClientRect();
          const maxX = window.innerWidth - rect.width;
          const maxY = window.innerHeight - rect.height;
          newLeft = Math.max(0, Math.min(newLeft, maxX));
          newTop = Math.max(0, Math.min(newTop, maxY));

          hud.style.left = newLeft + 'px';
          hud.style.top = newTop + 'px';
          rafId = null;
        });
      }
    };

    const onPointerUp = (e) => {
      if (!isDragging) return;
      isDragging = false;
      hud.classList.remove('is-dragging');
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
      document.removeEventListener('pointercancel', onPointerUp);
      try { hud.releasePointerCapture(e.pointerId); } catch (err) { }
      localStorage.setItem('nemesis_hud_pos', JSON.stringify({
        left: parseInt(hud.style.left, 10) || 0,
        top: parseInt(hud.style.top, 10) || 0
      }));
    };

    const onPointerDown = (e) => {
      if (e.target.closest('button, input, textarea, select, a')) return;
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      isDragging = true;
      hud.classList.add('is-dragging');
      startX = e.clientX;
      startY = e.clientY;
      const rect = hud.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;
      hud.style.right = 'auto';
      hud.style.left = initialLeft + 'px';
      hud.style.top = initialTop + 'px';
      try { hud.setPointerCapture(e.pointerId); } catch (err) { }

      document.addEventListener('pointermove', onPointerMove);
      document.addEventListener('pointerup', onPointerUp);
      document.addEventListener('pointercancel', onPointerUp);
    };

    hud.addEventListener('pointerdown', onPointerDown);
  }

  static createNemesisTauntHud() {
    const hud = document.createElement('div');
    hud.id = 'nemesisTauntHud';
    hud.className = 'draggable-taunt-hud';
    hud.innerHTML = `
      <button class="hud-minimize-btn" title="Minimize Taunt HUD" onclick="event.stopPropagation(); HUDMinimizer.minimize('nemesisTauntHud')">－</button>
      <div class="taunt-avatar">👾</div>
      <div class="taunt-body" id="nemesisTauntContent">I'm preparing...</div>
    `;
    document.body.appendChild(hud);

    let isDragging = false;
    let startX = 0, startY = 0, initialLeft = 0, initialTop = 0;
    let latestX = 0, latestY = 0;
    let rafId = null;

    const savedPos = localStorage.getItem('nemesis_taunt_hud_pos');
    if (savedPos) {
      try {
        const { left, top } = JSON.parse(savedPos);
        hud.style.left = left + 'px';
        hud.style.top = top + 'px';
      } catch (e) { }
    } else {
      hud.style.left = '20px';
      hud.style.top = '75px';
    }

    const onPointerMove = (e) => {
      if (!isDragging) return;
      e.preventDefault();
      latestX = e.clientX;
      latestY = e.clientY;

      if (!rafId) {
        rafId = requestAnimationFrame(() => {
          const dx = latestX - startX;
          const dy = latestY - startY;
          let newLeft = initialLeft + dx;
          let newTop = initialTop + dy;

          const rect = hud.getBoundingClientRect();
          const maxX = window.innerWidth - rect.width;
          const maxY = window.innerHeight - rect.height;
          newLeft = Math.max(0, Math.min(newLeft, maxX));
          newTop = Math.max(0, Math.min(newTop, maxY));

          hud.style.left = newLeft + 'px';
          hud.style.top = newTop + 'px';
          rafId = null;
        });
      }
    };

    const onPointerUp = (e) => {
      if (!isDragging) return;
      isDragging = false;
      hud.classList.remove('is-dragging');
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
      document.removeEventListener('pointercancel', onPointerUp);
      try { hud.releasePointerCapture(e.pointerId); } catch (err) { }
      localStorage.setItem('nemesis_taunt_hud_pos', JSON.stringify({
        left: parseInt(hud.style.left, 10) || 0,
        top: parseInt(hud.style.top, 10) || 0
      }));
    };

    const onPointerDown = (e) => {
      if (e.target.closest('button, input, textarea, select, a')) return;
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      isDragging = true;
      hud.classList.add('is-dragging');
      startX = e.clientX;
      startY = e.clientY;
      const rect = hud.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;
      hud.style.left = initialLeft + 'px';
      hud.style.top = initialTop + 'px';
      try { hud.setPointerCapture(e.pointerId); } catch (err) { }

      document.addEventListener('pointermove', onPointerMove);
      document.addEventListener('pointerup', onPointerUp);
      document.addEventListener('pointercancel', onPointerUp);
    };

    hud.addEventListener('pointerdown', onPointerDown);
  }

  static updateNemesisTauntHud() {
    const hud = document.getElementById('nemesisTauntHud');
    if (!hud) return;

    const state = getGameState();
    if (!state) return;

    const nemesisAttrs = state.nemesisState?.attributes || {};
    const playerAttrs = state.playerState?.attributes || {};
    const attributes = state.config?.attributes || ['STR', 'DISC', 'RESP', 'SOC', 'CAP', 'CREA', 'INT'];
    const colors = state.config?.attributeColors || {};

    const tauntPhrases = {
      STR: 'bigger',
      DISC: 'tougher',
      RESP: 'more responsible',
      SOC: 'more connected',
      CAP: 'richer',
      CREA: 'more creative',
      INT: 'smarter'
    };

    let leadingAttrs = [];
    attributes.forEach(attr => {
      const key = attr.toUpperCase();
      const nVal = nemesisAttrs[key]?.points || 0;
      const pVal = playerAttrs[key]?.points || 0;
      if (nVal > pVal) {
        leadingAttrs.push({
          attr: key,
          diff: nVal - pVal
        });
      }
    });

    const contentEl = document.getElementById('nemesisTauntContent');
    if (!contentEl) return;

    if (leadingAttrs.length > 0) {
      leadingAttrs.sort((a, b) => b.diff - a.diff);
      const leading = leadingAttrs[0];
      const attr = leading.attr;
      const phrase = tauntPhrases[attr] || 'better';
      const color = colors[attr] || '#a15cff';

      contentEl.innerHTML = `I'm <span class="taunt-highlight" style="color: ${color}; text-shadow: 0 0 6px ${color}80;">${phrase}</span> than you`;
    } else {
      contentEl.innerHTML = `<span style="opacity: 0.7; font-style: italic;">Enjoy it while it lasts...</span>`;
    }
  }

  static createChallengeHud() {
    let hud = document.getElementById('nemesisChallengeHud');
    if (hud) return hud;

    hud = document.createElement('div');
    hud.id = 'nemesisChallengeHud';
    hud.className = 'draggable-challenge-hud';
    document.body.appendChild(hud);

    let isDragging = false;
    let startX = 0, startY = 0, initialLeft = 0, initialTop = 0;
    let latestX = 0, latestY = 0;
    let rafId = null;

    const savedPos = localStorage.getItem('nemesis_challenge_hud_pos');
    if (savedPos) {
      try {
        const { left, top } = JSON.parse(savedPos);
        hud.style.left = left + 'px';
        hud.style.top = top + 'px';
      } catch (e) { }
    } else {
      hud.style.left = '20px';
      hud.style.top = '140px';
    }

    const onPointerMove = (e) => {
      if (!isDragging) return;
      e.preventDefault();
      latestX = e.clientX;
      latestY = e.clientY;

      if (!rafId) {
        rafId = requestAnimationFrame(() => {
          const dx = latestX - startX;
          const dy = latestY - startY;
          let newLeft = initialLeft + dx;
          let newTop = initialTop + dy;

          const rect = hud.getBoundingClientRect();
          const maxX = window.innerWidth - rect.width;
          const maxY = window.innerHeight - rect.height;
          newLeft = Math.max(0, Math.min(newLeft, maxX));
          newTop = Math.max(0, Math.min(newTop, maxY));

          hud.style.left = newLeft + 'px';
          hud.style.top = newTop + 'px';
          rafId = null;
        });
      }
    };

    const onPointerUp = (e) => {
      if (!isDragging) return;
      isDragging = false;
      hud.classList.remove('is-dragging');
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
      document.removeEventListener('pointercancel', onPointerUp);
      try { hud.releasePointerCapture(e.pointerId); } catch (err) { }
      localStorage.setItem('nemesis_challenge_hud_pos', JSON.stringify({
        left: parseInt(hud.style.left, 10) || 0,
        top: parseInt(hud.style.top, 10) || 0
      }));
    };

    const onPointerDown = (e) => {
      if (e.target.closest('button, input, textarea, select, a')) return;
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      isDragging = true;
      hud.classList.add('is-dragging');
      startX = e.clientX;
      startY = e.clientY;
      const rect = hud.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;
      hud.style.left = initialLeft + 'px';
      hud.style.top = initialTop + 'px';
      try { hud.setPointerCapture(e.pointerId); } catch (err) { }

      document.addEventListener('pointermove', onPointerMove);
      document.addEventListener('pointerup', onPointerUp);
      document.addEventListener('pointercancel', onPointerUp);
    };

    hud.addEventListener('pointerdown', onPointerDown);
    return hud;
  }

  static createScoreHud() {
    let hud = document.getElementById('scoreHud');
    if (hud) return hud;

    hud = document.createElement('div');
    hud.id = 'scoreHud';
    hud.className = 'draggable-score-hud';
    document.body.appendChild(hud);

    let isDragging = false;
    let startX = 0, startY = 0, initialLeft = 0, initialTop = 0;
    let latestX = 0, latestY = 0;
    let rafId = null;

    const savedPos = localStorage.getItem('nemesis_score_hud_pos');
    if (savedPos) {
      try {
        const { left, top } = JSON.parse(savedPos);
        hud.style.left = left + 'px';
        hud.style.top = top + 'px';
      } catch (e) { }
    } else {
      hud.style.left = '20px';
      hud.style.top = '220px';
    }

    const onPointerMove = (e) => {
      if (!isDragging) return;
      e.preventDefault();
      latestX = e.clientX;
      latestY = e.clientY;
      if (!rafId) {
        rafId = requestAnimationFrame(() => {
          const dx = latestX - startX;
          const dy = latestY - startY;
          let newLeft = initialLeft + dx;
          let newTop = initialTop + dy;
          const rect = hud.getBoundingClientRect();
          const maxX = window.innerWidth - rect.width;
          const maxY = window.innerHeight - rect.height;
          newLeft = Math.max(0, Math.min(newLeft, maxX));
          newTop = Math.max(0, Math.min(newTop, maxY));

          hud.style.left = newLeft + 'px';
          hud.style.top = newTop + 'px';
          rafId = null;
        });
      }
    };

    const onPointerUp = (e) => {
      if (!isDragging) return;
      isDragging = false;
      hud.classList.remove('is-dragging');
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
      document.removeEventListener('pointercancel', onPointerUp);
      try { hud.releasePointerCapture(e.pointerId); } catch (err) { }
      localStorage.setItem('nemesis_score_hud_pos', JSON.stringify({
        left: parseInt(hud.style.left, 10) || 0,
        top: parseInt(hud.style.top, 10) || 0
      }));
    };

    const onPointerDown = (e) => {
      if (e.target.closest('button, input, textarea, select, a')) return;
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      isDragging = true;
      hud.classList.add('is-dragging');
      startX = e.clientX;
      startY = e.clientY;
      const rect = hud.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;
      hud.style.left = initialLeft + 'px';
      hud.style.top = initialTop + 'px';
      try { hud.setPointerCapture(e.pointerId); } catch (err) { }

      document.addEventListener('pointermove', onPointerMove);
      document.addEventListener('pointerup', onPointerUp);
      document.addEventListener('pointercancel', onPointerUp);
    };

    hud.addEventListener('pointerdown', onPointerDown);
    return hud;
  }

  static getScoreRank(score) {
    if (score <= -10) return { rank: 1, name: 'Desolate', color: '#ff2233', glow: '#ff0022' };
    if (score < 5) return { rank: 2, name: 'Novice', color: '#cd7f32', glow: '#b86d28' };
    if (score < 15) return { rank: 3, name: 'Adept', color: '#c0c0c0', glow: '#a8a8a8' };
    if (score < 30) return { rank: 4, name: 'Veteran', color: '#ffd700', glow: '#ffb700' };
    if (score < 50) return { rank: 5, name: 'Master', color: '#e5e4e2', glow: '#38bdf8' };
    if (score < 80) return { rank: 6, name: 'Grandmaster', color: '#10b981', glow: '#34d399' };
    return { rank: 7, name: 'Celestial', color: '#a855f7', glow: '#ec4899' };
  }

  static updateScoreHud() {
    const state = getGameState();
    let hud = document.getElementById('scoreHud');
    if (!hud) hud = this.createScoreHud();

    const rawScore = (typeof state.systemState?.consistencyScore === 'number') ? state.systemState.consistencyScore : 0;
    const score = Math.max(-20, rawScore);
    const rankInfo = this.getScoreRank(score);

    const entries = (typeof this.getRunCompletionEntries === 'function') ? this.getRunCompletionEntries() : [];
    const liveEntry = entries.find(e => e.live);
    const todayCompletionPct = liveEntry ? Math.round((liveEntry.pct || 0) * 100) : 0;
    const runCompletionPct = entries.length > 0
      ? Math.round((entries.reduce((sum, e) => sum + (e.pct || 0), 0) / entries.length) * 100)
      : 0;

    const avgStreak = (typeof TaskManager !== 'undefined' && typeof TaskManager.getWeightedAverageStreak === 'function')
      ? TaskManager.getWeightedAverageStreak()
      : 0;
    const avgStreakText = avgStreak.toFixed(1);

    hud.className = `draggable-score-hud rank-tier-${rankInfo.rank}`;
    hud.style.display = 'flex';
    hud.title = `Consistency Score: ${score} | Rank: ${rankInfo.name} | Average Streak: ${avgStreakText} | Run Completion: ${runCompletionPct}% | Today: ${todayCompletionPct}%`;

    hud.innerHTML = `
      <button class="hud-minimize-btn" title="Minimize Score HUD" onclick="event.stopPropagation(); HUDMinimizer.minimize('scoreHud')">－</button>
      <div class="score-hud-rank-title" style="color: ${rankInfo.color};">${rankInfo.name.toUpperCase()}</div>
      <svg class="score-triangle-svg" viewBox="0 0 100 86.6" preserveAspectRatio="none">
        <!-- Rank 7: Double expanding shockwave pulse -->
        ${rankInfo.rank >= 7 ? `
          <circle cx="50" cy="50" r="48" class="score-shockwave-ring s1" stroke="${rankInfo.color}" stroke-width="2" fill="none" />
          <circle cx="50" cy="50" r="48" class="score-shockwave-ring s2" stroke="${rankInfo.color}" stroke-width="1.5" fill="none" />
          <line x1="50" y1="50" x2="50" y2="2" stroke="${rankInfo.color}" stroke-width="1.5" stroke-dasharray="4,4" class="score-radar-line" />
        ` : ''}

        <!-- Rank 5+: Outer spinning 8-notch gear ring -->
        ${rankInfo.rank >= 5 ? `
          <circle cx="50" cy="50" r="43" class="score-outer-ring" stroke="${rankInfo.color}" stroke-width="2.5" fill="none" stroke-dasharray="10,4,3,4,10,4,3,4" stroke-opacity="0.9" />
          <polygon points="50,1 94,26 94,74 50,99 6,74 6,26" fill="none" stroke="${rankInfo.color}" stroke-width="1" class="score-octa-shield" stroke-opacity="0.4" />
        ` : ''}

        <!-- Rank 6+: Counter-rotating dual compass & laser cross lines -->
        ${rankInfo.rank >= 6 ? `
          <circle cx="50" cy="50" r="34" class="score-inner-ring" stroke="${rankInfo.color}" stroke-width="2" fill="none" stroke-dasharray="2,6,8,6" stroke-opacity="0.9" />
          <line x1="2" y1="84.6" x2="98" y2="84.6" stroke="${rankInfo.color}" stroke-width="1" stroke-dasharray="3,3" class="score-base-laser" />
          <line x1="50" y1="2" x2="50" y2="84.6" stroke="${rankInfo.color}" stroke-width="1" stroke-dasharray="3,3" class="score-axis-laser" />
        ` : ''}

        <!-- Rank 2+: Outer geometric stroke shadow -->
        ${rankInfo.rank >= 2 ? `<polygon points="50,0 100,86.6 0,86.6" fill="none" stroke="${rankInfo.color}" stroke-width="1.5" stroke-opacity="0.3" class="score-poly-shadow" />` : ''}

        <!-- Rank 1+: Main Solid Triangle -->
        <polygon points="50,2 98,84.6 2,84.6" fill="rgba(12, 8, 20, 0.94)" stroke="${rankInfo.color}" stroke-width="${rankInfo.rank >= 4 ? 4.5 : 3.5}" stroke-linejoin="round" class="${rankInfo.rank >= 2 ? 'score-poly-pulse' : 'score-poly-base'}" />

        <!-- Rank 3+: Counter-rotating inner accent triangle & inverted inner tri -->
        ${rankInfo.rank >= 3 ? `
          <polygon points="50,16 84,74 16,74" fill="none" stroke="${rankInfo.color}" stroke-width="1.8" stroke-opacity="0.75" stroke-dasharray="8,5" class="score-inner-tri" />
          <polygon points="50,74 24,28 76,28" fill="none" stroke="${rankInfo.color}" stroke-width="1" stroke-opacity="0.35" stroke-dasharray="4,4" class="score-inverted-tri" />
        ` : ''}

        <!-- Rank 4+: Orbiting vertex satellite nodes & corner beams -->
        ${rankInfo.rank >= 4 ? `
          <g class="score-vertex-group">
            <circle cx="50" cy="5" r="4" fill="${rankInfo.color}" class="score-corner-node n1" />
            <circle cx="95" cy="83" r="4" fill="${rankInfo.color}" class="score-corner-node n2" />
            <circle cx="5" cy="83" r="4" fill="${rankInfo.color}" class="score-corner-node n3" />
            <polygon points="50,5 95,83 5,83" fill="none" stroke="${rankInfo.color}" stroke-width="1" stroke-dasharray="2,8" />
          </g>
        ` : ''}

        <!-- Rank 7: Hyper-cube core crystal diamond -->
        ${rankInfo.rank >= 7 ? `
          <g class="score-core-crystal-group">
            <polygon points="50,34 60,50 50,66 40,50" fill="${rankInfo.color}" fill-opacity="0.5" stroke="${rankInfo.color}" stroke-width="2" class="score-center-diamond d1" />
            <polygon points="50,38 56,50 50,62 44,50" fill="none" stroke="${rankInfo.color}" stroke-width="1.5" class="score-center-diamond d2" />
          </g>
        ` : ''}
      </svg>
      <span class="score-hud-number" style="color: ${rankInfo.color};">${score}</span>
      <div class="score-base-label base-left" style="color: ${rankInfo.color};" title="Run Completion: ${runCompletionPct}%">RUN ${runCompletionPct}%</div>
      <div class="score-base-label base-center" style="position: absolute; bottom: 4px; left: 50%; transform: translateX(-50%); font-size: 8px; font-weight: bold; color: ${rankInfo.color}; pointer-events: none; white-space: nowrap;" title="Average Daily Streak: ${avgStreakText}">🔥 ${avgStreakText}</div>
      <div class="score-base-label base-right" style="color: ${rankInfo.color};" title="Today Completion: ${todayCompletionPct}%">TDY ${todayCompletionPct}%</div>
    `;
  }

  static updateChallengeHud() {
    const state = getGameState();
    let hud = document.getElementById('nemesisChallengeHud');

    if (!state.systemState?.dailyChallenge || !state.systemState.dailyChallenge.active) {
      if (typeof generateDailyChallenge === 'function') {
        generateDailyChallenge();
      }
    }

    const challenge = state.systemState?.dailyChallenge;
    if (!challenge || !challenge.active) {
      if (hud) hud.style.display = 'none';
      return;
    }

    if (!hud) {
      hud = this.createChallengeHud();
    }

    hud.style.display = '';

    let dailiesHtml = '';
    let allCompleted = true;

    if (Array.isArray(challenge.dailies) && challenge.dailies.length > 0) {
      const attrColors = state.config?.attributeColors || {
        STR: '#ff4d4d', DISC: '#4d94ff', RESP: '#00e5ff', SOC: '#ff9933', CAP: '#ffd700', CREA: '#cc66ff', INT: '#33cc66'
      };
      challenge.dailies.forEach(dailyId => {
        const daily = state.dailiesState?.dailies?.find(d => String(d.id) === String(dailyId));
        if (daily) {
          const isCompleted = !!daily.completed;
          if (!isCompleted) allCompleted = false;
          const attrKey = (daily.attribute || 'STR').toUpperCase();
          const dailyColor = attrColors[attrKey] || '#e8b84a';
          dailiesHtml += `
            <div class="challenge-daily-item ${isCompleted ? 'completed' : ''}" data-color="true" style="--daily-color: ${dailyColor}; border-left: 3px solid ${dailyColor};">
              <span class="challenge-status-icon">${isCompleted ? '✅' : '❌'}</span>
              <span class="challenge-daily-name" title="${daily.name}">${daily.name}</span>
            </div>
          `;
        } else {
          dailiesHtml += `
            <div class="challenge-daily-item completed">
              <span class="challenge-status-icon">✅</span>
              <span class="challenge-daily-name" style="text-decoration: line-through; opacity: 0.5;">[Deleted]</span>
            </div>
          `;
        }
      });
    } else {
      dailiesHtml = '<div style="opacity: 0.6; font-size: 8px; text-align: center; padding: 4px;">No tasks</div>';
    }

    hud.innerHTML = `
      <button class="hud-minimize-btn" title="Minimize Challenge HUD" onclick="event.stopPropagation(); HUDMinimizer.minimize('nemesisChallengeHud')">－</button>
      <div class="challenge-hud-content" style="padding: 6px 8px;">
        <div class="challenge-dailies-list">${dailiesHtml}</div>
      </div>
    `;

    if (typeof HUDMinimizer !== 'undefined') {
      HUDMinimizer.renderDock();
    }
  }

  static createQuickAddHud() {
    if (document.getElementById('quickAddHud')) return;

    const hud = document.createElement('div');
    hud.id = 'quickAddHud';
    hud.className = 'draggable-quickadd-hud inline-bar-mode';

    const state = typeof getGameState === 'function' ? getGameState() : null;
    const defaultAttrs = ['STR', 'DISC', 'RESP', 'SOC', 'CAP', 'CREA', 'INT'];
    const configAttrs = state?.config?.attributes || [];
    const combinedAttrs = Array.from(new Set([...configAttrs, ...defaultAttrs]));

    const attrColors = {
      STR: '#f94144',
      DISC: '#f3722c',
      RESP: '#f8961e',
      SOC: '#f9c74f',
      CAP: '#90be6d',
      CREA: '#43aa8b',
      INT: '#577590',
      ...(state?.config?.attributeColors || {})
    };

    const attrOptions = combinedAttrs.map(attr => {
      return `<option value="${attr}" style="color: #ffffff; background-color: #181824;">⚡ ${attr}</option>`;
    }).join('');

    hud.innerHTML = `
      <div class="qa-hud-top-row">
        <div class="qa-drag-handle" style="cursor: grab; font-size: 16px; padding: 4px 10px; user-select: none; opacity: 0.8; color: var(--accent-gold, #f59e0b); font-weight: bold;" title="Drag Quick Add HUD">⠿</div>
        <button class="hud-minimize-btn" title="Minimize Quick Add HUD" onclick="event.stopPropagation(); HUDMinimizer.minimize('quickAddHud')">－</button>
        <select id="qaTypeSelect" class="qa-hud-select" title="Task Type">
          <option value="todo">📋 Todo</option>
          <option value="daily">📅 Daily</option>
          <option value="todo_complete">⚡ Done</option>
        </select>
        <select id="qaDiffSelect" class="qa-hud-select qa-diff-select" title="Difficulty">
          <option value="Easy" style="color: #00e676; background-color: #181824;">🟢 Easy</option>
          <option value="Medium" selected style="color: #ffd600; background-color: #181824;">🟡 Med</option>
          <option value="Hard" style="color: #ff1744; background-color: #181824;">🔴 Hard</option>
          <option value="Ultra" style="color: #d500f9; background-color: #181824;">☠️ Ultra</option>
        </select>
        <select id="qaAttrSelect" class="qa-hud-select qa-attr-select" title="Attribute">
          ${attrOptions}
        </select>
        <select id="qaDueSelect" class="qa-hud-select" title="Deadline">
          <option value="1" selected>📅 Tmrw</option>
          <option value="0">📅 Today</option>
          <option value="3">📅 +3d</option>
          <option value="7">📅 +7d</option>
          <option value="calendar">📅 Custom...</option>
        </select>
      </div>
      <div class="qa-hud-input-row">
        <textarea id="quickAddHudInput" class="qa-hud-input" placeholder="Quick add task... (Shift+Enter for new line, e.g. Task - sub1 - sub2)" autocomplete="off" rows="1"></textarea>
        <button type="button" id="quickAddHudSubmitBtn" class="qa-hud-submit-btn" title="Add Task">＋</button>
      </div>
    `;

    document.body.appendChild(hud);

    const savedPos = localStorage.getItem('nemesis_quickadd_hud_pos');
    if (savedPos) {
      try {
        const { left, top } = JSON.parse(savedPos);
        hud.style.right = 'auto';
        hud.style.left = left + 'px';
        hud.style.top = top + 'px';
        hud.style.transform = 'none';
      } catch (e) { }
    }

    let isDragging = false;
    let startX = 0, startY = 0, initialLeft = 0, initialTop = 0;
    let latestX = 0, latestY = 0;
    let rafId = null;

    const onPointerMove = (e) => {
      if (!isDragging) return;
      e.preventDefault();
      latestX = e.clientX;
      latestY = e.clientY;

      if (!rafId) {
        rafId = requestAnimationFrame(() => {
          const dx = latestX - startX;
          const dy = latestY - startY;
          let newLeft = initialLeft + dx;
          let newTop = initialTop + dy;

          const rect = hud.getBoundingClientRect();
          const maxX = window.innerWidth - rect.width;
          const maxY = window.innerHeight - rect.height;
          newLeft = Math.max(0, Math.min(newLeft, maxX));
          newTop = Math.max(0, Math.min(newTop, maxY));

          hud.style.left = newLeft + 'px';
          hud.style.top = newTop + 'px';
          rafId = null;
        });
      }
    };

    const onPointerUp = (e) => {
      if (!isDragging) return;
      isDragging = false;
      hud.classList.remove('is-dragging');
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
      document.removeEventListener('pointercancel', onPointerUp);
      try { hud.releasePointerCapture(e.pointerId); } catch (err) { }
      localStorage.setItem('nemesis_quickadd_hud_pos', JSON.stringify({
        left: parseInt(hud.style.left, 10) || 0,
        top: parseInt(hud.style.top, 10) || 0
      }));
    };

    const onPointerDown = (e) => {
      if (e.target.closest('button, input, textarea, select, a')) return;
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      isDragging = true;
      hud.classList.add('is-dragging');
      startX = e.clientX;
      startY = e.clientY;
      const rect = hud.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;
      hud.style.right = 'auto';
      hud.style.left = initialLeft + 'px';
      hud.style.top = initialTop + 'px';
      hud.style.transform = 'none';
      try { hud.setPointerCapture(e.pointerId); } catch (err) { }

      document.addEventListener('pointermove', onPointerMove);
      document.addEventListener('pointerup', onPointerUp);
      document.addEventListener('pointercancel', onPointerUp);
    };

    hud.addEventListener('pointerdown', onPointerDown);

    const attrSelect = hud.querySelector('#qaAttrSelect');
    const diffSelect = hud.querySelector('#qaDiffSelect');

    const updateAttrColor = () => {
      const selected = attrSelect.value;
      const col = attrColors[selected] || '#4d94ff';
      attrSelect.style.borderColor = col;
      attrSelect.style.color = '#ffffff';
      attrSelect.style.backgroundColor = `${col}22`;
      attrSelect.style.boxShadow = `0 0 6px ${col}44`;
    };
    attrSelect.addEventListener('change', updateAttrColor);
    updateAttrColor();

    const diffConfigs = {
      Easy: { color: '#00e676', bg: 'rgba(0, 230, 118, 0.18)', border: 'rgba(0, 230, 118, 0.5)' },
      Medium: { color: '#ffd600', bg: 'rgba(255, 214, 0, 0.18)', border: 'rgba(255, 214, 0, 0.5)' },
      Hard: { color: '#ff1744', bg: 'rgba(255, 23, 68, 0.18)', border: 'rgba(255, 23, 68, 0.5)' },
      Ultra: { color: '#d500f9', bg: 'rgba(213, 0, 249, 0.18)', border: 'rgba(213, 0, 249, 0.5)' }
    };

    const updateDiffColor = () => {
      const selected = diffSelect.value;
      const cfg = diffConfigs[selected] || diffConfigs.Medium;
      diffSelect.style.borderColor = cfg.border;
      diffSelect.style.color = cfg.color;
      diffSelect.style.backgroundColor = cfg.bg;
      diffSelect.style.boxShadow = `0 0 6px ${cfg.color}44`;
    };
    diffSelect.addEventListener('change', updateDiffColor);
    updateDiffColor();

    const dueSelect = hud.querySelector('#qaDueSelect');
    let previousDueValue = dueSelect.value;
    dueSelect.addEventListener('change', () => {
      if (dueSelect.value === 'calendar') {
        UIManager.showQuickAddCalendarPicker((confirmed) => {
          if (!confirmed && !dueSelect.dataset.customTimestamp) {
            dueSelect.value = previousDueValue;
          }
        });
      } else {
        previousDueValue = dueSelect.value;
        delete dueSelect.dataset.customTimestamp;
        const calOption = dueSelect.querySelector('option[value="calendar"]');
        if (calOption) calOption.textContent = '📅 Custom...';
      }
    });

    const inputEl = hud.querySelector('#quickAddHudInput');
    const submitBtn = hud.querySelector('#quickAddHudSubmitBtn');

    const handleSubmission = () => {
      const textVal = (inputEl.value || '').trim();
      if (!textVal) return;

      const type = hud.querySelector('#qaTypeSelect').value;
      const diff = hud.querySelector('#qaDiffSelect').value;
      const attr = attrSelect.value;
      const dueVal = dueSelect.value;

      let deadline = null;
      const now = new Date();

      if (dueVal === '0') {
        deadline = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      } else if (dueVal === '1') {
        const tmrw = new Date(now.getTime() + 86400000);
        deadline = new Date(tmrw.getFullYear(), tmrw.getMonth(), tmrw.getDate(), 23, 59, 59, 999);
      } else if (dueVal === '3') {
        const d3 = new Date(now.getTime() + 3 * 86400000);
        deadline = new Date(d3.getFullYear(), d3.getMonth(), d3.getDate(), 23, 59, 59, 999);
      } else if (dueVal === '7') {
        const d7 = new Date(now.getTime() + 7 * 86400000);
        deadline = new Date(d7.getFullYear(), d7.getMonth(), d7.getDate(), 23, 59, 59, 999);
      } else if (dueVal === 'calendar') {
        const customTs = Number(dueSelect.dataset.customTimestamp);
        if (customTs && !isNaN(customTs)) {
          deadline = new Date(customTs);
        } else {
          const tmrw = new Date(now.getTime() + 86400000);
          deadline = new Date(tmrw.getFullYear(), tmrw.getMonth(), tmrw.getDate(), 23, 59, 59, 999);
        }
      }

      if (type === 'daily') {
        const lines = (inputEl.value || '').split('\n');
        lines.forEach(line => {
          const lTrimmed = line.trim();
          if (!lTrimmed) return;
          const parsed = TaskManager.parseNaturalLanguage(lTrimmed, attr, diff, deadline);
          TaskManager.addDaily(parsed.name, parsed.difficulty || diff, parsed.attribute || attr, 1, parsed.deadline || deadline);
        });
      } else if (type === 'todo') {
        const parsedTasks = TaskManager.parseBulkAddText(inputEl.value || '', attr, diff, deadline);
        parsedTasks.forEach(t => {
          const created = TaskManager.addTodo(t.name, t.difficulty || diff, t.attribute || attr, t.deadline || deadline, t.subtasks || []);
          if (created && t.clusterAttributes) {
            created.clusterAttributes = t.clusterAttributes;
          }
        });
      } else if (type === 'todo_complete') {
        const parsedTasks = TaskManager.parseBulkAddText(inputEl.value || '', attr, diff, deadline);
        parsedTasks.forEach(t => {
          const created = TaskManager.addTodo(t.name, t.difficulty || diff, t.attribute || attr, t.deadline || deadline, t.subtasks || []);
          if (created) {
            if (t.clusterAttributes) {
              created.clusterAttributes = t.clusterAttributes;
            }
            TaskManager.completeTodo(created.id);
          }
        });
      }

      inputEl.value = '';
      inputEl.style.height = 'auto'; // reset height

      if (typeof getGameState === 'function' && getGameState()) {
        getGameState().save();
      }

      if (typeof UIManager !== 'undefined') {
        if (typeof UIManager.renderDailyNotes === 'function') UIManager.renderDailyNotes();
        if (typeof UIManager.updateTodosList === 'function') UIManager.updateTodosList();
        if (typeof UIManager.positionTodoCards === 'function') UIManager.positionTodoCards();
        if (typeof UIManager.renderEnemies === 'function') UIManager.renderEnemies();
        if (typeof UIManager.refreshGameUI === 'function') UIManager.refreshGameUI();
      }
    };

    submitBtn.addEventListener('click', handleSubmission);
    
    inputEl.addEventListener('input', () => {
      inputEl.style.height = 'auto';
      inputEl.style.height = Math.min(inputEl.scrollHeight, 120) + 'px';
    });
    
    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmission();
      }
    });

    if (typeof HUDMinimizer !== 'undefined') {
      HUDMinimizer.renderDock();
    }
  }

  static showQuickAddCalendarPicker(callback) {
    let overlay = document.getElementById('quickAddCalendarOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'quickAddCalendarOverlay';
      overlay.className = 'quick-add-calendar-overlay';
      overlay.innerHTML = `
        <div class="quick-add-calendar-modal">
          <div class="quick-add-calendar-header">
            <h3>📅 Select Custom Deadline</h3>
            <button type="button" class="qa-cal-close-btn" id="qaCalCloseBtn">&times;</button>
          </div>
          <div class="quick-add-calendar-body">
            <label for="quickAddCustomDatetimeInput" style="font-size: 11px; color: var(--text-muted, #aaa);">Date & Time:</label>
            <input type="datetime-local" id="quickAddCustomDatetimeInput" class="qa-datetime-input" />
          </div>
          <div class="quick-add-calendar-footer">
            <button type="button" class="qa-cal-cancel-btn" id="qaCalCancelBtn">Cancel</button>
            <button type="button" class="qa-cal-confirm-btn" id="qaCalConfirmBtn">Confirm</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
    }

    const dtInput = overlay.querySelector('#quickAddCustomDatetimeInput');
    const now = new Date();
    const tmrw = new Date(now.getTime() + 86400000);
    const defaultIso = tmrw.toISOString().slice(0, 16);
    dtInput.value = defaultIso;

    overlay.style.display = 'flex';

    const closeOverlay = (confirmed = false) => {
      overlay.style.display = 'none';
      if (typeof callback === 'function') callback(confirmed);
    };

    const confirmBtn = overlay.querySelector('#qaCalConfirmBtn');
    const cancelBtn = overlay.querySelector('#qaCalCancelBtn');
    const closeBtn = overlay.querySelector('#qaCalCloseBtn');

    const onConfirm = () => {
      const dueSelect = document.getElementById('qaDueSelect');
      if (dtInput.value && dueSelect) {
        const selectedDate = new Date(dtInput.value);
        if (!isNaN(selectedDate.getTime())) {
          dueSelect.dataset.customTimestamp = selectedDate.getTime();
          const calOption = dueSelect.querySelector('option[value="calendar"]');
          if (calOption) {
            const formattedStr = selectedDate.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' });
            calOption.textContent = `📅 ${formattedStr}`;
          }
          dueSelect.value = 'calendar';
        }
      }
      cleanup();
      closeOverlay(true);
    };

    const onCancel = () => {
      cleanup();
      closeOverlay(false);
    };

    const cleanup = () => {
      confirmBtn.removeEventListener('click', onConfirm);
      cancelBtn.removeEventListener('click', onCancel);
      closeBtn.removeEventListener('click', onCancel);
    };

    confirmBtn.addEventListener('click', onConfirm);
    cancelBtn.addEventListener('click', onCancel);
    closeBtn.addEventListener('click', onCancel);
  }

  static createFocusCircleWidget() {
    // 1) Peeking 3/4 circle node on screen edge
    let circle = document.getElementById('peekingFocusCircle');
    if (!circle) {
      circle = document.createElement('div');
      circle.id = 'peekingFocusCircle';
      circle.className = 'peeking-focus-circle';
      circle.innerHTML = '⏱️';
      circle.title = 'Focus Timer — Click to configure';
      document.body.appendChild(circle);
    }

    // 2) Side rectangle control panel
    let sidePanel = document.getElementById('focusSidePanel');
    if (!sidePanel) {
      sidePanel = document.createElement('div');
      sidePanel.id = 'focusSidePanel';
      sidePanel.className = 'focus-side-control-panel';
      sidePanel.innerHTML = `
        <div class="focus-side-header">
          <span>⏱️ FOCUS TIMER</span>
          <button id="focusSideCloseBtn" class="focus-side-close">✕</button>
        </div>
        <div class="focus-side-body">
          <div class="focus-side-time-label" id="focusSideTimeDisplay">25:00</div>
          <div class="focus-side-dur-list">
            <button class="btn-side-dur" data-mins="15">15m</button>
            <button class="btn-side-dur active" data-mins="25">25m</button>
            <button class="btn-side-dur" data-mins="45">45m</button>
            <button class="btn-side-dur" data-mins="60">60m</button>
          </div>
          <button id="focusSideToggleBtn" class="btn-side-start">START FOCUS</button>
        </div>
      `;
      document.body.appendChild(sidePanel);
    }

    // Toggle side panel on circle click
    circle.addEventListener('click', () => {
      sidePanel.classList.toggle('open');
    });

    const closeBtn = sidePanel.querySelector('#focusSideCloseBtn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        sidePanel.classList.remove('open');
      });
    }

    const state = getGameState();
    let selectedMins = 25;

    // Duration buttons
    sidePanel.querySelectorAll('.btn-side-dur').forEach(btn => {
      btn.addEventListener('click', () => {
        sidePanel.querySelectorAll('.btn-side-dur').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedMins = Number(btn.dataset.mins) || 25;
        const timeDisplay = sidePanel.querySelector('#focusSideTimeDisplay');
        if (timeDisplay) timeDisplay.textContent = `${selectedMins}:00`;
      });
    });

    const toggleBtn = sidePanel.querySelector('#focusSideToggleBtn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const isActive = state.systemState?.focusTimerActive;
        if (!isActive) {
          state.systemState.focusTimerActive = true;
          state.systemState.focusDurationMins = selectedMins;
          state.systemState.focusStartTime = Date.now();
          state.save();
          toggleBtn.textContent = 'STOP FOCUS';
          toggleBtn.style.background = '#ef4444';
          
          const borderTimer = document.getElementById('screenBorderCountdown');
          if (borderTimer) borderTimer.style.display = 'flex';
          const timerText = document.getElementById('borderTimerText');
          if (timerText) timerText.textContent = `Focusing: ${selectedMins}:00`;
        } else {
          state.systemState.focusTimerActive = false;
          state.save();
          toggleBtn.textContent = 'START FOCUS';
          toggleBtn.style.background = 'linear-gradient(135deg, #6366f1, #4f46e5)';
          const borderTimer = document.getElementById('screenBorderCountdown');
          if (borderTimer) borderTimer.style.display = 'none';
        }
      });
    }

    const cancelBtn = document.getElementById('borderTimerCancelBtn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        state.systemState.focusTimerActive = false;
        state.save();
        if (toggleBtn) {
          toggleBtn.textContent = 'START FOCUS';
          toggleBtn.style.background = 'linear-gradient(135deg, #6366f1, #4f46e5)';
        }
        const borderTimer = document.getElementById('screenBorderCountdown');
        if (borderTimer) borderTimer.style.display = 'none';
      });
    }
  }

  static createNavigationMenu() {
    const hamburger = document.createElement('div');
    hamburger.id = 'navHamburgerBtn';
    hamburger.className = 'nav-hamburger-btn';
    hamburger.innerHTML = '☰';
    document.body.appendChild(hamburger);

    const refreshBtn = document.createElement('div');
    refreshBtn.id = 'navRefreshBtn';
    refreshBtn.className = 'nav-hamburger-btn';
    refreshBtn.style.left = '68px';
    refreshBtn.innerHTML = '↻';
    refreshBtn.title = 'Force Refresh';
    refreshBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (typeof window.forceRefreshNemesisApp === 'function') {
        window.forceRefreshNemesisApp();
      } else {
        window.location.reload(true);
      }
    });
    document.body.appendChild(refreshBtn);

    const navPanel = document.createElement('div');
    navPanel.id = 'navMenuPanel';
    navPanel.className = 'nav-menu-panel';
    navPanel.innerHTML = `
      <div id="deathDefianceBadge" class="death-defiance-badge" style="margin-bottom: 4px;">DEFIANCE READY</div>
      <button id="homeBtn" class="btn-nav-item">🏠 Home</button>
      <button id="plannerBtn" class="btn-nav-item">📅 Planner</button>
      <button id="bestiaryBtn" class="btn-nav-item">📖 Bestiary</button>
      <button id="diamondRewardsBtn" class="btn-nav-item diamond-rewards-btn">💎 Rewards</button>
      <button id="checkInBtn" class="btn-nav-item">✅ Check In</button>
      <button id="pauseBtn" class="btn-nav-item" style="border-top: 1px solid rgba(255,255,255,0.1); margin-top: 4px;">⏸️ Pause</button>
    `;
    document.body.appendChild(navPanel);

    hamburger.addEventListener('click', (e) => {
      e.stopPropagation();
      navPanel.classList.toggle('active');
    });

    document.addEventListener('click', (e) => {
      if (navPanel.classList.contains('active') && !navPanel.contains(e.target) && e.target !== hamburger) {
        navPanel.classList.remove('active');
      }
    });
  }

  static createGameArea() {
    const gameArea = document.createElement('div');
    gameArea.id = 'gameArea';
    gameArea.className = 'game-area';
    gameArea.innerHTML = `
      <div class="game-top-left">
        <div id="weaponStrip" class="weapon-strip"></div>
      </div>
      <div id="gameCenter" class="game-center">
        <div class="center-drag-handle" id="centerDragHandle"></div>
        <div class="stage-date-wrap">
          <div id="dateDisplay" class="date-display stage-date"></div>
        </div>
        <div class="enemy-circle-container">
          <div id="levelIndicator" class="level-indicator"></div>
          <canvas id="enemyCanvas" class="enemy-canvas"></canvas>
          <div id="enemyLayer" class="enemy-layer"></div>
          <div id="spinnerContainer" class="spinner-container">
            <div id="spinner" class="spinner"></div>
          </div>
          <div class="action-ring"></div>
          <svg id="aimingSvg" style="position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 10005; display: none;">
            <defs>
              <filter id="attackGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="skillGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="dodgeGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <line id="aimingLine" x1="0" y1="0" x2="0" y2="0" stroke-width="4" stroke-linecap="round" />
          </svg>
        </div>
          <button id="consistencyChallengeBtn" class="btn-consistency-challenge" title="Lock In Commitment">🔒 LOCK IN</button>
          <div id="satchelPanel" class="satchel-panel" aria-label="Consumables"></div>
      </div>
      <div id="buffPanel" class="buff-panel" aria-label="Buffs"></div>
      <div id="eventBannerPanel" class="event-banner-panel" aria-label="Event Banner" style="display: none;">
        <div class="event-banner-content">
          <span id="eventBannerEmoji" class="event-banner-emoji" title="Click to claim reward">⛩️</span>
          <div id="eventBannerSlots" class="event-banner-slots"></div>
        </div>
      </div>
      <div class="combo-indicator" id="comboIndicator"></div>
      <div class="focus-overlay" id="focusOverlay"></div>
      <div id="focus-clock-popup">
        <div class="focus-fullscreen-inner">
          <button class="focus-popup-close" id="focusPopupClose">✕</button>
          <div class="focus-fs-timer-label" id="digitalClock">25:00</div>
          <div class="focus-fs-bar-wrap">
            <div class="focus-fs-bar-track">
              <div class="focus-fs-bar-fill" id="focusProgressBar"></div>
            </div>
          </div>
          <div class="focus-timer-options">
            <button class="focus-duration-btn" data-mins="5">5m</button>
            <button class="focus-duration-btn" data-mins="15">15m</button>
            <button class="focus-duration-btn active" data-mins="25">25m</button>
            <button class="focus-duration-btn" data-mins="50">50m</button>
            <button class="focus-duration-btn" id="focusCustomBtn">Custom</button>
          </div>
          <div id="focusCustomInputGroup" style="display: none; margin-bottom: 12px; align-items: center; justify-content: center; gap: 8px;">
            <span style="font-size: 7px; color: #9ca3af;">Minutes:</span>
            <input type="number" id="focusCustomMins" min="1" max="1440" value="25" style="width: 60px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.18); color: #fff; font-family: inherit; font-size: 8px; padding: 4px; text-align: center; border-radius: 4px;" />
          </div>
          <div id="focusTaskSelectionContainer" style="margin: 12px 0; text-align: left; max-height: 140px; overflow-y: auto; border: 1px solid rgba(255,255,255,0.1); padding: 6px; border-radius: 4px; background: rgba(255,255,255,0.04); display: none;">
            <div class="focus-task-selection-header">FOCUS TARGETS (2X REWARDS):</div>
            <div id="focusTaskSelectionList"></div>
          </div>
          <div id="focusActionContainer" style="display: flex; gap: 8px; width: 100%; max-width: 300px;">
            <button class="focus-action-btn focus-start-btn" id="focusStartBtn" style="flex: 1;">START</button>
            <button class="focus-action-btn focus-cancel-btn" id="focusStopBtn" style="flex: 1; display: none;">STOP</button>
          </div>
          <div class="focus-cost-warning">Costs 15 Mana · Doubles all task rewards</div>
        </div>
      </div>
      <!-- Lock In Popup -->
      <div class="focus-overlay" id="consistencyOverlay" style="display: none; z-index: 19996;"></div>
      <div id="consistency-popup" style="display: none; position: fixed; z-index: 19997; top: 0; left: 0; width: 100vw; height: 100vh; align-items: center; justify-content: center; font-family: 'Orbitron', monospace; color: #ffffff; pointer-events: auto;">
        <div class="focus-fullscreen-inner" style="background: rgba(10, 10, 14, 0.96); border: 1px solid rgba(234, 179, 8, 0.25); border-radius: 12px; padding: 24px; display: flex; flex-direction: column; align-items: center; justify-content: center; max-width: 330px; width: 90%; box-shadow: 0 10px 30px rgba(0,0,0,0.8); position: relative;">
          <button class="focus-popup-close" id="consistencyPopupClose" style="position: absolute; top: 12px; right: 12px; background: none; border: none; color: rgba(255,255,255,0.4); font-size: 14px; cursor: pointer;">✕</button>
          <div style="font-size: 14px; color: #fef08a; font-weight: bold; margin-bottom: 8px; text-shadow: 0 0 8px rgba(234, 179, 8, 0.4);">LOCK IN COMMITMENT</div>
          <div style="font-size: 8px; color: #9ca3af; text-align: center; margin-bottom: 14px; line-height: 1.4;">Set Lock In Degree. Ratio is fixed at <strong style="color:#fef08a;">2:8 (Reward:Damage)</strong> multiplier. e.g. <span style="color:#fef08a;">4x rewards</span> = <span style="color:#ef4444;">16x damage</span>.</div>
          
          <div style="display: flex; flex-direction: column; width: 100%; gap: 8px; margin-bottom: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 9px; color: #d1d5db;">Active Lock In:</span>
              <span id="currentConsistencyCommitment" style="font-size: 10px; color: #fef08a; font-weight: bold;">0 days</span>
            </div>
            <div style="display: flex; gap: 8px; align-items: center; justify-content: space-between;">
              <span style="font-size: 9px; color: #d1d5db;">Lock In Degree (Reward Mult):</span>
              <input type="number" id="lockInDegreeInput" min="1" max="10" value="4" style="width: 65px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.18); color: #fff; font-family: inherit; font-size: 10px; padding: 4px; text-align: center; border-radius: 4px;" />
            </div>
            <div id="lockInRatioPreview" style="font-size: 9px; color: #fef08a; text-align: center; font-weight: bold; background: rgba(234, 179, 8, 0.1); padding: 4px; border-radius: 4px;">4x Rewards ⚡ | 16x Missed Damage 💀</div>
            <div style="display: flex; gap: 8px; align-items: center; justify-content: space-between;">
              <span style="font-size: 9px; color: #d1d5db;">Lock In Duration:</span>
              <div style="display: flex; gap: 4px; align-items: center;">
                <input type="number" id="consistencyCommitDays" min="1" max="365" value="7" style="width: 65px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.18); color: #fff; font-family: inherit; font-size: 10px; padding: 4px; text-align: center; border-radius: 4px;" />
                <span style="font-size: 9px; color: #d1d5db;">days</span>
              </div>
            </div>
          </div>
          
          <button class="focus-action-btn focus-start-btn" id="consistencyCommitBtn" style="width: 100%; padding: 10px; background: #eab308; color: #000; border: none; font-family: inherit; font-size: 10px; font-weight: bold; border-radius: 6px; cursor: pointer; transition: all 0.2s;">LOCK IN NOW</button>
        </div>
      </div>
      <div id="focus-mini-widget" style="display: none;">
        <div class="mini-widget-pulse-dot"></div>
        <span id="focusMiniTime">25:00</span>
      </div>
    `;
    document.body.appendChild(gameArea);

    const centerGroup = gameArea.querySelector('.enemy-circle-container');
    const handle = gameArea.querySelector('#centerDragHandle');
    let isDragging = false;
    let startX = 0, startY = 0;
    let currentTx = 0, currentTy = 0;
    let initialTx = 0, initialTy = 0;

    const savedPos = localStorage.getItem('nemesis_center_pos');
    if (savedPos) {
      try {
        const { tx, ty } = JSON.parse(savedPos);
        currentTx = tx || 0;
        currentTy = ty || 0;
        centerGroup.style.transform = `translate(${currentTx}px, ${currentTy}px)`;
      } catch (e) { }
    }

    const onMove = (e) => {
      if (!isDragging) return;
      e.preventDefault();
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      currentTx = initialTx + dx;
      currentTy = initialTy + dy;
      centerGroup.style.transform = `translate(${currentTx}px, ${currentTy}px)`;
    };

    const onUp = (e) => {
      if (!isDragging) return;
      isDragging = false;
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onUp);
      handle.releasePointerCapture(e.pointerId);
      localStorage.setItem('nemesis_center_pos', JSON.stringify({
        tx: currentTx,
        ty: currentTy
      }));
    };

    const onDown = (e) => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      initialTx = currentTx;
      initialTy = currentTy;
      handle.setPointerCapture(e.pointerId);
      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
      document.addEventListener('pointercancel', onUp);
    };

    if (handle) {
      handle.addEventListener('pointerdown', onDown);
    }

    const rcPanel = document.getElementById('runCompletionPanel');
    if (rcPanel) {
      rcPanel.addEventListener('click', (e) => {
        const toggleBtn = e.target.closest('#runCompletionToggle');
        if (toggleBtn) {
          const state = getGameState();
          if (!state.systemState) state.systemState = {};
          state.systemState.showRewardsInCompletionPanel = false;
          state.systemState.showAttrsInCompletionPanel = !state.systemState.showAttrsInCompletionPanel;
          this.updateRunCompletionGraph();
        }
        const rewardsToggleBtn = e.target.closest('#runCompletionRewardsToggle');
        if (rewardsToggleBtn) {
          const state = getGameState();
          if (!state.systemState) state.systemState = {};
          state.systemState.showAttrsInCompletionPanel = false;
          state.systemState.showRewardsInCompletionPanel = !state.systemState.showRewardsInCompletionPanel;
          this.updateRunCompletionGraph();
        }
      });
    }

    // Consistency Heatmap Widget setup
    const heatmapPanel = document.getElementById('weeklyHeatmapPanel');
    if (window.ResizeObserver && heatmapPanel) {
      const hmObserver = new ResizeObserver(() => {
        this.updateWeeklyHeatmap();
      });
      hmObserver.observe(heatmapPanel);
    }

    const ebPanel = gameArea.querySelector('#eventBannerPanel');
    let isEbDragging = false;
    let ebStartX = 0, ebStartY = 0, ebInitialLeft = 0, ebInitialTop = 0;
    let ebLatestX = 0, ebLatestY = 0;
    let ebRafId = null;

    const savedEbPos = localStorage.getItem('nemesis_event_banner_pos');
    if (savedEbPos) {
      try {
        const { left, top } = JSON.parse(savedEbPos);
        ebPanel.style.right = 'auto';
        ebPanel.style.transform = 'none';
        ebPanel.style.left = left + 'px';
        ebPanel.style.top = top + 'px';
      } catch (e) { }
    } else {
      // Default position top center
      ebPanel.style.left = '50%';
      ebPanel.style.top = '10px';
      ebPanel.style.transform = 'translateX(-50%)';
    }

    const savedEbSize = localStorage.getItem('nemesis_event_banner_size');
    if (savedEbSize) {
      try {
        const { width, height } = JSON.parse(savedEbSize);
        ebPanel.style.width = width + 'px';
        ebPanel.style.height = height + 'px';
      } catch (e) { }
    }

    // Save size when resizing ends
    ebPanel.addEventListener('pointerup', () => {
      localStorage.setItem('nemesis_event_banner_size', JSON.stringify({
        width: ebPanel.offsetWidth,
        height: ebPanel.offsetHeight
      }));
    });

    const onEbDown = (e) => {
      if (e.target.closest('#eventBannerEmoji, .event-banner-emoji, .event-task-slot, button')) return;
      isEbDragging = true;
      ebStartX = e.clientX;
      ebStartY = e.clientY;
      const rect = ebPanel.getBoundingClientRect();
      ebInitialLeft = rect.left;
      ebInitialTop = rect.top;
      ebPanel.style.right = 'auto';
      ebPanel.style.transform = 'none';
      ebPanel.style.left = ebInitialLeft + 'px';
      ebPanel.style.top = ebInitialTop + 'px';
      try { ebPanel.setPointerCapture(e.pointerId); } catch (err) { }

      document.addEventListener('pointermove', onEbMove);
      document.addEventListener('pointerup', onEbUp);
      document.addEventListener('pointercancel', onEbUp);
    };

    const onEbMove = (e) => {
      if (!isEbDragging) return;
      e.preventDefault();
      ebLatestX = e.clientX;
      ebLatestY = e.clientY;

      if (!ebRafId) {
        ebRafId = requestAnimationFrame(() => {
          const dx = ebLatestX - ebStartX;
          const dy = ebLatestY - ebStartY;
          let newLeft = ebInitialLeft + dx;
          let newTop = ebInitialTop + dy;

          const maxX = window.innerWidth - ebPanel.offsetWidth;
          const maxY = window.innerHeight - ebPanel.offsetHeight;
          newLeft = Math.max(0, Math.min(newLeft, maxX));
          newTop = Math.max(0, Math.min(newTop, maxY));

          ebPanel.style.left = newLeft + 'px';
          ebPanel.style.top = newTop + 'px';
          ebRafId = null;
        });
      }
    };

    const onEbUp = (e) => {
      if (!isEbDragging) return;
      isEbDragging = false;
      if (ebRafId) {
        cancelAnimationFrame(ebRafId);
        ebRafId = null;
      }
      document.removeEventListener('pointermove', onEbMove);
      document.removeEventListener('pointerup', onEbUp);
      document.removeEventListener('pointercancel', onEbUp);
      try { ebPanel.releasePointerCapture(e.pointerId); } catch (err) { }
      localStorage.setItem('nemesis_event_banner_pos', JSON.stringify({
        left: parseInt(ebPanel.style.left, 10) || 0,
        top: parseInt(ebPanel.style.top, 10) || 0
      }));
      localStorage.setItem('nemesis_event_banner_size', JSON.stringify({
        width: ebPanel.offsetWidth,
        height: ebPanel.offsetHeight
      }));
    };

    ebPanel.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button, input, textarea, select, label')) return;
      if (e.button !== 0 && e.pointerType === 'mouse') return;

      const rect = ebPanel.getBoundingClientRect();
      // Ignore dragging if click was on or near the bottom-right resizer corner (within 48px)
      if (e.clientX > rect.right - 48 && e.clientY > rect.bottom - 48) {
        return;
      }
      onEbDown(e);
    });

    // Custom touch-friendly resize handle
    const resizeHandle = gameArea.querySelector('#eventBannerResizeHandle');
    if (resizeHandle) {
      let isResizing = false;
      let resizeStartX = 0, resizeStartY = 0, resizeStartW = 0, resizeStartH = 0;

      resizeHandle.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        isResizing = true;
        resizeStartX = e.clientX;
        resizeStartY = e.clientY;
        resizeStartW = ebPanel.offsetWidth;
        resizeStartH = ebPanel.offsetHeight;
        try { resizeHandle.setPointerCapture(e.pointerId); } catch (err) { }
      });

      resizeHandle.addEventListener('pointermove', (e) => {
        if (!isResizing) return;
        e.preventDefault();
        const newW = Math.max(120, resizeStartW + (e.clientX - resizeStartX));
        const newH = Math.max(80, resizeStartH + (e.clientY - resizeStartY));
        ebPanel.style.width = newW + 'px';
        ebPanel.style.height = newH + 'px';
      });

      const onResizeEnd = () => {
        if (!isResizing) return;
        isResizing = false;
        localStorage.setItem('nemesis_event_banner_size', JSON.stringify({
          width: ebPanel.offsetWidth,
          height: ebPanel.offsetHeight
        }));
      };
      resizeHandle.addEventListener('pointerup', onResizeEnd);
      resizeHandle.addEventListener('pointercancel', onResizeEnd);
    }

    this.updateStageBackdrop();
  }

  static createActionButtons() {
    const ring = document.querySelector('.action-ring');
    if (!ring) return;
    ring.innerHTML = `
      <button id="attackBtn" class="btn-action-circle"><span id="attackIcon">⚔️</span><div class="cost-text" id="attackCostText"></div></button>
      <button id="skillBtn" class="btn-action-circle">✨</button>
      <button id="dodgeBtn" class="btn-action-circle dodge-button parry-button" style="font-family: 'Orbitron', monospace, sans-serif; font-weight: 700;"><span id="parryCountText" class="parry-count-display" style="font-family: 'Orbitron', monospace, sans-serif; font-weight: 700;">3</span></button>
    `;
  }

  static positionActionButtons() {
    const ring = document.querySelector('.action-ring');
    const circle = document.querySelector('.enemy-circle-container');
    if (!ring || !circle) return;

    const rect = UIManager.getCircleRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    // Position buttons relative to the circle
    const circleRadius = Math.min(rect.width, rect.height) / 2;
    // Orbit radius for surrounding buttons (slightly outside the circle)
    const baseRadius = circleRadius + 40;
    const buttons = Array.from(ring.querySelectorAll('.btn-action-circle'));
    // We'll place the primary attack button centered at the bottom
    buttons.forEach((btn) => {
      btn.style.position = 'absolute';
      btn.style.transform = 'translate(-50%, -50%)';
      if (btn.id === 'attackBtn') {
        btn.style.left = centerX + 'px';
        btn.style.top = centerY + 'px';
      } else if (btn.id === 'skillBtn') {
        btn.style.left = (centerX - 68) + 'px';
        btn.style.top = centerY + 'px';
      } else if (btn.id === 'dodgeBtn') {
        btn.style.left = (centerX + 68) + 'px';
        btn.style.top = centerY + 'px';
      } else {
        const angleMap = {
          'skillBtn': 210,
          'dodgeBtn': 270
        };
        const deg = angleMap[btn.id] || 330;
        const rad = (deg * Math.PI) / 180;
        const x = centerX + Math.cos(rad) * baseRadius;
        const y = centerY + Math.sin(rad) * baseRadius;
        btn.style.left = x + 'px';
        btn.style.top = y + 'px';
      }
    });
  }

  static createPullTabs() {
    // Create left handles dock container
    const leftDock = document.createElement('div');
    leftDock.id = 'leftTabHandlesContainer';
    leftDock.className = 'tab-handles-dock tab-handles-dock-left';
    document.body.appendChild(leftDock);

    // Create right handles dock container
    const rightDock = document.createElement('div');
    rightDock.id = 'rightTabHandlesContainer';
    rightDock.className = 'tab-handles-dock tab-handles-dock-right';
    document.body.appendChild(rightDock);

    const leftHandle = document.createElement('button');
    leftHandle.id = 'dailiesTabHandle';
    leftHandle.className = 'tab-handle tab-handle-left';
    leftHandle.innerHTML = `<span class="icon">📅</span><span class="label">DAILIES</span><span class="badge" id="dailiesBadge"></span>`;
    leftDock.appendChild(leftHandle);

    const achievementsHandle = document.createElement('button');
    achievementsHandle.id = 'achievementsTabHandle';
    achievementsHandle.className = 'tab-handle tab-handle-left tab-handle-left-achievements';
    achievementsHandle.innerHTML = `<span class="icon">🏆</span><span class="label">ACHIEVEMENTS</span><span class="badge" id="achievementsBadge"></span>`;
    leftDock.appendChild(achievementsHandle);

    const cosmeticsHandle = document.createElement('button');
    cosmeticsHandle.id = 'cosmeticsTabHandle';
    cosmeticsHandle.className = 'tab-handle tab-handle-left tab-handle-left-cosmetics';
    cosmeticsHandle.innerHTML = `<span class="icon">✨</span><span class="label">VISUALS</span>`;
    leftDock.appendChild(cosmeticsHandle);

    const rightHandle = document.createElement('button');
    rightHandle.id = 'todosTabHandle';
    rightHandle.className = 'tab-handle tab-handle-right';
    rightHandle.innerHTML = `<span class="badge" id="todosBadge"></span><span class="label">TO-DOS</span><span class="icon">📋</span>`;
    rightDock.appendChild(rightHandle);

    const petHandle = document.createElement('button');
    petHandle.id = 'petTabHandle';
    petHandle.className = 'tab-handle tab-handle-right tab-handle-right-pet';
    petHandle.innerHTML = `<span class="badge" id="petBadge"></span><span class="label">PET EVOLUTION</span><span class="icon">🐾</span>`;
    rightDock.appendChild(petHandle);

    // Left tab - Dailies
    const leftTab = document.createElement('div');
    leftTab.id = 'dailiesPanel';
    leftTab.className = 'pull-tab left-tab';
    leftTab.innerHTML = `
      <div class="tab-header dailies-top-bar">
        <div class="tab-header-left">
          <h3 class="tab-header-title">DAILIES</h3>
        </div>
        <div class="tab-header-controls">
          <div class="header-btn-group">
            <button id="completeDayBtn" class="btn-header-action primary">Complete Day</button>
            <button id="dailiesAddBtn" class="btn-header-icon" title="Add Daily">＋ Daily</button>
            <button id="addDailyNoteBtn" class="btn-header-action">＋ Note</button>
            <button id="addDailyRectBtn" class="btn-header-action">＋ Rect</button>
          </div>
          <div class="header-divider"></div>
          <div class="header-btn-group">
            <button id="dailiesShowCompletedBtn" class="btn-header-toggle" aria-pressed="false">Completed: Off</button>
            <button id="dailiesEditModeBtn" class="btn-header-toggle" aria-pressed="false" style="display: none;">Edit: Off</button>
            <button id="dailiesLockModeBtn" class="btn-header-toggle" aria-pressed="false" style="display: none;">Lock: Off</button>
            <button id="dailiesConnectionsBtn" class="btn-header-toggle" aria-pressed="false">Connections: Off</button>
            <button id="dailiesFocusBtn" class="btn-header-toggle" aria-pressed="false" style="display: none;">Focus: Off</button>
          </div>
          <div class="header-divider"></div>
          <div class="header-btn-group">
            <select id="dailiesFilterSelect" class="header-select" title="Daily Filter & Heatmap">
              <option value="regular">Filter: Regular</option>
              <option value="streak">Filter: Streak</option>
              <option value="completion">Filter: Completion Rate</option>
              <option value="rewards">Filter: Rewards</option>
              <option value="safety">Filter: Safety</option>
            </select>
            <button id="dailiesTableViewBtn" class="btn-header-action">📋 Table</button>
          </div>
          <button class="tab-close header-close-btn" title="Close Panel">✕</button>
        </div>
      </div>
      <div class="daily-panel-summary"><span id="dailiesSummary">0/0 complete</span></div>
      <div class="tab-content daily-board" id="dailiesList"></div>
    `;
    document.body.appendChild(leftTab);

    let lastScrollTop = 0;
    leftTab.addEventListener('scroll', () => {
      const currentScrollTop = leftTab.scrollTop;
      const header = leftTab.querySelector('.tab-header');
      if (!header) return;
      if (currentScrollTop > 40 && currentScrollTop > lastScrollTop) {
        header.classList.add('header-hidden');
      } else {
        header.classList.remove('header-hidden');
      }
      lastScrollTop = Math.max(0, currentScrollTop);
    }, { passive: true });

    // Achievements & Run Stats Unified Panel
    const achievementsTab = document.createElement('div');
    achievementsTab.id = 'achievementsPanel';
    achievementsTab.className = 'pull-tab left-tab';
    achievementsTab.innerHTML = `
      <div class="tab-header run-stats-top-bar">
        <div class="tab-header-left">
          <h3 class="tab-header-title">📊 RUN STATS & ACHIEVEMENTS</h3>
        </div>
        <button class="tab-close header-close-btn" title="Close Panel">✕</button>
      </div>
      <div class="run-stats-achievements-container">
        <div class="run-stats-left-side" id="runStatsDashboard">
          <div class="run-stats-two-column-layout">
            <div class="run-stats-col-left">
              <div class="stats-radar-card">
                <div class="stats-card-header">
                  <span class="stats-card-title">PERFORMANCE RADAR</span>
                </div>
                <div class="stats-radar-wrapper">
                  <div class="stats-gas-meter-container" id="statsGasMeterSvgContainer"></div>
                  <div class="stats-radar-container" id="statsRadarSvgContainer"></div>
                </div>
              </div>
              <div id="runCompletionPanel" class="run-completion-panel embedded-stats-widget" aria-label="Run completion graph">
                <div class="run-completion-head">
                  <span>RUN COMPLETION</span>
                  <span id="runCompletionRate">0%</span>
                </div>
                <svg id="runCompletionGraph" viewBox="0 0 160 56" preserveAspectRatio="none" aria-hidden="true"></svg>
              </div>
              <div id="weeklyHeatmapPanel" class="weekly-heatmap-panel embedded-stats-widget" aria-label="Consistency Heatmap">
                <div class="weekly-heatmap-head">
                  <span>CONSISTENCY HEATMAP</span>
                  <button id="weeklyHeatmapCollapseBtn" class="stage-notes-collapse-btn" style="display:none;">－</button>
                </div>
                <div class="weekly-heatmap-body" id="weeklyHeatmapBody"></div>
              </div>
            </div>
            <div class="run-stats-col-right">
              <div class="stats-highlights-card">
                <div class="highlight-stat-box highlight-diamonds" id="flapDiamondBox" title="Max Diamonds">
                  <span class="highlight-stat-label">💎 MAX DIAMONDS</span>
                  <span class="highlight-stat-val" id="statsDiamondVelocity">0</span>
                </div>
                <div class="highlight-stat-box highlight-ap" id="flapApBox" title="Max AP">
                  <span class="highlight-stat-label">⚡ MAX AP</span>
                  <span class="highlight-stat-val" id="statsApVelocity">0</span>
                </div>
                <div class="highlight-stat-box highlight-streak" id="flapStreakBox" title="Streak Multiplier">
                  <span class="highlight-stat-label">🔥 STREAK</span>
                  <span class="highlight-stat-val" id="statsStreakVal">0 (x1.0)</span>
                </div>
                <div class="highlight-stat-box highlight-ratio" title="Avg Damage Dealt / Taken">
                  <span class="highlight-stat-label">⚔️ AVG DEALT / TAKEN</span>
                  <span class="highlight-stat-val"><span id="statsDmgDealtAvg">0.0</span> / <span id="statsDmgTakenAvg">0.0</span></span>
                </div>
              </div>
              <div class="stats-section-title">DETAILED METRICS</div>
              <div class="expanded-stats-grid compact-split-grid">
                <div class="stat-card"><span class="stat-card-label">Total Damage Dealt</span><span class="stat-card-val" id="statTotalDmgDealt">0</span></div>
                <div class="stat-card"><span class="stat-card-label">Total Damage Taken</span><span class="stat-card-val" id="statTotalDmgTaken">0</span></div>
                <div class="stat-card"><span class="stat-card-label">Critical Hits</span><span class="stat-card-val" id="statTotalCrits">0</span></div>
                <div class="stat-card"><span class="stat-card-label">Total AP Spent</span><span class="stat-card-val" id="statTotalApSpent">0</span></div>
                <div class="stat-card"><span class="stat-card-label">Total Mana Restored</span><span class="stat-card-val" id="statTotalManaRestored">0</span></div>
                <div class="stat-card"><span class="stat-card-label">Stage Win Rate</span><span class="stat-card-val" id="statStageWinRate">100%</span></div>
                <div class="stat-card"><span class="stat-card-label">Task Completion Rate</span><span class="stat-card-val" id="statTaskCompletionRate">0%</span></div>
                <div class="stat-card"><span class="stat-card-label">Focus Minutes</span><span class="stat-card-val" id="statTotalFocusMins">0 min</span></div>
                <div class="stat-card"><span class="stat-card-label">Bosses Defeated</span><span class="stat-card-val" id="statBossesDefeated">0</span></div>
                <div class="stat-card"><span class="stat-card-label">Overkill Damage Total</span><span class="stat-card-val" id="statOverkillDamage">0</span></div>
                <div class="stat-card"><span class="stat-card-label">Dodges Succeeded</span><span class="stat-card-val" id="statDodgesSucceeded">0</span></div>
                <div class="stat-card"><span class="stat-card-label">Enemies Slain</span><span class="stat-card-val" id="statEnemiesSlain">0</span></div>
              </div>
            </div>
          </div>
        </div>
        <div class="achievements-right-side">
          <div class="achievements-compact-header">
            <h4 class="achievements-title">🏆 ACHIEVEMENTS</h4>
            <div class="header-btn-group">
              <select id="achievementsSortSelect" class="header-select" title="Sort Achievements">
                <option value="rate">Sort: Rate</option>
                <option value="streak">Sort: Streak</option>
              </select>
              <button id="achievementsRecalculateBtn" class="btn-header-action" title="Recalculate Stats">Recalc</button>
            </div>
          </div>
          <div class="tab-content achievement-board" id="achievementsList"></div>
        </div>
      </div>
    `;
    document.body.appendChild(achievementsTab);

    // Cosmetics Panel
    const cosmeticsTab = document.createElement('div');
    cosmeticsTab.id = 'cosmeticsPanel';
    cosmeticsTab.className = 'pull-tab left-tab';
    cosmeticsTab.innerHTML = `
      <div class="tab-header" style="flex-direction: column; align-items: stretch; gap: 8px;">
        <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
          <h3>✨ COSMETICS</h3>
          <button class="tab-close">✕</button>
        </div>
        <div class="cosmetics-tabs">
          <button class="cosmetics-tab-btn active" data-subtab="death">DEATH EFFECTS</button>
          <button class="cosmetics-tab-btn" data-subtab="completion">COMPLETION</button>
        </div>
      </div>
      <div class="tab-content cosmetics-board" id="cosmeticsList" style="flex: 1 1 auto; overflow-y: auto;"></div>
    `;
    document.body.appendChild(cosmeticsTab);

    // Bind sub-tabs event listeners
    cosmeticsTab.querySelectorAll('.cosmetics-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        UIManager.activeCosmeticsSubtab = e.currentTarget.dataset.subtab;
        UIManager.updateCosmeticsList();
      });
    });

    // Right tab - To-Dos
    const rightTab = document.createElement('div');
    rightTab.id = 'todosPanel';
    rightTab.className = 'pull-tab right-tab';
    rightTab.innerHTML = `
      <div class="tab-header">
        <h3>TO-DOS</h3>
        <div style="display: flex; align-items: center; gap: 6px;">
          <select id="todosDifficultyFilter" class="btn-add btn-toggle btn-toggle-pill btn-toggle-compact" style="font-family: inherit; font-size: 8px; padding: 4px 8px; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.15); border-radius: 999px; color: #f5f5f7; cursor: pointer; width: auto; height: auto;">
            <option value="All">All Diff</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
            <option value="Ultra">Ultra</option>
          </select>
          <select id="addTodoNoteBtn" class="btn-add btn-toggle btn-toggle-pill btn-toggle-compact" style="font-family: inherit; font-size: 8px; padding: 4px 8px; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.15); border-radius: 999px; color: #f5f5f7; cursor: pointer; width: auto; height: auto;">
            <option value="" disabled selected>＋ Add Note/Sticker</option>
            <option value="note">＋ Text Note</option>
            <option value="grid">＋ Grid Board</option>
            <option value="arrow">＋ Arrow Line</option>
            <option value="calendar">＋ Calendar</option>
          </select>
          <button id="todosEraserBtn" class="btn-add btn-toggle btn-toggle-pill btn-toggle-compact" style="font-family: inherit; font-size: 8px; padding: 4px 8px; border-radius: 999px; cursor: pointer; width: auto; height: auto;">Eraser: OFF</button>
          <button id="todosShowCompletedBtn" class="btn-add btn-toggle btn-toggle-pill btn-toggle-compact" aria-pressed="false">Completed: off</button>
          <button class="tab-close">✕</button>
        </div>
      </div>
      <div class="quick-day-bar" id="quickDayBar">
        <span class="quick-day-label">⚡ Quick Day:</span>
        <button id="quickDayBtn" class="quick-day-value">Not set</button>
        <button id="quickDayClearBtn" class="quick-day-clear" title="Clear quick day">✕</button>
      </div>
      <div class="tab-content todo-board" id="todosList"></div>
    `;
    document.body.appendChild(rightTab);

    // Screen Border Countdown Bar
    const borderTimerBar = document.createElement('div');
    borderTimerBar.id = 'screenBorderCountdown';
    borderTimerBar.className = 'screen-border-countdown-bar';
    borderTimerBar.style.display = 'none';
    borderTimerBar.innerHTML = `
      <div class="border-timer-inner">
        <span class="border-timer-icon">⏱️</span>
        <span class="border-timer-text" id="borderTimerText">Focusing: 25:00</span>
        <button class="border-timer-cancel" id="borderTimerCancelBtn" title="Stop Focus">✕</button>
      </div>
    `;
    document.body.appendChild(borderTimerBar);

    // Pet Evolution Panel
    const petTab = document.createElement('div');
    petTab.id = 'petPanel';
    petTab.className = 'pull-tab right-tab';
    petTab.innerHTML = `
      <div class="tab-header pet-top-bar">
        <div class="tab-header-left">
          <h3 class="tab-header-title">🐾 PET EVOLUTION</h3>
        </div>
        <button class="tab-close header-close-btn" title="Close Panel">✕</button>
      </div>
      <div class="tab-content pet-board">
        <!-- Main Pet Hero Status Card -->
        <div class="pet-hero-card">
          <div id="petImageContainer" class="pet-avatar-frame">
            <input type="file" id="petImageFileInput" accept="image/*" class="pet-file-input">
            <div id="petImageDisplay" class="pet-avatar-display"></div>
          </div>
          
          <div class="pet-avatar-actions">
            <button id="petUploadBtn" class="btn-header-action">Upload Pic</button>
            <button id="petClearImageBtn" class="btn-header-action ghost" style="display: none;">Reset Pic</button>
          </div>

          <div class="pet-stats-summary">
            <div class="pet-level-badge">
              <span class="pet-level-label">LEVEL</span>
              <span class="pet-level-val" id="petLevelVal">1</span>
            </div>
            <div class="pet-points-badge">
              <span class="pet-points-val" id="petPointsVal">0</span> 🐾 POINTS
            </div>
            <div class="pet-stat-chip">
              Bonus Dmg: +<span id="petDmgBonusVal">0</span>
            </div>
          </div>

          <div class="pet-hunger-container">
            <div class="pet-hunger-header">
              <span class="pet-hunger-label">🍖 HUNGER STATUS</span>
              <span id="petHungerTextVal" class="pet-hunger-val">100/100</span>
            </div>
            <div class="pet-progress-track">
              <div id="petHungerFill" class="pet-progress-fill"></div>
            </div>
          </div>
          
          <button id="petUpgradeBtn" class="btn-pause-action primary-action pet-upgrade-btn">
            Upgrade Pet (+<span id="petUpgradeCostVal">5</span> Pts)
          </button>
        </div>

        <!-- Section: Select Avatar Emoji -->
        <div class="pet-section">
          <span class="pet-section-title">SELECT EMOJI AVATAR</span>
          <div id="petEmojiGrid" class="pet-emoji-grid"></div>
        </div>

        <!-- Section: Feed Pet -->
        <div class="pet-section">
          <span class="pet-section-title">FEED PET</span>
          <div id="petFoodGrid" class="pet-food-grid"></div>
        </div>

        <!-- Section: Pet Animations -->
        <div class="pet-section">
          <div class="pet-section-header">
            <span class="pet-section-title">PET ANIMATIONS</span>
            <span class="pet-section-sub">Cost: 50% maxpp (<span id="petAnimCostVal">?</span> Pts)</span>
          </div>
          <div id="petAnimGrid" class="pet-anim-grid"></div>
        </div>
      </div>
    `;
    document.body.appendChild(petTab);
  }

  static createShopPanel() {
    // Fullscreen-centered split shop panel
    const overlay = document.createElement('div');
    overlay.id = 'shopOverlay';
    overlay.className = 'shop-overlay';
    // Start hidden and non-interactive so it doesn't intercept clicks
    overlay.style.display = 'none';
    overlay.style.pointerEvents = 'none';

    const panel = document.createElement('div');
    panel.id = 'shopPanel';
    panel.className = 'shop-panel';
    panel.innerHTML = `
      <div class="shop-header">
        <div>
          <h3 style="margin:0;">🛒 SHOP</h3>
          <div style="font-size:11px;color:var(--text-muted)">Buy Weapons (Smith) and Consumables (Shelf)</div>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <div class="shop-balance" id="shopGold">Gold: 0</div>
          <div class="shop-close">✕</div>
        </div>
      </div>
      <div class="shop-body">
        <div class="shop-column" id="shopSmith">
          <h4>SMITH (Weapons)</h4>
          <div class="shop-list" id="shopSmithList"></div>
        </div>
        <div class="shop-column" id="shopShelf">
          <h4>CONSUMABLES (Shelf)</h4>
          <div class="shop-list" id="shopShelfList"></div>
        </div>
      </div>
    `;

    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    const bottomBar = document.createElement('div');
    bottomBar.id = 'bottomButtonsContainer';
    bottomBar.className = 'bottom-buttons-container';

    const shopBtn = document.createElement('button');
    shopBtn.id = 'shopBtn';
    shopBtn.className = 'floating-shop-btn';
    shopBtn.innerHTML = '🛒 SHOP';
    bottomBar.appendChild(shopBtn);

    const centerAttrBtn = document.createElement('button');
    centerAttrBtn.id = 'centerAttrBtn';
    centerAttrBtn.className = 'floating-attr-btn';
    centerAttrBtn.title = 'Attributes';
    centerAttrBtn.innerHTML = '📋 ATTR';
    bottomBar.appendChild(centerAttrBtn);

    const lootboxBtn = document.createElement('button');
    lootboxBtn.id = 'lootboxBtn';
    lootboxBtn.className = 'floating-lootbox-btn';
    const state = getGameState();
    const keys = state?.playerState?.lootboxKeys || 0;
    lootboxBtn.innerHTML = `🎁 LOOTBOX (${keys})`;
    bottomBar.appendChild(lootboxBtn);

    document.body.appendChild(bottomBar);

    panel.querySelector('.shop-close').addEventListener('click', () => this.closeShop());
    // close when clicking overlay outside the panel
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.closeShop();
    });
  }

  static openShop() {
    const overlay = document.getElementById('shopOverlay');
    if (!overlay) return;
    overlay.style.display = 'flex';
    overlay.style.pointerEvents = 'auto';
    try {
      PopupsManager.showConfiguredDialogue('shopOpen', {
        text: 'text'
      }, 'shopOpen:first');
    } catch (e) { }
    // generate offers once per open so consumables/weapons don't reroll on purchase
    try { if (ShopManager && typeof ShopManager.generateShopOffers === 'function') ShopManager.generateShopOffers(); } catch (e) { }
    this.buildShopItems();
  }

  static buildShopItems() {
    const gs = getGameState();
    if (!gs) return;

    const iconMap = gs.config?.shopItemIcons || {};
    const longPressMs = Number(gs.config?.shopLongPressMs) || 450;
    const iconFor = (name, fallback = '🧩') => iconMap[name] || fallback;
    const bindLongPressDetails = (row, itemData) => {
      let pressTimer = null;
      let longPressed = false;

      const openDetails = () => {
        longPressed = true;
        try { PopupsManager.showShopItemDetails(itemData); } catch (e) { }
      };

      const startPress = (e) => {
        if (e) e.preventDefault();
        longPressed = false;
        clearTimeout(pressTimer);
        pressTimer = setTimeout(openDetails, longPressMs);
      };

      const endPress = () => {
        clearTimeout(pressTimer);
      };

      row.addEventListener('mousedown', startPress);
      row.addEventListener('touchstart', startPress, { passive: false });
      row.addEventListener('mouseup', endPress);
      row.addEventListener('mouseleave', endPress);
      row.addEventListener('touchend', endPress);
      row.addEventListener('touchcancel', endPress);

      // Click also opens details for desktop usability; buy remains popup-only.
      row.addEventListener('click', () => {
        if (longPressed) return;
        openDetails();
      });
    };

    // Update header gold
    const goldEl = document.getElementById('shopGold');
    if (goldEl) goldEl.textContent = `Gold: ${Math.ceil(gs.playerState.gold || 0)}`;

    // Smith (weapons)
    const smithList = document.getElementById('shopSmithList');
    const shelfList = document.getElementById('shopShelfList');
    if (!smithList || !shelfList) return;
    smithList.innerHTML = '';
    shelfList.innerHTML = '';

    try {
      if (ShopManager && ShopManager.getAvailableWeapons) {
        const weapons = ShopManager.getAvailableWeapons() || [];
        weapons.forEach(name => {
          const weaponCfg = gs.config && gs.config.weapons && gs.config.weapons[name];
          const price = ShopManager.getWeaponPrice ? ShopManager.getWeaponPrice(name) : (weaponCfg?.price || 0);
          const detail = weaponCfg?.detail || weaponCfg?.special || '';
          const row = document.createElement('div');
          row.className = 'shop-item shop-item-tile';
          const weaponIconHtml = UIManager.getWeaponIconHtml(name, iconFor(name, iconMap.smith || '⚒️'));
          row.innerHTML = `
            <div class="shop-item-icon">${weaponIconHtml}</div>
            <div class="shop-item-meta">
              <div class="shop-item-name">${name}</div>
              <div class="shop-item-price">💰 ${String(price || 0)}</div>
            </div>
          `;
          smithList.appendChild(row);

          const buyWeapon = () => {
            try {
              if (typeof PopupsManager !== 'undefined' && PopupsManager && typeof PopupsManager.showWeaponElementChoice === 'function') {
                PopupsManager.showWeaponElementChoice(name, (element) => {
                  const res = ShopManager.buyWeapon ? ShopManager.buyWeapon(name, element) : { success: false, reason: 'not_implemented' };
                  console.log('Shop buyWeapon response', name, element, res);
                  if (res && res.success) {
                    FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2, `Purchased ${name}`, { color: UIManager.themeColor('--accent-gold', '#FFB33F') });
                    this.buildShopItems();
                    return;
                  }

                  const reason = res?.reason || 'unknown';
                  if (reason === 'inventory_full' || res?.needsDiscard) {
                    try {
                      if (typeof PopupsManager !== 'undefined' && PopupsManager && typeof PopupsManager.showWeaponDiscard === 'function') {
                        PopupsManager.showWeaponDiscard(name, element);
                        return;
                      }
                    } catch (e) { console.warn('Failed to open discard popup', e); }
                  }

                  let msg = 'Cannot buy';
                  if (reason === 'no_gold') msg = 'Not enough gold';
                  else if (reason === 'inventory_full') msg = 'Inventory full — discard to replace';
                  else if (reason === 'not_found') msg = 'Item not found';
                  else if (reason === 'no_player_manager') msg = 'Player system unavailable';
                  else if (reason === 'not_implemented') msg = 'Buy not implemented';
                  FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2, msg, { color: UIManager.themeColor('--danger-red', '#C00707') });
                });
              }
            } catch (e) { console.warn('Failed to open element chooser', e); }
            return false;
          };

          bindLongPressDetails(row, {
            name,
            icon: iconFor(name, iconMap.smith || '⚒️'),
            desc: `AP:${weaponCfg?.baseAp || weaponCfg?.BaseAP || '-'} · ×${weaponCfg?.damageMultiplier || weaponCfg?.dmgMult || weaponCfg?.dmg || '-'} · Crit:${weaponCfg?.crit || weaponCfg?.critPct || '-'}%`,
            detail,
            price,
            onBuy: buyWeapon
          });
        });
        // After listing offered weapons, show smith upgrade entry
        try {
          const upgrade = ShopManager.getSmithUpgrade ? ShopManager.getSmithUpgrade() : null;
          if (upgrade) {
            const upRow = document.createElement('div');
            upRow.className = 'shop-item shop-item-tile shop-upgrade';
            upRow.innerHTML = `
              <div class="shop-item-icon">${iconFor(upgrade.name, iconMap.smith || '⚒️')}</div>
              <div class="shop-item-meta">
                <div class="shop-item-name">${upgrade.name}</div>
                <div class="shop-item-price">💰 ${upgrade.price}</div>
              </div>
            `;
            smithList.appendChild(upRow);
            const buyUpgrade = () => {
              const res = ShopManager.purchase ? ShopManager.purchase(upgrade.id) : { success: false, reason: 'not_implemented' };
              console.log('Shop purchase upgrade response', upgrade.id, res);
              if (res && res.success) {
                FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2, `Purchased ${upgrade.name}`, { color: UIManager.themeColor('--accent-gold', '#FFB33F') });
                this.buildShopItems();
                return true;
              } else {
                const reason = res?.reason || 'unknown';
                let msg = 'Cannot buy';
                if (reason === 'no_gold') msg = 'Not enough gold';
                FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2, msg, { color: UIManager.themeColor('--danger-red', '#C00707') });
                return false;
              }
            };
            bindLongPressDetails(upRow, {
              name: upgrade.name,
              icon: iconFor(upgrade.name, iconMap.smith || '⚒️'),
              desc: upgrade.desc,
              price: upgrade.price,
              onBuy: buyUpgrade
            });
          }
        } catch (e) { console.warn('Failed to render smith upgrade', e); }
      }

      // Consumables: use ShopManager.getAvailableConsumables and pricing rules from blueprint
      const isConsumablesUnlocked = (typeof TaskManager !== 'undefined' && typeof TaskManager.isFeatureUnlocked === 'function')
        ? TaskManager.isFeatureUnlocked('consumables')
        : true;

      if (!isConsumablesUnlocked && shelfList) {
        shelfList.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--accent-gold); font-weight: bold;"><span style="font-size: 24px; display: block; margin-bottom: 8px;">🔒</span>Unlocks at Streak 3</div>';
      } else if (ShopManager && ShopManager.getAvailableConsumables) {
        const consumables = [...new Set([
          'Health Potion',
          'Mana Potion',
          ...(ShopManager.getAvailableConsumables() || [])
        ])];
        consumables.forEach(name => {
          const price = ShopManager.getConsumablePrice ? ShopManager.getConsumablePrice(name) : 0;
          const row = document.createElement('div');
          row.className = 'shop-item shop-item-tile';
          row.innerHTML = `
            <div class="shop-item-icon">${iconFor(name, iconMap.consumable || '🧪')}</div>
            <div class="shop-item-meta">
              <div class="shop-item-name">${name}</div>
              <div class="shop-item-price">💰 ${String(price || 0)}</div>
            </div>
          `;
          shelfList.appendChild(row);

          const buyConsumable = () => {
            const res = ShopManager.buyConsumable ? ShopManager.buyConsumable(name, 1) : { success: false, reason: 'not_implemented' };
            console.log('Shop buyConsumable response', name, res);
            if (res && res.success) {
              FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2, `Purchased ${name}`, { color: UIManager.themeColor('--accent-gold', '#FFB33F') });
              this.buildShopItems();
              return true;
            } else {
              const reason = res?.reason || 'unknown';
              let msg = 'Cannot buy';
              if (reason === 'no_gold') msg = 'Not enough gold';
              else if (reason === 'inventory_full') msg = 'Consumable inventory full';
              else if (reason === 'not_found') msg = 'Item not found';
              else if (reason === 'no_player_manager') msg = 'Player system unavailable';
              else if (reason === 'not_implemented') msg = 'Buy not implemented';
              FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2, msg, { color: UIManager.themeColor('--danger-red', '#C00707') });
              return false;
            }
          };

          bindLongPressDetails(row, {
            name,
            icon: iconFor(name, iconMap.consumable || '🧪'),
            desc: `Consumable effect: ${gs.config?.consumables?.[name]?.effect || 'text'}`,
            price,
            onBuy: buyConsumable
          });
        });
      }
    } catch (e) { console.warn('buildShopItems error', e); }
  }

  static closeShop() {
    const overlay = document.getElementById('shopOverlay');
    if (!overlay) return;
    overlay.style.display = 'none';
    overlay.style.pointerEvents = 'none';
  }

  static toggleShopPanel() {
    const overlay = document.getElementById('shopOverlay');
    if (!overlay) return;
    if (overlay.style.display === 'flex') this.closeShop(); else this.openShop();
  }

  static renderShop() {
    const content = document.getElementById('shopContent');
    if (!content) return;
    const gs = getGameState();
    const catalog = (typeof ShopManager !== 'undefined' && ShopManager && typeof ShopManager.getCatalog === 'function')
      ? ShopManager.getCatalog()
      : [
        { id: 's_word_upgrade', name: 'Sword Upgrade', desc: 'Increase Rusty Sword damage +10%', price: 50, type: 'weapon_upgrade' },
        { id: 'Health Potion', name: 'Health Potion', desc: 'Heals 30 HP instantly', price: 1, type: 'consumable' },
        { id: 'Mana Potion', name: 'Mana Potion', desc: 'Restores 50 Mana instantly', price: 1, type: 'consumable' },
        { id: 's_heal_potion', name: 'Heal Potion', desc: 'Heals 20 HP on use', price: 25, type: 'consumable' },
        { id: 's_ap_potion', name: 'AP Tonic', desc: 'Grants +30 AP instantly', price: 40, type: 'consumable' },
        { id: 's_killtag', name: 'Kill Tag Pack', desc: 'Grants 1 Kill Tag for smith upgrades', price: 80, type: 'currency', amount: 1 }
      ];
    content.innerHTML = '';
    const gold = gs.playerState.gold || 0;
    const header = document.createElement('div');
    header.className = 'shop-balance';
    header.textContent = `Gold: ${Math.ceil(gold)}`;
    content.appendChild(header);

    catalog.forEach(item => {
      const row = document.createElement('div');
      row.className = 'shop-item';
      row.dataset.id = item.id;
      row.innerHTML = `
        <div class="shop-item-left">
          <div class="shop-item-name">${item.name}</div>
          <div class="shop-item-desc">${item.desc}</div>
        </div>
        <div class="shop-item-right">
          <div class="shop-item-price">${item.price}</div>
          <button class="shop-buy btn-small">Buy</button>
        </div>
      `;
      content.appendChild(row);
      row.querySelector('.shop-buy').addEventListener('click', (e) => {
        e.stopPropagation();
        try {
          let res = null;
          if (typeof ShopManager !== 'undefined' && ShopManager && typeof ShopManager.purchase === 'function') {
            if (item.id && item.id.startsWith('weapon_')) {
              const weaponName = item.id.replace('weapon_', '');
              res = ShopManager.buyWeapon ? ShopManager.buyWeapon(weaponName) : { success: false, reason: 'not_implemented' };
            } else if (item.id && item.id.startsWith('consumable_')) {
              const consumableName = item.id.replace('consumable_', '');
              res = ShopManager.buyConsumable ? ShopManager.buyConsumable(consumableName, 1) : ShopManager.purchase(item.id);
            } else {
              res = ShopManager.purchase(item.id);
            }
          } else {
            // fallback purchase logic
            const gs = getGameState();
            if ((gs.playerState.gold || 0) < item.price) {
              res = { success: false, reason: 'no_gold' };
            } else {
              gs.setGold((gs.playerState.gold || 0) - item.price);
              if (item.type === 'consumable') {
                gs.playerState.consumables = gs.playerState.consumables || {};
                gs.playerState.consumables[item.id] = (gs.playerState.consumables[item.id] || 0) + 1;
              } else if (item.type === 'currency') {
                gs.playerState.killTags = (gs.playerState.killTags || 0) + (item.amount || 1);
              } else if (item.type === 'weapon_upgrade') {
                gs.addBuff(item.id);
              }
              gs.save();
              res = { success: true, item };
            }
          }
          if (res && res.success) {
            FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2, `Purchased ${item.name}`, { color: UIManager.themeColor('--accent-gold', '#FFB33F') });
            this.renderShop();
          } else {
            const reason = res?.reason || 'unknown';
            if (reason === 'inventory_full' || res?.needsDiscard) {
              const weaponName = item.id && item.id.startsWith('weapon_') ? item.id.replace('weapon_', '') : item.name;
              try {
                if (typeof PopupsManager !== 'undefined' && PopupsManager && typeof PopupsManager.showWeaponDiscard === 'function') {
                  PopupsManager.showWeaponDiscard(weaponName);
                  return;
                }
              } catch (e) { console.warn('Failed to open discard popup', e); }
            }

            let msg = 'Not enough gold';
            if (reason === 'inventory_full') msg = 'Inventory full — discard to replace';
            else if (reason === 'not_found') msg = 'Item not found';
            else if (reason === 'no_player_manager') msg = 'Player system unavailable';
            else if (reason === 'not_implemented') msg = 'Buy not implemented';
            FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2, msg, { color: UIManager.themeColor('--danger-red', '#C00707') });
          }
        } catch (err) { console.warn('Purchase failed', err); }
      });
    });
  }

  static enterFocusMode() {
    document.body.classList.add('focus-mode-active');
    const whitelist = [
      'focusOverlay',
      'focus-clock-popup',
      'focus-mini-widget',
      'navHamburgerBtn',
      'navRefreshBtn',
      'navMenuPanel',
      'gameContainer'
    ];

    const hideEl = (el) => {
      if (!el || whitelist.includes(el.id)) return;
      if (el.dataset.originalDisplay === undefined) {
        el.dataset.originalDisplay = el.style.display || '';
      }
      el.style.display = 'none';
    };

    const processHierarchy = (el) => {
      if (!el) return;
      if (whitelist.includes(el.id)) return;
      
      const containsWhitelisted = whitelist.some(id => el.querySelector('#' + id) !== null);
      if (containsWhitelisted) {
        Array.from(el.children).forEach(processHierarchy);
      } else {
        hideEl(el);
      }
    };

    Array.from(document.body.children).forEach(processHierarchy);
    const gameContainer = document.getElementById('gameContainer');
    if (gameContainer) {
      Array.from(gameContainer.children).forEach(processHierarchy);
    }
  }

  static openFullscreenTimer(task, taskType) {
    if (!task) return;
    let container = document.getElementById('nemesisFullscreenTimerOverlay');
    if (container) container.remove();

    container = document.createElement('div');
    container.id = 'nemesisFullscreenTimerOverlay';
    container.className = 'nemesis-fullscreen-timer-overlay';

    // Time detection: extract duration in seconds from name using TaskManager.parseMetadata
    let durationSeconds = 300; // 5 mins fallback default
    const nameStr = task.name || '';

    // Check for HH:MM:SS or MM:SS pattern (e.g. 15:00 or 01:30:00)
    const timeColonMatch = nameStr.match(/\b(?:(\d{1,2}):)?(\d{1,2}):(\d{2})\b/);
    if (timeColonMatch) {
      if (timeColonMatch[1] !== undefined) {
        durationSeconds = parseInt(timeColonMatch[1], 10) * 3600 + parseInt(timeColonMatch[2], 10) * 60 + parseInt(timeColonMatch[3], 10);
      } else {
        durationSeconds = parseInt(timeColonMatch[2], 10) * 60 + parseInt(timeColonMatch[3], 10);
      }
    } else {
      // Check explicit numbers with time unit suffix (e.g., 25mins, 10 min, 1h, 45m, 30s)
      const secsMatch = nameStr.match(/\b(\d+)\s*(secs?|seconds?|s)\b/i);
      const minsMatch = nameStr.match(/\b(\d+)\s*(mins?|minutes?|m)\b/i);
      const hrsMatch = nameStr.match(/\b(\d+)\s*(hrs?|hours?|h)\b/i);
      if (secsMatch) {
        durationSeconds = parseInt(secsMatch[1], 10);
      } else if (minsMatch) {
        durationSeconds = parseInt(minsMatch[1], 10) * 60;
      } else if (hrsMatch) {
        durationSeconds = parseInt(hrsMatch[1], 10) * 3600;
      }
    }

    let currentSeconds = durationSeconds;
    let isRunning = true;
    let timerInterval = null;

    const formatTime = (totalSecs) => {
      const hrs = Math.floor(totalSecs / 3600);
      const mins = Math.floor((totalSecs % 3600) / 60);
      const secs = totalSecs % 60;
      if (hrs > 0) {
        return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      }
      return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    const cleanTaskName = task.name ? task.name.replace(/\b(\d+)\s*(mins?|minutes?|hrs?|hours?|secs?|seconds?|[mh])\b/gi, '').trim() : 'Task Timer';

    const subtasks = task.subtasks || [];
    const subtasksHTML = subtasks.length > 0 ? `
      <div class="nft-subtasks-list">
        ${subtasks.map(st => `
          <label class="nft-subtask-item ${st.completed ? 'completed' : ''}">
            <input type="checkbox" class="nft-subtask-checkbox" data-subtask-id="${st.id}" ${st.completed ? 'checked' : ''} />
            <span>${st.name}</span>
          </label>
        `).join('')}
      </div>
    ` : '';

    container.innerHTML = `
      <button class="nft-btn-close" id="nftCloseBtn">&times;</button>
      <div class="nft-task-name">${cleanTaskName || task.name}</div>
      ${subtasksHTML}
      <div class="nft-clock" id="nftClockDisplay" title="Click to edit timer duration" style="cursor: pointer;">${formatTime(currentSeconds)}</div>
      <div class="nft-controls">
        <button class="nft-btn" id="nftRestBtn">+5 Mins Rest</button>
        <button class="nft-btn nft-btn-primary" id="nftCompleteBtn">Complete</button>
      </div>
    `;

    document.body.appendChild(container);

    const clockDisplay = container.querySelector('#nftClockDisplay');
    const closeBtn = container.querySelector('#nftCloseBtn');
    const restBtn = container.querySelector('#nftRestBtn');
    const completeBtn = container.querySelector('#nftCompleteBtn');

    // Click clock display to edit duration
    clockDisplay.addEventListener('click', () => {
      const currentMins = Math.ceil(currentSeconds / 60) || 5;
      const input = prompt('Enter timer duration in minutes (or MM:SS):', `${currentMins}`);
      if (input !== null && input.trim() !== '') {
        const val = input.trim();
        if (val.includes(':')) {
          const parts = val.split(':').map(p => parseInt(p, 10));
          if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            currentSeconds = parts[0] * 60 + parts[1];
          } else if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
            currentSeconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
          }
        } else {
          const num = parseInt(val, 10);
          if (!isNaN(num) && num > 0) {
            currentSeconds = num * 60;
          }
        }
        clockDisplay.textContent = formatTime(currentSeconds);
      }
    });

    const triggerCompletion = () => {
      if (timerInterval) clearInterval(timerInterval);
      container.remove();
      const state = getGameState();
      if (taskType === 'daily') {
        const res = TaskManager.completeDaily(task.id);
        if (res && res.success) {
          try { FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2, 'Timer Complete! Daily Finished ⚡', { color: '#a855f7', scale: 1.5 }); } catch (e) {}
        }
        UIManager.scheduleUpdateDailiesList();
      } else {
        const res = TaskManager.completeTodo(task.id);
        if (res && res.success) {
          try { FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2, 'Timer Complete! To-Do Finished ⚡', { color: '#a855f7', scale: 1.5 }); } catch (e) {}
        }
        UIManager.updateTodosList();
      }
      try { state.save(); } catch (e) {}
      UIManager.renderEnemies();
    };

    const updateClock = () => {
      if (!isRunning) return;
      currentSeconds--;
      if (currentSeconds <= 0) {
        currentSeconds = 0;
        clockDisplay.textContent = formatTime(0);
        triggerCompletion();
        return;
      }
      clockDisplay.textContent = formatTime(currentSeconds);
    };

    timerInterval = setInterval(updateClock, 1000);

    // Rest button pauses main timer & starts 5 min rest timer
    let isResting = false;
    let restSeconds = 300;
    restBtn.addEventListener('click', () => {
      if (!isResting) {
        isResting = true;
        isRunning = false; // Pause main countdown
        restSeconds = 300; // 5 mins
        restBtn.textContent = 'Resume Task';
        restBtn.style.background = '#a855f7';
        restBtn.style.color = '#ffffff';
        clockDisplay.textContent = `REST ${formatTime(restSeconds)}`;
      } else {
        isResting = false;
        isRunning = true; // Resume main countdown
        restBtn.textContent = '+5 Mins Rest';
        restBtn.style.background = '';
        restBtn.style.color = '';
        clockDisplay.textContent = formatTime(currentSeconds);
      }
    });

    const updateRestClock = () => {
      if (isResting) {
        restSeconds--;
        if (restSeconds <= 0) {
          restSeconds = 0;
          isResting = false;
          isRunning = true;
          restBtn.textContent = '+5 Mins Rest';
          restBtn.style.background = '';
          restBtn.style.color = '';
          clockDisplay.textContent = formatTime(currentSeconds);
        } else {
          clockDisplay.textContent = `REST ${formatTime(restSeconds)}`;
        }
      }
    };
    setInterval(updateRestClock, 1000);

    // Subtask checkbox clicks inside timer overlay
    container.querySelectorAll('.nft-subtask-checkbox').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const subtaskId = e.target.dataset.subtaskId;
        const item = e.target.closest('.nft-subtask-item');
        if (taskType === 'todo') {
          TaskManager.toggleSubtask(task.id, subtaskId);
          UIManager.updateTodosList();
        }
        if (e.target.checked) item?.classList.add('completed');
        else item?.classList.remove('completed');
        try { getGameState().save(); } catch (err) {}
      });
    });

    completeBtn.addEventListener('click', () => {
      triggerCompletion();
    });

    closeBtn.addEventListener('click', () => {
      if (timerInterval) clearInterval(timerInterval);
      container.remove();
    });
  }

  static exitFocusMode() {
    document.body.classList.remove('focus-mode-active');

    const restoreEl = (el) => {
      if (!el) return;
      if (el.dataset.originalDisplay !== undefined) {
        el.style.display = el.dataset.originalDisplay;
        delete el.dataset.originalDisplay;
      }
      Array.from(el.children).forEach(restoreEl);
    };

    Array.from(document.body.children).forEach(restoreEl);
  }

  static setupJoystickModeToggle() {
    let container = document.getElementById('nemesisJoystick');
    if (!container) {
      container = document.createElement('div');
      container.id = 'nemesisJoystick';
      container.className = 'nemesis-joystick-container nemesis-5-joystick';
      container.innerHTML = `
        <div class="nemesis-joystick-track">
          <div class="nemesis-joystick-label" id="jsLabelLock" style="cursor: pointer;">LOCK</div>
          <div class="nemesis-joystick-label" id="jsLabelDefault" style="cursor: pointer;">DEF</div>
          <div class="nemesis-joystick-label" id="jsLabelEdit" style="cursor: pointer;">EDIT</div>
          <div class="nemesis-joystick-label" id="jsLabelTime" style="cursor: pointer;">TIME</div>
          <div class="nemesis-joystick-label" id="jsLabelOath" style="cursor: pointer;">OATH</div>
          <div class="nemesis-joystick-handle" id="jsHandle"></div>
        </div>
      `;
      document.body.appendChild(container);
    }

    const handle = container.querySelector('#jsHandle');
    const labelLock = container.querySelector('#jsLabelLock');
    const labelDefault = container.querySelector('#jsLabelDefault');
    const labelEdit = container.querySelector('#jsLabelEdit');
    const labelTime = container.querySelector('#jsLabelTime');
    const labelOath = container.querySelector('#jsLabelOath');

    const setJoystickMode = (mode) => {
      const state = getGameState();
      if (!state.systemState.taskListFilters) {
        state.systemState.taskListFilters = {};
      }

      if (mode === 'lock') {
        state.systemState.taskListFilters.lockModeDailies = true;
        state.systemState.taskListFilters.editModeDailies = false;
        state.systemState.taskListFilters.timeModeDailies = false;
        state.systemState.taskListFilters.oathModeDailies = false;
      } else if (mode === 'edit') {
        state.systemState.taskListFilters.lockModeDailies = false;
        state.systemState.taskListFilters.editModeDailies = true;
        state.systemState.taskListFilters.timeModeDailies = false;
        state.systemState.taskListFilters.oathModeDailies = false;
      } else if (mode === 'time') {
        state.systemState.taskListFilters.lockModeDailies = false;
        state.systemState.taskListFilters.editModeDailies = false;
        state.systemState.taskListFilters.timeModeDailies = true;
        state.systemState.taskListFilters.oathModeDailies = false;
      } else if (mode === 'oath') {
        state.systemState.taskListFilters.lockModeDailies = false;
        state.systemState.taskListFilters.editModeDailies = false;
        state.systemState.taskListFilters.timeModeDailies = false;
        state.systemState.taskListFilters.oathModeDailies = true;
      } else {
        // default
        state.systemState.taskListFilters.lockModeDailies = false;
        state.systemState.taskListFilters.editModeDailies = false;
        state.systemState.taskListFilters.timeModeDailies = false;
        state.systemState.taskListFilters.oathModeDailies = false;
      }

      state.save();
      this.updateJoystickUI();
      this.refreshGameUI();
    };

    labelLock.addEventListener('click', (e) => { e.stopPropagation(); setJoystickMode('lock'); });
    labelDefault.addEventListener('click', (e) => { e.stopPropagation(); setJoystickMode('default'); });
    labelEdit.addEventListener('click', (e) => { e.stopPropagation(); setJoystickMode('edit'); });
    labelTime.addEventListener('click', (e) => { e.stopPropagation(); setJoystickMode('time'); });
    labelOath.addEventListener('click', (e) => { e.stopPropagation(); setJoystickMode('oath'); });

    // Pointer events for dragging
    handle.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      try { handle.setPointerCapture(e.pointerId); } catch (err) {}

      let isDragging = true;
      let startX = e.clientX;

      const state = getGameState();
      const filters = state.systemState?.taskListFilters || {};
      let initialTx = -42;
      if (filters.lockModeDailies) initialTx = -84;
      else if (filters.editModeDailies) initialTx = 0;
      else if (filters.timeModeDailies) initialTx = 42;
      else if (filters.oathModeDailies) initialTx = 84;

      handle.style.transition = 'none';

      const onPointerMove = (moveEv) => {
        if (!isDragging) return;
        let dx = moveEv.clientX - startX;
        let tx = initialTx + dx;
        tx = Math.max(-84, Math.min(84, tx));
        handle.style.transform = `translateX(${tx}px)`;
      };

      const onPointerUp = (upEv) => {
        if (!isDragging) return;
        isDragging = false;
        try { handle.releasePointerCapture(upEv.pointerId); } catch (err) {}

        document.removeEventListener('pointermove', onPointerMove);
        document.removeEventListener('pointerup', onPointerUp);
        document.removeEventListener('pointercancel', onPointerUp);

        const transformStr = handle.style.transform || 'translateX(-42px)';
        const match = transformStr.match(/translateX\(([-\d.]+)px\)/);
        const currentTx = match ? parseFloat(match[1]) : -42;

        handle.style.transition = 'transform 0.25s cubic-bezier(0.25, 1.1, 0.5, 1.15), background 0.25s, box-shadow 0.25s';

        if (currentTx < -63) {
          setJoystickMode('lock');
        } else if (currentTx < -21) {
          setJoystickMode('default');
        } else if (currentTx < 21) {
          setJoystickMode('edit');
        } else if (currentTx < 63) {
          setJoystickMode('time');
        } else {
          setJoystickMode('oath');
        }
      };

      document.addEventListener('pointermove', onPointerMove);
      document.addEventListener('pointerup', onPointerUp);
      document.addEventListener('pointercancel', onPointerUp);
    });

    this.updateJoystickUI();
  }

  static updateJoystickUI() {
    const state = getGameState();
    const filters = state.systemState?.taskListFilters || {};

    const handle = document.getElementById('jsHandle');
    const labelLock = document.getElementById('jsLabelLock');
    const labelDefault = document.getElementById('jsLabelDefault');
    const labelEdit = document.getElementById('jsLabelEdit');
    const labelTime = document.getElementById('jsLabelTime');
    const labelOath = document.getElementById('jsLabelOath');
    const container = document.getElementById('nemesisJoystick');

    if (!container || !handle || !labelLock || !labelDefault || !labelEdit || !labelTime || !labelOath) return;

    const dailiesPanel = document.getElementById('dailiesPanel');
    if (dailiesPanel && dailiesPanel.classList.contains('open')) {
      container.style.display = 'block';
    } else {
      container.style.display = 'none';
    }

    // Enable transitioning for programmatic updates
    handle.style.transition = 'transform 0.25s cubic-bezier(0.25, 1.1, 0.5, 1.15), background 0.25s, box-shadow 0.25s';

    if (filters.lockModeDailies) {
      handle.className = 'nemesis-joystick-handle state-lock';
      labelLock.className = 'nemesis-joystick-label active-lock';
      labelDefault.className = 'nemesis-joystick-label';
      labelEdit.className = 'nemesis-joystick-label';
      labelTime.className = 'nemesis-joystick-label';
      labelOath.className = 'nemesis-joystick-label';
      handle.style.transform = 'translateX(-84px)';
    } else if (filters.editModeDailies) {
      handle.className = 'nemesis-joystick-handle state-edit';
      labelLock.className = 'nemesis-joystick-label';
      labelDefault.className = 'nemesis-joystick-label';
      labelEdit.className = 'nemesis-joystick-label active-edit';
      labelTime.className = 'nemesis-joystick-label';
      labelOath.className = 'nemesis-joystick-label';
      handle.style.transform = 'translateX(0px)';
    } else if (filters.timeModeDailies) {
      handle.className = 'nemesis-joystick-handle state-time';
      labelLock.className = 'nemesis-joystick-label';
      labelDefault.className = 'nemesis-joystick-label';
      labelEdit.className = 'nemesis-joystick-label';
      labelTime.className = 'nemesis-joystick-label active-time';
      labelOath.className = 'nemesis-joystick-label';
      handle.style.transform = 'translateX(42px)';
    } else if (filters.oathModeDailies) {
      handle.className = 'nemesis-joystick-handle state-oath';
      labelLock.className = 'nemesis-joystick-label';
      labelDefault.className = 'nemesis-joystick-label';
      labelEdit.className = 'nemesis-joystick-label';
      labelTime.className = 'nemesis-joystick-label';
      labelOath.className = 'nemesis-joystick-label active-oath';
      handle.style.transform = 'translateX(84px)';
    } else {
      handle.className = 'nemesis-joystick-handle state-default';
      labelLock.className = 'nemesis-joystick-label';
      labelDefault.className = 'nemesis-joystick-label active-default';
      labelEdit.className = 'nemesis-joystick-label';
      labelTime.className = 'nemesis-joystick-label';
      labelOath.className = 'nemesis-joystick-label';
      handle.style.transform = 'translateX(-42px)';
    }
  }

  static setupTodoJoystickModeToggle() {
    let container = document.getElementById('nemesisTodoJoystick');
    if (!container) {
      container = document.createElement('div');
      container.id = 'nemesisTodoJoystick';
      container.className = 'nemesis-joystick-container nemesis-todo-joystick';
      container.innerHTML = `
        <div class="nemesis-joystick-track">
          <div class="nemesis-joystick-label" id="jsTodoLabelDone" style="cursor: pointer;">DONE</div>
          <div class="nemesis-joystick-label" id="jsTodoLabelEdit" style="cursor: pointer;">EDIT</div>
          <div class="nemesis-joystick-label" id="jsTodoLabelDel" style="cursor: pointer;">DEL</div>
          <div class="nemesis-joystick-label" id="jsTodoLabelOath" style="cursor: pointer;">OATH</div>
          <div class="nemesis-joystick-handle" id="jsTodoHandle"></div>
        </div>
      `;
      document.body.appendChild(container);
    }

    const handle = container.querySelector('#jsTodoHandle');
    const labelDone = container.querySelector('#jsTodoLabelDone');
    const labelEdit = container.querySelector('#jsTodoLabelEdit');
    const labelDel = container.querySelector('#jsTodoLabelDel');
    const labelOath = container.querySelector('#jsTodoLabelOath');

    const setTodoJoystickMode = (mode) => {
      const state = getGameState();
      if (!state.systemState.taskListFilters) {
        state.systemState.taskListFilters = {};
      }
      state.systemState.taskListFilters.todoJoystickMode = mode;
      try { state.save(); } catch (e) {}
      this.updateTodoJoystickUI();
    };

    labelDone?.addEventListener('click', (e) => { e.stopPropagation(); setTodoJoystickMode('done'); });
    labelEdit?.addEventListener('click', (e) => { e.stopPropagation(); setTodoJoystickMode('edit'); });
    labelDel?.addEventListener('click', (e) => { e.stopPropagation(); setTodoJoystickMode('del'); });
    labelOath?.addEventListener('click', (e) => { e.stopPropagation(); setTodoJoystickMode('oath'); });

    if (handle) {
      handle.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        try { handle.setPointerCapture(e.pointerId); } catch (err) {}

        let isDragging = true;
        let startX = e.clientX;

        const state = getGameState();
        const mode = state.systemState?.taskListFilters?.todoJoystickMode || 'done';
        let initialTx = -67.5;
        if (mode === 'edit') initialTx = -22.5;
        else if (mode === 'del') initialTx = 22.5;
        else if (mode === 'oath') initialTx = 67.5;

        handle.style.transition = 'none';

        const onPointerMove = (moveEv) => {
          if (!isDragging) return;
          let dx = moveEv.clientX - startX;
          let tx = initialTx + dx;
          tx = Math.max(-67.5, Math.min(67.5, tx));
          handle.style.transform = `translateX(${tx}px)`;
        };

        const onPointerUp = (upEv) => {
          if (!isDragging) return;
          isDragging = false;
          try { handle.releasePointerCapture(upEv.pointerId); } catch (err) {}

          document.removeEventListener('pointermove', onPointerMove);
          document.removeEventListener('pointerup', onPointerUp);
          document.removeEventListener('pointercancel', onPointerUp);

          const transformStr = handle.style.transform || 'translateX(-67.5px)';
          const match = transformStr.match(/translateX\(([-\d.]+)px\)/);
          const currentTx = match ? parseFloat(match[1]) : -67.5;

          handle.style.transition = 'transform 0.25s cubic-bezier(0.25, 1.1, 0.5, 1.15), background 0.25s, box-shadow 0.25s';

          if (currentTx < -45) {
            setTodoJoystickMode('done');
          } else if (currentTx < 0) {
            setTodoJoystickMode('edit');
          } else if (currentTx < 45) {
            setTodoJoystickMode('del');
          } else {
            setTodoJoystickMode('oath');
          }
        };

        document.addEventListener('pointermove', onPointerMove);
        document.addEventListener('pointerup', onPointerUp);
        document.addEventListener('pointercancel', onPointerUp);
      });
    }

    this.updateTodoJoystickUI();
  }

  static updateTodoJoystickUI() {
    const state = getGameState();
    const mode = state.systemState?.taskListFilters?.todoJoystickMode || 'done';

    const handle = document.getElementById('jsTodoHandle');
    const labelDone = document.getElementById('jsTodoLabelDone');
    const labelEdit = document.getElementById('jsTodoLabelEdit');
    const labelDel = document.getElementById('jsTodoLabelDel');
    const labelOath = document.getElementById('jsTodoLabelOath');
    const container = document.getElementById('nemesisTodoJoystick');

    if (!container || !handle || !labelDone || !labelEdit || !labelDel || !labelOath) return;

    const todosPanel = document.getElementById('todosPanel');
    if (todosPanel && todosPanel.classList.contains('open')) {
      container.style.display = 'block';
    } else {
      container.style.display = 'none';
    }

    handle.style.transition = 'transform 0.25s cubic-bezier(0.25, 1.1, 0.5, 1.15), background 0.25s, box-shadow 0.25s';

    if (mode === 'edit') {
      handle.className = 'nemesis-joystick-handle state-edit';
      labelDone.className = 'nemesis-joystick-label';
      labelEdit.className = 'nemesis-joystick-label active-edit';
      labelDel.className = 'nemesis-joystick-label';
      labelOath.className = 'nemesis-joystick-label';
      handle.style.transform = 'translateX(-22.5px)';
    } else if (mode === 'del') {
      handle.className = 'nemesis-joystick-handle state-del';
      labelDone.className = 'nemesis-joystick-label';
      labelEdit.className = 'nemesis-joystick-label';
      labelDel.className = 'nemesis-joystick-label active-del';
      labelOath.className = 'nemesis-joystick-label';
      handle.style.transform = 'translateX(22.5px)';
    } else if (mode === 'oath') {
      handle.className = 'nemesis-joystick-handle state-oath';
      labelDone.className = 'nemesis-joystick-label';
      labelEdit.className = 'nemesis-joystick-label';
      labelDel.className = 'nemesis-joystick-label';
      labelOath.className = 'nemesis-joystick-label active-oath';
      handle.style.transform = 'translateX(67.5px)';
    } else {
      // done
      handle.className = 'nemesis-joystick-handle state-done';
      labelDone.className = 'nemesis-joystick-label active-done';
      labelEdit.className = 'nemesis-joystick-label';
      labelDel.className = 'nemesis-joystick-label';
      labelOath.className = 'nemesis-joystick-label';
      handle.style.transform = 'translateX(-67.5px)';
    }
  }

  static setupFocusTimer() {
    const state = getGameState();
    const btn = document.getElementById('focusTimerBtn');
    const overlay = document.getElementById('focusOverlay');
    const popup = document.getElementById('focus-clock-popup');
    const closeBtn = document.getElementById('focusPopupClose');
    const startBtn = document.getElementById('focusStartBtn');
    const stopBtn = document.getElementById('focusStopBtn');
    const digital = document.getElementById('digitalClock');
    const durationBtns = document.querySelectorAll('.focus-duration-btn');
    const miniWidget = document.getElementById('focus-mini-widget');
    const miniTime = document.getElementById('focusMiniTime');

    const customBtn = document.getElementById('focusCustomBtn');
    const customInputGroup = document.getElementById('focusCustomInputGroup');
    const customMinsInput = document.getElementById('focusCustomMins');

    if (!btn || !overlay || !popup || !startBtn || !digital) return;

    let selectedMinutes = 25;
    let secondsLeft = 25 * 60;
    let timerInterval = null;
    let isTimerPaused = false;

    let isDragging = false;
    let dragStartX = 0, dragStartY = 0, initialLeft = 0, initialTop = 0;

    let selectedFocusTaskIds = new Set(state.systemState.selectedFocusTaskIds || []);
    let activeFocusBubbles = [];
    let driftAnimationId = null;

    const populateFocusTaskList = () => {
      const selectionContainer = document.getElementById('focusTaskSelectionContainer');
      const selectionList = document.getElementById('focusTaskSelectionList');
      if (!selectionContainer || !selectionList) return;

      if (state.systemState.focusTimerActive) {
        selectionContainer.style.display = 'none';
        return;
      }

      const incompleteDailies = (state.dailiesState?.dailies || []).filter(d => {
        const max = d.maxCompletionsPerDay || 1;
        const current = d.completionsToday || 0;
        return current < max;
      });

      const incompleteTodos = TaskManager.getAllTodos().filter(t => !t.completed);

      if (incompleteDailies.length === 0 && incompleteTodos.length === 0) {
        selectionList.innerHTML = `<div style="font-size: 6px; color: #a0aec0; text-align: center; padding: 10px 0;">No active tasks available</div>`;
        selectionContainer.style.display = 'block';
        return;
      }

      let html = '';

      incompleteDailies.forEach(d => {
        const isChecked = selectedFocusTaskIds.has(d.id) ? 'checked' : '';
        const savedSteps = (state.systemState.temporaryFocusSteps && state.systemState.temporaryFocusSteps[d.id]) || '';
        const dailyLabel = d.maxCompletionsPerDay > 1 
          ? `[Daily] ${d.name} (${d.completionsToday || 0}/${d.maxCompletionsPerDay})`
          : `[Daily] ${d.name}`;
        const dailyColor = UIManager.getAttributeColor(d.attribute);
        html += `
          <div class="focus-task-item-group" style="margin-bottom: 8px; background: ${dailyColor}1c; border: 1px solid ${dailyColor}60; padding: 6px 8px; border-radius: 6px;">
            <label class="focus-task-item" style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
              <input type="checkbox" class="focus-task-checkbox" data-id="${d.id}" data-type="daily" ${isChecked} style="accent-color: ${dailyColor}; cursor: pointer; transform: scale(1.15);" />
              <span class="focus-task-title" style="color: #ffffff; font-size: 11px; font-weight: bold; text-shadow: 0 1px 2px rgba(0,0,0,0.6);">${dailyLabel}</span>
            </label>
            <div style="padding-left: 22px; margin-top: 4px;">
              <input type="text" class="focus-task-steps-input" data-id="${d.id}" placeholder="Breakdown steps (comma-separated)..." value="${savedSteps}" style="width: 90%; font-size: 9px; background: rgba(0,0,0,0.35); border: 1px solid rgba(255,255,255,0.2); color: #fff; padding: 3px 6px; border-radius: 4px; font-family: inherit;" />
            </div>
          </div>
        `;
      });

      incompleteTodos.forEach(t => {
        const isChecked = selectedFocusTaskIds.has(t.id) ? 'checked' : '';
        const savedSteps = (state.systemState.temporaryFocusSteps && state.systemState.temporaryFocusSteps[t.id]) || '';
        const todoColor = UIManager.getAttributeColor(t.attribute);
        html += `
          <div class="focus-task-item-group" style="margin-bottom: 8px; background: ${todoColor}1c; border: 1px solid ${todoColor}60; padding: 6px 8px; border-radius: 6px;">
            <label class="focus-task-item" style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
              <input type="checkbox" class="focus-task-checkbox" data-id="${t.id}" data-type="todo" ${isChecked} style="accent-color: ${todoColor}; cursor: pointer; transform: scale(1.15);" />
              <span class="focus-task-title" style="color: #ffffff; font-size: 11px; font-weight: bold; text-shadow: 0 1px 2px rgba(0,0,0,0.6);">[To-Do] ${t.name}</span>
            </label>
        `;
        
        // Incomplete subtasks
        const incompleteSubtasks = (t.subtasks || []).filter(st => !st.completed);
        incompleteSubtasks.forEach(st => {
          const subtaskSelectionId = `${t.id}-subtask-${st.id}`;
          const isSubtaskChecked = selectedFocusTaskIds.has(subtaskSelectionId) ? 'checked' : '';
          html += `
            <label class="focus-task-item focus-subtask-item" style="padding: 4px 6px; margin: 4px 0 4px 14px; background: rgba(0,0,0,0.25); border: 1px solid ${todoColor}40; border-radius: 4px; opacity: 0.95; display: flex; align-items: center; gap: 8px; cursor: pointer;">
              <input type="checkbox" class="focus-task-checkbox" data-id="${subtaskSelectionId}" data-type="subtask" ${isSubtaskChecked} style="accent-color: ${todoColor}; cursor: pointer; transform: scale(1.05);" />
              <span class="focus-task-title" style="color: #ffffff; font-size: 10px; font-weight: bold; text-shadow: 0 1px 2px rgba(0,0,0,0.6);">${st.name}</span>
            </label>
          `;
        });

        html += `
            <div style="padding-left: 22px; margin-top: 4px;">
              <input type="text" class="focus-task-steps-input" data-id="${t.id}" placeholder="Breakdown steps (comma-separated)..." value="${savedSteps}" style="width: 90%; font-size: 9px; background: rgba(0,0,0,0.35); border: 1px solid rgba(255,255,255,0.2); color: #fff; padding: 3px 6px; border-radius: 4px; font-family: inherit;" />
            </div>
          </div>
        `;
      });

      selectionList.innerHTML = html;
      selectionContainer.style.display = 'block';

      // Bind checkbox changes
      selectionList.querySelectorAll('.focus-task-checkbox').forEach(cb => {
        cb.addEventListener('change', (e) => {
          const id = e.target.dataset.id;
          if (e.target.checked) {
            selectedFocusTaskIds.add(id);
          } else {
            selectedFocusTaskIds.delete(id);
          }
          state.systemState.selectedFocusTaskIds = Array.from(selectedFocusTaskIds);
          state.save();
        });
      });

      // Bind custom breakdown text input
      selectionList.querySelectorAll('.focus-task-steps-input').forEach(input => {
        input.addEventListener('input', (e) => {
          const id = e.target.dataset.id;
          if (!state.systemState.temporaryFocusSteps) {
            state.systemState.temporaryFocusSteps = {};
          }
          state.systemState.temporaryFocusSteps[id] = e.target.value;
          state.save();
        });
      });
    };

    const startDriftLoop = () => {
      if (driftAnimationId) cancelAnimationFrame(driftAnimationId);
      
      let overlayWidth = overlay.offsetWidth || window.innerWidth;
      let overlayHeight = overlay.offsetHeight || window.innerHeight;
      
      const handleDriftResize = () => {
        overlayWidth = overlay.offsetWidth || window.innerWidth;
        overlayHeight = overlay.offsetHeight || window.innerHeight;
      };
      
      window.addEventListener('resize', handleDriftResize);
      
      const updateDrift = () => {
        if (!state.systemState.focusTimerActive) {
          driftAnimationId = null;
          window.removeEventListener('resize', handleDriftResize);
          return;
        }

        const width = overlayWidth;
        const height = overlayHeight;

        activeFocusBubbles.forEach(b => {
          b.x += b.vx;
          b.y += b.vy;

          const r = b.r || 45;

          if (b.x - r < 0) {
            b.x = r;
            b.vx *= -1;
          } else if (b.x + r > width) {
            b.x = width - r;
            b.vx *= -1;
          }

          if (b.y - r < 0) {
            b.y = r;
            b.vy *= -1;
          } else if (b.y + r > height) {
            b.y = height - r;
            b.vy *= -1;
          }

          b.el.style.left = `${b.x - r}px`;
          b.el.style.top = `${b.y - r}px`;
        });

        driftAnimationId = requestAnimationFrame(updateDrift);
      };
      
      driftAnimationId = requestAnimationFrame(updateDrift);
    };

    const completeFocusBubbleTask = (bubbleObj) => {
      const { id, type, el } = bubbleObj;
      if (el.classList.contains('pop')) return;

      try { if (window.SoundManager) SoundManager.play('heal'); } catch (err) {}

      el.classList.add('pop');

      let res = null;
      if (id.includes('-step-')) {
        res = TaskManager.completeStep(id);
      } else if (type === 'subtask') {
        const parts = id.split('-subtask-');
        const todoId = parts[0];
        const subtaskId = parts[1];
        res = TaskManager.completeSubtask(todoId, subtaskId);
      } else if (type === 'daily') {
        const dailyId = id.includes('-comp-') ? id.split('-comp-')[0] : id;
        res = TaskManager.completeDaily(dailyId);
      } else {
        res = TaskManager.completeTodo(id);
      }

      if (res && res.success) {
        const rect = el.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        if (res.isHeld || res.isMiss) {
          try { if (window.SoundManager) SoundManager.play('miss'); } catch (e) {}
          FloatingDamageNumber.show(centerX, Math.max(12, centerY - 20), 'MISS', { color: '#ef4444', isMiss: true, scale: 1.3, duration: 2000 });
        } else {
          if (res.isJackpot) {
            try { if (window.SoundManager) SoundManager.play('crit'); } catch (e) {}
            FloatingDamageNumber.show(centerX, centerY - 40, 'JACKPOT!', {
              className: 'rainbow-jackpot-text',
              scale: 1.5,
              duration: 2000
            });
          }
          if (res.rewards && res.rewards.diamonds > 0) {
            UIManager.spawnDiamondFloatingPopup(centerX, centerY, res.rewards.diamonds);
          }

          if (res.rewards && res.rewards.ap) {
            FloatingDamageNumber.show(centerX, centerY - 20, `+${Math.ceil(res.rewards.ap)} AP`, {
              color: UIManager.themeColor('--ap-gold', '#FFB33F'),
              cycleText: false
            });
          }

          if (res.rewards && res.rewards.keys) {
            FloatingDamageNumber.show(centerX, centerY - 20, `+${res.rewards.keys} Keys 🔑`, {
              color: '#ffd700',
              cycleText: true
            });
          }

          const released = res.releasedHeld || res.releasedHeldRewards;
          if (released && (released.ap > 0 || released.diamonds > 0 || released.keys > 0)) {
            let offset = 48;
            if (released.ap > 0) {
              FloatingDamageNumber.show(centerX, Math.max(12, centerY - offset), `+${Math.ceil(released.ap)} AP (Held)`, {
                color: '#f59e0b',
                scale: 1.2,
                duration: 2500
              });
              offset += 24;
            }
            if (released.diamonds > 0) {
              FloatingDamageNumber.show(centerX + 25, Math.max(12, centerY - offset), `+${released.diamonds} 💎 (Held)`, {
                color: '#00e5ff',
                scale: 1.2,
                duration: 2500
              });
              offset += 24;
            }
            if (released.keys > 0) {
              FloatingDamageNumber.show(centerX, Math.max(12, centerY - offset), `+${released.keys} Keys (Held) 🔑`, {
                color: '#f59e0b',
                scale: 1.2,
                duration: 2500
              });
            }
          }
        }

        // If parent task is completed, automatically clear any remaining bubbles belonging to it
        if (res.completed) {
          let parentId = id;
          if (id.includes('-step-')) {
            parentId = id.split('-step-')[0];
          } else if (type === 'subtask') {
            parentId = id.split('-subtask-');
            parentId = parentId[0];
          } else if (type === 'daily' && id.includes('-comp-')) {
            parentId = id.split('-comp-')[0];
          }

          // Clean up step bubbles, subtask bubbles, or parent task bubble
          activeFocusBubbles.forEach(b => {
            if (b.id !== id && (
              b.id === parentId ||
              b.id.startsWith(parentId + '-comp-') ||
              b.id.startsWith(parentId + '-subtask-') ||
              b.id.startsWith(parentId + '-step-')
            )) {
              b.el.remove();
            }
          });

          activeFocusBubbles = activeFocusBubbles.filter(b => 
            b.id === id || !(
              b.id === parentId ||
              b.id.startsWith(parentId + '-comp-') ||
              b.id.startsWith(parentId + '-subtask-') ||
              b.id.startsWith(parentId + '-step-')
            )
          );
        }
      }

      try { state.save(); } catch (err) {}
      UIManager.refreshGameUI();
      UIManager.renderEnemies();

      setTimeout(() => {
        el.remove();
        activeFocusBubbles = activeFocusBubbles.filter(b => b.id !== id);

        // Delete from selection checklist only when fully completed
        let shouldDeleteSelection = true;
        let originalTaskId = id;

        if (id.includes('-step-')) {
          originalTaskId = id.split('-step-')[0];
          const parentDaily = state.dailiesState.dailies.find(d => d.id === originalTaskId);
          const parentTodo = state.dailiesState.todos.find(t => t.id === originalTaskId);
          const completed = parentDaily ? parentDaily.completed : (parentTodo ? parentTodo.completed : true);
          shouldDeleteSelection = completed;
        } else if (type === 'subtask') {
          originalTaskId = id.split('-subtask-')[0];
          selectedFocusTaskIds.delete(id); // remove the specific subtask checkbox
          const parentTodo = state.dailiesState.todos.find(t => t.id === originalTaskId);
          shouldDeleteSelection = parentTodo ? parentTodo.completed : true;
        } else if (type === 'daily' && id.includes('-comp-')) {
          originalTaskId = id.split('-comp-')[0];
          const daily = state.dailiesState.dailies.find(d => d.id === originalTaskId);
          shouldDeleteSelection = !daily || daily.completed;
        }

        if (shouldDeleteSelection) {
          selectedFocusTaskIds.delete(originalTaskId);
        }

        state.systemState.selectedFocusTaskIds = Array.from(selectedFocusTaskIds);
        state.save();
      }, 200);
    };

    const spawnFocusBubbles = () => {
      const oldBubbles = popup.querySelectorAll('.focus-bubble');
      oldBubbles.forEach(el => el.remove());
      activeFocusBubbles = [];

      if (!state.systemState.focusTimerActive) return;

      const overlayRect = overlay.getBoundingClientRect();
      const width = overlayRect.width || window.innerWidth;
      const height = overlayRect.height || window.innerHeight;

      // Ensure systemState has completedSteps array initialized
      if (!state.systemState.completedSteps) {
        state.systemState.completedSteps = [];
      }

      selectedFocusTaskIds.forEach(id => {
        let task = null;
        let type = '';
        let subtaskObj = null;

        if (id.includes('-subtask-')) {
          const parts = id.split('-subtask-');
          const todoId = parts[0];
          const subtaskId = parts[1];
          const todo = state.dailiesState.todos.find(t => t.id === todoId);
          if (todo && !todo.completed) {
            const subtask = (todo.subtasks || []).find(st => st.id === subtaskId);
            if (subtask && !subtask.completed) {
              task = todo;
              type = 'subtask';
              subtaskObj = subtask;
            }
          }
        } else {
          task = state.dailiesState.dailies.find(d => d.id === id);
          type = 'daily';
          if (!task) {
            task = state.dailiesState.todos.find(t => t.id === id);
            type = 'todo';
          }
        }

        if (!task || task.completed || task.locked) return;

        // Check if there are custom breakdown steps entered for this task
        const rawSteps = state.systemState.temporaryFocusSteps?.[task.id] || '';
        const steps = rawSteps.split(',').map(s => s.trim()).filter(s => s.length > 0);

        if (steps.length > 0 && type !== 'subtask') {
          // Spawn separate bubbles for each uncompleted step instead of spawning the main task bubble
          steps.forEach((stepName, stepIndex) => {
            const stepId = `${task.id}-step-${stepIndex}`;
            if (state.systemState.completedSteps.includes(stepId)) return;

            createBubble(stepId, stepName, type, task, 1.0);
          });
        } else if (type === 'daily' && (task.maxCompletionsPerDay || 1) > 1) {
          // Spawn multiple individual bubbles (one for each remaining completion: max - current)
          const max = task.maxCompletionsPerDay;
          const current = task.completionsToday || 0;
          for (let i = current + 1; i <= max; i++) {
            const bubbleId = `${task.id}-comp-${i}`;
            const bubbleTitle = `${task.name} (${i}/${max})`;
            createBubble(bubbleId, bubbleTitle, 'daily', task, 1.0);
          }
        } else if (type === 'subtask') {
          // Spawn separate bubble for subtask, slightly smaller
          createBubble(id, subtaskObj.name, 'subtask', task, 0.85);
        } else {
          // Standard single daily or todo bubble
          createBubble(task.id, task.name, type, task, 1.0);
        }
      });

      function createBubble(bubbleId, bubbleTitle, bubbleType, parentTask, customSizeScale) {
        const el = document.createElement('div');

        // Derive shape, color, and size from the task
        const shapeClass = UIManager.shapeClassForDifficulty ? UIManager.shapeClassForDifficulty(parentTask.difficulty) : 'easy';
        const attrColor = UIManager.getAttributeColor(parentTask.attribute);
        const taskInk = UIManager.getTextColorForHex(attrColor);
        let sizeScale = Math.max(0.7, Number(parentTask.size) || 1) * customSizeScale;
        const bubbleSize = Math.round(80 * sizeScale);
        const shadeCol = UIManager.shadeColor(attrColor, -20);

        const r = bubbleSize / 2;
        const startX = r + Math.random() * (width - r * 2);
        const startY = r + Math.random() * (height - r * 2);

        const angle = Math.random() * Math.PI * 2;
        const speed = (0.5 + Math.random() * 0.7) * 1.5;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;

        el.className = `focus-bubble shape-task shape-${shapeClass}`;
        el.style.cssText = `
          width: ${bubbleSize}px;
          height: ${bubbleSize}px;
          left: ${startX - r}px;
          top: ${startY - r}px;
          z-index: 20002;
          pointer-events: auto;
          --focus-border-color: ${attrColor};
        `;

        el.innerHTML = `
          <div class="focus-task-title">${bubbleTitle}</div>
          <div class="reward-tag">2x 💎</div>
        `;

        popup.appendChild(el);

        const bubbleObj = {
          id: bubbleId,
          type: bubbleType,
          el,
          r,
          x: startX,
          y: startY,
          vx,
          vy
        };

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          completeFocusBubbleTask(bubbleObj);
        });

        activeFocusBubbles.push(bubbleObj);
      }

      if (activeFocusBubbles.length > 0) {
        startDriftLoop();
      }
    };

    // Dragging is disabled for full-screen layout

    const updateHands = (totalSecs, currentSecs) => {
      const remainingRatio = totalSecs > 0 ? currentSecs / totalSecs : 0;
      const progressBar = document.getElementById('focusProgressBar');
      if (progressBar) {
        progressBar.style.width = (remainingRatio * 100) + '%';
      }
    };

    const updateDisplay = () => {
      const mins = Math.floor(secondsLeft / 60);
      const secs = secondsLeft % 60;
      const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      digital.textContent = formatted;
      if (miniTime) miniTime.textContent = formatted;

      const totalSecs = selectedMinutes * 60;
      updateHands(totalSecs, secondsLeft);
    };

    const syncPopupUI = () => {
      const timerOptions = popup.querySelector('.focus-timer-options');
      const customInputGroup = document.getElementById('focusCustomInputGroup');

      if (state.systemState.focusTimerActive) {
        if (isTimerPaused) {
          startBtn.textContent = 'RESUME';
        } else {
          startBtn.textContent = 'PAUSE';
        }
        if (stopBtn) stopBtn.style.display = 'block';
        const selectionContainer = document.getElementById('focusTaskSelectionContainer');
        if (selectionContainer) selectionContainer.style.display = 'none';

        if (timerOptions) timerOptions.style.display = 'none';
        if (customInputGroup) customInputGroup.style.display = 'none';
      } else {
        startBtn.textContent = 'START';
        if (stopBtn) stopBtn.style.display = 'none';
        populateFocusTaskList();

        if (timerOptions) timerOptions.style.display = 'flex';
        // Only show custom group if the custom button itself is active
        const customBtn = document.getElementById('focusCustomBtn');
        if (customBtn && customBtn.classList.contains('active')) {
          if (customInputGroup) customInputGroup.style.display = 'flex';
        } else {
          if (customInputGroup) customInputGroup.style.display = 'none';
        }
      }
      updateDisplay();
    };

    durationBtns.forEach(dBtn => {
      dBtn.addEventListener('click', () => {
        if (state.systemState.focusTimerActive) return;
        if (dBtn === customBtn) return;
        durationBtns.forEach(b => b.classList.remove('active'));
        if (customBtn) customBtn.classList.remove('active');
        dBtn.classList.add('active');
        if (customInputGroup) customInputGroup.style.display = 'none';
        selectedMinutes = parseInt(dBtn.dataset.mins, 10);
        secondsLeft = selectedMinutes * 60;
        updateDisplay();
      });
    });

    if (customBtn && customInputGroup) {
      customBtn.addEventListener('click', () => {
        if (state.systemState.focusTimerActive) return;
        durationBtns.forEach(b => b.classList.remove('active'));
        customBtn.classList.add('active');
        customInputGroup.style.display = customInputGroup.style.display === 'none' ? 'flex' : 'none';
        if (customInputGroup.style.display === 'flex' && customMinsInput) {
          selectedMinutes = parseInt(customMinsInput.value, 10) || 25;
          secondsLeft = selectedMinutes * 60;
          updateDisplay();
        }
      });
    }

    if (customMinsInput) {
      customMinsInput.addEventListener('input', () => {
        if (state.systemState.focusTimerActive) return;
        let val = parseInt(customMinsInput.value, 10);
        if (isNaN(val) || val < 1) val = 1;
        if (val > 1440) val = 1440;
        selectedMinutes = val;
        secondsLeft = selectedMinutes * 60;
        updateDisplay();
      });
    }

    const showPopup = () => {
      popup.style.display = 'flex';
      overlay.style.display = 'block';

      const draggableHud = document.getElementById('draggableHud');
      const statsHudWidget = document.getElementById('statsHudWidget');
      if (draggableHud) draggableHud.style.display = 'none';
      if (statsHudWidget) statsHudWidget.style.display = 'none';

      const nemesisTauntHud = document.getElementById('nemesisTauntHud');
      const challengeHud = document.getElementById('challengeHud');
      if (nemesisTauntHud) nemesisTauntHud.style.display = 'none';
      if (challengeHud) challengeHud.style.display = 'none';

      UIManager.enterFocusMode();
    };

    const hidePopup = () => {
      if (state.systemState.focusTimerActive) {
        popup.style.display = 'none';
        overlay.style.display = 'none';
        miniWidget.style.display = 'flex';
      } else {
        popup.style.display = 'none';
        overlay.style.display = 'none';
      }

      const draggableHud = document.getElementById('draggableHud');
      const statsHudWidget = document.getElementById('statsHudWidget');
      if (draggableHud) draggableHud.style.display = '';
      if (statsHudWidget) statsHudWidget.style.display = '';

      const nemesisTauntHud = document.getElementById('nemesisTauntHud');
      const challengeHud = document.getElementById('challengeHud');
      if (nemesisTauntHud) nemesisTauntHud.style.display = '';
      if (challengeHud) challengeHud.style.display = '';

      UIManager.exitFocusMode();
    };

    closeBtn.addEventListener('click', hidePopup);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) hidePopup();
    });
    popup.addEventListener('click', (e) => {
      if (e.target === popup) hidePopup();
    });

    btn.addEventListener('click', () => {
      if (popup.style.display === 'flex') {
        hidePopup();
      } else {
        showPopup();
        miniWidget.style.display = 'none';
        syncPopupUI();
      }
    });

    miniWidget.addEventListener('click', () => {
      miniWidget.style.display = 'none';
      showPopup();
      popup.style.left = '';
      popup.style.top = '';
      popup.style.transform = '';
      syncPopupUI();
    });

    const resetTimer = () => {
      clearInterval(timerInterval);
      timerInterval = null;
      isTimerPaused = false;
      state.systemState.focusTimerActive = false;
      state.systemState.focusTimerEndTimestamp = 0;
      state.systemState.focusTimerSecondsLeft = 0;
      state.systemState.selectedFocusTaskIds = [];
      state.systemState.completedSteps = [];
      localStorage.removeItem('nemesis_focus_end');
      selectedFocusTaskIds.clear();
      const oldBubbles = popup.querySelectorAll('.focus-bubble');
      oldBubbles.forEach(el => el.remove());
      activeFocusBubbles = [];
      if (driftAnimationId) {
        cancelAnimationFrame(driftAnimationId);
        driftAnimationId = null;
      }
      state.save();
      btn.classList.remove('active');
      startBtn.textContent = 'START';
      if (stopBtn) stopBtn.style.display = 'none';
      secondsLeft = selectedMinutes * 60;
      updateDisplay();
      hidePopup();
      miniWidget.style.display = 'none';
      UIManager.exitFocusMode();
      UIManager.refreshGameUI();
    };

    const lockIncompleteFocusDailies = () => {
      let lockedNames = [];
      const focusTaskIds = state.systemState.selectedFocusTaskIds || [];
      focusTaskIds.forEach(id => {
        const daily = state.dailiesState.dailies.find(d => d.id === id);
        if (daily) {
          const max = daily.maxCompletionsPerDay || 1;
          const current = daily.completionsToday || 0;
          if (current < max && !daily.completed && !daily.locked) {
            TaskManager.lockDaily(id);
            lockedNames.push(daily.name);
          }
        }
      });
      return lockedNames;
    };

    const startTimerCountdown = () => {
      if (timerInterval) clearInterval(timerInterval);
      timerInterval = setInterval(() => {
        if (state.systemState.isPaused) return;
        secondsLeft--;

        // periodically update seconds left in state so it doesn't drift too much on tab close/crash
        if (secondsLeft % 5 === 0) {
          state.systemState.focusTimerSecondsLeft = secondsLeft;
          state.save();
        }

        updateDisplay();

        if (secondsLeft <= 0) {
          clearInterval(timerInterval);
          timerInterval = null;
          
          const lockedNames = lockIncompleteFocusDailies();
          
          state.systemState.focusTimerActive = false;
          state.systemState.focusTimerEndTimestamp = 0;
          state.systemState.focusTimerSecondsLeft = 0;
          localStorage.removeItem('nemesis_focus_end');
          state.save();
          btn.classList.remove('active');
          UIManager.exitFocusMode();
          
          let message = 'Awesome focus session completed! Doubled rewards have ended.';
          if (lockedNames.length > 0) {
            message += `<br/><br/><span style="color:#ff5a5a;font-weight:bold;">⚠️ The following incomplete focus targets were locked:</span><br/>` + lockedNames.map(n => `- ${n}`).join('<br/>');
          }
          
          try {
            if (window.SoundManager) SoundManager.play('heal');
            PopupsManager.showConfirm('Focus Complete! ⏱️', message, () => {
              resetTimer();
            });
          } catch (e) {
            alert('Focus Session Complete! Incomplete focus targets locked.');
            resetTimer();
          }
        }
      }, 1000);
    };

    // Rehydrate/resume timer if it is active on page load/re-init
    if (state.systemState.focusTimerActive) {
      const now = Date.now();
      // Prefer direct localStorage value (written synchronously) over state (may not flush before tab close)
      const lsEnd = Number(localStorage.getItem('nemesis_focus_end')) || 0;
      const end = lsEnd || (Number(state.systemState.focusTimerEndTimestamp) || 0);
      const savedLeft = Number(state.systemState.focusTimerSecondsLeft) || 0;
      const originalDurationMins = Number(state.systemState.focusTimerDurationMins) || 25;
      
      selectedMinutes = originalDurationMins;

      // Detect if it was paused when saved
      const wasPaused = savedLeft > 0 && !end;

      if (wasPaused) {
        isTimerPaused = true;
        secondsLeft = savedLeft;
        btn.classList.add('active');
        syncPopupUI();
        spawnFocusBubbles();
        hidePopup();
      } else if (end > now) {
        isTimerPaused = false;
        secondsLeft = Math.ceil((end - now) / 1000);
        btn.classList.add('active');
        syncPopupUI();
        spawnFocusBubbles();
        hidePopup();
        startTimerCountdown();
      } else {
        // Completed while away
        const lockedNames = lockIncompleteFocusDailies();
        
        state.systemState.focusTimerActive = false;
        state.systemState.focusTimerEndTimestamp = 0;
        state.systemState.focusTimerSecondsLeft = 0;
        localStorage.removeItem('nemesis_focus_end');
        state.save();
        
        let message = 'Your focus session completed while you were away! Doubled rewards have ended.';
        if (lockedNames.length > 0) {
          message += `<br/><br/><span style="color:#ff5a5a;font-weight:bold;">⚠️ The following incomplete focus targets were locked:</span><br/>` + lockedNames.map(n => `- ${n}`).join('<br/>');
        }
        
        setTimeout(() => {
          try {
            if (window.SoundManager) SoundManager.play('heal');
            PopupsManager.showConfirm('Focus Complete! ⏱️', message, () => {
              resetTimer();
            });
          } catch (e) {
            alert('Focus Session Complete while away! Incomplete focus targets locked.');
            resetTimer();
          }
        }, 800);
      }
    }

    startBtn.addEventListener('click', () => {
      if (state.systemState.focusTimerActive) {
        if (isTimerPaused) {
          isTimerPaused = false;
          startBtn.textContent = 'PAUSE';
          const resumeEnd = Date.now() + secondsLeft * 1000;
          state.systemState.focusTimerEndTimestamp = resumeEnd;
          state.systemState.focusTimerSecondsLeft = secondsLeft;
          localStorage.setItem('nemesis_focus_end', String(resumeEnd));
          state.save();
          startTimerCountdown();
        } else {
          isTimerPaused = true;
          startBtn.textContent = 'RESUME';
          clearInterval(timerInterval);
          timerInterval = null;
          state.systemState.focusTimerEndTimestamp = 0;
          state.systemState.focusTimerSecondsLeft = secondsLeft;
          localStorage.removeItem('nemesis_focus_end');
          state.save();
        }
      } else {
        const mana = state.playerState.mana || 0;
        if (mana < 15) {
          FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2, 'Not enough mana! (Requires 15 💧)', { color: '#ff5a5a' });
          try { if (window.SoundManager) SoundManager.play('miss'); } catch (e) {}
          return;
        }

        state.drainMana(15);
        state.systemState.focusTimerActive = true;
        state.systemState.focusTimerDurationMins = selectedMinutes;
        state.systemState.completedSteps = [];
        const newEnd = Date.now() + selectedMinutes * 60 * 1000;
        state.systemState.focusTimerEndTimestamp = newEnd;
        state.systemState.focusTimerSecondsLeft = selectedMinutes * 60;
        localStorage.setItem('nemesis_focus_end', String(newEnd));
        state.save();

        isTimerPaused = false;
        btn.classList.add('active');
        
        startBtn.textContent = 'PAUSE';
        if (stopBtn) stopBtn.style.display = 'block';
        
        secondsLeft = selectedMinutes * 60;
        updateDisplay();

        try { if (window.SoundManager) SoundManager.play('levelUp'); } catch (e) {}

        spawnFocusBubbles();
        const selectionContainer = document.getElementById('focusTaskSelectionContainer');
        if (selectionContainer) selectionContainer.style.display = 'none';

        UIManager.enterFocusMode();
        startTimerCountdown();
      }
    });

    if (stopBtn) {
      stopBtn.addEventListener('click', (e) => {
        if (e) e.stopPropagation();
        resetTimer();
      });
    }
  }

  static setupConsistencyChallenge() {
    const state = getGameState();
    const btn = document.getElementById('consistencyChallengeBtn');
    const overlay = document.getElementById('consistencyOverlay');
    const popup = document.getElementById('consistency-popup');
    const closeBtn = document.getElementById('consistencyPopupClose');
    const commitBtn = document.getElementById('consistencyCommitBtn');
    const daysInput = document.getElementById('consistencyCommitDays');
    const degreeInput = document.getElementById('lockInDegreeInput');
    const previewEl = document.getElementById('lockInRatioPreview');
    const activeLabel = document.getElementById('currentConsistencyCommitment');

    if (!btn || !overlay || !popup || !closeBtn || !commitBtn || !daysInput || !activeLabel) return;

    if (state.systemState.lockInDaysLeft === undefined) {
      state.systemState.lockInDaysLeft = state.systemState.consistencyDaysLeft || 0;
    }
    if (state.systemState.lockInDegree === undefined) {
      state.systemState.lockInDegree = 4;
    }

    const updatePreview = () => {
      const deg = Math.max(1, parseInt(degreeInput?.value, 10) || 4);
      if (previewEl) {
        previewEl.textContent = `${deg}x Rewards ⚡ | ${deg * 4}x Missed Damage 💀`;
      }
    };

    if (degreeInput) {
      degreeInput.value = state.systemState.lockInDegree || 4;
      degreeInput.addEventListener('input', updatePreview);
    }
    updatePreview();

    const openPopup = () => {
      const currentDays = state.systemState.lockInDaysLeft || state.systemState.consistencyDaysLeft || 0;
      const currentDegree = state.systemState.lockInDegree || 4;
      activeLabel.textContent = `${currentDays} day${currentDays === 1 ? '' : 's'} (${currentDegree}x)`;
      if (degreeInput) degreeInput.value = currentDegree;
      updatePreview();

      overlay.style.display = 'block';
      popup.style.display = 'flex';

      const draggableHud = document.getElementById('draggableHud');
      const statsHudWidget = document.getElementById('statsHudWidget');
      if (draggableHud) draggableHud.style.display = 'none';
      if (statsHudWidget) statsHudWidget.style.display = 'none';

      const nemesisTauntHud = document.getElementById('nemesisTauntHud');
      const challengeHud = document.getElementById('challengeHud');
      if (nemesisTauntHud) nemesisTauntHud.style.display = 'none';
      if (challengeHud) challengeHud.style.display = 'none';
    };

    const closePopup = () => {
      overlay.style.display = 'none';
      popup.style.display = 'none';

      const draggableHud = document.getElementById('draggableHud');
      const statsHudWidget = document.getElementById('statsHudWidget');
      if (draggableHud) draggableHud.style.display = '';
      if (statsHudWidget) statsHudWidget.style.display = '';

      const nemesisTauntHud = document.getElementById('nemesisTauntHud');
      const challengeHud = document.getElementById('challengeHud');
      if (nemesisTauntHud) nemesisTauntHud.style.display = '';
      if (challengeHud) challengeHud.style.display = '';
    };

    btn.addEventListener('click', (e) => {
      if (e) e.stopPropagation();
      if (typeof TaskManager !== 'undefined' && typeof TaskManager.isFeatureUnlocked === 'function' && !TaskManager.isFeatureUnlocked('lockIn')) {
        try { FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2, '🔒 Unlocks at Streak 7', { color: '#ff6666' }); } catch (err) {}
        return;
      }
      openPopup();
    });

    closeBtn.addEventListener('click', (e) => {
      if (e) e.stopPropagation();
      closePopup();
    });

    overlay.addEventListener('click', closePopup);

    commitBtn.addEventListener('click', (e) => {
      if (e) e.stopPropagation();
      const val = parseInt(daysInput.value, 10);
      const degree = Math.max(1, parseInt(degreeInput?.value, 10) || 4);
      if (isNaN(val) || val < 1) {
        alert("Please enter a valid number of days (at least 1).");
        return;
      }
      
      state.systemState.lockInDaysLeft = (state.systemState.lockInDaysLeft || state.systemState.consistencyDaysLeft || 0) + val;
      state.systemState.consistencyDaysLeft = state.systemState.lockInDaysLeft;
      state.systemState.lockInDegree = degree;
      state.save();
      
      closePopup();
      UIManager.updateConsistencyBtn();
      
      try {
        FloatingDamageNumber.show(
          window.innerWidth / 2,
          window.innerHeight / 2,
          `LOCK IN ACTIVE: ${degree}x (${degree * 4}x Dmg) +${val}d! 🔒`,
          { color: '#eab308', duration: 3000 }
        );
      } catch (err) {}
    });

    UIManager.updateConsistencyBtn();
  }

  static updateConsistencyBtn() {
    const btn = document.getElementById('consistencyChallengeBtn');
    if (!btn) return;

    const isLockInUnlocked = (typeof TaskManager !== 'undefined' && typeof TaskManager.isFeatureUnlocked === 'function')
      ? TaskManager.isFeatureUnlocked('lockIn')
      : true;

    if (!isLockInUnlocked) {
      btn.classList.remove('active');
      btn.textContent = `🔒 Unlocks at Streak 7`;
      btn.style.opacity = '0.6';
      btn.title = `Unlocks at Streak 7`;
      return;
    }

    btn.style.opacity = '1';
    const state = getGameState();
    const days = state.systemState ? (state.systemState.lockInDaysLeft || state.systemState.consistencyDaysLeft || 0) : 0;
    const degree = state.systemState ? (state.systemState.lockInDegree || 4) : 4;
    if (days > 0) {
      btn.classList.add('active');
      btn.textContent = `🔒 LOCK IN: ${degree}x (${days}d)`;
      btn.title = `Lock In active: ${days} days remaining. Degree ${degree}x (${degree}x rewards, ${degree * 4}x missed daily damage).`;
    } else {
      btn.classList.remove('active');
      btn.textContent = `🔒 LOCK IN`;
      btn.title = `Lock In Commitment. Set Lock In Degree: 2:8 reward to damage multiplier ratio (e.g. 4x rewards = 16x damage).`;
    }
  }

  static bindEventListeners() {
    if (this.eventListenersBound) return;
    this.eventListenersBound = true;
    this.setupFocusTimer();
    this.setupConsistencyChallenge();
    const state = getGameState();

    // Global listener to clear note selections on clicking outside
    document.addEventListener('pointerdown', (e) => {
      if (!e.target.closest('.daily-note-card') && !e.target.closest('.todo-note-card')) {
        document.querySelectorAll('.daily-note-card.selected, .todo-note-card.selected').forEach(el => {
          el.classList.remove('selected');
        });
      }
    });
    // Initialize sound manager with config
    try {
      if (window.SoundManager) {
        SoundManager.init(state.config.soundEnabled !== false, state.config.soundVolume || 0.6);
      }
    } catch (e) { }

    // Resource updates
    state.eventBus.on(EVENTS.HP_CHANGED, (detail) => this.updateHpBar(detail));
    state.eventBus.on(EVENTS.MANA_CHANGED, (detail) => this.updateManaBar(detail));
    state.eventBus.on(EVENTS.AP_CHANGED, (detail) => this.updateApBar(detail));
    state.eventBus.on(EVENTS.GOLD_CHANGED, (detail) => this.updateGoldDisplay(detail));
    state.eventBus.on(EVENTS.DIAMONDS_CHANGED, (detail) => this.updateDiamondDisplay(detail));
    state.eventBus.on(EVENTS.LOOTBOX_KEYS_CHANGED, (detail) => this.updateLootboxKeysDisplay(detail));
    state.eventBus.on(EVENTS.DEATH_DEFIANCE, (detail) => this.updateDeathDefianceBadge(detail));
    state.eventBus.on(EVENTS.GAME_LOAD, () => { this.updateDeathDefianceBadge(); this.updateConsumableStrip && this.updateConsumableStrip(); this.renderBuffPanel && this.renderBuffPanel(); });
    state.eventBus.on(EVENTS.GAME_SAVE, () => { this.updateConsumableStrip && this.updateConsumableStrip(); });
    state.eventBus.on(EVENTS.BUFF_GAINED, (detail) => { try { this.renderBuffPanel && this.renderBuffPanel(); this.onBuffGained && this.onBuffGained(detail); } catch (e) { } });
    state.eventBus.on(EVENTS.COMBO_CHANGED, (detail) => this.updateComboDisplay(detail));
    state.eventBus.on(EVENTS.ATTACK, (detail) => {
      this.handleAttackEvent(detail);
      let ox = null, oy = null;
      const circleEl = document.querySelector('.enemy-circle-container');
      if (circleEl) {
        const circleRect = circleEl.getBoundingClientRect();
        const targetId = detail?.targetId || detail?.enemyId;
        let targetEl = null;
        if (targetId) {
          targetEl = circleEl.querySelector(`[data-enemy-id="${targetId}"]`) || document.getElementById(`enemyCard-${targetId}`);
        }
        if (!targetEl && detail?.targetCard) targetEl = detail.targetCard;
        if (!targetEl) {
          const spinnerEnemy = this.getSpinnerTargetEnemy ? this.getSpinnerTargetEnemy() : null;
          if (spinnerEnemy) {
            targetEl = circleEl.querySelector(`[data-enemy-id="${spinnerEnemy.id}"]`) || document.getElementById(`enemyCard-${spinnerEnemy.id}`);
          }
        }

        if (targetEl) {
          const tr = targetEl.getBoundingClientRect();
          ox = (tr.left + tr.width / 2) - circleRect.left;
          oy = (tr.top + tr.height / 2) - circleRect.top;
        } else if (detail) {
          const cx = detail.clientX ?? detail.x ?? detail.pageX;
          const cy = detail.clientY ?? detail.y ?? detail.pageY;
          if (typeof cx === 'number' && typeof cy === 'number') {
            ox = cx - circleRect.left;
            oy = cy - circleRect.top;
          }
        }
      }
      this.triggerDonutRipple(ox, oy);
    });
    // Pet attack visual: show pet icon above targeted enemy and persist today's target
    state.eventBus.on(EVENTS.ATTACK, (detail) => {
      try {
        if (detail && detail.type === 'pet' && detail.targetId) {
          // immediate floating feedback
          this.showPetIcon(detail.targetId, { duration: 1800 });

          // persist today's pet target so a badge is shown for the rest of the day
          const now = new Date();
          const today = now.toISOString().slice(0, 10); // YYYY-MM-DD
          const gs = getGameState();
          if (!gs.playerState) gs.playerState = {};
          gs.playerState.petTarget = { enemyId: detail.targetId, date: today };
          try { gs.save(); } catch (e) { console.warn('Failed saving pet target', e); }
          // trigger re-render to show persistent badge
          this.renderEnemies();
        }
      } catch (e) { }
    });
    state.eventBus.on(EVENTS.ENEMY_HEALED, (detail) => {
      if (detail && detail.source === 'boss') return; // Handled sequentially during check-in animation
      try { this.showFloatingText(detail.enemyId, `+${Math.ceil(detail.amount)} healed`, { color: UIManager.themeColor('--success-green', '#44ff44') }); } catch (e) { }
    });
    state.eventBus.on(EVENTS.ENEMY_REVIVED, (detail) => {
      try { this.showFloatingText(detail.enemyId, 'Revived', { color: UIManager.themeColor('--success-green', '#44ff44'), duration: 2000 }); } catch (e) { }
    });
    // Mutator gained: refresh enemy badges and play cue; floating numbers for check-in are shown in the check-in sequence
    state.eventBus.on(EVENTS.ENEMY_MUTATED, (detail) => {
      try {
        const enemyId = detail?.enemyId;
        const mut = detail?.mutator;
        if (!enemyId || !mut) return;
        // Refresh visuals
        this.renderEnemies();
        // Play soft cue
        try { if (window.SoundManager) SoundManager.play('mutator'); else this.playMutatorSound(); } catch (e) { }

        // Animate badge briefly (visual feedback regardless of source)
        setTimeout(() => {
          try {
            const layer = document.getElementById('enemyLayer');
            const card = layer && layer.querySelector(`.enemy-card[data-enemy-id="${enemyId}"]`);
            if (card) {
              const badge = card.querySelector(`.mutator-badge--${mut}`);
              if (badge) {
                badge.classList.add('mutator-gain');
                setTimeout(() => { badge.classList.remove('mutator-gain'); }, 900);
              }
            }
          } catch (e) { }
        }, 120);

        // Non-checkin sources get a short toast immediately; check-in floating text will be shown in playCheckInSequence
        if (detail?.source !== 'checkin') {
          try {
            const enemy = StageManager.getEnemyById(enemyId);
            const name = enemy?.name || 'Enemy';
            const meta = UIManager.MUTATOR_META[mut] || { icon: '❗', label: mut };
            this.showMutatorToast(`${meta.icon} ${name} gained ${meta.label}`);
          } catch (e) { }
        }
      } catch (e) { }
    });
    state.eventBus.on(EVENTS.ATTACK, (detail) => {
      try {
        if (detail && detail.type === 'dodgeAvoid') {
          this.renderEnemies();
        }
      } catch (e) { }
    });
    // When a dodge is queued/ready, the card gets a dodge-ready class (rendered elsewhere).
    // When the dodge actually avoids an attack, an ATTACK event with type 'dodgeAvoid' is emitted.
    state.eventBus.on(EVENTS.ATTACK, (detail) => {
      try {
        if (detail && detail.type === 'dodgeAvoid' && detail.enemyId) {
          const layer = document.getElementById('enemyLayer');
          if (!layer) return;
          const card = layer.querySelector(`.enemy-card[data-enemy-id="${detail.enemyId}"]`);
          if (!card) return;
          // Add temporary visual and floating text
          card.classList.add('dodged');
          const rect = card.getBoundingClientRect();
          FloatingDamageNumber.show(rect.left + rect.width / 2, rect.top - 18, 'PARRIED!', { color: UIManager.themeColor('--success-green', '#44ff44'), duration: 1200 });
          setTimeout(() => { try { card.classList.remove('dodged'); } catch (e) { } }, 1200);
        }
      } catch (e) { }
    });
    // Sound hooks
    try {
      if (window.SoundManager) {
        state.eventBus.on(EVENTS.ATTACK, (detail) => {
          try {
            if (detail && detail.type === 'pet') {
              SoundManager.play('pet');
              return;
            }

            SoundManager.play('attack', {
              weaponName: detail?.weaponName,
              repeats: Math.max(1, Number(detail?.fireRate || 1)),
              gapMs: 42
            });
            if (detail && detail.isCrit) {
              SoundManager.play('crit');
            }
          } catch (e) { }
        });

        state.eventBus.on(EVENTS.DAMAGE_TAKEN, (d) => { try { SoundManager.play('hit'); } catch (e) { } });
        state.eventBus.on(EVENTS.KILL_ENEMY, (d) => { try { SoundManager.play('kill'); } catch (e) { } });
        state.eventBus.on(EVENTS.ENEMY_HEALED, (d) => { try { SoundManager.play('heal'); } catch (e) { } });
        state.eventBus.on(EVENTS.ENEMY_REVIVED, (d) => { try { SoundManager.play('revive'); } catch (e) { } });
        state.eventBus.on(EVENTS.GOLD_CHANGED, (d) => { try { SoundManager.play('coin'); } catch (e) { } });
        state.eventBus.on(EVENTS.CHECK_IN, (d) => { try { SoundManager.play('checkin'); } catch (e) { } });
        state.eventBus.on(EVENTS.CHECK_IN_COMPLETE, (detail) => {
          try {
            const D = detail?.missedDailyDamage ?? 0;
            const N = detail?.scaledN ?? 0;
            const late = detail?.lateTodoDamage ?? 0;
            this.playCheckInSequence(detail || {});
          } catch (e) { }
        });
        state.eventBus.on(EVENTS.DEATH_DEFIANCE, (detail) => {
          try {
            FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2, 'Death Defied!', { color: UIManager.themeColor('--success-green', '#44ff44'), duration: 2000, fadeDelay: 1200 });
            try { SoundManager.play('checkin'); } catch (e) { }
          } catch (e) { }
        });
        state.eventBus.on(EVENTS.DEATH, (d) => { try { SoundManager.play('death'); } catch (e) { } });
      }
    } catch (e) { }
    state.eventBus.on(EVENTS.TASK_COMPLETED, (detail) => {
      if (detail?.type === 'daily') this.scheduleUpdateDailiesList();
      if (detail?.type === 'todo') this.updateTodosList();
    });

    // Victory screen when game reports victory
    state.eventBus.on(EVENTS.VICTORY, (detail) => {
      try {
        const stats = {
          stage: detail?.stage,
          level: detail?.level,
          enemiesDefeated: state.systemState.runStats.enemiesDefeated,
          bossesSailed: state.systemState.runStats.bossesSailed,
          goldEarned: state.systemState.runStats.totalGoldEarned
        };
        PopupsManager.showVictoryScreen(stats);
      } catch (e) { console.warn('Failed to show victory screen', e); }
    });

    // pause, planner, shop buttons
    document.getElementById('pauseBtn').addEventListener('click', () => this.handlePauseClick());
    document.getElementById('plannerBtn').addEventListener('click', () => window.location.href = 'planner.html');
    const bestiaryBtn = document.getElementById('bestiaryBtn');
    if (bestiaryBtn) {
      bestiaryBtn.addEventListener('click', () => {
        if (typeof PopupsManager !== 'undefined' && typeof PopupsManager.showBestiary === 'function') {
          PopupsManager.showBestiary();
        }
      });
    }
    document.getElementById('shopBtn').addEventListener('click', () => this.toggleShopPanel());
    const lootboxBtnEl = document.getElementById('lootboxBtn');
    if (lootboxBtnEl) {
      lootboxBtnEl.addEventListener('click', () => {
        if (typeof PopupsManager !== 'undefined' && typeof PopupsManager.showLootbox === 'function') {
          PopupsManager.showLootbox();
        }
      });
    }

    const eventBannerPanel = document.getElementById('eventBannerPanel');
    if (eventBannerPanel) {
      eventBannerPanel.addEventListener('click', (e) => {
        const emojiTarget = e.target.closest('#eventBannerEmoji, .event-banner-emoji');
        if (!emojiTarget) return;

        const gs = getGameState();
        if (!gs.systemState?.specialEvent || gs.systemState.specialEvent.claimed) return;

        const event = gs.systemState.specialEvent;

        const eventUnlockMap = {
          'Sacred Tree': { key: 'sacredTree', streak: 5 },
          'Statue': { key: 'statue', streak: 8 },
          'Shrine': { key: 'shrine', streak: 9 }
        };
        const req = eventUnlockMap[event.type];
        const isEventUnlocked = req && typeof TaskManager !== 'undefined' && typeof TaskManager.isFeatureUnlocked === 'function'
          ? TaskManager.isFeatureUnlocked(req.key)
          : true;

        if (!isEventUnlocked && req) {
          if (typeof PopupsManager !== 'undefined' && PopupsManager.showSpecialEventClaimPopup) {
            let lockedRewardData = {
              name: `${event.type}`,
              icon: event.type === 'Shrine' ? '⛩️' : event.type === 'Statue' ? '🗿' : '🌳',
              description: `Maintain an average daily streak of ${req.streak} to unlock this event.`,
              claimButtonText: `Unlocks at Streak ${req.streak}`
            };
            PopupsManager.showSpecialEventClaimPopup(event, lockedRewardData, () => {});
          } else if (typeof FloatingDamageNumber !== 'undefined') {
            const rect = emojiTarget.getBoundingClientRect();
            FloatingDamageNumber.show(rect.left + rect.width / 2, rect.top, `🔒 Unlocks at Streak ${req.streak}`, { color: '#ff6666' });
          }
          return;
        }

        let isComplete = false;
        if (event.type === 'Shrine') {
          isComplete = TaskManager.isAllDailiesComplete() && (gs.dailiesState?.dailies?.length || 0) > 0;
        } else if (event.type === 'Statue') {
          const targets = event.targets || [];
          const missed = TaskManager.getMissedDailies().map(d => d.id);
          isComplete = targets.length > 0 && targets.every(t => !missed.includes(t));
        } else if (event.type === 'Sacred Tree') {
          const target = event.targets?.[0];
          const missed = TaskManager.getMissedDailies().map(d => d.id);
          isComplete = target && !missed.includes(target);
        }

        if (!isComplete) {
          if (typeof FloatingDamageNumber !== 'undefined') {
            const rect = emojiTarget.getBoundingClientRect();
            FloatingDamageNumber.show(rect.left + rect.width / 2, rect.top, 'Tasks incomplete!', { color: '#ff6666' });
          }
          return;
        }

        let rewardData = {
          name: 'Mysterious Reward',
          icon: '❓',
          description: 'You claim a mysterious benefit.',
          claimButtonText: 'CLAIM REWARD'
        };

        if (event.type === 'Sacred Tree') {
          if (!event.rewardType) {
            event.rewardType = Math.random() < 0.5 ? 'hp' : 'mana';
            event.rewardVal = Math.floor(Math.random() * 11) + 20; // 20 to 30
            gs.save();
          }
          const isHp = event.rewardType === 'hp';
          const statName = isHp ? 'Max HP' : 'Max Mana';
          const icon = isHp ? '❤️' : '💧';
          rewardData = {
            name: `+${event.rewardVal} ${statName}`,
            icon: icon,
            description: `Permanently increases your maximum ${isHp ? 'Health' : 'Mana'} by +${event.rewardVal}.`,
            claimButtonText: 'CLAIM STAT UPGRADE'
          };
        } else if (event.type === 'Shrine') {
          rewardData = {
            name: 'Sacred Skill Choice',
            icon: '⛩️',
            description: 'Allows you to choose a new powerful class skill to equip.',
            claimButtonText: 'CLAIM SKILL CHOICE'
          };
        } else if (event.type === 'Statue') {
          rewardData = {
            name: 'Statue Reward: Choose Talisman',
            icon: '🏺',
            description: 'Allows you to choose a new powerful talisman to equip.',
            claimButtonText: 'CHOOSE TALISMAN'
          };
        }

        const executeClaim = () => {
          event.claimed = true;
          try { if (window.SoundManager) SoundManager.play('coin'); } catch (e) { }

          if (event.type === 'Statue') {
            if (typeof PopupsManager !== 'undefined' && PopupsManager.showStatueTalismanChoice) {
              PopupsManager.showStatueTalismanChoice();
            }
          } else if (event.type === 'Sacred Tree') {
            if (!event.rewardType) {
              event.rewardType = Math.random() < 0.5 ? 'hp' : 'mana';
              event.rewardVal = Math.floor(Math.random() * 11) + 20;
            }
            const isHp = event.rewardType === 'hp';
            const val = event.rewardVal;
            if (isHp) {
              gs.playerState.maxHp = (gs.playerState.maxHp || gs.config.baseMaxHp) + val;
              gs.addHp(val);
              try { FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2, `+${val} Max HP`, { color: '#84cc16' }); } catch (err) { }
            } else {
              gs.playerState.maxMana = (gs.playerState.maxMana || gs.config.baseMaxMana) + val;
              gs.addMana(val);
              try { FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2, `+${val} Max Mana`, { color: '#3b82f6' }); } catch (err) { }
            }
          } else if (event.type === 'Shrine') {
            if (typeof PopupsManager !== 'undefined' && PopupsManager.showShrineSkillChoice) {
              PopupsManager.showShrineSkillChoice();
            }
          }

          gs.save();
          this.refreshEventBanner();
          this.refreshGameUI();
        };

        if (typeof PopupsManager !== 'undefined' && PopupsManager.showSpecialEventClaimPopup) {
          PopupsManager.showSpecialEventClaimPopup(event, rewardData, executeClaim);
        } else {
          executeClaim();
        }
      });
    }

    document.getElementById('diamondRewardsBtn').addEventListener('click', () => {
      try { UIManager.showDiamondRewards(); } catch (e) { console.warn('Failed to open diamond rewards popup', e); }
    });
    document.getElementById('checkInBtn').addEventListener('click', () => this.handleCheckInClick());
    document.getElementById('completeDayBtn')?.addEventListener('click', () => this.handleCompleteDayClick());
    document.getElementById('dailiesShowCompletedBtn')?.addEventListener('click', () => this.toggleShowCompleted('dailies'));
    document.getElementById('dailiesEditModeBtn')?.addEventListener('click', () => this.toggleEditMode('dailies'));
    document.getElementById('dailiesLockModeBtn')?.addEventListener('click', () => {
      if (typeof TaskManager !== 'undefined' && typeof TaskManager.isFeatureUnlocked === 'function' && !TaskManager.isFeatureUnlocked('lockIn')) {
        try { FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2, '🔒 Unlocks at Streak 7', { color: '#ff6666' }); } catch (err) {}
        return;
      }
      this.toggleLockMode();
    });
    document.getElementById('dailiesConnectionsBtn')?.addEventListener('click', () => this.toggleDailyConnections());
    document.getElementById('dailiesFocusBtn')?.addEventListener('click', () => this.toggleDailyFocus());
    document.getElementById('dailiesTableViewBtn')?.addEventListener('click', () => {
      try { PopupsManager.showDailiesTable(); } catch (e) { console.warn('Failed to open dailies table popup', e); }
    });
    document.getElementById('todosShowCompletedBtn')?.addEventListener('click', () => this.toggleShowCompleted('todos'));
    UIManager.isEraserActive = false;
    document.getElementById('todosEraserBtn')?.addEventListener('click', () => {
      UIManager.isEraserActive = !UIManager.isEraserActive;
      const btn = document.getElementById('todosEraserBtn');
      const board = document.getElementById('todosList');
      if (btn) {
        if (UIManager.isEraserActive) {
          btn.textContent = 'Eraser: ON';
          btn.style.borderColor = '#ff4d4d';
          btn.style.color = '#ff4d4d';
          btn.style.background = 'rgba(255, 77, 77, 0.2)';
          
          UIManager.isDrawingArrow = false;
          board?.classList.remove('drawing-arrow-mode');
          board?.classList.add('eraser-mode');
        } else {
          btn.textContent = 'Eraser: OFF';
          btn.style.borderColor = 'rgba(255,255,255,0.15)';
          btn.style.color = '#f5f5f7';
          btn.style.background = 'rgba(0,0,0,0.4)';
          board?.classList.remove('eraser-mode');
        }
      }
    });

    document.getElementById('dailiesTabHandle').addEventListener('click', () => this.toggleTaskPanel('dailies'));
    document.getElementById('todosTabHandle').addEventListener('click', () => this.toggleTaskPanel('todos'));
    document.getElementById('dailyToTodoPullBtn')?.addEventListener('click', () => {
      this.toggleTaskPanel('todos');
    });
    document.getElementById('todoToDailyPullBtn')?.addEventListener('click', () => {
      this.toggleTaskPanel('dailies');
    });
    document.getElementById('dailiesPanel').querySelector('.tab-close').addEventListener('click', () => this.closeTaskPanel('dailies'));
    document.getElementById('todosPanel').querySelector('.tab-close').addEventListener('click', () => this.closeTaskPanel('todos'));

    // Border Touch Swipe to open Dailies & Todos (Extreme edges only: <=15px or >=winWidth-15px)
    let swipeStartX = 0, swipeStartY = 0, isSingleTouch = false;
    document.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        isSingleTouch = true;
        swipeStartX = e.touches[0].clientX;
        swipeStartY = e.touches[0].clientY;
      } else {
        isSingleTouch = false;
      }
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
      if (!isSingleTouch || !e.changedTouches || e.changedTouches.length !== 1) return;
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const dx = endX - swipeStartX;
      const dy = endY - swipeStartY;

      // Require a strong, straight horizontal swipe (dx >= 80, dy <= 30) starting at extreme edges (15px)
      if (Math.abs(dx) >= 80 && Math.abs(dy) <= 30) {
        const winWidth = window.innerWidth;
        // Extreme left edge swipe right -> Open Dailies
        if (dx >= 80 && swipeStartX <= 15) {
          this.toggleTaskPanel('dailies');
        }
        // Extreme right edge swipe left -> Open Todos
        else if (dx <= -80 && swipeStartX >= winWidth - 15) {
          this.toggleTaskPanel('todos');
        }
      }
    }, { passive: true });
    document.getElementById('addDailyNoteBtn')?.addEventListener('click', () => this.addDailyNote());
    document.getElementById('dailiesFilterSelect')?.addEventListener('change', (e) => {
      const state = getGameState();
      if (!state.systemState.taskListFilters) state.systemState.taskListFilters = {};
      state.systemState.taskListFilters.dailyColorFilter = e.target.value;
      state.save();
      this.updateDailiesList();
    });
    document.getElementById('addDailyRectBtn')?.addEventListener('click', () => {
      UIManager.isDrawingRect = !UIManager.isDrawingRect;
      const board = document.getElementById('dailiesList');
      const btn = document.getElementById('addDailyRectBtn');
      if (board) {
        if (UIManager.isDrawingRect) {
          board.classList.add('drawing-rect-mode');
          btn?.classList.add('active');
          const state = getGameState();
          if (!state.systemState?.taskListFilters?.editModeDailies) {
            state.systemState.taskListFilters.editModeDailies = true;
            this.updateDailiesList();
          }
          try { FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2, 'Click & Drag on Background to Draw Rectangle ⚡', { color: '#e8b84a' }); } catch (err) {}
        } else {
          board.classList.remove('drawing-rect-mode');
          btn?.classList.remove('active');
        }
      }
    });
    document.getElementById('addTodoNoteBtn')?.addEventListener('change', (e) => {
      const type = e.target.value;
      if (type) {
        if (type === 'arrow') {
          UIManager.isDrawingArrow = true;
          const board = document.getElementById('todosList');
          if (board) {
            board.classList.add('drawing-arrow-mode');
            try { FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2, 'Click & Drag to Draw Arrow ⚡', { color: '#e8b84a' }); } catch (err) {}
          }
        } else {
          this.addTodoNote(type);
        }
        e.target.value = ''; // Reset select to placeholder
      }
    });

    // Initialize Top-Left Attribute Orbit Wheel
    const attributes = getGameState().config.attributes || ['STR', 'AGI', 'INT', 'VIT', 'LUK'];
    const orbitNodesContainer = document.getElementById('todoPresetOrbitNodes');
    const orbitCenter = document.getElementById('todoPresetAttrCenter');

    if (orbitNodesContainer) {
      const angleStep = 360 / attributes.length;
      const radius = 69;
      orbitNodesContainer.innerHTML = attributes.map((attr, i) => {
        const angle = angleStep * i - 90;
        const rad = (angle * Math.PI) / 180;
        const x = Math.round(96 + radius * Math.cos(rad));
        const y = Math.round(96 + radius * Math.sin(rad));
        const color = getGameState().config.attributeColors?.[attr] || '#4facfe';
        return `<div class="preset-orbit-node ${i === 0 ? 'active' : ''}" data-attr="${attr}" style="left:${x}px; top:${y}px; --attr-color:${color};" title="${attr}">${attr}</div>`;
      }).join('');

      if (orbitCenter && attributes.length > 0) {
        const defaultAttr = attributes[0];
        orbitCenter.textContent = defaultAttr;
        orbitCenter.dataset.selectedAttr = defaultAttr;
        const col = getGameState().config.attributeColors?.[defaultAttr] || '#4facfe';
        orbitCenter.style.color = col;
        orbitCenter.style.borderColor = col;
      }

      orbitNodesContainer.querySelectorAll('.preset-orbit-node').forEach(node => {
        node.addEventListener('click', (e) => {
          e.stopPropagation();
          const attr = node.dataset.attr;
          orbitNodesContainer.querySelectorAll('.preset-orbit-node').forEach(n => n.classList.remove('active'));
          node.classList.add('active');
          if (orbitCenter) {
            orbitCenter.textContent = attr;
            orbitCenter.dataset.selectedAttr = attr;
            const col = getGameState().config.attributeColors?.[attr] || '#4facfe';
            orbitCenter.style.color = col;
            orbitCenter.style.borderColor = col;
          }
        });
      });
    }

    // Initialize Shape Silhouette Difficulty Selector
    const shapeBtns = document.querySelectorAll('#todoPresetDiffShapes .preset-shape-btn');
    shapeBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        shapeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    // Initialize Deadline Quick Chips & Date Input
    const todoPresetDate = document.getElementById('todoPresetDate');
    if (todoPresetDate) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const quickTs = (typeof UIManager !== 'undefined' && UIManager.quickDayDeadline) ? UIManager.quickDayDeadline : null;
      const defaultDate = quickTs ? new Date(quickTs) : tomorrow;
      todoPresetDate.value = defaultDate.toISOString().slice(0, 10);
    }

    const dateChips = document.querySelectorAll('.preset-date-chips .preset-chip');
    dateChips.forEach(chip => {
      chip.addEventListener('click', (e) => {
        e.stopPropagation();
        dateChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const addDays = Number(chip.dataset.days || 0);
        const d = new Date();
        d.setDate(d.getDate() + addDays);
        if (todoPresetDate) {
          todoPresetDate.value = d.toISOString().slice(0, 10);
        }
      });
    });

    // Difficulty filter listener
    UIManager.currentTodoDifficultyFilter = 'All';
    document.getElementById('todosDifficultyFilter')?.addEventListener('change', (e) => {
      UIManager.currentTodoDifficultyFilter = e.target.value;
      UIManager.updateTodosList();
    });

    // Achievements & Pet & Cosmetics Tab Handles & Close Listeners
    document.getElementById('achievementsTabHandle').addEventListener('click', () => this.toggleTaskPanel('achievements'));
    document.getElementById('petTabHandle').addEventListener('click', () => this.toggleTaskPanel('pet'));
    document.getElementById('cosmeticsTabHandle').addEventListener('click', () => this.toggleTaskPanel('cosmetics'));
    document.getElementById('achievementsPanel').querySelector('.tab-close').addEventListener('click', () => this.closeTaskPanel('achievements'));
    document.getElementById('petPanel').querySelector('.tab-close').addEventListener('click', () => this.closeTaskPanel('pet'));
    document.getElementById('cosmeticsPanel').querySelector('.tab-close').addEventListener('click', () => this.closeTaskPanel('cosmetics'));

    // Achievements controls
    document.getElementById('achievementsSortSelect')?.addEventListener('change', (e) => {
      UIManager.achievementsSortBy = e.target.value;
      UIManager.updateAchievementsList();
    });
    document.getElementById('achievementsRecalculateBtn')?.addEventListener('click', () => {
      TaskManager.recalculateAchievements();
      UIManager.updateAchievementsList();
    });

    // Pet controls
    const petInput = document.getElementById('petImageFileInput');
    petInput?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 160;
          let w = img.width;
          let h = img.height;
          if (w > h) {
            if (w > maxDim) {
              h = Math.round(h * (maxDim / w));
              w = maxDim;
            }
          } else {
            if (h > maxDim) {
              w = Math.round(w * (maxDim / h));
              h = maxDim;
            }
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);

          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
          const state = getGameState();
          state.playerState.petImage = compressedBase64;
          state.save();
          UIManager.updatePetUI();
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });

    document.getElementById('petUploadBtn')?.addEventListener('click', () => {
      document.getElementById('petImageFileInput')?.click();
    });

    document.getElementById('petClearImageBtn')?.addEventListener('click', () => {
      const state = getGameState();
      state.playerState.petImage = null;
      state.save();
      UIManager.updatePetUI();
    });

    document.getElementById('petUpgradeBtn')?.addEventListener('click', () => {
      const state = getGameState();
      const petUpgradeLevel = state.playerState.petUpgradeLevel || 0;
      const cost = 5 + petUpgradeLevel * 2;
      if (state.playerState.petPoints >= cost) {
        state.playerState.petPoints -= cost;
        state.playerState.petUpgradeLevel = petUpgradeLevel + 1;
        state.playerState.petLevel = (state.playerState.petLevel || 1) + 1;
        state.save();
        UIManager.updatePetUI();
        try { SoundManager.play('levelUp'); } catch (err) { }
      }
    });
    // add buttons
    const dailiesAdd = document.getElementById('dailiesAddBtn');
    if (dailiesAdd) dailiesAdd.addEventListener('click', () => {
      const created = TaskManager.addDaily('New Daily', 'Easy', getGameState().config.attributes[0], 1);
      if (created) {
        this.scheduleUpdateDailiesList();
        getGameState().save();
      }
    });



    const todosBulkAdd = document.getElementById('todosBulkAddBtn');
    if (todosBulkAdd) todosBulkAdd.addEventListener('click', () => {
      try { PopupsManager.showBulkAddTodo(); } catch (e) { console.warn('Failed to show bulk add popup', e); }
    });

    // Quick Day feature
    const quickDayBtn = document.getElementById('quickDayBtn');
    const quickDayClearBtn = document.getElementById('quickDayClearBtn');
    const updateQuickDayBar = () => {
      const btn = document.getElementById('quickDayBtn');
      const clearBtn = document.getElementById('quickDayClearBtn');
      const bar = document.getElementById('quickDayBar');
      if (!btn) return;
      if (UIManager.quickDayDeadline) {
        const d = new Date(UIManager.quickDayDeadline);
        btn.textContent = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
        btn.classList.add('active');
        if (bar) bar.classList.add('active');
        if (clearBtn) clearBtn.style.display = 'inline-flex';
      } else {
        btn.textContent = 'Not set';
        btn.classList.remove('active');
        if (bar) bar.classList.remove('active');
        if (clearBtn) clearBtn.style.display = 'none';
      }
    };
    UIManager._updateQuickDayBar = updateQuickDayBar;
    updateQuickDayBar();

    if (quickDayBtn) quickDayBtn.addEventListener('click', () => {
      try { PopupsManager.showQuickDayPicker(updateQuickDayBar); } catch (e) { console.warn('QuickDay popup error', e); }
    });
    if (quickDayClearBtn) quickDayClearBtn.addEventListener('click', () => {
      UIManager.quickDayDeadline = null;
      updateQuickDayBar();
    });

    // Center attributes button opens attributes modal
    const centerAttrBtn = document.getElementById('centerAttrBtn');
    if (centerAttrBtn) centerAttrBtn.addEventListener('click', () => {
      try { PopupsManager.showAttributes(); } catch (e) { }
    });

    this.bindTaskInteractions();
    this.updateActionCosts();
    this.positionActionButtons();
    this.setupDragTargeting();

    window.addEventListener('resize', () => {
      UIManager.circleRectCache = null;
      UIManager.enemyPositionsCache = null;
      if (this.resizeScheduled) return;
      this.resizeScheduled = true;
      requestAnimationFrame(() => {
        this.updateStageBackdrop();
        this.renderEnemies();
        this.positionActionButtons();
        this.positionDailyCards();
        this.positionTodoCards();
        this.adjustLayout();
        this.resizeScheduled = false;
      });
    });
  }

  static toggleTaskPanel(which) {
    const panels = ['dailies', 'todos', 'achievements', 'pet', 'cosmetics'];
    panels.forEach(p => {
      if (p !== which) {
        this.closeTaskPanel(p);
      }
    });

    const panelId = which === 'dailies' ? 'dailiesPanel' :
      which === 'todos' ? 'todosPanel' :
        which === 'achievements' ? 'achievementsPanel' :
          which === 'cosmetics' ? 'cosmeticsPanel' : 'petPanel';
    const panel = document.getElementById(panelId);
    if (!panel) return;
    const open = panel.classList.contains('open');
    this.closeTaskPanel(which);
    if (!open) {
      panel.classList.add('open');
      if (which === 'dailies' || which === 'todos') {
        const fw = document.getElementById('focusCircleWidget');
        if (fw) fw.style.display = 'block';
      } else {
        const fw = document.getElementById('focusCircleWidget');
        if (fw) fw.style.display = 'none';
      }
      // After the open transition, ensure the board is rendered and positioned
      setTimeout(() => {
        try {
          if (which === 'todos') {
            this.updateTodosList();
            this.positionTodoCards();
          } else if (which === 'dailies') {
            this.scheduleUpdateDailiesList();
            this.positionDailyCards();
          } else if (which === 'achievements') {
            this.updateAchievementsList();
          } else if (which === 'pet') {
            this.updatePetUI();
          } else if (which === 'cosmetics') {
            this.updateCosmeticsList();
          }
        } catch (e) { /* ignore */ }
      }, 260);
    }
    this.updateJoystickUI();
    this.updateTodoJoystickUI();
  }

  static closeTaskPanel(which) {
    const panelId = which === 'dailies' ? 'dailiesPanel' :
      which === 'todos' ? 'todosPanel' :
        which === 'achievements' ? 'achievementsPanel' :
          which === 'cosmetics' ? 'cosmeticsPanel' : 'petPanel';
    const panel = document.getElementById(panelId);
    panel?.classList.remove('open');
    this.updateJoystickUI();
    this.updateTodoJoystickUI();
  }

  static achievementsSortBy = 'rate';

  static updateAchievementsList() {
    const state = getGameState();
    const container = document.getElementById('achievementsList');
    if (!container) return;

    let dailies = [...state.dailiesState.dailies];

    // Sort dailies
    if (this.achievementsSortBy === 'rate') {
      dailies.sort((a, b) => (b.completionRate || 0) - (a.completionRate || 0));
    } else {
      dailies.sort((a, b) => (b.longestStreak || 0) - (a.longestStreak || 0));
    }

    if (dailies.length === 0) {
      container.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 8px; padding: 20px; line-height: 1.6;">No dailies found.<br>Create dailies first!</div>`;
      return;
    }

    let html = '';
    const escapeHTML = (str) => String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    dailies.forEach(d => {
      const ratePct = Math.round((d.completionRate || 0) * 100);
      const streak = d.longestStreak || 0;
      const totalComp = d.totalCompletions || 0;
      const totalDays = d.totalCount || 0;

      let rateColor = 'var(--text-muted)';
      if (ratePct >= 80) rateColor = '#44ff44';
      else if (ratePct >= 50) rateColor = '#ffaa00';
      else if (ratePct > 0) rateColor = '#ff4444';

      let streakColor = 'var(--text-muted)';
      if (streak >= 7) streakColor = 'var(--accent-gold)';
      else if (streak >= 3) streakColor = 'var(--accent-copper)';

      html += `
        <div class="achievement-card" style="display: flex; flex-direction: column; gap: 6px; padding: 10px 12px; border: 1px solid rgba(255, 255, 255, 0.08); border-left: 4px solid var(--accent-copper); background: linear-gradient(180deg, rgba(10, 8, 5, 0.96), rgba(8, 6, 4, 0.98)); border-radius: 6px; margin-bottom: 8px;">
          <div class="achievement-card-title" style="font-size: 10px; font-weight: bold; color: var(--accent-gold);">${escapeHTML(d.name)}</div>
          <div class="achievement-card-stats" style="display: flex; justify-content: space-between; font-size: 8px; color: var(--text-muted);">
            <span>Streak: <strong style="color: ${streakColor}">${streak} days</strong></span>
            <span>Rate: <strong style="color: ${rateColor}">${ratePct}%</strong> (${totalComp}/${totalDays})</span>
          </div>
        </div>
      `;
    });
    container.innerHTML = html;
  }

  static updateCosmeticsList() {
    const state = getGameState();
    const container = document.getElementById('cosmeticsList');
    if (!container) return;

    if (!UIManager.activeCosmeticsSubtab) {
      UIManager.activeCosmeticsSubtab = 'death';
    }
    const subtab = UIManager.activeCosmeticsSubtab;

    // Highlight active subtab buttons
    const panel = document.getElementById('cosmeticsPanel');
    if (panel) {
      panel.querySelectorAll('.cosmetics-tab-btn').forEach(btn => {
        if (btn.dataset.subtab === subtab) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
    }

    if (subtab === 'death') {
      if (!Array.isArray(state.playerState.unlockedDeathEffects)) {
        state.playerState.unlockedDeathEffects = ['Default'];
      }
      if (!state.playerState.equippedDeathEffect) {
        state.playerState.equippedDeathEffect = 'Default';
      }

      const effects = state.config.deathEffects || {};
      const maxDiamonds = (typeof TaskManager !== 'undefined' && typeof TaskManager.getMaxPotentialDiamonds === 'function')
        ? TaskManager.getMaxPotentialDiamonds()
        : 0;

      let html = '';
      Object.entries(effects).forEach(([id, info]) => {
        const isUnlocked = state.playerState.unlockedDeathEffects.includes(id);
        const isEquipped = state.playerState.equippedDeathEffect === id;

        const priceMultiplier = info.tier === 'premium' ? 3.0 : 2.0;
        const minPrice = info.tier === 'premium' ? 15 : 10;
        const cost = Math.max(minPrice, Math.ceil(maxDiamonds * priceMultiplier));

        let btnHtml = '';
        if (isEquipped) {
          btnHtml = `<button class="btn-cosmetic-action btn-equipped-cosmetic" disabled>EQUIPPED</button>`;
        } else if (isUnlocked) {
          btnHtml = `<button class="btn-cosmetic-action btn-equip-cosmetic" data-id="${id}">EQUIP</button>`;
        } else {
          const canAfford = (state.playerState.diamonds || 0) >= cost;
          btnHtml = `<button class="btn-cosmetic-action btn-buy-cosmetic" data-id="${id}" data-cost="${cost}" ${canAfford ? '' : 'disabled'}>BUY (${cost} 💎)</button>`;
        }

        html += `
          <div class="cosmetic-card ${info.tier}">
            <div class="cosmetic-card-info">
              <span class="cosmetic-name">${info.previewIcon} ${info.name}</span>
              <span class="cosmetic-desc">${info.desc}</span>
              <span class="cosmetic-tier">${info.tier.toUpperCase()}</span>
            </div>
            <div class="cosmetic-card-actions" style="display: flex; flex-direction: column; gap: 4px;">
              ${btnHtml}
              <button class="btn-cosmetic-action btn-preview-cosmetic" data-id="${id}">PREVIEW</button>
            </div>
          </div>
        `;
      });

      container.innerHTML = html;

      container.querySelectorAll('.btn-cosmetic-action').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const id = e.currentTarget.dataset.id;
          if (btn.classList.contains('btn-buy-cosmetic')) {
            const cost = Number(e.currentTarget.dataset.cost);
            if ((state.playerState.diamonds || 0) >= cost) {
              state.spendDiamonds(cost);
              state.unlockDeathEffect(id);
              state.save();
              this.updateCosmeticsList();
              try { SoundManager.play('coin'); } catch (err) { }
              FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2, `Unlocked ${id}!`, {
                color: UIManager.themeColor('--accent-gold', '#FFB33F')
              });
            }
          } else if (btn.classList.contains('btn-equip-cosmetic')) {
            state.equipDeathEffect(id);
            state.save();
            this.updateCosmeticsList();
            try { SoundManager.play('lootbox_open'); } catch (err) { }
          } else if (btn.classList.contains('btn-preview-cosmetic')) {
            const prevEquipped = state.playerState.equippedDeathEffect;
            state.playerState.equippedDeathEffect = id;

            const panel = document.getElementById('cosmeticsPanel');
            if (panel) {
              panel.classList.add('preview-hiding');
            }

            try {
              EnemyDeathAnimation.burst(window.innerWidth / 2, window.innerHeight / 2 - 100, false);
              FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2, `Previewing ${id}`, {
                color: '#ffd700',
                duration: 1000
              });
            } catch (err) {
              console.warn(err);
            } finally {
              state.playerState.equippedDeathEffect = prevEquipped;
              setTimeout(() => {
                if (panel) {
                  panel.classList.remove('preview-hiding');
                }
              }, 1200);
            }
          }
        });
      });
    } else {
      // Completion sub-tab!
      if (!Array.isArray(state.playerState.unlockedCompletionAnimations)) {
        state.playerState.unlockedCompletionAnimations = ['Default'];
      }
      if (!state.playerState.equippedCompletionAnimation) {
        state.playerState.equippedCompletionAnimation = 'Default';
      }

      const anims = state.config.completionAnimations || {};
      const maxDiamonds = (typeof TaskManager !== 'undefined' && typeof TaskManager.getMaxPotentialDiamonds === 'function')
        ? TaskManager.getMaxPotentialDiamonds()
        : 0;

      let html = '';
      Object.entries(anims).forEach(([id, info]) => {
        const isUnlocked = state.playerState.unlockedCompletionAnimations.includes(id);
        const isEquipped = state.playerState.equippedCompletionAnimation === id;

        const priceMultiplier = info.tier === 'premium' ? 3.0 : 2.0;
        const minPrice = info.tier === 'premium' ? 15 : 10;
        const cost = Math.max(minPrice, Math.ceil(maxDiamonds * priceMultiplier));

        let btnHtml = '';
        if (isEquipped) {
          btnHtml = `<button class="btn-cosmetic-action btn-equipped-cosmetic" disabled>EQUIPPED</button>`;
        } else if (isUnlocked) {
          btnHtml = `<button class="btn-cosmetic-action btn-equip-cosmetic" data-id="${id}">EQUIP</button>`;
        } else {
          const canAfford = (state.playerState.diamonds || 0) >= cost;
          btnHtml = `<button class="btn-cosmetic-action btn-buy-cosmetic" data-id="${id}" data-cost="${cost}" ${canAfford ? '' : 'disabled'}>BUY (${cost} 💎)</button>`;
        }

        html += `
          <div class="cosmetic-card ${info.tier}">
            <div class="cosmetic-card-info">
              <span class="cosmetic-name">${info.previewIcon} ${info.name}</span>
              <span class="cosmetic-desc">${info.desc}</span>
              <span class="cosmetic-tier">${info.tier.toUpperCase()}</span>
            </div>
            <div class="cosmetic-card-actions" style="display: flex; flex-direction: column; gap: 4px;">
              ${btnHtml}
              <button class="btn-cosmetic-action btn-preview-cosmetic" data-id="${id}">PREVIEW</button>
            </div>
          </div>
        `;
      });

      container.innerHTML = html;

      container.querySelectorAll('.btn-cosmetic-action').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const id = e.currentTarget.dataset.id;
          if (btn.classList.contains('btn-buy-cosmetic')) {
            const cost = Number(e.currentTarget.dataset.cost);
            if ((state.playerState.diamonds || 0) >= cost) {
              state.spendDiamonds(cost);
              state.unlockCompletionAnimation(id);
              state.save();
              this.updateCosmeticsList();
              try { SoundManager.play('coin'); } catch (err) { }
              FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2, `Unlocked ${id}!`, {
                color: UIManager.themeColor('--accent-gold', '#FFB33F')
              });
            }
          } else if (btn.classList.contains('btn-equip-cosmetic')) {
            state.equipCompletionAnimation(id);
            state.save();
            this.updateCosmeticsList();
            try { SoundManager.play('lootbox_open'); } catch (err) { }
          } else if (btn.classList.contains('btn-preview-cosmetic')) {
            const panel = document.getElementById('cosmeticsPanel');
            if (panel) {
              panel.classList.add('preview-hiding');
            }

            // Create temporary dummy element in screen center for preview
            const dummyCard = document.createElement('div');
            dummyCard.className = 'task-card';
            dummyCard.style.cssText = `
              position: fixed;
              left: 50%;
              top: 50%;
              transform: translate(-50%, -50%);
              width: 200px;
              height: 100px;
              background: linear-gradient(135deg, #1e1e2f, #2d2d44);
              border: 1px solid var(--accent-gold, #ffd700);
              border-radius: 8px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-family: 'Orbitron', monospace;
              font-size: 8px;
              color: #fff;
              box-shadow: 0 10px 25px rgba(0,0,0,0.5);
              z-index: 99999;
              pointer-events: none;
            `;
            dummyCard.textContent = 'TASK COMPLETED!';
            document.body.appendChild(dummyCard);

            try {
              if (typeof RetroTaskCompleteAnimation !== 'undefined') {
                RetroTaskCompleteAnimation.play(dummyCard, id);
              }
            } catch (err) {
              console.warn(err);
            }

            setTimeout(() => {
              try { dummyCard.remove(); } catch (e) {}
              if (panel) {
                panel.classList.remove('preview-hiding');
              }
            }, 1200);
          }
        });
      });
    }
  }

  static updatePetUI() {
    const state = getGameState();
    const isPetUnlocked = (typeof TaskManager !== 'undefined' && typeof TaskManager.isFeatureUnlocked === 'function')
      ? TaskManager.isFeatureUnlocked('pet')
      : true;

    const petBoard = document.querySelector('.pet-board');
    if (petBoard) {
      let lockOverlay = document.getElementById('petLockOverlay');
      if (!isPetUnlocked) {
        if (!lockOverlay) {
          lockOverlay = document.createElement('div');
          lockOverlay.id = 'petLockOverlay';
          lockOverlay.style.cssText = 'position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 12px; font-weight: bold; color: var(--accent-gold, #ffd700); font-size: 14px; background: rgba(18, 14, 30, 0.96); z-index: 100; border-radius: 12px; padding: 24px; pointer-events: auto;';
          lockOverlay.innerHTML = `
            <span style="font-size: 48px;">🔒</span>
            <span>Unlocks at Streak 1</span>
            <div style="font-size: 10px; color: var(--text-muted); font-weight: normal; max-width: 220px; line-height: 1.4;">
              Reach an average daily streak of 1 to unlock your Pet companion!
            </div>
          `;
          petBoard.style.position = 'relative';
          petBoard.appendChild(lockOverlay);
        }
        lockOverlay.style.display = 'flex';
        return;
      } else if (lockOverlay) {
        lockOverlay.style.display = 'none';
      }
    }

    const imgDisplay = document.getElementById('petImageDisplay');
    const levelVal = document.getElementById('petLevelVal');
    const dmgBonusVal = document.getElementById('petDmgBonusVal');
    const pointsVal = document.getElementById('petPointsVal');
    const hungerText = document.getElementById('petHungerTextVal');
    const hungerFill = document.getElementById('petHungerFill');
    const upgradeBtn = document.getElementById('petUpgradeBtn');
    const upgradeCostVal = document.getElementById('petUpgradeCostVal');
    const clearPicBtn = document.getElementById('petClearImageBtn');

    if (!levelVal) return;

    const petPoints = state.playerState.petPoints || 0;
    const petLevel = state.playerState.petLevel || 1;
    const petUpgradeLevel = state.playerState.petUpgradeLevel || 0;
    const petHunger = state.playerState.petHunger !== undefined ? state.playerState.petHunger : 100;
    const petEmoji = state.playerState.petEmoji || '🐾';
    const petImage = state.playerState.petImage;

    if (petImage) {
      imgDisplay.innerHTML = `<img src="${petImage}" style="width: 100%; height: 100%; object-fit: cover;">`;
      if (clearPicBtn) clearPicBtn.style.display = 'inline-block';
    } else {
      imgDisplay.innerHTML = petEmoji;
      if (clearPicBtn) clearPicBtn.style.display = 'none';
    }

    levelVal.textContent = petLevel;
    const dmgBonusPct = petUpgradeLevel * 1.5;
    const dmgBonusFlat = Math.round(state.playerState.maxAp * (petUpgradeLevel * 0.015));
    dmgBonusVal.textContent = `${dmgBonusFlat} (+${dmgBonusPct}% AP)`;
    pointsVal.textContent = petPoints;

    hungerText.textContent = `${petHunger}/100`;
    if (hungerFill) {
      hungerFill.style.width = `${petHunger}%`;
      if (petHunger === 0) {
        hungerFill.style.background = '#ff2222';
        hungerText.innerHTML = `<span style="color:#ff2222; animation: blink 1s infinite;">STARVING! (0% Dmg)</span>`;
      } else if (petHunger <= 30) {
        hungerFill.style.background = 'linear-gradient(90deg, #ffaa00, #ffcc00)';
      } else {
        hungerFill.style.background = 'linear-gradient(90deg, #30C85A, #7AE88E)';
      }
    }

    const cost = 5 + petUpgradeLevel * 2;
    if (upgradeCostVal) upgradeCostVal.textContent = cost;
    if (upgradeBtn) {
      upgradeBtn.disabled = petPoints < cost;
    }

    const emojiGrid = document.getElementById('petEmojiGrid');
    if (emojiGrid) {
      const emojis = ['🐾', '🐶', '🐱', '🦊', '🦁', '🦉', '🐉', '🐼', '🐸', '🦄', '🦅', '🦖'];
      let emojiHtml = '';
      emojis.forEach(em => {
        const activeClass = em === petEmoji ? 'active' : '';
        emojiHtml += `
          <button class="pet-emoji-btn ${activeClass}" data-emoji="${em}" style="font-size: 16px; padding: 6px; border-radius: 6px; border: 1px solid rgba(255, 255, 255, 0.08); background: rgba(0,0,0,0.2); cursor: pointer; transition: all 0.15s;">
            ${em}
          </button>
        `;
      });
      emojiGrid.innerHTML = emojiHtml;

      emojiGrid.querySelectorAll('.pet-emoji-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          state.playerState.petEmoji = btn.dataset.emoji;
          state.save();
          UIManager.updatePetUI();
        });
      });
    }

    const foodGrid = document.getElementById('petFoodGrid');
    if (foodGrid) {
      const foods = [
        { name: 'Berry', emoji: '🍓', cost: 1, hunger: 10 },
        { name: 'Donut', emoji: '🍩', cost: 1, hunger: 15 },
        { name: 'Apple', emoji: '🍎', cost: 1, hunger: 15 },
        { name: 'Banana', emoji: '🍌', cost: 1, hunger: 25 },
        { name: 'Carrot', emoji: '🥕', cost: 1, hunger: 20 },
        { name: 'Cookie', emoji: '🍪', cost: 1, hunger: 10 },
        { name: 'Cheese', emoji: '🧀', cost: 2, hunger: 30 },
        { name: 'Melon', emoji: '🍉', cost: 2, hunger: 40 },
        { name: 'Ice Cream', emoji: '🍦', cost: 2, hunger: 30 },
        { name: 'Fish', emoji: '🐟', cost: 2, hunger: 35 },
        { name: 'Burger', emoji: '🍔', cost: 3, hunger: 50 },
        { name: 'Chicken', emoji: '🍗', cost: 3, hunger: 70 },
        { name: 'Meat', emoji: '🍖', cost: 3, hunger: 60 },
        { name: 'Pizza', emoji: '🍕', cost: 4, hunger: 80 },
        { name: 'Sushi', emoji: '🍣', cost: 4, hunger: 75 },
        { name: 'Steak', emoji: '🥩', cost: 5, hunger: 100 },
        { name: 'Cake', emoji: '🍰', cost: 5, hunger: 100 },
        { name: 'Honey', emoji: '🍯', cost: 8, hunger: 100 }
      ];

      let foodHtml = '';
      foods.forEach(f => {
        const canAfford = petPoints >= f.cost;
        foodHtml += `
          <button class="pet-food-card" data-cost="${f.cost}" data-hunger="${f.hunger}" ${canAfford ? '' : 'disabled'} style="display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 8px 4px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.08); background: rgba(255, 255, 255, 0.04); cursor: pointer; transition: all 0.15s;">
            <div style="font-size: 18px;">${f.emoji}</div>
            <div style="font-size: 6px; color: var(--text-white); font-weight: bold;">${f.name}</div>
            <div style="font-size: 5px; color: var(--text-muted);">+${f.hunger}H</div>
            <div style="font-size: 6px; color: var(--accent-gold); font-weight: bold; margin-top: 2px;">${f.cost} Pts</div>
          </button>
        `;
      });
      foodGrid.innerHTML = foodHtml;

      foodGrid.querySelectorAll('.pet-food-card').forEach(card => {
        card.addEventListener('click', () => {
          const cost = parseInt(card.dataset.cost, 10);
          const hunger = parseInt(card.dataset.hunger, 10);

          if (state.playerState.petPoints >= cost) {
            state.playerState.petPoints -= cost;
            state.playerState.petHunger = Math.min(100, (state.playerState.petHunger || 0) + hunger);
            state.save();
            UIManager.updatePetUI();
            try {
              SoundManager.play('heal');
            } catch (e) { }
          }
        });
      });
    }

    // ----------------------------------------------------
    // Render animations grid
    // ----------------------------------------------------
    const maxDailyPP = (state.dailiesState.dailies || []).reduce((sum, d) => {
      const map = { Easy: 1, Medium: 2, Hard: 3, Ultra: 4 };
      return sum + (map[d.difficulty] || 1);
    }, 0) + 5;
    const animCost = Math.ceil(maxDailyPP * 0.5);

    const animCostEl = document.getElementById('petAnimCostVal');
    if (animCostEl) {
      animCostEl.textContent = animCost;
    }

    if (!Array.isArray(state.playerState.unlockedPetAnimations)) {
      state.playerState.unlockedPetAnimations = ['Default'];
    }
    if (!state.playerState.equippedPetAnimation) {
      state.playerState.equippedPetAnimation = 'Default';
    }

    const animGrid = document.getElementById('petAnimGrid');
    if (animGrid) {
      const animations = [
        { id: 'Default', name: 'Default', desc: 'Standard hop above target' },
        { id: 'Fierce Charge', name: 'Fierce Charge', desc: 'Lunge directly at target' },
        { id: 'Double Flip', name: 'Double Flip', desc: 'Twin 360-degree spins' },
        { id: 'Meteor Drop', name: 'Meteor Drop', desc: 'Slam from above with power' },
        { id: 'Spectral Pulse', name: 'Spectral Pulse', desc: 'Grow large with magic glow' },
        { id: 'Vortex Spin', name: 'Vortex Spin', desc: 'Circular spiral movement' },
        { id: 'Earthquake Shake', name: 'Earthquake Shake', desc: 'Vibrate violently on spot' }
      ];

      let animHtml = '';
      animations.forEach(a => {
        const isUnlocked = state.playerState.unlockedPetAnimations.includes(a.id);
        const isEquipped = state.playerState.equippedPetAnimation === a.id;

        let btnHtml = '';
        if (isEquipped) {
          btnHtml = `<button class="btn-anim-action btn-equipped-anim" disabled>EQUIPPED</button>`;
        } else if (isUnlocked) {
          btnHtml = `<button class="btn-anim-action btn-equip-anim" data-id="${a.id}">EQUIP</button>`;
        } else {
          const canAfford = petPoints >= animCost;
          btnHtml = `<button class="btn-anim-action btn-buy-anim" data-id="${a.id}" ${canAfford ? '' : 'disabled'}>BUY</button>`;
        }

        animHtml += `
          <div class="pet-anim-card">
            <div class="pet-anim-card-info">
              <span class="pet-anim-name">${a.name}</span>
              <span class="pet-anim-desc">${a.desc}</span>
            </div>
            <div class="pet-anim-card-action">
              ${btnHtml}
            </div>
          </div>
        `;
      });
      animGrid.innerHTML = animHtml;

      animGrid.querySelectorAll('.btn-anim-action').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const id = e.currentTarget.dataset.id;
          if (btn.classList.contains('btn-buy-anim')) {
            if (state.playerState.petPoints >= animCost) {
              state.playerState.petPoints -= animCost;
              if (!state.playerState.unlockedPetAnimations.includes(id)) {
                state.playerState.unlockedPetAnimations.push(id);
              }
              state.save();
              UIManager.updatePetUI();
              try { SoundManager.play('coin'); } catch (err) { }
            }
          } else if (btn.classList.contains('btn-equip-anim')) {
            state.playerState.equippedPetAnimation = id;
            state.save();
            UIManager.updatePetUI();
            try { SoundManager.play('lootbox_open'); } catch (err) { }
          }
        });
      });
    }
  }

  static bindTaskInteractions() {
    const state = getGameState();
    const bindContainer = (containerId, taskType) => {
      const container = document.getElementById(containerId);
      if (!container || container.dataset.bound === '1') return;

      container.dataset.bound = '1';
      container.addEventListener('click', (event) => {
        const card = event.target.closest('.task-card, .task-card-daily');
        if (!card) return;

        const taskId = card.dataset.id;
        if (!taskId) return;

        if ((taskType === 'daily' && Date.now() < UIManager.dailyDragSuppressUntil) || (taskType === 'todo' && Date.now() < UIManager.todoDragSuppressUntil)) {
          return;
        }

        // Subtask interactions: toggle, remove, add
        const subtaskCheckbox = event.target.closest('.subtask-checkbox');
        if (subtaskCheckbox) {
          const todoId = card.dataset.id;
          const subtaskId = subtaskCheckbox.dataset.subtaskId;
          if (todoId && subtaskId) {
            TaskManager.toggleSubtask(todoId, subtaskId);
            try { state.save(); } catch (e) { }
            this.updateTodosList();
          }
          return;
        }

        const subtaskRemove = event.target.closest('.subtask-remove');
        if (subtaskRemove) {
          const todoId = card.dataset.id;
          const subtaskId = subtaskRemove.dataset.subtaskId;
          if (todoId && subtaskId) {
            TaskManager.removeSubtask(todoId, subtaskId);
            try { state.save(); } catch (e) { }
            this.updateTodosList();
          }
          return;
        }

        const subtaskAddBtn = event.target.closest('.subtask-add-btn');
        if (subtaskAddBtn) {
          const todoId = subtaskAddBtn.dataset.todoId || card.dataset.id;
          const input = card.querySelector('.subtask-input');
          const name = input ? input.value.trim() : '';
          if (name) {
            TaskManager.addSubtask(todoId, name);
            try { state.save(); } catch (e) { }
            this.updateTodosList();
          }
          return;
        }

        const deleteDaily = event.target.closest('.btn-delete-daily');
        if (deleteDaily && taskType === 'daily') {
          const dailyName = card.querySelector('.daily-title')?.textContent || card.querySelector('.task-shape-name')?.textContent || 'this daily';
          if (!confirm(`Delete "${dailyName}"?`)) return;

          if (TaskManager.removeDaily(taskId)) {
            try { state.save(); } catch (e) { }
            this.scheduleUpdateDailiesList();
            this.renderEnemies();
          }
          return;
        }

        const deleteTodo = event.target.closest('.btn-todo-delete');
        if (deleteTodo && taskType === 'todo') {
          const todoObj = TaskManager.getTaskById(taskId);
          const todoName = todoObj?.name || card.querySelector('.todo-title')?.textContent?.trim() || 'this to-do';
          if (!confirm(`Delete "${todoName}"?`)) return;

          if (TaskManager.removeTodo(taskId)) {
            try { state.save(); } catch (e) { }
            this.updateTodosList();
            this.renderEnemies();
          }
          return;
        }

        // allow Enter on inline input via delegated keydown handler (see below)

        // Edit handler (works even if completed)
        if (event.target.closest('.btn-edit')) {
          if (taskType === 'daily') PopupsManager.showEditDaily(taskId);
          else PopupsManager.showEditTodo(taskId);
          return;
        }

        if (event.target.closest('.btn-blood-oath')) {
          event.stopPropagation();
          if (taskType === 'daily') {
            TaskManager.toggleBloodOath(taskId);
            this.scheduleUpdateDailiesList();
          } else {
            TaskManager.toggleBloodOathTodo(taskId);
            this.updateTodosList();
          }
          state.save();
          return;
        }

        const interactiveInsideCard = event.target.closest('.todo-subtask-rect, .todo-subtasks-container, .subtask-checkbox, .subtask-remove, .subtask-add-btn, .subtask-input, .subtask-label, .subtask-name, .edit-subtask-checkbox, .edit-subtask-remove, .edit-subtask-form, .edit-subtasks-panel, .edit-subtask-label, .btn-lock-daily');
        const editModeDailies = !!state.systemState?.taskListFilters?.editModeDailies;
        const lockModeDailies = !!state.systemState?.taskListFilters?.lockModeDailies;
        const oathModeDailies = !!state.systemState?.taskListFilters?.oathModeDailies;
        const timeModeDailies = !!state.systemState?.taskListFilters?.timeModeDailies;
        const todoJoystickMode = state.systemState?.taskListFilters?.todoJoystickMode || 'done';

        if (taskType === 'daily' && card.classList.contains('task-card-daily') && !interactiveInsideCard) {
          if (editModeDailies) {
            PopupsManager.showEditDaily(taskId);
            return;
          }
          if (lockModeDailies) {
            const daily = getGameState().dailiesState.dailies.find(d => d.id === taskId);
            if (daily) {
              if (daily.locked) {
                TaskManager.unlockDaily(taskId);
              } else {
                TaskManager.lockDaily(taskId);
              }
              this.scheduleUpdateDailiesList();
              getGameState().save();
            }
            return;
          }
          if (oathModeDailies) {
            return;
          }
        }

        if (taskType === 'todo' && !interactiveInsideCard) {
          if (todoJoystickMode === 'edit') {
            if (typeof PopupsManager !== 'undefined' && PopupsManager.showEditTodo) {
              PopupsManager.showEditTodo(taskId);
            }
            return;
          } else if (todoJoystickMode === 'del') {
            const todoObj = TaskManager.getTaskById(taskId);
            const todoName = todoObj?.name || 'this to-do';
            if (confirm(`Delete "${todoName}"?`)) {
              TaskManager.removeTodo(taskId);
              try { state.save(); } catch (e) {}
              this.updateTodosList();
              this.renderEnemies();
            }
            return;
          } else if (todoJoystickMode === 'oath') {
            TaskManager.toggleBloodOathTodo(taskId);
            try { state.save(); } catch (e) {}
            this.updateTodosList();
            return;
          }
        }

        if (taskType === 'daily' && !editModeDailies && !lockModeDailies && !oathModeDailies && card.classList.contains('task-card-daily') && !interactiveInsideCard) {
          const subtasksContainer = card.querySelector('.daily-subtasks-container') || card.parentNode.querySelector(`.daily-subtasks-container[data-daily-id="${taskId}"]`);
          if (subtasksContainer) {
            const isHidden = subtasksContainer.style.display === 'none';
            subtasksContainer.style.display = isHidden ? 'block' : 'none';
          }
        }

        // To-Do card single clicks should not trigger complete. Only Dailies (when not in TIME, LOCK, OATH, or EDIT mode) or explicit complete buttons.
        if (event.target.closest('.btn-complete') || (card.classList.contains('task-card-daily') && !interactiveInsideCard && !timeModeDailies && !lockModeDailies && !oathModeDailies && !editModeDailies)) {
          if (card.classList.contains('completed')) return;
          if (taskType === 'daily') {
            const res = TaskManager.completeDaily(taskId);
            if (!res || !res.success) return;

            // Immediate visual feedback on the card
            try {
              card.classList.add('just-completed');
              card.style.transition = 'transform 100ms ease, filter 100ms ease, opacity 400ms ease';
              card.style.transform = 'scale(1.04)';
              card.style.filter = 'brightness(10) contrast(1.5)';
              setTimeout(() => {
                card.style.filter = '';
                card.style.transform = '';
              }, 100);

              UIManager.accelerateBackground(2.0, 2000);
              if (typeof navigator !== 'undefined' && navigator.vibrate) {
                try { navigator.vibrate([15, 30, 45]); } catch (e) {}
              }

              // Show reward popup numbers
              if (res.isHeld || res.isMiss) {
                try { if (window.SoundManager) SoundManager.play('miss'); } catch (e) {}
                const rect = card.getBoundingClientRect();
                // Red MISS floating popup
                FloatingDamageNumber.show(rect.left + rect.width / 2, Math.max(12, rect.top - 18), 'MISS', { color: '#ef4444', isMiss: true, scale: 1.4, duration: 1800 });
              } else {
                if (res.isJackpot) {
                  try { if (window.SoundManager) SoundManager.play('crit'); } catch (e) {}
                  const rect = card.getBoundingClientRect();
                  FloatingDamageNumber.show(
                    rect.left + rect.width / 2,
                    Math.max(12, rect.top - 38),
                    'JACKPOT!',
                    { className: 'rainbow-jackpot-text', scale: 1.5, duration: 2000 }
                  );
                }
                if (res.rewards && res.rewards.ap) {
                  UIManager.showDailyApReward(card, res.rewards.ap);
                }
                if (res.rewards && res.rewards.keys) {
                  UIManager.showDailyKeysReward(card, res.rewards.keys);
                }
                if (res.rewards && res.rewards.diamonds) {
                  const rect = card.getBoundingClientRect();
                  UIManager.spawnDiamondFloatingPopup(rect.left + rect.width / 2, rect.top + rect.height / 2, res.rewards.diamonds);
                }

                // Separate floating popup for released held rewards
                const released = res.releasedHeld || res.releasedHeldRewards;
                if (released && (released.ap > 0 || released.diamonds > 0 || released.keys > 0)) {
                  const rect = card.getBoundingClientRect();
                  const centerX = rect.left + rect.width / 2;
                  let offset = 48;
                  if (released.ap > 0) {
                    FloatingDamageNumber.show(centerX, Math.max(12, rect.top - offset), `+${Math.ceil(released.ap)} AP (Held)`, { color: '#f59e0b', scale: 1.25, duration: 2500, countUp: true });
                    offset += 24;
                  }
                  if (released.diamonds > 0) {
                    FloatingDamageNumber.show(centerX + 25, Math.max(12, rect.top - offset), `+${released.diamonds} 💎 (Held)`, { color: '#00e5ff', scale: 1.25, duration: 2500, countUp: true });
                    offset += 24;
                  }
                  if (released.keys > 0) {
                    FloatingDamageNumber.show(centerX, Math.max(12, rect.top - offset), `+${released.keys} Keys (Held) 🔑`, { color: '#f59e0b', scale: 1.25, duration: 2500, countUp: true });
                  }
                }
              }

              const released = res.releasedHeld || res.releasedHeldRewards;
              let countUpDelay = 0;
              if (released && released.ap > 0) {
                countUpDelay = Math.min(1200, Math.max(650, Math.ceil(released.ap) * 25));
              } else if (res.rewards && res.rewards.ap) {
                countUpDelay = Math.min(1200, Math.max(650, Math.ceil(res.rewards.ap) * 25));
              }

                UIManager.applyTaskChargingEffect(card, countUpDelay, () => {
                  if (typeof RetroTaskCompleteAnimation !== 'undefined') {
                    RetroTaskCompleteAnimation.play(card);
                  }
                  const sizeScale = Math.max(0.5, Number(card.dataset.sizeScale) || 1);
                  card.style.transition = 'opacity 300ms ease, transform 300ms ease, filter 300ms ease';
                  card.style.opacity = '0';
                  card.style.transform = `scale(${sizeScale * 0.85})`;
                  setTimeout(() => {
                    this.scheduleUpdateDailiesList();
                  }, 300);
                });
            } catch (e) {
              this.scheduleUpdateDailiesList();
            }
          } else {
            // Confirm before completing a To-Do
            const todoName = card.querySelector('.todo-title')?.textContent || '';
            try {
              PopupsManager.showConfirm(`Complete To-Do?`, `Complete ${todoName || 'this to-do'}?`, () => {
                const res = TaskManager.completeTodo(taskId);
                if (!res || !res.success) return;

                card.style.transition = 'filter 150ms ease, opacity 400ms ease';
                card.style.filter = 'brightness(10) contrast(1.5)';

                if (res.rewards) {
                  const rect = card.getBoundingClientRect();
                  if (res.isJackpot) {
                    try { if (window.SoundManager) SoundManager.play('crit'); } catch (e) {}
                    FloatingDamageNumber.show(
                      rect.left + rect.width / 2,
                      Math.max(12, rect.top - 38),
                      'JACKPOT!',
                      { className: 'rainbow-jackpot-text', scale: 1.5, duration: 2000 }
                    );
                  }
                  if (res.rewards.ap) {
                    FloatingDamageNumber.show(rect.left + rect.width / 2, Math.max(12, rect.top - 18), `+${Math.ceil(res.rewards.ap)} AP`, { color: UIManager.themeColor('--ap-gold', '#FFB33F'), cycleText: true });
                  }
                  if (res.rewards.diamonds) {
                    UIManager.spawnDiamondFloatingPopup(rect.left + rect.width / 2, rect.top + rect.height / 2, res.rewards.diamonds);
                  }
                }

                if (typeof RetroTaskCompleteAnimation !== 'undefined') {
                  RetroTaskCompleteAnimation.play(card);
                }

                setTimeout(() => {
                  this.updateTodosList();
                }, 200);
                try { state.save(); } catch (e) { }
                this.renderEnemies();
              });
            } catch (e) {
              // Fallback to immediate complete if PopupsManager unavailable
              const res = TaskManager.completeTodo(taskId);
              if (!res || !res.success) return;
              card.style.transition = 'filter 150ms ease, opacity 400ms ease';
              card.style.filter = 'brightness(10) contrast(1.5)';
              if (res.rewards) {
                const rect = card.getBoundingClientRect();
                if (res.isJackpot) {
                  try { if (window.SoundManager) SoundManager.play('crit'); } catch (e) {}
                  FloatingDamageNumber.show(
                    rect.left + rect.width / 2,
                    Math.max(12, rect.top - 38),
                    'JACKPOT!',
                    { className: 'rainbow-jackpot-text', scale: 1.5, duration: 2000 }
                  );
                }
                if (res.rewards.ap) {
                  FloatingDamageNumber.show(rect.left + rect.width / 2, Math.max(12, rect.top - 18), `+${Math.ceil(res.rewards.ap)} AP`, { color: UIManager.themeColor('--ap-gold', '#FFB33F'), cycleText: true });
                }
                if (res.rewards.diamonds) {
                  UIManager.spawnDiamondFloatingPopup(rect.left + rect.width / 2, rect.top + rect.height / 2, res.rewards.diamonds);
                }
              }
              setTimeout(() => {
                this.updateTodosList();
              }, 200);
            }
          }
          state.save();
          this.renderEnemies();
        }
      });

      container.addEventListener('dblclick', (event) => {
        const card = event.target.closest('.task-card, .task-card-daily');
        if (!card) return;
        const taskId = card.dataset.id;
        if (!taskId) return;

        const timeModeDailies = !!state.systemState?.taskListFilters?.timeModeDailies;
        if (taskType === 'daily' && !timeModeDailies) return;

        const task = TaskManager.getTaskById(taskId);
        if (task) {
          UIManager.openFullscreenTimer(task, taskType);
        }
      });

      // Allow adding a subtask by pressing Enter in the inline input
      container.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter') return;
        const input = event.target;
        if (!input || !input.classList || !input.classList.contains('subtask-input')) return;
        const card = input.closest('.task-card');
        if (!card) return;
        const todoId = input.dataset.todoId || card.dataset.id;
        const name = input.value ? input.value.trim() : '';
        if (!name) return;
        TaskManager.addSubtask(todoId, name);
        try { state.save(); } catch (e) { }
        this.updateTodosList();
        event.preventDefault();
      });
    };

    bindContainer('dailiesList', 'daily');
    bindContainer('todosList', 'todo');
  }

  static updateHpBar(detail) {
    const newHp = Number(detail?.newHp) || 0;
    const maxHp = Number(detail?.maxHp) || 0;
    const percent = maxHp > 0 ? Math.max(0, Math.min(100, (newHp / maxHp) * 100)) : 0;
    const hpValueEl = document.getElementById('hpValue');
    const hpMaxEl = document.getElementById('hpMax');
    const hpFillEl = document.getElementById('hpFill');
    if (hpValueEl) hpValueEl.textContent = Math.ceil(newHp);
    if (hpMaxEl) hpMaxEl.textContent = maxHp;
    if (hpFillEl) hpFillEl.style.width = percent + '%';

    if (hpFillEl && maxHp > 0 && newHp < maxHp * 0.25) {
      try { MeterAnimation.pulse(hpFillEl, UIManager.themeColor('--hp-red', '#C00707')); } catch (e) { }
    }
    try { this.updatePendingDamageDisplay(); } catch (e) { }
  }

  static updatePendingDamageDisplay() {
    try {
      const state = getGameState();
      if (!state) return;
      const pendingDmg = GameState.calculateExactPendingDamage();
      const pendingRow = document.getElementById('pendingDmgRow');
      const pendingVal = document.getElementById('pendingDmgValue');
      const pendingFill = document.getElementById('pendingDmgFill');
      if (pendingRow) {
        if (pendingDmg > 0) {
          pendingRow.style.display = 'flex';
          if (pendingVal) pendingVal.textContent = `-${pendingDmg}`;
        } else {
          pendingRow.style.display = 'none';
        }
      }
      const summaryEl = document.getElementById('dailiesSummary');
      if (summaryEl) {
        const today = TaskManager.getCurrentGameDateKey();
        const scheduledDailies = TaskManager.getAllDailies().filter(d => TaskManager.isDailyScheduled(d, today));
        const completedCount = scheduledDailies.filter(daily => daily.completed).length;
        
        let totalMinutes = 0;
        scheduledDailies.forEach(daily => {
          const text = (daily.name || '') + ' ' + (daily.text || '') + ' ' + (daily.description || '');
          const matches = [...text.matchAll(/\b(\d+(?:\.\d+)?)\s*([hms])\b/gi)];
          matches.forEach(m => {
            const val = parseFloat(m[1]);
            const unit = m[2].toLowerCase();
            if (unit === 'h') totalMinutes += val * 60;
            else if (unit === 'm') totalMinutes += val;
            else if (unit === 's') totalMinutes += val / 60;
          });
        });

        let timeStr = '';
        if (totalMinutes > 0) {
          const totalSec = Math.round(totalMinutes * 60);
          const h = Math.floor(totalSec / 3600);
          const m = Math.floor((totalSec % 3600) / 60);
          if (h > 0 && m > 0) timeStr = `${h}h ${m}m`;
          else if (h > 0) timeStr = `${h}h`;
          else timeStr = `${m}m`;
        }

        const minutesDisplay = timeStr ? ` <span style="font-size: 0.85em; opacity: 0.7; font-weight: normal;">(${timeStr})</span>` : '';
        summaryEl.innerHTML = `${completedCount}/${scheduledDailies.length} complete${minutesDisplay}${pendingDmg > 0 ? ` (Pending Dmg: ${pendingDmg})` : ''}`;
      }
    } catch (e) {
      console.warn('updatePendingDamageDisplay error', e);
    }
  }

  static updateManaBar(detail) {
    const newMana = Number(detail?.newMana) || 0;
    const maxMana = Number(detail?.maxMana) || 0;
    const percent = maxMana > 0 ? Math.max(0, Math.min(100, (newMana / maxMana) * 100)) : 0;
    const manaValueEl = document.getElementById('manaValue');
    const manaMaxEl = document.getElementById('manaMax');
    const manaFillEl = document.getElementById('manaFill');
    if (manaValueEl) manaValueEl.textContent = Math.ceil(newMana);
    if (manaMaxEl) manaMaxEl.textContent = maxMana;
    if (manaFillEl) manaFillEl.style.width = percent + '%';

    if (manaFillEl && maxMana > 0 && newMana >= maxMana) {
      try { MeterAnimation.shimmer(manaFillEl, UIManager.themeColor('--mana-blue', '#134E8E')); } catch (e) { }
    }
  }

  static updateApBar(detail) {
    const newAp = Number(detail?.newAp) || 0;
    const oldAp = Number(detail?.oldAp) || 0;
    const maxAp = Number(detail?.maxAp) || 0;
    const percent = maxAp > 0 ? Math.max(0, Math.min(100, (newAp / maxAp) * 100)) : 0;
    const apValueEl = document.getElementById('apValue');
    const apMaxEl = document.getElementById('apMax');
    const apFillEl = document.getElementById('apFill');
    if (apValueEl) apValueEl.textContent = Math.ceil(newAp);
    if (apMaxEl) apMaxEl.textContent = maxAp;
    if (apFillEl) apFillEl.style.width = percent + '%';

    const delta = Math.abs(newAp - oldAp);
    const crackleThreshold = Math.max(2, Math.ceil(maxAp * 0.03));
    if (apFillEl && delta >= crackleThreshold) {
      try { MeterAnimation.crackle(apFillEl, UIManager.themeColor('--ap-gold', '#FFB33F')); } catch (e) { }
    }
    this.updateActionCosts();
  }

  static updateGoldDisplay(detail) {
    const goldEl = document.getElementById('goldValue');
    if (goldEl) goldEl.textContent = Math.ceil(Number(detail?.newGold) || 0);
  }

  static updateDiamondDisplay(detail) {
    const diamondEl = document.getElementById('diamondValue');
    if (diamondEl) diamondEl.textContent = Math.ceil(Number(detail?.newDiamonds) || 0);
  }

  static updateLootboxKeysDisplay(detail) {
    const btn = document.getElementById('lootboxBtn');
    if (btn) {
      const keys = Math.ceil(Number(detail?.newKeys) || 0);
      btn.innerHTML = `🎁 LOOTBOX (${keys})`;
    }
  }

  static showDiamondRewards() {
    const state = getGameState();
    const closePopup = () => {
      document.querySelectorAll('.popup-overlay').forEach(overlay => overlay.remove());
    };

    closePopup();

    const overlay = document.createElement('div');
    overlay.className = 'popup-overlay';
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) closePopup();
    });

    const popup = document.createElement('div');
    popup.className = 'popup diamond-rewards-popup';

    if (!Array.isArray(state.systemState.customRewards)) {
      state.systemState.customRewards = [];
    }

    const renderRewards = () => {
      const list = popup.querySelector('#diamondRewardList');
      if (!list) return;

      const rewards = state.systemState.customRewards;
      if (!rewards.length) {
        list.innerHTML = '<div class="diamond-reward-empty">No rewards yet. Add one above.</div>';
        return;
      }

      list.innerHTML = rewards.map((reward, index) => `
        <div class="diamond-reward-item" data-index="${index}">
          <div class="diamond-reward-item-main">
            <div class="diamond-reward-item-name">${reward.name}</div>
            <div class="diamond-reward-item-meta">${reward.price} diamonds</div>
          </div>
          <div class="diamond-reward-item-actions">
            <button class="btn-buy-reward" data-index="${index}">BUY</button>
            <button class="btn-delete-reward" data-index="${index}">✕</button>
          </div>
        </div>
      `).join('');

      list.querySelectorAll('.btn-buy-reward').forEach(button => {
        button.addEventListener('click', (event) => {
          const index = Number(event.currentTarget.dataset.index);
          const reward = state.systemState.customRewards[index];
          if (!reward) return;

          const cost = Math.max(1, Math.ceil(Number(reward.price) || 0));
          if ((state.playerState.diamonds || 0) < cost) {
            FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2, 'Not enough diamonds', { color: '#ff6666' });
            return;
          }

          state.spendDiamonds(cost);
          try { state.save(); } catch (e) { }
          renderRewards();

          FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2, `${reward.name} bought`, {
            color: UIManager.themeColor('--accent-gold', '#FFB33F')
          });
        });
      });

      list.querySelectorAll('.btn-delete-reward').forEach(button => {
        button.addEventListener('click', (event) => {
          const index = Number(event.currentTarget.dataset.index);
          state.systemState.customRewards.splice(index, 1);
          try { state.save(); } catch (e) { }
          renderRewards();
        });
      });
    };

    popup.innerHTML = `
      <h2>💎 REAL-LIFE REWARDS</h2>
      <button class="btn-close">✕</button>
      <div class="diamond-reward-form">
        <label class="diamond-reward-label" for="diamondRewardName">Reward Name</label>
        <input id="diamondRewardName" class="diamond-reward-input" type="text" maxlength="32" placeholder="Weekend coffee, movie night, takeout...">

        <label class="diamond-reward-label" for="diamondRewardCost">Diamond Cost</label>
        <input id="diamondRewardCost" class="diamond-reward-input" type="number" min="1" step="1" value="10">

        <button id="diamondRewardAddBtn" class="btn-large">ADD REWARD</button>
      </div>
      <div class="diamond-reward-list" id="diamondRewardList"></div>
    `;

    popup.querySelector('.btn-close').addEventListener('click', closePopup);

    const nameInput = popup.querySelector('#diamondRewardName');
    const costInput = popup.querySelector('#diamondRewardCost');
    const addBtn = popup.querySelector('#diamondRewardAddBtn');

    addBtn.addEventListener('click', () => {
      const name = (nameInput?.value || '').trim();
      const cost = Math.ceil(Number(costInput?.value || 0));

      if (!name) {
        FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2, 'Enter a reward name', { color: '#ff6666' });
        return;
      }

      if (!Number.isFinite(cost) || cost <= 0) {
        FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2, 'Enter a valid diamond cost', { color: '#ff6666' });
        return;
      }

      state.systemState.customRewards.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name,
        price: cost,
        claimed: false,
        createdAt: Date.now()
      });

      if (nameInput) nameInput.value = '';
      if (costInput) costInput.value = '10';
      try { state.save(); } catch (e) { }
      renderRewards();
    });

    overlay.appendChild(popup);
    document.body.appendChild(overlay);
    try { PopupAnimation.scale(popup); } catch (e) { }
    renderRewards();
  }

  static updateDeathDefianceBadge(detail = null) {
    const badge = document.getElementById('deathDefianceBadge');
    if (!badge) return;

    const state = getGameState();
    const deathDefiance = state.systemState?.deathDefiance || {};
    const charges = deathDefiance.charges !== undefined ? deathDefiance.charges : (deathDefiance.available ? 1 : 0);

    if (deathDefiance.active) {
      badge.textContent = `DEFIANCE ACTIVE (${charges})`;
      badge.className = 'death-defiance-badge active';
      return;
    }

    if (charges > 0) {
      badge.textContent = `DEFIANCE READY (${charges})`;
      badge.className = 'death-defiance-badge ready';
      return;
    }

    badge.textContent = 'DEFIANCE USED';
    badge.className = 'death-defiance-badge used';
  }

  static setEnemyCheckInHighlight(enemyId, active) {
    const card = document.querySelector(`.enemy-card[data-enemy-id="${enemyId}"]`);
    if (!card) return null;

    if (active) {
      card.classList.add('checkin-highlight');
      card.dataset.checkinHighlight = '1';
    } else {
      card.classList.remove('checkin-highlight');
      delete card.dataset.checkinHighlight;
    }

    return card;
  }

  static playBossAttackAnimation(bossName, isPhase2, attackType) {
    const card = document.querySelector(`.enemy-card[data-enemy-id="boss"]`) || document.querySelector(`.enemy-card`);
    if (!card) return;

    const nameLower = (bossName || '').toLowerCase();
    let intensity = 1.0;
    if (attackType === 'crit' || attackType === 'heavy' || attackType === 'bomb') {
      intensity = 1.5;
    }

    if (nameLower.includes('demon')) {
      const color = attackType === 'crit' ? '#ff2222' : '#ff4400';
      if (typeof RetroHellfireAnimation !== 'undefined') {
        RetroHellfireAnimation.play(card, color, intensity);
      }
    } else if (nameLower.includes('marcher')) {
      const color = attackType === 'heal' ? '#d4af37' : '#ffb33f';
      if (typeof RetroSandstormAnimation !== 'undefined') {
        RetroSandstormAnimation.play(card, color, intensity);
      }
    } else if (nameLower.includes('wizard')) {
      const color = attackType === 'crit' ? '#bf5af2' : '#8a2be2';
      if (typeof RetroMagicCircleAnimation !== 'undefined') {
        RetroMagicCircleAnimation.play(card, color, intensity);
      }
    } else if (nameLower.includes('worm')) {
      const color = attackType === 'corrosive' ? '#32cd32' : '#22c55e';
      if (typeof RetroAcidSplashAnimation !== 'undefined') {
        RetroAcidSplashAnimation.play(card, color, intensity);
      }
    } else if (nameLower.includes('giant')) {
      const color = attackType === 'heavy' ? '#00a86b' : '#34c759';
      if (typeof RetroEarthShatterAnimation !== 'undefined') {
        RetroEarthShatterAnimation.play(card, color, intensity);
      }
    } else if (nameLower.includes('computer')) {
      const color = attackType === 'bomb' ? '#64ffda' : '#00ffff';
      if (typeof RetroMatrixRainAnimation !== 'undefined') {
        RetroMatrixRainAnimation.play(color, intensity);
      }
    } else if (nameLower.includes('angel')) {
      const color = attackType === 'crit' ? '#ffffff' : '#fdfd96';
      if (typeof RetroHolyBeamAnimation !== 'undefined') {
        RetroHolyBeamAnimation.play(card, color, intensity);
      }
    } else if (nameLower.includes('queen')) {
      const color = attackType === 'crit' ? '#ff3366' : '#ff00ff';
      if (typeof RetroRoyalCrownBurstAnimation !== 'undefined') {
        RetroRoyalCrownBurstAnimation.play(card, color, intensity);
      }
    } else if (nameLower.includes('shark')) {
      const color = attackType === 'crit' ? '#dc143c' : '#ff3b30';
      if (typeof RetroBloodTideAnimation !== 'undefined') {
        RetroBloodTideAnimation.play(color, intensity);
      }
    } else if (nameLower.includes('turtle')) {
      const color = attackType === 'heavy' ? '#ff9a2e' : '#ff4500';
      if (typeof RetroLavaSpitAnimation !== 'undefined') {
        RetroLavaSpitAnimation.play(card, color, intensity);
      }
    } else if (nameLower.includes('king')) {
      const color = attackType === 'minion' ? '#4b0082' : '#8a2be2';
      if (typeof RetroSpectralSwordsAnimation !== 'undefined') {
        RetroSpectralSwordsAnimation.play(card, color, intensity);
      }
    } else if (nameLower.includes('sun')) {
      const color = attackType === 'crit' ? '#ffd700' : '#ffcc00';
      if (typeof RetroSolarFlareAnimation !== 'undefined') {
        RetroSolarFlareAnimation.play(card, color, intensity);
      }
    } else if (nameLower.includes('nemesis')) {
      const color = attackType === 'crit' ? '#d500f9' : (attackType === 'heavy' ? '#4a0e4e' : '#a855f7');
      if (typeof RetroVoidBlackHoleAnimation !== 'undefined') {
        RetroVoidBlackHoleAnimation.play(card, color, intensity);
      }
    } else {
      // Fallback animations
      let animName = isPhase2 ? 'Glitch Invert' : 'Slam Wave';
      let color = '#ff3b30';

      if (attackType === 'crit') { animName = 'Glitch Invert'; color = '#ff3b30'; }
      else if (attackType === 'corrosive') { animName = 'Pixel Rain'; color = '#34c759'; }
      else if (attackType === 'heavy') { animName = 'Slam Wave'; color = '#ffcc00'; }
      else if (attackType === 'heal') { animName = 'Orb Burst'; color = '#ff2d55'; }
      else if (attackType === 'bomb') { animName = 'Rage Pulse'; color = '#af52de'; }
      else if (attackType === 'minion') { animName = 'Energy Beam'; color = '#5856d6'; }

      if (animName === 'Slam Wave' && typeof RetroSlamWaveAnimation !== 'undefined') {
        RetroSlamWaveAnimation.play(card, color);
      } else if (animName === 'Glitch Invert' && typeof RetroGlitchInvertAnimation !== 'undefined') {
        RetroGlitchInvertAnimation.play(color);
      } else if (animName === 'Energy Beam' && typeof RetroEnergyBeamAnimation !== 'undefined') {
        RetroEnergyBeamAnimation.play(card, color);
      } else if (animName === 'Orb Burst' && typeof RetroOrbBurstAnimation !== 'undefined') {
        RetroOrbBurstAnimation.play(card, color);
      } else if (animName === 'Pixel Rain' && typeof RetroPixelRainAnimation !== 'undefined') {
        RetroPixelRainAnimation.play(color);
      } else if (animName === 'Rage Pulse' && typeof RetroRagePulseAnimation !== 'undefined') {
        RetroRagePulseAnimation.play(card, color);
      }
    }
  }

  static async playCheckInSequence(detail) {
    const steps = Array.isArray(detail?.retaliationSteps) ? detail.retaliationSteps : [];
    const token = ++this.checkInSequenceToken;
    const circle = document.querySelector('.enemy-circle-container');
    const state = getGameState();
    const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    if (!steps.length && !detail?.lateTodoDamage && !detail?.hasMissedBloodOath) {
      state.eventBus.emit(EVENTS.CHECK_IN_ANIMATION_COMPLETE, detail);
      return;
    }

    const missedCount = Math.max(0, Math.round((detail?.missedDailyDamage || 0) || 0));
    if (missedCount > 0) {
      circle?.classList.add('checkin-alert');
      ScreenEffects.shake(12 + missedCount * 2, 200);
    }

    // 1. POP UP FLOATING DAMAGE NUMBERS ONE BY ONE SEQUENTIALLY
    for (let i = 0; i < steps.length; i++) {
      if (token !== this.checkInSequenceToken) return;
      const step = steps[i];
      const card = this.setEnemyCheckInHighlight(step.enemyId, true);
      let x = window.innerWidth / 2;
      let y = window.innerHeight / 2;
      if (card) {
        card.classList.add('checkin-hit');
        if (card.dataset.x) {
          const circleRect = UIManager.getCircleRect();
          x = circleRect.left + Number(card.dataset.x);
          y = circleRect.top + Number(card.dataset.y);
        } else {
          const rect = card.getBoundingClientRect();
          x = rect.left + rect.width / 2;
          y = rect.top + rect.height / 2;
        }
      }

      if (step.isBoss) {
        const bossName = (state.stageState?.bossData && state.stageState.bossData.name) || step.name;
        const bossData = state.stageState?.bossData || {};
        this.playBossAttackAnimation(bossName, bossData.phase === 2, step.attackType);
      }

      if (step.isDodge || step.isParry) {
        FloatingDamageNumber.show(x, y - 10, 'PARRIED!', { color: '#00e5ff', duration: 1200, scale: 1.2 });
        if (card && typeof RetroDodgeAnimation !== 'undefined') {
          RetroDodgeAnimation.play(card, '#00e5ff');
        }
      } else if (step.isImmune) {
        FloatingDamageNumber.show(x, y - 10, 'IMMUNE!', { color: UIManager.themeColor('--success-green', '#22c55e'), duration: 1200, scale: 1.2 });
      } else if (step.isNull) {
        FloatingDamageNumber.show(x, y - 10, 'NULL!', { color: '#aaaaaa', duration: 1200, scale: 1.0 });
      } else if (step.isCorrosive) {
        FloatingDamageNumber.show(x, y - 10, 'CORROSIVE! 🧪', { color: '#32cd32', duration: 1200, scale: 1.2 });
      } else if (step.isBombSummon) {
        FloatingDamageNumber.show(x, y - 10, 'BOMB DEPLOYED! 💣', { color: '#ff4500', duration: 1200, scale: 1.3 });
      } else if (step.isHeal) {
        FloatingDamageNumber.show(x, y - 10, `HEALED! 💚 (+${step.healAmount})`, { color: '#00ff66', duration: 1200, scale: 1.2 });
      } else if (step.isMinionSummon) {
        FloatingDamageNumber.show(x, y - 10, `SUMMON: ${step.minionName}! 👿`, { color: '#8a2be2', duration: 1200, scale: 1.2 });
      } else {
        FloatingDamageNumber.show(x, y - 10, `-${Math.ceil(step.damage)}`, {
          color: step.isBoss ? (step.isCrit ? '#ff3366' : (step.isHeavy ? '#ffaa00' : UIManager.themeColor('--accent-gold', '#FFB33F'))) : (step.damage > 0 ? UIManager.themeColor('--danger-red', '#C00707') : UIManager.themeColor('--text-muted', '#aaaaaa')),
          duration: 1200,
          scale: step.isBoss ? 1.3 : 1.1,
          isCrit: step.isCrit || (step.damage > 0 && step.damage >= 25)
        });
      }

      await wait(180);
      if (card) card.classList.remove('checkin-hit');
      this.setEnemyCheckInHighlight(step.enemyId, false);
    }

    if (detail?.lateTodoDamage > 0) {
      FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2 - 70, `Late todo damage: ${Math.ceil(detail.lateTodoDamage)}`, { color: '#ff9a2e', duration: 1200 });
      ScreenEffects.shake(8, 150);
      await wait(180);
    }

    if (Array.isArray(detail?.petAttacks) && detail.petAttacks.length > 0) {
      for (const pAttack of detail.petAttacks) {
        if (token !== this.checkInSequenceToken) return;
        const card = document.querySelector(`.enemy-card[data-enemy-id="${pAttack.targetId}"]`);
        let x = window.innerWidth / 2;
        let y = window.innerHeight / 2;
        if (card) {
          if (card.dataset.x) {
            const circleRect = UIManager.getCircleRect();
            x = circleRect.left + Number(card.dataset.x);
            y = circleRect.top + Number(card.dataset.y);
          } else {
            const rect = card.getBoundingClientRect();
            x = rect.left + rect.width / 2;
            y = rect.top + rect.height / 2;
          }
        }
        try { SoundManager.play('pet'); } catch (e) { }
        FloatingDamageNumber.show(x, y - 30, `-${Math.ceil(pAttack.damage)} 🐾`, { color: '#ffaa00', duration: 1200, scale: 1.3, isCrit: true });
        await wait(180);
      }
    }

    // 2. WAIT FOR ALL FLOATING NUMBERS TO COMPLETE FLOATING OUT
    await wait(1000);

    // Clean up hit states
    document.querySelectorAll('.checkin-hit').forEach(c => c.classList.remove('checkin-hit'));
    document.querySelectorAll('.enemy-card').forEach(c => this.setEnemyCheckInHighlight(c.dataset.enemyId, false));

    // 3. APPLY THE FINAL END ANIMATION AFTER EVERYONE IS FINISHED
    if (detail?.hasMissedBloodOath) {
      if (token !== this.checkInSequenceToken) return;
      circle?.classList.add('checkin-alert');
      ScreenEffects.shake(25, 500);
      try { SoundManager.play('death'); } catch (e) {}
      FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2 - 50, 'INFINITE UNBLOCKABLE DAMAGE! 🩸', { color: '#dc2626', scale: 1.6, duration: 2500 });
      await wait(600);
      state.setHp(0);
      state.eventBus.emit(EVENTS.DEATH, {
        type: 'bloodOath:missed',
        stage: state.stageState.stage,
        level: state.stageState.level
      });
      PopupsManager.showDeathScreen({
        class: state.playerState.className,
        stage: state.stageState.stage,
        level: state.stageState.level,
        enemiesDefeated: state.systemState.runStats.enemiesDefeated,
        bossesSailed: state.systemState.runStats.bossesSailed,
        goldEarned: state.systemState.runStats.totalGoldEarned,
        deathReason: 'Killed by Blood Oath Penalty 🩸'
      });
    }

    circle?.classList.remove('checkin-alert');
    state.eventBus.emit(EVENTS.CHECK_IN_ANIMATION_COMPLETE, detail);
  }

  static toggleShowCompleted(kind) {
    const state = getGameState();
    if (!state.systemState.taskListFilters) {
      state.systemState.taskListFilters = {
        showCompletedDailies: false,
        showCompletedTodos: false
      };
    }

    if (kind === 'dailies') {
      state.systemState.taskListFilters.showCompletedDailies = !state.systemState.taskListFilters.showCompletedDailies;
    } else {
      state.systemState.taskListFilters.showCompletedTodos = !state.systemState.taskListFilters.showCompletedTodos;
    }

    state.save();
    this.refreshGameUI();
  }

  static toggleEditMode(kind) {
    const state = getGameState();
    if (!state.systemState.taskListFilters) {
      state.systemState.taskListFilters = {
        showCompletedDailies: false,
        showCompletedTodos: false,
        editModeDailies: false
      };
    }

    if (kind === 'dailies') {
      state.systemState.taskListFilters.editModeDailies = !state.systemState.taskListFilters.editModeDailies;
      if (state.systemState.taskListFilters.editModeDailies) {
        state.systemState.taskListFilters.lockModeDailies = false;
        state.systemState.taskListFilters.focusModeDailies = false;
        UIManager.isDrawingRect = false;
        const board = document.getElementById('dailiesList');
        if (board) board.classList.remove('drawing-rect-mode');
        const btn = document.getElementById('addDailyRectBtn');
        if (btn) btn.classList.remove('active');
      }
    }

    state.save();
    this.refreshGameUI();
  }

  static toggleLockMode() {
    const state = getGameState();
    if (!state.systemState.taskListFilters) {
      state.systemState.taskListFilters = {
        showCompletedDailies: false,
        showCompletedTodos: false,
        editModeDailies: false,
        lockModeDailies: false
      };
    }
    state.systemState.taskListFilters.lockModeDailies = !state.systemState.taskListFilters.lockModeDailies;
    if (state.systemState.taskListFilters.lockModeDailies) {
      state.systemState.taskListFilters.editModeDailies = false;
      state.systemState.taskListFilters.focusModeDailies = false;
    }
    state.save();
    this.refreshGameUI();
  }

  static toggleDailyConnections() {
    const state = getGameState();
    if (!state.systemState.taskListFilters) {
      state.systemState.taskListFilters = {
        showCompletedDailies: false,
        showCompletedTodos: false,
        showDailyConnections: false,
        focusModeDailies: false
      };
    }
    state.systemState.taskListFilters.showDailyConnections = !state.systemState.taskListFilters.showDailyConnections;
    state.save();
    this.refreshGameUI();
  }

  static toggleDailyFocus() {
    const state = getGameState();
    if (!state.systemState.taskListFilters) {
      state.systemState.taskListFilters = {
        showCompletedDailies: false,
        showCompletedTodos: false,
        showDailyConnections: false,
        focusModeDailies: false
      };
    }
    state.systemState.taskListFilters.focusModeDailies = !state.systemState.taskListFilters.focusModeDailies;
    if (state.systemState.taskListFilters.focusModeDailies) {
      state.systemState.taskListFilters.editModeDailies = false;
      state.systemState.taskListFilters.lockModeDailies = false;
    }
    state.save();
    this.refreshGameUI();
  }

  static updateTaskVisibilityToggleLabels() {
    const state = getGameState();
    const dailiesBtn = document.getElementById('dailiesShowCompletedBtn');
    const dailiesEditBtn = document.getElementById('dailiesEditModeBtn');
    const connectionsBtn = document.getElementById('dailiesConnectionsBtn');
    const focusBtn = document.getElementById('dailiesFocusBtn');
    const todosBtn = document.getElementById('todosShowCompletedBtn');
    const filterSelect = document.getElementById('dailiesFilterSelect');

    if (filterSelect) {
      filterSelect.value = state.systemState?.taskListFilters?.dailyColorFilter || 'regular';
    }

    if (dailiesBtn) {
      const show = !!state.systemState?.taskListFilters?.showCompletedDailies;
      dailiesBtn.textContent = show ? 'Completed: ON' : 'Completed: off';
      dailiesBtn.setAttribute('aria-pressed', String(show));
      dailiesBtn.classList.toggle('active', show);
    }

    if (todosBtn) {
      const show = !!state.systemState?.taskListFilters?.showCompletedTodos;
      todosBtn.textContent = show ? 'Completed: ON' : 'Completed: off';
      todosBtn.setAttribute('aria-pressed', String(show));
      todosBtn.classList.toggle('active', show);
    }

    if (dailiesEditBtn) {
      const editMode = !!state.systemState?.taskListFilters?.editModeDailies;
      dailiesEditBtn.textContent = editMode ? 'Edit: ON' : 'Edit: off';
      dailiesEditBtn.setAttribute('aria-pressed', String(editMode));
      dailiesEditBtn.classList.toggle('active', editMode);
    }

    const dailiesLockBtn = document.getElementById('dailiesLockModeBtn');
    if (dailiesLockBtn) {
      dailiesLockBtn.style.opacity = '1';
      const lockMode = !!state.systemState?.taskListFilters?.lockModeDailies;
      dailiesLockBtn.textContent = lockMode ? 'Lock: ON' : 'Lock: off';
      dailiesLockBtn.setAttribute('aria-pressed', String(lockMode));
      dailiesLockBtn.classList.toggle('active', lockMode);
    }

    if (connectionsBtn) {
      const show = !!state.systemState?.taskListFilters?.showDailyConnections;
      connectionsBtn.textContent = show ? 'Connections: ON' : 'Connections: off';
      connectionsBtn.setAttribute('aria-pressed', String(show));
      connectionsBtn.classList.toggle('active', show);
    }

    if (focusBtn) {
      const show = !!state.systemState?.taskListFilters?.focusModeDailies;
      focusBtn.textContent = show ? 'Focus: ON' : 'Focus: off';
      focusBtn.setAttribute('aria-pressed', String(show));
      focusBtn.classList.toggle('active', show);
    }
  }

  static updateComboDisplay(detail) {
    const comboEl = document.getElementById('comboIndicator');
    const circle = document.querySelector('.enemy-circle-container');
    if (circle) {
      if (detail && detail.combo > 0) {
        circle.setAttribute('data-combo', Math.min(detail.combo, 4));
      } else {
        circle.removeAttribute('data-combo');
      }
    }

    if (detail.combo === 0) {
      comboEl.style.display = 'none';
    } else {
      comboEl.style.display = 'block';
      ComboAnimation.show(comboEl, detail.combo);
    }
  }

  static triggerDonutRipple(originX = null, originY = null) {
    const circle = document.querySelector('.enemy-circle-container');
    if (!circle) return;
    let overlay = circle.querySelector('.donut-ripple-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'donut-ripple-overlay';
      circle.insertBefore(overlay, circle.firstChild);
    }

    const rect = circle.getBoundingClientRect();
    const x = (originX !== null && originX !== undefined) ? originX : rect.width / 2;
    const y = (originY !== null && originY !== undefined) ? originY : rect.height * 0.85;

    const ripple = document.createElement('div');
    ripple.className = 'donut-solid-ripple';
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    overlay.appendChild(ripple);

    ripple.addEventListener('animationend', () => ripple.remove());
  }

  static triggerDonutRippleForEnemy(enemyOrId) {
    if (!enemyOrId) return;
    const circleEl = document.querySelector('.enemy-circle-container');
    if (!circleEl) return;
    const circleRect = circleEl.getBoundingClientRect();
    const id = (typeof enemyOrId === 'object') ? enemyOrId.id : enemyOrId;

    let targetEl = circleEl.querySelector(`[data-enemy-id="${id}"]`) || document.getElementById(`enemyCard-${id}`);
    if (targetEl) {
      const tr = targetEl.getBoundingClientRect();
      const ox = (tr.left + tr.width / 2) - circleRect.left;
      const oy = (tr.top + tr.height / 2) - circleRect.top;
      this.triggerDonutRipple(ox, oy);
    } else {
      this.triggerDonutRipple(null, null);
    }
  }

  static resolveAttackTarget(targetEnemyId = null) {
    if (targetEnemyId) {
      const target = StageManager.getAllEnemies().find(enemy => String(enemy.id) === String(targetEnemyId) && !enemy.isDead);
      if (target) return target;
    }

    const spinnerTarget = this.getSpinnerTargetEnemy();
    if (spinnerTarget) return spinnerTarget;

    const state = getGameState();
    const savedId = state.combatState?.currentTarget;
    if (savedId) {
      const saved = StageManager.getAllEnemies().find(e => String(e.id) === String(savedId) && !e.isDead);
      if (saved) return saved;
    }

    return null;
  }

  static async handleAttackClick(targetEnemyId = null) {
    console.log('[UI] handleAttackClick', { targetEnemyId });
    const state = getGameState();
    if (!state.combatState) state.combatState = {};

    const settleQueue = () => {
      const queuedCount = Number(state.combatState.queuedAttackCount || 0);
      const queuedTargetId = state.combatState.queuedAttackTargetId || null;
      if (queuedCount > 0) {
        state.combatState.queuedAttackCount = queuedCount - 1;
        if (state.combatState.queuedAttackCount <= 0) {
          state.combatState.queuedAttackCount = 0;
          state.combatState.queuedAttackTargetId = null;
        }
        queueMicrotask(() => this.handleAttackClick(queuedTargetId));
      }
    };

    try {
      if (state.combatState.attackInProgress) {
        state.combatState.queuedAttackTargetId = targetEnemyId ? String(targetEnemyId) : (state.combatState.queuedAttackTargetId || state.combatState.currentTarget || null);
        state.combatState.queuedAttackCount = (state.combatState.queuedAttackCount || 0) + 1;
        return;
      }

      // Prefer an explicitly clicked enemy, then fall back to the spinner target, then any alive enemy.
      let target = this.resolveAttackTarget(targetEnemyId);
      if (!target) {
        target = (StageManager.getAliveEnemies && StageManager.getAliveEnemies()[0]) || (StageManager.getAllEnemies && StageManager.getAllEnemies().find(enemy => enemy && !enemy.isDead)) || null;
      }
      if (!target) {
        if (StageManager.allEnemiesDead()) {
          this.finishAttackSpinner();
          StageManager.onLevelCleared();
          UIManager.renderWorldMapNodeView();
          return;
        }
        FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2, 'No Target', { color: '#ff4444' });
        console.warn('No attack target available');
        this.finishAttackSpinner();
        return;
      }

      if (target && !target.isBoss && target.name) {
        if (!state.systemState.runSeenEnemies) state.systemState.runSeenEnemies = {};
        if (!state.systemState.runSeenEnemies[target.name]) {
          const dialogueEnabled = state.systemState.dialoguePopupsEnabled !== false;
          if (dialogueEnabled) {
            PopupsManager.showConfiguredDialogue('enemyFirstSeen', {
              title: target.name,
              enemyName: target.name
            }, `enemyFirstSeen:${target.name}`);
          }
          state.systemState.runSeenEnemies[target.name] = true;
          state.save();
        }
      }

      const weapon = PlayerManager.getCurrentWeapon();
      if (!weapon) {
        FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2, 'No weapon equipped', { color: '#ff6666' });
        this.finishAttackSpinner();
        return;
      }

      state.combatState.currentTarget = target.id;
      const attackRolls = {
        critRoll: Math.random(),
        precisionRoll: Math.random()
      };
      const preview = CombatManager.previewAttackImpact(state.playerState.activeWeapon, target.id, attackRolls);

      if (!preview.success) {
        const isApFailure = typeof preview.reason === 'string' && preview.reason.toLowerCase().includes('not enough ap');
        if (isApFailure) {
          FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2, 'Not enough power', { color: '#ffcc66' });
          try { if (window.SoundManager) SoundManager.play('miss'); } catch (e) { }
        } else {
          FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2, 'Miss', { color: '#bbbbbb' });
          try { state.resetCombo(); } catch (e) { }
          ScreenEffects.shake(2, 80);
          try { if (window.SoundManager) SoundManager.play('miss'); } catch (e) { }
        }
        this.finishAttackSpinner();
        return;
      }

      this.beginAttackSpinner(target.id);
      state.combatState.attackInProgress = true;

      try {
        // Intentional impact delay and screen flash removed
        let result;
        try {
          result = CombatManager.attemptAttack(state.playerState.activeWeapon, target.id, attackRolls);
        } catch (attackError) {
          console.error('[UI] attack failed', attackError);
          FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2, 'Attack failed', { color: '#ff6666' });
          try { state.resetCombo(); } catch (e) { }
          state.combatState.attackInProgress = false;
          this.finishAttackSpinner();
          settleQueue();
          return;
        }

        if (result && result.apCost) {
          FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight - 100, `-${Math.ceil(result.apCost)} AP`, { color: '#ffd700', scale: 0.7, rotationRange: 40 });
        }

        if (!result.success) {
          const isApFailure = typeof result.reason === 'string' && result.reason.toLowerCase().includes('not enough ap');
          if (isApFailure) {
            FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2, 'Not enough power', { color: '#ffcc66' });
            try { if (window.SoundManager) SoundManager.play('miss'); } catch (e) { }
          } else {
            FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2, 'Miss', { color: '#bbbbbb' });
            try { state.resetCombo(); } catch (e) { }
            ScreenEffects.shake(2, 80);
            try { if (window.SoundManager) SoundManager.play('miss'); } catch (e) { }
          }
          state.combatState.attackInProgress = false;
          this.finishAttackSpinner();
          settleQueue();
          return;
        }

        // Chrono-Shift echo processing
        if (result && result.chronoShiftEcho) {
          const echo = result.chronoShiftEcho;
          setTimeout(() => {
            try {
              const echoTarget = StageManager.getEnemyById(echo.targetId) || (StageManager.getAliveEnemies && StageManager.getAliveEnemies()[0]);
              if (echoTarget && !echoTarget.isDead) {
                const echoDmg = Math.max(1, Math.ceil(echo.damage * 0.5));
                echoTarget.takeDamage(echoDmg);

                let targetX = window.innerWidth / 2;
                let targetY = window.innerHeight / 2;
                const targetCard = document.querySelector(`.enemy-card[data-enemy-id="${echoTarget.id}"]`);
                if (targetCard) {
                  if (targetCard.dataset.x) {
                    const circleRect = UIManager.getCircleRect();
                    targetX = circleRect.left + Number(targetCard.dataset.x);
                    targetY = circleRect.top + Number(targetCard.dataset.y);
                  } else {
                    const rect = targetCard.getBoundingClientRect();
                    targetX = rect.left + rect.width / 2;
                    targetY = rect.top + rect.height / 2;
                  }
                }

                if (typeof RetroHitAnimation !== 'undefined') {
                  RetroHitAnimation.play(targetX, targetY, '#a855f7');
                }

                FloatingDamageNumber.show(
                  targetX,
                  targetY - 20,
                  `ECHO: -${echoDmg} ⏳`,
                  { color: '#a855f7', scale: 1.2, duration: 1500 }
                );

                try { this.renderEnemies(); } catch (e) { }
                try { this.refreshGameUI(); } catch (e) { }
              }
            } catch (e) {
              console.warn('Chrono-Shift echo failed', e);
            }
          }, 450);
        }

        const weapon = PlayerManager.getCurrentWeapon();
        const maxCombo = weapon?.data?.comboMaxStacks || getGameState().config.comboMaxStacks || 4;
        const isComboFinisher = result.combo >= maxCombo;

        // Combo finisher and crit delays removed

        const hitDetails = Array.isArray(result.hitDetails) ? result.hitDetails : [{
          enemyId: target.id,
          damage: result.primaryDamage || result.damage || 0,
          isCrit: result.isCrit,
          isDead: result.targetDead
        }];

        hitDetails.forEach((hit, index) => {
          setTimeout(() => {
            const hitColor = hit.isCrit ? UIManager.themeColor('--ap-gold', '#FFB33F') : UIManager.themeColor('--danger-red', '#C00707');
            const fireRate = Math.max(1, Number(result.fireRate || 1));

            let targetX = window.innerWidth / 2;
            let targetY = window.innerHeight / 2;
            const targetCard = document.querySelector(`.enemy-card[data-enemy-id="${hit.enemyId}"]`);
            if (targetCard) {
              if (targetCard.dataset.x) {
                const circleRect = UIManager.getCircleRect();
                targetX = circleRect.left + Number(targetCard.dataset.x);
                targetY = circleRect.top + Number(targetCard.dataset.y);
              } else {
                const rect = targetCard.getBoundingClientRect();
                targetX = rect.left + rect.width / 2;
                targetY = rect.top + rect.height / 2;
              }

              const elementColors = {
                Earth: '#30C85A',
                Water: '#134E8E',
                Fire: '#FF4400',
                Air: '#cbd5e1',
                Aether: '#A15CFF'
              };
              const elementColor = elementColors[hit.element] || '#ffffff';

              if (hit.weaknessMatch && typeof RetroWeaknessAnimation !== 'undefined') {
                RetroWeaknessAnimation.play(targetCard, elementColor);
                try {
                  FloatingDamageNumber.show(targetX, targetY - 45, 'WEAK!', {
                    color: elementColor,
                    duration: 1100,
                    scale: 1.2,
                    fadeDelay: 700
                  });
                } catch (e) { }
              } else if (hit.resistanceMatch && typeof RetroResistanceAnimation !== 'undefined') {
                RetroResistanceAnimation.play(targetCard, elementColor);
                try {
                  FloatingDamageNumber.show(targetX, targetY - 45, 'RESISTED!', {
                    color: '#888888',
                    duration: 1100,
                    scale: 0.9,
                    fadeDelay: 700
                  });
                } catch (e) { }
              }

              if (hit.isCrit && typeof RetroCritSlashAnimation !== 'undefined') {
                RetroCritSlashAnimation.play(targetCard, elementColor);
              }
            }

            if (typeof RetroHitAnimation !== 'undefined') {
              RetroHitAnimation.play(targetX, targetY, hitColor);
            }

            if (fireRate > 1) {
              FloatingDamageNumber.showBurst(
                targetX,
                targetY,
                Math.ceil(hit.damage),
                {
                  bursts: fireRate,
                  color: hitColor,
                  isCrit: hit.isCrit,
                  duration: 1400,
                  fadeDelay: 900,
                  staggerMs: 120
                }
              );
            } else {
              FloatingDamageNumber.show(
                targetX,
                targetY,
                Math.ceil(hit.damage),
                {
                  color: hitColor,
                  isCrit: hit.isCrit,
                  duration: 1200,
                  fadeDelay: 800
                }
              );
            }

            if (hit.isDead) {
              const isElite = targetCard ? targetCard.classList.contains('elite') || targetCard.classList.contains('boss') : false;
              EnemyDeathAnimation.burst(targetX, targetY, isElite);
            }
          }, index * 120);
        });

        if (Array.isArray(result.specialPopups) && result.specialPopups.length) {
          const damageColor = result.isCrit ? UIManager.themeColor('--ap-gold', '#FFB33F') : UIManager.themeColor('--danger-red', '#C00707');
          result.specialPopups.forEach((popup, index) => {
            setTimeout(() => {
              FloatingDamageNumber.show(
                window.innerWidth / 2 + ((index % 2 === 0) ? -42 : 42),
                window.innerHeight / 2 - 54 - (index * 16),
                popup.text,
                { color: popup.color || damageColor, duration: 1400, fadeDelay: 800, scale: 0.9 }
              );
            }, (hitDetails.length * 120) + (index * 120));
          });
        }

        this.renderEnemies();
        getGameState().save();
      } finally {
        state.combatState.attackInProgress = false;
        this.finishAttackSpinner();
        settleQueue();
      }
    } catch (error) {
      console.error('[UI] handleAttackClick failed', error);
      state.combatState.attackInProgress = false;
      this.finishAttackSpinner();
      settleQueue();
      FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2, 'Attack blocked', { color: '#ff6666' });
    }
  }

  static handleSkillClick(targetEnemyId = null) {
    const state = getGameState();
    const className = state.playerState.className;

    // Alchemist requires an alive target
    let alchemistTarget = null;
    const hasAlchemist = className === 'Alchemist' || (state.playerState.borrowedSkills && state.playerState.borrowedSkills.includes('Alchemist'));
    if (hasAlchemist) {
      alchemistTarget = this.resolveAttackTarget(targetEnemyId);
      if (!alchemistTarget) {
        alchemistTarget = (StageManager.getAliveEnemies && StageManager.getAliveEnemies()[0]) || (StageManager.getAllEnemies && StageManager.getAllEnemies().find(enemy => enemy && !enemy.isDead)) || null;
      }
      if (!alchemistTarget) {
        if (StageManager.allEnemiesDead()) {
          this.finishAttackSpinner();
          StageManager.onLevelCleared();
          UIManager.renderWorldMapNodeView();
          return;
        }
        try {
          FloatingDamageNumber.show(
            window.innerWidth / 2,
            window.innerHeight / 2,
            'No target to select',
            { color: '#ff6666', duration: 1200 }
          );
        } catch (e) { }
        this.finishAttackSpinner();
        return;
      }
    }

    const result = CombatManager.useSkill();

    if (!result.success) {
      // Show a subtle error floating text
      try {
        const reason = result.reason || 'Skill unavailable';
        FloatingDamageNumber.show(
          window.innerWidth / 2,
          window.innerHeight / 2,
          reason,
          { color: '#ff6666', duration: 1200 }
        );
      } catch (e) { }
      this.finishAttackSpinner();
      return;
    }

    // Apply skill mechanical effects
    try {
      const state = getGameState();
      const className = state.playerState.className;
      if (!state.combatState) state.combatState = {};
      if (!state.combatState.skillEffects) state.combatState.skillEffects = {};

      const classesToApply = [className];
      if (Array.isArray(state.playerState.borrowedSkills)) {
        classesToApply.push(...state.playerState.borrowedSkills);
      }

      for (const cls of classesToApply) {
        switch (cls) {
          case 'Knight':
            // Iron Bastion: next 4 attacks deal 0.4× damage
            state.combatState.skillEffects.shieldCharges = (state.combatState.skillEffects.shieldCharges || 0) + 4;
            state.combatState.skillEffects.shieldDamageMultiplier = 0.4;
            break;

          case 'Rogue':
            // Phantom Blow: next attack deals 4×, ignores resistances, steals 30 mana
            state.combatState.skillEffects.phantomBlow = true;
            break;

          case 'Wizard':
          case 'Mage':
            // Bypass Final Stand: next attack bypasses Final Stand
            state.combatState.skillEffects.bypassFinalStand = true;
            if (typeof FloatingDamageNumber !== 'undefined') {
              FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2, 'Bypass Final Stand Ready!', { color: '#a855f7' });
            }
            break;

          case 'Brute':
            // Wrath Unleashed: +200% damage today, cannot dodge
            state.combatState.skillEffects.wrathUnleashed = true;
            state.combatState.skillEffects.wrathDamageMultiplier = (state.combatState.skillEffects.wrathDamageMultiplier || 1.0) + 2.0;
            state.combatState.skillEffects.cannotDodge = true;
            break;

          case 'Ranger':
            // Storm Volley: applies to the next attack
            state.combatState.skillEffects.stormVolley = true;
            break;

          case 'Druid':
            // Nature's Embrace: heal 20 HP, pet attacks +1 tomorrow
            state.addHp(20);
            state.systemState.extraPetAttacksTomorrow = (state.systemState.extraPetAttacksTomorrow || 0) + 1;
            break;

          case 'Alchemist':
            // Unstable Concoction: reverse target's weaknesses/resistances permanently, block healing/mutating next check-in.
            // Deal 30% max HP of target as splash damage to 2 adjacent enemies.
            try {
              const target = alchemistTarget || this.resolveAttackTarget();
              if (target) {
                const tempResist = target.resist;
                target.resist = target.weak;
                target.weak = tempResist;

                target.statusEffects = target.statusEffects || {};
                target.statusEffects.unstableConcoction = {
                  preventHeal: true,
                  preventMutate: true
                };

                try {
                  const targetCard = document.querySelector(`.enemy-card[data-enemy-id="${target.id}"]`);
                  if (targetCard) {
                    if (targetCard.dataset.x) {
                      const circleRect = UIManager.getCircleRect();
                      FloatingDamageNumber.show(circleRect.left + Number(targetCard.dataset.x), circleRect.top + Number(targetCard.dataset.y) - 45, 'REVERSED & COATED 🧪', { color: '#84cc16', scale: 1.1, duration: 1500 });
                    } else {
                      const rect = targetCard.getBoundingClientRect();
                      FloatingDamageNumber.show(rect.left + rect.width / 2, rect.top, 'REVERSED & COATED 🧪', { color: '#84cc16', scale: 1.1, duration: 1500 });
                    }
                  }
                } catch (e) { }

                const all = StageManager.getAllEnemies ? StageManager.getAllEnemies() : [];
                const idx = all.indexOf(target);
                if (idx > -1) {
                  const adjacents = EnemyManager.getAdjacentEnemies(all, idx).slice(0, 2);
                  const splashDmg = Math.ceil((target.maxHp || 100) * 0.30);
                  adjacents.forEach(adj => {
                    if (adj && !adj.isDead) {
                      adj.takeDamage(splashDmg);

                      try {
                        const adjCard = document.querySelector(`.enemy-card[data-enemy-id="${adj.id}"]`);
                        if (adjCard) {
                          if (adjCard.dataset.x) {
                            const circleRect = UIManager.getCircleRect();
                            FloatingDamageNumber.show(circleRect.left + Number(adjCard.dataset.x), circleRect.top + Number(adjCard.dataset.y) - 45, `-${splashDmg} 💥`, { color: '#ffaa00', scale: 1.2, duration: 1200 });
                          } else {
                            const rect = adjCard.getBoundingClientRect();
                            FloatingDamageNumber.show(rect.left + rect.width / 2, rect.top, `-${splashDmg} 💥`, { color: '#ffaa00', scale: 1.2, duration: 1200 });
                          }
                        }
                      } catch (e) { }
                    }
                  });
                }
              }
            } catch (e) {
              console.warn('Alchemist skill failed', e);
            }
            break;

          case 'Juggernaut':
            // Fortress: invincible for next 2 attacks + reflect 50% damage
            state.combatState.skillEffects.fortressCharges = (state.combatState.skillEffects.fortressCharges || 0) + 2;
            state.combatState.skillEffects.fortressReflect = 0.5;
            break;

          case 'Madman':
            // Scream into the Void: gain 1 diamond
            state.addDiamonds(1);
            break;
        }
      }

      // Persist state after skill activation
      try { state.save(); } catch (e) { }
      // Refresh enemies display if AoE killed something
      try { this.renderEnemies(); } catch (e) { }
      try { this.refreshGameUI(); } catch (e) { }
    } catch (e) {
      console.warn('Failed to apply skill effects', e);
    }

    // Show dramatic skill activation popup
    try {
      const state = getGameState();
      const hexToRgb = (hex) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '255, 215, 0';
      };

      const container = document.createElement('div');
      container.className = 'skill-activation-container';
      document.body.appendChild(container);

      // 1. Primary Skill Card
      const primaryMeta = (state.config.classSkillMeta && state.config.classSkillMeta[className]) || {};
      const primaryName = primaryMeta.name || 'Skill';
      const primaryIcon = primaryMeta.icon || '✨';
      const primaryColor = primaryMeta.color || '#ffd700';
      const primaryFlavor = primaryMeta.flavorText || '';

      const primaryCard = document.createElement('div');
      primaryCard.className = 'skill-card-popup primary';
      primaryCard.style.setProperty('--skill-color', primaryColor);
      primaryCard.style.setProperty('--skill-color-rgb', hexToRgb(primaryColor));
      primaryCard.innerHTML = `
        <div class="skill-badge">PRIMARY SKILL</div>
        <div class="skill-main-row">
          <div class="skill-activation-icon">${primaryIcon}</div>
          <div class="skill-text-group">
            <div class="skill-activation-name" style="color: ${primaryColor}">${primaryName}</div>
            ${primaryFlavor ? `<div class="skill-activation-flavor">${primaryFlavor}</div>` : ''}
          </div>
        </div>
      `;
      container.appendChild(primaryCard);

      // Screen flash with primary class color
      try {
        ScreenEffects.flash(primaryColor + '18', 300);
      } catch (e) { }

      // 2. Borrowed Skill Cards (if any)
      if (Array.isArray(state.playerState.borrowedSkills)) {
        state.playerState.borrowedSkills.forEach((borrowedClass, index) => {
          const borrowedMeta = (state.config.classSkillMeta && state.config.classSkillMeta[borrowedClass]) || {};
          const borrowedName = borrowedMeta.name || borrowedClass;
          const borrowedIcon = borrowedMeta.icon || '✨';
          const borrowedColor = borrowedMeta.color || '#ffd700';
          const borrowedFlavor = borrowedMeta.flavorText || '';

          const borrowedCard = document.createElement('div');
          borrowedCard.className = 'skill-card-popup borrowed';
          borrowedCard.style.setProperty('--skill-color', borrowedColor);
          borrowedCard.style.setProperty('--skill-color-rgb', hexToRgb(borrowedColor));
          borrowedCard.style.animationDelay = `${0.25 * (index + 1)}s`;
          borrowedCard.innerHTML = `
            <div class="skill-badge">BORROWED SKILL</div>
            <div class="skill-main-row">
              <div class="skill-activation-icon">${borrowedIcon}</div>
              <div class="skill-text-group">
                <div class="skill-activation-name" style="color: ${borrowedColor}">${borrowedName}</div>
                ${borrowedFlavor ? `<div class="skill-activation-flavor">${borrowedFlavor}</div>` : ''}
              </div>
            </div>
          `;
          container.appendChild(borrowedCard);

          // Screen flash with borrowed class color (delayed to match animation)
          setTimeout(() => {
            try {
              ScreenEffects.flash(borrowedColor + '14', 250);
            } catch (e) { }
          }, 250 * (index + 1));
        });
      }

      // Smooth drift-up and fade-out transition for the entire container
      setTimeout(() => {
        try {
          container.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
          container.style.opacity = '0';
          container.style.transform = 'translate(-50%, -60%)';
          setTimeout(() => container.remove(), 600);
        } catch (e) { }
      }, 3000);
    } catch (e) {
      console.warn('Failed to show skill activation popup', e);
    }
    this.finishAttackSpinner();
  }

  static handleSatchelClick() {
    // Satchel is now a permanent panel.
    this.updateConsumableStrip();
  }

  static getDailyNoteDateKey() {
    return typeof TaskManager.getCurrentGameDateKey === 'function'
      ? TaskManager.getCurrentGameDateKey()
      : (typeof getLocalDateKey === 'function' ? getLocalDateKey() : new Date().toISOString().split('T')[0]);
  }

  static addDailyNote() {
    const state = getGameState();
    if (state.systemState && state.systemState.taskListFilters) {
      state.systemState.taskListFilters.editModeDailies = true;
      this.updateTaskVisibilityToggleLabels();
    }
    const note = state.addDailyNote ? state.addDailyNote('', {
      x: 14 + (Math.random() * 18),
      y: 14 + (Math.random() * 22)
    }) : null;

    if (!note) return;
    this._focusDailyNoteId = String(note.id);
    this.updateDailiesList();
  }

  static addTodoNote(type = 'note') {
    const state = getGameState();
    let text = '';
    let extra = {};
    if (type === 'grid') {
      extra = { width: 300, height: 200 };
    } else if (type === 'arrow') {
      extra = { width: 150, height: 80, direction: 'right' };
    } else if (type === 'calendar') {
      extra = { width: 350, height: 280 };
    }
    const note = state.addTodoNote ? state.addTodoNote(text, {
      x: 14 + (Math.random() * 18),
      y: 14 + (Math.random() * 22)
    }, type, extra) : null;

    if (!note) return;
    this._focusTodoNoteId = String(note.id);
    this.updateTodosList();
  }

  static handleCompleteDayClick() {
    const completeNow = () => {
      const result = TaskManager.completeDay();
      if (!result || !result.success) {
        FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2, 'Could not complete', { color: '#ff6666' });
        return;
      }

      const rewards = result.rewards || {};
      const textParts = [];
      if (rewards.ap) textParts.push(`+${Math.ceil(rewards.ap)} AP`);
      if (rewards.gold) textParts.push(`+${Math.ceil(rewards.gold)} Gold`);
      if (rewards.diamonds) textParts.push(`+${Math.ceil(rewards.diamonds)} Diamonds`);
      if (rewards.attributePoints) textParts.push(`+${rewards.attributePoints.toFixed ? rewards.attributePoints.toFixed(1) : rewards.attributePoints} Attr`);
      FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2, textParts.join(' · ') || 'Complete Day', { color: '#ffd700', duration: 2200 });
      this.scheduleUpdateDailiesList();
      this.refreshGameUI();
    };

    try {
      PopupsManager.showConfirm('Complete Day?', 'Claim the day now and reset the dailies for check-in?', completeNow);
    } catch (error) {
      console.warn('Failed to show complete-day confirmation', error);
      completeNow();
    }
  }

  static updateActionButtons() {
    const state = getGameState();
    const dodgeBtn = document.getElementById('dodgeBtn');
    if (dodgeBtn) {
      const parryCount = state.playerState?.parryCount || 0;
      dodgeBtn.textContent = String(parryCount);
      dodgeBtn.style.fontFamily = "'Orbitron', monospace, sans-serif";
      dodgeBtn.style.fontWeight = '700';
      dodgeBtn.title = `Parries Remaining: ${parryCount}`;
    }
  }

  static handleDodgeClick() {
    const state = getGameState();
    const result = CombatManager.attemptParry();
    if (result.success) {
      FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight - 100, 'Parry Active! 🛡️', { color: '#00e5ff', scale: 0.8 });
      this.updateActionButtons();
      this.renderEnemies();
    } else {
      FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight - 100, result.reason || 'Cannot Parry', { color: '#ff4444', scale: 0.8 });
    }
  }

  static getSpinnerTargetEnemy() {
    const targets = this.getSpinnerTargetEnemies();
    return targets[0] || null;
  }

  static getSpinnerTargetEnemies() {
    const state = getGameState();
    const spinner = document.getElementById('spinner');

    if (!spinner) return [];

    const enemies = (state.stageState.enemies || []);
    if (enemies.length === 0) return [];

    let spinnerAngleDeg = this.spinnerAngle || 0;

    // The spinner starts vertically, so offset by -90 degrees to line up with the top enemy.
    spinnerAngleDeg -= 90;
    while (spinnerAngleDeg < 0) spinnerAngleDeg += 360;
    while (spinnerAngleDeg >= 360) spinnerAngleDeg -= 360;

    // Convert to radians
    const spinnerRad = (spinnerAngleDeg * Math.PI) / 180;
    const degreesToRadians = Math.PI / 180;
    const tolerance = 18 * degreesToRadians;

    let bestAlive = null;
    let bestAliveDiff = Infinity;
    let bestDead = null;
    let bestDeadDiff = Infinity;
    const alignedLiving = [];

    enemies.forEach((enemy, index) => {
      const capacityPerRing = 8;
      const ringLevel = Math.floor(index / capacityPerRing);
      const ringIndex = index % capacityPerRing;
      const totalInRing = Math.min(capacityPerRing, enemies.length - ringLevel * capacityPerRing);
      const cardAngle = (Math.PI * 2 * ringIndex) / totalInRing - Math.PI / 2;

      let diff = Math.abs(spinnerRad - cardAngle);
      if (diff > Math.PI) diff = 2 * Math.PI - diff;

      const adjustedDiff = diff - (ringLevel * 0.0001);

      if (!enemy.isDead && adjustedDiff < bestAliveDiff) {
        bestAliveDiff = adjustedDiff;
        bestAlive = enemy;
      }

      if (enemy.isDead && adjustedDiff < bestDeadDiff) {
        bestDeadDiff = adjustedDiff;
        bestDead = enemy;
      }

      if (!enemy.isDead && diff <= tolerance) {
        alignedLiving.push({ enemy, diff: adjustedDiff });
      }
    });

    alignedLiving.sort((a, b) => a.diff - b.diff);

    if (alignedLiving.length > 0) {
      return alignedLiving.map(entry => entry.enemy);
    }

    // If the spinner isn't aligned with any living enemy, return the closest dead slot to preserve misses.
    return bestDead ? [bestDead] : (bestAlive ? [bestAlive] : []);
  }

  static setupDragTargeting() {
    const attackBtn = document.getElementById('attackBtn');
    const skillBtn = document.getElementById('skillBtn');
    const dodgeBtn = document.getElementById('dodgeBtn');
    const svg = document.getElementById('aimingSvg');
    const line = document.getElementById('aimingLine');

    if (!attackBtn || !skillBtn || !dodgeBtn || !svg || !line) return;

    let dragType = null; // 'attack', 'skill', 'dodge'
    let activePointerId = null;
    let startX = 0;
    let startY = 0;
    let buttonCenterX = 0;
    let buttonCenterY = 0;
    let circleCenterX = 0;
    let circleCenterY = 0;
    let circleRect = null;
    let currentTargetEnemyId = null;
    let hasDraggedPastDeadzone = false;
    let targetElement = null;

    const clearHighlights = () => {
      document.querySelectorAll('.enemy-card').forEach(card => {
        card.classList.remove('targeted-attack', 'targeted-skill', 'targeted-dodge');
      });
    };

    const getTargetEnemyByProximity = (clientX, clientY) => {
      const state = getGameState();
      const enemies = (state.stageState.enemies || []).filter(e => !e.isDead);
      if (enemies.length === 0) return null;

      let bestEnemy = null;
      let minDistanceSq = Infinity;

      enemies.forEach((enemy) => {
        const card = document.querySelector(`.enemy-card[data-enemy-id="${enemy.id}"]`);
        if (!card) return;
        const rect = card.getBoundingClientRect();
        const cardCenterX = rect.left + rect.width / 2;
        const cardCenterY = rect.top + rect.height / 2;

        const dx = clientX - cardCenterX;
        const dy = clientY - cardCenterY;
        const distSq = dx * dx + dy * dy;

        if (distSq < minDistanceSq) {
          minDistanceSq = distSq;
          bestEnemy = enemy;
        }
      });

      return bestEnemy;
    };

    const onPointerDown = (event, type) => {
      const state = getGameState();
      const className = state.playerState.className;
      targetElement = event.currentTarget;

      // 1. Resource Validation
      if (type === 'attack') {
        const weapon = PlayerManager.getCurrentWeapon();
        if (!weapon) {
          FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2, 'No weapon equipped', { color: '#ff6666' });
          return;
        }
        const attackCost = new WeaponAttack(weapon.name).getScaledApCost();
        if (state.playerState.ap < attackCost) {
          FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2, 'Not enough power', { color: '#ffcc66' });
          try { if (window.SoundManager) SoundManager.play('miss'); } catch (e) { }
          if (targetElement) {
            targetElement.classList.add('shake');
            setTimeout(() => targetElement.classList.remove('shake'), 300);
          }
          return;
        }
      } else if (type === 'dodge') {
        const parryCount = state.playerState?.parryCount || 0;
        const skillFx = state.combatState?.skillEffects || {};
        if (skillFx.cannotDodge) {
          FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2, 'Wrath forbids parrying', { color: '#ff6666' });
          return;
        }
        if (parryCount <= 0) {
          FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2, 'No Parries left', { color: '#ffcc66' });
          try { if (window.SoundManager) SoundManager.play('miss'); } catch (e) { }
          if (targetElement) {
            targetElement.classList.add('shake');
            setTimeout(() => targetElement.classList.remove('shake'), 300);
          }
          return;
        }
      } else if (type === 'skill') {
        const skillCost = state.config.skillManaCosts[className];
        if (!skillCost) {
          FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2, 'Class has no mana skill', { color: '#ff6666' });
          return;
        }
        if (state.playerState.mana < skillCost) {
          FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2, 'Not enough mana', { color: '#ff6666' });
          try { if (window.SoundManager) SoundManager.play('miss'); } catch (e) { }
          if (targetElement) {
            targetElement.classList.add('shake');
            setTimeout(() => targetElement.classList.remove('shake'), 300);
          }
          return;
        }
      }

      // 2. Initialize Drag/Click state
      dragType = type;
      activePointerId = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      hasDraggedPastDeadzone = false;
      currentTargetEnemyId = null;

      const circle = document.querySelector('.enemy-circle-container');
      if (!circle) return;
      circleRect = circle.getBoundingClientRect();
      circleCenterX = circleRect.width / 2;
      circleCenterY = circleRect.height / 2;

      const btnRect = targetElement ? targetElement.getBoundingClientRect() : { left: 0, top: 0, width: 0, height: 0 };
      buttonCenterX = btnRect.left - circleRect.left + btnRect.width / 2;
      buttonCenterY = btnRect.top - circleRect.top + btnRect.height / 2;

      const hasAlchemist = className === 'Alchemist' || (state.playerState.borrowedSkills && state.playerState.borrowedSkills.includes('Alchemist'));
      const isTargetingSkill = (type === 'skill' && hasAlchemist);

      if ((type === 'attack' || type === 'dodge' || isTargetingSkill) && targetElement) {
        targetElement.setPointerCapture(activePointerId);
      }
    };

    const onPointerMove = (event) => {
      if (activePointerId !== event.pointerId) return;

      const state = getGameState();
      const className = state.playerState.className;
      const hasAlchemist = className === 'Alchemist' || (state.playerState.borrowedSkills && state.playerState.borrowedSkills.includes('Alchemist'));
      const isTargetingSkill = (dragType === 'skill' && hasAlchemist);

      if (dragType !== 'attack' && dragType !== 'dodge' && !isTargetingSkill) {
        return;
      }

      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      const dist = Math.hypot(dx, dy);

      if (dist > 25) {
        hasDraggedPastDeadzone = true;
      }

      if (hasDraggedPastDeadzone) {
        if (!circleRect) {
          const circle = document.querySelector('.enemy-circle-container');
          if (circle) circleRect = circle.getBoundingClientRect();
        }
        if (!circleRect) return;
        const pointerX = event.clientX - circleRect.left;
        const pointerY = event.clientY - circleRect.top;

        svg.style.display = 'block';
        line.setAttribute('x1', buttonCenterX);
        line.setAttribute('y1', buttonCenterY);
        line.setAttribute('x2', pointerX);
        line.setAttribute('y2', pointerY);

        line.className.baseVal = dragType;

        const targetedEnemy = getTargetEnemyByProximity(event.clientX, event.clientY);
        clearHighlights();

        if (targetedEnemy) {
          currentTargetEnemyId = targetedEnemy.id;
          const card = document.querySelector(`.enemy-card[data-enemy-id="${targetedEnemy.id}"]`);
          if (card) {
            card.classList.add(`targeted-${dragType}`);
          }
        } else {
          currentTargetEnemyId = null;
        }
      } else {
        svg.style.display = 'none';
        clearHighlights();
        currentTargetEnemyId = null;
      }
    };

    const onPointerUp = (event) => {
      if (activePointerId !== event.pointerId) return;

      const state = getGameState();
      const className = state.playerState.className;
      const hasAlchemist = className === 'Alchemist' || (state.playerState.borrowedSkills && state.playerState.borrowedSkills.includes('Alchemist'));
      const isTargetingSkill = (dragType === 'skill' && hasAlchemist);

      if ((dragType === 'attack' || dragType === 'dodge' || isTargetingSkill) && targetElement) {
        try { targetElement.releasePointerCapture(activePointerId); } catch (e) { }
      }

      svg.style.display = 'none';
      clearHighlights();

      if (hasDraggedPastDeadzone) {
        const dragTargetEnemy = getTargetEnemyByProximity(event.clientX, event.clientY);
        const finalTargetId = currentTargetEnemyId || (dragTargetEnemy ? dragTargetEnemy.id : null);
        if (finalTargetId) {
          const enemy = StageManager.getAllEnemies().find(e => String(e.id) === String(finalTargetId) && !e.isDead);
          if (enemy) {
            if (dragType === 'attack') {
              UIManager.handleAttackClick(enemy.id);
            } else if (dragType === 'skill' && isTargetingSkill) {
              UIManager.handleSkillClick(enemy.id);
            } else if (dragType === 'dodge') {
              const parryCount = state.playerState?.parryCount || 0;
              const skillFx = state.combatState?.skillEffects || {};
              if (skillFx.cannotDodge) {
                FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2, 'Wrath forbids parrying!', { color: '#ff4444' });
                try { if (window.SoundManager) SoundManager.play('miss'); } catch (e) { }
              } else if (parryCount <= 0) {
                FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2, 'No Parries left!', { color: '#ff4444' });
                try { if (window.SoundManager) SoundManager.play('miss'); } catch (e) { }
              } else {
                const currentDodges = Array.isArray(state.combatState.dodgeTarget)
                  ? state.combatState.dodgeTarget
                  : (state.combatState.dodgeTarget ? [state.combatState.dodgeTarget] : []);

                if (currentDodges.map(id => String(id)).includes(String(enemy.id))) {
                  FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2, 'Already parrying target', { color: '#ffcc66', scale: 0.75 });
                  try { if (window.SoundManager) SoundManager.play('miss'); } catch (e) { }
                } else {
                  state.playerState.parryCount = parryCount - 1;
                  CombatManager.recordDodge();

                  const parryResult = (typeof evaluateParrySuccess === 'function') ? evaluateParrySuccess(enemy) : { success: true };
                  const card = document.querySelector(`.enemy-card[data-enemy-id="${enemy.id}"]`);
                  const cardRect = card ? card.getBoundingClientRect() : null;
                  const popupX = cardRect ? (cardRect.left + cardRect.width / 2) : (window.innerWidth / 2);
                  const popupY = cardRect ? (cardRect.top - 18) : (window.innerHeight / 2);

                  if (parryResult.success) {
                    state.combatState.dodgeTarget = [...new Set([...currentDodges, enemy.id])];
                    FloatingDamageNumber.show(popupX, popupY, 'PARRIED', { color: '#00e5ff', scale: 0.9, duration: 1400 });

                    try {
                      if (card && typeof DodgeTetherAnimation !== 'undefined') {
                        const rect = circleRect || UIManager.getCircleRect();
                        const sx = rect.left + buttonCenterX;
                        const sy = rect.top + buttonCenterY;
                        DodgeTetherAnimation.play(sx, sy, card);
                      }
                    } catch (e) {
                      console.warn('Failed to play DodgeTetherAnimation', e);
                    }
                  } else {
                    FloatingDamageNumber.show(popupX, popupY, 'PARRY FAILED', { color: '#ff4444', scale: 0.9, duration: 1400 });
                    try { if (window.SoundManager) SoundManager.play('miss'); } catch (e) { }
                  }

                  UIManager.updateActionButtons();
                  UIManager.renderEnemies();
                  UIManager.updatePendingDamageDisplay();
                }
              }
            }
          }
        }
      } else {
        const aliveEnemies = (state.stageState.enemies || []).filter(e => !e.isDead);
        if (aliveEnemies.length === 0) {
          FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2, 'No Target', { color: '#ff4444' });
        } else {
          if (dragType === 'attack') {
            const savedId = state.combatState?.currentTarget;
            let target = savedId ? aliveEnemies.find(e => String(e.id) === String(savedId)) : null;
            if (!target) {
              target = aliveEnemies[0];
            }
            UIManager.handleAttackClick(target.id);
          } else if (dragType === 'skill') {
            if (isTargetingSkill) {
              const savedId = state.combatState?.currentTarget;
              let target = savedId ? aliveEnemies.find(e => String(e.id) === String(savedId)) : aliveEnemies[0];
              UIManager.handleSkillClick(target.id);
            } else {
              UIManager.handleSkillClick();
            }
          } else if (dragType === 'dodge') {
            let target = aliveEnemies[0];
            const parryCount = state.playerState?.parryCount || 0;
            const skillFx = state.combatState?.skillEffects || {};
            if (skillFx.cannotDodge) {
              FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2, 'Wrath forbids parrying!', { color: '#ff4444' });
              try { if (window.SoundManager) SoundManager.play('miss'); } catch (e) { }
            } else if (parryCount <= 0) {
              FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2, 'No Parries left!', { color: '#ff4444' });
              try { if (window.SoundManager) SoundManager.play('miss'); } catch (e) { }
            } else {
              const currentDodges = Array.isArray(state.combatState.dodgeTarget)
                ? state.combatState.dodgeTarget
                : (state.combatState.dodgeTarget ? [state.combatState.dodgeTarget] : []);

              if (currentDodges.map(id => String(id)).includes(String(target.id))) {
                FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2, 'Already parrying', { color: '#ffcc66' });
                try { if (window.SoundManager) SoundManager.play('miss'); } catch (e) { }
              } else {
                state.playerState.parryCount = parryCount - 1;
                CombatManager.recordDodge();

                const parryResult = (typeof evaluateParrySuccess === 'function') ? evaluateParrySuccess(target) : { success: true };
                const card = document.querySelector(`.enemy-card[data-enemy-id="${target.id}"]`);
                const cardRect = card ? card.getBoundingClientRect() : null;
                const popupX = cardRect ? (cardRect.left + cardRect.width / 2) : (window.innerWidth / 2);
                const popupY = cardRect ? (cardRect.top - 18) : (window.innerHeight / 2);

                if (parryResult.success) {
                  state.combatState.dodgeTarget = [...new Set([...currentDodges, target.id])];
                  FloatingDamageNumber.show(popupX, popupY, 'PARRIED', { color: '#00e5ff', scale: 0.9, duration: 1400 });
                } else {
                  FloatingDamageNumber.show(popupX, popupY, 'PARRY FAILED', { color: '#ff4444', scale: 0.9, duration: 1400 });
                  try { if (window.SoundManager) SoundManager.play('miss'); } catch (e) { }
                }

                UIManager.updateActionButtons();
                UIManager.renderEnemies();
                UIManager.updatePendingDamageDisplay();
              }
            }
          }
        }
      }

      dragType = null;
      activePointerId = null;
      currentTargetEnemyId = null;
      circleRect = null;
      targetElement = null;
    };

    const setupButton = (btn, type) => {
      btn.addEventListener('pointerdown', (e) => onPointerDown(e, type));
      btn.addEventListener('pointermove', onPointerMove);
      btn.addEventListener('pointerup', onPointerUp);
      btn.addEventListener('pointercancel', onPointerUp);
    };

    setupButton(attackBtn, 'attack');
    setupButton(skillBtn, 'skill');
    setupButton(dodgeBtn, 'dodge');
  }

  static handlePauseClick() {
    PopupsManager.showPauseMenu();
  }

  static updatePauseBtn() {
    const pauseBtn = document.getElementById('pauseBtn');
    if (!pauseBtn) return;
    const state = getGameState();
    if (state.systemState.isPaused) {
      pauseBtn.innerHTML = '▶️ Resume';
      pauseBtn.style.color = 'var(--accent-gold)';
      pauseBtn.style.borderColor = 'var(--accent-gold)';
    } else {
      pauseBtn.innerHTML = '⏸️ Pause';
      pauseBtn.style.color = '';
      pauseBtn.style.borderColor = '';
    }
  }

  static handleCheckInClick() {
    if (typeof performCheckIn === 'function') {
      performCheckIn();
    } else {
      console.warn('Check-in is not wired yet.');
    }
  }

  static handleAttackEvent(detail) {
    // Visual feedback for attacks
    if (detail.type === 'dodgeAvoid' && typeof RetroDodgeAnimation !== 'undefined') {
      const targetCard = document.querySelector(`.enemy-card[data-enemy-id="${detail.enemyId}"]`);
      if (targetCard) {
        RetroDodgeAnimation.play(targetCard, '#00e5ff');
      }
      return;
    }

    if (detail.type !== 'dodge' && detail.type !== 'pet' && detail.type !== 'dodgeAvoid') {
      ScreenEffects.shake(2, 45);

      const targetCard = detail.targetId ? document.querySelector(`.enemy-card[data-enemy-id="${detail.targetId}"]`) : null;
      if (targetCard) {
        if (detail.isCrit && typeof RetroCritSlashAnimation !== 'undefined') {
          RetroCritSlashAnimation.play(targetCard);
        }

        const weapon = PlayerManager.getCurrentWeapon();
        const maxCombo = weapon?.data?.comboMaxStacks || getGameState().config.comboMaxStacks || 4;
        if (detail.combo >= maxCombo && typeof RetroComboFinisherAnimation !== 'undefined') {
          RetroComboFinisherAnimation.play(targetCard);
        }
      }

      // ── Weapon-specific hit animations ────────────────────────────────────
      if (typeof WeaponHitAnimation !== 'undefined' && detail.weaponName && targetCard) {
        try {
          const gs = getGameState();
          const combatState = gs.combatState || {};
          const opts = { isCrit: !!detail.isCrit };

          // Collect all hit enemy cards for AoE weapons
          const weaponData = gs.config.weapons[detail.weaponName] || {};

          if (detail.weaponName === 'Bomb' ||
            (weaponData.special && weaponData.special.includes('Hits ALL'))) {
            // Bomb — hit every alive enemy card
            const allCards = Array.from(document.querySelectorAll('.enemy-card'));
            opts.allCards = allCards;

          } else if (detail.weaponName === 'Bazooka' ||
            (weaponData.special && weaponData.special.includes('adjacent'))) {
            // Bazooka — primary + up to 2 adjacent
            const allEnemyCards = Array.from(document.querySelectorAll('.enemy-card'));
            const idx = allEnemyCards.indexOf(targetCard);
            const adjCards = [];
            if (idx > 0 && allEnemyCards[idx - 1]) adjCards.push(allEnemyCards[idx - 1]);
            if (idx < allEnemyCards.length - 1 && allEnemyCards[idx + 1]) adjCards.push(allEnemyCards[idx + 1]);
            opts.allCards = [targetCard, ...adjCards.slice(0, 2)];

          } else if (detail.weaponName === 'Lazer' || weaponData.specialId === 'lazer') {
            // Lazer — find the random secondary target card (not the primary)
            const allCards = Array.from(document.querySelectorAll('.enemy-card'));
            const others = allCards.filter(c => c !== targetCard);
            if (others.length > 0) {
              opts.secondaryCard = others[Math.floor(Math.random() * others.length)];
            }

          } else if (detail.weaponName === 'Echo Bow') {
            // Echo Bow — track hit index to know when 3rd-hit double triggers
            if (!UIManager._echoBowHitIndex) UIManager._echoBowHitIndex = 0;
            UIManager._echoBowHitIndex++;
            opts.echoBowHitIndex = UIManager._echoBowHitIndex;

          } else if (detail.weaponName === 'Death Spell') {
            // Death Spell — check if the target is still alive (resisted = alive)
            const tgtCard = targetCard;
            opts.isResisted = !tgtCard.classList.contains('enemy-dead') &&
              !tgtCard.dataset.isDead;
          }

          WeaponHitAnimation.play(detail.weaponName, targetCard, opts);
        } catch (e) {
          console.warn('[handleAttackEvent] WeaponHitAnimation failed:', e);
        }
      }
    }
  }


  static updateDailiesList() {
    const panel = document.getElementById('dailiesPanel');
    if (panel && !panel.classList.contains('open') && window.innerWidth <= 900) return; // Skip if hidden on mobile
    const dailies = TaskManager.getAllDailies();
    const container = document.getElementById('dailiesList');

    if (!container) return;

    const state = getGameState();
    const showCompleted = !!state.systemState?.taskListFilters?.showCompletedDailies;
    const editModeActive = !!state.systemState?.taskListFilters?.editModeDailies;
    
    if (editModeActive) {
      container.classList.add('edit-mode-active');
    } else {
      container.classList.remove('edit-mode-active');
    }

    const today = TaskManager.getCurrentGameDateKey();
    const isCheckedInToday = state.systemState?.lastCheckInDateKey === today;
    
    let visibleDailies = dailies;
    // if (!editModeActive) {
    //   visibleDailies = visibleDailies.filter(daily => TaskManager.isDailyScheduled(daily, today));
    // }
    if (!showCompleted) {
      visibleDailies = visibleDailies.filter(daily => !daily.completed);
    }
    this.updatePendingDamageDisplay();

    const computeDailyStreak = (dailyId) => {
      if (typeof TaskManager !== 'undefined' && typeof TaskManager.computeDailyStreak === 'function') {
        return TaskManager.computeDailyStreak(dailyId);
      }
      const state = getGameState();
      const history = Array.isArray(state.dailiesState?.history) ? state.dailiesState.history : [];
      let positive = 0;
      let negative = 0;
      for (let i = history.length - 1; i >= 0; i--) {
        const entry = history[i];
        const completed = Array.isArray(entry.completedDailies) && entry.completedDailies.some(d => String(d.id) === String(dailyId));
        const missed = Array.isArray(entry.missedDailies) && entry.missedDailies.some(d => String(d.id) === String(dailyId));
        if (completed) {
          if (negative > 0) break;
          positive++;
          continue;
        }
        if (missed) {
          if (positive > 0) break;
          negative++;
          continue;
        }
        break;
      }
      return positive > 0 ? positive : negative > 0 ? -negative : 0;
    };

    const getAttributeColor = (attribute) => {
      const palette = getGameState()?.config?.attributeColors || {};
      return palette[String(attribute || '').toUpperCase()] || '#7a7a7a';
    };

    const getTextColorForHex = (hex) => {
      const normalized = String(hex || '').replace('#', '');
      if (normalized.length !== 6) return '#ffffff';
      const r = parseInt(normalized.slice(0, 2), 16);
      const g = parseInt(normalized.slice(2, 4), 16);
      const b = parseInt(normalized.slice(4, 6), 16);
      const luminance = (0.299 * r) + (0.587 * g) + (0.114 * b);
      return luminance > 150 ? '#14161d' : '#ffffff';
    };

    const shadeColor = (hex, amount = -18) => {
      const normalized = String(hex || '').replace('#', '');
      if (normalized.length !== 6) return '#2d2d2d';
      const clamp = (value) => Math.max(0, Math.min(255, value));
      const ratio = amount / 100;
      const r = clamp(Math.round(parseInt(normalized.slice(0, 2), 16) * (1 + ratio)));
      const g = clamp(Math.round(parseInt(normalized.slice(2, 4), 16) * (1 + ratio)));
      const b = clamp(Math.round(parseInt(normalized.slice(4, 6), 16) * (1 + ratio)));
      return `#${[r, g, b].map(value => value.toString(16).padStart(2, '0')).join('')}`;
    };

    const focusModeActive = !!getGameState().systemState?.taskListFilters?.focusModeDailies;
    const activeColorFilter = getGameState().systemState?.taskListFilters?.dailyColorFilter || 'regular';
    const sortedByRate = focusModeActive ? [...visibleDailies].sort((a, b) => (a.completionRate || 0) - (b.completionRate || 0)) : [];

    const interpolateColor = (c1Hex, c2Hex, ratio) => {
      const t = Math.max(0, Math.min(1, ratio));
      const p = (hex) => {
        const h = String(hex || '').replace('#', '');
        return [parseInt(h.slice(0, 2), 16) || 0, parseInt(h.slice(2, 4), 16) || 0, parseInt(h.slice(4, 6), 16) || 0];
      };
      const r1 = p(c1Hex), r2 = p(c2Hex);
      const r = Math.round(r1[0] + (r2[0] - r1[0]) * t);
      const g = Math.round(r1[1] + (r2[1] - r1[1]) * t);
      const b = Math.round(r1[2] + (r2[2] - r1[2]) * t);
      const toH = (v) => v.toString(16).padStart(2, '0');
      return `#${toH(r)}${toH(g)}${toH(b)}`;
    };

    let minStreakVal = 0, maxStreakVal = 0;
    let minRewardVal = 0, maxRewardVal = 0;

    if (activeColorFilter === 'streak' && visibleDailies.length > 0) {
      const streakVals = visibleDailies.map(d => computeDailyStreak(d.id));
      minStreakVal = Math.min(...streakVals);
      maxStreakVal = Math.max(...streakVals);
    } else if (activeColorFilter === 'rewards' && visibleDailies.length > 0) {
      const getReward = (d) => getGameState().config?.taskRewards?.[d.difficulty]?.ap || 10;
      const rewardVals = visibleDailies.map(getReward);
      minRewardVal = Math.min(...rewardVals);
      maxRewardVal = Math.max(...rewardVals);
    }

    let html = '';
    const gs = getGameState();
    const event = gs.systemState.specialEvent;
    const eventTargets = (event && !event.claimed && event.targets) ? event.targets : [];

    visibleDailies.forEach(daily => {
      const isScheduled = TaskManager.isDailyScheduled(daily, today);
      const streak = computeDailyStreak(daily.id);
      const maxCompletions = Math.max(1, Number(daily.maxCompletionsPerDay) || 1);
      const completionsToday = Math.max(0, Number(daily.completionsToday) || 0);
      const remainingCompletions = Math.max(0, maxCompletions - completionsToday);
      const opacity = daily.completed
        ? (showCompleted ? 0.38 : 0)
        : (isScheduled ? (maxCompletions > 1 ? Math.max(0.5, remainingCompletions / maxCompletions) : 1) : 0.4);
      const globalSizeMod = Math.max(0.5, Number(gs.dailiesState?.globalSizeModifier) || 1.0);
      const sizeScale = Math.max(0.5, (Number(daily.size) || 1) * globalSizeMod);

      let attributeColor = getAttributeColor(daily.attribute);
      if (activeColorFilter === 'streak' && visibleDailies.length > 0) {
        const curStreak = computeDailyStreak(daily.id);
        const norm = maxStreakVal > minStreakVal ? (curStreak - minStreakVal) / (maxStreakVal - minStreakVal) : 0.5;
        attributeColor = interpolateColor('#ef4444', '#a855f7', norm);
      } else if (activeColorFilter === 'completion') {
        let rate = typeof daily.completionRate === 'number' ? daily.completionRate : null;
        if (rate === null && typeof TaskManager !== 'undefined' && typeof TaskManager.computeDailyCompletionRate === 'function') {
          rate = TaskManager.computeDailyCompletionRate(daily.id);
        }
        if (rate === null) {
          rate = daily.completed ? 1.0 : (completionsToday / maxCompletions);
        }
        const norm = Math.max(0, Math.min(1, Number(rate) || 0));
        attributeColor = interpolateColor('#ef4444', '#a855f7', norm);
      } else if (activeColorFilter === 'rewards' && visibleDailies.length > 0) {
        const curReward = gs.config?.taskRewards?.[daily.difficulty]?.ap || 10;
        const norm = maxRewardVal > minRewardVal ? (curReward - minRewardVal) / (maxRewardVal - minRewardVal) : 0.5;
        attributeColor = interpolateColor('#ef4444', '#a855f7', norm);
      } else if (activeColorFilter === 'safety') {
        const isSafe = !!(daily.streakSaver || daily.streakSaverActive || daily.hasStreakSaver);
        attributeColor = isSafe ? '#a855f7' : '#ef4444';
      } else if (focusModeActive && visibleDailies.length > 0) {
        const rankIndex = sortedByRate.findIndex(d => d.id === daily.id);
        const normRank = sortedByRate.length > 1 ? rankIndex / (sortedByRate.length - 1) : 1.0;
        const c = Math.round(normRank * 255);
        const toHex = (val) => val.toString(16).padStart(2, '0');
        const hexVal = toHex(c);
        attributeColor = `#${hexVal}${hexVal}${hexVal}`;
      }

      const textColor = getTextColorForHex(attributeColor);
      const streakClass = streak > 0 ? 'is-positive' : streak < 0 ? 'is-negative' : 'is-neutral';
      const progressText = daily.locked ? 'LOCKED' : `${completionsToday}/${maxCompletions}`;
      const completedVisibleClass = daily.completed && showCompleted ? 'is-completed-visible' : '';
      const eventTargetClass = eventTargets.includes(daily.id) ? 'task-event-target' : '';
      // Linear streak saturation: lowest -3 (0 saturation), highest 21 (1.0 saturation)
      const sVal = Number(streak) || 0;
      let streakSat = 0;
      if (activeColorFilter !== 'regular') {
        streakSat = 1;
      } else if (sVal <= -3) {
        streakSat = 0;
      } else if (sVal >= 21) {
        streakSat = 1;
      } else {
        const norm = (sVal + 3) / 24; // linear from -3 to 21
        streakSat = +norm.toFixed(3);
      }
      const particleCount = (streak > 0 && !focusModeActive) ? Math.min(streak, 10) : 0;

      // Check for surplus multiplier indicator
      let surplusIndicator = '';
      if (daily.dailySurplusEnabled) {
        const milestones = Array.isArray(daily.surplusMilestones) ? daily.surplusMilestones : [];
        let milestonesReached = 0;
        milestones.forEach(m => {
          if (streak >= m.streak) {
            milestonesReached++;
          }
        });
        if (milestonesReached > 0) {
          const mult = Math.pow(1.5, milestonesReached);
          surplusIndicator = '<span class="task-surplus-indicator" title="Streak Multiplier Active: ' + mult.toFixed(2) + 'x" style="position: absolute; bottom: 4px; left: 4px; font-size: 8px; color: #ffd700; font-family: monospace; z-index: 2; text-shadow: 1px 1px 0px #000; letter-spacing: -0.5px;">⚡' + mult.toFixed(2) + 'x</span>';
        }
      }

      let unscheduledIndicator = '';
      if (!isScheduled) {
        let text = daily.repeatMode === 'weekly' ? 'Weekly' : daily.repeatMode === 'interval' ? 'Interval' : 'Unscheduled';
        unscheduledIndicator = '<span style="position:absolute;top:-6px;left:50%;transform:translateX(-50%);background:var(--accent-gold);color:#000;font-size:7px;padding:2px 4px;border-radius:4px;z-index:3;font-weight:bold;white-space:nowrap;">' + text + '</span>';
      }

      const focusBorderStyle = focusModeActive ? '--task-border-color:#a855f7 !important;' : '';

      if (!daily.completed && !focusModeActive && daily.locked) {
        html += '<div class="task-daily-lock-badge" data-daily-id="' + daily.id + '" title="Locked Daily" style="position: absolute; z-index: 1000; cursor: pointer; user-select: none; font-size: 11px; display: flex; align-items: center; justify-content: center; width: 20px; height: 20px; background: rgba(0,0,0,0.7); border-radius: 50%; border: 1px solid #ff5a5a; color: #fff;">🔒</div>';
      }
      html += '<div class="task-daily-streak-badge ' + streakClass + '" data-daily-id="' + daily.id + '" title="Streak">' + streak + '</div>';
      html += '<div class="shape-task shape-' + this.shapeClassForDifficulty(daily.difficulty) + ' task-clickable task-card-daily ' + eventTargetClass + ' ' + (daily.completed ? 'completed ' + completedVisibleClass : '') + (daily.locked ? 'locked ' : '') + (daily.bloodOathActive && !focusModeActive ? ' blood-oath-active' : '') + '" data-id="' + daily.id + '" data-type="daily" data-size-scale="' + sizeScale + '" tabindex="0" data-attribute="' + (daily.attribute || '') + '" data-difficulty="' + (daily.difficulty || '') + '" style="--task-accent:' + attributeColor + ';--task-accent-strong:' + shadeColor(attributeColor, -20) + ';--task-ink:' + textColor + ';--streak-sat:' + streakSat + ';opacity:' + opacity + ';transform:scale(' + sizeScale + ');transform-origin:top left;touch-action:none;' + focusBorderStyle + '">';
      html += '<div class="hold-progress-overlay"></div>';
      if (daily.difficulty === 'Ultra') {
      }
      if (daily.bloodOathActive && !focusModeActive) {
        html += '<div class="blood-oath-fire-container">';
        html += '<div class="flame-square"></div><div class="flame-square"></div><div class="flame-square"></div><div class="flame-square"></div>';
        html += '<div class="flame-square"></div><div class="flame-square"></div><div class="flame-square"></div><div class="flame-square"></div>';
        html += '</div>';
      }
      html += '<div class="task-shape-difficulty">' + (daily.difficulty || '') + '</div>';
      html += '<div class="task-shape-name">' + (daily.name || '') + (daily.locked ? ' 🔒' : '') + '</div>';
      html += '<div class="task-shape-attr">' + (daily.attribute || '') + '</div>';
      html += '<div class="task-shape-progress">' + progressText + '</div>';
      if (surplusIndicator) html += surplusIndicator;
      if (unscheduledIndicator) html += unscheduledIndicator;
      // Streak particles: count scales with positive streak (deterministic positions, no Math.random)
      for (let _pi = 0; _pi < particleCount; _pi++) {
        const pDelay = (_pi * 0.22 + (_pi * 17 % 7) * 0.07).toFixed(2);
        const pX = (12 + (_pi * 31 + 11) % 76).toFixed(1);
        html += '<span class="streak-particle" style="--p-delay:' + pDelay + 's;--p-x:' + pX + '%;"></span>';
      }

      html += '</div>';
    });
    container.innerHTML = html;


    const completeDayBtn = document.getElementById('completeDayBtn');
    if (completeDayBtn) {
      completeDayBtn.textContent = 'Complete Day';
      completeDayBtn.classList.remove('active');
    }

    this.bindTaskInteractions();
    this.bindDailyBoardInteractions();
    this.positionDailyCards();
    this.renderDailyNotes();
    this.updateRunCompletionGraph();
    this.startUltraSkullEmitters();
  }

  // ============================================================
  // ULTRA SKULL PARTICLE EMITTER
  // Spawns skull silhouettes drifting in random directions around
  // Ultra daily/todo cards. Uses a single shared rAF loop.
  // ============================================================
  static _ultraSkullRAF = null;
  static _ultraSkulls = [];
  static _ultraSkullIntervals = [];
  static _ultraSkullRetry = null;

  static stopUltraSkullEmitters() {
    if (UIManager._ultraSkullRAF) { cancelAnimationFrame(UIManager._ultraSkullRAF); UIManager._ultraSkullRAF = null; }
    UIManager._ultraSkulls.forEach(s => { try { s.el.remove(); } catch(e) {} });
    UIManager._ultraSkulls = [];
    UIManager._ultraSkullIntervals.forEach(id => clearInterval(id));
    UIManager._ultraSkullIntervals = [];
    if (UIManager._ultraSkullRetry) { clearTimeout(UIManager._ultraSkullRetry); UIManager._ultraSkullRetry = null; }
  }

  static startUltraSkullEmitters() {
    UIManager.stopUltraSkullEmitters();

    const cards = document.querySelectorAll(
      '.task-card-daily[data-difficulty="Ultra"]:not(.completed):not(.is-completed-visible),' +
      '.task-card-todo[data-difficulty="Ultra"]:not(.completed)'
    );
    if (!cards.length) return;
    
    // Disable heavy skull emitter loop on mobile/low-power
    if (typeof AnimationRuntime !== 'undefined' && AnimationRuntime.lowPower) return;

    // Check if any card has size — if all are zero, panel probably isn't open yet, retry later
    let anyVisible = false;
    cards.forEach(c => { if (c.getBoundingClientRect().width > 0) anyVisible = true; });
    if (!anyVisible) {
      UIManager._ultraSkullRetry = setTimeout(() => UIManager.startUltraSkullEmitters(), 500);
      return;
    }

    const maxPerCard = 32;
    const spawnMs = 112.5;

    cards.forEach(card => {
      const spawn = () => {
        if (!document.body.contains(card)) return;
        const r = card.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return;
        const alive = UIManager._ultraSkulls.filter(s => s.card === card).length;
        if (alive >= maxPerCard) return;

        const el = document.createElement('div');
        el.textContent = '☠';
        const accent = getComputedStyle(card).getPropertyValue('--task-accent').trim() || '#9933ff';
        const sz = 9 + Math.random() * 5;
        el.style.cssText = 'position:absolute;font-size:' + sz + 'px;color:' + accent +
          ';pointer-events:none;z-index:1;opacity:0;will-change:transform,opacity;font-weight:900;-webkit-text-stroke:1.2px ' + accent + ';text-shadow:0 0 5px ' + accent + ', 0 0 10px ' + accent + ';';
        card.parentNode.appendChild(el);

        const angle = Math.random() * Math.PI * 2;
        const speed = 0.25 + Math.random() * 0.45;
        UIManager._ultraSkulls.push({
          el, card,
          ox: 0.2 + Math.random() * 0.6,
          oy: 0.2 + Math.random() * 0.6,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          rot: Math.random() * 360,
          rs: -1.5 + Math.random() * 3,
          t: 0,
          maxT: 110 + Math.random() * 70
        });
      };

      spawn();
      UIManager._ultraSkullIntervals.push(setInterval(spawn, spawnMs));
    });

    const tick = () => {
      const cardRects = new Map();
      const activeCards = new Set();
      for (let i = 0; i < UIManager._ultraSkulls.length; i++) {
        const card = UIManager._ultraSkulls[i].card;
        if (document.body.contains(card)) {
          activeCards.add(card);
        }
      }
      activeCards.forEach(card => {
        const parent = card.parentNode;
        if (parent) {
          const parentRect = parent.getBoundingClientRect();
          const cardRect = card.getBoundingClientRect();
          cardRects.set(card, {
            parentLeft: parentRect.left,
            parentTop: parentRect.top,
            parentScrollLeft: parent.scrollLeft || 0,
            parentScrollTop: parent.scrollTop || 0,
            cardLeft: cardRect.left,
            cardTop: cardRect.top,
            cardWidth: cardRect.width,
            cardHeight: cardRect.height
          });
        }
      });

      for (let i = UIManager._ultraSkulls.length - 1; i >= 0; i--) {
        const s = UIManager._ultraSkulls[i];
        if (!document.body.contains(s.card)) {
          try { s.el.remove(); } catch(e) {}
          UIManager._ultraSkulls.splice(i, 1);
          continue;
        }
        s.t++;
        const p = s.t / s.maxT;
        const info = cardRects.get(s.card);
        if (!info || info.cardWidth === 0) { continue; }
        const ox_rel = info.cardLeft - info.parentLeft + info.parentScrollLeft;
        const oy_rel = info.cardTop - info.parentTop + info.parentScrollTop;
        const bx = ox_rel + info.cardWidth * s.ox + s.vx * s.t;
        const by = oy_rel + info.cardHeight * s.oy + s.vy * s.t;
        s.rot += s.rs;
        const op = p < 0.15 ? (p / 0.15) : p > 0.65 ? ((1 - p) / 0.35) : 1.0;
        const sc = 0.5 + 0.5 * Math.sin(p * Math.PI);
        s.el.style.transform = 'translate3d(' + bx + 'px,' + by + 'px,0) rotate(' + s.rot + 'deg) scale(' + sc + ')';
        s.el.style.opacity = op;
        if (s.t >= s.maxT) {
          try { s.el.remove(); } catch(e) {}
          UIManager._ultraSkulls.splice(i, 1);
        }
      }
      if (UIManager._ultraSkulls.length > 0 || UIManager._ultraSkullIntervals.length > 0) {
        UIManager._ultraSkullRAF = requestAnimationFrame(tick);
      } else {
        UIManager._ultraSkullRAF = null;
      }
    };
    UIManager._ultraSkullRAF = requestAnimationFrame(tick);
  }

  static getDailyBoardMetrics() {
    const board = document.getElementById('dailiesList');
    if (!board) return null;

    const panel = document.getElementById('dailiesPanel');
    if (!panel || !panel.classList.contains('open')) return null;

    const rect = board.getBoundingClientRect();
    return {
      board,
      rect,
      width: Math.max(1, rect.width),
      height: Math.max(1, rect.height)
    };
  }

  static getDailyCardSize() {
    const board = document.getElementById('dailiesList');
    const rect = board?.getBoundingClientRect();
    const width = rect?.width || window.innerWidth || 360;
    const height = rect?.height || window.innerHeight || 640;
    const minimumSize = window.innerWidth <= 700 ? 126 : 116;
    const size = Math.round(Math.max(minimumSize, Math.min(168, Math.min(width, height) * 0.28)));
    return { width: size, height: size };
  }

  static shapeClassForDifficulty(difficulty) {
    const normalized = String(difficulty || '').toLowerCase();
    if (normalized === 'easy') return 'easy';
    if (normalized === 'medium') return 'medium';
    if (normalized === 'hard') return 'hard';
    return 'ultra';
  }

  static clampDailyLayout(layout, metrics, tileSize) {
    const maxX = Math.max(0, 100 - ((tileSize.width / metrics.width) * 100));
    const maxY = Math.max(0, 100 - ((tileSize.height / metrics.height) * 100));
    let x = Number(layout?.x);
    let y = Number(layout?.y);
    if (isNaN(x) || !isFinite(x) || x < 0 || x > 100) x = 0;
    if (isNaN(y) || !isFinite(y) || y < 0 || y > 100) y = 0;
    return {
      x: Math.max(0, Math.min(maxX, x)),
      y: Math.max(0, Math.min(maxY, y))
    };
  }

  static getDefaultDailyLayout(index, metrics, tileSize) {
    const padding = 12;
    const gap = 10;
    const cols = Math.max(1, Math.floor((metrics.width - (padding * 2) + gap) / (tileSize.width + gap)));
    const col = index % cols;
    const row = Math.floor(index / cols);
    const xPx = Math.min(Math.max(0, metrics.width - tileSize.width - padding), padding + (col * (tileSize.width + gap)));
    const yPx = padding + (row * (tileSize.height + gap));
    return {
      x: (xPx / metrics.width) * 100,
      y: (yPx / metrics.height) * 100
    };
  }

  static positionDailyCards() {
    const metrics = this.getDailyBoardMetrics();
    if (!metrics) return;

    const dailies = TaskManager.getAllDailies();
    const tileSize = this.getDailyCardSize();
    let maxBottomPx = 0;

    dailies.forEach((daily, index) => {
      const card = metrics.board.querySelector(`.task-card-daily[data-id="${daily.id}"]`);
      if (!card) return;
      const streak = metrics.board.querySelector(`.task-daily-streak-badge[data-daily-id="${daily.id}"]`);

      const layout = daily.layout
        ? this.clampDailyLayout(daily.layout, metrics, tileSize)
        : this.getDefaultDailyLayout(index, metrics, tileSize);

      const topPx = (layout.y / 100) * metrics.height;
      const bottomPx = topPx + tileSize.height;
      if (bottomPx > maxBottomPx) maxBottomPx = bottomPx;

      card.style.width = `${tileSize.width}px`;
      const _gs = getGameState();
      const globalSizeMod = Math.max(0.5, Number(_gs.dailiesState?.globalSizeModifier) || 1.0);
      const computedScale = Math.max(0.5, (Number(daily.size) || 1) * globalSizeMod);
      card.dataset.sizeScale = String(computedScale);
      if (!card.classList.contains('just-completed')) {
        card.style.transform = `scale(${computedScale})`;
      }
      card.style.left = `${layout.x}%`;
      card.style.top = `${layout.y}%`;

      if (streak) {
        const cardRect = card.getBoundingClientRect();
        const boardRect = metrics.board.getBoundingClientRect();
        const offset = Math.max(12, Math.round(cardRect.width * 0.12));
        streak.style.left = `${cardRect.left - boardRect.left + (cardRect.width / 2)}px`;
        streak.style.top = `${cardRect.top - boardRect.top - offset}px`;
      }
      const lockBadge = metrics.board.querySelector(`.task-daily-lock-badge[data-daily-id="${daily.id}"]`);
      if (lockBadge) {
        const cardRect = card.getBoundingClientRect();
        const boardRect = metrics.board.getBoundingClientRect();
        const offset = Math.max(12, Math.round(cardRect.width * 0.12));
        lockBadge.style.left = `${cardRect.left - boardRect.left + (cardRect.width / 2) + 12}px`;
        lockBadge.style.top = `${cardRect.top - boardRect.top - offset - 2}px`;
      }
    });

    if (maxBottomPx > 0) {
      metrics.board.style.minHeight = `${Math.max(metrics.height, maxBottomPx + 40)}px`;
    }

    this.drawDailyConnections();
  }

  static drawDailyConnections() {
    const board = document.getElementById('dailiesList');
    if (!board) return;

    const panel = document.getElementById('dailiesPanel');
    if (!panel || !panel.classList.contains('open')) {
      const existingSvg = document.getElementById('dailiesConnectionsSvg');
      if (existingSvg) existingSvg.remove();
      return;
    }

    const state = getGameState();
    const showDailyConnections = !!state.systemState?.taskListFilters?.showDailyConnections;

    let svg = document.getElementById('dailiesConnectionsSvg');
    if (!showDailyConnections) {
      if (svg) svg.remove();
      return;
    }

    if (!svg) {
      svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.id = 'dailiesConnectionsSvg';
      svg.style.position = 'absolute';
      svg.style.top = '0';
      svg.style.left = '0';
      svg.style.width = '100%';
      svg.style.height = '100%';
      svg.style.pointerEvents = 'none';
      svg.style.zIndex = '0';
      board.insertBefore(svg, board.firstChild);
    } else {
      svg.innerHTML = '';
    }

    const cards = Array.from(board.querySelectorAll('.task-card-daily'));
    if (cards.length < 2) return;

    const boardRect = board.getBoundingClientRect();

    const cardCenters = cards.map(card => {
      const cardRect = card.getBoundingClientRect();
      const x = cardRect.left - boardRect.left + (cardRect.width / 2) + board.scrollLeft;
      const y = cardRect.top - boardRect.top + (cardRect.height / 2) + board.scrollTop;
      return {
        id: card.dataset.id,
        element: card,
        x,
        y
      };
    });

    const drawn = new Set();
    cardCenters.forEach(current => {
      const targets = cardCenters
        .filter(other => other.id !== current.id)
        .map(other => {
          const dx = other.x - current.x;
          const dy = other.y - current.y;
          const dist = Math.hypot(dx, dy);
          return { card: other, dist };
        });

      targets.sort((a, b) => a.dist - b.dist);

      const closest = targets.slice(0, 3);

      closest.forEach(target => {
        const pairKey = [current.id, target.card.id].sort().join('-');
        if (drawn.has(pairKey)) return;
        drawn.add(pairKey);

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', String(current.x));
        line.setAttribute('y1', String(current.y));
        line.setAttribute('x2', String(target.card.x));
        line.setAttribute('y2', String(target.card.y));
        line.setAttribute('class', 'daily-connection-line');
        svg.appendChild(line);
      });
    });

    const cardCentersWithRate = cardCenters.map((cc, index) => {
      const dailyObj = state.dailiesState?.dailies?.find(d => d.id === cc.id);
      const rate = dailyObj ? (dailyObj.completionRate || 0) : 0;
      return { ...cc, rate, index };
    });

    cardCentersWithRate.sort((a, b) => {
      if (b.rate !== a.rate) {
        return b.rate - a.rate;
      }
      return a.index - b.index;
    });

    for (let i = 0; i < cardCentersWithRate.length - 1; i++) {
      const current = cardCentersWithRate[i];
      const next = cardCentersWithRate[i + 1];

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', String(current.x));
      line.setAttribute('y1', String(current.y));
      line.setAttribute('x2', String(next.x));
      line.setAttribute('y2', String(next.y));
      line.setAttribute('class', 'daily-completion-connection-line');
      svg.appendChild(line);
    }
  }

  static renderDailyNotes() {
    const state = getGameState();
    const board = document.getElementById('dailiesList');
    if (!board) return;

    const notes = Array.isArray(state.getDailyNotes?.()) ? state.getDailyNotes() : [];
    const existingNotes = new Map(Array.from(board.querySelectorAll('.daily-note-card, .daily-rect-card')).map((note) => [String(note.dataset.noteId), note]));
    const activeIds = new Set();

    notes.forEach((noteData, index) => {
      if (!noteData) return;
      const noteId = String(noteData.id);
      activeIds.add(noteId);

      let noteEl = existingNotes.get(noteId);
      const targetType = noteData.type || 'note';
      
      if (!noteEl) {
        noteEl = document.createElement('div');
        noteEl.dataset.noteId = noteId;
        board.appendChild(noteEl);
      }

      noteEl.className = targetType === 'rect' ? 'daily-rect-card' : 'daily-note-card';
      noteEl.style.left = `${Number.isFinite(Number(noteData.x)) ? Number(noteData.x) : 12}%`;
      noteEl.style.top = `${Number.isFinite(Number(noteData.y)) ? Number(noteData.y) : 12}%`;
      noteEl.style.zIndex = targetType === 'rect' ? String(1 + index) : String(40 + index);

      if (targetType === 'rect') {
        if (noteData.width) {
          noteEl.style.width = `${noteData.width}px`;
        } else {
          noteEl.style.width = '150px';
        }
        if (noteData.height) {
          noteEl.style.height = `${noteData.height}px`;
        } else {
          noteEl.style.height = '100px';
        }
      } else {
        noteEl.style.width = '';
        noteEl.style.height = '';
      }

      const currentType = noteEl.dataset.type;
      if (currentType !== targetType) {
        noteEl.dataset.type = targetType;
        noteEl.removeAttribute('data-bound');
        
        if (targetType === 'rect') {
          noteEl.innerHTML = `
            <button class="daily-note-delete" type="button" aria-label="Delete rectangle">✕</button>
            <div class="daily-rect-resizer"></div>
          `;
        } else {
          noteEl.innerHTML = `
            <button class="daily-note-delete" type="button" aria-label="Delete note">✕</button>
            <div class="daily-note-text" contenteditable="false" spellcheck="false"></div>
          `;
        }
      }

      const editMode = !!state.systemState?.taskListFilters?.editModeDailies;
      const deleteBtn = noteEl.querySelector('.daily-note-delete');
      if (deleteBtn) {
        deleteBtn.style.display = editMode ? 'block' : 'none';
      }

      if (!noteEl.dataset.bound) {
        noteEl.dataset.bound = '1';

        if (deleteBtn) {
          deleteBtn.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            state.removeDailyNote?.(noteId);
            this.renderDailyNotes();
          });
        }

        const resizer = noteEl.querySelector('.daily-rect-resizer');
        if (resizer) {
          resizer.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const startW = noteEl.offsetWidth;
            const startH = noteEl.offsetHeight;
            const startX = e.clientX;
            const startY = e.clientY;

            const onResizeMove = (moveEvent) => {
              const deltaX = moveEvent.clientX - startX;
              const deltaY = moveEvent.clientY - startY;
              const newW = Math.max(40, startW + deltaX);
              const newH = Math.max(40, startH + deltaY);
              noteEl.style.width = `${newW}px`;
              noteEl.style.height = `${newH}px`;
            };

            const onResizeUp = () => {
              document.removeEventListener('pointermove', onResizeMove);
              document.removeEventListener('pointerup', onResizeUp);
              state.updateDailyNote?.(noteId, {
                width: noteEl.offsetWidth,
                height: noteEl.offsetHeight
              });
            };

            document.addEventListener('pointermove', onResizeMove);
            document.addEventListener('pointerup', onResizeUp);
          });
        }

        const textEl = noteEl.querySelector('.daily-note-text');
        if (textEl) {
          textEl.addEventListener('input', () => {
            state.updateDailyNote?.(noteId, { text: textEl.innerText || '' });
          });
          textEl.addEventListener('blur', () => {
            state.updateDailyNote?.(noteId, { text: textEl.innerText || '' });
            textEl.contentEditable = 'false';
            noteEl.classList.remove('editing');
          });
        }

        noteEl.addEventListener('pointerdown', (event) => {
          if (event.target.closest('.daily-note-delete')) return;
          if (event.target.closest('.daily-rect-resizer')) return;
          if (event.target.closest('button')) return;
          if (event.button !== 0) return;

          const textEl = noteEl.querySelector('.daily-note-text');
          if (noteEl.classList.contains('editing') && event.target.closest('.daily-note-text')) {
            return;
          }

          event.preventDefault();

          let isDragging = false;
          const startX = event.clientX;
          const startY = event.clientY;

          try { noteEl.setPointerCapture(event.pointerId); } catch (error) { }

          const noteRect = noteEl.getBoundingClientRect();
          const boardRect = board.getBoundingClientRect();
          const startLeftPx = ((Number(noteData.x) || 0) / 100) * boardRect.width;
          const startTopPx = ((Number(noteData.y) || 0) / 100) * boardRect.height;

          const dragState = {
            pointerId: event.pointerId,
            boardRect,
            noteWidth: noteRect.width,
            noteHeight: noteRect.height,
            offsetX: event.clientX - (boardRect.left + startLeftPx),
            offsetY: event.clientY - (boardRect.top + startTopPx),
            moved: false,
            startX: event.clientX,
            startY: event.clientY,
            noteId,
            nextX: Number(noteData.x) || 0,
            nextY: Number(noteData.y) || 0
          };

          const onMove = (moveEvent) => {
            if (moveEvent.pointerId !== event.pointerId) return;
            if (moveEvent.clientX === 0 && moveEvent.clientY === 0) return;

            const dist = Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY);
            if (!isDragging) {
              if (dist > 5) {
                isDragging = true;
                noteEl.classList.add('dragging');
                if (textEl && noteEl.classList.contains('editing')) {
                  textEl.blur();
                }
              } else {
                return;
              }
            }

            const boardNow = board.getBoundingClientRect();
            const nextLeftPx = Math.max(0, Math.min(boardNow.width - dragState.noteWidth, moveEvent.clientX - boardNow.left - dragState.offsetX));
            const nextTopPx = Math.max(0, Math.min(boardNow.height - dragState.noteHeight, moveEvent.clientY - boardNow.top - dragState.offsetY));

            dragState.moved = true;
            dragState.nextX = (nextLeftPx / Math.max(1, boardNow.width)) * 100;
            dragState.nextY = (nextTopPx / Math.max(1, boardNow.height)) * 100;
            noteEl.style.left = `${dragState.nextX}%`;
            noteEl.style.top = `${dragState.nextY}%`;
          };

          const onUp = (upEvent) => {
            if (upEvent.pointerId !== event.pointerId) return;
            cleanup();

            if (isDragging) {
              noteEl.classList.remove('dragging');
              if (dragState.moved) {
                state.moveDailyNote?.(noteId, { x: dragState.nextX, y: dragState.nextY });
              }
            } else if (targetType !== 'rect') {
              if (noteEl.classList.contains('selected')) {
                if (textEl) {
                  textEl.contentEditable = 'true';
                  noteEl.classList.add('editing');
                  textEl.focus();
                  try {
                    const range = document.createRange();
                    range.selectNodeContents(textEl);
                    range.collapse(false);
                    const selection = window.getSelection();
                    selection.removeAllRanges();
                    selection.addRange(range);
                  } catch (err) { }
                }
              } else {
                document.querySelectorAll('.daily-note-card, .todo-note-card').forEach(el => el.classList.remove('selected'));
                noteEl.classList.add('selected');
              }
            }
          };

          const cleanup = () => {
            try { noteEl.releasePointerCapture(event.pointerId); } catch (error) { }
            document.removeEventListener('pointermove', onMove);
            document.removeEventListener('pointerup', onUp);
            document.removeEventListener('pointercancel', onUp);
          };

          document.addEventListener('pointermove', onMove);
          document.addEventListener('pointerup', onUp);
          document.addEventListener('pointercancel', onUp);
        });
      }

      const textEl = noteEl.querySelector('.daily-note-text');
      if (textEl) {
        const nextText = String(noteData.text || '');
        if ((textEl.innerText || '').trimEnd() !== nextText.trimEnd() && document.activeElement !== textEl) {
          textEl.textContent = nextText;
        }

        if (String(this._focusDailyNoteId || '') === noteId) {
          this._focusDailyNoteId = null;
          textEl.contentEditable = 'true';
          noteEl.classList.add('editing');
          setTimeout(() => {
            try {
              textEl.focus();
              const range = document.createRange();
              range.selectNodeContents(textEl);
              range.collapse(false);
              const selection = window.getSelection();
              selection.removeAllRanges();
              selection.addRange(range);
            } catch (error) { }
          }, 0);
        }
      }
    });

    existingNotes.forEach((noteEl, noteId) => {
      if (!activeIds.has(noteId)) {
        noteEl.remove();
      }
    });
  }

  static renderTodoNotes() {
    const state = getGameState();
    const board = document.getElementById('todosList');
    if (!board) return;

    const orbitLayer = document.getElementById('todoOrbitNodesLayer') || document.getElementById('todoOrbitCanvasContainer') || board;
    const notes = Array.isArray(state.getTodoNotes?.()) ? state.getTodoNotes() : [];
    const existingNotes = new Map(Array.from(document.querySelectorAll('.todo-note-card')).map((note) => [String(note.dataset.noteId), note]));
    const activeIds = new Set();

    notes.forEach((noteData, index) => {
      if (!noteData) return;
      const noteId = String(noteData.id);
      activeIds.add(noteId);

      let noteEl = existingNotes.get(noteId);
      if (!noteEl) {
        noteEl = document.createElement('div');
        noteEl.dataset.noteId = noteId;
        orbitLayer.appendChild(noteEl);
      } else if (noteEl.parentElement !== orbitLayer) {
        orbitLayer.appendChild(noteEl);
      }

      // Configure class name & z-index
      noteEl.className = `todo-note-card sticker-${noteData.type || 'note'}`;
      noteEl.style.left = `${Number.isFinite(Number(noteData.x)) ? Number(noteData.x) : 12}%`;
      noteEl.style.top = `${Number.isFinite(Number(noteData.y)) ? Number(noteData.y) : 12}%`;
      noteEl.style.zIndex = String(40 + index);

      // Counter-scale so notes DO NOT change physical size when zooming
      const invScale = (1 / (this.orbitScale || 1)).toFixed(3);
      noteEl.style.transform = `scale(${invScale})`;
      noteEl.style.transformOrigin = 'center center';
      noteEl.style.top = `${Number.isFinite(Number(noteData.y)) ? Number(noteData.y) : 12}%`;
      noteEl.style.zIndex = String(40 + index);

      // Set dimensions if present
      if (noteData.width) {
        noteEl.style.width = `${noteData.width}px`;
      } else {
        noteEl.style.width = '';
      }
      if (noteData.height) {
        noteEl.style.height = `${noteData.height}px`;
      } else {
        noteEl.style.height = '';
      }

      // Build HTML for specific sticker types if it hasn't been set up yet
      const currentType = noteEl.dataset.type;
      const targetType = noteData.type || 'note';
      if (currentType !== targetType) {
        noteEl.dataset.type = targetType;
        noteEl.removeAttribute('data-bound'); // Rebind elements if type changes
        
        if (targetType === 'grid') {
          noteEl.innerHTML = `
            <button class="todo-note-delete" type="button" aria-label="Delete grid">✕</button>
            <div class="todo-sticker-title">📋 GRID BOARD</div>
            <div class="todo-grid-sticker-cols">
              <div class="todo-grid-col">
                <div class="todo-grid-col-title" style="color: var(--accent-copper);">TODO</div>
                <div class="todo-grid-col-content" data-col="0" contenteditable="true" spellcheck="false"></div>
              </div>
              <div class="todo-grid-col">
                <div class="todo-grid-col-title" style="color: var(--accent-gold);">DOING</div>
                <div class="todo-grid-col-content" data-col="1" contenteditable="true" spellcheck="false"></div>
              </div>
              <div class="todo-grid-col">
                <div class="todo-grid-col-title" style="color: #4ade80;">DONE</div>
                <div class="todo-grid-col-content" data-col="2" contenteditable="true" spellcheck="false"></div>
              </div>
            </div>
            <div class="todo-note-resizer"></div>
          `;
        } else if (targetType === 'arrow') {
          const w = noteData.width || 100;
          noteEl.innerHTML = `
            <button class="todo-note-delete" type="button" aria-label="Delete arrow">✕</button>
            <div class="todo-arrow-sticker-wrap" style="width: 100%; height: 100%; position: relative; overflow: visible;">
              <svg class="todo-arrow-svg" viewBox="0 0 ${w} 40" style="width: 100%; height: 100%; display: block; overflow: visible;">
                <defs>
                  <marker id="arrowhead-${noteId}" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill="var(--accent-gold)" />
                  </marker>
                </defs>
                <line class="arrow-line" x1="0" y1="20" x2="${w}" y2="20" stroke="var(--accent-gold)" stroke-width="6" marker-end="url(#arrowhead-${noteId})" />
              </svg>
            </div>
          `;
        } else if (targetType === 'calendar') {
          noteEl.innerHTML = `
            <button class="todo-note-delete" type="button" aria-label="Delete calendar">✕</button>
            <div class="todo-calendar-header">
              <div class="calendar-month-title"></div>
            </div>
            <div class="todo-calendar-grid">
              <div class="calendar-day-label">S</div>
              <div class="calendar-day-label">M</div>
              <div class="calendar-day-label">T</div>
              <div class="calendar-day-label">W</div>
              <div class="calendar-day-label">T</div>
              <div class="calendar-day-label">F</div>
              <div class="calendar-day-label">S</div>
            </div>
            <div class="todo-note-resizer"></div>
          `;
        } else {
          // Standard Text Note
          noteEl.innerHTML = `
            <button class="todo-note-delete" type="button" aria-label="Delete note">✕</button>
            <div class="todo-note-text" contenteditable="false" spellcheck="false"></div>
          `;
        }
      }

      // Populate content and values
      if (targetType === 'grid') {
        const parts = String(noteData.text || '').split('|');
        const cols = noteEl.querySelectorAll('.todo-grid-col-content');
        cols.forEach((colEl, i) => {
          const val = parts[i] || '';
          if (colEl.textContent !== val && document.activeElement !== colEl) {
            colEl.textContent = val;
          }
        });
      } else if (targetType === 'arrow') {
        const angle = Number(noteData.direction) || 0;
        noteEl.style.transform = `rotate(${angle}deg)`;
        noteEl.style.transformOrigin = 'left center';

        const line = noteEl.querySelector('.arrow-line');
        const w = noteData.width || 100;
        if (line) {
          line.setAttribute('x2', String(w));
        }
        const svg = noteEl.querySelector('.todo-arrow-svg');
        if (svg) {
          svg.setAttribute('viewBox', `0 0 ${w} 40`);
        }
      } else if (targetType === 'calendar') {
        const titleEl = noteEl.querySelector('.calendar-month-title');
        const gridEl = noteEl.querySelector('.todo-calendar-grid');
        if (titleEl && gridEl) {
          const now = new Date();
          const year = now.getFullYear();
          const month = now.getMonth();
          const firstDay = new Date(year, month, 1).getDay();
          const totalDays = new Date(year, month + 1, 0).getDate();
          const monthName = now.toLocaleString('default', { month: 'long' });

          titleEl.textContent = `${monthName.toUpperCase()} ${year}`;

          // Remove any existing day cells (keeping the labels)
          gridEl.querySelectorAll('.calendar-cell').forEach(el => el.remove());

          // Insert empty cells
          for (let i = 0; i < firstDay; i++) {
            const cell = document.createElement('div');
            cell.className = 'calendar-cell empty';
            gridEl.appendChild(cell);
          }
          // Insert day cells showing task progress
          const todos = TaskManager.getAllTodos();
          for (let day = 1; day <= totalDays; day++) {
            const dayStart = new Date(year, month, day, 0, 0, 0, 0).getTime();
            const dayEnd = new Date(year, month, day, 23, 59, 59, 999).getTime();
            const dayTodos = todos.filter(t => t.deadline && t.deadline >= dayStart && t.deadline <= dayEnd);
            const total = dayTodos.length;
            const completed = dayTodos.filter(t => t.completed).length;

            const cell = document.createElement('div');
            let cellClass = 'calendar-cell';
            if (day === now.getDate()) cellClass += ' today';
            
            let cellInner = `<span class="calendar-day-num">${day}</span>`;
            if (total > 0) {
              if (completed === total) {
                cellClass += ' tasks-all-completed';
                cellInner += `<span class="calendar-tasks-indicator completed">✓</span>`;
              } else {
                cellClass += ' tasks-pending';
                cellInner += `<span class="calendar-tasks-indicator pending">${completed}/${total}</span>`;
              }
            }
            cell.className = cellClass;
            cell.innerHTML = cellInner;
            gridEl.appendChild(cell);
          }
        }
      } else {
        const textEl = noteEl.querySelector('.todo-note-text');
        if (textEl) {
          const nextText = String(noteData.text || '');
          if (textEl.textContent !== nextText && document.activeElement !== textEl) {
            textEl.textContent = nextText;
          }
        }
      }

      // Bind events if not bound
      if (!noteEl.dataset.bound) {
        noteEl.dataset.bound = '1';

        const deleteBtn = noteEl.querySelector('.todo-note-delete');
        if (deleteBtn) {
          deleteBtn.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            state.removeTodoNote?.(noteId);
            this.renderTodoNotes();
          });
        }

        // Resizer event binding
        const resizer = noteEl.querySelector('.todo-note-resizer');
        if (resizer) {
          resizer.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const startW = noteEl.offsetWidth;
            const startH = noteEl.offsetHeight;
            const startX = e.clientX;
            const startY = e.clientY;

            const onResizeMove = (moveEvent) => {
              const deltaX = moveEvent.clientX - startX;
              const deltaY = moveEvent.clientY - startY;
              const newW = Math.max(120, startW + deltaX);
              const newH = Math.max(80, startH + deltaY);
              noteEl.style.width = `${newW}px`;
              noteEl.style.height = `${newH}px`;
            };

            const onResizeUp = () => {
              document.removeEventListener('pointermove', onResizeMove);
              document.removeEventListener('pointerup', onResizeUp);
              state.updateTodoNote?.(noteId, {
                width: noteEl.offsetWidth,
                height: noteEl.offsetHeight
              });
            };

            document.addEventListener('pointermove', onResizeMove);
            document.addEventListener('pointerup', onResizeUp);
          });
        }


        // Contenteditable bindings for standard note
        const textEl = noteEl.querySelector('.todo-note-text');
        if (textEl) {
          textEl.addEventListener('input', () => {
            state.updateTodoNote?.(noteId, { text: textEl.innerText || '' });
          });
          textEl.addEventListener('blur', () => {
            state.updateTodoNote?.(noteId, { text: textEl.innerText || '' });
            textEl.contentEditable = 'false';
            noteEl.classList.remove('editing');
          });
        }

        // Contenteditable bindings for grid columns
        const cols = noteEl.querySelectorAll('.todo-grid-col-content');
        cols.forEach((colEl) => {
          const updateGridState = () => {
            const vals = Array.from(noteEl.querySelectorAll('.todo-grid-col-content')).map(el => el.innerText || '');
            state.updateTodoNote?.(noteId, { text: vals.join('|') });
          };
          colEl.addEventListener('input', updateGridState);
          colEl.addEventListener('blur', updateGridState);
        });

        // Pointerdown dragging implementation
        noteEl.addEventListener('pointerdown', (event) => {
          if (event.target.closest('.todo-note-delete, .todo-note-resizer')) return;
          if (event.target.closest('button, input, select')) return;
          if (event.button !== 0) return;

          const textEl = noteEl.querySelector('.todo-note-text');
          if (noteEl.classList.contains('editing') && event.target.closest('.todo-note-text')) {
            return;
          }

          event.preventDefault();

          let isDragging = false;
          const startX = event.clientX;
          const startY = event.clientY;

          try { noteEl.setPointerCapture(event.pointerId); } catch (error) { }

          const noteRect = noteEl.getBoundingClientRect();
          const boardRect = board.getBoundingClientRect();
          const startLeftPx = ((Number(noteData.x) || 0) / 100) * boardRect.width;
          const startTopPx = ((Number(noteData.y) || 0) / 100) * boardRect.height;

          const dragState = {
            pointerId: event.pointerId,
            boardRect,
            noteWidth: noteRect.width,
            noteHeight: noteRect.height,
            offsetX: event.clientX - (boardRect.left + startLeftPx),
            offsetY: event.clientY - (boardRect.top + startTopPx),
            moved: false,
            startX: event.clientX,
            startY: event.clientY,
            noteId,
            nextX: Number(noteData.x) || 0,
            nextY: Number(noteData.y) || 0
          };

          const onMove = (moveEvent) => {
            if (moveEvent.pointerId !== event.pointerId) return;
            if (moveEvent.clientX === 0 && moveEvent.clientY === 0) return;

            const dist = Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY);
            if (!isDragging) {
              if (dist > 5) {
                isDragging = true;
                noteEl.classList.add('dragging');
                if (textEl && noteEl.classList.contains('editing')) {
                  textEl.blur();
                }
              } else {
                return;
              }
            }

            const boardNow = board.getBoundingClientRect();
            const nextLeftPx = Math.max(0, Math.min(boardNow.width - dragState.noteWidth, moveEvent.clientX - boardNow.left - dragState.offsetX));
            const nextTopPx = Math.max(0, Math.min(boardNow.height - dragState.noteHeight, moveEvent.clientY - boardNow.top - dragState.offsetY));

            dragState.moved = true;
            dragState.nextX = (nextLeftPx / Math.max(1, boardNow.width)) * 100;
            dragState.nextY = (nextTopPx / Math.max(1, boardNow.height)) * 100;
            noteEl.style.left = `${dragState.nextX}%`;
            noteEl.style.top = `${dragState.nextY}%`;
          };

          const onUp = (upEvent) => {
            if (upEvent.pointerId !== event.pointerId) return;
            cleanup();

            if (isDragging) {
              noteEl.classList.remove('dragging');
              if (dragState.moved) {
                state.moveTodoNote?.(noteId, { x: dragState.nextX, y: dragState.nextY });
              }
            } else {
              // Tap - select first, then edit on subsequent click
              if (noteEl.classList.contains('selected')) {
                if (textEl) {
                  textEl.contentEditable = 'true';
                  noteEl.classList.add('editing');
                  textEl.focus();
                  try {
                    const range = document.createRange();
                    range.selectNodeContents(textEl);
                    range.collapse(false);
                    const selection = window.getSelection();
                    selection.removeAllRanges();
                    selection.addRange(range);
                  } catch (err) { }
                }
              } else {
                document.querySelectorAll('.daily-note-card, .todo-note-card').forEach(el => el.classList.remove('selected'));
                noteEl.classList.add('selected');
              }
            }
          };

          const cleanup = () => {
            try { noteEl.releasePointerCapture(event.pointerId); } catch (error) { }
            document.removeEventListener('pointermove', onMove);
            document.removeEventListener('pointerup', onUp);
            document.removeEventListener('pointercancel', onUp);
          };

          document.addEventListener('pointermove', onMove);
          document.addEventListener('pointerup', onUp);
          document.addEventListener('pointercancel', onUp);
        });
      }

      // Initial focus for new notes
      const textEl = noteEl.querySelector('.todo-note-text');
      if (textEl && String(this._focusTodoNoteId || '') === noteId) {
        this._focusTodoNoteId = null;
        setTimeout(() => {
          try {
            textEl.focus();
            const range = document.createRange();
            range.selectNodeContents(textEl);
            range.collapse(false);
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
          } catch (error) { }
        }, 0);
      }
    });

    existingNotes.forEach((noteEl, noteId) => {
      if (!activeIds.has(noteId)) {
        noteEl.remove();
      }
    });
  }

  static bindDailyBoardInteractions() {
    const board = document.getElementById('dailiesList');
    if (!board || board.dataset.dragBound === '1') return;

    board.dataset.dragBound = '1';

    board.addEventListener('pointerdown', (event) => {
      if (UIManager.isDrawingRect) {
        if (event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        
        try { board.setPointerCapture(event.pointerId); } catch (err) {}
        
        const boardRect = board.getBoundingClientRect();
        const startX = event.clientX - boardRect.left + board.scrollLeft;
        const startY = event.clientY - boardRect.top + board.scrollTop;

        let previewRect = document.getElementById('rect-preview-div');
        if (!previewRect) {
          previewRect = document.createElement('div');
          previewRect.id = 'rect-preview-div';
          previewRect.style.position = 'absolute';
          previewRect.style.pointerEvents = 'none';
          previewRect.style.zIndex = '999';
          previewRect.style.border = '2px dashed var(--accent-gold)';
          previewRect.style.background = 'rgba(232, 184, 74, 0.15)';
          previewRect.style.left = `${startX}px`;
          previewRect.style.top = `${startY}px`;
          previewRect.style.width = '0px';
          previewRect.style.height = '0px';
          board.appendChild(previewRect);
        }

        const onDrawMove = (moveEvent) => {
          if (moveEvent.pointerId !== event.pointerId) return;
          const currentX = moveEvent.clientX - boardRect.left + board.scrollLeft;
          const currentY = moveEvent.clientY - boardRect.top + board.scrollTop;
          
          const x = Math.min(startX, currentX);
          const y = Math.min(startY, currentY);
          const width = Math.abs(currentX - startX);
          const height = Math.abs(currentY - startY);
          
          previewRect.style.left = `${x}px`;
          previewRect.style.top = `${y}px`;
          previewRect.style.width = `${width}px`;
          previewRect.style.height = `${height}px`;
        };

        const onDrawUp = (upEvent) => {
          if (upEvent.pointerId !== event.pointerId) return;
          try { board.releasePointerCapture(event.pointerId); } catch (err) {}
          
          document.removeEventListener('pointermove', onDrawMove);
          document.removeEventListener('pointerup', onDrawUp);
          
          const endX = upEvent.clientX - boardRect.left + board.scrollLeft;
          const endY = upEvent.clientY - boardRect.top + board.scrollTop;
          
          const x = Math.min(startX, endX);
          const y = Math.min(startY, endY);
          const width = Math.abs(endX - startX);
          const height = Math.abs(endY - startY);
          
          if (previewRect) previewRect.remove();

          if (width > 15 && height > 15) {
            const xPercent = (x / Math.max(1, board.scrollWidth)) * 100;
            const yPercent = (y / Math.max(1, board.scrollHeight)) * 100;

            const state = getGameState();
            state.addDailyNote?.('', { x: xPercent, y: yPercent }, 'rect', {
              width,
              height
            });
            UIManager.renderDailyNotes();
          }

          UIManager.isDrawingRect = false;
          board.classList.remove('drawing-rect-mode');
          const btn = document.getElementById('addDailyRectBtn');
          if (btn) btn.classList.remove('active');
        };

        document.addEventListener('pointermove', onDrawMove);
        document.addEventListener('pointerup', onDrawUp);
        return;
      }

      const card = event.target.closest('.task-card-daily');
      if (!card || !board.contains(card)) return;
      if (event.target.closest('button, input, textarea, select, label')) return;
      if (event.button !== 0) return;

      const dailyId = card.dataset.id;
      if (!dailyId) return;

      if (event.pointerType !== 'touch') {
        event.preventDefault();
      }

      try { card.setPointerCapture(event.pointerId); } catch (error) { }

      const boardRect = board.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();

      this.dailyDragState = {
        dailyId,
        card,
        board,
        pointerId: event.pointerId,
        offsetX: event.clientX - cardRect.left,
        offsetY: event.clientY - cardRect.top,
        moved: false,
        startX: event.clientX,
        startY: event.clientY
      };

      // Check double tap for mode actions
      const now = Date.now();
      const lastTap = Number(card.dataset.lastTapTime || 0);
      if (now - lastTap < 300) {
        card.dataset.doubleTapped = '1';
        card.dataset.lastTapTime = '0';
        
        const editModeDailies = !!getGameState().systemState?.taskListFilters?.editModeDailies;
        const lockModeDailies = !!getGameState().systemState?.taskListFilters?.lockModeDailies;
        const oathModeDailies = !!getGameState().systemState?.taskListFilters?.oathModeDailies;
        const timeModeDailies = !!getGameState().systemState?.taskListFilters?.timeModeDailies;

        if (timeModeDailies) {
          const task = TaskManager.getTaskById(dailyId);
          if (task) {
            UIManager.openFullscreenTimer(task, 'daily');
          }
        } else if (editModeDailies) {
          try { PopupsManager.showEditDaily(dailyId); } catch (error) { console.warn('Failed to open daily edit popup', error); }
        } else if (lockModeDailies) {
          const daily = getGameState().dailiesState.dailies.find(d => d.id === dailyId);
          if (daily) {
            if (daily.locked) {
              TaskManager.unlockDaily(dailyId);
            } else {
              TaskManager.lockDaily(dailyId);
            }
            this.scheduleUpdateDailiesList();
            getGameState().save();
          }
        } else if (oathModeDailies) {
          const success = TaskManager.toggleBloodOath(dailyId);
          if (success) {
            this.scheduleUpdateDailiesList();
            getGameState().save();
          }
        } else {
          // Default Mode: double tap to complete
          const daily = getGameState().dailiesState.dailies.find(d => d.id === dailyId);
          if (daily && daily.locked) {
            try {
              FloatingDamageNumber.show(event.clientX || window.innerWidth / 2, event.clientY || window.innerHeight / 2, 'LOCKED', { color: '#ff5a5a' });
              if (window.SoundManager) SoundManager.play('miss');
            } catch (e) {}
          } else {
            const res = TaskManager.completeDaily(dailyId);
            if (res && res.success) {
              try {
                card.classList.add('just-completed');
                card.style.transition = 'transform 100ms ease, filter 100ms ease, opacity 400ms ease';
                card.style.filter = 'brightness(10) contrast(1.5)';
                const sizeScale = Math.max(0.5, Number(card.dataset.sizeScale) || 1);
                card.style.transform = `scale(${sizeScale * 1.04})`;
                setTimeout(() => {
                  card.style.filter = '';
                  card.style.transform = `scale(${sizeScale})`;
                }, 100);

                UIManager.accelerateBackground(2.0, 2000);
                if (typeof navigator !== 'undefined' && navigator.vibrate) {
                  try { navigator.vibrate([15, 30, 45]); } catch (e) {}
                }
                const rect = card.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                if (res.isHeld || res.isMiss) {
                  try { if (window.SoundManager) SoundManager.play('miss'); } catch (e) {}
                  FloatingDamageNumber.show(centerX, Math.max(12, rect.top - 18), 'MISS', { color: '#ef4444', isMiss: true, scale: 1.3, duration: 2000 });
                } else {
                  if (res.isJackpot) {
                    try { if (window.SoundManager) SoundManager.play('crit'); } catch (e) {}
                    FloatingDamageNumber.show(centerX, Math.max(12, rect.top - 38), 'JACKPOT!', { className: 'rainbow-jackpot-text', scale: 1.5, duration: 2000 });
                  }
                  if (res.rewards && res.rewards.ap) {
                    UIManager.showDailyApReward(card, res.rewards.ap);
                  }
                  if (res.rewards && res.rewards.keys) {
                    UIManager.showDailyKeysReward(card, res.rewards.keys);
                  }
                  if (res.rewards && res.rewards.diamonds) {
                    UIManager.spawnDiamondFloatingPopup(centerX, centerY, res.rewards.diamonds);
                  }

                  const released = res.releasedHeld || res.releasedHeldRewards;
                  if (released && (released.ap > 0 || released.diamonds > 0 || released.keys > 0)) {
                    let offset = 48;
                    if (released.ap > 0) {
                      FloatingDamageNumber.show(centerX, Math.max(12, rect.top - offset), `+${Math.ceil(released.ap)} AP (Held)`, { color: '#f59e0b', scale: 1.25, duration: 2500, countUp: true });
                      offset += 24;
                    }
                    if (released.diamonds > 0) {
                      FloatingDamageNumber.show(centerX + 25, Math.max(12, rect.top - offset), `+${released.diamonds} 💎 (Held)`, { color: '#00e5ff', scale: 1.25, duration: 2500, countUp: true });
                      offset += 24;
                    }
                    if (released.keys > 0) {
                      FloatingDamageNumber.show(centerX, Math.max(12, rect.top - offset), `+${released.keys} Keys (Held) 🔑`, { color: '#f59e0b', scale: 1.25, duration: 2500, countUp: true });
                    }
                  }
                }
                const released = res.releasedHeld || res.releasedHeldRewards;
                let countUpDelay = 0;
                if (released && released.ap > 0) {
                  countUpDelay = Math.min(1200, Math.max(650, Math.ceil(released.ap) * 25));
                } else if (res.rewards && res.rewards.ap) {
                  countUpDelay = Math.min(1200, Math.max(650, Math.ceil(res.rewards.ap) * 25));
                }

                UIManager.applyTaskChargingEffect(card, countUpDelay, () => {
                  if (typeof RetroTaskCompleteAnimation !== 'undefined') {
                    RetroTaskCompleteAnimation.play(card);
                  }
                  const sizeScale = Math.max(0.5, Number(card.dataset.sizeScale) || 1);
                  card.style.transition = 'opacity 300ms ease, transform 300ms ease, filter 300ms ease';
                  card.style.opacity = '0';
                  card.style.transform = `scale(${sizeScale * 0.85})`;
                  setTimeout(() => {
                    this.scheduleUpdateDailiesList();
                  }, 300);
                });
              } catch (error) {
                this.scheduleUpdateDailiesList();
              }
              try { getGameState().save(); } catch (saveError) { }
              this.renderEnemies();
            }
          }
        }
        return;
      }
      card.dataset.lastTapTime = String(now);
    });

    const onMove = (event) => {
      const dragState = this.dailyDragState;
      if (!dragState || event.pointerId !== dragState.pointerId) return;
      if (event.clientX === 0 && event.clientY === 0) return;

      const boardRect = dragState.board.getBoundingClientRect();

      if (!dragState.moved) {
        const distance = Math.hypot(event.clientX - dragState.startX, event.clientY - dragState.startY);
        if (distance > 6) {
          dragState.moved = true;
          dragState.card.classList.add('dragging');
        }
      }

      if (dragState.moved) {
        const tileSize = this.getDailyCardSize();
        const maxLeft = Math.max(0, boardRect.width - tileSize.width);
        const maxTop = Math.max(0, boardRect.height - tileSize.height);
        const nextLeftPx = Math.max(0, Math.min(maxLeft, event.clientX - boardRect.left - dragState.offsetX));
        const nextTopPx = Math.max(0, Math.min(maxTop, event.clientY - boardRect.top - dragState.offsetY));

        dragState.card.style.left = `${(nextLeftPx / Math.max(1, boardRect.width)) * 100}%`;
        dragState.card.style.top = `${(nextTopPx / Math.max(1, boardRect.height)) * 100}%`;
        this.drawDailyConnections();
      }
    };

    const endDrag = (event) => {
      const dragState = this.dailyDragState;
      if (!dragState || (event.pointerId !== undefined && event.pointerId !== dragState.pointerId)) return;

      const card = dragState.card;
      const boardRect = dragState.board.getBoundingClientRect();
      const cardRect = dragState.card.getBoundingClientRect();
      dragState.card.classList.remove('dragging');
      try { dragState.card.releasePointerCapture(dragState.pointerId); } catch (error) { }

      if (dragState.moved) {
        const tileSize = this.getDailyCardSize();
        const layout = this.clampDailyLayout({
          x: ((cardRect.left - boardRect.left) / Math.max(1, boardRect.width)) * 100,
          y: ((cardRect.top - boardRect.top) / Math.max(1, boardRect.height)) * 100
        }, { width: Math.max(1, boardRect.width), height: Math.max(1, boardRect.height) }, tileSize);

        TaskManager.updateDailyLayout(dragState.dailyId, layout);
        try { getGameState().save(); } catch (error) { }
        this.dailyDragSuppressUntil = Date.now() + 250;
      } else {
        delete card.dataset.doubleTapped;
        delete card.dataset.holdCompleted;
      }

      this.dailyDragState = null;
      this.positionDailyCards();
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', endDrag);
    document.addEventListener('pointercancel', endDrag);

    board.addEventListener('dblclick', (event) => {
      const card = event.target.closest('.task-card-daily');
      if (!card) return;
      const dailyId = card.dataset.id;
      if (!dailyId) return;
      const editModeDailies = !!getGameState().systemState?.taskListFilters?.editModeDailies;
      const timeModeDailies = !!getGameState().systemState?.taskListFilters?.timeModeDailies;
      if (timeModeDailies) {
        const task = TaskManager.getTaskById(dailyId);
        if (task) {
          UIManager.openFullscreenTimer(task, 'daily');
        }
      } else if (editModeDailies) {
        if (typeof PopupsManager !== 'undefined' && PopupsManager.showEditDaily) {
          PopupsManager.showEditDaily(dailyId);
        }
      }
    });

    board.addEventListener('click', (event) => {
      const lockBadge = event.target.closest('.task-daily-lock-badge');
      if (lockBadge) {
        event.stopPropagation();
        event.preventDefault();
        const taskId = lockBadge.dataset.dailyId;
        console.log("[Board Click] Lock badge clicked. dailyId:", taskId);
        const daily = getGameState().dailiesState.dailies.find(d => d.id === taskId);
        if (daily) {
          if (daily.locked) {
            TaskManager.unlockDaily(taskId);
          } else {
            TaskManager.lockDaily(taskId);
          }
          this.scheduleUpdateDailiesList();
          getGameState().save();
        }
      }
    });
  }

  static getTodoBoardMetrics() {
    const board = document.getElementById('todosList');
    if (!board) return null;

    const panel = document.getElementById('todosPanel');
    if (!panel || !panel.classList.contains('open')) return null;

    const rect = board.getBoundingClientRect();
    return {
      board,
      rect,
      width: Math.max(1, rect.width),
      height: Math.max(1, rect.height)
    };
  }

  static getTodoCardSize() {
    const board = document.getElementById('todosList');
    const rect = board?.getBoundingClientRect();
    const width = rect?.width || window.innerWidth || 360;
    const height = rect?.height || window.innerHeight || 640;
    const minimumSize = window.innerWidth <= 700 ? 140 : 150;
    const size = Math.round(Math.max(minimumSize, Math.min(200, Math.min(width, height) * 0.32)));
    return { width: size, height: size };
  }

  static clampTodoLayout(layout, metrics, tileSize, hasHeader = false) {
    const minX = 0;
    const minY = 0;
    const maxX = Math.max(0, 100 - ((tileSize.width / metrics.width) * 100));
    const maxY = Math.max(0, 100 - ((tileSize.height / metrics.height) * 100));
    let x = Number(layout?.x);
    let y = Number(layout?.y);
    if (isNaN(x) || !isFinite(x)) x = 0;
    if (isNaN(y) || !isFinite(y)) y = 0;
    return {
      x: Math.max(minX, Math.min(maxX, x)),
      y: Math.max(minY, Math.min(maxY, y))
    };
  }

  static getDefaultTodoLayout(index, metrics, tileSize, hasHeader = false) {
    const boardWidth = metrics?.width || 800;
    const boardHeight = metrics?.height || 600;
    const cardW = tileSize?.width || 180;
    const cardH = tileSize?.height || 180;

    const cols = Math.max(1, Math.floor((boardWidth - 20) / (cardW + 15)));
    const col = index % cols;
    const row = Math.floor(index / cols);

    const xPx = 15 + col * (cardW + 15);
    const yPx = 15 + row * (cardH + 20);

    const xPct = Math.min(85, (xPx / boardWidth) * 100);
    const yPct = Math.min(85, (yPx / boardHeight) * 100);

    return { x: xPct, y: yPct };
  }

  static positionTodoCards() {
    // In Orbit mode, node positioning is handled dynamically by updateTodosList() along concentric deadline rings
    return;
  }

  static bindTodoBoardInteractions() {
    const board = document.getElementById('todosList');
    if (!board || board.dataset.dragBound === '1') return;

    board.dataset.dragBound = '1';

    board.addEventListener('dblclick', (event) => {
      const card = event.target.closest('.task-card-todo');
      if (!card) return;

      const todoId = card.dataset.id;
      if (!todoId) return;

      const mode = getGameState().systemState?.taskListFilters?.todoJoystickMode || 'done';

      if (mode === 'done') {
        const res = TaskManager.completeTodo(todoId);
        if (res && res.success) {
          card.style.transition = 'filter 150ms ease, opacity 400ms ease';
          card.style.filter = 'brightness(10) contrast(1.5)';
          const rect = card.getBoundingClientRect();

          if (res.isJackpot) {
            try { if (window.SoundManager) SoundManager.play('crit'); } catch (e) {}
            FloatingDamageNumber.show(rect.left + rect.width / 2, Math.max(12, rect.top - 38), 'JACKPOT!', { className: 'rainbow-jackpot-text', scale: 1.5, duration: 2000 });
          }
          if (res.rewards && res.rewards.ap) {
            FloatingDamageNumber.show(rect.left + rect.width / 2, Math.max(12, rect.top - 18), `+${Math.ceil(res.rewards.ap)} AP`, { color: UIManager.themeColor('--ap-gold', '#FFB33F'), cycleText: false });
          }
          if (res.rewards && res.rewards.diamonds) {
            UIManager.spawnDiamondFloatingPopup(rect.left + rect.width / 2, rect.top + rect.height / 2, res.rewards.diamonds);
          }
          if (typeof RetroTaskCompleteAnimation !== 'undefined') {
            RetroTaskCompleteAnimation.play(card);
          }
          setTimeout(() => {
            UIManager.updateTodosList();
          }, 200);
          try { getGameState().save(); } catch (e) {}
          UIManager.renderEnemies();
        }
      } else if (mode === 'edit') {
        if (typeof PopupsManager !== 'undefined' && PopupsManager.showEditTodo) {
          PopupsManager.showEditTodo(todoId);
        }
      } else if (mode === 'del') {
        const todo = TaskManager.getTaskById(todoId);
        const name = todo?.name || 'this to-do';
        if (confirm(`Delete "${name}"?`)) {
          TaskManager.removeTodo(todoId);
          try { getGameState().save(); } catch (e) {}
          UIManager.updateTodosList();
          UIManager.renderEnemies();
        }
      }
    });

    board.addEventListener('click', (event) => {
      const deadlineCard = event.target.closest('.todo-plain-deadline-num, .todo-massive-deadline-left, .todo-deadline-card-badge-top');
      if (deadlineCard) {
        event.stopPropagation();
        event.preventDefault();
        const todoId = deadlineCard.dataset.todoId;
        if (todoId && typeof PopupsManager !== 'undefined' && PopupsManager.showQuickDayPicker) {
          PopupsManager.showQuickDayPicker((newTs) => {
            TaskManager.editTodo(todoId, { deadline: newTs });
            UIManager.updateTodosList();
            try { getGameState().save(); } catch (e) {}
          });
        }
        return;
      }

      const existingWizard = document.querySelector('.floating-wizard');
      if (existingWizard) {
        if (Date.now() - (this.wizardOpenedTime || 0) < 300) {
          return;
        }
        if (!existingWizard.contains(event.target)) existingWizard.remove();
        return;
      }
      const card = event.target.closest('.task-card-todo');
      if (card && !event.target.closest('.todo-subtask-rect, .subtask-remove')) {
        document.querySelectorAll('.task-card-todo.selected').forEach(el => el.classList.remove('selected'));
        card.classList.add('selected');
      }
    });

    board.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;

      if (UIManager.isEraserActive) {
        event.preventDefault();
        event.stopPropagation();
        
        const eraseAt = (x, y) => {
          const target = document.elementFromPoint(x, y);
          if (!target) return;
          const card = target.closest('.task-card-todo');
          const note = target.closest('.todo-note-card');
          if (card) {
            const todoId = card.dataset.id;
            const state = getGameState();
            const idx = state.dailiesState.todos.findIndex(t => t.id === todoId);
            if (idx !== -1) {
              state.dailiesState.todos.splice(idx, 1);
              try { getGameState().save(); } catch (e) {}
              UIManager.updateTodosList();
              try { FloatingDamageNumber.show(x, y, 'Erased ✕', { color: '#ff4d4d' }); } catch (e) {}
            }
          } else if (note) {
            const noteId = note.dataset.noteId;
            if (noteId) {
              getGameState().removeTodoNote?.(noteId);
              try { getGameState().save(); } catch (e) {}
              UIManager.renderTodoNotes();
              try { FloatingDamageNumber.show(x, y, 'Erased ✕', { color: '#ff4d4d' }); } catch (e) {}
            }
          }
        };

        eraseAt(event.clientX, event.clientY);

        const onEraserMove = (moveEv) => {
          eraseAt(moveEv.clientX, moveEv.clientY);
        };
        const onEraserUp = () => {
          document.removeEventListener('pointermove', onEraserMove);
          document.removeEventListener('pointerup', onEraserUp);
        };
        document.addEventListener('pointermove', onEraserMove);
        document.addEventListener('pointerup', onEraserUp);
        return;
      }

      if (UIManager.isDrawingArrow) {
        event.preventDefault();
        event.stopPropagation();
        
        const boardRect = board.getBoundingClientRect();
        const startX = event.clientX - boardRect.left + board.scrollLeft;
        const startY = event.clientY - boardRect.top + board.scrollTop;

        let previewSvg = document.getElementById('arrow-preview-svg');
        if (!previewSvg) {
          previewSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          previewSvg.id = 'arrow-preview-svg';
          previewSvg.style.position = 'absolute';
          previewSvg.style.pointerEvents = 'none';
          previewSvg.style.zIndex = '999';
          previewSvg.style.width = `${board.scrollWidth}px`;
          previewSvg.style.height = `${board.scrollHeight}px`;
          previewSvg.style.left = '0';
          previewSvg.style.top = '0';
          previewSvg.innerHTML = `
            <defs>
              <marker id="preview-arrowhead" markerWidth="10" markerHeight="7" refX="0" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="var(--accent-gold)" />
              </marker>
            </defs>
            <line id="preview-arrow-line" stroke="var(--accent-gold)" stroke-width="6" marker-end="url(#preview-arrowhead)" />
          `;
          board.appendChild(previewSvg);
        }
        const line = previewSvg.querySelector('#preview-arrow-line');
        line.setAttribute('x1', String(startX));
        line.setAttribute('y1', String(startY));
        line.setAttribute('x2', String(startX));
        line.setAttribute('y2', String(startY));

        const onDrawMove = (moveEvent) => {
          const currentX = moveEvent.clientX - boardRect.left + board.scrollLeft;
          const currentY = moveEvent.clientY - boardRect.top + board.scrollTop;
          line.setAttribute('x2', String(currentX));
          line.setAttribute('y2', String(currentY));
        };

        const onDrawUp = (upEvent) => {
          document.removeEventListener('pointermove', onDrawMove);
          document.removeEventListener('pointerup', onDrawUp);
          if (previewSvg) previewSvg.remove();

          const endX = upEvent.clientX - boardRect.left + board.scrollLeft;
          const endY = upEvent.clientY - boardRect.top + board.scrollTop;
          const dx = endX - startX;
          const dy = endY - startY;
          const dist = Math.hypot(dx, dy);

          if (dist > 15) {
            const width = Math.max(50, Math.round(dist));
            const height = 40;
            const xPercent = (startX / Math.max(1, board.scrollWidth)) * 100;
            const yPercent = (startY / Math.max(1, board.scrollHeight)) * 100;
            const angle = Math.round(Math.atan2(dy, dx) * 180 / Math.PI);

            const state = getGameState();
            state.addTodoNote('', { x: xPercent, y: yPercent }, 'arrow', { 
              width, 
              height, 
              direction: String(angle) 
            });
            UIManager.renderTodoNotes();
          }

          UIManager.isDrawingArrow = false;
          board.classList.remove('drawing-arrow-mode');
        };

        document.addEventListener('pointermove', onDrawMove);
        document.addEventListener('pointerup', onDrawUp);
        return;
      }

      // Check plus button for adding subtasks (toggles inline subtask field)
      const addSubtaskPlus = event.target.closest('.btn-add-subtask-plus');
      if (addSubtaskPlus) {
        event.stopPropagation();
        const card = addSubtaskPlus.closest('.task-card-todo');
        const inlineContainer = card ? card.querySelector('.subtask-add-inline') : null;
        if (inlineContainer) {
          const isHidden = inlineContainer.style.display === 'none';
          inlineContainer.style.display = isHidden ? 'flex' : 'none';
          if (isHidden) {
            const input = inlineContainer.querySelector('input');
            if (input) input.focus();
          }
        }
        return;
      }

      // Check subtask rectangle double tap
      const subtaskRect = event.target.closest('.todo-subtask-rect');
      if (subtaskRect) {
        if (event.target.closest('.subtask-remove')) {
          const todoId = subtaskRect.dataset.todoId;
          const subtaskId = subtaskRect.dataset.subtaskId;
          if (todoId && subtaskId) {
            TaskManager.removeSubtask(todoId, subtaskId);
            try { getGameState().save(); } catch (e) {}
            UIManager.updateTodosList();
          }
          return;
        }

        const now = Date.now();
        const lastTap = Number(subtaskRect.dataset.lastTapTime || 0);
        if (now - lastTap < 350) {
          subtaskRect.dataset.lastTapTime = '0';
          const todoId = subtaskRect.dataset.todoId;
          const subtaskId = subtaskRect.dataset.subtaskId;
          if (todoId && subtaskId) {
            TaskManager.toggleSubtask(todoId, subtaskId);
            try { getGameState().save(); } catch (e) {}
            UIManager.updateTodosList();
          }
        } else {
          subtaskRect.dataset.lastTapTime = String(now);
        }
        return;
      }

      if (event.target.closest('button, input, textarea, select, label, .todo-subtask-rect, .subtask-add-inline')) return;

      const card = event.target.closest('.task-card-todo');
      const isNote = event.target.closest('.todo-note-card');
      if (isNote) return;

      const startX = event.clientX;
      const startY = event.clientY;

      if (card) {
        const todoId = card.dataset.id;
        if (!todoId) return;

        event.preventDefault();

        // Check double tap for completing To-Do (only when clicking the main shape)
        const targetIsShape = !!event.target.closest('.todo-main-shape');
        const now = Date.now();
        const lastTap = Number(card.dataset.lastTapTime || 0);
        if (targetIsShape && (now - lastTap < 300)) {
          card.dataset.lastTapTime = '0';
          
          const res = TaskManager.completeTodo(todoId);
          if (res && res.success) {
            card.style.transition = 'filter 100ms ease, opacity 400ms ease';
            card.style.filter = 'brightness(10) contrast(1.5)';
            setTimeout(() => {
              card.style.filter = '';
            }, 100);

            UIManager.accelerateBackground(2.0, 2000);
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
              try { navigator.vibrate([15, 30, 45]); } catch (e) {}
            }
            const rect = card.getBoundingClientRect();

            if (res.isJackpot) {
              try { if (window.SoundManager) SoundManager.play('crit'); } catch (e) {}
              FloatingDamageNumber.show(rect.left + rect.width / 2, Math.max(12, rect.top - 38), 'JACKPOT!', { className: 'rainbow-jackpot-text', scale: 1.5, duration: 2000 });
            }
            if (res.rewards && res.rewards.ap) {
              FloatingDamageNumber.show(rect.left + rect.width / 2, Math.max(12, rect.top - 18), `+${Math.ceil(res.rewards.ap)} AP`, { color: UIManager.themeColor('--ap-gold', '#FFB33F'), cycleText: false, countUp: true });
            }
            if (res.rewards && res.rewards.diamonds) {
              UIManager.spawnDiamondFloatingPopup(rect.left + rect.width / 2, rect.top + rect.height / 2, res.rewards.diamonds);
            }
            let countUpDelay = 0;
            if (res.rewards && res.rewards.ap) {
              const apVal = Math.ceil(res.rewards.ap);
              countUpDelay = Math.min(1200, Math.max(650, apVal * 25));
            }

            UIManager.applyTaskChargingEffect(card, countUpDelay, () => {
              if (typeof RetroTaskCompleteAnimation !== 'undefined') {
                RetroTaskCompleteAnimation.play(card);
              }
              setTimeout(() => {
                UIManager.updateTodosList();
              }, 200);
            });
            try { getGameState().save(); } catch (e) {}
            UIManager.renderEnemies();
          }
          return;
        }
        if (targetIsShape) {
          card.dataset.lastTapTime = String(now);
        }

        let isDragging = false;
        const todo = TaskManager.getTaskById(todoId);
        const isCluster = todo && todo.clusterId;
        let clusterCards = [];
        let firstCardTodo = null;
        let firstCardElement = null;

        if (isCluster) {
          clusterCards = Array.from(board.querySelectorAll(`.task-card-todo[data-cluster-id="${todo.clusterId}"]`))
            .sort((a, b) => (Number(a.dataset.clusterIndex) || 0) - (Number(b.dataset.clusterIndex) || 0));

          if (clusterCards.length > 0) {
            firstCardElement = clusterCards[0];
            firstCardTodo = TaskManager.getTaskById(firstCardElement.dataset.id);
          }
        }

        const leftStyle = card.style.left || '';
        const topStyle = card.style.top || '';
        const matchX = leftStyle.match(/calc\(50%\s*([+-]\s*[\d.]+)px\)/);
        const matchY = topStyle.match(/calc\(50%\s*([+-]\s*[\d.]+)px\)/);

        const boardWidth = board.clientWidth || board.offsetWidth || 800;
        const boardHeight = board.clientHeight || board.offsetHeight || 600;

        let initX = matchX ? parseFloat(matchX[1].replace(/\s+/g, '')) : (card.offsetLeft - (boardWidth / 2));
        let initY = matchY ? parseFloat(matchY[1].replace(/\s+/g, '')) : (card.offsetTop - (boardHeight / 2));

        const onTouchMovePrevent = (touchEv) => {
          if (isDragging && touchEv.cancelable) {
            touchEv.preventDefault();
          }
        };

        const onCardMove = (moveEvent) => {
          if (moveEvent.pointerId !== event.pointerId) return;
          if (moveEvent.clientX === 0 && moveEvent.clientY === 0) return;

          const deltaX = moveEvent.clientX - startX;
          const deltaY = moveEvent.clientY - startY;

          if (!isDragging) {
            if (Math.hypot(deltaX, deltaY) > 4) {
              isDragging = true;
              try { card.setPointerCapture(event.pointerId); } catch (error) { }

              const panel = document.getElementById('todosPanel');
              if (panel) panel.style.overflow = 'hidden';

              document.addEventListener('touchmove', onTouchMovePrevent, { passive: false });

              this.todoDragState = {
                todoId,
                card,
                board,
                pointerId: event.pointerId,
                moved: true
              };

              card.classList.add('dragging');
            } else {
              return;
            }
          }

          const scale = this.orbitScale || 1;
          const currentX = initX + (deltaX / scale);
          const currentY = initY + (deltaY / scale);

          card.style.left = `calc(50% + ${currentX.toFixed(1)}px)`;
          card.style.top = `calc(50% + ${currentY.toFixed(1)}px)`;
        };

        const onCardUp = (upEvent) => {
          if (upEvent.pointerId !== event.pointerId) return;
          cleanupCard();

          if (isDragging) {
            card.classList.remove('dragging');
            try { card.releasePointerCapture(event.pointerId); } catch (error) { }
          }

          this.todoDragState = null;
        };

        const cleanupCard = () => {
          document.removeEventListener('pointermove', onCardMove);
          document.removeEventListener('pointerup', onCardUp);
          document.removeEventListener('pointercancel', onCardUp);
          document.removeEventListener('touchmove', onTouchMovePrevent);
        };

        document.addEventListener('pointermove', onCardMove);
        document.addEventListener('pointerup', onCardUp);
        document.addEventListener('pointercancel', onCardUp);

      } else {
        const existingWizard = document.querySelector('.floating-wizard');
        if (existingWizard && existingWizard.contains(event.target)) return;

        const timer = setTimeout(() => {
          if (typeof PopupsManager !== 'undefined' && PopupsManager.showAddTodoWizard) {
            const boardRect = board.getBoundingClientRect();
            const xPx = event.clientX - boardRect.left + board.scrollLeft;
            const yPx = event.clientY - boardRect.top + board.scrollTop;
            const xPercent = (xPx / board.scrollWidth) * 100;
            const yPercent = (yPx / board.scrollHeight) * 100;
            PopupsManager.showAddTodoWizard(xPercent, yPercent, xPx, yPx);
            this.wizardOpenedTime = Date.now();
          }
        }, 500);

        const onMove = (moveEvent) => {
          if (moveEvent.pointerId !== event.pointerId) return;
          const dist = Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY);
          if (dist > 10) {
            clearTimeout(timer);
            cleanup();
          }
        };

        const onUp = (upEvent) => {
          if (upEvent.pointerId !== event.pointerId) return;
          clearTimeout(timer);
          cleanup();
        };

        const cleanup = () => {
          document.removeEventListener('pointermove', onMove);
          document.removeEventListener('pointerup', onUp);
          document.removeEventListener('pointercancel', onUp);
        };

        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onUp);
        document.addEventListener('pointercancel', onUp);
      }
    });
  }

  static orbitPanX = 0;
  static orbitPanY = 0;
  static orbitScale = 1;

  static updateTodosList() {
    if (this.todoDragState) return;
    try { this.updatePendingDamageDisplay(); } catch (e) { }
    const panel = document.getElementById('todosPanel');
    if (panel && !panel.classList.contains('open') && window.innerWidth <= 900) return; // Skip if hidden on mobile
    const todos = TaskManager.getAllTodos();
    const container = document.getElementById('todosList');

    if (!container) return;

    const showCompleted = !!getGameState().systemState?.taskListFilters?.showCompletedTodos;
    const diffFilter = UIManager.currentTodoDifficultyFilter || 'All';
    const visibleTodos = todos.filter(todo => {
      if (diffFilter !== 'All' && todo.difficulty !== diffFilter) {
        return false;
      }
      if (todo.completed && !todo.clusterId) {
        return showCompleted;
      }
      if (todo.clusterId) {
        const clusterTodos = todos.filter(t => t.clusterId === todo.clusterId);
        const allCompleted = clusterTodos.every(t => t.completed);
        if (allCompleted) {
          return showCompleted;
        }
        return !todo.completed || (todo.completed && todo.clusterId);
      }
      return true;
    });

    const palette = getGameState()?.config?.attributeColors || {};

    const ringBuckets = [[], [], [], [], []];

    visibleTodos.forEach(todo => {
      if (!todo.deadline) {
        ringBuckets[4].push(todo);
      } else {
        const diffMs = todo.deadline - Date.now();
        const days = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
        if (days <= 1) ringBuckets[0].push(todo);
        else if (days <= 3) ringBuckets[1].push(todo);
        else if (days <= 7) ringBuckets[2].push(todo);
        else ringBuckets[3].push(todo);
      }
    });

    const RING_RADII = [95, 175, 255, 335, 415];
    const nodesData = [];

    ringBuckets.forEach((ringTodos, ringIdx) => {
      const radius = RING_RADII[ringIdx];
      const count = ringTodos.length;
      if (count === 0) return;

      const angleStep = (2 * Math.PI) / count;
      const ringAngleOffset = (ringIdx * 0.25) - Math.PI / 2;

      ringTodos.forEach((todo, idx) => {
        const angle = ringAngleOffset + (idx * angleStep);
        const x = radius * Math.cos(angle);
        const y = radius * Math.sin(angle);

        const displayName = (todo.name === 'New To-Do') ? '' : (todo.name || '');

        let plainNumText = '∞';
        let naturalDeadlineText = 'No deadline';

        if (todo.deadline) {
          const diffMs = todo.deadline - Date.now();
          const d = new Date(todo.deadline);
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const mName = months[d.getMonth()];
          const dayNum = d.getDate();
          const hh = String(d.getHours()).padStart(2, '0');
          const mm = String(d.getMinutes()).padStart(2, '0');
          naturalDeadlineText = `${mName} ${dayNum}, ${hh}:${mm}`;

          if (diffMs < 0) {
            plainNumText = '!';
          } else {
            const hours = Math.ceil(diffMs / (1000 * 60 * 60));
            const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
            if (hours <= 24) {
              plainNumText = `${Math.max(1, hours)}h`;
            } else {
              plainNumText = `${days}d`;
            }
          }
        }

        let displayAttr = todo.attribute || 'RESP';
        if (todo.clusterAttributes && typeof todo.clusterAttributes === 'object') {
          let maxVal = -1;
          for (const attr in todo.clusterAttributes) {
            if (todo.clusterAttributes[attr] > maxVal) {
              maxVal = todo.clusterAttributes[attr];
              displayAttr = attr;
            }
          }
        }
        const attrColor = palette[displayAttr] || '#555';
        const textColor = UIManager.getTextColorForHex(attrColor);
        const shadeColor = UIManager.shadeColor ? UIManager.shadeColor(attrColor, -20) : attrColor;
        const shapeClass = this.shapeClassForDifficulty(todo.difficulty);

        const subtaskRects = (todo.subtasks || []).map(st => `
          <div class="todo-subtask-rect ${st.completed ? 'completed' : ''}" data-todo-id="${todo.id}" data-subtask-id="${st.id}">
            <span class="subtask-title">${st.name}</span>
            <button class="subtask-remove" data-todo-id="${todo.id}" data-subtask-id="${st.id}" title="Remove">×</button>
          </div>
        `).join('');

        const nodeHTML = `
          <div class="task-card task-clickable task-card-todo todo-shape-wrapper todo-orbit-node ${todo.completed ? 'completed' : ''}${todo.bloodOathActive ? ' blood-oath-active' : ''}" 
               data-id="${todo.id}" 
               data-type="todo" 
               data-difficulty="${todo.difficulty || ''}" 
               tabindex="0" 
               style="left: calc(50% + ${x.toFixed(1)}px); top: calc(50% + ${y.toFixed(1)}px); --task-accent:${attrColor}; --task-accent-strong:${shadeColor}; --task-ink:${textColor};">
            
            <!-- Plain Deadline Counter Number directly on LEFT side -->
            <div class="todo-plain-deadline-num" data-todo-id="${todo.id}" title="Click to change due deadline" style="color:${attrColor};">
              ${plainNumText}
            </div>

            <!-- Card Main Stack (Top Deadline Badge + Shape + Subtasks) -->
            <div class="todo-card-main-stack">
              <!-- Regular deadline text on top -->
              <div class="todo-deadline-card-badge-top" data-todo-id="${todo.id}" style="background:${attrColor}; color:${textColor};">
                <span class="todo-deadline-date">${naturalDeadlineText}</span>
              </div>

              <!-- Main Shape Card -->
              <div class="shape-task shape-${shapeClass} todo-main-shape" style="--task-accent:${attrColor}; --task-accent-strong:${shadeColor}; --task-ink:${textColor}; position: relative;">
                ${todo.bloodOathActive ? `
                  <div class="blood-oath-fire-container">
                    <div class="flame-square"></div><div class="flame-square"></div><div class="flame-square"></div><div class="flame-square"></div>
                    <div class="flame-square"></div><div class="flame-square"></div><div class="flame-square"></div><div class="flame-square"></div>
                  </div>
                ` : ''}

                <div class="task-shape-name">${displayName}</div>
              </div>

              <!-- Subtasks stuck directly to BOTTOM of shape -->
              ${(todo.subtasks || []).length > 0 ? `
                <div class="todo-orbit-subtasks-stuck-bottom" style="background:${attrColor}; color:${textColor};">
                  ${subtaskRects}
                </div>
              ` : ''}
            </div>

          </div>
        `;
        nodesData.push(nodeHTML);
      });
    });

    container.innerHTML = `
      <div class="todo-orbit-viewport" id="todoOrbitViewport">
        <div class="todo-orbit-controls">
          <button class="orbit-control-btn" id="todoOrbitZoomIn" title="Zoom In">＋</button>
          <button class="orbit-control-btn" id="todoOrbitZoomOut" title="Zoom Out">－</button>
          <button class="orbit-control-btn" id="todoOrbitReset" title="Reset View">⊙</button>
        </div>

        <div class="todo-orbit-canvas-container" id="todoOrbitCanvasContainer">
          <svg class="todo-orbit-svg" viewBox="-500 -500 1000 1000" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <radialGradient id="orbitCenterGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stop-color="#fbbf24" stop-opacity="0.8" />
                <stop offset="60%" stop-color="#f59e0b" stop-opacity="0.3" />
                <stop offset="100%" stop-color="#d97706" stop-opacity="0" />
              </radialGradient>
              <filter id="ringGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <circle cx="0" cy="0" r="32" fill="url(#orbitCenterGlow)" />
            <circle cx="0" cy="0" r="16" fill="#fbbf24" filter="url(#ringGlow)" />
            <text x="0" y="4" text-anchor="middle" fill="#000" font-weight="900" font-size="10" font-family="'Orbitron', monospace">NOW</text>

            <circle cx="0" cy="0" r="95" class="orbit-ring ring-0" vector-effect="non-scaling-stroke" />
            <text x="0" y="-99" text-anchor="middle" class="orbit-ring-label ring-label-0">⚡ TODAY / OVERDUE</text>

            <circle cx="0" cy="0" r="175" class="orbit-ring ring-1" vector-effect="non-scaling-stroke" />
            <text x="0" y="-179" text-anchor="middle" class="orbit-ring-label ring-label-1">1 - 3 DAYS</text>

            <circle cx="0" cy="0" r="255" class="orbit-ring ring-2" vector-effect="non-scaling-stroke" />
            <text x="0" y="-259" text-anchor="middle" class="orbit-ring-label ring-label-2">4 - 7 DAYS</text>

            <circle cx="0" cy="0" r="335" class="orbit-ring ring-3" vector-effect="non-scaling-stroke" />
            <text x="0" y="-339" text-anchor="middle" class="orbit-ring-label ring-label-3">> 7 DAYS</text>

            <circle cx="0" cy="0" r="415" class="orbit-ring ring-4" vector-effect="non-scaling-stroke" />
            <text x="0" y="-419" text-anchor="middle" class="orbit-ring-label ring-label-4">NO DEADLINE</text>
          </svg>

          <div class="todo-orbit-nodes-layer" id="todoOrbitNodesLayer">
            ${nodesData.join('')}
          </div>
        </div>
      </div>

      <!-- Viewport Floating HUD 1: Attributes + Difficulty -->
      <div class="preset-hud-card hud-attr-diff" id="hudAttrDiff" style="left: 16px; top: 70px;">
        <div class="hud-header">
          <span class="hud-drag-handle">⠿ PRESETS HUD</span>
          <button class="hud-collapse-btn" title="Toggle HUD">−</button>
        </div>
        <div class="hud-body">
          <div class="preset-group preset-diff-group" title="Select Preset Difficulty Shape">
            <span class="preset-label">DIFFICULTY</span>
            <div class="preset-shape-selector" id="todoPresetDiffShapes">
              <button class="preset-shape-btn shape-easy" data-diff="Easy" title="Easy (Circle)"><span class="shape-icon"></span></button>
              <button class="preset-shape-btn shape-medium active" data-diff="Medium" title="Medium (Diamond)"><span class="shape-icon"></span></button>
              <button class="preset-shape-btn shape-hard" data-diff="Hard" title="Hard (Square)"><span class="shape-icon"></span></button>
              <button class="preset-shape-btn shape-ultra" data-diff="Ultra" title="Ultra (Octagon)"><span class="shape-icon"></span></button>
            </div>
          </div>
          <div class="preset-group preset-orbit-group" title="Select Preset Attribute">
            <span class="preset-label">ATTRIBUTE</span>
            <div class="preset-orbit-container" id="todoPresetOrbit">
              <div class="preset-orbit-center" id="todoPresetAttrCenter" data-selected-attr="STR">STR</div>
              <div class="preset-orbit-nodes" id="todoPresetOrbitNodes"></div>
            </div>
          </div>
        </div>
        <div class="hud-resizer"></div>
      </div>

      <!-- Viewport Floating HUD 2: Deadline -->
      <div class="preset-hud-card hud-deadline" id="hudDeadline" style="right: 16px; top: 70px;">
        <div class="hud-header">
          <span class="hud-drag-handle">⠿ DEADLINE HUD</span>
          <button class="hud-collapse-btn" title="Toggle HUD">−</button>
        </div>
        <div class="hud-body">
          <span class="preset-label">DUE DEADLINE</span>
          <div class="preset-date-vertical-cells">
            <div class="preset-date-chips-column">
              <button class="preset-chip" data-days="0">Today</button>
              <button class="preset-chip active" data-days="1">Tomorrow</button>
              <button class="preset-chip" data-days="3">+3 Days</button>
              <button class="preset-chip" data-days="7">+7 Days</button>
            </div>
            <input type="date" id="todoPresetDate" class="preset-input" title="Preset Deadline Date" />
            <input type="time" id="todoPresetTime" class="preset-input" value="23:59" title="Preset Deadline Time" style="margin-top: 4px;" />
          </div>
        </div>
        <div class="hud-resizer"></div>
      </div>
    `;

    this.bindTaskInteractions();
    this.bindTodoBoardInteractions();
    this.setupTodoOrbitPanZoom();
    this.renderTodoNotes();
    this.setupPresetHuds();
    this.startUltraSkullEmitters();
    try { this.updateTodoJoystickUI(); } catch (e) {}
  }

  static hudStates = {};

  static saveTodoHudStates() {
    try {
      localStorage.setItem('nemesis_todo_hud_states', JSON.stringify(this.hudStates || {}));
      const state = getGameState();
      if (state) state.todoHudStates = this.hudStates;
    } catch (e) {
      console.error('Failed to save todo HUD states', e);
    }
  }

  static loadTodoHudStates() {
    try {
      const saved = localStorage.getItem('nemesis_todo_hud_states');
      if (saved) {
        this.hudStates = JSON.parse(saved);
      } else {
        const state = getGameState();
        if (state?.todoHudStates) this.hudStates = state.todoHudStates;
        else this.hudStates = {};
      }
    } catch (e) {
      this.hudStates = {};
    }
  }

  static setupPresetHuds() {
    this.loadTodoHudStates();
    this.hudStates = this.hudStates || {};
    const huds = document.querySelectorAll('.preset-hud-card');

    huds.forEach(hud => {
      const hudId = hud.id;
      const saved = this.hudStates[hudId];
      if (saved) {
        if (saved.left !== undefined) {
          hud.style.left = saved.left;
          hud.style.right = 'auto';
        }
        if (saved.top !== undefined) {
          hud.style.top = saved.top;
        }
        if (saved.width !== undefined) {
          hud.style.width = saved.width;
        }
        if (saved.height !== undefined) {
          hud.style.height = saved.height;
        }
        if (saved.collapsed) {
          hud.classList.add('collapsed');
        }
      }

      const header = hud.querySelector('.hud-header');
      const resizer = hud.querySelector('.hud-resizer');
      const collapseBtn = hud.querySelector('.hud-collapse-btn');
      const body = hud.querySelector('.hud-body');

      if (collapseBtn && body) {
        if (hud.classList.contains('collapsed')) {
          collapseBtn.textContent = '+';
        }
        collapseBtn.onclick = (e) => {
          e.stopPropagation();
          hud.classList.toggle('collapsed');
          const isCollapsed = hud.classList.contains('collapsed');
          collapseBtn.textContent = isCollapsed ? '+' : '−';
          this.hudStates[hudId] = this.hudStates[hudId] || {};
          this.hudStates[hudId].collapsed = isCollapsed;
          this.saveTodoHudStates();
        };
      }

      if (header) {
        let isDragging = false;
        let startX = 0, startY = 0;
        let initLeft = 0, initTop = 0;

        header.onpointerdown = (e) => {
          if (e.target.closest('.hud-collapse-btn')) return;
          e.stopPropagation();
          isDragging = true;
          startX = e.clientX;
          startY = e.clientY;
          initLeft = parseFloat(hud.style.left) || hud.offsetLeft;
          initTop = parseFloat(hud.style.top) || hud.offsetTop;
          try { header.setPointerCapture(e.pointerId); } catch (err) {}
        };

        header.onpointermove = (e) => {
          if (!isDragging) return;
          e.stopPropagation();
          const dx = e.clientX - startX;
          const dy = e.clientY - startY;
          const leftPx = `${initLeft + dx}px`;
          const topPx = `${initTop + dy}px`;
          hud.style.left = leftPx;
          hud.style.top = topPx;
          hud.style.right = 'auto';

          this.hudStates[hudId] = this.hudStates[hudId] || {};
          this.hudStates[hudId].left = leftPx;
          this.hudStates[hudId].top = topPx;
        };

        const stopDrag = (e) => {
          if (!isDragging) return;
          e.stopPropagation();
          isDragging = false;
          try { header.releasePointerCapture(e.pointerId); } catch (err) {}
          this.saveTodoHudStates();
        };

        header.onpointerup = stopDrag;
        header.onpointercancel = stopDrag;
      }

      if (resizer) {
        let isResizing = false;
        let startX = 0, startY = 0;
        let initWidth = 0, initHeight = 0;

        resizer.onpointerdown = (e) => {
          e.stopPropagation();
          isResizing = true;
          startX = e.clientX;
          startY = e.clientY;
          initWidth = hud.offsetWidth;
          initHeight = hud.offsetHeight;
          try { resizer.setPointerCapture(e.pointerId); } catch (err) {}
        };

        resizer.onpointermove = (e) => {
          if (!isResizing) return;
          e.stopPropagation();
          const dw = e.clientX - startX;
          const dh = e.clientY - startY;
          const widthPx = `${Math.max(130, initWidth + dw)}px`;
          const heightPx = `${Math.max(100, initHeight + dh)}px`;
          hud.style.width = widthPx;
          hud.style.height = heightPx;

          this.hudStates[hudId] = this.hudStates[hudId] || {};
          this.hudStates[hudId].width = widthPx;
          this.hudStates[hudId].height = heightPx;
        };

        const stopResize = (e) => {
          if (!isResizing) return;
          e.stopPropagation();
          isResizing = false;
          try { resizer.releasePointerCapture(e.pointerId); } catch (err) {}
          this.saveTodoHudStates();
        };

        resizer.onpointerup = stopResize;
        resizer.onpointercancel = stopResize;
      }
    });

    this.initPresetOrbitNodes();
    this.initPresetShapeSelector();
    this.initPresetDeadlineHud();
  }

  static initPresetShapeSelector() {
    const selector = document.getElementById('todoPresetDiffShapes');
    if (!selector) return;

    const hudId = 'hudAttrDiff';
    const savedDiff = this.hudStates[hudId]?.selectedDiff || 'Medium';
    this.presetDifficulty = savedDiff;

    selector.querySelectorAll('.preset-shape-btn').forEach(btn => {
      const diff = btn.dataset.diff;
      btn.classList.toggle('active', diff === savedDiff);

      btn.onclick = (e) => {
        e.stopPropagation();
        selector.querySelectorAll('.preset-shape-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.hudStates[hudId] = this.hudStates[hudId] || {};
        this.hudStates[hudId].selectedDiff = diff;
        this.presetDifficulty = diff;
        this.saveTodoHudStates();
      };
    });
  }

  static initPresetDeadlineHud() {
    const deadlineHud = document.getElementById('hudDeadline');
    if (!deadlineHud) return;

    const hudId = 'hudDeadline';
    const chipsColumn = deadlineHud.querySelector('.preset-date-chips-column');
    const dateInput = deadlineHud.querySelector('#todoPresetDate');
    const timeInput = deadlineHud.querySelector('#todoPresetTime');

    const savedDays = this.hudStates[hudId]?.selectedDays;
    const savedDate = this.hudStates[hudId]?.selectedDate;
    const savedTime = this.hudStates[hudId]?.selectedTime || '23:59';

    if (timeInput) {
      timeInput.value = savedTime;
    }

    const getTimeHoursMinutes = () => {
      const timeVal = timeInput ? timeInput.value || '23:59' : '23:59';
      const [h, m] = timeVal.split(':').map(Number);
      return { hours: isNaN(h) ? 23 : h, minutes: isNaN(m) ? 59 : m };
    };

    const updateDeadlineTs = (targetDate) => {
      const { hours, minutes } = getTimeHoursMinutes();
      targetDate.setHours(hours, minutes, 0, 0);
      const dTs = targetDate.getTime();
      if (!isNaN(dTs)) UIManager.quickDayDeadline = dTs;
    };

    if (savedDate && dateInput) {
      dateInput.value = savedDate;
      const target = new Date(savedDate);
      updateDeadlineTs(target);
    } else if (savedDays !== undefined && savedDays !== null) {
      const daysNum = Number(savedDays);
      const target = new Date();
      if (daysNum !== 0) {
        target.setDate(target.getDate() + daysNum);
      }
      updateDeadlineTs(target);
      if (dateInput) {
        const y = target.getFullYear();
        const m = String(target.getMonth() + 1).padStart(2, '0');
        const day = String(target.getDate()).padStart(2, '0');
        dateInput.value = `${y}-${m}-${day}`;
      }
    }

    if (chipsColumn) {
      chipsColumn.querySelectorAll('.preset-chip').forEach(chip => {
        const days = chip.dataset.days;
        if (savedDays !== undefined && String(savedDays) === String(days)) {
          chip.classList.add('active');
        } else if (savedDays === undefined && days === '1') {
          chip.classList.add('active');
        } else {
          chip.classList.remove('active');
        }

        chip.onclick = (e) => {
          e.stopPropagation();
          chipsColumn.querySelectorAll('.preset-chip').forEach(c => c.classList.remove('active'));
          chip.classList.add('active');

          const daysNum = Number(days);
          const target = new Date();
          if (daysNum !== 0) {
            target.setDate(target.getDate() + daysNum);
          }
          updateDeadlineTs(target);

          if (dateInput) {
            const y = target.getFullYear();
            const m = String(target.getMonth() + 1).padStart(2, '0');
            const d = String(target.getDate()).padStart(2, '0');
            dateInput.value = `${y}-${m}-${d}`;
          }

          this.hudStates[hudId] = this.hudStates[hudId] || {};
          this.hudStates[hudId].selectedDays = days;
          this.hudStates[hudId].selectedDate = dateInput ? dateInput.value : null;
          this.hudStates[hudId].selectedTime = timeInput ? timeInput.value || '23:59' : '23:59';
          this.saveTodoHudStates();
        };
      });
    }

    const onDateOrTimeChange = (e) => {
      e?.stopPropagation();
      if (!dateInput || !dateInput.value) {
        UIManager.quickDayDeadline = null;
      } else {
        const target = new Date(dateInput.value);
        updateDeadlineTs(target);
      }
      this.hudStates[hudId] = this.hudStates[hudId] || {};
      this.hudStates[hudId].selectedDate = dateInput ? dateInput.value : null;
      this.hudStates[hudId].selectedTime = timeInput ? timeInput.value || '23:59' : '23:59';
      this.saveTodoHudStates();
    };

    if (dateInput) {
      dateInput.onchange = (e) => {
        if (chipsColumn) {
          chipsColumn.querySelectorAll('.preset-chip').forEach(c => c.classList.remove('active'));
        }
        delete this.hudStates[hudId]?.selectedDays;
        onDateOrTimeChange(e);
      };
    }

    if (timeInput) {
      timeInput.onchange = (e) => {
        onDateOrTimeChange(e);
      };
    }
  }

  static initPresetOrbitNodes() {
    const attributes = getGameState().config.attributes || ['STR', 'AGI', 'INT', 'VIT', 'LUK'];
    const orbitNodesContainer = document.getElementById('todoPresetOrbitNodes');
    const orbitCenter = document.getElementById('todoPresetAttrCenter');

    const hudId = 'hudAttrDiff';
    const savedAttr = this.hudStates[hudId]?.selectedAttr || (attributes[0] || 'STR');
    this.presetAttribute = savedAttr;

    if (orbitNodesContainer) {
      const angleStep = 360 / attributes.length;
      const radius = 45;
      const centerXY = 63;
      orbitNodesContainer.innerHTML = attributes.map((attr, i) => {
        const angle = angleStep * i - 90;
        const rad = (angle * Math.PI) / 180;
        const x = Math.round(centerXY + radius * Math.cos(rad));
        const y = Math.round(centerXY + radius * Math.sin(rad));
        const color = getGameState().config.attributeColors?.[attr] || '#4facfe';
        const isActive = attr === savedAttr;
        return `<div class="preset-orbit-node ${isActive ? 'active' : ''}" data-attr="${attr}" style="left:${x}px; top:${y}px; --attr-color:${color};" title="${attr}">${attr}</div>`;
      }).join('');

      if (orbitCenter) {
        orbitCenter.textContent = savedAttr;
        orbitCenter.dataset.selectedAttr = savedAttr;
        const col = getGameState().config.attributeColors?.[savedAttr] || '#4facfe';
        orbitCenter.style.color = col;
        orbitCenter.style.borderColor = col;
      }

      orbitNodesContainer.querySelectorAll('.preset-orbit-node').forEach((node) => {
        node.onclick = (e) => {
          e.stopPropagation();
          orbitNodesContainer.querySelectorAll('.preset-orbit-node').forEach((n) => n.classList.remove('active'));
          node.classList.add('active');
          const attr = node.dataset.attr;
          if (orbitCenter) {
            orbitCenter.textContent = attr;
            orbitCenter.dataset.selectedAttr = attr;
            const color = getGameState().config.attributeColors?.[attr] || '#4facfe';
            orbitCenter.style.color = color;
            orbitCenter.style.borderColor = color;
          }
          this.hudStates[hudId] = this.hudStates[hudId] || {};
          this.hudStates[hudId].selectedAttr = attr;
          this.presetAttribute = attr;
          this.saveTodoHudStates();
        };
      });
    }
  }

  static setupTodoOrbitPanZoom() {
    const viewport = document.getElementById('todoOrbitViewport');
    const container = document.getElementById('todoOrbitCanvasContainer');
    if (!viewport || !container) return;

    this.applyOrbitTransform();

    viewport.onwheel = (e) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 1.12 : 0.88;
      this.orbitScale = Math.max(0.35, Math.min(2.8, this.orbitScale * delta));
      this.applyOrbitTransform();
    };

    document.getElementById('todoOrbitZoomIn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.orbitScale = Math.min(2.8, this.orbitScale * 1.25);
      this.applyOrbitTransform();
    });
    document.getElementById('todoOrbitZoomOut')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.orbitScale = Math.max(0.35, this.orbitScale / 1.25);
      this.applyOrbitTransform();
    });
    document.getElementById('todoOrbitReset')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.orbitPanX = 0;
      this.orbitPanY = 0;
      this.orbitScale = 1;
      this.applyOrbitTransform();
    });

    let isDragging = false;
    let startX = 0, startY = 0;
    let initPanX = 0, initPanY = 0;

    viewport.onpointerdown = (e) => {
      if (e.target.closest('.task-card-todo, .todo-subtask-rect, .subtask-remove, .orbit-control-btn')) return;
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      initPanX = this.orbitPanX;
      initPanY = this.orbitPanY;
      viewport.style.cursor = 'grabbing';
      try { viewport.setPointerCapture(e.pointerId); } catch (err) {}
    };

    viewport.onpointermove = (e) => {
      if (!isDragging) return;
      this.orbitPanX = initPanX + (e.clientX - startX);
      this.orbitPanY = initPanY + (e.clientY - startY);
      this.applyOrbitTransform();
    };

    const stopPan = (e) => {
      if (!isDragging) return;
      isDragging = false;
      viewport.style.cursor = 'grab';
      try { viewport.releasePointerCapture(e.pointerId); } catch (err) {}
    };

    viewport.onpointerup = stopPan;
    viewport.onpointercancel = stopPan;

    let pinchStartDist = 0;
    let pinchStartScale = 1;

    viewport.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        isDragging = false;
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        pinchStartDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        pinchStartScale = this.orbitScale || 1;
      }
    }, { passive: true });

    viewport.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2 && pinchStartDist > 0) {
        if (e.cancelable) e.preventDefault();
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        const factor = dist / pinchStartDist;
        this.orbitScale = Math.max(0.35, Math.min(2.8, pinchStartScale * factor));
        this.applyOrbitTransform();
      }
    }, { passive: false });

    viewport.addEventListener('touchend', (e) => {
      if (e.touches.length < 2) {
        pinchStartDist = 0;
      }
    }, { passive: true });
  }

  static applyOrbitTransform() {
    const container = document.getElementById('todoOrbitCanvasContainer');
    if (container) {
      container.style.transform = `translate3d(${this.orbitPanX.toFixed(1)}px, ${this.orbitPanY.toFixed(1)}px, 0px) scale(${this.orbitScale.toFixed(3)})`;
    }
    const invScale = (1 / (this.orbitScale || 1)).toFixed(3);
    document.querySelectorAll('.todo-note-card').forEach(n => {
      n.style.transform = `scale(${invScale})`;
      n.style.transformOrigin = 'center center';
    });
  }

  static getRingInfo(index, totalCount) {
    const capacityPerRing = 8;
    const ringLevel = Math.floor(index / capacityPerRing);
    const ringIndex = index % capacityPerRing;
    const totalInRing = Math.min(capacityPerRing, totalCount - ringLevel * capacityPerRing);
    return { ringLevel, ringIndex, totalInRing: totalInRing || 1 };
  }

  static _renderEnemiesScheduled = false;

  static renderEnemies() {
    if (this._renderEnemiesScheduled) return;
    this._renderEnemiesScheduled = true;
    queueMicrotask(() => {
      this._renderEnemiesScheduled = false;
      this._doRenderEnemies();
    });
  }

  static getCircleRect() {
    const circle = document.querySelector('.enemy-circle-container');
    if (circle) {
      const rect = circle.getBoundingClientRect();
      if (rect.width >= 100 && rect.height >= 100) {
        this.circleRectCache = {
          left: Math.round(rect.left),
          top: Math.round(rect.top),
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        };
        return this.circleRectCache;
      }
    }
    return this.circleRectCache || { left: 0, top: 0, width: 400, height: 400 };
  }


  static showMapNodePopup(nodeData) {
    const popup = document.createElement('div');
    popup.className = 'custom-popup-overlay active';
    popup.style.zIndex = '2147483647';
    
    // Fetch enemies for this node (simulated or real if StageManager allows)
    let enemiesText = nodeData.isBoss || nodeData.isMiniboss ? `<div style="color:#ff5a5a; font-weight:bold; margin-top:10px;">${nodeData.isMiniboss ? '☠️ Miniboss' : '👑 Boss'}: ${nodeData.bossName || 'Unknown'}</div>` : `<div style="color:#a8b2d1; font-size:0.9rem; margin-top:10px;">Expected enemies: Native to ${nodeData.nodeName}</div>`;

    popup.innerHTML = `
      <div class="custom-popup" style="border: 2px solid ${nodeData.color}; background: #0f172a; max-width: 400px; text-align: center; box-shadow: 0 0 20px ${nodeData.color}40; margin:auto;">
        <h2 style="color:${nodeData.color}; margin-top:0; font-family:'Orbitron', sans-serif;">${nodeData.nodeName} Level ${nodeData.level}</h2>
        <p style="color:#cbd5e1; font-size:0.95rem;">Prepare your focus and tasks. Once you enter, you must clear the required objectives to advance.</p>
        ${enemiesText}
        <div style="margin-top: 25px; display: flex; gap: 15px; justify-content: center;">
          <button id="mapNodeCancelBtn" class="popup-btn" style="background:#334155;">Cancel</button>
          <button id="mapNodeEnterBtn" class="popup-btn" style="background:${nodeData.color}; color:#fff; border:none; padding:10px 20px; font-weight:bold; cursor:pointer; border-radius:4px;">Enter Level</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(popup);
    
    popup.querySelector('#mapNodeCancelBtn').addEventListener('click', () => {
      popup.remove();
    });
    
    popup.querySelector('#mapNodeEnterBtn').addEventListener('click', () => {
      popup.remove();
      if (typeof StageManager !== 'undefined' && StageManager.enterStageLevel) {
        StageManager.enterStageLevel(nodeData.stage, nodeData.variant, nodeData.level, nodeData.bossName);
      }
    });
  }

  static getOrGenerateBranchingMap(stageProgress) {
    const state = typeof getGameState === 'function' ? getGameState() : null;
    if (state?.stageState?.branchingMap && state.stageState.branchingMap.nodes && state.stageState.branchingMap.nodes.length > 50) {
      return state.stageState.branchingMap;
    }

            const stageColors = {
      1: '#ef4444', 2: '#f59e0b', 3: '#eab308', 4: '#84cc16',
      5: '#10b981', 6: '#06b6d4', 7: '#6366f1', 8: '#a855f7',
      9: '#e81cff', 10: '#ff4d4d', 11: '#002244'
    };

    const minibossPool = [
      'Grave Sentinel', 'Ashen Warden', 'Rune Overseer', 'Void Preceptor',
      'Rot Apostle', 'Blight Executioner', 'Blood Harbinger', 'Czar Vanguard'
    ];

    const mapNodes = [];
    const mapLines = [];

    // Main spine path: Stages 1 to 11
        const mainStages = [
      { stage: 1, key: '1A', name: 'Volcano', icon: '🌋' },
      { stage: 2, key: '2A', name: 'Pyramids', icon: '🏜️' },
      { stage: 3, key: '3A', name: 'Marchers', icon: '🚶‍♂️' },
      { stage: 4, key: '4A', name: 'Chasm', icon: '🕳️' },
      { stage: 5, key: '5A', name: 'Kingdom', icon: '🏰' },
      { stage: 6, key: '6A', name: 'Graveyard', icon: '🪦' },
      { stage: 7, key: '7A', name: 'Church', icon: '⛪' },
      { stage: 8, key: '8A', name: 'Lab', icon: '🧪' },
      { stage: 9, key: '9A', name: 'Cult', icon: '👁️' },
      { stage: 10, key: '10A', name: 'Dragon Isle', icon: '🐉' },
      { stage: 11, key: '11A', name: 'Abyssal Sea', icon: '🌊', isApex: true },
    ];

    let lastSpineNodeId = null;
    // We go upwards. 11 stages * 5 levels * 90px = ~4950px tall
    let currentY = 5500;
    const centerX = 600;

    mainStages.forEach((stg) => {
      for (let lvl = 1; lvl <= 5; lvl++) {
        const isBoss = (lvl === 5);
        const nodeId = `main_${stg.key}_L${lvl}`;
        
        // slight wiggle
        const x = centerX + (Math.random() * 60 - 30);
        const y = currentY;

        mapNodes.push({
          id: nodeId,
          key: stg.key,
          stage: stg.stage,
          variant: 'A',
          level: lvl,
          name: stg.name,
          icon: stg.icon,
          x, y,
          isMain: true,
          isBoss: isBoss,
          isMiniboss: false,
          bossName: null,
          color: stageColors[stg.stage],
          maxLevels: 1 // for compatibility
        });

        if (lastSpineNodeId) {
          mapLines.push({ from: lastSpineNodeId, to: nodeId, isMain: true });
        }
        lastSpineNodeId = nodeId;

        // Miniboss branch (1-2 per stage, only on non-boss levels)
        if (!isBoss && Math.random() < 0.4) {
          const side = (Math.random() > 0.5) ? -1 : 1;
          const assignedMiniboss = minibossPool[Math.floor(Math.random() * minibossPool.length)];
          const subKey = `${stg.stage}B_${lvl}`;
          const subId = `sub_${subKey}`;
          
          const bx = x + side * (120 + Math.random() * 50);
          const by = y - 30; // slightly above

          mapNodes.push({
            id: subId,
            key: subKey,
            stage: stg.stage,
            variant: 'B',
            level: 1,
            name: stg.name,
            icon: '⚔️',
            x: bx, y: by,
            isMain: false,
            isMiniboss: true,
            isBoss: false,
            bossName: assignedMiniboss,
            color: stageColors[stg.stage],
            maxLevels: 1
          });

          mapLines.push({ from: nodeId, to: subId, isMain: false });
        }

        currentY -= 90;
      }
      currentY -= 60; // Extra gap between stages
    });

    const branchingMap = { nodes: mapNodes, lines: mapLines };
    if (state?.stageState) state.stageState.branchingMap = branchingMap;
    return branchingMap;
  }

  static renderWorldMapNodeView() {
    // Clear enemy canvas if any
    const enemyCanvas = document.getElementById('enemyConnectionCanvas');
    if (enemyCanvas) {
      const ctx = enemyCanvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, enemyCanvas.width, enemyCanvas.height);
    }

    let mapContainer = document.querySelector('.world-map-container');
    if (mapContainer) return; // Prevent rebuilding the map every tick
    
    mapContainer = document.createElement('div');
    mapContainer.className = 'world-map-container';
    document.body.appendChild(mapContainer);

    const state = typeof getGameState === 'function' ? getGameState() : null;
    if (typeof StageManager !== 'undefined' && StageManager.ensureStageProgress) {
      StageManager.ensureStageProgress();
    }
    const stageProgress = state?.stageState?.stageProgress || {};

    const mapData = this.getOrGenerateBranchingMap(stageProgress);

    let html = `
      <div class="world-map-header" style="z-index:10; pointer-events:auto;">
        <h2 style="margin:0 0 4px 0; color:#ffd700; font-family:'Orbitron', sans-serif; font-size:1.6rem; text-shadow:0 0 15px rgba(255,215,0,0.5);">🌐 WORLD BRANCHING MAP</h2>
        <p style="margin:0 0 8px 0; font-size:0.85rem; color:#94a3b8;">Pinch/scroll to zoom out/in • Drag to pan • Side paths hold Minibosses</p>
        <div class="world-map-controls" style="display:flex; gap:10px; justify-content:center; margin-bottom:10px;">
          <button id="mapZoomIn" style="background:#1e293b; border:1px solid #64748b; color:#fff; padding:4px 12px; border-radius:4px; cursor:pointer;">🔍 +</button>
          <button id="mapZoomOut" style="background:#1e293b; border:1px solid #64748b; color:#fff; padding:4px 12px; border-radius:4px; cursor:pointer;">🔍 -</button>
          <button id="mapReset" style="background:#1e293b; border:1px solid #64748b; color:#fff; padding:4px 12px; border-radius:4px; cursor:pointer;">🎯 Reset</button>
        </div>
      </div>
      <div class="world-tree-viewport" style="position:relative; width:100vw; height:calc(100vh - 120px); overflow:hidden; cursor:grab; touch-action:none;">
        <div class="world-tree-canvas-content" style="position:absolute; top:0; left:0; width:1200px; height:6000px; transform-origin:0 0;">
          <svg class="world-tree-svg" style="position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:1; overflow:visible;"></svg>
          <div class="world-tree-nodes-layer" style="position:relative; z-index:2; width:100%; height:100%;">
    `;

    mapData.nodes.forEach(node => {
      const prog = stageProgress[node.key] || { maxCleared: 0, isCleared: false };
      const isLevelCleared = (node.level <= prog.maxCleared) || prog.isCleared;
      const isCurrent = (node.level === prog.maxCleared + 1) && !prog.isCleared;
      
      const color = node.color || '#38bdf8';
      const label = node.isMiniboss ? '☠️' : (node.isBoss ? '👑' : `L${node.level}`);
      const bg = isLevelCleared ? color + '40' : 'rgba(15, 23, 42, 0.96)';
      const borderColor = isCurrent ? '#fff' : color;

      html += `
        <button class="stage-node-circle ${isLevelCleared ? 'is-level-cleared' : ''} ${node.isBoss ? 'boss-lvl-btn' : ''} ${node.isMiniboss ? 'miniboss-lvl-btn' : ''}" 
             data-node-id="${node.id}" 
             data-node-key="${node.key}" 
             data-stage="${node.stage}" 
             data-variant="${node.variant}"
             data-level="${node.level}"
             data-boss-override="${node.bossName || ''}"
             data-node-name="${node.name}"
             data-is-boss="${node.isBoss}"
             data-is-miniboss="${node.isMiniboss}"
             data-color="${color}"
             style="position:absolute; left:${node.x}px; top:${node.y}px; border-color:${borderColor}; box-shadow: 0 0 14px ${color}35; background: ${bg}; width:46px; height:46px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-family:'Orbitron', sans-serif; font-size:1.1rem; color:#fff; border-width:2px; border-style:solid; cursor:pointer; z-index:5; transform: translate(-50%, -50%);">
          ${label}
        </button>
      `;
    });

    html += `
          </div>
        </div>
      </div>
    `;
    mapContainer.innerHTML = html;

    // Pan & Zoom controls
    const viewport = mapContainer.querySelector('.world-tree-viewport');
    const content = mapContainer.querySelector('.world-tree-canvas-content');
    
    let scale = 0.85;
    let panX = (window.innerWidth - 1200 * scale) / 2;
    let panY = -4500; // start near bottom

    const updateTransform = () => {
      content.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
    };
    updateTransform();

    // Zoom Buttons
    mapContainer.querySelector('#mapZoomIn')?.addEventListener('click', () => { scale = Math.min(2.0, scale + 0.15); updateTransform(); });
    mapContainer.querySelector('#mapZoomOut')?.addEventListener('click', () => { scale = Math.max(0.35, scale - 0.15); updateTransform(); });
    mapContainer.querySelector('#mapReset')?.addEventListener('click', () => { scale = 0.85; panX = (window.innerWidth - 1200 * scale) / 2; panY = 20; updateTransform(); });

    // Wheel zoom
    viewport.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      scale = Math.max(0.35, Math.min(2.0, scale * zoomFactor));
      updateTransform();
    }, { passive: false });

    // Touch Pinch & Pan
    let isDragging = false;
    let startX = 0, startY = 0;
    let touchStartDist = 0;

    viewport.addEventListener('mousedown', (e) => {
      isDragging = true;
      startX = e.clientX - panX;
      startY = e.clientY - panY;
      viewport.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      panX = e.clientX - startX;
      panY = e.clientY - startY;
      updateTransform();
    });

    window.addEventListener('mouseup', () => {
      isDragging = false;
      if (viewport) viewport.style.cursor = 'grab';
    });

    // Touch events for mobile
    viewport.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        isDragging = true;
        startX = e.touches[0].clientX - panX;
        startY = e.touches[0].clientY - panY;
      } else if (e.touches.length === 2) {
        isDragging = false;
        touchStartDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
      }
    });

    viewport.addEventListener('touchmove', (e) => {
      if (isDragging && e.touches.length === 1) {
        panX = e.touches[0].clientX - startX;
        panY = e.touches[0].clientY - startY;
        updateTransform();
      } else if (e.touches.length === 2) {
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const factor = dist / (touchStartDist || dist);
        scale = Math.max(0.35, Math.min(2.0, scale * factor));
        touchStartDist = dist;
        updateTransform();
      }
    });

    viewport.addEventListener('touchend', () => { isDragging = false; });

    // Attach click events to circular node buttons
    mapContainer.querySelectorAll('.stage-node-circle').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const nodeData = {
          stage: Number(btn.dataset.stage),
          variant: btn.dataset.variant,
          level: Number(btn.dataset.level),
          bossName: btn.dataset.bossOverride || null,
          nodeName: btn.dataset.nodeName,
          isBoss: btn.dataset.isBoss === 'true',
          isMiniboss: btn.dataset.isMiniboss === 'true',
          color: btn.dataset.color
        };
        UIManager.showMapNodePopup(nodeData);
      });
    });

    // Draw SVG connections
    setTimeout(() => {
      this.drawWorldTreeLines(mapContainer, mapData);
    }, 50);
  }

  static drawWorldTreeLines(container, mapData) {
    const svg = container.querySelector('.world-tree-svg');
    if (!svg || !mapData) return;

    svg.setAttribute('width', 1200);
    svg.setAttribute('height', 1400);
    svg.innerHTML = '';

    const nodesById = {};
    mapData.nodes.forEach(n => { nodesById[n.id] = n; });

    let svgLines = '';
    mapData.lines.forEach(line => {
      const src = nodesById[line.from];
      const tgt = nodesById[line.to];
      if (src && tgt) {
        const color = src.color || '#38bdf8';
        const srcX = src.x;
        const srcY = src.y;
        const tgtX = tgt.x;
        const tgtY = tgt.y;

        const midY = (srcY + tgtY) / 2;
        const d = `M ${srcX} ${srcY} C ${srcX} ${midY}, ${tgtX} ${midY}, ${tgtX} ${tgtY}`;
        const dash = line.isMain ? 'none' : '6,3';
        const strokeWidth = line.isMain ? 4 : 2.5;

        svgLines += `<path d="${d}" stroke="${color}" stroke-width="${strokeWidth}" stroke-dasharray="${dash}" fill="none" opacity="0.8" style="filter: drop-shadow(0 0 6px ${color});" />`;
        svgLines += `<circle cx="${tgtX}" cy="${tgtY}" r="5" fill="${color}" />`;
      }
    });

    svg.innerHTML = svgLines;
  }

  static _doRenderEnemies() {
    const state = getGameState();
    
    // Check if player is in Limbo
    if (state.playerState?.inLimbo) {
      if (typeof PopupsManager !== 'undefined' && PopupsManager.showLimboScreen) {
        PopupsManager.showLimboScreen();
      }
      return;
    }

    // If player is on World Map (not in active level), render full-screen node-map view
    if (!state.stageState?.inActiveLevel) {
      this.renderWorldMapNodeView();
      return;
    }

    // Remove world map container if present when inside active level
    const mapContainer = document.querySelector('.world-map-container');
    if (mapContainer) mapContainer.remove();

    const layer = document.getElementById('enemyLayer');
    if (!layer) return;

    const enemies = state.stageState.enemies || [];
    const cache = this.getCircleRect();
    const rectWidth = cache.width;
    const rectHeight = cache.height;

    const centerX = rectWidth / 2;
    const centerY = rectHeight / 2;
    // Position enemies relative to circle border
    const radius = Math.min(rectWidth, rectHeight) / 2;

    if (!enemies.length) {
      this.enemyPositionsCache = [];
      if (typeof StageManager !== 'undefined' && StageManager.generateLevel) {
        const lvl = state.stageState?.level || 1;
        StageManager.generateLevel(lvl);
        return;
      }
      layer.innerHTML = '<div class="enemy-empty">No enemies yet</div>';
      return;
    }

    const petTarget = state.playerState && state.playerState.petTarget ? state.playerState.petTarget : null;
    const todayStr = (new Date()).toISOString().slice(0, 10);

    const emptyNode = layer.querySelector('.enemy-empty');
    if (emptyNode) emptyNode.remove();

    const dodgeTargets = Array.isArray(state.combatState?.dodgeTarget)
      ? state.combatState.dodgeTarget
      : (state.combatState?.dodgeTarget ? [state.combatState.dodgeTarget] : []);
    const dodgeSet = new Set(dodgeTargets.map(id => String(id)));
    const targetedId = String(state.combatState?.currentTarget ?? '');
    const petEmoji = (state.playerState && state.playerState.petEmoji) ? state.playerState.petEmoji : '🐶';

    const existingCards = new Map(
      Array.from(layer.querySelectorAll('.enemy-card')).map(card => [String(card.dataset.enemyId), card])
    );
    const activeEnemyIds = new Set();
    
    // Clear and prepare enemy positions cache
    this.enemyPositionsCache = [];

    enemies.forEach((enemy, index) => {
      const enemyId = String(enemy.id);
      activeEnemyIds.add(enemyId);

      const { ringLevel, ringIndex, totalInRing } = this.getRingInfo(index, enemies.length);
      const rawRadius = ringLevel === 0 ? (radius + 15) : (radius - 35 - (ringLevel - 1) * 45);
      const currentRadius = Math.max(radius * 0.35, rawRadius);

      const isBoss = !!enemy.isBoss;
      const now = performance.now();
      const speed = 0.00008;
      const dir = (ringLevel % 2 === 0) ? 1 : -1;
      const angle = (Math.PI * 2 * ringIndex) / totalInRing - Math.PI / 2 + (isBoss ? 0 : (dir * now * speed));
      const x = centerX + Math.cos(angle) * currentRadius;
      let y = centerY + Math.sin(angle) * currentRadius;
      if (isBoss) {
        y += 28;
      }

      // Add to positions cache
      this.enemyPositionsCache.push({
        id: enemyId,
        x,
        y,
        enemy,
        index,
        isDead: !!enemy.isDead
      });

      let card = existingCards.get(enemyId);
      if (!card) {
        card = this.createEnemyCardElement(enemyId);
        layer.appendChild(card);

        if (enemy.isBoss) {
          if (typeof RetroBossEntranceAnimation !== 'undefined' && !enemy.entrancePlayed) {
            enemy.entrancePlayed = true;
            try { state.save(); } catch (e) { }
            setTimeout(() => RetroBossEntranceAnimation.play(card), 50);
          }
        } else {
          if (typeof RetroWarpAnimation !== 'undefined' && !enemy.spawnPlayed) {
            enemy.spawnPlayed = true;
            try { state.save(); } catch (e) { }
            setTimeout(() => RetroWarpAnimation.play(card), 50);
          }
        }
      }

      this.patchEnemyCardElement(card, {
        enemy,
        x,
        y,
        isTargeted: targetedId === enemyId,
        isDodgeReady: dodgeSet.has(enemyId),
        showDodgeMarker: dodgeSet.has(enemyId),
        showPetBadge: !!(petTarget && String(petTarget.enemyId) === enemyId && petTarget.date === todayStr),
        petEmoji
      });
    });

    existingCards.forEach((card, enemyId) => {
      if (!activeEnemyIds.has(enemyId)) {
        card.remove();
      }
    });

    // Draw lines between alive enemies on the canvas
    try {
      this.drawCanvasConnections();
      
      const hasHealer = enemies.some(enemy => enemy && !enemy.isDead && ['healer','support'].includes((enemy.archetype || '').toLowerCase()));
      
      // Start dynamic canvas updating loop ONLY if not already running and there is a healer alive
      if (hasHealer && !window.enemyCanvasLoopActive) {
        window.enemyCanvasLoopActive = true;
        const tick = (ts) => {
          if (typeof AnimationRuntime !== 'undefined' && AnimationRuntime.lowPower && ts - (tick._lastDraw || 0) < 200) {
            requestAnimationFrame(tick);
            return;
          }
          tick._lastDraw = ts;
          const cv = document.getElementById('enemyCanvas');
          if (!cv) {
            window.enemyCanvasLoopActive = false;
            return;
          }
          this.drawCanvasConnections();
          
          // Continue animating only if healers are still present
          const curState = getGameState();
          const curEnemies = curState.stageState.enemies || [];
          const stillHasHealer = curEnemies.some(enemy => enemy && !enemy.isDead && ['healer','support'].includes((enemy.archetype || '').toLowerCase()));
          
          if (stillHasHealer) {
            requestAnimationFrame(tick);
          } else {
            window.enemyCanvasLoopActive = false;
          }
        };
        requestAnimationFrame(tick);
      }
    } catch (e) {
      console.warn('Failed to draw canvas connections', e);
    }

    // Continuous slow orbit rotation loop
    if (!window.enemyOrbitLoopActive && enemies.length > 0) {
      window.enemyOrbitLoopActive = true;
      const tickOrbit = () => {
        const layerEl = document.getElementById('enemyLayer');
        if (!layerEl || !layerEl.querySelector('.enemy-card')) {
          window.enemyOrbitLoopActive = false;
          return;
        }
        const curState = getGameState();
        const curEnemies = curState.stageState.enemies || [];
        if (!curEnemies.length) {
          window.enemyOrbitLoopActive = false;
          return;
        }
        
        const cache = UIManager.getCircleRect();
        const cX = cache.width / 2;
        const cY = cache.height / 2;
        const rBase = Math.min(cache.width, cache.height) / 2;
        const nowMs = performance.now();
        const rotSpeed = 0.00008;

        curEnemies.forEach((eItem, idx) => {
          if (eItem.isBoss) return; // Do not rotate bosses

          const eId = String(eItem.id);
          const cardEl = layerEl.querySelector(`.enemy-card[data-enemy-id="${eId}"]`);
          if (!cardEl) return;
          const { ringLevel, ringIndex, totalInRing } = UIManager.getRingInfo(idx, curEnemies.length);
          const rawCRadius = ringLevel === 0 ? (rBase + 15) : (rBase - 35 - (ringLevel - 1) * 45);
          const cRadius = Math.max(rBase * 0.35, rawCRadius);
          const direction = (ringLevel % 2 === 0) ? 1 : -1;
          const a = (Math.PI * 2 * ringIndex) / totalInRing - Math.PI / 2 + (direction * nowMs * rotSpeed);
          const px = cX + Math.cos(a) * cRadius;
          const py = cY + Math.sin(a) * cRadius;

          const dx = px - cX;
          const dy = py - cY;
          const isTargeted = cardEl.classList.contains('targeted-attack') ||
                             cardEl.classList.contains('targeted-skill') ||
                             cardEl.classList.contains('targeted-dodge') ||
                             cardEl.classList.contains('targeted');
          const baseScale = eItem.isElite ? 1.4 : 1.0;
          const finalScale = isTargeted ? baseScale * 1.08 : baseScale;
          const scaleStr = finalScale !== 1.0 ? ` scale(${finalScale.toFixed(2)})` : '';

          cardEl.style.left = cX + 'px';
          cardEl.style.top = cY + 'px';
          cardEl.style.willChange = 'transform';
          cardEl.style.transform = `translate3d(${dx.toFixed(2)}px, ${dy.toFixed(2)}px, 0px) translate(-50%, -50%)${scaleStr}`;

          if (cardEl._state) {
            cardEl._state.x = px;
            cardEl._state.y = py;
          }

          if (UIManager.enemyPositionsCache) {
            const cItem = UIManager.enemyPositionsCache.find(p => p.id === eId);
            if (cItem) {
              cItem.x = px;
              cItem.y = py;
            }
          }
        });
        
        requestAnimationFrame(tickOrbit);
      };
      requestAnimationFrame(tickOrbit);
    }

    // Bind click handlers to enemy cards for targeting
    this.bindEnemyTargeting();
  }

  static createEnemyCardElement(enemyId) {
    const card = document.createElement('div');
    card.className = 'enemy-card';
    card.dataset.enemyId = String(enemyId);
    card.innerHTML = `
      <div class="enemy-card-bg"></div>
      <div class="enemy-emoji"></div>
      <div class="dodge-marker" style="display:none; font-size:12px; opacity:0.6; top:-16px;">💨</div>
      <div class="pet-badge" style="display:none;"></div>
      <div class="mutator-badges" style="display:inline-block;"></div>
      <div class="enemy-name"></div>
      <div class="enemy-hpbar">
        <div class="enemy-hpfill"></div>
        <div class="enemy-hptext"></div>
      </div>
    `;
    
    // Cache references to avoid querySelector in hot render loop
    card._els = {
      emoji: card.querySelector('.enemy-emoji'),
      name: card.querySelector('.enemy-name'),
      hpFill: card.querySelector('.enemy-hpfill'),
      hpText: card.querySelector('.enemy-hptext'),
      dodgeMarker: card.querySelector('.dodge-marker'),
      petBadge: card.querySelector('.pet-badge'),
      mutatorBadges: card.querySelector('.mutator-badges')
    };
    card._state = {}; // for diffing
    
    return card;
  }

  static patchEnemyCardElement(card, data) {
    const state = getGameState();
    const { enemy, x, y, isTargeted, isDodgeReady, showDodgeMarker, showPetBadge, petEmoji } = data;
    const hpPercent = enemy.maxHp ? Math.max(0, (enemy.hp / enemy.maxHp) * 100) : 0;
    const resistColor = this.getEnemyElementColor(enemy?.resist);
    const weakColor = this.getEnemyElementColor(enemy?.weak);

    // Diff-guard main property updates
    const isBoss = !!enemy.isBoss;
    if (isBoss) {
      if (card._state.x !== x) { card.style.left = x + 'px'; card.dataset.x = x; card._state.x = x; }
      if (card._state.y !== y) { card.style.top = y + 'px'; card.dataset.y = y; card._state.y = y; }
    } else {
      const cache = UIManager.getCircleRect();
      const cX = cache.width / 2;
      const cY = cache.height / 2;
      const dx = x - cX;
      const dy = y - cY;
      const isTargetedCard = isTargeted ||
                             card.classList.contains('targeted-attack') ||
                             card.classList.contains('targeted-skill') ||
                             card.classList.contains('targeted-dodge');
      const baseScale = enemy.isElite ? 1.4 : 1.0;
      const finalScale = isTargetedCard ? baseScale * 1.08 : baseScale;
      const scaleStr = finalScale !== 1.0 ? ` scale(${finalScale.toFixed(2)})` : '';

      card.style.left = cX + 'px';
      card.style.top = cY + 'px';
      card.style.willChange = 'transform';
      card.style.transform = `translate3d(${dx.toFixed(2)}px, ${dy.toFixed(2)}px, 0px) translate(-50%, -50%)${scaleStr}`;
      card.dataset.x = x;
      card.dataset.y = y;
      card._state.x = x;
      card._state.y = y;
    }
    if (card._state.resistColor !== resistColor) { card.style.setProperty('--enemy-resist-color', resistColor); card._state.resistColor = resistColor; }
    if (card._state.weakColor !== weakColor) { card.style.setProperty('--enemy-weak-color', weakColor); card._state.weakColor = weakColor; }

    const deadClass = !!enemy.isDead;
    if (card._state.deadClass !== deadClass) { card.classList.toggle('dead', deadClass); card._state.deadClass = deadClass; }
    
    const eliteClass = !!enemy.isElite;
    if (card._state.eliteClass !== eliteClass) { card.classList.toggle('elite', eliteClass); card._state.eliteClass = eliteClass; }
    
    const bossClass = !!enemy.isBoss;
    if (card._state.bossClass !== bossClass) { card.classList.toggle('boss', bossClass); card._state.bossClass = bossClass; }
    
    const targetedClass = !!isTargeted;
    if (card._state.targetedClass !== targetedClass) { card.classList.toggle('targeted', targetedClass); card._state.targetedClass = targetedClass; }
    
    const dodgeReadyClass = !!isDodgeReady;
    if (card._state.dodgeReadyClass !== dodgeReadyClass) { card.classList.toggle('dodge-ready', dodgeReadyClass); card._state.dodgeReadyClass = dodgeReadyClass; }
    
    const enragedClass = !enemy.isDead && (enemy.daysAlive > 0);
    if (card._state.enragedClass !== enragedClass) { card.classList.toggle('enraged', enragedClass); card._state.enragedClass = enragedClass; }

    const isPhase2 = !!(enemy.isBoss && (
      (state.stageState.bossData && state.stageState.bossData.phase === 2) ||
      (enemy.maxHp > 0 && enemy.hp / enemy.maxHp <= 0.4)
    ));
    if (card._state.isPhase2 !== isPhase2) { card.classList.toggle('boss-phase-2', isPhase2); card._state.isPhase2 = isPhase2; }
    
    if (enemy.isBoss) {
      const bossColor = (state.config.bosses && state.config.bosses[enemy.name]?.color) || '#ff2222';
      if (card._state.bossColor !== bossColor) { card.style.setProperty('--boss-color', bossColor); card._state.bossColor = bossColor; }
    }

    const archLower = (enemy.archetype || '').toLowerCase();
    const shapeClass = archLower === 'fodder' || archLower === 'mana drain' ? 'arch-circle'
      : archLower === 'brute' ? 'arch-triangle'
      : archLower === 'support' || archLower === 'healer' ? 'arch-diamond'
      : archLower === 'protector' ? 'arch-square'
      : archLower === 'commander' ? 'arch-hexagon' : '';

    if (card._state.shapeClass !== shapeClass) {
      card.classList.remove('arch-circle', 'arch-triangle', 'arch-diamond', 'arch-square', 'arch-hexagon');
      if (shapeClass) card.classList.add(shapeClass);
      card._state.shapeClass = shapeClass;
    }

    const els = card._els || {};

    const newEmoji = this.getEnemyEmoji(enemy);
    if (els.emoji && card._state.emoji !== newEmoji) { els.emoji.textContent = newEmoji; card._state.emoji = newEmoji; }

    if (els.name && card._state.name !== enemy.name) { els.name.textContent = enemy.name; card._state.name = enemy.name; }

    const newHpWidth = hpPercent + '%';
    if (els.hpFill && card._state.hpWidth !== newHpWidth) { els.hpFill.style.width = newHpWidth; card._state.hpWidth = newHpWidth; }

    const newHpText = `${Math.ceil(enemy.hp || 0)}/${Math.ceil(enemy.maxHp || 0)}`;
    if (els.hpText && card._state.hpText !== newHpText) { els.hpText.textContent = newHpText; card._state.hpText = newHpText; }

    if (els.dodgeMarker && card._state.showDodgeMarker !== showDodgeMarker) { 
      els.dodgeMarker.style.display = showDodgeMarker ? '' : 'none'; 
      card._state.showDodgeMarker = showDodgeMarker; 
    }

    if (els.petBadge) {
      if (card._state.showPetBadge !== showPetBadge) {
        els.petBadge.style.display = showPetBadge ? '' : 'none';
        card._state.showPetBadge = showPetBadge;
      }
      if (showPetBadge && card._state.petEmoji !== petEmoji) {
        els.petBadge.textContent = petEmoji;
        card._state.petEmoji = petEmoji;
      }
    }

    // Mutator badges
    try {
      this.renderMutatorBadges(card, enemy);
    } catch (e) {
      console.warn('Failed to render mutator badges', e);
    }

    try {
      this.renderBossOrbit(card, enemy);
    } catch (e) {
      console.warn('Failed to render boss orbit', e);
    }

        // Dynamic archetype & mutator indicators
    try {
      const archetypeStr = (enemy.archetype || '').toLowerCase();
      const hasVampiric = enemy.mutators && enemy.mutators.includes('vampiric');
      const hasRegen = enemy.mutators && enemy.mutators.includes('regenerator');
      const hasRallyist = enemy.mutators && enemy.mutators.includes('rallyist');
      const hasSwift = enemy.mutators && enemy.mutators.includes('swift');
      const hasNecro = enemy.mutators && enemy.mutators.includes('necromancer');

      if (enemy && !enemy.isDead) {
        // 1. Brute archetype
        if (archetypeStr === 'brute') {
          if (!card._state.archBrute) { card.classList.add('archetype-brute'); card._state.archBrute = true; }
          const combo = enemy.consecutiveAttackDays || 0;
          if (card._state.bruteCombo !== combo) { card.style.setProperty('--brute-combo', combo); card._state.bruteCombo = combo; }
        } else {
          if (card._state.archBrute) { card.classList.remove('archetype-brute'); card.style.removeProperty('--brute-combo'); card._state.archBrute = false; card._state.bruteCombo = -1; }
        }

        // 2. Mana Drain archetype
        if (archetypeStr === 'mana drain' || archetypeStr === 'fodder') {
          if (!card._els.manaDrain) {
            card._els.manaDrain = document.createElement('div');
            card._els.manaDrain.className = 'mana-drain-circle';
            card.appendChild(card._els.manaDrain);
          }
        } else {
          if (card._els.manaDrain) { card._els.manaDrain.remove(); card._els.manaDrain = null; }
        }

        // 3. Vampiric mutator (Tripled: 12 heart spans)
        if (hasVampiric) {
          if (!card._els.vampParticles) {
            card._els.vampParticles = document.createElement('div');
            card._els.vampParticles.className = 'vampiric-particles';
            for (let i = 0; i < 12; i++) {
              const span = document.createElement('span');
              span.textContent = '❤️';
              const angle = Math.random() * Math.PI * 2;
              const distance = 50 + Math.random() * 70;
              const dx = Math.cos(angle) * distance;
              const dy = Math.sin(angle) * distance;
              span.style.setProperty('--dx', `${dx.toFixed(1)}px`);
              span.style.setProperty('--dy', `${dy.toFixed(1)}px`);
              span.style.animationDelay = `${(i * 0.25).toFixed(2)}s`;
              card._els.vampParticles.appendChild(span);
            }
            card.appendChild(card._els.vampParticles);
          }
        } else {
          if (card._els.vampParticles) { card._els.vampParticles.remove(); card._els.vampParticles = null; }
        }

        // 4. Regenerator mutator
        if (hasRegen) {
          if (!card._els.regenSquare) {
            card._els.regenSquare = document.createElement('div');
            card._els.regenSquare.className = 'regenerator-square';
            card.appendChild(card._els.regenSquare);
          }
        } else {
          if (card._els.regenSquare) { card._els.regenSquare.remove(); card._els.regenSquare = null; }
        }

        // 5. Rallyist mutator
        if (hasRallyist) {
          if (!card._state.mutRally) { card.classList.add('mutator-rallyist'); card._state.mutRally = true; }
        } else {
          if (card._state.mutRally) { card.classList.remove('mutator-rallyist'); card._state.mutRally = false; }
        }

        // 6. Swift mutator
        if (hasSwift) {
          if (!card._els.swiftCircle) {
            card._els.swiftCircle = document.createElement('div');
            card._els.swiftCircle.className = 'swift-circle';
            card.appendChild(card._els.swiftCircle);
          }
        } else {
          if (card._els.swiftCircle) { card._els.swiftCircle.remove(); card._els.swiftCircle = null; }
        }

        // 7. Necromancer mutator (Tripled: 12 skull spans)
        if (hasNecro) {
          if (!card._els.necroParticles) {
            card._els.necroParticles = document.createElement('div');
            card._els.necroParticles.className = 'necromancer-particles';
            for (let i = 0; i < 12; i++) {
              const span = document.createElement('span');
              span.textContent = '💀';
              const angle = Math.random() * Math.PI * 2;
              const distance = 50 + Math.random() * 70;
              const dx = Math.cos(angle) * distance;
              const dy = Math.sin(angle) * distance;
              span.style.setProperty('--dx', `${dx.toFixed(1)}px`);
              span.style.setProperty('--dy', `${dy.toFixed(1)}px`);
              span.style.animationDelay = `${(i * 0.25).toFixed(2)}s`;
              card._els.necroParticles.appendChild(span);
            }
            card.appendChild(card._els.necroParticles);
          }
        } else {
          if (card._els.necroParticles) { card._els.necroParticles.remove(); card._els.necroParticles = null; }
        }
      } else {
        // Clean up everything if dead
        if (card._state.archBrute) { card.classList.remove('archetype-brute'); card.style.removeProperty('--brute-combo'); card._state.archBrute = false; }
        if (card._state.mutRally) { card.classList.remove('mutator-rallyist'); card._state.mutRally = false; }

        if (card._els.manaDrain) { card._els.manaDrain.remove(); card._els.manaDrain = null; }
        if (card._els.vampParticles) { card._els.vampParticles.remove(); card._els.vampParticles = null; }
        if (card._els.regenSquare) { card._els.regenSquare.remove(); card._els.regenSquare = null; }
        if (card._els.swiftCircle) { card._els.swiftCircle.remove(); card._els.swiftCircle = null; }
        if (card._els.necroParticles) { card._els.necroParticles.remove(); card._els.necroParticles = null; }
      }
    } catch (err) {
      console.warn('Failed to render dynamic indicators:', err);
    }
  }

  static drawCanvasConnections() {
    const canvas = document.getElementById('enemyCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const rect = this.getCircleRect();
    const rectWidth = rect.width;
    const rectHeight = rect.height;
    if (canvas.width !== rectWidth || canvas.height !== rectHeight) {
      canvas.width = rectWidth;
      canvas.height = rectHeight;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const alivePositions = [];
    const idToPos = new Map();

    if (this.enemyPositionsCache) {
      this.enemyPositionsCache.forEach(pos => {
        if (!pos.isDead) {
          alivePositions.push(pos);
          idToPos.set(pos.id, pos);
        }
      });
    }

    if (!alivePositions.length) {
      return;
    }

    // 1. Red web connection lines removed per request

    // 2. Draw Healer zigzag green lines
    alivePositions.forEach(pos => {
      const arch = (pos.enemy.archetype || '').toLowerCase();
      if (arch === 'healer' || arch === 'support') {
        let lowestHpEnemy = null;
        let lowestHp = Infinity;
        alivePositions.forEach(other => {
          if (other.id !== pos.id && other.enemy.hp < lowestHp) {
            lowestHp = other.enemy.hp;
            lowestHpEnemy = other;
          }
        });

        if (lowestHpEnemy) {
          this.drawZigzagLine(ctx, pos.x, pos.y, lowestHpEnemy.x, lowestHpEnemy.y);
        }
      }
    });

    // 3. Draw Protector thick lines to adjacent living enemies
    alivePositions.forEach(pos => {
      const arch = (pos.enemy.archetype || '').toLowerCase();
      if (arch === 'protector') {
        const state = getGameState();
        const enemies = state.stageState.enemies || [];
        const adjacent = (typeof EnemyManager !== 'undefined' && EnemyManager.getAdjacentEnemies)
          ? EnemyManager.getAdjacentEnemies(enemies, pos.index)
          : [];
        adjacent.forEach(adjEnemy => {
          const adjPos = idToPos.get(String(adjEnemy.id));
          if (adjPos) {
            ctx.strokeStyle = 'rgba(59, 130, 246, 0.95)'; // Bright blue protection link
            ctx.lineWidth = 6; // Thick bold line
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y);
            ctx.lineTo(adjPos.x, adjPos.y);
            ctx.stroke();
          }
        });
      }
    });
  }

  static drawZigzagLine(ctx, x1, y1, x2, y2) {
    ctx.strokeStyle = '#4ade80'; // Thicker and brighter lime-green energy color
    ctx.lineWidth = 3.5; // Bold healer line
    ctx.lineJoin = 'miter';
    ctx.beginPath();

    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    const segments = Math.max(5, Math.floor(distance / 15));
    
    const px = -dy / distance;
    const py = dx / distance;
    
    ctx.moveTo(x1, y1);
    
    for (let i = 1; i < segments; i++) {
      const t = i / segments;
      const lx = x1 + dx * t;
      const ly = y1 + dy * t;
      
      const timeFactor = Date.now() * 0.008;
      const offsetAmp = 6;
      const sign = (i % 2 === 0) ? 1 : -1;
      const offset = sign * offsetAmp * (0.6 + 0.4 * Math.sin(timeFactor + i));
      
      ctx.lineTo(lx + px * offset, ly + py * offset);
    }
    
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  static bindEnemyTargeting() {
    const layer = document.getElementById('enemyLayer');
    if (!layer) return;

    if (layer.dataset.enemyTargetBound === '1') return;
    layer.dataset.enemyTargetBound = '1';

    layer.addEventListener('pointerover', (event) => {
      const card = event.target.closest('.enemy-card');
      if (!card || !layer.contains(card) || card.classList.contains('dead')) return;
      this.setHoveredEnemyId(card.dataset.enemyId);
    });

    layer.addEventListener('pointerout', (event) => {
      const card = event.target.closest('.enemy-card');
      if (!card || !layer.contains(card)) return;
      const relatedCard = event.relatedTarget ? event.relatedTarget.closest?.('.enemy-card') : null;
      if (relatedCard && relatedCard === card) return;

      const state = getGameState();
      const hoveredEnemyId = String(state.combatState?.hoveredEnemyId || '');
      if (hoveredEnemyId === String(card.dataset.enemyId)) {
        this.setHoveredEnemyId(null);
      }
    });

    layer.addEventListener('click', (event) => {
      const card = event.target.closest('.enemy-card');
      if (!card || !layer.contains(card) || card.classList.contains('dead')) return;

      const enemyId = card.dataset.enemyId;

      const state = getGameState();
      if (state && state.combatState) {
        state.combatState.currentTarget = enemyId;
      }

      document.querySelectorAll('.enemy-card').forEach(c => c.classList.remove('targeted-attack'));
      card.classList.add('targeted-attack');

      // Pop up enemy info on card click
      try { UIManager.showMutatorPopup(enemyId); } catch (e) { console.warn('showMutatorPopup failed', e); }
    });

    layer.addEventListener('contextmenu', (event) => {
      const card = event.target.closest('.enemy-card');
      if (!card || !layer.contains(card) || card.classList.contains('dead')) return;
      event.preventDefault();
      const enemyId = card.dataset.enemyId;
      try { UIManager.showMutatorPopup(enemyId); } catch (e) { console.warn('showMutatorPopup failed', e); }
    });
  }

  static getEnemyEmoji(enemy) {
    const name = (enemy?.name || '').toLowerCase();
    const archetype = (enemy?.archetype || '').toLowerCase();

    // Bosses
    if (name.includes('demon')) return '😈';
    if (name.includes('mummified marcher')) return '🧟';
    if (name.includes('crimson wizard')) return '🧙';
    if (name.includes('worm eater')) return '🪱';
    if (name.includes('jade giant')) return '🗿';
    if (name.includes('star computer')) return '💻';
    if (name.includes('angel')) return '😇';
    if (name.includes('killer queen')) return '👸';
    if (name.includes('satan\'s shark')) return '🦈';
    if (name.includes('fire turtle')) return '🐢';
    if (name.includes('banished king')) return '🤴';
    if (name.includes('the sun')) return '☀️';
    if (name.includes('nemesis')) return '👾';

    // Mobs
    if (name.includes('gorilla')) return '🦍';
    if (name.includes('wolf') || name.includes('hound')) return '🐺';
    if (name.includes('goblin wizard')) return '🧙';
    if (name.includes('goblin')) return '👺';
    if (name.includes('bear')) return '🐻';
    if (name.includes('lion')) return '🦁';
    if (name.includes('marcher')) return '🧟';
    if (name.includes('beetle') || name.includes('termite') || name.includes('insect')) return '🪲';
    if (name.includes('guardian') || name.includes('knight') || name.includes('paladin') || name.includes('sentry')) return '🛡️';
    if (name.includes('drone')) return '🛸';
    if (name.includes('raptor')) return '🦖';
    if (name.includes('tarantulator') || name.includes('spider') || name.includes('scorpion')) return '🕷️';
    if (name.includes('brain')) return '🧠';
    if (name.includes('sorcerer') || name.includes('mage') || name.includes('wizard') || name.includes('priest')) return '🧙';
    if (name.includes('death bringer') || name.includes('death')) return '☠️';
    if (name.includes('leech') || name.includes('slug') || name.includes('worm')) return '🪱';
    if (name.includes('plagued')) return '🤢';
    if (name.includes('frog')) return '🐸';
    if (name.includes('zombie')) return '🧟';
    if (name.includes('croc')) return '🐊';
    if (name.includes('yeti smasher') || name.includes('yeti')) return '❄️';
    if (name.includes('spirit') || name.includes('ghost') || name.includes('specter') || name.includes('wraith')) return '👻';
    if (name.includes('lizard') || name.includes('snake') || name.includes('serpent')) return '🐍';
    if (name.includes('golem')) return '🗿';
    if (name.includes('turret')) return '🗼';
    if (name.includes('skeleton') || name.includes('flying skull') || name.includes('bone') || name.includes('skull')) return '💀';
    if (name.includes('coffin')) return '⚰️';
    if (name.includes('ferryman')) return '🚣';
    if (name.includes('dragon') || name.includes('wyvern') || name.includes('drake') || name.includes('wyrm') || name.includes('hydra')) return '🐉';
    if (name.includes('magma') || name.includes('blob') || name.includes('slime') || name.includes('jelly')) return '🧪';
    if (name.includes('ninja')) return '🥷';
    if (name.includes('master')) return '🥋';
    if (name.includes('dwarf')) return '🧔';
    if (name.includes('driller')) return '⚙️';
    if (name.includes('atom')) return '⚛️';
    if (name.includes('kraken')) return '🦑';
    if (name.includes('crusher')) return '🌌';
    if (name.includes('shark') || name.includes('megalodon')) return '🦈';
    if (name.includes('bat')) return '🦇';
    if (name.includes('porcupine')) return '🦔';
    if (name.includes('phoenix')) return '🔥';
    if (name.includes('bomb')) return '💣';

    // Fallbacks
    if (enemy?.isBoss) return '👑';
    if (archetype === 'commander') return '👑';
    if (archetype === 'brute') return '💥';
    if (archetype === 'support' || archetype === 'healer') return '💚';
    if (archetype === 'protector') return '🛡️';
    if (archetype === 'fodder' || archetype === 'mana drain') return '💀';
    return '☠️';
  }

  static getWeaponIconHtml(weaponName, fallbackIcon = '⚔️') {
    const state = typeof getGameState === 'function' ? getGameState() : null;
    const imgPath = state?.config?.weaponImages?.[weaponName] || DEFAULT_GAME_CONFIG?.weaponImages?.[weaponName];
    if (imgPath) {
      return `<img src="${imgPath}" alt="${weaponName}" class="weapon-img-icon" />`;
    }
    const weaponCfg = state?.config?.weapons?.[weaponName];
    const icon = weaponCfg?.icon || state?.config?.shopItemIcons?.[weaponName] || fallbackIcon;
    return icon;
  }

  static updateWeaponIcons() {
    const strip = document.getElementById('weaponStrip');
    if (!strip) return;

    const state = getGameState();
    let html = '';
    html += (state.playerState.weapons || []).map((weaponName, index) => {
      const activeClass = (index === state.playerState.activeWeapon) ? 'active' : '';
      const weaponElement = state.playerState.weaponElements?.[index] || '';
      if (!weaponName) {
        return `<div class="weapon-chip-wrap"><button class="weapon-chip empty" disabled>—</button></div>`;
      }
      const weaponIcon = UIManager.getWeaponIconHtml(weaponName);
      
      let bgColor = '';
      if (weaponElement) {
        switch (weaponElement.toLowerCase()) {
          case 'fire': bgColor = '#7f1d1d'; break;
          case 'water': bgColor = '#0c4a6e'; break;
          case 'earth': bgColor = '#14532d'; break;
          case 'air': bgColor = '#164e63'; break;
          case 'aether': bgColor = '#4c1d95'; break;
        }
      }
      
      const bgStyle = bgColor ? `style="background-color: ${bgColor} !important;"` : '';
      
      let titleText = `${weaponName}`;
      if (weaponElement) titleText += ` [${weaponElement}]`;
      const config = state.config.weapons?.[weaponName];
      if (config) {
        titleText += `\nAP Cost: ${config.apCost || 0}`;
        titleText += `\nDamage Mult: ${config.dmgMult || 1.0}`;
        if (config.critRate) titleText += `\nCrit: ${(config.critRate * 100).toFixed(0)}%`;
      }
      titleText += `\n(Double-click to open Smith)`;

      const weaponLabel = `<span style="font-size: 1.5em; display:flex; align-items:center; justify-content:center; width:100%; height:100%;">${weaponIcon}</span>`;

      return `<div class="weapon-chip-wrap"><button class="weapon-chip ${activeClass}" data-slot="${index}" data-weapon="${weaponName}" title="${titleText}" ${bgStyle}>${weaponLabel}</button></div>`;
    }).join('');

    // Render Talismans in the same strip
    html += (state.playerState.talismans || []).map((talismanName) => {
      const config = state.config.talismans?.[talismanName];
      const icon = config?.icon || '🧿';
      return `<div class="weapon-chip-wrap"><button class="weapon-chip talisman-chip" data-talisman="${talismanName}" title="${config?.description || talismanName}">${icon} ${talismanName}</button></div>`;
    }).join('');

    strip.innerHTML = html;

    const container = strip.parentElement;
    let isDragging = false;
    let startX = 0, startY = 0, initialLeft = 0, initialTop = 0;
    let latestX = 0, latestY = 0;
    let rafId = null;

    const onPointerDown = (e) => {
      if (e.target.closest('button, input, textarea, select, a, .weapon-chip, .weapon-upgrade-btn')) return;
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      isDragging = true;
      container.classList.add('is-dragging');
      startX = e.clientX;
      startY = e.clientY;
      const rect = container.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;
      container.style.right = 'auto';
      container.style.bottom = 'auto';
      container.style.left = initialLeft + 'px';
      container.style.top = initialTop + 'px';
      try { strip.setPointerCapture(e.pointerId); } catch (err) { }
    };

    const onPointerMove = (e) => {
      if (!isDragging) return;
      e.preventDefault();
      latestX = e.clientX;
      latestY = e.clientY;

      if (!rafId) {
        rafId = requestAnimationFrame(() => {
          const dx = latestX - startX;
          const dy = latestY - startY;
          let newLeft = initialLeft + dx;
          let newTop = initialTop + dy;

          const rect = container.getBoundingClientRect();
          const maxX = window.innerWidth - rect.width;
          const maxY = window.innerHeight - rect.height;
          newLeft = Math.max(0, Math.min(newLeft, maxX));
          newTop = Math.max(0, Math.min(newTop, maxY));

          container.style.left = newLeft + 'px';
          container.style.top = newTop + 'px';
          rafId = null;
        });
      }
    };

    const onPointerUp = (e) => {
      if (!isDragging) return;
      isDragging = false;
      container.classList.remove('is-dragging');
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      try { strip.releasePointerCapture(e.pointerId); } catch (err) { }
      localStorage.setItem('nemesis_weapon_pos', JSON.stringify({
        left: parseInt(container.style.left, 10) || 0,
        top: parseInt(container.style.top, 10) || 0
      }));
    };

    if (strip) {
      strip.addEventListener('pointerdown', onPointerDown);
      strip.addEventListener('pointermove', onPointerMove);
      strip.addEventListener('pointerup', onPointerUp);
      strip.addEventListener('pointercancel', onPointerUp);
    }

    // Click to switch weapon, double click to upgrade
    strip.querySelectorAll('.weapon-chip[data-slot]').forEach(btn => {
      btn.addEventListener('click', () => {
        const slot = Number(btn.dataset.slot);
        PlayerManager.switchWeapon(slot);
        this.updateWeaponIcons();
        this.updateActionCosts();
        getGameState().save();
      });
      btn.addEventListener('dblclick', (e) => {
        const weapon = e.currentTarget.dataset.weapon;
        if (!weapon) return;
        try {
          if (typeof PopupsManager !== 'undefined' && PopupsManager && typeof PopupsManager.showWeaponUpgrade === 'function') {
            PopupsManager.showWeaponUpgrade(weapon);
          }
        } catch (err) { console.warn('Failed to open weapon upgrade popup', err); }
      });
    });

    // Click Talisman -> show details popup
    strip.querySelectorAll('.talisman-chip').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const talisman = e.currentTarget.dataset.talisman;
        const index = Array.from(strip.querySelectorAll('.talisman-chip')).indexOf(e.currentTarget);
        try {
          if (typeof PopupsManager !== 'undefined' && typeof PopupsManager.showTalismanDetail === 'function') {
            PopupsManager.showTalismanDetail(talisman, index);
          } else {
            // Fallback discard confirmation if PopupsManager is unavailable
            if (confirm(`Discard ${talisman}? This frees up a slot for a new Talisman.`)) {
              const state = getGameState();
              if (state.playerState.talismans) {
                state.playerState.talismans.splice(index, 1);
                state.save();
                this.refreshGameUI();
              }
            }
          }
        } catch (err) { console.warn('Failed to open talisman detail popup', err); }
      });
    });

    this.positionWeaponStrip();
    this.updateActionCosts();
  }

  static positionWeaponStrip() {
    const strip = document.getElementById('weaponStrip');
    if (!strip) return;
    const container = strip.parentElement;

    const savedPos = localStorage.getItem('nemesis_weapon_pos');
    if (savedPos) {
      try {
        const { left, top } = JSON.parse(savedPos);
        container.style.bottom = 'auto';
        container.style.right = 'auto';
        container.style.left = left + 'px';
        container.style.top = top + 'px';
        return;
      } catch (e) { }
    }

    container.style.bottom = '240px';
    container.style.left = '16px';
    container.style.top = 'auto';
  }

  static updateActionCosts() {
    const state = getGameState();
    const weapon = PlayerManager.getCurrentWeapon();
    const attackCost = weapon ? new WeaponAttack(weapon.name).getScaledApCost() : 0;
    const dodgeText = document.getElementById('dodgeCostText');
    if (dodgeText) dodgeText.textContent = '';
    this.updateActionButtons();

    const attackBtn = document.getElementById('attackBtn');
    if (attackBtn) {
      const weaponIconHtml = weapon ? UIManager.getWeaponIconHtml(weapon.name) : '⚔️';
      let iconEl = document.getElementById('attackIcon');
      if (!iconEl) {
        iconEl = document.createElement('span');
        iconEl.id = 'attackIcon';
        attackBtn.insertBefore(iconEl, attackBtn.firstChild);
      }
      iconEl.innerHTML = weaponIconHtml;
    }
  }

  static updateDateDisplay() {
    const el = document.getElementById('dateDisplay');
    if (!el) return;

    const now = new Date();
    const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
    const dateStr = now.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
    el.innerHTML = `<div>${dayName}</div><div>${dateStr}</div>`;
  }

  static updateStageIndicator() {
    // Stage indicator removed from UI
  }

  static updateNemesisAggressionRings() {
    const container = document.querySelector('.enemy-circle-container');
    if (!container) return;

    // Remove existing rings to rebuild them
    container.querySelectorAll('.nemesis-aggression-ring').forEach(el => el.remove());

    const state = getGameState();
    const days = state.stageState?.daysOnLevel || 0;
    
    // Each day gets a thin outline ring, say up to 5 rings
    for (let i = 1; i <= Math.min(days, 5); i++) {
      const ring = document.createElement('div');
      ring.className = 'nemesis-aggression-ring';
      const spacing = i * 12; // 12px, 24px, 36px, etc.
      ring.style.cssText = `
        position: absolute;
        inset: -${spacing}px;
        border: 1px solid rgba(161, 92, 255, ${0.8 - i * 0.12});
        border-radius: 50%;
        pointer-events: none;
        box-shadow: 0 0 8px rgba(161, 92, 255, ${0.4 - i * 0.06});
        animation: aggressionGlow 3s ease-in-out infinite alternate;
        z-index: 1;
      `;
      container.appendChild(ring);
    }
  }

  static async playChainMutationAnimation(sourceId, targetId) {
    const sourceCard = document.querySelector(`.enemy-card[data-enemy-id="${sourceId}"]`);
    const targetCard = document.querySelector(`.enemy-card[data-enemy-id="${targetId}"]`);
    if (!sourceCard || !targetCard) return;

    const getCenter = (card) => {
      const rect = card.getBoundingClientRect();
      return {
        x: rect.left + rect.width / 2 + window.scrollX,
        y: rect.top + rect.height / 2 + window.scrollY
      };
    };

    const start = getCenter(sourceCard);
    const end = getCenter(targetCard);

    const orb = document.createElement('div');
    orb.className = 'chain-mutation-orb';
    orb.style.cssText = `
      position: absolute;
      width: 24px;
      height: 24px;
      border: 3px solid #a15cff;
      background: rgba(161, 92, 255, 0.45);
      border-radius: 50%;
      pointer-events: none;
      z-index: 100000;
      transform: translate(-50%, -50%);
      box-shadow: 0 0 15px #a15cff, inset 0 0 8px #a15cff;
      left: ${start.x}px;
      top: ${start.y}px;
    `;
    document.body.appendChild(orb);

    const duration = 400; // ms per trip
    
    try { SoundManager.play('mutate'); } catch (e) {}

    const animateTrip = (from, to) => {
      return orb.animate([
        { left: `${from.x}px`, top: `${from.y}px`, transform: 'translate(-50%, -50%) scale(1)' },
        { left: `${(from.x + to.x)/2}px`, top: `${(from.y + to.y)/2}px`, transform: 'translate(-50%, -50%) scale(1.4)' },
        { left: `${to.x}px`, top: `${to.y}px`, transform: 'translate(-50%, -50%) scale(1)' }
      ], {
        duration: duration,
        easing: 'ease-in-out'
      }).finished;
    };

    await animateTrip(start, end);
    await animateTrip(end, start);
    await animateTrip(start, end);

    orb.remove();
  }

  static refreshGameUI() {
    // Coalesce multiple consecutive calls into a single microtask
    if (this._refreshScheduled) return;
    this._refreshScheduled = true;
    queueMicrotask(() => {
      this._refreshScheduled = false;
      this._doRefreshGameUI();
    });
  }

  static _doRefreshGameUI() {
    this.updateStageBackdrop();
    this.updateWeaponIcons();
    try { this.refreshEventBanner(); } catch (e) { }
    this.updateDateDisplay();
    this.updateStageIndicator();
    this.renderEnemies();
    try { this.updateNemesisAggressionRings(); } catch (e) { }
    this.updateRunCompletionGraph();
    try { this.updateWeeklyHeatmap(); } catch (e) { }
    try { this.updateConsistencyBtn(); } catch (e) { }
    try { if (window.StatsHUD && typeof StatsHUD.update === 'function') StatsHUD.update(); } catch (e) { console.warn('StatsHUD update failed', e); }
    try { this.updateNemesisTauntHud(); } catch (e) { console.warn('Nemesis taunt update failed', e); }
    try { this.updateChallengeHud(); } catch (e) { console.warn('Challenge HUD update failed', e); }
    try { this.updateScoreHud(); } catch (e) { console.warn('Score HUD update failed', e); }
    // Consumables and buffs are part of the HUD and must update here
    try { this.updateConsumableStrip && this.updateConsumableStrip(); } catch (e) { }
    try { this.renderBuffPanel && this.renderBuffPanel(); } catch (e) { }
    try { this.positionSatchelPanel && this.positionSatchelPanel(); } catch (e) { }
    // Update central level indicator
    try {
      const el = document.getElementById('levelIndicator');
      const state = getGameState();
      if (el && state && state.stageState) {
        const level = String(state.stageState.level || 1);
        const levelText = `LVL ${level}`;
        // Avoid redundant DOM writes by checking current content first.
        if (el.textContent !== levelText) el.textContent = levelText;
      }
    } catch (e) { }
    // Ensure resource HUD shows current values immediately
    try {
      const state = getGameState();
      this.updateHpBar({ oldHp: state.playerState?.hp, newHp: state.playerState?.hp, maxHp: state.playerState?.maxHp });
      this.updateManaBar({ oldMana: state.playerState?.mana, newMana: state.playerState?.mana, maxMana: state.playerState?.maxMana });
      this.updateApBar({ oldAp: state.playerState?.ap, newAp: state.playerState?.ap, maxAp: state.playerState?.maxAp });
      this.updateGoldDisplay({ oldGold: state.playerState?.gold, newGold: state.playerState?.gold });
      this.updateDiamondDisplay({ oldDiamonds: state.playerState?.diamonds, newDiamonds: state.playerState?.diamonds });
      this.updateLootboxKeysDisplay({ oldKeys: state.playerState?.lootboxKeys, newKeys: state.playerState?.lootboxKeys });

      this.updatePendingDamageDisplay();
    } catch (e) {
      console.warn('refreshGameUI: failed to sync resources', e);
    }
    this.scheduleUpdateDailiesList();
    this.updateTodosList();
    this.updateDeathDefianceBadge();
    this.updatePauseBtn();
    this.updateTaskVisibilityToggleLabels();
    try { this.updateJoystickUI(); } catch (e) { }
    this.updateTabIndicators();
  }

  static refreshEventBanner() {
    const banner = document.getElementById('eventBannerPanel');
    if (!banner) return;

    const state = getGameState();
    const event = state.systemState.specialEvent;

    if (!event || event.claimed) {
      banner.style.display = 'none';
      return;
    }

    banner.style.display = 'flex';

    const emojiEl = document.getElementById('eventBannerEmoji');
    const slotsEl = document.getElementById('eventBannerSlots');

    let emojiIcon = '⛩️';
    if (event.type === 'Shrine') {
      emojiIcon = '⛩️';
    } else if (event.type === 'Statue') {
      emojiIcon = '🗿';
    } else if (event.type === 'Sacred Tree') {
      emojiIcon = '🌳';
    }
    if (emojiEl) emojiEl.textContent = emojiIcon;

    let isComplete = false;
    let slotsHtml = '';

    const eventUnlockMap = {
      'Sacred Tree': { key: 'sacredTree', streak: 5 },
      'Statue': { key: 'statue', streak: 8 },
      'Shrine': { key: 'shrine', streak: 9 }
    };
    const req = eventUnlockMap[event.type];
    const isEventUnlocked = req && typeof TaskManager !== 'undefined' && typeof TaskManager.isFeatureUnlocked === 'function'
      ? TaskManager.isFeatureUnlocked(req.key)
      : true;

    if (!isEventUnlocked && req) {
      if (slotsEl) {
        slotsEl.innerHTML = `
          <div class="event-task-slot locked-event-slot" style="color: var(--accent-gold, #ffd700); font-weight: bold; font-size: 11px; padding: 4px 10px; border: 1px solid var(--accent-gold, #ffd700); border-radius: 6px; background: rgba(0,0,0,0.4);">
            🔒 Unlocks at Streak ${req.streak}
          </div>
        `;
      }
      if (emojiEl) {
        emojiEl.classList.remove('ready');
        emojiEl.title = `Unlocks at Streak ${req.streak}`;
      }
      return;
    }

    const attrColors = state.config?.attributeColors || {
      STR: '#ff4d4d', DISC: '#4d94ff', RESP: '#00e5ff', SOC: '#ff9933', CAP: '#ffd700', CREA: '#cc66ff', INT: '#33cc66'
    };

    if (event.type === 'Shrine') {
      const activeDailies = state.dailiesState?.dailies || [];
      isComplete = TaskManager.isAllDailiesComplete() && activeDailies.length > 0;
      slotsHtml = `
        <div class="event-task-slot shrine-slot ${isComplete ? 'completed' : ''}">
          everything
        </div>
      `;
    } else if (event.type === 'Statue' || event.type === 'Sacred Tree') {
      const targets = event.targets || [];
      const missed = TaskManager.getMissedDailies().map(d => d.id);
      isComplete = targets.length > 0 && targets.every(t => !missed.includes(t));

      slotsHtml = targets.map(targetId => {
        const daily = (state.dailiesState?.dailies || []).find(d => d.id === targetId);
        if (daily) {
          const isDone = !missed.includes(targetId) && !!daily.completed;
          const attrKey = (daily.attribute || 'STR').toUpperCase();
          const dailyColor = attrColors[attrKey] || '#e8b84a';
          return `
            <div class="event-task-slot ${isDone ? 'completed' : ''}" style="--slot-color: ${dailyColor}; border-color: ${dailyColor}; color: ${dailyColor};" title="${daily.name}">
              <span class="slot-status">${isDone ? '✓' : '○'}</span>
              <span class="slot-name">${daily.name}</span>
            </div>
          `;
        } else {
          return `
            <div class="event-task-slot completed" style="--slot-color: #666; border-color: #666; color: #888;">
              <span class="slot-status">✓</span>
              <span class="slot-name" style="text-decoration: line-through;">[Deleted]</span>
            </div>
          `;
        }
      }).join('');
    }

    if (slotsEl) slotsEl.innerHTML = slotsHtml;

    if (emojiEl) {
      if (isComplete) {
        emojiEl.classList.add('ready');
        emojiEl.title = 'Ready to claim! Click emoji to claim reward.';
      } else {
        emojiEl.classList.remove('ready');
        emojiEl.title = 'Event in progress. Click emoji to claim when ready.';
      }
    }
  }

  static updatePauseBtn() {
    // Implementation
  }



  static getStageBackdropConfig() {
    const state = getGameState();
    const stage = Math.max(1, Number(state?.stageState?.stage) || 1);
    const variation = String(state?.stageState?.stageVariation || 'A').toUpperCase();
    const viewportMode = window.innerWidth <= 900 ? 'mobile' : 'desktop';
    const stageConfig = this.STAGE_BACKDROPS[stage] || this.STAGE_BACKDROPS[1];
    const fallbackConfig = stageConfig.A || stageConfig.B || this.STAGE_BACKDROPS[1].A;
    const rawConfig = stageConfig[variation] || fallbackConfig;
    return {
      key: `${stage}:${variation}:${viewportMode}`,
      src: rawConfig.src,
      position: viewportMode === 'mobile'
        ? (rawConfig.mobilePosition || rawConfig.desktopPosition || 'center center')
        : (rawConfig.desktopPosition || rawConfig.mobilePosition || 'center center')
    };
  }

  static updateStageBackdrop() {
    const gameArea = document.getElementById('gameArea');
    if (!gameArea) return;

    const backdrop = this.getStageBackdropConfig();
    if (!backdrop.src) return;

    if (this._stageBackdropKey === backdrop.key && gameArea.style.getPropertyValue('--stage-bg-image')) {
      return;
    }

    this._stageBackdropKey = backdrop.key;
    const absoluteSrc = new URL(backdrop.src, window.location.href).href;
    gameArea.style.setProperty('--stage-bg-image', `url("${absoluteSrc}")`);
    gameArea.style.setProperty('--stage-bg-position', backdrop.position);
  }

  static getRunCompletionEntries() {
    const state = getGameState();
    const history = Array.isArray(state.dailiesState?.history) ? state.dailiesState.history : [];
    const runStartTime = Number(state.systemState?.gameStartTime) || 0;
    const runHistory = history.filter(entry => (entry.timestamp || 0) >= runStartTime);
    const currentDailies = state.dailiesState?.dailies || [];
    const completedDailies = currentDailies.filter(daily => (daily.completionsToday || 0) >= (daily.maxCompletionsPerDay || 1));
    const currentPct = TaskManager.getWeightedCompletionRate(completedDailies, currentDailies);

    const series = runHistory.map(entry => {
      const completedDailiesHist = Array.isArray(entry.completedDailies) ? entry.completedDailies : [];
      const missedDailiesHist = Array.isArray(entry.missedDailies) ? entry.missedDailies : [];
      const allDailiesHist = completedDailiesHist.concat(missedDailiesHist);
      return {
        completed: !!entry.allDailiesComplete,
        pct: TaskManager.getWeightedCompletionRate(completedDailiesHist, allDailiesHist)
      };
    });

    series.push({
      completed: currentDailies.length > 0 && completedDailies.length === currentDailies.length,
      pct: currentPct,
      live: true
    });

    return series.slice(-20);
  }

  static buildDailyHistoryBoxes(dailyId) {
    const state = getGameState();
    const history = Array.isArray(state.dailiesState?.history) ? state.dailiesState.history : [];
    const N = 64; // 8x8 grid

    const lastEntry = history.length ? history[history.length - 1] : null;
    const fingerprint = history.length + '|' + (lastEntry ? (lastEntry.date || lastEntry.day || '') : '');
    UIManager._dailyHistoryCache = UIManager._dailyHistoryCache || {};
    const cacheKey = `${dailyId}|${fingerprint}`;
    if (UIManager._dailyHistoryCache[cacheKey]) return UIManager._dailyHistoryCache[cacheKey];

    const recentEntries = history.slice(-N);
    const boxes = [];

    // pad with empty boxes on the left so newest entries sit at the right/bottom
    const padCount = Math.max(0, N - recentEntries.length);
    for (let i = 0; i < padCount; i++) boxes.push('<span class="daily-box" title=""></span>');

    recentEntries.forEach(entry => {
      const completed = Array.isArray(entry.completedDailies) && entry.completedDailies.some(d => String(d.id) === String(dailyId));
      boxes.push(`<span class="daily-box ${completed ? 'filled' : ''}" title="${completed ? 'Completed' : 'Not completed'}"></span>`);
    });

    const html = boxes.join('');
    UIManager._dailyHistoryCache[cacheKey] = html;
    // keep cache size bounded
    if (Object.keys(UIManager._dailyHistoryCache).length > 2000) UIManager._dailyHistoryCache = {};
    return html;
  }

  static getDeadlineDistanceText(deadline) {
    if (!deadline) return 'No deadline set';

    const dlDate = new Date(Number(deadline));
    const dlMidnight = new Date(dlDate.getFullYear(), dlDate.getMonth(), dlDate.getDate()).getTime();

    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    const diff = dlMidnight - todayMidnight;
    const dayMs = 24 * 60 * 60 * 1000;
    const days = Math.round(diff / dayMs);

    if (days === 0) return 'due today';
    if (days > 0) return `in ${days} day${days === 1 ? '' : 's'}`;

    const absDays = Math.abs(days);
    return `${absDays} day${absDays === 1 ? '' : 's'} overdue`;
  }

  static updateRunCompletionGraph() {
    const panel = document.getElementById('runCompletionPanel');
    const graph = document.getElementById('runCompletionGraph');
    const rateEl = document.getElementById('runCompletionRate');
    const attrsContainer = document.getElementById('runCompletionAttrsContainer');
    const rewardsContainer = document.getElementById('runCompletionRewardsContainer');
    if (!panel || !graph || !rateEl) return;

    const state = getGameState();
    const showAttrs = !!(state?.systemState?.showAttrsInCompletionPanel);
    const showRewards = !!(state?.systemState?.showRewardsInCompletionPanel);
    
    const toggleBtn = document.getElementById('runCompletionToggle');
    const rewardsToggleBtn = document.getElementById('runCompletionRewardsToggle');
    if (toggleBtn) toggleBtn.style.opacity = showAttrs ? '1' : '0.75';
    if (rewardsToggleBtn) rewardsToggleBtn.style.opacity = showRewards ? '1' : '0.75';

    if (showAttrs) {
      // Hide graph/rewards, show attribute comparison
      graph.style.display = 'none';
      if (rewardsContainer) rewardsContainer.style.display = 'none';
      rateEl.textContent = 'VS';
      if (attrsContainer) {
        attrsContainer.style.display = 'block';
        const attrs = state?.config?.attributes || [];
        const playerAttrs = state?.playerState?.attributes || {};
        const nemesisAttrs = state?.nemesisState?.attributes || {};
        const attrColors = state?.config?.attributeColors || {};
        attrsContainer.innerHTML = attrs.map(attr => {
          const pPts = playerAttrs[attr]?.points ?? 0;
          const nPts = nemesisAttrs[attr]?.points ?? 0;
          const total = pPts + nPts;
          const playerPercent = total > 0 ? (pPts / total) * 100 : 50;
          const color = attrColors[attr] || '#f1de97';
          return `<div style="margin-bottom:3px;">
            <div style="display:flex;justify-content:space-between;align-items:center;font-size:8px;font-family:monospace;margin-bottom:1px;">
              <span style="color:${color};font-weight:bold;">${attr}</span>
              <span style="font-size:7px;"><span style="color:#a15cff;font-weight:bold;">${Math.round(pPts)}</span><span style="color:#555;">/</span><span style="color:#ff4444;font-weight:bold;">${Math.round(nPts)}</span></span>
            </div>
            <div class="attr-bar-container" style="height:4px;border-radius:2px;">
              <div class="attr-bar-player" style="width:${playerPercent}%;border-radius:2px;"></div>
            </div>
          </div>`;
        }).join('');
      }
      return;
    }

    if (showRewards) {
      // Hide graph/attrs, show custom diamond rewards
      graph.style.display = 'none';
      if (attrsContainer) attrsContainer.style.display = 'none';
      rateEl.textContent = '🎁';
      if (rewardsContainer) {
        rewardsContainer.style.display = 'block';
        const customRewards = state.systemState.customRewards || [];
        if (customRewards.length === 0) {
          rewardsContainer.innerHTML = `<div style="font-size:7px; color:#a0aec0; text-align:center; padding: 4px 0;">No rewards.<br>Config in Menu.</div>`;
        } else {
          rewardsContainer.innerHTML = customRewards.map(r => {
            const canAfford = state.playerState.diamonds >= r.price;
            return `<div style="margin-bottom:3px; display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.3); padding:2px 4px; border-radius:3px; border:1px solid rgba(168,85,247,0.15);">
              <div style="display:flex; flex-direction:column; text-align:left; max-width:100px;">
                <span style="font-size:7px; color:#fff; font-weight:bold; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${r.name}">${r.name}</span>
                <span style="font-size:6px; color:#a855f7;">${r.price} 💎</span>
              </div>
              <button class="buy-custom-reward-btn" data-id="${r.id}" ${canAfford ? '' : 'disabled'} style="font-size:6px; font-family:inherit; padding:2px 4px; border-radius:2px; background:${canAfford ? '#a855f7' : 'rgba(255,255,255,0.05)'}; color:${canAfford ? '#fff' : '#666'}; border:none; cursor:${canAfford ? 'pointer' : 'not-allowed'}; font-weight:bold;">BUY</button>
            </div>`;
          }).join('');

          rewardsContainer.querySelectorAll('.buy-custom-reward-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
              e.stopPropagation();
              const id = e.currentTarget.dataset.id;
              const reward = (state.systemState.customRewards || []).find(item => String(item.id) === String(id));
              if (reward && state.playerState.diamonds >= reward.price) {
                state.spendDiamonds(reward.price);
                state.save();
                try {
                  PopupsManager.showAlert('Reward Purchased! 🎁', `You bought:\n"${reward.name}"\nfor ${reward.price} Diamonds! Enjoy your reward!`);
                } catch(err) {
                  alert(`Purchased: ${reward.name}`);
                }
                UIManager.refreshGameUI();
              }
            });
          });
        }
      }
      return;
    }

    // Graph mode
    graph.style.display = '';
    if (attrsContainer) attrsContainer.style.display = 'none';
    if (rewardsContainer) rewardsContainer.style.display = 'none';

    const entries = this.getRunCompletionEntries();
    if (!entries.length) {
      graph.innerHTML = '';
      rateEl.textContent = '0%';
      return;
    }

    const points = entries.map((entry, index) => {
      const x = entries.length === 1 ? 0 : (index / (entries.length - 1)) * 160;
      const y = 56 - Math.max(0, Math.min(1, entry.pct)) * 46 - 5;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    });

    const linePath = points.length > 1 ? `M ${points.join(' L ')}` : '';
    const fillPath = points.length > 1
      ? `${linePath} L 160 56 L 0 56 Z`
      : '';
    const lastPct = Math.max(0, Math.min(1, entries[entries.length - 1].pct || 0));

    graph.innerHTML = `
      <defs>
        <linearGradient id="runGraphFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="rgba(255,215,106,0.28)" />
          <stop offset="100%" stop-color="rgba(255,215,106,0)" />
        </linearGradient>
      </defs>
      ${fillPath ? `<path d="${fillPath}" fill="url(#runGraphFill)" />` : ''}
      ${linePath ? `<path d="${linePath}" fill="none" stroke="rgba(255,215,106,0.95)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />` : ''}
      ${points.map(point => {
      const [x, y] = point.split(',');
      return `<circle cx="${x}" cy="${y}" r="1.8" fill="rgba(255,255,255,0.92)" />`;
    }).join('')}
    `;
    rateEl.textContent = `${Math.round(lastPct * 100)}%`;
  }

  static updateWeeklyHeatmap() {
    const container = document.getElementById('weeklyHeatmapBody');
    if (!container) return;

    const state = getGameState();
    const history = Array.isArray(state.dailiesState?.history) ? state.dailiesState.history : [];

    const today = typeof TaskManager !== 'undefined' && typeof TaskManager.getCurrentGameDateKey === 'function'
      ? TaskManager.getCurrentGameDateKey()
      : new Date().toISOString().split('T')[0];

    const parts = today.split('-');
    const todayDate = new Date(parts[0], parts[1] - 1, parts[2]);

    // Dynamically calculate columns & rows based on container dimensions
    const panel = document.getElementById('weeklyHeatmapPanel');
    let cols = 4;
    let rows = 7;
    if (panel) {
      const w = panel.clientWidth || 90;
      const h = panel.clientHeight || 85;
      cols = Math.max(2, Math.floor((w - 10 + 2) / 11));
      rows = Math.max(2, Math.floor((h - 22 + 2) / 11));
    }
    container.style.setProperty('--rows', rows);
    container.style.setProperty('--cols', cols);
    const totalCells = cols * rows;

    const cells = [];
    for (let i = totalCells - 1; i >= 0; i--) {
      const d = new Date(todayDate);
      d.setDate(todayDate.getDate() - i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dateVal = String(d.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${dateVal}`;
      cells.push({ date: dateStr, isToday: i === 0 });
    }

    container.innerHTML = cells.map((cell) => {
      const entry = history.find(e => e.date === cell.date);

      if (entry) {
        let rate = 0;
        const compDailies = Array.isArray(entry.completedDailies) ? entry.completedDailies : [];
        const missedDailies = Array.isArray(entry.missedDailies) ? entry.missedDailies : [];
        const savedDailies = Array.isArray(entry.savedDailies) ? entry.savedDailies : [];
        const allDailies = compDailies.concat(missedDailies).concat(savedDailies);
        
        if (typeof TaskManager !== 'undefined' && typeof TaskManager.getWeightedCompletionRate === 'function') {
          rate = TaskManager.getWeightedCompletionRate(compDailies, allDailies);
        } else {
          rate = allDailies.length > 0 ? (compDailies.length / allDailies.length) : (entry.allDailiesComplete ? 1.0 : 0.0);
        }

        const compCount = compDailies.length;
        const totalCount = allDailies.length;

        const opacity = 0.15 + (rate * 0.8);
        const color = `rgba(255, 51, 51, ${opacity})`;
        const borderColor = `rgba(255, 51, 51, ${0.1 + rate * 0.45})`;
        const shadowColor = `rgba(255, 51, 51, ${rate * 0.45})`;
        const tooltip = `${cell.date}: ${Math.round(rate * 100)}% completed (${compCount}/${totalCount})`;

        return `<div class="heatmap-cell" style="background: ${color}; box-shadow: 0 0 3px ${shadowColor}; border-color: ${borderColor};" title="${tooltip}"></div>`;
      } else if (cell.isToday) {
        // Today's pending check-in progress
        const dailies = state.dailiesState?.dailies || [];
        const scheduledDailies = typeof TaskManager !== 'undefined' && typeof TaskManager.isDailyScheduled === 'function'
          ? dailies.filter(d => TaskManager.isDailyScheduled(d, today))
          : dailies;
        const compDailies = scheduledDailies.filter(d => d.completed);
        
        let rate = 1.0;
        if (typeof TaskManager !== 'undefined' && typeof TaskManager.getWeightedCompletionRate === 'function') {
          rate = TaskManager.getWeightedCompletionRate(compDailies, scheduledDailies);
        } else {
          rate = scheduledDailies.length > 0 ? (compDailies.length / scheduledDailies.length) : 1.0;
        }

        const compCount = compDailies.length;
        const totalCount = scheduledDailies.length;

        const opacity = 0.15 + (rate * 0.8);
        const color = `rgba(255, 51, 51, ${opacity})`;
        const borderColor = `rgba(255, 51, 51, ${0.1 + rate * 0.45})`;
        const shadowColor = `rgba(255, 51, 51, ${rate * 0.45})`;
        const tooltip = `${cell.date} (Today - Pending): ${Math.round(rate * 100)}% completed (${compCount}/${totalCount})`;

        return `<div class="heatmap-cell" style="background: ${color}; box-shadow: 0 0 3px ${shadowColor}; border-color: ${borderColor};" title="${tooltip}"></div>`;
      } else {
        return `<div class="heatmap-cell level-0" title="${cell.date}: No check-in"></div>`;
      }
    }).join('');
  }

  static showFloatingText(enemyId, text, options = {}) {
    const layer = document.getElementById('enemyLayer');
    if (!layer) return;
    const card = layer.querySelector(`.enemy-card[data-enemy-id="${enemyId}"]`);
    if (!card) return;
    const color = options.color || '#44ff44';
    // Only pass duration/fadeDelay if explicitly provided so showAnchored can use its sensible defaults
    const callOpts = { color, isCrit: !!options.isCrit, anchorKey: String(enemyId) };
    if (typeof options.duration === 'number') callOpts.duration = options.duration;
    if (typeof options.fadeDelay === 'number') callOpts.fadeDelay = options.fadeDelay;
    try {
      FloatingDamageNumber.showAnchored(card, text, callOpts);
    } catch (e) {
      const rect = card.getBoundingClientRect();
      // position above the enemy card center
      const x = rect.left + rect.width / 2;
      const y = rect.top - 8; // slightly above
      FloatingDamageNumber.show(x, y, text, { color, duration: options.duration, isCrit: !!options.isCrit });
    }
  }

  static showEnemyTooltip(enemyId, ev) {
    try {
      const enemy = (typeof StageManager !== 'undefined' && StageManager.getEnemyById) ? StageManager.getEnemyById(enemyId) : (StageManager.getAllEnemies && StageManager.getAllEnemies().find(e => String(e.id) === String(enemyId)));
      if (!enemy) return;
      const existing = document.getElementById('enemyTooltip');
      if (existing) existing.remove();
      const tip = document.createElement('div');
      tip.id = 'enemyTooltip';
      tip.className = 'mutator-tooltip enemy-tooltip';
      const hpText = `${Math.ceil(enemy.hp || 0)} / ${Math.ceil(enemy.maxHp || 0)}`;
      const muts = Array.isArray(enemy.mutators) && enemy.mutators.length ? enemy.mutators : [];
      let mutsHtml = '';
      if (muts.length === 0) {
        mutsHtml = '<div class="enemy-tooltip-mutators"><em>No mutators</em></div>';
      } else {
        mutsHtml = '<div class="enemy-tooltip-mutators">' + muts.map(m => {
          const meta = UIManager.MUTATOR_META[m] || { icon: '❗', label: m, desc: '' };
          return `<div class="enemy-tooltip-mutator"><span class="mut-icon" style="color:${meta.color}">${meta.icon}</span> <strong>${meta.label}</strong> — <span class="mut-desc">${meta.desc}</span></div>`;
        }).join('') + '</div>';
      }
      tip.innerHTML = `<div class="mutator-tooltip-title">${enemy.name}</div><div class="mutator-tooltip-desc">HP: ${hpText}</div>${mutsHtml}`;
      document.body.appendChild(tip);
      let x = ev?.clientX || (window.innerWidth / 2);
      let y = ev?.clientY || (window.innerHeight / 2);
      tip.style.left = Math.min(window.innerWidth - 12 - tip.offsetWidth, x + 8) + 'px';
      tip.style.top = Math.max(8, y - 8 - tip.offsetHeight) + 'px';
      setTimeout(() => tip.classList.add('visible'), 10);
      setTimeout(() => { try { tip.classList.remove('visible'); setTimeout(() => tip.remove(), 220); } catch (e) { } }, 3000);
    } catch (e) { console.warn('showEnemyTooltip', e); }
  }

  static renderBossOrbit(card, enemy) {
    if (!enemy || !enemy.isBoss) return;
    
    // Anti-lag: Throttle computation to once every 500ms per enemy card
    const now = Date.now();
    if (card._lastOrbitUpdate && now - card._lastOrbitUpdate < 500) {
      return;
    }
    card._lastOrbitUpdate = now;

    const state = getGameState();
    
    const today = (typeof TaskManager !== 'undefined') ? TaskManager.getCurrentGameDateKey() : null;
    if (!today) return;
    
    const allScheduled = state.dailiesState.dailies.filter(d => TaskManager.isDailyScheduled(d, today));
    const missedDailies = allScheduled.filter(d => !d.completed);
    
    const bossData = state.stageState.bossData || {};
    const isPhase2 = (bossData.phase === 2) || (enemy.maxHp > 0 && enemy.hp / enemy.maxHp <= 0.4);
    
    let maxW = 0;
    allScheduled.forEach(d => {
      maxW += ({ Easy: 1, Medium: 2, Hard: 3, Ultra: 8 }[d.difficulty] || 1) + (isPhase2 ? 1 : 0);
    });
    let missedW = 0;
    missedDailies.forEach(d => {
      missedW += ({ Easy: 1, Medium: 2, Hard: 3, Ultra: 8 }[d.difficulty] || 1) + (isPhase2 ? 1 : 0);
    });

    const N = maxW > 0 ? Math.round((missedW / maxW) * 20) : 0;
    const rolledAttacks = GameState.getBossRolledAttacks(N, enemy.name);
    const visibleAttacks = rolledAttacks.filter(a => a !== 'null');
    
    // Check if orbit container exists
    let orbitContainer = card.querySelector('.boss-attack-orbit');
    if (!orbitContainer) {
      orbitContainer = document.createElement('div');
      orbitContainer.className = 'boss-attack-orbit';
      card.appendChild(orbitContainer);
    }

    let orbitInner = orbitContainer.querySelector('.boss-attack-orbit-inner');
    if (!orbitInner) {
      orbitInner = document.createElement('div');
      orbitInner.className = 'boss-attack-orbit-inner';
      orbitContainer.appendChild(orbitInner);
    }
    
    // Quick diff by stringified content
    const attacksKey = visibleAttacks.join(',');
    if (orbitContainer.dataset.attacksKey === attacksKey) return;
    orbitContainer.dataset.attacksKey = attacksKey;
    
    orbitInner.innerHTML = ''; // clear and rebuild
    const total = visibleAttacks.length;
    if (total === 0) return;
    
    const radius = 65; // px radius for orbit
    const bossColor = (state.config.bosses && state.config.bosses[enemy.name]?.color) || '#ff2222';
    
    visibleAttacks.forEach((attackType, i) => {
      const angle = (i / total) * 360;
      const badge = document.createElement('div');
      badge.className = `orbit-badge attack-${attackType}`;
      
      const minRad = 35 + ((i * 7) % 22);
      const maxRad = 75 + ((i * 11) % 25);
      const pulseSpeed = 2.2 + ((i * 13) % 25) / 10;
      const pulseDelay = -(((i * 17) % 30) / 10);
      
      badge.style.setProperty('--boss-color', bossColor);
      badge.style.setProperty('--base-angle', `${angle}deg`);
      badge.style.setProperty('--min-radius', `${minRad}px`);
      badge.style.setProperty('--max-radius', `${maxRad}px`);
      badge.style.setProperty('--pulse-speed', `${pulseSpeed}s`);
      badge.style.setProperty('--pulse-delay', `${pulseDelay}s`);
      
      // Calculate damage for regular/crit/heavy
      const isLockInActive = state.systemState && ((state.systemState.lockInDaysLeft || 0) > 0 || (state.systemState.consistencyDaysLeft || 0) > 0);
      const lockInDegree = state.systemState?.lockInDegree ?? ((state.systemState?.consistencyDaysLeft || 0) > 0 ? 3 : 2);
      const lockInDamageMult = isLockInActive ? (lockInDegree * 4) : 1;

      let dmg = 10;
      if (attackType === 'crit') dmg = 15;
      if (attackType === 'heavy') dmg = 12;
      dmg *= lockInDamageMult;

      let reduction = 1.0;
      if (state.playerState.className === 'Knight') reduction -= 0.10;
      if (state.hasBuff('Iron Skin')) reduction -= 0.10;
      if (state.playerState.talismans?.includes("Titan's Mantle")) {
        reduction = Math.max(0, 1.0 - (1.0 - reduction) * 2);
      }
      if (state.playerState.className === 'Juggernaut') reduction *= 0.85;
      if (state.playerState.className === 'Brute' && state.combatState?.skillEffects?.wrathUnleashed) reduction *= 1.4;
      
      dmg = Math.max(1, Math.round(dmg * reduction));
      if (attackType === 'crit') dmg = 15 * lockInDamageMult;
      
      let badgeInner = '';
      if (attackType === 'regular') {
        badgeInner = `<div class="shape-triangle" style="border-bottom-color: ${bossColor}"><span>${dmg}</span></div>`;
      } else if (attackType === 'crit') {
        badgeInner = `<div class="shape-triangle crit" style="border-bottom-color: ${bossColor}"><span>${dmg}</span></div>`;
      } else if (attackType === 'heavy') {
        badgeInner = `<div class="shape-square" style="background-color: ${bossColor}"><span>${dmg}</span></div>`;
      } else if (attackType === 'minion') {
        const minionName = (typeof getRandomMinionNameForStage !== 'undefined') ? getRandomMinionNameForStage(state.stageState.stage, state.stageState.stageVariation) : 'Bat';
        const emoji = (state.config.enemies && state.config.enemies[minionName]?.emoji) || '👿';
        badgeInner = `<div class="shape-circle" style="border-color: ${bossColor}"><span>${emoji}</span></div>`;
      } else if (attackType === 'heal') {
        const healAmt = Math.round(enemy.maxHp * 0.10);
        badgeInner = `<div class="shape-heart" style="background-color: ${bossColor}"><span>${healAmt}</span></div>`;
      } else if (attackType === 'corrosive') {
        badgeInner = `<div class="shape-star" style="background-color: ${bossColor}"><span>🧪</span></div>`;
      } else if (attackType === 'bomb') {
        badgeInner = `<div class="shape-circle" style="border-color: ${bossColor}"><span>💣</span></div>`;
      }
      
      badge.innerHTML = badgeInner;
      orbitInner.appendChild(badge);
    });
  }

  static renderMutatorBadges(card, enemy) {
    const container = card.querySelector('.mutator-badges');
    if (!container) return;
    container.innerHTML = '';
    const muts = Array.isArray(enemy?.mutators) ? enemy.mutators : [];
    if (!muts.length) {
      container.style.display = 'none';
      return;
    }
    container.style.display = 'inline-block';
    muts.forEach(m => {
      const meta = UIManager.MUTATOR_META[m] || { icon: '❗', color: '#cccccc', label: m, desc: '' };
      const span = document.createElement('span');
      span.className = `mutator-badge mutator-badge--${m}`;
      span.title = meta.label;
      span.textContent = meta.icon;
      span.style.color = meta.color;
      span.addEventListener('click', (ev) => {
        ev.stopPropagation();
        try { UIManager.showMutatorPopup(enemy.id); } catch (e) { console.warn('showMutatorPopup failed', e); }
      });
      container.appendChild(span);
    });
  }

  static showMutatorPopup(enemyIdOrMutator) {
    if (!enemyIdOrMutator) return;
    let enemy = null;
    try {
      if (typeof enemyIdOrMutator === 'string') {
        // If it's an enemy id, resolve enemy; otherwise treat as mutator key
        if (typeof StageManager !== 'undefined' && StageManager.getEnemyById && StageManager.getEnemyById(enemyIdOrMutator)) {
          enemy = StageManager.getEnemyById(enemyIdOrMutator);
        } else if (UIManager.MUTATOR_META[enemyIdOrMutator]) {
          const meta = UIManager.MUTATOR_META[enemyIdOrMutator];
          try { PopupsManager.showDialogue(meta.label, `${meta.icon} ${meta.desc}`); } catch (e) { console.warn(e); }
          return;
        } else {
          // attempt to find enemy by id in stage list
          if (typeof StageManager !== 'undefined' && StageManager.getAllEnemies) {
            enemy = StageManager.getAllEnemies().find(e => String(e.id) === String(enemyIdOrMutator));
          }
        }
      } else if (typeof enemyIdOrMutator === 'object' && enemyIdOrMutator.id) {
        enemy = enemyIdOrMutator;
      }

      if (!enemy) return;

      const muts = Array.isArray(enemy.mutators) && enemy.mutators.length ? enemy.mutators : [];
      let mutatorHtml = '';
      if (!muts.length) {
        mutatorHtml = '<div class="muted" style="color:#aaa; font-size:11px; margin-top:8px;">No mutators active.</div>';
      } else {
        mutatorHtml = muts.map(m => {
          const meta = UIManager.MUTATOR_META[m] || { icon: '❗', label: m, desc: '' };
          return `
            <div class="enemy-info-mutator">
              <span class="mutator-icon" style="color: ${meta.color || '#fff'}">${meta.icon}</span>
              <div class="mutator-details">
                <strong>${meta.label}</strong>
                <span>${meta.desc}</span>
              </div>
            </div>`;
        }).join('');
      }

      const maxHp = enemy.maxHp || 1;
      const hpPercent = Math.max(0, Math.min(100, (enemy.hp / maxHp) * 100));
      const state = typeof getGameState === 'function' ? getGameState() : {};
      const archetypeMeta = state?.config?.enemyArchetypes?.[enemy.archetype] || {};

      let bossAttacksTableHtml = '';
      if (enemy.isBoss) {
        const bossCfg = (state.config && state.config.bosses && state.config.bosses[enemy.name]) || {};
        const weights = bossCfg.attackWeights || {};
        const bossColor = bossCfg.color || '#ff2222';
        
        const isLockInActive = state?.systemState && ((state.systemState.lockInDaysLeft || 0) > 0 || (state.systemState.consistencyDaysLeft || 0) > 0);
        const lockInDegree = state?.systemState?.lockInDegree ?? ((state?.systemState?.consistencyDaysLeft || 0) > 0 ? 3 : 2);
        const lockInDamageMult = isLockInActive ? (lockInDegree * 4) : 1;

        const regDmg = 10 * lockInDamageMult;
        const heavyDmg = 12 * lockInDamageMult;
        const critDmg = 15 * lockInDamageMult;

        const attackDetails = {
          heavy: { name: 'Heavy Slam', badge: `<div class="shape-square" style="background-color:${bossColor}; width:22px; height:22px; display:inline-flex; align-items:center; justify-content:center; font-size:10px; font-weight:bold; color:#fff;">${heavyDmg}</div>`, desc: `Heavy crushing slam dealing ${heavyDmg} damage & doubling player dodge cost.` },
          crit: { name: 'Critical Strike', badge: `<div class="shape-triangle crit" style="border-bottom-color:${bossColor}; border-left:11px solid transparent; border-right:11px solid transparent; border-bottom:22px solid ${bossColor}; display:inline-flex; align-items:center; justify-content:center;"><span style="color:#fff; font-size:9px; font-weight:bold;">${critDmg}</span></div>`, desc: `Critical strike dealing ${critDmg} raw damage, bypassing player shields.` },
          bomb: { name: 'Summon Bomb', badge: `<div class="shape-circle" style="border:2px solid ${bossColor}; width:22px; height:22px; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; font-size:11px;">💣</div>`, desc: 'Summons an explosive bomb enemy onto the field.' },
          minion: { name: 'Summon Minion', badge: `<div class="shape-circle" style="border:2px solid ${bossColor}; width:22px; height:22px; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; font-size:11px;">👿</div>`, desc: 'Summons a stage minion ally to attack the player.' },
          corrosive: { name: 'Corrosive Spit', badge: `<div class="shape-star" style="background-color:${bossColor}; width:22px; height:22px; border-radius:3px; display:inline-flex; align-items:center; justify-content:center; font-size:11px;">🧪</div>`, desc: 'Toxic spit reducing player shield & heal efficiency by 10%.' },
          heal: { name: 'Self-Heal', badge: `<div class="shape-heart" style="background-color:${bossColor}; width:22px; height:22px; border-radius:4px; display:inline-flex; align-items:center; justify-content:center; font-size:11px;">💚</div>`, desc: 'Restores 10% of boss max HP.' },
          regular: { name: 'Regular Strike', badge: `<div class="shape-triangle" style="border-bottom-color:${bossColor}; border-left:11px solid transparent; border-right:11px solid transparent; border-bottom:22px solid ${bossColor}; display:inline-flex; align-items:center; justify-content:center;"><span style="color:#fff; font-size:9px; font-weight:bold;">${regDmg}</span></div>`, desc: `Standard strike dealing ${regDmg} damage.` },
          null: { name: 'Rest / Null', badge: `<div class="shape-circle" style="border:1px dashed #aaa; width:22px; height:22px; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; font-size:11px;">🛡️</div>`, desc: 'Boss rests for turn or attack is erased by player dodge.' }
        };

        const totalW = Object.values(weights).reduce((a, b) => a + b, 0) || 1;
        const rows = Object.entries(weights).map(([type, w]) => {
          const detail = attackDetails[type] || { name: type, badge: '❓', desc: '' };
          const pct = Math.round((w / totalW) * 100);
          return `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
              <td style="padding: 6px; text-align: center;">${detail.badge}</td>
              <td style="padding: 6px; font-weight: bold; color: #fff;">${detail.name}</td>
              <td style="padding: 6px; color: #ccc; font-size: 10px;">${detail.desc}</td>
              <td style="padding: 6px; text-align: right; font-weight: bold; color: #ffd700; font-family: 'Orbitron', sans-serif;">${pct}%</td>
            </tr>
          `;
        }).join('');

        bossAttacksTableHtml = `
          <div class="enemy-info-boss-attacks" style="margin-top: 14px;">
            <h3 style="margin: 0 0 8px 0; font-size: 13px; color: #ffd700; display: flex; align-items: center; gap: 6px;">
              <span>🎯</span> <span>Boss Attack Arsenal & Roll Chances</span>
            </h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 11px; text-align: left; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; overflow: hidden;">
              <thead>
                <tr style="background: rgba(255,215,106,0.12); border-bottom: 1px solid rgba(255,215,106,0.25); color: #ffd700; font-family: 'Orbitron', sans-serif;">
                  <th style="padding: 6px; width: 44px; text-align: center;">Badge</th>
                  <th style="padding: 6px;">Attack Name</th>
                  <th style="padding: 6px;">Effect / Description</th>
                  <th style="padding: 6px; width: 60px; text-align: right;">Chance</th>
                </tr>
              </thead>
              <tbody>
                ${rows}
              </tbody>
            </table>
          </div>
        `;
      }

      PopupsManager.closeAllPopups();
      const overlay = PopupsManager.createPopupOverlay();
      overlay.style.zIndex = '2147483647';
      overlay.style.pointerEvents = 'auto';

      const popup = document.createElement('div');
      popup.className = 'popup enemy-info-popup';
      popup.style.pointerEvents = 'auto';

      const enemyEmoji = this.getEnemyEmoji(enemy);

      popup.innerHTML = `
        <div class="enemy-sprite-placeholder" style="font-size: 3.5rem; text-align: center; padding: 12px 0; background: rgba(255,255,255,0.05); border-radius: 8px; margin-bottom: 10px;">
          ${enemyEmoji}
        </div>
        <h2 style="margin: 0 0 12px 0; text-align: center; color: #ffd700;">${enemy.name} ${enemy.isElite ? '👑' : ''}</h2>
        <button class="btn-close" style="position: absolute; top: 12px; right: 12px; background: transparent; border: none; color: #fff; font-size: 1.2rem; cursor: pointer;">✕</button>
        <div class="enemy-info-content">
          <div class="enemy-info-stats">
            <div class="stat-row hp-row">
              <span class="stat-label">HP</span>
              <div class="stat-bar-container">
                <div class="stat-bar-fill" style="width: ${hpPercent}%; background: ${hpPercent < 30 ? '#ff4444' : '#44ff44'}"></div>
                <span class="stat-bar-text">${Math.ceil(enemy.hp)} / ${Math.ceil(maxHp)}</span>
              </div>
            </div>
            <div class="stat-row">
              <span class="stat-label">Damage</span>
              <span class="stat-value">${Math.round(enemy.dmgMult * 10) / 10}× Base</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">Archetype</span>
              <span class="stat-value" style="color:#ffd700">${enemy.archetype}</span>
            </div>
            ${archetypeMeta.description ? `<div class="archetype-desc" style="color:#cbd5e1; font-size:0.8rem; margin:4px 0 8px 0;">${archetypeMeta.description}</div>` : ''}
            <div class="stat-row">
              <span class="stat-label">Resist</span>
              <span class="stat-value" style="color: #ff9a9a">${enemy.resist || '-'}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">Weakness</span>
              <span class="stat-value" style="color: #9aff9a">${enemy.weak || '-'}</span>
            </div>
          </div>
          ${bossAttacksTableHtml}
          <div class="enemy-info-mutators-section" style="margin-top: 10px;">
            <h3>Mutators</h3>
            ${mutatorHtml}
          </div>
        </div>
      `;

      const closeBtn = popup.querySelector('.btn-close');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          overlay.remove();
        });
      }

      overlay.appendChild(popup);
      document.body.appendChild(overlay);
      if (typeof PopupAnimation !== 'undefined' && PopupAnimation.scale) {
        PopupAnimation.scale(popup);
      }
    } catch (e) { console.warn('showMutatorPopup', e); }
  }

  static showMutatorToast(text) {
    try {
      if (typeof FloatingDamageNumber !== 'undefined') {
        FloatingDamageNumber.show(window.innerWidth / 2, 60, text, { color: UIManager.themeColor('--accent-gold', '#FFB33F'), duration: 1600 });
      } else {
        const el = document.createElement('div');
        el.className = 'mutator-toast';
        el.textContent = text;
        document.body.appendChild(el);
        setTimeout(() => { try { el.remove(); } catch (e) { } }, 1600);
      }
    } catch (e) { console.warn('showMutatorToast error', e); }
  }

  static playMutatorSound() {
    try {
      const a = new Audio('assets/sounds/attack.mp3');
      a.volume = 0.6;
      a.play().catch(() => { });
    } catch (e) { }
  }

  static showPetIcon(enemyId, options = {}) {
    console.log('[showPetIcon] Triggered. enemyId:', enemyId);
    const layer = document.getElementById('enemyLayer');
    if (!layer) {
      console.warn('[showPetIcon] #enemyLayer not found');
      return;
    }
    let card = layer.querySelector(`.enemy-card[data-enemy-id="${enemyId}"]`);
    if (!card) {
      console.log('[showPetIcon] Card not found for enemyId, rendering enemies...');
      try { this.renderEnemies(); } catch (e) { }
      card = layer.querySelector(`.enemy-card[data-enemy-id="${enemyId}"]`);
    }
    if (!card) {
      console.log('[showPetIcon] Card still not found, trying fallback to first card...');
      card = layer.querySelector('.enemy-card');
    }
    if (!card) {
      console.warn('[showPetIcon] No enemy card found, aborting animation');
      return;
    }

    const state = getGameState();
    const petEmoji = (state.playerState && state.playerState.petEmoji) ? state.playerState.petEmoji : '🐶';
    const equippedAnim = state.playerState?.equippedPetAnimation || 'Default';
    console.log('[showPetIcon] Card found:', card.dataset.enemyId, 'petEmoji:', petEmoji, 'equippedAnim:', equippedAnim);

    // Compute positioning
    const rect = card.getBoundingClientRect();
    const enemyCenterX = rect.left + rect.width / 2;
    const enemyCenterY = rect.top + rect.height / 2;
    const enemyTopY = rect.top - 14;

    // A helper to create particles
    const createParticle = (x, y, content, duration, animStyles, customSize = '12px') => {
      const p = document.createElement('div');
      p.textContent = content;
      p.style.position = 'fixed';
      p.style.left = `${x}px`;
      p.style.top = `${y}px`;
      p.style.pointerEvents = 'none';
      p.style.zIndex = '11000';
      p.style.fontFamily = "'Orbitron', monospace";
      p.style.fontSize = customSize;
      p.style.transition = `all ${duration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`;
      p.style.textShadow = '0 0 8px rgba(255,255,255,0.8)';
      document.body.appendChild(p);
      requestAnimationFrame(() => {
        Object.assign(p.style, animStyles);
      });
      setTimeout(() => {
        try { p.remove(); } catch (e) { }
      }, duration);
    };

    // Helper for screenshake on the card
    const shakeCard = (intensity = 12, count = 10) => {
      let currentShift = 0;
      const originalTransform = card.style.transform || '';
      const interval = setInterval(() => {
        if (currentShift >= count) {
          card.style.transform = originalTransform;
          clearInterval(interval);
        } else {
          const dx = (Math.random() - 0.5) * intensity;
          const dy = (Math.random() - 0.5) * intensity;
          card.style.transform = `${originalTransform} translate(${dx}px, ${dy}px)`;
          currentShift++;
        }
      }, 40);
    };

    // 1) Spawn the main pet icon
    const icon = document.createElement('div');
    icon.className = 'pet-icon';
    if (equippedAnim !== 'Default') {
      icon.classList.add(`pet-anim-${equippedAnim.toLowerCase().replace(/\s+/g, '-')}`);
    }
    icon.textContent = petEmoji;
    icon.style.pointerEvents = 'none';
    icon.style.position = 'fixed';
    icon.style.left = `${enemyCenterX}px`;
    icon.style.top = `${enemyTopY}px`;
    icon.style.zIndex = '10999';
    icon.style.fontSize = '48px';
    console.log('[showPetIcon] Appending icon to body. Coordinates:', enemyCenterX, enemyTopY);
    document.body.appendChild(icon);

    // 2) EXTRA EXTRAVAGANT EFFECTS
    if (equippedAnim === 'Fierce Charge') {
      // Spawn 8 trail clones
      for (let i = 1; i <= 8; i++) {
        setTimeout(() => {
          createParticle(enemyCenterX, enemyTopY, petEmoji, 500, {
            transform: 'translateX(-50%) translateY(60px) scale(2.8)',
            opacity: '0',
            filter: 'blur(2px)'
          }, '36px');
        }, i * 60);
      }
      // Slam impact particles at 550ms
      setTimeout(() => {
        shakeCard(20, 12);
        if (typeof ScreenEffects !== 'undefined' && ScreenEffects.shake) {
          ScreenEffects.shake(16, 300);
        }

        // Full screen screen-flash overlay
        const flash = document.createElement('div');
        flash.style.position = 'fixed';
        flash.style.inset = '0';
        flash.style.background = 'rgba(255, 255, 255, 0.4)';
        flash.style.zIndex = '11100';
        flash.style.pointerEvents = 'none';
        flash.style.transition = 'opacity 300ms ease-out';
        document.body.appendChild(flash);
        setTimeout(() => { flash.style.opacity = '0'; }, 50);
        setTimeout(() => { try { flash.remove(); } catch (e) { } }, 350);

        createParticle(enemyCenterX, enemyCenterY - 30, '💥', 600, {
          transform: 'scale(6)',
          opacity: '0'
        }, '80px');

        for (let i = 0; i < 24; i++) {
          const angle = (i / 24) * Math.PI * 2 + Math.random() * 0.2;
          const px = enemyCenterX;
          const py = enemyCenterY;
          const speed = 60 + Math.random() * 80;
          createParticle(px, py, '✨', 800, {
            left: `${px + Math.cos(angle) * speed}px`,
            top: `${py + Math.sin(angle) * speed}px`,
            opacity: '0',
            transform: 'scale(1.0) rotate(180deg)'
          }, '28px');
        }
      }, 550);

    } else if (equippedAnim === 'Double Flip') {
      // Spawn sparkle rings
      let ringCount = 0;
      const interval = setInterval(() => {
        if (ringCount >= 10) {
          clearInterval(interval);
          return;
        }
        const emojis = ['⭐', '✨', '💫'];
        const currentEmoji = emojis[ringCount % emojis.length];
        const radius = 35 + ringCount * 4;
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2 + (ringCount * 0.3);
          const startX = enemyCenterX + Math.cos(angle) * radius;
          const startY = enemyCenterY + Math.sin(angle) * radius;
          const endAngle = angle + Math.PI / 2;
          createParticle(startX, startY, currentEmoji, 700, {
            left: `${enemyCenterX + Math.cos(endAngle) * (radius + 15)}px`,
            top: `${enemyCenterY + Math.sin(endAngle) * (radius + 15)}px`,
            opacity: '0',
            transform: 'scale(1.5) rotate(180deg)',
            filter: 'drop-shadow(0 0 8px gold)'
          }, '28px');
        }
        ringCount++;
      }, 90);

      // landing explosion at 1300ms
      setTimeout(() => {
        if (typeof ScreenEffects !== 'undefined' && ScreenEffects.shake) {
          ScreenEffects.shake(10, 250);
        }
        for (let i = 0; i < 25; i++) {
          const angle = (i / 25) * Math.PI * 2 + Math.random() * 0.1;
          const px = enemyCenterX;
          const py = enemyCenterY;
          const speed = 70 + Math.random() * 100;
          createParticle(px, py, '⭐', 800, {
            left: `${px + Math.cos(angle) * speed}px`,
            top: `${py + Math.sin(angle) * speed}px`,
            opacity: '0',
            transform: 'scale(1.2) rotate(360deg)'
          }, '32px');
        }
      }, 1300);

    } else if (equippedAnim === 'Meteor Drop') {
      // Spawn massive burning meteor ☄️
      const meteor = document.createElement('div');
      meteor.textContent = '☄️';
      meteor.style.position = 'fixed';
      meteor.style.fontSize = '280px';
      meteor.style.left = `${enemyCenterX}px`;
      meteor.style.top = `${window.scrollY - 200}px`;
      meteor.style.transform = 'translateX(-50%) rotate(45deg)';
      meteor.style.zIndex = '11005';
      meteor.style.transition = 'all 1100ms cubic-bezier(0.55, 0.055, 0.675, 0.19)';
      meteor.style.filter = 'drop-shadow(0 0 80px #ff3700) brightness(2.5)';
      document.body.appendChild(meteor);

      // Make meteor drop and shrink
      setTimeout(() => {
        meteor.style.top = `${enemyCenterY}px`;
        meteor.style.fontSize = '80px';
      }, 50);

      // Trail of burning smoke (12 particles)
      for (let i = 0; i < 12; i++) {
        setTimeout(() => {
          const tx = enemyCenterX + (Math.random() - 0.5) * 60;
          const ty = (window.scrollY - 100) + ((enemyCenterY - (window.scrollY - 100)) * (i / 12));
          createParticle(tx, ty, Math.random() > 0.5 ? '🔥' : '💨', 600, {
            transform: 'scale(4.0) translateY(-40px)',
            opacity: '0'
          }, '40px');
        }, i * 85);
      }

      // Hit Impact at 1100ms
      setTimeout(() => {
        try { meteor.remove(); } catch (e) { }
        shakeCard(30, 24);
        if (typeof ScreenEffects !== 'undefined' && ScreenEffects.shake) {
          ScreenEffects.shake(25, 450);
        }

        // Full screen screen-flash overlay
        const flash = document.createElement('div');
        flash.style.position = 'fixed';
        flash.style.inset = '0';
        flash.style.background = 'rgba(255, 55, 0, 0.55)';
        flash.style.zIndex = '11100';
        flash.style.pointerEvents = 'none';
        flash.style.transition = 'opacity 600ms ease-out';
        document.body.appendChild(flash);
        setTimeout(() => { flash.style.opacity = '0'; }, 50);
        setTimeout(() => { try { flash.remove(); } catch (e) { } }, 650);

        // Expanding blast wave ring
        const ring = document.createElement('div');
        ring.style.position = 'fixed';
        ring.style.left = `${enemyCenterX}px`;
        ring.style.top = `${enemyCenterY}px`;
        ring.style.width = '10px';
        ring.style.height = '10px';
        ring.style.border = '8px double #ff5500';
        ring.style.borderRadius = '50%';
        ring.style.transform = 'translate(-50%, -50%)';
        ring.style.boxShadow = '0 0 50px #ff3300, inset 0 0 50px #ff3300';
        ring.style.zIndex = '11000';
        ring.style.pointerEvents = 'none';
        ring.style.transition = 'all 700ms cubic-bezier(0.1, 0.8, 0.3, 1)';
        document.body.appendChild(ring);
        setTimeout(() => {
          ring.style.width = '500px';
          ring.style.height = '500px';
          ring.style.opacity = '0';
        }, 50);
        setTimeout(() => { try { ring.remove(); } catch (e) { } }, 750);

        // Exploding debris with gravity
        for (let i = 0; i < 36; i++) {
          const angle = (i / 36) * Math.PI * 2 + Math.random() * 0.3;
          const px = enemyCenterX;
          const py = enemyCenterY;
          const speed = 80 + Math.random() * 120;
          createParticle(px, py, Math.random() > 0.4 ? (Math.random() > 0.5 ? '💥' : '🔥') : '💨', 900, {
            left: `${px + Math.cos(angle) * speed}px`,
            top: `${py + Math.sin(angle) * speed + 80}px`,
            opacity: '0',
            transform: 'scale(3.0) rotate(360deg)'
          }, '40px');
        }
      }, 1100);

    } else if (equippedAnim === 'Spectral Pulse') {
      // Glow and expand 4 rings
      const colors = ['#00ffff', '#a855f7', '#ec4899', '#f59e0b'];
      for (let r = 0; r < 4; r++) {
        setTimeout(() => {
          const pulseRing = document.createElement('div');
          pulseRing.style.position = 'fixed';
          pulseRing.style.left = `${enemyCenterX}px`;
          pulseRing.style.top = `${enemyCenterY}px`;
          pulseRing.style.width = '15px';
          pulseRing.style.height = '15px';
          pulseRing.style.border = `5px solid ${colors[r]}`;
          pulseRing.style.borderRadius = '50%';
          pulseRing.style.transform = 'translate(-50%, -50%)';
          pulseRing.style.boxShadow = `0 0 30px ${colors[r]}, inset 0 0 20px ${colors[r]}`;
          pulseRing.style.zIndex = '11000';
          pulseRing.style.pointerEvents = 'none';
          pulseRing.style.transition = 'all 1100ms cubic-bezier(0.25, 0.46, 0.45, 0.94)';
          document.body.appendChild(pulseRing);

          setTimeout(() => {
            pulseRing.style.width = `${rect.width * 8}px`;
            pulseRing.style.height = `${rect.height * 7}px`;
            pulseRing.style.opacity = '0';
          }, 50);
          setTimeout(() => { try { pulseRing.remove(); } catch (e) { } }, 1150);
        }, r * 200);
      }

      // Dark floating runic sparkles (30 particles)
      for (let i = 0; i < 30; i++) {
        setTimeout(() => {
          const rx = rect.left - 20 + Math.random() * (rect.width + 40);
          const ry = rect.bottom;
          createParticle(rx, ry, Math.random() > 0.5 ? '🔮' : '✨', 900, {
            top: `${ry - 120}px`,
            opacity: '0',
            transform: 'scale(3.8) rotate(180deg)'
          }, '30px');
        }, i * 45);
      }

      // Screen ripple overlay
      const flash = document.createElement('div');
      flash.style.position = 'fixed';
      flash.style.inset = '0';
      flash.style.background = 'rgba(168, 85, 247, 0.25)';
      flash.style.zIndex = '11100';
      flash.style.pointerEvents = 'none';
      flash.style.transition = 'opacity 800ms ease-out';
      document.body.appendChild(flash);
      setTimeout(() => { flash.style.opacity = '0'; }, 50);
      setTimeout(() => { try { flash.remove(); } catch (e) { } }, 850);

      if (typeof ScreenEffects !== 'undefined' && ScreenEffects.shake) {
        ScreenEffects.shake(8, 600);
      }

    } else if (equippedAnim === 'Vortex Spin') {
      // Spiraling air trails (45 particles)
      for (let i = 0; i < 45; i++) {
        setTimeout(() => {
          const angle = (i / 5) * Math.PI * 2;
          const rad = 100 - (i * 1.8);
          const px = enemyCenterX + Math.cos(angle) * rad;
          const py = enemyCenterY + Math.sin(angle) * rad;
          createParticle(px, py, Math.random() > 0.4 ? '🌀' : '💨', 700, {
            left: `${enemyCenterX}px`,
            top: `${enemyCenterY}px`,
            opacity: '0',
            transform: 'scale(1.6) rotate(720deg)'
          }, '32px');
        }, i * 25);
      }

      // giant tornado at 900ms
      setTimeout(() => {
        const tornado = document.createElement('div');
        tornado.textContent = '🌪️';
        tornado.style.position = 'fixed';
        tornado.style.fontSize = '240px';
        tornado.style.left = `${enemyCenterX}px`;
        tornado.style.top = `${enemyCenterY}px`;
        tornado.style.transform = 'translate(-50%, -50%) rotate(0deg)';
        tornado.style.zIndex = '11005';
        tornado.style.pointerEvents = 'none';
        tornado.style.transition = 'all 700ms ease-out';
        document.body.appendChild(tornado);

        requestAnimationFrame(() => {
          tornado.style.transform = 'translate(-50%, -50%) rotate(1080deg) scale(0.4)';
          tornado.style.opacity = '0';
        });

        shakeCard(22, 16);
        if (typeof ScreenEffects !== 'undefined' && ScreenEffects.shake) {
          ScreenEffects.shake(12, 500);
        }

        setTimeout(() => { try { tornado.remove(); } catch (e) { } }, 700);
      }, 900);

    } else if (equippedAnim === 'Earthquake Shake') {
      // Shake violently
      shakeCard(26, 32);
      if (typeof ScreenEffects !== 'undefined' && ScreenEffects.shake) {
        ScreenEffects.shake(24, 1600);
      }

      // Magma Fissure
      const fissure = document.createElement('div');
      fissure.style.position = 'fixed';
      fissure.style.left = `${enemyCenterX}px`;
      fissure.style.top = `${enemyCenterY + 20}px`;
      fissure.style.width = '0px';
      fissure.style.height = '10px';
      fissure.style.background = 'radial-gradient(ellipse, #ff3700 0%, #000 70%)';
      fissure.style.border = '2px solid #ffaa00';
      fissure.style.borderRadius = '50%';
      fissure.style.transform = 'translate(-50%, -50%)';
      fissure.style.boxShadow = '0 0 25px #ff3700';
      fissure.style.zIndex = '10998';
      fissure.style.pointerEvents = 'none';
      fissure.style.transition = 'all 1400ms cubic-bezier(0.1, 0.8, 0.3, 1)';
      document.body.appendChild(fissure);
      setTimeout(() => {
        fissure.style.width = '500px';
        fissure.style.height = '60px';
        fissure.style.boxShadow = '0 0 65px #ff5500';
      }, 50);
      setTimeout(() => {
        fissure.style.opacity = '0';
        setTimeout(() => { try { fissure.remove(); } catch (e) { } }, 400);
      }, 1200);

      // Raise rock and dust debris (35 particles)
      for (let i = 0; i < 35; i++) {
        setTimeout(() => {
          const rx = rect.left - 10 + Math.random() * (rect.width + 20);
          const ry = rect.bottom;
          const riseHeight = 60 + Math.random() * 60;
          createParticle(rx, ry, Math.random() > 0.4 ? '🪨' : '💨', 750, {
            left: `${rx + (Math.random() - 0.5) * 40}px`,
            top: `${ry - riseHeight}px`,
            opacity: '0',
            transform: 'scale(3.8) rotate(360deg)'
          }, '32px');
        }, i * 35);
      }
    }

    const duration = options.duration || 1800;
    setTimeout(() => {
      try { icon.remove(); } catch (e) { }
    }, duration);
  }

  static updateConsumableStrip() {
    const panel = document.getElementById('satchelPanel');
    if (!panel) return;
    const state = getGameState();

    const isConsumablesUnlocked = (typeof TaskManager !== 'undefined' && typeof TaskManager.isFeatureUnlocked === 'function')
      ? TaskManager.isFeatureUnlocked('consumables')
      : true;

    if (!isConsumablesUnlocked) {
      panel.innerHTML = `
        <div class="satchel-popout-icon" title="Unlocks at Streak 3">🔒</div>
        <div class="satchel-list" style="margin-top: 4px; font-size: 8px; color: var(--accent-gold); text-align: center; font-weight: bold;">Streak 3</div>
      `;
      return;
    }

    const consumableIcons = state.config?.shopItemIcons || {};
    const active = (PlayerManager && typeof PlayerManager.getActiveConsumables === 'function') ? PlayerManager.getActiveConsumables() : (state.playerState && state.playerState.consumables) || {};
    const ordered = Object.entries(active || {}).filter(([, count]) => Number(count) > 0);

    panel.innerHTML = `
      <div class="satchel-popout-icon">🎒</div>
      <div class="satchel-list" style="margin-top: 8px;">
        ${ordered.length ? ordered.map(([name, count]) => {
          const data = state.config?.consumables?.[name] || {};
          const icon = consumableIcons[name] || data.icon || '🧪';
          return `
            <button class="satchel-item" type="button" data-consumable="${name}">
              <span class="satchel-item-icon">${icon}</span>
              <span class="satchel-item-name-wrap">
                <span class="satchel-item-name">${name}</span>
                <span class="satchel-item-meta">${data.effect || ''}</span>
              </span>
              <span class="satchel-item-right">
                <span class="satchel-item-count">x${count}</span>
              </span>
            </button>
          `;
        }).join('') : '<div class="satchel-empty" style="font-size: 8px; padding: 4px 0;">No items</div>'}
      </div>
    `;

    // Make Satchel Draggable
    let isDragging = false;
    let startX = 0, startY = 0, initialLeft = 0, initialTop = 0;
    let latestX = 0, latestY = 0;
    let rafId = null;

    const onPointerDown = (e) => {
      if (e.target.closest('button, input, textarea, select, a, .satchel-item')) return;
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      isDragging = true;
      panel.classList.add('is-dragging');
      startX = e.clientX;
      startY = e.clientY;
      const rect = panel.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;
      panel.style.right = 'auto';
      panel.style.bottom = 'auto';
      panel.style.left = initialLeft + 'px';
      panel.style.top = initialTop + 'px';
      try { panel.setPointerCapture(e.pointerId); } catch (err) { }
    };

    const onPointerMove = (e) => {
      if (!isDragging) return;
      e.preventDefault();
      latestX = e.clientX;
      latestY = e.clientY;

      if (!rafId) {
        rafId = requestAnimationFrame(() => {
          const dx = latestX - startX;
          const dy = latestY - startY;
          let newLeft = initialLeft + dx;
          let newTop = initialTop + dy;

          const rect = panel.getBoundingClientRect();
          const maxX = window.innerWidth - rect.width;
          const maxY = window.innerHeight - rect.height;
          newLeft = Math.max(0, Math.min(newLeft, maxX));
          newTop = Math.max(0, Math.min(newTop, maxY));

          panel.style.left = newLeft + 'px';
          panel.style.top = newTop + 'px';
          rafId = null;
        });
      }
    };

    const onPointerUp = (e) => {
      if (!isDragging) return;
      isDragging = false;
      panel.classList.remove('is-dragging');
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      try { panel.releasePointerCapture(e.pointerId); } catch (err) { }
      localStorage.setItem('nemesis_satchel_pos', JSON.stringify({
        left: parseInt(panel.style.left, 10) || 0,
        top: parseInt(panel.style.top, 10) || 0
      }));
    };

    if (panel) {
      panel.addEventListener('pointerdown', onPointerDown);
      panel.addEventListener('pointermove', onPointerMove);
      panel.addEventListener('pointerup', onPointerUp);
      panel.addEventListener('pointercancel', onPointerUp);
    }

    panel.querySelectorAll('.satchel-item').forEach((item) => {
      item.addEventListener('click', (event) => {
        event.stopPropagation();
        const name = item.dataset.consumable;
        if (!name) return;
        try {
          const used = PlayerManager.useConsumable(name);

          if (used) {
            const icon = consumableIcons[name] || state.config?.consumables?.[name]?.icon || '🧪';
            FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2, `${icon} ${name} used`, { color: UIManager.themeColor('--accent-gold', '#FFB33F'), duration: 1800 });
            this.updateConsumableStrip();
            this.refreshGameUI();
          } else {
            FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2, 'No consumable left', { color: UIManager.themeColor('--danger-red', '#C00707') });
          }
        } catch (err) {
          console.warn('useConsumable failed', err);
        }
      });
    });

    this.positionSatchelPanel();
  }

  static positionSatchelPanel() {
    const panel = document.getElementById('satchelPanel');
    if (!panel) return;

    const savedPos = localStorage.getItem('nemesis_satchel_pos');
    if (savedPos) {
      try {
        const { left, top } = JSON.parse(savedPos);
        panel.style.bottom = 'auto';
        panel.style.right = 'auto';
        panel.style.left = left + 'px';
        panel.style.top = top + 'px';
        return;
      } catch (e) { }
    }

    panel.style.left = '12px';
    panel.style.bottom = '104px';
    panel.style.top = 'auto';
  }

  static renderBuffPanel() {
    const panel = document.getElementById('buffPanel');
    if (!panel) return;
    const state = getGameState();
    const buffs = Array.isArray(state.buffs) ? state.buffs : [];
    const cfg = state.config || {};
    if (!buffs.length) {
      panel.style.display = 'none';
      return;
    }
    panel.style.display = 'flex';
    const isExpanded = panel.classList.contains('expanded');
    panel.innerHTML = '';

    const triggerBtn = document.createElement('button');
    triggerBtn.className = 'buff-panel-trigger';
    triggerBtn.innerHTML = `<span>✨ Buffs (${buffs.length})</span> <span class="arrow">${isExpanded ? '▴' : '▾'}</span>`;
    triggerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      panel.classList.toggle('expanded');
      UIManager.renderBuffPanel();
    });
    panel.appendChild(triggerBtn);

    if (isExpanded) {
      const dropdown = document.createElement('div');
      dropdown.className = 'buff-panel-dropdown';
      buffs.forEach(name => {
        const meta = (cfg.buffs && cfg.buffs[name]) || { icon: '🔸', description: name };
        const row = document.createElement('div');
        row.className = 'buff-dropdown-row';
        row.dataset.buff = name;
        row.innerHTML = `<span class="buff-icon-sm">${meta.icon || '🔸'}</span> <span class="buff-name-sm">${name}</span>`;
        row.title = meta.description || name;
        row.addEventListener('click', (e) => {
          e.stopPropagation();
          try { PopupsManager.showDialogue(name, meta.description || ''); } catch (err) { }
        });
        dropdown.appendChild(row);
      });
      panel.appendChild(dropdown);
    }
  }

  static onBuffGained(detail) {
    if (!detail) return;
    const buffName = detail.buff || detail.name || detail.buffName;
    if (!buffName) return;
    try {
      const icon = (getGameState().config?.buffs?.[buffName]?.icon) || '';
      FloatingDamageNumber.show(window.innerWidth - 120, 80, `${icon} ${buffName}`, { color: UIManager.themeColor('--accent-gold', '#FFB33F'), duration: 1600 });
    } catch (e) { }
    try {
      const el = document.querySelector(`#buffPanel .buff-icon[data-buff="${buffName}"]`);
      if (el) {
        el.classList.add('buff-gain');
        setTimeout(() => el.classList.remove('buff-gain'), 950);
      }
    } catch (e) { }
  }

  static updateTabIndicators() {
    try {
      const state = getGameState();
      if (!state) return;

      // 1. Dailies count badge
      const dailies = TaskManager.getAllDailies() || [];
      const uncompletedDailies = dailies.filter(d => !d.completed).length;
      const dailiesBadge = document.getElementById('dailiesBadge');
      if (dailiesBadge) {
        if (uncompletedDailies > 0) {
          dailiesBadge.textContent = uncompletedDailies;
          dailiesBadge.classList.add('active');
        } else {
          dailiesBadge.classList.remove('active');
        }
      }

      // 2. To-Dos count badge
      const todos = TaskManager.getAllTodos() || [];
      const uncompletedTodos = todos.filter(t => !t.completed).length;
      const todosBadge = document.getElementById('todosBadge');
      if (todosBadge) {
        if (uncompletedTodos > 0) {
          todosBadge.textContent = uncompletedTodos;
          todosBadge.classList.add('active');
        } else {
          todosBadge.classList.remove('active');
        }
      }

      // 3. Pet upgrade/hunger indicators
      const petHandle = document.getElementById('petTabHandle');
      const petBadge = document.getElementById('petBadge');
      if (petHandle) {
        const petHunger = state.playerState?.petHunger !== undefined ? state.playerState.petHunger : 100;
        const petPoints = state.playerState?.petPoints || 0;
        const petUpgradeLevel = state.playerState?.petUpgradeLevel || 0;
        const cost = 5 + petUpgradeLevel * 2;
        
        petHandle.classList.remove('glow-green', 'glow-gold');
        if (petBadge) petBadge.classList.remove('active');

        if (petHunger <= 30) {
          if (petBadge) {
            petBadge.textContent = '!';
            petBadge.style.background = 'var(--danger-red, #ff4444)';
            petBadge.classList.add('active');
          }
          petHandle.classList.add('glow-gold');
        } else if (petPoints >= cost) {
          petHandle.classList.add('glow-green');
          if (petBadge) {
            petBadge.textContent = '▲';
            petBadge.style.background = 'var(--success-green, #44ff44)';
            petBadge.classList.add('active');
          }
        }
      }

      // 4. Achievements claim indicator
      const achievementsHandle = document.getElementById('achievementsTabHandle');
      if (achievementsHandle) {
        const currentRate = (dailies.length > 0) ? (dailies.filter(d => d.completed).length / dailies.length) : 0;
        achievementsHandle.classList.remove('glow-gold');
        if (currentRate === 1) {
          achievementsHandle.classList.add('glow-gold');
        }
      }
    } catch (e) {
      console.warn('updateTabIndicators error', e);
    }
  }

}
window.UIManager = UIManager;

window.addEventListener('resize', () => {
  if (typeof UIManager === 'undefined') return;
  if (UIManager.resizeScheduled) return;
  UIManager.resizeScheduled = true;
  requestAnimationFrame(() => {
    UIManager.invalidateThemeCache();
    UIManager.circleRectCache = null;
    UIManager.enemyPositionsCache = null;
    UIManager.updateStageBackdrop();
    UIManager.renderEnemies();
    if (typeof UIManager.positionActionButtons === 'function') UIManager.positionActionButtons();
    UIManager.resizeScheduled = false;
  });
});

// Asset helper - returns placeholder for now
function getAsset(type, id) {
  // TODO: Replace with actual asset system
  return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="32" height="32"%3E%3/svg%3E';
}

// Debug helper: force-apply a mutator to an enemy and trigger UI + event
window.debugAddMutator = function (enemyId, mutator) {
  try {
    const enemy = (typeof StageManager !== 'undefined' && StageManager.getEnemyById) ? StageManager.getEnemyById(enemyId) : (StageManager.getAllEnemies && StageManager.getAllEnemies().find(e => String(e.id) === String(enemyId)));
    if (!enemy) { console.warn('debugAddMutator: enemy not found', enemyId); return; }
    enemy.mutators = Array.isArray(enemy.mutators) ? enemy.mutators : [];
    if (enemy.mutators.includes(mutator)) {
      console.info('Enemy already has mutator', mutator); return;
    }
    enemy.mutators.push(mutator);
    try { getGameState().save(); } catch (e) { }
    try { getGameState().eventBus.emit(EVENTS.ENEMY_MUTATED, { enemyId: String(enemy.id), mutator, source: 'debug' }); } catch (e) { }
    try { if (typeof UIManager !== 'undefined') UIManager.renderEnemies(); } catch (e) { }
  } catch (e) { console.warn('debugAddMutator failed', e); }
};

class StatsHUD {
  static init() {
    // Draggable logic removed; StatsHUD now drives the #runStatsDashboard within Achievements panel.
    StatsHUD.update();
  }

  static update() {
    const hud = document.getElementById('runStatsDashboard');
    if (!hud) return;

    const state = getGameState();
    if (!state) return;

    const entries = (typeof UIManager !== 'undefined' && typeof UIManager.getRunCompletionEntries === 'function') 
      ? UIManager.getRunCompletionEntries() 
      : [];
    
    let avgRate = 0;
    if (entries.length > 0) {
      const sum = entries.reduce((acc, entry) => acc + (entry.pct || 0), 0);
      avgRate = sum / entries.length;
    }

    const startTime = Number(state.systemState?.gameStartTime) || 0;
    const runStats = state.systemState?.runStats || {};
    const msElapsed = startTime > 0 ? Date.now() - startTime : 0;
    const minsElapsed = msElapsed / 60000;

    const maxGoldVal = (typeof ShopManager !== 'undefined' && typeof ShopManager.calculateMaxGold === 'function') ? ShopManager.calculateMaxGold() : 0;
    const maxDiamondsVal = (typeof TaskManager !== 'undefined' && typeof TaskManager.getMaxPotentialDiamonds === 'function') ? TaskManager.getMaxPotentialDiamonds() : 0;
    const maxApVal = state.playerState?.maxAp || 0;

    const elDiaVal = document.getElementById('statsDiamondVelocity');
    const elApVal = document.getElementById('statsApVelocity');
    const elStreakVal = document.getElementById('statsStreakVal');
    if (elDiaVal) elDiaVal.textContent = Math.ceil(maxDiamondsVal);
    if (elApVal) elApVal.textContent = Math.ceil(maxApVal);

    if (elStreakVal && typeof TaskManager !== 'undefined' && typeof TaskManager.getWeightedAverageStreak === 'function') {
      const avgStreak = TaskManager.getWeightedAverageStreak();
      const streakBonus = TaskManager.getDailyStreakDamageBonus();
      const mult = 1 + streakBonus;
      const formattedStreak = Number.isInteger(avgStreak) ? avgStreak : avgStreak.toFixed(1);
      elStreakVal.textContent = `${formattedStreak} (x${mult.toFixed(1)})`;
    }

    const dmgDealtHits = runStats.last15DealtHits || [];
    const avgDmgDealt = dmgDealtHits.length > 0 
      ? (dmgDealtHits.reduce((a, b) => a + b, 0) / dmgDealtHits.length).toFixed(1) 
      : '0.0';

    const totalDmgTaken = Number(runStats.totalDamageTaken) || 0;
    const dmgTakenCount = Number(runStats.damageTakenCount) || 0;
    const avgDmgTaken = dmgTakenCount > 0 ? (totalDmgTaken / dmgTakenCount).toFixed(1) : '0.0';

    const elDmgDealt = document.getElementById('statsDmgDealtAvg');
    const elDmgTaken = document.getElementById('statsDmgTakenAvg');
    if (elDmgDealt) elDmgDealt.textContent = avgDmgDealt;
    if (elDmgTaken) elDmgTaken.textContent = avgDmgTaken;
    
    // Expanded Stats Grid Updates
    const formatNumber = (num) => Math.floor(num || 0).toLocaleString();
    if (document.getElementById('statTotalDmgDealt')) document.getElementById('statTotalDmgDealt').textContent = formatNumber(runStats.totalDamageDealt);
    if (document.getElementById('statTotalDmgTaken')) document.getElementById('statTotalDmgTaken').textContent = formatNumber(runStats.totalDamageTaken);
    if (document.getElementById('statTotalCrits')) document.getElementById('statTotalCrits').textContent = formatNumber(runStats.criticalHitsCount);
    if (document.getElementById('statTotalApSpent')) document.getElementById('statTotalApSpent').textContent = formatNumber(runStats.totalApSpent);
    if (document.getElementById('statTotalManaRestored')) document.getElementById('statTotalManaRestored').textContent = formatNumber(runStats.totalManaRestored);
    
    if (document.getElementById('statStageWinRate')) {
      const clears = runStats.stageClears || 0;
      const enters = runStats.stageEnters || 0;
      const wr = enters > 0 ? (clears / enters * 100).toFixed(1) : 100;
      document.getElementById('statStageWinRate').textContent = `${wr}%`;
    }
    
    if (document.getElementById('statTaskCompletionRate')) {
      document.getElementById('statTaskCompletionRate').textContent = `${(avgRate * 100).toFixed(1)}%`;
    }
    
    if (document.getElementById('statTotalFocusMins')) document.getElementById('statTotalFocusMins').textContent = `${formatNumber(runStats.focusMinutesCount || 0)} min`;
    if (document.getElementById('statBossesDefeated')) document.getElementById('statBossesDefeated').textContent = formatNumber(runStats.bossesDefeated);
    if (document.getElementById('statOverkillDamage')) document.getElementById('statOverkillDamage').textContent = formatNumber(runStats.totalOverkillDamage);
    if (document.getElementById('statDodgesSucceeded')) document.getElementById('statDodgesSucceeded').textContent = formatNumber(runStats.dodgesCount);
    if (document.getElementById('statEnemiesSlain')) document.getElementById('statEnemiesSlain').textContent = formatNumber(runStats.enemiesSlain);

    StatsHUD.drawCharts(avgRate);
  }

  static drawCharts(avgRate = null) {
    const hud = document.getElementById('runStatsDashboard');
    if (!hud) return;

    const state = getGameState();
    if (!state) return;

    if (avgRate === null) {
      const entries = (typeof UIManager !== 'undefined' && typeof UIManager.getRunCompletionEntries === 'function') 
        ? UIManager.getRunCompletionEntries() 
        : [];
      let sum = 0;
      if (entries.length > 0) {
        sum = entries.reduce((acc, entry) => acc + (entry.pct || 0), 0);
        avgRate = sum / entries.length;
      } else {
        avgRate = 0;
      }
    }

    const gasContainer = document.getElementById('statsGasMeterSvgContainer');
    if (gasContainer) {
      const ratePct = Math.round(avgRate * 100);
      const circumference = 56.55;
      const strokeOffset = circumference * (1 - avgRate);

      // Determine nemesis reward rate:
      // It is the daily reward rate multiplier (0.8, i.e., 80%) applied to potential daily attribute gains
      const nemesisRateMult = state.systemState?.nemesisDailyRewardRate ?? 0.8;
      const nemesisRatePct = Math.round(nemesisRateMult * 100);

      gasContainer.innerHTML = `
        <svg viewBox="0 0 100 32" style="width:100%; height:100%; overflow:visible;">
          <path d="M 32 24 A 18 18 0 0 1 68 24" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="4" stroke-linecap="round"/>
          <path d="M 32 24 A 18 18 0 0 1 68 24" fill="none" stroke="url(#gasGradient)" stroke-width="4" stroke-linecap="round"
                stroke-dasharray="${circumference}" stroke-dashoffset="${strokeOffset}" style="transition: stroke-dashoffset 0.5s ease;"/>
          <line x1="50" y1="24" x2="${50 + 15 * Math.cos(Math.PI * (1 - avgRate))}" y2="${24 - 15 * Math.sin(Math.PI * (1 - avgRate))}" 
                stroke="#d8b4fe" stroke-width="1" stroke-linecap="round" style="transition: all 0.5s ease;"/>
          <circle cx="50" cy="24" r="2" fill="#a78bfa"/>
          <text x="22" y="19" font-size="5" font-weight="normal" fill="#ef4444" text-anchor="middle">${nemesisRatePct}%</text>
          <text x="50" y="19" font-size="7" font-weight="bold" fill="#fff" text-anchor="middle">${ratePct}%</text>
          <text x="50" y="30" font-size="4.5" fill="#9ca3af" text-anchor="middle" font-weight="bold">RUN COMPLETION</text>
          <defs>
            <linearGradient id="gasGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#ef4444"/>
              <stop offset="50%" stop-color="#f59e0b"/>
              <stop offset="100%" stop-color="#10b981"/>
            </linearGradient>
          </defs>
        </svg>
      `;
    }

    const radarContainer = document.getElementById('statsRadarSvgContainer');
    if (radarContainer) {
      const config = state.config || {};
      const attributes = config.attributes || ['STR', 'INT', 'DISC', 'CREA', 'SOC', 'CAP', 'RESP'];
      const playerAttrs = state.playerState?.attributes || {};
      const nemesisAttrs = state.nemesisState?.attributes || {};
      const attrColors = config.attributeColors || {};

      const C_X = 50;
      const C_Y = 45;
      const R = 26;
      const numPoints = attributes.length;
      const angleStep = (2 * Math.PI) / numPoints;

      let gridsHtml = '';
      const gridLevels = [0.25, 0.5, 0.75, 1.0];
      gridLevels.forEach(lvl => {
        const pts = [];
        for (let i = 0; i < numPoints; i++) {
          const angle = i * angleStep - Math.PI / 2;
          const x = C_X + R * lvl * Math.cos(angle);
          const y = C_Y + R * lvl * Math.sin(angle);
          pts.push(`${x},${y}`);
        }
        gridsHtml += `<polygon points="${pts.join(' ')}" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="0.3"/>`;
      });

      let axesHtml = '';
      for (let i = 0; i < numPoints; i++) {
        const angle = i * angleStep - Math.PI / 2;
        const x = C_X + R * Math.cos(angle);
        const y = C_Y + R * Math.sin(angle);
        axesHtml += `<line x1="${C_X}" y1="${C_Y}" x2="${x}" y2="${y}" stroke="rgba(255,255,255,0.08)" stroke-width="0.3"/>`;
      }

      const playerPts = [];
      for (let i = 0; i < numPoints; i++) {
        const attr = attributes[i];
        const pPoints = playerAttrs[attr]?.points || 0;
        const nPoints = nemesisAttrs[attr]?.points || 0;
        const axisLimit = Math.max(1, (pPoints + nPoints) * 0.7);
        const val = Math.min(pPoints, axisLimit);
        const radius = (val / axisLimit) * R;
        const angle = i * angleStep - Math.PI / 2;
        const x = C_X + radius * Math.cos(angle);
        const y = C_Y + radius * Math.sin(angle);
        playerPts.push(`${x},${y}`);
      }
      const playerPolygon = `<polygon points="${playerPts.join(' ')}" fill="rgba(139, 92, 246, 0.25)" stroke="#8b5cf6" stroke-width="0.8"/>`;

      const nemesisPts = [];
      for (let i = 0; i < numPoints; i++) {
        const attr = attributes[i];
        const pPoints = playerAttrs[attr]?.points || 0;
        const nPoints = nemesisAttrs[attr]?.points || 0;
        const axisLimit = Math.max(1, (pPoints + nPoints) * 0.7);
        const val = Math.min(nPoints, axisLimit);
        const radius = (val / axisLimit) * R;
        const angle = i * angleStep - Math.PI / 2;
        const x = C_X + radius * Math.cos(angle);
        const y = C_Y + radius * Math.sin(angle);
        nemesisPts.push(`${x},${y}`);
      }
      const nemesisPolygon = `<polygon points="${nemesisPts.join(' ')}" fill="rgba(239, 68, 68, 0.15)" stroke="#ef4444" stroke-width="0.8" stroke-dasharray="1.5,1.5"/>`;

      let labelsHtml = '';
      for (let i = 0; i < numPoints; i++) {
        const attr = attributes[i];
        const angle = i * angleStep - Math.PI / 2;
        const labelRadius = R + 7;
        const x = C_X + labelRadius * Math.cos(angle);
        const y = C_Y + labelRadius * Math.sin(angle);

        let textAnchor = 'middle';
        if (Math.cos(angle) > 0.15) textAnchor = 'start';
        else if (Math.cos(angle) < -0.15) textAnchor = 'end';

        let dy = '0.3em';
        if (Math.sin(angle) < -0.8) dy = '-0.3em';
        else if (Math.sin(angle) > 0.8) dy = '0.8em';

        const color = attrColors[attr] || '#f1de97';
        const pVal = Math.round(playerAttrs[attr]?.points || 0);
        labelsHtml += `<text x="${x}" y="${y}" font-size="4.5" fill="${color}" font-weight="bold" text-anchor="${textAnchor}" dy="${dy}">${attr} ${pVal}</text>`;
      }

      const avgStreak = (typeof TaskManager !== 'undefined' && typeof TaskManager.getWeightedAverageStreak === 'function')
        ? TaskManager.getWeightedAverageStreak()
        : 0;
      const avgStreakVal = avgStreak.toFixed(1);

      radarContainer.innerHTML = `
        <svg viewBox="0 0 100 95" style="width:100%; height:100%; overflow:visible;">
          ${gridsHtml}
          ${axesHtml}
          ${nemesisPolygon}
          ${playerPolygon}
          <text x="${C_X}" y="${C_Y}" font-size="5.5" fill="#ffd700" font-weight="bold" text-anchor="middle" dominant-baseline="central" opacity="0.9" style="text-shadow: 0 0 4px rgba(0,0,0,0.9);">${avgStreakVal}</text>
          ${labelsHtml}
          <g transform="translate(5, 90)" font-size="4.2" font-weight="bold">
            <circle cx="2" cy="-1.5" r="1" fill="#8b5cf6"/>
            <text x="5" y="0" fill="#a78bfa">Player</text>
            <circle cx="35" cy="-1.5" r="1" fill="#ef4444"/>
            <text x="38" y="0" fill="#ef4444">Nemesis</text>
          </g>
        </svg>
      `;
    }
  }
}
window.StatsHUD = StatsHUD;

