// lib/provider-adapter.js
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const swisseph = require("swisseph");

// Swiss Ephemeris flags:
// - SEFLG_SIDEREAL for sidereal zodiac
// - SEFLG_SPEED for speed values
// - SEFLG_MOSEPH to avoid external ephemeris files tonight
const BASE_FLAGS =
  swisseph.SEFLG_SIDEREAL |
  swisseph.SEFLG_SPEED |
  swisseph.SEFLG_MOSEPH;

const PLANETS = [
  { key: "sun", id: swisseph.SE_SUN, label: "Sun" },
  { key: "moon", id: swisseph.SE_MOON, label: "Moon" },
  { key: "mars", id: swisseph.SE_MARS, label: "Mars" },
  { key: "mercury", id: swisseph.SE_MERCURY, label: "Mercury" },
  { key: "jupiter", id: swisseph.SE_JUPITER, label: "Jupiter" },
  { key: "venus", id: swisseph.SE_VENUS, label: "Venus" },
  { key: "saturn", id: swisseph.SE_SATURN, label: "Saturn" },
  { key: "rahu", id: swisseph.SE_TRUE_NODE, label: "Rahu" }
];

function sweJulday(year, month, day, hour) {
  return new Promise((resolve, reject) => {
    swisseph.swe_julday(
      year,
      month,
      day,
      hour,
      swisseph.SE_GREG_CAL,
      (jd) => {
        if (jd == null || Number.isNaN(jd)) {
          reject(new Error("Failed to compute Julian day"));
          return;
        }
        resolve(jd);
      }
    );
  });
}

function sweCalcUt(jdUt, bodyId, flags = BASE_FLAGS) {
  return new Promise((resolve, reject) => {
    swisseph.swe_calc_ut(jdUt, bodyId, flags, (result) => {
      if (!result || result.error) {
        reject(new Error(result?.error || `swe_calc_ut failed for body ${bodyId}`));
        return;
      }
      resolve(result);
    });
  });
}

function sweHousesEx(jdUt, lat, lng) {
  return new Promise((resolve, reject) => {
    if (typeof swisseph.swe_houses_ex !== "function") {
      resolve(null);
      return;
    }

    swisseph.swe_houses_ex(
      jdUt,
      BASE_FLAGS,
      lat,
      lng,
      "W",
      (result) => {
        if (!result || result.error) {
          reject(new Error(result?.error || "swe_houses_ex failed"));
          return;
        }
        resolve(result);
      }
    );
  });
}

function parseIsoToUtParts(isoString) {
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Invalid datetime: ${isoString}`);
  }

  const year = d.getUTCFullYear();
  const month = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  const hour =
    d.getUTCHours() +
    d.getUTCMinutes() / 60 +
    d.getUTCSeconds() / 3600 +
    d.getUTCMilliseconds() / 3600000;

  return { year, month, day, hour };
}

function normalizeLng(x) {
  let v = x % 360;
  if (v < 0) v += 360;
  return v;
}

function signFromLongitude(lon) {
  const signs = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
  ];
  const idx = Math.floor(normalizeLng(lon) / 30);
  return signs[idx];
}

function degreeInSign(lon) {
  return normalizeLng(lon) % 30;
}

function nakshatraFromLongitude(lon) {
  const names = [
    "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra",
    "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni",
    "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha",
    "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishta", "Shatabhisha",
    "Purva Bhadrapada", "Uttara Bhadrapada", "Revati"
  ];

  const segment = 360 / 27; // 13°20'
  const idx = Math.floor(normalizeLng(lon) / segment);
  const offset = normalizeLng(lon) - idx * segment;
  const pada = Math.floor(offset / (segment / 4)) + 1;

  return {
    nakshatra: names[idx],
    pada
  };
}

function buildPlanetPacket(label, raw) {
  const lon = raw.longitude;
  const lat = raw.latitude ?? 0;
  const speed = raw.speedLong ?? raw.speed ?? 0;
  const retrograde = speed < 0;

  const nak = nakshatraFromLongitude(lon);

  return {
    planet: label,
    longitude: lon,
    latitude: lat,
    speed_longitude: speed,
    retrograde,
    sign: signFromLongitude(lon),
    degree_in_sign: degreeInSign(lon),
    nakshatra: nak.nakshatra,
    pada: nak.pada
  };
}

function angleGap(a, b) {
  let diff = Math.abs(normalizeLng(a) - normalizeLng(b));
  if (diff > 180) diff = 360 - diff;
  return diff;
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

function buildWholeSignHousesFromAsc(ascLongitude) {
  if (ascLongitude == null) return null;

  const firstSignIndex = Math.floor(normalizeLng(ascLongitude) / 30);
  const signs = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
  ];

  const houses = {};
  for (let i = 0; i < 12; i += 1) {
    const signIdx = (firstSignIndex + i) % 12;
    houses[String(i + 1)] = {
      sign: signs[signIdx],
      sign_start_longitude: signIdx * 30
    };
  }
  return houses;
}

function extractAscendant(houseResult) {
  if (!houseResult) return null;

  if (Array.isArray(houseResult.ascmc) && houseResult.ascmc.length > 0) {
    return houseResult.ascmc[0];
  }

  if (typeof houseResult.ascendant === "number") {
    return houseResult.ascendant;
  }

  return null;
}

function placeholderDasha() {
  return {
    status: "NOT_COMPUTED_HERE",
    note: "Swiss Ephemeris chart evidence is real, but Vimshottari dasha is not computed in this adapter yet."
  };
}

function placeholderKP(houseResult, ascLongitude) {
  return {
    status: "PARTIAL",
    note: "Ascendant / house evidence is real when available. KP sub-lord logic is not computed in this adapter yet.",
    raw_houses_available: !!houseResult,
    ascendant_longitude: ascLongitude
  };
}

export const astroProvider = {
  async getNatalChart(args) {
    swisseph.swe_set_sid_mode(swisseph.SE_SIDM_LAHIRI, 0, 0);

    const { year, month, day, hour } = parseIsoToUtParts(args.birth_datetime_iso);
    const jdUt = await sweJulday(year, month, day, hour);

    const planetPackets = [];
    for (const p of PLANETS) {
      const raw = await sweCalcUt(jdUt, p.id, BASE_FLAGS);
      planetPackets.push(buildPlanetPacket(p.label, raw));
    }

    // Build Ketu from Rahu
    const rahu = planetPackets.find((x) => x.planet === "Rahu");
    if (rahu) {
      const ketuLon = normalizeLng(rahu.longitude + 180);
      const ketuNak = nakshatraFromLongitude(ketuLon);
      planetPackets.push({
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
    }

    const houseResult = await sweHousesEx(jdUt, args.latitude, args.longitude).catch(() => null);
    const ascLongitude = extractAscendant(houseResult);

    return {
      source: "swisseph",
      zodiac: "sidereal",
      ayanamsa: "lahiri",
      jd_ut: jdUt,
      ascendant: ascLongitude == null
        ? null
        : {
            longitude: ascLongitude,
            sign: signFromLongitude(ascLongitude),
            degree_in_sign: degreeInSign(ascLongitude),
            ...nakshatraFromLongitude(ascLongitude)
          },
      planets: planetPackets,
      houses_whole_sign: buildWholeSignHousesFromAsc(ascLongitude),
      aspects: buildAspects(planetPackets)
    };
  },

  async getVimshottariDasha(args) {
    return placeholderDasha();
  },

  async getKPCusps(args) {
    swisseph.swe_set_sid_mode(swisseph.SE_SIDM_LAHIRI, 0, 0);

    const { year, month, day, hour } = parseIsoToUtParts(args.birth_datetime_iso);
    const jdUt = await sweJulday(year, month, day, hour);
    const houseResult = await sweHousesEx(jdUt, args.latitude, args.longitude).catch(() => null);
    const ascLongitude = extractAscendant(houseResult);

    return placeholderKP(houseResult, ascLongitude);
  },

  async getDivisionalCharts(args) {
    return {
      status: "NOT_COMPUTED_HERE",
      note: "Divisional charts are not computed in this adapter yet."
    };
  },

  async getTransitChart(args) {
    swisseph.swe_set_sid_mode(swisseph.SE_SIDM_LAHIRI, 0, 0);

    const { year, month, day, hour } = parseIsoToUtParts(args.event_datetime_iso);
    const jdUt = await sweJulday(year, month, day, hour);

    const planetPackets = [];
    for (const p of PLANETS) {
      const raw = await sweCalcUt(jdUt, p.id, BASE_FLAGS);
      planetPackets.push(buildPlanetPacket(p.label, raw));
    }

    const rahu = planetPackets.find((x) => x.planet === "Rahu");
    if (rahu) {
      const ketuLon = normalizeLng(rahu.longitude + 180);
      const ketuNak = nakshatraFromLongitude(ketuLon);
      planetPackets.push({
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
    }

    const houseResult = await sweHousesEx(jdUt, args.latitude, args.longitude).catch(() => null);
    const ascLongitude = extractAscendant(houseResult);

    return {
      source: "swisseph",
      zodiac: "sidereal",
      ayanamsa: "lahiri",
      jd_ut: jdUt,
      ascendant: ascLongitude == null
        ? null
        : {
            longitude: ascLongitude,
            sign: signFromLongitude(ascLongitude),
            degree_in_sign: degreeInSign(ascLongitude),
            ...nakshatraFromLongitude(ascLongitude)
          },
      planets: planetPackets,
      houses_whole_sign: buildWholeSignHousesFromAsc(ascLongitude),
      aspects: buildAspects(planetPackets)
    };
  }
};