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

    const year = normalizeYear(item.date_marker);
    if (!map.has(key) && year != null) {
      map.set(key, year);
    }
  }

  return map;
}

function backfillEventYear(domainKey, event, lookup) {
  const existingYear =
    normalizeYear(event?.date_marker) ??
    normalizeYear(event?.exact_year) ??
    normalizeYear(event?.year);

  if (existingYear != null) {
    return {
      ...event,
      date_marker: existingYear,
      exact_year: existingYear
    };
  }

  const key = [
    domainKey || "",
    event?.event_type || "",
    event?.event_number || "",
    event?.status || ""
  ].join("|");

  const fallbackYear = lookup.get(key) ?? null;

  return {
    ...event,
    date_marker: fallbackYear,
    exact_year: fallbackYear
  };
}

function exactTimeBandByDomain(domainKey) {
  if (["LEGAL", "DOCUMENT", "IMMIGRATION", "VISA"].includes(domainKey)) {
    return "09:00-13:00";
  }

  if (["MONEY", "DEBT", "GAIN", "LOSS", "BUSINESS"].includes(domainKey)) {
    return "10:00-15:00";
  }

  if (["HEALTH", "MENTAL", "DISEASE", "RECOVERY"].includes(domainKey)) {
    return "06:00-10:00";
  }

  if (["MARRIAGE", "DIVORCE", "RELATIONSHIP", "MULTIPLE_MARRIAGE"].includes(domainKey)) {
    return "16:00-22:00";
  }

  return "11:00-17:00";
}

function exactTypeBoost(domainKey, event) {
  const type = String(event?.event_type || "").toLowerCase();
  const trigger = String(event?.trigger_phase || "").toLowerCase();
  const status = String(event?.status || "").toUpperCase();
  let boost = 0;

  if (status === "BROKEN" || status === "ACTIVE" || status === "STABILISING" || status === "EXECUTED") {
    boost += 2.5;
  }

  if (["HEALTH", "MENTAL", "DISEASE", "RECOVERY"].includes(domainKey)) {
    if (
      ["surgery", "acute", "collapse", "health", "disease", "stress", "weakness", "recovery"]
        .some((x) => type.includes(x))
    ) boost += 4;

    if (
      ["strain", "imbalance", "repeat", "vulnerability", "intervention", "recovery"]
        .some((x) => trigger.includes(x))
    ) boost += 3.2;
  }

  if (["MONEY", "DEBT", "GAIN", "LOSS"].includes(domainKey)) {
    if (
      ["debt", "loss", "gain", "cash", "money", "income", "pressure"]
        .some((x) => type.includes(x))
    ) boost += 4;

    if (
      ["compression", "recovery", "gain", "loss", "financial"]
        .some((x) => trigger.includes(x))
    ) boost += 3.2;
  }

  if (["LEGAL", "DOCUMENT", "IMMIGRATION", "VISA"].includes(domainKey)) {
    if (
      ["legal", "document", "approval", "penalty", "authority", "paperwork", "court"]
        .some((x) => type.includes(x))
    ) boost += 4;

    if (
      ["approval", "paperwork", "authority", "penalty", "legal"]
        .some((x) => trigger.includes(x))
    ) boost += 3.2;
  }

  if (["MARRIAGE", "DIVORCE"].includes(domainKey)) {
    if (
      ["marriage", "divorce", "separation", "union"]
        .some((x) => type.includes(x))
    ) boost += 4;

    if (
      ["union", "break", "rupture", "continuation", "severance"]
        .some((x) => trigger.includes(x))
    ) boost += 3.2;
  }

  return boost;
}

function exactCandidateScore(domain, event) {
  const rankScore = Number(domain?.rank_score || domain?.normalized_score || 0);
  const strength = String(event?.evidence_strength || "").toLowerCase();
  const importance = String(event?.importance || "").toUpperCase();
  const carryover = String(event?.carryover_to_present || "").toUpperCase();
  const year =
    normalizeYear(event?.date_marker) ??
    normalizeYear(event?.exact_year) ??
    null;

  let score = 0;

  score += rankScore;
  score += exactTypeBoost(domain.domain_key, event);

  if (strength === "strong") score += 5;
  else if (strength === "moderate") score += 3;
  else if (strength === "light") score += 1.5;

  if (importance === "MAJOR") score += 4;
  else if (importance === "MINOR") score += 1.5;

  if (carryover === "YES") score += 1.2;
  if (year != null) score += 2.2;

  return Math.round((score + Number.EPSILON) * 100) / 100;
}

function buildExactPacketFromEvents(domain) {
  const candidates = (domain.events || [])
    .filter((e) => normalizeYear(e?.date_marker) != null || normalizeYear(e?.exact_year) != null)
    .map((e) => ({
      domain: domain.domain_label,
      domain_key: domain.domain_key,
      event_type: e.event_type,
      event_number: e.event_number ?? null,
      status: e.status,
      trigger_phase: e.trigger_phase,
      evidence_strength: e.evidence_strength,
      importance: e.importance,
      exact_date: null,
      date_marker: normalizeYear(e.date_marker) ?? normalizeYear(e.exact_year) ?? null,
      exact_time_band: exactTimeBandByDomain(domain.domain_key),
      score: exactCandidateScore(domain, e)
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;

      const by = normalizeYear(b.date_marker) ?? 0;
      const ay = normalizeYear(a.date_marker) ?? 0;
      if (by !== ay) return by - ay;

      const bn = Number(b.event_number || 0);
      const an = Number(a.event_number || 0);
      return bn - an;
    });

  if (!candidates.length) {
    return {
      ...domain,
      primary_exact_event: null,
      alternative_exact_events: [],
      exact_time_band: domain.exact_time_band || exactTimeBandByDomain(domain.domain_key)
    };
  }

  return {
    ...domain,
    primary_exact_event: candidates[0],
    alternative_exact_events: candidates.slice(1, 3),
    exact_time_band: candidates[0].exact_time_band
  };
}

function shouldRebuildExact(domainKey) {
  return [
    "MARRIAGE",
    "DIVORCE",
    "FOREIGN",
    "SETTLEMENT",
    "HEALTH",
    "MENTAL",
    "DISEASE",
    "RECOVERY",
    "MONEY",
    "DEBT",
    "GAIN",
    "LOSS",
    "LEGAL",
    "DOCUMENT",
    "IMMIGRATION",
    "PROPERTY",
    "CAREER",
    "BUSINESS",
    "JOB"
  ].includes(domainKey);
}

function patchAndRebuildRankedDomains(ranked_domains, master_timeline) {
  const lookup = makeTimelineLookup(master_timeline);

  return (ranked_domains || []).map((domain) => {
    const patchedEvents = (domain.events || []).map((event) =>
      backfillEventYear(domain.domain_key, event, lookup)
    );

    const baseDomain = {
      ...domain,
      events: patchedEvents
    };

    if (!shouldRebuildExact(domain.domain_key)) {
      return {
        ...baseDomain,
        primary_exact_event: null,
        alternative_exact_events: [],
        exact_time_band: domain.exact_time_band || null
      };
    }

    return buildExactPacketFromEvents(baseDomain);
  });
}

function buildExactDomainSummary(ranked_domains) {
  return (ranked_domains || [])
    .filter((d) => d.exact_resolver_active)
    .filter((d) => d.primary_exact_event)
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
  const patched_ranked_domains = patchAndRebuildRankedDomains(
    ranked_domains,
    master_timeline
  );

  const marriageDomain = patched_ranked_domains.find((d) => d.domain_key === "MARRIAGE");
  const foreignDomain = patched_ranked_domains.find((d) => d.domain_key === "FOREIGN");
  const settlementDomain = patched_ranked_domains.find((d) => d.domain_key === "SETTLEMENT");

  const marriageEvents =
    marriageDomain?.events?.filter((e) => e.event_type === "marriage event") || [];

  const activeMarriage = getLastByStatus(marriageEvents, ["STABILISING", "ACTIVE"]);

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

  const lokkotha_summary = {
    text:
      `${question_profile.primary_domain.toLowerCase()}-এর হিসাব সোজা পথে মেটে না; ` +
      `বড় চিহ্ন ছিল ${event_summary.total_major_events}, ` +
      `ভাঙা ছিল ${event_summary.total_broken_events}, ` +
      `আর তার ঢেউ ` +
      `${carryover.present_carryover_detected ? "এখনও টিকে আছে" : "ধীরে নেমে গেছে"}.`
  };

  const exact_domain_summary = buildExactDomainSummary(patched_ranked_domains);

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