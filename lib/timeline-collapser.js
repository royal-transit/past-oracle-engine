// lib/timeline-collapser.js
// FULL REPLACEMENT — ELITE TIMELINE COLLAPSER V2.1
// Fix:
// - NAME_ONLY now produces strong collapsed_timeline from ranked domains
// - NAME_ONLY does NOT claim executed events
// - NAME_ONLY = strong domain signature + age window only
// - NAME_CONTEXT = strong context-supported signature + age window only
// - DOB = likely year window
// - FULL_BIRTH = prime year candidate
// - DIRECT_FACT only can seal executed certainty

const VERSION = "ELITE_TIMELINE_COLLAPSER_V2.1";

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

function clampYear(y) {
  const n = Number(y);
  return Number.isFinite(n) && n >= 1900 && n <= 2100 ? n : null;
}

function birthYearFromIso(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.getUTCFullYear();
}

function isDirectEvidence(evidenceType) {
  return ["DIRECT", "DIRECT_FACT", "FACT_ANCHORED"].includes(up(evidenceType));
}

function getModeFlags(subject_context = {}, birth_context = {}) {
  const identityDepth = norm(subject_context.identity_depth);
  const subjectMode = norm(subject_context.subject_mode);
  const precisionMode = norm(birth_context.precision_mode || subject_context.precision_mode);

  const isNameOnly =
    subject_context.is_name_only_mode === true ||
    identityDepth === "LEVEL_2_NAME_ONLY" ||
    subjectMode === "NAME_ONLY_PAST" ||
    precisionMode === "NAME_ONLY";

  const isNameContext =
    subject_context.is_name_context_mode === true ||
    identityDepth === "LEVEL_3_NAME_CONTEXT" ||
    subjectMode === "NAME_CONTEXT_PAST" ||
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
    ageWindowOnly: isNameOnly || isNameContext,
    yearWindowAllowed: isReducedDob || isFullBirth,
    primeYearAllowed: isFullBirth
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
  SPIRITUAL: [28, 50],
  RELIGION: [28, 50]
};

function ageWindowFor(domainKey) {
  return DOMAIN_AGE_WINDOWS[up(domainKey)] || [22, 40];
}

function yearWindowFromAge(birthYear, domainKey) {
  if (!birthYear) return null;
  const [a, b] = ageWindowFor(domainKey);
  return [birthYear + a, birthYear + b];
}

function domainPeakRatio(domainKey) {
  const k = up(domainKey);
  if (["EDUCATION", "FOREIGN", "IMMIGRATION", "VISA"].includes(k)) return 0.25;
  if (["LOVE", "MARRIAGE", "PARTNERSHIP"].includes(k)) return 0.45;
  if (["JOB", "CAREER", "BUSINESS", "MONEY", "VEHICLE"].includes(k)) return 0.55;
  if (["DIVORCE", "LEGAL", "DOCUMENT", "DEBT", "BLOCKAGE"].includes(k)) return 0.62;
  if (["SETTLEMENT", "PROPERTY", "HOME"].includes(k)) return 0.68;
  if (["HEALTH", "MENTAL"].includes(k)) return 0.58;
  return 0.5;
}

function peakPhase(domainKey) {
  const k = up(domainKey);
  if (["LEGAL", "DOCUMENT", "VISA", "IMMIGRATION"].includes(k)) return "Feb-May / Sep-Nov";
  if (["MONEY", "BUSINESS", "JOB", "CAREER"].includes(k)) return "Mar-Jun / Aug-Oct";
  if (["MARRIAGE", "LOVE", "PARTNERSHIP"].includes(k)) return "Apr-Jul / Oct-Dec";
  if (["DIVORCE", "MULTIPLE_MARRIAGE", "BLOCKAGE"].includes(k)) return "Jan-Apr / Aug-Nov";
  if (["FOREIGN", "SETTLEMENT"].includes(k)) return "Mar-May / Sep-Dec";
  if (["HEALTH", "MENTAL"].includes(k)) return "Jan-Mar / Jul-Sep";
  return "Mar-Jun / Sep-Nov";
}

function dashaBias(domainKey, dasha = {}) {
  const k = up(domainKey);
  const active = [
    up(dasha.mahadasha || dasha.maha_lord || dasha.md),
    up(dasha.antardasha || dasha.antar_lord || dasha.ad),
    up(dasha.pratyantar || dasha.pratyantar_lord || dasha.pd)
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
    DOCUMENT: ["MERCURY", "SATURN", "SUN"],
    HEALTH: ["SATURN", "MARS", "KETU"],
    MENTAL: ["MOON", "RAHU", "SATURN"],
    PROPERTY: ["MOON", "MARS", "VENUS", "SATURN"],
    VEHICLE: ["VENUS", "MARS", "RAHU"]
  };

  const allowed = map[k] || [];
  let score = 0;

  active.forEach((lord, i) => {
    if (!allowed.includes(lord)) return;
    score += i === 0 ? 3 : i === 1 ? 2 : 1;
  });

  return score;
}

function kpBias(domainKey, kp = {}) {
  const cusps = kp?.cusps || kp?.kp_cusps || kp || {};
  const k = up(domainKey);

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
    VEHICLE: ["4", "3", "11"],
    LEGAL: ["6", "7", "10"],
    DOCUMENT: ["3", "6", "10"],
    HEALTH: ["6", "8", "12"],
    MENTAL: ["1", "4", "8"]
  };

  const required = map[k] || [];
  let score = 0;

  for (const c of required) {
    const cusp = cusps[c];
    if (!cusp) continue;
    if (cusp.sub_lord) score += 1.4;
    if (cusp.star_lord) score += 0.8;
    if (cusp.sign_lord) score += 0.35;
  }

  return score;
}

function supportBias(domain = {}) {
  let s = 0;
  s += safeArray(domain.house_hits).length * 0.5;
  s += safeArray(domain.aspect_hits).length * 0.3;
  s += safeArray(domain.kp_reasons).length * 0.45;
  s += safeArray(domain.dasha_reasons).length * 0.5;
  s += num(domain.support_count) * 0.25;
  return Math.min(6, s);
}

function collapseWidth(totalScore) {
  if (totalScore >= 18) return 1;
  if (totalScore >= 14) return 2;
  if (totalScore >= 10) return 3;
  return 4;
}

function syntheticEventFromDomain(domain = {}, modeFlags = {}) {
  const domainKey = up(domain.domain_key);
  const score = num(domain.normalized_score || domain.rank_score);

  if (score <= 0) return null;

  const label =
    modeFlags.ageWindowOnly
      ? "name-pattern signature"
      : "likely past signature";

  return {
    event_family: "NAME_PATTERN_LEDGER",
    event_type: `${label} — ${domain.domain_label || domainKey}`,
    event_number: 1,
    exact_year: null,
    date_marker: null,
    evidence_strength: score >= 7 ? "strong" : score >= 5 ? "medium_high" : "medium",
    status: "NAME_PATTERN_CANDIDATE",
    importance: score >= 6 ? "MAJOR" : "SUPPORT",
    trigger_phase: "name vibration + ranked domain signature",
    carryover_to_present: domain.present_carryover || "UNKNOWN",
    who_involved: "self / domain-linked people",
    impact_summary: "Name-only mode: strong likely domain signature; executed event not sealed.",
    evidence_type: "NAME_PATTERN",
    likely_age_window: ageWindowFor(domainKey),
    likely_year_window: null,
    broad_year_window: null,
    timing_mode: "AGE_WINDOW_ONLY",
    exact_claim_locked: true,
    execution_claim_allowed: false,
    score
  };
}

function ensureEventsForDomain(domain = {}, modeFlags = {}) {
  const existing = safeArray(domain.events);
  if (existing.length > 0) return existing;

  if (modeFlags.ageWindowOnly) {
    const synthetic = syntheticEventFromDomain(domain, modeFlags);
    return synthetic ? [synthetic] : [];
  }

  return [];
}

function primeYearFromWindow({ birthYear, domainKey, event, domain, evidence_packet }) {
  const broad = yearWindowFromAge(birthYear, domainKey);
  if (!broad) return null;

  const [start, end] = broad;
  const span = Math.max(1, end - start);

  const dashaScore = dashaBias(domainKey, evidence_packet?.dasha || evidence_packet?.natal?.dasha || {});
  const kpScore = kpBias(domainKey, evidence_packet?.kp || evidence_packet?.kp_cusps || {});
  const sBias = supportBias(domain);
  const domainScore = num(domain.normalized_score);
  const eventScore = num(event.score);

  const totalScore = domainScore + eventScore * 0.25 + dashaScore + kpScore + sBias;

  let ratio = domainPeakRatio(domainKey);

  if (dashaScore >= 3) ratio -= 0.08;
  if (kpScore >= 3) ratio -= 0.05;
  if (sBias >= 4) ratio += 0.04;
  if (up(event.status) === "VERY_HIGH_PROBABILITY") ratio += 0.03;

  ratio = Math.max(0.12, Math.min(0.88, ratio));

  let prime = clampYear(Math.round(start + span * ratio));
  if (!prime) prime = clampYear(Math.round((start + end) / 2));

  const width = collapseWidth(totalScore);
  const years = [];

  for (let i = -width; i <= width; i++) {
    const y = clampYear(prime + i);
    if (y && y >= start && y <= end) years.push(y);
  }

  return {
    prime_year: prime,
    secondary_years: years.filter((y) => y !== prime),
    narrowed_year_window: [Math.min(...years), Math.max(...years)],
    broad_year_window: broad,
    scoring: {
      domain_score: domainScore,
      event_score: eventScore,
      dasha_score: dashaScore,
      kp_score: kpScore,
      support_bias: Math.round(sBias * 100) / 100,
      total_timeline_score: Math.round(totalScore * 100) / 100,
      peak_ratio: Math.round(ratio * 100) / 100
    }
  };
}

function confidenceLabel({ modeFlags, event, collapse }) {
  const evidence = up(event.evidence_type);
  const total = num(collapse?.scoring?.total_timeline_score || event.score);

  if (modeFlags.ageWindowOnly) {
    if (total >= 7) return "STRONG_NAME_PATTERN";
    if (total >= 5) return "MEDIUM_HIGH_NAME_PATTERN";
    return "NAME_PATTERN_ONLY";
  }

  if (isDirectEvidence(evidence) && total >= 12) return "HIGH_FACT_ANCHORED";
  if (modeFlags.primeYearAllowed && total >= 18) return "HIGH";
  if (modeFlags.primeYearAllowed && total >= 14) return "MEDIUM_HIGH";
  if (modeFlags.primeYearAllowed && total >= 10) return "MEDIUM";
  if (modeFlags.yearWindowAllowed) return "MEDIUM";

  return "LOW_MEDIUM";
}

function collapseEvent({ domain, event, birth_context, subject_context, evidence_packet }) {
  const modeFlags = getModeFlags(subject_context, birth_context);
  const birthYear = birthYearFromIso(birth_context?.birth_datetime_iso);
  const domainKey = domain.domain_key;
  const e = { ...event };

  e.timeline_collapse = {
    active: true,
    version: VERSION,
    mode:
      modeFlags.ageWindowOnly ? "AGE_WINDOW_ONLY" :
      modeFlags.primeYearAllowed ? "FULL_BIRTH_PRIME_YEAR" :
      modeFlags.yearWindowAllowed ? "DOB_YEAR_WINDOW" :
      "GENERAL_PATTERN"
  };

  if (modeFlags.ageWindowOnly || !birthYear) {
    e.exact_year = null;
    e.date_marker = null;
    e.primary_year = null;
    e.secondary_years = [];
    e.likely_age_window = e.likely_age_window || ageWindowFor(domainKey);
    e.likely_year_window = null;
    e.broad_year_window = null;
    e.peak_phase = peakPhase(domainKey);
    e.month_or_phase = `likely age window ${e.likely_age_window[0]}-${e.likely_age_window[1]} | ${e.peak_phase}`;
    e.precision_label = "AGE_WINDOW_ONLY";
    e.confidence_label = confidenceLabel({ modeFlags, event: e, collapse: null });
    e.execution_claim_allowed = false;
    e.exact_claim_locked = true;
    e.status = up(e.status) === "EXECUTED" ? "NAME_PATTERN_CANDIDATE" : e.status;
    e.evidence_type = e.evidence_type || "NAME_PATTERN";

    e.timeline_collapse = {
      ...e.timeline_collapse,
      age_window: e.likely_age_window,
      scoring: {
        domain_score: num(domain.normalized_score),
        event_score: num(e.score),
        support_bias: supportBias(domain),
        total_timeline_score: Math.round((num(domain.normalized_score) + num(e.score) + supportBias(domain)) * 100) / 100
      }
    };

    return e;
  }

  const broad = yearWindowFromAge(birthYear, domainKey);

  if (modeFlags.yearWindowAllowed && !modeFlags.primeYearAllowed) {
    e.exact_year = null;
    e.date_marker = null;
    e.primary_year = null;
    e.secondary_years = [];
    e.likely_age_window = e.likely_age_window || ageWindowFor(domainKey);
    e.likely_year_window = broad;
    e.month_or_phase = `likely year window ${broad[0]}-${broad[1]} | ${peakPhase(domainKey)}`;
    e.precision_label = "LIKELY_YEAR_WINDOW";
    e.confidence_label = "MEDIUM";
    e.execution_claim_allowed = false;
    e.exact_claim_locked = true;
    return e;
  }

  const collapse = primeYearFromWindow({
    birthYear,
    domainKey,
    event: e,
    domain,
    evidence_packet
  });

  e.primary_year = collapse?.prime_year ?? null;
  e.secondary_years = collapse?.secondary_years || [];
  e.likely_age_window = ageWindowFor(domainKey);
  e.likely_year_window = collapse?.narrowed_year_window || broad;
  e.broad_year_window = collapse?.broad_year_window || broad;
  e.peak_phase = peakPhase(domainKey);
  e.month_or_phase = `${e.primary_year || "UNKNOWN"} prime | ${e.peak_phase}`;
  e.precision_label = "PRIME_YEAR_CANDIDATE";
  e.confidence_label = confidenceLabel({ modeFlags, event: e, collapse });

  if (isDirectEvidence(e.evidence_type)) {
    e.exact_year = e.exact_year || e.primary_year;
    e.date_marker = e.exact_year;
    e.execution_claim_allowed = true;
    e.exact_claim_locked = false;
  } else {
    e.exact_year = null;
    e.date_marker = null;
    e.execution_claim_allowed = false;
    e.exact_claim_locked = true;
  }

  e.timeline_collapse = {
    ...e.timeline_collapse,
    ...collapse
  };

  return e;
}

export function runTimelineCollapser({
  ranked_domains = [],
  birth_context = {},
  subject_context = {},
  evidence_packet = {}
}) {
  const modeFlags = getModeFlags(subject_context, birth_context);

  const collapsed_domains = safeArray(ranked_domains).map((domain) => {
    const sourceEvents = ensureEventsForDomain(domain, modeFlags);

    const events = sourceEvents.map((event) =>
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
      major_event_count: events.filter((e) => up(e.importance) === "MAJOR").length,
      active_event_count: events.length,
      timeline_collapse_active: true,
      timeline_precision_mode:
        modeFlags.ageWindowOnly ? "AGE_WINDOW_ONLY" :
        modeFlags.primeYearAllowed ? "FULL_BIRTH_PRIME_YEAR" :
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
      broad_year_window: e.broad_year_window || null,
      peak_phase: e.peak_phase || null,
      month_or_phase: e.month_or_phase || null,
      precision_label: e.precision_label || null,
      confidence_label: e.confidence_label || null,
      timeline_collapse: e.timeline_collapse || null
    }))
  );

  return {
    timeline_collapse_version: VERSION,
    mode_flags: modeFlags,
    collapsed_domains,
    collapsed_timeline
  };
}