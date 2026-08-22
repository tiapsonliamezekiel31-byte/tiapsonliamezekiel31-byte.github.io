/**
 * NEMESIS ZOMBIE BASE DEFENSE ENGINE
 * Precision 10-Ring Tactical Canvas & Full Task System Integration
 */

class DefenseGame {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.animationFrameId = null;
    this.lastTime = 0;
    
    // Defense state
    this.state = {
      day: 1,
      base: {
        hp: 100,
        maxHp: 100,
        shield: 50,
        maxShield: 50,
        turretPower: 35,
        artilleryPower: 50
      },
      zombies: [],
      particles: [],
      projectiles: [],
      selectedAction: 'turret', // 'turret', 'artillery', 'cryo', 'repair'
      hoveredRing: null,
      hoveredZombie: null,
      activeTab: 'dailies',
      battleLogs: []
    };
    
    this.ringCount = 10;
    this.audioCtx = null;
  }

  // ==========================================
  // INITIALIZATION
  // ==========================================
  init() {
    this.canvas = document.getElementById('defenseCanvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    
    // Ensure GameState is loaded
    if (typeof loadGameState === 'function') {
      try { loadGameState(); } catch (e) { }
    }
    
    // Ensure starter tasks exist
    if (typeof TaskManager !== 'undefined' && typeof TaskManager.ensureStarterTasks === 'function') {
      try { TaskManager.ensureStarterTasks(); } catch (e) { }
    }

    this.loadDefenseState();
    this.bindEvents();
    this.resizeCanvas();
    this.renderHUD();
    this.renderTasks();
    
    if (this.state.zombies.length === 0) {
      this.spawnWave(this.state.day);
    }
    
    this.lastTime = performance.now();
    this.loop = this.loop.bind(this);
    this.animationFrameId = requestAnimationFrame(this.loop);
    
    this.log(`Tactical defense grid active. Day ${this.state.day} initialized.`);
  }

  // ==========================================
  // AUDIO SYNTHESIS
  // ==========================================
  playSound(type) {
    try {
      if (!this.audioCtx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) this.audioCtx = new AudioCtx();
      }
      if (!this.audioCtx) return;
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      
      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      
      if (type === 'laser') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(650, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.12);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      } else if (type === 'explosion') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(35, now + 0.3);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'cryo') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.linearRampToValueAtTime(800, now + 0.2);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      } else if (type === 'reward') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(660, now + 0.08);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.22);
        osc.start(now);
        osc.stop(now + 0.22);
      }
    } catch (e) { }
  }

  // ==========================================
  // STATE PERSISTENCE
  // ==========================================
  saveDefenseState() {
    try {
      const data = {
        day: this.state.day,
        base: this.state.base,
        zombies: this.state.zombies
      };
      localStorage.setItem('nemesis_defense_data', JSON.stringify(data));
      if (typeof saveGameState === 'function') {
        saveGameState();
      }
    } catch (e) { }
  }

  loadDefenseState() {
    try {
      const raw = localStorage.getItem('nemesis_defense_data');
      if (raw) {
        const data = JSON.parse(raw);
        if (data.day) this.state.day = data.day;
        if (data.base) this.state.base = Object.assign(this.state.base, data.base);
        if (Array.isArray(data.zombies)) this.state.zombies = data.zombies;
      }
    } catch (e) { }
  }

  // ==========================================
  // ZOMBIE & RADAR MECHANICS
  // ==========================================
  spawnWave(day) {
    const count = 3 + Math.floor(day * 1.5);
    const types = [
      { name: 'Walker', hp: 40, damage: 10, color: '#10b981', size: 9 },
      { name: 'Sprinter', hp: 25, damage: 15, color: '#f59e0b', size: 8 },
      { name: 'Brute', hp: 90, damage: 25, color: '#ef4444', size: 13 }
    ];
    
    if (day >= 4) {
      types.push({ name: 'Colossus', hp: 200, damage: 45, color: '#dc2626', size: 16 });
    }

    for (let i = 0; i < count; i++) {
      const t = types[Math.floor(Math.random() * types.length)];
      const angle = Math.random() * Math.PI * 2;
      
      this.state.zombies.push({
        id: 'z_' + Math.random().toString(36).substr(2, 9),
        name: t.name,
        ring: 10,
        angle: angle,
        hp: t.hp,
        maxHp: t.hp,
        damage: t.damage,
        frozen: false,
        color: t.color,
        size: t.size
      });
    }
    
    this.saveDefenseState();
    this.showBanner(`⚠️ Wave Incoming: ${count} hostiles detected at Ring 10`);
  }

  executeDailyCheckIn() {
    const gameState = typeof getGameState === 'function' ? getGameState() : null;
    let breachDamage = 0;
    let survivedZombies = [];
    
    // 1. Advance active zombies
    this.state.zombies.forEach(z => {
      if (z.frozen) {
        z.frozen = false;
        survivedZombies.push(z);
        this.log(`Target ${z.name} was frozen and held position.`);
      } else {
        z.ring -= 1;
        if (z.ring <= 0) {
          breachDamage += z.damage;
          this.createExplosion(0, 0, '#ef4444', 30);
          this.log(`⚠️ Breached: ${z.name} dealt ${z.damage} damage to Citadel.`);
        } else {
          survivedZombies.push(z);
        }
      }
    });

    this.state.zombies = survivedZombies;

    // 2. Base damage calculation
    if (breachDamage > 0) {
      if (this.state.base.shield > 0) {
        const absorb = Math.min(this.state.base.shield, breachDamage);
        this.state.base.shield -= absorb;
        breachDamage -= absorb;
      }
      if (breachDamage > 0) {
        this.state.base.hp = Math.max(0, this.state.base.hp - breachDamage);
      }
      this.playSound('explosion');
    }

    // 3. Increment Day & Refresh Player AP
    this.state.day += 1;
    if (gameState && gameState.playerState) {
      const maxAp = gameState.playerState.maxAp || 100;
      gameState.playerState.ap = maxAp;
      gameState.playerState.gold = (gameState.playerState.gold || 0) + 20;
    }

    // 4. Reset dailies completion for new day via TaskManager
    if (typeof TaskManager !== 'undefined' && typeof TaskManager.resetDailies === 'function') {
      try { TaskManager.resetDailies(); } catch (e) { }
    }

    // 5. Spawn new perimeter wave
    this.spawnWave(this.state.day);

    // 6. Emit eventBus checkin event
    if (gameState && gameState.eventBus) {
      gameState.eventBus.emit(EVENTS.CHECK_IN_COMPLETE, { day: this.state.day });
    }

    this.saveDefenseState();
    this.renderHUD();
    this.renderTasks();
    this.showBanner(`🌅 Day ${this.state.day} Check-In Complete! Full AP Restored.`);
  }

  // ==========================================
  // TACTICAL ACTIONS
  // ==========================================
  getPlayerAp() {
    const gameState = typeof getGameState === 'function' ? getGameState() : null;
    return gameState?.playerState?.ap || 0;
  }

  spendPlayerAp(amount) {
    const gameState = typeof getGameState === 'function' ? getGameState() : null;
    if (!gameState || !gameState.playerState) return false;
    if ((gameState.playerState.ap || 0) < amount) return false;
    
    gameState.playerState.ap -= amount;
    this.renderHUD();
    return true;
  }

  fireTurret(targetZombie = null) {
    if (!targetZombie) {
      if (this.state.zombies.length === 0) {
        this.showBanner('No active hostiles in radar range');
        return;
      }
      targetZombie = this.state.zombies.slice().sort((a, b) => a.ring - b.ring)[0];
    }
    
    if (!this.spendPlayerAp(5)) {
      this.showBanner('❌ Insufficient AP (Requires 5 AP)');
      return;
    }

    const dmg = this.state.base.turretPower;
    targetZombie.hp -= dmg;
    this.playSound('laser');

    const center = this.getCenter();
    const targetPos = this.getZombieCoords(targetZombie);
    this.state.projectiles.push({
      x1: center.x,
      y1: center.y,
      x2: targetPos.x,
      y2: targetPos.y,
      progress: 0,
      color: '#0ea5e9'
    });

    this.createExplosion(targetPos.x, targetPos.y, '#0ea5e9', 12);

    if (targetZombie.hp <= 0) {
      this.eliminateZombie(targetZombie);
    }

    this.saveDefenseState();
    this.renderHUD();
  }

  fireArtillery(targetRing = null) {
    let ring = targetRing;
    if (!ring) {
      // Pick innermost ring with hostiles
      const sorted = this.state.zombies.slice().sort((a, b) => a.ring - b.ring);
      ring = sorted.length > 0 ? sorted[0].ring : 10;
    }

    if (!this.spendPlayerAp(15)) {
      this.showBanner('❌ Insufficient AP (Requires 15 AP)');
      return;
    }

    this.playSound('explosion');
    const dmg = this.state.base.artilleryPower;
    const ringZombies = this.state.zombies.filter(z => z.ring === ring);

    ringZombies.forEach(z => {
      z.hp -= dmg;
      const coords = this.getZombieCoords(z);
      this.createExplosion(coords.x, coords.y, '#f59e0b', 20);
      if (z.hp <= 0) {
        this.eliminateZombie(z);
      }
    });

    this.showBanner(`💥 Artillery Barrage struck Ring ${ring} (${ringZombies.length} hit)`);
    this.saveDefenseState();
    this.renderHUD();
  }

  activateCryo(targetRing = null) {
    let ring = targetRing;
    if (!ring) {
      const sorted = this.state.zombies.slice().sort((a, b) => a.ring - b.ring);
      ring = sorted.length > 0 ? sorted[0].ring : 1;
    }

    if (!this.spendPlayerAp(10)) {
      this.showBanner('❌ Insufficient AP (Requires 10 AP)');
      return;
    }

    this.playSound('cryo');
    const ringZombies = this.state.zombies.filter(z => z.ring === ring);
    ringZombies.forEach(z => {
      z.frozen = true;
      const coords = this.getZombieCoords(z);
      this.createExplosion(coords.x, coords.y, '#0ea5e9', 15);
    });

    this.showBanner(`❄️ Cryo Grid engaged at Ring ${ring} (Advance halted)`);
    this.saveDefenseState();
    this.renderHUD();
  }

  repairBase() {
    const gameState = typeof getGameState === 'function' ? getGameState() : null;
    const gold = gameState?.playerState?.gold || 0;
    
    if (gold < 20) {
      this.showBanner('❌ Insufficient Gold (Requires 20 Gold)');
      return;
    }

    gameState.playerState.gold -= 20;
    this.state.base.shield = Math.min(this.state.base.maxShield, this.state.base.shield + 25);
    this.state.base.hp = Math.min(this.state.base.maxHp, this.state.base.hp + 15);

    this.playSound('reward');
    this.showBanner('🛡️ Base Repaired (+25 Shield, +15 Core HP)');
    this.saveDefenseState();
    this.renderHUD();
  }

  eliminateZombie(zombie) {
    const index = this.state.zombies.findIndex(z => z.id === zombie.id);
    if (index !== -1) {
      const coords = this.getZombieCoords(zombie);
      this.createExplosion(coords.x, coords.y, zombie.color, 25);
      this.state.zombies.splice(index, 1);
      
      const gameState = typeof getGameState === 'function' ? getGameState() : null;
      if (gameState && gameState.playerState) {
        gameState.playerState.gold = (gameState.playerState.gold || 0) + 5;
      }
      this.log(`Neutralized ${zombie.name}. +5 Gold.`);
    }
  }

  // ==========================================
  // RADAR CANVAS RENDERING
  // ==========================================
  getCenter() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    return {
      x: rect.width / 2,
      y: rect.height / 2
    };
  }

  getMaxRadius() {
    const center = this.getCenter();
    return Math.min(center.x, center.y) * 0.88;
  }

  getRingRadius(ring) {
    const maxR = this.getMaxRadius();
    const minR = 36;
    return minR + (ring / this.ringCount) * (maxR - minR);
  }

  getZombieCoords(zombie) {
    const center = this.getCenter();
    const r = this.getRingRadius(zombie.ring);
    return {
      x: center.x + Math.cos(zombie.angle) * r,
      y: center.y + Math.sin(zombie.angle) * r
    };
  }

  createExplosion(x, y, color, count = 15) {
    for (let i = 0; i < count; i++) {
      const speed = 1 + Math.random() * 4;
      const angle = Math.random() * Math.PI * 2;
      this.state.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        decay: 0.02 + Math.random() * 0.03,
        size: 2 + Math.random() * 3,
        color: color
      });
    }
  }

  resizeCanvas() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.resetTransform();
    this.ctx.scale(dpr, dpr);
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;
  }

  loop(currentTime) {
    const dt = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;
    
    this.update(dt);
    this.render();
    
    this.animationFrameId = requestAnimationFrame(this.loop);
  }

  update(dt) {
    for (let i = this.state.particles.length - 1; i >= 0; i--) {
      const p = this.state.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;
      if (p.life <= 0) {
        this.state.particles.splice(i, 1);
      }
    }

    for (let i = this.state.projectiles.length - 1; i >= 0; i--) {
      const proj = this.state.projectiles[i];
      proj.progress += dt * 6;
      if (proj.progress >= 1) {
        this.state.projectiles.splice(i, 1);
      }
    }
  }

  render() {
    const ctx = this.ctx;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    
    const center = { x: rect.width / 2, y: rect.height / 2 };
    const maxRadius = this.getMaxRadius();

    // 1. Radar Crosshairs
    ctx.strokeStyle = '#1e2a3c';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(center.x - maxRadius - 10, center.y);
    ctx.lineTo(center.x + maxRadius + 10, center.y);
    ctx.moveTo(center.x, center.y - maxRadius - 10);
    ctx.lineTo(center.x, center.y + maxRadius + 10);
    ctx.stroke();

    // 2. 10 Concentric Rings
    for (let r = 1; r <= this.ringCount; r++) {
      const radius = this.getRingRadius(r);
      const isHovered = this.state.hoveredRing === r;
      
      ctx.beginPath();
      ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
      ctx.strokeStyle = isHovered ? '#0ea5e9' : (r === 1 ? '#7f1d1d' : (r === 10 ? '#2e3f57' : '#162030'));
      ctx.lineWidth = isHovered ? 2 : 1;
      ctx.stroke();

      // Ring index label
      ctx.fillStyle = isHovered ? '#0ea5e9' : '#475569';
      ctx.font = '10px monospace';
      ctx.fillText(`R${r}`, center.x + radius + 4, center.y + 3);
    }

    // 3. Center Base Citadel
    ctx.beginPath();
    ctx.arc(center.x, center.y, 28, 0, Math.PI * 2);
    ctx.fillStyle = '#0d121c';
    ctx.fill();
    ctx.strokeStyle = this.state.base.shield > 0 ? '#0ea5e9' : '#ef4444';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#f1f5f9';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('BASE', center.x, center.y);

    // 4. Projectiles
    ctx.lineWidth = 2;
    this.state.projectiles.forEach(proj => {
      const curX = proj.x1 + (proj.x2 - proj.x1) * proj.progress;
      const curY = proj.y1 + (proj.y2 - proj.y1) * proj.progress;
      ctx.beginPath();
      ctx.moveTo(proj.x1, proj.y1);
      ctx.lineTo(curX, curY);
      ctx.strokeStyle = proj.color;
      ctx.stroke();
    });

    // 5. Hostiles
    this.state.zombies.forEach(z => {
      const coords = this.getZombieCoords(z);
      const isHovered = this.state.hoveredZombie && this.state.hoveredZombie.id === z.id;

      ctx.beginPath();
      ctx.arc(coords.x, coords.y, z.size, 0, Math.PI * 2);
      ctx.fillStyle = z.frozen ? '#0ea5e9' : z.color;
      ctx.fill();
      ctx.strokeStyle = isHovered ? '#ffffff' : '#080b11';
      ctx.lineWidth = isHovered ? 2 : 1;
      ctx.stroke();

      // Health bar
      const barW = z.size * 2.2;
      const barH = 3;
      const hpRatio = Math.max(0, z.hp / z.maxHp);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(coords.x - barW / 2, coords.y - z.size - 6, barW, barH);
      ctx.fillStyle = hpRatio > 0.5 ? '#10b981' : '#ef4444';
      ctx.fillRect(coords.x - barW / 2, coords.y - z.size - 6, barW * hpRatio, barH);

      if (z.frozen) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px sans-serif';
        ctx.fillText('❄', coords.x, coords.y);
      }
    });

    // 6. Particles
    this.state.particles.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life;
      ctx.fill();
      ctx.globalAlpha = 1.0;
    });
  }

  // ==========================================
  // EVENT BINDINGS
  // ==========================================
  bindEvents() {
    window.addEventListener('resize', () => {
      this.resizeCanvas();
    });

    // Action Deck cards
    document.querySelectorAll('.action-card').forEach(card => {
      card.addEventListener('click', () => {
        const action = card.dataset.action;
        this.state.selectedAction = action;
        document.querySelectorAll('.action-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');

        if (action === 'repair') {
          this.repairBase();
        } else if (action === 'turret') {
          this.fireTurret();
        } else if (action === 'artillery') {
          this.fireArtillery();
        } else if (action === 'cryo') {
          this.activateCryo();
        }
      });
    });

    // Canvas click interaction
    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      const center = this.getCenter();

      // Click on zombie
      for (const z of this.state.zombies) {
        const coords = this.getZombieCoords(z);
        if (Math.hypot(clickX - coords.x, clickY - coords.y) <= z.size + 6) {
          if (this.state.selectedAction === 'turret') {
            this.fireTurret(z);
          } else if (this.state.selectedAction === 'artillery') {
            this.fireArtillery(z.ring);
          } else if (this.state.selectedAction === 'cryo') {
            this.activateCryo(z.ring);
          }
          return;
        }
      }

      // Click on ring
      const dist = Math.hypot(clickX - center.x, clickY - center.y);
      const maxR = this.getMaxRadius();
      if (dist >= 36 && dist <= maxR) {
        const ring = Math.min(10, Math.max(1, Math.ceil(((dist - 36) / (maxR - 36)) * this.ringCount)));
        if (this.state.selectedAction === 'artillery') {
          this.fireArtillery(ring);
        } else if (this.state.selectedAction === 'cryo') {
          this.activateCryo(ring);
        } else if (this.state.selectedAction === 'turret') {
          this.fireTurret();
        }
      }
    });

    // Canvas hover
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const center = this.getCenter();

      let found = null;
      for (const z of this.state.zombies) {
        const coords = this.getZombieCoords(z);
        if (Math.hypot(mouseX - coords.x, mouseY - coords.y) <= z.size + 6) {
          found = z;
          break;
        }
      }
      this.state.hoveredZombie = found;

      const dist = Math.hypot(mouseX - center.x, mouseY - center.y);
      const maxR = this.getMaxRadius();
      if (dist >= 36 && dist <= maxR) {
        this.state.hoveredRing = Math.min(10, Math.max(1, Math.ceil(((dist - 36) / (maxR - 36)) * this.ringCount)));
      } else {
        this.state.hoveredRing = null;
      }
    });

    // Check In button
    const checkInBtn = document.getElementById('checkInBtn');
    if (checkInBtn) {
      checkInBtn.addEventListener('click', () => this.executeDailyCheckIn());
    }

    // Panel tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.state.activeTab = btn.dataset.tab;
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.renderTasks();
      });
    });

    // Add Task Button
    const addTaskBtn = document.getElementById('addTaskBtn');
    if (addTaskBtn) {
      addTaskBtn.addEventListener('click', () => this.openAddTaskModal());
    }

    // Modal close & save
    const closeModalBtn = document.getElementById('closeModalBtn');
    if (closeModalBtn) {
      closeModalBtn.addEventListener('click', () => this.closeModal());
    }
    const saveTaskBtn = document.getElementById('saveTaskBtn');
    if (saveTaskBtn) {
      saveTaskBtn.addEventListener('click', () => this.saveNewTask());
    }
  }

  // ==========================================
  // HUD & TASKS RENDERING
  // ==========================================
  renderHUD() {
    const gameState = typeof getGameState === 'function' ? getGameState() : null;
    const ap = gameState?.playerState?.ap || 0;
    const maxAp = gameState?.playerState?.maxAp || 100;
    const gold = gameState?.playerState?.gold || 0;

    const elDay = document.getElementById('hudDay');
    const elHp = document.getElementById('hudHp');
    const elShield = document.getElementById('hudShield');
    const elAp = document.getElementById('hudAp');
    const elGold = document.getElementById('hudGold');

    if (elDay) elDay.textContent = `Day ${this.state.day}`;
    if (elHp) elHp.textContent = `${this.state.base.hp}/${this.state.base.maxHp}`;
    if (elShield) elShield.textContent = `${this.state.base.shield}/${this.state.base.maxShield}`;
    if (elAp) elAp.textContent = `${ap}/${maxAp}`;
    if (elGold) elGold.textContent = `${gold}g`;
  }

  renderTasks() {
    const container = document.getElementById('tasksList');
    if (!container) return;

    const gameState = typeof getGameState === 'function' ? getGameState() : null;
    if (!gameState || !gameState.dailiesState) return;

    container.innerHTML = '';

    if (this.state.activeTab === 'dailies') {
      const dailies = gameState.dailiesState.dailies || [];
      if (dailies.length === 0) {
        container.innerHTML = '<div style="color:var(--text-muted); text-align:center; padding:24px;">No daily directives. Click + Add to initialize.</div>';
        return;
      }

      dailies.forEach(d => {
        const streak = typeof TaskManager !== 'undefined' && typeof TaskManager.computeDailyStreak === 'function'
          ? TaskManager.computeDailyStreak(d.id)
          : 0;

        const maxCompletions = d.maxCompletionsPerDay || 1;
        const completionsToday = d.completionsToday || 0;

        const card = document.createElement('div');
        card.className = `task-card ${d.completed ? 'completed' : ''}`;
        card.innerHTML = `
          <div class="task-main-row">
            <div class="task-left">
              <div class="task-checkbox ${d.completed ? 'checked' : ''}">${d.completed ? '✓' : ''}</div>
              <div class="task-info">
                <span class="task-name">${d.name}</span>
                <div class="task-badges">
                  <span class="badge badge-attr">${d.attribute || 'RESP'}</span>
                  <span class="badge badge-diff">${d.difficulty || 'Medium'}</span>
                  ${streak > 0 ? `<span class="badge badge-streak">🔥 ${streak}d</span>` : ''}
                  ${maxCompletions > 1 ? `<span class="badge">${completionsToday}/${maxCompletions}</span>` : ''}
                  ${d.bloodOathActive ? `<span class="badge badge-blood">☠️ OATH</span>` : ''}
                </div>
              </div>
            </div>
            <div class="task-actions">
              <button class="btn-icon btn-oath-toggle" title="Toggle Blood Oath">${d.bloodOathActive ? '☠️' : '🩸'}</button>
              <button class="btn-icon btn-delete-task" title="Delete">🗑️</button>
            </div>
          </div>
        `;

        card.querySelector('.task-checkbox').addEventListener('click', (e) => {
          e.stopPropagation();
          if (typeof TaskManager !== 'undefined') {
            if (d.completed) {
              TaskManager.uncompleteDaily(d.id);
            } else {
              TaskManager.completeDaily(d.id);
              this.playSound('reward');
              this.showBanner(`✨ Completed Daily: ${d.name}!`);
            }
            this.saveDefenseState();
            this.renderTasks();
            this.renderHUD();
          }
        });

        card.querySelector('.btn-oath-toggle').addEventListener('click', (e) => {
          e.stopPropagation();
          if (typeof TaskManager !== 'undefined' && typeof TaskManager.toggleBloodOath === 'function') {
            TaskManager.toggleBloodOath(d.id);
            this.renderTasks();
          }
        });

        card.querySelector('.btn-delete-task').addEventListener('click', (e) => {
          e.stopPropagation();
          if (typeof TaskManager !== 'undefined' && typeof TaskManager.removeDaily === 'function') {
            TaskManager.removeDaily(d.id);
            this.saveDefenseState();
            this.renderTasks();
            this.renderHUD();
          }
        });

        container.appendChild(card);
      });
    } else if (this.state.activeTab === 'todos') {
      const todos = gameState.dailiesState.todos || [];
      if (todos.length === 0) {
        container.innerHTML = '<div style="color:var(--text-muted); text-align:center; padding:24px;">No active to-dos. Click + Add to initialize.</div>';
        return;
      }

      todos.forEach(t => {
        const card = document.createElement('div');
        card.className = `task-card ${t.completed ? 'completed' : ''}`;
        
        let subtasksHtml = '';
        if (Array.isArray(t.subtasks) && t.subtasks.length > 0) {
          subtasksHtml = `<div class="subtasks-container">` + t.subtasks.map((st, i) => {
            const isDone = Boolean(t.subtasksCompleted && t.subtasksCompleted[i]);
            return `
              <div class="subtask-item">
                <div class="subtask-checkbox ${isDone ? 'checked' : ''}" data-index="${i}">${isDone ? '✓' : ''}</div>
                <span>${typeof st === 'string' ? st : st.name || 'Subtask'}</span>
              </div>
            `;
          }).join('') + `</div>`;
        }

        card.innerHTML = `
          <div class="task-main-row">
            <div class="task-left">
              <div class="task-checkbox ${t.completed ? 'checked' : ''}">${t.completed ? '✓' : ''}</div>
              <div class="task-info">
                <span class="task-name">${t.name}</span>
                <div class="task-badges">
                  <span class="badge badge-attr">${t.attribute || 'RESP'}</span>
                  <span class="badge badge-diff">${t.difficulty || 'Medium'}</span>
                </div>
              </div>
            </div>
            <div class="task-actions">
              <button class="btn-icon btn-delete-task" title="Delete">🗑️</button>
            </div>
          </div>
          ${subtasksHtml}
        `;

        card.querySelector('.task-checkbox').addEventListener('click', (e) => {
          e.stopPropagation();
          if (typeof TaskManager !== 'undefined') {
            if (t.completed) {
              TaskManager.uncompleteTodo(t.id);
            } else {
              TaskManager.completeTodo(t.id);
              this.playSound('reward');
              this.showBanner(`✨ Completed To-Do: ${t.name}!`);
            }
            this.saveDefenseState();
            this.renderTasks();
            this.renderHUD();
          }
        });

        // Subtask clicks
        card.querySelectorAll('.subtask-checkbox').forEach(box => {
          box.addEventListener('click', (e) => {
            e.stopPropagation();
            const idx = parseInt(box.dataset.index, 10);
            if (typeof TaskManager !== 'undefined') {
              if (box.classList.contains('checked')) {
                TaskManager.uncompleteSubtask(t.id, idx);
              } else {
                TaskManager.completeSubtask(t.id, idx);
              }
              this.renderTasks();
            }
          });
        });

        card.querySelector('.btn-delete-task').addEventListener('click', (e) => {
          e.stopPropagation();
          if (typeof TaskManager !== 'undefined' && typeof TaskManager.removeTodo === 'function') {
            TaskManager.removeTodo(t.id);
            this.saveDefenseState();
            this.renderTasks();
            this.renderHUD();
          }
        });

        container.appendChild(card);
      });
    } else if (this.state.activeTab === 'upgrades') {
      this.renderArsenal(container);
    } else if (this.state.activeTab === 'logs') {
      this.renderLogs(container);
    }
  }

  renderArsenal(container) {
    const upgrades = [
      { name: 'Turret Overcharge', desc: '+15 Turret DMG', cost: 30, action: () => { this.state.base.turretPower += 15; } },
      { name: 'Artillery Payload', desc: '+20 Artillery DMG', cost: 45, action: () => { this.state.base.artilleryPower += 20; } },
      { name: 'Shield Capacitor', desc: '+25 Max Shield', cost: 40, action: () => { this.state.base.maxShield += 25; this.state.base.shield += 25; } },
      { name: 'Core Reinforcement', desc: '+30 Max HP', cost: 50, action: () => { this.state.base.maxHp += 30; this.state.base.hp += 30; } }
    ];

    upgrades.forEach(u => {
      const item = document.createElement('div');
      item.className = 'task-card';
      item.innerHTML = `
        <div class="task-main-row">
          <div class="task-left">
            <div class="task-info">
              <span class="task-name">${u.name}</span>
              <div class="task-badges">
                <span class="badge badge-attr">${u.desc}</span>
                <span class="badge badge-diff">${u.cost} Gold</span>
              </div>
            </div>
          </div>
          <div class="task-actions">
            <button class="btn-tactical btn-buy-upgrade">Upgrade</button>
          </div>
        </div>
      `;

      item.querySelector('.btn-buy-upgrade').addEventListener('click', () => {
        const gameState = typeof getGameState === 'function' ? getGameState() : null;
        const gold = gameState?.playerState?.gold || 0;
        if (gold >= u.cost) {
          gameState.playerState.gold -= u.cost;
          u.action();
          this.playSound('reward');
          this.showBanner(`🎉 Upgraded: ${u.name}!`);
          this.saveDefenseState();
          this.renderHUD();
        } else {
          this.showBanner('❌ Insufficient Gold');
        }
      });

      container.appendChild(item);
    });
  }

  renderLogs(container) {
    if (this.state.battleLogs.length === 0) {
      container.innerHTML = '<div style="color:var(--text-muted); text-align:center; padding:24px;">No log records.</div>';
      return;
    }

    this.state.battleLogs.forEach(l => {
      const div = document.createElement('div');
      div.className = 'log-entry';
      div.textContent = l;
      container.appendChild(div);
    });
  }

  // ==========================================
  // MODAL / ADD TASK
  // ==========================================
  openAddTaskModal() {
    const modal = document.getElementById('taskModal');
    if (modal) modal.removeAttribute('hidden');
    const input = document.getElementById('taskNameInput');
    if (input) input.focus();
  }

  closeModal() {
    const modal = document.getElementById('taskModal');
    if (modal) modal.setAttribute('hidden', '');
  }

  saveNewTask() {
    const nameInput = document.getElementById('taskNameInput');
    const typeSelect = document.getElementById('taskTypeSelect');
    const attrSelect = document.getElementById('taskAttrSelect');
    const diffSelect = document.getElementById('taskDiffSelect');

    const name = nameInput.value.trim();
    if (!name) return;

    const type = typeSelect.value;
    const attr = attrSelect.value;
    const diff = diffSelect.value;

    if (typeof TaskManager !== 'undefined') {
      if (type === 'daily') {
        TaskManager.addDaily(name, diff, attr);
      } else {
        TaskManager.addTodo(name, diff, attr);
      }
    }

    nameInput.value = '';
    this.closeModal();
    this.renderTasks();
    this.renderHUD();
  }

  showBanner(msg) {
    const banner = document.getElementById('battleBanner');
    if (banner) {
      banner.textContent = msg;
      banner.style.opacity = '1';
      setTimeout(() => {
        banner.style.opacity = '0';
      }, 3200);
    }
  }

  log(msg) {
    this.state.battleLogs.unshift(`[D${this.state.day}] ${msg}`);
    if (this.state.battleLogs.length > 50) this.state.battleLogs.pop();
  }
}

// Global bootstrap
window.addEventListener('DOMContentLoaded', () => {
  window.defenseGame = new DefenseGame();
  window.defenseGame.init();
});
