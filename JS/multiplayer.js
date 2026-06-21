// multiplayer.js - Firebase Realtime Database Integration for Tycoon Mode Multiplayer
(function() {
  // Default Demo Firebase credentials
  const DEFAULT_FIREBASE_CONFIG = {
    apiKey: "AIzaSyAs-DemoApiKeyForNemesisUltimateRoguelike",
    authDomain: "nemesis-multiplayer-demo.firebaseapp.com",
    databaseURL: "https://nemesis-multiplayer-demo-default-rtdb.firebaseio.com",
    projectId: "nemesis-multiplayer-demo",
    storageBucket: "nemesis-multiplayer-demo.appspot.com",
    messagingSenderId: "1234567890",
    appId: "1:1234567890:web:abcdef123456"
  };

  class MultiplayerManager {
    constructor() {
      this.db = null;
      this.worldName = null;
      this.playerName = localStorage.getItem('nemesis_multiplayer_player_name') || 'Farmer_' + Math.floor(Math.random() * 1000);
      this.isConnected = false;
      this.passwordHash = null;
      this.listeners = {};
      this.tickInterval = null;
      
      // Load custom firebase config if available
      this.firebaseConfig = null;
      try {
        const savedConfig = localStorage.getItem('nemesis_firebase_config');
        if (savedConfig) {
          this.firebaseConfig = JSON.parse(savedConfig);
        }
      } catch (e) {
        console.warn("Failed to load custom Firebase config", e);
      }
      if (!this.firebaseConfig) {
        this.firebaseConfig = DEFAULT_FIREBASE_CONFIG;
      }
    }

    async init() {
      if (typeof firebase === 'undefined') {
        console.warn("Firebase SDK is not loaded. Cannot initialize multiplayer.");
        return false;
      }
      
      // Initialize Firebase App if not already initialized
      try {
        if (firebase.apps.length === 0) {
          firebase.initializeApp(this.firebaseConfig);
        }
        this.db = firebase.database();
        return true;
      } catch (e) {
        console.error("Firebase initialization failed:", e);
        return false;
      }
    }

    async hashPassword(password) {
      const msgBuffer = new TextEncoder().encode(password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    promiseWithTimeout(promise, ms, errorMsg) {
      const timeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(errorMsg || "Operation timed out.")), ms);
      });
      return Promise.race([promise, timeout]);
    }

    async joinWorld(worldName, password, playerName) {
      if (!worldName || !password || !playerName) {
        throw new Error("World Name, Password, and Player Name are required.");
      }

      this.playerName = playerName;
      localStorage.setItem('nemesis_multiplayer_player_name', playerName);
      
      const success = await this.init();
      if (!success) {
        throw new Error("Failed to connect to Firebase. Check your settings / connection.");
      }

      const worldRef = this.db.ref(`worlds/${worldName}`);
      const passHash = await this.hashPassword(password);
      this.passwordHash = passHash;
      this.worldName = worldName;

      // Check if world already exists with a 5-second timeout
      const snapshot = await this.promiseWithTimeout(
        worldRef.child('passwordHash').once('value'),
        5000,
        "Connection timed out. Check your Internet connection or Firebase credentials."
      );
      const existingHash = snapshot.val();

      if (existingHash === null) {
        // World doesn't exist. Create it!
        const initialData = {
          passwordHash: passHash,
          resources: {
            gold: window.TycoonManager.resources.gold || 100,
            ap: window.TycoonManager.resources.ap || 0,
            food: window.TycoonManager.resources.food || 0,
            lastTickTime: Date.now()
          },
          farmers: window.TycoonManager.farmers || [],
          chunks: {}
        };

        // Convert chunks TypedArrays to normal arrays
        for (const k in window.TycoonManager.chunks) {
          initialData.chunks[k] = Array.from(window.TycoonManager.chunks[k]);
        }

        await this.promiseWithTimeout(
          worldRef.set(initialData),
          5000,
          "Failed to create world. Connection timed out."
        );
        this.addLogEntry(`${playerName} created the world.`);
      } else {
        // Verify password
        if (existingHash !== passHash) {
          this.worldName = null;
          this.passwordHash = null;
          throw new Error("Invalid password for this world.");
        }
        this.addLogEntry(`${playerName} joined the world.`);
      }

      this.isConnected = true;
      localStorage.setItem('nemesis_multiplayer_active_world', worldName);
      
      // Notify tycoon worker to run in multiplayer mode (ignore local resource growth ticks)
      if (window.TycoonManager && window.TycoonManager.worker) {
        window.TycoonManager.worker.postMessage({
          type: 'set_multiplayer_mode',
          isMultiplayer: true
        });
      }

      // Start listening to database updates
      this.subscribeToWorldUpdates();

      // Start transaction-based tick loop (runs every 2 seconds)
      if (this.tickInterval) clearInterval(this.tickInterval);
      this.tickInterval = setInterval(() => this.runSharedTick(), 2000);

      return true;
    }

    disconnect() {
      if (!this.isConnected) return;
      
      this.addLogEntry(`${this.playerName} left the world.`);
      
      // Turn off listeners
      if (this.db && this.worldName) {
        this.db.ref(`worlds/${this.worldName}/chunks`).off();
        this.db.ref(`worlds/${this.worldName}/farmers`).off();
        this.db.ref(`worlds/${this.worldName}/resources`).off();
        this.db.ref(`worlds/${this.worldName}/log`).off();
      }

      if (this.tickInterval) {
        clearInterval(this.tickInterval);
        this.tickInterval = null;
      }

      this.isConnected = false;
      this.worldName = null;
      this.passwordHash = null;
      localStorage.removeItem('nemesis_multiplayer_active_world');

      // Re-enable tycoon worker normal simulation mode
      if (window.TycoonManager && window.TycoonManager.worker) {
        window.TycoonManager.worker.postMessage({
          type: 'set_multiplayer_mode',
          isMultiplayer: false
        });
      }
      
      if (window.TycoonManager) {
        window.TycoonManager.addNotification("🚪 Disconnected from multiplayer.");
        window.TycoonManager.updateHUD();
      }
      
      this.updateMultiplayerUI();
    }

    subscribeToWorldUpdates() {
      const worldRef = this.db.ref(`worlds/${this.worldName}`);

      // 1. Chunks updates
      worldRef.child('chunks').on('value', (snapshot) => {
        if (!this.isConnected) return;
        const dbChunks = snapshot.val() || {};
        const oldKeys = Object.keys(window.TycoonManager.chunks);
        
        // Load chunks
        for (const k in dbChunks) {
          window.TycoonManager.chunks[k] = new Int32Array(dbChunks[k]);
        }
        
        // Remove chunks that no longer exist
        oldKeys.forEach(k => {
          if (!dbChunks[k]) {
            delete window.TycoonManager.chunks[k];
          }
        });
        
        // Update local tycoon worker's chunk state
        if (window.TycoonManager.worker) {
          window.TycoonManager.worker.postMessage({
            type: 'sync_state',
            chunks: dbChunks
          });
        }
      });

      // 2. Farmers updates
      worldRef.child('farmers').on('value', (snapshot) => {
        if (!this.isConnected) return;
        const dbFarmers = snapshot.val() || [];
        
        // Preserve local visual coordinates for smoothness
        const visualCoords = {};
        window.TycoonManager.farmers.forEach(f => {
          if (f.visualX !== undefined && f.visualY !== undefined) {
            visualCoords[f.id] = { vx: f.visualX, vy: f.visualY };
          }
        });

        window.TycoonManager.farmers = dbFarmers;
        
        // Apply visual coordinates back
        window.TycoonManager.farmers.forEach(f => {
          if (visualCoords[f.id]) {
            f.visualX = visualCoords[f.id].vx;
            f.visualY = visualCoords[f.id].vy;
          }
        });

        // Update tycoon worker's farmers state
        if (window.TycoonManager.worker) {
          window.TycoonManager.worker.postMessage({
            type: 'sync_state',
            farmers: dbFarmers
          });
        }
      });

      // 3. Resources updates
      worldRef.child('resources').on('value', (snapshot) => {
        if (!this.isConnected) return;
        const res = snapshot.val();
        if (res) {
          window.TycoonManager.resources.gold = res.gold || 0;
          window.TycoonManager.resources.ap = res.ap || 0;
          window.TycoonManager.resources.food = res.food || 0;
          window.TycoonManager.updateHUD();
          
          if (window.TycoonManager.worker) {
            window.TycoonManager.worker.postMessage({
              type: 'sync_state',
              resources: {
                gold: res.gold || 0,
                ap: res.ap || 0,
                food: res.food || 0
              }
            });
          }
        }
      });

      // 4. Log updates
      worldRef.child('log').orderByChild('timestamp').limitToLast(40).on('value', (snapshot) => {
        if (!this.isConnected) return;
        const logs = [];
        snapshot.forEach(child => {
          logs.unshift(child.val());
        });
        this.renderLogsList(logs);
      });
    }

    async runSharedTick() {
      if (!this.isConnected || !this.worldName) return;

      const resRef = this.db.ref(`worlds/${this.worldName}/resources`);
      try {
        await resRef.transaction((current) => {
          if (!current) return current;
          const now = Date.now();
          const lastTime = current.lastTickTime || now;
          const elapsed = Math.floor((now - lastTime) / 1000);
          
          if (elapsed >= 1) {
            const yields = this.calculateYieldsForElapsed(elapsed);
            current.gold = Math.max(0, (current.gold || 100) + yields.gold);
            current.ap = (current.ap || 0) + yields.ap;
            current.food = (current.food || 0) + yields.food;
            current.lastTickTime = now;
          }
          return current;
        });
      } catch (e) {
        console.warn("Shared transaction tick conflict/failure:", e);
      }
    }

    calculateYieldsForElapsed(elapsedSeconds) {
      let goldProduced = 0;
      let apProduced = 0;
      let foodProduced = 0;
      
      const TILE_TYPES = { PRODUCER: 5, INCREASER: 6, MAINTENANCE: 7 };
      const CROP_TEMPLATES = [
        { gold: 0.02, ap: 0.01, food: 0.0005 },
        { gold: 0.02, ap: 0.02, food: 0.0006 },
        { gold: 0.03, ap: 0.01, food: 0.0007 },
        { gold: 0.03, ap: 0.03, food: 0.0008 },
        { gold: 0.04, ap: 0.02, food: 0.0009 },
        { gold: 0.04, ap: 0.04, food: 0.0010 },
        { gold: 0.05, ap: 0.03, food: 0.0011 },
        { gold: 0.05, ap: 0.05, food: 0.0012 },
        { gold: 0.06, ap: 0.04, food: 0.0013 },
        { gold: 0.06, ap: 0.06, food: 0.0014 },
        { gold: 0.07, ap: 0.05, food: 0.0015 },
        { gold: 0.07, ap: 0.07, food: 0.0016 },
        { gold: 0.08, ap: 0.06, food: 0.0017 },
        { gold: 0.08, ap: 0.08, food: 0.0018 },
        { gold: 0.09, ap: 0.07, food: 0.0019 },
        { gold: 0.09, ap: 0.09, food: 0.0020 },
        { gold: 0.10, ap: 0.08, food: 0.0021 },
        { gold: 0.12, ap: 0.10, food: 0.0022 }
      ];

      // Collect multipliers
      const fertilizers = [];
      const farmers = window.TycoonManager.farmers || [];
      const chunks = window.TycoonManager.chunks || {};
      
      for (const key in chunks) {
        const coords = key.split(",");
        const cx = parseInt(coords[0]);
        const cy = parseInt(coords[1]);
        const arr = chunks[key];
        
        for (let idx = 0; idx < 1024; idx++) {
          if ((arr[idx] & 0xFF) === TILE_TYPES.INCREASER) {
            fertilizers.push({
              x: cx * 32 + (idx % 32),
              y: cy * 32 + Math.floor(idx / 32)
            });
          }
        }
      }

      // Calculate production of crops
      for (const key in chunks) {
        const coords = key.split(",");
        const cx = parseInt(coords[0]);
        const cy = parseInt(coords[1]);
        const arr = chunks[key];
        
        for (let idx = 0; idx < 1024; idx++) {
          const tile = arr[idx];
          if ((tile & 0xFF) === TILE_TYPES.PRODUCER) {
            const charge = (tile >> 8) & 0xFF;
            const subType = (tile >> 24) & 0xFF;
            
            if (charge > 0) {
              const gx = cx * 32 + (idx % 32);
              const gy = cy * 32 + Math.floor(idx / 32);
              
              const cropIdx = (subType >= 1 && subType <= 18) ? (subType - 1) : 0;
              const crop = CROP_TEMPLATES[cropIdx];
              
              // Fertilizer boost (+20% per adjacent fertilizer)
              let localFertilizers = 0;
              fertilizers.forEach(f => {
                if (Math.max(Math.abs(gx - f.x), Math.abs(gy - f.y)) <= 3) {
                  localFertilizers++;
                }
              });
              let multiplier = 1.0 + (localFertilizers * 0.20);
              
              // Farmer boost
              let farmerAdd = 0;
              farmers.forEach(farmer => {
                if (!farmer.isSleeping && Math.max(Math.abs(gx - farmer.x), Math.abs(gy - farmer.y)) <= 2) {
                  const sub = farmer.subType || 1;
                  if (sub === 4) farmerAdd += 0.30; // bunny
                  else if (sub === 8) farmerAdd += 0.50; // owl
                  else if (sub === 10) farmerAdd += 0.40; // lion
                  else farmerAdd += 0.25;
                }
              });
              multiplier += farmerAdd;
              
              // Apply live task completion rate multiplier
              const compRate = window.TycoonManager.calculateCurrentCompletionRate();
              multiplier *= Math.max(0.1, compRate);

              goldProduced += crop.gold * multiplier * elapsedSeconds;
              apProduced += crop.ap * multiplier * elapsedSeconds;
              foodProduced += crop.food * multiplier * elapsedSeconds;
            }
          }
        }
      }

      // Cow passive generation
      farmers.forEach(farmer => {
        if (!farmer.isSleeping && farmer.subType === 9) {
          foodProduced += 0.0005 * elapsedSeconds;
        }
      });

      return {
        gold: goldProduced,
        ap: apProduced,
        food: foodProduced
      };
    }

    async broadcastTileUpdate(x, y, value) {
      if (!this.isConnected) return;
      const cx = Math.floor(x / 32);
      const cy = Math.floor(y / 32);
      const tx = ((x % 32) + 32) % 32;
      const ty = ((y % 32) + 32) % 32;
      const idx = ty * 32 + tx;
      
      await this.db.ref(`worlds/${this.worldName}/chunks/${cx},${cy}/${idx}`).set(value);
    }

    async broadcastFarmerBuy(farmer) {
      if (!this.isConnected) return;
      const snapshot = await this.db.ref(`worlds/${this.worldName}/farmers`).once('value');
      const farmers = snapshot.val() || [];
      farmers.push(farmer);
      await this.db.ref(`worlds/${this.worldName}/farmers`).set(farmers);
    }

    async broadcastFarmersState(farmers) {
      if (!this.isConnected) return;
      await this.db.ref(`worlds/${this.worldName}/farmers`).set(farmers);
    }

    addLogEntry(actionText) {
      if (!this.isConnected || !this.db) return;
      const logRef = this.db.ref(`worlds/${this.worldName}/log`).push();
      logRef.set({
        timestamp: Date.now(),
        player: this.playerName,
        action: actionText
      });
    }

    renderLogsList(logs) {
      const logBody = document.getElementById('tycoon-mp-log-body');
      if (!logBody) return;
      
      logBody.innerHTML = logs.map(l => {
        const time = new Date(l.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        return `<div class="tycoon-mp-log-item"><span class="log-time">[${time}]</span> <strong>${l.player}</strong>: ${l.action}</div>`;
      }).join('');
    }

    updateMultiplayerUI() {
      const joinBtn = document.getElementById('tycoon-mp-toggle-btn');
      if (!joinBtn) return;

      if (this.isConnected) {
        joinBtn.textContent = `🟢 World: ${this.worldName}`;
        joinBtn.style.background = 'rgba(34, 197, 94, 0.2)';
        joinBtn.style.borderColor = 'rgba(34, 197, 94, 0.4)';
        
        // Show collapsible log container
        const logsContainer = document.getElementById('tycoon-mp-log-container');
        if (logsContainer) logsContainer.style.display = 'flex';
      } else {
        joinBtn.textContent = `🌐 Multiplayer`;
        joinBtn.style.background = '';
        joinBtn.style.borderColor = '';
        
        const logsContainer = document.getElementById('tycoon-mp-log-container');
        if (logsContainer) logsContainer.style.display = 'none';
      }
    }

    async buyObject(cost, actionText, onSuccess) {
      if (!this.isConnected) {
        onSuccess();
        return;
      }
      const resRef = this.db.ref(`worlds/${this.worldName}/resources`);
      try {
        const result = await resRef.transaction((current) => {
          if (!current) return current;
          if ((current.gold || 0) < cost) {
            return; // Abort transaction (not enough gold)
          }
          current.gold = Math.max(0, (current.gold || 0) - cost);
          return current;
        });
        if (result.committed) {
          this.addLogEntry(actionText);
          onSuccess();
        } else {
          window.TycoonManager.addFloatingText(window.innerWidth / 2, window.innerHeight / 2, "Need Gold!", "#f87171");
        }
      } catch (e) {
        console.error("Purchase transaction failed", e);
      }
    }

    async sellObject(refund, name, x, y) {
      if (!this.isConnected) return;
      const resRef = this.db.ref(`worlds/${this.worldName}/resources`);
      try {
        await resRef.transaction((current) => {
          if (!current) return current;
          current.gold = (current.gold || 0) + refund;
          return current;
        });
        await this.broadcastTileUpdate(x, y, 1); // 1 is GRASS
        this.addLogEntry(`sold ${name} for ${refund} gold.`);
      } catch (e) {
        console.error("Sell transaction failed", e);
      }
    }

    async gainResources(gold, ap, food, logText) {
      if (!this.isConnected) return;
      const resRef = this.db.ref(`worlds/${this.worldName}/resources`);
      try {
        await resRef.transaction((current) => {
          if (!current) return current;
          current.gold = (current.gold || 0) + gold;
          current.ap = (current.ap || 0) + ap;
          current.food = (current.food || 0) + food;
          return current;
        });
        if (logText) {
          this.addLogEntry(logText);
        }
      } catch (e) {
        console.error("Gain resources transaction failed", e);
      }
    }
  }

  window.MultiplayerManager = new MultiplayerManager();
})();
