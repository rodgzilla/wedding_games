// The tutorial screen's demo: replays a short, fake game on the real tiles so a
// guest who has never played Wordle sees the rules happen instead of reading
// them. Pure DOM and timers — it shares no state with the real game.
import { computeFeedback } from './logic.js';

const TARGET = 'FLEUR';
// Chosen so the three colours all show up, in order: TABLE has greys and two
// yellows, PLEUR is one letter off, FLEUR wins.
const GUESSES = ['TABLE', 'PLEUR', 'FLEUR'];

const TYPE_DELAY = 150;     // between two typed letters
const BEFORE_REVEAL = 400;  // pause on the finished word before it flips
const FLIP_DELAY = 100;     // between two flipping tiles (matches game.js)
const FLIP_DURATION = 350;
const AFTER_REVEAL = 800;   // pause on the freshly coloured row
const LOOP_PAUSE = 2600;    // pause on the solved grid before replaying

// prefers-reduced-motion asks for less *movement*, not less tutorial: the row
// by row progression is the thing being taught, so the calm version keeps every
// step and only drops the flip and the letter-by-letter typing, trading them
// for longer pauses.
const CALM_TYPE_PAUSE = 700;
const CALM_AFTER_REVEAL = 1200;
const CALM_LOOP_PAUSE = 3000;

// Bumped by every start/stop, so a loop that is mid-`await` when the guest taps
// "C'est parti !" notices it is stale and returns instead of painting over the
// board the real game has since rendered.
let generation = 0;
const timers = new Set();

function wait(ms) {
  return new Promise(resolve => {
    const id = setTimeout(() => {
      timers.delete(id);
      resolve();
    }, ms);
    timers.add(id);
  });
}

function tileAt(grid, row, col) {
  return grid.children[row].children[col];
}

function buildGrid(grid) {
  grid.innerHTML = '';
  grid.style.setProperty('--cols', TARGET.length);
  for (let r = 0; r < GUESSES.length; r++) {
    const row = document.createElement('div');
    row.className = 'row';
    for (let c = 0; c < TARGET.length; c++) {
      const tile = document.createElement('div');
      tile.className = 'tile';
      row.appendChild(tile);
    }
    grid.appendChild(row);
  }
}

function clearGrid(grid) {
  for (let r = 0; r < GUESSES.length; r++) {
    for (let c = 0; c < TARGET.length; c++) {
      const tile = tileAt(grid, r, c);
      tile.textContent = '';
      tile.className = 'tile';
    }
  }
}

function putLetter(grid, row, col, letter) {
  const tile = tileAt(grid, row, col);
  tile.textContent = letter;
  tile.className = 'tile filled';
}

function colourTile(grid, row, col, letter, color) {
  const tile = tileAt(grid, row, col);
  tile.className = `tile ${color}`;
  tile.textContent = letter;
}

async function typeRow(grid, row, guess, gen, calm) {
  if (calm) {
    for (let c = 0; c < guess.length; c++) putLetter(grid, row, c, guess[c]);
    await wait(CALM_TYPE_PAUSE);
    return;
  }
  for (let c = 0; c < guess.length; c++) {
    if (gen !== generation) return;
    putLetter(grid, row, c, guess[c]);
    await wait(TYPE_DELAY);
  }
}

async function revealRow(grid, row, guess, calm) {
  const feedback = computeFeedback(guess, TARGET);
  if (calm) {
    feedback.forEach((color, c) => colourTile(grid, row, c, guess[c], color));
    await wait(CALM_AFTER_REVEAL);
    return;
  }
  feedback.forEach((color, c) => {
    const tile = tileAt(grid, row, c);
    wait(c * FLIP_DELAY)
      .then(() => {
        tile.classList.add('flip');
        return wait(FLIP_DURATION / 2);
      })
      .then(() => colourTile(grid, row, c, guess[c], color));
  });
  await wait(guess.length * FLIP_DELAY + FLIP_DURATION + AFTER_REVEAL);
}

async function runLoop(grid, gen, calm) {
  while (gen === generation) {
    clearGrid(grid);
    await wait(BEFORE_REVEAL);
    for (let r = 0; r < GUESSES.length; r++) {
      if (gen !== generation) return;
      await typeRow(grid, r, GUESSES[r], gen, calm);
      if (gen !== generation) return;
      await wait(BEFORE_REVEAL);
      if (gen !== generation) return;
      await revealRow(grid, r, GUESSES[r], calm);
    }
    await wait(calm ? CALM_LOOP_PAUSE : LOOP_PAUSE);
  }
}

export function startIntroDemo() {
  const grid = document.getElementById('demo-grid');
  if (!grid) return;
  buildGrid(grid);
  const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
  runLoop(grid, ++generation, calm);
}

export function stopIntroDemo() {
  generation++;
  timers.forEach(clearTimeout);
  timers.clear();
}
