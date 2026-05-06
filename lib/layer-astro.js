// lib/layer-astro.js
// FULL REPLACEMENT — UNIVERSAL PAST NANO CORE V8
// NAME_ONLY_STRONG_PATTERN_MODE
// FULL_BIRTH_MAX_FORENSIC_MODE
// Name-only gives strong likely windows, never confirmed execution.
// Full birth allows maximum forensic scoring.

const round2 = (n) => Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;

const SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
];

const BENEFICS = ["JUPITER", "VENUS", "MOON", "MERCURY"];
const MALEFICS = ["SATURN", "MARS", "RAHU", "KETU", "SUN"];

const DOMAIN_WINDOWS = {
  FOREIGN: [20, 29],
  IMMIGRATION: [20, 31],
  VISA: [19, 30],
  SETTLEMENT: [28, 40],
  EDUCATION: [16, 26],
  JOB: [21, 32],
  CAREER: [23, 36],
  BUSINESS: [25, 42],
  MONEY: [22, 44],
  PROPERTY: [28, 48],
  VEHICLE: [22, 40],
  MARRIAGE: [24, 34],
  DIVORCE: [28, 42],
  LOVE: [20, 32],
  PARTNERSHIP: [24, 40],
  CHILDREN: [27, 40],
  HEALTH: [24, 46],
  MENTAL: [18, 42],
  LEGAL: [26, 44],
  DOCUMENT: [20, 42],
  SPIRITUAL: [28, 50],
  SUCCESS: [28, 46],
  BLOCKAGE: [22, 42],
  DEBT: [24, 44],
  NETWORK: [20, 40],
  FAMILY: [18, 38],
  HOME: [24, 44],
  RELIGION: [28, 50]
};

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

function ageWindow(domainKey) {
  return DOMAIN_WINDOWS[domainKey] || [22, 40];
}

function yearWindowFromAge(birthIso, domainKey) {
  const by = safeBirthYear(birthIso);
  if (!by) return null;
  const [a, b] = ageWindow(domainKey);
  return [by + a, by + b];
}

function makeEvent({
  event_family = null,
  event_type = "domain event",
  event_number = 1,
  exact_year = null,
  month_or_phase = null,
  evidence_strength = "moderate",
  status = "PATTERN_ONLY",
  importance = "MINOR",
  trigger_phase = null,
  carryover_to_present = "NO",
  who_involved = null,
  impact_summary = null,
  evidence_type = "PATTERN_ONLY",
  likely_age_window = null,
  likely_year_window = null,
  timing_mode = "PATTERN_WINDOW"
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
    evidence_type,
    likely_age_window,
    likely_year_window,
    timing_mode
  };
}

function strengthLabel(score) {
  return score >= 8 ? "strong" : score >= 5 ? "moderate" : "light";
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

export function normalizeEvidence(packet) {
  const natalPlanets = packet?.natal?.planets || [];
  const transitPlanets = packet?.transit_now?.planets || [];
  const aspects = packet?.natal?.aspects || packet?.transit_now?.aspects || [];
  const asc = packet?.natal?.ascendant || packet?.transit_now?.ascendant || null;

  const natalMap = {};
  natalPlanets.forEach((p) => {
    natalMap[(p.planet || "").toUpperCase()] = p;
  });

  const transitMap = {};
  transitPlanets.forEach((p) => {
    transitMap[(p.planet || "").toUpperCase()] = p;
  });

  const housesByPlanet = packet?.natal?.houses_by_planet && Object.keys(packet.natal.houses_by_planet).length
    ? packet.natal.houses_by_planet
    : {};

  if (!Object.keys(housesByPlanet).length && asc) {
    const ascIndex = signToIndex(asc.sign);
    natalPlanets.forEach((p) => {
      const pIndex = signToIndex(p.sign);
      if (ascIndex >= 0 && pIndex >= 0) {
        housesByPlanet[(p.planet || "").toUpperCase()] = ((pIndex - ascIndex + 12) % 12) + 1;
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

  return {
    isNameOnly,
    isNameContext,
    isReducedDob,
    isFullBirth,
    execution_claim_allowed: isFullBirth || isReducedDob,
    name_pattern_timing_allowed: isNameOnly || isNameContext,
    likely_age_window_allowed: true,
    likely_year_window_allowed: isReducedDob || isFullBirth,
    oracle_mode: isFullBirth
      ? "FULL_BIRTH_MAX_FORENSIC_MODE"
      : isReducedDob
      ? "DOB_REDUCED_FORENSIC_PATTERN_MODE"
      : isNameContext
      ? "NAME_CONTEXT_STRONG_PATTERN_MODE"
      : isNameOnly
      ? "NAME_ONLY_STRONG_PATTERN_MODE"
      : "GENERAL_PATTERN_MODE"
  };
}

function buildNameOnlyHints(subject_context) {
  const profile = subject_context?.name_profile || {};
  const root = Number(profile.root_number || 0);
  const first = String(profile.first_sound_key || "").toLowerCase();

  const soundBoost = {
    r: { relation: 1.2, authority: 1.0, money: 0.8 },
    s: { conflict: 1.2, spiritual: 0.8, mobility: 0.8 },
    m: { family: 1.2, money: 0.8 },
    a: { authority: 1.5, identity: 1.3 },
    k: { communication: 1.2, business: 0.8 },
    j: { foreign: 1.1, education: 1.0 },
    p: { career: 1.0, document: 1.0 },
    f: { network: 1.0, foreign: 0.8 }
  }[first] || {};

  return {
    raw_name: profile.raw_name || null,
    root_number: root,
    vibration_class: String(profile.vibration_class || "NEUTRAL").toUpperCase(),
    token_count: Number(profile.token_count || 0),
    syllable_count: Number(profile.syllable_count || 0),
    first_sound_key: profile.first_sound_key || null,
    relationBias: ([2, 6].includes(root) ? 3.2 : [3, 5].includes(root) ? 2.0 : 1.0) + (soundBoost.relation || 0),
    moneyBias: ([4, 8].includes(root) ? 3.0 : [1, 5].includes(root) ? 2.0 : 1.0) + (soundBoost.money || 0),
    mindBias: ([2, 7].includes(root) ? 3.0 : [9].includes(root) ? 2.2 : 1.2),
    conflictBias: ([4, 8, 9].includes(root) ? 3.0 : 1.1) + (soundBoost.conflict || 0),
    mobilityBias: ([5].includes(root) ? 3.3 : [3].includes(root) ? 2.2 : 1.1) + (soundBoost.mobility || soundBoost.foreign || 0),
    authorityBias: ([1, 8].includes(root) ? 3.1 : 1.2) + (soundBoost.authority || 0),
    withdrawalBias: ([7].includes(root) ? 3.0 : 0.8) + (soundBoost.spiritual || 0),
    familyBias: ([6, 2].includes(root) ? 2.8 : 1.0) + (soundBoost.family || 0),
    businessBias: ([1, 3, 5, 8].includes(root) ? 2.4 : 1.0) + (soundBoost.business || 0),
    educationBias: ([3, 5, 7].includes(root) ? 2.0 : 1.0) + (soundBoost.education || 0),
    documentBias: ([4, 5, 8].includes(root) ? 1.8 : 1.0) + (soundBoost.document || 0),
    identityBias: ([1, 9].includes(root) ? 2.5 : 1.0) + (soundBoost.identity || 0),
    networkBias: ([3, 5, 6].includes(root) ? 2.0 : 1.0) + (soundBoost.network || 0)
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
      return h.moneyBias;
    case "BUSINESS":
      return h.businessBias + h.moneyBias * 0.4;
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
      return h.mobilityBias;
    case "NETWORK":
      return h.networkBias + h.mobilityBias * 0.25;
    case "CAREER":
    case "JOB":
    case "SUCCESS":
      return h.authorityBias;
    case "SPIRITUAL":
    case "RELIGION":
      return h.withdrawalBias + h.mindBias * 0.25;
    case "FAMILY":
    case "HOME":
    case "PROPERTY":
      return h.familyBias + h.moneyBias * 0.25;
    case "EDUCATION":
    case "DOCUMENT":
      return h.educationBias + h.documentBias * 0.35;
    case "IDENTITY":
      return h.identityBias;
    default:
      return 0.8;
  }
}

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
    foreignExecuted: abroadNow || hasAny(raw, ["went abroad", "arrived uk", "came uk", "came to uk", "entered uk", "moved abroad", "foreign entry", "immigrated"]),
    abroadNow,
    settlementMention: abroadNow || hasAny(raw, ["settlement", "settled", "permanent", "ilr", "residence", "base"]),
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
    FAMILY: ["MOON", "VENUS", "JUPITER"],
    SUCCESS: ["SUN", "JUPITER", "RAHU"],
    NETWORK: ["RAHU", "MERCURY", "JUPITER"]
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
  if (modeFlags.isNameOnly || modeFlags.isNameContext) return { kp_weight: 0, kp_reasons: [] };

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

  return {
    kp_weight: round2(Math.min(weight, 3.2)),
    kp_reasons: reasons
  };
}

function buildDashaWeight(domainKey, evidence, modeFlags) {
  if (modeFlags.isNameOnly || modeFlags.isNameContext) return { dasha_weight: 0, dasha_reasons: [] };

  const dasha = evidence.dasha || {};
  const domainLords = domainPlanetLords(domainKey);
  const lords = [lordOf(dasha.mahadasha), lordOf(dasha.antardasha), lordOf(dasha.pratyantar)].filter(Boolean);

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

function calculateDomainBase(domainKey, targetHouses, evidence, hints, modeFlags, nameHints) {
  const houseHits = [];
  const aspectHits = [];
  let rawScore = 0;

  if (!modeFlags.isNameOnly && !modeFlags.isNameContext) {
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
        aspectHits.push({ planet1: p1, planet2: p2, type: asp.type, orb_gap: asp.orb_gap });
        rawScore += 0.45;
      }
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

  if (modeFlags.isNameOnly || modeFlags.isNameContext) rawScore += nameOnlyBoost(domainKey, nameHints);
  if (modeFlags.isReducedDob) rawScore += 0.85;
  if (modeFlags.isFullBirth) rawScore += 1.2;

  const kp = buildKpWeight(domainKey, targetHouses, evidence, modeFlags);
  const dasha = buildDashaWeight(domainKey, evidence, modeFlags);

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

function patternEventType(domainKey) {
  const map = {
    FOREIGN: "likely foreign / distance movement window",
    IMMIGRATION: "likely immigration / relocation window",
    VISA: "likely visa / permission window",
    SETTLEMENT: "likely settlement / base formation window",
    EDUCATION: "likely study / qualification window",
    JOB: "likely job / service window",
    CAREER: "likely career direction window",
    BUSINESS: "likely business / trade window",
    MONEY: "likely money / liquidity window",
    PROPERTY: "likely property / asset window",
    VEHICLE: "likely vehicle / transport asset window",
    MARRIAGE: "likely marriage / partnership window",
    DIVORCE: "possible separation-pressure window",
    LOVE: "likely attachment / romance window",
    PARTNERSHIP: "likely partnership / contract window",
    CHILDREN: "likely children / continuity window",
    HEALTH: "possible health pressure window",
    MENTAL: "possible mental pressure window",
    LEGAL: "possible legal / authority window",
    DOCUMENT: "likely document / paperwork window",
    SPIRITUAL: "likely spiritual turning window",
    SUCCESS: "likely rise / execution window",
    BLOCKAGE: "possible delay / obstruction window",
    DEBT: "possible liability / pressure window",
    NETWORK: "likely network / support window",
    FAMILY: "likely family responsibility window",
    HOME: "likely home / base window",
    RELIGION: "likely dharma / belief window"
  };
  return map[domainKey] || `likely ${domainKey.toLowerCase()} window`;
}

function buildPatternEvent(domainKey, score, modeFlags, birth_context) {
  const aw = ageWindow(domainKey);
  const yw = yearWindowFromAge(birth_context?.birth_datetime_iso, domainKey);

  return makeEvent({
    event_family: "NAME_PATTERN_LEDGER",
    event_type: patternEventType(domainKey),
    exact_year: null,
    month_or_phase: yw ? `likely year window ${yw[0]}-${yw[1]}` : `likely age window ${aw[0]}-${aw[1]}`,
    evidence_strength: strengthLabel(score),
    status: "PATTERN_ONLY",
    importance: score >= 6.5 ? "MAJOR" : "MINOR",
    trigger_phase: "strong name-pattern timing window",
    carryover_to_present: "NO",
    who_involved: "self / domain-linked people",
    impact_summary: "strong probability window visible; execution is not confirmed",
    evidence_type: "NAME_PATTERN",
    likely_age_window: aw,
    likely_year_window: yw,
    timing_mode: yw ? "LIKELY_YEAR_WINDOW" : "LIKELY_AGE_WINDOW"
  });
}

function buildFactOrAstroEvents(domainKey, hints, score, modeFlags, birth_context) {
  const years = hints.years;
  const direct = years[0] ?? null;

  const directDomains = {
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
    NETWORK: ["NETWORK_LEDGER", "network / support phase", hints.networkMention, "friends / network"],
    SPIRITUAL: ["SPIRITUAL_LEDGER", "spiritual / inward turning phase", hints.spiritualMention, "self / belief"]
  };

  if (["FOREIGN", "IMMIGRATION", "VISA", "SETTLEMENT"].includes(domainKey)) {
    const isDirect = hints.foreignExecuted || hints.abroadNow || hints.foreign_entry_year_claim || hints.settlement_year_claim;
    if (isDirect) {
      return [makeEvent({
        event_family: "FOREIGN_LEDGER",
        event_type: domainKey === "SETTLEMENT" ? "settlement / base process" : "foreign / immigration process",
        exact_year: hints.foreign_entry_year_claim || hints.settlement_year_claim || direct,
        month_or_phase: "year-anchored phase",
        evidence_strength: "strong",
        status: "EXECUTED",
        importance: "MAJOR",
        trigger_phase: "fact-supported foreign/base axis",
        carryover_to_present: "YES",
        who_involved: "self / authority",
        impact_summary: "domain has fact support",
        evidence_type: "DIRECT"
      })];
    }
    if (score >= 5) return [buildPatternEvent(domainKey, score, modeFlags, birth_context)];
    return [];
  }

  if (["MARRIAGE", "DIVORCE", "LOVE", "PARTNERSHIP", "CHILDREN"].includes(domainKey)) {
    const directRel = hints.marriageMention || hints.marriageDoneByRole || hints.divorceMention || hints.relationshipMention || hints.childrenMention;
    if (directRel) {
      return [makeEvent({
        event_family: "RELATIONSHIP_LEDGER",
        event_type: domainKey === "DIVORCE" ? "divorce / separation event" : `${domainKey.toLowerCase()} phase`,
        exact_year: direct,
        month_or_phase: direct ? "year-anchored phase" : "fact-supported phase",
        evidence_strength: "strong",
        status: "EXECUTED",
        importance: "MAJOR",
        trigger_phase: "relationship axis active",
        carryover_to_present: "YES",
        who_involved: "self / partner / family",
        impact_summary: "relationship domain has fact support",
        evidence_type: "DIRECT"
      })];
    }
    if (score >= 4.5) return [buildPatternEvent(domainKey, score, modeFlags, birth_context)];
    return [];
  }

  const cfg = directDomains[domainKey];
  if (cfg) {
    const [family, type, isDirect, who] = cfg;
    if (isDirect) {
      return [makeEvent({
        event_family: family,
        event_type: type,
        exact_year: direct,
        month_or_phase: direct ? "year-anchored phase" : "fact-supported phase",
        evidence_strength: "strong",
        status: "EXECUTED",
        importance: "MAJOR",
        trigger_phase: "domain active by fact",
        carryover_to_present: "YES",
        who_involved: who,
        impact_summary: "domain has fact support",
        evidence_type: "DIRECT"
      })];
    }
  }

  if (score >= 5) return [buildPatternEvent(domainKey, score, modeFlags, birth_context)];
  return [];
}

function applyModePolicy(domain_results, modeFlags, birth_context) {
  return domain_results.map((d) => {
    const isPatternMode = modeFlags.isNameOnly || modeFlags.isNameContext;
    const events = (d.events || []).map((e) => {
      if (isPatternMode) {
        return {
          ...e,
          status: "PATTERN_ONLY",
          evidence_type: "NAME_PATTERN",
          exact_year: null,
          exact_claim_locked: true,
          execution_claim_allowed: false,
          likely_age_window: e.likely_age_window || ageWindow(d.domain_key),
          likely_year_window: null,
          timing_mode: "LIKELY_AGE_WINDOW"
        };
      }

      if (modeFlags.isReducedDob && e.evidence_type === "NAME_PATTERN") {
        return {
          ...e,
          likely_year_window: e.likely_year_window || yearWindowFromAge(birth_context?.birth_datetime_iso, d.domain_key),
          timing_mode: "LIKELY_YEAR_WINDOW"
        };
      }

      return e;
    });

    const patternEvidenceCount = events.filter((e) =>
      ["NAME_PATTERN", "LIKELY_HISTORY", "PATTERN_ONLY"].includes(e.evidence_type)
    ).length;

    const directEvidenceCount = events.filter((e) =>
      ["DIRECT", "DIRECT_FACT", "FACT_ANCHORED"].includes(e.evidence_type)
    ).length;

    return {
      ...d,
      events,
      pattern_mode_active: isPatternMode,
      direct_evidence_count: directEvidenceCount,
      pattern_evidence_count: patternEvidenceCount,
      exact_timeline_allowed: modeFlags.isFullBirth || modeFlags.isReducedDob,
      name_pattern_timing_allowed: modeFlags.name_pattern_timing_allowed,
      execution_claim_allowed: modeFlags.execution_claim_allowed,
      oracle_mode: modeFlags.oracle_mode
    };
  });
}

export function runAstroLayer({ evidence_packet, facts, subject_context, birth_context }) {
  const evidence = normalizeEvidence(evidence_packet);
  const hints = buildHints(facts);
  const modeFlags = getModeFlags(subject_context, birth_context);
  const nameHints = buildNameOnlyHints(subject_context);

  let domain_results = DOMAIN_REGISTRY.map(([domainKey, domainLabel, targetHouses]) => {
    const base = calculateDomainBase(domainKey, targetHouses, evidence, hints, modeFlags, nameHints);
    const events = buildFactOrAstroEvents(domainKey, hints, base.normalizedScore, modeFlags, birth_context);

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
      active_event_count: events.filter((e) => ["ACTIVE", "STABILISING", "EXECUTED", "BUILDING"].includes(e.status)).length,
      events
    };
  });

  domain_results = applyModePolicy(domain_results, modeFlags, birth_context);

  return {
    evidence_normalized: evidence.meta,
    evidence_runtime: evidence,
    mode_flags: modeFlags,
    name_hints: nameHints,
    oracle_mode: modeFlags.oracle_mode,
    domain_results
  };
}

export function buildTimeline({ ranked_domains, birth_context, subject_context }) {
  const birthYear = safeBirthYear(birth_context?.birth_datetime_iso);
  const modeFlags = getModeFlags(subject_context, birth_context);
  const out = [];

  ranked_domains.forEach((d) => {
    (d.events || []).forEach((e) => {
      let date_marker = normalizeYear(e.exact_year);

      if (modeFlags.isNameOnly || modeFlags.isNameContext) {
        date_marker = null;
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
        likely_age_window: e.likely_age_window || ageWindow(d.domain_key),
        likely_year_window: modeFlags.isReducedDob || modeFlags.isFullBirth ? e.likely_year_window || yearWindowFromAge(birth_context?.birth_datetime_iso, d.domain_key) : null,
        timing_mode: e.timing_mode || "PATTERN_WINDOW",
        who_involved: e.who_involved || null,
        impact_summary: e.impact_summary || null,
        carryover_to_present: e.carryover_to_present
      });
    });
  });

  return out
    .filter((x) => x.importance === "MAJOR" || Number(x.likely_age_window?.[0] || 0) > 0)
    .sort((a, b) => {
      const aa = a.date_marker ?? a.likely_age_window?.[0] ?? 99999;
      const bb = b.date_marker ?? b.likely_age_window?.[0] ?? 99999;
      if (aa !== bb) return aa - bb;
      return Number(a.event_number || 0) - Number(b.event_number || 0);
    });
}