/*
  Flowdan Floaters — viscous flow-field simulation

  Required image:
    flowdan.png

  The sketch automatically creates many visual variants from that one image.
  No additional PNG files are required.
*/

let sourceImage;
let baseSprite;
let canvasElement;
let floaters = [];

const DEVICE_IS_MOBILE =
  /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
  navigator.maxTouchPoints > 1;

const REDUCED_MOTION = window.matchMedia?.(
  '(prefers-reduced-motion: reduce)'
).matches ?? false;

const FLOATER_COUNT = REDUCED_MOTION
  ? 8
  : DEVICE_IS_MOBILE
    ? 14
    : 24;

const MAX_SPRITE_SIDE = DEVICE_IS_MOBILE ? 260 : 420;

const pointer = {
  active: false,
  x: 0,
  y: 0,
  previousX: 0,
  previousY: 0,
  vx: 0,
  vy: 0,
  smoothedVX: 0,
  smoothedVY: 0,
  lastTime: 0
};

let fluid = {
  vx: 0,
  vy: 0,
  displacementX: 0,
  displacementY: 0
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
  canvasElement.style.touchAction = 'none';

  pixelDensity(1);
  frameRate(60);
  imageMode(CENTER);
  noStroke();

  prepareSprite();
  rebuildFloaters();
  installPointerInput();

  document
    .getElementById('reset-button')
    ?.addEventListener('click', rebuildFloaters);
}

function prepareSprite() {
  baseSprite = sourceImage.get();

  const longestSide = Math.max(baseSprite.width, baseSprite.height);

  if (longestSide > MAX_SPRITE_SIDE) {
    const scale = MAX_SPRITE_SIDE / longestSide;

    baseSprite.resize(
      Math.max(1, Math.round(baseSprite.width * scale)),
      Math.max(1, Math.round(baseSprite.height * scale))
    );
  }
}

function rebuildFloaters() {
  floaters.length = 0;

  for (let index = 0; index < FLOATER_COUNT; index += 1) {
    floaters.push(createFloater(index));
  }

  // Distant elements are rendered first.
  floaters.sort((a, b) => b.depth - a.depth);

  fluid.vx = 0;
  fluid.vy = 0;
  fluid.displacementX = 0;
  fluid.displacementY = 0;
}

function createFloater(index) {
  const depth = random();
  const near = 1 - depth;
  const reference = min(width, height);

  return {
    x: random(width),
    y: random(height),

    anchorX: random(width),
    anchorY: random(height),

    vx: random(-3, 3),
    vy: random(-3, 3),

    depth,
    mass: lerp(1.9, 0.7, near),
    response: lerp(0.22, 0.68, near),
    spring: lerp(0.28, 0.10, near),
    drag: lerp(1.45, 0.82, near),

    size:
      reference *
      lerp(0.075, 0.22, near) *
      random(0.78, 1.26),

    alpha:
      lerp(24, 92, near) *
      random(0.82, 1.08),

    blurAmount:
      depth > 0.66
        ? random(1.5, 3.5)
        : depth < 0.22
          ? random(0.5, 2.0)
          : random(0, 1.0),

    angle: random(TWO_PI),
    angularVelocity: random(-0.08, 0.08),

    wobblePhaseX: random(TWO_PI),
    wobblePhaseY: random(TWO_PI),
    wobbleRateX: random(0.18, 0.42),
    wobbleRateY: random(0.17, 0.38),
    wobbleAmplitude: random(2, 8) * lerp(0.45, 1.0, near),

    imageFlip: random() > 0.5 ? 1 : -1,

    // Slightly varied tonal treatment from a single PNG.
    tintValue: random(220, 255),

    index
  };
}

function draw() {
  clear();

  const dt = Math.min(deltaTime, 33.33) / 1000;
  const time = millis() / 1000;

  updatePointerSmoothing(dt);
  updateFluid(dt);

  for (const floater of floaters) {
    updateFloater(floater, dt, time);
    renderFloater(floater);
  }
}

function updatePointerSmoothing(dt) {
  const targetVX = pointer.active ? pointer.vx : 0;
  const targetVY = pointer.active ? pointer.vy : 0;

  const smoothing = 1 - Math.exp(-(pointer.active ? 9.0 : 3.0) * dt);

  pointer.smoothedVX = lerp(pointer.smoothedVX, targetVX, smoothing);
  pointer.smoothedVY = lerp(pointer.smoothedVY, targetVY, smoothing);
}

function updateFluid(dt) {
  /*
    Pointer motion excites the virtual vitreous.
    The vitreous continues moving after the gesture and then settles.
  */
  const inputStrength = REDUCED_MOTION ? 0.08 : 0.22;

  fluid.vx += pointer.smoothedVX * inputStrength * dt;
  fluid.vy += pointer.smoothedVY * inputStrength * dt;

  // Spring toward equilibrium.
  fluid.vx += -fluid.displacementX * 5.4 * dt;
  fluid.vy += -fluid.displacementY * 5.4 * dt;

  // Viscous damping.
  const fluidDamping = Math.exp(-3.15 * dt);
  fluid.vx *= fluidDamping;
  fluid.vy *= fluidDamping;

  fluid.displacementX += fluid.vx * dt;
  fluid.displacementY += fluid.vy * dt;

  // Keep displacement bounded after extreme swipes.
  const maxDisplacement = min(width, height) * 0.23;
  fluid.displacementX = constrain(
    fluid.displacementX,
    -maxDisplacement,
    maxDisplacement
  );
  fluid.displacementY = constrain(
    fluid.displacementY,
    -maxDisplacement,
    maxDisplacement
  );
}

function updateFloater(f, dt, time) {
  const near = 1 - f.depth;

  /*
    Each particle receives the common fluid movement with a different
    response according to depth and mass.
  */
  const targetX =
    f.anchorX +
    fluid.displacementX * lerp(0.34, 1.15, near);

  const targetY =
    f.anchorY +
    fluid.displacementY * lerp(0.34, 1.15, near);

  const springX = (targetX - f.x) * f.spring;
  const springY = (targetY - f.y) * f.spring;

  /*
    Flow force adds overshoot.
    Near floaters respond more strongly and settle more visibly.
  */
  const flowForceX = fluid.vx * f.response;
  const flowForceY = fluid.vy * f.response;

  const wobbleX =
    Math.sin(time * f.wobbleRateX + f.wobblePhaseX) *
    f.wobbleAmplitude;

  const wobbleY =
    Math.cos(time * f.wobbleRateY + f.wobblePhaseY) *
    f.wobbleAmplitude;

  f.vx += ((springX + flowForceX + wobbleX * 0.12) / f.mass) * dt * 60;
  f.vy += ((springY + flowForceY + wobbleY * 0.12) / f.mass) * dt * 60;

  const particleDamping = Math.exp(-f.drag * dt);
  f.vx *= particleDamping;
  f.vy *= particleDamping;

  f.x += f.vx * dt;
  f.y += f.vy * dt;

  f.angle +=
    (f.angularVelocity + fluid.vx * 0.000035 * f.imageFlip) * dt;

  wrapFloater(f);
}

function renderFloater(f) {
  push();

  translate(f.x, f.y);
  rotate(f.angle);
  scale(f.imageFlip, 1);

  tint(f.tintValue, f.alpha);

  if (f.blurAmount > 0.25) {
    drawingContext.filter = `blur(${f.blurAmount}px)`;
  }

  /*
    Preserve the original image aspect ratio instead of forcing a square.
  */
  const aspect =
    baseSprite.width > 0 && baseSprite.height > 0
      ? baseSprite.width / baseSprite.height
      : 1;

  let drawWidth = f.size;
  let drawHeight = f.size;

  if (aspect >= 1) {
    drawHeight = f.size / aspect;
  } else {
    drawWidth = f.size * aspect;
  }

  image(baseSprite, 0, 0, drawWidth, drawHeight);

  drawingContext.filter = 'none';
  pop();
}

function wrapFloater(f) {
  const margin = f.size * 0.7;

  if (f.x < -margin) {
    f.x = width + margin;
    f.anchorX += width + margin * 2;
  } else if (f.x > width + margin) {
    f.x = -margin;
    f.anchorX -= width + margin * 2;
  }

  if (f.y < -margin) {
    f.y = height + margin;
    f.anchorY += height + margin * 2;
  } else if (f.y > height + margin) {
    f.y = -margin;
    f.anchorY -= height + margin * 2;
  }
}

function installPointerInput() {
  const options = { passive: false };

  canvasElement.addEventListener(
    'pointerdown',
    event => {
      event.preventDefault();

      pointer.active = true;
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.previousX = pointer.x;
      pointer.previousY = pointer.y;
      pointer.vx = 0;
      pointer.vy = 0;
      pointer.lastTime = event.timeStamp;

      canvasElement.setPointerCapture?.(event.pointerId);
    },
    options
  );

  canvasElement.addEventListener(
    'pointermove',
    event => {
      event.preventDefault();

      const x = event.clientX;
      const y = event.clientY;

      if (!pointer.active && event.pointerType !== 'mouse') {
        return;
      }

      const elapsed =
        Math.max(8, Math.min(50, event.timeStamp - pointer.lastTime)) /
        1000;

      const dx = x - pointer.previousX;
      const dy = y - pointer.previousY;

      const measuredVX = constrain(dx / elapsed, -2400, 2400);
      const measuredVY = constrain(dy / elapsed, -2400, 2400);

      pointer.vx = lerp(pointer.vx, measuredVX, 0.52);
      pointer.vy = lerp(pointer.vy, measuredVY, 0.52);

      pointer.x = x;
      pointer.y = y;
      pointer.previousX = x;
      pointer.previousY = y;
      pointer.lastTime = event.timeStamp;
    },
    options
  );

  const endPointer = event => {
    event.preventDefault();
    pointer.active = false;
    pointer.vx = 0;
    pointer.vy = 0;
    canvasElement.releasePointerCapture?.(event.pointerId);
  };

  canvasElement.addEventListener('pointerup', endPointer, options);
  canvasElement.addEventListener('pointercancel', endPointer, options);
  canvasElement.addEventListener('pointerleave', event => {
    if (event.pointerType === 'mouse') {
      pointer.active = false;
      pointer.vx = 0;
      pointer.vy = 0;
    }
  });
}

function windowResized() {
  const holder = document.getElementById('canvas-holder');
  resizeCanvas(holder.clientWidth, holder.clientHeight);

  for (const f of floaters) {
    f.anchorX = constrain(f.anchorX, 0, width);
    f.anchorY = constrain(f.anchorY, 0, height);
    f.x = constrain(f.x, -f.size, width + f.size);
    f.y = constrain(f.y, -f.size, height + f.size);
  }
}
