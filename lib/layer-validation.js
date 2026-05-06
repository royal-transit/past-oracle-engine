// lib/layer-validation.js
// FULL REPLACEMENT — UNIVERSAL VALIDATION LAYER V3
// Pattern ≠ executed
// Name-only = safe pattern mode
// Facts = validation anchor, not source overwrite

function up(v) {
  return String(v || "").trim().toUpperCase();
}

function safeArray(v) {
  return Array.isArray(v) ? v : [];
}

const SECTORS = [
  "MARRIAGE",
  "DIVORCE",
  "FOREIGN",
  "SETTLEMENT",
  "EDUCATION",
  "JOB",
  "BUSINESS",
  "MONEY",
  "PROPERTY",
  "HEALTH",
  "MENTAL",
  "LEGAL",
  "FAMILY",
  "CHILDREN"
];

function detectIntent(question = "") {
  const q = String(question || "").toLowerCase();

  return {
    asks_marriage: /marriage|married|wife|husband|biye|bea/.test(q),
    asks_divorce: /divorce|separation|break|talak/.test(q),
    asks_foreign: /foreign|abroad|uk|visa|immigration|bidesh/.test(q),
    asks_settlement: /settlement|ilr|appeal|refusal|resident/.test(q),
    asks_education: /study|education|university|student|exam/.test(q),
    asks_job: /job|work|employment|career/.test(q),
    asks_business: /business|trade|client|company|shop/.test(q),
    asks_money: /money|income|debt|loan|cash|profit/.test(q),
    asks_property: /property|house|land|flat|asset|vehicle|car/.test(q),
    asks_health: /health|illness|sick|hospital|disease/.test(q),
    asks_mental: /mental|stress|fear|anxiety|depression|overthinking/.test(q),
    asks_legal: /legal|court|case|penalty|tribunal|authority|document/.test(q),
    asks_family: /family|father|mother|parent|brother|sister/.test(q),
    asks_children: /child|children|baby|son|daughter|pregnancy/.test(q),
    asks_general: !q || /past|history|general/.test(q)
  };
}

function sectorToDomains(sector) {
  const map = {
    MARRIAGE: ["MARRIAGE", "PARTNERSHIP", "LOVE"],
    DIVORCE: ["DIVORCE", "MULTIPLE_MARRIAGE"],
    FOREIGN: ["FOREIGN", "IMMIGRATION", "VISA"],
    SETTLEMENT: ["SETTLEMENT"],
    EDUCATION: ["EDUCATION"],
    JOB: ["JOB", "CAREER"],
    BUSINESS: ["BUSINESS"],
    MONEY: ["MONEY", "DEBT", "GAIN", "LOSS"],
    PROPERTY: ["PROPERTY", "HOME", "VEHICLE"],
    HEALTH: ["HEALTH"],
    MENTAL: ["MENTAL", "MIND"],
    LEGAL: ["LEGAL", "DOCUMENT"],
    FAMILY: ["FAMILY", "HOME"],
    CHILDREN: ["CHILDREN"]
  };

  return map[sector] || [];
}

function pickState(...states) {
  const s = states.map(up);
  if (s.includes("EXECUTED")) return "EXECUTED";
  if (s.includes("IN_PROGRESS")) return "IN_PROGRESS";
  if (s.includes("PARTIAL")) return "PARTIAL";
  if (s.includes("BROKEN")) return "BROKEN";
  if (s.includes("NOT_EXECUTED")) return "NOT_EXECUTED";
  return "UNKNOWN";
}

function buildDomainMap(finalizedDomains = []) {
  const map = {};
  for (const d of safeArray(finalizedDomains)) {
    if (!d?.domain_key) continue;
    map[up(d.domain_key)] = {
      final_state: up(d.final_state || "UNKNOWN"),
      score: Number(d.normalized_score || d.rank_score || 0),
      pattern_mode_active: !!d.pattern_mode_active,
      direct_evidence_count: Number(d.direct_evidence_count || 0),
      pattern_evidence_count: Number(d.pattern_evidence_count || 0)
    };
  }
  return map;
}

function getSectorState(sector, domainMap) {
  const domains = sectorToDomains(sector);
  return pickState(...domains.map((d) => domainMap[d]?.final_state || "UNKNOWN"));
}

function isWeakMode(snapshot = {}) {
  const mode =
    snapshot?.subject_context?.subject_mode ||
    snapshot?.birth_context?.precision_mode ||
    snapshot?.mode ||
    "";

  return /NAME_ONLY|NAME_CONTEXT/i.test(String(mode));
}

function buildSectorValidationRow(sector, intent, backendState, weakMode) {
  const intentKey = `asks_${sector.toLowerCase()}`;
  const checked = !!intent[intentKey];

  if (weakMode) {
    return {
      sector,
      checked,
      question_validity: checked ? "PATTERN_SAFE" : "NOT_TRIGGERED",
      reality_conflict: "NO",
      correction_needed: "NO",
      detected_correction: null,
      backend_state: "UNKNOWN",
      mode_note: "NAME_ONLY_PATTERN_NOT_EXECUTION"
    };
  }

  return {
    sector,
    checked,
    question_validity: checked ? "VALID" : "NOT_TRIGGERED",
    reality_conflict: "NO",
    correction_needed: "NO",
    detected_correction: null,
    backend_state: backendState
  };
}

function buildKpPastValidation({ snapshot = {}, eventInput = {}, finalizedDomains = [] }) {
  const domain = up(eventInput?.domain || "GENERAL");

  const requiredMap = {
    GENERAL: ["1", "3", "7", "10", "11"],
    MARRIAGE: ["2", "7", "11"],
    DIVORCE: ["6", "8", "12"],
    FOREIGN: ["9", "12", "4"],
    IMMIGRATION: ["9", "12", "4", "10"],
    VISA: ["3", "9", "12"],
    SETTLEMENT: ["4", "10", "12"],
    JOB: ["6", "10", "11"],
    BUSINESS: ["7", "10", "11"],
    MONEY: ["2", "6", "11"],
    PROPERTY: ["4", "2", "11"],
    LEGAL: ["6", "10", "12"],
    DOCUMENT: ["3", "6", "10"],
    HEALTH: ["6", "8", "12"],
    EDUCATION: ["4", "5", "9"]
  };

  const required = requiredMap[domain] || requiredMap.GENERAL;

  const topHits = safeArray(finalizedDomains)
    .filter((d) => Number(d.normalized_score || 0) >= 5)
    .slice(0, 6)
    .map((d) => d.domain_key);

  return {
    kp_past_validation_active: true,
    event_domain: domain,
    required_kp_cusps: required,
    allowed_domain_keys: topHits,
    activated_kp_cusps: [],
    house_hit_fallback_used: topHits.length > 0,
    fallback_house_hits: topHits.map((x) => ({ domain_key: x })),
    kp_validation_score: topHits.length,
    kp_validation_status: topHits.length >= 3 ? "PARTIAL_MATCH" : "WEAK_MATCH",
    kp_validation_reasons: topHits.length ? [`Domain score fallback active: ${topHits.join(", ")}`] : [],
    mode_note: "PAST_KP_VALIDATION_ONLY_NOT_FUTURE_DECISION"
  };
}

export function runValidationLayer({
  question = "",
  finalizedDomains = [],
  snapshot = {},
  eventInput = {}
} = {}) {
  const question_intent = detectIntent(question);
  const domainMap = buildDomainMap(finalizedDomains);
  const weakMode = isWeakMode(snapshot);

  const sector_state = {};
  for (const sector of SECTORS) {
    sector_state[sector.toLowerCase()] = weakMode
      ? "UNKNOWN"
      : getSectorState(sector, domainMap);
  }

  sector_state.multiple_marriage = weakMode
    ? "UNKNOWN"
    : getSectorState("DIVORCE", domainMap);

  sector_state.immigration = weakMode
    ? "UNKNOWN"
    : pickState(domainMap.IMMIGRATION?.final_state, domainMap.FOREIGN?.final_state);

  sector_state.visa = weakMode
    ? "UNKNOWN"
    : domainMap.VISA?.final_state || "UNKNOWN";

  sector_state.career = weakMode
    ? "UNKNOWN"
    : pickState(domainMap.CAREER?.final_state, domainMap.JOB?.final_state);

  sector_state.blockage = weakMode
    ? "UNKNOWN"
    : domainMap.BLOCKAGE?.final_state || "UNKNOWN";

  sector_state.enemy = weakMode
    ? "UNKNOWN"
    : domainMap.ENEMY?.final_state || "UNKNOWN";

  sector_state.debt = weakMode
    ? "UNKNOWN"
    : domainMap.DEBT?.final_state || "UNKNOWN";

  sector_state.partnership = weakMode
    ? "UNKNOWN"
    : domainMap.PARTNERSHIP?.final_state || "UNKNOWN";

  const sector_validation = SECTORS.map((sector) =>
    buildSectorValidationRow(
      sector,
      question_intent,
      sector_state[sector.toLowerCase()] || "UNKNOWN",
      weakMode
    )
  );

  const checked = sector_validation.filter((x) => x.checked);
  const conflicts = sector_validation.filter((x) => x.reality_conflict === "YES");

  return {
    question_intent,
    sector_state,
    sector_validation,
    validation_summary: {
      checked_sector_count: checked.length,
      conflict_sector_count: conflicts.length,
      overall_question_validity: conflicts.length ? "DISTORTED_OR_CONFLICTED" : "STABLE",
      overall_reality_conflict: conflicts.length ? "YES" : "NO",
      correction_needed: conflicts.length ? "YES" : "NO",
      dominant_conflict_sector: conflicts[0]?.sector || null
    },
    kp_past_validation: buildKpPastValidation({
      snapshot,
      eventInput,
      finalizedDomains
    })
  };
}