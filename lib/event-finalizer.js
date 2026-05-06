// lib/event-finalizer.js
// FULL REPLACEMENT — UNIVERSAL PAST EVENT FINALIZER V9
// Fix:
// - FULL_BIRTH strong LIKELY_HISTORY becomes FORENSIC_EXECUTED_CANDIDATE
// - DIRECT / DIRECT_FACT / FACT_ANCHORED only becomes EXECUTED
// - NAME_PATTERN never executes
// - Archive domains can still preserve final_state without fake event visibility

const FINALIZER_VERSION = "UNIVERSAL_PAST_EVENT_FINALIZER_V9";

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

function isDirectEvidence(type) {
  return ["DIRECT", "DIRECT_FACT", "FACT_ANCHORED"].includes(up(type));
}

function isNamePattern(type) {
  return up(type) === "NAME_PATTERN";
}

function isLikelyAstro(type) {
  return ["LIKELY_HISTORY", "PATTERN_CONFIRMED", "PATTERN_ONLY"].includes(up(type));
}

function isFullBirthDomain(domain) {
  return (
    up(domain?.oracle_mode) === "FULL_BIRTH_MAX_FORENSIC_MODE" ||
    domain?.exact_timeline_allowed === true ||
    domain?.timeline_precision_mode === "FULL_BIRTH_PRIME_YEAR"
  );
}

function scoreEvent(domain, event) {
  let score = num(domain.normalized_score || domain.rank_score);

  const evidence = up(event.evidence_type);
  const strength = low(event.evidence_strength);
  const importance = up(event.importance);

  if (isDirectEvidence(evidence)) score += 9;
  else if (evidence === "LIKELY_HISTORY") score += 5;
  else if (evidence === "PATTERN_CONFIRMED") score += 4;
  else if (evidence === "NAME_PATTERN") score += 2.2;
  else if (evidence === "PATTERN_ONLY") score += 1.5;

  if (strength.includes("strong")) score += 3.5;
  else if (strength.includes("moderate")) score += 2;
  else if (strength.includes("light")) score += 1;

  if (importance === "MAJOR") score += 2.8;

  score += Math.min(3.5, safeArray(domain.kp_reasons).length * 0.45);
  score += Math.min(2.5, safeArray(domain.dasha_reasons).length * 0.5);
  score += Math.min(3.5, safeArray(domain.house_hits).length * 0.35);
  score += Math.min(3.5, safeArray(domain.aspect_hits).length * 0.25);
  score += Math.min(2.5, num(domain.support_count) * 0.18);

  return Math.round((score + Number.EPSILON) * 100) / 100;
}

function finalStatusForEvent(domain, event, score) {
  const evidence = up(event.evidence_type);

  if (isDirectEvidence(evidence)) return "EXECUTED";

  if (isNamePattern(evidence)) {
    return num(domain.normalized_score) >= 3.2 ? "LIKELY_WINDOW" : "PATTERN_ONLY";
  }

  if (isFullBirthDomain(domain) && isLikelyAstro(evidence)) {
    if (score >= 21 || num(domain.normalized_score) >= 8.2) return "FORENSIC_EXECUTED_CANDIDATE";
    if (score >= 17 || num(domain.normalized_score) >= 7.2) return "VERY_HIGH_PROBABILITY";
    if (score >= 13 || num(domain.normalized_score) >= 5.65) return "HIGH_PROBABILITY";
    return "PATTERN_ONLY";
  }

  if (isLikelyAstro(evidence)) {
    if (score >= 17 || num(domain.normalized_score) >= 7.2) return "VERY_HIGH_PROBABILITY";
    if (score >= 13 || num(domain.normalized_score) >= 5.65) return "HIGH_PROBABILITY";
    return "PATTERN_ONLY";
  }

  const old = up(event.status);
  if (old === "EXECUTED" && !isDirectEvidence(evidence)) return "HIGH_PROBABILITY";
  return old || "UNKNOWN";
}

function finalStateFromEvents(events, oldState = "UNKNOWN") {
  const statuses = safeArray(events).map((e) => up(e.status));

  if (statuses.includes("EXECUTED")) return "EXECUTED";
  if (statuses.includes("FORENSIC_EXECUTED_CANDIDATE")) return "FORENSIC_EXECUTED_CANDIDATE";
  if (statuses.includes("VERY_HIGH_PROBABILITY")) return "VERY_HIGH_PROBABILITY";
  if (statuses.includes("HIGH_PROBABILITY")) return "HIGH_PROBABILITY";
  if (statuses.includes("LIKELY_WINDOW")) return "LIKELY_WINDOW";
  if (statuses.includes("PATTERN_ONLY")) return "PATTERN_ONLY";
  if (statuses.includes("BROKEN")) return "BROKEN";
  if (statuses.includes("PARTIAL")) return "PARTIAL";
  if (statuses.includes("IN_PROGRESS")) return "IN_PROGRESS";

  return up(oldState) || "UNKNOWN";
}

function patchEvent(domain, event) {
  const e = clone(event);
  const evidence = up(e.evidence_type);
  const score = scoreEvent(domain, e);
  const direct = isDirectEvidence(evidence);

  e.status = finalStatusForEvent(domain, e, score);
  e.score = score;
  e.finalizer_version = FINALIZER_VERSION;

  e.execution_claim_allowed = direct;
  e.exact_claim_locked = !direct;

  if (direct) {
    e.evidence_type = evidence === "DIRECT" ? "DIRECT_FACT" : evidence;
    e.carryover_to_present = e.carryover_to_present || "YES";
  }

  if (isNamePattern(evidence)) {
    e.exact_year = null;
    e.date_marker = null;
    e.likely_year_window = null;
    e.timing_mode = "LIKELY_AGE_WINDOW";
  }

  if (!direct && isLikelyAstro(evidence)) {
    e.execution_note =
      "Astro-forensic candidate only; DIRECT_FACT required for EXECUTED seal.";
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
  if (["HEALTH", "MENTAL", "MIND"].includes(k)) return "HEALTH";
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
  score += num(domain.support_count) * 0.15;

  for (const e of safeArray(events)) {
    const st = up(e.status);
    if (st === "EXECUTED") score += 10;
    else if (st === "FORENSIC_EXECUTED_CANDIDATE") score += 7.5;
    else if (st === "VERY_HIGH_PROBABILITY") score += 6;
    else if (st === "HIGH_PROBABILITY") score += 4;
    else if (st === "LIKELY_WINDOW") score += 2;
  }

  return Math.round((score + Number.EPSILON) * 100) / 100;
}

function presentationTier(domain, rankScore, events) {
  const visible = safeArray(events).some((e) =>
    ["EXECUTED", "FORENSIC_EXECUTED_CANDIDATE", "VERY_HIGH_PROBABILITY", "HIGH_PROBABILITY", "LIKELY_WINDOW"].includes(up(e.status))
  );

  if (rankScore >= 22 && visible) return "PRIMARY";
  if (rankScore >= 16.5 && visible) return "SECONDARY";
  if (rankScore >= 12) return "SUPPORT";
  return "ARCHIVE";
}

function clientVisible(tier) {
  return ["PRIMARY", "SECONDARY"].includes(tier);
}

export function runEventFinalizer(rankedDomains = []) {
  return safeArray(rankedDomains)
    .map((domain) => {
      const patchedEvents = safeArray(domain.events).map((e) => patchEvent(domain, e));
      const finalState = finalStateFromEvents(patchedEvents, domain.final_state);
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
          ["EXECUTED", "FORENSIC_EXECUTED_CANDIDATE", "VERY_HIGH_PROBABILITY", "HIGH_PROBABILITY", "LIKELY_WINDOW", "PATTERN_ONLY"].includes(up(e.status))
        ).length
      };
    })
    .sort((a, b) => num(b.rank_score) - num(a.rank_score));
}