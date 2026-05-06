// lib/event-finalizer.js
// FULL REPLACEMENT — SAFE PAST EVENT FINALIZER V7
// Strong name-only timing allowed.
// Name-only/pattern evidence never becomes EXECUTED.

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
    case "LIKELY_WINDOW":
      return "strong likely timing window";
    case "PATTERN_ONLY":
      return "pattern visible but execution locked";
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
    case "LIKELY_WINDOW":
      return "strong probability window visible, but execution is not confirmed";
    case "PATTERN_ONLY":
      return "pattern visible, but no executed event can be claimed";
    default:
      return "event not confirmed";
  }
}

function classifyEvent(domain, event) {
  const evidenceType = up(event?.evidence_type);
  const evidenceStrength = up(event?.evidence_strength);

  const score =
    num(event?.score, null) ??
    num(event?.normalized_score, null) ??
    num(domain?.normalized_score, 0);

  if (["NAME_PATTERN", "LIKELY_HISTORY", "PATTERN_ONLY", "UNKNOWN"].includes(evidenceType)) {
    return score >= 5 ? "LIKELY_WINDOW" : "PATTERN_ONLY";
  }

  if (["FACT_ANCHORED", "DIRECT", "DIRECT_FACT", "PATTERN_CONFIRMED"].includes(evidenceType)) {
    if (evidenceStrength === "STRONG" || score >= 8) return "EXECUTED";
    return "PARTIAL";
  }

  return "NOT_EXECUTED";
}

function domainFinalState(events = [], oldState = "") {
  const states = events.map((e) => up(e?.status));

  if (states.includes("EXECUTED")) return "EXECUTED";
  if (states.includes("PARTIAL")) return "PARTIAL";
  if (states.includes("LIKELY_WINDOW")) return "LIKELY_WINDOW";
  if (states.includes("PATTERN_ONLY")) return "PATTERN_ONLY";
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