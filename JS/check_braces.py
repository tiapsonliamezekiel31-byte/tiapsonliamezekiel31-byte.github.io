with open(r"c:\Users\pauli\OneDrive\Documents\Desktop\nemesis3\style.css", "r", encoding="utf-8") as f:
    content = f.read()

# Check curly braces
stack = []
lines = content.splitlines()
for line_num, line in enumerate(lines, 1):
    for char_idx, char in enumerate(line):
        if char == '{':
            stack.append((line_num, char_idx, line))
        elif char == '}':
            if not stack:
                print(f"Extra closing brace at line {line_num}, col {char_idx}: {line}")
            else:
                stack.pop()

if stack:
    print(f"Unclosed braces:")
    for item in stack:
        print(f"  Line {item[0]}: {item[2]}")
else:
    print("All braces match perfectly!")
