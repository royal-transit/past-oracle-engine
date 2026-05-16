// lib/layer-evidence.js
// FULL REPLACEMENT — UNIVERSAL HARD-LOCK EVIDENCE LAYER V3
// HUMAN_FORENSIC_TRANSLATOR ACTIVE
// Goal:
// 1) Existing evidence/domain pipeline intact.
// 2) NAME_ONLY = no executed claim, but human-readable Evangeline-style recognition.
// 3) project_paste_block no longer robotic audit-only block.
// 4) GPT receives client-facing narrative + machine facts.
// 5) FULL_BIRTH / DOB / FACT_ANCHORED still preserve stronger timeline logic.

function normalizeYear(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function norm(v) {
  return String(v || "").trim();
}

function low(v) {
  return norm(v).toLowerCase();
}

function up(v) {
  return norm(v).toUpperCase();
}

function safeArray(v) {
  return Array.isArray(v) ? v : [];
}

function clone(v) {
  return JSON.parse(JSON.stringify(v || {}));
}

function uniq(arr) {
  return [...new Set(safeArray(arr).filter(Boolean))];
}

function finalState(events = [], oldState = "UNKNOWN") {
  const s = safeArray(events).map((e) => up(e.status));
  if (s.includes("EXECUTED")) return "EXECUTED";
  if (s.includes("IN_PROGRESS")) return "IN_PROGRESS";
  if (s.includes("PARTIAL")) return "PARTIAL";
  if (s.includes("BROKEN")) return "BROKEN";
  if (s.includes("NOT_EXECUTED")) return "NOT_EXECUTED";
  return up(oldState) || "UNKNOWN";
}

function getModeFlags(subject_context, birth_context) {
  const identityDepth = norm(subject_context?.identity_depth);
  const subjectMode = norm(subject_context?.subject_mode);
  const precisionMode = norm(birth_context?.precision_mode);

  const isNameOnly =
    subject_context?.is_name_only_mode === true ||
    identityDepth === "LEVEL_2_NAME_ONLY" ||
    subjectMode === "NAME_ONLY_PAST" ||
    precisionMode === "NAME_ONLY";

  const isNameContext =
    subject_context?.is_name_context_mode === true ||
    identityDepth === "LEVEL_3_NAME_CONTEXT" ||
    subjectMode === "NAME_CONTEXT_PAST" ||
    precisionMode === "NAME_CONTEXT";

  const isReducedDob =
    identityDepth === "LEVEL_4_NAME_DOB" ||
    identityDepth === "LEVEL_3_DOB_ONLY" ||
    precisionMode === "DOB_ONLY_REDUCED" ||
    precisionMode === "DOB_POB_REDUCED";

  const isFullBirth =
    subject_context?.is_full_birth_locked === true ||
    identityDepth === "LEVEL_5_FULL_BIRTH" ||
    precisionMode === "FULL_BIRTH" ||
    precisionMode === "DOB_TOB";

  return {
    isNameOnly,
    isNameContext,
    isReducedDob,
    isFullBirth,
    weakTimelineMode: isNameOnly || isNameContext,
    executionClaimAllowed: isFullBirth || isReducedDob
  };
}

function exactTimeBandByDomain(domainKey) {
  const k = up(domainKey);

  if (["HEALTH", "MENTAL"].includes(k)) return "06:00-10:00";
  if (["FOREIGN", "SETTLEMENT"].includes(k)) return "08:00-14:00";
  if (["LEGAL", "DOCUMENT", "IMMIGRATION", "VISA"].includes(k)) return "09:00-13:00";
  if (["MONEY", "DEBT", "GAIN", "LOSS", "BUSINESS", "JOB", "CAREER"].includes(k)) return "10:00-15:00";
  if (["PROPERTY", "HOME", "VEHICLE", "FAMILY", "EDUCATION", "CHILDREN", "ENEMY"].includes(k)) return "11:00-17:00";
  if (["MARRIAGE", "DIVORCE", "LOVE", "PARTNERSHIP", "MULTIPLE_MARRIAGE"].includes(k)) return "16:00-22:00";

  return null;
}

function eventScore(domain, event, weakTimelineMode) {
  let score = Number(domain?.rank_score || domain?.normalized_score || 0);

  const evidenceType = up(event?.evidence_type);
  const importance = up(event?.importance);
  const strength = low(event?.evidence_strength);
  const status = up(event?.status);
  const year = normalizeYear(event?.date_marker ?? event?.exact_year);

  if (evidenceType === "DIRECT_FACT") score += 8;
  if (evidenceType === "FACT_ANCHORED") score += 7;
  if (evidenceType === "DIRECT") score += 5;
  if (evidenceType === "PATTERN_CONFIRMED") score += 4;
  if (evidenceType === "LIKELY_HISTORY") score += 3;
  if (evidenceType === "NAME_PATTERN") score += 2;

  if (strength.includes("strong")) score += 4;
  else if (strength.includes("moderate")) score += 2.5;
  else if (strength.includes("light")) score += 1;

  if (importance === "MAJOR") score += 3;
  if (["EXECUTED", "IN_PROGRESS", "PARTIAL", "ACTIVE", "BUILDING", "LIKELY_WINDOW"].includes(status)) score += 2;
  if (!weakTimelineMode && year != null) score += 2;

  return Math.round((score + Number.EPSILON) * 100) / 100;
}

function patchEvent(domain, event, weakTimelineMode) {
  const e = clone(event);
  const year = normalizeYear(e.exact_year ?? e.date_marker);

  if (weakTimelineMode) {
    e.exact_year = null;
    e.date_marker = null;
    e.exact_claim_locked = true;
    e.execution_claim_allowed = false;
    e.timing_mode = e.timing_mode || "LIKELY_AGE_WINDOW";
    if (up(e.status) === "PATTERN_ONLY") e.status = "LIKELY_WINDOW";
  } else {
    e.exact_year = year;
    e.date_marker = year;
  }

  if (!e.month_or_phase) {
    e.month_or_phase = year && !weakTimelineMode ? "year-anchored phase" : "phase only";
  }

  return e;
}

function buildPrimaryExactEvent(domain, weakTimelineMode) {
  const candidates = safeArray(domain.events)
    .map((e) => ({
      domain: domain.domain_label,
      domain_key: domain.domain_key,
      event_family: e.event_family || null,
      event_type: e.event_type || null,
      event_number: e.event_number || 1,
      status: e.status || "UNKNOWN",
      trigger_phase: e.trigger_phase || null,
      evidence_strength: e.evidence_strength || null,
      importance: e.importance || null,
      evidence_type: e.evidence_type || null,
      exact_date: null,
      date_marker: weakTimelineMode ? null : normalizeYear(e.date_marker ?? e.exact_year),
      exact_year: weakTimelineMode ? null : normalizeYear(e.date_marker ?? e.exact_year),
      month_or_phase: e.month_or_phase || null,
      exact_time_band: exactTimeBandByDomain(domain.domain_key),
      who_involved: e.who_involved || null,
      impact_summary: e.impact_summary || null,
      likely_age_window: e.likely_age_window || null,
      likely_year_window: weakTimelineMode ? null : e.likely_year_window || null,
      timing_mode: e.timing_mode || null,
      exact_claim_locked: !!e.exact_claim_locked,
      execution_claim_allowed: e.execution_claim_allowed !== false,
      score: eventScore(domain, e, weakTimelineMode)
    }))
    .filter((x) => x.month_or_phase || x.date_marker || x.likely_age_window)
    .sort((a, b) => b.score - a.score);

  if (!candidates.length) {
    return {
      ...domain,
      primary_exact_event: null,
      alternative_exact_events: [],
      exact_time_band: exactTimeBandByDomain(domain.domain_key)
    };
  }

  return {
    ...domain,
    primary_exact_event: candidates[0],
    alternative_exact_events: candidates.slice(1, 3),
    exact_time_band: candidates[0].exact_time_band
  };
}

function rebuildDomains(ranked_domains, weakTimelineMode) {
  return safeArray(ranked_domains).map((domain) => {
    const events = safeArray(domain.events).map((e) => patchEvent(domain, e, weakTimelineMode));

    const rebuilt = {
      ...domain,
      events,
      final_state: weakTimelineMode ? "UNSEALED_PATTERN" : finalState(events, domain.final_state),
      exact_timeline_allowed: !weakTimelineMode,
      execution_claim_allowed: !weakTimelineMode,
      pattern_mode_active: weakTimelineMode || !!domain.pattern_mode_active,
      direct_evidence_count: events.filter((e) =>
        ["DIRECT", "DIRECT_FACT", "FACT_ANCHORED"].includes(up(e.evidence_type))
      ).length,
      pattern_evidence_count: events.filter((e) =>
        ["NAME_PATTERN", "LIKELY_HISTORY", "PATTERN_CONFIRMED"].includes(up(e.evidence_type))
      ).length
    };

    return buildPrimaryExactEvent(rebuilt, weakTimelineMode);
  });
}

function buildLedger(domains, keys) {
  const set = new Set(keys);
  const out = [];

  for (const d of safeArray(domains)) {
    if (!set.has(up(d.domain_key))) continue;

    for (const e of safeArray(d.events)) {
      out.push({
        domain_key: d.domain_key,
        domain_label: d.domain_label,
        final_state: d.final_state || "UNKNOWN",
        exact_time_band: d.exact_time_band || exactTimeBandByDomain(d.domain_key),
        ...e
      });
    }
  }

  return out;
}

function stateOf(domainsByKey, key) {
  return domainsByKey.get(key)?.final_state || "UNKNOWN";
}

function pickState(...states) {
  const s = states.map(up);
  if (s.includes("EXECUTED")) return "EXECUTED";
  if (s.includes("IN_PROGRESS")) return "IN_PROGRESS";
  if (s.includes("PARTIAL")) return "PARTIAL";
  if (s.includes("BROKEN")) return "BROKEN";
  if (s.includes("NOT_EXECUTED")) return "NOT_EXECUTED";
  if (s.includes("UNSEALED_PATTERN")) return "UNSEALED_PATTERN";
  return "UNKNOWN";
}

function summarizeRelationship(ledger, domainsByKey, facts) {
  return {
    relationship_ledger: ledger,
    marriage_count: facts?.marriage_count_claim ?? 0,
    broken_marriage_count: facts?.broken_marriage_count ?? 0,
    current_marriage_status: pickState(
      stateOf(domainsByKey, "MARRIAGE"),
      stateOf(domainsByKey, "PARTNERSHIP")
    ),
    divorce_status: stateOf(domainsByKey, "DIVORCE"),
    multiple_marriage_status: stateOf(domainsByKey, "MULTIPLE_MARRIAGE")
  };
}

function summarizeWork(ledger, domainsByKey) {
  const education = stateOf(domainsByKey, "EDUCATION");
  const job = stateOf(domainsByKey, "JOB");
  const career = stateOf(domainsByKey, "CAREER");
  const business = stateOf(domainsByKey, "BUSINESS");

  const educationActive = ["EXECUTED", "IN_PROGRESS", "PARTIAL"].includes(education);
  const jobActive = ["EXECUTED", "IN_PROGRESS", "PARTIAL"].includes(job);
  const businessActive = ["EXECUTED", "IN_PROGRESS", "PARTIAL"].includes(business);

  return {
    work_ledger: ledger,
    dominant_work_mode: businessActive ? "BUSINESS" : jobActive || career === "PARTIAL" ? "JOB" : educationActive ? "EDUCATION" : "UNSEALED_PATTERN",
    education_active: educationActive,
    job_active: jobActive,
    business_active: businessActive,
    career_status: career
  };
}

function summarizeForeign(ledger, domainsByKey, facts) {
  return {
    foreign_ledger: ledger,
    foreign_shift_count: ledger.length,
    foreign_entry_year: facts?.foreign_entry_year_claim ?? facts?.student_visa_entry_year_claim ?? null,
    route_shift_year: facts?.route_shift_year_claim ?? null,
    settlement_applied_year: facts?.settlement_applied_year_claim ?? null,
    refusal_year: facts?.settlement_refusal_year_claim ?? null,
    appeal_year: facts?.appeal_year_claim ?? null,
    settlement_year: facts?.settlement_year_claim ?? null,
    foreign_process_status: pickState(
      stateOf(domainsByKey, "FOREIGN"),
      stateOf(domainsByKey, "IMMIGRATION"),
      stateOf(domainsByKey, "VISA")
    ),
    settlement_status: stateOf(domainsByKey, "SETTLEMENT")
  };
}

function summarizeSimple(ledger, domainsByKey, keys, statusKey) {
  return {
    [`${statusKey}_ledger`]: ledger,
    [`${statusKey}_status`]: pickState(...keys.map((k) => stateOf(domainsByKey, k)))
  };
}

function buildTruthSummary(domains, weakTimelineMode, base = {}) {
  const events = domains.flatMap((d) => safeArray(d.events));

  const direct = events.filter((e) => ["DIRECT", "DIRECT_FACT", "FACT_ANCHORED"].includes(up(e.evidence_type))).length;
  const patternConfirmed = events.filter((e) => up(e.evidence_type) === "PATTERN_CONFIRMED").length;
  const likely = events.filter((e) => up(e.evidence_type) === "LIKELY_HISTORY").length;
  const namePattern = events.filter((e) => up(e.evidence_type) === "NAME_PATTERN").length;

  let truthLevel = "UNKNOWN";
  if (direct >= 4) truthLevel = "HIGH";
  else if (direct > 0) truthLevel = "FACT_ANCHORED";
  else if (weakTimelineMode && namePattern > 0) truthLevel = "NAME_PATTERN_LOCKED";
  else if (patternConfirmed + likely > 0) truthLevel = "PATTERN_HEAVY";

  return {
    subject_mode: base.subject_mode || null,
    identity_depth: base.identity_depth || null,
    identity_confidence: base.identity_confidence || null,
    precision_mode: base.precision_mode || null,
    weak_timeline_mode: weakTimelineMode,
    exact_timeline_allowed: !weakTimelineMode,
    truth_level: truthLevel,
    direct_evidence_count: direct,
    pattern_confirmed_count: patternConfirmed,
    repeated_pattern_count: events.filter((e) => up(e.evidence_type) === "REPEATED_BEHAVIOUR").length,
    likely_history_count: likely,
    name_pattern_count: namePattern
  };
}

function buildMasterTimeline(domains, weakTimelineMode) {
  const out = [];

  for (const d of safeArray(domains)) {
    for (const e of safeArray(d.events)) {
      out.push({
        domain: d.domain_label,
        domain_key: d.domain_key,
        event_family: e.event_family || null,
        event_type: e.event_type || null,
        event_number: e.event_number || 1,
        status: e.status || "UNKNOWN",
        importance: e.importance || null,
        trigger_phase: e.trigger_phase || null,
        evidence_strength: e.evidence_strength || null,
        evidence_type: e.evidence_type || null,
        date_marker: weakTimelineMode ? null : normalizeYear(e.date_marker ?? e.exact_year),
        exact_year: weakTimelineMode ? null : normalizeYear(e.date_marker ?? e.exact_year),
        month_or_phase: e.month_or_phase || null,
        time_band: exactTimeBandByDomain(d.domain_key),
        likely_age_window: e.likely_age_window || null,
        timing_mode: e.timing_mode || null,
        who_involved: e.who_involved || null,
        impact_summary: e.impact_summary || null,
        carryover_to_present: e.carryover_to_present || "NO"
      });
    }
  }

  return out.sort((a, b) => {
    const ay = a.date_marker ?? a.likely_age_window?.[0] ?? 99999;
    const by = b.date_marker ?? b.likely_age_window?.[0] ?? 99999;
    if (ay !== by) return ay - by;
    return Number(a.event_number || 0) - Number(b.event_number || 0);
  });
}

function buildTimingSummary(timeline, weakTimelineMode) {
  const visible = safeArray(timeline).filter((e) => e.month_or_phase || e.likely_age_window || e.date_marker);
  const first = visible[0] || null;
  const last = visible[visible.length - 1] || null;

  return {
    first_visible_year: weakTimelineMode ? null : first?.date_marker ?? null,
    first_visible_phase: first?.month_or_phase ?? null,
    first_visible_time_band: first?.time_band ?? null,
    first_likely_age_window: first?.likely_age_window ?? null,

    last_visible_year: weakTimelineMode ? null : last?.date_marker ?? null,
    last_visible_phase: last?.month_or_phase ?? null,
    last_visible_time_band: last?.time_band ?? null,
    last_likely_age_window: last?.likely_age_window ?? null,

    total_timed_events: visible.length,
    exact_timeline_allowed: !weakTimelineMode
  };
}

function topDomainKeys(domains, limit = 10) {
  return safeArray(domains).slice(0, limit).map((d) => up(d.domain_key));
}

function hasDomain(keys, list) {
  return list.some((k) => keys.includes(k));
}

function buildRecognitionLines(domains, weakTimelineMode) {
  const keys = topDomainKeys(domains, 10);
  const lines = [];

  if (hasDomain(keys, ["MARRIAGE", "PARTNERSHIP", "LOVE", "DIVORCE", "MULTIPLE_MARRIAGE"])) {
    lines.push("সম্পর্কের জায়গায় তোমার pattern সহজ না—টান আসে, কিন্তু certainty বসতে সময় নেয়।");
  }
  if (hasDomain(keys, ["BUSINESS", "CAREER", "JOB", "SUCCESS"])) {
    lines.push("কাজের জায়গায় তুমি শুধু রুটিন মানুষ না; control, respect আর নিজের জায়গা দরকার।");
  }
  if (hasDomain(keys, ["FOREIGN", "IMMIGRATION", "VISA", "SETTLEMENT"])) {
    lines.push("বিদেশ, দূরত্ব বা জায়গা বদলের রেখা জীবনের ভিতরে আলাদা চাপ তৈরি করে।");
  }
  if (hasDomain(keys, ["DOCUMENT", "LEGAL", "BLOCKAGE"])) {
    lines.push("paperwork, authority বা approval-line জীবনে বারবার delay অথবা হিসাবের জায়গা বানায়।");
  }
  if (hasDomain(keys, ["MONEY", "DEBT", "GAIN", "LOSS"])) {
    lines.push("টাকা আসে-যায়, কিন্তু আসার সঙ্গে দায় বা pressure জুড়ে যায়।");
  }
  if (hasDomain(keys, ["MENTAL", "MIND", "HEALTH"])) {
    lines.push("মাথার ভিতরে চাপ জমে; বাইরে সবসময় তার পুরোটা বোঝা যায় না।");
  }
  if (weakTimelineMode) {
    lines.push("Name-only mode: এগুলো executed event seal নয়—নামের vibration থেকে strong life-pattern reconstruction।");
  }

  return uniq(lines).slice(0, 7);
}

function buildExactDomainSummary(domains) {
  return safeArray(domains)
    .filter((d) => d.primary_exact_event)
    .slice(0, 16)
    .map((d) => ({
      domain_key: d.domain_key,
      domain_label: d.domain_label,
      exact_time_band: d.exact_time_band || null,
      primary_exact_event: d.primary_exact_event,
      alternative_exact_events: d.alternative_exact_events || []
    }));
}

function makeValidationBlock(facts, relationship, foreign, weakTimelineMode) {
  return {
    reality_validation_active: !!facts?.provided,
    weak_timeline_mode: weakTimelineMode,

    marriage_fact_match:
      facts?.marriage_count_claim == null
        ? "NOT_PROVIDED"
        : facts.marriage_count_claim === relationship.marriage_count
        ? "EXACT"
        : "CONFLICT",

    broken_marriage_fact_match:
      facts?.broken_marriage_count == null
        ? "NOT_PROVIDED"
        : facts.broken_marriage_count === relationship.broken_marriage_count
        ? "EXACT"
        : "CONFLICT",

    foreign_fact_match:
      facts?.foreign_entry_year_claim == null && facts?.student_visa_entry_year_claim == null
        ? "NOT_PROVIDED"
        : weakTimelineMode
        ? "LOCKED_BY_MODE"
        : "FACT_ANCHORED",

    settlement_fact_match:
      facts?.settlement_year_claim == null &&
      facts?.settlement_applied_year_claim == null &&
      facts?.settlement_refusal_year_claim == null &&
      facts?.appeal_year_claim == null
        ? "NOT_PROVIDED"
        : weakTimelineMode
        ? "LOCKED_BY_MODE"
        : "FACT_ANCHORED"
  };
}

function domainPhrase(domainKey) {
  const k = up(domainKey);
  const map = {
    MARRIAGE: "সম্পর্ক/বিয়ে",
    DIVORCE: "ভাঙন/দূরত্ব",
    MULTIPLE_MARRIAGE: "পুনরাবৃত্ত সম্পর্ক",
    LOVE: "প্রেম/attachment",
    PARTNERSHIP: "partnership/contract",
    BUSINESS: "ব্যবসা/লেনদেন",
    CAREER: "ক্যারিয়ার/status",
    JOB: "চাকরি/service",
    EDUCATION: "study/learning",
    FOREIGN: "বিদেশ/দূরত্ব",
    IMMIGRATION: "immigration/relocation",
    VISA: "visa/permission",
    SETTLEMENT: "settlement/base",
    DOCUMENT: "document/paperwork",
    LEGAL: "legal/authority",
    MONEY: "money/income",
    DEBT: "debt/liability",
    GAIN: "gain/network",
    LOSS: "loss/exit",
    PROPERTY: "property/home",
    VEHICLE: "vehicle/transport",
    MENTAL: "mental pressure",
    HEALTH: "health/stress",
    BLOCKAGE: "block/delay",
    ENEMY: "opposition/resistance",
    NETWORK: "network/support",
    FAMILY: "family/speech",
    HOME: "home/base",
    SUCCESS: "rise/success"
  };
  return map[k] || String(domainKey || "life pattern").toLowerCase();
}

function domainHumanLine(domain) {
  const k = up(domain?.domain_key);
  const aw = domain?.primary_exact_event?.likely_age_window || domain?.events?.[0]?.likely_age_window || null;
  const ageText = Array.isArray(aw) ? `${aw[0]}–${aw[1]} বয়সের window` : "একটা সময়";

  const map = {
    LOVE: `প্রেম/attachment-এর রেখা বলে ${ageText}-এ মানুষ আসে, কিন্তু ভিতরে certainty আর বাইরে control একসাথে চলে।`,
    MARRIAGE: `সম্পর্ক/partnership-এর হিসাব বলে ${ageText}-এ bond-এর কথা ওঠে, কিন্তু পুরো বসতে delay থাকে।`,
    DIVORCE: `ভাঙন/দূরত্বের pattern বলে ${ageText}-এ ভিতরে আগে ফাটল ধরে, বাইরে পরে বোঝা যায়।`,
    MULTIPLE_MARRIAGE: `পুনরাবৃত্ত সম্পর্কের রেখা বলে একবারের টানে সব শেষ হয় না; একই lesson অন্য রূপে ফিরে আসে।`,
    PARTNERSHIP: `partnership/contract-এর জায়গায় তুমি সহজে পুরো trust দাও না; হিসাব, লাভ-ক্ষতি আর respect একসাথে মাপো।`,
    BUSINESS: `business/trade line বলে তুমি শুধু কাজ করো না—নিজের control, client, deal আর independent zone চাই।`,
    CAREER: `career/status line বলে recognition দরকার, কিন্তু ওঠার আগে pressure আর delay সহ্য করতে হয়।`,
    JOB: `job/service line বলে অন্যের অধীনে থাকলে ভিতরে অস্বস্তি বাড়ে; routine মানো, কিন্তু নিজের চাল রাখতে চাও।`,
    EDUCATION: `study/learning line বলে শেখার capacity আছে, কিন্তু direction বদল বা gap তৈরি হতে পারে।`,
    FOREIGN: `foreign/distance line বলে জীবন এক জায়গায় আটকে থাকে না; দূরত্ব, দেশ, movement বা separation theme কাজ করে।`,
    IMMIGRATION: `immigration/relocation line বলে জায়গা বদল বা external permission জীবনের বড় মোড়ের সাথে জড়ায়।`,
    VISA: `visa/permission line বলে approval, document, waiting আর authority তোমার জীবনে pressure বানায়।`,
    SETTLEMENT: `settlement/base line বলে স্থির ঘর বা base চাই, কিন্তু তা বসতে দেরি করে।`,
    DOCUMENT: `document/paperwork line বলে কাগজ, form, record বা approval-এর জায়গায় delay/হিসাব বারবার আসে।`,
    LEGAL: `legal/authority line বলে নিয়ম, penalty, authority বা official চাপ জীবনে আলাদা সতর্কতা চায়।`,
    MONEY: `money/income line বলে টাকা আসে, কিন্তু একা আসে না—দায়, খরচ বা pressure সঙ্গে আনে।`,
    DEBT: `debt/liability line বলে নেওয়া-দেওয়া, ধার বা responsibility mind-এর উপর চাপ ফেলে।`,
    GAIN: `gain/network line বলে মানুষ/connection থেকে লাভ আসে, কিন্তু সবাইকে বিশ্বাস করলে leakage হয়।`,
    LOSS: `loss/exit line বলে কিছু জিনিস ধরে রাখতে চাইলেও এক সময় ছাড়তে হয়।`,
    PROPERTY: `property/base line বলে ঘর, জমি, asset বা stable base নিয়ে ধীরে ধীরে বড় হিসাব তৈরি হয়।`,
    VEHICLE: `vehicle/transport line বলে movement, delivery, car বা transport তোমার practical life path-এ যুক্ত হতে পারে।`,
    MENTAL: `mental pressure line বলে মাথা বাইরে calm দেখায়, কিন্তু ভিতরে overdrive চলে।`,
    HEALTH: `health/stress line বলে চাপ শরীরে পরে আসে; rest আর rhythm না থাকলে system signal দেয়।`,
    BLOCKAGE: `block/delay line বলে জিনিস আসে, কিন্তু সরাসরি বসে না—delay দিয়ে shape নেয়।`,
    ENEMY: `opposition line বলে সামনে শত্রু কম, কিন্তু আড়ালের resistance বা misread মানুষ pressure বানায়।`,
    NETWORK: `network/support line বলে circle দরকার, কিন্তু circle থেকেই confusion বা expectation বাড়তে পারে।`,
    SUCCESS: `success/rise line বলে তুমি পড়ে থাকো না; ঘুরে গিয়ে আবার position নাও।`
  };

  return map[k] || `${domainPhrase(k)} line জীবনে pattern হিসেবে উঠেছে, কিন্তু exact event seal করার মতো data এখানে নেই।`;
}

function buildHumanForensicNarrative({ input, domains, event_summary, truth_summary, weakTimelineMode }) {
  const name = norm(input?.name) || "এই মানুষ";
  const top = safeArray(domains).slice(0, 8);
  const keys = topDomainKeys(domains, 10);

  const relationshipActive = hasDomain(keys, ["LOVE", "MARRIAGE", "DIVORCE", "MULTIPLE_MARRIAGE", "PARTNERSHIP"]);
  const workActive = hasDomain(keys, ["BUSINESS", "CAREER", "JOB", "SUCCESS", "EDUCATION"]);
  const foreignActive = hasDomain(keys, ["FOREIGN", "IMMIGRATION", "VISA", "SETTLEMENT"]);
  const paperActive = hasDomain(keys, ["DOCUMENT", "LEGAL", "BLOCKAGE"]);
  const moneyActive = hasDomain(keys, ["MONEY", "DEBT", "GAIN", "LOSS", "PROPERTY"]);
  const mentalActive = hasDomain(keys, ["MENTAL", "MIND", "HEALTH"]);

  const mirror = [
    `আমি দেখতে পাচ্ছি, ${name}-এর pattern বাইরে যত calm, ভিতরে তত হিসাবী।`,
    "সে সহজে পুরো কথা খুলে দেয় না; আগে মানুষ, পরিস্থিতি আর লাভ-ক্ষতির ওজন মাপে।",
    "ভেতরে pressure জমলেও বাইরে normal face ধরে রাখার প্রবণতা strong।"
  ];

  const lifeTexture = [];

  if (relationshipActive) {
    lifeTexture.push("সম্পর্কের জায়গায় সে surface bonding-এ তৃপ্ত হয় না; loyalty, respect আর emotional depth না পেলে ভিতরে distance তৈরি হয়।");
  }
  if (workActive) {
    lifeTexture.push("কাজের ক্ষেত্রে সে শুধু salary/routine মানুষ না; নিজের control, decision power আর visible result দরকার।");
  }
  if (foreignActive) {
    lifeTexture.push("জীবনের ভিতরে distance, relocation, foreign অথবা জায়গা বদলের রেখা আছে—এক জায়গায় আটকে থাকলে ভিতরে অস্থিরতা বাড়ে।");
  }
  if (paperActive) {
    lifeTexture.push("document, authority বা approval-এর জায়গায় delay/হিসাব তাকে বারবার বাস্তবতার সামনে দাঁড় করায়।");
  }
  if (moneyActive) {
    lifeTexture.push("টাকার flow সরল না; income-এর সাথে দায়িত্ব, খরচ বা চাপ জুড়ে যায়।");
  }
  if (mentalActive) {
    lifeTexture.push("mental pressure সে চেপে রাখে; মানুষ সবসময় বুঝে না ভিতরে কত হিসাব চলছে।");
  }

  const topLines = top.slice(0, 6).map(domainHumanLine);

  const sealLine = weakTimelineMode
    ? "এটা executed event seal নয়; name-only pattern থেকে human-life reconstruction। DOB/TOB/POB দিলে same engine exact timeline stronger করবে।"
    : "এখানে timeline seal stronger, কারণ birth/fact support active।";

  const deepLine = relationshipActive
    ? "গভীর কথা হলো—সে মানুষ ছাড়ে দেরিতে, কিন্তু ভিতরে দূরত্ব আগে বানায়।"
    : workActive
    ? "গভীর কথা হলো—সে থেমে থাকলে শুকিয়ে যায়; নিজের জায়গা না পেলে ভিতরে আগুন জমে।"
    : "গভীর কথা হলো—তার জীবন ভাঙে না, ঘুরে যায়।";

  return {
    narrative_mode: "HUMAN_FORENSIC_TRANSLATOR_V3",
    subject_name: name,
    mirror_lines: mirror,
    life_texture_lines: uniq(lifeTexture).slice(0, 6),
    domain_human_lines: uniq(topLines).slice(0, 7),
    recognition_lines: buildRecognitionLines(domains, weakTimelineMode),
    seal_line: sealLine,
    deep_line: deepLine,
    truth_level: truth_summary?.truth_level || "UNKNOWN",
    verdict_tone: weakTimelineMode ? "FULL_PATTERN_NOT_EXECUTED_SEAL" : "EVIDENCE_TIMELINE_VERDICT"
  };
}

function buildForensicVerdict(question_profile, event_summary, truth_summary) {
  return {
    forensic_direction:
      `${question_profile?.primary_domain || "GENERAL"} scan: ` +
      `${event_summary.total_estimated_events} events/signatures, ` +
      `${event_summary.total_major_events} major signals. ` +
      `Relationship ${event_summary.relationship.current_marriage_status}. ` +
      `Foreign ${event_summary.foreign.foreign_process_status}. ` +
      `Settlement ${event_summary.foreign.settlement_status}. ` +
      `Work ${event_summary.work.dominant_work_mode}. ` +
      `Truth level ${truth_summary.truth_level}.`,
    validation_state: "STABLE"
  };
}

function buildLokkothaSummary(question_profile, event_summary, truth_summary) {
  return {
    text:
      `${low(question_profile?.primary_domain || "general")}-এর খাতা শুধু সংখ্যা না; ` +
      `বড় চিহ্ন ${event_summary.total_major_events}, ` +
      `ভাঙা চিহ্ন ${event_summary.total_broken_events}, ` +
      `সত্যের স্তর ${truth_summary.truth_level}.`
  };
}

function buildProjectPasteBlock({
  input,
  question_profile,
  domains,
  event_summary,
  validation_block,
  forensic_verdict,
  lokkotha_summary,
  timeline,
  human_forensic_narrative,
  weakTimelineMode
}) {
  const lines = [];

  lines.push("PAST HUMAN FORENSIC NANO BLOCK V3");
  lines.push(`Subject: ${input?.name || "UNKNOWN"}`);
  lines.push(`Primary Domain: ${question_profile?.primary_domain || "GENERAL"}`);
  lines.push(`Truth Level: ${event_summary.truth_summary.truth_level}`);
  lines.push(`Exact Timeline Allowed: ${event_summary.truth_summary.exact_timeline_allowed ? "YES" : "NO"}`);
  lines.push(`Mode Note: ${weakTimelineMode ? "NAME_ONLY_PATTERN_RECONSTRUCTION_NO_EXECUTED_SEAL" : "TIMELINE_OR_FACT_SUPPORTED"}`);
  lines.push("");

  lines.push("CLIENT-FACING HUMAN MIRROR:");
  for (const l of safeArray(human_forensic_narrative?.mirror_lines)) lines.push(`- ${l}`);
  lines.push("");

  lines.push("LIFE TEXTURE:");
  for (const l of safeArray(human_forensic_narrative?.life_texture_lines)) lines.push(`- ${l}`);
  lines.push("");

  lines.push("DOMAIN → HUMAN TRANSLATION:");
  for (const l of safeArray(human_forensic_narrative?.domain_human_lines)) lines.push(`- ${l}`);
  lines.push("");

  lines.push("RECOGNITION LINES:");
  for (const l of safeArray(human_forensic_narrative?.recognition_lines)) lines.push(`- ${l}`);
  lines.push("");

  lines.push(`DEEP LINE: ${human_forensic_narrative?.deep_line || "জীবন ভাঙে না, ঘুরে যায়।"}`);
  lines.push(`SEAL LINE: ${human_forensic_narrative?.seal_line || ""}`);
  lines.push("");

  lines.push("MACHINE SUMMARY:");
  lines.push(`Top Domains: ${domains.slice(0, 8).map((d) => d.domain_label).join(" | ")}`);
  lines.push(`Total Estimated Events: ${event_summary.total_estimated_events}`);
  lines.push(`Total Major Events: ${event_summary.total_major_events}`);
  lines.push(`Total Minor Events: ${event_summary.total_minor_events}`);
  lines.push(`Direct Evidence Count: ${event_summary.truth_summary.direct_evidence_count}`);
  lines.push(`Name Pattern Count: ${event_summary.truth_summary.name_pattern_count}`);
  lines.push(`Marriage Count: ${event_summary.relationship.marriage_count}`);
  lines.push(`Broken Marriage Count: ${event_summary.relationship.broken_marriage_count}`);
  lines.push(`Current Marriage Status: ${event_summary.relationship.current_marriage_status}`);
  lines.push(`Dominant Work Mode: ${event_summary.work.dominant_work_mode}`);
  lines.push(`Foreign Entry Year: ${event_summary.foreign.foreign_entry_year ?? "UNKNOWN"}`);
  lines.push(`Settlement Status: ${event_summary.foreign.settlement_status}`);
  lines.push(`Foreign Process Status: ${event_summary.foreign.foreign_process_status}`);
  lines.push(`Marriage Validation: ${validation_block.marriage_fact_match}`);
  lines.push(`Foreign Validation: ${validation_block.foreign_fact_match}`);
  lines.push(`Direction: ${forensic_verdict.forensic_direction}`);
  lines.push(`Lokkotha: ${lokkotha_summary.text}`);
  lines.push("");

  lines.push("TIMELINE / WINDOW DATA:");
  for (const e of timeline.slice(0, 18)) {
    lines.push(
      `${e.domain} | ${e.event_type} | ${e.status} | ${e.date_marker ?? "UNDATED"} | ` +
      `${e.month_or_phase ?? "NO_PHASE"} | ${e.time_band ?? "NO_TIME"} | ${e.evidence_type ?? "NO_EVIDENCE"} | ` +
      `${e.likely_age_window ? `AGE:${e.likely_age_window.join("-")}` : "NO_AGE_WINDOW"}`
    );
  }

  lines.push("PAST HUMAN FORENSIC NANO BLOCK V3 END");
  return lines.join("\n");
}

export function runEvidenceLayer({
  input,
  facts,
  question_profile,
  ranked_domains,
  master_timeline,
  carryover,
  validation_layer,
  subject_context,
  birth_context
}) {
  const modeFlags = getModeFlags(subject_context, birth_context);
  const weakTimelineMode = modeFlags.weakTimelineMode;

  const domains = rebuildDomains(ranked_domains, weakTimelineMode);
  const domainsByKey = new Map(domains.map((d) => [up(d.domain_key), d]));

  const relationshipLedger = buildLedger(domains, ["MARRIAGE", "DIVORCE", "MULTIPLE_MARRIAGE", "LOVE", "PARTNERSHIP"]);
  const workLedger = buildLedger(domains, ["EDUCATION", "JOB", "CAREER", "BUSINESS", "SUCCESS"]);
  const foreignLedger = buildLedger(domains, ["FOREIGN", "SETTLEMENT", "IMMIGRATION", "VISA", "DOCUMENT"]);
  const healthLedger = buildLedger(domains, ["HEALTH", "MENTAL", "MIND"]);
  const moneyLedger = buildLedger(domains, ["MONEY", "DEBT", "GAIN", "LOSS", "PROPERTY", "VEHICLE", "HOME"]);
  const conflictLedger = buildLedger(domains, ["LEGAL", "DOCUMENT", "ENEMY", "BLOCKAGE"]);

  const relationship = summarizeRelationship(relationshipLedger, domainsByKey, facts || {});
  const work = summarizeWork(workLedger, domainsByKey);
  const foreign = summarizeForeign(foreignLedger, domainsByKey, facts || {});
  const health = summarizeSimple(healthLedger, domainsByKey, ["HEALTH", "MENTAL", "MIND"], "health");
  const money = summarizeSimple(moneyLedger, domainsByKey, ["MONEY", "DEBT", "GAIN", "LOSS", "PROPERTY"], "money");
  const conflict = summarizeSimple(conflictLedger, domainsByKey, ["LEGAL", "DOCUMENT", "ENEMY", "BLOCKAGE"], "conflict");

  const timeline = buildMasterTimeline(domains, weakTimelineMode);

  const truth_summary = buildTruthSummary(domains, weakTimelineMode, {
    subject_mode: subject_context?.subject_mode,
    identity_depth: subject_context?.identity_depth,
    identity_confidence: subject_context?.identity_confidence,
    precision_mode: birth_context?.precision_mode
  });

  const event_summary = {
    total_estimated_events: domains.reduce((a, d) => a + safeArray(d.events).length, 0),
    total_major_events: domains.reduce((a, d) => a + Number(d.major_event_count || 0), 0),
    total_minor_events: domains.reduce((a, d) => a + Number(d.minor_event_count || 0), 0),
    total_broken_events: domains.reduce((a, d) => a + Number(d.broken_event_count || 0), 0),
    total_active_events: domains.reduce((a, d) => a + Number(d.active_event_count || 0), 0),

    relationship,
    work,
    foreign,
    health,
    money,
    conflict,

    top_5_domains: domains.slice(0, 5).map((d) => d.domain_label),
    carryover_present: !!carryover?.present_carryover_detected,
    timing_summary: buildTimingSummary(timeline, weakTimelineMode),
    recognition_timeline: timeline.slice(0, 12),
    truth_summary,
    recognition_lines: buildRecognitionLines(domains, weakTimelineMode)
  };

  const validation_block = makeValidationBlock(facts || {}, relationship, foreign, weakTimelineMode);
  const forensic_verdict = buildForensicVerdict(question_profile || {}, event_summary, truth_summary);
  const lokkotha_summary = buildLokkothaSummary(question_profile || {}, event_summary, truth_summary);
  const exact_domain_summary = buildExactDomainSummary(domains);

  const human_forensic_narrative = buildHumanForensicNarrative({
    input: input || {},
    domains,
    event_summary,
    truth_summary,
    weakTimelineMode
  });

  const project_paste_block = buildProjectPasteBlock({
    input: input || {},
    question_profile: question_profile || {},
    domains,
    event_summary,
    validation_block,
    forensic_verdict,
    lokkotha_summary,
    timeline,
    human_forensic_narrative,
    weakTimelineMode
  });

  return {
    ranked_domains: domains,
    exact_domain_summary,
    event_summary,
    validation_block,
    forensic_verdict,
    lokkotha_summary,
    human_forensic_narrative,
    project_paste_block,
    master_timeline: timeline,
    validation_layer_passthrough: validation_layer || null
  };
}