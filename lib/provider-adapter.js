// lib/provider-adapter.js
// REAL PROVIDER ADAPTER FOR live-transit-engine
// Uses /api/oracle only. No proxy, no simulation, no fake planet.

const REQUIRED_PROVIDER_VERSION = "REAL_ASTRO_PROVIDER_ORACLE_BRIDGE_V1";

function str(v) {
  return v == null ? "" : String(v).trim();
}

function requiredEnv(name) {
  const v = str(process.env[name]);
  if (!v) {
    throw new Error(`MISSING_ENV_${name}: Real astrology provider is not connected.`);
  }
  return v.replace(/\/+$/, "");
}

function cleanArgs(args = {}) {
  return {
    name: str(args.name),
    dob: str(args.dob),
    tob: str(args.tob),
    pob: str(args.pob),
    latitude: args.latitude ?? "",
    longitude: args.longitude ?? "",
    timezone_offset: str(args.timezone_offset || "+06:00"),
    birth_datetime_iso: str(args.birth_datetime_iso),
    event_datetime_iso: str(args.event_datetime_iso || args.current_datetime_iso)
  };
}

function toQuery(args = {}) {
  const q = new URLSearchParams();
  const clean = cleanArgs(args);

  for (const [k, v] of Object.entries(clean)) {
    if (v !== "" && v != null) q.set(k, String(v));
  }

  return q.toString();
}

async function callOracle(args = {}) {
  const base = requiredEnv("ASTRO_API_BASE_URL");
  const url = `${base}/api/oracle?${toQuery(args)}`;

  const res = await fetch(url, {
    method: "GET",
    headers: { "accept": "application/json" }
  });

  const text = await res.text();

  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`ASTRO_PROVIDER_BAD_JSON at /api/oracle: ${text.slice(0, 300)}`);
  }

  if (!res.ok) {
    throw new Error(
      `ASTRO_PROVIDER_ERROR at /api/oracle: ${json?.error_message || json?.message || res.status}`
    );
  }

  if (!json || typeof json !== "object") {
    throw new Error("ASTRO_PROVIDER_EMPTY_RESPONSE at /api/oracle");
  }

  return json;
}

function planetObjectToArray(planets = {}) {
  return Object.entries(planets).map(([key, p]) => ({
    planet: key.charAt(0).toUpperCase() + key.slice(1),
    longitude: p.longitude,
    latitude: p.latitude ?? 0,
    speed_longitude: p.speed ?? 0,
    retrograde: !!p.retrograde,
    sign: p.sign,
    degree_in_sign: p.degree,
    nakshatra: p.nakshatra,
    nakshatra_lord: p.nakshatra_lord,
    pada: p.pada,
    dignity: p.dignity,
    combust: p.combust
  }));
}

function housesToWholeSign(houses = {}) {
  const out = {};
  for (const [k, h] of Object.entries(houses || {})) {
    out[k] = {
      sign: h.sign,
      sign_start_longitude: h.longitude,
      longitude: h.longitude,
      degree: h.degree,
      nakshatra: h.nakshatra,
      nakshatra_lord: h.nakshatra_lord,
      pada: h.pada
    };
  }
  return out;
}

function normalizeChart(packet) {
  return {
    provider_version: REQUIRED_PROVIDER_VERSION,
    source: packet?.authority?.source || "Swiss Ephemeris",
    zodiac: packet?.authority?.zodiac || "sidereal",
    ayanamsa: packet?.authority?.ayanamsa || "lahiri",
    node_mode: packet?.authority?.node_mode || "true_node",

    ascendant: packet.ascendant || null,
    planets: planetObjectToArray(packet.planets || {}),
    houses_whole_sign: housesToWholeSign(packet.houses || {}),
    houses: packet.houses || {},
    kp_cusps: packet.kp_cusps || {},
    aspects: packet.aspects_summary || [],

    panchanga: packet.panchanga || {},
    freshness: packet.freshness || {},
    integrity: packet.integrity || {},
    raw_provider_packet: packet
  };
}

export const astroProvider = {
  async getNatalChart(args) {
    const packet = await callOracle(args);
    return normalizeChart(packet);
  },

  async getTransitChart(args) {
    const packet = await callOracle(args);
    return normalizeChart(packet);
  },

  async getVimshottariDasha(args) {
    const packet = await callOracle(args);
    return packet.dasha || { status: "absent_from_provider" };
  },

  async getKPCusps(args) {
    const packet = await callOracle(args);
    return {
      status: "KP_VALIDATION_ACTIVE",
      cusps: packet.kp_cusps || {},
      ascendant_sub_lord: packet.kp_cusps?.["1"]?.sub_lord || null,
      ascendant_sign: packet.ascendant?.sign || null,
      raw_kp: packet.kp_cusps || {}
    };
  },

  async getDivisionalCharts(args) {
    const packet = await callOracle(args);
    return packet.divisional || { status: "absent_from_provider" };
  }
};