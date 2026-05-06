// lib/layer-astro.js
// FULL REPLACEMENT — UNIVERSAL PAST NANO CORE V8.4
// Fixes:
// - no flat normalized_score saturation
// - no every-domain = 10
// - weighted forensic score + confidence score separated
// - full domain scan preserved
// - NAME_ONLY = elite probability only, no executed
// - FULL_BIRTH = hierarchy + year windows + probability, no blind execution

const round2 = (n) =>
  Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;

const SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
];

const BENEFICS = ["JUPITER", "VENUS", "MOON", "MERCURY"];
const MALEFICS = ["SATURN", "MARS", "RAHU", "KETU", "SUN"];

const NAME_ONLY_EVENT_THRESHOLD = 2.2;
const NAME_ONLY_MAJOR_THRESHOLD = 3.2;
const FULL_BIRTH_EVENT_THRESHOLD = 6.15;
const FULL_BIRTH_MAJOR_THRESHOLD = 7.55;
const REDUCED_DOB_EVENT_THRESHOLD = 5.25;
const STANDARD_PATTERN_THRESHOLD = 5.35;

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
  MULTIPLE_MARRIAGE: [28, 44],
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
  RELIGION: [28, 50],
  COMMUNICATION: [16, 36],
  GAIN: [24, 44],
  LOSS: [24, 44],
  MIND: [16, 40],
  IDENTITY: [18, 35],
  ENEMY: [24, 44],
  FAILURE: [22, 42]
};

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

function signToIndex(sign) {
  return SIGNS.indexOf(sign);
}

function safeBirthYear(birthIso) {
  if (!birthIso) return null;
  const d = new Date(birthIso);
  return Number.isNaN(d.getTime()) ? null : d.getUTCFullYear();
}

function normalizeYear(v) {
  const n = Number(v);
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

function normalizeEvidence(packet) {
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

  const housesByPlanet =
    packet?.natal?.houses_by_planet && Object.keys(packet.natal.houses_by_planet).length
      ? { ...packet.natal.houses_by_planet }
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
    MULTIPLE_MARRIAGE: ["RAHU", "VENUS", "MARS", "SATURN"],
    LOVE: ["VENUS", "MOON", "RAHU"],
    PARTNERSHIP: ["VENUS", "MERCURY", "JUPITER"],
    HEALTH: ["SATURN", "MARS", "KETU"],
    MENTAL: ["MOON", "RAHU", "SATURN"],
    SPIRITUAL: ["KETU", "JUPITER", "SUN"],
    RELIGION: ["JUPITER", "SUN", "KETU"],
    FAMILY: ["MOON", "VENUS", "JUPITER"],
    SUCCESS: ["SUN", "JUPITER", "RAHU"],
    NETWORK: ["RAHU", "MERCURY", "JUPITER"],
    FAILURE: ["SATURN", "KETU", "RAHU"],
    BLOCKAGE: ["SATURN", "RAHU", "KETU"],
    ENEMY: ["MARS", "SATURN", "RAHU"],
    IDENTITY: ["SUN", "MARS", "JUPITER"],
    MIND: ["MOON", "MERCURY", "RAHU"],
    COMMUNICATION: ["MERCURY", "MARS", "RAHU"],
    GAIN: ["JUPITER", "RAHU", "MERCURY"],
    LOSS: ["SATURN", "KETU", "RAHU"],
    HOME: ["MOON", "VENUS", "MARS"],
    CHILDREN: ["JUPITER", "SUN", "VENUS"]
  };

  return map[domainKey] || [];
}

function readKpCusps(kp) {
  if (!kp || typeof kp !== "object") return {};
  if (kp.cusps && typeof kp.cusps === "object") return kp.cusps;
  if (kp.kp_cusps && typeof kp.kp_cusps === "object") return kp.kp_cusps;

  const numericKeys = Object.keys(kp).filter((k) => /^\d+$/.test(k));
  if (numericKeys.length) return kp;

  return {};
}

function lordOf(v) {
  return String(v || "").trim().toUpperCase();
}

function buildKpWeight(domainKey, targetHouses, evidence, modeFlags) {
  if (modeFlags.isNameOnly || modeFlags.isNameContext) {
    return { kp_weight: 0, kp_reasons: [], kp_raw_hits: 0 };
  }

  const cusps = readKpCusps(evidence.kp || {});
  const required = new Set(targetHouses.map(String));
  const domainLords = domainPlanetLords(domainKey);
  const reasons = [];
  let raw = 0;
  let hitCount = 0;

  for (const [cuspNo, cusp] of Object.entries(cusps)) {
    if (!required.has(String(cuspNo))) continue;

    const sub = lordOf(cusp?.sub_lord);
    const star = lordOf(cusp?.star_lord);
    const signLord = lordOf(cusp?.sign_lord);

    if (sub && domainLords.includes(sub)) {
      raw += 1.55;
      hitCount += 1;
      reasons.push(`KP cusp ${cuspNo} sub-lord ${sub}`);
    }

    if (star && domainLords.includes(star)) {
      raw += 0.85;
      hitCount += 1;
      reasons.push(`KP cusp ${cuspNo} star-lord ${star}`);
    }

    if (signLord && domainLords.includes(signLord)) {
      raw += 0.35;
      hitCount += 1;
      reasons.push(`KP cusp ${cuspNo} sign-lord ${signLord}`);
    }
  }

  // decay prevents KP from pushing every domain to 10
  const decayed = raw <= 2.2 ? raw : 2.2 + Math.sqrt(raw - 2.2) * 0.95;

  return {
    kp_weight: round2(Math.min(decayed, 3.85)),
    kp_reasons: reasons,
    kp_raw_hits: hitCount
  };
}

function buildDashaWeight(domainKey, evidence, modeFlags) {
  if (modeFlags.isNameOnly || modeFlags.isNameContext) {
    return { dasha_weight: 0, dasha_reasons: [] };
  }

  const dasha = evidence.dasha || {};
  const domainLords = domainPlanetLords(domainKey);

  const lords = [
    lordOf(dasha.mahadasha || dasha.maha_lord || dasha.md),
    lordOf(dasha.antardasha || dasha.antar_lord || dasha.ad),
    lordOf(dasha.pratyantar || dasha.pratyantar_lord || dasha.pd)
  ].filter(Boolean);

  let weight = 0;
  const reasons = [];

  lords.forEach((lord, idx) => {
    if (!domainLords.includes(lord)) return;

    const add = idx === 0 ? 1.55 : idx === 1 ? 0.95 : 0.45;
    weight += add;
    reasons.push(`Dasha ${lord}`);
  });

  return {
    dasha_weight: round2(Math.min(weight, 2.95)),
    dasha_reasons: reasons
  };
}

function factBoost(domainKey, hints) {
  let boost = 0;

  if (domainKey === "EDUCATION" && hints.isStudent) boost += 3.0;
  if (domainKey === "JOB" && hints.hasJob) boost += 3.0;
  if (domainKey === "BUSINESS" && hints.hasBusiness) boost += 3.0;
  if (domainKey === "CAREER" && (hints.hasJob || hints.hasBusiness)) boost += 2.4;

  if (domainKey === "MARRIAGE" && (hints.marriageMention || hints.marriage_count_claim != null || hints.marriageDoneByRole)) boost += 3.4;
  if (domainKey === "DIVORCE" && (hints.divorceMention || hints.broken_marriage_claim != null)) boost += 3.0;
  if (domainKey === "MULTIPLE_MARRIAGE" && ((hints.marriage_count_claim ?? 0) >= 2 || hints.remarriageMention)) boost += 2.8;
  if (domainKey === "LOVE" && hints.relationshipMention) boost += 2.0;
  if (domainKey === "PARTNERSHIP" && hints.relationshipMention) boost += 1.8;

  if (domainKey === "FOREIGN" && (hints.foreignIntent || hints.foreign_entry_year_claim != null || hints.foreignExecuted || hints.abroadNow)) boost += 3.2;
  if (domainKey === "SETTLEMENT" && (hints.settlement_year_claim != null || hints.settlementMention || hints.abroadNow)) boost += 3.0;
  if (domainKey === "IMMIGRATION" && (hints.foreignIntent || hints.foreignExecuted || hints.abroadNow)) boost += 2.6;
  if (domainKey === "VISA" && hints.foreignIntent) boost += 1.8;
  if (domainKey === "DOCUMENT" && hints.documentMention) boost += 1.7;

  if (domainKey === "HEALTH" && hints.healthMention) boost += 2.5;
  if (domainKey === "MENTAL" && hints.mentalMention) boost += 2.4;
  if (domainKey === "FAMILY" && hints.familyMention) boost += 2.0;
  if (domainKey === "MONEY" && hints.moneyMention) boost += 2.2;
  if (domainKey === "DEBT" && hints.moneyMention) boost += 1.5;
  if (domainKey === "PROPERTY" && hints.propertyMention) boost += 2.1;
  if (domainKey === "VEHICLE" && hints.propertyMention) boost += 1.3;
  if (domainKey === "LEGAL" && hints.legalMention) boost += 2.0;
  if (domainKey === "ENEMY" && hints.enemyMention) boost += 1.8;
  if (domainKey === "NETWORK" && hints.networkMention) boost += 1.6;
  if (domainKey === "CHILDREN" && hints.childrenMention) boost += 1.9;
  if (domainKey === "SPIRITUAL" && hints.spiritualMention) boost += 1.8;
  if (domainKey === "HOME" && hints.propertyMention) boost += 1.4;

  return boost;
}

function aspectPower(asp, domainKey, evidence) {
  const p1 = String(asp.planet1 || "").toUpperCase();
  const p2 = String(asp.planet2 || "").toUpperCase();
  const type = String(asp.type || "").toLowerCase();
  const domainLords = domainPlanetLords(domainKey);
  const lordHit = domainLords.includes(p1) || domainLords.includes(p2);

  let w = lordHit ? 0.55 : 0.22;

  if (["conjunction", "opposition", "square"].includes(type)) w += 0.18;
  if (["trine", "sextile"].includes(type)) w += 0.12;

  const h1 = Number(evidence.housesByPlanet[p1]);
  const h2 = Number(evidence.housesByPlanet[p2]);

  return {
    weight: w,
    payload: {
      planet1: p1,
      planet2: p2,
      type: asp.type,
      orb_gap: asp.orb_gap,
      domain_lord_hit: lordHit,
      houses: [h1 || null, h2 || null]
    }
  };
}

function housePower(planetName, domainKey) {
  let weight = 0.95;

  if (BENEFICS.includes(planetName)) weight += 0.4;
  if (MALEFICS.includes(planetName)) weight += 0.5;
  if (domainPlanetLords(domainKey).includes(planetName)) weight += 0.75;

  return weight;
}

function rawToNormalizedScore(raw, modeFlags) {
  if (modeFlags.isNameOnly || modeFlags.isNameContext) {
    return round2(Math.min(4.8, raw));
  }

  // nonlinear compression: prevents saturation
  // raw 6 => ~5.8, raw 10 => ~7.5, raw 15 => ~8.8, raw 22 => ~9.6
  const normalized = 10 * (1 - Math.exp(-Math.max(0, raw) / 8.4));

  return round2(Math.min(9.85, normalized));
}

function confidenceFromSupport({ score, supportCount, kpWeight, dashaWeight, houseHits, aspectHits, fact }) {
  let c = score * 6.8;

  c += Math.min(supportCount, 8) * 2.5;
  c += kpWeight * 4.2;
  c += dashaWeight * 4.8;
  c += Math.min(houseHits, 5) * 1.6;
  c += Math.min(aspectHits, 6) * 0.8;
  if (fact > 0) c += 12;

  return Math.max(0, Math.min(96, Math.round(c)));
}

function calculateDomainBase(domainKey, targetHouses, evidence, hints, modeFlags, nameHints) {
  const houseHits = [];
  const aspectHits = [];
  let rawScore = 0;

  const domainLords = domainPlanetLords(domainKey);

  if (!modeFlags.isNameOnly && !modeFlags.isNameContext) {
    for (const [planetNameRaw, houseNumRaw] of Object.entries(evidence.housesByPlanet || {})) {
      const planetName = String(planetNameRaw || "").toUpperCase();
      const houseNum = Number(houseNumRaw);

      if (targetHouses.includes(houseNum)) {
        houseHits.push({ planet: planetName, house: houseNum });
        rawScore += housePower(planetName, domainKey);
      }
    }

    for (const asp of evidence.aspects || []) {
      const p1 = String(asp.planet1 || "").toUpperCase();
      const p2 = String(asp.planet2 || "").toUpperCase();
      const h1 = Number(evidence.housesByPlanet[p1]);
      const h2 = Number(evidence.housesByPlanet[p2]);

      if (targetHouses.includes(h1) || targetHouses.includes(h2)) {
        const ap = aspectPower(asp, domainKey, evidence);
        aspectHits.push(ap.payload);
        rawScore += ap.weight;
      }
    }

    // domain lord placement bonus only once; avoids explosion
    const lordPlaced = Object.entries(evidence.housesByPlanet || {}).some(([planet, house]) =>
      domainLords.includes(String(planet).toUpperCase()) && targetHouses.includes(Number(house))
    );

    if (lordPlaced) rawScore += 0.85;
  }

  const fact = factBoost(domainKey, hints);
  rawScore += fact;

  if (modeFlags.isNameOnly || modeFlags.isNameContext) {
    rawScore += nameOnlyBoost(domainKey, nameHints);
  }

  if (modeFlags.isReducedDob) rawScore += 0.45;
  if (modeFlags.isFullBirth) rawScore += 0.55;

  const kp = buildKpWeight(domainKey, targetHouses, evidence, modeFlags);
  const dasha = buildDashaWeight(domainKey, evidence, modeFlags);

  rawScore += kp.kp_weight + dasha.dasha_weight;

  const supportCount =
    houseHits.length +
    aspectHits.length +
    (kp.kp_weight > 0 ? 1 : 0) +
    (dasha.dasha_weight > 0 ? 1 : 0) +
    (fact > 0 ? 1 : 0);

  // penalty for broad domains with only mechanical hits but no event/fact/dasha
  if (modeFlags.isFullBirth) {
    if (supportCount === 0) rawScore -= 2.4;
    else if (supportCount === 1) rawScore -= 1.2;

    if (fact === 0 && dasha.dasha_weight === 0 && kp.kp_weight < 1.1 && houseHits.length < 2) {
      rawScore -= 1.0;
    }

    if (aspectHits.length >= 5 && houseHits.length <= 1 && kp.kp_weight === 0) {
      rawScore -= 0.9;
    }
  }

  if (modeFlags.isReducedDob && supportCount === 0) rawScore -= 1.2;

  const normalizedScore = rawToNormalizedScore(rawScore, modeFlags);

  const confidence_score = confidenceFromSupport({
    score: normalizedScore,
    supportCount,
    kpWeight: kp.kp_weight,
    dashaWeight: dasha.dasha_weight,
    houseHits: houseHits.length,
    aspectHits: aspectHits.length,
    fact
  });

  return {
    rawScore: round2(rawScore),
    normalizedScore,
    confidence_score,
    supportCount,
    houseHits,
    aspectHits,
    kp_weight: kp.kp_weight,
    kp_reasons: kp.kp_reasons,
    kp_raw_hits: kp.kp_raw_hits,
    dasha_weight: dasha.dasha_weight,
    dasha_reasons: dasha.dasha_reasons,
    fact_weight: round2(fact),
    density: normalizedScore >= 8.4 ? "HIGH" : normalizedScore >= 6.3 ? "MED" : "LOW",
    residualImpact: confidence_score >= 82 ? "HIGH" : confidence_score >= 62 ? "MED" : "LOW"
  };
}

function strengthLabel(score, modeFlags) {
  if (modeFlags.isNameOnly || modeFlags.isNameContext) {
    if (score >= 3.2) return "strong_name_pattern";
    if (score >= 2.2) return "light_but_usable";
    return "weak";
  }

  if (score >= 8.4) return "strong";
  if (score >= 6.3) return "moderate";
  if (score >= 5.1) return "light_but_usable";
  return "weak";
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
    MULTIPLE_MARRIAGE: "possible repeated union pattern window",
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
    RELIGION: "likely dharma / belief window",
    COMMUNICATION: "likely communication / effort window",
    GAIN: "likely gain / fulfilment window",
    LOSS: "possible loss / isolation window",
    MIND: "likely mind / emotional response window",
    IDENTITY: "likely identity / direction window",
    ENEMY: "possible opposition window",
    FAILURE: "possible failure / collapse pressure window"
  };

  return map[domainKey] || `likely ${domainKey.toLowerCase()} window`;
}

function eventThreshold(modeFlags) {
  if (modeFlags.isNameOnly || modeFlags.isNameContext) return NAME_ONLY_EVENT_THRESHOLD;
  if (modeFlags.isFullBirth) return FULL_BIRTH_EVENT_THRESHOLD;
  if (modeFlags.isReducedDob) return REDUCED_DOB_EVENT_THRESHOLD;
  return STANDARD_PATTERN_THRESHOLD;
}

function majorThreshold(modeFlags) {
  if (modeFlags.isNameOnly || modeFlags.isNameContext) return NAME_ONLY_MAJOR_THRESHOLD;
  if (modeFlags.isFullBirth) return FULL_BIRTH_MAJOR_THRESHOLD;
  if (modeFlags.isReducedDob) return 7.0;
  return 7.0;
}

function buildPatternEvent(domainKey, score, confidenceScore, modeFlags, birth_context) {
  const aw = ageWindow(domainKey);
  const yw =
    modeFlags.isReducedDob || modeFlags.isFullBirth
      ? yearWindowFromAge(birth_context?.birth_datetime_iso, domainKey)
      : null;

  const isName = modeFlags.isNameOnly || modeFlags.isNameContext;
  const veryHigh = modeFlags.isFullBirth && confidenceScore >= 86 && score >= 8.4;
  const high = modeFlags.isFullBirth && confidenceScore >= 72 && score >= 6.6;

  return makeEvent({
    event_family: isName ? "NAME_PATTERN_LEDGER" : "ASTRO_PATTERN_LEDGER",
    event_type: patternEventType(domainKey),
    exact_year: null,
    month_or_phase: yw ? `likely year window ${yw[0]}-${yw[1]}` : `likely age window ${aw[0]}-${aw[1]}`,
    evidence_strength: strengthLabel(score, modeFlags),
    status: isName
      ? "LIKELY_WINDOW"
      : veryHigh
        ? "VERY_HIGH_PROBABILITY"
        : high
          ? "HIGH_PROBABILITY"
          : "LIKELY_WINDOW",
    importance: score >= majorThreshold(modeFlags) ? "MAJOR" : "MINOR",
    trigger_phase: isName ? "elite name-pattern locked window" : "weighted astro forensic probability window",
    carryover_to_present: "NO",
    who_involved: "self / domain-linked people",
    impact_summary: isName
      ? "elite probability window visible, but execution is not confirmed"
      : "weighted astro probability visible; execution requires direct/fact anchor",
    evidence_type: isName ? "NAME_PATTERN" : "LIKELY_HISTORY",
    likely_age_window: aw,
    likely_year_window: yw,
    timing_mode: yw ? "LIKELY_YEAR_WINDOW" : "LIKELY_AGE_WINDOW"
  });
}

function buildFactOrAstroEvents(domainKey, hints, score