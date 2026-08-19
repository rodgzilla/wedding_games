import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeFeedback, parseWordList, parseSublists, pickRandomSublist, parseReferenceTimes, formatTime, buildResultMessage } from './logic.js';

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

test('parseReferenceTimes skips lines with an unrecognized name value', () => {
  const text = 'AMOUR,CLARRISE,168\nNOCES,DAVID,95\n';
  const result = parseReferenceTimes(text);
  assert.strictEqual(result.size, 1);
  assert.strictEqual(result.has('AMOUR'), false);
  assert.deepStrictEqual(result.get('NOCES'), { name: 'DAVID', seconds: 95 });
});

test('parseReferenceTimes skips lines with an empty seconds field', () => {
  const text = 'AMOUR,CLARISSE,\nNOCES,DAVID,95\n';
  const result = parseReferenceTimes(text);
  assert.strictEqual(result.size, 1);
  assert.strictEqual(result.has('AMOUR'), false);
  assert.deepStrictEqual(result.get('NOCES'), { name: 'DAVID', seconds: 95 });
});

test('formatTime formats seconds as MmSS', () => {
  assert.strictEqual(formatTime(168), '2mn48');
  assert.strictEqual(formatTime(0), '0mn00');
  assert.strictEqual(formatTime(5), '0mn05');
  assert.strictEqual(formatTime(60), '1mn00');
  assert.strictEqual(formatTime(725), '12mn05');
});

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
