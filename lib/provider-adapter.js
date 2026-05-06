// lib/provider-adapter.js
// REAL LIVE-TRANSIT BRIDGE — NORMALIZED FOR PAST ORACLE
// No proxy. No fake simulation. Uses live-transit-engine /api/transit.

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
    throw new Error(`ASTRO_PROVIDER_HTTP_${res.status}: ${json?.message || json?.error_message || "Unknown"}`);
  }

  return json;
}

function normalizePlanetName(name) {
  return String(name || "").charAt(0).toUpperCase() + String(name || "").slice(1);
}

function normalizePlanets(planets) {
  if (!planets) return [];

  if (Array.isArray(planets)) {
    return planets.map((p) => ({
      planet: normalizePlanetName(p.planet || p.name),
      longitude: p.longitude,
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
    }));
  }

  return Object.entries(planets).map(([key, p]) => ({
    planet: normalizePlanetName(p.planet || key),
    longitude: p.longitude,
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
  }));
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

function normalizeAspects(aspects) {
  if (!Array.isArray(aspects)) return [];

  return aspects.map((a) => ({
    planet1: normalizePlanetName(a.planet1),
    planet2: normalizePlanetName(a.planet2),
    type: a.type,
    exact_angle: a.exact_angle ?? null,
    current_angle: a.current_angle ?? null,
    orb_gap: a.orb_gap ?? null
  }));
}

function normalizeChart(packet) {
  const planets = normalizePlanets(packet.planets);
  const houses = normalizeHouses(packet.houses);
  const aspects = normalizeAspects(packet.aspects_summary || packet.aspects);

  return {
    provider_version: "LIVE_TRANSIT_NORMALIZED_BRIDGE_V2",
    source: packet?.authority?.source || "Swiss Ephemeris",
    zodiac: packet?.authority?.zodiac || "sidereal",
    ayanamsa: packet?.authority?.ayanamsa || "lahiri",
    node_mode: packet?.authority?.node_mode || "true_node",

    ascendant: packet.ascendant || null,

    planets,
    planets_array: planets,
    houses,
    houses_whole_sign: houses,
    houses_by_planet: packet.houses_by_planet || {},

    kp_cusps: packet.kp_cusps || {},
    aspects,

    panchanga: packet.panchanga || {},
    dasha: packet.dasha || {},
    divisional: packet.divisional || {},
    strength: packet.strength || {},
    freshness: packet.freshness || {},
    integrity: packet.integrity || {},

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