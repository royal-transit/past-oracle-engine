// lib/event-finalizer.js
// FULL REPLACEMENT — UNIVERSAL_PAST_EVENT_FINALIZER_V7
// NAME_ONLY = elite probabilistic locked pattern, not executed
// FULL_BIRTH = high / very-high probability allowed
// EXECUTED = only DIRECT / DIRECT_FACT / FACT_ANCHORED / explicit anchored evidence

function str(v) {
  return v == null ? "" : String(v).trim();
}

function up(v) {
  return str(v).toUpperCase();
}

function low(v) {
  return str(v).toLowerCase();
}

function safeArray(v) {
  return Array.isArray(v) ? v : [];
}

function round2(n) {
  return Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;
}

function normalizeYear(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function detectMode(domain) {
  const oracle = up(domain?.oracle_mode);

  const isFullBirth =
    oracle === "FULL_BIRTH_MAX_FORENSIC_MODE" ||
    domain?.exact_timeline_allowed === true ||
    domain?.execution_claim_allowed === true;

  const isReducedDob =
    oracle === "DOB_REDUCED_FORENSIC_PATTERN_MODE";

  const isNameOnly =
    oracle === "NAME_ONLY_STRONG_PATTERN_MODE" ||
    oracle === "NAME_CONTEXT_STRONG_PATTERN_MODE" ||
    domain?.pattern_mode_active === true;

  return {
    isFullBirth,
    isReducedDob,
    isNameOnly,
    executionAllowed: isFullBirth || isReducedDob
  };
}

function evidenceClass(event) {
  const e = up(event?.evidence_type);

  if (["DIRECT_FACT", "FACT_ANCHORED", "DIRECT"].includes(e)) return "DIRECT";
  if (["PATTERN_CONFIRMED", "REPEATED_BEHAVIOUR"].includes(e)) return "CONFIRMED_PATTERN";
  if (["LIKELY_HISTORY", "ASTRO_PATTERN", "PATTERN_ONLY"].includes(e)) return "ASTRO_PATTERN";
  if (["NAME_PATTERN"].includes(e)) return "NAME_PATTERN";

  return "UNKNOWN";
}

function executionAnchorPresent(event) {
  const type = low(event?.event_type);
  const trigger = low(event?.trigger_phase);
  const impact = low(event?.impact_summary);
  const evidence = evidenceClass(event);
  const year = normalizeYear(event?.exact_year ?? event?.date_marker);

  if (evidence === "DIRECT") return true;
  if (year && ["DIRECT", "CONFIRMED_PATTERN"].includes(evidence)) return true;

  return [
    "fact-supported",
    "direct fact",
    "year-anchored",
    "confirmed by fact",
    "event confirmed",
    "execution confirmed",
    "client confirmed",
    "history confirmed"
  ].some((x) => type.includes(x) || trigger.includes(x) || impact.includes(x));
}

function eventScore(domain, event) {
  let score = Number(domain?.normalized_score || domain?.rank_score || 0);

  const evidence = evidenceClass(event);
  const strength = low(event?.evidence_strength);
  const importance = up(event?.importance);
  const year = normalizeYear(event?.exact_year ?? event?.date_marker);
  const kp = Number(domain?.kp_weight || 0);
  const dasha = Number(domain?.dasha_weight || 0);

  if (evidence === "DIRECT") score += 8;
  if (evidence === "CONFIRMED_PATTERN") score += 5;
  if (evidence === "ASTRO_PATTERN") score += 3;
  if (evidence === "NAME_PATTERN") score += 2;

  if (strength.includes("strong")) score += 4;
  else if (strength.includes("moderate")) score += 2.5;
  else if (strength.includes("light")) score += 1;

  if (importance === "MAJOR") score += 3;
  if (year) score += 2;

  score += kp * 1.4;
  score += dasha * 1.2;

  return round2(score);
}

function finalizeEvent(domain, event) {
  const mode = detectMode(domain);
  const score = eventScore(domain, event);
  const anchor = executionAnchorPresent(event);
  const evidence = evidenceClass(event);

  const out = {
    ...event,
    score,
    date_marker: normalizeYear(event?.date_marker ?? event?.exact_year),
    exact_year: normalizeYear(event?.exact_year ?? event?.date_marker),
    finalizer_version: "UNIVERSAL_PAST_EVENT_FINALIZER_V7"
  };

  if (mode.isNameOnly) {
    return {
      ...out,
      status: score >= 10 ? "LIKELY_WINDOW" : "PATTERN_ONLY",
      trigger_phase: score >= 10 ? "elite name-pattern locked window" : "name pattern visible",
      impact_summary:
        score >= 10
          ? "elite probability window visible, but execution is not confirmed"
          : "pattern visible, execution unconfirmed",
      evidence_type: "NAME_PATTERN",
      exact_year: null,
      date_marker: null,
      exact_claim_locked: true,
      execution_claim_allowed: false
    };
  }

  if (anchor && mode.executionAllowed) {
    return {
      ...out,
      status: "EXECUTED",
      trigger_phase: out.trigger_phase || "direct execution anchor confirmed",
      impact_summary: out.impact_summary || "event execution has direct or fact-anchored support",
      exact_claim_locked: false,
      execution_claim_allowed: true
    };
  }

  if (mode.isFullBirth) {
    if (score >= 16) {
      return {
        ...out,
        status: "VERY_HIGH_PROBABILITY",
        trigger_phase: out.trigger_phase || "full-birth ultra convergence",
        impact_summary: "very high probability past signature; execution not sealed without direct anchor",
        exact_claim_locked: true,
        execution_claim_allowed: false
      };
    }

    if (score >= 11) {
      return {
        ...out,
        status: "HIGH_PROBABILITY",
        trigger_phase: out.trigger_phase || "full-birth strong convergence",
        impact_summary: "high probability past signature; execution not sealed without direct anchor",
        exact_claim_locked: true,
        execution_claim_allowed: false
      };
    }
  }

  if (mode.isReducedDob) {
    return {
      ...out,
      status: score >= 10 ? "HIGH_PROBABILITY" : "LIKELY_WINDOW",
      trigger_phase: out.trigger_phase || "reduced DOB probability window",
      impact_summary: "probability window visible; execution requires stronger anchor",
      exact_claim_locked: true,
      execution_claim_allowed: false
    };
  }

  return {
    ...out,
    status: "PATTERN_ONLY",
    trigger_phase: out.trigger_phase || "pattern visible",
    impact_summary: out.impact_summary || "pattern visible, execution unconfirmed",
    exact_claim_locked: true,
    execution_claim_allowed: false
  };
}

function finalState(events) {
  const statuses = safeArray(events).map((e) => up(e.status));

  if (statuses.includes("EXECUTED")) return "EXECUTED";
  if (statuses.includes("VERY_HIGH_PROBABILITY")) return "VERY_HIGH_PROBABILITY";
  if (statuses.includes("HIGH_PROBABILITY")) return "HIGH_PROBABILITY";
  if (statuses.includes("LIKELY_WINDOW")) return "LIKELY_WINDOW";
  if (statuses.includes("PATTERN_ONLY")) return "PATTERN_ONLY";
  if (statuses.includes("BROKEN")) return "BROKEN";
  if (statuses.includes("NOT_EXECUTED")) return "NOT_EXECUTED";

  return "UNKNOWN";
}

export function runEventFinalizer(rankedDomains = []) {
  return safeArray(rankedDomains).map((domain) => {
    const events = safeArray(domain.events).map((event) =>
      finalizeEvent(domain, event)
    );

    const state = finalState(events);

    return {
      ...domain,
      events,
      final_state: state,
      finalizer_version: "UNIVERSAL_PAST_EVENT_FINALIZER_V7",
      major_event_count: events.filter((e) => up(e.importance) === "MAJOR").length,
      minor_event_count: events.filter((e) => up(e.importance) === "MINOR").length,
      broken_event_count: events.filter((e) => up(e.status) === "BROKEN").length,
      active_event_count: events.filter((e) =>
        ["EXECUTED", "VERY_HIGH_PROBABILITY", "HIGH_PROBABILITY", "LIKELY_WINDOW", "PATTERN_ONLY"].includes(up(e.status))
      ).length,
      direct_evidence_count: events.filter((e) =>
        ["DIRECT", "DIRECT_FACT", "FACT_ANCHORED"].includes(up(e.evidence_type))
      ).length,
      pattern_evidence_count: events.filter((e) =>
        ["NAME_PATTERN", "LIKELY_HISTORY", "PATTERN_CONFIRMED", "PATTERN_ONLY"].includes(up(e.evidence_type))
      ).length
    };
  });
}