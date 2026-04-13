import * as THREE from "./vendor/three.module.js";
import { OrbitControls } from "./vendor/OrbitControls.module.js";

const sceneMount = document.getElementById("scene");
const randomButton = document.getElementById("randomButton");
const menuButton = document.getElementById("menuButton");
const loadingLabel = document.getElementById("loadingLabel");
const transitionPulse = document.getElementById("transitionPulse");
const viewpointLabel = document.getElementById("viewpointLabel");
const selectorMenu = document.getElementById("selectorMenu");
const hudLabel = document.getElementById("hudLabel");
const hudDesc = document.getElementById("hudDesc");
const hudInfo = document.getElementById("hudInfo");
const hudComposition = document.getElementById("hudComposition");
const hudGravity = document.getElementById("hudGravity");
const hudTimeConversion = document.getElementById("hudTimeConversion");
const hudFact = document.getElementById("hudFact");

// Scale: 1 AU ≈ 45 scene-units. Outer planets use √AU compression so they fit in view.
const EARTH_RADIUS = 1.6;
const EARTH_POSITION = new THREE.Vector3(0, 0, 0);
const SUN_POSITION = new THREE.Vector3(-34, 14, -26);
const SUN_RADIUS = 5.4;
const TRANSITION_DURATION = 2200;
const EARTH_DAY_MS = 24 * 60 * 60 * 1000;

// Ecliptic basis vectors (Sun→Earth direction & perpendicular in orbital plane)
const _sunToEarth = new THREE.Vector3(34, -14, 26).normalize();
const _eclipticPerp = new THREE.Vector3().crossVectors(_sunToEarth, new THREE.Vector3(0, 1, 0)).normalize();

function orbitalPosition(auFromSun, angleDeg) {
  // Compress distances: inner planets linear, outer planets √AU
  const d = auFromSun <= 2 ? auFromSun * 45 : 45 * 2 + 45 * (Math.sqrt(auFromSun) - Math.sqrt(2)) * 1.8;
  const rad = (angleDeg * Math.PI) / 180;
  const dir = _sunToEarth.clone().multiplyScalar(Math.cos(rad))
    .add(_eclipticPerp.clone().multiplyScalar(Math.sin(rad)));
  return SUN_POSITION.clone().add(dir.multiplyScalar(d));
}

// Planet encyclopedia — shown in HUD when a body is selected.
const BODY_INFO_ALIASES = {
  Earth: "地球",
  Moon: "月球",
  Mercury: "水星",
  Venus: "金星",
  Mars: "火星",
  Jupiter: "木星",
  Saturn: "土星",
  Uranus: "天王星",
  Neptune: "海王星",
  Pluto: "冥王星",
  Ceres: "穀神星",
  Io: "木衛一",
  Europa: "木衛二",
  Ganymede: "木衛三",
  Callisto: "木衛四",
  Titan: "土衛六",
  Enceladus: "土衛二",
  Triton: "海衛一",
  Eris: "鬩神星",
  Haumea: "妊神星",
  Makemake: "鳥神星"
};

const CURATED_BODY_INFO = {
  "太陽": {
    type: "G2V 主序星",
    summary: "太陽系的中心恆星，主導所有行星的光照、熱量與公轉節奏。",
    composition: "氫 (~73%)、氦 (~25%)",
    gravity: "約 27.9 g（274 m/s²）",
    dayHours: 609.12,
    fact: "太陽核心溫度約 1,500 萬°C，靠核融合持續把氫轉成氦。"
  },
  "水星": {
    type: "岩石行星",
    summary: "最靠近太陽的岩石行星，幾乎沒有真正的大氣保護表面。",
    composition: "鐵核 (~70%)、矽酸鹽地殼",
    gravity: "約 0.38 g（3.7 m/s²）",
    dayHours: 1407.6,
    fact: "水星晝夜溫差可超過 600°C，表面佈滿古老撞擊坑。"
  },
  "金星": {
    type: "岩石行星",
    summary: "被濃厚雲層包住的高溫行星，是太陽系最強烈的溫室世界。",
    composition: "鐵核、矽酸鹽地殼",
    gravity: "約 0.90 g（8.87 m/s²）",
    dayHours: 5832.5,
    fact: "金星是逆行自轉，表面平均溫度約 465°C，比水星還熱。"
  },
  "地球": {
    type: "岩石行星",
    summary: "我們熟悉的海洋行星，也是目前已知唯一孕育生命的世界。",
    composition: "鐵鎳核心、矽酸鹽地函與地殼",
    gravity: "1.00 g（9.81 m/s²）",
    dayHours: 24,
    fact: "地球磁場會偏轉太陽風，幫助大氣與生命環境維持穩定。"
  },
  "月球": {
    type: "岩石衛星",
    summary: "地球唯一的天然衛星，主導潮汐並穩定地軸傾角。",
    composition: "矽酸鹽地殼、小型鐵核",
    gravity: "約 0.17 g（1.62 m/s²）",
    dayHours: 708.7,
    fact: "月球已被潮汐鎖定，所以從地球看過去幾乎永遠是同一面。"
  },
  "火星": {
    type: "岩石行星",
    summary: "帶著鐵鏽色表面的寒冷行星，是人類最常討論的移居候選之一。",
    composition: "鐵核、矽酸鹽地殼、氧化鐵表面",
    gravity: "約 0.38 g（3.71 m/s²）",
    dayHours: 24.6,
    fact: "奧林帕斯山高約 21.9 公里，是太陽系已知最高的火山。"
  },
  "木星": {
    type: "氣態巨行星",
    summary: "太陽系最大的行星，以厚重氣體外層與強磁場主宰外太陽系。",
    composition: "氫（~90%）、氦（~10%）、可能的岩石核心",
    gravity: "約 2.53 g（24.79 m/s²）",
    dayHours: 9.93,
    fact: "木星大紅斑是一個至少持續數百年的超大型反氣旋風暴。"
  },
  "土星": {
    type: "氣態巨行星",
    summary: "被巨大環系統包圍的氣態巨行星，也是望遠鏡裡最具辨識度的天體之一。",
    composition: "氫（~96%）、氦（~3%）、冰與岩石核",
    gravity: "約 1.07 g（10.44 m/s²）",
    dayHours: 10.7,
    fact: "土星主環大多由冰粒組成，密度低到理論上能浮在水上。"
  },
  "天王星": {
    type: "冰巨行星",
    summary: "一顆幾乎橫躺著繞太陽運行的冰巨行星，季節變化極端。",
    composition: "水冰、氨冰、甲烷冰、小型岩石核",
    gravity: "約 0.89 g（8.69 m/s²）",
    dayHours: 17.2,
    fact: "天王星自轉軸傾斜約 98°，等於幾乎側躺著公轉。"
  },
  "海王星": {
    type: "冰巨行星",
    summary: "深藍色的外太陽系巨行星，以超強風暴和高速大氣聞名。",
    composition: "水冰、氨冰、甲烷冰、岩石核",
    gravity: "約 1.14 g（11.15 m/s²）",
    dayHours: 16.1,
    fact: "海王星風速可高達約 2,100 km/h，是太陽系最強勁的大氣之一。"
  },
  "冥王星": {
    type: "矮行星",
    summary: "位在古柏帶的冰岩世界，表面有氮冰與甲烷冰平原。",
    composition: "冰凍氮、甲烷、一氧化碳與岩石內部",
    gravity: "約 0.06 g（0.62 m/s²）",
    dayHours: 153.3,
    fact: "冥王星與最大衛星冥衛一彼此潮汐鎖定，像雙星系統般共舞。"
  },
  "穀神星": {
    type: "矮行星",
    summary: "小行星帶中最大的天體，也是最早被發現的矮行星。",
    composition: "富含水合礦物的岩石與冰",
    gravity: "約 0.03 g（0.27 m/s²）",
    dayHours: 9.07,
    fact: "穀神星的亮斑來自含鹽沉積物，顯示它曾有地下含鹽液體活動。"
  },
  "木衛一": {
    type: "火山衛星",
    summary: "木星最靠近的大型衛星，也是太陽系火山活動最劇烈的天體。",
    composition: "矽酸鹽岩石與硫化物，內部富含熔融物質",
    gravity: "約 0.18 g（1.80 m/s²）",
    dayHours: 42.5,
    fact: "木星與鄰近衛星的潮汐拉扯，讓木衛一內部持續被加熱。"
  },
  "木衛二": {
    type: "冰殼衛星",
    summary: "表面覆蓋冰殼的衛星，下方可能藏著全球性液態海洋。",
    composition: "水冰外殼、岩石地函、金屬核心",
    gravity: "約 0.13 g（1.31 m/s²）",
    dayHours: 85.2,
    fact: "木衛二是太陽系尋找外星生命最熱門的目標之一。"
  },
  "木衛三": {
    type: "大型衛星",
    summary: "太陽系最大的衛星，比水星還大，內部可能有多層地下海洋。",
    composition: "水冰、矽酸鹽岩石、金屬核心",
    gravity: "約 0.15 g（1.43 m/s²）",
    dayHours: 171.7,
    fact: "木衛三是目前唯一已知本身具有磁場的衛星。"
  },
  "木衛四": {
    type: "大型衛星",
    summary: "外觀佈滿古老撞擊坑的冰岩衛星，地質活動較少。",
    composition: "冰與岩石的混合體",
    gravity: "約 0.13 g（1.24 m/s²）",
    dayHours: 400.5,
    fact: "木衛四表面年代非常古老，是研究早期太陽系撞擊史的重要對象。"
  },
  "土衛六": {
    type: "厚大氣衛星",
    summary: "擁有濃密氮大氣與甲烷天氣循環的冰凍世界。",
    composition: "水冰、岩石內核、甲烷與有機分子",
    gravity: "約 0.14 g（1.35 m/s²）",
    dayHours: 382.7,
    fact: "土衛六表面有液態甲烷與乙烷湖泊，是非常特殊的天體。"
  },
  "土衛二": {
    type: "冰噴泉衛星",
    summary: "小型冰衛星，南極裂縫會噴出含水蒸氣與冰粒的羽流。",
    composition: "水冰外殼、岩石核心、地下海洋",
    gravity: "約 0.01 g（0.11 m/s²）",
    dayHours: 32.9,
    fact: "卡西尼號在土衛二噴流中發現複雜有機分子與鹽分痕跡。"
  },
  "海衛一": {
    type: "逆行衛星",
    summary: "海王星最大的衛星，可能原本是被捕獲的古柏帶天體。",
    composition: "水冰、氮冰與岩石",
    gravity: "約 0.08 g（0.78 m/s²）",
    dayHours: 141.1,
    fact: "海衛一繞海王星逆行公轉，是被捕獲天體的重要證據。"
  },
  "鬩神星": {
    type: "矮行星",
    summary: "遠在散射盤中的矮行星，大小與冥王星相近但質量更大。",
    composition: "冰與岩石混合，表面覆蓋甲烷冰",
    gravity: "約 0.08 g（0.82 m/s²）",
    dayHours: 25.9,
    fact: "鬩神星的發現直接促成國際天文學聯合會重新定義「行星」。"
  },
  "妊神星": {
    type: "矮行星",
    summary: "快速自轉的橢球形矮行星，密度高且外型非常扁。",
    composition: "岩石核心與表面水冰",
    gravity: "約 0.04 g（0.44 m/s²）",
    dayHours: 3.9,
    fact: "妊神星自轉只要幾小時，這也是它被拉成橢圓形的主因。"
  },
  "鳥神星": {
    type: "矮行星",
    summary: "古柏帶中的亮紅色冰凍世界，表面可能覆蓋甲烷與乙烷。",
    composition: "冰與岩石混合，表層富含甲烷冰",
    gravity: "約 0.05 g（0.50 m/s²）",
    dayHours: 22.8,
    fact: "鳥神星表面極為明亮，反照率高，代表冰面相當新鮮。"
  },
  "Adrian": {
    type: "系外行星（假想宜居帶）",
    summary: "以《Project Hail Mary》氣質為靈感的遠方世界，設計成帶有宜居帶想像感。",
    composition: "推測：矽酸鹽地殼、鐵核",
    gravity: "推測接近地球，仍屬場景設定值",
    dayHours: 36,
    fact: "Adrian 依附於天倉五想像系統，讓場景視角可以延伸到近鄰恆星。"
  },
  "Erid": {
    type: "系外行星（假想宜居帶）",
    summary: "圍繞波江座 40A 氛圍打造的想像行星，帶著橙矮星系的色調。",
    composition: "推測：矽酸鹽岩石",
    gravity: "推測略低於地球，仍屬場景設定值",
    dayHours: 42,
    fact: "Erid 對應 40 Eridani A 的想像宜居帶，帶來與太陽系不同的光色氛圍。"
  }
};

const HOT_JUPITER_NAMES = new Set([
  "51 Pegasi b",
  "Tau Boötis b",
  "HD 209458 b",
  "HD 189733 b",
  "HD 149026 b",
  "WASP-12 b",
  "WASP-17 b",
  "WASP-18 b",
  "WASP-39 b",
  "WASP-43 b",
  "WASP-76 b",
  "WASP-107 b",
  "WASP-121 b",
  "HAT-P-11 b",
  "HAT-P-26 b"
]);

const TEMPERATE_EXOPLANET_NAMES = new Set([
  "Kepler-22 b",
  "Kepler-62 e",
  "Kepler-62 f",
  "Kepler-69 c",
  "Kepler-186 f",
  "Kepler-438 b",
  "Kepler-442 b",
  "Kepler-452 b",
  "Proxima Centauri b",
  "LHS 1140 b",
  "LHS 1140 c",
  "TOI-700 d",
  "TOI-700 e",
  "Kepler-1649 c"
]);

const DIRECT_IMAGE_GIANT_NAMES = new Set([
  "HR 8799 b",
  "HR 8799 c",
  "HR 8799 d",
  "HR 8799 e",
  "Beta Pictoris b",
  "Beta Pictoris c",
  "PDS 70 b",
  "PDS 70 c",
  "HIP 65426 b"
]);

function getBodyInfo(name) {
  const canonicalName = BODY_INFO_ALIASES[name] || name;
  return CURATED_BODY_INFO[canonicalName] || buildFallbackBodyInfo(name);
}

function buildFallbackBodyInfo(name) {
  if (name.startsWith("PSR B1257+12")) {
    return {
      type: "脈衝星行星",
      summary: "環繞脈衝星的極端系外行星，環境條件和太陽系截然不同。",
      composition: "可能為岩質或金屬含量較高的殘存行星核心",
      gravity: "觀測資料有限，仍在研究中",
      dayHours: null,
      fact: "PSR B1257+12 系統是人類最早確認的一批系外行星之一。"
    };
  }

  if (name.startsWith("TRAPPIST-1")) {
    return {
      type: "系外岩質行星",
      summary: "TRAPPIST-1 紅矮星系的成員，常被拿來討論多行星宜居帶。",
      composition: "多半為岩質主體，可能帶有冰、水或稀薄大氣",
      gravity: "可能接近或略高於地球，精確值仍待觀測",
      dayHours: null,
      fact: "TRAPPIST-1 一口氣擁有多顆大小接近地球的行星，是非常少見的緊密系統。"
    };
  }

  if (HOT_JUPITER_NAMES.has(name)) {
    return {
      type: "熱木星",
      summary: "靠近母恆星公轉的高溫氣態巨行星，常有極端大氣流動。",
      composition: "以氫、氦為主，外層可能含鈉、矽酸鹽蒸氣與高溫雲層",
      gravity: "通常高於地球，但精確表面條件難以直接定義",
      dayHours: null,
      fact: "熱木星常是最早被偵測到的系外行星類型，因為它們對母星影響很明顯。"
    };
  }

  if (DIRECT_IMAGE_GIANT_NAMES.has(name)) {
    return {
      type: "直接成像巨行星",
      summary: "年輕而明亮的巨行星，能以直接成像方式被望遠鏡看到。",
      composition: "以氫、氦為主，可能仍保留形成時的高熱量",
      gravity: "通常遠高於地球，仍需搭配模型估算",
      dayHours: null,
      fact: "能被直接拍到的系外行星很少，通常代表它們又大、又熱、離母星也夠遠。"
    };
  }

  if (TEMPERATE_EXOPLANET_NAMES.has(name)) {
    return {
      type: "候選宜居帶行星",
      summary: "位於母星宜居帶附近的候選世界，常被拿來比較是否可能保存液態水。",
      composition: "可能是岩質超級地球，也可能帶有較厚揮發物外層",
      gravity: "可能接近或高於地球，仍依半徑與質量模型推估",
      dayHours: null,
      fact: "這類天體最吸引人的地方，是它們可能兼具合適溫度與可長期存在的大氣。"
    };
  }

  if (name.startsWith("Kepler-11")) {
    return {
      type: "緊密多行星系外行星",
      summary: "Kepler-11 是極度緊密的多行星系統，幾顆行星一起擠在母星附近。",
      composition: "可能帶有輕質氣體外層與岩質核心",
      gravity: "依各行星大小而異，詳細數值仍在建模中",
      dayHours: null,
      fact: "Kepler-11 系統顯示行星可以像套娃一樣緊密排成多層軌道。"
    };
  }

  if (name.startsWith("Kepler-444")) {
    return {
      type: "古老系外行星",
      summary: "圍繞非常古老恆星的行星，代表銀河系早期就能形成小型行星。",
      composition: "推測為偏岩質的小型行星",
      gravity: "觀測資料有限，通常以半徑與質量模型推估",
      dayHours: null,
      fact: "Kepler-444 系統年齡非常高，讓我們知道宇宙很早就有行星誕生。"
    };
  }

  return {
    type: "系外行星",
    summary: "遙遠恆星系統中的行星，目前多靠凌日或徑向速度法推測性質。",
    composition: "已知資訊有限，可能是岩質、冰質或氣態結構",
    gravity: "尚缺足夠資料，通常需依質量與半徑模型估算",
    dayHours: null,
    fact: "不少系外行星目前只知道半徑、軌道或質量範圍，細節還在持續更新。"
  };
}

function formatEarthClock(now) {
  return new Intl.DateTimeFormat("zh-TW", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(now);
}

function formatPlanetDayLength(dayHours) {
  if (!Number.isFinite(dayHours)) {
    return null;
  }

  if (dayHours >= 48) {
    return `${(dayHours / 24).toLocaleString("zh-TW", {
      maximumFractionDigits: 1
    })} 地球日`;
  }

  return `${dayHours.toLocaleString("zh-TW", {
    maximumFractionDigits: 1
  })} 地球小時`;
}

function buildTimeConversionText(bodyName, info) {
  const now = new Date();
  const earthTimeText = formatEarthClock(now);

  if (!Number.isFinite(info.dayHours) || info.dayHours <= 0) {
    return `地球 ${earthTimeText} -> ${bodyName} 自轉資料不足，暫時無法可靠換算`;
  }

  const planetDayMs = info.dayHours * 3600000;
  const elapsedInPlanetDayMs = ((now.getTime() % planetDayMs) + planetDayMs) % planetDayMs;
  const normalizedClockMinutes =
    (elapsedInPlanetDayMs / planetDayMs) * 24 * 60;
  const localHour = Math.floor(normalizedClockMinutes / 60) % 24;
  const localMinute = Math.floor(normalizedClockMinutes % 60);
  const localSecond = Math.floor(((normalizedClockMinutes % 1) * 60)) % 60;
  const localTimeText = [
    String(localHour).padStart(2, "0"),
    String(localMinute).padStart(2, "0"),
    String(localSecond).padStart(2, "0")
  ].join(":");
  const dayLengthText = formatPlanetDayLength(info.dayHours);

  return `地球 ${earthTimeText} -> ${bodyName} ${localTimeText}（當地 1 日約 ${dayLengthText}）`;
}
const LEGACY_VIEWPOINT_BODY_DEFS = [
  {
    name: "Adrian",
    label: "Adrian · 天倉五",
    radius: 1.08,
    position: new THREE.Vector3(160, -30, -220),
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
    position: new THREE.Vector3(-180, 36, -260),
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
    radius: 0.62,
    position: orbitalPosition(0.39, 70),
    textureType: "mercury",
    rotationSpeed: 0.002
  },
  {
    name: "月球",
    radius: 0.44,
    position: new THREE.Vector3(4, 0.5, -1.2),
    textureType: "moon",
    rotationSpeed: 0.015
  },
  {
    name: "金星",
    radius: 1.52,
    position: orbitalPosition(0.72, -40),
    textureType: "venus",
    rotationSpeed: 0.0006
  },
  {
    name: "火星",
    radius: 0.86,
    position: orbitalPosition(1.52, 130),
    textureType: "mars",
    rotationSpeed: 0.014
  },
  {
    name: "木星",
    radius: 4.2,
    position: orbitalPosition(5.2, 200),
    textureType: "jupiter",
    rotationSpeed: 0.032
  },
  {
    name: "土星",
    radius: 3.6,
    position: orbitalPosition(9.54, 310),
    textureType: "saturn",
    rotationSpeed: 0.028,
    viewpointEligible: false,
    ring: {
      innerRadius: 4.8,
      outerRadius: 7.6,
      tiltX: -1.08,
      tiltY: 0.24
    }
  },
  {
    name: "海王星",
    radius: 2.3,
    position: orbitalPosition(30.07, 250),
    textureType: "neptune",
    rotationSpeed: 0.018
  },
  {
    name: "天王星",
    radius: 2.4,
    position: orbitalPosition(19.2, 160),
    textureType: "uranus",
    rotationSpeed: 0.016,
    viewpointEligible: false,
    ring: {
      innerRadius: 3.2,
      outerRadius: 4.2,
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
  const radiusBand = 80 + shell * 18 + (index % 3) * 3.5;
  const y = ((index % 9) - 4) * 4.5 + Math.sin(angle * 1.7) * 3;
  const position = new THREE.Vector3(
    Math.cos(angle) * radiusBand,
    y,
    Math.sin(angle) * (radiusBand + 6)
  );

  const baseRadius = name.includes("Jupiter")
    ? 3.8
    : name.includes("Saturn")
      ? 3.2
      : name === "Neptune" || name === "Uranus"
        ? 2.1
        : name === "Earth"
          ? 1.6
          : name === "Venus"
            ? 1.5
            : name === "Mars"
              ? 0.86
              : name === "Moon"
                ? 0.44
                : name === "Mercury"
                  ? 0.62
                  : name === "Pluto" || name === "Ceres" || name === "Eris" || name === "Haumea" || name === "Makemake"
                    ? 0.38
                    : name.includes("Titan")
                      ? 0.82
                      : name.includes("Ganymede") || name.includes("Callisto")
                        ? 0.84
                        : name.includes("Europa") || name.includes("Io") || name.includes("Triton") || name.includes("Enceladus")
                          ? 0.5
                          : 0.7;

  return {
    name,
    label: `${index + 1}. ${name}`,
    radius: baseRadius + (index % 5) * 0.02,
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
let currentHudBody = null;
let lastHudRefreshAt = 0;
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
  scene.fog = new THREE.FogExp2(0x02040a, 0.0014);

  camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    1200
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

  const solarBloom = new THREE.PointLight(0xfff1b1, 5.4, 400, 1.4);
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
      paintMercuryTexture(context, width, height);
      break;
    case "venus":
      paintVenusTexture(context, width, height);
      break;
    case "mars":
      paintMarsTexture(context, width, height);
      break;
    case "jupiter":
      paintJupiterTexture(context, width, height);
      break;
    case "saturn":
      paintSaturnTexture(context, width, height);
      break;
    case "neptune":
      paintNeptuneTexture(context, width, height);
      break;
    case "uranus":
      paintUranusTexture(context, width, height);
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

function seededRandom(seed) {
  let s = seed;
  return function () {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function paintMoonTexture(context, width, height, palette = {}) {
  const base = palette.base || "#a7aeb9";
  context.fillStyle = base;
  context.fillRect(0, 0, width, height);

  // Dark maria (large dark basalt regions)
  const mariaColor = palette.maria || "rgba(80, 85, 95, 0.35)";
  const rand = seededRandom(42);
  for (let i = 0; i < 12; i++) {
    const cx = rand() * width;
    const cy = rand() * height;
    const rx = 40 + rand() * 120;
    const ry = 30 + rand() * 80;
    const gradient = context.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry));
    gradient.addColorStop(0, mariaColor);
    gradient.addColorStop(0.7, mariaColor);
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    context.fillStyle = gradient;
    context.beginPath();
    context.ellipse(cx, cy, rx, ry, rand() * Math.PI, 0, Math.PI * 2);
    context.fill();
  }

  // Large craters with shadow/highlight
  for (let i = 0; i < 60; i++) {
    const radius = 8 + rand() * 32;
    const x = rand() * width;
    const y = rand() * height;
    const depth = 0.06 + rand() * 0.14;

    // Crater shadow (dark left/bottom)
    context.beginPath();
    context.fillStyle = palette.dark || `rgba(50, 55, 65, ${depth})`;
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();

    // Inner floor (slightly different shade)
    context.beginPath();
    context.fillStyle = `rgba(120, 125, 135, ${depth * 0.5})`;
    context.arc(x, y, radius * 0.7, 0, Math.PI * 2);
    context.fill();

    // Rim highlight (bright right/top edge)
    context.beginPath();
    context.strokeStyle = palette.light || `rgba(200, 205, 215, ${depth * 0.8})`;
    context.lineWidth = 1.2 + rand() * 1.5;
    context.arc(x + radius * 0.15, y - radius * 0.15, radius * 0.85, -0.8, 1.8);
    context.stroke();
  }

  // Small micro-craters
  for (let i = 0; i < 300; i++) {
    const r = 1 + rand() * 5;
    const x = rand() * width;
    const y = rand() * height;
    context.beginPath();
    context.fillStyle = `rgba(70, 75, 85, ${0.05 + rand() * 0.1})`;
    context.arc(x, y, r, 0, Math.PI * 2);
    context.fill();
  }

  // Subtle surface noise
  const imageData = context.getImageData(0, 0, width, height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (rand() - 0.5) * 14;
    data[i] += noise;
    data[i + 1] += noise;
    data[i + 2] += noise;
  }
  context.putImageData(imageData, 0, 0);
}

function paintMercuryTexture(context, width, height) {
  // Mercury: heavily cratered, gray, no atmosphere
  context.fillStyle = "#8a8580";
  context.fillRect(0, 0, width, height);

  const rand = seededRandom(101);

  // Subtle terrain variation with overlapping gradients
  for (let i = 0; i < 20; i++) {
    const cx = rand() * width;
    const cy = rand() * height;
    const r = 60 + rand() * 160;
    const gradient = context.createRadialGradient(cx, cy, 0, cx, cy, r);
    const shade = Math.round(110 + rand() * 40);
    gradient.addColorStop(0, `rgba(${shade}, ${shade - 5}, ${shade - 8}, 0.25)`);
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
  }

  // Dense craters of various sizes
  for (let i = 0; i < 120; i++) {
    const radius = 4 + rand() * 40;
    const x = rand() * width;
    const y = rand() * height;
    const depth = 0.08 + rand() * 0.18;

    context.beginPath();
    context.fillStyle = `rgba(60, 58, 56, ${depth})`;
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();

    context.beginPath();
    context.fillStyle = `rgba(100, 96, 92, ${depth * 0.4})`;
    context.arc(x, y, radius * 0.6, 0, Math.PI * 2);
    context.fill();

    context.beginPath();
    context.strokeStyle = `rgba(180, 175, 168, ${depth * 0.6})`;
    context.lineWidth = 1 + rand() * 1.5;
    context.arc(x + radius * 0.1, y - radius * 0.1, radius * 0.9, -0.6, 2.0);
    context.stroke();
  }

  // Micro craters
  for (let i = 0; i < 400; i++) {
    const r = 0.8 + rand() * 3;
    context.beginPath();
    context.fillStyle = `rgba(55, 52, 50, ${0.06 + rand() * 0.12})`;
    context.arc(rand() * width, rand() * height, r, 0, Math.PI * 2);
    context.fill();
  }

  // Surface noise
  const imageData = context.getImageData(0, 0, width, height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (rand() - 0.5) * 12;
    data[i] += noise;
    data[i + 1] += noise;
    data[i + 2] += noise;
  }
  context.putImageData(imageData, 0, 0);
}

function paintVenusTexture(context, width, height) {
  // Venus: thick yellow-orange atmosphere with swirling cloud bands
  const gradient = context.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#e8c87a");
  gradient.addColorStop(0.3, "#d4a85e");
  gradient.addColorStop(0.5, "#dbb570");
  gradient.addColorStop(0.7, "#c89848");
  gradient.addColorStop(1, "#e0be6c");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  const rand = seededRandom(200);

  // Broad atmospheric bands
  for (let i = 0; i < 30; i++) {
    const bandY = (i / 30) * height + rand() * 20 - 10;
    const bandH = 12 + rand() * 30;
    const shade = 180 + rand() * 50;
    context.fillStyle = `rgba(${shade}, ${shade - 30}, ${shade - 80}, ${0.12 + rand() * 0.2})`;
    context.fillRect(0, bandY, width, bandH);
  }

  // Swirling cloud vortices
  for (let i = 0; i < 40; i++) {
    const cx = rand() * width;
    const cy = rand() * height;
    const size = 20 + rand() * 80;
    context.save();
    context.translate(cx, cy);
    context.rotate(rand() * Math.PI * 2);
    const vGrad = context.createRadialGradient(0, 0, 0, 0, 0, size);
    vGrad.addColorStop(0, `rgba(230, 210, 150, ${0.08 + rand() * 0.12})`);
    vGrad.addColorStop(0.5, `rgba(210, 180, 100, ${0.04 + rand() * 0.08})`);
    vGrad.addColorStop(1, "rgba(0,0,0,0)");
    context.fillStyle = vGrad;
    context.beginPath();
    context.ellipse(0, 0, size, size * 0.3, 0, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  // Soft global haze
  const haze = context.createLinearGradient(0, 0, width, 0);
  haze.addColorStop(0, "rgba(255, 240, 200, 0.08)");
  haze.addColorStop(0.5, "rgba(255, 255, 255, 0)");
  haze.addColorStop(1, "rgba(200, 170, 100, 0.1)");
  context.fillStyle = haze;
  context.fillRect(0, 0, width, height);
}

function paintMarsTexture(context, width, height) {
  // Mars: rusty red-orange with darker regions, polar ice caps
  context.fillStyle = "#b5593a";
  context.fillRect(0, 0, width, height);

  const rand = seededRandom(300);

  // Large terrain regions (darker highlands / lighter plains)
  for (let i = 0; i < 18; i++) {
    const cx = rand() * width;
    const cy = height * 0.15 + rand() * height * 0.7;
    const rx = 60 + rand() * 180;
    const ry = 40 + rand() * 100;
    const dark = rand() > 0.5;
    const gradient = context.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry));
    if (dark) {
      gradient.addColorStop(0, `rgba(80, 40, 25, ${0.2 + rand() * 0.25})`);
    } else {
      gradient.addColorStop(0, `rgba(200, 130, 80, ${0.15 + rand() * 0.2})`);
    }
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    context.fillStyle = gradient;
    context.beginPath();
    context.ellipse(cx, cy, rx, ry, rand() * Math.PI, 0, Math.PI * 2);
    context.fill();
  }

  // Valles Marineris-like dark scar
  context.save();
  context.strokeStyle = "rgba(90, 45, 28, 0.3)";
  context.lineWidth = 6;
  context.beginPath();
  context.moveTo(width * 0.2, height * 0.48);
  context.bezierCurveTo(width * 0.4, height * 0.5, width * 0.6, height * 0.46, width * 0.75, height * 0.5);
  context.stroke();
  context.restore();

  // Olympus Mons (large circular feature)
  const omGrad = context.createRadialGradient(width * 0.3, height * 0.35, 0, width * 0.3, height * 0.35, 50);
  omGrad.addColorStop(0, "rgba(170, 100, 60, 0.3)");
  omGrad.addColorStop(0.6, "rgba(150, 80, 50, 0.15)");
  omGrad.addColorStop(1, "rgba(0,0,0,0)");
  context.fillStyle = omGrad;
  context.beginPath();
  context.arc(width * 0.3, height * 0.35, 50, 0, Math.PI * 2);
  context.fill();

  // North polar ice cap
  const northPolar = context.createLinearGradient(0, 0, 0, height * 0.12);
  northPolar.addColorStop(0, "rgba(235, 225, 215, 0.8)");
  northPolar.addColorStop(0.5, "rgba(220, 205, 190, 0.4)");
  northPolar.addColorStop(1, "rgba(0,0,0,0)");
  context.fillStyle = northPolar;
  context.fillRect(0, 0, width, height * 0.12);

  // South polar ice cap
  const southPolar = context.createLinearGradient(0, height, 0, height * 0.9);
  southPolar.addColorStop(0, "rgba(230, 220, 210, 0.6)");
  southPolar.addColorStop(0.5, "rgba(215, 200, 185, 0.3)");
  southPolar.addColorStop(1, "rgba(0,0,0,0)");
  context.fillStyle = southPolar;
  context.fillRect(0, height * 0.9, width, height * 0.1);

  // Small craters
  for (let i = 0; i < 80; i++) {
    const r = 2 + rand() * 12;
    const x = rand() * width;
    const y = height * 0.1 + rand() * height * 0.8;
    context.beginPath();
    context.fillStyle = `rgba(80, 40, 25, ${0.06 + rand() * 0.1})`;
    context.arc(x, y, r, 0, Math.PI * 2);
    context.fill();
    context.beginPath();
    context.strokeStyle = `rgba(190, 120, 75, ${0.08 + rand() * 0.08})`;
    context.lineWidth = 0.8;
    context.arc(x + r * 0.15, y - r * 0.15, r * 0.8, -0.5, 1.5);
    context.stroke();
  }

  // Surface noise
  const imageData = context.getImageData(0, 0, width, height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (rand() - 0.5) * 10;
    data[i] += noise;
    data[i + 1] += noise * 0.6;
    data[i + 2] += noise * 0.4;
  }
  context.putImageData(imageData, 0, 0);
}

function paintJupiterTexture(context, width, height) {
  // Jupiter: prominent colored bands with Great Red Spot
  const bandColors = [
    "#e8d4a8", "#c49562", "#e8d0a0", "#a87742", "#f0e0c0",
    "#b88550", "#dcc494", "#8a5e32", "#f2e4c4", "#c8a06a",
    "#e0c89c", "#a06838", "#ecd8b0", "#b89060", "#dcc090",
    "#946a3e", "#f0dcc0", "#c09858"
  ];

  // Draw horizontal bands
  const numBands = bandColors.length;
  for (let i = 0; i < numBands; i++) {
    const y = (i / numBands) * height;
    const h = height / numBands + 4;
    context.fillStyle = bandColors[i];
    context.fillRect(0, y, width, h);
  }

  const rand = seededRandom(400);

  // Add wavy band edges with turbulence
  for (let i = 0; i < numBands; i++) {
    const baseY = (i / numBands) * height;
    context.beginPath();
    context.moveTo(0, baseY);
    for (let x = 0; x <= width; x += 4) {
      const wave = Math.sin(x * 0.02 + i * 2.3) * 4 + Math.sin(x * 0.05 + i) * 2;
      context.lineTo(x, baseY + wave);
    }
    context.lineTo(width, baseY + height / numBands + 10);
    context.lineTo(0, baseY + height / numBands + 10);
    context.closePath();
    context.fillStyle = bandColors[(i + 1) % numBands];
    context.globalAlpha = 0.5;
    context.fill();
  }
  context.globalAlpha = 1;

  // Turbulent swirls within bands
  for (let i = 0; i < 60; i++) {
    const cx = rand() * width;
    const cy = rand() * height;
    const rx = 10 + rand() * 50;
    const ry = 4 + rand() * 15;
    const shade = 140 + rand() * 80;
    context.save();
    context.translate(cx, cy);
    context.rotate((rand() - 0.5) * 0.4);
    context.fillStyle = `rgba(${shade}, ${shade - 40}, ${shade - 80}, ${0.08 + rand() * 0.12})`;
    context.beginPath();
    context.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  // Great Red Spot
  const grsCx = width * 0.68;
  const grsCy = height * 0.62;
  const grsRx = 55;
  const grsRy = 28;

  // Outer ring of the spot
  const grsGrad = context.createRadialGradient(grsCx, grsCy, 0, grsCx, grsCy, grsRx);
  grsGrad.addColorStop(0, "rgba(190, 90, 60, 0.6)");
  grsGrad.addColorStop(0.4, "rgba(200, 100, 65, 0.5)");
  grsGrad.addColorStop(0.7, "rgba(180, 80, 50, 0.35)");
  grsGrad.addColorStop(1, "rgba(0,0,0,0)");
  context.fillStyle = grsGrad;
  context.beginPath();
  context.ellipse(grsCx, grsCy, grsRx, grsRy, -0.12, 0, Math.PI * 2);
  context.fill();

  // Inner eye
  const grsInner = context.createRadialGradient(grsCx, grsCy, 0, grsCx, grsCy, grsRx * 0.4);
  grsInner.addColorStop(0, "rgba(220, 140, 90, 0.4)");
  grsInner.addColorStop(1, "rgba(0,0,0,0)");
  context.fillStyle = grsInner;
  context.beginPath();
  context.ellipse(grsCx, grsCy, grsRx * 0.4, grsRy * 0.4, -0.12, 0, Math.PI * 2);
  context.fill();
}

function paintSaturnTexture(context, width, height) {
  // Saturn: subtle golden-yellow bands, less contrast than Jupiter
  const bandColors = [
    "#e8d8b0", "#d4c090", "#e8dcc0", "#c8b080", "#f0e4c8",
    "#dcc8a0", "#e0d0ac", "#c4a878", "#eee0c0", "#d8c498",
    "#e4d4b4", "#ccb488", "#f0e0c4", "#d0bc90", "#e8d8b8"
  ];

  const numBands = bandColors.length;
  for (let i = 0; i < numBands; i++) {
    const y = (i / numBands) * height;
    const h = height / numBands + 3;
    context.fillStyle = bandColors[i];
    context.fillRect(0, y, width, h);
  }

  const rand = seededRandom(500);

  // Subtle wavy edges
  for (let i = 0; i < numBands; i++) {
    const baseY = (i / numBands) * height;
    context.beginPath();
    context.moveTo(0, baseY);
    for (let x = 0; x <= width; x += 6) {
      const wave = Math.sin(x * 0.015 + i * 1.8) * 3;
      context.lineTo(x, baseY + wave);
    }
    context.lineTo(width, baseY + height / numBands + 6);
    context.lineTo(0, baseY + height / numBands + 6);
    context.closePath();
    context.fillStyle = bandColors[(i + 1) % numBands];
    context.globalAlpha = 0.35;
    context.fill();
  }
  context.globalAlpha = 1;

  // Soft atmospheric haze near poles
  const northHaze = context.createLinearGradient(0, 0, 0, height * 0.15);
  northHaze.addColorStop(0, "rgba(180, 200, 210, 0.2)");
  northHaze.addColorStop(1, "rgba(0,0,0,0)");
  context.fillStyle = northHaze;
  context.fillRect(0, 0, width, height * 0.15);

  // Small swirls
  for (let i = 0; i < 30; i++) {
    const cx = rand() * width;
    const cy = rand() * height;
    const rx = 8 + rand() * 30;
    const ry = 3 + rand() * 8;
    const shade = 200 + rand() * 40;
    context.fillStyle = `rgba(${shade}, ${shade - 15}, ${shade - 50}, ${0.06 + rand() * 0.08})`;
    context.beginPath();
    context.ellipse(cx, cy, rx, ry, (rand() - 0.5) * 0.3, 0, Math.PI * 2);
    context.fill();
  }
}

function paintNeptuneTexture(context, width, height) {
  // Neptune: deep vivid blue with subtle dark spots and white cloud streaks
  const gradient = context.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#2850a8");
  gradient.addColorStop(0.2, "#2458c0");
  gradient.addColorStop(0.4, "#1d4cb0");
  gradient.addColorStop(0.6, "#2860c8");
  gradient.addColorStop(0.8, "#1f50b8");
  gradient.addColorStop(1, "#2248a0");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  const rand = seededRandom(600);

  // Subtle banding
  for (let i = 0; i < 16; i++) {
    const y = (i / 16) * height + rand() * 10;
    const h = 10 + rand() * 20;
    const brightness = 30 + rand() * 50;
    context.fillStyle = `rgba(${brightness}, ${brightness + 30}, ${brightness + 100}, ${0.1 + rand() * 0.15})`;
    context.fillRect(0, y, width, h);
  }

  // Great Dark Spot analogue
  const gdsCx = width * 0.4;
  const gdsCy = height * 0.42;
  const gdsGrad = context.createRadialGradient(gdsCx, gdsCy, 0, gdsCx, gdsCy, 45);
  gdsGrad.addColorStop(0, "rgba(15, 30, 80, 0.5)");
  gdsGrad.addColorStop(0.6, "rgba(20, 40, 90, 0.3)");
  gdsGrad.addColorStop(1, "rgba(0,0,0,0)");
  context.fillStyle = gdsGrad;
  context.beginPath();
  context.ellipse(gdsCx, gdsCy, 45, 22, -0.15, 0, Math.PI * 2);
  context.fill();

  // White cloud streaks
  for (let i = 0; i < 20; i++) {
    const cx = rand() * width;
    const cy = rand() * height;
    context.save();
    context.translate(cx, cy);
    context.rotate((rand() - 0.5) * 0.3);
    context.fillStyle = `rgba(200, 220, 255, ${0.06 + rand() * 0.1})`;
    context.beginPath();
    context.ellipse(0, 0, 15 + rand() * 40, 2 + rand() * 5, 0, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }
}

function paintUranusTexture(context, width, height) {
  // Uranus: pale cyan-blue, very uniform with subtle banding
  const gradient = context.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#7dcdd0");
  gradient.addColorStop(0.25, "#8ad8d8");
  gradient.addColorStop(0.5, "#7ec8cc");
  gradient.addColorStop(0.75, "#88d4d4");
  gradient.addColorStop(1, "#76c2c6");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  const rand = seededRandom(700);

  // Very subtle banding
  for (let i = 0; i < 12; i++) {
    const y = (i / 12) * height;
    const h = height / 12 + 2;
    const shift = rand() * 20 - 10;
    context.fillStyle = `rgba(${130 + shift}, ${210 + shift}, ${215 + shift}, ${0.08 + rand() * 0.1})`;
    context.fillRect(0, y, width, h);
  }

  // Slight polar brightening
  const polarN = context.createLinearGradient(0, 0, 0, height * 0.1);
  polarN.addColorStop(0, "rgba(180, 230, 230, 0.2)");
  polarN.addColorStop(1, "rgba(0,0,0,0)");
  context.fillStyle = polarN;
  context.fillRect(0, 0, width, height * 0.1);

  const polarS = context.createLinearGradient(0, height, 0, height * 0.92);
  polarS.addColorStop(0, "rgba(170, 225, 225, 0.15)");
  polarS.addColorStop(1, "rgba(0,0,0,0)");
  context.fillStyle = polarS;
  context.fillRect(0, height * 0.92, width, height * 0.08);
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
      count: 5000,
      radiusMin: 80,
      radiusMax: 300,
      size: 0.18,
      opacity: 0.95
    }),
    createStarLayer({
      count: 2400,
      radiusMin: 150,
      radiusMax: 450,
      size: 0.28,
      opacity: 0.62
    }),
    createStarLayer({
      count: 1600,
      radiusMin: 300,
      radiusMax: 700,
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
  controls.maxDistance = 500;
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
  updateHud(viewpointBody);
  currentHudBody = viewpointBody;
  lastHudRefreshAt = performance.now();
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

function getHudBodyTitle(body) {
  const localizedName = BODY_INFO_ALIASES[body.name] || body.name;

  if (body.label && !/^\d+\.\s/.test(body.label)) {
    return body.label;
  }

  return localizedName;
}

function updateHud(body) {
  const info = getBodyInfo(body.name);
  const hudTitle = getHudBodyTitle(body);

  hudLabel.textContent = hudTitle;
  hudDesc.textContent = `${info.type} · ${info.summary}`;
  hudInfo.style.display = "";
  hudComposition.textContent = info.composition;
  hudGravity.textContent = info.gravity;
  hudTimeConversion.textContent = buildTimeConversionText(
    hudTitle,
    info
  );
  hudFact.textContent = info.fact;
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

  if (currentHudBody && now - lastHudRefreshAt >= 1000) {
    updateHud(currentHudBody);
    lastHudRefreshAt = now;
  }

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
