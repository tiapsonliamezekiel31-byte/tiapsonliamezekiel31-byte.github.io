// tycoon.js - Tycoon Mode Manager, Canvas Renderer and User Interface
(function() {
  // Tile Consts matching Worker
  const TILE_TYPES = {
    WATER: 0,
    GRASS: 1,
    SAND: 2,
    STONE: 3,
    PATH: 4,
    PRODUCER: 5,
    INCREASER: 6,
    MAINTENANCE: 7,
    COSMETIC: 8
  };

  const PRODUCER_SUBS = {
    TREE: 1,
    TOMATO: 2,
    APPLE: 3
  };

  class TycoonEngine {
    constructor() {
      this.canvas = null;
      this.ctx = null;
      this.worker = null;
      
      // Camera state
      this.camera = {
        x: 0, // world center pixel coordinates
        y: 0,
        zoom: 1.2,
        minZoom: 0.2,
        maxZoom: 4.0
      };
      
      // Tile specifications
      this.tileWidth = 32;
      
      // Interaction state
      this.isPanning = false;
      this.dragStart = { x: 0, y: 0 };
      this.cameraStart = { x: 0, y: 0 };
      
      // Multi-touch gestures for mobile
      this.touchStartDist = 0;
      this.touchStartZoom = 1.0;
      this.touchStartMidpoint = { x: 0, y: 0 };
      this.isTouchPinching = false;
      this.lastTouchPos = { x: 0, y: 0 };
      
      // State data
      this.chunks = {}; // key: "cx,cy" -> Int32Array(1024)
      this.farmers = [];
      this.resources = {
        gold: 100,
        ap: 0,
        food: 0
      };
      this.config = {
        checkInHour: 10,
        completionRatePrevDay: 1.0,
        lastSaveTime: Date.now()
      };
      
      // Tool selection
      this.activeTool = null; // { type: TILE_TYPES, subType: number, name: string, emoji: string, cost: number }
      this.selectedFarmerId = null;
      
      // Path drawing state
      this.isDrawingPath = false;
      this.drawnPath = [];
      
      // Floating text pool
      this.floatingTexts = [];
      
      // Loop control
      this.isRenderLoopRunning = false;
      
      // Load saved state immediately on startup
      this.loadState();
      
      // Initialize systems safely
      if (document.readyState === 'complete' || document.readyState === 'interactive') {
        this.initDOM();
      } else {
        window.addEventListener('DOMContentLoaded', () => this.initDOM());
      }

      // Safeguard against refreshes/unloads (only if tycoon is active)
      window.addEventListener('beforeunload', () => {
        if (localStorage.getItem('nemesis_active_mode') === 'tycoon') {
          this.saveState();
        }
      });
    }

    initDOM() {
      // Create tycoon mode containers dynamically if not present in index.html
      let container = document.getElementById('tycoon-container');
      if (!container) {
        container = document.createElement('div');
        container.id = 'tycoon-container';
        container.innerHTML = `
          <div class="tycoon-header">
            <div class="tycoon-hud-panel">
              <div class="tycoon-stat gold">🪙 <span id="tycoon-gold-val">100</span></div>
              <div class="tycoon-stat ap">⚡ <span id="tycoon-ap-val">0</span></div>
              <div class="tycoon-stat food">🍎 <span id="tycoon-food-val">0</span></div>
              <div class="tycoon-stat rate">📈 <span id="tycoon-rate-val">1g/s</span></div>
            </div>
            <div class="tycoon-hud-panel" style="gap: 8px;">
              <button class="tycoon-btn" id="tycoon-checkin-btn" style="background: rgba(34, 197, 94, 0.2); border-color: rgba(34, 197, 94, 0.4);">🌅 Check In</button>
              <button class="tycoon-btn" id="tycoon-tasks-btn">📋 Tasks</button>
              <button class="tycoon-btn" id="tycoon-settings-btn">⚙️ Settings</button>
              <button class="tycoon-btn exit-btn" id="tycoon-exit-btn">🚪 Back</button>
            </div>
          </div>
          
          <div id="tycoon-active-banner" class="tycoon-active-tool-banner"></div>
          
          <div id="tycoon-viewport-wrapper">
            <canvas id="tycoon-canvas"></canvas>
          </div>
          
          <div class="tycoon-shop-drawer" id="tycoon-shop">
            <div class="tycoon-shop-header">
              <div class="tycoon-shop-title">🧱 BUILD MENU</div>
              <div class="tycoon-shop-tabs" id="tycoon-tabs">
                <button class="tycoon-tab-btn active" data-tab="terrain">Terrain</button>
                <button class="tycoon-tab-btn" data-tab="producers">Crops</button>
                <button class="tycoon-tab-btn" data-tab="tech">Utility</button>
                <button class="tycoon-tab-btn" data-tab="farmers">Farmers</button>
                <button class="tycoon-tab-btn" data-tab="cosmetics">Cosmetics</button>
              </div>
            </div>
            <div class="tycoon-shop-grid" id="tycoon-items-grid"></div>
          </div>
 
          <!-- Dialog / Overlays -->
          <div class="tycoon-overlay" id="tycoon-settings-dialog">
            <div class="tycoon-dialog">
              <h3>⚙️ TYCOON SETTINGS</h3>
              <div class="tycoon-dialog-body">
                <div class="tycoon-form-row">
                  <label for="settings-checkin-hour">Check-In Hour (0-23):</label>
                  <input type="number" id="settings-checkin-hour" min="0" max="23" value="10">
                </div>
                <div style="font-size: 8px; color: #94a3b8; line-height: 1.4; margin-bottom: 12px;">
                  * Sleep cycle ends at this hour. Night begins 8 hours prior.
                </div>
                <div class="tycoon-form-row" style="flex-direction: column; align-items: flex-start; margin-top: 12px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 12px;">
                  <label for="tycoon-cheat-input" style="margin-bottom: 4px;">Cheat Console:</label>
                  <input type="text" id="tycoon-cheat-input" placeholder="e.g. gold 9999" style="width: 100% !important;">
                </div>
                <div class="tycoon-form-row" style="flex-direction: column; align-items: flex-start; margin-top: 12px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 12px; width: 100%;">
                  <label for="tycoon-import-export" style="margin-bottom: 4px;">Save Data (JSON Text):</label>
                  <textarea id="tycoon-import-export" style="width: 100%; height: 50px; background: #0f172a; color: #cbd5e1; border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 6px; font-family: monospace; font-size: 8px; resize: vertical; box-sizing: border-box;"></textarea>
                  <div style="display: flex; gap: 8px; margin-top: 6px; width: 100%;">
                    <button class="tycoon-btn" id="tycoon-export-btn" style="flex: 1; min-height: 28px; font-size: 8px; padding: 4px;">Export Save</button>
                    <button class="tycoon-btn" id="tycoon-import-btn" style="flex: 1; min-height: 28px; font-size: 8px; padding: 4px; background: rgba(59, 130, 246, 0.2); border-color: rgba(59, 130, 246, 0.4);">Import Save</button>
                  </div>
                </div>
              </div>
              <div class="tycoon-dialog-buttons">
                <button class="tycoon-btn" id="settings-save-btn">Save</button>
                <button class="tycoon-btn exit-btn" id="settings-close-btn">Close</button>
              </div>
            </div>
          </div>
 
          <div class="tycoon-overlay" id="tycoon-tasks-dialog">
            <div class="tycoon-dialog" style="width: min(520px, 94vw); max-height: 85vh; overflow-y: auto;">
              <h3>📋 DAILY TASKS & TO-DOS</h3>
              <!-- Character & Base Game Stats Panel -->
              <div id="tycoon-character-panel" style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 8px; font-size: 8px; border: 1px solid rgba(255,255,255,0.1); margin-bottom: 10px; display: flex; flex-direction: column; gap: 6px; pointer-events: auto;">
                <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 4px; font-weight: bold;">
                  <span id="tycoon-char-class" style="color: #ffd700;">Class: -</span>
                  <span id="tycoon-char-level" style="color: #4ade80;">Level: -</span>
                </div>
                <div style="display: flex; flex-wrap: wrap; gap: 8px 12px; color: #cbd5e1;">
                  <div>🪙 Gold: <span id="tycoon-base-gold" style="color: #ffd700; font-weight: bold;">-</span></div>
                  <div>💎 Diamonds: <span id="tycoon-base-diamonds" style="color: #c084fc; font-weight: bold;">-</span></div>
                  <div>⚡ AP: <span id="tycoon-base-ap" style="color: #38bdf8; font-weight: bold;">- / -</span></div>
                </div>
                <div id="tycoon-char-attrs" style="display: flex; flex-wrap: wrap; gap: 4px 10px; font-size: 7px; color: #94a3b8; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 4px;">
                  <!-- Attributes list will go here -->
                </div>
              </div>
              <div class="tycoon-dialog-body" style="display: flex; flex-direction: column; gap: 14px;">
                <!-- Dailies Section -->
                <div>
                  <h4 style="margin: 0 0 6px 0; color: #ffd700; font-size: 10px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 4px;">📅 DAILIES</h4>
                  <div id="tycoon-dailies-list" style="display: flex; flex-direction: column; gap: 6px; max-height: 200px; overflow-y: auto;"></div>
                </div>
                <!-- Todos Section -->
                <div>
                  <h4 style="margin: 0 0 6px 0; color: #ffd700; font-size: 10px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 4px;"> To-Dos</h4>
                  <div id="tycoon-todos-list" style="display: flex; flex-direction: column; gap: 6px; max-height: 200px; overflow-y: auto;"></div>
                </div>
                <!-- Add Task Form -->
                <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 10px;">
                  <h4 style="margin: 0 0 6px 0; color: #ffd700; font-size: 9px;">➕ ADD TASK</h4>
                  <div style="display: flex; flex-direction: column; gap: 6px;">
                    <div style="display: flex; gap: 6px;">
                      <input type="text" id="tycoon-new-task-name" placeholder="Task name..." style="flex: 1; background: #0f172a; border: 1px solid rgba(255,255,255,0.2); color: #fff; padding: 6px; border-radius: 6px; font-family: inherit; font-size: 9px;">
                      <select id="tycoon-new-task-type" style="background: #0f172a; border: 1px solid rgba(255,255,255,0.2); color: #fff; padding: 6px; border-radius: 6px; font-family: inherit; font-size: 9px;">
                        <option value="daily">Daily</option>
                        <option value="todo">To-Do</option>
                      </select>
                    </div>
                    <div style="display: flex; gap: 6px;">
                      <select id="tycoon-new-task-diff" style="flex: 1; background: #0f172a; border: 1px solid rgba(255,255,255,0.2); color: #fff; padding: 6px; border-radius: 6px; font-family: inherit; font-size: 9px;">
                        <option value="Easy">Easy</option>
                        <option value="Medium">Medium</option>
                        <option value="Hard">Hard</option>
                        <option value="Ultra">Ultra</option>
                      </select>
                      <select id="tycoon-new-task-attr" style="flex: 1; background: #0f172a; border: 1px solid rgba(255,255,255,0.2); color: #fff; padding: 6px; border-radius: 6px; font-family: inherit; font-size: 9px;">
                        <option value="STR">STR</option>
                        <option value="INT">INT</option>
                        <option value="DISC">DISC</option>
                        <option value="CREA">CREA</option>
                        <option value="SOC">SOC</option>
                        <option value="CAP">CAP</option>
                        <option value="RESP">RESP</option>
                      </select>
                      <button class="tycoon-btn" id="tycoon-add-task-btn" style="min-height: 28px; padding: 0 10px; font-size: 9px;">Add</button>
                    </div>
                  </div>
                </div>
              </div>
              <div class="tycoon-dialog-buttons">
                <button class="tycoon-btn exit-btn" id="tycoon-tasks-close-btn">Close</button>
              </div>
            </div>
          </div>
 
          <div class="tycoon-overlay" id="tycoon-farmer-dialog">
            <div class="tycoon-dialog">
              <h3 id="farmer-detail-title">🧑‍🌾 Farmer Details</h3>
              <div class="tycoon-dialog-body" id="farmer-detail-body"></div>
              <div class="tycoon-dialog-buttons" id="farmer-detail-buttons"></div>
            </div>
          </div>
        `;
        document.body.appendChild(container);
      }

      this.canvas = document.getElementById('tycoon-canvas');
      this.ctx = this.canvas.getContext('2d');
      
      this.setupInputHandlers();
      this.setupUIHandlers();
    }

    setupInputHandlers() {
      const wrapper = document.getElementById('tycoon-viewport-wrapper');

      // Mouse drag panning
      wrapper.addEventListener('mousedown', (e) => {
        if (e.button === 0) { // Left click
          const tile = this.screenToWorldCoords(e.clientX, e.clientY);
          
          if (this.activeTool) {
            // Place tile or draw path
            if (this.activeTool.type === TILE_TYPES.PATH) {
              if (this.selectedFarmerId) {
                this.isDrawingPath = true;
                this.drawnPath = [{ x: tile.x, y: tile.y }];
              }
            } else {
              this.applyPlacementTool(tile.x, tile.y);
            }
          } else {
            // Normal click: select farmer or inspect buildings
            const clickedFarmer = this.findFarmerAt(tile.x, tile.y);
            if (clickedFarmer) {
              this.showFarmerDetails(clickedFarmer);
            } else {
              this.isPanning = true;
              this.dragStart.x = e.clientX;
              this.dragStart.y = e.clientY;
              this.cameraStart.x = this.camera.x;
              this.cameraStart.y = this.camera.y;
            }
          }
        }
      });

      wrapper.addEventListener('mousemove', (e) => {
        const tile = this.screenToWorldCoords(e.clientX, e.clientY);
        
        if (this.isDrawingPath && this.isDrawingPathActive()) {
          const last = this.drawnPath[this.drawnPath.length - 1];
          if (last && (last.x !== tile.x || last.y !== tile.y)) {
            // Ensure adjacent tile movement
            const dist = Math.max(Math.abs(last.x - tile.x), Math.abs(last.y - tile.y));
            if (dist === 1) {
              // Check path tiles are valid land tiles
              const tileType = this.getTileTypeAt(tile.x, tile.y);
              if (tileType !== TILE_TYPES.WATER) {
                // Limit check based on farmer capacity
                const farm = this.farmers.find(f => f.id === this.selectedFarmerId);
                const limit = farm ? (farm.maxPathLength || 10) : 10;
                
                if (this.drawnPath.length < limit) {
                  this.drawnPath.push({ x: tile.x, y: tile.y });
                  // Temporarily paint local paths (visual helper)
                  this.setTileTypeAt(tile.x, tile.y, TILE_TYPES.PATH);
                  this.postTileUpdateToWorker(tile.x, tile.y, TILE_TYPES.PATH);
                } else {
                  this.addFloatingText(e.clientX, e.clientY, "Path limit reached!", "#f87171");
                }
              }
            }
          }
        } else if (this.isPanning) {
          const dx = (e.clientX - this.dragStart.x) / this.camera.zoom;
          const dy = (e.clientY - this.dragStart.y) / this.camera.zoom;
          this.camera.x = this.cameraStart.x - dx;
          this.camera.y = this.cameraStart.y - dy;
        }
      });

      window.addEventListener('mouseup', () => {
        this.isPanning = false;
        if (this.isDrawingPath) {
          this.isDrawingPath = false;
          if (this.drawnPath.length > 0 && this.selectedFarmerId) {
            this.worker.postMessage({
              type: 'update_farmer_path',
              farmerId: this.selectedFarmerId,
              path: this.drawnPath
            });
            this.clearBanner();
          }
        }
      });

      // Zoom Wheel
      wrapper.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomFactor = 1.1;
        let newZoom = this.camera.zoom;
        if (e.deltaY < 0) {
          newZoom *= zoomFactor;
        } else {
          newZoom /= zoomFactor;
        }
        this.camera.zoom = Math.max(this.camera.minZoom, Math.min(this.camera.maxZoom, newZoom));
      }, { passive: false });

      // Mobile Touch Handling (Multi-touch pan/zoom)
      wrapper.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
          const touch = e.touches[0];
          const tile = this.screenToWorldCoords(touch.clientX, touch.clientY);
          
          if (this.activeTool) {
            if (this.activeTool.type === TILE_TYPES.PATH) {
              if (this.selectedFarmerId) {
                this.isDrawingPath = true;
                this.drawnPath = [{ x: tile.x, y: tile.y }];
              }
            } else {
              this.applyPlacementTool(tile.x, tile.y);
            }
          } else {
            const clickedFarmer = this.findFarmerAt(tile.x, tile.y);
            if (clickedFarmer) {
              this.showFarmerDetails(clickedFarmer);
            } else {
              this.isPanning = true;
              this.lastTouchPos.x = touch.clientX;
              this.lastTouchPos.y = touch.clientY;
            }
          }
        } else if (e.touches.length === 2) {
          this.isPanning = false;
          this.isTouchPinching = true;
          const touch1 = e.touches[0];
          const touch2 = e.touches[1];
          this.touchStartDist = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
          this.touchStartZoom = this.camera.zoom;
          this.touchStartMidpoint = {
            x: (touch1.clientX + touch2.clientX) / 2,
            y: (touch1.clientY + touch2.clientY) / 2
          };
        }
      }, { passive: true });

      wrapper.addEventListener('touchmove', (e) => {
        if (e.touches.length === 1) {
          const touch = e.touches[0];
          const tile = this.screenToWorldCoords(touch.clientX, touch.clientY);
          
          if (this.isDrawingPath && this.isDrawingPathActive()) {
            const last = this.drawnPath[this.drawnPath.length - 1];
            if (last && (last.x !== tile.x || last.y !== tile.y)) {
              const dist = Math.max(Math.abs(last.x - tile.x), Math.abs(last.y - tile.y));
              if (dist === 1) {
                const tileType = this.getTileTypeAt(tile.x, tile.y);
                if (tileType !== TILE_TYPES.WATER) {
                  const farm = this.farmers.find(f => f.id === this.selectedFarmerId);
                  const limit = farm ? (farm.maxPathLength || 10) : 10;
                  
                  if (this.drawnPath.length < limit) {
                    this.drawnPath.push({ x: tile.x, y: tile.y });
                    this.setTileTypeAt(tile.x, tile.y, TILE_TYPES.PATH);
                    this.postTileUpdateToWorker(tile.x, tile.y, TILE_TYPES.PATH);
                  }
                }
              }
            }
          } else if (this.isPanning) {
            const dx = (touch.clientX - this.lastTouchPos.x) / this.camera.zoom;
            const dy = (touch.clientY - this.lastTouchPos.y) / this.camera.zoom;
            this.camera.x -= dx;
            this.camera.y -= dy;
            this.lastTouchPos.x = touch.clientX;
            this.lastTouchPos.y = touch.clientY;
          }
        } else if (e.touches.length === 2 && this.isTouchPinching) {
          const touch1 = e.touches[0];
          const touch2 = e.touches[1];
          const dist = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
          
          const scale = dist / this.touchStartDist;
          let newZoom = this.touchStartZoom * scale;
          this.camera.zoom = Math.max(this.camera.minZoom, Math.min(this.camera.maxZoom, newZoom));
        }
      }, { passive: true });

      wrapper.addEventListener('touchend', () => {
        this.isTouchPinching = false;
        this.isPanning = false;
        if (this.isDrawingPath) {
          this.isDrawingPath = false;
          if (this.drawnPath.length > 0 && this.selectedFarmerId) {
            this.worker.postMessage({
              type: 'update_farmer_path',
              farmerId: this.selectedFarmerId,
              path: this.drawnPath
            });
            this.clearBanner();
          }
        }
      });
    }

    setupUIHandlers() {
      // Toggle back to base game
      document.getElementById('tycoon-exit-btn').addEventListener('click', () => this.exitTycoonMode());

      // Check In Action
      const checkinBtn = document.getElementById('tycoon-checkin-btn');
      if (checkinBtn) {
        checkinBtn.addEventListener('click', () => {
          let completionRate = this.calculateCurrentCompletionRate();
          
          // Reset dailies on main thread
          TaskManager.resetDailies();
          try {
            getGameState().save();
          } catch(e) {}
          
          this.renderTasksList();
          
          // Trigger checkin in worker
          if (this.worker) {
            this.worker.postMessage({
              type: 'checkin',
              completionRate: completionRate
            });
          }
          this.addNotification("🌅 Checked in! New day started.");
        });
      }

      // Shop Tab Buttons
      const tabBtns = document.querySelectorAll('.tycoon-tab-btn');
      tabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          tabBtns.forEach(b => b.classList.remove('active'));
          e.target.classList.add('active');
          this.renderShopGrid(e.target.dataset.tab);
        });
      });

      // Settings Modals
      document.getElementById('tycoon-settings-btn').addEventListener('click', () => {
        document.getElementById('settings-checkin-hour').value = this.config.checkInHour;
        document.getElementById('tycoon-import-export').value = JSON.stringify(this.getSerializableState());
        document.getElementById('tycoon-settings-dialog').style.display = 'flex';
      });

      document.getElementById('settings-close-btn').addEventListener('click', () => {
        document.getElementById('tycoon-settings-dialog').style.display = 'none';
      });

      // Settings Save & Cheat Action
      document.getElementById('settings-save-btn').addEventListener('click', () => {
        const hour = Math.max(0, Math.min(23, Number(document.getElementById('settings-checkin-hour').value) || 10));
        this.config.checkInHour = hour;
        
        // Process cheat inside settings dialog
        const cheatInput = document.getElementById('tycoon-cheat-input');
        const cheatVal = cheatInput ? cheatInput.value.trim().toLowerCase() : '';
        if (cheatVal) {
          const parts = cheatVal.split(/\s+/);
          const cmd = parts[0];
          const amt = parseInt(parts[1]) || 1000;
          if (cmd === 'gold' || cmd === 'ap' || cmd === 'food') {
            this.resources[cmd] += amt;
            this.addNotification(`Cheat: Added ${amt} ${cmd}!`);
          } else if (cmd === 'combat' || cmd === 'exit') {
            document.getElementById('tycoon-settings-dialog').style.display = 'none';
            this.exitTycoonMode();
            return;
          } else if (cmd === 'clear') {
            localStorage.removeItem('nemesis_tycoon_data');
            this.loadState();
            this.addNotification("State cleared!");
          } else {
            this.addNotification("Unknown cheat: gold/ap/food/combat [amt]");
          }
          if (cheatInput) cheatInput.value = '';
        }
        
        this.saveState();
        // Sync config and resources dynamically without restarting simulation
        if (this.worker) {
          this.worker.postMessage({
            type: 'sync_state',
            chunks: this.getSerializableState().chunks,
            farmers: this.farmers,
            resources: this.resources,
            config: this.config
          });
        }
        document.getElementById('tycoon-settings-dialog').style.display = 'none';
        this.addNotification("⚙️ Settings saved!");
      });

      // Export Save
      document.getElementById('tycoon-export-btn').addEventListener('click', (e) => {
        e.preventDefault();
        const textarea = document.getElementById('tycoon-import-export');
        textarea.select();
        try {
          navigator.clipboard.writeText(textarea.value);
          this.addNotification("📋 Copied to clipboard!");
        } catch (err) {
          this.addNotification("Could not copy automatically, please copy the text manually.");
        }
      });

      // Import Save
      document.getElementById('tycoon-import-btn').addEventListener('click', (e) => {
        e.preventDefault();
        try {
          const text = document.getElementById('tycoon-import-export').value.trim();
          if (!text) return;
          const data = JSON.parse(text);
          if (!data.resources || !data.config) {
            throw new Error("Invalid format - missing resources/config.");
          }
          this.resources = data.resources;
          this.farmers = data.farmers || [];
          this.config = data.config;
          this.chunks = {};
          if (data.chunks) {
            for (const k in data.chunks) {
              this.chunks[k] = new Int32Array(data.chunks[k]);
            }
          }
          this.saveState();
          this.worker.postMessage({
            type: 'init',
            chunks: this.chunks,
            farmers: this.farmers,
            resources: this.resources,
            config: this.config
          });
          this.updateHUD();
          this.addNotification("💾 Save imported successfully!");
          document.getElementById('tycoon-settings-dialog').style.display = 'none';
        } catch (err) {
          alert("Import failed: " + err.message);
        }
      });

      // Tasks Dialog Toggles
      document.getElementById('tycoon-tasks-btn').addEventListener('click', () => {
        this.renderTasksList();
        document.getElementById('tycoon-tasks-dialog').style.display = 'flex';
      });

      document.getElementById('tycoon-tasks-close-btn').addEventListener('click', () => {
        document.getElementById('tycoon-tasks-dialog').style.display = 'none';
      });

      // Add Task Action
      document.getElementById('tycoon-add-task-btn').addEventListener('click', () => {
        const nameInput = document.getElementById('tycoon-new-task-name');
        const name = nameInput.value.trim();
        if (!name) return;
        
        const type = document.getElementById('tycoon-new-task-type').value;
        const diff = document.getElementById('tycoon-new-task-diff').value;
        const attr = document.getElementById('tycoon-new-task-attr').value;

        if (type === 'daily') {
          TaskManager.addDaily(name, diff, attr, 1);
        } else {
          TaskManager.addTodo(name, diff, attr);
        }

        nameInput.value = '';
        try {
          getGameState().save();
        } catch (e) {}

        this.renderTasksList();
        this.addNotification("➕ Task added successfully!");
      });
    }

    getSerializableState() {
      const data = {
        chunks: {},
        farmers: this.farmers,
        resources: this.resources,
        config: this.config,
        timestamp: Date.now()
      };
      for (const k in this.chunks) {
        data.chunks[k] = Array.from(this.chunks[k]);
      }
      return data;
    }

    calculateCurrentCompletionRate() {
      let completionRate = 1.0;
      try {
        const state = getGameState();
        if (state && state.dailiesState) {
          const dailies = state.dailiesState.dailies || [];
          const completed = dailies.filter(d => d.completed).length;
          const total = dailies.length;
          completionRate = total > 0 ? (completed / total) : 1.0;
        }
      } catch(e) {}
      return completionRate;
    }

    renderTasksList() {
      // First update character stats panel
      try {
        const state = getGameState();
        if (state) {
          const charClass = state.playerState.className || 'None';
          const charLevel = state.playerState.level || 1;
          const baseGold = state.playerState.gold || 0;
          const baseDiamonds = state.playerState.diamonds || 0;
          const baseAp = state.playerState.ap || 0;
          const maxAp = state.playerState.maxAp || 0;
          const streak = state.dailiesState.streakCompletion || 0;
          const streakHtml = streak > 0 ? ` <span style="color:#ef4444;margin-left:8px;">🔥 ${streak}d streak</span>` : '';

          document.getElementById('tycoon-char-class').innerHTML = `Class: ${charClass}${streakHtml}`;
          document.getElementById('tycoon-char-level').textContent = `Level: ${charLevel}`;
          document.getElementById('tycoon-base-gold').textContent = Math.round(baseGold);
          document.getElementById('tycoon-base-diamonds').textContent = Math.round(baseDiamonds);
          document.getElementById('tycoon-base-ap').textContent = `${baseAp} / ${maxAp}`;

          const attrs = state.playerState.attributes || {};
          const attrHtml = Object.keys(attrs).map(key => {
            const lv = attrs[key].level || 1;
            const pts = attrs[key].points || 0;
            return `<div style="flex: 1 1 30%; min-width: 60px;">${key}: <span style="color:#fff;">Lv.${lv} (${Math.round(pts)})</span></div>`;
          }).join('');
          document.getElementById('tycoon-char-attrs').innerHTML = attrHtml;
        }
      } catch (e) {
        console.warn("Failed to render character panel inside tycoon tasks", e);
      }

      // Recalculate completion rate and send to worker
      const currentRate = this.calculateCurrentCompletionRate();
      if (this.worker) {
        this.worker.postMessage({
          type: 'update_completion_rate',
          completionRate: currentRate
        });
      }

      const dailiesList = document.getElementById('tycoon-dailies-list');
      const todosList = document.getElementById('tycoon-todos-list');
      if (!dailiesList || !todosList) return;

      const dailies = TaskManager.getAllDailies() || [];
      const todos = TaskManager.getAllTodos() || [];

      // Render Dailies
      if (dailies.length === 0) {
        dailiesList.innerHTML = '<div style="font-size: 8px; color: #94a3b8; padding: 4px;">No Dailies configured.</div>';
      } else {
        dailiesList.innerHTML = dailies.map(d => {
          const isDone = d.completed;
          const streak = TaskManager.computeDailyStreak ? TaskManager.computeDailyStreak(d.id) : 0;
          const streakIcon = streak > 0 ? `🔥${streak}` : '';
          const checkbox = isDone 
            ? '✅' 
            : `<button class="tycoon-btn d-complete-btn" data-id="${d.id}" style="min-height: 24px; padding: 2px 6px; font-size: 8px; background: rgba(34, 197, 94, 0.2); border-color: rgba(34, 197, 94, 0.4); pointer-events: auto;">DONE</button>`;
          
          return `
            <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.05); padding: 6px; border-radius: 6px; font-size: 8px; border: 1px solid rgba(255,255,255,0.08); ${isDone ? 'opacity: 0.6;' : ''}">
              <div>
                <span style="font-weight: bold; color: ${isDone ? '#94a3b8' : '#ffd700'}">${d.name}</span>
                <span style="color: #64748b; margin-left: 4px;">[${d.difficulty}] [${d.attribute}] ${streakIcon}</span>
              </div>
              <div style="pointer-events: auto;">${checkbox}</div>
            </div>
          `;
        }).join('');

        // Bind daily clicks
        dailiesList.querySelectorAll('.d-complete-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const id = e.target.dataset.id;
            const res = TaskManager.completeDaily(id);
            if (res && res.success) {
              const rewards = res.rewards;
              this.addNotification(`✅ Completed daily! +${rewards.ap} AP, +${rewards.gold} Gold, +${rewards.diamonds} Diamonds`);
              try {
                getGameState().save();
              } catch(err) {}
              this.renderTasksList();
            }
          });
        });
      }

      // Render Todos
      const activeTodos = todos.filter(t => !t.completed);
      if (activeTodos.length === 0) {
        todosList.innerHTML = '<div style="font-size: 8px; color: #94a3b8; padding: 4px;">No active To-Dos.</div>';
      } else {
        todosList.innerHTML = activeTodos.map(t => `
          <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.05); padding: 6px; border-radius: 6px; font-size: 8px; border: 1px solid rgba(255,255,255,0.08);">
            <div>
              <span style="font-weight: bold; color: #38bdf8">${t.name}</span>
              <span style="color: #64748b; margin-left: 4px;">[${t.difficulty}] [${t.attribute}]</span>
            </div>
            <div style="pointer-events: auto;">
              <button class="tycoon-btn t-complete-btn" data-id="${t.id}" style="min-height: 24px; padding: 2px 6px; font-size: 8px; background: rgba(56, 189, 248, 0.2); border-color: rgba(56, 189, 248, 0.4); pointer-events: auto;">DONE</button>
            </div>
          </div>
        `).join('');

        // Bind todo clicks
        todosList.querySelectorAll('.t-complete-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const id = e.target.dataset.id;
            if (TaskManager.completeTodo(id)) {
              this.addNotification(`✅ Completed To-Do!`);
              try {
                getGameState().save();
              } catch(err) {}
              this.renderTasksList();
            }
          });
        });
      }
    }

    isDrawingPathActive() {
      return this.activeTool && this.activeTool.type === TILE_TYPES.PATH && this.selectedFarmerId;
    }

    postTileUpdateToWorker(x, y, value) {
      this.worker.postMessage({
        type: 'update_tile',
        x,
        y,
        value
      });
    }

    applyPlacementTool(tx, ty) {
      if (!this.activeTool) return;
      
      const cost = this.activeTool.cost || 0;
      if (this.resources.gold < cost) {
        this.addFloatingText(window.innerWidth / 2, window.innerHeight / 2, "Need Gold!", "#f87171");
        return;
      }

      // Rules: Place crop/utility requires solid Land (Grass/Sand/Stone) underneath
      const currentTileType = this.getTileTypeAt(tx, ty);
      const isLand = (currentTileType === TILE_TYPES.GRASS || currentTileType === TILE_TYPES.SAND || currentTileType === TILE_TYPES.STONE);

      if (this.activeTool.type === TILE_TYPES.GRASS || this.activeTool.type === TILE_TYPES.SAND || this.activeTool.type === TILE_TYPES.STONE || this.activeTool.type === TILE_TYPES.WATER) {
        // Terrain paint
        this.resources.gold -= cost;
        this.setTileTypeAt(tx, ty, this.activeTool.type);
        this.postTileUpdateToWorker(tx, ty, this.activeTool.type);
        this.updateHUD();
      } else if (this.activeTool.type === TILE_TYPES.FARMER) {
        // Placement of Farmer NPC
        if (!isLand) {
          this.addFloatingText(window.innerWidth / 2, window.innerHeight / 2, "Must spawn on land!", "#f87171");
          return;
        }
        this.resources.gold -= cost;
        const newFarmer = {
          id: 'farmer_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
          name: this.activeTool.name,
          emoji: this.activeTool.emoji,
          x: tx,
          y: ty,
          speed: this.activeTool.speed,
          consumeRate: this.activeTool.consumeRate,
          maxPathLength: 10,
          path: [],
          pathIndex: 0,
          isPathReversing: false,
          currentAction: "Idle 💤",
          feedMultiplierTimer: 0,
          currentMultiplier: 1.0
        };
        this.farmers.push(newFarmer);
        this.worker.postMessage({
          type: 'buy_farmer',
          farmer: newFarmer
        });
        this.updateHUD();
        this.clearBanner();
        this.activeTool = null;
        this.renderShopGrid("farmers");
      } else {
        // Crop / Increaser / Sprinkler / Cosmetic placements
        if (!isLand) {
          this.addFloatingText(window.innerWidth / 2, window.innerHeight / 2, "Must place on land!", "#f87171");
          return;
        }

        this.resources.gold -= cost;

        // Encode Tile Attributes
        // Bits 0-7: TileType
        // Bits 8-15: Initial Durability/Charge (e.g. 100 max)
        // Bits 16-23: Special / Radius status flags (starts empty)
        // Bits 24-31: Subtype metadata (if crop)
        let tileVal = this.activeTool.type;
        const baseCharge = this.activeTool.charge || 100;
        tileVal |= (baseCharge << 8);

        if (this.activeTool.subType) {
          tileVal |= (this.activeTool.subType << 24);
        }

        this.setTileTypeAt(tx, ty, tileVal);
        this.postTileUpdateToWorker(tx, ty, tileVal);
        this.updateHUD();
      }
    }

    screenToWorldCoords(sx, sy) {
      const wrapper = document.getElementById('tycoon-viewport-wrapper');
      const rect = wrapper.getBoundingClientRect();
      
      // Relative to wrapper center
      const rx = sx - rect.left - rect.width / 2;
      const ry = sy - rect.top - rect.height / 2;
      
      const worldX = this.camera.x + rx / this.camera.zoom;
      const worldY = this.camera.y + ry / this.camera.zoom;
      
      return {
        x: Math.floor(worldX / this.tileWidth),
        y: Math.floor(worldY / this.tileWidth)
      };
    }

    findFarmerAt(tx, ty) {
      return this.farmers.find(f => f.x === tx && f.y === ty);
    }

    getTileTypeAt(x, y) {
      const cx = Math.floor(x / 32);
      const cy = Math.floor(y / 32);
      const key = cx + "," + cy;
      if (!this.chunks[key]) return TILE_TYPES.WATER; // default is water surrounding
      
      const tx = ((x % 32) + 32) % 32;
      const ty = ((y % 32) + 32) % 32;
      const idx = ty * 32 + tx;
      return this.chunks[key][idx];
    }

    setTileTypeAt(x, y, value) {
      const cx = Math.floor(x / 32);
      const cy = Math.floor(y / 32);
      const key = cx + "," + cy;
      if (!this.chunks[key]) {
        this.chunks[key] = new Int32Array(1024);
      }
      const tx = ((x % 32) + 32) % 32;
      const ty = ((y % 32) + 32) % 32;
      const idx = ty * 32 + tx;
      this.chunks[key][idx] = value;
    }

    renderShopGrid(tab) {
      const grid = document.getElementById('tycoon-items-grid');
      grid.innerHTML = '';
      
      let items = [];
      if (tab === "terrain") {
        items = [
          { type: TILE_TYPES.GRASS, name: "Grass land", emoji: "🟩", cost: 5 },
          { type: TILE_TYPES.SAND, name: "Sand land", emoji: "🟨", cost: 5 },
          { type: TILE_TYPES.STONE, name: "Stone land", emoji: "⬜", cost: 8 },
          { type: TILE_TYPES.WATER, name: "Water tile", emoji: "🟦", cost: 5 }
        ];
      } else if (tab === "producers") {
        items = [
          { type: TILE_TYPES.PRODUCER, subType: PRODUCER_SUBS.TREE, name: "AP Tree", emoji: "🌲", cost: 20, charge: 100 },
          { type: TILE_TYPES.PRODUCER, subType: PRODUCER_SUBS.TOMATO, name: "Tomato Crop", emoji: "🍅", cost: 30, charge: 120 },
          { type: TILE_TYPES.PRODUCER, subType: PRODUCER_SUBS.APPLE, name: "Apple Tree", emoji: "🍎", cost: 50, charge: 180 }
        ];
      } else if (tab === "tech") {
        items = [
          { type: TILE_TYPES.INCREASER, name: "Fertilizer (+20%)", emoji: "🧪", cost: 40 },
          { type: TILE_TYPES.MAINTENANCE, name: "Sprinkler", emoji: "🚿", cost: 60, charge: 200 }
        ];
      } else if (tab === "farmers") {
        items = [
          { type: TILE_TYPES.FARMER, name: "Basic Roamer", emoji: "🧑‍🌾", cost: 100, speed: 2, consumeRate: 1 },
          { type: TILE_TYPES.FARMER, name: "Fast Roamer", emoji: "🏃‍♂️", cost: 180, speed: 4, consumeRate: 2 },
          { type: TILE_TYPES.FARMER, name: "AP Collector", emoji: "🧙‍♂️", cost: 250, speed: 3, consumeRate: 1 }
        ];
      } else if (tab === "cosmetics") {
        items = [
          { type: TILE_TYPES.COSMETIC, name: "Flower Pot", emoji: "🌸", cost: 10 },
          { type: TILE_TYPES.COSMETIC, name: "Decorative Rock", emoji: "🪨", cost: 10 },
          { type: TILE_TYPES.COSMETIC, name: "Magic Mushroom", emoji: "🍄", cost: 15 }
        ];
      }

      items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'tycoon-shop-card';
        if (this.activeTool && this.activeTool.name === item.name && this.activeTool.subType === item.subType) {
          card.classList.add('selected');
        }
        
        card.innerHTML = `
          <div class="tycoon-shop-item-emoji">${item.emoji}</div>
          <div class="tycoon-shop-item-name">${item.name}</div>
          <div class="tycoon-shop-item-cost">🪙 ${item.cost}</div>
        `;
        
        card.addEventListener('click', () => {
          document.querySelectorAll('.tycoon-shop-card').forEach(c => c.classList.remove('selected'));
          if (this.activeTool && this.activeTool.name === item.name && this.activeTool.subType === item.subType) {
            this.activeTool = null;
            this.clearBanner();
          } else {
            this.activeTool = item;
            card.classList.add('selected');
            this.setBanner(`Active Tool: Place ${item.name} (${item.emoji})`);
          }
        });
        
        grid.appendChild(card);
      });
    }

    setBanner(text) {
      const banner = document.getElementById('tycoon-active-banner');
      banner.textContent = text;
      banner.style.display = 'block';
    }

    clearBanner() {
      const banner = document.getElementById('tycoon-active-banner');
      banner.style.display = 'none';
    }

    showFarmerDetails(farmer) {
      this.selectedFarmerId = farmer.id;
      const title = document.getElementById('farmer-detail-title');
      const body = document.getElementById('farmer-detail-body');
      const footer = document.getElementById('farmer-detail-buttons');
      
      title.innerHTML = `${farmer.emoji} ${farmer.name}`;
      
      const multiplierText = farmer.currentMultiplier > 1.0 ? ` (+${Math.round((farmer.currentMultiplier-1)*100)}% Boost)` : '';
      
      body.innerHTML = `
        <div><strong>Status:</strong> ${farmer.currentAction}</div>
        <div><strong>Speed:</strong> ${farmer.speed} tiles/s</div>
        <div><strong>Food Consumption:</strong> ${farmer.consumeRate} food/s</div>
        <div><strong>Max Path Length:</strong> ${farmer.path.length} / ${farmer.maxPathLength || 10} blocks</div>
        ${farmer.feedMultiplierTimer > 0 ? `<div><strong>Feed Boost Time:</strong> ${farmer.feedMultiplierTimer}s</div>` : ''}
      `;
      
      // Actions: Feed crop, Upgrade path limit, Paint path pathing
      const canFeed = this.resources.food > 0;
      const upgradeCost = Math.round(50 * ((farmer.maxPathLength || 10) / 10));
      const canUpgrade = this.resources.gold >= upgradeCost;

      footer.innerHTML = `
        <button class="tycoon-btn" id="farmer-feed-btn" ${canFeed ? '' : 'disabled'}>🍎 Feed crop (Boost)</button>
        <button class="tycoon-btn" id="farmer-upgrade-btn" ${canUpgrade ? '' : 'disabled'}>🪙 Upgrade Path Limit (${upgradeCost}g)</button>
        <button class="tycoon-btn" id="farmer-paint-path-btn">🖌️ Draw Path</button>
        <button class="tycoon-btn exit-btn" id="farmer-close-btn">Close</button>
      `;

      document.getElementById('farmer-close-btn').addEventListener('click', () => {
        document.getElementById('tycoon-farmer-dialog').style.display = 'none';
        this.selectedFarmerId = null;
      });

      document.getElementById('farmer-feed-btn').addEventListener('click', () => {
        this.worker.postMessage({
          type: 'feed_farmer',
          farmerId: farmer.id
        });
        document.getElementById('tycoon-farmer-dialog').style.display = 'none';
        this.selectedFarmerId = null;
      });

      document.getElementById('farmer-upgrade-btn').addEventListener('click', () => {
        this.resources.gold -= upgradeCost;
        this.worker.postMessage({
          type: 'upgrade_farmer_path',
          farmerId: farmer.id
        });
        document.getElementById('tycoon-farmer-dialog').style.display = 'none';
        this.selectedFarmerId = null;
        this.updateHUD();
      });

      document.getElementById('farmer-paint-path-btn').addEventListener('click', () => {
        document.getElementById('tycoon-farmer-dialog').style.display = 'none';
        this.activeTool = {
          type: TILE_TYPES.PATH,
          name: "Path painter for " + farmer.name,
          emoji: "🖌️",
          cost: 0
        };
        this.setBanner(`Draw Path: Drag on Grass/Sand/Stone for ${farmer.emoji}`);
      });

      document.getElementById('tycoon-farmer-dialog').style.display = 'flex';
    }

    addNotification(text) {
      // Show dynamic notification at bottom center
      this.addFloatingText(window.innerWidth / 2, window.innerHeight / 2 - 100, text, "#10b981");
    }

    addFloatingText(sx, sy, text, color = "#ffd700") {
      const container = document.getElementById('tycoon-container');
      const el = document.createElement('div');
      el.className = 'tycoon-floating-text';
      el.style.left = `${sx}px`;
      el.style.top = `${sy}px`;
      el.style.color = color;
      el.textContent = text;
      container.appendChild(el);
      
      // Cleanup after animation completes
      setTimeout(() => {
        try { el.remove(); } catch(e) {}
      }, 1200);
    }

    updateHUD() {
      document.getElementById('tycoon-gold-val').textContent = this.resources.gold;
      document.getElementById('tycoon-ap-val').textContent = this.resources.ap;
      document.getElementById('tycoon-food-val').textContent = this.resources.food;
      
      // Calculate rate estimation
      let totalRate = 0;
      for (const key in this.chunks) {
        const arr = this.chunks[key];
        for (let i = 0; i < 1024; i++) {
          const tile = arr[i];
          const type = tile & 0xFF;
          if (type === TILE_TYPES.PRODUCER) {
            const charge = (tile >> 8) & 0xFF;
            if (charge > 0) {
              const subType = (tile >> 24) & 0xFF;
              let goldBase = 1;
              if (subType === PRODUCER_SUBS.TREE) goldBase = 2;
              else if (subType === PRODUCER_SUBS.TOMATO) goldBase = 1;
              else if (subType === PRODUCER_SUBS.APPLE) goldBase = 3;
              totalRate += goldBase * this.config.completionRatePrevDay;
            }
          }
        }
      }
      // Subtract farmer eating cost
      this.farmers.forEach(f => {
        if (!f.isSleeping) {
          totalRate -= (f.consumeRate || 1);
        }
      });
      totalRate = Math.max(1, Math.round(totalRate));
      document.getElementById('tycoon-rate-val').textContent = `${totalRate}g/s`;
    }

    // Entering Tycoon Mode
    enterTycoonMode(completionRate = null) {
      // Safety: Re-initialize DOM if body reset wiped the tycoon-container
      const container = document.getElementById('tycoon-container');
      if (!container) {
        this.canvas = null; // force fresh binding
        this.initDOM();
      }

      this.loadState();

      // Calculate weighted completion rate based on main game state
      let weightedRate = 1.0;
      try {
        const state = getGameState();
        if (state && state.dailiesState) {
          const dailies = state.dailiesState.dailies || [];
          if (dailies.length > 0) {
            const difficultyWeights = {
              'easy': 1,
              'medium': 2,
              'hard': 3,
              'ultra': 4
            };
            let totalWeight = 0;
            let completedWeight = 0;
            dailies.forEach(d => {
              const diff = (d.difficulty || 'medium').toLowerCase();
              const weight = difficultyWeights[diff] || 2;
              totalWeight += weight;
              if (d.completed) {
                completedWeight += weight;
              }
            });
            weightedRate = totalWeight > 0 ? (completedWeight / totalWeight) : 1.0;
          }
        }
      } catch (e) {
        weightedRate = 1.0;
      }

      this.config.completionRatePrevDay = completionRate !== null ? completionRate : weightedRate;
      this.config.completionRateCurrentDay = this.config.completionRatePrevDay;
      
      // Hide combat UI and show Tycoon Mode by adding class to body
      document.body.classList.add('tycoon-active');
      localStorage.setItem('nemesis_active_mode', 'tycoon');
      
      // Explicitly hide all other direct children of body in JS
      Array.from(document.body.children).forEach(el => {
        if (el.id !== 'tycoon-container' && el.tagName !== 'SCRIPT' && el.tagName !== 'STYLE') {
          if (el.classList.contains('popup-overlay')) {
            el.remove();
          } else {
            if (!el.hasAttribute('data-original-display')) {
              el.setAttribute('data-original-display', el.style.display || '');
            }
            el.style.setProperty('display', 'none', 'important');
          }
        }
      });

      // Clear any other active animations or floating items
      const selectorsToClean = [
        '.holy-light-beam', 
        '.floating-damage-number', 
        '.popup-overlay', 
        '[style*="z-index"]'
      ];
      selectorsToClean.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => {
          const container = document.getElementById('tycoon-container');
          if (container && !container.contains(el)) {
            el.remove();
          }
        });
      });

      document.getElementById('tycoon-container').style.display = 'flex';
      
      // Resize canvas to viewport size
      const wrapper = document.getElementById('tycoon-viewport-wrapper');
      this.canvas.width = wrapper.clientWidth;
      this.canvas.height = wrapper.clientHeight;
      
      // Spawn Inline Worker
      this.spawnWorker();

      // Launch Render Loop
      this.isRenderLoopRunning = true;
      requestAnimationFrame((t) => this.renderLoop(t));

      this.renderShopGrid("terrain");
      this.updateHUD();
    }

    exitTycoonMode() {
      // Pause worker and terminate
      if (this.worker) {
        this.worker.postMessage({ type: 'pause' });
        this.worker.terminate();
        this.worker = null;
      }
      
      this.isRenderLoopRunning = false;
      document.body.classList.remove('tycoon-active');
      localStorage.setItem('nemesis_active_mode', 'combat');
      
      // Restore original display styles for direct children of body
      Array.from(document.body.children).forEach(el => {
        if (el.hasAttribute('data-original-display')) {
          el.style.display = el.getAttribute('data-original-display');
          el.removeAttribute('data-original-display');
        }
      });

      const container = document.getElementById('tycoon-container');
      if (container) {
        container.style.display = 'none';
      }
      
      // Save state
      this.saveState();
      
      // Trigger full page reload or show main menu popup
      try {
        location.reload();
      } catch(e) {}
    }

    spawnWorker() {
      if (this.worker) this.worker.terminate();
      
      // Create inline worker via Blob
      const blob = new Blob([window.TycoonWorkerCode], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      this.worker = new Worker(workerUrl);
      
      // Initialize state inside Worker
      this.worker.postMessage({
        type: 'init',
        chunks: this.chunks,
        farmers: this.farmers,
        resources: this.resources,
        config: this.config
      });

      this.worker.onmessage = (e) => {
        const msg = e.data;
        switch (msg.type) {
          case 'state_update':
            // Merge spatial hash and other variables smoothly
            this.chunks = msg.chunks;
            this.farmers = msg.farmers;
            this.resources = msg.resources;
            this.updateHUD();

            // Throttled autosave every 5 seconds
            const now = Date.now();
            if (!this.lastAutoSaveTime || now - this.lastAutoSaveTime > 5000) {
              this.saveState();
              this.lastAutoSaveTime = now;
            }
            break;
            
          case 'offline_summary':
            this.showOfflineSummary(msg);
            break;

          case 'daily_summary':
            TaskManager.resetDailies();
            try {
              getGameState().save();
            } catch (err) {}
            this.renderTasksList();
            this.showDailySummary(msg.summary);
            break;
            
          case 'notification':
            this.addNotification(msg.text);
            break;
        }
      };
    }

    showOfflineSummary(summary) {
      if (summary.elapsedSeconds < 30) return; // ignore short cycles
      
      const overlay = document.createElement('div');
      overlay.className = 'tycoon-overlay';
      overlay.style.display = 'flex';
      
      overlay.innerHTML = `
        <div class="tycoon-dialog tycoon-summary-popup">
          <h3>💤 OFFLINE EARNINGS</h3>
          <p>You were gone for <strong>${this.formatTime(summary.elapsedSeconds)}</strong>.</p>
          <div class="tycoon-summary-stats">
            <div class="tycoon-summary-row">
              <span class="label">Simulated Ticks:</span>
              <span class="value">${summary.ticksRun}s</span>
            </div>
            <div class="tycoon-summary-row">
              <span class="label">Gold Earned:</span>
              <span class="value">🪙 +${summary.goldEarned}</span>
            </div>
            <div class="tycoon-summary-row">
              <span class="label">AP Earned:</span>
              <span class="value">⚡ +${summary.apEarned}</span>
            </div>
            <div class="tycoon-summary-row">
              <span class="label">Food Harvested:</span>
              <span class="value">🍎 +${summary.foodEarned}</span>
            </div>
          </div>
          <button class="tycoon-btn" id="offline-ok-btn" style="width:100%">GREAT</button>
        </div>
      `;
      
      document.getElementById('tycoon-container').appendChild(overlay);
      document.getElementById('offline-ok-btn').addEventListener('click', () => {
        overlay.remove();
      });
    }

    showDailySummary(summary) {
      const overlay = document.createElement('div');
      overlay.className = 'tycoon-overlay';
      overlay.style.display = 'flex';
      
      overlay.innerHTML = `
        <div class="tycoon-dialog tycoon-summary-popup">
          <h3>🌅 DAILY SUMMARY</h3>
          <p>The daily cycle resets! Check-in calculations processed.</p>
          <div class="tycoon-summary-stats">
            <div class="tycoon-summary-row">
              <span class="label">Completion Rate:</span>
              <span class="value">${Math.round(summary.completionRate * 100)}%</span>
            </div>
            <div class="tycoon-summary-row">
              <span class="label">Total Gold Generated:</span>
              <span class="value">🪙 +${summary.gold}</span>
            </div>
            <div class="tycoon-summary-row">
              <span class="label">Total AP Earned:</span>
              <span class="value">⚡ +${summary.ap}</span>
            </div>
          </div>
          <button class="tycoon-btn" id="daily-ok-btn" style="width:100%">OK</button>
        </div>
      `;
      
      document.getElementById('tycoon-container').appendChild(overlay);
      document.getElementById('daily-ok-btn').addEventListener('click', () => {
        overlay.remove();
      });
    }

    formatTime(seconds) {
      if (seconds < 60) return `${seconds}s`;
      const mins = Math.floor(seconds / 60);
      if (mins < 60) return `${mins}m`;
      const hrs = Math.floor(mins / 60);
      return `${hrs}h ${mins % 60}m`;
    }

    // Render loop coordinates
    renderLoop(t) {
      if (!this.isRenderLoopRunning) return;
      
      this.drawCanvas();
      requestAnimationFrame((time) => this.renderLoop(time));
    }

    drawCanvas() {
      const ctx = this.ctx;
      const w = this.canvas.width;
      const h = this.canvas.height;
      const zoom = this.camera.zoom;
      
      // Clear viewport
      ctx.fillStyle = "#0d1117";
      ctx.fillRect(0, 0, w, h);
      
      // Save transform matrices
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.scale(zoom, zoom);
      ctx.translate(-this.camera.x, -this.camera.y);
      
      // Frustum culling dimensions
      const tw = this.tileWidth;
      const worldLeft = this.camera.x - (w / 2) / zoom;
      const worldTop = this.camera.y - (h / 2) / zoom;
      const worldRight = this.camera.x + (w / 2) / zoom;
      const worldBottom = this.camera.y + (h / 2) / zoom;
      
      const minTileX = Math.floor(worldLeft / tw);
      const minTileY = Math.floor(worldTop / tw);
      const maxTileX = Math.ceil(worldRight / tw);
      const maxTileY = Math.ceil(worldBottom / tw);
      
      // Step 1: Render visible tiles
      for (let ty = minTileY; ty <= maxTileY; ty++) {
        for (let tx = minTileX; tx <= maxTileX; tx++) {
          const tile = this.getTileTypeAt(tx, ty);
          const type = tile & 0xFF;
          const charge = (tile >> 8) & 0xFF;
          const subType = (tile >> 24) & 0xFF;
          
          this.drawTileTexture(ctx, tx, ty, type, charge, subType);
        }
      }

      // Step 2: Render active farmer paths when drawing tool is active
      if (this.isDrawingPathActive() && this.drawnPath.length > 0) {
        ctx.strokeStyle = "rgba(239, 68, 68, 0.6)";
        ctx.lineWidth = 4;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        this.drawnPath.forEach((pt, idx) => {
          const px = pt.x * tw + tw / 2;
          const py = pt.y * tw + tw / 2;
          if (idx === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.stroke();
      }

      // Step 3: Draw active NPC Farmers
      this.farmers.forEach(farmer => {
        const fx = farmer.x * tw + tw / 2;
        const fy = farmer.y * tw + tw / 2;
        
        ctx.font = "18px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(farmer.emoji, fx, fy);
        
        // Draw miniature action icons/text above farmers
        if (farmer.isSleeping) {
          ctx.font = "8px Arial";
          ctx.fillText("💤", fx + 8, fy - 8);
        } else if (farmer.feedMultiplierTimer > 0) {
          ctx.font = "8px Arial";
          ctx.fillText("⚡", fx - 8, fy - 8);
        }
      });
      
      ctx.restore();
    }

    drawTileTexture(ctx, tx, ty, type, charge, subType) {
      const tw = this.tileWidth;
      const x = tx * tw;
      const y = ty * tw;
      
      // Deterministic noise for tile pixel patterns
      const noise = (tx * 17 + ty * 31) % 100;
      
      switch (type) {
        case TILE_TYPES.WATER:
          ctx.fillStyle = "#1e40af"; // Deep blue water
          ctx.fillRect(x, y, tw, tw);
          break;
          
        case TILE_TYPES.GRASS:
          ctx.fillStyle = "#166534"; // Grass dark green
          ctx.fillRect(x, y, tw, tw);
          break;
          
        case TILE_TYPES.SAND:
          ctx.fillStyle = "#ca8a04"; // Yellow sand
          ctx.fillRect(x, y, tw, tw);
          break;
          
        case TILE_TYPES.STONE:
          ctx.fillStyle = "#4b5563"; // Dark gray stone
          ctx.fillRect(x, y, tw, tw);
          break;
          
        case TILE_TYPES.PATH:
          ctx.fillStyle = "#78350f"; // Brown path
          ctx.fillRect(x, y, tw, tw);
          break;
          
        case TILE_TYPES.PRODUCER:
          // Draw standard grass underneath first
          ctx.fillStyle = "#166534";
          ctx.fillRect(x, y, tw, tw);
          
          // Draw the emoji depending on subType
          let emoji = "🌲";
          if (subType === PRODUCER_SUBS.TOMATO) emoji = "🍅";
          else if (subType === PRODUCER_SUBS.APPLE) emoji = "🍎";
          
          ctx.font = "16px Arial";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(emoji, x + tw / 2, y + tw / 2);
          
          // Draw charge status bar (durability indicator)
          ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
          ctx.fillRect(x + 2, y + tw - 5, tw - 4, 3);
          
          const chargePct = charge / 255;
          ctx.fillStyle = chargePct > 0.3 ? "#22c55e" : "#ef4444";
          ctx.fillRect(x + 2, y + tw - 5, (tw - 4) * chargePct, 3);
          break;
          
        case TILE_TYPES.INCREASER:
          // Land terrain underneath
          ctx.fillStyle = "#166534";
          ctx.fillRect(x, y, tw, tw);
          
          ctx.font = "16px Arial";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("🧪", x + tw / 2, y + tw / 2);
          break;
          
        case TILE_TYPES.MAINTENANCE:
          // Land terrain underneath
          ctx.fillStyle = "#166534";
          ctx.fillRect(x, y, tw, tw);
          
          ctx.font = "16px Arial";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("🚿", x + tw / 2, y + tw / 2);
          
          // Sprinkler Charge indicator
          ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
          ctx.fillRect(x + 2, y + tw - 5, tw - 4, 3);
          ctx.fillStyle = "#38bdf8";
          ctx.fillRect(x + 2, y + tw - 5, (tw - 4) * (charge / 255), 3);
          break;
          
        case TILE_TYPES.COSMETIC:
          // Land terrain underneath
          ctx.fillStyle = "#166534";
          ctx.fillRect(x, y, tw, tw);
          
          let cosEmoji = "🌸";
          if (noise < 33) cosEmoji = "🪨";
          else if (noise < 66) cosEmoji = "🍄";
          
          ctx.font = "16px Arial";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(cosEmoji, x + tw / 2, y + tw / 2);
          break;
      }
      
      // Draw light border grid lines to make it look premium and organized
      ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, tw, tw);
    }

    // Save state
    saveState() {
      const data = {
        chunks: this.chunks,
        farmers: this.farmers,
        resources: this.resources,
        config: this.config,
        timestamp: Date.now()
      };
      
      // Filter empty buffers or make sure serialized correctly
      const serializableChunks = {};
      for (const k in this.chunks) {
        serializableChunks[k] = Array.from(this.chunks[k]);
      }
      data.chunks = serializableChunks;
      
      localStorage.setItem('nemesis_tycoon_data', JSON.stringify(data));
    }

    // Load state
    loadState() {
      const saved = localStorage.getItem('nemesis_tycoon_data');
      if (saved) {
        try {
          const data = JSON.parse(saved);
          this.resources = data.resources || { gold: 100, ap: 0, food: 0 };
          this.farmers = data.farmers || [];
          this.config = data.config || { checkInHour: 10, completionRatePrevDay: 1.0, lastSaveTime: Date.now() };
          
          // Re-instantiate TypedArrays
          this.chunks = {};
          if (data.chunks) {
            for (const k in data.chunks) {
              this.chunks[k] = new Int32Array(data.chunks[k]);
            }
          }
          
          // Update last save time to calculate elapsed ticks
          this.config.lastSaveTime = data.timestamp || Date.now();
          return;
        } catch(e) {
          console.warn("Tycoon load failed, starting fresh", e);
        }
      }
      
      // Fresh map: starter 8x8 island with 1 Tree in center
      this.resources = { gold: 100, ap: 0, food: 0 };
      this.farmers = [];
      this.config = { checkInHour: 10, completionRatePrevDay: 1.0, lastSaveTime: Date.now() };
      this.chunks = {};
      
      // Generate 8x8 land at the center [0, 0]
      for (let y = -4; y < 4; y++) {
        for (let x = -4; x < 4; x++) {
          this.setTileTypeAt(x, y, TILE_TYPES.GRASS);
        }
      }
      
      // Place 1 AP tree (Producer) in center [0, 0]
      // TileType: Producer (5), subType: Tree (1)
      let treeVal = TILE_TYPES.PRODUCER;
      treeVal |= (100 << 8); // Charge (100)
      treeVal |= (PRODUCER_SUBS.TREE << 24); // subType
      this.setTileTypeAt(0, 0, treeVal);
      
      // Center camera
      this.camera.x = 0;
      this.camera.y = 0;
    }
  }

  // Register in global namespace
  window.TycoonManager = new TycoonEngine();
})();
