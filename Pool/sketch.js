const canvas = document.getElementById("pond");
const ctx = canvas.getContext("2d");

const fish = [];
const ripples = [];
const droplets = [];
const specks = [];
const lilyPads = [];
const backReflections = [];
const causticLines = [];
const surfaceHighlights = [];

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
let waterTextureCanvas = null;
let backdropCanvas = null;
let frontGlowCanvas = null;
let vignetteCanvas = null;

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
  return Math.round(clamp(width / 190, 6, 10));
}

function calculateRenderDpr() {
  const deviceDpr = window.devicePixelRatio || 1;
  const pixelBudget = 1_850_000;
  const constrainedDpr = Math.sqrt(pixelBudget / Math.max(width * height, 1));
  return clamp(Math.min(deviceDpr, constrainedDpr, 1.6), 1, 1.6);
}

function createScaledLayer() {
  const layer = document.createElement("canvas");
  layer.width = Math.max(1, Math.round(width * dpr));
  layer.height = Math.max(1, Math.round(height * dpr));
  const layerCtx = layer.getContext("2d");
  layerCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { layer, layerCtx };
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

function createWaterTexture() {
  const tw = 320;
  const th = 320;
  waterTextureCanvas = document.createElement("canvas");
  waterTextureCanvas.width = tw;
  waterTextureCanvas.height = th;

  const waterCtx = waterTextureCanvas.getContext("2d");
  const base = waterCtx.createLinearGradient(0, 0, tw, th);
  base.addColorStop(0, "#204957");
  base.addColorStop(0.45, "#173c49");
  base.addColorStop(1, "#0d2530");
  waterCtx.fillStyle = base;
  waterCtx.fillRect(0, 0, tw, th);

  waterCtx.globalCompositeOperation = "screen";
  for (let i = 0; i < 14; i++) {
    const glow = waterCtx.createRadialGradient(
      rand(0, tw),
      rand(0, th),
      0,
      rand(0, tw),
      rand(0, th),
      rand(54, 130)
    );
    glow.addColorStop(0, `rgba(220, 244, 244, ${rand(0.04, 0.12)})`);
    glow.addColorStop(1, "rgba(220, 244, 244, 0)");
    waterCtx.fillStyle = glow;
    waterCtx.beginPath();
    waterCtx.ellipse(
      rand(0, tw),
      rand(0, th),
      rand(28, 80),
      rand(16, 56),
      rand(-0.8, 0.8),
      0,
      Math.PI * 2
    );
    waterCtx.fill();
  }

  waterCtx.globalCompositeOperation = "soft-light";
  waterCtx.globalAlpha = 0.42;
  waterCtx.drawImage(grainCanvas, 0, 0, tw, th);
  waterCtx.globalAlpha = 0.18;
  waterCtx.drawImage(grainCanvas, tw * 0.12, th * 0.08, tw * 0.74, th * 0.74);
  waterCtx.globalAlpha = 1;
  waterCtx.globalCompositeOperation = "source-over";
}

function paintBackdrop(targetCtx) {
  const gradient = targetCtx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#476f79");
  gradient.addColorStop(0.2, "#2a5965");
  gradient.addColorStop(0.52, "#153746");
  gradient.addColorStop(1, "#091822");
  targetCtx.fillStyle = gradient;
  targetCtx.fillRect(0, 0, width, height);

  const topGlow = targetCtx.createRadialGradient(
    width * 0.28,
    height * 0.12,
    0,
    width * 0.28,
    height * 0.12,
    width * 0.7
  );
  topGlow.addColorStop(0, "rgba(194, 225, 226, 0.18)");
  topGlow.addColorStop(0.4, "rgba(122, 178, 184, 0.08)");
  topGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
  targetCtx.fillStyle = topGlow;
  targetCtx.fillRect(0, 0, width, height);

  targetCtx.save();
  targetCtx.filter = "blur(42px)";
  for (let i = 0; i < 6; i++) {
    targetCtx.fillStyle = `rgba(0, 7, 10, ${rand(0.08, 0.16)})`;
    targetCtx.beginPath();
    targetCtx.ellipse(
      width * rand(0.08, 0.95),
      height * rand(0.68, 1.02),
      rand(90, 220),
      rand(24, 78),
      rand(-0.5, 0.5),
      0,
      Math.PI * 2
    );
    targetCtx.fill();
  }
  targetCtx.restore();

  const edgeWidth = Math.min(width, height) * 0.06;

  const topEdge = targetCtx.createLinearGradient(0, 0, 0, edgeWidth * 1.5);
  topEdge.addColorStop(0, "rgba(28, 22, 18, 0.85)");
  topEdge.addColorStop(0.4, "rgba(45, 38, 30, 0.5)");
  topEdge.addColorStop(1, "rgba(0, 0, 0, 0)");
  targetCtx.fillStyle = topEdge;
  targetCtx.fillRect(0, 0, width, edgeWidth * 1.5);

  const bottomEdge = targetCtx.createLinearGradient(0, height, 0, height - edgeWidth * 1.2);
  bottomEdge.addColorStop(0, "rgba(5, 12, 15, 0.9)");
  bottomEdge.addColorStop(0.5, "rgba(15, 22, 25, 0.4)");
  bottomEdge.addColorStop(1, "rgba(0, 0, 0, 0)");
  targetCtx.fillStyle = bottomEdge;
  targetCtx.fillRect(0, height - edgeWidth * 1.2, width, edgeWidth * 1.2);

  const leftEdge = targetCtx.createLinearGradient(0, 0, edgeWidth * 1.2, 0);
  leftEdge.addColorStop(0, "rgba(20, 16, 12, 0.75)");
  leftEdge.addColorStop(0.5, "rgba(30, 25, 18, 0.3)");
  leftEdge.addColorStop(1, "rgba(0, 0, 0, 0)");
  targetCtx.fillStyle = leftEdge;
  targetCtx.fillRect(0, 0, edgeWidth * 1.2, height);

  const rightEdge = targetCtx.createLinearGradient(width, 0, width - edgeWidth * 1.2, 0);
  rightEdge.addColorStop(0, "rgba(20, 16, 12, 0.75)");
  rightEdge.addColorStop(0.5, "rgba(30, 25, 18, 0.3)");
  rightEdge.addColorStop(1, "rgba(0, 0, 0, 0)");
  targetCtx.fillStyle = rightEdge;
  targetCtx.fillRect(width - edgeWidth * 1.2, 0, edgeWidth * 1.2, height);

  targetCtx.save();
  targetCtx.filter = "blur(3px)";
  for (let i = 0; i < 24; i++) {
    const side = i % 4;
    let sx;
    let sy;
    if (side === 0) {
      sx = rand(0, width);
      sy = rand(0, edgeWidth * 0.6);
    } else if (side === 1) {
      sx = rand(0, width);
      sy = height - rand(0, edgeWidth * 0.4);
    } else if (side === 2) {
      sx = rand(0, edgeWidth * 0.5);
      sy = rand(0, height);
    } else {
      sx = width - rand(0, edgeWidth * 0.5);
      sy = rand(0, height);
    }

    targetCtx.fillStyle = `rgba(${40 + rand(0, 30)}, ${32 + rand(0, 20)}, ${22 + rand(0, 15)}, ${rand(0.08, 0.2)})`;
    targetCtx.beginPath();
    targetCtx.ellipse(sx, sy, rand(12, 35), rand(8, 22), rand(-1, 1), 0, Math.PI * 2);
    targetCtx.fill();
  }
  targetCtx.restore();
}

function paintFrontGlow(targetCtx) {
  targetCtx.save();
  targetCtx.filter = "blur(42px)";
  for (let i = 0; i < 5; i++) {
    targetCtx.fillStyle = `rgba(225, 239, 239, ${0.035 + i * 0.01})`;
    targetCtx.beginPath();
    targetCtx.ellipse(
      width * rand(0.08, 0.92),
      height * rand(0.12, 0.84),
      rand(110, 280),
      rand(34, 82),
      rand(-0.35, 0.35),
      0,
      Math.PI * 2
    );
    targetCtx.fill();
  }
  targetCtx.restore();
}

function paintVignette(targetCtx) {
  const vignette = targetCtx.createRadialGradient(
    width * 0.5,
    height * 0.36,
    width * 0.14,
    width * 0.5,
    height * 0.5,
    width * 0.8
  );
  vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
  vignette.addColorStop(1, "rgba(0, 10, 15, 0.34)");
  targetCtx.fillStyle = vignette;
  targetCtx.fillRect(0, 0, width, height);
}

function createStaticLayers() {
  let layerParts = createScaledLayer();
  paintBackdrop(layerParts.layerCtx);
  backdropCanvas = layerParts.layer;

  layerParts = createScaledLayer();
  paintFrontGlow(layerParts.layerCtx);
  frontGlowCanvas = layerParts.layer;

  layerParts = createScaledLayer();
  paintVignette(layerParts.layerCtx);
  vignetteCanvas = layerParts.layer;
}

function seedMotionFields() {
  backReflections.length = 0;
  causticLines.length = 0;
  surfaceHighlights.length = 0;

  for (let i = 0; i < 4; i++) {
    backReflections.push({
      x: 0.16 + i * 0.22 + rand(-0.03, 0.03),
      y: 0.08 + i * 0.06 + rand(-0.015, 0.015),
      rx: rand(0.12, 0.18),
      ry: rand(0.05, 0.08),
      alpha: rand(0.045, 0.08),
      drift: rand(14, 24),
      phase: rand(0, Math.PI * 2),
      rotation: rand(-0.22, 0.22)
    });
  }

  for (let i = 0; i < 5; i++) {
    causticLines.push({
      x: rand(0.08, 0.92),
      y: rand(0.1, 0.66),
      phase: rand(0, Math.PI * 2),
      sway: rand(18, 32),
      stepX: rand(46, 82),
      stepY: rand(18, 30)
    });
  }

  for (let i = 0; i < 4; i++) {
    surfaceHighlights.push({
      x: 0.16 + i * 0.2 + rand(-0.02, 0.02),
      y: 0.13 + rand(-0.02, 0.02),
      phase: rand(0, Math.PI * 2),
      driftX: rand(24, 44),
      driftY: rand(10, 22),
      rx: rand(64, 108),
      ry: rand(14, 26),
      alpha: rand(0.012, 0.022)
    });
  }
}

function resize() {
  width = window.innerWidth;
  height = window.innerHeight;
  dpr = calculateRenderDpr();

  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  createGrainTexture();
  createWaterTexture();
  seedMotionFields();
  createStaticLayers();
  seedScene();
}

function seedScene() {
  fish.length = 0;
  specks.length = 0;
  ripples.length = 0;
  droplets.length = 0;
  lilyPads.length = 0;

  for (let i = 0; i < fishCount(); i++) {
    fish.push(new Koi(i));
  }

  const speckCount = Math.round(clamp(width / 34, 18, 34));
  for (let i = 0; i < speckCount; i++) {
    specks.push(new Speck());
  }

  // Create lily pads along edges
  const padCount = Math.round(clamp(width / 380, 2, 5));
  for (let i = 0; i < padCount; i++) {
    lilyPads.push(new LilyPad());
  }
}

/* ─── Lily Pads ─── */
class LilyPad {
  constructor() {
    // Place near edges
    const side = Math.random();
    if (side < 0.3) {
      this.x = rand(30, width * 0.18);
      this.y = rand(height * 0.15, height * 0.6);
    } else if (side < 0.6) {
      this.x = rand(width * 0.82, width - 30);
      this.y = rand(height * 0.15, height * 0.6);
    } else {
      this.x = rand(width * 0.15, width * 0.85);
      this.y = rand(height * 0.06, height * 0.22);
    }
    this.radius = rand(22, 42);
    this.rotation = rand(0, Math.PI * 2);
    this.notchAngle = rand(0, Math.PI * 2);
    this.notchWidth = rand(0.3, 0.55);
    this.phase = rand(0, Math.PI * 2);
    this.driftSpeed = rand(0.3, 0.8);
    this.hasFlower = Math.random() > 0.65;
    this.flowerPhase = rand(0, Math.PI * 2);
  }

  update(dt) {
    this.x += Math.sin(time * 0.15 + this.phase) * this.driftSpeed * dt;
    this.y += Math.cos(time * 0.12 + this.phase * 1.3) * this.driftSpeed * 0.5 * dt;
    this.rotation += Math.sin(time * 0.2 + this.phase) * 0.003;
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    // Shadow
    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = "#031510";
    ctx.beginPath();
    ctx.ellipse(3, 4, this.radius + 2, this.radius * 0.9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Pad body
    const padGrad = ctx.createRadialGradient(
      -this.radius * 0.2, -this.radius * 0.15, 0,
      0, 0, this.radius
    );
    padGrad.addColorStop(0, "#4a7a3a");
    padGrad.addColorStop(0.5, "#2d5c28");
    padGrad.addColorStop(1, "#1a4420");
    ctx.fillStyle = padGrad;

    ctx.beginPath();
    const notchStart = this.notchAngle - this.notchWidth * 0.5;
    const notchEnd = this.notchAngle + this.notchWidth * 0.5;
    ctx.arc(0, 0, this.radius, notchEnd, notchStart + Math.PI * 2);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fill();

    // Veins
    ctx.strokeStyle = "rgba(30, 70, 25, 0.35)";
    ctx.lineWidth = 0.8;
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 / 6) * i + this.notchAngle + 0.5;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(
        Math.cos(angle) * this.radius * 0.85,
        Math.sin(angle) * this.radius * 0.85
      );
      ctx.stroke();
    }

    // Highlight
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = "#8fbb6a";
    ctx.beginPath();
    ctx.ellipse(-this.radius * 0.25, -this.radius * 0.2, this.radius * 0.35, this.radius * 0.2, -0.4, 0, Math.PI * 2);
    ctx.fill();

    // Flower
    if (this.hasFlower) {
      const fx = this.radius * 0.3;
      const fy = -this.radius * 0.2;
      const petalSize = this.radius * 0.28;
      const openAmount = 0.85 + Math.sin(time * 0.3 + this.flowerPhase) * 0.15;

      ctx.globalAlpha = 0.9;
      for (let p = 0; p < 6; p++) {
        const pa = (Math.PI * 2 / 6) * p + time * 0.02;
        ctx.fillStyle = p % 2 === 0 ? "#f5e0e8" : "#f0c8d6";
        ctx.beginPath();
        ctx.ellipse(
          fx + Math.cos(pa) * petalSize * 0.4 * openAmount,
          fy + Math.sin(pa) * petalSize * 0.4 * openAmount,
          petalSize * 0.35,
          petalSize * 0.2,
          pa,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
      // Center
      ctx.fillStyle = "#e8c840";
      ctx.beginPath();
      ctx.arc(fx, fy, petalSize * 0.15, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

/* ─── Specks (floating particles) ─── */
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

/* ─── Ripple ─── */
class Ripple {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.age = 0;
    this.life = 2.8;
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
    const baseAlpha = Math.max(0, 0.22 - progress * 0.14);

    ctx.save();
    ctx.lineCap = "round";

    for (let i = 0; i < 4; i++) {
      const wave = progress - i * 0.09;
      if (wave <= 0) continue;

      const radius = 10 + Math.pow(wave, 1.25) * Math.min(width, height) * 0.28;
      const alpha = baseAlpha - i * 0.035;
      if (alpha <= 0) continue;

      // Light refraction highlight on ripple crest
      ctx.strokeStyle = `rgba(240, 252, 252, ${alpha * 0.8})`;
      ctx.lineWidth = Math.max(0.6, 2.6 - i * 0.4 - progress * 0.8);
      ctx.beginPath();
      ctx.arc(this.x, this.y, radius, this.phase + i * 0.7, this.phase + i * 0.7 + Math.PI * 1.35);
      ctx.stroke();

      // Darker trough below the crest
      ctx.strokeStyle = `rgba(10, 40, 50, ${alpha * 0.3})`;
      ctx.lineWidth = Math.max(0.4, 1.8 - i * 0.3 - progress * 0.6);
      ctx.beginPath();
      ctx.arc(this.x, this.y, radius + 2.5, this.phase + i * 0.7 + 0.15, this.phase + i * 0.7 + Math.PI * 1.2);
      ctx.stroke();

      ctx.strokeStyle = `rgba(232, 244, 244, ${alpha * 0.6})`;
      ctx.lineWidth = Math.max(0.5, 1.6 - i * 0.35 - progress * 0.6);
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

    // Central glow
    ctx.filter = "blur(10px)";
    ctx.fillStyle = `rgba(190, 223, 224, ${0.08 * (1 - progress)})`;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/* ─── Droplet ─── */
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

/* ─── Koi ─── */
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
    this.patternOffsetX = Math.random();
    this.patternOffsetY = Math.random();
    this.marks = Array.from({ length: Math.floor(rand(2, 5)) }, () => ({
      x: rand(-0.18, 0.22),
      y: rand(-0.55, 0.55),
      rx: rand(0.08, 0.2),
      ry: rand(0.15, 0.4),
      rotation: rand(-1.2, 1.2),
      alternate: Math.random() > 0.5
    }));
    // Wake trail positions
    this.trail = [];
    this.trailTimer = 0;
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

    // Update wake trail
    this.trailTimer += dt;
    if (this.trailTimer > 0.06) {
      this.trailTimer = 0;
      this.trail.push({ x: this.x, y: this.y, age: 0 });
      if (this.trail.length > 14) this.trail.shift();
    }
    for (let i = this.trail.length - 1; i >= 0; i--) {
      this.trail[i].age += dt;
      if (this.trail[i].age > 1.2) {
        this.trail.splice(i, 1);
      }
    }
  }

  // Get undulation offset at a given body position t (0 = head, 1 = tail)
  undulationOffset(t) {
    const amp = this.bodyWidth * 0.12 * t * t; // increases toward tail
    return Math.sin(this.tailPhase - t * 2.8) * amp;
  }

  traceBody() {
    const length = this.length;
    const halfWidth = this.bodyWidth;
    const und1 = this.undulationOffset(0.3);
    const und2 = this.undulationOffset(0.6);

    ctx.beginPath();
    ctx.moveTo(length * 0.5, 0);
    ctx.bezierCurveTo(
      length * 0.28,
      -halfWidth * 0.78 + und1 * 0.3,
      -length * 0.02,
      -halfWidth * 0.94 + und2 * 0.5,
      -length * 0.42,
      -halfWidth * 0.36 + und2
    );
    ctx.quadraticCurveTo(-length * 0.57, -halfWidth * 0.16 + und2, -length * 0.6, und2);
    ctx.quadraticCurveTo(-length * 0.57, halfWidth * 0.16 + und2, -length * 0.42, halfWidth * 0.36 + und2);
    ctx.bezierCurveTo(
      -length * 0.02,
      halfWidth * 0.94 + und2 * 0.5,
      length * 0.28,
      halfWidth * 0.78 + und1 * 0.3,
      length * 0.5,
      0
    );
    ctx.closePath();
  }

  traceTail(tailSwing) {
    const length = this.length;
    const halfWidth = this.bodyWidth;
    const und = this.undulationOffset(0.8);

    ctx.beginPath();
    ctx.moveTo(-length * 0.54, und * 0.6);
    ctx.quadraticCurveTo(
      -length * 0.9,
      -halfWidth * 0.74 + tailSwing + und,
      -length * 1.02,
      tailSwing * 0.2 + und * 1.2
    );
    ctx.quadraticCurveTo(
      -length * 0.9,
      halfWidth * 0.74 + tailSwing + und,
      -length * 0.54,
      und * 0.6
    );
    ctx.closePath();
  }

  drawWake() {
    if (this.trail.length < 3) return;
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    for (let i = 0; i < this.trail.length; i++) {
      const t = this.trail[i];
      const progress = t.age / 1.2;
      const alpha = 0.038 * (1 - progress) * this.depth;
      if (alpha <= 0) continue;
      const size = 3 + (1 - progress) * this.bodyWidth * 0.2;
      ctx.fillStyle = `rgba(200, 230, 235, ${alpha})`;
      ctx.beginPath();
      ctx.ellipse(t.x, t.y, size, size * 0.62, this.angle, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawFins(tailSwing) {
    const length = this.length;
    const halfWidth = this.bodyWidth;
    const finDrift = Math.sin(this.tailPhase + 0.9) * halfWidth * 0.16;

    ctx.save();
    ctx.fillStyle = this.palette.fin;

    // Left pectoral fin
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

    // Right pectoral fin
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

    // Tail with gradient
    const tailGradient = ctx.createLinearGradient(-length, 0, -length * 0.46, 0);
    tailGradient.addColorStop(0, "rgba(255, 255, 255, 0.06)");
    tailGradient.addColorStop(1, this.palette.fin);
    ctx.fillStyle = tailGradient;
    this.traceTail(tailSwing);
    ctx.fill();

    // Dorsal fin (small)
    const dorsalDrift = Math.sin(this.tailPhase * 0.8) * halfWidth * 0.06;
    ctx.fillStyle = this.palette.fin;
    ctx.beginPath();
    ctx.moveTo(-length * 0.15, -halfWidth * 0.3);
    ctx.quadraticCurveTo(
      -length * 0.25,
      -halfWidth * 0.7 + dorsalDrift,
      -length * 0.35,
      -halfWidth * 0.28
    );
    ctx.quadraticCurveTo(
      -length * 0.28,
      -halfWidth * 0.18,
      -length * 0.15,
      -halfWidth * 0.3
    );
    ctx.fill();

    // Small front fin
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

    if (waterTextureCanvas) {
      const sampleWidth = waterTextureCanvas.width * 0.58;
      const sampleHeight = waterTextureCanvas.height * 0.58;
      const sampleX = (waterTextureCanvas.width - sampleWidth) * this.patternOffsetX;
      const sampleY = (waterTextureCanvas.height - sampleHeight) * this.patternOffsetY;

      ctx.globalAlpha = 0.14;
      ctx.drawImage(
        waterTextureCanvas,
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
      ctx.globalAlpha = 0.1;
      ctx.drawImage(
        waterTextureCanvas,
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

    // Scale pattern
    ctx.strokeStyle = "rgba(255, 255, 255, 0.09)";
    ctx.lineWidth = 0.7;
    for (let x = -length * 0.34; x <= length * 0.18; x += length * 0.085) {
      for (let y = -halfWidth * 0.56; y <= halfWidth * 0.56; y += halfWidth * 0.28) {
        ctx.beginPath();
        ctx.arc(x + ((Math.round(y * 100) % 2) ? halfWidth * 0.12 : 0), y, halfWidth * 0.18, 0, Math.PI);
        ctx.stroke();
      }
    }

    // Body highlight
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

  drawBarbels() {
    const length = this.length;
    const halfWidth = this.bodyWidth;
    const sway = Math.sin(this.tailPhase * 0.6 + 1.2) * 3;

    ctx.save();
    ctx.strokeStyle = `rgba(180, 160, 130, ${0.35 + this.depth * 0.15})`;
    ctx.lineWidth = 0.8;
    ctx.lineCap = "round";

    // Two pairs of barbels
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(length * 0.46, side * halfWidth * 0.06);
      ctx.quadraticCurveTo(
        length * 0.56,
        side * halfWidth * 0.18 + sway,
        length * 0.58,
        side * halfWidth * 0.22 + sway * 1.3
      );
      ctx.stroke();

      // Shorter inner pair
      ctx.beginPath();
      ctx.moveTo(length * 0.48, side * halfWidth * 0.02);
      ctx.quadraticCurveTo(
        length * 0.53,
        side * halfWidth * 0.08 + sway * 0.6,
        length * 0.54,
        side * halfWidth * 0.12 + sway * 0.8
      );
      ctx.stroke();
    }
    ctx.restore();
  }

  draw() {
    const length = this.length;
    const halfWidth = this.bodyWidth;
    const tailSwing = Math.sin(this.tailPhase) * halfWidth * 0.48;
    const blur = (1.2 - this.depth) * 0.75;

    // Wake trail
    this.drawWake();

    // Shadow
    ctx.save();
    ctx.translate(this.x + 12 * this.depth, this.y + 16 * this.depth);
    ctx.rotate(this.angle);
    ctx.globalAlpha = 0.17 * this.depth;
    ctx.fillStyle = "rgba(2, 9, 14, 0.9)";
    ctx.filter = `blur(${4 + this.depth * 2}px)`;
    this.traceTail(tailSwing);
    ctx.fill();
    this.traceBody();
    ctx.fill();
    ctx.restore();

    // Body
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

    // Mouth line
    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(length * 0.16, -halfWidth * 0.04);
    ctx.quadraticCurveTo(length * 0.3, 0, length * 0.36, halfWidth * 0.03);
    ctx.stroke();

    // Gill line
    ctx.strokeStyle = "rgba(71, 45, 28, 0.3)";
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(length * 0.08, -halfWidth * 0.42);
    ctx.quadraticCurveTo(length * 0.16, 0, length * 0.08, halfWidth * 0.42);
    ctx.stroke();

    // Barbels
    this.drawBarbels();

    // Eye - more realistic with iris and specular
    const eyeX = length * 0.34;
    const eyeY = -halfWidth * 0.1;
    const eyeR = halfWidth * 0.09;

    // Eye socket shadow
    ctx.fillStyle = "rgba(40, 25, 15, 0.25)";
    ctx.beginPath();
    ctx.arc(eyeX, eyeY, eyeR * 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Iris
    const irisGrad = ctx.createRadialGradient(eyeX, eyeY, 0, eyeX, eyeY, eyeR);
    irisGrad.addColorStop(0, "#1a0e08");
    irisGrad.addColorStop(0.6, "#2c1810");
    irisGrad.addColorStop(0.85, "#44281a");
    irisGrad.addColorStop(1, "#1a0e08");
    ctx.fillStyle = irisGrad;
    ctx.beginPath();
    ctx.arc(eyeX, eyeY, eyeR, 0, Math.PI * 2);
    ctx.fill();

    // Pupil
    ctx.fillStyle = "rgba(5, 2, 0, 0.92)";
    ctx.beginPath();
    ctx.arc(eyeX, eyeY, eyeR * 0.5, 0, Math.PI * 2);
    ctx.fill();

    // Specular highlight
    ctx.fillStyle = "rgba(255, 255, 255, 0.65)";
    ctx.beginPath();
    ctx.arc(eyeX + eyeR * 0.25, eyeY - eyeR * 0.25, eyeR * 0.22, 0, Math.PI * 2);
    ctx.fill();

    ctx.filter = "none";
    ctx.restore();
  }
}

/* ─── Drawing Functions ─── */

function drawBackground() {
  if (backdropCanvas) {
    ctx.drawImage(backdropCanvas, 0, 0, width, height);
  }
}

function drawCaustics() {
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.filter = "blur(14px)";

  const causticCount = 9;
  for (let i = 0; i < causticCount; i++) {
    const phase = time * (0.15 + i * 0.012) + i * 1.7;
    const cx = width * (0.14 + (i / causticCount) * 0.72) + Math.sin(phase * 0.7) * 46;
    const cy = height * (0.2 + (i % 3) * 0.16) + Math.cos(phase * 0.5 + i) * 30;
    const rx = 34 + Math.sin(phase) * 16 + i * 4;
    const ry = 16 + Math.cos(phase * 1.3) * 8 + i * 2;
    const alpha = 0.015 + Math.sin(phase * 2) * 0.006;

    ctx.fillStyle = `rgba(180, 230, 220, ${alpha})`;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, phase * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.filter = "blur(10px)";
  ctx.lineWidth = 1.2;
  ctx.lineCap = "round";
  for (const line of causticLines) {
    const phase = time * 0.12 + line.phase;
    const alpha = 0.02 + Math.sin(phase * 1.5) * 0.01;
    ctx.strokeStyle = `rgba(200, 245, 235, ${alpha})`;

    ctx.beginPath();
    const startX = width * line.x + Math.sin(phase * 0.8) * line.sway;
    const startY = height * line.y + Math.cos(phase * 0.6) * line.sway * 0.35;
    ctx.moveTo(startX, startY);
    for (let j = 1; j <= 4; j++) {
      ctx.lineTo(
        startX + Math.sin(phase + j * 1.5) * line.stepX,
        startY + j * line.stepY + Math.cos(phase * 0.8 + j) * (line.stepY * 0.7)
      );
    }
    ctx.stroke();
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

  for (let x = -120; x <= width + 120; x += 42) {
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
  if (waterTextureCanvas) {
    ctx.save();
    ctx.globalCompositeOperation = "soft-light";
    ctx.globalAlpha = 0.16;
    ctx.drawImage(
      waterTextureCanvas,
      -width * 0.1 + Math.sin(time * 0.05) * 36,
      -height * 0.08 + Math.cos(time * 0.04) * 18,
      width * 1.2,
      height * 1.18
    );
    ctx.restore();
  }

  for (let i = 0; i < 4; i++) {
    drawFlowBand(
      height * (0.14 + i * 0.13),
      8 + i * 1.7,
      6 + i * 0.85,
      time * (0.18 + i * 0.02) + i * 1.8,
      -0.018,
      `rgba(205, 229, 230, ${0.034 + i * 0.007})`,
      12 + i * 3,
      8 + i * 2
    );
  }

  ctx.save();
  ctx.filter = "blur(20px)";
  for (const reflectionSeed of backReflections) {
    const cx = width * reflectionSeed.x + Math.sin(time * 0.14 + reflectionSeed.phase) * reflectionSeed.drift;
    const cy = height * reflectionSeed.y + Math.cos(time * 0.1 + reflectionSeed.phase) * reflectionSeed.drift * 0.35;
    const reflection = ctx.createRadialGradient(
      cx,
      cy,
      0,
      cx,
      cy,
      width * reflectionSeed.rx
    );
    reflection.addColorStop(0, `rgba(245, 252, 252, ${reflectionSeed.alpha})`);
    reflection.addColorStop(1, "rgba(245, 252, 252, 0)");
    ctx.fillStyle = reflection;
    ctx.beginPath();
    ctx.ellipse(
      cx,
      cy,
      width * reflectionSeed.rx,
      height * reflectionSeed.ry,
      reflectionSeed.rotation,
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

function drawLilyPads() {
  for (const pad of lilyPads) {
    pad.draw();
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

  for (let i = 0; i < 5; i++) {
    drawFlowBand(
      height * (0.18 + i * 0.11),
      10 + i * 1.8,
      7 + i,
      time * (0.22 + i * 0.025) + i * 1.2,
      0.03,
      `rgba(214, 233, 233, ${0.018 + i * 0.004})`,
      14 + i * 4,
      12 + i * 2
    );
  }

  if (waterTextureCanvas) {
    ctx.globalCompositeOperation = "overlay";
    ctx.globalAlpha = 0.08;
    ctx.drawImage(
      waterTextureCanvas,
      -width * 0.05 - Math.cos(time * 0.03) * 24,
      -height * 0.05 + Math.sin(time * 0.025) * 14,
      width * 1.08,
      height * 1.08
    );
  }

  if (frontGlowCanvas) {
    ctx.globalCompositeOperation = "screen";
    ctx.globalAlpha = 0.28;
    ctx.drawImage(frontGlowCanvas, 0, 0, width, height);
  }

  ctx.filter = "none";
  ctx.globalCompositeOperation = "soft-light";
  ctx.globalAlpha = 0.28;
  ctx.drawImage(grainCanvas, 0, 0, width, height);

  ctx.globalCompositeOperation = "overlay";
  ctx.globalAlpha = 0.12;
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
  if (vignetteCanvas) {
    ctx.drawImage(vignetteCanvas, 0, 0, width, height);
  }
}

function drawSurfaceDistortion() {
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.filter = "blur(20px)";

  for (const highlight of surfaceHighlights) {
    const phase = time * 0.18 + highlight.phase;
    const cx = width * highlight.x + Math.sin(phase) * highlight.driftX;
    const cy = height * highlight.y + Math.cos(phase * 0.7) * highlight.driftY;
    const alpha = highlight.alpha + Math.sin(phase * 1.2) * 0.006;

    ctx.fillStyle = `rgba(220, 245, 250, ${alpha})`;
    ctx.beginPath();
    ctx.ellipse(
      cx,
      cy,
      highlight.rx + Math.sin(phase * 0.5) * 18,
      highlight.ry + Math.sin(phase * 0.8) * 5,
      phase * 0.15,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  ctx.restore();
}

function addRipple(x, y) {
  ripples.push(new Ripple(x, y));
  for (let i = 0; i < 7; i++) {
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

  for (const pad of lilyPads) {
    pad.update(dt);
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
  drawCaustics();
  drawSpecks();

  fish.sort((a, b) => a.depth - b.depth || a.y - b.y);
  for (const koi of fish) {
    koi.draw();
  }

  drawFrontWaterVeil();
  drawSurfaceDistortion();
  drawLilyPads();
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
