/*
  Flowdan Floaters — mobile-optimised p5.js version

  Main performance changes:
  - Uses pixelDensity(1) on phones to reduce GPU workload.
  - Resizes the source PNG once instead of scaling a huge image every frame.
  - Uses fewer particles on mobile.
  - Avoids creating p5.Vector objects inside draw().
  - Uses Pointer Events, so mouse, touch and Apple Pencil share one path.
  - Uses frame-rate-independent movement and clamps large delta-time spikes.
*/

let sourceImage;
let spriteImage;
let canvasElement;
let floaters = [];

const pointer = {
  active: false,
  x: 0,
  y: 0,
  previousX: 0,
  previousY: 0,
  velocityX: 0,
  velocityY: 0,
  impulseX: 0,
  impulseY: 0
};

const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
const floaterCount = isMobile ? 14 : 22;
const spriteMaxSide = isMobile ? 220 : 300;

function preload() {
  sourceImage = loadImage(
    'flowdan.png',
    () => {},
    error => console.error('Could not load flowdan.png', error)
  );
}

function setup() {
  const holder = document.getElementById('canvas-holder');
  const canvas = createCanvas(holder.clientWidth, holder.clientHeight);
  canvas.parent(holder);
  canvasElement = canvas.elt;

  pixelDensity(isMobile ? 1 : Math.min(2, window.devicePixelRatio || 1));
  frameRate(60);
  imageMode(CENTER);
  noStroke();

  prepareSprite();
  createFloaters();
  installPointerControls();

  document.getElementById('reset-button').addEventListener('click', createFloaters);
}

function prepareSprite() {
  // Work on a copy so the original loaded asset remains untouched.
  spriteImage = sourceImage.get();

  const longestSide = Math.max(spriteImage.width, spriteImage.height);
  if (longestSide > spriteMaxSide) {
    const scale = spriteMaxSide / longestSide;
    spriteImage.resize(
      Math.max(1, Math.round(spriteImage.width * scale)),
      Math.max(1, Math.round(spriteImage.height * scale))
    );
  }
}

function createFloaters() {
  floaters.length = 0;

  for (let i = 0; i < floaterCount; i += 1) {
    const depth = random(); // 0 = near, 1 = far
    const base = min(width, height);
    const size = base * lerp(0.18, 0.075, depth) * random(0.78, 1.22);

    floaters.push({
      x: random(-size * 0.25, width + size * 0.25),
      y: random(-size * 0.25, height + size * 0.25),
      vx: random(-4, 4),
      vy: random(-3, 3),
      driftPhaseX: random(TWO_PI),
      driftPhaseY: random(TWO_PI),
      driftRateX: random(0.35, 0.7),
      driftRateY: random(0.28, 0.62),
      depth,
      size,
      alpha: lerp(82, 34, depth) * random(0.82, 1.08),
      angle: random(TWO_PI),
      angularVelocity: random(-0.11, 0.11) * lerp(1, 0.45, depth)
    });
  }

  // Far objects first, near objects last.
  floaters.sort((a, b) => b.depth - a.depth);
}

function draw() {
  clear();

  // Clamp pauses caused by Safari UI, tab switching or dropped frames.
  const dt = Math.min(deltaTime, 34) / 1000;
  const now = millis() / 1000;

  // Smooth and decay the gesture impulse.
  pointer.impulseX += (pointer.velocityX - pointer.impulseX) * 0.26;
  pointer.impulseY += (pointer.velocityY - pointer.impulseY) * 0.26;
  pointer.velocityX *= 0.72;
  pointer.velocityY *= 0.72;
  pointer.impulseX *= 0.91;
  pointer.impulseY *= 0.91;

  for (let i = 0; i < floaters.length; i += 1) {
    const f = floaters[i];
    const nearFactor = 1 - f.depth;

    // Quick swipes create a strong opposite-direction lag.
    const response = lerp(0.018, 0.052, nearFactor);
    f.vx -= pointer.impulseX * response * dt;
    f.vy -= pointer.impulseY * response * dt;

    // Continuous subtle organic drift, visible even without interaction.
    const driftStrength = lerp(3.5, 8.5, nearFactor);
    f.vx += Math.sin(now * f.driftRateX + f.driftPhaseX) * driftStrength * dt;
    f.vy += Math.cos(now * f.driftRateY + f.driftPhaseY) * driftStrength * dt;

    // Exponential damping behaves consistently at 30 or 60 fps.
    const dampingPerSecond = lerp(0.42, 0.28, nearFactor);
    const damping = Math.pow(dampingPerSecond, dt);
    f.vx *= damping;
    f.vy *= damping;

    f.x += f.vx * dt;
    f.y += f.vy * dt;
    f.angle += f.angularVelocity * dt;

    wrapFloater(f);

    push();
    translate(f.x, f.y);
    rotate(f.angle);
    tint(255, f.alpha);
    image(spriteImage, 0, 0, f.size, f.size);
    pop();
  }
}

function wrapFloater(f) {
  const margin = f.size * 0.58;

  if (f.x < -margin) f.x = width + margin;
  else if (f.x > width + margin) f.x = -margin;

  if (f.y < -margin) f.y = height + margin;
  else if (f.y > height + margin) f.y = -margin;
}

function installPointerControls() {
  const options = { passive: false };

  canvasElement.addEventListener('pointerdown', event => {
    event.preventDefault();
    pointer.active = true;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.previousX = pointer.x;
    pointer.previousY = pointer.y;
    canvasElement.setPointerCapture?.(event.pointerId);
  }, options);

  canvasElement.addEventListener('pointermove', event => {
    event.preventDefault();

    const x = event.clientX;
    const y = event.clientY;
    const dx = x - pointer.previousX;
    const dy = y - pointer.previousY;

    // Convert movement into approximate pixels per second and cap spikes.
    const seconds = Math.max(0.008, Math.min(0.05, deltaTime / 1000));
    pointer.velocityX = constrain(dx / seconds, -2400, 2400);
    pointer.velocityY = constrain(dy / seconds, -2400, 2400);

    pointer.x = x;
    pointer.y = y;
    pointer.previousX = x;
    pointer.previousY = y;
  }, options);

  const endPointer = event => {
    event.preventDefault();
    pointer.active = false;
  };

  canvasElement.addEventListener('pointerup', endPointer, options);
  canvasElement.addEventListener('pointercancel', endPointer, options);
}

function windowResized() {
  const holder = document.getElementById('canvas-holder');
  resizeCanvas(holder.clientWidth, holder.clientHeight);
  createFloaters();
}
