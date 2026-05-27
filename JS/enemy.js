/**
 * NEMESIS ROGUELIKE — ENEMY SYSTEM
 * Enemy creation, HP scaling, archetypes, attack resolution
 */

const ENEMY_DATABASE = {
  // Stage 1 – Forest
  'Gorilla Rebel': { hpMult: 1.0, dmgMult: 1.0, archetype: 'Brute', resist: 'Earth B', weak: 'Water D', stage: 1 },
  'Wolf': { hpMult: 1.3, dmgMult: 1.2, archetype: 'Brute', resist: 'Air C', weak: 'Earth D', stage: 1 },
  'Goblin': { hpMult: 0.3, dmgMult: 0.5, archetype: 'Mana Drain', resist: '-', weak: '-', stage: 1 },
  'Goblin Wizard': { hpMult: 1.5, dmgMult: 0.0, archetype: 'Healer', resist: 'Aether B', weak: 'Fire E', stage: 1 },
  
  // Stage 1 – Desert
  'Giant Scorpion': { hpMult: 1.2, dmgMult: 1.0, archetype: 'Brute', resist: 'Earth C', weak: 'Water D', stage: 1 },
  'Beetle': { hpMult: 3.0, dmgMult: 0.6, archetype: 'Protector', resist: 'Earth B', weak: 'Air D', stage: 1 },
  'Grave Guardian': { hpMult: 2.0, dmgMult: 2.0, archetype: 'Protector', resist: 'Aether C', weak: 'Fire E', stage: 1 },
  'Outlaw': { hpMult: 1.0, dmgMult: 1.0, archetype: 'Mana Drain', resist: '-', weak: '-', stage: 1 },
  
  // Stage 2 – Crimson Cave
  'Tarantula': { hpMult: 1.0, dmgMult: 0.7, archetype: 'Brute', resist: 'Earth C', weak: 'Water D', stage: 2 },
  'Brain Eater': { hpMult: 1.0, dmgMult: 1.5, archetype: 'Mana Drain', resist: 'Aether C', weak: 'Earth D', stage: 2 },
  'Cave Saw': { hpMult: 1.0, dmgMult: 0.7, archetype: 'Brute', resist: 'Earth B', weak: 'Water E', stage: 2 },
  
  // Stage 2 – Infected Swamp
  'Leech': { hpMult: 0.5, dmgMult: 1.0, archetype: 'Healer', resist: 'Water C', weak: 'Fire D', stage: 2 },
  'Frog': { hpMult: 0.5, dmgMult: 1.0, archetype: 'Brute', resist: 'Water D', weak: 'Earth E', stage: 2 },
  'Zombie': { hpMult: 2.0, dmgMult: 2.0, archetype: 'Brute', resist: 'Earth C', weak: 'Fire F', stage: 2 },
  
  // Stage 3 – Glacier
  'Ice Spirit': { hpMult: 0.2, dmgMult: 1.0, archetype: 'Mana Drain', resist: 'Water B', weak: 'Fire E', stage: 3 },
  'Stalker Bear': { hpMult: 1.5, dmgMult: 1.5, archetype: 'Brute', resist: 'Water C', weak: 'Earth D', stage: 3 },
  'Yeti Mage': { hpMult: 1.0, dmgMult: 1.0, archetype: 'Healer', resist: 'Water C', weak: 'Fire D', stage: 3 },
  
  // Stage 3 – Ruins
  'Stone Lizard': { hpMult: 1.0, dmgMult: 1.0, archetype: 'Brute', resist: 'Earth B', weak: 'Water D', stage: 3 },
  'Golem': { hpMult: 2.0, dmgMult: 1.0, archetype: 'Protector', resist: 'Earth B', weak: 'Air D', stage: 3 },
  'Termite': { hpMult: 0.3, dmgMult: 0.5, archetype: 'Mana Drain', resist: 'Earth C', weak: 'Fire D', stage: 3 },
  'Turret': { hpMult: 1.0, dmgMult: 2.0, archetype: 'Brute', resist: 'Earth C', weak: 'Water E', stage: 3 },
  
  // Stage 4 – Graveyard
  'Skeleton': { hpMult: 0.7, dmgMult: 0.7, archetype: 'Brute', resist: 'Aether C', weak: 'Fire D', stage: 4 },
  'Ghost': { hpMult: 2.0, dmgMult: 1.0, archetype: 'Mana Drain', resist: 'Aether B', weak: 'Earth E', stage: 4 },
  'Coffin Carrier': { hpMult: 1.0, dmgMult: 1.0, archetype: 'Healer', resist: 'Aether C', weak: 'Fire E', stage: 4 },
  'Ferryman': { hpMult: 2.0, dmgMult: 2.0, archetype: 'Brute', resist: 'Aether C', weak: 'Earth D', stage: 4 },
  
  // Stage 4 – Castle
  'Flying Skull': { hpMult: 0.7, dmgMult: 0.7, archetype: 'Brute', resist: 'Air C', weak: 'Earth D', stage: 4 },
  'Knight': { hpMult: 1.0, dmgMult: 1.0, archetype: 'Brute', resist: 'Earth B', weak: 'Air D', stage: 4 },
  'Paladin': { hpMult: 2.0, dmgMult: 1.0, archetype: 'Protector', resist: 'Earth B', weak: 'Fire E', stage: 4 },
  'Fire Mage': { hpMult: 0.6, dmgMult: 2.0, archetype: 'Brute', resist: 'Fire B', weak: 'Water E', stage: 4 },
  'Baby Dragon': { hpMult: 1.0, dmgMult: 1.0, archetype: 'Brute', resist: 'Fire C', weak: 'Water D', stage: 4 },
  
  // Stage 5 – Volcano
  'Magma Blob': { hpMult: 1.2, dmgMult: 1.0, archetype: 'Brute', resist: 'Fire B', weak: 'Water E', stage: 5 },
  'Ninja': { hpMult: 1.0, dmgMult: 1.0, archetype: 'Mana Drain', resist: 'Air C', weak: 'Earth D', stage: 5 },
  'Master': { hpMult: 1.0, dmgMult: 1.3, archetype: 'Brute', resist: 'Earth C', weak: 'Water D', stage: 5 },
  'Priest': { hpMult: 4.0, dmgMult: 0.0, archetype: 'Healer', resist: 'Fire C', weak: 'Water E', stage: 5 },
  
  // Stage 5 – Dragon Isle
  'Air Wyvern': { hpMult: 1.0, dmgMult: 1.0, archetype: 'Brute', resist: 'Air B', weak: 'Earth E, Fire E', stage: 5 },
  'Water Drake': { hpMult: 1.0, dmgMult: 1.0, archetype: 'Mana Drain', resist: 'Water B', weak: 'Fire E', stage: 5 },
  'Earth Wyrm': { hpMult: 1.0, dmgMult: 0.5, archetype: 'Protector', resist: 'Earth B', weak: 'Air E, Fire E', stage: 5 },
  'Aetherian Hydra': { hpMult: 1.0, dmgMult: 2.0, archetype: 'Brute', resist: 'Aether C', weak: 'Earth D, Fire E', stage: 5 },
  
  // Stage 6 – Golden Mountain
  'Dwarf': { hpMult: 0.6, dmgMult: 1.0, archetype: 'Mana Drain', resist: 'Aether C', weak: 'Fire D', stage: 6 },
  'Driller': { hpMult: 2.0, dmgMult: 2.0, archetype: 'Brute', resist: 'Earth B', weak: 'Water E', stage: 6 },
  'Atom': { hpMult: 3.0, dmgMult: 3.0, archetype: 'Brute', resist: 'Earth B', weak: 'Water D', stage: 6 },
  
  // Stage 6 – Abyssal Sea
  'Kraken': { hpMult: 2.0, dmgMult: 2.0, archetype: 'Brute', resist: 'Water A', weak: 'Air E', stage: 6 },
  'World Eating Snake': { hpMult: 3.0, dmgMult: 3.0, archetype: 'Brute', resist: 'Water C', weak: 'Fire D, Aether E', stage: 6 },
  'Constellation Crusher': { hpMult: 4.0, dmgMult: 4.0, archetype: 'Brute', resist: 'Water A', weak: 'Earth E, Aether E', stage: 6 },
  'Soldier': { hpMult: 1.0, dmgMult: 1.0, archetype: 'Mana Drain', resist: 'Water C', weak: 'Fire D, Aether E', stage: 6 },
  
  // Stage 7 – The Void
  'Watcher': { hpMult: 3.0, dmgMult: 3.0, archetype: 'Mana Drain', resist: 'Aether B', weak: 'Earth E', stage: 7 },
  'Chaos': { hpMult: 3.0, dmgMult: 3.0, archetype: 'Brute', resist: 'Aether B', weak: 'Fire E', stage: 7 },
  'Soul': { hpMult: 3.0, dmgMult: 3.0, archetype: 'Brute', resist: 'Aether C', weak: 'Earth D', stage: 7 }
};

class Enemy {
  constructor(name, maxAp, stage, isElite = false) {
    const baseData = ENEMY_DATABASE[name];
    if (!baseData) {
      throw new Error(`Unknown enemy: ${name}`);
    }
    
    this.id = Math.random().toString(36).substr(2, 9);
    this.name = name;
    this.archetype = baseData.archetype;
    this.resist = baseData.resist;
    this.weak = baseData.weak;
    this.isElite = isElite;
    this.consecutiveAttackDays = 0;
    // Secondary mutators (gained per-day). Persisted on the enemy instance.
    this.mutators = [];
    this.statusEffects = {};
    this.daysAlive = 0;
    
    // HP scaling: (MAX_AP × 5 × stage_HP% × enemy_HP_multiplier) / (number_of_enemies)
    // Will be set later when we know number of enemies
    const stagePercentage = DEFAULT_GAME_CONFIG.stageHpPercentages[stage - 1] / 100;
    const hpMultiplier = baseData.hpMult * (isElite ? DEFAULT_GAME_CONFIG.eliteEnemyHpMultiplier : 1);
    
    this.baseMaxHp = maxAp * 5 * stagePercentage * hpMultiplier * DEFAULT_GAME_CONFIG.enemyHpMultiplier;
    this.maxHp = this.baseMaxHp;
    this.hp = this.maxHp;
    
    // Damage multiplier
    this.dmgMult = baseData.dmgMult * (isElite ? DEFAULT_GAME_CONFIG.eliteEnemyDamageMultiplier : 1);
    
    this.isDead = false;
  }
  
  setEnemyCount(count) {
    // Adjust HP based on number of enemies in level
    this.maxHp = this.baseMaxHp / count;
    this.hp = this.maxHp;
  }
  
  takeDamage(amount) {
    const before = this.hp;
    this.hp -= amount;
    const after = this.hp;
    console.debug(`[Enemy.takeDamage] ${this.name}(${this.id}) before=${before} damage=${amount} after=${after}`);
    if (this.hp <= 0) {
      this.hp = 0;
      this.isDead = true;
      console.debug(`[Enemy.takeDamage] ${this.name}(${this.id}) died`);
    }
  }
  
  heal(amount) {
    const before = this.hp;
    this.hp = Math.min(this.hp + amount, this.maxHp);
    console.debug(`[Enemy.heal] ${this.name}(${this.id}) before=${before} heal=${amount} after=${this.hp}`);
  }
  
  getResistanceMultiplier(elementGrade) {
    const state = getGameState();
    if (!elementGrade || elementGrade === '-') return 1.0;
    
    // Parse grade (e.g., "Earth B" -> "B")
    const grade = elementGrade.trim().split(' ').pop();
    return state.config.elementGradeMultipliers[grade] || 1.0;
  }
  
  getWeaknessMultiplier(elementGrade) {
    return this.getResistanceMultiplier(elementGrade);
  }
}

class EnemyManager {
  static createEnemy(name, maxAp, stage) {
    const isElite = Math.random() < DEFAULT_GAME_CONFIG.eliteEnemyChance;
    return new Enemy(name, maxAp, stage, isElite);
  }
  
  static calculateEnemyDamage(enemy, baseN, totalAliveEnemies) {
    const state = getGameState();
    // Base damage = enemy_Dmg_Mult × (N/T) + small random variance
    // Reduce absolute variance so small N still deals predictable damage
    const randomVariance = Math.random() * 2 - 1; // ±1
    const splitDamage = totalAliveEnemies > 0 ? baseN / totalAliveEnemies : baseN;
    let damage = enemy.dmgMult * splitDamage + randomVariance;

    // If there is pending retaliation (baseN > 0) ensure at least 1 damage per attacker
    if (baseN > 0 && damage < 1) damage = 1;

    // Multiply all enemy damage by 2 (global scaling)
    const final = Math.max(0, damage) * 2;
    return final;
  }
  
  static applyBrutePassive(enemy, stage) {
    // Brute: M = 1 + stage/10, damage ×M^(consecutive days), max M^5
    if (enemy.archetype !== 'Brute') return 1.0;
    
    const M = 1 + stage / 10;
    const multiplier = Math.pow(M, Math.min(enemy.consecutiveAttackDays, 5));
    
    enemy.consecutiveAttackDays++;
    return multiplier;
  }
  
  static applyHealerPassive(enemy) {
    // Healer: heals lowest-HP ally for 20% of that ally's max HP
    if (enemy.archetype !== 'Healer') return;
    
    const state = getGameState();
    const aliveEnemies = state.stageState.enemies.filter(e => !e.isDead);
    
    if (aliveEnemies.length === 0) return;
    
    // Find lowest HP ally (excluding self)
    let lowestHpEnemy = null;
    let lowestHp = Infinity;
    
    aliveEnemies.forEach(e => {
      if (e.id !== enemy.id && e.hp < lowestHp) {
        lowestHp = e.hp;
        lowestHpEnemy = e;
      }
    });
    
    if (lowestHpEnemy) {
      const healAmt = Math.ceil(lowestHpEnemy.maxHp * 0.2);
      lowestHpEnemy.heal(lowestHpEnemy.maxHp * 0.2);
      try {
        const state = getGameState();
        state.eventBus.emit(EVENTS.ENEMY_HEALED, { enemyId: lowestHpEnemy.id, amount: healAmt, source: 'healer' });
      } catch (e) {
        // ignore
      }
    }
  }
  
  static applyManaDrainPassive(enemy, stage) {
    // Mana Drain: drains MN mana, where MN = stage + 4
    if (enemy.archetype !== 'Mana Drain') return;
    
    const state = getGameState();
    const manaDrain = stage + 4;
    
    state.drainMana(manaDrain);
  }
  
  static applyProtectorPassive(enemy) {
    // Protector: adjacent living enemies take 0.7× damage (30% reduction)
    if (enemy.archetype !== 'Protector') return;
    
    // This will be applied during damage calculation
    return 0.7;
  }
  
  static getAdjacentEnemies(enemyList, targetIndex) {
    const adjacent = [];
    
    if (targetIndex > 0) {
      adjacent.push(enemyList[targetIndex - 1]);
    }
    
    if (targetIndex < enemyList.length - 1) {
      adjacent.push(enemyList[targetIndex + 1]);
    }
    
    return adjacent.filter(e => !e.isDead);
  }
  
  static applyOverkill(damage, targetEnemy, adjacentEnemies) {
    const state = getGameState();
    const overkillThreshold = targetEnemy.maxHp * state.config.overkillThreshold;
    
    if (damage <= overkillThreshold) return 0;

    const roll = Math.random();
    const chance = state.config.overkillChance;
    console.debug(`[EnemyManager.applyOverkill] roll=${roll} chance=${chance}`);
    if (roll >= chance) return 0;
    
    const excess = damage - overkillThreshold;
    const perAdjacentEnemy = excess / adjacentEnemies.length;
    
    return perAdjacentEnemy;
  }
  
  static applyFinalStand(enemy, damage) {
    const state = getGameState();
    const finalStandThreshold = enemy.maxHp * state.config.finalStandThreshold;
    console.debug(`[EnemyManager.applyFinalStand] ${enemy.name}(${enemy.id}) damage=${damage} threshold=${finalStandThreshold}`);

    // Do not allow final-stand mechanics to apply to bosses — bosses must be defeated normally
    if (enemy.isBoss) {
      console.debug(`[EnemyManager.applyFinalStand] skipping final stand for boss ${enemy.name}(${enemy.id})`);
      return false;
    }

    if (damage >= finalStandThreshold) {
      console.debug('[EnemyManager.applyFinalStand] damage >= threshold -> no final stand');
      return false;
    }

    // 40% chance to survive with 1 HP
    const roll = Math.random();
    const chance = state.config.finalStandChance;
    console.debug(`[EnemyManager.applyFinalStand] roll=${roll} chance=${chance}`);
    if (roll < chance) {
      enemy.hp = 1;
      console.debug(`[EnemyManager.applyFinalStand] final stand TRIGGERED -> set hp=1 for ${enemy.name}(${enemy.id})`);
      return true;
    }

    console.debug('[EnemyManager.applyFinalStand] final stand did not trigger');
    return false;
  }
  
  static getGoldDrop(enemy) {
    const state = getGameState();
    const baseGold = 10;
    
    let multiplier = 1;
    if (enemy.isElite) {
      multiplier = DEFAULT_GAME_CONFIG.eliteEnemyGoldMultiplier;
    }
    
    if (state.hasBuff('Scavenger')) {
      multiplier += 5;
    }
    
    return baseGold * multiplier;
  }

  // -------------------------
  // Mutator helpers
  // -------------------------
  static pickMutatorForEnemy(enemy) {
    const state = getGameState();
    const pool = (state.config.mutators && state.config.mutators.available) ? state.config.mutators.available.slice() : ['vampiric','regenerator','rallyist','turret','swift','necromancer'];
    // Remove ones already present
    const choices = pool.filter(m => !(enemy.mutators || []).includes(m));
    if (!choices.length) return null;
    // Pick uniform random
    return choices[Math.floor(Math.random() * choices.length)];
  }

  static applyMutatorsOnAttack(enemy, damage) {
    // Called when an enemy attacks (e.g., during check-in retaliation)
    try {
      const state = getGameState();
      if (!enemy || !enemy.mutators || enemy.mutators.length === 0) return;

      // Vampiric: heal for percentage of player's max AP when this enemy deals damage
      if (enemy.mutators.includes('vampiric')) {
        const pct = state.config.mutators?.vampiric?.healPctOfPlayerMaxAp ?? 0.2;
        const heal = Math.ceil((state.playerState?.maxAp || 0) * pct);
        if (heal > 0 && typeof enemy.heal === 'function') {
          enemy.heal(heal);
          try { state.eventBus.emit(EVENTS.ENEMY_HEALED, { enemyId: enemy.id, amount: heal, source: 'mutator:vampiric' }); } catch (e) {}
        }
      }

      // Necromancer: when necromancer attacks, attempt to revive a random dead normal enemy
      if (enemy.mutators.includes('necromancer')) {
        const cfg = state.config.mutators?.necromancer || {};
        const chance = typeof cfg.reviveChance === 'number' ? cfg.reviveChance : 1.0;
        if (Math.random() < chance) {
          const deadPool = (state.stageState.enemies || []).filter(e => e && e.isDead && !e.isBoss);
          if (deadPool.length > 0) {
            const target = deadPool[Math.floor(Math.random() * deadPool.length)];
            const revivePct = cfg.revivePct ?? 0.35;
            target.isDead = false;
            target.hp = Math.ceil((target.maxHp || 1) * revivePct);
            try { state.eventBus.emit(EVENTS.ENEMY_REVIVED, { enemyId: target.id, amount: target.hp, source: 'mutator:necromancer' }); } catch (e) {}
          }
        }
      }
    } catch (e) {
      console.warn('applyMutatorsOnAttack failed', e);
    }
  }

  static applyMutatorsOnPlayerAttack(target, primaryDamage) {
    // Called when the player attacks a target. Handles turret backlash and similar reactive mutators.
    try {
      const state = getGameState();
      const enemies = state.stageState.enemies || [];

      // Turret: every enemy with turret mutator deals flat damage to player when player attacks another enemy
      let totalTurretDamage = 0;
      enemies.forEach(e => {
        if (!e || e.isDead) return;
        if (Array.isArray(e.mutators) && e.mutators.includes('turret')) {
          // Only trigger if the player attacked a different enemy
          if (e.id !== target.id) {
            totalTurretDamage += (state.config.mutators?.turret?.damage ?? 5);
          }
        }
      });

      if (totalTurretDamage > 0) {
        const capFraction = state.config.mutators?.turret?.maxBacklashFraction ?? 0.15;
        const cap = Math.max(1, Math.ceil((state.playerState?.maxHp || 1) * capFraction));
        const applied = Math.min(totalTurretDamage, cap);
        // Unblockable by default (configurable)
        if (applied > 0) {
          state.takeDamage(applied);
          try { state.eventBus.emit(EVENTS.DAMAGE_TAKEN, { amount: applied, source: 'mutator:turret', unblockable: !!state.config.mutators?.turret?.unblockable }); } catch (e) {}
        }
      }
    } catch (e) {
      console.warn('applyMutatorsOnPlayerAttack failed', e);
    }
  }

  static applyRallyistBuffToAll(rallyCount) {
    try {
      const state = getGameState();
      const enemies = state.stageState.enemies || [];
      if (!enemies.length) return;
      const multiplier = state.config.mutators?.rallyist?.multiplier ?? 2.0;
      const addPerRally = (multiplier - 1.0);
      const total = enemies.length;

      enemies.forEach(e => {
        if (!e || e.isBoss) return;
        // base per-enemy value is e.baseMaxHp / total
        const basePerEnemy = (e.baseMaxHp || e.maxHp || 1) / total;
        const newMax = Math.max(1, Math.ceil(basePerEnemy * (1 + rallyCount * addPerRally)));
        // scale current HP proportionally to new max to keep percent HP similar
        const prevMax = e.maxHp || 1;
        const prevHp = e.hp || 0;
        e.maxHp = newMax;
        if (!e.isDead) {
          e.hp = Math.min(newMax, Math.ceil((prevHp / prevMax) * newMax));
        }
      });
      try { if (typeof UIManager !== 'undefined') UIManager.refreshGameUI(); } catch (e) {}
    } catch (e) {
      console.warn('applyRallyistBuffToAll failed', e);
    }
  }
}
