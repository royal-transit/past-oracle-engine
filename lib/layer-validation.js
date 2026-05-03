// lib/layer-validation.js
// UNIVERSAL VALIDATION LAYER
// HARD-LOCK VERSION + KP PAST VALIDATION
// KP CUSP FIRST → DOMAIN HOUSE-HIT FALLBACK

function normalizeText(v) {
  return String(v || "").trim().toLowerCase();
}

function normalizeStatus(v) {
  return String(v || "").trim().toUpperCase();
}

function findDomain(domains, key) {
  return (domains || []).find((d) => d.domain_key === key) || null;
}

function finalStateOf(domains, key) {
  return findDomain(domains, key)?.final_state || "UNKNOWN";
}

function hasQuestionWord(question, words) {
  const q = normalizeText(question);
  return words.some((w) => q.includes(normalizeText(w)));
}

function buildSectorState(finalizedDomains) {
  return {
    marriage: finalStateOf(finalizedDomains, "MARRIAGE"),
    divorce: finalStateOf(finalizedDomains, "DIVORCE"),
    multiple_marriage: finalStateOf(finalizedDomains, "MULTIPLE_MARRIAGE"),
    foreign: finalStateOf(finalizedDomains, "FOREIGN"),
    settlement: finalStateOf(finalizedDomains, "SETTLEMENT"),
    immigration: finalStateOf(finalizedDomains, "IMMIGRATION"),
    visa: finalStateOf(finalizedDomains, "VISA"),
    education: finalStateOf(finalizedDomains, "EDUCATION"),
    job: finalStateOf(finalizedDomains, "JOB"),
    career: finalStateOf(finalizedDomains, "CAREER"),
    business: finalStateOf(finalizedDomains, "BUSINESS"),
    money: finalStateOf(finalizedDomains, "MONEY"),
    property: finalStateOf(finalizedDomains, "PROPERTY"),
    health: finalStateOf(finalizedDomains, "HEALTH"),
    mental: finalStateOf(finalizedDomains, "MENTAL"),
    legal: finalStateOf(finalizedDomains, "LEGAL"),
    family: finalStateOf(finalizedDomains, "FAMILY"),
    children: finalStateOf(finalizedDomains, "CHILDREN"),
    blockage: finalStateOf(finalizedDomains, "BLOCKAGE"),
    enemy: finalStateOf(finalizedDomains, "ENEMY")
  };
}

function detectQuestionIntent(question) {
  const q = normalizeText(question);

  return {
    asks_marriage: hasQuestionWord(q, ["marriage", "biye", "bea", "wedding"]),
    asks_divorce: hasQuestionWord(q, ["divorce", "separation", "talak"]),
    asks_foreign: hasQuestionWord(q, ["foreign", "abroad", "uk", "visa", "immigration", "bidesh"]),
    asks_settlement: hasQuestionWord(q, ["settlement", "permanent", "base"]),
    asks_education: hasQuestionWord(q, ["study", "education", "university", "student", "porashuna"]),
    asks_job: hasQuestionWord(q, ["job", "work", "employment", "service"]),
    asks_business: hasQuestionWord(q, ["business", "trade", "deal"]),
    asks_money: hasQuestionWord(q, ["money", "income", "cash", "earning", "finance", "taka"]),
    asks_property: hasQuestionWord(q, ["property", "house", "home", "land", "asset", "vehicle"]),
    asks_health: hasQuestionWord(q, ["health", "illness", "disease", "body", "sick"]),
    asks_mental: hasQuestionWord(q, ["mental", "stress", "fear", "pressure", "mind"]),
    asks_legal: hasQuestionWord(q, ["legal", "court", "authority", "case", "document"]),
    asks_family: hasQuestionWord(q, ["family", "mother", "father", "home"]),
    asks_children: hasQuestionWord(q, ["children", "child", "baby"]),
    asks_general: q.includes("past life") || q.includes("past") || q.includes("life")
  };
}

function ruleValidateSector({
  sector,
  asks,
  finalState,
  expectedExecuted = null,
  reasonIfConflict,
  correction
}) {
  if (!asks) {
    return {
      sector,
      checked: false,
      question_validity: "NOT_TRIGGERED",
      reality_conflict: "NO",
      correction_needed: "NO",
      detected_correction: null,
      backend_state: finalState
    };
  }

  if (expectedExecuted === null) {
    return {
      sector,
      checked: true,
      question_validity: "VALID",
      reality_conflict: "NO",
      correction_needed: "NO",
      detected_correction: null,
      backend_state: finalState
    };
  }

  const isExecutedLike = ["EXECUTED", "PARTIAL", "IN_PROGRESS"].includes(normalizeStatus(finalState));
  const conflict = expectedExecuted === true ? !isExecutedLike : isExecutedLike;

  return {
    sector,
    checked: true,
    question_validity: conflict ? "INVALID" : "VALID",
    reality_conflict: conflict ? "YES" : "NO",
    correction_needed: conflict ? "YES" : "NO",
    conflict_reason: conflict ? reasonIfConflict : null,
    detected_correction: conflict ? correction : null,
    backend_state: finalState
  };
}

function summarizeValidation(results) {
  const checked = results.filter((r) => r.checked);
  const conflicts = checked.filter((r) => r.reality_conflict === "YES");

  return {
    checked_sector_count: checked.length,
    conflict_sector_count: conflicts.length,
    overall_question_validity: conflicts.length ? "DISTORTED_OR_CONFLICTED" : "STABLE",
    overall_reality_conflict: conflicts.length ? "YES" : "NO",
    correction_needed: conflicts.length ? "YES" : "NO",
    dominant_conflict_sector: conflicts[0]?.sector || null
  };
}

function eventDomainFromInput(eventInput = {}) {
  const text = normalizeText(
    `${eventInput.event || ""} ${eventInput.domain || ""} ${eventInput.question || ""}`
  );

  if (hasQuestionWord(text, ["call", "message", "phone", "reply", "contact", "communication", "kotha"]))
    return "COMMUNICATION";

  if (hasQuestionWord(text, ["money", "payment", "income", "cash", "earning", "finance", "taka"]))
    return "MONEY";

  if (hasQuestionWord(text, ["job", "work", "career", "employment", "interview"]))
    return "JOB";

  if (hasQuestionWord(text, ["business", "deal", "trade", "customer", "order"]))
    return "BUSINESS";

  if (hasQuestionWord(text, ["marriage", "relationship", "love", "wife", "husband", "biye"]))
    return "RELATIONSHIP";

  if (hasQuestionWord(text, ["foreign", "visa", "uk", "abroad", "immigration", "travel", "bidesh"]))
    return "FOREIGN";

  if (hasQuestionWord(text, ["court", "legal", "authority", "case", "document", "fine", "appeal"]))
    return "LEGAL";

  if (hasQuestionWord(text, ["health", "sick", "body", "illness", "doctor"]))
    return "HEALTH";

  return "GENERAL";
}

function kpCuspsForDomain(domain) {
  const map = {
    COMMUNICATION: ["3", "7", "11"],
    MONEY: ["2", "10", "11"],
    JOB: ["6", "10", "11"],
    BUSINESS: ["2", "7", "10", "11"],
    RELATIONSHIP: ["5", "7", "11"],
    FOREIGN: ["3", "4", "9", "12"],
    LEGAL: ["6", "8", "10"],
    HEALTH: ["1", "6", "8", "12"],
    GENERAL: ["1", "3", "7", "10", "11"]
  };

  return map[domain] || map.GENERAL;
}

function isActiveCusp(cusp) {
  return !!(cusp && (cusp.sub_lord || cusp.star_lord || cusp.sign || cusp.longitude != null));
}

function collectHouseHits(domainResults, requiredCusps) {
  const hits = [];
  const required = new Set(requiredCusps.map(String));

  for (const domain of domainResults || []) {
    for (const hit of domain?.house_hits || []) {
      const house = String(hit?.house || "");
      if (required.has(house)) {
        hits.push({
          house,
          planet: hit?.planet || null,
          domain_key: domain?.domain_key || null
        });
      }
    }
  }

  const seen = new Set();
  return hits.filter((h) => {
    const key = `${h.house}|${h.planet}|${h.domain_key}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function kpPastValidation(snapshot = {}, eventInput = {}) {
  const domain = eventDomainFromInput(eventInput);
  const requiredCusps = kpCuspsForDomain(domain);

  const kp = snapshot.kp_cusps || snapshot.kp || {};
  const moon = snapshot.moon || {};
  const aspects = snapshot.aspects || snapshot.aspects_summary || [];
  const dasha = snapshot.dasha || {};
  const domainResults = snapshot.domain_results || snapshot.finalized_domains || [];

  let score = 0;
  const reasons = [];
  const activatedCusps = [];

  for (const cuspNo of requiredCusps) {
    if (isActiveCusp(kp[cuspNo])) {
      score += 2;
      activatedCusps.push(cuspNo);
    }
  }

  if (activatedCusps.length) {
    reasons.push(`KP domain cusps active: ${activatedCusps.join(",")}`);
  }

  const houseFallbackHits = collectHouseHits(domainResults, requiredCusps);

  if (!activatedCusps.length && houseFallbackHits.length) {
    const fallbackHouses = [...new Set(houseFallbackHits.map((h) => h.house))];
    score += Math.min(4, fallbackHouses.length);
    reasons.push(`House-hit fallback active: ${fallbackHouses.join(",")}`);
  }

  if (moon?.nakshatra || moon?.nakshatra_lord || moon?.sign) {
    score += 1;
    reasons.push("Moon layer present");
  }

  if (Array.isArray(aspects) && aspects.length > 0) {
    score += 1;
    reasons.push("Aspect layer present");
  }

  if (dasha?.status === "active") {
    score += 2;
    reasons.push("Dasha layer active");
  }

  let status = "WEAK_MATCH";
  if (score >= 5) status = "STRONG_MATCH";
  else if (score >= 3) status = "PARTIAL_MATCH";

  return {
    kp_past_validation_active: true,
    event_domain: domain,
    required_kp_cusps: requiredCusps,
    activated_kp_cusps: activatedCusps,
    house_hit_fallback_used: !activatedCusps.length && houseFallbackHits.length > 0,
    fallback_house_hits: houseFallbackHits,
    kp_validation_score: score,
    kp_validation_status: status,
    kp_validation_reasons: reasons,
    mode_note: "PAST_KP_VALIDATION_ONLY_NOT_FUTURE_DECISION"
  };
}

export function runValidationLayer({ question, finalizedDomains, snapshot = null, eventInput = null }) {
  const intent = detectQuestionIntent(question);
  const state = buildSectorState(finalizedDomains);

  const results = [
    ruleValidateSector({
      sector: "MARRIAGE",
      asks: intent.asks_marriage,
      finalState: state.marriage,
      expectedExecuted: false,
      reasonIfConflict: "Marriage already appears executed or partially executed in backend.",
      correction: "already_married_or_relationship_executed"
    }),
    ruleValidateSector({
      sector: "DIVORCE",
      asks: intent.asks_divorce,
      finalState: state.divorce,
      expectedExecuted: false,
      reasonIfConflict: "Divorce or separation already appears executed or partially executed in backend.",
      correction: "divorce_already_detected"
    }),
    ruleValidateSector({
      sector: "FOREIGN",
      asks: intent.asks_foreign,
      finalState: state.foreign,
      expectedExecuted: false,
      reasonIfConflict: "Foreign / migration process already appears executed or partially executed in backend.",
      correction: "foreign_process_already_detected"
    }),
    ruleValidateSector({
      sector: "SETTLEMENT",
      asks: intent.asks_settlement,
      finalState: state.settlement,
      expectedExecuted: false,
      reasonIfConflict: "Settlement / base formation already appears executed or partially executed in backend.",
      correction: "settlement_already_detected"
    }),
    ruleValidateSector({ sector: "EDUCATION", asks: intent.asks_education, finalState: state.education }),
    ruleValidateSector({ sector: "JOB", asks: intent.asks_job, finalState: state.job }),
    ruleValidateSector({ sector: "BUSINESS", asks: intent.asks_business, finalState: state.business }),
    ruleValidateSector({ sector: "MONEY", asks: intent.asks_money, finalState: state.money }),
    ruleValidateSector({ sector: "PROPERTY", asks: intent.asks_property, finalState: state.property }),
    ruleValidateSector({ sector: "HEALTH", asks: intent.asks_health, finalState: state.health }),
    ruleValidateSector({ sector: "MENTAL", asks: intent.asks_mental, finalState: state.mental }),
    ruleValidateSector({ sector: "LEGAL", asks: intent.asks_legal, finalState: state.legal }),
    ruleValidateSector({ sector: "FAMILY", asks: intent.asks_family, finalState: state.family }),
    ruleValidateSector({ sector: "CHILDREN", asks: intent.asks_children, finalState: state.children })
  ];

  const validationSnapshot = snapshot
    ? {
        ...snapshot,
        domain_results:
          snapshot.domain_results ||
          snapshot.finalized_domains ||
          finalizedDomains ||
          []
      }
    : null;

  return {
    question_intent: intent,
    sector_state: state,
    sector_validation: results,
    validation_summary: summarizeValidation(results),
    kp_past_validation:
      validationSnapshot && eventInput ? kpPastValidation(validationSnapshot, eventInput) : null
  };
}