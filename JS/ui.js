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
      <div class="hud-drag-handle" id="hudDragHandle"></div>
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
      </div>
      <div class="hud-currencies">
        <span>💰 <span id="goldValue">0</span></span>
        <span>💎 <span id="diamondValue">0</span></span>
      </div>
    `;
    document.body.appendChild(hud);

    const handle = hud.querySelector('#hudDragHandle');
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

    const onPointerDown = (e) => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const rect = hud.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;
      hud.style.right = 'auto';
      hud.style.left = initialLeft + 'px';
      hud.style.top = initialTop + 'px';
      handle.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e) => {
      if (!isDragging) return;
      e.preventDefault();
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      let newLeft = initialLeft + dx;
      let newTop = initialTop + dy;

      const maxX = window.innerWidth - hud.offsetWidth;
      const maxY = window.innerHeight - hud.offsetHeight;
      newLeft = Math.max(0, Math.min(newLeft, maxX));
      newTop = Math.max(0, Math.min(newTop, maxY));

      hud.style.left = newLeft + 'px';
      hud.style.top = newTop + 'px';
    };

    const onPointerUp = (e) => {
      if (!isDragging) return;
      isDragging = false;
      handle.releasePointerCapture(e.pointerId);
      localStorage.setItem('nemesis_hud_pos', JSON.stringify({
        left: parseInt(hud.style.left, 10) || 0,
        top: parseInt(hud.style.top, 10) || 0
      }));
    };

    handle.addEventListener('pointerdown', onPointerDown);
    handle.addEventListener('pointermove', onPointerMove);
    handle.addEventListener('pointerup', onPointerUp);
    handle.addEventListener('pointercancel', onPointerUp);
  }

  static createNavigationMenu() {
    const hamburger = document.createElement('div');
    hamburger.id = 'navHamburgerBtn';
    hamburger.className = 'nav-hamburger-btn';
    hamburger.innerHTML = '☰';
    document.body.appendChild(hamburger);

    const navPanel = document.createElement('div');
    navPanel.id = 'navMenuPanel';
    navPanel.className = 'nav-menu-panel';
    navPanel.innerHTML = `
      <div id="deathDefianceBadge" class="death-defiance-badge" style="margin-bottom: 4px;">DEFIANCE READY</div>
      <button id="homeBtn" class="btn-nav-item">🏠 Home</button>
      <button id="plannerBtn" class="btn-nav-item">📅 Planner</button>
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
          <button id="centerAttrBtn" class="center-attr-btn" title="Attributes">📋</button>
          <div id="satchelPanel" class="satchel-panel" aria-label="Consumables"></div>
      </div>
      <div id="buffPanel" class="buff-panel" aria-label="Buffs"></div>
      <div id="runCompletionPanel" class="run-completion-panel" aria-label="Run completion graph">
        <div class="run-completion-drag-handle" id="runCompletionDragHandle"></div>
        <div class="run-completion-head">
          <span>RUN COMPLETION</span>
          <span id="runCompletionRate">0%</span>
        </div>
        <svg id="runCompletionGraph" viewBox="0 0 160 56" preserveAspectRatio="none" aria-hidden="true"></svg>
      </div>
      <div id="eventBannerPanel" class="event-banner-panel" aria-label="Event Banner" style="display: none;">
        <div class="event-banner-drag-handle" id="eventBannerDragHandle"></div>
        <div class="event-banner-content">
          <div id="eventBannerTitle" class="event-banner-title">Event Name</div>
          <div id="eventBannerDesc" class="event-banner-desc">Event description</div>
          <button id="eventBannerClaimBtn" class="btn-action-circle btn-claim-event" disabled>CLAIM</button>
        </div>
      </div>
      <div class="combo-indicator" id="comboIndicator"></div>
    `;
    document.body.appendChild(gameArea);

    const centerGroup = gameArea.querySelector('#gameCenter');
    const handle = gameArea.querySelector('#centerDragHandle');
    let isDragging = false;
    let startX = 0, startY = 0, currentTx = 0, currentTy = 0, initialTx = 0, initialTy = 0;

    const savedPos = localStorage.getItem('nemesis_center_pos');
    if (savedPos) {
      try {
        const { ty } = JSON.parse(savedPos);
        currentTy = ty;
        centerGroup.style.transform = `translate(0px, ${currentTy}px)`;
      } catch (e) { }
    }

    const onDown = (e) => {
      isDragging = true;
      startY = e.clientY;
      initialTy = currentTy;
      handle.setPointerCapture(e.pointerId);
    };

    const onMove = (e) => {
      if (!isDragging) return;
      e.preventDefault();
      const dy = e.clientY - startY;
      currentTy = initialTy + dy;
      centerGroup.style.transform = `translate(0px, ${currentTy}px)`;
    };

    const onUp = (e) => {
      if (!isDragging) return;
      isDragging = false;
      handle.releasePointerCapture(e.pointerId);
      localStorage.setItem('nemesis_center_pos', JSON.stringify({
        tx: 0,
        ty: currentTy
      }));
    };

    if (handle) {
      handle.addEventListener('pointerdown', onDown);
      handle.addEventListener('pointermove', onMove);
      handle.addEventListener('pointerup', onUp);
      handle.addEventListener('pointercancel', onUp);
    }

    const rcPanel = gameArea.querySelector('#runCompletionPanel');
    const rcHandle = gameArea.querySelector('#runCompletionDragHandle');
    let isRcDragging = false;
    let rcStartX = 0, rcStartY = 0, rcInitialLeft = 0, rcInitialTop = 0;

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

    const onRcDown = (e) => {
      isRcDragging = true;
      rcStartX = e.clientX;
      rcStartY = e.clientY;
      const rect = rcPanel.getBoundingClientRect();
      rcInitialLeft = rect.left;
      rcInitialTop = rect.top;
      rcPanel.style.right = 'auto';
      rcPanel.style.bottom = 'auto';
      rcPanel.style.left = rcInitialLeft + 'px';
      rcPanel.style.top = rcInitialTop + 'px';
      rcHandle.setPointerCapture(e.pointerId);
    };

    const onRcMove = (e) => {
      if (!isRcDragging) return;
      e.preventDefault();
      const dx = e.clientX - rcStartX;
      const dy = e.clientY - rcStartY;
      let newLeft = rcInitialLeft + dx;
      let newTop = rcInitialTop + dy;

      const maxX = window.innerWidth - rcPanel.offsetWidth;
      const maxY = window.innerHeight - rcPanel.offsetHeight;
      newLeft = Math.max(0, Math.min(newLeft, maxX));
      newTop = Math.max(0, Math.min(newTop, maxY));

      rcPanel.style.left = newLeft + 'px';
      rcPanel.style.top = newTop + 'px';
    };

    const onRcUp = (e) => {
      if (!isRcDragging) return;
      isRcDragging = false;
      rcHandle.releasePointerCapture(e.pointerId);
      localStorage.setItem('nemesis_run_graph_pos', JSON.stringify({
        left: parseInt(rcPanel.style.left, 10) || 0,
        top: parseInt(rcPanel.style.top, 10) || 0
      }));
    };

    if (rcHandle) {
      rcHandle.addEventListener('pointerdown', onRcDown);
      rcHandle.addEventListener('pointermove', onRcMove);
      rcHandle.addEventListener('pointerup', onRcUp);
      rcHandle.addEventListener('pointercancel', onRcUp);
    }

    const ebPanel = gameArea.querySelector('#eventBannerPanel');
    const ebHandle = gameArea.querySelector('#eventBannerDragHandle');
    let isEbDragging = false;
    let ebStartX = 0, ebStartY = 0, ebInitialLeft = 0, ebInitialTop = 0;

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
      try { ebPanel.setPointerCapture(e.pointerId); } catch (err) {}
    };

    const onEbMove = (e) => {
      if (!isEbDragging) return;
      e.preventDefault();
      const dx = e.clientX - ebStartX;
      const dy = e.clientY - ebStartY;
      let newLeft = ebInitialLeft + dx;
      let newTop = ebInitialTop + dy;

      const maxX = window.innerWidth - ebPanel.offsetWidth;
      const maxY = window.innerHeight - ebPanel.offsetHeight;
      newLeft = Math.max(0, Math.min(newLeft, maxX));
      newTop = Math.max(0, Math.min(newTop, maxY));

      ebPanel.style.left = newLeft + 'px';
      ebPanel.style.top = newTop + 'px';
    };

    const onEbUp = (e) => {
      if (!isEbDragging) return;
      isEbDragging = false;
      try { ebPanel.releasePointerCapture(e.pointerId); } catch (err) {}
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
      if (e.button !== 0) return;

      const rect = ebPanel.getBoundingClientRect();
      // Ignore dragging if click was on or near the bottom-right resizer corner (within 24px)
      if (e.clientX > rect.right - 24 && e.clientY > rect.bottom - 24) {
        return;
      }
      onEbDown(e);
    });
    ebPanel.addEventListener('pointermove', onEbMove);
    ebPanel.addEventListener('pointerup', onEbUp);
    ebPanel.addEventListener('pointercancel', onEbUp);

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
    const leftHandle = document.createElement('button');
    leftHandle.id = 'dailiesTabHandle';
    leftHandle.className = 'tab-handle tab-handle-left';
    leftHandle.textContent = 'DAILIES';
    document.body.appendChild(leftHandle);

    const rightHandle = document.createElement('button');
    rightHandle.id = 'todosTabHandle';
    rightHandle.className = 'tab-handle tab-handle-right';
    rightHandle.textContent = 'TO-DOS';
    document.body.appendChild(rightHandle);

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

    // Right tab - To-Dos
    const rightTab = document.createElement('div');
    rightTab.id = 'todosPanel';
    rightTab.className = 'pull-tab right-tab';
    rightTab.innerHTML = `
      <div class="tab-header">
        <h3>TO-DOS</h3>
        <div>
          <button id="addTodoNoteBtn" class="btn-add btn-toggle btn-toggle-pill btn-toggle-compact">＋ Note</button>
          <button id="todosShowCompletedBtn" class="btn-add btn-toggle btn-toggle-pill btn-toggle-compact" aria-pressed="false">Completed: off</button>
          <button id="todosBulkAddBtn" class="btn-add btn-toggle btn-toggle-pill btn-toggle-compact">＋ Bulk</button>
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

    const shopBtn = document.createElement('button');
    shopBtn.id = 'shopBtn';
    shopBtn.className = 'floating-shop-btn';
    shopBtn.innerHTML = '🛒 SHOP';
    document.body.appendChild(shopBtn);

    const lootboxBtn = document.createElement('button');
    lootboxBtn.id = 'lootboxBtn';
    lootboxBtn.className = 'floating-lootbox-btn';
    const state = getGameState();
    const keys = state?.playerState?.lootboxKeys || 0;
    lootboxBtn.innerHTML = `🎁 LOOTBOX (${keys})`;
    document.body.appendChild(lootboxBtn);

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

  static bindEventListeners() {
    if (this.eventListenersBound) return;
    this.eventListenersBound = true;
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
          this.showPetIcon(detail.targetId, { duration: 900 });

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
          } catch (e) {}
          try { if (window.SoundManager) SoundManager.play('miss'); } catch (e) {}
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
          event.claimed = true;

          try { if (window.SoundManager) SoundManager.play('coin'); } catch (e) {}
          
          if (event.type === 'Statue') {
            const talismans = Object.keys(gs.config.talismans);
            const talisman = talismans[Math.floor(Math.random() * talismans.length)];
            const oldTalismans = gs.playerState.talismans || [];
            if (oldTalismans.length >= 3) {
              if (typeof PopupsManager !== 'undefined' && PopupsManager.showTalismanDiscard) {
                PopupsManager.showTalismanDiscard(talisman);
              }
            } else {
              if (!gs.playerState.talismans) gs.playerState.talismans = [];
              gs.playerState.talismans.push(talisman);
              try { FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2, `Gained ${talisman}`, { color: '#eebbff' }); } catch(err) {}
            }
          } else if (event.type === 'Sacred Tree') {
            gs.playerState.maxHp = (gs.playerState.maxHp || gs.config.baseMaxHp) + 2;
            gs.playerState.maxMana = (gs.playerState.maxMana || gs.config.baseMaxMana) + 2;
            gs.addHp(2);
            gs.addMana(2);
            try { FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2, '+2 Max HP & Mana', { color: '#84cc16' }); } catch(err) {}
          } else if (event.type === 'Shrine') {
            if (typeof PopupsManager !== 'undefined' && PopupsManager.showShrineSkillChoice) {
              PopupsManager.showShrineSkillChoice();
            }
          }

          gs.save();
          this.refreshEventBanner();
          this.refreshGameUI();
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

    document.getElementById('dailiesTabHandle').addEventListener('click', () => this.toggleTaskPanel('dailies'));
    document.getElementById('todosTabHandle').addEventListener('click', () => this.toggleTaskPanel('todos'));
    document.getElementById('dailiesPanel').querySelector('.tab-close').addEventListener('click', () => this.closeTaskPanel('dailies'));
    document.getElementById('todosPanel').querySelector('.tab-close').addEventListener('click', () => this.closeTaskPanel('todos'));
    document.getElementById('addDailyNoteBtn')?.addEventListener('click', () => this.addDailyNote());
    document.getElementById('addTodoNoteBtn')?.addEventListener('click', () => this.addTodoNote());
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
    const panel = document.getElementById(which === 'dailies' ? 'dailiesPanel' : 'todosPanel');
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
          } else {
            this.scheduleUpdateDailiesList();
          }
          // Force re-position in case sizes changed during the transition
          if (which === 'todos') this.positionTodoCards();
          else this.positionDailyCards();
        } catch (e) { /* ignore */ }
      }, 260);
    }
  }

  static closeTaskPanel(which) {
    const panel = document.getElementById(which === 'dailies' ? 'dailiesPanel' : 'todosPanel');
    panel?.classList.remove('open');
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
              card.style.transition = 'transform 220ms ease, opacity 400ms ease';
              card.style.transform = 'scale(1.04)';

              // Show reward popup numbers
              if (res.rewards && res.rewards.ap) {
                UIManager.showDailyApReward(card, res.rewards.ap);
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
                if (!TaskManager.completeTodo(taskId)) return;

                if (typeof RetroTaskCompleteAnimation !== 'undefined') {
                  RetroTaskCompleteAnimation.play(card);
                }

                this.updateTodosList();
                try { state.save(); } catch (e) { }
                this.renderEnemies();
              });
            } catch (e) {
              // Fallback to immediate complete if PopupsManager unavailable
              if (!TaskManager.completeTodo(taskId)) return;
              this.updateTodosList();
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

    if (!Array.isArray(state.systemState.diamondRewards)) {
      state.systemState.diamondRewards = [];
    }

    const renderRewards = () => {
      const list = popup.querySelector('#diamondRewardList');
      if (!list) return;

      const rewards = state.systemState.diamondRewards;
      if (!rewards.length) {
        list.innerHTML = '<div class="diamond-reward-empty">No rewards yet. Add one above.</div>';
        return;
      }

      list.innerHTML = rewards.map((reward, index) => `
        <div class="diamond-reward-item" data-index="${index}">
          <div class="diamond-reward-item-main">
            <div class="diamond-reward-item-name">${reward.name}</div>
            <div class="diamond-reward-item-meta">${reward.cost} diamonds</div>
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
          const reward = state.systemState.diamondRewards[index];
          if (!reward) return;

          const cost = Math.max(1, Math.ceil(Number(reward.cost) || 0));
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
          state.systemState.diamondRewards.splice(index, 1);
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

      state.systemState.diamondRewards.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name,
        cost,
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

  static async playCheckInSequence(detail) {
    const steps = Array.isArray(detail?.retaliationSteps) ? detail.retaliationSteps : [];
    const token = ++this.checkInSequenceToken;
    const circle = document.querySelector('.enemy-circle-container');

    if (!steps.length) {
      if (detail?.lateTodoDamage > 0) {
        FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2 - 70, `Late todo damage: ${Math.ceil(detail.lateTodoDamage)}`, { color: UIManager.themeColor('--palette-orange', '#FF4400'), duration: 2200 });
      }
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
        const rect = card.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;

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
        } else {
          FloatingDamageNumber.show(x, y - 10, `-${Math.ceil(step.damage)}`, {
            color: step.isBoss ? UIManager.themeColor('--accent-gold', '#FFB33F') : (step.damage > 0 ? UIManager.themeColor('--danger-red', '#C00707') : UIManager.themeColor('--text-muted', '#aaaaaa')),
            duration: 1600,
            scale: step.isBoss ? 1.3 : 1.1,
            isCrit: step.damage > 0 && step.damage >= 25
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

      if (step.isBoss) {
        FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2 - 150, `BOSS RETALIATION: ${step.name}`, {
          color: '#ffd76a',
          duration: 2200,
          fadeDelay: 1000
        });
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

    if (detail?.lateTodoDamage > 0) {
      FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2 - 70, `Late todo damage: ${Math.ceil(detail.lateTodoDamage)}`, { color: '#ff9a2e', duration: 2200 });
      ScreenEffects.shake(8, 180);
    }

    if (Array.isArray(detail?.incantations) && detail.incantations.length > 0) {
      FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2 - 180, `Nemesis pressure: ${detail.incantations.length}`, { color: '#a15cff', duration: 1800 });
    }

    circle?.classList.remove('checkin-alert');
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
      dailiesBtn.textContent = '✓';
      dailiesBtn.setAttribute('aria-pressed', String(show));
      dailiesBtn.classList.toggle('active', show);
    }

    if (todosBtn) {
      const show = !!state.systemState?.taskListFilters?.showCompletedTodos;
      todosBtn.textContent = '✓';
      todosBtn.setAttribute('aria-pressed', String(show));
      todosBtn.classList.toggle('active', show);
    }

    if (dailiesEditBtn) {
      const editMode = !!state.systemState?.taskListFilters?.editModeDailies;
      dailiesEditBtn.textContent = 'Edit';
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
          FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2 + 30, `-${Math.ceil(result.apCost)} AP`, { color: '#ffd700' });
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
                  const rect = targetCard.getBoundingClientRect();
                  targetX = rect.left + rect.width / 2;
                  targetY = rect.top + rect.height / 2;
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
                
                try { this.renderEnemies(); } catch (e) {}
                try { this.refreshGameUI(); } catch (e) {}
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
            const rect = targetCard.getBoundingClientRect();
            targetX = rect.left + rect.width / 2;
            targetY = rect.top + rect.height / 2;

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
              } catch (e) {}
            } else if (hit.resistanceMatch && typeof RetroResistanceAnimation !== 'undefined') {
              RetroResistanceAnimation.play(targetCard, elementColor);
              try {
                FloatingDamageNumber.show(targetX, targetY - 45, 'RESISTED!', {
                  color: '#888888',
                  duration: 1100,
                  scale: 0.9,
                  fadeDelay: 700
                });
              } catch (e) {}
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
        } catch (e) {}
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
      } catch (e) {}
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
                    const rect = targetCard.getBoundingClientRect();
                    FloatingDamageNumber.show(rect.left + rect.width / 2, rect.top, 'REVERSED & COATED 🧪', { color: '#84cc16', scale: 1.1, duration: 1500 });
                  }
                } catch (e) {}

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
                              const rect = adjCard.getBoundingClientRect();
                              FloatingDamageNumber.show(rect.left + rect.width / 2, rect.top, `-${splashDmg} 💥`, { color: '#ffaa00', scale: 1.2, duration: 1200 });
                            }
                          } catch (e) {}
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
                        } catch (e) {}
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
      try { state.save(); } catch (e) {}
      // Refresh enemies display if AoE killed something
      try { this.renderEnemies(); } catch (e) {}
      try { this.refreshGameUI(); } catch (e) {}
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
      } catch (e) {}

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
            } catch (e) {}
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
        } catch (e) {}
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
    const note = state.addDailyNote ? state.addDailyNote('', {
      x: 14 + (Math.random() * 18),
      y: 14 + (Math.random() * 22)
    }) : null;

    if (!note) return;
    this._focusDailyNoteId = String(note.id);
    this.updateDailiesList();
  }

  static addTodoNote() {
    const state = getGameState();
    const note = state.addTodoNote ? state.addTodoNote('', {
      x: 14 + (Math.random() * 18),
      y: 14 + (Math.random() * 22)
    }) : null;

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
      FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2 + 30, `-${Math.ceil(result.dodgeCost)} AP`, { color: '#ffd700' });
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
    let currentTargetEnemyId = null;
    let hasDraggedPastDeadzone = false;

    const clearHighlights = () => {
      document.querySelectorAll('.enemy-card').forEach(card => {
        card.classList.remove('targeted-attack', 'targeted-skill', 'targeted-dodge');
      });
    };

    const getTargetEnemyByProximity = (pointerX, pointerY) => {
      const state = getGameState();
      const enemies = (state.stageState.enemies || []).filter(e => !e.isDead);
      if (enemies.length === 0) return null;

      const circle = document.querySelector('.enemy-circle-container');
      const rect = circle ? circle.getBoundingClientRect() : { width: 620, height: 620 };
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
          try { if (window.SoundManager) SoundManager.play('miss'); } catch (e) {}
          event.currentTarget.classList.add('shake');
          setTimeout(() => event.currentTarget.classList.remove('shake'), 300);
          return;
        }
      } else if (type === 'dodge') {
        const dodgeCost = Math.ceil(state.playerState.maxAp * state.config.dodgeCost);
        if (state.playerState.ap < dodgeCost) {
          FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2, 'Not enough power', { color: '#ffcc66' });
          try { if (window.SoundManager) SoundManager.play('miss'); } catch (e) {}
          event.currentTarget.classList.add('shake');
          setTimeout(() => event.currentTarget.classList.remove('shake'), 300);
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
          try { if (window.SoundManager) SoundManager.play('miss'); } catch (e) {}
          event.currentTarget.classList.add('shake');
          setTimeout(() => event.currentTarget.classList.remove('shake'), 300);
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
      const circleRect = circle.getBoundingClientRect();
      circleCenterX = circleRect.width / 2;
      circleCenterY = circleRect.height / 2;

      const btnRect = event.currentTarget.getBoundingClientRect();
      buttonCenterX = btnRect.left - circleRect.left + btnRect.width / 2;
      buttonCenterY = btnRect.top - circleRect.top + btnRect.height / 2;

      const hasAlchemist = className === 'Alchemist' || (state.playerState.borrowedSkills && state.playerState.borrowedSkills.includes('Alchemist'));
      const isTargetingSkill = (type === 'skill' && hasAlchemist);

      if (type === 'attack' || type === 'dodge' || isTargetingSkill) {
        event.currentTarget.setPointerCapture(activePointerId);
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
        const circle = document.querySelector('.enemy-circle-container');
        if (!circle) return;
        const circleRect = circle.getBoundingClientRect();
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

      if (dragType === 'attack' || dragType === 'dodge' || isTargetingSkill) {
        try { event.currentTarget.releasePointerCapture(activePointerId); } catch (e) {}
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
                try { if (window.SoundManager) SoundManager.play('miss'); } catch (e) {}
              } else {
                const dodgeCost = Math.ceil(state.playerState.maxAp * state.config.dodgeCost);
                state.spendAp(dodgeCost);
                FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2 + 30, `-${dodgeCost} AP`, { color: '#ffd700' });

                state.combatState.dodgeTarget = [...new Set([...currentDodges, enemy.id])];
                FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2, 'Dodge Ready!', { color: '#44ff44' });

                try {
                  const card = document.querySelector(`.enemy-card[data-enemy-id="${enemy.id}"]`);
                  if (card && typeof DodgeTetherAnimation !== 'undefined') {
                    const circle = document.querySelector('.enemy-circle-container');
                    const circleRect = circle.getBoundingClientRect();
                    const sx = circleRect.left + buttonCenterX;
                    const sy = circleRect.top + buttonCenterY;
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
              try { if (window.SoundManager) SoundManager.play('miss'); } catch (e) {}
            } else {
              const dodgeCost = Math.ceil(state.playerState.maxAp * state.config.dodgeCost);
              state.spendAp(dodgeCost);
              FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2 + 30, `-${dodgeCost} AP`, { color: '#ffd700' });

              state.combatState.dodgeTarget = [...new Set([...currentDodges, target.id])];
              FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2, 'Dodge Ready!', { color: '#44ff44' });

              try {
                const card = document.querySelector(`.enemy-card[data-enemy-id="${target.id}"]`);
                if (card && typeof DodgeTetherAnimation !== 'undefined') {
                  const circle = document.querySelector('.enemy-circle-container');
                  const circleRect = circle.getBoundingClientRect();
                  const sx = circleRect.left + buttonCenterX;
                  const sy = circleRect.top + buttonCenterY;
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
    }
  }

  static updateDailiesList() {
    const dailies = TaskManager.getAllDailies();
    const container = document.getElementById('dailiesList');

    if (!container) return;

    const showCompleted = !!getGameState().systemState?.taskListFilters?.showCompletedDailies;
    const visibleDailies = showCompleted ? dailies : dailies.filter(daily => !daily.completed);
    const summaryEl = document.getElementById('dailiesSummary');
    if (summaryEl) {
      const completedCount = dailies.filter(daily => daily.completed).length;
      summaryEl.textContent = `${completedCount}/${dailies.length} complete`;
    }

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
      const streak = computeDailyStreak(daily.id);
      const maxCompletions = Math.max(1, Number(daily.maxCompletionsPerDay) || 1);
      const completionsToday = Math.max(0, Number(daily.completionsToday) || 0);
      const remainingCompletions = Math.max(0, maxCompletions - completionsToday);
      const opacity = daily.completed
        ? (showCompleted ? 0.38 : 0)
        : (maxCompletions > 1 ? Math.max(0.5, remainingCompletions / maxCompletions) : 1);
      const sizeScale = Math.max(0.5, Number(daily.size) || 1);
      const attributeColor = getAttributeColor(daily.attribute);
      const textColor = getTextColorForHex(attributeColor);
      const streakClass = streak > 0 ? 'is-positive' : streak < 0 ? 'is-negative' : 'is-neutral';
      const strokeWidth = Math.min(6, 1 + Math.abs(streak));
      const progressText = `${completionsToday}/${maxCompletions}`;
      const completedVisibleClass = daily.completed && showCompleted ? 'is-completed-visible' : '';
      const eventTargetClass = eventTargets.includes(daily.id) ? 'task-event-target' : '';

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

      html += '<div class="task-daily-streak-badge ' + streakClass + '" data-daily-id="' + daily.id + '" title="Streak">' + streak + '</div>';
      html += '<div class="shape-task shape-' + this.shapeClassForDifficulty(daily.difficulty) + ' task-clickable task-card-daily ' + eventTargetClass + ' ' + (daily.completed ? 'completed ' + completedVisibleClass : '') + (daily.bloodOathActive ? ' blood-oath-active' : '') + '" data-id="' + daily.id + '" data-type="daily" data-size-scale="' + sizeScale + '" tabindex="0" data-attribute="' + (daily.attribute || '') + '" data-difficulty="' + (daily.difficulty || '') + '" style="--task-accent:' + attributeColor + ';--task-accent-strong:' + shadeColor(attributeColor, -20) + ';--task-ink:' + textColor + ';opacity:' + opacity + ';border-width:' + strokeWidth + 'px;transform:scale(' + sizeScale + ');transform-origin:top left;touch-action:none;">';
      html += '<div class="hold-progress-overlay"></div>';
      html += '<div class="task-shape-difficulty">' + (daily.difficulty || '') + '</div>';
      html += '<div class="task-shape-name">' + (daily.name || '') + '</div>';
      html += '<div class="task-shape-attr">' + (daily.attribute || '') + '</div>';
      html += '<div class="task-shape-progress">' + progressText + '</div>';
      if (surplusIndicator) html += surplusIndicator;
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
    return {
      x: Math.max(0, Math.min(maxX, Number(layout?.x) || 0)),
      y: Math.max(0, Math.min(maxY, Number(layout?.y) || 0))
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
    const existingNotes = new Map(Array.from(board.querySelectorAll('.daily-note-card')).map((note) => [String(note.dataset.noteId), note]));
    const activeIds = new Set();

    notes.forEach((noteData, index) => {
      if (!noteData) return;
      const noteId = String(noteData.id);
      activeIds.add(noteId);

      let noteEl = existingNotes.get(noteId);
      if (!noteEl) {
        noteEl = document.createElement('div');
        noteEl.className = 'daily-note-card';
        noteEl.dataset.noteId = noteId;
        noteEl.innerHTML = `
          <button class="daily-note-delete" type="button" aria-label="Delete note">✕</button>
          <div class="daily-note-text" contenteditable="false" spellcheck="false"></div>
        `;
        board.appendChild(noteEl);
      }

      noteEl.style.left = `${Number.isFinite(Number(noteData.x)) ? Number(noteData.x) : 12}%`;
      noteEl.style.top = `${Number.isFinite(Number(noteData.y)) ? Number(noteData.y) : 12}%`;
      noteEl.style.zIndex = String(40 + index);

      if (!noteEl.dataset.bound) {
        noteEl.dataset.bound = '1';

        const deleteBtn = noteEl.querySelector('.daily-note-delete');
        if (deleteBtn) {
          deleteBtn.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            state.removeDailyNote?.(noteId);
            this.renderDailyNotes();
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
          if (event.target.closest('button')) return;
          if (event.button !== 0) return;

          const textEl = noteEl.querySelector('.daily-note-text');
          // Always prevent default so the browser never starts text-selection during a long press
          event.preventDefault();

          let isLongPressed = false;
          const startX = event.clientX;
          const startY = event.clientY;

          try { noteEl.setPointerCapture(event.pointerId); } catch (error) { }

          const timer = setTimeout(() => {
            isLongPressed = true;
            if (textEl && noteEl.classList.contains('editing')) {
              textEl.blur(); // blur listener disables contenteditable and removes .editing
            }

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

            noteEl.classList.add('dragging');
            noteEl.dataset.dragState = JSON.stringify(dragState);
          }, 500);

          const onMove = (moveEvent) => {
            if (moveEvent.pointerId !== event.pointerId) return;
            if (moveEvent.clientX === 0 && moveEvent.clientY === 0) return;
            if (!isLongPressed) {
              const dist = Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY);
              if (dist > 10) {
                clearTimeout(timer);
                cleanup();
              }
              return;
            }

            const stateRaw = noteEl.dataset.dragState;
            if (!stateRaw) return;
            const current = JSON.parse(stateRaw);
            const boardNow = board.getBoundingClientRect();
            const halfWidth = current.noteWidth / 2;
            const halfHeight = current.noteHeight / 2;
            const nextLeftPx = Math.max(halfWidth, Math.min(boardNow.width - halfWidth, moveEvent.clientX - boardNow.left - current.offsetX));
            const nextTopPx = Math.max(halfHeight, Math.min(boardNow.height - halfHeight, moveEvent.clientY - boardNow.top - current.offsetY));
            
            current.moved = true;
            current.nextX = (nextLeftPx / Math.max(1, boardNow.width)) * 100;
            current.nextY = (nextTopPx / Math.max(1, boardNow.height)) * 100;
            noteEl.style.left = `${current.nextX}%`;
            noteEl.style.top = `${current.nextY}%`;
            noteEl.dataset.dragState = JSON.stringify(current);
          };

          const onUp = (upEvent) => {
            if (upEvent.pointerId !== event.pointerId) return;
            clearTimeout(timer);
            cleanup();

            if (isLongPressed) {
              const stateRaw = noteEl.dataset.dragState;
              if (!stateRaw) return;
              const current = JSON.parse(stateRaw);

              noteEl.classList.remove('dragging');
              noteEl.removeAttribute('data-drag-state');

              if (current.moved) {
                state.moveDailyNote?.(noteId, { x: current.nextX, y: current.nextY });
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
                  } catch (err) {}
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
        noteEl.className = 'todo-note-card';
        noteEl.dataset.noteId = noteId;
        noteEl.innerHTML = `
          <button class="todo-note-delete" type="button" aria-label="Delete note">✕</button>
          <div class="todo-note-text" contenteditable="false" spellcheck="false"></div>
        `;
        board.appendChild(noteEl);
      }

      noteEl.style.left = `${Number.isFinite(Number(noteData.x)) ? Number(noteData.x) : 12}%`;
      noteEl.style.top = `${Number.isFinite(Number(noteData.y)) ? Number(noteData.y) : 12}%`;
      noteEl.style.zIndex = String(40 + index);

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

        noteEl.addEventListener('pointerdown', (event) => {
          if (event.target.closest('.todo-note-delete')) return;
          if (event.target.closest('button')) return;
          if (event.button !== 0) return;

          const textEl = noteEl.querySelector('.todo-note-text');
          // Always prevent default so the browser never starts text-selection during a long press
          event.preventDefault();

          let isLongPressed = false;
          const startX = event.clientX;
          const startY = event.clientY;

          try { noteEl.setPointerCapture(event.pointerId); } catch (error) { }

          const timer = setTimeout(() => {
            isLongPressed = true;
            if (textEl && noteEl.classList.contains('editing')) {
              textEl.blur(); // blur listener disables contenteditable and removes .editing
            }

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

            noteEl.classList.add('dragging');
            noteEl.dataset.dragState = JSON.stringify(dragState);
          }, 500);

          const onMove = (moveEvent) => {
            if (moveEvent.pointerId !== event.pointerId) return;
            if (moveEvent.clientX === 0 && moveEvent.clientY === 0) return;
            if (!isLongPressed) {
              const dist = Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY);
              if (dist > 10) {
                clearTimeout(timer);
                cleanup();
              }
              return;
            }

            const stateRaw = noteEl.dataset.dragState;
            if (!stateRaw) return;
            const current = JSON.parse(stateRaw);
            const boardNow = board.getBoundingClientRect();
            const nextLeftPx = Math.max(0, Math.min(boardNow.width - current.noteWidth, moveEvent.clientX - boardNow.left - current.offsetX));
            const nextTopPx = Math.max(0, Math.min(boardNow.height - current.noteHeight, moveEvent.clientY - boardNow.top - current.offsetY));
            
            current.moved = true;
            current.nextX = (nextLeftPx / Math.max(1, boardNow.width)) * 100;
            current.nextY = (nextTopPx / Math.max(1, boardNow.height)) * 100;
            noteEl.style.left = `${current.nextX}%`;
            noteEl.style.top = `${current.nextY}%`;
            noteEl.dataset.dragState = JSON.stringify(current);
          };

          const onUp = (upEvent) => {
            if (upEvent.pointerId !== event.pointerId) return;
            clearTimeout(timer);
            cleanup();

            if (isLongPressed) {
              const stateRaw = noteEl.dataset.dragState;
              if (!stateRaw) return;
              const current = JSON.parse(stateRaw);

              noteEl.classList.remove('dragging');
              noteEl.removeAttribute('data-drag-state');

              if (current.moved) {
                state.moveTodoNote?.(noteId, { x: current.nextX, y: current.nextY });
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
                  } catch (err) {}
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

      const textEl = noteEl.querySelector('.todo-note-text');
      if (textEl) {
        const nextText = String(noteData.text || '');
        if (textEl.textContent !== nextText && document.activeElement !== textEl) {
          textEl.textContent = nextText;
        }

        if (String(this._focusTodoNoteId || '') === noteId) {
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
          const editModeDailies = !!getGameState().systemState?.taskListFilters?.editModeDailies;
          if (!editModeDailies) {
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
          }
          card.dataset.holdCompleted = '1';
        }
      }, 600);
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
          clearTimeout(this.dailyHoldTimer);
          const overlay = dragState.card.querySelector('.hold-progress-overlay');
          if (overlay) {
            overlay.style.transition = 'none';
            overlay.style.width = '0%';
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
    return {
      x: Math.max(minX, Math.min(maxX, Number(layout?.x) || 0)),
      y: Math.max(minY, Math.min(maxY, Number(layout?.y) || 0))
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

        const timer = setTimeout(() => {
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
              clearTimeout(timer);
              cleanup();
            }
          }
        };

        const onUp = (upEvent) => {
          if (upEvent.pointerId !== event.pointerId) return;
          clearTimeout(timer);
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

                this.updateTodosList();
                try { state.save(); } catch (e) { }
                this.renderEnemies();
              });
            } catch (e) {
              if (TaskManager.completeTodo(todoId)) {
                this.updateTodosList();
                try { state.save(); } catch (err) { }
                this.renderEnemies();
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
    const visibleTodos = todos.filter(todo => {
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
                <div class="todo-date-big" style="font-size: 11px; color: #fff0b8; font-family: 'Press Start 2P', monospace; font-weight: bold;">${deadlineLabel}</div>
                <div class="todo-date-subtext" style="font-size: 6px; color: var(--text-muted); font-family: 'Press Start 2P', monospace;">${deadlineDistance}</div>
              </div>
              <div class="cluster-badge" style="font-size: 6px; color: #a04ef6; font-family: 'Press Start 2P', monospace; font-weight: bold; text-transform: lowercase;">${attrTexts.join(', ')}</div>
            </div>
          `;
        }
      } else if (todo.deadline && !todo.completed) {
        const deadlineLabel = new Date(todo.deadline).toLocaleDateString();
        const deadlineDistance = this.getDeadlineDistanceText(todo.deadline);
        clusterHeader = `
          <div class="todo-cluster-header-outside" style="position: absolute; bottom: 100%; left: 0; width: 100%; padding-bottom: 6px; pointer-events: none; display: flex; flex-direction: column; gap: 2px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-end; width: 100%; margin-bottom: 2px;">
              <div class="todo-date-big" style="font-size: 11px; color: #fff0b8; font-family: 'Press Start 2P', monospace; font-weight: bold;">${deadlineLabel}</div>
              <div class="todo-date-subtext" style="font-size: 6px; color: var(--text-muted); font-family: 'Press Start 2P', monospace;">${deadlineDistance}</div>
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
          <label class="subtask-label"><input type="checkbox" class="subtask-checkbox" data-subtask-id="${st.id}" ${st.completed ? 'checked' : ''}> <span class="subtask-name">${st.name}</span></label>
          <button class="subtask-remove" data-subtask-id="${st.id}" title="Remove subtask">×</button>
        </div>
      `).join('');
      const subtaskCount = (todo.subtasks || []).length;

      // Border and color configurations
      const isCluster = todo.clusterId && !todo.completed;
      const borderStyle = isCluster
        ? 'border-color: #6a0dad !important; --cluster-color: #6a0dad; box-shadow: 0 4px 12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05), 0 0 6px rgba(106,13,173,0.5) !important;'
        : `border-color: ${palette[todo.attribute] || '#555'} !important; --task-accent: ${palette[todo.attribute] || '#555'}; box-shadow: 0 4px 12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05), 0 0 6px ${(palette[todo.attribute] || '#555')}44 !important;`;

      const shapeClass = this.shapeClassForDifficulty(todo.difficulty);

      return `
      <div class="task-card task-clickable task-card-todo discreet ${todo.completed ? 'completed' : ''}" data-id="${todo.id}" data-type="todo" tabindex="0" ${todo.clusterId ? `data-cluster-id="${todo.clusterId}" data-cluster-index="${todo.clusterIndex}"` : ''} style="${borderStyle}">
        
        ${clusterHeader}

        <!-- Floating difficulty shape next to the card -->
        <div class="todo-difficulty-shape shape-${shapeClass}" title="Difficulty: ${todo.difficulty}"></div>
        
        <div class="todo-card-top" style="gap: 4px;">
          <div class="task-title todo-title">${displayName}</div>
        </div>

        <div class="todo-card-body" style="margin-top: 2px;">
          ${subtaskCount > 0 ? `
            <div class="todo-subtasks-wrap" style="margin-top: 4px;">
              <div class="todo-subtask-label" style="font-size: 6px; color: var(--text-muted); font-family: 'Press Start 2P', monospace; margin-bottom: 4px;">${subtaskCount} subtasks</div>
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
    let firstUnseenEnemyName = null;

    enemies.forEach((enemy, index) => {
      const enemyId = String(enemy.id);
      activeEnemyIds.add(enemyId);

      const { ringLevel, ringIndex, totalInRing } = this.getRingInfo(index, enemies.length);
      const currentRadius = ringLevel === 0 ? (radius + 30) : (radius - 45 - (ringLevel - 1) * 70);

      const angle = (Math.PI * 2 * ringIndex) / totalInRing - Math.PI / 2;
      const x = centerX + Math.cos(angle) * currentRadius;
      const y = centerY + Math.sin(angle) * currentRadius;

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

      if (!enemy?.isBoss && enemy?.name) {
        if (!state.systemState.runSeenEnemies) state.systemState.runSeenEnemies = {};
        if (!state.systemState.runSeenEnemies[enemy.name] && !firstUnseenEnemyName) {
          firstUnseenEnemyName = enemy.name;
        }
      }
    });

    if (firstUnseenEnemyName && !document.querySelector('.dialogue-card')) {
      try {
        const shown = PopupsManager.showConfiguredDialogue('enemyFirstSeen', {
          title: 'First Encounter',
          text: `text\n${firstUnseenEnemyName}`
        }, `enemyFirstSeen:${firstUnseenEnemyName}`);
        if (shown) {
          state.systemState.runSeenEnemies[firstUnseenEnemyName] = true;
          try { state.save(); } catch (e) { }
        }
      } catch (e) { }
    }

    existingCards.forEach((card, enemyId) => {
      if (!activeEnemyIds.has(enemyId)) {
        card.remove();
      }
    });

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
    const { enemy, x, y, isTargeted, isDodgeReady, showDodgeMarker, showPetBadge, petEmoji } = data;
    const hpPercent = enemy.maxHp ? Math.max(0, (enemy.hp / enemy.maxHp) * 100) : 0;
    const resistColor = this.getEnemyElementColor(enemy?.resist);
    const weakColor = this.getEnemyElementColor(enemy?.weak);

    card.style.left = x + 'px';
    card.style.top = y + 'px';
    card.style.setProperty('--enemy-resist-color', resistColor);
    card.style.setProperty('--enemy-weak-color', weakColor);

    card.classList.toggle('dead', !!enemy.isDead);
    card.classList.toggle('elite', !!enemy.isElite);
    card.classList.toggle('targeted', !!isTargeted);
    card.classList.toggle('dodge-ready', !!isDodgeReady);

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
    if (enemy?.isBoss) return '👑';
    const name = (enemy?.name || '').toLowerCase();
    const archetype = (enemy?.archetype || '').toLowerCase();
    if (name.includes('wolf')) return '🐺';
    if (name.includes('goblin')) return '👺';
    if (name.includes('scorpion') || name.includes('spider') || name.includes('leech') || name.includes('termite')) return '🪲';
    if (name.includes('dragon') || name.includes('wyvern') || name.includes('drake') || name.includes('wyrm') || name.includes('hydra')) return '🐉';
    if (name.includes('ghost') || name.includes('soul') || archetype === 'mana drain') return '👻';
    if (name.includes('knight') || name.includes('paladin') || name.includes('guardian')) return '🛡️';
    if (name.includes('mage') || name.includes('wizard') || name.includes('computer') || name.includes('watcher')) return '✨';
    if (archetype === 'protector') return '🛡️';
    if (archetype === 'healer') return '💚';
    return '☠️';
  }

  static updateWeaponIcons() {
    const strip = document.getElementById('weaponStrip');
    if (!strip) return;

    const state = getGameState();
    let html = `<div class="weapon-drag-handle" id="weaponDragHandle"></div>`;
    html += (state.playerState.weapons || []).map((weaponName, index) => {
      const activeClass = (index === state.playerState.activeWeapon) ? 'active' : '';
      const weaponElement = state.playerState.weaponElements?.[index] || '';
      const weaponLabel = weaponElement ? `${weaponName} · ${weaponElement}` : weaponName;
      if (!weaponName) {
        return `<div class="weapon-chip-wrap"><button class="weapon-chip empty" disabled>—</button></div>`;
      }

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
    const handle = strip.querySelector('#weaponDragHandle');
    let isDragging = false;
    let startX = 0, startY = 0, initialLeft = 0, initialTop = 0;

    const onPointerDown = (e) => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const rect = container.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;
      container.style.right = 'auto';
      container.style.bottom = 'auto';
      container.style.left = initialLeft + 'px';
      container.style.top = initialTop + 'px';
      handle.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e) => {
      if (!isDragging) return;
      e.preventDefault();
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      let newLeft = initialLeft + dx;
      let newTop = initialTop + dy;

      const maxX = window.innerWidth - container.offsetWidth;
      const maxY = window.innerHeight - container.offsetHeight;
      newLeft = Math.max(0, Math.min(newLeft, maxX));
      newTop = Math.max(0, Math.min(newTop, maxY));

      container.style.left = newLeft + 'px';
      container.style.top = newTop + 'px';
    };

    const onPointerUp = (e) => {
      if (!isDragging) return;
      isDragging = false;
      handle.releasePointerCapture(e.pointerId);
      localStorage.setItem('nemesis_weapon_pos', JSON.stringify({
        left: parseInt(container.style.left, 10) || 0,
        top: parseInt(container.style.top, 10) || 0
      }));
    };

    if (handle) {
      handle.addEventListener('pointerdown', onPointerDown);
      handle.addEventListener('pointermove', onPointerMove);
      handle.addEventListener('pointerup', onPointerUp);
      handle.addEventListener('pointercancel', onPointerUp);
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

    // Discard Talisman button
    strip.querySelectorAll('.talisman-chip').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const talisman = e.currentTarget.dataset.talisman;
        const index = Array.from(strip.querySelectorAll('.talisman-chip')).indexOf(e.currentTarget);
        if (confirm(`Discard ${talisman}? This frees up a slot for a new Talisman.`)) {
          const state = getGameState();
          if (state.playerState.talismans) {
            state.playerState.talismans.splice(index, 1);
            state.save();
            this.refreshGameUI();
          }
        }
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
    const dodgeCost = Math.ceil(state.playerState.maxAp * state.config.dodgeCost);
    const attackText = document.getElementById('attackCostText');
    const dodgeText = document.getElementById('dodgeCostText');
    if (attackText) attackText.textContent = attackCost ? `(${attackCost} AP)` : '';
    if (dodgeText) dodgeText.textContent = `(${dodgeCost} AP)`;
  }

  static updateDateDisplay() {
    const el = document.getElementById('dateDisplay');
    if (!el) return;

    const now = new Date();
    const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
    const dateStr = now.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
    el.innerHTML = `<div>${dayName}</div><div>${dateStr}</div>`;
  }

  static refreshGameUI() {
    this.updateStageBackdrop();
    this.updateWeaponIcons();
    try { this.refreshEventBanner(); } catch (e) { }
    this.updateDateDisplay();
    this.renderEnemies();
    this.updateRunCompletionGraph();
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
        // Avoid redundant DOM writes by checking current content first.
        if (el.textContent !== level) el.textContent = level;
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
    } catch (e) {
      console.warn('refreshGameUI: failed to sync resources', e);
    }
    this.scheduleUpdateDailiesList();
    this.updateTodosList();
    this.updateDeathDefianceBadge();
    this.updatePauseBtn();
    this.updateTaskVisibilityToggleLabels();
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
  
  static updateTaskVisibilityToggleLabels() {
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
    gameArea.style.setProperty('--stage-bg-image', `url("${backdrop.src}")`);
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
    if (!panel || !graph || !rateEl) return;

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
    const layer = document.getElementById('enemyLayer');
    if (!layer) return;
    const card = layer.querySelector(`.enemy-card[data-enemy-id="${enemyId}"]`);
    if (!card) return;

    // Create floating icon attached to body so it survives enemy re-renders
    const icon = document.createElement('div');
    icon.className = 'pet-icon';
    const state = getGameState();
    const petEmoji = (state.playerState && state.playerState.petEmoji) ? state.playerState.petEmoji : '🐶';
    icon.textContent = petEmoji;
    icon.style.pointerEvents = 'none';
    icon.style.position = 'fixed';

    // Compute position based on enemy card rect
    const rect = card.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top - 14; // slightly above card
    icon.style.left = `${x}px`;
    icon.style.top = `${y}px`;
    icon.style.transform = 'translateX(-50%)';

    document.body.appendChild(icon);

    const duration = options.duration || 900;
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
      <div class="satchel-drag-handle" id="satchelDragHandle"></div>
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
    const handle = panel.querySelector('#satchelDragHandle');
    let isDragging = false;
    let startX = 0, startY = 0, initialLeft = 0, initialTop = 0;

    const onPointerDown = (e) => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const rect = panel.getBoundingClientRect();
      initialLeft = rect.left;
      initialTop = rect.top;
      panel.style.right = 'auto';
      panel.style.bottom = 'auto';
      panel.style.left = initialLeft + 'px';
      panel.style.top = initialTop + 'px';
      handle.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e) => {
      if (!isDragging) return;
      e.preventDefault();
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      let newLeft = initialLeft + dx;
      let newTop = initialTop + dy;

      const maxX = window.innerWidth - panel.offsetWidth;
      const maxY = window.innerHeight - panel.offsetHeight;
      newLeft = Math.max(0, Math.min(newLeft, maxX));
      newTop = Math.max(0, Math.min(newTop, maxY));

      panel.style.left = newLeft + 'px';
      panel.style.top = newTop + 'px';
    };

    const onPointerUp = (e) => {
      if (!isDragging) return;
      isDragging = false;
      handle.releasePointerCapture(e.pointerId);
      localStorage.setItem('nemesis_satchel_pos', JSON.stringify({
        left: parseInt(panel.style.left, 10) || 0,
        top: parseInt(panel.style.top, 10) || 0
      }));
    };

    if (handle) {
      handle.addEventListener('pointerdown', onPointerDown);
      handle.addEventListener('pointermove', onPointerMove);
      handle.addEventListener('pointerup', onPointerUp);
      handle.addEventListener('pointercancel', onPointerUp);
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
