// lib/layer-validation.js
// UNIVERSAL VALIDATION LAYER
// HARD-LOCK VERSION

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
    asks_money: hasQuestionWord(q, ["money", "income", "cash", "earning", "finance"]),
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

  const isExecutedLike = ["EXECUTED", "PARTIAL"].includes(normalizeStatus(finalState));
  const conflict =
    expectedExecuted === true ? !isExecutedLike : isExecutedLike;

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

export function runValidationLayer({ question, finalizedDomains }) {
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

    ruleValidateSector({
      sector: "EDUCATION",
      asks: intent.asks_education,
      finalState: state.education,
      expectedExecuted: null,
      reasonIfConflict: null,
      correction: null
    }),

    ruleValidateSector({
      sector: "JOB",
      asks: intent.asks_job,
      finalState: state.job,
      expectedExecuted: null,
      reasonIfConflict: null,
      correction: null
    }),

    ruleValidateSector({
      sector: "BUSINESS",
      asks: intent.asks_business,
      finalState: state.business,
      expectedExecuted: null,
      reasonIfConflict: null,
      correction: null
    }),

    ruleValidateSector({
      sector: "MONEY",
      asks: intent.asks_money,
      finalState: state.money,
      expectedExecuted: null,
      reasonIfConflict: null,
      correction: null
    }),

    ruleValidateSector({
      sector: "PROPERTY",
      asks: intent.asks_property,
      finalState: state.property,
      expectedExecuted: null,
      reasonIfConflict: null,
      correction: null
    }),

    ruleValidateSector({
      sector: "HEALTH",
      asks: intent.asks_health,
      finalState: state.health,
      expectedExecuted: null,
      reasonIfConflict: null,
      correction: null
    }),

    ruleValidateSector({
      sector: "MENTAL",
      asks: intent.asks_mental,
      finalState: state.mental,
      expectedExecuted: null,
      reasonIfConflict: null,
      correction: null
    }),

    ruleValidateSector({
      sector: "LEGAL",
      asks: intent.asks_legal,
      finalState: state.legal,
      expectedExecuted: null,
      reasonIfConflict: null,
      correction: null
    }),

    ruleValidateSector({
      sector: "FAMILY",
      asks: intent.asks_family,
      finalState: state.family,
      expectedExecuted: null,
      reasonIfConflict: null,
      correction: null
    }),

    ruleValidateSector({
      sector: "CHILDREN",
      asks: intent.asks_children,
      finalState: state.children,
      expectedExecuted: null,
      reasonIfConflict: null,
      correction: null
    })
  ];

  return {
    question_intent: intent,
    sector_state: state,
    sector_validation: results,
    validation_summary: summarizeValidation(results)
  };
}