/**
 * Consolidated ShopManager
 * - Exposes: init, getCatalog, purchase, save
 * - Also includes convenience shop helpers used elsewhere
 */

const ShopManager = (function() {
  const SHOP_KEY = 'nemesis_shop_data';

  const defaultCatalog = [
    { id: 'consumable_health_potion', name: 'Health Potion', desc: 'Heals 30 HP instantly', price: 1, type: 'consumable' },
    { id: 'consumable_mana_potion', name: 'Mana Potion', desc: 'Restores 50 Mana instantly', price: 1, type: 'consumable' },
    { id: 's_heal_potion', name: 'Heal Potion', desc: 'Heals 20 HP on use', price: 25, type: 'consumable' },
    { id: 's_ap_potion', name: 'AP Tonic', desc: 'Grants +30 AP instantly', price: 40, type: 'consumable' },
    { id: 's_killtag', name: 'Kill Tag Pack', desc: 'Grants 1 Kill Tag for smith upgrades', price: 80, type: 'currency', amount: 1 }
  ];

  let catalog = defaultCatalog.slice();
  // Current ephemeral shop offers (persist until next explicit refresh)
  let currentOffers = {
    weapons: [],
    consumables: []
  };

  function _sample(array, n) {
    const copy = array.slice();
    const out = [];
    while (out.length < n && copy.length > 0) {
      const idx = Math.floor(Math.random() * copy.length);
      out.push(copy.splice(idx,1)[0]);
    }
    return out;
  }

  function clearShopOffers() {
    currentOffers.weapons = [];
    currentOffers.consumables = [];
  }

  function generateShopOffers() {
    const state = getGameState();
    if (!state) return currentOffers;

    // Weapons: choose up to 2 random weapons not currently equipped
    const allWeapons = state.config && state.config.weapons ? Object.keys(state.config.weapons) : [];
    const equipped = (state.playerState && state.playerState.weapons) ? state.playerState.weapons.filter(Boolean) : [];
    const candidates = allWeapons.filter(w => !equipped.includes(w));
    currentOffers.weapons = _sample(candidates, 2);

    // Consumables: guarantee core restorative potions, then add the usual shelf mix
    const guaranteed = ['Health Potion', 'Mana Potion'];
    const defensive = ['Shield', 'Mega Instinct'];
    const offensive = ['Rage Tonic', 'Elemental Grease', 'Lightning Rod', 'Gorillaz Brute Juice', 'Catalyzer'];
    const other = ['Prayer', 'Rift', 'Echo'];

    const picks = [];
    picks.push(...guaranteed);
    picks.push(..._sample(defensive, 2));
    picks.push(..._sample(offensive, 2));
    if (Math.random() < 0.2) picks.push(_sample(other, 1)[0]);
    currentOffers.consumables = [...new Set(picks.filter(Boolean))];

    return currentOffers;
  }

  function loadShop() {
    try {
      const raw = localStorage.getItem(SHOP_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (Array.isArray(data.catalog)) catalog = data.catalog;
    } catch (e) { console.warn('Failed loading shop data', e); }
  }

  function saveShop() {
    try {
      localStorage.setItem(SHOP_KEY, JSON.stringify({ catalog }));
    } catch (e) { console.warn('Failed saving shop data', e); }
  }

  function getCatalog() { return catalog.slice(); }

  function canAfford(gs, price) { return (gs.playerState.gold || 0) >= price; }

  function purchase(itemId) {
    const gs = getGameState();
    const item = catalog.find(i => i.id === itemId);
    if (!item) return { success: false, reason: 'not_found' };
    if (!canAfford(gs, item.price)) return { success: false, reason: 'no_gold' };

    gs.setGold((gs.playerState.gold || 0) - item.price);

    if (item.type === 'consumable') {
      gs.playerState.consumables = gs.playerState.consumables || {};
      gs.playerState.consumables[item.id] = (gs.playerState.consumables[item.id] || 0) + 1;
    } else if (item.type === 'currency') {
      gs.playerState.killTagsByWeapon = gs.playerState.killTagsByWeapon || {};
      gs.playerState.killTags = (gs.playerState.killTags || 0) + (item.amount || 1);
    } else if (item.type === 'weapon_upgrade') {
      gs.addBuff && gs.addBuff(item.id);
    }

    gs.save && gs.save();
    gs.eventBus && gs.eventBus.emit && gs.eventBus.emit(EVENTS.GOLD_CHANGED, { newGold: gs.playerState.gold });
    return { success: true, item };
  }

  // Convenience helpers (ported from previous implementation)
  function calculateMaxGold() {
    const state = getGameState();
    if (!state || !state.dailiesState) return 0;
    let maxGold = 0;
    (state.dailiesState.dailies || []).forEach(d => {
      const reward = state.config && state.config.taskRewards && state.config.taskRewards[d.difficulty];
      if (reward && reward.gold) maxGold += reward.gold;
    });
    return maxGold;
  }

  function getWeaponPrice(weaponName) {
    const state = getGameState();
    if (!state || !state.config || !state.config.weapons) return null;
    const weapon = state.config.weapons[weaponName];
    if (!weapon) return null;
    if (weapon.price === 0) return 0;
    const maxGold = calculateMaxGold();
    return Math.ceil(maxGold * (weapon.price || 0));
  }

  function getConsumablePrice(consumableName) {
    const state = getGameState();
    if (!state || !state.config || !state.config.consumables) return null;
    const consumable = state.config.consumables[consumableName];
    if (!consumable) return null;
    const maxGold = calculateMaxGold();
    return Math.ceil(maxGold * (consumable.price || 0));
  }

  function buyWeapon(weaponName, element = null) {
    const state = getGameState();
    const price = getWeaponPrice(weaponName);
    if (price === null) return { success: false, reason: 'not_found' };
    if ((state.playerState.gold || 0) < price) return { success: false, reason: 'no_gold' };
    if (typeof PlayerManager === 'undefined' || typeof PlayerManager.addWeapon !== 'function') return { success: false, reason: 'no_player_manager' };

    // Try to add weapon; if inventory full, signal needsDiscard
    const added = PlayerManager.addWeapon(weaponName, element);
    if (!added) return { success: false, reason: 'inventory_full', needsDiscard: true };

    state.setGold((state.playerState.gold || 0) - price);
    // persist and notify
    if (state.save) state.save();
    state.eventBus && state.eventBus.emit && state.eventBus.emit(EVENTS.GOLD_CHANGED, { newGold: state.playerState.gold });
    state.eventBus && state.eventBus.emit && state.eventBus.emit(EVENTS.ATTACK, { type: 'weaponAcquired', weaponName });
    return { success: true, weaponName, price, element };
  }

  function buyConsumable(consumableName, quantity = 1) {
    const state = getGameState();
    const unitPrice = getConsumablePrice(consumableName);
    if (unitPrice === null || unitPrice === undefined) return { success: false, reason: 'not_found' };
    const total = unitPrice * quantity;
    if ((state.playerState.gold || 0) < total) return { success: false, reason: 'no_gold' };
    if (typeof PlayerManager === 'undefined' || typeof PlayerManager.addConsumable !== 'function') return { success: false, reason: 'no_player_manager' };

    const current = (typeof PlayerManager !== 'undefined' && typeof PlayerManager.getConsumableCount === 'function') ? PlayerManager.getConsumableCount(consumableName) : 0;
    const maxPer = state.config?.consumableSlots?.maxPerType || 99;
    if (current + quantity > maxPer) return { success: false, reason: 'inventory_full' };

    state.setGold((state.playerState.gold || 0) - total);
    PlayerManager.addConsumable(consumableName, quantity);
    if (state.save) state.save();
    state.eventBus && state.eventBus.emit && state.eventBus.emit(EVENTS.GOLD_CHANGED, { newGold: state.playerState.gold });
    return { success: true, consumableName, quantity, price: total };
  }

  function isShopAvailable() {
    const state = getGameState();
    if (!state || !state.config || !state.stageState) return false;
    const level = state.stageState.level;
    return (state.config.shopAppearLevels || []).includes(level);
  }

  function getAvailableWeapons() {
    // Prefer current offers if generated, otherwise return all non-equipped weapons
    const state = getGameState();
    if (!state || !state.config || !state.config.weapons) return [];
    const equipped = (state.playerState && state.playerState.weapons) ? state.playerState.weapons.filter(Boolean) : [];
    if (currentOffers.weapons && currentOffers.weapons.length) {
      // filter out any that were acquired since offers were generated
      return currentOffers.weapons.filter(w => !equipped.includes(w));
    }
    return Object.keys(state.config.weapons).filter(n => !equipped.includes(n));
  }

  function getAvailableConsumables() {
    const state = getGameState();
    if (!state) return [];
    const guaranteed = ['Health Potion', 'Mana Potion'];
    if (currentOffers.consumables && currentOffers.consumables.length) {
      return [...new Set([...guaranteed, ...currentOffers.consumables])];
    }
    // fallback: generate now but keep it
    generateShopOffers();
    return [...new Set([...guaranteed, ...currentOffers.consumables])];
  }

  function getSmithUpgrade() {
    // return first weapon_upgrade type found in catalog
    const upgrade = catalog.find(i => i.type === 'weapon_upgrade');
    return upgrade || null;
  }

  // Public API
  const api = {
    init() { loadShop(); },
    getCatalog,
    purchase,
    save: saveShop,
    calculateMaxGold,
    getWeaponPrice,
    getConsumablePrice,
    isShopAvailable,
    getAvailableWeapons,
    getAvailableConsumables,
    buyWeapon,
    buyConsumable,
    generateShopOffers,
    clearShopOffers,
    getSmithUpgrade
  };

  try { window.ShopManager = api; } catch (e) {}

  return api;
})();
