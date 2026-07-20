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
  bloodOathRewardMultiplier: 1.3,
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
      skill: 'Chrono-Shift – bend time; your next 3 attacks are echoed at 50% damage at the end of the turn (cost: 50 mana)'
    },
    Brute: {
      hp: 100, mana: 300, hpRegen: 15, manaRegen: 160,
      passive: 'Berserk: deal +60% damage, take +40% damage',
      skill: 'Wrath Unleashed – +200% damage for today, but cannot dodge (cost: 50 mana)'
    },
    Ranger: {
      hp: 80, mana: 300, hpRegen: 12, manaRegen: 167,
      passive: 'Master of Arms: equip 3 weapons; gain Kill Tags every 3 kills instead of 5',
      skill: 'Storm Volley – next attack deals full damage to target + 60% to all other enemies (cost: 40 mana)'
    },
    Druid: {
      hp: 120, mana: 300, hpRegen: 20, manaRegen: 164,
      passive: 'Whisperer: pet damage ×5',
      skill: 'Nature\'s Embrace – heal 40 HP, summon shadow pet for today (2× pet attacks) (cost: 50 mana)'
    },
    Alchemist: {
      hp: 90, mana: 300, hpRegen: 10, manaRegen: 168,
      passive: 'Potion Master: consumable effects 80% stronger, last 2 extra days',
      skill: 'Unstable Concoction – reverse target\'s weaknesses/resistances permanently, block healing/mutating next check-in. If weak to current element, deal 15% max HP splash damage to adjacent enemies (cost: 50 mana)'
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
      name: 'Chrono-Shift',
      icon: '⏳',
      color: '#a855f7',
      flavorText: '"Time is a loop. Let it replay."'
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
  finalStandChance: 0.65, // 65% chance
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
      special: 'Stuns enemy on crit (skips its next attack)'
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
    'Heavy Hammer': {
      type: 'Heavy',
      icon: '🔨',
      baseApCost: 28,
      damageMultiplier: 2.2,
      critChance: 0.15,
      fireRate: 1,
      price: 5,
      special: 'removes the enemy and its adjacent enemy\'s mutations upon hit'
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
    'Heavy Hammer': '🔨',
    'Echo Bow': '🏹',
    Aegis: '🛡️'
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
      description: 'Each consecutive attack in a streak adds +5% max AP damage. Unlimited stacking. Resets on taking damage.'
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
      description: 'Critical hits against enemies below 50% HP deal an extra ×1.5 bonus damage.'
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
  
  // ============================================================
  // BOSS CONFIGURATIONS
  // ============================================================
  bosses: {
    'Demon': { element: 'Fire', resist: 'Fire B', weak: 'Water D', hpMult: 1.0, color: '#ff2222', p1Anim: 'Slam Wave', p2Anim: 'Glitch Invert', attackWeights: { bomb: 0.25, heavy: 0.20, crit: 0.20, minion: 0.10, regular: 0.10, corrosive: 0.05, heal: 0.05, null: 0.05 } },
    'Mummified Marcher': { element: 'Earth', resist: 'Earth B', weak: 'Air D', hpMult: 1.2, color: '#d4af37', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { minion: 0.35, corrosive: 0.20, heal: 0.15, heavy: 0.10, regular: 0.08, bomb: 0.05, crit: 0.04, null: 0.03 } },
    'Crimson Wizard': { element: 'Aether', resist: 'Aether B', weak: 'Fire D', hpMult: 0.8, color: '#8a2be2', p1Anim: 'Glitch Invert', p2Anim: 'Glitch Invert', attackWeights: { corrosive: 0.30, crit: 0.25, bomb: 0.20, heal: 0.10, minion: 0.05, heavy: 0.04, regular: 0.03, null: 0.03 } },
    'Worm Eater': { element: 'Water', resist: 'Water B', weak: 'Earth D', hpMult: 1.0, color: '#32cd32', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { corrosive: 0.40, heavy: 0.20, minion: 0.15, heal: 0.10, regular: 0.05, bomb: 0.04, crit: 0.03, null: 0.03 } },
    'Jade Giant': { element: 'Earth', resist: 'Earth B', weak: 'Fire D', hpMult: 1.3, color: '#00a86b', p1Anim: 'Slam Wave', p2Anim: 'Slam Wave', attackWeights: { heavy: 0.45, heal: 0.20, minion: 0.10, regular: 0.08, crit: 0.05, bomb: 0.05, corrosive: 0.04, null: 0.03 } },
    'Star Computer': { element: 'Air', resist: 'Air B', weak: 'Water D', hpMult: 0.9, color: '#00ffff', p1Anim: 'Glitch Invert', p2Anim: 'Glitch Invert', attackWeights: { bomb: 0.35, heavy: 0.25, corrosive: 0.15, minion: 0.10, crit: 0.07, regular: 0.04, heal: 0.02, null: 0.02 } },
    'Angel': { element: 'Aether', resist: 'Aether B', weak: 'Earth D', hpMult: 1.0, color: '#fdfd96', p1Anim: 'Orb Burst', p2Anim: 'Orb Burst', attackWeights: { heal: 0.35, crit: 0.25, minion: 0.15, heavy: 0.10, bomb: 0.06, regular: 0.04, corrosive: 0.03, null: 0.02 } },
    'Killer Queen': { element: 'Fire', resist: 'Fire B', weak: 'Water D', hpMult: 0.9, color: '#ff00ff', p1Anim: 'Glitch Invert', p2Anim: 'Glitch Invert', attackWeights: { bomb: 0.40, crit: 0.25, minion: 0.12, corrosive: 0.08, heavy: 0.07, regular: 0.04, heal: 0.02, null: 0.02 } },
    'Satan\'s Shark': { element: 'Fire', resist: 'Fire B', weak: 'Water D', hpMult: 1.5, color: '#dc143c', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.30, minion: 0.20, corrosive: 0.18, crit: 0.15, regular: 0.08, bomb: 0.04, heal: 0.03, null: 0.02 } },
    'Fire Turtle': { element: 'Fire', resist: 'Fire B', weak: 'Air D', hpMult: 1.4, color: '#ff4500', p1Anim: 'Slam Wave', p2Anim: 'Slam Wave', attackWeights: { heavy: 0.35, heal: 0.25, bomb: 0.20, corrosive: 0.08, regular: 0.05, minion: 0.03, crit: 0.02, null: 0.02 } },
    'Banished King': { element: 'Earth', resist: 'Earth B', weak: 'Aether D', hpMult: 1.2, color: '#4b0082', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { minion: 0.40, heavy: 0.25, corrosive: 0.12, heal: 0.08, bomb: 0.05, regular: 0.05, crit: 0.03, null: 0.02 } },
    'The Sun': { element: 'Fire', resist: 'Fire B', weak: 'Water D', hpMult: 1.1, color: '#ffd700', p1Anim: 'Glitch Invert', p2Anim: 'Glitch Invert', attackWeights: { bomb: 0.35, crit: 0.25, corrosive: 0.15, heavy: 0.10, heal: 0.06, minion: 0.04, regular: 0.03, null: 0.02 } },
    'Nemesis': { element: 'Void', resist: 'Void B', weak: 'Aether D', hpMult: 2.0, color: '#4a0e4e', p1Anim: 'Glitch Invert', p2Anim: 'Glitch Invert', attackWeights: { heavy: 0.25, bomb: 0.20, minion: 0.20, corrosive: 0.15, crit: 0.10, heal: 0.04, regular: 0.04, null: 0.02 } }
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
