## Plan: Full Implementation Roadmap

Implement the game in dependency order so the core loop becomes playable first, then layered systems like buffs, planner, shop, and polish. The current repo already has strong scaffolding in `core.js`, `enemy.js`, `stage.js`, `ui.js`, and `popups.js`; the next work should focus on wiring the missing daily-cycle control flow and then filling the remaining blueprint gaps behind it.

**Steps**
1. Build the check-in control flow first, because it unlocks the entire game loop. Implement `performCheckIn()` and any related helper methods in the owning game-state or combat/task layer, then wire `UIManager.handleCheckInClick()` to the real sequence. This should cover pending damage calculation, enemy retaliation, late-to-do damage, Nemesis incantations, planner reward claiming, death-defiance evaluation, daily reset, streak updates, and level/stage transitions.
2. Finish combat resolution immediately after check-in, because check-in depends on it. Finalize retaliation damage, combo handling, crits, overkill spillover, final stand, dodge state, spinner targeting, and enemy death flow in `combat.js` and `ui.js`. Reconcile the current UI dodge behavior with the battle rules in the blueprint.
3. Wire class-specific and passive systems on top of the combat core. Implement mana skills, class passives, streak damage bonuses, weapon scaling, kill tags, and any class-specific edge cases that the current config already describes but the code does not yet execute.
4. Implement buff progression and permanent buff effects. Use the existing `PopupsManager.showBuffSelection()` path as the UI entry point, then connect level 2/4 selection, buff pool exclusion, and the 21 buff effects into player/combat/task logic.
5. Complete task-system edge cases and main-game task rewards. Finish Blood Oath behavior, complete daily behavior, streak color logic, minimum daily enforcement, and the special “Default Day Task” bridge to planner-derived attribute points if that feature is intended in this build.
6. Replace the current planner shell with the full planner app spec. Implement the per-date storage model, draggable task shapes, pending rewards, reset pending, sticky notes, background presets, quick-add parsing, and storage-event sync with the main game.
7. Add the missing configuration and support surfaces. Build the config page, finalize shop/smith upgrade flows, consumables, death/victory screens, and any missing popups so the UI matches the blueprint instead of only the current in-game subset.
8. Finish polish and validation once the game loop is complete. Add/adjust animations, responsive layout fixes, sound hooks, and playtest the full progression path from task completion through check-in, enemy retaliation, level-up, buffs, shop, and boss transitions.

**Relevant files**
- `c:\Users\pauli\OneDrive\Documents\Desktop\nemesis3\JS\core.js` — game state, event bus, save/load, daily-cycle state
- `c:\Users\pauli\OneDrive\Documents\Desktop\nemesis3\JS\ui.js` — check-in button wiring, HUD, dodge, task panels, enemy targeting
- `c:\Users\pauli\OneDrive\Documents\Desktop\nemesis3\JS\combat.js` — attack resolution, combo, dodge, retaliation hooks
- `c:\Users\pauli\OneDrive\Documents\Desktop\nemesis3\JS\player.js` — classes, passives, mana skills, buff gating, death-defiance helpers
- `c:\Users\pauli\OneDrive\Documents\Desktop\nemesis3\JS\tasks.js` — dailies, todos, Blood Oath, rewards, streaks, task completion rules
- `c:\Users\pauli\OneDrive\Documents\Desktop\nemesis3\JS\enemy.js` — enemy stats, archetypes, damage and reward interactions
- `c:\Users\pauli\OneDrive\Documents\Desktop\nemesis3\JS\stage.js` — level/stage generation, boss transitions, progression
- `c:\Users\pauli\OneDrive\Documents\Desktop\nemesis3\JS\popups.js` — buff selection, buffs, shop, satchel, death, victory, dialogue
- `c:\Users\pauli\OneDrive\Documents\Desktop\nemesis3\planner.html` — planner app shell that needs full feature implementation
- `c:\Users\pauli\OneDrive\Documents\Desktop\nemesis3\config.js` — balancing constants and any config page source of truth
- `c:\Users\pauli\OneDrive\Documents\Desktop\nemesis3\index.html` — startup flow, missed-check-in timer, app bootstrap
- `c:\Users\pauli\OneDrive\Documents\Desktop\nemesis3\style.css` — layout, responsive behavior, popup and stage styling

**Verification**
1. Run workspace error checks after each major slice, starting with `core.js`, `combat.js`, `ui.js`, `tasks.js`, and `popups.js`.
2. Exercise the main loop in the live preview: complete tasks, trigger check-in, confirm retaliation, confirm death-defiance or death flow, then confirm stage/level progression.
3. Verify buff selection, dodge, and weapon swapping in the browser before expanding into planner and config work.
4. Once the planner is built, verify cross-tab sync by editing planner rewards in one tab and confirming the main game claims them correctly.

**Decisions**
- Prioritize the check-in loop before secondary systems because it is the gating dependency for every other daily-cycle feature.
- Treat the current planner shell as a replacement target, not a patch target, because the blueprint requires a significantly richer per-date data model.
- Keep scope focused on the blueprint’s playable path first, then fill in polish and late-game completeness after the loop is stable.

**Further Considerations**
1. If you want, I can next turn this into a phased delivery checklist with concrete PR-sized chunks.
2. If the goal is only “playable MVP” rather than full v5.0, the planner/config/shop phases can be deferred behind the core loop and combat pass.