// lib/layer-astro.js
// FULL REPLACEMENT — SAFE STABLE UNIVERSAL PAST NANO CORE V8.5
// Fix: normalizeEvidence exported, no missing function, no saturation scoring

const round2 = (n) => Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;

const SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
];

const BENEFICS = ["JUPITER", "VENUS", "MOON", "MERCURY"];
const MALEFICS = ["SATURN", "MARS", "RAHU", "KETU", "SUN"];

const DOMAIN_WINDOWS = {
  FOREIGN:[20,29], IMMIGRATION:[20,31], VISA:[19,30], SETTLEMENT:[28,40],
  EDUCATION:[16,26], JOB:[21,32], CAREER:[23,36], BUSINESS:[25,42],
  MONEY:[22,44], PROPERTY:[28,48], VEHICLE:[22,40],
  MARRIAGE:[24,34], DIVORCE:[28,42], MULTIPLE_MARRIAGE:[28,44],
  LOVE:[20,32], PARTNERSHIP:[24,40], CHILDREN:[27,40],
  HEALTH:[24,46], MENTAL:[18,42], LEGAL:[26,44], DOCUMENT:[20,42],
  SPIRITUAL:[28,50], SUCCESS:[28,46], BLOCKAGE:[22,42], DEBT:[24,44],
  NETWORK:[20,40], FAMILY:[18,38], HOME:[24,44], RELIGION:[28,50],
  COMMUNICATION:[16,36], GAIN:[24,44], LOSS:[24,44], MIND:[16,40],
  IDENTITY:[18,35], ENEMY:[24,44], FAILURE:[22,42]
};

export const DOMAIN_REGISTRY = [
  ["IDENTITY","Identity / Self / Direction",[1]],
  ["MIND","Mind / Emotion / Response",[4,5]],
  ["COMMUNICATION","Communication / Effort / Siblings",[3]],
  ["FAMILY","Family / Wealth / Speech",[2]],
  ["HOME","Home / Mother / Base",[4]],
  ["LOVE","Love / Romance / Attachment",[5,7]],
  ["CHILDREN","Children / Creativity / Continuity",[5]],
  ["HEALTH","Health / Disease / Stress",[6,8,12]],
  ["MARRIAGE","Marriage / Partnership",[7,2,8]],
  ["DIVORCE","Separation / Divorce / Break",[7,8,6]],
  ["MULTIPLE_MARRIAGE","Repeated Union Patterns",[7,8,2]],
  ["FOREIGN","Foreign / Distance / Withdrawal",[9,12,4]],
  ["SETTLEMENT","Settlement / Base Formation",[4,12,10]],
  ["IMMIGRATION","Immigration / Relocation Path",[9,12,4,10]],
  ["VISA","Visa / Permission / External Clearance",[9,12,10]],
  ["DOCUMENT","Documents / Records / Paperwork",[3,6,10]],
  ["CAREER","Career / Authority / Public Role",[10,6]],
  ["JOB","Job / Service / Employment",[6,10]],
  ["BUSINESS","Business / Trade / Deal",[7,10,11]],
  ["MONEY","Money / Income / Liquidity",[2,11,6]],
  ["DEBT","Debt / Liability / Pressure",[6,8]],
  ["PROPERTY","Property / Residence / Land",[4,11,2]],
  ["VEHICLE","Vehicle / Transport Asset",[4,3]],
  ["EDUCATION","Study / Learning / University",[4,5,9]],
  ["LEGAL","Legal / Penalty / Authority",[6,7,10]],
  ["ENEMY","Opponent / Conflict / Resistance",[6]],
  ["GAIN","Gain / Network / Fulfilment",[11]],
  ["LOSS","Loss / Isolation / Exit",[12]],
  ["PARTNERSHIP","Partnership / Contract",[7,11]],
  ["SPIRITUAL","Spiritual Turning / Withdrawal",[9,12,8]],
  ["MENTAL","Mental Pressure / Fear / Overdrive",[1,4,8]],
  ["NETWORK","Network / Circle / Support",[11,3]],
  ["SUCCESS","Success / Rise / Execution",[10,11,5]],
  ["FAILURE","Failure / Collapse / Miss",[8,6,12]],
  ["RELIGION","Religion / Dharma / Belief",[9]],
  ["BLOCKAGE","Block / Delay / Obstruction",[6,8,10,12]]
];

function signToIndex(sign) {
  return SIGNS.indexOf(sign);
}

function normalizeYear(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function safeBirthYear(birthIso) {
  if (!birthIso) return null;
  const d = new Date(birthIso);
  return Number.isNaN(d.getTime()) ? null : d.getUTCFullYear();
}

function ageWindow(domainKey) {
  return DOMAIN_WINDOWS[domainKey] || [22,40];
}

function yearWindowFromAge(birthIso, domainKey) {
  const y = safeBirthYear(birthIso);
  if (!y) return null;
  const [a,b] = ageWindow(domainKey);
  return [y + a, y + b];
}

function hasAny(text, list) {
  const t = String(text || "").toLowerCase();
  return list.some((x) => t.includes(String(x).toLowerCase()));
}

function uniqueYears(text) {
  return [...new Set([...String(text || "").matchAll(/\b(19|20)\d{2}\b/g)].map((m) => Number(m[0])))];
}

export function normalizeEvidence(packet = {}) {
  const natalPlanets = packet?.natal?.planets || [];
  const transitPlanets = packet?.transit_now?.planets || [];
  const aspects = packet?.natal?.aspects || packet?.transit_now?.aspects || [];
  const asc = packet?.natal?.ascendant || packet?.transit_now?.ascendant || null;

  const housesByPlanet =
    packet?.natal?.houses_by_planet && Object.keys(packet.natal.houses_by_planet).length
      ? { ...packet.natal.houses_by_planet }
      : {};

  if (!Object.keys(housesByPlanet).length && asc) {
    const ascIndex = signToIndex(asc.sign);
    natalPlanets.forEach((p) => {
      const pIndex = signToIndex(p.sign);
      if (ascIndex >= 0 && pIndex >= 0) {
        housesByPlanet[String(p.planet || "").toUpperCase()] = ((pIndex - ascIndex + 12) % 12) + 1;
      }
    });
  }

  return {
    natalMap: Object.fromEntries(natalPlanets.map((p) => [String(p.planet || "").toUpperCase(), p])),
    transitMap: Object.fromEntries(transitPlanets.map((p) => [String(p.planet || "").toUpperCase(), p])),
    aspects,
    ascendant: asc,
    housesByPlanet,
    dasha: packet?.dasha || {},
    kp: packet?.kp || packet?.kp_cusps || {},
    divisional: packet?.divisional || {},
    meta: {
      natal_planet_count: natalPlanets.length,
      transit_planet_count: transitPlanets.length,
      aspect_count: aspects.length,
      ascendant_present: !!asc,
      house_mapping_present: Object.keys(housesByPlanet).length > 0,
      kp_present: !!(packet?.kp || packet?.kp_cusps),
      dasha_present: !!packet?.dasha
    }
  };
}

function getModeFlags(subject_context = {}, birth_context = {}) {
  const identityDepth = String(subject_context.identity_depth || "");
  const subjectMode = String(subject_context.subject_mode || "");
  const precisionMode = String(birth_context.precision_mode || "");

  const isNameOnly =
    subject_context.is_name_only_mode === true ||
    identityDepth === "LEVEL_2_NAME_ONLY" ||
    subjectMode === "NAME_ONLY_PAST" ||
    precisionMode === "NAME_ONLY";

  const isNameContext =
    subject_context.is_name_context_mode === true ||
    identityDepth === "LEVEL_3_NAME_CONTEXT" ||
    subjectMode === "NAME_CONTEXT_PAST" ||
    precisionMode === "NAME_CONTEXT";

  const isReducedDob =
    identityDepth === "LEVEL_4_NAME_DOB" ||
    identityDepth === "LEVEL_3_DOB_ONLY" ||
    precisionMode === "DOB_ONLY_REDUCED" ||
    precisionMode === "DOB_POB_REDUCED";

  const isFullBirth =
    subject_context.is_full_birth_locked === true ||
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

function buildHints(facts = {}) {
  const raw = String(facts.raw_text || "");
  const years = uniqueYears(raw);
  const abroadNow = hasAny(raw, ["in uk","living in uk","london","england","abroad now","already abroad"]);

  return {
    raw_text: raw,
    years,
    isStudent: hasAny(raw, ["student","study","university","college","exam"]),
    hasJob: hasAny(raw, ["job","work","employment","salary"]),
    hasBusiness: hasAny(raw, ["business","trade","shop","company","client"]),
    foreignIntent: hasAny(raw, ["foreign","abroad","uk","visa","immigration","bidesh"]),
    foreignExecuted: abroadNow || hasAny(raw, ["came uk","came to uk","arrived uk","entered uk","moved abroad"]),
    abroadNow,
    settlementMention: abroadNow || hasAny(raw, ["settlement","settled","ilr","residence"]),
    legalMention: hasAny(raw, ["legal","court","case","appeal","tribunal"]),
    documentMention: hasAny(raw, ["document","paper","paperwork","approval","form"]),
    marriageMention: hasAny(raw, ["marriage","married","wife","husband","spouse","biye","nikah"]),
    divorceMention: hasAny(raw, ["divorce","separation","separated","talak"]),
    remarriageMention: hasAny(raw, ["second marriage","2nd marriage","remarriage"]),
    relationshipMention: hasAny(raw, ["relationship","love","affair","partner"]),
    childrenMention: hasAny(raw, ["child","children","baby","son","daughter","pregnancy"]),
    familyMention: hasAny(raw, ["family","mother","father","baba","ma"]),
    healthMention: hasAny(raw, ["health","ill","sick","disease","hospital","surgery"]),
    mentalMention: hasAny(raw, ["mental","stress","depression","anxiety","fear"]),
    moneyMention: hasAny(raw, ["money","income","cash","debt","loan","profit","loss"]),
    propertyMention: hasAny(raw, ["property","house","land","flat","car","vehicle"]),
    enemyMention: hasAny(raw, ["enemy","opposition","rival"]),
    networkMention: hasAny(raw, ["friend","network","circle"]),
    spiritualMention: hasAny(raw, ["spiritual","religion","allah","dharma"]),
    marriage_count_claim: facts.marriage_count_claim ?? null,
    broken_marriage_claim: facts.broken_marriage_count ?? facts.broken_marriage_claim ?? null,
    foreign_entry_year_claim: facts.foreign_entry_year_claim ?? null,
    settlement_year_claim: facts.settlement_year_claim ?? null
  };
}

function buildNameOnlyHints(subject_context = {}) {
  const p = subject_context.name_profile || {};
  const root = Number(p.root_number || 0);
  const first = String(p.first_sound_key || "").toLowerCase();
  const sound = {
    r:{relation:1.2,authority:1,money:.8},
    s:{conflict:1.2,spiritual:.8,mobility:.8},
    m:{family:1.2,money:.8},
    a:{authority:1.5,identity:1.3},
    k:{communication:1.2,business:.8},
    j:{foreign:1.1,education:1},
    p:{career:1,document:1},
    f:{network:1,foreign:.8}
  }[first] || {};

  return {
    raw_name: p.raw_name || null,
    root_number: root,
    vibration_class: String(p.vibration_class || "NEUTRAL").toUpperCase(),
    first_sound_key: p.first_sound_key || null,
    relationBias: ([2,6].includes(root) ? 3.2 : [3,5].includes(root) ? 2 : 1) + (sound.relation || 0),
    moneyBias: ([4,8].includes(root) ? 3 : [1,5].includes(root) ? 2 : 1) + (sound.money || 0),
    mindBias: ([2,7].includes(root) ? 3 : root === 9 ? 2.2 : 1.2),
    conflictBias: ([4,8,9].includes(root) ? 3 : 1.1) + (sound.conflict || 0),
    mobilityBias: (root === 5 ? 3.3 : root === 3 ? 2.2 : 1.1) + (sound.mobility || sound.foreign || 0),
    authorityBias: ([1,8].includes(root) ? 3.1 : 1.2) + (sound.authority || 0),
    withdrawalBias: (root === 7 ? 3 : .8) + (sound.spiritual || 0),
    familyBias: ([6,2].includes(root) ? 2.8 : 1) + (sound.family || 0),
    businessBias: ([1,3,5,8].includes(root) ? 2.4 : 1) + (sound.business || 0),
    educationBias: ([3,5,7].includes(root) ? 2 : 1) + (sound.education || 0),
    documentBias: ([4,5,8].includes(root) ? 1.8 : 1) + (sound.document || 0),
    identityBias: ([1,9].includes(root) ? 2.5 : 1) + (sound.identity || 0),
    networkBias: ([3,5,6].includes(root) ? 2 : 1) + (sound.network || 0)
  };
}

function nameOnlyBoost(domainKey, h) {
  switch (domainKey) {
    case "LOVE":
    case "PARTNERSHIP":
    case "MARRIAGE":
    case "DIVORCE":
    case "MULTIPLE_MARRIAGE": return h.relationBias;
    case "MONEY":
    case "DEBT":
    case "GAIN":
    case "LOSS": return h.moneyBias;
    case "BUSINESS": return h.businessBias + h.moneyBias * .4;
    case "MIND":
    case "MENTAL": return h.mindBias;
    case "ENEMY":
    case "LEGAL":
    case "BLOCKAGE":
    case "FAILURE": return h.conflictBias;
    case "FOREIGN":
    case "IMMIGRATION":
    case "VISA":
    case "COMMUNICATION": return h.mobilityBias;
    case "NETWORK": return h.networkBias + h.mobilityBias * .25;
    case "CAREER":
    case "JOB":
    case "SUCCESS": return h.authorityBias;
    case "SPIRITUAL":
    case "RELIGION": return h.withdrawalBias + h.mindBias * .25;
    case "FAMILY":
    case "HOME":
    case "PROPERTY": return h.familyBias + h.moneyBias * .25;
    case "EDUCATION":
    case "DOCUMENT": return h.educationBias + h.documentBias * .35;
    case "IDENTITY": return h.identityBias;
    default: return .8;
  }
}

function domainPlanetLords(domainKey) {
  const map = {
    FOREIGN:["RAHU","MERCURY","JUPITER","SATURN"],
    IMMIGRATION:["RAHU","MERCURY","JUPITER","SATURN"],
    VISA:["MERCURY","RAHU","SUN","SATURN"],
    SETTLEMENT:["MOON","SATURN","RAHU","VENUS"],
    DOCUMENT:["MERCURY","SATURN","SUN"],
    LEGAL:["SATURN","MARS","SUN","RAHU"],
    JOB:["SATURN","SUN","MERCURY"],
    CAREER:["SUN","SATURN","MERCURY"],
    BUSINESS:["MERCURY","VENUS","MARS","RAHU"],
    MONEY:["VENUS","JUPITER","MERCURY"],
    DEBT:["SATURN","RAHU","MARS"],
    PROPERTY:["MOON","MARS","VENUS","SATURN"],
    VEHICLE:["VENUS","MARS","RAHU"],
    EDUCATION:["JUPITER","MERCURY","SUN"],
    MARRIAGE:["VENUS","JUPITER","MOON"],
    DIVORCE:["MARS","SATURN","RAHU","KETU"],
    MULTIPLE_MARRIAGE:["RAHU","VENUS","MARS","SATURN"],
    LOVE:["VENUS","MOON","RAHU"],
    PARTNERSHIP:["VENUS","MERCURY","JUPITER"],
    HEALTH:["SATURN","MARS","KETU"],
    MENTAL:["MOON","RAHU","SATURN"],
    SPIRITUAL:["KETU","JUPITER","SUN"],
    FAMILY:["MOON","VENUS","JUPITER"],
    SUCCESS:["SUN","JUPITER","RAHU"],
    NETWORK:["RAHU","MERCURY","JUPITER"],
    FAILURE:["SATURN","KETU","RAHU"],
    BLOCKAGE:["SATURN","RAHU","KETU"],
    ENEMY:["MARS","SATURN","RAHU"]
  };
  return map[domainKey] || [];
}

function readKpCusps(kp) {
  if (!kp || typeof kp !== "object") return {};
  if (kp.cusps && typeof kp.cusps === "object") return kp.cusps;
  if (kp.kp_cusps && typeof kp.kp_cusps === "object") return kp.kp_cusps;
  const numeric = Object.keys(kp).filter((k) => /^\d+$/.test(k));
  return numeric.length ? kp : {};
}

function lordOf(v) {
  return String(v || "").trim().toUpperCase();
}

function buildKpWeight(domainKey, houses, evidence, modeFlags) {
  if (modeFlags.isNameOnly || modeFlags.isNameContext) return { kp_weight:0, kp_reasons:[] };

  const cusps = readKpCusps(evidence.kp || {});
  const required = new Set(houses.map(String));
  const lords = domainPlanetLords(domainKey);
  let weight = 0;
  const reasons = [];

  for (const [no, cusp] of Object.entries(cusps)) {
    if (!required.has(String(no))) continue;
    const sub = lordOf(cusp?.sub_lord);
    const star = lordOf(cusp?.star_lord);
    const signLord = lordOf(cusp?.sign_lord);

    if (sub && lords.includes(sub)) { weight += 1.35; reasons.push(`KP cusp ${no} sub-lord ${sub}`); }
    if (star && lords.includes(star)) { weight += .75; reasons.push(`KP cusp ${no} star-lord ${star}`); }
    if (signLord && lords.includes(signLord)) { weight += .3; reasons.push(`KP cusp ${no} sign-lord ${signLord}`); }
  }

  return { kp_weight: round2(Math.min(weight, 3.3)), kp_reasons: reasons };
}

function buildDashaWeight(domainKey, evidence, modeFlags) {
  if (modeFlags.isNameOnly || modeFlags.isNameContext) return { dasha_weight:0, dasha_reasons:[] };

  const d = evidence.dasha || {};
  const lords = domainPlanetLords(domainKey);
  const active = [
    lordOf(d.mahadasha || d.maha_lord || d.md),
    lordOf(d.antardasha || d.antar_lord || d.ad),
    lordOf(d.pratyantar || d.pratyantar_lord || d.pd)
  ].filter(Boolean);

  let weight = 0;
  const reasons = [];

  active.forEach((lord, i) => {
    if (!lords.includes(lord)) return;
    const add = i === 0 ? 1.2 : i === 1 ? .75 : .35;
    weight += add;
    reasons.push(`Dasha ${lord}`);
  });

  return { dasha_weight: round2(Math.min(weight, 2.45)), dasha_reasons: reasons };
}

function factBoost(domainKey, h) {
  let b = 0;

  if (domainKey === "EDUCATION" && h.isStudent) b += 2.2;
  if (domainKey === "JOB" && h.hasJob) b += 2.25;
  if (domainKey === "BUSINESS" && h.hasBusiness) b += 2.3;
  if (domainKey === "CAREER" && (h.hasJob || h.hasBusiness)) b += 1.8;

  if (domainKey === "MARRIAGE" && (h.marriageMention || h.marriage_count_claim != null)) b += 2.6;
  if (domainKey === "DIVORCE" && (h.divorceMention || h.broken_marriage_claim != null)) b += 2.55;
  if (domainKey === "MULTIPLE_MARRIAGE" && ((h.marriage_count_claim ?? 0) >= 2 || h.remarriageMention)) b += 2.2;
  if (domainKey === "LOVE" && h.relationshipMention) b += 1.5;
  if (domainKey === "PARTNERSHIP" && h.relationshipMention) b += 1.35;

  if (domainKey === "FOREIGN" && (h.foreignIntent || h.foreignExecuted || h.abroadNow)) b += 2.5;
  if (domainKey === "SETTLEMENT" && (h.settlementMention || h.abroadNow)) b += 2.35;
  if (domainKey === "IMMIGRATION" && (h.foreignIntent || h.foreignExecuted || h.abroadNow)) b += 2.05;
  if (domainKey === "VISA" && h.foreignIntent) b += 1.35;
  if (domainKey === "DOCUMENT" && h.documentMention) b += 1.25;

  if (domainKey === "HEALTH" && h.healthMention) b += 1.95;
  if (domainKey === "MENTAL" && h.mentalMention) b += 1.85;
  if (domainKey === "FAMILY" && h.familyMention) b += 1.55;
  if (domainKey === "MONEY" && h.moneyMention) b += 1.7;
  if (domainKey === "DEBT" && h.moneyMention) b += 1.15;
  if (domainKey === "PROPERTY" && h.propertyMention) b += 1.6;
  if (domainKey === "VEHICLE" && h.propertyMention) b += .95;
  if (domainKey === "LEGAL" && h.legalMention) b += 1.55;
  if (domainKey === "ENEMY" && h.enemyMention) b += 1.35;
  if (domainKey === "NETWORK" && h.networkMention) b += 1.15;
  if (domainKey === "CHILDREN" && h.childrenMention) b += 1.45;
  if (domainKey === "SPIRITUAL" && h.spiritualMention) b += 1.35;
  if (domainKey === "HOME" && h.propertyMention) b += 1.05;

  return b;
}

function normalizeScore(raw, modeFlags, supportCount) {
  if (modeFlags.isNameOnly || modeFlags.isNameContext) {
    return round2(Math.max(0, Math.min(4.25, raw)));
  }

  let score = 10 * (1 - Math.exp(-Math.max(0, raw) / 8.2));

  if (modeFlags.isFullBirth) {
    if (supportCount <= 0) score -= 2.2;
    else if (supportCount === 1) score -= 1;
    else if (supportCount >= 4) score += .35;
  }

  return round2(Math.max(0, Math.min(9.82, score)));
}

function calculateDomainBase(domainKey, targetHouses, evidence, hints, modeFlags, nameHints) {
  const houseHits = [];
  const aspectHits = [];
  let raw = 0;

  if (!modeFlags.isNameOnly && !modeFlags.isNameContext) {
    for (const [planet, houseRaw] of Object.entries(evidence.housesByPlanet || {})) {
      const p = String(planet).toUpperCase();
      const house = Number(houseRaw);
      if (!targetHouses.includes(house)) continue;

      let w = .85;
      if (BENEFICS.includes(p)) w += .4;
      if (MALEFICS.includes(p)) w += .5;
      if (domainPlanetLords(domainKey).includes(p)) w += .7;

      raw += w;
      houseHits.push({ planet:p, house });
    }

    for (const a of evidence.aspects || []) {
      const p1 = String(a.planet1 || "").toUpperCase();
      const p2 = String(a.planet2 || "").toUpperCase();
      const h1 = Number(evidence.housesByPlanet[p1]);
      const h2 = Number(evidence.housesByPlanet[p2]);

      if (targetHouses.includes(h1) || targetHouses.includes(h2)) {
        const lordHit = domainPlanetLords(domainKey).includes(p1) || domainPlanetLords(domainKey).includes(p2);
        raw += lordHit ? .55 : .25;
        aspectHits.push({ planet1:p1, planet2:p2, type:a.type, orb_gap:a.orb_gap, domain_lord_hit:lordHit });
      }
    }
  }

  const fact = factBoost(domainKey, hints);
  const kp = buildKpWeight(domainKey, targetHouses, evidence, modeFlags);
  const dasha = buildDashaWeight(domainKey, evidence, modeFlags);

  raw += fact + kp.kp_weight + dasha.dasha_weight;

  if (modeFlags.isNameOnly || modeFlags.isNameContext) raw += nameOnlyBoost(domainKey, nameHints);
  if (modeFlags.isReducedDob) raw += .45;
  if (modeFlags.isFullBirth) raw += .55;

  const supportCount =
    houseHits.length +
    aspectHits.length +
    (fact > 0 ? 1 : 0) +
    (kp.kp_weight > 0 ? 1 : 0) +
    (dasha.dasha_weight > 0 ? 1 : 0);

  const normalized = normalizeScore(raw + targetHouses.length * .08, modeFlags, supportCount);

  return {
    rawScore: round2(raw),
    normalizedScore: normalized,
    supportCount,
    houseHits,
    aspectHits,
    kp_weight: kp.kp_weight,
    kp_reasons: kp.kp_reasons,
    dasha_weight: dasha.dasha_weight,
    dasha_reasons: dasha.dasha_reasons,
    density: normalized >= 7.7 ? "HIGH" : normalized >= 5.65 ? "MED" : "LOW",
    residualImpact: normalized >= 7.7 ? "HIGH" : normalized >= 5.65 ? "MED" : "LOW"
  };
}

function strengthLabel(score, modeFlags) {
  if (modeFlags.isNameOnly || modeFlags.isNameContext) {
    if (score >= 3.2) return "strong_name_pattern";
    if (score >= 2.2) return "light_but_usable";
    return "weak";
  }
  if (score >= 7.35) return "strong";
  if (score >= 5.65) return "moderate";
  if (score >= 4.8) return "light_but_usable";
  return "weak";
}

function patternEventType(domainKey) {
  return `likely ${String(domainKey || "domain").toLowerCase()} window`;
}

function eventThreshold(modeFlags) {
  if (modeFlags.isNameOnly || modeFlags.isNameContext) return 2.2;
  if (modeFlags.isFullBirth) return 5.65;
  if (modeFlags.isReducedDob) return 5.2;
  return 5.2;
}

function majorThreshold(modeFlags) {
  if (modeFlags.isNameOnly || modeFlags.isNameContext) return 3.2;
  if (modeFlags.isFullBirth) return 7.35;
  return 6.85;
}

function makeEvent(payload) {
  return {
    event_family: payload.event_family || null,
    event_type: payload.event_type || "domain event",
    event_number: payload.event_number || 1,
    exact_year: normalizeYear(payload.exact_year),
    month_or_phase: payload.month_or_phase || null,
    evidence_strength: payload.evidence_strength || "moderate",
    status: payload.status || "PATTERN_ONLY",
    importance: payload.importance || "MINOR",
    trigger_phase: payload.trigger_phase || null,
    carryover_to_present: payload.carryover_to_present || "NO",
    who_involved: payload.who_involved || null,
    impact_summary: payload.impact_summary || null,
    evidence_type: payload.evidence_type || "PATTERN_ONLY",
    likely_age_window: payload.likely_age_window || null,
    likely_year_window: payload.likely_year_window || null,
    timing_mode: payload.timing_mode || "PATTERN_WINDOW"
  };
}

function buildPatternEvent(domainKey, score, modeFlags, birth_context) {
  const aw = ageWindow(domainKey);
  const yw = modeFlags.isReducedDob || modeFlags.isFullBirth
    ? yearWindowFromAge(birth_context?.birth_datetime_iso, domainKey)
    : null;

  const isName = modeFlags.isNameOnly || modeFlags.isNameContext;

  return makeEvent({
    event_family: isName ? "NAME_PATTERN_LEDGER" : "ASTRO_PATTERN_LEDGER",
    event_type: patternEventType(domainKey),
    month_or_phase: yw ? `likely year window ${yw[0]}-${yw[1]}` : `likely age window ${aw[0]}-${aw[1]}`,
    evidence_strength: strengthLabel(score, modeFlags),
    status: isName ? "LIKELY_WINDOW" : "HIGH_PROBABILITY",
    importance: score >= majorThreshold(modeFlags) ? "MAJOR" : "MINOR",
    trigger_phase: isName ? "elite name-pattern locked window" : "astro forensic probability window",
    carryover_to_present: "NO",
    who_involved: "self / domain-linked people",
    impact_summary: isName
      ? "elite probability window visible, but execution is not confirmed"
      : "astro probability window visible; execution requires anchor",
    evidence_type: isName ? "NAME_PATTERN" : "LIKELY_HISTORY",
    likely_age_window: aw,
    likely_year_window: yw,
    timing_mode: yw ? "LIKELY_YEAR_WINDOW" : "LIKELY_AGE_WINDOW"
  });
}

function buildFactOrAstroEvents(domainKey, hints, score, modeFlags, birth_context) {
  const directYear = hints.years[0] ?? null;

  if (score < eventThreshold(modeFlags)) return [];

  if (modeFlags.execution_claim_allowed) {
    if (["FOREIGN","IMMIGRATION","VISA","SETTLEMENT"].includes(domainKey) && (hints.foreignExecuted || hints.abroadNow)) {
      return [makeEvent({
        event_family: "FOREIGN_LEDGER",
        event_type: domainKey === "SETTLEMENT" ? "settlement / base process" : "foreign / immigration process",
        exact_year: hints.foreign_entry_year_claim || hints.settlement_year_claim || directYear,
        month_or_phase: directYear ? "year-anchored phase" : "fact-supported phase",
        evidence_strength: "strong",
        status: "EXECUTED",
        importance: "MAJOR",
        trigger_phase: "fact-supported foreign/base axis",
        carryover_to_present: "YES",
        who_involved: "self / authority",
        impact_summary: "domain has fact support",
        evidence_type: "DIRECT_FACT"
      })];
    }

    if (["MARRIAGE","DIVORCE","MULTIPLE_MARRIAGE","LOVE","PARTNERSHIP","CHILDREN"].includes(domainKey)) {
      const rel = hints.marriageMention || hints.divorceMention || hints.relationshipMention || hints.childrenMention;
      if (rel) {
        return [makeEvent({
          event_family: "RELATIONSHIP_LEDGER",
          event_type: domainKey === "DIVORCE" ? "divorce / separation event" : `${domainKey.toLowerCase()} phase`,
          exact_year: directYear,
          month_or_phase: directYear ? "year-anchored phase" : "fact-supported phase",
          evidence_strength: "strong",
          status: "EXECUTED",
          importance: "MAJOR",
          trigger_phase: "relationship axis active",
          carryover_to_present: "YES",
          who_involved: "self / partner / family",
          impact_summary: "relationship domain has fact support",
          evidence_type: "DIRECT_FACT"
        })];
      }
    }
  }

  return [buildPatternEvent(domainKey, score, modeFlags, birth_context)];
}

function applyModePolicy(domain_results, modeFlags, birth_context) {
  return domain_results.map((d) => {
    const isName = modeFlags.isNameOnly || modeFlags.isNameContext;

    const events = (d.events || []).map((e) => {
      if (isName) {
        return {
          ...e,
          status: d.normalized_score >= 3.2 ? "LIKELY_WINDOW" : "PATTERN_ONLY",
          evidence_type: "NAME_PATTERN",
          exact_year: null,
          exact_claim_locked: true,
          execution_claim_allowed: false,
          likely_age_window: e.likely_age_window || ageWindow(d.domain_key),
          likely_year_window: null,
          timing_mode: "LIKELY_AGE_WINDOW"
        };
      }

      return e;
    });

    return {
      ...d,
      events,
      pattern_mode_active: isName,
      direct_evidence_count: events.filter((e) => ["DIRECT","DIRECT_FACT","FACT_ANCHORED"].includes(e.evidence_type)).length,
      pattern_evidence_count: events.filter((e) => ["NAME_PATTERN","LIKELY_HISTORY","PATTERN_ONLY"].includes(e.evidence_type)).length,
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
      raw_score: base.rawScore,
      normalized_score: base.normalizedScore,
      support_count: base.supportCount,
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
        ["ACTIVE","STABILISING","EXECUTED","BUILDING","PATTERN_ONLY","LIKELY_WINDOW","HIGH_PROBABILITY"].includes(e.status)
      ).length,
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
  const modeFlags = getModeFlags(subject_context, birth_context);
  const out = [];

  for (const d of ranked_domains || []) {
    for (const e of d.events || []) {
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
        date_marker: modeFlags.isNameOnly || modeFlags.isNameContext ? null : normalizeYear(e.exact_year),
        month_or_phase: e.month_or_phase || null,
        likely_age_window: e.likely_age_window || ageWindow(d.domain_key),
        likely_year_window: modeFlags.isReducedDob || modeFlags.isFullBirth
          ? e.likely_year_window || yearWindowFromAge(birth_context?.birth_datetime_iso, d.domain_key)
          : null,
        timing_mode: e.timing_mode || "PATTERN_WINDOW",
        who_involved: e.who_involved || null,
        impact_summary: e.impact_summary || null,
        carryover_to_present: e.carryover_to_present
      });
    }
  }

  return out.sort((a, b) => {
    const aa = a.date_marker ?? a.likely_age_window?.[0] ?? 99999;
    const bb = b.date_marker ?? b.likely_age_window?.[0] ?? 99999;
    return aa - bb;
  });
}