/**
 * NEMESIS ROGUELIKE — CORE GAME STATE & ENGINE
 * GameState management, persistence, event bus
 */

// EventBus: decoupled communication between modules
class EventBus extends EventTarget {
  constructor() {
    super();
    this.handlers = new Map();
  }
  
  emit(eventName, detail = {}) {
    this.dispatchEvent(new CustomEvent(eventName, { detail }));
  }
  
  on(eventName, handler) {
    this.addEventListener(eventName, (e) => handler(e.detail));
  }
  
  once(eventName, handler) {
    this.addEventListener(eventName, (e) => handler(e.detail), { once: true });
  }
  
  off(eventName, handler) {
    this.removeEventListener(eventName, handler);
  }
}

const EVENTS = {
  // Game lifecycle
  GAME_START: 'game:start',
  GAME_SAVE: 'game:save',
  GAME_LOAD: 'game:load',
  PAUSE: 'game:pause',
  RESUME: 'game:resume',
  
  // Check-in & daily cycle
  CHECK_IN: 'checkin:start',
  CHECK_IN_COMPLETE: 'checkin:complete',
  CHECK_IN_ANIMATION_COMPLETE: 'checkin:animComplete',
  DAILY_RESET: 'daily:reset',
  SKIPPED_DAY_DEATH: 'death:skippedDay',
  
  // Resources
  HP_CHANGED: 'resource:hpChanged',
  MANA_CHANGED: 'resource:manaChanged',
  AP_CHANGED: 'resource:apChanged',
  GOLD_CHANGED: 'resource:goldChanged',
  DIAMONDS_CHANGED: 'resource:diamondsChanged',
  LOOTBOX_KEYS_CHANGED: 'resource:lootboxKeysChanged',
  
  // Tasks
  TASK_COMPLETED: 'task:completed',
  TASK_MISSED: 'task:missed',
  TODO_COMPLETED: 'todo:completed',
  DAILY_STREAK_CHANGED: 'streak:changed',
  
  // Combat
  ATTACK: 'combat:attack',
  DAMAGE_TAKEN: 'combat:damageToken',
  CRIT_HIT: 'combat:crit',
  KILL_ENEMY: 'combat:kill',
  COMBO_CHANGED: 'combat:comboChanged',
  ENEMY_DEFEATED: 'combat:enemyDefeated',
  ENEMY_HEALED: 'combat:enemyHealed',
  ENEMY_MUTATED: 'combat:enemyMutated',
  ENEMY_REVIVED: 'combat:enemyRevived',
  
  // Level & Stage
  LEVEL_UP: 'level:up',
  STAGE_COMPLETE: 'stage:complete',
  LEVEL_COMPLETE: 'level:complete',
  
  // Buffs & Attributes
  BUFF_GAINED: 'buff:gained',
  ATTRIBUTE_CHANGED: 'attr:changed',
  
  // Death & Victory
  DEATH: 'game:death',
  DEATH_DEFIANCE: 'game:deathDefiance',
  VICTORY: 'game:victory',
  
  // UI
  UI_POPUP_OPEN: 'ui:popupOpen',
  UI_POPUP_CLOSE: 'ui:popupClose'
};

function getLocalDayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const USER_DATA_STORAGE_KEYS = [
  'nemesis_data', 
  'nemesis_planner_data', 
  'nemesis_shop_data',
  'nemesis_hud_pos',
  'nemesis_satchel_pos',
  'nemesis_weapon_pos',
  'nemesis_center_pos',
  'nemesis_run_graph_pos'
];
const USER_DATA_EXPORT_VERSION = 1;

function normalizeDailyNoteEntry(entry, fallbackText = '') {
  if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
    return {
      id: String(entry.id || `note_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`),
      text: String(entry.text ?? entry.value ?? fallbackText ?? ''),
      x: Number.isFinite(Number(entry.x)) ? Number(entry.x) : 12,
      y: Number.isFinite(Number(entry.y)) ? Number(entry.y) : 12
    };
  }

  const text = String(entry ?? fallbackText ?? '');
  if (!text) return null;

  return {
    id: `note_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    text,
    x: 12,
    y: 12
  };
}

// GameState: singular source of truth
class GameState {
  constructor(config = DEFAULT_GAME_CONFIG) {
    this.config = deepMerge(DEFAULT_GAME_CONFIG, config);
    this.eventBus = new EventBus();
    
    // Initialize fresh state
    this.reset();
    this.systemState.isCheckInRunning = false; // Added to prevent overlapping check-ins
  }
  
  reset() {
    this.playerState = {
      className: null,
      level: 1,
      hp: 0,
      maxHp: 0,
      mana: 0,
      maxMana: 0,
      ap: 0, // current AP pool
      maxAp: 0, // MAX_AP (sum of daily rewards if completed)
      gold: 0,
      diamonds: 0,
      lootboxKeys: 0,
      attributes: {
        STR: { points: 0, level: 1 },
        INT: { points: 0, level: 1 },
        DISC: { points: 0, level: 1 },
        CREA: { points: 0, level: 1 },
        SOC: { points: 0, level: 1 },
        CAP: { points: 0, level: 1 },
        RESP: { points: 0, level: 1 }
      },
      weapons: [null, null], // main, offhand (or 3 for Ranger)
      weaponElements: [null, null],
      activeWeapon: 0,
      consumables: {}, // { consumableName: count }
      kills: 0,
      killTagsByWeapon: {}, // { weaponName: count }
      weaponRunes: {}, // { weaponName: { tier1, tier2, tier3 } }
      talismans: [],
      borrowedSkills: [],
      sacredTreeHpBonus: 0,
      sacredTreeManaBonus: 0,
      dodgeCostMultiplier: 1.0,
      corrosiveStacks: 0,
      petPoints: 0,
      petImage: null,
      petEmoji: '🐾',
      petLevel: 1,
      petUpgradeLevel: 0,
      petHunger: 100,
      unlockedPetAnimations: ['Default'],
      equippedPetAnimation: 'Default',
      unlockedDeathEffects: ['Default'],
      equippedDeathEffect: 'Default'
    };
    
    this.dailiesState = {
      dailies: [], // array of { id, name, difficulty, attribute, completed, bloodOath }
      todos: [], // array of { id, name, difficulty, attribute, deadline, completed, bloodOath, subtasks }
      streakCompletion: 0, // consecutive perfect days
      streakNonCompletion: 0, // consecutive days with any missed daily
      history: [] // array of daily completion records
    };
    
    this.stageState = {
      stage: 1,
      stageVariation: 'A', // A or B
      level: 1,
      enemies: [],
      bossData: null,
      nextBossAtLevel: 5,
      stageClearedToday: false
    };
    
    this.combatState = {
      currentCombo: 0,
      lastAttackTime: 0,
      selectedWeapon: 0,
      isDodging: false,
      isSkillActive: false
    };
    
    this.buffs = []; // array of buff names
    this.nemesisState = {
      attributes: {
        STR: { points: 0, level: 1 },
        INT: { points: 0, level: 1 },
        DISC: { points: 0, level: 1 },
        CREA: { points: 0, level: 1 },
        SOC: { points: 0, level: 1 },
        CAP: { points: 0, level: 1 },
        RESP: { points: 0, level: 1 }
      }
    };
    
    this.systemState = {
      isPaused: false,
      isDeathDefiance: false,
      dialoguePopupsEnabled: true,
      dialogueSeen: {},
      runSeenEnemies: {},
      diamondRewards: [],
      vineSpellState: {
        dayKey: getLocalDayKey(),
        storedDamageByEnemyId: {},
        triggeredTodayByEnemyId: {}
      },
      specialEvent: null, // { type, claimed, targets }
      deathDefiance: {
        available: true,
        active: false,
        triggeredAt: null
      },
      taskListFilters: {
        showCompletedDailies: false,
        showCompletedTodos: false
      },
      lastCheckInTime: null, // timestamp of last check-in
      gameStartTime: null,
      runCompletionHistory: [],
      dailyNotesByDate: {},
      dailyNotes: [],
      todoNotes: [],
      runStats: {
        startClass: null,
        enemiesDefeated: 0,
        bossesSailed: 0,
        totalGoldEarned: 0,
        buffsCollected: 0,
        tasksCompleted: 0,
        daysSurvived: 0
      }
    };
  }

  resetRunState() {
    this.playerState.className = null;
    this.playerState.level = 1;
    this.playerState.hp = 0;
    this.playerState.maxHp = 0;
    this.playerState.mana = 0;
    this.playerState.maxMana = 0;
    this.playerState.ap = 0;
    this.playerState.maxAp = 0;
    this.playerState.gold = 0;
    this.playerState.diamonds = 0;
    this.playerState.lootboxKeys = 0;
    this.playerState.attributes = {
      STR: { points: 0, level: 1 },
      INT: { points: 0, level: 1 },
      DISC: { points: 0, level: 1 },
      CREA: { points: 0, level: 1 },
      SOC: { points: 0, level: 1 },
      CAP: { points: 0, level: 1 },
      RESP: { points: 0, level: 1 }
    };
    this.playerState.weapons = [null, null];
    this.playerState.weaponElements = [null, null];
    this.playerState.activeWeapon = 0;
    this.playerState.consumables = {};
    this.playerState.kills = 0;
    this.playerState.killTagsByWeapon = {};
    this.playerState.weaponRunes = {};
    this.playerState.weaponUpgrades = {};
    this.playerState.talismans = [];
    this.playerState.borrowedSkills = [];
    this.playerState.sacredTreeHpBonus = 0;
    this.playerState.sacredTreeManaBonus = 0;
    this.playerState.weaponUpgrades = {};

    // Reset pet progress and cosmetics (keeping custom petImage and petEmoji)
    this.playerState.petPoints = 0;
    this.playerState.petLevel = 1;
    this.playerState.petUpgradeLevel = 0;
    this.playerState.petHunger = 100;
    this.playerState.unlockedPetAnimations = ['Default'];
    this.playerState.equippedPetAnimation = 'Default';
    this.playerState.unlockedDeathEffects = ['Default'];
    this.playerState.equippedDeathEffect = 'Default';

    // Reset Nemesis attributes
    this.nemesisState.attributes = {
      STR: { points: 0, level: 1 },
      INT: { points: 0, level: 1 },
      DISC: { points: 0, level: 1 },
      CREA: { points: 0, level: 1 },
      SOC: { points: 0, level: 1 },
      CAP: { points: 0, level: 1 },
      RESP: { points: 0, level: 1 }
    };

    this.stageState.stage = 1;
    this.stageState.stageVariation = 'A';
    this.stageState.level = 1;
    this.stageState.enemies = [];
    this.stageState.bossData = null;
    this.stageState.nextBossAtLevel = 5;
    this.stageState.stageClearedToday = false;

    this.combatState = {
      currentCombo: 0,
      lastAttackTime: 0,
      selectedWeapon: 0,
      isDodging: false,
      isSkillActive: false
    };

    this.buffs = [];
    this.systemState.isDeathDefiance = false;
    this.systemState.deathDefiance = {
      available: true,
      active: false,
      triggeredAt: null
    };
    this.systemState.isCheckInRunning = false;
    this.systemState.dialogueSeen = {};
    this.systemState.runSeenEnemies = {};
    this.systemState.diamondRewards = [];
    this.systemState.isPaused = false;
    this.systemState.completeDayClaimDate = null;
    this.systemState.completeDayApBonus = 0;
    this.systemState.gameStartTime = null;
    this.systemState.lastCheckInTime = null;
    this.systemState.runCompletionHistory = [];
    this.systemState.dailyNotesByDate = {};
    this.systemState.dailyNotes = [];
    this.systemState.todoNotes = [];
    this.systemState.runStats = {
      startClass: null,
      enemiesDefeated: 0,
      bossesSailed: 0,
      totalGoldEarned: 0,
      buffsCollected: 0,
      tasksCompleted: 0,
      daysSurvived: 0
    };
  }
  
  // Health
  setHp(newVal) {
    const old = this.playerState.hp;
    this.playerState.hp = Math.max(0, Math.min(newVal, this.playerState.maxHp));
    if (old !== this.playerState.hp) {
      this.eventBus.emit(EVENTS.HP_CHANGED, {
        oldHp: old,
        newHp: this.playerState.hp,
        maxHp: this.playerState.maxHp
      });
    }
  }
  
  addHp(amount) {
    if (amount > 0 && this.playerState.corrosiveStacks) {
      const reduction = Math.min(1.0, this.playerState.corrosiveStacks * 0.10);
      amount = Math.round(amount * (1.0 - reduction));
    }
    this.setHp(this.playerState.hp + amount);
  }
  
  takeDamage(amount) {
    this.setHp(this.playerState.hp - amount);
    if (amount > 0 && this.hasBuff('Fury')) {
      const furyPct = this.config.buffs?.['Fury']?.effect?.furyApBonus ?? 0.08;
      const bonusAp = Math.round(this.playerState.maxAp * furyPct);
      if (bonusAp > 0) {
        this.addAp(bonusAp);
        try {
          if (typeof FloatingDamageNumber !== 'undefined' && typeof FloatingDamageNumber.show === 'function') {
            FloatingDamageNumber.show(window.innerWidth / 2, window.innerHeight / 2 + 40, `+${bonusAp} AP (Fury) ⚡`, {
              color: '#ffd700',
              scale: 1.2,
              duration: 1500
            });
          }
        } catch (e) {}
      }
    }
  }
  
  // Mana
  setMana(newVal) {
    const old = this.playerState.mana;
    this.playerState.mana = Math.max(0, Math.min(newVal, this.playerState.maxMana));
    if (old !== this.playerState.mana) {
      this.eventBus.emit(EVENTS.MANA_CHANGED, {
        oldMana: old,
        newMana: this.playerState.mana,
        maxMana: this.playerState.maxMana
      });
    }
  }
  
  addMana(amount) {
    this.setMana(this.playerState.mana + amount);
  }
  
  drainMana(amount) {
    const old = this.playerState.mana;
    this.setMana(this.playerState.mana - amount);
    const drained = old - this.playerState.mana;
    
    if (drained > 0 && this.playerState.talismans?.includes('Mana Siphon')) {
      this.combatState.manaSiphonSpent = (this.combatState.manaSiphonSpent || 0) + drained;
      while (this.combatState.manaSiphonSpent >= 50 && (this.combatState.manaSiphonBonus || 0) < 100) {
        this.combatState.manaSiphonSpent -= 50;
        this.combatState.manaSiphonBonus = (this.combatState.manaSiphonBonus || 0) + 5;
        this.playerState.maxMana += 5;
        this.playerState.mana += 5;
      }
    }
  }
  
  // Attack Power
  setAp(newVal) {
    const old = this.playerState.ap;
    this.playerState.ap = Math.max(0, newVal);
    if (old !== this.playerState.ap) {
      this.eventBus.emit(EVENTS.AP_CHANGED, {
        oldAp: old,
        newAp: this.playerState.ap,
        maxAp: this.playerState.maxAp
      });
    }
  }
  
  addAp(amount) {
    this.setAp(this.playerState.ap + amount);
  }
  
  spendAp(amount) {
    this.setAp(this.playerState.ap - amount);
  }
  
  // Gold
  setGold(newVal) {
    const old = this.playerState.gold;
    this.playerState.gold = Math.max(0, newVal);
    if (old !== this.playerState.gold) {
      this.eventBus.emit(EVENTS.GOLD_CHANGED, {
        oldGold: old,
        newGold: this.playerState.gold
      });
    }
  }
  
  addGold(amount) {
    this.setGold(this.playerState.gold + amount);
  }
  
  // Diamonds
  setDiamonds(newVal) {
    const old = this.playerState.diamonds;
    this.playerState.diamonds = Math.max(0, Math.round(Number(newVal) || 0));
    if (old !== this.playerState.diamonds) {
      this.eventBus.emit(EVENTS.DIAMONDS_CHANGED, {
        oldDiamonds: old,
        newDiamonds: this.playerState.diamonds
      });
    }
  }
  
  addDiamonds(amount) {
    this.setDiamonds(this.playerState.diamonds + amount);
  }

  spendDiamonds(amount) {
    this.setDiamonds(this.playerState.diamonds - amount);
  }

  unlockDeathEffect(effectId) {
    if (!this.playerState.unlockedDeathEffects) {
      this.playerState.unlockedDeathEffects = ['Default'];
    }
    if (!this.playerState.unlockedDeathEffects.includes(effectId)) {
      this.playerState.unlockedDeathEffects.push(effectId);
    }
  }

  equipDeathEffect(effectId) {
    this.playerState.equippedDeathEffect = effectId;
  }

  setLootboxKeys(newVal) {
    const old = this.playerState.lootboxKeys || 0;
    this.playerState.lootboxKeys = Math.max(0, Math.round(Number(newVal) || 0));
    if (old !== this.playerState.lootboxKeys) {
      this.eventBus.emit(EVENTS.LOOTBOX_KEYS_CHANGED, {
        oldKeys: old,
        newKeys: this.playerState.lootboxKeys
      });
    }
  }

  addLootboxKeys(amount) {
    this.setLootboxKeys((this.playerState.lootboxKeys || 0) + amount);
  }

  spendLootboxKeys(amount) {
    this.setLootboxKeys((this.playerState.lootboxKeys || 0) - amount);
  }
  
  // Attributes
  addAttributePoints(attrName, amount) {
    const attr = this.playerState.attributes[attrName];
    if (!attr) return;
    
    attr.points += amount;
    
    // Check if level up
    const thresholds = typeof this.config.attributeLevelThresholds === 'function'
      ? this.config.attributeLevelThresholds()
      : (Array.isArray(this.config.attributeLevelThresholds) ? this.config.attributeLevelThresholds : []);
    while (attr.level < thresholds.length && attr.points >= thresholds[attr.level]) {
      attr.level++;
    }
    
    this.eventBus.emit(EVENTS.ATTRIBUTE_CHANGED, {
      attribute: attrName,
      points: attr.points,
      level: attr.level
    });
  }

  addNemesisAttributePoints(attrName, amount) {
    const attr = this.nemesisState?.attributes?.[attrName];
    if (!attr) return;

    attr.points += amount;

    const thresholds = typeof this.config.attributeLevelThresholds === 'function'
      ? this.config.attributeLevelThresholds()
      : (Array.isArray(this.config.attributeLevelThresholds) ? this.config.attributeLevelThresholds : []);

    while (attr.level < thresholds.length && attr.points >= thresholds[attr.level]) {
      attr.level++;
    }
  }
  
  // Buffs
  addBuff(buffName) {
    if (!this.buffs.includes(buffName)) {
      this.buffs.push(buffName);
      this.eventBus.emit(EVENTS.BUFF_GAINED, { buff: buffName });
    }
  }
  
  hasBuff(buffName) {
    return this.buffs.includes(buffName);
  }
  
  // Combo system
  incrementCombo(maxStacks = this.config.comboMaxStacks) {
    this.combatState.currentCombo = Math.min(
      this.combatState.currentCombo + 1,
      maxStacks
    );
    this.eventBus.emit(EVENTS.COMBO_CHANGED, { combo: this.combatState.currentCombo });
  }
  
  resetCombo() {
    if (this.combatState.currentCombo > 0) {
      this.combatState.currentCombo = 0;
      this.eventBus.emit(EVENTS.COMBO_CHANGED, { combo: 0 });
    }
  }
  
  // Persistence
  save() {
    const data = {
      playerState: this.playerState,
      dailiesState: this.dailiesState,
      stageState: this.stageState,
      combatState: this.combatState,
      buffs: this.buffs,
      nemesisState: this.nemesisState,
      systemState: this.systemState,
      timestamp: Date.now()
    };
    localStorage.setItem('nemesis_data', JSON.stringify(data));
    this.eventBus.emit(EVENTS.GAME_SAVE, { data });
  }

  getDailyNotes() {
    if (!Array.isArray(this.systemState.dailyNotes)) {
      this.systemState.dailyNotes = [];
    }
    return this.systemState.dailyNotes;
  }

  getDailyNote() {
    return this.getDailyNotes().map((note) => note.text).filter(Boolean).join('\n');
  }

  addDailyNote(text = '', position = {}) {
    const notes = this.getDailyNotes();
    const note = normalizeDailyNoteEntry({
      text,
      x: Number(position.x),
      y: Number(position.y)
    });
    if (!note) return null;
    notes.push(note);
    this.save();
    return note;
  }

  updateDailyNote(noteId, updates = {}) {
    const notes = this.getDailyNotes();
    const note = notes.find((entry) => String(entry.id) === String(noteId));
    if (!note) return false;
    if (updates.text !== undefined) note.text = String(updates.text || '');
    if (updates.x !== undefined) note.x = Number(updates.x);
    if (updates.y !== undefined) note.y = Number(updates.y);
    this.save();
    return true;
  }

  moveDailyNote(noteId, position = {}) {
    return this.updateDailyNote(noteId, position);
  }

  removeDailyNote(noteId) {
    const notes = this.getDailyNotes();
    const index = notes.findIndex((entry) => String(entry.id) === String(noteId));
    if (index < 0) return false;
    notes.splice(index, 1);
    this.save();
    return true;
  }

  setDailyNote(text) {
    const notes = this.getDailyNotes();
    if (notes.length === 0) {
      const note = normalizeDailyNoteEntry(null, text);
      if (note) notes.push(note);
    } else {
      notes[0].text = String(text || '');
    }
    this.save();
    return true;
  }

  getTodoNotes() {
    if (!Array.isArray(this.systemState.todoNotes)) {
      this.systemState.todoNotes = [];
    }
    return this.systemState.todoNotes;
  }

  addTodoNote(text = '', position = {}) {
    const notes = this.getTodoNotes();
    const note = normalizeDailyNoteEntry({
      text,
      x: Number(position.x),
      y: Number(position.y)
    });
    if (!note) return null;
    notes.push(note);
    this.save();
    return note;
  }

  updateTodoNote(noteId, updates = {}) {
    const notes = this.getTodoNotes();
    const note = notes.find((entry) => String(entry.id) === String(noteId));
    if (!note) return false;
    if (updates.text !== undefined) note.text = String(updates.text || '');
    if (updates.x !== undefined) note.x = Number(updates.x);
    if (updates.y !== undefined) note.y = Number(updates.y);
    this.save();
    return true;
  }

  moveTodoNote(noteId, position = {}) {
    return this.updateTodoNote(noteId, position);
  }

  removeTodoNote(noteId) {
    const notes = this.getTodoNotes();
    const index = notes.findIndex((entry) => String(entry.id) === String(noteId));
    if (index < 0) return false;
    notes.splice(index, 1);
    this.save();
    return true;
  }

  buildUserDataSnapshot() {
    const snapshot = { version: USER_DATA_EXPORT_VERSION, exportedAt: Date.now(), storage: {} };
    USER_DATA_STORAGE_KEYS.forEach((key) => {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      try {
        snapshot.storage[key] = JSON.parse(raw);
      } catch (error) {
        snapshot.storage[key] = raw;
      }
    });
    return snapshot;
  }

  exportUserData() {
    return JSON.stringify(this.buildUserDataSnapshot(), null, 2);
  }

  importUserData(rawText) {
    const text = String(rawText || '').trim();
    if (!text) {
      return { success: false, reason: 'empty' };
    }

    let payload;
    try {
      payload = JSON.parse(text);
    } catch (error) {
      return { success: false, reason: 'invalid_json' };
    }

    const storage = payload && typeof payload === 'object' ? payload.storage : null;
    if (!storage || typeof storage !== 'object') {
      return { success: false, reason: 'invalid_format' };
    }

    USER_DATA_STORAGE_KEYS.forEach((key) => {
      localStorage.removeItem(key);
    });

    Object.entries(storage).forEach(([key, value]) => {
      if (!USER_DATA_STORAGE_KEYS.includes(key)) return;
      if (value === undefined || value === null) return;
      localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
      try {
        window.dispatchEvent(new StorageEvent('storage', { key, newValue: localStorage.getItem(key) }));
      } catch (error) {
        // ignore storage event issues in unsupported contexts
      }
    });

    this.load();
    try { if (window.ShopManager && typeof ShopManager.init === 'function') ShopManager.init(); } catch (error) {}
    try { if (window.UIManager && typeof UIManager.refreshGameUI === 'function') UIManager.refreshGameUI(); } catch (error) {}

    return { success: true, keys: Object.keys(storage).filter((key) => USER_DATA_STORAGE_KEYS.includes(key)) };
  }
  
  load() {
    const saved = localStorage.getItem('nemesis_data');
    if (!saved) return false;
    
    try {
      const data = JSON.parse(saved);
      this.playerState = data.playerState;
      this.playerState.diamonds = Math.max(0, Math.round(Number(this.playerState.diamonds) || 0));
      if (this.playerState.petPoints === undefined) this.playerState.petPoints = 0;
      if (this.playerState.petImage === undefined) this.playerState.petImage = null;
      if (this.playerState.petEmoji === undefined) this.playerState.petEmoji = '🐾';
      if (this.playerState.petLevel === undefined) this.playerState.petLevel = 1;
      if (this.playerState.petUpgradeLevel === undefined) this.playerState.petUpgradeLevel = 0;
      if (this.playerState.petHunger === undefined) this.playerState.petHunger = 100;
      if (this.playerState.unlockedPetAnimations === undefined) this.playerState.unlockedPetAnimations = ['Default'];
      if (this.playerState.equippedPetAnimation === undefined) this.playerState.equippedPetAnimation = 'Default';
      if (this.playerState.unlockedDeathEffects === undefined) this.playerState.unlockedDeathEffects = ['Default'];
      if (this.playerState.equippedDeathEffect === undefined) this.playerState.equippedDeathEffect = 'Default';
      const weaponSlots = Array.isArray(this.playerState.weapons) ? this.playerState.weapons.length : 0;
      if (!Array.isArray(this.playerState.weaponElements)) {
        this.playerState.weaponElements = Array(weaponSlots).fill(null);
      } else if (this.playerState.weaponElements.length < weaponSlots) {
        while (this.playerState.weaponElements.length < weaponSlots) {
          this.playerState.weaponElements.push(null);
        }
      }
      if (!this.playerState.weaponRunes) {
        this.playerState.weaponRunes = {};
      }
      this.dailiesState = data.dailiesState;
      this.stageState = data.stageState;
      this.combatState = data.combatState;
      this.buffs = data.buffs;
      this.nemesisState = data.nemesisState;
      this.systemState = data.systemState;
      if (this.systemState) {
        this.systemState.isCheckInRunning = false;
        if (this.systemState.dialoguePopupsEnabled === undefined) {
          this.systemState.dialoguePopupsEnabled = true;
        }
      }
      if (!this.combatState || typeof this.combatState !== 'object') {
        this.combatState = {};
      }
      this.combatState.attackInProgress = false;
      this.combatState.attackSpinnerPressed = false;
      this.combatState.attackSpinnerActive = false;
      this.combatState.attackSpinnerTargetId = null;
      this.combatState.hoveredEnemyId = null;
      this.combatState.queuedAttackTargetId = null;
      this.combatState.queuedAttackCount = 0;
      if (!this.systemState.dailyNotesByDate || typeof this.systemState.dailyNotesByDate !== 'object') {
        this.systemState.dailyNotesByDate = {};
      }
      Object.entries(this.systemState.dailyNotesByDate).forEach(([dateKey, value]) => {
        if (Array.isArray(value)) {
          this.systemState.dailyNotesByDate[dateKey] = value.map((note) => normalizeDailyNoteEntry(note)).filter(Boolean);
        } else if (typeof value === 'string') {
          this.systemState.dailyNotesByDate[dateKey] = value.trim() ? [normalizeDailyNoteEntry(null, value)] : [];
        } else if (value && typeof value === 'object') {
          const legacyNotes = Array.isArray(value.notes) ? value.notes : [];
          this.systemState.dailyNotesByDate[dateKey] = legacyNotes.map((note) => normalizeDailyNoteEntry(note)).filter(Boolean);
        } else {
          this.systemState.dailyNotesByDate[dateKey] = [];
        }
      });
      if (!Array.isArray(this.systemState.dailyNotes)) {
        const todayKey = getLocalDayKey();
        const legacyNotesForToday = this.systemState.dailyNotesByDate?.[todayKey];
        if (Array.isArray(legacyNotesForToday)) {
          this.systemState.dailyNotes = legacyNotesForToday.map((n) => normalizeDailyNoteEntry(n)).filter(Boolean);
        } else {
          this.systemState.dailyNotes = [];
        }
      }
      if (!Array.isArray(this.systemState.todoNotes)) {
        this.systemState.todoNotes = [];
      }
      if (!this.systemState.dialogueSeen) {
        this.systemState.dialogueSeen = {};
      }
      if (!this.systemState.runSeenEnemies) {
        this.systemState.runSeenEnemies = {};
      }
      if (!this.systemState.deathDefiance) {
        this.systemState.deathDefiance = {
          available: !this.systemState.isDeathDefiance,
          active: !!this.systemState.isDeathDefiance,
          triggeredAt: null
        };
      }
      if (!this.systemState.taskListFilters) {
        this.systemState.taskListFilters = {
          showCompletedDailies: false,
          showCompletedTodos: false
        };
      }
      if (!Array.isArray(this.systemState.diamondRewards)) {
        this.systemState.diamondRewards = [];
      }
      if (!this.systemState.vineSpellState || typeof this.systemState.vineSpellState !== 'object') {
        this.systemState.vineSpellState = {
          dayKey: getLocalDayKey(),
          storedDamageByEnemyId: {},
          triggeredTodayByEnemyId: {}
        };
      }
      if (!this.systemState.vineSpellState.dayKey) {
        this.systemState.vineSpellState.dayKey = getLocalDayKey();
      }
      if (!this.systemState.vineSpellState.storedDamageByEnemyId) {
        this.systemState.vineSpellState.storedDamageByEnemyId = {};
      }
      if (!this.systemState.vineSpellState.triggeredTodayByEnemyId) {
        this.systemState.vineSpellState.triggeredTodayByEnemyId = {};
      }
      
      this.eventBus.emit(EVENTS.GAME_LOAD, { data });
      return true;
    } catch (e) {
      console.error('Failed to load game state:', e);
      return false;
    }
  }
  
  // Pause/Resume
  pause() {
    this.systemState.isPaused = true;
    this.eventBus.emit(EVENTS.PAUSE);
  }
  
  resume() {
    this.systemState.isPaused = false;
    this.eventBus.emit(EVENTS.RESUME);
  }

  // Special Events
  rollSpecialEvent() {
    const r = Math.random();
    if (r < (this.config.specialEvents?.chanceNone || 0.3)) {
      this.systemState.specialEvent = null;
      return;
    }

    const types = this.config.specialEvents?.types || ['Shrine', 'Statue', 'Sacred Tree'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    this.systemState.specialEvent = {
      type: type,
      claimed: false,
      targets: []
    };

    if (type === 'Sacred Tree' || type === 'Statue') {
      const activeDailies = this.dailiesState.dailies || [];
      if (activeDailies.length > 0) {
        // Calculate completion rate during this run only
        const history = this.dailiesState.history || [];
        const stats = {};
        activeDailies.forEach(d => {
          stats[d.id] = { completed: 0, total: 0 };
        });
        history.forEach(entry => {
          // Only count history since run start
          if (this.systemState.gameStartTime && new Date(entry.date) < new Date(this.systemState.gameStartTime)) return;
          
          (entry.completedDailies || []).forEach(d => {
            if (stats[d.id]) { stats[d.id].completed++; stats[d.id].total++; }
          });
          (entry.missedDailies || []).forEach(d => {
            if (stats[d.id]) { stats[d.id].total++; }
          });
        });
        
        const rates = Object.keys(stats).map(id => {
          const total = stats[id].total;
          // New/unattempted dailies (0/0) count as 100% (1)
          return { id, rate: total > 0 ? stats[id].completed / total : 1 };
        });
        
        rates.sort((a, b) => a.rate - b.rate);

        if (type === 'Sacred Tree') {
          this.systemState.specialEvent.targets = [rates[0].id];
          this.systemState.specialEvent.rewardType = Math.random() < 0.5 ? 'hp' : 'mana';
          this.systemState.specialEvent.rewardVal = Math.floor(Math.random() * 11) + 20; // 20 to 30
        } else {
          this.systemState.specialEvent.targets = rates.slice(0, 3).map(r => r.id);
        }
      }
    }
  }

  static getBossRolledAttacks(W, bossName) {
    const state = getGameState();
    if (!state.stageState.bossRolledAttacks || state.stageState.bossRolledAttacks.length !== W) {
      const rolled = [];
      for (let i = 0; i < W; i++) {
        rolled.push(rollBossAttack(bossName, state.config));
      }
      rolled.sort(() => Math.random() - 0.5);
      state.stageState.bossRolledAttacks = rolled;
    }
    return state.stageState.bossRolledAttacks;
  }

  static calculateExactPendingDamage() {
    const state = getGameState();
    if (!state.stageState || !state.stageState.enemies) return 0;
    const aliveEnemies = (state.stageState.enemies || []).filter(e => e && !e.isDead);
    const aliveNormalEnemies = aliveEnemies.filter(e => !e?.isBoss && !e?.isBomb);
    const bossEnemy = aliveEnemies.find(e => e?.isBoss);
    const totalNormal = state.stageState.enemies.filter(e => !e?.isBoss && !e?.isBomb).length || 1;
    const passive = PlayerManager.getClassPassive();

    if (state.stageState.stageClearedToday) {
      return 0;
    }

    const D = TaskManager.calculateMissedDailyDamage();
    const N = D * 5;

    let totalDamage = 0;

    if (bossEnemy && !bossEnemy.isDead) {
      const missedDailies = TaskManager.getMissedDailies();
      const bossData = state.stageState.bossData || {};
      const isPhase2 = (bossData.phase === 2) || (bossEnemy.hp / bossEnemy.maxHp <= 0.4);
      let W = 0;
      missedDailies.forEach(daily => {
        const baseWeight = { Easy: 1, Medium: 2, Hard: 3, Ultra: 4 }[daily.difficulty] || 1;
        W += baseWeight + (isPhase2 ? 1 : 0);
      });

      const rolledAttacks = GameState.getBossRolledAttacks(W, bossEnemy.name);

      const dodgeTarget = state.combatState?.dodgeTarget;
      const dodgeTargets = Array.isArray(dodgeTarget) ? [...dodgeTarget] : (dodgeTarget ? [dodgeTarget] : []);
      let dodgeCharges = dodgeTargets.filter(id => id === bossEnemy.id).length;

      let reductionFactor = 1.0;
      if (state.playerState.className === 'Knight') reductionFactor -= 0.10;
      if (state.hasBuff('Iron Skin')) reductionFactor -= 0.10;
      if (state.playerState.talismans?.includes("Titan's Mantle")) {
        const baseReduction = 1.0 - reductionFactor;
        reductionFactor = Math.max(0, 1.0 - baseReduction * 2);
      }
      if (state.playerState.className === 'Juggernaut') reductionFactor *= 0.85;
      if (state.playerState.className === 'Brute' && state.combatState?.skillEffects?.wrathUnleashed) reductionFactor *= 1.4;

      const skillFx = state.combatState?.skillEffects || {};
      let tempShieldCharges = skillFx.shieldCharges || 0;
      let tempFortressCharges = skillFx.fortressCharges || 0;

      rolledAttacks.forEach(attackType => {
        if (attackType === 'null') return;
        if (dodgeCharges > 0) {
          dodgeCharges--;
          return;
        }

        if (attackType === 'regular') {
          let damage = 10;
          damage = Math.max(1, Math.round(damage * reductionFactor));
          let shieldMultiplier = 1.0;
          if (tempShieldCharges > 0) {
            shieldMultiplier *= 0.4;
            tempShieldCharges--;
          }
          if (tempFortressCharges > 0) {
            shieldMultiplier = 0.0;
            tempFortressCharges--;
          }
          let shieldAbsorption = 1.0 - shieldMultiplier;
          shieldAbsorption *= (1.0 - (state.playerState.corrosiveStacks || 0) * 0.10);
          shieldMultiplier = Math.max(0.0, 1.0 - shieldAbsorption);
          damage = Math.max(1, Math.round(damage * shieldMultiplier));
          totalDamage += damage;
        } else if (attackType === 'crit') {
          totalDamage += 15;
        } else if (attackType === 'heavy') {
          let damage = 12;
          damage = Math.max(1, Math.round(damage * reductionFactor));
          let shieldMultiplier = 1.0;
          if (tempShieldCharges > 0) {
            shieldMultiplier *= 0.4;
            tempShieldCharges--;
          }
          if (tempFortressCharges > 0) {
            shieldMultiplier = 0.0;
            tempFortressCharges--;
          }
          let shieldAbsorption = 1.0 - shieldMultiplier;
          shieldAbsorption *= (1.0 - (state.playerState.corrosiveStacks || 0) * 0.10);
          shieldMultiplier = Math.max(0.0, 1.0 - shieldAbsorption);
          damage = Math.max(1, Math.round(damage * shieldMultiplier));
          totalDamage += damage;
        }
      });
    } else {
      const dodgeTarget = state.combatState?.dodgeTarget;
      const dodgeTargets = Array.isArray(dodgeTarget) ? [...dodgeTarget] : (dodgeTarget ? [dodgeTarget] : []);

      const skillFx = state.combatState?.skillEffects || {};
      let tempShieldCharges = skillFx.shieldCharges || 0;
      let tempFortressCharges = skillFx.fortressCharges || 0;

      aliveNormalEnemies.forEach(enemy => {
        if (enemy.statusEffects?.stunned) return;

        let damage = EnemyManager.calculateEnemyDamage(enemy, N, totalNormal);
        const incantMult = (typeof enemy.incantationDamageMult === 'number') ? enemy.incantationDamageMult : 1;
        damage *= incantMult;

        const currentConsecutive = enemy.consecutiveAttackDays || 0;
        const simulatedBruteMult = enemy.archetype === 'Brute' ? Math.pow(1 + state.stageState.stage / 10, Math.min(currentConsecutive, 5)) : 1.0;
        damage *= simulatedBruteMult;

        if (enemy.statusEffects?.freeze) {
          damage *= (enemy.statusEffects.freeze.damageMultiplier !== undefined ? enemy.statusEffects.freeze.damageMultiplier : 0.55);
        }

        if (dodgeTargets.includes(enemy.id)) {
          const idx = dodgeTargets.indexOf(enemy.id);
          if (idx > -1) dodgeTargets.splice(idx, 1);
          return;
        }

        if (passive && typeof passive.damageTaken === 'number') {
          damage *= passive.damageTaken;
        }

        if (tempShieldCharges > 0) {
          damage *= (typeof skillFx.shieldDamageMultiplier === 'number' ? skillFx.shieldDamageMultiplier : 0.4);
          tempShieldCharges--;
        }

        if (tempFortressCharges > 0) {
          damage = 0;
          tempFortressCharges--;
        }

        let totalReduction = 0;
        if (passive && typeof passive.damageReduction === 'number') {
          totalReduction += passive.damageReduction;
        }
        if (state.hasBuff('Iron Skin')) {
          const reduction = state.config.buffs?.['Iron Skin']?.effect?.damageReduction;
          if (typeof reduction === 'number') {
            totalReduction += reduction;
          }
        }
        if (totalReduction > 0) {
          if (state.playerState.talismans?.includes("Titan's Mantle")) {
            totalReduction *= 2;
          }
          damage = Math.max(0, damage - totalReduction);
        }

        const reactiveWeapon = enemy.statusEffects?.reactiveWeapon;
        if (reactiveWeapon && reactiveWeapon.pending) {
          damage = Math.max(0, damage * (Number(reactiveWeapon.damageMultiplier) || 1));
        }

        totalDamage += damage;
      });
    }

    return Math.ceil(totalDamage);
  }
}

// Global instance
let gameState = null;

function initializeGameState(config) {
  gameState = new GameState(config);
  return gameState;
}

function getGameState() {
  if (!gameState) {
    gameState = new GameState();
  }
  return gameState;
}

// ============================================================
// CHECK-IN / DAILY CYCLE
// ============================================================
function rollBossAttack(bossName, config) {
  const bossCfg = (config.bosses && config.bosses[bossName]) || {};
  const weights = bossCfg.attackWeights || { regular: 0.9 };
  
  if (Math.random() < 0.1) {
    return 'null';
  }
  
  const entries = Object.entries(weights).filter(([k]) => k !== 'null');
  let total = 0;
  entries.forEach(([_, w]) => total += w);
  
  if (total <= 0) return 'regular';
  
  const r = Math.random() * total;
  let running = 0;
  for (let i = 0; i < entries.length; i++) {
    const [type, w] = entries[i];
    running += w;
    if (r <= running) {
      return type;
    }
  }
  return 'regular';
}

function getRandomMinionNameForStage(stage, variation) {
  const pool = [];
  if (variation && typeof FORMATIONS !== 'undefined') {
    const variationFormations = FORMATIONS[stage]?.[variation];
    if (variationFormations) {
      Object.values(variationFormations).forEach(levelData => {
        if (levelData.enemies) {
          levelData.enemies.forEach(enemyDef => {
            if (enemyDef.name && !pool.includes(enemyDef.name)) {
              pool.push(enemyDef.name);
            }
          });
        }
      });
    }
  }
  
  if (pool.length === 0 && typeof ENEMY_DATABASE !== 'undefined') {
    Object.entries(ENEMY_DATABASE).forEach(([name, data]) => {
      if (data.stage === stage) {
        pool.push(name);
      }
    });
  }
  if (pool.length === 0) return 'Goblin';
  return pool[Math.floor(Math.random() * pool.length)];
}

function createBombEnemy(playerMaxAp) {
  const bombHp = Math.round(playerMaxAp * 0.30);
  return {
    id: 'bomb_' + Math.random().toString(36).substr(2, 9),
    name: 'Bomb',
    isBoss: false,
    isBomb: true,
    hp: bombHp,
    maxHp: bombHp,
    isDead: false,
    dmgMult: 0.0,
    consecutiveAttackDays: 0,
    statusEffects: {},
    takeDamage(amount) {
      this.hp -= amount;
      if (this.hp <= 0) {
        this.hp = 0;
        this.isDead = true;
      }
    },
    heal(amount) {
      this.hp = Math.min(this.maxHp, this.hp + amount);
    },
    getResistanceMultiplier() { return 1.0; },
    getWeaknessMultiplier() { return 1.0; }
  };
}

function performCheckIn() {
  const state = getGameState();
  const clearCheckInRunning = () => {
    state.systemState.isCheckInRunning = false;
  };

  if (state.systemState.isPaused) {
    console.warn('Cannot check in while paused');
    return;
  }
  
  if (state.systemState.isCheckInRunning) {
    console.warn('Check-in already running');
    return;
  }
  state.systemState.isCheckInRunning = true;

  // start-of-checkin Bomb check
  const aliveBomb = (state.stageState.enemies || []).find(e => e && e.isBomb && !e.isDead);
  if (aliveBomb) {
    state.playerState.hp = 0;
    state.eventBus.emit(EVENTS.DEATH, {
      type: 'bomb:explosion',
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
      deathReason: 'Killed by Bomb Explosion 💣'
    });
    clearCheckInRunning();
    state.save();
    return;
  }

  const nowMs = Date.now();
  const getLocalDateKey = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  state.eventBus.emit(EVENTS.CHECK_IN, { time: nowMs });

  const completedDailies = TaskManager.getCompletedDailies();
  const missedDailies = TaskManager.getMissedDailies();
  const allDailiesComplete = missedDailies.length === 0;

  // 1) Calculate missed-daily damage D and scale to N
  const D = TaskManager.calculateMissedDailyDamage();
  const N = D * 5; // per blueprint: D × 5 = N

  // Madman: miss any daily -> die at check-in, no death defiance
  if (state.playerState.className === 'Madman' && !allDailiesComplete) {
    state.setHp(0);
    state.eventBus.emit(EVENTS.DEATH, {
      type: 'madman:missedDaily',
      stage: state.stageState.stage,
      level: state.stageState.level
    });
    PopupsManager.showDeathScreen({
      class: state.playerState.className,
      stage: state.stageState.stage,
      level: state.stageState.level,
      enemiesDefeated: state.systemState.runStats.enemiesDefeated,
      bossesSailed: state.systemState.runStats.bossesSailed,
      goldEarned: state.systemState.runStats.totalGoldEarned
    });
    clearCheckInRunning();
    state.save();
    return;
  }

  // 2) Pet attacks & Poison status ticks (before enemy retaliation)
  // 2a) Resolve Poison DoT first
  try {
    const alive = StageManager.getAliveEnemies();
    alive.forEach(enemy => {
      if (enemy && !enemy.isDead && enemy.statusEffects) {
        if (enemy.statusEffects.poison) {
          const poison = enemy.statusEffects.poison;
          if (poison.daysRemaining > 0 && poison.damagePerDay > 0) {
            const dmg = poison.damagePerDay;
            enemy.takeDamage(dmg);
            state.eventBus.emit(EVENTS.DAMAGE_TAKEN, { amount: dmg, source: 'poison', targetId: enemy.id });
            poison.daysRemaining--;
            if (poison.daysRemaining <= 0) {
              delete enemy.statusEffects.poison;
            }
          }
        }
        if (enemy.statusEffects.burn) {
          const burn = enemy.statusEffects.burn;
          if (burn.daysRemaining > 0 && burn.damagePerDay > 0) {
            const dmg = burn.damagePerDay;
            enemy.takeDamage(dmg);
            state.eventBus.emit(EVENTS.DAMAGE_TAKEN, { amount: dmg, source: 'burn', targetId: enemy.id });
            burn.daysRemaining--;
            if (burn.daysRemaining <= 0) {
              delete enemy.statusEffects.burn;
            }
          }
        }
      }
    });
  } catch (e) {
    console.warn('Poison/Burn DoT application failed during check-in', e);
  }

  // 2b) Pet attacks random enemy (moved to the end of doDailyRegenAndSave)

  // 3) Resolve enemy attacks (each alive enemy deals split of N)
  let lateTodoDamage = 0;
  const retaliationSteps = [];
  try {
    const aliveEnemies = StageManager.getAliveEnemies();
    const aliveNormalEnemies = aliveEnemies.filter(e => !e?.isBoss && !e?.isBomb);
    const bossEnemy = aliveEnemies.find(e => e?.isBoss);
    const totalNormal = state.stageState.enemies.filter(e => !e?.isBoss && !e?.isBomb).length || 1;
    const passive = PlayerManager.getClassPassive();

    if (state.stageState.stageClearedToday) {
      aliveNormalEnemies.forEach(enemy => {
        retaliationSteps.push({
          enemyId: enemy.id,
          name: enemy.name,
          isBoss: false,
          damage: 0,
          hpBefore: state.playerState.hp,
          hpAfter: state.playerState.hp,
          isImmune: true
        });
      });
      if (bossEnemy && !bossEnemy.isDead) {
        retaliationSteps.push({
          enemyId: bossEnemy.id,
          name: bossEnemy.name,
          isBoss: true,
          damage: 0,
          hpBefore: state.playerState.hp,
          hpAfter: state.playerState.hp,
          isImmune: true
        });
      }
    } else if (bossEnemy && !bossEnemy.isDead) {
      // BOSS FIGHT TURN RESOLUTION
      const stage = state.stageState.stage;
      const bossData = state.stageState.bossData || {};
      const isPhase2 = (bossData.phase === 2) || (bossEnemy.hp / bossEnemy.maxHp <= 0.4);
      
      if (!isPhase2 && bossEnemy.hp / bossEnemy.maxHp <= 0.4) {
        bossData.phase = 2;
        state.stageState.bossData = bossData;
      }

      // Calculate total weight W from missed dailies
      let W = 0;
      missedDailies.forEach(daily => {
        const baseWeight = { Easy: 1, Medium: 2, Hard: 3, Ultra: 4 }[daily.difficulty] || 1;
        W += baseWeight + (isPhase2 ? 1 : 0);
      });

      // Retrieve rolled attacks from GameState
      const rolledAttacks = [...GameState.getBossRolledAttacks(W, bossEnemy.name)];

      // Determine dodge charges for the boss
      const dodgeTarget = state.combatState?.dodgeTarget;
      const dodgeTargets = Array.isArray(dodgeTarget) ? dodgeTarget : (dodgeTarget ? [dodgeTarget] : []);
      let dodgeCharges = dodgeTargets.filter(id => id === bossEnemy.id).length;

      // Apply defense reduction calculations (Knight, Juggernaut, Iron Skin, etc.)
      let reductionFactor = 1.0;
      if (state.playerState.className === 'Knight') {
        reductionFactor -= 0.10; // Knight passive is 10% reduction against bosses
      }
      if (state.hasBuff('Iron Skin')) {
        reductionFactor -= 0.10; // 10% reduction for Iron Skin against bosses
      }
      if (state.playerState.talismans?.includes('Titan\'s Mantle')) {
        // Double the base reduction
        const baseReduction = 1.0 - reductionFactor;
        reductionFactor = Math.max(0, 1.0 - baseReduction * 2);
      }
      if (state.playerState.className === 'Juggernaut') {
        reductionFactor *= 0.85; // Juggernaut 15% reduction
      }
      if (state.playerState.className === 'Brute' && state.combatState?.skillEffects?.wrathUnleashed) {
        reductionFactor *= 1.4; // Brute Berserk +40% damage taken
      }

      // Process each rolled attack
      const skillFx = state.combatState?.skillEffects || {};
      
      rolledAttacks.forEach((attackType) => {
        // Prevent summon overflow: convert bomb/minion to regular if already at 5+ active normal enemies
        if (attackType === 'bomb' || attackType === 'minion') {
          const activeNormalCount = state.stageState.enemies.filter(e => !e.isBoss && !e.isDead).length;
          if (activeNormalCount >= 5) {
            attackType = 'regular';
          }
        }

        if (attackType === 'null') {
          retaliationSteps.push({
            enemyId: bossEnemy.id,
            name: bossEnemy.name,
            isBoss: true,
            damage: 0,
            hpBefore: state.playerState.hp,
            hpAfter: state.playerState.hp,
            isNull: true
          });
          return;
        }

        // If player has dodge charges, dodge the first non-null attacks
        if (dodgeCharges > 0) {
          dodgeCharges--;
          // Remove one occurrence from dodgeTarget
          const idx = state.combatState.dodgeTarget.indexOf(bossEnemy.id);
          if (idx > -1) {
            state.combatState.dodgeTarget.splice(idx, 1);
          }
          retaliationSteps.push({
            enemyId: bossEnemy.id,
            name: bossEnemy.name,
            isBoss: true,
            damage: 0,
            hpBefore: state.playerState.hp,
            hpAfter: state.playerState.hp,
            isDodge: true,
            attackType
          });
          return;
        }

        // Apply attack effects
        if (attackType === 'regular') {
          // Regular attack: does 10 damage
          let damage = 10;
          damage = Math.max(1, Math.round(damage * reductionFactor));
          
          let shieldMultiplier = 1.0;
          if (skillFx.shieldCharges && skillFx.shieldCharges > 0) {
            shieldMultiplier *= 0.4;
            skillFx.shieldCharges--;
          }
          if (skillFx.fortressCharges && skillFx.fortressCharges > 0) {
            shieldMultiplier = 0.0;
            const reflect = Math.round(damage * 0.5);
            if (reflect > 0 && typeof bossEnemy.takeDamage === 'function') {
              bossEnemy.takeDamage(reflect);
            }
            skillFx.fortressCharges--;
          }
          
          let shieldAbsorption = 1.0 - shieldMultiplier;
          shieldAbsorption *= (1.0 - (state.playerState.corrosiveStacks || 0) * 0.10);
          shieldMultiplier = Math.max(0.0, 1.0 - shieldAbsorption);
          
          damage = Math.max(1, Math.round(damage * shieldMultiplier));

          retaliationSteps.push({
            enemyId: bossEnemy.id,
            name: `${bossEnemy.name} (Regular Strike)`,
            isBoss: true,
            damage,
            hpBefore: state.playerState.hp,
            attackType
          });
          state.takeDamage(damage);
          state.eventBus.emit(EVENTS.DAMAGE_TAKEN, { amount: damage, source: bossEnemy.name, isBoss: true });
        }
        else if (attackType === 'crit') {
          // Critical attack: does 15 damage (ignores all shields, etc.)
          const damage = 15;
          retaliationSteps.push({
            enemyId: bossEnemy.id,
            name: `${bossEnemy.name} (Critical Strike ⚡)`,
            isBoss: true,
            damage,
            hpBefore: state.playerState.hp,
            isCrit: true,
            attackType
          });
          state.takeDamage(damage);
          state.eventBus.emit(EVENTS.DAMAGE_TAKEN, { amount: damage, source: bossEnemy.name, isBoss: true });
        }
        else if (attackType === 'corrosive') {
          // Corrosive: reduce healing and shielding by 10% for that day
          state.playerState.corrosiveStacks = (state.playerState.corrosiveStacks || 0) + 1;
          retaliationSteps.push({
            enemyId: bossEnemy.id,
            name: `${bossEnemy.name} (Corrosive Spit 🧪)`,
            isBoss: true,
            damage: 0,
            hpBefore: state.playerState.hp,
            hpAfter: state.playerState.hp,
            isCorrosive: true,
            attackType
          });
        }
        else if (attackType === 'heavy') {
          // Heavy strike: does 12 damage, forces dodge to cost double ap
          let damage = 12;
          damage = Math.max(1, Math.round(damage * reductionFactor));
          
          let shieldMultiplier = 1.0;
          if (skillFx.shieldCharges && skillFx.shieldCharges > 0) {
            shieldMultiplier *= 0.4;
            skillFx.shieldCharges--;
          }
          if (skillFx.fortressCharges && skillFx.fortressCharges > 0) {
            shieldMultiplier = 0.0;
            const reflect = Math.round(damage * 0.5);
            if (reflect > 0 && typeof bossEnemy.takeDamage === 'function') {
              bossEnemy.takeDamage(reflect);
            }
            skillFx.fortressCharges--;
          }
          
          let shieldAbsorption = 1.0 - shieldMultiplier;
          shieldAbsorption *= (1.0 - (state.playerState.corrosiveStacks || 0) * 0.10);
          shieldMultiplier = Math.max(0.0, 1.0 - shieldAbsorption);
          
          damage = Math.max(1, Math.round(damage * shieldMultiplier));
          
          state.playerState.dodgeCostMultiplier = (state.playerState.dodgeCostMultiplier || 1.0) * 2.0;

          retaliationSteps.push({
            enemyId: bossEnemy.id,
            name: `${bossEnemy.name} (Heavy Slam 💥)`,
            isBoss: true,
            damage,
            hpBefore: state.playerState.hp,
            isHeavy: true,
            attackType
          });
          state.takeDamage(damage);
          state.eventBus.emit(EVENTS.DAMAGE_TAKEN, { amount: damage, source: bossEnemy.name, isBoss: true });
        }
        else if (attackType === 'bomb') {
          // Bomb: summons a 30% max ap health bomb
          const bombEnemy = createBombEnemy(state.playerState.maxAp);
          state.stageState.enemies.push(bombEnemy);
          retaliationSteps.push({
            enemyId: bossEnemy.id,
            name: `${bossEnemy.name} (Summon Bomb 💣)`,
            isBoss: true,
            damage: 0,
            hpBefore: state.playerState.hp,
            hpAfter: state.playerState.hp,
            isBombSummon: true,
            attackType
          });
        }
        else if (attackType === 'heal') {
          // Heal: heals for 10% max health
          const healAmount = Math.round(bossEnemy.maxHp * 0.10);
          bossEnemy.heal(healAmount);
          retaliationSteps.push({
            enemyId: bossEnemy.id,
            name: `${bossEnemy.name} (Self-Heal 💚)`,
            isBoss: true,
            damage: 0,
            hpBefore: state.playerState.hp,
            hpAfter: state.playerState.hp,
            isHeal: true,
            healAmount,
            attackType
          });
          state.eventBus.emit(EVENTS.ENEMY_HEALED, { enemyId: bossEnemy.id, amount: healAmount, source: 'boss' });
        }
        else if (attackType === 'minion') {
          // minion summon: summons 1 minion
          const minionName = getRandomMinionNameForStage(stage, state.stageState.stageVariation);
          const minionObj = EnemyManager.createEnemy(minionName, state.playerState.maxAp, stage);
          state.stageState.enemies.push(minionObj);
          retaliationSteps.push({
            enemyId: bossEnemy.id,
            name: `${bossEnemy.name} (Summon ${minionName} 👿)`,
            isBoss: true,
            damage: 0,
            hpBefore: state.playerState.hp,
            hpAfter: state.playerState.hp,
            isMinionSummon: true,
            minionName,
            attackType
          });
        }

        const step = retaliationSteps[retaliationSteps.length - 1];
        if (step) {
          step.hpAfter = state.playerState.hp;
        }

        // Apply thorns if player hit
        if (attackType === 'regular' || attackType === 'crit' || attackType === 'heavy') {
          if (state.hasBuff('Thorns')) {
            const thorn = state.config.buffs?.Thorns?.effect?.thornsDamage;
            const thornDamage = typeof thorn === 'number' ? thorn : 2;
            if (typeof bossEnemy.takeDamage === 'function') {
              bossEnemy.takeDamage(thornDamage);
            }
          }
        }
      });
    } else {
      const resolveOneAttack = (enemy, damage, { isBoss = false } = {}) => {
        console.debug(`[resolveOneAttack] target=${enemy?.name || 'unknown'} id=${enemy?.id || 'n/a'} damage=${damage} isBoss=${isBoss}`);
        const consumeReactiveWeaponEffect = () => {
          const effect = enemy?.statusEffects?.reactiveWeapon;
          if (!effect || !effect.pending) return;

          if (effect.rewardType === 'ap') {
            const reward = Math.ceil((state.playerState.maxAp || 0) * (Number(effect.rewardValue) || 0));
            if (reward > 0) state.addAp(reward);
          } else if (effect.rewardType === 'mana') {
            const reward = Math.ceil(Number(effect.rewardValue) || 0);
            if (reward > 0) state.addMana(reward);
          }

          effect.pending = false;
          if (enemy?.statusEffects) {
            delete enemy.statusEffects.reactiveWeapon;
          }
        };

        if (enemy?.statusEffects?.stunned) {
          enemy.statusEffects.stunned = false;
          retaliationSteps.push({
            enemyId: enemy.id,
            name: enemy.name,
            isBoss,
            damage: 0,
            hpBefore: state.playerState.hp,
            hpAfter: state.playerState.hp,
            isStunned: true
          });
          return;
        }

        // Apply Freeze Rune damage reduction (reduces next retaliation damage by 45%)
        let isFrozen = false;
        if (enemy?.statusEffects?.freeze) {
          damage *= (enemy.statusEffects.freeze.damageMultiplier !== undefined ? enemy.statusEffects.freeze.damageMultiplier : 0.55);
          delete enemy.statusEffects.freeze;
          isFrozen = true;
        }

        // Check for dodge target
        const dodgeTarget = state.combatState?.dodgeTarget;
        const dodgeTargets = Array.isArray(dodgeTarget) ? dodgeTarget : (dodgeTarget ? [dodgeTarget] : []);
        // Swift mutator can bypass player dodge
        const swiftBypassDodge = Array.isArray(enemy.mutators) && enemy.mutators.includes('swift') && (state.config.mutators?.swift?.bypassDodge ?? false);
        if (dodgeTargets.includes(enemy.id) && !swiftBypassDodge) {
          state.combatState.dodgeTarget = dodgeTargets.filter(id => id !== enemy.id);
          consumeReactiveWeaponEffect();
          retaliationSteps.push({
            enemyId: enemy.id,
            name: enemy.name,
            isBoss,
            damage: 0,
            isDodge: true
          });
          return;
        }

        // Apply class-based multiplicative damageTaken modifiers
        if (passive && typeof passive.damageTaken === 'number') {
          damage *= passive.damageTaken;
        }

        // Apply skill effects (Knight Iron Bastion, Juggernaut Fortress)
        const skillFx = state.combatState?.skillEffects || {};

        // Knight: Iron Bastion - reduce incoming damage while shield charges remain
        if (skillFx.shieldCharges && skillFx.shieldCharges > 0) {
          damage *= (typeof skillFx.shieldDamageMultiplier === 'number' ? skillFx.shieldDamageMultiplier : 0.4);
          skillFx.shieldCharges--;
        }

        // Juggernaut: Fortress - invincible + reflect damage
        if (skillFx.fortressCharges && skillFx.fortressCharges > 0) {
          const reflectDamage = Math.ceil(damage * (typeof skillFx.fortressReflect === 'number' ? skillFx.fortressReflect : 0.5));
          // Reflect damage back to the attacking enemy
          if (reflectDamage > 0 && typeof enemy.takeDamage === 'function') {
            enemy.takeDamage(reflectDamage);
          }
          damage = 0; // invincible
          skillFx.fortressCharges--;
        }

        // Swift mutator can bypass flat reductions / shields
        const swiftBypassShields = Array.isArray(enemy.mutators) && enemy.mutators.includes('swift') && (state.config.mutators?.swift?.bypassShields ?? false);

        // Apply flat reductions (do NOT apply to late-todo damage; only enemy attacks)
        if (!swiftBypassShields) {
          let totalReduction = 0;
          if (passive && typeof passive.damageReduction === 'number') {
            totalReduction += passive.damageReduction;
          }

          if (state.hasBuff('Iron Skin')) {
            const reduction = state.config.buffs?.['Iron Skin']?.effect?.damageReduction;
            if (typeof reduction === 'number') {
              totalReduction += reduction;
            }
          }

          if (totalReduction > 0) {
            if (state.playerState.talismans?.includes('Titan\'s Mantle')) {
              totalReduction *= 2;
            }
            damage = Math.max(0, damage - totalReduction);
          }
        }

        const reactiveWeapon = enemy?.statusEffects?.reactiveWeapon;
        if (reactiveWeapon && reactiveWeapon.pending) {
          damage = Math.max(0, damage * (Number(reactiveWeapon.damageMultiplier) || 1));
        }

        retaliationSteps.push({
          enemyId: enemy.id,
          name: enemy.name,
          isBoss,
          damage,
          hpBefore: state.playerState.hp,
          isFrozen
        });

        state.takeDamage(damage);
        console.debug(`[resolveOneAttack] playerHP now=${state.playerState.hp}`);
        state.eventBus.emit(EVENTS.DAMAGE_TAKEN, { amount: damage, source: enemy.name, isBoss });
        consumeReactiveWeaponEffect();

        const step = retaliationSteps[retaliationSteps.length - 1];
        if (step) {
          step.hpAfter = state.playerState.hp;
        }

        // Buff: Thorns
        if (state.hasBuff('Thorns')) {
          const thorn = state.config.buffs?.Thorns?.effect?.thornsDamage;
          const thornDamage = typeof thorn === 'number' ? thorn : 2;
          if (typeof enemy.takeDamage === 'function') {
            enemy.takeDamage(thornDamage);
            console.debug(`[resolveOneAttack] thorns hit ${enemy.name}(${enemy.id}) for ${thornDamage}, enemyHP=${enemy.hp}`);
          } else if (typeof enemy.hp === 'number') {
            enemy.hp = Math.max(0, enemy.hp - thornDamage);
            if (enemy.hp === 0) enemy.isDead = true;
          }
        // Mutators that trigger when this enemy attacks
        try {
          if (typeof EnemyManager !== 'undefined' && typeof EnemyManager.applyMutatorsOnAttack === 'function') {
            EnemyManager.applyMutatorsOnAttack(enemy, damage);
          }
        } catch (e) {
          console.warn('Mutator apply failed on attack', e);
        }
        }
      };

      aliveNormalEnemies.forEach(enemy => {
        // Base enemy damage calculation (normal enemies split N)
        let damage = EnemyManager.calculateEnemyDamage(enemy, N, totalNormal);

        // Incantation multiplier (applies to THIS check-in, then clears)
        const incantMult = (typeof enemy.incantationDamageMult === 'number') ? enemy.incantationDamageMult : 1;
        damage *= incantMult;
        enemy.incantationDamageMult = 1;

        // Archetype adjustments
        const bruteMult = EnemyManager.applyBrutePassive(enemy, state.stageState.stage) || 1.0;
        damage *= bruteMult;

        resolveOneAttack(enemy, damage, { isBoss: false });

        // Archetype effects trigger when the enemy attacks (after damage)
        EnemyManager.applyHealerPassive(enemy);
        EnemyManager.applyManaDrainPassive(enemy, state.stageState.stage);
      });
    }
  } catch (e) {
    console.warn('Enemy retaliation failed during check-in', e);
  }

  // 4) Apply late todo flat damage
  try {
    lateTodoDamage = TaskManager.calculateLateTodoDamage();
    if (lateTodoDamage > 0) {
      // Unblockable flat damage
      state.takeDamage(lateTodoDamage);
      state.eventBus.emit(EVENTS.DAMAGE_TAKEN, { amount: lateTodoDamage, source: 'late-todos', unblockable: true });
    }
  } catch (e) {
    console.warn('Late todo damage calculation failed', e);
  }

  // 5) Nemesis incantations (only affects normal enemies)
  const incantations = [];
  try {
    const attrs = state.config.attributes || [];
    const aliveNormal = (state.stageState.enemies || []).filter(e => e && !e.isDead && !e.isBoss);
    const deadNormal = (state.stageState.enemies || []).filter(e => e && e.isDead && !e.isBoss);

    const leadingAttrs = attrs.filter(attr => {
      const nem = state.nemesisState?.attributes?.[attr]?.level || 1;
      const ply = state.playerState?.attributes?.[attr]?.level || 1;
      return nem > ply;
    });

    leadingAttrs.forEach(attr => {
      const roll = Math.random();
      if (roll < 0.5) {
        incantations.push({ attr, type: 'nothing' });
        return;
      }

      if (roll < 0.7) {
        const target = aliveNormal[Math.floor(Math.random() * aliveNormal.length)];
        if (target) {
          const healAmount = Math.ceil(target.maxHp * 0.5);
          if (typeof target.heal === 'function') target.heal(target.maxHp * 0.5);
          else if (typeof target.hp === 'number' && typeof target.maxHp === 'number') target.hp = Math.min(target.maxHp, target.hp + target.maxHp * 0.5);
          incantations.push({ attr, type: 'heal', enemyId: target.id });
          try { state.eventBus.emit(EVENTS.ENEMY_HEALED, { enemyId: target.id, amount: healAmount, source: 'nemesis' }); } catch (e) { }
        } else {
          incantations.push({ attr, type: 'heal:none' });
        }
        return;
      }

      if (roll < 0.9) {
        const target = aliveNormal[Math.floor(Math.random() * aliveNormal.length)];
        if (target) {
          target.incantationDamageMult = 1.5;
          incantations.push({ attr, type: 'damageMult', enemyId: target.id, mult: 1.5 });
        } else {
          incantations.push({ attr, type: 'damageMult:none' });
        }
        return;
      }

      const reviveTarget = deadNormal[Math.floor(Math.random() * deadNormal.length)];
      if (reviveTarget) {
        reviveTarget.isDead = false;
        reviveTarget.hp = reviveTarget.maxHp;
        reviveTarget.consecutiveAttackDays = 0;
        incantations.push({ attr, type: 'revive', enemyId: reviveTarget.id });
        try { state.eventBus.emit(EVENTS.ENEMY_REVIVED, { enemyId: reviveTarget.id, amount: reviveTarget.maxHp, source: 'nemesis' }); } catch (e) { }
      } else {
        incantations.push({ attr, type: 'revive:none' });
      }
    });
  } catch (e) {
    console.warn('Nemesis incantations failed during check-in', e);
  }

  // -- Secondary mutators: daily roll (30% per day by default, max per enemy)
  try {
    const aliveForMutator = (state.stageState.enemies || []).filter(e => e && !e.isDead && !e.isBoss);
    const mutatorGains = [];
    const chance = state.config.mutatorChancePerDay ?? 0.3;
    const maxPer = state.config.maxMutatorsPerEnemy ?? 3;
    aliveForMutator.forEach(enemy => {
      // Block mutations under Unstable Concoction
      if (enemy.statusEffects?.unstableConcoction?.preventMutate) {
        console.debug(`[Mutator] Mutation blocked for ${enemy.name} by unstable concoction`);
        return;
      }
      enemy.daysAlive = (enemy.daysAlive || 0) + 1;
      enemy.mutators = Array.isArray(enemy.mutators) ? enemy.mutators : [];
      if (enemy.mutators.length >= maxPer) return;
      if (Math.random() < chance) {
        const mut = (typeof EnemyManager !== 'undefined' && typeof EnemyManager.pickMutatorForEnemy === 'function')
          ? EnemyManager.pickMutatorForEnemy(enemy)
          : null;
        if (mut) {
          enemy.mutators.push(mut);
          mutatorGains.push({ enemyId: enemy.id, mutator: mut });
          try { state.eventBus.emit(EVENTS.ENEMY_MUTATED, { enemyId: enemy.id, mutator: mut, source: 'checkin' }); } catch (e) {}
          // Rallyist buff is now applied multiplicatively to damage during combat, no immediate application needed.
        }
      }
    });
    // attach collected mutator gains to the check-in result so UI can display them in sequence
    try { if (!Array.isArray(retaliationSteps)) retaliationSteps = retaliationSteps || []; } catch (e) {}
    // store on temp variable accessible later by CHECK_IN_COMPLETE emit
    state._lastCheckinMutatorGains = mutatorGains;
  } catch (e) {
    console.warn('Mutator roll failed during check-in', e);
  }

  // 6) Collect planner pending rewards
  let plannerClaim = { gold: 0, diamonds: 0, dateKey: null };
  try {
    const plannerKey = state.config.plannerKey || 'nemesis_planner_data';
    const raw = localStorage.getItem(plannerKey);
    if (raw) {
      const data = JSON.parse(raw);
      const isoKey = new Date().toISOString().split('T')[0];
      const localKey = getLocalDateKey();
      const dayKey = (data && data[isoKey]) ? isoKey : ((data && data[localKey]) ? localKey : null);
      if (dayKey && data[dayKey]?.pendingRewards) {
        const pending = data[dayKey].pendingRewards;
        const claimedGold = Number(pending.gold) || 0;
        const claimedDiamonds = Number(pending.diamonds) || 0;
        if (claimedGold) state.addGold(claimedGold);
        if (claimedDiamonds) state.addDiamonds(claimedDiamonds);

        if (claimedGold || claimedDiamonds) {
          data[dayKey].pendingRewards = { diamonds: 0, gold: 0 };
          localStorage.setItem(plannerKey, JSON.stringify(data));
          try {
            window.dispatchEvent(new StorageEvent('storage', { key: plannerKey, newValue: JSON.stringify(data) }));
          } catch {
            // ignore
          }
        }

        plannerClaim = { gold: claimedGold, diamonds: claimedDiamonds, dateKey: dayKey };
      }
    }
  } catch (e) {
    console.warn('Planner reward claim failed during check-in', e);
  }

  // 6) Death / Death Defiance handling
  if (state.playerState.hp <= 0) {
    const survived = PlayerManager.checkDeathDefiance();
    if (!survived) {
      // Permanent death — show death screen and emit event
      state.eventBus.emit(EVENTS.DEATH, {
        stage: state.stageState.stage,
        level: state.stageState.level
      });

      PopupsManager.showDeathScreen({
        class: state.playerState.className,
        stage: state.stageState.stage,
        level: state.stageState.level,
        enemiesDefeated: state.systemState.runStats.enemiesDefeated,
        bossesSailed: state.systemState.runStats.bossesSailed,
        goldEarned: state.systemState.runStats.totalGoldEarned
      });
      // Do not auto-reset; waiting for player action on death screen
      state.save();
      return;
    }
  }

  // 6b) Pet attacks random enemy (before checking if all enemies are dead)
  const petAttacks = [];
  if (state.playerState.hp > 0) {
    try {
      if (state.playerState.petHunger !== undefined) {
        state.playerState.petHunger = Math.max(0, state.playerState.petHunger - 20);
      }
      const isStarving = (state.playerState.petHunger === 0);
      const basePct = 0.02 + (state.playerState.level - 1) * 0.01;
      const upgradePct = (state.playerState.petUpgradeLevel || 0) * 0.015;
      const petBase = isStarving ? 0 : (state.playerState.maxAp * (basePct + upgradePct));

      const petMultiplier = (state.playerState.className === 'Druid')
        ? (state.config.classPassives.Druid?.petDamageMultiplier || 1) : 1;

      const petDamage = petBase * petMultiplier;
      
      const skillFx = state.combatState?.skillEffects || {};
      const petAttacksCount = skillFx.shadowPet ? 2 : 1;

      for (let i = 0; i < petAttacksCount; i++) {
        const alive = StageManager.getAliveEnemies();
        if (alive.length > 0) {
          const target = alive[Math.floor(Math.random() * alive.length)];
          target.takeDamage(petDamage);

          // Persist today's pet target so a badge is shown for the rest of the day
          const now = new Date();
          const today = now.toISOString().slice(0, 10); // YYYY-MM-DD
          state.playerState.petTarget = { enemyId: target.id, date: today };

          petAttacks.push({ targetId: target.id, damage: petDamage });
        }
      }
    } catch (petErr) {
      console.warn('Pet attack failed during check-in', petErr);
    }
  }

  // 7) If all enemies dead after resolution, advance level / stage
  if (StageManager.allEnemiesDead()) {
    state.systemState.runStats.enemiesDefeated += (state.stageState.enemies || []).length;
    PlayerManager.levelUp();
    // Advance to next level / stage
    StageManager.nextLevel();

    // Show buff selection when applicable
    const leveling = PlayerManager.getLevelingProgress();
    if (leveling.hasBuffSelection) {
      PopupsManager.showBuffSelection();
    }
  }

  // 8) Reset dailies, update streaks and record last check-in
  try {
    state.dailiesState.history = state.dailiesState.history || [];
    state.dailiesState.history.push({
      date: getLocalDateKey(),
      timestamp: nowMs,
      allDailiesComplete,
      completedDailies: completedDailies.map(d => ({ id: d.id, name: d.name, difficulty: d.difficulty, attribute: d.attribute })),
      missedDailies: missedDailies.map(d => ({ id: d.id, name: d.name, difficulty: d.difficulty, attribute: d.attribute })),
      missedDailyDamage: D,
      scaledN: N,
      lateTodoDamage,
      stage: state.stageState.stage,
      stageLevel: state.stageState.level,
      playerLevel: state.playerState.level
    });

    // Update achievements stats incrementally before reset
    state.dailiesState.dailies.forEach(daily => {
      if (daily.longestStreak === undefined) daily.longestStreak = 0;
      if (daily.currentStreak === undefined) daily.currentStreak = 0;
      if (daily.totalCompletions === undefined) daily.totalCompletions = 0;
      if (daily.totalCount === undefined) daily.totalCount = 0;

      daily.totalCount++;
      if (daily.completed) {
        daily.currentStreak = (daily.currentStreak || 0) + 1;
        daily.totalCompletions++;
        if (daily.currentStreak > daily.longestStreak) {
          daily.longestStreak = daily.currentStreak;
        }
      } else {
        daily.currentStreak = 0;
      }
      daily.completionRate = daily.totalCount > 0 ? (daily.totalCompletions / daily.totalCount) : 0;
    });

    TaskManager.resetDailies();
    state.playerState.corrosiveStacks = 0;
    state.playerState.dodgeCostMultiplier = 1.0;
    state.systemState.lastCheckInTime = nowMs;
    state.systemState.runStats.daysSurvived = (state.systemState.runStats.daysSurvived || 0) + 1;
    state.stageState.stageClearedToday = false;

    // Clear today's active skill effects
    if (state.combatState && state.combatState.skillEffects) {
      const skillFx = state.combatState.skillEffects;
      delete skillFx.wrathUnleashed;
      delete skillFx.wrathDamageMultiplier;
      delete skillFx.cannotDodge;
      delete skillFx.shadowPet;
      delete skillFx.stormVolley;
      delete skillFx.chronoShiftCharges;
    }

    // Clear unstableConcoction status effects from enemies
    try {
      const enemies = state.stageState.enemies || [];
      enemies.forEach(e => {
        if (e && e.statusEffects && e.statusEffects.unstableConcoction) {
          delete e.statusEffects.unstableConcoction;
        }
      });
    } catch (e) {}
  } catch (e) {
    console.warn('Failed to reset dailies during check-in', e);
  }

  // 9) Emit CHECK_IN_COMPLETE with the calculated pet attacks
  state.eventBus.emit(EVENTS.CHECK_IN_COMPLETE, {
    missedDailyDamage: D,
    scaledN: N,
    lateTodoDamage,
    plannerClaim,
    incantations,
    retaliationSteps,
    petAttacks,
    mutatorGains: state._lastCheckinMutatorGains || []
  });

  // 10) Delayed regeneration & final UI updates (registered to run after animation)
  const doDailyRegenAndSave = async () => {
    try {
      PlayerManager.applyDailyRegeneration();

      // Mutator: Regenerator - heal enemies with regenerator mutator at check-in
      try {
        const enemies = state.stageState.enemies || [];
        const regenPct = state.config.mutators?.regenerator?.regenPct ?? 0.1;
        enemies.forEach(e => {
          if (!e || e.isDead || !Array.isArray(e.mutators)) return;
          if (e.mutators.includes('regenerator')) {
            const healAmt = Math.ceil((e.maxHp || 0) * regenPct);
            if (healAmt > 0 && typeof e.heal === 'function') {
              e.heal(healAmt);
              try { state.eventBus.emit(EVENTS.ENEMY_HEALED, { enemyId: e.id, amount: healAmt, source: 'mutator:regenerator' }); } catch (e) {}
            }
          }
        });
      } catch (e) {
        console.warn('Regenerator mutator heal failed', e);
      }

      // Nemesis gains attribute points (70% of total possible daily attr + pending todo gains)
      try {
        const baneFactor = state.hasBuff('Nemesis Bane')
          ? (state.config.buffs?.['Nemesis Bane']?.effect?.nemesisAttrReduction ?? 0.5)
          : 1;
        const gainFactor = 0.7 * (typeof baneFactor === 'number' ? baneFactor : 1);

        (state.dailiesState.dailies || []).forEach(daily => {
          const reward = state.config.taskRewards?.[daily.difficulty];
          const pts = (reward?.attributePoints ?? 0) * gainFactor;
          if (pts > 0) state.addNemesisAttributePoints(daily.attribute, pts);
        });

        const nearTodos = TaskManager.getUncompletedTodosNearDeadline(state.config.nemesisTodoGainHours || 24);
        (nearTodos || []).forEach(todo => {
          if (todo.nemesisGained) return;
          const reward = state.config.taskRewards?.[todo.difficulty];
          const pts = (reward?.attributePoints ?? 0) * gainFactor;
          if (pts > 0) state.addNemesisAttributePoints(todo.attribute, pts);
          todo.nemesisGained = true;
        });
      } catch (e) {
        console.warn('Nemesis attribute gain failed during check-in', e);
      }

      // Clear check-in running state, persist and reload UI
      state.stageState.bossRolledAttacks = null;
      clearCheckInRunning();
      state.save();
      if (typeof UIManager !== 'undefined') UIManager.refreshGameUI();

      // Show pet hunger warning if pet is under 30% hunger and player is alive
      if (state.playerState.hp > 0 && state.playerState.petHunger !== undefined && state.playerState.petHunger < 30) {
        const petHunger = state.playerState.petHunger;
        let msg = '';
        if (petHunger === 0) {
          msg = 'Your pet is starving (0% hunger) and deals 0 damage! Feed it in the Pet Evolution tab to restore its strength.';
        } else {
          msg = `Your pet is hungry (${petHunger}% hunger)! Feed it in the Pet Evolution tab to prevent starvation and loss of damage.`;
        }
        setTimeout(() => {
          if (typeof PopupsManager !== 'undefined' && PopupsManager.showAlert) {
            PopupsManager.showAlert('PET HUNGER WARNING', msg);
          }
        }, 2000);
      }
    } catch (e) {
      console.warn('Daily regeneration failed during check-in', e);
      clearCheckInRunning();
      state.save();
      if (typeof UIManager !== 'undefined') UIManager.refreshGameUI();

      // Show pet hunger warning if pet is under 30% hunger and player is alive (fallback on regen failure)
      if (state.playerState.hp > 0 && state.playerState.petHunger !== undefined && state.playerState.petHunger < 30) {
        const petHunger = state.playerState.petHunger;
        let msg = '';
        if (petHunger === 0) {
          msg = 'Your pet is starving (0% hunger) and deals 0 damage! Feed it in the Pet Evolution tab to restore its strength.';
        } else {
          msg = `Your pet is hungry (${petHunger}% hunger)! Feed it in the Pet Evolution tab to prevent starvation and loss of damage.`;
        }
        setTimeout(() => {
          if (typeof PopupsManager !== 'undefined' && PopupsManager.showAlert) {
            PopupsManager.showAlert('PET HUNGER WARNING', msg);
          }
        }, 2000);
      }
    }
  };

  // Run daily regeneration sequentially after check-in animation completes
  state.eventBus.once(EVENTS.CHECK_IN_ANIMATION_COMPLETE, () => {
    setTimeout(doDailyRegenAndSave, 300);
  });

  return true;
}

