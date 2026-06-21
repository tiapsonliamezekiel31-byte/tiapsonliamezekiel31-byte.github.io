/**
 * NEMESIS ROGUELIKE — POPUPS & MODALS
 * Buffs, Attributes, Shop, Satchel, Death, Victory, Dialogue
 */

class PopupsManager {
  static closeAllPopups() {
    const popups = document.querySelectorAll('.popup');
    popups.forEach(popup => popup.remove());
    
    const overlays = document.querySelectorAll('.popup-overlay');
    overlays.forEach(overlay => overlay.remove());

    const wizards = document.querySelectorAll('.floating-wizard');
    wizards.forEach(w => w.remove());

    // Refresh tycoon tasks list if tycoon is active
    if (localStorage.getItem('nemesis_active_mode') === 'tycoon' && window.TycoonManager && typeof window.TycoonManager.renderTasksList === 'function') {
      try {
        window.TycoonManager.renderTasksList();
        const tasksDialog = document.getElementById('tycoon-tasks-dialog');
        if (tasksDialog) {
          tasksDialog.style.display = 'flex';
        }
      } catch (e) {
        console.warn("Failed to refresh tycoon tasks list on closeAllPopups", e);
      }
    }
  }
  
  static createPopupOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'popup-overlay';
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.closeAllPopups();
      }
    });
    return overlay;
  }

  static markDialogueSeen(key) {
    const state = getGameState();
    if (!state.systemState.dialogueSeen) state.systemState.dialogueSeen = {};
    state.systemState.dialogueSeen[key] = true;
  }

  static hasSeenDialogue(key) {
    const state = getGameState();
    return !!state.systemState?.dialogueSeen?.[key];
  }

  static showConfiguredDialogue(triggerKey, overrides = {}, onceKey = triggerKey) {
    const state = getGameState();
    if (onceKey && this.hasSeenDialogue(onceKey)) return false;

    const configCard = state.config?.dialogueCards?.[triggerKey] || {};
    const card = { ...configCard, ...overrides };
    const shown = this.showDialogue(card.title || 'Dialogue', card.text || 'text', {
      image: card.image || null,
      clickToClose: true
    });
    if (shown && onceKey) {
      this.markDialogueSeen(onceKey);
      try { state.save(); } catch (e) {}
    }
    return shown;
  }
  
  // ============================================================
  // ATTRIBUTES POPUP
  // ============================================================
  
  static showAttributes() {
    const state = getGameState();
    this.closeAllPopups();
    
    const overlay = this.createPopupOverlay();
    const popup = document.createElement('div');
    popup.className = 'popup attributes-popup';
    
    let html = '<h2>ATTRIBUTES</h2><button class="btn-close">✕</button>';
    html += '<div class="attributes-grid">';

    // Get thresholds array from config (function or array)
    const thresholds = typeof state.config.attributeLevelThresholds === 'function'
      ? state.config.attributeLevelThresholds()
      : (Array.isArray(state.config.attributeLevelThresholds) ? state.config.attributeLevelThresholds : []);

    state.config.attributes.forEach(attr => {
      const data = state.playerState.attributes[attr] || { points: 0, level: 1 };
      const nemData = state.nemesisState.attributes[attr] || { points: 0, level: 1 };

      const playerLeads = data.points > nemData.points;
      const nemesisLeads = nemData.points > data.points;

      const pPts = Math.round(data.points * 100) / 100;
      const nPts = Math.round(nemData.points * 100) / 100;
      const total = pPts + nPts;
      const playerPercent = total > 0 ? (pPts / total) * 100 : 50;

      html += `
        <div class="attr-row">
          <div class="attr-row-header">
            <div class="attr-side attr-left">
              <span class="attr-val player-val">${pPts}</span>
            </div>
            <div class="attr-center">
              <span class="attr-name">${attr}</span>
              <span class="attr-level">Lv.${data.level}</span>
            </div>
            <div class="attr-side attr-right">
              <span class="attr-lead">
                ${playerLeads ? '⬆️' : ''}
                ${nemesisLeads ? '⚠️' : ''}
              </span>
              <span class="attr-val nem-val">${nPts}</span>
            </div>
          </div>
          <div class="attr-bar-container">
            <div class="attr-bar-player" style="width: ${playerPercent}%"></div>
          </div>
          <div class="attr-sabotage-wrap" style="display: flex; justify-content: center; margin-top: 4px;">
            <button class="btn-sabotage" data-attr="${attr}">Sabotage (30 Mana)</button>
          </div>
        </div>
      `;
    });
    
    // Recompute nemesis leads count explicitly by attribute keys
    let nemesisLeadsCount = 0;
    (state.config.attributes || []).forEach(a => {
      const p = state.playerState.attributes?.[a]?.points || 0;
      const n = state.nemesisState.attributes?.[a]?.points || 0;
      if (n > p) nemesisLeadsCount++;
    });
    
    html += '</div>';
    html += `<div class="nemesis-info">Nemesis leads in ${nemesisLeadsCount} attributes</div>`;
    
    popup.innerHTML = html;
    popup.querySelector('.btn-close').addEventListener('click', () => this.closeAllPopups());
    
    // Bind Sabotage button listeners
    popup.querySelectorAll('.btn-sabotage').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const attr = e.currentTarget.dataset.attr;
        const pState = state.playerState;
        if ((pState.mana || 0) < 30) {
          FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2, 'Not enough mana', { color: '#ff6666' });
          return;
        }

        // Deduct 30 mana
        state.setMana(pState.mana - 30);

        // Get points
        const myPoints = pState.attributes[attr]?.points || 0;
        const reduction = myPoints * 0.3;

        // Reduce nemesis attribute points
        if (!state.nemesisState.attributes[attr]) {
          state.nemesisState.attributes[attr] = { points: 0, level: 1 };
        }
        const nemAttr = state.nemesisState.attributes[attr];
        const oldPoints = nemAttr.points;
        nemAttr.points = Math.max(0, nemAttr.points - reduction);
        const actualReduced = oldPoints - nemAttr.points;

        // Recalculate level
        while (nemAttr.level > 1 && nemAttr.points < thresholds[nemAttr.level - 1]) {
          nemAttr.level--;
        }

        // Save state
        try { state.save(); } catch (err) {}

        // Show floating message
        FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2, `Sabotaged ${attr}: -${actualReduced.toFixed(1)} pts`, { color: '#ff6666' });

        // Update main game UI HUD mana bar instantly if available
        try { if (window.UIManager && UIManager.refreshGameUI) UIManager.refreshGameUI(); } catch (err) {}

        // Re-open/refresh attributes popup
        PopupsManager.showAttributes();
      });
    });

    overlay.appendChild(popup);
    document.body.appendChild(overlay);
    PopupAnimation.scale(popup);
  }
  
  // ============================================================
  // BUFFS POPUP
  // ============================================================
  
  static showBuffs() {
    const state = getGameState();
    this.closeAllPopups();
    
    const overlay = this.createPopupOverlay();
    const popup = document.createElement('div');
    popup.className = 'popup buffs-popup';
    
    let html = '<h2>BUFFS</h2><button class="btn-close">✕</button>';
    html += '<div class="buffs-grid">';
    
    state.buffs.forEach(buffName => {
      const buff = state.config.buffs[buffName];
      html += `
        <div class="buff-card">
          <div class="buff-icon">${buff.icon}</div>
          <div class="buff-name">${buffName}</div>
          <div class="buff-desc">${buff.description}</div>
        </div>
      `;
    });
    
    html += '</div>';
    popup.innerHTML = html;
    popup.querySelector('.btn-close').addEventListener('click', () => this.closeAllPopups());
    
    overlay.appendChild(popup);
    document.body.appendChild(overlay);
    PopupAnimation.scale(popup);
  }
  
  // ============================================================
  // BUFF SELECTION (After level 2, 4, 6, 8...)
  // ============================================================
  
  static showBuffSelection() {
    const state = getGameState();
    this.closeAllPopups();
    
    // Get 3 random buffs
    const allBuffNames = Object.keys(state.config.buffs);
    const selectedBuffs = [];
    
    while (selectedBuffs.length < 3) {
      const buff = allBuffNames[Math.floor(Math.random() * allBuffNames.length)];
      if (!selectedBuffs.includes(buff) && !state.buffs.includes(buff)) {
        selectedBuffs.push(buff);
      }
    }
    
    const overlay = this.createPopupOverlay();
    overlay.style.pointerEvents = 'none'; // Prevent closing
    
    const popup = document.createElement('div');
    popup.className = 'popup buff-selection-popup';
    popup.style.pointerEvents = 'auto';
    
    let html = `<h2>CHOOSE YOUR BUFF (Stage ${state.stageState.stage})</h2>`;
    html += '<div class="buff-selection-grid">';
    
    selectedBuffs.forEach(buffName => {
      const buff = state.config.buffs[buffName];
      html += `
        <div class="buff-option" data-buff="${buffName}">
          <div class="buff-icon">${buff.icon}</div>
          <div class="buff-title">${buffName}</div>
          <div class="buff-effect">${buff.description}</div>
          <button class="btn-select">SELECT</button>
        </div>
      `;
    });
    
    html += '</div>';
    popup.innerHTML = html;
    
    // Event listeners
    popup.querySelectorAll('.btn-select').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const buffName = e.target.closest('.buff-option').dataset.buff;
        state.addBuff(buffName);
        this.closeAllPopups();
      });
    });
    
    overlay.appendChild(popup);
    document.body.appendChild(overlay);
    PopupAnimation.scale(popup);
  }
  
  // ============================================================
  // SATCHEL (Consumables)
  // ============================================================
  
  static showSatchel() {
    const state = getGameState();
    this.closeAllPopups();
    
    const overlay = this.createPopupOverlay();
    const popup = document.createElement('div');
    popup.className = 'popup satchel-popup';
    
    let html = '<h2>🎒 SATCHEL</h2><button class="btn-close">✕</button>';
    html += '<div class="consumables-list">';
    
    const consumables = PlayerManager.getActiveConsumables();
    
    if (Object.keys(consumables).length === 0) {
      html += '<p>No consumables</p>';
    } else {
      Object.entries(consumables).forEach(([name, count]) => {
        // Map shop IDs to friendly names when available
        let displayName = name;
        try {
          if (typeof ShopManager !== 'undefined' && ShopManager.getCatalog) {
            const cat = ShopManager.getCatalog();
            const found = (cat || []).find(i => i.id === name);
            if (found) displayName = found.name;
          }
        } catch (e) {}

        html += `
          <div class="consumable-item" data-consumable="${name}">
            <span class="consumable-name">${displayName}</span>
            <span class="consumable-count">×${count}</span>
            <button class="btn-use">USE</button>
          </div>
        `;
      });
    }
    
    html += '</div>';
    popup.innerHTML = html;
    popup.querySelector('.btn-close').addEventListener('click', () => this.closeAllPopups());
    
    overlay.appendChild(popup);
    document.body.appendChild(overlay);
    PopupAnimation.scale(popup);

    // Hook up USE buttons to consume items
    popup.querySelectorAll('.btn-use').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const itemEl = e.currentTarget.closest('.consumable-item');
        if (!itemEl) return;
        const consumableKey = itemEl.dataset.consumable;
        try {
          const used = PlayerManager.useConsumable(consumableKey);
          if (used) {
            FloatingDamageNumber.show(window.innerWidth/2, window.innerHeight/2, `Used ${consumableKey}`, { color: (typeof UIManager !== 'undefined') ? UIManager.themeColor('--success-green', '#44ff44') : '#44ff44' });
            // Re-render satchel to update counts
            this.showSatchel();
          } else {
            FloatingDamageNumber.show(window.innerWidth/2, window.innerHeight/2, `Cannot use ${consumableKey}`, { color: (typeof UIManager !== 'undefined') ? UIManager.themeColor('--danger-red', '#C00707') : '#ff6666' });
          }
        } catch (err) {
          console.warn('Use consumable failed', consumableKey, err);
        }
      });
    });
  }
  
  // ============================================================
  // SHOP
  // ============================================================
  
  static showShop() {
    const state = getGameState();
    this.closeAllPopups();
    
    const overlay = this.createPopupOverlay();
    const popup = document.createElement('div');
    popup.className = 'popup shop-popup';
    
    const maxGold = TaskManager.getAllDailies().reduce((sum, d) => {
      const reward = state.config.taskRewards[d.difficulty];
      return sum + reward.gold;
    }, 0);
    
    let html = `<h2>🛒 SHOP</h2><button class="btn-close">✕</button>`;
    html += `<div class="shop-gold">Gold: 💰 ${state.playerState.gold}</div>`;
    html += '<div class="shop-grid">';
    
    // Smith section
    html += '<div class="shop-section"><h3>SMITH (Weapons)</h3>';
    
    Object.entries(state.config.weapons).forEach(([name, data]) => {
      if (data.price === 0) return; // Skip starter weapon
      
      const price = Math.ceil(maxGold * data.price);
      html += `
        <div class="weapon-item" data-weapon="${name}">
          <div class="weapon-name">${name}</div>
          <div class="weapon-stats">${data.damageMultiplier}× | ${Math.round(data.critChance * 100)}% crit</div>
          <div class="weapon-cost">💰 ${price}</div>
          <button class="btn-buy">BUY</button>
        </div>
      `;
    });
    
    html += '</div>';
    
    // Consumables section: include config consumables plus shop-only items
    html += '<div class="shop-section"><h3>CONSUMABLES</h3>';

    // First, config-defined consumables
    const added = new Set();
    Object.entries(state.config.consumables).forEach(([name, data]) => {
      const price = Math.ceil(maxGold * data.price);
      added.add(name);
      html += `
        <div class="consumable-item" data-consumable="${name}">
          <div class="consumable-name">${name}</div>
          <div class="consumable-effect">${data.effect}</div>
          <div class="consumable-cost">💰 ${price}</div>
          <button class="btn-buy-consumable">BUY</button>
        </div>
      `;
    });

    // Then include shop catalog consumables (e.g., Heal Potion, AP Tonic)
    try {
      if (typeof ShopManager !== 'undefined' && ShopManager.getCatalog) {
        const catalog = ShopManager.getCatalog();
        (catalog || []).forEach(item => {
          if (item.type === 'consumable') {
            // Display using item.id as data-consumable so purchase path matches storage
            if (added.has(item.name) || added.has(item.id)) return;
            added.add(item.id);
            let price = item.price || 0;
            if (price <= 1) price = Math.ceil(maxGold * price);
            html += `
              <div class="consumable-item" data-consumable="${item.id}">
                <div class="consumable-name">${item.name}</div>
                <div class="consumable-effect">${item.desc || ''}</div>
                <div class="consumable-cost">💰 ${price}</div>
                <button class="btn-buy-consumable">BUY</button>
              </div>
            `;
          }
        });
      }
    } catch (e) { console.warn('Failed to include shop catalog consumables', e); }
    
    html += '</div></div>';
    popup.innerHTML = html;
    
    // Event listeners
    popup.querySelector('.btn-close').addEventListener('click', () => this.closeAllPopups());
    // Hook buy buttons for consumables
    popup.querySelectorAll('.btn-buy-consumable').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const el = e.currentTarget.closest('.consumable-item');
        if (!el) return;
        const key = el.dataset.consumable;
        try {
          let res = null;
          if (typeof ShopManager !== 'undefined' && ShopManager) {
            if (key && key.startsWith('s_')) {
              // shop-catalog id
              res = ShopManager.purchase ? ShopManager.purchase(key) : { success: false, reason: 'not_implemented' };
            } else {
              res = ShopManager.buyConsumable ? ShopManager.buyConsumable(key, 1) : { success: false, reason: 'not_implemented' };
            }
          }

          if (res && res.success) {
            FloatingDamageNumber.show(window.innerWidth/2, window.innerHeight/2, `Purchased ${key}`, { color: (typeof UIManager !== 'undefined') ? UIManager.themeColor('--accent-gold', '#FFB33F') : '#ffd700' });
            // re-open shop to update gold/inventory
            this.showShop();
          } else {
            const reason = res?.reason || 'unknown';
            let msg = 'Cannot buy';
            if (reason === 'no_gold') msg = 'Not enough gold';
            if (reason === 'inventory_full') msg = 'Inventory full';
            FloatingDamageNumber.show(window.innerWidth/2, window.innerHeight/2, msg, { color: (typeof UIManager !== 'undefined') ? UIManager.themeColor('--danger-red', '#C00707') : '#ff6666' });
          }
        } catch (err) { console.warn('Buy consumable failed', key, err); }
      });
    });
    overlay.appendChild(popup);
    document.body.appendChild(overlay);
    PopupAnimation.scale(popup);
  }

  // ============================================================
  // DIAMOND REWARDS
  // Spend diamonds to buy user-defined real-life rewards.
  // ============================================================
  static showDiamondRewards() {
    const state = getGameState();
    this.closeAllPopups();

    const overlay = this.createPopupOverlay();
    const popup = document.createElement('div');
    popup.className = 'popup diamond-rewards-popup';

    if (!Array.isArray(state.systemState.diamondRewards)) {
      state.systemState.diamondRewards = [];
    }

    let html = '<h2>💎 REAL-LIFE REWARDS</h2><button class="btn-close">✕</button>';
    html += `
      <div class="diamond-reward-form">
        <label class="diamond-reward-label" for="diamondRewardName">Reward Name</label>
        <input id="diamondRewardName" class="diamond-reward-input" type="text" maxlength="32" placeholder="Weekend coffee, movie night, takeout...">

        <label class="diamond-reward-label" for="diamondRewardCost">Diamond Cost</label>
        <input id="diamondRewardCost" class="diamond-reward-input" type="number" min="1" step="1" value="10">

        <button id="diamondRewardAddBtn" class="btn-large">ADD REWARD</button>
      </div>
      <div class="diamond-reward-list" id="diamondRewardList"></div>
    `;

    popup.innerHTML = html;
    popup.querySelector('.btn-close').addEventListener('click', () => this.closeAllPopups());

    overlay.appendChild(popup);
    document.body.appendChild(overlay);
    PopupAnimation.scale(popup);

    const nameInput = popup.querySelector('#diamondRewardName');
    const costInput = popup.querySelector('#diamondRewardCost');
    const addBtn = popup.querySelector('#diamondRewardAddBtn');
    const list = popup.querySelector('#diamondRewardList');

    const saveRewards = () => {
      try { state.save(); } catch (e) {}
      renderRewards();
    };

    const renderRewards = () => {
      if (!list) return;
      const rewards = Array.isArray(state.systemState.diamondRewards) ? state.systemState.diamondRewards : [];
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
          saveRewards();

          FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2, `${reward.name} bought`, {
            color: UIManager.themeColor('--accent-gold', '#FFB33F')
          });
        });
      });

      list.querySelectorAll('.btn-delete-reward').forEach(button => {
        button.addEventListener('click', (event) => {
          const index = Number(event.currentTarget.dataset.index);
          state.systemState.diamondRewards.splice(index, 1);
          saveRewards();
        });
      });
    };

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
      saveRewards();
    });

    renderRewards();
  }

  // ============================================================
  // TALISMAN DISCARD POPUP
  // ============================================================
  static showTalismanDiscard(newTalismanName) {
    const state = getGameState();
    this.closeAllPopups();

    const overlay = this.createPopupOverlay();
    const popup = document.createElement('div');
    popup.className = 'popup discard-popup';

    let html = `<h2>Replace a Talisman to equip ${newTalismanName}</h2><button class="btn-close">✕</button>`;
    html += '<div class="weapon-replace-list">';

    const talismans = state.playerState.talismans || [];
    talismans.forEach((tName, idx) => {
      const config = state.config.talismans?.[tName];
      const icon = config?.icon || '🧿';
      const desc = config?.description || 'A mysterious talisman.';
      html += `
        <div class="replace-row" data-index="${idx}" style="margin-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px;">
          <div class="replace-name" style="font-weight: bold;">Slot ${idx + 1}: ${icon} ${tName}</div>
          <div class="replace-desc" style="font-size: 10px; color: var(--text-muted, #888); margin-top: 4px; margin-bottom: 8px;">${desc}</div>
          <div class="replace-actions">
            <button class="btn-replace" data-index="${idx}">Discard</button>
          </div>
        </div>
      `;
    });

    html += '</div>';
    html += '<div class="replace-help">Choose a talisman to discard. This will replace it with the new talisman immediately.</div>';
    popup.innerHTML = html;

    popup.querySelector('.btn-close').addEventListener('click', () => this.closeAllPopups());

    overlay.appendChild(popup);
    document.body.appendChild(overlay);
    PopupAnimation.scale(popup);

    popup.querySelectorAll('.btn-replace').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = Number(e.currentTarget.dataset.index);
        PlayerManager.swapTalisman(index, newTalismanName);
        try { FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2, `Equipped ${newTalismanName}`, { color: '#eebbff' }); } catch(err) {}
        this.closeAllPopups();
        try { UIManager.refreshGameUI(); } catch (err) {}
      });
    });
  }

  // ============================================================
  // TALISMAN DETAIL POPUP
  // ============================================================
  static showTalismanDetail(talismanName, index) {
    const state = getGameState();
    this.closeAllPopups();

    const config = state.config.talismans?.[talismanName];
    const icon = config?.icon || '🧿';
    const description = config?.description || 'A mysterious talisman.';

    const overlay = this.createPopupOverlay();
    const popup = document.createElement('div');
    popup.className = 'popup talisman-detail-popup';
    popup.style.width = 'min(420px, 90vw)';
    popup.style.textAlign = 'center';

    let html = `
      <h2>${icon} ${talismanName}</h2>
      <button class="btn-close">✕</button>
      <div class="popup-scrollable-body" style="align-items: center; justify-content: center; min-height: 80px; padding: 8px 0;">
        <p class="talisman-detail-desc" style="font-size: 11px; color: #fff; line-height: 1.5; margin: 0 8px;">
          ${description}
        </p>
      </div>
      <div class="talisman-detail-actions" style="display: flex; flex-direction: column; gap: 8px; width: 100%;">
        <button class="btn-large btn-ok">OK</button>
        <button class="btn-large btn-danger btn-discard">DISCARD TALISMAN</button>
      </div>
    `;

    popup.innerHTML = html;
    
    // Event listeners
    popup.querySelector('.btn-close').addEventListener('click', () => this.closeAllPopups());
    popup.querySelector('.btn-ok').addEventListener('click', () => this.closeAllPopups());

    popup.querySelector('.btn-discard').addEventListener('click', () => {
      if (confirm(`Are you sure you want to discard the ${talismanName} Talisman? This frees up a slot for a new Talisman.`)) {
        if (state.playerState.talismans) {
          state.playerState.talismans.splice(index, 1);
          state.save();
          this.closeAllPopups();
          if (window.UIManager && UIManager.refreshGameUI) {
            UIManager.refreshGameUI();
          }
        }
      }
    });

    overlay.appendChild(popup);
    document.body.appendChild(overlay);
    if (typeof PopupAnimation !== 'undefined' && PopupAnimation.scale) {
      PopupAnimation.scale(popup);
    }
  }

  // ============================================================
  // SHRINE SKILL CHOICE POPUP
  // ============================================================
  static showShrineSkillChoice() {
    const state = getGameState();
    this.closeAllPopups();

    const overlay = this.createPopupOverlay();
    const popup = document.createElement('div');
    popup.className = 'popup buff-selection-popup';
    popup.style.width = 'min(500px, 94vw)';

    const classes = Object.keys(state.config.classes).filter(c => c !== state.playerState.className && !(state.playerState.borrowedSkills || []).includes(c));

    let html = `<h2>SHRINE REWARD: Choose a Borrowed Skill</h2><button class="btn-close">✕</button>`;
    html += '<div class="popup-scrollable-body" style="max-height: 60vh; overflow-y: auto; padding-right: 8px; margin-top: 10px;">';
    html += '<div class="buff-selection-grid" style="display: flex; flex-direction: column; gap: 12px;">';

    classes.forEach(clsName => {
      const meta = state.config.classSkillMeta?.[clsName] || {};
      const skillName = meta.name || clsName;
      const icon = meta.icon || '✨';
      const classConfig = state.config.classes?.[clsName];
      const skillDesc = classConfig?.skill || `Gain the active skill of the ${clsName} class.`;
      html += `
        <div class="buff-option" data-class="${clsName}" style="display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 8px; background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08);">
          <div class="buff-icon" style="font-size: 24px; min-width: 36px; text-align: center;">${icon}</div>
          <div style="flex: 1; min-width: 0;">
            <div class="buff-title" style="font-weight: bold; color: var(--accent-gold); font-size: 11px; margin-bottom: 4px;">${skillName}</div>
            <div class="buff-effect" style="font-size: 8px; color: var(--text-muted, #ccc); line-height: 1.4;">${skillDesc}</div>
          </div>
          <button class="btn-select btn-small" style="font-family: 'Press Start 2P', monospace; font-size: 8px; padding: 6px 10px; cursor: pointer; flex-shrink: 0; width: 110px !important; margin: 0 !important;">CHOOSE</button>
        </div>
      `;
    });

    html += '</div></div>';
    popup.innerHTML = html;

    popup.querySelector('.btn-close').addEventListener('click', () => this.closeAllPopups());

    overlay.appendChild(popup);
    document.body.appendChild(overlay);
    PopupAnimation.scale(popup);

    popup.querySelectorAll('.btn-select').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const clsName = e.target.closest('.buff-option').dataset.class;
        PlayerManager.addBorrowedSkill(clsName);
        try { FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2, `Borrowed ${clsName} Skill!`, { color: '#ffd700' }); } catch(err) {}
        this.closeAllPopups();
        try { UIManager.refreshGameUI(); } catch (err) {}
      });
    });
  }

  // ============================================================
  // STATUE TALISMAN CHOICE POPUP
  // ============================================================
  static showStatueTalismanChoice() {
    const state = getGameState();
    this.closeAllPopups();

    const overlay = this.createPopupOverlay();
    const popup = document.createElement('div');
    popup.className = 'popup talisman-selection-popup';
    popup.style.width = 'min(500px, 94vw)';

    const equipped = state.playerState.talismans || [];
    const available = Object.keys(state.config.talismans || {}).filter(t => !equipped.includes(t));

    let html = `<h2>STATUE REWARD: Choose a Talisman</h2><button class="btn-close">✕</button>`;
    html += '<div class="popup-scrollable-body" style="max-height: 60vh; overflow-y: auto; padding-right: 8px; margin-top: 10px;">';
    html += '<div class="talisman-selection-grid" style="display: flex; flex-direction: column; gap: 12px;">';

    available.forEach(tName => {
      const config = state.config.talismans[tName];
      const icon = config?.icon || '🧿';
      const desc = config?.description || 'A mysterious talisman.';
      html += `
        <div class="talisman-option" data-talisman="${tName}" style="display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 8px; background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08);">
          <div class="talisman-icon" style="font-size: 24px; min-width: 36px; text-align: center;">${icon}</div>
          <div style="flex: 1; min-width: 0;">
            <div class="talisman-title" style="font-weight: bold; color: #eebbff; font-size: 11px; margin-bottom: 4px;">${tName}</div>
            <div class="talisman-effect" style="font-size: 8px; color: var(--text-muted, #ccc); line-height: 1.4;">${desc}</div>
          </div>
          <button class="btn-select btn-small" style="font-family: 'Press Start 2P', monospace; font-size: 8px; padding: 6px 10px; cursor: pointer; flex-shrink: 0; width: 110px !important; margin: 0 !important;">CHOOSE</button>
        </div>
      `;
    });

    html += '</div></div>';
    popup.innerHTML = html;

    popup.querySelector('.btn-close').addEventListener('click', () => this.closeAllPopups());

    overlay.appendChild(popup);
    document.body.appendChild(overlay);
    PopupAnimation.scale(popup);

    popup.querySelectorAll('.btn-select').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tName = e.target.closest('.talisman-option').dataset.talisman;
        this.closeAllPopups();
        const equippedNow = state.playerState.talismans || [];
        if (equippedNow.length >= 2) {
          // Trigger replace flow
          this.showTalismanDiscard(tName);
        } else {
          PlayerManager.equipTalisman(tName);
          try { FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2, `Equipped ${tName}`, { color: '#eebbff' }); } catch(err) {}
          try { state.save(); } catch (err) {}
          try { UIManager.refreshGameUI(); } catch (err) {}
        }
      });
    });
  }

  // ============================================================
  // WEAPON DISCARD / REPLACE POPUP (Shop flow when inventory full)
  // ============================================================
  static showWeaponDiscard(newWeaponName, element = null) {
    const state = getGameState();
    this.closeAllPopups();

    const overlay = this.createPopupOverlay();
    const popup = document.createElement('div');
    popup.className = 'popup discard-popup';

    const newCfg = state.config.weapons?.[newWeaponName];
    const newIcon = newCfg?.icon || state.config.shopItemIcons?.[newWeaponName] || '⚔️';

    let html = `<h2>Replace a Weapon to buy ${newIcon} ${newWeaponName}</h2><button class="btn-close">✕</button>`;
    html += '<div class="weapon-replace-list">';

    const weapons = state.playerState.weapons || [];
    weapons.forEach((w, idx) => {
      let disp = 'Empty';
      if (w) {
        const weaponCfg = state.config.weapons?.[w];
        const weaponIcon = weaponCfg?.icon || state.config.shopItemIcons?.[w] || '⚔️';
        disp = `${weaponIcon} ${w}`;
      }
      html += `
        <div class="replace-row" data-index="${idx}">
          <div class="replace-name">Slot ${idx + 1}: ${disp}</div>
          <div class="replace-actions">
            <button class="btn-replace" data-index="${idx}">Replace</button>
          </div>
        </div>
      `;
    });

    html += '</div>';
    html += '<div class="replace-help">Choose a weapon to discard. This will replace it immediately.</div>';
    popup.innerHTML = html;

    // Event listeners
    popup.querySelector('.btn-close').addEventListener('click', () => this.closeAllPopups());

    overlay.appendChild(popup);
    document.body.appendChild(overlay);
    PopupAnimation.scale(popup);

    // Hook replace buttons
    popup.querySelectorAll('.btn-replace').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = Number(e.currentTarget.dataset.index);
        try {
          const price = (typeof ShopManager !== 'undefined' && ShopManager.getWeaponPrice) ? ShopManager.getWeaponPrice(newWeaponName) : 0;
          if ((state.playerState.gold || 0) < price) {
            FloatingDamageNumber.show(window.innerWidth/2, window.innerHeight/2, 'Not enough gold', { color: '#ff6666' });
            return;
          }

          // Replace weapon and charge player
          const replaced = PlayerManager.replaceWeapon(index, newWeaponName, element);
          if (!replaced) {
            FloatingDamageNumber.show(window.innerWidth/2, window.innerHeight/2, 'Replace failed', { color: '#ff6666' });
            return;
          }

          state.setGold((state.playerState.gold || 0) - price);
          if (state.save) state.save();
          state.eventBus && state.eventBus.emit && state.eventBus.emit(EVENTS.GOLD_CHANGED, { newGold: state.playerState.gold });
          state.eventBus && state.eventBus.emit && state.eventBus.emit(EVENTS.ATTACK, { type: 'weaponAcquired', weaponName: newWeaponName });

          FloatingDamageNumber.show(window.innerWidth/2, window.innerHeight/2, `Purchased ${newWeaponName}`, { color: '#ffd700' });
          this.closeAllPopups();
          // Rebuild shop UI if available
          try { if (window.UIManager && UIManager.buildShopItems) UIManager.buildShopItems(); } catch (e) {}
        } catch (err) {
          console.warn('Error replacing weapon', err);
        }
      });
    });
  }

  // ============================================================
  // WEAPON UPGRADE POPUP (Spend Kill Tags for weapon-specific upgrades)
  // ============================================================
  static showWeaponUpgrade(weaponName) {
    const state = getGameState();
    this.closeAllPopups();

    const overlay = this.createPopupOverlay();
    const popup = document.createElement('div');
    popup.className = 'popup weapon-upgrade-popup';

    const tags = PlayerManager.getKillTags(weaponName) || 0;
    const cost = state.config.killTagsPerUpgrade || 5;

    // Define available upgrades (each upgrade now gives both crit and damage bonuses)
    const upgrades = [
      { id: 'mastery_i', name: 'Mastery I', desc: '+1% Crit · +5% Damage', effect: { crit: 0.01, damage: 0.05 } },
      { id: 'mastery_ii', name: 'Mastery II', desc: '+2% Crit · +10% Damage', effect: { crit: 0.02, damage: 0.10 } }
    ];

    let html = `<h2>SMITH — Upgrade ${weaponName}</h2><button class="btn-close">✕</button>`;
    html += `<div class="upgrade-info">Kill Tags for ${weaponName}: <strong>${tags}</strong></div>`;
    html += `<div class="upgrade-cost">Each upgrade costs ${cost} Kill Tags</div>`;
    html += '<div class="upgrade-list">';

    upgrades.forEach(u => {
      html += `
        <div class="upgrade-row" data-upgrade="${u.id}">
          <div class="upgrade-name">${u.name}</div>
          <div class="upgrade-desc">${u.desc}</div>
          <div class="upgrade-actions"><button class="btn-upgrade" data-upgrade="${u.id}">Upgrade</button></div>
        </div>
      `;
    });

    html += '</div>';
    popup.innerHTML = html;

    popup.querySelector('.btn-close').addEventListener('click', () => this.closeAllPopups());

    overlay.appendChild(popup);
    document.body.appendChild(overlay);
    PopupAnimation.scale(popup);

    // Hook upgrade buttons
    popup.querySelectorAll('.btn-upgrade').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.upgrade;
        const upgrade = upgrades.find(u => u.id === id);
        if (!upgrade) return;

        if ((PlayerManager.getKillTags(weaponName) || 0) < cost) {
          FloatingDamageNumber.show(window.innerWidth/2, window.innerHeight/2, 'Not enough Kill Tags', { color: '#ff6666' });
          return;
        }

        // Spend tags and add upgrade
        const ok = PlayerManager.spendKillTags(weaponName, cost);
        if (!ok) {
          FloatingDamageNumber.show(window.innerWidth/2, window.innerHeight/2, 'Failed to spend tags', { color: '#ff6666' });
          return;
        }

        PlayerManager.addWeaponUpgrade(weaponName, upgrade.effect || upgrade);
        // persist
        try { const s = getGameState(); if (s.save) s.save(); } catch (e) {}

        FloatingDamageNumber.show(window.innerWidth/2, window.innerHeight/2, `Upgraded ${weaponName}`, { color: '#ffd700' });
        this.closeAllPopups();
      });
    });
  }
  
  // ============================================================
  // DEATH SCREEN
  // ============================================================
  
  static showDeathScreen(stats) {
    const overlay = document.createElement('div');
    overlay.className = 'popup-overlay';
    overlay.style.pointerEvents = 'auto';
    
    const popup = document.createElement('div');
    popup.className = 'popup death-popup';
    popup.style.pointerEvents = 'auto';
    
    const html = `
      <h2>☠️ YOU HAVE FALLEN</h2>
      <p>The Nemesis grows stronger...</p>
      <div class="death-stats">
        <p>Class: <strong>${stats.class}</strong></p>
        <p>Stage reached: <strong>${stats.stage}</strong></p>
        <p>Level: <strong>${stats.level}</strong></p>
        <p>Enemies defeated: <strong>${stats.enemiesDefeated}</strong></p>
        <p>Bosses slain: <strong>${stats.bossesSailed}</strong></p>
        <p>Gold earned: <strong>${stats.goldEarned}</strong></p>
      </div>
      <p class="death-quote">"Your ambition crumbled to dust."</p>
      <div class="button-group">
        <button class="btn-large btn-new-class">CHOOSE NEW CLASS</button>
        <button class="btn-large btn-tycoon" style="background: linear-gradient(135deg, #fbbf24, #d97706); color: #000; font-weight: bold; border: 1px solid #f59e0b; margin-top: 8px;">ENTER TYCOON MODE</button>
        <button class="btn-large btn-quit">QUIT TO MENU</button>
      </div>
    `;
    
    popup.innerHTML = html;
    
    popup.querySelector('.btn-new-class').addEventListener('click', () => {
      this.closeAllPopups();
      this.showClassSelection();
    });

    popup.querySelector('.btn-tycoon').addEventListener('click', () => {
      this.closeAllPopups();
      if (window.TycoonManager) {
        // Calculate task completion rate of the run to pass as rate multiplier
        let completionRate = 1.0;
        try {
          const state = getGameState();
          if (state && state.dailiesState) {
            const dailies = state.dailiesState.dailies || [];
            const completed = dailies.filter(d => d.completed).length;
            const total = dailies.length;
            completionRate = total > 0 ? (completed / total) : 1.0;
          }
        } catch(e) {}
        window.TycoonManager.enterTycoonMode(completionRate);
      } else {
        alert("Tycoon Mode engine is not loaded yet.");
      }
    });
    
    popup.querySelector('.btn-quit').addEventListener('click', () => {
      location.reload();
    });
    
    overlay.appendChild(popup);
    document.body.appendChild(overlay);
    PopupAnimation.scale(popup);
  }
  
  // ============================================================
  // VICTORY SCREEN
  // ============================================================
  
  static showVictoryScreen(stats) {
    const overlay = document.createElement('div');
    overlay.className = 'popup-overlay';
    overlay.style.pointerEvents = 'auto';
    
    const popup = document.createElement('div');
    popup.className = 'popup victory-popup';
    popup.style.pointerEvents = 'auto';
    
    const html = `
      <h2>✨ VICTORY!</h2>
      <p>You have toppled the Nemesis.</p>
      <p>The cycle is broken… for now.</p>
      <div class="victory-stats">
        <p>Class: <strong>${stats.class}</strong></p>
        <p>Total days played: <strong>${stats.daysSurvived}</strong></p>
        <p>Tasks completed: <strong>${stats.tasksCompleted}</strong></p>
        <p>Gold accumulated: <strong>${stats.goldEarned}</strong></p>
      </div>
      <p class="victory-quote">"Your ambition became a light in the void."</p>
      <div class="button-group">
        <button class="btn-large btn-new-run">NEW RUN</button>
        <button class="btn-large btn-main-menu">MAIN MENU</button>
      </div>
    `;
    
    popup.innerHTML = html;
    
    popup.querySelector('.btn-new-run').addEventListener('click', () => {
      this.closeAllPopups();
      this.showClassSelection();
    });
    
    popup.querySelector('.btn-main-menu').addEventListener('click', () => {
      location.reload();
    });
    
    overlay.appendChild(popup);
    document.body.appendChild(overlay);
    PopupAnimation.scale(popup);
  }
  
  // ============================================================
  // CLASS SELECTION
  // ============================================================
  
  static showClassSelection() {
    const overlay = document.createElement('div');
    overlay.className = 'popup-overlay';
    overlay.style.pointerEvents = 'auto';
    
    const popup = document.createElement('div');
    popup.className = 'popup class-selection-popup';
    popup.style.pointerEvents = 'auto';
    
    let html = '<h2>CHOOSE YOUR CLASS</h2><div class="class-grid">';
    
    const state = getGameState();
    Object.entries(state.config.classes).forEach(([className, data]) => {
      const skillMeta = (state.config.classSkillMeta && state.config.classSkillMeta[className]) || {};
      const skillIcon = skillMeta.icon || '✨';
      const skillColor = skillMeta.color || '#38bdf8';
      html += `
        <div class="class-card" data-class="${className}">
          <h3>${className}</h3>
          <div class="class-stats">
            <p>HP: ${data.hp}</p>
            <p>Mana: ${data.mana}</p>
          </div>
          <p class="class-passive">${data.passive}</p>
          <p class="class-skill" style="color: ${skillColor}">${skillIcon} ${data.skill || 'No skill'}</p>
          <button class="btn-select-class">SELECT</button>
        </div>
      `;
    });
    
    html += '</div>';
    popup.innerHTML = html;
    
    popup.querySelectorAll('.btn-select-class').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const className = e.target.closest('.class-card').dataset.class;
        PlayerManager.initializeClass(className);
        TaskManager.ensureStarterTasks();
        // Before initializing the run (which computes enemy HP from maxAp), prompt player to add dailies
        this.closeAllPopups();
        this.showAddDailiesPrompt();
        const state = getGameState();
        state.save();
      });
    });
    
    overlay.appendChild(popup);
    document.body.appendChild(overlay);
    PopupAnimation.scale(popup);
  }

  // ============================================================
  // ADD DAILIES PROMPT (Shown once after class selection)
  // ============================================================
  static showAddDailiesPrompt() {
    const state = getGameState();
    this.closeAllPopups();

    const overlay = this.createPopupOverlay();
    overlay.style.pointerEvents = 'auto';

    const popup = document.createElement('div');
    popup.className = 'popup add-dailies-popup';

    const attrsOptions = state.config.attributes.map(a => `<option value="${a}">${a}</option>`).join('');
    popup.innerHTML = `
      <h2>ADD YOUR DAILIES</h2>
      <p>These dailies determine your <strong>MAX AP</strong>. Add or adjust them now before starting.</p>
      <div class="add-daily-form">
        <input id="newDailyName" placeholder="Daily name (e.g. 'Stretch')" />
        <select id="newDailyDiff">
          <option>Easy</option>
          <option>Medium</option>
          <option>Hard</option>
          <option>Ultra</option>
        </select>
        <select id="newDailyAttr">${attrsOptions}</select>
        <input id="newDailyMax" type="number" min="1" value="1" style="width:68px" />
        <button id="addDailyBtn" class="btn-small">ADD</button>
      </div>

      <h3>Current Dailies</h3>
      <div id="addDailiesList" class="dailies-list"></div>

      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px;">
        <button id="skipStartBtn" class="btn-small">SKIP & START</button>
        <button id="startRunBtn" class="btn-large">START RUN</button>
      </div>
    `;

    overlay.appendChild(popup);
    document.body.appendChild(overlay);
    PopupAnimation.scale(popup);

    const listEl = popup.querySelector('#addDailiesList');
    const renderList = () => {
      const dailies = TaskManager.getAllDailies();
      if (!dailies.length) {
        listEl.innerHTML = '<p class="muted">No dailies yet</p>';
        return;
      }

      listEl.innerHTML = dailies.map(d => `
        <div class="add-daily-row">
          <div class="add-daily-info">${d.name} — <strong>${d.difficulty}</strong> • ${d.attribute} • ${d.maxCompletionsPerDay}/day</div>
          <div class="add-daily-actions">
            <button class="btn-remove-daily" data-id="${d.id}">REMOVE</button>
          </div>
        </div>
      `).join('');

      // attach remove handlers
      listEl.querySelectorAll('.btn-remove-daily').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const id = e.target.dataset.id;
          TaskManager.removeDaily(id);
          renderList();
        });
      });
    };

    // Add daily
    popup.querySelector('#addDailyBtn').addEventListener('click', () => {
      const name = (popup.querySelector('#newDailyName').value || 'New Daily').trim();
      const diff = popup.querySelector('#newDailyDiff').value;
      const attr = popup.querySelector('#newDailyAttr').value;
      const max = Math.max(1, Number(popup.querySelector('#newDailyMax').value) || 1);

      const d = TaskManager.addDaily(name, diff, attr, max);
      if (d) {
        renderList();
        UIManager.updateDailiesList();
        const state2 = getGameState();
        state2.save();
      }
    });

    // Skip & start: start run without further changes
    popup.querySelector('#skipStartBtn').addEventListener('click', () => {
      this.closeAllPopups();
      const state2 = getGameState();
      StageManager.initializeRun(1);
      UIManager.initializeUI();
      UIManager.refreshGameUI();
      state2.save();
    });

    // Start run (confirm current dailies)
    popup.querySelector('#startRunBtn').addEventListener('click', () => {
      this.closeAllPopups();
      const state2 = getGameState();
      // Ensure MAX_AP recalculated
      PlayerManager.recalculateMaxAp();
      StageManager.initializeRun(1);
      UIManager.initializeUI();
      UIManager.refreshGameUI();
      state2.save();
    });

    renderList();
  }

  static showAddDailyPopup() {
    const state = getGameState();
    this.closeAllPopups();

    const overlay = this.createPopupOverlay();
    overlay.style.pointerEvents = 'auto';

    const popup = document.createElement('div');
    popup.className = 'popup add-dailies-popup';

    const attrsOptions = state.config.attributes.map(a => `<option value="${a}">${a}</option>`).join('');
    popup.innerHTML = `
      <h2>ADD NEW DAILY</h2>
      <button class="btn-close">✕</button>
      <div class="popup-scrollable-body" style="padding-top: 10px;">
        <div class="add-daily-form" style="display: flex; flex-direction: column; gap: 8px;">
          <label>Daily Name</label>
          <input id="newDailyName" placeholder="Daily name (e.g. 'Stretch')" />
          <label>Difficulty</label>
          <select id="newDailyDiff">
            <option>Easy</option>
            <option>Medium</option>
            <option>Hard</option>
            <option>Ultra</option>
          </select>
          <label>Attribute</label>
          <select id="newDailyAttr">${attrsOptions}</select>
          <label>Max completions per day</label>
          <input id="newDailyMax" type="number" min="1" value="1" />
          <button id="addDailyBtn" class="btn-large" style="margin-top: 10px;">ADD DAILY</button>
        </div>
      </div>
    `;

    popup.querySelector('.btn-close').addEventListener('click', () => this.closeAllPopups());
    overlay.appendChild(popup);
    document.body.appendChild(overlay);

    popup.querySelector('#addDailyBtn').addEventListener('click', () => {
      const name = (popup.querySelector('#newDailyName').value || 'New Daily').trim();
      const diff = popup.querySelector('#newDailyDiff').value;
      const attr = popup.querySelector('#newDailyAttr').value;
      const max = Math.max(1, Number(popup.querySelector('#newDailyMax').value) || 1);

      const d = TaskManager.addDaily(name, diff, attr, max);
      if (d) {
        this.closeAllPopups();
        state.save();
      }
    });

    PopupAnimation.scale(popup);
  }
  
  // ============================================================
  // DIALOGUE POPUP
  // ============================================================
  
  static showDialogue(speakerName, message, media = null) {
    const options = (media && typeof media === 'object') ? media : { image: media };
    const image = options?.image || null;

    const overlay = this.createPopupOverlay();
    const popup = document.createElement('div');
    popup.className = 'popup dialogue-popup dialogue-card';

    popup.innerHTML = `
      <div class="dialogue-media" aria-label="${speakerName}">
        ${image ? `<img src="${image}" alt="${speakerName}">` : '<div class="dialogue-media-placeholder">text</div>'}
      </div>
      <div class="dialogue-content">
        <div class="dialogue-title">${speakerName}</div>
        <div class="dialogue-text">${message || 'text'}</div>
      </div>
    `;

    const closeCard = () => {
      popup.classList.add('fade-out');
      overlay.classList.add('fade-out');
      setTimeout(() => {
        try { overlay.remove(); } catch (e) {}
      }, 220);
    };

    popup.addEventListener('click', closeCard);

    overlay.appendChild(popup);
    document.body.appendChild(overlay);
    PopupAnimation.scale(popup, 220);
    return true;
  }

  static showConfirm(title, message, onConfirm) {
    this.closeAllPopups();
    const overlay = this.createPopupOverlay();
    const popup = document.createElement('div');
    popup.className = 'popup confirm-popup';

    popup.innerHTML = `
      <h2>${title || 'Confirm'}</h2>
      <div class="confirm-message">${message || ''}</div>
      <div class="confirm-actions">
        <button class="btn-cancel">Cancel</button>
        <button class="btn-confirm">Confirm</button>
      </div>
    `;

    popup.querySelector('.btn-cancel').addEventListener('click', () => this.closeAllPopups());
    popup.querySelector('.btn-confirm').addEventListener('click', () => {
      try { if (typeof onConfirm === 'function') onConfirm(); } catch (e) { console.error('Confirm error:', e); }
      this.closeAllPopups();
    });

    overlay.appendChild(popup);
    document.body.appendChild(overlay);
    PopupAnimation.scale(popup);
    return true;
  }

  static showAlert(title, message, onOk) {
    this.closeAllPopups();
    const overlay = this.createPopupOverlay();
    const popup = document.createElement('div');
    popup.className = 'popup alert-popup';
    popup.style.width = 'min(400px, 90vw)';
    popup.style.textAlign = 'center';

    popup.innerHTML = `
      <h2>${title || 'Warning'}</h2>
      <div class="alert-message" style="font-size: 10px; color: #fff; margin: 12px 0; line-height: 1.4; font-family: 'Press Start 2P', monospace;">${message || ''}</div>
      <div class="alert-actions" style="margin-top: 16px;">
        <button class="btn-large btn-ok">OK</button>
      </div>
    `;

    popup.querySelector('.btn-ok').addEventListener('click', () => {
      try { if (typeof onOk === 'function') onOk(); } catch (e) { console.error('Alert error:', e); }
      this.closeAllPopups();
    });

    overlay.appendChild(popup);
    document.body.appendChild(overlay);
    PopupAnimation.scale(popup);
    return true;
  }

  static showShopItemDetails(item) {
    if (!item) return false;
    const overlay = this.createPopupOverlay();
    const popup = document.createElement('div');
    popup.className = 'popup shop-item-popup';

    const icon = item.icon || '🧩';
    const desc = item.desc || item.description || 'No description';
    const detail = item.detail || item.details || '';
    const price = Number(item.price || 0);

    popup.innerHTML = `
      <h2>ITEM DETAILS</h2>
      <button class="btn-close">✕</button>
      <div class="shop-item-popup-icon">${icon}</div>
      <div class="shop-item-popup-name">${item.name || 'Unknown Item'}</div>
      <div class="shop-item-popup-desc">${desc}</div>
      ${detail ? `<div class="shop-item-popup-detail">${detail}</div>` : ''}
      <div class="shop-item-popup-price">Cost: ${price}</div>
      <button class="btn-large" id="shopDetailsBuyBtn">BUY</button>
    `;

    popup.querySelector('.btn-close').addEventListener('click', () => this.closeAllPopups());
    popup.querySelector('#shopDetailsBuyBtn').addEventListener('click', () => {
      const result = (typeof item.onBuy === 'function') ? item.onBuy() : undefined;
      if (result !== false) this.closeAllPopups();
    });

    overlay.appendChild(popup);
    document.body.appendChild(overlay);
    PopupAnimation.scale(popup);
    return true;
  }

  static showWeaponElementChoice(weaponName, onSelect) {
    const state = getGameState();
    this.closeAllPopups();

    const overlay = this.createPopupOverlay();
    const popup = document.createElement('div');
    popup.className = 'popup weapon-element-popup';

    const elements = Array.isArray(state.config.weaponElementTypes) && state.config.weaponElementTypes.length
      ? state.config.weaponElementTypes
      : ['Air', 'Earth', 'Fire', 'Water', 'Aether'];

    let html = `<h2>CHOOSE ELEMENT</h2><button class="btn-close">✕</button>`;
    html += `<div class="weapon-element-weapon">${weaponName}</div>`;
    html += '<div class="weapon-element-grid">';
    elements.forEach(element => {
      html += `<button class="btn-large weapon-element-option" data-element="${element}">${element}</button>`;
    });
    html += `<button class="btn-large weapon-element-option neutral" data-element="">Neutral</button>`;
    html += '</div>';
    html += '<div class="weapon-element-note">This element is saved with the weapon when it is acquired.</div>';

    popup.innerHTML = html;
    popup.querySelector('.btn-close').addEventListener('click', () => this.closeAllPopups());

    overlay.appendChild(popup);
    document.body.appendChild(overlay);
    PopupAnimation.scale(popup);

    popup.querySelectorAll('.weapon-element-option').forEach(btn => {
      btn.addEventListener('click', (event) => {
        const element = event.currentTarget.dataset.element || null;
        this.closeAllPopups();
        if (typeof onSelect === 'function') onSelect(element);
      });
    });

    return true;
  }
  
  // ============================================================
  // PAUSE MENU
  // ============================================================
  
  static showPauseMenu() {
    const state = getGameState();
    const isPaused = !!state.systemState.isPaused;
    const dialogueEnabled = state.systemState.dialoguePopupsEnabled !== false;

    const overlay = document.createElement('div');
    overlay.className = 'popup-overlay';
    overlay.style.pointerEvents = 'auto';
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.closeAllPopups();
      }
    });
    
    const popup = document.createElement('div');
    popup.className = 'popup pause-popup';
    popup.style.pointerEvents = 'auto';
    
    const html = `
      <h2>⚙️ GAME MENU</h2>
      <p>All timers and regen are frozen when paused.</p>
      <div class="pause-menu">
        <button class="btn-pause-action ${isPaused ? 'active' : ''}" id="togglePauseBtn" style="${isPaused ? 'border-color: var(--accent-gold); color: var(--accent-gold);' : ''}">
          ${isPaused ? '▶️ RESUME GAMEPLAY' : '⏸️ PAUSE GAMEPLAY'}
        </button>
        <button class="btn-pause-action ${dialogueEnabled ? 'active' : ''}" id="toggleDialogueBtn" style="${dialogueEnabled ? 'border-color: var(--accent-gold); color: var(--accent-gold);' : ''}">
          💬 Dialogue Popups: ${dialogueEnabled ? 'ON' : 'OFF'}
        </button>
        <button class="btn-pause-action" id="closeMenuBtn">✕ CLOSE MENU</button>
        <button class="btn-pause-action" id="forceRefreshBtn">🔄 FORCE REFRESH</button>
        <button class="btn-pause-action" id="backupBtn">💾 BACKUP / RESTORE</button>
        <button class="btn-pause-action" id="buildCompendiumBtn">📖 BUILD COMPENDIUM</button>
        <button class="btn-pause-action" id="resetLayoutBtn">📐 RESET LAYOUT</button>
        <button class="btn-pause-action" id="resetDataBtn">🗑️ RESET SAVE DATA</button>
        <button class="btn-pause-action" id="quitBtn">🚪 QUIT TO MENU</button>
      </div>
      <div class="pause-cheat-box">
        <label for="cheatCommandInput">CHEAT COMMAND</label>
        <div class="pause-cheat-row">
          <input id="cheatCommandInput" type="text" spellcheck="false" autocomplete="off" placeholder="stage 4 b 2 | level 3 | class Knight | gold 999 | diamonds 100 | help" />
          <button class="btn-pause-action" id="runCheatBtn">RUN</button>
        </div>
        <div class="pause-cheat-help">Examples: <span>stage 4 b 2</span> · <span>level 3</span> · <span>class Knight</span> · <span>weapon Uzi</span> · <span>gold 999</span> · <span>diamonds 100</span></div>
      </div>
    `;
    
    popup.innerHTML = html;
    
    const toggleBtn = popup.querySelector('#togglePauseBtn');
    toggleBtn.addEventListener('click', () => {
      if (state.systemState.isPaused) {
        state.resume();
        toggleBtn.textContent = '⏸️ PAUSE GAMEPLAY';
        toggleBtn.classList.remove('active');
        toggleBtn.style.borderColor = '';
        toggleBtn.style.color = '';
      } else {
        state.pause();
        toggleBtn.textContent = '▶️ RESUME GAMEPLAY';
        toggleBtn.classList.add('active');
        toggleBtn.style.borderColor = 'var(--accent-gold)';
        toggleBtn.style.color = 'var(--accent-gold)';
      }
      try { state.save(); } catch (e) {}
      try { UIManager.refreshGameUI(); } catch (e) {}
    });

    const toggleDialogueBtn = popup.querySelector('#toggleDialogueBtn');
    toggleDialogueBtn.addEventListener('click', () => {
      const current = state.systemState.dialoguePopupsEnabled !== false;
      state.systemState.dialoguePopupsEnabled = !current;
      const newVal = !current;
      toggleDialogueBtn.textContent = `💬 Dialogue Popups: ${newVal ? 'ON' : 'OFF'}`;
      if (newVal) {
        toggleDialogueBtn.classList.add('active');
        toggleDialogueBtn.style.borderColor = 'var(--accent-gold)';
        toggleDialogueBtn.style.color = 'var(--accent-gold)';
      } else {
        toggleDialogueBtn.classList.remove('active');
        toggleDialogueBtn.style.borderColor = '';
        toggleDialogueBtn.style.color = '';
      }
      try { state.save(); } catch (e) {}
    });

    popup.querySelector('#closeMenuBtn').addEventListener('click', () => {
      this.closeAllPopups();
    });

    popup.querySelector('#forceRefreshBtn').addEventListener('click', async () => {
      try {
        if (typeof window.forceRefreshNemesisApp === 'function') {
          await window.forceRefreshNemesisApp();
        } else {
          location.reload();
        }
      } catch (error) {
        console.warn('Force refresh failed', error);
        location.reload();
      }
    });

    popup.querySelector('#backupBtn').addEventListener('click', () => {
      this.showDataBackup();
    });

    popup.querySelector('#buildCompendiumBtn').addEventListener('click', () => {
      this.showBuildCompendium();
    });

    popup.querySelector('#resetLayoutBtn').addEventListener('click', () => {
      this.showConfirm('Reset Layout', 'Reset positions of game circle, satchel, stats, weapons, and HUD to default?', () => {
        localStorage.removeItem('nemesis_hud_pos');
        localStorage.removeItem('nemesis_satchel_pos');
        localStorage.removeItem('nemesis_weapon_pos');
        localStorage.removeItem('nemesis_center_pos');
        localStorage.removeItem('nemesis_run_graph_pos');
        location.reload();
      });
    });
    
    // attributes moved to center modal button; pause menu no longer exposes attributes here

    popup.querySelector('#resetDataBtn').addEventListener('click', () => {
      this.showConfirm('Reset Save Data', 'Delete all local save data for Nemesis? This cannot be undone.', () => {
        localStorage.removeItem('nemesis_data');
        localStorage.removeItem('nemesis_planner_data');
        location.reload();
      });
    });
    
    popup.querySelector('#quitBtn').addEventListener('click', () => {
      this.showConfirm('Quit to Menu', 'Are you sure? Unsaved progress will be lost.', () => {
        location.reload();
      });
    });

    const cheatInput = popup.querySelector('#cheatCommandInput');
    const runCheat = () => {
      const value = String(cheatInput?.value || '').trim();
      const result = this.runCheatCommand(value);
      if (result?.message) {
        try {
          FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2, result.message, { color: result.ok ? '#44ff44' : '#ff6666', duration: 1400 });
        } catch (e) {}
      }
      if (result?.ok) {
        try { getGameState().save(); } catch (e) {}
      }
    };

    popup.querySelector('#runCheatBtn').addEventListener('click', runCheat);
    cheatInput?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        runCheat();
      }
    });
    
    overlay.appendChild(popup);
    document.body.appendChild(overlay);
    PopupAnimation.scale(popup);
  }

  static showDataBackup() {
    this.closeAllPopups();

    const state = getGameState();
    const overlay = this.createPopupOverlay();
    const popup = document.createElement('div');
    popup.className = 'popup backup-popup';

    popup.innerHTML = `
      <h2>BACKUP / RESTORE</h2>
      <button class="btn-close">✕</button>
      <p class="backup-help">Export is plain text JSON. Paste it back here to restore every saved data file.</p>
      <textarea id="backupDataArea" class="backup-data-area" spellcheck="false" placeholder="Exported backup text appears here..."></textarea>
      <div class="backup-actions">
        <button class="btn-pause-action" id="backupExportBtn">EXPORT</button>
        <button class="btn-pause-action" id="backupCopyBtn">COPY</button>
        <button class="btn-pause-action" id="backupDownloadBtn">DOWNLOAD</button>
        <label class="btn-pause-action backup-file-label">
          LOAD FILE
          <input id="backupFileInput" type="file" accept=".json,.txt,application/json,text/plain" />
        </label>
        <button class="btn-pause-action" id="backupImportBtn">IMPORT</button>
      </div>
    `;

    const close = () => this.closeAllPopups();
    popup.querySelector('.btn-close').addEventListener('click', close);

    const area = popup.querySelector('#backupDataArea');
    const fillExport = () => {
      try {
        area.value = state.exportUserData();
        area.focus();
        area.select();
      } catch (error) {
        area.value = '';
        console.warn('Failed to export user data', error);
      }
    };

    popup.querySelector('#backupExportBtn').addEventListener('click', fillExport);

    popup.querySelector('#backupCopyBtn').addEventListener('click', async () => {
      const text = area.value || state.exportUserData();
      area.value = text;
      try {
        await navigator.clipboard.writeText(text);
        FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2, 'Copied', { color: '#44ff44', duration: 900 });
      } catch (error) {
        console.warn('Clipboard copy failed', error);
        FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2, 'Copy failed', { color: '#ff6666', duration: 900 });
      }
    });

    popup.querySelector('#backupDownloadBtn').addEventListener('click', () => {
      const text = area.value || state.exportUserData();
      const blob = new Blob([text], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `nemesis-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    });

    popup.querySelector('#backupFileInput').addEventListener('change', async (event) => {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      try {
        area.value = await file.text();
        area.focus();
        area.select();
      } catch (error) {
        console.warn('Failed to read backup file', error);
      }
    });

    popup.querySelector('#backupImportBtn').addEventListener('click', () => {
      const text = String(area.value || '').trim();
      if (!text) {
        FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2, 'Paste backup text first', { color: '#ff6666', duration: 1200 });
        return;
      }

      PopupsManager.showConfirm('Import Backup?', 'This will overwrite local saved data with the pasted backup text.', () => {
        const result = state.importUserData(text);
        if (!result?.success) {
          FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2, 'Import failed', { color: '#ff6666', duration: 1200 });
          return;
        }

        FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2, 'Imported', { color: '#44ff44', duration: 1200 });
        try { UIManager.refreshGameUI(); } catch (error) {}
        close();
      });
    });

    overlay.appendChild(popup);
    document.body.appendChild(overlay);
    PopupAnimation.scale(popup);
    fillExport();
  }

  static runCheatCommand(rawCommand) {
    const state = getGameState();
    const command = String(rawCommand || '').trim();
    if (!command) return { ok: false, message: 'Enter a command' };

    const lower = command.toLowerCase();
    const weaponNames = Object.keys(state.config?.weapons || {});
    const normalize = (value) => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ');
    const findWeaponName = (query) => {
      const normalizedQuery = normalize(query);
      return weaponNames.find(name => normalize(name) === normalizedQuery || normalize(name).includes(normalizedQuery));
    };

    const ensureRuntime = () => {
      if (!state.combatState) state.combatState = {};
      if (!Array.isArray(state.playerState.weapons)) state.playerState.weapons = [null, null];
      if (!Array.isArray(state.playerState.weaponElements)) state.playerState.weaponElements = new Array(state.playerState.weapons.length).fill(null);
      if (!state.playerState.killTagsByWeapon) state.playerState.killTagsByWeapon = {};
    };

    const clampStage = (value) => Math.max(1, Math.min(7, Math.floor(Number(value) || 1)));
    const clampLevel = (value) => Math.max(1, Math.min(5, Math.floor(Number(value) || 1)));
    const normalizeVariant = (value) => {
      const variant = String(value || '').trim().toUpperCase();
      return variant === 'B' ? 'B' : 'A';
    };
    const jumpToStage = (targetStage, targetLevel = 1, targetVariant = null) => {
      if (typeof StageManager === 'undefined' || typeof StageManager.generateLevel !== 'function') {
        return { ok: false, message: 'Stage helper unavailable' };
      }

      state.stageState.stage = clampStage(targetStage);
      state.stageState.level = clampLevel(targetLevel);
      if (targetVariant) {
        state.stageState.stageVariation = normalizeVariant(targetVariant);
      }

      StageManager.generateLevel(state.stageState.level);
      try { UIManager.refreshGameUI?.(); } catch (e) {}
      return { ok: true, message: `Stage ${state.stageState.stage}-${state.stageState.stageVariation} L${state.stageState.level}` };
    };

    const setResource = (key, amount) => {
      const value = Math.max(0, Math.floor(Number(amount) || 0));
      if (key === 'gold' && typeof state.setGold === 'function') state.setGold(value);
      else if (key === 'hp') state.setHp ? state.setHp(value) : state.playerState.hp = value;
      else if (key === 'mana') state.setMana ? state.setMana(value) : state.playerState.mana = value;
      else if (key === 'ap') state.setAp ? state.setAp(value) : state.playerState.ap = value;
      else if (key === 'diamonds' && typeof state.setDiamonds === 'function') state.setDiamonds(value);
      else if (key === 'lootboxKeys' && typeof state.setLootboxKeys === 'function') state.setLootboxKeys(value);
      else state.playerState[key] = value;
    };

    try {
      ensureRuntime();

      if (lower === 'help' || lower === '?') {
        return { ok: true, message: 'Commands: stage N [A/B] [level], level N [A/B], boss N [A/B], weapon NAME, element TYPE, all weapons, gold N, diamonds N, hp N, mana N, ap N, pp N, heal full, enemy hp half, kill tags NAME N, class NAME, event TYPE (shrine/statue/sacred tree/none), reset nemesis attributes to yours' };
      }

      if (lower.startsWith('stage ') || lower.startsWith('boss ') || lower.startsWith('level ')) {
        const tokens = command.split(/\s+/).filter(Boolean);
        const keyword = (tokens.shift() || '').toLowerCase();
        const numericTokens = [];
        let variantToken = null;

        tokens.forEach((token) => {
          if (/^[ab]$/i.test(token)) {
            variantToken = token;
          } else if (/^\d+$/.test(token)) {
            numericTokens.push(Number(token));
          }
        });

        if (keyword === 'level') {
          const targetLevel = numericTokens[0];
          if (!Number.isFinite(targetLevel)) return { ok: false, message: 'Usage: level 3' };
          return jumpToStage(state.stageState.stage || 1, targetLevel, variantToken);
        }

        const targetStage = numericTokens[0];
        if (!Number.isFinite(targetStage)) return { ok: false, message: 'Usage: stage 4 b 2' };
        const targetLevel = keyword === 'boss' ? (numericTokens[1] || 5) : (numericTokens[1] || 1);
        return jumpToStage(targetStage, targetLevel, variantToken);
      }

      if (lower === 'all weapons' || lower === 'give all weapons') {
        const slots = state.playerState.weapons.length;
        const fill = weaponNames.slice(0, slots);
        fill.forEach((name, index) => {
          state.playerState.weapons[index] = name;
          state.playerState.weaponElements[index] = null;
          state.playerState.killTagsByWeapon[name] = state.playerState.killTagsByWeapon[name] || 0;
        });
        state.playerState.activeWeapon = 0;
        this.closeAllPopups();
        try { UIManager.refreshGameUI?.(); } catch (e) {}
        return { ok: true, message: 'All weapons equipped' };
      }

      if (lower === 'reset tycoon') {
        localStorage.removeItem('nemesis_tycoon_data');
        this.closeAllPopups();
        if (window.TycoonManager) {
          window.TycoonManager.enterTycoonMode(1.0);
        }
        return { ok: true, message: 'Resetting to Tycoon Mode' };
      }

      if (lower === 'tycoon' || lower === 'tycoon mode') {
        this.closeAllPopups();
        if (window.TycoonManager) {
          window.TycoonManager.enterTycoonMode();
        }
        return { ok: true, message: 'Entering Tycoon Mode' };
      }

      if (lower.startsWith('weapon ') || lower.startsWith('give weapon ')) {
        const weaponQuery = command.replace(/^give\s+weapon\s+/i, '').replace(/^weapon\s+/i, '').trim();
        const weaponName = findWeaponName(weaponQuery);
        if (!weaponName) return { ok: false, message: 'Weapon not found' };
        const added = PlayerManager.addWeapon(weaponName);
        if (!added) {
          const replaced = PlayerManager.replaceWeapon(state.playerState.activeWeapon || 0, weaponName);
          if (!replaced) return { ok: false, message: 'No free slot' };
        }
        try { UIManager.refreshGameUI?.(); } catch (e) {}
        return { ok: true, message: `Given ${weaponName}` };
      }

      if (lower.startsWith('element ')) {
        const query = command.slice(8).trim().toLowerCase();
        const elements = state.config.weaponElementTypes || ['Air', 'Earth', 'Fire', 'Water', 'Aether'];
        let matched = elements.find(el => el.toLowerCase() === query);
        if (query === 'none' || query === 'neutral' || query === 'null' || query === 'clear') {
          matched = null;
        } else if (!matched) {
          return { ok: false, message: `Element not found. Available: ${elements.join(', ')}, None` };
        }
        
        const activeIdx = state.playerState.activeWeapon || 0;
        state.playerState.weaponElements[activeIdx] = matched;
        try { UIManager.refreshGameUI?.(); } catch (e) {}
        return { ok: true, message: `Active weapon element set to ${matched || 'Neutral'}` };
      }

      if (lower.startsWith('gold ')) {
        setResource('gold', command.slice(5));
        try { UIManager.refreshGameUI?.(); } catch (e) {}
        return { ok: true, message: 'Gold set' };
      }

      if (lower.startsWith('diamonds ') || lower.startsWith('diamond ')) {
        const val = command.replace(/^diamonds\s+/i, '').replace(/^diamond\s+/i, '').trim();
        setResource('diamonds', val);
        try { UIManager.refreshGameUI?.(); } catch (e) {}
        return { ok: true, message: `Diamonds set to ${state.playerState.diamonds}` };
      }

      if (lower.startsWith('keys ') || lower.startsWith('key ')) {
        const val = command.replace(/^keys\s+/i, '').replace(/^key\s+/i, '').trim();
        setResource('lootboxKeys', val);
        try { UIManager.refreshGameUI?.(); } catch (e) {}
        return { ok: true, message: `Lootbox keys set to ${state.playerState.lootboxKeys}` };
      }

      if (lower.startsWith('hp ')) {
        setResource('hp', command.slice(3));
        try { UIManager.refreshGameUI?.(); } catch (e) {}
        return { ok: true, message: 'HP set' };
      }

      if (lower.startsWith('mana ')) {
        setResource('mana', command.slice(5));
        try { UIManager.refreshGameUI?.(); } catch (e) {}
        return { ok: true, message: 'Mana set' };
      }

      if (lower.startsWith('ap ')) {
        setResource('ap', command.slice(3));
        try { UIManager.refreshGameUI?.(); } catch (e) {}
        return { ok: true, message: 'AP set' };
      }

      if (lower.startsWith('pp ') || lower.startsWith('petpoint ') || lower.startsWith('petpoints ')) {
        const val = command.replace(/^petpoints\s+/i, '').replace(/^petpoint\s+/i, '').replace(/^pp\s+/i, '').trim();
        const value = Math.max(0, Math.floor(Number(val) || 0));
        state.playerState.petPoints = value;
        try { UIManager.updatePetUI(); } catch (e) {}
        return { ok: true, message: `Pet points set to ${value}` };
      }

      if (lower === 'heal full' || lower === 'full heal' || lower === 'heal') {
        state.playerState.hp = state.playerState.maxHp;
        state.playerState.mana = state.playerState.maxMana;
        state.playerState.ap = state.playerState.maxAp;
        try { UIManager.refreshGameUI?.(); } catch (e) {}
        return { ok: true, message: 'Healed' };
      }

      if (lower === 'enemy hp half' || lower === 'enemy half hp' || lower === 'half enemies hp' || lower === 'halve enemies hp') {
        if (typeof EnemyManager !== 'undefined' && typeof EnemyManager.halveAllEnemiesHealth === 'function') {
          EnemyManager.halveAllEnemiesHealth();
          return { ok: true, message: 'Enemy HP halved' };
        }
        return { ok: false, message: 'Enemy helper unavailable' };
      }

      if (lower.startsWith('kill tags ')) {
        const parts = command.split(/\s+/);
        const count = Number(parts.pop());
        const weaponQuery = parts.slice(2).join(' ');
        const weaponName = findWeaponName(weaponQuery);
        if (!weaponName) return { ok: false, message: 'Weapon not found' };
        if (!Number.isFinite(count)) return { ok: false, message: 'Bad count' };
        state.playerState.killTagsByWeapon[weaponName] = Math.max(0, Math.floor(count));
        try { UIManager.refreshGameUI?.(); } catch (e) {}
        return { ok: true, message: 'Kill tags set' };
      }

      if (lower.startsWith('class ') || lower.startsWith('change class ') || lower.startsWith('changeclass ')) {
        const classNameQuery = command
          .replace(/^change\s+class\s+/i, '')
          .replace(/^changeclass\s+/i, '')
          .replace(/^class\s+/i, '')
          .trim();
        const classNames = Object.keys(state.config?.classes || {});
        const matchedClassName = classNames.find(c => c.toLowerCase() === classNameQuery.toLowerCase());
        
        if (!matchedClassName) {
          return { ok: false, message: `Class not found. Available: ${classNames.join(', ')}` };
        }
        
        const classData = state.config.classes[matchedClassName];
        
        // Update class and stats on the fly
        state.playerState.className = matchedClassName;
        
        // Update HP/Mana bounds while scaling/clamping current values
        const prevMaxHp = state.playerState.maxHp || 1;
        const prevHp = state.playerState.hp || 0;
        state.playerState.maxHp = classData.hp;
        state.playerState.hp = Math.min(state.playerState.maxHp, Math.ceil((prevHp / prevMaxHp) * classData.hp));
        
        const prevMaxMana = state.playerState.maxMana || 1;
        const prevMana = state.playerState.mana || 0;
        state.playerState.maxMana = classData.mana;
        state.playerState.mana = Math.min(state.playerState.maxMana, Math.ceil((prevMana / prevMaxMana) * classData.mana));
        
        // Ranger gets 3 weapon slots, others get 2
        if (matchedClassName === 'Ranger') {
          if (state.playerState.weapons.length < 3) {
            state.playerState.weapons.push(null);
          }
        } else {
          if (state.playerState.weapons.length > 2) {
            state.playerState.weapons = state.playerState.weapons.slice(0, 2);
          }
        }
        state.playerState.weaponElements = new Array(state.playerState.weapons.length).fill(null);
        if (state.playerState.activeWeapon >= state.playerState.weapons.length) {
          state.playerState.activeWeapon = 0;
        }
        
        state.save();
        try { UIManager.refreshGameUI?.(); } catch (e) {}
        return { ok: true, message: `Changed class to ${matchedClassName}` };
      }

      if (lower.startsWith('event ') || lower === 'event') {
        const eventQuery = command.replace(/^event\s*/i, '').trim().toLowerCase();
        if (!eventQuery) {
          const current = state.systemState.specialEvent;
          return { ok: true, message: current ? `Current event: ${current.type} (claimed: ${current.claimed})` : 'No active event' };
        }

        if (eventQuery === 'none' || eventQuery === 'clear' || eventQuery === 'off') {
          state.systemState.specialEvent = null;
          state.save();
          try { UIManager.refreshEventBanner?.(); UIManager.refreshGameUI?.(); } catch (e) {}
          return { ok: true, message: 'Special event cleared' };
        }

        const eventMap = {
          'shrine': 'Shrine',
          'statue': 'Statue',
          'sacred tree': 'Sacred Tree',
          'sacredtree': 'Sacred Tree',
          'tree': 'Sacred Tree'
        };
        const eventType = eventMap[eventQuery];
        if (!eventType) {
          return { ok: false, message: 'Usage: event shrine | statue | sacred tree | none' };
        }

        // Build the event object the same way rollSpecialEvent does
        state.systemState.specialEvent = {
          type: eventType,
          claimed: false,
          targets: []
        };

        const activeDailies = state.dailiesState?.dailies || [];
        if (eventType === 'Sacred Tree') {
          if (activeDailies.length > 0) {
            const randomDaily = activeDailies[Math.floor(Math.random() * activeDailies.length)];
            state.systemState.specialEvent.targets = [randomDaily.id];
          }
          state.systemState.specialEvent.rewardType = Math.random() < 0.5 ? 'hp' : 'mana';
          state.systemState.specialEvent.rewardVal = Math.floor(Math.random() * 11) + 20; // 20 to 30
        } else if (eventType === 'Statue') {
          // Pick up to 3 random dailies as targets
          const shuffled = [...activeDailies].sort(() => Math.random() - 0.5);
          state.systemState.specialEvent.targets = shuffled.slice(0, 3).map(d => d.id);
        }

        state.save();
        try { UIManager.refreshEventBanner?.(); UIManager.refreshGameUI?.(); } catch (e) {}
        return { ok: true, message: `Set event to ${eventType}` };
      }

      if (lower === 'reset nemesis attributes to mine' || lower === 'reset nemesis attributes to yours' || lower === 'reset nemesis to mine' || lower === 'reset nemesis to yours' || lower === 'nemesis attributes to mine' || lower === 'nemesis attributes to yours') {
        state.config.attributes.forEach(attr => {
          const data = state.playerState.attributes[attr] || { points: 0, level: 1 };
          state.nemesisState.attributes[attr] = {
            points: data.points,
            level: data.level
          };
        });
        try { UIManager.refreshGameUI?.(); } catch (e) {}
        return { ok: true, message: 'Nemesis attributes reset to yours' };
      }

      if (lower === 'reset enemy attributes' || lower === 'reset nemesis attributes' || lower === 'reset enemy attrs' || lower === 'reset nemesis attrs') {
        state.nemesisState.attributes = {
          STR: { points: 0, level: 1 },
          INT: { points: 0, level: 1 },
          DISC: { points: 0, level: 1 },
          CREA: { points: 0, level: 1 },
          SOC: { points: 0, level: 1 },
          CAP: { points: 0, level: 1 },
          RESP: { points: 0, level: 1 }
        };
        try { UIManager.refreshGameUI?.(); } catch (e) {}
        return { ok: true, message: 'Nemesis attributes reset' };
      }

      if (lower === 'resume' || lower === 'close') {
        getGameState().resume();
        this.closeAllPopups();
        return { ok: true, message: 'Resumed' };
      }

      return { ok: false, message: 'Unknown command' };
    } catch (e) {
      console.warn('runCheatCommand failed', e);
      return { ok: false, message: 'Cheat failed' };
    }
  }

  // ============================================================
  // WIZARDS & EDIT DAILY / TODO
  // ============================================================

  static showAddTodoWizard(xPercent, yPercent, xPx, yPx) {
    const state = getGameState();
    const attributes = state.config.attributes || ['STR', 'AGI', 'INT', 'VIT', 'LUK'];
    
    // Default deadline: use quickDayDeadline if set, otherwise tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const quickTs = (typeof UIManager !== 'undefined' && UIManager.quickDayDeadline) ? UIManager.quickDayDeadline : null;
    const defaultDeadline = quickTs || tomorrow.getTime();
    const defaultDeadlineDate = new Date(defaultDeadline);
    const tomorrowStr = defaultDeadlineDate.toISOString().slice(0,10);

    const wizardData = {
      name: '',
      attribute: attributes[0],
      difficulty: 'Easy',
      deadline: defaultDeadline,
      subtasks: []
    };

    // Remove existing floating wizards
    const existing = document.querySelectorAll('.floating-wizard');
    existing.forEach(el => el.remove());
    
    const popup = document.createElement('div');
    popup.className = 'add-todo-wizard floating-wizard';
    popup.style.position = 'absolute';
    popup.style.left = xPx + 'px';
    popup.style.top = yPx + 'px';
    // Center it relative to the click
    popup.style.transform = 'translate(-50%, -50%)';

    // Prevent clicks inside the wizard from bubbling up and closing it
    popup.addEventListener('click', (e) => e.stopPropagation());
    
    // We will update the HTML inside popup based on step
    let currentStep = 1;

    const renderStep = () => {
      if (currentStep === 1) {
        popup.innerHTML = `
          <div class="wizard-step">
            <h3 class="clear-title">What's your To-Do?</h3>
            <input type="text" id="wizardTodoName" placeholder="Task name..." autocomplete="off" />
            <button class="btn-small mt-8" id="wizardNameNext">ENTER</button>
          </div>
        `;
        const input = popup.querySelector('#wizardTodoName');
        input.value = wizardData.name;
        // Need timeout for autofocus to work after DOM injection
        setTimeout(() => input.focus(), 50);

        const proceed = () => {
          const val = input.value.trim();
          if (val) {
            wizardData.name = val;
            currentStep = 2;
            renderStep();
          }
        };

        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') proceed();
        });
        popup.querySelector('#wizardNameNext').addEventListener('click', proceed);
      } else if (currentStep === 2) {
        const anglePerItem = 360 / attributes.length;
        const wheelHTML = attributes.map((attr, i) => {
          const angle = anglePerItem * i - 90; // Start at top
          // Calculate position around a circle of radius 60px
          const x = 50 + 40 * Math.cos(angle * Math.PI / 180);
          const y = 50 + 40 * Math.sin(angle * Math.PI / 180);
          const color = state.config.attributeColors?.[attr] || '#fff';
          return `
            <div class="wizard-attr-item" data-attr="${attr}" style="left: ${x}%; top: ${y}%; box-shadow: 0 0 10px ${color}88, inset 0 0 8px ${color}44; border-color: ${color};">
              <span>${attr}</span>
            </div>
          `;
        }).join('');

        popup.innerHTML = `
          <div class="wizard-step">
            <h3 class="clear-title">Select Attribute</h3>
            <div class="wizard-wheel-container">
              ${wheelHTML}
              <div class="wizard-wheel-center">Select</div>
            </div>
          </div>
        `;

        popup.querySelectorAll('.wizard-attr-item').forEach(item => {
          item.addEventListener('click', () => {
            wizardData.attribute = item.dataset.attr;
            currentStep = 3;
            renderStep();
          });
        });

      } else if (currentStep === 3) {
        popup.innerHTML = `
          <div class="wizard-step">
            <h3 class="clear-title">Details</h3>
            <div class="wizard-details-col">
              <div class="wizard-diff-col">
                <label class="clear-label">Difficulty</label>
                <div class="wizard-diff-options">
                  <button class="btn-diff ${wizardData.difficulty==='Easy'?'active':''}" data-val="Easy">Easy</button>
                  <button class="btn-diff ${wizardData.difficulty==='Medium'?'active':''}" data-val="Medium">Medium</button>
                  <button class="btn-diff ${wizardData.difficulty==='Hard'?'active':''}" data-val="Hard">Hard</button>
                  <button class="btn-diff ${wizardData.difficulty==='Ultra'?'active':''}" data-val="Ultra">Ultra</button>
                </div>
              </div>
              <div class="wizard-deadline-col">
                <label class="clear-label">Deadline</label>
                <input type="date" class="clear-input wizard-deadline-input" id="wizardTodoDeadline" value="${tomorrowStr}" />
              </div>
            </div>
            <button class="btn-small mt-8" id="wizardStep3Next">NEXT</button>
          </div>
        `;
        
        popup.querySelectorAll('.btn-diff').forEach(btn => {
          btn.addEventListener('click', () => {
            popup.querySelectorAll('.btn-diff').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            wizardData.difficulty = btn.dataset.val;
          });
        });

        popup.querySelector('#wizardStep3Next').addEventListener('click', () => {
          const dlInput = popup.querySelector('#wizardTodoDeadline').value;
          if (dlInput) wizardData.deadline = new Date(dlInput).getTime();
          currentStep = 4;
          renderStep();
        });
      } else if (currentStep === 4) {
        popup.innerHTML = `
          <div class="wizard-step">
            <h3 class="clear-title">Subtasks (Optional)</h3>
            <div id="wizardSubtaskList" class="wizard-subtask-list"></div>
            <div class="wizard-subtask-form">
              <input type="text" class="clear-input" id="wizardSubtaskName" placeholder="Add subtask..." />
              <button class="btn-small" id="wizardAddSubtask">ADD</button>
            </div>
            <button class="btn-small mt-8 btn-success" id="wizardFinish">FINISH</button>
          </div>
        `;
        
        const renderSubtasks = () => {
          const list = popup.querySelector('#wizardSubtaskList');
          if (!list) return;
          list.innerHTML = wizardData.subtasks.length ? wizardData.subtasks.map((st, i) => `
            <div class="edit-subtask-row">
              <span>${st}</span>
              <button class="edit-subtask-remove" data-index="${i}">×</button>
            </div>
          `).join('') : '<div class="muted">No subtasks yet</div>';
        };

        renderSubtasks();

        const input = popup.querySelector('#wizardSubtaskName');
        const addSubtask = () => {
          const name = (input.value || '').trim();
          if (name) {
            wizardData.subtasks.push(name);
            input.value = '';
            renderSubtasks();
            input.focus();
          }
        };

        popup.querySelector('#wizardAddSubtask').addEventListener('click', addSubtask);
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') addSubtask();
        });

        popup.addEventListener('click', (event) => {
          const removeBtn = event.target.closest('.edit-subtask-remove');
          if (removeBtn && popup.contains(removeBtn)) {
            const i = Number(removeBtn.dataset.index);
            wizardData.subtasks.splice(i, 1);
            renderSubtasks();
          }
        });

        popup.querySelector('#wizardFinish').addEventListener('click', () => {
          const created = TaskManager.addTodo(
            wizardData.name, 
            wizardData.difficulty, 
            wizardData.attribute, 
            wizardData.deadline, 
            wizardData.subtasks
          );
          if (created) {
            // Apply coordinates based on wizard invocation
            TaskManager.updateTodoLayout(created.id, { x: xPercent, y: yPercent });
            this.closeAllPopups();
            UIManager.updateTodosList();
            UIManager.positionTodoCards();
            getGameState().save();
          }
        });
      }

      const closeBtn = popup.querySelector('.btn-close');
      if (closeBtn) closeBtn.addEventListener('click', () => this.closeAllPopups());
      PopupAnimation.scaleCentered(popup);
    };

    const board = document.getElementById('todosList') || document.getElementById('tycoon-container') || document.body;
    if (board) board.appendChild(popup);
    renderStep();
  }

  static showEditDaily(dailyId) {
    const state = getGameState();
    const daily = state.dailiesState.dailies.find(d => d.id === dailyId);
    if (!daily) return;

    this.closeAllPopups();
    const overlay = this.createPopupOverlay();
    const popup = document.createElement('div');
    popup.className = 'popup edit-daily-popup';
    const currentStreak = TaskManager.computeDailyStreak(dailyId);
    let currentMilestones = Array.isArray(daily.surplusMilestones) ? JSON.parse(JSON.stringify(daily.surplusMilestones)) : [];

    const attrs = state.config.attributes.map(a => `<option value="${a}" ${a===daily.attribute? 'selected':''}>${a}</option>`).join('');
    popup.innerHTML = `
      <h2>EDIT DAILY</h2>
      <button class="btn-close">✕</button>
      <div class="popup-scrollable-body">
        <label>Name</label>
        <input id="editName" value="${daily.baseName || daily.name}" />
        <label>Attribute</label>
        <select id="editAttr">${attrs}</select>
        <label>Difficulty</label>
        <select id="editDiff">
          <option ${daily.difficulty==='Easy'?'selected':''}>Easy</option>
          <option ${daily.difficulty==='Medium'?'selected':''}>Medium</option>
          <option ${daily.difficulty==='Hard'?'selected':''}>Hard</option>
          <option ${daily.difficulty==='Ultra'?'selected':''}>Ultra</option>
        </select>
        <label>Max completions per day</label>
        <input id="editMax" type="number" min="1" value="${daily.maxCompletionsPerDay || 1}" />
        <label>Size</label>
        <input id="editSize" type="number" min="0.5" max="2" step="0.05" value="${Number(daily.size) || 1}" />
        <label>Blood Oath</label>
        <div class="blood-oath-row">
          <input id="editBloodOath" type="checkbox" ${daily.bloodOathActive ? 'checked' : ''} />
          <label for="editBloodOath">Activate Blood Oath (cost ${state.config.bloodOathManaCost || 0} mana)</label>
        </div>
        <label>Daily Surplus</label>
        <div class="surplus-row" style="margin-bottom: 12px; display: block;">
          <div id="milestonesSection" style="margin-top: 4px; border-left: 2px solid #a855f7; padding-left: 10px; display: block; width: 100%; box-sizing: border-box;">
            <div id="surplusStreakInfo" style="font-size: 11px; color: #a855f7; margin-bottom: 8px; font-family: monospace;"></div>
            <div id="surplusMilestonesContainer"></div>
          </div>
        </div>
      </div>
      <div class="edit-daily-actions">
        <button class="btn-large" id="saveDaily">SAVE</button>
        <button class="btn-large btn-danger" id="deleteDaily">DELETE DAILY</button>
      </div>
    `;

    popup.querySelector('.btn-close').addEventListener('click', () => this.closeAllPopups());
    overlay.appendChild(popup);
    document.body.appendChild(overlay);

    const renderMilestonesList = () => {
      const container = popup.querySelector('#surplusMilestonesContainer');
      if (!container) return;

      // Sort ascending by streak threshold
      currentMilestones.sort((a, b) => a.streak - b.streak);

      // Re-calculate the active multiplier and streak info label
      let milestonesReached = 0;
      currentMilestones.forEach(m => {
        if (currentStreak >= m.streak) {
          milestonesReached++;
        }
      });
      const mult = milestonesReached > 0 ? Math.pow(1.5, milestonesReached) : 1.0;
      const streakInfoEl = popup.querySelector('#surplusStreakInfo');
      if (streakInfoEl) {
        streakInfoEl.innerHTML = `Current Streak: <strong>${currentStreak} days</strong> (Multiplier: <strong>${mult.toFixed(2)}x</strong>)`;
      }

      let html = '<div class="milestones-list" style="margin-top: 8px; display: flex; flex-direction: column; gap: 6px; max-height: 150px; overflow-y: auto; padding-right: 4px;">';
      if (currentMilestones.length === 0) {
        html += '<p style="font-size: 11px; color: #7a7a7a; margin: 0; font-family: monospace;">No streak milestones configured yet.</p>';
      } else {
        currentMilestones.forEach((m, idx) => {
          html += `
            <div class="milestone-item" style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.03); padding: 4px 8px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.05);">
              <span style="font-size: 11px; font-family: monospace; color: #f5f5f7;">Streak ${m.streak}d ➔ ${m.name}</span>
              <button type="button" class="btn-remove-milestone" data-idx="${idx}" style="background: none; border: none; color: #ef4444; cursor: pointer; font-size: 11px; font-family: monospace; padding: 2px 6px;">✕</button>
            </div>
          `;
        });
      }
      html += '</div>';

      // Input form to add a new milestone
      html += `
        <div class="add-milestone-form" style="margin-top: 10px; display: flex; gap: 6px; align-items: center;">
          <input id="newMilestoneStreak" type="number" min="1" placeholder="Streak" style="width: 70px; font-size: 11px; padding: 4px; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.15); color: #fff;" />
          <input id="newMilestoneName" type="text" placeholder="Task name when reached" style="flex: 1; font-size: 11px; padding: 4px; background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.15); color: #fff;" />
          <button type="button" id="btnAddMilestone" style="padding: 4px 8px; font-size: 10px; background: rgba(168,85,247,0.2); border: 1px solid #a855f7; color: #fff; cursor: pointer;">ADD</button>
        </div>
      `;

      container.innerHTML = html;

      // Attach delete handlers
      container.querySelectorAll('.btn-remove-milestone').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const idx = parseInt(e.target.dataset.idx);
          currentMilestones.splice(idx, 1);
          renderMilestonesList();
        });
      });

      // Attach add handler
      container.querySelector('#btnAddMilestone').addEventListener('click', () => {
        const streakVal = parseInt(container.querySelector('#newMilestoneStreak').value);
        const nameVal = container.querySelector('#newMilestoneName').value.trim();
        if (!streakVal || streakVal < 1 || !nameVal) {
          return;
        }
        // Check if streak already exists
        const existingIdx = currentMilestones.findIndex(m => m.streak === streakVal);
        if (existingIdx !== -1) {
          currentMilestones[existingIdx].name = nameVal;
        } else {
          currentMilestones.push({ streak: streakVal, name: nameVal });
        }
        renderMilestonesList();
      });
    };

    // Initialize milestones rendering
    renderMilestonesList();

    popup.querySelector('#saveDaily').addEventListener('click', () => {
      const updates = {
        name: popup.querySelector('#editName').value,
        attribute: popup.querySelector('#editAttr').value,
        difficulty: popup.querySelector('#editDiff').value,
        maxCompletionsPerDay: Math.max(1, Number(popup.querySelector('#editMax').value) || 1),
        size: Math.max(0.5, Number(popup.querySelector('#editSize').value) || 1),
        dailySurplusEnabled: currentMilestones.length > 0,
        surplusMilestones: currentMilestones
      };
      // Apply blood oath toggle if requested (use TaskManager toggle to respect mana cost)
      try {
        const wantBlood = !!popup.querySelector('#editBloodOath').checked;
        if (wantBlood !== !!daily.bloodOathActive) {
          const ok = TaskManager.toggleBloodOath(dailyId);
          if (!ok && wantBlood) {
            try { alert('Not enough mana to activate Blood Oath'); } catch (e) {}
          }
        }
      } catch (e) { console.warn('Failed to toggle blood oath', e); }

      TaskManager.editDaily(dailyId, updates);
      this.closeAllPopups();
      UIManager.updateDailiesList();
      getGameState().save();
    });

    popup.querySelector('#deleteDaily').addEventListener('click', () => {
      const latestDaily = getGameState().dailiesState.dailies.find(d => d.id === dailyId);
      const dailyName = latestDaily?.name || daily.name || 'this daily';
      if (!confirm(`Delete ${dailyName}?`)) return;

      const removed = TaskManager.removeDaily(dailyId);
      if (!removed) return;

      this.closeAllPopups();
      UIManager.updateDailiesList();
      UIManager.renderEnemies();
      getGameState().save();
    });
    PopupAnimation.scale(popup);
  }

  static showEditTodo(todoId) {
    const state = getGameState();
    const todo = state.dailiesState.todos.find(t => t.id === todoId);
    if (!todo) return;

    this.closeAllPopups();
    const overlay = this.createPopupOverlay();
    const popup = document.createElement('div');
    popup.className = 'popup edit-todo-popup';

    const attrs = state.config.attributes.map(a => `<option value="${a}" ${a===todo.attribute? 'selected':''}>${a}</option>`).join('');
    const deadlineVal = todo.deadline ? new Date(todo.deadline).toISOString().slice(0,10) : '';
    popup.innerHTML = `
      <h2>EDIT TO-DO</h2>
      <button class="btn-close">✕</button>
      <div class="popup-scrollable-body">
        <label>Name</label>
        <input id="editName" value="${todo.name}" />
        <label>Attribute</label>
        <select id="editAttr">${attrs}</select>
        <label>Difficulty</label>
        <select id="editDiff">
          <option ${todo.difficulty==='Easy'?'selected':''}>Easy</option>
          <option ${todo.difficulty==='Medium'?'selected':''}>Medium</option>
          <option ${todo.difficulty==='Hard'?'selected':''}>Hard</option>
          <option ${todo.difficulty==='Ultra'?'selected':''}>Ultra</option>
        </select>
        <label>Deadline</label>
        <input id="editDeadline" type="date" value="${deadlineVal}" />
        <div class="edit-subtasks-panel">
          <h3>Subtasks</h3>
          <div class="edit-subtasks-list" id="editSubtasksList"></div>
          <div class="edit-subtask-form">
            <input id="newEditSubtaskName" placeholder="Add subtask..." />
            <button class="btn-small" id="addEditSubtaskBtn">ADD</button>
          </div>
        </div>
      </div>
      <div class="edit-todo-actions">
        <button class="btn-large" id="saveTodo">SAVE</button>
        <button class="btn-large btn-danger" id="deleteTodo">DELETE TO-DO</button>
      </div>
    `;

    popup.querySelector('.btn-close').addEventListener('click', () => this.closeAllPopups());
    overlay.appendChild(popup);
    document.body.appendChild(overlay);

    const subtasksList = popup.querySelector('#editSubtasksList');
    const renderSubtasks = () => {
      if (!subtasksList) return;
      const freshTodo = state.dailiesState.todos.find(t => t.id === todoId);
      const subtasks = freshTodo?.subtasks || [];
      subtasksList.innerHTML = subtasks.length ? subtasks.map(subtask => `
        <div class="edit-subtask-row ${subtask.completed ? 'completed' : ''}" data-subtask-id="${subtask.id}">
          <label class="edit-subtask-label">
            <input type="checkbox" class="edit-subtask-checkbox" data-subtask-id="${subtask.id}" ${subtask.completed ? 'checked' : ''} />
            <span>${subtask.name}</span>
          </label>
          <button class="edit-subtask-remove" data-subtask-id="${subtask.id}">×</button>
        </div>
      `).join('') : '<div class="muted">No subtasks yet</div>';
    };

    renderSubtasks();

    popup.querySelector('#addEditSubtaskBtn').addEventListener('click', () => {
      const input = popup.querySelector('#newEditSubtaskName');
      const name = (input.value || '').trim();
      if (!name) return;
      const added = TaskManager.addSubtask(todoId, name);
      if (added) {
        input.value = '';
        renderSubtasks();
        UIManager.updateTodosList();
        getGameState().save();
      }
    });

    popup.addEventListener('click', (event) => {
      const checkbox = event.target.closest('.edit-subtask-checkbox');
      const removeBtn = event.target.closest('.edit-subtask-remove');
      if (checkbox) {
        const subtaskId = checkbox.dataset.subtaskId;
        if (TaskManager.toggleSubtask(todoId, subtaskId)) {
          renderSubtasks();
          UIManager.updateTodosList();
          getGameState().save();
        }
      }
      if (removeBtn) {
        const subtaskId = removeBtn.dataset.subtaskId;
        if (TaskManager.removeSubtask(todoId, subtaskId)) {
          renderSubtasks();
          UIManager.updateTodosList();
          getGameState().save();
        }
      }
    });

    popup.querySelector('#saveTodo').addEventListener('click', () => {
      const deadlineInput = popup.querySelector('#editDeadline').value;
      const updates = {
        name: popup.querySelector('#editName').value,
        attribute: popup.querySelector('#editAttr').value,
        difficulty: popup.querySelector('#editDiff').value,
        deadline: deadlineInput ? new Date(deadlineInput).getTime() : null
      };
      TaskManager.editTodo(todoId, updates);
      this.closeAllPopups();
      UIManager.updateTodosList();
      getGameState().save();
    });

    popup.querySelector('#deleteTodo').addEventListener('click', () => {
      const latestTodo = getGameState().dailiesState.todos.find(t => t.id === todoId);
      const todoName = latestTodo?.name || todo.name || 'this to-do';
      if (!confirm(`Delete ${todoName}?`)) return;

      const removed = TaskManager.removeTodo(todoId);
      if (!removed) return;

      this.closeAllPopups();
      UIManager.updateTodosList();
      UIManager.renderEnemies();
      getGameState().save();
    });

    PopupAnimation.scale(popup);
  }

  // ============================================================
  // QUICK DAY PICKER
  // ============================================================

  static showQuickDayPicker(onConfirm) {
    this.closeAllPopups();

    const overlay = this.createPopupOverlay();
    const popup = document.createElement('div');
    popup.className = 'popup quick-day-popup';

    // Build the next 14 days as options
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      days.push(d);
    }

    const currentTs = UIManager.quickDayDeadline;

    const dayBtnsHTML = days.map((d, i) => {
      const ts = d.getTime();
      const isActive = currentTs && new Date(currentTs).toDateString() === d.toDateString();
      let dayLabel;
      if (i === 0) dayLabel = 'Today';
      else if (i === 1) dayLabel = 'Tmrw';
      else dayLabel = dayNames[d.getDay()];
      return `
        <button class="quick-day-option${isActive ? ' active' : ''}" data-ts="${ts}">
          <span class="qd-weekday">${dayLabel}</span>
          <span class="qd-date">${monthNames[d.getMonth()]} ${d.getDate()}</span>
        </button>
      `;
    }).join('');

    popup.innerHTML = `
      <h2>⚡ QUICK DAY</h2>
      <button class="btn-close">✕</button>
      <p class="quick-day-desc">Set a default deadline for new to-dos you add this session.</p>
      <div class="quick-day-grid">
        ${dayBtnsHTML}
      </div>
      <div class="quick-day-custom-row">
        <label class="clear-label">Custom date</label>
        <input type="date" id="quickDayCustomInput" class="clear-input" />
        <button class="btn-small" id="quickDayCustomBtn">SET</button>
      </div>
      <button class="btn-small btn-danger mt-8" id="quickDayClearPopupBtn">CLEAR</button>
    `;

    popup.querySelector('.btn-close').addEventListener('click', () => this.closeAllPopups());

    popup.querySelectorAll('.quick-day-option').forEach(btn => {
      btn.addEventListener('click', () => {
        const ts = Number(btn.dataset.ts);
        UIManager.quickDayDeadline = ts;
        this.closeAllPopups();
        if (typeof onConfirm === 'function') onConfirm();
      });
    });

    const customInput = popup.querySelector('#quickDayCustomInput');
    popup.querySelector('#quickDayCustomBtn').addEventListener('click', () => {
      if (!customInput.value) return;
      UIManager.quickDayDeadline = new Date(customInput.value).getTime();
      this.closeAllPopups();
      if (typeof onConfirm === 'function') onConfirm();
    });

    popup.querySelector('#quickDayClearPopupBtn').addEventListener('click', () => {
      UIManager.quickDayDeadline = null;
      this.closeAllPopups();
      if (typeof onConfirm === 'function') onConfirm();
    });

    overlay.appendChild(popup);
    document.body.appendChild(overlay);
    PopupAnimation.scale(popup);
  }

  static showBulkAddTodo() {
    const state = getGameState();
    const attributes = state.config.attributes || ['STR', 'AGI', 'INT', 'VIT', 'LUK'];
    
    this.closeAllPopups();
    const overlay = this.createPopupOverlay();
    const popup = document.createElement('div');
    popup.className = 'popup edit-todo-popup bulk-todo-popup';

    const attrsOptions = attributes.map(a => `<option value="${a}">${a}</option>`).join('');
    const diffOptions = `
      <option value="Easy">Easy</option>
      <option value="Medium">Medium</option>
      <option value="Hard">Hard</option>
      <option value="Ultra">Ultra</option>
    `;

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const defaultDeadline = (typeof UIManager !== 'undefined' && UIManager.quickDayDeadline) ? UIManager.quickDayDeadline : null;
    const deadlineVal = defaultDeadline ? new Date(defaultDeadline).toISOString().slice(0,10) : tomorrow.toISOString().slice(0,10);

    popup.innerHTML = `
      <h2>BULK ADD TO-DOS</h2>
      <button class="btn-close">✕</button>
      <div class="popup-scrollable-body">
        <p class="bulk-todo-help" style="font-size: 8px; color: var(--text-muted); margin-bottom: 12px; line-height: 1.4;">
          Enter multiple tasks below (one per line). They will all be created instantly with the selected configuration.
        </p>
        
        <label for="bulkTodoNames">Tasks (One per line)</label>
        <textarea id="bulkTodoNames" class="bulk-todo-textarea" placeholder="Read 10 pages&#10;Workout for 30 mins&#10;Reply to emails" spellcheck="false" autofocus></textarea>
        
        <div class="bulk-todo-settings" style="display: flex; gap: 12px; margin-top: 8px; flex-wrap: wrap;">
          <div class="bulk-setting-col" style="flex: 1 1 140px; display: flex; flex-direction: column; gap: 4px;">
            <label style="font-size: 9px; color: #f1de97;">Attribute</label>
            <select id="bulkTodoAttr">${attrsOptions}</select>
          </div>
          
          <div class="bulk-setting-col" style="flex: 1 1 140px; display: flex; flex-direction: column; gap: 4px;">
            <label style="font-size: 9px; color: #f1de97;">Difficulty</label>
            <select id="bulkTodoDiff">${diffOptions}</select>
          </div>
          
          <div class="bulk-setting-col" style="flex: 1 1 140px; display: flex; flex-direction: column; gap: 4px;">
            <label style="font-size: 9px; color: #f1de97;">Deadline</label>
            <input id="bulkTodoDeadline" type="date" value="${deadlineVal}" style="width: 100%; box-sizing: border-box;" />
          </div>
        </div>

        <div style="display: flex; gap: 8px; align-items: center; margin-top: 12px; margin-bottom: 8px;">
          <input type="checkbox" id="bulkTodoClusterCheckbox" style="accent-color: var(--accent-gold); cursor: pointer;" />
          <label for="bulkTodoClusterCheckbox" style="font-size: 9px; color: #fff0b8; cursor: pointer; user-select: none;">⛓️ Create as Cluster (linked cards, split attributes)</label>
        </div>

        <div id="clusterAttributesPanel" style="display: none; border: 1px dashed rgba(255, 215, 106, 0.2); border-radius: 4px; padding: 10px; margin-bottom: 12px; background: rgba(0, 0, 0, 0.15);">
          <h3 style="font-size: 10px; color: #f1de97; margin: 0 0 8px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05); padding-bottom: 4px;">Cluster Attribute Weights</h3>
          <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 8px;" id="clusterAttributesGrid">
            <!-- Populated dynamically -->
          </div>
        </div>
      </div>
      
      <div class="edit-todo-actions" style="margin-top: 12px;">
        <button class="btn-large btn-success" id="btnBulkAddSave">ADD ALL</button>
      </div>
    `;

    popup.querySelector('.btn-close').addEventListener('click', () => this.closeAllPopups());
    overlay.appendChild(popup);
    document.body.appendChild(overlay);

    // Populate attributes grid
    const attrGrid = popup.querySelector('#clusterAttributesGrid');
    if (attrGrid) {
      attrGrid.innerHTML = attributes.map(attr => {
        const color = state.config.attributeColors?.[attr] || '#fff';
        return `
          <div class="cluster-attr-row" style="display: flex; align-items: center; justify-content: space-between; gap: 6px;">
            <label style="display: flex; align-items: center; gap: 4px; font-size: 9px; color: ${color}; cursor: pointer; user-select: none; min-width: 0; flex: 1;">
              <input type="checkbox" class="cluster-attr-check" data-attr="${attr}" style="accent-color: ${color}; cursor: pointer;" />
              <span>${attr}</span>
            </label>
            <div style="display: flex; align-items: center; gap: 4px;">
              <input type="number" class="cluster-attr-weight" data-attr="${attr}" min="1" value="1" disabled style="width: 40px; padding: 2px 4px; font-size: 8px; text-align: center; background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.15); color: #fff; font-family: monospace;" />
              <span class="cluster-attr-pct" data-attr="${attr}" style="font-size: 7px; color: var(--text-muted); min-width: 32px; font-family: monospace;">(0%)</span>
            </div>
          </div>
        `;
      }).join('');
    }

    const clusterCheck = popup.querySelector('#bulkTodoClusterCheckbox');
    const panel = popup.querySelector('#clusterAttributesPanel');
    const singleAttrCol = popup.querySelector('#bulkTodoAttr').closest('.bulk-setting-col');
    
    const updatePercentages = () => {
      let totalWeight = 0;
      const checkedAttrs = [];
      
      popup.querySelectorAll('.cluster-attr-row').forEach(row => {
        const check = row.querySelector('.cluster-attr-check');
        const weightInput = row.querySelector('.cluster-attr-weight');
        const pctSpan = row.querySelector('.cluster-attr-pct');
        const attr = check.dataset.attr;
        
        if (check.checked) {
          weightInput.disabled = false;
          const w = Math.max(1, parseInt(weightInput.value) || 1);
          totalWeight += w;
          checkedAttrs.push({ attr, weightInput, pctSpan, weight: w });
        } else {
          weightInput.disabled = true;
          pctSpan.textContent = '(0%)';
        }
      });
      
      checkedAttrs.forEach(item => {
        const pct = totalWeight > 0 ? Math.round((item.weight / totalWeight) * 100) : 0;
        item.pctSpan.textContent = `(${pct}%)`;
      });
    };

    clusterCheck.addEventListener('change', () => {
      if (clusterCheck.checked) {
        panel.style.display = 'block';
        singleAttrCol.style.opacity = '0.35';
        popup.querySelector('#bulkTodoAttr').disabled = true;
        updatePercentages();
      } else {
        panel.style.display = 'none';
        singleAttrCol.style.opacity = '1';
        popup.querySelector('#bulkTodoAttr').disabled = false;
      }
    });

    popup.querySelectorAll('.cluster-attr-check').forEach(check => {
      check.addEventListener('change', updatePercentages);
    });
    popup.querySelectorAll('.cluster-attr-weight').forEach(input => {
      input.addEventListener('input', updatePercentages);
      input.addEventListener('change', updatePercentages);
    });

    const textarea = popup.querySelector('#bulkTodoNames');
    // Ensure autofocus works
    setTimeout(() => textarea.focus(), 80);

    popup.querySelector('#btnBulkAddSave').addEventListener('click', () => {
      const lines = (textarea.value || '').split('\n');
      const validNames = lines.map(line => line.trim()).filter(line => line.length > 0);
      
      if (validNames.length === 0) {
        if (typeof FloatingDamageNumber !== 'undefined' && FloatingDamageNumber.show) {
          FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2, 'Enter at least one task!', { color: '#ff6666' });
        }
        return;
      }

      const isCluster = clusterCheck.checked;
      let clusterId = null;
      let clusterAttributes = null;
      let fallbackAttribute = popup.querySelector('#bulkTodoAttr').value;

      if (isCluster) {
        let totalWeight = 0;
        const weights = {};
        
        popup.querySelectorAll('.cluster-attr-row').forEach(row => {
          const check = row.querySelector('.cluster-attr-check');
          const weightInput = row.querySelector('.cluster-attr-weight');
          const attr = check.dataset.attr;
          
          if (check.checked) {
            const w = Math.max(1, parseInt(weightInput.value) || 1);
            weights[attr] = w;
            totalWeight += w;
          }
        });

        const checkedKeys = Object.keys(weights);
        if (checkedKeys.length === 0) {
          if (typeof FloatingDamageNumber !== 'undefined' && FloatingDamageNumber.show) {
            FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2, 'Check at least 1 attribute!', { color: '#ff6666' });
          }
          return;
        }

        clusterId = TaskManager.generateTaskId();
        clusterAttributes = {};
        checkedKeys.forEach(attr => {
          clusterAttributes[attr] = weights[attr] / totalWeight;
        });

        fallbackAttribute = checkedKeys[0];
      }
      
      const difficulty = popup.querySelector('#bulkTodoDiff').value;
      const deadlineInput = popup.querySelector('#bulkTodoDeadline').value;
      const deadline = deadlineInput ? new Date(deadlineInput).getTime() : null;
      
      let addedCount = 0;
      validNames.forEach((name, i) => {
        const created = TaskManager.addTodo(name, difficulty, fallbackAttribute, deadline, []);
        if (created) {
          if (isCluster) {
            created.clusterId = clusterId;
            created.clusterIndex = i;
            created.clusterAttributes = clusterAttributes;
            created.layout = {
              x: 20,
              y: 20
            };
          }
          addedCount++;
        }
      });
      
      if (addedCount > 0) {
        this.closeAllPopups();
        if (typeof UIManager !== 'undefined') {
          UIManager.updateTodosList();
          UIManager.positionTodoCards();
          UIManager.renderEnemies();
        }
        state.save();
        
        if (typeof FloatingDamageNumber !== 'undefined' && FloatingDamageNumber.show) {
          const msg = isCluster ? `Created cluster with ${addedCount} To-Dos!` : `Added ${addedCount} To-Dos!`;
          FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2, msg, { color: '#44ff44', duration: 1800 });
        }
      }
    });

    PopupAnimation.scale(popup);
  }

  static showLootbox() {
    const state = getGameState();
    // Prevent opening lootbox if player is dead or victory/death popup is showing
    if (state.playerState.hp <= 0) return;
    if (document.querySelector('.death-popup') || document.querySelector('.victory-popup') || document.querySelector('.lootbox-popup')) return;

    // Close any non-critical popups first
    this.closeAllPopups();

    const overlay = this.createPopupOverlay();
    const popup = document.createElement('div');
    popup.className = 'popup lootbox-popup';

    popup.innerHTML = `
      <h2 class="lootbox-title">🎁 LOOTBOX FOUND!</h2>
      <div class="lootbox-content">
        <div class="lootbox-graphic-container">
          <div class="lootbox-graphic">🎁</div>
        </div>
        <p class="lootbox-instruction">You found a mystery chest! Open it to claim your rewards.</p>
        <button class="btn-large btn-lootbox-open">OPEN CHEST</button>
      </div>
    `;

    overlay.appendChild(popup);
    document.body.appendChild(overlay);
    PopupAnimation.scale(popup);

    // Play drop sound
    try {
      if (window.SoundManager) {
        SoundManager.play('lootbox_drop');
      }
    } catch (e) {}

    const openBtn = popup.querySelector('.btn-lootbox-open');
    openBtn.addEventListener('click', () => {
      const keys = state.playerState.lootboxKeys || 0;
      if (keys <= 0) return;
      state.spendLootboxKeys(1);

      openBtn.disabled = true;
      const graphic = popup.querySelector('.lootbox-graphic');
      graphic.classList.add('lootbox-opening-shake');

      // Play open sound
      try {
        if (window.SoundManager) {
          SoundManager.play('lootbox_open');
        }
      } catch (e) {}

      setTimeout(() => {
        // Helper to generate a random reward object
        const generateRewardOption = (isWinner = false) => {
          const rand = Math.random();
          // Weapons have a ~15% chance to drop on the winning card, else normal distribution (~8% chance)
          const isWeapon = isWinner ? (rand < 0.15) : (rand < 0.08);
          if (isWeapon) {
            let weaponName = null;
            if (typeof ShopManager !== 'undefined' && typeof ShopManager.getAvailableWeapons === 'function') {
              const list = ShopManager.getAvailableWeapons();
              if (list && list.length) {
                weaponName = list[Math.floor(Math.random() * list.length)];
              }
            }
            if (!weaponName && state.config && state.config.weapons) {
              const allWeps = Object.keys(state.config.weapons).filter(w => w !== 'Rusty Sword');
              weaponName = allWeps[Math.floor(Math.random() * allWeps.length)];
            }
            if (!weaponName) weaponName = 'Thunder Hammer';
            return {
              type: 'weapon',
              value: weaponName,
              label: weaponName,
              icon: '⚔️',
              color: '#38bdf8',
              bg: 'rgba(56, 189, 248, 0.15)'
            };
          } else if (rand < 0.45) {
            // Gold: 50, 100, 150, 200
            const goldAmounts = [50, 100, 150, 200];
            const val = goldAmounts[Math.floor(Math.random() * goldAmounts.length)];
            return {
              type: 'gold',
              value: val,
              label: `+${val} Gold`,
              icon: '🪙',
              color: '#ffd700',
              bg: 'rgba(255, 215, 0, 0.15)'
            };
          } else if (rand < 0.70) {
            // Diamonds: 2, 4, 6, 8
            const diamondAmounts = [2, 4, 6, 8];
            const val = diamondAmounts[Math.floor(Math.random() * diamondAmounts.length)];
            return {
              type: 'diamonds',
              value: val,
              label: `+${val} Diamonds`,
              icon: '💎',
              color: '#00e5ff',
              bg: 'rgba(0, 229, 255, 0.15)'
            };
          } else {
            // Consumable
            let consumableName = 'Health Potion';
            if (typeof ShopManager !== 'undefined' && typeof ShopManager.getAvailableConsumables === 'function') {
              const list = ShopManager.getAvailableConsumables();
              if (list && list.length) {
                consumableName = list[Math.floor(Math.random() * list.length)];
              }
            } else {
              const fallbackList = ['Health Potion', 'Mana Potion', 'Rage Tonic', 'Shield'];
              consumableName = fallbackList[Math.floor(Math.random() * fallbackList.length)];
            }
            let icon = '🧪';
            if (consumableName.toLowerCase().includes('shield')) icon = '🛡️';
            return {
              type: 'consumable',
              value: consumableName,
              label: consumableName,
              icon: icon,
              color: '#a15cff',
              bg: 'rgba(161, 92, 255, 0.15)'
            };
          }
        };

        // Pre-determine all 40 options
        const options = [];
        for (let i = 0; i < 40; i++) {
          options.push(generateRewardOption(i === 30));
        }

        const winner = options[30];

        // Transition popup content to the roulette screen
        const content = popup.querySelector('.lootbox-content');
        content.innerHTML = `
          <div class="roulette-container">
            <div class="roulette-pointer"></div>
            <div class="roulette-strip" id="rouletteStrip"></div>
          </div>
          <div class="roulette-status-text">Rolling mystery rewards...</div>
          <div class="lootbox-result-area" style="opacity: 0; min-height: 80px; transition: opacity 0.5s ease;"></div>
        `;

        const strip = content.querySelector('#rouletteStrip');
        const rContainer = content.querySelector('.roulette-container');
        
        // Populate the strip
        options.forEach((opt, idx) => {
          const card = document.createElement('div');
          card.className = `roulette-item`;
          card.style.borderColor = opt.color;
          card.style.background = opt.bg;
          card.style.color = opt.color;
          card.innerHTML = `
            <div style="font-size: 28px; margin-bottom: 4px;">${opt.icon}</div>
            <div style="font-size: 9px; font-weight: bold; line-height: 1.2; word-break: break-word;">${opt.label}</div>
          `;
          strip.appendChild(card);
        });

        // Calculate dynamic translation to center index 30 perfectly
        const itemWidth = 90 + 8; // card width (90px) + gap (8px)
        const containerWidth = rContainer.getBoundingClientRect().width || 340; // fallback if 0
        const randomOffset = (Math.random() - 0.5) * 36; // slight offset to feel natural
        const targetTranslateX = - (30 * itemWidth) + (containerWidth / 2) - (90 / 2) + randomOffset;

        // Force a layout reflow before triggering transition
        strip.getBoundingClientRect();

        // Spin it!
        strip.style.transition = 'transform 4.5s cubic-bezier(0.1, 0.8, 0.15, 1)';
        strip.style.transform = `translateX(${targetTranslateX}px)`;

        // Play decelerating click sounds
        let tickDelay = 60;
        let tickElapsed = 0;
        const spinDuration = 4500;
        function playTick() {
          if (tickElapsed >= spinDuration) return;
          try {
            if (window.SoundManager) {
              SoundManager.play('tick'); // Unregistered key falls back to default 600Hz sine tone
            }
          } catch (e) {}

          tickElapsed += tickDelay;
          tickDelay = tickDelay * 1.13; // geometric slowdown
          if (tickDelay > 600) tickDelay = 600;
          if (tickElapsed < spinDuration - 120) {
            setTimeout(playTick, tickDelay);
          }
        }
        setTimeout(playTick, 50);

        // After spin animation finishes
        setTimeout(() => {
          // Highlight winning card
          const cards = strip.querySelectorAll('.roulette-item');
          const winningCard = cards[30];
          if (winningCard) {
            winningCard.classList.add('winner');
          }

          // Play win sound based on type
          try {
            if (window.SoundManager) {
              if (winner.type === 'gold') SoundManager.play('coin');
              else if (winner.type === 'diamonds') SoundManager.play('revive');
              else if (winner.type === 'consumable') SoundManager.play('heal');
              else SoundManager.play('lootbox_open');
            }
          } catch (e) {}

          // Sparkles particle effect
          PopupsManager.spawnLootboxParticles(popup);

          // Apply reward to game state (weapons handled separately)
          if (winner.type === 'gold') {
            state.addGold(winner.value);
          } else if (winner.type === 'diamonds') {
            state.addDiamonds(winner.value);
          } else if (winner.type === 'consumable') {
            PlayerManager.addConsumable(winner.value, 1);
          }

          // Build claim / swap panel HTML
          let resultHtml = '';
          let weaponAddedDirectly = false;

          if (winner.type === 'weapon') {
            const emptySlotIndex = state.playerState.weapons.findIndex(w => !w);
            const wCfg = state.config.weapons?.[winner.value];
            const wIcon = wCfg?.icon || state.config.shopItemIcons?.[winner.value] || '⚔️';
            if (emptySlotIndex !== -1) {
              PlayerManager.addWeapon(winner.value);
              weaponAddedDirectly = true;
              resultHtml = `
                <div class="lootbox-reward-item weapon" style="justify-content: center;">
                  ${wIcon} +1 ${winner.value} (New Weapon!)
                </div>
                <button class="btn-large btn-lootbox-claim" style="margin-top: 16px;">CLAIM REWARDS</button>
              `;
            } else {
              // Weapon swap needed
              resultHtml = `
                <div class="lootbox-reward-item weapon-alert" style="justify-content: center;">⚠️ Weapon Slots Full!</div>
                <div class="lootbox-reward-item weapon" style="justify-content: center; margin-bottom: 12px;">🎁 Won: ${wIcon} ${winner.value}</div>
                <div class="lootbox-weapon-swap-panel">
                  <p>Select an equipped weapon to replace for free, or discard it:</p>
                  <div class="lootbox-swap-buttons">
              `;
              state.playerState.weapons.forEach((w, idx) => {
                let disp = 'Empty';
                if (w) {
                  const currentCfg = state.config.weapons?.[w];
                  const currentIcon = currentCfg?.icon || state.config.shopItemIcons?.[w] || '⚔️';
                  disp = `${currentIcon} ${w}`;
                }
                resultHtml += `
                  <button class="btn-swap-weapon" data-index="${idx}">Replace Slot ${idx + 1} (${disp})</button>
                `;
              });
              resultHtml += `
                    <button class="btn-swap-discard">Discard New Weapon</button>
                  </div>
                </div>
              `;
            }
          } else {
            // Gold, Diamonds, or Consumable
            let displayLabel = '';
            if (winner.type === 'gold') displayLabel = `🪙 +${winner.value} Gold`;
            else if (winner.type === 'diamonds') displayLabel = `💎 +${winner.value} Diamonds`;
            else displayLabel = `${winner.icon} +1 ${winner.value}`;

            resultHtml = `
              <div class="lootbox-reward-item" style="justify-content: center; font-size: 18px;">
                ${displayLabel}
              </div>
              <button class="btn-large btn-lootbox-claim" style="margin-top: 16px;">CLAIM REWARDS</button>
            `;
          }

          // Update UI
          const statusText = content.querySelector('.roulette-status-text');
          statusText.innerHTML = `You won a reward!`;
          statusText.style.color = winner.color;

          const resultArea = content.querySelector('.lootbox-result-area');
          resultArea.innerHTML = resultHtml;
          resultArea.style.opacity = 1;

          // Wire up event listeners
          if (winner.type === 'weapon' && !weaponAddedDirectly) {
            const swapButtons = resultArea.querySelectorAll('.btn-swap-weapon');
            swapButtons.forEach(btn => {
              btn.addEventListener('click', (e) => {
                const idx = Number(e.currentTarget.dataset.index);
                PlayerManager.replaceWeapon(idx, winner.value);
                const panel = resultArea.querySelector('.lootbox-weapon-swap-panel');
                panel.innerHTML = `
                  <div class="lootbox-reward-item weapon-success" style="justify-content: center; margin-bottom: 12px;">
                    ✅ Swapped Slot ${idx + 1} for ${winner.value}!
                  </div>
                  <button class="btn-large btn-lootbox-claim">CLAIM REWARDS</button>
                `;
                // Wire claim on the new claim button
                const newClaim = panel.querySelector('.btn-lootbox-claim');
                newClaim.addEventListener('click', () => {
                  PopupsManager.closeAllPopups();
                  state.save();
                  if (typeof UIManager !== 'undefined' && UIManager.refreshGameUI) {
                    UIManager.refreshGameUI();
                  }
                });
                state.save();
                if (typeof UIManager !== 'undefined' && UIManager.refreshGameUI) {
                  UIManager.refreshGameUI();
                }
              });
            });

            const discardBtn = resultArea.querySelector('.btn-swap-discard');
            if (discardBtn) {
              discardBtn.addEventListener('click', () => {
                const panel = resultArea.querySelector('.lootbox-weapon-swap-panel');
                panel.innerHTML = `
                  <div class="lootbox-reward-item weapon-discarded" style="justify-content: center; margin-bottom: 12px;">
                    ❌ Discarded ${winner.value}.
                  </div>
                  <button class="btn-large btn-lootbox-claim">CLAIM REWARDS</button>
                `;
                // Wire claim on the new claim button
                const newClaim = panel.querySelector('.btn-lootbox-claim');
                newClaim.addEventListener('click', () => {
                  PopupsManager.closeAllPopups();
                  state.save();
                  if (typeof UIManager !== 'undefined' && UIManager.refreshGameUI) {
                    UIManager.refreshGameUI();
                  }
                });
              });
            }
          } else {
            // Simple claim button listener
            const claimBtn = resultArea.querySelector('.btn-lootbox-claim');
            if (claimBtn) {
              claimBtn.addEventListener('click', () => {
                PopupsManager.closeAllPopups();
                state.save();
                if (typeof UIManager !== 'undefined' && UIManager.refreshGameUI) {
                  UIManager.refreshGameUI();
                }
              });
            }
          }

        }, 4500); // Wait for spin to stop (4.5 seconds)

      }, 800); // 800ms chest shaking
    });
  }

  static spawnLootboxParticles(popupElement) {
    const graphic = popupElement.querySelector('.lootbox-graphic-container');
    if (!graphic) return;
    const rect = graphic.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const colors = ['#ffd700', '#ffb33f', '#00e5ff', '#ff3366', '#a15cff'];
    const count = 30;

    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      const size = 6 + Math.random() * 8;
      const color = colors[Math.floor(Math.random() * colors.length)];
      
      p.style.cssText = `
        position: fixed;
        left: ${cx}px;
        top: ${cy}px;
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        box-shadow: 0 0 6px ${color};
        border-radius: 50%;
        pointer-events: none;
        z-index: 16000;
        will-change: transform, opacity;
      `;
      document.body.appendChild(p);

      const angle = Math.random() * Math.PI * 2;
      const velocity = 3 + Math.random() * 6;
      let vx = Math.cos(angle) * velocity;
      let vy = Math.sin(angle) * velocity - 2;

      let x = cx;
      let y = cy;
      let life = 1.0;
      const decay = 0.015 + Math.random() * 0.015;
      const gravity = 0.15;

      const animate = () => {
        vy += gravity;
        x += vx;
        y += vy;
        life -= decay;
        if (life > 0) {
          p.style.transform = `translate3d(${x - cx}px, ${y - cy}px, 0) scale(${life})`;
          p.style.opacity = life;
          requestAnimationFrame(animate);
        } else {
          p.remove();
        }
      };
      requestAnimationFrame(animate);
    }
  }

  static showSpecialEventClaimPopup(event, rewardData, onConfirm) {
    this.closeAllPopups();
    const overlay = this.createPopupOverlay();
    const popup = document.createElement('div');
    popup.className = 'popup special-event-popup';

    const icon = rewardData?.icon || '❓';
    const title = rewardData?.name || 'Mysterious Reward';
    const description = rewardData?.description || 'You encounter a rare and mysterious phenomenon.';
    const buttonText = rewardData?.claimButtonText || 'CLAIM REWARD';

    popup.innerHTML = `
      <div class="special-event-icon-container">${icon}</div>
      <h2 class="special-event-title">${title}</h2>
      <p class="special-event-flavor">${description}</p>
      <div class="special-event-actions">
        <button class="btn-special-cancel">CANCEL</button>
        <button class="btn-special-claim">${buttonText}</button>
      </div>
    `;

    popup.querySelector('.btn-special-cancel').addEventListener('click', () => this.closeAllPopups());
    popup.querySelector('.btn-special-claim').addEventListener('click', () => {
      this.closeAllPopups();
      if (typeof onConfirm === 'function') {
        onConfirm();
      }
    });

    overlay.appendChild(popup);
    document.body.appendChild(overlay);
    
    if (typeof PopupAnimation !== 'undefined' && PopupAnimation.scale) {
      PopupAnimation.scale(popup);
    }
  }

  static showRuneSelection(weaponName, tier) {
    const state = getGameState();
    this.closeAllPopups();

    const tierKey = 'tier' + tier;
    const tierRunes = state.config.runes?.[tierKey];
    if (!tierRunes) return;

    const allRuneNames = Object.keys(tierRunes);
    const selectedRunes = [];

    // Select up to 3 random runes from this tier
    const countToSelect = Math.min(3, allRuneNames.length);
    while (selectedRunes.length < countToSelect) {
      const rune = allRuneNames[Math.floor(Math.random() * allRuneNames.length)];
      if (!selectedRunes.includes(rune)) {
        selectedRunes.push(rune);
      }
    }

    const overlay = this.createPopupOverlay();
    overlay.style.pointerEvents = 'none'; // Prevent closing by clicking overlay

    const popup = document.createElement('div');
    popup.className = 'popup buff-selection-popup rune-selection-popup';
    popup.style.pointerEvents = 'auto';

    let html = `<h2>INFUSE ${weaponName.toUpperCase()}<br>(Tier ${tier} Rune)</h2>`;
    html += '<div class="buff-selection-grid">';

    selectedRunes.forEach(runeName => {
      const rune = tierRunes[runeName];
      html += `
        <div class="buff-option rune-option" data-rune="${runeName}">
          <div class="buff-icon rune-icon">${rune.icon}</div>
          <div class="buff-title rune-title">${runeName}</div>
          <div class="buff-effect rune-effect">${rune.description}</div>
          <button class="btn-select">INFUSE</button>
        </div>
      `;
    });

    html += '</div>';
    popup.innerHTML = html;

    popup.querySelectorAll('.btn-select').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const chosenRuneName = e.target.closest('.rune-option').dataset.rune;
        if (!state.playerState.weaponRunes) {
          state.playerState.weaponRunes = {};
        }
        if (!state.playerState.weaponRunes[weaponName]) {
          state.playerState.weaponRunes[weaponName] = {};
        }
        state.playerState.weaponRunes[weaponName][tierKey] = chosenRuneName;
        
        try {
          FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2, `Infused ${chosenRuneName}!`, { color: '#ffd700' });
        } catch (err) {}
        
        this.closeAllPopups();
        state.save();
        if (window.UIManager && UIManager.refreshGameUI) {
          UIManager.refreshGameUI();
        }
      });
    });

    overlay.appendChild(popup);
    document.body.appendChild(overlay);
    
    if (typeof PopupAnimation !== 'undefined' && PopupAnimation.scale) {
      PopupAnimation.scale(popup);
    }
  }

  static showBuildCompendium() {
    this.closeAllPopups();
    const state = getGameState();
    const overlay = this.createPopupOverlay();
    overlay.style.pointerEvents = 'auto';

    const popup = document.createElement('div');
    popup.className = 'popup compendium-popup';
    popup.style.width = 'min(900px, 95vw)';
    popup.style.maxWidth = '900px';

    popup.innerHTML = `
      <h2>📖 BUILD COMPENDIUM</h2>
      <button class="btn-close">✕</button>
      <div class="compendium-controls">
        <input type="text" id="compendiumSearch" placeholder="Search items, passives, skills, effects..." autocomplete="off" />
        <div class="compendium-tabs">
          <button class="compendium-tab-btn active" data-tab="classes">🛡️ CLASSES</button>
          <button class="compendium-tab-btn" data-tab="weapons">⚔️ WEAPONS</button>
          <button class="compendium-tab-btn" data-tab="talismans">🧿 TALISMANS</button>
          <button class="compendium-tab-btn" data-tab="buffs">✨ BUFFS</button>
          <button class="compendium-tab-btn" data-tab="runes">🧪 RUNES & ITEMS</button>
          <button class="compendium-tab-btn" data-tab="mechanics">📖 GUIDE</button>
        </div>
      </div>
      <div id="compendiumContent" class="compendium-content-body"></div>
    `;

    overlay.appendChild(popup);
    document.body.appendChild(overlay);

    const searchInput = popup.querySelector('#compendiumSearch');
    const tabButtons = popup.querySelectorAll('.compendium-tab-btn');
    const contentBody = popup.querySelector('#compendiumContent');

    let currentTab = 'classes';

    const render = () => {
      const query = searchInput.value.toLowerCase().trim();
      let html = '';

      if (currentTab === 'classes') {
        html += '<div class="compendium-grid classes-grid">';
        const classes = state.config.classes || {};
        const skillMetas = state.config.classSkillMeta || {};
        Object.entries(classes).forEach(([name, data]) => {
          const skillMeta = skillMetas[name] || {};
          const searchString = `${name} ${data.passive} ${data.skill || ''} ${skillMeta.name || ''}`.toLowerCase();
          if (query && !searchString.includes(query)) return;

          const skillIcon = skillMeta.icon || '✨';
          const skillColor = skillMeta.color || '#38bdf8';

          html += `
            <div class="compendium-card class-card">
              <h3>${name}</h3>
              <div class="compendium-card-stats">
                <span>HP: <strong>${data.hp}</strong></span>
                <span>Mana: <strong>${data.mana}</strong></span>
                <span>HP Regen: <strong>${data.hpRegen}</strong></span>
                <span>Mana Regen: <strong>${data.manaRegen}</strong></span>
              </div>
              <div class="compendium-card-section">
                <div class="section-label">PASSIVE</div>
                <div class="section-desc">${data.passive}</div>
              </div>
              <div class="compendium-card-section">
                <div class="section-label" style="color: ${skillColor}">SKILL: ${skillMeta.name || 'Active'}</div>
                <div class="section-desc">${skillIcon} ${data.skill || 'No skill'}</div>
              </div>
            </div>
          `;
        });
        html += '</div>';
      } else if (currentTab === 'weapons') {
        html += '<div class="compendium-grid weapons-grid">';
        const weapons = state.config.weapons || {};
        Object.entries(weapons).forEach(([name, data]) => {
          const searchString = `${name} ${data.type} ${data.special || ''}`.toLowerCase();
          if (query && !searchString.includes(query)) return;

          const wPrice = (typeof ShopManager !== 'undefined' && typeof ShopManager.getWeaponPrice === 'function') ? ShopManager.getWeaponPrice(name) : null;
          const priceStr = wPrice !== null ? `${wPrice}💰` : (data.price ? `${data.price}💎` : 'Free');

          html += `
            <div class="compendium-card weapon-card">
              <h3>${name}</h3>
              <div class="weapon-type-badge">${data.type}</div>
              <div class="compendium-card-stats">
                <span>AP Cost: <strong>${data.baseApCost}</strong></span>
                <span>Dmg Mult: <strong>${data.damageMultiplier}x</strong></span>
                <span>Crit: <strong>${Math.round(data.critChance * 100)}%</strong></span>
                <span>Fire Rate: <strong>${data.fireRate}</strong></span>
                <span>Price: <strong>${priceStr}</strong></span>
              </div>
              ${data.special ? `
              <div class="compendium-card-section">
                <div class="section-label">SPECIAL</div>
                <div class="section-desc">${data.special}</div>
              </div>` : ''}
            </div>
          `;
        });
        html += '</div>';
      } else if (currentTab === 'talismans') {
        html += '<div class="compendium-grid talismans-grid">';
        const talismans = state.config.talismans || {};
        Object.entries(talismans).forEach(([name, data]) => {
          const searchString = `${name} ${data.description || ''}`.toLowerCase();
          if (query && !searchString.includes(query)) return;

          html += `
            <div class="compendium-card talisman-card">
              <div class="compendium-card-header">
                <span class="compendium-card-icon">${data.icon || '🧿'}</span>
                <h3>${name}</h3>
              </div>
              <div class="compendium-card-section">
                <div class="section-desc">${data.description || 'No description'}</div>
              </div>
            </div>
          `;
        });
        html += '</div>';
      } else if (currentTab === 'buffs') {
        html += '<div class="compendium-grid buffs-grid">';
        const buffs = state.config.buffs || {};
        Object.entries(buffs).forEach(([name, data]) => {
          const searchString = `${name} ${data.description || ''}`.toLowerCase();
          if (query && !searchString.includes(query)) return;

          html += `
            <div class="compendium-card buff-card">
              <div class="compendium-card-header">
                <span class="compendium-card-icon">${data.icon || '✨'}</span>
                <h3>${name}</h3>
              </div>
              <div class="compendium-card-section">
                <div class="section-desc">${data.description || 'No description'}</div>
              </div>
            </div>
          `;
        });
        html += '</div>';
      } else if (currentTab === 'runes') {
        html += '<div class="compendium-subsections">';
        
        // Runes
        html += '<h2>RUNES</h2>';
        html += '<div class="compendium-grid runes-grid">';
        const runes = state.config.runes || {};
        Object.entries(runes).forEach(([tierName, tierRunes]) => {
          Object.entries(tierRunes).forEach(([name, data]) => {
            const searchString = `${name} ${tierName} ${data.description || ''}`.toLowerCase();
            if (query && !searchString.includes(query)) return;

            html += `
              <div class="compendium-card rune-card">
                <div class="compendium-card-header">
                  <span class="compendium-card-icon">${data.icon || '🧪'}</span>
                  <h3>${name} <span class="rune-tier-label">${tierName.toUpperCase()}</span></h3>
                </div>
                <div class="compendium-card-section">
                  <div class="section-desc">${data.description || 'No description'}</div>
                </div>
              </div>
            `;
          });
        });
        html += '</div>';

        // Consumables
        html += '<h2 class="section-divider">CONSUMABLES</h2>';
        html += '<div class="compendium-grid consumables-grid">';
        const consumables = state.config.consumables || {};
        Object.entries(consumables).forEach(([name, data]) => {
          const searchString = `${name} ${data.type} ${data.effect || ''}`.toLowerCase();
          if (query && !searchString.includes(query)) return;

          const cPrice = (typeof ShopManager !== 'undefined' && typeof ShopManager.getConsumablePrice === 'function') ? ShopManager.getConsumablePrice(name) : null;
          const priceStr = cPrice !== null ? `${cPrice}💰` : (data.price ? `${data.price}💎` : 'Free');

          html += `
            <div class="compendium-card consumable-card">
              <div class="compendium-card-header">
                <span class="compendium-card-icon">🧪</span>
                <h3>${name}</h3>
              </div>
              <div class="weapon-type-badge">${data.type}</div>
              <div class="compendium-card-stats">
                <span>Price: <strong>${priceStr}</strong></span>
              </div>
              <div class="compendium-card-section">
                <div class="section-label">EFFECT</div>
                <div class="section-desc">${data.effect || 'No description'}</div>
              </div>
            </div>
          `;
        });
        html += '</div>';

        html += '</div>';
      } else if (currentTab === 'mechanics') {
        const searchString = `damage scaling leveling attributes kill tags runes pet mechanics guide`.toLowerCase();
        if (!query || searchString.includes(query)) {
          html += `
            <div class="compendium-guide-container">
              <div class="guide-section">
                <h3>⚔️ DAMAGE FORMULA & SCALING</h3>
                <p>Damage dealt is computed as: <strong>Damage = (Scaled AP Cost × Weapon Multiplier)</strong></p>
                <ul>
                  <li><strong>AP Scaling:</strong> The base AP cost of weapons scales based on your maximum AP: <code>S = max(0.3, min(2.0, Max AP / 350))</code>. The scaled cost is <code>Math.round(Base AP Cost × S)</code>.</li>
                  <li><strong>Crit Multiplier:</strong> Critical hits deal <strong>2.0×</strong> damage.</li>
                  <li><strong>Combo Multiplier:</strong> Each combo chain stack adds <strong>+10%</strong> damage and reduces AP cost by <strong>-5%</strong> (up to 3 stacks base, or 10 stacks for Uzi).</li>
                  <li><strong>Daily Streak:</strong> Perfect completion days grant <strong>+1%</strong> damage bonus per streak day.</li>
                  <li><strong>Talismans & Passives:</strong> e.g., <em>Wrathstone</em> grants <strong>+40%</strong> damage below 30% HP; <em>Void Lens</em> grants <strong>+100%</strong> damage after an enemy resists.</li>
                </ul>
              </div>

              <div class="guide-section">
                <h3>📈 LEVELING & ATTRIBUTES</h3>
                <p>Gain character levels to progress through stages.</p>
                <ul>
                  <li><strong>Leveling Up:</strong> You level up automatically upon clearing all enemies in a room. Character level itself does not automatically raise HP/Mana.</li>
                  <li><strong>Attribute Points:</strong> Earn points by completing Dailies and To-Dos. Reaching point thresholds levels up attributes (STR, DISC, RESP, SOC, CAP, CREA, INT), boosting combat capacity.</li>
                </ul>
              </div>

              <div class="guide-section">
                <h3>🏷️ KILL TAGS & RUNES</h3>
                <p>Defeating enemies with a weapon awards Kill Tags used for customization and enhancement.</p>
                <ul>
                  <li><strong>Kill Tags:</strong> Gain +1 Kill Tag per defeated enemy. Spend 5 Kill Tags in the smith shop to purchase permanent weapon upgrades. Rangers gain tags every 3 kills instead of 5, and can carry 3 weapons.</li>
                  <li><strong>Rune Infusion:</strong> Reaching <strong>15, 30, and 45 Kill Tags</strong> on any weapon triggers a selection to infuse Tier 1, Tier 2, and Tier 3 Runes respectively (e.g. Flame, Frost, Storm, Venom, Siphon, Focus, Hoard, Blast, Overpower).</li>
                </ul>
              </div>

              <div class="guide-section">
                <h3>🐾 PET MECHANICS</h3>
                <p>Pets attack automatically alongside the player.</p>
                <ul>
                  <li><strong>Pet Damage:</strong> Base damage scales with Player Level and Max AP: <code>Pet Damage = Max AP × (0.02 + (Player Level - 1) × 0.01)</code>.</li>
                  <li><strong>Druid Class Synergy:</strong> Druid class multiplies pet damage by <strong>5.0×</strong>.</li>
                </ul>
              </div>
            </div>
          `;
        }
      }

      contentBody.innerHTML = html || '<div class="compendium-empty">No results found matching your search.</div>';
    };

    // Tab switching
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        tabButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentTab = btn.dataset.tab;
        render();
      });
    });

    // Search input
    searchInput.addEventListener('input', render);

    popup.querySelector('.btn-close').addEventListener('click', () => {
      this.closeAllPopups();
    });

    // Render initially
    render();

    if (typeof PopupAnimation !== 'undefined' && PopupAnimation.scale) {
      PopupAnimation.scale(popup);
    }
  }

  // ============================================================
  // BESTIARY / ENEMY CATALOG
  // ============================================================

  static showBestiary() {
    const state = getGameState();
    this.closeAllPopups();

    const overlay = this.createPopupOverlay();
    const popup = document.createElement('div');
    popup.className = 'popup bestiary-popup';

    const seenEnemies = state.systemState.runSeenEnemies || {};
    const enemyDb = typeof ENEMY_DATABASE !== 'undefined' ? ENEMY_DATABASE : {};
    const bossesDb = state.config.bosses || {};

    // Grouping by stage
    const stages = {
      1: { name: "Stage 1: Forest & Desert", enemies: [] },
      2: { name: "Stage 2: Caves & Swamps", enemies: [] },
      3: { name: "Stage 3: Glaciers & Ruins", enemies: [] },
      4: { name: "Stage 4: Graveyards & Castles", enemies: [] },
      5: { name: "Stage 5: Volcanoes & Isles", enemies: [] },
      6: { name: "Stage 6: Mountains & Seas", enemies: [] },
      7: { name: "Stage 7: The Void", enemies: [] },
      'bosses': { name: "Bosses", enemies: [] }
    };

    // Collate standard enemies
    Object.entries(enemyDb).forEach(([name, data]) => {
      const stageId = data.stage;
      if (stages[stageId]) {
        stages[stageId].enemies.push({
          name,
          stage: stageId,
          archetype: data.archetype,
          resist: data.resist,
          weak: data.weak,
          isBoss: false
        });
      }
    });

    // Collate bosses
    Object.entries(bossesDb).forEach(([name, data]) => {
      stages['bosses'].enemies.push({
        name,
        stage: 'Boss',
        archetype: 'Boss',
        resist: data.resist,
        weak: data.weak,
        isBoss: true
      });
    });

    let html = '<h2>📖 BESTIARY</h2><button class="btn-close">✕</button>';
    html += '<div class="popup-scrollable-body" style="max-height: 65vh; overflow-y: auto;">';

    Object.entries(stages).forEach(([id, stageData]) => {
      if (stageData.enemies.length === 0) return;

      // Count encountered
      const totalCount = stageData.enemies.length;
      const discoveredCount = stageData.enemies.filter(e => seenEnemies[e.name]).length;

      html += `
        <div class="bestiary-accordion" data-stage="${id}">
          <div class="accordion-title-wrap">
            <span>${stageData.name}</span>
            <span style="font-size: 7px; color: var(--accent-gold);">(${discoveredCount}/${totalCount})</span>
          </div>
          <span class="accordion-arrow">▶</span>
        </div>
        <div class="bestiary-panel" id="panel-${id}">
          <div class="bestiary-grid">
      `;

      stageData.enemies.forEach(enemy => {
        const isSeen = !!seenEnemies[enemy.name];
        const emoji = isSeen ? (typeof UIManager !== 'undefined' ? UIManager.getEnemyEmoji(enemy) : '👾') : '❓';
        const cardClass = isSeen ? (enemy.isBoss ? 'bestiary-card boss' : 'bestiary-card') : 'bestiary-card locked';
        const displayName = isSeen ? enemy.name : '???';
        const metaText = isSeen ? (enemy.isBoss ? 'Boss' : enemy.archetype) : 'Undiscovered';

        html += `
            <div class="${cardClass}" data-enemy-name="${enemy.name}" data-seen="${isSeen}">
              <div class="bestiary-card-icon">${emoji}</div>
              <div class="bestiary-card-name">${displayName}</div>
              <div class="bestiary-card-meta">${metaText}</div>
            </div>
        `;
      });

      html += `
          </div>
        </div>
      `;
    });

    html += '</div>';

    // Add Mutator Glossary footer
    html += `
      <div style="margin-top: 16px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 12px; font-size: 7px; color: var(--text-muted); line-height: 1.4;">
        <span style="font-weight: bold; color: var(--accent-gold); display: block; margin-bottom: 4px; font-size: 8px;">MUTATOR REFERENCE:</span>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 6px;">
          <span>🩸 Vampiric: Heals on hit</span>
          <span>🌿 Regenerator: Heals daily</span>
          <span>📣 Rallyist: Boosts ally dmg</span>
          <span>🔫 Turret: Backlash dmg</span>
          <span>⚡ Swift: Bypasses shields</span>
          <span>☠️ Necromancer: Revives dead</span>
        </div>
      </div>
    `;

    popup.innerHTML = html;
    popup.querySelector('.btn-close').addEventListener('click', () => this.closeAllPopups());

    // Accordion expand/collapse behavior
    popup.querySelectorAll('.bestiary-accordion').forEach(header => {
      header.addEventListener('click', () => {
        const stageId = header.dataset.stage;
        const panel = popup.querySelector(`#panel-${stageId}`);
        const isActive = header.classList.contains('active');

        // Close others
        popup.querySelectorAll('.bestiary-accordion').forEach(h => {
          if (h !== header) {
            h.classList.remove('active');
            const pId = h.dataset.stage;
            const p = popup.querySelector(`#panel-${pId}`);
            if (p) p.classList.remove('active');
          }
        });

        // Toggle current
        if (isActive) {
          header.classList.remove('active');
          if (panel) panel.classList.remove('active');
        } else {
          header.classList.add('active');
          if (panel) panel.classList.add('active');
        }
      });
    });

    // Enemy card click behavior
    popup.querySelectorAll('.bestiary-card').forEach(card => {
      card.addEventListener('click', () => {
        const isSeen = card.dataset.seen === 'true';
        if (!isSeen) {
          try { if (window.SoundManager) SoundManager.play('miss'); } catch(e) {}
          return;
        }
        const name = card.dataset.enemyName;
        this.showBestiaryDetail(name);
      });
    });

    overlay.appendChild(popup);
    document.body.appendChild(overlay);
    if (typeof PopupAnimation !== 'undefined' && PopupAnimation.scale) {
      PopupAnimation.scale(popup);
    }
  }

  static showBestiaryDetail(enemyName) {
    const state = getGameState();
    const enemyDb = typeof ENEMY_DATABASE !== 'undefined' ? ENEMY_DATABASE : {};
    const bossesDb = state.config.bosses || {};

    let enemyData = enemyDb[enemyName];
    let isBoss = false;
    if (!enemyData && bossesDb[enemyName]) {
      enemyData = bossesDb[enemyName];
      isBoss = true;
    }

    if (!enemyData) return;

    // Create a wrapper overlay for detail to overlay the bestiary popup
    const overlay = document.createElement('div');
    overlay.className = 'popup-overlay bestiary-detail-overlay';
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
      }
    });

    const popup = document.createElement('div');
    popup.className = 'popup bestiary-detail-popup';

    const emoji = typeof UIManager !== 'undefined' ? UIManager.getEnemyEmoji({ name: enemyName }) : '👾';
    const archetypeDesc = isBoss 
      ? "Bosses are powerful enemies encountered at the end of runs. They possess unique attack patterns, transition into Phase 2, and are immune to instant-kill effects."
      : (state.config.enemyArchetypes[enemyData.archetype] || { description: "A standard enemy." }).description;

    const resist = enemyData.resist || '-';
    const weak = enemyData.weak || '-';

    const resistColor = typeof UIManager !== 'undefined' ? UIManager.getEnemyElementColor(resist) : '#fff';
    const weakColor = typeof UIManager !== 'undefined' ? UIManager.getEnemyElementColor(weak) : '#fff';

    let html = `<h2>ENEMY PROFILE</h2><button class="btn-close">✕</button>`;
    html += `
      <div class="bestiary-detail-content">
        <div class="bestiary-detail-icon">${emoji}</div>
        <div class="bestiary-detail-title">${enemyName}</div>
        <div style="font-size: 8px; color: var(--accent-gold); text-transform: uppercase;">
          ${isBoss ? 'STAGE BOSS' : `Stage ${enemyData.stage} | ${enemyData.archetype}`}
        </div>

        <div class="bestiary-detail-section">
          <div class="bestiary-detail-section-title">ELEMENTAL INFO</div>
          <div class="bestiary-detail-elements">
            <div class="bestiary-element-badge" style="border-color: ${resistColor};">
              <span style="color: var(--text-muted); display: block; font-size: 6px;">RESISTANT TO</span>
              <span style="font-weight: bold; color: ${resistColor};">${resist}</span>
            </div>
            <div class="bestiary-element-badge" style="border-color: ${weakColor};">
              <span style="color: var(--text-muted); display: block; font-size: 6px;">VULNERABLE TO</span>
              <span style="font-weight: bold; color: ${weakColor};">${weak}</span>
            </div>
          </div>
        </div>

        <div class="bestiary-detail-section">
          <div class="bestiary-detail-section-title">BEHAVIOR & ARCHETYPE</div>
          <p style="margin: 0; color: #fff; font-size: 8px; line-height: 1.4;">${archetypeDesc}</p>
        </div>
        
        <button class="btn-large btn-ok" style="margin-top: 8px; width: 100%;">CLOSE</button>
      </div>
    `;

    popup.innerHTML = html;

    const closeDetail = () => overlay.remove();
    popup.querySelector('.btn-close').addEventListener('click', closeDetail);
    popup.querySelector('.btn-ok').addEventListener('click', closeDetail);

    overlay.appendChild(popup);
    document.body.appendChild(overlay);
    if (typeof PopupAnimation !== 'undefined' && PopupAnimation.scale) {
      PopupAnimation.scale(popup);
    }
  }
}
