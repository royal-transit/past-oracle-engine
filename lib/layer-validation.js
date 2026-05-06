// lib/layer-validation.js
// FULL REPLACEMENT — UNIVERSAL VALIDATION ENGINE V8
// PURPOSE:
// - Signal inflation control
// - Pattern ≠ executed
// - Cross-layer convergence scoring
// - Contradiction suppression
// - Domain dominance arbitration
// - NAME_ONLY safe: gives strong pattern, not executed truth

const ENGINE = "UNIVERSAL_VALIDATION_ENGINE_V8";

const FINAL = {
  EXECUTED: "EXECUTED",
  IN_PROGRESS: "IN_PROGRESS",
  PARTIAL: "PARTIAL",
  NOT_EXECUTED: "NOT_EXECUTED",
  UNKNOWN: "UNKNOWN"
};

function up(v) {
  return String(v || "").trim().toUpperCase();
}

function low(v) {
  return String(v || "").trim().toLowerCase();
}

function arr(v) {
  return Array.isArray(v) ? v : [];
}

function num(v, fb = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fb;
}

function clamp(n, min = 0, max = 10) {
  return Math.max(min, Math.min(max, Number(n || 0)));
}

function hasEvent(domain) {
  return arr(domain?.events).length > 0 || !!domain?.primary_exact_event;
}

function eventEvidence(domain) {
  const events = [
    ...arr(domain?.events),
    ...(domain?.primary_exact_event ? [domain.primary_exact_event] : [])
  ];

  const types = events.map((e) => up(e?.evidence_type));

  return {
    has_direct: types.includes("DIRECT") || types.includes("DIRECT_FACT") || types.includes("FACT_ANCHORED"),
    has_name_pattern: types.includes("NAME_PATTERN"),
    has_pattern: types.includes("PATTERN_ONLY") || types.includes("LIKELY_HISTORY") || types.includes("NAME_PATTERN"),
    evidence_count: events.length
  };
}

function domainBase(domain) {
  const score = num(domain?.normalized_score, 0);
  const kp = num(domain?.kp_weight, 0);
  const dasha = num(domain?.dasha_weight, 0);
  const houseHits = arr(domain?.house_hits).length;
  const aspectHits = arr(domain?.aspect_hits).length;
  const ev = eventEvidence(domain);

  let convergence = 0;

  convergence += Math.min(score / 2, 4);
  convergence += Math.min(kp, 3);
  convergence += Math.min(dasha, 2);
  convergence += Math.min(houseHits * 0.5, 2);
  convergence += Math.min(aspectHits * 0.25, 1.5);
  convergence += ev.has_direct ? 3 : 0;
  convergence += ev.has_name_pattern ? 0.8 : 0;
  convergence += ev.evidence_count ? 0.7 : 0;

  return clamp(convergence, 0, 10);
}

const FAMILY_GROUPS = {
  relationship: ["MARRIAGE", "DIVORCE", "MULTIPLE_MARRIAGE", "LOVE", "PARTNERSHIP"],
  foreign: ["FOREIGN", "IMMIGRATION", "VISA", "SETTLEMENT"],
  work: ["JOB", "CAREER", "BUSINESS"],
  money: ["MONEY", "DEBT", "PROPERTY", "GAIN", "LOSS"],
  health: ["HEALTH", "MENTAL"],
  authority: ["LEGAL", "DOCUMENT"],
  spiritual: ["SPIRITUAL", "RELIGION"],
  support: ["NETWORK", "COMMUNICATION"]
};

function familyOf(domainKey) {
  const k = up(domainKey);
  for (const [family, keys] of Object.entries(FAMILY_GROUPS)) {
    if (keys.includes(k)) return family;
  }
  return "general";
}

function contradictionPenalty(domainKey, allDomains) {
  const k = up(domainKey);
  let penalty = 0;

  const map = {};
  for (const d of arr(allDomains)) {
    map[up(d?.domain_key)] = domainBase(d);
  }

  if (k === "MARRIAGE" && map.DIVORCE >= 6) penalty += 1.2;
  if (k === "DIVORCE" && map.MARRIAGE >= 6) penalty += 1.2;

  if (k === "JOB" && map.BUSINESS >= 7) penalty += 0.8;
  if (k === "BUSINESS" && map.JOB >= 7) penalty += 0.5;

  if (k === "SETTLEMENT" && map.FOREIGN < 3 && map.IMMIGRATION < 3) penalty += 1.5;
  if (k === "VISA" && map.FOREIGN < 3 && map.IMMIGRATION < 3) penalty += 0.8;

  if (k === "SUCCESS" && map.FAILURE >= 7) penalty += 1.5;
  if (k === "FAILURE" && map.SUCCESS >= 7) penalty += 1.2;

  return penalty;
}

function modePenalty(domain, eventInput) {
  const mode = up(eventInput?.precision_mode || eventInput?.subject_mode || "");
  const ev = eventEvidence(domain);

  if (mode.includes("NAME_ONLY") && !ev.has_direct) return 1.4;
  if (mode.includes("NAME_CONTEXT") && !ev.has_direct) return 0.9;

  return 0;
}

function validateDomain(domain, allDomains, eventInput = {}) {
  const base = domainBase(domain);
  const penalty =
    contradictionPenalty(domain?.domain_key, allDomains) +
    modePenalty(domain, eventInput);

  const finalScore = clamp(base - penalty, 0, 10);

  let validation_status = "WEAK_MATCH";
  if (finalScore >= 8) validation_status = "STRONG_MATCH";
  else if (finalScore >= 5.5) validation_status = "PARTIAL_MATCH";
  else if (finalScore >= 3.5) validation_status = "LIGHT_MATCH";

  const ev = eventEvidence(domain);

  return {
    domain_key: domain?.domain_key,
    domain_label: domain?.domain_label,
    family: familyOf(domain?.domain_key),
    raw_convergence_score: base,
    contradiction_penalty: penalty,
    validation_score: finalScore,
    validation_status,
    has_direct_evidence: ev.has_direct,
    has_pattern_evidence: ev.has_pattern,
    has_name_pattern: ev.has_name_pattern,
    evidence_count: ev.evidence_count,
    survives_validation: finalScore >= 3.5,
    dominance_ready: finalScore >= 5.5
  };
}

function rankDominantDomains(rows) {
  return arr(rows)
    .filter((r) => r.survives_validation)
    .sort((a, b) => b.validation_score - a.validation_score)
    .map((r, i) => ({
      ...r,
      dominance_rank: i + 1,
      dominant: i < 3
    }));
}

function buildSectorState(rows) {
  const byKey = {};
  for (const r of arr(rows)) byKey[low(r.domain_key)] = r;

  const stateFrom = (...keys) => {
    const best = keys
      .map((k) => byKey[low(k)])
      .filter(Boolean)
      .sort((a, b) => b.validation_score - a.validation_score)[0];

    if (!best) return FINAL.UNKNOWN;
    if (best.has_direct_evidence && best.validation_score >= 6) return FINAL.EXECUTED;
    if (best.validation_score >= 7) return FINAL.PARTIAL;
    return FINAL.UNKNOWN;
  };

  return {
    marriage: stateFrom("MARRIAGE"),
    divorce: stateFrom("DIVORCE"),
    multiple_marriage: stateFrom("MULTIPLE_MARRIAGE"),
    foreign: stateFrom("FOREIGN", "IMMIGRATION", "VISA"),
    settlement: stateFrom("SETTLEMENT"),
    immigration: stateFrom("IMMIGRATION"),
    visa: stateFrom("VISA"),
    education: stateFrom("EDUCATION"),
    job: stateFrom("JOB"),
    career: stateFrom("CAREER"),
    business: stateFrom("BUSINESS"),
    money: stateFrom("MONEY", "GAIN"),
    property: stateFrom("PROPERTY"),
    health: stateFrom("HEALTH"),
    mental: stateFrom("MENTAL"),
    legal: stateFrom("LEGAL", "DOCUMENT"),
    family: stateFrom("FAMILY"),
    children: stateFrom("CHILDREN"),
    blockage: stateFrom("BLOCKAGE"),
    enemy: stateFrom("ENEMY"),
    debt: stateFrom("DEBT"),
    partnership: stateFrom("PARTNERSHIP")
  };
}

function detectQuestionIntent(question = "") {
  const q = low(question);

  return {
    asks_marriage: /marriage|wife|husband|biye|bea|nikah/.test(q),
    asks_divorce: /divorce|separation|talak|broken/.test(q),
    asks_foreign: /foreign|abroad|uk|visa|immigration|bidesh/.test(q),
    asks_settlement: /settlement|ilr|permanent|residence/.test(q),
    asks_education: /study|education|student|university|college/.test(q),
    asks_job: /job|work|employment|salary/.test(q),
    asks_business: /business|trade|company|client|shop/.test(q),
    asks_money: /money|income|debt|loan|cash|profit/.test(q),
    asks_property: /property|house|land|flat|vehicle|car/.test(q),
    asks_health: /health|illness|disease|hospital|surgery/.test(q),
    asks_mental: /mental|stress|anxiety|fear|depression/.test(q),
    asks_legal: /legal|case|court|appeal|tribunal|penalty/.test(q),
    asks_family: /family|father|mother|parent|brother|sister/.test(q),
    asks_children: /child|children|baby|son|daughter/.test(q),
    asks_general: !q || /past|history|general/.test(q)
  };
}

function buildSectorValidation(questionIntent, sectorState) {
  return Object.keys(sectorState).map((sector) => {
    const askKey = `asks_${sector}`;
    const checked = !!questionIntent[askKey];

    return {
      sector: sector.toUpperCase(),
      checked,
      question_validity: checked ? "VALID" : "NOT_TRIGGERED",
      reality_conflict: "NO",
      correction_needed: "NO",
      detected_correction: null,
      backend_state: sectorState[sector] || FINAL.UNKNOWN
    };
  });
}

function validationSummary(rows, sectorValidation) {
  const checked = arr(sectorValidation).filter((r) => r.checked);
  const conflicts = checked.filter((r) => r.reality_conflict === "YES");
  const strong = arr(rows).filter((r) => r.validation_status === "STRONG_MATCH");
  const partial = arr(rows).filter((r) => r.validation_status === "PARTIAL_MATCH");

  return {
    checked_sector_count: checked.length,
    conflict_sector_count: conflicts.length,
    overall_question_validity: conflicts.length ? "DISTORTED_OR_CONFLICTED" : "STABLE",
    overall_reality_conflict: conflicts.length ? "YES" : "NO",
    correction_needed: conflicts.length ? "YES" : "NO",
    dominant_conflict_sector: conflicts[0]?.sector || null,
    strong_domain_count: strong.length,
    partial_domain_count: partial.length,
    validation_engine: ENGINE
  };
}

function kpPastValidation(snapshot = {}, eventInput = {}) {
  const domain = up(eventInput?.domain || "GENERAL");
  const cusps = snapshot?.kp_cusps || {};
  const domains = arr(snapshot?.domain_results);

  const required =
    domain === "FOREIGN" || domain === "IMMIGRATION" || domain === "VISA"
      ? ["9", "12", "4", "10"]
      : domain === "MARRIAGE"
      ? ["7", "2", "8"]
      : domain === "BUSINESS"
      ? ["7", "10", "11"]
      : domain === "JOB"
      ? ["6", "10"]
      : domain === "LEGAL"
      ? ["6", "7", "10"]
      : ["1", "3", "7", "10", "11"];

  const activated = [];

  for (const c of required) {
    const cusp = cusps[c];
    if (!cusp) continue;
    if (cusp.sub_lord || cusp.star_lord) {
      activated.push({
        cusp: c,
        star_lord: cusp.star_lord || null,
        sub_lord: cusp.sub_lord || null
      });
    }
  }

  const score = Math.min(10, activated.length * 1.6);

  return {
    kp_past_validation_active: true,
    event_domain: domain,
    required_kp_cusps: required,
    allowed_domain_keys: domains.map((d) => d.domain_key).filter(Boolean),
    activated_kp_cusps: activated,
    house_hit_fallback_used: false,
    fallback_house_hits: [],
    kp_validation_score: score,
    kp_validation_status:
      score >= 7 ? "STRONG_MATCH" : score >= 4 ? "PARTIAL_MATCH" : "WEAK_MATCH",
    kp_validation_reasons: activated.map(
      (x) => `KP cusp ${x.cusp} star ${x.star_lord || "-"} sub ${x.sub_lord || "-"}`
    ),
    mode_note: "PAST_KP_VALIDATION_ONLY_NOT_FUTURE_DECISION"
  };
}

export function runValidationLayer({
  question = "",
  finalizedDomains = [],
  snapshot = {},
  eventInput = {}
} = {}) {
  const question_intent = detectQuestionIntent(question);

  const rawRows = arr(finalizedDomains).map((d) =>
    validateDomain(d, finalizedDomains, eventInput)
  );

  const domain_validation = rankDominantDomains(rawRows);

  const sector_state = buildSectorState(domain_validation);
  const sector_validation = buildSectorValidation(question_intent, sector_state);

  return {
    engine_status: ENGINE,
    question_intent,
    domain_validation,
    dominant_domains: domain_validation.filter((r) => r.dominant),
    suppressed_domains: rawRows
      .filter((r) => !r.survives_validation)
      .map((r) => ({
        domain_key: r.domain_key,
        domain_label: r.domain_label,
        validation_score: r.validation_score,
        reason: "LOW_CONVERGENCE_OR_SUPPRESSED_BY_CONTRADICTION"
      })),
    sector_state,
    sector_validation,
    validation_summary: validationSummary(domain_validation, sector_validation),
    kp_past_validation: kpPastValidation(snapshot, eventInput)
  };
}

export default runValidationLayer;