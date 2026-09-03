import { test } from 'node:test';
import assert from 'node:assert';
import { pythagorasNodes } from './fractal.js';

const DEG = Math.PI / 180;

function closeTo(actual, expected, epsilon = 1e-9) {
  assert.ok(
    Math.abs(actual - expected) < epsilon,
    `expected ${actual} to be within ${epsilon} of ${expected}`,
  );
}

function base(overrides = {}) {
  return {
    growth: 1,
    maxDepth: 8,
    angle: 45 * DEG,
    baseSize: 100,
    origin: { x: 0, y: 0 },
    ...overrides,
  };
}

test('a growth of 1 yields only the root square', () => {
  const nodes = pythagorasNodes(base());
  assert.strictEqual(nodes.length, 1);
  assert.strictEqual(nodes[0].depth, 0);
});

test('the root square sits at the origin with the requested size and rotation', () => {
  const nodes = pythagorasNodes(base({ rotation: 0.3 }));
  const root = nodes[0];
  closeTo(root.x, 0);
  closeTo(root.y, 0);
  closeTo(root.size, 100);
  closeTo(root.rotation, 0.3);
  closeTo(root.scale, 1);
});

test('a growth of 2 adds the two children of the root', () => {
  const nodes = pythagorasNodes(base({ growth: 2 }));
  assert.strictEqual(nodes.length, 3);
  assert.deepStrictEqual(nodes.map(n => n.depth), [0, 1, 1]);
});

test('a partially grown level is reported with a fractional scale', () => {
  const nodes = pythagorasNodes(base({ growth: 1.5 }));
  assert.strictEqual(nodes.length, 3);
  closeTo(nodes[0].scale, 1);
  closeTo(nodes[1].scale, 0.5);
  closeTo(nodes[2].scale, 0.5);
});

test('a growth of 0 yields no nodes at all', () => {
  assert.deepStrictEqual(pythagorasNodes(base({ growth: 0 })), []);
});

test('maxDepth caps the tree even when growth runs past it', () => {
  const nodes = pythagorasNodes(base({ growth: 10, maxDepth: 3 }));
  assert.strictEqual(nodes.length, 15);
  assert.strictEqual(Math.max(...nodes.map(n => n.depth)), 3);
});

test('nodes are ordered by depth so the trunk paints before the branches', () => {
  const depths = pythagorasNodes(base({ growth: 4 })).map(n => n.depth);
  assert.strictEqual(depths.length, 15);
  assert.deepStrictEqual(depths, [...depths].sort((a, b) => a - b));
});

test('at 45 degrees the two children are equal in size and lean symmetrically', () => {
  const [, left, right] = pythagorasNodes(base({ growth: 2 }));
  closeTo(left.size, 100 * Math.cos(45 * DEG));
  closeTo(right.size, left.size);
  closeTo(left.rotation, -45 * DEG);
  closeTo(right.rotation, 45 * DEG);
});

test('at 45 degrees the children straddle the apex above the root', () => {
  const [, left, right] = pythagorasNodes(base({ growth: 2 }));
  closeTo(left.x, -25);
  closeTo(left.y, -125);
  closeTo(right.x, 25);
  closeTo(right.y, -125);
});

test('child sizes satisfy the Pythagorean relation for any angle', () => {
  const [root, left, right] = pythagorasNodes(base({ growth: 2, angle: 30 * DEG }));
  closeTo(left.size ** 2 + right.size ** 2, root.size ** 2);
});

test('a rotated root grows the whole tree in the rotated direction', () => {
  const [, left] = pythagorasNodes(base({ growth: 2, rotation: 90 * DEG }));
  closeTo(left.x, 125, 1e-9);
  closeTo(left.y, -25, 1e-9);
  closeTo(left.rotation, 45 * DEG);
});

test('subtrees that shrink below minSize are pruned', () => {
  const nodes = pythagorasNodes(base({ growth: 10, maxDepth: 12, minSize: 20 }));
  assert.ok(nodes.length > 0);
  assert.ok(nodes.every(n => n.size >= 20));
  assert.ok(nodes.length < 2 ** 13 - 1);
});

test('a zero angle prunes the right subtree and leaves a straight tower', () => {
  const nodes = pythagorasNodes(base({ growth: 4, angle: 0 }));
  assert.strictEqual(nodes.length, 4);
  assert.ok(nodes.every(n => Math.abs(n.size - 100) < 1e-9));
  assert.ok(nodes.every(n => Math.abs(n.rotation) < 1e-9));
});

test('angle may vary per depth to make the tree curl', () => {
  const angleAt = depth => (depth === 0 ? 20 * DEG : 70 * DEG);
  const [root, left] = pythagorasNodes(base({ growth: 3, angle: angleAt }));
  closeTo(left.size, root.size * Math.cos(20 * DEG));
  const grandchild = pythagorasNodes(base({ growth: 3, angle: angleAt }))[3];
  closeTo(grandchild.size, left.size * Math.cos(70 * DEG));
});
