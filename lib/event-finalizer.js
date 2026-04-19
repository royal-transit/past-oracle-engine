// lib/event-finalizer.js
// UNIVERSAL EVENT FINALIZER — BALANCED ASTRO LOCK VERSION

function toNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function norm(v) {
  return String(v || "").trim().toUpperCase();
}

function pickBestStatus(event, domain) {
  const eventStatus = norm(event?.status);
  const domainStatus = norm(domain?.final_state);
  const evidenceType = norm(event?.evidence_type);
  const evidenceStrength = norm(event?.evidence_strength);
  const importance = norm(event?.importance);

  const score =
    toNum(event?.score, null) ??
    toNum(event?.normalized_score, null) ??
    toNum(domain?.normalized_score, 0);

  // 1) direct backend confirmed execution থাকলে সেটা রাখা
  if (eventStatus === "EXECUTED") return "EXECUTED";
  if (eventStatus === "BROKEN") return "BROKEN";
  if (eventStatus === "BLOCKED") return "BLOCKED";

  // 2) strong evidence + major গুরুত্ব + direct/pattern confirmed
  if (
    importance === "MAJOR" &&
    (evidenceType === "DIRECT" || evidenceType === "PATTERN_CONFIRMED") &&
    (evidenceStrength === "STRONG" || score >= 30)
  ) {
    return "EXECUTED";
  }

  // 3) partial / moderate execution
  if (
    eventStatus === "PARTIAL" ||
    eventStatus === "BUILDING" ||
    eventStatus === "OPENING" ||
    eventStatus === "STABILISING"
  ) {
    return "PARTIAL";
  }

  if (
    evidenceStrength === "MODERATE" ||
    evidenceType === "LIKELY_HISTORY" ||
    (score >= 18 && importance === "MAJOR")
  ) {
    return "PARTIAL";
  }

  // 4) domain already blocked/broken হলে weak event-এ সেটা carry করা
  if (domainStatus === "BROKEN") return "BROKEN";
  if (domainStatus === "BLOCKED") return "BLOCKED";

  // 5) weak pattern / low score / weak evidence
  if (
    eventStatus === "NOT_EXECUTED" ||
    evidenceType === "NAME_PATTERN" ||
    evidenceStrength === "WEAK" ||
    score < 18
  ) {
    return "NOT_EXECUTED";
  }

  // fallback
  return eventStatus || "UNKNOWN";
}

function buildTriggerPhase(status) {
  switch (status) {
    case "EXECUTED":
      return "event confirmed";
    case "PARTIAL":
      return "partial execution";
    case "BLOCKED":
      return "blocked execution";
    case "BROKEN":
      return "broken execution";
    case "NOT_EXECUTED":
      return "no confirmed execution";
    default:
      return "status unresolved";
  }
}

function buildImpactSummary(status) {
  switch (status) {
    case "EXECUTED":
      return "event has definitively occurred";
    case "PARTIAL":
      return "event partially materialised";
    case "BLOCKED":
      return "event is blocked or delayed";
    case "BROKEN":
      return "event broke or did not hold";
    case "NOT_EXECUTED":
      return "event not confirmed";
    default:
      return "event state remains unresolved";
  }
}

function buildCarryover(status, oldValue) {
  if (oldValue === "YES" || oldValue === "NO") return oldValue;
  if (status === "EXECUTED" || status === "PARTIAL") return "YES";
  return "NO";
}

function finalizeSingleEvent(domain, event) {
  const finalStatus = pickBestStatus(event, domain);

  return {
    ...event,
    status: finalStatus,
    trigger_phase: buildTriggerPhase(finalStatus),
    impact_summary: buildImpactSummary(finalStatus),
    carryover_to_present: buildCarryover(finalStatus, event?.carryover_to_present)
  };
}

function pickDomainFinalState(events, oldDomainState) {
  const states = events.map((e) => norm(e.status));
  const oldState = norm(oldDomainState);

  if (states.includes("EXECUTED")) return "EXECUTED";
  if (states.includes("PARTIAL")) return "PARTIAL";
  if (states.includes("BLOCKED")) return "BLOCKED";
  if (states.includes("BROKEN")) return "BROKEN";
  if (states.includes("NOT_EXECUTED")) return "NOT_EXECUTED";

  return oldState || "UNKNOWN";
}

function countByStatus(events, target) {
  return events.filter((e) => norm(e.status) === target).length;
}

export function runEventFinalizer(domains) {
  return (domains || []).map((domain) => {
    const originalEvents = Array.isArray(domain?.events) ? domain.events : [];
    const finalizedEvents = originalEvents.map((event) =>
      finalizeSingleEvent(domain, event)
    );

    const finalState = pickDomainFinalState(finalizedEvents, domain?.final_state);

    return {
      ...domain,
      events: finalizedEvents,
      final_state: finalState,

      executed_event_count: countByStatus(finalizedEvents, "EXECUTED"),
      partial_event_count: countByStatus(finalizedEvents, "PARTIAL"),
      blocked_event_count: countByStatus(finalizedEvents, "BLOCKED"),
      broken_event_count: countByStatus(finalizedEvents, "BROKEN"),
      not_executed_event_count: countByStatus(finalizedEvents, "NOT_EXECUTED")
    };
  });
}