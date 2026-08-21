const fs = require('fs');
const path = require('path');

const PURPLE_PATTERNS = [
  /#a855f7/gi,
  /#8a2be2/gi,
  /#9370db/gi,
  /#c084fc/gi,
  /#8b5cf6/gi,
  /#7c3aed/gi,
  /#6d28d9/gi,
  /#bf5af2/gi,
  /#d500f9/gi,
  /#e879f9/gi,
  /#d946ef/gi,
  /#a21caf/gi,
  /#a168f9/gi,
  /#a15cff/gi,
  /rgba\(\s*168\s*,\s*85\s*,\s*247/gi,
  /rgba\(\s*138\s*,\s*43\s*,\s*226/gi,
  /rgba\(\s*139\s*,\s*92\s*,\s*246/gi
];

const TARGET_DIRS = ['css', 'JS'];
const TARGET_FILES = ['index.html'];

let totalMatches = 0;

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const fileMatches = [];

  lines.forEach((line, index) => {
    for (const pattern of PURPLE_PATTERNS) {
      if (pattern.test(line)) {
        fileMatches.push({ lineNum: index + 1, text: line.trim() });
        break;
      }
    }
  });

  if (fileMatches.length > 0) {
    console.log(`\n📄 ${filePath} (${fileMatches.length} matches):`);
    fileMatches.forEach(m => console.log(`  L${m.lineNum}: ${m.text}`));
    totalMatches += fileMatches.length;
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git') walkDir(fullPath);
    } else if (file.endsWith('.css') || file.endsWith('.js')) {
      checkFile(fullPath);
    }
  }
}

console.log('--- SCANNING CODEBASE FOR PURPLE/NEON ARTIFACTS ---');
TARGET_DIRS.forEach(d => {
  if (fs.existsSync(d)) walkDir(d);
});
TARGET_FILES.forEach(f => {
  if (fs.existsSync(f)) checkFile(f);
});

console.log(`\nTOTAL PURPLE MATCHES FOUND: ${totalMatches}`);
process.exit(totalMatches > 0 ? 1 : 0);
