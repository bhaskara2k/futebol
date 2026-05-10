import os
import re

def clean_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Regex to find players: [ ... ] even across multiple lines
    # This is tricky due to nested braces. We use a more robust approach.
    
    new_content = []
    i = 0
    while i < len(content):
        if content[i:i+9] == 'players: ':
            # Found start of players attribute
            new_content.append('players: []')
            # Skip until the end of the array
            i += 9
            while i < len(content) and content[i] != '[':
                i += 1
            if i < len(content) and content[i] == '[':
                bracket_count = 1
                i += 1
                while i < len(content) and bracket_count > 0:
                    if content[i] == '[':
                        bracket_count += 1
                    elif content[i] == ']':
                        bracket_count -= 1
                    i += 1
        else:
            new_content.append(content[i])
            i += 1
            
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write("".join(new_content))

data_dir = '/home/hiagomedeiros/Documentos/futebol-integration/src/data'
files = [
    'africa.data.ts',
    'asia.data.ts',
    'europe.data.ts',
    'north-america.data.ts',
    'south-america.data.ts'
]

for filename in files:
    path = os.path.join(data_dir, filename)
    if os.path.exists(path):
        print(f"Cleaning {filename}...")
        clean_file(path)
        print(f"Done cleaning {filename}.")
