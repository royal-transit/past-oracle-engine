// lib/event-finalizer.js
// FULL REPLACEMENT — UNIVERSAL PAST EVENT FINALIZER V8
// HARD FIX:
// - LIKELY_HISTORY never becomes EXECUTED
// - NAME_PATTERN never becomes EXECUTED
// - EXECUTED only allowed for DIRECT / DIRECT_FACT / FACT_ANCHORED
// - Full-birth strong astrology becomes VERY_HIGH_PROBABILITY / HIGH_PROBABILITY only

const FINALIZER_VERSION = "UNIVERSAL_PAST_EVENT_FINALIZER_V8";

function up(v) {
  return String(v || "").trim().toUpperCase();
}

function low(v) {
  return String(v || "").trim().toLowerCase();
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function safeArray(v) {
  return Array.isArray(v) ? v : [];
}

function clone(v) {
  return JSON.parse(JSON.stringify(v || {}));
}

function isDirectEvidence(evidenceType) {
  return ["DIRECT", "DIRECT_FACT", "FACT_ANCHORED"].includes(up(evidenceType));
}

function isPatternEvidence(evidenceType) {
  return ["LIKELY_HISTORY", "PATTERN_ONLY", "PATTERN_CONFIRMED", "NAME_PATTERN"].includes(up(evidenceType));
}

function isNamePattern(evidenceType) {
  return up(evidenceType) === "NAME_PATTERN";
}

function scoreEvent(domain, event) {
  let score = num(domain.normalized_score || domain.rank_score);

  const evidenceType = up(event.evidence_type);
  const strength = low(event.evidence_strength);
  const importance = up(event.importance);

  if (isDirectEvidence(evidenceType)) score += 8;
  else if (evidenceType === "LIKELY_HISTORY") score += 4;
  else if (evidenceType === "PATTERN_CONFIRMED") score += 3.5;
  else if (evidenceType === "NAME_PATTERN") score += 2.2;
  else if (evidenceType === "PATTERN_ONLY") score += 1.5;

  if (strength.includes("strong")) score += 3;
  else if (strength.includes("moderate")) score += 2;
  else if (strength.includes("light")) score += 1;

  if (importance === "MAJOR") score += 2.5;

  if (safeArray(domain.kp_reasons).length) score += Math.min(3, safeArray(domain.kp_reasons).length * 0.45);
  if (safeArray(domain.dasha_reasons).length) score += Math.min(2, safeArray(domain.dasha_reasons).length * 0.5);
  if (safeArray(domain.house_hits).length) score += Math.min(3, safeArray(domain.house_hits).length * 0.35);
  if (safeArray(domain.aspect_hits).length) score += Math.min(3, safeArray(domain.aspect_hits).length * 0.25);

  return Math.round((score + Number.EPSILON) * 100) / 100;
}

function finalStatusForEvent(domain, event, eventScore) {
  const evidenceType = up(event.evidence_type);
  const oldStatus = up(event.status);

  if (isDirectEvidence(evidenceType)) {
    return "EXECUTED";
  }

  if (isNamePattern(evidenceType)) {
    return num(domain.normalized_score) >= 3.2 ? "LIKELY_WINDOW" : "PATTERN_ONLY";
  }

  if (evidenceType === "LIKELY_HISTORY" || evidenceType === "PATTERN_CONFIRMED") {
    if (eventScore >= 20 || num(domain.normalized_score) >= 7.7) return "VERY_HIGH_PROBABILITY";
    if (eventScore >= 15 || num(domain.normalized_score) >= 5.65) return "HIGH_PROBABILITY";
    return "PATTERN_ONLY";
  }

  if (oldStatus === "EXECUTED") {
    return isDirectEvidence(evidenceType) ? "EXECUTED" : "HIGH_PROBABILITY";
  }

  return oldStatus || "UNKNOWN";
}

function finalStateFromEvents(events) {
  const statuses = safeArray(events).map((e) => up(e.status));

  if (statuses.includes("EXECUTED")) return "EXECUTED";
  if (statuses.includes("VERY_HIGH_PROBABILITY")) return "VERY_HIGH_PROBABILITY";
  if (statuses.includes("HIGH_PROBABILITY")) return "HIGH_PROBABILITY";
  if (statuses.includes("LIKELY_WINDOW")) return "LIKELY_WINDOW";
  if (statuses.includes("PATTERN_ONLY")) return "PATTERN_ONLY";
  if (statuses.includes("BROKEN")) return "BROKEN";
  if (statuses.includes("PARTIAL")) return "PARTIAL";
  if (statuses.includes("IN_PROGRESS")) return "IN_PROGRESS";

  return "UNKNOWN";
}

function patchEvent(domain, event) {
  const e = clone(event);
  const eventScore = scoreEvent(domain, e);
  const evidenceType = up(e.evidence_type);

  const directAllowed = isDirectEvidence(evidenceType);
  const nameOnly = isNamePattern(evidenceType);

  e.status = finalStatusForEvent(domain, e, eventScore);
  e.score = eventScore;
  e.finalizer_version = FINALIZER_VERSION;

  e.execution_claim_allowed = directAllowed;
  e.exact_claim_locked = !directAllowed;

  if (nameOnly) {
    e.exact_year = null;
    e.date_marker = null;
    e.likely_year_window = null;
    e.timing_mode = "LIKELY_AGE_WINDOW";
  }

  if (isPatternEvidence(evidenceType) && !directAllowed) {
    e.carryover_to_present = e.carryover_to_present || "NO";
  }

  return e;
}

function rankGroup(domainKey) {
  const k = up(domainKey);

  if (["MARRIAGE", "DIVORCE", "MULTIPLE_MARRIAGE", "LOVE", "PARTNERSHIP"].includes(k)) return "RELATIONSHIP";
  if (["JOB", "CAREER", "BUSINESS", "EDUCATION"].includes(k)) return "WORK";
  if (["FOREIGN", "IMMIGRATION", "VISA", "SETTLEMENT"].includes(k)) return "FOREIGN";
  if (["MONEY", "DEBT", "PROPERTY", "VEHICLE", "GAIN", "LOSS"].includes(k)) return "MONEY";
  if (["LEGAL", "DOCUMENT", "ENEMY", "BLOCKAGE", "FAILURE"].includes(k)) return "CONFLICT";
  if (["HEALTH", "MENTAL"].includes(k)) return "HEALTH";
  if (["FAMILY", "CHILDREN", "HOME"].includes(k)) return "FAMILY";
  if (["SPIRITUAL", "RELIGION"].includes(k)) return "SPIRITUAL";

  return "GENERAL";
}

function rankDomain(domain, events) {
  let score = num(domain.normalized_score);

  score += safeArray(domain.kp_reasons).length * 0.45;
  score += safeArray(domain.dasha_reasons).length * 0.5;
  score += safeArray(domain.house_hits).length * 0.35;
  score += safeArray(domain.aspect_hits).length * 0.2;

  for (const e of events) {
    const st = up(e.status);
    if (st === "EXECUTED") score += 9;
    else if (st === "VERY_HIGH_PROBABILITY") score += 6;
    else if (st === "HIGH_PROBABILITY") score += 4;
    else if (st === "LIKELY_WINDOW") score += 2;
  }

  return Math.round((score + Number.EPSILON) * 100) / 100;
}

function presentationTier(domain, rankScore, events) {
  const hasVisibleEvent = safeArray(events).some((e) =>
    ["EXECUTED", "VERY_HIGH_PROBABILITY", "HIGH_PROBABILITY", "LIKELY_WINDOW"].includes(up(e.status))
  );

  if (rankScore >= 22 && hasVisibleEvent) return "PRIMARY";
  if (rankScore >= 17 && hasVisibleEvent) return "SECONDARY";
  if (rankScore >= 12) return "SUPPORT";
  return "ARCHIVE";
}

function clientVisible(tier) {
  return ["PRIMARY", "SECONDARY"].includes(tier);
}

export function runEventFinalizer(rankedDomains = []) {
  return safeArray(rankedDomains)
    .map((domain) => {
      const originalEvents = safeArray(domain.events);
      const patchedEvents = originalEvents.map((e) => patchEvent(domain, e));

      const finalState = finalStateFromEvents(patchedEvents);
      const rankScore = rankDomain(domain, patchedEvents);
      const group = rankGroup(domain.domain_key);
      const tier = presentationTier(domain, rankScore, patchedEvents);
      const visible = clientVisible(tier);

      const visibleEvents = visible ? patchedEvents : [];
      const suppressedEventsCount = visible ? 0 : patchedEvents.length;

      return {
        ...domain,

        events: visibleEvents,
        suppressed_events_count: suppressedEventsCount,

        final_state: finalState,
        finalizer_version: FINALIZER_VERSION,

        raw_normalized_score: domain.normalized_score,
        rank_score: rankScore,
        rank_group: group,
        presentation_tier: tier,
        client_visible: visible,

        intelligence_gate_note: visible
          ? "VISIBLE_STRONG_OR_LINKED_DOMAIN"
          : "BACKGROUND_SCAN_PRESERVED_EVENTS_SUPPRESSED",

        major_event_count: visibleEvents.filter((e) => up(e.importance) === "MAJOR").length,
        minor_event_count: visibleEvents.filter((e) => up(e.importance) === "MINOR").length,
        broken_event_count: visibleEvents.filter((e) => up(e.status) === "BROKEN").length,
        active_event_count: visibleEvents.filter((e) =>
          ["EXECUTED", "VERY_HIGH_PROBABILITY", "HIGH_PROBABILITY", "LIKELY_WINDOW", "PATTERN_ONLY"].includes(up(e.status))
        ).length
      };
    })
    .sort((a, b) => num(b.rank_score) - num(a.rank_score));
}