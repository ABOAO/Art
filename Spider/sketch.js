// Click anywhere to drop a spider. Each spider continuously weaves new
// threads, animating each strand as it grows from a known node toward a
// random distant target. Threads sag under gravity, catch light, and
// collect dew drops at their anchor nodes.

let spiders = [];
let allNodes = [];
let threads = [];
let paused = false;
let audioReady = false;
let bgLayer = null;
let silkLayer = null;
const SCALE_NOTES = [220, 246.94, 261.63, 293.66, 329.63, 392.0, 440.0];
const LIGHT = { x: 0, y: 0 };

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(2);
  LIGHT.x = width * 0.22;
  LIGHT.y = height * 0.14;
  rebuildBackground();
  silkLayer = createGraphics(width, height);
  silkLayer.pixelDensity(2);
  frameRate(60);
  setupUI();
}

function draw() {
  // Composite: paper background -> accumulated silk -> live spiders/dew.
  image(bgLayer, 0, 0, width, height);
  image(silkLayer, 0, 0, width, height);

  if (!paused) {
    for (const s of spiders) s.tick();
  }

  // Dew drops and spider bodies are redrawn each frame so they glisten.
  for (const n of allNodes) drawDew(n);
  for (const s of spiders) s.render();
}

function setupUI() {
  const pauseBtn = document.getElementById("pauseBtn");
  const clearBtn = document.getElementById("clearBtn");
  if (pauseBtn) {
    pauseBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      paused = !paused;
      if (paused) {
        for (const s of spiders) s.stopTone();
      } else {
        for (const s of spiders) s.resumeToneIfNeeded();
      }
      pauseBtn.textContent = paused ? "繼續" : "暫停";
    });
  }
  if (clearBtn) {
    clearBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      for (const s of spiders) s.destroy();
      spiders = [];
      allNodes = [];
      threads = [];
      silkLayer.clear();
    });
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  LIGHT.x = width * 0.22;
  LIGHT.y = height * 0.14;
  rebuildBackground();
  // Redraw all previously accumulated threads onto a fresh silk layer.
  const fresh = createGraphics(width, height);
  fresh.pixelDensity(2);
  silkLayer = fresh;
  for (const t of threads) renderThreadToLayer(t, silkLayer, true);
  for (const s of spiders) s.replantOrigin();
}

function mousePressed(event) {
  if (event && event.target && event.target.tagName === "BUTTON") return;
  bootAudio();
  if (mouseX < 0 || mouseY < 0 || mouseX > width || mouseY > height) return;
  spiders.push(new Spider(mouseX, mouseY));
}

function bootAudio() {
  if (audioReady) return;
  userStartAudio();
  audioReady = true;
}

// ---------- Background: off-white rag paper with grain and vignette ----------

function rebuildBackground() {
  bgLayer = createGraphics(width, height);
  bgLayer.pixelDensity(1);
  const g = bgLayer.drawingContext;

  // Warm paper gradient (slightly darker bottom-right).
  const base = g.createLinearGradient(0, 0, width, height);
  base.addColorStop(0, "#f2ede2");
  base.addColorStop(0.55, "#e6dfd0");
  base.addColorStop(1, "#cfc6b3");
  g.fillStyle = base;
  g.fillRect(0, 0, width, height);

  // Soft top-left light wash (where the "sun" hits).
  const wash = g.createRadialGradient(
    LIGHT.x, LIGHT.y, 20,
    LIGHT.x, LIGHT.y, Math.max(width, height) * 0.75
  );
  wash.addColorStop(0, "rgba(255, 250, 232, 0.55)");
  wash.addColorStop(1, "rgba(255, 250, 232, 0)");
  g.fillStyle = wash;
  g.fillRect(0, 0, width, height);

  // Paper fiber noise.
  const img = g.getImageData(0, 0, width, height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 14;
    d[i] = clampByte(d[i] + n);
    d[i + 1] = clampByte(d[i + 1] + n * 0.95);
    d[i + 2] = clampByte(d[i + 2] + n * 0.85);
  }
  g.putImageData(img, 0, 0);

  // Long fibers — faint strokes.
  g.globalAlpha = 0.08;
  g.strokeStyle = "#8c7c60";
  g.lineWidth = 0.6;
  for (let i = 0; i < 180; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const a = Math.random() * Math.PI * 2;
    const len = 30 + Math.random() * 140;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    g.stroke();
  }
  g.globalAlpha = 1;

  // Vignette.
  const vg = g.createRadialGradient(
    width / 2, height / 2, Math.min(width, height) * 0.35,
    width / 2, height / 2, Math.max(width, height) * 0.75
  );
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(30, 24, 14, 0.32)");
  g.fillStyle = vg;
  g.fillRect(0, 0, width, height);
}

function clampByte(v) {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

// ---------- Spider ----------

class Spider {
  constructor(x, y) {
    this.origin = { x, y, size: 5.5 };
    this.nodes = [this.origin];
    allNodes.push(this.origin);
    this.pos = { x, y };
    this.target = { x, y };
    this.current = null;
    this.restFrames = 0;
    this.osc = new p5.Oscillator("triangle");
    this.osc.amp(0);
    this.osc.start();
    this.playingTone = false;
    this.bodyAngle = 0;
  }

  replantOrigin() {
    // Silk layer gets rebuilt on resize — nothing persistent needed here.
  }

  tick() {
    // Body drifts toward the current working end.
    const tx = this.current ? this.current.prev.x : this.origin.x;
    const ty = this.current ? this.current.prev.y : this.origin.y;
    this.bodyAngle = Math.atan2(ty - this.pos.y, tx - this.pos.x);
    this.pos.x += (tx - this.pos.x) * 0.08;
    this.pos.y += (ty - this.pos.y) * 0.08;

    if (this.restFrames-- > 0) return;

    if (!this.current) {
      this.startNewThread();
      if (!this.current) return;
    }

    const speed = 6;
    for (let i = 0; i < speed && this.current; i++) {
      this.advanceCurrent();
    }
  }

  startNewThread() {
    this.stopTone();
    const from = random(this.nodes);

    let to;
    let plantNode = false;
    if (random() < 0.3 && allNodes.length > 1) {
      let pick = random(allNodes);
      let tries = 0;
      while (pick === from && tries++ < 5) pick = random(allNodes);
      to = pick;
    } else {
      const ang = random(TWO_PI);
      const reach = min(width, height);
      const dist = random(reach * 0.25, reach * 0.85);
      const nx = constrain(from.x + cos(ang) * dist, 12, width - 12);
      const ny = constrain(from.y + sin(ang) * dist, 12, height - 12);
      to = { x: nx, y: ny, size: random(2.6, 4.2) };
      plantNode = true;
    }

    // Perpendicular bow plus gravity sag — longer threads sag more.
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = sqrt(dx * dx + dy * dy);
    const bow = random(-1.2, 1.2);
    const sag = len * 0.04 + random(2, 6);
    const cx = (from.x + to.x) * 0.5 + (-dy / max(len, 0.001)) * bow;
    const cy = (from.y + to.y) * 0.5 + (dx / max(len, 0.001)) * bow + sag;

    const steps = max(10, floor(len / 4));

    this.current = {
      from,
      to,
      cx,
      cy,
      steps,
      step: 0,
      prev: { x: from.x, y: from.y },
      prevHeading: null,
      turned: false,
      plantNode,
      segments: [{ x: from.x, y: from.y }]
    };
    this.startTone();
  }

  advanceCurrent() {
    const c = this.current;
    c.step++;
    const t = c.step / c.steps;
    const pt = quadPoint(c.from.x, c.from.y, c.cx, c.cy, c.to.x, c.to.y, t);

    // Draw this segment to the silk layer with a three-pass silk look:
    // wide soft halo, thin dark core, bright highlight facing the light.
    drawSilkSegment(silkLayer, c.prev, pt);

    const segHeading = atan2(pt.y - c.prev.y, pt.x - c.prev.x);
    if (c.prevHeading !== null && !c.turned) {
      const turnAngle = abs(angleDelta(segHeading, c.prevHeading));
      if (turnAngle > radians(12)) {
        c.turned = true;
        this.stopTone();
      }
    }
    c.prevHeading = segHeading;
    c.prev = pt;
    c.segments.push({ x: pt.x, y: pt.y });

    if (c.step >= c.steps) {
      if (c.plantNode) {
        this.nodes.push(c.to);
        allNodes.push(c.to);
      }
      threads.push(c);
      this.stopTone();
      this.current = null;
      this.restFrames = floor(random(4, 14));
    }
  }

  render() {
    drawSpiderBody(this.pos.x, this.pos.y, this.bodyAngle);
  }

  startTone() {
    if (!audioReady || this.playingTone) return;
    this.osc.freq(random(SCALE_NOTES));
    this.osc.amp(0.11, 0.03);
    this.playingTone = true;
  }

  stopTone() {
    if (!this.playingTone) return;
    this.osc.amp(0, 0.05);
    this.playingTone = false;
  }

  resumeToneIfNeeded() {
    if (!this.current || this.current.turned) return;
    this.startTone();
  }

  destroy() {
    this.stopTone();
    this.osc.stop();
    if (this.osc.dispose) this.osc.dispose();
  }
}

// ---------- Silk rendering ----------

function drawSilkSegment(layer, a, b) {
  const threadTwist = noise(a.x * 0.01, a.y * 0.01, frameCount * 0.004) - 0.5;
  const offX = threadTwist * 0.5;
  const offY = threadTwist * -0.5;
  const g = layer.drawingContext;
  // Soft halo (wider, very faint warm tone).
  g.lineCap = "round";
  g.strokeStyle = "rgba(80, 70, 55, 0.08)";
  g.lineWidth = 2.4;
  g.beginPath();
  g.moveTo(a.x + offX, a.y + offY);
  g.lineTo(b.x + offX, b.y + offY);
  g.stroke();

  // Dark core.
  g.strokeStyle = "rgba(22, 20, 18, 0.78)";
  g.lineWidth = 0.9;
  g.beginPath();
  g.moveTo(a.x, a.y);
  g.lineTo(b.x, b.y);
  if (random() < 0.12) {
    g.strokeStyle = "rgba(44, 40, 34, 0.45)";
    g.lineWidth = 0.45;
    g.stroke();
    g.beginPath();
    g.moveTo(a.x - offX * 0.8, a.y - offY * 0.8);
    g.lineTo(b.x - offX * 0.8, b.y - offY * 0.8);
  }
  g.stroke();

  // Highlight: alpha modulated by how perpendicular the segment is to
  // the light direction, simulating silk catching the sun.
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const lx = LIGHT.x - mx;
  const ly = LIGHT.y - my;
  const llen = Math.hypot(lx, ly) || 1;
  const sx = b.x - a.x;
  const sy = b.y - a.y;
  const slen = Math.hypot(sx, sy) || 1;
  const dot = Math.abs((lx * -sy + ly * sx) / (llen * slen));
  const alpha = 0.05 + dot * 0.35;
  g.strokeStyle = `rgba(255, 248, 220, ${alpha.toFixed(3)})`;
  g.lineWidth = 0.55;
  g.beginPath();
  g.moveTo(a.x, a.y);
  g.lineTo(b.x, b.y);
  g.stroke();
}

function renderThreadToLayer(thread, layer, fromScratch) {
  if (!thread.segments || thread.segments.length < 2) return;
  const segs = thread.segments;
  for (let i = 1; i < segs.length; i++) {
    drawSilkSegment(layer, segs[i - 1], segs[i]);
  }
  // If we're rebuilding and the thread was planted, redraw its dew later
  // in draw() via allNodes loop — nothing to do here.
  void fromScratch;
}

// ---------- Dew & spider body ----------

function drawDew(node) {
  const r = (node.size || 3) * 1.05 + 0.8;
  // Shadow under drop.
  noStroke();
  fill(20, 16, 10, 40);
  ellipse(node.x + r * 0.25, node.y + r * 0.35, r * 1.9, r * 1.4);

  // Glass body: radial gradient using native canvas.
  const g = drawingContext;
  const gr = g.createRadialGradient(
    node.x - r * 0.35, node.y - r * 0.4, r * 0.1,
    node.x, node.y, r
  );
  gr.addColorStop(0, "rgba(255, 255, 255, 0.92)");
  gr.addColorStop(0.35, "rgba(210, 220, 230, 0.55)");
  gr.addColorStop(1, "rgba(40, 45, 55, 0.55)");
  g.fillStyle = gr;
  g.beginPath();
  g.arc(node.x, node.y, r, 0, Math.PI * 2);
  g.fill();

  // Rim highlight.
  g.strokeStyle = "rgba(255,255,255,0.75)";
  g.lineWidth = 0.5;
  g.beginPath();
  g.arc(node.x - r * 0.25, node.y - r * 0.3, r * 0.55, Math.PI * 0.9, Math.PI * 1.6);
  g.stroke();

  // Specular point.
  fill(255, 255, 255, 240);
  ellipse(node.x - r * 0.38, node.y - r * 0.42, r * 0.35, r * 0.3);
}

function drawSpiderBody(x, y, ang) {
  push();
  translate(x, y);
  rotate(ang);

  // Eight legs — two arcs each side, quadratic-ish.
  stroke(14, 12, 10, 230);
  strokeWeight(0.9);
  noFill();
  for (let i = 0; i < 4; i++) {
    for (const side of [-1, 1]) {
      const base = (i - 1.5) * 0.28;
      const reach = 10 + i * 1.2;
      const bendY = side * (4 + i * 0.6);
      const endX = Math.cos(base) * reach;
      const endY = side * (6 + i * 1.4);
      const cx1 = Math.cos(base) * (reach * 0.45);
      const cy1 = side * 2;
      const cx2 = Math.cos(base) * (reach * 0.9);
      const cy2 = bendY;
      const g = drawingContext;
      g.beginPath();
      g.moveTo(0, 0);
      g.bezierCurveTo(cx1, cy1, cx2, cy2, endX, endY);
      g.stroke();
    }
  }

  // Abdomen (back).
  const g = drawingContext;
  const ab = g.createRadialGradient(-3, -1.5, 0.5, -2, 0, 5.5);
  ab.addColorStop(0, "#4a3f34");
  ab.addColorStop(0.6, "#221c14");
  ab.addColorStop(1, "#0a0805");
  g.fillStyle = ab;
  g.beginPath();
  g.ellipse(-3, 0, 5.5, 4.2, 0, 0, Math.PI * 2);
  g.fill();

  // Cephalothorax (front).
  const ch = g.createRadialGradient(2.2, -0.6, 0.3, 2, 0, 3);
  ch.addColorStop(0, "#3d3329");
  ch.addColorStop(1, "#120e09");
  g.fillStyle = ch;
  g.beginPath();
  g.ellipse(2, 0, 3, 2.4, 0, 0, Math.PI * 2);
  g.fill();

  // Tiny specular on abdomen.
  fill(255, 250, 235, 160);
  noStroke();
  ellipse(-3.8, -1.4, 1.2, 0.8);

  pop();
}

// ---------- Math helpers ----------

function quadPoint(x0, y0, x1, y1, x2, y2, t) {
  const u = 1 - t;
  return {
    x: u * u * x0 + 2 * u * t * x1 + t * t * x2,
    y: u * u * y0 + 2 * u * t * y1 + t * t * y2
  };
}

function angleDelta(a, b) {
  return atan2(sin(a - b), cos(a - b));
}
