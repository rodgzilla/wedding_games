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

// ── Guess logic (stub — filled in Task 6) ────────────────────────────────────

function submitGuess() {}

// ── Round end (stub — filled in Task 7) ──────────────────────────────────────

function showMessage(text) {
  document.getElementById('message').textContent = text;
}

init();
