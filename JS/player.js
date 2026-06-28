/**
 * NEMESIS ROGUELIKE — PLAYER SYSTEM
 * Class management, leveling, attributes, resources
 */

class PlayerManager {
  static initializeClass(className) {
    const state = getGameState();
    const classData = state.config.classes[className];
    
    if (!classData) {
      console.error(`Class not found: ${className}`);
      return false;
    }

    if (typeof state.resetRunState === 'function') {
      state.resetRunState();
    }
    
    state.playerState.className = className;
    state.playerState.maxHp = classData.hp;
    state.playerState.hp = classData.hp;
    state.playerState.maxMana = classData.mana;
    state.playerState.mana = classData.mana;
    state.playerState.level = 1;
    
    // Initialize attributes
    state.config.attributes.forEach(attr => {
      state.playerState.attributes[attr] = { points: 0, level: 1 };
    });
    
    // Initialize weapons
    if (className === 'Ranger') {
      state.playerState.weapons = [null, null, null];
    } else {
      state.playerState.weapons = [null, null];
    }
    state.playerState.weaponElements = new Array(state.playerState.weapons.length).fill(null);
    
    state.playerState.activeWeapon = 0;
    state.playerState.consumables = {};
    state.playerState.weaponUpgrades = {};
    
    // Start with Rusty Sword
    state.playerState.weapons[0] = 'Rusty Sword';
    state.playerState.weaponElements[0] = null;
    state.playerState.killTagsByWeapon = { 'Rusty Sword': 0 };
    
    // Recalculate MAX_AP
    this.recalculateMaxAp();
    
    state.systemState.runStats.startClass = className;
    state.eventBus.emit(EVENTS.GAME_START, { class: className });
    
    return true;
  }
  
  static recalculateMaxAp() {
    const state = getGameState();
    
    // MAX_AP = average sum of AP from dailies based on their schedule
    let totalAp = 0;
    state.dailiesState.dailies.forEach(daily => {
      const reward = state.config.taskRewards[daily.difficulty];
      const baseAp = reward?.ap || 0;
      
      let weight = 1;
      if (daily.repeatMode === 'weekly') {
        const activeDays = Array.isArray(daily.weekDays) ? daily.weekDays.length : 7;
        weight = activeDays / 7;
      } else if (daily.repeatMode === 'interval') {
        const interval = Math.max(1, daily.intervalDays || 1);
        weight = 1 / interval;
      }
      totalAp += baseAp * weight;
    });

    let maxAp = Math.round(totalAp);

    const completeDayBonus = Number(state.systemState?.completeDayApBonus) || 0;
    maxAp += completeDayBonus;
    
    state.playerState.maxAp = maxAp;
    
    // Also update AP to not exceed new max
    if (state.playerState.ap > maxAp) {
      state.playerState.ap = maxAp;
    }
  }
  
  static levelUp() {
    const state = getGameState();
    
    if (state.playerState.level >= state.config.maxPlayerLevel) {
      return false;
    }
    
    state.playerState.level++;
    state.eventBus.emit(EVENTS.LEVEL_UP, { level: state.playerState.level });
    
    if (typeof RetroLevelUpAnimation !== 'undefined') {
      RetroLevelUpAnimation.play();
    }
    
    return true;
  }
  
  static getCurrentClassData() {
    const state = getGameState();
    return state.config.classes[state.playerState.className];
  }
  
  static getClassPassive() {
    const state = getGameState();
    return state.config.classPassives[state.playerState.className];
  }
  
  static getCurrentWeapon() {
    const state = getGameState();
    const weapons = Array.isArray(state.playerState.weapons) ? state.playerState.weapons : [];
    let activeIndex = Number.isInteger(state.playerState.activeWeapon) ? state.playerState.activeWeapon : 0;
    if (activeIndex < 0 || activeIndex >= weapons.length) activeIndex = 0;

    let weaponName = weapons[activeIndex];
    if (!weaponName) {
      const fallbackIndex = weapons.findIndex(Boolean);
      if (fallbackIndex >= 0) {
        activeIndex = fallbackIndex;
        weaponName = weapons[fallbackIndex];
        state.playerState.activeWeapon = fallbackIndex;
      }
    }

    if (!weaponName && state.config?.weapons?.['Rusty Sword']) {
      weaponName = 'Rusty Sword';
      state.playerState.activeWeapon = 0;
      if (!Array.isArray(state.playerState.weapons)) state.playerState.weapons = [];
      state.playerState.weapons[0] = 'Rusty Sword';
      if (!Array.isArray(state.playerState.weaponElements)) state.playerState.weaponElements = [];
      state.playerState.weaponElements[0] = null;
      if (!state.playerState.killTagsByWeapon) state.playerState.killTagsByWeapon = {};
      if (typeof state.playerState.killTagsByWeapon['Rusty Sword'] !== 'number') state.playerState.killTagsByWeapon['Rusty Sword'] = 0;
    }

    if (!weaponName) return null;
    
    return {
      name: weaponName,
      data: state.config.weapons[weaponName],
      element: state.playerState.weaponElements?.[state.playerState.activeWeapon] || null
    };
  }
  
  static switchWeapon(index) {
    const state = getGameState();
    
    if (index < 0 || index >= state.playerState.weapons.length) {
      return false;
    }
    
    if (!state.playerState.weapons[index]) {
      return false;
    }
    
    state.playerState.activeWeapon = index;
    return true;
  }
  
  static addWeapon(weaponName, element = null) {
    const state = getGameState();
    
    if (!state.config.weapons[weaponName]) {
      return false;
    }
    
    // Find empty slot
    for (let i = 0; i < state.playerState.weapons.length; i++) {
      if (!state.playerState.weapons[i]) {
        state.playerState.weapons[i] = weaponName;
        if (!Array.isArray(state.playerState.weaponElements)) {
          state.playerState.weaponElements = new Array(state.playerState.weapons.length).fill(null);
        }
        state.playerState.weaponElements[i] = element || null;
        state.playerState.killTagsByWeapon[weaponName] = 0;
        return true;
      }
    }
    
    // All slots full
    return false;
  }
  
  static replaceWeapon(index, newWeaponName, element = null) {
    const state = getGameState();
    
    if (index < 0 || index >= state.playerState.weapons.length) {
      return false;
    }
    
    if (!state.config.weapons[newWeaponName]) {
      return false;
    }
    
    // Transfer kill tags if same weapon type
    const oldWeapon = state.playerState.weapons[index];
    state.playerState.weapons[index] = newWeaponName;
    if (!Array.isArray(state.playerState.weaponElements)) {
      state.playerState.weaponElements = new Array(state.playerState.weapons.length).fill(null);
    }
    state.playerState.weaponElements[index] = element || null;
    
    if (!state.playerState.killTagsByWeapon[newWeaponName]) {
      state.playerState.killTagsByWeapon[newWeaponName] = 0;
    }
    
    return true;
  }
  
  static incrementKillTags(weaponName, count = 1) {
    const state = getGameState();
    
    if (!state.playerState.killTagsByWeapon[weaponName]) {
      state.playerState.killTagsByWeapon[weaponName] = 0;
    }
    
    const oldTags = state.playerState.killTagsByWeapon[weaponName];
    state.playerState.killTagsByWeapon[weaponName] += count;
    const newTags = state.playerState.killTagsByWeapon[weaponName];
    
    if (!state.playerState.weaponRunes) {
      state.playerState.weaponRunes = {};
    }
    if (!state.playerState.weaponRunes[weaponName]) {
      state.playerState.weaponRunes[weaponName] = {};
    }
    
    const runes = state.playerState.weaponRunes[weaponName];
    
    if (oldTags < 15 && newTags >= 15 && !runes.tier1) {
      setTimeout(() => {
        if (typeof PopupsManager !== 'undefined' && typeof PopupsManager.showRuneSelection === 'function') {
          PopupsManager.showRuneSelection(weaponName, 1);
        }
      }, 600);
    } else if (oldTags < 30 && newTags >= 30 && !runes.tier2) {
      setTimeout(() => {
        if (typeof PopupsManager !== 'undefined' && typeof PopupsManager.showRuneSelection === 'function') {
          PopupsManager.showRuneSelection(weaponName, 2);
        }
      }, 600);
    } else if (oldTags < 45 && newTags >= 45 && !runes.tier3) {
      setTimeout(() => {
        if (typeof PopupsManager !== 'undefined' && typeof PopupsManager.showRuneSelection === 'function') {
          PopupsManager.showRuneSelection(weaponName, 3);
        }
      }, 600);
    }
  }
  
  static getKillTags(weaponName) {
    const state = getGameState();
    return state.playerState.killTagsByWeapon[weaponName] || 0;
  }
  
  static spendKillTags(weaponName, count) {
    const state = getGameState();
    const current = this.getKillTags(weaponName);
    
    if (current < count) {
      return false;
    }
    
    state.playerState.killTagsByWeapon[weaponName] -= count;
    return true;
  }

  // Weapon upgrades (per-weapon list of applied upgrades)
  static getWeaponUpgrades(weaponName) {
    const state = getGameState();
    if (!state.playerState.weaponUpgrades) state.playerState.weaponUpgrades = {};
    return state.playerState.weaponUpgrades[weaponName] || [];
  }

  static addWeaponUpgrade(weaponName, upgradeObj) {
    const state = getGameState();
    if (!state.playerState.weaponUpgrades) state.playerState.weaponUpgrades = {};
    if (!state.playerState.weaponUpgrades[weaponName]) state.playerState.weaponUpgrades[weaponName] = [];
    state.playerState.weaponUpgrades[weaponName].push(upgradeObj);
    return true;
  }
  
  // ============================================================
  // TALISMANS
  // ============================================================
  static equipTalisman(name) {
    const state = getGameState();
    if (!state.playerState.talismans) state.playerState.talismans = [];
    
    if (state.playerState.talismans.length >= 2) {
      return false; // Full
    }
    
    if (state.playerState.talismans.includes(name)) {
      return false; // Already equipped
    }
    
    state.playerState.talismans.push(name);
    return true;
  }
  
  static discardTalisman(name) {
    const state = getGameState();
    if (!state.playerState.talismans) return false;
    
    const index = state.playerState.talismans.indexOf(name);
    if (index === -1) return false;
    
    state.playerState.talismans.splice(index, 1);
    return true;
  }
  
  static swapTalisman(oldName, newName) {
    const state = getGameState();
    if (!state.playerState.talismans) return false;
    
    const index = state.playerState.talismans.indexOf(oldName);
    if (index === -1) return false;
    
    if (state.playerState.talismans.includes(newName)) {
      return false; // Already equipped
    }
    
    state.playerState.talismans[index] = newName;
    return true;
  }

  // ============================================================
  // BORROWED SKILLS (Shrine Event)
  // ============================================================
  static addBorrowedSkill(skillData) {
    const state = getGameState();
    if (!state.playerState.borrowedSkills) state.playerState.borrowedSkills = [];
    
    // skillData is { class: className, skill: skillName, cost: manaCost }
    state.playerState.borrowedSkills.push(skillData);
    return true;
  }
  
  // ============================================================
  // SACRED TREE BONUS
  // ============================================================
  static applySacredTreeBonus() {
    const state = getGameState();
    state.playerState.sacredTreeHpBonus = (state.playerState.sacredTreeHpBonus || 0) + 20;
    state.playerState.sacredTreeManaBonus = (state.playerState.sacredTreeManaBonus || 0) + 30;
    
    state.playerState.maxHp += 20;
    state.playerState.hp += 20;
    state.playerState.maxMana += 30;
    state.playerState.mana += 30;
    
    return true;
  }
  
  // ============================================================
  // CONSUMABLES
  // ============================================================
  static addConsumable(consumableName, count = 1) {
    const state = getGameState();
    const config = state.config.consumables[consumableName];
    
    if (!config) {
      return false;
    }
    
    if (!state.playerState.consumables[consumableName]) {
      state.playerState.consumables[consumableName] = 0;
    }
    
    state.playerState.consumables[consumableName] += count;
    
    // Cap at max
    if (state.playerState.consumables[consumableName] > state.config.consumableSlots.maxPerType) {
      state.playerState.consumables[consumableName] = state.config.consumableSlots.maxPerType;
    }
    
    return true;
  }
  
  static useConsumable(consumableName) {
    const state = getGameState();
    
    // Support both config consumable names and shop IDs (e.g. 's_heal_potion')
    const hasCount = (key) => (state.playerState.consumables && state.playerState.consumables[key] && state.playerState.consumables[key] > 0);

    let key = null;
    if (hasCount(consumableName)) key = consumableName;
    else if (hasCount('Health Potion') && /health|heal/i.test(consumableName)) key = 'Health Potion';
    else if (hasCount('Mana Potion') && /mana/i.test(consumableName)) key = 'Mana Potion';
    else if (hasCount('s_heal_potion') && /heal|potion/i.test(consumableName)) key = 's_heal_potion';
    else if (hasCount('s_ap_potion') && /ap|tonic/i.test(consumableName)) key = 's_ap_potion';
    else {
      // try fuzzy match against existing keys
      const keys = Object.keys(state.playerState.consumables || {});
      for (const k of keys) {
        if (k.toLowerCase() === consumableName.toLowerCase() || k.toLowerCase().includes(consumableName.toLowerCase())) { key = k; break; }
      }
    }

    if (!key) return false;
    console.debug('[PlayerManager] useConsumable resolved key=', key, 'before apply; counts=', state.playerState.consumables[key]);

    // Consume one
    state.playerState.consumables[key] -= 1;
    if (state.playerState.consumables[key] < 0) state.playerState.consumables[key] = 0;

    // Apply effects for known consumables
    try {
      if (key === 'Health Potion' || key === 's_heal_potion' || key === 's_health_potion') {
        // Heal 30 HP
        state.addHp(30);
      } else if (key === 'Mana Potion' || key === 's_mana_potion') {
        // Restore 50 mana
        state.addMana(50);
      } else if (key === 's_ap_potion' || /ap|tonic/i.test(key)) {
        // Grant 30 AP
        state.addAp(30);
      } else {
        // If consumable is defined in config with structured effect, attempt basic parsing
        const conf = state.config && state.config.consumables && state.config.consumables[consumableName];
        if (conf && conf.effect) {
          // Basic handling: check for 'Heal X' or '+X AP'
          const eff = String(conf.effect);
          const mHeal = eff.match(/heal\s*(\d+)/i);
          if (mHeal) state.addHp(parseInt(mHeal[1], 10));
          const mAp = eff.match(/\+?\s*(\d+)\s*AP/i);
          if (mAp) state.addAp(parseInt(mAp[1], 10));
        }
      }
    } catch (e) { console.warn('Failed to apply consumable effect', key, e); }
    
    if (typeof RetroHealAnimation !== 'undefined') {
      RetroHealAnimation.play();
    }

    // Persist
    if (state.save) state.save();

    return true;
  }
  
  static getConsumableCount(consumableName) {
    const state = getGameState();
    return state.playerState.consumables[consumableName] || 0;
  }
  
  static getActiveConsumables() {
    const state = getGameState();
    const active = {};
    
    for (const [name, count] of Object.entries(state.playerState.consumables)) {
      if (count > 0) {
        active[name] = count;
      }
    }
    
    return active;
  }
  
  static regenMana() {
    const state = getGameState();
    const classData = this.getCurrentClassData();
    
    if (!classData) return;
    
    state.addMana(classData.manaRegen);
  }
  
  static regenHp() {
    const state = getGameState();
    const classData = this.getCurrentClassData();
    
    if (!classData) return;
    
    state.addHp(classData.hpRegen);
    
    // Apply Aegis shield effect if has buff
    if (state.hasBuff('Aegis')) {
      state.addHp(10);
    }
    
    // Apply Regeneration buff
    if (state.hasBuff('Regeneration')) {
      state.addHp(5);
    }
  }
  
  static applyDailyRegeneration() {
    this.regenHp();
    this.regenMana();
  }
  
  // Leveling UI helper
  static getLevelingProgress() {
    const state = getGameState();
    const stage = state.stageState.stage;
    const level = state.playerState.level;
    
    // Every 2nd and 4th level (2, 4, 6, 8, ...), buff selection available
    return {
      isBossLevel: level % 5 === 0,
      hasBuffSelection: level % 2 === 0 && level % 5 !== 0,
      stage,
      level
    };
  }
  
  static checkDeathDefiance() {
    const state = getGameState();
    
    // Can only happen at check-in when HP <= 0
    const deathDefiance = state.systemState.deathDefiance || (state.systemState.deathDefiance = { available: true, active: false, triggeredAt: null });
    if (state.playerState.hp > 0 || !deathDefiance.available) {
      return null; // No death defiance active
    }

    deathDefiance.available = false;
    deathDefiance.active = true;
    deathDefiance.triggeredAt = Date.now();
    state.systemState.isDeathDefiance = true;
    state.playerState.hp = 1; // Survive with 1 HP
    
    state.eventBus.emit(EVENTS.DEATH_DEFIANCE, {
      survived: true,
      hp: state.playerState.hp,
      available: deathDefiance.available,
      active: deathDefiance.active,
      triggeredAt: deathDefiance.triggeredAt
    });
    
    return true;
  }
  
  static failDeathDefiance() {
    const state = getGameState();
    const deathDefiance = state.systemState.deathDefiance || (state.systemState.deathDefiance = { available: false, active: false, triggeredAt: null });
    deathDefiance.active = false;
    state.systemState.isDeathDefiance = false;
    state.playerState.hp = 0;
    
    state.eventBus.emit(EVENTS.DEATH, {
      type: 'deathDefiance',
      stage: state.stageState.stage,
      level: state.playerState.level
    });
    
    return false;
  }
}
