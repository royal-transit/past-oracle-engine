// lib/event-finalizer.js
// FULL REPLACEMENT — UNIVERSAL PAST EVENT FINALIZER V6
// NO PARTIAL PATCH
// NAME_ONLY ≠ EXECUTED
// NAME_ONLY strong signal = LIKELY_WINDOW / PATTERN_ONLY
// EXECUTION BLOCKED ≠ SIGNAL ABSENT

function up(v) {
  return String(v || "").trim().toUpperCase();
}

function safeArray(v) {
  return Array.isArray(v) ? v : [];
}

function toScore(event, domain) {
  if (Number.isFinite(Number(event?.score))) return Number(event.score);
  if (Number.isFinite(Number(event?.normalized_score))) return Number(event.normalized_score);
  if (Number.isFinite(Number(domain?.score))) return Number(domain.score);
  if (Number.isFinite(Number(domain?.normalized_score))) return Number(domain.normalized_score);
  return 0;
}

function isNamePattern(event) {
  return ["NAME_PATTERN", "STRONG_NAME_PATTERN", "NAME_ONLY_PATTERN"].includes(up(event?.evidence_type));
}

function isDirectEvidence(event) {
  return ["DIRECT", "DIRECT_FACT", "FACT_ANCHORED", "PATTERN_CONFIRMED"].includes(up(event?.evidence_type));
}

function executionAllowed(event, domain) {
  if (event?.execution_claim_allowed === false) return false;
  if (domain?.execution_claim_allowed === false) return false;
  if (domain?.exact_timeline_allowed === false && isNamePattern(event)) return false;
  return true;
}

function classifyEvent(domain, event) {
  const score = toScore(event, domain);
  const evidenceType = up(event?.evidence_type);
  const strength = up(event?.evidence_strength);
  const importance = up(event?.importance);

  // Fact / direct evidence can execute only when execution is allowed.
  if (isDirectEvidence(event) && executionAllowed(event, domain)) {
    if (strength.includes("STRONG") || score >= 8) return "EXECUTED";
    if (score >= 5 || importance === "MAJOR") return "HIGH_PROBABILITY";
    return "PATTERN_ONLY";
  }

  // Name-only cannot become EXECUTED, but must not collapse into UNKNOWN.
  if (isNamePattern(event)) {
    if (score >= 3.2 || strength.includes("STRONG")) return "LIKELY_WINDOW";
    if (score >= 2.0 || importance === "MAJOR" || importance === "MINOR") return "PATTERN_ONLY";
    return "WEAK_SIGNAL";
  }

  // Likely-history / inferred pattern.
  if (["LIKELY_HISTORY", "PATTERN_ONLY"].includes(evidenceType)) {
    if (executionAllowed(event, domain) && score >= 8) return "HIGH_PROBABILITY";
    if (score >= 4.5 || importance === "MAJOR") return "LIKELY_WINDOW";
    if (score >= 2) return "PATTERN_ONLY";
    return "WEAK_SIGNAL";
  }

  // Any event object means signal exists.
  if (score >= 4.5 || importance === "MAJOR") return "LIKELY_WINDOW";
  if (score > 0 || importance === "MINOR") return "PATTERN_ONLY";

  return "UNKNOWN";
}

function triggerPhase(status) {
  switch (status) {
    case "EXECUTED":
      return "event confirmed";
    case "HIGH_PROBABILITY":
      return "high probability pattern";
    case "LIKELY_WINDOW":
      return "strong likely timing window";
    case "PATTERN_ONLY":
      return "pattern visible";
    case "WEAK_SIGNAL":
      return "weak signal only";
    case "NOT_EXECUTED":
      return "not executed";
    default:
      return "insufficient truth";
  }
}

function impactSummary(status) {
  switch (status) {
    case "EXECUTED":
      return "event has definitively occurred";
    case "HIGH_PROBABILITY":
      return "event probability is high, but final execution is not locked";
    case "LIKELY_WINDOW":
      return "strong probability window visible, but execution is not confirmed";
    case "PATTERN_ONLY":
      return "pattern visible, execution unconfirmed";
    case "WEAK_SIGNAL":
      return "signal exists but is weak";
    case "NOT_EXECUTED":
      return "event not confirmed";
    default:
      return "insufficient truth";
  }
}

function carryover(status, event) {
  if (event?.carryover_to_present === "YES") return "YES";
  if (["EXECUTED", "HIGH_PROBABILITY"].includes(status)) return "YES";
  return "NO";
}

function domainFinalState(events = [], oldState = "") {
  const states = safeArray(events).map((e) => up(e?.status));

  if (states.includes("EXECUTED")) return "EXECUTED";
  if (states.includes("HIGH_PROBABILITY")) return "HIGH_PROBABILITY";
  if (states.includes("LIKELY_WINDOW")) return "LIKELY_WINDOW";
  if (states.includes("PATTERN_ONLY")) return "PATTERN_ONLY";
  if (states.includes("WEAK_SIGNAL")) return "WEAK_SIGNAL";
  if (states.includes("NOT_EXECUTED")) return "NOT_EXECUTED";

  return up(oldState) || "UNKNOWN";
}

function enrichEvent(domain, event) {
  const status = classifyEvent(domain, event);
  const score = toScore(event, domain);

  return {
    ...event,
    score,
    status,
    trigger_phase: triggerPhase(status),
    impact_summary: impactSummary(status),
    carryover_to_present: carryover(status, event),
    execution_claim_allowed: executionAllowed(event, domain),
    finalizer_version: "UNIVERSAL_PAST_EVENT_FINALIZER_V6"
  };
}

export function runEventFinalizer(domains = []) {
  return safeArray(domains).map((domain) => {
    const events = safeArray(domain?.events).map((event) => enrichEvent(domain, event));

    const primary =
      domain?.primary_exact_event
        ? enrichEvent(domain, domain.primary_exact_event)
        : null;

    const alternatives = safeArray(domain?.alternative_exact_events).map((event) =>
      enrichEvent(domain, event)
    );

    const allEvents = [
      ...events,
      ...(primary ? [primary] : []),
      ...alternatives
    ];

    return {
      ...domain,
      events,
      primary_exact_event: primary,
      alternative_exact_events: alternatives,
      final_state: domainFinalState(allEvents, domain?.final_state),
      finalizer_version: "UNIVERSAL_PAST_EVENT_FINALIZER_V6"
    };
  });
}