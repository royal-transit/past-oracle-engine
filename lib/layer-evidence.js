// lib/layer-evidence.js
// UNIVERSAL HARD-LOCK VERSION
// FULL REPLACEMENT
// Purpose:
// - summary layer must follow finalized domain/event states
// - no dual-state mismatch between domain_results and event_summary
// - exact_domain_summary, timeline, verdict, project block all must use final state
// - relationship / work / foreign / health / money / conflict ledgers are explicitly rebuilt
// - visible timing summary MUST be exposed inside event_summary
// - name-only past must remain pattern-safe
// - truth level / confidence / recognition must be visible
// - no fake exact timeline escalation from weak identity modes

function normalizeYear(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function normalizeType(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeStatus(value) {
  return String(value || "").trim().toUpperCase();
}

function byYearThenNumber(a, b) {
  const ay = normalizeYear(a?.exact_year ?? a?.date_marker) ?? 0;
  const by = normalizeYear(b?.exact_year ?? b?.date_marker) ?? 0;
  if (ay !== by) return ay - by;
  return Number(a?.event_number || 0) - Number(b?.event_number || 0);
}

function getLastByTypes(events, types) {
  const allowed = new Set(types.map((x) => normalizeType(x)));
  const sorted = [...(events || [])].sort(byYearThenNumber);
  for (let i = sorted.length - 1; i >= 0; i -= 1) {
    if (allowed.has(normalizeType(sorted[i].event_type))) return sorted[i];
  }
  return null;
}

function getLastByStatuses(events, statuses) {
  const allowed = new Set(statuses.map((x) => normalizeStatus(x)));
  const sorted = [...(events || [])].sort(byYearThenNumber);
  for (let i = sorted.length - 1; i >= 0; i -= 1) {
    if (allowed.has(normalizeStatus(sorted[i].status))) return sorted[i];
  }
  return null;
}

function countByTypesAndStatuses(events, types, statuses) {
  const typeSet = new Set(types.map((x) => normalizeType(x)));
  const statusSet = new Set(statuses.map((x) => normalizeStatus(x)));
  return (events || []).filter(
    (e) =>
      typeSet.has(normalizeType(e.event_type)) &&
      statusSet.has(normalizeStatus(e.status))
  ).length;
}

function makeTimelineLookup(master_timeline) {
  const map = new Map();

  for (const item of master_timeline || []) {
    const key = [
      item.domain_key || "",
      item.event_family || "",
      item.event_type || "",
      item.event_number || "",
      item.status || ""
    ].join("|");

    const year = normalizeYear(item.date_marker ?? item.exact_year);
    const phase = item.month_or_phase || null;

    if (!map.has(key)) {
      map.set(key, { year, phase });
    }
  }

  return map;
}

function backfillEvent(domainKey, event, lookup, weakTimelineMode) {
  const existingYear =
    normalizeYear(event?.exact_year) ??
    normalizeYear(event?.date_marker) ??
    null;

  const existingPhase = event?.month_or_phase || null;

  if (existingYear != null || existingPhase != null) {
    return {
      ...event,
      exact_year: weakTimelineMode ? null : existingYear,
      date_marker: weakTimelineMode ? null : existingYear,
      month_or_phase: existingPhase
    };
  }

  if (weakTimelineMode) {
    return {
      ...event,
      exact_year: null,
      date_marker: null,
      month_or_phase: existingPhase
    };
  }

  const key = [
    domainKey || "",
    event?.event_family || "",
    event?.event_type || "",
    event?.event_number || "",
    event?.status || ""
  ].join("|");

  const fallback = lookup.get(key) || { year: null, phase: null };

  return {
    ...event,
    exact_year: fallback.year,
    date_marker: fallback.year,
    month_or_phase: fallback.phase
  };
}

function exactTimeBandByDomain(domainKey) {
  if (["LEGAL", "DOCUMENT", "IMMIGRATION", "VISA"].includes(domainKey)) {
    return "09:00-13:00";
  }

  if (["MONEY", "DEBT", "GAIN", "LOSS", "BUSINESS", "JOB", "CAREER"].includes(domainKey)) {
    return "10:00-15:00";
  }

  if (["HEALTH", "MENTAL", "DISEASE", "RECOVERY"].includes(domainKey)) {
    return "06:00-10:00";
  }

  if (["MARRIAGE", "DIVORCE", "LOVE", "PARTNERSHIP", "MULTIPLE_MARRIAGE"].includes(domainKey)) {
    return "16:00-22:00";
  }

  if (["FOREIGN", "SETTLEMENT", "IMMIGRATION", "VISA"].includes(domainKey)) {
    return "08:00-14:00";
  }

  if (["PROPERTY", "HOME", "VEHICLE", "FAMILY"].includes(domainKey)) {
    return "11:00-17:00";
  }

  return "11:00-17:00";
}

function exactTypeBoost(domainKey, event) {
  const type = normalizeType(event?.event_type);
  const trigger = normalizeType(event?.trigger_phase);
  const status = normalizeStatus(event?.status);
  const evidenceType = String(event?.evidence_type || "").toUpperCase();
  let boost = 0;

  if (["BROKEN", "ACTIVE", "STABILISING", "EXECUTED", "BUILDING", "PARTIAL", "NOT_EXECUTED", "PENDING", "RESIDUAL"].includes(status)) {
    boost += 2.5;
  }

  if (evidenceType === "DIRECT") boost += 2.2;
  if (evidenceType === "PATTERN_CONFIRMED") boost += 1.6;
  if (evidenceType === "REPEATED_BEHAVIOUR") boost += 1.4;
  if (evidenceType === "LIKELY_HISTORY") boost += 1.0;
  if (evidenceType === "NAME_PATTERN") boost += 0.5;

  if (["HEALTH", "MENTAL"].includes(domainKey)) {
    if (["health", "disease", "collapse", "stress", "weakness", "recovery", "mental"].some((x) => type.includes(x))) boost += 4;
    if (["strain", "imbalance", "recovery", "stress", "fear", "body", "event confirmed", "partial execution"].some((x) => trigger.includes(x))) boost += 3.2;
  }

  if (["MONEY", "DEBT", "GAIN", "LOSS"].includes(domainKey)) {
    if (["money", "debt", "gain", "loss", "income", "cash", "liquidity", "pressure", "asset"].some((x) => type.includes(x))) boost += 4;
    if (["money", "pressure", "flow", "compression", "gain", "loss", "event confirmed", "partial execution"].some((x) => trigger.includes(x))) boost += 3.2;
  }

  if (["LEGAL", "DOCUMENT", "IMMIGRATION", "VISA"].includes(domainKey)) {
    if (["legal", "document", "approval", "authority", "paperwork", "visa", "immigration", "foreign"].some((x) => type.includes(x))) boost += 4;
    if (["approval", "authority", "paperwork", "clearance", "motion", "event confirmed", "partial execution"].some((x) => trigger.includes(x))) boost += 3.2;
  }

  if (["MARRIAGE", "DIVORCE", "LOVE", "PARTNERSHIP", "MULTIPLE_MARRIAGE"].includes(domainKey)) {
    if (["marriage", "divorce", "relationship", "union", "bond", "separation", "partner"].some((x) => type.includes(x))) boost += 4;
    if (["union", "break", "rupture", "continuation", "bond", "attachment", "event confirmed", "partial execution"].some((x) => trigger.includes(x))) boost += 3.2;
  }

  if (["FOREIGN", "SETTLEMENT"].includes(domainKey)) {
    if (["foreign", "entry", "settlement", "movement", "process", "relocation", "presence"].some((x) => type.includes(x))) boost += 4;
  }

  if (["JOB", "CAREER", "BUSINESS", "EDUCATION"].includes(domainKey)) {
    if (["job", "career", "business", "study", "university", "education", "employment"].some((x) => type.includes(x))) boost += 4;
  }

  return boost;
}

function exactCandidateScore(domain, event, weakTimelineMode) {
  const rankScore = Number(domain?.rank_score || domain?.normalized_score || 0);
  const strength = normalizeType(event?.evidence_strength);
  const importance = normalizeStatus(event?.importance);
  const carryover = normalizeStatus(event?.carryover_to_present);
  const year = normalizeYear(event?.date_marker ?? event?.exact_year);
  let score = 0;

  score += rankScore;
  score += exactTypeBoost(domain.domain_key, event);

  if (strength === "strong") score += 5;
  else if (strength === "moderate") score += 3;
  else if (strength === "light") score += 1.5;

  if (importance === "MAJOR") score += 4;
  else if (importance === "MINOR") score += 1.5;

  if (carryover === "YES") score += 1.2;
  if (!weakTimelineMode && year != null) score += 2.2;

  return Math.round((score + Number.EPSILON) * 100) / 100;
}

function buildExactPacketFromEvents(domain, weakTimelineMode) {
  const candidates = (domain.events || [])
    .map((e) => ({
      domain: domain.domain_label,
      domain_key: domain.domain_key,
      event_family: e.event_family || null,
      event_type: e.event_type,
      event_number: e.event_number ?? null,
      status: e.status,
      trigger_phase: e.trigger_phase,
      evidence_strength: e.evidence_strength,
      importance: e.importance,
      evidence_type: e.evidence_type || null,
      exact_date: null,
      date_marker: weakTimelineMode ? null : normalizeYear(e.date_marker ?? e.exact_year),
      month_or_phase: e.month_or_phase || null,
      exact_time_band: exactTimeBandByDomain(domain.domain_key),
      who_involved: e.who_involved || null,
      impact_summary: e.impact_summary || null,
      score: exactCandidateScore(domain, e, weakTimelineMode)
    }))
    .filter((x) => (!weakTimelineMode && x.date_marker != null) || x.month_or_phase != null)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const by = normalizeYear(b.date_marker) ?? 0;
      const ay = normalizeYear(a.date_marker) ?? 0;
      if (by !== ay) return by - ay;
      const bn = Number(b.event_number || 0);
      const an = Number(a.event_number || 0);
      return bn - an;
    });

  if (!candidates.length) {
    return {
      ...domain,
      primary_exact_event: null,
      alternative_exact_events: [],
      exact_time_band: domain.exact_time_band || exactTimeBandByDomain(domain.domain_key)
    };
  }

  return {
    ...domain,
    primary_exact_event: candidates[0],
    alternative_exact_events: candidates.slice(1, 3),
    exact_time_band: candidates[0].exact_time_band
  };
}

function shouldRebuildExact(domainKey) {
  return [
    "MARRIAGE",
    "DIVORCE",
    "MULTIPLE_MARRIAGE",
    "LOVE",
    "PARTNERSHIP",
    "FOREIGN",
    "SETTLEMENT",
    "HEALTH",
    "MENTAL",
    "MONEY",
    "DEBT",
    "GAIN",
    "LOSS",
    "LEGAL",
    "DOCUMENT",
    "IMMIGRATION",
    "VISA",
    "PROPERTY",
    "CAREER",
    "BUSINESS",
    "JOB",
    "EDUCATION",
    "FAMILY",
    "ENEMY",
    "CHILDREN"
  ].includes(domainKey);
}

function getModeFlags(subject_context, birth_context) {
  const subjectMode = String(subject_context?.subject_mode || "");
  const identityDepth = String(subject_context?.identity_depth || "");
  const precisionMode = String(birth_context?.precision_mode || "");

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
    isFullBirth
  };
}

function patchAndRebuildRankedDomains(ranked_domains, master_timeline, weakTimelineMode) {
  const lookup = makeTimelineLookup(master_timeline);

  return (ranked_domains || []).map((domain) => {
    const patchedEvents = (domain.events || []).map((event) =>
      backfillEvent(domain.domain_key, event, lookup, weakTimelineMode)
    );

    const baseDomain = {
      ...domain,
      events: patchedEvents
    };

    if (!shouldRebuildExact(domain.domain_key)) {
      return {
        ...baseDomain,
        primary_exact_event: null,
        alternative_exact_events: [],
        exact_time_band: domain.exact_time_band || null
      };
    }

    return buildExactPacketFromEvents(baseDomain, weakTimelineMode);
  });
}

function applyFinalStateToExactDomainSummary(ranked_domains) {
  return (ranked_domains || []).map((domain) => {
    if (!domain.primary_exact_event) return domain;

    const sourceEvent = (domain.events || []).find(
      (e) =>
        normalizeType(e.event_type) === normalizeType(domain.primary_exact_event.event_type) &&
        Number(e.event_number || 0) === Number(domain.primary_exact_event.event_number || 0)
    );

    if (!sourceEvent) return domain;

    return {
      ...domain,
      primary_exact_event: {
        ...domain.primary_exact_event,
        status: sourceEvent.status,
        trigger_phase: sourceEvent.trigger_phase,
        impact_summary: sourceEvent.impact_summary,
        evidence_type: sourceEvent.evidence_type || null
      }
    };
  });
}

function buildExactDomainSummary(ranked_domains) {
  return (ranked_domains || [])
    .filter((d) => d.primary_exact_event)
    .slice(0, 16)
    .map((d) => ({
      domain_key: d.domain_key,
      domain_label: d.domain_label,
      exact_time_band: d.exact_time_band || null,
      primary_exact_event: d.primary_exact_event || null,
      alternative_exact_events: d.alternative_exact_events || []
    }));
}

function buildRelationshipLedger(ranked_domains) {
  const relationKeys = new Set(["MARRIAGE", "DIVORCE", "MULTIPLE_MARRIAGE", "LOVE", "PARTNERSHIP"]);
  const out = [];

  for (const domain of ranked_domains || []) {
    if (!relationKeys.has(domain.domain_key)) continue;
    for (const event of domain.events || []) {
      out.push({
        domain_key: domain.domain_key,
        domain_label: domain.domain_label,
        final_state: domain.final_state || null,
        ...event
      });
    }
  }

  return out.sort(byYearThenNumber);
}

function buildWorkLedger(ranked_domains) {
  const keys = new Set(["EDUCATION", "JOB", "CAREER", "BUSINESS"]);
  const out = [];

  for (const domain of ranked_domains || []) {
    if (!keys.has(domain.domain_key)) continue;
    for (const event of domain.events || []) {
      out.push({
        domain_key: domain.domain_key,
        domain_label: domain.domain_label,
        final_state: domain.final_state || null,
        ...event
      });
    }
  }

  return out.sort(byYearThenNumber);
}

function buildForeignLedger(ranked_domains) {
  const keys = new Set(["FOREIGN", "SETTLEMENT", "IMMIGRATION", "VISA", "DOCUMENT"]);
  const out = [];

  for (const domain of ranked_domains || []) {
    if (!keys.has(domain.domain_key)) continue;
    for (const event of domain.events || []) {
      out.push({
        domain_key: domain.domain_key,
        domain_label: domain.domain_label,
        final_state: domain.final_state || null,
        ...event
      });
    }
  }

  return out.sort(byYearThenNumber);
}

function buildHealthLedger(ranked_domains) {
  const keys = new Set(["HEALTH", "MENTAL"]);
  const out = [];

  for (const domain of ranked_domains || []) {
    if (!keys.has(domain.domain_key)) continue;
    for (const event of domain.events || []) {
      out.push({
        domain_key: domain.domain_key,
        domain_label: domain.domain_label,
        final_state: domain.final_state || null,
        ...event
      });
    }
  }

  return out.sort(byYearThenNumber);
}

function buildMoneyLedger(ranked_domains) {
  const keys = new Set(["MONEY", "DEBT", "GAIN", "LOSS", "PROPERTY", "VEHICLE", "HOME"]);
  const out = [];

  for (const domain of ranked_domains || []) {
    if (!keys.has(domain.domain_key)) continue;
    for (const event of domain.events || []) {
      out.push({
        domain_key: domain.domain_key,
        domain_label: domain.domain_label,
        final_state: domain.final_state || null,
        ...event
      });
    }
  }

  return out.sort(byYearThenNumber);
}

function buildConflictLedger(ranked_domains) {
  const keys = new Set(["LEGAL", "DOCUMENT", "ENEMY", "BLOCKAGE"]);
  const out = [];

  for (const domain of ranked_domains || []) {
    if (!keys.has(domain.domain_key)) continue;
    for (const event of domain.events || []) {
      out.push({
        domain_key: domain.domain_key,
        domain_label: domain.domain_label,
        final_state: domain.final_state || null,
        ...event
      });
    }
  }

  return out.sort(byYearThenNumber);
}

function summarizeRelationship(ledger, domainsByKey) {
  const marriageLikeTypes = [
    "first marriage event",
    "second marriage event",
    "third marriage event",
    "marriage event",
    "marriage formation pattern",
    "relationship-led marriage tendency"
  ];

  const divorceLikeTypes = [
    "divorce event",
    "divorce pressure pattern",
    "separation / divorce event"
  ];

  const marriageCount = countByTypesAndStatuses(
    ledger,
    marriageLikeTypes,
    ["EXECUTED", "ACTIVE", "STABILISING", "PARTIAL"]
  );

  const brokenCount = countByTypesAndStatuses(
    ledger,
    divorceLikeTypes,
    ["EXECUTED", "BROKEN", "PARTIAL"]
  );

  const lastMarriage = getLastByTypes(ledger, marriageLikeTypes);
  const lastDivorce = getLastByTypes(ledger, divorceLikeTypes);

  let currentStatus = "UNKNOWN";

  const marriageDomainFinal = domainsByKey.get("MARRIAGE")?.final_state || null;
  const divorceDomainFinal = domainsByKey.get("DIVORCE")?.final_state || null;

  if (marriageDomainFinal === "EXECUTED" && divorceDomainFinal !== "EXECUTED") {
    currentStatus = "EXECUTED";
  } else if (divorceDomainFinal === "EXECUTED") {
    currentStatus = "BROKEN";
  } else if (marriageDomainFinal === "PARTIAL") {
    currentStatus = "PARTIAL";
  } else if (marriageDomainFinal === "NOT_EXECUTED") {
    currentStatus = "NOT_EXECUTED";
  } else if (lastMarriage && !lastDivorce) {
    currentStatus = normalizeStatus(lastMarriage.status || "UNKNOWN");
  } else if (lastMarriage && lastDivorce) {
    const my = normalizeYear(lastMarriage.exact_year ?? lastMarriage.date_marker) ?? 0;
    const dy = normalizeYear(lastDivorce.exact_year ?? lastDivorce.date_marker) ?? 0;
    currentStatus = my > dy
      ? normalizeStatus(lastMarriage.status || "UNKNOWN")
      : "BROKEN";
  }

  return {
    relationship_ledger: ledger,
    marriage_count: marriageCount,
    broken_marriage_count: brokenCount,
    current_marriage_status: currentStatus,
    latest_relationship_event_type: lastMarriage?.event_type || lastDivorce?.event_type || null
  };
}

function summarizeWork(ledger, domainsByKey) {
  const educationDomainFinal = domainsByKey.get("EDUCATION")?.final_state || null;
  const jobDomainFinal = domainsByKey.get("JOB")?.final_state || null;
  const businessDomainFinal = domainsByKey.get("BUSINESS")?.final_state || null;
  const careerDomainFinal = domainsByKey.get("CAREER")?.final_state || null;

  const educationActive = educationDomainFinal === "EXECUTED" || educationDomainFinal === "PARTIAL";
  const jobActive = jobDomainFinal === "EXECUTED" || jobDomainFinal === "PARTIAL";
  const businessActive = businessDomainFinal === "EXECUTED" || businessDomainFinal === "PARTIAL";

  let dominantMode = "UNKNOWN";

  if (educationActive && !jobActive && !businessActive) dominantMode = "EDUCATION";
  else if (businessActive) dominantMode = "BUSINESS";
  else if (jobActive || careerDomainFinal === "EXECUTED" || careerDomainFinal === "PARTIAL") dominantMode = "JOB";
  else if (educationActive) dominantMode = "EDUCATION";

  return {
    work_ledger: ledger,
    dominant_work_mode: dominantMode,
    education_active: educationActive,
    job_active: jobActive,
    business_active: businessActive
  };
}

function summarizeForeign(ledger, domainsByKey) {
  const entryEvent = getLastByTypes(ledger, ["foreign entry event", "foreign residence / presence event"]);
  const settlementEvent = getLastByTypes(ledger, ["settlement event"]);
  const foreignDomainFinal = domainsByKey.get("FOREIGN")?.final_state || null;
  const visaDomainFinal = domainsByKey.get("VISA")?.final_state || null;

  let foreignProcessStatus = null;
  if (foreignDomainFinal === "EXECUTED") foreignProcessStatus = "EXECUTED";
  else if (foreignDomainFinal === "PARTIAL" || visaDomainFinal === "PARTIAL") foreignProcessStatus = "PARTIAL";
  else if (foreignDomainFinal === "NOT_EXECUTED") foreignProcessStatus = "NOT_EXECUTED";
  else foreignProcessStatus = getLastByStatuses(ledger, ["EXECUTED", "PARTIAL", "NOT_EXECUTED", "BUILDING", "RESIDUAL"])?.status || null;

  return {
    foreign_ledger: ledger,
    foreign_shift_count: ledger.length,
    foreign_entry_year: normalizeYear(entryEvent?.exact_year ?? entryEvent?.date_marker),
    settlement_year: normalizeYear(settlementEvent?.exact_year ?? settlementEvent?.date_marker),
    foreign_process_status: foreignProcessStatus
  };
}

function summarizeHealth(ledger, domainsByKey) {
  const mentalFinal = domainsByKey.get("MENTAL")?.final_state || null;
  const healthFinal = domainsByKey.get("HEALTH")?.final_state || null;

  let healthStatus = "UNKNOWN";
  if (mentalFinal === "EXECUTED" || healthFinal === "EXECUTED") healthStatus = "EXECUTED";
  else if (mentalFinal === "PARTIAL" || healthFinal === "PARTIAL") healthStatus = "PARTIAL";
  else if (mentalFinal === "NOT_EXECUTED" && healthFinal === "NOT_EXECUTED") healthStatus = "NOT_EXECUTED";
  else healthStatus = getLastByStatuses(ledger, ["EXECUTED", "PARTIAL", "NOT_EXECUTED", "BUILDING", "RESIDUAL"])?.status || "UNKNOWN";

  const latest = getLastByStatuses(ledger, ["EXECUTED", "PARTIAL", "NOT_EXECUTED", "BUILDING", "RESIDUAL"]);

  return {
    health_ledger: ledger,
    health_status: healthStatus,
    latest_health_event_type: latest?.event_type || null
  };
}

function summarizeMoney(ledger, domainsByKey) {
  const moneyFinal = domainsByKey.get("MONEY")?.final_state || null;
  const propertyFinal = domainsByKey.get("PROPERTY")?.final_state || null;
  const debtFinal = domainsByKey.get("DEBT")?.final_state || null;

  let moneyStatus = "UNKNOWN";
  if (moneyFinal === "EXECUTED" || propertyFinal === "EXECUTED") moneyStatus = "EXECUTED";
  else if (moneyFinal === "PARTIAL" || propertyFinal === "PARTIAL" || debtFinal === "PARTIAL") moneyStatus = "PARTIAL";
  else if (moneyFinal === "NOT_EXECUTED" && propertyFinal === "NOT_EXECUTED" && debtFinal === "NOT_EXECUTED") moneyStatus = "NOT_EXECUTED";
  else moneyStatus = getLastByStatuses(ledger, ["EXECUTED", "PARTIAL", "NOT_EXECUTED", "BUILDING", "RESIDUAL"])?.status || "UNKNOWN";

  const latest = getLastByStatuses(ledger, ["EXECUTED", "PARTIAL", "NOT_EXECUTED", "BUILDING", "RESIDUAL"]);

  return {
    money_ledger: ledger,
    money_status: moneyStatus,
    latest_money_event_type: latest?.event_type || null
  };
}

function summarizeConflict(ledger, domainsByKey) {
  const legalFinal = domainsByKey.get("LEGAL")?.final_state || null;
  const blockageFinal = domainsByKey.get("BLOCKAGE")?.final_state || null;
  const enemyFinal = domainsByKey.get("ENEMY")?.final_state || null;

  let conflictStatus = "UNKNOWN";
  if (legalFinal === "EXECUTED" || blockageFinal === "EXECUTED" || enemyFinal === "EXECUTED") conflictStatus = "EXECUTED";
  else if (legalFinal === "PARTIAL" || blockageFinal === "PARTIAL" || enemyFinal === "PARTIAL") conflictStatus = "PARTIAL";
  else if (legalFinal === "NOT_EXECUTED" && blockageFinal === "NOT_EXECUTED" && enemyFinal === "NOT_EXECUTED") conflictStatus = "NOT_EXECUTED";
  else conflictStatus = getLastByStatuses(ledger, ["EXECUTED", "PARTIAL", "NOT_EXECUTED", "BUILDING", "RESIDUAL"])?.status || "UNKNOWN";

  const latest = getLastByStatuses(ledger, ["EXECUTED", "PARTIAL", "NOT_EXECUTED", "BUILDING", "RESIDUAL"]);

  return {
    conflict_ledger: ledger,
    conflict_status: conflictStatus,
    latest_conflict_event_type: latest?.event_type || null
  };
}

function makeValidationBlock(facts, relationshipSummary, foreignSummary, weakTimelineMode) {
  return {
    reality_validation_active: facts.provided,
    weak_timeline_mode: weakTimelineMode,

    marriage_fact_match:
      facts.marriage_count_claim == null
        ? "NOT_PROVIDED"
        : facts.marriage_count_claim === relationshipSummary.marriage_count
          ? "EXACT"
          : "CONFLICT",

    broken_marriage_fact_match:
      facts.broken_marriage_claim == null
        ? "NOT_PROVIDED"
        : facts.broken_marriage_claim === relationshipSummary.broken_marriage_count
          ? "EXACT"
          : "CONFLICT",

    foreign_fact_match:
      facts.foreign_entry_year_claim == null
        ? "NOT_PROVIDED"
        : weakTimelineMode
          ? "LOCKED_BY_MODE"
          : facts.foreign_entry_year_claim === foreignSummary.foreign_entry_year
            ? "EXACT"
            : "CONFLICT",

    settlement_fact_match:
      facts.settlement_year_claim == null
        ? "NOT_PROVIDED"
        : weakTimelineMode
          ? "LOCKED_BY_MODE"
          : facts.settlement_year_claim === foreignSummary.settlement_year
            ? "EXACT"
            : "CONFLICT"
  };
}

function buildTruthSummary(ranked_domains, weakTimelineMode) {
  const allEvents = (ranked_domains || []).flatMap((d) => d.events || []);

  const directCount = allEvents.filter((e) => String(e.evidence_type || "").toUpperCase() === "DIRECT").length;
  const patternConfirmedCount = allEvents.filter((e) => String(e.evidence_type || "").toUpperCase() === "PATTERN_CONFIRMED").length;
  const repeatedCount = allEvents.filter((e) => String(e.evidence_type || "").toUpperCase() === "REPEATED_BEHAVIOUR").length;
  const likelyCount = allEvents.filter((e) => String(e.evidence_type || "").toUpperCase() === "LIKELY_HISTORY").length;
  const namePatternCount = allEvents.filter((e) => String(e.evidence_type || "").toUpperCase() === "NAME_PATTERN").length;

  let truthLevel = "MEDIUM";
  if (directCount >= 5) truthLevel = "HIGH";
  else if (weakTimelineMode && (patternConfirmedCount + repeatedCount + likelyCount + namePatternCount) > 0) truthLevel = "PATTERN_LOCKED";
  else if (directCount === 0 && (patternConfirmedCount + repeatedCount + likelyCount + namePatternCount) > 0) truthLevel = "PATTERN_HEAVY";

  return {
    truth_level: truthLevel,
    exact_timeline_allowed: !weakTimelineMode,
    direct_evidence_count: directCount,
    pattern_confirmed_count: patternConfirmedCount,
    repeated_pattern_count: repeatedCount,
    likely_history_count: likelyCount,
    name_pattern_count: namePatternCount
  };
}

function buildRecognitionLines(ranked_domains, weakTimelineMode) {
  const lines = [];
  const flat = (ranked_domains || []).flatMap((d) =>
    (d.events || []).map((e) => ({
      domain_key: d.domain_key,
      domain_label: d.domain_label,
      ...e
    }))
  );

  const has = (predicate) => flat.find(predicate);

  const relationBreak = has((e) =>
    ["divorce event", "divorce pressure pattern"].includes(normalizeType(e.event_type)) ||
    normalizeType(e.trigger_phase).includes("rupture")
  );
  const relationUnion = has((e) =>
    normalizeType(e.event_type).includes("marriage") ||
    normalizeType(e.event_type).includes("relationship")
  );
  const moneyPressure = has((e) =>
    ["MONEY", "DEBT", "LOSS"].includes(e.domain_key) &&
    ["ACTIVE", "RESIDUAL", "BUILDING", "EXECUTED"].includes(normalizeStatus(e.status))
  );
  const mentalPressure = has((e) =>
    ["MENTAL", "HEALTH"].includes(e.domain_key) &&
    ["ACTIVE", "RESIDUAL", "BUILDING", "EXECUTED"].includes(normalizeStatus(e.status))
  );
  const foreignLink = has((e) =>
    ["FOREIGN", "SETTLEMENT", "IMMIGRATION"].includes(e.domain_key)
  );
  const workLink = has((e) =>
    ["JOB", "BUSINESS", "CAREER"].includes(e.domain_key)
  );
  const familyLink = has((e) =>
    e.domain_key === "FAMILY"
  );
  const enemyLink = has((e) =>
    ["ENEMY", "LEGAL", "BLOCKAGE"].includes(e.domain_key)
  );

  if (relationBreak) {
    lines.push("একবার বিশ্বাস বা সম্পর্কের লাইনে ভাঙন বা কষ্টের ছাপ জোরে আছে।");
  }
  if (relationUnion) {
    lines.push("সম্পর্ক বা দাম্পত্যের লাইন তোমার জীবনে শুধু পাশ দিয়ে যায়নি, গায়ে লেগে গেছে।");
  }
  if (moneyPressure) {
    lines.push("টাকার লাইন একেবারে সোজা না; থামে, খুলে, আবার চাপে পড়ে—এই ওঠা-নামা আছে।");
  }
  if (mentalPressure) {
    lines.push("ভিতরের চাপ তুমি সবসময় বাইরে দেখাও না, কিন্তু ভেতরে সেটা জমে থাকে।");
  }
  if (foreignLink) {
    lines.push("জায়গা বদল, দূরত্ব, বিদেশ বা base-change লাইনের টান জীবনে এসেছে।");
  }
  if (workLink) {
    lines.push("কাজের লাইনে শুধু একরেখা steady চলা না, দিক-বদল বা role-shift-এর ছাপ আছে।");
  }
  if (familyLink) {
    lines.push("পরিবারের দায় বা পরিবারের একজনকে ঘিরে চাপের ছাপ জীবনকে প্রভাবিত করেছে।");
  }
  if (enemyLink) {
    lines.push("সামনে না হোক, পেছন দিক থেকে বাধা বা বিরোধের লাইন জীবনে কাজ করেছে।");
  }

  if (weakTimelineMode && !lines.length) {
    lines.push("তোমার জীবনে repeat হওয়া pattern-এর ছাপ আছে, কিন্তু exact calendar claim এখানে খোলা নেই।");
  }

  return lines.slice(0, 5);
}

function buildForensicVerdict(question_profile, event_summary, carryover, validation_block, truth_summary) {
  const conflictPresent =
    validation_block.marriage_fact_match === "CONFLICT" ||
    validation_block.broken_marriage_fact_match === "CONFLICT" ||
    validation_block.foreign_fact_match === "CONFLICT" ||
    validation_block.settlement_fact_match === "CONFLICT";

  const validation_state = conflictPresent ? "CONFLICT_PRESENT" : "STABLE";

  const forensic_direction =
    `${question_profile.primary_domain} scan shows ` +
    `${event_summary.total_major_events} major signals, ` +
    `${event_summary.total_broken_events} broken signatures, and ` +
    `${carryover.present_carryover_detected ? "active residue" : "limited residue"}. ` +
    `Relationship ledger final state ${event_summary.relationship.current_marriage_status}. ` +
    `Foreign ledger final state ${event_summary.foreign.foreign_process_status ?? "UNKNOWN"}. ` +
    `Health ledger final state ${event_summary.health.health_status}. ` +
    `Money ledger final state ${event_summary.money.money_status}. ` +
    `Truth level ${truth_summary.truth_level}.`;

  return {
    forensic_direction,
    validation_state
  };
}

function buildLokkothaSummary(question_profile, event_summary, carryover, truth_summary) {
  return {
    text:
      `${String(question_profile.primary_domain || "GENERAL").toLowerCase()}-এর হিসাব এখন বন্ধ খাতায় ধরা আছে; ` +
      `বড় চিহ্ন ${event_summary.total_major_events}, ` +
      `ভাঙা চিহ্ন ${event_summary.total_broken_events}, ` +
      `আর ঢেউ ${carryover.present_carryover_detected ? "এখনও টিকে আছে" : "নেমে গেছে"}. ` +
      `সত্যের স্তর ${truth_summary.truth_level}.`
  };
}

function rebuildTimelineFromPatchedDomains(ranked_domains, weakTimelineMode) {
  const out = [];
  for (const domain of ranked_domains || []) {
    for (const e of domain.events || []) {
      const year = weakTimelineMode ? null : normalizeYear(e.date_marker ?? e.exact_year);
      out.push({
        domain: domain.domain_label,
        domain_key: domain.domain_key,
        event_family: e.event_family || null,
        event_type: e.event_type,
        event_number: e.event_number,
        status: e.status,
        importance: e.importance,
        trigger_phase: e.trigger_phase,
        evidence_strength: e.evidence_strength,
        evidence_type: e.evidence_type || null,
        date_marker: year,
        month_or_phase: e.month_or_phase || null,
        time_band: exactTimeBandByDomain(domain.domain_key),
        who_involved: e.who_involved || null,
        impact_summary: e.impact_summary || null,
        carryover_to_present: e.carryover_to_present
      });
    }
  }

  return out
    .filter((x) =>
      x.importance === "MAJOR" ||
      ["EXECUTED", "PARTIAL", "BUILDING", "RESIDUAL", "ACTIVE", "STABILISING"].includes(x.status)
    )
    .sort((a, b) => {
      const aa = a.date_marker ?? 99999;
      const bb = b.date_marker ?? 99999;
      if (aa !== bb) return aa - bb;
      return Number(a.event_number || 0) - Number(b.event_number || 0);
    });
}

function pickPhaseEvents(master_timeline) {
  const timeline = [...(master_timeline || [])].sort((a, b) => {
    const ay = normalizeYear(a.date_marker) ?? 99999;
    const by = normalizeYear(b.date_marker) ?? 99999;
    if (ay !== by) return ay - by;
    return Number(a.event_number || 0) - Number(b.event_number || 0);
  });

  if (!timeline.length) {
    return {
      BEFORE: [],
      PEAK: [],
      IMPACT: [],
      TRANSITION: []
    };
  }

  const firstCut = Math.max(1, Math.ceil(timeline.length * 0.25));
  const secondCut = Math.max(2, Math.ceil(timeline.length * 0.5));
  const thirdCut = Math.max(3, Math.ceil(timeline.length * 0.75));

  const first = timeline.slice(0, firstCut);
  const second = timeline.slice(firstCut, secondCut);
  const third = timeline.slice(secondCut, thirdCut);
  const fourth = timeline.slice(thirdCut);

  return {
    BEFORE: first,
    PEAK: second.length ? second : first,
    IMPACT: third.length ? third : second.length ? second : first,
    TRANSITION: fourth.length ? fourth : third.length ? third : second.length ? second : first
  };
}

function phaseLineFromEvent(e) {
  return {
    year: normalizeYear(e?.date_marker),
    month_or_phase: e?.month_or_phase || "phase only",
    time_band: e?.time_band || null,
    domain_key: e?.domain_key || null,
    domain_label: e?.domain || null,
    event_type: e?.event_type || null,
    status: e?.status || null,
    who_involved: e?.who_involved || null,
    impact_summary: e?.impact_summary || null,
    trigger_phase: e?.trigger_phase || null,
    evidence_type: e?.evidence_type || null
  };
}

function buildPastPhaseSummary(master_timeline) {
  const picked = pickPhaseEvents(master_timeline);

  const makePhaseBlock = (name, arr) => {
    const primary = arr[0] ? phaseLineFromEvent(arr[0]) : null;
    const support = arr.slice(1, 3).map(phaseLineFromEvent);

    return {
      phase_name: name,
      primary_event: primary,
      support_events: support,
      visible_year: primary?.year ?? null,
      visible_month_or_phase: primary?.month_or_phase ?? null,
      visible_time_band: primary?.time_band ?? null,
      visible_event_type: primary?.event_type ?? null,
      visible_status: primary?.status ?? null,
      visible_who: primary?.who_involved ?? null,
      visible_impact: primary?.impact_summary ?? null,
      visible_evidence_type: primary?.evidence_type ?? null
    };
  };

  return {
    BEFORE: makePhaseBlock("BEFORE", picked.BEFORE),
    PEAK: makePhaseBlock("PEAK", picked.PEAK),
    IMPACT: makePhaseBlock("IMPACT", picked.IMPACT),
    TRANSITION: makePhaseBlock("TRANSITION", picked.TRANSITION)
  };
}

function buildTimingSummary(master_timeline, weakTimelineMode) {
  const valid = (master_timeline || []).filter(
    (e) => (!weakTimelineMode && normalizeYear(e.date_marker) != null) || e.month_or_phase != null
  );

  const first = valid[0] || null;
  const last = valid[valid.length - 1] || null;

  return {
    first_visible_year: weakTimelineMode ? null : normalizeYear(first?.date_marker) ?? null,
    first_visible_phase: first?.month_or_phase ?? null,
    first_visible_time_band: first?.time_band ?? null,

    last_visible_year: weakTimelineMode ? null : normalizeYear(last?.date_marker) ?? null,
    last_visible_phase: last?.month_or_phase ?? null,
    last_visible_time_band: last?.time_band ?? null,

    total_timed_events: valid.length,
    exact_timeline_allowed: !weakTimelineMode
  };
}

function buildRecognitionTimeline(master_timeline, weakTimelineMode) {
  return (master_timeline || [])
    .slice(0, 12)
    .map((e) => ({
      year: weakTimelineMode ? null : normalizeYear(e.date_marker) ?? null,
      phase: e.month_or_phase || null,
      time_band: e.time_band || null,
      domain_key: e.domain_key || null,
      domain: e.domain || null,
      event_type: e.event_type || null,
      status: e.status || null,
      who: e.who_involved || null,
      impact: e.impact_summary || null,
      evidence_type: e.evidence_type || null
    }));
}

function buildProjectPasteBlock({
  input,
  question_profile,
  patched_ranked_domains,
  event_summary,
  validation_block,
  forensic_verdict,
  lokkotha_summary,
  master_timeline
}) {
  const phaseSummary = event_summary.past_phase_summary || {};
  const timingSummary = event_summary.timing_summary || {};
  const truthSummary = event_summary.truth_summary || {};

  return [
    "PAST UNIVERSAL FORENSIC NANO BLOCK",
    `Subject: ${input.name || "UNKNOWN"}`,
    `Primary Domain: ${question_profile.primary_domain}`,
    `Top Domains: ${patched_ranked_domains.slice(0, 6).map((d) => d.domain_label).join(" | ")}`,

    `Total Estimated Events: ${event_summary.total_estimated_events}`,
    `Total Major Events: ${event_summary.total_major_events}`,
    `Total Broken Events: ${event_summary.total_broken_events}`,

    `Truth Level: ${truthSummary.truth_level ?? "UNKNOWN"}`,
    `Exact Timeline Allowed: ${truthSummary.exact_timeline_allowed ? "YES" : "NO"}`,
    `Direct Evidence Count: ${truthSummary.direct_evidence_count ?? 0}`,
    `Pattern Confirmed Count: ${truthSummary.pattern_confirmed_count ?? 0}`,
    `Repeated Pattern Count: ${truthSummary.repeated_pattern_count ?? 0}`,
    `Likely History Count: ${truthSummary.likely_history_count ?? 0}`,
    `Name Pattern Count: ${truthSummary.name_pattern_count ?? 0}`,

    `Marriage Count: ${event_summary.relationship.marriage_count}`,
    `Broken Marriage Count: ${event_summary.relationship.broken_marriage_count}`,
    `Current Marriage Status: ${event_summary.relationship.current_marriage_status}`,

    `Dominant Work Mode: ${event_summary.work.dominant_work_mode}`,
    `Education Active: ${event_summary.work.education_active ? "YES" : "NO"}`,
    `Job Active: ${event_summary.work.job_active ? "YES" : "NO"}`,
    `Business Active: ${event_summary.work.business_active ? "YES" : "NO"}`,

    `Foreign Shift Count: ${event_summary.foreign.foreign_shift_count}`,
    `Foreign Entry Year: ${event_summary.foreign.foreign_entry_year ?? "UNKNOWN"}`,
    `Settlement Year: ${event_summary.foreign.settlement_year ?? "UNKNOWN"}`,
    `Foreign Process Status: ${event_summary.foreign.foreign_process_status ?? "UNKNOWN"}`,

    `Health Status: ${event_summary.health.health_status}`,
    `Money Status: ${event_summary.money.money_status}`,
    `Conflict Status: ${event_summary.conflict.conflict_status}`,

    `Carryover Present: ${event_summary.carryover_present ? "YES" : "NO"}`,

    `Marriage Validation: ${validation_block.marriage_fact_match}`,
    `Broken Marriage Validation: ${validation_block.broken_marriage_fact_match}`,
    `Foreign Validation: ${validation_block.foreign_fact_match}`,
    `Settlement Validation: ${validation_block.settlement_fact_match}`,

    `Direction: ${forensic_verdict.forensic_direction}`,
    `Lokkotha: ${lokkotha_summary.text}`,

    "Recognition Lines:",
    ...event_summary.recognition_lines.slice(0, 5).map((x) => `- ${x}`),

    "Timing Summary:",
    `First Visible: ${timingSummary.first_visible_year ?? "UNKNOWN"} | ${timingSummary.first_visible_phase ?? "NO_PHASE"} | ${timingSummary.first_visible_time_band ?? "NO_TIME"}`,
    `Last Visible: ${timingSummary.last_visible_year ?? "UNKNOWN"} | ${timingSummary.last_visible_phase ?? "NO_PHASE"} | ${timingSummary.last_visible_time_band ?? "NO_TIME"}`,
    `Total Timed Events: ${timingSummary.total_timed_events ?? 0}`,

    "Past Phase Summary:",
    `BEFORE: ${phaseSummary.BEFORE?.visible_year ?? "UNKNOWN"} | ${phaseSummary.BEFORE?.visible_month_or_phase ?? "NO_PHASE"} | ${phaseSummary.BEFORE?.visible_time_band ?? "NO_TIME"} | ${phaseSummary.BEFORE?.visible_event_type ?? "NO_EVENT"} | ${phaseSummary.BEFORE?.visible_evidence_type ?? "NO_EVIDENCE"}`,
    `PEAK: ${phaseSummary.PEAK?.visible_year ?? "UNKNOWN"} | ${phaseSummary.PEAK?.visible_month_or_phase ?? "NO_PHASE"} | ${phaseSummary.PEAK?.visible_time_band ?? "NO_TIME"} | ${phaseSummary.PEAK?.visible_event_type ?? "NO_EVENT"} | ${phaseSummary.PEAK?.visible_evidence_type ?? "NO_EVIDENCE"}`,
    `IMPACT: ${phaseSummary.IMPACT?.visible_year ?? "UNKNOWN"} | ${phaseSummary.IMPACT?.visible_month_or_phase ?? "NO_PHASE"} | ${phaseSummary.IMPACT?.visible_time_band ?? "NO_TIME"} | ${phaseSummary.IMPACT?.visible_event_type ?? "NO_EVENT"} | ${phaseSummary.IMPACT?.visible_evidence_type ?? "NO_EVIDENCE"}`,
    `TRANSITION: ${phaseSummary.TRANSITION?.visible_year ?? "UNKNOWN"} | ${phaseSummary.TRANSITION?.visible_month_or_phase ?? "NO_PHASE"} | ${phaseSummary.TRANSITION?.visible_time_band ?? "NO_TIME"} | ${phaseSummary.TRANSITION?.visible_event_type ?? "NO_EVENT"} | ${phaseSummary.TRANSITION?.visible_evidence_type ?? "NO_EVIDENCE"}`,

    "Recognition Timeline:",
    ...event_summary.recognition_timeline.slice(0, 12).map(
      (e) =>
        `${e.year ?? "UNKNOWN"} | ${e.phase ?? "NO_PHASE"} | ${e.time_band ?? "NO_TIME"} | ${e.domain ?? "NO_DOMAIN"} | ${e.event_type ?? "NO_EVENT"} | ${e.status ?? "NO_STATUS"} | ${e.evidence_type ?? "NO_EVIDENCE"}`
    ),

    "Timeline:",
    ...master_timeline.slice(0, 24).map(
      (e) =>
        `${e.domain} | #${e.event_number} | ${e.event_type} | ${e.status} | ${e.date_marker ?? "UNDATED"} | ${e.month_or_phase ?? "NO_PHASE"} | ${e.time_band ?? "NO_TIME"} | ${e.evidence_type ?? "NO_EVIDENCE"}`
    ),

    "PAST UNIVERSAL FORENSIC NANO BLOCK END"
  ].join("\n");
}

export function runEvidenceLayer({
  input,
  facts,
  question_profile,
  ranked_domains,
  master_timeline,
  carryover,
  subject_context,
  birth_context
}) {
  const modeFlags = getModeFlags(subject_context, birth_context);
  const weakTimelineMode = modeFlags.isNameOnly || modeFlags.isNameContext;

  const seededDomains = patchAndRebuildRankedDomains(ranked_domains, master_timeline, weakTimelineMode);
  const finalisedSeededDomains = applyFinalStateToExactDomainSummary(seededDomains);
  const domainsByKey = new Map(finalisedSeededDomains.map((d) => [d.domain_key, d]));

  const relationshipLedger = buildRelationshipLedger(finalisedSeededDomains);
  const workLedger = buildWorkLedger(finalisedSeededDomains);
  const foreignLedger = buildForeignLedger(finalisedSeededDomains);
  const healthLedger = buildHealthLedger(finalisedSeededDomains);
  const moneyLedger = buildMoneyLedger(finalisedSeededDomains);
  const conflictLedger = buildConflictLedger(finalisedSeededDomains);

  const relationshipSummary = summarizeRelationship(relationshipLedger, domainsByKey);
  const workSummary = summarizeWork(workLedger, domainsByKey);
  const foreignSummary = summarizeForeign(foreignLedger, domainsByKey);
  const healthSummary = summarizeHealth(healthLedger, domainsByKey);
  const moneySummary = summarizeMoney(moneyLedger, domainsByKey);
  const conflictSummary = summarizeConflict(conflictLedger, domainsByKey);

  const rebuiltTimeline = rebuildTimelineFromPatchedDomains(finalisedSeededDomains, weakTimelineMode);
  const pastPhaseSummary = buildPastPhaseSummary(rebuiltTimeline);
  const timingSummary = buildTimingSummary(rebuiltTimeline, weakTimelineMode);
  const recognitionTimeline = buildRecognitionTimeline(rebuiltTimeline, weakTimelineMode);
  const truthSummary = buildTruthSummary(finalisedSeededDomains, weakTimelineMode);
  const recognitionLines = buildRecognitionLines(finalisedSeededDomains, weakTimelineMode);

  const event_summary = {
    total_estimated_events: finalisedSeededDomains.reduce((a, b) => a + (b.events?.length || 0), 0),
    total_major_events: finalisedSeededDomains.reduce((a, b) => a + (b.major_event_count || 0), 0),
    total_minor_events: finalisedSeededDomains.reduce((a, b) => a + (b.minor_event_count || 0), 0),
    total_broken_events: finalisedSeededDomains.reduce((a, b) => a + (b.broken_event_count || 0), 0),
    total_active_events: finalisedSeededDomains.reduce((a, b) => a + (b.active_event_count || 0), 0),

    relationship: relationshipSummary,
    work: workSummary,
    foreign: foreignSummary,
    health: healthSummary,
    money: moneySummary,
    conflict: conflictSummary,

    top_5_domains: finalisedSeededDomains.slice(0, 5).map((d) => d.domain_label),
    carryover_present: !!carryover?.present_carryover_detected,

    past_phase_summary: pastPhaseSummary,
    timing_summary: timingSummary,
    recognition_timeline: recognitionTimeline,
    truth_summary: truthSummary,
    recognition_lines: recognitionLines
  };

  const validation_block = makeValidationBlock(facts, relationshipSummary, foreignSummary, weakTimelineMode);

  const forensic_verdict = buildForensicVerdict(
    question_profile,
    event_summary,
    carryover,
    validation_block,
    truthSummary
  );

  const lokkotha_summary = buildLokkothaSummary(
    question_profile,
    event_summary,
    carryover,
    truthSummary
  );

  const exact_domain_summary = buildExactDomainSummary(finalisedSeededDomains);

  const project_paste_block = buildProjectPasteBlock({
    input,
    question_profile,
    patched_ranked_domains: finalisedSeededDomains,
    event_summary,
    validation_block,
    forensic_verdict,
    lokkotha_summary,
    master_timeline: rebuiltTimeline
  });

  return {
    ranked_domains: finalisedSeededDomains,
    exact_domain_summary,
    event_summary,
    validation_block,
    forensic_verdict,
    lokkotha_summary,
    project_paste_block,
    master_timeline: rebuiltTimeline
  };
}