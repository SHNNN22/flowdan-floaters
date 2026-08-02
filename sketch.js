let flowdanImage;
let floaters = [];
let previousPointer;
let pointerVelocity;
let uiVisible = true;

const SETTINGS = {
  count: 24,
  minSize: 62,
  maxSize: 170,
  movementStrength: 0.075,
  driftStrength: 0.018,
  springStrength: 0.0012,
  dampingNear: 0.91,
  dampingFar: 0.965,
  opacityNear: 72,
  opacityFar: 26,
  blurCopies: 2
};

function preload() {
  flowdanImage = loadImage(
    'flowdan.png',
    () => console.info('Loaded flowdan.png'),
    () => console.error('Missing flowdan.png. Add a transparent PNG with this exact filename.')
  );
}

function setup() {
  const holder = document.getElementById('canvas-holder');
  const canvas = createCanvas(holder.clientWidth, holder.clientHeight);
  canvas.parent(holder);
  pixelDensity(Math.min(window.devicePixelRatio || 1, 2));
  imageMode(CENTER);
  noStroke();

  previousPointer = createVector(width / 2, height / 2);
  pointerVelocity = createVector(0, 0);
  createFloaters();
}

function createFloaters() {
  floaters = Array.from({ length: SETTINGS.count }, () => new Floater());
  floaters.sort((a, b) => b.depth - a.depth);
}

function draw() {
  clear();
  updatePointerVelocity();

  for (const floater of floaters) {
    floater.update(pointerVelocity);
    floater.display();
  }
}

function updatePointerVelocity() {
  const pointer = getPointerPosition();
  const rawVelocity = p5.Vector.sub(pointer, previousPointer);
  pointerVelocity.lerp(rawVelocity, 0.35);
  pointerVelocity.limit(48);
  previousPointer.set(pointer);
}

function getPointerPosition() {
  if (touches.length > 0) {
    return createVector(touches[0].x, touches[0].y);
  }
  return createVector(mouseX, mouseY);
}

class Floater {
  constructor() {
    this.depth = random(0, 1);
    this.position = createVector(random(width), random(height));
    this.anchor = this.position.copy();
    this.velocity = p5.Vector.random2D().mult(random(0.05, 0.35));
    this.noiseOffset = createVector(random(1000), random(1000));
    this.angle = random(TWO_PI);
    this.angularVelocity = random(-0.0025, 0.0025);
    this.baseSize = lerp(SETTINGS.maxSize, SETTINGS.minSize, this.depth) * random(0.78, 1.2);
    this.opacity = lerp(SETTINGS.opacityNear, SETTINGS.opacityFar, this.depth) * random(0.8, 1.08);
    this.phase = random(TWO_PI);
  }

  update(pointerImpulse) {
    const reaction = lerp(1.15, 0.32, this.depth);
    const impulse = pointerImpulse.copy().mult(-SETTINGS.movementStrength * reaction);
    this.velocity.add(impulse);

    const driftAngle = noise(this.noiseOffset.x, this.noiseOffset.y, frameCount * 0.004) * TWO_PI * 2;
    const drift = p5.Vector.fromAngle(driftAngle).mult(SETTINGS.driftStrength * lerp(1.2, 0.55, this.depth));
    this.velocity.add(drift);

    const spring = p5.Vector.sub(this.anchor, this.position).mult(SETTINGS.springStrength);
    this.velocity.add(spring);

    const damping = lerp(SETTINGS.dampingNear, SETTINGS.dampingFar, this.depth);
    this.velocity.mult(damping);
    this.position.add(this.velocity);

    this.angle += this.angularVelocity + sin(frameCount * 0.006 + this.phase) * 0.00045;
    this.anchor.x += sin(frameCount * 0.002 + this.phase) * 0.025;
    this.anchor.y += cos(frameCount * 0.0017 + this.phase) * 0.018;

    this.wrapAroundScreen();
  }

  wrapAroundScreen() {
    const margin = this.baseSize;
    if (this.position.x < -margin) {
      this.position.x = width + margin;
      this.anchor.x = this.position.x;
    }
    if (this.position.x > width + margin) {
      this.position.x = -margin;
      this.anchor.x = this.position.x;
    }
    if (this.position.y < -margin) {
      this.position.y = height + margin;
      this.anchor.y = this.position.y;
    }
    if (this.position.y > height + margin) {
      this.position.y = -margin;
      this.anchor.y = this.position.y;
    }
  }

  display() {
    if (!flowdanImage || flowdanImage.width <= 1) return;

    const pulse = 1 + sin(frameCount * 0.008 + this.phase) * 0.025;
    const size = this.baseSize * pulse;

    push();
    translate(this.position.x, this.position.y);
    rotate(this.angle);

    for (let i = SETTINGS.blurCopies; i >= 1; i--) {
      const spread = i * 1.8;
      tint(255, this.opacity * 0.12);
      image(flowdanImage, spread, 0, size * 1.015, size * 1.015);
      image(flowdanImage, -spread, 0, size * 1.015, size * 1.015);
    }

    tint(255, this.opacity);
    image(flowdanImage, 0, 0, size, size);
    pop();
  }
}

function keyPressed() {
  if (key === 'r' || key === 'R') createFloaters();

  if (key === 'h' || key === 'H') {
    uiVisible = !uiVisible;
    document.querySelector('.ui').classList.toggle('hidden', !uiVisible);
  }
}

function touchMoved() {
  return false;
}

function windowResized() {
  const holder = document.getElementById('canvas-holder');
  resizeCanvas(holder.clientWidth, holder.clientHeight);
}
