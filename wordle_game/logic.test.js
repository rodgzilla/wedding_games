import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeFeedback } from './logic.js';

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
