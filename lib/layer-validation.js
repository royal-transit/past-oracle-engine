// lib/layer-validation.js
// FULL REPLACEMENT — UNIVERSAL VALIDATION LAYER V8
// Purpose:
// - sector_state must reflect pattern windows
// - NAME_ONLY must NOT say executed
// - NOT_TRIGGERED should only mean truly absent
// - validation must not fight layer-astro / layer-evidence
// - client-facing clean state: LIKELY_WINDOW / PATTERN_ONLY / UNKNOWN

function norm(v) {
  return String(v || "").trim();
}

function up(v) {
  return norm(v).toUpperCase();
}

function low(v) {
  return norm(v).toLowerCase();
}

function safeArray(v) {
  return Array.isArray(v) ? v : [];
}

const SECTOR_MAP = {
  MARRIAGE: ["MARRIAGE"],
  DIVORCE: ["DIVORCE"],
  MULTIPLE_MARRIAGE: ["MULTIPLE_MARRIAGE"],
  FOREIGN: ["FOREIGN"],
  SETTLEMENT: ["SETTLEMENT"],
  IMMIGRATION: ["IMMIGRATION"],
  VISA: ["VISA"],
  EDUCATION: ["EDUCATION"],
  JOB: ["JOB"],
  CAREER: ["CAREER"],
  BUSINESS: ["BUSINESS"],
  MONEY: ["MONEY", "GAIN", "LOSS"],
  PROPERTY: ["PROPERTY", "HOME", "VEHICLE"],
  HEALTH: ["HEALTH"],
  MENTAL: ["MENTAL", "MIND"],
  LEGAL: ["LEGAL", "DOCUMENT"],
  FAMILY: ["FAMILY", "HOME"],
  CHILDREN: ["CHILDREN"],
  BLOCKAGE: ["BLOCKAGE", "FAILURE"],
  ENEMY: ["ENEMY"],
  DEBT: ["DEBT"],
  PARTNERSHIP: ["PARTNERSHIP", "LOVE"]
};

function getModeFlags(subject_context, birth_context) {
  const identityDepth = norm(subject_context?.identity_depth);
  const subjectMode = norm(subject_context?.subject_mode);
  const precisionMode = norm(birth_context?.precision_mode);

  const isNameOnly =
    subject_context?.is_name_only_mode === true ||
    identityDepth === "LEVEL_2_NAME_ONLY" ||
    subjectMode === "NAME_ONLY_PAST" ||
    precisionMode === "NAME_ONLY";

  const isNameContext =
    subject_context?.is_name_context_mode === true ||
    identityDepth === "LEVEL_3_NAME_CONTEXT" ||
    subjectMode === "NAME_CONTEXT_PAST" ||
    precisionMode === "NAME_CONTEXT";

  const isReducedDob =
    identityDepth === "LEVEL_4_NAME_DOB" ||
    identityDepth === "LEVEL_3_DOB_ONLY" ||
    precisionMode === "DOB_ONLY_REDUCED" ||
    precisionMode === "DOB_POB_REDUCED";

  const isFullBirth =
    subject_context?.is_full_birth_locked === true ||
    identityDepth === "LEVEL_5_FULL_BIRTH" ||
    precisionMode === "FULL_BIRTH" ||
    precisionMode === "DOB_TOB";

  return {
    isNameOnly,
    isNameContext,
    isReducedDob,
    isFullBirth,
    weakTimelineMode: isNameOnly || isNameContext,
    executionClaimAllowed: isFullBirth || isReducedDob
  };
}

function detectQuestionIntent(question = "") {
  const q = low(question);

  return {
    asks_marriage: /(marriage|married|wife|husband|spouse|biye|bea|nikah)/i.test(q),
    asks_divorce: /(divorce|separation|separated|talak|break)/i.test(q),
    asks_foreign: /(foreign|abroad|uk|london|bidesh|movement)/i.test(q),
    asks_settlement: /(settlement|settled|ilr|residence|permanent|base)/i.test(q),
    asks_education: /(education|study|student|university|college|exam)/i.test(q),
    asks_job: /(job|work|employment|service|salary)/i.test(q),
    asks_business: /(business|trade|shop|deal|company|client)/i.test(q),
    asks_money: /(money|income|cash|profit|loss|finance)/i.test(q),
    asks_property: /(property|house|home|land|flat|vehicle|car)/i.test(q),
    asks_health: /(health|illness|disease|surgery|hospital|body)/i.test(q),
    asks_mental: /(mental|stress|depression|anxiety|fear|mind|overthinking)/i.test(q),
    asks_legal: /(legal|court|case|penalty|appeal|tribunal|authority|document|paperwork)/i.test(q),
    asks_family: /(family|mother|father|parent|ma|baba|brother|sister)/i.test(q),
    asks_children: /(child|children|baby|son|daughter|pregnancy)/i.test(q),
    asks_general: !q || /(past|history|general|life|scan|সব|all)/i.test(q)
  };
}

function sectorAsked(sector, intent) {
  const k = up(sector);

  const direct = {
    MARRIAGE: intent.asks_marriage,
    DIVORCE: intent.asks_divorce,
    MULTIPLE_MARRIAGE: intent.asks_marriage || intent.asks_divorce,
    FOREIGN: intent.asks_foreign,
    SETTLEMENT: intent.asks_settlement,
    IMMIGRATION: intent.asks_foreign || intent.asks_settlement,
    VISA: intent.asks_foreign,
    EDUCATION: intent.asks_education,
    JOB: intent.asks_job,
    CAREER: intent.asks_job || intent.asks_business,
    BUSINESS: intent.asks_business,
    MONEY: intent.asks_money,
    PROPERTY: intent.asks_property,
    HEALTH: intent.asks_health,
    MENTAL: intent.asks_mental,
    LEGAL: intent.asks_legal,
    FAMILY: intent.asks_family,
    CHILDREN: intent.asks_children,
    BLOCKAGE: intent.asks_general,
    ENEMY: intent.asks_general,
    DEBT: intent.asks_money,
    PARTNERSHIP: intent.asks_marriage || intent.asks_business
  };

  return !!direct[k] || intent.asks_general;
}

function stateRank(status) {
  const s = up(status);

  if (s === "EXECUTED") return 100;
  if (s === "IN_PROGRESS") return 90;
  if (s === "ACTIVE") return 85;
  if (s === "PARTIAL") return 80;
  if (s === "LIKELY_WINDOW") return 65;
  if (s === "PATTERN_ONLY") return 55;
  if (s === "BUILDING") return 50;
  if (s === "RESIDUAL") return 40;
  if (s === "BROKEN") return 30;
  if (s === "NOT_EXECUTED") return 20;

  return 0;
}

function dominantEventState(events = [], weakTimelineMode) {
  const sorted = safeArray(events)
    .map((e) => up(e.status || e.final_state))
    .filter(Boolean)
    .sort((a, b) => stateRank(b) - stateRank(a));

  const top = sorted[0] || "UNKNOWN";

  if (weakTimelineMode) {
    if (["EXECUTED", "IN_PROGRESS", "ACTIVE", "PARTIAL"].includes(top)) {
      return "LIKELY_WINDOW";
    }
    if (top === "LIKELY_WINDOW") return "LIKELY_WINDOW";
    if (top === "PATTERN_ONLY") return "PATTERN_ONLY";
    if (top === "BROKEN") return "PATTERN_ONLY";
    if (top === "NOT_EXECUTED") return "UNKNOWN";
    return top || "UNKNOWN";
  }

  return top || "UNKNOWN";
}

function domainHasPattern(domain) {
  if (!domain) return false;
  if (Number(domain.pattern_evidence_count || 0) > 0) return true;
  if (domain.pattern_mode_active === true) return true;

  return safeArray(domain.events).some((e) =>
    ["NAME_PATTERN", "LIKELY_HISTORY", "PATTERN_CONFIRMED", "PATTERN_ONLY"].includes(up(e.evidence_type))
  );
}

function domainHasDirect(domain) {
  if (!domain) return false;
  if (Number(domain.direct_evidence_count || 0) > 0) return true;

  return safeArray(domain.events).some((e) =>
    ["DIRECT", "DIRECT_FACT", "FACT_ANCHORED"].includes(up(e.evidence_type))
  );
}

function buildDomainsByKey(domain_results = []) {
  const map = new Map();
  for (const d of safeArray(domain_results)) {
    map.set(up(d.domain_key), d);
  }
  return map;
}

function evaluateSector(sector, domainsByKey, intent, modeFlags) {
  const domainKeys = SECTOR_MAP[sector] || [sector];
  const domains = domainKeys.map((k) => domainsByKey.get(up(k))).filter(Boolean);
  const allEvents = domains.flatMap((d) => safeArray(d.events));
  const asked = sectorAsked(sector, intent);

  if (!domains.length) {
    return {
      sector,
      checked: asked,
      question_validity: asked ? "NO_DOMAIN_DATA" : "NOT_TRIGGERED",
      reality_conflict: "NO",
      correction_needed: "NO",
      detected_correction: null,
      backend_state: "UNKNOWN"
    };
  }

  const topState = dominantEventState(allEvents, modeFlags.weakTimelineMode);
  const hasPattern = domains.some(domainHasPattern);
  const hasDirect = domains.some(domainHasDirect);

  let backendState = "UNKNOWN";

  if (modeFlags.weakTimelineMode) {
    if (topState === "LIKELY_WINDOW") backendState = "LIKELY_WINDOW";
    else if (topState === "PATTERN_ONLY") backendState = "PATTERN_ONLY";
    else if (hasPattern) backendState = "PATTERN_ONLY";
    else backendState = "UNKNOWN";
  } else {
    if (hasDirect && ["EXECUTED", "IN_PROGRESS", "ACTIVE", "PARTIAL"].includes(topState)) {
      backendState = topState;
    } else if (hasPattern && topState !== "UNKNOWN") {
      backendState = topState;
    } else if (hasPattern) {
      backendState = "PATTERN_ONLY";
    }
  }

  const questionValidity =
    !asked && backendState === "UNKNOWN"
      ? "NOT_TRIGGERED"
      : backendState === "UNKNOWN"
      ? "STABLE_UNKNOWN"
      : modeFlags.weakTimelineMode
      ? "PATTERN_VALID"
      : "VALID";

  return {
    sector,
    checked: asked || backendState !== "UNKNOWN",
    question_validity: questionValidity,
    reality_conflict: "NO",
    correction_needed: "NO",
    detected_correction: null,
    backend_state: backendState
  };
}

function buildSectorState(sectorValidation) {
  const out = {};

  for (const row of safeArray(sectorValidation)) {
    out[low(row.sector)] = row.backend_state || "UNKNOWN";
  }

  return out;
}

function summarizeValidation(sectorValidation) {
  const checked = sectorValidation.filter((x) => x.checked).length;
  const conflict = sectorValidation.filter((x) => x.reality_conflict === "YES").length;

  const active = sectorValidation.filter((x) =>
    ["EXECUTED", "IN_PROGRESS", "PARTIAL", "LIKELY_WINDOW", "PATTERN_ONLY"].includes(up(x.backend_state))
  );

  let overall = "STABLE";
  if (conflict > 0) overall = "CONFLICT_PRESENT";
  else if (active.length > 0) overall = "PATTERN_STABLE";

  return {
    checked_sector_count: checked,
    conflict_sector_count: conflict,
    active_pattern_sector_count: active.length,
    overall_question_validity: overall,
    overall_reality_conflict: conflict > 0 ? "YES" : "NO",
    correction_needed: conflict > 0 ? "YES" : "NO",
    dominant_conflict_sector: conflict > 0 ? sectorValidation.find((x) => x.reality_conflict === "YES")?.sector || null : null
  };
}

function buildKpPastValidation({ question_profile, domain_results }) {
  const primary = up(question_profile?.primary_domain || "GENERAL");

  const requiredMap = {
    GENERAL: ["1", "3", "7", "10", "11"],
    MARRIAGE: ["2", "7", "11"],
    DIVORCE: ["6", "8", "12"],
    FOREIGN: ["9", "12"],
    SETTLEMENT: ["4", "12"],
    JOB: ["6", "10"],
    BUSINESS: ["7", "10", "11"],
    MONEY: ["2", "6", "11"],
    LEGAL: ["6", "10"],
    HEALTH: ["6", "8", "12"]
  };

  const required = requiredMap[primary] || requiredMap.GENERAL;

  const activated = safeArray(domain_results)
    .filter((d) => Number(d.kp_weight || 0) > 0)
    .map((d) => ({
      domain_key: d.domain_key,
      kp_weight: d.kp_weight,
      kp_reasons: d.kp_reasons || []
    }));

  return {
    kp_past_validation_active: true,
    event_domain: primary,
    required_kp_cusps: required,
    allowed_domain_keys: [],
    activated_kp_cusps: activated,
    house_hit_fallback_used: false,
    fallback_house_hits: [],
    kp_validation_score: activated.reduce((a, b) => a + Number(b.kp_weight || 0), 0),
    kp_validation_status: activated.length ? "SUPPORT_PRESENT" : "WEAK_MATCH",
    kp_validation_reasons: activated.flatMap((x) => x.kp_reasons || []),
    mode_note: "PAST_KP_VALIDATION_ONLY_NOT_FUTURE_DECISION"
  };
}

export function runValidationLayer({
  input = {},
  question_profile = null,
  domain_results = [],
  subject_context = {},
  birth_context = {}
} = {}) {
  const modeFlags = getModeFlags(subject_context, birth_context);

  const questionIntent =
    question_profile?.question_intent ||
    detectQuestionIntent(input?.question || "");

  const domainsByKey = buildDomainsByKey(domain_results);

  const sector_validation = Object.keys(SECTOR_MAP).map((sector) =>
    evaluateSector(sector, domainsByKey, questionIntent, modeFlags)
  );

  const sector_state = buildSectorState(sector_validation);
  const validation_summary = summarizeValidation(sector_validation);

  return {
    question_intent: questionIntent,
    sector_state,
    sector_validation,
    validation_summary,
    kp_past_validation: buildKpPastValidation({
      question_profile: question_profile || { primary_domain: "GENERAL" },
      domain_results
    })
  };
}