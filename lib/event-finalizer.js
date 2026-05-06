// lib/event-finalizer.js
// FULL REPLACEMENT — SAFE PAST EVENT FINALIZER V7.1
// Creates primary_exact_event for likely windows.
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
    return score >= 2.2 ? "LIKELY_WINDOW" : "PATTERN_ONLY";
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

function attachPrimaryEvent(domain, events) {
  if (domain?.primary_exact_event) return domain.primary_exact_event;
  if (!events.length) return null;

  const sorted = [...events].sort((a, b) => {
    const ai = up(a.importance) === "MAJOR" ? 0 : 1;
    const bi = up(b.importance) === "MAJOR" ? 0 : 1;
    if (ai !== bi) return ai - bi;
    return 0;
  });

  const e = sorted[0];

  return {
    ...e,
    domain: domain?.domain_label || null,
    domain_key: domain?.domain_key || null,
    score: domain?.normalized_score ?? null,
    exact_time_band: domain?.exact_time_band || e?.exact_time_band || null,
    date_marker: e?.exact_year ?? null
  };
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

    const primary = attachPrimaryEvent(domain, finalizedEvents);

    return {
      ...domain,
      events: finalizedEvents,
      final_state: domainFinalState(finalizedEvents, domain?.final_state),
      primary_exact_event: primary,
      alternative_exact_events: finalizedEvents
        .filter((e) => primary ? e !== primary : true)
        .slice(0, 3)
    };
  });
}