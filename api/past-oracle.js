// api/past-oracle.js
// FULL REPLACEMENT — UNIVERSAL PAST NANO SCANNER V1

import { buildChartCore } from "../lib/chart-core.js";
import { astroProvider } from "../lib/provider-adapter.js";
import { runIntelligenceLayer } from "../lib/layer-intelligence.js";
import { runAstroLayer, buildTimeline } from "../lib/layer-astro.js";
import { runEvidenceLayer } from "../lib/layer-evidence.js";
import { runEventFinalizer } from "../lib/event-finalizer.js";
import { runValidationLayer } from "../lib/layer-validation.js";
import {
  normalizeSectorStates,
  buildDomainTruthMap
} from "../lib/state-normalizer.js";
import { buildTruthLines } from "../lib/delivery-mapper.js";
import { buildIdentityPacket } from "../lib/identity-packet.js";
import {
  correctExactDomainSummary,
  correctIdentityPacket
} from "../lib/domain-corrector.js";

/* =====================================
   BASIC HELPERS
===================================== */

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

function low(v) {
  return String(v || "").trim().toLowerCase();
}

function up(v) {
  return String(v || "").trim().toUpperCase();
}

function hasAny(text, arr) {
  const src = low(text);
  return arr.some((x) => src.includes(low(x)));
}

function unique(arr) {
  return [...new Set((arr || []).filter(Boolean))];
}

function extractAllYears(text) {
  return [...String(text || "").matchAll(/\b(19|20)\d{2}\b/g)].map((m) => Number(m[0]));
}

function yearNear(src, keywords) {
  const text = String(src || "");
  for (const kw of keywords) {
    const idx = text.toLowerCase().indexOf(String(kw).toLowerCase());
    if (idx === -1) continue;
    const tail = text.slice(idx, idx + 140);
    const m = tail.match(/\b(19|20)\d{2}\b/);
    if (m) return Number(m[0]);
  }
  return null;
}

function parseFlexibleCountToken(token) {
  const map = {
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
  };

  if (!token) return null;
  if (/^\d+$/.test(token)) return Number(token);
  return map[String(token).toLowerCase()] ?? null;
}

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
    /\b(\d+|one|two|three|four|five|ek|ekta|dui|duita|tin|tinta|char|charta|pach|pachta)\s+divorce\b/i,
    /\b(\d+|one|two|three|four|five|ek|ekta|dui|duita|tin|tinta|char|charta|pach|pachta)\s+broken\b/i,
    /\b(\d+|one|two|three|four|five|ek|ekta|dui|duita|tin|tinta|char|charta|pach|pachta)\s+separation\b/i,
    /\b(\d+|one|two|three|four|five|ek|ekta|dui|duita|tin|tinta|char|charta|pach|pachta)\s+talak\b/i
  ];

  for (const rx of patterns) {
    const m = String(text || "").match(rx);
    if (m) return parseFlexibleCountToken(m[1]);
  }
  return null;
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj || {}));
}

function safeArray(v) {
  return Array.isArray(v) ? v : [];
}

function normalizeStateValue(v) {
  const s = low(v);
  if (["executed", "occurred", "confirmed"].includes(s)) return "occurred";
  if (["partial", "ongoing", "in_progress", "process"].includes(s)) return "ongoing";
  if (["blocked"].includes(s)) return "blocked";
  if (["broken"].includes(s)) return "broken";
  if (["not_executed", "not_occurred"].includes(s)) return "not_occurred";
  return "unknown";
}

/* =====================================
   FACT PARSER
===================================== */

function parseFactAnchors(facts, question) {
  const rawText = `${facts || ""} ${question || ""}`.trim();
  const text = rawText.toLowerCase();

  let allYears = [];
  try {
    allYears = extractAllYears(text) || [];
  } catch (e) {
    allYears = [];
  }

  const marriage_count_claim = extractMarriageCount(text);
  const broken_marriage_claim = extractBrokenMarriageCount(text);

  let foreign_entry_year_claim = yearNear(text, [
    "uk",
    "foreign",
    "abroad",
    "came",
    "arrived",
    "entry",
    "moved",
    "visa",
    "immigration",
    "saudi",
    "dubai",
    "spain",
    "bidesh"
  ]);

  const settlement_year_claim = yearNear(text, [
    "ilr granted",
    "settlement granted",
    "settled",
    "permanent approved",
    "citizenship granted"
  ]);

  const settlement_applied_year_claim = yearNear(text, [
    "ilr apply",
    "ilr applied",
    "settlement apply",
    "settlement applied",
    "applied ilr",
    "applied settlement"
  ]);

  const settlement_refusal_year_claim = yearNear(text, [
    "refusal",
    "refused",
    "rejected",
    "denied"
  ]);

  let appeal_year_claim = yearNear(text, [
    "appeal",
    "appealed",
    "appeal ongoing",
    "appeal filed"
  ]);

  const job_start_year_claim = yearNear(text, [
    "job started",
    "started job",
    "employment started",
    "work started"
  ]);

  const business_start_year_claim = yearNear(text, [
    "business started",
    "started business",
    "company started",
    "shop started"
  ]);

  const study_start_year_claim = yearNear(text, [
    "school",
    "college",
    "university",
    "study started",
    "student"
  ]);

  const property_year_claim = yearNear(text, [
    "property",
    "house",
    "flat",
    "land",
    "home bought"
  ]);

  const debt_year_claim = yearNear(text, [
    "debt",
    "loan",
    "liability"
  ]);

  if (
    appeal_year_claim == null &&
    hasAny(text, ["appeal", "appealed", "appeal ongoing", "appeal filed"])
  ) {
    appeal_year_claim =
      settlement_refusal_year_claim ||
      settlement_applied_year_claim ||
      (Array.isArray(allYears) && allYears.length ? allYears[allYears.length - 1] : null);
  }

  if (
    foreign_entry_year_claim == null &&
    Array.isArray(allYears) &&
    allYears.length > 0 &&
    hasAny(text, [
      "uk",
      "foreign",
      "abroad",
      "came",
      "arrived",
      "entry",
      "moved",
      "visa",
      "immigration",
      "saudi",
      "dubai",
      "spain",
      "bidesh"
    ])
  ) {
    foreign_entry_year_claim = allYears[0];
  }

  return {
    provided: !!rawText,
    raw_text: text,
    marriage_count_claim,
    broken_marriage_claim,
    foreign_entry_year_claim,
    settlement_year_claim,
    settlement_applied_year_claim,
    settlement_refusal_year_claim,
    appeal_year_claim,
    job_start_year_claim,
    business_start_year_claim,
    study_start_year_claim,
    property_year_claim,
    debt_year_claim,
    all_years: Array.isArray(allYears) ? allYears : []
  };
}

/* =====================================
   UNIVERSAL OVERRIDE / EQUIVALENCE LAW
===================================== */

function applyUniversalStateOverrides(validationLayer = {}, facts = {}) {
  const out = clone(validationLayer);
  out.sector_state = out.sector_state || {};
  out.question_intent = out.question_intent || {};

  // Foreign truth
  if (facts.foreign_entry_year_claim) {
    out.sector_state.foreign = "EXECUTED";
    out.sector_state.immigration = "EXECUTED";
    out.sector_state.visa = out.sector_state.visa || "PARTIAL";
  }

  // Settlement truth
  if (facts.settlement_year_claim) {
    out.sector_state.settlement = "EXECUTED";
  } else if (
    facts.settlement_applied_year_claim ||
    facts.settlement_refusal_year_claim ||
    facts.appeal_year_claim
  ) {
    out.sector_state.settlement = "PARTIAL";
  }

  // Legal truth
  if (facts.settlement_refusal_year_claim) {
    out.sector_state.legal = "EXECUTED";
    out.sector_state.document = "EXECUTED";
  }

  if (facts.appeal_year_claim) {
    out.sector_state.legal = "PARTIAL";
    out.sector_state.document = "PARTIAL";
  }

  // Relationship truth
  if (facts.marriage_count_claim && facts.marriage_count_claim > 0) {
    out.sector_state.marriage = "EXECUTED";
  }
  if (facts.broken_marriage_claim && facts.broken_marriage_claim > 0) {
    out.sector_state.divorce = "EXECUTED";
  }

  // Work / business / education / property / debt facts if present
  if (facts.job_start_year_claim) out.sector_state.job = "EXECUTED";
  if (facts.business_start_year_claim) out.sector_state.business = "EXECUTED";
  if (facts.study_start_year_claim) out.sector_state.education = "EXECUTED";
  if (facts.property_year_claim) out.sector_state.property = "EXECUTED";
  if (facts.debt_year_claim) out.sector_state.debt = "EXECUTED";

  return out;
}

function overrideExactDomainSummary(exactDomainSummary = [], facts = {}) {
  const items = clone(exactDomainSummary);

  return items.map((item) => {
    const out = clone(item);
    if (!out?.primary_exact_event) return out;

    const dk = up(out.domain_key);

    if (dk === "FOREIGN" && facts.foreign_entry_year_claim) {
      out.primary_exact_event.status = "EXECUTED";
      out.primary_exact_event.trigger_phase = "event confirmed";
      out.primary_exact_event.impact_summary = "foreign entry has occurred";
      out.primary_exact_event.event_type = "foreign entry event";
      out.primary_exact_event.date_marker = facts.foreign_entry_year_claim;
    }

    if (dk === "IMMIGRATION" && facts.foreign_entry_year_claim) {
      out.primary_exact_event.status = "EXECUTED";
      out.primary_exact_event.trigger_phase = "event confirmed";
      out.primary_exact_event.impact_summary = "immigration movement has occurred";
      out.primary_exact_event.event_type = "foreign entry event";
      out.primary_exact_event.date_marker = facts.foreign_entry_year_claim;
    }

    if (dk === "VISA" && facts.foreign_entry_year_claim) {
      out.primary_exact_event.status = "EXECUTED";
      out.primary_exact_event.trigger_phase = "event confirmed";
      out.primary_exact_event.impact_summary = "visa / permission path opened";
      out.primary_exact_event.event_type = "visa / permission event";
      out.primary_exact_event.date_marker = facts.foreign_entry_year_claim;
    }

    if (dk === "SETTLEMENT") {
      if (facts.settlement_year_claim) {
        out.primary_exact_event.status = "EXECUTED";
        out.primary_exact_event.trigger_phase = "event confirmed";
        out.primary_exact_event.impact_summary = "settlement has occurred";
        out.primary_exact_event.event_type = "settlement event";
        out.primary_exact_event.date_marker = facts.settlement_year_claim;
      } else if (facts.appeal_year_claim) {
        out.primary_exact_event.status = "PARTIAL";
        out.primary_exact_event.trigger_phase = "partial execution";
        out.primary_exact_event.impact_summary = "appeal is ongoing after refusal";
        out.primary_exact_event.event_type = "appeal ongoing";
        out.primary_exact_event.date_marker = facts.appeal_year_claim;
      } else if (facts.settlement_refusal_year_claim) {
        out.primary_exact_event.status = "EXECUTED";
        out.primary_exact_event.trigger_phase = "event confirmed";
        out.primary_exact_event.impact_summary = "settlement refusal has occurred";
        out.primary_exact_event.event_type = "refusal event";
        out.primary_exact_event.date_marker = facts.settlement_refusal_year_claim;
      } else if (facts.settlement_applied_year_claim) {
        out.primary_exact_event.status = "PARTIAL";
        out.primary_exact_event.trigger_phase = "partial execution";
        out.primary_exact_event.impact_summary = "application submitted but not completed";
        out.primary_exact_event.event_type = "application in process";
        out.primary_exact_event.date_marker = facts.settlement_applied_year_claim;
      }
    }

    if (dk === "LEGAL") {
      if (facts.appeal_year_claim) {
        out.primary_exact_event.status = "PARTIAL";
        out.primary_exact_event.trigger_phase = "partial execution";
        out.primary_exact_event.impact_summary = "appeal / authority matter is ongoing";
        out.primary_exact_event.event_type = "appeal event";
        out.primary_exact_event.date_marker = facts.appeal_year_claim;
      } else if (facts.settlement_refusal_year_claim) {
        out.primary_exact_event.status = "EXECUTED";
        out.primary_exact_event.trigger_phase = "event confirmed";
        out.primary_exact_event.impact_summary = "authority refusal has occurred";
        out.primary_exact_event.event_type = "refusal / authority event";
        out.primary_exact_event.date_marker = facts.settlement_refusal_year_claim;
      }
    }

    if (dk === "MARRIAGE" && facts.marriage_count_claim > 0) {
      out.primary_exact_event.status = "EXECUTED";
      out.primary_exact_event.trigger_phase = "event confirmed";
      out.primary_exact_event.impact_summary = "marriage has occurred";
      out.primary_exact_event.event_type = "marriage event";
    }

    if (dk === "MONEY" && facts.debt_year_claim) {
      out.primary_exact_event.status = "PARTIAL";
      out.primary_exact_event.trigger_phase = "partial execution";
      out.primary_exact_event.impact_summary = "money flow exists but pressure/debt also exists";
      out.primary_exact_event.event_type = "money / debt phase";
      out.primary_exact_event.date_marker = facts.debt_year_claim;
    }

    if (dk === "DEBT" && facts.debt_year_claim) {
      out.primary_exact_event.status = "EXECUTED";
      out.primary_exact_event.trigger_phase = "event confirmed";
      out.primary_exact_event.impact_summary = "debt / liability has occurred";
      out.primary_exact_event.event_type = "debt event";
      out.primary_exact_event.date_marker = facts.debt_year_claim;
    }

    if (dk === "PROPERTY" && facts.property_year_claim) {
      out.primary_exact_event.status = "EXECUTED";
      out.primary_exact_event.trigger_phase = "event confirmed";
      out.primary_exact_event.impact_summary = "property / residence line has occurred";
      out.primary_exact_event.event_type = "property / residence event";
      out.primary_exact_event.date_marker = facts.property_year_claim;
    }

    if (dk === "JOB" && facts.job_start_year_claim) {
      out.primary_exact_event.status = "EXECUTED";
      out.primary_exact_event.trigger_phase = "event confirmed";
      out.primary_exact_event.impact_summary = "job / employment has occurred";
      out.primary_exact_event.event_type = "job event";
      out.primary_exact_event.date_marker = facts.job_start_year_claim;
    }

    if (dk === "BUSINESS" && facts.business_start_year_claim) {
      out.primary_exact_event.status = "EXECUTED";
      out.primary_exact_event.trigger_phase = "event confirmed";
      out.primary_exact_event.impact_summary = "business has started";
      out.primary_exact_event.event_type = "business event";
      out.primary_exact_event.date_marker = facts.business_start_year_claim;
    }

    if (dk === "EDUCATION" && facts.study_start_year_claim) {
      out.primary_exact_event.status = "EXECUTED";
      out.primary_exact_event.trigger_phase = "event confirmed";
      out.primary_exact_event.impact_summary = "study / education line has occurred";
      out.primary_exact_event.event_type = "education event";
      out.primary_exact_event.date_marker = facts.study_start_year_claim;
    }

    return out;
  });
}

function normalizeLikelyHistoryDomains(exactDomainSummary = []) {
  return safeArray(exactDomainSummary).map((item) => {
    const out = clone(item);
    const evt = out?.primary_exact_event;
    if (!evt) return out;

    const evidenceType = up(evt?.evidence_type);
    const status = up(evt?.status);
    const score = Number(evt?.score || 0);

    if (
      evidenceType === "LIKELY_HISTORY" &&
      status === "NOT_EXECUTED" &&
      score >= 20
    ) {
      out.primary_exact_event.status = "PARTIAL";
      out.primary_exact_event.trigger_phase = "partial execution";
      out.primary_exact_event.impact_summary = "pattern likely materialised partially";
    }

    return out;
  });
}

function rebuildDeliverySafePacket(validationLayer = {}, facts = {}) {
  const sectorState = validationLayer?.sector_state || {};
  const normalized_states = normalizeSectorStates(sectorState);
  const domain_truth_map = buildDomainTruthMap(sectorState);

  if (facts.settlement_applied_year_claim || facts.settlement_refusal_year_claim || facts.appeal_year_claim) {
    normalized_states.settlement = "ongoing";
    if (domain_truth_map.foreign) domain_truth_map.foreign.settlement = "ongoing";
  }

  if (facts.settlement_refusal_year_claim) {
    normalized_states.legal = facts.appeal_year_claim ? "ongoing" : "occurred";
    if (domain_truth_map.conflict) {
      domain_truth_map.conflict.legal = facts.appeal_year_claim ? "ongoing" : "occurred";
    }
  }

  if (facts.foreign_entry_year_claim) {
    normalized_states.foreign = "occurred";
    normalized_states.immigration = "occurred";
    normalized_states.visa = "occurred";

    if (domain_truth_map.foreign) {
      domain_truth_map.foreign.movement = "occurred";
      domain_truth_map.foreign.immigration = "occurred";
      domain_truth_map.foreign.visa = "occurred";
    }
  }

  if (facts.marriage_count_claim > 0) {
    normalized_states.marriage = "occurred";
    if (domain_truth_map.relationship) {
      domain_truth_map.relationship.marriage = "occurred";
    }
  }

  if (facts.job_start_year_claim) normalized_states.job = "occurred";
  if (facts.business_start_year_claim) normalized_states.business = "occurred";
  if (facts.study_start_year_claim) normalized_states.education = "occurred";
  if (facts.property_year_claim) normalized_states.property = "occurred";
  if (facts.debt_year_claim) normalized_states.debt = "occurred";

  const truth_lines = buildTruthLines(domain_truth_map);

  if (facts.settlement_refusal_year_claim) truth_lines.push("settlement refusal বাস্তবে ঘটেছে");
  if (facts.appeal_year_claim) truth_lines.push("appeal এখনো চলমান");

  return {
    normalized_states,
    domain_truth_map,
    truth_lines: unique(truth_lines),
    final_truth_summary: unique(truth_lines).length
      ? unique(truth_lines).join("। ") + "।"
      : ""
  };
}

/* =====================================
   SUMMARY HELPERS
===================================== */

function minifyDomain(d) {
  return {
    domain_key: d?.domain_key,
    domain_label: d?.domain_label,
    normalized_score: d?.normalized_score,
    density: d?.density,
    residual_impact: d?.residual_impact,
    major_event_count: d?.major_event_count,
    broken_event_count: d?.broken_event_count,
    active_event_count: d?.active_event_count,
    final_state: d?.final_state || null,
    pattern_mode_active: !!d?.pattern_mode_active,
    exact_timeline_allowed: d?.exact_timeline_allowed !== false,
    direct_evidence_count: Number(d?.direct_evidence_count || 0),
    pattern_evidence_count: Number(d?.pattern_evidence_count || 0)
  };
}

function buildTopLevelTruthSummary(core, astro, evidenceLayer) {
  const modeFlags = astro?.mode_flags || {};
  const truthSummary = evidenceLayer?.event_summary?.truth_summary || {};

  return {
    subject_mode: core?.subject_context?.subject_mode || null,
    identity_depth: core?.subject_context?.identity_depth || null,
    identity_confidence: core?.subject_context?.identity_confidence || null,
    precision_mode: core?.birth_context?.precision_mode || null,
    weak_timeline_mode: !!(modeFlags.isNameOnly || modeFlags.isNameContext),
    exact_timeline_allowed: !!truthSummary.exact_timeline_allowed,
    truth_level: truthSummary.truth_level || null,
    direct_evidence_count: truthSummary.direct_evidence_count ?? 0,
    pattern_confirmed_count: truthSummary.pattern_confirmed_count ?? 0,
    repeated_pattern_count: truthSummary.repeated_pattern_count ?? 0,
    likely_history_count: truthSummary.likely_history_count ?? 0,
    name_pattern_count: truthSummary.name_pattern_count ?? 0
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

    if (!input.question && input.name) {
      input.question = `${input.name} past history`;
    }

    const core = await buildChartCore(input, astroProvider);

    if (core?.system_status !== "OK") {
      return res.status(400).json({
        engine_status: "UNIVERSAL_PAST_NANO_SCANNER_V1",
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

    const validationLayerRaw = runValidationLayer({
      question: input.question,
      finalizedDomains
    });

    const validationLayer = applyUniversalStateOverrides(validationLayerRaw, facts);

    const rawIdentityPacket = buildIdentityPacket({
      input,
      subjectContext: core.subject_context,
      birthContext: core.birth_context,
      evidencePacket: core.evidence_packet
    });

    const identityPacket = correctIdentityPacket(
      rawIdentityPacket,
      input,
      facts
    );

    const master_timeline = buildTimeline({
      ranked_domains: finalizedDomains,
      birth_context: core.birth_context,
      subject_context: core.subject_context
    });

    const evidenceLayer = runEvidenceLayer({
      input,
      facts,
      question_profile: stage2.question_profile,
      ranked_domains: finalizedDomains,
      master_timeline,
      carryover: stage2.carryover,
      validation_layer: validationLayer,
      subject_context: core.subject_context,
      birth_context: core.birth_context
    });

    const normalizedExact = normalizeLikelyHistoryDomains(
      evidenceLayer?.exact_domain_summary || []
    );

    const correctedExactDomainSummary = overrideExactDomainSummary(
      correctExactDomainSummary(normalizedExact, facts, {}),
      facts
    );

    const deliverySafePacket = rebuildDeliverySafePacket(validationLayer, facts);

    const topLevelTruthSummary = buildTopLevelTruthSummary(core, astro, evidenceLayer);

    const payload = {
      engine_status: "UNIVERSAL_PAST_NANO_SCANNER_V1",
      system_status: "OK",

      mode: core?.subject_context?.question_mode || "GENERAL",
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
      validation_layer: validationLayer || {},

      identity_packet: identityPacket,
      delivery_safe_packet: deliverySafePacket,

      top_ranked_domains: safeArray(evidenceLayer?.ranked_domains)
        .slice(0, 12)
        .map(minifyDomain),

      domain_results: evidenceLayer?.ranked_domains || [],
      exact_domain_summary: correctedExactDomainSummary,

      event_summary: evidenceLayer?.event_summary || {},
      truth_summary: topLevelTruthSummary,
      master_timeline: evidenceLayer?.master_timeline || [],
      current_carryover: stage2?.carryover || {},
      validation_block: evidenceLayer?.validation_block || {},
      forensic_verdict: evidenceLayer?.forensic_verdict || {},
      lokkotha_summary: evidenceLayer?.lokkotha_summary || {},
      project_paste_block: evidenceLayer?.project_paste_block || ""
    };

    if (input.format === "project") {
      return res.status(200).json({
        engine_status: "UNIVERSAL_PAST_NANO_SCANNER_V1",
        output_format: "project",
        subject_mode: core?.subject_context?.subject_mode || null,
        identity_depth: core?.subject_context?.identity_depth || null,
        precision_mode: core?.birth_context?.precision_mode || null,
        truth_summary: topLevelTruthSummary,
        validation_layer: validationLayer || {},
        identity_packet: identityPacket,
        delivery_safe_packet: deliverySafePacket,
        project_paste_block: evidenceLayer?.project_paste_block || ""
      });
    }

    if (input.format === "compact") {
      return res.status(200).json({
        engine_status: "UNIVERSAL_PAST_NANO_SCANNER_V1",
        output_format: "compact",
        subject_mode: core?.subject_context?.subject_mode || null,
        identity_depth: core?.subject_context?.identity_depth || null,
        precision_mode: core?.birth_context?.precision_mode || null,
        truth_summary: topLevelTruthSummary,
        validation_layer: validationLayer || {},
        identity_packet: identityPacket,
        delivery_safe_packet: deliverySafePacket,
        summary: {
          primary_domain: stage2?.question_profile?.primary_domain || "GENERAL",
          total_events: evidenceLayer?.event_summary?.total_estimated_events || 0,
          top_domains: safeArray(evidenceLayer?.ranked_domains)
            .slice(0, 5)
            .map((d) => d?.domain_label),

          relationship: {
            marriage_count: facts?.marriage_count_claim ?? evidenceLayer?.event_summary?.relationship?.marriage_count ?? 0,
            broken_marriage_count: facts?.broken_marriage_claim ?? evidenceLayer?.event_summary?.relationship?.broken_marriage_count ?? 0,
            current_marriage_status:
              facts?.marriage_count_claim > 0
                ? "EXECUTED"
                : (evidenceLayer?.event_summary?.relationship?.current_marriage_status ?? "UNKNOWN"),
            latest_relationship_event_type:
              evidenceLayer?.event_summary?.relationship?.latest_relationship_event_type ?? null
          },

          work: {
            dominant_work_mode: evidenceLayer?.event_summary?.work?.dominant_work_mode ?? "UNKNOWN",
            education_active:
              facts?.study_start_year_claim ? true : (evidenceLayer?.event_summary?.work?.education_active ?? false),
            job_active:
              facts?.job_start_year_claim ? true : (evidenceLayer?.event_summary?.work?.job_active ?? false),
            business_active:
              facts?.business_start_year_claim ? true : (evidenceLayer?.event_summary?.work?.business_active ?? false)
          },

          foreign: {
            foreign_shift_count: evidenceLayer?.event_summary?.foreign?.foreign_shift_count ?? 0,
            foreign_entry_year: facts?.foreign_entry_year_claim ?? evidenceLayer?.event_summary?.foreign?.foreign_entry_year ?? null,
            settlement_year: facts?.settlement_year_claim ?? evidenceLayer?.event_summary?.foreign?.settlement_year ?? null,
            foreign_process_status:
              facts?.foreign_entry_year_claim
                ? "EXECUTED"
                : (evidenceLayer?.event_summary?.foreign?.foreign_process_status ?? null)
          },

          health:
            facts?.debt_year_claim ? "PARTIAL" : (evidenceLayer?.event_summary?.health?.health_status ?? "UNKNOWN"),
          money:
            facts?.debt_year_claim ? "PARTIAL" : (evidenceLayer?.event_summary?.money?.money_status ?? "UNKNOWN"),
          conflict:
            facts?.settlement_refusal_year_claim || facts?.appeal_year_claim
              ? "PARTIAL"
              : (evidenceLayer?.event_summary?.conflict?.conflict_status ?? "UNKNOWN"),

          timing_summary: evidenceLayer?.event_summary?.timing_summary || {},
          truth_summary: evidenceLayer?.event_summary?.truth_summary || {},
          recognition_lines: unique([
            ...(safeArray(evidenceLayer?.event_summary?.recognition_lines)),
            ...(deliverySafePacket.truth_lines || [])
          ]),

          current_carryover: stage2?.carryover?.present_carryover_detected || false
        },
        exact_domain_summary: correctedExactDomainSummary,
        verdict: evidenceLayer?.forensic_verdict || {},
        lokkotha_summary: evidenceLayer?.lokkotha_summary || {}
      });
    }

    return res.status(200).json(payload);
  } catch (error) {
    console.error("UNIVERSAL PAST NANO SCANNER CRASH >>>", error);

    return res.status(500).json({
      engine_status: "UNIVERSAL_PAST_NANO_SCANNER_V1",
      system_status: "ERROR",
      error_message: error instanceof Error ? error.message : "Unknown error",
      error_stack: error instanceof Error ? error.stack : null
    });
  }
}