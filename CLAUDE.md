# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A French-language Wordle clone built for wedding guests to play on their own devices, hosted as a static site (GitHub Pages). No backend, no build step, zero JS dependencies. Design spec and implementation plan live in `docs/superpowers/specs/` and `docs/superpowers/plans/`.

## Commands

Serve locally (required — `game.js` uses `fetch()`, which needs HTTP, not `file://`):

```bash
cd wordle_game && python3 -m http.server 8000
```

Then open `http://localhost:8000`.

Run the automated tests (Node's built-in test runner, no dependencies):

```bash
node --test wordle_game/*.test.js
```

Regenerate `dictionary.txt` from a Lexique383 TSV dump (rarely needed — only when refreshing the validation corpus):

```bash
python3 wordle_game/scripts/generate_dictionary.py path/to/Lexique383.tsv
```

## Architecture

Everything lives in `wordle_game/`:

### Files

- `index.html` — page structure and all CSS (inline `<style>` block), no separate stylesheet. Loads `game.js` as an ES module.
- `package.json` — marks the directory as ES modules (`"type": "module"`), enabling `import`/`export` syntax in Node. No dependencies, no `npm install` required.
- `logic.js` — pure, unit-tested game logic (no DOM, no side effects). Exports: `computeFeedback()` (Wordle feedback: green/yellow/grey), `parseWordList()`, `parseSublists()`, `pickRandomSublist()`, `parseReferenceTimes()` (reference time data), `formatTime()` (format seconds as "MmSS"), and `buildResultMessage()` (win/loss messages with optional reference-time comparisons).
- `logic.test.js` — unit tests for `logic.js` using Node's built-in `node:test` module. 19 tests covering all feedback cases, sublist parsing, reference-time parsing, and message building (Clarisse vs. David, faster/slower/tie French grammar).
- `game.js` — ES module that imports from `logic.js` and owns all DOM manipulation, fetch calls, and game orchestration (grid rendering, keyboard input, timer, round/sublist progression, recap screen).
- `words.txt` — answer list organized as blank-line-separated **sublists** of 6 words each (all uppercase). One sublist is picked at random per page load. The 6 words are played sequentially (one word per round) with a "Mot suivant" button, ending in a recap screen showing all 6 results.
- `reference_times.txt` — one `WORD,NAME,SECONDS` line per word (`NAME` is `CLARISSE` or `DAVID`). Organizer hand-edits this file with Clarisse and David's own recorded times; used to build the comparison sentence in each word's result message ("tu étais plus rapide qu'elle" vs. "tu étais plus rapide que lui", etc.).
- `dictionary.txt` — the guess-validation corpus (~38k words), machine-generated from Lexique383 by `scripts/generate_dictionary.py` (filter: `freqfilms2 + freqlivres >= 1.0`, alphabetic only, uppercased, sorted). Never hand-edit this file — regenerate it via the script instead.
- `scripts/generate_dictionary.py` — one-off generator for `dictionary.txt`, run manually against a downloaded `Lexique383.tsv`.

### Runtime flow

1. **init()** fetches `words.txt`, `dictionary.txt`, and `reference_times.txt` in parallel. Parses sublists from `words.txt` (blank-line-separated groups) and picks one at random via `pickRandomSublist()`. Parses reference times via `parseReferenceTimes()`. Guess validity is the union of `dictionary.txt`, an accent-stripped copy of it (`normalize('NFD')` + diacritic strip), and all words from all sublists — so every answer word is always guessable even if absent from the Lexique corpus.

2. **startWord()** (first call per page load, then via "Mot suivant" button) sets the target word from the current sublist and resets per-word state (`currentGuess`, `currentRow`, `gameOver`, `keyColors`). Re-renders the grid (5 columns × `MAX_GUESSES` rows) and the AZERTY keyboard. Resets the timer (`timerStart = null`, `elapsedSeconds = 0`).

3. **Input** comes from either the on-screen AZERTY keyboard or the physical keyboard (`keydown` listener, regex `[a-zA-ZÀ-ÿ]` for accented letters); both funnel through `handleKey()`.

4. **submitGuess()** validates guess length, then membership in `validGuesses`; rejects animate a shake (`shakeRow`) plus a transient "Mot non reconnu" message (timeout tracked in `messageTimeoutId`). On first valid guess, **starts the per-word timer** (`timerStart = Date.now()`, then update `elapsedSeconds` every 100ms via `setInterval()`).

5. **computeFeedback(guess, target)** (unit-tested in `logic.test.js`) implements standard Wordle two-pass duplicate-letter resolution: exact-position matches consume target letters first (green), then remaining guess letters consume leftover target letters left-to-right (yellow); anything unconsumed is grey.

6. **revealRow()** staggers the flip animation per tile (`FLIP_DELAY` between tiles, `FLIP_DURATION` per flip) and calls back into `updateKeyboardColors()` → win/loss check → `endWord()` or advance to the next row.

7. On-screen keyboard key colors track the best hint seen per letter across guesses (green > yellow > grey priority), via `keyColors`.

8. **endWord(won)** stops the timer (freezes `elapsedSeconds`), builds the result message via `buildResultMessage({ won, elapsedSeconds, target, reference })` (with optional Clarisse/David comparison), and shows either a "Mot suivant" button (to advance to the next word in the sublist) or a "Voir le récap" button (after the 6th word, to jump to the recap screen).

9. **Recap screen** displays all 6 words played and their results (win/loss + message for each) after the final word.
