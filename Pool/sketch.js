const canvas = document.getElementById("pond");
const ctx = canvas.getContext("2d");

const fish = [];
const ripples = [];
const droplets = [];
const specks = [];
const textureImage = new Image();

const koiPalettes = [
  {
    bodyLight: "#f2ede2",
    bodyDark: "#d1c7b6",
    patchMain: "#e18f24",
    patchSoft: "#f3bf75",
    fin: "rgba(255, 244, 226, 0.52)"
  },
  {
    bodyLight: "#f3eee7",
    bodyDark: "#d7cfc6",
    patchMain: "#cb3a3f",
    patchSoft: "#f4a8ad",
    fin: "rgba(255, 240, 238, 0.54)"
  },
  {
    bodyLight: "#e5c25a",
    bodyDark: "#ba9433",
    patchMain: "#f1d78f",
    patchSoft: "#fff1c6",
    fin: "rgba(253, 241, 199, 0.44)"
  },
  {
    bodyLight: "#ebdfd4",
    bodyDark: "#cec3b7",
    patchMain: "#1e1d1f",
    patchSoft: "#d6a23a",
    fin: "rgba(242, 235, 228, 0.46)"
  },
  {
    bodyLight: "#e58a33",
    bodyDark: "#bb6322",
    patchMain: "#f5c07a",
    patchSoft: "#f1e7da",
    fin: "rgba(246, 224, 196, 0.4)"
  }
];

let width = 0;
let height = 0;
let dpr = 1;
let time = 0;
let lastTime = 0;
let grainCanvas = null;
let textureReady = false;

textureImage.onload = () => {
  textureReady = true;
};
textureImage.src = "pond-texture.jpg";

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerpAngle(start, end, amount) {
  const delta = (end - start + Math.PI * 3) % (Math.PI * 2) - Math.PI;
  return start + delta * amount;
}

function fishCount() {
  return Math.round(clamp(width / 150, 9, 14));
}

function createGrainTexture() {
  const grainWidth = 340;
  const grainHeight = 220;
  grainCanvas = document.createElement("canvas");
  grainCanvas.width = grainWidth;
  grainCanvas.height = grainHeight;

  const grainCtx = grainCanvas.getContext("2d");
  const image = grainCtx.createImageData(grainWidth, grainHeight);
  const data = image.data;

  for (let i = 0; i < data.length; i += 4) {
    const value = 120 + Math.random() * 120;
    const alpha = 8 + Math.random() * 26;
    data[i] = value;
    data[i + 1] = value + rand(-5, 9);
    data[i + 2] = value + rand(10, 20);
    data[i + 3] = alpha;
  }

  grainCtx.putImageData(image, 0, 0);

  grainCtx.save();
  grainCtx.filter = "blur(22px)";
  for (let i = 0; i < 18; i++) {
    grainCtx.fillStyle = `rgba(255, 255, 255, ${rand(0.03, 0.08)})`;
    grainCtx.beginPath();
    grainCtx.ellipse(
      rand(0, grainWidth),
      rand(0, grainHeight),
      rand(16, 54),
      rand(12, 44),
      rand(-1, 1),
      0,
      Math.PI * 2
    );
    grainCtx.fill();
  }
  grainCtx.restore();
}

function resize() {
  width = window.innerWidth;
  height = window.innerHeight;
  dpr = Math.min(window.devicePixelRatio || 1, 2);

  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  createGrainTexture();
  seedScene();
}

function seedScene() {
  fish.length = 0;
  specks.length = 0;
  ripples.length = 0;
  droplets.length = 0;

  for (let i = 0; i < fishCount(); i++) {
    fish.push(new Koi(i));
  }

  const speckCount = Math.round(clamp(width / 24, 26, 54));
  for (let i = 0; i < speckCount; i++) {
    specks.push(new Speck());
  }
}

class Speck {
  constructor() {
    this.reset(true);
  }

  reset(initial = false) {
    this.x = rand(0, width);
    this.y = initial ? rand(0, height) : height + rand(15, 120);
    this.size = rand(1.2, 4.4);
    this.speed = rand(5, 16);
    this.alpha = rand(0.03, 0.14);
    this.phase = rand(0, Math.PI * 2);
    this.drift = rand(-8, 8);
  }

  update(dt) {
    this.y -= this.speed * dt;
    this.x += Math.sin(time * 0.45 + this.phase) * this.drift * dt;

    if (this.y < -16 || this.x < -30 || this.x > width + 30) {
      this.reset();
    }
  }

  draw() {
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.fillStyle = `rgba(225, 245, 244, ${this.alpha})`;
    ctx.beginPath();
    ctx.ellipse(
      this.x + Math.sin(time * 0.8 + this.phase) * 2.5,
      this.y,
      this.size,
      this.size * 0.65,
      this.phase,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.restore();
  }
}

class Ripple {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.age = 0;
    this.life = 2.4;
    this.radius = 8;
    this.phase = rand(0, Math.PI * 2);
  }

  update(dt) {
    this.age += dt;
    const progress = this.age / this.life;
    this.radius = 8 + Math.pow(progress, 1.35) * Math.min(width, height) * 0.24;
    return this.age < this.life;
  }

  draw() {
    const progress = this.age / this.life;
    const baseAlpha = Math.max(0, 0.18 - progress * 0.12);

    ctx.save();
    ctx.lineCap = "round";
    ctx.filter = "blur(0.6px)";

    for (let i = 0; i < 3; i++) {
      const wave = progress - i * 0.11;
      if (wave <= 0) continue;

      const radius = 10 + Math.pow(wave, 1.25) * Math.min(width, height) * 0.28;
      const alpha = baseAlpha - i * 0.038;
      if (alpha <= 0) continue;

      ctx.strokeStyle = `rgba(232, 244, 244, ${alpha})`;
      ctx.lineWidth = Math.max(0.9, 2.2 - i * 0.45 - progress * 0.75);

      ctx.beginPath();
      ctx.arc(this.x, this.y, radius, this.phase + i * 0.7, this.phase + i * 0.7 + Math.PI * 1.35);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(
        this.x,
        this.y,
        radius - 1.8,
        this.phase + Math.PI + i * 0.35,
        this.phase + Math.PI + i * 0.35 + Math.PI * 0.75
      );
      ctx.stroke();
    }

    ctx.filter = "blur(10px)";
    ctx.fillStyle = `rgba(190, 223, 224, ${0.06 * (1 - progress)})`;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

class Droplet {
  constructor(x, y) {
    const angle = rand(-Math.PI * 0.92, -Math.PI * 0.08);
    const speed = rand(70, 150);
    this.x = x;
    this.y = y;
    this.vx = Math.cos(angle) * speed * rand(0.35, 0.9);
    this.vy = Math.sin(angle) * speed;
    this.gravity = rand(220, 300);
    this.life = rand(0.35, 0.6);
    this.age = 0;
    this.size = rand(1.2, 2.8);
  }

  update(dt) {
    this.age += dt;
    this.vy += this.gravity * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    return this.age < this.life;
  }

  draw() {
    const progress = this.age / this.life;
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.fillStyle = `rgba(241, 248, 248, ${0.28 * (1 - progress)})`;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * (1 - progress * 0.3), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

class Koi {
  constructor(index) {
    this.palette = koiPalettes[index % koiPalettes.length];
    this.depth = rand(0.72, 1.2);
    this.length = rand(132, 204) * (0.75 + this.depth * 0.22);
    this.bodyWidth = this.length * rand(0.145, 0.2);
    this.speed = rand(18, 28) * (1.18 - this.depth * 0.08);
    this.turnRate = rand(0.45, 0.82);
    this.x = rand(40, width - 40);
    this.y = rand(height * 0.62, height * 0.94);
    this.angle = rand(-Math.PI, Math.PI);
    this.tailPhase = rand(0, Math.PI * 2);
    this.pulse = rand(0, Math.PI * 2);
    this.wander = 0;
    this.textureOffsetX = Math.random();
    this.textureOffsetY = Math.random();
    this.marks = Array.from({ length: Math.floor(rand(2, 5)) }, () => ({
      x: rand(-0.18, 0.22),
      y: rand(-0.55, 0.55),
      rx: rand(0.08, 0.2),
      ry: rand(0.15, 0.4),
      rotation: rand(-1.2, 1.2),
      alternate: Math.random() > 0.5
    }));
    this.setTarget(true);
  }

  setTarget(initial = false) {
    const margin = 70;
    const spreadX = initial ? width : Math.min(width * 0.36, 320);
    const spreadY = initial ? height : Math.min(height * 0.16, 150);

    this.targetX = clamp(
      initial ? rand(margin, width - margin) : this.x + rand(-spreadX, spreadX),
      margin,
      width - margin
    );
    this.targetY = clamp(
      initial ? rand(height * 0.62, height * 0.92) : this.y + rand(-spreadY, spreadY),
      height * 0.58,
      height * 0.95
    );
    this.wander = rand(2.8, 5.4);
  }

  reactToRipple(x, y) {
    const dx = this.x - x;
    const dy = this.y - y;
    const distance = Math.hypot(dx, dy);

    if (distance > 250) return;

    const strength = 1 - distance / 250;
    const push = 70 + strength * 180;
    this.targetX = clamp(this.x + (dx / Math.max(distance, 1)) * push, 50, width - 50);
    this.targetY = clamp(this.y + (dy / Math.max(distance, 1)) * push, height * 0.54, height * 0.94);
    this.wander = rand(1, 1.8);
  }

  update(dt) {
    this.wander -= dt;

    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const distance = Math.hypot(dx, dy);

    if (this.wander <= 0 || distance < 24) {
      this.setTarget();
    }

    let desiredAngle = Math.atan2(dy, dx);
    desiredAngle += Math.sin(time * 0.45 + this.pulse) * 0.08;

    for (const ripple of ripples) {
      const rx = this.x - ripple.x;
      const ry = this.y - ripple.y;
      const rippleDistance = Math.hypot(rx, ry);
      const influence = ripple.radius + 120;
      if (rippleDistance < influence) {
        const repelAngle = Math.atan2(ry, rx);
        const weight = 1 - rippleDistance / influence;
        desiredAngle = lerpAngle(desiredAngle, repelAngle, weight * 0.48);
      }
    }

    this.angle = lerpAngle(this.angle, desiredAngle, dt * this.turnRate);

    const swim = this.speed * (0.84 + 0.2 * Math.sin(this.tailPhase + this.pulse));
    this.x += Math.cos(this.angle) * swim * dt;
    this.y += Math.sin(this.angle) * swim * dt;

    if (this.x < 30 || this.x > width - 30) {
      this.angle = Math.PI - this.angle;
      this.targetX = clamp(width - this.x, 50, width - 50);
    }

    if (this.y < height * 0.5 || this.y > height - 20) {
      this.angle = -this.angle;
      this.targetY = clamp(height * 1.45 - this.y, height * 0.56, height * 0.92);
    }

    this.x = clamp(this.x, 30, width - 30);
    this.y = clamp(this.y, height * 0.5, height - 20);
    this.tailPhase += dt * (2.8 + this.speed * 0.08);
  }

  traceBody() {
    const length = this.length;
    const halfWidth = this.bodyWidth;

    ctx.beginPath();
    ctx.moveTo(length * 0.5, 0);
    ctx.bezierCurveTo(
      length * 0.28,
      -halfWidth * 0.78,
      -length * 0.02,
      -halfWidth * 0.94,
      -length * 0.42,
      -halfWidth * 0.36
    );
    ctx.quadraticCurveTo(-length * 0.57, -halfWidth * 0.16, -length * 0.6, 0);
    ctx.quadraticCurveTo(-length * 0.57, halfWidth * 0.16, -length * 0.42, halfWidth * 0.36);
    ctx.bezierCurveTo(
      -length * 0.02,
      halfWidth * 0.94,
      length * 0.28,
      halfWidth * 0.78,
      length * 0.5,
      0
    );
    ctx.closePath();
  }

  traceTail(tailSwing) {
    const length = this.length;
    const halfWidth = this.bodyWidth;

    ctx.beginPath();
    ctx.moveTo(-length * 0.54, 0);
    ctx.quadraticCurveTo(
      -length * 0.9,
      -halfWidth * 0.74 + tailSwing,
      -length * 1.02,
      tailSwing * 0.2
    );
    ctx.quadraticCurveTo(
      -length * 0.9,
      halfWidth * 0.74 + tailSwing,
      -length * 0.54,
      0
    );
    ctx.closePath();
  }

  drawFins(tailSwing) {
    const length = this.length;
    const halfWidth = this.bodyWidth;
    const finDrift = Math.sin(this.tailPhase + 0.9) * halfWidth * 0.16;

    ctx.save();
    ctx.fillStyle = this.palette.fin;

    ctx.beginPath();
    ctx.moveTo(-length * 0.1, -halfWidth * 0.12);
    ctx.quadraticCurveTo(
      -length * 0.3,
      -halfWidth * 0.98 + finDrift,
      -length * 0.04,
      -halfWidth * 0.72
    );
    ctx.quadraticCurveTo(
      -length * 0.04,
      -halfWidth * 0.2,
      -length * 0.1,
      -halfWidth * 0.12
    );
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-length * 0.08, halfWidth * 0.14);
    ctx.quadraticCurveTo(
      -length * 0.26,
      halfWidth * 1.02 - finDrift,
      0,
      halfWidth * 0.72
    );
    ctx.quadraticCurveTo(
      -length * 0.02,
      halfWidth * 0.22,
      -length * 0.08,
      halfWidth * 0.14
    );
    ctx.fill();

    const tailGradient = ctx.createLinearGradient(-length, 0, -length * 0.46, 0);
    tailGradient.addColorStop(0, "rgba(255, 255, 255, 0.06)");
    tailGradient.addColorStop(1, this.palette.fin);
    ctx.fillStyle = tailGradient;
    this.traceTail(tailSwing);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(length * 0.03, -halfWidth * 0.08);
    ctx.quadraticCurveTo(length * 0.1, -halfWidth * 0.86, length * 0.18, -halfWidth * 0.12);
    ctx.quadraticCurveTo(length * 0.1, -halfWidth * 0.05, length * 0.03, -halfWidth * 0.08);
    ctx.fill();
    ctx.restore();
  }

  drawPattern() {
    const length = this.length;
    const halfWidth = this.bodyWidth;

    ctx.save();
    this.traceBody();
    ctx.clip();

    if (textureReady) {
      const sampleWidth = textureImage.width * 0.28;
      const sampleHeight = textureImage.height * 0.34;
      const sampleX = (textureImage.width - sampleWidth) * this.textureOffsetX;
      const sampleY = (textureImage.height - sampleHeight) * this.textureOffsetY;

      ctx.globalAlpha = 0.17;
      ctx.drawImage(
        textureImage,
        sampleX,
        sampleY,
        sampleWidth,
        sampleHeight,
        -length * 0.74,
        -halfWidth * 1.1,
        length * 1.34,
        halfWidth * 2.18
      );

      ctx.globalCompositeOperation = "soft-light";
      ctx.globalAlpha = 0.14;
      ctx.drawImage(
        textureImage,
        sampleX * 0.75,
        sampleY * 0.85,
        sampleWidth,
        sampleHeight,
        -length * 0.66,
        -halfWidth * 0.96,
        length * 1.18,
        halfWidth * 1.98
      );

      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
    }

    for (const mark of this.marks) {
      ctx.save();
      ctx.translate(mark.x * length, mark.y * halfWidth);
      ctx.rotate(mark.rotation);
      const fill = ctx.createRadialGradient(0, 0, 1, 0, 0, Math.max(length * mark.rx, halfWidth * mark.ry * 2));
      fill.addColorStop(0, mark.alternate ? this.palette.patchSoft : this.palette.patchMain);
      fill.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.ellipse(0, 0, length * mark.rx, halfWidth * mark.ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.strokeStyle = "rgba(255, 255, 255, 0.09)";
    ctx.lineWidth = 0.7;
    for (let x = -length * 0.34; x <= length * 0.18; x += length * 0.085) {
      for (let y = -halfWidth * 0.56; y <= halfWidth * 0.56; y += halfWidth * 0.28) {
        ctx.beginPath();
        ctx.arc(x + ((Math.round(y * 100) % 2) ? halfWidth * 0.12 : 0), y, halfWidth * 0.18, 0, Math.PI);
        ctx.stroke();
      }
    }

    const bodyHighlight = ctx.createLinearGradient(
      -length * 0.12,
      -halfWidth * 0.78,
      length * 0.2,
      halfWidth * 0.32
    );
    bodyHighlight.addColorStop(0, "rgba(255, 255, 255, 0.28)");
    bodyHighlight.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = bodyHighlight;
    ctx.beginPath();
    ctx.ellipse(length * 0.04, -halfWidth * 0.14, length * 0.26, halfWidth * 0.42, -0.22, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  draw() {
    const length = this.length;
    const halfWidth = this.bodyWidth;
    const tailSwing = Math.sin(this.tailPhase) * halfWidth * 0.48;
    const blur = (1.2 - this.depth) * 1.2;

    ctx.save();
    ctx.translate(this.x + 12 * this.depth, this.y + 16 * this.depth);
    ctx.rotate(this.angle);
    ctx.globalAlpha = 0.17 * this.depth;
    ctx.fillStyle = "rgba(2, 9, 14, 0.9)";
    ctx.filter = `blur(${7 + this.depth * 4}px)`;
    this.traceTail(tailSwing);
    ctx.fill();
    this.traceBody();
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.filter = blur > 0 ? `blur(${blur}px)` : "none";
    ctx.globalAlpha = 0.7 + this.depth * 0.18;

    this.drawFins(tailSwing);

    const bodyGradient = ctx.createLinearGradient(-length * 0.6, 0, length * 0.5, 0);
    bodyGradient.addColorStop(0, this.palette.bodyDark);
    bodyGradient.addColorStop(0.42, this.palette.bodyLight);
    bodyGradient.addColorStop(1, "#fff8eb");
    ctx.fillStyle = bodyGradient;
    this.traceBody();
    ctx.fill();

    const sideShade = ctx.createLinearGradient(0, -halfWidth, 0, halfWidth);
    sideShade.addColorStop(0, "rgba(0, 0, 0, 0.09)");
    sideShade.addColorStop(0.4, "rgba(0, 0, 0, 0)");
    sideShade.addColorStop(1, "rgba(0, 0, 0, 0.16)");
    ctx.fillStyle = sideShade;
    this.traceBody();
    ctx.fill();

    this.drawPattern();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(length * 0.16, -halfWidth * 0.04);
    ctx.quadraticCurveTo(length * 0.3, 0, length * 0.36, halfWidth * 0.03);
    ctx.stroke();

    ctx.strokeStyle = "rgba(71, 45, 28, 0.3)";
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(length * 0.08, -halfWidth * 0.42);
    ctx.quadraticCurveTo(length * 0.16, 0, length * 0.08, halfWidth * 0.42);
    ctx.stroke();

    ctx.fillStyle = "rgba(20, 12, 9, 0.84)";
    ctx.beginPath();
    ctx.arc(length * 0.34, -halfWidth * 0.1, halfWidth * 0.08, 0, Math.PI * 2);
    ctx.fill();

    ctx.filter = "none";
    ctx.restore();
  }
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#476f79");
  gradient.addColorStop(0.2, "#2a5965");
  gradient.addColorStop(0.52, "#153746");
  gradient.addColorStop(1, "#091822");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const topGlow = ctx.createRadialGradient(width * 0.28, height * 0.12, 0, width * 0.28, height * 0.12, width * 0.7);
  topGlow.addColorStop(0, "rgba(194, 225, 226, 0.18)");
  topGlow.addColorStop(0.4, "rgba(122, 178, 184, 0.08)");
  topGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = topGlow;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.filter = "blur(48px)";
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = `rgba(0, 7, 10, ${rand(0.08, 0.16)})`;
    ctx.beginPath();
    ctx.ellipse(
      width * rand(0.08, 0.95),
      height * rand(0.68, 1.02),
      rand(90, 220),
      rand(24, 78),
      rand(-0.5, 0.5),
      0,
      Math.PI * 2
    );
    ctx.fill();
  }
  ctx.restore();
}

function drawFlowBand(baseY, ampA, ampB, phase, slope, color, bandWidth, blur) {
  ctx.save();
  ctx.filter = `blur(${blur}px)`;
  ctx.lineWidth = bandWidth;
  ctx.lineCap = "round";
  ctx.strokeStyle = color;
  ctx.beginPath();

  for (let x = -120; x <= width + 120; x += 34) {
    const y =
      baseY +
      Math.sin(x * 0.009 + phase) * ampA +
      Math.cos(x * 0.016 - phase * 0.7) * ampB +
      (x - width * 0.5) * slope;

    if (x === -120) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }

  ctx.stroke();
  ctx.restore();
}

function drawBackWater() {
  if (textureReady) {
    ctx.save();
    ctx.globalCompositeOperation = "soft-light";
    ctx.globalAlpha = 0.12;
    ctx.filter = "blur(34px) saturate(0.7)";
    ctx.drawImage(
      textureImage,
      -width * 0.08 + Math.sin(time * 0.05) * 60,
      -height * 0.1 + Math.cos(time * 0.04) * 26,
      width * 1.2,
      height * 1.24
    );
    ctx.restore();
  }

  for (let i = 0; i < 6; i++) {
    drawFlowBand(
      height * (0.12 + i * 0.11),
      10 + i * 1.8,
      7 + i,
      time * (0.2 + i * 0.02) + i * 1.8,
      -0.018,
      `rgba(205, 229, 230, ${0.04 + i * 0.006})`,
      14 + i * 3,
      12 + i * 2
    );
  }

  ctx.save();
  ctx.filter = "blur(28px)";
  for (let i = 0; i < 5; i++) {
    const reflection = ctx.createRadialGradient(
      width * (0.18 + i * 0.18),
      height * (0.1 + i * 0.06),
      0,
      width * (0.18 + i * 0.18),
      height * (0.1 + i * 0.06),
      width * 0.14
    );
    reflection.addColorStop(0, "rgba(245, 252, 252, 0.08)");
    reflection.addColorStop(1, "rgba(245, 252, 252, 0)");
    ctx.fillStyle = reflection;
    ctx.beginPath();
    ctx.ellipse(
      width * (0.18 + i * 0.18) + Math.sin(time * (0.14 + i * 0.03) + i) * 22,
      height * (0.1 + i * 0.06),
      width * 0.16,
      height * 0.08,
      rand(-0.2, 0.2),
      0,
      Math.PI * 2
    );
    ctx.fill();
  }
  ctx.restore();
}

function drawSpecks() {
  for (const speck of specks) {
    speck.draw();
  }
}

function drawFrontWaterVeil() {
  ctx.save();
  ctx.globalCompositeOperation = "source-over";

  const tint = ctx.createLinearGradient(0, 0, 0, height);
  tint.addColorStop(0, "rgba(137, 172, 175, 0.08)");
  tint.addColorStop(0.45, "rgba(61, 98, 112, 0.08)");
  tint.addColorStop(1, "rgba(16, 33, 44, 0.22)");
  ctx.fillStyle = tint;
  ctx.fillRect(0, 0, width, height);

  for (let i = 0; i < 8; i++) {
    drawFlowBand(
      height * (0.16 + i * 0.09),
      12 + i * 2.4,
      8 + i * 1.5,
      time * (0.24 + i * 0.025) + i * 1.2,
      0.03,
      `rgba(214, 233, 233, ${0.022 + i * 0.003})`,
      16 + i * 4,
      18 + i * 2
    );
  }

  if (textureReady) {
    ctx.globalCompositeOperation = "overlay";
    ctx.globalAlpha = 0.1;
    ctx.filter = "blur(46px) saturate(0.55)";
    ctx.drawImage(
      textureImage,
      -width * 0.04 - Math.cos(time * 0.03) * 40,
      -height * 0.06 + Math.sin(time * 0.025) * 28,
      width * 1.1,
      height * 1.12
    );
  }

  ctx.filter = "blur(42px)";
  for (let i = 0; i < 6; i++) {
    const alpha = 0.035 + i * 0.008;
    ctx.fillStyle = `rgba(225, 239, 239, ${alpha})`;
    ctx.beginPath();
    ctx.ellipse(
      width * rand(0.04, 0.96),
      height * rand(0.08, 0.88),
      rand(120, 320),
      rand(36, 92),
      rand(-0.4, 0.4),
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  ctx.filter = "none";
  ctx.globalCompositeOperation = "soft-light";
  ctx.globalAlpha = 0.36;
  ctx.drawImage(grainCanvas, 0, 0, width, height);

  ctx.globalCompositeOperation = "overlay";
  ctx.globalAlpha = 0.18;
  ctx.drawImage(grainCanvas, 0, 0, width, height);

  ctx.restore();
}

function drawRipplesAndDrops() {
  for (const droplet of droplets) {
    droplet.draw();
  }

  for (const ripple of ripples) {
    ripple.draw();
  }
}

function drawVignette() {
  const vignette = ctx.createRadialGradient(
    width * 0.5,
    height * 0.36,
    width * 0.14,
    width * 0.5,
    height * 0.5,
    width * 0.8
  );
  vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
  vignette.addColorStop(1, "rgba(0, 10, 15, 0.34)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
}

function addRipple(x, y) {
  ripples.push(new Ripple(x, y));
  for (let i = 0; i < 10; i++) {
    droplets.push(new Droplet(x, y));
  }

  while (ripples.length > 8) {
    ripples.shift();
  }

  for (const koi of fish) {
    koi.reactToRipple(x, y);
  }
}

function update(dt) {
  for (const speck of specks) {
    speck.update(dt);
  }

  for (let i = ripples.length - 1; i >= 0; i--) {
    if (!ripples[i].update(dt)) {
      ripples.splice(i, 1);
    }
  }

  for (let i = droplets.length - 1; i >= 0; i--) {
    if (!droplets[i].update(dt)) {
      droplets.splice(i, 1);
    }
  }

  for (const koi of fish) {
    koi.update(dt);
  }
}

function render() {
  ctx.clearRect(0, 0, width, height);
  drawBackground();
  drawBackWater();
  drawSpecks();

  fish.sort((a, b) => a.depth - b.depth || a.y - b.y);
  for (const koi of fish) {
    koi.draw();
  }

  drawFrontWaterVeil();
  drawRipplesAndDrops();
  drawVignette();
}

function frame(now) {
  if (!lastTime) lastTime = now;
  const dt = Math.min(0.033, (now - lastTime) / 1000);
  lastTime = now;
  time += dt;

  update(dt);
  render();
  requestAnimationFrame(frame);
}

canvas.addEventListener("pointerdown", (event) => {
  const rect = canvas.getBoundingClientRect();
  addRipple(event.clientX - rect.left, event.clientY - rect.top);
});

window.addEventListener("resize", resize);

resize();
requestAnimationFrame(frame);
