# Nemesis Roguelike — Design Specification: Special Events & Talismans

## 📋 System Overview
The **Special Events** system adds daily rotation challenges and build variety to Nemesis.
Each day, at the check-in and daily task reset, a special event is randomly determined. Players complete specific real-life challenges (completing their daily tasks) to earn unique in-game rewards that alter their run.

---

## ⚙️ Daily Rotation & Odds
Every day upon check-in/reset:
- **30% Chance**: No Event (banner is hidden/muted).
- **70% Chance**: A Special Event occurs, split equally:
  - **Shrine** (23.33% chance)
  - **Statue** (23.33% chance)
  - **Sacred Tree** (23.33% chance)

All event benefits, stat buffs, talismans, and borrowed skills are **run-scoped** and will reset when a new run begins.

---

## ⛩️ Shrine Event
Complete a perfect day to receive divine power from other classes.
- **Challenge**: Complete 100% of the day's active daily tasks.
- **Reward**: Choose 1 of 3 randomly offered skills from classes other than the player's current class.
- **Mechanics**:
  - The chosen skill is **permanent for the run** and takes effect alongside your starting skill.
  - Unlimited stacking: Winning multiple Shrine events allows the player to accumulate multiple borrowed skills.
  - Borrowed skills use the same mana cost as their original class.
- **Visuals**: Banner glows **Gold/Purple (Divine)**.

---

## 🗿 Statue Event
Complete the dailies you neglect the most to earn a powerful artifact.
- **Challenge**: Complete the **3 historically lowest-completion-rate dailies** during the current run.
- **Visual Indicators**: The 3 targeted dailies are marked with a distinct visual indicator on their task cards in the task list.
- **Reward**: A random Talisman from the global drop pool.
- **Visuals**: Banner glows **Teal/Stone-Grey**.

---

## 🌳 Sacred Tree Event
Perform a specific task to grow your spiritual essence.
- **Challenge**: Complete **one specific daily task** randomly chosen at the start of the day.
- **Visual Indicators**: The selected daily task is marked with a distinct visual highlight on its task card in the task list, and its name is displayed on the banner.
- **Reward**: **+20 Max HP** and **+30 Max Mana** permanently added to the player's base stats for the run.
- **Visuals**: Banner glows **Green**.

---

## 🏺 Talisman System
Talismans are unique items that grant powerful passive combat benefits and synergies.
- **Equip Limit**: Players can equip up to **2 Talismans** at any given time.
- **Swap / Discard UI**: If the player receives a 3rd Talisman, a popup (similar to the lootbox weapon system) forces them to either discard the new Talisman or swap it with one of their currently equipped Talismans.
- **Drop Pool**: Flat drop rate from the Statue event (no rarity tiers).

### 🏺 Final Talisman Roster

| Talisman Name | Icon | Combat / Build Effect | Key Synergies |
|---|---|---|---|
| **Bloodpact Seal** | 🩸 | Each consecutive attack in a streak adds +5% max AP damage. Unlimited stacking. Resets on taking damage. | Rogue, multi-hit weapons, no-hit speedruns |
| **Starweave** | ✨ | After using any active skill, your next **2 attacks** are guaranteed critical hits. | Rogue (Phantom Blow), Shrine multi-skill builds |
| **Mana Siphon** | 💧 | Every 50 mana spent permanently increases your maximum mana by +5 (capped at +100). | Wizard, high-mana skill spammers |
| **Wrathstone** | 🔴 | Being at or below 30% HP grants +40% damage bonus. | Brute (Berserk), Madman, high-risk builds |
| **Echo Shard** | 🔔 | After using any consumable item, your next attack is echoed at 100% damage for free. | Alchemist, Ranger (multi-weapon setups) |
| **Verdant Heart** | 🌿 | Each perfect daily streak day permanently adds +3 Max HP and +5 Max Mana. | Druid, tank/sustain builds |
| **Predator's Eye** | 👁️ | Critical hits against enemies below 50% HP deal an extra ×1.5 bonus damage. | Rogue (high crit chance), Execution-heavy builds |
| **Titan's Mantle** | 🏔️ | Damage reduction stacks from all sources (buffs, class passives, shields) are doubled. | Knight (Sturdy passive), Juggernaut (Fortress) |
| **Void Lens** | 🌀 | Each time an enemy resists your attack, your next hit against that enemy deals +100% bonus damage. | Wizard (exploiting weakness/resist), Alchemist |

---

## 🖥️ UI & Banner Design
- **Movable Banner**: A compact, floating banner on the main game HUD (matching the drag-to-reposition system used for the HUD widgets and satchel).
- **Banner Information**: Shows the event type, a brief description of the daily challenge, and a summary of the reward.
- **Manual Claiming**: Once the event's challenge condition is met, a **CLAIM** button appears on the banner for the player to manually claim their reward.
- **Aesthetics**: Each banner uses high-contrast gradients and glowing box-shadows reflecting the event's identity.
