/**
 * NEMESIS ROGUELIKE — GRID INVENTORY SYSTEM
 * Organized popup modal for Weapons, Talismans, Consumables, and Key Items.
 */

class InventoryManager {
  static showGridPopup() {
    const state = typeof getGameState === 'function' ? getGameState() : null;
    if (!state) return;

    if (typeof PopupsManager !== 'undefined' && PopupsManager.closeAllPopups) {
      PopupsManager.closeAllPopups();
    }

    const overlay = document.createElement('div');
    overlay.className = 'popup-overlay inventory-grid-overlay';
    overlay.style.pointerEvents = 'auto';
    overlay.style.zIndex = '10000';

    const popup = document.createElement('div');
    popup.className = 'popup inventory-grid-popup';
    popup.style.maxWidth = '680px';
    popup.style.width = '95vw';
    popup.style.padding = '20px';
    popup.style.background = 'rgba(12, 14, 28, 0.98)';
    popup.style.border = '1px solid rgba(245, 158, 11, 0.5)';
    popup.style.borderRadius = '12px';
    popup.style.boxShadow = '0 0 25px rgba(245, 158, 11, 0.25)';

    const player = state.playerState || {};
    const weapons = player.weapons || ['Rusty Sword'];
    const equippedWeapon = player.equippedWeapon || weapons[0] || 'Rusty Sword';
    const talismans = player.talismans || [];
    const equippedTalismans = player.equippedTalismans || [];
    const consumables = player.inventory || [];
    const keyItems = player.keyItems || [];

    popup.innerHTML = `
      <div class="popup-drag-bar" style="width: 44px; height: 5px; background: #f59e0b; border-radius: 3px; margin: 0 auto 10px auto; cursor: grab;"></div>
      <h2 style="margin: 0 0 16px 0; text-align: center; color: #f59e0b; font-family: 'Orbitron', sans-serif; font-size: 1.4rem;">🎒 GRID INVENTORY</h2>
      <button class="btn-close" style="position: absolute; top: 16px; right: 16px; background: transparent; border: none; color: #aaa; font-size: 1.2rem; cursor: pointer;">✕</button>

      <div class="inventory-grid-sections" style="display: flex; flex-direction: column; gap: 16px; max-height: 70vh; overflow-y: auto; padding-right: 6px;">
        
        <!-- WEAPONS GRID -->
        <div class="inv-section" style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 12px;">
          <h3 style="margin: 0 0 10px 0; font-size: 12px; color: #ffd700; text-transform: uppercase; display: flex; align-items: center; gap: 6px;">
            <span>⚔️</span> Weapons Slot Grid
          </h3>
          <div class="grid-slots" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1.0fr)); gap: 8px;">
            ${weapons.map(w => {
              const isEquipped = w === equippedWeapon;
              const wCfg = state.config?.weapons?.[w] || {};
              return `
                <div class="inv-slot weapon-slot ${isEquipped ? 'is-equipped' : ''}" data-weapon="${w}" style="background: ${isEquipped ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.05)'}; border: 1px solid ${isEquipped ? '#f59e0b' : 'rgba(255,255,255,0.15)'}; border-radius: 6px; padding: 8px; cursor: pointer; text-align: center; position: relative;">
                  ${isEquipped ? '<span style="position:absolute; top:2px; right:4px; font-size:9px; color:#f59e0b; font-weight:bold;">EQUIPPED</span>' : ''}
                  <div style="font-size: 1.5rem; margin-bottom: 4px;">⚔️</div>
                  <div style="font-size: 11px; font-weight: bold; color: #fff;">${w}</div>
                  <div style="font-size: 9px; color: #aaa;">Mult: ${wCfg.damageMultiplier || 1}×</div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- TALISMANS GRID -->
        <div class="inv-section" style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 12px;">
          <h3 style="margin: 0 0 10px 0; font-size: 12px; color: #1B4332; text-transform: uppercase; display: flex; align-items: center; gap: 6px;">
            <span>🔷</span> Equipped Talismans & Trinkets
          </h3>
          <div class="grid-slots" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1.0fr)); gap: 8px;">
            ${talismans.length === 0 ? '<div style="grid-column: 1/-1; color: #64748b; font-size: 11px; text-align: center; padding: 10px;">No Talismans in possession</div>' : talismans.map(t => {
              const isEq = equippedTalismans.includes(t);
              return `
                <div class="inv-slot talisman-slot ${isEq ? 'is-equipped' : ''}" data-talisman="${t}" style="background: ${isEq ? 'rgba(27, 67, 50, 0.2)' : 'rgba(255,255,255,0.05)'}; border: 1px solid ${isEq ? '#1B4332' : 'rgba(255,255,255,0.15)'}; border-radius: 6px; padding: 8px; cursor: pointer; text-align: center;">
                  <div style="font-size: 1.5rem; margin-bottom: 4px;">💎</div>
                  <div style="font-size: 11px; font-weight: bold; color: #fff;">${t}</div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- CONSUMABLES GRID -->
        <div class="inv-section" style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 12px;">
          <h3 style="margin: 0 0 10px 0; font-size: 12px; color: #34d399; text-transform: uppercase; display: flex; align-items: center; gap: 6px;">
            <span>🧪</span> Consumables Satchel
          </h3>
          <div class="grid-slots" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1.0fr)); gap: 8px;">
            ${consumables.length === 0 ? '<div style="grid-column: 1/-1; color: #64748b; font-size: 11px; text-align: center; padding: 10px;">No Consumables in satchel</div>' : consumables.map((c, idx) => {
              return `
                <div class="inv-slot consumable-slot" data-index="${idx}" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15); border-radius: 6px; padding: 8px; cursor: pointer; text-align: center;">
                  <div style="font-size: 1.5rem; margin-bottom: 4px;">🧪</div>
                  <div style="font-size: 11px; font-weight: bold; color: #fff;">${typeof c === 'string' ? c : (c.name || 'Potion')}</div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- KEY ITEMS GRID -->
        <div class="inv-section" style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 12px;">
          <h3 style="margin: 0 0 10px 0; font-size: 12px; color: #38bdf8; text-transform: uppercase; display: flex; align-items: center; gap: 6px;">
            <span>🔑</span> Key Items & Vault Challenge Keys
          </h3>
          <div class="grid-slots" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1.0fr)); gap: 8px;">
            ${keyItems.length === 0 ? '<div style="grid-column: 1/-1; color: #64748b; font-size: 11px; text-align: center; padding: 10px;">No Key Items collected</div>' : keyItems.map(k => {
              return `
                <div class="inv-slot key-slot" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.15); border-radius: 6px; padding: 8px; text-align: center;">
                  <div style="font-size: 1.5rem; margin-bottom: 4px;">🔑</div>
                  <div style="font-size: 11px; font-weight: bold; color: #fff;">${typeof k === 'string' ? k : (k.name || 'Key')}</div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

      </div>
    `;

    const closeBtn = popup.querySelector('.btn-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => overlay.remove());
    }

    // Weapon equip handler
    popup.querySelectorAll('.weapon-slot').forEach(slot => {
      slot.addEventListener('click', () => {
        const wName = slot.dataset.weapon;
        if (typeof PlayerManager !== 'undefined' && typeof PlayerManager.equipWeapon === 'function') {
          PlayerManager.equipWeapon(wName);
          overlay.remove();
          InventoryManager.showGridPopup();
        }
      });
    });

    overlay.appendChild(popup);
    document.body.appendChild(overlay);
  }
}

if (typeof window !== 'undefined') {
  window.InventoryManager = InventoryManager;
}
