// lib/event-finalizer.js
// CRASH-SAFE BALANCED EVENT FINALIZER

function norm(v) {
  return String(v || "").trim().toUpperCase();
}

function toNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function chooseEventStatus(domain, event) {
  const current = norm(event?.status);
  const importance = norm(event?.importance);
  const evidenceStrength = norm(event?.evidence_strength);
  const evidenceType = norm(event?.evidence_type);
  const score = toNum(event?.score, toNum(domain?.normalized_score, 0));

  if (["EXECUTED", "PARTIAL", "NOT_EXECUTED", "BLOCKED", "BROKEN"].includes(current)) {
    return current;
  }

  if (
    importance === "MAJOR" &&
    (evidenceStrength === "STRONG" || score >= 30) &&
    ["DIRECT", "PATTERN_CONFIRMED"].includes(evidenceType)
  ) {
    return "EXECUTED";
  }

  if (
    evidenceStrength === "MODERATE" ||
    importance === "MAJOR" ||
    score >= 18
  ) {
    return "PARTIAL";
  }

  return "NOT_EXECUTED";
}

function triggerPhase(status) {
  if (status === "EXECUTED") return "event confirmed";
  if (status === "PARTIAL") return "partial execution";
  if (status === "BLOCKED") return "blocked execution";
  if (status === "BROKEN") return "broken execution";
  return "no confirmed execution";
}

function impactSummary(status) {
  if (status === "EXECUTED") return "event has definitively occurred";
  if (status === "PARTIAL") return "event partially materialised";
  if (status === "BLOCKED") return "event is blocked";
  if (status === "BROKEN") return "event broke or did not hold";
  return "event not confirmed";
}

function finalStateFromEvents(events = [], oldState = "") {
  const states = events.map((e) => norm(e?.status));

  if (states.includes("EXECUTED")) return "EXECUTED";
  if (states.includes("PARTIAL")) return "PARTIAL";
  if (states.includes("BLOCKED")) return "BLOCKED";
  if (states.includes("BROKEN")) return "BROKEN";
  if (states.includes("NOT_EXECUTED")) return "NOT_EXECUTED";

  return norm(oldState) || "UNKNOWN";
}

export function runEventFinalizer(domains = []) {
  return (Array.isArray(domains) ? domains : []).map((domain) => {
    const events = Array.isArray(domain?.events) ? domain.events : [];

    const newEvents = events.map((event) => {
      const status = chooseEventStatus(domain, event);

      return {
        ...event,
        status,
        trigger_phase: triggerPhase(status),
        impact_summary: impactSummary(status),
        carryover_to_present:
          event?.carryover_to_present ||
          (status === "EXECUTED" || status === "PARTIAL" ? "YES" : "NO")
      };
    });

    return {
      ...domain,
      events: newEvents,
      final_state: finalStateFromEvents(newEvents, domain?.final_state)
    };
  });
}