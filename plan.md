# Implementation Plan: Tycoon Mode — Original Task Panel Integration

Reuse the original game's Dailies/To-Dos side drawer inside Tycoon Mode, exactly as-is, with only Dailies and To-Dos tabs visible. The tycoon HUD hides when the panel is open and shows the character stats read-only at the top of the panel.

---

## Design Decisions (From Interview)

| Question | Decision |
|---|---|
| Task UI in Tycoon | Open the **original side panel** (the real drawer DOM), not a custom dialog |
| Panel position | Slide in from the **right**, same as original |
| Tabs visible | **Dailies and To-Dos only** — hide Achievements, Pet, Cosmetics tabs in Tycoon |
| Task management | **Fully interactive** — add, edit, delete, complete, reorder |
| Trigger | **Original side-edge tab handles** — remove the 📋 Tasks button from Tycoon HUD |
| HUD when panel is open | **Tycoon HUD hides completely**; panel takes full height |
| Check-In | Remains on the HUD; open/close panel separately |
| Character stats | **Read-only summary** shown at top of panel in Tycoon Mode |
| Completion rewards | Dailies in Tycoon drive **production rate only** (separate game, no combat rewards) |
| CSS exclusions | Panel elements permanently excluded from tycoon culling; show/hide managed by UIManager |
| DOM approach | Reuse existing panel DOM by calling `UIManager.toggleTaskPanel()` |

---

## Proposed Changes

### 1. `style_tycoon.css` — CSS Culling Exclusions

#### [MODIFY] [style_tycoon.css](file:///c:/Users/pauli/OneDrive/Documents/Desktop/nemesis3/style_tycoon.css)

Update the body-child culling rule to exclude the original panel elements:
- `#dailiesPanel` and its handle `#dailiesTabHandle`
- `#todosPanel` and its handle `#todosTabHandle`
- `.popup-overlay` and `.floating-wizard` (already excluded)
- All `.popup` elements

```css
body.tycoon-active > :not(#tycoon-container)
                   :not(#dailiesPanel):not(#dailiesTabHandle)
                   :not(#todosPanel):not(#todosTabHandle)
                   :not(.popup-overlay):not(.floating-wizard)
                   :not(script):not(style) {
  display: none !important;
}
```

Also add a rule: when tycoon is active and a task panel is open, hide `#tycoon-container`'s header (`.tycoon-header`) so the panel takes full height.

---

### 2. `JS/tycoon.js` — HUD & Panel Integration

#### [MODIFY] [JS/tycoon.js](file:///c:/Users/pauli/OneDrive/Documents/Desktop/nemesis3/JS/tycoon.js)

- **Remove** the `tycoon-tasks-btn` (📋 Tasks) button from the HTML template in `initDOM()`.
- **Remove** its click handler from `setupUIHandlers()`.
- **Remove** the `#tycoon-tasks-dialog` overlay entirely from the HTML template (it is replaced by the original panel).
- **Add** a method `openTaskPanel(which)` that:
  1. Hides the tycoon HUD (`.tycoon-header`)
  2. Calls `UIManager.toggleTaskPanel(which)` to open the dailies or todos panel
  3. Listens for panel close to restore the HUD
- **Add** tycoon-mode awareness to the Achievements/Pet/Cosmetics tab handles: in tycoon mode, clicking those handles is a no-op (or they are hidden via CSS).
- **Completion rate hook**: After any task completion event fires (`EVENTS.TASK_COMPLETED`), recalculate and post `update_completion_rate` to the worker.

---

### 3. `JS/ui.js` — Tycoon Awareness in Panel

#### [MODIFY] [JS/ui.js](file:///c:/Users/pauli/OneDrive/Documents/Desktop/nemesis3/JS/ui.js)

- In `toggleTaskPanel()`: if `localStorage.getItem('nemesis_active_mode') === 'tycoon'`, block opening `'achievements'`, `'pet'`, and `'cosmetics'` panels silently.
- In `closeTaskPanel()`: if tycoon is active, restore the tycoon HUD (`.tycoon-header`) after closing.
- In the character stats header area of the daily panel: if tycoon mode is active, inject a small read-only stats bar showing class, level, gold, AP (sourced from `getGameState().playerState`).

> [!NOTE]
> The character panel logic already exists in `tycoon.js`'s old `renderTasksList()`. We will move that logic into `UIManager`'s panel open sequence.

---

### 4. `JS/popups.js` — `closeAllPopups` Tycoon Cleanup

#### [MODIFY] [JS/popups.js](file:///c:/Users/pauli/OneDrive/Documents/Desktop/nemesis3/JS/popups.js)

- Remove the existing block that re-shows `#tycoon-tasks-dialog` (this dialog will no longer exist).
- When tycoon is active and a popup closes, instead restore the tycoon HUD visibility if no panel is open.

---

## Verification Plan

### Manual Verification

1. **Tab Handles Visible in Tycoon**: Load in Tycoon Mode. Confirm the original Dailies and To-Dos tab handles appear on the right edge of the screen.
2. **Panel Opens**: Tap the Dailies tab handle → original dailies drawer slides in from the right. Tycoon HUD disappears. Panel takes full screen height.
3. **Tabs Restricted**: Confirm Achievements, Pet, and Cosmetics tab handles are hidden or do nothing in Tycoon Mode.
4. **Full Task Management**: Add a daily, edit it, complete it, delete it — all using the original popups and UI.
5. **Completion Rate**: Complete some dailies. Press Check In on the HUD. Verify the production rate in the Tycoon HUD changes accordingly.
6. **HUD Restores**: Close the panel. Confirm the tycoon HUD reappears.
7. **Character Stats**: Open the panel. Confirm a read-only character stat summary (class, level, gold, AP) shows at the top.
8. **Mobile**: Test on a narrow viewport — panel should slide in and be scrollable; tab handles should be tap-friendly.

---

## Tycoon Mode: Separate Game Architecture

Tycoon Mode is **its own game** sharing the same browser session as the main combat game. It borrows data and UI systems as read-only inputs; it never writes to or depends on the main combat loop.

### Separation Principle
- **Tycoon owns**: farm gold, farm AP, food, its own day/night cycle (managed by `tycoon_worker_code.js`), tile map, farmers, prestige stats, and save key `nemesis_tycoon_data`.
- **Tycoon borrows (read-only)**: `TaskManager.getAllDailies()`, `TaskManager.getAllTodos()`, task completion calls — valid because both games share real-world tasks by design.
- **Tycoon never**: calls `TaskManager.resetDailies()`, modifies combat player state, or calls `location.reload()` on exit.

### Integration Contract
| Direction | Mechanism | Notes |
|-----------|-----------|-------|
| Main → Tycoon | `TycoonManager.enterTycoonMode(rate)` | Death screen, pause menu, or cheats |
| Tycoon → Main | `UIManager.refreshGameUI()` on exit | Restores HUD without page reload |
| Task completion rate | `calculateCurrentCompletionRate()` snapshot | Passed to worker as production multiplier |
| Daily completion | `TaskManager.completeDaily/completeTodo` | Shared task system — valid by design |
| Save state | `localStorage 'nemesis_tycoon_data'` only | Main key `'nemesis_data'` never touched from tycoon |

### Tycoon Worker Message Contract
- Outbound: `tycoon_daily_summary` (never `daily_summary`) — prevents accidental coupling with main-game handlers.
- Worker manages its own hourly tick, day/night cycle, and resource production independently of the main game.
