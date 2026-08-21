import os
import re

REPLACEMENTS = [
    (re.compile(r'#a855f7', re.I), '#1B4332'),
    (re.compile(r'#8a2be2', re.I), '#1B4332'),
    (re.compile(r'#9370db', re.I), '#2D5A43'),
    (re.compile(r'#c084fc', re.I), '#2D5A43'),
    (re.compile(r'#8b5cf6', re.I), '#1B4332'),
    (re.compile(r'#7c3aed', re.I), '#11281E'),
    (re.compile(r'#6d28d9', re.I), '#11281E'),
    (re.compile(r'#bf5af2', re.I), '#2D5A43'),
    (re.compile(r'#d500f9', re.I), '#C89B3C'),
    (re.compile(r'#e879f9', re.I), '#E0BA62'),
    (re.compile(r'#d946ef', re.I), '#2D5A43'),
    (re.compile(r'#a21caf', re.I), '#1B4332'),
    (re.compile(r'#a168f9', re.I), '#1B4332'),
    (re.compile(r'#a15cff', re.I), '#1B4332'),
    (re.compile(r'rgba\(\s*168\s*,\s*85\s*,\s*247\s*,\s*([0-9.]+)\s*\)', re.I), r'rgba(27, 67, 50, \1)'),
    (re.compile(r'rgba\(\s*138\s*,\s*43\s*,\s*226\s*,\s*([0-9.]+)\s*\)', re.I), r'rgba(27, 67, 50, \1)'),
    (re.compile(r'rgba\(\s*139\s*,\s*92\s*,\s*246\s*,\s*([0-9.]+)\s*\)', re.I), r'rgba(27, 67, 50, \1)'),
    (re.compile(r'rgba\(\s*213\s*,\s*0\s*,\s*249\s*,\s*([0-9.]+)\s*\)', re.I), r'rgba(200, 155, 60, \1)'),
]

TARGET_DIRS = ['css', 'JS']
TARGET_FILES = ['index.html']

total_replacements = 0

def process_file(file_path):
    global total_replacements
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        return

    new_content = content
    file_changes = 0
    for pat, repl in REPLACEMENTS:
        matches = len(pat.findall(new_content))
        if matches > 0:
            new_content = pat.sub(repl, new_content)
            file_changes += matches

    if file_changes > 0:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"[UPDATED] {file_path}: {file_changes} replacements")
        total_replacements += file_changes

for d in TARGET_DIRS:
    if os.path.exists(d):
        for root, _, files in os.walk(d):
            for file in files:
                if file.endswith('.css') or file.endswith('.js'):
                    process_file(os.path.join(root, file))

for f in TARGET_FILES:
    if os.path.exists(f):
        process_file(f)

print(f"\nTOTAL REPLACEMENTS EXECUTED: {total_replacements}")
