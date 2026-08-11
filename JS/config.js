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
  maxStages: 11,
  maxLevelPerStage: 5,
  
  // ============================================================
  // DAILY CYCLE & CHECK-IN
  // ============================================================
  nemesisTodoGainHours: 24,
  missedDailyDamage: {
    Easy: 1,
    Medium: 1.5,
    Hard: 2,
    Ultra: 15
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
    Ultra: { gold: 75, ap: 120, diamonds: 15, attributePoints: 4 }
  },
  
  // ============================================================
  // SUBTASKS & BLOOD OATH
  // ============================================================
  subtaskMultiplier: 1.2, // multiplicative per subtask
  bloodOathRewardMultiplier: 3.0,
  bloodOathDamageMultiplier: 1.3,
  bloodOathManaCost: 10,
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
    for (let L = 2; L <= 1000; L++) {
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
      hp: 180, mana: 300, hpRegen: 20, manaRegen: 150,
      passive: 'Sturdy: all enemy damage reduced by 5',
      skill: 'Iron Bastion – next 4 attacks against you deal 0.4× damage (cost: 60 mana)'
    },
    Rogue: {
      hp: 70, mana: 300, hpRegen: 10, manaRegen: 144,
      passive: 'Quick Hands: +25% crit chance',
      skill: 'Phantom Blow – next attack deals 4× damage, ignores resistances (cost: 30 mana)'
    },
    Wizard: {
      hp: 90, mana: 300, hpRegen: 10, manaRegen: 140,
      passive: 'Elemental Attunement: attacking an enemy\'s weakness auto-crits',
      skill: 'Bypass Final Stand – bypass final stand on next attack (cost: 50 mana)'
    },
    Brute: {
      hp: 100, mana: 300, hpRegen: 15, manaRegen: 160,
      passive: 'Berserk: deal +60% damage, take +40% damage',
      skill: 'Wrath Unleashed – +200% damage for today, but cannot dodge (cost: 50 mana)'
    },
    Ranger: {
      hp: 80, mana: 300, hpRegen: 12, manaRegen: 167,
      passive: 'Master of Arms: equip 3 weapons; uses 3 Kill Tags to upgrade instead of 5',
      skill: 'Storm Volley – next attack deals full damage to target + 60% to all other enemies (cost: 40 mana)'
    },
    Druid: {
      hp: 120, mana: 300, hpRegen: 20, manaRegen: 164,
      passive: 'Whisperer: pet damage ×5',
      skill: 'Nature\'s Embrace – heal 20 HP, pet attacks +1 tomorrow (cost: 50 mana)'
    },
    Alchemist: {
      hp: 100, mana: 300, hpRegen: 15, manaRegen: 160,
      passive: 'Elemental Attunement: attacking an enemy\'s weakness auto-crits',
      skill: 'Unstable Concoction – reverse target\'s weaknesses/resistances permanently, block healing/mutating next check-in; deal 30% max HP of target as splash damage to 2 adjacent enemies (cost: 50 mana)'
    },
    Juggernaut: {
      hp: 250, mana: 300, hpRegen: 30, manaRegen: 180,
      passive: 'Immovable: multiply damage taken by 0.85',
      skill: 'Fortress – invincible for next 2 attacks + reflect 50% damage back (cost: 60 mana)'
    },
    Madman: {
      hp: 1, mana: 300, hpRegen: 0, manaRegen: 0,
      passive: 'Fragile: miss any daily → die at check-in, no death defiance',
      skill: 'Scream into the Void – gain 1 diamond. That\'s it. You\'re a Madman. (cost: 1 mana)'
    }
  },
  classPassives: {
    Knight: { damageReduction: 5 },
    Rogue: { critBonus: 0.25 },
    Wizard: null, // handled in combat
    Brute: { damageDealt: 1.6, damageTaken: 1.4 },
    Ranger: null, // handled in shop
    Druid: { petDamageMultiplier: 5 },
    Alchemist: { consumableMultiplier: 1.8 },
    Juggernaut: { damageMultiplier: 0.85 },
    Madman: null // special case
  },
  skillManaCosts: {
    Knight: 60,
    Rogue: 30,
    Wizard: 50,
    Brute: 50,
    Ranger: 40,
    Druid: 50,
    Alchemist: 50,
    Juggernaut: 60,
    Madman: 1
  },
  classSkillMeta: {
    Knight: {
      name: 'Iron Bastion',
      icon: '🛡️',
      color: '#4a9eff',
      flavorText: '"The shield becomes the world."'
    },
    Rogue: {
      name: 'Phantom Blow',
      icon: '🗡️',
      color: '#a855f7',
      flavorText: '"You never saw the blade."'
    },
    Wizard: {
      name: 'Bypass Final Stand',
      icon: '🔮',
      color: '#a855f7',
      flavorText: '"No mortal defense can withstand this spell."'
    },
    Brute: {
      name: 'Wrath Unleashed',
      icon: '💀',
      color: '#ef4444',
      flavorText: '"Pain is just fuel."'
    },
    Ranger: {
      name: 'Storm Volley',
      icon: '🏹',
      color: '#22c55e',
      flavorText: '"Every arrow finds its mark."'
    },
    Druid: {
      name: "Nature's Embrace",
      icon: '🌿',
      color: '#10b981',
      flavorText: '"The wild answers your call."'
    },
    Alchemist: {
      name: 'Unstable Concoction',
      icon: '🧪',
      color: '#84cc16',
      flavorText: '"A volatile blend of elements."'
    },
    Juggernaut: {
      name: 'Fortress',
      icon: '🏰',
      color: '#f59e0b',
      flavorText: '"I am the wall that does not break."'
    },
    Madman: {
      name: 'Scream into the Void',
      icon: '🤡',
      color: '#ec4899',
      flavorText: '"...was it worth it?"'
    }
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
  finalStandChance: 0.50, // 50% baseline chance (Grade C)
  finalStandGradeChances: {
    A: 0.80,
    B: 0.70,
    C: 0.50,
    D: 0.40,
    E: 0.30,
    F: 0.20
  },
  dodgeCost: 0.15, // 15% of MAX_AP
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
  eliteEnemyChanceByStage: [0.05, 0.10, 0.15, 0.20, 0.25, 0.30, 0.35],
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
  stageLevelBudgets: [100, 150, 200, 250],
  strongArchetypeDiscountPerLevel: 0.25,
  enemyArchetypes: {
    Fodder: {
      baseCost: 5,
      hpMult: 0.4,
      dmgMult: 0.4,
      icon: '💀',
      description: 'Low health and damage. Attacks drain MN mana (stage + 4).'
    },
    Brute: {
      baseCost: 12,
      hpMult: 0.6,
      dmgMult: 2.0,
      icon: '💥',
      description: 'High damage, low health. Devastating offensive threat.'
    },
    Support: {
      baseCost: 10,
      hpMult: 1.0,
      dmgMult: 0.0,
      icon: '💚',
      description: 'No damage, medium health. Heals lowest-HP ally for 20% max HP on attack and doubles daily mutation chance for allies.'
    },
    Protector: {
      baseCost: 12,
      hpMult: 1.5,
      dmgMult: 0.6,
      icon: '🛡️',
      description: 'High health. Grants 70% damage reduction (0.3x damage taken) to adjacent living enemies.'
    },
    Commander: {
      baseCost: 20,
      hpMult: 2.5,
      dmgMult: 2.5,
      icon: '👑',
      description: 'High health and high damage apex unit.'
    }
  },
  stageArchetypeSpecies: {
    '1A': { Fodder: 'Cinder Ash', Brute: 'Ash Shinobi', Support: 'Flame Shaman', Protector: 'Lava Guard', Commander: 'Fire Master' }, // Volcano
    '1B': { Fodder: 'Cinder Ash', Brute: 'Ash Shinobi', Support: 'Flame Shaman', Protector: 'Lava Guard', Commander: 'Fire Master' }, 
    '2A': { Fodder: 'Sand Scholar', Brute: 'Rune Guardian', Support: 'Aether Sorcerer', Protector: 'Tomb Sentry', Commander: 'Grand Preceptor' }, // Pyramids
    '2B': { Fodder: 'Sand Scholar', Brute: 'Rune Guardian', Support: 'Aether Sorcerer', Protector: 'Tomb Sentry', Commander: 'Grand Preceptor' }, 
    '3A': { Fodder: 'Marcher', Brute: 'Bone Bearer', Support: 'Dust Priest', Protector: 'Sarcophagus Guard', Commander: 'Iron Marcher' }, // Marchers
    '3B': { Fodder: 'Marcher', Brute: 'Bone Bearer', Support: 'Dust Priest', Protector: 'Sarcophagus Guard', Commander: 'Iron Marcher' }, 
    '4A': { Fodder: 'Gloom Leech', Brute: 'Shadow Crawler', Support: 'Void Sorcerer', Protector: 'Dark Sentinel', Commander: 'Abyssal Lord' }, // Chasm
    '4B': { Fodder: 'Gloom Leech', Brute: 'Shadow Crawler', Support: 'Void Sorcerer', Protector: 'Dark Sentinel', Commander: 'Abyssal Lord' }, 
    '5A': { Fodder: 'Order Novice', Brute: 'Fate Knight', Support: 'Chalice Priest', Protector: 'Shield Warden', Commander: 'Grand Paladin' }, // Kingdom
    '5B': { Fodder: 'Order Novice', Brute: 'Fate Knight', Support: 'Chalice Priest', Protector: 'Shield Warden', Commander: 'Grand Paladin' }, 
    '6A': { Fodder: 'Damned Spirit', Brute: 'Soul Collector', Support: 'Grave Monk', Protector: 'Ferry Guardian', Commander: 'Heaven Seeker' }, // Graveyard
    '6B': { Fodder: 'Damned Spirit', Brute: 'Soul Collector', Support: 'Grave Monk', Protector: 'Ferry Guardian', Commander: 'Heaven Seeker' }, 
    '7A': { Fodder: 'Hollow Body', Brute: 'Bleed Parasite', Support: 'Flesh Shaman', Protector: 'Rot Husk', Commander: 'Graft Monster' }, // Church
    '7B': { Fodder: 'Hollow Body', Brute: 'Bleed Parasite', Support: 'Flesh Shaman', Protector: 'Rot Husk', Commander: 'Graft Monster' }, 
    '8A': { Fodder: 'Plague Doctor', Brute: 'Scalpel Mutant', Support: 'Research Scholar', Protector: 'Vat Guard', Commander: 'Chief Doctor' }, // Lab
    '8B': { Fodder: 'Plague Doctor', Brute: 'Scalpel Mutant', Support: 'Research Scholar', Protector: 'Vat Guard', Commander: 'Chief Doctor' }, 
    '9A': { Fodder: 'Rot Believer', Brute: 'Corrupted Zealot', Support: 'Spore Chanter', Protector: 'Blight Shell', Commander: 'Rot Apostle' }, // Cult
    '9B': { Fodder: 'Rot Believer', Brute: 'Corrupted Zealot', Support: 'Spore Chanter', Protector: 'Blight Shell', Commander: 'Rot Apostle' }, 
    '10A': { Fodder: 'Ashen Drake', Brute: 'Sky Wyvern', Support: 'Flame Shaman', Protector: 'Iron Wyrm', Commander: 'Turtle Lord' }, // Dragon Isle
    '10B': { Fodder: 'Ashen Drake', Brute: 'Sky Wyvern', Support: 'Flame Shaman', Protector: 'Iron Wyrm', Commander: 'Turtle Lord' }, 
    '11A': { Fodder: 'Abyssal Siren', Brute: 'Sea Behemoth', Support: 'Star Weaver', Protector: 'Tide Leviathan', Commander: 'Cosmic Beast' }, // Abyssal Sea
    '11B': { Fodder: 'Abyssal Siren', Brute: 'Sea Behemoth', Support: 'Star Weaver', Protector: 'Tide Leviathan', Commander: 'Cosmic Beast' }
  },

  // ============================================================
  // ENEMY MUTATORS (secondary mutators gained per-day)
  // ============================================================
  mutatorChancePerDay: 0.3,
  maxMutatorsPerEnemy: 3,
  mutators: {
    available: ['vampiric','regenerator','rallyist','swift','necromancer'],
    vampiric: {
      // heals this enemy on dealing damage: percent of PLAYER max AP
      healPctOfPlayerMaxAp: 0.20
    },
    regenerator: {
      // percent of enemy max HP healed at check-in
      regenPct: 0.50
    },
    rallyist: {
      // multiplies damage of all enemies by 1.2x per rallyist (multiplicatively)
      multiplier: 1.2
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
      description: '+15% AP-to-damage',
      effect: { apDamageBonus: 0.15 }
    },
    'Critical Precision': {
      icon: '💀',
      description: 'Critical precision:+50% crit rate',
      effect: { critBonus: 0.50 }
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
      description: 'Fury: Multiply damage for 2x the first attack of the day',
      effect: { furyFirstAttackDouble: true }
    },
    'Iron Skin': {
      icon: '🛡️',
      description: 'iron skin: -10 enemy damage from every enemy',
      effect: { damageReduction: 10 }
    },
  
    // ============================================================
    // AUDIO / SOUND
    'Regeneration': {
      icon: '💚',
      description: 'regeneration: +20 hp daily',
      effect: { dailyHealAmount: 20 }
    },
    'Resilience': {
      icon: '💪',
      description: 'Resilience: use death defy system, gets +1 death defy every time move up a stage',
      effect: { surviveLethal: true }
    },
    'Thorns': {
      icon: '🌹',
      description: 'thorns: enemies take 1/4 maxap on attack',
      effect: { thornsMaxApFraction: 0.25 }
    },
    'Barrier': {
      icon: '🔷',
      description: '10 HP shield daily',
      effect: { dailyShield: 10 }
    },
    'Efficiency': {
      icon: '⚙️',
      description: 'mana cost -20%',
      effect: { manaCostReduction: 0.2 }
    },
    'Greed': {
      icon: '💰',
      description: '+30% gold',
      effect: { goldBonus: 0.3 }
    },
    "Tasker's Boon": {
      icon: '📋',
      description: 'multiply all todo rewards by 1.8×',
      effect: { todoRewardMultiplier: 1.8 }
    },
    'Quick Learner': {
      icon: '📚',
      description: 'quick learner: streaks increase gains by more',
      effect: { taskTierUpgrade: true }
    },
    'Pacifist': {
      icon: '☮️',
      description: 'missed dailies 60% less dmg',
      effect: { missedDailyDamageReduction: 0.4 }
    },
    'Echo Strike': {
      icon: '🔔',
      description: 'echo strike: every 3rd attack deals double damage',
      effect: { everyThirdAttackDouble: true }
    },
    'Scavenger': {
      icon: '🦅',
      description: 'enemies drop 15 gold',
      effect: { goldOnKill: 15 }
    },
    'Vampiric Touch': {
      icon: '🧛',
      description: 'vampiric touch: +10 health per kill',
      effect: { lifeStealPercentage: 0.0 }
    },
    'Lightning Speed': {
      icon: '⚡',
      description: 'Lightning speed: each perfect day increases permanently gain of every task',
      effect: { perfectDayApMultiplier: 1.1 }
    },
    'Phoenix': {
      icon: '🔥',
      description: 'phoenix: death defiance returns you to max hp',
      effect: { phoenixRevive: true }
    }
  },
  
  // ============================================================
  // WEAPONS (BASIC & EXPANDED)
  // ============================================================
  weapons: {
    // BASIC WEAPONS (6)
    'Rusty Sword': {
      type: 'Standard',
      icon: '🗡️',
      baseApCost: 15,
      damageMultiplier: 1.0,
      critChance: 0.05,
      fireRate: 1,
      price: 0, // starter
      special: 'Universal starter'
    },
    'Great Hammer': {
      type: 'Heavy',
      icon: '🔨',
      baseApCost: 28,
      damageMultiplier: 1.8,
      critChance: 0.05,
      fireRate: 1,
      price: 3,
      special: 'removes the enemy and its adjacent enemy\'s mutations upon hit'
    },
    'Dagger': {
      type: 'Light',
      icon: '🗡️',
      baseApCost: 11,
      damageMultiplier: 0.6,
      critChance: 0.5,
      fireRate: 3,
      price: 3,
      special: null
    },
    'Bomb': {
      type: 'AoE',
      icon: '💣',
      baseApCost: 28,
      damageMultiplier: 0.2,
      critChance: 0.08,
      fireRate: 1,
      price: 4,
      special: 'Hits ALL enemies'
    },
    'Buckler': {
      type: 'Shield',
      icon: '🛡️',
      baseApCost: 25,
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
      icon: '📖',
      baseApCost: 20,
      damageMultiplier: 1.1,
      critChance: 0.1,
      fireRate: 2,
      price: 3,
      special: 'Gain 20 mana when you kill an enemy'
    },
    
    // EXPANDED WEAPONS (10 more)
    'Vampire Dagger': {
      type: 'Light/Leg',
      icon: '🧛',
      baseApCost: 19,
      damageMultiplier: 0.7,
      critChance: 0.28,
      fireRate: 4,
      price: 5,
      special: '+30 HP when you kill an enemy'
    },
    'Bazooka': {
      type: 'Heavy/AoE',
      icon: '🚀',
      baseApCost: 33,
      damageMultiplier: 2.2,
      critChance: 0.0,
      fireRate: 1,
      price: 6,
      special: 'Hits target + 2 adjacent enemies'
    },
    'Uzi': {
      type: 'Light',
      icon: '🔫',
      baseApCost: 6,
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
      icon: '⚡',
      baseApCost: 50,
      damageMultiplier: 1.5,
      critChance: 0.15,
      fireRate: 1,
      price: 7,
      special: 'x0.9 universal dodge cost on attack until check in'
    },
    'Lazer': {
      type: 'Special',
      icon: '🔴',
      baseApCost: 25,
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
      icon: '🌿',
      baseApCost: 22,
      damageMultiplier: 0.5,
      critChance: 0.08,
      fireRate: 2,
      price: 5,
      specialId: 'vine',
      special: 'stores damage dealt to EVERY enemy on a day then replays 1/3 of that damage on the first hit',
      detail: 'stores damage dealt to EVERY enemy on a day then replays 1/3 of that damage on the first hit'
    },
    'Death Spell': {
      type: 'Legendary',
      icon: '💀',
      baseApCost: 150,
      damageMultiplier: Infinity, // instakill
      critChance: 0,
      fireRate: 1,
      price: 8,
      special: 'Kills enemy at ≤40% HP instantly'
    },
    'Echo Bow': {
      type: 'Light/Spec',
      icon: '🏹',
      baseApCost: 18,
      damageMultiplier: 1.0,
      critChance: 0.1,
      fireRate: 3,
      price: 5,
      special: 'every 3rd attack gives 20 mana'
    },
    'Aegis': {
      type: 'Shield/Leg',
      icon: '🛡️',
      baseApCost: 25,
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
  // ELEMENTAL WEAPON INFUSION & RUNE SYSTEM
  // ============================================================
  runes: {
    tier1: {
      'Flame Rune': { name: 'Flame Rune', icon: '🔥', description: 'Hits apply Burn (deals 10% weapon damage daily to the enemy for 3 days).' },
      'Frost Rune': { name: 'Frost Rune', icon: '❄️', description: 'Hits apply Freeze (reduces target enemy\'s next attack damage by 45%).' },
      'Storm Rune': { name: 'Storm Rune', icon: '⚡', description: 'Hits apply Shock (15% chance to stun target for 1 turn).' },
      'Venom Rune': { name: 'Venom Rune', icon: '🧪', description: 'Hits apply Poison (deals daily damage equal to 4% of player\'s max AP, ignores all defense/shields, lasts 3 days).' }
    },
    tier2: {
      'Siphon Rune': { name: 'Siphon Rune', icon: '🔮', description: 'Gain +10 Mana on scoring a critical hit.' },
      'Focus Rune': { name: 'Focus Rune', icon: '🎯', description: 'Attacking weakness reduces weapon AP cost by 20% for that attack.' },
      'Hoard Rune': { name: 'Hoard Rune', icon: '💰', description: 'Killing an enemy with this weapon awards 25% extra Gold.' }
    },
    tier3: {
      'Blast Rune': { name: 'Blast Rune', icon: '💥', description: 'Hits deal 20% splash damage to the two adjacent enemies.' },
      'Overpower Rune': { name: 'Overpower Rune', icon: '🌪️', description: 'Excess overkill damage is split with a 1.5× multiplier.' }
    }
  },
  
  // ============================================================
  // CONSUMABLES
  // ============================================================
  consumables: {
    // Defensive
    'Shield': { type: 'Defensive', effect: '-1/4 all pending damage, stackable', price: 0.3 },
    'Mega Instinct': { type: 'Defensive', effect: '-30% dodge cost', price: 0.3 },
    'Health Potion': { type: 'Restorative', effect: '+30 HP instantly', price: 1 },
    'Mana Potion': { type: 'Restorative', effect: '+50 Mana instantly', price: 1 },
    // Offensive
    'Rage Tonic': { type: 'Offensive', effect: 'next 3 attacks +5% dmg', price: 0.4 },
    'Elemental Grease': { type: 'Offensive', effect: 'enemy weakness +60%', price: 0.4 },
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
    Echo: '🔁',
    'Rusty Sword': '🗡️',
    'Great Hammer': '🔨',
    Dagger: '🗡️',
    Bomb: '💣',
    Buckler: '🛡️',
    Grimoire: '📖',
    'Vampire Dagger': '🧛',
    Bazooka: '🚀',
    Uzi: '🔫',
    'Thunder Hammer': '⚡',
    Lazer: '🔴',
    'Vine Spell': '🌿',
    'Death Spell': '💀',
    'Echo Bow': '🏹',
    Aegis: '🛡️'
  },
  weaponImages: {
    'Rusty Sword': 'assets/weapons/Untitled_Artwork-1.png',
    'Great Hammer': 'assets/weapons/Untitled_Artwork-2.png',
    'Dagger': 'assets/weapons/Untitled_Artwork-3.png',
    'Bomb': 'assets/weapons/Untitled_Artwork-4.png',
    'Buckler': 'assets/weapons/Untitled_Artwork-5.png',
    'Grimoire': 'assets/weapons/Untitled_Artwork-6.png',
    'Vampire Dagger': 'assets/weapons/Untitled_Artwork-7.png',
    'Bazooka': 'assets/weapons/Untitled_Artwork-8.png',
    'Uzi': 'assets/weapons/Untitled_Artwork-9.png',
    'Thunder Hammer': 'assets/weapons/Untitled_Artwork-10.png',
    'Lazer': 'assets/weapons/Untitled_Artwork-11.png',
    'Vine Spell': 'assets/weapons/Untitled_Artwork-12.png',
    'Death Spell': 'assets/weapons/Untitled_Artwork-13.png',
    'Echo Bow': 'assets/weapons/Untitled_Artwork-15.png',
    'Aegis': 'assets/weapons/Untitled_Artwork-14.png'
  },
  
  // ============================================================
  // SPECIAL EVENTS & TALISMANS
  // ============================================================
  specialEvents: {
    chanceNone: 0.3,
    types: ['Shrine', 'Statue', 'Sacred Tree']
  },
  talismans: {
    'Bloodpact Seal': {
      icon: '🩸',
      description: 'Every enemy kill grants +1 Max HP.'
    },
    'Starweave': {
      icon: '✨',
      description: 'After using any active skill, your next 2 attacks are guaranteed critical hits.'
    },
    'Mana Siphon': {
      icon: '💧',
      description: 'Every 50 mana spent permanently increases your maximum mana by +5 (capped at +100).'
    },
    'Wrathstone': {
      icon: '🔴',
      description: 'Being at or below 30% HP grants +40% damage bonus.'
    },
    'Echo Shard': {
      icon: '🔔',
      description: 'After using any consumable item, your next attack is echoed at 100% damage for free.'
    },
    'Verdant Heart': {
      icon: '🌿',
      description: 'Each perfect daily streak day permanently adds +3 Max HP and +5 Max Mana.'
    },
    'Predator\'s Eye': {
      icon: '👁️',
      description: 'Critical hits against enemies below 50% HP deal an extra ×2.0 bonus damage.'
    },
    'Titan\'s Mantle': {
      icon: '🏔️',
      description: 'Damage reduction stacks from all sources (buffs, class passives, shields) are doubled.'
    },
    'Void Lens': {
      icon: '🌀',
      description: 'Each time an enemy resists your attack, your next hit against that enemy deals +100% bonus damage.'
    }
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

  eldenRingDialogues: {
    // Stage 1 – Forest
    'Gorilla Rebel': { firstEncounter: "Foul intruder of the iron canopy... state thy business, or be broken upon the roots." },
    'Wolf': { firstEncounter: "A ravenous howl echoes through the mist. The red-eyed stalkers of the wood know no mercy for lost tarnished." },
    'Goblin': { firstEncounter: "A wretched creature lurking in the underbrush, clutching crude iron and festering malice." },
    'Goblin Wizard': { firstEncounter: "A squalid chanter of forbidden hexes. Its twisted staff hums with corrupted grace." },
    'Bear': { firstEncounter: "An ancient beast of muscle and scar, guardian of forgotten thickets." },
    'Lion': { firstEncounter: "Golden-maned apex predator. Its roar shakes the earth and commands the wild." },
    
    // Stage 1 – Desert
    'Marcher': { firstEncounter: "A hollowed soldier, condemned to march endlessly across sun-bleached sand and forgotten graves." },
    'Beetle': { firstEncounter: "Chitin like hardened abyssal plate. A relentless crawler of the desolate dunes." },
    'Grave Guardian': { firstEncounter: "Bound by solemn oath to protect forgotten tombs. It will not yield a single step." },
    'Drone': { firstEncounter: "An ancient, humming construct. Its lifeless eye scans for living trespassers." },
    'Raptor': { firstEncounter: "Swift predator born of prehistoric fury. Teeth like obsidian needles." },
    
    // Stage 2 – Crimson Cave
    'Tarantulator': { firstEncounter: "Eight-legged nightmare of the dark caverns. It weaves webs of blood and shadow." },
    'Brain Eaters': { firstEncounter: "Wretched entities craving mind and soul. They feast upon the memories of the fallen." },
    'Dark Sorcerer': { firstEncounter: "Master of dark weave and ruinous cantrips. Thy mind shall shatter before his gaze." },
    'Death Bringer': { firstEncounter: "Harbinger of final quietus. Wields a heavy scythe bathed in gloom." },
    
    // Stage 2 – Infected Swamp
    'Leech': { firstEncounter: "Parasite of the stagnant mire. It hungers for warm blood and vitality." },
    'Plagued': { firstEncounter: "A soul afflicted with corruptive rot. Every step spreads pestilence." },
    'Giant Frog': { firstEncounter: "Amphibian horror of the toxic deeps. Its venomous tongue snaps like a whip." },
    'Zombie': { firstEncounter: "Corpse reanimated by spite. It knows neither pain nor reprieve." },
    'Croc': { firstEncounter: "Armored terror lurking beneath murky waters, waiting with jaws agape." },
    
    // Stage 3 – Glacier
    'Ice Spirit': { firstEncounter: "Frost-bound anomaly. Its touch freezes blood and stifles courage." },
    'Yeti Mage': { firstEncounter: "Shaman of the frozen wastes. Commands blizzards and howling winds." },
    'Yeti Smasher': { firstEncounter: "Colossal beast of frost and bone. Its fists crush boulders into powder." },
    'Yeti Hunter': { firstEncounter: "Stalker of the snowdrifts. Its icy spears strike without warning." },
    
    // Stage 3 – Ruins
    'Stone Lizard': { firstEncounter: "Scales forged from basalt rock. Indifferent to blade and fire." },
    'Golem': { firstEncounter: "Ancient stone titan awakened from centuries of silence." },
    'Termite': { firstEncounter: "Devourer of wood and iron. Swarms that consume all in their path." },
    'Turret': { firstEncounter: "Automated fortress eye. Fires bolts of condensed ether." },
    
    // Stage 4 – Graveyard
    'Skeleton': { firstEncounter: "Rattling bones driven by residual malice and ancient spite." },
    'Ghost': { firstEncounter: "Spectral remnant clinging to unfulfilled vows." },
    'Coffin Carrier': { firstEncounter: "Grim bearer of eternal rest. Drags heavy caskets across desolate lands." },
    'Ferryman': { firstEncounter: "Silent rower upon abyssal waters. Collects tribute from the departed." },
    
    // Stage 4 – Castle
    'Flying Skull': { firstEncounter: "Fiery skull hovering on spectral winds, searching for victims to scorch." },
    'Knight': { firstEncounter: "Disgraced champion clad in rusted plate. Holds his blade with unwavering resolve." },
    'Paladin': { firstEncounter: "Holy defender of a ruined faith. Shield ablaze with divine vengeance." },
    'Fire Mage': { firstEncounter: "Master of pyromancy. Burns all who dare tread upon his sanctuary." },
    'Baby Dragon': { firstEncounter: "Wyrmling of dragon blood. Small in size, but fierce with flame." },
    
    // Stage 5 – Volcano
    'Magma Blob': { firstEncounter: "Seething mass of molten rock. Burns through steel and flesh alike." },
    'Ninja': { firstEncounter: "Shadow walker trained in silent lethality. Strike before thou art seen." },
    'Master': { firstEncounter: "Venerable martial lord. His strikes carry the weight of a thousand battles." },
    'Priest': { firstEncounter: "Devout servant of holy light. Heals the wicked and smites the unworthy." },
    
    // Stage 5 – Dragon Isle
    'Air Wyvern': { firstEncounter: "Ruler of the howling skies. Wings cut through gales like razor steel." },
    'Water Drake': { firstEncounter: "Serpent of the depths. Commands tides and crushing torrents." },
    'Earth Wyrm': { firstEncounter: "Subterranean leviathan. Its burrowing shakes the foundations of the earth." },
    'Aetherian Hydra': { firstEncounter: "Multi-headed terror born of cosmic ether. Cut one head, two take its place." },
    
    // Stage 6 – Golden Mountain
    'Dwarf': { firstEncounter: "Stout subterranean miner. Wields pick and hammer with brutal efficiency." },
    'Driller': { firstEncounter: "Mechanical terror of the deep mines. Its massive drill grinds through bedrock." },
    'Atom': { firstEncounter: "Concentrated ball of raw energy. Unstable and devastating upon impact." },
    
    // Stage 6 – Abyssal Sea
    'Kraken': { firstEncounter: "Abyssal sea titan. Tentacles drag entire ships into darkness." },
    'World Eating Snake': { firstEncounter: "Mythic serpent that encircles the world. Its hunger is endless." },
    'Constellation Crusher': { firstEncounter: "Celestial behemoth forged from dying stars." },
    'Megalodon': { firstEncounter: "Ancient lord of the ocean depths. Apex predator of forgotten eras." },
    
    // Stage 7 – The Void
    'Bat': { firstEncounter: "Winged horror of the abyssal cave. Attacks from shadows in blind fury." },
    'Slug': { firstEncounter: "Abyssal gastropod coated in corrosive bile." },
    'Porcupine': { firstEncounter: "Spined beast of the underworld. Launches needle-sharp quills." },
    'Phoenix': { firstEncounter: "Immortal bird of sacred flame. Reborn from ashes in blinding radiance." },

    // BOSSES
    'Demon': {
      intro: "Brave tarnished... step into the hellfire and offer thy soul unto the pyre!",
      phase2: "Thou thinkest flame can be extinguished? Behold... TRUE INFERNO!",
      defeat: "The ash... returns to dust... but the embers... shall burn forever..."
    },
    'Mummified Marcher': {
      intro: "For ten thousand years I have guarded this tomb. Thou shalt not disturb our eternal sleep!",
      phase2: "Curse thy insolence! The sands of antiquity rise to claim thee!",
      defeat: "At last... rest... takes me..."
    },
    'Crimson Wizard': {
      intro: "Ah... another seeker of forbidden arcana. Come, let thy blood ink my spellbooks.",
      phase2: "Witness the crimson weave! Reality bends to my decree!",
      defeat: "My spells... unraveled... how...?"
    },
    'Worm Eater': {
      intro: "Deep within the toxic mire, all things rot. Thou shalt be no exception.",
      phase2: "The mire hungers! Feed upon their flesh!",
      defeat: "Returned... to the muck..."
    },
    'Jade Giant': {
      intro: "I am the bedrock of the earth. Unyielding. Unbroken.",
      phase2: "Earth crumble! Mountains shatter!",
      defeat: "Even granite... breaks..."
    },
    'Star Computer': {
      intro: "CALCULATING PROBABILITY OF SURVIVAL... 0.00%. INITIATING ERADICATION.",
      phase2: "CRITICAL THREAT DETECTED. OVERCLOCKING SYSTEM CORE.",
      defeat: "SYSTEM CRITICAL FAILURE... SHUTTING DOWN..."
    },
    'Angel': {
      intro: "Humble mortal, bow before the grace of the heavens, or be cleansed in holy light.",
      phase2: "Thou hast rejected grace! Suffer the wrath of divine judgment!",
      defeat: "Forgive them... for they know not... what they have slain..."
    },
    'Killer Queen': {
      intro: "Kneel before the Queen, peasant, or face absolute destruction!",
      phase2: "How dare thou soil my throne! OFF WITH THY HEAD!",
      defeat: "My kingdom... fallen... my crown..."
    },
    "Satan's Shark": {
      intro: "Blood in the water... I smell thy fear, tarnished one!",
      phase2: "FEEDING FRENZY! DEVOUR EVERYTHING!",
      defeat: "Dragged... into the abyss..."
    },
    'Fire Turtle': {
      intro: "An ancient shell forged in volcanic heart. Thy blades shall shatter upon me!",
      phase2: "ERUPTION IMMINENT! BURN IN MOLTEN LAVA!",
      defeat: "The magma... grows cold..."
    },
    'Banished King': {
      intro: "Stripped of my crown, cast into darkness... yet here I stand, King of the Forgotten!",
      phase2: "RECALL THE ROYAL GUARD! RISE, MY LOYAL SUBJECTS!",
      defeat: "A king without a kingdom... dies alone..."
    },
    'The Sun': {
      intro: "I am the light that pierces all darkness. Canst thou withstand my radiance?",
      phase2: "SOLAR FLARE! CONSUME ALL LIFE IN THE REALM!",
      defeat: "The sun... sets at last..."
    },
    'Nemesis': {
      intro: "I am thy shadow, thy mirror, thy inevitable doom. All thy efforts end here.",
      phase2: "THOU CANST NOT ESCAPE THYSELF! WITNESS THE VOID!",
      defeat: "Until... we meet again... in the shadows..."
    }
  },
  
  // ============================================================
  // BOSS CONFIGURATIONS
  // ============================================================
          bosses: {
    'Ancient Treant': { element: 'Water', resist: 'Water B', weak: 'None', hpMult: 1.6, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Verdant Warden': { element: 'Void', resist: 'Void B', weak: 'None', hpMult: 1.6, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Ash Master': { element: 'Fire', resist: 'Fire B', weak: 'None', hpMult: 1.7, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Lava Shinobi': { element: 'Water', resist: 'Water B', weak: 'None', hpMult: 1.7, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Sun Priest': { element: 'Earth', resist: 'Earth B', weak: 'None', hpMult: 1.8, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Tomb Sentinel': { element: 'Air', resist: 'Air B', weak: 'None', hpMult: 1.8, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Empire Warlord': { element: 'Fire', resist: 'Fire B', weak: 'None', hpMult: 1.9, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Nomad King': { element: 'Void', resist: 'Void B', weak: 'None', hpMult: 1.9, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Crimson Fiend': { element: 'Void', resist: 'Void B', weak: 'None', hpMult: 2.0, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Blood Seeker': { element: 'Water', resist: 'Water B', weak: 'None', hpMult: 2.0, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Abyss Lord': { element: 'Fire', resist: 'Fire B', weak: 'None', hpMult: 2.1, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Void Channeler': { element: 'Fire', resist: 'Fire B', weak: 'None', hpMult: 2.1, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Venom Queen': { element: 'Aether', resist: 'Aether B', weak: 'None', hpMult: 2.2, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Swamp Thing': { element: 'Water', resist: 'Water B', weak: 'None', hpMult: 2.2, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Fate Sovereign': { element: 'Earth', resist: 'Earth B', weak: 'None', hpMult: 2.3, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Dawn Sentinel': { element: 'Void', resist: 'Void B', weak: 'None', hpMult: 2.3, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Reaper': { element: 'Earth', resist: 'Earth B', weak: 'None', hpMult: 2.4, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Damned General': { element: 'Water', resist: 'Water B', weak: 'None', hpMult: 2.4, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Frost Colossus': { element: 'Aether', resist: 'Aether B', weak: 'None', hpMult: 2.5, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Ice Monarch': { element: 'Water', resist: 'Water B', weak: 'None', hpMult: 2.5, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Ruin Golem': { element: 'Fire', resist: 'Fire B', weak: 'None', hpMult: 2.6, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Lost King': { element: 'Fire', resist: 'Fire B', weak: 'None', hpMult: 2.6, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Rot Pontiff': { element: 'Aether', resist: 'Aether B', weak: 'None', hpMult: 2.7, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Hollow Bishop': { element: 'Water', resist: 'Water B', weak: 'None', hpMult: 2.7, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Toxic Behemoth': { element: 'Void', resist: 'Void B', weak: 'None', hpMult: 2.8, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Plague Master': { element: 'Fire', resist: 'Fire B', weak: 'None', hpMult: 2.8, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Miasma Prophet': { element: 'Fire', resist: 'Fire B', weak: 'None', hpMult: 2.9, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Ruin Avatar': { element: 'Fire', resist: 'Fire B', weak: 'None', hpMult: 2.9, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Fire Turtle': { element: 'Air', resist: 'Air B', weak: 'None', hpMult: 3.0, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Sky Terror': { element: 'Air', resist: 'Air B', weak: 'None', hpMult: 3.0, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Golden Emperor': { element: 'Earth', resist: 'Earth B', weak: 'None', hpMult: 3.1, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Peak Sentinel': { element: 'Water', resist: 'Water B', weak: 'None', hpMult: 3.1, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Sea Behemoth': { element: 'Earth', resist: 'Earth B', weak: 'None', hpMult: 3.2, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Trench Leviathan': { element: 'Aether', resist: 'Aether B', weak: 'None', hpMult: 3.2, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Void Terror': { element: 'Water', resist: 'Water B', weak: 'None', hpMult: 3.3, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Cosmic Entity': { element: 'Water', resist: 'Water B', weak: 'None', hpMult: 3.3, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Grave Sentinel': { element: 'Earth', resist: 'Earth B', weak: 'None', hpMult: 1.4, color: '#ff6600', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.25, bomb: 0.25, minion: 0.25, regular: 0.25 } },
    'Ashen Warden': { element: 'Air', resist: 'Air B', weak: 'None', hpMult: 1.4, color: '#ff6600', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.25, bomb: 0.25, minion: 0.25, regular: 0.25 } },
    'Rune Overseer': { element: 'Void', resist: 'Void B', weak: 'None', hpMult: 1.4, color: '#ff6600', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.25, bomb: 0.25, minion: 0.25, regular: 0.25 } },
    'Void Preceptor': { element: 'Water', resist: 'Water B', weak: 'None', hpMult: 1.4, color: '#ff6600', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.25, bomb: 0.25, minion: 0.25, regular: 0.25 } },
    'Rot Apostle': { element: 'Fire', resist: 'Fire B', weak: 'None', hpMult: 1.4, color: '#ff6600', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.25, bomb: 0.25, minion: 0.25, regular: 0.25 } },
    'Blight Executioner': { element: 'Void', resist: 'Void B', weak: 'None', hpMult: 1.4, color: '#ff6600', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.25, bomb: 0.25, minion: 0.25, regular: 0.25 } },
    'Blood Harbinger': { element: 'Earth', resist: 'Earth B', weak: 'None', hpMult: 1.4, color: '#ff6600', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.25, bomb: 0.25, minion: 0.25, regular: 0.25 } },
    'Czar Vanguard': { element: 'Fire', resist: 'Fire B', weak: 'None', hpMult: 1.4, color: '#ff6600', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.25, bomb: 0.25, minion: 0.25, regular: 0.25 } },
  },
    'Verdant Warden': { element: 'Aether', resist: 'Aether B', weak: 'None', hpMult: 1.6, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Ash Master': { element: 'Void', resist: 'Void B', weak: 'None', hpMult: 1.7, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Lava Shinobi': { element: 'Water', resist: 'Water B', weak: 'None', hpMult: 1.7, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Sun Priest': { element: 'Earth', resist: 'Earth B', weak: 'None', hpMult: 1.8, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Tomb Sentinel': { element: 'Void', resist: 'Void B', weak: 'None', hpMult: 1.8, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Empire Warlord': { element: 'Air', resist: 'Air B', weak: 'None', hpMult: 1.9, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Nomad King': { element: 'Water', resist: 'Water B', weak: 'None', hpMult: 1.9, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Crimson Fiend': { element: 'Earth', resist: 'Earth B', weak: 'None', hpMult: 2.0, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Blood Seeker': { element: 'Aether', resist: 'Aether B', weak: 'None', hpMult: 2.0, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Abyss Lord': { element: 'Water', resist: 'Water B', weak: 'None', hpMult: 2.1, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Void Channeler': { element: 'Earth', resist: 'Earth B', weak: 'None', hpMult: 2.1, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Venom Queen': { element: 'Water', resist: 'Water B', weak: 'None', hpMult: 2.2, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Swamp Thing': { element: 'Void', resist: 'Void B', weak: 'None', hpMult: 2.2, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Fate Sovereign': { element: 'Water', resist: 'Water B', weak: 'None', hpMult: 2.3, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Dawn Sentinel': { element: 'Air', resist: 'Air B', weak: 'None', hpMult: 2.3, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Reaper': { element: 'Air', resist: 'Air B', weak: 'None', hpMult: 2.4, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Damned General': { element: 'Aether', resist: 'Aether B', weak: 'None', hpMult: 2.4, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Frost Colossus': { element: 'Fire', resist: 'Fire B', weak: 'None', hpMult: 2.5, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Ice Monarch': { element: 'Water', resist: 'Water B', weak: 'None', hpMult: 2.5, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Ruin Golem': { element: 'Void', resist: 'Void B', weak: 'None', hpMult: 2.6, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Lost King': { element: 'Fire', resist: 'Fire B', weak: 'None', hpMult: 2.6, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Rot Pontiff': { element: 'Aether', resist: 'Aether B', weak: 'None', hpMult: 2.7, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Hollow Bishop': { element: 'Earth', resist: 'Earth B', weak: 'None', hpMult: 2.7, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Toxic Behemoth': { element: 'Fire', resist: 'Fire B', weak: 'None', hpMult: 2.8, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Plague Master': { element: 'Fire', resist: 'Fire B', weak: 'None', hpMult: 2.8, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Miasma Prophet': { element: 'Void', resist: 'Void B', weak: 'None', hpMult: 2.9, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Ruin Avatar': { element: 'Earth', resist: 'Earth B', weak: 'None', hpMult: 2.9, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Fire Turtle': { element: 'Fire', resist: 'Fire B', weak: 'None', hpMult: 3.0, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Sky Terror': { element: 'Air', resist: 'Air B', weak: 'None', hpMult: 3.0, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Golden Emperor': { element: 'Void', resist: 'Void B', weak: 'None', hpMult: 3.1, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Peak Sentinel': { element: 'Earth', resist: 'Earth B', weak: 'None', hpMult: 3.1, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Sea Behemoth': { element: 'Void', resist: 'Void B', weak: 'None', hpMult: 3.2, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Trench Leviathan': { element: 'Fire', resist: 'Fire B', weak: 'None', hpMult: 3.2, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Void Terror': { element: 'Earth', resist: 'Earth B', weak: 'None', hpMult: 3.3, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Cosmic Entity': { element: 'Air', resist: 'Air B', weak: 'None', hpMult: 3.3, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Grave Sentinel': { element: 'Water', resist: 'Water B', weak: 'None', hpMult: 1.4, color: '#ff6600', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.25, bomb: 0.25, minion: 0.25, regular: 0.25 } },
    'Ashen Warden': { element: 'Earth', resist: 'Earth B', weak: 'None', hpMult: 1.4, color: '#ff6600', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.25, bomb: 0.25, minion: 0.25, regular: 0.25 } },
    'Rune Overseer': { element: 'Earth', resist: 'Earth B', weak: 'None', hpMult: 1.4, color: '#ff6600', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.25, bomb: 0.25, minion: 0.25, regular: 0.25 } },
    'Void Preceptor': { element: 'Void', resist: 'Void B', weak: 'None', hpMult: 1.4, color: '#ff6600', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.25, bomb: 0.25, minion: 0.25, regular: 0.25 } },
    'Rot Apostle': { element: 'Fire', resist: 'Fire B', weak: 'None', hpMult: 1.4, color: '#ff6600', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.25, bomb: 0.25, minion: 0.25, regular: 0.25 } },
    'Blight Executioner': { element: 'Air', resist: 'Air B', weak: 'None', hpMult: 1.4, color: '#ff6600', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.25, bomb: 0.25, minion: 0.25, regular: 0.25 } },
    'Blood Harbinger': { element: 'Air', resist: 'Air B', weak: 'None', hpMult: 1.4, color: '#ff6600', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.25, bomb: 0.25, minion: 0.25, regular: 0.25 } },
    'Czar Vanguard': { element: 'Air', resist: 'Air B', weak: 'None', hpMult: 1.4, color: '#ff6600', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.25, bomb: 0.25, minion: 0.25, regular: 0.25 } },
  },
    'Lava Shinobi': { element: 'Void', resist: 'Void B', weak: 'None', hpMult: 1.6, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Sun Priest': { element: 'Earth', resist: 'Earth B', weak: 'None', hpMult: 1.7, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Tomb Sentinel': { element: 'Void', resist: 'Void B', weak: 'None', hpMult: 1.7, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Empire Warlord': { element: 'Water', resist: 'Water B', weak: 'None', hpMult: 1.8, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Nomad King': { element: 'Earth', resist: 'Earth B', weak: 'None', hpMult: 1.8, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Abyss Lord': { element: 'Earth', resist: 'Earth B', weak: 'None', hpMult: 1.9, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Void Channeler': { element: 'Earth', resist: 'Earth B', weak: 'None', hpMult: 1.9, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Fate Sovereign': { element: 'Water', resist: 'Water B', weak: 'None', hpMult: 2.0, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Dawn Sentinel': { element: 'Air', resist: 'Air B', weak: 'None', hpMult: 2.0, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Reaper': { element: 'Fire', resist: 'Fire B', weak: 'None', hpMult: 2.1, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Damned General': { element: 'Earth', resist: 'Earth B', weak: 'None', hpMult: 2.1, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Rot Pontiff': { element: 'Water', resist: 'Water B', weak: 'None', hpMult: 2.2, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Hollow Bishop': { element: 'Air', resist: 'Air B', weak: 'None', hpMult: 2.2, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Toxic Behemoth': { element: 'Aether', resist: 'Aether B', weak: 'None', hpMult: 2.3, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Plague Master': { element: 'Aether', resist: 'Aether B', weak: 'None', hpMult: 2.3, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Miasma Prophet': { element: 'Earth', resist: 'Earth B', weak: 'None', hpMult: 2.4, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Ruin Avatar': { element: 'Earth', resist: 'Earth B', weak: 'None', hpMult: 2.4, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Fire Turtle': { element: 'Air', resist: 'Air B', weak: 'None', hpMult: 2.5, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Sky Terror': { element: 'Earth', resist: 'Earth B', weak: 'None', hpMult: 2.5, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Sea Behemoth': { element: 'Earth', resist: 'Earth B', weak: 'None', hpMult: 2.6, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Trench Leviathan': { element: 'Earth', resist: 'Earth B', weak: 'None', hpMult: 2.6, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } },
    'Grave Sentinel': { element: 'Aether', resist: 'Aether B', weak: 'None', hpMult: 1.4, color: '#ff6600', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.25, bomb: 0.25, minion: 0.25, regular: 0.25 } },
    'Ashen Warden': { element: 'Fire', resist: 'Fire B', weak: 'None', hpMult: 1.4, color: '#ff6600', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.25, bomb: 0.25, minion: 0.25, regular: 0.25 } },
    'Rune Overseer': { element: 'Air', resist: 'Air B', weak: 'None', hpMult: 1.4, color: '#ff6600', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.25, bomb: 0.25, minion: 0.25, regular: 0.25 } },
    'Void Preceptor': { element: 'Void', resist: 'Void B', weak: 'None', hpMult: 1.4, color: '#ff6600', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.25, bomb: 0.25, minion: 0.25, regular: 0.25 } },
    'Rot Apostle': { element: 'Earth', resist: 'Earth B', weak: 'None', hpMult: 1.4, color: '#ff6600', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.25, bomb: 0.25, minion: 0.25, regular: 0.25 } },
    'Blight Executioner': { element: 'Fire', resist: 'Fire B', weak: 'None', hpMult: 1.4, color: '#ff6600', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.25, bomb: 0.25, minion: 0.25, regular: 0.25 } },
    'Blood Harbinger': { element: 'Air', resist: 'Air B', weak: 'None', hpMult: 1.4, color: '#ff6600', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.25, bomb: 0.25, minion: 0.25, regular: 0.25 } },
    'Czar Vanguard': { element: 'Air', resist: 'Air B', weak: 'None', hpMult: 1.4, color: '#ff6600', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.25, bomb: 0.25, minion: 0.25, regular: 0.25 } },
  },

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
    Ultra: { diamonds: 15, gold: 75 }
  },
  deathEffects: {
    'Default': { name: 'Default', desc: 'Standard rainbow particle burst', tier: 'regular', previewIcon: '🌈' },
    'Confetti': { name: 'Confetti Popper', desc: 'Festive colored paper explosion with gravity fall', tier: 'regular', previewIcon: '🎉' },
    'Fire Blast': { name: 'Fire Blast', desc: 'Burst of rising flame particles fading into ash', tier: 'regular', previewIcon: '🔥' },
    'Void Slime': { name: 'Void Slime Splash', desc: 'Dark purple goo blobs splattering and dissolving', tier: 'regular', previewIcon: '😈' },
    'Glitch Matrix': { name: 'Glitch Matrix', desc: 'Matrix digital falling code grid dissolving', tier: 'premium', previewIcon: '📟' },
    'Holy Beam': { name: 'Holy Beam', desc: 'Pillar of divine golden light striking from above', tier: 'premium', previewIcon: '✨' },
    'Rainbow Pixel': { name: 'Rainbow Pixel', desc: 'Enhanced rapid pixel burst shifting neon hues', tier: 'premium', previewIcon: '👾' }
  },
  completionAnimations: {
    'Default': { name: 'Default Sparkle', desc: 'Standard pixelated sparks', tier: 'regular', previewIcon: '✨' },
    'Confetti': { name: 'Confetti Popper', desc: 'Festive colored paper explosion', tier: 'regular', previewIcon: '🎉' },
    'Gold Rush': { name: 'Gold Rush', desc: 'Rain of shiny gold coins', tier: 'regular', previewIcon: '🪙' },
    'Firework': { name: 'Firework Show', desc: 'Radial fireworks color bursts', tier: 'regular', previewIcon: '🎆' },
    'Cosmic': { name: 'Cosmic Twinkle', desc: 'Shimmering stars rising upwards', tier: 'premium', previewIcon: '⭐' },
    'Matrix': { name: 'Glitch Matrix', desc: 'Matrix falling digital green code', tier: 'premium', previewIcon: '📟' },
    'Holy Beam': { name: 'Holy Beam', desc: 'Pillar of divine golden light striking down', tier: 'premium', previewIcon: '⚡' }
  },
  streakUnlocks: {
    pet: { streak: 1, name: 'Pet' },
    consumables: { streak: 3, name: 'Consumables' },
    sacredTree: { streak: 5, name: 'Sacred Tree' },
    lockIn: { streak: 7, name: 'Lock In Feature' },
    statue: { streak: 8, name: 'Statue' },
    shrine: { streak: 9, name: 'Shrine' }
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
