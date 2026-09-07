#!/usr/bin/env python3
"""Generate dictionary.txt from Lexique383.tsv.

Usage:
    python3 scripts/generate_dictionary.py path/to/Lexique383.tsv

Output:
    wordle_game/dictionary.txt — one uppercase word per line, frequency-filtered
"""
import csv
import os
import sys


def main():
    if len(sys.argv) != 2:
        print(f"Usage: {sys.argv[0]} path/to/Lexique383.tsv", file=sys.stderr)
        sys.exit(1)

    tsv_path = sys.argv[1]
    out_path = os.path.normpath(
        os.path.join(os.path.dirname(__file__), '..', 'dictionary.txt')
    )

    words = set()
    with open(tsv_path, encoding='utf-8') as f:
        reader = csv.DictReader(f, delimiter='\t')
        for row in reader:
            try:
                freq = float(row['freqfilms2'] or 0) + float(row['freqlivres'] or 0)
            except (ValueError, KeyError):
                continue
            if freq < 1.0:
                continue
            word = row['ortho'].strip().upper()
            if word.isalpha():
                words.add(word)

    with open(out_path, 'w', encoding='utf-8') as f:
        for word in sorted(words):
            f.write(word + '\n')

    print(f"Wrote {len(words)} words to {out_path}")


if __name__ == '__main__':
    main()
