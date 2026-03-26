// lib/chart-core.js
// Real chart packet builder layer
// This file is the evidence engine.
// It should be fed by a real astrology provider (Swiss Ephemeris / equivalent).

export async function buildChartCore(input, provider) {
  const normalized = normalizeInput(input);

  const validation = validateInput(normalized);
  if (!validation.valid) {
    return {
      system_status: "INVALID_INPUT",
      validation,
      input_normalized: normalized
    };
  }

  const birthContext = buildBirthContext(normalized);
  const currentContext = buildCurrentContext(normalized);

  const natalPacket = await provider.getNatalChart({
    birth_datetime_iso: birthContext.birth_datetime_iso,
    latitude: birthContext.latitude,
    longitude: birthContext.longitude,
    timezone_offset: birthContext.timezone_offset,
    zodiac: "sidereal",
    ayanamsa: "lahiri",
    house_system: "W"
  });

  const dashaPacket = await provider.getVimshottariDasha({
    birth_datetime_iso: birthContext.birth_datetime_iso,
    latitude: birthContext.latitude,
    longitude: birthContext.longitude,
    timezone_offset: birthContext.timezone_offset,
    zodiac: "sidereal",
    ayanamsa: "lahiri"
  });

  const kpPacket = await provider.getKPCusps({
    birth_datetime_iso: birthContext.birth_datetime_iso,
    latitude: birthContext.latitude,
    longitude: birthContext.longitude,
    timezone_offset: birthContext.timezone_offset,
    zodiac: "sidereal",
    ayanamsa: "lahiri"
  });

  const divisionalPacket = await provider.getDivisionalCharts({
    birth_datetime_iso: birthContext.birth_datetime_iso,
    latitude: birthContext.latitude,
    longitude: birthContext.longitude,
    timezone_offset: birthContext.timezone_offset,
    zodiac: "sidereal",
    ayanamsa: "lahiri"
  });

  const transitNow = await provider.getTransitChart({
    event_datetime_iso: currentContext.event_datetime_iso,
    latitude: currentContext.latitude,
    longitude: currentContext.longitude,
    timezone_offset: currentContext.timezone_offset,
    zodiac: "sidereal",
    ayanamsa: "lahiri",
    house_system: "W"
  });

  return {
    system_status: "OK",
    engine_status: "CHART_CORE_V1",
    input_normalized: normalized,
    birth_context: birthContext,
    current_context: currentContext,
    evidence_packet: {
      natal: natalPacket,
      dasha: dashaPacket,
      kp: kpPacket,
      divisional: divisionalPacket,
      transit_now: transitNow
    }
  };
}

function normalizeInput(input) {
  return {
    name: safeStr(input.name),
    dob: normalizeDob(safeStr(input.dob)),
    tob: normalizeTime(safeStr(input.tob)),
    pob: safeStr(input.pob),
    latitude: normalizeNumber(input.latitude),
    longitude: normalizeNumber(input.longitude),
    timezone_offset: safeStr(input.timezone_offset || "+06:00"),
    question: safeStr(input.question),
    facts: safeStr(input.facts),
    current_datetime_iso: normalizeIsoDateTime(safeStr(input.current_datetime_iso))
  };
}

function validateInput(input) {
  const issues = [];

  if (!input.dob) issues.push("DOB missing or invalid");
  if (!input.tob) issues.push("TOB missing or invalid");
  if (!input.pob) issues.push("POB missing");
  if (input.latitude == null) issues.push("Latitude missing");
  if (input.longitude == null) issues.push("Longitude missing");

  return {
    valid: issues.length === 0,
    issues
  };
}

function buildBirthContext(input) {
  const birth_datetime_iso = `${input.dob}T${input.tob}:00${input.timezone_offset}`;

  return {
    birth_datetime_iso,
    latitude: input.latitude,
    longitude: input.longitude,
    timezone_offset: input.timezone_offset,
    birthplace: input.pob
  };
}

function buildCurrentContext(input) {
  const nowIso = input.current_datetime_iso || new Date().toISOString();

  return {
    event_datetime_iso: nowIso,
    latitude: input.latitude,
    longitude: input.longitude,
    timezone_offset: input.timezone_offset
  };
}

function safeStr(v) {
  return typeof v === "string" ? v.trim() : "";
}

function normalizeNumber(v) {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function normalizeDob(dob) {
  if (!dob) return null;

  const iso = /^(\d{4})-(\d{2})-(\d{2})$/;
  const dmy = /^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/;

  if (iso.test(dob)) return dob;

  if (dmy.test(dob)) {
    const [, d, m, y] = dob.match(dmy) || [];
    return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }

  return null;
}

function normalizeTime(t) {
  if (!t) return null;

  const hm24 = /^([01]?\d|2[0-3]):([0-5]\d)$/;
  const hm12 = /^(\d{1,2}):([0-5]\d)\s*(AM|PM)$/i;

  if (hm24.test(t)) {
    const [, h, m] = t.match(hm24) || [];
    return `${String(h).padStart(2, "0")}:${m}`;
  }

  if (hm12.test(t)) {
    let [, h, m, ap] = t.match(hm12) || [];
    let hh = Number(h);
    const upper = ap.toUpperCase();

    if (upper === "AM" && hh === 12) hh = 0;
    if (upper === "PM" && hh !== 12) hh += 12;

    return `${String(hh).padStart(2, "0")}:${m}`;
  }

  return null;
}

function normalizeIsoDateTime(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}