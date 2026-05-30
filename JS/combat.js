/**
 * NEMESIS ROGUELIKE — COMBAT SYSTEM
 * Weapon attacks, damage formula, combo, dodge, AP scaling
 */

class WeaponAttack {
  constructor(weaponName, weaponElement = null) {
    const state = getGameState();
    const weaponData = state.config.weapons[weaponName];
    
    if (!weaponData) {
      throw new Error(`Unknown weapon: ${weaponName}`);
    }
    
    this.weaponName = weaponName;
    this.baseApCost = weaponData.baseApCost;
    this.damageMultiplier = weaponData.damageMultiplier;
    this.critChance = weaponData.critChance;
    this.special = weaponData.special;
    this.specialId = weaponData.specialId || null;
    this.comboMaxStacks = Number.isFinite(weaponData.comboMaxStacks) ? weaponData.comboMaxStacks : state.config.comboMaxStacks;
    this.weaponElement = weaponElement || null;
  }
  
  getScaledApCost() {
    const state = getGameState();
    const S = Math.max(
      state.config.attackPowerScaleMin,
      Math.min(
        state.config.attackPowerScaleMax,
        state.playerState.maxAp / state.config.attackPowerScaleBase
      )
    );
    
    return Math.round(this.baseApCost * S);
  }
  
  calculateDamage(target, isCrit = false, options = {}) {
    const state = getGameState();
    
    // Damage = (AP_cost × weapon_multiplier)
    const apCost = this.getScaledApCost();
    let damage = apCost * this.damageMultiplier;
    
    // × class_passive
    const passive = PlayerManager.getClassPassive();
    if (passive) {
      if (passive.damageDealt) damage *= passive.damageDealt;
      if (passive.damageMultiplier) damage *= passive.damageMultiplier;
    }
    
    // × (2 if critical)
    if (isCrit) {
      damage *= 2;
    }
    
    // × (1 + streak_bonus)
    const streakBonus = TaskManager.getDailyStreakDamageBonus();
    damage *= (1 + streakBonus);
    
    // × (1 + combo_bonus)
    const comboCount = Number.isFinite(options.comboCount) ? options.comboCount : (state.combatState?.currentCombo || 0);
    const comboBonus = comboCount * state.config.comboDamageBonus;
    damage *= (1 + comboBonus);
    
    // × resistance/weakness multiplier
    const weaknessMultiplier = resolveWeaponWeaknessMultiplier(target, this.weaponElement);
    if (weaknessMultiplier !== 1) {
      damage *= weaknessMultiplier;
    }
    
    // Apply buffs
    if (state.hasBuff('Sharp Edge')) {
      damage *= 1.1;
    }
    
    if (state.hasBuff('Fury')) {
      // +5% max potential AP (handled elsewhere, this is just display bonus)
    }
    
    return damage;
  }
  
  isWithinComboWindow() {
    const state = getGameState();
    const now = Date.now();
    
    return (now - state.combatState.lastAttackTime) < state.config.comboTimeWindow;
  }
}

function resolveWeaponWeaknessMultiplier(target, weaponElement) {
  if (!target || !target.weak) return 1;
  const weaknessEntries = String(target.weak).split(',').map(part => part.trim()).filter(Boolean);
  if (!weaknessEntries.length) return 1;

  if (weaponElement) {
    const matchedEntry = weaknessEntries.find(entry => entry.startsWith(weaponElement));
    return matchedEntry ? target.getWeaknessMultiplier(matchedEntry) : 1;
  }

  return target.getWeaknessMultiplier(target.weak);
}

class CombatManager {
  static calculateAttackImpactDelay(damage, target) {
    const maxHp = Math.max(1, Number(target?.maxHp || 0));
    const ratio = Math.max(0, Math.min(1, damage / maxHp));
    // Base impact delay scales with damage ratio (originally 80..320ms).
    // Double the delay globally so impacts feel slower (now 160..640ms).
    const base = Math.round(80 + (ratio * 240));
    return Math.max(160, Math.min(640, base * 2));
  }

  static previewAttackImpact(weaponIndex, targetEnemyId, attackOptions = {}) {
    const state = getGameState();
    if (!state.combatState) state.combatState = {};
    const weapon = PlayerManager.getCurrentWeapon();
    if (!weapon) {
      return { success: false, reason: 'No weapon equipped' };
    }

    const attackPlan = new WeaponAttack(weapon.name, weapon.element);
    const scaledCost = attackPlan.getScaledApCost();
    const fireRate = Math.max(1, Math.floor(Number(weapon.data?.fireRate || 1)));

    let actualCost = scaledCost;
    if (state.hasBuff('Efficiency')) {
      actualCost *= (1 - state.config.buffs['Efficiency'].effect.manaCostReduction);
    }

    if (attackPlan.isWithinComboWindow()) {
      const apCostReduction = state.combatState.currentCombo * state.config.comboApCostReduction;
      actualCost *= (1 - apCostReduction);
    }

    actualCost = Math.max(1, Math.round(actualCost));

    if (state.playerState.ap < actualCost) {
      return { success: false, reason: 'Not enough AP', apCost: actualCost };
    }

    const target = StageManager.getEnemyById(targetEnemyId);
    if (!target || target.isDead) {
      return { success: false, reason: 'Target not found or dead', apCost: actualCost };
    }

    const comboWithinWindow = attackPlan.isWithinComboWindow();
    const nextComboCount = comboWithinWindow ? Math.min(state.combatState.currentCombo + 1, attackPlan.comboMaxStacks) : 0;

    const upgrades = (typeof PlayerManager !== 'undefined' && PlayerManager.getWeaponUpgrades) ? PlayerManager.getWeaponUpgrades(weapon.name) : [];
    const critUp = (upgrades || []).reduce((s, u) => s + (u.crit || 0), 0);
    const dmgUp = (upgrades || []).reduce((s, u) => s + (u.damage || 0), 0);
    const critRoll = Number.isFinite(attackOptions.critRoll) ? attackOptions.critRoll : Math.random();
    const precisionRoll = Number.isFinite(attackOptions.precisionRoll) ? attackOptions.precisionRoll : Math.random();

    let isCrit = critRoll < (attackPlan.critChance + (PlayerManager.getClassPassive()?.critBonus || 0) + critUp);
    if (state.hasBuff('Critical Precision') && precisionRoll < 0.05) {
      isCrit = true;
    }

    let primaryDamage = attackPlan.calculateDamage(target, isCrit, { comboCount: nextComboCount });
    if (dmgUp && dmgUp > 0) {
      primaryDamage *= (1 + dmgUp);
    }

    return {
      success: true,
      weapon,
      fireRate,
      target,
      targetEnemyId: String(targetEnemyId),
      actualCost,
      attackPlan,
      comboWithinWindow,
      nextComboCount,
      dmgUp,
      primaryDamage,
      isCrit,
      critRoll,
      precisionRoll,
      impactDelayMs: this.calculateAttackImpactDelay(primaryDamage, target)
    };
  }

  static attemptAttack(weaponIndex, targetEnemyId, attackOptions = {}) {
    const state = getGameState();
    
    // Check if player has AP
    const weapon = PlayerManager.getCurrentWeapon();
    if (!weapon) return { success: false, reason: 'No weapon equipped' };
    const weaponData = weapon.data || {};
    
    const attackPlan = new WeaponAttack(weapon.name, weapon.element);
    const scaledCost = attackPlan.getScaledApCost();
    const fireRate = Math.max(1, Math.floor(Number(weaponData.fireRate || 1)));

    // Calculate AP cost with combo/buffs BEFORE spending
    let actualCost = scaledCost;
    if (state.hasBuff('Efficiency')) {
      actualCost *= (1 - state.config.buffs['Efficiency'].effect.manaCostReduction);
    }

    if (attackPlan.isWithinComboWindow()) {
      const apCostReduction = state.combatState.currentCombo * state.config.comboApCostReduction;
      actualCost *= (1 - apCostReduction);
    }

    actualCost = Math.max(1, Math.round(actualCost));

    if (state.playerState.ap < actualCost) {
      return { success: false, reason: 'Not enough AP' };
    }

    // Spend AP up-front so misses still cost AP
    state.spendAp(actualCost);

    // Get target (may be dead)
    const target = StageManager.getEnemyById(targetEnemyId);
    if (!target || target.isDead) {
      return { success: false, reason: 'Target not found or dead', apCost: actualCost };
    }

    // Check combo window and update combo state (combo affects next attack bonuses)
    if (attackPlan.isWithinComboWindow()) {
      state.incrementCombo(attackPlan.comboMaxStacks);
    } else {
      state.resetCombo();
    }

    state.combatState.lastAttackTime = Date.now();
    
    // Calculate damage
    // Incorporate weapon-specific upgrades into crit chance and damage
    const upgrades = (typeof PlayerManager !== 'undefined' && PlayerManager.getWeaponUpgrades) ? PlayerManager.getWeaponUpgrades(weapon.name) : [];
    const critUp = (upgrades || []).reduce((s, u) => s + (u.crit || 0), 0);
    const dmgUp = (upgrades || []).reduce((s, u) => s + (u.damage || 0), 0);

    const roll = Number.isFinite(attackOptions.critRoll) ? attackOptions.critRoll : Math.random();
    // total crit bonus comes from class passive + weapon upgrades
    let isCrit = roll < (attackPlan.critChance + (PlayerManager.getClassPassive()?.critBonus || 0) + critUp);

    // Add buff-based crit
    if (state.hasBuff('Critical Precision')) {
      const precisionRoll = Number.isFinite(attackOptions.precisionRoll) ? attackOptions.precisionRoll : Math.random();
      if (precisionRoll < 0.05) {
        isCrit = true;
      }
    }
    
    // Support AoE and special weapons
    const targets = [];
    const aliveList = StageManager.getAliveEnemies();

    if (weaponData.special && weaponData.special.includes('Hits ALL')) {
      targets.push(...aliveList.map(enemy => ({ enemy, damageMultiplier: 1 }))); 
    } else if (weaponData.special && weaponData.special.includes('adjacent')) {
      // Bazooka: target + up to 2 adjacent
      const all = StageManager.getAllEnemies();
      const idx = all.indexOf(target);
      targets.push({ enemy: target, damageMultiplier: 1 });
      if (idx > -1) {
        const adj = EnemyManager.getAdjacentEnemies(all, idx);
        adj.slice(0, 2).forEach(a => targets.push({ enemy: a, damageMultiplier: 1 }));
      }
    } else if (weapon.name === 'Lazer' || attackPlan.specialId === 'lazer') {
      targets.push({ enemy: target, damageMultiplier: 1 });
      const otherEnemies = aliveList.filter(enemy => enemy && enemy.id !== target.id);
      const randomEnemy = otherEnemies.length > 0
        ? otherEnemies[Math.floor(Math.random() * otherEnemies.length)]
        : target;
      targets.push({ enemy: randomEnemy, damageMultiplier: 2 });
    } else {
      targets.push({ enemy: target, damageMultiplier: 1 });
    }

    let anyKilled = false;
    let primaryDamage = 0;
    targets.forEach(entry => {
      const tgt = entry.enemy;
      if (!tgt || tgt.isDead) return;

      let damage = attackPlan.calculateDamage(tgt, isCrit, { comboCount: state.combatState.currentCombo });
      // apply weapon-specific damage upgrades (combined multiplicative)
      if (dmgUp && dmgUp > 0) {
        damage *= (1 + dmgUp);
      }
      if (entry.damageMultiplier && entry.damageMultiplier !== 1) {
        damage *= entry.damageMultiplier;
      }

      if (attackPlan.specialId === 'vine') {
        const vineState = state.systemState.vineSpellState || (state.systemState.vineSpellState = {
          dayKey: getLocalDayKey(),
          storedDamageByEnemyId: {},
          triggeredTodayByEnemyId: {}
        });
        const today = getLocalDayKey();
        if (vineState.dayKey !== today) {
          vineState.dayKey = today;
          vineState.triggeredTodayByEnemyId = {};
        }
        const enemyId = String(tgt.id);
        const stored = Number(vineState.storedDamageByEnemyId[enemyId] || 0);
        if (!vineState.triggeredTodayByEnemyId[enemyId]) {
          if (stored > 0) {
            damage += stored / 3;
          }
          vineState.triggeredTodayByEnemyId[enemyId] = true;
          vineState.storedDamageByEnemyId[enemyId] = 0;
        }
      }

      // record damage to primary target for UI feedback
      if (tgt === target) primaryDamage = damage;

      // Ensure at least 1 damage from player attacks so 1-HP enemies can be finished
      const enforcedDamage = Math.max(1, damage);
      if (enforcedDamage !== damage) console.debug(`[CombatManager] damage rounded up to ${enforcedDamage} from ${damage} for ${tgt.name}(${tgt.id})`);

      // Final Stand check (use enforcedDamage)
      const survivesFinalStand = EnemyManager.applyFinalStand(tgt, enforcedDamage);
      if (!survivesFinalStand) {
        tgt.takeDamage(enforcedDamage);

        if (attackPlan.specialId === 'vine') {
          const vineState = state.systemState.vineSpellState || (state.systemState.vineSpellState = {
            dayKey: getLocalDayKey(),
            storedDamageByEnemyId: {},
            triggeredTodayByEnemyId: {}
          });
          const enemyId = String(tgt.id);
          vineState.storedDamageByEnemyId[enemyId] = Math.max(0, Number(vineState.storedDamageByEnemyId[enemyId] || 0) + enforcedDamage);
        }

        if ((attackPlan.specialId === 'buckler' || attackPlan.specialId === 'aegis') && !tgt.isDead) {
          tgt.statusEffects = tgt.statusEffects || {};
          tgt.statusEffects.reactiveWeapon = {
            type: attackPlan.specialId,
            sourceWeapon: weapon.name,
            damageMultiplier: 0.5,
            rewardType: attackPlan.specialId === 'buckler' ? 'ap' : 'mana',
            rewardValue: attackPlan.specialId === 'buckler' ? 0.2 : 50,
            pending: true
          };
        }

        // Boss phase-2 trigger at <= 30% HP (dialogue + phase flag only)
        if (tgt.isBoss) {
          const bossData = state.stageState.bossData || {};
          bossData.hp = tgt.hp;
          bossData.maxHp = tgt.maxHp;
          bossData.isDead = !!tgt.isDead;
          state.stageState.bossData = bossData;
          if ((bossData.phase || 1) === 1 && tgt.maxHp > 0 && (tgt.hp / tgt.maxHp) <= 0.3) {
            bossData.phase = 2;
            state.stageState.bossData = bossData;
            try {
              PopupsManager.showConfiguredDialogue('bossPhase2', {
                title: `${tgt.name} - Phase 2`,
                text: `text\n${tgt.name} is enraged.`
              }, `bossPhase2:${tgt.name}`);
            } catch (e) {}
          }
        }

        if (tgt.isDead) {
          anyKilled = true;

          if (tgt.isBoss) {
            try {
              PopupsManager.showConfiguredDialogue('bossDefeat', {
                title: 'Boss Defeated',
                text: `text\n${tgt.name} has fallen.`
              }, `bossDefeat:${tgt.name}`);
            } catch (e) {}
          }

          // Award gold/kill tag per killed enemy
          state.systemState.runStats.enemiesDefeated++;
          if (tgt.isBoss) {
            state.systemState.runStats.bossesSailed = (state.systemState.runStats.bossesSailed || 0) + 1;
          }
          const goldDrop = EnemyManager.getGoldDrop(tgt);
          state.addGold(goldDrop);
          PlayerManager.incrementKillTags(weapon.name);

          // Apply kill-based buffs per kill
          if (state.hasBuff('Bloodlust')) {
            state.addHp(5);
          }

          if (state.hasBuff('Vampiric Touch')) {
            const lifeSteal = damage * 0.1;
            state.addHp(lifeSteal);
          }

          state.eventBus.emit(EVENTS.KILL_ENEMY, {
            enemyId: tgt.id,
            damage,
            isCrit,
            goldDrop
          });

          // Overkill spillover
          const all = StageManager.getAllEnemies();
          const idx = all.indexOf(tgt);
          const adj = EnemyManager.getAdjacentEnemies(all, idx);
          if (adj.length > 0) {
            const overkillDamage = EnemyManager.applyOverkill(damage, tgt, adj);
            if (overkillDamage > 0) {
                adj.forEach(a => a.takeDamage(overkillDamage));
                try {
                  // Large red OVERKILL popup centered on screen
                  FloatingDamageNumber.show(window.innerWidth/2, window.innerHeight/2 - 40, 'OVERKILL!', { color: (typeof UIManager !== 'undefined') ? UIManager.themeColor('--danger-red', '#C00707') : '#ff2222', scale: 2.2, duration: 1800, fadeDelay: 200 });
                  // small screen flash for emphasis
                  ScreenEffects.flash('rgba(255, 34, 34, 0.06)', 250);
                } catch (e) { console.warn('Failed to show OVERKILL popup', e); }
            }
          }
        }
      }
    });
    
    const damage = primaryDamage;

    state.eventBus.emit(EVENTS.ATTACK, {
      weaponName: weapon.name,
      targetId: targetEnemyId,
      damage,
      isCrit,
      apCost: actualCost,
      combo: state.combatState.currentCombo,
      fireRate
    });

    // Mutators that respond to player attacks (e.g., turret backlash)
    try {
      if (typeof EnemyManager !== 'undefined' && typeof EnemyManager.applyMutatorsOnPlayerAttack === 'function') {
        EnemyManager.applyMutatorsOnPlayerAttack(target, primaryDamage);
      }
    } catch (e) {
      console.warn('applyMutatorsOnPlayerAttack failed', e);
    }

    // Show big CRITICAL popup when a critical hit occurred
    if (isCrit) {
      try {
        FloatingDamageNumber.show(window.innerWidth/2, window.innerHeight/2 - 40, 'CRITICAL!', { color: (typeof UIManager !== 'undefined') ? UIManager.themeColor('--ap-gold', '#FFB33F') : '#ffd700', scale: 2.0, duration: 1500, fadeDelay: 120, isCrit: true });
        // Removed ScreenEffects.flash call for critical hits per user preference (no full-screen overlay)
      } catch (e) { console.warn('Failed to show CRITICAL popup', e); }
    }
    // If any enemy was killed, check for level completion and advance immediately
    try {
      if (anyKilled && StageManager.allEnemiesDead()) {
        const state = getGameState();

        // If this was the special final boss, show victory immediately
        const isFinalBoss = !!(state.stageState.bossData && state.stageState.bossData.special === 'final');
        if (isFinalBoss) {
          const stats = {
            stage: state.stageState.stage,
            level: state.stageState.level,
            enemiesDefeated: state.systemState.runStats.enemiesDefeated,
            bossesSailed: state.systemState.runStats.bossesSailed,
            goldEarned: state.systemState.runStats.totalGoldEarned
          };
          try { state.eventBus.emit(EVENTS.VICTORY, stats); } catch (e) {}
          try { PopupsManager.showVictoryScreen(stats); } catch (e) { console.warn('Failed to show victory screen', e); }
        } else {
          // Level up player and advance level/stage
          try { PlayerManager.levelUp(); } catch (e) { console.warn('levelUp failed', e); }
          const progressed = StageManager.nextLevel();

          // If progression returned false -> game complete, show victory screen
          try {
            if (progressed === false) {
              const isAtFinalStage = (state.stageState.stage >= (state.config.maxStages || 1));
              const isAtFinalLevel = (state.stageState.level >= (state.config.maxLevelPerStage || 1));
              if (isAtFinalStage && isAtFinalLevel) {
                const stats = {
                  stage: state.stageState.stage,
                  level: state.stageState.level,
                  enemiesDefeated: state.systemState.runStats.enemiesDefeated,
                  bossesSailed: state.systemState.runStats.bossesSailed,
                  goldEarned: state.systemState.runStats.totalGoldEarned
                };
                PopupsManager.showVictoryScreen(stats);
              }
            }
          } catch (e) { console.warn('Failed to show victory screen after progression', e); }

          // Show buff selection when applicable
          try {
            const leveling = PlayerManager.getLevelingProgress();
            if (leveling.hasBuffSelection) {
              PopupsManager.showBuffSelection();
            }
          } catch (e) { }
        }
      }
    } catch (e) { console.warn('Post-kill progression check failed', e); }
    return {
      success: true,
      damage,
      isCrit,
      targetDead: target.isDead,
      apCost: actualCost,
      fireRate
    };
  }
  
  static attemptDodge() {
    const state = getGameState();
    
    const dodgeCost = state.playerState.maxAp * state.config.dodgeCost;
    
    if (state.playerState.ap < dodgeCost) {
      return { success: false, reason: 'Not enough AP to dodge' };
    }
    
    state.spendAp(dodgeCost);
    state.combatState.isDodging = true;
    
    // Spinner speed doubles
    state.eventBus.emit(EVENTS.ATTACK, {
      type: 'dodge',
      apCost: dodgeCost
    });
    
    return { success: true, dodgeCost };
  }
  
  static completeDodge(selectedEnemyId) {
    const state = getGameState();
    
    const enemy = StageManager.getEnemyById(selectedEnemyId);
    if (!enemy) return false;
    
    // Next attack against player from this enemy deals 0.7× damage (handled in damage resolution)
    state.combatState.isDodging = false;
    
    return true;
  }
  
  static useSkill() {
    const state = getGameState();
    const className = state.playerState.className;
    const skillCost = state.config.skillManaCosts[className];
    
    if (!skillCost) {
      return { success: false, reason: 'Class has no mana skill' };
    }
    
    if (state.playerState.mana < skillCost) {
      return { success: false, reason: 'Not enough mana' };
    }
    
    state.drainMana(skillCost);
    
    // Skill logic handled in UI layer
    return { success: true, skillCost };
  }
  
  static applyLifesteal(damage) {
    const state = getGameState();
    
    if (state.hasBuff('Vampiric Touch')) {
      const heal = damage * state.config.buffs['Vampiric Touch'].effect.lifeStealPercentage;
      state.addHp(heal);
    }
  }
}

// Spinner/Target selection
class TargetingSystem {
  constructor(enemies) {
    this.enemies = enemies;
    this.currentIndex = 0;
    this.spinSpeed = 1; // multiplier
  }
  
  rotate(deltaTime) {
    // Rotation logic handled in UI
    this.currentIndex = (this.currentIndex + 1) % this.enemies.length;
  }
  
  getCurrentTarget() {
    const aliveEnemies = this.enemies.filter(e => !e.isDead);
    if (aliveEnemies.length === 0) return null;
    
    return aliveEnemies[this.currentIndex % aliveEnemies.length];
  }
  
  getTargetIndex() {
    return this.currentIndex;
  }
}
