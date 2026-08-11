const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, 'JS', 'config.js');
const stagePath = path.join(__dirname, 'JS', 'stage.js');
const uiPath = path.join(__dirname, 'JS', 'ui.js');

const themes = [
  { stage: 1, name: 'Volcano', icon: '🌋', type: 'ninja', bosses: ['Ash Master', 'Lava Shinobi'] },
  { stage: 2, name: 'Pyramids', icon: '🏜️', type: 'guardian', bosses: ['Sun Priest', 'Tomb Sentinel'] },
  { stage: 3, name: 'Marchers', icon: '🚶‍♂️', type: 'empire', bosses: ['Empire Warlord', 'Nomad King'] },
  { stage: 4, name: 'Chasm', icon: '🕳️', type: 'dark', bosses: ['Abyss Lord', 'Void Channeler'] },
  { stage: 5, name: 'Kingdom', icon: '🏰', type: 'knight', bosses: ['Fate Sovereign', 'Dawn Sentinel'] },
  { stage: 6, name: 'Graveyard', icon: '🪦', type: 'soul', bosses: ['Reaper', 'Damned General'] },
  { stage: 7, name: 'Church', icon: '⛪', type: 'parasite', bosses: ['Rot Pontiff', 'Hollow Bishop'] },
  { stage: 8, name: 'Lab', icon: '🧪', type: 'plague', bosses: ['Toxic Behemoth', 'Plague Master'] },
  { stage: 9, name: 'Cult', icon: '👁️', type: 'corrupt', bosses: ['Miasma Prophet', 'Ruin Avatar'] },
  { stage: 10, name: 'Dragon Isle', icon: '🐉', type: 'dragon', bosses: ['Fire Turtle', 'Sky Terror'] },
  { stage: 11, name: 'Abyssal Sea', icon: '🌊', type: 'sea', bosses: ['Sea Behemoth', 'Trench Leviathan'] },
];

const enemyNames = {
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
};

let enemiesObj = {};
let bossesObj = {};
let formationsObj = {};

const elements = ['Earth', 'Water', 'Fire', 'Air', 'Aether', 'Void'];

for (let s = 1; s <= 11; s++) {
  // Generate 10 enemies
  enemyNames[s].forEach(name => {
    let el = elements[Math.floor(Math.random() * elements.length)];
    let resist = elements[Math.floor(Math.random() * elements.length)];
    enemiesObj[name] = `{ element: '${el}', resist: '${resist} C', weak: 'None', hpMult: ${(0.8 + Math.random()*0.4).toFixed(1)}, dmgMult: ${(0.8 + Math.random()*0.4).toFixed(1)}, attackWeights: { regular: 0.6, heavy: 0.2, minion: 0, heal: 0.1, bomb: 0.1 } }`;
  });
  
  // Generate 2 bosses
  themes[s-1].bosses.forEach((boss, i) => {
    let el = elements[Math.floor(Math.random() * elements.length)];
    bossesObj[boss] = `{ element: '${el}', resist: '${el} B', weak: 'None', hpMult: ${1.5 + (s * 0.1)}, color: '#aa3333', p1Anim: 'Rage Pulse', p2Anim: 'Rage Pulse', attackWeights: { heavy: 0.4, bomb: 0.2, minion: 0.2, regular: 0.2 } }`;
  });

  // Generate Formation for A and B
  let eArr = enemyNames[s];
  formationsObj[s] = {
    A: {
      1: { enemies: [{ name: eArr[0], count: '3-4' }, { name: eArr[1], count: '2' }] },
      2: { enemies: [{ name: eArr[2], count: '3-4' }, { name: eArr[3], count: '1' }] },
      3: { enemies: [{ name: eArr[4], count: '2-3' }, { name: eArr[5], count: '2' }, { name: eArr[6], count: '1' }] },
      4: { enemies: [{ name: eArr[7], count: '3' }, { name: eArr[8], count: '2' }, { name: eArr[9], count: '1-2' }] },
      5: { isBoss: true, bossName: themes[s-1].bosses[0], special: s===11?'final':undefined }
    },
    B: {
      1: { enemies: [{ name: eArr[1], count: '3-4' }, { name: eArr[0], count: '2' }] },
      2: { enemies: [{ name: eArr[3], count: '3-4' }, { name: eArr[2], count: '1' }] },
      3: { enemies: [{ name: eArr[5], count: '2-3' }, { name: eArr[4], count: '2' }, { name: eArr[7], count: '1' }] },
      4: { enemies: [{ name: eArr[8], count: '3' }, { name: eArr[9], count: '2' }, { name: eArr[6], count: '1-2' }] },
      5: { isBoss: true, bossName: themes[s-1].bosses[1] }
    }
  };
}

let configData = fs.readFileSync(configPath, 'utf8');

// Update maxStages to 11
configData = configData.replace(/maxStages:\s*\d+,/, 'maxStages: 11,');

// Replace enemies and bosses objects in config.js
// Find 'enemies: {' and find matching closing brace
let enemiesStr = '  enemies: {\n';
for (let [k,v] of Object.entries(enemiesObj)) {
  enemiesStr += `    '${k}': ${v},\n`;
}
enemiesStr += '  },';

let bossesStr = '  bosses: {\n';
for (let [k,v] of Object.entries(bossesObj)) {
  bossesStr += `    '${k}': ${v},\n`;
}
bossesStr += '  },';

configData = configData.replace(/enemies:\s*\{[\s\S]*?\},/m, enemiesStr);
configData = configData.replace(/bosses:\s*\{[\s\S]*?\},/m, bossesStr);

fs.writeFileSync(configPath, configData);
console.log('Updated config.js');

// Update FORMATIONS in stage.js
let stageData = fs.readFileSync(stagePath, 'utf8');
let formStr = 'const FORMATIONS = ' + JSON.stringify(formationsObj, null, 2) + ';';
// Find const FORMATIONS = { ... };
stageData = stageData.replace(/const FORMATIONS = \{[\s\S]*?\};\n\nclass StageManager/, formStr + '\n\nclass StageManager');
// Also update keys in ensureStageProgress
let keysArr = [];
for(let s=1; s<=11; s++) { keysArr.push(`'${s}A'`); keysArr.push(`'${s}B'`); }
stageData = stageData.replace(/const keys = \[[^\]]+\];/, `const keys = [${keysArr.join(',')}];`);
// Also update maxStg to 11
stageData = stageData.replace(/const maxStg = state\.config\.maxStages \|\| \d+;/, 'const maxStg = state.config.maxStages || 11;');
fs.writeFileSync(stagePath, stageData);
console.log('Updated stage.js');

// Update ui.js getOrGenerateBranchingMap
let uiData = fs.readFileSync(uiPath, 'utf8');
let mainStagesStr = `    const mainStages = [\n`;
themes.forEach(t => {
  mainStagesStr += `      { stage: ${t.stage}, key: '${t.stage}A', name: '${t.name}', icon: '${t.icon}'${t.stage===11?', isApex: true':''} },\n`;
});
mainStagesStr += `    ];`;

uiData = uiData.replace(/const mainStages = \[[\s\S]*?\];/m, mainStagesStr);

let stageColorsStr = `    const stageColors = {
      1: '#ef4444', 2: '#f59e0b', 3: '#eab308', 4: '#84cc16',
      5: '#10b981', 6: '#06b6d4', 7: '#6366f1', 8: '#a855f7',
      9: '#e81cff', 10: '#ff4d4d', 11: '#002244'
    };`;
uiData = uiData.replace(/const stageColors = \{[\s\S]*?\};/m, stageColorsStr);

fs.writeFileSync(uiPath, uiData);
console.log('Updated ui.js');
