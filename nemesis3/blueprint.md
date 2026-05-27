============================================================
NEMESIS ROGUELIKE — COMPLETE BLUEPRINT v5.0 (ALL-IN-ONE)
============================================================

PART I: GAME DESIGN & MECHANICS
============================================================

1. CORE LOOP
- Create and complete daily tasks & to‑dos to earn Attack Power (AP), Gold, Diamonds, attribute points.
- Spend AP to attack enemies arranged in a circle via a timed spinning selector.
- At the mandatory daily check‑in, surviving enemies retaliate based on missed dailies.
- Defeat all enemies in a level to advance to the next level.
- Player Level: starts at 1, increments each time a level is cleared, does NOT reset on stage advance (max 35).
-Every 2nd and 4th level, chose out of 3 random buffs to apply for the rest of the run. What you chose cannot be in the buff pool the next time
- Every 5 levels fight a stage boss; defeat it to advance to the next stage (7 stages total).
- 2 possible variations per stage, chosen randomly (50/50 chance) before entering.
- Death (0 HP) triggers Death Defiance once per run; if the defiance is unused, revive to 1 HP immediately. If already spent, permadeath → restart with a new class.
- Victory: defeat the final boss (Nemesis) at the end of Stage 7.

2. DAILY CYCLE & CHECK‑IN
- A game day starts at midnight local time.
- Check‑in is mandatory – it can be pressed at any time during the day.
- All “day” effects (enemy retaliation, Nemesis incantations, planner reward collection) happen ONLY at check‑in.
- Skipped day death: if a full calendar day passes without a check‑in, instant permadeath.
  - Evaluated continuously against the system clock.
  - Pausing freezes this evaluation; if paused past midnight, death triggers immediately upon unpausing if no check‑in occurred that day.
- Incomplete dailies at check‑in generate pending damage – the core driver of the combat system.

3. DATA & PERSISTENCE
- localStorage keys: `'nemesis_data'` (main game), `'nemesis_planner_data'` (planner – separate page).
- `deepMerge()` for safe loading of config and state.
- All numeric balance values stored in a single `DEFAULT_GAME_CONFIG` object.
- Config page (separate HTML) edits numbers only (no images); user‑friendly.
- Minimum required dailies: player must have at least 3 active daily tasks at all times.

4. PLAYER & RESOURCES
- HP: class‑based (see §5). 0 HP → Death Defiance check.
- Mana: class‑specific regen at check‑in.
- Gold: in‑game currency for shop purchases.
- Diamonds: reward currency; earned per task difficulty: Easy 1, Medium 2, Hard 3, Ultra 4. Used in custom reward shop (future).
- Attack Power (AP): unlimited pool; earned from tasks, planner, and class skills. Spent to attack enemies.
- MAX_AP = total AP from all dailies if completed (excludes todos and planner). Used for scaling.

5. ATTRIBUTES
- Seven attributes: STR, INT, DISC, CREA, SOC, CAP, RESP.
- Player gains attribute points from completing tasks (each task is assigned one attribute):
  Easy: 1 point, Medium: 2, Hard: 3, Ultra: 4.
- Attribute levels increase independently when total points reach cumulative thresholds:
  Level 1: 0 pts
  Level 2: 10 total pts
  Level 3: 10+11 = 21 total pts
  Level 4: 10+11+12 = 33 total pts
  Level L: sum from i=10 to 10+L-2 of i.
- Attributes used only to compare against Nemesis for incantation rolls (see §14).

6. CLASSES (all 8 defined; initial build playable: Knight, Rogue, Wizard, Brute)
Class        HP  Mana  HP/ck  Mana/ck  Passive                                      Mana Skill (cost)
Knight       180 200   20     50        Sturdy: all enemy damage reduced by 2        60 mana: Raise Shield – next 2 attacks against you deal 0.7× damage. Re‑using adds +2 attacks (no cap).
Rogue         70 250   10     60        Quick Hands: +15% crit chance                30 mana: Shadow Strike – next attack deals double damage, ignores resistances.
Wizard        90 300   10     70        Elemental Attunement: attacking an enemy’s weakness auto‑crits  40 mana: Arcane Surge – for today, weapon element changes to chosen type, bypasses all resistances.
Brute        100 150   15     40        Berserk: deal +40% damage, take +30% damage  50 mana: Blood Frenzy – today all attacks cost 50% less AP, but you take double damage.
Ranger        80 180   12     50        Master of Arms: equip 3 weapons; gain Kill Tags every 3 kills instead of 5  40 mana: Volley – attack 3 random enemies with 50% of current weapon’s damage each.
Druid        120 220   20     60        Whisperer: pet damage ×3                     50 mana: Mend – heal self 20 HP, then pet attacks twice today.
Alchemist     90 250   10     70        Potion Master: consumable effects 50% stronger, last 1 extra day  40 mana: Acid Flask – deal 10% of each enemy’s max HP as damage .
Juggernaut   250 100   30     30        Immovable:multply damage by 0.6          60 mana: Taunt – cannot dodge today, but take 60% less damage (dodge button hidden).
Madman         1   1    0      0        Fragile: miss any daily → die at check‑in, no death defiance      1 mana: immediately gain 5 diamonds (re‑usable as mana regens)

7. TASKS (DAILIES & TO‑DOS)
- Dailies: repeat daily. Difficulties: Easy/Medium/Hard/Ultra.
  Rewards (base):
    Easy: 10 Gold, 25 AP
    Medium: 15 Gold, 35 AP
    Hard: 20 Gold, 40 AP
    Ultra: 30 Gold, 55 AP
  MAX_AP = sum of AP from all dailies if completed (excludes todos and planner).
- To‑Dos: one‑time, optional deadline. Same base rewards. Late completion: rewards halved, plus flat unblockable damage at check‑in (Easy 5, Medium 7.5, Hard 10, Ultra 15).
  - Subtasks: user‑created, shown as smaller buttons below the to‑do. Each subtask completed multiplies ALL rewards (AP, Gold, Diamonds, Attribute Points) by 1.2 multiplicatively. Task can be completed independently; only checked subtasks contribute multiplier. Attribute points rounded to 2 decimal places, AP/Gold/Diamonds to 1 decimal place.
- Blood Oath: costs 20 mana. Activated by long‑pressing a daily/todo card. Must be active before task completion. Completed: rewards ×1.3. Missed (task not done or failed): pending damage contribution ×1.3 (applied before the ×5 multiplier). Also available on to‑dos.
- Edit button: separate from Blood Oath, allows editing task details.
- Daily streak border colours (per card):
  - Track two counters: consecutive days of completion (all dailies done) and consecutive days of non‑completion (any daily missed).
  - On a perfect day: completion streak +1, non‑completion streak reset to 0.
  - On any missed daily: non‑completion streak +1, completion streak reset to 0.
-Complete daily: Functions as a special type of daily, rewards 60% of the AP of every other daily. Counts in the max ap pool in computation of enemy hp. rewards the attribute points of completed tasks in the planner( the planner just manages it, the tasks in the planner have specific difficulties and thats what it is)
  - Border colour:
    - Completion streak ≥7 → gold.
    - Non‑completion streak ≥7 → red.
    - Otherwise → blue.
- Nemesis To‑Do Gains: Nemesis gains attribute points from uncompleted to‑dos whose deadline is within `nemesisTodoGainHours` hours (default 24). A flag prevents double gains.


8. COMBAT SYSTEM
- AP & Weapon Attacks: AP pool shared. Each weapon has a base AP cost.
  Scaling factor S = max(0.3, min(2.0, playerMAX_AP / 350)).
  Actual cost = round(base_cost × S).
- Damage Formula:
  (AP_cost × weapon_multiplier)
  × class_passive
  × (2 if critical)
  × (1 + streak_bonus)         – from perfect day streaks (§18)
  × (1 + combo_bonus)          – +10% per stack, max 3 stacks
  × resistance/weakness multiplier (see §12)
- Combo System: Each successful attack within 2 seconds of the previous increases combo by 1 (max 3 stacks). Each stack: +10% damage, **‑5% AP cost (additive)** on the **next** attack. Missing the spinner resets combo.
- Overkill & Final Stand:
  - Overkill: If damage dealt is >60% of the target’s max HP, excess damage is split equally between the two adjacent living enemies on the circle (left & right). If an adjacent enemy is dead, that portion is void.
  - Final Stand: Any enemy reduced to 0 HP by an attack that deals less than 20% of its max HP has a 40% chance to survive with 1 HP instead (checked before overkill spillover).
- Enemy Retaliation Damage (at check‑in):
  1. Missed dailies create pending damage D (Easy 1, Medium 1.5, Hard 2, Ultra 3). Multiply Blood Oath multipliers. D × 5 = N.
  2. N is split equally among ALIVE enemies: N/T.
  3. Each alive enemy deals damage = enemy_Dmg_Mult × (N/T) + random(-5, +5).
  4. Late to‑dos add flat unblockable damage.
- Dodge: Costs 30% of MAX_AP. Hold to enter dodge mode (spinner speed doubles, yellow trail). Release to select the enemy currently under the spinner – that enemy’s next attack is dodged.
- Rogue Skill: Shadow Strike modifies the next normal attack (no separate targeting).

9. CHECK‑IN SEQUENCE (DAILY RESET)
1. Calculate D from missed dailies (incl. Blood Oath multipliers) → D × 5 = N.
2. Pet attacks random enemy. Damage = (2% + (player level – 1) × 1%) of MAX_AP (Druid ×3).
3. Resolve enemy attacks (only alive enemies): each deals damage = enemy_Dmg_Mult × (N/T) + random(-5,+5).
4. Apply late‑todo flat damage.
5. Nemesis incantations (see §14).
6. Collect planner pending rewards (diamonds and gold from planner page, see §20).
7. If HP ≤ 0 → Death Defiance check. Success: survive with 1 HP. Fail → permadeath.
8. If all enemies dead → level up / boss fight.
9. Reset dailies, advance streaks, record history.
10. Nemesis gains attribute points: 70% of total possible daily attribute points + pending to‑do gains (from uncompleted to‑dos within 24h of deadline, 70% of their attribute points).

10. SKIPPED DAYS & PAUSE
- Skipped day: if a calendar day ends (midnight) and no check‑in was performed, instant permadeath (bypasses HP/shields).
- Pause: freezes all game timers and the skipped‑day death check. However, death is evaluated based on absolute wall‑clock time; if the game is paused past midnight, death triggers immediately upon unpausing if no check‑in occurred that day.

11. PET SYSTEM
- At run start, simple UI to choose/upload a pet image. Pet appears on screen all day.
- Pet damage formula: (2% + (player level – 1) × 1%) of MAX_AP. Druid passive triples this.
- Pet attacks a random enemy at check‑in (before enemy retaliation). With Mend, pet attacks twice that day.
- Target indicator: small pet image appears next to the targeted enemy at check‑in (no animation).

12. ENEMIES & STAGES
- 7 stages, each with 4 normal levels + 1 boss. 8‑12 enemies per normal level (see Formations).
- Enemy HP formula: final_HP = (MAX_AP × 5 × stage_HP% × enemy_HP_multiplier) / (number_of_enemies)
  stage_HP%: 30/35/40/50/60/65/70.
- Enemy HP persists across days.
- All enemies belong to one of four Archetypes:
  - Brute: Consecutive attack multiplier M = 1 + stage/10. Each consecutive day it attacks, its damage is multiplied by M, up to M^5.
  - Healer: When it attacks, also heals the lowest‑HP ally for 20% of that ally’s max HP.
  - Mana Drain: Attacks drain MN mana (MN = stage + 4).
  - Protector: While alive, adjacent living enemies take only 0.7× damage (30% reduction).
- Elite Enemies: 10% chance per enemy slot; HP ×2, damage ×2, drops 3× gold + random consumable. Purple glow. No limit per level.
- Enemy Dmg Mult: multiplies the base split of N during retaliation (enemy attack damage = Dmg_Mult × (N/T) + random).
- Element Resistance/Weakness: Each enemy lists Resist and Weak elements with a letter grade. When the player’s weapon element matches, damage multiplier = grade value:
    A = 0.7x, B = 0.9x, C = 1.0x, D = 1.1x, E = 1.3x.
  If not listed, multiplier = 1.0 (C). For multiple matches, multiply all applicable grades.
- Adjacent effects (Protector, Overkill spillover): only affect living adjacent enemies. If adjacent slot is dead, that portion is void.

============================================================
ENEMIES TABLE (Letter grade mapping as above)
============================================================
Stage 1 – Forest
Name             HP Mult  Dmg Mult  Archetype  Resist     Weak
Gorilla Rebel    1.0      1.0       Brute      Earth B    Water D
Wolf             1.3      1.2       Brute      Air C      Earth D
Goblin           0.3      0.5       Mana Drain  -          -
Goblin Wizard    1.5      0.0       Healer     Aether B   Fire E

Stage 1 – Desert
Name             HP Mult  Dmg Mult  Archetype  Resist     Weak
Giant Scorpion   1.2      1.0       Brute      Earth C    Water D
Beetle           3.0      0.6       Protector  Earth B    Air D
Grave Guardian   2.0      2.0       Protector  Aether C   Fire E
Outlaw           1.0      1.0       Mana Drain  -          -

Stage 2 – Crimson Cave
Name             HP Mult  Dmg Mult  Archetype  Resist     Weak
Tarantula        1.0      0.7       Brute      Earth C    Water D
Brain Eater      1.0      1.5       Mana Drain Aether C   Earth D
Cave Saw         1.0      0.7       Brute      Earth B    Water E

Stage 2 – Infected Swamp
Name             HP Mult  Dmg Mult  Archetype  Resist     Weak
Leech            0.5      1.0       Healer     Water C    Fire D
Frog             0.5      1.0       Brute      Water D    Earth E
Zombie           2.0      2.0       Brute      Earth C    Fire F (treat F as 1.3)

Stage 3 – Glacier
Name             HP Mult  Dmg Mult  Archetype  Resist     Weak
Ice Spirit       0.2      1.0       Mana Drain Water B    Fire E
Stalker Bear     1.5      1.5       Brute      Water C    Earth D
Yeti Mage        1.0      1.0       Healer     Water C    Fire D

Stage 3 – Ruins
Name             HP Mult  Dmg Mult  Archetype  Resist     Weak
Stone Lizard     1.0      1.0       Brute      Earth B    Water D
Golem            2.0      1.0       Protector  Earth B    Air D
Termite          0.3      0.5       Mana Drain Earth C    Fire D
Turret           1.0      2.0       Brute      Earth C    Water E

Stage 4 – Graveyard
Name             HP Mult  Dmg Mult  Archetype  Resist     Weak
Skeleton         0.7      0.7       Brute      Aether C   Fire D
Ghost            2.0      1.0       Mana Drain Aether B   Earth E
Coffin Carrier   1.0      1.0       Healer     Aether C   Fire E
Ferryman         2.0      2.0       Brute      Aether C   Earth D

Stage 4 – Castle
Name             HP Mult  Dmg Mult  Archetype  Resist     Weak
Flying Skull     0.7      0.7       Brute      Air C      Earth D
Knight           1.0      1.0       Brute      Earth B    Air D
Paladin          2.0      1.0       Protector  Earth B    Fire E
Fire Mage        0.6      2.0       Brute      Fire B     Water E
Baby Dragon      1.0      1.0       Brute      Fire C     Water D

Stage 5 – Volcano
Name             HP Mult  Dmg Mult  Archetype  Resist     Weak
Magma Blob       1.2      1.0       Brute      Fire B     Water E
Ninja            1.0      1.0       Mana Drain Air C      Earth D
Master           1.0      1.3       Brute      Earth C    Water D
Priest           4.0      0.0       Healer     Fire C     Water E

Stage 5 – Dragon Isle
Name              HP Mult  Dmg Mult  Archetype  Resist     Weak
Air Wyvern        1.0      1.0       Brute      Air B      Earth E, Fire E
Water Drake       1.0      1.0       Mana Drain Water B    Fire E
Earth Wyrm        1.0      0.5       Protector  Earth B    Air E, Fire E
Aetherian Hydra   1.0      2.0       Brute      Aether C   Earth D, Fire E

Stage 6 – Golden Mountain
Name             HP Mult  Dmg Mult  Archetype  Resist     Weak
Dwarf            0.6      1.0       Mana Drain Aether C   Fire D
Driller          2.0      2.0       Brute      Earth B    Water E
Atom             3.0      3.0       Brute      Earth B    Water D

Stage 6 – Abyssal Sea
Name                   HP Mult  Dmg Mult  Archetype  Resist     Weak
Kraken                 2.0      2.0       Brute      Water A    Air E
World Eating Snake     3.0      3.0       Brute      Water C    Fire D, Aether E
Constellation Crusher  4.0      4.0       Brute      Water A    Earth E, Aether E
Soldier                1.0      1.0       Mana Drain Water C    Fire D, Aether E

Stage 7 – The Void
Name      HP Mult  Dmg Mult  Archetype  Resist     Weak
Watcher   3.0      3.0       Mana Drain Aether B   Earth E
Chaos     3.0      3.0       Brute      Aether B   Fire E
Soul      3.0      3.0       Brute      Aether C   Earth D

============================================================
FORMATIONS (8‑12 enemies per level, elite slots random 10% each)
============================================================
Stage 1 – Forest
L1: Goblin ×6‑8, Gorilla Rebel ×1, Wolf ×1                   (8‑10)
L2: Goblin ×7‑9, Gorilla Rebel ×1, Goblin Wizard ×1           (9‑11)
L3: Goblin ×5‑7, Wolf ×1‑2, Gorilla Rebel ×1, Goblin Wizard ×1‑2   (8‑12)
L4: Goblin ×6‑7, Wolf ×1‑2, Gorilla Rebel ×1, Goblin Wizard ×2     (10‑12)

Stage 1 – Desert
L1: Giant Scorpion ×1, Beetle ×1, Outlaw ×6‑8                 (8‑10)
L2: Giant Scorpion ×1‑2, Outlaw ×6‑8, Beetle ×1               (8‑11)
L3: Giant Scorpion ×2, Grave Guardian ×1, Outlaw ×6‑7          (9‑10)
L4: Grave Guardian ×1‑2, Giant Scorpion ×1‑2, Beetle ×1, Outlaw ×5‑7   (8‑12)

Stage 2 – Crimson Cave
L1: Tarantula ×1‑2, Cave Saw ×1, Brain Eater ×6‑7              (8‑10)
L2: Brain Eater ×1, Tarantula ×2‑3, Cave Saw ×6‑7               (9‑11)
L3: Brain Eater ×1‑2, Tarantula ×2‑3, Cave Saw ×5‑7             (8‑12)
L4: Brain Eater ×2, Tarantula ×2‑3, Cave Saw ×6‑7               (10‑12)

Stage 2 – Infected Swamp
L1: Leech ×2‑3, Frog ×5‑7, Zombie ×1                           (8‑11)
L2: Zombie ×1, Leech ×2‑3, Frog ×6‑7                            (9‑11)
L3: Zombie ×1‑2, Leech ×2‑3, Frog ×5‑6                          (8‑11)
L4: Zombie ×2, Leech ×3‑4, Frog ×5‑6                            (10‑12)

Stage 3 – Glacier
L1: Ice Spirit ×6‑8, Stalker Bear ×1, Yeti Mage ×1              (8‑10)
L2: Ice Spirit ×7‑9, Stalker Bear ×1, Yeti Mage ×1               (9‑11)
L3: Ice Spirit ×5‑7, Stalker Bear ×1‑2, Yeti Mage ×1             (8‑10)
L4: Stalker Bear ×2, Yeti Mage ×1‑2, Ice Spirit ×5‑7             (9‑12)

Stage 3 – Ruins
L1: Stone Lizard ×2, Termite ×5‑7, Turret ×1                     (8‑10)
L2: Golem ×1, Termite ×5‑7, Stone Lizard ×1‑2, Turret ×1         (8‑11)
L3: Golem ×1‑2, Termite ×4‑6, Stone Lizard ×1‑2, Turret ×1‑2     (8‑12)
L4: Golem ×2, Turret ×2, Stone Lizard ×1‑2, Termite ×4‑6         (9‑12)

Stage 4 – Graveyard
L1: Skeleton ×6‑8, Ghost ×1, Coffin Carrier ×1                   (8‑10)
L2: Skeleton ×7‑9, Ghost ×1, Coffin Carrier ×1, Ferryman ×1      (9‑12)
L3: Skeleton ×5‑7, Ghost ×1‑2, Coffin Carrier ×1, Ferryman ×1    (8‑11)
L4: Ghost ×2, Ferryman ×1‑2, Skeleton ×5‑7, Coffin Carrier ×1‑2  (9‑12)

Stage 4 – Castle
L1: Flying Skull ×6‑8, Knight ×1, Baby Dragon ×1                 (8‑10)
L2: Knight ×1, Paladin ×1, Fire Mage ×1, Flying Skull ×6‑8       (9‑11)
L3: Knight ×1, Paladin ×1, Fire Mage ×1, Baby Dragon ×2‑3, Flying Skull ×4‑6 (9‑12)
L4: Paladin ×2, Fire Mage ×1, Baby Dragon ×2‑3, Flying Skull ×5‑7 (10‑12)

Stage 5 – Volcano
L1: Magma Blob ×2‑3, Ninja ×5‑7, Master ×1                       (8‑11)
L2: Magma Blob ×2‑3, Ninja ×4‑6, Master ×2, Priest ×1            (9‑12)
L3: Master ×2‑3, Ninja ×5‑7, Priest ×1, Magma Blob ×2‑3          (10‑12)
L4: Priest ×1, Master ×2‑3, Magma Blob ×2‑3, Ninja ×3‑5          (9‑12)

Stage 5 – Dragon Isle
L1: Air Wyvern ×1, Water Drake ×1, Earth Wyrm ×1, Aetherian Hydra ×5‑7  (8‑10)
L2: Air Wyvern ×1, Water Drake ×2, Earth Wyrm ×1, Aetherian Hydra ×5‑7  (9‑11)
L3: Air Wyvern ×2, Water Drake ×1‑2, Earth Wyrm ×1, Aetherian Hydra ×5‑6 (9‑12)
L4: Aetherian Hydra ×2, Air Wyvern ×2, Water Drake ×1‑2, Earth Wyrm ×5‑6 (10‑12)

Stage 6 – Golden Mountain
L1: Dwarf ×7‑9, Driller ×1, Atom ×1                              (9‑11)
L2: Dwarf ×8‑10, Driller ×1, Atom ×1                             (10‑12)
L3: Driller ×2, Atom ×1, Dwarf ×6‑8                              (9‑11)
L4: Atom ×2, Driller ×1‑2, Dwarf ×6‑8                            (9‑12)

Stage 6 – Abyssal Sea
L1: Soldier ×7‑9, Kraken ×1, World Eating Snake ×1               (9‑11)
L2: Soldier ×6‑8, Kraken ×1, World Eating Snake ×1, Constellation Crusher ×1 (9‑11)
L3: Soldier ×7‑9, Kraken ×1, Constellation Crusher ×1, World Eating Snake ×1 (10‑12)
L4: Constellation Crusher ×1, World Eating Snake ×2, Kraken ×1, Soldier ×5‑7 (9‑12)

Stage 7 – The Void
L1: Watcher ×1, Soul ×6‑8, Chaos ×1                              (8‑10)
L2: Watcher ×1, Chaos ×1‑2, Soul ×6‑8                            (8‑11)
L3: Watcher ×1‑2, Chaos ×1‑2, Soul ×6‑8                          (8‑12)
L4: Watcher ×2, Chaos ×2, Soul ×6‑7                              (10‑11)

============================================================
BOSSES (Scaling with N = pending damage after ×5)
============================================================
Boss HP = MAX_AP × 5 × stage_HP% × boss_HP_multiplier.
All boss attacks deal damage proportional to N (missed dailies). Bosses never deal flat damage independent of N.

Demon (Forest) – HP Mult 1.0
Phase 1: Reckless Swing (1.0× N) / Frenzied Slashes (0.6× N twice)
Phase 2: Demon's Chop (1.5× N) / Flame Cleave (1.2× N + 2 unblockable)
Soul Rewards: Bloodlust (kill restores 5 HP) OR Reckless Fury (+15% dmg, +10% dmg taken)

Mummified Marcher (Desert) – HP Mult 1.2
Phase 1: Slow Slam (0.8× N) / Sand Throw (0.4× N + reduce your next attack by 3)
Phase 2: Emperor's Strike (1.6× N) / Undying Endurance (heals 10% max HP)
Soul Rewards: Endurance (10 temp HP daily) OR Slow and Steady (enemy dmg -2, AP cost +10%)

Crimson Wizard (Crimson Cave) – HP Mult 0.8
Phase 1: Blood Bolt (0.9× N + loses 3% HP) / Crimson Sacrifice (1.6× N + loses 8% HP)
Phase 2: Hemorrhage (1.2× N + loses 5% HP) / Final Offering (2.5× N + loses 15% HP)
Soul Rewards: Blood Magic (+20% dmg, 2 self dmg) OR Desperation (+30% dmg when HP<30%)

Worm Eater (Infected Swamp) – HP Mult 1.0
Phase 1: Parasitic Touch (0.5× N + heal 6) / Consume Plague (heal 20% max HP)
Phase 2: Worm Surge (0.7× N + heal 10) / Regurgitate (0.9× N + heal all enemies 8)
Soul Rewards: Parasitic Healing (heal 3 when attacked) OR Consume (kill heals 10% max HP)

Jade Giant (Glacier) – HP Mult 1.3
Phase 1: Protective Strike (0.9× N) / Frozen Tears (0.6× N + 5% MAX_AP unblockable)
Phase 2: Jade Shard (1.4× N) / Shard Storm (0.8× N + 0.3× N extra)
Soul Rewards: Frozen Resolve (nullify first dmg daily) OR Shattered Grief (kill deals 10% max HP to adjacent)

Star Computer (Ruins) – HP Mult 0.9
Phase 1: Calculation Beam (1.0× N) / Data Siphon (drain 10% MAX_AP)
Phase 2: Pursuit Laser (1.3× N) / Overclock (0.7× N + 0.5× N again)
Soul Rewards: Overclock (AP cost -20%) OR Data Siphon (kill gives 5% MAX_AP once/day)

Angel (Graveyard) – HP Mult 1.0
Phase 1: Soul Grasp (0.8× N + +2 dmg next) / Graveyard Harvest (heal 5 per dead enemy)
Phase 2: Heaven's Descent (1.4× N) / Soul Barrage (0.6× N twice)
Soul Rewards: Soul Harvest (kill +2% crit, max +10%) OR Ladder Climber (+5 AP per alive enemy at day start)

Killer Queen (Castle) – HP Mult 0.9
Phase 1: Royal Decree (0.9× N) / Dance of Death (0.5× N twice)
Phase 2: Crown of Thorns (1.3× N) / Guillotine Waltz (0.8× N, 20% double)
Soul Rewards: Merciful Execution (+50% dmg to ≤30% HP) OR Dance of Death (20% free extra attack daily)

Satan's Shark (Volcano) – HP Mult 1.5
Phase 1 (Survival – 2 days): Boss invulnerable. Each day it attacks with 1.3× N (player attacks deal 0 damage). Phase ends after 2 check‑ins.
Phase 2: Lava Bite (1.4× N) / Volcanic Eruption (1.0× N + 3 unblockable)
Soul Rewards: Burnout (AP cost -10%, +10% dmg taken) OR Volcanic Resilience (shield 15% MAX_AP daily)

Fire Turtle (Dragon Isle) – HP Mult 1.4
Phase 1: Flame Breath (1.2× N) / Shell Slam (0.9× N, 30% skip your next attack)
Phase 2 (Survival – 2 days): Boss invulnerable, attacks each day with 1.3× N. Player cannot damage it.
Soul Rewards: Shell Shield (>50% HP: -20% dmg taken) OR Inner Fire (when hit, +10% next attack, stacks 3)

Banished King (Golden Mountain) – HP Mult 1.2
Phase 1: Golden Decree (1.1× N) / Aether Judgment (1.0× N, ignore 5 armor)
Phase 2: Mountain's Wrath (1.6× N) / Desperate Exile (1.3× N, lose 5% HP)
Soul Rewards: Exile's Fortitude (-15% dmg taken) OR Golden Touch (double gold from tasks)

The Sun (Abyssal Sea) – HP Mult 1.1
Phase 1: Solar Flare (1.2× N) / Blinding Light (0.8× N + attacker gains +30% crit vs you)
Phase 2: Supernova (1.8× N) / Vaporize (1.2× N, ignore all reduction)
Soul Rewards: Solar Flare (first attack daily double) OR Blinding Radiance (15% enemy miss)

Nemesis (The Void) – HP Mult 2.0 (no soul rewards)
Phase 1: Echo Strike (your last attack dmg or 1.0× N) / Ambition's Toll (1.3× N)
Phase 2: Sisyphus Crush (2.0× N) / Void Gaze (0.8× N + drain 30% MAX_AP)

14. NEMESIS (OVERWORLD ANTAGONIST)
- Tracks 7 attributes, gaining 70% of total possible daily attribute points (as if completed all dailies ×0.7) plus pending to‑do gains (70% of attribute points from uncompleted to‑dos with deadline ≤24h).
- Attribute levels calculated same as player.
- Incantations: at check‑in, for each attribute where Nemesis leads, roll:
  50% nothing, 20% heal random normal enemy 50% HP, 20% multiply damage of random normal enemy ×1.5 for that day, 10% revive random dead normal enemy (full HP). Only affects normal enemies.

15. BUFFS (21 Permanent, Stackable)
1. Sharp Edge: +10% AP‑to‑damagea
2. Critical Precision: +5% crit
3. Overkill: Overkill can trigger regardless of the 60% HP threshold (always splits excess).
4. Bloodlust: kill restores 5 HP
5. Fury: after taking dmg, +5% maxpotentialap
6. Iron Skin: -5 enemy dmg
7. Regeneration: +5 HP daily
8. Resilience: survive lethal hit once/stage
9. Thorns: enemies take 2 dmg on attack
10. Barrier: 10 HP shield daily
11. Efficiency: mana cost -15%
12. Greed: +20% gold
13. Tasker’s Boon: multiply all todo rewards by 1.5× 
14. Quick Learner: base task rewards are treated as one difficulty tier higher (Easy→Medium→Hard→Ultra; Ultra stays Ultra). Affects AP, Gold, Diamonds, Attribute Points.
15. Pacifist: missed dailies 50% less dmg
16. Echo Strike: every 3rd AP double
17. Scavenger: enemies drop 5 gold
18. Vampiric Touch: 10% lifesteal
19. Lightning Speed: each perfect day permanently increases MAX_AP by +10% (multiplicative).
20. Phoenix: revive 50% HP once/run
21. Nemesis Bane: Nemesis gains 50% attr

16. WEAPONS & SHOP
- Two‑weapon limit (three for Ranger). Switch freely. Damage type chosen on acquisition.
- AP cost scaling: actual cost = round(base_cost × S), S = max(0.3, min(2.0, playerMAX_AP/350)).
- Kill Tags (Weapon Mastery): each weapon tracks kills. Every 5 kills grants 1 Kill Tag (Ranger every 3 kills). Tags are weapon‑specific.
- Smith upgrades: spend 5 Kill Tags per upgrade, choose one:
    +1% crit chance
    +0.1× damage multiplier
    +5% MAX_AP flat damage (added after all multiplication)
  Upgrades are permanent for that weapon until discarded.
- Shop appears on 2nd and 4th cleared level of each stage. Split: Smith (weapons) and Consumable Shelf.
- Weapon prices: multiple of max gold (e.g., ×3). Max gold = total gold from a perfect day of all dailies.

BASIC WEAPONS (6)
Type        Weapon         Base AP  Dmg Mult  Crit%  Price (×max gold)  Special
Standard    Rusty Sword     30       1.0×       5%    –                  Universal starter.
Heavy       Great Hammer    55       1.8×       5%    3                  –
Light       Dagger          22       0.6×      18%    3                  –
AoE         Bomb            55       0.3×       8%    4                  Hits ALL enemies.
Shield      Buckler         35       0.4×       5%    3                  Multiplies damage by 0.8x
Special     Grimoire        40       1.1×      10%    3                  Gain 20 mana when you kill an enemy.

EXPANDED WEAPONS (10 more)
Type        Weapon           Base AP  Dmg Mult  Crit%  Price  Special
Light/Leg   Vampire Dagger    38       0.7×      28%    5      +30 HP when you kill an enemy.
Heavy/AoE   Bazooka           65       2.8×       0%    6      Hits target + 2 adjacent enemies in the circle.
Light       Uzi               12       2.0×       8%    4      –
Heavy/Leg   Thunder Hammer   100       1.5×      15%    7      Stuns enemy on crit (skips its next attack).
Special     Lazer             50       0.8×      20%    5      +40 mana on critical hit.
Special/AoE Vine Spell        45       0.5×       8%    5      Repeats the same damage next day for free.
Legendary   Death Spell      300        ∞ (instakill) –  8      Kills enemy at ≤30% HP instantly.
Heavy       Heavy Hammer      55       2.2×      15%    5      –
Light/Spec  Echo Bow          35       1.0×      10%    5      Every 3rd attack you make in a day deals double damage.
Shield/Leg  Aegis             40       0.3×       5%    6      Reduces all incoming damage by 5. Heal 10 HP at the start of each day.

17. CONSUMABLES
- Satchel: 5 types max, up to 5 copies each.
- Defensive (×0.3 max gold): Shield (-10% dmg 1 day), Mega Instinctor (+20% dodge 1 day).
- Offensive (×0.4 max gold): Rage Tonic (next 3 attacks +5% dmg), Elemental Grease (enemy weaknesses +3%), Lightning Rod (next crit hits random enemy too), Gorillaz Brute Juice (Brute passive for 1 day), Catalyzer (next 3 attacks ignore resistance).
- Others (×5 max gold): Prayer (negate next 5 incantations), Rift (skip current level, no rewards), Echo (duplicate one buff for 1 day).
- Shop offer: 2 Defensive, 2 Offensive, 20% chance extra Others slot.

18. DEATH & VICTORY
- Death Defiance: once per run. When HP hits 0 at check‑in, if unused, immediately revive to 1 HP and mark the defiance as spent. If already spent, permadeath. Show a HUD badge for Ready / Active / Used state.
- Death screen: skull icon, run stats, choose new class or quit.
- Victory after defeating Nemesis; game resets.

19. STREAK DAMAGE BONUS
- Every perfect day (all dailies completed) permanently adds +1% multiplicative damage bonus. Resets on permadeath. Displayed on top bar.

20. PLANNER INTEGRATION (MAIN GAME SIDE)
- Planner is a separate page (`planner.html`) with its own localStorage key `'nemesis_planner_data'`.
- Planner tasks do NOT count toward MAX_AP.
- Quick Planner: text input (calendar button); strict format. Rejected batches show error and correct format.
- Default Day Task button (appears in main game’s daily list, golden glow when available): simulates completion of all planner tasks for that day, awarding only the **attribute points** they would provide (no AP, gold, diamonds). This uses the planner’s task list for the current date.
- At check‑in, the main game collects **pending planner rewards**: diamonds and gold that were earned by completing tasks in the planner page (see Planner App Specification below). This is step 6 of the check‑in sequence.
- Cross‑tab sync: planner page listens to `storage` event to update live when main game claims rewards.

============================================================
PLANNER SPECIFICATION (FULL)
============================================================

Data & Storage
- Uses its own localStorage key: `'nemesis_planner_data'`.
- All planner data (tasks, notes, background presets, pending rewards) stored per date.

Layout & Aesthetic
- Dark pixel‑art theme matching the main game: font 'Press Start 2P', color palette, scanline overlay.
- Top bar (20% screen height):
    - Home button (🏠) redirecting to the main game (index.html).
    - Three mini reward bars: Diamonds, Gold (NO Attribute points). Numeric labels showing today’s pending rewards.
    - Large date display (DD/MM/YY) and smaller “Today · [day of week]” label.
    - Reset pending button (↺) – clears today’s earned rewards and un‑completes all tasks (they reappear).
    - Calendar toggle button (📅) to open configuration popup.
- Stage area (bottom 80%):
    - Smooth black‑to‑void gradient background.
    - All task shapes appear here as draggable elements.
    - A floating note button (📝) in the lower‑right corner.
-quick add:  in the config popup. Add a text area. This turns a line and automatically adds tasks. If it doesnt follow a format, return an error
Format
DD/MM/YY
E/M/H/U - STR/INT/DISC/CREA/SOC/CAP/RESP - task name;

For example
20/5/2026 
M - str - work out;
E - int - read book;
21/5/2026
U - str - run;
E - resp - buy groceries;

It automatically adds those tasks with the difficulty, attribute, and name on that date

Task Shapes (Planner Tasks)
- Tasks are added via the calendar popup:
    - Select any date with a date input.
    - View list of existing tasks for that date (with delete buttons).
    - “Add Task” form: enter name, choose difficulty (Easy/Medium/Hard/Ultra), choose attribute (STR/INT/DISC/CREA/SOC/CAP/RESP).
- Each task appears as a draggable shape on the stage:
    Easy → blue circle
    Medium → yellow triangle (clip‑path)
    Hard → red square
    Ultra → purple octagon (clip‑path)
- Shapes are randomly positioned the first time, but can be dragged; new positions saved persistently (x, y).
- Clicking (not dragging) a shape completes it:
    - Shape explodes with a small animation (scale up + fade out).
    - Rewards (diamonds, Gold) added to the pending rewards for that date.
        Easy: 1 Diamond, 0 Gold
        Medium: 2 Diamonds, 5 Gold
        Hard: 3 Diamonds, 10 Gold
        Ultra: 4 Diamonds, 20 Gold
    - Shape is removed from the stage (completed tasks are hidden).
- Completed tasks remain in data (visible in calendar popup with ✅).
- The reset pending button (↺) sets today’s pending rewards to zero and un‑completes all tasks for that date (they reappear on stage).
- Planner tasks do NOT affect the main game’s difficulty scaling.

Background Presets
- Configurable per date via the calendar popup.
- Options:
    None (Regular) – only gradient.
    Thin Grid – subtle white grid (SVG, 30px spacing).
    Vertical Bars – adjustable number of vertical white lines (SVG, 2‑20 bars).
- Preset selection saved per date and applied instantly.

Sticky Notes
- Floating Add Note button (📝) creates a new sticky note.
- Notes can be:
    - Dragged to any position (saved).
    - Resized by dragging bottom‑right corner handle (width/height saved).
    - Deleted via ✖ button.
    - Color‑changed via 🎨 button (palette of 8 preset colors).
    - Edited by double‑clicking text (contentEditable), changes saved on blur.
- Notes start auto‑sized (fit to text) until manually resized; after manual resize, they lock to that size.
- All note properties persist per date.

Cross‑Tab Sync
- Listens to `storage` event so that if the main app modifies planner data (e.g., after check‑in claiming rewards), the planner page updates automatically.

============================================================
END PLANNER APP SPECIFICATION
============================================================

21. LAYOUT & AESTHETIC (MAIN GAME)
- Pixel‑art dark fantasy, font 'Press Start 2P', CRT scanlines.
- Orbiting Satellite layout:
    Top bar: Home button, Reset Pending (removed in favor of restart in pause menu), resource bars, weapon icons, Pause button, date, Planner link, Check‑in button.
    Enemy circle (central canvas), spinner, Attack/Skill/Satchel/Dodge action buttons at 8‑4 o’clock.
    Pull‑tabs on left (Daily) and right (To‑Do) slide out scrollable panels.
    Bottom buttons: Buffs, Attributes.
Enemy circle does not change when enemy dies, enemy is just greyed out
- All popups (Buffs, Attributes, Shop, Smith Upgrade, Satchel, Buff Selection, Dialogue, Death, Victory, Pause) follow dark purple card design with gold titles and pixel borders.
- Pause menu includes: Resume, Settings, View Attributes, Restart Game (with confirmation), Quit to Menu.

22. JUICE IMPLEMENTATION
- Animations.js provides: particle systems, screen shake, floating damage numbers, combo text, screen flash, elastic popup scaling.
-Floating damage number systems:Pops up a specific colored number/text above the element with random rotation(minimal) and random distance(minimal
- Specific triggers:
    HP bar pulses red <25%, green shimmer on heal.
    Mana bar glows blue when full.
    AP bar crackles golden on earn, dims when empty.
    Diamond counter sparkles on earn.
    Spinner leaves red square trail (yellow circle when dodging).
    Enemy death: rainbow particle burst; elite death larger + consumable drop arc.
    Combo indicator scales up, shatters on miss.
    Boss transitions: screen shake, fade to white, new sprite.
    Dialogue typewriter effect.
    Sound cues for all major actions (tick, swing, hit, crit, death, etc.).

============================================================
PART II: SYSTEMATIC BUILD WORKFLOW
============================================================

File Structure
/nemesis3/
  index.html               – main game shell
  planner.html             – planner page (built later, but specification complete)
  config.js                – ALL game constants & balancing numbers
  css/
    style.css              – global pixel‑art theme, layout, popups
  js/
    core.js                – GameState, save/load, deepMerge, event bus
    player.js              – player resources, classes, leveling
    tasks.js               – dailies, to‑dos, subtasks, blood oath, streaks
    combat.js              – AP scaling, weapon attacks, damage formula, combo
    enemy.js               – enemy archetypes, HP scaling, attack resolution
    stage.js               – stage/level generation, formations
    ui.js                  – HUD, enemy circle, spinner, buttons, pull‑tabs
    popups.js              – buffs, attributes, shop, satchel, dialogue, etc.
    animations.js          – particle system, screen shake, flashes, popups
    shop.js                – weapon buying, consumables, upgrades
    planner.js             – planner page logic (separate)
  assets/
    images/ (placeholder.png, etc.)
    sounds/ (placeholder.mp3)

Unified Architecture (core.js)
- Single GameState object containing all runtime data.
- EventBus (EventTarget) for decoupled communication.
- save/load using localStorage key 'nemesis3_data'.
- deepMerge for config overrides.

Placeholder Strategy
- All image references use getAsset(type, id) returning placeholder.
- Real sprites later only require updating this function.

Implementation Order (Initial Build: Stages 1‑2, 4 classes, 6 basic weapons)
1. config.js
2. core.js
3. animations.js
4. player.js
5. tasks.js
6. enemy.js
7. stage.js
8. combat.js
9. ui.js
10. popups.js
11. shop.js
12. index.html (glue everything)
13. planner.html (later)

Testing
- Console commands to inspect GameState, simulate events, trigger animations, etc.


============================================================
UI LAYOUTS (ASCII)
============================================================

Main Game Screen (Orbiting Satellite)
┌──────────────────────────────────────────────────────┐
│ ⚔️Sword                                    🔨Hammer     │
│ HP:150  Mana:200  AP:350  💰120  💎5                 │
│ ⏸️ Pause                         📅 Wed 15            │
├──────────────────────────────────────────────────────┤
│                                                      │
│           ●     ●     ●     ●     ●                  │
│        ●                            ●               │
│      ●          ENEMY CIRCLE           ●             │
│        ●                            ●               │
│           ●     ●     ●     ●     ●                  │
│                                                      │
│  ⚔️ Attack (35 AP)               ✨ Skill (70💧)        │
│                                                      │
│               🎒 Satchel    Player icon                │
│                                                      │
│  ║║║║║                                           ║║║║║ │
│  Dailies tab                                     To‑Dos│
└──────────────────────────────────────────────────────┘

Buffs Popup
┌──────────────────────────────────────────────────────┐
│  BUFFS (active)                                ✕     │
├──────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │ 🛡️        │  │ 💀        │  │ ⚡        │           │
│  │ Iron Skin│  │ Critical │  │ Lightning│           │
│  │ -1 dmg   │  │ +5% crit │  │ Speed    │           │
│  │          │  │          │  │ +20 AP   │           │
│  └──────────┘  └──────────┘  └──────────┘           │
│  ┌──────────┐  ┌──────────┐                         │
│  │ 🔥        │  │ 🌿        │                         │
│  │ Fury     │  │ Regenerat│                         │
│  │ +5 AP    │  │ +5 HP/day│                         │
│  └──────────┘  └──────────┘                         │
│  (scrollable)                                        │
└──────────────────────────────────────────────────────┘

Attributes Popup
┌──────────────────────────────────────────────────────┐
│  ATTRIBUTES                                    ✕     │
├──────────────────────────────────────────────────────┤
│  STR  12 │████████░░░░░░│  9                         │
│  INT   8 │██████░░░░░░░░│  7                         │
│  DISC  5 │█████░░░░░░░░░│ 10  ⚠                       │
│  CREA 11 │███████████░░░│  4                         │
│  SOC  10 │██████████░░░░│ 15  ⚠                       │
│  CAP  14 │██████████████│  2                         │
│  RESP  9 │█████████░░░░░│ 13  ⚠                       │
│                                                      │
│  ⚠ Nemesis leads in 3 attributes                    │
│  Incantations possible: 3                            │
└──────────────────────────────────────────────────────┘

Shop (split)
┌──────────────────────────────────────────────────────┐
│  🛒 SHOP                                      ✕       │
│  Gold: 💰 120                                         │
├──────────────────────┬───────────────────────────────┤
│  SMITH (Weapons)     │  CONSUMABLES (Shelf)           │
│                      │                                │
│  ┌────────────────┐  │  🛡️ Shield ×2  [Buy]            │
│  │ Thunder Hammer │  │  🛡️ Mega Inst. ×1 [Buy]         │
│  │ 1.5× 15% crit  │  │  ⚡ Rage Tonic ×3 [Buy]        │
│  │ AP:100 Price:70 │  │  🧪 Catalyzer ×1 [Buy]         │
│  │ [Choose Type ▾] │  │  (others scrollable)          │
│  │ [Buy]           │  │                                │
│  └────────────────┘  │                                │
│  (if full, discard   │                                │
│   popup)             │                                │
└──────────────────────┴───────────────────────────────┘

Smith Upgrade Popup (triggered from Shop)
┌──────────────────────────────────────────────────────┐
│  UPGRADE WEAPON                                      │
│  Kill Tags: 3                                        │
│  ┌──────────────────────┐   ┌──────────────────────┐ │
│  │ ⚔️ Sword (main)        │   │ 🔨 Hammer             │ │
│  │ Crit:8%  Mult:1.2×    │   │ Crit:9%  Mult:1.5×    │ │
│  │ [Upgrade]             │   │ [Upgrade]             │ │
│  └──────────────────────┘   └──────────────────────┘ │
│ (Ranger shows 3 weapons)                              │
└──────────────────────────────────────────────────────┘

Buff Selection Popup
┌──────────────────────────────────────────────────────┐
│  CHOOSE YOUR BUFF                       (Stage 3)     │
│  Pick one of three permanent upgrades.    ✕           │
├──────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────┐ │
│  │ ┌────────┐                                       │ │
│  │ │ Shield │  🛡️ Iron Skin                         │ │
│  │ │ Icon   │  Reduce all enemy damage by 1.        │ │
│  │ └────────┘                           [Select]   │ │
│  └──────────────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────────────┐ │
│  │ ┌────────┐                                       │ │
│  │ │ Dagger │  💀 Critical Precision                │ │
│  │ │ Icon   │  +5% critical hit chance.             │ │
│  │ └────────┘                           [Select]   │ │
│  └──────────────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────────────┐ │
│  │ ┌────────┐                                       │ │
│  │ │ Fire   │  🔥 Fury                              │ │
│  │ │ Icon   │  After taking damage, +5 AP for day.  │ │
│  │ └────────┘                           [Select]   │ │
│  └──────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘

Death Screen
┌──────────────────────────────────────────────────────┐
│  ☠️ YOU HAVE FALLEN                                  │
│  The Nemesis grows stronger...                       │
│  Run Summary:                                        │
│  ─────────────────────────                           │
│  Class: Knight    Stage reached: 3    Level: 14      │
│  Enemies defeated: 57     Bosses slain: 2            │
│  Gold earned: 1,340      Buffs collected: 4          │
│  "Your ambition crumbled to dust."                   │
│  ─────────────────────────                           │
│  [Choose New Class]          [Quit to Menu]          │
└──────────────────────────────────────────────────────┘

Victory Screen
┌──────────────────────────────────────────────────────┐
│  ✨ VICTORY!                                          │
│  You have toppled the Nemesis.                       │
│  The cycle is broken… for now.                       │
│  Final Stats:                                        │
│  ─────────────────────────                           │
│  Class: Rogue    Total days played: 42               │
│  Tasks completed: 318    Gold accumulated: 2,540     │
│  Buffs collected: 7                                  │
│  "Your ambition became a light in the void."         │
│  ─────────────────────────                           │
│  [New Run]                 [Main Menu]               │
└──────────────────────────────────────────────────────┘

Pause Menu (overlay)
┌──────────────────────────────────────────────────────┐
│  ⏸️ GAME PAUSED                                      │
│  All timers, regen, and missed‑check‑in death are     │
│  frozen while paused.                                │
│  ┌──────────────────────┐                            │
│  │ ▶️ Resume             │                            │
│  └──────────────────────┘                            │
│  ┌──────────────────────┐                            │
│  │ ⚙️ Settings           │                            │
│  └──────────────────────┘                            │
│  ┌──────────────────────┐                            │
│  │ 📋 View Attributes   │                            │
│  └──────────────────────┘                            │
│  ┌──────────────────────┐                            │
│  │ 🚪 Quit to Menu      │                            │
│  └──────────────────────┘                            │
│  (Tap outside to resume)                             │
└──────────────────────────────────────────────────────┘

Satchel Popup
┌──────────────────────────────────────────────────────┐
│  🎒 SATCHEL (Consumables)                       ✕    │
├──────────────────────────────────────────────────────┤
│  🛡️ Shield           ×2    [Use]                     │
│  🔥 Rage Tonic       ×3    [Use]                     │
│  🧪 Catalyzer        ×1    [Use]                     │
│  🌀 Echo             ×1    [Use]                     │
│  (scrollable)                                        │
└──────────────────────────────────────────────────────┘

Dialogue Popup (generic event)
┌──────────────────────────────────────────────────────┐
│  ┌──────────┐                                        │
│  │          │  "You feel a chill as the cave         │
│  │  Enemy   │   walls seem to close in..."           │
│  │  Image   │                                        │
│  │          │                      [Continue]        │
│  └──────────┘                                        │
└──────────────────────────────────────────────────────┘



============================================================
IMPLEMENTATION NOTES — VERIFIED FROM CODE (v5.0)
============================================================
- Planner implementation:
  - The planner is implemented inline in [planner.html](planner.html) as `PlannerApp` (not in `JS/planner.js`, which is currently empty).
  - Features present in code: drag & drop task shapes (pointer events with pointer capture), seeded deterministic task placement (`seedTaskPosition()`), quick‑add parsing supporting both `DD/MM/YYYY` and ISO `YYYY‑MM‑DD`, config modal (`configModal`), logs modal (`logsModal`), move tasks between dates, per‑date `pendingRewards` (diamonds, gold), background presets, and simple sticky notes (draggable, contentEditable, delete).
  - Planner storage: uses localStorage key `'nemesis_planner_data'` and emits a `storage` event (cross‑tab sync).

- UI & Spinner specifics (JS/ui.js):
  - Spinner timing: default spinner speed ~1000ms; dodge mode forces fast spin (333ms); holding an attack slows the spinner (approx 1600ms) to indicate a charge/aim window. UI exposes `UIManager.setSpinnerDuration()` to override speed.
  - Spinner targeting reads the CSS transform (matrix or rotate) and computes the spinner angle; the alignment tolerance is ~18 degrees to snap to an enemy slot. If no living enemy is aligned it will prefer the nearest dead slot to preserve misses.
  - Attack queueing: if an attack is attempted while `attackInProgress` is true the code queues the attack (`state.combatState.queuedAttackCount` and `.queuedAttackTargetId`) and replays it after the current attack finishes.
  - Preview → execute flow: the UI calls `CombatManager.previewAttackImpact()` to validate an attack (and uses `impactDelayMs`) before calling `CombatManager.attemptAttack()`; this allows early feedback (Not enough power / Miss) without consuming animations.
  - Enemy cards: clicking an enemy card opens a mutator popup (mutator inspection) — attacks are still resolved with the spinner/attack button.
  - Weapon strip: shows equipped weapons, active weapon switching, and an upgrade button that opens the weapon upgrade popup.

- Dodge behavior:
  - Dodge is a hold/release interaction with pointer capture; releasing spends `Math.ceil(MAX_AP * config.dodgeCost)` AP (config.dodgeCost = 0.3) and sets `state.combatState.dodgeTarget` to the spinner‑aligned enemy id(s).
  - While holding, the spinner gets a `dodge-active` class and the spinner speed is reduced (fast) to help aim; releasing without a valid target shows "Dodge Miss".

- Pet & Pet targeting:
  - Pet attacks occur at check‑in as implemented; the UI persists today's pet target in `playerState.petTarget = { enemyId, date }` so a pet badge is shown for the rest of the day. `UIManager.showPetIcon()` animates a short pet icon above the enemy when pet attacks.

- Mutators & UI:
  - Mutator metadata (icons, label, description, color) is defined in `UIManager.MUTATOR_META` and used to render clickable mutator badges on enemy cards.
  - `ENEMY_MUTATED` events trigger short toasts, floating anchored text, and badge animations; `PopupsManager` is used to show mutator details.
  - A developer helper `window.debugAddMutator(enemyId, mutator)` exists for quick testing.

- Shop & long‑press item details:
  - The shop overlay (`shopOverlay` / `shopPanel`) is implemented in `JS/ui.js`. Items support long‑press details (configurable via `config.shopLongPressMs`, default 450ms). Purchases call into `ShopManager` (`buyWeapon`, `buyConsumable`, `purchase`) and known failure reasons (e.g., `inventory_full`, `no_gold`) are handled with friendly messages and discard popups when needed.

- Sound & event hooks:
  - `UIManager.bindEventListeners()` wires many events to `SoundManager.play()` cues (attack/crit/hit/kill/heal/revive/coin/checkin/death/mutator). `SoundManager.init()` is called at startup using `state.config.soundEnabled` and `soundVolume`.

- Autosave & skipped‑day enforcement:
  - The main page (`index.html`) autosaves via `state.save()` every 30 seconds.
  - Missed‑day detection runs every minute and uses the saved `systemState.lastCheckInTime`. If `daysElapsed > 1` (more than 24 hours since last check‑in) the code emits `EVENTS.SKIPPED_DAY_DEATH` and shows the death screen immediately.

- Check‑in visuals:
  - `UIManager.playCheckInSequence()` animates every retaliation step with anchored floating numbers, shows any mutator gains on affected enemies, and applies a scaled screen shake when missed dailies are present. There are pacing delays (boss vs normal steps) so the sequence feels weighted.

- Animations & anchoring:
  - Floating damage/numbers support anchored display to enemy cards (`FloatingDamageNumber.showAnchored`) and fall back to screen coordinates.
  - Many micro‑triggers exist: HP <25% pulse, Mana full shimmer, AP crackle, combo animations, enemy death bursts, and boss transition flashes (see `JS/animations.js` and usages in `JS/ui.js`).

- Combat & preview helpers:
  - UI uses a small `WeaponAttack` preview abstraction (`new WeaponAttack(weaponName).getScaledApCost()`) to display the expected AP cost for the active weapon prior to attempting an attack.

- Run completion graph:
  - The HUD's run completion chart uses the last ~20 entries from `state.dailiesState.history` (filtered by `state.systemState.gameStartTime`) and renders a small SVG line/fill graph (see `UIManager.updateRunCompletionGraph()`).

- Developer utilities:
  - `window.debugAddMutator(enemyId, mutator)` — quick mutator apply + save + `ENEMY_MUTATED` emit.

- File locations of authoritative implementations:
  - UI and HUD: [JS/ui.js](JS/ui.js#L1)
  - Balance & tuning constants: [config.js](config.js#L1)
  - Planner app (inline): [planner.html](planner.html#L1)
  - Game shell / autosave / skipped day check: [index.html](index.html#L1)
  - Animations & floating numbers: [JS/animations.js](JS/animations.js#L1)
  - Shop logic calls: [JS/shop.js](JS/shop.js#L1) (offers + pricing hooks)

These items above are direct, verified behaviors taken from the current codebase and should be considered canonical for v5.0. If you want, I can now:
- (A) Merge these notes into the specific sections of this blueprint inline (expand each relevant section with the exact code numbers and function references), or
- (B) Leave this implementation notes section as the canonical diff / sync summary and run a follow‑up pass to splice selected bits into the main sections.

============================================================
END OF COMPLETE BLUEPRINT v5.0
============================================================

