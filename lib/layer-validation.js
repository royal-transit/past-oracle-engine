// lib/layer-validation.js
// FULL REPLACEMENT — UNIVERSAL VALIDATION LAYER V8
// Purpose:
// - validate question intent against domain signals
// - name-only never confirms executed reality
// - DOB / facts / full birth can allow stronger validation
// - exposes sector_state for delivery_safe_packet
// - KP is validation/ranking support only, never final execution
// - no stale contradiction with layer-astro / layer-evidence

function norm(v) {
  return String(v || "").trim();
}

function low(v) {
  return norm(v).toLowerCase();
}

function up(v) {
  return norm(v).toUpperCase();
}

function safeArray(v) {
  return Array.isArray(v) ? v : [];
}

function safeNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function hasAny(text, words = []) {
  const t = low(text);
  return words.some((w) => t.includes(low(w)));
}

function normalizeState(v) {
  const s = up(v);
  if (["EXECUTED", "ACTIVE", "IN_PROGRESS", "PARTIAL", "BROKEN", "NOT_EXECUTED", "LIKELY_WINDOW", "PATTERN_ONLY", "UNKNOWN"].includes(s)) {
    return s;
  }
  return "UNKNOWN";
}

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
    executionClaimAllowed: isReducedDob || isFullBirth,
    oracle_mode: isFullBirth
      ? "FULL_BIRTH_VALIDATION_MODE"
      : isReducedDob
      ? "DOB_REDUCED_VALIDATION_MODE"
      : isNameContext
      ? "NAME_CONTEXT_VALIDATION_MODE"
      : isNameOnly
      ? "NAME_ONLY_VALIDATION_MODE"
      : "GENERAL_VALIDATION_MODE"
  };
}

function detectQuestionIntent(question = "") {
  const q = low(question);

  const intent = {
    asks_marriage: hasAny(q, ["marriage", "married", "wife", "husband", "spouse", "biye", "nikah", "bea"]),
    asks_divorce: hasAny(q, ["divorce", "separation", "separated", "talak", "breakup", "break"]),
    asks_foreign: hasAny(q, ["foreign", "abroad", "uk", "bidesh", "overseas", "move country"]),
    asks_settlement: hasAny(q, ["settlement", "settled", "ilr", "permanent", "residence", "base"]),
    asks_education: hasAny(q, ["education", "study", "student", "university", "exam", "qualification"]),
    asks_job: hasAny(q, ["job", "work", "employment", "salary", "service"]),
    asks_business: hasAny(q, ["business", "trade", "shop", "company", "client", "deal"]),
    asks_money: hasAny(q, ["money", "income", "cash", "profit", "loss", "debt", "finance"]),
    asks_property: hasAny(q, ["property", "land", "house", "home", "flat", "asset", "vehicle", "car"]),
    asks_health: hasAny(q, ["health", "ill", "sick", "disease", "surgery", "hospital"]),
    asks_mental: hasAny(q, ["mental", "mind", "stress", "depression", "anxiety", "fear", "overthinking"]),
    asks_legal: hasAny(q, ["legal", "court", "case", "penalty", "appeal", "tribunal", "authority"]),
    asks_family: hasAny(q, ["family", "mother", "father", "ma", "baba", "parent", "brother", "sister"]),
    asks_children: hasAny(q, ["child", "children", "baby", "son", "daughter", "pregnancy"]),
    asks_general: false
  };

  intent.asks_general = !Object.values(intent).some(Boolean);

  return intent;
}

function primaryDomainFromIntent(intent) {
  if (intent.asks_marriage) return "MARRIAGE";
  if (intent.asks_divorce) return "DIVORCE";
  if (intent.asks_foreign) return "FOREIGN";
  if (intent.asks_settlement) return "SETTLEMENT";
  if (intent.asks_education) return "EDUCATION";
  if (intent.asks_job) return "JOB";
  if (intent.asks_business) return "BUSINESS";
  if (intent.asks_money) return "MONEY";
  if (intent.asks_property) return "PROPERTY";
  if (intent.asks_health) return "HEALTH";
  if (intent.asks_mental) return "MENTAL";
  if (intent.asks_legal) return "LEGAL";
  if (intent.asks_family) return "FAMILY";
  if (intent.asks_children) return "CHILDREN";
  return "GENERAL";
}

const SECTOR_DOMAIN_MAP = {
  marriage: ["MARRIAGE", "PARTNERSHIP", "LOVE"],
  divorce: ["DIVORCE"],
  multiple_marriage: ["MULTIPLE_MARRIAGE"],
  foreign: ["FOREIGN"],
  settlement: ["SETTLEMENT"],
  immigration: ["IMMIGRATION"],
  visa: ["VISA"],
  education: ["EDUCATION"],
  job: ["JOB"],
  career: ["CAREER"],
  business: ["BUSINESS"],
  money: ["MONEY", "GAIN", "LOSS"],
  property: ["PROPERTY", "HOME", "VEHICLE"],
  health: ["HEALTH"],
  mental: ["MENTAL", "MIND"],
  legal: ["LEGAL", "DOCUMENT"],
  family: ["FAMILY", "HOME"],
  children: ["CHILDREN"],
  blockage: ["BLOCKAGE", "FAILURE"],
  enemy: ["ENEMY", "LEGAL"],
  debt: ["DEBT"],
  partnership: ["PARTNERSHIP", "BUSINESS", "LOVE"]
};

function domainByKey(domain_results, key) {
  return safeArray(domain_results).find((d) => up(d.domain_key) === up(key)) || null;
}

function bestDomainState(domain) {
  if (!domain) return "UNKNOWN";

  const events = safeArray(domain.events);
  const statuses = events.map((e) => up(e.status));

  if (statuses.includes("EXECUTED")) return "EXECUTED";
  if (statuses.includes("IN_PROGRESS")) return "IN_PROGRESS";
  if (statuses.includes("PARTIAL")) return "PARTIAL";
  if (statuses.includes("BROKEN")) return "BROKEN";
  if (statuses.includes("NOT_EXECUTED")) return "NOT_EXECUTED";
  if (statuses.includes("LIKELY_WINDOW")) return "LIKELY_WINDOW";
  if (statuses.includes("PATTERN_ONLY")) return "PATTERN_ONLY";

  if (safeNum(domain.normalized_score) >= 3.2) return "LIKELY_WINDOW";
  if (safeNum(domain.normalized_score) >= 2.2) return "PATTERN_ONLY";

  return normalizeState(domain.final_state);
}

function pickSectorState(states = [], weakTimelineMode) {
  const s = states.map(normalizeState);

  if (!weakTimelineMode) {
    if (s.includes("EXECUTED")) return "EXECUTED";
    if (s.includes("IN_PROGRESS")) return "IN_PROGRESS";
    if (s.includes("PARTIAL")) return "PARTIAL";
    if (s.includes("BROKEN")) return "BROKEN";
    if (s.includes("NOT_EXECUTED")) return "NOT_EXECUTED";
  }

  if (s.includes("LIKELY_WINDOW")) return "LIKELY_WINDOW";
  if (s.includes("PATTERN_ONLY")) return "PATTERN_ONLY";

  return "UNKNOWN";
}

function buildSectorState(domain_results, modeFlags) {
  const out = {};

  for (const [sector, keys] of Object.entries(SECTOR_DOMAIN_MAP)) {
    const states = keys.map((k) => bestDomainState(domainByKey(domain_results, k)));
    out[sector] = pickSectorState(states, modeFlags.weakTimelineMode);
  }

  return out;
}

function sectorQuestionTriggered(sector, intent) {
  const map = {
    marriage: intent.asks_marriage,
    divorce: intent.asks_divorce,
    multiple_marriage: intent.asks_marriage || intent.asks_divorce,
    foreign: intent.asks_foreign,
    settlement: intent.asks_settlement,
    immigration: intent.asks_foreign,
    visa: intent.asks_foreign,
    education: intent.asks_education,
    job: intent.asks_job,
    career: intent.asks_job || intent.asks_business,
    business: intent.asks_business,
    money: intent.asks_money,
    property: intent.asks_property,
    health: intent.asks_health,
    mental: intent.asks_mental,
    legal: intent.asks_legal,
    family: intent.asks_family,
    children: intent.asks_children,
    blockage: intent.asks_general,
    enemy: intent.asks_legal,
    debt: intent.asks_money,
    partnership: intent.asks_marriage || intent.asks_business
  };

  return !!map[sector];
}

function validateSector(sector, state, intent, modeFlags, facts = {}) {
  const checked = sectorQuestionTriggered(sector, intent);

  let question_validity = checked ? "TRIGGERED" : "NOT_TRIGGERED";
  let reality_conflict = "NO";
  let correction_needed = "NO";
  let detected_correction = null;

  if (modeFlags.weakTimelineMode && ["EXECUTED", "BROKEN", "PARTIAL", "IN_PROGRESS"].includes(state)) {
    reality_conflict = "YES";
    correction_needed = "YES";
    detected_correction = "NAME_ONLY_CANNOT_CONFIRM_EXECUTION";
  }

  if (sector === "marriage" && facts.marriage_count_claim != null && state === "UNKNOWN") {
    question_validity = "FACT_ANCHORED_BUT_ENGINE_UNKNOWN";
  }

  if (sector === "foreign" && (facts.foreign_entry_year_claim != null || facts.student_visa_entry_year_claim != null) && state === "UNKNOWN") {
    question_validity = "FACT_ANCHORED_BUT_ENGINE_UNKNOWN";
  }

  return {
    sector: up(sector),
    checked,
    question_validity,
    reality_conflict,
    correction_needed,
    detected_correction,
    backend_state: state
  };
}

function buildKpPastValidation(primaryDomain, domain_results, evidence_packet, modeFlags) {
  const requiredMap = {
    GENERAL: ["1", "3", "7", "10", "11"],
    MARRIAGE: ["2", "7", "11"],
    DIVORCE: ["6", "7", "8", "12"],
    FOREIGN: ["9", "12", "4"],
    SETTLEMENT: ["4", "10", "12"],
    EDUCATION: ["4", "5", "9"],
    JOB: ["6", "10", "11"],
    BUSINESS: ["7", "10", "11"],
    MONEY: ["2", "6", "11"],
    PROPERTY: ["4", "11", "2"],
    HEALTH: ["6", "8", "12"],
    MENTAL: ["1", "4", "8"],
    LEGAL: ["6", "7", "10"],
    FAMILY: ["2", "4"],
    CHILDREN: ["5", "9"]
  };

  const required = requiredMap[primaryDomain] || requiredMap.GENERAL;
  const activated = [];

  for (const d of safeArray(domain_results)) {
    const houses = safeArray(d.target_houses).map(String);
    const hit = houses.some((h) => required.includes(h));
    if (hit && safeNum(d.normalized_score) >= 2.2) {
      activated.push({
        domain_key: d.domain_key,
        score: d.normalized_score,
        target_houses: d.target_houses
      });
    }
  }

  const kpScore = activated.reduce((a, b) => a + safeNum(b.score), 0);

  return {
    kp_past_validation_active: true,
    event_domain: primaryDomain,
    required_kp_cusps: required,
    allowed_domain_keys: activated.map((x) => x.domain_key),
    activated_kp_cusps: modeFlags.weakTimelineMode ? [] : required,
    house_hit_fallback_used: activated.length > 0,
    fallback_house_hits: activated.slice(0, 8),
    kp_validation_score: Math.round((kpScore + Number.EPSILON) * 100) / 100,
    kp_validation_status:
      kpScore >= 20 ? "STRONG_MATCH" :
      kpScore >= 10 ? "MODERATE_MATCH" :
      kpScore > 0 ? "WEAK_MATCH" :
      "NO_MATCH",
    kp_validation_reasons: activated.slice(0, 8).map(
      (x) => `${x.domain_key} score ${x.score} hit houses ${safeArray(x.target_houses).join(",")}`
    ),
    mode_note: "PAST_KP_VALIDATION_ONLY_NOT_FUTURE_DECISION"
  };
}

export function runValidationLayer({
  input = {},
  facts = {},
  question_profile = null,
  domain_results = [],
  evidence_packet = {},
  subject_context = {},
  birth_context = {}
} = {}) {
  const modeFlags = getModeFlags(subject_context, birth_context);

  const questionIntent =
    question_profile?.question_intent ||
    detectQuestionIntent(input.question || facts.raw_text || "");

  const primaryDomain =
    question_profile?.primary_domain ||
    primaryDomainFromIntent(questionIntent);

  const sector_state = buildSectorState(domain_results, modeFlags);

  const sector_validation = Object.entries(sector_state).map(([sector, state]) =>
    validateSector(sector, state, questionIntent, modeFlags, facts)
  );

  const conflictCount = sector_validation.filter((x) => x.reality_conflict === "YES").length;
  const checkedCount = sector_validation.filter((x) => x.checked).length;

  const validation_summary = {
    checked_sector_count: checkedCount,
    conflict_sector_count: conflictCount,
    overall_question_validity: conflictCount > 0 ? "CONFLICT_PRESENT" : "STABLE",
    overall_reality_conflict: conflictCount > 0 ? "YES" : "NO",
    correction_needed: conflictCount > 0 ? "YES" : "NO",
    dominant_conflict_sector:
      sector_validation.find((x) => x.reality_conflict === "YES")?.sector || null
  };

  return {
    question_intent: questionIntent,
    primary_domain: primaryDomain,
    mode_flags: modeFlags,
    sector_state,
    sector_validation,
    validation_summary,
    kp_past_validation: buildKpPastValidation(
      primaryDomain,
      domain_results,
      evidence_packet,
      modeFlags
    )
  };
}