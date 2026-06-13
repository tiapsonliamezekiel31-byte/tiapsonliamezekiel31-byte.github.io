/**
 * NEMESIS ROGUELIKE — STAGE & LEVEL SYSTEM
 * Stage generation, level formations, boss encounters
 */

const FORMATIONS = {
  1: {
    A: {
      1: { enemies: [{ name: 'Goblin', count: '5-7' }, { name: 'Wolf', count: '1' }, { name: 'Bear', count: '1' }, { name: 'Lion', count: '1' }] },
      2: { enemies: [{ name: 'Goblin', count: '6-8' }, { name: 'Wolf', count: '1-2' }, { name: 'Goblin Wizard', count: '1' }, { name: 'Lion', count: '1' }] },
      3: { enemies: [{ name: 'Goblin', count: '5-7' }, { name: 'Wolf', count: '1' }, { name: 'Gorilla Rebel', count: '1' }, { name: 'Bear', count: '1' }, { name: 'Goblin Wizard', count: '1-2' }] },
      4: { enemies: [{ name: 'Goblin', count: '6-8' }, { name: 'Wolf', count: '1-2' }, { name: 'Gorilla Rebel', count: '1' }, { name: 'Bear', count: '1' }, { name: 'Lion', count: '1' }, { name: 'Goblin Wizard', count: '2' }] },
      5: { isBoss: true, bossName: 'Demon' }
    },
    B: {
      1: { enemies: [{ name: 'Marcher', count: '1' }, { name: 'Beetle', count: '1' }, { name: 'Drone', count: '5-7' }, { name: 'Raptor', count: '1-2' }] },
      2: { enemies: [{ name: 'Marcher', count: '1-2' }, { name: 'Beetle', count: '1' }, { name: 'Drone', count: '4-6' }, { name: 'Raptor', count: '2' }] },
      3: { enemies: [{ name: 'Marcher', count: '2' }, { name: 'Grave Guardian', count: '1' }, { name: 'Drone', count: '4-6' }, { name: 'Raptor', count: '1-2' }] },
      4: { enemies: [{ name: 'Marcher', count: '2' }, { name: 'Grave Guardian', count: '1-2' }, { name: 'Beetle', count: '1' }, { name: 'Drone', count: '5-7' }, { name: 'Raptor', count: '1-2' }] },
      5: { isBoss: true, bossName: 'Mummified Marcher' }
    }
  },
  2: {
    A: {
      1: { enemies: [{ name: 'Brain Eaters', count: '5-7' }, { name: 'Tarantulator', count: '1' }, { name: 'Dark Sorcerer', count: '1' }, { name: 'Death Bringer', count: '1' }] },
      2: { enemies: [{ name: 'Brain Eaters', count: '5-7' }, { name: 'Tarantulator', count: '1-2' }, { name: 'Dark Sorcerer', count: '1-2' }, { name: 'Death Bringer', count: '1' }] },
      3: { enemies: [{ name: 'Brain Eaters', count: '4-6' }, { name: 'Tarantulator', count: '2' }, { name: 'Dark Sorcerer', count: '1-2' }, { name: 'Death Bringer', count: '1-2' }] },
      4: { enemies: [{ name: 'Brain Eaters', count: '5-7' }, { name: 'Tarantulator', count: '2' }, { name: 'Dark Sorcerer', count: '2' }, { name: 'Death Bringer', count: '1-2' }] },
      5: { isBoss: true, bossName: 'Crimson Wizard' }
    },
    B: {
      1: { enemies: [{ name: 'Leech', count: '2-3' }, { name: 'Giant Frog', count: '4-6' }, { name: 'Plagued', count: '1' }, { name: 'Zombie', count: '1' }] },
      2: { enemies: [{ name: 'Zombie', count: '1' }, { name: 'Leech', count: '2-3' }, { name: 'Giant Frog', count: '4-6' }, { name: 'Plagued', count: '1' }, { name: 'Croc', count: '1' }] },
      3: { enemies: [{ name: 'Zombie', count: '1-2' }, { name: 'Leech', count: '2-3' }, { name: 'Giant Frog', count: '4-6' }, { name: 'Plagued', count: '1-2' }, { name: 'Croc', count: '1' }] },
      4: { enemies: [{ name: 'Zombie', count: '2' }, { name: 'Leech', count: '3' }, { name: 'Giant Frog', count: '5-7' }, { name: 'Plagued', count: '2' }, { name: 'Croc', count: '1' }] },
      5: { isBoss: true, bossName: 'Worm Eater' }
    }
  },
  3: {
    A: {
      1: { enemies: [{ name: 'Ice Spirit', count: '5-7' }, { name: 'Yeti Smasher', count: '1' }, { name: 'Yeti Hunter', count: '1' }, { name: 'Yeti Mage', count: '1' }] },
      2: { enemies: [{ name: 'Ice Spirit', count: '5-7' }, { name: 'Yeti Smasher', count: '1' }, { name: 'Yeti Hunter', count: '1-2' }, { name: 'Yeti Mage', count: '1' }] },
      3: { enemies: [{ name: 'Ice Spirit', count: '5-7' }, { name: 'Yeti Smasher', count: '1-2' }, { name: 'Yeti Hunter', count: '1' }, { name: 'Yeti Mage', count: '1' }] },
      4: { enemies: [{ name: 'Ice Spirit', count: '6-8' }, { name: 'Yeti Smasher', count: '2' }, { name: 'Yeti Hunter', count: '1-2' }, { name: 'Yeti Mage', count: '1-2' }] },
      5: { isBoss: true, bossName: 'Jade Giant' }
    },
    B: {
      1: { enemies: [{ name: 'Stone Lizard', count: '2' }, { name: 'Termite', count: '5-7' }, { name: 'Turret', count: '1' }] },
      2: { enemies: [{ name: 'Golem', count: '1' }, { name: 'Termite', count: '5-7' }, { name: 'Stone Lizard', count: '1-2' }, { name: 'Turret', count: '1' }] },
      3: { enemies: [{ name: 'Golem', count: '1-2' }, { name: 'Termite', count: '4-6' }, { name: 'Stone Lizard', count: '1-2' }, { name: 'Turret', count: '1-2' }] },
      4: { enemies: [{ name: 'Golem', count: '2' }, { name: 'Turret', count: '2' }, { name: 'Stone Lizard', count: '1-2' }, { name: 'Termite', count: '4-6' }] },
      5: { isBoss: true, bossName: 'Star Computer' }
    }
  },
  4: {
    A: {
      1: { enemies: [{ name: 'Skeleton', count: '6-8' }, { name: 'Ghost', count: '1' }, { name: 'Coffin Carrier', count: '1' }] },
      2: { enemies: [{ name: 'Skeleton', count: '7-9' }, { name: 'Ghost', count: '1' }, { name: 'Coffin Carrier', count: '1' }, { name: 'Ferryman', count: '1' }] },
      3: { enemies: [{ name: 'Skeleton', count: '5-7' }, { name: 'Ghost', count: '1-2' }, { name: 'Coffin Carrier', count: '1' }, { name: 'Ferryman', count: '1' }] },
      4: { enemies: [{ name: 'Ghost', count: '2' }, { name: 'Ferryman', count: '1-2' }, { name: 'Skeleton', count: '5-7' }, { name: 'Coffin Carrier', count: '1-2' }] },
      5: { isBoss: true, bossName: 'Angel' }
    },
    B: {
      1: { enemies: [{ name: 'Flying Skull', count: '6-8' }, { name: 'Knight', count: '1' }, { name: 'Baby Dragon', count: '1' }] },
      2: { enemies: [{ name: 'Knight', count: '1' }, { name: 'Paladin', count: '1' }, { name: 'Fire Mage', count: '1' }, { name: 'Flying Skull', count: '6-8' }] },
      3: { enemies: [{ name: 'Knight', count: '1' }, { name: 'Paladin', count: '1' }, { name: 'Fire Mage', count: '1' }, { name: 'Baby Dragon', count: '2-3' }, { name: 'Flying Skull', count: '4-6' }] },
      4: { enemies: [{ name: 'Paladin', count: '2' }, { name: 'Fire Mage', count: '1' }, { name: 'Baby Dragon', count: '2-3' }, { name: 'Flying Skull', count: '5-7' }] },
      5: { isBoss: true, bossName: 'Killer Queen' }
    }
  },
  5: {
    A: {
      1: { enemies: [{ name: 'Magma Blob', count: '2-3' }, { name: 'Ninja', count: '5-7' }, { name: 'Master', count: '1' }] },
      2: { enemies: [{ name: 'Magma Blob', count: '2-3' }, { name: 'Ninja', count: '4-6' }, { name: 'Master', count: '2' }, { name: 'Priest', count: '1' }] },
      3: { enemies: [{ name: 'Master', count: '2-3' }, { name: 'Ninja', count: '5-7' }, { name: 'Priest', count: '1' }, { name: 'Magma Blob', count: '2-3' }] },
      4: { enemies: [{ name: 'Priest', count: '1' }, { name: 'Master', count: '2-3' }, { name: 'Magma Blob', count: '2-3' }, { name: 'Ninja', count: '3-5' }] },
      5: { isBoss: true, bossName: 'Satan\'s Shark', special: 'survival' }
    },
    B: {
      1: { enemies: [{ name: 'Air Wyvern', count: '1' }, { name: 'Water Drake', count: '1' }, { name: 'Earth Wyrm', count: '1' }, { name: 'Aetherian Hydra', count: '5-7' }] },
      2: { enemies: [{ name: 'Air Wyvern', count: '1' }, { name: 'Water Drake', count: '2' }, { name: 'Earth Wyrm', count: '1' }, { name: 'Aetherian Hydra', count: '5-7' }] },
      3: { enemies: [{ name: 'Air Wyvern', count: '2' }, { name: 'Water Drake', count: '1-2' }, { name: 'Earth Wyrm', count: '1' }, { name: 'Aetherian Hydra', count: '5-6' }] },
      4: { enemies: [{ name: 'Aetherian Hydra', count: '2' }, { name: 'Air Wyvern', count: '2' }, { name: 'Water Drake', count: '1-2' }, { name: 'Earth Wyrm', count: '5-6' }] },
      5: { isBoss: true, bossName: 'Fire Turtle', special: 'survival' }
    }
  },
  6: {
    A: {
      1: { enemies: [{ name: 'Dwarf', count: '7-9' }, { name: 'Driller', count: '1' }, { name: 'Atom', count: '1' }] },
      2: { enemies: [{ name: 'Dwarf', count: '8-10' }, { name: 'Driller', count: '1' }, { name: 'Atom', count: '1' }] },
      3: { enemies: [{ name: 'Driller', count: '2' }, { name: 'Atom', count: '1' }, { name: 'Dwarf', count: '6-8' }] },
      4: { enemies: [{ name: 'Atom', count: '2' }, { name: 'Driller', count: '1-2' }, { name: 'Dwarf', count: '6-8' }] },
      5: { isBoss: true, bossName: 'Banished King' }
    },
    B: {
      1: { enemies: [{ name: 'Megalodon', count: '6-8' }, { name: 'Kraken', count: '1' }, { name: 'World Eating Snake', count: '1' }] },
      2: { enemies: [{ name: 'Megalodon', count: '5-7' }, { name: 'Kraken', count: '1' }, { name: 'World Eating Snake', count: '1' }, { name: 'Constellation Crusher', count: '1' }] },
      3: { enemies: [{ name: 'Megalodon', count: '5-7' }, { name: 'Kraken', count: '1' }, { name: 'World Eating Snake', count: '1' }, { name: 'Constellation Crusher', count: '1' }] },
      4: { enemies: [{ name: 'Megalodon', count: '6-8' }, { name: 'Kraken', count: '1' }, { name: 'World Eating Snake', count: '1-2' }, { name: 'Constellation Crusher', count: '1-2' }] },
      5: { isBoss: true, bossName: 'The Sun' }
    }
  },
  7: {
    A: {
      1: { enemies: [{ name: 'Bat', count: '5-7' }, { name: 'Slug', count: '1' }, { name: 'Porcupine', count: '1' }, { name: 'Phoenix', count: '1' }] },
      2: { enemies: [{ name: 'Bat', count: '5-7' }, { name: 'Slug', count: '1-2' }, { name: 'Porcupine', count: '1' }, { name: 'Phoenix', count: '1' }] },
      3: { enemies: [{ name: 'Bat', count: '4-6' }, { name: 'Slug', count: '1-2' }, { name: 'Porcupine', count: '1-2' }, { name: 'Phoenix', count: '1' }] },
      4: { enemies: [{ name: 'Bat', count: '5-7' }, { name: 'Slug', count: '2' }, { name: 'Porcupine', count: '2' }, { name: 'Phoenix', count: '1-2' }] },
      5: { isBoss: true, bossName: 'Nemesis', special: 'final' }
    }
  }
};

class StageManager {
  static syncUI() {
    if (typeof UIManager !== 'undefined') {
      // Prefer the centralized refresh path so all HUD elements (including
      // the central level indicator) are kept consistent when stage changes.
      if (typeof UIManager.refreshGameUI === 'function') {
        UIManager.refreshGameUI();
      } else {
        UIManager.renderEnemies();
        UIManager.updateWeaponIcons();
        UIManager.updateDateDisplay();
      }
    }
  }

  static initializeRun(stage = 1) {
    const state = getGameState();
    
    state.stageState.stage = stage;
    state.stageState.level = 1;
    state.systemState.dialogueSeen = {};
    state.systemState.runSeenEnemies = {};
    state.systemState.gameStartTime = Date.now();
    state.systemState.runCompletionHistory = [];
    state.systemState.runStats = {
      startClass: state.systemState.runStats?.startClass || state.playerState?.className || null,
      enemiesDefeated: 0,
      bossesSailed: 0,
      totalGoldEarned: 0,
      buffsCollected: 0,
      tasksCompleted: 0,
      daysSurvived: 0
    };
    
    // Clear special event data for new run
    state.systemState.specialEvent = null;
    state.playerState.talismans = [];
    state.playerState.borrowedSkills = [];
    
    if (state.playerState.sacredTreeHpBonus) {
      state.playerState.maxHp = Math.max(state.config.baseMaxHp, state.playerState.maxHp - state.playerState.sacredTreeHpBonus);
      state.playerState.hp = Math.min(state.playerState.hp, state.playerState.maxHp);
      state.playerState.sacredTreeHpBonus = 0;
    }
    if (state.playerState.sacredTreeManaBonus) {
      state.playerState.maxMana = Math.max(state.config.baseMaxMana, state.playerState.maxMana - state.playerState.sacredTreeManaBonus);
      state.playerState.mana = Math.min(state.playerState.mana, state.playerState.maxMana);
      state.playerState.sacredTreeManaBonus = 0;
    }
    
    // Choose stage variation (handles single-variant stages like Stage 7)
    state.stageState.stageVariation = this.pickStageVariation(stage);
    
    this.generateLevel(1);
    this.syncUI();
  }
  
  static generateLevel(level) {
    const state = getGameState();
    const stage = state.stageState.stage;
    const variation = state.stageState.stageVariation;
    
    const formationData = FORMATIONS[stage][variation][level];
    if (!formationData) {
      console.error(`No formation found for Stage ${stage} Var ${variation} Level ${level}`);
      return false;
    }
    
    state.stageState.level = level;
    state.stageState.enemies = [];
    
    if (formationData.isBoss) {
      this.generateBossLevel(formationData.bossName, formationData.special);
    } else {
      this.generateNormalLevel(formationData.enemies);
    }

    this.syncUI();
    
    return true;
  }
  
  static generateNormalLevel(enemyFormation) {
    const state = getGameState();
    const stage = state.stageState.stage;
    
    state.stageState.enemies = [];
    
    // Process enemy groups
    enemyFormation.forEach(group => {
      const name = group.name;
      const countRange = group.count.split('-').map(Number);
      const count = countRange.length === 2
        ? Math.floor(Math.random() * (countRange[1] - countRange[0] + 1)) + countRange[0]
        : countRange[0];
      
      for (let i = 0; i < count; i++) {
        const enemy = EnemyManager.createEnemy(name, state.playerState.maxAp, stage);
        state.stageState.enemies.push(enemy);
      }
    });
    
    // Adjust HP based on total enemy count
    state.stageState.enemies.forEach(enemy => {
      enemy.setEnemyCount(state.stageState.enemies.length);
    });
  }
  
  static generateBossLevel(bossName, special = null) {
    const state = getGameState();
    const stage = state.stageState.stage;
    const bossCfg = (state.config.bosses && state.config.bosses[bossName]) || {};
    const hpMultiplier = bossCfg.hpMult || this.getBossHpMultiplier(bossName);
    const calculatedHp = Math.round(state.playerState.maxAp * (2.0 + stage * 0.6) * hpMultiplier);
    
    state.stageState.enemies = [];
    state.stageState.bossData = {
      name: bossName,
      hp: calculatedHp,
      maxHp: calculatedHp,
      phase: 1,
      special: special,
      daysSurvived: 0
    };
    
    // Create a boss object with the minimal methods expected by combat code
    const bossObj = {
      id: 'boss',
      name: bossName,
      isBoss: true,
      hp: calculatedHp,
      maxHp: calculatedHp,
      isDead: false,
      dmgMult: 1.0,
      consecutiveAttackDays: 0,
      statusEffects: {},
      resist: bossCfg.resist || '-',
      weak: bossCfg.weak || '-',
      takeDamage(amount) {
        this.hp -= amount;
        if (this.hp <= 0) {
          this.hp = 0;
          this.isDead = true;
        }
        if (state.stageState && state.stageState.bossData) {
          state.stageState.bossData.hp = this.hp;
          state.stageState.bossData.maxHp = this.maxHp;
          state.stageState.bossData.isDead = this.isDead;
        }
      },
      heal(amount) {
        if (this.statusEffects?.unstableConcoction?.preventHeal) {
          console.debug(`[Boss.heal] heal blocked by unstable concoction`);
          return;
        }
        this.hp = Math.min(this.maxHp, this.hp + amount);
      },
      getResistanceMultiplier(elementGrade) {
        const state = getGameState();
        if (!elementGrade || elementGrade === '-') return 1.0;
        const grade = elementGrade.trim().split(' ').pop();
        return state.config.elementGradeMultipliers[grade] || 1.0;
      },
      getWeaknessMultiplier(elementGrade) {
        return this.getResistanceMultiplier(elementGrade);
      }
    };

    state.stageState.enemies.push(bossObj);

    try {
      PopupsManager.showConfiguredDialogue('bossFirstSeen', {
        title: 'Boss Encounter',
        text: `text\n${bossName}`
      }, `bossFirstSeen:${bossName}`);
    } catch (e) {}

    this.syncUI();
  }
  
  static getBossHpMultiplier(bossName) {
    const multipliers = {
      'Demon': 1.0,
      'Mummified Marcher': 1.2,
      'Crimson Wizard': 0.8,
      'Worm Eater': 1.0,
      'Jade Giant': 1.3,
      'Star Computer': 0.9,
      'Angel': 1.0,
      'Killer Queen': 0.9,
      'Satan\'s Shark': 1.5,
      'Fire Turtle': 1.4,
      'Banished King': 1.2,
      'The Sun': 1.1,
      'Nemesis': 2.0
    };
    
    return multipliers[bossName] || 1.0;
  }
  
  static nextLevel() {
    const state = getGameState();
    
    if (state.stageState.level >= state.config.maxLevelPerStage) {
      // Stage complete
      return this.nextStage();
    }
    
    const nextLevel = state.stageState.level + 1;
    return this.generateLevel(nextLevel);
  }
  
  static nextStage() {
    const state = getGameState();
    
    if (state.stageState.stage >= state.config.maxStages) {
      // Game complete!
      state.eventBus.emit(EVENTS.VICTORY, {
        stage: state.stageState.stage,
        level: state.playerState.level
      });
      return false;
    }
    
    state.stageState.stage++;
    state.stageState.stageVariation = this.pickStageVariation(state.stageState.stage);
    state.stageState.stageClearedToday = true;
    
    state.eventBus.emit(EVENTS.STAGE_COMPLETE, {
      stage: state.stageState.stage - 1,
      nextStage: state.stageState.stage
    });
    
    return this.generateLevel(1);
  }

  static pickStageVariation(stage) {
    // If the stage has only one variant (e.g., Stage 7), force 'A'
    const stageFormations = FORMATIONS[stage];
    if (stageFormations && !stageFormations.B) return 'A';
    return Math.random() < 0.5 ? 'A' : 'B';
  }
  
  static getAllEnemies() {
    return getGameState().stageState.enemies;
  }
  
  static getAliveEnemies() {
    return getGameState().stageState.enemies.filter(e => !e.isDead);
  }
  
  static allEnemiesDead() {
    return this.getAliveEnemies().length === 0;
  }
  
  static getEnemyById(id) {
    return getGameState().stageState.enemies.find(e => e.id === id);
  }

  static rehydrateLoadedEnemies() {
    const state = getGameState();

    state.stageState.enemies = (state.stageState.enemies || []).map(enemy => {
      if (!enemy) return enemy;

      // If already has methods, keep as-is
      if (typeof enemy.takeDamage === 'function') return enemy;

      // Rebuild boss objects (saved as plain data) with expected methods
      if (enemy.isBoss) {
        const bossName = enemy.name || (state.stageState.bossData && state.stageState.bossData.name) || 'Boss';
        const bossCfg = (state.config.bosses && state.config.bosses[bossName]) || {};
        const bossObj = {
          id: enemy.id || 'boss',
          name: bossName,
          isBoss: true,
          hp: enemy.hp ?? (state.stageState.bossData && state.stageState.bossData.hp) ?? 0,
          maxHp: enemy.maxHp ?? (state.stageState.bossData && state.stageState.bossData.maxHp) ?? 0,
          isDead: !!enemy.isDead,
          dmgMult: enemy.dmgMult || 1.0,
          consecutiveAttackDays: enemy.consecutiveAttackDays || 0,
          statusEffects: enemy.statusEffects || {},
          resist: enemy.resist || bossCfg.resist || '-',
          weak: enemy.weak || bossCfg.weak || '-',
          takeDamage(amount) {
            this.hp -= amount;
            if (this.hp <= 0) { this.hp = 0; this.isDead = true; }
            if (state.stageState && state.stageState.bossData) {
              state.stageState.bossData.hp = this.hp;
              state.stageState.bossData.maxHp = this.maxHp;
              state.stageState.bossData.isDead = this.isDead;
            }
          },
          heal(amount) {
            if (this.statusEffects?.unstableConcoction?.preventHeal) {
              console.debug(`[Boss.heal] heal blocked by unstable concoction`);
              return;
            }
            this.hp = Math.min(this.maxHp, this.hp + amount);
          },
          getResistanceMultiplier(elementGrade) {
            const state = getGameState();
            if (!elementGrade || elementGrade === '-') return 1.0;
            const grade = elementGrade.trim().split(' ').pop();
            return state.config.elementGradeMultipliers[grade] || 1.0;
          },
          getWeaknessMultiplier(elementGrade) {
            return this.getResistanceMultiplier(elementGrade);
          }
        };

        return bossObj;
      }

      // Rebuild bomb objects
      if (enemy.isBomb) {
        const bombObj = {
          id: enemy.id || ('bomb_' + Math.random().toString(36).substr(2, 9)),
          name: 'Bomb',
          isBoss: false,
          isBomb: true,
          hp: enemy.hp ?? 0,
          maxHp: enemy.maxHp ?? 0,
          isDead: !!enemy.isDead,
          dmgMult: 0.0,
          consecutiveAttackDays: 0,
          statusEffects: enemy.statusEffects || {},
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
        return bombObj;
      }

      // Rebuild regular enemies
      const rebuilt = EnemyManager.createEnemy(
        enemy.name,
        state.playerState.maxAp,
        state.stageState.stage || 1,
        !!enemy.isElite
      );

      rebuilt.id = enemy.id || rebuilt.id;
      // Preserve saved HP values if present; otherwise keep computed
      rebuilt.hp = (typeof enemy.hp === 'number') ? enemy.hp : rebuilt.hp;
      rebuilt.maxHp = (typeof enemy.maxHp === 'number') ? enemy.maxHp : rebuilt.maxHp;
      rebuilt.isDead = !!enemy.isDead;
      rebuilt.consecutiveAttackDays = enemy.consecutiveAttackDays || 0;
      // Restore mutator state and days alive if saved
      rebuilt.mutators = Array.isArray(enemy.mutators) ? enemy.mutators.slice() : [];
      rebuilt.daysAlive = Number(enemy.daysAlive) || 0;
      return rebuilt;
    });



    this.syncUI();
  }
}
