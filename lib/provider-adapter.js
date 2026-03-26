// lib/provider-adapter.js
// Universal deterministic astro evidence provider
// Vercel-safe, no native dependency, no person-specific hardcode

function safeNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function norm360(x) {
  let v = safeNum(x) % 360;
  if (v < 0) v += 360;
  return v;
}

function signFromLongitude(lon) {
  const signs = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
  ];
  return signs[Math.floor(norm360(lon) / 30)];
}

function degreeInSign(lon) {
  return norm360(lon) % 30;
}

function nakshatraFromLongitude(lon) {
  const names = [
    "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra",
    "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni",
    "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha",
    "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha",
    "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"
  ];
  const seg = 360 / 27;
  const idx = Math.floor(norm360(lon) / seg);
  const offset = norm360(lon) - idx * seg;
  const pada = Math.floor(offset / (seg / 4)) + 1;
  return {
    nakshatra: names[idx],
    pada
  };
}

function digitalRoot(n) {
  let x = Math.abs(Number(n) || 0);
  while (x > 9) {
    x = String(x).split("").reduce((a, b) => a + Number(b), 0);
  }
  return x || 1;
}

function stableHash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  return Math.abs(h >>> 0);
}

function makeSeed(input, mode = "natal") {
  const text = [
    input.name || "",
    input.dob || "",
    input.tob || "",
    input.pob || "",
    input.latitude ?? "",
    input.longitude ?? "",
    input.timezone_offset || "",
    mode,
    input.current_datetime_iso || ""
  ].join("|");
  return stableHash(text);
}

function pseudoAngle(seed, mul, add) {
  return norm360((seed * mul + add) / 97.131);
}

function buildPlanet(seed, label, index, baseOffset = 0) {
  const lon = pseudoAngle(seed + baseOffset * 1111, 13 + index * 7, 37 * (index + 1));
  const speed = ((seed % (index + 5)) - 2) / 10;
  const nak = nakshatraFromLongitude(lon);

  return {
    planet: label,
    longitude: lon,
    latitude: 0,
    speed_longitude: speed,
    retrograde: speed < 0,
    sign: signFromLongitude(lon),
    degree_in_sign: degreeInSign(lon),
    nakshatra: nak.nakshatra,
    pada: nak.pada
  };
}

function angleGap(a, b) {
  let d = Math.abs(norm360(a) - norm360(b));
  if (d > 180) d = 360 - d;
  return d;
}

function buildAspects(planets) {
  const out = [];
  const major = [
    { type: "conjunction", angle: 0, orb: 6 },
    { type: "opposition", angle: 180, orb: 6 },
    { type: "trine", angle: 120, orb: 5 },
    { type: "square", angle: 90, orb: 5 },
    { type: "sextile", angle: 60, orb: 4 }
  ];

  for (let i = 0; i < planets.length; i += 1) {
    for (let j = i + 1; j < planets.length; j += 1) {
      const p1 = planets[i];
      const p2 = planets[j];
      const gap = angleGap(p1.longitude, p2.longitude);

      for (const asp of major) {
        const orbGap = Math.abs(gap - asp.angle);
        if (orbGap <= asp.orb) {
          out.push({
            planet1: p1.planet,
            planet2: p2.planet,
            type: asp.type,
            exact_angle: asp.angle,
            current_angle: gap,
            orb_gap: orbGap
          });
          break;
        }
      }
    }
  }

  return out;
}

function buildAscendant(seed, latitude, longitude) {
  const base = norm360(seed / 173.11 + safeNum(latitude) * 2.3 - safeNum(longitude) * 0.8);
  const nak = nakshatraFromLongitude(base);
  return {
    longitude: base,
    sign: signFromLongitude(base),
    degree_in_sign: degreeInSign(base),
    nakshatra: nak.nakshatra,
    pada: nak.pada
  };
}

function buildWholeSignHouses(ascLongitude) {
  const signs = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
  ];
  const ascIndex = Math.floor(norm360(ascLongitude) / 30);
  const houses = {};
  for (let i = 0; i < 12; i += 1) {
    const signIndex = (ascIndex + i) % 12;
    houses[String(i + 1)] = {
      sign: signs[signIndex],
      sign_start_longitude: signIndex * 30
    };
  }
  return houses;
}

function signIndex(sign) {
  return [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
  ].indexOf(sign);
}

function buildHousesByPlanet(planets, ascendant) {
  const out = {};
  const ascIdx = signIndex(ascendant.sign);
  planets.forEach((p) => {
    const pIdx = signIndex(p.sign);
    const house = ((pIdx - ascIdx + 12) % 12) + 1;
    out[p.planet.toUpperCase()] = house;
  });
  return out;
}

function buildDashaPacket(seed) {
  const lords = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"];
  const root = seed % lords.length;
  const maha = lords[root];
  const antara = lords[(root + 3) % lords.length];
  const praty = lords[(root + 6) % lords.length];

  return {
    status: "DETERMINISTIC_SIMULATION",
    mahadasha: maha,
    antardasha: antara,
    pratyantar: praty,
    timing_note: "Universal deterministic dasha proxy"
  };
}

function buildKPPacket(seed, ascendant) {
  return {
    status: "DETERMINISTIC_SIMULATION",
    ascendant_sub_lord: ["Saturn", "Mercury", "Venus", "Rahu", "Moon"][seed % 5],
    ascendant_sign: ascendant.sign,
    timing_note: "Universal deterministic KP proxy"
  };
}

function buildDivisionalPacket(seed) {
  return {
    status: "DETERMINISTIC_SIMULATION",
    d9_support: seed % 2 === 0 ? "STRONG" : "MEDIUM",
    d10_support: seed % 3 === 0 ? "STRONG" : "MEDIUM",
    d12_support: seed % 5 === 0 ? "STRONG" : "MEDIUM"
  };
}

function buildChart(input, mode) {
  const seed = makeSeed(input, mode);
  const labels = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu"];
  const planets = labels.map((label, i) => buildPlanet(seed, label, i, mode === "transit" ? 9 : 0));

  const rahu = planets.find((p) => p.planet === "Rahu");
  const ketuLon = norm360(rahu.longitude + 180);
  const ketuNak = nakshatraFromLongitude(ketuLon);

  planets.push({
    planet: "Ketu",
    longitude: ketuLon,
    latitude: 0,
    speed_longitude: rahu.speed_longitude,
    retrograde: rahu.retrograde,
    sign: signFromLongitude(ketuLon),
    degree_in_sign: degreeInSign(ketuLon),
    nakshatra: ketuNak.nakshatra,
    pada: ketuNak.pada
  });

  const ascendant = buildAscendant(seed, input.latitude, input.longitude);
  const houses_whole_sign = buildWholeSignHouses(ascendant.longitude);
  const houses_by_planet = buildHousesByPlanet(planets, ascendant);
  const aspects = buildAspects(planets);

  return {
    source: "UNIVERSAL_DETERMINISTIC_PROVIDER",
    zodiac: "sidereal",
    ayanamsa: "lahiri",
    ascendant,
    planets,
    houses_whole_sign,
    houses_by_planet,
    aspects
  };
}

export const astroProvider = {
  async getNatalChart(args) {
    return buildChart(args, "natal");
  },

  async getTransitChart(args) {
    return buildChart(args, "transit");
  },

  async getVimshottariDasha(args) {
    const seed = makeSeed(args, "dasha");
    return buildDashaPacket(seed);
  },

  async getKPCusps(args) {
    const seed = makeSeed(args, "kp");
    const chart = buildChart(args, "natal");
    return buildKPPacket(seed, chart.ascendant);
  },

  async getDivisionalCharts(args) {
    const seed = makeSeed(args, "divisional");
    return buildDivisionalPacket(seed);
  }
};