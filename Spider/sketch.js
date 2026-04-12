// Click anywhere to drop a spider. Each spider continuously weaves new
// threads, animating each strand as it grows from a known node toward a
// random distant target.

let spiders = [];
let allNodes = [];
let paused = false;
let audioReady = false;
const SCALE_NOTES = [220, 246.94, 261.63, 293.66, 329.63, 392.0, 440.0];

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(2);
  paintBackground();
  frameRate(60);
  setupUI();
}

function draw() {
  if (paused) return;
  for (const s of spiders) s.tick();
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
      paintBackground();
    });
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  paintBackground();
  // Lose history on resize — keep things simple.
  for (const s of spiders) s.replantOrigin();
}

function mousePressed(event) {
  // Ignore clicks on UI buttons.
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

function paintBackground() {
  background(198, 200, 202);
  const grd = drawingContext.createLinearGradient(0, 0, width, height);
  grd.addColorStop(0, "rgba(255,255,255,0.20)");
  grd.addColorStop(1, "rgba(0,0,0,0.10)");
  drawingContext.fillStyle = grd;
  drawingContext.fillRect(0, 0, width, height);
}

class Spider {
  constructor(x, y) {
    this.origin = { x, y, size: 6 };
    this.nodes = [this.origin];
    allNodes.push(this.origin);
    drawNode(x, y, this.origin.size);
    this.current = null;
    this.restFrames = 0;
    this.osc = new p5.Oscillator("triangle");
    this.osc.amp(0);
    this.osc.start();
    this.playingTone = false;
  }

  replantOrigin() {
    drawNode(this.origin.x, this.origin.y, this.origin.size);
  }

  tick() {
    if (this.restFrames-- > 0) return;

    if (!this.current) {
      this.startNewThread();
      if (!this.current) return;
    }

    // Advance the animated thread by a few segments per frame so it
    // visibly grows across the canvas instead of popping into existence.
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
      // Random point spread far across the canvas — biased long.
      const ang = random(TWO_PI);
      const reach = min(width, height);
      const dist = random(reach * 0.25, reach * 0.85);
      const nx = constrain(from.x + cos(ang) * dist, 12, width - 12);
      const ny = constrain(from.y + sin(ang) * dist, 12, height - 12);
      to = { x: nx, y: ny, size: random(2.6, 4.2) };
      plantNode = true;
    }

    // Pre-compute a slight perpendicular bow for the thread so it draws
    // as a quadratic curve, segment by segment.
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = sqrt(dx * dx + dy * dy);
    const bow = random(-1.6, 1.6);
    const cx = (from.x + to.x) * 0.5 + (-dy / max(len, 0.001)) * bow;
    const cy = (from.y + to.y) * 0.5 + (dx / max(len, 0.001)) * bow;

    // Steps proportional to length so long threads don't draw faster
    // than short ones.
    const steps = max(8, floor(len / 4));

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
      plantNode
    };
    this.startTone();
  }

  advanceCurrent() {
    const c = this.current;
    c.step++;
    const t = c.step / c.steps;
    const pt = quadPoint(c.from.x, c.from.y, c.cx, c.cy, c.to.x, c.to.y, t);

    stroke(20, 22, 25, 215);
    strokeWeight(0.95);
    noFill();
    line(c.prev.x, c.prev.y, pt.x, pt.y);

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

    if (c.step >= c.steps) {
      if (c.plantNode) {
        this.nodes.push(c.to);
        allNodes.push(c.to);
        drawNode(c.to.x, c.to.y, c.to.size);
      }
      this.stopTone();
      this.current = null;
      this.restFrames = floor(random(4, 14));
    }
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

function quadPoint(x0, y0, x1, y1, x2, y2, t) {
  const u = 1 - t;
  return {
    x: u * u * x0 + 2 * u * t * x1 + t * t * x2,
    y: u * u * y0 + 2 * u * t * y1 + t * t * y2
  };
}

function drawNode(x, y, size) {
  noStroke();
  fill(255, 255, 255, 90);
  circle(x, y, size + 1.8);
  fill(8, 10, 13, 250);
  circle(x, y, size);
}

function angleDelta(a, b) {
  return atan2(sin(a - b), cos(a - b));
}
