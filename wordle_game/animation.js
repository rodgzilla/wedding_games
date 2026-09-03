// The 10-second launch sequence played before the recap screen.
//
// Everything renders into one <canvas> driven by a single requestAnimationFrame
// loop: night sky, stars, smoke, sparkles, and the Pythagoras tree whose every
// square is a photo of Selki's head. The dino-on-a-rocket rides above it as an
// SVG overlay, positioned each frame with a transform.
//
// The animation must never be able to trap a guest on it: a failed image load,
// a missing canvas context, reduced-motion, or the watchdog all resolve the
// promise so the recap still appears.

import { pythagorasNodes } from './fractal.js';

const HEAD_SRC = 'selki_3.jpg';     // square crop — one square of the fractal
const HEAD_BUFFER_PX = 128;         // heads never draw larger than this on screen

const DURATION = 10000;
const WATCHDOG_MS = DURATION + 2500;

const T_COUNTDOWN_END = 1400;
const T_LIFTOFF = 2000;
const T_CLIMB_END = 6800;
const T_EXIT_END = 7400;
const T_SWAY_END = 9200;
const T_FADE_START = 9500;

const BASE_ANGLE = 45 * Math.PI / 180;
const SWAY_MAX = 0.34;              // radians the branch angle swings during the thrash
const SWAY_RECOIL = 0.26;           // how far the tree shrinks back at full thrash
const FADE_IN_MS = 300;

const COUNTDOWN = [
  { at: 120, text: '3' },
  { at: 520, text: '2' },
  { at: 920, text: '1' },
  { at: 1320, text: 'DÉCOLLAGE !' },
];

let headBuffer = null;
let assetsPromise = null;
let playing = false;

// ── Assets ────────────────────────────────────────────────────────────────────

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${src}`));
    img.src = src;
  });
}

// Decode the 900x900 JPEG once into a small buffer. Every one of the ~255
// squares then draws from that buffer instead of re-sampling the full image.
async function buildHeadBuffer() {
  const img = await loadImage(HEAD_SRC);
  const buffer = document.createElement('canvas');
  buffer.width = HEAD_BUFFER_PX;
  buffer.height = HEAD_BUFFER_PX;
  buffer.getContext('2d').drawImage(img, 0, 0, HEAD_BUFFER_PX, HEAD_BUFFER_PX);
  return buffer;
}

export function preloadLaunchAssets() {
  if (assetsPromise) return assetsPromise;
  assetsPromise = buildHeadBuffer()
    .then(buffer => { headBuffer = buffer; })
    .catch(() => { headBuffer = null; });
  return assetsPromise;
}

// ── Layout ────────────────────────────────────────────────────────────────────

function maxDepthFor(width) {
  if (width < 420) return 7;   // ~255 squares — the phone budget
  if (width < 900) return 8;
  return 9;
}

// Corners of one square in world space, used only for measuring the tree.
function cornersOf(node) {
  const cos = Math.cos(node.rotation);
  const sin = Math.sin(node.rotation);
  const h = node.size / 2;
  return [[-h, 0], [h, 0], [h, -node.size], [-h, -node.size]].map(([lx, ly]) => ({
    x: node.x + lx * cos - ly * sin,
    y: node.y + lx * sin + ly * cos,
  }));
}

// Measure unit-sized trees once, then pick the base size and origin that make
// the full-grown tree fill the viewport without clipping.
//
// This measures the tree at rest. A leaning tree reaches much further sideways,
// but fitting for that would leave the resting tree at a third of its size on a
// portrait phone — so the thrash is kept in frame by SWAY_RECOIL instead.
function fitTree(width, height, maxDepth) {
  let minX = 0, maxX = 0, minY = 0;

  const unit = pythagorasNodes({
    growth: maxDepth + 1,
    maxDepth,
    angle: BASE_ANGLE,
    baseSize: 1,
    origin: { x: 0, y: 0 },
    minSize: 0,
  });
  for (const node of unit) {
    for (const corner of cornersOf(node)) {
      if (corner.x < minX) minX = corner.x;
      if (corner.x > maxX) maxX = corner.x;
      if (corner.y < minY) minY = corner.y;
    }
  }

  const padY = height * 0.93;
  // A 45-degree tree is ~1.5x wider than it is tall, so fitting its full width
  // on a portrait phone would leave it hugging the bottom edge. Letting it run
  // a little past both sides trades the outermost twigs for a tree that fills
  // the frame.
  const baseSize = Math.min(
    (width * 1.2) / (maxX - minX),
    (padY - height * 0.05) / -minY,
  );
  return {
    baseSize,
    origin: { x: width / 2 - ((minX + maxX) / 2) * baseSize, y: padY },
  };
}

function makeStars(width, height, count) {
  const stars = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * width,
      y: Math.random() * height * 0.85,
      r: 0.6 + Math.random() * 1.6,
      phase: Math.random() * Math.PI * 2,
    });
  }
  return stars;
}

// ── Timeline helpers ──────────────────────────────────────────────────────────

const clamp01 = v => Math.min(1, Math.max(0, v));
const lerp = (a, b, t) => a + (b - a) * t;

// How far the craft has climbed, 0 on the pad to 1 well past the top edge.
function climbProgress(t) {
  if (t <= T_LIFTOFF) return 0;
  if (t >= T_EXIT_END) return 1;
  return clamp01((t - T_LIFTOFF) / (T_EXIT_END - T_LIFTOFF)) ** 1.55;
}

function treeGrowth(t, maxDepth) {
  if (t <= T_LIFTOFF) return 0;
  const p = clamp01((t - T_LIFTOFF) / (T_CLIMB_END - T_LIFTOFF));
  return p * (maxDepth + 1);
}

function swayAmplitude(t) {
  if (t < T_LIFTOFF) return 0;
  if (t < T_CLIMB_END) return 0.07 * clamp01((t - T_LIFTOFF) / (T_CLIMB_END - T_LIFTOFF));
  if (t < T_EXIT_END) return lerp(0.07, SWAY_MAX, clamp01((t - T_CLIMB_END) / (T_EXIT_END - T_CLIMB_END)));
  if (t < T_SWAY_END) return SWAY_MAX * (1 - clamp01((t - T_EXIT_END) / (T_SWAY_END - T_EXIT_END))) ** 1.4;
  return 0;
}

// The branch angle, as a function of depth so a wave travels out through the
// tree rather than every branch swinging in lockstep.
function swayAngleAt(t) {
  const amplitude = swayAmplitude(t);
  const phase = t / 250;
  return depth => BASE_ANGLE + amplitude * Math.sin(phase - depth * 0.55);
}

// A hard lean reaches much wider than the resting tree the layout was fitted
// to, so the tree pulls in as it thrashes — which also reads as a recoil.
function swayRecoil(t) {
  return 1 - SWAY_RECOIL * (swayAmplitude(t) / SWAY_MAX);
}

function shakeAmount(t) {
  if (t < T_COUNTDOWN_END || t > T_CLIMB_END) return 0;
  if (t < T_LIFTOFF) return 9 * clamp01((t - T_COUNTDOWN_END) / (T_LIFTOFF - T_COUNTDOWN_END));
  return 9 * (1 - clamp01((t - T_LIFTOFF) / 1600));
}

function overlayOpacity(t) {
  if (t < FADE_IN_MS) return t / FADE_IN_MS;
  if (t > T_FADE_START) return 1 - clamp01((t - T_FADE_START) / (DURATION - T_FADE_START));
  return 1;
}

// ── Playback ──────────────────────────────────────────────────────────────────

export function playLaunchAnimation() {
  const overlay = document.getElementById('launch-overlay');
  const canvas = document.getElementById('launch-canvas');
  const craft = document.getElementById('launch-craft');
  const countdown = document.getElementById('launch-countdown');
  const ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null;

  const reduceMotion = window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!overlay || !ctx || reduceMotion || playing) return Promise.resolve();

  playing = true;
  return preloadLaunchAssets().then(() => new Promise(resolve => {
    if (!headBuffer) { playing = false; resolve(); return; }
    run({ overlay, canvas, ctx, craft, countdown, resolve });
  }));
}

function run({ overlay, canvas, ctx, craft, countdown, resolve }) {
  let width = 0;
  let height = 0;
  let stars = [];
  let skyBuffer = null;
  let layout = null;
  let maxDepth = 7;
  let drawDepth = 7;

  const smoke = [];
  const sparks = [];
  const frameTimes = [];
  let lastFrame = 0;
  let rafId = null;
  let watchdogId = null;
  let finished = false;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    maxDepth = maxDepthFor(width);
    drawDepth = Math.min(drawDepth, maxDepth);
    layout = fitTree(width, height, maxDepth);
    stars = makeStars(width, height, width < 420 ? 60 : 110);
    skyBuffer = buildSkyBuffer(dpr);
    craft.style.width = `${Math.min(width * 0.58, 300)}px`;
  }

  function finish() {
    if (finished) return;
    finished = true;
    cancelAnimationFrame(rafId);
    clearTimeout(watchdogId);
    window.removeEventListener('resize', resize);
    overlay.classList.remove('playing');
    overlay.style.opacity = '';
    document.body.style.overflow = '';
    playing = false;
    resolve();
  }

  // ── Painting ────────────────────────────────────────────────────────────────

  // Gradient and ground never change, so they are rasterised once per resize
  // and blitted; only the stars are redrawn per frame.
  function buildSkyBuffer(dpr) {
    const buffer = document.createElement('canvas');
    buffer.width = Math.round(width * dpr);
    buffer.height = Math.round(height * dpr);
    const bctx = buffer.getContext('2d');
    bctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const sky = bctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, '#0b1026');
    sky.addColorStop(0.55, '#1b2450');
    sky.addColorStop(1, '#3a2f4d');
    bctx.fillStyle = sky;
    bctx.fillRect(0, 0, width, height);

    bctx.fillStyle = '#101a18';
    bctx.beginPath();
    bctx.moveTo(0, height);
    bctx.lineTo(0, height * 0.955);
    bctx.quadraticCurveTo(width / 2, height * 0.925, width, height * 0.955);
    bctx.lineTo(width, height);
    bctx.closePath();
    bctx.fill();
    return buffer;
  }

  function paintSky(t) {
    ctx.drawImage(skyBuffer, 0, 0, width, height);

    ctx.fillStyle = '#fff';
    for (const star of stars) {
      ctx.globalAlpha = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(t / 480 + star.phase));
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function paintTree(t) {
    const growth = treeGrowth(t, maxDepth);
    if (growth <= 0) return;

    const nodes = pythagorasNodes({
      growth,
      maxDepth: drawDepth,
      angle: swayAngleAt(t),
      baseSize: layout.baseSize * swayRecoil(t),
      origin: layout.origin,
      minSize: 1.5,
    });

    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    for (const node of nodes) {
      const size = node.size * node.scale;
      if (size < 1) continue;
      ctx.save();
      ctx.translate(node.x, node.y);
      ctx.rotate(node.rotation);
      ctx.drawImage(headBuffer, -size / 2, -size, size, size);
      if (size > 14) {
        ctx.lineWidth = 1;
        ctx.strokeRect(-size / 2, -size, size, size);
      }
      ctx.restore();
    }
  }

  function spawnSmoke(x, y, t) {
    if (smoke.length > 70) return;
    smoke.push({
      x: x + (Math.random() - 0.5) * 18,
      y,
      vx: (Math.random() - 0.5) * 1.4,
      vy: 0.4 + Math.random() * 0.9,
      r: 7 + Math.random() * 13,
      born: t,
      life: 650 + Math.random() * 500,
    });
  }

  function spawnSparks(x, y, t) {
    for (let i = 0; i < 44; i++) {
      const a = (i / 44) * Math.PI * 2;
      const speed = 2.2 + Math.random() * 4.5;
      sparks.push({
        x, y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        born: t,
        life: 700 + Math.random() * 600,
      });
    }
  }

  function paintSmoke(t) {
    for (let i = smoke.length - 1; i >= 0; i--) {
      const p = smoke[i];
      const age = (t - p.born) / p.life;
      if (age >= 1) { smoke.splice(i, 1); continue; }
      ctx.globalAlpha = 0.20 * (1 - age);
      ctx.fillStyle = '#c9c4d8';
      ctx.beginPath();
      ctx.arc(p.x + p.vx * (t - p.born) / 16, p.y + p.vy * (t - p.born) / 16, p.r * (1 + age * 1.1), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function paintSparks(t) {
    for (let i = sparks.length - 1; i >= 0; i--) {
      const p = sparks[i];
      const age = (t - p.born) / p.life;
      if (age >= 1) { sparks.splice(i, 1); continue; }
      const dt = (t - p.born) / 16;
      ctx.globalAlpha = 1 - age;
      ctx.fillStyle = age < 0.5 ? '#ffe066' : '#f5a623';
      ctx.beginPath();
      ctx.arc(p.x + p.vx * dt, p.y + p.vy * dt + 0.04 * dt * dt, 2.4 * (1 - age) + 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // ── Craft + countdown ───────────────────────────────────────────────────────

  function placeCraft(t) {
    const padX = width / 2;
    const padY = height * 0.94;
    const p = climbProgress(t);
    const travel = padY + height * 0.45;

    const idle = t < T_COUNTDOWN_END ? Math.sin(t / 320) * 3 : 0;
    const rattle = t >= T_COUNTDOWN_END && t < T_LIFTOFF ? Math.sin(t / 22) * 2.5 : 0;

    const x = padX + Math.sin(p * 5.5) * width * 0.055 + rattle;
    const y = padY - p * travel + idle;
    const tilt = Math.sin(p * 5.5) * 0.14 + p * 0.05;
    const scale = 1 - 0.4 * p;

    craft.style.transform =
      `translate(${x}px, ${y}px) rotate(${tilt}rad) scale(${scale}) translate(-50%, -100%)`;
    craft.style.opacity = t >= T_EXIT_END ? '0' : '1';

    const flame = t < T_COUNTDOWN_END
      ? 0
      : t < T_LIFTOFF
        ? clamp01((t - T_COUNTDOWN_END) / (T_LIFTOFF - T_COUNTDOWN_END)) * (0.9 + Math.sin(t / 30) * 0.25)
        : 1.15 + Math.sin(t / 45) * 0.3;
    const flameEl = document.getElementById('craft-flame');
    if (flameEl) {
      flameEl.setAttribute('transform', `translate(120 312) scale(${1 + flame * 0.3} ${flame}) translate(-120 -312)`);
    }
    return { x, y };
  }

  function updateCountdown(t) {
    if (t >= T_LIFTOFF + 400) { countdown.style.opacity = '0'; return; }
    let current = null;
    for (const step of COUNTDOWN) {
      if (t >= step.at) current = step;
    }
    if (!current) { countdown.style.opacity = '0'; return; }
    const age = t - current.at;
    countdown.textContent = current.text;
    // "DÉCOLLAGE !" needs far less room per character than a single digit.
    countdown.style.fontSize = current.text.length > 2
      ? 'clamp(1.6rem, 9vw, 3.6rem)'
      : 'clamp(3rem, 17vw, 7rem)';
    countdown.style.opacity = String(clamp01(1 - age / 480));
    countdown.style.transform = `translate(-50%, -50%) scale(${lerp(1.9, 0.85, clamp01(age / 420))})`;
  }

  // Back off a level or two of depth if the device cannot hold a smooth frame
  // rate. Sampling only starts once the tree is on screen — earlier frames are
  // the bare countdown and say nothing about the load this is meant to shed.
  const BUDGET_SAMPLE_FROM = T_LIFTOFF + 700;
  const BUDGET_SAMPLE_SIZE = 40;

  function checkBudget(now, t) {
    const previous = lastFrame;
    lastFrame = now;
    if (t < BUDGET_SAMPLE_FROM || !previous) return;
    if (frameTimes.length >= BUDGET_SAMPLE_SIZE) return;

    frameTimes.push(now - previous);
    if (frameTimes.length < BUDGET_SAMPLE_SIZE) return;

    const median = [...frameTimes].sort((a, b) => a - b)[BUDGET_SAMPLE_SIZE >> 1];
    if (median > 30) drawDepth = Math.max(5, drawDepth - 2);
    else if (median > 22) drawDepth = Math.max(5, drawDepth - 1);
  }

  // ── Loop ────────────────────────────────────────────────────────────────────

  let start = null;
  let sparked = false;

  function frame(now) {
    if (start === null) start = now;
    const t = now - start;
    checkBudget(now, t);

    if (t >= DURATION) { finish(); return; }

    overlay.style.opacity = String(overlayOpacity(t));

    const shake = shakeAmount(t);
    ctx.save();
    if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);

    paintSky(t);

    const craftPos = placeCraft(t);
    if (t >= T_COUNTDOWN_END && t < T_EXIT_END && craftPos.y > 0 && t % 2 < 1.2) {
      spawnSmoke(craftPos.x, craftPos.y, t);
    }
    paintSmoke(t);
    paintTree(t);

    if (!sparked && t >= T_EXIT_END) {
      sparked = true;
      spawnSparks(craftPos.x, Math.max(craftPos.y, height * 0.12), t);
    }
    paintSparks(t);
    ctx.restore();

    updateCountdown(t);
    rafId = requestAnimationFrame(frame);
  }

  document.body.style.overflow = 'hidden';
  overlay.classList.add('playing');
  overlay.style.opacity = '0';
  countdown.style.opacity = '0';
  resize();
  window.addEventListener('resize', resize);
  watchdogId = setTimeout(finish, WATCHDOG_MS);
  rafId = requestAnimationFrame(frame);
}
