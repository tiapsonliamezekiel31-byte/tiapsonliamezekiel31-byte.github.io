import os
import re
import random
import json

base_dir = os.path.dirname(os.path.abspath(__file__))
config_path = os.path.join(base_dir, 'JS', 'config.js')
stage_path = os.path.join(base_dir, 'JS', 'stage.js')
ui_path = os.path.join(base_dir, 'JS', 'ui.js')

themes = [
    {'stage': 1, 'name': 'Forest', 'icon': '🌲', 'type': 'nature', 'bosses': ['Ancient Treant', 'Verdant Warden']},
    {'stage': 2, 'name': 'Volcano', 'icon': '🌋', 'type': 'ninja', 'bosses': ['Ash Master', 'Lava Shinobi']},
    {'stage': 3, 'name': 'Pyramids', 'icon': '🏜️', 'type': 'guardian', 'bosses': ['Sun Priest', 'Tomb Sentinel']},
    {'stage': 4, 'name': 'Marchers', 'icon': '🚶‍♂️', 'type': 'empire', 'bosses': ['Empire Warlord', 'Nomad King']},
    {'stage': 5, 'name': 'Crimson Cave', 'icon': '🕳️', 'type': 'dark', 'bosses': ['Crimson Fiend', 'Blood Seeker']},
    {'stage': 6, 'name': 'Chasm', 'icon': '🕳️', 'type': 'dark', 'bosses': ['Abyss Lord', 'Void Channeler']},
    {'stage': 7, 'name': 'Swamp', 'icon': '☣️', 'type': 'plague', 'bosses': ['Venom Queen', 'Swamp Thing']},
    {'stage': 8, 'name': 'Kingdom', 'icon': '🏰', 'type': 'knight', 'bosses': ['Fate Sovereign', 'Dawn Sentinel']},
    {'stage': 9, 'name': 'Graveyard', 'icon': '🪦', 'type': 'soul', 'bosses': ['Reaper', 'Damned General']},
    {'stage': 10, 'name': 'Glacier', 'icon': '🧊', 'type': 'ice', 'bosses': ['Frost Colossus', 'Ice Monarch']},
    {'stage': 11, 'name': 'Ruins', 'icon': '🏛️', 'type': 'ancient', 'bosses': ['Ruin Golem', 'Lost King']},
    {'stage': 12, 'name': 'Church', 'icon': '⛪', 'type': 'parasite', 'bosses': ['Rot Pontiff', 'Hollow Bishop']},
    {'stage': 13, 'name': 'Lab', 'icon': '🧪', 'type': 'plague', 'bosses': ['Toxic Behemoth', 'Plague Master']},
    {'stage': 14, 'name': 'Cult', 'icon': '👁️', 'type': 'corrupt', 'bosses': ['Miasma Prophet', 'Ruin Avatar']},
    {'stage': 15, 'name': 'Dragon Isle', 'icon': '🐉', 'type': 'dragon', 'bosses': ['Fire Turtle', 'Sky Terror']},
    {'stage': 16, 'name': 'Golden Peak', 'icon': '⛰️', 'type': 'celestial', 'bosses': ['Golden Emperor', 'Peak Sentinel']},
    {'stage': 17, 'name': 'Abyssal Sea', 'icon': '🌊', 'type': 'sea', 'bosses': ['Sea Behemoth', 'Trench Leviathan']},
    {'stage': 18, 'name': 'The Void', 'icon': '🌌', 'type': 'void', 'bosses': ['Void Terror', 'Cosmic Entity']}
]

enemyNames = {
    1: ['Treant', 'Dryad', 'Wood Sprite', 'Leaf Blade', 'Thorn Beast', 'Vine Weaver', 'Forest Guardian', 'Bark Sentinel', 'Root Horror', 'Moss Brute'],
    2: ['Ash Ninja', 'Cinder Shinobi', 'Ember Assassin', 'Magma Kunoichi', 'Obsidian Rogue', 'Pyro Master', 'Scorch Saboteur', 'Lava Ronin', 'Smoke Stalker', 'Volcanic Shadow'],
    3: ['Glyph Scholar', 'Sand Mage', 'Tomb Oracle', 'Anubis Adept', 'Sun Priest', 'Crypt Mystic', 'Scarab Invoker', 'Desert Sage', 'Mirage Sorcerer', 'Sphinx Scholar'],
    4: ['Dune Legionnaire', 'Sand Strider', 'Westward Shield', 'Desert Vanguard', 'Marching Hoplite', 'Nomad Centurion', 'Sun Infantry', 'Endless Walker', 'Empire Pioneer', 'Dust Phalanx'],
    5: ['Blood Bat', 'Crimson Slime', 'Cave Stalker', 'Ruby Golem', 'Vampire Bat', 'Gore Hound', 'Scarlet Arachnid', 'Blood Mage', 'Crimson Knight', 'Flesh Weaver'],
    6: ['Void Cultist', 'Abyssal Mage', 'Shadow Caster', 'Gloom Warlock', 'Deep Summoner', 'Cave Occultist', 'Dark Adept', 'Nether Seeker', 'Hollow Channeler', 'Abyss Priest'],
    7: ['Mud Slime', 'Toxic Toad', 'Plague Fly', 'Marsh Zombie', 'Swamp Beast', 'Venom Spider', 'Mire Horror', 'Sludge Brute', 'Bog Witch', 'Rot Creeper'],
    8: ['Destiny Knight', 'Oath Paladin', 'Fate Vanguard', 'Order Templar', 'Shield of Dawn', 'Royal Lancer', 'Divine Sentinel', 'Sovereign Blade', 'Justice Bringer', 'Valor Champion'],
    9: ['Restless Soul', 'Damned Spirit', 'Purgatory Wraith', 'Escaping Phantom', 'Lost Shade', 'Ascending Ghost', 'Bound Revenant', 'Mournful Specter', 'Ethereal Wanderer', 'Tormented Soul'],
    10: ['Ice Spirit', 'Yeti Hunter', 'Yeti Mage', 'Frost Golem', 'Snow Wolf', 'Glacier Wraith', 'Winter Harpy', 'Ice Weaver', 'Blizzard Elemental', 'Frost Knight'],
    11: ['Stone Golem', 'Ruin Guardian', 'Dust Elemental', 'Cursed Armor', 'Ancient Phantom', 'Marble Brute', 'Forgotten Sentinel', 'Ruin Specter', 'Relic Defender', 'Shattered Soul'],
    12: ['Husk Acolyte', 'Parasitic Monk', 'Infested Cleric', 'Soulless Priest', 'Hollow Bishop', 'Fungal Templar', 'Spore Zealot', 'Rotting Friar', 'Tainted Deacon', 'Blighted Vicar'],
    13: ['Plague Doctor', 'Mutated Subject', 'Toxic Chemist', 'Viral Surgeon', 'Rotted Scientist', 'Biohazard Brute', 'Pestilence Nurse', 'Contaminated Medic', 'Fume Scholar', 'Blight Alchemist'],
    14: ['Corrupt Disciple', 'Rot Believer', 'Decay Zealot', 'Miasma Prophet', 'Tainted Worshipper', 'Foul Oracle', 'Spoil Initiate', 'Defiled Mystic', 'Ruin Chanter', 'Pestilent Fanatic'],
    15: ['Scale Drake', 'Flame Wyrm', 'Ember Dragon', 'Ash Hatchling', 'Sky Serpent', 'Cinder Drake', 'Blaze Wyvern', 'Soaring Behemoth', 'Inferno Dragon', 'Talon Scorch'],
    16: ['Golden Guardian', 'Peak Harpy', 'Aurelian Knight', 'Sun Elemental', 'Gilded Golem', 'Light Weaver', 'Celestial Sentinel', 'Ascended Mage', 'Brilliant Brute', 'Shining Spirit'],
    17: ['Depth Lurker', 'Trench Behemoth', 'Deep Leviathan', 'Abyssal Terror', 'Sea Goliath', 'Maelstrom Horror', 'Void Kraken', 'Ocean Colossus', 'Tsunami Beast', 'Dark Tide'],
    18: ['Void Spawn', 'Null Entity', 'Astral Horror', 'Cosmic Wraith', 'Dark Matter Brute', 'Singularity Mage', 'Eclipse Sentinel', 'Void Walker', 'Chaos Elemental', 'Nebula Phantom']
}

enemiesObj = {}
bossesObj = {}
formationsObj = {}

elements = ['Earth', 'Water', 'Fire', 'Air', 'Aether', 'Void']

for s in range(1, 19):
    # Enemies
    for name in enemyNames[s]:
        el = random.choice(elements)
        resist = random.choice(elements)
        hpMult = round(0.8 + random.random()*0.4, 1)
        dmgMult = round(0.8 + random.random()*0.4, 1)
        enemiesObj[name] = f"{{ element: '{el}', resist: '{resist} C', weak: 'None', hpMult: {hpMult}, dmgMult: {dmgMult}, attackWeights: {{ regular: 0.6, heavy: 0.2, minion: 0, heal: 0.1, bomb: 0.1 }} }}"
    
    # Bosses
    for i, boss in enumerate(themes[s-1]['bosses']):
        el = random.choice(elements)
        hpMult = round(1.5 + (s * 0.1), 1)
        bossesObj[boss] = f"{{ element: '{el}', resist: '{el} B', weak: 'None', hpMult: {hpMult}, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: {{ heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 }} }}"

minibossPool = [
    'Grave Sentinel', 'Ashen Warden', 'Rune Overseer', 'Void Preceptor',
    'Rot Apostle', 'Blight Executioner', 'Blood Harbinger', 'Czar Vanguard'
]
for mb in minibossPool:
    el = random.choice(elements)
    bossesObj[mb] = f"{{ element: '{el}', resist: '{el} B', weak: 'None', hpMult: 1.4, color: '#ff6600', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: {{ heavy: 0.25, bomb: 0.25, minion: 0.25, regular: 0.25 }} }}"

for s in range(1, 12):
    eArr = enemyNames[s]
    formationsObj[s] = {
        'A': {
            1: {'enemies': [{'name': eArr[0], 'count': '3-4'}, {'name': eArr[1], 'count': '2'}]},
            2: {'enemies': [{'name': eArr[2], 'count': '3-4'}, {'name': eArr[3], 'count': '1'}]},
            3: {'enemies': [{'name': eArr[4], 'count': '2-3'}, {'name': eArr[5], 'count': '2'}, {'name': eArr[6], 'count': '1'}]},
            4: {'enemies': [{'name': eArr[7], 'count': '3'}, {'name': eArr[8], 'count': '2'}, {'name': eArr[9], 'count': '1-2'}]},
            5: {'isBoss': True, 'bossName': themes[s-1]['bosses'][0]}
        },
        'B': {
            1: {'enemies': [{'name': eArr[1], 'count': '3-4'}, {'name': eArr[0], 'count': '2'}]},
            2: {'enemies': [{'name': eArr[3], 'count': '3-4'}, {'name': eArr[2], 'count': '1'}]},
            3: {'enemies': [{'name': eArr[5], 'count': '2-3'}, {'name': eArr[4], 'count': '2'}, {'name': eArr[7], 'count': '1'}]},
            4: {'enemies': [{'name': eArr[8], 'count': '3'}, {'name': eArr[9], 'count': '2'}, {'name': eArr[6], 'count': '1-2'}]},
            5: {'isBoss': True, 'bossName': themes[s-1]['bosses'][1]}
        }
    }
    if s == 11:
        formationsObj[s]['A'][5]['special'] = 'final'
        formationsObj[s]['B'][5]['special'] = 'final'

# config.js
with open(config_path, 'r', encoding='utf-8') as f:
    configData = f.read()

configData = re.sub(r'maxStages:\s*\d+,', 'maxStages: 11,', configData)

enemiesStr = '  enemies: {\n'
for k, v in enemiesObj.items():
    enemiesStr += f"    '{k}': {v},\n"
enemiesStr += '  },'

bossesStr = '  bosses: {\n'
for k, v in bossesObj.items():
    bossesStr += f"    '{k}': {v},\n"
bossesStr += '  },'

configData = re.sub(r'enemies:\s*\{[\s\S]*?\},', enemiesStr, configData, count=1)
configData = re.sub(r'bosses:\s*\{[\s\S]*?\},', bossesStr, configData, count=1)

with open(config_path, 'w', encoding='utf-8') as f:
    f.write(configData)
print('Updated config.js')

# stage.js
with open(stage_path, 'r', encoding='utf-8') as f:
    stageData = f.read()

formStr = 'const FORMATIONS = ' + json.dumps(formationsObj, indent=2) + ';'
# Fix python True/False to JS
formStr = formStr.replace('true', 'true').replace('false', 'false') # json.dumps lowercases booleans correctly

stageData = re.sub(r'const FORMATIONS = \{[\s\S]*?\};\n\nclass StageManager', formStr + '\n\nclass StageManager', stageData, count=1)

keysArr = []
for s in range(1, 19):
    keysArr.append(f"'{s}A'")
    keysArr.append(f"'{s}B'")
keys_str = ','.join(keysArr)
stageData = re.sub(r'const keys = \[[^\]]+\];', f'const keys = [{keys_str}];', stageData)
stageData = re.sub(r'const maxStg = state\.config\.maxStages \|\| \d+;', 'const maxStg = state.config.maxStages || 18;', stageData)

with open(stage_path, 'w', encoding='utf-8') as f:
    f.write(stageData)
print('Updated stage.js')

# ui.js
with open(ui_path, 'r', encoding='utf-8') as f:
    uiData = f.read()

mainStagesStr = '    const mainStages = [\n'
for t in themes:
    apexStr = ", isApex: true" if t['stage'] == 18 else ""
    mainStagesStr += f"      {{ stage: {t['stage']}, key: '{t['stage']}A', name: '{t['name']}', icon: '{t['icon']}'{apexStr} }},\n"
mainStagesStr += '    ];'

uiData = re.sub(r'const mainStages = \[[\s\S]*?\];', mainStagesStr, uiData, count=1)

stageColorsStr = """    const stageColors = {
      1: '#22c55e', 2: '#ef4444', 3: '#f59e0b', 4: '#eab308',
      5: '#dc2626', 6: '#84cc16', 7: '#10b981', 8: '#0ea5e9',
      9: '#8b5cf6', 10: '#06b6d4', 11: '#6366f1', 12: '#a855f7',
      13: '#c026d3', 14: '#db2777', 15: '#e81cff', 16: '#fcd34d',
      17: '#0284c7', 18: '#0f172a'
    };"""
uiData = re.sub(r'const stageColors = \{[\s\S]*?\};', stageColorsStr, uiData, count=1)

with open(ui_path, 'w', encoding='utf-8') as f:
    f.write(uiData)
print('Updated ui.js')
