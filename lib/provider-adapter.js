// lib/provider-adapter.js
// REAL LIVE-TRANSIT BRIDGE — FINAL UNIVERSAL NORMALIZER
// No proxy. No fake simulation. No Royel hardlock.
// Reads live-transit-engine /api/transit output where planets are top-level keys.

function str(v) {
  return v == null ? "" : String(v).trim();
}

function requiredEnv(name) {
  const v = str(process.env[name]);
  if (!v) throw new Error(`MISSING_ENV_${name}`);
  return v.replace(/\/+$/, "");
}

function toQuery(args = {}) {
  const q = new URLSearchParams();

  for (const [k, v] of Object.entries(args || {})) {
    if (v !== undefined && v !== null && String(v).trim() !== "") {
      q.set(k, String(v));
    }
  }

  return q.toString();
}

async function callLiveTransit(args = {}) {
  const base = requiredEnv("ASTRO_API_BASE_URL");
  const url = `${base}/api/transit?${toQuery(args)}`;

  const res = await fetch(url, {
    method: "GET",
    headers: { accept: "application/json" }
  });

  const text = await res.text();

  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`ASTRO_PROVIDER_BAD_JSON: ${text.slice(0, 300)}`);
  }

  if (!res.ok) {
    throw new Error(
      `ASTRO_PROVIDER_HTTP_${res.status}: ${json?.message || json?.error_message || "Unknown"}`
    );
  }

  return json;
}

function titlePlanet(name) {
  const s = String(name || "").toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const PLANET_KEYS = [
  "sun",
  "moon",
  "mars",
  "mercury",
  "jupiter",
  "venus",
  "saturn",
  "rahu",
  "ketu"
];

function normalizePlanet(key, p = {}) {
  return {
    planet: titlePlanet(p.planet || key),
    longitude: Number(p.longitude),
    latitude: p.latitude ?? 0,
    speed_longitude: p.speed_longitude ?? p.speed ?? 0,
    retrograde: Boolean(p.retrograde),
    sign: p.sign,
    degree_in_sign: p.degree_in_sign ?? p.degree,
    degree: p.degree ?? p.degree_in_sign,
    nakshatra: p.nakshatra,
    nakshatra_lord: p.nakshatra_lord,
    pada: p.pada,
    dignity: p.dignity,
    combust: Boolean(p.combust)
  };
}

function normalizePlanets(packet = {}) {
  if (Array.isArray(packet.planets)) {
    return packet.planets.map((p) => normalizePlanet(p.planet || p.name, p));
  }

  if (packet.planets && typeof packet.planets === "object") {
    return Object.entries(packet.planets).map(([key, p]) => normalizePlanet(key, p));
  }

  return PLANET_KEYS
    .filter((key) => packet[key] && typeof packet[key] === "object")
    .map((key) => normalizePlanet(key, packet[key]));
}

function signIndex(sign) {
  const signs = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
  ];
  return signs.indexOf(sign);
}

function buildHousesByPlanet(planets = [], ascendant = null) {
  const out = {};
  if (!ascendant?.sign) return out;

  const ascIdx = signIndex(ascendant.sign);
  if (ascIdx < 0) return out;

  for (const p of planets) {
    const pIdx = signIndex(p.sign);
    if (pIdx < 0) continue;

    out[String(p.planet || "").toUpperCase()] = ((pIdx - ascIdx + 12) % 12) + 1;
  }

  return out;
}

function normalizeHouses(houses) {
  const out = {};
  if (!houses || typeof houses !== "object") return out;

  for (const [k, h] of Object.entries(houses)) {
    out[String(k)] = {
      longitude: h.longitude,
      sign: h.sign,
      degree: h.degree,
      degree_in_sign: h.degree_in_sign ?? h.degree,
      nakshatra: h.nakshatra,
      nakshatra_lord: h.nakshatra_lord,
      pada: h.pada,
      sign_start_longitude: h.sign_start_longitude ?? h.longitude
    };
  }

  return out;
}

function normalizeAspects(packet = {}) {
  const aspects = packet.aspects_summary || packet.aspects || [];
  if (!Array.isArray(aspects)) return [];

  return aspects.map((a) => ({
    planet1: titlePlanet(a.planet1),
    planet2: titlePlanet(a.planet2),
    type: a.type,
    exact_angle: a.exact_angle ?? null,
    current_angle: a.current_angle ?? null,
    orb_gap: a.orb_gap ?? null
  }));
}

function normalizeChart(packet = {}) {
  const planets = normalizePlanets(packet);
  const houses = normalizeHouses(packet.houses);
  const housesByPlanet =
    packet.houses_by_planet && Object.keys(packet.houses_by_planet).length
      ? packet.houses_by_planet
      : buildHousesByPlanet(planets, packet.ascendant);

  return {
    provider_version: "LIVE_TRANSIT_TOP_LEVEL_PLANET_BRIDGE_V3",
    source: packet?.authority?.source || "Swiss Ephemeris",
    zodiac: packet?.authority?.zodiac || "sidereal",
    ayanamsa: packet?.authority?.ayanamsa || "lahiri",
    node_mode: packet?.authority?.node_mode || "true_node",

    ascendant: packet.ascendant || null,

    planets,
    planets_array: planets,

    houses,
    houses_whole_sign: houses,
    houses_by_planet: housesByPlanet,

    kp_cusps: packet.kp_cusps || {},
    aspects: normalizeAspects(packet),

    panchanga: packet.panchanga || {},
    dasha: packet.dasha || {},
    divisional: packet.divisional || {},
    strength: packet.strength || {},
    freshness: packet.freshness || {},
    integrity: packet.integrity || {},
    quality: packet.quality || {},
    micro_window: packet.micro_window || {},
    micro_status: packet.micro_status || {},
    micro_convergence: packet.micro_convergence || {},
    micro_dominant_trigger: packet.micro_dominant_trigger || {},

    raw_provider_packet: packet
  };
}

export const astroProvider = {
  async getNatalChart(args) {
    const packet = await callLiveTransit(args);
    return normalizeChart(packet);
  },

  async getTransitChart(args) {
    const packet = await callLiveTransit(args);
    return normalizeChart(packet);
  },

  async getVimshottariDasha(args) {
    const packet = await callLiveTransit(args);
    return packet.dasha || { status: "absent_from_live_provider" };
  },

  async getKPCusps(args) {
    const packet = await callLiveTransit(args);
    return {
      status: "KP_VALIDATION_ACTIVE",
      cusps: packet.kp_cusps || {},
      kp_cusps: packet.kp_cusps || {},
      ascendant_sub_lord: packet.kp_cusps?.["1"]?.sub_lord || null,
      ascendant_sign: packet.ascendant?.sign || null
    };
  },

  async getDivisionalCharts(args) {
    const packet = await callLiveTransit(args);
    return packet.divisional || { status: "absent_from_live_provider" };
  }
};