/**
 * NEMESIS ROGUELIKE — UI SYSTEM
 * HUD, enemy circle, spinner, buttons, pull-tabs
 */

class UIManager {
  static checkInSequenceToken = 0;
  static resizeScheduled = false;
  static spinnerFrameId = null;
  static spinnerAngle = 0;
  static spinnerLastFrameAt = 0;
  static queuedAttackTargetId = null;
  static queuedAttackCount = 0;
  static dailyDragState = null;
  static dailyDragSuppressUntil = 0;
  static todoDragState = null;
  static todoDragSuppressUntil = 0;
  static _dailyHistoryCache = {};
  static _updateDailiesTimer = null;

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
    rallyist: { icon: '📣', color: '#FFB84D', label: 'Rallyist', desc: 'Doubles allies\' max HP (on gain)' },
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
    } catch (e) {}
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
    if (spinner && spinner.classList.contains('dodge-active')) {
      return 333;
    }

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
    if (this.spinnerFrameId !== null) return;

    const tick = (now) => {
      const spinner = this.getSpinnerElement();
      if (spinner) {
        if (!this.spinnerLastFrameAt) this.spinnerLastFrameAt = now;
        const delta = Math.max(0, now - this.spinnerLastFrameAt);
        this.spinnerLastFrameAt = now;

        const speedMs = this.getSpinnerSpeedMs();
        const degreesPerMs = 360 / Math.max(120, speedMs);
        this.spinnerAngle = (this.spinnerAngle + delta * degreesPerMs) % 360;
        spinner.style.transform = `translate(-50%, -50%) rotate(${this.spinnerAngle}deg)`;
      } else {
        this.spinnerLastFrameAt = now;
      }

      this.spinnerFrameId = requestAnimationFrame(tick);
    };

    this.spinnerLastFrameAt = 0;
    this.spinnerFrameId = requestAnimationFrame(tick);
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
    this.createHeadbar();
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
    const headbar = document.querySelector('.headbar');
    const gameArea = document.getElementById('gameArea');
    if (!headbar || !gameArea) return;
    const h = headbar.offsetHeight;
    document.documentElement.style.setProperty('--headbar-height', `${h}px`);
    // Position game area below the headbar and adjust available height
    gameArea.style.top = h + 'px';
    gameArea.style.height = `calc(100% - ${h}px - 60px)`;
  }
  
  static createHeadbar() {
    const headbar = document.createElement('div');
    headbar.id = 'headbar';
    headbar.className = 'headbar';
    headbar.innerHTML = `
      <div class="headbar-left">
        <button id="homeBtn" class="btn-icon">🏠</button>
        <button id="plannerBtn" class="btn-icon">📅</button>
        <button id="shopBtn" class="btn-icon">🛒</button>
        <button id="diamondRewardsBtn" class="btn-icon diamond-rewards-btn" title="Diamond Rewards">💎+</button>
        <button id="checkInBtn" class="btn-icon">✅</button>
        <button id="pauseBtn" class="btn-icon">⏸️</button>
      </div>
      <div class="headbar-center">
        <div class="resource-bar">
          <div class="resource">
            <div class="bar hp-bar"><div id="hpFill" class="fill" style="width: 100%"></div></div>
            <div class="resource-overlay"><label>HP</label><span id="hpValue">100</span>/<span id="hpMax">100</span></div>
          </div>
          <div class="resource">
            <div class="bar mana-bar"><div id="manaFill" class="fill" style="width: 100%"></div></div>
            <div class="resource-overlay"><label>Mana</label><span id="manaValue">0</span>/<span id="manaMax">0</span></div>
          </div>
          <div class="resource">
            <div class="bar ap-bar"><div id="apFill" class="fill" style="width: 100%"></div></div>
            <div class="resource-overlay"><label>AP</label><span id="apValue">0</span>/<span id="apMax">0</span></div>
          </div>
        </div>
      </div>
      <div class="headbar-right">
        <div id="deathDefianceBadge" class="death-defiance-badge">DEFIANCE READY</div>
        <div class="currency">
          <span>💰 <span id="goldValue">0</span></span>
          <span>💎 <span id="diamondValue">0</span></span>
        </div>
      </div>
    `;
    document.body.appendChild(headbar);
  }
  
  static createGameArea() {
    const gameArea = document.createElement('div');
    gameArea.id = 'gameArea';
    gameArea.className = 'game-area';
    gameArea.innerHTML = `
      <div class="stage-date-wrap">
        <div id="dateDisplay" class="date-display stage-date"></div>
      </div>
      <div class="game-top-left">
        <div id="weaponStrip" class="weapon-strip"></div>
      </div>
      <div class="game-center">
        <div class="enemy-circle-container">
          <div id="levelIndicator" class="level-indicator"></div>
          <canvas id="enemyCanvas" class="enemy-canvas"></canvas>
          <div id="enemyLayer" class="enemy-layer"></div>
          <div id="spinnerContainer" class="spinner-container">
            <div id="spinner" class="spinner"></div>
          </div>
          <div class="action-ring"></div>
        </div>
          <button id="centerAttrBtn" class="center-attr-btn" title="Attributes">📋</button>
          <div id="satchelPanel" class="satchel-panel" aria-label="Consumables"></div>
      </div>
      <div id="buffPanel" class="buff-panel" aria-label="Buffs"></div>
      <div id="runCompletionPanel" class="run-completion-panel" aria-label="Run completion graph">
        <div class="run-completion-head">
          <span>RUN COMPLETION</span>
          <span id="runCompletionRate">0%</span>
        </div>
        <svg id="runCompletionGraph" viewBox="0 0 160 56" preserveAspectRatio="none" aria-hidden="true"></svg>
      </div>
      <div class="combo-indicator" id="comboIndicator"></div>
    `;
    document.body.appendChild(gameArea);
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
        const x = centerX;
        // place below the circle so it doesn't overlap enemy cards
        const y = centerY + circleRadius + 48; // lowered further so buttons don't crowd cards
        btn.style.left = x + 'px';
        btn.style.top = y + 'px';
      } else if (btn.id === 'dodgeBtn') {
        const x = centerX + circleRadius * 0.72;
        const y = centerY + circleRadius * 0.72;
        btn.style.left = x + 'px';
        btn.style.top = y + 'px';
      } else {
        // distribute other buttons around the lower half of the circle
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
          <button id="todosShowCompletedBtn" class="btn-add btn-toggle btn-toggle-pill btn-toggle-compact" aria-pressed="false">Completed: off</button>
          <button id="todosAddBtn" class="btn-add">＋</button>
          <button class="tab-close">✕</button>
        </div>
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
    } catch (e) {}
    // generate offers once per open so consumables/weapons don't reroll on purchase
    try { if (ShopManager && typeof ShopManager.generateShopOffers === 'function') ShopManager.generateShopOffers(); } catch (e) {}
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
        try { PopupsManager.showShopItemDetails(itemData); } catch (e) {}
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
            </div>
            <div class="shop-item-price">${String(price || 0)}</div>
          `;
          smithList.appendChild(row);

          const buyWeapon = () => {
            try {
              if (typeof PopupsManager !== 'undefined' && PopupsManager && typeof PopupsManager.showWeaponElementChoice === 'function') {
                PopupsManager.showWeaponElementChoice(name, (element) => {
                  const res = ShopManager.buyWeapon ? ShopManager.buyWeapon(name, element) : { success: false, reason: 'not_implemented' };
                  console.log('Shop buyWeapon response', name, element, res);
                  if (res && res.success) {
                    FloatingDamageNumber.show(window.innerWidth/2, window.innerHeight/2, `Purchased ${name}`, { color: UIManager.themeColor('--accent-gold', '#FFB33F') });
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
                  FloatingDamageNumber.show(window.innerWidth/2, window.innerHeight/2, msg, { color: UIManager.themeColor('--danger-red', '#C00707') });
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
              </div>
              <div class="shop-item-price">${upgrade.price}</div>
            `;
            smithList.appendChild(upRow);
            const buyUpgrade = () => {
              const res = ShopManager.purchase ? ShopManager.purchase(upgrade.id) : { success: false, reason: 'not_implemented' };
              console.log('Shop purchase upgrade response', upgrade.id, res);
              if (res && res.success) {
                FloatingDamageNumber.show(window.innerWidth/2, window.innerHeight/2, `Purchased ${upgrade.name}`, { color: UIManager.themeColor('--accent-gold', '#FFB33F') });
                this.buildShopItems();
                return true;
              } else {
                const reason = res?.reason || 'unknown';
                let msg = 'Cannot buy';
                if (reason === 'no_gold') msg = 'Not enough gold';
                FloatingDamageNumber.show(window.innerWidth/2, window.innerHeight/2, msg, { color: UIManager.themeColor('--danger-red', '#C00707') });
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
        const consumables = ShopManager.getAvailableConsumables() || [];
        consumables.forEach(name => {
          const price = ShopManager.getConsumablePrice ? ShopManager.getConsumablePrice(name) : 0;
          const row = document.createElement('div');
          row.className = 'shop-item shop-item-tile';
          row.innerHTML = `
            <div class="shop-item-icon">${iconFor(name, iconMap.consumable || '🧪')}</div>
            <div class="shop-item-meta">
              <div class="shop-item-name">${name}</div>
            </div>
            <div class="shop-item-price">${String(price || 0)}</div>
          `;
          shelfList.appendChild(row);

          const buyConsumable = () => {
            const res = ShopManager.buyConsumable ? ShopManager.buyConsumable(name, 1) : { success: false, reason: 'not_implemented' };
            console.log('Shop buyConsumable response', name, res);
            if (res && res.success) {
              FloatingDamageNumber.show(window.innerWidth/2, window.innerHeight/2, `Purchased ${name}`, { color: UIManager.themeColor('--accent-gold', '#FFB33F') });
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
              FloatingDamageNumber.show(window.innerWidth/2, window.innerHeight/2, msg, { color: UIManager.themeColor('--danger-red', '#C00707') });
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
            FloatingDamageNumber.show(window.innerWidth/2, window.innerHeight/2, `Purchased ${item.name}`, { color: UIManager.themeColor('--accent-gold', '#FFB33F') });
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
            FloatingDamageNumber.show(window.innerWidth/2, window.innerHeight/2, msg, { color: UIManager.themeColor('--danger-red', '#C00707') });
          }
        } catch (err) { console.warn('Purchase failed', err); }
      });
    });
  }
  
  static bindEventListeners() {
    const state = getGameState();
    // Initialize sound manager with config
    try {
      if (window.SoundManager) {
        SoundManager.init(state.config.soundEnabled !== false, state.config.soundVolume || 0.6);
      }
    } catch (e) {}
    
    // Resource updates
    state.eventBus.on(EVENTS.HP_CHANGED, (detail) => this.updateHpBar(detail));
    state.eventBus.on(EVENTS.MANA_CHANGED, (detail) => this.updateManaBar(detail));
    state.eventBus.on(EVENTS.AP_CHANGED, (detail) => this.updateApBar(detail));
    state.eventBus.on(EVENTS.GOLD_CHANGED, (detail) => this.updateGoldDisplay(detail));
    state.eventBus.on(EVENTS.DIAMONDS_CHANGED, (detail) => this.updateDiamondDisplay(detail));
    state.eventBus.on(EVENTS.DEATH_DEFIANCE, (detail) => this.updateDeathDefianceBadge(detail));
    state.eventBus.on(EVENTS.GAME_LOAD, () => { this.updateDeathDefianceBadge(); this.updateConsumableStrip && this.updateConsumableStrip(); this.renderBuffPanel && this.renderBuffPanel(); });
    state.eventBus.on(EVENTS.GAME_SAVE, () => { this.updateConsumableStrip && this.updateConsumableStrip(); });
    state.eventBus.on(EVENTS.BUFF_GAINED, (detail) => { try { this.renderBuffPanel && this.renderBuffPanel(); this.onBuffGained && this.onBuffGained(detail); } catch (e) {} });
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
          const today = now.toISOString().slice(0,10); // YYYY-MM-DD
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
      try { this.showFloatingText(detail.enemyId, `+${Math.ceil(detail.amount)} healed`, { color: UIManager.themeColor('--success-green', '#44ff44') }); } catch (e) {}
    });
    state.eventBus.on(EVENTS.ENEMY_REVIVED, (detail) => {
      try { this.showFloatingText(detail.enemyId, 'Revived', { color: UIManager.themeColor('--success-green', '#44ff44'), duration: 2000 }); } catch (e) {}
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
        try { if (window.SoundManager) SoundManager.play('mutator'); else this.playMutatorSound(); } catch (e) {}

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
          } catch (e) {}
        }, 120);

        // Non-checkin sources get a short toast immediately; check-in floating text will be shown in playCheckInSequence
        if (detail?.source !== 'checkin') {
          try {
            const enemy = StageManager.getEnemyById(enemyId);
            const name = enemy?.name || 'Enemy';
            const meta = UIManager.MUTATOR_META[mut] || { icon: '❗', label: mut };
            this.showMutatorToast(`${meta.icon} ${name} gained ${meta.label}`);
          } catch (e) {}
        }
      } catch (e) {}
    });
    state.eventBus.on(EVENTS.ATTACK, (detail) => {
      try {
        if (detail && detail.type === 'dodgeAvoid') {
          this.renderEnemies();
        }
      } catch (e) {}
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
          FloatingDamageNumber.show(rect.left + rect.width/2, rect.top - 18, 'Dodged!', { color: UIManager.themeColor('--success-green', '#44ff44'), duration: 1200 });
          setTimeout(() => { try { card.classList.remove('dodged'); } catch (e) {} }, 1200);
        }
      } catch (e) {}
    });
    // Sound hooks
    try {
      if (window.SoundManager) {
        state.eventBus.on(EVENTS.ATTACK, (detail) => {
          try {
            if (detail && detail.type === 'pet') SoundManager.play('pet');
            else SoundManager.play(detail && detail.isCrit ? 'crit' : 'attack');
          } catch (e) {}
        });

        state.eventBus.on(EVENTS.DAMAGE_TAKEN, (d) => { try { SoundManager.play('hit'); } catch (e) {} });
        state.eventBus.on(EVENTS.KILL_ENEMY, (d) => { try { SoundManager.play('kill'); } catch (e) {} });
        state.eventBus.on(EVENTS.ENEMY_HEALED, (d) => { try { SoundManager.play('heal'); } catch (e) {} });
        state.eventBus.on(EVENTS.ENEMY_REVIVED, (d) => { try { SoundManager.play('revive'); } catch (e) {} });
        state.eventBus.on(EVENTS.GOLD_CHANGED, (d) => { try { SoundManager.play('coin'); } catch (e) {} });
        state.eventBus.on(EVENTS.CHECK_IN, (d) => { try { SoundManager.play('checkin'); } catch (e) {} });
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
            try { SoundManager.play('checkin'); } catch (e) {}
          } catch (e) { }
        });
        state.eventBus.on(EVENTS.DEATH, (d) => { try { SoundManager.play('death'); } catch (e) {} });
      }
    } catch (e) {}
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
    
    // Button handlers
    const attackBtn = document.getElementById('attackBtn');
    if (attackBtn) {
      console.debug('[UI] bindEventListeners: attackBtn found, attaching handlers');
      attackBtn.addEventListener('pointerdown', () => {
        const target = this.getSpinnerTargetEnemy();
        if (target) this.beginAttackSpinner(target.id);
      });
      attackBtn.addEventListener('pointerup', () => this.releaseAttackSpinnerPress());
      attackBtn.addEventListener('pointercancel', () => this.releaseAttackSpinnerPress());
      attackBtn.addEventListener('mouseleave', () => this.releaseAttackSpinnerPress());
      attackBtn.addEventListener('click', () => this.handleAttackClick());
    }
    document.getElementById('skillBtn').addEventListener('click', () => this.handleSkillClick());
    // Dodge button now uses hold/release, see setupDodgeButton()
    document.getElementById('pauseBtn').addEventListener('click', () => this.handlePauseClick());
    document.getElementById('plannerBtn').addEventListener('click', () => window.location.href = 'planner.html');
    document.getElementById('shopBtn').addEventListener('click', () => this.toggleShopPanel());
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
    // add buttons
    const dailiesAdd = document.getElementById('dailiesAddBtn');
    if (dailiesAdd) dailiesAdd.addEventListener('click', () => {
      const created = TaskManager.addDaily('New Daily', 'Easy', getGameState().config.attributes[0], 1);
      if (created) {
        this.scheduleUpdateDailiesList();
        getGameState().save();
      }
    });

    const todosAdd = document.getElementById('todosAddBtn');
    if (todosAdd) todosAdd.addEventListener('click', () => {
      const created = TaskManager.addTodo('', 'Easy', getGameState().config.attributes[0], null, []);
      if (created) {
        this.updateTodosList();
        getGameState().save();
        // Open edit popup so user can set name/deadline/attribute immediately
        try { PopupsManager.showEditTodo(created.id); } catch (e) { /* ignore */ }
      }
    });

    // Center attributes button opens attributes modal
    const centerAttrBtn = document.getElementById('centerAttrBtn');
    if (centerAttrBtn) centerAttrBtn.addEventListener('click', () => {
      try { PopupsManager.showAttributes(); } catch (e) {}
    });

    this.bindTaskInteractions();
    this.updateActionCosts();
    this.positionActionButtons();
    this.setupDodgeButton();

    window.addEventListener('resize', () => {
      if (this.resizeScheduled) return;
      this.resizeScheduled = true;
      requestAnimationFrame(() => {
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
            try { state.save(); } catch (e) {}
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
            try { state.save(); } catch (e) {}
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
            try { state.save(); } catch (e) {}
            this.updateTodosList();
          }
          return;
        }

        const deleteDaily = event.target.closest('.btn-delete-daily');
        if (deleteDaily && taskType === 'daily') {
          const dailyName = card.querySelector('.daily-title')?.textContent || 'this daily';
          if (!confirm(`Delete ${dailyName}?`)) return;

          if (TaskManager.removeDaily(taskId)) {
            try { state.save(); } catch (e) {}
            this.scheduleUpdateDailiesList();
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
                this.updateTodosList();
                try { state.save(); } catch (e) {}
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
        try { state.save(); } catch (e) {}
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
      try { MeterAnimation.pulse(hpFillEl, UIManager.themeColor('--hp-red', '#C00707')); } catch (e) {}
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
      try { MeterAnimation.shimmer(manaFillEl, UIManager.themeColor('--mana-blue', '#134E8E')); } catch (e) {}
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
      try { MeterAnimation.crackle(apFillEl, UIManager.themeColor('--ap-gold', '#FFB33F')); } catch (e) {}
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
          try { state.save(); } catch (e) {}
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
          try { state.save(); } catch (e) {}
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
      try { state.save(); } catch (e) {}
      renderRewards();
    });

    overlay.appendChild(popup);
    document.body.appendChild(overlay);
    try { PopupAnimation.scale(popup); } catch (e) {}
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
          } catch (e) {}
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
        FloatingDamageNumber.show(x, y - 10, `-${Math.ceil(step.damage)}`, {
          color: step.isBoss ? UIManager.themeColor('--accent-gold', '#FFB33F') : (step.damage > 0 ? UIManager.themeColor('--danger-red', '#C00707') : UIManager.themeColor('--text-muted', '#aaaaaa')),
          duration: 1600,
          scale: step.isBoss ? 1.3 : 1.1,
          isCrit: step.damage > 0 && step.damage >= 25
        });
        // Also show any mutator gains that apply to this enemy at the same time
        try {
          const matches = (mutatorGains || []).filter(m => String(m.enemyId) === String(step.enemyId));
                if (matches.length) {
            matches.forEach(m => {
              try {
                const meta = UIManager.MUTATOR_META[m.mutator] || { icon: '❗', label: m.mutator, color: UIManager.themeColor('--accent-gold', '#FFB33F') };
                try { this.showFloatingText(step.enemyId, `${meta.icon} ${meta.label}`, { color: meta.color || UIManager.themeColor('--accent-gold', '#FFB33F'), duration: 2200 }); } catch (e) { /* ignore */ }
              } catch (e) {}
            });
            // remove shown entries
            mutatorGains = (mutatorGains || []).filter(m => String(m.enemyId) !== String(step.enemyId));
          }
        } catch (e) {}
      }

      if (step.isBoss) {
        FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2 - 150, `BOSS RETALIATION: ${step.name}`, {
          color: '#ffd76a',
          duration: 2200,
          fadeDelay: 1000
        });
      }

      // Increase pacing so each retaliation feels heavier
      await wait(step.isBoss ? 1100 : 700);
      if (card) card.classList.remove('checkin-hit');
      this.setEnemyCheckInHighlight(step.enemyId, false);
      await wait(300);
    }

    // Fallback: show any remaining mutator gains that weren't shown during steps
    try {
      if (Array.isArray(mutatorGains) && mutatorGains.length > 0) {
            mutatorGains.forEach(m => {
          try {
            const meta = UIManager.MUTATOR_META[m.mutator] || { icon: '❗', label: m.mutator, color: UIManager.themeColor('--accent-gold', '#FFB33F') };
            this.showFloatingText(m.enemyId, `${meta.icon} ${meta.label}`, { color: meta.color || UIManager.themeColor('--accent-gold', '#FFB33F'), duration: 2200 });
          } catch (e) {}
        });
      }
    } catch (e) {}

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

    if (state.combatState.attackInProgress) {
      state.combatState.queuedAttackTargetId = targetEnemyId ? String(targetEnemyId) : (state.combatState.queuedAttackTargetId || state.combatState.currentTarget || null);
      state.combatState.queuedAttackCount = (state.combatState.queuedAttackCount || 0) + 1;
      return;
    }

    // Prefer an explicitly clicked enemy, then fall back to the spinner target.
    const target = this.resolveAttackTarget(targetEnemyId);
    if (!target) {
      FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2, 'No Target', { color: '#ff4444' });
      console.warn('No attack target available');
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
        try { if (window.SoundManager) SoundManager.play('miss'); } catch (e) {}
      } else {
        FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2, 'Miss', { color: '#bbbbbb' });
        try { state.resetCombo(); } catch (e) {}
        ScreenEffects.shake(2, 80);
        try { if (window.SoundManager) SoundManager.play('miss'); } catch (e) {}
      }
      this.finishAttackSpinner();
      return;
    }

    this.beginAttackSpinner(target.id);
    state.combatState.attackInProgress = true;

    try {
      if (preview.impactDelayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, preview.impactDelayMs));
      }

      try { ScreenEffects.flash && ScreenEffects.flash('rgba(255,255,255,1)', 17); } catch (e) {}
      const result = CombatManager.attemptAttack(state.playerState.activeWeapon, target.id, attackRolls);

      // Show AP cost whether the attack hits or misses
      if (result && result.apCost) {
        FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2 + 30, `-${Math.ceil(result.apCost)} AP`, { color: '#ffd700' });
      }

      if (!result.success) {
        const isApFailure = typeof result.reason === 'string' && result.reason.toLowerCase().includes('not enough ap');
        if (isApFailure) {
          FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2, 'Not enough power', { color: '#ffcc66' });
          try { if (window.SoundManager) SoundManager.play('miss'); } catch (e) {}
        } else {
          FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2, 'Miss', { color: '#bbbbbb' });
          try { state.resetCombo(); } catch (e) {}
          ScreenEffects.shake(2, 80);
          try { if (window.SoundManager) SoundManager.play('miss'); } catch (e) {}
        }
        return;
      }

      FloatingDamageNumber.show(
        window.innerWidth / 2,
        window.innerHeight / 2,
        Math.ceil(result.damage),
        { isCrit: result.isCrit, color: result.isCrit ? UIManager.themeColor('--ap-gold', '#FFB33F') : UIManager.themeColor('--danger-red', '#C00707') }
      );

      if (result.targetDead) {
        EnemyDeathAnimation.burst(window.innerWidth / 2, window.innerHeight / 2, true);
      }

      this.renderEnemies();
      getGameState().save();
    } finally {
      state.combatState.attackInProgress = false;
      this.finishAttackSpinner();

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
    }
  }
  
  static handleSkillClick() {
    const result = CombatManager.useSkill();
    
    if (!result.success) {
      console.warn('Skill not available:', result.reason);
    }
  }
  
  static handleSatchelClick() {
    // Satchel is now a permanent panel.
    this.updateConsumableStrip();
  }

  static handleCompleteDayClick() {
    const completeNow = () => {
      const result = TaskManager.completeDay();
      if (!result || !result.success) {
        const reason = result?.reason || 'unknown';
        if (reason === 'already_claimed') {
          FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2, 'Already used today', { color: '#ffcc66' });
        }
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
    
    // Get spinner rotation angle from the CSS transform matrix.
    const computedStyle = window.getComputedStyle(spinner);
    const transform = computedStyle.transform || '';
    let spinnerAngleDeg = 0;

    const matrixMatch = transform.match(/^matrix\(([^)]+)\)$/);
    const matrix3dMatch = transform.match(/^matrix3d\(([^)]+)\)$/);
    const rotateMatch = transform.match(/rotate\(([-\d.]+)deg\)/);

    if (matrixMatch) {
      const parts = matrixMatch[1].split(',').map(part => Number.parseFloat(part.trim()));
      const a = parts[0] || 1;
      const b = parts[1] || 0;
      spinnerAngleDeg = Math.atan2(b, a) * (180 / Math.PI);
    } else if (matrix3dMatch) {
      const parts = matrix3dMatch[1].split(',').map(part => Number.parseFloat(part.trim()));
      const a = parts[0] || 1;
      const b = parts[1] || 0;
      spinnerAngleDeg = Math.atan2(b, a) * (180 / Math.PI);
    } else if (rotateMatch) {
      spinnerAngleDeg = Number.parseFloat(rotateMatch[1]) || 0;
    }

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
      const cardAngle = (Math.PI * 2 * index) / enemies.length - Math.PI / 2;

      let diff = Math.abs(spinnerRad - cardAngle);
      if (diff > Math.PI) diff = 2 * Math.PI - diff;

      if (!enemy.isDead && diff < bestAliveDiff) {
        bestAliveDiff = diff;
        bestAlive = enemy;
      }

      if (enemy.isDead && diff < bestDeadDiff) {
        bestDeadDiff = diff;
        bestDead = enemy;
      }

      if (!enemy.isDead && diff <= tolerance) {
        alignedLiving.push({ enemy, diff });
      }
    });

    alignedLiving.sort((a, b) => a.diff - b.diff);

    if (alignedLiving.length > 0) {
      return alignedLiving.map(entry => entry.enemy);
    }

    // If the spinner isn't aligned with any living enemy, return the closest dead slot to preserve misses.
    return bestDead ? [bestDead] : (bestAlive ? [bestAlive] : []);
  }

  static setupDodgeButton() {
    const dodgeBtn = document.getElementById('dodgeBtn');
    if (!dodgeBtn) return;
    
    let isDodging = false;
    let activePointerId = null;

    const startDodge = (event) => {
      if (isDodging) return;
      isDodging = true;
      activePointerId = typeof event?.pointerId === 'number' ? event.pointerId : null;
      const state = getGameState();
      if (!state.combatState) state.combatState = {};
      state.combatState.dodgeActive = true;
      const spinner = document.getElementById('spinner');
      if (spinner) spinner.classList.add('dodge-active');
      this.syncSpinnerSpeed();
      dodgeBtn.classList.add('active');
      if (activePointerId !== null && typeof dodgeBtn.setPointerCapture === 'function') {
        try { dodgeBtn.setPointerCapture(activePointerId); } catch (e) {}
      }
    };

    const finishDodge = () => {
      if (!isDodging) return;
      isDodging = false;
      const pointerId = activePointerId;
      activePointerId = null;

      const spinner = document.getElementById('spinner');
      if (spinner) spinner.classList.remove('dodge-active');
      const state = getGameState();
      if (!state.combatState) state.combatState = {};
      state.combatState.dodgeActive = false;
      this.syncSpinnerSpeed();
      dodgeBtn.classList.remove('active');
      const dodgeCost = Math.ceil(state.playerState.maxAp * state.config.dodgeCost);

      if (state.playerState.ap < dodgeCost) {
        FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2, 'Not enough power', { color: '#ffcc66' });
        try { if (window.SoundManager) SoundManager.play('miss'); } catch (e) {}
        return;
      }

      state.spendAp(dodgeCost);
      FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2 + 30, `-${dodgeCost} AP`, { color: '#ffd700' });
      
      // Determine target and set dodge
      const targets = this.getSpinnerTargetEnemies();
      if (targets.length > 0) {
        if (!state.combatState) state.combatState = {};
        state.combatState.dodgeTarget = targets.map(enemy => enemy.id);
        FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2, 'Dodge Ready!', { color: '#44ff44' });
        this.renderEnemies();
      } else {
        FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2, 'Dodge Miss!', { color: '#ff4444' });
      }
      if (pointerId !== null && typeof dodgeBtn.releasePointerCapture === 'function') {
        try { dodgeBtn.releasePointerCapture(pointerId); } catch (e) {}
      }
    };

    dodgeBtn.addEventListener('pointerdown', startDodge);
    dodgeBtn.addEventListener('pointerup', finishDodge);
    dodgeBtn.addEventListener('pointercancel', finishDodge);
    dodgeBtn.addEventListener('lostpointercapture', finishDodge);
    dodgeBtn.addEventListener('mouseleave', () => {
      // Mouse-only fallback if pointer capture is unavailable.
      if (isDodging && activePointerId === null) finishDodge();
    });
  }
  
  static handlePauseClick() {
    const state = getGameState();
    
    if (state.systemState.isPaused) {
      state.resume();
      PopupsManager.closeAllPopups();
    } else {
      state.pause();
      PopupsManager.showPauseMenu();
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
    if (detail.type !== 'dodge' && detail.type !== 'pet') {
      ScreenEffects.shake(2, 45);
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
    visibleDailies.forEach(daily => {
      const streak = computeDailyStreak(daily.id);
      const maxCompletions = Math.max(1, Number(daily.maxCompletionsPerDay) || 1);
      const completionsToday = Math.max(0, Number(daily.completionsToday) || 0);
      const completionRatio = Math.min(1, completionsToday / maxCompletions);
      const opacity = Math.max(0.1, 1 - completionRatio);
      const attributeColor = getAttributeColor(daily.attribute);
      const textColor = getTextColorForHex(attributeColor);
      const streakClass = streak > 0 ? 'is-positive' : streak < 0 ? 'is-negative' : 'is-neutral';
      const strokeWidth = Math.min(6, 1 + Math.abs(streak));
      const progressText = `${completionsToday}/${maxCompletions}`;
      html += '<div class="shape-task shape-' + this.shapeClassForDifficulty(daily.difficulty) + ' task-clickable task-card-daily ' + (daily.completed ? 'completed' : '') + '" data-id="' + daily.id + '" data-type="daily" tabindex="0" data-attribute="' + (daily.attribute || '') + '" data-difficulty="' + (daily.difficulty || '') + '" style="--task-accent:' + attributeColor + ';--task-accent-strong:' + shadeColor(attributeColor, -20) + ';--task-ink:' + textColor + ';opacity:' + opacity + ';border-width:' + strokeWidth + 'px;">';
      html += '<div class="task-shape-streak ' + streakClass + '" title="Streak">' + streak + '</div>';
      html += '<div class="task-shape-difficulty">' + (daily.difficulty || '') + '</div>';
      html += '<div class="task-shape-name">' + (daily.name || '') + '</div>';
      html += '<div class="task-shape-attr">' + (daily.attribute || '') + '</div>';
      html += '<div class="task-shape-progress">' + progressText + '</div>';
      html += '</div>';
    });
    container.innerHTML = html;

    // Attach long-press-to-edit handlers for daily cards (touch + mouse)
    try {
      const gs = getGameState();
      const longPressMs = Number((gs && gs.config && (gs.config.longPressMs || gs.config.shopLongPressMs)) || 450);
      const cards = container.querySelectorAll('.task-card-daily');
      cards.forEach(card => {
        let pressTimer = null;
        let longPressed = false;

        const toggleBloodOath = () => {
          longPressed = true;
          try { TaskManager.toggleBloodOath(card.dataset.id); } catch (e) {}
          try { getGameState().save(); } catch (e) {}
          this.scheduleUpdateDailiesList();
          // mark briefly so delegated click handlers can ignore the click
          card.dataset.longPressed = '1';
          setTimeout(() => { delete card.dataset.longPressed; }, 700);
        };

        const startPress = (e) => {
          if (e) try { e.preventDefault(); } catch (er) {}
          longPressed = false;
          clearTimeout(pressTimer);
          pressTimer = setTimeout(toggleBloodOath, longPressMs);
        };

        const endPress = () => {
          clearTimeout(pressTimer);
        };

        card.addEventListener('mousedown', startPress);
        card.addEventListener('touchstart', startPress, { passive: false });
        card.addEventListener('mouseup', endPress);
        card.addEventListener('mouseleave', endPress);
        card.addEventListener('touchend', endPress);
        card.addEventListener('touchcancel', endPress);

      });
    } catch (e) { console.warn('Failed to bind long-press edit for dailies', e); }

    const completeDayBtn = document.getElementById('completeDayBtn');
    if (completeDayBtn) {
      const claimed = getGameState().systemState?.completeDayClaimDate === (typeof getLocalDateKey === 'function' ? getLocalDateKey() : new Date().toISOString().split('T')[0]);
      completeDayBtn.textContent = claimed ? 'Complete Day ✓' : 'Complete Day';
      completeDayBtn.classList.toggle('active', claimed);
    }

    this.bindTaskInteractions();
    this.bindDailyBoardInteractions();
    this.positionDailyCards();
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

      const layout = daily.layout
        ? this.clampDailyLayout(daily.layout, metrics, tileSize)
        : this.getDefaultDailyLayout(index, metrics, tileSize);

      card.style.width = `${tileSize.width}px`;
      card.style.left = `${layout.x}%`;
      card.style.top = `${layout.y}%`;
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

      card.classList.add('dragging');
      try { card.setPointerCapture(event.pointerId); } catch (error) {}
      event.preventDefault();
    });

    const onMove = (event) => {
      const dragState = this.dailyDragState;
      if (!dragState || event.pointerId !== dragState.pointerId) return;

      const boardRect = dragState.board.getBoundingClientRect();
      const cardRect = dragState.card.getBoundingClientRect();
      const maxLeft = Math.max(0, boardRect.width - cardRect.width);
      const maxTop = Math.max(0, boardRect.height - cardRect.height);
      const nextLeftPx = Math.max(0, Math.min(maxLeft, event.clientX - boardRect.left - dragState.offsetX));
      const nextTopPx = Math.max(0, Math.min(maxTop, event.clientY - boardRect.top - dragState.offsetY));

      if (!dragState.moved) {
        const distance = Math.hypot(event.clientX - dragState.startX, event.clientY - dragState.startY);
        if (distance > 4) dragState.moved = true;
      }

      dragState.card.style.left = `${(nextLeftPx / Math.max(1, boardRect.width)) * 100}%`;
      dragState.card.style.top = `${(nextTopPx / Math.max(1, boardRect.height)) * 100}%`;
    };

    const endDrag = (event) => {
      const dragState = this.dailyDragState;
      if (!dragState || (event.pointerId !== undefined && event.pointerId !== dragState.pointerId)) return;

      const boardRect = dragState.board.getBoundingClientRect();
      const cardRect = dragState.card.getBoundingClientRect();
      dragState.card.classList.remove('dragging');
      try { dragState.card.releasePointerCapture(dragState.pointerId); } catch (error) {}

      if (dragState.moved) {
        const tileSize = { width: cardRect.width, height: cardRect.height };
        const layout = this.clampDailyLayout({
          x: ((cardRect.left - boardRect.left) / Math.max(1, boardRect.width)) * 100,
          y: ((cardRect.top - boardRect.top) / Math.max(1, boardRect.height)) * 100
        }, { width: Math.max(1, boardRect.width), height: Math.max(1, boardRect.height) }, tileSize);

        TaskManager.updateDailyLayout(dragState.dailyId, layout);
        try { getGameState().save(); } catch (error) {}
        this.dailyDragSuppressUntil = Date.now() + 250;
      } else {
        const editModeDailies = !!getGameState().systemState?.taskListFilters?.editModeDailies;
        const longPressed = dragState.card.dataset.longPressed === '1';
        if (!longPressed) {
          if (editModeDailies) {
            try { PopupsManager.showEditDaily(dragState.dailyId); } catch (error) { console.warn('Failed to open daily edit popup', error); }
          } else {
            const res = TaskManager.completeDaily(dragState.dailyId);
            if (!res || !res.success) return;
            try {
              dragState.card.classList.add('just-completed');
              dragState.card.style.transition = 'transform 220ms ease, opacity 400ms ease';
              dragState.card.style.transform = 'scale(1.04)';
              if (res.rewards && res.rewards.ap) {
                UIManager.showDailyApReward(dragState.card, res.rewards.ap);
              }
              setTimeout(() => {
                this.scheduleUpdateDailiesList();
              }, 320);
            } catch (error) {
              this.scheduleUpdateDailiesList();
            }
            try { getGameState().save(); } catch (saveError) {}
            this.renderEnemies();
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

  static clampTodoLayout(layout, metrics, tileSize) {
    const maxX = Math.max(0, 100 - ((tileSize.width / metrics.width) * 100));
    const maxY = Math.max(0, 100 - ((tileSize.height / metrics.height) * 100));
    return {
      x: Math.max(0, Math.min(maxX, Number(layout?.x) || 0)),
      y: Math.max(0, Math.min(maxY, Number(layout?.y) || 0))
    };
  }

  static getDefaultTodoLayout(index, metrics, tileSize) {
    const padding = 12;
    const gap = 12;
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

  static positionTodoCards() {
    const metrics = this.getTodoBoardMetrics();
    if (!metrics) return;

    const todos = TaskManager.getAllTodos();
    const tileSize = this.getTodoCardSize();
    let changed = false;

    todos.forEach((todo, index) => {
      const card = metrics.board.querySelector(`.task-card-todo[data-id="${todo.id}"]`);
      if (!card) return;

      // Allow card height to be dynamic (subtasks may increase height).
      const actualTileHeight = card.offsetHeight || tileSize.height;

      const layout = todo.layout
        ? (() => {
            const maxX = Math.max(0, 100 - ((tileSize.width / metrics.width) * 100));
            const maxY = Math.max(0, 100 - ((actualTileHeight / metrics.height) * 100));
            return {
              x: Math.max(0, Math.min(maxX, Number(todo.layout?.x) || 0)),
              y: Math.max(0, Math.min(maxY, Number(todo.layout?.y) || 0))
            };
          })()
        : this.getDefaultTodoLayout(index, metrics, tileSize);

      if (!todo.layout) {
        TaskManager.updateTodoLayout(todo.id, layout);
        changed = true;
      }

      card.style.width = `${tileSize.width}px`;
      // Do not force a fixed height; let subtasks expand the card vertically.
      card.style.left = `${layout.x}%`;
      card.style.top = `${layout.y}%`;
    });

    if (changed) {
      try { getGameState().save(); } catch (error) {}
    }
  }

  static bindTodoBoardInteractions() {
    const board = document.getElementById('todosList');
    if (!board || board.dataset.dragBound === '1') return;

    board.dataset.dragBound = '1';

    board.addEventListener('pointerdown', (event) => {
      const card = event.target.closest('.task-card-todo');
      if (!card || !board.contains(card)) return;
      if (event.target.closest('button, input, textarea, select, label')) return;
      if (event.button !== 0) return;

      const todoId = card.dataset.id;
      if (!todoId) return;

      const cardRect = card.getBoundingClientRect();
      this.todoDragState = {
        todoId,
        card,
        board,
        pointerId: event.pointerId,
        offsetX: event.clientX - cardRect.left,
        offsetY: event.clientY - cardRect.top,
        moved: false,
        startX: event.clientX,
        startY: event.clientY
      };

      card.classList.add('dragging');
      try { card.setPointerCapture(event.pointerId); } catch (error) {}
      event.preventDefault();
    });

    const onMove = (event) => {
      const dragState = this.todoDragState;
      if (!dragState || event.pointerId !== dragState.pointerId) return;

      const boardRect = dragState.board.getBoundingClientRect();
      const cardRect = dragState.card.getBoundingClientRect();
      const maxLeft = Math.max(0, boardRect.width - cardRect.width);
      const maxTop = Math.max(0, boardRect.height - cardRect.height);
      const nextLeftPx = Math.max(0, Math.min(maxLeft, event.clientX - boardRect.left - dragState.offsetX));
      const nextTopPx = Math.max(0, Math.min(maxTop, event.clientY - boardRect.top - dragState.offsetY));

      if (!dragState.moved) {
        const distance = Math.hypot(event.clientX - dragState.startX, event.clientY - dragState.startY);
        if (distance > 4) dragState.moved = true;
      }

      dragState.card.style.left = `${(nextLeftPx / Math.max(1, boardRect.width)) * 100}%`;
      dragState.card.style.top = `${(nextTopPx / Math.max(1, boardRect.height)) * 100}%`;
    };

    const endDrag = (event) => {
      const dragState = this.todoDragState;
      if (!dragState || (event.pointerId !== undefined && event.pointerId !== dragState.pointerId)) return;

      const boardRect = dragState.board.getBoundingClientRect();
      const cardRect = dragState.card.getBoundingClientRect();
      dragState.card.classList.remove('dragging');
      try { dragState.card.releasePointerCapture(dragState.pointerId); } catch (error) {}

      if (dragState.moved) {
        const tileSize = { width: cardRect.width, height: cardRect.height };
        const layout = this.clampTodoLayout({
          x: ((cardRect.left - boardRect.left) / Math.max(1, boardRect.width)) * 100,
          y: ((cardRect.top - boardRect.top) / Math.max(1, boardRect.height)) * 100
        }, { width: Math.max(1, boardRect.width), height: Math.max(1, boardRect.height) }, tileSize);

        TaskManager.updateTodoLayout(dragState.todoId, layout);
        try { getGameState().save(); } catch (error) {}
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
    const visibleTodos = showCompleted ? todos : todos.filter(todo => !todo.completed);
    
    container.innerHTML = visibleTodos.map(todo => {
      const displayName = (todo.name === 'New To-Do') ? '' : (todo.name || '');
      const subtasks = (todo.subtasks || []).map(st => `
        <div class="subtask ${st.completed ? 'completed' : ''}" data-subtask-id="${st.id}">
          <label class="subtask-label"><input type="checkbox" class="subtask-checkbox" data-subtask-id="${st.id}" ${st.completed ? 'checked' : ''}> <span class="subtask-name">${st.name}</span></label>
          <button class="subtask-remove" data-subtask-id="${st.id}" title="Remove subtask">×</button>
        </div>
      `).join('');
      const subtaskCount = (todo.subtasks || []).length;
      const deadlineLabel = todo.deadline ? new Date(todo.deadline).toLocaleDateString() : 'No deadline';
      const deadlineDistance = this.getDeadlineDistanceText(todo.deadline);
      return `
      <div class="task-card task-clickable task-card-todo discreet ${todo.completed ? 'completed' : ''}" data-id="${todo.id}" data-type="todo" tabindex="0">
        <div class="todo-card-top">
          <div class="task-title todo-title">${displayName}</div>
          <div class="task-pill-row task-pill-row-left task-pill-row-right-side">
            <div class="task-difficulty ${todo.difficulty.toLowerCase()}">${todo.difficulty}</div>
            <div class="task-attr">${todo.attribute}</div>
          </div>
        </div>

        <div class="todo-card-body">
          <div class="todo-date-big">${deadlineLabel}</div>
          <div class="todo-date-subtext">${deadlineDistance}</div>
          <div class="todo-subtasks-wrap">
            <div class="todo-subtask-label">${subtaskCount} subtasks</div>
            ${subtaskCount > 0 ? `<div class="subtasks">${subtasks}</div>` : '<div class="muted">No subtasks yet</div>'}
            <div class="subtask-add">
              <input class="subtask-input" placeholder="Add subtask..." data-todo-id="${todo.id}" />
              <button class="subtask-add-btn" data-todo-id="${todo.id}">Add</button>
            </div>
          </div>
        </div>

        <div class="task-card-actions task-card-actions-todo task-card-actions-small">
          <button class="btn-blood-oath" title="Blood Oath">🩸</button>
          <button class="btn-edit" title="Edit">✎</button>
        </div>
      </div>
      `;
    }).join('');

    this.bindTaskInteractions();
    this.bindTodoBoardInteractions();
    this.positionTodoCards();
  }

  static renderEnemies() {
    const layer = document.getElementById('enemyLayer');
    if (!layer) return;

    const state = getGameState();
    const enemies = state.stageState.enemies || [];
    const circle = document.querySelector('.enemy-circle-container');
    const rect = circle ? circle.getBoundingClientRect() : { width: 500, height: 500 };
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    // Position enemies ON the circle border (outer edge)
    // Tweak radius to keep cards inside the circle and avoid clipping
    const radius = Math.min(rect.width, rect.height) / 2 - 46;

    if (!enemies.length) {
      layer.innerHTML = '<div class="enemy-empty">No enemies yet</div>';
      return;
    }

    const petTarget = state.playerState && state.playerState.petTarget ? state.playerState.petTarget : null;
    const todayStr = (new Date()).toISOString().slice(0,10);

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

      const angle = (Math.PI * 2 * index) / enemies.length - Math.PI / 2;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;

      let card = existingCards.get(enemyId);
      if (!card) {
        card = this.createEnemyCardElement(enemyId);
        layer.appendChild(card);
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
          try { state.save(); } catch (e) {}
        }
      } catch (e) {}
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
      <div class="dodge-marker" style="display:none;">⚡🌬️</div>
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
    if (hpTextEl) hpTextEl.textContent = `${Math.ceil(enemy.hp || 0)} / ${Math.ceil(enemy.maxHp || 0)}`;

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
    strip.innerHTML = (state.playerState.weapons || []).map((weaponName, index) => {
      const activeClass = (index === state.playerState.activeWeapon) ? 'active' : '';
      const weaponElement = state.playerState.weaponElements?.[index] || '';
      const weaponLabel = weaponElement ? `${weaponName} · ${weaponElement}` : weaponName;
      if (!weaponName) {
        return `<div class="weapon-chip-wrap"><button class="weapon-chip empty" disabled>—</button></div>`;
      }

      return `<div class="weapon-chip-wrap"><button class="weapon-chip ${activeClass}" data-slot="${index}">${weaponLabel}</button><button class="weapon-upgrade-btn" data-weapon="${weaponName}" data-slot="${index}" title="Upgrade">⚒️</button></div>`;
    }).join('');

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

    this.updateActionCosts();
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
    this.updateWeaponIcons();
    this.updateDateDisplay();
    this.renderEnemies();
    this.updateRunCompletionGraph();
    // Consumables and buffs are part of the HUD and must update here
    try { this.updateConsumableStrip && this.updateConsumableStrip(); } catch (e) {}
    try { this.renderBuffPanel && this.renderBuffPanel(); } catch (e) {}
    try { this.positionSatchelPanel && this.positionSatchelPanel(); } catch (e) {}
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
    } catch (e) {
      console.warn('refreshGameUI: failed to sync resources', e);
    }
    this.scheduleUpdateDailiesList();
    this.updateTodosList();
    this.updateDeathDefianceBadge();
    this.updateTaskVisibilityToggleLabels();
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

    const diff = Number(deadline) - Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const days = Math.round(diff / dayMs);

    if (days === 0) return diff >= 0 ? 'due today' : 'overdue today';
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
      let x = ev?.clientX || (window.innerWidth/2);
      let y = ev?.clientY || (window.innerHeight/2);
      tip.style.left = Math.min(window.innerWidth - 12 - tip.offsetWidth, x + 8) + 'px';
      tip.style.top = Math.max(8, y - 8 - tip.offsetHeight) + 'px';
      setTimeout(() => tip.classList.add('visible'), 10);
      setTimeout(() => { try { tip.classList.remove('visible'); setTimeout(() => tip.remove(), 220); } catch(e) {} }, 3000);
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
      let message = '';
      if (!muts.length) {
        message = 'No mutators.';
      } else {
        message = muts.map(m => {
          const meta = UIManager.MUTATOR_META[m] || { icon: '❗', label: m, desc: '' };
          return `${meta.icon} ${meta.label} — ${meta.desc}`;
        }).join('\n\n');
      }

      try {
        PopupsManager.showDialogue(enemy.name || 'Enemy Mutators', message);
      } catch (e) { console.warn('showMutatorPopup error', e); }
    } catch (e) { console.warn('showMutatorPopup', e); }
  }

  static showMutatorToast(text) {
    try {
      if (typeof FloatingDamageNumber !== 'undefined') {
        FloatingDamageNumber.show(window.innerWidth/2, 60, text, { color: UIManager.themeColor('--accent-gold', '#FFB33F'), duration: 1600 });
      } else {
        const el = document.createElement('div');
        el.className = 'mutator-toast';
        el.textContent = text;
        document.body.appendChild(el);
        setTimeout(() => { try { el.remove(); } catch (e) {} }, 1600);
      }
    } catch (e) { console.warn('showMutatorToast error', e); }
  }

  static playMutatorSound() {
    try {
      const a = new Audio('assets/sounds/attack.mp3');
      a.volume = 0.6;
      a.play().catch(() => {});
    } catch (e) {}
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
      try { icon.remove(); } catch (e) {}
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
        try { PopupsManager.showDialogue(name, meta.description || ''); } catch (err) {}
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
    } catch (e) {}
    try {
      const el = document.querySelector(`#buffPanel .buff-icon[data-buff="${buffName}"]`);
      if (el) {
        el.classList.add('buff-gain');
        setTimeout(() => el.classList.remove('buff-gain'), 950);
      }
    } catch (e) {}
  }

}

window.addEventListener('resize', () => {
  if (typeof UIManager === 'undefined') return;
  if (UIManager.resizeScheduled) return;
  UIManager.resizeScheduled = true;
  requestAnimationFrame(() => {
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
window.debugAddMutator = function(enemyId, mutator) {
  try {
    const enemy = (typeof StageManager !== 'undefined' && StageManager.getEnemyById) ? StageManager.getEnemyById(enemyId) : (StageManager.getAllEnemies && StageManager.getAllEnemies().find(e => String(e.id) === String(enemyId)));
    if (!enemy) { console.warn('debugAddMutator: enemy not found', enemyId); return; }
    enemy.mutators = Array.isArray(enemy.mutators) ? enemy.mutators : [];
    if (enemy.mutators.includes(mutator)) {
      console.info('Enemy already has mutator', mutator); return;
    }
    enemy.mutators.push(mutator);
    try { getGameState().save(); } catch (e) {}
    try { getGameState().eventBus.emit(EVENTS.ENEMY_MUTATED, { enemyId: String(enemy.id), mutator, source: 'debug' }); } catch (e) {}
    try { if (typeof UIManager !== 'undefined') UIManager.renderEnemies(); } catch (e) {}
  } catch (e) { console.warn('debugAddMutator failed', e); }
};
