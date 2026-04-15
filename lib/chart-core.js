// lib/chart-core.js
// Universal chart core
// Normalizes input, builds birth/current contexts, and assembles evidence packet
// HARD FIX:
// - name only = valid
// - name + DOB = valid
// - name + parents/facts = valid
// - DOB does NOT force TOB/POB
// - full precision only when DOB + TOB exist
// - reduced precision mode allowed

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

  const birth_context = buildBirthContext(normalized);
  const current_context = buildCurrentContext(normalized);

  const natal = await provider.getNatalChart({
    ...normalized,
    birth_datetime_iso: birth_context.birth_datetime_iso
  });

  const dasha = await provider.getVimshottariDasha({
    ...normalized,
    birth_datetime_iso: birth_context.birth_datetime_iso
  });

  const kp = await provider.getKPCusps({
    ...normalized,
    birth_datetime_iso: birth_context.birth_datetime_iso
  });

  const divisional = await provider.getDivisionalCharts({
    ...normalized,
    birth_datetime_iso: birth_context.birth_datetime_iso
  });

  const transit_now = await provider.getTransitChart({
    ...normalized,
    event_datetime_iso: current_context.event_datetime_iso
  });

  return {
    system_status: "OK",
    engine_status: "CHART_CORE_UNIVERSAL_V2",
    precision_mode: birth_context.precision_mode,
    input_normalized: normalized,
    birth_context,
    current_context,
    evidence_packet: {
      natal,
      dasha,
      kp,
      divisional,
      transit_now
    }
  };
}

function safeStr(v) {
  return typeof v === "string" ? v.trim() : "";
}

function safeNum(v) {
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
    const A = ap.toUpperCase();

    if (A === "AM" && hh === 12) hh = 0;
    if (A === "PM" && hh !== 12) hh += 12;

    return `${String(hh).padStart(2, "0")}:${m}`;
  }

  return null;
}

function normalizeIsoDateTime(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function normalizeInput(input) {
  return {
    name: safeStr(input.name),
    dob: normalizeDob(safeStr(input.dob)),
    tob: normalizeTime(safeStr(input.tob)),
    pob: safeStr(input.pob),
    latitude: safeNum(input.latitude),
    longitude: safeNum(input.longitude),
    timezone_offset: safeStr(input.timezone_offset || "+06:00"),
    question: safeStr(input.question),
    facts: safeStr(input.facts)
  };
}

function validateInput(input) {
  const issues = [];

  const hasName = !!input.name;
  const hasDob = !!input.dob;
  const hasTob = !!input.tob;
  const hasPob = !!input.pob;
  const hasFacts = !!input.facts;

  // minimum acceptance ladder
  if (!hasName && !hasDob && !hasFacts) {
    issues.push("Provide at least a name, DOB, or facts.");
  }

  // TOB without DOB is invalid because time has no date anchor
  if (hasTob && !hasDob) {
    issues.push("TOB provided without valid DOB.");
  }

  // latitude/longitude without DOB are allowed but ignored for precision if no birth time
  return {
    valid: issues.length === 0,
    issues
  };
}

function buildBirthContext(input) {
  let birth_datetime_iso = null;
  let precision_mode = "NAME_ONLY";

  if (input.dob && input.tob) {
    birth_datetime_iso = `${input.dob}T${input.tob}:00${input.timezone_offset}`;
    precision_mode = input.pob ? "FULL_BIRTH" : "DOB_TOB";
  } else if (input.dob) {
    // reduced precision birth anchor
    birth_datetime_iso = `${input.dob}T12:00:00${input.timezone_offset}`;
    precision_mode = input.pob ? "DOB_POB_REDUCED" : "DOB_ONLY_REDUCED";
  } else if (input.name) {
    precision_mode = "NAME_ONLY";
  } else {
    precision_mode = "FACTS_ONLY";
  }

  return {
    birth_datetime_iso,
    birthplace: input.pob || null,
    latitude: input.latitude,
    longitude: input.longitude,
    timezone_offset: input.timezone_offset,
    precision_mode
  };
}

function buildCurrentContext(input) {
  const event_datetime_iso = normalizeIsoDateTime(input.current_datetime_iso) || new Date().toISOString();

  return {
    event_datetime_iso,
    latitude: input.latitude,
    longitude: input.longitude,
    timezone_offset: input.timezone_offset
  };
}