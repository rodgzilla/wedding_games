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

- `index.html` — page structure and all CSS (inline `<style>` block), no separate stylesheet. Loads `game.js` as an ES module. Sizing is viewport-relative so phones never overflow: tiles come from `--tile-size` on `#grid`, derived from `--cols` (the word length, set by `renderGrid()`) and capped at 56px, and keys from `--key-w` on `#keyboard`, sized so the 10-key top row always fits `100vw` and capped at 40px. Never re-introduce fixed pixel widths for tiles or keys.
- `package.json` — marks the directory as ES modules (`"type": "module"`), enabling `import`/`export` syntax in Node. No dependencies, no `npm install` required.
- `logic.js` — pure, unit-tested game logic (no DOM, no side effects). Exports: `computeFeedback()` (Wordle feedback: green/yellow/grey), `parseWordList()`, `parseSublists()`, `pickRandomSublist()`, `parseReferenceGuesses()` (reference guess-count data), and `buildResultMessage()` (win/loss messages with optional reference-guess-count comparisons).
- `logic.test.js` — unit tests for `logic.js` using Node's built-in `node:test` module. 22 of the suite's 36 tests, covering all feedback cases, sublist parsing, reference-guess-count parsing (including rejection of unrecognized names, empty fields, and counts that are not positive integers), and message building (Clarisse vs. David, better/worse/tie French grammar, `1 essai` vs. `N essais`).
- `game.js` — ES module that imports from `logic.js` and `animation.js`, and owns all DOM manipulation, fetch calls, and game orchestration (grid rendering, keyboard input, round/sublist progression, recap screen).
- `fractal.js` — pure Pythagoras tree geometry (no DOM, no canvas). Exports `pythagorasNodes()`, which flattens a tree into a depth-ordered draw list of `{x, y, size, rotation, depth, scale}`. A node is the midpoint of its square's base edge; `growth` is a *fractional* depth, so level `d` comes back with `scale = clamp(growth - d, 0, 1)` and a tree can bloom level by level. `angle` accepts a function of the parent's depth, which is what sends a wave travelling out through the branches instead of every branch swinging in lockstep.
- `fractal.test.js` — 14 tests covering node counts, fractional growth, `maxDepth` and `minSize` pruning, the `left² + right² = parent²` child-size relation, rotated roots, and per-depth angles.
- `animation.js` — the 10-second launch sequence played before the recap (see "Launch animation" below). Owns one canvas, one `requestAnimationFrame` loop, and the SVG craft's per-frame transform.
- `selki_5.png` — 900×900 cut-out of Selki's head on a transparent background; every square of the fractal is this image. `selki_3.jpg` is the same crop with its background intact, kept but no longer used.
- `selki_4.jpg` — 1200×1200 profile of Selki, clipped into a circle for the dinosaur rider's head.
- `words.txt` — answer list organized as blank-line-separated **sublists** of 6 words each (all uppercase). One sublist is picked at random per page load. The 6 words are played sequentially (one word per round) with a "Mot suivant" button, ending in a recap screen showing all 6 results.
- `reference_guesses.txt` — one `WORD,NAME,GUESSES` line per word (`NAME` is `CLARISSE` or `DAVID`, `GUESSES` is how many tries they needed, 1-6). Organizer hand-edits this file with Clarisse and David's own results; used to build the comparison sentence in each word's result message ("tu as fait mieux qu'elle" vs. "tu as fait mieux que lui", etc.). The values currently committed are fabricated placeholders/examples (flagged as such by a `#`-comment header in the file itself, which `parseReferenceGuesses()` silently skips) — the organiser must replace them with the real counts before the wedding. A line with an unrecognized `NAME`, or a `GUESSES` field that is not a positive integer, is skipped by `parseReferenceGuesses()` and behaves as if that word had no reference at all.
- `reference_times_david.txt` — David's raw recorded stopwatch times, kept as a record. Unused by the game since the comparison switched from elapsed time to guess count.
- `dictionary.txt` — the guess-validation corpus (~38k words), machine-generated from Lexique383 by `scripts/generate_dictionary.py` (filter: `freqfilms2 + freqlivres >= 1.0`, alphabetic only, uppercased, sorted). Never hand-edit this file — regenerate it via the script instead.
- `scripts/generate_dictionary.py` — one-off generator for `dictionary.txt`, run manually against a downloaded `Lexique383.tsv`.

### Runtime flow

1. **init()** fetches `words.txt`, `dictionary.txt`, and `reference_guesses.txt` in parallel. Parses sublists from `words.txt` (blank-line-separated groups) and picks one at random via `pickRandomSublist()`. Parses reference guess counts via `parseReferenceGuesses()`. Guess validity is the union of `dictionary.txt`, an accent-stripped copy of it (`normalize('NFD')` + diacritic strip), and all words from all sublists — so every answer word is always guessable even if absent from the Lexique corpus.

2. **startRound()** (first call per page load, then via "Mot suivant" button) sets the target word from the current sublist and resets per-word state (`currentGuess`, `currentRow`, `gameOver`, `keyColors`). Re-renders the grid (`target.length` columns — words in the pool range from 5 to 8 letters, see `words.txt` — × `MAX_GUESSES` rows) and the AZERTY keyboard.

3. **Input** comes from either the on-screen AZERTY keyboard or the physical keyboard (`keydown` listener, regex `[a-zA-ZÀ-ÿ]` for accented letters); both funnel through `handleKey()`.

4. **submitGuess()** validates guess length, then membership in `validGuesses`; rejects animate a shake (`shakeRow`) plus a transient "Mot non reconnu" message (timeout tracked in `messageTimeoutId`). When a guess ends the word (win or loss), `submitGuess()` sets `gameOver = true` immediately, before the reveal animation (`revealRow`) runs. Setting `gameOver` at this point — rather than only later inside `endGame()` — is what guarantees `endGame()` runs exactly once: `handleKey()`'s `if (gameOver) return;` guard blocks any further Enter presses (including OS auto-repeat) during the ~1s reveal-animation window, which would otherwise re-submit the same still-current row.

5. **computeFeedback(guess, target)** (unit-tested in `logic.test.js`) implements standard Wordle two-pass duplicate-letter resolution: exact-position matches consume target letters first (green), then remaining guess letters consume leftover target letters left-to-right (yellow); anything unconsumed is grey.

6. **revealRow()** staggers the flip animation per tile (`FLIP_DELAY` between tiles, `FLIP_DURATION` per flip) and calls back into `updateKeyboardColors()` → win/loss check → `endGame()` or advance to the next row.

7. On-screen keyboard key colors track the best hint seen per letter across guesses (green > yellow > grey priority), via `keyColors`.

8. **endGame(won)** derives the number of tries as `currentRow + 1` (`currentRow` is not advanced on the word-ending guess, so a loss gives 6), records the result (`results.push(...)`), builds the result message via `buildResultMessage({ won, guessCount, target, reference })` (with optional Clarisse/David comparison), and shows either a "Mot suivant" button (to advance to the next word in the sublist) or a "Voir le récap" button (after the 6th word, to jump to the recap screen).

9. **Launch animation** — "Voir le récap" runs `playLaunchAnimation()` (from `animation.js`) and only calls `showRecap()` when it resolves. The recap also carries a "Rejouer l'animation 🚀" button that replays it. See below.

10. **Recap screen** displays all 6 words played with their results (word, win/loss label, and tries used as `N/6`) after the final word.

### Launch animation

A dinosaur with Selki's head rides a rocket off the launch pad, and its exhaust billows into an **inverted** Pythagoras tree — rooted at the nozzle and spreading downward — whose every square is a cut-out of Selki's head. Roughly: countdown to 1.4s, ignition and screen shake to 2.0s, the rocket climbs dragging the plume up behind it while new levels bloom to 6.8s, rocket exits in a spark burst to 7.4s, the plume thrashes and settles to 9.2s, fade to the recap at 10s.

Notes on why it is built the way it is:

- **One canvas, one RAF loop.** Sky, stars, exhaust, tree, and sparks all paint into `#launch-canvas`; only the dino-on-a-rocket is a DOM element (an inline SVG positioned each frame with a `transform`). Phones are the primary device, so this stays at one compositing layer.
- **`selki_5.png` is decoded once** into a 256px offscreen buffer at preload; the ~255 squares each `drawImage` from that buffer rather than re-sampling a 900×900 PNG.
- **The border is a soft glow baked into that buffer, not a stroked rectangle.** The source is a cut-out on transparency, so a rectangle would box in a floating head. A hard dilated outline is no good either: Selki's chest runs off the bottom of the source frame, and dilating that straight alpha edge draws a white bar across every square. `featherEdges()` fades the frame edges first, then a shadow-blur pass lays a glow that follows the fur and turns the crop into a wisp.
- **`TREE_ROTATION` is π, so every square is upside down.** `paintTree()` spins the texture back about each square's centre — Selki stays the right way up while each square keeps the tilt of the branch carrying it.
- **Heads are overdrawn past their squares** (`HEAD_OVERDRAW`). A cut-out fills maybe two thirds of its square, so squares drawn to size leave the plume looking like scattered stickers instead of one mass.
- **The sky gradient and ground are rasterised once per resize** into a second buffer and blitted. Re-evaluating a full-screen gradient every frame cost as much as the entire tree.
- **The root square is stuck to the rocket's nozzle and rides up with it.** `fitTree()` therefore returns the tree's *shape* (base size, plus `centerX` and `minY` in base-size units) rather than a fixed origin; `treeOrigin()` places the root each frame at the nozzle, which `placeCraft()` derives by walking back up through the craft's own scale and tilt from its anchor at the SVG's bottom edge. Once the rocket climbs past the height the plume settles at, `pinnedOrigin` freezes it there — the smoke stops following and lingers. The pin is seamless because `centerX` and `minY` are both exactly 0 for this tree, so the frozen origin is just `topY` and there is no sideways jump.
- **The tree is fitted to the viewport at rest**, not across the sway range — fitting for a hard lean would leave the tree at a third of its size on a portrait phone. Instead the tree pulls in (`SWAY_RECOIL`) as it thrashes, which keeps it in frame and reads as a recoil. It is allowed to overflow the viewport width by 1.9× — a 45-degree tree is ~1.5× wider than it is tall, so a plume that fills a portrait screen has to run off both sides.
- **Depth adapts to the device.** `maxDepthFor()` picks 7/8/9 by viewport width, and a budget check samples 40 frames *after the tree is on screen* (sampling during the countdown would measure a bare sky and tell you nothing) and sheds a level or two if the median frame is slow. It runs two rounds, because shedding two levels is not always enough and one measurement cannot tell whether it was.
- **It can never trap a guest.** A failed image load, a missing 2d context, `prefers-reduced-motion: reduce`, or a 12.5s watchdog each resolve the promise so the recap still appears. Body scroll is locked while it plays and restored on every exit path.
