const MAX_GUESSES = 6;
const FLIP_DURATION = 350;
const FLIP_DELAY = 100;

const AZERTY = [
  ['A','Z','E','R','T','Y','U','I','O','P'],
  ['Q','S','D','F','G','H','J','K','L','M'],
  ['ENTRÉE','W','X','C','V','B','N','⌫'],
];

let words = [];
let validGuesses = new Set();
let target = '';
let currentGuess = '';
let currentRow = 0;
let gameOver = false;
let keyColors = {};

// ── Startup ───────────────────────────────────────────────────────────────────

async function init() {
  const [wordsText, dictText] = await Promise.all([
    fetch('words.txt').then(r => r.text()),
    fetch('dictionary.txt').then(r => r.text()),
  ]);

  words = wordsText.split('\n')
    .map(w => w.trim().toUpperCase())
    .filter(w => w.length > 0);

  const dictWords = dictText.split('\n')
    .map(w => w.trim().toUpperCase())
    .filter(w => w.length > 0);

  validGuesses = new Set([...dictWords, ...words]);

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

// ── Guess logic ───────────────────────────────────────────────────────────────

function submitGuess() {
  if (currentGuess.length < target.length) {
    shakeRow(currentRow);
    return;
  }
  if (!validGuesses.has(currentGuess)) {
    shakeRow(currentRow);
    showMessage('Mot non reconnu');
    setTimeout(() => showMessage(''), 1500);
    return;
  }
  showMessage('');
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

// ── Round end (stub — filled in Task 7) ──────────────────────────────────────

function endGame(won) {}

function showMessage(text) {
  document.getElementById('message').textContent = text;
}

init();
