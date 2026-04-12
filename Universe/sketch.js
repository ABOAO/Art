import * as THREE from "./vendor/three.module.js";
import { OrbitControls } from "./vendor/OrbitControls.module.js";

const sceneMount = document.getElementById("scene");
const randomButton = document.getElementById("randomButton");
const menuButton = document.getElementById("menuButton");
const loadingLabel = document.getElementById("loadingLabel");
const transitionPulse = document.getElementById("transitionPulse");
const viewpointLabel = document.getElementById("viewpointLabel");
const selectorMenu = document.getElementById("selectorMenu");

// Tune the scale so Earth feels present while keeping a clear sense of distance.
const EARTH_RADIUS = 1.6;
const EARTH_POSITION = new THREE.Vector3(0, 0, 0);
const SUN_POSITION = new THREE.Vector3(-34, 14, -26);
const SUN_RADIUS = 5.4;
const TRANSITION_DURATION = 1800;
const LEGACY_VIEWPOINT_BODY_DEFS = [
  {
    name: "Adrian",
    label: "Adrian · 天倉五",
    radius: 1.08,
    position: new THREE.Vector3(86, -18, -112),
    textureType: "adrian",
    rotationSpeed: 0.013,
    cluster: "distant",
    hostStar: {
      name: "天倉五 Tau Ceti",
      offset: new THREE.Vector3(-7.5, 4.6, -8.5),
      radius: 2.4,
      color: "#ffe0ab",
      glow: "#ffc56b"
    }
  },
  {
    name: "Erid",
    label: "Erid · 波江座 40A",
    radius: 1.02,
    position: new THREE.Vector3(-98, 22, -128),
    textureType: "erid",
    rotationSpeed: 0.012,
    cluster: "distant",
    hostStar: {
      name: "40 Eridani A",
      offset: new THREE.Vector3(8.5, 5.6, -6.8),
      radius: 2.2,
      color: "#ffe7c8",
      glow: "#ffd48a"
    }
  },
  {
    name: "水星",
    radius: 0.34,
    position: new THREE.Vector3(-22.5, 5.8, -13.2),
    textureType: "mercury",
    rotationSpeed: 0.018
  },
  {
    name: "月球",
    radius: 0.42,
    position: new THREE.Vector3(6.1, 0.7, -1.3),
    textureType: "moon",
    rotationSpeed: 0.015
  },
  {
    name: "金星",
    radius: 0.72,
    position: new THREE.Vector3(-11.8, 2.5, 4.6),
    textureType: "venus",
    rotationSpeed: 0.009
  },
  {
    name: "火星",
    radius: 0.58,
    position: new THREE.Vector3(13.8, -3.2, 7.2),
    textureType: "mars",
    rotationSpeed: 0.014
  },
  {
    name: "木星",
    radius: 1.28,
    position: new THREE.Vector3(-18.6, 5.4, -8.5),
    textureType: "jupiter",
    rotationSpeed: 0.021
  },
  {
    name: "土星",
    radius: 1.16,
    position: new THREE.Vector3(20.5, 3.6, -12.8),
    textureType: "saturn",
    rotationSpeed: 0.018,
    viewpointEligible: false,
    ring: {
      innerRadius: 1.55,
      outerRadius: 2.45,
      tiltX: -1.08,
      tiltY: 0.24
    }
  },
  {
    name: "海王星",
    radius: 0.9,
    position: new THREE.Vector3(-9.5, -6.2, -16.4),
    textureType: "neptune",
    rotationSpeed: 0.012
  },
  {
    name: "天王星",
    radius: 0.95,
    position: new THREE.Vector3(6.8, 8.6, -20.3),
    textureType: "uranus",
    rotationSpeed: 0.01,
    viewpointEligible: false,
    ring: {
      innerRadius: 1.28,
      outerRadius: 1.8,
      tiltX: -1.22,
      tiltY: 0.08
    }
  }
];

const CATALOG_BODY_NAMES = [
  "Earth",
  "Moon",
  "Mars",
  "Jupiter",
  "Venus",
  "Saturn",
  "Europa",
  "Titan",
  "Enceladus",
  "Mercury",
  "Neptune",
  "Uranus",
  "Pluto",
  "Ceres",
  "Ganymede",
  "Io",
  "Callisto",
  "Triton",
  "Eris",
  "Haumea",
  "Makemake",
  "PSR B1257+12 b",
  "PSR B1257+12 c",
  "PSR B1257+12 d",
  "51 Pegasi b",
  "Upsilon Andromedae b",
  "Upsilon Andromedae c",
  "Upsilon Andromedae d",
  "70 Virginis b",
  "47 UMa b",
  "47 UMa c",
  "Tau Boötis b",
  "HD 209458 b",
  "HD 189733 b",
  "55 Cancri e",
  "GJ 1214 b",
  "GJ 436 b",
  "HAT-P-11 b",
  "HAT-P-26 b",
  "HD 149026 b",
  "WASP-12 b",
  "WASP-17 b",
  "WASP-18 b",
  "WASP-39 b",
  "WASP-43 b",
  "WASP-76 b",
  "WASP-107 b",
  "WASP-121 b",
  "Kepler-10 b",
  "Kepler-20 e",
  "Kepler-20 f",
  "Kepler-22 b",
  "Kepler-36 b",
  "Kepler-36 c",
  "Kepler-37 b",
  "Kepler-62 e",
  "Kepler-62 f",
  "Kepler-69 c",
  "Kepler-78 b",
  "Kepler-186 f",
  "Kepler-438 b",
  "Kepler-442 b",
  "Kepler-452 b",
  "Proxima Centauri b",
  "Proxima Centauri c",
  "LHS 1140 b",
  "LHS 1140 c",
  "TOI-700 d",
  "TOI-700 e",
  "K2-18 b",
  "Kepler-1649 c",
  "Kepler-11 b",
  "Kepler-11 c",
  "Kepler-11 d",
  "Kepler-11 e",
  "Kepler-11 f",
  "Kepler-11 g",
  "Kepler-16 b",
  "Kepler-90 i",
  "Kepler-444 b",
  "Kepler-444 c",
  "Kepler-444 d",
  "Kepler-444 e",
  "Kepler-444 f",
  "TRAPPIST-1 b",
  "TRAPPIST-1 c",
  "TRAPPIST-1 d",
  "TRAPPIST-1 e",
  "TRAPPIST-1 f",
  "TRAPPIST-1 g",
  "TRAPPIST-1 h",
  "HR 8799 b",
  "HR 8799 c",
  "HR 8799 d",
  "HR 8799 e",
  "Beta Pictoris b",
  "Beta Pictoris c",
  "PDS 70 b",
  "PDS 70 c",
  "HIP 65426 b"
];

const TEXTURE_BY_NAME = {
  Earth: "earthLike",
  Moon: "moon",
  Mars: "mars",
  Jupiter: "jupiter",
  Venus: "venus",
  Saturn: "saturn",
  Mercury: "mercury",
  Neptune: "neptune",
  Uranus: "uranus"
};

const CATALOG_VIEWPOINT_BODY_DEFS = CATALOG_BODY_NAMES.map((name, index) => {
  const shell = Math.floor(index / 12);
  const angle = index * 1.61803398875;
  const radiusBand = 12 + shell * 7.25 + (index % 3) * 0.9;
  const y = ((index % 9) - 4) * 2.15 + Math.sin(angle * 1.7) * 1.2;
  const position = new THREE.Vector3(
    Math.cos(angle) * radiusBand,
    y,
    Math.sin(angle) * (radiusBand + 2.4)
  );

  const baseRadius = name.includes("Jupiter") || name.includes("Saturn")
    ? 1.14
    : name.includes("Earth")
      ? 0.92
      : name.includes("Moon")
        ? 0.52
        : 0.6;

  return {
    name,
    label: `${index + 1}. ${name}`,
    radius: baseRadius + (index % 5) * 0.05,
    position,
    textureType: TEXTURE_BY_NAME[name] || "exoplanet",
    rotationSpeed: 0.007 + (index % 6) * 0.0014,
    cluster: shell > 2 ? "distant" : "local"
  };
});

const VIEWPOINT_BODY_DEFS = [
  ...LEGACY_VIEWPOINT_BODY_DEFS,
  ...CATALOG_VIEWPOINT_BODY_DEFS
];
const INTERGALACTIC_LANDMARK_DEFS = [
  {
    name: "仙女座星系",
    color: "#92b8ff",
    position: new THREE.Vector3(12, 124, -290),
    scale: 220,
    opacity: 0.22,
    rotation: 0.22
  },
  {
    name: "三角座星系",
    color: "#8ad7ff",
    position: new THREE.Vector3(-164, -76, -320),
    scale: 154,
    opacity: 0.14,
    rotation: -0.32
  },
  {
    name: "漩渦星系",
    color: "#ffd6a6",
    position: new THREE.Vector3(176, -24, -340),
    scale: 196,
    opacity: 0.12,
    rotation: 0.58
  }
];

let scene;
let camera;
let renderer;
let controls;
let earthMesh;
let cloudMesh;
let atmosphereMesh;
let starLayers = [];
let viewpointBodies = [];
let nebulaSprites = [];
let intergalacticSprites = [];
let cameraTransition = null;
let currentViewpointName = "";
let menuOpen = false;
let sunGroup;
let sunMesh;
let sunGlowSprites = [];

const clock = new THREE.Clock();
const textureLoader = new THREE.TextureLoader();
textureLoader.setCrossOrigin("anonymous");

window.addEventListener("error", (event) => {
  showStatus(`場景載入錯誤: ${event.message}`);
});

window.addEventListener("unhandledrejection", (event) => {
  showStatus(`資源載入錯誤: ${String(event.reason)}`);
});

init();

function init() {
  setupScene();
  setupLights();
  setupSun();
  setupEarth();
  setupViewpointBodies();
  setupStars();
  setupNebulaSprites();
  setupIntergalacticLandmarks();
  populateSelectorMenu();
  setupControls();
  setupEvents();

  randomizeCamera(true);
  loadEarthTextures();
  animate();
}

function setupScene() {
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x02040a, 0.0026);

  camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    500
  );

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;

  sceneMount.appendChild(renderer.domElement);
}

function setupLights() {
  // Layered lighting gives Earth a sunlit face plus a cooler rim in shadow.
  const ambientLight = new THREE.AmbientLight(0x5370b8, 0.48);
  scene.add(ambientLight);

  const hemisphereLight = new THREE.HemisphereLight(0x9fc5ff, 0x05070d, 1.15);
  scene.add(hemisphereLight);

  const sunLight = new THREE.DirectionalLight(0xffffff, 2.3);
  sunLight.position.copy(SUN_POSITION);
  scene.add(sunLight);

  const solarBloom = new THREE.PointLight(0xfff1b1, 5.4, 120, 1.6);
  solarBloom.position.copy(SUN_POSITION);
  scene.add(solarBloom);

  const rimLight = new THREE.DirectionalLight(0x4e86ff, 0.9);
  rimLight.position.set(-6, -3, -8);
  scene.add(rimLight);
}

function setupSun() {
  sunGroup = new THREE.Group();
  sunGroup.position.copy(SUN_POSITION);

  const sunMaterial = new THREE.MeshBasicMaterial({
    map: createSunTexture(),
    color: 0xffe7b0
  });

  sunMesh = new THREE.Mesh(
    new THREE.SphereGeometry(SUN_RADIUS, 96, 96),
    sunMaterial
  );
  sunGroup.add(sunMesh);

  sunGlowSprites = [
    createGlowSprite({
      color: "#ffdd88",
      scale: 20,
      opacity: 0.62
    }),
    createGlowSprite({
      color: "#ff9f3d",
      scale: 30,
      opacity: 0.24
    }),
    createGlowSprite({
      color: "#fff2c1",
      scale: 12,
      opacity: 0.52
    })
  ];

  sunGlowSprites.forEach((sprite) => sunGroup.add(sprite));
  scene.add(sunGroup);
}

function setupEarth() {
  // Start with a graceful fallback material so the scene is visible before textures finish loading.
  const earthGeometry = new THREE.SphereGeometry(EARTH_RADIUS, 96, 96);
  const earthMaterial = new THREE.MeshPhongMaterial({
    color: 0x4b74b6,
    shininess: 22,
    specular: new THREE.Color(0x355281)
  });

  earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
  scene.add(earthMesh);

  const cloudGeometry = new THREE.SphereGeometry(EARTH_RADIUS * 1.012, 96, 96);
  const cloudMaterial = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.12,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  cloudMesh = new THREE.Mesh(cloudGeometry, cloudMaterial);
  scene.add(cloudMesh);

  // A subtle additive shell makes the planet glow without needing post-processing.
  const atmosphereGeometry = new THREE.SphereGeometry(EARTH_RADIUS * 1.09, 64, 64);
  const atmosphereMaterial = new THREE.ShaderMaterial({
    uniforms: {
      glowColor: { value: new THREE.Color(0x58a6ff) }
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vWorldPosition;

      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 glowColor;
      varying vec3 vNormal;
      varying vec3 vWorldPosition;

      void main() {
        vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
        float intensity = pow(0.82 - dot(vNormal, viewDirection), 4.0);
        gl_FragColor = vec4(glowColor, intensity * 0.5);
      }
    `,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false
  });

  atmosphereMesh = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
  scene.add(atmosphereMesh);
}

function setupViewpointBodies() {
  viewpointBodies = VIEWPOINT_BODY_DEFS.map((definition) => {
    const group = new THREE.Group();
    group.position.copy(definition.position);

    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(definition.radius, 48, 48),
      new THREE.MeshPhongMaterial({
        map: createBodyTexture(definition.textureType),
        shininess: 12,
        specular: new THREE.Color(0x1c2338)
      })
    );
    group.add(mesh);

    let ring = null;
    if (definition.ring) {
      ring = createRing(definition);
      group.add(ring);
    }

    if (definition.hostStar) {
      const hostStarGroup = createHostStar(definition.hostStar);
      group.add(hostStarGroup);
    }

    scene.add(group);

    return {
      ...definition,
      group,
      mesh,
      ring
    };
  });
}

function createBodyTexture(textureType) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;

  const context = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;

  switch (textureType) {
    case "adrian":
      paintStripedTexture(context, width, height, {
        base: "#7c9280",
        stripes: ["#d9cab1", "#65856f", "#425245", "#9db29e"],
        softness: 0.36
      });
      break;
    case "erid":
      paintStripedTexture(context, width, height, {
        base: "#846767",
        stripes: ["#c2967e", "#6b4e52", "#cfb1b0"],
        softness: 0.3
      });
      break;
    case "moon":
      paintMoonTexture(context, width, height);
      break;
    case "earthLike":
      paintStripedTexture(context, width, height, {
        base: "#4478c7",
        stripes: ["#63a6ff", "#2f5ea6", "#5ca060", "#3f7e4f"],
        softness: 0.44
      });
      break;
    case "mercury":
      paintMoonTexture(context, width, height, {
        base: "#8f8b88",
        dark: "rgba(70, 68, 70, 0.2)",
        light: "rgba(208, 202, 198, 0.18)"
      });
      break;
    case "venus":
      paintStripedTexture(context, width, height, {
        base: "#d8b57d",
        stripes: ["#c89f67", "#e8c790", "#b4875d"],
        softness: 0.82
      });
      break;
    case "mars":
      paintStripedTexture(context, width, height, {
        base: "#9d4f35",
        stripes: ["#bf6b46", "#7e3321", "#cf8662"],
        softness: 0.54
      });
      break;
    case "jupiter":
      paintStripedTexture(context, width, height, {
        base: "#b98557",
        stripes: ["#dbbf92", "#94633f", "#f0dfc0", "#b7764a"],
        softness: 0.26,
        storm: true
      });
      break;
    case "saturn":
      paintStripedTexture(context, width, height, {
        base: "#ccb27d",
        stripes: ["#e8d7aa", "#b59a6e", "#9a7d56"],
        softness: 0.18
      });
      break;
    case "neptune":
      paintStripedTexture(context, width, height, {
        base: "#2d62cf",
        stripes: ["#70a5ff", "#1b3c91", "#4b7fea"],
        softness: 0.4
      });
      break;
    case "uranus":
      paintStripedTexture(context, width, height, {
        base: "#8fd9d8",
        stripes: ["#c7fbff", "#6dbec1", "#a5eeee"],
        softness: 0.22
      });
      break;
    case "exoplanet":
      paintStripedTexture(context, width, height, {
        base: "#5d6587",
        stripes: ["#8b95bc", "#343d5d", "#6e5a7f", "#a3a5bf"],
        softness: 0.35
      });
      break;
    default:
      context.fillStyle = "#888";
      context.fillRect(0, 0, width, height);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
}

function paintMoonTexture(context, width, height, palette = {}) {
  context.fillStyle = palette.base || "#a7aeb9";
  context.fillRect(0, 0, width, height);

  for (let index = 0; index < 180; index += 1) {
    const radius = 6 + Math.random() * 28;
    const x = Math.random() * width;
    const y = Math.random() * height;
    const alpha = 0.08 + Math.random() * 0.18;

    context.beginPath();
    context.fillStyle = palette.dark || `rgba(66, 73, 84, ${alpha})`;
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();

    context.beginPath();
    context.strokeStyle =
      palette.light || `rgba(230, 236, 245, ${alpha * 0.7})`;
    context.lineWidth = 1.4;
    context.arc(x + radius * 0.12, y - radius * 0.12, radius * 0.72, 0, Math.PI * 2);
    context.stroke();
  }
}

function paintStripedTexture(context, width, height, options) {
  context.fillStyle = options.base;
  context.fillRect(0, 0, width, height);

  for (let index = 0; index < 18; index += 1) {
    const bandHeight = 18 + Math.random() * 44;
    const y = (index / 18) * height + THREE.MathUtils.randFloatSpread(18);
    context.fillStyle =
      options.stripes[index % options.stripes.length];
    context.globalAlpha = 0.38 + Math.random() * 0.35;
    context.fillRect(0, y, width, bandHeight);
  }

  context.globalAlpha = 1;

  if (options.softness) {
    const gradient = context.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, `rgba(255, 255, 255, ${options.softness * 0.12})`);
    gradient.addColorStop(0.45, "rgba(255, 255, 255, 0)");
    gradient.addColorStop(1, `rgba(17, 21, 34, ${options.softness * 0.22})`);
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
  }

  if (options.storm) {
    context.fillStyle = "rgba(201, 122, 82, 0.42)";
    context.beginPath();
    context.ellipse(width * 0.68, height * 0.62, 88, 42, -0.18, 0, Math.PI * 2);
    context.fill();
  }
}

function createRing(definition) {
  const ringTexture = createRingTexture();
  const geometry = new THREE.RingGeometry(
    definition.ring.innerRadius,
    definition.ring.outerRadius,
    128
  );
  const material = new THREE.MeshBasicMaterial({
    map: ringTexture,
    transparent: true,
    opacity: 0.86,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const ring = new THREE.Mesh(geometry, material);
  ring.rotation.x = definition.ring.tiltX;
  ring.rotation.y = definition.ring.tiltY;
  return ring;
}

function createRingTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 64;

  const context = canvas.getContext("2d");
  const gradient = context.createLinearGradient(0, 0, canvas.width, 0);
  gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
  gradient.addColorStop(0.18, "rgba(225, 211, 172, 0.85)");
  gradient.addColorStop(0.4, "rgba(178, 154, 108, 0.35)");
  gradient.addColorStop(0.62, "rgba(232, 222, 197, 0.92)");
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  for (let index = 0; index < 22; index += 1) {
    context.fillStyle = `rgba(255, 247, 225, ${0.03 + Math.random() * 0.08})`;
    context.fillRect(
      Math.random() * canvas.width,
      0,
      10 + Math.random() * 36,
      canvas.height
    );
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function createHostStar(hostStar) {
  const hostStarGroup = new THREE.Group();
  hostStarGroup.position.copy(hostStar.offset);

  const starMesh = new THREE.Mesh(
    new THREE.SphereGeometry(hostStar.radius, 48, 48),
    new THREE.MeshBasicMaterial({
      map: createGlowTexture(hostStar.glow),
      color: new THREE.Color(hostStar.color)
    })
  );
  hostStarGroup.add(starMesh);

  const glowSprite = createGlowSprite({
    color: hostStar.glow,
    scale: hostStar.radius * 6.8,
    opacity: 0.36
  });
  hostStarGroup.add(glowSprite);

  return hostStarGroup;
}

function createSunTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const context = canvas.getContext("2d");
  const center = canvas.width / 2;

  const gradient = context.createRadialGradient(
    center,
    center,
    80,
    center,
    center,
    center
  );
  gradient.addColorStop(0, "#fffef0");
  gradient.addColorStop(0.26, "#ffd982");
  gradient.addColorStop(0.58, "#ff9d2f");
  gradient.addColorStop(0.82, "#ff6c1a");
  gradient.addColorStop(1, "#8c2f07");
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  for (let index = 0; index < 260; index += 1) {
    const angle = Math.random() * Math.PI * 2;
    const distance = 90 + Math.random() * 320;
    const x = center + Math.cos(angle) * distance;
    const y = center + Math.sin(angle) * distance;
    const radius = 16 + Math.random() * 54;
    const alpha = 0.04 + Math.random() * 0.12;

    context.beginPath();
    context.fillStyle = `rgba(255, 232, 180, ${alpha})`;
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function createGlowSprite({ color, scale, opacity }) {
  const spriteTexture = createGlowTexture(color);
  const material = new THREE.SpriteMaterial({
    map: spriteTexture,
    color: 0xffffff,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(scale, scale, 1);
  return sprite;
}

function createGlowTexture(color) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext("2d");
  const center = canvas.width / 2;

  const gradient = context.createRadialGradient(
    center,
    center,
    0,
    center,
    center,
    center
  );
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.22, color);
  gradient.addColorStop(0.58, "rgba(255,255,255,0.18)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function setupStars() {
  // Two star layers moving at different speeds create better depth than a single particle cloud.
  starLayers = [
    createStarLayer({
      count: 4200,
      radiusMin: 50,
      radiusMax: 150,
      size: 0.18,
      opacity: 0.95
    }),
    createStarLayer({
      count: 1900,
      radiusMin: 85,
      radiusMax: 210,
      size: 0.28,
      opacity: 0.62
    }),
    createStarLayer({
      count: 1200,
      radiusMin: 180,
      radiusMax: 380,
      size: 0.48,
      opacity: 0.18
    })
  ];

  starLayers.forEach((layer) => scene.add(layer));
}

function createStarLayer(config) {
  const positions = new Float32Array(config.count * 3);
  const colors = new Float32Array(config.count * 3);

  for (let index = 0; index < config.count; index += 1) {
    const positionOffset = index * 3;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const radius = THREE.MathUtils.lerp(
      config.radiusMin,
      config.radiusMax,
      Math.pow(Math.random(), 0.65)
    );
    const sinPhi = Math.sin(phi);

    positions[positionOffset] = radius * sinPhi * Math.cos(theta);
    positions[positionOffset + 1] = radius * Math.cos(phi);
    positions[positionOffset + 2] = radius * sinPhi * Math.sin(theta);

    const color = new THREE.Color().setHSL(
      0.56 + THREE.MathUtils.randFloatSpread(0.1),
      0.35,
      0.75 + Math.random() * 0.22
    );

    colors[positionOffset] = color.r;
    colors[positionOffset + 1] = color.g;
    colors[positionOffset + 2] = color.b;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    color: 0xffffff,
    size: config.size,
    transparent: true,
    opacity: config.opacity,
    vertexColors: true,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  return new THREE.Points(geometry, material);
}

function setupNebulaSprites() {
  const nebulaConfigs = [
    {
      color: "#2c6fe8",
      position: new THREE.Vector3(58, 26, -120),
      scale: 72,
      opacity: 0.18
    },
    {
      color: "#1ea9c8",
      position: new THREE.Vector3(-96, -22, -142),
      scale: 92,
      opacity: 0.12
    },
    {
      color: "#f2b15a",
      position: new THREE.Vector3(116, -42, -188),
      scale: 110,
      opacity: 0.08
    },
    {
      color: "#0c8fd6",
      position: new THREE.Vector3(-142, 44, -216),
      scale: 140,
      opacity: 0.09
    }
  ];

  nebulaSprites = nebulaConfigs.map((config) => {
    const material = new THREE.SpriteMaterial({
      map: createNebulaTexture(config.color),
      transparent: true,
      opacity: config.opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const sprite = new THREE.Sprite(material);
    sprite.position.copy(config.position);
    sprite.scale.set(config.scale, config.scale * 0.62, 1);
    scene.add(sprite);
    return sprite;
  });
}

function setupIntergalacticLandmarks() {
  intergalacticSprites = INTERGALACTIC_LANDMARK_DEFS.map((definition) => {
    const material = new THREE.SpriteMaterial({
      map: createGalaxyTexture(definition.color),
      transparent: true,
      opacity: definition.opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const sprite = new THREE.Sprite(material);
    sprite.position.copy(definition.position);
    sprite.scale.set(definition.scale, definition.scale * 0.48, 1);
    sprite.material.rotation = definition.rotation;
    scene.add(sprite);
    return sprite;
  });
}

function createGalaxyTexture(color) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const context = canvas.getContext("2d");
  const center = canvas.width / 2;
  const galaxyColor = new THREE.Color(color);

  context.translate(center, center);
  context.rotate(Math.random() * Math.PI);
  context.translate(-center, -center);

  for (let index = 0; index < 26; index += 1) {
    const gradient = context.createRadialGradient(
      center + THREE.MathUtils.randFloatSpread(90),
      center + THREE.MathUtils.randFloatSpread(42),
      0,
      center,
      center,
      120 + index * 18
    );
    const strong = `rgba(${Math.round(galaxyColor.r * 255)}, ${Math.round(
      galaxyColor.g * 255
    )}, ${Math.round(galaxyColor.b * 255)}, ${0.12 - index * 0.003})`;
    gradient.addColorStop(0, strong);
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
  }

  context.setTransform(1, 0, 0, 1, 0, 0);

  for (let index = 0; index < 260; index += 1) {
    context.beginPath();
    context.fillStyle = `rgba(255,255,255,${0.01 + Math.random() * 0.06})`;
    context.arc(
      center + THREE.MathUtils.randFloatSpread(260),
      center + THREE.MathUtils.randFloatSpread(140),
      0.6 + Math.random() * 2.2,
      0,
      Math.PI * 2
    );
    context.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function createNebulaTexture(color) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const context = canvas.getContext("2d");
  const center = canvas.width / 2;
  const nebulaColor = new THREE.Color(color);
  const colorStrong = `rgba(${Math.round(nebulaColor.r * 255)}, ${Math.round(
    nebulaColor.g * 255
  )}, ${Math.round(nebulaColor.b * 255)}, 0.34)`;
  const colorSoft = `rgba(${Math.round(nebulaColor.r * 255)}, ${Math.round(
    nebulaColor.g * 255
  )}, ${Math.round(nebulaColor.b * 255)}, 0.14)`;

  const gradient = context.createRadialGradient(
    center,
    center,
    60,
    center,
    center,
    center
  );
  gradient.addColorStop(0, colorStrong);
  gradient.addColorStop(0.36, colorSoft);
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  for (let index = 0; index < 48; index += 1) {
    context.beginPath();
    context.fillStyle = "rgba(255, 255, 255, 0.025)";
    context.arc(
      center + THREE.MathUtils.randFloatSpread(340),
      center + THREE.MathUtils.randFloatSpread(260),
      30 + Math.random() * 120,
      0,
      Math.PI * 2
    );
    context.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function setupControls() {
  // OrbitControls keeps Earth centered while allowing free rotation and zoom.
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.enablePan = false;
  controls.minDistance = 3.4;
  controls.maxDistance = 220;
  controls.rotateSpeed = 0.6;
  controls.zoomSpeed = 0.8;
  controls.minPolarAngle = 0.05;
  controls.maxPolarAngle = Math.PI - 0.05;
  controls.target.set(0, 0, 0);

  controls.addEventListener("start", cancelCameraTransition);
}

function setupEvents() {
  window.addEventListener("resize", onResize);
  randomButton.addEventListener("click", () => {
    randomizeCamera(false);
  });
  menuButton.addEventListener("click", () => {
    setMenuOpen(!menuOpen);
  });
  document.addEventListener("click", handleOutsideMenuClick);
  document.addEventListener("keydown", handleKeydown);
}

function randomizeCamera(immediate) {
  const viewpointBody = pickRandomViewpointBody();
  moveCameraToBody(viewpointBody, immediate);
}

function moveCameraToBody(viewpointBody, immediate = false) {
  const nextPosition = getCameraPositionFromBody(viewpointBody);

  updateViewpointLabel(viewpointBody.label || viewpointBody.name);
  currentViewpointName = viewpointBody.name;

  if (immediate) {
    camera.position.copy(nextPosition);
    controls.target.copy(EARTH_POSITION);
    controls.update();
    setMenuOpen(false);
    return;
  }

  // Animate between spherical positions so the viewpoint feels like drifting through space.
  triggerTransitionPulse();
  cameraTransition = {
    startTime: performance.now(),
    from: camera.position.clone(),
    to: nextPosition
  };
  setMenuOpen(false);
}

function pickRandomViewpointBody() {
  const eligibleBodies = viewpointBodies.filter(
    (body) => body.viewpointEligible !== false
  );
  const bodyCandidates = eligibleBodies.length > 0 ? eligibleBodies : viewpointBodies;
  const availableBodies = bodyCandidates.filter(
    (body) => body.name !== currentViewpointName
  );
  const bodyPool = availableBodies.length > 0 ? availableBodies : bodyCandidates;
  const selectedBody =
    bodyPool[Math.floor(Math.random() * bodyPool.length)];
  return selectedBody;
}

function getCameraPositionFromBody(body) {
  const toEarth = EARTH_POSITION.clone().sub(body.position).normalize();
  const tangent = new THREE.Vector3().crossVectors(
    toEarth,
    Math.abs(toEarth.y) > 0.94
      ? new THREE.Vector3(1, 0, 0)
      : new THREE.Vector3(0, 1, 0)
  );
  tangent.normalize();

  const localUp = new THREE.Vector3().crossVectors(tangent, toEarth).normalize();
  const offset = toEarth.multiplyScalar(body.radius * 1.45);
  const sideways = tangent.multiplyScalar(
    THREE.MathUtils.randFloatSpread(body.radius * 0.5)
  );
  const vertical = localUp.multiplyScalar(
    THREE.MathUtils.randFloat(-body.radius * 0.12, body.radius * 0.32)
  );

  return body.position.clone().add(offset).add(sideways).add(vertical);
}

function updateViewpointLabel(name) {
  viewpointLabel.textContent = `視角來源：${name}`;
}

function populateSelectorMenu() {
  const groups = [
    {
      title: "遠方系統",
      bodies: viewpointBodies.filter((body) => body.cluster === "distant")
    },
    {
      title: "太陽系",
      bodies: viewpointBodies.filter((body) => body.cluster !== "distant")
    }
  ].filter((group) => group.bodies.length > 0);

  selectorMenu.innerHTML = "";

  groups.forEach((group) => {
    const section = document.createElement("section");
    section.className = "selector-group";

    const title = document.createElement("p");
    title.className = "selector-title";
    title.textContent = group.title;
    section.appendChild(title);

    group.bodies.forEach((body) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "selector-item";
      item.setAttribute("role", "menuitem");
      item.innerHTML = `${body.label || body.name}<small>${buildBodyMeta(body)}</small>`;
      item.addEventListener("click", () => {
        moveCameraToBody(body, false);
      });
      section.appendChild(item);
    });

    selectorMenu.appendChild(section);
  });
}

function buildBodyMeta(body) {
  if (body.hostStar) {
    return `主星：${body.hostStar.name}`;
  }

  if (body.viewpointEligible === false) {
    return "僅場景展示";
  }

  return "可直接跳轉";
}

function setMenuOpen(nextState) {
  menuOpen = nextState;
  selectorMenu.classList.toggle("is-open", menuOpen);
  menuButton.setAttribute("aria-expanded", String(menuOpen));
}

function handleOutsideMenuClick(event) {
  if (!menuOpen) {
    return;
  }

  const clickedInsideMenu = selectorMenu.contains(event.target);
  const clickedMenuButton = menuButton.contains(event.target);

  if (!clickedInsideMenu && !clickedMenuButton) {
    setMenuOpen(false);
  }
}

function handleKeydown(event) {
  if (event.key === "Escape" && menuOpen) {
    setMenuOpen(false);
    menuButton.focus();
  }
}

function updateCameraTransition(now) {
  if (!cameraTransition) {
    return;
  }

  const progress = Math.min(
    (now - cameraTransition.startTime) / TRANSITION_DURATION,
    1
  );
  const easedProgress = easeInOutCubic(progress);

  camera.position.lerpVectors(
    cameraTransition.from,
    cameraTransition.to,
    easedProgress
  );
  controls.target.copy(EARTH_POSITION);

  if (progress >= 1) {
    cameraTransition = null;
  }
}

function cancelCameraTransition() {
  cameraTransition = null;
}

function easeInOutCubic(value) {
  return value < 0.5
    ? 4 * value * value * value
    : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

async function loadEarthTextures() {
  // Pull in real Earth maps so the sphere reads immediately as a planet, not just a blue globe.
  const [colorTexture, specularTexture, cloudTexture] =
    await Promise.allSettled([
      loadTexture("./assets/earth_atmos_2048.jpg"),
      loadTexture("./assets/earth_specular_2048.jpg"),
      loadTexture("./assets/earth_clouds_1024.png")
    ]);

  if (colorTexture.status === "fulfilled") {
    colorTexture.value.colorSpace = THREE.SRGBColorSpace;
    earthMesh.material.map = colorTexture.value;
  }

  if (specularTexture.status === "fulfilled") {
    earthMesh.material.specularMap = specularTexture.value;
  }

  earthMesh.material.needsUpdate = true;

  if (cloudTexture.status === "fulfilled") {
    cloudTexture.value.colorSpace = THREE.SRGBColorSpace;
    cloudMesh.material.map = cloudTexture.value;
    cloudMesh.material.opacity = 0.26;
    cloudMesh.material.needsUpdate = true;
  }

  if (
    colorTexture.status === "fulfilled" ||
    specularTexture.status === "fulfilled"
  ) {
    hideLoadingLabel("地球材質載入完成");
  } else {
    hideLoadingLabel("材質載入失敗，已使用備援地球材質");
  }
}

function loadTexture(url) {
  return new Promise((resolve, reject) => {
    textureLoader.load(url, resolve, undefined, reject);
  });
}

function hideLoadingLabel(message) {
  loadingLabel.textContent = message;

  window.setTimeout(() => {
    loadingLabel.classList.add("is-hidden");
  }, 600);
}

function showStatus(message) {
  loadingLabel.textContent = message;
  loadingLabel.classList.remove("is-hidden");
}

function triggerTransitionPulse() {
  transitionPulse.classList.remove("is-animating");
  void transitionPulse.offsetWidth;
  transitionPulse.classList.add("is-animating");
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate(now = performance.now()) {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  const elapsed = clock.elapsedTime;

  updateCameraTransition(now);

  // Keep Earth slowly rotating so the scene feels alive.
  earthMesh.rotation.y += delta * 0.085;
  cloudMesh.rotation.y += delta * 0.1;
  atmosphereMesh.rotation.y += delta * 0.02;
  sunMesh.rotation.y += delta * 0.024;
  sunGroup.rotation.z += delta * 0.01;

  if (sunGlowSprites[0]) {
    sunGlowSprites[0].material.opacity = 0.58 + Math.sin(elapsed * 1.1) * 0.06;
  }

  if (sunGlowSprites[1]) {
    sunGlowSprites[1].material.opacity = 0.2 + Math.cos(elapsed * 0.7) * 0.04;
  }

  // Drift the starfield at slightly different speeds for extra depth.
  if (starLayers[0]) {
    starLayers[0].rotation.y += delta * 0.0025;
    starLayers[0].rotation.x = Math.sin(elapsed * 0.07) * 0.06;
  }

  if (starLayers[1]) {
    starLayers[1].rotation.y -= delta * 0.0012;
    starLayers[1].rotation.z = Math.cos(elapsed * 0.05) * 0.05;
  }

  if (starLayers[2]) {
    starLayers[2].rotation.y += delta * 0.0006;
    starLayers[2].rotation.x = Math.cos(elapsed * 0.03) * 0.08;
  }

  viewpointBodies.forEach((body, index) => {
    body.mesh.rotation.y += delta * body.rotationSpeed;
    body.mesh.rotation.x = Math.sin(elapsed * 0.18 + index) * 0.04;

    if (body.ring) {
      body.ring.rotation.z += delta * 0.02;
    }
  });

  nebulaSprites.forEach((sprite, index) => {
    sprite.material.opacity += Math.sin(elapsed * 0.18 + index) * 0.0005;
  });

  intergalacticSprites.forEach((sprite, index) => {
    sprite.material.rotation += delta * (0.002 + index * 0.0005);
    sprite.material.opacity += Math.sin(elapsed * 0.08 + index) * 0.00025;
  });

  controls.update();
  renderer.render(scene, camera);
}
