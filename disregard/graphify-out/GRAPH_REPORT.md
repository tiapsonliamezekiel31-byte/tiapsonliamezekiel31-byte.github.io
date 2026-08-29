# Graph Report - nemesis3  (2026-08-21)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 745 nodes · 1645 edges · 48 communities (24 shown, 24 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9c07994e`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- GameState
- TaskManager
- PopupsManager
- TycoonEngine
- UIManager
- animations.js
- WeaponHitAnimation
- .shake
- PlayerManager
- StageManager
- MultiplayerManager
- .attemptAttack
- .toggle
- EnemyManager
- update_enemies.js
- ensureAnimationStyles
- .flash
- SoundManager
- Enemy
- CombatManager
- ShopManager
- .play
- check_braces.js
- TargetingSystem
- .show
- ParticleSystem
- RetroHealAnimation
- .levelUp
- WebAudioTickSynth
- config.js
- HpBarAnimation
- RetroDodgeAnimation
- RetroRagePulseAnimation
- RetroSpectralSwordsAnimation
- sw.js

## God Nodes (most connected - your core abstractions)
1. `UIManager` - 189 edges
2. `TaskManager` - 61 edges
3. `GameState` - 53 edges
4. `PopupsManager` - 51 edges
5. `TycoonEngine` - 43 edges
6. `PlayerManager` - 32 edges
7. `WeaponHitAnimation` - 25 edges
8. `StageManager` - 21 edges
9. `MultiplayerManager` - 19 edges
10. `performCheckIn()` - 18 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Import Cycles
- None detected.

## Communities (48 total, 24 thin omitted)

### Community 0 - "GameState"
Cohesion: 0.05
Nodes (14): checkParryChallengeCompletion(), createBombEnemy(), evaluateParrySuccess(), EventBus, EVENTS, GameState, generateDailyChallenge(), getGameState() (+6 more)

### Community 7 - "animations.js"
Cohesion: 0.08
Nodes (17): AnimationRuntime, _colorCache, ConsumableDropAnimation, DodgeTetherAnimation, hslToCss(), resolveCssColorToRgb(), RetroAcidSplashAnimation, RetroHitAnimation (+9 more)

### Community 10 - ".shake"
Cohesion: 0.09
Nodes (11): EnemyDeathAnimation, RetroBloodTideAnimation, RetroBossEntranceAnimation, RetroEarthShatterAnimation, RetroEnergyBeamAnimation, RetroGlitchInvertAnimation, RetroHellfireAnimation, RetroHolyBeamAnimation (+3 more)

### Community 16 - ".attemptAttack"
Cohesion: 0.18
Nodes (3): resolveWeaponResistanceMultiplier(), resolveWeaponWeaknessMultiplier(), WeaponAttack

### Community 17 - ".toggle"
Cohesion: 0.20
Nodes (3): HUDMinimizer, TODO: Replace with actual asset system, StatsHUD

### Community 19 - "update_enemies.js"
Cohesion: 0.12
Nodes (15): bossesObj, configData, configPath, elements, enemiesObj, enemyNames, formationsObj, fs (+7 more)

### Community 20 - "ensureAnimationStyles"
Cohesion: 0.29
Nodes (5): ComboAnimation, ensureAnimationStyles(), MeterAnimation, PopupAnimation, restartAnimationClass()

### Community 21 - ".flash"
Cohesion: 0.20
Nodes (5): RetroComboFinisherAnimation, RetroCritSlashAnimation, RetroTaskCompleteAnimation, RetroVoidBlackHoleAnimation, ScreenEffects

### Community 23 - "Enemy"
Cohesion: 0.25
Nodes (3): Enemy, ENEMY_DATABASE, LEGACY_ENEMY_DATABASE

### Community 27 - ".play"
Cohesion: 0.33
Nodes (3): RetroLavaSpitAnimation, RetroMagicCircleAnimation, RetroOrbBurstAnimation

### Community 28 - "check_braces.js"
Cohesion: 0.40
Nodes (4): content, fs, lines, stack

## Knowledge Gaps
- **28 isolated node(s):** `EVENTS`, `USER_DATA_STORAGE_KEYS`, `FORMATIONS`, `bossesObj`, `configData` (+23 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **24 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `UIManager` connect `UIManager` to `.bindDailyBoardInteractions`, `.bindEventListeners`, `.toggleTaskPanel`, `._doRefreshGameUI`, `.renderEnemies`, `.toggle`, `.setupFocusTimer`?**
  _High betweenness centrality (0.286) - this node is a cross-community bridge._
- **Why does `TaskManager` connect `TaskManager` to `ShopManager`?**
  _High betweenness centrality (0.115) - this node is a cross-community bridge._
- **Why does `PopupsManager` connect `PopupsManager` to `.attemptAttack`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **What connects `EVENTS`, `USER_DATA_STORAGE_KEYS`, `FORMATIONS` to the rest of the system?**
  _28 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `GameState` be split into smaller, more focused modules?**
  _Cohesion score 0.0532724505327245 - nodes in this community are weakly interconnected._
- **Should `TaskManager` be split into smaller, more focused modules?**
  _Cohesion score 0.06120218579234973 - nodes in this community are weakly interconnected._
- **Should `PopupsManager` be split into smaller, more focused modules?**
  _Cohesion score 0.09853249475890985 - nodes in this community are weakly interconnected._