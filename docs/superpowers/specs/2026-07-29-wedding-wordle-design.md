# Wedding Wordle — Design Spec

**Date:** 2026-07-29

## Overview

A French-language Wordle clone to be played by wedding guests on their own devices via a website. Players guess a randomly chosen word from a curated list, with classic color-coded feedback. No backend, no leaderboard — clean and simple.

## File Structure

```
wordle_game/
├── index.html   # game UI
├── game.js      # all game logic
└── words.txt    # one word per line — edited by the organiser
```

## Hosting

Deployed as a static site on GitHub Pages. No build step required. Local testing via `python3 -m http.server` (required because `fetch()` needs HTTP).

## Word List

- `words.txt` — one word per line, UTF-8, edited manually by the organiser
- Words may be of varying lengths
- Loaded via `fetch('words.txt')` at startup, split on newlines, whitespace stripped
- A random word is chosen each round; no deduplication across rounds

## Game Logic

### Startup
1. Fetch and parse `words.txt`
2. Pick a random word → determines grid column count for that round
3. Render grid (word-length columns × 6 rows) and AZERTY keyboard

### Guess Mechanics
- Input via on-screen AZERTY keyboard or physical keyboard
- Backspace deletes last letter
- Enter submits — only accepted when guess length equals target word length
- No dictionary validation (accepts any string of the correct length)

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
- Dictionary validation
- Wedding personalisation (names, date, custom branding)
