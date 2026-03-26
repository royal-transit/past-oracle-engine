// lib/layer-evidence.js

function getLastByStatus(events, statuses) {
  for (let i = events.length - 1; i >= 0; i -= 1) {
    if (statuses.includes(events[i].status)) return events[i];
  }
  return null;
}

function normalizeYear(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function makeTimelineLookup(master_timeline) {
  const map = new Map();

  for (const item of master_timeline || []) {
    const key = [
      item.domain_key || "",
      item.event_type || "",
      item.event_number || "",
      item.status || ""
    ].join("|");

    if (!map.has(key) && normalizeYear(item.date_marker) != null) {
      map.set(key, normalizeYear(item.date_marker));
    }
  }

  return map;
}

function normalizeExactEventPacket(packet, fallbackEvent = null) {
  if (!packet) return null;

  const directYear =
    normalizeYear(packet.date_marker) ??
    normalizeYear(packet.exact_year) ??
    normalizeYear(packet.year);

  const fallbackYear =
    normalizeYear(fallbackEvent?.date_marker) ??
    normalizeYear(fallbackEvent?.exact_year) ??
    normalizeYear(fallbackEvent?.year);

  return {
    ...packet,
    date_marker: directYear ?? fallbackYear ?? null
  };
}

function attachBackfilledEventsToDomain(domain, lookup) {
  const patchedEvents = (domain.events || []).map((event) => {
    const existingYear =
      normalizeYear(event.date_marker) ??
      normalizeYear(event.exact_year) ??
      normalizeYear(event.year);

    if (existingYear != null) {
      return {
        ...event,
        date_marker: existingYear,
        exact_year: existingYear
      };
    }

    const key = [
      domain.domain_key || "",
      event.event_type || "",
      event.event_number || "",
      event.status || ""
    ].join("|");

    const fallbackYear = lookup.get(key) ?? null;

    return {
      ...event,
      date_marker: fallbackYear,
      exact_year: fallbackYear
    };
  });

  const patchedPrimary = domain.primary_exact_event
    ? (() => {
        const matched = patchedEvents.find((e) => {
          const packetYear = normalizeYear(domain.primary_exact_event.date_marker);
          if (packetYear != null) {
            return (
              e.event_type === domain.primary_exact_event.event_type &&
              e.status === domain.primary_exact_event.status &&
              normalizeYear(e.date_marker) === packetYear
            );
          }

          return (
            e.event_type === domain.primary_exact_event.event_type &&
            e.status === domain.primary_exact_event.status
          );
        });

        return normalizeExactEventPacket(domain.primary_exact_event, matched);
      })()
    : null;

  const usedAltKeys = new Set();

  const patchedAlternatives = (domain.alternative_exact_events || []).map((alt) => {
    const directYear = normalizeYear(alt.date_marker);

    let matched = null;

    if (directYear != null) {
      matched = patchedEvents.find((e) => {
        const key = [
          e.event_type || "",
          e.status || "",
          normalizeYear(e.date_marker) || ""
        ].join("|");

        if (usedAltKeys.has(key)) return false;

        return (
          e.event_type === alt.event_type &&
          e.status === alt.status &&
          normalizeYear(e.date_marker) === directYear
        );
      });
    }

    if (!matched) {
      matched = patchedEvents.find((e) => {
        const key = [
          e.event_type || "",
          e.status || "",
          normalizeYear(e.date_marker) || "",
          e.event_number || ""
        ].join("|");

        if (usedAltKeys.has(key)) return false;

        return (
          e.event_type === alt.event_type &&
          e.status === alt.status
        );
      });
    }

    if (matched) {
      const usedKey = [
        matched.event_type || "",
        matched.status || "",
        normalizeYear(matched.date_marker) || "",
        matched.event_number || ""
      ].join("|");

      usedAltKeys.add(usedKey);
    }

    return normalizeExactEventPacket(alt, matched);
  });

  return {
    ...domain,
    events: patchedEvents,
    primary_exact_event: patchedPrimary,
    alternative_exact_events: patchedAlternatives
  };
}

function backfillRankedDomainsWithTimelineDates(ranked_domains, master_timeline) {
  const lookup = makeTimelineLookup(master_timeline);

  return (ranked_domains || []).map((domain) =>
    attachBackfilledEventsToDomain(domain, lookup)
  );
}

function buildExactDomainSummary(ranked_domains) {
  return (ranked_domains || [])
    .filter((d) => d.exact_resolver_active)
    .filter(
      (d) =>
        d.primary_exact_event ||
        (d.alternative_exact_events && d.alternative_exact_events.length > 0)
    )
    .slice(0, 12)
    .map((d) => ({
      domain_key: d.domain_key,
      domain_label: d.domain_label,
      exact_time_band: d.exact_time_band || null,
      primary_exact_event: d.primary_exact_event || null,
      alternative_exact_events: d.alternative_exact_events || []
    }));
}

export function runEvidenceLayer({
  input,
  facts,
  question_profile,
  ranked_domains,
  master_timeline,
  carryover
}) {
  const patched_ranked_domains = backfillRankedDomainsWithTimelineDates(
    ranked_domains,
    master_timeline
  );

  const marriageDomain = patched_ranked_domains.find((d) => d.domain_key === "MARRIAGE");
  const foreignDomain = patched_ranked_domains.find((d) => d.domain_key === "FOREIGN");
  const settlementDomain = patched_ranked_domains.find((d) => d.domain_key === "SETTLEMENT");

  const marriageEvents =
    marriageDomain?.events?.filter((e) => e.event_type === "marriage event") || [];

  const activeMarriage = getLastByStatus(marriageEvents, ["STABILISING", "ACTIVE"]);

  // =========================
  // EVENT SUMMARY
  // =========================
  const event_summary = {
    total_estimated_events: patched_ranked_domains.reduce((a, b) => a + (b.events?.length || 0), 0),
    total_major_events: patched_ranked_domains.reduce((a, b) => a + (b.major_event_count || 0), 0),
    total_minor_events: patched_ranked_domains.reduce((a, b) => a + (b.minor_event_count || 0), 0),
    total_broken_events: patched_ranked_domains.reduce((a, b) => a + (b.broken_event_count || 0), 0),
    total_active_events: patched_ranked_domains.reduce((a, b) => a + (b.active_event_count || 0), 0),

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

    top_5_domains: patched_ranked_domains.slice(0, 5).map((d) => d.domain_label)
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
  // EXACT DOMAIN SUMMARY
  // =========================
  const exact_domain_summary = buildExactDomainSummary(patched_ranked_domains);

  // =========================
  // PROJECT PASTE BLOCK
  // =========================
  const project_paste_block = [
    "PAST UNIVERSAL FORENSIC NANO BLOCK",
    `Subject: ${input.name || "UNKNOWN"}`,
    `Primary Domain: ${question_profile.primary_domain}`,
    `Top Domains: ${patched_ranked_domains.slice(0, 6).map((d) => d.domain_label).join(" | ")}`,

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
    ranked_domains: patched_ranked_domains,
    exact_domain_summary,
    event_summary,
    validation_block,
    forensic_verdict,
    lokkotha_summary,
    project_paste_block
  };
}