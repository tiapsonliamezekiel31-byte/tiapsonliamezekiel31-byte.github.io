/**
 * NEMESIS ROGUELIKE — UI SYSTEM
 * HUD, enemy circle, spinner, buttons, pull-tabs
 */

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
    1: {
      A: { src: 'assets/backgrounds/forest.jpg', mobilePosition: 'center 30%', desktopPosition: 'center 34%' },
      B: { src: 'assets/backgrounds/desert.jpg', mobilePosition: 'center 42%', desktopPosition: 'center 44%' }
    },
    2: {
      A: { src: 'assets/backgrounds/cave.jpg', mobilePosition: 'center center', desktopPosition: 'center center' },
      B: { src: 'assets/backgrounds/swamp.jpg', mobilePosition: 'center 38%', desktopPosition: 'center 40%' }
    },
    3: {
      A: { src: 'assets/backgrounds/glacier.jpg', mobilePosition: 'center 28%', desktopPosition: 'center 32%' },
      B: { src: 'assets/backgrounds/ruins.jpg', mobilePosition: 'center 34%', desktopPosition: 'center 36%' }
    },
    4: {
      A: { src: 'assets/backgrounds/graveyard.jpg', mobilePosition: 'center 42%', desktopPosition: 'center 44%' },
      B: { src: 'assets/backgrounds/download.jpg', mobilePosition: 'center 40%', desktopPosition: 'center 42%' }
    },
    5: {
      A: { src: 'assets/backgrounds/volcano.jpg', mobilePosition: 'center 48%', desktopPosition: 'center 50%' },
      B: { src: 'assets/backgrounds/isle.jpg', mobilePosition: 'center 32%', desktopPosition: 'center 34%' }
    },
    6: {
      A: { src: 'assets/backgrounds/mountain.jpg', mobilePosition: 'center 28%', desktopPosition: 'center 32%' },
      B: { src: 'assets/backgrounds/sea.jpg', mobilePosition: 'center 36%', desktopPosition: 'center 38%' }
    },
    7: {
      A: { src: 'assets/backgrounds/void.jpg', mobilePosition: 'center center', desktopPosition: 'center center' },
      B: { src: 'assets/backgrounds/void.jpg', mobilePosition: 'center center', desktopPosition: 'center center' }
    }
  };

  static scheduleUpdateDailiesList(delay = 120) {
    if (UIManager._updateDailiesTimer) clearTimeout(UIManager._updateDailiesTimer);
    UIManager._updateDailiesTimer = setTimeout(() => {
      UIManager._updateDailiesTimer = null;
      try { UIManager.updateDailiesList(); } catch (e) { console.error('updateDailiesList error', e); }
    }, delay);
  }

  static showDailyApReward(card, amount) {
    const rect = card?.getBoundingClientRect?.();
    if (!rect) return;

    FloatingDamageNumber.show(
      rect.left + rect.width / 2,
      Math.max(12, rect.top - 18),
      `+${Math.ceil(amount)} AP`,
      { color: UIManager.themeColor('--ap-gold', '#FFB33F') }
    );
  }

  static spawnDiamondFloatingPopup(x, y, amount) {
    if (!amount || amount <= 0) return;
    try {
      FloatingDamageNumber.show(x, y, `+${amount} 💎`, {
        color: '#00e5ff',
        scale: 1.2
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

  // Mutator display metadata: emoji, color, one-line description
  static MUTATOR_META = {
    vampiric: { icon: '🩸', color: '#C00707', label: 'Vampiric', desc: 'Heals itself when it deals damage' },
    regenerator: { icon: '🌿', color: '#30C85A', label: 'Regenerator', desc: 'Heals every check-in' },
    rallyist: { icon: '📣', color: '#FFB84D', label: 'Rallyist', desc: 'Multiplies damage of all enemies by 1.2x per Rallyist' },
    turret: { icon: '🔫', color: '#8B0000', label: 'Turret', desc: 'Deals backlash damage when you attack others' },
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
    try {
      if (typeof document === 'undefined') return fallback;
      const v = getComputedStyle(document.documentElement).getPropertyValue(varName);
      if (v && v.trim()) return v.trim();
    } catch (e) { }
    return fallback;
  }

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
    this.createHudWidget();
    this.createStatsHudWidget();
    this.createNavigationMenu();
    this.createGameArea();
    this.createActionButtons();
    this.createPullTabs();
    this.createShopPanel();
    this.bindEventListeners();
    this.adjustLayout();
    this.ensureSpinnerLoop();
    this.refreshGameUI();
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
      <div class="hud-resources">
        <div class="hud-resource">
          <label>HP</label>
          <div class="hud-bar hp-bar"><div id="hpFill" class="fill" style="width: 100%"></div></div>
          <div class="hud-resource-text"><span id="hpValue">100</span>/<span id="hpMax">100</span></div>
        </div>
        <div class="hud-resource">
          <label>Mana</label>
          <div class="hud-bar mana-bar"><div id="manaFill" class="fill" style="width: 100%"></div></div>
          <div class="hud-resource-text"><span id="manaValue">0</span>/<span id="manaMax">0</span></div>
        </div>
        <div class="hud-resource">
          <label>AP</label>
          <div class="hud-bar ap-bar"><div id="apFill" class="fill" style="width: 100%"></div></div>
          <div class="hud-resource-text"><span id="apValue">0</span>/<span id="apMax">0</span></div>
        </div>
        <div class="hud-resource" id="pendingDmgRow" style="display: none;">
          <label style="color: #ff5a5a;">PENDING</label>
          <div class="hud-bar" style="background: rgba(255, 90, 90, 0.15); border-color: rgba(255, 90, 90, 0.3);"><div id="pendingDmgFill" class="fill" style="width: 0%; background: linear-gradient(90deg, #ff5a5a, #ff3333);"></div></div>
          <div class="hud-resource-text" style="color: #ff9b9b;"><span id="pendingDmgValue">0</span> DMG</div>
        </div>
      </div>
      <div class="hud-currencies">
        <span>💰 <span id="goldValue">0</span></span>
        <span>💎 <span id="diamondValue">0</span></span>
      </div>
    `;
    document.body.appendChild(hud);

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

          const maxX = window.innerWidth - hud.offsetWidth;
          const maxY = window.innerHeight - hud.offsetHeight;
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

  static createStatsHudWidget() {
    const statsHud = document.createElement('div');
    statsHud.id = 'statsHudWidget';
    statsHud.className = 'draggable-stats-hud';
    statsHud.innerHTML = `
      <div class="stats-hud-header">
        <div class="stats-hud-header-title">📊 <span>RUN STATS</span></div>
        <div class="stats-hud-controls">
          <button class="stats-hud-btn stats-toggle-btn" title="Minimize/Maximize">－</button>
        </div>
      </div>
      <div class="stats-hud-content">
        <!-- Gas Meter -->
        <div class="stats-hud-section">
          <div class="stats-gas-meter-container" id="statsGasMeterSvgContainer"></div>
        </div>
        <!-- Radar Chart -->
        <div class="stats-hud-section">
          <div class="stats-hud-section-title">Attributes (vs Nemesis)</div>
          <div class="stats-radar-container" id="statsRadarSvgContainer"></div>
        </div>
        <!-- Advanced Statistics Grid -->
        <div class="stats-grid">
          <div class="stats-box">
            <span class="stats-box-label">Gold velocity</span>
            <span class="stats-box-value" id="statsGoldVelocity">0.0/min</span>
          </div>
          <div class="stats-box">
            <span class="stats-box-label">Diamond velocity</span>
            <span class="stats-box-value" id="statsDiamondVelocity">0.0/min</span>
          </div>
          <div class="stats-box">
            <span class="stats-box-label">Avg Dealt Hit</span>
            <span class="stats-box-value" id="statsDmgDealtAvg">0.0</span>
            <span class="stats-box-sub">Last 15 hits</span>
          </div>
          <div class="stats-box">
            <span class="stats-box-label">Avg Taken Hit</span>
            <span class="stats-box-value" id="statsDmgTakenAvg">0.0</span>
            <span class="stats-box-sub">Across run</span>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(statsHud);
    try {
      StatsHUD.init();
    } catch (e) {
      console.error('StatsHUD init error', e);
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
          <button id="focusTimerBtn" class="btn-focus-timer" title="Focus Timer">⏱️ FOCUS</button>
          <div id="satchelPanel" class="satchel-panel" aria-label="Consumables"></div>
      </div>
      <div id="buffPanel" class="buff-panel" aria-label="Buffs"></div>
      <div id="runCompletionPanel" class="run-completion-panel" aria-label="Run completion graph">
        <div class="run-completion-head">
          <span>RUN COMPLETION</span>
          <button id="runCompletionToggle" title="Compare vs Nemesis" style="background:none;border:none;cursor:pointer;font-size:11px;padding:0 0 0 4px;opacity:0.75;line-height:1;">⚔️</button>
          <button id="runCompletionRewardsToggle" title="Buy Diamond Rewards" style="background:none;border:none;cursor:pointer;font-size:11px;padding:0 0 0 4px;opacity:0.75;line-height:1;">🎁</button>
          <span id="runCompletionRate">0%</span>
        </div>
        <svg id="runCompletionGraph" viewBox="0 0 160 56" preserveAspectRatio="none" aria-hidden="true"></svg>
        <div id="runCompletionAttrsContainer" style="display:none;"></div>
        <div id="runCompletionRewardsContainer" style="display:none; max-height:48px; overflow-y:auto; padding:2px 0;"></div>
      </div>
      <div id="weeklyHeatmapPanel" class="weekly-heatmap-panel" aria-label="Consistency Heatmap">
        <div class="weekly-heatmap-head">
          <span>CONSISTENCY HEATMAP</span>
          <button id="weeklyHeatmapCollapseBtn" class="stage-notes-collapse-btn">－</button>
        </div>
        <div class="weekly-heatmap-body" id="weeklyHeatmapBody"></div>
      </div>
      <button id="weeklyHeatmapMinimized" class="weekly-heatmap-minimized" style="display: none;" title="Open Consistency Heatmap">📊</button>
      <div id="eventBannerPanel" class="event-banner-panel" aria-label="Event Banner" style="display: none;">
        <div class="event-banner-content">
          <div id="eventBannerTitle" class="event-banner-title">Event Name</div>
          <div id="eventBannerDesc" class="event-banner-desc">Event description</div>
          <button id="eventBannerClaimBtn" class="btn-action-circle btn-claim-event" disabled>CLAIM</button>
        </div>
        <div class="event-banner-resize-handle" id="eventBannerResizeHandle">⤡</div>
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
      <div id="focus-mini-widget" style="display: none;">
        <div class="mini-widget-pulse-dot"></div>
        <span id="focusMiniTime">25:00</span>
      </div>
      
      <!-- Stage Notes Widget -->
      <div id="stageNotesWidget" class="stage-notes-widget" style="display: none;">
        <div class="stage-notes-header" id="stageNotesHeader">
          <span class="stage-notes-title">📜 STAGE NOTES</span>
          <button class="stage-notes-collapse-btn" id="stageNotesCollapseBtn">－</button>
        </div>
        <div class="stage-notes-body">
          <textarea id="stageNotesTextarea" class="stage-notes-textarea" placeholder="Write stage notes here..."></textarea>
        </div>
      </div>
      <button id="stageNotesMinimized" class="stage-notes-minimized" style="display: none;" title="Open Stage Notes">📜</button>
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

    const rcPanel = gameArea.querySelector('#runCompletionPanel');
    if (rcPanel) {
      rcPanel.addEventListener('click', (e) => {
        const toggleBtn = e.target.closest('#runCompletionToggle');
        if (toggleBtn) {
          const state = getGameState();
          if (!state.systemState) state.systemState = {};
          state.systemState.showRewardsInCompletionPanel = false;
          state.systemState.showAttrsInCompletionPanel = !state.systemState.showAttrsInCompletionPanel;
          UIManager.updateRunCompletionGraph();
        }
        const rewardsToggleBtn = e.target.closest('#runCompletionRewardsToggle');
        if (rewardsToggleBtn) {
          const state = getGameState();
          if (!state.systemState) state.systemState = {};
          state.systemState.showAttrsInCompletionPanel = false;
          state.systemState.showRewardsInCompletionPanel = !state.systemState.showRewardsInCompletionPanel;
          UIManager.updateRunCompletionGraph();
        }
      });
    }
    let isRcDragging = false;
    let rcStartX = 0, rcStartY = 0, rcInitialLeft = 0, rcInitialTop = 0;
    let rcLatestX = 0, rcLatestY = 0;
    let rcRafId = null;

    const savedRcPos = localStorage.getItem('nemesis_run_graph_pos');
    if (savedRcPos) {
      try {
        const { left, top } = JSON.parse(savedRcPos);
        rcPanel.style.right = 'auto';
        rcPanel.style.bottom = 'auto';
        rcPanel.style.left = left + 'px';
        rcPanel.style.top = top + 'px';
      } catch (e) { }
    }

    const onRcMove = (e) => {
      if (!isRcDragging) return;
      e.preventDefault();
      rcLatestX = e.clientX;
      rcLatestY = e.clientY;

      if (!rcRafId) {
        rcRafId = requestAnimationFrame(() => {
          const dx = rcLatestX - rcStartX;
          const dy = rcLatestY - rcStartY;
          let newLeft = rcInitialLeft + dx;
          let newTop = rcInitialTop + dy;

          const maxX = window.innerWidth - rcPanel.offsetWidth;
          const maxY = window.innerHeight - rcPanel.offsetHeight;
          newLeft = Math.max(0, Math.min(newLeft, maxX));
          newTop = Math.max(0, Math.min(newTop, maxY));

          rcPanel.style.left = newLeft + 'px';
          rcPanel.style.top = newTop + 'px';
          rcRafId = null;
        });
      }
    };

    const onRcUp = (e) => {
      if (!isRcDragging) return;
      isRcDragging = false;
      rcPanel.classList.remove('is-dragging');
      if (rcRafId) {
        cancelAnimationFrame(rcRafId);
        rcRafId = null;
      }
      document.removeEventListener('pointermove', onRcMove);
      document.removeEventListener('pointerup', onRcUp);
      document.removeEventListener('pointercancel', onRcUp);
      try { rcPanel.releasePointerCapture(e.pointerId); } catch (err) { }
      localStorage.setItem('nemesis_run_graph_pos', JSON.stringify({
        left: parseInt(rcPanel.style.left, 10) || 0,
        top: parseInt(rcPanel.style.top, 10) || 0
      }));
    };

    const onRcDown = (e) => {
      if (e.target.closest('button, input, textarea, select, a')) return;
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      isRcDragging = true;
      rcPanel.classList.add('is-dragging');
      rcStartX = e.clientX;
      rcStartY = e.clientY;
      const rect = rcPanel.getBoundingClientRect();
      rcInitialLeft = rect.left;
      rcInitialTop = rect.top;
      rcPanel.style.right = 'auto';
      rcPanel.style.bottom = 'auto';
      rcPanel.style.left = rcInitialLeft + 'px';
      rcPanel.style.top = rcInitialTop + 'px';
      try { rcPanel.setPointerCapture(e.pointerId); } catch (err) { }

      document.addEventListener('pointermove', onRcMove);
      document.addEventListener('pointerup', onRcUp);
      document.addEventListener('pointercancel', onRcUp);
    };

    if (rcPanel) {
      rcPanel.addEventListener('pointerdown', onRcDown);
    }

    // Consistency Heatmap Widget setup
    const heatmapPanel = gameArea.querySelector('#weeklyHeatmapPanel');
    const heatmapMinimized = gameArea.querySelector('#weeklyHeatmapMinimized');
    const heatmapCollapseBtn = gameArea.querySelector('#weeklyHeatmapCollapseBtn');

    if (heatmapCollapseBtn && heatmapPanel && heatmapMinimized) {
      heatmapCollapseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        heatmapPanel.style.display = 'none';
        heatmapMinimized.style.display = 'flex';
        localStorage.setItem('nemesis_heatmap_collapsed', 'true');
      });
    }

    if (heatmapMinimized && heatmapPanel) {
      heatmapMinimized.addEventListener('click', () => {
        heatmapPanel.style.display = 'block';
        heatmapMinimized.style.display = 'none';
        localStorage.setItem('nemesis_heatmap_collapsed', 'false');
        
        const savedPos = localStorage.getItem('nemesis_heatmap_pos');
        if (savedPos) {
          try {
            const { left, top } = JSON.parse(savedPos);
            heatmapPanel.style.left = left + 'px';
            heatmapPanel.style.top = top + 'px';
          } catch (e) { }
        }
      });
    }

    // Load collapsed state
    const isHeatmapCollapsed = localStorage.getItem('nemesis_heatmap_collapsed') === 'true';
    if (isHeatmapCollapsed) {
      if (heatmapPanel) heatmapPanel.style.display = 'none';
      if (heatmapMinimized) heatmapMinimized.style.display = 'flex';
    } else {
      if (heatmapPanel) heatmapPanel.style.display = 'block';
      if (heatmapMinimized) heatmapMinimized.style.display = 'none';
    }

    // Load positions
    const savedHeatmapPos = localStorage.getItem('nemesis_heatmap_pos');
    if (savedHeatmapPos && heatmapPanel) {
      try {
        const { left, top } = JSON.parse(savedHeatmapPos);
        heatmapPanel.style.left = left + 'px';
        heatmapPanel.style.top = top + 'px';
        if (heatmapMinimized) {
          heatmapMinimized.style.left = left + 'px';
          heatmapMinimized.style.top = top + 'px';
        }
      } catch (e) { }
    }

    // Draggable logic for heatmapPanel
    let isHmDragging = false;
    let hmStartX = 0, hmStartY = 0, hmInitialLeft = 0, hmInitialTop = 0;
    let hmLatestX = 0, hmLatestY = 0;
    let hmRafId = null;

    const onHmMove = (e) => {
      if (!isHmDragging) return;
      e.preventDefault();
      hmLatestX = e.clientX;
      hmLatestY = e.clientY;

      if (!hmRafId) {
        hmRafId = requestAnimationFrame(() => {
          const dx = hmLatestX - hmStartX;
          const dy = hmLatestY - hmStartY;
          let newLeft = hmInitialLeft + dx;
          let newTop = hmInitialTop + dy;

          const maxX = window.innerWidth - heatmapPanel.offsetWidth;
          const maxY = window.innerHeight - heatmapPanel.offsetHeight;
          newLeft = Math.max(0, Math.min(newLeft, maxX));
          newTop = Math.max(0, Math.min(newTop, maxY));

          heatmapPanel.style.left = newLeft + 'px';
          heatmapPanel.style.top = newTop + 'px';
          if (heatmapMinimized) {
            heatmapMinimized.style.left = newLeft + 'px';
            heatmapMinimized.style.top = newTop + 'px';
          }
          hmRafId = null;
        });
      }
    };

    const onHmUp = (e) => {
      if (!isHmDragging) return;
      isHmDragging = false;
      heatmapPanel.classList.remove('is-dragging');
      if (hmRafId) {
        cancelAnimationFrame(hmRafId);
        hmRafId = null;
      }
      document.removeEventListener('pointermove', onHmMove);
      document.removeEventListener('pointerup', onHmUp);
      document.removeEventListener('pointercancel', onHmUp);
      try { heatmapPanel.releasePointerCapture(e.pointerId); } catch (err) { }
      localStorage.setItem('nemesis_heatmap_pos', JSON.stringify({
        left: parseInt(heatmapPanel.style.left, 10) || 0,
        top: parseInt(heatmapPanel.style.top, 10) || 0
      }));
    };

    const onHmDown = (e) => {
      if (e.target.closest('button, input, textarea, select, a')) return;
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      isHmDragging = true;
      heatmapPanel.classList.add('is-dragging');
      hmStartX = e.clientX;
      hmStartY = e.clientY;
      const rect = heatmapPanel.getBoundingClientRect();
      hmInitialLeft = rect.left;
      hmInitialTop = rect.top;
      heatmapPanel.style.right = 'auto';
      heatmapPanel.style.bottom = 'auto';
      heatmapPanel.style.left = hmInitialLeft + 'px';
      heatmapPanel.style.top = hmInitialTop + 'px';
      try { heatmapPanel.setPointerCapture(e.pointerId); } catch (err) { }

      document.addEventListener('pointermove', onHmMove);
      document.addEventListener('pointerup', onHmUp);
      document.addEventListener('pointercancel', onHmUp);
    };

    if (heatmapPanel) {
      heatmapPanel.addEventListener('pointerdown', onHmDown);
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

    // === Initialize Stage Notes Widget ===
    const notesWidget = gameArea.querySelector('#stageNotesWidget');
    const notesMinimized = gameArea.querySelector('#stageNotesMinimized');
    const notesTextarea = gameArea.querySelector('#stageNotesTextarea');
    const notesCollapseBtn = gameArea.querySelector('#stageNotesCollapseBtn');

    // Load saved text and handle auto-resizing
    const resizeTextarea = () => {
      if (notesTextarea) {
        notesTextarea.style.height = 'auto';
        const scrollHeight = notesTextarea.scrollHeight;
        if (scrollHeight > 250) {
          notesTextarea.style.height = '250px';
          notesTextarea.style.overflowY = 'auto';
        } else {
          notesTextarea.style.height = (scrollHeight > 50 ? scrollHeight : 50) + 'px';
          notesTextarea.style.overflowY = 'hidden';
        }
      }
    };

    if (notesTextarea) {
      notesTextarea.value = localStorage.getItem('nemesis_stage_notes_text') || '';
      notesTextarea.addEventListener('input', () => {
        localStorage.setItem('nemesis_stage_notes_text', notesTextarea.value);
        resizeTextarea();
      });
      setTimeout(resizeTextarea, 0);
    }

    // Load collapsed state
    const isCollapsed = localStorage.getItem('nemesis_stage_notes_collapsed') === 'true';
    if (isCollapsed) {
      if (notesWidget) notesWidget.style.display = 'none';
      if (notesMinimized) notesMinimized.style.display = 'flex';
    } else {
      if (notesWidget) notesWidget.style.display = 'flex';
      if (notesMinimized) notesMinimized.style.display = 'none';
    }

    // Toggle minimize/collapse
    if (notesCollapseBtn) {
      notesCollapseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (notesWidget) notesWidget.style.display = 'none';
        if (notesMinimized) notesMinimized.style.display = 'flex';
        localStorage.setItem('nemesis_stage_notes_collapsed', 'true');
      });
    }

    if (notesMinimized) {
      notesMinimized.addEventListener('click', (e) => {
        if (notesWidget) notesWidget.style.display = 'flex';
        notesMinimized.style.display = 'none';
        localStorage.setItem('nemesis_stage_notes_collapsed', 'false');
        
        const savedPos = localStorage.getItem('nemesis_stage_notes_pos');
        if (savedPos && notesWidget) {
          try {
            const { left, top } = JSON.parse(savedPos);
            notesWidget.style.left = left + 'px';
            notesWidget.style.top = top + 'px';
          } catch(err){}
        }
        setTimeout(resizeTextarea, 0);
      });
    }

    // Load positions
    const savedWidgetPos = localStorage.getItem('nemesis_stage_notes_pos');
    if (savedWidgetPos && notesWidget) {
      try {
        const { left, top } = JSON.parse(savedWidgetPos);
        notesWidget.style.left = left + 'px';
        notesWidget.style.top = top + 'px';
      } catch(err){}
    }

    // Draggability helper
    const setupDraggableNotes = (element, handleElement, storageKey) => {
      let isDragging = false;
      let startX = 0, startY = 0;
      let initialLeft = 0, initialTop = 0;

      const onPointerMove = (e) => {
        if (!isDragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        let newLeft = initialLeft + dx;
        let newTop = initialTop + dy;

        const maxLeft = gameArea.clientWidth - element.offsetWidth;
        const maxTop = gameArea.clientHeight - element.offsetHeight;
        newLeft = Math.max(0, Math.min(newLeft, maxLeft));
        newTop = Math.max(0, Math.min(newTop, maxTop));

        element.style.left = newLeft + 'px';
        element.style.top = newTop + 'px';
      };

      const onPointerUp = (e) => {
        if (!isDragging) return;
        isDragging = false;
        document.removeEventListener('pointermove', onPointerMove);
        document.removeEventListener('pointerup', onPointerUp);
        document.removeEventListener('pointercancel', onPointerUp);
        try { handleElement.releasePointerCapture(e.pointerId); } catch(err){}
        localStorage.setItem(storageKey, JSON.stringify({
          left: parseInt(element.style.left, 10) || 0,
          top: parseInt(element.style.top, 10) || 0
        }));
      };

      const onPointerDown = (e) => {
        if (e.target.closest('textarea, button, input')) return; // Avoid drag when interacting with text area or buttons
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        const rect = element.getBoundingClientRect();
        const areaRect = gameArea.getBoundingClientRect();
        initialLeft = rect.left - areaRect.left;
        initialTop = rect.top - areaRect.top;
        try { handleElement.setPointerCapture(e.pointerId); } catch(err){}

        document.addEventListener('pointermove', onPointerMove);
        document.addEventListener('pointerup', onPointerUp);
        document.addEventListener('pointercancel', onPointerUp);
      };

      handleElement.addEventListener('pointerdown', onPointerDown);
    };

    if (notesWidget) {
      const header = notesWidget.querySelector('#stageNotesHeader');
      setupDraggableNotes(notesWidget, header, 'nemesis_stage_notes_pos');
    }

    this.updateStageBackdrop();
  }

  static createActionButtons() {
    const ring = document.querySelector('.action-ring');
    if (!ring) return;
    ring.innerHTML = `
      <button id="attackBtn" class="btn-action-circle">⚔️<div class="cost-text" id="attackCostText"></div></button>
      <button id="skillBtn" class="btn-action-circle">✨</button>
      <button id="dodgeBtn" class="btn-action-circle dodge-button">🛡️<div class="cost-text" id="dodgeCostText"></div></button>
    `;
  }

  static positionActionButtons() {
    const ring = document.querySelector('.action-ring');
    const circle = document.querySelector('.enemy-circle-container');
    if (!ring || !circle) return;

    const rect = circle.getBoundingClientRect();
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
      <div class="tab-header">
        <h3>DAILIES</h3>
        <div>
          <button id="completeDayBtn" class="btn-add btn-toggle btn-toggle-pill btn-toggle-ghost">Complete Day</button>
          <button id="addDailyNoteBtn" class="btn-add btn-toggle btn-toggle-pill btn-toggle-compact">＋ Note</button>
          <button id="addDailyRectBtn" class="btn-add btn-toggle btn-toggle-pill btn-toggle-compact">＋ Rect</button>
          <button id="dailiesShowCompletedBtn" class="btn-add btn-toggle btn-toggle-pill btn-toggle-compact" aria-pressed="false">Completed: off</button>
          <button id="dailiesEditModeBtn" class="btn-add btn-toggle btn-toggle-pill btn-toggle-compact" aria-pressed="false">Edit: off</button>
          <button id="dailiesAddBtn" class="btn-add">＋</button>
          <button class="tab-close">✕</button>
        </div>
      </div>
      <div class="daily-panel-summary"><span id="dailiesSummary">0/0 complete</span></div>
      <div class="tab-content daily-board" id="dailiesList"></div>
    `;
    document.body.appendChild(leftTab);

    // Achievements Panel
    const achievementsTab = document.createElement('div');
    achievementsTab.id = 'achievementsPanel';
    achievementsTab.className = 'pull-tab left-tab';
    achievementsTab.innerHTML = `
      <div class="tab-header">
        <h3>🏆 ACHIEVEMENTS</h3>
        <div>
          <select id="achievementsSortSelect" class="btn-add btn-toggle btn-toggle-pill btn-toggle-ghost" style="width: auto; padding-right: 28px; line-height: 1.5;">
            <option value="rate">Sort: Rate</option>
            <option value="streak">Sort: Streak</option>
          </select>
          <button id="achievementsRecalculateBtn" class="btn-add btn-toggle btn-toggle-pill btn-toggle-compact" style="width: auto; padding: 4px 10px; line-height: 1.5;">Recalculate</button>
          <button class="tab-close">✕</button>
        </div>
      </div>
      <div class="tab-content achievement-board" id="achievementsList" style="flex: 1 1 auto; overflow-y: auto;"></div>
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
      <div class="bulk-add-inline-container" id="bulkAddInlineContainer">
        <button id="toggleBulkAddInlineBtn" class="bulk-toggle-header-btn">＋ Inline Bulk Add (NLP) ▾</button>
        <div id="bulkAddInlineContent" class="bulk-add-inline-content" style="display: none;">
          <textarea id="bulkAddInlineTextarea" placeholder="Enter tasks (one per line). e.g.:&#10;Clean room Hard STR tomorrow&#10;Study math Medium INT monday 5pm" spellcheck="false"></textarea>
          <div class="bulk-add-inline-controls">
            <div class="inline-control-selects">
              <select id="inlineBulkAttr" title="Fallback Attribute"></select>
              <select id="inlineBulkDiff" title="Fallback Difficulty">
                <option value="Easy">Easy</option>
                <option value="Medium" selected>Medium</option>
                <option value="Hard">Hard</option>
                <option value="Ultra">Ultra</option>
              </select>
            </div>
            <button id="inlineBulkAddSaveBtn" class="btn-success btn-small">ADD ALL</button>
          </div>
          <div class="nlp-help-text">Type tags (e.g. STR, INT, Easy, tomorrow, 5pm) in line. System parses them!</div>
        </div>
      </div>
      <div class="tab-content todo-board" id="todosList"></div>
    `;
    document.body.appendChild(rightTab);

    // Pet Evolution Panel
    const petTab = document.createElement('div');
    petTab.id = 'petPanel';
    petTab.className = 'pull-tab right-tab';
    petTab.innerHTML = `
      <div class="tab-header">
        <h3>🐾 PET EVOLUTION</h3>
        <button class="tab-close">✕</button>
      </div>
      <div class="tab-content pet-board" style="flex: 1 1 auto; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; padding: 12px;">
        <div class="pet-info-card" style="display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 16px; border: 2px solid var(--accent-purple); border-radius: 12px; background: rgba(26, 18, 48, 0.45);">
          <div id="petImageContainer" style="width: 140px; height: 140px; border: 3px dashed var(--accent-gold); border-radius: 50%; display: flex; align-items: center; justify-content: center; overflow: hidden; background: rgba(0,0,0,0.3); position: relative; cursor: pointer;">
            <input type="file" id="petImageFileInput" accept="image/*" style="position: absolute; inset: 0; opacity: 0; cursor: pointer; z-index: 5;">
            <div id="petImageDisplay" style="font-size: 72px; pointer-events: none; z-index: 2; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;"></div>
          </div>
          
          <div style="display: flex; gap: 8px;">
            <button id="petUploadBtn" class="btn-action" style="font-size: 8px; padding: 6px 12px; min-width: 0;">Upload Pic</button>
            <button id="petClearImageBtn" class="btn-action" style="font-size: 8px; padding: 6px 12px; min-width: 0; display: none;">Reset Pic</button>
          </div>

          <div style="text-align: center;">
            <h4 style="color: var(--accent-gold); margin: 0; font-size: 11px;">Pet Level: <span id="petLevelVal">1</span></h4>
            <div style="font-size: 8px; color: var(--text-muted); margin-top: 4px;">Dmg: +<span id="petDmgBonusVal">0</span></div>
          </div>

          <div style="font-size: 9px; color: var(--accent-gold); font-weight: bold; background: rgba(0,0,0,0.2); padding: 6px 12px; border-radius: 6px; border: 1px solid rgba(232, 184, 74, 0.25);">
            Pet Points: <span id="petPointsVal">0</span> 🐾
          </div>

          <div style="width: 100%; display: flex; flex-direction: column; gap: 4px;">
            <div style="display: flex; justify-content: space-between; font-size: 8px; color: var(--text-muted);">
              <span>HUNGER</span>
              <span id="petHungerTextVal">100/100</span>
            </div>
            <div class="hud-bar" style="height: 12px; border-radius: 6px;">
              <div id="petHungerFill" class="fill" style="width: 100%;"></div>
            </div>
          </div>
          
          <div style="width: 100%; margin-top: 8px;">
            <button id="petUpgradeBtn" class="btn-action" style="width: 100%; text-align: center; justify-content: center; font-size: 8px; padding: 10px;">
              Upgrade Pet (+<span id="petUpgradeCostVal">5</span> Pts)
            </button>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 6px;">
          <h4 style="color: var(--accent-gold); font-size: 9px; margin: 0;">SELECT EMOJI</h4>
          <div id="petEmojiGrid" style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 6px;"></div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 6px;">
          <h4 style="color: var(--accent-gold); font-size: 9px; margin: 0;">FEED PET</h4>
          <div id="petFoodGrid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;"></div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 6px; margin-top: 4px;">
          <h4 style="color: var(--accent-gold); font-size: 9px; margin: 0;">PET ANIMATIONS</h4>
          <div style="font-size: 7px; color: var(--text-muted); margin-bottom: 2px;">Cost: 50% maxpp (<span id="petAnimCostVal">?</span> Pts)</div>
          <div id="petAnimGrid" style="display: flex; flex-direction: column; gap: 6px;"></div>
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
          row.innerHTML = `
            <div class="shop-item-icon">${iconFor(name, iconMap.smith || '⚒️')}</div>
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
      if (ShopManager && ShopManager.getAvailableConsumables) {
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
        html += `
          <label class="focus-task-item">
            <input type="checkbox" class="focus-task-checkbox" data-id="${d.id}" data-type="daily" ${isChecked} />
            <span class="focus-task-title">[Daily] ${d.name}</span>
          </label>
        `;
      });

      incompleteTodos.forEach(t => {
        const isChecked = selectedFocusTaskIds.has(t.id) ? 'checked' : '';
        html += `
          <label class="focus-task-item">
            <input type="checkbox" class="focus-task-checkbox" data-id="${t.id}" data-type="todo" ${isChecked} />
            <span class="focus-task-title">[To-Do] ${t.name}</span>
          </label>
        `;
      });

      selectionList.innerHTML = html;
      selectionContainer.style.display = 'block';

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
    };

    const startDriftLoop = () => {
      if (driftAnimationId) cancelAnimationFrame(driftAnimationId);
      
      const updateDrift = () => {
        if (!state.systemState.focusTimerActive) {
          driftAnimationId = null;
          return;
        }

        const overlayRect = overlay.getBoundingClientRect();
        const width = overlayRect.width || window.innerWidth;
        const height = overlayRect.height || window.innerHeight;

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
      if (type === 'daily') {
        res = TaskManager.completeDaily(id);
      } else {
        res = TaskManager.completeTodo(id);
      }

      if (res && res.success) {
        const rect = el.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        if (res.rewards && res.rewards.diamonds > 0) {
          UIManager.spawnDiamondFloatingPopup(centerX, centerY, res.rewards.diamonds);
        }

        if (res.rewards && res.rewards.ap) {
          FloatingDamageNumber.show(centerX, centerY - 20, `+${Math.ceil(res.rewards.ap)} AP`, {
            color: UIManager.themeColor('--ap-gold', '#FFB33F')
          });
        }
      }

      try { state.save(); } catch (err) {}
      UIManager.refreshGameUI();
      UIManager.renderEnemies();

      setTimeout(() => {
        el.remove();
        activeFocusBubbles = activeFocusBubbles.filter(b => b.id !== id);
        selectedFocusTaskIds.delete(id);
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

      selectedFocusTaskIds.forEach(id => {
        let task = state.dailiesState.dailies.find(d => d.id === id);
        let type = 'daily';
        if (!task) {
          task = state.dailiesState.todos.find(t => t.id === id);
          type = 'todo';
        }

        if (!task || task.completed) return;
        if (type === 'daily' && (task.completionsToday || 0) >= (task.maxCompletionsPerDay || 1)) {
          return;
        }

        const el = document.createElement('div');

        // Derive shape, color, and size from the task
        const shapeClass = UIManager.shapeClassForDifficulty ? UIManager.shapeClassForDifficulty(task.difficulty) : 'easy';
        const attrColor = UIManager.getAttributeColor(task.attribute);
        const taskInk = UIManager.getTextColorForHex(attrColor);
        const sizeScale = Math.max(0.7, Number(task.size) || 1);
        const bubbleSize = Math.round(80 * sizeScale);
        const shadeCol = UIManager.shadeColor(attrColor, -20);

        const r = bubbleSize / 2;
        const startX = r + Math.random() * (width - r * 2);
        const startY = r + Math.random() * (height - r * 2);

        const angle = Math.random() * Math.PI * 2;
        const speed = 0.5 + Math.random() * 0.7;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;

        el.className = `focus-bubble shape-task shape-${shapeClass}`;
        el.style.cssText = `
          --task-accent: ${attrColor};
          --task-accent-strong: ${shadeCol};
          --task-ink: ${taskInk};
          --streak-sat: 1;
          width: ${bubbleSize}px;
          height: ${bubbleSize}px;
          background: linear-gradient(180deg, ${attrColor}, ${shadeCol});
          border: 2px solid color-mix(in srgb, ${attrColor} 72%, white 28%);
          color: ${taskInk};
          left: ${startX - r}px;
          top: ${startY - r}px;
          z-index: 20002;
          pointer-events: auto;
        `;

        el.innerHTML = `
          <div class="focus-task-title">${task.name}</div>
          <div class="reward-tag">2x 💎</div>
        `;

        popup.appendChild(el);

        const bubbleObj = {
          id,
          type,
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
      });

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
        // Shift color as time depletes: green → yellow → red
        const hue = Math.round(remainingRatio * 120); // 120=green, 0=red
        progressBar.style.background = `hsl(${hue}, 55%, 40%)`;
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
      if (state.systemState.focusTimerActive) {
        if (isTimerPaused) {
          startBtn.textContent = 'RESUME';
        } else {
          startBtn.textContent = 'PAUSE';
        }
        if (stopBtn) stopBtn.style.display = 'block';
        const selectionContainer = document.getElementById('focusTaskSelectionContainer');
        if (selectionContainer) selectionContainer.style.display = 'none';
      } else {
        startBtn.textContent = 'START';
        if (stopBtn) stopBtn.style.display = 'none';
        populateFocusTaskList();
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
      UIManager.refreshGameUI();
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
          state.systemState.focusTimerActive = false;
          state.systemState.focusTimerEndTimestamp = 0;
          state.systemState.focusTimerSecondsLeft = 0;
          localStorage.removeItem('nemesis_focus_end');
          state.save();
          btn.classList.remove('active');
          try {
            if (window.SoundManager) SoundManager.play('heal');
            PopupsManager.showConfirm('Focus Complete! ⏱️', 'Awesome focus session completed! Doubled rewards have ended.', () => {
              resetTimer();
            });
          } catch (e) {
            alert('Focus Session Complete!');
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
      } else if (end > now) {
        isTimerPaused = false;
        secondsLeft = Math.ceil((end - now) / 1000);
        btn.classList.add('active');
        syncPopupUI();
        spawnFocusBubbles();
        startTimerCountdown();
      } else {
        // Completed while away
        state.systemState.focusTimerActive = false;
        state.systemState.focusTimerEndTimestamp = 0;
        state.systemState.focusTimerSecondsLeft = 0;
        state.save();
        resetTimer();
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

  static bindEventListeners() {
    if (this.eventListenersBound) return;
    this.eventListenersBound = true;
    this.setupFocusTimer();
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
    state.eventBus.on(EVENTS.ATTACK, (detail) => this.handleAttackEvent(detail));
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
          FloatingDamageNumber.show(rect.left + rect.width / 2, rect.top - 18, 'Dodged!', { color: UIManager.themeColor('--success-green', '#44ff44'), duration: 1200 });
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
        const gs = getGameState();
        const keys = gs.playerState.lootboxKeys || 0;
        if (keys <= 0) {
          try {
            if (typeof FloatingDamageNumber !== 'undefined' && FloatingDamageNumber.show) {
              FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2, 'Requires 1 Lootbox Key 🔑', { color: '#ff6666' });
            }
          } catch (e) { }
          try { if (window.SoundManager) SoundManager.play('miss'); } catch (e) { }
          return;
        }
        if (typeof PopupsManager !== 'undefined' && typeof PopupsManager.showLootbox === 'function') {
          PopupsManager.showLootbox();
        }
      });
    }

    const eventBannerClaimBtn = document.getElementById('eventBannerClaimBtn');
    if (eventBannerClaimBtn) {
      eventBannerClaimBtn.addEventListener('click', () => {
        const gs = getGameState();
        if (gs.systemState.specialEvent && !gs.systemState.specialEvent.claimed) {
          const event = gs.systemState.specialEvent;

          let rewardData = {
            name: 'Mysterious Reward',
            icon: '❓',
            description: 'You claim a mysterious benefit.',
            claimButtonText: 'CLAIM REWARD'
          };
          let preRolledTalisman = null;

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
    document.getElementById('dailiesPanel').querySelector('.tab-close').addEventListener('click', () => this.closeTaskPanel('dailies'));
    document.getElementById('todosPanel').querySelector('.tab-close').addEventListener('click', () => this.closeTaskPanel('todos'));
    document.getElementById('addDailyNoteBtn')?.addEventListener('click', () => this.addDailyNote());
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

    // Populate fallback attribute select for inline bulk add
    const inlineBulkAttr = document.getElementById('inlineBulkAttr');
    if (inlineBulkAttr) {
      inlineBulkAttr.innerHTML = getGameState().config.attributes.map(a => `<option value="${a}">${a}</option>`).join('');
    }

    // Toggle inline bulk add panel
    document.getElementById('toggleBulkAddInlineBtn')?.addEventListener('click', () => {
      const content = document.getElementById('bulkAddInlineContent');
      if (content) {
        const isHidden = content.style.display === 'none';
        content.style.display = isHidden ? 'flex' : 'none';
        document.getElementById('toggleBulkAddInlineBtn').textContent = isHidden 
          ? '＋ Inline Bulk Add (NLP) ▴' 
          : '＋ Inline Bulk Add (NLP) ▾';
      }
    });

    // Inline Bulk Add ADD ALL button
    document.getElementById('inlineBulkAddSaveBtn')?.addEventListener('click', () => {
      const textarea = document.getElementById('bulkAddInlineTextarea');
      if (!textarea) return;

      const fallbackAttr = document.getElementById('inlineBulkAttr')?.value || 'RESP';
      const fallbackDiff = document.getElementById('inlineBulkDiff')?.value || 'Medium';

      const parsedTasks = TaskManager.parseBulkAddText(textarea.value, fallbackAttr, fallbackDiff);
      if (parsedTasks.length === 0) return;

      let count = 0;
      parsedTasks.forEach(t => {
        const created = TaskManager.addTodo(
          t.name,
          t.difficulty,
          t.attribute,
          t.deadline,
          t.subtasks
        );
        if (created) {
          if (t.clusterAttributes) {
            created.clusterAttributes = t.clusterAttributes;
          }
          created.layout = {
            x: 15 + (Math.random() * 20),
            y: 8 + (Math.random() * 8)
          };
          count++;
        }
      });

      if (count > 0) {
        textarea.value = '';
        this.positionTodoCards();
        this.updateTodosList();
        try { getGameState().save(); } catch (e) {}
        try { FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2, `Added ${count} Tasks`, { color: '#ffd700' }); } catch (e) {}
      }
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
  }

  static closeTaskPanel(which) {
    const panelId = which === 'dailies' ? 'dailiesPanel' :
      which === 'todos' ? 'todosPanel' :
        which === 'achievements' ? 'achievementsPanel' :
          which === 'cosmetics' ? 'cosmeticsPanel' : 'petPanel';
    const panel = document.getElementById(panelId);
    panel?.classList.remove('open');
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
        if (taskType === 'daily' && card.classList.contains('task-card-daily')) return;

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

        const interactiveInsideCard = event.target.closest('.subtask-checkbox, .subtask-remove, .subtask-add-btn, .subtask-input, .subtask-label, .subtask-name, .edit-subtask-checkbox, .edit-subtask-remove, .edit-subtask-form, .edit-subtasks-panel, .edit-subtask-label');
        const editModeDailies = !!state.systemState?.taskListFilters?.editModeDailies;
        if (taskType === 'daily' && editModeDailies && card.classList.contains('task-card-daily') && !interactiveInsideCard) {
          PopupsManager.showEditDaily(taskId);
          return;
        }
        if (event.target.closest('.btn-complete') || (card.classList.contains('task-card-daily') || card.classList.contains('task-card')) && !interactiveInsideCard) {
          if (card.classList.contains('completed')) return;
          if (taskType === 'daily') {
            const res = TaskManager.completeDaily(taskId);
            if (!res || !res.success) return;

            // Immediate visual feedback on the card
            try {
              card.classList.add('just-completed');
              card.style.transition = 'transform 220ms ease, filter 150ms ease, opacity 400ms ease';
              card.style.transform = 'scale(1.04)';

              // Flash white right before disappearing (around 180ms)
              setTimeout(() => {
                card.style.filter = 'brightness(10) contrast(1.5)';
              }, 160);

              // Show reward popup numbers
              if (res.rewards && res.rewards.ap) {
                UIManager.showDailyApReward(card, res.rewards.ap);
              }
              if (res.rewards && res.rewards.diamonds) {
                const rect = card.getBoundingClientRect();
                UIManager.spawnDiamondFloatingPopup(rect.left + rect.width / 2, rect.top + rect.height / 2, res.rewards.diamonds);
              }

              if (typeof RetroTaskCompleteAnimation !== 'undefined') {
                RetroTaskCompleteAnimation.play(card);
              }

              setTimeout(() => {
                this.scheduleUpdateDailiesList();
              }, 320);
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
                  if (res.rewards.ap) {
                    FloatingDamageNumber.show(rect.left + rect.width / 2, Math.max(12, rect.top - 18), `+${Math.ceil(res.rewards.ap)} AP`, { color: UIManager.themeColor('--ap-gold', '#FFB33F') });
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
                if (res.rewards.ap) {
                  FloatingDamageNumber.show(rect.left + rect.width / 2, Math.max(12, rect.top - 18), `+${Math.ceil(res.rewards.ap)} AP`, { color: UIManager.themeColor('--ap-gold', '#FFB33F') });
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
          pendingRow.style.display = 'block';
          if (pendingVal) pendingVal.textContent = pendingDmg;
          if (pendingFill) {
            const maxHp = state.playerState?.maxHp || 100;
            const fillPct = Math.min(100, (pendingDmg / maxHp) * 100);
            pendingFill.style.width = fillPct + '%';
          }
        } else {
          pendingRow.style.display = 'none';
        }
      }
      const summaryEl = document.getElementById('dailiesSummary');
      if (summaryEl) {
        const today = TaskManager.getCurrentGameDateKey();
        const scheduledDailies = TaskManager.getAllDailies().filter(d => TaskManager.isDailyScheduled(d, today));
        const completedCount = scheduledDailies.filter(daily => daily.completed).length;
        summaryEl.textContent = `${completedCount}/${scheduledDailies.length} complete${pendingDmg > 0 ? ` (Pending Dmg: ${pendingDmg})` : ''}`;
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

    if (deathDefiance.active) {
      badge.textContent = 'DEFIANCE ACTIVE';
      badge.className = 'death-defiance-badge active';
      return;
    }

    if (deathDefiance.available) {
      badge.textContent = 'DEFIANCE READY';
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
    const state = getGameState();
    const steps = Array.isArray(detail?.retaliationSteps) ? detail.retaliationSteps : [];
    const token = ++this.checkInSequenceToken;
    const circle = document.querySelector('.enemy-circle-container');

    if (!steps.length) {
      if (detail?.lateTodoDamage > 0) {
        FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2 - 70, `Late todo damage: ${Math.ceil(detail.lateTodoDamage)}`, { color: UIManager.themeColor('--palette-orange', '#FF4400'), duration: 2200 });
      }
      state.eventBus.emit(EVENTS.CHECK_IN_ANIMATION_COMPLETE, detail);
      return;
    }

    const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
    // Mutator gains that occurred during check-in (show as floating text on the affected enemy)
    let mutatorGains = Array.isArray(detail?.mutatorGains) ? detail.mutatorGains.slice() : [];
    // Show any mutator gains for enemies that are not part of retaliationSteps immediately so they occur within the check-in sequence
    try {
      const stepEnemyIds = new Set((steps || []).map(s => String(s.enemyId)));
      const initial = mutatorGains.filter(m => !stepEnemyIds.has(String(m.enemyId)));
      if (initial.length > 0) {
        initial.forEach(m => {
          try {
            const meta = UIManager.MUTATOR_META[m.mutator] || { icon: '❗', label: m.mutator, color: UIManager.themeColor('--accent-gold', '#FFB33F') };
            // show slightly longer so it fits the slowed sequence
            this.showFloatingText(m.enemyId, `${meta.icon} ${meta.label}`, { color: meta.color || UIManager.themeColor('--accent-gold', '#FFB33F'), duration: 2200 });
          } catch (e) { }
        });
        // remove shown entries
        mutatorGains = mutatorGains.filter(m => !initial.includes(m));
      }
    } catch (e) { }
    const missedCount = Math.max(0, Math.round((detail?.missedDailyDamage || 0) || 0));
    if (missedCount > 0) {
      circle?.classList.add('checkin-alert');
      ScreenEffects.shake(12 + missedCount * 2, 280);
    }

    for (let i = 0; i < steps.length; i++) {
      if (token !== this.checkInSequenceToken) return;
      const step = steps[i];
      const card = this.setEnemyCheckInHighlight(step.enemyId, true);
      if (card) {
        card.classList.add('checkin-hit');
        let x = window.innerWidth / 2;
        let y = window.innerHeight / 2;
        if (card.dataset.x) {
          const circle = document.querySelector('.enemy-circle-container');
          const circleRect = circle ? circle.getBoundingClientRect() : { left: 0, top: 0 };
          x = circleRect.left + Number(card.dataset.x);
          y = circleRect.top + Number(card.dataset.y);
        } else {
          const rect = card.getBoundingClientRect();
          x = rect.left + rect.width / 2;
          y = rect.top + rect.height / 2;
        }

        if (step.isBoss) {
          const state = getGameState();
          const bossName = (state.stageState.bossData && state.stageState.bossData.name) || step.name;
          const bossData = state.stageState.bossData || {};
          this.playBossAttackAnimation(bossName, bossData.phase === 2, step.attackType);

          let actionDesc = 'ATTACK';
          if (step.isNull) actionDesc = 'IDLE';
          else if (step.isCorrosive) actionDesc = 'CORROSIVE SPIT';
          else if (step.isBombSummon) actionDesc = 'SUMMON BOMB';
          else if (step.isHeal) actionDesc = 'SELF-HEAL';
          else if (step.isMinionSummon) actionDesc = `SUMMON ${step.minionName}`;
          else if (step.isHeavy) actionDesc = 'HEAVY SLAM';
          else if (step.isCrit) actionDesc = 'CRITICAL STRIKE';

          FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2 - 150, actionDesc, {
            color: '#ffd76a',
            duration: 2200,
            fadeDelay: 1000
          });
        }

        if (step.isDodge) {
          FloatingDamageNumber.show(x, y - 10, 'DODGED!', {
            color: '#00e5ff',
            duration: 1600,
            scale: 1.2
          });
          if (typeof RetroDodgeAnimation !== 'undefined') {
            RetroDodgeAnimation.play(card, '#00e5ff');
          }
        } else if (step.isImmune) {
          FloatingDamageNumber.show(x, y - 10, 'IMMUNE!', {
            color: UIManager.themeColor('--success-green', '#22c55e'),
            duration: 1600,
            scale: 1.2
          });
        } else if (step.isNull) {
          FloatingDamageNumber.show(x, y - 10, 'NULL!', {
            color: '#aaaaaa',
            duration: 1600,
            scale: 1.0
          });
        } else if (step.isCorrosive) {
          FloatingDamageNumber.show(x, y - 10, 'CORROSIVE! 🧪', {
            color: '#32cd32',
            duration: 1800,
            scale: 1.2
          });
        } else if (step.isBombSummon) {
          FloatingDamageNumber.show(x, y - 10, 'BOMB DEPLOYED! 💣', {
            color: '#ff4500',
            duration: 1800,
            scale: 1.3
          });
        } else if (step.isHeal) {
          FloatingDamageNumber.show(x, y - 10, `HEALED! 💚 (+${step.healAmount})`, {
            color: '#00ff66',
            duration: 1800,
            scale: 1.2
          });
        } else if (step.isMinionSummon) {
          FloatingDamageNumber.show(x, y - 10, `SUMMON: ${step.minionName}! 👿`, {
            color: '#8a2be2',
            duration: 1800,
            scale: 1.2
          });
        } else {
          FloatingDamageNumber.show(x, y - 10, `-${Math.ceil(step.damage)}`, {
            color: step.isBoss ? (step.isCrit ? '#ff3366' : (step.isHeavy ? '#ffaa00' : UIManager.themeColor('--accent-gold', '#FFB33F'))) : (step.damage > 0 ? UIManager.themeColor('--danger-red', '#C00707') : UIManager.themeColor('--text-muted', '#aaaaaa')),
            duration: 1600,
            scale: step.isBoss ? 1.3 : 1.1,
            isCrit: step.isCrit || (step.damage > 0 && step.damage >= 25)
          });
        }
        // Also show any mutator gains that apply to this enemy at the same time
        try {
          const matches = (mutatorGains || []).filter(m => String(m.enemyId) === String(step.enemyId));
          if (matches.length) {
            matches.forEach(m => {
              try {
                const meta = UIManager.MUTATOR_META[m.mutator] || { icon: '❗', label: m.mutator, color: UIManager.themeColor('--accent-gold', '#FFB33F') };
                try { this.showFloatingText(step.enemyId, `${meta.icon} ${meta.label}`, { color: meta.color || UIManager.themeColor('--accent-gold', '#FFB33F'), duration: 2200 }); } catch (e) { /* ignore */ }
              } catch (e) { }
            });
            // remove shown entries
            mutatorGains = (mutatorGains || []).filter(m => String(m.enemyId) !== String(step.enemyId));
          }
        } catch (e) { }
      }

      // Increase pacing so each retaliation feels heavier
      await wait(step.isBoss ? 1100 : (step.isDodge ? 500 : 700));
      if (card) card.classList.remove('checkin-hit');
      this.setEnemyCheckInHighlight(step.enemyId, false);
      await wait(step.isDodge ? 100 : 300);
    }

    // Fallback: show any remaining mutator gains that weren't shown during steps
    try {
      if (Array.isArray(mutatorGains) && mutatorGains.length > 0) {
        mutatorGains.forEach(m => {
          try {
            const meta = UIManager.MUTATOR_META[m.mutator] || { icon: '❗', label: m.mutator, color: UIManager.themeColor('--accent-gold', '#FFB33F') };
            this.showFloatingText(m.enemyId, `${meta.icon} ${meta.label}`, { color: meta.color || UIManager.themeColor('--accent-gold', '#FFB33F'), duration: 2200 });
          } catch (e) { }
        });
      }
    } catch (e) { }

    let finalWaitTime = 0;
    if (detail?.lateTodoDamage > 0) {
      FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2 - 70, `Late todo damage: ${Math.ceil(detail.lateTodoDamage)}`, { color: '#ff9a2e', duration: 2200 });
      ScreenEffects.shake(8, 180);
      finalWaitTime = Math.max(finalWaitTime, 2200);
    }

    if (Array.isArray(detail?.incantations) && detail.incantations.length > 0) {
      FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2 - 180, `Nemesis pressure: ${detail.incantations.length}`, { color: '#a15cff', duration: 1800 });
      finalWaitTime = Math.max(finalWaitTime, 1800);
    }

    if (finalWaitTime > 0) {
      await wait(finalWaitTime + 200);
    }

    // Play pet animations sequentially after Nemesis pressure
    if (Array.isArray(detail?.petAttacks) && detail.petAttacks.length > 0) {
      for (const pAttack of detail.petAttacks) {
        if (token !== this.checkInSequenceToken) return;

        // Show the bold scaled pet animation on the card
        this.showPetIcon(pAttack.targetId, { duration: 1800 });

        // Get coordinates of the target enemy card
        const card = document.querySelector(`.enemy-card[data-enemy-id="${pAttack.targetId}"]`);
        let x = window.innerWidth / 2;
        let y = window.innerHeight / 2;
        if (card) {
          if (card.dataset.x) {
            const circleContainer = document.querySelector('.enemy-circle-container');
            const circleRect = circleContainer ? circleContainer.getBoundingClientRect() : { left: 0, top: 0 };
            x = circleRect.left + Number(card.dataset.x);
            y = circleRect.top + Number(card.dataset.y);
          } else {
            const rect = card.getBoundingClientRect();
            x = rect.left + rect.width / 2;
            y = rect.top + rect.height / 2;
          }
        }

        // Wait 600ms to play impact sound, shake card, and show damage number matching impact visual
        await new Promise(resolve => {
          setTimeout(() => {
            if (token !== this.checkInSequenceToken) {
              resolve();
              return;
            }
            try { SoundManager.play('pet'); } catch (e) { }

            FloatingDamageNumber.show(x, y - 20, `-${Math.ceil(pAttack.damage)} 🐾`, {
              color: '#ffaa00',
              duration: 1800,
              scale: 1.3,
              isCrit: true
            });

            if (card) {
              card.classList.add('checkin-hit');
              setTimeout(() => { if (card) card.classList.remove('checkin-hit'); }, 400);
            }
            resolve();
          }, 600);
        });

        // Wait for pet animation to finish before proceeding (1800ms total duration)
        await wait(1200);
      }
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
      if (!state.systemState.taskListFilters.editModeDailies) {
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

  static updateTaskVisibilityToggleLabels() {
    const state = getGameState();
    const dailiesBtn = document.getElementById('dailiesShowCompletedBtn');
    const dailiesEditBtn = document.getElementById('dailiesEditModeBtn');
    const todosBtn = document.getElementById('todosShowCompletedBtn');

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
  }

  static updateComboDisplay(detail) {
    const comboEl = document.getElementById('comboIndicator');

    if (detail.combo === 0) {
      comboEl.style.display = 'none';
    } else {
      comboEl.style.display = 'block';
      ComboAnimation.show(comboEl, detail.combo);
    }
  }

  static resolveAttackTarget(targetEnemyId = null) {
    if (targetEnemyId) {
      const target = StageManager.getAllEnemies().find(enemy => String(enemy.id) === String(targetEnemyId) && !enemy.isDead);
      if (target) return target;
    }

    return this.getSpinnerTargetEnemy();
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
              title: 'First Encounter',
              text: `text\n${target.name}`
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
                    const circle = document.querySelector('.enemy-circle-container');
                    const circleRect = circle ? circle.getBoundingClientRect() : { left: 0, top: 0 };
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

        const hits = Array.isArray(result.hitDetails) ? result.hitDetails : [{
          enemyId: target.id,
          damage: result.primaryDamage || result.damage || 0,
          isCrit: result.isCrit,
          isDead: result.targetDead
        }];

        hits.forEach(hit => {
          const hitColor = hit.isCrit ? UIManager.themeColor('--ap-gold', '#FFB33F') : UIManager.themeColor('--danger-red', '#C00707');
          const fireRate = Math.max(1, Number(result.fireRate || 1));

          let targetX = window.innerWidth / 2;
          let targetY = window.innerHeight / 2;
          const targetCard = document.querySelector(`.enemy-card[data-enemy-id="${hit.enemyId}"]`);
          if (targetCard) {
            if (targetCard.dataset.x) {
              const circle = document.querySelector('.enemy-circle-container');
              const circleRect = circle ? circle.getBoundingClientRect() : { left: 0, top: 0 };
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
                staggerMs: 60
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
        });

        if (Array.isArray(result.specialPopups) && result.specialPopups.length) {
          const damageColor = result.isCrit ? UIManager.themeColor('--ap-gold', '#FFB33F') : UIManager.themeColor('--danger-red', '#C00707');
          result.specialPopups.forEach((popup, index) => {
            FloatingDamageNumber.show(
              window.innerWidth / 2 + ((index % 2 === 0) ? -42 : 42),
              window.innerHeight / 2 - 54 - (index * 16),
              popup.text,
              { color: popup.color || damageColor, duration: 1100 }
            );
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
            // Chrono-Shift: next 3 attacks are echoed at 50% damage
            state.combatState.skillEffects.chronoShiftCharges = (state.combatState.skillEffects.chronoShiftCharges || 0) + 3;
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
            // Nature's Embrace: heal 40 HP, summon shadow pet for today
            state.addHp(40);
            state.combatState.skillEffects.shadowPet = true; // pet attacks 2× today
            break;

          case 'Alchemist':
            // Unstable Concoction: reverse target's weaknesses/resistances permanently, block healing/mutating next check-in.
            // If weak to current element, deal 15% max HP splash damage to adjacent enemies.
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
                      const circle = document.querySelector('.enemy-circle-container');
                      const circleRect = circle ? circle.getBoundingClientRect() : { left: 0, top: 0 };
                      FloatingDamageNumber.show(circleRect.left + Number(targetCard.dataset.x), circleRect.top + Number(targetCard.dataset.y) - 45, 'REVERSED & COATED 🧪', { color: '#84cc16', scale: 1.1, duration: 1500 });
                    } else {
                      const rect = targetCard.getBoundingClientRect();
                      FloatingDamageNumber.show(rect.left + rect.width / 2, rect.top, 'REVERSED & COATED 🧪', { color: '#84cc16', scale: 1.1, duration: 1500 });
                    }
                  }
                } catch (e) { }

                const weapon = PlayerManager.getCurrentWeapon();
                if (weapon) {
                  const isWeak = resolveWeaponWeaknessMultiplier(target, weapon.element) > 1.0;
                  if (isWeak) {
                    const all = StageManager.getAllEnemies ? StageManager.getAllEnemies() : [];
                    const idx = all.indexOf(target);
                    if (idx > -1) {
                      const adjacents = EnemyManager.getAdjacentEnemies(all, idx);
                      adjacents.forEach(adj => {
                        if (adj && !adj.isDead && adj.maxHp > 0) {
                          const splashDmg = Math.ceil(adj.maxHp * 0.15);
                          adj.takeDamage(splashDmg);

                          try {
                            const adjCard = document.querySelector(`.enemy-card[data-enemy-id="${adj.id}"]`);
                            if (adjCard) {
                              if (adjCard.dataset.x) {
                                const circle = document.querySelector('.enemy-circle-container');
                                const circleRect = circle ? circle.getBoundingClientRect() : { left: 0, top: 0 };
                                FloatingDamageNumber.show(circleRect.left + Number(adjCard.dataset.x), circleRect.top + Number(adjCard.dataset.y) - 45, `-${splashDmg} 💥`, { color: '#ffaa00', scale: 1.2, duration: 1200 });
                              } else {
                                const rect = adjCard.getBoundingClientRect();
                                FloatingDamageNumber.show(rect.left + rect.width / 2, rect.top, `-${splashDmg} 💥`, { color: '#ffaa00', scale: 1.2, duration: 1200 });
                              }
                            }
                          } catch (e) { }
                        }
                      });

                      if (adjacents.length > 0) {
                        try {
                          FloatingDamageNumber.show(
                            window.innerWidth / 2,
                            window.innerHeight / 2 - 50,
                            'CONCOCTION EXPLOSION! 💥',
                            { color: '#84cc16', duration: 1500 }
                          );
                        } catch (e) { }
                      }
                    }
                  }
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

  static handleDodgeClick() {
    // This is now a placeholder; dodge is handled via hold/release
    const result = CombatManager.attemptDodge();
    if (result.success) {
      FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight - 100, `-${Math.ceil(result.dodgeCost)} AP`, { color: '#ffd700', scale: 0.7, rotationRange: 40 });
      console.log('Dodge active');
      this.renderEnemies();
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

    const getTargetEnemyByProximity = (pointerX, pointerY) => {
      const state = getGameState();
      const enemies = (state.stageState.enemies || []).filter(e => !e.isDead);
      if (enemies.length === 0) return null;

      const rect = circleRect || (() => {
        const circle = document.querySelector('.enemy-circle-container');
        return circle ? circle.getBoundingClientRect() : { width: 620, height: 620 };
      })();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const radius = Math.min(rect.width, rect.height) / 2;

      let bestEnemy = null;
      let minDistanceSq = Infinity;

      enemies.forEach((enemy) => {
        const index = state.stageState.enemies.indexOf(enemy);
        if (index === -1) return;

        const { ringLevel, ringIndex, totalInRing } = UIManager.getRingInfo(index, state.stageState.enemies.length);
        const currentRadius = ringLevel === 0 ? (radius + 30) : (radius - 45 - (ringLevel - 1) * 70);

        const angle = (Math.PI * 2 * ringIndex) / totalInRing - Math.PI / 2;
        const cardX = centerX + Math.cos(angle) * currentRadius;
        const cardY = centerY + Math.sin(angle) * currentRadius;

        const dx = pointerX - cardX;
        const dy = pointerY - cardY;
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
        const dodgeCost = CombatManager.getDodgeCost();
        if (state.playerState.ap < dodgeCost) {
          FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2, 'Not enough power', { color: '#ffcc66' });
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

        const targetedEnemy = getTargetEnemyByProximity(pointerX, pointerY);
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
        if (currentTargetEnemyId) {
          const enemy = StageManager.getAllEnemies().find(e => String(e.id) === String(currentTargetEnemyId) && !e.isDead);
          if (enemy) {
            if (dragType === 'attack') {
              UIManager.handleAttackClick(enemy.id);
            } else if (dragType === 'skill' && isTargetingSkill) {
              UIManager.handleSkillClick(enemy.id);
            } else if (dragType === 'dodge') {
              const currentDodges = Array.isArray(state.combatState.dodgeTarget)
                ? state.combatState.dodgeTarget
                : (state.combatState.dodgeTarget ? [state.combatState.dodgeTarget] : []);

              if (currentDodges.map(id => String(id)).includes(String(enemy.id))) {
                FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2, 'Already dodging', { color: '#ffcc66' });
                try { if (window.SoundManager) SoundManager.play('miss'); } catch (e) { }
              } else {
                const dodgeCost = CombatManager.getDodgeCost();
                state.spendAp(dodgeCost);
                FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2 + 30, `-${dodgeCost} AP`, { color: '#ffd700' });

                state.combatState.dodgeTarget = [...new Set([...currentDodges, enemy.id])];
                FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2, 'Dodge Ready!', { color: '#44ff44' });

                try {
                  const card = document.querySelector(`.enemy-card[data-enemy-id="${enemy.id}"]`);
                  if (card && typeof DodgeTetherAnimation !== 'undefined') {
                    const rect = circleRect || (() => {
                      const circle = document.querySelector('.enemy-circle-container');
                      return circle ? circle.getBoundingClientRect() : { left: 0, top: 0 };
                    })();
                    const sx = rect.left + buttonCenterX;
                    const sy = rect.top + buttonCenterY;
                    DodgeTetherAnimation.play(sx, sy, card);
                  }
                } catch (e) {
                  console.warn('Failed to play DodgeTetherAnimation', e);
                }

                UIManager.renderEnemies();
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
            let target = aliveEnemies[0];
            let lowestHpPct = target.hp / target.maxHp;
            aliveEnemies.forEach(e => {
              const pct = e.hp / e.maxHp;
              if (pct < lowestHpPct) {
                lowestHpPct = pct;
                target = e;
              }
            });
            UIManager.handleAttackClick(target.id);
          } else if (dragType === 'skill') {
            if (isTargetingSkill) {
              let target = aliveEnemies[0];
              let lowestHpPct = target.hp / target.maxHp;
              aliveEnemies.forEach(e => {
                const pct = e.hp / e.maxHp;
                if (pct < lowestHpPct) {
                  lowestHpPct = pct;
                  target = e;
                }
              });
              UIManager.handleSkillClick(target.id);
            } else {
              UIManager.handleSkillClick();
            }
          } else if (dragType === 'dodge') {
            let target = aliveEnemies[0];
            let highestDmg = target.dmgMult;
            aliveEnemies.forEach(e => {
              if (e.dmgMult > highestDmg) {
                highestDmg = e.dmgMult;
                target = e;
              }
            });

            const currentDodges = Array.isArray(state.combatState.dodgeTarget)
              ? state.combatState.dodgeTarget
              : (state.combatState.dodgeTarget ? [state.combatState.dodgeTarget] : []);

            if (currentDodges.map(id => String(id)).includes(String(target.id))) {
              FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2, 'Already dodging', { color: '#ffcc66' });
              try { if (window.SoundManager) SoundManager.play('miss'); } catch (e) { }
            } else {
              const dodgeCost = CombatManager.getDodgeCost();
              state.spendAp(dodgeCost);
              FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2 + 30, `-${dodgeCost} AP`, { color: '#ffd700' });

              state.combatState.dodgeTarget = [...new Set([...currentDodges, target.id])];
              FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2, 'Dodge Ready!', { color: '#44ff44' });

              try {
                const card = document.querySelector(`.enemy-card[data-enemy-id="${target.id}"]`);
                if (card && typeof DodgeTetherAnimation !== 'undefined') {
                  const rect = circleRect || (() => {
                    const circle = document.querySelector('.enemy-circle-container');
                    return circle ? circle.getBoundingClientRect() : { left: 0, top: 0 };
                  })();
                  const sx = rect.left + buttonCenterX;
                  const sy = rect.top + buttonCenterY;
                  DodgeTetherAnimation.play(sx, sy, card);
                }
              } catch (e) {
                console.warn('Failed to play DodgeTetherAnimation', e);
              }

              UIManager.renderEnemies();
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
    const dailies = TaskManager.getAllDailies();
    const container = document.getElementById('dailiesList');

    if (!container) return;

    const showCompleted = !!getGameState().systemState?.taskListFilters?.showCompletedDailies;
    const editModeActive = !!getGameState().systemState?.taskListFilters?.editModeDailies;
    
    if (editModeActive) {
      container.classList.add('edit-mode-active');
    } else {
      container.classList.remove('edit-mode-active');
    }

    const today = TaskManager.getCurrentGameDateKey();
    
    let visibleDailies = dailies;
    if (!editModeActive) {
      visibleDailies = visibleDailies.filter(daily => TaskManager.isDailyScheduled(daily, today));
    }
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
      const sizeScale = Math.max(0.5, Number(daily.size) || 1);
      const attributeColor = getAttributeColor(daily.attribute);
      const textColor = getTextColorForHex(attributeColor);
      const streakClass = streak > 0 ? 'is-positive' : streak < 0 ? 'is-negative' : 'is-neutral';
      const progressText = `${completionsToday}/${maxCompletions}`;
      const completedVisibleClass = daily.completed && showCompleted ? 'is-completed-visible' : '';
      const eventTargetClass = eventTargets.includes(daily.id) ? 'task-event-target' : '';
      // Streak saturation: positive boosts colour, negative washes it out, capped at |streak|=20
      let streakSat = 1;
      if (streak > 0) streakSat = +(1 + (Math.min(streak, 20) / 20) * 2.0).toFixed(3);
      if (streak < 0) streakSat = +(1 - (Math.min(Math.abs(streak), 20) / 20) * 0.9).toFixed(3);
      const particleCount = streak > 0 ? Math.min(streak, 10) : 0;

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

      html += '<div class="task-daily-streak-badge ' + streakClass + '" data-daily-id="' + daily.id + '" title="Streak">' + streak + '</div>';
      html += '<div class="shape-task shape-' + this.shapeClassForDifficulty(daily.difficulty) + ' task-clickable task-card-daily ' + eventTargetClass + ' ' + (daily.completed ? 'completed ' + completedVisibleClass : '') + (daily.bloodOathActive ? ' blood-oath-active' : '') + '" data-id="' + daily.id + '" data-type="daily" data-size-scale="' + sizeScale + '" tabindex="0" data-attribute="' + (daily.attribute || '') + '" data-difficulty="' + (daily.difficulty || '') + '" style="--task-accent:' + attributeColor + ';--task-accent-strong:' + shadeColor(attributeColor, -20) + ';--task-ink:' + textColor + ';--streak-sat:' + streakSat + ';opacity:' + opacity + ';transform:scale(' + sizeScale + ');transform-origin:top left;touch-action:none;">';
      html += '<div class="hold-progress-overlay"></div>';
      if (daily.bloodOathActive) {
        html += '<div class="blood-oath-fire-container">';
        html += '<div class="flame-square"></div><div class="flame-square"></div><div class="flame-square"></div><div class="flame-square"></div>';
        html += '<div class="flame-square"></div><div class="flame-square"></div><div class="flame-square"></div><div class="flame-square"></div>';
        html += '</div>';
      }
      html += '<div class="task-shape-difficulty">' + (daily.difficulty || '') + '</div>';
      html += '<div class="task-shape-name">' + (daily.name || '') + '</div>';
      html += '<div class="task-shape-attr">' + (daily.attribute || '') + '</div>';
      html += '<div class="task-shape-progress">' + progressText + '</div>';
      if (surplusIndicator) html += surplusIndicator;
      if (unscheduledIndicator) html += unscheduledIndicator;
      const currentMonthKey = (typeof UIManager.getDailyNoteDateKey === 'function' ? UIManager.getDailyNoteDateKey() : new Date().toISOString().split('T')[0]).slice(0, 7);
      if (!daily.streakSaversUsed) daily.streakSaversUsed = {};
      const saversUsed = daily.streakSaversUsed[currentMonthKey] || 0;
      const saversLeft = Math.max(0, 5 - saversUsed);
      const saversIndicator = '<span class="task-savers-indicator" title="Streak Savers Left: ' + saversLeft + '" style="position: absolute; bottom: 4px; right: 4px; font-size: 7px; color: #b779ff; font-family: monospace; z-index: 2; text-shadow: 1px 1px 0px #000; letter-spacing: -0.5px;">🛡️' + saversLeft + '</span>';
      html += saversIndicator;
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
    const yPx = Math.min(Math.max(0, metrics.height - tileSize.height - padding), padding + (row * (tileSize.height + gap)));
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

    dailies.forEach((daily, index) => {
      const card = metrics.board.querySelector(`.task-card-daily[data-id="${daily.id}"]`);
      if (!card) return;
      const streak = metrics.board.querySelector(`.task-daily-streak-badge[data-daily-id="${daily.id}"]`);

      const layout = daily.layout
        ? this.clampDailyLayout(daily.layout, metrics, tileSize)
        : this.getDefaultDailyLayout(index, metrics, tileSize);

      card.style.width = `${tileSize.width}px`;
      card.dataset.sizeScale = String(Math.max(0.5, Number(daily.size) || 1));
      if (!card.classList.contains('just-completed')) {
        card.style.transform = `scale(${Math.max(0.5, Number(daily.size) || 1)})`;
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
    });
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
          if (!getGameState().systemState?.taskListFilters?.editModeDailies) {
            return;
          }
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

    const notes = Array.isArray(state.getTodoNotes?.()) ? state.getTodoNotes() : [];
    const existingNotes = new Map(Array.from(board.querySelectorAll('.todo-note-card')).map((note) => [String(note.dataset.noteId), note]));
    const activeIds = new Set();

    notes.forEach((noteData, index) => {
      if (!noteData) return;
      const noteId = String(noteData.id);
      activeIds.add(noteId);

      let noteEl = existingNotes.get(noteId);
      if (!noteEl) {
        noteEl = document.createElement('div');
        noteEl.dataset.noteId = noteId;
        board.appendChild(noteEl);
      }

      // Configure class name & z-index
      noteEl.className = `todo-note-card sticker-${noteData.type || 'note'}`;
      noteEl.style.left = `${Number.isFinite(Number(noteData.x)) ? Number(noteData.x) : 12}%`;
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

      event.preventDefault();

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

      // Check double tap for Blood Oath
      const now = Date.now();
      const lastTap = Number(card.dataset.lastTapTime || 0);
      if (now - lastTap < 300) {
        // Double tap: toggle Blood Oath
        clearTimeout(this.dailyHoldTimer);
        const overlay = card.querySelector('.hold-progress-overlay');
        if (overlay) {
          overlay.style.transition = 'none';
          overlay.style.width = '0%';
        }
        card.dataset.doubleTapped = '1';
        try { TaskManager.toggleBloodOath(dailyId); } catch (e) { }
        try { getGameState().save(); } catch (e) { }
        this.scheduleUpdateDailiesList();
        card.dataset.lastTapTime = '0';
        return;
      }
      card.dataset.lastTapTime = String(now);

      const editModeDailies = !!getGameState().systemState?.taskListFilters?.editModeDailies;
      if (!editModeDailies) {
        // Start hold-to-complete timer (600ms hold)
        clearTimeout(this.dailyHoldTimer);
        const overlay = card.querySelector('.hold-progress-overlay');
        if (overlay) {
          overlay.style.transition = 'width 600ms linear';
          overlay.style.width = '100%';
        }
        this.dailyHoldTimer = setTimeout(() => {
          const dragState = this.dailyDragState;
          if (dragState && !dragState.moved && dragState.dailyId === dailyId) {
            const res = TaskManager.completeDaily(dailyId);
            if (res && res.success) {
              try {
                card.classList.add('just-completed');
                card.style.transition = 'transform 220ms ease, opacity 400ms ease';
                const sizeScale = Math.max(0.5, Number(card.dataset.sizeScale) || 1);
                card.style.transform = `scale(${sizeScale * 1.04})`;
                if (res.rewards && res.rewards.ap) {
                  UIManager.showDailyApReward(card, res.rewards.ap);
                }
                if (res.rewards && res.rewards.diamonds) {
                  const rect = card.getBoundingClientRect();
                  UIManager.spawnDiamondFloatingPopup(rect.left + rect.width / 2, rect.top + rect.height / 2, res.rewards.diamonds);
                }
                if (typeof RetroTaskCompleteAnimation !== 'undefined') {
                  RetroTaskCompleteAnimation.play(card);
                }
                setTimeout(() => {
                  this.scheduleUpdateDailiesList();
                }, 320);
              } catch (error) {
                this.scheduleUpdateDailiesList();
              }
              try { getGameState().save(); } catch (saveError) { }
              this.renderEnemies();
            }
            card.dataset.holdCompleted = '1';
          }
        }, 600);
      }
    });

    const onMove = (event) => {
      const dragState = this.dailyDragState;
      if (!dragState || event.pointerId !== dragState.pointerId) return;
      if (event.clientX === 0 && event.clientY === 0) return;

      const boardRect = dragState.board.getBoundingClientRect();

      if (!dragState.moved) {
        const distance = Math.hypot(event.clientX - dragState.startX, event.clientY - dragState.startY);
        if (distance > 6) {
          // Cancel hold-to-complete if finger moved too far
          clearTimeout(this.dailyHoldTimer);
          const overlay = dragState.card.querySelector('.hold-progress-overlay');
          if (overlay) {
            overlay.style.transition = 'none';
            overlay.style.width = '0%';
          }
          // Only allow repositioning in edit mode
          const editModeDailies = !!getGameState().systemState?.taskListFilters?.editModeDailies;
          if (editModeDailies) {
            dragState.moved = true;
            dragState.card.classList.add('dragging');
          }
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
      }
    };

    const endDrag = (event) => {
      const dragState = this.dailyDragState;
      clearTimeout(this.dailyHoldTimer);

      if (!dragState || (event.pointerId !== undefined && event.pointerId !== dragState.pointerId)) return;

      const card = dragState.card;
      const overlay = card.querySelector('.hold-progress-overlay');
      if (overlay) {
        overlay.style.transition = 'none';
        overlay.style.width = '0%';
      }

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
        const dailyId = dragState.dailyId;
        const doubleTapped = card.dataset.doubleTapped === '1';
        const holdCompleted = card.dataset.holdCompleted === '1';

        delete card.dataset.doubleTapped;
        delete card.dataset.holdCompleted;

        if (!doubleTapped && !holdCompleted) {
          const editModeDailies = !!getGameState().systemState?.taskListFilters?.editModeDailies;
          if (editModeDailies) {
            try { PopupsManager.showEditDaily(dragState.dailyId); } catch (error) { console.warn('Failed to open daily edit popup', error); }
          }
        }
      }

      this.dailyDragState = null;
      this.positionDailyCards();
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', endDrag);
    document.addEventListener('pointercancel', endDrag);
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
    const minimumSize = window.innerWidth <= 700 ? 156 : 180;
    const size = Math.round(Math.max(minimumSize, Math.min(260, Math.min(width, height) * 0.36)));
    return { width: size, height: size };
  }

  static clampTodoLayout(layout, metrics, tileSize, hasHeader = false) {
    const minXPx = 20;
    const minYPx = hasHeader ? 28 : 0;
    const minX = (minXPx / metrics.width) * 100;
    const minY = (minYPx / metrics.height) * 100;
    const maxX = Math.max(minX, 100 - ((tileSize.width / metrics.width) * 100));
    const maxY = Math.max(minY, 100 - ((tileSize.height / metrics.height) * 100));
    let x = Number(layout?.x);
    let y = Number(layout?.y);
    if (isNaN(x) || !isFinite(x) || x < 0 || x > 100) x = 0;
    if (isNaN(y) || !isFinite(y) || y < 0 || y > 100) y = 0;
    return {
      x: Math.max(minX, Math.min(maxX, x)),
      y: Math.max(minY, Math.min(maxY, y))
    };
  }

  static getDefaultTodoLayout(index, metrics, tileSize, hasHeader = false) {
    const padding = 20;
    const gap = 12;
    const cols = Math.max(1, Math.floor((metrics.width - (padding * 2) + gap) / (tileSize.width + gap)));
    const col = index % cols;
    const row = Math.floor(index / cols);
    const minXPx = 20;
    const minYPx = hasHeader ? 28 : 20;
    const xPx = Math.min(Math.max(minXPx, metrics.width - tileSize.width - padding), padding + (col * (tileSize.width + gap)));
    const yPx = Math.min(Math.max(minYPx, metrics.height - tileSize.height - padding), padding + (row * (tileSize.height + gap)));
    return {
      x: (xPx / metrics.width) * 100,
      y: (yPx / metrics.height) * 100
    };
  }

  static positionTodoCards() {
    const metrics = this.getTodoBoardMetrics();
    if (!metrics) return;

    const todos = TaskManager.getAllTodos();
    const tileSize = this.getTodoCardSize();
    let changed = false;

    // Group and sort cluster items to position them sequentially
    const clusterPositions = {}; // maps clusterId -> { leftPx, topPx, heightPx }

    // Sort todos so cluster items are grouped together and processed in sequential order of their index
    const sortedTodos = [...todos].sort((a, b) => {
      if (a.clusterId && b.clusterId) {
        if (a.clusterId === b.clusterId) {
          return (a.clusterIndex || 0) - (b.clusterIndex || 0);
        }
        return a.clusterId.localeCompare(b.clusterId);
      }
      if (a.clusterId) return -1;
      if (b.clusterId) return 1;
      return 0;
    });

    sortedTodos.forEach((todo, index) => {
      const card = metrics.board.querySelector(`.task-card-todo[data-id="${todo.id}"]`);
      if (!card) return;

      const actualTileHeight = card.offsetHeight || tileSize.height;

      // Check if this card belongs to an active cluster and has a predecessor positioned
      if (todo.clusterId && clusterPositions[todo.clusterId]) {
        const prev = clusterPositions[todo.clusterId];
        const leftPx = prev.leftPx;
        const topPx = prev.topPx + prev.heightPx;

        card.style.width = `${tileSize.width}px`;
        card.style.left = `${leftPx}px`;
        card.style.top = `${topPx}px`;

        // Update the track position for the next card in the cluster
        clusterPositions[todo.clusterId] = {
          leftPx,
          topPx,
          heightPx: actualTileHeight
        };
        return;
      }

      const hasHeader = !!todo.clusterId || (!!todo.deadline && !todo.completed);
      const layout = todo.layout
        ? this.clampTodoLayout(todo.layout, { width: metrics.width, height: metrics.height }, { width: tileSize.width, height: actualTileHeight }, hasHeader)
        : this.getDefaultTodoLayout(index, metrics, { width: tileSize.width, height: actualTileHeight }, hasHeader);

      if (!todo.layout) {
        TaskManager.updateTodoLayout(todo.id, layout);
        changed = true;
      }

      card.style.width = `${tileSize.width}px`;
      card.style.left = `${layout.x}%`;
      card.style.top = `${layout.y}%`;

      // If this is the start of an active cluster, record its position
      if (todo.clusterId) {
        const leftPx = (layout.x / 100) * metrics.width;
        const topPx = (layout.y / 100) * metrics.height;
        clusterPositions[todo.clusterId] = {
          leftPx,
          topPx,
          heightPx: actualTileHeight
        };
      }
    });

    if (changed) {
      try { getGameState().save(); } catch (error) { }
    }
  }

  static bindTodoBoardInteractions() {
    const board = document.getElementById('todosList');
    if (!board || board.dataset.dragBound === '1') return;

    board.dataset.dragBound = '1';

    board.addEventListener('click', (event) => {
      const existingWizard = document.querySelector('.floating-wizard');
      if (existingWizard) {
        if (Date.now() - (this.wizardOpenedTime || 0) < 300) {
          return;
        }
        if (!existingWizard.contains(event.target)) existingWizard.remove();
        return;
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

      if (event.target.closest('button, input, textarea, select, label')) return;

      const card = event.target.closest('.task-card-todo');
      const isNote = event.target.closest('.todo-note-card');
      if (isNote) return;

      const startX = event.clientX;
      const startY = event.clientY;
      let isLongPressed = false;

      if (card) {
        const todoId = card.dataset.id;
        if (!todoId) return;

        event.preventDefault();

        try { card.setPointerCapture(event.pointerId); } catch (error) { }

        // Check double tap first
        const now = Date.now();
        const lastTap = Number(card.dataset.lastTapTime || 0);
        if (now - lastTap < 300) {
          // Double tap: toggle Blood Oath
          clearTimeout(this.todoHoldTimer);
          TaskManager.toggleBloodOathTodo(todoId);
          card.dataset.lastTapTime = '0';
          return;
        }
        card.dataset.lastTapTime = String(now);

        clearTimeout(this.todoHoldTimer);
        this.todoHoldTimer = setTimeout(() => {
          isLongPressed = true;

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

          const cardRect = card.getBoundingClientRect();
          const boardRect = board.getBoundingClientRect();

          const styleLeft = card.style.left || '0px';
          const styleTop = card.style.top || '0px';
          let startLeftPx = 0;
          let startTopPx = 0;

          if (styleLeft.includes('px')) {
            startLeftPx = parseFloat(styleLeft) || 0;
          } else {
            startLeftPx = ((parseFloat(styleLeft) || 0) / 100) * boardRect.width;
          }

          if (styleTop.includes('px')) {
            startTopPx = parseFloat(styleTop) || 0;
          } else {
            startTopPx = ((parseFloat(styleTop) || 0) / 100) * boardRect.height;
          }

          const startLeftPercent = styleLeft.includes('px')
            ? (startLeftPx / boardRect.width) * 100
            : parseFloat(styleLeft) || 0;
          const startTopPercent = styleTop.includes('px')
            ? (startTopPx / boardRect.height) * 100
            : parseFloat(styleTop) || 0;

          let firstStartLeftPercent = 0;
          let firstStartTopPercent = 0;
          if (firstCardElement) {
            const fStyleLeft = firstCardElement.style.left || '0px';
            const fStyleTop = firstCardElement.style.top || '0px';

            firstStartLeftPercent = fStyleLeft.includes('px')
              ? (parseFloat(fStyleLeft) / boardRect.width) * 100
              : parseFloat(fStyleLeft) || 0;
            firstStartTopPercent = fStyleTop.includes('px')
              ? (parseFloat(fStyleTop) / boardRect.height) * 100
              : parseFloat(fStyleTop) || 0;
          }

          const hasHeader = isCluster || (todo && todo.deadline && !todo.completed);

          this.todoDragState = {
            todoId,
            card,
            board,
            pointerId: event.pointerId,
            boardRect,
            cardWidth: cardRect.width,
            cardHeight: cardRect.height,
            offsetX: event.clientX - (boardRect.left + startLeftPx),
            offsetY: event.clientY - (boardRect.top + startTopPx),
            moved: false,
            startX: event.clientX,
            startY: event.clientY,
            startLeftPercent,
            startTopPercent,
            nextX: startLeftPercent,
            nextY: startTopPercent,
            isCluster,
            hasHeader,
            firstCardElement,
            firstStartLeftPercent,
            firstStartTopPercent,
            clusterCards
          };

          card.classList.add('dragging');
          if (isCluster) {
            clusterCards.forEach(c => {
              c.classList.add('dragging');
            });
          }
        }, 500);

        const onMove = (moveEvent) => {
          if (moveEvent.pointerId !== event.pointerId) return;
          if (!isLongPressed) {
            const dist = Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY);
            if (dist > 10) {
              clearTimeout(this.todoHoldTimer);
              cleanup();
            }
          }
        };

        const onUp = (upEvent) => {
          if (upEvent.pointerId !== event.pointerId) return;
          clearTimeout(this.todoHoldTimer);
          cleanup();

          if (!isLongPressed) {
            const todoName = card.querySelector('.todo-title')?.textContent || '';
            const state = getGameState();
            try {
              PopupsManager.showConfirm(`Complete To-Do?`, `Complete ${todoName || 'this to-do'}?`, () => {
                if (!TaskManager.completeTodo(todoId)) return;

                if (typeof RetroTaskCompleteAnimation !== 'undefined') {
                  RetroTaskCompleteAnimation.play(card);
                }

                UIManager.updateTodosList();
                try { state.save(); } catch (e) { }
                UIManager.renderEnemies();
              });
            } catch (e) {
              if (TaskManager.completeTodo(todoId)) {
                UIManager.updateTodosList();
                try { state.save(); } catch (err) { }
                UIManager.renderEnemies();
              }
            }
          }
        };

        const cleanup = () => {
          try { card.releasePointerCapture(event.pointerId); } catch (error) { }
          document.removeEventListener('pointermove', onMove);
          document.removeEventListener('pointerup', onUp);
          document.removeEventListener('pointercancel', onUp);
        };

        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onUp);
        document.addEventListener('pointercancel', onUp);

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

    const onMove = (event) => {
      const dragState = this.todoDragState;
      if (!dragState || event.pointerId !== dragState.pointerId) return;
      if (event.clientX === 0 && event.clientY === 0) return;

      const boardRect = dragState.board.getBoundingClientRect();
      const minXPx = 20;
      const minYPx = dragState.hasHeader ? 28 : 0;
      const maxLeft = Math.max(minXPx, boardRect.width - dragState.cardWidth);
      const maxTop = Math.max(minYPx, boardRect.height - dragState.cardHeight);

      const nextLeftPx = Math.max(minXPx, Math.min(maxLeft, event.clientX - boardRect.left - dragState.offsetX));
      const nextTopPx = Math.max(minYPx, Math.min(maxTop, event.clientY - boardRect.top - dragState.offsetY));

      if (!dragState.moved) {
        const distance = Math.hypot(event.clientX - dragState.startX, event.clientY - dragState.startY);
        if (distance > 4) dragState.moved = true;
      }

      dragState.nextX = (nextLeftPx / Math.max(1, boardRect.width)) * 100;
      dragState.nextY = (nextTopPx / Math.max(1, boardRect.height)) * 100;

      if (dragState.isCluster && dragState.firstCardElement) {
        const deltaX = dragState.nextX - dragState.startLeftPercent;
        const deltaY = dragState.nextY - dragState.startTopPercent;

        // Update the first card's layout in memory to allow real-time rigid positioning
        const firstCardTodo = TaskManager.getTaskById(dragState.firstCardElement.dataset.id);
        if (firstCardTodo) {
          firstCardTodo.layout = {
            x: dragState.firstStartLeftPercent + deltaX,
            y: dragState.firstStartTopPercent + deltaY
          };
        }

        dragState.firstCardElement.style.left = `${dragState.firstStartLeftPercent + deltaX}%`;
        dragState.firstCardElement.style.top = `${dragState.firstStartTopPercent + deltaY}%`;

        this.positionTodoCards();
      } else {
        dragState.card.style.left = `${dragState.nextX}%`;
        dragState.card.style.top = `${dragState.nextY}%`;
      }
    };

    const endDrag = (event) => {
      const dragState = this.todoDragState;
      if (!dragState || (event.pointerId !== undefined && event.pointerId !== dragState.pointerId)) return;

      const boardRect = dragState.board.getBoundingClientRect();
      const cardRect = dragState.card.getBoundingClientRect();
      dragState.card.classList.remove('dragging');
      try { dragState.card.releasePointerCapture(dragState.pointerId); } catch (error) { }

      if (dragState.isCluster && dragState.clusterCards) {
        if (dragState.moved) {
          dragState.clusterCards.forEach(c => {
            c.classList.remove('dragging');

            const cRect = c.getBoundingClientRect();
            const cTileSize = { width: cRect.width, height: cRect.height };
            const cTodo = TaskManager.getTaskById(c.dataset.id);
            const cHasHeader = !!cTodo?.clusterId || (!!cTodo?.deadline && !cTodo?.completed);
            const cLayout = this.clampTodoLayout({
              x: ((cRect.left - boardRect.left) / Math.max(1, boardRect.width)) * 100,
              y: ((cRect.top - boardRect.top) / Math.max(1, boardRect.height)) * 100
            }, { width: Math.max(1, boardRect.width), height: Math.max(1, boardRect.height) }, cTileSize, cHasHeader);

            TaskManager.updateTodoLayout(c.dataset.id, cLayout);
          });
          try { getGameState().save(); } catch (error) { }
          this.todoDragSuppressUntil = Date.now() + 250;
        } else {
          dragState.clusterCards.forEach(c => {
            c.classList.remove('dragging');
          });
        }
      } else if (dragState.moved) {
        const tileSize = { width: cardRect.width, height: cardRect.height };
        const cTodo = TaskManager.getTaskById(dragState.todoId);
        const cHasHeader = !!cTodo?.clusterId || (!!cTodo?.deadline && !cTodo?.completed);
        const layout = this.clampTodoLayout({
          x: ((cardRect.left - boardRect.left) / Math.max(1, boardRect.width)) * 100,
          y: ((cardRect.top - boardRect.top) / Math.max(1, boardRect.height)) * 100
        }, { width: Math.max(1, boardRect.width), height: Math.max(1, boardRect.height) }, tileSize, cHasHeader);

        TaskManager.updateTodoLayout(dragState.todoId, layout);
        try { getGameState().save(); } catch (error) { }
        this.todoDragSuppressUntil = Date.now() + 250;
      }

      this.todoDragState = null;
      this.positionTodoCards();
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', endDrag);
    document.addEventListener('pointercancel', endDrag);
  }

  static updateTodosList() {
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

    container.innerHTML = visibleTodos.map(todo => {
      const displayName = (todo.name === 'New To-Do') ? '' : (todo.name || '');

      // Check if this is the first card in its cluster among visible todos
      let isFirstInCluster = false;
      let clusterHeader = '';
      if (todo.clusterId) {
        const clusterTodos = visibleTodos.filter(t => t.clusterId === todo.clusterId)
          .sort((a, b) => (a.clusterIndex || 0) - (b.clusterIndex || 0));
        if (clusterTodos.length > 0 && clusterTodos[0].id === todo.id) {
          isFirstInCluster = true;

          const deadlineLabel = todo.deadline ? new Date(todo.deadline).toLocaleDateString() : 'No deadline';
          const deadlineDistance = this.getDeadlineDistanceText(todo.deadline);
          const attrTexts = [];
          if (todo.clusterAttributes) {
            for (const attr in todo.clusterAttributes) {
              const pct = Math.round(todo.clusterAttributes[attr] * 100);
              attrTexts.push(`${pct}% ${attr.toLowerCase()}`);
            }
          }
          clusterHeader = `
            <div class="todo-cluster-header-outside" style="position: absolute; bottom: 100%; left: 0; width: 100%; padding-bottom: 6px; pointer-events: none; display: flex; flex-direction: column; gap: 2px;">
              <div style="display: flex; justify-content: space-between; align-items: flex-end; width: 100%; margin-bottom: 2px;">
                <div class="todo-date-big" style="font-size: 11px; color: #fff0b8; font-family: 'Orbitron', monospace; font-weight: bold;">${deadlineLabel}</div>
                <div class="todo-date-subtext" style="font-size: 6px; color: var(--text-muted); font-family: 'Orbitron', monospace;">${deadlineDistance}</div>
              </div>
              <div class="cluster-badge" style="font-size: 6px; color: #a04ef6; font-family: 'Orbitron', monospace; font-weight: bold; text-transform: lowercase;">${attrTexts.join(', ')}</div>
            </div>
          `;
        }
      } else if (todo.deadline && !todo.completed) {
        const deadlineLabel = new Date(todo.deadline).toLocaleDateString();
        const deadlineDistance = this.getDeadlineDistanceText(todo.deadline);
        clusterHeader = `
          <div class="todo-cluster-header-outside" style="position: absolute; bottom: 100%; left: 0; width: 100%; padding-bottom: 6px; pointer-events: none; display: flex; flex-direction: column; gap: 2px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-end; width: 100%; margin-bottom: 2px;">
              <div class="todo-date-big" style="font-size: 11px; color: #fff0b8; font-family: 'Orbitron', monospace; font-weight: bold;">${deadlineLabel}</div>
              <div class="todo-date-subtext" style="font-size: 6px; color: var(--text-muted); font-family: 'Orbitron', monospace;">${deadlineDistance}</div>
            </div>
          </div>
        `;
      }

      // Completed placeholder for cluster cards
      if (todo.completed && todo.clusterId) {
        return `
        <div class="task-card task-card-todo completed-cluster-placeholder" data-id="${todo.id}" data-type="todo" data-cluster-id="${todo.clusterId}" data-cluster-index="${todo.clusterIndex}" style="background: transparent !important; border: none !important; box-shadow: none !important; height: 48px !important; min-height: 48px !important; display: flex !important; align-items: center !important; justify-content: center !important; pointer-events: auto !important; cursor: grab !important; position: relative !important;">
          ${clusterHeader}
          <div class="completed-cluster-chain" style="display: flex !important; align-items: center !important; justify-content: center !important; width: 100% !important; height: 100% !important; opacity: 0.45 !important; font-size: 16px !important; pointer-events: none !important; transform: rotate(90deg) !important;">⛓️</div>
          <div class="task-card-actions task-card-actions-todo task-card-actions-small placeholder-actions hover-only" style="position: absolute; right: 6px; top: 50%; transform: translateY(-50%);">
            <button class="btn-todo-delete" title="Delete to-do" data-id="${todo.id}">🗑</button>
          </div>
        </div>
        `;
      }

      const subtasks = (todo.subtasks || []).map(st => `
        <div class="subtask ${st.completed ? 'completed' : ''}" data-subtask-id="${st.id}">
          <label class="subtask-label"><input type="checkbox" class="subtask-checkbox" data-subtask-id="${st.id}" ${st.completed ? 'checked' : ''}> <span class="subtask-name" style="color: inherit;">${st.name}</span></label>
          <button class="subtask-remove" data-subtask-id="${st.id}" title="Remove subtask">×</button>
        </div>
      `).join('');
      const subtaskCount = (todo.subtasks || []).length;

      // Border and color configurations
      const isCluster = todo.clusterId && !todo.completed;
      let displayAttr = todo.attribute;
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
      const bgGradient = `background: linear-gradient(135deg, ${attrColor}cf, ${UIManager.shadeColor(attrColor, -60)}e5) !important; color: ${textColor} !important;`;
      const borderStyle = isCluster
        ? 'border-color: #6a0dad !important; --cluster-color: #6a0dad; box-shadow: 0 4px 12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05), 0 0 6px rgba(106,13,173,0.5) !important;'
        : `border-color: ${attrColor} !important; --task-accent: ${attrColor}; box-shadow: 0 4px 12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05), 0 0 6px ${attrColor}44 !important; ${bgGradient}`;

      const shapeClass = this.shapeClassForDifficulty(todo.difficulty);

      return `
      <div class="task-card task-clickable task-card-todo discreet ${todo.completed ? 'completed' : ''}${todo.bloodOathActive ? ' blood-oath-active' : ''}" data-id="${todo.id}" data-type="todo" tabindex="0" ${todo.clusterId ? `data-cluster-id="${todo.clusterId}" data-cluster-index="${todo.clusterIndex}"` : ''} style="${borderStyle}">
        ${todo.bloodOathActive ? `
          <div class="blood-oath-fire-container">
            <div class="flame-square"></div><div class="flame-square"></div><div class="flame-square"></div><div class="flame-square"></div>
            <div class="flame-square"></div><div class="flame-square"></div><div class="flame-square"></div><div class="flame-square"></div>
          </div>
        ` : ''}
        ${clusterHeader}

        <!-- Floating difficulty shape next to the card -->
        <div class="todo-difficulty-shape shape-${shapeClass}" title="Difficulty: ${todo.difficulty}"></div>
        
        <div class="todo-card-top" style="gap: 4px;">
          <div class="task-title todo-title">${displayName}</div>
        </div>

        <div class="todo-card-body" style="margin-top: 2px;">
          ${subtaskCount > 0 ? `
            <div class="todo-subtasks-wrap" style="margin-top: 4px;">
              <div class="todo-subtask-label" style="font-size: 6px; color: var(--text-muted); font-family: 'Orbitron', monospace; margin-bottom: 4px;">${subtaskCount} subtasks</div>
              <div class="subtasks">${subtasks}</div>
            </div>
          ` : ''}
          <div class="subtask-add hover-only" style="margin-top: 4px;">
            <input class="subtask-input" placeholder="Add subtask..." data-todo-id="${todo.id}" />
            <button class="subtask-add-btn" data-todo-id="${todo.id}">Add</button>
          </div>
        </div>

        <div class="task-card-actions task-card-actions-todo task-card-actions-small hover-only">
          <button class="btn-blood-oath" title="Blood Oath">🩸</button>
          <button class="btn-edit" title="Edit">✎</button>
          <button class="btn-todo-delete" title="Delete to-do" data-id="${todo.id}">🗑</button>
        </div>
      </div>
      `;
    }).join('');

    this.bindTaskInteractions();
    this.bindTodoBoardInteractions();
    this.positionTodoCards();
    this.renderTodoNotes();
  }

  static getRingInfo(index, totalCount) {
    const capacityPerRing = 8;
    const ringLevel = Math.floor(index / capacityPerRing);
    const ringIndex = index % capacityPerRing;
    const totalInRing = Math.min(capacityPerRing, totalCount - ringLevel * capacityPerRing);
    return { ringLevel, ringIndex, totalInRing: totalInRing || 1 };
  }

  static renderEnemies() {
    const layer = document.getElementById('enemyLayer');
    if (!layer) return;

    const state = getGameState();
    const enemies = state.stageState.enemies || [];
    const circle = document.querySelector('.enemy-circle-container');
    const rect = circle ? circle.getBoundingClientRect() : { width: 620, height: 620 };
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    // Position enemies relative to circle border
    const radius = Math.min(rect.width, rect.height) / 2;

    if (!enemies.length) {
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

    enemies.forEach((enemy, index) => {
      const enemyId = String(enemy.id);
      activeEnemyIds.add(enemyId);

      const { ringLevel, ringIndex, totalInRing } = this.getRingInfo(index, enemies.length);
      const currentRadius = ringLevel === 0 ? (radius + 30) : (radius - 45 - (ringLevel - 1) * 70);

      const angle = (Math.PI * 2 * ringIndex) / totalInRing - Math.PI / 2;
      const x = centerX + Math.cos(angle) * currentRadius;
      let y = centerY + Math.sin(angle) * currentRadius;
      if (enemy.isBoss) {
        y += 28;
      }

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
      
      // Start dynamic canvas updating loop if not already running
      if (!window.enemyCanvasLoopActive) {
        window.enemyCanvasLoopActive = true;
        const tick = () => {
          const cv = document.getElementById('enemyCanvas');
          if (!cv) {
            window.enemyCanvasLoopActive = false;
            return;
          }
          this.drawCanvasConnections();
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    } catch (e) {
      console.warn('Failed to draw canvas connections', e);
    }

    // Bind click handlers to enemy cards for targeting
    this.bindEnemyTargeting();
  }

  static createEnemyCardElement(enemyId) {
    const card = document.createElement('div');
    card.className = 'enemy-card';
    card.dataset.enemyId = String(enemyId);
    card.innerHTML = `
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
    return card;
  }

  static patchEnemyCardElement(card, data) {
    const state = getGameState();
    const { enemy, x, y, isTargeted, isDodgeReady, showDodgeMarker, showPetBadge, petEmoji } = data;
    const hpPercent = enemy.maxHp ? Math.max(0, (enemy.hp / enemy.maxHp) * 100) : 0;
    const resistColor = this.getEnemyElementColor(enemy?.resist);
    const weakColor = this.getEnemyElementColor(enemy?.weak);

    card.style.left = x + 'px';
    card.style.top = y + 'px';
    card.dataset.x = x;
    card.dataset.y = y;
    card.style.setProperty('--enemy-resist-color', resistColor);
    card.style.setProperty('--enemy-weak-color', weakColor);

    card.classList.toggle('dead', !!enemy.isDead);
    card.classList.toggle('elite', !!enemy.isElite);
    card.classList.toggle('boss', !!enemy.isBoss);
    card.classList.toggle('targeted', !!isTargeted);
    card.classList.toggle('dodge-ready', !!isDodgeReady);
    card.classList.toggle('enraged', !enemy.isDead && (enemy.daysAlive > 0));

    const isPhase2 = !!(enemy.isBoss && (
      (state.stageState.bossData && state.stageState.bossData.phase === 2) ||
      (enemy.maxHp > 0 && enemy.hp / enemy.maxHp <= 0.4)
    ));
    card.classList.toggle('boss-phase-2', !!isPhase2);
    if (enemy.isBoss) {
      const bossColor = (state.config.bosses && state.config.bosses[enemy.name]?.color) || '#ff2222';
      card.style.setProperty('--boss-color', bossColor);
    }

    const emojiEl = card.querySelector('.enemy-emoji');
    if (emojiEl) emojiEl.textContent = this.getEnemyEmoji(enemy);

    const nameEl = card.querySelector('.enemy-name');
    if (nameEl) nameEl.textContent = enemy.name;

    const hpFillEl = card.querySelector('.enemy-hpfill');
    if (hpFillEl) hpFillEl.style.width = hpPercent + '%';

    const hpTextEl = card.querySelector('.enemy-hptext');
    if (hpTextEl) hpTextEl.textContent = `${Math.ceil(enemy.hp || 0)}/${Math.ceil(enemy.maxHp || 0)}`;

    const dodgeMarkerEl = card.querySelector('.dodge-marker');
    if (dodgeMarkerEl) dodgeMarkerEl.style.display = showDodgeMarker ? '' : 'none';

    const petBadgeEl = card.querySelector('.pet-badge');
    if (petBadgeEl) {
      petBadgeEl.style.display = showPetBadge ? '' : 'none';
      if (showPetBadge) petBadgeEl.textContent = petEmoji;
    }

    // Mutator badges
    try {
      this.renderMutatorBadges(card, enemy);
    } catch (e) { console.warn('Failed to render mutator badges', e); }

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
          card.classList.add('archetype-brute');
          card.style.setProperty('--brute-combo', enemy.consecutiveAttackDays || 0);
        } else {
          card.classList.remove('archetype-brute');
          card.style.removeProperty('--brute-combo');
        }

        // 2. Mana Drain archetype
        let blueCircle = card.querySelector('.mana-drain-circle');
        if (archetypeStr === 'mana drain') {
          if (!blueCircle) {
            blueCircle = document.createElement('div');
            blueCircle.className = 'mana-drain-circle';
            card.appendChild(blueCircle);
          }
        } else {
          if (blueCircle) blueCircle.remove();
        }

        // 3. Vampiric mutator (Tripled: 12 heart spans)
        let vampParticles = card.querySelector('.vampiric-particles');
        if (hasVampiric) {
          if (!vampParticles) {
            vampParticles = document.createElement('div');
            vampParticles.className = 'vampiric-particles';
            vampParticles.innerHTML = '<span>❤️</span><span>❤️</span><span>❤️</span><span>❤️</span><span>❤️</span><span>❤️</span><span>❤️</span><span>❤️</span><span>❤️</span><span>❤️</span><span>❤️</span><span>❤️</span>';
            card.appendChild(vampParticles);
          }
        } else {
          if (vampParticles) vampParticles.remove();
        }

        // 4. Regenerator mutator
        let regenSquare = card.querySelector('.regenerator-square');
        if (hasRegen) {
          if (!regenSquare) {
            regenSquare = document.createElement('div');
            regenSquare.className = 'regenerator-square';
            card.appendChild(regenSquare);
          }
        } else {
          if (regenSquare) regenSquare.remove();
        }

        // 5. Rallyist mutator
        if (hasRallyist) {
          card.classList.add('mutator-rallyist');
        } else {
          card.classList.remove('mutator-rallyist');
        }

        // 6. Swift mutator
        let swiftCircle = card.querySelector('.swift-circle');
        if (hasSwift) {
          if (!swiftCircle) {
            swiftCircle = document.createElement('div');
            swiftCircle.className = 'swift-circle';
            card.appendChild(swiftCircle);
          }
        } else {
          if (swiftCircle) swiftCircle.remove();
        }

        // 7. Necromancer mutator (Tripled: 12 skull spans)
        let necroParticles = card.querySelector('.necromancer-particles');
        if (hasNecro) {
          if (!necroParticles) {
            necroParticles = document.createElement('div');
            necroParticles.className = 'necromancer-particles';
            necroParticles.innerHTML = '<span>💀</span><span>💀</span><span>💀</span><span>💀</span><span>💀</span><span>💀</span><span>💀</span><span>💀</span><span>💀</span><span>💀</span><span>💀</span><span>💀</span>';
            card.appendChild(necroParticles);
          }
        } else {
          if (necroParticles) necroParticles.remove();
        }
      } else {
        // Clean up everything if dead
        card.classList.remove('archetype-brute');
        card.style.removeProperty('--brute-combo');
        card.classList.remove('mutator-rallyist');

        const selectors = ['.mana-drain-circle', '.vampiric-particles', '.regenerator-square', '.swift-circle', '.necromancer-particles'];
        selectors.forEach(sel => {
          const el = card.querySelector(sel);
          if (el) el.remove();
        });
      }
    } catch (err) {
      console.warn('Failed to render dynamic indicators:', err);
    }
  }

  static drawCanvasConnections() {
    const canvas = document.getElementById('enemyCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const state = getGameState();
    const enemies = state.stageState.enemies || [];
    if (!enemies.length) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const circle = document.querySelector('.enemy-circle-container');
    const rect = circle ? circle.getBoundingClientRect() : { width: 620, height: 620 };
    if (canvas.width !== rect.width || canvas.height !== rect.height) {
      canvas.width = rect.width;
      canvas.height = rect.height;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(canvas.width, canvas.height) / 2;

    const alivePositions = [];
    const idToPos = new Map();

    enemies.forEach((enemy, index) => {
      if (enemy && !enemy.isDead) {
        const { ringLevel, ringIndex, totalInRing } = this.getRingInfo(index, enemies.length);
        const currentRadius = ringLevel === 0 ? (radius + 30) : (radius - 45 - (ringLevel - 1) * 70);
        const angle = (Math.PI * 2 * ringIndex) / totalInRing - Math.PI / 2;
        const x = centerX + Math.cos(angle) * currentRadius;
        let y = centerY + Math.sin(angle) * currentRadius;
        if (enemy.isBoss) {
          y += 28;
        }
        const pos = { x, y, id: String(enemy.id), enemy, index };
        alivePositions.push(pos);
        idToPos.set(String(enemy.id), pos);
      }
    });

    // 1. Draw standard background red web connection line
    if (alivePositions.length > 1) {
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.45)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < alivePositions.length; i++) {
        for (let j = i + 1; j < alivePositions.length; j++) {
          ctx.moveTo(alivePositions[i].x, alivePositions[i].y);
          ctx.lineTo(alivePositions[j].x, alivePositions[j].y);
        }
      }
      ctx.stroke();
    }

    // 2. Draw Healer zigzag green lines
    alivePositions.forEach(pos => {
      const arch = (pos.enemy.archetype || '').toLowerCase();
      if (arch === 'healer') {
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
      // Replace click-to-attack: show mutator popup for clicked enemy
      try { this.showMutatorPopup(enemyId); } catch (e) { console.warn('Failed to show mutator popup', e); }
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
    if (archetype === 'mana drain') return '👻';
    if (archetype === 'protector') return '🛡️';
    if (archetype === 'healer') return '💚';
    return '☠️';
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
      const weaponCfg = state.config?.weapons?.[weaponName];
      const weaponIcon = weaponCfg?.icon || state.config?.shopItemIcons?.[weaponName] || '⚔️';
      const weaponLabel = weaponElement ? `${weaponIcon} ${weaponName} · ${weaponElement}` : `${weaponIcon} ${weaponName}`;

      return `<div class="weapon-chip-wrap"><button class="weapon-chip ${activeClass}" data-slot="${index}">${weaponLabel}</button><button class="weapon-upgrade-btn" data-weapon="${weaponName}" data-slot="${index}" title="Upgrade">⚒️</button></div>`;
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

          const maxX = window.innerWidth - container.offsetWidth;
          const maxY = window.innerHeight - container.offsetHeight;
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

    // Click to switch weapon
    strip.querySelectorAll('.weapon-chip[data-slot]').forEach(btn => {
      btn.addEventListener('click', () => {
        const slot = Number(btn.dataset.slot);
        PlayerManager.switchWeapon(slot);
        this.updateWeaponIcons();
        this.updateActionCosts();
        getGameState().save();
      });
    });

    // Upgrade button -> open weapon upgrade popup
    strip.querySelectorAll('.weapon-upgrade-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const weapon = e.currentTarget.dataset.weapon;
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
    const dodgeCost = CombatManager.getDodgeCost();
    const attackText = document.getElementById('attackCostText');
    const dodgeText = document.getElementById('dodgeCostText');
    if (attackText) attackText.textContent = attackCost ? `(${attackCost} AP)` : '';
    if (dodgeText) dodgeText.textContent = `(${dodgeCost} AP)`;

    const attackBtn = document.getElementById('attackBtn');
    if (attackBtn) {
      const weaponCfg = weapon ? state.config?.weapons?.[weapon.name] : null;
      const weaponIcon = weaponCfg?.icon || state.config?.shopItemIcons?.[weapon?.name] || '⚔️';
      const firstChild = attackBtn.firstChild;
      if (firstChild && firstChild.nodeType === Node.TEXT_NODE) {
        firstChild.nodeValue = weaponIcon;
      }
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

  static refreshGameUI() {
    this.updateStageBackdrop();
    this.updateWeaponIcons();
    try { this.refreshEventBanner(); } catch (e) { }
    this.updateDateDisplay();
    this.updateStageIndicator();
    this.renderEnemies();
    this.updateRunCompletionGraph();
    try { this.updateWeeklyHeatmap(); } catch (e) { }
    try { if (window.StatsHUD && typeof StatsHUD.update === 'function') StatsHUD.update(); } catch (e) { console.warn('StatsHUD update failed', e); }
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

    banner.style.display = 'block';

    const titleEl = document.getElementById('eventBannerTitle');
    const descEl = document.getElementById('eventBannerDesc');
    const claimBtn = document.getElementById('eventBannerClaimBtn');

    let isComplete = false;

    if (event.type === 'Shrine') {
      titleEl.textContent = '⛩️';
      descEl.textContent = 'Complete 100% of today\'s active Dailies.';
      isComplete = TaskManager.isAllDailiesComplete() && state.dailiesState.dailies.length > 0;
    } else if (event.type === 'Statue') {
      titleEl.textContent = '🗿';
      descEl.textContent = 'Complete the targeted dailies.';
      const targets = event.targets || [];
      const missed = TaskManager.getMissedDailies().map(d => d.id);
      isComplete = targets.length > 0 && targets.every(t => !missed.includes(t));
    } else if (event.type === 'Sacred Tree') {
      titleEl.textContent = '🌳';
      descEl.textContent = 'Complete the selected daily.';
      const target = event.targets?.[0];
      const missed = TaskManager.getMissedDailies().map(d => d.id);
      isComplete = target && !missed.includes(target);
    }

    if (isComplete) {
      claimBtn.disabled = false;
      claimBtn.classList.add('ready');
    } else {
      claimBtn.disabled = true;
      claimBtn.classList.remove('ready');
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
    const currentCompleted = currentDailies.filter(daily => (daily.completionsToday || 0) >= (daily.maxCompletionsPerDay || 1)).length;
    const currentTotal = currentDailies.length;
    const currentPct = currentTotal > 0 ? currentCompleted / currentTotal : 0;

    const series = runHistory.map(entry => {
      const completedCount = Array.isArray(entry.completedDailies) ? entry.completedDailies.length : 0;
      const attemptedCount = completedCount + (Array.isArray(entry.missedDailies) ? entry.missedDailies.length : 0);
      return {
        completed: !!entry.allDailiesComplete,
        pct: attemptedCount > 0 ? completedCount / attemptedCount : 0
      };
    });

    series.push({
      completed: currentTotal > 0 && currentCompleted === currentTotal,
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

    const cells = [];
    for (let i = 27; i >= 0; i--) {
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
        if (typeof entry.completionRate === 'number') {
          rate = entry.completionRate;
        } else {
          const comp = Array.isArray(entry.completedDailies) ? entry.completedDailies.length : 0;
          const missed = Array.isArray(entry.missedDailies) ? entry.missedDailies.length : 0;
          const saved = Array.isArray(entry.savedDailies) ? entry.savedDailies.length : 0;
          const total = comp + missed + saved;
          rate = total > 0 ? (comp / total) : (entry.allDailiesComplete ? 1.0 : 0.0);
        }

        const compCount = Array.isArray(entry.completedDailies) ? entry.completedDailies.length : 0;
        const missedCount = Array.isArray(entry.missedDailies) ? entry.missedDailies.length : 0;
        const savedCount = Array.isArray(entry.savedDailies) ? entry.savedDailies.length : 0;
        const totalCount = compCount + missedCount + savedCount;

        const hue = 240 + Math.round(rate * 120);
        const color = `hsl(${hue}, 85%, 60%)`;
        const shadowColor = `hsla(${hue}, 85%, 60%, 0.4)`;
        const tooltip = `${cell.date}: ${Math.round(rate * 100)}% completed (${compCount}/${totalCount})`;

        return `<div class="heatmap-cell" style="background: ${color}; box-shadow: 0 0 3px ${shadowColor}; border-color: hsla(${hue}, 85%, 60%, 0.1);" title="${tooltip}"></div>`;
      } else if (cell.isToday) {
        // Today's pending check-in progress
        const dailies = state.dailiesState?.dailies || [];
        const scheduledDailies = typeof TaskManager !== 'undefined' && typeof TaskManager.isDailyScheduled === 'function'
          ? dailies.filter(d => TaskManager.isDailyScheduled(d, today))
          : dailies;
        const compCount = scheduledDailies.filter(d => d.completed).length;
        const totalCount = scheduledDailies.length;
        const rate = totalCount > 0 ? (compCount / totalCount) : 1.0;

        const hue = 240 + Math.round(rate * 120);
        const color = `hsl(${hue}, 85%, 60%)`;
        const shadowColor = `hsla(${hue}, 85%, 60%, 0.4)`;
        const tooltip = `${cell.date} (Today - Pending): ${Math.round(rate * 100)}% completed (${compCount}/${totalCount})`;

        return `<div class="heatmap-cell" style="background: ${color}; box-shadow: 0 0 3px ${shadowColor}; border-color: hsla(${hue}, 85%, 60%, 0.1);" title="${tooltip}"></div>`;
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

      PopupsManager.closeAllPopups();
      const overlay = PopupsManager.createPopupOverlay();
      const popup = document.createElement('div');
      popup.className = 'popup enemy-info-popup';

      popup.innerHTML = `
        <div class="enemy-sprite-placeholder">
          <img src="https://placehold.co/100x100/241a34/FFFFFF?text=Sprite" alt="Enemy Sprite" />
        </div>
        <h2>${enemy.name} ${enemy.isElite ? '👑' : ''}</h2>
        <button class="btn-close">✕</button>
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
            ${archetypeMeta.description ? `<div class="archetype-desc">${archetypeMeta.description}</div>` : ''}
            <div class="stat-row">
              <span class="stat-label">Resist</span>
              <span class="stat-value" style="color: #ff9a9a">${enemy.resist || '-'}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">Weakness</span>
              <span class="stat-value" style="color: #9aff9a">${enemy.weak || '-'}</span>
            </div>
          </div>
          <div class="enemy-info-mutators-section">
            <h3>Mutators</h3>
            ${mutatorHtml}
          </div>
        </div>
      `;

      popup.querySelector('.btn-close').addEventListener('click', () => PopupsManager.closeAllPopups());

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
    const consumableIcons = state.config?.shopItemIcons || {};
    const active = (PlayerManager && typeof PlayerManager.getActiveConsumables === 'function') ? PlayerManager.getActiveConsumables() : (state.playerState && state.playerState.consumables) || {};
    const ordered = Object.entries(active || {}).filter(([, count]) => Number(count) > 0);

    panel.innerHTML = `
      <div class="satchel-head">
        <span class="satchel-title">SATCHEL</span>
        <span class="satchel-subtitle">Consumables</span>
      </div>
      <div class="satchel-list">
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
    }).join('') : '<div class="satchel-empty">No consumables yet</div>'}
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

          const maxX = window.innerWidth - panel.offsetWidth;
          const maxY = window.innerHeight - panel.offsetHeight;
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
    panel.innerHTML = '';
    const state = getGameState();
    const buffs = Array.isArray(state.buffs) ? state.buffs : [];
    const cfg = state.config || {};
    if (!buffs.length) {
      panel.style.display = 'none';
      return;
    }
    panel.style.display = 'flex';
    buffs.forEach(name => {
      const meta = (cfg.buffs && cfg.buffs[name]) || { icon: '🔸', description: name };
      const btn = document.createElement('div');
      btn.className = 'buff-icon';
      btn.dataset.buff = name;
      btn.title = meta.description || name;
      btn.textContent = meta.icon || '🔸';
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        try { PopupsManager.showDialogue(name, meta.description || ''); } catch (err) { }
      });
      panel.appendChild(btn);
    });
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

window.addEventListener('resize', () => {
  if (typeof UIManager === 'undefined') return;
  if (UIManager.resizeScheduled) return;
  UIManager.resizeScheduled = true;
  requestAnimationFrame(() => {
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
    const hud = document.getElementById('statsHudWidget');
    if (!hud) return;

    const savedPos = localStorage.getItem('nemesis_stats_hud_pos');
    if (savedPos) {
      try {
        const { left, top } = JSON.parse(savedPos);
        hud.style.right = 'auto';
        hud.style.left = left + 'px';
        hud.style.top = top + 'px';
      } catch (e) {}
    } else {
      hud.style.left = '20px';
      hud.style.bottom = '80px';
    }

    const savedSize = localStorage.getItem('nemesis_stats_hud_size');
    if (savedSize) {
      try {
        const { width, height } = JSON.parse(savedSize);
        hud.style.width = Math.max(140, width) + 'px';
        hud.style.height = Math.max(252, height) + 'px';
      } catch (e) {}
    }

    const isCollapsed = localStorage.getItem('nemesis_stats_hud_collapsed') === 'true';
    if (isCollapsed) {
      hud.classList.add('collapsed');
      const toggleBtn = hud.querySelector('.stats-toggle-btn');
      if (toggleBtn) toggleBtn.textContent = '＋';
    }

    let isDragging = false;
    let startX = 0, startY = 0, initialLeft = 0, initialTop = 0;
    let latestX = 0, latestY = 0;
    let rafId = null;
    const header = hud.querySelector('.stats-hud-header');
    const content = hud.querySelector('.stats-hud-content');
    
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

          const maxX = window.innerWidth - hud.offsetWidth;
          const maxY = window.innerHeight - hud.offsetHeight;
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
      try { hud.releasePointerCapture(e.pointerId); } catch (err) {}
      localStorage.setItem('nemesis_stats_hud_pos', JSON.stringify({
        left: parseInt(hud.style.left, 10) || 0,
        top: parseInt(hud.style.top, 10) || 0
      }));
    };

    header.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button')) return;
      isDragging = true;
      hud.classList.add('is-dragging');
      startX = e.clientX;
      startY = e.clientY;
      const rect = hud.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;
      hud.style.bottom = 'auto';
      hud.style.right = 'auto';
      hud.style.left = initialLeft + 'px';
      hud.style.top = initialTop + 'px';
      try { hud.setPointerCapture(e.pointerId); } catch (err) {}
      
      document.addEventListener('pointermove', onPointerMove);
      document.addEventListener('pointerup', onPointerUp);
      document.addEventListener('pointercancel', onPointerUp);
    });

    const toggleBtn = hud.querySelector('.stats-toggle-btn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const collapsed = hud.classList.toggle('collapsed');
        toggleBtn.textContent = collapsed ? '＋' : '－';
        localStorage.setItem('nemesis_stats_hud_collapsed', String(collapsed));
        if (!collapsed) {
          StatsHUD.update();
        }
      });
    }

    if (window.ResizeObserver) {
      const observer = new ResizeObserver((entries) => {
        if (hud.classList.contains('collapsed')) return;
        for (let entry of entries) {
          const w = hud.offsetWidth;
          const h = hud.offsetHeight;
          localStorage.setItem('nemesis_stats_hud_size', JSON.stringify({
            width: Math.round(w),
            height: Math.round(h)
          }));
          
          // Calculate proportional scale factor
          // Base content dimensions: width 140px, height 252px total (226px content)
          const scaleX = w / 140;
          const scaleY = (h - 20) / 226;
          const scale = Math.min(scaleX, scaleY);
          
          if (content) {
            content.style.transform = `scale(${scale})`;
            // Center content inside if there is extra space
            const extraWidth = w - (132 * scale);
            content.style.marginLeft = `${Math.max(0, extraWidth / 2)}px`;
          }
        }
      });
      observer.observe(hud);
    }

    StatsHUD.update();
  }

  static update() {
    const hud = document.getElementById('statsHudWidget');
    if (!hud || hud.classList.contains('collapsed')) return;

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

    const goldEarned = Number(runStats.totalGoldEarned) || 0;
    const goldVel = minsElapsed > 0.1 ? (goldEarned / minsElapsed).toFixed(1) : '0.0';

    const diamondsEarned = Number(runStats.totalDiamondsEarned) || 0;
    const diaVel = minsElapsed > 0.1 ? (diamondsEarned / minsElapsed).toFixed(1) : '0.0';

    const elGoldVal = document.getElementById('statsGoldVelocity');
    const elDiaVal = document.getElementById('statsDiamondVelocity');
    if (elGoldVal) elGoldVal.textContent = `${goldVel}/min`;
    if (elDiaVal) elDiaVal.textContent = `${diaVel}/min`;

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

    StatsHUD.drawCharts(avgRate);
  }

  static drawCharts(avgRate = null) {
    const hud = document.getElementById('statsHudWidget');
    if (!hud || hud.classList.contains('collapsed')) return;

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

      gasContainer.innerHTML = `
        <svg viewBox="0 0 100 32" style="width:100%; height:100%; overflow:visible;">
          <path d="M 32 24 A 18 18 0 0 1 68 24" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="4" stroke-linecap="round"/>
          <path d="M 32 24 A 18 18 0 0 1 68 24" fill="none" stroke="url(#gasGradient)" stroke-width="4" stroke-linecap="round"
                stroke-dasharray="${circumference}" stroke-dashoffset="${strokeOffset}" style="transition: stroke-dashoffset 0.5s ease;"/>
          <line x1="50" y1="24" x2="${50 + 15 * Math.cos(Math.PI * (1 - avgRate))}" y2="${24 - 15 * Math.sin(Math.PI * (1 - avgRate))}" 
                stroke="#d8b4fe" stroke-width="1" stroke-linecap="round" style="transition: all 0.5s ease;"/>
          <circle cx="50" cy="24" r="2" fill="#a78bfa"/>
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

      radarContainer.innerHTML = `
        <svg viewBox="0 0 100 95" style="width:100%; height:100%; overflow:visible;">
          ${gridsHtml}
          ${axesHtml}
          ${nemesisPolygon}
          ${playerPolygon}
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

