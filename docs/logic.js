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

export function parseReferenceGuesses(text) {
  const map = new Map();
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parts = trimmed.split(',').map(p => p.trim());
    if (parts.length !== 3) continue;
    const [word, name, guessesStr] = parts;
    const upperName = name.toUpperCase();
    if (upperName !== 'CLARISSE' && upperName !== 'DAVID') continue;
    const guesses = Number(guessesStr);
    if (!word || guessesStr.length === 0 || !Number.isInteger(guesses) || guesses < 1) continue;
    map.set(word.toUpperCase(), { name: upperName, guesses });
  }
  return map;
}

function formatGuesses(count) {
  return count === 1 ? '1 essai' : `${count} essais`;
}

const DISPLAY_NAME = { CLARISSE: 'Clarisse', DAVID: 'David' };
const BETTER_THAN_PHRASE = {
  CLARISSE: "tu as fait mieux qu'elle",
  DAVID: 'tu as fait mieux que lui',
};
const WORSE_THAN_PHRASE = {
  CLARISSE: 'elle a fait mieux que toi',
  DAVID: 'il a fait mieux que toi',
};

export function buildResultMessage({ won, guessCount, target, reference }) {
  const guesses = formatGuesses(guessCount);

  if (won) {
    let message = `Tu as deviné le mot en ${guesses} !`;
    if (reference) {
      const name = DISPLAY_NAME[reference.name];
      const refGuesses = formatGuesses(reference.guesses);
      if (guessCount < reference.guesses) {
        message += ` ${name} l'a trouvé en ${refGuesses}, ${BETTER_THAN_PHRASE[reference.name]}, félicitations !`;
      } else if (guessCount > reference.guesses) {
        message += ` ${name} l'a trouvé en ${refGuesses}, ${WORSE_THAN_PHRASE[reference.name]} !`;
      } else {
        message += ` ${name} l'a trouvé en ${refGuesses} aussi, vous êtes à égalité !`;
      }
    }
    return message;
  }

  let message = `Le mot était : ${target}. Tu n'as pas trouvé en ${guesses}.`;
  if (reference) {
    const name = DISPLAY_NAME[reference.name];
    message += ` ${name} l'a trouvé en ${formatGuesses(reference.guesses)}.`;
  }
  return message;
}
