// lib/layer-validation.js
// FULL REPLACEMENT — UNIVERSAL VALIDATION LAYER V8.2
// Fix:
// - FULL_BIRTH mode correctly detected from snapshot/finalizedDomains/eventInput
// - validation_layer.mode_flags no longer falls back to GENERAL_VALIDATION_MODE
// - sector_state accepts HIGH_PROBABILITY / LIKELY_WINDOW / PATTERN_ONLY
// - KP validation remains validation-only, not final execution source
// - Name-only / Name-context never executes
// - Full-birth allows high-confidence probability but still separates DIRECT_FACT from LIKELY_HISTORY

function str(v) {
  return v == null ? "" : String(v).trim();
}

function up(v) {
  return str(v).toUpperCase();
}

function low(v) {
  return str(v).toLowerCase();
}

function safeArray(v) {
  return Array.isArray(v) ? v : [];
}

function safeObj(v) {
  return v && typeof v === "object" && !Array.isArray(v) ? v : {};
}

function hasAny(text, arr) {
  const t = low(text);
  return arr.some((x) => t.includes(low(x)));
}

function normalizeStatus(status) {
  const s = up(status);

  if (["EXECUTED", "DIRECT", "DIRECT_FACT", "FACT_ANCHORED"].includes(s)) return "EXECUTED";
  if (["HIGH_PROBABILITY", "STRONG_PROBABILITY"].includes(s)) return "HIGH_PROBABILITY";
  if (["LIKELY_WINDOW", "LIKELY", "BUILDING"].includes(s)) return "LIKELY_WINDOW";
  if (["PATTERN_ONLY", "NAME_PATTERN", "LIKELY_HISTORY"].includes(s)) return "PATTERN_ONLY";
  if (["PARTIAL", "IN_PROGRESS"].includes(s)) return "PARTIAL";
  if (["BROKEN", "FAILED", "COLLAPSED"].includes(s)) return "BROKEN";
  if (["NOT_EXECUTED", "DENIED"].includes(s)) return "NOT_EXECUTED";

  return "UNKNOWN";
}

function getModeFlags({ snapshot, finalizedDomains, eventInput }) {
  const s = safeObj(snapshot);
  const ctx = safeObj(s.subject_context);
  const birth = safeObj(s.birth_context);
  const input = safeObj(eventInput);

  const precisionMode =
    str(birth.precision_mode) ||
    str(s.precision_mode) ||
    str(input.precision_mode);

  const identityDepth =
    str(ctx.identity_depth) ||
    str(s.identity_depth) ||
    str(input.identity_depth);

  const subjectMode =
    str(ctx.subject_mode) ||
    str(s.subject_mode) ||
    str(input.subject_mode);

  const hasBirthLocked =
    ctx.is_full_birth_locked === true ||
    birth.precision_mode === "FULL_BIRTH" ||
    precisionMode === "FULL_BIRTH" ||
    identityDepth === "LEVEL_5_FULL_BIRTH" ||
    subjectMode === "FULL_BIRTH_PAST";

  const hasDob =
    !!birth.birth_datetime_iso ||
    !!s.birth_datetime_iso ||
    !!input.dob;

  const domains = safeArray(finalizedDomains);
  const hasAstroFullEvidence = domains.some((d) =>
    d?.oracle_mode === "FULL_BIRTH_MAX_FORENSIC_MODE" ||
    d?.exact_timeline_allowed === true ||
    d?.execution_claim_allowed === true
  );

  const isFullBirth = hasBirthLocked || (hasDob && hasAstroFullEvidence);

  const isReducedDob =
    !isFullBirth &&
    (
      identityDepth === "LEVEL_4_NAME_DOB" ||
      identityDepth === "LEVEL_3_DOB_ONLY" ||
      precisionMode === "DOB_ONLY_REDUCED" ||
      precisionMode === "DOB_POB_REDUCED"
    );

  const isNameOnly =
    !isFullBirth &&
    !isReducedDob &&
    (
      ctx.is_name_only_mode === true ||
      identityDepth === "LEVEL_2_NAME_ONLY" ||
      subjectMode === "NAME_ONLY_PAST" ||
      precisionMode === "NAME_ONLY"
    );

  const isNameContext =
    !isFullBirth &&
    !isReducedDob &&
    (
      ctx.is_name_context_mode === true ||
      identityDepth === "LEVEL_3_NAME_CONTEXT" ||
      subjectMode === "NAME_CONTEXT_PAST" ||
      precisionMode === "NAME_CONTEXT"
    );

  const weakTimelineMode = isNameOnly || isNameContext;

  return {
    isNameOnly,
    isNameContext,
    isReducedDob,
    isFullBirth,
    weakTimelineMode,
    executionClaimAllowed: isFullBirth || isReducedDob,
    oracle_mode: isFullBirth
      ? "FULL_BIRTH_MAX_FORENSIC_MODE"
      : isReducedDob
      ? "DOB_REDUCED_VALIDATION_MODE"
      : isNameContext
      ? "NAME_CONTEXT_VALIDATION_MODE"
      : isNameOnly
      ? "NAME_ONLY_VALIDATION_MODE"
      : "GENERAL_VALIDATION_MODE"
  };
}

const SECTOR_KEYS = {
  marriage: ["MARRIAGE"],
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
  enemy: ["ENEMY"],
  debt: ["DEBT"],
  partnership: ["PARTNERSHIP", "LOVE"]
};

const QUESTION_KEYWORDS = {
  marriage: ["marriage", "married", "wife", "husband", "biye", "bea", "nikah"],
  divorce: ["divorce", "separation", "separated", "talak", "break"],
  multiple_marriage: ["second marriage", "multiple marriage", "remarriage", "abar biye"],
  foreign: ["foreign", "abroad", "uk", "bidesh", "relocation"],
  settlement: ["settlement", "ilr", "permanent", "citizenship", "settled"],
  immigration: ["immigration", "visa", "route", "leave to remain", "ltr"],
  visa: ["visa", "permission", "approval"],
  education: ["education", "study", "exam", "school", "college", "university"],
  job: ["job", "employment", "salary", "work"],
  career: ["career", "authority", "profession", "role"],
  business: ["business", "trade", "client", "company", "shop"],
  money: ["money", "income", "cash", "profit", "loss"],
  property: ["property", "house", "flat", "land", "vehicle", "car"],
  health: ["health", "illness", "surgery", "hospital", "body"],
  mental: ["mental", "stress", "anxiety", "depression", "fear"],
  legal: ["legal", "court", "case", "penalty", "tribunal", "appeal", "document"],
  family: ["family", "mother", "father", "child", "wife", "daughter", "son"],
  children: ["child", "children", "baby", "son", "daughter", "pregnancy"],
  blockage: ["block", "delay", "obstruction", "problem", "stuck"],
  enemy: ["enemy", "opponent", "rival", "hidden enemy"],
  debt: ["debt", "loan", "liability"],
  partnership: ["partner", "partnership", "contract", "relationship", "love"]
};

function bestSectorState(finalizedDomains, keys) {
  const domains = safeArray(finalizedDomains).filter((d) =>
    keys.includes(up(d.domain_key))
  );

  const statuses = [];

  for (const d of domains) {
    statuses.push(normalizeStatus(d.final_state));
    for (const e of safeArray(d.events)) {
      statuses.push(normalizeStatus(e.status));
    }
  }

  if (statuses.includes("EXECUTED")) return "EXECUTED";
  if (statuses.includes("HIGH_PROBABILITY")) return "HIGH_PROBABILITY";
  if (statuses.includes("LIKELY_WINDOW")) return "LIKELY_WINDOW";
  if (statuses.includes("PATTERN_ONLY")) return "PATTERN_ONLY";
  if (statuses.includes("PARTIAL")) return "PARTIAL";
  if (statuses.includes("BROKEN")) return "BROKEN";
  if (statuses.includes("NOT_EXECUTED")) return "NOT_EXECUTED";

  return "UNKNOWN";
}

function buildSectorState(finalizedDomains) {
  const out = {};
  for (const [sector, keys] of Object.entries(SECTOR_KEYS)) {
    out[sector] = bestSectorState(finalizedDomains, keys);
  }
  return out;
}

function isSectorTriggered(sector, question, primaryDomain) {
  if (up(primaryDomain) === up(sector)) return true;
  return hasAny(question, QUESTION_KEYWORDS[sector] || []);
}

function buildSectorValidation({ sector, state, checked, modeFlags }) {
  let question_validity = checked ? "TRIGGERED" : "NOT_TRIGGERED";
  let reality_conflict = "NO";
  let correction_needed = "NO";
  let detected_correction = null;

  if (modeFlags.weakTimelineMode && ["EXECUTED", "HIGH_PROBABILITY"].includes(state)) {
    reality_conflict = "NO";
    correction_needed = "YES";
    detected_correction = "WEAK_MODE_CANNOT_EXECUTE";
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

function readKpCusps(snapshot) {
  const s = safeObj(snapshot);

  return (
    safeObj(s.kp_cusps) ||
    safeObj(s.kp?.cusps) ||
    safeObj(s.kp) ||
    {}
  );
}

function kpCuspsObject(snapshot) {
  const cusps = readKpCusps(snapshot);
  const out = {};
  for (const [k, v] of Object.entries(cusps)) {
    if (/^\d+$/.test(String(k))) out[String(k)] = v;
  }
  return out;
}

function activatedKpCusps(snapshot, requiredCusps) {
  const cusps = kpCuspsObject(snapshot);
  const out = [];

  for (const c of requiredCusps) {
    if (cusps[String(c)]) out.push(String(c));
  }

  return out;
}

function requiredCuspsForDomain(domain) {
  const d = up(domain);

  if (d === "MARRIAGE") return ["2", "7", "11"];
  if (d === "DIVORCE") return ["6", "7", "8", "12"];
  if (d === "FOREIGN" || d === "IMMIGRATION" || d === "VISA") return ["3", "9", "12"];
  if (d === "SETTLEMENT") return ["4", "10", "12"];
  if (d === "JOB" || d === "CAREER") return ["6", "10", "11"];
  if (d === "BUSINESS") return ["7", "10", "11"];
  if (d === "MONEY") return ["2", "6", "11"];
  if (d === "PROPERTY") return ["4", "11", "2"];
  if (d === "HEALTH" || d === "MENTAL") return ["1", "6", "8", "12"];
  if (d === "LEGAL") return ["6", "7", "10"];
  if (d === "CHILDREN") return ["2", "5", "11"];

  return ["1", "3", "7", "10", "11"];
}

function scoreKpValidation({ snapshot, eventDomain }) {
  const required = requiredCuspsForDomain(eventDomain);
  const activated = activatedKpCusps(snapshot, required);
  const score = activated.length;

  return {
    kp_past_validation_active: true,
    event_domain: eventDomain || "GENERAL",
    required_kp_cusps: required,
    allowed_domain_keys: [],
    activated_kp_cusps: activated,
    house_hit_fallback_used: false,
    fallback_house_hits: [],
    kp_validation_score: score,
    kp_validation_status:
      score >= required.length ? "STRONG_MATCH" :
      score >= Math.ceil(required.length / 2) ? "PARTIAL_MATCH" :
      score > 0 ? "WEAK_MATCH" :
      "NO_MATCH",
    kp_validation_reasons: activated.map((c) => `KP cusp ${c} available`),
    mode_note: "PAST_KP_VALIDATION_ONLY_NOT_FUTURE_DECISION"
  };
}

export function runValidationLayer({
  question,
  finalizedDomains,
  snapshot,
  eventInput
}) {
  const q = str(question || eventInput?.question || eventInput?.event);
  const primaryDomain = up(eventInput?.domain || "GENERAL");
  const mode_flags = getModeFlags({ snapshot, finalizedDomains, eventInput });

  const sector_state = buildSectorState(finalizedDomains);

  const sector_validation = Object.keys(SECTOR_KEYS).map((sector) => {
    const checked = isSectorTriggered(sector, q, primaryDomain);
    return buildSectorValidation({
      sector,
      state: sector_state[sector],
      checked,
      modeFlags: mode_flags
    });
  });

  const checked_sector_count = sector_validation.filter((x) => x.checked).length;
  const conflict_sector_count = sector_validation.filter((x) => x.reality_conflict === "YES").length;

  const dominant_conflict_sector =
    sector_validation.find((x) => x.reality_conflict === "YES")?.sector || null;

  const validation_summary = {
    checked_sector_count,
    conflict_sector_count,
    overall_question_validity: "STABLE",
    overall_reality_conflict: conflict_sector_count ? "YES" : "NO",
    correction_needed: sector_validation.some((x) => x.correction_needed === "YES") ? "YES" : "NO",
    dominant_conflict_sector
  };

  const kp_past_validation = scoreKpValidation({
    snapshot,
    eventDomain: primaryDomain
  });

  return {
    question_intent: {
      asks_marriage: isSectorTriggered("marriage", q, primaryDomain),
      asks_divorce: isSectorTriggered("divorce", q, primaryDomain),
      asks_foreign: isSectorTriggered("foreign", q, primaryDomain),
      asks_settlement: isSectorTriggered("settlement", q, primaryDomain),
      asks_education: isSectorTriggered("education", q, primaryDomain),
      asks_job: isSectorTriggered("job", q, primaryDomain),
      asks_business: isSectorTriggered("business", q, primaryDomain),
      asks_money: isSectorTriggered("money", q, primaryDomain),
      asks_property: isSectorTriggered("property", q, primaryDomain),
      asks_health: isSectorTriggered("health", q, primaryDomain),
      asks_mental: isSectorTriggered("mental", q, primaryDomain),
      asks_legal: isSectorTriggered("legal", q, primaryDomain),
      asks_family: isSectorTriggered("family", q, primaryDomain),
      asks_children: isSectorTriggered("children", q, primaryDomain),
      asks_general: primaryDomain === "GENERAL"
    },

    primary_domain: primaryDomain,
    mode_flags,
    sector_state,
    sector_validation,
    validation_summary,
    kp_past_validation
  };
}