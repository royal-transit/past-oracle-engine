// lib/provider-adapter.js
// REAL ASTROLOGY PROVIDER ADAPTER — FULL REPLACEMENT
// Proxy removed.
// Requires real astrology backend endpoints through Vercel Environment Variables.
// No fake chart, no deterministic simulation, no person-specific hardcode.

const REQUIRED_PROVIDER_VERSION = "REAL_ASTRO_PROVIDER_V1";

function str(v) {
  return v == null ? "" : String(v).trim();
}

function requiredEnv(name) {
  const v = str(process.env[name]);
  if (!v) {
    throw new Error(
      `MISSING_ENV_${name}: Real astrology provider is not connected. Add ${name} in Vercel Environment Variables.`
    );
  }
  return v.replace(/\/+$/, "");
}

function providerBaseUrl() {
  return requiredEnv("ASTRO_API_BASE_URL");
}

function providerApiKey() {
  return str(process.env.ASTRO_API_KEY);
}

function cleanArgs(args = {}) {
  return {
    name: str(args.name),
    dob: str(args.dob),
    tob: str(args.tob),
    pob: str(args.pob),
    latitude: args.latitude ?? null,
    longitude: args.longitude ?? null,
    timezone_offset: str(args.timezone_offset || "+06:00"),
    birth_datetime_iso: str(args.birth_datetime_iso),
    event_datetime_iso: str(args.event_datetime_iso || args.current_datetime_iso)
  };
}

async function callProvider(path, args = {}) {
  const base = providerBaseUrl();
  const apiKey = providerApiKey();

  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {})
    },
    body: JSON.stringify(cleanArgs(args))
  });

  const text = await res.text();

  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`ASTRO_PROVIDER_BAD_JSON at ${path}: ${text.slice(0, 300)}`);
  }

  if (!res.ok) {
    throw new Error(
      `ASTRO_PROVIDER_ERROR at ${path}: ${json?.error_message || json?.message || res.status}`
    );
  }

  return normalizeProviderPacket(json, path);
}

function normalizeProviderPacket(packet, path) {
  if (!packet || typeof packet !== "object") {
    throw new Error(`ASTRO_PROVIDER_EMPTY_RESPONSE at ${path}`);
  }

  if (packet.system_status && packet.system_status !== "OK") {
    throw new Error(
      `ASTRO_PROVIDER_NOT_OK at ${path}: ${packet.error_message || packet.message || "Unknown error"}`
    );
  }

  return {
    provider_version: packet.provider_version || REQUIRED_PROVIDER_VERSION,
    source: packet.source || "REAL_ASTROLOGY_BACKEND",
    zodiac: packet.zodiac || "sidereal",
    ayanamsa: packet.ayanamsa || "lahiri",
    ...packet
  };
}

export const astroProvider = {
  async getNatalChart(args) {
    return callProvider("/natal", args);
  },

  async getTransitChart(args) {
    return callProvider("/transit", args);
  },

  async getVimshottariDasha(args) {
    return callProvider("/dasha/vimshottari", args);
  },

  async getKPCusps(args) {
    return callProvider("/kp/cusps", args);
  },

  async getDivisionalCharts(args) {
    return callProvider("/divisional", args);
  }
};