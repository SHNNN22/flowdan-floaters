/*
  Flowdan Floaters — direct touch-follow version

  Interaction:
  - Drag left/right/up/down: floaters move in the SAME direction.
  - Near floaters move more than distant floaters.
  - Releasing the finger leaves a short, smooth inertia.
  - Gentle ambient drift remains, but cannot overpower touch input.
*/

let sourceImage;
let spriteImage;
let canvasElement;
let floaters = [];

const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
const FLOATER_COUNT = isMobile ? 14 : 22;
const SPRITE_MAX_SIDE = isMobile ? 220 : 300;

const pointer = {
  active: false,
  lastX: 0,
  lastY: 0,
  pendingX: 0,
  pendingY: 0,
  velocityX: 0,
  velocityY: 0,
  lastEventTime: 0
};

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

  pixelDensity(1);
  frameRate(60);
  imageMode(CENTER);
  noStroke();

  prepareSprite();
  createFloaters();
  installPointerControls();

  const resetButton = document.getElementById('reset-button');
  if (resetButton) resetButton.addEventListener('click', createFloaters);
}

function prepareSprite() {
  spriteImage = sourceImage.get();

  const longestSide = Math.max(spriteImage.width, spriteImage.height);
  if (longestSide > SPRITE_MAX_SIDE) {
    const scale = SPRITE_MAX_SIDE / longestSide;
    spriteImage.resize(
      Math.max(1, Math.round(spriteImage.width * scale)),
      Math.max(1, Math.round(spriteImage.height * scale))
    );
  }
}

function createFloaters() {
  floaters.length = 0;

  for (let i = 0; i < FLOATER_COUNT; i += 1) {
    const depth = random(); // 0 = near, 1 = far
    const base = min(width, height);
    const size = base * lerp(0.18, 0.075, depth) * random(0.78, 1.22);

    floaters.push({
      x: random(-size * 0.25, width + size * 0.25),
      y: random(-size * 0.25, height + size * 0.25),

      // Small initial velocity only.
      vx: random(-1.5, 1.5),
      vy: random(-1.2, 1.2),

      depth,
      size,
      alpha: lerp(82, 34, depth) * random(0.82, 1.08),

      angle: random(TWO_PI),
      angularVelocity: random(-0.08, 0.08),

      driftPhaseX: random(TWO_PI),
      driftPhaseY: random(TWO_PI),
      driftRateX: random(0.25, 0.5),
      driftRateY: random(0.22, 0.46)
    });
  }

  // Draw distant floaters first.
  floaters.sort((a, b) => b.depth - a.depth);
}

function draw() {
  clear();

  const dt = Math.min(deltaTime, 34) / 1000;
  const now = millis() / 1000;

  // Consume the exact finger displacement once per frame.
  const dragX = pointer.pendingX;
  const dragY = pointer.pendingY;
  pointer.pendingX = 0;
  pointer.pendingY = 0;

  // Smooth release inertia.
  if (!pointer.active) {
    pointer.velocityX *= Math.pow(0.045, dt);
    pointer.velocityY *= Math.pow(0.045, dt);
  }

  for (let i = 0; i < floaters.length; i += 1) {
    const f = floaters[i];
    const nearFactor = 1 - f.depth;

    /*
      Direct follow:
      near floaters follow approximately 75% of finger displacement;
      distant floaters follow approximately 30%.
    */
    const directFollow = lerp(0.30, 0.75, nearFactor);
    f.x += dragX * directFollow;
    f.y += dragY * directFollow;

    /*
      Inertia is based on swipe speed and continues after release.
      It moves in the SAME direction as the finger.
    */
    const inertiaStrength = lerp(0.10, 0.24, nearFactor);
    if (pointer.active) {
      f.vx += pointer.velocityX * inertiaStrength * dt;
      f.vy += pointer.velocityY * inertiaStrength * dt;
    }

    // Very subtle ambient drift; touch remains dominant.
    const driftStrength = lerp(0.25, 0.75, nearFactor);
    f.vx += Math.sin(now * f.driftRateX + f.driftPhaseX) * driftStrength * dt;
    f.vy += Math.cos(now * f.driftRateY + f.driftPhaseY) * driftStrength * dt;

    // Smooth damping.
    const damping = Math.pow(0.10, dt);
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

  canvasElement.style.touchAction = 'none';

  canvasElement.addEventListener('pointerdown', event => {
    event.preventDefault();

    pointer.active = true;
    pointer.lastX = event.clientX;
    pointer.lastY = event.clientY;
    pointer.pendingX = 0;
    pointer.pendingY = 0;
    pointer.velocityX = 0;
    pointer.velocityY = 0;
    pointer.lastEventTime = event.timeStamp;

    canvasElement.setPointerCapture?.(event.pointerId);
  }, options);

  canvasElement.addEventListener('pointermove', event => {
    if (!pointer.active) return;
    event.preventDefault();

    const x = event.clientX;
    const y = event.clientY;
    const dx = x - pointer.lastX;
    const dy = y - pointer.lastY;

    const elapsed = Math.max(
      8,
      Math.min(50, event.timeStamp - pointer.lastEventTime)
    ) / 1000;

    // Add every movement sample, including diagonal and reversed motion.
    pointer.pendingX += dx;
    pointer.pendingY += dy;

    // Low-pass filtering prevents noisy iPhone touch samples.
    const measuredVX = constrain(dx / elapsed, -2200, 2200);
    const measuredVY = constrain(dy / elapsed, -2200, 2200);
    pointer.velocityX = lerp(pointer.velocityX, measuredVX, 0.45);
    pointer.velocityY = lerp(pointer.velocityY, measuredVY, 0.45);

    pointer.lastX = x;
    pointer.lastY = y;
    pointer.lastEventTime = event.timeStamp;
  }, options);

  const endPointer = event => {
    if (!pointer.active) return;
    event.preventDefault();
    pointer.active = false;
    canvasElement.releasePointerCapture?.(event.pointerId);
  };

  canvasElement.addEventListener('pointerup', endPointer, options);
  canvasElement.addEventListener('pointercancel', endPointer, options);
  canvasElement.addEventListener('lostpointercapture', () => {
    pointer.active = false;
  });
}

function windowResized() {
  const holder = document.getElementById('canvas-holder');
  resizeCanvas(holder.clientWidth, holder.clientHeight);
  createFloaters();
}
