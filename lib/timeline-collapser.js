// lib/timeline-collapser.js
// FULL REPLACEMENT — ELITE TIMELINE COLLAPSER V1
// Purpose:
// - NAME_ONLY = age window only
// - NAME+DOB = likely year window
// - FULL_BIRTH / DOB_TOB = prime year + peak phase + confidence
// - Prevent broad output when full birth data exists

function num(v, fb = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fb;
}

function norm(v) {
  return String(v || "").trim();
}

function up(v) {
  return norm(v).toUpperCase();
}

function safeArray(v) {
  return Array.isArray(v) ? v : [];
}

function birthYearFromIso(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.getUTCFullYear();
}

function clampYear(y) {
  const n = Number(y);
  return Number.isFinite(n) && n >= 1900 && n <= 2100 ? n : null;
}

function getModeFlags(subject_context = {}, birth_context = {}) {
  const identityDepth = norm(subject_context.identity_depth);
  const subjectMode = norm(subject_context.subject_mode);
  const precisionMode = norm(birth_context.precision_mode);

  const isNameOnly =
    subject_context.is_name_only_mode === true ||
    identityDepth === "LEVEL_2_NAME_ONLY" ||
    subjectMode === "NAME_ONLY_PAST" ||
    precisionMode === "NAME_ONLY";

  const isNameContext =
    subject_context.is_name_context_mode === true ||
    identityDepth === "LEVEL_3_NAME_CONTEXT" ||
    precisionMode === "NAME_CONTEXT";

  const isReducedDob =
    identityDepth === "LEVEL_4_NAME_DOB" ||
    identityDepth === "LEVEL_3_DOB_ONLY" ||
    precisionMode === "DOB_ONLY_REDUCED" ||
    precisionMode === "DOB_POB_REDUCED";

  const isFullBirth =
    subject_context.is_full_birth_locked === true ||
    identityDepth === "LEVEL_5_FULL_BIRTH" ||
    precisionMode === "FULL_BIRTH" ||
    precisionMode === "DOB_TOB";

  return {
    isNameOnly,
    isNameContext,
    isReducedDob,
    isFullBirth,
    exactCollapseAllowed: isFullBirth,
    yearWindowAllowed: isReducedDob || isFullBirth,
    ageWindowOnly: isNameOnly || isNameContext
  };
}

const DOMAIN_AGE_WINDOWS = {
  EDUCATION: [16, 26],
  JOB: [21, 32],
  CAREER: [23, 36],
  BUSINESS: [25, 42],
  MONEY: [22, 44],
  DEBT: [24, 44],
  PROPERTY: [28, 48],
  VEHICLE: [22, 40],

  LOVE: [20, 32],
  MARRIAGE: [24, 34],
  DIVORCE: [28, 42],
  MULTIPLE_MARRIAGE: [28, 44],
  PARTNERSHIP: [24, 40],
  CHILDREN: [27, 40],

  FOREIGN: [20, 29],
  IMMIGRATION: [20, 31],
  VISA: [19, 30],
  SETTLEMENT: [28, 40],
  DOCUMENT: [20, 42],

  HEALTH: [24, 46],
  MENTAL: [18, 42],
  LEGAL: [26, 44],
  ENEMY: [24, 44],
  BLOCKAGE: [22, 42],
  SUCCESS: [28, 46],
  SPIRITUAL: [28, 50]
};

function ageWindowFor(domainKey) {
  return DOMAIN_AGE_WINDOWS[up(domainKey)] || [22, 40];
}

function yearWindowFromAge(birthYear, domainKey) {
  if (!birthYear) return null;
  const [a, b] = ageWindowFor(domainKey);
  return [birthYear + a, birthYear + b];
}

function domainBaseAge(domainKey) {
  const [a, b] = ageWindowFor(domainKey);
  return Math.round((a + b) / 2);
}

function dashaBias(domainKey, dasha = {}) {
  const key = up(domainKey);
  const lords = [
    up(dasha.mahadasha),
    up(dasha.antardasha),
    up(dasha.pratyantar)
  ].filter(Boolean);

  const map = {
    MARRIAGE: ["VENUS", "JUPITER", "MOON"],
    DIVORCE: ["MARS", "SATURN", "RAHU", "KETU"],
    MULTIPLE_MARRIAGE: ["VENUS", "RAHU", "SATURN"],
    LOVE: ["VENUS", "MOON", "RAHU"],
    PARTNERSHIP: ["VENUS", "MERCURY", "RAHU"],

    FOREIGN: ["RAHU", "SATURN", "MERCURY", "JUPITER"],
    IMMIGRATION: ["RAHU", "SATURN", "MERCURY"],
    VISA: ["MERCURY", "RAHU", "SUN"],
    SETTLEMENT: ["SATURN", "MOON", "VENUS"],

    JOB: ["SATURN", "SUN", "MERCURY"],
    CAREER: ["SUN", "SATURN", "MERCURY"],
    BUSINESS: ["MERCURY", "VENUS", "RAHU", "MARS"],
    MONEY: ["VENUS", "JUPITER", "MERCURY"],

    LEGAL: ["SATURN", "MARS", "SUN", "RAHU"],
    HEALTH: ["SATURN", "MARS", "KETU"],
    MENTAL: ["MOON", "RAHU", "SATURN"],
    PROPERTY: ["MOON", "MARS", "VENUS", "SATURN"]
  };

  const allowed = map[key] || [];
  let score = 0;

  lords.forEach((lord, i) => {
    if (!allowed.includes(lord)) return;
    score += i === 0 ? 3 : i === 1 ? 2 : 1;
  });

  return score;
}

function kpBias(domainKey, kp = {}) {
  const key = up(domainKey);
  const cusps = kp?.cusps || kp?.kp_cusps || {};
  const map = {
    MARRIAGE: ["2", "7", "11"],
    DIVORCE: ["6", "7", "8", "12"],
    MULTIPLE_MARRIAGE: ["2", "7", "8", "11"],
    FOREIGN: ["9", "12"],
    IMMIGRATION: ["9", "12", "4"],
    VISA: ["9", "12", "10"],
    SETTLEMENT: ["4", "12", "10"],
    JOB: ["6", "10", "11"],
    CAREER: ["10", "11"],
    BUSINESS: ["7", "10", "11"],
    MONEY: ["2", "6", "11"],
    PROPERTY: ["4", "11", "2"],
    LEGAL: ["6", "7", "10"],
    HEALTH: ["6", "8", "12"],
    MENTAL: ["1", "4", "8"]
  };

  const required = map[key] || [];
  let score = 0;

  for (const c of required) {
    const cusp = cusps[c];
    if (!cusp) continue;

    if (cusp.sub_lord) score += 1.3;
    if (cusp.star_lord) score += 0.8;
    if (cusp.sign_lord) score += 0.4;
  }

  return score;
}

function transitBias(domainKey, transit = {}) {
  const planets = safeArray(transit.planets);
  const key = up(domainKey);
  let score = 0;

  const activePlanetsByDomain = {
    MARRIAGE: ["VENUS", "JUPITER", "MOON", "RAHU"],
    DIVORCE: ["MARS", "SATURN", "RAHU", "KETU"],
    FOREIGN: ["RAHU", "SATURN", "MERCURY"],
    IMMIGRATION: ["RAHU", "SATURN", "MERCURY"],
    VISA: ["MERCURY", "RAHU", "SUN"],
    BUSINESS: ["MERCURY", "VENUS", "RAHU"],
    JOB: ["SATURN", "SUN", "MERCURY"],
    MONEY: ["VENUS", "JUPITER", "MERCURY"],
    LEGAL: ["SATURN", "MARS", "SUN"],
    HEALTH: ["SATURN", "MARS", "KETU"]
  };

  const active = activePlanetsByDomain[key] || [];

  for (const p of planets) {
    const planet = up(p.planet);
    if (!active.includes(planet)) continue;

    const deg = num(p.degree_in_sign ?? p.degree, 0);
    if (deg >= 0 && deg <= 3) score += 1.2;
    if (deg >= 27 && deg <= 30) score += 1.2;
    if (p.retrograde) score += 0.6;
  }

  return score;
}

function primeYearFromScore({ birthYear, domainKey, event, domain, evidence_packet }) {
  const baseAge = domainBaseAge(domainKey);
  const baseYear = birthYear + baseAge;

  const score = num(domain.normalized_score, 0);
  const eventNo = num(event.event_number, 1);

  const dasha = evidence_packet?.dasha || evidence_packet?.natal?.dasha || {};
  const kp = evidence_packet?.kp || {};
  const transit = evidence_packet?.transit_now || {};

  const dashaScore = dashaBias(domainKey, dasha);
  const kpScore = kpBias(domainKey, kp);
  const transitScore = transitBias(domainKey, transit);

  let shift = 0;

  if (score >= 8) shift -= 1;
  else if (score >= 5) shift += 0;
  else shift += 1;

  if (dashaScore >= 3) shift -= 1;
  if (kpScore >= 3) shift -= 1;
  if (transitScore >= 2) shift += 1;

  shift += Math.max(0, eventNo - 1) * 2;

  const primeYear = clampYear(baseYear + shift);

  return {
    prime_year: primeYear,
    secondary_years: [
      clampYear(primeYear - 1),
      clampYear(primeYear + 1)
    ].filter(Boolean),
    scoring: {
      domain_score: score,
      dasha_score: dashaScore,
      kp_score: kpScore,
      transit_score: transitScore,
      collapse_shift: shift
    }
  };
}

function peakPhase(domainKey) {
  const key = up(domainKey);

  if (["LEGAL", "DOCUMENT", "VISA", "IMMIGRATION"].includes(key)) {
    return "Feb-May / Sep-Nov";
  }

  if (["MONEY", "BUSINESS", "JOB", "CAREER"].includes(key)) {
    return "Mar-Jun / Aug-Oct";
  }

  if (["MARRIAGE", "LOVE", "PARTNERSHIP"].includes(key)) {
    return "Apr-Jul / Oct-Dec";
  }

  if (["DIVORCE", "MULTIPLE_MARRIAGE", "BLOCKAGE"].includes(key)) {
    return "Jan-Apr / Aug-Nov";
  }

  if (["FOREIGN", "SETTLEMENT"].includes(key)) {
    return "Mar-May / Sep-Dec";
  }

  if (["HEALTH", "MENTAL"].includes(key)) {
    return "Jan-Mar / Jul-Sep";
  }

  return "Mar-Jun / Sep-Nov";
}

function confidenceLabel({ modeFlags, event, collapse }) {
  const evidence = up(event.evidence_type);
  const status = up(event.status);
  const s = collapse?.scoring || {};
  const total = num(s.domain_score) + num(s.dasha_score) + num(s.kp_score) + num(s.transit_score);

  if (modeFlags.ageWindowOnly) return "NAME_PATTERN_ONLY";
  if (evidence.includes("DIRECT") && total >= 10) return "HIGH";
  if (modeFlags.exactCollapseAllowed && total >= 8) return "HIGH";
  if (modeFlags.exactCollapseAllowed && total >= 5) return "MEDIUM_HIGH";
  if (modeFlags.yearWindowAllowed) return "MEDIUM";
  if (status === "PATTERN_ONLY") return "LOW_MEDIUM";

  return "MEDIUM";
}

function collapseEvent({ domain, event, birth_context, subject_context, evidence_packet }) {
  const modeFlags = getModeFlags(subject_context, birth_context);
  const birthYear = birthYearFromIso(birth_context?.birth_datetime_iso);
  const domainKey = domain.domain_key;

  const patched = { ...event };

  patched.timeline_collapse = {
    active: true,
    mode:
      modeFlags.ageWindowOnly ? "AGE_WINDOW_ONLY" :
      modeFlags.exactCollapseAllowed ? "FULL_BIRTH_PRIME_YEAR" :
      modeFlags.yearWindowAllowed ? "DOB_YEAR_WINDOW" :
      "GENERAL_PATTERN"
  };

  if (modeFlags.ageWindowOnly || !birthYear) {
    patched.exact_year = null;
    patched.date_marker = null;
    patched.likely_age_window = patched.likely_age_window || ageWindowFor(domainKey);
    patched.likely_year_window = null;
    patched.month_or_phase = `likely age window ${patched.likely_age_window[0]}-${patched.likely_age_window[1]}`;
    patched.precision_label = "AGE_WINDOW_ONLY";
    patched.confidence_label = "NAME_PATTERN_ONLY";
    return patched;
  }

  const yw = yearWindowFromAge(birthYear, domainKey);

  if (modeFlags.yearWindowAllowed && !modeFlags.exactCollapseAllowed) {
    patched.exact_year = null;
    patched.date_marker = null;
    patched.likely_age_window = patched.likely_age_window || ageWindowFor(domainKey);
    patched.likely_year_window = yw;
    patched.month_or_phase = `likely year window ${yw[0]}-${yw[1]}`;
    patched.precision_label = "LIKELY_YEAR_WINDOW";
    patched.confidence_label = "MEDIUM";
    return patched;
  }

  const collapse = primeYearFromScore({
    birthYear,
    domainKey,
    event: patched,
    domain,
    evidence_packet
  });

  patched.exact_year = collapse.prime_year;
  patched.date_marker = collapse.prime_year;
  patched.primary_year = collapse.prime_year;
  patched.secondary_years = collapse.secondary_years;
  patched.likely_age_window = ageWindowFor(domainKey);
  patched.likely_year_window = yw;
  patched.peak_phase = peakPhase(domainKey);
  patched.month_or_phase = `${collapse.prime_year} prime | ${peakPhase(domainKey)}`;
  patched.precision_label = "PRIME_YEAR_COLLAPSED";
  patched.confidence_label = confidenceLabel({ modeFlags, event: patched, collapse });
  patched.timeline_collapse = {
    ...patched.timeline_collapse,
    ...collapse
  };

  return patched;
}

export function runTimelineCollapser({
  ranked_domains = [],
  birth_context = {},
  subject_context = {},
  evidence_packet = {}
}) {
  const modeFlags = getModeFlags(subject_context, birth_context);

  const collapsed_domains = safeArray(ranked_domains).map((domain) => {
    const events = safeArray(domain.events).map((event) =>
      collapseEvent({
        domain,
        event,
        birth_context,
        subject_context,
        evidence_packet
      })
    );

    return {
      ...domain,
      events,
      timeline_collapse_active: true,
      timeline_precision_mode:
        modeFlags.ageWindowOnly ? "AGE_WINDOW_ONLY" :
        modeFlags.exactCollapseAllowed ? "FULL_BIRTH_PRIME_YEAR" :
        modeFlags.yearWindowAllowed ? "DOB_YEAR_WINDOW" :
        "GENERAL_PATTERN"
    };
  });

  const collapsed_timeline = collapsed_domains.flatMap((d) =>
    safeArray(d.events).map((e) => ({
      domain: d.domain_label,
      domain_key: d.domain_key,
      event_type: e.event_type,
      status: e.status,
      evidence_type: e.evidence_type,
      exact_year: e.exact_year ?? null,
      date_marker: e.date_marker ?? null,
      primary_year: e.primary_year ?? null,
      secondary_years: e.secondary_years || [],
      likely_age_window: e.likely_age_window || null,
      likely_year_window: e.likely_year_window || null,
      peak_phase: e.peak_phase || null,
      month_or_phase: e.month_or_phase || null,
      precision_label: e.precision_label || null,
      confidence_label: e.confidence_label || null,
      timeline_collapse: e.timeline_collapse || null
    }))
  );

  return {
    timeline_collapse_version: "ELITE_TIMELINE_COLLAPSER_V1",
    mode_flags: modeFlags,
    collapsed_domains,
    collapsed_timeline
  };
}