# Wedding Wordle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a French-language Wordle clone for wedding guests, playable on any device via a static website (GitHub Pages), with a user-editable word list.

**Architecture:** A single-page browser app with zero dependencies. `index.html` holds the HTML structure and all CSS; `game.js` holds all game logic and DOM manipulation; `words.txt` is fetched at startup and parsed into a word list.

**Tech Stack:** Plain HTML5, CSS3, vanilla JavaScript (ES2020). No build step. Hosted on GitHub Pages.

## Global Constraints

- Language: French throughout (all UI text and messages)
- Keyboard layout: AZERTY
- Word lengths: variable — determined per round by the picked word
- Max guesses per round: 6
- No external libraries or frameworks
- Must work on mobile browsers (touch) and desktop browsers
- Local testing: `python3 -m http.server` inside `wordle_game/` (required — `fetch()` needs HTTP)

---

### Task 1: Project scaffold and word list

**Files:**
- Create: `wordle_game/words.txt`
- Create: `wordle_game/index.html` (empty shell — content added in Task 2)
- Create: `wordle_game/game.js` (empty stub — content added in Tasks 3–6)

**Interfaces:**
- Produces: a `wordle_game/` directory on a `wordle-game` git branch, ready to develop in

- [ ] **Step 1: Create the git branch and worktree**

Run from the repo root (`/home/rodgzilla/Documents/wedding_games`):

```bash
git branch wordle-game
git worktree add ../wedding_games_wordle wordle-game
cd ../wedding_games_wordle
```

All subsequent tasks are executed from inside `../wedding_games_wordle`.

- [ ] **Step 2: Create the directory and placeholder files**

```bash
mkdir wordle_game
```

Create `wordle_game/words.txt` with sample French words (one per line — the organiser will replace these):

```
AMOUR
NOCES
ROBE
VOEUX
ALLIANCE
MARIAGE
BOUQUET
CHAMPAGNE
PROMESSE
BONHEUR
```

Create `wordle_game/index.html` with a minimal stub:

```html
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Wordle</title>
</head>
<body>
  <script src="game.js"></script>
</body>
</html>
```

Create `wordle_game/game.js` as an empty file.

- [ ] **Step 3: Verify the structure**

```bash
ls wordle_game/
# Expected: game.js  index.html  words.txt
```

- [ ] **Step 4: Commit**

```bash
git add wordle_game/
git commit -m "feat: scaffold wordle_game directory with word list stub"
```

---

### Task 2: HTML structure and CSS

**Files:**
- Modify: `wordle_game/index.html` (replace stub with full markup + all styles)

**Interfaces:**
- Consumes: nothing
- Produces: DOM elements `#message`, `#grid`, `#keyboard`, `#replay-btn` that `game.js` will manipulate

- [ ] **Step 1: Replace `index.html` with the full page**

```html
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Wordle</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      display: flex;
      flex-direction: column;
      align-items: center;
      min-height: 100vh;
      background: #fff;
      font-family: 'Clear Sans', 'Helvetica Neue', Arial, sans-serif;
      padding-top: 24px;
      gap: 16px;
    }

    #message {
      font-size: 1rem;
      font-weight: bold;
      min-height: 1.5em;
      color: #333;
      text-align: center;
    }

    #grid {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    .row {
      display: flex;
      gap: 5px;
    }

    .tile {
      width: 56px;
      height: 56px;
      border: 2px solid #d3d6da;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.8rem;
      font-weight: bold;
      text-transform: uppercase;
      background: #fff;
      color: #333;
      user-select: none;
    }

    .tile.filled {
      border-color: #888;
    }

    .tile.green  { background: #6aaa64; border-color: #6aaa64; color: #fff; }
    .tile.yellow { background: #c9b458; border-color: #c9b458; color: #fff; }
    .tile.grey   { background: #787c7e; border-color: #787c7e; color: #fff; }

    @keyframes flip {
      0%   { transform: scaleY(1); }
      50%  { transform: scaleY(0); }
      100% { transform: scaleY(1); }
    }
    .tile.flip { animation: flip 0.35s ease-in-out; }

    @keyframes shake {
      0%, 100%  { transform: translateX(0); }
      20%, 60%  { transform: translateX(-4px); }
      40%, 80%  { transform: translateX(4px); }
    }
    .row.shake { animation: shake 0.4s ease-in-out; }

    #keyboard {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      width: 100%;
      max-width: 500px;
      padding: 0 8px;
    }

    .keyboard-row {
      display: flex;
      gap: 5px;
      justify-content: center;
    }

    .key {
      height: 56px;
      min-width: 40px;
      padding: 0 6px;
      border: none;
      border-radius: 4px;
      background: #d3d6da;
      font-size: 0.85rem;
      font-weight: bold;
      cursor: pointer;
      text-transform: uppercase;
      color: #333;
      user-select: none;
      touch-action: manipulation;
    }

    .key.wide { min-width: 64px; font-size: 0.75rem; }

    .key.green  { background: #6aaa64; color: #fff; }
    .key.yellow { background: #c9b458; color: #fff; }
    .key.grey   { background: #787c7e; color: #fff; }

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
  </style>
</head>
<body>
  <div id="message"></div>
  <div id="grid"></div>
  <div id="keyboard"></div>
  <button id="replay-btn">Rejouer</button>
  <script src="game.js"></script>
</body>
</html>
```

- [ ] **Step 2: Serve and visually verify the shell**

```bash
cd wordle_game && python3 -m http.server 8000
```

Open `http://localhost:8000` — you should see a white page with no errors in the console. No grid or keyboard yet.

- [ ] **Step 3: Commit**

```bash
git add wordle_game/index.html
git commit -m "feat: add HTML structure and full CSS for Wordle UI"
```

---

### Task 3: Word loading, random selection, and grid rendering

**Files:**
- Modify: `wordle_game/game.js`

**Interfaces:**
- Consumes: `#grid` DOM element; `words.txt` via `fetch()`
- Produces:
  - `init()` — async startup function called on page load
  - `startRound()` — resets state and renders a fresh grid for a new word
  - `getTile(row, col)` — returns the tile DOM element at position (row, col)
  - `updateCurrentRow()` — re-renders the active row to match `currentGuess`
  - Module-level state: `words`, `target`, `currentGuess`, `currentRow`, `gameOver`

- [ ] **Step 1: Write `game.js` with word loading and grid**

```javascript
const MAX_GUESSES = 6;
const FLIP_DURATION = 350;
const FLIP_DELAY = 100;

const AZERTY = [
  ['A','Z','E','R','T','Y','U','I','O','P'],
  ['Q','S','D','F','G','H','J','K','L','M'],
  ['ENTRÉE','W','X','C','V','B','N','⌫'],
];

let words = [];
let target = '';
let currentGuess = '';
let currentRow = 0;
let gameOver = false;
let keyColors = {};

// ── Startup ───────────────────────────────────────────────────────────────────

async function init() {
  const response = await fetch('words.txt');
  const text = await response.text();
  words = text.split('\n')
    .map(w => w.trim().toUpperCase())
    .filter(w => w.length > 0);
  startRound();
}

function startRound() {
  target = pickRandomWord();
  currentGuess = '';
  currentRow = 0;
  gameOver = false;
  keyColors = {};
  showMessage('');
  document.getElementById('replay-btn').style.display = 'none';
  renderGrid();
  renderKeyboard();
}

function pickRandomWord() {
  return words[Math.floor(Math.random() * words.length)];
}

// ── Grid ──────────────────────────────────────────────────────────────────────

function renderGrid() {
  const grid = document.getElementById('grid');
  grid.innerHTML = '';
  for (let r = 0; r < MAX_GUESSES; r++) {
    const row = document.createElement('div');
    row.className = 'row';
    row.id = `row-${r}`;
    for (let c = 0; c < target.length; c++) {
      const tile = document.createElement('div');
      tile.className = 'tile';
      tile.id = `tile-${r}-${c}`;
      row.appendChild(tile);
    }
    grid.appendChild(row);
  }
}

function getTile(row, col) {
  return document.getElementById(`tile-${row}-${col}`);
}

function updateCurrentRow() {
  for (let c = 0; c < target.length; c++) {
    const tile = getTile(currentRow, c);
    const letter = currentGuess[c] || '';
    tile.textContent = letter;
    tile.className = 'tile' + (letter ? ' filled' : '');
  }
}

// ── Keyboard (stub — filled in Task 4) ───────────────────────────────────────

function renderKeyboard() {}
function updateKeyColors() {}

// ── Round end (stub — filled in Task 6) ──────────────────────────────────────

function showMessage(text) {
  document.getElementById('message').textContent = text;
}

init();
```

- [ ] **Step 2: Serve and visually verify**

```bash
cd wordle_game && python3 -m http.server 8000
```

Open `http://localhost:8000`. You should see a 6-row grid whose column count matches the length of the randomly chosen word. Open the console and run:

```javascript
console.log('Target:', target, '— Length:', target.length);
console.log('Words loaded:', words.length);
```

Both should print non-zero values.

- [ ] **Step 3: Commit**

```bash
git add wordle_game/game.js
git commit -m "feat: add word loading, random selection, and grid rendering"
```

---

### Task 4: Keyboard rendering and input handling

**Files:**
- Modify: `wordle_game/game.js` (replace `renderKeyboard` and `updateKeyColors` stubs; add `handleKey` and physical keyboard listener)

**Interfaces:**
- Consumes: `#keyboard` DOM element; `currentGuess`, `target`, `gameOver`, `keyColors` state; `updateCurrentRow()` from Task 3
- Produces:
  - `renderKeyboard()` — renders AZERTY rows with clickable buttons
  - `updateKeyColors()` — updates key button CSS classes from `keyColors` map
  - `handleKey(key)` — processes a single keypress (letter / ⌫ / ENTRÉE)
  - Physical `keydown` listener wired up

- [ ] **Step 1: Replace the keyboard stubs and add input handling in `game.js`**

Replace the two stub functions and add the listener. The surrounding code (init, grid, etc.) stays unchanged.

```javascript
// ── Keyboard ──────────────────────────────────────────────────────────────────

function renderKeyboard() {
  const kb = document.getElementById('keyboard');
  kb.innerHTML = '';
  AZERTY.forEach(rowKeys => {
    const rowEl = document.createElement('div');
    rowEl.className = 'keyboard-row';
    rowKeys.forEach(k => {
      const btn = document.createElement('button');
      const isWide = k === 'ENTRÉE' || k === '⌫';
      btn.className = 'key' + (isWide ? ' wide' : '');
      btn.textContent = k;
      btn.dataset.key = k;
      btn.addEventListener('click', () => handleKey(k));
      rowEl.appendChild(btn);
    });
    kb.appendChild(rowEl);
  });
}

function updateKeyColors() {
  document.querySelectorAll('.key').forEach(btn => {
    const k = btn.dataset.key;
    if (!keyColors[k]) return;
    const isWide = k === 'ENTRÉE' || k === '⌫';
    btn.className = 'key' + (isWide ? ' wide' : '') + ' ' + keyColors[k];
  });
}

// ── Input ─────────────────────────────────────────────────────────────────────

document.addEventListener('keydown', e => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === 'Enter') handleKey('ENTRÉE');
  else if (e.key === 'Backspace') handleKey('⌫');
  else if (/^[a-zA-ZÀ-ÿ]$/.test(e.key)) handleKey(e.key.toUpperCase());
});

function handleKey(key) {
  if (gameOver) return;
  if (key === '⌫') {
    currentGuess = currentGuess.slice(0, -1);
    updateCurrentRow();
  } else if (key === 'ENTRÉE') {
    submitGuess();
  } else if (currentGuess.length < target.length) {
    currentGuess += key;
    updateCurrentRow();
  }
}

// ── Guess logic (stub — filled in Task 5) ────────────────────────────────────

function submitGuess() {}
```

- [ ] **Step 2: Serve and manually verify**

Open `http://localhost:8000`. You should see the AZERTY keyboard rendered below the grid.

- Type letters — they should appear in the first row tiles
- Press Backspace or click ⌫ — last letter removed
- Letters beyond word length are ignored
- Physical keyboard and on-screen keyboard both work

- [ ] **Step 3: Commit**

```bash
git add wordle_game/game.js
git commit -m "feat: add AZERTY keyboard rendering and input handling"
```

---

### Task 5: Guess submission and color feedback

**Files:**
- Modify: `wordle_game/game.js` (replace `submitGuess` stub; add `computeFeedback`, `revealRow`, `updateKeyboardColors`, `shakeRow`)

**Interfaces:**
- Consumes: `currentGuess`, `target`, `currentRow`, `keyColors`; `getTile()`, `updateKeyColors()` from earlier tasks
- Produces:
  - `computeFeedback(guess, target)` → `string[]` — array of `'green'|'yellow'|'grey'` per letter
  - `revealRow(rowIndex, guess, feedback, onDone)` — animates tiles and calls `onDone` when done
  - `updateKeyboardColors(guess, feedback)` — merges feedback into `keyColors` (green > yellow > grey) and repaints keys
  - `shakeRow(rowIndex)` — plays shake animation on the given row
  - `submitGuess()` — validates, computes feedback, triggers reveal, advances row

- [ ] **Step 1: Verify `computeFeedback` logic in the browser console before wiring it up**

Open the console on any tab and paste this self-contained test:

```javascript
function computeFeedback(guess, target) {
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

// All green
console.assert(JSON.stringify(computeFeedback('NOCES','NOCES')) === '["green","green","green","green","green"]');
// All grey
console.assert(JSON.stringify(computeFeedback('ABCDE','FGHIJ')) === '["grey","grey","grey","grey","grey"]');
// Duplicate letter — only one yellow
console.assert(JSON.stringify(computeFeedback('NONNE','NOCES')) === '["green","grey","grey","yellow","grey"]');
// Yellow then green for same letter
console.assert(JSON.stringify(computeFeedback('AABBB','BAAAA')) === '["yellow","green","grey","grey","grey"]');
console.log('All assertions passed');
```

Expected output: `All assertions passed` with no assertion errors.

- [ ] **Step 2: Replace the `submitGuess` stub and add supporting functions in `game.js`**

```javascript
// ── Guess logic ───────────────────────────────────────────────────────────────

function submitGuess() {
  if (currentGuess.length < target.length) {
    shakeRow(currentRow);
    return;
  }
  const feedback = computeFeedback(currentGuess, target);
  revealRow(currentRow, currentGuess, feedback, () => {
    updateKeyboardColors(currentGuess, feedback);
    const won = feedback.every(f => f === 'green');
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

function computeFeedback(guess, target) {
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

function revealRow(rowIndex, guess, feedback, onDone) {
  feedback.forEach((color, i) => {
    const tile = getTile(rowIndex, i);
    setTimeout(() => {
      tile.classList.add('flip');
      setTimeout(() => {
        tile.classList.remove('flip');
        tile.className = `tile ${color}`;
        tile.textContent = guess[i];
      }, FLIP_DURATION / 2);
    }, i * FLIP_DELAY);
  });
  setTimeout(onDone, feedback.length * FLIP_DELAY + FLIP_DURATION);
}

function updateKeyboardColors(guess, feedback) {
  const priority = { green: 3, yellow: 2, grey: 1 };
  for (let i = 0; i < guess.length; i++) {
    const letter = guess[i];
    const color = feedback[i];
    if (!keyColors[letter] || priority[color] > priority[keyColors[letter]]) {
      keyColors[letter] = color;
    }
  }
  updateKeyColors();
}

function shakeRow(rowIndex) {
  const row = document.getElementById(`row-${rowIndex}`);
  row.classList.add('shake');
  row.addEventListener('animationend', () => row.classList.remove('shake'), { once: true });
}

// ── Round end (stub — filled in Task 6) ──────────────────────────────────────

function endGame(won) {}
```

- [ ] **Step 3: Serve and manually verify**

Open `http://localhost:8000`. Type a guess of the correct length and press Enter:

- Tiles should flip one by one with green/yellow/grey colors
- On-screen keyboard keys should update to the same colors
- Submitting an incomplete guess should shake the row
- After filling all 6 rows without winning, nothing breaks (endGame is a stub)

- [ ] **Step 4: Commit**

```bash
git add wordle_game/game.js
git commit -m "feat: add guess submission, color feedback, and tile reveal animation"
```

---

### Task 6: Round end and replay

**Files:**
- Modify: `wordle_game/game.js` (replace `endGame` stub; wire up replay button)

**Interfaces:**
- Consumes: `#message`, `#replay-btn` DOM elements; `startRound()` from Task 3
- Produces:
  - `endGame(won)` — sets `gameOver`, shows message, shows replay button
  - Replay button click → `startRound()`

- [ ] **Step 1: Replace the `endGame` stub and wire the replay button**

```javascript
// ── Round end ─────────────────────────────────────────────────────────────────

function endGame(won) {
  gameOver = true;
  showMessage(won ? 'Bravo !' : `Le mot était : ${target}`);
  document.getElementById('replay-btn').style.display = 'inline-block';
}

document.getElementById('replay-btn').addEventListener('click', startRound);
```

Remove the old `endGame` stub and the comment `// ── Round end (stub — filled in Task 6)`.

- [ ] **Step 2: Serve and verify the win flow**

Open `http://localhost:8000`. Open the console and run:

```javascript
// Cheat: set target to a short known word so you can win immediately
target = 'NON';
renderGrid();
```

Type `NON` and press Enter. You should see:
- All tiles flip green
- "Bravo !" appears above the grid
- "Rejouer" button appears below the keyboard

- [ ] **Step 3: Verify the lose flow**

Reload and make 6 wrong guesses (type random letters of the correct length). You should see:
- The actual word revealed in the message (e.g., `Le mot était : MARIAGE`)
- "Rejouer" button appears

- [ ] **Step 4: Verify replay**

Click "Rejouer". You should see:
- Grid resets with a fresh number of columns (may differ if new word has different length)
- Message and keyboard colors clear
- "Rejouer" button hides
- You can play again

- [ ] **Step 5: Commit**

```bash
git add wordle_game/game.js
git commit -m "feat: add round end detection and replay flow — game complete"
```
