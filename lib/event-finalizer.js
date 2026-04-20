// lib/event-finalizer.js
// FULL REPLACEMENT — BALANCED PAST EVENT FINALIZER V3

function up(v) {
  return String(v || "").trim().toUpperCase();
}

function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function triggerPhase(status) {
  switch (status) {
    case "EXECUTED":
      return "event confirmed";
    case "PARTIAL":
      return "partial execution";
    case "BLOCKED":
      return "blocked execution";
    case "BROKEN":
      return "broken execution";
    default:
      return "no confirmed execution";
  }
}

function impactSummary(status) {
  switch (status) {
    case "EXECUTED":
      return "event has definitively occurred";
    case "PARTIAL":
      return "event partially materialised";
    case "BLOCKED":
      return "event is blocked or delayed";
    case "BROKEN":
      return "event broke or did not hold";
    default:
      return "event not confirmed";
  }
}

function classifyEvent(domain, event) {
  const currentStatus = up(event?.status);
  if (["EXECUTED", "PARTIAL", "BLOCKED", "BROKEN", "NOT_EXECUTED"].includes(currentStatus)) {
    return currentStatus;
  }

  const evidenceType = up(event?.evidence_type);
  const evidenceStrength = up(event?.evidence_strength);
  const importance = up(event?.importance);

  const score =
    num(event?.score, null) ??
    num(event?.normalized_score, null) ??
    num(domain?.normalized_score, 0);

  // DIRECT / CONFIRMED evidence
  if (
    ["DIRECT", "PATTERN_CONFIRMED"].includes(evidenceType) &&
    (evidenceStrength === "STRONG" || score >= 28)
  ) {
    return "EXECUTED";
  }

  // LIKELY HISTORY — DOB reduced mode should not suppress too hard
  if (evidenceType === "LIKELY_HISTORY") {
    if (score >= 27) return "EXECUTED";
    if (score >= 17) return "PARTIAL";
    return "NOT_EXECUTED";
  }

  // NAME PATTERN — softer than before
  if (evidenceType === "NAME_PATTERN") {
    if (importance === "MAJOR") {
      if (score >= 28) return "EXECUTED";
      if (score >= 16) return "PARTIAL";
      return "NOT_EXECUTED";
    }

    // minor name patterns still deserve partial if recognisable
    if (score >= 24) return "EXECUTED";
    if (score >= 16) return "PARTIAL";
    return "NOT_EXECUTED";
  }

  // generic fallback
  if (
    evidenceStrength === "MODERATE" ||
    importance === "MAJOR" ||
    score >= 18
  ) {
    return "PARTIAL";
  }

  return "NOT_EXECUTED";
}

function domainFinalState(events = [], oldState = "") {
  const states = events.map((e) => up(e?.status));

  if (states.includes("EXECUTED")) return "EXECUTED";
  if (states.includes("PARTIAL")) return "PARTIAL";
  if (states.includes("BLOCKED")) return "BLOCKED";
  if (states.includes("BROKEN")) return "BROKEN";
  if (states.includes("NOT_EXECUTED")) return "NOT_EXECUTED";

  return up(oldState) || "UNKNOWN";
}

export function runEventFinalizer(domains = []) {
  return (Array.isArray(domains) ? domains : []).map((domain) => {
    const events = Array.isArray(domain?.events) ? domain.events : [];

    const finalizedEvents = events.map((event) => {
      const status = classifyEvent(domain, event);

      return {
        ...event,
        status,
        trigger_phase: triggerPhase(status),
        impact_summary: impactSummary(status),
        carryover_to_present:
          event?.carryover_to_present === "YES" ||
          status === "EXECUTED" ||
          status === "PARTIAL"
            ? "YES"
            : "NO"
      };
    });

    return {
      ...domain,
      events: finalizedEvents,
      final_state: domainFinalState(finalizedEvents, domain?.final_state)
    };
  });
}