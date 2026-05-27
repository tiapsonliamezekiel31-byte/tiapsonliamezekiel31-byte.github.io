Project Progress — Nemesis3
===========================

Summary
-------
This document records the recent work done on the repository (changes made during the current session and earlier), plus remaining work to finish the Shop, Combat, Consumable, and UI flows. It is intended to be a single-source progress overview for planning and QA.

Completed / Added
------------------
- Shop consolidation and APIs
  - Consolidated shop behaviours and added `ShopManager` APIs (purchase, buyConsumable, catalog access).
  - Shop UI: full-screen split `Smith` (weapons) and `Shelf` (consumables).
  - Persistent offers per open, gold update on purchases.

- Consumables & Satchel
  - `PlayerManager.addConsumable()` and `useConsumable()` updated to support shop IDs and config names, apply Heal/AP effects, persist consumption.
  - `PopupsManager.showSatchel()` wired USE buttons to `PlayerManager.useConsumable()` and mapped shop IDs to friendly names.

- Weapon upgrades & combat
  - Weapon upgrade representation reconciled: upgrades now expose `{ crit, damage }` and `CombatManager` aggregates them to affect crit chance and damage.
  - Damage formula updated in `WeaponAttack.calculateDamage()` to include class passives, streak, combo, weakness multipliers, buffs (Sharp Edge, Fury), and upgrade multipliers.

- Boss & Stage handling
  - `StageManager.generateBossLevel()` creates boss objects with expected methods (`takeDamage`, `heal`, `getWeaknessMultiplier`, etc.).
  - `StageManager.rehydrateLoadedEnemies()` implemented to reconstruct deserialized enemies/bosses so combat doesn't call methods on plain data objects.

- Progression & Victory
  - Combat now checks after kills whether all enemies are dead and advances level immediately.
  - Final-boss (`special: 'final'`) defeat triggers immediate victory popup. Victory popup now guarded to show only when run reaches configured final stage/level.
  - `PopupsManager.showVictoryScreen()` and `UIManager` now listen/emit `EVENTS.VICTORY` appropriately.

- UI & UX fixes
  - Shop overlay no longer intercepts clicks when closed (pointer-events disabled when hidden).
  - Attack button relocated and enlarged: centered horizontally below the enemy circle; responsive sizing on narrow viewports; other action buttons arranged around the lower half of the circle.
  - Buff selection popup fixed: removed stray `soundEnabled` / `soundVolume` keys from `buffs` (moved to top-level config) to avoid an "undefined" buff card.

Files Changed (high-level)
-------------------------
- JS/
  - `JS/combat.js` — damage calculation improvements, post-kill progression, victory logic.
  - `JS/player.js` — consumable handling, weapon upgrades storage and APIs, level helpers.
  - `JS/popups.js` — satchel, buff selection, death & victory popups.
  - `JS/stage.js` — boss creation and `rehydrateLoadedEnemies()`.
  - `JS/ui.js` — shop overlay, action button creation & positioning, event listeners.
- config.js — moved `soundEnabled` and `soundVolume` to top-level and cleaned `buffs`.
- style.css — enlarged attack button styles, responsive adjustments, shop/popup styles.

In-Progress / Partially Done
---------------------------
- Consumable key canonicalization
  - Current state: purchases stored using shop IDs (e.g., `s_heal_potion`) while `config.consumables` uses friendly names. UI and `PlayerManager` had workarounds to support both.
  - Recommended: pick one canonical key format (prefer config consumable names) and normalize `ShopManager.purchase()` + `PlayerManager.addConsumable()` accordingly.

- Verification of Gorillaz Brute Juice behaviour
  - Needs confirmation: whether it should set a temporary Brute buff (class passive) and how that stacks with class passives and saved state. Verify it doesn't mutate enemy objects.

- Overlay & pointer-events polish
  - Shop overlay pointer-events toggled when opened/closed. Consider removing overlay node on close (instead of hiding) or ensure z-index/pointer layering matches design.

- Additional QA
  - Full playthrough QA across: buy/use consumables, attack combo flows, overkill, final boss victory, death defiance, and save/load rehydration.
  - Ensure stats (enemiesDefeated, bossesSailed, totalGoldEarned) increment correctly and are not double-counted.

Planned / To-Do (next tasks)
---------------------------
1. Canonical consumable keys: refactor shop storage to use config names and update all UI/logic to match.
2. Add press animation and sound to `#attackBtn` for better tactile feedback.
3. Add more robust save/load rehydration tests (unit test or small harness) to ensure future shape changes don't break combat.
4. Finish consistent UI layering rules: ensure all modal overlays use consistent `pointer-events` and `z-index` and remove hidden overlays if preferred.
5. Add logging/debug instrumentation to `CombatManager` for damage steps (base, passive, crit, upgrades) to help future balancing and bug hunting.
6. Run end-to-end QA and fix any remaining edge-case regressions (e.g., level-up incorrectly triggering victory, buff persistence across save/loads).

How to test (quick checklist)
---------------------------
- Start game and choose a class.
- Confirm the attack button is below the circle and doesn't overlap enemy cards.
- Buy / acquire and use `Heal Potion` and `AP Tonic` from shop and satchel; verify HP/AP change and counts decrement.
- Verify weapon upgrades change crit chance and damage in combat logs/UI.
- Kill a boss and confirm progression works: regular bosses advance levels and final boss shows Victory popup.
- Save and reload mid-boss: ensure enemies are rehydrated with methods and combat still works.

Notes & Decisions
-----------------
- Design choice: `rehydrateLoadedEnemies()` reconstructs plain data into full enemy objects to avoid TypeErrors on saved games. This keeps save format tolerant of structural changes but requires careful mapping when the enemy class evolves.
- Audio settings were misplaced inside `buffs` causing UI to show them as buff cards; they are moved to the top-level `DEFAULT_GAME_CONFIG`.

If you want, I can:
- implement canonical consumable-key refactor now and run the full QA flows, or
- add the attack button animation and sound, or
- generate a short test harness script that runs through main flows and reports failures.

---
Last update: 2026-05-22
