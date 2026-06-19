// tycoon_worker_code.js - Holds the raw worker code as a string to allow Blob worker creation

const TycoonWorkerCode = `
// Tycoon Mode Web Worker Simulation
let chunks = {}; // key: "cx,cy" -> Int32Array(1024)
let farmers = [];
let resources = {
  gold: 100,
  ap: 0,
  food: 0,
  accumulatedGoldToday: 0,
  accumulatedApToday: 0
};
let config = {
  checkInHour: 10,
  completionRatePrevDay: 1.0,
  lastSaveTime: Date.now()
};
let isRunning = false;
let simulationInterval = null;

// Tile Consts matching main thread
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

// Chebyshev distance utility
function getChebyshevDistance(x1, y1, x2, y2) {
  return Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2));
}

// Get/Set tile from spatial hash map of 32x32 chunks
function getTile(x, y) {
  const cx = Math.floor(x / 32);
  const cy = Math.floor(y / 32);
  const key = cx + "," + cy;
  if (!chunks[key]) return 0;
  
  const tx = ((x % 32) + 32) % 32;
  const ty = ((y % 32) + 32) % 32;
  const idx = ty * 32 + tx;
  return chunks[key][idx];
}

function setTile(x, y, value) {
  const cx = Math.floor(x / 32);
  const cy = Math.floor(y / 32);
  const key = cx + "," + cy;
  if (!chunks[key]) {
    chunks[key] = new Int32Array(1024);
  }
  const tx = ((x % 32) + 32) % 32;
  const ty = ((y % 32) + 32) % 32;
  const idx = ty * 32 + tx;
  chunks[key][idx] = value;
}

// Checks if current hour is night (fixed 8-hour window ending at checkInHour)
function isNightTime(timestamp) {
  const date = new Date(timestamp);
  const currentHour = date.getHours();
  const endHour = config.checkInHour;
  const startHour = (endHour - 8 + 24) % 24;
  
  if (startHour < endHour) {
    return currentHour >= startHour && currentHour < endHour;
  } else {
    // Crosses midnight (e.g. 23:00 to 07:00)
    return currentHour >= startHour || currentHour < endHour;
  }
}

// Runs a single 1Hz (per-second) simulation tick
function tickSimulation(timestamp) {
  const isNight = isNightTime(timestamp);
  
  // 1. Gather all maintenance and increaser buildings to apply radius effects
  const sprinklers = [];
  const fertilizers = [];
  
  // Scan all chunks for radius effect sources
  for (const key in chunks) {
    const coords = key.split(",");
    const cx = parseInt(coords[0]);
    const cy = parseInt(coords[1]);
    const arr = chunks[key];
    
    for (let idx = 0; idx < 1024; idx++) {
      const tile = arr[idx];
      const type = tile & 0xFF;
      if (type === TILE_TYPES.MAINTENANCE) {
        // Find grid x, y
        const ty = Math.floor(idx / 32);
        const tx = idx % 32;
        const gx = cx * 32 + tx;
        const gy = cy * 32 + ty;
        const charge = (tile >> 8) & 0xFF;
        if (charge > 0) {
          sprinklers.push({ x: gx, y: gy, charge });
        }
      } else if (type === TILE_TYPES.INCREASER) {
        const ty = Math.floor(idx / 32);
        const tx = idx % 32;
        const gx = cx * 32 + tx;
        const gy = cy * 32 + ty;
        fertilizers.push({ x: gx, y: gy });
      }
    }
  }

  // 2. Process producers (trees/crops) decay & production
  let goldProducedThisSecond = 0;
  let apProducedThisSecond = 0;
  let foodProducedThisSecond = 0;

  for (const key in chunks) {
    const coords = key.split(",");
    const cx = parseInt(coords[0]);
    const cy = parseInt(coords[1]);
    const arr = chunks[key];
    
    for (let idx = 0; idx < 1024; idx++) {
      let tile = arr[idx];
      const type = tile & 0xFF;
      
      if (type === TILE_TYPES.PRODUCER) {
        let charge = (tile >> 8) & 0xFF;
        const subType = (tile >> 24) & 0xFF;
        
        // Find absolute coordinates
        const ty = Math.floor(idx / 32);
        const tx = idx % 32;
        const gx = cx * 32 + tx;
        const gy = cy * 32 + ty;
        
        // Check if serviced by any active sprinkler (Maintenance) in Chebyshev 3x3 radius
        let isSprinklered = false;
        for (const s of sprinklers) {
          if (getChebyshevDistance(gx, gy, s.x, s.y) <= 1) { // 3x3 radius
            isSprinklered = true;
            break;
          }
        }
        
        // If not sprinklered, decay charge by 1 per tick
        if (!isSprinklered && charge > 0) {
          charge = Math.max(0, charge - 1);
        }
        
        // Check if charge > 0 to produce resources
        if (charge > 0) {
          // Base stats
          let goldBase = 1;
          let apBase = 0;
          let foodChance = 0;
          
          if (subType === PRODUCER_SUBS.TREE) {
            goldBase = 2;
            apBase = 1;
          } else if (subType === PRODUCER_SUBS.TOMATO) {
            goldBase = 1;
            apBase = 3;
            foodChance = 0.05; // 5% chance per second
          } else if (subType === PRODUCER_SUBS.APPLE) {
            goldBase = 3;
            apBase = 5;
            foodChance = 0.10; // 10% chance per second
          }
          
          // Apply Increasers (Fertilizers) multiplier: +20% production rate per Increaser in 3x3 range
          let increaserCount = 0;
          for (const f of fertilizers) {
            if (getChebyshevDistance(gx, gy, f.x, f.y) <= 1) {
              increaserCount++;
            }
          }
          let multiplier = 1.0 + (increaserCount * 0.20);
          
          // Apply completion rate of previous day: completionRatePrevDay acts as direct multiplier (e.g. 0% to 150%)
          multiplier *= config.completionRatePrevDay;
          
          // Calculate gains
          goldProducedThisSecond += Math.round(goldBase * multiplier);
          apProducedThisSecond += Math.round(apBase * multiplier);
          
          if (foodChance > 0 && Math.random() < foodChance) {
            foodProducedThisSecond += 1;
          }
        }
        
        // Write updated charge back to tile
        tile = (tile & 0xFF00FFFF) | (charge << 8);
        arr[idx] = tile;
      } else if (type === TILE_TYPES.MAINTENANCE) {
        // Maintenance decay: sprinklers decay automatically (e.g. 1 point per tick)
        let charge = (tile >> 8) & 0xFF;
        if (charge > 0) {
          charge = Math.max(0, charge - 1);
          tile = (tile & 0xFF00FFFF) | (charge << 8);
          arr[idx] = tile;
        }
      }
    }
  }

  // 3. Simulate NPC Farmers
  let farmerConsumptionTotal = 0;
  
  farmers.forEach(farmer => {
    // Shift state: Sleep during Night hours
    farmer.isSleeping = isNight;
    
    if (farmer.isSleeping) {
      farmer.currentAction = "Sleeping 💤";
      return;
    }
    
    // Awake: Roam and consume produce
    // Feeding boost decay (if any)
    if (farmer.feedMultiplierTimer > 0) {
      farmer.feedMultiplierTimer--;
      if (farmer.feedMultiplierTimer === 0) {
        farmer.currentMultiplier = 1.0;
      }
    }
    
    // Farmer consumes food
    // Consumes a fraction of gold per tick as part of the produce
    const consumeAmount = farmer.consumeRate || 1;
    farmerConsumptionTotal += consumeAmount;
    
    // Roam along path
    if (farmer.path && farmer.path.length > 1) {
      // Advance step counter based on speed
      farmer.moveTickAccumulator = (farmer.moveTickAccumulator || 0) + (farmer.speed || 1);
      
      // Move 1 block if accumulator exceeds threshold
      if (farmer.moveTickAccumulator >= 10) {
        farmer.moveTickAccumulator -= 10;
        
        // Move along path: ping-pong or cycle
        if (farmer.isPathReversing) {
          farmer.pathIndex--;
          if (farmer.pathIndex <= 0) {
            farmer.pathIndex = 0;
            farmer.isPathReversing = false;
          }
        } else {
          farmer.pathIndex++;
          if (farmer.pathIndex >= farmer.path.length) {
            // Check path length limit
            const maxPathLength = farmer.maxPathLength || 10;
            const targetLength = Math.min(farmer.path.length, maxPathLength);
            
            if (farmer.pathIndex >= targetLength) {
              farmer.pathIndex = Math.max(0, targetLength - 1);
              farmer.isPathReversing = true;
            }
          }
        }
        
        // Set coordinates to current path step
        const step = farmer.path[farmer.pathIndex];
        if (step) {
          farmer.x = step.x;
          farmer.y = step.y;
        }
      }
      farmer.currentAction = "Working 🧑‍🌾";
    } else {
      farmer.currentAction = "Idle 💤";
    }
  });

  // Calculate final resource changes (ensure 1 gold minimum a second)
  let netGold = goldProducedThisSecond - farmerConsumptionTotal;
  if (netGold < 1) netGold = 1; // 1 Gold min per second
  
  resources.gold += netGold;
  resources.ap += apProducedThisSecond;
  resources.food += foodProducedThisSecond;
  
  resources.accumulatedGoldToday += netGold;
  resources.accumulatedApToday += apProducedThisSecond;
}

// Simulates offline progress in a fast-forward loop on loading
function simulateOfflineProgress(now) {
  const elapsedSeconds = Math.floor((now - config.lastSaveTime) / 1000);
  if (elapsedSeconds <= 0) return;
  
  // Cap ticks to prevent worker freeze (e.g. max 12 hours = 43,200 ticks)
  const maxTicks = Math.min(elapsedSeconds, 43200);
  
  // Track start values to compute delta
  const initialGold = resources.gold;
  const initialAp = resources.ap;
  const initialFood = resources.food;
  
  let simulatedTime = config.lastSaveTime;
  for (let i = 0; i < maxTicks; i++) {
    simulatedTime += 1000;
    tickSimulation(simulatedTime);
  }
  
  const goldEarned = resources.gold - initialGold;
  const apEarned = resources.ap - initialAp;
  const foodEarned = resources.food - initialFood;
  
  // Send offline progress summary to main thread
  self.postMessage({
    type: "offline_summary",
    elapsedSeconds,
    ticksRun: maxTicks,
    goldEarned,
    apEarned,
    foodEarned
  });
}

// Maintenance charging from main check-in event
function handleDailyCheckin(completionRate) {
  // Update previous day's completion rate
  config.completionRatePrevDay = completionRate;
  
  // Sprinklers / Maintenance buildings recharge based on 1/2 of completion rate of previous day
  // Max charge is 255
  const rechargeValue = Math.min(255, Math.round(128 * completionRate));
  
  for (const key in chunks) {
    const arr = chunks[key];
    for (let idx = 0; idx < 1024; idx++) {
      let tile = arr[idx];
      const type = tile & 0xFF;
      if (type === TILE_TYPES.MAINTENANCE) {
        let charge = (tile >> 8) & 0xFF;
        charge = Math.min(255, charge + rechargeValue);
        tile = (tile & 0xFF00FFFF) | (charge << 8);
        arr[idx] = tile;
      }
    }
  }
  
  // Report back daily summary
  const summary = {
    gold: resources.accumulatedGoldToday,
    ap: resources.accumulatedApToday,
    completionRate: completionRate
  };
  
  // Reset daily accumulators
  resources.accumulatedGoldToday = 0;
  resources.accumulatedApToday = 0;
  
  self.postMessage({
    type: "daily_summary",
    summary
  });
}

// Receive messages from main thread
self.onmessage = function(e) {
  const msg = e.data;
  switch (msg.type) {
    case "init":
      chunks = msg.chunks || {};
      farmers = msg.farmers || [];
      resources = msg.resources || {
        gold: 100,
        ap: 0,
        food: 0,
        accumulatedGoldToday: 0,
        accumulatedApToday: 0
      };
      config = msg.config || {
        checkInHour: 10,
        completionRatePrevDay: 1.0,
        lastSaveTime: Date.now()
      };
      
      // Perform offline calculations
      simulateOfflineProgress(Date.now());
      
      // Start worker loop
      if (simulationInterval) clearInterval(simulationInterval);
      simulationInterval = setInterval(() => {
        if (isRunning) {
          tickSimulation(Date.now());
          // Sync state back at 1Hz
          self.postMessage({
            type: "state_update",
            chunks,
            farmers,
            resources
          });
        }
      }, 1000);
      isRunning = true;
      break;
      
    case "pause":
      isRunning = false;
      break;
      
    case "resume":
      isRunning = true;
      break;
      
    case "update_tile":
      setTile(msg.x, msg.y, msg.value);
      break;
      
    case "buy_farmer":
      farmers.push(msg.farmer);
      break;
      
    case "feed_farmer":
      const f = farmers.find(farm => farm.id === msg.farmerId);
      if (f && resources.food > 0) {
        resources.food--;
        f.feedMultiplierTimer = 3600; // 1 hour boost (3600 seconds)
        f.currentMultiplier = 1.5; // +50% productivity
        self.postMessage({ type: "notification", text: f.emoji + " Farmer fed!" });
      }
      break;
      
    case "upgrade_farmer_path":
      const farm = farmers.find(farm => farm.id === msg.farmerId);
      if (farm) {
        farm.maxPathLength = (farm.maxPathLength || 10) + 5;
      }
      break;
      
    case "update_farmer_path":
      const fa = farmers.find(farm => farm.id === msg.farmerId);
      if (fa) {
        fa.path = msg.path;
        fa.pathIndex = 0;
        fa.isPathReversing = false;
      }
      break;
      
    case "checkin":
      handleDailyCheckin(msg.completionRate || 0);
      break;
      
    case "sync_request":
      self.postMessage({
        type: "state_update",
        chunks,
        farmers,
        resources
      });
      break;
  }
};
`;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TycoonWorkerCode };
} else {
  window.TycoonWorkerCode = TycoonWorkerCode;
}
