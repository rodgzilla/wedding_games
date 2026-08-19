# Wordle Sublists & Timer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the existing infinite-random-word Wordle clone into a sequential 6-word set per guest, with a per-word timer compared against Clarisse's (bride) and David's (groom) recorded times.

**Architecture:** Extract all pure/testable logic (feedback scoring, word-list/sublist/reference-time parsing, time formatting, result-message building) into a new `logic.js` ES module with an automated `node:test` suite. `game.js` becomes an ES module that imports from `logic.js` and keeps all DOM/fetch/timer orchestration, restructured around a sequential 6-word sublist instead of an infinite single-word loop.

**Tech Stack:** Plain HTML5/CSS3/vanilla JS ES modules, no build step, no runtime dependencies. Node's built-in test runner (`node:test`, `node:assert/strict`) for automated tests — no npm packages.

**Spec:** `docs/superpowers/specs/2026-08-19-wordle-sublists-timer-design.md`

## Global Constraints

- Language: French throughout (all UI text and messages), matching the base game.
- Keyboard layout: AZERTY (unchanged).
- Max guesses per word: 6 (unchanged).
- No external libraries or frameworks for game code.
- Must work on mobile and desktop browsers.
- Local testing: `python3 -m http.server` inside `wordle_game/` (required — `fetch()` needs HTTP).
- Guess validation: union of `dictionary.txt`, its accent-stripped form, and all words across all sublists (unchanged logic, different source for the word pool).
- `words.txt` format: groups of exactly 6 words, separated by one or more blank lines. One random group is picked per page load (no persistence — a reload picks a fresh random sublist).
- `reference_times.txt` format: `WORD,NAME,SECONDS` per line, `NAME` is `CLARISSE` or `DAVID`, exactly one reference time per word (or none).
- Timer: not running while the guest composes their first guess; starts the instant their first *valid* guess for a word is submitted; stops the instant the deciding guess (win, or the 6th failed guess) is submitted — before the reveal animation plays. Elapsed time is rounded down to whole seconds (`Math.floor`).
- Time display format: `MmSS` (e.g. `2mn48`, `0mn05`) via `formatTime`.
- After the 6th word, show a recap screen (word/result/time per row) with no replay — a dead end.
- **Spec deviation (technical necessity):** Node's built-in test runner requires ES module syntax (`import`/`export`) to resolve consistently, which plain `.js` files only get from a `package.json` with `"type": "module"` in an ancestor directory (the alternative, `.mjs` extensions, risks the wrong MIME type from `python3 -m http.server` and breaking `<script type="module">` in-browser). Task 1 therefore adds a minimal `wordle_game/package.json` containing only `{"type": "module"}` — no dependencies, no `npm install`, nothing to install. This keeps file names matching the spec (`logic.js`, `logic.test.js`) and preserves the zero-dependency, zero-build-step nature of the project.

---

### Task 1: ES module setup and `computeFeedback` extraction

**Files:**
- Create: `wordle_game/package.json`
- Create: `wordle_game/logic.js`
- Create: `wordle_game/logic.test.js`
- Modify: `wordle_game/game.js` (remove local `computeFeedback`, add import)
- Modify: `wordle_game/index.html:135` (script tag becomes `type="module"`)

**Interfaces:**
- Produces: `computeFeedback(guess: string, target: string): string[]` — exported from `logic.js`, identical behavior to the current in-file version.

- [ ] **Step 1: Write the failing test file**

Create `wordle_game/logic.test.js`:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeFeedback } from './logic.js';

test('computeFeedback: all green', () => {
  assert.deepStrictEqual(computeFeedback('NOCES', 'NOCES'), ['green', 'green', 'green', 'green', 'green']);
});

test('computeFeedback: all grey', () => {
  assert.deepStrictEqual(computeFeedback('ABCDE', 'FGHIJ'), ['grey', 'grey', 'grey', 'grey', 'grey']);
});

test('computeFeedback: green matches take priority over duplicate-letter yellows', () => {
  assert.deepStrictEqual(computeFeedback('NONNE', 'NOCES'), ['green', 'green', 'grey', 'grey', 'yellow']);
});

test('computeFeedback: yellow and green can both appear for a repeated letter', () => {
  assert.deepStrictEqual(computeFeedback('AABBB', 'BAAAA'), ['yellow', 'green', 'yellow', 'grey', 'grey']);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test wordle_game/*.test.js`
Expected: FAIL — `logic.js` doesn't exist yet (module not found), or a syntax error if Node can't parse `import`/`export` without the module marker.

- [ ] **Step 3: Create `wordle_game/package.json`**

```json
{
  "name": "wedding-wordle",
  "private": true,
  "type": "module"
}
```

- [ ] **Step 4: Create `wordle_game/logic.js` with `computeFeedback`**

```javascript
export function computeFeedback(guess, target) {
  const result = Array(guess.length).fill('grey');
  const targetLetters = target.split('');
  const guessLetters = guess.split('');
  for (let i = 0; i < guess.length; i++) {
    if (guessLetters[i] === targetLetters[i]) {
      result[i] = 'green';
      targetLetters[i] = null;
      guessLetters[i] = null;
    }
  }
  for (let i = 0; i < guess.length; i++) {
    if (guessLetters[i] === null) continue;
    const j = targetLetters.indexOf(guessLetters[i]);
    if (j !== -1) {
      result[i] = 'yellow';
      targetLetters[j] = null;
    }
  }
  return result;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `node --test wordle_game/*.test.js`
Expected: PASS (4 tests, 0 failures)

- [ ] **Step 6: Wire `game.js` to import from `logic.js`, and switch the script tag to a module**

In `wordle_game/game.js`, delete the local `computeFeedback` function definition (currently the block starting `function computeFeedback(guess, target) {` under the `// ── Guess logic` comment), and add this import at the very top of the file, before `const MAX_GUESSES = 6;`:

```javascript
import { computeFeedback } from './logic.js';
```

In `wordle_game/index.html:135`, change:

```html
<script src="game.js"></script>
```

to:

```html
<script type="module" src="game.js"></script>
```

- [ ] **Step 7: Manually verify the game still works unchanged**

```bash
cd wordle_game && python3 -m http.server 8000
```

Open `http://localhost:8000`. Play one full round (win or lose) exactly as before — grid, keyboard, colors, "Rejouer" should all behave identically to before this task. Check the browser console for errors (module loading, import resolution).

- [ ] **Step 8: Commit**

```bash
git add wordle_game/package.json wordle_game/logic.js wordle_game/logic.test.js wordle_game/game.js wordle_game/index.html
git commit -m "refactor: extract computeFeedback into a tested logic.js ES module"
```

---

### Task 2: `parseWordList`

**Files:**
- Modify: `wordle_game/logic.js`
- Modify: `wordle_game/logic.test.js`

**Interfaces:**
- Consumes: nothing new
- Produces: `parseWordList(text: string): string[]` — trims, uppercases, and filters blank lines from newline-separated text.

- [ ] **Step 1: Write the failing test**

Add to `wordle_game/logic.test.js`:

```javascript
import { computeFeedback, parseWordList } from './logic.js';

test('parseWordList trims, uppercases, and drops blank lines', () => {
  const text = ' amour \n\nvoile \n  \nfleur\n';
  assert.deepStrictEqual(parseWordList(text), ['AMOUR', 'VOILE', 'FLEUR']);
});
```

(Update the existing `import { computeFeedback } from './logic.js';` line to include `parseWordList` in the same import, as shown above — don't add a second import line.)

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test wordle_game/*.test.js`
Expected: FAIL — `parseWordList` is not exported from `logic.js`.

- [ ] **Step 3: Implement `parseWordList` in `logic.js`**

```javascript
export function parseWordList(text) {
  return text.split('\n')
    .map(w => w.trim().toUpperCase())
    .filter(w => w.length > 0);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test wordle_game/*.test.js`
Expected: PASS (5 tests, 0 failures)

- [ ] **Step 5: Commit**

```bash
git add wordle_game/logic.js wordle_game/logic.test.js
git commit -m "feat: add parseWordList to logic.js"
```

---

### Task 3: `parseSublists`

**Files:**
- Modify: `wordle_game/logic.js`
- Modify: `wordle_game/logic.test.js`

**Interfaces:**
- Consumes: `parseWordList(text: string): string[]` (Task 2, used internally)
- Produces: `parseSublists(text: string): string[][]` — splits text into blank-line-separated groups, each parsed with `parseWordList`; drops empty groups.

- [ ] **Step 1: Write the failing tests**

Add to `wordle_game/logic.test.js` (extend the import line to include `parseSublists`):

```javascript
test('parseSublists groups words into blank-line-separated sublists', () => {
  const text = 'amour\nvoile\nfleur\nunion\nbague\nnoces\n\nepoux\nvoeux\nchoux\ndanse\nouiii\nbiere\n';
  assert.deepStrictEqual(parseSublists(text), [
    ['AMOUR', 'VOILE', 'FLEUR', 'UNION', 'BAGUE', 'NOCES'],
    ['EPOUX', 'VOEUX', 'CHOUX', 'DANSE', 'OUIII', 'BIERE'],
  ]);
});

test('parseSublists ignores multiple blank lines and leading/trailing blank lines', () => {
  const text = '\n\nAMOUR\nVOILE\n\n\n\nFLEUR\nUNION\n\n';
  assert.deepStrictEqual(parseSublists(text), [
    ['AMOUR', 'VOILE'],
    ['FLEUR', 'UNION'],
  ]);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test wordle_game/*.test.js`
Expected: FAIL — `parseSublists` is not exported from `logic.js`.

- [ ] **Step 3: Implement `parseSublists` in `logic.js`**

```javascript
export function parseSublists(text) {
  return text
    .split(/\n\s*\n/)
    .map(parseWordList)
    .filter(group => group.length > 0);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test wordle_game/*.test.js`
Expected: PASS (7 tests, 0 failures)

- [ ] **Step 5: Commit**

```bash
git add wordle_game/logic.js wordle_game/logic.test.js
git commit -m "feat: add parseSublists to logic.js"
```

---

### Task 4: `pickRandomSublist`

**Files:**
- Modify: `wordle_game/logic.js`
- Modify: `wordle_game/logic.test.js`

**Interfaces:**
- Consumes: nothing new
- Produces: `pickRandomSublist(sublists: string[][], randomFn?: () => number): string[]` — picks one sublist at random; `randomFn` defaults to `Math.random` but is injectable for deterministic tests.

- [ ] **Step 1: Write the failing test**

Add to `wordle_game/logic.test.js` (extend the import to include `pickRandomSublist`):

```javascript
test('pickRandomSublist selects based on the injected random function', () => {
  const sublists = [['A'], ['B'], ['C']];
  assert.deepStrictEqual(pickRandomSublist(sublists, () => 0), ['A']);
  assert.deepStrictEqual(pickRandomSublist(sublists, () => 0.5), ['B']);
  assert.deepStrictEqual(pickRandomSublist(sublists, () => 0.99), ['C']);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test wordle_game/*.test.js`
Expected: FAIL — `pickRandomSublist` is not exported from `logic.js`.

- [ ] **Step 3: Implement `pickRandomSublist` in `logic.js`**

```javascript
export function pickRandomSublist(sublists, randomFn = Math.random) {
  return sublists[Math.floor(randomFn() * sublists.length)];
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test wordle_game/*.test.js`
Expected: PASS (8 tests, 0 failures)

- [ ] **Step 5: Commit**

```bash
git add wordle_game/logic.js wordle_game/logic.test.js
git commit -m "feat: add pickRandomSublist to logic.js"
```

---

### Task 5: `parseReferenceTimes`

**Files:**
- Modify: `wordle_game/logic.js`
- Modify: `wordle_game/logic.test.js`

**Interfaces:**
- Consumes: nothing new
- Produces: `parseReferenceTimes(text: string): Map<string, { name: 'CLARISSE' | 'DAVID', seconds: number }>`

- [ ] **Step 1: Write the failing tests**

Add to `wordle_game/logic.test.js` (extend the import to include `parseReferenceTimes`):

```javascript
test('parseReferenceTimes parses word/name/seconds lines into a Map', () => {
  const text = 'AMOUR,CLARISSE,168\nNOCES,DAVID,95\n';
  const result = parseReferenceTimes(text);
  assert.strictEqual(result.size, 2);
  assert.deepStrictEqual(result.get('AMOUR'), { name: 'CLARISSE', seconds: 168 });
  assert.deepStrictEqual(result.get('NOCES'), { name: 'DAVID', seconds: 95 });
});

test('parseReferenceTimes skips blank lines and trims/uppercases fields', () => {
  const text = '\n  amour , clarisse , 168 \n\n';
  const result = parseReferenceTimes(text);
  assert.strictEqual(result.size, 1);
  assert.deepStrictEqual(result.get('AMOUR'), { name: 'CLARISSE', seconds: 168 });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test wordle_game/*.test.js`
Expected: FAIL — `parseReferenceTimes` is not exported from `logic.js`.

- [ ] **Step 3: Implement `parseReferenceTimes` in `logic.js`**

```javascript
export function parseReferenceTimes(text) {
  const map = new Map();
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parts = trimmed.split(',').map(p => p.trim());
    if (parts.length !== 3) continue;
    const [word, name, secondsStr] = parts;
    const seconds = Number(secondsStr);
    if (!word || !name || !Number.isFinite(seconds)) continue;
    map.set(word.toUpperCase(), { name: name.toUpperCase(), seconds });
  }
  return map;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test wordle_game/*.test.js`
Expected: PASS (10 tests, 0 failures)

- [ ] **Step 5: Commit**

```bash
git add wordle_game/logic.js wordle_game/logic.test.js
git commit -m "feat: add parseReferenceTimes to logic.js"
```

---

### Task 6: `formatTime`

**Files:**
- Modify: `wordle_game/logic.js`
- Modify: `wordle_game/logic.test.js`

**Interfaces:**
- Consumes: nothing new
- Produces: `formatTime(seconds: number): string` — formats whole seconds as `MmSS` (minutes not zero-padded, seconds zero-padded to 2 digits).

- [ ] **Step 1: Write the failing test**

Add to `wordle_game/logic.test.js` (extend the import to include `formatTime`):

```javascript
test('formatTime formats seconds as MmSS', () => {
  assert.strictEqual(formatTime(168), '2mn48');
  assert.strictEqual(formatTime(0), '0mn00');
  assert.strictEqual(formatTime(5), '0mn05');
  assert.strictEqual(formatTime(60), '1mn00');
  assert.strictEqual(formatTime(725), '12mn05');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test wordle_game/*.test.js`
Expected: FAIL — `formatTime` is not exported from `logic.js`.

- [ ] **Step 3: Implement `formatTime` in `logic.js`**

```javascript
export function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}mn${String(remainingSeconds).padStart(2, '0')}`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test wordle_game/*.test.js`
Expected: PASS (11 tests, 0 failures)

- [ ] **Step 5: Commit**

```bash
git add wordle_game/logic.js wordle_game/logic.test.js
git commit -m "feat: add formatTime to logic.js"
```

---

### Task 7: `buildResultMessage`

**Files:**
- Modify: `wordle_game/logic.js`
- Modify: `wordle_game/logic.test.js`

**Interfaces:**
- Consumes: `formatTime(seconds: number): string` (Task 6, used internally)
- Produces: `buildResultMessage({ won: boolean, elapsedSeconds: number, target: string, reference?: { name: 'CLARISSE' | 'DAVID', seconds: number } }): string`

- [ ] **Step 1: Write the failing tests**

Add to `wordle_game/logic.test.js` (extend the import to include `buildResultMessage`):

```javascript
test('buildResultMessage: win with no reference data', () => {
  const msg = buildResultMessage({ won: true, elapsedSeconds: 168, target: 'AMOUR', reference: undefined });
  assert.strictEqual(msg, 'Tu as deviné le mot en 2mn48 !');
});

test('buildResultMessage: win, faster than Clarisse', () => {
  const msg = buildResultMessage({
    won: true, elapsedSeconds: 100, target: 'AMOUR',
    reference: { name: 'CLARISSE', seconds: 168 },
  });
  assert.strictEqual(
    msg,
    "Tu as deviné le mot en 1mn40 ! Clarisse l'a deviné en 2mn48, tu étais plus rapide qu'elle, félicitations !"
  );
});

test('buildResultMessage: win, faster than David', () => {
  const msg = buildResultMessage({
    won: true, elapsedSeconds: 100, target: 'AMOUR',
    reference: { name: 'DAVID', seconds: 168 },
  });
  assert.strictEqual(
    msg,
    "Tu as deviné le mot en 1mn40 ! David l'a deviné en 2mn48, tu étais plus rapide que lui, félicitations !"
  );
});

test('buildResultMessage: win, slower than Clarisse', () => {
  const msg = buildResultMessage({
    won: true, elapsedSeconds: 200, target: 'AMOUR',
    reference: { name: 'CLARISSE', seconds: 168 },
  });
  assert.strictEqual(
    msg,
    "Tu as deviné le mot en 3mn20 ! Clarisse l'a deviné en 2mn48, elle était plus rapide que toi !"
  );
});

test('buildResultMessage: win, slower than David', () => {
  const msg = buildResultMessage({
    won: true, elapsedSeconds: 200, target: 'AMOUR',
    reference: { name: 'DAVID', seconds: 168 },
  });
  assert.strictEqual(
    msg,
    "Tu as deviné le mot en 3mn20 ! David l'a deviné en 2mn48, il était plus rapide que toi !"
  );
});

test('buildResultMessage: win, tie', () => {
  const msg = buildResultMessage({
    won: true, elapsedSeconds: 168, target: 'AMOUR',
    reference: { name: 'DAVID', seconds: 168 },
  });
  assert.strictEqual(
    msg,
    "Tu as deviné le mot en 2mn48 ! David l'a deviné exactement dans le même temps !"
  );
});

test('buildResultMessage: loss with no reference data', () => {
  const msg = buildResultMessage({ won: false, elapsedSeconds: 300, target: 'AMOUR', reference: undefined });
  assert.strictEqual(msg, "Le mot était : AMOUR. Tu as mis 5mn00 avant d'être à court d'essais.");
});

test('buildResultMessage: loss with reference data', () => {
  const msg = buildResultMessage({
    won: false, elapsedSeconds: 300, target: 'AMOUR',
    reference: { name: 'CLARISSE', seconds: 168 },
  });
  assert.strictEqual(
    msg,
    "Le mot était : AMOUR. Tu as mis 5mn00 avant d'être à court d'essais. Clarisse l'a deviné en 2mn48."
  );
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test wordle_game/*.test.js`
Expected: FAIL — `buildResultMessage` is not exported from `logic.js`.

- [ ] **Step 3: Implement `buildResultMessage` in `logic.js`**

```javascript
const DISPLAY_NAME = { CLARISSE: 'Clarisse', DAVID: 'David' };
const FASTER_THAN_PHRASE = {
  CLARISSE: "tu étais plus rapide qu'elle",
  DAVID: 'tu étais plus rapide que lui',
};
const SLOWER_THAN_PHRASE = {
  CLARISSE: 'elle était plus rapide que toi',
  DAVID: 'il était plus rapide que toi',
};

export function buildResultMessage({ won, elapsedSeconds, target, reference }) {
  const time = formatTime(elapsedSeconds);

  if (won) {
    let message = `Tu as deviné le mot en ${time} !`;
    if (reference) {
      const name = DISPLAY_NAME[reference.name];
      const refTime = formatTime(reference.seconds);
      if (elapsedSeconds < reference.seconds) {
        message += ` ${name} l'a deviné en ${refTime}, ${FASTER_THAN_PHRASE[reference.name]}, félicitations !`;
      } else if (elapsedSeconds > reference.seconds) {
        message += ` ${name} l'a deviné en ${refTime}, ${SLOWER_THAN_PHRASE[reference.name]} !`;
      } else {
        message += ` ${name} l'a deviné exactement dans le même temps !`;
      }
    }
    return message;
  }

  let message = `Le mot était : ${target}. Tu as mis ${time} avant d'être à court d'essais.`;
  if (reference) {
    const name = DISPLAY_NAME[reference.name];
    const refTime = formatTime(reference.seconds);
    message += ` ${name} l'a deviné en ${refTime}.`;
  }
  return message;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test wordle_game/*.test.js`
Expected: PASS (19 tests, 0 failures)

- [ ] **Step 5: Commit**

```bash
git add wordle_game/logic.js wordle_game/logic.test.js
git commit -m "feat: add buildResultMessage to logic.js"
```

---

### Task 8: Restructure `words.txt` into sublists, add `reference_times.txt`

**Files:**
- Modify: `wordle_game/words.txt` (regroup into blank-line-separated groups of 6, padded from 28 to 30 words)
- Create: `wordle_game/reference_times.txt`

**Interfaces:**
- Consumes: `parseSublists` (Task 3), `parseReferenceTimes` (Task 5) — used only for manual verification in this task, not modified here.
- Produces: the on-disk data files `game.js` will fetch starting in Task 9 (words) and Task 11 (reference times).

- [ ] **Step 1: Rewrite `wordle_game/words.txt`**

Replace the entire file content with the existing 28 words (unchanged) plus 2 new wedding-themed words to reach 30 (a multiple of 6), grouped into 5 blank-line-separated groups of 6, preserving the original order:

```
AMOUR
SELKI
VOILE
FLEUR
UNION
BAGUE

NOCES
EPOUX
VOEUX
CHOUX
DANSE
OUIII

BIERE
PHOTO
TEMOIN
ANNEAU
FIANCE
PUZZLE

BULLES
FESTIN
EMOTIF
IDYLLE
MAIRIE
AVENIR

BONHEUR
SOURIRE
BOUQUET
DRAGEES
MARIAGE
PROMESSE
```

- [ ] **Step 2: Verify the grouping with `parseSublists`**

```bash
node --input-type=module -e "
import { readFileSync } from 'node:fs';
import { parseSublists } from './wordle_game/logic.js';
const sublists = parseSublists(readFileSync('wordle_game/words.txt', 'utf8'));
console.log('groups:', sublists.length, 'sizes:', sublists.map(g => g.length));
"
```

Expected output: `groups: 5 sizes: [ 6, 6, 6, 6, 6 ]`

- [ ] **Step 3: Create `wordle_game/reference_times.txt`**

Placeholder times for all 30 words, alternating Clarisse/David — **these are example values the organiser must replace with real stopwatch-recorded times** before the wedding:

```
AMOUR,CLARISSE,95
SELKI,DAVID,142
VOILE,CLARISSE,63
FLEUR,DAVID,110
UNION,CLARISSE,88
BAGUE,DAVID,77
NOCES,CLARISSE,54
EPOUX,DAVID,133
VOEUX,CLARISSE,71
CHOUX,DAVID,60
DANSE,CLARISSE,99
OUIII,DAVID,150
BIERE,CLARISSE,45
PHOTO,DAVID,80
TEMOIN,CLARISSE,120
ANNEAU,DAVID,105
FIANCE,CLARISSE,90
PUZZLE,DAVID,160
BULLES,CLARISSE,58
FESTIN,DAVID,112
EMOTIF,CLARISSE,140
IDYLLE,DAVID,98
MAIRIE,CLARISSE,66
AVENIR,DAVID,130
BONHEUR,CLARISSE,102
SOURIRE,DAVID,89
BOUQUET,CLARISSE,115
DRAGEES,DAVID,125
MARIAGE,CLARISSE,108
PROMESSE,DAVID,145
```

- [ ] **Step 4: Verify parsing with `parseReferenceTimes`**

```bash
node --input-type=module -e "
import { readFileSync } from 'node:fs';
import { parseReferenceTimes } from './wordle_game/logic.js';
const map = parseReferenceTimes(readFileSync('wordle_game/reference_times.txt', 'utf8'));
console.log('entries:', map.size);
console.log('AMOUR:', map.get('AMOUR'));
"
```

Expected output: `entries: 30` and `AMOUR: { name: 'CLARISSE', seconds: 95 }`

- [ ] **Step 5: Commit**

```bash
git add wordle_game/words.txt wordle_game/reference_times.txt
git commit -m "feat: regroup words.txt into sublists and add placeholder reference_times.txt"
```

---

### Task 9: Sequential sublist progression and recap screen

**Files:**
- Modify: `wordle_game/index.html` (replace `#replay-btn` with `#next-btn`, add `#recap`, update CSS)
- Modify: `wordle_game/game.js` (sequential word progression, recap rendering)

**Interfaces:**
- Consumes: `parseWordList`, `parseSublists`, `pickRandomSublist` (Tasks 2–4)
- Produces: module-level state `sublist: string[]`, `wordIndex: number`, `results: {word: string, won: boolean}[]`; function `showRecap()`

- [ ] **Step 1: Update `wordle_game/index.html` markup**

Replace:

```html
  <div id="message"></div>
  <div id="grid"></div>
  <div id="keyboard"></div>
  <button id="replay-btn">Rejouer</button>
```

with:

```html
  <div id="message"></div>
  <div id="grid"></div>
  <div id="keyboard"></div>
  <button id="next-btn">Mot suivant</button>
  <div id="recap"></div>
```

- [ ] **Step 2: Update `wordle_game/index.html` CSS**

Replace:

```css
    #replay-btn {
      display: none;
      padding: 12px 28px;
      font-size: 1rem;
      font-weight: bold;
      background: #6aaa64;
      color: #fff;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }

    #replay-btn:hover { background: #538d4e; }
```

with:

```css
    #next-btn {
      display: none;
      padding: 12px 28px;
      font-size: 1rem;
      font-weight: bold;
      background: #6aaa64;
      color: #fff;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }

    #next-btn:hover { background: #538d4e; }

    #recap {
      display: none;
      flex-direction: column;
      gap: 8px;
      width: 100%;
      max-width: 400px;
      padding: 0 8px;
    }

    .recap-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 12px;
      border-radius: 4px;
      background: #f4f4f4;
      font-size: 0.95rem;
    }
```

- [ ] **Step 3: Rewire `wordle_game/game.js` startup and round flow**

Update the import line at the top:

```javascript
import { computeFeedback, parseWordList, parseSublists, pickRandomSublist } from './logic.js';
```

Add new module-level state next to the existing `let` declarations:

```javascript
let sublist = [];
let wordIndex = 0;
let results = [];
```

Replace `init()`:

```javascript
async function init() {
  const [wordsText, dictText] = await Promise.all([
    fetch('words.txt').then(r => r.text()),
    fetch('dictionary.txt').then(r => r.text()),
  ]);

  const sublists = parseSublists(wordsText);
  sublist = pickRandomSublist(sublists);
  words = sublists.flat();

  const dictWords = parseWordList(dictText);
  const stripped = dictWords.map(w => w.normalize('NFD').replace(/[̀-ͯ]/g, ''));
  validGuesses = new Set([...dictWords, ...stripped, ...words]);

  wordIndex = 0;
  results = [];
  startRound();
}
```

Replace `startRound()` (drop the `target = pickRandomWord();` line and the old show/hide of `replay-btn`, add showing/hiding of the grid/keyboard/recap):

```javascript
function startRound() {
  target = sublist[wordIndex];
  currentGuess = '';
  currentRow = 0;
  gameOver = false;
  keyColors = {};
  showMessage('');
  document.getElementById('next-btn').style.display = 'none';
  document.getElementById('recap').style.display = 'none';
  document.getElementById('grid').style.display = 'flex';
  document.getElementById('keyboard').style.display = 'flex';
  renderGrid();
  renderKeyboard();
}
```

Delete the `pickRandomWord()` function entirely (no longer used).

- [ ] **Step 4: Replace `endGame` and the button wiring**

Replace:

```javascript
function endGame(won) {
  gameOver = true;
  showMessage(won ? 'Bravo !' : `Le mot était : ${target}`);
  document.getElementById('replay-btn').style.display = 'inline-block';
}

document.getElementById('replay-btn').addEventListener('click', startRound);
```

with:

```javascript
function endGame(won) {
  gameOver = true;
  results.push({ word: target, won });
  showMessage(won ? 'Bravo !' : `Le mot était : ${target}`);
  const isLastWord = wordIndex === sublist.length - 1;
  const nextBtn = document.getElementById('next-btn');
  nextBtn.textContent = isLastWord ? 'Voir le récap' : 'Mot suivant';
  nextBtn.style.display = 'inline-block';
}

document.getElementById('next-btn').addEventListener('click', () => {
  if (wordIndex === sublist.length - 1) {
    showRecap();
  } else {
    wordIndex++;
    startRound();
  }
});

function showRecap() {
  document.getElementById('grid').style.display = 'none';
  document.getElementById('keyboard').style.display = 'none';
  document.getElementById('next-btn').style.display = 'none';
  showMessage('');
  const recap = document.getElementById('recap');
  recap.innerHTML = '';
  results.forEach(r => {
    const row = document.createElement('div');
    row.className = 'recap-row';
    row.textContent = `${r.word} — ${r.won ? 'réussi' : 'échoué'}`;
    recap.appendChild(row);
  });
  recap.style.display = 'flex';
}
```

- [ ] **Step 5: Manually verify the full sequence**

```bash
cd wordle_game && python3 -m http.server 8000
```

Open `http://localhost:8000`. Play through all 6 words in the assigned sublist, mixing at least one win and one loss:
- After each of the first 5 words, confirm a **"Mot suivant"** button appears and advances to the next word (fresh grid/keyboard, colors reset).
- After the 6th word, confirm the button reads **"Voir le récap"**.
- Clicking it hides the grid/keyboard/button and shows a recap list of 6 rows, each showing the word and "réussi"/"échoué" matching what actually happened.
- Reload the page — confirm a new random sublist is assigned and the sequence restarts from word 1.

- [ ] **Step 6: Commit**

```bash
git add wordle_game/index.html wordle_game/game.js
git commit -m "feat: sequential sublist progression with end-of-set recap screen"
```

---

### Task 10: Live per-word timer

**Files:**
- Modify: `wordle_game/index.html` (add `#timer` element and CSS)
- Modify: `wordle_game/game.js` (timer start/stop/display, recap includes time)

**Interfaces:**
- Consumes: `formatTime(seconds: number): string` (Task 6)
- Produces: module-level state `timerStart: number | null`, `timerIntervalId: number | null`, `elapsedSeconds: number`; functions `startTimer()`, `stopTimer()`, `updateTimerDisplay()`

- [ ] **Step 1: Add the timer element to `wordle_game/index.html`**

Replace:

```html
  <div id="message"></div>
  <div id="grid"></div>
```

with:

```html
  <div id="message"></div>
  <div id="timer"></div>
  <div id="grid"></div>
```

- [ ] **Step 2: Add timer CSS to `wordle_game/index.html`**

Add after the `#message` rule:

```css
    #timer {
      font-size: 0.9rem;
      font-weight: bold;
      min-height: 1.2em;
      color: #333;
    }
```

- [ ] **Step 3: Update `wordle_game/game.js` imports and state**

Update the import line:

```javascript
import { computeFeedback, parseWordList, parseSublists, pickRandomSublist, formatTime } from './logic.js';
```

Add new module-level state:

```javascript
let timerStart = null;
let timerIntervalId = null;
let elapsedSeconds = 0;
```

- [ ] **Step 4: Reset the timer in `startRound()`**

Add these lines inside `startRound()`, right after `keyColors = {};`:

```javascript
  if (timerIntervalId !== null) {
    clearInterval(timerIntervalId);
    timerIntervalId = null;
  }
  timerStart = null;
  elapsedSeconds = 0;
  document.getElementById('timer').textContent = '';
```

- [ ] **Step 5: Add `startTimer`, `stopTimer`, `updateTimerDisplay`**

Add these functions near `submitGuess` (e.g. right before it, under the `// ── Guess logic` comment):

```javascript
function startTimer() {
  timerStart = Date.now();
  timerIntervalId = setInterval(updateTimerDisplay, 1000);
  updateTimerDisplay();
}

function stopTimer() {
  clearInterval(timerIntervalId);
  timerIntervalId = null;
  elapsedSeconds = Math.floor((Date.now() - timerStart) / 1000);
  updateTimerDisplay();
}

function updateTimerDisplay() {
  const seconds = timerStart === null ? 0 : Math.floor((Date.now() - timerStart) / 1000);
  document.getElementById('timer').textContent = formatTime(seconds);
}
```

- [ ] **Step 6: Start/stop the timer around guess submission in `submitGuess()`**

Replace the body of `submitGuess()`:

```javascript
function submitGuess() {
  if (currentGuess.length < target.length) {
    shakeRow(currentRow);
    return;
  }
  if (!validGuesses.has(currentGuess)) {
    shakeRow(currentRow);
    showMessage('Mot non reconnu');
    clearTimeout(messageTimeoutId);
    messageTimeoutId = setTimeout(() => showMessage(''), 1500);
    return;
  }
  if (timerStart === null) {
    startTimer();
  }
  clearTimeout(messageTimeoutId);
  showMessage('');
  const feedback = computeFeedback(currentGuess, target);
  const won = feedback.every(f => f === 'green');
  if (won || currentRow === MAX_GUESSES - 1) {
    stopTimer();
  }
  revealRow(currentRow, currentGuess, feedback, () => {
    updateKeyboardColors(currentGuess, feedback);
    if (won) {
      endGame(true);
    } else if (currentRow === MAX_GUESSES - 1) {
      endGame(false);
    } else {
      currentRow++;
      currentGuess = '';
    }
  });
}
```

- [ ] **Step 7: Record elapsed time in results and show it in the recap**

In `endGame(won)`, change:

```javascript
  results.push({ word: target, won });
```

to:

```javascript
  results.push({ word: target, won, elapsedSeconds });
```

In `showRecap()`, change:

```javascript
    row.textContent = `${r.word} — ${r.won ? 'réussi' : 'échoué'}`;
```

to:

```javascript
    row.textContent = `${r.word} — ${r.won ? 'réussi' : 'échoué'} — ${formatTime(r.elapsedSeconds)}`;
```

- [ ] **Step 8: Manually verify the timer**

```bash
cd wordle_game && python3 -m http.server 8000
```

Open `http://localhost:8000`. Confirm:
- The `#timer` area is empty and no clock is running while you take your time before the first guess.
- Submitting the first guess starts a visible mm:ss clock that updates every second.
- Winning or exhausting all 6 guesses freezes the timer at its final value (it does not keep counting during the tile-flip animation).
- The recap screen (after word 6) shows a time for every word.

- [ ] **Step 9: Commit**

```bash
git add wordle_game/index.html wordle_game/game.js
git commit -m "feat: add live per-word timer starting on the first valid guess"
```

---

### Task 11: Reference-time comparison messaging

**Files:**
- Modify: `wordle_game/game.js` (fetch/parse `reference_times.txt`, use `buildResultMessage`)

**Interfaces:**
- Consumes: `parseReferenceTimes(text: string): Map<...>` (Task 5), `buildResultMessage({...}): string` (Task 7)
- Produces: module-level state `referenceTimes: Map<string, {name, seconds}>`

- [ ] **Step 1: Update the import line**

```javascript
import {
  computeFeedback,
  parseWordList,
  parseSublists,
  pickRandomSublist,
  formatTime,
  parseReferenceTimes,
  buildResultMessage,
} from './logic.js';
```

- [ ] **Step 2: Add module-level state**

```javascript
let referenceTimes = new Map();
```

- [ ] **Step 3: Fetch and parse `reference_times.txt` in `init()`**

Replace:

```javascript
async function init() {
  const [wordsText, dictText] = await Promise.all([
    fetch('words.txt').then(r => r.text()),
    fetch('dictionary.txt').then(r => r.text()),
  ]);
```

with:

```javascript
async function init() {
  const [wordsText, dictText, refTimesText] = await Promise.all([
    fetch('words.txt').then(r => r.text()),
    fetch('dictionary.txt').then(r => r.text()),
    fetch('reference_times.txt').then(r => r.text()),
  ]);
```

and, right after `validGuesses = new Set([...dictWords, ...stripped, ...words]);`, add:

```javascript
  referenceTimes = parseReferenceTimes(refTimesText);
```

- [ ] **Step 4: Build the result message with the reference comparison in `endGame`**

Replace:

```javascript
  showMessage(won ? 'Bravo !' : `Le mot était : ${target}`);
```

with:

```javascript
  const reference = referenceTimes.get(target);
  showMessage(buildResultMessage({ won, elapsedSeconds, target, reference }));
```

- [ ] **Step 5: Manually verify the messaging**

```bash
cd wordle_game && python3 -m http.server 8000
```

Open `http://localhost:8000`. Play through the assigned words (every word in `words.txt` currently has a `reference_times.txt` entry, so every result message should include a comparison sentence):
- Win a word quickly (well under the placeholder reference time) — confirm the "faster" phrasing with the correct name and gendered pronoun.
- Win a word slowly (wait past the placeholder reference time before guessing) — confirm the "slower" phrasing.
- Exhaust all 6 guesses on a word — confirm the loss message includes the word, your time, and the reference comparison.
- Temporarily delete one line from `wordle_game/reference_times.txt`, reload until you're assigned a sublist containing that word, and confirm the message for that word has no comparison sentence — then restore the deleted line.

- [ ] **Step 6: Commit**

```bash
git add wordle_game/game.js
git commit -m "feat: compare guest time against Clarisse/David reference times in result messages"
```

---

### Task 12: Update `CLAUDE.md` and final full playtest

**Files:**
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: nothing
- Produces: updated project documentation

- [ ] **Step 1: Update the Commands section**

In `CLAUDE.md`, after the existing "Serve locally" command block, add:

```markdown
Run the automated tests (Node's built-in test runner, no dependencies):

\`\`\`bash
node --test wordle_game/*.test.js
\`\`\`
```

- [ ] **Step 2: Update the Architecture section**

Revise `CLAUDE.md`'s Architecture section to reflect:
- `wordle_game/logic.js` holds pure, unit-tested logic (`computeFeedback`, `parseWordList`, `parseSublists`, `pickRandomSublist`, `parseReferenceTimes`, `formatTime`, `buildResultMessage`); `wordle_game/game.js` is now an ES module (`<script type="module">`) that imports from it and owns all DOM/fetch/timer orchestration.
- `wordle_game/logic.test.js` unit-tests `logic.js` with `node:test`; `wordle_game/package.json` exists solely to mark the directory as ES modules (`"type": "module"`) for Node — no dependencies, no `npm install`.
- `words.txt` is now blank-line-separated groups of 6 words (sublists); one sublist is picked at random per page load (no persistence) and played sequentially, word by word, via a "Mot suivant" button, ending in a recap screen — not an infinite loop of random single words.
- `reference_times.txt` holds one `WORD,NAME,SECONDS` line per word (`NAME` is `CLARISSE` or `DAVID`) — Clarisse and David's own recorded times, hand-edited by the organiser, used to build the "faster/slower/tie" comparison sentence in each word's result message.
- The per-word timer starts on the first valid guess (not on word start) and stops the instant the deciding guess is submitted, before the reveal animation.

- [ ] **Step 3: Full manual playtest**

```bash
cd wordle_game && python3 -m http.server 8000
```

Play at least two complete sessions end-to-end (reload between them to get a different random sublist), covering: a mix of wins and losses across the 6 words, an unrecognized-word rejection, a too-short submission, the live timer starting only after the first valid guess, and the final recap screen. Confirm no console errors.

- [ ] **Step 4: Run the full automated test suite one last time**

Run: `node --test wordle_game/*.test.js`
Expected: PASS (19 tests, 0 failures)

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: document logic.js/game.js split, sublists, timer, and reference times"
```
