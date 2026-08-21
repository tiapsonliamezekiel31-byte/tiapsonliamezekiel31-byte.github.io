import os
import re
import sys

PURPLE_PATTERNS = [
    re.compile(r'#a855f7', re.I),
    re.compile(r'#8a2be2', re.I),
    re.compile(r'#9370db', re.I),
    re.compile(r'#c084fc', re.I),
    re.compile(r'#8b5cf6', re.I),
    re.compile(r'#7c3aed', re.I),
    re.compile(r'#6d28d9', re.I),
    re.compile(r'#bf5af2', re.I),
    re.compile(r'#d500f9', re.I),
    re.compile(r'#e879f9', re.I),
    re.compile(r'#d946ef', re.I),
    re.compile(r'#a21caf', re.I),
    re.compile(r'#a168f9', re.I),
    re.compile(r'#a15cff', re.I),
    re.compile(r'rgba\(\s*168\s*,\s*85\s*,\s*247', re.I),
    re.compile(r'rgba\(\s*138\s*,\s*43\s*,\s*226', re.I),
    re.compile(r'rgba\(\s*139\s*,\s*92\s*,\s*246', re.I),
]

TARGET_DIRS = ['css', 'JS']
TARGET_FILES = ['index.html']

total_matches = 0

def check_file(file_path):
    global total_matches
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            lines = f.readlines()
    except Exception as e:
        return

    matches = []
    for idx, line in enumerate(lines):
        for pat in PURPLE_PATTERNS:
            if pat.search(line):
                matches.append((idx + 1, line.strip()))
                break

    if matches:
        print(f"\n[FILE] {file_path} ({len(matches)} matches):")
        for line_num, text in matches:
            safe_text = text.encode('ascii', 'replace').decode('ascii')
            print(f"  L{line_num}: {safe_text[:120]}")
        total_matches += len(matches)

for d in TARGET_DIRS:
    if os.path.exists(d):
        for root, _, files in os.walk(d):
            for file in files:
                if file.endswith('.css') or file.endswith('.js'):
                    check_file(os.path.join(root, file))

for f in TARGET_FILES:
    if os.path.exists(f):
        check_file(f)

print(f"\nTOTAL PURPLE MATCHES FOUND: {total_matches}")
if total_matches > 0:
    sys.exit(1)
else:
    sys.exit(0)
