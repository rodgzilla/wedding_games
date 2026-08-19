# Wordle Sublists & Timer — Design Spec

**Date:** 2026-08-19

## Overview

Two additions to the existing Wordle clone (see `docs/superpowers/specs/2026-07-29-wedding-wordle-design.md` for the base game):

1. **Sequential sublists** — instead of picking one random word per round forever, each visitor is assigned a random group of 6 words (a "sublist") to guess in order, one word at a time.
2. **Per-word timer with Clarisse/David comparison** — each word is timed. On completion (win or loss), the guest sees their time and, where available, a comparison against a reference time recorded by the bride (Clarisse) or groom (David) for that specific word.

No backend is introduced. The site remains static (GitHub Pages), zero runtime dependencies.

## File Structure

```
wordle_game/
├── index.html              # game UI (script tags become type="module")
├── logic.js                # NEW — pure logic, no DOM/fetch, importable by tests and game.js
├── game.js                 # DOM/fetch/event orchestration, imports from logic.js
├── words.txt                # answer sublists — blank-line-separated groups of 6, edited by the organiser
├── reference_times.txt      # NEW — Clarisse/David reference times per word, edited by the organiser
├── dictionary.txt           # validation corpus — unchanged
├── logic.test.js            # NEW — automated tests for logic.js (node:test)
└── scripts/
    └── generate_dictionary.py  # unchanged
```

## Word Lists (`words.txt`)

- Format changes from "one word per line" to **groups of exactly 6 words, separated by one or more blank lines**. The organiser pads the word pool to a multiple of 6.
- `logic.js` exposes `parseSublists(text)`, returning `string[][]`: split on blank lines, trim/uppercase each word, drop empty groups/lines. Each group must have exactly 6 words (validation is the organiser's responsibility when editing the file; the game does not special-case a short final group).
- The flat set of all words across all sublists is still used to seed `validGuesses` (union with `dictionary.txt` and its accent-stripped form), exactly as today.
- On `init()`, `pickRandomSublist(sublists)` selects one group at random — this becomes the guest's word sequence for the session. **No persistence**: a page reload re-fetches and re-picks a new random sublist, discarding any in-progress sequence.

## Reference Times (`reference_times.txt`)

- New file, one line per word, hand-edited by the organiser after timing Clarisse and David playing through the words themselves:
  ```
  WORD,NAME,SECONDS
  ```
  e.g. `AMOUR,CLARISSE,168`. `NAME` is `CLARISSE` or `DAVID` — exactly one reference time per word (never both).
- `logic.js` exposes `parseReferenceTimes(text)` → `Map<word, {name: 'CLARISSE'|'DAVID', seconds: number}>`.
- A word absent from this file has no reference entry — the result message simply omits the comparison sentence for that word.
- Fetched in parallel with `words.txt` and `dictionary.txt` at startup.

## Round Flow

The game no longer loops indefinitely on random single words. Startup:

1. Fetch `words.txt`, `dictionary.txt`, `reference_times.txt` in parallel.
2. Parse sublists, pick one at random → the guest's ordered 6-word sequence, held in memory only (module-level state in `game.js`).
3. Play word 1: render grid/keyboard as today. The timer is not running yet — the guest can take as long as they want before their first guess.
4. When the guest submits their first *valid* guess for this word (passes the length and dictionary checks, so it actually consumes one of the 6 tries), the timer starts. Thinking time before that guess never counts; unlimited retries of invalid-length or unrecognized-word attempts before the first valid guess don't start it either.
5. On win or loss for the current word: stop the timer, compute elapsed time, look up the reference entry (if any), build and show the result message (see below), and show a **"Mot suivant"** button instead of "Rejouer".
6. Clicking "Mot suivant" advances to the next word in the sequence (new grid, keyboard colors reset, timer reset to not-yet-started) — until all 6 are done.
7. After the 6th word: no "Mot suivant" button — instead render a **recap screen** replacing the grid/keyboard with a list of the 6 results (word, win/loss, time). This is a dead end; no replay.

## Timer

- A `#timer` element displays elapsed time live, updating every second, formatted `MmSS` (e.g. `2mn48`, `0mn05`) via `logic.js`'s `formatTime(seconds)` — matches the example wording from the feature request (minutes, literal `mn`, zero-padded two-digit seconds, no trailing unit).
- The timer is **not shown/started** while the guest is composing their first guess — unlimited thinking time up front. It **starts the instant the first valid guess is submitted** (see Round Flow step 4) and **stops the instant the deciding guess is submitted** (win, or the 6th failed guess) — the tile-flip reveal animation does not count toward the recorded time, so animation timing doesn't unfairly inflate scores.
- Elapsed time is computed in `game.js` (using `Date.now()` deltas from the first-valid-guess timestamp — this is orchestration, not pure logic, so it lives outside `logic.js`) and **rounded down to whole seconds** (`Math.floor`) before being passed into `logic.js`'s message-building function — this matches the whole-second granularity of `reference_times.txt` and makes tie detection (`elapsedSeconds === reference.seconds`) well-defined.

## Result Message

`logic.js` exposes a pure function, e.g. `buildResultMessage({ won, elapsedSeconds, target, reference })`, returning the French message string. Cases:

- **Win, no reference data:** `"Tu as deviné le mot en {time} !"`
- **Win, faster than reference:** `"Tu as deviné le mot en {time} ! {Clarisse / David} l'a deviné en {refTime}, tu étais plus rapide qu'{elle / lui}, félicitations !"`
- **Win, slower than reference:** `"Tu as deviné le mot en {time} ! {Clarisse / David} l'a deviné en {refTime}, {elle / il} était plus rapide que toi !"`
- **Win, tie (same elapsed seconds):** `"Tu as deviné le mot en {time} ! {Clarisse / David} l'a deviné exactement dans le même temps !"`
- **Loss, no reference data:** `"Le mot était : {WORD}. Tu as mis {time} avant d'être à court d'essais."`
- **Loss, with reference data:** append `" {Clarisse / David} l'a deviné en {refTime}."` to the loss message above.

Gendering (needed for pronouns only, names stay as-is): `CLARISSE` → "elle", `DAVID` → "lui" (comparison) / "il" (subject). Exact wording may be lightly tuned during implementation without changing the underlying logic/branching — the cases above are the contract that gets tested.

## Code Structure

- **`logic.js`** (ES module, no DOM/fetch/globals) exports pure functions:
  - `computeFeedback(guess, target)` — moved as-is from `game.js`
  - `parseWordList(text)` — flat trim/uppercase/filter (reused for `dictionary.txt` and flattening sublists)
  - `parseSublists(text)` — blank-line-separated groups
  - `pickRandomSublist(sublists)`
  - `parseReferenceTimes(text)`
  - `formatTime(seconds)`
  - `buildResultMessage({ won, elapsedSeconds, target, reference })`
- **`game.js`** becomes an ES module (`import { ... } from './logic.js'`) and keeps all DOM manipulation, `fetch()` calls, event listeners, timer interval (`setInterval`/`Date.now()`), and orchestration of round/sequence state.
- **`index.html`**: `<script src="game.js">` becomes `<script type="module" src="game.js">`.

## Testing

- `wordle_game/logic.test.js` uses Node's built-in test runner (`node:test`, `node:assert/strict`) — no npm dependencies, no `package.json` required.
- Run via `node --test wordle_game/` from the repo root (matches the `*.test.js` default discovery pattern).
- Coverage: `computeFeedback` (existing cases plus regression cases already implicitly covered by the current game), `parseSublists` (grouping, blank-line handling, trimming/uppercasing), `parseReferenceTimes` (parsing, unknown name values), `formatTime` (zero-padding, minute rollover), `buildResultMessage` (all six cases above: win/loss × no-reference/faster/slower/tie, Clarisse vs David gendering).
- `game.js` (DOM/fetch/timer orchestration) is not unit tested — verified manually via `python3 -m http.server`, per the existing project convention.

## Out of Scope

- Cross-device/session persistence of a guest's assigned sublist or progress.
- Replaying a finished set with a new random sublist.
- An admin/recording mode for capturing Clarisse/David's times automatically — times are measured with a stopwatch and hand-entered.
- Testing DOM/event/timer orchestration code (`game.js`) with automated tests.
