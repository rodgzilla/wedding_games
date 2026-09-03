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
- `logic.test.js` — unit tests for `logic.js` using Node's built-in `node:test` module. 21 of the suite's 35 tests, covering all feedback cases, sublist parsing, reference-time parsing (including rejection of unrecognized names and empty seconds fields), and message building (Clarisse vs. David, faster/slower/tie French grammar).
- `game.js` — ES module that imports from `logic.js` and `animation.js`, and owns all DOM manipulation, fetch calls, and game orchestration (grid rendering, keyboard input, timer, round/sublist progression, recap screen).
- `fractal.js` — pure Pythagoras tree geometry (no DOM, no canvas). Exports `pythagorasNodes()`, which flattens a tree into a depth-ordered draw list of `{x, y, size, rotation, depth, scale}`. A node is the midpoint of its square's base edge; `growth` is a *fractional* depth, so level `d` comes back with `scale = clamp(growth - d, 0, 1)` and a tree can bloom level by level. `angle` accepts a function of the parent's depth, which is what sends a wave travelling out through the branches instead of every branch swinging in lockstep.
- `fractal.test.js` — 14 tests covering node counts, fractional growth, `maxDepth` and `minSize` pruning, the `left² + right² = parent²` child-size relation, rotated roots, and per-depth angles.
- `animation.js` — the 10-second launch sequence played before the recap (see "Launch animation" below). Owns one canvas, one `requestAnimationFrame` loop, and the SVG craft's per-frame transform.
- `selki_3.jpg` — 900×900 square crop of Selki's head; every square of the fractal is this image.
- `selki_4.jpg` — 1200×1200 profile of Selki, clipped into a circle for the dinosaur rider's head.
- `words.txt` — answer list organized as blank-line-separated **sublists** of 6 words each (all uppercase). One sublist is picked at random per page load. The 6 words are played sequentially (one word per round) with a "Mot suivant" button, ending in a recap screen showing all 6 results.
- `reference_times.txt` — one `WORD,NAME,SECONDS` line per word (`NAME` is `CLARISSE` or `DAVID`). Organizer hand-edits this file with Clarisse and David's own recorded times; used to build the comparison sentence in each word's result message ("tu étais plus rapide qu'elle" vs. "tu étais plus rapide que lui", etc.). The values currently committed are fabricated placeholders/examples (flagged as such by a `#`-comment header in the file itself, which `parseReferenceTimes()` silently skips) — the organiser must replace them with real recorded stopwatch times before the wedding. A line with an unrecognized `NAME` or an empty/invalid `SECONDS` field is skipped by `parseReferenceTimes()` and behaves as if that word had no reference time at all.
- `dictionary.txt` — the guess-validation corpus (~38k words), machine-generated from Lexique383 by `scripts/generate_dictionary.py` (filter: `freqfilms2 + freqlivres >= 1.0`, alphabetic only, uppercased, sorted). Never hand-edit this file — regenerate it via the script instead.
- `scripts/generate_dictionary.py` — one-off generator for `dictionary.txt`, run manually against a downloaded `Lexique383.tsv`.

### Runtime flow

1. **init()** fetches `words.txt`, `dictionary.txt`, and `reference_times.txt` in parallel. Parses sublists from `words.txt` (blank-line-separated groups) and picks one at random via `pickRandomSublist()`. Parses reference times via `parseReferenceTimes()`. Guess validity is the union of `dictionary.txt`, an accent-stripped copy of it (`normalize('NFD')` + diacritic strip), and all words from all sublists — so every answer word is always guessable even if absent from the Lexique corpus.

2. **startRound()** (first call per page load, then via "Mot suivant" button) sets the target word from the current sublist and resets per-word state (`currentGuess`, `currentRow`, `gameOver`, `keyColors`). Re-renders the grid (`target.length` columns — words in the pool range from 5 to 8 letters, see `words.txt` — × `MAX_GUESSES` rows) and the AZERTY keyboard. Resets the timer (`timerStart = null`, `elapsedSeconds = 0`).

3. **Input** comes from either the on-screen AZERTY keyboard or the physical keyboard (`keydown` listener, regex `[a-zA-ZÀ-ÿ]` for accented letters); both funnel through `handleKey()`.

4. **submitGuess()** validates guess length, then membership in `validGuesses`; rejects animate a shake (`shakeRow`) plus a transient "Mot non reconnu" message (timeout tracked in `messageTimeoutId`). On first valid guess, **starts the per-word timer** (`timerStart = Date.now()`); the visible clock then ticks once per second via `updateTimerDisplay()` called on a 1000ms interval. When a guess ends the word (win or loss), `submitGuess()` itself immediately calls `stopTimer()` (freezing `elapsedSeconds` via `Math.floor((Date.now() - timerStart) / 1000)`) and sets `gameOver = true`, before the reveal animation (`revealRow`) runs. Setting `gameOver` at this point — rather than only later inside `endGame()` — is what guarantees `stopTimer()` fires exactly once: `handleKey()`'s `if (gameOver) return;` guard blocks any further Enter presses (including OS auto-repeat) during the ~1s reveal-animation window before `endGame()` actually executes.

5. **computeFeedback(guess, target)** (unit-tested in `logic.test.js`) implements standard Wordle two-pass duplicate-letter resolution: exact-position matches consume target letters first (green), then remaining guess letters consume leftover target letters left-to-right (yellow); anything unconsumed is grey.

6. **revealRow()** staggers the flip animation per tile (`FLIP_DELAY` between tiles, `FLIP_DURATION` per flip) and calls back into `updateKeyboardColors()` → win/loss check → `endGame()` or advance to the next row.

7. On-screen keyboard key colors track the best hint seen per letter across guesses (green > yellow > grey priority), via `keyColors`.

8. **endGame(won)** does not touch the timer (already stopped and frozen by `submitGuess()`, see step 4) — it reads the already-frozen `elapsedSeconds`, records the result (`results.push(...)`), builds the result message via `buildResultMessage({ won, elapsedSeconds, target, reference })` (with optional Clarisse/David comparison), and shows either a "Mot suivant" button (to advance to the next word in the sublist) or a "Voir le récap" button (after the 6th word, to jump to the recap screen).

9. **Launch animation** — "Voir le récap" runs `playLaunchAnimation()` (from `animation.js`) and only calls `showRecap()` when it resolves. The recap also carries a "Rejouer l'animation 🚀" button that replays it. See below.

10. **Recap screen** displays all 6 words played with their results (word, win/loss label, and elapsed time) after the final word.

### Launch animation

A dinosaur with Selki's head rides a rocket off the launch pad, and the exhaust trail it leaves unfurls into a Pythagoras tree whose every square is a photo of Selki's head. Roughly: countdown to 1.4s, ignition and screen shake to 2.0s, climb with the tree blooming level by level to 6.8s, rocket exits in a spark burst to 7.4s, the tree thrashes and settles to 9.2s, fade to the recap at 10s.

Notes on why it is built the way it is:

- **One canvas, one RAF loop.** Sky, stars, exhaust, tree, and sparks all paint into `#launch-canvas`; only the dino-on-a-rocket is a DOM element (an inline SVG positioned each frame with a `transform`). Phones are the primary device, so this stays at one compositing layer.
- **`selki_3.jpg` is decoded once** into a 128px offscreen buffer at preload; the ~255 squares each `drawImage` from that buffer rather than re-sampling a 900×900 JPEG.
- **The sky gradient and ground are rasterised once per resize** into a second buffer and blitted. Re-evaluating a full-screen gradient every frame cost as much as the entire tree.
- **The tree is fitted to the viewport at rest**, not across the sway range — fitting for a hard lean would leave the tree at a third of its size on a portrait phone. Instead the tree pulls in (`SWAY_RECOIL`) as it thrashes, which keeps it in frame and reads as a recoil. It is allowed to overflow the viewport width by 1.2× so it fills a tall screen.
- **Depth adapts to the device.** `maxDepthFor()` picks 7/8/9 by viewport width, and a budget check samples 40 frames *after the tree is on screen* (sampling during the countdown would measure a bare sky and tell you nothing) and sheds a level or two if the median frame is slow.
- **It can never trap a guest.** A failed image load, a missing 2d context, `prefers-reduced-motion: reduce`, or a 12.5s watchdog each resolve the promise so the recap still appears. Body scroll is locked while it plays and restored on every exit path.
