import os
import re
import random
import json

base_dir = os.path.dirname(os.path.abspath(__file__))
config_path = os.path.join(base_dir, 'JS', 'config.js')
stage_path = os.path.join(base_dir, 'JS', 'stage.js')
ui_path = os.path.join(base_dir, 'JS', 'ui.js')

themes = [
    {'stage': 1, 'name': 'Volcano', 'icon': '🌋', 'type': 'ninja', 'bosses': ['Ash Master', 'Lava Shinobi']},
    {'stage': 2, 'name': 'Pyramids', 'icon': '🏜️', 'type': 'guardian', 'bosses': ['Sun Priest', 'Tomb Sentinel']},
    {'stage': 3, 'name': 'Marchers', 'icon': '🚶‍♂️', 'type': 'empire', 'bosses': ['Empire Warlord', 'Nomad King']},
    {'stage': 4, 'name': 'Chasm', 'icon': '🕳️', 'type': 'dark', 'bosses': ['Abyss Lord', 'Void Channeler']},
    {'stage': 5, 'name': 'Kingdom', 'icon': '🏰', 'type': 'knight', 'bosses': ['Fate Sovereign', 'Dawn Sentinel']},
    {'stage': 6, 'name': 'Graveyard', 'icon': '🪦', 'type': 'soul', 'bosses': ['Reaper', 'Damned General']},
    {'stage': 7, 'name': 'Church', 'icon': '⛪', 'type': 'parasite', 'bosses': ['Rot Pontiff', 'Hollow Bishop']},
    {'stage': 8, 'name': 'Lab', 'icon': '🧪', 'type': 'plague', 'bosses': ['Toxic Behemoth', 'Plague Master']},
    {'stage': 9, 'name': 'Cult', 'icon': '👁️', 'type': 'corrupt', 'bosses': ['Miasma Prophet', 'Ruin Avatar']},
    {'stage': 10, 'name': 'Dragon Isle', 'icon': '🐉', 'type': 'dragon', 'bosses': ['Fire Turtle', 'Sky Terror']},
    {'stage': 11, 'name': 'Abyssal Sea', 'icon': '🌊', 'type': 'sea', 'bosses': ['Sea Behemoth', 'Trench Leviathan']}
]

enemyNames = {
    1: ['Ash Ninja', 'Cinder Shinobi', 'Ember Assassin', 'Magma Kunoichi', 'Obsidian Rogue', 'Pyro Master', 'Scorch Saboteur', 'Lava Ronin', 'Smoke Stalker', 'Volcanic Shadow'],
    2: ['Glyph Scholar', 'Sand Mage', 'Tomb Oracle', 'Anubis Adept', 'Sun Priest', 'Crypt Mystic', 'Scarab Invoker', 'Desert Sage', 'Mirage Sorcerer', 'Sphinx Scholar'],
    3: ['Dune Legionnaire', 'Sand Strider', 'Westward Shield', 'Desert Vanguard', 'Marching Hoplite', 'Nomad Centurion', 'Sun Infantry', 'Endless Walker', 'Empire Pioneer', 'Dust Phalanx'],
    4: ['Void Cultist', 'Abyssal Mage', 'Shadow Caster', 'Gloom Warlock', 'Deep Summoner', 'Cave Occultist', 'Dark Adept', 'Nether Seeker', 'Hollow Channeler', 'Abyss Priest'],
    5: ['Destiny Knight', 'Oath Paladin', 'Fate Vanguard', 'Order Templar', 'Shield of Dawn', 'Royal Lancer', 'Divine Sentinel', 'Sovereign Blade', 'Justice Bringer', 'Valor Champion'],
    6: ['Restless Soul', 'Damned Spirit', 'Purgatory Wraith', 'Escaping Phantom', 'Lost Shade', 'Ascending Ghost', 'Bound Revenant', 'Mournful Specter', 'Ethereal Wanderer', 'Tormented Soul'],
    7: ['Husk Acolyte', 'Parasitic Monk', 'Infested Cleric', 'Soulless Priest', 'Hollow Bishop', 'Fungal Templar', 'Spore Zealot', 'Rotting Friar', 'Tainted Deacon', 'Blighted Vicar'],
    8: ['Plague Doctor', 'Mutated Subject', 'Toxic Chemist', 'Viral Surgeon', 'Rotted Scientist', 'Biohazard Brute', 'Pestilence Nurse', 'Contaminated Medic', 'Fume Scholar', 'Blight Alchemist'],
    9: ['Corrupt Disciple', 'Rot Believer', 'Decay Zealot', 'Miasma Prophet', 'Tainted Worshipper', 'Foul Oracle', 'Spoil Initiate', 'Defiled Mystic', 'Ruin Chanter', 'Pestilent Fanatic'],
    10: ['Scale Drake', 'Flame Wyrm', 'Ember Dragon', 'Ash Hatchling', 'Sky Serpent', 'Cinder Drake', 'Blaze Wyvern', 'Soaring Behemoth', 'Inferno Dragon', 'Talon Scorch'],
    11: ['Depth Lurker', 'Trench Behemoth', 'Deep Leviathan', 'Abyssal Terror', 'Sea Goliath', 'Maelstrom Horror', 'Void Kraken', 'Ocean Colossus', 'Tsunami Beast', 'Dark Tide']
}

enemiesObj = {}
bossesObj = {}
formationsObj = {}

elements = ['Earth', 'Water', 'Fire', 'Air', 'Aether', 'Void']

for s in range(1, 12):
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
for s in range(1, 12):
    keysArr.append(f"'{s}A'")
    keysArr.append(f"'{s}B'")
keys_str = ','.join(keysArr)
stageData = re.sub(r'const keys = \[[^\]]+\];', f'const keys = [{keys_str}];', stageData)
stageData = re.sub(r'const maxStg = state\.config\.maxStages \|\| \d+;', 'const maxStg = state.config.maxStages || 11;', stageData)

with open(stage_path, 'w', encoding='utf-8') as f:
    f.write(stageData)
print('Updated stage.js')

# ui.js
with open(ui_path, 'r', encoding='utf-8') as f:
    uiData = f.read()

mainStagesStr = '    const mainStages = [\n'
for t in themes:
    apexStr = ", isApex: true" if t['stage'] == 11 else ""
    mainStagesStr += f"      {{ stage: {t['stage']}, key: '{t['stage']}A', name: '{t['name']}', icon: '{t['icon']}'{apexStr} }},\n"
mainStagesStr += '    ];'

uiData = re.sub(r'const mainStages = \[[\s\S]*?\];', mainStagesStr, uiData, count=1)

stageColorsStr = """    const stageColors = {
      1: '#ef4444', 2: '#f59e0b', 3: '#eab308', 4: '#84cc16',
      5: '#10b981', 6: '#06b6d4', 7: '#6366f1', 8: '#a855f7',
      9: '#e81cff', 10: '#ff4d4d', 11: '#002244'
    };"""
uiData = re.sub(r'const stageColors = \{[\s\S]*?\};', stageColorsStr, uiData, count=1)

with open(ui_path, 'w', encoding='utf-8') as f:
    f.write(uiData)
print('Updated ui.js')
