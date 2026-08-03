# -*- coding: utf-8 -*-
import re

filepath = '/home/z/my-project/download/get-clean-employee.html'

with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"Total lines: {len(lines)}")

# Line 2442 (index 2441) has corruption
corrupt_line = lines[2441]
print(f"Corrupt line: {repr(corrupt_line[:120])}")

# Fix: keep only the first part up to ';
semicolon_pos = corrupt_line.rfind("';")
if semicolon_pos >= 0:
    lines[2441] = corrupt_line[:semicolon_pos + 2] + '\n'
    print(f"Fixed to: {repr(lines[2441].strip()[:100])}")

# Now lines[2442:] is the duplicate starting with <html>
# We need to find where buildEmptyRoomTableHTML body continues in the duplicate
# and extract from there to the end of the file

# Find buildEmptyRoomTableHTML in the duplicate portion
dup_start = 2442  # index where duplicate starts
func_idx = None
for i in range(dup_start, len(lines)):
    if 'function buildEmptyRoomTableHTML(room)' in lines[i]:
        func_idx = i
        print(f"Found buildEmptyRoomTableHTML in duplicate at index {i}")
        break

if func_idx is None:
    print("Could not find function in duplicate!")
    exit(1)

# Find the body start (skip function signature)
body_idx = None
for i in range(func_idx + 1, min(func_idx + 10, len(lines))):
    if 'var prices' in lines[i]:
        body_idx = i
        break

if body_idx is None:
    body_idx = func_idx + 2

print(f"Body starts at index {body_idx}")

# Replace everything from line 2442 onward with the body from duplicate
# This means: keep lines[0:2442] (good part) + lines[body_idx:] (body from duplicate)
final = lines[:2442] + lines[body_idx:]
print(f"Final: {len(final)} lines")

with open(filepath, 'w', encoding='utf-8') as f:
    f.writelines(final)

print("File restored!")
