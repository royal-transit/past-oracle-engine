// lib/layer-astro.js
// UNIVERSAL PAST NANO CORE - FULL REPLACEMENT
// CLEAN YEAR BINDING VERSION
// PATTERN ≠ EXECUTED
// FOREIGN ENTRY ≠ ROUTE SHIFT ≠ SETTLEMENT ≠ APPEAL
// NO FAKE YEAR FOR PATTERN EVENTS
// CLIENT-SAFE UNIVERSAL LOGIC

const round2 = (n) =>
  Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;

function signToIndex(sign) {
  const signs = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
  ];
  return signs.indexOf(sign);
}

function normalizeYear(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 1900 && n <= 2100 ? n : null;
}

function hasAny(text, list) {
  const t = String(text || "").toLowerCase();
  return list.some((x) => t.includes(String(x).toLowerCase()));
}

function makeEvent({
  event_family = null,
  event_type = "domain event",
  event_number = 1,
  exact_year = null,
  month_or_phase = null,
  evidence_strength = "moderate",
  status = "PENDING",
  importance = "MINOR",
  trigger_phase = null,
  carryover_to_present = "NO",
  who_involved = null,
  impact_summary = null,
  evidence_type = "PATTERN_ONLY"
}) {
  const y = normalizeYear(exact_year);

  return {
    event_family,
    event_type,
    event_number,
    exact_year: y,
    month_or_phase: y ? "year-anchored phase" : (month_or_phase || "phase only"),
    evidence_strength,
    status,
    importance,
    trigger_phase,
    carryover_to_present,
    who_involved,
    impact_summary,
    evidence_type
  };
}

function strengthLabel(score) {
  return score >= 8 ? "strong" : score >= 5 ? "moderate" : "light";
}

function buildHints(facts) {
  const raw = String(facts?.raw_text || "").toLowerCase();

  return {
    raw_text: raw,

    isStudent: hasAny(raw, ["student", "study", "university", "college", "school", "exam"]),
    hasJob: hasAny(raw, ["job", "work", "employment", "service", "salary", "chakri"]),
    hasBusiness: hasAny(raw, ["business", "trade", "shop", "deal", "company", "client"]),

    foreignIntent: hasAny(raw, ["foreign", "abroad", "uk", "visa", "immigration", "bidesh"]),
    foreignExecuted:
      facts?.foreign_entry_year_claim != null ||
      hasAny(raw, ["came to uk", "came uk", "entered uk", "arrived uk", "moved abroad"]),

    settlementMention: hasAny(raw, ["settlement", "ilr", "permanent", "citizenship"]),
    legalMention: hasAny(raw, ["legal", "court", "case", "appeal", "tribunal", "refused", "rejected"]),
    documentMention: hasAny(raw, ["document", "paper", "paperwork", "approval", "letter", "form"]),

    marriageMention: hasAny(raw, ["marriage", "married", "biye", "bea", "wife", "husband"]),
    divorceMention: hasAny(raw, ["divorce", "separation", "talak"]),
    relationshipMention: hasAny(raw, ["relationship", "love", "partner", "proposal"]),

    childrenMention: hasAny(raw, ["child", "children", "baby", "son", "daughter"]),
    familyMention: hasAny(raw, ["family", "mother", "father", "ma", "baba", "parent"]),

    healthMention: hasAny(raw, ["health", "ill", "sick", "disease", "hospital", "doctor"]),
    mentalMention: hasAny(raw, ["mental", "stress", "fear", "anxiety", "depression", "tension"]),

    moneyMention: hasAny(raw, ["money", "income", "cash", "debt", "loan", "finance", "taka"]),
    propertyMention: hasAny(raw, ["property", "house", "flat", "land", "vehicle", "car", "asset"]),

    spiritualMention: hasAny(raw, ["spiritual", "religion", "zikr", "sadhana", "pir"]),

    marriage_count_claim: facts?.marriage_count_claim ?? null,
    broken_marriage_count: facts?.broken_marriage_count ?? null,

    foreign_entry_year_claim: facts?.foreign_entry_year_claim ?? null,
    student_visa_entry_year_claim: facts?.student_visa_entry_year_claim ?? null,
    route_shift_year_claim: facts?.route_shift_year_claim ?? null,
    settlement_year_claim: facts?.settlement_year_claim ?? null,
    settlement_applied_year_claim: facts?.settlement_applied_year_claim ?? null,
    settlement_refusal_year_claim: facts?.settlement_refusal_year_claim ?? null,
    appeal_year_claim: facts?.appeal_year_claim ?? null,

    job_start_year_claim: facts?.job_start_year_claim ?? null,
    business_start_year_claim: facts?.business_start_year_claim ?? null,
    study_start_year_claim: facts?.study_start_year_claim ?? null,
    property_year_claim: facts?.property_year_claim ?? null,
    debt_year_claim: facts?.debt_year_claim ?? null
  };
}

export function normalizeEvidence(packet) {
  const natalPlanets = packet?.natal?.planets || [];
  const transitPlanets = packet?.transit_now?.planets || [];
  const aspects = packet?.natal?.aspects || [];
  const asc = packet?.natal?.ascendant || null;

  const natalMap = {};
  natalPlanets.forEach((p) => {
    natalMap[(p.planet || "").toUpperCase()] = p;
  });

  const transitMap = {};
  transitPlanets.forEach((p) => {
    transitMap[(p.planet || "").toUpperCase()] = p;
  });

  const housesByPlanet = {};
  if (asc) {
    const ascIndex = signToIndex(asc.sign);
    natalPlanets.forEach((p) => {
      const pIndex = signToIndex(p.sign);
      if (ascIndex >= 0 && pIndex >= 0) {
        housesByPlanet[(p.planet || "").toUpperCase()] =
          ((pIndex - ascIndex + 12) % 12) + 1;
      }
    });
  }

  return {
    natalMap,
    transitMap,
    aspects,
    ascendant: asc,
    housesByPlanet,
    dasha: packet?.dasha || {},
    kp: packet?.kp || {},
    meta: {
      natal_planet_count: natalPlanets.length,
      transit_planet_count: transitPlanets.length,
      aspect_count: aspects.length,
      ascendant_present: !!asc,
      house_mapping_present: Object.keys(housesByPlanet).length > 0
    }
  };
}

export const DOMAIN_REGISTRY = [
  ["IDENTITY", "Identity / Self / Direction", [1]],
  ["MIND", "Mind / Emotion / Response", [4, 5]],
  ["COMMUNICATION", "Communication / Effort / Siblings", [3]],
  ["FAMILY", "Family / Wealth / Speech", [2]],
  ["HOME", "Home / Mother / Base", [4]],
  ["LOVE", "Love / Romance / Attachment", [5, 7]],
  ["CHILDREN", "Children / Creativity / Continuity", [5]],
  ["HEALTH", "Health / Disease / Stress", [6, 8, 12]],
  ["MARRIAGE", "Marriage / Partnership", [7, 2, 8]],
  ["DIVORCE", "Separation / Divorce / Break", [7, 8, 6]],
  ["MULTIPLE_MARRIAGE", "Repeated Union Patterns", [7, 8, 2]],
  ["FOREIGN", "Foreign / Distance / Withdrawal", [9, 12, 4]],
  ["SETTLEMENT", "Settlement / Base Formation", [4, 12, 10]],
  ["IMMIGRATION", "Immigration / Relocation Path", [9, 12, 4, 10]],
  ["VISA", "Visa / Permission / External Clearance", [9, 12, 10]],
  ["DOCUMENT", "Documents / Records / Paperwork", [3, 6, 10]],
  ["CAREER", "Career / Authority / Public Role", [10, 6]],
  ["JOB", "Job / Service / Employment", [6, 10]],
  ["BUSINESS", "Business / Trade / Deal", [7, 10, 11]],
  ["MONEY", "Money / Income / Liquidity", [2, 11, 6]],
  ["DEBT", "Debt / Liability / Pressure", [6, 8]],
  ["PROPERTY", "Property / Residence / Land", [4, 11, 2]],
  ["VEHICLE", "Vehicle / Transport Asset", [4, 3]],
  ["EDUCATION", "Study / Learning / University", [4, 5, 9]],
  ["LEGAL", "Legal / Penalty / Authority", [6, 7, 10]],
  ["ENEMY", "Opponent / Conflict / Resistance", [6]],
  ["GAIN", "Gain / Network / Fulfilment", [11]],
  ["LOSS", "Loss / Isolation / Exit", [12]],
  ["PARTNERSHIP", "Partnership / Contract", [7, 11]],
  ["SPIRITUAL", "Spiritual Turning / Withdrawal", [9, 12, 8]],
  ["MENTAL", "Mental Pressure / Fear / Overdrive", [1, 4, 8]],
  ["NETWORK", "Network / Circle / Support", [11, 3]],
  ["SUCCESS", "Success / Rise / Execution", [10, 11, 5]],
  ["FAILURE", "Failure / Collapse / Miss", [8, 6, 12]],
  ["RELIGION", "Religion / Dharma / Belief", [9]],
  ["BLOCKAGE", "Block / Delay / Obstruction", [6, 8, 10, 12]]
];

const BENEFICS = ["JUPITER", "VENUS", "MOON", "MERCURY"];
const MALEFICS = ["SATURN", "MARS", "RAHU", "KETU", "SUN"];

function getModeFlags(subject_context, birth_context) {
  const subjectMode = String(subject_context?.subject_mode || "");
  const identityDepth = String(subject_context?.identity_depth || "");
  const precisionMode = String(birth_context?.precision_mode || "");

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

  return { isNameOnly, isNameContext, isReducedDob, isFullBirth };
}

function buildNameOnlyHints(subject_context) {
  const profile = subject_context?.name_profile || {};
  const root = Number(profile.root_number || 0);

  return {
    raw_name: profile.raw_name || null,
    root_number: root,
    vibration_class: String(profile.vibration_class || "NEUTRAL").toUpperCase(),
    relationBias: [2, 6].includes(root) ? 2.2 : [3, 5].includes(root) ? 1.2 : 0,
    moneyBias: [4, 8].includes(root) ? 2.0 : [1, 5].includes(root) ? 1.2 : 0.4,
    mindBias: [2, 7].includes(root) ? 2.2 : [9].includes(root) ? 1.4 : 0.6,
    conflictBias: [4, 8, 9].includes(root) ? 2.0 : 0.5,
    mobilityBias: [5].includes(root) ? 2.0 : [3].includes(root) ? 1.1 : 0.4,
    authorityBias: [1, 8].includes(root) ? 1.8 : 0.4,
    withdrawalBias: [7].includes(root) ? 2.0 : 0.3,
    familyBias: [6, 2].includes(root) ? 1.8 : 0.5
  };
}

function nameOnlyBoost(domainKey, h) {
  if (!h) return 0;

  switch (domainKey) {
    case "LOVE":
    case "PARTNERSHIP":
    case "MARRIAGE":
    case "DIVORCE":
    case "MULTIPLE_MARRIAGE":
      return h.relationBias;
    case "MONEY":
    case "DEBT":
    case "GAIN":
    case "LOSS":
    case "BUSINESS":
      return h.moneyBias;
    case "MIND":
    case "MENTAL":
      return h.mindBias;
    case "ENEMY":
    case "LEGAL":
    case "BLOCKAGE":
    case "FAILURE":
      return h.conflictBias;
    case "FOREIGN":
    case "IMMIGRATION":
    case "VISA":
    case "COMMUNICATION":
    case "NETWORK":
      return h.mobilityBias;
    case "CAREER":
    case "JOB":
    case "SUCCESS":
      return h.authorityBias;
    case "SPIRITUAL":
    case "LOSS":
    case "RELIGION":
      return h.withdrawalBias;
    case "FAMILY":
    case "HOME":
      return h.familyBias;
    default:
      return 0.25;
  }
}

function calculateDomainBase(domainKey, targetHouses, evidence, hints, modeFlags, nameHints) {
  const houseHits = [];
  const aspectHits = [];
  let rawScore = 0;

  for (const [planetName, houseNum] of Object.entries(evidence.housesByPlanet || {})) {
    if (targetHouses.includes(houseNum)) {
      houseHits.push({ planet: planetName, house: houseNum });
      let weight = 1;
      if (BENEFICS.includes(planetName)) weight += 0.65;
      if (MALEFICS.includes(planetName)) weight += 0.85;
      rawScore += weight;
    }
  }

  for (const asp of evidence.aspects || []) {
    const p1 = String(asp.planet1 || "").toUpperCase();
    const p2 = String(asp.planet2 || "").toUpperCase();
    const h1 = evidence.housesByPlanet[p1];
    const h2 = evidence.housesByPlanet[p2];

    if (targetHouses.includes(h1) || targetHouses.includes(h2)) {
      aspectHits.push({
        planet1: p1,
        planet2: p2,
        type: asp.type,
        orb_gap: asp.orb_gap
      });
      rawScore += 0.45;
    }
  }

  if (domainKey === "FOREIGN" && (hints.foreignIntent || hints.foreignExecuted)) rawScore += 3.2;
  if (domainKey === "IMMIGRATION" && (hints.foreignIntent || hints.foreignExecuted)) rawScore += 2.8;
  if (domainKey === "VISA" && (hints.foreignIntent || hints.foreignExecuted)) rawScore += 2.2;

  if (
    domainKey === "SETTLEMENT" &&
    (
      hints.settlement_year_claim != null ||
      hints.settlement_applied_year_claim != null ||
      hints.settlement_refusal_year_claim != null ||
      hints.appeal_year_claim != null ||
      hints.route_shift_year_claim != null
    )
  ) rawScore += 3.4;

  if (domainKey === "DOCUMENT" && (hints.documentMention || hints.legalMention)) rawScore += 2.1;
  if (domainKey === "LEGAL" && hints.legalMention) rawScore += 2.0;

  if (domainKey === "EDUCATION" && (hints.isStudent || hints.study_start_year_claim != null)) rawScore += 3.0;
  if (domainKey === "JOB" && (hints.hasJob || hints.job_start_year_claim != null)) rawScore += 3.0;
  if (domainKey === "BUSINESS" && (hints.hasBusiness || hints.business_start_year_claim != null)) rawScore += 3.0;

  if (domainKey === "MARRIAGE" && (hints.marriageMention || hints.marriage_count_claim != null)) rawScore += 3.4;
  if (domainKey === "DIVORCE" && (hints.divorceMention || hints.broken_marriage_count != null)) rawScore += 2.8;
  if (domainKey === "LOVE" && hints.relationshipMention) rawScore += 2.0;

  if (domainKey === "CHILDREN" && hints.childrenMention) rawScore += 1.9;
  if (domainKey === "FAMILY" && hints.familyMention) rawScore += 2.0;
  if (domainKey === "HEALTH" && hints.healthMention) rawScore += 2.5;
  if (domainKey === "MENTAL" && hints.mentalMention) rawScore += 2.4;
  if (domainKey === "MONEY" && hints.moneyMention) rawScore += 2.2;
  if (domainKey === "DEBT" && hints.debt_year_claim != null) rawScore += 2.2;
  if (domainKey === "PROPERTY" && (hints.propertyMention || hints.property_year_claim != null)) rawScore += 2.1;
  if (domainKey === "SPIRITUAL" && hints.spiritualMention) rawScore += 1.8;

  if (modeFlags.isNameOnly || modeFlags.isNameContext) {
    rawScore += nameOnlyBoost(domainKey, nameHints);
  }

  if (modeFlags.isReducedDob) rawScore += 0.45;

  const normalizedScore = round2(Math.min(10, rawScore + targetHouses.length * 0.14));

  return {
    normalizedScore,
    houseHits,
    aspectHits,
    density: normalizedScore >= 7.5 ? "HIGH" : normalizedScore >= 4.5 ? "MED" : "LOW",
    residualImpact: normalizedScore >= 7 ? "HIGH" : normalizedScore >= 4 ? "MED" : "LOW"
  };
}

function buildForeignEvents(domainKey, hints, score, modeFlags) {
  const timelineAllowed = !(modeFlags.isNameOnly || modeFlags.isNameContext);
  const entryYear = hints.foreign_entry_year_claim ?? hints.student_visa_entry_year_claim ?? null;

  if (entryYear != null || hints.foreignExecuted) {
    return [makeEvent({
      event_family: "FOREIGN_LEDGER",
      event_type: hints.student_visa_entry_year_claim ? "student visa / foreign entry" : "foreign entry / relocation",
      exact_year: timelineAllowed ? entryYear : null,
      evidence_strength: "strong",
      status: "EXECUTED",
      importance: "MAJOR",
      trigger_phase: "movement / foreign entry",
      carryover_to_present: "YES",
      who_involved: "self / authority",
      impact_summary: "foreign movement executed",
      evidence_type: timelineAllowed ? "DIRECT" : "PATTERN_CONFIRMED"
    })];
  }

  if (hints.foreignIntent || score >= 5) {
    return [makeEvent({
      event_family: "FOREIGN_LEDGER",
      event_type: "foreign process / movement pattern",
      evidence_strength: strengthLabel(score),
      status: "UNKNOWN",
      importance: "MAJOR",
      trigger_phase: "visa / movement / relocation pattern",
      carryover_to_present: "NO",
      who_involved: "self / authority",
      impact_summary: "foreign linkage visible, execution unconfirmed",
      evidence_type: "PATTERN_ONLY"
    })];
  }

  return [];
}

function buildSettlementEvents(hints, score, modeFlags) {
  const timelineAllowed = !(modeFlags.isNameOnly || modeFlags.isNameContext);

  if (hints.settlement_year_claim != null) {
    return [makeEvent({
      event_family: "FOREIGN_LEDGER",
      event_type: "settlement granted",
      exact_year: timelineAllowed ? hints.settlement_year_claim : null,
      evidence_strength: "strong",
      status: "EXECUTED",
      importance: "MAJOR",
      trigger_phase: "settlement completed",
      carryover_to_present: "YES",
      who_involved: "self / authority",
      impact_summary: "settlement completed",
      evidence_type: timelineAllowed ? "DIRECT" : "PATTERN_CONFIRMED"
    })];
  }

  if (hints.appeal_year_claim != null) {
    return [makeEvent({
      event_family: "FOREIGN_LEDGER",
      event_type: "settlement appeal ongoing",
      exact_year: timelineAllowed ? hints.appeal_year_claim : null,
      evidence_strength: "strong",
      status: "IN_PROGRESS",
      importance: "MAJOR",
      trigger_phase: "appeal / settlement process active",
      carryover_to_present: "YES",
      who_involved: "self / authority",
      impact_summary: "settlement process active but not completed",
      evidence_type: timelineAllowed ? "DIRECT" : "PATTERN_CONFIRMED"
    })];
  }

  if (hints.settlement_refusal_year_claim != null) {
    return [makeEvent({
      event_family: "FOREIGN_LEDGER",
      event_type: "settlement refusal after application",
      exact_year: timelineAllowed ? hints.settlement_refusal_year_claim : null,
      evidence_strength: "strong",
      status: "NOT_EXECUTED",
      importance: "MAJOR",
      trigger_phase: "settlement refused",
      carryover_to_present: "NO",
      who_involved: "self / authority",
      impact_summary: "settlement not granted",
      evidence_type: timelineAllowed ? "DIRECT" : "PATTERN_CONFIRMED"
    })];
  }

  if (hints.settlement_applied_year_claim != null) {
    return [makeEvent({
      event_family: "FOREIGN_LEDGER",
      event_type: "settlement application in process",
      exact_year: timelineAllowed ? hints.settlement_applied_year_claim : null,
      evidence_strength: "strong",
      status: "IN_PROGRESS",
      importance: "MAJOR",
      trigger_phase: "settlement application active",
      carryover_to_present: "YES",
      who_involved: "self / authority",
      impact_summary: "settlement application process active",
      evidence_type: timelineAllowed ? "DIRECT" : "PATTERN_CONFIRMED"
    })];
  }

  if (hints.route_shift_year_claim != null) {
    return [makeEvent({
      event_family: "FOREIGN_LEDGER",
      event_type: "route shift before settlement",
      exact_year: timelineAllowed ? hints.route_shift_year_claim : null,
      evidence_strength: "moderate",
      status: "EXECUTED",
      importance: "MAJOR",
      trigger_phase: "route / permission shift",
      carryover_to_present: "YES",
      who_involved: "self / authority",
      impact_summary: "immigration route shifted before settlement",
      evidence_type: timelineAllowed ? "DIRECT" : "PATTERN_CONFIRMED"
    })];
  }

  if (hints.settlementMention || score >= 6) {
    return [makeEvent({
      event_family: "FOREIGN_LEDGER",
      event_type: "settlement pattern",
      evidence_strength: strengthLabel(score),
      status: "UNKNOWN",
      importance: "MAJOR",
      trigger_phase: "base / settlement pattern",
      carryover_to_present: "NO",
      who_involved: "self / authority",
      impact_summary: "settlement pattern visible, fact not confirmed",
      evidence_type: "PATTERN_ONLY"
    })];
  }

  return [];
}

function buildLegalEvents(domainKey, hints, score, modeFlags) {
  const timelineAllowed = !(modeFlags.isNameOnly || modeFlags.isNameContext);

  if (hints.appeal_year_claim != null) {
    return [makeEvent({
      event_family: "LEGAL_LEDGER",
      event_type: "appeal event",
      exact_year: timelineAllowed ? hints.appeal_year_claim : null,
      evidence_strength: "strong",
      status: "IN_PROGRESS",
      importance: "MAJOR",
      trigger_phase: "appeal / authority process active",
      carryover_to_present: "YES",
      who_involved: "self / authority / institution",
      impact_summary: "appeal or authority process active",
      evidence_type: timelineAllowed ? "DIRECT" : "PATTERN_CONFIRMED"
    })];
  }

  if (hints.settlement_refusal_year_claim != null) {
    return [makeEvent({
      event_family: "LEGAL_LEDGER",
      event_type: "refusal / authority event",
      exact_year: timelineAllowed ? hints.settlement_refusal_year_claim : null,
      evidence_strength: "strong",
      status: "EXECUTED",
      importance: "MAJOR",
      trigger_phase: "refusal / authority decision",
      carryover_to_present: "YES",
      who_involved: "self / authority / institution",
      impact_summary: "authority decision occurred",
      evidence_type: timelineAllowed ? "DIRECT" : "PATTERN_CONFIRMED"
    })];
  }

  if (hints.legalMention || hints.documentMention || score >= 5) {
    return [makeEvent({
      event_family: "LEGAL_LEDGER",
      event_type: domainKey === "DOCUMENT" ? "document / paperwork phase" : "legal / authority phase",
      evidence_strength: strengthLabel(score),
      status: "UNKNOWN",
      importance: "MAJOR",
      trigger_phase: "paperwork / authority pattern",
      carryover_to_present: "NO",
      who_involved: "self / authority / institution",
      impact_summary: "legal-documentary pattern visible, fact not confirmed",
      evidence_type: "PATTERN_ONLY"
    })];
  }

  return [];
}

function oneFactEvent({ domain, year, type, family, who }) {
  return [makeEvent({
    event_family: family,
    event_type: type,
    exact_year: year,
    evidence_strength: "strong",
    status: "EXECUTED",
    importance: "MAJOR",
    trigger_phase: "event confirmed",
    carryover_to_present: "YES",
    who_involved: who,
    impact_summary: "event has definitively occurred",
    evidence_type: "DIRECT"
  })];
}

function buildWorkEvents(domainKey, hints, score, modeFlags) {
  if (domainKey === "JOB" && hints.job_start_year_claim != null) {
    return oneFactEvent({ year: hints.job_start_year_claim, type: "job / service phase", family: "WORK_LEDGER", who: "self / employer" });
  }

  if (domainKey === "BUSINESS" && hints.business_start_year_claim != null) {
    return oneFactEvent({ year: hints.business_start_year_claim, type: "business activity phase", family: "WORK_LEDGER", who: "self / client / partner" });
  }

  if (
    (domainKey === "JOB" && hints.hasJob) ||
    (domainKey === "BUSINESS" && hints.hasBusiness) ||
    (domainKey === "CAREER" && (hints.hasJob || hints.hasBusiness))
  ) {
    return [makeEvent({
      event_family: "WORK_LEDGER",
      event_type:
        domainKey === "JOB" ? "job / service phase" :
        domainKey === "BUSINESS" ? "business activity phase" :
        "career direction phase",
      evidence_strength: strengthLabel(score),
      status: "UNKNOWN",
      importance: "MAJOR",
      trigger_phase: "work pattern active",
      carryover_to_present: "NO",
      who_involved: "self / work field",
      impact_summary: "work pattern visible, fact year not confirmed",
      evidence_type: "PATTERN_ONLY"
    })];
  }

  if (score >= 6) {
    return [makeEvent({
      event_family: "WORK_LEDGER",
      event_type:
        domainKey === "JOB" ? "job / service pattern" :
        domainKey === "BUSINESS" ? "business activity pattern" :
        "career direction pattern",
      evidence_strength: strengthLabel(score),
      status: "UNKNOWN",
      importance: "MAJOR",
      trigger_phase: "work signature",
      carryover_to_present: "NO",
      who_involved: "self / work field",
      impact_summary: "work signature visible, execution unconfirmed",
      evidence_type: modeFlags.isNameOnly ? "NAME_PATTERN" : "PATTERN_ONLY"
    })];
  }

  return [];
}

function buildEducationEvents(hints, score) {
  const year = hints.study_start_year_claim ?? hints.student_visa_entry_year_claim ?? null;
  if (year != null) {
    return oneFactEvent({
      year,
      type: hints.student_visa_entry_year_claim ? "student visa entry phase" : "study / university phase",
      family: "EDUCATION_LEDGER",
      who: "self / institution"
    });
  }

  if (hints.isStudent || score >= 5) {
    return [makeEvent({
      event_family: "EDUCATION_LEDGER",
      event_type: "education pattern",
      evidence_strength: strengthLabel(score),
      status: "UNKNOWN",
      importance: "MAJOR",
      trigger_phase: "education pattern",
      carryover_to_present: "NO",
      who_involved: "self / institution",
      impact_summary: "education pattern visible, fact not confirmed",
      evidence_type: "PATTERN_ONLY"
    })];
  }

  return [];
}

function buildGenericFactOrPattern(domainKey, hints, score, modeFlags) {
  const map = {
    PROPERTY: [hints.property_year_claim, "property / asset phase", "ASSET_LEDGER"],
    DEBT: [hints.debt_year_claim, "debt / pressure phase", "MONEY_LEDGER"]
  };

  if (map[domainKey]?.[0] != null) {
    return oneFactEvent({
      year: map[domainKey][0],
      type: map[domainKey][1],
      family: map[domainKey][2],
      who: "self / domain"
    });
  }

  if (score < 6) return [];

  return [makeEvent({
    event_family: "DOMAIN_LEDGER",
    event_type: `${domainKey.toLowerCase()} pattern`,
    evidence_strength: strengthLabel(score),
    status: "UNKNOWN",
    importance: "MINOR",
    trigger_phase: "domain pattern",
    carryover_to_present: "NO",
    who_involved: "domain-linked people",
    impact_summary: `${domainKey.toLowerCase()} pattern visible, fact not confirmed`,
    evidence_type: modeFlags.isNameOnly ? "NAME_PATTERN" : "PATTERN_ONLY"
  })];
}

function inferEvents(domainKey, score, facts, modeFlags) {
  const hints = buildHints(facts);

  switch (domainKey) {
    case "FOREIGN":
    case "IMMIGRATION":
    case "VISA":
      return buildForeignEvents(domainKey, hints, score, modeFlags);

    case "SETTLEMENT":
      return buildSettlementEvents(hints, score, modeFlags);

    case "LEGAL":
    case "DOCUMENT":
      return buildLegalEvents(domainKey, hints, score, modeFlags);

    case "JOB":
    case "BUSINESS":
    case "CAREER":
      return buildWorkEvents(domainKey, hints, score, modeFlags);

    case "EDUCATION":
      return buildEducationEvents(hints, score);

    case "PROPERTY":
    case "DEBT":
      return buildGenericFactOrPattern(domainKey, hints, score, modeFlags);

    default:
      return buildGenericFactOrPattern(domainKey, hints, score, modeFlags);
  }
}

function applyNameOnlyPastOverride(domain_results, modeFlags) {
  if (!modeFlags.isNameOnly && !modeFlags.isNameContext) return domain_results;

  return domain_results.map((d) => ({
    ...d,
    pattern_mode_active: true,
    direct_evidence_count: (d.events || []).filter((e) => e.evidence_type === "DIRECT").length,
    pattern_evidence_count: (d.events || []).filter((e) => e.evidence_type !== "DIRECT").length,
    exact_timeline_allowed: false,
    exact_claims_locked: true
  }));
}

export function runAstroLayer({ evidence_packet, facts, subject_context, birth_context }) {
  const evidence = normalizeEvidence(evidence_packet);
  const hints = buildHints(facts);
  const modeFlags = getModeFlags(subject_context, birth_context);
  const nameHints = buildNameOnlyHints(subject_context);

  let domain_results = DOMAIN_REGISTRY.map(([domainKey, domainLabel, targetHouses]) => {
    const base = calculateDomainBase(domainKey, targetHouses, evidence, hints, modeFlags, nameHints);
    const events = inferEvents(domainKey, base.normalizedScore, facts, modeFlags);

    return {
      domain_key: domainKey,
      domain_label: domainLabel,
      target_houses: targetHouses,
      normalized_score: base.normalizedScore,
      density: base.density,
      residual_impact: base.residualImpact,
      present_carryover: events.some((e) => e.carryover_to_present === "YES") ? "YES" : "NO",
      house_hits: base.houseHits,
      aspect_hits: base.aspectHits,
      major_event_count: events.filter((e) => e.importance === "MAJOR").length,
      minor_event_count: events.filter((e) => e.importance === "MINOR").length,
      broken_event_count: events.filter((e) => e.status === "BROKEN").length,
      active_event_count: events.filter((e) =>
        ["ACTIVE", "STABILISING", "EXECUTED", "IN_PROGRESS", "BUILDING"].includes(e.status)
      ).length,
      events
    };
  });

  domain_results = applyNameOnlyPastOverride(domain_results, modeFlags);

  return {
    evidence_normalized: evidence.meta,
    evidence_runtime: evidence,
    mode_flags: modeFlags,
    name_hints: nameHints,
    domain_results
  };
}

export function buildTimeline({ ranked_domains }) {
  const out = [];

  ranked_domains.forEach((d) => {
    (d.events || []).forEach((e) => {
      out.push({
        domain: d.domain_label,
        domain_key: d.domain_key,
        event_family: e.event_family || null,
        event_type: e.event_type,
        event_number: e.event_number,
        status: e.status,
        importance: e.importance,
        trigger_phase: e.trigger_phase,
        evidence_strength: e.evidence_strength,
        evidence_type: e.evidence_type || null,
        date_marker: normalizeYear(e.exact_year),
        month_or_phase: e.month_or_phase || null,
        who_involved: e.who_involved || null,
        impact_summary: e.impact_summary || null,
        carryover_to_present: e.carryover_to_present
      });
    });
  });

  return out
    .filter((x) => x.importance === "MAJOR")
    .sort((a, b) => {
      const aa = a.date_marker ?? 99999;
      const bb = b.date_marker ?? 99999;
      if (aa !== bb) return aa - bb;
      return Number(a.event_number || 0) - Number(b.event_number || 0);
    });
}