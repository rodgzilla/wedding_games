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

export function parseWordList(text) {
  return text.split('\n')
    .map(w => w.trim().toUpperCase())
    .filter(w => w.length > 0);
}

export function parseSublists(text) {
  return text
    .split(/\n\s*\n/)
    .map(parseWordList)
    .filter(group => group.length > 0);
}

export function pickRandomSublist(sublists, randomFn = Math.random) {
  return sublists[Math.floor(randomFn() * sublists.length)];
}

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

export function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}mn${String(remainingSeconds).padStart(2, '0')}`;
}
