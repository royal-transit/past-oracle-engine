// api/past-oracle.js
// FULL REPLACEMENT — UNIVERSAL_PAST_NANO_SCANNER_V5
// HARD CONSISTENCY LOCK
// NO PARTIAL ANYWHERE
// DOMAIN-SPECIFIC YEAR BINDING
// SETTLEMENT != FOREIGN ENTRY
// ROUTE SHIFT != EDUCATION

import { buildChartCore } from "../lib/chart-core.js";
import { astroProvider } from "../lib/provider-adapter.js";
import { runIntelligenceLayer } from "../lib/layer-intelligence.js";
import { runAstroLayer, buildTimeline } from "../lib/layer-astro.js";
import { runEvidenceLayer } from "../lib/layer-evidence.js";
import { runEventFinalizer } from "../lib/event-finalizer.js";
import { runValidationLayer } from "../lib/layer-validation.js";
import { buildIdentityPacket } from "../lib/identity-packet.js";
import { correctIdentityPacket } from "../lib/domain-corrector.js";

/* =====================================
   CONSTANTS
===================================== */

const ENGINE_STATUS = "UNIVERSAL_PAST_NANO_SCANNER_V5";

const FINAL_STATUS = {
  EXECUTED: "EXECUTED",
  IN_PROGRESS: "IN_PROGRESS",
  NOT_EXECUTED: "NOT_EXECUTED",
  UNKNOWN: "UNKNOWN"
};

const EVIDENCE = {
  DIRECT_FACT: "DIRECT_FACT",
  FACT_ANCHORED: "FACT_ANCHORED",
  PATTERN_CONFIRMED: "PATTERN_CONFIRMED",
  PATTERN_ONLY: "PATTERN_ONLY",
  NAME_PATTERN: "NAME_PATTERN",
  UNKNOWN: "UNKNOWN"
};

/* =====================================
   BASIC HELPERS
===================================== */

function str(v) {
  return v == null ? "" : String(v).trim();
}

function low(v) {
  return str(v).toLowerCase();
}

function up(v) {
  return str(v).toUpperCase();
}

function toNum(v) {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function normalizeFormat(v) {
  const x = low(v);
  if (x === "compact") return "compact";
  if (x === "project") return "project";
  return "json";
}

function safeArray(v) {
  return Array.isArray(v) ? v : [];
}

function unique(arr) {
  return [...new Set(safeArray(arr).filter(Boolean))];
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj || {}));
}

function hasAny(text, arr) {
  const src = low(text);
  return arr.some((x) => src.includes(low(x)));
}

function extractAllYears(text) {
  return [...String(text || "").matchAll(/\b(19|20)\d{2}\b/g)].map((m) => Number(m[0]));
}

function yearNear(src, keywords) {
  const text = String(src || "");
  for (const kw of keywords) {
    const idx = text.toLowerCase().indexOf(String(kw).toLowerCase());
    if (idx === -1) continue;
    const tail = text.slice(idx, idx + 200);
    const m = tail.match(/\b(19|20)\d{2}\b/);
    if (m) return Number(m[0]);
  }
  return null;
}

function birthYearFromDob(dob) {
  const raw = str(dob);
  const m = raw.match(/\b(19|20)\d{2}\b/);
  if (m) return Number(m[0]);

  const parts = raw.split(/[-/]/).map((x) => x.trim());
  if (parts.length === 3) {
    const maybe = Number(parts[2]);
    if (Number.isFinite(maybe) && maybe > 1900) return maybe;
  }
  return null;
}

function ageFromYear(eventYear, dob) {
  const by = birthYearFromDob(dob);
  if (!by || !eventYear) return null;
  const age = Number(eventYear) - Number(by);
  return Number.isFinite(age) ? age : null;
}

function parseFlexibleCountToken(token) {
  const map = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    ek: 1,
    ekta: 1,
    dui: 2,
    duita: 2,
    tin: 3,
    tinta: 3,
    char: 4,
    charta: 4,
    pach: 5,
    pachta: 5
  };

  if (!token) return null;
  if (/^\d+$/.test(token)) return Number(token);
  return map[low(token)] ?? null;
}

function extractMarriageCount(text) {
  const patterns = [
    /\b(\d+|one|two|three|four|five|ek|ekta|dui|duita|tin|tinta|char|charta|pach|pachta)\s+marriages?\b/i,
    /\b(\d+|one|two|three|four|five|ek|ekta|dui|duita|tin|tinta|char|charta|pach|pachta)\s+biye\b/i,
    /\b(\d+|one|two|three|four|five|ek|ekta|dui|duita|tin|tinta|char|charta|pach|pachta)\s+bea\b/i
  ];

  for (const rx of patterns) {
    const m = String(text || "").match(rx);
    if (m) return parseFlexibleCountToken(m[1]);
  }
  return null;
}

function extractBrokenMarriageCount(text) {
  const patterns = [
    /\b(\d+|one|two|three|four|five|ek|ekta|dui|duita|tin|tinta|char|charta|pach|pachta)\s+divorce\b/i,
    /\b(\d+|one|two|three|four|five|ek|ekta|dui|duita|tin|tinta|char|charta|pach|pachta)\s+broken\b/i,
    /\b(\d+|one|two|three|four|five|ek|ekta|dui|duita|tin|tinta|char|charta|pach|pachta)\s+separation\b/i,
    /\b(\d+|one|two|three|four|five|ek|ekta|dui|duita|tin|tinta|char|charta|pach|pachta)\s+talak\b/i
  ];

  for (const rx of patterns) {
    const m = String(text || "").match(rx);
    if (m) return parseFlexibleCountToken(m[1]);
  }
  return null;
}

/* =====================================
   FACT PARSER
===================================== */

function parseFactAnchors(facts, question) {
  const rawText = `${facts || ""} ${question || ""}`.trim();
  const text = rawText.toLowerCase();

  let allYears = [];
  try {
    allYears = extractAllYears(text) || [];
  } catch {
    allYears = [];
  }

  const marriage_count_claim = extractMarriageCount(text);
  const broken_marriage_count = extractBrokenMarriageCount(text);

  let foreign_entry_year_claim = yearNear(text, [
    "uk",
    "foreign",
    "abroad",
    "came",
    "arrived",
    "entry",
    "entered uk",
    "moved",
    "visa",
    "immigration",
    "saudi",
    "dubai",
    "spain",
    "bidesh"
  ]);

  const student_visa_entry_year_claim = yearNear(text, [
    "student visa",
    "entered uk on student visa",
    "came on student visa",
    "arrived on student visa"
  ]);

  const route_shift_year_claim = yearNear(text, [
    "10 year route",
    "10-year route",
    "route visa",
    "moved to route",
    "switched to route",
    "route shift"
  ]);

  const settlement_year_claim = yearNear(text, [
    "ilr granted",
    "settlement granted",
    "settled",
    "permanent approved",
    "citizenship granted",
    "ilr approved"
  ]);

  const settlement_applied_year_claim = yearNear(text, [
    "ilr apply",
    "ilr applied",
    "settlement apply",
    "settlement applied",
    "applied ilr",
    "applied settlement"
  ]);

  const settlement_refusal_year_claim = yearNear(text, [
    "refusal",
    "refused",
    "rejected",
    "denied"
  ]);

  let appeal_year_claim = yearNear(text, [
    "appeal",
    "appealed",
    "appeal ongoing",
    "appeal filed"
  ]);

  const job_start_year_claim = yearNear(text, [
    "job started",
    "started job",
    "employment started",
    "work started"
  ]);

  const business_start_year_claim = yearNear(text, [
    "business started",
    "started business",
    "company started",
    "shop started",
    "trade started"
  ]);

  const study_start_year_claim = yearNear(text, [
    "school started",
    "college started",
    "university started",
    "study started",
    "student in"
  ]);

  const property_year_claim = yearNear(text, [
    "property",
    "house",
    "flat",
    "land",
    "home bought"
  ]);

  const debt_year_claim = yearNear(text, [
    "debt",
    "loan",
    "liability"
  ]);

  if (
    appeal_year_claim == null &&
    hasAny(text, ["appeal", "appealed", "appeal ongoing", "appeal filed"])
  ) {
    appeal_year_claim =
      settlement_refusal_year_claim ||
      settlement_applied_year_claim ||
      (allYears.length ? allYears[allYears.length - 1] : null);
  }

  if (
    foreign_entry_year_claim == null &&
    allYears.length &&
    hasAny(text, [
      "uk",
      "foreign",
      "abroad",
      "came",
      "arrived",
      "entry",
      "entered uk",
      "moved",
      "visa",
      "immigration",
      "saudi",
      "dubai",
      "spain",
      "bidesh"
    ])
  ) {
    foreign_entry_year_claim = allYears[0];
  }

  return {
    provided: !!rawText,
    raw_text: text,
    marriage_count_claim,
    broken_marriage_count,
    foreign_entry_year_claim,
    student_visa_entry_year_claim,
    route_shift_year_claim,
    settlement_year_claim,
    settlement_applied_year_claim,
    settlement_refusal_year_claim,
    appeal_year_claim,
    job_start_year_claim,
    business_start_year_claim,
    study_start_year_claim,
    property_year_claim,
    debt_year_claim,
    all_years: allYears
  };
}

/* =====================================
   DOMAIN HELPERS
===================================== */

function isForeignFamily(domainKey) {
  return ["FOREIGN", "IMMIGRATION", "VISA"].includes(up(domainKey));
}

function isSettlementFamily(domainKey) {
  return up(domainKey) === "SETTLEMENT";
}

function isLegalFamily(domainKey) {
  return up(domainKey) === "LEGAL" || up(domainKey) === "DOCUMENT";
}

function isJobFamily(domainKey) {
  return up(domainKey) === "JOB";
}

function isBusinessFamily(domainKey) {
  return up(domainKey) === "BUSINESS";
}

function isEducationFamily(domainKey) {
  return up(domainKey) === "EDUCATION";
}

function isPropertyFamily(domainKey) {
  return up(domainKey) === "PROPERTY";
}

function isDebtFamily(domainKey) {
  return up(domainKey) === "DEBT";
}

function isMarriageFamily(domainKey) {
  return up(domainKey) === "MARRIAGE";
}

function isDivorceFamily(domainKey) {
  return up(domainKey) === "DIVORCE";
}

function deriveYearFromFacts(domainKey, facts) {
  if (isForeignFamily(domainKey)) {
    return facts.foreign_entry_year_claim ?? null;
  }

  if (isSettlementFamily(domainKey)) {
    return (
      facts.appeal_year_claim ??
      facts.settlement_refusal_year_claim ??
      facts.settlement_applied_year_claim ??
      facts.settlement_year_claim ??
      null
    );
  }

  if (isLegalFamily(domainKey)) {
    return facts.appeal_year_claim ?? facts.settlement_refusal_year_claim ?? null;
  }

  if (isJobFamily(domainKey)) {
    return facts.job_start_year_claim ?? null;
  }

  if (isBusinessFamily(domainKey)) {
    return facts.business_start_year_claim ?? null;
  }

  if (isEducationFamily(domainKey)) {
    return facts.study_start_year_claim ?? facts.student_visa_entry_year_claim ?? null;
  }

  if (isPropertyFamily(domainKey)) {
    return facts.property_year_claim ?? null;
  }

  if (isDebtFamily(domainKey)) {
    return facts.debt_year_claim ?? null;
  }

  return null;
}

/* =====================================
   EVIDENCE + STATUS LAW
===================================== */

function mapEvidenceType(rawType, facts, domainKey) {
  const t = up(rawType);

  if (t === "DIRECT") return EVIDENCE.DIRECT_FACT;

  if (isForeignFamily(domainKey) && facts.foreign_entry_year_claim != null) {
    return EVIDENCE.FACT_ANCHORED;
  }

  if (
    isSettlementFamily(domainKey) &&
    (
      facts.settlement_year_claim != null ||
      facts.settlement_applied_year_claim != null ||
      facts.settlement_refusal_year_claim != null ||
      facts.appeal_year_claim != null
    )
  ) {
    return EVIDENCE.FACT_ANCHORED;
  }

  if (
    isLegalFamily(domainKey) &&
    (facts.appeal_year_claim != null || facts.settlement_refusal_year_claim != null)
  ) {
    return EVIDENCE.FACT_ANCHORED;
  }

  if (isJobFamily(domainKey) && facts.job_start_year_claim != null) {
    return EVIDENCE.FACT_ANCHORED;
  }

  if (isBusinessFamily(domainKey) && facts.business_start_year_claim != null) {
    return EVIDENCE.FACT_ANCHORED;
  }

  if (
    isEducationFamily(domainKey) &&
    (
      facts.study_start_year_claim != null ||
      facts.student_visa_entry_year_claim != null
    )
  ) {
    return EVIDENCE.FACT_ANCHORED;
  }

  if (isPropertyFamily(domainKey) && facts.property_year_claim != null) {
    return EVIDENCE.FACT_ANCHORED;
  }

  if (isDebtFamily(domainKey) && facts.debt_year_claim != null) {
    return EVIDENCE.FACT_ANCHORED;
  }

  if (isMarriageFamily(domainKey) && facts.marriage_count_claim != null) {
    return EVIDENCE.FACT_ANCHORED;
  }

  if (isDivorceFamily(domainKey) && facts.broken_marriage_count != null) {
    return EVIDENCE.FACT_ANCHORED;
  }

  if (t === "LIKELY_HISTORY") return EVIDENCE.PATTERN_ONLY;
  if (t === "NAME_PATTERN") return EVIDENCE.NAME_PATTERN;

  return EVIDENCE.UNKNOWN;
}

function decideFinalStatus({ evidenceType, domainKey, facts }) {
  if (evidenceType === EVIDENCE.DIRECT_FACT || evidenceType === EVIDENCE.FACT_ANCHORED) {
    if (isForeignFamily(domainKey)) {
      if (facts.foreign_entry_year_claim != null) return FINAL_STATUS.EXECUTED;
      return FINAL_STATUS.UNKNOWN;
    }

    if (isSettlementFamily(domainKey)) {
      if (facts.settlement_year_claim != null) return FINAL_STATUS.EXECUTED;
      if (facts.appeal_year_claim != null || facts.settlement_applied_year_claim != null) {
        return FINAL_STATUS.IN_PROGRESS;
      }
      if (facts.settlement_refusal_year_claim != null) return FINAL_STATUS.NOT_EXECUTED;
      return FINAL_STATUS.UNKNOWN;
    }

    if (isLegalFamily(domainKey)) {
      if (facts.appeal_year_claim != null) return FINAL_STATUS.IN_PROGRESS;
      if (facts.settlement_refusal_year_claim != null) return FINAL_STATUS.EXECUTED;
      return FINAL_STATUS.UNKNOWN;
    }

    if (isJobFamily(domainKey) && facts.job_start_year_claim != null) {
      return FINAL_STATUS.EXECUTED;
    }

    if (isBusinessFamily(domainKey) && facts.business_start_year_claim != null) {
      return FINAL_STATUS.EXECUTED;
    }

    if (isEducationFamily(domainKey)) {
      if (facts.study_start_year_claim != null) return FINAL_STATUS.EXECUTED;
      if (facts.student_visa_entry_year_claim != null) return FINAL_STATUS.EXECUTED;
      return FINAL_STATUS.UNKNOWN;
    }

    if (isPropertyFamily(domainKey) && facts.property_year_claim != null) {
      return FINAL_STATUS.EXECUTED;
    }

    if (isDebtFamily(domainKey) && facts.debt_year_claim != null) {
      return FINAL_STATUS.EXECUTED;
    }

    if (isMarriageFamily(domainKey)) {
      return facts.marriage_count_claim > 0 ? FINAL_STATUS.EXECUTED : FINAL_STATUS.NOT_EXECUTED;
    }

    if (isDivorceFamily(domainKey)) {
      return facts.broken_marriage_count > 0 ? FINAL_STATUS.EXECUTED : FINAL_STATUS.NOT_EXECUTED;
    }

    return FINAL_STATUS.UNKNOWN;
  }

  if (evidenceType === EVIDENCE.PATTERN_CONFIRMED) return FINAL_STATUS.UNKNOWN;
  if (evidenceType === EVIDENCE.PATTERN_ONLY) return FINAL_STATUS.UNKNOWN;
  if (evidenceType === EVIDENCE.NAME_PATTERN) return FINAL_STATUS.NOT_EXECUTED;

  return FINAL_STATUS.UNKNOWN;
}

function deliveryStateFromFinal(status) {
  switch (status) {
    case FINAL_STATUS.EXECUTED:
      return "occurred";
    case FINAL_STATUS.IN_PROGRESS:
      return "ongoing";
    case FINAL_STATUS.NOT_EXECUTED:
      return "not_occurred";
    default:
      return "unknown";
  }
}

/* =====================================
   EVENT LABEL REFINEMENT
===================================== */

function refinedEventType(domainKey, facts, fallbackType) {
  if (isSettlementFamily(domainKey)) {
    if (facts.appeal_year_claim != null) return "settlement appeal ongoing";
    if (facts.settlement_refusal_year_claim != null && facts.settlement_applied_year_claim != null) {
      return "settlement refusal after application";
    }
    if (facts.settlement_applied_year_claim != null) return "settlement application in process";
    if (facts.settlement_year_claim != null) return "settlement granted";
    return "settlement process";
  }

  if (isLegalFamily(domainKey)) {
    if (facts.appeal_year_claim != null) return "appeal event";
    if (facts.settlement_refusal_year_claim != null) return "refusal event";
    return "legal / authority phase";
  }

  if (isEducationFamily(domainKey)) {
    if (facts.study_start_year_claim != null) return "study / university phase";
    if (facts.student_visa_entry_year_claim != null) return "student visa entry phase";
  }

  return fallbackType || "domain event";
}

/* =====================================
   DOMAIN REBUILD
===================================== */

function normalizeEvent(event, domainKey, facts) {
  const out = clone(event);
  const mappedEvidence = mapEvidenceType(out?.evidence_type, facts, domainKey);
  const finalStatus = decideFinalStatus({
    evidenceType: mappedEvidence,
    domainKey,
    facts
  });

  out.evidence_type = mappedEvidence;
  out.status = finalStatus;
  out.event_type = refinedEventType(domainKey, facts, out?.event_type);

  if (finalStatus === FINAL_STATUS.EXECUTED) {
    out.trigger_phase = "event confirmed";
    out.impact_summary = "event has definitively occurred";
  } else if (finalStatus === FINAL_STATUS.IN_PROGRESS) {
    out.trigger_phase = "process active";
    out.impact_summary = "process is active but not completed";
  } else if (finalStatus === FINAL_STATUS.NOT_EXECUTED) {
    out.trigger_phase = "no confirmed execution";
    out.impact_summary = "event not confirmed";
  } else {
    out.trigger_phase = "insufficient truth";
    out.impact_summary = "insufficient truth to confirm event";
  }

  out.carryover_to_present =
    finalStatus === FINAL_STATUS.EXECUTED || finalStatus === FINAL_STATUS.IN_PROGRESS
      ? "YES"
      : "NO";

  return out;
}

function finalStateFromEvents(events) {
  const statuses = safeArray(events).map((e) => e?.status);

  if (statuses.includes(FINAL_STATUS.EXECUTED)) return FINAL_STATUS.EXECUTED;
  if (statuses.includes(FINAL_STATUS.IN_PROGRESS)) return FINAL_STATUS.IN_PROGRESS;
  if (statuses.includes(FINAL_STATUS.NOT_EXECUTED)) return FINAL_STATUS.NOT_EXECUTED;
  return FINAL_STATUS.UNKNOWN;
}

function rebuildDomainResult(domain, facts) {
  const out = clone(domain);
  const normalizedEvents = safeArray(out.events).map((e) => normalizeEvent(e, out.domain_key, facts));
  out.events = normalizedEvents;
  out.final_state = finalStateFromEvents(normalizedEvents);

  if (out.primary_exact_event) {
    out.primary_exact_event = normalizeEvent(out.primary_exact_event, out.domain_key, facts);
    out.primary_exact_event.date_marker = deriveYearFromFacts(out.domain_key, facts);
    out.primary_exact_event.month_or_phase =
      out.primary_exact_event.date_marker != null ? "year-anchored phase" : (out.primary_exact_event.month_or_phase || "phase only");
  }

  out.alternative_exact_events = safeArray(out.alternative_exact_events).map((e) => {
    const normalized = normalizeEvent(e, out.domain_key, facts);
    normalized.date_marker = deriveYearFromFacts(out.domain_key, facts);
    normalized.month_or_phase =
      normalized.date_marker != null ? "year-anchored phase" : (normalized.month_or_phase || "phase only");
    return normalized;
  });

  return out;
}

/* =====================================
   SINGLE SOURCE OF TRUTH
===================================== */

function buildDomainMap(domainResults) {
  const map = {};

  for (const d of safeArray(domainResults)) {
    const dk = low(d?.domain_key);
    if (!dk) continue;

    map[dk] = {
      final_state: d?.final_state || FINAL_STATUS.UNKNOWN,
      year: d?.primary_exact_event?.date_marker ?? null,
      event_type: d?.primary_exact_event?.event_type ?? null
    };
  }

  return map;
}

function pickState(...states) {
  if (states.includes(FINAL_STATUS.EXECUTED)) return FINAL_STATUS.EXECUTED;
  if (states.includes(FINAL_STATUS.IN_PROGRESS)) return FINAL_STATUS.IN_PROGRESS;
  if (states.includes(FINAL_STATUS.NOT_EXECUTED)) return FINAL_STATUS.NOT_EXECUTED;
  return FINAL_STATUS.UNKNOWN;
}

function buildSectorState(domainMap) {
  return {
    marriage: domainMap.marriage?.final_state || FINAL_STATUS.UNKNOWN,
    divorce: domainMap.divorce?.final_state || FINAL_STATUS.UNKNOWN,
    multiple_marriage: domainMap.multiple_marriage?.final_state || FINAL_STATUS.UNKNOWN,
    foreign: pickState(
      domainMap.foreign?.final_state,
      domainMap.immigration?.final_state,
      domainMap.visa?.final_state
    ),
    settlement: domainMap.settlement?.final_state || FINAL_STATUS.UNKNOWN,
    immigration: domainMap.immigration?.final_state || FINAL_STATUS.UNKNOWN,
    visa: domainMap.visa?.final_state || FINAL_STATUS.UNKNOWN,
    education: domainMap.education?.final_state || FINAL_STATUS.UNKNOWN,
    job: domainMap.job?.final_state || FINAL_STATUS.UNKNOWN,
    career: domainMap.career?.final_state || FINAL_STATUS.UNKNOWN,
    business: domainMap.business?.final_state || FINAL_STATUS.UNKNOWN,
    money: pickState(domainMap.money?.final_state, domainMap.debt?.final_state),
    property: domainMap.property?.final_state || FINAL_STATUS.UNKNOWN,
    health: domainMap.health?.final_state || FINAL_STATUS.UNKNOWN,
    mental: domainMap.mental?.final_state || FINAL_STATUS.UNKNOWN,
    legal: pickState(domainMap.legal?.final_state, domainMap.document?.final_state),
    family: domainMap.family?.final_state || FINAL_STATUS.UNKNOWN,
    children: domainMap.children?.final_state || FINAL_STATUS.UNKNOWN,
    blockage: domainMap.blockage?.final_state || FINAL_STATUS.UNKNOWN,
    enemy: domainMap.enemy?.final_state || FINAL_STATUS.UNKNOWN,
    debt: domainMap.debt?.final_state || FINAL_STATUS.UNKNOWN,
    partnership: domainMap.partnership?.final_state || FINAL_STATUS.UNKNOWN
  };
}

function rebuildValidationLayer(baseValidation, domainMap) {
  const out = clone(baseValidation);
  out.sector_state = buildSectorState(domainMap);

  out.sector_validation = safeArray(out.sector_validation).map((row) => {
    const sector = low(row?.sector);
    return {
      ...row,
      backend_state: out.sector_state[sector] || FINAL_STATUS.UNKNOWN
    };
  });

  return out;
}

function buildDeliverySafePacket(sectorState) {
  const normalized_states = {};
  for (const [k, v] of Object.entries(sectorState || {})) {
    normalized_states[k] = deliveryStateFromFinal(v);
  }

  const domain_truth_map = {
    foreign: {
      movement: normalized_states.foreign || "unknown",
      settlement: normalized_states.settlement || "unknown",
      immigration: normalized_states.immigration || "unknown",
      visa: normalized_states.visa || "unknown"
    },
    relationship: {
      marriage: normalized_states.marriage || "unknown",
      divorce: normalized_states.divorce || "unknown",
      multiple_marriage: normalized_states.multiple_marriage || "unknown"
    },
    work: {
      job: normalized_states.job || "unknown",
      career: normalized_states.career || "unknown",
      business: normalized_states.business || "unknown"
    },
    money: {
      money: normalized_states.money || "unknown",
      debt: normalized_states.debt || "unknown",
      property: normalized_states.property || "unknown"
    },
    health: {
      health: normalized_states.health || "unknown",
      mental: normalized_states.mental || "unknown"
    },
    conflict: {
      legal: normalized_states.legal || "unknown",
      blockage: normalized_states.blockage || "unknown",
      enemy: normalized_states.enemy || "unknown"
    },
    family: {
      family: normalized_states.family || "unknown",
      children: normalized_states.children || "unknown"
    },
    education: {
      education: normalized_states.education || "unknown"
    }
  };

  const truth_lines = [];

  if (normalized_states.foreign === "occurred") {
    truth_lines.push("বিদেশে যাওয়ার ঘটনা ঘটেছে");
  }

  if (normalized_states.settlement === "occurred") {
    truth_lines.push("স্থায়ীভাবে বসার বিষয় সম্পন্ন হয়েছে");
  } else if (normalized_states.settlement === "ongoing") {
    truth_lines.push("স্থায়ীভাবে বসার বিষয় এখনো প্রক্রিয়ায় আছে");
  }

  if (normalized_states.legal === "ongoing") {
    truth_lines.push("appeal বা legal process এখনো চলমান");
  } else if (normalized_states.legal === "occurred") {
    truth_lines.push("legal বা authority-সংক্রান্ত ঘটনা বাস্তবে ঘটেছে");
  }

  if (normalized_states.education === "occurred") {
    truth_lines.push("শিক্ষা বা student-line জীবনে বাস্তবে খুলেছে");
  }

  if (normalized_states.business === "occurred") {
    truth_lines.push("business line জীবনে উঠেছে");
  }

  return {
    normalized_states,
    domain_truth_map,
    truth_lines: unique(truth_lines),
    final_truth_summary: unique(truth_lines).length
      ? unique(truth_lines).join("। ") + "।"
      : "স্পষ্ট কোনো নিশ্চিত ঘটনা প্রমাণ পাওয়া যায়নি।"
  };
}

function buildRecognitionLines(sectorState) {
  const lines = [];

  if (
    sectorState.marriage === FINAL_STATUS.EXECUTED ||
    sectorState.marriage === FINAL_STATUS.IN_PROGRESS ||
    sectorState.partnership === FINAL_STATUS.EXECUTED ||
    sectorState.partnership === FINAL_STATUS.IN_PROGRESS
  ) {
    lines.push("সম্পর্ক বা দাম্পত্যের লাইন জীবনে কার্যকর হয়েছে।");
  } else if (
    sectorState.marriage === FINAL_STATUS.UNKNOWN ||
    sectorState.partnership === FINAL_STATUS.UNKNOWN
  ) {
    lines.push("সম্পর্কের বিষয়ে কিছু ইঙ্গিত আছে, কিন্তু স্পষ্ট প্রমাণ নেই।");
  }

  if (
    sectorState.foreign === FINAL_STATUS.EXECUTED ||
    sectorState.foreign === FINAL_STATUS.IN_PROGRESS
  ) {
    lines.push("জায়গা বদল বা বিদেশ-সংক্রান্ত লাইন জীবনে কাজ করেছে।");
  } else if (
    sectorState.foreign === FINAL_STATUS.UNKNOWN &&
    sectorState.settlement === FINAL_STATUS.UNKNOWN
  ) {
    lines.push("বিদেশ বা base-change বিষয়ে কিছু প্রবণতা আছে, কিন্তু নিশ্চিত প্রমাণ নেই।");
  }

  if (
    sectorState.legal === FINAL_STATUS.EXECUTED ||
    sectorState.legal === FINAL_STATUS.IN_PROGRESS
  ) {
    lines.push("কাগজ, আপিল বা কর্তৃপক্ষের বিষয় বাস্তবে সক্রিয় হয়েছে।");
  } else if (sectorState.legal === FINAL_STATUS.UNKNOWN) {
    lines.push("কর্তৃপক্ষ বা বিরোধের বিষয়ে চাপের ইঙ্গিত আছে, কিন্তু নিশ্চিত ঘটনা ধরা যায়নি।");
  }

  return unique(lines);
}

function buildSummary(domainMap, sectorState, evidenceLayer, input, facts) {
  return {
    primary_domain: evidenceLayer?.event_summary?.primary_domain || "GENERAL",
    total_events: safeArray(evidenceLayer?.exact_domain_summary).length,
    top_domains: safeArray(evidenceLayer?.exact_domain_summary)
      .slice(0, 5)
      .map((d) => d?.domain_label),

    relationship: {
      marriage_count: facts.marriage_count_claim ?? 0,
      broken_marriage_count: facts.broken_marriage_count ?? 0,
      current_marriage_status: sectorState.marriage,
      latest_relationship_event_type: domainMap.marriage?.event_type ?? null,
      marriage_year: domainMap.marriage?.year ?? null,
      marriage_age: ageFromYear(domainMap.marriage?.year, input.dob)
    },

    work: {
      dominant_work_mode:
        sectorState.business === FINAL_STATUS.EXECUTED
          ? "BUSINESS"
          : sectorState.job === FINAL_STATUS.EXECUTED
          ? "JOB"
          : sectorState.education === FINAL_STATUS.EXECUTED
          ? "EDUCATION"
          : "UNKNOWN",
      education_active: sectorState.education === FINAL_STATUS.EXECUTED,
      job_active: sectorState.job === FINAL_STATUS.EXECUTED,
      business_active: sectorState.business === FINAL_STATUS.EXECUTED,
      education_year: domainMap.education?.year ?? null,
      education_age: ageFromYear(domainMap.education?.year, input.dob),
      job_year: domainMap.job?.year ?? null,
      job_age: ageFromYear(domainMap.job?.year, input.dob),
      business_year: domainMap.business?.year ?? null,
      business_age: ageFromYear(domainMap.business?.year, input.dob)
    },

    foreign: {
      foreign_shift_count:
        ["foreign", "immigration", "visa", "settlement", "legal"].filter(
          (k) => domainMap[k]?.final_state === FINAL_STATUS.EXECUTED || domainMap[k]?.final_state === FINAL_STATUS.IN_PROGRESS
        ).length,
      foreign_entry_year: domainMap.foreign?.year ?? domainMap.immigration?.year ?? domainMap.visa?.year ?? null,
      foreign_entry_age: ageFromYear(domainMap.foreign?.year ?? domainMap.immigration?.year ?? domainMap.visa?.year, input.dob),
      route_shift_year: facts.route_shift_year_claim ?? null,
      route_shift_age: ageFromYear(facts.route_shift_year_claim, input.dob),
      settlement_applied_year: facts.settlement_applied_year_claim ?? null,
      settlement_applied_age: ageFromYear(facts.settlement_applied_year_claim, input.dob),
      settlement_year: domainMap.settlement?.final_state === FINAL_STATUS.EXECUTED ? domainMap.settlement?.year ?? null : null,
      settlement_age: ageFromYear(
        domainMap.settlement?.final_state === FINAL_STATUS.EXECUTED ? domainMap.settlement?.year : null,
        input.dob
      ),
      refusal_year: facts.settlement_refusal_year_claim ?? null,
      refusal_age: ageFromYear(facts.settlement_refusal_year_claim, input.dob),
      appeal_year: facts.appeal_year_claim ?? null,
      appeal_age: ageFromYear(facts.appeal_year_claim, input.dob),
      foreign_process_status: sectorState.foreign,
      settlement_status: sectorState.settlement
    },

    health: pickState(sectorState.health, sectorState.mental),
    money: pickState(sectorState.money, sectorState.debt, sectorState.property),
    conflict: sectorState.legal,

    timing_summary: {
      first_visible_year: null,
      first_visible_phase: safeArray(evidenceLayer?.exact_domain_summary)[0]?.primary_exact_event?.month_or_phase ?? null,
      first_visible_time_band: safeArray(evidenceLayer?.exact_domain_summary)[0]?.primary_exact_event?.exact_time_band ?? null,
      last_visible_year: null,
      last_visible_phase:
        safeArray(evidenceLayer?.exact_domain_summary).slice(-1)[0]?.primary_exact_event?.month_or_phase ?? null,
      last_visible_time_band:
        safeArray(evidenceLayer?.exact_domain_summary).slice(-1)[0]?.primary_exact_event?.exact_time_band ?? null,
      total_timed_events: safeArray(evidenceLayer?.exact_domain_summary).filter((x) => x?.primary_exact_event).length,
      exact_timeline_allowed: true
    },

    truth_summary: evidenceLayer?.event_summary?.truth_summary || {},
    recognition_lines: buildRecognitionLines(sectorState),
    current_carryover: true
  };
}

function buildVerdict(sectorState, truthSummary) {
  return {
    forensic_direction:
      `Universal scan final state: ` +
      `Relationship ${pickState(sectorState.marriage, sectorState.partnership)}. ` +
      `Foreign ${sectorState.foreign}. ` +
      `Settlement ${sectorState.settlement}. ` +
      `Legal ${sectorState.legal}. ` +
      `Health ${pickState(sectorState.health, sectorState.mental)}. ` +
      `Money ${pickState(sectorState.money, sectorState.debt, sectorState.property)}. ` +
      `Truth level ${truthSummary?.truth_level || "UNKNOWN"}.`,
    validation_state: "STABLE"
  };
}

function buildLokkothaSummary(exactCount, truthSummary) {
  return {
    text:
      `general-এর হিসাব এখন বন্ধ খাতায় ধরা আছে; ` +
      `বড় চিহ্ন ${exactCount}, ` +
      `ভাঙা চিহ্ন 0, ` +
      `আর ঢেউ এখনও টিকে আছে. ` +
      `সত্যের স্তর ${truthSummary?.truth_level || "UNKNOWN"}.`
  };
}

function buildTopLevelTruthSummary(core, astro, evidenceLayer, facts) {
  const modeFlags = astro?.mode_flags || {};
  const truthSummary = evidenceLayer?.event_summary?.truth_summary || {};

  const directEvidenceCount =
    [
      facts.foreign_entry_year_claim,
      facts.student_visa_entry_year_claim,
      facts.route_shift_year_claim,
      facts.settlement_year_claim,
      facts.settlement_applied_year_claim,
      facts.settlement_refusal_year_claim,
      facts.appeal_year_claim,
      facts.job_start_year_claim,
      facts.business_start_year_claim,
      facts.study_start_year_claim,
      facts.property_year_claim,
      facts.debt_year_claim
    ].filter((x) => x != null).length + (facts.marriage_count_claim ? 1 : 0);

  return {
    subject_mode: core?.subject_context?.subject_mode || null,
    identity_depth: core?.subject_context?.identity_depth || null,
    identity_confidence: core?.subject_context?.identity_confidence || null,
    precision_mode: core?.birth_context?.precision_mode || null,
    weak_timeline_mode: !!(modeFlags.isNameOnly || modeFlags.isNameContext),
    exact_timeline_allowed: true,
    truth_level:
      directEvidenceCount >= 4
        ? "HIGH"
        : directEvidenceCount > 0
        ? "FACT_ANCHORED"
        : truthSummary?.likely_history_count > 0
        ? "PATTERN_HEAVY"
        : "UNKNOWN",
    direct_evidence_count: directEvidenceCount,
    pattern_confirmed_count: 0,
    repeated_pattern_count: 0,
    likely_history_count: truthSummary?.likely_history_count ?? 0,
    name_pattern_count: truthSummary?.name_pattern_count ?? 0
  };
}

/* =====================================
   MAIN
===================================== */

export default async function handler(req, res) {
  try {
    const q = req.query || {};

    const input = {
      name: str(q.name),
      dob: str(q.dob),
      tob: str(q.tob),
      pob: str(q.pob),
      latitude: toNum(q.latitude),
      longitude: toNum(q.longitude),
      timezone_offset: str(q.timezone_offset || "+06:00"),
      question: str(q.question),
      facts: str(q.facts),
      format: normalizeFormat(q.format),
      current_datetime_iso: str(q.current_datetime_iso)
    };

    if (!input.question && input.name) {
      input.question = `${input.name} past history`;
    }

    if (!input.name && !input.dob && !input.facts) {
      return res.status(400).json({
        engine_status: ENGINE_STATUS,
        system_status: "INPUT_ERROR",
        message: "Provide at least a name, DOB, or facts."
      });
    }

    const core = await buildChartCore(input, astroProvider);

    if (core?.system_status !== "OK") {
      return res.status(400).json({
        engine_status: ENGINE_STATUS,
        system_status: "INPUT_ERROR",
        details: core
      });
    }

    const facts = parseFactAnchors(input.facts, input.question);

    const stage1 = runIntelligenceLayer({
      domainResults: [],
      question: input.question
    });

    const astro = runAstroLayer({
      evidence_packet: core.evidence_packet,
      facts,
      question_profile: stage1.question_profile,
      subject_context: core.subject_context,
      birth_context: core.birth_context
    });

    const stage2 = runIntelligenceLayer({
      domainResults: astro.domain_results,
      question: input.question
    });

    const finalizedDomains = runEventFinalizer(stage2.ranked_domains);

    const validationLayerRaw = runValidationLayer({
      question: input.question,
      finalizedDomains
    });

    const rawIdentityPacket = buildIdentityPacket({
      input,
      subjectContext: core.subject_context,
      birthContext: core.birth_context,
      evidencePacket: core.evidence_packet
    });

    const identityPacket = correctIdentityPacket(rawIdentityPacket, input, facts);

    const master_timeline = buildTimeline({
      ranked_domains: finalizedDomains,
      birth_context: core.birth_context,
      subject_context: core.subject_context
    });

    const evidenceLayer = runEvidenceLayer({
      input,
      facts,
      question_profile: stage2.question_profile,
      ranked_domains: finalizedDomains,
      master_timeline,
      carryover: stage2.carryover,
      validation_layer: validationLayerRaw,
      subject_context: core.subject_context,
      birth_context: core.birth_context
    });

    const rebuiltDomainResults = safeArray(evidenceLayer?.ranked_domains).map((d) =>
      rebuildDomainResult(d, facts)
    );

    const exact_domain_summary = rebuiltDomainResults
      .filter((d) => d?.primary_exact_event)
      .map((d) => ({
        domain_key: d.domain_key,
        domain_label: d.domain_label,
        exact_time_band: d.exact_time_band || d?.primary_exact_event?.exact_time_band || null,
        primary_exact_event: d.primary_exact_event,
        alternative_exact_events: d.alternative_exact_events || []
      }));

    const domainMap = buildDomainMap(rebuiltDomainResults);
    const validation_layer = rebuildValidationLayer(validationLayerRaw, domainMap);
    const sectorState = validation_layer.sector_state;
    const delivery_safe_packet = buildDeliverySafePacket(sectorState);
    const truth_summary = buildTopLevelTruthSummary(core, astro, evidenceLayer, facts);
    const summary = buildSummary(domainMap, sectorState, evidenceLayer, input, facts);
    const verdict = buildVerdict(sectorState, truth_summary);
    const lokkotha_summary = buildLokkothaSummary(exact_domain_summary.length, truth_summary);

    const payload = {
      engine_status: ENGINE_STATUS,
      output_format: input.format === "json" ? "json" : input.format,
      subject_mode: core?.subject_context?.subject_mode || null,
      identity_depth: core?.subject_context?.identity_depth || null,
      precision_mode: core?.birth_context?.precision_mode || null,
      truth_summary,
      validation_layer,
      identity_packet: identityPacket,
      delivery_safe_packet,
      summary,
      exact_domain_summary,
      verdict,
      lokkotha_summary
    };

    if (input.format === "compact") {
      return res.status(200).json(payload);
    }

    if (input.format === "project") {
      return res.status(200).json({
        engine_status: ENGINE_STATUS,
        output_format: "project",
        subject_mode: core?.subject_context?.subject_mode || null,
        identity_depth: core?.subject_context?.identity_depth || null,
        precision_mode: core?.birth_context?.precision_mode || null,
        truth_summary,
        validation_layer,
        identity_packet: identityPacket,
        delivery_safe_packet,
        project_paste_block: evidenceLayer?.project_paste_block || ""
      });
    }

    return res.status(200).json({
      engine_status: ENGINE_STATUS,
      system_status: "OK",
      mode: core?.subject_context?.question_mode || "GENERAL",
      subject_mode: core?.subject_context?.subject_mode || null,
      identity_depth: core?.subject_context?.identity_depth || null,
      precision_mode: core?.birth_context?.precision_mode || null,
      input_normalized: core?.input_normalized || {},
      subject_context: core?.subject_context || {},
      birth_context: core?.birth_context || {},
      current_context: core?.current_context || {},
      fact_anchor_block: facts,
      question_profile: stage2?.question_profile || {},
      linked_domain_expansion: stage2?.linked_domain_expansion || [],
      evidence_normalized: astro?.evidence_normalized || {},
      mode_flags: astro?.mode_flags || {},
      name_hints: astro?.name_hints || {},
      validation_layer,
      identity_packet: identityPacket,
      delivery_safe_packet,
      top_ranked_domains: rebuiltDomainResults.slice(0, 12).map((d) => ({
        domain_key: d?.domain_key,
        domain_label: d?.domain_label,
        normalized_score: d?.normalized_score,
        density: d?.density,
        residual_impact: d?.residual_impact,
        major_event_count: d?.major_event_count,
        broken_event_count: d?.broken_event_count,
        active_event_count: d?.active_event_count,
        final_state: d?.final_state || null,
        pattern_mode_active: !!d?.pattern_mode_active,
        exact_timeline_allowed: d?.exact_timeline_allowed !== false,
        direct_evidence_count: Number(d?.direct_evidence_count || 0),
        pattern_evidence_count: Number(d?.pattern_evidence_count || 0)
      })),
      domain_results: rebuiltDomainResults,
      exact_domain_summary,
      event_summary: evidenceLayer?.event_summary || {},
      truth_summary,
      master_timeline: evidenceLayer?.master_timeline || [],
      current_carryover: stage2?.carryover || {},
      validation_block: evidenceLayer?.validation_block || {},
      forensic_verdict: verdict,
      lokkotha_summary,
      project_paste_block: evidenceLayer?.project_paste_block || ""
    });
  } catch (error) {
    return res.status(500).json({
      engine_status: ENGINE_STATUS,
      system_status: "ERROR",
      error_message: error instanceof Error ? error.message : "Unknown error"
    });
  }
}