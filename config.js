/**
 * NEMESIS ROGUELIKE — GAME CONFIG & CONSTANTS
 * All balance values, class definitions, enemies, formations, and buffs.
 */

const DEFAULT_GAME_CONFIG = {
  // ============================================================
  // BASIC GAME SETTINGS
  // ============================================================
  gameVersion: '5.0',
  // Audio settings
  soundEnabled: true,
  soundVolume: 0.6,
  maxPlayerLevel: 35,
  maxStages: 7,
  maxLevelPerStage: 4,
  
  // ============================================================
  // DAILY CYCLE & CHECK-IN
  // ============================================================
  nemesisTodoGainHours: 24,
  missedDailyDamage: {
    Easy: 1,
    Medium: 1.5,
    Hard: 2,
    Ultra: 3
  },
  
  // ============================================================
  // RESOURCES & SCALING
  // ============================================================
  minRequiredDailies: 3,
  attackPowerScaleBase: 350, // scaling factor: S = max(0.3, min(2.0, MAX_AP / 350))
  attackPowerScaleMin: 0.3,
  attackPowerScaleMax: 2.0,
  
  // ============================================================
  // TASK REWARDS (Base)
  // ============================================================
  taskRewards: {
    Easy: { gold: 10, ap: 25, diamonds: 1, attributePoints: 1 },
    Medium: { gold: 15, ap: 35, diamonds: 2, attributePoints: 2 },
    Hard: { gold: 20, ap: 40, diamonds: 3, attributePoints: 3 },
    Ultra: { gold: 30, ap: 55, diamonds: 4, attributePoints: 4 }
  },
  
  // ============================================================
  // SUBTASKS & BLOOD OATH
  // ============================================================
  subtaskMultiplier: 1.2, // multiplicative per subtask
  bloodOathRewardMultiplier: 1.3,
  bloodOathDamageMultiplier: 1.3,
  bloodOathManaCost: 20,
  lateTaskDamage: {
    Easy: 5,
    Medium: 7.5,
    Hard: 10,
    Ultra: 15
  },
  lateTaskRewardMultiplier: 0.5,
  
  // ============================================================
  // ATTRIBUTES
  // ============================================================
  attributes: ['STR', 'DISC', 'RESP', 'SOC', 'CAP', 'CREA', 'INT'],
  attributeColors: {
    STR: '#f94144',
    DISC: '#f3722c',
    RESP: '#f8961e',
    SOC: '#f9c74f',
    CAP: '#90be6d',
    CREA: '#43aa8b',
    INT: '#577590'
  },
  attributeLevelThresholds: function() {
    // Level L: sum from i=10 to 10+L-2
    const thresholds = [0, 10]; // Level 0, 1
    for (let L = 2; L <= 35; L++) {
      let sum = 0;
      for (let i = 10; i <= 10 + L - 2; i++) sum += i;
      thresholds.push(sum);
    }
    return thresholds;
  },
  
  // ============================================================
  // CLASSES
  // ============================================================
  classes: {
    Knight: {
      hp: 180, mana: 200, hpRegen: 20, manaRegen: 50,
      passive: 'Sturdy: all enemy damage reduced by 2',
      skill: 'Raise Shield – next 2 attacks against you deal 0.7× damage (cost: 60 mana)'
    },
    Rogue: {
      hp: 70, mana: 250, hpRegen: 10, manaRegen: 60,
      passive: 'Quick Hands: +15% crit chance',
      skill: 'Shadow Strike – next attack deals double damage, ignores resistances (cost: 30 mana)'
    },
    Wizard: {
      hp: 90, mana: 300, hpRegen: 10, manaRegen: 70,
      passive: 'Elemental Attunement: attacking an enemy\'s weakness auto-crits',
      skill: 'Arcane Surge – for today, weapon element changes to chosen type (cost: 40 mana)'
    },
    Brute: {
      hp: 100, mana: 150, hpRegen: 15, manaRegen: 40,
      passive: 'Berserk: deal +40% damage, take +30% damage',
      skill: 'Blood Frenzy – today all attacks cost 50% less AP, but you take double damage (cost: 50 mana)'
    },
    Ranger: {
      hp: 80, mana: 180, hpRegen: 12, manaRegen: 50,
      passive: 'Master of Arms: equip 3 weapons; gain Kill Tags every 3 kills instead of 5',
      skill: 'Volley – attack 3 random enemies with 50% of current weapon\'s damage each (cost: 40 mana)'
    },
    Druid: {
      hp: 120, mana: 220, hpRegen: 20, manaRegen: 60,
      passive: 'Whisperer: pet damage ×3',
      skill: 'Mend – heal self 20 HP, then pet attacks twice today (cost: 50 mana)'
    },
    Alchemist: {
      hp: 90, mana: 250, hpRegen: 10, manaRegen: 70,
      passive: 'Potion Master: consumable effects 50% stronger, last 1 extra day',
      skill: 'Acid Flask – deal 10% of each enemy\'s max HP as damage (cost: 40 mana)'
    },
    Juggernaut: {
      hp: 250, mana: 100, hpRegen: 30, manaRegen: 30,
      passive: 'Immovable: multiply damage by 0.6',
      skill: 'Taunt – cannot dodge today, but take 60% less damage (cost: 60 mana)'
    },
    Madman: {
      hp: 1, mana: 1, hpRegen: 0, manaRegen: 0,
      passive: 'Fragile: miss any daily → die at check-in, no death defiance',
      skill: 'immediately gain 5 diamonds (cost: 1 mana, re-usable)'
    }
  },
  classPassives: {
    Knight: { damageReduction: 2 },
    Rogue: { critBonus: 0.15 },
    Wizard: null, // handled in combat
    Brute: { damageDealt: 1.4, damageTaken: 1.3 },
    Ranger: null, // handled in shop
    Druid: { petDamageMultiplier: 3 },
    Alchemist: { consumableMultiplier: 1.5 },
    Juggernaut: { damageMultiplier: 0.6 },
    Madman: null // special case
  },
  skillManaCosts: {
    Knight: 60,
    Rogue: 30,
    Wizard: 40,
    Brute: 50,
    Ranger: 40,
    Druid: 50,
    Alchemist: 40,
    Juggernaut: 60,
    Madman: 1
  },
  
  // ============================================================
  // COMBAT SYSTEM
  // ============================================================
  comboMaxStacks: 3,
  comboTimeWindow: 2000, // ms
  comboDamageBonus: 0.1, // +10% per stack
  comboApCostReduction: 0.05, // -5% per stack (additive)
  overkillThreshold: 0.6, // 60% of max HP
  overkillChance: 0.4,
  finalStandThreshold: 0.2, // 20% of max HP
  finalStandChance: 0.4, // 40% chance
  dodgeCost: 0.3, // 30% of MAX_AP
  dodgeSpinnerMultiplier: 2,
  dodgeDamageReduction: 0.7, // for next attack
  
  // ============================================================
  // PET SYSTEM
  // ============================================================
  petBaseDamageFormula: (playerMaxAp, playerLevel) => {
    return playerMaxAp * (0.02 + (playerLevel - 1) * 0.01);
  },
  
  // ============================================================
  // STAGES & FORMATIONS
  // ============================================================
  stageHpPercentages: [30, 35, 40, 50, 60, 65, 70],
  enemyHpMultiplier: 3,
  eliteEnemyChance: 0.1,
  eliteEnemyHpMultiplier: 2,
  eliteEnemyDamageMultiplier: 2,
  eliteEnemyGoldMultiplier: 3,
  
  // ============================================================
  // ENEMY ARCHETYPES & PROPERTIES
  // ============================================================
  elementGradeMultipliers: {
    A: 0.7, B: 0.9, C: 1.0, D: 1.1, E: 1.3, F: 1.3
  },
  enemyElementColors: {
    Air: '#ffffff',
    Earth: '#44ff44',
    Fire: '#ff9a2e',
    Water: '#4ea3ff',
    Aether: '#ffd76a',
    default: '#9d6bff'
  },
  weaponElementTypes: ['Air', 'Earth', 'Fire', 'Water', 'Aether'],
  enemyArchetypes: {
    Brute: {
      description: 'Consecutive attack multiplier M = 1 + stage/10. Each consecutive day, damage ×M up to M^5.'
    },
    Healer: {
      description: 'When it attacks, heals the lowest-HP ally for 20% of that ally\'s max HP.'
    },
    'Mana Drain': {
      description: 'Attacks drain MN mana, where MN = stage + 4.'
    },
    Protector: {
      description: 'While alive, adjacent living enemies take only 0.7× damage (30% reduction).'
    }
  },

  // ============================================================
  // ENEMY MUTATORS (secondary mutators gained per-day)
  // ============================================================
  mutatorChancePerDay: 0.3,
  maxMutatorsPerEnemy: 3,
  mutators: {
    available: ['vampiric','regenerator','rallyist','turret','swift','necromancer'],
    vampiric: {
      // heals this enemy on dealing damage: percent of PLAYER max AP
      healPctOfPlayerMaxAp: 0.20
    },
    regenerator: {
      // percent of enemy max HP healed at check-in
      regenPct: 0.50
    },
    rallyist: {
      // additive stacking: each rallyist contributes this multiplier (2 => +100% per rallyist)
      multiplier: 2.0
    },
    turret: {
      // damage dealt to player when player attacks other enemies (unblockable)
      damage: 5,
      // cap fraction of player's max HP per action caused by turrets
      maxBacklashFraction: 0.15,
      unblockable: true
    },
    swift: {
      // swift enemies bypass dodge and shields when they attack
      bypassDodge: true,
      bypassShields: true
    },
    necromancer: {
      // percent of max HP to revive a dead enemy to when necromancer triggers
      revivePct: 0.35,
      // chance to revive on trigger
      reviveChance: 1.0
    }
  },
  
  // ============================================================
  // STREAK BONUS & CHECK-IN
  // ============================================================
  perfectDayStreakDamageBonus: 0.01, // +1% per perfect day
  
  // ============================================================
  // DEATH DEFIANCE
  // ============================================================
  deathDefianceHpSurvival: 1, // survive with 1 HP
  
  // ============================================================
  // BUFFS (21 Permanent, Stackable)
  // ============================================================
  buffs: {
    'Sharp Edge': {
      icon: '⚔️',
      description: '+10% AP-to-damage',
      effect: { apDamageBonus: 0.1 }
    },
    'Critical Precision': {
      icon: '💀',
      description: '+5% crit',
      effect: { critBonus: 0.05 }
    },
    'Overkill': {
      icon: '💥',
      description: 'Overkill can trigger regardless of threshold (always splits excess)',
      effect: { overkillAlways: true }
    },
    'Bloodlust': {
      icon: '🩸',
      description: 'kill restores 5 HP',
      effect: { killHeal: 5 }
    },
    'Fury': {
      icon: '🔥',
      description: 'after taking dmg, +5% max potential AP',
      effect: { furyApBonus: 0.05 }
    },
    'Iron Skin': {
      icon: '🛡️',
      description: '-5 enemy dmg',
      effect: { damageReduction: 5 }
    },
  
    // ============================================================
    // AUDIO / SOUND
    'Regeneration': {
      icon: '💚',
      description: '+5 HP daily',
      effect: { dailyHealAmount: 5 }
    },
    'Resilience': {
      icon: '💪',
      description: 'survive lethal hit once/stage',
      effect: { surviveLethal: true }
    },
    'Thorns': {
      icon: '🌹',
      description: 'enemies take 2 dmg on attack',
      effect: { thornsDamage: 2 }
    },
    'Barrier': {
      icon: '🔷',
      description: '10 HP shield daily',
      effect: { dailyShield: 10 }
    },
    'Efficiency': {
      icon: '⚙️',
      description: 'mana cost -15%',
      effect: { manaCostReduction: 0.15 }
    },
    'Greed': {
      icon: '💰',
      description: '+20% gold',
      effect: { goldBonus: 0.2 }
    },
    "Tasker's Boon": {
      icon: '📋',
      description: 'multiply all todo rewards by 1.5×',
      effect: { todoRewardMultiplier: 1.5 }
    },
    'Quick Learner': {
      icon: '📚',
      description: 'base task rewards treated as one tier higher',
      effect: { taskTierUpgrade: true }
    },
    'Pacifist': {
      icon: '☮️',
      description: 'missed dailies 50% less dmg',
      effect: { missedDailyDamageReduction: 0.5 }
    },
    'Echo Strike': {
      icon: '🔔',
      description: 'every 3rd AP double',
      effect: { everyThirdApDouble: true }
    },
    'Scavenger': {
      icon: '🦅',
      description: 'enemies drop 5 gold',
      effect: { goldOnKill: 5 }
    },
    'Vampiric Touch': {
      icon: '🧛',
      description: '10% lifesteal',
      effect: { lifeStealPercentage: 0.1 }
    },
    'Lightning Speed': {
      icon: '⚡',
      description: 'each perfect day permanently increases MAX_AP by +10% (multiplicative)',
      effect: { perfectDayApMultiplier: 1.1 }
    },
    'Phoenix': {
      icon: '🔥',
      description: 'revive 50% HP once/run',
      effect: { phoenixRevive: true }
    },
    'Nemesis Bane': {
      icon: '☠️',
      description: 'Nemesis gains 50% attr',
      effect: { nemesisAttrReduction: 0.5 }
    }
  },
  
  // ============================================================
  // WEAPONS (BASIC & EXPANDED)
  // ============================================================
  weapons: {
    // BASIC WEAPONS (6)
    'Rusty Sword': {
      type: 'Standard',
      baseApCost: 30,
      damageMultiplier: 1.0,
      critChance: 0.05,
      fireRate: 1,
      price: 0, // starter
      special: 'Universal starter'
    },
    'Great Hammer': {
      type: 'Heavy',
      baseApCost: 55,
      damageMultiplier: 1.8,
      critChance: 0.05,
      fireRate: 1,
      price: 3,
      special: null
    },
    'Dagger': {
      type: 'Light',
      baseApCost: 22,
      damageMultiplier: 0.6,
      critChance: 0.5,
      fireRate: 3,
      price: 3,
      special: null
    },
    'Bomb': {
      type: 'AoE',
      baseApCost: 55,
      damageMultiplier: 0.2,
      critChance: 0.08,
      fireRate: 1,
      price: 4,
      special: 'Hits ALL enemies'
    },
    'Buckler': {
      type: 'Shield',
      baseApCost: 50,
      damageMultiplier: 0.1,
      critChance: 0.05,
      fireRate: 1,
      price: 3,
      specialId: 'buckler',
      special: 'Applies Buckler. The next time that enemy attacks, gain 20% max AP and halve its damage.',
      detail: 'Applies Buckler to the target. The next time that enemy attacks, you gain 20% of your max AP for free and that enemy deals half damage. Cost: 50 AP.'
    },
    'Grimoire': {
      type: 'Special',
      baseApCost: 40,
      damageMultiplier: 1.1,
      critChance: 0.1,
      fireRate: 2,
      price: 3,
      special: 'Gain 20 mana when you kill an enemy'
    },
    
    // EXPANDED WEAPONS (10 more)
    'Vampire Dagger': {
      type: 'Light/Leg',
      baseApCost: 38,
      damageMultiplier: 0.7,
      critChance: 0.28,
      fireRate: 4,
      price: 5,
      special: '+30 HP when you kill an enemy'
    },
    'Bazooka': {
      type: 'Heavy/AoE',
      baseApCost: 65,
      damageMultiplier: 2.8,
      critChance: 0.0,
      fireRate: 1,
      price: 6,
      special: 'Hits target + 2 adjacent enemies'
    },
    'Uzi': {
      type: 'Light',
      baseApCost: 12,
      damageMultiplier: 2.0,
      critChance: 0.08,
      fireRate: 6,
      price: 4,
      comboMaxStacks: 10,
      specialId: 'uzi',
      special: 'Combo cap 10x instead of 3x',
      detail: 'Allows combo chains up to 10x instead of the normal 3x. Its combo scaling is not otherwise changed.'
    },
    'Thunder Hammer': {
      type: 'Heavy/Leg',
      baseApCost: 100,
      damageMultiplier: 1.5,
      critChance: 0.15,
      fireRate: 1,
      price: 7,
      special: 'Stuns enemy on crit (skips its next attack)'
    },
    'Lazer': {
      type: 'Special',
      baseApCost: 50,
      damageMultiplier: 0.8,
      critChance: 0.2,
      fireRate: 2,
      price: 5,
      specialId: 'lazer',
      special: 'Also blasts a random enemy for 2x damage',
      detail: 'Attacks your chosen target, then fires a second blast at a random enemy for 2x damage. The random hit should usually take more damage than the target you selected.'
    },
    'Vine Spell': {
      type: 'Special/AoE',
      baseApCost: 45,
      damageMultiplier: 0.5,
      critChance: 0.08,
      fireRate: 2,
      price: 5,
      specialId: 'vine',
      special: 'Stores damage dealt to each enemy and replays 1/3 on the first hit each day',
      detail: 'Tracks total damage dealt to each exact enemy. On the first Vine Spell hit each day against that enemy, it deals an extra 1/3 of the stored damage, then resets that enemy’s stored total for the new day.'
    },
    'Death Spell': {
      type: 'Legendary',
      baseApCost: 300,
      damageMultiplier: Infinity, // instakill
      critChance: 0,
      fireRate: 1,
      price: 8,
      special: 'Kills enemy at ≤30% HP instantly'
    },
    'Heavy Hammer': {
      type: 'Heavy',
      baseApCost: 55,
      damageMultiplier: 2.2,
      critChance: 0.15,
      fireRate: 1,
      price: 5,
      special: null
    },
    'Echo Bow': {
      type: 'Light/Spec',
      baseApCost: 35,
      damageMultiplier: 1.0,
      critChance: 0.1,
      fireRate: 3,
      price: 5,
      special: 'Every 3rd attack deals double damage'
    },
    'Aegis': {
      type: 'Shield/Leg',
      baseApCost: 50,
      damageMultiplier: 0.1,
      critChance: 0.05,
      fireRate: 1,
      price: 6,
      specialId: 'aegis',
      special: 'Applies Aegis. The next time that enemy attacks, gain 50 mana and halve its damage.',
      detail: 'Applies Aegis to the target. The next time that enemy attacks, you gain 50 mana for free and that enemy deals half damage. Cost: 50 AP.'
    }
  },
  
  // ============================================================
  // CONSUMABLES
  // ============================================================
  consumables: {
    // Defensive
    'Shield': { type: 'Defensive', effect: '-10% dmg 1 day', price: 0.3 },
    'Mega Instinct': { type: 'Defensive', effect: '+20% dodge 1 day', price: 0.3 },
    'Health Potion': { type: 'Restorative', effect: '+30 HP instantly', price: 1 },
    'Mana Potion': { type: 'Restorative', effect: '+50 Mana instantly', price: 1 },
    // Offensive
    'Rage Tonic': { type: 'Offensive', effect: 'next 3 attacks +5% dmg', price: 0.4 },
    'Elemental Grease': { type: 'Offensive', effect: 'enemy weaknesses +3%', price: 0.4 },
    'Lightning Rod': { type: 'Offensive', effect: 'next crit hits random enemy too', price: 0.4 },
    'Gorillaz Brute Juice': { type: 'Offensive', effect: 'Brute passive for 1 day', price: 0.4 },
    'Catalyzer': { type: 'Offensive', effect: 'next 3 attacks ignore resistance', price: 0.4 },
    // Others
    'Prayer': { type: 'Other', effect: 'negate next 5 incantations', price: 5 },
    'Rift': { type: 'Other', effect: 'skip current level, no rewards', price: 5 },
    'Echo': { type: 'Other', effect: 'duplicate one buff for 1 day', price: 5 }
  },
  consumableSlots: {
    max: 5,
    maxPerType: 5
  },
  
  // ============================================================
  // SHOP MECHANICS
  // ============================================================
  shopAppearLevels: [2, 4], // appears on 2nd and 4th cleared level
  shopLongPressMs: 450,
  killTagsPerUpgrade: 5,
  killTagThresholdNormal: 5,
  killTagThresholdRanger: 3,
  shopItemIcons: {
    smith: '⚒️',
    consumable: '🧪',
    'Health Potion': '❤️',
    'Mana Potion': '💧',
    'Heal Potion': '🧪',
    'AP Tonic': '⚡',
    'Kill Tag Pack': '🏷️',
    Shield: '🛡️',
    'Mega Instinct': '🌀',
    'Rage Tonic': '🔥',
    'Elemental Grease': '✨',
    'Lightning Rod': '⚡',
    'Gorillaz Brute Juice': '🦍',
    Catalyzer: '🧬',
    Prayer: '🙏',
    Rift: '🕳️',
    Echo: '🔁'
  },
  dialogueCards: {
    shopOpen: {
      title: 'Shopkeeper',
      text: 'text',
      image: null
    },
    enemyFirstSeen: {
      title: 'Bestiary',
      text: 'text',
      image: null
    },
    bossFirstSeen: {
      title: 'Warning',
      text: 'text',
      image: null
    },
    bossPhase2: {
      title: 'Boss Phase 2',
      text: 'text',
      image: null
    },
    bossDefeat: {
      title: 'Victory',
      text: 'text',
      image: null
    }
  },
  
  // ============================================================
  // PLANNER
  // ============================================================
  plannerKey: 'nemesis_planner_data',
  plannerBackgroundBarCountMin: 2,
  plannerBackgroundBarCountMax: 20,
  plannerBackgroundBarCountDefault: 8,
  plannerTaskRewards: {
    Easy: { diamonds: 1, gold: 0 },
    Medium: { diamonds: 2, gold: 5 },
    Hard: { diamonds: 3, gold: 10 },
    Ultra: { diamonds: 4, gold: 20 }
  }
};

// Lazy evaluation for attribute thresholds
Object.defineProperty(DEFAULT_GAME_CONFIG, 'attrLevelThresholds', {
  get: function() {
    if (!this._attrLevelThresholds) {
      this._attrLevelThresholds = this.attributeLevelThresholds();
    }
    return this._attrLevelThresholds;
  }
});

// deepMerge: safely merge user overrides into config
function deepMerge(target, source) {
  const result = { ...target };
  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
        result[key] = deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
  }
  return result;
}
