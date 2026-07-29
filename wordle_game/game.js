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

// ── Keyboard (stub — filled in Task 5) ───────────────────────────────────────

function renderKeyboard() {}
function updateKeyColors() {}

// ── Round end (stub — filled in Task 7) ──────────────────────────────────────

function showMessage(text) {
  document.getElementById('message').textContent = text;
}

init();
