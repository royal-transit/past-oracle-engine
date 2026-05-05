// lib/layer-astro.js
// UNIVERSAL PAST NANO CORE - FULL REPLACEMENT
// KP WEIGHT UPGRADE
// Pattern ≠ executed
// KP supports score/ranking only, not final execution

const round2 = (n) =>
  Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;

const SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
];

const BENEFICS = ["JUPITER", "VENUS", "MOON", "MERCURY"];
const MALEFICS = ["SATURN", "MARS", "RAHU", "KETU", "SUN"];

function signToIndex(sign) {
  return SIGNS.indexOf(sign);
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
  return [...new Set(
    [...String(text || "").matchAll(/\b(19|20)\d{2}\b/g)].map((m) => Number(m[0]))
  )].sort((a, b) => a - b);
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
  evidence_type = "DIRECT"
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
    impact_summary,
    evidence_type
  };
}

function strengthLabel(score) {
  return score >= 8 ? "strong" : score >= 5 ? "moderate" : "light";
}

/* =========================
   DOMAIN REGISTRY
========================= */

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

/* =========================
   NORMALIZE EVIDENCE
========================= */

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
    divisional: packet?.divisional || {},
    meta: {
      natal_planet_count: natalPlanets.length,
      transit_planet_count: transitPlanets.length,
      aspect_count: aspects.length,
      ascendant_present: !!asc,
      house_mapping_present: Object.keys(housesByPlanet).length > 0,
      kp_present: !!packet?.kp,
      dasha_present: !!packet?.dasha
    }
  };
}

/* =========================
   MODE + NAME HINTS
========================= */

function getModeFlags(subject_context, birth_context) {
  const subjectMode = String(subject_context?.subject_mode || "");
  const identityDepth = String(subject_context?.identity_depth || "");
  const precisionMode = String(birth_context?.precision_mode || "");

  return {
    isNameOnly:
      subject_context?.is_name_only_mode === true ||
      identityDepth === "LEVEL_2_NAME_ONLY" ||
      subjectMode === "NAME_ONLY_PAST" ||
      precisionMode === "NAME_ONLY",

    isNameContext:
      subject_context?.is_name_context_mode === true ||
      identityDepth === "LEVEL_3_NAME_CONTEXT" ||
      subjectMode === "NAME_CONTEXT_PAST" ||
      precisionMode === "NAME_CONTEXT",

    isReducedDob:
      identityDepth === "LEVEL_4_NAME_DOB" ||
      identityDepth === "LEVEL_3_DOB_ONLY" ||
      precisionMode === "DOB_ONLY_REDUCED" ||
      precisionMode === "DOB_POB_REDUCED",

    isFullBirth:
      subject_context?.is_full_birth_locked === true ||
      identityDepth === "LEVEL_5_FULL_BIRTH" ||
      precisionMode === "FULL_BIRTH" ||
      precisionMode === "DOB_TOB"
  };
}

function buildNameOnlyHints(subject_context) {
  const profile = subject_context?.name_profile || {};
  const root = Number(profile.root_number || 0);

  return {
    raw_name: profile.raw_name || null,
    root_number: root,
    vibration_class: String(profile.vibration_class || "NEUTRAL").toUpperCase(),
    token_count: Number(profile.token_count || 0),
    syllable_count: Number(profile.syllable_count || 0),
    first_sound_key: profile.first_sound_key || null,
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

function nameOnlyBoost(domainKey, nameHints) {
  if (!nameHints) return 0;

  switch (domainKey) {
    case "LOVE":
    case "PARTNERSHIP":
    case "MARRIAGE":
    case "DIVORCE":
    case "MULTIPLE_MARRIAGE":
      return nameHints.relationBias;
    case "MONEY":
    case "DEBT":
    case "GAIN":
    case "LOSS":
    case "BUSINESS":
      return nameHints.moneyBias;
    case "MIND":
    case "MENTAL":
      return nameHints.mindBias;
    case "ENEMY":
    case "LEGAL":
    case "BLOCKAGE":
    case "FAILURE":
      return nameHints.conflictBias;
    case "FOREIGN":
    case "IMMIGRATION":
    case "VISA":
    case "COMMUNICATION":
    case "NETWORK":
      return nameHints.mobilityBias;
    case "CAREER":
    case "JOB":
    case "SUCCESS":
      return nameHints.authorityBias;
    case "SPIRITUAL":
    case "RELIGION":
    case "LOSS":
      return nameHints.withdrawalBias;
    case "FAMILY":
    case "HOME":
      return nameHints.familyBias;
    default:
      return 0.25;
  }
}

/* =========================
   FACT HINTS
========================= */

function buildHints(facts) {
  const raw = String(facts?.raw_text || "");
  const years = uniqueYears(raw);

  const abroadNow = hasAny(raw, [
    "already in uk", "in uk", "living in uk", "lives in uk", "based in uk",
    "uk based", "uk resident", "currently in uk", "london", "england",
    "abroad now", "already abroad", "living abroad", "foreign resident"
  ]);

  const marriageDoneByRole = hasAny(raw, [
    "wife", "husband", "spouse", "my wife", "my husband", "his wife", "her husband"
  ]);

  return {
    raw_text: raw,
    years,

    isStudent: hasAny(raw, ["student", "study", "university", "college", "school", "exam"]),
    hasJob: hasAny(raw, ["job", "work", "employment", "service", "office", "salary"]),
    hasBusiness: hasAny(raw, ["business", "trade", "shop", "deal", "company", "client"]),

    foreignIntent: hasAny(raw, ["foreign", "abroad", "uk", "visa", "immigration", "bidesh", "relocation"]),
    foreignExecuted: abroadNow || hasAny(raw, [
      "went abroad", "arrived uk", "came uk", "came to uk", "entered uk",
      "moved abroad", "foreign entry", "immigrated"
    ]),
    abroadNow,

    settlementMention: abroadNow || hasAny(raw, [
      "settlement", "settled", "permanent", "ilr", "residence", "base"
    ]),

    legalMention: hasAny(raw, ["legal", "court", "case", "penalty", "authority", "appeal", "tribunal"]),
    documentMention: hasAny(raw, ["document", "paper", "paperwork", "records", "approval", "form", "letter"]),

    marriageMention: marriageDoneByRole || hasAny(raw, ["marriage", "married", "bea", "biye", "nikah", "wedding"]),
    marriageDoneByRole,
    divorceMention: hasAny(raw, ["divorce", "divorced", "separation", "separated", "talak"]),
    remarriageMention: hasAny(raw, ["second marriage", "2nd marriage", "remarriage", "abar biye"]),
    relationshipMention: hasAny(raw, ["relationship", "love", "affair", "partner", "proposal", "bond"]),
    childrenMention: hasAny(raw, ["child", "children", "baby", "son", "daughter", "pregnancy"]),

    familyMention: hasAny(raw, ["family", "mother", "father", "ma", "baba", "sister", "brother", "parent"]),
    healthMention: hasAny(raw, ["health", "ill", "illness", "sick", "disease", "surgery", "hospital", "stress"]),
    mentalMention: hasAny(raw, ["mental", "depression", "anxiety", "stress", "fear", "panic", "overthinking"]),
    moneyMention: hasAny(raw, ["money", "income", "cash", "financial", "debt", "loan", "loss", "profit"]),
    propertyMention: hasAny(raw, ["property", "land", "flat", "house", "home", "vehicle", "car", "asset"]),
    enemyMention: hasAny(raw, ["enemy", "opposition", "rival", "hidden enemy"]),
    networkMention: hasAny(raw, ["friend", "network", "circle", "support", "ally"]),
    spiritualMention: hasAny(raw, ["spiritual", "religion", "dharma", "occult", "zikr", "sadhana"]),

    marriage_count_claim: facts?.marriage_count_claim ?? null,
    broken_marriage_claim: facts?.broken_marriage_count ?? facts?.broken_marriage_claim ?? null,
    foreign_entry_year_claim: facts?.foreign_entry_year_claim ?? null,
    settlement_year_claim: facts?.settlement_year_claim ?? null
  };
}

/* =========================
   KP + DASHA WEIGHT
========================= */

function domainPlanetLords(domainKey) {
  const map = {
    FOREIGN: ["RAHU", "MERCURY", "JUPITER", "SATURN"],
    IMMIGRATION: ["RAHU", "MERCURY", "JUPITER", "SATURN"],
    VISA: ["MERCURY", "RAHU", "SUN", "SATURN"],
    SETTLEMENT: ["MOON", "SATURN", "RAHU", "VENUS"],
    DOCUMENT: ["MERCURY", "SATURN", "SUN"],
    LEGAL: ["SATURN", "MARS", "SUN", "RAHU"],
    JOB: ["SATURN", "SUN", "MERCURY"],
    CAREER: ["SUN", "SATURN", "MERCURY"],
    BUSINESS: ["MERCURY", "VENUS", "MARS", "RAHU"],
    MONEY: ["VENUS", "JUPITER", "MERCURY"],
    DEBT: ["SATURN", "RAHU", "MARS"],
    PROPERTY: ["MOON", "MARS", "VENUS", "SATURN"],
    VEHICLE: ["VENUS", "MARS", "RAHU"],
    EDUCATION: ["JUPITER", "MERCURY", "SUN"],
    MARRIAGE: ["VENUS", "JUPITER", "MOON"],
    DIVORCE: ["MARS", "SATURN", "RAHU", "KETU"],
    HEALTH: ["SATURN", "MARS", "KETU"],
    MENTAL: ["MOON", "RAHU", "SATURN"],
    SPIRITUAL: ["KETU", "JUPITER", "SUN"],
    FAMILY: ["MOON", "VENUS", "JUPITER"]
  };

  return map[domainKey] || [];
}

function readKpCusps(kp) {
  if (!kp || typeof kp !== "object") return {};
  if (kp.cusps && typeof kp.cusps === "object") return kp.cusps;

  const numericKeys = Object.keys(kp).filter((k) => /^\d+$/.test(k));
  if (numericKeys.length) return kp;

  return {};
}

function lordOf(v) {
  return String(v || "").trim().toUpperCase();
}

function buildKpWeight(domainKey, targetHouses, evidence, modeFlags) {
  const kp = evidence.kp || {};
  const cusps = readKpCusps(kp);
  const required = new Set(targetHouses.map(String));
  const domainLords = domainPlanetLords(domainKey);
  const reasons = [];
  let weight = 0;

  for (const [cuspNo, cusp] of Object.entries(cusps)) {
    if (!required.has(String(cuspNo))) continue;

    const sub = lordOf(cusp?.sub_lord);
    const star = lordOf(cusp?.star_lord);
    const signLord = lordOf(cusp?.sign_lord);

    if (sub && domainLords.includes(sub)) {
      weight += 1.4;
      reasons.push(`KP cusp ${cuspNo} sub-lord ${sub}`);
    }

    if (star && domainLords.includes(star)) {
      weight += 0.8;
      reasons.push(`KP cusp ${cuspNo} star-lord ${star}`);
    }

    if (signLord && domainLords.includes(signLord)) {
      weight += 0.35;
      reasons.push(`KP cusp ${cuspNo} sign-lord ${signLord}`);
    }
  }

  const proxyLord = lordOf(kp.ascendant_sub_lord);
  if (!Object.keys(cusps).length && proxyLord && domainLords.includes(proxyLord)) {
    weight += modeFlags.isFullBirth ? 0.9 : 0.45;
    reasons.push(`KP proxy ascendant sub-lord ${proxyLord}`);
  }

  return {
    kp_weight: round2(Math.min(weight, 3.2)),
    kp_reasons: reasons
  };
}

function buildDashaWeight(domainKey, evidence) {
  const dasha = evidence.dasha || {};
  const domainLords = domainPlanetLords(domainKey);
  const lords = [
    lordOf(dasha.mahadasha),
    lordOf(dasha.antardasha),
    lordOf(dasha.pratyantar)
  ].filter(Boolean);

  let weight = 0;
  const reasons = [];

  lords.forEach((lord, idx) => {
    if (!domainLords.includes(lord)) return;
    const add = idx === 0 ? 1.1 : idx === 1 ? 0.7 : 0.35;
    weight += add;
    reasons.push(`Dasha ${lord}`);
  });

  return {
    dasha_weight: round2(Math.min(weight, 2.2)),
    dasha_reasons: reasons
  };
}

/* =========================
   SCORING
========================= */

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

  if (modeFlags.isNameOnly || modeFlags.isNameContext) {
    rawScore += nameOnlyBoost(domainKey, nameHints);
  }

  if (modeFlags.isReducedDob) rawScore += 0.45;

  const kp = buildKpWeight(domainKey, targetHouses, evidence, modeFlags);
  const dasha = buildDashaWeight(domainKey, evidence);

  rawScore += kp.kp_weight + dasha.dasha_weight;

  const normalizedScore = round2(Math.min(10, rawScore + targetHouses.length * 0.14));

  return {
    normalizedScore,
    houseHits,
    aspectHits,
    kp_weight: kp.kp_weight,
    kp_reasons: kp.kp_reasons,
    dasha_weight: dasha.dasha_weight,
    dasha_reasons: dasha.dasha_reasons,
    density: normalizedScore >= 7.5 ? "HIGH" : normalizedScore >= 4.5 ? "MED" : "LOW",
    residualImpact: normalizedScore >= 7 ? "HIGH" : normalizedScore >= 4 ? "MED" : "LOW"
  };
}

/* =========================
   EVENT BUILDERS
========================= */

function buildForeignEvents(domainKey, hints, score, modeFlags) {
  const events = [];
  const entryYear = hints.foreign_entry_year_claim ?? null;
  const settlementYear = hints.settlement_year_claim ?? null;
  const timelineAllowed = !(modeFlags.isNameOnly || modeFlags.isNameContext);

  if (entryYear != null || hints.foreignExecuted || hints.abroadNow) {
    events.push(makeEvent({
      event_family: "FOREIGN_LEDGER",
      event_type: hints.abroadNow ? "foreign residence / presence event" : "foreign entry event",
      exact_year: timelineAllowed ? entryYear : null,
      month_or_phase: timelineAllowed && entryYear ? "year-anchored phase" : "phase-confirmed foreign movement",
      evidence_strength: "strong",
      status: "EXECUTED",
      importance: "MAJOR",
      trigger_phase: "movement / foreign entry",
      carryover_to_present: "YES",
      who_involved: "self / authority",
      impact_summary: hints.abroadNow ? "foreign presence already active" : "foreign movement executed",
      evidence_type: timelineAllowed ? "DIRECT" : "PATTERN_CONFIRMED"
    }));
  } else if (hints.foreignIntent || score >= 5) {
    events.push(makeEvent({
      event_family: "FOREIGN_LEDGER",
      event_type: "foreign process / movement pattern",
      exact_year: null,
      month_or_phase: "process phase",
      evidence_strength: strengthLabel(score),
      status: score >= 7 ? "BUILDING" : "RESIDUAL",
      importance: "MAJOR",
      trigger_phase: "visa / movement / relocation build",
      carryover_to_present: "YES",
      who_involved: "self / authority",
      impact_summary: "foreign linkage present, execution unconfirmed",
      evidence_type: "LIKELY_HISTORY"
    }));
  }

  if (domainKey === "SETTLEMENT" && (settlementYear != null || hints.settlementMention || hints.abroadNow)) {
    events.push(makeEvent({
      event_family: "FOREIGN_LEDGER",
      event_type: "settlement / base process",
      event_number: 2,
      exact_year: timelineAllowed ? settlementYear : null,
      month_or_phase: timelineAllowed && settlementYear ? "year-anchored phase" : "settlement pattern",
      evidence_strength: settlementYear || hints.abroadNow ? "strong" : strengthLabel(score),
      status: settlementYear ? "EXECUTED" : "BUILDING",
      importance: "MAJOR",
      trigger_phase: "base consolidation",
      carryover_to_present: "YES",
      who_involved: "self / residence / authority",
      impact_summary: settlementYear ? "settlement completed" : "settlement tendency visible, completion unconfirmed",
      evidence_type: timelineAllowed ? "DIRECT" : "PATTERN_CONFIRMED"
    }));
  }

  return events;
}

function buildSimpleEvents(domainKey, hints, score, modeFlags) {
  const years = hints.years;
  const weakEvidence = modeFlags.isNameOnly || modeFlags.isNameContext ? "NAME_PATTERN" : "LIKELY_HISTORY";

  const map = {
    EDUCATION: ["EDUCATION_LEDGER", "study / university phase", hints.isStudent, "self / institution"],
    JOB: ["WORK_LEDGER", "job / service phase", hints.hasJob, "self / authority"],
    BUSINESS: ["WORK_LEDGER", "business activity phase", hints.hasBusiness, "self / client / partner"],
    CAREER: ["WORK_LEDGER", "career direction phase", hints.hasJob || hints.hasBusiness, "self / authority"],
    MONEY: ["MONEY_LEDGER", "money / liquidity phase", hints.moneyMention, "self / finance"],
    DEBT: ["MONEY_LEDGER", "debt / pressure phase", hints.moneyMention, "self / finance"],
    PROPERTY: ["ASSET_LEDGER", "property / asset phase", hints.propertyMention, "self / family"],
    VEHICLE: ["ASSET_LEDGER", "vehicle / transport phase", hints.propertyMention, "self / vehicle"],
    HEALTH: ["HEALTH_LEDGER", "health pressure phase", hints.healthMention, "self / body"],
    MENTAL: ["HEALTH_LEDGER", "mental pressure phase", hints.mentalMention, "self / mind"],
    FAMILY: ["FAMILY_LEDGER", "family responsibility phase", hints.familyMention, "parent / family"],
    LEGAL: ["LEGAL_LEDGER", "legal / authority phase", hints.legalMention, "self / authority"],
    DOCUMENT: ["LEGAL_LEDGER", "document / paperwork phase", hints.documentMention, "self / authority"],
    ENEMY: ["CONFLICT_LEDGER", "enemy / opposition phase", hints.enemyMention, "rival / hidden opponent"],
    NETWORK: ["NETWORK_LEDGER", "network / support phase", hints.networkMention, "friends / network"],
    SPIRITUAL: ["SPIRITUAL_LEDGER", "spiritual / inward turning phase", hints.spiritualMention, "self / belief"],
    RELIGION: ["SPIRITUAL_LEDGER", "religion / dharma phase", hints.spiritualMention, "self / belief"]
  };

  const cfg = map[domainKey];
  if (!cfg) return [];
  const [family, type, direct, who] = cfg;

  if (!direct && score < 5) return [];

  return [makeEvent({
    event_family: family,
    event_type: type,
    exact_year: direct ? years[0] ?? null : null,
    month_or_phase: direct && years.length ? "year-anchored phase" : "phase only",
    evidence_strength: strengthLabel(score),
    status: direct ? "ACTIVE" : "RESIDUAL",
    importance: score >= 6 ? "MAJOR" : "MINOR",
    trigger_phase: direct ? "domain active by fact" : "domain pattern only",
    carryover_to_present: direct ? "YES" : "NO",
    who_involved: who,
    impact_summary: direct ? "domain active" : "pattern visible, execution unconfirmed",
    evidence_type: direct ? "DIRECT" : weakEvidence
  })];
}

function buildRelationshipEvents(domainKey, hints, score, modeFlags) {
  const timelineAllowed = !(modeFlags.isNameOnly || modeFlags.isNameContext);
  const total =
    hints.marriage_count_claim ??
    (hints.remarriageMention ? 2 : null) ??
    (hints.marriageDoneByRole ? 1 : null) ??
    (hints.marriageMention ? 1 : 0);

  if (domainKey === "MARRIAGE" && total > 0) {
    return Array.from({ length: total }).map((_, i) => makeEvent({
      event_family: "RELATIONSHIP_LEDGER",
      event_type: i === 0 ? "first marriage event" : `marriage event #${i + 1}`,
      event_number: i + 1,
      exact_year: timelineAllowed ? hints.years[i] ?? null : null,
      month_or_phase: timelineAllowed && hints.years[i] ? "year-anchored phase" : "pattern-confirmed phase",
      evidence_strength: "strong",
      status: "EXECUTED",
      importance: "MAJOR",
      trigger_phase: "union execution",
      carryover_to_present: "YES",
      who_involved: "spouse / partner",
      impact_summary: "formal union executed",
      evidence_type: timelineAllowed ? "DIRECT" : "PATTERN_CONFIRMED"
    }));
  }

  if (domainKey === "DIVORCE" && (hints.broken_marriage_claim || hints.divorceMention)) {
    return [makeEvent({
      event_family: "RELATIONSHIP_LEDGER",
      event_type: "divorce / separation event",
      exact_year: timelineAllowed ? hints.years.slice(-1)[0] ?? null : null,
      month_or_phase: "rupture phase",
      evidence_strength: "strong",
      status: "EXECUTED",
      importance: "MAJOR",
      trigger_phase: "rupture / severance",
      carryover_to_present: "YES",
      who_involved: "spouse / legal partner",
      impact_summary: "separation / divorce visible",
      evidence_type: timelineAllowed ? "DIRECT" : "PATTERN_CONFIRMED"
    })];
  }

  if (["LOVE", "PARTNERSHIP"].includes(domainKey) && (hints.relationshipMention || score >= 5)) {
    return [makeEvent({
      event_family: "RELATIONSHIP_LEDGER",
      event_type: "relationship / attachment phase",
      exact_year: hints.relationshipMention ? hints.years[0] ?? null : null,
      month_or_phase: hints.years.length ? "year-anchored phase" : "phase only",
      evidence_strength: strengthLabel(score),
      status: hints.relationshipMention ? "ACTIVE" : "RESIDUAL",
      importance: score >= 7 ? "MAJOR" : "MINOR",
      trigger_phase: "bond formation / emotional attachment",
      carryover_to_present: hints.relationshipMention ? "YES" : "NO",
      who_involved: "self / partner",
      impact_summary: "relationship pattern active",
      evidence_type: hints.relationshipMention ? "DIRECT" : "NAME_PATTERN"
    })];
  }

  if (domainKey === "CHILDREN" && (hints.childrenMention || score >= 5)) {
    return [makeEvent({
      event_family: "CHILDREN_LEDGER",
      event_type: "children / continuity phase",
      exact_year: hints.childrenMention ? hints.years[0] ?? null : null,
      month_or_phase: hints.years.length ? "year-anchored phase" : "phase only",
      evidence_strength: strengthLabel(score),
      status: hints.childrenMention ? "ACTIVE" : "RESIDUAL",
      importance: "MAJOR",
      trigger_phase: "child / continuity axis active",
      carryover_to_present: hints.childrenMention ? "YES" : "NO",
      who_involved: "child / family",
      impact_summary: "children-related domain active",
      evidence_type: hints.childrenMention ? "DIRECT" : "LIKELY_HISTORY"
    })];
  }

  return [];
}

function inferEvents(domainKey, score, facts, modeFlags) {
  const hints = buildHints(facts);

  if (["FOREIGN", "SETTLEMENT", "IMMIGRATION", "VISA"].includes(domainKey)) {
    return buildForeignEvents(domainKey, hints, score, modeFlags);
  }

  if (["MARRIAGE", "DIVORCE", "MULTIPLE_MARRIAGE", "LOVE", "PARTNERSHIP", "CHILDREN"].includes(domainKey)) {
    return buildRelationshipEvents(domainKey, hints, score, modeFlags);
  }

  const simple = buildSimpleEvents(domainKey, hints, score, modeFlags);
  if (simple.length) return simple;

  if (score >= 8) {
    return [makeEvent({
      event_family: "DOMAIN_LEDGER",
      event_type: `${domainKey.toLowerCase()} signature`,
      month_or_phase: "phase only",
      evidence_strength: strengthLabel(score),
      status: "RESIDUAL",
      importance: "MINOR",
      trigger_phase: "domain signature",
      carryover_to_present: "NO",
      who_involved: "domain-linked people",
      impact_summary: `${domainKey.toLowerCase()} pattern visible, fact not confirmed`,
      evidence_type: modeFlags.isNameOnly ? "NAME_PATTERN" : "LIKELY_HISTORY"
    })];
  }

  return [];
}

function applyNameOnlyPastOverride(domain_results, modeFlags) {
  if (!modeFlags.isNameOnly && !modeFlags.isNameContext) return domain_results;

  return domain_results.map((d) => {
    const patternEvidenceCount = (d.events || []).filter((e) =>
      ["NAME_PATTERN", "LIKELY_HISTORY", "PATTERN_CONFIRMED"].includes(e.evidence_type)
    ).length;

    const directEvidenceCount = (d.events || []).filter((e) => e.evidence_type === "DIRECT").length;

    return {
      ...d,
      pattern_mode_active: true,
      direct_evidence_count: directEvidenceCount,
      pattern_evidence_count: patternEvidenceCount,
      exact_timeline_allowed: false,
      exact_claims_locked: true
    };
  });
}

/* =========================
   MAIN ASTRO LAYER
========================= */

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
      kp_weight: base.kp_weight,
      kp_reasons: base.kp_reasons,
      dasha_weight: base.dasha_weight,
      dasha_reasons: base.dasha_reasons,
      present_carryover: events.some((e) => e.carryover_to_present === "YES") ? "YES" : "NO",
      house_hits: base.houseHits,
      aspect_hits: base.aspectHits,
      major_event_count: events.filter((e) => e.importance === "MAJOR").length,
      minor_event_count: events.filter((e) => e.importance === "MINOR").length,
      broken_event_count: events.filter((e) => e.status === "BROKEN").length,
      active_event_count: events.filter((e) =>
        ["ACTIVE", "STABILISING", "EXECUTED", "BUILDING"].includes(e.status)
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

/* =========================
   TIMELINE
========================= */

export function buildTimeline({ ranked_domains, birth_context, subject_context }) {
  const birthYear = safeBirthYear(birth_context?.birth_datetime_iso);
  const modeFlags = getModeFlags(subject_context, birth_context);
  const out = [];

  const inferYearStrict = (domainKey, rankScore, eventNumber) => {
    if (birthYear == null) return null;

    const base =
      domainKey === "MARRIAGE" ? 26 :
      domainKey === "DIVORCE" ? 29 :
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
      domainKey === "EDUCATION" ? 18 :
      domainKey === "HEALTH" ? 22 :
      domainKey === "MENTAL" ? 21 :
      domainKey === "LEGAL" ? 28 :
      domainKey === "DOCUMENT" ? 24 :
      domainKey === "FAMILY" ? 20 :
      domainKey === "LOVE" ? 22 :
      domainKey === "PARTNERSHIP" ? 24 :
      domainKey === "CHILDREN" ? 29 :
      domainKey === "SPIRITUAL" ? 26 :
      22;

    return birthYear + base + (Number(eventNumber || 1) - 1) * 2 + Math.floor(Number(rankScore || 0) / 4);
  };

  ranked_domains.forEach((d) => {
    (d.events || []).forEach((e) => {
      let date_marker = normalizeYear(e.exact_year);

      if ((modeFlags.isNameOnly || modeFlags.isNameContext) && !birthYear) {
        date_marker = null;
      } else if (date_marker == null && e.evidence_type === "DIRECT") {
        date_marker = inferYearStrict(d.domain_key, d.normalized_score, e.event_number);
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
        evidence_type: e.evidence_type || null,
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
        "MARRIAGE", "DIVORCE", "FOREIGN", "SETTLEMENT", "IMMIGRATION", "VISA",
        "EDUCATION", "JOB", "BUSINESS", "CAREER", "HEALTH", "MENTAL",
        "MONEY", "DEBT", "PROPERTY", "VEHICLE", "LEGAL", "DOCUMENT",
        "FAMILY", "LOVE", "PARTNERSHIP", "CHILDREN"
      ].includes(x.domain_key)
    )
    .sort((a, b) => {
      const aa = a.date_marker ?? 99999;
      const bb = b.date_marker ?? 99999;
      if (aa !== bb) return aa - bb;
      return Number(a.event_number || 0) - Number(b.event_number || 0);
    });
}