const fs = require('fs');
const content = fs.readFileSync('style.css', 'utf8');

const stack = [];
const lines = content.split(/\r?\n/);
let extra = false;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const lineNum = i + 1;
  for (let j = 0; j < line.length; j++) {
    const char = line[j];
    if (char === '{') {
      stack.push({ lineNum, line });
    } else if (char === '}') {
      if (stack.length === 0) {
        console.log(`Extra closing brace at line ${lineNum}: ${line}`);
        extra = true;
      } else {
        stack.pop();
      }
    }
  }
}

if (stack.length > 0) {
  console.log("Unclosed braces:");
  stack.forEach(item => {
    console.log(`  Line ${item.lineNum}: ${item.line}`);
  });
} else if (!extra) {
  console.log("All braces match perfectly!");
}
