# Zombie Defense Mini-Game & Todo Scoring Tweaks Spec

## 1. Todo Scoring System Update
- **Max Potential Points (Denominator)**:
  - Dailies: Sum of points of all active daily items.
  - To-Dos: ONLY To-Dos where `dueDate == today (YYYY-MM-DD)` contribute to max potential points.
  - To-Dos with NO due date: Do NOT contribute to max potential points (denominator), but provide full bonus points to earned score (numerator) when completed today.
  - To-Dos with future due dates: Do not count toward today's potential.
  - Pre-completed To-Dos: If already marked complete before today and due today, automatically filled and counted.

## 2. Zombie Defense Game Architecture
- **Trigger & UI Modal**:
  - Full-screen slide-up bottom drawer / sheet with drag handle (`#zombieDrawer`).
  - Top Bar: Base HP (Default 15 / 15), Coin balance, Turn / Day counter, "Check-In / Advance Turn" button, Close button.
  - Visual Theme: Solarized light solid colors (`#fdf6e3`, `#eee8d5`, `#073642`, `#dcd3b8`, `#268bd2`, `#dc322f`, `#859900`, `#cb4b16`, `#6c71c4`), crisp lines, 0 blur / 0 glow.

- **Canvas & Spatial Layout**:
  - Center: 6x6 interior grid (Base command & placement area).
  - Concentric rings: 15 thin rings numbered 1 (innermost) to 15 (outermost).
  - 16 Angular Slices: 360° is divided into 16 slices (22.5° each).

- **Enemies (Zombies)**:
  - Rendered as minimalist solid colored squares positioned on (ring, slice) coordinates with a tiny top health bar (no text).
  - Next move path: Low-opacity preview line/dash indicating next ring position.
  - Enemy Types:
    - **Fodder**: HP 1, DMG 1, SPD 1
    - **Glass**: HP 1, DMG 4, SPD 1
    - **Running**: HP 2, DMG 2, SPD 3
    - **Bloater**: HP 3, DMG 4, SPD 1
    - **Endurance**: HP 3, DMG 1, SPD 2
  - Spawning: 2-5 zombies spawn on ring 15 each turn / check-in at random slice angles.

- **Items & Grid System (6x6 Base)**:
  - Click empty 6x6 tile to purchase / place item.
  - Click occupied tile to upgrade, sell, or adjust slice angle / cone width (1 to 16 slices).
  - **Interior Items**:
    - **Income Generator**: +5 coins passive / turn (+1 coin per upgrade). Cost: 10 coins (upgrade: 5).
    - **Core Turret**: Attacks up to 3 closest enemies in targeting cone for 1 DMG (+1 DMG, +1 target per upgrade). Draws immediate solid firing line to targets. Cost: 10 coins.
    - **Freeze Spell**: Slows up to 2 closest enemies in cone by 1 speed (min 1 speed). (+1 target per upgrade). Cost: 10 coins.
  - **Exterior Items (Outer Ring Barriers / Turrets)**:
    - **Exterior Wall**: Placed on outer ring quadrant (4 slices / 1/4 arc). 5 HP. Absorbs incoming enemy damage. When broken, enemies breach past. Can be reinforced (+5 HP per upgrade).
    - **Exterior Turret**: Placed on outer ring. 2 DMG to closest enemy in slice, but breakable (3 HP).

- **Turn / Check-In Phase Resolution Order**:
  1. Coin Distribution: Gain coins = Check-in completion rate (0-100 coins) + Income items.
  2. Defense Phase: Interior & Exterior turrets fire (draw visual lines, deal damage, kill zombies). Freeze spells apply slows.
  3. Enemy Advance: Surviving zombies move `speed` rings inward.
  4. Collision / Damage:
     - If a zombie reaches a wall, it deals damage to the wall.
     - If a zombie reaches ring 0 (Base), it deals damage to base HP and dies.
  5. Spawn Phase: 2-5 new zombies spawn on ring 15.
  6. Game Over / Base Repair: If base HP reaches 0, Base Defeated modal with restart option.

- **Persistence**:
  - Saved under `localStorage.getItem('nemesis_zombie_game_v1')`.
