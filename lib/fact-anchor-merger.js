// lib/fact-anchor-merger.js
// FULL CODE — FACT ANCHOR MERGER V1
// Purpose:
// - Merge user factual anchors with astro/timeline candidates
// - DIRECT_FACT only when fact year matches domain/event
// - Conflict detection when fact contradicts candidate window
// - No fact = keep FORENSIC_EXECUTED_CANDIDATE / HIGH_PROBABILITY

const VERSION = "FACT_ANCHOR_MERGER_V1";

function up(v) {
  return String(v || "").trim().toUpperCase();
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function safeArray(v) {
  return Array.isArray(v) ? v : [];
}

function clone(v) {
  return JSON.parse(JSON.stringify(v || {}));
}

function yearInsideWindow(year, window) {
  const y = num(year);
  if (!y || !Array.isArray(window) || window.length < 2) return false;
  return y >= Number(window[0]) && y <= Number(window[1]);
}

function factYearForDomain(domainKey, facts = {}) {
  const k = up(domainKey);

  if (["FOREIGN", "IMMIGRATION", "VISA"].includes(k)) {
    return (
      facts.foreign_entry_year_claim ||
      facts.student_visa_entry_year_claim ||
      null
    );
  }

  if (k === "SETTLEMENT") {
    return (
      facts.settlement_year_claim ||
      facts.settlement_applied_year_claim ||
      facts.route_shift_year_claim ||
      null
    );
  }

  if (k === "LEGAL" || k === "DOCUMENT") {
    return (
      facts.appeal_year_claim ||
      facts.settlement_refusal_year_claim ||
      facts.settlement_applied_year_claim ||
      null
    );
  }

  if (k === "JOB" || k === "CAREER") {
    return facts.job_start_year_claim || null;
  }

  if (k === "BUSINESS") {
    return facts.business_start_year_claim || null;
  }

  if (k === "EDUCATION") {
    return facts.study_start_year_claim || null;
  }

  if (["PROPERTY", "HOME", "VEHICLE"].includes(k)) {
    return facts.property_year_claim || null;
  }

  if (["MONEY", "DEBT"].includes(k)) {
    return facts.debt_year_claim || null;
  }

  if (["MARRIAGE", "PARTNERSHIP", "LOVE"].includes(k)) {
    return facts.marriage_year_claim || null;
  }

  if (["DIVORCE", "MULTIPLE_MARRIAGE"].includes(k)) {
    return facts.divorce_year_claim || facts.broken_marriage_year_claim || null;
  }

  return null;
}

function factCountMatchesDomain(domainKey, facts = {}) {
  const k = up(domainKey);

  if (k === "MARRIAGE" && facts.marriage_count_claim != null) return true;
  if (k === "DIVORCE" && facts.broken_marriage_count != null) return true;
  if (k === "MULTIPLE_MARRIAGE" && Number(facts.marriage_count_claim || 0) >= 2) return true;

  return false;
}

function classifyMerge({ domain, event, factYear, facts }) {
  const domainKey = up(domain.domain_key);
  const year = num(factYear);

  const candidateWindow =
    event.likely_year_window ||
    event.broad_year_window ||
    null;

  const primaryYear = num(event.primary_year);
  const secondaryYears = safeArray(event.secondary_years).map(Number).filter(Number.isFinite);

  const countMatch = factCountMatchesDomain(domainKey, facts);

  if (!year && countMatch) {
    return {
      merge_status: "FACT_COUNT_ANCHORED",
      exact_year: null,
      evidence_type: "FACT_ANCHORED",
      status: "EXECUTED",
      confidence: "MEDIUM_HIGH",
      note: "Fact count supports domain execution, but no exact year was provided."
    };
  }

  if (!year) {
    return {
      merge_status: "NO_FACT_ANCHOR",
      exact_year: null,
      evidence_type: event.evidence_type,
      status: event.status,
      confidence: event.confidence_label || "ASTRO_FORENSIC",
      note: "No factual year supplied; keeping astro-forensic candidate state."
    };
  }

  if (candidateWindow && yearInsideWindow(year, candidateWindow)) {
    return {
      merge_status: "FACT_MATCHED_WINDOW",
      exact_year: year,
      evidence_type: "DIRECT_FACT",
      status: "EXECUTED",
      confidence: "HIGH_FACT_ANCHORED",
      note: "Fact year matches candidate window."
    };
  }

  if (primaryYear && Math.abs(year - primaryYear) <= 1) {
    return {
      merge_status: "FACT_MATCHED_PRIME_YEAR",
      exact_year: year,
      evidence_type: "DIRECT_FACT",
      status: "EXECUTED",
      confidence: "HIGH_FACT_ANCHORED",
      note: "Fact year matches prime-year candidate."
    };
  }

  if (secondaryYears.includes(year)) {
    return {
      merge_status: "FACT_MATCHED_SECONDARY_YEAR",
      exact_year: year,
      evidence_type: "DIRECT_FACT",
      status: "EXECUTED",
      confidence: "MEDIUM_HIGH_FACT_ANCHORED",
      note: "Fact year matches secondary candidate year."
    };
  }

  return {
    merge_status: "FACT_CONFLICT_WITH_ASTRO_WINDOW",
    exact_year: year,
    evidence_type: "FACT_CONFLICT",
    status: "FACT_CONFLICT",
    confidence: "CONFLICT_REVIEW_REQUIRED",
    note: "Fact year exists but does not match astro/timeline candidate window."
  };
}

function mergeEvent(domain, event, facts) {
  const e = clone(event);
  const factYear = factYearForDomain(domain.domain_key, facts);
  const merge = classifyMerge({ domain, event: e, factYear, facts });

  e.fact_anchor_merge = {
    version: VERSION,
    domain_key: domain.domain_key,
    fact_year_used: factYear || null,
    merge_status: merge.merge_status,
    note: merge.note
  };

  if (merge.merge_status === "NO_FACT_ANCHOR") {
    e.fact_anchor_version = VERSION;
    return e;
  }

  if (merge.merge_status === "FACT_CONFLICT_WITH_ASTRO_WINDOW") {
    e.status = "FACT_CONFLICT";
    e.evidence_type = "FACT_CONFLICT";
    e.fact_conflict_year = merge.exact_year;
    e.execution_claim_allowed = false;
    e.exact_claim_locked = true;
    e.confidence_label = merge.confidence;
    e.fact_anchor_version = VERSION;
    return e;
  }

  e.status = merge.status;
  e.evidence_type = merge.evidence_type;
  e.exact_year = merge.exact_year;
  e.date_marker = merge.exact_year;
  e.execution_claim_allowed = true;
  e.exact_claim_locked = false;
  e.confidence_label = merge.confidence;
  e.carryover_to_present = "YES";
  e.fact_anchor_version = VERSION;

  return e;
}

function finalStateFromEvents(events, oldState = "UNKNOWN") {
  const statuses = safeArray(events).map((e) => up(e.status));

  if (statuses.includes("EXECUTED")) return "EXECUTED";
  if (statuses.includes("FACT_CONFLICT")) return "FACT_CONFLICT";
  if (statuses.includes("FORENSIC_EXECUTED_CANDIDATE")) return "FORENSIC_EXECUTED_CANDIDATE";
  if (statuses.includes("VERY_HIGH_PROBABILITY")) return "VERY_HIGH_PROBABILITY";
  if (statuses.includes("HIGH_PROBABILITY")) return "HIGH_PROBABILITY";
  if (statuses.includes("LIKELY_WINDOW")) return "LIKELY_WINDOW";
  if (statuses.includes("PATTERN_ONLY")) return "PATTERN_ONLY";

  return up(oldState) || "UNKNOWN";
}

export function runFactAnchorMerger({
  ranked_domains = [],
  facts = {}
}) {
  const merged_domains = safeArray(ranked_domains).map((domain) => {
    const events = safeArray(domain.events).map((event) =>
      mergeEvent(domain, event, facts)
    );

    const directCount = events.filter((e) =>
      ["DIRECT_FACT", "FACT_ANCHORED"].includes(up(e.evidence_type))
    ).length;

    const conflictCount = events.filter((e) =>
      up(e.status) === "FACT_CONFLICT" || up(e.evidence_type) === "FACT_CONFLICT"
    ).length;

    return {
      ...domain,
      events,
      final_state: finalStateFromEvents(events, domain.final_state),
      fact_anchor_merge_active: true,
      fact_anchor_version: VERSION,
      direct_evidence_count: directCount,
      fact_conflict_count: conflictCount,
      execution_claim_allowed: directCount > 0
    };
  });

  const fact_anchor_summary = {
    version: VERSION,
    total_domains: merged_domains.length,
    direct_fact_domains: merged_domains.filter((d) => Number(d.direct_evidence_count || 0) > 0).length,
    conflict_domains: merged_domains.filter((d) => Number(d.fact_conflict_count || 0) > 0).length,
    executed_domains: merged_domains.filter((d) => up(d.final_state) === "EXECUTED").length
  };

  return {
    fact_anchor_merge_version: VERSION,
    fact_anchor_summary,
    merged_domains
  };
}