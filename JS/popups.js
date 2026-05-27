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

      const prevP = thresholds[data.level - 1] || 0;
      const nextP = thresholds[data.level] || (prevP + 10);
      const playerPercent = Math.max(0, Math.min(100, ((data.points - prevP) / Math.max(1, (nextP - prevP))) * 100));

      const prevN = thresholds[nemData.level - 1] || 0;
      const nextN = thresholds[nemData.level] || (prevN + 10);
      const nemPercent = Math.max(0, Math.min(100, ((nemData.points - prevN) / Math.max(1, (nextN - prevN))) * 100));

      const playerLeads = data.level > nemData.level;
      const nemesisLeads = nemData.level > data.level;

      html += `
        <div class="attr-row">
          <span class="attr-name">${attr}</span>
          <span class="attr-level">${data.level} · ${Math.round(playerPercent)}%</span>
          <div class="attr-bar">
            <div class="attr-fill" style="width: ${playerPercent}%"></div>
          </div>
          <span class="attr-points">${data.points}</span>
          ${playerLeads ? '⬆️' : ''}
          ${nemesisLeads ? '⚠️' : ''}
        </div>
      `;
    });
    
    // Recompute nemesis leads count explicitly by attribute keys
    let nemesisLeads = 0;
    (state.config.attributes || []).forEach(a => {
      const p = state.playerState.attributes?.[a]?.level || 1;
      const n = state.nemesisState.attributes?.[a]?.level || 1;
      if (n > p) nemesisLeads++;
    });
    
    html += '</div>';
    html += `<div class="nemesis-info">Nemesis leads in ${nemesisLeads} attributes</div>`;
    
    popup.innerHTML = html;
    popup.querySelector('.btn-close').addEventListener('click', () => this.closeAllPopups());
    
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
  // WEAPON DISCARD / REPLACE POPUP (Shop flow when inventory full)
  // ============================================================
  static showWeaponDiscard(newWeaponName, element = null) {
    const state = getGameState();
    this.closeAllPopups();

    const overlay = this.createPopupOverlay();
    const popup = document.createElement('div');
    popup.className = 'popup discard-popup';

    let html = `<h2>Replace a Weapon to buy ${newWeaponName}</h2><button class="btn-close">✕</button>`;
    html += '<div class="weapon-replace-list">';

    const weapons = state.playerState.weapons || [];
    weapons.forEach((w, idx) => {
      html += `
        <div class="replace-row" data-index="${idx}">
          <div class="replace-name">Slot ${idx + 1}: ${w || 'Empty'}</div>
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
        <button class="btn-large btn-quit">QUIT TO MENU</button>
      </div>
    `;
    
    popup.innerHTML = html;
    
    popup.querySelector('.btn-new-class').addEventListener('click', () => {
      this.closeAllPopups();
      this.showClassSelection();
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
      html += `
        <div class="class-card" data-class="${className}">
          <h3>${className}</h3>
          <div class="class-stats">
            <p>HP: ${data.hp}</p>
            <p>Mana: ${data.mana}</p>
          </div>
          <p class="class-passive">${data.passive}</p>
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
    const overlay = document.createElement('div');
    overlay.className = 'popup-overlay';
    overlay.style.pointerEvents = 'auto';
    
    const popup = document.createElement('div');
    popup.className = 'popup pause-popup';
    popup.style.pointerEvents = 'auto';
    
    const html = `
      <h2>⏸️ PAUSED</h2>
      <p>All timers and regen are frozen.</p>
      <div class="pause-menu">
        <button class="btn-pause-action" id="resumeBtn">▶️ RESUME</button>
        <button class="btn-pause-action" id="resetDataBtn">🗑️ RESET SAVE DATA</button>
        <button class="btn-pause-action" id="quitBtn">🚪 QUIT TO MENU</button>
      </div>
    `;
    
    popup.innerHTML = html;
    
    popup.querySelector('#resumeBtn').addEventListener('click', () => {
      getGameState().resume();
      this.closeAllPopups();
    });
    
    // attributes moved to center modal button; pause menu no longer exposes attributes here

    popup.querySelector('#resetDataBtn').addEventListener('click', () => {
      if (confirm('Delete all local save data for Nemesis? This cannot be undone.')) {
        localStorage.removeItem('nemesis_data');
        localStorage.removeItem('nemesis_planner_data');
        location.reload();
      }
    });
    
    popup.querySelector('#quitBtn').addEventListener('click', () => {
      if (confirm('Are you sure? Unsaved progress will be lost.')) {
        location.reload();
      }
    });
    
    overlay.appendChild(popup);
    document.body.appendChild(overlay);
    PopupAnimation.scale(popup);
  }

  // ============================================================
  // EDIT DAILY / TODO
  // ============================================================

  static showEditDaily(dailyId) {
    const state = getGameState();
    const daily = state.dailiesState.dailies.find(d => d.id === dailyId);
    if (!daily) return;

    this.closeAllPopups();
    const overlay = this.createPopupOverlay();
    const popup = document.createElement('div');
    popup.className = 'popup edit-daily-popup';

    const attrs = state.config.attributes.map(a => `<option value="${a}" ${a===daily.attribute? 'selected':''}>${a}</option>`).join('');
    popup.innerHTML = `
      <h2>EDIT DAILY</h2>
      <button class="btn-close">✕</button>
      <label>Name</label>
      <input id="editName" value="${daily.name}" />
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
      <button class="btn-large" id="saveDaily">SAVE</button>
    `;

    popup.querySelector('.btn-close').addEventListener('click', () => this.closeAllPopups());
    overlay.appendChild(popup);
    document.body.appendChild(overlay);

    popup.querySelector('#saveDaily').addEventListener('click', () => {
      const updates = {
        name: popup.querySelector('#editName').value,
        attribute: popup.querySelector('#editAttr').value,
        difficulty: popup.querySelector('#editDiff').value,
        maxCompletionsPerDay: Math.max(1, Number(popup.querySelector('#editMax').value) || 1)
      };
      TaskManager.editDaily(dailyId, updates);
      this.closeAllPopups();
      UIManager.updateDailiesList();
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
      <button class="btn-large" id="saveTodo">SAVE</button>
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
    PopupAnimation.scale(popup);
  }
}
