/*
  Flowdan Floaters v2
  - brighter summer sky handled in styles.css
  - stronger individuality between floaters
  - one main overshoot, reduced bounce range
  - one source image: flowdan.png
*/

let sourceImage;
let spriteImage;
let canvasElement;
let floaters = [];

const IS_MOBILE =
  /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
  navigator.maxTouchPoints > 1;

const COUNT = IS_MOBILE ? 14 : 24;
const MAX_SPRITE_SIDE = IS_MOBILE ? 260 : 420;

const pointer = {
  active: false,
  lastX: 0,
  lastY: 0,
  lastTime: 0
};

function preload() {
  sourceImage = loadImage(
    'flowdan.png',
    () => {},
    error => console.error('Unable to load flowdan.png', error)
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
  resetFloaters();
  installPointerControls();

  document
    .getElementById('reset-button')
    ?.addEventListener('click', resetFloaters);
}

function prepareSprite() {
  spriteImage = sourceImage.get();

  const longest = Math.max(spriteImage.width, spriteImage.height);

  if (longest > MAX_SPRITE_SIDE) {
    const scale = MAX_SPRITE_SIDE / longest;
    spriteImage.resize(
      Math.max(1, Math.round(spriteImage.width * scale)),
      Math.max(1, Math.round(spriteImage.height * scale))
    );
  }
}

function resetFloaters() {
  floaters = [];

  const reference = min(width, height);

  for (let i = 0; i < COUNT; i += 1) {
    const depth = random();
    const near = 1 - depth;

    /*
      Personality groups:
      some barely react, some move strongly, some settle quickly.
    */
    const personality = random();
    const responseClass =
      personality < 0.24 ? 0.38 :
      personality < 0.62 ? 0.72 :
      1.0;

    const springBase = lerp(5.2, 9.0, near);
    const dragBase = lerp(5.1, 6.8, depth);

    floaters.push({
      anchorX: random(width),
      anchorY: random(height),

      offsetX: random(-5, 5),
      offsetY: random(-5, 5),

      velocityX: 0,
      velocityY: 0,

      depth,

      mass: lerp(1.9, 0.72, near) * random(0.78, 1.34),

      impulseScale:
        lerp(0.16, 0.58, near) *
        responseClass *
        random(0.76, 1.18),

      spring:
        springBase *
        random(0.90, 1.12),

      drag:
        dragBase *
        random(0.94, 1.12),

      size:
        reference *
        lerp(0.065, 0.23, near) *
        random(0.72, 1.30),

      alpha:
        lerp(22, 94, near) *
        random(0.78, 1.10),

      angle: random(TWO_PI),
      angularVelocity: random(-0.07, 0.07),

      flip: random() > 0.5 ? 1 : -1,

      blur:
        depth > 0.72
          ? random(1.4, 3.2)
          : depth < 0.16
            ? random(0.4, 1.6)
            : random(0, 0.8),

      noiseSeedX: random(1000),
      noiseSeedY: random(1000),
      noiseSpeed: random(0.10, 0.24),
      noiseAmount:
        random(1.5, 6.5) *
        lerp(0.35, 1.0, near),

      tintValue: random(228, 255),

      rotationResponse: random(0.000025, 0.00007)
    });
  }

  floaters.sort((a, b) => b.depth - a.depth);
}

function draw() {
  clear();

  const dt = Math.min(deltaTime, 33.33) / 1000;
  const t = millis() / 1000;

  for (const floater of floaters) {
    updateFloater(floater, dt);
    renderFloater(floater, t);
  }
}

function updateFloater(f, dt) {
  /*
    Damped spring.
    Higher drag and slightly stronger spring reduce the bounce range.
  */
  const accelerationX =
    (-f.spring * f.offsetX - f.drag * f.velocityX) / f.mass;

  const accelerationY =
    (-f.spring * f.offsetY - f.drag * f.velocityY) / f.mass;

  f.velocityX += accelerationX * dt;
  f.velocityY += accelerationY * dt;

  f.offsetX += f.velocityX * dt;
  f.offsetY += f.velocityY * dt;

  f.angle +=
    (f.angularVelocity +
      f.velocityX * f.rotationResponse * f.flip) *
    dt;
}

function renderFloater(f, t) {
  const driftX =
    (noise(f.noiseSeedX + t * f.noiseSpeed) - 0.5) *
    2 *
    f.noiseAmount;

  const driftY =
    (noise(f.noiseSeedY + t * f.noiseSpeed) - 0.5) *
    2 *
    f.noiseAmount;

  const x = wrapCoordinate(
    f.anchorX + f.offsetX + driftX,
    width,
    f.size
  );

  const y = wrapCoordinate(
    f.anchorY + f.offsetY + driftY,
    height,
    f.size
  );

  push();
  translate(x, y);
  rotate(f.angle);
  scale(f.flip, 1);

  tint(f.tintValue, f.alpha);

  if (f.blur > 0.25) {
    drawingContext.filter = `blur(${f.blur}px)`;
  }

  const aspect =
    spriteImage.width > 0 && spriteImage.height > 0
      ? spriteImage.width / spriteImage.height
      : 1;

  let drawWidth = f.size;
  let drawHeight = f.size;

  if (aspect >= 1) {
    drawHeight = f.size / aspect;
  } else {
    drawWidth = f.size * aspect;
  }

  image(spriteImage, 0, 0, drawWidth, drawHeight);

  drawingContext.filter = 'none';
  pop();
}

function wrapCoordinate(value, limit, size) {
  const margin = size * 0.65;
  const span = limit + margin * 2;

  let wrapped = value + margin;
  wrapped = ((wrapped % span) + span) % span;

  return wrapped - margin;
}

function applyGestureImpulse(dx, dy, elapsed) {
  const safeElapsed = max(0.008, min(0.05, elapsed));

  const gestureVX = constrain(dx / safeElapsed, -2200, 2200);
  const gestureVY = constrain(dy / safeElapsed, -2200, 2200);

  for (const f of floaters) {
    const variation = random(0.88, 1.12);

    /*
      Reduced from the previous version:
      less immediate displacement and less post-release travel.
    */
    f.offsetX += dx * f.impulseScale * 0.24 * variation;
    f.offsetY += dy * f.impulseScale * 0.24 * variation;

    f.velocityX +=
      gestureVX *
      f.impulseScale *
      0.19 *
      variation /
      f.mass;

    f.velocityY +=
      gestureVY *
      f.impulseScale *
      0.19 *
      variation /
      f.mass;
  }
}

function installPointerControls() {
  const options = { passive: false };

  canvasElement.addEventListener(
    'pointerdown',
    event => {
      event.preventDefault();

      pointer.active = true;
      pointer.lastX = event.clientX;
      pointer.lastY = event.clientY;
      pointer.lastTime = event.timeStamp;

      canvasElement.setPointerCapture?.(event.pointerId);
    },
    options
  );

  canvasElement.addEventListener(
    'pointermove',
    event => {
      if (!pointer.active && event.pointerType !== 'mouse') {
        return;
      }

      event.preventDefault();

      const x = event.clientX;
      const y = event.clientY;

      if (!pointer.active && event.pointerType === 'mouse') {
        pointer.active = true;
        pointer.lastX = x;
        pointer.lastY = y;
        pointer.lastTime = event.timeStamp;
        return;
      }

      const dx = x - pointer.lastX;
      const dy = y - pointer.lastY;
      const elapsed = (event.timeStamp - pointer.lastTime) / 1000;

      if (abs(dx) + abs(dy) > 0.1) {
        applyGestureImpulse(dx, dy, elapsed);
      }

      pointer.lastX = x;
      pointer.lastY = y;
      pointer.lastTime = event.timeStamp;
    },
    options
  );

  const releasePointer = event => {
    event.preventDefault();

    if (event.pointerType !== 'mouse') {
      pointer.active = false;
    }

    canvasElement.releasePointerCapture?.(event.pointerId);
  };

  canvasElement.addEventListener('pointerup', releasePointer, options);
  canvasElement.addEventListener('pointercancel', releasePointer, options);
  canvasElement.addEventListener('pointerleave', event => {
    if (event.pointerType === 'mouse') {
      pointer.active = false;
    }
  });
}

function windowResized() {
  const holder = document.getElementById('canvas-holder');
  resizeCanvas(holder.clientWidth, holder.clientHeight);

  for (const f of floaters) {
    f.anchorX = constrain(f.anchorX, 0, width);
    f.anchorY = constrain(f.anchorY, 0, height);
  }
}
