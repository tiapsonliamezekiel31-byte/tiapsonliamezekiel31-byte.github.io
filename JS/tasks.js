/**
 * NEMESIS ROGUELIKE — TASK SYSTEM
 * Dailies, To-Dos, Subtasks, Blood Oath, Streaks
 */

class TaskManager {
  static generateTaskId() {
    return Math.random().toString(36).substr(2, 9);
  }

  static roundValue(value, decimals = 1) {
    const factor = Math.pow(10, decimals);
    return Math.round((Number(value) || 0) * factor) / factor;
  }

  static ensureStarterTasks() {
    const state = getGameState();

    if (state.dailiesState.dailies.length === 0) {
      this.addDaily('Wake up', 'Easy', 'RESP');
      this.addDaily('Train body', 'Medium', 'STR');
      this.addDaily('Plan the day', 'Hard', 'DISC');
    }

    if (state.dailiesState.todos.length === 0) {
      this.addTodo('First goal', 'Easy', 'CREA', null, ['Break it down']);
    }
  }

  static parseMetadata(rawText, fallbackAttr = 'RESP', fallbackDiff = 'Medium', fallbackDeadline = null) {
    let name = rawText.trim();
    let attribute = null;
    let clusterAttributes = null;
    let difficulty = null;
    let deadline = null;

    const state = getGameState();
    const validAttrs = state?.config?.attributes || ['STR', 'INT', 'DISC', 'CREA', 'SOC', 'CAP', 'RESP'];
    const validDiffs = ['Easy', 'Medium', 'Hard', 'Ultra'];

    // 1. Parse Attribute Proportions (e.g. STR 5 or STR)
    const attrRegex = new RegExp(`\\b(${validAttrs.join('|')})\\b(?:\\s*(\\d+(?:\\.\\d+)?))?`, 'gi');
    let attrMatch;
    const foundAttrs = {};
    
    while ((attrMatch = attrRegex.exec(name)) !== null) {
      const attr = attrMatch[1].toUpperCase();
      const val = attrMatch[2] !== undefined ? Number(attrMatch[2]) : 1;
      foundAttrs[attr] = val;
    }

    const hasExplicitAttribute = Object.keys(foundAttrs).length > 0;

    if (hasExplicitAttribute) {
      clusterAttributes = foundAttrs;
      let maxVal = -1;
      for (const attr in foundAttrs) {
        if (foundAttrs[attr] > maxVal) {
          maxVal = foundAttrs[attr];
          attribute = attr;
        }
      }
      name = name.replace(new RegExp(`\\b(${validAttrs.join('|')})\\b(?:\\s*(\\d+(?:\\.\\d+)?))?`, 'gi'), '');
    }

    // 2. Parse Difficulty
    for (const diff of validDiffs) {
      const regex = new RegExp(`\\b${diff}\\b`, 'i');
      if (regex.test(name)) {
        difficulty = diff;
        name = name.replace(regex, '');
        break;
      }
    }

    // 3. Parse Deadline Date & Time
    let targetDate = new Date();
    targetDate.setHours(23, 59, 0, 0); // Default to end of day
    let dateParsed = false;
    let timeParsed = false;

    // Relative date offsets (e.g. in 3 days, in 2 weeks, in 1 month, in 5 hours)
    const inDaysRegex = /\bin\s+(\d+)\s*(days?|weeks?|months?|hrs?|hours?)\b/i;
    const inMatch = name.match(inDaysRegex);
    if (inMatch) {
      const num = parseInt(inMatch[1], 10);
      const unit = inMatch[2].toLowerCase();
      if (unit.startsWith('day')) {
        targetDate.setDate(targetDate.getDate() + num);
      } else if (unit.startsWith('week')) {
        targetDate.setDate(targetDate.getDate() + num * 7);
      } else if (unit.startsWith('month')) {
        targetDate.setMonth(targetDate.getMonth() + num);
      } else if (unit.startsWith('hr') || unit.startsWith('hour')) {
        targetDate.setHours(targetDate.getHours() + num);
      }
      name = name.replace(inDaysRegex, '');
      dateParsed = true;
    }

    // Relative dates (tomorrow, today, next week)
    const tomorrowRegex = /\btomorrow\b/i;
    const todayRegex = /\btoday\b/i;
    const nextWeekRegex = /\bnext\s+week\b/i;
    
    if (tomorrowRegex.test(name)) {
      targetDate.setDate(targetDate.getDate() + 1);
      name = name.replace(tomorrowRegex, '');
      dateParsed = true;
    } else if (todayRegex.test(name)) {
      name = name.replace(todayRegex, '');
      dateParsed = true;
    } else if (nextWeekRegex.test(name)) {
      targetDate.setDate(targetDate.getDate() + 7);
      name = name.replace(nextWeekRegex, '');
      dateParsed = true;
    }

    // Days of the week (e.g. next monday, monday)
    const dayOfWeekRegex = /\b(next\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i;
    const dayMatch = name.match(dayOfWeekRegex);
    if (dayMatch) {
      const isNext = !!dayMatch[1];
      const targetDayName = dayMatch[2].toLowerCase();
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const targetDayIndex = days.indexOf(targetDayName);
      
      const currentDayIndex = targetDate.getDay();
      let diffDays = targetDayIndex - currentDayIndex;
      if (diffDays <= 0) {
        diffDays += 7;
      }
      if (isNext && diffDays < 7) {
        diffDays += 7;
      }
      targetDate.setDate(targetDate.getDate() + diffDays);
      name = name.replace(dayOfWeekRegex, '');
      dateParsed = true;
    }

    // Absolute dates with optional year (e.g. Jan 31 2027, July 21)
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const absDateWithYearRegex = /\b(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|september|oct|october|nov|november|dec|december)[a-z]*\s+(\d{1,2})(st|nd|rd|th)?(\s+(\d{2,4}))?\b/i;
    const yearMatch = name.match(absDateWithYearRegex);
    if (yearMatch) {
      const monthIdx = months.indexOf(yearMatch[1].toLowerCase().substring(0, 3));
      const dayNum = parseInt(yearMatch[2], 10);
      const yearNum = yearMatch[5] ? parseInt(yearMatch[5], 10) : targetDate.getFullYear();
      if (monthIdx !== -1) {
        const fullYr = yearNum < 100 ? 2000 + yearNum : yearNum;
        targetDate.setFullYear(fullYr, monthIdx, dayNum);
        name = name.replace(absDateWithYearRegex, '');
        dateParsed = true;
      }
    }

    // Time parsing
    const timeAmPmRegex = /\b(\d{1,2})\s*(am|pm)\b/i;
    const time24Regex = /\b(\d{1,2}):(\d{2})\b/;
    
    let timeMatch = name.match(timeAmPmRegex);
    if (timeMatch) {
      let hour = Number(timeMatch[1]);
      const ampm = timeMatch[2].toLowerCase();
      if (ampm === 'pm' && hour < 12) hour += 12;
      if (ampm === 'am' && hour === 12) hour = 0;
      targetDate.setHours(hour, 0, 0, 0);
      name = name.replace(timeAmPmRegex, '');
      timeParsed = true;
    } else {
      timeMatch = name.match(time24Regex);
      if (timeMatch) {
        targetDate.setHours(Number(timeMatch[1]), Number(timeMatch[2]), 0, 0);
        name = name.replace(time24Regex, '');
        timeParsed = true;
      }
    }

    name = name.replace(/\s+/g, ' ').replace(/^\s*[-,\s]+\s*|\s*[-,\s]+\s*$/g, '').trim();

    const hasExplicitDeadline = dateParsed || timeParsed;

    if (hasExplicitDeadline) {
      deadline = targetDate.getTime();
    } else if (fallbackDeadline !== null && fallbackDeadline !== undefined) {
      deadline = fallbackDeadline;
    } else {
      deadline = (typeof UIManager !== 'undefined' && UIManager.quickDayDeadline) 
        ? UIManager.quickDayDeadline 
        : new Date(new Date().setDate(new Date().getDate() + 1)).setHours(23, 59, 0, 0);
    }

    return {
      name: name || '',
      attribute: attribute || fallbackAttr,
      clusterAttributes,
      difficulty: difficulty || fallbackDiff,
      deadline,
      hasExplicitAttribute,
      hasExplicitDifficulty: difficulty !== null,
      hasExplicitDeadline
    };
  }

  static parseNaturalLanguage(rawText, fallbackAttr = 'RESP', fallbackDiff = 'Medium', fallbackDeadline = null) {
    const res = this.parseMetadata(rawText, fallbackAttr, fallbackDiff, fallbackDeadline);
    if (!res.name) res.name = 'Untitled NLP Task';
    return res;
  }

  static parseBulkAddText(bulkText, fallbackAttr = 'RESP', fallbackDiff = 'Medium', fallbackDeadline = null) {
    const lines = bulkText.split('\n');
    const tasks = [];
    let currentHeader = null;

    for (let i = 0; i < lines.length; i++) {
      const rawLine = lines[i];
      const trimmedLine = rawLine.trim();
      if (!trimmedLine) continue;

      if (trimmedLine.startsWith('#') || trimmedLine.startsWith('@')) {
        const metaText = trimmedLine.substring(1).trim();
        if (metaText) {
          currentHeader = this.parseMetadata(metaText, fallbackAttr, fallbackDiff, fallbackDeadline);
        } else {
          currentHeader = null;
        }
        continue;
      }

      const isSubtask = /^[ \t]+/.test(rawLine) || /^[-\*\+]\s*/.test(trimmedLine);

      if (isSubtask) {
        const subtaskName = trimmedLine.replace(/^[-\*\+]\s*/, '').trim();
        if (subtaskName && tasks.length > 0) {
          tasks[tasks.length - 1].subtasks.push(subtaskName);
        }
      } else {
        const effAttr = (currentHeader && currentHeader.hasExplicitAttribute) ? currentHeader.attribute : fallbackAttr;
        const effDiff = (currentHeader && currentHeader.hasExplicitDifficulty) ? currentHeader.difficulty : fallbackDiff;
        const effDeadline = (currentHeader && currentHeader.hasExplicitDeadline) ? currentHeader.deadline : fallbackDeadline;

        const parsed = this.parseNaturalLanguage(trimmedLine, effAttr, effDiff, effDeadline);
        tasks.push({
          name: parsed.name,
          difficulty: parsed.difficulty,
          attribute: parsed.attribute,
          clusterAttributes: parsed.clusterAttributes,
          deadline: parsed.deadline,
          subtasks: []
        });
      }
    }
    return tasks;
  }

  static highlightBulkAddLine(rawLine) {
    if (!rawLine || !rawLine.trim()) return '';
    const trimmed = rawLine.trim();
    if (trimmed.startsWith('#') || trimmed.startsWith('@')) {
      return `<span style="color:#38bdf8; font-weight:bold; font-style:italic;">${rawLine}</span>`;
    }
    const isSubtask = /^[ \t]+/.test(rawLine) || /^[-\*\+]\s*/.test(trimmed);
    if (isSubtask) {
      return `<span style="color:#94a3b8; font-style:italic;">${rawLine}</span>`;
    }

    const attrs = ['STR', 'AGI', 'INT', 'VIT', 'DEX', 'PER', 'LUK', 'RESP'];
    const diffs = ['Easy', 'Medium', 'Hard', 'Ultra'];

    // Comprehensive NLP Deadline Regexes (multi-word support)
    const deadlineRegexes = [
      /\bin\s+\d+\s*(days?|weeks?|months?|hrs?|hours?)\b/gi,
      /\b(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|september|oct|october|nov|november|dec|december)[a-z]*\s+\d{1,2}(st|nd|rd|th)?(\s+\d{2,4})?\b/gi,
      /\b\d{1,2}(st|nd|rd|th)?\s+(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|september|oct|october|nov|november|dec|december)[a-z]*(\s+\d{2,4})?\b/gi,
      /\b\d{1,4}[-/\.]\d{1,2}[-/\.]\d{1,4}\b/gi,
      /\b(next\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)\b/gi,
      /\b(tomorrow|today|tonight|next\s+week|next\s+month|next\s+year)\b/gi,
      /\b\d{1,2}(:\d{2})?\s*(am|pm)\b/gi,
      /\b\d{1,2}:\d{2}\b/gi
    ];

    const matches = [];

    // 1. Attributes
    attrs.forEach(attr => {
      const reg = new RegExp(`\\b${attr}\\b`, 'gi');
      let m;
      while ((m = reg.exec(rawLine)) !== null) {
        matches.push({ start: m.index, end: m.index + m[0].length, text: m[0], type: 'attr' });
      }
    });

    // 2. Difficulties
    diffs.forEach(diff => {
      const reg = new RegExp(`\\b${diff}\\b`, 'gi');
      let m;
      while ((m = reg.exec(rawLine)) !== null) {
        matches.push({ start: m.index, end: m.index + m[0].length, text: m[0], type: 'diff' });
      }
    });

    // 3. Deadlines
    deadlineRegexes.forEach(reg => {
      let m;
      while ((m = reg.exec(rawLine)) !== null) {
        const start = m.index;
        const end = m.index + m[0].length;
        const overlaps = matches.some(existing => !(end <= existing.start || start >= existing.end));
        if (!overlaps) {
          matches.push({ start, end, text: m[0], type: 'deadline' });
        }
      }
    });

    matches.sort((a, b) => a.start - b.start);

    let html = '';
    let lastIdx = 0;

    matches.forEach(m => {
      if (m.start > lastIdx) {
        const textBefore = rawLine.substring(lastIdx, m.start);
        html += `<span style="color:#fbbf24; font-weight:bold;">${textBefore}</span>`;
      }

      if (m.type === 'attr') {
        html += `<span style="color:#60a5fa; font-weight:bold;">${m.text}</span>`;
      } else if (m.type === 'diff') {
        html += `<span style="color:#c084fc; font-weight:bold;">${m.text}</span>`;
      } else if (m.type === 'deadline') {
        html += `<span style="color:#f87171; font-weight:bold;">${m.text}</span>`;
      }

      lastIdx = m.end;
    });

    if (lastIdx < rawLine.length) {
      const textAfter = rawLine.substring(lastIdx);
      html += `<span style="color:#fbbf24; font-weight:bold;">${textAfter}</span>`;
    }

    return html;
  }

  // ============================================================
  // DAILIES
  // ============================================================

  static addDaily(name, difficulty, attribute, maxCompletions = 1, deadline = null) {
    const state = getGameState();

    if (!['Easy', 'Medium', 'Hard', 'Ultra'].includes(difficulty)) {
      return null;
    }

    if (!state.config.attributes.includes(attribute)) {
      return null;
    }

    const daily = {
      id: this.generateTaskId(),
      name,
      baseName: name,
      difficulty,
      attribute,
      completed: false,
      bloodOath: false,
      bloodOathActive: false,
      maxCompletionsPerDay: Math.max(1, Number(maxCompletions) || 1),
      completionsToday: 0,
      size: 1,
      layout: null,
      dailySurplusEnabled: false,
      surplusMilestones: [],
      deadline: deadline || null
    };

    state.dailiesState.dailies.push(daily);
    PlayerManager.recalculateMaxAp();

    return daily;
  }

  static updateDailyLayout(dailyId, layout) {
    const state = getGameState();
    const daily = state.dailiesState.dailies.find(d => d.id === dailyId);

    if (!daily || !layout) return false;

    daily.layout = {
      x: Math.max(0, Number(layout.x) || 0),
      y: Math.max(0, Number(layout.y) || 0)
    };

    return true;
  }

  static removeDaily(dailyId) {
    const state = getGameState();
    const index = state.dailiesState.dailies.findIndex(d => d.id === dailyId);

    if (index === -1) return false;

    state.dailiesState.dailies.splice(index, 1);
    PlayerManager.recalculateMaxAp();

    return true;
  }

  static editDaily(dailyId, updates) {
    const state = getGameState();
    const daily = state.dailiesState.dailies.find(d => d.id === dailyId);

    if (!daily) return false;

    // allow updating max completions per day
    if (updates.maxCompletionsPerDay !== undefined) {
      daily.maxCompletionsPerDay = Math.max(1, Number(updates.maxCompletionsPerDay) || 1);
    }
    if (updates.size !== undefined) {
      daily.size = Math.max(0.5, this.roundValue(Number(updates.size) || 1, 2));
    }

    if (updates.name !== undefined) {
      daily.baseName = updates.name;
    }

    if (updates.surplusMilestones !== undefined) {
      daily.dailySurplusEnabled = (updates.surplusMilestones.length > 0);
    }

    Object.assign(daily, updates);
    if (updates.maxCompletionsPerDay !== undefined) {
      daily.maxCompletionsPerDay = Math.max(1, Number(updates.maxCompletionsPerDay) || 1);
    }
    if (updates.size !== undefined) {
      daily.size = Math.max(0.5, this.roundValue(Number(updates.size) || 1, 2));
    }

    if (updates.locked !== undefined) {
      daily.locked = !!updates.locked;
      if (daily.locked) {
        daily.completed = false;
        daily.completionsToday = 0;
      }
    }

    // Refresh name prefix based on surplus and streak
    this.updateDailySurplusState(daily);

    PlayerManager.recalculateMaxAp();

    return true;
  }

  static lockDaily(dailyId) {
    return this.editDaily(dailyId, { locked: true });
  }

  static unlockDaily(dailyId) {
    return this.editDaily(dailyId, { locked: false });
  }

  static completeDaily(dailyId) {
    const state = getGameState();
    const daily = state.dailiesState.dailies.find(d => d.id === dailyId);

    if (!daily) return false;
    if (daily.locked) return false;
    if (!daily.maxCompletionsPerDay) daily.maxCompletionsPerDay = 1;
    if (daily.completionsToday >= daily.maxCompletionsPerDay) return false;

    daily.completionsToday = (daily.completionsToday || 0) + 1;
    if (daily.completionsToday >= daily.maxCompletionsPerDay) {
      daily.completed = true;
    } else {
      daily.completed = false;
    }

    // Check if daily is the last active unlocked incomplete daily
    const activeIncompleteDailies = (state.dailiesState.dailies || []).filter(d => !d.completed && !d.locked);
    const isLastUnlockedDaily = activeIncompleteDailies.length === 0;

    // Check if hold chance triggers (doubled chance)
    let isLootboxMode = !!state.playerState.lootboxDailyMode;
    let isHeld = false;
    if (!isLootboxMode && !isLastUnlockedDaily) {
      const diff = daily.difficulty;
      const rand = Math.random();
      if (diff === 'Ultra' && rand < 2 / 9) isHeld = true;
      else if (diff === 'Hard' && rand < 2 / 8) isHeld = true;
      else if (diff === 'Medium' && rand < 2 / 7) isHeld = true;
      else if (diff === 'Easy' && rand < 2 / 5) isHeld = true;
    }

    // Calculate rewards
    const reward = state.config.taskRewards[daily.difficulty] || { ap: 10, gold: 10, diamonds: 1, attributePoints: 1 };

    let apReward = isLootboxMode ? 0 : reward.ap;
    let goldReward = isLootboxMode ? 0 : reward.gold;
    let diamondReward = isLootboxMode ? 0 : reward.diamonds;
    let attrReward = reward.attributePoints;

    // Apply +-5 variation for AP and +-1 variation for diamonds ONLY if not in lootbox mode
    if (!isLootboxMode) {
      const apVariation = Math.floor(Math.random() * 11) - 5; // -5 to +5
      const diamondVariation = Math.floor(Math.random() * 3) - 1; // -1 to +1
      apReward = Math.max(0, apReward + apVariation);
      diamondReward = Math.max(0, diamondReward + diamondVariation);
    }

    // Apply blood oath multiplier
    if (daily.bloodOathActive) {
      apReward *= state.config.bloodOathRewardMultiplier;
      if (!isLootboxMode) {
        goldReward *= state.config.bloodOathRewardMultiplier;
        diamondReward *= state.config.bloodOathRewardMultiplier;
      }
      attrReward *= state.config.bloodOathRewardMultiplier;
    }

    // Apply surplus rewards multiplier
    let surplusMultiplier = 1;
    const streak = this.computeDailyStreak(daily.id);
    if (daily.dailySurplusEnabled) {
      const milestones = Array.isArray(daily.surplusMilestones) ? daily.surplusMilestones : [];
      let milestonesReached = 0;
      milestones.forEach(m => {
        if (streak >= m.streak) {
          milestonesReached++;
        }
      });
      if (milestonesReached > 0) {
        let base = 1.5;
        if (state.hasBuff('Quick Learner')) {
          base = 2.2;
        }
        surplusMultiplier = Math.pow(base, milestonesReached);
      }
    }

    if (daily.dailySurplusEnabled && surplusMultiplier > 1) {
      apReward *= surplusMultiplier;
      if (!isLootboxMode) {
        goldReward *= surplusMultiplier;
        diamondReward *= surplusMultiplier;
      }
    }

    // Apply greed buff multiplier (only if not lootbox mode since gold is 0)
    if (!isLootboxMode && state.hasBuff('Greed')) {
      const greedBonus = state.config.buffs?.Greed?.effect?.goldBonus || 0.3;
      goldReward *= (1 + greedBonus);
    }

    // Apply Focus Timer doubling multiplier
    if (state.systemState && state.systemState.focusTimerActive) {
      apReward *= 2;
      if (!isLootboxMode) {
        goldReward *= 2;
        diamondReward *= 2;
      }
      attrReward *= 2;
    }

    // Check jackpot chance (1/10) - skipped in lootbox mode
    let isJackpot = false;
    if (!isLootboxMode) {
      isJackpot = Math.random() < 0.1;
      if (isJackpot) {
        apReward *= 2;
        goldReward *= 2;
        diamondReward *= 2;
        attrReward *= 2;
      }
    }

    const isLockInActive = state.systemState && ((state.systemState.lockInDaysLeft || 0) > 0 || (state.systemState.consistencyDaysLeft || 0) > 0);
    const lockInDegree = state.systemState?.lockInDegree ?? ((state.systemState?.consistencyDaysLeft || 0) > 0 ? 3 : 2);
    if (isLockInActive) {
      apReward *= lockInDegree;
      goldReward *= lockInDegree;
      diamondReward *= lockInDegree;
      attrReward *= lockInDegree;
    }

    if (state.hasBuff('Lightning Speed')) {
      const perfectDays = state.dailiesState.perfectDaysCount || 0;
      const mult = 1 + 0.10 * perfectDays;
      apReward *= mult;
      goldReward *= mult;
      diamondReward *= mult;
      attrReward *= mult;
    }

    // Round current task calculated rewards
    apReward = this.roundValue(apReward, 1);
    goldReward = this.roundValue(goldReward, 1);
    diamondReward = this.roundValue(diamondReward, 1);
    attrReward = this.roundValue(attrReward, 2);

    if (!state.dailiesState.heldRewards) {
      state.dailiesState.heldRewards = { ap: 0, gold: 0, diamonds: 0, attributePoints: 0 };
    }

    if (isHeld) {
      state.dailiesState.heldRewards.ap = this.roundValue((state.dailiesState.heldRewards.ap || 0) + apReward, 1);
      state.dailiesState.heldRewards.gold = this.roundValue((state.dailiesState.heldRewards.gold || 0) + goldReward, 1);
      state.dailiesState.heldRewards.diamonds = this.roundValue((state.dailiesState.heldRewards.diamonds || 0) + diamondReward, 1);
      state.dailiesState.heldRewards.attributePoints = this.roundValue((state.dailiesState.heldRewards.attributePoints || 0) + attrReward, 2);

      state.systemState.runStats.tasksCompleted++;
      return {
        success: true,
        isHeld: true,
        heldAmount: { ap: apReward, gold: goldReward, diamonds: diamondReward, attributePoints: attrReward },
        totalHeld: { ...state.dailiesState.heldRewards },
        rewards: { ap: 0, gold: 0, diamonds: 0, attributePoints: 0 },
        completed: daily.completed
      };
    }

    // Record current daily direct rewards before adding held rewards
    const directRewards = {
      ap: apReward,
      gold: goldReward,
      diamonds: diamondReward,
      attributePoints: attrReward
    };

    // Add accumulated held rewards to total awarded to player
    const held = state.dailiesState.heldRewards || { ap: 0, gold: 0, diamonds: 0, attributePoints: 0 };
    const releasedHeld = { ...held };
    const totalAp = this.roundValue(apReward + (held.ap || 0), 1);
    const totalGold = this.roundValue(goldReward + (held.gold || 0), 1);
    const totalDiamonds = this.roundValue(diamondReward + (held.diamonds || 0), 1);
    const totalAttr = this.roundValue(attrReward + (held.attributePoints || 0), 2);

    // Reset held rewards pool
    state.dailiesState.heldRewards = { ap: 0, gold: 0, diamonds: 0, attributePoints: 0 };

    state.addAp(totalAp);
    state.addGold(totalGold);
    state.addDiamonds(totalDiamonds);
    if (daily.attribute && totalAttr > 0) {
      state.addAttributePoints(daily.attribute, totalAttr);
    }

    state.systemState.runStats.tasksCompleted++;

    // Update Special Event Progress
    const event = state.systemState.specialEvent;
    if (event && !event.claimed) {
      if (event.type === 'Shrine' || (event.targets && event.targets.includes(dailyId))) {
        event.progress = (event.progress || 0) + 1;
      }
    }

    // Award pet points silently
    const petPointsMap = { Easy: 1, Medium: 2, Hard: 3, Ultra: 4 };
    let petPointsAwarded = petPointsMap[daily.difficulty] || 1;
    if (isLockInActive) {
      petPointsAwarded *= lockInDegree;
    }
    state.playerState.petPoints = (state.playerState.petPoints || 0) + petPointsAwarded;

    // Lootbox key reward logic
    let keysAwarded = 0;
    if (isLootboxMode) {
      if (daily.difficulty === 'Easy') {
        keysAwarded = 1;
        if (daily.bloodOathActive) keysAwarded += 1;
      } else if (daily.difficulty === 'Medium') {
        keysAwarded = 2;
        if (state.systemState && state.systemState.focusTimerActive) keysAwarded += 1;
        if (daily.bloodOathActive) keysAwarded += 1;
      } else if (daily.difficulty === 'Hard') {
        keysAwarded = 3;
        if (state.systemState && state.systemState.focusTimerActive) keysAwarded += 1;
        if (daily.bloodOathActive) keysAwarded += 2;
      } else if (daily.difficulty === 'Ultra') {
        keysAwarded = 10;
        if (state.systemState && state.systemState.focusTimerActive) keysAwarded += 1;
        if (daily.bloodOathActive) keysAwarded += 2;
      }
      if (streak > 0 && streak % 14 === 0) {
        keysAwarded *= 2;
      }
      if (isLockInActive) {
        keysAwarded *= lockInDegree;
      }
      if (keysAwarded > 0) {
        state.addLootboxKeys(keysAwarded);
      }
    }

    directRewards.keys = keysAwarded;
    const hasReleasedHeld = (releasedHeld.ap > 0 || releasedHeld.gold > 0 || releasedHeld.diamonds > 0);

    return {
      success: true,
      rewards: directRewards,
      releasedHeld: hasReleasedHeld ? releasedHeld : null,
      releasedHeldRewards: hasReleasedHeld ? releasedHeld : null,
      completed: daily.completed,
      isJackpot
    };
  }

  static toggleBloodOath(dailyId) {
    const state = getGameState();
    const daily = state.dailiesState.dailies.find(d => d.id === dailyId);

    if (!daily) return false;

    const isActivating = !daily.bloodOathActive;

    if (isActivating) {
      // Check mana cost
      if (state.playerState.mana < state.config.bloodOathManaCost) {
        return false;
      }

      state.drainMana(state.config.bloodOathManaCost);
      daily.bloodOathActive = true;
      daily.bloodOath = true;
    } else {
      daily.bloodOathActive = false;
      daily.bloodOath = false;
    }

    return true;
  }

  static getAllDailies() {
    const state = getGameState();
    return [...state.dailiesState.dailies];
  }

  static getCompletedDailies() {
    const state = getGameState();
    const today = this.getCurrentGameDateKey();
    return state.dailiesState.dailies.filter(d => d.completed && this.isDailyScheduled(d, today));
  }

  static getDifficultyWeight(difficulty) {
    const weights = { Easy: 1, Medium: 3, Hard: 5, Ultra: 8 };
    return weights[difficulty] || 1;
  }

  static getWeightedCompletionRate(completedDailies, allDailies) {
    let completedWeight = 0;
    let totalWeight = 0;
    completedDailies.forEach(d => {
      const w = this.getDifficultyWeight(d.difficulty);
      completedWeight += w;
    });
    allDailies.forEach(d => {
      const w = this.getDifficultyWeight(d.difficulty);
      totalWeight += w;
    });
    return totalWeight > 0 ? (completedWeight / totalWeight) : 1.0;
  }

  static getTodoContributions() {
    const state = getGameState();
    let todoAp = 0;
    let todoGold = 0;
    let todoDiamonds = 0;

    if (!state || !state.dailiesState || !state.dailiesState.todos) {
      return { ap: 0, gold: 0, diamonds: 0 };
    }

    const now = Date.now();
    const subtaskMultiplierConfig = state.config?.subtaskMultiplier || 1.2;
    const lateMultiplier = state.config?.lateTaskRewardMultiplier || 0.5;
    const bloodOathMultiplier = state.config?.bloodOathRewardMultiplier || 1.3;

    state.dailiesState.todos.forEach(todo => {
      if (todo.completed) return;

      const baseReward = state.config?.taskRewards?.[todo.difficulty] || { ap: 0, gold: 0, diamonds: 0 };
      const completedSubtasks = (todo.subtasks || []).filter(st => st.completed).length;
      const subtaskMultiplier = Math.pow(subtaskMultiplierConfig, completedSubtasks);

      let apReward = (baseReward.ap || 0) * subtaskMultiplier;
      let goldReward = (baseReward.gold || 0) * subtaskMultiplier;
      let diamondReward = (baseReward.diamonds || 0) * subtaskMultiplier;

      // Check if late (overdue)
      if (todo.deadline && now > todo.deadline) {
        apReward *= lateMultiplier;
        goldReward *= lateMultiplier;
        diamondReward *= lateMultiplier;
      }

      // Apply blood oath multiplier
      if (todo.bloodOathActive) {
        apReward *= bloodOathMultiplier;
        goldReward *= bloodOathMultiplier;
        diamondReward *= bloodOathMultiplier;
      }

      // Calculate days remaining
      let daysRemaining = 7;
      if (todo.deadline) {
        const diffMs = Number(todo.deadline) - now;
        daysRemaining = diffMs / (24 * 60 * 60 * 1000);
      }
      const divisor = Math.max(1, daysRemaining);

      todoAp += apReward / divisor;
      todoGold += goldReward / divisor;
      todoDiamonds += diamondReward / divisor;
    });

    return {
      ap: todoAp,
      gold: todoGold,
      diamonds: todoDiamonds
    };
  }

  static getMaxPotentialDiamonds() {
    const state = getGameState();
    let maxDiamonds = 0;

    (state.dailiesState.dailies || []).forEach(daily => {
      const reward = state.config.taskRewards?.[daily.difficulty];
      maxDiamonds += reward?.diamonds || 0;
    });

    const todoCont = this.getTodoContributions();
    maxDiamonds += todoCont.diamonds;

    return maxDiamonds;
  }

  static getMissedDailies() {
    const state = getGameState();
    const today = this.getCurrentGameDateKey();
    return state.dailiesState.dailies.filter(d => !d.completed && this.isDailyScheduled(d, today));
  }

  static isAllDailiesComplete() {
    return this.getMissedDailies().length === 0;
  }

  // ============================================================
  // TO-DOS
  // ============================================================

  static addTodo(name, difficulty, attribute, deadline = new Date(new Date().setHours(23, 59, 0, 0)), subtasks = []) {
    const state = getGameState();

    const validDiffs = ['Easy', 'Medium', 'Hard', 'Ultra'];
    if (!validDiffs.includes(difficulty)) {
      difficulty = 'Medium';
    }

    const validAttrs = state?.config?.attributes || ['STR', 'DISC', 'RESP', 'SOC', 'CAP', 'CREA', 'INT'];
    if (!validAttrs.includes(attribute)) {
      attribute = validAttrs[0] || 'RESP';
    }

    const todo = {
      id: this.generateTaskId(),
      name,
      difficulty,
      attribute,
      deadline, // timestamp or null
      completed: false,
      bloodOath: false,
      bloodOathActive: false,
      layout: { x: 4, y: 4 },
      subtasks: subtasks.map(st => ({
        id: this.generateTaskId(),
        name: st,
        completed: false
      })),
      createdAt: Date.now()
    };

    state.dailiesState.todos.push(todo);
    if (typeof PlayerManager !== 'undefined' && typeof PlayerManager.recalculateMaxAp === 'function') {
      PlayerManager.recalculateMaxAp();
    }
    return todo;
  }

  static updateTodoLayout(todoId, layout) {
    const state = getGameState();
    const todo = state.dailiesState.todos.find(t => t.id === todoId);

    if (!todo || !layout) return false;

    todo.layout = {
      x: Math.max(0, Number(layout.x) || 0),
      y: Math.max(0, Number(layout.y) || 0)
    };

    return true;
  }

  static removeTodo(todoId) {
    const state = getGameState();
    const index = state.dailiesState.todos.findIndex(t => t.id === todoId);

    if (index === -1) return false;

    state.dailiesState.todos.splice(index, 1);
    if (typeof PlayerManager !== 'undefined' && typeof PlayerManager.recalculateMaxAp === 'function') {
      PlayerManager.recalculateMaxAp();
    }
    return true;
  }

  static editTodo(todoId, updates) {
    const state = getGameState();
    const todo = state.dailiesState.todos.find(t => t.id === todoId);

    if (!todo) return false;

    Object.assign(todo, updates);
    if (typeof PlayerManager !== 'undefined' && typeof PlayerManager.recalculateMaxAp === 'function') {
      PlayerManager.recalculateMaxAp();
    }
    return true;
  }

  static completeTodo(todoId) {
    const state = getGameState();
    const todo = state.dailiesState.todos.find(t => t.id === todoId);

    if (!todo) return false;
    if (todo.completed) return false;

    todo.completed = true;

    // Calculate rewards with subtask multiplier
    const reward = state.config.taskRewards[todo.difficulty] || state.config.taskRewards['Easy'];
    const completedSubtasks = (todo.subtasks || []).filter(st => st.completed).length;
    const subtaskMultiplier = Math.pow(
      state.config.subtaskMultiplier || 1.2,
      completedSubtasks
    );

    let apReward = reward.ap * subtaskMultiplier;
    let goldReward = reward.gold * subtaskMultiplier;
    let diamondReward = reward.diamonds * subtaskMultiplier;
    let attrReward = reward.attributePoints * subtaskMultiplier;

    // Check if late
    if (todo.deadline && Date.now() > todo.deadline) {
      apReward *= state.config.lateTaskRewardMultiplier;
      goldReward *= state.config.lateTaskRewardMultiplier;
      diamondReward *= state.config.lateTaskRewardMultiplier;
      attrReward *= state.config.lateTaskRewardMultiplier;
    }

    // Apply blood oath multiplier
    if (todo.bloodOathActive) {
      apReward *= state.config.bloodOathRewardMultiplier;
      goldReward *= state.config.bloodOathRewardMultiplier;
      diamondReward *= state.config.bloodOathRewardMultiplier;
      attrReward *= state.config.bloodOathRewardMultiplier;
    }

    // Apply Tasker's Boon todo reward multiplier
    if (state.hasBuff("Tasker's Boon")) {
      const boonMult = state.config.buffs?.["Tasker's Boon"]?.effect?.todoRewardMultiplier || 1.8;
      apReward *= boonMult;
      goldReward *= boonMult;
      diamondReward *= boonMult;
      attrReward *= boonMult;
    }

    // Apply greed buff multiplier
    if (state.hasBuff('Greed')) {
      const greedBonus = state.config.buffs?.Greed?.effect?.goldBonus || 0.3;
      goldReward *= (1 + greedBonus);
    }

    // Apply Focus Timer doubling multiplier
    if (state.systemState && state.systemState.focusTimerActive) {
      apReward *= 2;
      goldReward *= 2;
      diamondReward *= 2;
      attrReward *= 2;
    }

    // Check jackpot chance (1/10)
    let isJackpot = Math.random() < 0.1;
    if (isJackpot) {
      apReward *= 2;
      goldReward *= 2;
      diamondReward *= 2;
      attrReward *= 2;
    }

    if (state.hasBuff('Lightning Speed')) {
      const perfectDays = state.dailiesState.perfectDaysCount || 0;
      const mult = 1 + 0.10 * perfectDays;
      apReward *= mult;
      goldReward *= mult;
      diamondReward *= mult;
      attrReward *= mult;
    }

    apReward = this.roundValue(apReward, 1);
    goldReward = this.roundValue(goldReward, 1);
    diamondReward = this.roundValue(diamondReward, 1);
    attrReward = this.roundValue(attrReward, 2);

    state.addAp(apReward);
    state.addGold(goldReward);
    state.addDiamonds(diamondReward);

    if (todo.clusterAttributes) {
      for (const attr in todo.clusterAttributes) {
        const ratio = todo.clusterAttributes[attr] || 0;
        const proportionalAttrReward = this.roundValue(attrReward * ratio, 2);
        state.addAttributePoints(attr, proportionalAttrReward);
      }
    } else {
      state.addAttributePoints(todo.attribute, attrReward);
    }

    // Keep clusterId, clusterIndex, and clusterAttributes to maintain the cluster structure and placeholder rendering

    state.systemState.runStats.tasksCompleted++;

    state.eventBus.emit(EVENTS.TODO_COMPLETED, {
      taskId: todoId,
      type: 'todo',
      rewards: { ap: apReward, gold: goldReward, diamonds: diamondReward }
    });

    // Award pet points silently
    const petPointsMap = { Easy: 1, Medium: 2, Hard: 3, Ultra: 4 };
    const petPointsAwarded = petPointsMap[todo.difficulty] || 1;
    state.playerState.petPoints = (state.playerState.petPoints || 0) + petPointsAwarded;

    if (typeof PlayerManager !== 'undefined' && typeof PlayerManager.recalculateMaxAp === 'function') {
      PlayerManager.recalculateMaxAp();
    }

    return {
      success: true,
      rewards: { ap: apReward, gold: goldReward, diamonds: diamondReward },
      completed: true,
      isJackpot
    };
  }

  static getCurrentGameDateKey() {
    if (typeof getLocalDateKey === 'function') {
      return getLocalDateKey();
    }

    return new Date().toISOString().split('T')[0];
  }

  static isDailyScheduled(daily, dateKey) {
    if (!daily.repeatMode || daily.repeatMode === 'daily') {
      return true;
    }
    
    if (daily.repeatMode === 'weekly') {
      // Create a local date for the given dateKey
      const parts = dateKey.split('-');
      if (parts.length === 3) {
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        const weekDays = Array.isArray(daily.weekDays) ? daily.weekDays : [0, 1, 2, 3, 4, 5, 6];
        return weekDays.includes(d.getDay());
      }
      return true; // Fallback
    }
    
    if (daily.repeatMode === 'interval') {
      const startKey = daily.createdAtDateKey || dateKey;
      const startParts = startKey.split('-');
      const currentParts = dateKey.split('-');
      
      if (startParts.length === 3 && currentParts.length === 3) {
        const startDate = new Date(startParts[0], startParts[1] - 1, startParts[2]);
        const currentDate = new Date(currentParts[0], currentParts[1] - 1, currentParts[2]);
        
        // Calculate difference in days, ignoring DST issues by using UTC time of those local dates
        const utcStart = Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
        const utcCurrent = Date.UTC(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
        
        const diffMs = utcCurrent - utcStart;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        const interval = Math.max(1, daily.intervalDays || 1);
        
        // If current date is before start date, we could technically still modulo if we wanted, 
        // but normally diffDays >= 0.
        return Math.abs(diffDays) % interval === 0;
      }
      return true; // Fallback
    }
    
    return true;
  }

  static getPlannerDayData(dateKey) {
    const state = getGameState();
    const plannerKey = state.config.plannerKey || 'nemesis_planner_data';
    const raw = localStorage.getItem(plannerKey);

    if (!raw) return null;

    try {
      const data = JSON.parse(raw);
      return { data, day: data?.[dateKey] || null, plannerKey };
    } catch (error) {
      console.warn('Failed to parse planner data for complete day', error);
      return null;
    }
  }

  static completeDay() {
    const state = getGameState();
    const dateKey = this.getCurrentGameDateKey();

    const scheduledDailies = this.getAllDailies().filter(d => this.isDailyScheduled(d, dateKey));
    const dailyApTotal = scheduledDailies.reduce((sum, daily) => {
      const reward = state.config.taskRewards[daily.difficulty];
      return sum + (reward?.ap || 0);
    }, 0);

    const apReward = dailyApTotal * 0.6;

    let attributeRewardTotal = 0;
    let plannerGold = 0;
    let plannerDiamonds = 0;

    const plannerRecord = this.getPlannerDayData(dateKey);
    const plannerDay = plannerRecord?.day;
    if (plannerDay) {
      const completedTasks = Array.isArray(plannerDay.tasks) ? plannerDay.tasks.filter(task => task.completed) : [];
      completedTasks.forEach(task => {
        const reward = state.config.taskRewards[task.difficulty];
        attributeRewardTotal += reward?.attributePoints || 0;
      });

      plannerGold = Number(plannerDay.pendingRewards?.gold) || 0;
      plannerDiamonds = Number(plannerDay.pendingRewards?.diamonds) || 0;

      plannerDay.pendingRewards = { gold: 0, diamonds: 0 };
      plannerRecord.data[dateKey] = plannerDay;
      localStorage.setItem(plannerRecord.plannerKey, JSON.stringify(plannerRecord.data));
      try {
        window.dispatchEvent(new StorageEvent('storage', {
          key: plannerRecord.plannerKey,
          newValue: JSON.stringify(plannerRecord.data)
        }));
      } catch (error) {
        // ignore storage event issues in unsupported contexts
      }
    }

    if (apReward) {
      state.systemState.completeDayApBonus = apReward;
      PlayerManager.recalculateMaxAp();
      state.addAp(apReward);
    }

    if (plannerGold) state.addGold(plannerGold);
    if (plannerDiamonds) state.addDiamonds(plannerDiamonds);

    if (attributeRewardTotal && plannerDay) {
      const completedTasks = Array.isArray(plannerDay.tasks) ? plannerDay.tasks.filter(task => task.completed) : [];
      completedTasks.forEach(task => {
        const reward = state.config.taskRewards[task.difficulty];
        if (reward?.attributePoints) {
          state.addAttributePoints(task.attribute, reward.attributePoints);
        }
      });
    }

    // Award +5 Pet Points bonus
    state.playerState.petPoints = (state.playerState.petPoints || 0) + 5;

    return {
      success: true,
      dateKey,
      rewards: {
        ap: apReward,
        gold: plannerGold,
        diamonds: plannerDiamonds,
        attributePoints: attributeRewardTotal
      }
    };
  }

  static toggleBloodOathTodo(todoId) {
    const state = getGameState();
    const todo = state.dailiesState.todos.find(t => t.id === todoId);

    if (!todo) return false;

    const isActivating = !todo.bloodOathActive;

    if (isActivating) {
      if (state.playerState.mana < state.config.bloodOathManaCost) {
        return false;
      }

      state.drainMana(state.config.bloodOathManaCost);
      todo.bloodOathActive = true;
      todo.bloodOath = true;
    } else {
      todo.bloodOathActive = false;
      todo.bloodOath = false;
    }

    if (typeof PlayerManager !== 'undefined' && typeof PlayerManager.recalculateMaxAp === 'function') {
      PlayerManager.recalculateMaxAp();
    }
    return true;
  }

  static addSubtask(todoId, subtaskName) {
    const state = getGameState();
    const todo = state.dailiesState.todos.find(t => t.id === todoId);

    if (!todo) return null;

    const subtask = {
      id: this.generateTaskId(),
      name: subtaskName,
      completed: false
    };

    if (!todo.subtasks) todo.subtasks = [];
    todo.subtasks.push(subtask);
    if (typeof PlayerManager !== 'undefined' && typeof PlayerManager.recalculateMaxAp === 'function') {
      PlayerManager.recalculateMaxAp();
    }
    return subtask;
  }

  static toggleSubtask(todoId, subtaskId) {
    const state = getGameState();
    const todo = state.dailiesState.todos.find(t => t.id === todoId);

    if (!todo) return false;

    const subtask = (todo.subtasks || []).find(st => st.id === subtaskId);
    if (!subtask) return false;

    subtask.completed = !subtask.completed;
    if (typeof PlayerManager !== 'undefined' && typeof PlayerManager.recalculateMaxAp === 'function') {
      PlayerManager.recalculateMaxAp();
    }
    return true;
  }

  static removeSubtask(todoId, subtaskId) {
    const state = getGameState();
    const todo = state.dailiesState.todos.find(t => t.id === todoId);

    if (!todo) return false;

    const index = (todo.subtasks || []).findIndex(st => st.id === subtaskId);
    if (index === -1) return false;

    todo.subtasks.splice(index, 1);
    if (typeof PlayerManager !== 'undefined' && typeof PlayerManager.recalculateMaxAp === 'function') {
      PlayerManager.recalculateMaxAp();
    }
    return true;
  }

  static getAllTodos() {
    const state = getGameState();
    return [...state.dailiesState.todos];
  }

  static getCompletedTodos() {
    const state = getGameState();
    return state.dailiesState.todos.filter(t => t.completed);
  }

  static getUncompletedTodosNearDeadline(hours = 24) {
    const state = getGameState();
    const now = Date.now();
    const timeWindow = hours * 60 * 60 * 1000;

    return state.dailiesState.todos.filter(t => {
      if (t.completed || !t.deadline) return false;

      const timeTillDeadline = t.deadline - now;
      return timeTillDeadline >= 0 && timeTillDeadline <= timeWindow;
    });
  }

  // ============================================================
  // STREAKS
  // ============================================================

  static updateStreaks(allComplete = null, scheduledCount = null) {
    const state = getGameState();

    const anySaved = state.dailiesState.dailies.some(d => d.streakSaved);
    if (anySaved) {
      state.dailiesState.dailies.forEach(d => { d.streakSaved = false; });
      state.eventBus.emit(EVENTS.DAILY_STREAK_CHANGED, {
        completion: state.dailiesState.streakCompletion,
        nonCompletion: state.dailiesState.streakNonCompletion
      });
      return;
    }

    const activeScheduledCount = (scheduledCount !== null) 
      ? scheduledCount 
      : state.dailiesState.dailies.filter(d => this.isDailyScheduled(d, this.getCurrentGameDateKey())).length;

    if (activeScheduledCount === 0) {
      state.eventBus.emit(EVENTS.DAILY_STREAK_CHANGED, {
        completion: state.dailiesState.streakCompletion,
        nonCompletion: state.dailiesState.streakNonCompletion
      });
      return;
    }

    const resolvedAllComplete = (typeof allComplete === 'boolean')
      ? allComplete
      : this.isAllDailiesComplete();

    if (resolvedAllComplete) {
      state.dailiesState.streakCompletion++;
      state.dailiesState.streakNonCompletion = 0;
      state.dailiesState.perfectDaysCount = (state.dailiesState.perfectDaysCount || 0) + 1;

      if (state.playerState.talismans?.includes('Verdant Heart')) {
        state.playerState.maxHp += 3;
        state.playerState.hp += 3;
        state.playerState.maxMana += 5;
        state.playerState.mana += 5;
      }
    } else {
      state.dailiesState.streakNonCompletion++;
      state.dailiesState.streakCompletion = 0;
    }

    state.eventBus.emit(EVENTS.DAILY_STREAK_CHANGED, {
      completion: state.dailiesState.streakCompletion,
      nonCompletion: state.dailiesState.streakNonCompletion
    });
  }

  static getStreakBorderColor() {
    const state = getGameState();

    if (state.dailiesState.streakCompletion >= 7) {
      return (typeof UIManager !== 'undefined') ? UIManager.themeColor('--ap-gold', '#FFB33F') : '#FFD700';
    }

    if (state.dailiesState.streakNonCompletion >= 7) {
      return (typeof UIManager !== 'undefined') ? UIManager.themeColor('--hp-red', '#C00707') : '#FF4444';
    }

    return (typeof UIManager !== 'undefined') ? UIManager.themeColor('--mana-blue', '#134E8E') : '#4488FF';
  }

  static getWeightedAverageStreak() {
    const state = getGameState();
    const dailies = Array.isArray(state.dailiesState?.dailies) ? state.dailiesState.dailies : [];
    if (dailies.length === 0) return 0;

    const weights = { Easy: 1, Medium: 2, Hard: 3, Ultra: 6 };
    let totalWeightedStreak = 0;
    let totalWeight = 0;

    for (const daily of dailies) {
      const streak = this.computeDailyStreak(daily.id);
      const w = weights[daily.difficulty] || 1;
      totalWeightedStreak += streak * w;
      totalWeight += w;
    }

    const avg = totalWeight > 0 ? (totalWeightedStreak / totalWeight) : 0;
    this.checkAndUpdateStreakUnlocks(avg);
    return avg;
  }

  static checkAndUpdateStreakUnlocks(avgStreak) {
    const state = typeof getGameState === 'function' ? getGameState() : null;
    if (!state || !state.playerState) return;

    if (!state.playerState.unlockedStreakFeatures) {
      state.playerState.unlockedStreakFeatures = {};
    }

    const unlocks = state.config?.streakUnlocks || {
      pet: { streak: 1 },
      consumables: { streak: 3 },
      sacredTree: { streak: 5 },
      lockIn: { streak: 7 },
      statue: { streak: 8 },
      shrine: { streak: 9 }
    };

    const currentAvg = typeof avgStreak === 'number' ? avgStreak : this.getWeightedAverageStreak();

    for (const key in unlocks) {
      const required = unlocks[key]?.streak || 0;
      if (currentAvg >= required) {
        state.playerState.unlockedStreakFeatures[key] = true;
      }
    }
  }

  static isFeatureUnlocked(featureKey) {
    const state = typeof getGameState === 'function' ? getGameState() : null;
    if (!state || !state.playerState) return true;

    if (!state.playerState.unlockedStreakFeatures) {
      state.playerState.unlockedStreakFeatures = {};
    }

    // Persistent check
    if (state.playerState.unlockedStreakFeatures[featureKey]) {
      return true;
    }

    const unlocks = state.config?.streakUnlocks || {
      pet: { streak: 1 },
      consumables: { streak: 3 },
      sacredTree: { streak: 5 },
      lockIn: { streak: 7 },
      statue: { streak: 8 },
      shrine: { streak: 9 }
    };

    const required = unlocks[featureKey]?.streak || 0;
    const avgStreak = this.getWeightedAverageStreak();

    if (avgStreak >= required) {
      state.playerState.unlockedStreakFeatures[featureKey] = true;
      return true;
    }

    return false;
  }


  static getDailyStreakDamageBonus() {
    const state = getGameState();
    const avgStreak = this.getWeightedAverageStreak();
    const clampedStreak = Math.max(0, Math.min(66, avgStreak));

    // Lowest (0) gives x1 multiplier (+0 bonus), highest (66) gives x10 multiplier (+9 bonus)
    let bonus = (clampedStreak / 66.0) * 9.0;

    if (state.hasBuff && state.hasBuff('Quick Learner')) {
      bonus *= 2;
    }

    return bonus;
  }

  static computeDailyStreak(dailyId) {
    const state = getGameState();
    const history = Array.isArray(state.dailiesState?.history) ? state.dailiesState.history : [];
    let positive = 0;
    let negative = 0;
    for (let i = history.length - 1; i >= 0; i--) {
      const entry = history[i];
      const completed = Array.isArray(entry.completedDailies) && entry.completedDailies.some(d => String(d.id) === String(dailyId));
      const missed = Array.isArray(entry.missedDailies) && entry.missedDailies.some(d => String(d.id) === String(dailyId));
      if (completed) {
        if (negative > 0) break;
        positive++;
        continue;
      }
      if (missed) {
        if (positive > 0) break;
        negative++;
        continue;
      }
      // If neither completed nor missed, it means it was not scheduled (or the day was skipped).
      // We continue looking further back in history instead of breaking the streak.
      continue;
    }
    return positive > 0 ? positive : negative > 0 ? -negative : 0;
  }

  static updateDailySurplusState(daily) {
    if (!daily.baseName) {
      daily.baseName = daily.name;
    }

    if (!daily.dailySurplusEnabled) {
      daily.name = daily.baseName;
      return;
    }

    const streak = this.computeDailyStreak(daily.id);
    const milestones = Array.isArray(daily.surplusMilestones) ? daily.surplusMilestones : [];

    // Sort ascending by streak threshold
    const sortedMilestones = [...milestones].sort((a, b) => a.streak - b.streak);

    let activeMilestone = null;
    for (let i = 0; i < sortedMilestones.length; i++) {
      if (streak >= sortedMilestones[i].streak) {
        activeMilestone = sortedMilestones[i];
      } else {
        break;
      }
    }

    if (activeMilestone && activeMilestone.name) {
      daily.name = activeMilestone.name;
    } else {
      daily.name = daily.baseName;
    }
  }

  static resetDailies() {
    const state = getGameState();
    if (state.systemState?.taskListFilters) {
      state.systemState.taskListFilters.lockModeDailies = false;
    }

    // IMPORTANT: streaks are based on the day that just ended,
    // so compute before we clear completion flags.
    const today = this.getCurrentGameDateKey();
    const scheduledCount = state.dailiesState.dailies.filter(d => this.isDailyScheduled(d, today)).length;
    const allCompleteBeforeReset = this.isAllDailiesComplete();
    this.updateStreaks(allCompleteBeforeReset, scheduledCount);
    state.systemState.completeDayClaimDate = null;
    state.systemState.completeDayApBonus = 0;
    PlayerManager.recalculateMaxAp();

    state.dailiesState.dailies.forEach(daily => {
      // Update surplus name prefix based on updated streak in history
      this.updateDailySurplusState(daily);

      daily.completed = false;
      daily.bloodOath = false;
      daily.bloodOathActive = false;
      daily.completionsToday = 0;
      daily.locked = false;
      daily.notified30MinToday = false;
    });

    state.rollSpecialEvent();

    // Save current active state (which has just been reset)
    const currentSetId = state.dailiesState.activeSetId || 'A';
    if (!state.dailiesState.sets) state.dailiesState.sets = {};
    state.dailiesState.sets[currentSetId] = {
      dailies: JSON.parse(JSON.stringify(state.dailiesState.dailies || [])),
      dailyNotes: JSON.parse(JSON.stringify(state.systemState.dailyNotes || []))
    };
    
    PlayerManager.recalculateMaxAp();

    state.eventBus.emit(EVENTS.DAILY_RESET, {
      dailies: state.dailiesState.dailies
    });
  }

  // ============================================================
  // HELPERS
  // ============================================================

  static getAllTasks() {
    return [...this.getAllDailies(), ...this.getAllTodos()];
  }

  static getTaskById(taskId) {
    let task = this.getAllDailies().find(d => String(d.id) === String(taskId));
    if (task) return task;

    return this.getAllTodos().find(t => String(t.id) === String(taskId));
  }

  static calculateMissedDailyDamage() {
    const state = getGameState();
    const missedDailies = this.getMissedDailies().filter(d => !d.streakSaved);

    const missedDailyDamageTable = state.config.missedDailyDamage || {
      Easy: 1,
      Medium: 1.5,
      Hard: 2,
      Ultra: 15
    };

    let damage = 0;
    const isLockInActive = state.systemState && ((state.systemState.lockInDaysLeft || 0) > 0 || (state.systemState.consistencyDaysLeft || 0) > 0);
    const lockInDegree = state.systemState?.lockInDegree ?? ((state.systemState?.consistencyDaysLeft || 0) > 0 ? 3 : 2);
    missedDailies.forEach(daily => {
      let baseDamage = missedDailyDamageTable[daily.difficulty] ?? 0;
      if (isLockInActive) {
        const damageMult = lockInDegree * 4; // 2:8 ratio multiplier (Degree R -> R * 4 damage)
        baseDamage *= damageMult;
      }
      const multiplier = daily.bloodOathActive ? state.config.bloodOathDamageMultiplier : 1;
      damage += baseDamage * multiplier;
    });

    if (state.hasBuff('Pacifist')) {
      const reduction = state.config.buffs?.Pacifist?.effect?.missedDailyDamageReduction;
      if (typeof reduction === 'number') {
        damage *= reduction;
      } else {
        damage *= 0.5;
      }
    }

    return damage;
  }

  static calculateLateTodoDamage() {
    const state = getGameState();
    const now = Date.now();

    let damage = 0;
    this.getAllTodos().forEach(todo => {
      if (todo.completed || !todo.deadline || todo.deadline > now) return;

      // Late todo
      const baseDamage = state.config.lateTaskDamage[todo.difficulty];
      damage += baseDamage;
    });

    return damage;
  }

  static validateDailyCount() {
    const state = getGameState();
    const count = state.dailiesState.dailies.length;

    if (count < state.config.minRequiredDailies) {
      console.warn(
        `Warning: Only ${count} dailies. Minimum required: ${state.config.minRequiredDailies}`
      );
      return false;
    }

    return true;
  }

  static recalculateAchievements() {
    const state = getGameState();
    const history = Array.isArray(state.dailiesState?.history) ? state.dailiesState.history : [];
    const runStartTime = Number(state.systemState?.gameStartTime) || 0;

    // Reset stats for all current dailies
    state.dailiesState.dailies.forEach(daily => {
      daily.longestStreak = 0;
      daily.currentStreak = 0;
      daily.totalCompletions = 0;
      daily.totalCount = 0;
      daily.completionRate = 0;
    });

    // Process history chronologically, filtering for the current run
    const currentRunHistory = history.filter(entry => (entry.timestamp || 0) >= runStartTime);

    currentRunHistory.forEach(entry => {
      const completedIds = (entry.completedDailies || []).map(d => String(d.id));
      const missedIds = (entry.missedDailies || []).map(d => String(d.id));

      state.dailiesState.dailies.forEach(daily => {
        const idStr = String(daily.id);
        const wasCompleted = completedIds.includes(idStr);
        const wasMissed = missedIds.includes(idStr);

        if (wasCompleted || wasMissed) {
          daily.totalCount++;
          if (wasCompleted) {
            daily.currentStreak = (daily.currentStreak || 0) + 1;
            daily.totalCompletions++;
            if (daily.currentStreak > daily.longestStreak) {
              daily.longestStreak = daily.currentStreak;
            }
          } else {
            daily.currentStreak = 0;
          }
        }
      });
    });

    // Finalize completion rate
    state.dailiesState.dailies.forEach(daily => {
      daily.completionRate = daily.totalCount > 0 ? (daily.totalCompletions / daily.totalCount) : 0;
    });

    state.save();
  }

  static switchDaySet(newSetId) {
    const state = getGameState();
    const currentSetId = state.dailiesState.activeSetId || 'A';
    if (currentSetId === newSetId) return;

    if (!state.dailiesState.sets) {
      state.dailiesState.sets = {};
    }

    // Save current active state into the old set slot
    state.dailiesState.sets[currentSetId] = {
      dailies: JSON.parse(JSON.stringify(state.dailiesState.dailies || [])),
      dailyNotes: JSON.parse(JSON.stringify(state.systemState.dailyNotes || []))
    };

    // Load state from the new set slot
    if (state.dailiesState.sets[newSetId]) {
      state.dailiesState.dailies = state.dailiesState.sets[newSetId].dailies;
      state.systemState.dailyNotes = state.dailiesState.sets[newSetId].dailyNotes || [];
    } else {
      state.dailiesState.dailies = [];
      state.systemState.dailyNotes = [];
      state.dailiesState.sets[newSetId] = {
        dailies: [],
        dailyNotes: []
      };
    }

    state.dailiesState.activeSetId = newSetId;
    PlayerManager.recalculateMaxAp();
    state.save();
  }

  static checkDailyDeadlines() {
    const state = getGameState();
    if (!state || !state.dailiesState || !state.dailiesState.dailies) return;

    const now = new Date();
    const today = this.getCurrentGameDateKey();
    let changed = false;

    state.dailiesState.dailies.forEach(daily => {
      if (!daily.deadline) return;
      if (!this.isDailyScheduled(daily, today)) return;

      const parts = daily.deadline.split(':');
      if (parts.length !== 2) return;
      const hours = parseInt(parts[0], 10);
      const minutes = parseInt(parts[1], 10);
      if (isNaN(hours) || isNaN(minutes)) return;

      // Deadline date for today
      const deadlineDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);
      const timeRemainingMs = deadlineDate.getTime() - now.getTime();

      // 1. Lock daily if past deadline
      if (timeRemainingMs <= 0) {
        if (!daily.completed && !daily.locked) {
          daily.locked = true;
          changed = true;
          // Visual alert
          try {
            FloatingDamageNumber.show(
              window.innerWidth / 2,
              window.innerHeight / 2,
              `⚠️ Daily "${daily.name}" locked (Deadline passed)!`,
              { color: '#ef4444', duration: 3000 }
            );
          } catch (e) {}
        }
      } 
      // 2. Notify 30 minutes before
      else if (timeRemainingMs > 0 && timeRemainingMs <= 30 * 60 * 1000) {
        if (!daily.completed && !daily.locked && !daily.notified30MinToday) {
          daily.notified30MinToday = true;
          changed = true;
          // In-game warning
          try {
            FloatingDamageNumber.show(
              window.innerWidth / 2,
              window.innerHeight / 2 - 50,
              `⏳ "${daily.name}" deadline in 30 minutes!`,
              { color: '#e8b84a', duration: 4000 }
            );
          } catch (e) {}
          
          // Browser push notification
          if ('Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification('Daily Task Deadline Alert', {
                body: `"${daily.name}" is due in 30 minutes!`,
                icon: 'icon.svg'
              });
            } catch (e) {}
          }
        }
      }
    });

    if (changed) {
      state.save();
      if (typeof UIManager !== 'undefined' && typeof UIManager.updateDailiesList === 'function') {
        UIManager.updateDailiesList();
      }
    }
  }

  static completeSubtask(todoId, subtaskId) {
    const state = getGameState();
    const todo = state.dailiesState.todos.find(t => t.id === todoId);
    if (!todo || todo.completed) return { success: false };

    const subtask = (todo.subtasks || []).find(st => st.id === subtaskId);
    if (!subtask || subtask.completed) return { success: false };

    subtask.completed = true;

    const baseReward = state.config.taskRewards[todo.difficulty] || state.config.taskRewards['Easy'];
    const totalSubtasks = (todo.subtasks || []).length;
    const share = 1 / (totalSubtasks || 1);

    let apReward = baseReward.ap * share;
    let goldReward = baseReward.gold * share;
    let diamondReward = baseReward.diamonds * share;
    let attrReward = baseReward.attributePoints * share;

    // Apply blood oath multiplier
    if (todo.bloodOathActive) {
      apReward *= state.config.bloodOathRewardMultiplier;
      goldReward *= state.config.bloodOathRewardMultiplier;
      diamondReward *= state.config.bloodOathRewardMultiplier;
      attrReward *= state.config.bloodOathRewardMultiplier;
    }

    // Apply Tasker's Boon todo reward multiplier
    if (state.hasBuff("Tasker's Boon")) {
      const boonMult = state.config.buffs?.["Tasker's Boon"]?.effect?.todoRewardMultiplier || 1.8;
      apReward *= boonMult;
      goldReward *= boonMult;
      diamondReward *= boonMult;
      attrReward *= boonMult;
    }

    // Apply greed buff multiplier
    if (state.hasBuff('Greed')) {
      const greedBonus = state.config.buffs?.Greed?.effect?.goldBonus || 0.3;
      goldReward *= (1 + greedBonus);
    }

    // Apply Focus Timer doubling multiplier
    if (state.systemState && state.systemState.focusTimerActive) {
      apReward *= 2;
      goldReward *= 2;
      diamondReward *= 2;
      attrReward *= 2;
    }

    // Check jackpot chance (1/10)
    let isJackpot = Math.random() < 0.1;
    if (isJackpot) {
      apReward *= 2;
      goldReward *= 2;
      diamondReward *= 2;
      attrReward *= 2;
    }

    apReward = this.roundValue(apReward, 1);
    goldReward = this.roundValue(goldReward, 1);
    diamondReward = this.roundValue(diamondReward, 1);
    attrReward = this.roundValue(attrReward, 2);

    state.addAp(apReward);
    state.addGold(goldReward);
    state.addDiamonds(diamondReward);

    if (todo.clusterAttributes) {
      for (const attr in todo.clusterAttributes) {
        const ratio = todo.clusterAttributes[attr] || 0;
        const proportionalAttrReward = this.roundValue(attrReward * ratio, 2);
        state.addAttributePoints(attr, proportionalAttrReward);
      }
    } else {
      state.addAttributePoints(todo.attribute, attrReward);
    }

    state.systemState.runStats.tasksCompleted++;

    // Proportional pet points
    const petPointsMap = { Easy: 1, Medium: 2, Hard: 3, Ultra: 4 };
    const petPointsBase = petPointsMap[todo.difficulty] || 1;
    const petPointsAwarded = this.roundValue(petPointsBase * share, 2);
    state.playerState.petPoints = (state.playerState.petPoints || 0) + petPointsAwarded;

    // Automatically complete the parent To-Do silently if all its subtasks are now completed
    const allCompleted = todo.subtasks.every(st => st.completed);
    if (allCompleted) {
      todo.completed = true;
      state.eventBus.emit(EVENTS.TODO_COMPLETED, {
        taskId: todoId,
        type: 'todo',
        rewards: { ap: 0, gold: 0, diamonds: 0 }
      });
    }

    return {
      success: true,
      rewards: { ap: apReward, gold: goldReward, diamonds: diamondReward },
      completed: allCompleted,
      isJackpot
    };
  }

  static completeStep(stepId) {
    const state = getGameState();
    const parts = stepId.split('-step-');
    const taskId = parts[0];
    const stepIndex = parseInt(parts[1], 10);

    // Find parent task (could be a daily or a todo)
    let parentTask = state.dailiesState.dailies.find(d => d.id === taskId);
    let parentType = 'daily';
    if (!parentTask) {
      parentTask = state.dailiesState.todos.find(t => t.id === taskId);
      parentType = 'todo';
    }

    if (!parentTask || parentTask.completed) return { success: false };

    // Mark step completed
    if (!state.systemState.completedSteps) {
      state.systemState.completedSteps = [];
    }
    if (!state.systemState.completedSteps.includes(stepId)) {
      state.systemState.completedSteps.push(stepId);
    }

    const rawSteps = state.systemState.temporaryFocusSteps?.[taskId] || '';
    const steps = rawSteps.split(',').map(s => s.trim()).filter(s => s.length > 0);
    const totalSteps = steps.length || 1;
    const share = 1 / totalSteps;

    // Base reward from parent difficulty
    const baseReward = state.config.taskRewards[parentTask.difficulty] || state.config.taskRewards['Easy'];

    let apReward = baseReward.ap * share;
    let goldReward = baseReward.gold * share;
    let diamondReward = baseReward.diamonds * share;
    let attrReward = baseReward.attributePoints * share;

    let isLootboxMode = parentType === 'daily' && !!state.playerState.lootboxDailyMode;
    if (isLootboxMode) {
      apReward = 0;
      goldReward = 0;
      diamondReward = 0;
    }

    // Apply Blood Oath
    if (parentTask.bloodOathActive) {
      apReward *= state.config.bloodOathRewardMultiplier;
      if (!isLootboxMode) {
        goldReward *= state.config.bloodOathRewardMultiplier;
        diamondReward *= state.config.bloodOathRewardMultiplier;
      }
      attrReward *= state.config.bloodOathRewardMultiplier;
    }

    // Apply Tasker's Boon (for todos only)
    if (parentType === 'todo' && state.hasBuff("Tasker's Boon")) {
      const boonMult = state.config.buffs?.["Tasker's Boon"]?.effect?.todoRewardMultiplier || 1.8;
      apReward *= boonMult;
      goldReward *= boonMult;
      diamondReward *= boonMult;
      attrReward *= boonMult;
    }

    // Apply Greed
    if (!isLootboxMode && state.hasBuff('Greed')) {
      const greedBonus = state.config.buffs?.Greed?.effect?.goldBonus || 0.3;
      goldReward *= (1 + greedBonus);
    }

    // Apply Focus 2x
    if (state.systemState && state.systemState.focusTimerActive) {
      apReward *= 2;
      if (!isLootboxMode) {
        goldReward *= 2;
        diamondReward *= 2;
      }
      attrReward *= 2;
    }

    // Apply Jackpot
    let isJackpot = Math.random() < 0.1;
    if (isJackpot) {
      apReward *= 2;
      goldReward *= 2;
      diamondReward *= 2;
      attrReward *= 2;
    }

    apReward = this.roundValue(apReward, 1);
    goldReward = this.roundValue(goldReward, 1);
    diamondReward = this.roundValue(diamondReward, 1);
    attrReward = this.roundValue(attrReward, 2);

    state.addAp(apReward);
    state.addGold(goldReward);
    state.addDiamonds(diamondReward);
    state.addAttributePoints(parentTask.attribute, attrReward);

    state.systemState.runStats.tasksCompleted++;

    // Proportional pet points
    const petPointsMap = { Easy: 1, Medium: 2, Hard: 3, Ultra: 4 };
    const petPointsBase = petPointsMap[parentTask.difficulty] || 1;
    const petPointsAwarded = this.roundValue(petPointsBase * share, 2);
    state.playerState.petPoints = (state.playerState.petPoints || 0) + petPointsAwarded;

    // Check if all steps of this parent task are now completed
    const allCompleted = steps.every((_, idx) => 
      state.systemState.completedSteps.includes(`${taskId}-step-${idx}`)
    );

    if (allCompleted) {
      if (parentType === 'daily') {
        parentTask.completed = true;
        parentTask.completionsToday = parentTask.maxCompletionsPerDay || 1;
      } else {
        parentTask.completed = true;
      }
      // Emit completed event silently
      state.eventBus.emit(parentType === 'daily' ? EVENTS.DAILY_COMPLETED : EVENTS.TODO_COMPLETED, {
        taskId: taskId,
        type: parentType,
        rewards: { ap: 0, gold: 0, diamonds: 0 }
      });
    }

    return {
      success: true,
      rewards: { ap: apReward, gold: goldReward, diamonds: diamondReward },
      completed: allCompleted,
      isJackpot
    };
  }
}
