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
  DAILY_RESET: 'daily:reset',
  SKIPPED_DAY_DEATH: 'death:skippedDay',
  
  // Resources
  HP_CHANGED: 'resource:hpChanged',
  MANA_CHANGED: 'resource:manaChanged',
  AP_CHANGED: 'resource:apChanged',
  GOLD_CHANGED: 'resource:goldChanged',
  DIAMONDS_CHANGED: 'resource:diamondsChanged',
  
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

// GameState: singular source of truth
class GameState {
  constructor(config = DEFAULT_GAME_CONFIG) {
    this.config = deepMerge(DEFAULT_GAME_CONFIG, config);
    this.eventBus = new EventBus();
    
    // Initialize fresh state
    this.reset();
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
      killTagsByWeapon: {} // { weaponName: count }
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
      nextBossAtLevel: 5
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
      dialogueSeen: {},
      runSeenEnemies: {},
      diamondRewards: [],
      vineSpellState: {
        dayKey: getLocalDayKey(),
        storedDamageByEnemyId: {},
        triggeredTodayByEnemyId: {}
      },
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
    this.setHp(this.playerState.hp + amount);
  }
  
  takeDamage(amount) {
    this.setHp(this.playerState.hp - amount);
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
    this.setMana(this.playerState.mana - amount);
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
  
  load() {
    const saved = localStorage.getItem('nemesis_data');
    if (!saved) return false;
    
    try {
      const data = JSON.parse(saved);
      this.playerState = data.playerState;
      this.playerState.diamonds = Math.max(0, Math.round(Number(this.playerState.diamonds) || 0));
      const weaponSlots = Array.isArray(this.playerState.weapons) ? this.playerState.weapons.length : 0;
      if (!Array.isArray(this.playerState.weaponElements)) {
        this.playerState.weaponElements = Array(weaponSlots).fill(null);
      } else if (this.playerState.weaponElements.length < weaponSlots) {
        while (this.playerState.weaponElements.length < weaponSlots) {
          this.playerState.weaponElements.push(null);
        }
      }
      this.dailiesState = data.dailiesState;
      this.stageState = data.stageState;
      this.combatState = data.combatState;
      this.buffs = data.buffs;
      this.nemesisState = data.nemesisState;
      this.systemState = data.systemState;
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
function performCheckIn() {
  const state = getGameState();

  if (state.systemState.isPaused) {
    console.warn('Cannot check in while paused');
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
      level: state.playerState.level,
      enemiesDefeated: state.systemState.runStats.enemiesDefeated,
      bossesSailed: state.systemState.runStats.bossesSailed,
      goldEarned: state.systemState.runStats.totalGoldEarned
    });
    state.save();
    return;
  }

  // 2) Pet attacks random enemy (before enemy retaliation)
  try {
    const petBase = typeof state.config.petBaseDamageFormula === 'function'
      ? state.config.petBaseDamageFormula(state.playerState.maxAp, state.playerState.level)
      : (state.playerState.maxAp * 0.02);

    const petMultiplier = (state.playerState.className === 'Druid')
      ? (state.config.classPassives.Druid?.petDamageMultiplier || 1) : 1;

    const petDamage = petBase * petMultiplier;
    const alive = StageManager.getAliveEnemies();
    if (alive.length > 0) {
      const target = alive[Math.floor(Math.random() * alive.length)];
      target.takeDamage(petDamage);
      state.eventBus.emit(EVENTS.ATTACK, { type: 'pet', damage: petDamage, targetId: target.id });
    }
  } catch (e) {
    console.warn('Pet attack failed during check-in', e);
  }

  // 3) Resolve enemy attacks (each alive enemy deals split of N)
  let lateTodoDamage = 0;
  const retaliationSteps = [];
  try {
    const aliveEnemies = StageManager.getAliveEnemies();
    const aliveNormalEnemies = aliveEnemies.filter(e => !e?.isBoss);
    const bossEnemy = aliveEnemies.find(e => e?.isBoss);
    const totalNormal = aliveNormalEnemies.length || 1;
    const passive = PlayerManager.getClassPassive();

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

      // Check for dodge target
      const dodgeTarget = state.combatState?.dodgeTarget;
      const dodgeTargets = Array.isArray(dodgeTarget) ? dodgeTarget : (dodgeTarget ? [dodgeTarget] : []);
      // Swift mutator can bypass player dodge
      const swiftBypassDodge = Array.isArray(enemy.mutators) && enemy.mutators.includes('swift') && (state.config.mutators?.swift?.bypassDodge ?? false);
      if (dodgeTargets.includes(enemy.id) && !swiftBypassDodge) {
        state.combatState.dodgeTarget = dodgeTargets.filter(id => id !== enemy.id);
        consumeReactiveWeaponEffect();
        state.eventBus.emit(EVENTS.ATTACK, { type: 'dodgeAvoid', enemyId: enemy.id });
        return;
      }

      // Apply class-based multiplicative damageTaken modifiers
      if (passive && typeof passive.damageTaken === 'number') {
        damage *= passive.damageTaken;
      }

      // Swift mutator can bypass flat reductions / shields
      const swiftBypassShields = Array.isArray(enemy.mutators) && enemy.mutators.includes('swift') && (state.config.mutators?.swift?.bypassShields ?? false);

      // Apply flat reductions (do NOT apply to late-todo damage; only enemy attacks)
      if (!swiftBypassShields) {
        if (passive && typeof passive.damageReduction === 'number') {
          damage = Math.max(0, damage - passive.damageReduction);
        }

        if (state.hasBuff('Iron Skin')) {
          const reduction = state.config.buffs?.['Iron Skin']?.effect?.damageReduction;
          if (typeof reduction === 'number') {
            damage = Math.max(0, damage - reduction);
          }
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
        hpBefore: state.playerState.hp
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

    // Boss retaliation: proportional to N (no random flat variance)
    if (bossEnemy && !bossEnemy.isDead) {
      const bossMult = typeof bossEnemy.dmgMult === 'number' ? bossEnemy.dmgMult : 1.0;
      // Boss damage should also be doubled to match global enemy damage scaling
      const bossDamage = Math.max(0, N * bossMult) * 2;
      resolveOneAttack(bossEnemy, bossDamage, { isBoss: true });
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
          // immediate application for certain mutators
          if (mut === 'rallyist') {
            state.stageState.rallyistCount = (state.stageState.rallyistCount || 0) + 1;
            if (typeof EnemyManager !== 'undefined' && typeof EnemyManager.applyRallyistBuffToAll === 'function') {
              EnemyManager.applyRallyistBuffToAll(state.stageState.rallyistCount);
            }
          }
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

  state.eventBus.emit(EVENTS.CHECK_IN_COMPLETE, {
    missedDailyDamage: D,
    scaledN: N,
    lateTodoDamage,
    plannerClaim,
    incantations,
    retaliationSteps,
    mutatorGains: state._lastCheckinMutatorGains || []
  });

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
        level: state.playerState.level,
        enemiesDefeated: state.systemState.runStats.enemiesDefeated,
        bossesSailed: state.systemState.runStats.bossesSailed,
        goldEarned: state.systemState.runStats.totalGoldEarned
      });
      // Do not auto-reset; waiting for player action on death screen
      state.save();
      return;
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

    TaskManager.resetDailies();
    state.systemState.lastCheckInTime = nowMs;
    state.systemState.runStats.daysSurvived = (state.systemState.runStats.daysSurvived || 0) + 1;
  } catch (e) {
    console.warn('Failed to reset dailies during check-in', e);
  }

    // 9) Delayed: Regenerate mana/hp per-class daily effects
    // Delay regen slightly so retaliation damage is visible in the UI first
    const doDailyRegenAndSave = () => {
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

        // 10) Nemesis gains attribute points (70% of total possible daily attr + pending todo gains)
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

        // Persist and refresh UI after regen
        state.save();
        if (typeof UIManager !== 'undefined') UIManager.refreshGameUI();
      } catch (e) {
        console.warn('Daily regeneration failed during check-in', e);
        state.save();
        if (typeof UIManager !== 'undefined') UIManager.refreshGameUI();
      }
    };

    // Schedule regen shortly after check-in so damage numbers are visible
    setTimeout(doDailyRegenAndSave, 700);

    // 10) Nemesis gains attribute points (moved into delayed block)
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

  // 10) Persist and refresh UI
  state.save();
  if (typeof UIManager !== 'undefined') {
    UIManager.refreshGameUI();
  }

  return true;
}
