import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeFeedback, parseWordList, parseSublists, pickRandomSublist, parseReferenceGuesses, buildResultMessage } from './logic.js';

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

test('parseWordList trims, uppercases, and drops blank lines', () => {
  const text = ' amour \n\nvoile \n  \nfleur\n';
  assert.deepStrictEqual(parseWordList(text), ['AMOUR', 'VOILE', 'FLEUR']);
});

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

test('pickRandomSublist selects based on the injected random function', () => {
  const sublists = [['A'], ['B'], ['C']];
  assert.deepStrictEqual(pickRandomSublist(sublists, () => 0), ['A']);
  assert.deepStrictEqual(pickRandomSublist(sublists, () => 0.5), ['B']);
  assert.deepStrictEqual(pickRandomSublist(sublists, () => 0.99), ['C']);
});

test('parseReferenceGuesses parses word/name/guesses lines into a Map', () => {
  const text = 'AMOUR,CLARISSE,4\nNOCES,DAVID,2\n';
  const result = parseReferenceGuesses(text);
  assert.strictEqual(result.size, 2);
  assert.deepStrictEqual(result.get('AMOUR'), { name: 'CLARISSE', guesses: 4 });
  assert.deepStrictEqual(result.get('NOCES'), { name: 'DAVID', guesses: 2 });
});

test('parseReferenceGuesses skips blank lines and trims/uppercases fields', () => {
  const text = '\n  amour , clarisse , 4 \n\n';
  const result = parseReferenceGuesses(text);
  assert.strictEqual(result.size, 1);
  assert.deepStrictEqual(result.get('AMOUR'), { name: 'CLARISSE', guesses: 4 });
});

test('parseReferenceGuesses skips lines with an unrecognized name value', () => {
  const text = 'AMOUR,CLARRISE,4\nNOCES,DAVID,2\n';
  const result = parseReferenceGuesses(text);
  assert.strictEqual(result.size, 1);
  assert.strictEqual(result.has('AMOUR'), false);
  assert.deepStrictEqual(result.get('NOCES'), { name: 'DAVID', guesses: 2 });
});

test('parseReferenceGuesses skips lines with an empty guesses field', () => {
  const text = 'AMOUR,CLARISSE,\nNOCES,DAVID,2\n';
  const result = parseReferenceGuesses(text);
  assert.strictEqual(result.size, 1);
  assert.strictEqual(result.has('AMOUR'), false);
  assert.deepStrictEqual(result.get('NOCES'), { name: 'DAVID', guesses: 2 });
});

test('parseReferenceGuesses skips a guess count that is not a positive integer', () => {
  const text = 'AMOUR,CLARISSE,0\nVOILE,DAVID,3.5\nFLEUR,CLARISSE,-2\nNOCES,DAVID,deux\nBAGUE,DAVID,2\n';
  const result = parseReferenceGuesses(text);
  assert.strictEqual(result.size, 1);
  assert.deepStrictEqual(result.get('BAGUE'), { name: 'DAVID', guesses: 2 });
});

test('buildResultMessage: win with no reference data', () => {
  const msg = buildResultMessage({ won: true, guessCount: 3, target: 'AMOUR', reference: undefined });
  assert.strictEqual(msg, 'Tu as deviné le mot en 3 essais !');
});

test('buildResultMessage: win in a single guess uses the singular', () => {
  const msg = buildResultMessage({ won: true, guessCount: 1, target: 'AMOUR', reference: undefined });
  assert.strictEqual(msg, 'Tu as deviné le mot en 1 essai !');
});

test('buildResultMessage: win, fewer guesses than Clarisse', () => {
  const msg = buildResultMessage({
    won: true, guessCount: 3, target: 'AMOUR',
    reference: { name: 'CLARISSE', guesses: 4 },
  });
  assert.strictEqual(
    msg,
    "Tu as deviné le mot en 3 essais ! Clarisse l'a trouvé en 4 essais, tu as fait mieux qu'elle, félicitations !"
  );
});

test('buildResultMessage: win, fewer guesses than David', () => {
  const msg = buildResultMessage({
    won: true, guessCount: 3, target: 'AMOUR',
    reference: { name: 'DAVID', guesses: 4 },
  });
  assert.strictEqual(
    msg,
    "Tu as deviné le mot en 3 essais ! David l'a trouvé en 4 essais, tu as fait mieux que lui, félicitations !"
  );
});

test('buildResultMessage: win, more guesses than Clarisse', () => {
  const msg = buildResultMessage({
    won: true, guessCount: 5, target: 'AMOUR',
    reference: { name: 'CLARISSE', guesses: 3 },
  });
  assert.strictEqual(
    msg,
    "Tu as deviné le mot en 5 essais ! Clarisse l'a trouvé en 3 essais, elle a fait mieux que toi !"
  );
});

test('buildResultMessage: win, more guesses than David', () => {
  const msg = buildResultMessage({
    won: true, guessCount: 5, target: 'AMOUR',
    reference: { name: 'DAVID', guesses: 1 },
  });
  assert.strictEqual(
    msg,
    "Tu as deviné le mot en 5 essais ! David l'a trouvé en 1 essai, il a fait mieux que toi !"
  );
});

test('buildResultMessage: win, same number of guesses', () => {
  const msg = buildResultMessage({
    won: true, guessCount: 3, target: 'AMOUR',
    reference: { name: 'DAVID', guesses: 3 },
  });
  assert.strictEqual(
    msg,
    "Tu as deviné le mot en 3 essais ! David l'a trouvé en 3 essais aussi, vous êtes à égalité !"
  );
});

test('buildResultMessage: loss with no reference data', () => {
  const msg = buildResultMessage({ won: false, guessCount: 6, target: 'AMOUR', reference: undefined });
  assert.strictEqual(msg, "Le mot était : AMOUR. Tu n'as pas trouvé en 6 essais.");
});

test('buildResultMessage: loss with reference data', () => {
  const msg = buildResultMessage({
    won: false, guessCount: 6, target: 'AMOUR',
    reference: { name: 'CLARISSE', guesses: 4 },
  });
  assert.strictEqual(
    msg,
    "Le mot était : AMOUR. Tu n'as pas trouvé en 6 essais. Clarisse l'a trouvé en 4 essais."
  );
});
