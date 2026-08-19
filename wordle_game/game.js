import {
  computeFeedback,
  parseWordList,
  parseSublists,
  pickRandomSublist,
  formatTime,
  parseReferenceTimes,
  buildResultMessage,
} from './logic.js';

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
let messageTimeoutId = null;
let sublist = [];
let wordIndex = 0;
let results = [];
let timerStart = null;
let timerIntervalId = null;
let elapsedSeconds = 0;
let referenceTimes = new Map();

// ── Startup ───────────────────────────────────────────────────────────────────

async function init() {
  const [wordsText, dictText, refTimesText] = await Promise.all([
    fetch('words.txt').then(r => r.text()),
    fetch('dictionary.txt').then(r => r.text()),
    fetch('reference_times.txt').then(r => r.text()),
  ]);

  const sublists = parseSublists(wordsText);
  sublist = pickRandomSublist(sublists);
  words = sublists.flat();

  const dictWords = parseWordList(dictText);
  const stripped = dictWords.map(w => w.normalize('NFD').replace(/[̀-ͯ]/g, ''));
  validGuesses = new Set([...dictWords, ...stripped, ...words]);
  referenceTimes = parseReferenceTimes(refTimesText);

  wordIndex = 0;
  results = [];
  startRound();
}

function startRound() {
  target = sublist[wordIndex];
  currentGuess = '';
  currentRow = 0;
  gameOver = false;
  keyColors = {};
  if (timerIntervalId !== null) {
    clearInterval(timerIntervalId);
    timerIntervalId = null;
  }
  timerStart = null;
  elapsedSeconds = 0;
  document.getElementById('timer').textContent = '';
  showMessage('');
  document.getElementById('next-btn').style.display = 'none';
  document.getElementById('recap').style.display = 'none';
  document.getElementById('grid').style.display = 'flex';
  document.getElementById('keyboard').style.display = 'flex';
  renderGrid();
  renderKeyboard();
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
    gameOver = true;
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

// ── Round end ─────────────────────────────────────────────────────────────────

function endGame(won) {
  gameOver = true;
  results.push({ word: target, won, elapsedSeconds });
  const reference = referenceTimes.get(target);
  showMessage(buildResultMessage({ won, elapsedSeconds, target, reference }));
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
  document.getElementById('timer').textContent = '';
  const recap = document.getElementById('recap');
  recap.innerHTML = '';
  results.forEach(r => {
    const row = document.createElement('div');
    row.className = 'recap-row';
    row.textContent = `${r.word} — ${r.won ? 'réussi' : 'échoué'} — ${formatTime(r.elapsedSeconds)}`;
    recap.appendChild(row);
  });
  recap.style.display = 'flex';
}

function showMessage(text) {
  document.getElementById('message').textContent = text;
}

init();
