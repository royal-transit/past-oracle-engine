// lib/layer-astro.js
// UNIVERSAL HARD-LOCK VERSION
// Purpose:
// - domain-universal event generation
// - no forced completion
// - no pseudo-year for hard life sectors
// - education/work/business separation
// - marriage/divorce/remarriage handled as distinct historical events

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
    const tail = src.slice(idx, idx + 100);
    const m = tail.match(/\b(19|20)\d{2}\b/);
    if (m) return Number(m[0]);
  }
  return null;
}

function buildLifeHints(facts) {
  const raw = String(facts?.raw_text || "");
  return {
    raw_text: raw,
    years: uniqueYears(raw),

    isStudent: hasAny(raw, [
      "student", "study", "studying", "university", "varsity",
      "college", "school", "porashuna", "pora", "campus"
    ]),

    hasJob: hasAny(raw, [
      "job", "work", "employment", "service", "office", "kaj", "chakri"
    ]),

    hasBusiness: hasAny(raw, [
      "business", "trade", "shop", "deal", "bebsha", "dokaan"
    ]),

    foreignIntent: hasAny(raw, [
      "foreign", "abroad", "uk", "usa", "canada", "visa", "immigration", "bidesh"
    ]),

    foreignExecuted: hasAny(raw, [
      "went abroad", "moved abroad", "arrived uk", "came uk",
      "entered uk", "foreign entry", "immigrated"
    ]),

    moneyMention: hasAny(raw, [
      "money", "income", "cash", "financial", "debt", "loan", "taka", "rin", "gain", "loss"
    ]),

    propertyMention: hasAny(raw, [
      "property", "land", "flat", "house", "home", "vehicle", "car",
      "asset", "jomi", "bari", "gari"
    ]),

    healthMention: hasAny(raw, [
      "health", "ill", "illness", "sick", "disease", "surgery",
      "hospital", "osustho", "rog", "mental", "stress"
    ]),

    familyHealthMention: hasAny(raw, [
      "mother ill", "father ill", "ma osustho", "baba osustho",
      "parent ill", "family health"
    ]),

    marriageMention: hasAny(raw, [
      "marriage", "married", "bea", "biye", "wedding", "nikah", "wife", "husband"
    ]),

    divorceMention: hasAny(raw, [
      "divorce", "divorced", "separation", "separated", "talak", "broken marriage"
    ]),

    remarriageMention: hasAny(raw, [
      "second marriage", "2nd marriage", "remarriage", "abar biye",
      "ditiyo biye", "second bea"
    ]),

    foreignEntryYearHint: yearNearKeyword(raw, [
      "uk", "foreign", "abroad", "visa", "immigration", "bidesh", "entry"
    ]),

    settlementYearHint: yearNearKeyword(raw, [
      "settlement", "settled", "stable base", "permanent", "base"
    ])
  };
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
  ["MENTAL", "Mental Pressure / Fear / Overdrive", [1, 4, 8]]
];

const BENEFICS = ["JUPITER", "VENUS", "MOON", "MERCURY"];
const MALEFICS = ["SATURN", "MARS", "RAHU", "KETU", "SUN"];

function strengthLabel(score) {
  return score >= 8 ? "strong" : score >= 5 ? "moderate" : "light";
}

function calculateDomainBaseScore(domainKey, targetHouses, evidence, facts, hints) {
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

  // Fact / reality boosts
  if (domainKey === "MARRIAGE" && (facts.marriage_count_claim != null || hints.marriageMention)) rawScore += 2.8;
  if (domainKey === "DIVORCE" && (facts.broken_marriage_claim != null || hints.divorceMention)) rawScore += 2.6;
  if (domainKey === "MULTIPLE_MARRIAGE" && ((facts.marriage_count_claim ?? 0) >= 2 || hints.remarriageMention)) rawScore += 2.4;

  if (domainKey === "FOREIGN" && (facts.foreign_entry_year_claim != null || hints.foreignIntent)) rawScore += 2.2;
  if (domainKey === "SETTLEMENT" && (facts.settlement_year_claim != null)) rawScore += 2.5;
  if (domainKey === "IMMIGRATION" && (facts.foreign_entry_year_claim != null || hints.foreignIntent)) rawScore += 2.0;
  if (domainKey === "VISA" && hints.foreignIntent) rawScore += 1.4;

  if (domainKey === "EDUCATION" && hints.isStudent) rawScore += 3.0;

  if (domainKey === "JOB" && hints.hasJob) rawScore += 2.8;
  if (domainKey === "CAREER" && hints.hasJob) rawScore += 2.2;
  if (domainKey === "BUSINESS" && hints.hasBusiness) rawScore += 2.8;

  if (domainKey === "MONEY" && hints.moneyMention) rawScore += 2.0;
  if (domainKey === "DEBT" && hints.moneyMention) rawScore += 1.4;
  if (domainKey === "PROPERTY" && hints.propertyMention) rawScore += 2.0;
  if (domainKey === "VEHICLE" && hints.propertyMention) rawScore += 1.2;

  if (domainKey === "HEALTH" && hints.healthMention) rawScore += 2.4;
  if (domainKey === "MENTAL" && hints.healthMention) rawScore += 1.8;
  if (domainKey === "FAMILY" && hints.familyHealthMention) rawScore += 1.6;

  const normalizedScore = round2(Math.min(10, rawScore + targetHouses.length * 0.14));

  return {
    normalizedScore,
    houseHits,
    aspectHits,
    density: normalizedScore >= 7.5 ? "HIGH" : normalizedScore >= 4.5 ? "MED" : "LOW",
    residualImpact: normalizedScore >= 7 ? "HIGH" : normalizedScore >= 4 ? "MED" : "LOW"
  };
}

function buildMarriageEvents(facts, hints, score) {
  const events = [];
  const years = hints.years;
  const total =
    facts.marriage_count_claim ??
    (hints.remarriageMention ? 2 : hints.marriageMention ? 1 : 0);

  const broken =
    facts.broken_marriage_claim ??
    (hints.divorceMention ? 1 : 0);

  if (total > 0) {
    for (let i = 0; i < total; i += 1) {
      const isBrokenLater = i < broken;
      events.push(makeEvent({
        event_family: "RELATIONSHIP_LEDGER",
        event_type:
          i === 0 ? "first marriage event"
            : i === 1 ? "second marriage event"
            : `marriage event #${i + 1}`,
        event_number: i + 1,
        exact_year: years[i] ?? null,
        month_or_phase: years[i] ? "year-anchored phase" : "phase only",
        evidence_strength: "strong",
        status: "EXECUTED",
        importance: "MAJOR",
        trigger_phase: isBrokenLater ? "union then later break" : "union then continuation",
        carryover_to_present: isBrokenLater ? "NO" : "YES",
        who_involved: "partner / spouse",
        impact_summary: isBrokenLater ? "formal union later broke" : "formal union executed"
      }));
    }
    return events;
  }

  if (score >= 7) {
    events.push(makeEvent({
      event_family: "RELATIONSHIP_LEDGER",
      event_type: "marriage formation pattern",
      event_number: 1,
      exact_year: null,
      month_or_phase: "phase only",
      evidence_strength: strengthLabel(score),
      status: "BUILDING",
      importance: "MAJOR",
      trigger_phase: "relationship / union build phase",
      carryover_to_present: "YES",
      who_involved: "partner possibility",
      impact_summary: "marriage pattern present but execution unconfirmed"
    }));
  }

  return events;
}

function buildDivorceEvents(facts, hints, score) {
  const events = [];
  const years = hints.years;
  const broken =
    facts.broken_marriage_claim ??
    (hints.divorceMention ? 1 : 0);

  for (let i = 0; i < broken; i += 1) {
    events.push(makeEvent({
      event_family: "RELATIONSHIP_LEDGER",
      event_type: i === 0 ? "divorce event" : `divorce event #${i + 1}`,
      event_number: i + 1,
      exact_year: years[Math.min(i + 1, years.length - 1)] ?? null,
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
      event_number: 1,
      exact_year: null,
      month_or_phase: "phase only",
      evidence_strength: strengthLabel(score),
      status: "BUILDING",
      importance: "MAJOR",
      trigger_phase: "rupture build phase",
      carryover_to_present: "YES",
      who_involved: "partner / spouse",
      impact_summary: "separation signal present, completion unconfirmed"
    }));
  }

  return events;
}

function buildMultipleMarriageEvents(facts, hints, score) {
  const total = facts.marriage_count_claim ?? (hints.remarriageMention ? 2 : 0);
  if (total >= 2) {
    return [
      makeEvent({
        event_family: "RELATIONSHIP_LEDGER",
        event_type: "multiple marriage pattern",
        event_number: 1,
        exact_year: null,
        month_or_phase: "pattern only",
        evidence_strength: "strong",
        status: "RESIDUAL",
        importance: "MINOR",
        trigger_phase: "repeated union pattern",
        carryover_to_present: "YES",
        who_involved: "relationship history",
        impact_summary: "repeated union signature present"
      })
    ];
  }
  return [];
}

function buildForeignEvents(facts, hints, score) {
  const events = [];
  const entryYear = facts.foreign_entry_year_claim ?? hints.foreignEntryYearHint ?? null;
  const settlementYear = facts.settlement_year_claim ?? hints.settlementYearHint ?? null;

  if (entryYear != null || hints.foreignExecuted) {
    events.push(makeEvent({
      event_family: "FOREIGN_LEDGER",
      event_type: "foreign entry event",
      event_number: 1,
      exact_year: entryYear,
      month_or_phase: entryYear ? "year-anchored phase" : "phase only",
      evidence_strength: "strong",
      status: "EXECUTED",
      importance: "MAJOR",
      trigger_phase: "movement / foreign entry",
      carryover_to_present: "NO",
      who_involved: "self / authority",
      impact_summary: "foreign move executed"
    }));
  } else if (hints.foreignIntent || score >= 7) {
    events.push(makeEvent({
      event_family: "FOREIGN_LEDGER",
      event_type: "foreign movement process",
      event_number: 1,
      exact_year: null,
      month_or_phase: "process phase",
      evidence_strength: strengthLabel(score),
      status: "BUILDING",
      importance: "MAJOR",
      trigger_phase: "documentation / movement build",
      carryover_to_present: "YES",
      who_involved: "self / authority",
      impact_summary: "foreign process ongoing, completion unconfirmed"
    }));
  }

  if (settlementYear != null) {
    events.push(makeEvent({
      event_family: "FOREIGN_LEDGER",
      event_type: "settlement event",
      event_number: 2,
      exact_year: settlementYear,
      month_or_phase: "year-anchored phase",
      evidence_strength: "strong",
      status: "STABILISING",
      importance: "MAJOR",
      trigger_phase: "base consolidation",
      carryover_to_present: "YES",
      who_involved: "self / residence / authority",
      impact_summary: "base formation / settlement"
    }));
  }

  return events;
}

function buildEducationEvents(hints, score) {
  if (!hints.isStudent) return [];
  return [
    makeEvent({
      event_family: "EDUCATION_LEDGER",
      event_type: "study / university phase",
      event_number: 1,
      exact_year: hints.years[0] ?? null,
      month_or_phase: hints.years.length ? "year-anchored phase" : "phase only",
      evidence_strength: strengthLabel(score),
      status: "ACTIVE",
      importance: "MAJOR",
      trigger_phase: "learning / academic continuity",
      carryover_to_present: "YES",
      who_involved: "self / institution",
      impact_summary: "education remains active domain"
    })
  ];
}

function buildWorkEvents(domainKey, hints, score) {
  if (hints.isStudent && !hints.hasJob && !hints.hasBusiness) return [];

  if (domainKey === "JOB" && hints.hasJob) {
    return [
      makeEvent({
        event_family: "WORK_LEDGER",
        event_type: "job / service phase",
        event_number: 1,
        exact_year: hints.years[0] ?? null,
        month_or_phase: hints.years.length ? "year-anchored phase" : "phase only",
        evidence_strength: strengthLabel(score),
        status: "ACTIVE",
        importance: "MAJOR",
        trigger_phase: "employment engagement",
        carryover_to_present: "YES",
        who_involved: "self / authority",
        impact_summary: "job-related activity present"
      })
    ];
  }

  if (domainKey === "BUSINESS" && hints.hasBusiness) {
    return [
      makeEvent({
        event_family: "WORK_LEDGER",
        event_type: "business activity phase",
        event_number: 1,
        exact_year: hints.years[0] ?? null,
        month_or_phase: hints.years.length ? "year-anchored phase" : "phase only",
        evidence_strength: strengthLabel(score),
        status: "ACTIVE",
        importance: "MAJOR",
        trigger_phase: "trade / deal engagement",
        carryover_to_present: "YES",
        who_involved: "self / clients / partner",
        impact_summary: "business activity present"
      })
    ];
  }

  if (domainKey === "CAREER" && (hints.hasJob || hints.hasBusiness)) {
    return [
      makeEvent({
        event_family: "WORK_LEDGER",
        event_type: "career activity phase",
        event_number: 1,
        exact_year: hints.years[0] ?? null,
        month_or_phase: hints.years.length ? "year-anchored phase" : "phase only",
        evidence_strength: strengthLabel(score),
        status: "ACTIVE",
        importance: "MAJOR",
        trigger_phase: "role / authority engagement",
        carryover_to_present: "YES",
        who_involved: "self / authority",
        impact_summary: "career direction active"
      })
    ];
  }

  return [];
}

function buildHealthEvents(hints, score) {
  if (!hints.healthMention && score < 7) return [];
  return [
    makeEvent({
      event_family: "HEALTH_LEDGER",
      event_type: "health pressure phase",
      event_number: 1,
      exact_year: hints.years[0] ?? null,
      month_or_phase: hints.years.length ? "year-anchored phase" : "phase only",
      evidence_strength: strengthLabel(score),
      status: hints.healthMention ? "ACTIVE" : "RESIDUAL",
      importance: "MAJOR",
      trigger_phase: "imbalance / health strain",
      carryover_to_present: "YES",
      who_involved: "self / body",
      impact_summary: "health strain or imbalance indicated"
    })
  ];
}

function buildMoneyEvents(hints, score) {
  if (!hints.moneyMention && score < 7) return [];
  return [
    makeEvent({
      event_family: "MONEY_LEDGER",
      event_type: "money pressure / liquidity phase",
      event_number: 1,
      exact_year: hints.years[0] ?? null,
      month_or_phase: hints.years.length ? "year-anchored phase" : "phase only",
      evidence_strength: strengthLabel(score),
      status: hints.moneyMention ? "ACTIVE" : "RESIDUAL",
      importance: "MAJOR",
      trigger_phase: "income / pressure cycle",
      carryover_to_present: "YES",
      who_involved: "self / finance",
      impact_summary: "money condition or pressure visible"
    })
  ];
}

function buildPropertyEvents(hints, score) {
  if (!hints.propertyMention && score < 7) return [];
  return [
    makeEvent({
      event_family: "ASSET_LEDGER",
      event_type: "property / asset phase",
      event_number: 1,
      exact_year: hints.years[0] ?? null,
      month_or_phase: hints.years.length ? "year-anchored phase" : "phase only",
      evidence_strength: strengthLabel(score),
      status: hints.propertyMention ? "ACTIVE" : "RESIDUAL",
      importance: "MAJOR",
      trigger_phase: "asset / residence focus",
      carryover_to_present: "YES",
      who_involved: "self / family",
      impact_summary: "asset / property signal present"
    })
  ];
}

function inferEvents(domainKey, score, facts, questionProfile) {
  const hints = buildLifeHints(facts);

  switch (domainKey) {
    case "MARRIAGE":
      return buildMarriageEvents(facts, hints, score);
    case "DIVORCE":
      return buildDivorceEvents(facts, hints, score);
    case "MULTIPLE_MARRIAGE":
      return buildMultipleMarriageEvents(facts, hints, score);
    case "FOREIGN":
    case "SETTLEMENT":
    case "IMMIGRATION":
    case "VISA":
      return buildForeignEvents(facts, hints, score);
    case "EDUCATION":
      return buildEducationEvents(hints, score);
    case "JOB":
    case "BUSINESS":
    case "CAREER":
      return buildWorkEvents(domainKey, hints, score);
    case "HEALTH":
    case "MENTAL":
      return buildHealthEvents(hints, score);
    case "MONEY":
    case "DEBT":
      return buildMoneyEvents(hints, score);
    case "PROPERTY":
    case "VEHICLE":
    case "HOME":
      return buildPropertyEvents(hints, score);
    default:
      if (score >= 8) {
        return [
          makeEvent({
            event_family: "DOMAIN_LEDGER",
            event_type: `${domainKey.toLowerCase()} signature`,
            event_number: 1,
            exact_year: null,
            month_or_phase: "phase only",
            evidence_strength: strengthLabel(score),
            status: "RESIDUAL",
            importance: "MINOR",
            trigger_phase: "domain signature",
            carryover_to_present: "YES",
            who_involved: "domain-linked people",
            impact_summary: `${domainKey.toLowerCase()} domain active`
          })
        ];
      }
      return [];
  }
}

export function runAstroLayer({ evidence_packet, facts, question_profile }) {
  const evidence = normalizeEvidence(evidence_packet);

  const domain_results = DOMAIN_REGISTRY.map(([domainKey, domainLabel, targetHouses]) => {
    const base = calculateDomainBaseScore(domainKey, targetHouses, evidence, facts, buildLifeHints(facts));
    const events = inferEvents(domainKey, base.normalizedScore, facts, question_profile);

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
      active_event_count: events.filter((e) => ["ACTIVE", "STABILISING", "EXECUTED"].includes(e.status)).length,
      events
    };
  });

  return {
    evidence_normalized: evidence.meta,
    evidence_runtime: evidence,
    domain_results
  };
}

const HARD_NO_PSEUDO_YEAR = new Set([
  "MARRIAGE",
  "DIVORCE",
  "MULTIPLE_MARRIAGE",
  "FOREIGN",
  "SETTLEMENT",
  "IMMIGRATION",
  "VISA",
  "EDUCATION",
  "HEALTH",
  "MENTAL",
  "JOB",
  "BUSINESS",
  "CAREER",
  "MONEY",
  "DEBT",
  "PROPERTY",
  "VEHICLE",
  "HOME"
]);

export function buildTimeline({ ranked_domains, birth_context }) {
  const birthYear = safeBirthYear(birth_context?.birth_datetime_iso);
  const out = [];

  const inferSoftYear = (domainKey, rankScore, eventNumber) => {
    const base =
      domainKey === "COMMUNICATION" ? 20 :
      domainKey === "FAMILY" ? 22 :
      domainKey === "LOVE" ? 21 :
      domainKey === "CHILDREN" ? 25 :
      domainKey === "LEGAL" ? 24 :
      22;

    if (birthYear == null) return null;
    return birthYear + base + (eventNumber - 1) * 2 + Math.floor(rankScore / 5);
  };

  ranked_domains.forEach((d) => {
    (d.events || []).forEach((e) => {
      let date_marker = normalizeYear(e.exact_year) ?? null;

      if (date_marker == null && !HARD_NO_PSEUDO_YEAR.has(d.domain_key)) {
        date_marker = inferSoftYear(d.domain_key, d.normalized_score, e.event_number || 1);
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
    .filter((x) => x.importance === "MAJOR" || ["MARRIAGE", "DIVORCE", "FOREIGN", "SETTLEMENT", "EDUCATION", "JOB", "BUSINESS", "HEALTH"].includes(x.domain_key))
    .sort((a, b) => {
      const aa = a.date_marker ?? 99999;
      const bb = b.date_marker ?? 99999;
      if (aa !== bb) return aa - bb;
      return Number(a.event_number || 0) - Number(b.event_number || 0);
    });
}