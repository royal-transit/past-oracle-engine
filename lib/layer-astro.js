// lib/layer-astro.js
// UNIVERSAL PAST NANO CORE - FULL REPLACE
// Purpose:
// - trust-critical sectors score first
// - hard false negative reduce
// - process != executed
// - pattern != history
// - current reality phrases (already in UK / wife / husband / spouse) bind stronger
// - past-only core seed improvement

const round2 = (n) =>
  Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;

function signToIndex(sign) {
  const signs = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
  ];
  return signs.indexOf(sign);
}

function safeBirthYear(birthIso) {
  if (!birthIso) return null;
  const d = new Date(birthIso);
  return Number.isNaN(d.getTime()) ? null : d.getUTCFullYear();
}

function normalizeYear(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function uniqueYears(text) {
  const years = [...String(text || "").matchAll(/\b(19|20)\d{2}\b/g)].map((m) => Number(m[0]));
  return [...new Set(years)].sort((a, b) => a - b);
}

function hasAny(text, list) {
  const t = String(text || "").toLowerCase();
  return list.some((x) => t.includes(String(x).toLowerCase()));
}

function yearNearKeyword(text, keywords) {
  const src = String(text || "");
  for (const kw of keywords) {
    const idx = src.toLowerCase().indexOf(String(kw).toLowerCase());
    if (idx === -1) continue;
    const tail = src.slice(idx, idx + 140);
    const m = tail.match(/\b(19|20)\d{2}\b/);
    if (m) return Number(m[0]);
  }
  return null;
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
  impact_summary = null
}) {
  return {
    event_family,
    event_type,
    event_number,
    exact_year: normalizeYear(exact_year),
    month_or_phase,
    evidence_strength,
    status,
    importance,
    trigger_phase,
    carryover_to_present,
    who_involved,
    impact_summary
  };
}

function strengthLabel(score) {
  return score >= 8 ? "strong" : score >= 5 ? "moderate" : "light";
}

function buildHints(facts) {
  const raw = String(facts?.raw_text || "");
  const years = uniqueYears(raw);

  const abroadNow = hasAny(raw, [
    "already in uk",
    "in uk",
    "living in uk",
    "lives in uk",
    "based in uk",
    "uk based",
    "uk resident",
    "currently in uk",
    "london",
    "england",
    "abroad now",
    "already abroad",
    "living abroad",
    "foreign resident",
    "overseas now"
  ]);

  const marriageDoneByRole = hasAny(raw, [
    "wife",
    "husband",
    "spouse",
    "my wife",
    "my husband",
    "his wife",
    "her husband"
  ]);

  const familyDeathMention = hasAny(raw, [
    "father died",
    "mother died",
    "baba mara geche",
    "ma mara geche",
    "parent died"
  ]);

  return {
    raw_text: raw,
    years,

    isStudent: hasAny(raw, [
      "student", "study", "studying", "university", "varsity", "college", "school",
      "porashuna", "pora", "campus", "exam", "session"
    ]),

    hasJob: hasAny(raw, [
      "job", "work", "employment", "service", "office", "chakri", "kaj", "salary"
    ]),

    hasBusiness: hasAny(raw, [
      "business", "trade", "shop", "deal", "bebsha", "dokaan", "client"
    ]),

    foreignIntent: hasAny(raw, [
      "foreign", "abroad", "uk", "usa", "canada", "visa", "immigration", "bidesh", "relocation"
    ]),

    foreignExecuted: abroadNow || hasAny(raw, [
      "went abroad",
      "arrived uk",
      "came uk",
      "came to uk",
      "entered uk",
      "moved abroad",
      "foreign entry",
      "immigrated",
      "overseas move"
    ]),

    abroadNow,
    settlementMention: abroadNow || hasAny(raw, [
      "settlement", "settled", "permanent", "stable base", "residence", "base"
    ]),

    marriageMention: marriageDoneByRole || hasAny(raw, [
      "marriage", "married", "bea", "biye", "nikah", "wedding"
    ]),

    marriageDoneByRole,
    divorceMention: hasAny(raw, [
      "divorce", "divorced", "separation", "separated", "talak", "broken marriage"
    ]),

    remarriageMention: hasAny(raw, [
      "second marriage", "2nd marriage", "remarriage", "abar biye", "ditiyo biye"
    ]),

    relationshipMention: hasAny(raw, [
      "relationship", "love", "affair", "partner", "contact", "proposal", "bond"
    ]),

    childrenMention: hasAny(raw, [
      "child", "children", "baby", "son", "daughter", "pregnancy", "delivery"
    ]),

    familyMention: hasAny(raw, [
      "family", "mother", "father", "ma", "baba", "sister", "brother", "parent"
    ]),

    familyHealthMention: hasAny(raw, [
      "mother ill", "father ill", "ma osustho", "baba osustho", "parent ill", "family health"
    ]),

    familyDeathMention,

    healthMention: hasAny(raw, [
      "health", "ill", "illness", "sick", "disease", "surgery", "hospital",
      "osustho", "rog", "pain", "stress", "mental"
    ]),

    mentalMention: hasAny(raw, [
      "mental", "depression", "anxiety", "stress", "fear", "panic", "overthinking",
      "mon kharap", "tension"
    ]),

    moneyMention: hasAny(raw, [
      "money", "income", "cash", "financial", "debt", "loan", "taka", "rin",
      "loss", "gain", "profit", "expense"
    ]),

    propertyMention: hasAny(raw, [
      "property", "land", "flat", "house", "home", "vehicle", "car", "asset",
      "jomi", "bari", "gari"
    ]),

    legalMention: hasAny(raw, [
      "legal", "court", "case", "penalty", "authority", "notice", "law"
    ]),

    documentMention: hasAny(raw, [
      "document", "paper", "paperwork", "records", "approval", "form", "letter"
    ]),

    enemyMention: hasAny(raw, [
      "enemy", "opposition", "rival", "hidden enemy", "shatru", "birodhi"
    ]),

    networkMention: hasAny(raw, [
      "friend", "network", "circle", "people", "support", "ally", "group"
    ]),

    spiritualMention: hasAny(raw, [
      "spiritual", "religion", "dharma", "occult", "tantric", "zikr", "sadhana", "pir"
    ]),

    travelMention: hasAny(raw, [
      "travel", "trip", "journey", "movement", "visit", "tour"
    ]),

    marriage_count_claim: facts?.marriage_count_claim ?? null,
    broken_marriage_claim: facts?.broken_marriage_claim ?? null,
    foreign_entry_year_claim: facts?.foreign_entry_year_claim ?? yearNearKeyword(raw, [
      "uk", "foreign", "abroad", "visa", "immigration", "bidesh", "entry"
    ]),
    settlement_year_claim: facts?.settlement_year_claim ?? yearNearKeyword(raw, [
      "settlement", "settled", "permanent", "stable base", "base"
    ])
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

function calculateDomainBase(domainKey, targetHouses, evidence, hints) {
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

  // trust-critical boosts
  if (domainKey === "EDUCATION" && hints.isStudent) rawScore += 3.0;

  if (domainKey === "JOB" && hints.hasJob) rawScore += 3.0;
  if (domainKey === "BUSINESS" && hints.hasBusiness) rawScore += 3.0;
  if (domainKey === "CAREER" && (hints.hasJob || hints.hasBusiness)) rawScore += 2.4;

  if (domainKey === "MARRIAGE" && (hints.marriageMention || hints.marriage_count_claim != null || hints.marriageDoneByRole)) rawScore += 3.4;
  if (domainKey === "DIVORCE" && (hints.divorceMention || hints.broken_marriage_claim != null)) rawScore += 2.8;
  if (domainKey === "MULTIPLE_MARRIAGE" && ((hints.marriage_count_claim ?? 0) >= 2 || hints.remarriageMention)) rawScore += 2.6;
  if (domainKey === "LOVE" && hints.relationshipMention) rawScore += 2.0;
  if (domainKey === "PARTNERSHIP" && hints.relationshipMention) rawScore += 1.8;

  if (domainKey === "FOREIGN" && (hints.foreignIntent || hints.foreign_entry_year_claim != null || hints.foreignExecuted || hints.abroadNow)) rawScore += 3.2;
  if (domainKey === "SETTLEMENT" && (hints.settlement_year_claim != null || hints.settlementMention || hints.abroadNow)) rawScore += 3.0;
  if (domainKey === "IMMIGRATION" && (hints.foreignIntent || hints.foreignExecuted || hints.abroadNow)) rawScore += 2.6;
  if (domainKey === "VISA" && hints.foreignIntent) rawScore += 1.8;
  if (domainKey === "DOCUMENT" && hints.documentMention) rawScore += 1.7;

  if (domainKey === "HEALTH" && hints.healthMention) rawScore += 2.5;
  if (domainKey === "MENTAL" && hints.mentalMention) rawScore += 2.4;
  if (domainKey === "FAMILY" && hints.familyMention) rawScore += 2.0;
  if (domainKey === "FAMILY" && hints.familyDeathMention) rawScore += 1.0;
  if (domainKey === "MONEY" && hints.moneyMention) rawScore += 2.2;
  if (domainKey === "DEBT" && hints.moneyMention) rawScore += 1.5;
  if (domainKey === "PROPERTY" && hints.propertyMention) rawScore += 2.1;
  if (domainKey === "VEHICLE" && hints.propertyMention) rawScore += 1.3;
  if (domainKey === "LEGAL" && hints.legalMention) rawScore += 2.0;
  if (domainKey === "ENEMY" && hints.enemyMention) rawScore += 1.8;
  if (domainKey === "NETWORK" && hints.networkMention) rawScore += 1.6;
  if (domainKey === "CHILDREN" && hints.childrenMention) rawScore += 1.9;
  if (domainKey === "SPIRITUAL" && hints.spiritualMention) rawScore += 1.8;
  if (domainKey === "HOME" && hints.propertyMention) rawScore += 1.4;

  const normalizedScore = round2(Math.min(10, rawScore + targetHouses.length * 0.14));

  return {
    normalizedScore,
    houseHits,
    aspectHits,
    density: normalizedScore >= 7.5 ? "HIGH" : normalizedScore >= 4.5 ? "MED" : "LOW",
    residualImpact: normalizedScore >= 7 ? "HIGH" : normalizedScore >= 4 ? "MED" : "LOW"
  };
}

// -------- sector builders --------

function buildMarriageEvents(hints, score) {
  const events = [];
  const years = hints.years;

  let total =
    hints.marriage_count_claim ??
    (hints.remarriageMention ? 2 : null) ??
    (hints.marriageDoneByRole ? 1 : null) ??
    (hints.marriageMention ? 1 : 0);

  const broken = hints.broken_marriage_claim ?? (hints.divorceMention ? 1 : 0);

  if (total > 0) {
    for (let i = 0; i < total; i += 1) {
      events.push(makeEvent({
        event_family: "RELATIONSHIP_LEDGER",
        event_type:
          i === 0 ? "first marriage event" :
          i === 1 ? "second marriage event" :
          `marriage event #${i + 1}`,
        event_number: i + 1,
        exact_year: years[i] ?? null,
        month_or_phase: years[i] ? "year-anchored phase" : "phase only",
        evidence_strength: "strong",
        status: "EXECUTED",
        importance: "MAJOR",
        trigger_phase: i < broken ? "union then later break" : "union then continuation",
        carryover_to_present: i < broken ? "NO" : "YES",
        who_involved: "spouse / partner",
        impact_summary: i < broken ? "formal union later broke" : "formal union executed"
      }));
    }
    return events;
  }

  if (score >= 7) {
    return [makeEvent({
      event_family: "RELATIONSHIP_LEDGER",
      event_type: "marriage formation pattern",
      evidence_strength: strengthLabel(score),
      status: "BUILDING",
      importance: "MAJOR",
      month_or_phase: "phase only",
      trigger_phase: "bond / union build phase",
      carryover_to_present: "YES",
      who_involved: "partner possibility",
      impact_summary: "marriage pattern present, execution unconfirmed"
    })];
  }

  if (score >= 5) {
    return [makeEvent({
      event_family: "RELATIONSHIP_LEDGER",
      event_type: "relationship-led marriage tendency",
      evidence_strength: strengthLabel(score),
      status: "RESIDUAL",
      importance: "MINOR",
      month_or_phase: "phase only",
      trigger_phase: "bond tendency present",
      carryover_to_present: "YES",
      who_involved: "partner field",
      impact_summary: "marriage-linked tendency present, hard execution unconfirmed"
    })];
  }

  return [];
}

function buildDivorceEvents(hints, score) {
  const events = [];
  const years = hints.years;
  const broken = hints.broken_marriage_claim ?? (hints.divorceMention ? 1 : 0);

  for (let i = 0; i < broken; i += 1) {
    events.push(makeEvent({
      event_family: "RELATIONSHIP_LEDGER",
      event_type: i === 0 ? "divorce event" : `divorce event #${i + 1}`,
      event_number: i + 1,
      exact_year: years[Math.min(i + 1, Math.max(years.length - 1, 0))] ?? null,
      month_or_phase: "rupture phase",
      evidence_strength: "strong",
      status: "EXECUTED",
      importance: "MAJOR",
      trigger_phase: "rupture / severance",
      carryover_to_present: i === broken - 1 ? "YES" : "NO",
      who_involved: "spouse / legal partner",
      impact_summary: "formal separation / divorce"
    }));
  }

  if (!events.length && score >= 7 && hints.divorceMention) {
    events.push(makeEvent({
      event_family: "RELATIONSHIP_LEDGER",
      event_type: "divorce pressure pattern",
      evidence_strength: strengthLabel(score),
      status: "BUILDING",
      importance: "MAJOR",
      month_or_phase: "phase only",
      trigger_phase: "rupture build phase",
      carryover_to_present: "YES",
      who_involved: "partner / spouse",
      impact_summary: "separation signal present, completion unconfirmed"
    }));
  }

  return events;
}

function buildMultipleMarriageEvents(hints, score) {
  const total = hints.marriage_count_claim ?? (hints.remarriageMention ? 2 : 0);
  if (total >= 2) {
    return [
      makeEvent({
        event_family: "RELATIONSHIP_LEDGER",
        event_type: "multiple marriage pattern",
        evidence_strength: "strong",
        status: "RESIDUAL",
        importance: "MINOR",
        month_or_phase: "pattern only",
        trigger_phase: "repeated union pattern",
        carryover_to_present: "YES",
        who_involved: "relationship history",
        impact_summary: "repeated union signature present"
      })
    ];
  }

  if (score >= 7 && hints.remarriageMention) {
    return [
      makeEvent({
        event_family: "RELATIONSHIP_LEDGER",
        event_type: "repeated union tendency",
        evidence_strength: strengthLabel(score),
        status: "BUILDING",
        importance: "MINOR",
        month_or_phase: "pattern only",
        trigger_phase: "repeated union tendency",
        carryover_to_present: "YES",
        who_involved: "relationship history",
        impact_summary: "repeated union tendency visible"
      })
    ];
  }

  return [];
}

function buildLoveEvents(hints, score) {
  if (!hints.relationshipMention && score < 5) return [];
  return [
    makeEvent({
      event_family: "RELATIONSHIP_LEDGER",
      event_type: "relationship / attachment phase",
      exact_year: hints.years[0] ?? null,
      month_or_phase: hints.years.length ? "year-anchored phase" : "phase only",
      evidence_strength: strengthLabel(score),
      status: hints.relationshipMention ? "ACTIVE" : "RESIDUAL",
      importance: score >= 7 ? "MAJOR" : "MINOR",
      trigger_phase: "bond formation / emotional attachment",
      carryover_to_present: "YES",
      who_involved: "self / partner",
      impact_summary: "relationship pattern active"
    })
  ];
}

function buildChildrenEvents(hints, score) {
  if (!hints.childrenMention && score < 5) return [];
  return [
    makeEvent({
      event_family: "CHILDREN_LEDGER",
      event_type: "children / continuity phase",
      exact_year: hints.years[0] ?? null,
      month_or_phase: hints.years.length ? "year-anchored phase" : "phase only",
      evidence_strength: strengthLabel(score),
      status: hints.childrenMention ? "ACTIVE" : "RESIDUAL",
      importance: "MAJOR",
      trigger_phase: "child / continuity axis active",
      carryover_to_present: "YES",
      who_involved: "child / family",
      impact_summary: "children-related domain active"
    })
  ];
}

function buildForeignEvents(domainKey, hints, score) {
  const events = [];
  const entryYear = hints.foreign_entry_year_claim ?? null;
  const settlementYear = hints.settlement_year_claim ?? null;

  if (entryYear != null || hints.foreignExecuted || hints.abroadNow) {
    events.push(makeEvent({
      event_family: "FOREIGN_LEDGER",
      event_type: hints.abroadNow ? "foreign residence / presence event" : "foreign entry event",
      event_number: 1,
      exact_year: entryYear,
      month_or_phase: entryYear ? "year-anchored phase" : "phase only",
      evidence_strength: "strong",
      status: "EXECUTED",
      importance: "MAJOR",
      trigger_phase: "movement / foreign entry",
      carryover_to_present: "YES",
      who_involved: "self / authority",
      impact_summary: hints.abroadNow ? "foreign presence already active" : "foreign movement executed"
    }));
  } else if (hints.foreignIntent || score >= 5) {
    events.push(makeEvent({
      event_family: "FOREIGN_LEDGER",
      event_type: "foreign process / movement pattern",
      event_number: 1,
      exact_year: null,
      month_or_phase: "process phase",
      evidence_strength: strengthLabel(score),
      status: score >= 7 ? "BUILDING" : "RESIDUAL",
      importance: "MAJOR",
      trigger_phase: "visa / movement / relocation build",
      carryover_to_present: "YES",
      who_involved: "self / authority",
      impact_summary: score >= 7
        ? "foreign process visible, completion unconfirmed"
        : "foreign linkage present, execution unconfirmed"
    }));
  }

  if (settlementYear != null || hints.settlementMention || hints.abroadNow) {
    events.push(makeEvent({
      event_family: "FOREIGN_LEDGER",
      event_type: "settlement event",
      event_number: 2,
      exact_year: settlementYear,
      month_or_phase: settlementYear ? "year-anchored phase" : "phase only",
      evidence_strength: settlementYear || hints.abroadNow ? "strong" : strengthLabel(score),
      status: settlementYear || hints.abroadNow ? "STABILISING" : "BUILDING",
      importance: "MAJOR",
      trigger_phase: "base consolidation",
      carryover_to_present: "YES",
      who_involved: "self / residence / authority",
      impact_summary:
        settlementYear || hints.abroadNow
          ? "base formation / settlement visible"
          : "settlement tendency visible, completion unconfirmed"
    }));
  }

  if (domainKey === "VISA") {
    return events.filter((e) => e.event_type.includes("foreign") || e.event_type.includes("settlement"));
  }

  return events;
}

function buildEducationEvents(hints, score) {
  if (!hints.isStudent && score < 5) return [];
  return [
    makeEvent({
      event_family: "EDUCATION_LEDGER",
      event_type: "study / university phase",
      exact_year: hints.years[0] ?? null,
      month_or_phase: hints.years.length ? "year-anchored phase" : "phase only",
      evidence_strength: strengthLabel(score),
      status: hints.isStudent ? "ACTIVE" : "RESIDUAL",
      importance: "MAJOR",
      trigger_phase: "academic continuity / study pressure",
      carryover_to_present: "YES",
      who_involved: "self / institution",
      impact_summary: "education domain active"
    })
  ];
}

function buildWorkEvents(domainKey, hints, score) {
  if (hints.isStudent && !hints.hasJob && !hints.hasBusiness && score < 6) return [];

  if (domainKey === "JOB" && (hints.hasJob || score >= 6)) {
    return [makeEvent({
      event_family: "WORK_LEDGER",
      event_type: "job / service phase",
      exact_year: hints.years[0] ?? null,
      month_or_phase: hints.years.length ? "year-anchored phase" : "phase only",
      evidence_strength: strengthLabel(score),
      status: hints.hasJob ? "ACTIVE" : "RESIDUAL",
      importance: "MAJOR",
      trigger_phase: "employment engagement",
      carryover_to_present: "YES",
      who_involved: "self / authority",
      impact_summary: "job-related activity present"
    })];
  }

  if (domainKey === "BUSINESS" && (hints.hasBusiness || score >= 6)) {
    return [makeEvent({
      event_family: "WORK_LEDGER",
      event_type: "business activity phase",
      exact_year: hints.years[0] ?? null,
      month_or_phase: hints.years.length ? "year-anchored phase" : "phase only",
      evidence_strength: strengthLabel(score),
      status: hints.hasBusiness ? "ACTIVE" : "RESIDUAL",
      importance: "MAJOR",
      trigger_phase: "trade / deal activity",
      carryover_to_present: "YES",
      who_involved: "self / client / partner",
      impact_summary: "business activity present"
    })];
  }

  if (domainKey === "CAREER" && (hints.hasJob || hints.hasBusiness || score >= 6)) {
    return [makeEvent({
      event_family: "WORK_LEDGER",
      event_type: "career direction phase",
      exact_year: hints.years[0] ?? null,
      month_or_phase: hints.years.length ? "year-anchored phase" : "phase only",
      evidence_strength: strengthLabel(score),
      status: (hints.hasJob || hints.hasBusiness) ? "ACTIVE" : "RESIDUAL",
      importance: "MAJOR",
      trigger_phase: "career / authority direction",
      carryover_to_present: "YES",
      who_involved: "self / authority",
      impact_summary: "career domain active"
    })];
  }

  return [];
}

function buildMoneyEvents(domainKey, hints, score) {
  if (!hints.moneyMention && score < 5) return [];

  const type =
    domainKey === "DEBT" ? "debt / pressure phase" :
    domainKey === "GAIN" ? "gain / fulfilment phase" :
    domainKey === "LOSS" ? "loss / expense phase" :
    "money / liquidity phase";

  const impact =
    domainKey === "DEBT" ? "financial pressure visible" :
    domainKey === "LOSS" ? "loss / expense trend visible" :
    domainKey === "GAIN" ? "gain potential visible" :
    "money condition visible";

  return [makeEvent({
    event_family: "MONEY_LEDGER",
    event_type: type,
    exact_year: hints.years[0] ?? null,
    month_or_phase: hints.years.length ? "year-anchored phase" : "phase only",
    evidence_strength: strengthLabel(score),
    status: hints.moneyMention ? "ACTIVE" : "RESIDUAL",
    importance: "MAJOR",
    trigger_phase: "money flow / compression cycle",
    carryover_to_present: "YES",
    who_involved: "self / finance",
    impact_summary: impact
  })];
}

function buildPropertyEvents(domainKey, hints, score) {
  if (!hints.propertyMention && score < 5) return [];

  const type =
    domainKey === "VEHICLE" ? "vehicle / transport phase" :
    domainKey === "HOME" ? "home / base phase" :
    "property / asset phase";

  return [makeEvent({
    event_family: "ASSET_LEDGER",
    event_type: type,
    exact_year: hints.years[0] ?? null,
    month_or_phase: hints.years.length ? "year-anchored phase" : "phase only",
    evidence_strength: strengthLabel(score),
    status: hints.propertyMention ? "ACTIVE" : "RESIDUAL",
    importance: "MAJOR",
    trigger_phase: "asset / residence focus",
    carryover_to_present: "YES",
    who_involved: "self / family",
    impact_summary: "asset / property / residence signal present"
    })
  ];
}

function buildHealthEvents(domainKey, hints, score) {
  if (!hints.healthMention && !hints.mentalMention && score < 5) return [];

  const type =
    domainKey === "MENTAL" ? "mental pressure phase" :
    "health pressure phase";

  return [makeEvent({
    event_family: "HEALTH_LEDGER",
    event_type: type,
    exact_year: hints.years[0] ?? null,
    month_or_phase: hints.years.length ? "year-anchored phase" : "phase only",
    evidence_strength: strengthLabel(score),
    status: (hints.healthMention || hints.mentalMention) ? "ACTIVE" : "RESIDUAL",
    importance: "MAJOR",
    trigger_phase: domainKey === "MENTAL" ? "mental stress / fear cycle" : "imbalance / body strain",
    carryover_to_present: "YES",
    who_involved: "self / body / mind",
    impact_summary: domainKey === "MENTAL" ? "mental pressure visible" : "health strain visible"
  })];
}

function buildFamilyEvents(hints, score) {
  if (!hints.familyMention && !hints.familyHealthMention && !hints.familyDeathMention && score < 5) return [];

  return [makeEvent({
    event_family: "FAMILY_LEDGER",
    event_type:
      hints.familyDeathMention ? "family loss / absence phase" :
      hints.familyHealthMention ? "family health pressure phase" :
      "family responsibility phase",
    exact_year: hints.years[0] ?? null,
    month_or_phase: hints.years.length ? "year-anchored phase" : "phase only",
    evidence_strength: strengthLabel(score),
    status: (hints.familyMention || hints.familyHealthMention || hints.familyDeathMention) ? "ACTIVE" : "RESIDUAL",
    importance: "MAJOR",
    trigger_phase:
      hints.familyDeathMention ? "loss / absence imprint" :
      hints.familyHealthMention ? "family weakness / care phase" :
      "family involvement",
    carryover_to_present: "YES",
    who_involved: "parent / family",
    impact_summary: "family domain active"
  })];
}

function buildLegalEvents(domainKey, hints, score) {
  if (!hints.legalMention && !hints.documentMention && score < 5) return [];

  const type =
    domainKey === "DOCUMENT" ? "document / paperwork phase" :
    domainKey === "VISA" ? "visa / approval process" :
    "legal / authority phase";

  return [makeEvent({
    event_family: "LEGAL_LEDGER",
    event_type: type,
    exact_year: hints.years[0] ?? null,
    month_or_phase: hints.years.length ? "year-anchored phase" : "phase only",
    evidence_strength: strengthLabel(score),
    status: (hints.documentMention || hints.legalMention) ? "ACTIVE" : "RESIDUAL",
    importance: "MAJOR",
    trigger_phase: "paperwork / authority motion",
    carryover_to_present: "YES",
    who_involved: "self / authority / institution",
    impact_summary: "legal-documentary process visible"
  })];
}

function buildEnemyEvents(hints, score) {
  if (!hints.enemyMention && score < 6) return [];
  return [makeEvent({
    event_family: "CONFLICT_LEDGER",
    event_type: "enemy / opposition phase",
    exact_year: hints.years[0] ?? null,
    month_or_phase: hints.years.length ? "year-anchored phase" : "phase only",
    evidence_strength: strengthLabel(score),
    status: hints.enemyMention ? "ACTIVE" : "RESIDUAL",
    importance: "MAJOR",
    trigger_phase: "resistance / rivalry pattern",
    carryover_to_present: "YES",
    who_involved: "rival / hidden opponent",
    impact_summary: "opposition or enemy signal present"
  })];
}

function buildNetworkEvents(hints, score) {
  if (!hints.networkMention && score < 6) return [];
  return [makeEvent({
    event_family: "NETWORK_LEDGER",
    event_type: "network / support phase",
    exact_year: hints.years[0] ?? null,
    month_or_phase: hints.years.length ? "year-anchored phase" : "phase only",
    evidence_strength: strengthLabel(score),
    status: hints.networkMention ? "ACTIVE" : "RESIDUAL",
    importance: "MINOR",
    trigger_phase: "circle / support activation",
    carryover_to_present: "YES",
    who_involved: "friends / network",
    impact_summary: "support circle or network active"
  })];
}

function buildSpiritualEvents(hints, score) {
  if (!hints.spiritualMention && score < 6) return [];
  return [makeEvent({
    event_family: "SPIRITUAL_LEDGER",
    event_type: "spiritual / inward turning phase",
    exact_year: hints.years[0] ?? null,
    month_or_phase: hints.years.length ? "year-anchored phase" : "phase only",
    evidence_strength: strengthLabel(score),
    status: hints.spiritualMention ? "ACTIVE" : "RESIDUAL",
    importance: "MINOR",
    trigger_phase: "inner search / withdrawal",
    carryover_to_present: "YES",
    who_involved: "self / guide / belief system",
    impact_summary: "spiritual domain active"
  })];
}

function buildGenericEvents(domainKey, score) {
  if (score < 8) return [];
  return [makeEvent({
    event_family: "DOMAIN_LEDGER",
    event_type: `${domainKey.toLowerCase()} signature`,
    month_or_phase: "phase only",
    evidence_strength: strengthLabel(score),
    status: "RESIDUAL",
    importance: "MINOR",
    trigger_phase: "domain signature",
    carryover_to_present: "YES",
    who_involved: "domain-linked people",
    impact_summary: `${domainKey.toLowerCase()} domain active`
  })];
}

function inferEvents(domainKey, score, facts) {
  const hints = buildHints(facts);

  switch (domainKey) {
    case "MARRIAGE":
      return buildMarriageEvents(hints, score);
    case "DIVORCE":
      return buildDivorceEvents(hints, score);
    case "MULTIPLE_MARRIAGE":
      return buildMultipleMarriageEvents(hints, score);
    case "LOVE":
    case "PARTNERSHIP":
      return buildLoveEvents(hints, score);
    case "CHILDREN":
      return buildChildrenEvents(hints, score);
    case "FOREIGN":
    case "SETTLEMENT":
    case "IMMIGRATION":
    case "VISA":
      return buildForeignEvents(domainKey, hints, score);
    case "EDUCATION":
      return buildEducationEvents(hints, score);
    case "JOB":
    case "BUSINESS":
    case "CAREER":
      return buildWorkEvents(domainKey, hints, score);
    case "MONEY":
    case "DEBT":
    case "GAIN":
    case "LOSS":
      return buildMoneyEvents(domainKey, hints, score);
    case "PROPERTY":
    case "VEHICLE":
    case "HOME":
      return buildPropertyEvents(domainKey, hints, score);
    case "HEALTH":
    case "MENTAL":
      return buildHealthEvents(domainKey, hints, score);
    case "FAMILY":
      return buildFamilyEvents(hints, score);
    case "LEGAL":
    case "DOCUMENT":
      return buildLegalEvents(domainKey, hints, score);
    case "ENEMY":
      return buildEnemyEvents(hints, score);
    case "NETWORK":
      return buildNetworkEvents(hints, score);
    case "SPIRITUAL":
    case "RELIGION":
      return buildSpiritualEvents(hints, score);
    default:
      return buildGenericEvents(domainKey, score);
  }
}

export function runAstroLayer({ evidence_packet, facts }) {
  const evidence = normalizeEvidence(evidence_packet);
  const hints = buildHints(facts);

  const domain_results = DOMAIN_REGISTRY.map(([domainKey, domainLabel, targetHouses]) => {
    const base = calculateDomainBase(domainKey, targetHouses, evidence, hints);
    const events = inferEvents(domainKey, base.normalizedScore, facts);

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
      active_event_count: events.filter((e) => ["ACTIVE", "STABILISING", "EXECUTED", "BUILDING"].includes(e.status)).length,
      events
    };
  });

  return {
    evidence_normalized: evidence.meta,
    evidence_runtime: evidence,
    domain_results
  };
}

export function buildTimeline({ ranked_domains, birth_context }) {
  const birthYear = safeBirthYear(birth_context?.birth_datetime_iso);
  const out = [];

  const inferYearStrict = (domainKey, rankScore, eventNumber) => {
    if (birthYear == null) return null;

    const base =
      domainKey === "MARRIAGE" ? 26 :
      domainKey === "DIVORCE" ? 29 :
      domainKey === "MULTIPLE_MARRIAGE" ? 31 :
      domainKey === "FOREIGN" ? 24 :
      domainKey === "SETTLEMENT" ? 27 :
      domainKey === "IMMIGRATION" ? 25 :
      domainKey === "VISA" ? 24 :
      domainKey === "CAREER" ? 25 :
      domainKey === "JOB" ? 23 :
      domainKey === "BUSINESS" ? 24 :
      domainKey === "MONEY" ? 23 :
      domainKey === "DEBT" ? 26 :
      domainKey === "PROPERTY" ? 28 :
      domainKey === "VEHICLE" ? 25 :
      domainKey === "HOME" ? 27 :
      domainKey === "EDUCATION" ? 18 :
      domainKey === "HEALTH" ? 22 :
      domainKey === "MENTAL" ? 21 :
      domainKey === "LEGAL" ? 28 :
      domainKey === "DOCUMENT" ? 24 :
      domainKey === "FAMILY" ? 20 :
      domainKey === "LOVE" ? 22 :
      domainKey === "PARTNERSHIP" ? 24 :
      domainKey === "CHILDREN" ? 29 :
      domainKey === "COMMUNICATION" ? 18 :
      domainKey === "NETWORK" ? 22 :
      domainKey === "GAIN" ? 24 :
      domainKey === "LOSS" ? 25 :
      domainKey === "SPIRITUAL" ? 26 :
      domainKey === "SUCCESS" ? 24 :
      domainKey === "FAILURE" ? 23 :
      22;

    return birthYear + base + (eventNumber - 1) * 2 + Math.floor(rankScore / 4);
  };

  ranked_domains.forEach((d) => {
    (d.events || []).forEach((e) => {
      let date_marker = normalizeYear(e.exact_year);

      if (date_marker == null) {
        date_marker = inferYearStrict(
          d.domain_key,
          Number(d.normalized_score || 0),
          Number(e.event_number || 1)
        );
      }

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
        date_marker,
        month_or_phase: e.month_or_phase || null,
        who_involved: e.who_involved || null,
        impact_summary: e.impact_summary || null,
        carryover_to_present: e.carryover_to_present
      });
    });
  });

  return out
    .filter((x) =>
      x.importance === "MAJOR" ||
      [
        "MARRIAGE",
        "DIVORCE",
        "MULTIPLE_MARRIAGE",
        "FOREIGN",
        "SETTLEMENT",
        "IMMIGRATION",
        "VISA",
        "EDUCATION",
        "JOB",
        "BUSINESS",
        "CAREER",
        "HEALTH",
        "MENTAL",
        "MONEY",
        "DEBT",
        "PROPERTY",
        "VEHICLE",
        "HOME",
        "LEGAL",
        "DOCUMENT",
        "FAMILY",
        "LOVE",
        "PARTNERSHIP",
        "CHILDREN"
      ].includes(x.domain_key)
    )
    .sort((a, b) => {
      const aa = a.date_marker ?? 99999;
      const bb = b.date_marker ?? 99999;
      if (aa !== bb) return aa - bb;
      return Number(a.event_number || 0) - Number(b.event_number || 0);
    });
}