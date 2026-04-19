// UNIVERSAL EVENT FINALIZER — HARD LOCK VERSION

function normalizeStatus(status) {
  if (!status) return "UNKNOWN";
  return String(status).toUpperCase();
}

function isStrongDomain(domain) {
  const score = Number(domain?.normalized_score || domain?.rank_score || 0);
  return score >= 8;
}

function hasMajorEvent(domain) {
  return (domain?.events || []).some(e => e.importance === "MAJOR");
}

function hasCarryover(domain) {
  return (domain?.present_carryover === "YES") ||
         (domain?.events || []).some(e => e.carryover_to_present === "YES");
}

function forceFinalStatus(domain, event) {
  const score = Number(domain?.normalized_score || 0);

  // HARD LOCK RULES
  if (score >= 8 && hasMajorEvent(domain)) {
    return "EXECUTED";
  }

  if (score >= 6) {
    return "PARTIAL";
  }

  return "NOT_EXECUTED";
}

function finalizeEvent(domain, event) {
  const forced = forceFinalStatus(domain, event);

  return {
    ...event,

    // 🔴 HARD OVERRIDE
    status: forced,

    // 🔴 CLEANUP
    trigger_phase:
      forced === "EXECUTED"
        ? "event confirmed"
        : forced === "PARTIAL"
        ? "partial execution"
        : "no confirmed execution",

    impact_summary:
      forced === "EXECUTED"
        ? "event has definitively occurred"
        : forced === "PARTIAL"
        ? "event partially materialised"
        : "event not confirmed",

    carryover_to_present:
      forced === "EXECUTED" ? "YES" : "NO"
  };
}

export function runEventFinalizer(domains) {
  return (domains || []).map(domain => {
    const newEvents = (domain.events || []).map(event =>
      finalizeEvent(domain, event)
    );

    return {
      ...domain,
      events: newEvents,

      // 🔴 DOMAIN LEVEL FINAL STATE
      final_state:
        newEvents.find(e => e.status === "EXECUTED")
          ? "EXECUTED"
          : newEvents.find(e => e.status === "PARTIAL")
          ? "PARTIAL"
          : "NOT_EXECUTED"
    };
  });
}