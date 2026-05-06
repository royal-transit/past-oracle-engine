// api/past-oracle.js
// FULL REPLACEMENT — UNIVERSAL_PAST_NANO_SCANNER_V8.2
// MAIN ORCHESTRATOR FIX
// EvidenceLayer is FINAL SOURCE
// ValidationLayer receives FULL mode context

import { buildChartCore } from "../lib/chart-core.js";
import { astroProvider } from "../lib/provider-adapter.js";
import { runIntelligenceLayer } from "../lib/layer-intelligence.js";
import { runAstroLayer, buildTimeline } from "../lib/layer-astro.js";
import { runEvidenceLayer } from "../lib/layer-evidence.js";
import { runEventFinalizer } from "../lib/event-finalizer.js";
import { runValidationLayer } from "../lib/layer-validation.js";
import { buildIdentityPacket } from "../lib/identity-packet.js";
import { correctIdentityPacket } from "../lib/domain-corrector.js";

const ENGINE_STATUS = "UNIVERSAL_PAST_NANO_SCANNER_V8.2";

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

function firstYearInText(text) {
  const m = String(text || "").match(/\b(19|20)\d{2}\b/);
  return m ? Number(m[0]) : null;
}

function lastYearInText(text) {
  const yrs = extractAllYears(text);
  return yrs.length ? yrs[yrs.length - 1] : null;
}

function splitFactClauses(text) {
  return String(text || "")
    .replace(/\band then\b/gi, ",")
    .replace(/\bthen\b/gi, ",")
    .replace(/\bafter that\b/gi, ",")
    .split(/[,\n;|]+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function clauseYearByKeywords(src, keywords) {
  const clauses = splitFactClauses(src);
  for (const clause of clauses) {
    if (hasAny(clause, keywords)) {
      const y = firstYearInText(clause);
      if (y != null) return y;
    }
  }
  return null;
}

function yearNear(src, keywords) {
  const text = String(src || "");
  const clauseYear = clauseYearByKeywords(text, keywords);
  if (clauseYear != null) return clauseYear;

  for (const kw of keywords) {
    const idx = text.toLowerCase().indexOf(String(kw).toLowerCase());
    if (idx === -1) continue;

    const afterYear = firstYearInText(text.slice(idx, idx + 180));
    if (afterYear != null) return afterYear;

    const beforeYear = lastYearInText(text.slice(Math.max(0, idx - 120), idx));
    if (beforeYear != null) return beforeYear;
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

  const foreign_entry_year_claim =
    yearNear(text, [
      "entered uk", "came to uk", "came uk", "arrived in uk", "arrived uk",
      "foreign entry", "moved abroad", "moved to uk", "bidesh", "abroad"
    ]) ||
    (hasAny(text, ["uk", "foreign", "abroad", "bidesh", "immigration"]) && allYears.length ? allYears[0] : null);

  const student_visa_entry_year_claim = yearNear(text, [
    "student visa", "entered uk on student visa", "came on student visa", "arrived on student visa"
  ]);

  const route_shift_year_claim = yearNear(text, [
    "10 year route", "10-year route", "family route", "partner route",
    "private life route", "ltr", "leave to remain", "route shift",
    "switched route", "switched to route", "got ltr", "ltr granted"
  ]);

  const settlement_year_claim = yearNear(text, [
    "ilr granted", "settlement granted", "settled", "permanent approved",
    "citizenship granted", "ilr approved"
  ]);

  const settlement_applied_year_claim = yearNear(text, [
    "ilr applied", "ilr apply", "applied ilr", "settlement applied",
    "settlement apply", "applied settlement"
  ]);

  const settlement_refusal_year_claim = yearNear(text, [
    "ilr rejected", "ilr refused", "settlement rejected", "settlement refused",
    "rejected", "refused", "refusal", "denied"
  ]);

  let appeal_year_claim = yearNear(text, [
    "appeal ongoing", "appeal filed", "appealed", "appeal", "tribunal"
  ]);

  if (appeal_year_claim == null && hasAny(text, ["appeal", "appealed", "tribunal"])) {
    appeal_year_claim =
      settlement_refusal_year_claim ||
      settlement_applied_year_claim ||
      (allYears.length ? allYears[allYears.length - 1] : null);
  }

  return {
    provided: !!rawText,
    raw_text: text,
    marriage_count_claim: extractMarriageCount(text),
    broken_marriage_count: extractBrokenMarriageCount(text),
    foreign_entry_year_claim,
    student_visa_entry_year_claim,
    route_shift_year_claim,
    settlement_year_claim,
    settlement_applied_year_claim,
    settlement_refusal_year_claim,
    appeal_year_claim,
    job_start_year_claim: yearNear(text, ["job started", "started job", "employment started", "work started"]),
    business_start_year_claim: yearNear(text, ["business started", "started business", "company started", "shop started", "trade started"]),
    study_start_year_claim: yearNear(text, ["study started", "started study", "school started", "college started", "university started", "enrolled"]),
    property_year_claim: yearNear(text, ["property", "house", "flat", "land", "home bought"]),
    debt_year_claim: yearNear(text, ["debt", "loan", "liability"]),
    all_years: allYears
  };
}

function buildKpPastSnapshot({ core, astro, finalizedDomains, linkedDomainExpansion }) {
  return {
    kp_cusps: core?.evidence_packet?.kp_cusps || core?.evidence_packet?.kp || astro?.kp_cusps || {},
    moon: core?.evidence_packet?.moon || astro?.moon || {},
    aspects:
      core?.evidence_packet?.aspects ||
      core?.evidence_packet?.aspects_summary ||
      astro?.aspects ||
      astro?.aspects_summary ||
      [],
    dasha: core?.evidence_packet?.dasha || astro?.dasha || {},
    domain_results: finalizedDomains || [],
    linked_domain_expansion: linkedDomainExpansion || [],

    subject_context: core?.subject_context || {},
    birth_context: core?.birth_context || {},
    precision_mode: core?.birth_context?.precision_mode || null,
    identity_depth: core?.subject_context?.identity_depth || null,
    subject_mode: core?.subject_context?.subject_mode || null,
    is_full_birth_locked: core?.subject_context?.is_full_birth_locked === true,
    is_name_only_mode: core?.subject_context?.is_name_only_mode === true,
    is_name_context_mode: core?.subject_context?.is_name_context_mode === true
  };
}

function buildKpEventInput({ input, stage2, core }) {
  return {
    event: input.facts || input.question,
    domain: stage2?.question_profile?.primary_domain || "GENERAL",
    question: input.question,
    linked_domain_expansion: stage2?.linked_domain_expansion || [],
    name: input.name,
    dob: input.dob,
    tob: input.tob,
    pob: input.pob,
    precision_mode: core?.birth_context?.precision_mode || null,
    identity_depth: core?.subject_context?.identity_depth || null,
    subject_mode: core?.subject_context?.subject_mode || null,
    is_full_birth_locked: core?.subject_context?.is_full_birth_locked === true,
    is_name_only_mode: core?.subject_context?.is_name_only_mode === true,
    is_name_context_mode: core?.subject_context?.is_name_context_mode === true
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

    const rawMasterTimeline = buildTimeline({
      ranked_domains: finalizedDomains,
      birth_context: core.birth_context,
      subject_context: core.subject_context
    });

    const kpSnapshot = buildKpPastSnapshot({
      core,
      astro,
      finalizedDomains,
      linkedDomainExpansion: stage2.linked_domain_expansion
    });

    const validation_layer = runValidationLayer({
      question: input.question,
      finalizedDomains,
      snapshot: kpSnapshot,
      eventInput: buildKpEventInput({ input, stage2, core }),
      subject_context: core.subject_context,
      birth_context: core.birth_context,
      facts
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
      ranked_domains: finalizedDomains,
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
      pattern_evidence_count: Number(d?.pattern_evidence_count || 0)
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
        truth_summary?.truth_level === "NAME_PATTERN_LOCKED"
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
      error_message: error instanceof Error ? error.message : "Unknown error"
    });
  }
}