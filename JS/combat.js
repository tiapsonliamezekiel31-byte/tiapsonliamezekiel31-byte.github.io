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
    
    if (this.weaponName === 'Death Spell') {
      const hpPct = (target && target.maxHp > 0) ? (target.hp / target.maxHp) : 1;
      if (hpPct <= 0.40) {
        damage = Infinity;
      } else {
        damage = 0;
      }
    }
    
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
    let elementMult = 1.0;
    const weaknessMultiplier = resolveWeaponWeaknessMultiplier(target, this.weaponElement);
    if (weaknessMultiplier !== 1) {
      elementMult *= weaknessMultiplier;
    }
    const resistanceMultiplier = resolveWeaponResistanceMultiplier(target, this.weaponElement);
    if (resistanceMultiplier !== 1) {
      const ignoresResistance = (passive && passive.ignoreResistances) || state.hasBuff('Catalyzer');
      if (!ignoresResistance) {
        elementMult *= resistanceMultiplier;
      }
    }
    damage *= elementMult;
    
    // Apply buffs
    if (state.hasBuff('Sharp Edge')) {
      const edgeBonus = state.config.buffs?.['Sharp Edge']?.effect?.apDamageBonus ?? 0.15;
      damage *= (1 + edgeBonus);
    }
    
    if (state.hasBuff('Fury')) {
      // +8% max potential AP (handled in core.js player takeDamage, this is just a comment)
    }

    // --- TALISMANS (Damage calculation) ---
    if (state.playerState.talismans?.includes('Bloodpact Seal')) {
      const bloodpactBonus = comboCount * 0.05;
      damage *= (1 + bloodpactBonus);
    }

    if (state.playerState.talismans?.includes('Wrathstone')) {
      const hpPct = state.playerState.maxHp > 0 ? state.playerState.hp / state.playerState.maxHp : 1;
      if (hpPct <= 0.3) {
        damage *= 1.4;
      }
    }

    if (isCrit && state.playerState.talismans?.includes('Predator\'s Eye')) {
      const tgtHpPct = target && target.maxHp > 0 ? target.hp / target.maxHp : 1;
      if (tgtHpPct < 0.5) {
        damage *= 1.5;
      }
    }

    if (state.playerState.talismans?.includes('Void Lens') && state.combatState.voidLensTarget === target.id) {
      damage *= 2.0;
      // We clear this flag in attemptAttack after the hit resolves.
    }
    // --------------------------------------

    // Apply active skill effects
    const skillFx = state.combatState?.skillEffects || {};

    // Brute: Wrath Unleashed - 3× damage multiplier
    if (skillFx.wrathUnleashed && skillFx.wrathDamageMultiplier) {
      damage *= skillFx.wrathDamageMultiplier;
    }

    // Rogue: Phantom Blow - 4× damage, ignore resistances (re-apply base without weakness)
    if (skillFx.phantomBlow) {
      // Override with 4× base damage (ignoring the weakness multiplier already applied)
      const baseDamage = apCost * this.damageMultiplier;
      damage = baseDamage * 4;
      // Re-apply crit and passive if applicable
      if (passive) {
        if (passive.damageDealt) damage *= passive.damageDealt;
        if (passive.damageMultiplier) damage *= passive.damageMultiplier;
      }
      if (isCrit) damage *= 2;
      // Consume the effect (one-time use)
      skillFx.phantomBlow = false;
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
  if (!target || !target.weak || !weaponElement) return 1;
  const weaknessEntries = String(target.weak).split(',').map(part => part.trim()).filter(Boolean);
  if (!weaknessEntries.length) return 1;

  const matchedEntry = weaknessEntries.find(entry => entry.startsWith(weaponElement));
  return matchedEntry ? target.getWeaknessMultiplier(matchedEntry) : 1;
}

function resolveWeaponResistanceMultiplier(target, weaponElement) {
  if (!target || !target.resist || !weaponElement) return 1;
  const resistanceEntries = String(target.resist).split(',').map(part => part.trim()).filter(Boolean);
  if (!resistanceEntries.length) return 1;

  const matchedEntry = resistanceEntries.find(entry => entry.startsWith(weaponElement));
  return matchedEntry ? target.getResistanceMultiplier(matchedEntry) : 1;
}

class CombatManager {
  static calculateAttackImpactDelay(damage, target) {
    return 0;
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

    const target = StageManager.getEnemyById(targetEnemyId);
    if (!target || target.isDead) {
      return { success: false, reason: 'Target not found or dead', apCost: Math.max(1, Math.round(actualCost)) };
    }

    const hasFocusRune = state.playerState.weaponRunes?.[weapon.name]?.tier2 === 'Focus Rune';
    if (hasFocusRune && target && weapon.element) {
      const weaknessMultiplier = resolveWeaponWeaknessMultiplier(target, weapon.element);
      if (weaknessMultiplier > 1.0) {
        actualCost *= 0.8;
      }
    }

    actualCost = Math.max(1, Math.round(actualCost));

    if (state.playerState.ap < actualCost) {
      return { success: false, reason: 'Not enough AP', apCost: actualCost };
    }

    const comboWithinWindow = attackPlan.isWithinComboWindow();
    const nextComboCount = comboWithinWindow ? Math.min(state.combatState.currentCombo + 1, attackPlan.comboMaxStacks) : 0;

    const upgrades = (typeof PlayerManager !== 'undefined' && PlayerManager.getWeaponUpgrades) ? PlayerManager.getWeaponUpgrades(weapon.name) : [];
    const critUp = (upgrades || []).reduce((s, u) => s + (u.crit || 0), 0);
    const dmgUp = (upgrades || []).reduce((s, u) => s + (u.damage || 0), 0);
    const critRoll = Number.isFinite(attackOptions.critRoll) ? attackOptions.critRoll : Math.random();
    const precisionRoll = Number.isFinite(attackOptions.precisionRoll) ? attackOptions.precisionRoll : Math.random();

    let isCrit = critRoll < (attackPlan.critChance + (PlayerManager.getClassPassive()?.critBonus || 0) + critUp);
    if (state.hasBuff('Critical Precision')) {
      const precisionBonus = state.config.buffs?.['Critical Precision']?.effect?.critBonus ?? 0.50;
      if (precisionRoll < precisionBonus) {
        isCrit = true;
      }
    }
    if (state.playerState.talismans?.includes('Starweave') && state.combatState.starweaveCritsLeft > 0) {
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

    const target = StageManager.getEnemyById(targetEnemyId);
    if (!target || target.isDead) {
      return { success: false, reason: 'Target not found or dead' };
    }

    // Calculate AP cost with combo/buffs BEFORE spending
    let actualCost = scaledCost;
    if (state.hasBuff('Efficiency')) {
      actualCost *= (1 - state.config.buffs['Efficiency'].effect.manaCostReduction);
    }

    if (attackPlan.isWithinComboWindow()) {
      const apCostReduction = state.combatState.currentCombo * state.config.comboApCostReduction;
      actualCost *= (1 - apCostReduction);
    }

    const hasFocusRune = state.playerState.weaponRunes?.[weapon.name]?.tier2 === 'Focus Rune';
    if (hasFocusRune && target && weapon.element) {
      const weaknessMultiplier = resolveWeaponWeaknessMultiplier(target, weapon.element);
      if (weaknessMultiplier > 1.0) {
        actualCost *= 0.8;
      }
    }

    actualCost = Math.max(1, Math.round(actualCost));

    if (state.playerState.ap < actualCost) {
      return { success: false, reason: 'Not enough AP' };
    }

    // Spend AP up-front so misses still cost AP
    state.spendAp(actualCost);

    if (weapon.name === 'Echo Bow') {
      state.combatState.echoBowCount = (state.combatState.echoBowCount || 0) + 1;
      if (state.combatState.echoBowCount % 3 === 0) {
        state.addMana(20);
        pushSpecialPopup('+20 MANA (Echo Bow)', '#4ea3ff');
      }
    }

    if (state.hasBuff('Echo Strike')) {
      state.combatState.echoStrikeCount = (state.combatState.echoStrikeCount || 0) + 1;
      if (state.combatState.echoStrikeCount % 3 === 0) {
        attackPlan._echoStrikeMultiplier = 2;
      }
    }

    if (state.hasBuff('Fury') && !state.playerState.furyFirstAttackUsed) {
      attackPlan._furyMultiplier = 2;
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
      const precisionBonus = state.config.buffs?.['Critical Precision']?.effect?.critBonus ?? 0.50;
      if (precisionRoll < precisionBonus) {
        isCrit = true;
      }
    }

    if (state.playerState.talismans?.includes('Starweave') && state.combatState.starweaveCritsLeft > 0) {
      isCrit = true;
      state.combatState.starweaveCritsLeft--;
    }
    
    // Support AoE and special weapons
    const targets = [];
    const aliveList = StageManager.getAliveEnemies();
    const specialPopups = [];
    const pushSpecialPopup = (text, color = '#ffd76a') => {
      specialPopups.push({ text, color });
    };

    const skillFx = state.combatState?.skillEffects || {};

    if (skillFx.stormVolley) {
      targets.push({ enemy: target, damageMultiplier: 1 });
      const otherEnemies = aliveList.filter(enemy => enemy && enemy.id !== target.id);
      targets.push(...otherEnemies.map(enemy => ({ enemy, damageMultiplier: 0.6 })));
      pushSpecialPopup('STORM VOLLEY', '#22c55e');
      delete skillFx.stormVolley;
    } else if (weaponData.special && weaponData.special.includes('Hits ALL')) {
      targets.push(...aliveList.map(enemy => ({ enemy, damageMultiplier: 1 }))); 
      pushSpecialPopup('ALL HIT', '#ffd76a');
    } else if (weaponData.special && weaponData.special.includes('adjacent')) {
      // Bazooka: target + up to 2 adjacent
      const all = StageManager.getAllEnemies();
      const idx = all.indexOf(target);
      targets.push({ enemy: target, damageMultiplier: 1 });
      if (idx > -1) {
        const adj = EnemyManager.getAdjacentEnemies(all, idx);
        adj.slice(0, 2).forEach(a => targets.push({ enemy: a, damageMultiplier: 1 }));
      }
      pushSpecialPopup('SPLASH', '#ffb33f');
    } else if (weapon.name === 'Lazer' || attackPlan.specialId === 'lazer') {
      targets.push({ enemy: target, damageMultiplier: 1 });
      const otherEnemies = aliveList.filter(enemy => enemy && enemy.id !== target.id);
      const randomEnemy = otherEnemies.length > 0
        ? otherEnemies[Math.floor(Math.random() * otherEnemies.length)]
        : target;
      targets.push({ enemy: randomEnemy, damageMultiplier: 2 });
      pushSpecialPopup('LASER SPLIT', '#4ea3ff');
    } else {
      targets.push({ enemy: target, damageMultiplier: 1 });
    }

    if (state.hasBuff('Echo Strike') && attackPlan._echoStrikeMultiplier === 2) {
      pushSpecialPopup('ECHO STRIKE x2', '#ff55ff');
    }
    if (state.hasBuff('Fury') && attackPlan._furyMultiplier === 2) {
      pushSpecialPopup('FURY x2', '#ef4444');
    }

    let anyKilled = false;
    let primaryDamage = 0;
    const hitDetails = [];
    targets.forEach(entry => {
      const tgt = entry.enemy;
      if (!tgt || tgt.isDead) return;

      const weaknessMatch = Boolean(attackPlan.weaponElement && tgt.weak && String(tgt.weak).split(',').map(p => p.trim().split(' ')[0]).includes(attackPlan.weaponElement));
      const resistanceMatch = Boolean(attackPlan.weaponElement && tgt.resist && String(tgt.resist).split(',').map(p => p.trim().split(' ')[0]).includes(attackPlan.weaponElement));

      let damage = attackPlan.calculateDamage(tgt, isCrit, { comboCount: state.combatState.currentCombo });
      // apply weapon-specific damage upgrades (combined multiplicative)
      if (dmgUp && dmgUp > 0) {
        damage *= (1 + dmgUp);
      }
      if (entry.damageMultiplier && entry.damageMultiplier !== 1) {
        damage *= entry.damageMultiplier;
      }

      if (attackPlan._echoStrikeMultiplier) {
        damage *= attackPlan._echoStrikeMultiplier;
      }
      if (attackPlan._furyMultiplier) {
        damage *= attackPlan._furyMultiplier;
      }

      if (state.playerState.talismans?.includes('Void Lens')) {
        if (resistanceMatch) {
          state.combatState.voidLensTarget = tgt.id;
        } else if (state.combatState.voidLensTarget === tgt.id) {
          state.combatState.voidLensTarget = null;
        }
      }

      if (attackPlan.weaponName === 'Death Spell' && damage === 0) {
        pushSpecialPopup('RESISTED', '#ef4444');
      }

      if (attackPlan.specialId === 'vine') {
        const vineState = state.systemState.vineSpellState || (state.systemState.vineSpellState = {
          dayKey: getLocalDayKey(),
          storedDamage: 0,
          triggeredToday: false
        });
        const today = getLocalDayKey();
        if (vineState.dayKey !== today) {
          vineState.dayKey = today;
          vineState.triggeredToday = false;
        }
        if (!vineState.triggeredToday) {
          const stored = Number(vineState.storedDamage || 0);
          if (stored > 0) {
            damage += stored / 3;
            pushSpecialPopup(`VINE +${Math.ceil(stored / 3)}`, '#30c85a');
          }
          vineState.triggeredToday = true;
          vineState.storedDamage = 0;
        }
      }

      if (weapon.name === 'Heavy Hammer' || weapon.name === 'Great Hammer') {
        if (Array.isArray(tgt.mutators) && tgt.mutators.length > 0) {
          tgt.mutators = [];
          pushSpecialPopup('MUTATIONS CLEARED', '#e11d48');
        }
        const all = StageManager.getAllEnemies();
        const idx = all.indexOf(tgt);
        if (idx > -1) {
          const adj = EnemyManager.getAdjacentEnemies(all, idx);
          adj.forEach(a => {
            if (a && Array.isArray(a.mutators) && a.mutators.length > 0) {
              a.mutators = [];
            }
          });
        }
      }

      // record damage to primary target for UI feedback
      if (tgt === target) primaryDamage = damage;

      // Ensure at least 1 damage from player attacks so 1-HP enemies can be finished,
      // except when Death Spell is resisted (which must deal exactly 0 damage)
      let enforcedDamage = Math.max(1, damage);
      if (attackPlan.weaponName === 'Death Spell' && damage === 0) {
        enforcedDamage = 0;
      }
      if (enforcedDamage !== damage && enforcedDamage > 0) {
        console.debug(`[CombatManager] damage rounded up to ${enforcedDamage} from ${damage} for ${tgt.name}(${tgt.id})`);
      }

      // Final Stand check (use enforcedDamage)
      const survivesFinalStand = EnemyManager.applyFinalStand(tgt, enforcedDamage);
      if (!survivesFinalStand) {
        tgt.takeDamage(enforcedDamage);

        hitDetails.push({
          enemyId: tgt.id,
          damage: enforcedDamage,
          isCrit: isCrit,
          isDead: tgt.isDead,
          weaknessMatch,
          resistanceMatch,
          element: attackPlan.weaponElement
        });

        // Apply Runes (Flame, Frost, Storm, Venom, Siphon, Blast)
        const hasFlameRune = state.playerState.weaponRunes?.[weapon.name]?.tier1 === 'Flame Rune';
        if (hasFlameRune && !tgt.isDead) {
          tgt.statusEffects = tgt.statusEffects || {};
          tgt.statusEffects.burn = {
            daysRemaining: 3,
            damagePerDay: Math.max(1, Math.round(enforcedDamage * 0.1))
          };
          pushSpecialPopup('BURN APPLIED', '#ff9a2e');
        }

        const hasFrostRune = state.playerState.weaponRunes?.[weapon.name]?.tier1 === 'Frost Rune';
        if (hasFrostRune && !tgt.isDead) {
          tgt.statusEffects = tgt.statusEffects || {};
          tgt.statusEffects.freeze = {
            damageMultiplier: 0.55
          };
          pushSpecialPopup('FROST APPLIED', '#4ea3ff');
        }

        const hasStormRune = state.playerState.weaponRunes?.[weapon.name]?.tier1 === 'Storm Rune';
        if (hasStormRune && !tgt.isDead && Math.random() < 0.15) {
          tgt.statusEffects = tgt.statusEffects || {};
          tgt.statusEffects.stunned = true;
          pushSpecialPopup('STUNNED', '#ffd76a');
        }

        const hasVenomRune = state.playerState.weaponRunes?.[weapon.name]?.tier1 === 'Venom Rune';
        if (hasVenomRune && !tgt.isDead) {
          tgt.statusEffects = tgt.statusEffects || {};
          tgt.statusEffects.poison = {
            daysRemaining: 3,
            damagePerDay: Math.max(1, Math.round(state.playerState.maxAp * 0.04))
          };
          pushSpecialPopup('POISON APPLIED', '#84cc16');
        }

        const hasSiphonRune = state.playerState.weaponRunes?.[weapon.name]?.tier2 === 'Siphon Rune';
        if (isCrit && hasSiphonRune) {
          state.addMana(10);
          pushSpecialPopup('+10 MANA', '#4ea3ff');
        }

        const hasBlastRune = state.playerState.weaponRunes?.[weapon.name]?.tier3 === 'Blast Rune';
        if (hasBlastRune && tgt === target) {
          const all = StageManager.getAllEnemies();
          const idx = all.indexOf(tgt);
          if (idx > -1) {
            const adj = EnemyManager.getAdjacentEnemies(all, idx);
            adj.forEach(a => {
              if (a && !a.isDead) {
                const splashDmg = Math.max(1, Math.round(enforcedDamage * 0.2));
                a.takeDamage(splashDmg);

                hitDetails.push({
                  enemyId: a.id,
                  damage: splashDmg,
                  isCrit: false,
                  isDead: a.isDead,
                  weaknessMatch: false,
                  resistanceMatch: false,
                  element: attackPlan.weaponElement
                });

                try {
                  const targetCard = document.querySelector(`.enemy-card[data-enemy-id="${a.id}"]`);
                  let tx = window.innerWidth / 2;
                  let ty = window.innerHeight / 2;
                  if (targetCard) {
                    const rect = targetCard.getBoundingClientRect();
                    tx = rect.left + rect.width / 2;
                    ty = rect.top + rect.height / 2;
                  }
                  FloatingDamageNumber.show(tx, ty, `${splashDmg}`, { color: '#ffb33f', scale: 0.8 });
                } catch (e) {}

                if (a.isDead) {
                  anyKilled = true;
                  state.systemState.runStats.enemiesDefeated++;
                  const hasHoardRune = state.playerState.weaponRunes?.[weapon.name]?.tier2 === 'Hoard Rune';
                  const splashGold = EnemyManager.getGoldDrop(a);
                  state.addGold(hasHoardRune ? Math.round(splashGold * 1.25) : splashGold);
                  PlayerManager.incrementKillTags(weapon.name);
                  if (state.hasBuff('Bloodlust')) state.addHp(5);
                  if (state.hasBuff('Vampiric Touch')) state.addHp(10);
                  
                  state.eventBus.emit(EVENTS.KILL_ENEMY, {
                    enemyId: a.id,
                    damage: splashDmg,
                    isCrit: false,
                    goldDrop: splashGold
                  });
                }
              }
            });
            pushSpecialPopup('BLAST SPLASH', '#ffb33f');
          }
        }

        const vineState = state.systemState.vineSpellState || (state.systemState.vineSpellState = {
          dayKey: getLocalDayKey(),
          storedDamage: 0,
          triggeredToday: false
        });
        vineState.storedDamage = (vineState.storedDamage || 0) + enforcedDamage;

        if ((attackPlan.specialId === 'buckler' || attackPlan.specialId === 'aegis') && !tgt.isDead && tgt === target) {
          tgt.statusEffects = tgt.statusEffects || {};
          tgt.statusEffects.reactiveWeapon = {
            type: attackPlan.specialId,
            sourceWeapon: weapon.name,
            damageMultiplier: 0.5,
            rewardType: attackPlan.specialId === 'buckler' ? 'ap' : 'mana',
            rewardValue: attackPlan.specialId === 'buckler' ? 0.2 : 50,
            pending: true
          };
          pushSpecialPopup(attackPlan.specialId === 'buckler' ? 'BUCKLER READY' : 'AEGIS READY', attackPlan.specialId === 'buckler' ? '#ffd700' : '#4ea3ff');
        }

        if (isCrit && weapon.name === 'Thunder Hammer' && !tgt.isDead) {
          tgt.statusEffects = tgt.statusEffects || {};
          tgt.statusEffects.stunned = true;
          pushSpecialPopup('STUNNED', '#facc15');
        }

        // Boss phase-2 trigger at <= 40% HP (dialogue + phase flag only)
        if (tgt.isBoss) {
          const bossData = state.stageState.bossData || {};
          bossData.hp = tgt.hp;
          bossData.maxHp = tgt.maxHp;
          bossData.isDead = !!tgt.isDead;
          state.stageState.bossData = bossData;
          if ((bossData.phase || 1) === 1 && tgt.maxHp > 0 && (tgt.hp / tgt.maxHp) <= 0.4) {
            bossData.phase = 2;
            state.stageState.bossData = bossData;
            try {
              const bossCfg = (state.config.bosses && state.config.bosses[tgt.name]) || {};
              if (typeof RetroGlitchInvertAnimation !== 'undefined') {
                RetroGlitchInvertAnimation.play(bossCfg.color || '#ff2222');
              }
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
          let goldDrop = EnemyManager.getGoldDrop(tgt);
          const hasHoardRune = state.playerState.weaponRunes?.[weapon.name]?.tier2 === 'Hoard Rune';
          if (hasHoardRune) {
            goldDrop = Math.round(goldDrop * 1.25);
          }
          state.addGold(goldDrop);
          PlayerManager.incrementKillTags(weapon.name);

          // Roll for lootbox key drop (15% chance)
          if (Math.random() < 0.15) {
            state.addLootboxKeys(1);
            try {
              if (window.SoundManager) {
                SoundManager.play('coin');
              }
            } catch (e) {}
            try {
              if (typeof FloatingDamageNumber !== 'undefined' && typeof FloatingDamageNumber.show === 'function') {
                const targetCard = document.querySelector(`.enemy-card[data-enemy-id="${tgt.id}"]`);
                let tx = window.innerWidth / 2;
                let ty = window.innerHeight / 2;
                if (targetCard) {
                  const rect = targetCard.getBoundingClientRect();
                  tx = rect.left + rect.width / 2;
                  ty = rect.top + rect.height / 2;
                }
                FloatingDamageNumber.show(tx, ty - 60, '+1 Lootbox Key 🔑', {
                  color: '#ffb33f',
                  scale: 1.1,
                  duration: 1500
                });
              }
            } catch (e) {}
          }

          // Apply kill-based buffs per kill
          if (state.hasBuff('Bloodlust')) {
            state.addHp(5);
          }

          if (state.hasBuff('Vampiric Touch')) {
            state.addHp(10);
          }

          if (weapon.name === 'Grimoire') {
            state.addMana(20);
          }
          if (weapon.name === 'Vampire Dagger') {
            state.addHp(30);
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
      } else {
        pushSpecialPopup('FINAL STAND', '#ef4444');
        hitDetails.push({
          enemyId: tgt.id,
          damage: enforcedDamage,
          isCrit: isCrit,
          isDead: false,
          weaknessMatch,
          resistanceMatch,
          element: attackPlan.weaponElement
        });

        if (isCrit && weapon.name === 'Thunder Hammer' && !tgt.isDead) {
          tgt.statusEffects = tgt.statusEffects || {};
          tgt.statusEffects.stunned = true;
          pushSpecialPopup('STUNNED', '#facc15');
        }
      }
    });
    
    if (state.hasBuff('Fury') && !state.playerState.furyFirstAttackUsed) {
      state.playerState.furyFirstAttackUsed = true;
    }
    
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

    // Death check in case mutators (e.g., turret) killed player
    if (state.playerState.hp <= 0) {
      const survived = PlayerManager.checkDeathDefiance();
      if (!survived) {
        state.eventBus.emit(EVENTS.DEATH, {
          stage: state.stageState.stage,
          level: state.stageState.level
        });
        if (typeof PopupsManager !== 'undefined') {
          PopupsManager.showDeathScreen({
            class: state.playerState.className,
            stage: state.stageState.stage,
            level: state.stageState.level,
            enemiesDefeated: state.systemState.runStats?.enemiesDefeated || 0,
            bossesSailed: state.systemState.runStats?.bossesSailed || 0,
            goldEarned: state.systemState.runStats?.totalGoldEarned || 0
          });
        }
        state.save();
        return { success: false, damage: 0, hitDetails: [], error: 'Player died' };
      }
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
    const chronoShiftEcho = (skillFx.chronoShiftCharges && skillFx.chronoShiftCharges > 0) ? {
      targetId: targetEnemyId,
      damage: damage,
      weaponName: weapon.name,
      element: weapon.element
    } : null;

    let echoShardEcho = null;
    if (state.playerState.talismans?.includes('Echo Shard') && state.combatState.echoShardActive) {
      state.combatState.echoShardActive = false;
      echoShardEcho = {
        targetId: targetEnemyId,
        damage: damage,
        weaponName: weapon.name,
        element: weapon.element
      };
      pushSpecialPopup('ECHO SHARD', '#ff55ff');
    }

    if (chronoShiftEcho) {
      skillFx.chronoShiftCharges--;
      if (skillFx.chronoShiftCharges <= 0) {
        delete skillFx.chronoShiftCharges;
      }
    }

    return {
      success: true,
      damage,
      isCrit,
      targetDead: target.isDead,
      apCost: actualCost,
      fireRate,
      specialPopups,
      combo: state.combatState.currentCombo,
      hitDetails,
      chronoShiftEcho,
      echoShardEcho
    };
  }
  
  static getDodgeCost() {
    const state = getGameState();
    const multiplier = state.playerState.dodgeCostMultiplier || 1.0;
    const aliveEnemies = (state.stageState?.enemies || []).filter(e => e && !e.isDead);
    const enemyCount = aliveEnemies.length || 1;
    return Math.ceil((state.playerState.maxAp / enemyCount) * multiplier);
  }

  static attemptDodge() {
    const state = getGameState();

    // Brute: Wrath Unleashed prevents dodging
    const skillFx = state.combatState?.skillEffects || {};
    if (skillFx.cannotDodge) {
      return { success: false, reason: 'Wrath forbids dodging' };
    }
    
    const dodgeCost = CombatManager.getDodgeCost();
    
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
    
    if (state.playerState.talismans?.includes('Starweave')) {
      state.combatState.starweaveCritsLeft = 2;
    }

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
