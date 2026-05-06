// lib/provider-adapter.js
// REAL PROVIDER BRIDGE FOR LIVE-TRANSIT-ENGINE
// FINAL LOCKED VERSION

function str(v) {
  return v == null ? "" : String(v).trim();
}

function requiredEnv(name) {
  const v = str(process.env[name]);

  if (!v) {
    throw new Error(`MISSING_ENV_${name}`);
  }

  return v.replace(/\/+$/, "");
}

function providerBaseUrl() {
  return requiredEnv("ASTRO_API_BASE_URL");
}

function toQuery(args = {}) {
  const q = new URLSearchParams();

  Object.entries(args).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v).trim() !== "") {
      q.set(k, String(v));
    }
  });

  return q.toString();
}

async function callTransit(args = {}) {
  const base = providerBaseUrl();

  const url = `${base}/api/transit?${toQuery(args)}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      accept: "application/json"
    }
  });

  const text = await res.text();

  let json;

  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(
      `ASTRO_PROVIDER_BAD_JSON: ${text.slice(0, 300)}`
    );
  }

  if (!res.ok) {
    throw new Error(
      `ASTRO_PROVIDER_HTTP_${res.status}`
    );
  }

  return json;
}

export const astroProvider = {
  async getNatalChart(args) {
    return callTransit(args);
  },

  async getTransitChart(args) {
    return callTransit(args);
  },

  async getVimshottariDasha(args) {
    return callTransit(args);
  },

  async getKPCusps(args) {
    return callTransit(args);
  },

  async getDivisionalCharts(args) {
    return callTransit(args);
  }
};