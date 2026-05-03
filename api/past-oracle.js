// api/past-oracle.js
// FULL REPLACEMENT — UNIVERSAL_PAST_NANO_SCANNER_V7
// HARD CONSISTENCY LOCK
// UNIVERSAL CLIENT-SAFE VERSION
// FACTS OPTIONAL — NO PERSONAL DATA HARDCODE
// PATTERN ≠ EXECUTED
// FACTS → ANCHOR / YEAR / STATUS
// FIXED YEAR BINDING: 2009 ENTRY ≠ 2015 ROUTE ≠ 2025 APPLY ≠ 2026 REFUSAL/APPEAL
// NO STALE EVENT_SUMMARY / PROJECT_BLOCK / MASTER_TIMELINE

import { buildChartCore } from "../lib/chart-core.js";
import { astroProvider } from "../lib/provider-adapter.js";
import { runIntelligenceLayer } from "../lib/layer-intelligence.js";
import { runAstroLayer, buildTimeline } from "../lib/layer-astro.js";
import { runEvidenceLayer } from "../lib/layer-evidence.js";
import { runEventFinalizer } from "../lib/event-finalizer.js";
import { runValidationLayer } from "../lib/layer-validation.js";
import { buildIdentityPacket } from "../lib/identity-packet.js";
import { correctIdentityPacket } from "../lib/domain-corrector.js";

const ENGINE_STATUS = "UNIVERSAL_PAST_NANO_SCANNER_V7";

const FINAL_STATUS = {
  EXECUTED: "EXECUTED",
  IN_PROGRESS: "IN_PROGRESS",
  NOT_EXECUTED: "NOT_EXECUTED",
  UNKNOWN: "UNKNOWN"
};

const EVIDENCE = {
  DIRECT_FACT: "DIRECT_FACT",
  FACT_ANCHORED: "FACT_ANCHORED",
  PATTERN_ONLY: "PATTERN_ONLY",
  NAME_PATTERN: "NAME_PATTERN",
  UNKNOWN: "UNKNOWN"
};

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

function clone(obj) {
  return JSON.parse(JSON.stringify(obj || {}));
}

function unique(arr) {
  return [...new Set(safeArray(arr).filter(Boolean))];
}

function hasAny(text, arr) {
  const src = low(text);
  return arr.some((x) => src.includes(low(x)));
}

function extractAllYears(text) {
  return [...String(text || "").matchAll(/\b(19|20)\d{2}\b/g)].map((m) => Number(m[0]));
}

function splitFactClauses(text) {
  return String(text || "")
    .replace(/\band then\b/gi, ",")
    .replace(/\bthen\b/gi, ",")
    .replace(/\bafter that\b/gi, ",")
    .split(/[,\n;|]+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function firstYearInText(text) {
  const m = String(text || "").match(/\b(19|20)\d{2}\b/);
  return m ? Number(m[0]) : null;
}

function lastYearInText(text) {
  const yrs = extractAllYears(text);
  return yrs.length ? yrs[yrs.length - 1] : null;
}

function clauseYearByKeywords(src, keywords) {
  const clauses = splitFactClauses(src);

  for (const clause of clauses) {
    if (hasAny(clause, keywords)) {
      const y = firstYearInText(clause);
      if (y != null) return y;
    }
  }

  return null;
}

function yearNear(src, keywords) {
  const text = String(src || "");
  const clauseYear = clauseYearByKeywords(text, keywords);
  if (clauseYear != null) return clauseYear;

  for (const kw of keywords) {
    const idx = text.toLowerCase().indexOf(String(kw).toLowerCase());
    if (idx === -1) continue;

    const after = text.slice(idx, idx + 180);
    const afterYear = firstYearInText(after);
    if (afterYear != null) return afterYear;

    const before = text.slice(Math.max(0, idx - 120), idx);
    const beforeYear = lastYearInText(before);
    if (beforeYear != null) return beforeYear;
  }

  return null;
}

function birthYearFromDob(dob) {
  const raw = str(dob);
  const m = raw.match(/\b(19|20)\d{2}\b/);
  if (m) return Number(m[0]);

  const parts = raw.split(/[-/]/).map((x) => x.trim());
  if (parts.length === 3) {
    const y = Number(parts[2]);
    if (Number.isFinite(y) && y > 1900) return y;
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

function extractCount(text, patterns) {
  for (const rx of patterns) {
    const m = String(text || "").match(rx);
    if (m) return parseFlexibleCountToken(m[1]);
  }
  return null;
}

function extractMarriageCount(text) {
  return extractCount(text, [
    /\b(\d+|one|two|three|four|five|ek|ekta|dui|duita|tin|tinta|char|charta|pach|pachta)\s+marriages?\b/i,
    /\b(\d+|one|two|three|four|five|ek|ekta|dui|duita|tin|tinta|char|charta|pach|pachta)\s+biye\b/i,
    /\b(\d+|one|two|three|four|five|ek|ekta|dui|duita|tin|tinta|char|charta|pach|pachta)\s+bea\b/i
  ]);
}

function extractBrokenMarriageCount(text) {
  return extractCount(text, [
    /\b(\d+|one|two|three|four|five|ek|ekta|dui|duita|tin|tinta|char|charta|pach|pachta)\s+divorce\b/i,
    /\b(\d+|one|two|three|four|five|ek|ekta|dui|duita|tin|tinta|char|charta|pach|pachta)\s+broken\b/i,
    /\b(\d+|one|two|three|four|five|ek|ekta|dui|duita|tin|tinta|char|charta|pach|pachta)\s+separation\b/i,
    /\b(\d+|one|two|three|four|five|ek|ekta|dui|duita|tin|tinta|char|charta|pach|pachta)\s+talak\b/i
  ]);
}

/* =========================
   FACT PARSER — FIXED
========================= */

function parseFactAnchors(facts, question) {
  const rawText = `${facts || ""} ${question || ""}`.trim();
  const text = rawText.toLowerCase();
  const allYears = extractAllYears(text);

  const foreign_entry_year_claim =
    yearNear(text, [
      "entered uk",
      "came to uk",
      "came uk",
      "arrived in uk",
      "arrived uk",
      "foreign entry",
      "moved abroad",
      "moved to uk",
      "bidesh",
      "abroad"
    ]) ||
    (hasAny(text, ["uk", "foreign", "abroad", "bidesh", "immigration"]) && allYears.length ? allYears[0] : null);

  const student_visa_entry_year_claim = yearNear(text, [
    "student visa",
    "entered uk on student visa",
    "came on student visa",
    "arrived on student visa"
  ]);

  const route_shift_year_claim = yearNear(text, [
    "10 year route",
    "10-year route",
    "family route",
    "partner route",
    "private life route",
    "ltr",
    "leave to remain",
    "route shift",
    "switched route",
    "switched to route",
    "got ltr",
    "ltr granted"
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
    "ilr applied",
    "ilr apply",
    "applied ilr",
    "settlement applied",
    "settlement apply",
    "applied settlement"
  ]);

  const settlement_refusal_year_claim = yearNear(text, [
    "ilr rejected",
    "ilr refused",
    "settlement rejected",
    "settlement refused",
    "rejected",
    "refused",
    "refusal",
    "denied"
  ]);

  let appeal_year_claim = yearNear(text, [
    "appeal ongoing",
    "appeal filed",
    "appealed",
    "appeal",
    "tribunal"
  ]);

  if (appeal_year_claim == null && hasAny(text, ["appeal", "appealed", "tribunal"])) {
    appeal_year_claim =
      settlement_refusal_year_claim ||
      settlement_applied_year_claim ||
      (allYears.length ? allYears[allYears.length - 1] : null);
  }

  return {
    provided: !!rawText,
    raw_text: text,
    marriage_count_claim: extractMarriageCount(text),
    broken_marriage_count: extractBrokenMarriageCount(text),
    foreign_entry_year_claim,
    student_visa_entry_year_claim,
    route_shift_year_claim,
    settlement_year_claim,
    settlement_applied_year_claim,
    settlement_refusal_year_claim,
    appeal_year_claim,
    job_start_year_claim: yearNear(text, ["job started", "started job", "employment started", "work started"]),
    business_start_year_claim: yearNear(text, ["business started", "started business", "company started", "shop started", "trade started"]),
    study_start_year_claim: yearNear(text, ["study started", "started study", "school started", "college started", "university started", "enrolled"]),
    property_year_claim: yearNear(text, ["property", "house", "flat", "land", "home bought"]),
    debt_year_claim: yearNear(text, ["debt", "loan", "liability"]),
    all_years: allYears
  };
}

/* =========================
   DOMAIN HELPERS
========================= */

function isForeignFamily(k) {
  return ["FOREIGN", "IMMIGRATION", "VISA"].includes(up(k));
}

function isSettlementFamily(k) {
  return up(k) === "SETTLEMENT";
}

function isLegalFamily(k) {
  return ["LEGAL", "DOCUMENT"].includes(up(k));
}

function isJobFamily(k) {
  return up(k) === "JOB";
}

function isBusinessFamily(k) {
  return up(k) === "BUSINESS";
}

function isEducationFamily(k) {
  return up(k) === "EDUCATION";
}

function isPropertyFamily(k) {
  return up(k) === "PROPERTY";
}

function isDebtFamily(k) {
  return up(k) === "DEBT";
}

function isMarriageFamily(k) {
  return up(k) === "MARRIAGE";
}

function isDivorceFamily(k) {
  return up(k) === "DIVORCE";
}

function deriveEducationYear(facts) {
  return facts.study_start_year_claim ?? facts.student_visa_entry_year_claim ?? null;
}

function deriveYearFromFacts(domainKey, facts) {
  if (isForeignFamily(domainKey)) {
    return facts.foreign_entry_year_claim ?? facts.student_visa_entry_year_claim ?? null;
  }

  if (isSettlementFamily(domainKey)) {
    return (
      facts.appeal_year_claim ??
      facts.settlement_refusal_year_claim ??
      facts.settlement_applied_year_claim ??
      facts.settlement_year_claim ??
      facts.route_shift_year_claim ??
      null
    );
  }

  if (isLegalFamily(domainKey)) {
    return facts.appeal_year_claim ?? facts.settlement_refusal_year_claim ?? null;
  }

  if (isJobFamily(domainKey)) return facts.job_start_year_claim ?? null;
  if (isBusinessFamily(domainKey)) return facts.business_start_year_claim ?? null;
  if (isEducationFamily(domainKey)) return deriveEducationYear(facts);
  if (isPropertyFamily(domainKey)) return facts.property_year_claim ?? null;
  if (isDebtFamily(domainKey)) return facts.debt_year_claim ?? null;

  return null;
}

function mapEvidenceType(rawType, facts, domainKey) {
  const t = up(rawType);

  if (isForeignFamily(domainKey) && deriveYearFromFacts(domainKey, facts) != null) return EVIDENCE.FACT_ANCHORED;
  if (isSettlementFamily(domainKey) && deriveYearFromFacts(domainKey, facts) != null) return EVIDENCE.FACT_ANCHORED;
  if (isLegalFamily(domainKey) && deriveYearFromFacts(domainKey, facts) != null) return EVIDENCE.FACT_ANCHORED;
  if (isJobFamily(domainKey) && facts.job_start_year_claim != null) return EVIDENCE.FACT_ANCHORED;
  if (isBusinessFamily(domainKey) && facts.business_start_year_claim != null) return EVIDENCE.FACT_ANCHORED;
  if (isEducationFamily(domainKey) && deriveEducationYear(facts) != null) return EVIDENCE.FACT_ANCHORED;
  if (isPropertyFamily(domainKey) && facts.property_year_claim != null) return EVIDENCE.FACT_ANCHORED;
  if (isDebtFamily(domainKey) && facts.debt_year_claim != null) return EVIDENCE.FACT_ANCHORED;
  if (isMarriageFamily(domainKey) && facts.marriage_count_claim != null) return EVIDENCE.FACT_ANCHORED;
  if (isDivorceFamily(domainKey) && facts.broken_marriage_count != null) return EVIDENCE.FACT_ANCHORED;

  if (t === "DIRECT" || t === "DIRECT_FACT") return EVIDENCE.PATTERN_ONLY;
  if (t === "LIKELY_HISTORY" || t === "PATTERN_ONLY") return EVIDENCE.PATTERN_ONLY;
  if (t === "NAME_PATTERN") return EVIDENCE.NAME_PATTERN;

  return EVIDENCE.UNKNOWN;
}

function decideFinalStatus({ evidenceType, domainKey, facts }) {
  if (evidenceType === EVIDENCE.FACT_ANCHORED) {
    if (isForeignFamily(domainKey)) return FINAL_STATUS.EXECUTED;

    if (isSettlementFamily(domainKey)) {
      if (facts.settlement_year_claim != null) return FINAL_STATUS.EXECUTED;
      if (facts.appeal_year_claim != null || facts.settlement_applied_year_claim != null) return FINAL_STATUS.IN_PROGRESS;
      if (facts.settlement_refusal_year_claim != null) return FINAL_STATUS.NOT_EXECUTED;
      if (facts.route_shift_year_claim != null) return FINAL_STATUS.IN_PROGRESS;
      return FINAL_STATUS.UNKNOWN;
    }

    if (isLegalFamily(domainKey)) {
      if (facts.appeal_year_claim != null) return FINAL_STATUS.IN_PROGRESS;
      if (facts.settlement_refusal_year_claim != null) return FINAL_STATUS.EXECUTED;
      return FINAL_STATUS.UNKNOWN;
    }

    if (isJobFamily(domainKey)) return FINAL_STATUS.EXECUTED;
    if (isBusinessFamily(domainKey)) return FINAL_STATUS.EXECUTED;
    if (isEducationFamily(domainKey)) return FINAL_STATUS.EXECUTED;
    if (isPropertyFamily(domainKey)) return FINAL_STATUS.EXECUTED;
    if (isDebtFamily(domainKey)) return FINAL_STATUS.EXECUTED;
    if (isMarriageFamily(domainKey)) return facts.marriage_count_claim > 0 ? FINAL_STATUS.EXECUTED : FINAL_STATUS.NOT_EXECUTED;
    if (isDivorceFamily(domainKey)) return facts.broken_marriage_count > 0 ? FINAL_STATUS.EXECUTED : FINAL_STATUS.NOT_EXECUTED;
  }

  return FINAL_STATUS.UNKNOWN;
}

function refinedEventType(domainKey, facts, fallbackType) {
  if (isForeignFamily(domainKey)) {
    if (facts.student_visa_entry_year_claim != null) return "student visa / foreign entry";
    if (facts.foreign_entry_year_claim != null) return "foreign entry / relocation";
    return fallbackType || "foreign process / movement pattern";
  }

  if (isSettlementFamily(domainKey)) {
    if (facts.settlement_year_claim != null) return "settlement granted";
    if (facts.appeal_year_claim != null) return "settlement appeal ongoing";
    if (facts.settlement_refusal_year_claim != null && facts.settlement_applied_year_claim != null) return "settlement refusal after application";
    if (facts.settlement_applied_year_claim != null) return "settlement application in process";
    if (facts.route_shift_year_claim != null) return "route shift before settlement";
    return "settlement process";
  }

  if (isLegalFamily(domainKey)) {
    if (facts.appeal_year_claim != null) return "appeal event";
    if (facts.settlement_refusal_year_claim != null) return "refusal / authority event";
    return fallbackType || "legal / authority phase";
  }

  if (isEducationFamily(domainKey)) {
    if (facts.study_start_year_claim != null) return "study / university phase";
    if (facts.student_visa_entry_year_claim != null) return "student visa entry phase";
    return fallbackType || "education phase";
  }

  return fallbackType || "domain event";
}

function normalizeEvent(event, domainKey, facts) {
  const out = clone(event);
  const evidenceType = mapEvidenceType(out?.evidence_type, facts, domainKey);
  const finalStatus = decideFinalStatus({ evidenceType, domainKey, facts });
  const year = deriveYearFromFacts(domainKey, facts);

  out.evidence_type = evidenceType;
  out.status = finalStatus;
  out.event_type = refinedEventType(domainKey, facts, out?.event_type);
  out.date_marker = year;
  out.exact_year = year;
  out.month_or_phase = year != null ? "year-anchored phase" : "phase only";

  if (finalStatus === FINAL_STATUS.EXECUTED) {
    out.trigger_phase = "event confirmed";
    out.impact_summary = "event has definitively occurred";
    out.carryover_to_present = "YES";
  } else if (finalStatus === FINAL_STATUS.IN_PROGRESS) {
    out.trigger_phase = "process active";
    out.impact_summary = "process is active but not completed";
    out.carryover_to_present = "YES";
  } else if (finalStatus === FINAL_STATUS.NOT_EXECUTED) {
    out.trigger_phase = "no confirmed execution";
    out.impact_summary = "event not confirmed";
    out.carryover_to_present = "NO";
  } else {
    out.trigger_phase = "insufficient truth";
    out.impact_summary = "pattern visible but fact not confirmed";
    out.carryover_to_present = "NO";
  }

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

  out.events = safeArray(out.events).map((e) => normalizeEvent(e, out.domain_key, facts));

  if (out.primary_exact_event) {
    out.primary_exact_event = normalizeEvent(out.primary_exact_event, out.domain_key, facts);
  }

  out.alternative_exact_events = safeArray(out.alternative_exact_events).map((e) =>
    normalizeEvent(e, out.domain_key, facts)
  );

  out.final_state = finalStateFromEvents([
    ...out.events,
    ...(out.primary_exact_event ? [out.primary_exact_event] : []),
    ...out.alternative_exact_events
  ]);

  return out;
}

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
    foreign: pickState(domainMap.foreign?.final_state, domainMap.immigration?.final_state, domainMap.visa?.final_state),
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
    const backendState = out.sector_state[sector] || FINAL_STATUS.UNKNOWN;

    if (sector === "foreign" && backendState === FINAL_STATUS.EXECUTED) {
      return {
        ...row,
        backend_state: backendState,
        question_validity: "VALID",
        reality_conflict: "NO",
        correction_needed: "NO",
        conflict_reason: null,
        detected_correction: null,
        mode_note: "PAST_SCAN_EXECUTED_IS_VALID_NOT_CONFLICT"
      };
    }

    return { ...row, backend_state: backendState };
  });

  const checked = out.sector_validation.filter((r) => r.checked);
  const conflicts = checked.filter((r) => r.reality_conflict === "YES");

  out.validation_summary = {
    checked_sector_count: checked.length,
    conflict_sector_count: conflicts.length,
    overall_question_validity: conflicts.length ? "DISTORTED_OR_CONFLICTED" : "STABLE",
    overall_reality_conflict: conflicts.length ? "YES" : "NO",
    correction_needed: conflicts.length ? "YES" : "NO",
    dominant_conflict_sector: conflicts[0]?.sector || null
  };

  return out;
}

function deliveryStateFromFinal(status) {
  if (status === FINAL_STATUS.EXECUTED) return "occurred";
  if (status === FINAL_STATUS.IN_PROGRESS) return "ongoing";
  if (status === FINAL_STATUS.NOT_EXECUTED) return "not_occurred";
  return "unknown";
}

function buildDeliverySafePacket(sectorState) {
  const normalized_states = {};
  for (const [k, v] of Object.entries(sectorState || {})) {
    normalized_states[k] = deliveryStateFromFinal(v);
  }

  const truth_lines = [];

  if (normalized_states.foreign === "occurred") truth_lines.push("বিদেশে যাওয়ার ঘটনা ঘটেছে");
  if (normalized_states.settlement === "occurred") truth_lines.push("স্থায়ীভাবে বসার বিষয় সম্পন্ন হয়েছে");
  if (normalized_states.settlement === "ongoing") truth_lines.push("স্থায়ীভাবে বসার বিষয় এখনো প্রক্রিয়ায় আছে");
  if (normalized_states.legal === "ongoing") truth_lines.push("appeal বা legal process এখনো চলমান");
  if (normalized_states.legal === "occurred") truth_lines.push("legal বা authority-সংক্রান্ত ঘটনা বাস্তবে ঘটেছে");
  if (normalized_states.education === "occurred") truth_lines.push("শিক্ষা বা student-line জীবনে বাস্তবে খুলেছে");
  if (normalized_states.business === "occurred") truth_lines.push("business line জীবনে উঠেছে");

  return {
    normalized_states,
    domain_truth_map: {
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
    },
    truth_lines: unique(truth_lines),
    final_truth_summary: unique(truth_lines).length
      ? unique(truth_lines).join("। ") + "।"
      : "স্পষ্ট কোনো নিশ্চিত ঘটনা প্রমাণ পাওয়া যায়নি।"
  };
}

function countDirectEvidence(facts) {
  return [
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
    facts.debt_year_claim,
    facts.marriage_count_claim,
    facts.broken_marriage_count
  ].filter((x) => x != null).length;
}

function buildTopLevelTruthSummary(core, astro, domainResults, facts) {
  const directEvidenceCount = countDirectEvidence(facts);
  const patternCount = safeArray(domainResults).filter(
    (d) => d.final_state === FINAL_STATUS.UNKNOWN && Number(d.normalized_score || 0) >= 6
  ).length;

  return {
    subject_mode: core?.subject_context?.subject_mode || null,
    identity_depth: core?.subject_context?.identity_depth || null,
    identity_confidence: core?.subject_context?.identity_confidence || null,
    precision_mode: core?.birth_context?.precision_mode || null,
    weak_timeline_mode: !!(astro?.mode_flags?.isNameOnly || astro?.mode_flags?.isNameContext),
    exact_timeline_allowed: !astro?.mode_flags?.isNameOnly,
    truth_level:
      directEvidenceCount >= 4
        ? "HIGH"
        : directEvidenceCount > 0
        ? "FACT_ANCHORED"
        : patternCount > 0
        ? "PATTERN_HEAVY"
        : "UNKNOWN",
    direct_evidence_count: directEvidenceCount,
    pattern_confirmed_count: 0,
    repeated_pattern_count: 0,
    likely_history_count: patternCount,
    name_pattern_count: safeArray(domainResults).filter((d) => d.pattern_mode_active).length
  };
}

function buildRecognitionLines(sectorState) {
  const lines = [];

  if (sectorState.foreign === FINAL_STATUS.EXECUTED) {
    lines.push("জায়গা বদল বা বিদেশ-সংক্রান্ত ঘটনা বাস্তবে ঘটেছে।");
  } else if (sectorState.foreign === FINAL_STATUS.UNKNOWN) {
    lines.push("বিদেশ বা base-change বিষয়ে শক্ত pattern আছে, কিন্তু fact ছাড়া executed বলা যাবে না।");
  }

  if (sectorState.settlement === FINAL_STATUS.IN_PROGRESS) {
    lines.push("settlement বসেনি; process / appeal চলছে।");
  }

  if (sectorState.legal === FINAL_STATUS.IN_PROGRESS) {
    lines.push("কাগজ, appeal বা authority-line এখনো চলমান।");
  }

  if (sectorState.business === FINAL_STATUS.EXECUTED) {
    lines.push("business line জীবনে বাস্তবে উঠেছে।");
  }

  return unique(lines);
}

function buildSummary(domainMap, sectorState, domainResults, input, facts, primaryDomain) {
  const educationYear = facts.study_start_year_claim ?? facts.student_visa_entry_year_claim ?? null;
  const foreignYear = domainMap.foreign?.year ?? domainMap.immigration?.year ?? domainMap.visa?.year ?? null;

  return {
    primary_domain: primaryDomain || "GENERAL",
    total_events: safeArray(domainResults).filter((d) => d.primary_exact_event).length,
    top_domains: safeArray(domainResults).slice(0, 6).map((d) => d.domain_label),
    relationship: {
      marriage_count: facts.marriage_count_claim ?? 0,
      broken_marriage_count: facts.broken_marriage_count ?? 0,
      current_marriage_status: sectorState.marriage,
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
      education_year: educationYear,
      education_age: ageFromYear(educationYear, input.dob),
      job_year: domainMap.job?.year ?? null,
      business_year: domainMap.business?.year ?? null
    },
    foreign: {
      foreign_entry_year: foreignYear,
      foreign_entry_age: ageFromYear(foreignYear, input.dob),
      route_shift_year: facts.route_shift_year_claim ?? null,
      route_shift_age: ageFromYear(facts.route_shift_year_claim, input.dob),
      settlement_applied_year: facts.settlement_applied_year_claim ?? null,
      settlement_applied_age: ageFromYear(facts.settlement_applied_year_claim, input.dob),
      refusal_year: facts.settlement_refusal_year_claim ?? null,
      refusal_age: ageFromYear(facts.settlement_refusal_year_claim, input.dob),
      appeal_year: facts.appeal_year_claim ?? null,
      appeal_age: ageFromYear(facts.appeal_year_claim, input.dob),
      settlement_year: domainMap.settlement?.final_state === FINAL_STATUS.EXECUTED ? domainMap.settlement?.year ?? null : null,
      settlement_age: ageFromYear(
        domainMap.settlement?.final_state === FINAL_STATUS.EXECUTED ? domainMap.settlement?.year : null,
        input.dob
      ),
      foreign_process_status: sectorState.foreign,
      settlement_status: sectorState.settlement
    },
    health: pickState(sectorState.health, sectorState.mental),
    money: pickState(sectorState.money, sectorState.debt, sectorState.property),
    conflict: sectorState.legal,
    current_carryover: true
  };
}

function buildEventSummary(domainResults, sectorState, summary, truthSummary) {
  const timed = safeArray(domainResults).filter((d) => d.primary_exact_event);
  const major = safeArray(domainResults).filter((d) => Number(d.major_event_count || 0) > 0);

  return {
    total_estimated_events: timed.length,
    total_major_events: major.length,
    total_minor_events: safeArray(domainResults).filter((d) => Number(d.minor_event_count || 0) > 0).length,
    total_broken_events: safeArray(domainResults).filter((d) => Number(d.broken_event_count || 0) > 0).length,
    total_active_events: safeArray(domainResults).filter((d) => Number(d.active_event_count || 0) > 0).length,
    relationship: summary.relationship,
    work: summary.work,
    foreign: summary.foreign,
    health: { health_status: pickState(sectorState.health, sectorState.mental) },
    money: { money_status: pickState(sectorState.money, sectorState.debt, sectorState.property) },
    conflict: { conflict_status: sectorState.legal },
    top_5_domains: safeArray(domainResults).slice(0, 5).map((d) => d.domain_label),
    carryover_present: true,
    truth_summary: truthSummary,
    recognition_lines: buildRecognitionLines(sectorState)
  };
}

function buildVerdict(sectorState, truthSummary) {
  return {
    forensic_direction:
      `Universal scan final state: Relationship ${pickState(sectorState.marriage, sectorState.partnership)}. ` +
      `Foreign ${sectorState.foreign}. Settlement ${sectorState.settlement}. Legal ${sectorState.legal}. ` +
      `Health ${pickState(sectorState.health, sectorState.mental)}. ` +
      `Money ${pickState(sectorState.money, sectorState.debt, sectorState.property)}. ` +
      `Truth level ${truthSummary?.truth_level || "UNKNOWN"}.`,
    validation_state: "STABLE"
  };
}

function buildLokkothaSummary(primaryDomain, exactCount, truthSummary) {
  return {
    text:
      `${low(primaryDomain || "general")}-এর হিসাব এখন বন্ধ খাতায় ধরা আছে; ` +
      `বড় চিহ্ন ${exactCount}, ভাঙা চিহ্ন 0, আর ঢেউ এখনও টিকে আছে. ` +
      `সত্যের স্তর ${truthSummary?.truth_level || "UNKNOWN"}.`
  };
}

function buildProjectPasteBlock({ input, primaryDomain, domainResults, summary, truthSummary, eventSummary }) {
  const lines = [];

  lines.push("PAST UNIVERSAL FORENSIC NANO BLOCK");
  lines.push(`Subject: ${input.name || "UNKNOWN"}`);
  lines.push(`Primary Domain: ${primaryDomain || "GENERAL"}`);
  lines.push(`Top Domains: ${safeArray(domainResults).slice(0, 6).map((d) => d.domain_label).join(" | ")}`);
  lines.push(`Total Estimated Events: ${eventSummary.total_estimated_events}`);
  lines.push(`Total Major Events: ${eventSummary.total_major_events}`);
  lines.push(`Truth Level: ${truthSummary.truth_level}`);
  lines.push(`Direct Evidence Count: ${truthSummary.direct_evidence_count}`);
  lines.push(`Foreign Entry Year: ${summary.foreign.foreign_entry_year ?? "UNKNOWN"}`);
  lines.push(`Route Shift Year: ${summary.foreign.route_shift_year ?? "UNKNOWN"}`);
  lines.push(`Settlement Applied Year: ${summary.foreign.settlement_applied_year ?? "UNKNOWN"}`);
  lines.push(`Refusal Year: ${summary.foreign.refusal_year ?? "UNKNOWN"}`);
  lines.push(`Appeal Year: ${summary.foreign.appeal_year ?? "UNKNOWN"}`);
  lines.push(`Foreign Process Status: ${summary.foreign.foreign_process_status}`);
  lines.push(`Settlement Status: ${summary.foreign.settlement_status}`);
  lines.push(`Dominant Work Mode: ${summary.work.dominant_work_mode}`);
  lines.push("Recognition Lines:");

  for (const line of safeArray(eventSummary.recognition_lines)) {
    lines.push(`- ${line}`);
  }

  lines.push("Timeline:");

  for (const d of safeArray(domainResults).filter((x) => x.primary_exact_event)) {
    const e = d.primary_exact_event;
    lines.push(
      `${d.domain_label} | ${e.event_type} | ${e.status} | ${e.date_marker ?? "UNDATED"} | ` +
        `${e.month_or_phase} | ${e.exact_time_band || "NO_TIME"} | ${e.evidence_type}`
    );
  }

  lines.push("PAST UNIVERSAL FORENSIC NANO BLOCK END");
  return lines.join("\n");
}

function buildRebuiltMasterTimeline(domainResults) {
  return safeArray(domainResults)
    .filter((d) => d.primary_exact_event)
    .map((d) => {
      const e = d.primary_exact_event;
      return {
        domain: d.domain_label,
        domain_key: d.domain_key,
        event_family: e.event_family || null,
        event_type: e.event_type || null,
        event_number: e.event_number || 1,
        status: e.status || FINAL_STATUS.UNKNOWN,
        importance: e.importance || "MAJOR",
        trigger_phase: e.trigger_phase || null,
        evidence_strength: e.evidence_strength || null,
        evidence_type: e.evidence_type || EVIDENCE.UNKNOWN,
        date_marker: e.date_marker ?? null,
        exact_year: e.exact_year ?? e.date_marker ?? null,
        month_or_phase: e.month_or_phase || null,
        time_band: e.exact_time_band || d.exact_time_band || null,
        who_involved: e.who_involved || null,
        impact_summary: e.impact_summary || null,
        carryover_to_present: e.carryover_to_present || "NO"
      };
    });
}

function buildKpPastSnapshot({ core, astro, finalizedDomains, linkedDomainExpansion }) {
  return {
    kp_cusps: core?.evidence_packet?.kp_cusps || core?.evidence_packet?.kp || core?.kp_cusps || astro?.kp_cusps || {},
    moon: core?.evidence_packet?.moon || core?.moon || astro?.moon || {},
    aspects:
      core?.evidence_packet?.aspects ||
      core?.evidence_packet?.aspects_summary ||
      astro?.aspects ||
      astro?.aspects_summary ||
      [],
    dasha: core?.evidence_packet?.dasha || core?.dasha || astro?.dasha || {},
    domain_results: finalizedDomains || [],
    linked_domain_expansion: linkedDomainExpansion || []
  };
}

function buildKpEventInput({ input, stage2 }) {
  return {
    event: input.facts || input.question,
    domain: stage2?.question_profile?.primary_domain || "GENERAL",
    question: input.question,
    linked_domain_expansion: stage2?.linked_domain_expansion || []
  };
}

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

    const kpSnapshot = buildKpPastSnapshot({
      core,
      astro,
      finalizedDomains,
      linkedDomainExpansion: stage2.linked_domain_expansion
    });

    const validationLayerRaw = runValidationLayer({
      question: input.question,
      finalizedDomains,
      snapshot: kpSnapshot,
      eventInput: buildKpEventInput({ input, stage2 })
    });

    const rawIdentityPacket = buildIdentityPacket({
      input,
      subjectContext: core.subject_context,
      birthContext: core.birth_context,
      evidencePacket: core.evidence_packet
    });

    const identityPacket = correctIdentityPacket(rawIdentityPacket, input, facts);

    const rawMasterTimeline = buildTimeline({
      ranked_domains: finalizedDomains,
      birth_context: core.birth_context,
      subject_context: core.subject_context
    });

    const evidenceLayer = runEvidenceLayer({
      input,
      facts,
      question_profile: stage2.question_profile,
      ranked_domains: finalizedDomains,
      master_timeline: rawMasterTimeline,
      carryover: stage2.carryover,
      validation_layer: validationLayerRaw,
      subject_context: core.subject_context,
      birth_context: core.birth_context
    });

    const sourceDomains = safeArray(evidenceLayer?.ranked_domains).length
      ? evidenceLayer.ranked_domains
      : finalizedDomains;

    const rebuiltDomainResults = safeArray(sourceDomains).map((d) => rebuildDomainResult(d, facts));

    const domainMap = buildDomainMap(rebuiltDomainResults);
    const validation_layer = rebuildValidationLayer(validationLayerRaw, domainMap);
    const sectorState = validation_layer.sector_state;

    const primaryDomain = stage2?.question_profile?.primary_domain || "GENERAL";
    const delivery_safe_packet = buildDeliverySafePacket(sectorState);
    const truth_summary = buildTopLevelTruthSummary(core, astro, rebuiltDomainResults, facts);
    const summary = buildSummary(domainMap, sectorState, rebuiltDomainResults, input, facts, primaryDomain);

    const exact_domain_summary = rebuiltDomainResults
      .filter((d) => d?.primary_exact_event)
      .map((d) => ({
        domain_key: d.domain_key,
        domain_label: d.domain_label,
        exact_time_band: d.exact_time_band || d?.primary_exact_event?.exact_time_band || null,
        primary_exact_event: d.primary_exact_event,
        alternative_exact_events: d.alternative_exact_events || []
      }));

    const event_summary = buildEventSummary(rebuiltDomainResults, sectorState, summary, truth_summary);
    const forensic_verdict = buildVerdict(sectorState, truth_summary);
    const lokkotha_summary = buildLokkothaSummary(primaryDomain, exact_domain_summary.length, truth_summary);
    const master_timeline = buildRebuiltMasterTimeline(rebuiltDomainResults);

    const project_paste_block = buildProjectPasteBlock({
      input,
      primaryDomain,
      domainResults: rebuiltDomainResults,
      summary,
      truthSummary: truth_summary,
      eventSummary: event_summary
    });

    const compactPayload = {
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
      forensic_verdict,
      lokkotha_summary
    };

    if (input.format === "compact") {
      return res.status(200).json(compactPayload);
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
        project_paste_block
      });
    }

    return res.status(200).json({
      engine_status: ENGINE_STATUS,
      system_status: "OK",
      mode: core?.subject_context?.question_mode || "PAST",
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
        final_state: d?.final_state || FINAL_STATUS.UNKNOWN,
        pattern_mode_active: !!d?.pattern_mode_active,
        exact_timeline_allowed: d?.exact_timeline_allowed !== false,
        direct_evidence_count: Number(d?.direct_evidence_count || 0),
        pattern_evidence_count: Number(d?.pattern_evidence_count || 0)
      })),
      domain_results: rebuiltDomainResults,
      exact_domain_summary,
      event_summary,
      truth_summary,
      master_timeline,
      current_carryover: stage2?.carryover || {},
      validation_block: evidenceLayer?.validation_block || {},
      forensic_verdict,
      lokkotha_summary,
      project_paste_block
    });
  } catch (error) {
    return res.status(500).json({
      engine_status: ENGINE_STATUS,
      system_status: "ERROR",
      error_message: error instanceof Error ? error.message : "Unknown error"
    });
  }
}