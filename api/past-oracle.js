// api/past-oracle.js
// FULL REPLACEMENT — UNIVERSAL_PAST_NANO_SCANNER_V8.5
// Fix:
// - Strong fact parser: no cross-domain year contamination
// - entered uk 2009 => foreign_entry_year_claim = 2009
// - love 2014 => love_year_claim = 2014
// - study started 2007 => study_start_year_claim = 2007
// - Pipeline includes TimelineCollapser + FactAnchorMerger

import { buildChartCore } from "../lib/chart-core.js";
import { astroProvider } from "../lib/provider-adapter.js";
import { runIntelligenceLayer } from "../lib/layer-intelligence.js";
import { runAstroLayer, buildTimeline } from "../lib/layer-astro.js";
import { runEvidenceLayer } from "../lib/layer-evidence.js";
import { runEventFinalizer } from "../lib/event-finalizer.js";
import { runValidationLayer } from "../lib/layer-validation.js";
import { runTimelineCollapser } from "../lib/timeline-collapser.js";
import { runFactAnchorMerger } from "../lib/fact-anchor-merger.js";
import { buildIdentityPacket } from "../lib/identity-packet.js";
import { correctIdentityPacket } from "../lib/domain-corrector.js";

const ENGINE_STATUS = "UNIVERSAL_PAST_NANO_SCANNER_V8.5";

function str(v) {
  return v == null ? "" : String(v).trim();
}

function toNum(v) {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function normalizeFormat(v) {
  const x = str(v).toLowerCase();
  if (x === "compact") return "compact";
  if (x === "project") return "project";
  return "json";
}

function safeArray(v) {
  return Array.isArray(v) ? v : [];
}

function extractAllYears(text) {
  return [...String(text || "").matchAll(/\b(19|20)\d{2}\b/g)].map((m) => Number(m[0]));
}

function hasAny(text, arr) {
  const src = String(text || "").toLowerCase();
  return arr.some((x) => src.includes(String(x).toLowerCase()));
}

function splitFactClauses(text) {
  return String(text || "")
    .replace(/\band then\b/gi, ",")
    .replace(/\bthen\b/gi, ",")
    .replace(/\bafter that\b/gi, ",")
    .replace(/\s+(?=(love|romance|relationship|entered uk|came to uk|arrived in uk|study started|started study|student visa|visa|marriage|married|divorce|separation|settlement|ilr|appeal|job started|business started|property|debt|mental|health)\b)/gi, ",")
    .split(/[,\n;|]+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function firstYearInText(text) {
  const m = String(text || "").match(/\b(19|20)\d{2}\b/);
  return m ? Number(m[0]) : null;
}

function escapeRx(s) {
  return String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function yearNear(src, keywords) {
  const text = String(src || "").toLowerCase();
  const clauses = splitFactClauses(text);

  for (const clause of clauses) {
    if (!hasAny(clause, keywords)) continue;
    const y = firstYearInText(clause);
    if (y != null) return y;
  }

  for (const kw of keywords) {
    const rx = new RegExp(`${escapeRx(kw)}\\s+(?:in\\s+|on\\s+|at\\s+)?((?:19|20)\\d{2})`, "i");
    const m = text.match(rx);
    if (m) return Number(m[1]);
  }

  return null;
}

function parseFlexibleCountToken(token) {
  const map = {
    one: 1, two: 2, three: 3, four: 4, five: 5,
    ek: 1, ekta: 1, dui: 2, duita: 2,
    tin: 3, tinta: 3, char: 4, charta: 4,
    pach: 5, pachta: 5
  };

  if (!token) return null;
  if (/^\d+$/.test(token)) return Number(token);
  return map[String(token).toLowerCase()] ?? null;
}

function extractCount(text, patterns) {
  for (const rx of patterns) {
    const m = String(text || "").match(rx);
    if (m) return parseFlexibleCountToken(m[1]);
  }
  return null;
}

function extractMarriageCount(text) {
  return extractCount(text, [
    /\b(\d+|one|two|three|four|five|ek|ekta|dui|duita|tin|tinta|char|charta|pach|pachta)\s+marriages?\b/i,
    /\b(\d+|one|two|three|four|five|ek|ekta|dui|duita|tin|tinta|char|charta|pach|pachta)\s+biye\b/i,
    /\b(\d+|one|two|three|four|five|ek|ekta|dui|duita|tin|tinta|char|charta|pach|pachta)\s+bea\b/i
  ]);
}

function extractBrokenMarriageCount(text) {
  return extractCount(text, [
    /\b(\d+|one|two|three|four|five|ek|ekta|dui|duita|tin|tinta|char|charta|pach|pachta)\s+divorce\b/i,
    /\b(\d+|one|two|three|four|five|ek|ekta|dui|duita|tin|tinta|char|charta|pach|pachta)\s+broken\b/i,
    /\b(\d+|one|two|three|four|five|ek|ekta|dui|duita|tin|tinta|char|charta|pach|pachta)\s+separation\b/i,
    /\b(\d+|one|two|three|four|five|ek|ekta|dui|duita|tin|tinta|char|charta|pach|pachta)\s+talak\b/i
  ]);
}

function parseFactAnchors(facts, question) {
  const rawText = `${facts || ""} ${question || ""}`.trim();
  const text = rawText.toLowerCase();
  const allYears = extractAllYears(text);

  const appealYear = yearNear(text, ["appeal ongoing", "appeal filed", "appealed", "appeal", "tribunal"]);

  return {
    provided: !!rawText,
    raw_text: text,

    marriage_count_claim: extractMarriageCount(text),
    broken_marriage_count: extractBrokenMarriageCount(text),

    love_year_claim: yearNear(text, ["love", "romance", "relationship started", "attachment"]),
    partnership_year_claim: yearNear(text, ["partnership", "contract", "partnered"]),
    marriage_year_claim: yearNear(text, ["married", "marriage", "biye", "bea", "nikah", "wedding"]),
    divorce_year_claim: yearNear(text, ["divorce", "separation", "separated", "talak", "broken marriage"]),
    broken_marriage_year_claim: yearNear(text, ["broken marriage", "marriage broken", "divorce", "separation"]),

    foreign_entry_year_claim: yearNear(text, [
      "entered uk", "came to uk", "came uk", "arrived in uk", "arrived uk",
      "foreign entry", "moved abroad", "moved to uk", "bidesh", "abroad"
    ]),

    student_visa_entry_year_claim: yearNear(text, [
      "student visa", "entered uk on student visa", "came on student visa", "arrived on student visa"
    ]),

    visa_year_claim: yearNear(text, ["visa", "permission", "approval"]),

    route_shift_year_claim: yearNear(text, [
      "10 year route", "10-year route", "family route", "partner route",
      "private life route", "ltr", "leave to remain", "route shift",
      "switched route", "switched to route", "got ltr", "ltr granted"
    ]),

    settlement_year_claim: yearNear(text, [
      "ilr granted", "settlement granted", "settled", "permanent approved",
      "citizenship granted", "ilr approved"
    ]),

    settlement_applied_year_claim: yearNear(text, [
      "ilr applied", "ilr apply", "applied ilr", "settlement applied",
      "settlement apply", "applied settlement"
    ]),

    settlement_refusal_year_claim: yearNear(text, [
      "ilr rejected", "ilr refused", "settlement rejected", "settlement refused",
      "rejected", "refused", "refusal", "denied"
    ]),

    appeal_year_claim: appealYear,

    job_start_year_claim: yearNear(text, ["job started", "started job", "employment started", "work started"]),
    business_start_year_claim: yearNear(text, ["business started", "started business", "company started", "shop started", "trade started"]),
    study_start_year_claim: yearNear(text, ["study started", "started study", "school started", "college started", "university started", "enrolled"]),
    property_year_claim: yearNear(text, ["property", "house", "flat", "land", "home bought", "car bought", "vehicle bought"]),
    debt_year_claim: yearNear(text, ["debt", "loan", "liability"]),
    mental_year_claim: yearNear(text, ["mental", "stress", "depression", "anxiety"]),
    health_year_claim: yearNear(text, ["health", "illness", "hospital", "surgery"]),

    all_years: allYears
  };
}

function buildKpPastSnapshot({ core, astro, domains, linkedDomainExpansion }) {
  return {
    subject_context: core?.subject_context || {},
    birth_context: core?.birth_context || {},
    precision_mode: core?.birth_context?.precision_mode || null,
    identity_depth: core?.subject_context?.identity_depth || null,
    subject_mode: core?.subject_context?.subject_mode || null,

    kp_cusps:
      core?.evidence_packet?.kp_cusps ||
      core?.evidence_packet?.kp ||
      astro?.kp_cusps ||
      {},
    moon: core?.evidence_packet?.moon || astro?.moon || {},
    aspects:
      core?.evidence_packet?.aspects ||
      core?.evidence_packet?.aspects_summary ||
      astro?.aspects ||
      astro?.aspects_summary ||
      [],
    dasha: core?.evidence_packet?.dasha || astro?.dasha || {},
    domain_results: domains || [],
    linked_domain_expansion: linkedDomainExpansion || []
  };
}

function buildKpEventInput({ input, stage2, core }) {
  return {
    event: input.facts || input.question,
    domain: stage2?.question_profile?.primary_domain || "GENERAL",
    question: input.question,
    linked_domain_expansion: stage2?.linked_domain_expansion || [],
    precision_mode: core?.birth_context?.precision_mode || null,
    identity_depth: core?.subject_context?.identity_depth || null,
    subject_mode: core?.subject_context?.subject_mode || null,
    dob: input.dob || null
  };
}

function compactPayloadFromFull(full) {
  return {
    engine_status: full.engine_status,
    provider_state: full.provider_state,
    system_status: full.system_status,
    mode: full.mode,
    subject_mode: full.subject_mode,
    identity_depth: full.identity_depth,
    precision_mode: full.precision_mode,
    timeline_collapse: full.timeline_collapse,
    fact_anchor_merge: full.fact_anchor_merge,
    truth_summary: full.truth_summary,
    validation_layer: full.validation_layer,
    validation_block: full.validation_block,
    identity_packet: full.identity_packet,
    delivery_safe_packet: full.delivery_safe_packet,
    exact_domain_summary: full.exact_domain_summary,
    event_summary: full.event_summary,
    forensic_verdict: full.forensic_verdict,
    lokkotha_summary: full.lokkotha_summary
  };
}

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

    if (!input.question && input.name) {
      input.question = `${input.name} past history`;
    }

    if (!input.name && !input.dob && !input.facts) {
      return res.status(400).json({
        engine_status: ENGINE_STATUS,
        system_status: "INPUT_ERROR",
        message: "Provide at least a name, DOB, or facts."
      });
    }

    const core = await buildChartCore(input, astroProvider);

    if (core?.system_status !== "OK") {
      return res.status(400).json({
        engine_status: ENGINE_STATUS,
        system_status: "INPUT_ERROR",
        details: core
      });
    }

    const facts = parseFactAnchors(input.facts, input.question);

    const stage1 = runIntelligenceLayer({
      domainResults: [],
      question: input.question
    });

    const astro = runAstroLayer({
      evidence_packet: core.evidence_packet,
      facts,
      question_profile: stage1.question_profile,
      subject_context: core.subject_context,
      birth_context: core.birth_context
    });

    const stage2 = runIntelligenceLayer({
      domainResults: astro.domain_results,
      question: input.question
    });

    const finalizedDomains = runEventFinalizer(stage2.ranked_domains);

    const timelineCollapse = runTimelineCollapser({
      ranked_domains: finalizedDomains,
      birth_context: core.birth_context,
      subject_context: core.subject_context,
      evidence_packet: core.evidence_packet
    });

    const collapsedDomains = safeArray(timelineCollapse.collapsed_domains);
    const collapsedTimeline = safeArray(timelineCollapse.collapsed_timeline);

    const factAnchorMerge = runFactAnchorMerger({
      ranked_domains: collapsedDomains.length ? collapsedDomains : finalizedDomains,
      facts
    });

    const mergedDomains = safeArray(factAnchorMerge.merged_domains);

    const pipelineDomains = mergedDomains.length
      ? mergedDomains
      : collapsedDomains.length
      ? collapsedDomains
      : finalizedDomains;

    const rawMasterTimeline = collapsedTimeline.length
      ? collapsedTimeline
      : buildTimeline({
          ranked_domains: pipelineDomains,
          birth_context: core.birth_context,
          subject_context: core.subject_context
        });

    const kpSnapshot = buildKpPastSnapshot({
      core,
      astro,
      domains: pipelineDomains,
      linkedDomainExpansion: stage2.linked_domain_expansion
    });

    const validation_layer = runValidationLayer({
      question: input.question,
      finalizedDomains: pipelineDomains,
      snapshot: kpSnapshot,
      eventInput: buildKpEventInput({ input, stage2, core })
    });

    const rawIdentityPacket = buildIdentityPacket({
      input,
      subjectContext: core.subject_context,
      birthContext: core.birth_context,
      evidencePacket: core.evidence_packet
    });

    const identity_packet = correctIdentityPacket(rawIdentityPacket, input, facts);

    const evidenceLayer = runEvidenceLayer({
      input,
      facts,
      question_profile: stage2.question_profile,
      ranked_domains: pipelineDomains,
      master_timeline: rawMasterTimeline,
      carryover: stage2.carryover,
      validation_layer,
      subject_context: core.subject_context,
      birth_context: core.birth_context
    });

    const domain_results = safeArray(evidenceLayer.ranked_domains);
    const exact_domain_summary = safeArray(evidenceLayer.exact_domain_summary);
    const event_summary = evidenceLayer.event_summary || {};
    const truth_summary = event_summary.truth_summary || evidenceLayer.truth_summary || {};
    const master_timeline = safeArray(evidenceLayer.master_timeline);
    const validation_block = evidenceLayer.validation_block || {};
    const forensic_verdict = evidenceLayer.forensic_verdict || {};
    const lokkotha_summary = evidenceLayer.lokkotha_summary || {};
    const project_paste_block = evidenceLayer.project_paste_block || "";

    const top_ranked_domains = domain_results.slice(0, 12).map((d) => ({
      domain_key: d?.domain_key,
      domain_label: d?.domain_label,
      normalized_score: d?.normalized_score,
      density: d?.density,
      residual_impact: d?.residual_impact,
      major_event_count: d?.major_event_count,
      minor_event_count: d?.minor_event_count,
      broken_event_count: d?.broken_event_count,
      active_event_count: d?.active_event_count,
      final_state: d?.final_state || "UNKNOWN",
      pattern_mode_active: !!d?.pattern_mode_active,
      exact_timeline_allowed: d?.exact_timeline_allowed === true,
      direct_evidence_count: Number(d?.direct_evidence_count || 0),
      pattern_evidence_count: Number(d?.pattern_evidence_count || 0),
      fact_conflict_count: Number(d?.fact_conflict_count || 0),
      fact_anchor_merge_active: !!d?.fact_anchor_merge_active,
      timeline_collapse_active: !!d?.timeline_collapse_active,
      timeline_precision_mode: d?.timeline_precision_mode || null
    }));

    const delivery_safe_packet = {
      normalized_states: {
        marriage: event_summary?.relationship?.current_marriage_status || "UNKNOWN",
        divorce: event_summary?.relationship?.divorce_status || "UNKNOWN",
        multiple_marriage: event_summary?.relationship?.multiple_marriage_status || "UNKNOWN",
        foreign: event_summary?.foreign?.foreign_process_status || "UNKNOWN",
        settlement: event_summary?.foreign?.settlement_status || "UNKNOWN",
        education: event_summary?.work?.education_active ? "PATTERN_OR_ACTIVE" : "UNKNOWN",
        job: event_summary?.work?.job_active ? "PATTERN_OR_ACTIVE" : "UNKNOWN",
        business: event_summary?.work?.business_active ? "PATTERN_OR_ACTIVE" : "UNKNOWN",
        money: event_summary?.money?.money_status || "UNKNOWN",
        health: event_summary?.health?.health_status || "UNKNOWN",
        conflict: event_summary?.conflict?.conflict_status || "UNKNOWN"
      },
      final_truth_summary:
        Number(factAnchorMerge?.fact_anchor_summary?.executed_domains || 0) > 0
          ? "Fact anchor merged: কিছু domain EXECUTED seal পেয়েছে।"
          : truth_summary?.truth_level === "NAME_PATTERN_LOCKED"
          ? "Name-only scan strong likely windows দেখিয়েছে; executed event claim করা হয়নি।"
          : "Evidence layer final truth summary active."
    };

    const fullPayload = {
      engine_status: ENGINE_STATUS,
      provider_state: {
        contract_version: "REAL_ASTRO_PROVIDER_CONTRACT_V1",
        provider_ready: true,
        missing_capabilities: [],
        policy: {
          person_specific_data_allowed: false,
          client_dynamic_input_required: true,
          facts_are_validation_not_source_of_truth: true
        }
      },
      system_status: "OK",
      mode: core?.subject_context?.question_mode || "PAST",
      subject_mode: core?.subject_context?.subject_mode || null,
      identity_depth: core?.subject_context?.identity_depth || null,
      precision_mode: core?.birth_context?.precision_mode || null,

      input_normalized: core?.input_normalized || {},
      subject_context: core?.subject_context || {},
      birth_context: core?.birth_context || {},
      current_context: core?.current_context || {},

      fact_anchor_block: facts,
      question_profile: stage2?.question_profile || {},
      linked_domain_expansion: stage2?.linked_domain_expansion || [],

      evidence_normalized: astro?.evidence_normalized || {},
      mode_flags: astro?.mode_flags || {},
      name_hints: astro?.name_hints || {},

      timeline_collapse: {
        timeline_collapse_version: timelineCollapse?.timeline_collapse_version || null,
        mode_flags: timelineCollapse?.mode_flags || {},
        collapsed_timeline: collapsedTimeline
      },

      fact_anchor_merge: {
        fact_anchor_merge_version: factAnchorMerge?.fact_anchor_merge_version || null,
        fact_anchor_summary: factAnchorMerge?.fact_anchor_summary || {}
      },

      validation_layer,
      validation_block,
      identity_packet,
      delivery_safe_packet,

      top_ranked_domains,
      domain_results,
      exact_domain_summary,
      event_summary,
      truth_summary,
      master_timeline,
      current_carryover: stage2?.carryover || {},

      forensic_verdict,
      lokkotha_summary,
      project_paste_block
    };

    if (input.format === "compact") {
      return res.status(200).json(compactPayloadFromFull(fullPayload));
    }

    if (input.format === "project") {
      return res.status(200).json({
        engine_status: ENGINE_STATUS,
        output_format: "project",
        subject_mode: fullPayload.subject_mode,
        identity_depth: fullPayload.identity_depth,
        precision_mode: fullPayload.precision_mode,
        timeline_collapse: fullPayload.timeline_collapse,
        fact_anchor_merge: fullPayload.fact_anchor_merge,
        truth_summary,
        validation_layer,
        validation_block,
        identity_packet,
        delivery_safe_packet,
        event_summary,
        project_paste_block
      });
    }

    return res.status(200).json(fullPayload);
  } catch (error) {
    return res.status(500).json({
      engine_status: ENGINE_STATUS,
      system_status: "ERROR",
      error_message: error instanceof Error ? error.message : "Unknown error",
      error_stack:
        process.env.NODE_ENV === "development" && error instanceof Error
          ? error.stack
          : undefined
    });
  }
}