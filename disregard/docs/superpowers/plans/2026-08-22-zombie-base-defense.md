# Zombie Base Defense Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace legacy roguelike UI/combat with a clean standalone Zombie Base Defense game engine in `index.html` and `JS/defense_game.js`, maintaining standalone task/state persistence.

**Architecture:** A clean HTML shell with solid-color CSS styling, a 10-ring radial 2D canvas defense engine (`JS/defense_game.js`), and direct integration with `JS/tasks.js` and `JS/core.js`.

**Tech Stack:** HTML5, Vanilla CSS (solid colors), Vanilla JS (ES6+), Canvas 2D API, Web Audio Synth, LocalStorage.

## Global Constraints
- Solid colors only in UI.
- No legacy `JS/ui.js` or `JS/combat.js` imports in `index.html`.
- Preserve existing task data and state structure in `localStorage`.

---

### Task 1: Create Solid-Color UI Stylesheet (`css/defense.css`)

**Files:**
- Create: `css/defense.css`

- [ ] **Step 1: Write complete `css/defense.css`**
- [ ] **Step 2: Verify CSS rules against solid color standards**

---

### Task 2: Build Standalone 10-Ring Defense Engine (`JS/defense_game.js`)

**Files:**
- Create: `JS/defense_game.js`

- [ ] **Step 1: Implement 10-Ring Radial Canvas Renderer & Zombie Entity System**
- [ ] **Step 2: Implement Tactical AP Actions (Turret Fire, Artillery, Cryo, Repair)**
- [ ] **Step 3: Implement Task System Integration (Dailies, To-Dos, CRUD, Check-In, EventBus)**
- [ ] **Step 4: Implement Save/Load persistence to LocalStorage**

---

### Task 3: Assemble Clean Entry Point (`index.html`) & Update PWA Cache (`sw.js`)

**Files:**
- Modify: `index.html`
- Modify: `sw.js`

- [ ] **Step 1: Write clean `index.html` referencing `defense.css` and `defense_game.js`**
- [ ] **Step 2: Update `sw.js` cache list**

---

### Task 4: Verification & Polish

**Files:**
- Test: Syntax & Braces verification via `JS/check_braces.ps1`
- Test: In-browser gameplay loop verification

- [ ] **Step 1: Run brace checker**
- [ ] **Step 2: Test gameplay mechanics and task completion flow**
