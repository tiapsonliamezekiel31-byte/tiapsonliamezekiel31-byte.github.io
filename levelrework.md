# Reward Branching Map Rework
Replace auto-buff/item progression with path selection.

## Core Flow & UI
- Path UI: Full-screen modal (`PopupsManager.showPathSelection()`). Simple cards, locks gameplay, hides enemies.
- Choices: `2 + Stage` (max 6). Rewards: Buff(0-3), Weapon(0-2), Heal(1-2), Resource(1-2).
- Draft UI: Choose 1, swap equipped, or skip (Buff/Weapon).
- After Clear: `PopupsManager.showLevelClearPrompt()`. Claim reward. Choice: Proceed (next level, needs >=1 clear) vs Stay/Replay (uses remaining paths, same level index, new combat).
- Cleared Paths: Remain visible, greyed out, disabled, labeled "CLEARED".
- Autosave: Triggers on path selection, combat clear, proceed/stay.

## File Changes
- `shop.js`: Refactor catalog to consumables only (Health/Mana/Heal Potion, AP Tonic). Remove s_killtag/weapons.
- `player.js`: `PlayerManager.getLevelingProgress()` returns `hasBuffSelection: false`.
- `stage.js`: Add `generatePathChoices(level)`. Mod `nextLevel()`/`nextStage()` to use paths instead of auto-combat.
- `popups.js`: Implement `showPathSelection()`, `showLevelClearPrompt()`, `showWeaponDraftSelection()`.
- `combat.js`: Post-kill calls `showLevelClearPrompt()` instead of `nextLevel()`.
- `style.css`: Add mobile-friendly `.path-selection-grid`, `.path-card`, etc.
