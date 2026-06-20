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
      this.terrainBrushSize = 1; // 1 (1x1), 3 (3x3), 5 (5x5)
      this.isPainting = false;
      this.hoverTile = null;
      this.draggedObject = null;
      this.isDraggingObject = false;
      this.potentialDraggedObject = null;
      this.interactionStartTile = null;
      this.interactionStartPos = null;
      
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
              <div class="tycoon-stat food" style="display: none;">🍎 <span id="tycoon-food-val">0</span></div>
              <div class="tycoon-stat rate">📈 <span id="tycoon-rate-val">1g/s</span></div>
            </div>
            <div class="tycoon-hud-panel" style="gap: 8px;">
              <button class="tycoon-btn" id="tycoon-checkin-btn" style="background: rgba(34, 197, 94, 0.2); border-color: rgba(34, 197, 94, 0.4);">🌅 Check In</button>
              <button class="tycoon-btn" id="tycoon-dailies-btn">📅 Dailies</button>
              <button class="tycoon-btn" id="tycoon-todos-btn">📋 To-Dos</button>
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
 
          <!-- tycoon-tasks-dialog removed -->
 
          <div class="tycoon-overlay" id="tycoon-farmer-dialog">
            <div class="tycoon-dialog">
              <h3 id="farmer-detail-title">🧑‍🌾 Farmer Details</h3>
              <div class="tycoon-dialog-body" id="farmer-detail-body"></div>
              <div class="tycoon-dialog-buttons" id="farmer-detail-buttons"></div>
            </div>
          </div>

          <div class="tycoon-overlay" id="tycoon-object-dialog">
            <div class="tycoon-dialog">
              <h3 id="object-detail-title">🧱 Object Info</h3>
              <div class="tycoon-dialog-body" id="object-detail-body"></div>
              <div class="tycoon-dialog-buttons" id="object-detail-buttons"></div>
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

      // Mouse drag panning, painting and potential drag relocation
      wrapper.addEventListener('mousedown', (e) => {
        if (e.button === 0) { // Left click
          const tile = this.screenToWorldCoords(e.clientX, e.clientY);
          
          if (this.activeTool) {
            const isTerrain = (this.activeTool.type === TILE_TYPES.GRASS ||
                               this.activeTool.type === TILE_TYPES.SAND ||
                               this.activeTool.type === TILE_TYPES.STONE ||
                               this.activeTool.type === TILE_TYPES.WATER);
            if (isTerrain) {
              this.isPainting = true;
              this.paintTerrainCircle(tile.x, tile.y, this.activeTool.type);
            } else {
              this.applyPlacementTool(tile.x, tile.y);
            }
          } else {
            // Check if clicked an object center/footprint
            const obj = this.findObjectCenterAt(tile.x, tile.y);
            if (obj) {
              this.potentialDraggedObject = obj;
              this.interactionStartTile = tile;
              this.interactionStartPos = { x: e.clientX, y: e.clientY };
              this.isDraggingObject = false;
            } else {
              // Click farmer or pan camera
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
        }
      });

      wrapper.addEventListener('mousemove', (e) => {
        const tile = this.screenToWorldCoords(e.clientX, e.clientY);
        this.hoverTile = tile;

        if (this.isPainting && this.activeTool) {
          this.paintTerrainCircle(tile.x, tile.y, this.activeTool.type);
        } else if (this.potentialDraggedObject) {
          if (!this.isDraggingObject) {
            const dist = Math.hypot(e.clientX - this.interactionStartPos.x, e.clientY - this.interactionStartPos.y);
            if (dist > 8) {
              this.isDraggingObject = true;
              // Lift the object - temporarily set to GRASS and update worker
              this.setTileTypeAt(this.potentialDraggedObject.x, this.potentialDraggedObject.y, TILE_TYPES.GRASS);
              this.postTileUpdateToWorker(this.potentialDraggedObject.x, this.potentialDraggedObject.y, TILE_TYPES.GRASS);
              this.draggedObject = this.potentialDraggedObject;
            }
          }
        } else if (this.isPanning) {
          const dx = (e.clientX - this.dragStart.x) / this.camera.zoom;
          const dy = (e.clientY - this.dragStart.y) / this.camera.zoom;
          this.camera.x = this.cameraStart.x - dx;
          this.camera.y = this.cameraStart.y - dy;
        }
      });

      window.addEventListener('mouseup', (e) => {
        if (this.isDraggingObject && this.draggedObject) {
          const dropTile = this.hoverTile || this.screenToWorldCoords(e.clientX, e.clientY);
          if (this.canPlaceObjectAt(dropTile.x, dropTile.y)) {
            // Drop successfully
            this.setTileTypeAt(dropTile.x, dropTile.y, this.draggedObject.tileVal);
            this.postTileUpdateToWorker(dropTile.x, dropTile.y, this.draggedObject.tileVal);
            this.addFloatingText(window.innerWidth / 2, window.innerHeight / 2, "Moved! 🚚", "#4ade80");
          } else {
            // Snap back
            this.setTileTypeAt(this.draggedObject.x, this.draggedObject.y, this.draggedObject.tileVal);
            this.postTileUpdateToWorker(this.draggedObject.x, this.draggedObject.y, this.draggedObject.tileVal);
            this.addFloatingText(window.innerWidth / 2, window.innerHeight / 2, "Invalid space!", "#f87171");
          }
          this.draggedObject = null;
          this.isDraggingObject = false;
          this.potentialDraggedObject = null;
        } else if (this.potentialDraggedObject) {
          // Quick tap / click inspect
          this.showObjectDetails(this.potentialDraggedObject);
          this.potentialDraggedObject = null;
        }
        
        this.isPanning = false;
        this.isPainting = false;
      });

      wrapper.addEventListener('mouseleave', () => {
        if (this.isDraggingObject && this.draggedObject) {
          // Snap back if mouse leaves screen
          this.setTileTypeAt(this.draggedObject.x, this.draggedObject.y, this.draggedObject.tileVal);
          this.postTileUpdateToWorker(this.draggedObject.x, this.draggedObject.y, this.draggedObject.tileVal);
          this.addFloatingText(window.innerWidth / 2, window.innerHeight / 2, "Cancelled", "#f87171");
          this.draggedObject = null;
          this.isDraggingObject = false;
          this.potentialDraggedObject = null;
        }
        this.hoverTile = null;
        this.isPainting = false;
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

      // Mobile Touch Handling (Multi-touch pan/zoom/paint/drag)
      wrapper.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
          const touch = e.touches[0];
          const tile = this.screenToWorldCoords(touch.clientX, touch.clientY);
          this.hoverTile = tile;
          
          if (this.activeTool) {
            const isTerrain = (this.activeTool.type === TILE_TYPES.GRASS ||
                               this.activeTool.type === TILE_TYPES.SAND ||
                               this.activeTool.type === TILE_TYPES.STONE ||
                               this.activeTool.type === TILE_TYPES.WATER);
            if (isTerrain) {
              this.isPainting = true;
              this.paintTerrainCircle(tile.x, tile.y, this.activeTool.type);
            } else {
              this.applyPlacementTool(tile.x, tile.y);
            }
          } else {
            // Check if clicked an object center/footprint
            const obj = this.findObjectCenterAt(tile.x, tile.y);
            if (obj) {
              this.potentialDraggedObject = obj;
              this.interactionStartTile = tile;
              this.interactionStartPos = { x: touch.clientX, y: touch.clientY };
              this.isDraggingObject = false;
            } else {
              const tileCoords = this.screenToWorldCoords(touch.clientX, touch.clientY);
              const clickedFarmerMapped = this.findFarmerAt(tileCoords.x, tileCoords.y);
              if (clickedFarmerMapped) {
                this.showFarmerDetails(clickedFarmerMapped);
              } else {
                this.isPanning = true;
                this.lastTouchPos.x = touch.clientX;
                this.lastTouchPos.y = touch.clientY;
              }
            }
          }
        } else if (e.touches.length === 2) {
          this.isPanning = false;
          this.isPainting = false;
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
          this.hoverTile = tile;
          
          if (this.isPainting && this.activeTool) {
            this.paintTerrainCircle(tile.x, tile.y, this.activeTool.type);
          } else if (this.potentialDraggedObject) {
            if (!this.isDraggingObject) {
              const dist = Math.hypot(touch.clientX - this.interactionStartPos.x, touch.clientY - this.interactionStartPos.y);
              if (dist > 8) {
                this.isDraggingObject = true;
                this.setTileTypeAt(this.potentialDraggedObject.x, this.potentialDraggedObject.y, TILE_TYPES.GRASS);
                this.postTileUpdateToWorker(this.potentialDraggedObject.x, this.potentialDraggedObject.y, TILE_TYPES.GRASS);
                this.draggedObject = this.potentialDraggedObject;
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
        if (this.isDraggingObject && this.draggedObject) {
          const dropTile = this.hoverTile;
          if (dropTile && this.canPlaceObjectAt(dropTile.x, dropTile.y)) {
            // Drop successfully
            this.setTileTypeAt(dropTile.x, dropTile.y, this.draggedObject.tileVal);
            this.postTileUpdateToWorker(dropTile.x, dropTile.y, this.draggedObject.tileVal);
            this.addFloatingText(window.innerWidth / 2, window.innerHeight / 2, "Moved! 🚚", "#4ade80");
          } else {
            // Snap back
            this.setTileTypeAt(this.draggedObject.x, this.draggedObject.y, this.draggedObject.tileVal);
            this.postTileUpdateToWorker(this.draggedObject.x, this.draggedObject.y, this.draggedObject.tileVal);
            this.addFloatingText(window.innerWidth / 2, window.innerHeight / 2, "Invalid space!", "#f87171");
          }
          this.draggedObject = null;
          this.isDraggingObject = false;
          this.potentialDraggedObject = null;
        } else if (this.potentialDraggedObject) {
          // Quick tap / click inspect
          this.showObjectDetails(this.potentialDraggedObject);
          this.potentialDraggedObject = null;
        }
        this.isTouchPinching = false;
        this.isPanning = false;
        this.isPainting = false;
        this.hoverTile = null;
      });
    }
    }

    setupUIHandlers() {
      // Toggle back to base game
      document.getElementById('tycoon-exit-btn').addEventListener('click', () => this.exitTycoonMode());

      // Check In Action — Tycoon manages its own day cycle via the worker.
      // We only read task completion rate as a passive multiplier; we never
      // reset the main game's dailies from inside tycoon.
      const checkinBtn = document.getElementById('tycoon-checkin-btn');
      if (checkinBtn) {
        checkinBtn.addEventListener('click', () => {
          const completionRate = this.calculateCurrentCompletionRate();
          
          // Post manual check-in to worker (worker handles its own daily cycle)
          if (this.worker) {
            this.worker.postMessage({
              type: 'checkin',
              completionRate: completionRate
            });
          }
          this.addNotification("🌅 Tycoon day checked in! Production boosted.");
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
          } else if (cheatVal === 'reset farm' || cheatVal === 'reset tycoon') {
            // Reset tycoon game progress (map, farmers, resources) only.
            // Preserves checkInHour, completionRatePrevDay, and ALL main-game task/streak data.
            const savedHour = this.config.checkInHour || 10;
            const savedPrevRate = this.config.completionRatePrevDay || 1.0;
            this.resources = { gold: 100, ap: 0, food: 0 };
            this.farmers = [];
            this.chunks = {};
            // Starter 8×8 island with one AP tree
            for (let y = -4; y < 4; y++) {
              for (let x = -4; x < 4; x++) {
                this.setTileTypeAt(x, y, TILE_TYPES.GRASS);
              }
            }
            let treeVal = TILE_TYPES.PRODUCER;
            treeVal |= (100 << 8);
            treeVal |= (PRODUCER_SUBS.TREE << 24);
            this.setTileTypeAt(0, 0, treeVal);
            this.camera.x = 0;
            this.camera.y = 0;
            this.config = { checkInHour: savedHour, completionRatePrevDay: savedPrevRate, completionRateCurrentDay: savedPrevRate, lastSaveTime: Date.now() };
            this.saveState();
            if (this.worker) {
              this.worker.postMessage({
                type: 'init',
                chunks: this.chunks,
                farmers: this.farmers,
                resources: this.resources,
                config: this.config
              });
            }
            this.updateHUD();
            this.renderShopGrid('terrain');
            this.addNotification('🌱 Farm reset! Task streaks and main game data preserved.');
            document.getElementById('tycoon-settings-dialog').style.display = 'none';
            return;
          } else {
            this.addNotification("Unknown cheat: gold/ap/food/combat [amt] · reset farm");
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

      // Dailies and To-Dos buttons toggle their respective main game sliding panels
      document.getElementById('tycoon-dailies-btn').addEventListener('click', () => {
        if (typeof UIManager !== 'undefined' && typeof UIManager.toggleTaskPanel === 'function') {
          UIManager.toggleTaskPanel('dailies');
        }
      });

      document.getElementById('tycoon-todos-btn').addEventListener('click', () => {
        if (typeof UIManager !== 'undefined' && typeof UIManager.toggleTaskPanel === 'function') {
          UIManager.toggleTaskPanel('todos');
        }
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

    // renderTasksList removed - now using UIManager toggleTaskPanel

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
        // Terrain paint is handled via continuous drag painting, fallback to painting circle
        this.paintTerrainCircle(tx, ty, this.activeTool.type);
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
          currentAction: "Idle 💤"
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
        // Crop / Increaser / Sprinkler / Cosmetic placements - all take up 3x3 space
        if (!this.canPlaceObjectAt(tx, ty)) {
          this.addFloatingText(window.innerWidth / 2, window.innerHeight / 2, "Placement blocked! Need 3x3 clear land.", "#f87171");
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

    canPlaceObjectAt(tx, ty) {
      // 1. Check that the entire 3x3 area is solid plain terrain (Grass, Sand, Stone)
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const tileVal = this.getTileTypeAt(tx + dx, ty + dy);
          const tType = tileVal & 0xFF;
          if (tType !== TILE_TYPES.GRASS && tType !== TILE_TYPES.SAND && tType !== TILE_TYPES.STONE) {
            return false;
          }
        }
      }
      
      // 2. Check that no other object center is within Chebyshev distance <= 2
      // (This prevents their 3x3 footprints from overlapping)
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const tileVal = this.getTileTypeAt(tx + dx, ty + dy);
          const tType = tileVal & 0xFF;
          if (tType === TILE_TYPES.PRODUCER || tType === TILE_TYPES.INCREASER || 
              tType === TILE_TYPES.MAINTENANCE || tType === TILE_TYPES.COSMETIC) {
            return false;
          }
        }
      }
      
      return true;
    }

    paintTerrainCircle(cx, cy, type) {
      const size = this.terrainBrushSize || 1;
      const radius = size / 2;
      const radiusSq = radius * radius;
      const half = Math.floor(size / 2);
      let updated = false;
      const cost = this.activeTool.cost || 0;
      
      for (let dy = -half; dy <= half; dy++) {
        for (let dx = -half; dx <= half; dx++) {
          if (dx * dx + dy * dy <= radiusSq) {
            const tx = cx + dx;
            const ty = cy + dy;
            
            const currentTileVal = this.getTileTypeAt(tx, ty);
            const currentType = currentTileVal & 0xFF;
            
            if (currentType !== type) {
              if (this.resources.gold >= cost) {
                this.resources.gold -= cost;
                this.setTileTypeAt(tx, ty, type);
                this.postTileUpdateToWorker(tx, ty, type);
                updated = true;
              } else {
                this.isPainting = false;
                this.addFloatingText(window.innerWidth / 2, window.innerHeight / 2, "Need Gold!", "#f87171");
                break;
              }
            }
          }
        }
      }
      
      if (updated) {
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
      banner.innerHTML = '';
      
      const textEl = document.createElement('div');
      textEl.textContent = text;
      banner.appendChild(textEl);
      
      if (this.activeTool && 
          (this.activeTool.type === TILE_TYPES.GRASS || 
           this.activeTool.type === TILE_TYPES.SAND || 
           this.activeTool.type === TILE_TYPES.STONE || 
           this.activeTool.type === TILE_TYPES.WATER)) {
        
        const controls = document.createElement('div');
        controls.className = 'tycoon-brush-controls';
        
        const sizes = [1, 3, 5];
        sizes.forEach(size => {
          const btn = document.createElement('button');
          btn.className = 'tycoon-btn brush-size-btn';
          if (this.terrainBrushSize === size) {
            btn.classList.add('active');
          }
          btn.textContent = `${size}x${size}`;
          btn.addEventListener('click', (e) => {
            e.stopPropagation(); // Avoid painting trigger on canvas
            e.preventDefault();
            this.terrainBrushSize = size;
            controls.querySelectorAll('.brush-size-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
          });
          controls.appendChild(btn);
        });
        
        banner.appendChild(controls);
      }
      banner.style.display = 'block';
    }

    clearBanner() {
      const banner = document.getElementById('tycoon-active-banner');
      banner.style.display = 'none';
      banner.innerHTML = '';
    }

    showFarmerDetails(farmer) {
      this.selectedFarmerId = farmer.id;
      const title = document.getElementById('farmer-detail-title');
      const body = document.getElementById('farmer-detail-body');
      const footer = document.getElementById('farmer-detail-buttons');
      
      title.innerHTML = `${farmer.emoji} ${farmer.name}`;
      
      body.innerHTML = `
        <div><strong>Status:</strong> ${farmer.currentAction}</div>
        <div><strong>Speed:</strong> ${farmer.speed} tiles/s</div>
        <div><strong>Passive Boost:</strong> Boosts nearby crop production rate by +25% in a 3x3 area</div>
      `;
      
      footer.innerHTML = `
        <button class="tycoon-btn exit-btn" id="farmer-close-btn">Close</button>
      `;

      document.getElementById('farmer-close-btn').addEventListener('click', () => {
        document.getElementById('tycoon-farmer-dialog').style.display = 'none';
        this.selectedFarmerId = null;
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
      document.getElementById('tycoon-gold-val').textContent = Math.floor(this.resources.gold);
      document.getElementById('tycoon-ap-val').textContent = Math.floor(this.resources.ap);
      document.getElementById('tycoon-food-val').textContent = Math.floor(this.resources.food);
      
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
      // Farmers no longer consume food or rate
      const formattedRate = totalRate % 1 === 0 ? totalRate.toFixed(0) : totalRate.toFixed(1);
      document.getElementById('tycoon-rate-val').textContent = `${formattedRate}g/s`;

      // Read-only task completion indicator on HUD
      const rate = this.calculateCurrentCompletionRate();
      const rateEl = document.getElementById('tycoon-rate-val');
      if (rateEl) {
        const pct = Math.round(rate * 100);
        const color = pct >= 80 ? '#4ade80' : pct >= 40 ? '#fbbf24' : '#f87171';
        rateEl.title = `Task completion today: ${pct}% (affects production multiplier)`;
        rateEl.style.color = color;
      }
    }

    // Entering Tycoon Mode
    enterTycoonMode(completionRate = null) {
      // Ensure main game UI is initialized so task panels and handle containers exist in the DOM
      if (typeof UIManager !== 'undefined' && !document.getElementById('dailiesPanel')) {
        UIManager.initializeUI();
      }

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
      // Skip the dailies/todos panels & handles — their visibility is managed by CSS in tycoon mode
      const TYCOON_PANEL_IDS = new Set(['dailiesPanel', 'leftTabHandlesContainer', 'todosPanel', 'rightTabHandlesContainer']);
      Array.from(document.body.children).forEach(el => {
        if (el.id !== 'tycoon-container' && el.tagName !== 'SCRIPT' && el.tagName !== 'STYLE' && !TYCOON_PANEL_IDS.has(el.id)) {
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
      
      // Return to main game cleanly — no reload needed.
      // The data-original-display restoration above already brings the main UI back.
      // Refresh the game HUD so resource values are current.
      try {
        if (window.UIManager && typeof UIManager.refreshGameUI === 'function') {
          UIManager.refreshGameUI();
        }
      } catch(e) {
        // Fallback only if UI manager is genuinely unavailable
        console.warn('Tycoon exit: UIManager not available, reloading as fallback', e);
        location.reload();
      }
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

          // Tycoon's own daily cycle fired — show summary popup only.
          // We never reset the main game's dailies from inside tycoon.
          case 'tycoon_daily_summary':
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
      
      // Frustum culling dimensions (expanded to prevent clipping 3x3 object boundaries)
      const tw = this.tileWidth;
      const worldLeft = this.camera.x - (w / 2) / zoom;
      const worldTop = this.camera.y - (h / 2) / zoom;
      const worldRight = this.camera.x + (w / 2) / zoom;
      const worldBottom = this.camera.y + (h / 2) / zoom;
      
      const minTileX = Math.floor(worldLeft / tw) - 2;
      const minTileY = Math.floor(worldTop / tw) - 2;
      const maxTileX = Math.ceil(worldRight / tw) + 2;
      const maxTileY = Math.ceil(worldBottom / tw) + 2;
      
      // Pass 1: Render terrain backgrounds
      for (let ty = minTileY; ty <= maxTileY; ty++) {
        for (let tx = minTileX; tx <= maxTileX; tx++) {
          const tile = this.getTileTypeAt(tx, ty);
          let type = tile & 0xFF;
          const charge = (tile >> 8) & 0xFF;
          const subType = (tile >> 24) & 0xFF;
          
          // Draw standard land under objects during background pass
          if (type === TILE_TYPES.PRODUCER || type === TILE_TYPES.INCREASER || 
              type === TILE_TYPES.MAINTENANCE || type === TILE_TYPES.COSMETIC) {
            type = TILE_TYPES.GRASS;
          }
          
          this.drawTileTexture(ctx, tx, ty, type, charge, subType);
        }
      }

      // Pass 2: Render 3x3 objects on top of terrain backgrounds
      for (let ty = minTileY; ty <= maxTileY; ty++) {
        for (let tx = minTileX; tx <= maxTileX; tx++) {
          const tile = this.getTileTypeAt(tx, ty);
          const type = tile & 0xFF;
          if (type === TILE_TYPES.PRODUCER || type === TILE_TYPES.INCREASER || 
              type === TILE_TYPES.MAINTENANCE || type === TILE_TYPES.COSMETIC) {
            const charge = (tile >> 8) & 0xFF;
            const subType = (tile >> 24) & 0xFF;
            this.drawTileObject(ctx, tx, ty, type, charge, subType);
          }
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

      // Step 4: Render active placement tool hover preview
      if (this.activeTool && this.hoverTile) {
        const tx = this.hoverTile.x;
        const ty = this.hoverTile.y;
        const hx = tx * tw;
        const hy = ty * tw;
        
        const isTerrain = (this.activeTool.type === TILE_TYPES.GRASS ||
                           this.activeTool.type === TILE_TYPES.SAND ||
                           this.activeTool.type === TILE_TYPES.STONE ||
                           this.activeTool.type === TILE_TYPES.WATER);
        
        if (isTerrain) {
          // Draw circle terrain painting brush preview
          const size = this.terrainBrushSize || 1;
          const radius = size / 2;
          const radiusSq = radius * radius;
          const half = Math.floor(size / 2);
          
          ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
          ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
          ctx.lineWidth = 1;
          
          for (let dy = -half; dy <= half; dy++) {
            for (let dx = -half; dx <= half; dx++) {
              if (dx * dx + dy * dy <= radiusSq) {
                ctx.fillRect((tx + dx) * tw, (ty + dy) * tw, tw, tw);
                ctx.strokeRect((tx + dx) * tw, (ty + dy) * tw, tw, tw);
              }
            }
          }
        } else if (this.activeTool.type === TILE_TYPES.FARMER) {
          // Farmer is a 1x1 placement entity
          const isLand = (this.getTileTypeAt(tx, ty) === TILE_TYPES.GRASS || 
                          this.getTileTypeAt(tx, ty) === TILE_TYPES.SAND || 
                          this.getTileTypeAt(tx, ty) === TILE_TYPES.STONE);
          ctx.fillStyle = isLand ? "rgba(34, 197, 94, 0.3)" : "rgba(239, 68, 68, 0.3)";
          ctx.strokeStyle = isLand ? "rgba(34, 197, 94, 0.6)" : "rgba(239, 68, 68, 0.6)";
          ctx.lineWidth = 2;
          ctx.fillRect(hx, hy, tw, tw);
          ctx.strokeRect(hx, hy, tw, tw);
        } else {
          // Object: 3x3 footprint placement
          const isValid = this.canPlaceObjectAt(tx, ty);
          ctx.fillStyle = isValid ? "rgba(34, 197, 94, 0.25)" : "rgba(239, 68, 68, 0.25)";
          ctx.strokeStyle = isValid ? "rgba(34, 197, 94, 0.6)" : "rgba(239, 68, 68, 0.6)";
          ctx.lineWidth = 2;
          ctx.fillRect(hx - tw, hy - tw, tw * 3, tw * 3);
          ctx.strokeRect(hx - tw, hy - tw, tw * 3, tw * 3);
          
          // Draw the emoji preview in center at 50% opacity
          ctx.save();
          ctx.globalAlpha = 0.5;
          ctx.font = "42px Arial";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          let previewEmoji = this.activeTool.emoji;
          ctx.fillText(previewEmoji, hx + tw / 2, hy + tw / 2);
          ctx.restore();
        }
      }

      // Step 5: Render dragged object overlay during relocation
      if (this.isDraggingObject && this.draggedObject && this.hoverTile) {
        const tx = this.hoverTile.x;
        const ty = this.hoverTile.y;
        const hx = tx * tw;
        const hy = ty * tw;
        
        const type = this.draggedObject.tileVal & 0xFF;
        const subType = (this.draggedObject.tileVal >> 24) & 0xFF;
        
        const isValid = this.canPlaceObjectAt(tx, ty);
        ctx.fillStyle = isValid ? "rgba(34, 197, 94, 0.25)" : "rgba(239, 68, 68, 0.25)";
        ctx.strokeStyle = isValid ? "rgba(34, 197, 94, 0.6)" : "rgba(239, 68, 68, 0.6)";
        ctx.lineWidth = 2;
        ctx.fillRect(hx - tw, hy - tw, tw * 3, tw * 3);
        ctx.strokeRect(hx - tw, hy - tw, tw * 3, tw * 3);
        
        ctx.save();
        ctx.globalAlpha = 0.55;
        ctx.font = "42px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        
        let emoji = "🧱";
        if (type === TILE_TYPES.PRODUCER) {
          emoji = "🌲";
          if (subType === PRODUCER_SUBS.TOMATO) emoji = "🍅";
          else if (subType === PRODUCER_SUBS.APPLE) emoji = "🍎";
        } else if (type === TILE_TYPES.INCREASER) {
          emoji = "🧪";
        } else if (type === TILE_TYPES.MAINTENANCE) {
          emoji = "🚿";
        } else if (type === TILE_TYPES.COSMETIC) {
          const noise = (this.draggedObject.x * 17 + this.draggedObject.y * 31) % 100;
          emoji = noise < 33 ? "🪨" : noise < 66 ? "🍄" : "🌸";
        }
        
        ctx.fillText(emoji, hx + tw / 2, hy + tw / 2);
        ctx.restore();
      }
      
      ctx.restore();
    }

    getTerrainBaseType(type) {
      if (type === TILE_TYPES.PRODUCER || 
          type === TILE_TYPES.INCREASER || 
          type === TILE_TYPES.MAINTENANCE || 
          type === TILE_TYPES.COSMETIC) {
        return TILE_TYPES.GRASS; // Generic land type base
      }
      return type;
    }

    drawTileTexture(ctx, tx, ty, type, charge, subType) {
      const tw = this.tileWidth;
      const x = tx * tw;
      const y = ty * tw;
      
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
      }

      // Draw darker borders if adjacent to a different base terrain
      const currentBase = this.getTerrainBaseType(type);
      
      const upBase = this.getTerrainBaseType(this.getTileTypeAt(tx, ty - 1) & 0xFF);
      const downBase = this.getTerrainBaseType(this.getTileTypeAt(tx, ty + 1) & 0xFF);
      const leftBase = this.getTerrainBaseType(this.getTileTypeAt(tx - 1, ty) & 0xFF);
      const rightBase = this.getTerrainBaseType(this.getTileTypeAt(tx + 1, ty) & 0xFF);
      
      ctx.fillStyle = "rgba(15, 23, 42, 0.45)"; // Dark slate boundary color
      const borderThickness = 3;
      
      if (upBase !== currentBase) {
        ctx.fillRect(x, y, tw, borderThickness);
      }
      if (downBase !== currentBase) {
        ctx.fillRect(x, y + tw - borderThickness, tw, borderThickness);
      }
      if (leftBase !== currentBase) {
        ctx.fillRect(x, y, borderThickness, tw);
      }
      if (rightBase !== currentBase) {
        ctx.fillRect(x + tw - borderThickness, y, borderThickness, tw);
      }
      
      // Draw light border grid lines to make it look premium and organized
      ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, tw, tw);
    }

    drawTileObject(ctx, tx, ty, type, charge, subType) {
      const tw = this.tileWidth;
      const x = tx * tw;
      const y = ty * tw;
      
      // Deterministic noise for tile pixel patterns
      const noise = (tx * 17 + ty * 31) % 100;
      
      switch (type) {
        case TILE_TYPES.PRODUCER: {
          // Warm brown soil overlay on the 3x3 footprint
          ctx.fillStyle = "rgba(120, 53, 15, 0.25)";
          ctx.fillRect(x - tw, y - tw, tw * 3, tw * 3);
          ctx.strokeStyle = "rgba(120, 53, 15, 0.5)";
          ctx.lineWidth = 1.5;
          ctx.strokeRect(x - tw, y - tw, tw * 3, tw * 3);
          
          let emoji = "🌲";
          if (subType === PRODUCER_SUBS.TOMATO) emoji = "🍅";
          else if (subType === PRODUCER_SUBS.APPLE) emoji = "🍎";
          
          ctx.font = "42px Arial";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(emoji, x + tw / 2, y + tw / 2);
          
          // Draw charge status bar (durability indicator) - scaled to 3x3 bottom
          const barWidth = tw * 2;
          const barHeight = 4;
          const barX = x + tw / 2 - barWidth / 2;
          const barY = y + tw * 2 - 8;
          ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
          ctx.fillRect(barX, barY, barWidth, barHeight);
          
          const chargePct = charge / 255;
          ctx.fillStyle = chargePct > 0.3 ? "#22c55e" : "#ef4444";
          ctx.fillRect(barX, barY, barWidth * chargePct, barHeight);
          break;
        }
          
        case TILE_TYPES.INCREASER: {
          // Light purple chemical/fertilizer field
          ctx.fillStyle = "rgba(147, 51, 234, 0.15)";
          ctx.fillRect(x - tw, y - tw, tw * 3, tw * 3);
          ctx.strokeStyle = "rgba(147, 51, 234, 0.5)";
          ctx.lineWidth = 1.5;
          ctx.strokeRect(x - tw, y - tw, tw * 3, tw * 3);
          
          ctx.font = "42px Arial";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("🧪", x + tw / 2, y + tw / 2);
          break;
        }
          
        case TILE_TYPES.MAINTENANCE: {
          // Light blue sprinkler watering field
          ctx.fillStyle = "rgba(14, 165, 233, 0.15)";
          ctx.fillRect(x - tw, y - tw, tw * 3, tw * 3);
          ctx.strokeStyle = "rgba(14, 165, 233, 0.5)";
          ctx.lineWidth = 1.5;
          ctx.strokeRect(x - tw, y - tw, tw * 3, tw * 3);
          
          ctx.font = "42px Arial";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("🚿", x + tw / 2, y + tw / 2);
          
          // Sprinkler Charge indicator - scaled to 3x3 bottom
          const barWidth = tw * 2;
          const barHeight = 4;
          const barX = x + tw / 2 - barWidth / 2;
          const barY = y + tw * 2 - 8;
          ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
          ctx.fillRect(barX, barY, barWidth, barHeight);
          ctx.fillStyle = "#38bdf8";
          ctx.fillRect(barX, barY, barWidth * (charge / 255), barHeight);
          break;
        }
          
        case TILE_TYPES.COSMETIC: {
          // Light gold decorative field
          ctx.fillStyle = "rgba(251, 191, 36, 0.08)";
          ctx.fillRect(x - tw, y - tw, tw * 3, tw * 3);
          ctx.strokeStyle = "rgba(251, 191, 36, 0.4)";
          ctx.lineWidth = 1.5;
          ctx.strokeRect(x - tw, y - tw, tw * 3, tw * 3);
          
          let cosEmoji = "🌸";
          if (noise < 33) cosEmoji = "🪨";
          else if (noise < 66) cosEmoji = "🍄";
          
          ctx.font = "42px Arial";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(cosEmoji, x + tw / 2, y + tw / 2);
          break;
        }
      }
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

    findObjectCenterAt(cx, cy) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const tx = cx + dx;
          const ty = cy + dy;
          const tileVal = this.getTileTypeAt(tx, ty);
          const type = tileVal & 0xFF;
          if (type === TILE_TYPES.PRODUCER || type === TILE_TYPES.INCREASER || 
              type === TILE_TYPES.MAINTENANCE || type === TILE_TYPES.COSMETIC) {
            return { x: tx, y: ty, tileVal: tileVal };
          }
        }
      }
      return null;
    }

    showObjectDetails(obj) {
      const title = document.getElementById('object-detail-title');
      const body = document.getElementById('object-detail-body');
      const footer = document.getElementById('object-detail-buttons');
      
      const type = obj.tileVal & 0xFF;
      const charge = (obj.tileVal >> 8) & 0xFF;
      const subType = (obj.tileVal >> 24) & 0xFF;
      
      let name = "Object";
      let emoji = "🧱";
      let cost = 10;
      let infoHtml = "";
      
      if (type === TILE_TYPES.PRODUCER) {
        if (subType === PRODUCER_SUBS.TREE) {
          name = "AP Tree";
          emoji = "🌲";
          cost = 20;
          infoHtml = `
            <div><strong>Type:</strong> AP Crop</div>
            <div><strong>Water Durability:</strong> ${Math.round(charge / 255 * 100)}%</div>
            <div><strong>Yields:</strong> 🪙 2 Gold & ⚡ 1 AP per second (when watered)</div>
          `;
        } else if (subType === PRODUCER_SUBS.TOMATO) {
          name = "Tomato Crop";
          emoji = "🍅";
          cost = 30;
          infoHtml = `
            <div><strong>Type:</strong> Gold Crop</div>
            <div><strong>Water Durability:</strong> ${Math.round(charge / 255 * 100)}%</div>
            <div><strong>Yields:</strong> 🪙 1 Gold & ⚡ 3 AP per second, 5% chance of Food (when watered)</div>
          `;
        } else if (subType === PRODUCER_SUBS.APPLE) {
          name = "Apple Tree";
          emoji = "🍎";
          cost = 50;
          infoHtml = `
            <div><strong>Type:</strong> Premium Crop</div>
            <div><strong>Water Durability:</strong> ${Math.round(charge / 255 * 100)}%</div>
            <div><strong>Yields:</strong> 🪙 3 Gold & ⚡ 5 AP per second, 10% chance of Food (when watered)</div>
          `;
        }
      } else if (type === TILE_TYPES.INCREASER) {
        name = "Fertilizer (+20%)";
        emoji = "🧪";
        cost = 40;
        infoHtml = `
          <div><strong>Type:</strong> Utility Booster</div>
          <div><strong>Effect:</strong> Boosts production of crops in surrounding 3x3 footprint by +20%</div>
        `;
      } else if (type === TILE_TYPES.MAINTENANCE) {
        name = "Sprinkler";
        emoji = "🚿";
        cost = 60;
        infoHtml = `
          <div><strong>Type:</strong> Utility Care</div>
          <div><strong>Water Charge:</strong> ${Math.round(charge / 255 * 100)}%</div>
          <div><strong>Effect:</strong> Prevents decay of crops in surrounding 3x3 footprint (recharges at daily check-in)</div>
        `;
      } else if (type === TILE_TYPES.COSMETIC) {
        const noise = (obj.x * 17 + obj.y * 31) % 100;
        if (noise < 33) {
          name = "Decorative Rock";
          emoji = "🪨";
          cost = 10;
        } else if (noise < 66) {
          name = "Magic Mushroom";
          emoji = "🍄";
          cost = 15;
        } else {
          name = "Flower Pot";
          emoji = "🌸";
          cost = 10;
        }
        infoHtml = `
          <div><strong>Type:</strong> Cosmetic Decoration</div>
          <div><strong>Effect:</strong> Looks outstanding!</div>
        `;
      }
      
      const refund = Math.floor(cost * 0.7);
      
      title.innerHTML = `${emoji} ${name}`;
      body.innerHTML = `
        ${infoHtml}
        <div style="margin-top: 12px; font-weight: bold; color: #ffd700;">Sell Refund: 🪙 ${refund} (70%)</div>
      `;
      
      footer.innerHTML = `
        <button class="tycoon-btn exit-btn" id="object-sell-btn">🪙 Sell (${refund})</button>
        <button class="tycoon-btn" id="object-close-btn">Close</button>
      `;
      
      document.getElementById('object-sell-btn').addEventListener('click', () => {
        this.resources.gold += refund;
        this.setTileTypeAt(obj.x, obj.y, TILE_TYPES.GRASS);
        this.postTileUpdateToWorker(obj.x, obj.y, TILE_TYPES.GRASS);
        this.updateHUD();
        this.addNotification(`🪙 Sold ${name} for ${refund} gold!`);
        document.getElementById('tycoon-object-dialog').style.display = 'none';
      });
      
      document.getElementById('object-close-btn').addEventListener('click', () => {
        document.getElementById('tycoon-object-dialog').style.display = 'none';
      });
      
      document.getElementById('tycoon-object-dialog').style.display = 'flex';
    }
  }

  // Register in global namespace
  window.TycoonManager = new TycoonEngine();
})();
