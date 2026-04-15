// api/past-oracle.js
// UNIVERSAL HARD-LOCK ORCHESTRATOR VERSION
// FULL REPLACEMENT - FINALIZER BEFORE EVIDENCE LAYER

import { buildChartCore } from "../lib/chart-core.js";
import { astroProvider } from "../lib/provider-adapter.js";
import { runIntelligenceLayer } from "../lib/layer-intelligence.js";
import { runAstroLayer, buildTimeline } from "../lib/layer-astro.js";
import { runEvidenceLayer } from "../lib/layer-evidence.js";
import { runEventFinalizer } from "../lib/event-finalizer.js";

/* =====================================
   BASIC HELPERS
===================================== */

const str = (v) => (v == null ? "" : String(v).trim());

const toNum = (v) => {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const normalizeFormat = (v) => {
  const x = str(v).toLowerCase();
  if (x === "compact") return "compact";
  if (x === "project") return "project";
  return "json";
};

function extractAllYears(text) {
  return [...String(text || "").matchAll(/\b(19|20)\d{2}\b/g)].map((m) => Number(m[0]));
}

function wordToNum(w) {
  return ({
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    ek: 1,
    ekta: 1,
    dui: 2,
    duita: 2,
    tin: 3,
    tinta: 3,
    char: 4,
    charta: 4,
    pach: 5,
    pachta: 5
  })[(w || "").toLowerCase()] ?? null;
}

function parseFlexibleCountToken(token) {
  if (!token) return null;
  if (/^\d+$/.test(token)) return Number(token);
  return wordToNum(token);
}

function hasAny(text, arr) {
  const src = String(text || "").toLowerCase();
  return arr.some((x) => src.includes(String(x).toLowerCase()));
}

/* =====================================
   FACT PARSER
===================================== */

function extractMarriageCount(text) {
  const patterns = [
    /\b(\d+|one|two|three|four|five|ek|ekta|dui|duita|tin|tinta|char|charta|pach|pachta)\s+marriages?\b/i,
    /\b(\d+|one|two|three|four|five|ek|ekta|dui|duita|tin|tinta|char|charta|pach|pachta)\s+bea\b/i,
    /\b(\d+|one|two|three|four|five|ek|ekta|dui|duita|tin|tinta|char|charta|pach|pachta)\s+biye\b/i
  ];

  for (const rx of patterns) {
    const m = String(text || "").match(rx);
    if (m) return parseFlexibleCountToken(m[1]);
  }

  return null;
}

function extractBrokenMarriageCount(text) {
  const patterns = [
    /\b(\d+|one|two|three|four|five|ek|ekta|dui|duita|tin|tinta|char|charta|pach|pachta)\s+broken\b/i,
    /\b(\d+|one|two|three|four|five|ek|ekta|dui|duita|tin|tinta|char|charta|pach|pachta)\s+divorce\b/i,
    /\b(\d+|one|two|three|four|five|ek|ekta|dui|duita|tin|tinta|char|charta|pach|pachta)\s+separation\b/i,
    /\b(\d+|one|two|three|four|five|ek|ekta|dui|duita|tin|tinta|char|charta|pach|pachta)\s+talak\b/i
  ];

  for (const rx of patterns) {
    const m = String(text || "").match(rx);
    if (m) return parseFlexibleCountToken(m[1]);
  }

  return null;
}

function extractYearNearKeyword(text, keywords) {
  const src = String(text || "");
  for (const kw of keywords) {
    const idx = src.toLowerCase().indexOf(String(kw).toLowerCase());
    if (idx === -1) continue;
    const tail = src.slice(idx, idx + 100);
    const m = tail.match(/\b(19|20)\d{2}\b/);
    if (m) return Number(m[0]);
  }
  return null;
}

function parseFactAnchors(facts, question) {
  const rawText = `${facts || ""} ${question || ""}`.trim();
  const text = rawText.toLowerCase();
  const allYears = extractAllYears(text);

  let marriageCount = extractMarriageCount(text);
  let brokenMarriageCount = extractBrokenMarriageCount(text);

  let foreignEntryYear = extractYearNearKeyword(text, [
    "uk",
    "foreign",
    "abroad",
    "came",
    "arrived",
    "entry",
    "moved",
    "visa",
    "immigration",
    "bidesh"
  ]);

  let settlementYear = extractYearNearKeyword(text, [
    "settlement",
    "settled",
    "stable",
    "stabil",
    "base",
    "permanent"
  ]);

  if (
    foreignEntryYear == null &&
    hasAny(text, ["uk", "foreign", "abroad", "came", "arrived", "entry", "moved", "visa", "immigration", "bidesh"]) &&
    allYears.length
  ) {
    foreignEntryYear = allYears[0];
  }

  if (
    settlementYear == null &&
    hasAny(text, ["settlement", "settled", "stable", "stabil", "base", "permanent"]) &&
    allYears.length >= 2
  ) {
    settlementYear = allYears[allYears.length - 1];
  }

  if (
    settlementYear != null &&
    foreignEntryYear != null &&
    settlementYear === foreignEntryYear &&
    allYears.length >= 2
  ) {
    settlementYear = allYears[allYears.length - 1];
  }

  return {
    provided: !!(facts || question),
    raw_text: text,
    marriage_count_claim: marriageCount,
    broken_marriage_claim: brokenMarriageCount,
    foreign_entry_year_claim: foreignEntryYear,
    settlement_year_claim: settlementYear,
    all_years: allYears
  };
}

function minifyDomain(d) {
  return {
    domain_key: d.domain_key,
    domain_label: d.domain_label,
    normalized_score: d.normalized_score,
    density: d.density,
    residual_impact: d.residual_impact,
    major_event_count: d.major_event_count,
    broken_event_count: d.broken_event_count,
    active_event_count: d.active_event_count,
    final_state: d.final_state || null
  };
}

/* =====================================
   MAIN HANDLER
===================================== */

export default async function handler(req, res) {
  try {
    const q = req.query || {};

    const input = {
      name: str(q.name),
      dob: str(q.dob),
      tob: str(q.tob),
      pob: str(q.pob),
      latitude: toNum(q.latitude),
      longitude: toNum(q.longitude),
      timezone_offset: str(q.timezone_offset || "+06:00"),
      question: str(q.question),
      facts: str(q.facts),
      format: normalizeFormat(q.format),
      current_datetime_iso: str(q.current_datetime_iso)
    };

    // ---------------------------------
    // STEP 0: CORE CHART / INPUT ENGINE
    // ---------------------------------
    const core = await buildChartCore(input, astroProvider);

    if (core.system_status !== "OK") {
      return res.status(400).json({
        engine_status: "PAST_ORACLE_UNIVERSAL_V3",
        system_status: "INPUT_ERROR",
        details: core
      });
    }

    // ---------------------------------
    // STEP 1: FACT PARSER
    // ---------------------------------
    const facts = parseFactAnchors(input.facts, input.question);

    // ---------------------------------
    // STEP 2: QUESTION INTELLIGENCE (initial)
    // ---------------------------------
    const stage1 = runIntelligenceLayer({
      domainResults: [],
      question: input.question
    });

    // ---------------------------------
    // STEP 3: ASTRO DOMAIN SCAN
    // ---------------------------------
    const astro = runAstroLayer({
      evidence_packet: core.evidence_packet,
      facts,
      question_profile: stage1.question_profile
    });

    // ---------------------------------
    // STEP 4: INTELLIGENCE RE-RANK ON ASTRO OUTPUT
    // ---------------------------------
    const stage2 = runIntelligenceLayer({
      domainResults: astro.domain_results,
      question: input.question
    });

    // ---------------------------------
    // STEP 5: FINALIZER FIRST
    // ---------------------------------
    const finalizedDomains = runEventFinalizer(stage2.ranked_domains);

    // ---------------------------------
    // STEP 6: TIMELINE FROM FINALIZED DOMAINS
    // ---------------------------------
    const master_timeline = buildTimeline({
      ranked_domains: finalizedDomains,
      birth_context: core.birth_context
    });

    // ---------------------------------
    // STEP 7: EVIDENCE / FORENSIC OUTPUT
    // ---------------------------------
    const evidenceLayer = runEvidenceLayer({
      input,
      facts,
      question_profile: stage2.question_profile,
      ranked_domains: finalizedDomains,
      master_timeline,
      carryover: stage2.carryover
    });

    // ---------------------------------
    // FINAL PAYLOAD
    // ---------------------------------
    const payload = {
      engine_status: "PAST_ORACLE_UNIVERSAL_V3",
      system_status: "OK",

      mode: core.mode,
      input_normalized: core.input_normalized,
      birth_context: core.birth_context,
      current_context: core.current_context,

      fact_anchor_block: facts,
      question_profile: stage2.question_profile,
      linked_domain_expansion: stage2.linked_domain_expansion,

      evidence_normalized: astro.evidence_normalized,

      top_ranked_domains: evidenceLayer.ranked_domains
        .slice(0, 12)
        .map(minifyDomain),

      domain_results: evidenceLayer.ranked_domains,
      exact_domain_summary: evidenceLayer.exact_domain_summary,

      event_summary: evidenceLayer.event_summary,
      master_timeline: evidenceLayer.master_timeline,
      current_carryover: stage2.carryover,
      validation_block: evidenceLayer.validation_block,
      forensic_verdict: evidenceLayer.forensic_verdict,
      lokkotha_summary: evidenceLayer.lokkotha_summary,
      project_paste_block: evidenceLayer.project_paste_block
    };

    if (input.format === "project") {
      return res.status(200).json({
        engine_status: "PAST_ORACLE_UNIVERSAL_V3",
        output_format: "project",
        project_paste_block: evidenceLayer.project_paste_block
      });
    }

    if (input.format === "compact") {
      return res.status(200).json({
        engine_status: "PAST_ORACLE_UNIVERSAL_V3",
        output_format: "compact",
        summary: {
          primary_domain: stage2.question_profile.primary_domain,
          total_events: evidenceLayer.event_summary.total_estimated_events,
          top_domains: evidenceLayer.ranked_domains
            .slice(0, 5)
            .map((d) => d.domain_label),

          relationship: {
            marriage_count: evidenceLayer.event_summary.relationship?.marriage_count ?? 0,
            broken_marriage_count: evidenceLayer.event_summary.relationship?.broken_marriage_count ?? 0,
            current_marriage_status: evidenceLayer.event_summary.relationship?.current_marriage_status ?? "UNKNOWN",
            latest_relationship_event_type: evidenceLayer.event_summary.relationship?.latest_relationship_event_type ?? null
          },

          work: {
            dominant_work_mode: evidenceLayer.event_summary.work?.dominant_work_mode ?? "UNKNOWN",
            education_active: evidenceLayer.event_summary.work?.education_active ?? false,
            job_active: evidenceLayer.event_summary.work?.job_active ?? false,
            business_active: evidenceLayer.event_summary.work?.business_active ?? false
          },

          foreign: {
            foreign_shift_count: evidenceLayer.event_summary.foreign?.foreign_shift_count ?? 0,
            foreign_entry_year: evidenceLayer.event_summary.foreign?.foreign_entry_year ?? null,
            settlement_year: evidenceLayer.event_summary.foreign?.settlement_year ?? null,
            foreign_process_status: evidenceLayer.event_summary.foreign?.foreign_process_status ?? null
          },

          health: evidenceLayer.event_summary.health?.health_status ?? "UNKNOWN",
          money: evidenceLayer.event_summary.money?.money_status ?? "UNKNOWN",
          conflict: evidenceLayer.event_summary.conflict?.conflict_status ?? "UNKNOWN",

          current_carryover: stage2.carryover.present_carryover_detected
        },
        exact_domain_summary: evidenceLayer.exact_domain_summary,
        verdict: evidenceLayer.forensic_verdict,
        lokkotha_summary: evidenceLayer.lokkotha_summary
      });
    }

    return res.status(200).json(payload);
  } catch (error) {
    return res.status(500).json({
      engine_status: "PAST_ORACLE_UNIVERSAL_V3",
      system_status: "ERROR",
      error_message: error instanceof Error ? error.message : "Unknown error"
    });
  }
}