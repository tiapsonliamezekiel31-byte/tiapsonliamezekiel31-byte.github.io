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
    COSMETIC: 8,
    ENERGY_TREE: 9
  };

  const PRODUCER_SUBS = {
    TREE: 1,
    TOMATO: 2,
    APPLE: 3,
    CORN: 4,
    CARROT: 5,
    MUSHROOM: 6,
    CROP7: 7,
    CROP8: 8,
    CROP9: 9,
    CROP10: 10,
    CROP11: 11,
    CROP12: 12,
    CROP13: 13,
    CROP14: 14,
    CROP15: 15,
    CROP16: 16,
    CROP17: 17,
    CROP18: 18
  };

  const CROP_TEMPLATES = [
    { name: "Pink Peonies", cost: 100, gold: 0.02, ap: 0.01, food: 0.0005, emoji: "🌸" },
    { name: "Blue Hydrangea", cost: 120, gold: 0.02, ap: 0.02, food: 0.0006, emoji: "💠" },
    { name: "Sunflowers", cost: 150, gold: 0.03, ap: 0.01, food: 0.0007, emoji: "🌻" },
    { name: "Lavender Bush", cost: 180, gold: 0.03, ap: 0.03, food: 0.0008, emoji: "🪻" },
    { name: "Bluebells", cost: 200, gold: 0.04, ap: 0.02, food: 0.0009, emoji: "🔔" },
    { name: "Orange Wildflowers", cost: 220, gold: 0.04, ap: 0.04, food: 0.0010, emoji: "🌼" },
    { name: "Butterfly Shrub", cost: 250, gold: 0.05, ap: 0.03, food: 0.0011, emoji: "🦋" },
    { name: "Coral Azalea", cost: 280, gold: 0.05, ap: 0.05, food: 0.0012, emoji: "🌺" },
    { name: "Pink Petunias", cost: 320, gold: 0.06, ap: 0.04, food: 0.0013, emoji: "🌸" },
    { name: "Crimson Roses", cost: 360, gold: 0.06, ap: 0.06, food: 0.0014, emoji: "🌹" },
    { name: "Fern Shrub", cost: 400, gold: 0.07, ap: 0.05, food: 0.0015, emoji: "🌿" },
    { name: "Tulip Bed", cost: 450, gold: 0.07, ap: 0.07, food: 0.0016, emoji: "🌷" },
    { name: "Rock Daisy", cost: 500, gold: 0.08, ap: 0.06, food: 0.0017, emoji: "🌼" },
    { name: "Orange Lilies", cost: 550, gold: 0.08, ap: 0.08, food: 0.0018, emoji: "⚜️" },
    { name: "Rockery Garden", cost: 620, gold: 0.09, ap: 0.07, food: 0.0019, emoji: "🪨" },
    { name: "Red-Stem Shrub", cost: 700, gold: 0.09, ap: 0.09, food: 0.0020, emoji: "🍒" },
    { name: "Rose Trellis", cost: 800, gold: 0.10, ap: 0.08, food: 0.0021, emoji: "🌹" },
    { name: "Stone Path Flowers", cost: 950, gold: 0.12, ap: 0.10, food: 0.0022, emoji: "🪨" }
  ];

  class TycoonEngine {
    constructor() {
      this.canvas = null;
      this.ctx = null;
      this.worker = null;
      this.cropsImage = new Image();
      this.cropsImage.src = 'cropsstylesheet.png';
      this.farmerImageCache = {};
      
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
        lastSaveTime: Date.now(),
        snapToGrid: true,
        hideGrid: false,
        pinkMode: false,
        terrainBorders: false
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
            <div class="tycoon-hud-panel stats-trigger" id="tycoon-hud-stats-panel" title="Click to view detailed daily production statistics">
              <div class="tycoon-stat gold">🪙 <span id="tycoon-gold-val">100</span></div>
              <div class="tycoon-stat ap">⚡ <span id="tycoon-ap-val">0</span></div>
              <div class="tycoon-stat food" style="display: none;">🍎 <span id="tycoon-food-val">0</span></div>
              <div class="tycoon-stat rate">📈 <span id="tycoon-rate-val">1g/s</span></div>
            </div>
            <div class="tycoon-hud-panel" style="gap: 8px;">
              <button class="tycoon-btn" id="tycoon-checkin-btn" style="background: rgba(34, 197, 94, 0.2); border-color: rgba(34, 197, 94, 0.4);">🌅 Check In</button>
              <button class="tycoon-btn" id="tycoon-mp-toggle-btn">🌐 Multiplayer</button>
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

          <div id="tycoon-mp-log-container" class="tycoon-mp-log-panel" style="display: none;">
            <div class="tycoon-mp-log-header" id="tycoon-mp-log-header">
              <span>📋 World Log</span>
              <button class="tycoon-mp-log-toggle" id="tycoon-mp-log-toggle-btn">▼</button>
            </div>
            <div class="tycoon-mp-log-body" id="tycoon-mp-log-body"></div>
          </div>
          
          <div class="tycoon-shop-drawer" id="tycoon-shop">
            <div class="tycoon-shop-handle" id="tycoon-shop-handle"></div>
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
                <div class="tycoon-form-row" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                  <label for="settings-snap-grid" style="flex: 1;">Snap Items to Grid:</label>
                  <input type="checkbox" id="settings-snap-grid" style="width: auto !important; height: auto; transform: scale(1.2); margin-right: 8px;">
                </div>
                <div class="tycoon-form-row" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                  <label for="settings-hide-grid" style="flex: 1;">Hide Grid when Building:</label>
                  <input type="checkbox" id="settings-hide-grid" style="width: auto !important; height: auto; transform: scale(1.2); margin-right: 8px;">
                </div>
                <div class="tycoon-form-row" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                  <label for="settings-pink-mode" style="flex: 1;">Pink Mode:</label>
                  <input type="checkbox" id="settings-pink-mode" style="width: auto !important; height: auto; transform: scale(1.2); margin-right: 8px;">
                </div>
                <div class="tycoon-form-row" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                  <label for="settings-terrain-borders" style="flex: 1;">Terrain Borders (Vibrant Purple):</label>
                  <input type="checkbox" id="settings-terrain-borders" style="width: auto !important; height: auto; transform: scale(1.2); margin-right: 8px;">
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

          <div class="tycoon-overlay" id="tycoon-mp-dialog" style="display: none;">
            <div class="tycoon-dialog">
              <h3>🌐 MULTIPLAYER CO-OP</h3>
              <div class="tycoon-dialog-body">
                <div class="tycoon-form-row">
                  <label for="mp-player-name">Your Name:</label>
                  <input type="text" id="mp-player-name" placeholder="Username..." style="width: 150px !important;">
                </div>
                <div class="tycoon-form-row">
                  <label for="mp-world-name">World Name:</label>
                  <input type="text" id="mp-world-name" placeholder="e.g. DreamFarm" style="width: 150px !important;">
                </div>
                <div class="tycoon-form-row">
                  <label for="mp-password">Password:</label>
                  <input type="password" id="mp-password" placeholder="Room password..." style="width: 150px !important;">
                </div>
                <div style="font-size: 8px; color: #94a3b8; line-height: 1.4; margin-top: 6px;">
                  * Enter a unique world name and password. If the world doesn't exist yet, it will be created for you with that password.
                </div>
                <div class="tycoon-form-row" style="flex-direction: column; align-items: flex-start; margin-top: 12px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 12px; width: 100%;">
                  <label for="mp-custom-firebase" style="margin-bottom: 4px;">Custom Firebase Credentials (Optional):</label>
                  <textarea id="mp-custom-firebase" placeholder='{"apiKey": "...", "databaseURL": "...", "projectId": "..."}' style="width: 100%; height: 50px; background: #0f172a; color: #cbd5e1; border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 6px; font-family: monospace; font-size: 8px; resize: vertical; box-sizing: border-box;"></textarea>
                  <div style="display: flex; gap: 8px; margin-top: 6px; width: 100%;">
                    <button class="tycoon-btn" id="mp-save-config-btn" style="flex: 1; min-height: 28px; font-size: 8px; padding: 4px;">Save Config</button>
                    <button class="tycoon-btn" id="mp-reset-config-btn" style="flex: 1; min-height: 28px; font-size: 8px; padding: 4px; background: rgba(239, 68, 68, 0.2); border-color: rgba(239, 68, 68, 0.4);">Reset Config</button>
                  </div>
                </div>
              </div>
              <div class="tycoon-dialog-buttons">
                <button class="tycoon-btn" id="mp-connect-btn" style="background: rgba(34, 197, 94, 0.2); border-color: rgba(34, 197, 94, 0.4);">Connect</button>
                <button class="tycoon-btn exit-btn" id="mp-disconnect-btn" style="display: none; background: rgba(239, 68, 68, 0.2); border-color: rgba(239, 68, 68, 0.4);">Disconnect</button>
                <button class="tycoon-btn" id="mp-close-btn">Close</button>
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
 
          <div class="tycoon-overlay" id="tycoon-object-dialog">
            <div class="tycoon-dialog">
              <h3 id="object-detail-title">🧱 Object Info</h3>
              <div class="tycoon-dialog-body" id="object-detail-body"></div>
              <div class="tycoon-dialog-buttons" id="object-detail-buttons"></div>
            </div>
          </div>
 
          <div class="tycoon-overlay" id="tycoon-stats-dialog">
            <div class="tycoon-dialog" style="width: min(480px, 94vw);">
              <h3 id="stats-detail-title">📊 Production Summary</h3>
              <div class="tycoon-dialog-body" id="stats-detail-body"></div>
              <div class="tycoon-dialog-buttons">
                <button class="tycoon-btn" id="stats-close-btn" style="width: 100%;">Close</button>
              </div>
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
          this.hoverWorldPos = this.screenToWorldPreciseCoords(e.clientX, e.clientY);
          
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
            // First check if clicked a farmer visually in screen-space
            const clickedFarmer = this.findFarmerAt(e.clientX, e.clientY);
            if (clickedFarmer) {
              this.showFarmerDetails(clickedFarmer);
            } else {
              // Check if clicked an object center/footprint
              const obj = this.findObjectCenterAt(tile.x, tile.y);
              if (obj) {
                this.potentialDraggedObject = obj;
                this.interactionStartTile = tile;
                this.interactionStartPos = { x: e.clientX, y: e.clientY };
                this.isDraggingObject = false;
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
        this.hoverWorldPos = this.screenToWorldPreciseCoords(e.clientX, e.clientY);

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
            if (window.MultiplayerManager.isConnected) {
              window.MultiplayerManager.broadcastTileUpdate(this.draggedObject.x, this.draggedObject.y, 1); // 1 is GRASS
              window.MultiplayerManager.broadcastTileUpdate(dropTile.x, dropTile.y, this.draggedObject.tileVal);
              window.MultiplayerManager.addLogEntry(`moved building to (${dropTile.x}, ${dropTile.y})`);
            } else {
              this.setTileTypeAt(dropTile.x, dropTile.y, this.draggedObject.tileVal);
              this.postTileUpdateToWorker(dropTile.x, dropTile.y, this.draggedObject.tileVal);
            }
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
          this.hoverWorldPos = this.screenToWorldPreciseCoords(touch.clientX, touch.clientY);
          
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
            // First check if clicked a farmer visually in screen-space
            const clickedFarmerMapped = this.findFarmerAt(touch.clientX, touch.clientY);
            if (clickedFarmerMapped) {
              this.showFarmerDetails(clickedFarmerMapped);
            } else {
              // Check if clicked an object center/footprint
              const obj = this.findObjectCenterAt(tile.x, tile.y);
              if (obj) {
                this.potentialDraggedObject = obj;
                this.interactionStartTile = tile;
                this.interactionStartPos = { x: touch.clientX, y: touch.clientY };
                this.isDraggingObject = false;
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
          this.hoverWorldPos = this.screenToWorldPreciseCoords(touch.clientX, touch.clientY);
          
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
            if (window.MultiplayerManager.isConnected) {
              window.MultiplayerManager.broadcastTileUpdate(this.draggedObject.x, this.draggedObject.y, 1); // 1 is GRASS
              window.MultiplayerManager.broadcastTileUpdate(dropTile.x, dropTile.y, this.draggedObject.tileVal);
              window.MultiplayerManager.addLogEntry(`moved building to (${dropTile.x}, ${dropTile.y})`);
            } else {
              this.setTileTypeAt(dropTile.x, dropTile.y, this.draggedObject.tileVal);
              this.postTileUpdateToWorker(dropTile.x, dropTile.y, this.draggedObject.tileVal);
            }
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
          
          if (window.MultiplayerManager && window.MultiplayerManager.isConnected) {
            const db = window.MultiplayerManager.db;
            const worldName = window.MultiplayerManager.worldName;
            const playerName = window.MultiplayerManager.playerName;
            if (db && worldName && playerName) {
              db.ref(`worlds/${worldName}/players/${playerName}/completionRate`).set(completionRate);
              window.MultiplayerManager.addLogEntry(`checked in with ${Math.round(completionRate * 100)}% task completion.`);
            }
          }
          
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
        document.getElementById('settings-snap-grid').checked = this.config.snapToGrid !== false;
        document.getElementById('settings-hide-grid').checked = !!this.config.hideGrid;
        document.getElementById('settings-pink-mode').checked = this.config.pinkMode === true;
        document.getElementById('settings-terrain-borders').checked = this.config.terrainBorders === true;
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
        this.config.snapToGrid = document.getElementById('settings-snap-grid').checked;
        this.config.hideGrid = document.getElementById('settings-hide-grid').checked;
        this.config.pinkMode = document.getElementById('settings-pink-mode').checked;
        this.config.terrainBorders = document.getElementById('settings-terrain-borders').checked;
        
        if (this.config.pinkMode) {
          document.body.classList.add('tycoon-pink-mode');
        } else {
          document.body.classList.remove('tycoon-pink-mode');
        }
        
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
            // Sync to multiplayer world if connected
            if (window.MultiplayerManager && window.MultiplayerManager.isConnected) {
              const gain = { gold: 0, ap: 0, food: 0 };
              gain[cmd] = amt;
              window.MultiplayerManager.gainResources(gain.gold, gain.ap, gain.food, `used cheat: +${amt} ${cmd}`);
            }
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
            // Sync reset to multiplayer world if connected
            if (window.MultiplayerManager && window.MultiplayerManager.isConnected) {
              const serialChunks = this.getSerializableState().chunks;
              const worldRef = window.MultiplayerManager.db.ref(`worlds/${window.MultiplayerManager.worldName}`);
              worldRef.update({
                resources: { gold: this.resources.gold, ap: this.resources.ap, food: this.resources.food, lastTickTime: Date.now() },
                farmers: [],
                chunks: serialChunks
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

      // Draggable Build Menu Shop Drawer
      const shopDrawer = document.getElementById('tycoon-shop');
      const shopHandle = document.getElementById('tycoon-shop-handle');
      
      let isDraggingDrawer = false;
      let startY = 0;
      let startHeight = 0;

      const onDragStart = (e) => {
        // If clicking on a tab button or nested button, don't drag
        if (e.target.closest('button') || e.target.closest('.tycoon-shop-tabs')) return;
        
        isDraggingDrawer = true;
        startY = e.clientY || (e.touches && e.touches[0].clientY);
        startHeight = parseInt(window.getComputedStyle(shopDrawer).height, 10) || 260;
        shopDrawer.style.transition = 'none'; // Disable transition during drag for smoothness
      };

      const onDragMove = (e) => {
        if (!isDraggingDrawer) return;
        const currentY = e.clientY || (e.touches && e.touches[0].clientY);
        const dy = currentY - startY; // Dragging down increases Y (dy > 0), dragging up decreases Y (dy < 0)
        
        // Height increases as we drag up (negative dy)
        const newHeight = Math.max(60, Math.min(window.innerHeight * 0.8, startHeight - dy));
        shopDrawer.style.height = `${newHeight}px`;
      };

      const onDragEnd = () => {
        if (!isDraggingDrawer) return;
        isDraggingDrawer = false;
        shopDrawer.style.transition = 'height 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
      };

      // Mouse drag handlers
      shopHandle.addEventListener('mousedown', onDragStart);
      window.addEventListener('mousemove', onDragMove);
      window.addEventListener('mouseup', onDragEnd);

      // Touch drag handlers
      shopHandle.addEventListener('touchstart', onDragStart, { passive: true });
      window.addEventListener('touchmove', onDragMove, { passive: true });
      window.addEventListener('touchend', onDragEnd);

      // Header drag handlers
      const shopHeader = shopDrawer.querySelector('.tycoon-shop-header');
      if (shopHeader) {
        shopHeader.addEventListener('mousedown', onDragStart);
        shopHeader.addEventListener('touchstart', onDragStart, { passive: true });
      }

      // Click HUD panel to view stats dialog
      const statsPanel = document.getElementById('tycoon-hud-stats-panel');
      if (statsPanel) {
        statsPanel.addEventListener('click', () => {
          // Calculate exact current production rates
          let goldRateSec = 0;
          let apRateSec = 0;
          let cropCount = 0;
          let sprinklerCount = 0;
          let fertilizerCount = 0;
          let cosmeticCount = 0;

          for (const key in this.chunks) {
            const arr = this.chunks[key];
            for (let i = 0; i < 1024; i++) {
              const tile = arr[i];
              const type = tile & 0xFF;
              const charge = (tile >> 8) & 0xFF;
              const subType = (tile >> 24) & 0xFF;

              if (type === TILE_TYPES.PRODUCER) {
                cropCount++;
                if (charge > 0) {
                  const cropIdx = (subType >= 1 && subType <= 18) ? (subType - 1) : 0;
                  const crop = CROP_TEMPLATES[cropIdx];
                  
                  // Calculate local multipliers (Fertilizers & Farmers)
                  const tx = i % 32;
                  const ty = Math.floor(i / 32);
                  const coords = key.split(",");
                  const cx = parseInt(coords[0]);
                  const cy = parseInt(coords[1]);
                  const gx = cx * 32 + tx;
                  const gy = cy * 32 + ty;

                  // Increaser count
                  let localFertilizers = 0;
                  for (const key2 in this.chunks) {
                    const arr2 = this.chunks[key2];
                    const coords2 = key2.split(",");
                    const cx2 = parseInt(coords2[0]);
                    const cy2 = parseInt(coords2[1]);
                    for (let idx2 = 0; idx2 < 1024; idx2++) {
                      if ((arr2[idx2] & 0xFF) === TILE_TYPES.INCREASER) {
                        const tx2 = idx2 % 32;
                        const ty2 = Math.floor(idx2 / 32);
                        const gx2 = cx2 * 32 + tx2;
                        const gy2 = cy2 * 32 + ty2;
                        if (Math.max(Math.abs(gx - gx2), Math.abs(gy - gy2)) <= 3) {
                          localFertilizers++;
                        }
                      }
                    }
                  }

                  // Farmer count
                  let localFarmers = 0;
                  this.farmers.forEach(farmer => {
                    if (!farmer.isSleeping && Math.max(Math.abs(gx - farmer.x), Math.abs(gy - farmer.y)) <= 2) {
                      localFarmers++;
                    }
                  });

                  let multiplier = 1.0 + (localFertilizers * 0.20) + (localFarmers * 0.25);
                  multiplier *= Math.max(0.1, this.config.completionRatePrevDay);

                  goldRateSec += (crop ? crop.gold : 1) * multiplier;
                  apRateSec += (crop ? crop.ap : 0) * multiplier;
                }
              } else if (type === TILE_TYPES.MAINTENANCE) {
                sprinklerCount++;
              } else if (type === TILE_TYPES.INCREASER) {
                fertilizerCount++;
              } else if (type === TILE_TYPES.COSMETIC) {
                cosmeticCount++;
              }
            }
          }

          // Extrapolate daily rates
          const goldRateHour = goldRateSec * 3600;
          const apRateHour = apRateSec * 3600;
          const goldRateDay = goldRateSec * 86400;
          const apRateDay = apRateSec * 86400;

          const completionPct = Math.round(this.config.completionRatePrevDay * 100);

          const bodyEl = document.getElementById('stats-detail-body');
          bodyEl.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 16px; font-size: 10px;">
              <table style="width: 100%; border-collapse: collapse; text-align: left;">
                <thead>
                  <tr style="border-bottom: 1px solid rgba(255,255,255,0.1); color: #94a3b8;">
                    <th style="padding: 6px 0;">Resource</th>
                    <th style="padding: 6px 0; text-align: right;">Per Second</th>
                    <th style="padding: 6px 0; text-align: right;">Per Hour</th>
                    <th style="padding: 6px 0; text-align: right;">Daily Pace</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style="border-bottom: 1px solid rgba(255,255,255,0.05); color: #ffd700;">
                    <td style="padding: 8px 0; font-weight: bold;">🪙 Gold</td>
                    <td style="padding: 8px 0; text-align: right;">${goldRateSec.toFixed(1)}g</td>
                    <td style="padding: 8px 0; text-align: right;">${Math.round(goldRateHour).toLocaleString()}g</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: bold;">${Math.round(goldRateDay).toLocaleString()}g</td>
                  </tr>
                  <tr style="color: #38bdf8;">
                    <td style="padding: 8px 0; font-weight: bold;">⚡ AP</td>
                    <td style="padding: 8px 0; text-align: right;">${apRateSec.toFixed(1)} AP</td>
                    <td style="padding: 8px 0; text-align: right;">${Math.round(apRateHour).toLocaleString()}</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: bold;">${Math.round(apRateDay).toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>

              <div style="background: rgba(0,0,0,0.3); border-radius: 8px; padding: 12px; display: flex; flex-direction: column; gap: 8px; border: 1px solid rgba(255,255,255,0.05);">
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: #94a3b8;">Task Streak Boost:</span>
                  <span style="color: ${completionPct >= 80 ? '#4ade80' : completionPct >= 40 ? '#fbbf24' : '#f87171'}; font-weight: bold;">${completionPct}% multiplier</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: #94a3b8;">Hired Farmers:</span>
                  <span style="color: #cbd5e1;">🧑‍🌾 ${this.farmers.length} roamer(s)</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: #94a3b8;">Placed Crops:</span>
                  <span style="color: #cbd5e1;">🌱 ${cropCount} crops</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: #94a3b8;">Infrastructure:</span>
                  <span style="color: #cbd5e1;">🚿 ${sprinklerCount} sprinkler(s) / 🧪 ${fertilizerCount} fertilizer(s)</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: #94a3b8;">Cosmetic Decos:</span>
                  <span style="color: #cbd5e1;">🌸 ${cosmeticCount} item(s)</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: #94a3b8;">Daily Reset Hour:</span>
                  <span style="color: #cbd5e1;">🌅 ${this.config.checkInHour || 10}:00</span>
                </div>
              </div>
            </div>
          `;
          
          document.getElementById('tycoon-stats-dialog').style.display = 'flex';
        });
      }

      const statsCloseBtn = document.getElementById('stats-close-btn');
      if (statsCloseBtn) {
        statsCloseBtn.addEventListener('click', () => {
          document.getElementById('tycoon-stats-dialog').style.display = 'none';
        });
      }

      // Multiplayer UI handlers
      const mpToggleBtn = document.getElementById('tycoon-mp-toggle-btn');
      if (mpToggleBtn) {
        mpToggleBtn.addEventListener('click', () => {
          document.getElementById('mp-player-name').value = window.MultiplayerManager.playerName || '';
          document.getElementById('mp-world-name').value = window.MultiplayerManager.worldName || localStorage.getItem('nemesis_multiplayer_active_world') || '';
          document.getElementById('mp-password').value = '';
          
          const customConfig = localStorage.getItem('nemesis_firebase_config');
          document.getElementById('mp-custom-firebase').value = customConfig ? customConfig : '';

          if (window.MultiplayerManager.isConnected) {
            document.getElementById('mp-connect-btn').style.display = 'none';
            document.getElementById('mp-disconnect-btn').style.display = 'block';
          } else {
            document.getElementById('mp-connect-btn').style.display = 'block';
            document.getElementById('mp-disconnect-btn').style.display = 'none';
          }

          document.getElementById('tycoon-mp-dialog').style.display = 'flex';
        });
      }

      document.getElementById('mp-close-btn').addEventListener('click', () => {
        document.getElementById('tycoon-mp-dialog').style.display = 'none';
      });

      document.getElementById('mp-connect-btn').addEventListener('click', async () => {
        const playerName = document.getElementById('mp-player-name').value.trim();
        const worldName = document.getElementById('mp-world-name').value.trim();
        const password = document.getElementById('mp-password').value;

        if (!playerName || !worldName || !password) {
          alert("All fields are required to connect!");
          return;
        }

        const connectBtn = document.getElementById('mp-connect-btn');
        connectBtn.disabled = true;
        connectBtn.textContent = "Connecting...";

        try {
          await window.MultiplayerManager.joinWorld(worldName, password, playerName);
          document.getElementById('tycoon-mp-dialog').style.display = 'none';
          window.MultiplayerManager.updateMultiplayerUI();
        } catch(e) {
          alert("Connection failed: " + e.message);
        } finally {
          connectBtn.disabled = false;
          connectBtn.textContent = "Connect";
        }
      });

      document.getElementById('mp-disconnect-btn').addEventListener('click', () => {
        window.MultiplayerManager.disconnect();
        document.getElementById('tycoon-mp-dialog').style.display = 'none';
      });

      document.getElementById('mp-save-config-btn').addEventListener('click', () => {
        const val = document.getElementById('mp-custom-firebase').value.trim();
        if (!val) {
          alert("Configuration JSON cannot be empty!");
          return;
        }
        try {
          const parsed = JSON.parse(val);
          if (!parsed.apiKey || !parsed.databaseURL || !parsed.projectId) {
            throw new Error("Missing key fields (apiKey, databaseURL, projectId)");
          }
          localStorage.setItem('nemesis_firebase_config', JSON.stringify(parsed));
          window.MultiplayerManager.firebaseConfig = parsed;
          alert("Custom Firebase configuration saved! Please reconnect.");
        } catch(e) {
          alert("Invalid JSON configuration: " + e.message);
        }
      });

      document.getElementById('mp-reset-config-btn').addEventListener('click', () => {
        localStorage.removeItem('nemesis_firebase_config');
        window.MultiplayerManager.firebaseConfig = null;
        document.getElementById('mp-custom-firebase').value = '';
        alert("Firebase config reset to default demo credentials.");
      });

      const logToggleBtn = document.getElementById('tycoon-mp-log-toggle-btn');
      if (logToggleBtn) {
        logToggleBtn.addEventListener('click', () => {
          const panel = document.getElementById('tycoon-mp-log-container');
          panel.classList.toggle('collapsed');
          logToggleBtn.textContent = panel.classList.contains('collapsed') ? '▲' : '▼';
        });
      }
      const logHeader = document.getElementById('tycoon-mp-log-header');
      if (logHeader) {
        logHeader.addEventListener('click', (e) => {
          if (e.target !== logToggleBtn) {
            logToggleBtn.click();
          }
        });
      }
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

    syncFarmersState() {
      this.saveState();
      if (window.MultiplayerManager && window.MultiplayerManager.isConnected) {
        window.MultiplayerManager.broadcastFarmersState(this.farmers);
        window.MultiplayerManager.addLogEntry(`customized sprite for ${this.farmers.find(f => f.id === this.selectedFarmerId)?.name || 'farmer'}`);
      } else {
        if (this.worker) {
          this.worker.postMessage({
            type: 'sync_state',
            farmers: this.farmers
          });
        }
      }
    }

    calculateCurrentCompletionRate() {
      let completionRate = 1.0;
      try {
        const state = getGameState();
        if (state && state.dailiesState) {
          const dailies = state.dailiesState.dailies || [];
          const scheduledDailies = typeof TaskManager !== 'undefined' && typeof TaskManager.isDailyScheduled === 'function' 
            ? dailies.filter(d => TaskManager.isDailyScheduled(d, TaskManager.getCurrentGameDateKey()))
            : dailies;
          const completed = scheduledDailies.filter(d => d.completed).length;
          const total = scheduledDailies.length;
          completionRate = total > 0 ? (completed / total) : 1.0;
        }
      } catch(e) {}
      return completionRate;
    }

    // renderTasksList removed - now using UIManager toggleTaskPanel



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

        const newFarmer = {
          id: 'farmer_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
          name: this.activeTool.name,
          emoji: this.activeTool.emoji,
          subType: this.activeTool.subType || 1,
          x: tx,
          y: ty,
          speed: this.activeTool.speed,
          currentAction: "Idle 💤"
        };

        if (window.MultiplayerManager.isConnected) {
          window.MultiplayerManager.buyObject(cost, `hired ${newFarmer.name} (${newFarmer.emoji})`, () => {
            window.MultiplayerManager.broadcastFarmerBuy(newFarmer);
            this.clearBanner();
            this.activeTool = null;
            this.renderShopGrid("farmers");
          });
        } else {
          this.resources.gold -= cost;
          this.farmers.push(newFarmer);
          this.worker.postMessage({
            type: 'buy_farmer',
            farmer: newFarmer
          });
          this.updateHUD();
          this.clearBanner();
          this.activeTool = null;
          this.renderShopGrid("farmers");
        }
      } else {
        // Crop / Increaser / Sprinkler / Cosmetic placements - all take up 3x3 space
        if (!this.canPlaceObjectAt(tx, ty)) {
          this.addFloatingText(window.innerWidth / 2, window.innerHeight / 2, "Placement blocked! Need 3x3 clear land.", "#f87171");
          return;
        }

        // Encode Tile Attributes
        let tileVal = this.activeTool.type;
        const baseCharge = this.activeTool.charge || 100;
        tileVal |= (baseCharge << 8);

        if (this.activeTool.subType) {
          tileVal |= (this.activeTool.subType << 24);
        }

        if (window.MultiplayerManager.isConnected) {
          const typeBought = this.activeTool.type;
          window.MultiplayerManager.buyObject(cost, `placed ${this.activeTool.name} at (${tx}, ${ty})`, () => {
            window.MultiplayerManager.broadcastTileUpdate(tx, ty, tileVal);
            this.clearBanner();
            this.activeTool = null;
            if (typeBought === TILE_TYPES.ENERGY_TREE) {
              this.renderShopGrid("tech");
            }
          });
        } else {
          this.resources.gold -= cost;
          this.setTileTypeAt(tx, ty, tileVal);
          this.postTileUpdateToWorker(tx, ty, tileVal);
          this.updateHUD();
          const typeBought = this.activeTool.type;
          if (typeBought === TILE_TYPES.ENERGY_TREE) {
            this.renderShopGrid("tech");
          }
        }
      }
    }

    canPlaceObjectAt(tx, ty) {
      // Check that the center tile itself is solid plain terrain (Grass, Sand, Stone) and has no existing object
      const tileVal = this.getTileTypeAt(tx, ty);
      const tType = tileVal & 0xFF;
      return (tType === TILE_TYPES.GRASS || tType === TILE_TYPES.SAND || tType === TILE_TYPES.STONE);
    }

    paintTerrainCircle(cx, cy, type) {
      const size = this.terrainBrushSize || 1;
      const radius = size / 2;
      const radiusSq = radius * radius;
      const half = Math.floor(size / 2);
      const cost = this.activeTool.cost || 0;

      // First pass: Find all coordinates that will change
      const tilesToChange = [];
      for (let dy = -half; dy <= half; dy++) {
        for (let dx = -half; dx <= half; dx++) {
          if (dx * dx + dy * dy <= radiusSq) {
            const tx = cx + dx;
            const ty = cy + dy;
            const currentTileVal = this.getTileTypeAt(tx, ty);
            const currentType = currentTileVal & 0xFF;
            
            const isObject = (currentType === TILE_TYPES.PRODUCER ||
                              currentType === TILE_TYPES.INCREASER ||
                              currentType === TILE_TYPES.MAINTENANCE ||
                              currentType === TILE_TYPES.COSMETIC);
            if (!isObject && currentType !== type) {
              tilesToChange.push({ x: tx, y: ty });
            }
          }
        }
      }

      if (tilesToChange.length === 0) return;

      const totalCost = tilesToChange.length * cost;
      if (this.resources.gold < totalCost) {
        this.isPainting = false;
        this.addFloatingText(window.innerWidth / 2, window.innerHeight / 2, "Need Gold!", "#f87171");
        return;
      }

      if (window.MultiplayerManager.isConnected) {
        const typeNames = { 0: "Water", 1: "Grass", 2: "Sand", 3: "Stone" };
        const name = typeNames[type] || "terrain";
        window.MultiplayerManager.buyObject(totalCost, `painted ${tilesToChange.length} tiles with ${name}`, () => {
          tilesToChange.forEach(tile => {
            window.MultiplayerManager.broadcastTileUpdate(tile.x, tile.y, type);
          });
        });
      } else {
        this.resources.gold -= totalCost;
        tilesToChange.forEach(tile => {
          this.setTileTypeAt(tile.x, tile.y, type);
          this.postTileUpdateToWorker(tile.x, tile.y, type);
        });
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

    screenToWorldPreciseCoords(sx, sy) {
      const wrapper = document.getElementById('tycoon-viewport-wrapper');
      const rect = wrapper.getBoundingClientRect();
      
      const rx = sx - rect.left - rect.width / 2;
      const ry = sy - rect.top - rect.height / 2;
      
      const worldX = this.camera.x + rx / this.camera.zoom;
      const worldY = this.camera.y + ry / this.camera.zoom;
      
      return { x: worldX, y: worldY };
    }

    getFarmerScreenPos(farmer) {
      const tw = this.tileWidth;
      const visX = farmer.visualX !== undefined ? farmer.visualX : farmer.x;
      const visY = farmer.visualY !== undefined ? farmer.visualY : farmer.y;
      
      const fx = visX * tw + tw / 2;
      const fy = visY * tw + tw / 2;
      
      const w = this.canvas.width;
      const h = this.canvas.height;
      const zoom = this.camera.zoom;
      
      const canvasX = w / 2 + (fx - this.camera.x) * zoom;
      const canvasY = h / 2 + (fy - this.camera.y) * zoom;
      
      const rect = this.canvas.getBoundingClientRect();
      return {
        x: rect.left + canvasX,
        y: rect.top + canvasY
      };
    }

    findFarmerAt(clientX, clientY) {
      if (!Array.isArray(this.farmers)) return null;
      
      let closestFarmer = null;
      let minDistance = 40; // 40 screen pixels radius target
      
      this.farmers.forEach(f => {
        const screenPos = this.getFarmerScreenPos(f);
        const dist = Math.hypot(clientX - screenPos.x, clientY - screenPos.y);
        if (dist < minDistance) {
          minDistance = dist;
          closestFarmer = f;
        }
      });
      return closestFarmer;
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
          { type: TILE_TYPES.GRASS, name: "Grass land", emoji: "🟩", cost: 25 },
          { type: TILE_TYPES.SAND, name: "Sand land", emoji: "🟨", cost: 25 },
          { type: TILE_TYPES.STONE, name: "Stone land", emoji: "⬜", cost: 40 },
          { type: TILE_TYPES.WATER, name: "Water tile", emoji: "🟦", cost: 25 }
        ];
      } else if (tab === "producers") {
        items = CROP_TEMPLATES.map((c, idx) => ({
          type: TILE_TYPES.PRODUCER,
          subType: idx + 1,
          name: c.name,
          emoji: c.emoji,
          cost: c.cost,
          charge: 100 + idx * 10
        }));
      } else if (tab === "tech") {
        const energyTreeCount = this.getEnergyTreeCount();
        const energyTreeCost = Math.round(500 * Math.pow(1.5, energyTreeCount));
        items = [
          { type: TILE_TYPES.INCREASER, name: "Fertilizer (+20%)", emoji: "🧪", cost: 200 },
          { type: TILE_TYPES.MAINTENANCE, name: "Sprinkler", emoji: "🚿", cost: 300, charge: 200 },
          { type: TILE_TYPES.ENERGY_TREE, name: "Energy Tree (+10% Cap)", emoji: "⚡🌲", cost: energyTreeCost, description: "Increases the maximum world production cap by +10%." }
        ];
      } else if (tab === "farmers") {
        items = [
          { type: TILE_TYPES.FARMER, subType: 1, name: "Loyal Dog", emoji: "🐶", cost: 400, speed: 3, description: "Barks to wake up nearby animals. Boosts crop rate by +25%." },
          { type: TILE_TYPES.FARMER, subType: 2, name: "Lucky Cat", emoji: "🐱", cost: 600, speed: 2, description: "Purrs and randomly generates extra gold (+0.5g)." },
          { type: TILE_TYPES.FARMER, subType: 3, name: "Rain Frog", emoji: "🐸", cost: 750, speed: 1, description: "Splashes and recharges adjacent crop/sprinkler water levels." },
          { type: TILE_TYPES.FARMER, subType: 4, name: "Speedy Bunny", emoji: "🐰", cost: 900, speed: 5, description: "Hops around quickly. Boosts adjacent crops by +30%." },
          { type: TILE_TYPES.FARMER, subType: 5, name: "Clever Fox", emoji: "🦊", cost: 1000, speed: 4, description: "Sneaks around and gathers bonus AP near trees." },
          { type: TILE_TYPES.FARMER, subType: 6, name: "Trash Raccoon", emoji: "🦝", cost: 850, speed: 3, description: "Scavenges and slows down sprinkler water decay." },
          { type: TILE_TYPES.FARMER, subType: 7, name: "Truffle Pig", emoji: "🐷", cost: 1100, speed: 2, description: "Digs up truffles for massive bonus gold (+1.5g)." },
          { type: TILE_TYPES.FARMER, subType: 8, name: "Night Owl", emoji: "🦉", cost: 1200, speed: 2, description: "Awake only at night, granting a massive +50% crop boost." },
          { type: TILE_TYPES.FARMER, subType: 9, name: "Gentle Cow", emoji: "🐮", cost: 1300, speed: 1, description: "Grazes and generates passive +0.0005 food/second." },
          { type: TILE_TYPES.FARMER, subType: 10, name: "Royal Lion", emoji: "🦁", cost: 2000, speed: 3, description: "Roars to boost all nearby crops by +40%." }
        ];
      } else if (tab === "cosmetics") {
        items = [
          { type: TILE_TYPES.COSMETIC, name: "Flower Pot", emoji: "🌸", cost: 50 },
          { type: TILE_TYPES.COSMETIC, name: "Decorative Rock", emoji: "🪨", cost: 50 },
          { type: TILE_TYPES.COSMETIC, name: "Magic Mushroom", emoji: "🍄", cost: 75 }
        ];
      }

      items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'tycoon-shop-card';
        if (this.activeTool && this.activeTool.name === item.name && this.activeTool.subType === item.subType) {
          card.classList.add('selected');
        }
        
        let displayHtml = `<div class="tycoon-shop-item-emoji">${item.emoji}</div>`;
        if (item.type === TILE_TYPES.PRODUCER) {
          const row = Math.floor((item.subType - 1) / 3);
          const col = (item.subType - 1) % 3;
          displayHtml = `<div class="tycoon-shop-item-sprite" style="width: 36px; height: 36px; background-image: url('cropsstylesheet.png'); background-size: 108px 216px; background-position: -${col * 36}px -${row * 36}px; margin-bottom: 4px; display: inline-block;"></div>`;
        }
        
        card.innerHTML = `
          ${displayHtml}
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
      
      const subType = farmer.subType || 1;
      let desc = "A specialized animal worker that helps tend your farm.";
      let boostDesc = "Boosts nearby crops by +25% in a 3x3 area.";
      let actionBtnText = "💖 Pet";
      
      switch (subType) {
        case 1:
          desc = "A loyal companion who loves chasing balls and waking up friends.";
          boostDesc = "Boosts nearby crops by +25% in a 3x3 area. Can wake up sleeping farmers.";
          actionBtnText = "🥎 Play Fetch!";
          break;
        case 2:
          desc = "A feline of good fortune who purrs and uncovers hidden gold.";
          boostDesc = "Boosts nearby crops by +25% in a 3x3 area and periodically spawns +0.5g.";
          actionBtnText = "🐈 Pet Cat";
          break;
        case 3:
          desc = "A tiny amphibian that moisturizes soil with fresh morning dew.";
          boostDesc = "Boosts nearby crops by +25% and periodically waters adjacent crop tiles.";
          actionBtnText = "💧 Spray Water";
          break;
        case 4:
          desc = "A hyperactive rabbit that hops from patch to patch.";
          boostDesc = "Boosts nearby crops by +30% in a 3x3 area due to high agility.";
          actionBtnText = "🥕 Give Carrot";
          break;
        case 5:
          desc = "A cunning fox who finds secrets in the forest.";
          boostDesc = "Boosts nearby crops by +25% and occasionally gathers AP near trees.";
          actionBtnText = "🦊 Play Riddle";
          break;
        case 6:
          desc = "A masked creature that hoards shiny items and maintains tools.";
          boostDesc = "Boosts nearby crops by +25% and slows down nearby sprinkler/fertilizer decay.";
          actionBtnText = "✨ Give Shiny";
          break;
        case 7:
          desc = "A snorting explorer that smells truffles under rich grass.";
          boostDesc = "Boosts nearby crops by +25% and digs up +1.5g truffles.";
          actionBtnText = "🍎 Feed Apple";
          break;
        case 8:
          desc = "A wise bird of the night who works when others sleep.";
          boostDesc = "Active only at night, boosting crop production rate by +50%. Sleeps during day.";
          actionBtnText = "🦉 Hoot";
          break;
        case 9:
          desc = "A peaceful herbivore that produces premium quality milk.";
          boostDesc = "Boosts nearby crops by +25% and generates +0.0005 food/second.";
          actionBtnText = "🥛 Milk Cow";
          break;
        case 10:
          desc = "A majestic beast whose presence inspires maximum production.";
          boostDesc = "A massive +40% crop rate boost. Roars to wake up sleeping farmers.";
          actionBtnText = "🦁 Hear Roar";
          break;
      }
      
      body.innerHTML = `
        <div style="margin-bottom: 8px;"><strong>Status:</strong> ${farmer.currentAction || "Working 🧑‍🌾"}</div>
        <div style="margin-bottom: 8px;"><strong>Speed:</strong> ${farmer.speed} tiles/s</div>
        <div style="margin-bottom: 8px;"><strong>Description:</strong> ${desc}</div>
        <div style="margin-bottom: 8px; color: #4ade80;"><strong>Special Effect:</strong> ${boostDesc}</div>
        <div style="margin-top: 12px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 12px;">
          <div style="margin-bottom: 6px;"><strong>Custom Sprite:</strong></div>
          <div style="display: flex; align-items: center; gap: 12px;">
            <div id="farmer-sprite-preview" style="width: 36px; height: 36px; border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.3); overflow: hidden;">
              ${farmer.customSprite ? `<img src="${farmer.customSprite}" style="max-width: 100%; max-height: 100%; object-fit: contain;" />` : `<span style="font-size: 18px;">${farmer.emoji}</span>`}
            </div>
            <div style="display: flex; flex-direction: column; gap: 4px;">
              <button class="tycoon-btn" id="farmer-upload-sprite-btn" style="padding: 4px 8px; font-size: 10px; background: rgba(168, 85, 247, 0.2); border-color: rgba(168, 85, 247, 0.4);">Upload Image</button>
              ${farmer.customSprite ? `<button class="tycoon-btn exit-btn" id="farmer-reset-sprite-btn" style="padding: 4px 8px; font-size: 8px;">Reset Sprite</button>` : ''}
            </div>
            <input type="file" id="farmer-sprite-file-input" accept="image/*" style="display: none;" />
          </div>
        </div>
      `;
      
      footer.innerHTML = `
        <button class="tycoon-btn" id="farmer-action-btn" style="background: rgba(59, 130, 246, 0.2); border-color: rgba(59, 130, 246, 0.4); margin-right: auto;">${actionBtnText}</button>
        <button class="tycoon-btn exit-btn" id="farmer-close-btn">Close</button>
      `;

      // Sprite Customization Logic
      const fileInput = document.getElementById('farmer-sprite-file-input');
      const uploadBtn = document.getElementById('farmer-upload-sprite-btn');
      const resetBtn = document.getElementById('farmer-reset-sprite-btn');
      const previewDiv = document.getElementById('farmer-sprite-preview');

      uploadBtn.addEventListener('click', () => {
        fileInput.click();
      });

      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 200 * 1024) {
          alert("Please upload an image smaller than 200KB to ensure smooth synchronization.");
          return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
          const dataUrl = event.target.result;
          farmer.customSprite = dataUrl;

          const img = new Image();
          img.src = dataUrl;
          this.farmerImageCache[farmer.id] = img;

          previewDiv.innerHTML = `<img src="${dataUrl}" style="max-width: 100%; max-height: 100%; object-fit: contain;" />`;

          this.syncFarmersState();
          this.showFarmerDetails(farmer);
        };
        reader.readAsDataURL(file);
      });

      if (resetBtn) {
        resetBtn.addEventListener('click', () => {
          delete farmer.customSprite;
          if (this.farmerImageCache[farmer.id]) {
            delete this.farmerImageCache[farmer.id];
          }
          previewDiv.innerHTML = `<span style="font-size: 18px;">${farmer.emoji}</span>`;
          this.syncFarmersState();
          this.showFarmerDetails(farmer);
        });
      }

      // Wire Action Button
      document.getElementById('farmer-action-btn').addEventListener('click', () => {
        // Set interaction effect on canvas
        farmer.interactTime = Date.now();
        
        // Audio playback
        let soundKey = 'pet';
        switch (subType) {
          case 1: soundKey = 'dog_bark'; break;
          case 2: soundKey = 'cat_meow'; break;
          case 3: soundKey = 'frog_croak'; break;
          case 4: soundKey = 'bunny_squeak'; break;
          case 5: soundKey = 'fox_bark'; break;
          case 6: soundKey = 'raccoon_chirp'; break;
          case 7: soundKey = 'pig_grunt'; break;
          case 8: soundKey = 'owl_hoot'; break;
          case 9: soundKey = 'cow_moo'; break;
          case 10: soundKey = 'lion_roar'; break;
        }
        if (window.SoundManager) {
          window.SoundManager.play(soundKey);
        }

        // Apply visual and functional interaction benefits
        this.applyFarmerInteractionBenefit(farmer, subType);
        
        // Update details dialog body status text in real time
        const statusDiv = body.querySelector('div');
        if (statusDiv) {
          statusDiv.innerHTML = `<strong>Status:</strong> ${farmer.currentAction || "Working 🧑‍🌾"}`;
        }
      });

      document.getElementById('farmer-close-btn').addEventListener('click', () => {
        document.getElementById('tycoon-farmer-dialog').style.display = 'none';
      });

      document.getElementById('tycoon-farmer-dialog').style.display = 'flex';
    }

    applyFarmerInteractionBenefit(farmer, subType) {
      const tx = farmer.x;
      const ty = farmer.y;

      const isMP = window.MultiplayerManager.isConnected;

      switch (subType) {
        case 1: // Loyal Dog: wake up sleeping animals
          this.farmers.forEach(f => {
            if (f.isSleeping) {
              f.isSleeping = false;
              f.currentAction = "Working 🧑‍🌾";
            }
          });
          this.addFloatingText(window.innerWidth / 2, window.innerHeight / 2, "Everyone woke up! 🌅", "#34d399");
          if (isMP) {
            window.MultiplayerManager.broadcastFarmersState(this.farmers);
            window.MultiplayerManager.addLogEntry("woke up sleeping farmers with Loyal Dog.");
          } else {
            this.worker.postMessage({
              type: 'sync_state',
              farmers: this.farmers
            });
          }
          break;

        case 2: // Lucky Cat: finds +0.5g
          this.addFloatingText(window.innerWidth / 2, window.innerHeight / 2, "+0.5 Gold! 🪙", "#fbbf24");
          if (isMP) {
            window.MultiplayerManager.gainResources(0.5, 0, 0, "found 0.5 gold petting Lucky Cat.");
          } else {
            this.resources.gold += 0.5;
            this.updateHUD();
            this.worker.postMessage({
              type: 'sync_state',
              resources: this.resources
            });
          }
          break;

        case 3: // Rain Frog: waters adjacent crops
          let wateredCount = 0;
          for (let dy = -3; dy <= 3; dy++) {
            for (let dx = -3; dx <= 3; dx++) {
              const nx = tx + dx;
              const ny = ty + dy;
              const tileVal = this.getTileTypeAt(nx, ny);
              const type = tileVal & 0xFF;
              if (type === TILE_TYPES.PRODUCER) {
                let charge = (tileVal >> 8) & 0xFF;
                charge = Math.min(255, charge + 25);
                const sub = (tileVal >> 24) & 0xFF;
                let newVal = type | (charge << 8) | (sub << 24);
                if (isMP) {
                  window.MultiplayerManager.broadcastTileUpdate(nx, ny, newVal);
                } else {
                  this.setTileTypeAt(nx, ny, newVal);
                  this.postTileUpdateToWorker(nx, ny, newVal);
                }
                wateredCount++;
              }
            }
          }
          if (wateredCount > 0) {
            this.addFloatingText(window.innerWidth / 2, window.innerHeight / 2, `Watered ${wateredCount} crops! 💧`, "#38bdf8");
            if (isMP) {
              window.MultiplayerManager.addLogEntry(`watered crops using Rain Frog.`);
            }
          }
          break;

        case 4: // Speedy Bunny: double speed for 15s
          farmer.speed = 8;
          farmer.currentAction = "Super Speed! ⚡";
          this.addFloatingText(window.innerWidth / 2, window.innerHeight / 2, "Bunny Zoom! 🥕", "#fb7185");
          if (isMP) {
            window.MultiplayerManager.broadcastFarmersState(this.farmers);
          } else {
            this.worker.postMessage({
              type: 'sync_state',
              farmers: this.farmers
            });
          }
          setTimeout(() => {
            const currentBunny = this.farmers.find(f => f.id === farmer.id);
            if (currentBunny) {
              currentBunny.speed = 5;
              if (currentBunny.currentAction === "Super Speed! ⚡") {
                currentBunny.currentAction = "Working 🧑‍🌾";
              }
              if (isMP) {
                window.MultiplayerManager.broadcastFarmersState(this.farmers);
              } else {
                this.worker.postMessage({
                  type: 'sync_state',
                  farmers: this.farmers
                });
              }
            }
          }, 15000);
          break;

        case 5: // Clever Fox: generates +3 AP
          this.addFloatingText(window.innerWidth / 2, window.innerHeight / 2, "+3 AP! ⚡", "#38bdf8");
          if (isMP) {
            window.MultiplayerManager.gainResources(0, 3, 0, "gathered 3 AP from Clever Fox.");
          } else {
            this.resources.ap += 3;
            this.updateHUD();
            this.worker.postMessage({
              type: 'sync_state',
              resources: this.resources
            });
          }
          break;

        case 6: // Trash Raccoon: recharge adjacent sprinklers
          let sprinklerCount = 0;
          for (let dy = -3; dy <= 3; dy++) {
            for (let dx = -3; dx <= 3; dx++) {
              const nx = tx + dx;
              const ny = ty + dy;
              const tileVal = this.getTileTypeAt(nx, ny);
              const type = tileVal & 0xFF;
              if (type === TILE_TYPES.MAINTENANCE) {
                let charge = (tileVal >> 8) & 0xFF;
                charge = 255;
                const sub = (tileVal >> 24) & 0xFF;
                let newVal = type | (charge << 8) | (sub << 24);
                if (isMP) {
                  window.MultiplayerManager.broadcastTileUpdate(nx, ny, newVal);
                } else {
                  this.setTileTypeAt(nx, ny, newVal);
                  this.postTileUpdateToWorker(nx, ny, newVal);
                }
                sprinklerCount++;
              }
            }
          }
          if (sprinklerCount > 0) {
            this.addFloatingText(window.innerWidth / 2, window.innerHeight / 2, `Recharged ${sprinklerCount} Sprinklers! 🚿`, "#60a5fa");
            if (isMP) {
              window.MultiplayerManager.addLogEntry(`recharged sprinklers with Trash Raccoon.`);
            }
          }
          break;

        case 7: // Truffle Pig: digs +1.5g truffle
          this.addFloatingText(window.innerWidth / 2, window.innerHeight / 2, "Found Truffle! +1.5g 🍄", "#f59e0b");
          if (isMP) {
            window.MultiplayerManager.gainResources(1.5, 0, 0, "dug up +1.5g truffle with Truffle Pig.");
          } else {
            this.resources.gold += 1.5;
            this.updateHUD();
            this.worker.postMessage({
              type: 'sync_state',
              resources: this.resources
            });
          }
          break;

        case 8: // Night Owl: hoot and generate small gold
          this.addFloatingText(window.innerWidth / 2, window.innerHeight / 2, "+0.1 Gold! 🦉", "#fbbf24");
          if (isMP) {
            window.MultiplayerManager.gainResources(0.1, 0, 0, "petted Night Owl (+0.1 gold).");
          } else {
            this.resources.gold += 0.1;
            this.updateHUD();
            this.worker.postMessage({
              type: 'sync_state',
              resources: this.resources
            });
          }
          break;

        case 9: // Gentle Cow: milk cow for +0.01 food
          this.addFloatingText(window.innerWidth / 2, window.innerHeight / 2, "+0.01 Food! 🥛", "#a7f3d0");
          if (isMP) {
            window.MultiplayerManager.gainResources(0, 0, 0.01, "milked Gentle Cow (+0.01 food).");
          } else {
            this.resources.food += 0.01;
            this.updateHUD();
            this.worker.postMessage({
              type: 'sync_state',
              resources: this.resources
            });
          }
          break;

        case 10: // Royal Lion: wake up sleeping animals and roar
          this.farmers.forEach(f => {
            if (f.isSleeping) {
              f.isSleeping = false;
              f.currentAction = "Working 🧑‍🌾";
            }
          });
          this.addFloatingText(window.innerWidth / 2, window.innerHeight / 2, "LION ROAR! Boost active! 🦁", "#fb923c");
          if (isMP) {
            window.MultiplayerManager.broadcastFarmersState(this.farmers);
            window.MultiplayerManager.addLogEntry("lion roared! Woke up sleeping farmers.");
          } else {
            this.worker.postMessage({
              type: 'sync_state',
              farmers: this.farmers
            });
          }
          break;
      }
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

    getEnergyTreeCount() {
      let count = 0;
      for (const key in this.chunks) {
        const arr = this.chunks[key];
        for (let i = 0; i < 1024; i++) {
          if ((arr[i] & 0xFF) === TILE_TYPES.ENERGY_TREE) {
            count++;
          }
        }
      }
      return count;
    }

    updateHUD() {
      document.getElementById('tycoon-gold-val').textContent = this.resources.gold.toFixed(2);
      document.getElementById('tycoon-ap-val').textContent = this.resources.ap.toFixed(2);
      document.getElementById('tycoon-food-val').textContent = this.resources.food.toFixed(2);
      
      const isMP = window.MultiplayerManager && window.MultiplayerManager.isConnected;
      const compRate = isMP
        ? (window.MultiplayerManager.worldAverageCompletionRate || 1.0)
        : this.config.completionRatePrevDay;
      
      const energyTreeCount = this.getEnergyTreeCount();
      const cap = 1.0 + energyTreeCount * 0.10;
      
      // Collect multipliers
      const fertilizers = [];
      for (const key in this.chunks) {
        const arr = this.chunks[key];
        const coords = key.split(",");
        const cx = parseInt(coords[0]);
        const cy = parseInt(coords[1]);
        for (let i = 0; i < 1024; i++) {
          if ((arr[i] & 0xFF) === TILE_TYPES.INCREASER) {
            fertilizers.push({
              x: cx * 32 + (i % 32),
              y: cy * 32 + Math.floor(i / 32)
            });
          }
        }
      }

      // Calculate rate estimation
      let totalRate = 0;
      for (const key in this.chunks) {
        const arr = this.chunks[key];
        const coords = key.split(",");
        const cx = parseInt(coords[0]);
        const cy = parseInt(coords[1]);
        for (let i = 0; i < 1024; i++) {
          const tile = arr[i];
          const type = tile & 0xFF;
          if (type === TILE_TYPES.PRODUCER) {
            const charge = (tile >> 8) & 0xFF;
            if (charge > 0) {
              const subType = (tile >> 24) & 0xFF;
              const cropIdx = (subType >= 1 && subType <= 18) ? (subType - 1) : 0;
              const crop = CROP_TEMPLATES[cropIdx];
              const goldBase = crop ? crop.gold : 1;
              
              const gx = cx * 32 + (i % 32);
              const gy = cy * 32 + Math.floor(i / 32);
              
              // Fertilizer boost
              let localFertilizers = 0;
              fertilizers.forEach(f => {
                if (Math.max(Math.abs(gx - f.x), Math.abs(gy - f.y)) <= 3) {
                  localFertilizers++;
                }
              });
              let multiplier = 1.0 + (localFertilizers * 0.20);
              
              // Farmer boost
              let farmerAdd = 0;
              this.farmers.forEach(farmer => {
                if (!farmer.isSleeping && Math.max(Math.abs(gx - farmer.x), Math.abs(gy - farmer.y)) <= 2) {
                  const sub = farmer.subType || 1;
                  if (sub === 4) farmerAdd += 0.30;
                  else if (sub === 8) farmerAdd += 0.50;
                  else if (sub === 10) farmerAdd += 0.40;
                  else farmerAdd += 0.25;
                }
              });
              multiplier += farmerAdd;
              
              // Apply cap
              multiplier = Math.min(cap, multiplier);
              
              // Apply task rate
              multiplier *= Math.max(0.1, compRate);
              
              totalRate += goldBase * multiplier;
            }
          }
        }
      }
      // Farmers no longer consume food or rate
      const formattedRate = totalRate % 1 === 0 ? totalRate.toFixed(0) : totalRate.toFixed(1);
      document.getElementById('tycoon-rate-val').textContent = `${formattedRate}g/s`;

      // Read-only task completion indicator on HUD
      const liveRate = isMP
        ? (window.MultiplayerManager.worldAverageCompletionRate || 1.0)
        : this.calculateCurrentCompletionRate();
      const rateEl = document.getElementById('tycoon-rate-val');
      if (rateEl) {
        const pct = Math.round(liveRate * 100);
        const color = pct >= 80 ? '#4ade80' : pct >= 40 ? '#fbbf24' : '#f87171';
        if (isMP) {
          rateEl.title = `World average task completion: ${pct}% (affects production multiplier)`;
        } else {
          rateEl.title = `Task completion today: ${pct}% (affects production multiplier)`;
        }
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
      if (this.config.pinkMode) {
        document.body.classList.add('tycoon-pink-mode');
      } else {
        document.body.classList.remove('tycoon-pink-mode');
      }
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
      document.body.classList.remove('tycoon-pink-mode');
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
        if (window.UIManager) {
          const gameArea = document.getElementById('gameArea');
          if (gameArea) {
            gameArea.style.removeProperty('--stage-bg-image');
            void gameArea.offsetHeight; // Force DOM reflow
          }
          UIManager._stageBackdropKey = '';
          if (typeof UIManager.refreshGameUI === 'function') {
            UIManager.refreshGameUI();
          }
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
            // Preserve visual coordinates for smooth movement interpolation
            const oldFarmersMap = new Map();
            if (this.farmers) {
              this.farmers.forEach(f => {
                if (f.visualX !== undefined && f.visualY !== undefined) {
                  oldFarmersMap.set(f.id, { visualX: f.visualX, visualY: f.visualY });
                }
              });
            }

            // Merge spatial hash and other variables smoothly
            this.chunks = msg.chunks;
            this.farmers = msg.farmers;
            this.resources = msg.resources;

            if (this.farmers) {
              this.farmers.forEach(f => {
                const old = oldFarmersMap.get(f.id);
                if (old) {
                  f.visualX = old.visualX;
                  f.visualY = old.visualY;
                }
              });
            }

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
      const okBtn = overlay.querySelector('#offline-ok-btn');
      const handleClose = (e) => {
        e.preventDefault();
        overlay.remove();
      };
      okBtn.addEventListener('click', handleClose);
      okBtn.addEventListener('touchstart', handleClose, { passive: false });
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
      const okBtn = overlay.querySelector('#daily-ok-btn');
      const handleClose = (e) => {
        e.preventDefault();
        overlay.remove();
      };
      okBtn.addEventListener('click', handleClose);
      okBtn.addEventListener('touchstart', handleClose, { passive: false });
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

    getLightingState() {
      const now = new Date();
      const currentHour = now.getHours();
      const checkInHour = this.config.checkInHour || 10;
      
      const relHour = (currentHour - checkInHour + 24) % 24;
      
      if (relHour >= 22 || relHour < 2) {
        // Dawn
        let ratio = 0;
        if (relHour >= 22) {
          ratio = (relHour - 22 + now.getMinutes() / 60) / 4;
        } else {
          ratio = 0.5 + (relHour + now.getMinutes() / 60) / 4;
        }
        return {
          phase: 'dawn',
          ambientColor: `rgba(244, 63, 94, ${0.12 * Math.sin(ratio * Math.PI)})`,
          isDark: true,
          darknessIntensity: 0.15 * (1 - ratio)
        };
      } else if (relHour >= 2 && relHour < 10) {
        // Day
        return {
          phase: 'day',
          ambientColor: 'rgba(0, 0, 0, 0)',
          isDark: false,
          darknessIntensity: 0
        };
      } else if (relHour >= 10 && relHour < 14) {
        // Dusk
        const elapsed = (relHour - 10) + now.getMinutes() / 60;
        const ratio = elapsed / 4;
        return {
          phase: 'dusk',
          ambientColor: `rgba(139, 92, 246, ${0.22 * ratio})`,
          isDark: true,
          darknessIntensity: 0.22 * ratio
        };
      } else {
        // Night
        return {
          phase: 'night',
          ambientColor: 'rgba(15, 23, 76, 0.45)',
          isDark: true,
          darknessIntensity: 0.45
        };
      }
    }

    drawCanvas() {
      const ctx = this.ctx;
      ctx.globalAlpha = 1.0;
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



      // Step 3: Draw active NPC Farmers
      this.farmers.forEach(farmer => {
        if (farmer.visualX === undefined || farmer.visualY === undefined) {
          farmer.visualX = farmer.x;
          farmer.visualY = farmer.y;
        } else {
          const dx = farmer.x - farmer.visualX;
          const dy = farmer.y - farmer.visualY;
          if (Math.hypot(dx, dy) > 3) {
            farmer.visualX = farmer.x;
            farmer.visualY = farmer.y;
          } else {
            farmer.visualX += dx * 0.08;
            farmer.visualY += dy * 0.08;
          }
        }

        const fx = farmer.visualX * tw + tw / 2;
        const fy = farmer.visualY * tw + tw / 2;
        
        ctx.save();
        ctx.globalAlpha = 1.0;
        ctx.translate(fx, fy);

        // Click interaction bounce & spin effects
        let scale = 1.0;
        let rotation = 0;
        if (farmer.interactTime && Date.now() - farmer.interactTime < 800) {
          const t = (Date.now() - farmer.interactTime) / 800;
          scale += 0.4 * Math.sin(t * Math.PI);
          if (farmer.subType === 2) {
            rotation = t * Math.PI * 2;
          } else if (farmer.subType === 10) {
            rotation = 0.15 * Math.sin(t * Math.PI * 10);
          } else {
            rotation = 0.25 * Math.sin(t * Math.PI * 4);
          }
        }

        // Animal-specific constants and passive animations
        let yOffset = 0;
        if (!farmer.isSleeping) {
          const isMoving = Math.hypot(farmer.x - farmer.visualX, farmer.y - farmer.visualY) > 0.02;
          if (farmer.subType === 4) {
            yOffset = -Math.abs(Math.sin(Date.now() / 120)) * 8;
          } else if (farmer.subType === 3) {
            yOffset = -Math.abs(Math.sin(Date.now() / 250)) * 5;
          } else if (isMoving) {
            yOffset = -Math.abs(Math.sin(Date.now() / 150)) * 2;
            rotation += 0.08 * Math.sin(Date.now() / 100);
          }
        }

        ctx.scale(scale, scale);
        ctx.rotate(rotation);

        // Soft farmer shadow under emoji
        ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
        ctx.beginPath();
        ctx.ellipse(0, 8 - yOffset, 8, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        
        if (farmer.customSprite) {
          let img = this.farmerImageCache[farmer.id];
          if (!img || img.src !== farmer.customSprite) {
            img = new Image();
            img.src = farmer.customSprite;
            this.farmerImageCache[farmer.id] = img;
          }
          if (img.complete && img.naturalWidth !== 0) {
            ctx.drawImage(img, -12, -12 + yOffset, 24, 24);
          } else {
            ctx.fillStyle = "#ffffff";
            ctx.font = "18px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(farmer.emoji, 0, yOffset);
          }
        } else {
          ctx.fillStyle = "#ffffff";
          ctx.font = "18px Arial";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(farmer.emoji, 0, yOffset);
        }
        
        // Action indicators
        if (farmer.isSleeping) {
          ctx.font = "8px Arial";
          ctx.fillText("💤", 8, yOffset - 8);
        } else if (farmer.feedMultiplierTimer > 0) {
          ctx.font = "8px Arial";
          ctx.fillText("⚡", -8, yOffset - 8);
        }

        // Floating particle emoji
        if (farmer.interactTime && Date.now() - farmer.interactTime < 800) {
          const t = (Date.now() - farmer.interactTime) / 800;
          ctx.font = "8px Arial";
          ctx.globalAlpha = 1 - t;
          let interactEmoji = "❤️";
          if (farmer.subType === 1) interactEmoji = "🥎";
          else if (farmer.subType === 3) interactEmoji = "💧";
          else if (farmer.subType === 6) interactEmoji = "✨";
          else if (farmer.subType === 7) interactEmoji = "🍄";
          else if (farmer.subType === 9) interactEmoji = "🥛";
          ctx.fillText(interactEmoji, -10 + Math.sin(t * 10) * 5, yOffset - 15 - t * 20);
        }

        ctx.restore();
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
          const isLand = (this.getTileTypeAt(tx, ty) === TILE_TYPES.GRASS || 
                          this.getTileTypeAt(tx, ty) === TILE_TYPES.SAND || 
                          this.getTileTypeAt(tx, ty) === TILE_TYPES.STONE);
          ctx.fillStyle = isLand ? "rgba(34, 197, 94, 0.3)" : "rgba(239, 68, 68, 0.3)";
          ctx.strokeStyle = isLand ? "rgba(34, 197, 94, 0.6)" : "rgba(239, 68, 68, 0.6)";
          ctx.lineWidth = 2;
          
          let px, py;
          if (this.config.snapToGrid !== false) {
            px = tx * tw + tw / 2;
            py = ty * tw + tw / 2;
          } else {
            px = this.hoverWorldPos ? this.hoverWorldPos.x : (tx * tw + tw / 2);
            py = this.hoverWorldPos ? this.hoverWorldPos.y : (ty * tw + tw / 2);
          }
          
          ctx.fillRect(px - tw / 2, py - tw / 2, tw, tw);
          ctx.strokeRect(px - tw / 2, py - tw / 2, tw, tw);
        } else {
          const isValid = this.canPlaceObjectAt(tx, ty);
          ctx.fillStyle = isValid ? "rgba(34, 197, 94, 0.25)" : "rgba(239, 68, 68, 0.25)";
          ctx.strokeStyle = isValid ? "rgba(34, 197, 94, 0.6)" : "rgba(239, 68, 68, 0.6)";
          ctx.lineWidth = 2;
          
          let px, py;
          if (this.config.snapToGrid !== false) {
            px = tx * tw + tw / 2;
            py = ty * tw + tw / 2;
          } else {
            px = this.hoverWorldPos ? this.hoverWorldPos.x : (tx * tw + tw / 2);
            py = this.hoverWorldPos ? this.hoverWorldPos.y : (ty * tw + tw / 2);
          }
          
          ctx.fillRect(px - tw * 1.5, py - tw * 1.5, tw * 3, tw * 3);
          ctx.strokeRect(px - tw * 1.5, py - tw * 1.5, tw * 3, tw * 3);
          
          ctx.save();
          ctx.globalAlpha = 0.5;
          ctx.font = "42px Arial";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          let previewEmoji = this.activeTool.emoji;
          ctx.fillText(previewEmoji, px, py);
          ctx.restore();
        }
      }

      // Step 5: Render dragged object overlay during relocation
      if (this.isDraggingObject && this.draggedObject && this.hoverTile) {
        const tx = this.hoverTile.x;
        const ty = this.hoverTile.y;
        
        let px, py;
        if (this.config.snapToGrid !== false) {
          px = tx * tw + tw / 2;
          py = ty * tw + tw / 2;
        } else {
          px = this.hoverWorldPos ? this.hoverWorldPos.x : (tx * tw + tw / 2);
          py = this.hoverWorldPos ? this.hoverWorldPos.y : (ty * tw + tw / 2);
        }
        
        const type = this.draggedObject.tileVal & 0xFF;
        const subType = (this.draggedObject.tileVal >> 24) & 0xFF;
        
        const isValid = this.canPlaceObjectAt(tx, ty);
        ctx.fillStyle = isValid ? "rgba(34, 197, 94, 0.25)" : "rgba(239, 68, 68, 0.25)";
        ctx.strokeStyle = isValid ? "rgba(34, 197, 94, 0.6)" : "rgba(239, 68, 68, 0.6)";
        ctx.lineWidth = 2;
        ctx.fillRect(px - tw * 1.5, py - tw * 1.5, tw * 3, tw * 3);
        ctx.strokeRect(px - tw * 1.5, py - tw * 1.5, tw * 3, tw * 3);
        
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
        
        ctx.fillText(emoji, px, py);
        ctx.restore();
      }

      // Step 6: Update and render ambient glowing particles / fireflies
      if (!this.particles) this.particles = [];
      const lighting = this.getLightingState();
      
      if (lighting.isDark && this.particles.length < 50) {
        for (let ty = minTileY; ty <= maxTileY; ty++) {
          for (let tx = minTileX; tx <= maxTileX; tx++) {
            const tile = this.getTileTypeAt(tx, ty);
            const type = tile & 0xFF;
            if ((type === TILE_TYPES.PRODUCER || type === TILE_TYPES.MAINTENANCE || type === TILE_TYPES.INCREASER) && Math.random() < 0.006) {
              let pColor = "rgba(251, 191, 36, 0.8)";
              if (type === TILE_TYPES.MAINTENANCE) pColor = "rgba(56, 189, 248, 0.8)";
              if (type === TILE_TYPES.INCREASER) pColor = "rgba(168, 85, 247, 0.8)";
              
              this.particles.push({
                x: tx * tw + tw / 2 + (Math.random() * tw * 2 - tw),
                y: ty * tw + tw / 2 + (Math.random() * tw * 2 - tw),
                vx: (Math.random() - 0.5) * 0.3,
                vy: -Math.random() * 0.4 - 0.15,
                size: Math.random() * 1.8 + 0.8,
                life: 1.0,
                decay: Math.random() * 0.012 + 0.006,
                color: pColor
              });
            }
          }
        }
      }

      ctx.save();
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= p.decay;
        
        if (p.life <= 0) {
          this.particles.splice(i, 1);
          continue;
        }
        
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      
      ctx.restore();

      // Step 7: Draw screen-space ambient color filter
      if (lighting.ambientColor && lighting.ambientColor !== 'rgba(0, 0, 0, 0)') {
        ctx.fillStyle = lighting.ambientColor;
        ctx.fillRect(0, 0, w, h);
      }
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
        case TILE_TYPES.WATER: {
          ctx.fillStyle = "#0284c7"; // Azure water
          ctx.fillRect(x, y, tw, tw);
          
          const waveOffset = Math.sin(Date.now() / 600 + (tx * 13 + ty * 37)) * 2;
          ctx.strokeStyle = "rgba(224, 242, 254, 0.25)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x + 4, y + 8 + waveOffset);
          ctx.quadraticCurveTo(x + 16, y + 5 + waveOffset, x + 28, y + 8 + waveOffset);
          ctx.moveTo(x + 6, y + 22 - waveOffset);
          ctx.quadraticCurveTo(x + 18, y + 25 - waveOffset, x + 26, y + 22 - waveOffset);
          ctx.stroke();
          break;
        }
          
        case TILE_TYPES.GRASS: {
          ctx.fillStyle = "#1b8a4f"; // Lush forest emerald grass
          ctx.fillRect(x, y, tw, tw);
          
          const noise = Math.abs(Math.sin(tx * 12.9898 + ty * 78.233) * 43758.5453) % 1;
          if (noise > 0.45) {
            ctx.strokeStyle = "#2dc26d"; // Rich green blades
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x + 8, y + 22);
            ctx.quadraticCurveTo(x + 9, y + 15, x + 6, y + 10);
            ctx.moveTo(x + 20, y + 24);
            ctx.quadraticCurveTo(x + 19, y + 18, x + 16, y + 13);
            ctx.moveTo(x + 20, y + 24);
            ctx.quadraticCurveTo(x + 22, y + 17, x + 24, y + 12);
            ctx.stroke();
          }
          break;
        }
          
        case TILE_TYPES.SAND: {
          ctx.fillStyle = "#f5d061"; // Warm cream-gold sand
          ctx.fillRect(x, y, tw, tw);
          
          const sandOffset = Math.sin(tx * 9 + ty * 13) * 3;
          ctx.strokeStyle = "#d9a71a";
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(x + 2, y + 12 + sandOffset);
          ctx.lineTo(x + 30, y + 12 + sandOffset);
          ctx.stroke();
          break;
        }
          
        case TILE_TYPES.STONE: {
          ctx.fillStyle = "#64748b"; // Slate stone
          ctx.fillRect(x, y, tw, tw);
          
          const stoneNoise = (tx * 13 + ty * 29) % 4;
          ctx.strokeStyle = "#475569";
          ctx.lineWidth = 1;
          ctx.beginPath();
          if (stoneNoise === 0) {
            ctx.moveTo(x, y + 10);
            ctx.lineTo(x + 12, y + 16);
            ctx.lineTo(x + 20, y + 8);
          } else if (stoneNoise === 1) {
            ctx.moveTo(x + 16, y);
            ctx.lineTo(x + 10, y + 18);
            ctx.lineTo(x + 22, y + 32);
          }
          ctx.stroke();
          break;
        }
          
        case TILE_TYPES.PATH: {
          ctx.fillStyle = "#a16207"; // Clay-wood path
          ctx.fillRect(x, y, tw, tw);
          
          ctx.fillStyle = "#b45309";
          ctx.fillRect(x + 2, y + 2, 12, 12);
          ctx.fillRect(x + 16, y + 2, 14, 12);
          ctx.fillRect(x + 2, y + 16, 12, 14);
          ctx.fillRect(x + 16, y + 16, 14, 14);
          
          ctx.strokeStyle = "#78350f";
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 2, y + 2, 12, 12);
          ctx.strokeRect(x + 16, y + 2, 14, 12);
          ctx.strokeRect(x + 2, y + 16, 12, 14);
          ctx.strokeRect(x + 16, y + 16, 14, 14);
          break;
        }
      }

      const currentBase = this.getTerrainBaseType(type);
      
      const upBase = this.getTerrainBaseType(this.getTileTypeAt(tx, ty - 1) & 0xFF);
      const downBase = this.getTerrainBaseType(this.getTileTypeAt(tx, ty + 1) & 0xFF);
      const leftBase = this.getTerrainBaseType(this.getTileTypeAt(tx - 1, ty) & 0xFF);
      const rightBase = this.getTerrainBaseType(this.getTileTypeAt(tx + 1, ty) & 0xFF);
      
      // Soft shoreline/boundary blending (water foam or sandy shoreline) or purple terrain borders
      if (this.config.terrainBorders === true) {
        if (currentBase !== TILE_TYPES.WATER) {
          ctx.fillStyle = "#A168F9"; // Vibrant purple
          const borderThickness = 4;
          if (upBase === TILE_TYPES.WATER) {
            ctx.fillRect(x, y, tw, borderThickness);
          }
          if (downBase === TILE_TYPES.WATER) {
            ctx.fillRect(x, y + tw - borderThickness, tw, borderThickness);
          }
          if (leftBase === TILE_TYPES.WATER) {
            ctx.fillRect(x, y, borderThickness, tw);
          }
          if (rightBase === TILE_TYPES.WATER) {
            ctx.fillRect(x + tw - borderThickness, y, borderThickness, tw);
          }
        }
      } else {
        if (currentBase === TILE_TYPES.WATER) {
          ctx.fillStyle = "rgba(255, 255, 255, 0.2)"; // foam highlight
        } else {
          ctx.fillStyle = "rgba(245, 208, 97, 0.4)"; // sandy shoreline transition
        }
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
      }
      
      if (this.activeTool !== null && !this.config.hideGrid) {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, tw, tw);
      }
    }

    drawTileObject(ctx, tx, ty, type, charge, subType) {
      ctx.globalAlpha = 1.0;
      const tw = this.tileWidth;
      const x = tx * tw;
      const y = ty * tw;
      const noise = (tx * 17 + ty * 31) % 100;
      


      // Radial light glow at night
      const lighting = this.getLightingState();
      if (lighting.isDark) {
        let glowColor = "rgba(251, 191, 36, 0.15)";
        if (type === TILE_TYPES.MAINTENANCE) glowColor = "rgba(56, 189, 248, 0.15)";
        if (type === TILE_TYPES.INCREASER) glowColor = "rgba(168, 85, 247, 0.15)";
        
        const glowGrad = ctx.createRadialGradient(x + tw / 2, y + tw / 2, 2, x + tw / 2, y + tw / 2, tw * 2);
        glowGrad.addColorStop(0, glowColor);
        glowGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
        
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(x + tw / 2, y + tw / 2, tw * 2.2, 0, Math.PI * 2);
        ctx.fill();
      }

      switch (type) {
        case TILE_TYPES.PRODUCER: {
          let drawn = false;
          if (this.cropsImage && this.cropsImage.complete && this.cropsImage.naturalWidth !== 0) {
            const row = Math.floor((subType - 1) / 3);
            const col = (subType - 1) % 3;
            
            const cellW = 736 / 3;
            const cellH = 1308 / 6;
            
            ctx.save();
            ctx.globalAlpha = 0.6 + 0.4 * (charge / 255);
            ctx.drawImage(
              this.cropsImage,
              col * cellW, row * cellH, cellW, cellH,
              x - tw, y - tw, tw * 3, tw * 3
            );
            ctx.restore();
            drawn = true;
          }
          
          if (!drawn) {
            const crop = CROP_TEMPLATES[subType - 1] || CROP_TEMPLATES[0];
            ctx.save();
            ctx.fillStyle = "#ffffff";
            ctx.font = "42px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(crop.emoji, x + tw / 2, y + tw / 2);
            ctx.restore();
          }
          
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
          ctx.save();
          ctx.fillStyle = "#ffffff";
          ctx.font = "42px Arial";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("🧪", x + tw / 2, y + tw / 2);
          ctx.restore();

          // Thin purple dashed radius circle
          ctx.save();
          ctx.strokeStyle = "rgba(168, 85, 247, 0.4)";
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.arc(x + tw / 2, y + tw / 2, 112, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
          break;
        }
          
        case TILE_TYPES.MAINTENANCE: {
          ctx.save();
          ctx.fillStyle = "#ffffff";
          ctx.font = "42px Arial";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("🚿", x + tw / 2, y + tw / 2);
          ctx.restore();

          // Thin blue dashed radius circle
          ctx.save();
          ctx.strokeStyle = "rgba(56, 189, 248, 0.4)";
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.arc(x + tw / 2, y + tw / 2, 112, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
          
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
          let cosEmoji = "🌸";
          if (noise < 33) cosEmoji = "🪨";
          else if (noise < 66) cosEmoji = "🍄";
          
          ctx.save();
          ctx.fillStyle = "#ffffff";
          ctx.font = "42px Arial";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(cosEmoji, x + tw / 2, y + tw / 2);
          ctx.restore();
          break;
        }

        case TILE_TYPES.ENERGY_TREE: {
          ctx.save();
          ctx.fillStyle = "#ffffff";
          ctx.font = "42px Arial";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("⚡🌲", x + tw / 2, y + tw / 2);
          ctx.restore();
          break;
        }
      }
    }

    // Save state
    saveState() {
      // Always save local config settings regardless of multiplayer connection
      localStorage.setItem('nemesis_tycoon_config', JSON.stringify(this.config));

      if (window.MultiplayerManager && window.MultiplayerManager.isConnected) {
        // Save farmers and config locally even in multiplayer to avoid losing custom sprites
        const saved = localStorage.getItem('nemesis_tycoon_data');
        let data = {};
        if (saved) {
          try { data = JSON.parse(saved); } catch(e) {}
        }
        data.farmers = this.farmers;
        data.config = this.config;
        if (!data.resources) data.resources = this.resources;
        if (!data.chunks) {
          data.chunks = {};
          for (const k in this.chunks) {
            data.chunks[k] = Array.from(this.chunks[k]);
          }
        }
        localStorage.setItem('nemesis_tycoon_data', JSON.stringify(data));
        return;
      }
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
      // Load configurations first
      const savedConfig = localStorage.getItem('nemesis_tycoon_config');
      if (savedConfig) {
        try {
          this.config = JSON.parse(savedConfig);
        } catch (e) {
          console.warn("Failed to load tycoon config settings", e);
        }
      }

      const saved = localStorage.getItem('nemesis_tycoon_data');
      if (saved) {
        try {
          const data = JSON.parse(saved);
          this.resources = data.resources || { gold: 100, ap: 0, food: 0 };
          this.farmers = data.farmers || [];
          
          const defaultConfig = { checkInHour: 10, completionRatePrevDay: 1.0, lastSaveTime: Date.now() };
          this.config = Object.assign(defaultConfig, data.config || {}, this.config || {});
          
          if (this.config.snapToGrid === undefined) {
            this.config.snapToGrid = true;
          }
          if (this.config.hideGrid === undefined) {
            this.config.hideGrid = false;
          }
          if (this.config.pinkMode === undefined) {
            this.config.pinkMode = false;
          }
          if (this.config.terrainBorders === undefined) {
            this.config.terrainBorders = false;
          }
          
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
      this.config = {
        checkInHour: 10,
        completionRatePrevDay: 1.0,
        lastSaveTime: Date.now(),
        snapToGrid: true,
        hideGrid: false,
        pinkMode: false,
        terrainBorders: false
      };
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
        const crop = CROP_TEMPLATES[subType - 1] || CROP_TEMPLATES[0];
        name = crop.name;
        emoji = crop.emoji;
        cost = crop.cost;
        infoHtml = `
          <div><strong>Type:</strong> Crop Plant</div>
          <div><strong>Water Durability:</strong> ${Math.round(charge / 255 * 100)}%</div>
          <div><strong>Yields:</strong> 🪙 ${crop.gold} Gold & ⚡ ${crop.ap} AP per second (when watered)</div>
        `;
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
      } else if (type === TILE_TYPES.ENERGY_TREE) {
        name = "Energy Tree (+10% Cap)";
        emoji = "⚡🌲";
        const energyTreeCount = this.getEnergyTreeCount();
        const energyTreeCost = Math.round(500 * Math.pow(1.5, energyTreeCount));
        cost = energyTreeCost;
        infoHtml = `
          <div><strong>Type:</strong> Cap Booster</div>
          <div><strong>Effect:</strong> Increases maximum world production cap by +10%</div>
          <div><strong>Current World Cap:</strong> ${Math.round((1.0 + energyTreeCount * 0.1) * 100)}%</div>
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
        if (window.MultiplayerManager.isConnected) {
          window.MultiplayerManager.sellObject(refund, name, obj.x, obj.y);
        } else {
          this.resources.gold += refund;
          this.setTileTypeAt(obj.x, obj.y, TILE_TYPES.GRASS);
          this.postTileUpdateToWorker(obj.x, obj.y, TILE_TYPES.GRASS);
          this.updateHUD();
        }
        this.addNotification(`🪙 Sold ${name} for ${refund} gold!`);
        document.getElementById('tycoon-object-dialog').style.display = 'none';
        
        if (type === TILE_TYPES.ENERGY_TREE) {
          this.renderShopGrid("tech");
        }
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

