# Wedding Wordle — Design Spec

**Date:** 2026-07-29

## Overview

A French-language Wordle clone to be played by wedding guests on their own devices via a website. Players guess a randomly chosen word from a curated list, with classic color-coded feedback. No backend, no leaderboard — clean and simple.

## File Structure

```
wordle_game/
├── index.html              # game UI
├── game.js                 # all game logic
├── words.txt               # answer list — one word per line, edited by the organiser
├── dictionary.txt          # validation corpus — generated from Lexique, not edited manually
└── scripts/
    └── generate_dictionary.py  # one-off script to produce dictionary.txt from Lexique383.tsv
```

## Hosting

Deployed as a static site on GitHub Pages. No build step required. Local testing via `python3 -m http.server` (required because `fetch()` needs HTTP).

## Word List and Dictionary

**Answer list (`words.txt`):**
- One word per line, UTF-8, edited manually by the organiser
- Words may be of varying lengths
- Loaded via `fetch('words.txt')` at startup
- A random word is chosen each round; no deduplication across rounds

**Validation corpus (`dictionary.txt`):**
- Generated from Lexique383 (`http://www.lexique.org/databases/Lexique383/Lexique383.tsv`) by `scripts/generate_dictionary.py`
- Filtering: keep rows where `freqfilms2 + freqlivres >= 1.0`, word is purely alphabetic (`str.isalpha()`), stored uppercase
- Not edited manually — re-run the script to regenerate
- All words in `words.txt` are implicitly valid guesses even if absent from `dictionary.txt`

## Game Logic

### Startup
1. Fetch and parse both `words.txt` and `dictionary.txt` in parallel
2. Pick a random word from `words.txt` → determines grid column count for that round
3. Render grid (word-length columns × 6 rows) and AZERTY keyboard

### Guess Mechanics
- Input via on-screen AZERTY keyboard or physical keyboard (regex `[a-zA-ZÀ-ÿ]` for accented letters)
- Backspace deletes last letter
- Enter submits — only accepted when:
  1. Guess length equals target word length
  2. Guess is in `dictionary.txt` OR in `words.txt` (case-insensitive)
- Invalid length: shake row, no message
- Unknown word: shake row, display "Mot non reconnu"

### Color Feedback
- **Green** — correct letter, correct position
- **Yellow** — correct letter, wrong position
- **Grey** — letter not in word
- Duplicate letter rule: greens are resolved first, then yellows consume remaining unmatched target letters left-to-right. Extra copies of a letter beyond the target count are grey.
- Tile flip animation on submission
- On-screen keyboard keys update to reflect best hint per letter (green > yellow > grey)

### Round End
- **Win:** all tiles green → display "Bravo !" → show "Rejouer" button
- **Lose:** 6 failed guesses → display "Le mot était : [WORD]" → show "Rejouer" button

### New Round ("Rejouer")
- Pick a new random word from the list (may repeat)
- Reset grid and keyboard colors
- No round history tracked

## UI

- **Grid** — centered, tiles sized for mobile screens, flip animation on submit
- **Keyboard** — AZERTY layout, clickable, keys colored by best hint
- **Message area** — short French feedback text above the grid
- **"Rejouer" button** — appears on round end, centered below the grid
- No header, no score display, no navigation
- Responsive — works on mobile and desktop browsers

## Out of Scope

- Leaderboard or score tracking
- Daily word / shared word across devices
- Wedding personalisation (names, date, custom branding)
- Accent keys on the on-screen AZERTY keyboard (physical keyboard handles accented input)
