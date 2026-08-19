import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeFeedback, parseWordList, parseSublists } from './logic.js';

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
