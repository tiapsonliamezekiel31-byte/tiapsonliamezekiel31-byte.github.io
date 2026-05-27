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
  
  // ============================================================
  // DAILIES
  // ============================================================
  
  static addDaily(name, difficulty, attribute, maxCompletions = 1) {
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
      difficulty,
      attribute,
      completed: false,
      bloodOath: false,
      bloodOathActive: false,
      maxCompletionsPerDay: Math.max(1, Number(maxCompletions) || 1),
      completionsToday: 0
    };
    
    state.dailiesState.dailies.push(daily);
    PlayerManager.recalculateMaxAp();
    
    return daily;
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
    Object.assign(daily, updates);
    return true;
  }
  
  static completeDaily(dailyId) {
    const state = getGameState();
    const daily = state.dailiesState.dailies.find(d => d.id === dailyId);
    
    if (!daily) return false;
    if (!daily.maxCompletionsPerDay) daily.maxCompletionsPerDay = 1;
    if (daily.completionsToday >= daily.maxCompletionsPerDay) return false;

    daily.completionsToday = (daily.completionsToday || 0) + 1;
    if (daily.completionsToday >= daily.maxCompletionsPerDay) {
      daily.completed = true;
    } else {
      daily.completed = false;
    }
    
    // Award rewards
    const reward = state.config.taskRewards[daily.difficulty];
    let apReward = reward.ap;
    let goldReward = reward.gold;
    let diamondReward = reward.diamonds;
    let attrReward = reward.attributePoints;
    
    // Apply blood oath multiplier
    if (daily.bloodOathActive) {
      apReward *= state.config.bloodOathRewardMultiplier;
      goldReward *= state.config.bloodOathRewardMultiplier;
      diamondReward *= state.config.bloodOathRewardMultiplier;
      attrReward *= state.config.bloodOathRewardMultiplier;
    }
    
    state.addAp(apReward);
    state.addGold(goldReward);
    state.addDiamonds(diamondReward);
    state.addAttributePoints(daily.attribute, attrReward);

    state.systemState.runStats.tasksCompleted++;

    const rewards = { ap: apReward, gold: goldReward, diamonds: diamondReward, attributePoints: attrReward };

    state.eventBus.emit(EVENTS.TASK_COMPLETED, {
      taskId: dailyId,
      type: 'daily',
      rewards
    });

    return { success: true, rewards, completed: daily.completed };
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
    return state.dailiesState.dailies.filter(d => d.completed);
  }

  static getMaxPotentialDiamonds() {
    const state = getGameState();
    let maxDiamonds = 0;

    (state.dailiesState.dailies || []).forEach(daily => {
      const reward = state.config.taskRewards?.[daily.difficulty];
      maxDiamonds += reward?.diamonds || 0;
    });

    return maxDiamonds;
  }
  
  static getMissedDailies() {
    const state = getGameState();
    return state.dailiesState.dailies.filter(d => !d.completed);
  }
  
  static isAllDailiesComplete() {
    return this.getMissedDailies().length === 0;
  }
  
  // ============================================================
  // TO-DOS
  // ============================================================
  
  static addTodo(name, difficulty, attribute, deadline = null, subtasks = []) {
    const state = getGameState();
    
    if (!['Easy', 'Medium', 'Hard', 'Ultra'].includes(difficulty)) {
      return null;
    }
    
    if (!state.config.attributes.includes(attribute)) {
      return null;
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
      subtasks: subtasks.map(st => ({
        id: this.generateTaskId(),
        name: st,
        completed: false
      })),
      createdAt: Date.now()
    };
    
    state.dailiesState.todos.push(todo);
    return todo;
  }
  
  static removeTodo(todoId) {
    const state = getGameState();
    const index = state.dailiesState.todos.findIndex(t => t.id === todoId);
    
    if (index === -1) return false;
    
    state.dailiesState.todos.splice(index, 1);
    return true;
  }
  
  static editTodo(todoId, updates) {
    const state = getGameState();
    const todo = state.dailiesState.todos.find(t => t.id === todoId);
    
    if (!todo) return false;
    
    Object.assign(todo, updates);
    return true;
  }
  
  static completeTodo(todoId) {
    const state = getGameState();
    const todo = state.dailiesState.todos.find(t => t.id === todoId);
    
    if (!todo) return false;
    if (todo.completed) return false;
    
    todo.completed = true;
    
    // Calculate rewards with subtask multiplier
    const reward = state.config.taskRewards[todo.difficulty];
    const completedSubtasks = todo.subtasks.filter(st => st.completed).length;
    const subtaskMultiplier = Math.pow(
      state.config.subtaskMultiplier,
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

    apReward = this.roundValue(apReward, 1);
    goldReward = this.roundValue(goldReward, 1);
    diamondReward = this.roundValue(diamondReward, 1);
    attrReward = this.roundValue(attrReward, 2);
    
    state.addAp(apReward);
    state.addGold(goldReward);
    state.addDiamonds(diamondReward);
    state.addAttributePoints(todo.attribute, attrReward);
    
    state.systemState.runStats.tasksCompleted++;
    
    state.eventBus.emit(EVENTS.TODO_COMPLETED, {
      taskId: todoId,
      type: 'todo',
      rewards: { ap: apReward, gold: goldReward, diamonds: diamondReward }
    });
    
    return true;
  }

  static getCurrentGameDateKey() {
    if (typeof getLocalDateKey === 'function') {
      return getLocalDateKey();
    }

    return new Date().toISOString().split('T')[0];
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

    if (state.systemState?.completeDayClaimDate === dateKey) {
      return { success: false, reason: 'already_claimed' };
    }

    const dailyApTotal = this.getAllDailies().reduce((sum, daily) => {
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

    state.systemState.completeDayClaimDate = dateKey;
    state.systemState.runStats.tasksCompleted += 1;
    state.eventBus.emit(EVENTS.TASK_COMPLETED, {
      taskId: `complete-day:${dateKey}`,
      type: 'daily',
      special: true,
      rewards: {
        ap: apReward,
        gold: plannerGold,
        diamonds: plannerDiamonds,
        attributePoints: attributeRewardTotal
      }
    });

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
    
    todo.subtasks.push(subtask);
    return subtask;
  }
  
  static toggleSubtask(todoId, subtaskId) {
    const state = getGameState();
    const todo = state.dailiesState.todos.find(t => t.id === todoId);
    
    if (!todo) return false;
    
    const subtask = todo.subtasks.find(st => st.id === subtaskId);
    if (!subtask) return false;
    
    subtask.completed = !subtask.completed;
    return true;
  }
  
  static removeSubtask(todoId, subtaskId) {
    const state = getGameState();
    const todo = state.dailiesState.todos.find(t => t.id === todoId);
    
    if (!todo) return false;
    
    const index = todo.subtasks.findIndex(st => st.id === subtaskId);
    if (index === -1) return false;
    
    todo.subtasks.splice(index, 1);
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
  
  static updateStreaks(allComplete = null) {
    const state = getGameState();
    const resolvedAllComplete = (typeof allComplete === 'boolean')
      ? allComplete
      : this.isAllDailiesComplete();
    
    if (resolvedAllComplete) {
      state.dailiesState.streakCompletion++;
      state.dailiesState.streakNonCompletion = 0;
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
  
  static getDailyStreakDamageBonus() {
    const state = getGameState();
    return state.dailiesState.streakCompletion * state.config.perfectDayStreakDamageBonus;
  }
  
  static resetDailies() {
    const state = getGameState();

    // IMPORTANT: streaks are based on the day that just ended,
    // so compute before we clear completion flags.
    const allCompleteBeforeReset = this.isAllDailiesComplete();
    this.updateStreaks(allCompleteBeforeReset);
    state.systemState.completeDayClaimDate = null;
    state.systemState.completeDayApBonus = 0;
    PlayerManager.recalculateMaxAp();
    
    state.dailiesState.dailies.forEach(daily => {
      daily.completed = false;
      daily.bloodOath = false;
      daily.bloodOathActive = false;
      daily.completionsToday = 0;
    });
    
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
    let task = this.getAllDailies().find(d => d.id === taskId);
    if (task) return task;
    
    return this.getAllTodos().find(t => t.id === taskId);
  }
  
  static calculateMissedDailyDamage() {
    const state = getGameState();
    const missedDailies = this.getMissedDailies();

    const missedDailyDamageTable = state.config.missedDailyDamage || {
      Easy: 1,
      Medium: 1.5,
      Hard: 2,
      Ultra: 3
    };
    
    let damage = 0;
    missedDailies.forEach(daily => {
      const baseDamage = missedDailyDamageTable[daily.difficulty] ?? 0;
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
}
