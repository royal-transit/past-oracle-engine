// lib/layer-evidence.js

function getLastByStatus(events, statuses) {
  for (let i = events.length - 1; i >= 0; i -= 1) {
    if (statuses.includes(events[i].status)) return events[i];
  }
  return null;
}

export function runEvidenceLayer({
  input,
  facts,
  question_profile,
  ranked_domains,
  master_timeline,
  carryover
}) {
  const marriageDomain = ranked_domains.find((d) => d.domain_key === "MARRIAGE");
  const foreignDomain = ranked_domains.find((d) => d.domain_key === "FOREIGN");
  const settlementDomain = ranked_domains.find((d) => d.domain_key === "SETTLEMENT");

  const marriageEvents =
    marriageDomain?.events?.filter((e) => e.event_type === "marriage event") || [];

  const activeMarriage = getLastByStatus(marriageEvents, ["STABILISING", "ACTIVE"]);

  // =========================
  // EVENT SUMMARY
  // =========================
  const event_summary = {
    total_estimated_events: ranked_domains.reduce((a, b) => a + b.events.length, 0),
    total_major_events: ranked_domains.reduce((a, b) => a + b.major_event_count, 0),
    total_minor_events: ranked_domains.reduce((a, b) => a + b.minor_event_count, 0),
    total_broken_events: ranked_domains.reduce((a, b) => a + b.broken_event_count, 0),
    total_active_events: ranked_domains.reduce((a, b) => a + b.active_event_count, 0),

    marriage_count: marriageEvents.length,
    broken_marriage_count: marriageEvents.filter((e) => e.status === "BROKEN").length,
    current_marriage_status:
      activeMarriage?.status ||
      marriageEvents[marriageEvents.length - 1]?.status ||
      "UNKNOWN",

    foreign_shift_count: foreignDomain?.events?.length || 0,
    foreign_entry_year:
      foreignDomain?.events?.find((e) => e.event_type === "foreign entry event")
        ?.exact_year ?? null,

    settlement_year:
      settlementDomain?.events?.find((e) => e.event_type === "settlement event")
        ?.exact_year ?? null,

    top_5_domains: ranked_domains.slice(0, 5).map((d) => d.domain_label)
  };

  // =========================
  // VALIDATION BLOCK
  // =========================
  const validation_block = {
    reality_validation_active: facts.provided,

    marriage_fact_match:
      facts.marriage_count_claim == null
        ? "NOT_PROVIDED"
        : facts.marriage_count_claim === event_summary.marriage_count
          ? "EXACT"
          : "CONFLICT",

    broken_marriage_fact_match:
      facts.broken_marriage_claim == null
        ? "NOT_PROVIDED"
        : facts.broken_marriage_claim === event_summary.broken_marriage_count
          ? "EXACT"
          : "CONFLICT",

    foreign_fact_match:
      facts.foreign_entry_year_claim == null
        ? "NOT_PROVIDED"
        : facts.foreign_entry_year_claim === event_summary.foreign_entry_year
          ? "EXACT"
          : "CONFLICT",

    settlement_fact_match:
      facts.settlement_year_claim == null
        ? "NOT_PROVIDED"
        : facts.settlement_year_claim === event_summary.settlement_year
          ? "EXACT"
          : "CONFLICT"
  };

  // =========================
  // FORENSIC VERDICT
  // =========================
  const forensic_verdict = {
    forensic_direction:
      `${question_profile.primary_domain} scan shows ` +
      `${event_summary.total_major_events} major signals, ` +
      `${event_summary.total_broken_events} broken signatures, and ` +
      `${carryover.present_carryover_detected ? "active residue" : "limited residue"}.`,

    validation_state:
      validation_block.marriage_fact_match === "CONFLICT" ||
      validation_block.broken_marriage_fact_match === "CONFLICT" ||
      validation_block.foreign_fact_match === "CONFLICT" ||
      validation_block.settlement_fact_match === "CONFLICT"
        ? "CONFLICT_PRESENT"
        : "STABLE"
  };

  // =========================
  // LOKKOTHA SUMMARY
  // =========================
  const lokkotha_summary = {
    text:
      `${question_profile.primary_domain.toLowerCase()}-এর হিসাব সোজা পথে মেটে না; ` +
      `বড় চিহ্ন ছিল ${event_summary.total_major_events}, ` +
      `ভাঙা ছিল ${event_summary.total_broken_events}, ` +
      `আর তার ঢেউ ` +
      `${carryover.present_carryover_detected ? "এখনও টিকে আছে" : "ধীরে নেমে গেছে"}.`
  };

  // =========================
  // PROJECT PASTE BLOCK
  // =========================
  const project_paste_block = [
    "PAST UNIVERSAL FORENSIC NANO BLOCK",
    `Subject: ${input.name || "UNKNOWN"}`,
    `Primary Domain: ${question_profile.primary_domain}`,
    `Top Domains: ${ranked_domains.slice(0, 6).map((d) => d.domain_label).join(" | ")}`,

    `Total Estimated Events: ${event_summary.total_estimated_events}`,
    `Total Major Events: ${event_summary.total_major_events}`,
    `Total Broken Events: ${event_summary.total_broken_events}`,

    `Marriage Count: ${event_summary.marriage_count}`,
    `Broken Marriage Count: ${event_summary.broken_marriage_count}`,
    `Current Marriage Status: ${event_summary.current_marriage_status}`,

    `Foreign Shift Count: ${event_summary.foreign_shift_count}`,
    `Foreign Entry Year: ${event_summary.foreign_entry_year ?? "UNKNOWN"}`,
    `Settlement Year: ${event_summary.settlement_year ?? "UNKNOWN"}`,

    `Carryover Present: ${carryover.present_carryover_detected ? "YES" : "NO"}`,

    `Marriage Validation: ${validation_block.marriage_fact_match}`,
    `Broken Marriage Validation: ${validation_block.broken_marriage_fact_match}`,
    `Foreign Validation: ${validation_block.foreign_fact_match}`,
    `Settlement Validation: ${validation_block.settlement_fact_match}`,

    `Direction: ${forensic_verdict.forensic_direction}`,
    `Lokkotha: ${lokkotha_summary.text}`,

    "Timeline:",
    ...master_timeline.slice(0, 16).map(
      (e) =>
        `${e.domain} | #${e.event_number} | ${e.event_type} | ${e.status} | ${e.date_marker ?? "UNDATED"}`
    ),

    "PAST UNIVERSAL FORENSIC NANO BLOCK END"
  ].join("\n");

  return {
    event_summary,
    validation_block,
    forensic_verdict,
    lokkotha_summary,
    project_paste_block
  };
}