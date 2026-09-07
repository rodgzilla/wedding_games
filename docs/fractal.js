// Pythagoras tree geometry — pure math, no DOM, no canvas.
//
// A node is one square of the tree, described by the midpoint of its base
// edge. The square extends "upward" from that midpoint, where upward means
// local -y rotated by `rotation` (so rotation 0 is upright and positive
// rotation leans right, matching canvas' y-down, clockwise-positive frame).
//
// Each square carries a right triangle on its top edge whose right angle sits
// at the apex. `angle` is the triangle's angle at the top-left corner, so the
// children measure size·cos(angle) on the left and size·sin(angle) on the
// right — which is why their sizes always satisfy left² + right² = parent².

const HALF_PI = Math.PI / 2;

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

// The two squares carried on `node`'s top edge, pruned when too small to draw.
function childrenOf(node, angle, minSize) {
  const { x, y, size, rotation, depth } = node;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const cosR = Math.cos(rotation);
  const sinR = Math.sin(rotation);

  // Node-local coordinates: base midpoint at (0, 0), square spanning y ∈ [-size, 0].
  const toWorld = (lx, ly) => ({
    x: x + lx * cosR - ly * sinR,
    y: y + lx * sinR + ly * cosR,
  });

  const ax = -size / 2;               // top-left corner
  const ay = -size;
  const bx = size / 2;                // top-right corner
  const by = -size;
  const px = ax + size * cos * cos;   // apex of the right triangle
  const py = ay - size * cos * sin;

  const children = [];

  const leftSize = size * cos;
  if (leftSize >= minSize) {
    children.push({
      ...toWorld((ax + px) / 2, (ay + py) / 2),
      size: leftSize,
      rotation: rotation - angle,
      depth: depth + 1,
      scale: 0,
    });
  }

  const rightSize = size * sin;
  if (rightSize >= minSize) {
    children.push({
      ...toWorld((px + bx) / 2, (py + by) / 2),
      size: rightSize,
      rotation: rotation + HALF_PI - angle,
      depth: depth + 1,
      scale: 0,
    });
  }

  return children;
}

/**
 * Flatten a Pythagoras tree into a draw list, ordered by depth so the trunk
 * paints before the branches.
 *
 * `growth` is a fractional depth: level d is emitted with
 * `scale = clamp(growth - d, 0, 1)`, so growth 3.4 gives three solid levels
 * plus a fourth blooming in at 40%. Geometry ignores `scale` — a half-grown
 * square still sits where its full-size self would.
 *
 * `angle` is either a constant (radians) or a function of the *parent's*
 * depth, which lets a wave travel out through the branches.
 */
export function pythagorasNodes({
  growth,
  maxDepth = 12,
  angle,
  baseSize,
  origin,
  rotation = 0,
  minSize = 0.5,
}) {
  const angleAt = typeof angle === 'function' ? angle : () => angle;
  const nodes = [];
  let level = [{ x: origin.x, y: origin.y, size: baseSize, rotation, depth: 0, scale: 0 }];

  for (let depth = 0; depth <= maxDepth && level.length > 0; depth++) {
    const scale = clamp01(growth - depth);
    if (scale <= 0) break;

    const wantsChildren = depth < maxDepth && clamp01(growth - depth - 1) > 0;
    const next = [];
    for (const node of level) {
      node.scale = scale;
      nodes.push(node);
      if (wantsChildren) next.push(...childrenOf(node, angleAt(depth), minSize));
    }
    level = next;
  }

  return nodes;
}
