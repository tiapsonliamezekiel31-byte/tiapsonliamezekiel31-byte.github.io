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
let lastTickTime = null;

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
  APPLE: 3,
  CORN: 4,
  CARROT: 5,
  MUSHROOM: 6
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

function crossedCheckinTime(prevTime, currTime) {
  const prevDate = new Date(prevTime);
  const currDate = new Date(currTime);
  
  // Create a Date object for the check-in time on the prevTime day
  const checkinPrev = new Date(prevTime);
  checkinPrev.setHours(config.checkInHour, 0, 0, 0);
  
  // Create a Date object for the check-in time on the currTime day
  const checkinCurr = new Date(currTime);
  checkinCurr.setHours(config.checkInHour, 0, 0, 0);

  // If the time spans across the check-in time of the starting day
  if (prevTime < checkinPrev.getTime() && currTime >= checkinPrev.getTime()) {
    return true;
  }
  
  // If the currTime has passed the check-in time of the current day,
  // and the prevTime was before the check-in of the current day
  if (currTime >= checkinCurr.getTime() && prevTime < checkinCurr.getTime()) {
    return true;
  }
  
  // Also check if they are on different days and more than 24 hours have elapsed
  if (currTime - prevTime >= 24 * 3600 * 1000) {
    return true;
  }
  
  return false;
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
  if (lastTickTime !== null) {
    if (crossedCheckinTime(lastTickTime, timestamp)) {
      const compRate = config.completionRateCurrentDay !== undefined ? config.completionRateCurrentDay : 0.0;
      handleDailyCheckin(compRate);
      config.completionRateCurrentDay = 0.0; // reset for subsequent days
    }
  }
  lastTickTime = timestamp;

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
          sprinklers.push({ x: gx, y: gy, charge: charge });
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
        
        // Check if serviced by any active sprinkler (Maintenance) in Chebyshev 3x3 footprint adjacent range
        let isSprinklered = false;
        for (const s of sprinklers) {
          if (getChebyshevDistance(gx, gy, s.x, s.y) <= 3 && s.charge > 0) {
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
          
          const cropIdx = (subType >= 1 && subType <= 18) ? (subType - 1) : 0;
          const goldLookup = [2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 12];
          const apLookup = [1, 2, 1, 3, 2, 4, 3, 5, 4, 6, 5, 7, 6, 8, 7, 9, 8, 10];
          const foodLookup = [0.05, 0.06, 0.07, 0.08, 0.09, 0.10, 0.11, 0.12, 0.13, 0.14, 0.15, 0.16, 0.17, 0.18, 0.19, 0.20, 0.21, 0.22];
          
          goldBase = goldLookup[cropIdx];
          apBase = apLookup[cropIdx];
          foodChance = foodLookup[cropIdx];
          
          // Apply Increasers (Fertilizers) multiplier: +20% production rate per Increaser in adjacent range
          let increaserCount = 0;
          for (const f of fertilizers) {
            if (getChebyshevDistance(gx, gy, f.x, f.y) <= 3) {
              increaserCount++;
            }
          }
          let multiplier = 1.0 + (increaserCount * 0.20);
 
          // Apply Farmer boosts according to animal subType
          let farmerMultiplierAdd = 0;
          farmers.forEach(farmer => {
            if (!farmer.isSleeping && getChebyshevDistance(gx, gy, farmer.x, farmer.y) <= 2) {
              const sub = farmer.subType || 1;
              if (sub === 4) { // Speedy Bunny
                farmerMultiplierAdd += 0.30;
              } else if (sub === 8) { // Night Owl
                farmerMultiplierAdd += 0.50;
              } else if (sub === 10) { // Royal Lion
                farmerMultiplierAdd += 0.40;
              } else {
                farmerMultiplierAdd += 0.25;
              }
            }
          });
          multiplier += farmerMultiplierAdd;
          
          // Apply live task completion rate: current-day rate drives production in real time.
          // Falls back to previous day's rate if current day hasn't been tracked yet.
          const liveRate = (config.completionRateCurrentDay !== undefined && config.completionRateCurrentDay >= 0)
            ? config.completionRateCurrentDay
            : config.completionRatePrevDay;
          multiplier *= Math.max(0.1, liveRate); // Floor at 10% so farm never goes dead
          
          // Calculate gains (using exact floats instead of Math.round)
          goldProducedThisSecond += goldBase * multiplier;
          apProducedThisSecond += apBase * multiplier;
          foodProducedThisSecond += foodChance * multiplier;
        }
        
        // Write updated charge back to tile using original idx
        tile = (tile & 0xFF00FFFF) | (charge << 8);
        arr[idx] = tile;
      } else if (type === TILE_TYPES.MAINTENANCE) {
        // Sprinklers decay via daily check-in to preserve offline calculation accuracy
      }
    }
  }

  // 3. Simulate NPC Farmers (random roaming and special animal actions)
  let farmerConsumptionTotal = 0;
  
  farmers.forEach(farmer => {
    const sub = farmer.subType || 1;
    
    // Shift state: Night Owl sleeps during day; other animals sleep during night
    if (sub === 8) { // Night Owl
      farmer.isSleeping = !isNight;
    } else {
      farmer.isSleeping = isNight;
    }
    
    if (farmer.isSleeping) {
      farmer.currentAction = "Sleeping 💤";
      return;
    }
    
    // Movement simulation
    farmer.moveTickAccumulator = (farmer.moveTickAccumulator || 0) + (farmer.speed || 1);
    if (farmer.moveTickAccumulator >= 3) {
      farmer.moveTickAccumulator -= 3;
      
      const moves = [];
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = farmer.x + dx;
          const ny = farmer.y + dy;
          const tileVal = getTile(nx, ny);
          const tType = tileVal & 0xFF;
          if (tType !== TILE_TYPES.WATER) {
            moves.push({ x: nx, y: ny });
          }
        }
      }
      if (moves.length > 0) {
        const nextMove = moves[Math.floor(Math.random() * moves.length)];
        farmer.x = nextMove.x;
        farmer.y = nextMove.y;
      }
    }
    
    // Custom Actions / Working status
    farmer.currentAction = "Working 🧑‍🌾";
    
    // Periodic random triggers (1Hz tick rate)
    if (sub === 2 && Math.random() < 0.02) { // Lucky Cat: finds +50g
      resources.gold += 50;
      resources.accumulatedGoldToday += 50;
      self.postMessage({ type: "notification", text: "🐈 Lucky Cat purred and found +50 gold!" });
    }
    
    if (sub === 3 && Math.random() < 0.03) { // Rain Frog: waters adjacent crops
      let wateredAny = false;
      for (let dy = -3; dy <= 3; dy++) {
        for (let dx = -3; dx <= 3; dx++) {
          const nx = farmer.x + dx;
          const ny = farmer.y + dy;
          const tileVal = getTile(nx, ny);
          const type = tileVal & 0xFF;
          if (type === TILE_TYPES.PRODUCER) {
            let charge = (tileVal >> 8) & 0xFF;
            charge = Math.min(255, charge + 10);
            const subType = (tileVal >> 24) & 0xFF;
            setTile(nx, ny, type | (charge << 8) | (subType << 24));
            wateredAny = true;
          }
        }
      }
      if (wateredAny) {
        self.postMessage({ type: "notification", text: "🐸 Rain Frog splashed and watered crops!" });
      }
    }
    
    if (sub === 5 && Math.random() < 0.02) { // Clever Fox: gathers AP near trees
      let nearTree = false;
      for (let dy = -3; dy <= 3; dy++) {
        for (let dx = -3; dx <= 3; dx++) {
          const nx = farmer.x + dx;
          const ny = farmer.y + dy;
          const tileVal = getTile(nx, ny);
          if ((tileVal & 0xFF) === TILE_TYPES.PRODUCER && ((tileVal >> 24) & 0xFF) === 1) { // Tree
            nearTree = true;
            break;
          }
        }
      }
      if (nearTree) {
        resources.ap += 1;
        resources.accumulatedApToday += 1;
        self.postMessage({ type: "notification", text: "🦊 Clever Fox gathered +1 AP near trees!" });
      }
    }
    
    if (sub === 6 && Math.random() < 0.02) { // Trash Raccoon: recharges adjacent sprinklers
      let rechargedAny = false;
      for (let dy = -3; dy <= 3; dy++) {
        for (let dx = -3; dx <= 3; dx++) {
          const nx = farmer.x + dx;
          const ny = farmer.y + dy;
          const tileVal = getTile(nx, ny);
          if ((tileVal & 0xFF) === TILE_TYPES.MAINTENANCE) { // Sprinkler
            let charge = (tileVal >> 8) & 0xFF;
            charge = Math.min(255, charge + 20);
            setTile(nx, ny, (tileVal & 0xFF00FFFF) | (charge << 8));
            rechargedAny = true;
          }
        }
      }
      if (rechargedAny) {
        self.postMessage({ type: "notification", text: "🦝 Trash Raccoon polished and recharged adjacent sprinklers!" });
      }
    }
    
    if (sub === 7 && Math.random() < 0.01) { // Truffle Pig: digs +150g truffle on grass
      const currentTile = getTile(farmer.x, farmer.y);
      if ((currentTile & 0xFF) === TILE_TYPES.GRASS) {
        resources.gold += 150;
        resources.accumulatedGoldToday += 150;
        self.postMessage({ type: "notification", text: "🐷 Truffle Pig dug up a truffle! (+150g)" });
      }
    }
    
    if (sub === 9) { // Gentle Cow: passive food generation (+0.05/sec)
      resources.food += 0.05;
    }
  });

  // Calculate final resource changes (using exact floats with no minimum limit)
  let netGold = goldProducedThisSecond - farmerConsumptionTotal;
  if (netGold < 0) netGold = 0;
  
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
  
  lastTickTime = config.lastSaveTime;
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
        charge = Math.max(0, charge - 100);
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
    type: "tycoon_daily_summary",
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
      // Seed live rate from prev day if not already tracked
      if (config.completionRateCurrentDay === undefined) {
        config.completionRateCurrentDay = config.completionRatePrevDay;
      }
      
      // Perform offline calculations
      simulateOfflineProgress(Date.now());
      lastTickTime = Date.now();
      
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
      
    // Removed feed_farmer, upgrade_farmer_path, and update_farmer_path handlers
      
    case "checkin":
      handleDailyCheckin(msg.completionRate || 0);
      break;
      
    case "update_completion_rate":
      config.completionRateCurrentDay = msg.completionRate;
      break;
      
    case "update_config":
      config = msg.config || config;
      break;
      
    case "sync_state":
      if (msg.chunks) {
        // Rehydrate chunks
        for (const k in msg.chunks) {
          chunks[k] = new Int32Array(msg.chunks[k]);
        }
      }
      if (msg.farmers) farmers = msg.farmers;
      if (msg.resources) resources = msg.resources;
      if (msg.config) config = msg.config;
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
