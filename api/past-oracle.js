import { buildChartCore } from "../lib/chart-core.js";
import { astroProvider } from "../lib/provider-adapter.js";

/* =====================================
   BASIC HELPERS
===================================== */

const str = (v) => (v == null ? "" : String(v).trim());

const toNum = (v) => {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const normalizeFormat = (v) => {
  const x = str(v).toLowerCase();
  if (x === "compact") return "compact";
  if (x === "project") return "project";
  return "json";
};

const round2 = (n) => Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;

function hasAny(text, arr) {
  return arr.some((x) => text.includes(x));
}

function safeBirthYear(birthIso) {
  if (!birthIso) return null;
  const d = new Date(birthIso);
  return Number.isNaN(d.getTime()) ? null : d.getUTCFullYear();
}

function extractAllYears(text) {
  return [...text.matchAll(/\b(19|20)\d{2}\b/g)].map((m) => Number(m[0]));
}

function wordToNum(w) {
  const map = {
    one: 1, two: 2, three: 3, four: 4, five: 5,
    ek: 1, ekta: 1,
    dui: 2, duita: 2,
    tin: 3, tinta: 3,
    char: 4, charta: 4,
    pach: 5, pachta: 5
  };
  return map[(w || "").toLowerCase()] ?? null;
}

function extractNearestCountBeforeKeyword(text, keywordList) {
  for (const kw of keywordList) {
    const rx = new RegExp(`(?:\\b([1-9])\\b|\\b(one|two|three|four|five|ek|ekta|dui|duita|tin|tinta|char|charta|pach|pachta)\\b)\\s+${kw}`, "i");
    const m = text.match(rx);
    if (m) {
      if (m[1]) return Number(m[1]);
      if (m[2]) return wordToNum(m[2]);
    }
  }
  return null;
}

function extractYearAfterKeyword(text, keywordList) {
  for (const kw of keywordList) {
    const rx = new RegExp(`${kw}\\s*(?:in\\s*)?(\\b(?:19|20)\\d{2}\\b)`, "i");
    const m = text.match(rx);
    if (m) return Number(m[1]);
  }
  return null;
}

function inferPseudoYear(domainKey, birthYear, rankScore, eventNumber) {
  const base =
    domainKey === "MARRIAGE" ? 18 :
    domainKey === "DIVORCE" ? 20 :
    domainKey === "RELATIONSHIP" ? 18 :
    domainKey === "LOVE" ? 18 :
    domainKey === "FOREIGN" ? 20 :
    domainKey === "SETTLEMENT" ? 24 :
    domainKey === "IMMIGRATION" ? 20 :
    domainKey === "CAREER" ? 19 :
    domainKey === "JOB" ? 19 :
    domainKey === "BUSINESS" ? 23 :
    domainKey === "HEALTH" ? 18 :
    domainKey === "MENTAL" ? 18 :
    domainKey === "PROPERTY" ? 24 :
    domainKey === "HOME" ? 20 :
    18;

  return birthYear + base + (eventNumber - 1) * 2 + Math.floor(rankScore / 4);
}

function minifyDomain(d) {
  return {
    domain_key: d.domain_key,
    domain_label: d.domain_label,
    rank_score: d.rank_score,
    normalized_score: d.normalized_score,
    density: d.density,
    residual_impact: d.residual_impact,
    major_event_count: d.major_event_count,
    broken_event_count: d.broken_event_count,
    active_event_count: d.active_event_count
  };
}

/* =====================================
   FACT PARSER
===================================== */

function parseFactAnchors(facts, question) {
  const text = `${facts || ""} ${question || ""}`.toLowerCase();
  const years = extractAllYears(text);

  const marriageCount =
    extractNearestCountBeforeKeyword(text, ["marriages?", "bea", "married", "wife", "husband", "union"]);

  const brokenMarriageCount =
    extractNearestCountBeforeKeyword(text, ["broken", "divorce", "separation", "broke", "veng", "venge"]);

  let foreignEntryYear =
    extractYearAfterKeyword(text, ["uk", "foreign", "abroad", "came", "arrived", "entry", "moved"]);

  let settlementYear =
    extractYearAfterKeyword(text, ["settlement", "settled", "stable", "stabil", "base"]);

  if (foreignEntryYear == null && hasAny(text, ["uk", "foreign", "abroad", "came", "arrived", "entry", "moved"]) && years.length > 0) {
    foreignEntryYear = years[0];
  }

  if (settlementYear == null && hasAny(text, ["settlement", "settled", "stable", "stabil", "base"]) && years.length > 1) {
    settlementYear = years[years.length - 1];
  }

  return {
    provided: !!(facts || question),
    raw_text: text,
    marriage_count_claim: marriageCount,
    broken_marriage_claim: brokenMarriageCount,
    foreign_entry_year_claim: foreignEntryYear,
    settlement_year_claim: settlementYear,
    all_years: years
  };
}

/* =====================================
   QUESTION PROFILE
===================================== */

function buildQuestionProfile(question) {
  const q = str(question).toLowerCase();

  const primary_domain =
    hasAny(q, ["marriage", "bea", "wife", "husband", "divorce"]) ? "MARRIAGE" :
    hasAny(q, ["relationship", "love", "partner", "breakup", "affair"]) ? "RELATIONSHIP" :
    hasAny(q, ["career", "job", "work", "business", "profession"]) ? "CAREER" :
    hasAny(q, ["money", "income", "cash", "debt", "finance"]) ? "MONEY" :
    hasAny(q, ["foreign", "abroad", "uk", "visa", "migration", "settlement"]) ? "FOREIGN" :
    hasAny(q, ["health", "disease", "hospital", "stress", "illness"]) ? "HEALTH" :
    hasAny(q, ["property", "land", "house", "home", "flat"]) ? "PROPERTY" :
    hasAny(q, ["legal", "court", "penalty", "case", "authority"]) ? "LEGAL" :
    hasAny(q, ["child", "children", "daughter", "son"]) ? "CHILDREN" :
    "GENERAL";

  return {
    raw_question: question || "",
    primary_domain,
    asks_count: hasAny(q, ["koita", "how many", "count", "number", "mot", "total"]),
    asks_timing: hasAny(q, ["when", "kobe", "date", "year", "history", "timeline"]),
    asks_status: hasAny(q, ["current", "now", "status", "active", "ase", "ongoing"]),
    asks_general: primary_domain === "GENERAL"
  };
}

function expandLinkedDomains(primary) {
  const map = {
    MARRIAGE: ["MARRIAGE", "DIVORCE", "RELATIONSHIP", "LOVE", "MULTIPLE_MARRIAGE", "CHILDREN", "FAMILY", "LEGAL", "PARTNERSHIP"],
    RELATIONSHIP: ["RELATIONSHIP", "LOVE", "MARRIAGE", "DIVORCE", "CHILDREN", "FAMILY", "PARTNERSHIP"],
    CAREER: ["CAREER", "JOB", "BUSINESS", "MONEY", "GAIN", "LOSS", "REPUTATION", "AUTHORITY", "LEGAL", "SUCCESS", "FAILURE"],
    MONEY: ["MONEY", "GAIN", "LOSS", "DEBT", "CAREER", "BUSINESS", "LEGAL", "SUCCESS", "FAILURE"],
    FOREIGN: ["FOREIGN", "TRAVEL_LONG", "SETTLEMENT", "IMMIGRATION", "VISA", "PROPERTY", "LOSS", "CAREER", "DOCUMENT"],
    HEALTH: ["HEALTH", "DISEASE", "RECOVERY", "MENTAL", "ACCIDENT", "SURGERY", "LOSS"],
    PROPERTY: ["PROPERTY", "HOME", "SETTLEMENT", "FOREIGN", "MONEY", "LEGAL", "VEHICLE"],
    LEGAL: ["LEGAL", "DOCUMENT", "AUTHORITY", "REPUTATION", "ENEMY", "MONEY", "IMMIGRATION"],
    CHILDREN: ["CHILDREN", "LOVE", "MARRIAGE", "RELATIONSHIP", "FAMILY"],
    GENERAL: [
      "MARRIAGE", "DIVORCE", "MULTIPLE_MARRIAGE", "RELATIONSHIP", "LOVE",
      "FOREIGN", "SETTLEMENT", "IMMIGRATION", "VISA",
      "CAREER", "JOB", "BUSINESS", "MONEY", "GAIN", "LOSS", "DEBT",
      "HEALTH", "MENTAL", "DISEASE", "RECOVERY",
      "PROPERTY", "HOME", "VEHICLE",
      "FAMILY", "CHILDREN",
      "LEGAL", "DOCUMENT", "AUTHORITY", "REPUTATION",
      "SUCCESS", "FAILURE", "BLOCKAGE", "DELAY"
    ]
  };

  return map[primary] || map.GENERAL;
}

/* =====================================
   EVIDENCE NORMALIZATION
===================================== */

function signToIndex(sign) {
  const signs = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
  ];
  return signs.indexOf(sign);
}

function normalizeEvidence(packet) {
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
      house_mapping_present: Object.keys(housesByPlanet).length > 0
    }
  };
}

/* =====================================
   DOMAIN REGISTRY
===================================== */

const DOMAIN_REGISTRY = [
  ["IDENTITY", "Identity / Self / Direction", [1]],
  ["MIND", "Mind / Emotion / Response", [4, 5]],
  ["COMMUNICATION", "Communication / Effort / Siblings", [3]],
  ["FAMILY", "Family / Wealth / Speech", [2]],
  ["HOME", "Home / Mother / Base", [4]],
  ["LOVE", "Love / Romance / Attachment", [5, 7]],
  ["CHILDREN", "Children / Creativity / Continuity", [5]],
  ["HEALTH", "Health / Disease / Stress", [6, 8, 12]],
  ["MARRIAGE", "Marriage / Partnership", [7, 2, 8]],
  ["SEX", "Intimacy / Hidden Bonding", [8]],
  ["TRANSFORMATION", "Transformation / Break / Shock", [8]],
  ["FOREIGN", "Foreign / Distance / Withdrawal", [9, 12, 4]],
  ["RELIGION", "Religion / Dharma / Belief", [9]],
  ["CAREER", "Career / Authority / Public Role", [10, 6]],
  ["GAIN", "Gain / Network / Fulfilment", [11]],
  ["LOSS", "Loss / Isolation / Exit", [12]],
  ["DEBT", "Debt / Liability / Pressure", [6, 8]],
  ["LEGAL", "Legal / Penalty / Authority", [6, 7, 10]],
  ["ENEMY", "Opponent / Conflict / Resistance", [6]],
  ["FRIEND", "Friend / Support / Ally", [11]],
  ["NETWORK", "Network / Circle / Access", [11, 3]],
  ["REPUTATION", "Reputation / Visibility / Name", [10, 11]],
  ["POWER", "Power / Control / Command", [10, 8]],
  ["AUTHORITY", "Authority / State / Structure", [10, 6]],
  ["BUSINESS", "Business / Trade / Deal", [7, 10, 11]],
  ["JOB", "Job / Service / Employment", [6, 10]],
  ["PARTNERSHIP", "Partnership / Contract", [7, 11]],
  ["DIVORCE", "Separation / Divorce / Break", [7, 8, 6]],
  ["MULTIPLE_MARRIAGE", "Repeated Union Patterns", [7, 8, 2]],
  ["TRAVEL_SHORT", "Short Travel / Movement", [3, 9]],
  ["TRAVEL_LONG", "Long Travel / Distance", [9, 12]],
  ["SETTLEMENT", "Settlement / Base Formation", [4, 12, 10]],
  ["CITIZENSHIP", "Status / Permanence / Recognition", [9, 10, 11]],
  ["ACCIDENT", "Accident / Abrupt Injury", [8, 6]],
  ["SURGERY", "Surgery / Invasive Event", [8, 6]],
  ["DISEASE", "Disease / Recurring Illness", [6, 8, 12]],
  ["RECOVERY", "Recovery / Healing Phase", [6, 11]],
  ["MENTAL", "Mental Pressure / Fear / Overdrive", [1, 4, 8]],
  ["SPIRITUAL", "Spiritual Turning / Withdrawal", [9, 12, 8]],
  ["TANTRIC", "Occult / Hidden / Ritual Sensitivity", [8, 12]],
  ["BLOCKAGE", "Block / Delay / Obstruction", [6, 8, 12, 10]],
  ["SUCCESS", "Success / Rise / Execution", [10, 11, 5]],
  ["FAILURE", "Failure / Collapse / Miss", [8, 6, 12]],
  ["DELAY", "Delay / Late Materialisation", [6, 10, 12]],
  ["SUDDEN_GAIN", "Sudden Gain / Windfall", [8, 11]],
  ["SUDDEN_LOSS", "Sudden Loss / Drop", [8, 12, 2]],
  ["FAME", "Fame / Larger Visibility", [10, 11, 5]],
  ["SCANDAL", "Scandal / Exposure / Damage", [8, 10, 6]],
  ["DOCUMENT", "Documents / Records / Paperwork", [3, 6, 10]],
  ["VISA", "Visa / Permission / External Clearance", [9, 12, 10]],
  ["IMMIGRATION", "Immigration / Relocation Path", [9, 12, 4, 10]],
  ["PROPERTY", "Property / Residence / Land", [4, 11, 2]],
  ["VEHICLE", "Vehicle / Transport Asset", [4, 3]]
];

/* =====================================
   DOMAIN EVENT INFERENCE
===================================== */

function inferUniversalEvents(domainKey, score, factAnchors) {
  const events = [];
  const strength =
    score >= 7 ? "strong" :
    score >= 4 ? "moderate" : "light";

  if (domainKey === "MARRIAGE") {
    const total = factAnchors.marriage_count_claim ?? (score >= 7 ? 2 : score >= 4 ? 1 : 0);
    const broken = factAnchors.broken_marriage_claim ?? Math.max(0, total - 1);
    const active = Math.max(0, total - broken);

    for (let i = 0; i < total; i += 1) {
      const isBroken = i < broken;
      const isLastActive = !isBroken && active > 0 && i === total - 1;

      events.push({
        event_type: "marriage event",
        event_number: i + 1,
        evidence_strength: strength,
        status: isBroken ? "BROKEN" : isLastActive ? "STABILISING" : "EXECUTED",
        importance: "MAJOR",
        trigger_phase: isBroken ? "union then break" : "union then continuation",
        carryover_to_present: isBroken ? "NO" : "YES"
      });
    }
    return events;
  }

  if (domainKey === "DIVORCE") {
    const broken = factAnchors.broken_marriage_claim ?? (score >= 7 ? 1 : 0);
    for (let i = 0; i < broken; i += 1) {
      events.push({
        event_type: "separation / divorce event",
        event_number: i + 1,
        evidence_strength: strength,
        status: "BROKEN",
        importance: "MAJOR",
        trigger_phase: "rupture / severance",
        carryover_to_present: i === broken - 1 ? "YES" : "NO"
      });
    }
    return events;
  }

  if (domainKey === "FOREIGN") {
    if (factAnchors.foreign_entry_year_claim != null) {
      events.push({
        event_type: "foreign entry event",
        event_number: 1,
        exact_year: factAnchors.foreign_entry_year_claim,
        evidence_strength: strength,
        status: "EXECUTED",
        importance: "MAJOR",
        trigger_phase: "movement / foreign entry",
        carryover_to_present: "NO"
      });
    } else if (score >= 4) {
      events.push({
        event_type: "foreign shift signature",
        event_number: 1,
        evidence_strength: strength,
        status: "LIKELY",
        importance: "MAJOR",
        trigger_phase: "distance / withdrawal pattern",
        carryover_to_present: "NO"
      });
    }
    return events;
  }

  if (domainKey === "SETTLEMENT") {
    if (factAnchors.settlement_year_claim != null) {
      events.push({
        event_type: "settlement event",
        event_number: 1,
        exact_year: factAnchors.settlement_year_claim,
        evidence_strength: strength,
        status: "STABILISING",
        importance: "MAJOR",
        trigger_phase: "base consolidation",
        carryover_to_present: "YES"
      });
    } else if (score >= 4) {
      events.push({
        event_type: "base formation signature",
        event_number: 1,
        evidence_strength: strength,
        status: "ACTIVE",
        importance: "MAJOR",
        trigger_phase: "settlement pressure",
        carryover_to_present: "YES"
      });
    }
    return events;
  }

  if (domainKey === "CAREER" || domainKey === "JOB" || domainKey === "BUSINESS") {
    if (score >= 7) {
      events.push(
        {
          event_type: "career establishment phase",
          event_number: 1,
          evidence_strength: strength,
          status: "EXECUTED",
          importance: "MAJOR",
          trigger_phase: "role opening",
          carryover_to_present: "NO"
        },
        {
          event_type: "career restructuring phase",
          event_number: 2,
          evidence_strength: strength,
          status: "ACTIVE",
          importance: "MAJOR",
          trigger_phase: "work / authority re-ordering",
          carryover_to_present: "YES"
        }
      );
    } else if (score >= 4) {
      events.push({
        event_type: "career activity signature",
        event_number: 1,
        evidence_strength: strength,
        status: "ACTIVE",
        importance: "MAJOR",
        trigger_phase: "work engagement",
        carryover_to_present: "YES"
      });
    }
    return events;
  }

  if (domainKey === "HEALTH" || domainKey === "DISEASE" || domainKey === "MENTAL") {
    if (score >= 7) {
      events.push(
        {
          event_type: "major stress / weakness phase",
          event_number: 1,
          evidence_strength: strength,
          status: "EXECUTED",
          importance: "MAJOR",
          trigger_phase: "health strain",
          carryover_to_present: "NO"
        },
        {
          event_type: "recurring residue phase",
          event_number: 2,
          evidence_strength: strength,
          status: "ACTIVE",
          importance: "MAJOR",
          trigger_phase: "repeat vulnerability",
          carryover_to_present: "YES"
        }
      );
    } else if (score >= 4) {
      events.push({
        event_type: "health pressure signature",
        event_number: 1,
        evidence_strength: strength,
        status: "RESIDUAL",
        importance: "MAJOR",
        trigger_phase: "imbalance pattern",
        carryover_to_present: "YES"
      });
    }
    return events;
  }

  if (domainKey === "MONEY" || domainKey === "DEBT" || domainKey === "GAIN" || domainKey === "LOSS") {
    if (score >= 7) {
      events.push(
        {
          event_type: "financial compression phase",
          event_number: 1,
          evidence_strength: strength,
          status: "EXECUTED",
          importance: "MAJOR",
          trigger_phase: "cash pressure / debt movement",
          carryover_to_present: "NO"
        },
        {
          event_type: "recovery / gain phase",
          event_number: 2,
          evidence_strength: strength,
          status: "STABILISING",
          importance: "MAJOR",
          trigger_phase: "financial recovery",
          carryover_to_present: "YES"
        }
      );
    } else if (score >= 4) {
      events.push({
        event_type: "money movement signature",
        event_number: 1,
        evidence_strength: strength,
        status: "ACTIVE",
        importance: "MAJOR",
        trigger_phase: "cashflow motion",
        carryover_to_present: "YES"
      });
    }
    return events;
  }

  if (domainKey === "RELATIONSHIP" || domainKey === "LOVE") {
    if (score >= 4) {
      events.push({
        event_type: "relational complexity phase",
        event_number: 1,
        evidence_strength: strength,
        status: score >= 7 ? "BROKEN" : "RESIDUAL",
        importance: "MAJOR",
        trigger_phase: "attachment complexity",
        carryover_to_present: "YES"
      });
    }
    return events;
  }

  if (domainKey === "DOCUMENT" || domainKey === "IMMIGRATION" || domainKey === "VISA") {
    if (score >= 7) {
      events.push({
        event_type: "documentation / approval event",
        event_number: 1,
        evidence_strength: strength,
        status: "EXECUTED",
        importance: "MAJOR",
        trigger_phase: "paperwork / authority clearance",
        carryover_to_present: "NO"
      });
    } else if (score >= 4) {
      events.push({
        event_type: "documentation signature",
        event_number: 1,
        evidence_strength: strength,
        status: "PARTIAL",
        importance: "MAJOR",
        trigger_phase: "paperwork / authority motion",
        carryover_to_present: "YES"
      });
    }
    return events;
  }

  if (domainKey === "PROPERTY" || domainKey === "HOME" || domainKey === "VEHICLE") {
    if (score >= 4) {
      events.push({
        event_type: "property / base / asset event",
        event_number: 1,
        evidence_strength: strength,
        status: score >= 7 ? "EXECUTED" : "ACTIVE",
        importance: "MAJOR",
        trigger_phase: "base / asset / transport movement",
        carryover_to_present: "YES"
      });
    }
    return events;
  }

  if (domainKey === "FAILURE" || domainKey === "BLOCKAGE" || domainKey === "DELAY" || domainKey === "SCANDAL") {
    if (score >= 4) {
      events.push({
        event_type: `${domainKey.toLowerCase()} event`,
        event_number: 1,
        evidence_strength: strength,
        status: "BROKEN",
        importance: "MAJOR",
        trigger_phase: "obstruction / rupture",
        carryover_to_present: "YES"
      });
    }
    return events;
  }

  if (score >= 7) {
    events.push(
      {
        event_type: `${domainKey.toLowerCase()} major activation`,
        event_number: 1,
        evidence_strength: strength,
        status: "EXECUTED",
        importance: "MAJOR",
        trigger_phase: "domain activation",
        carryover_to_present: "NO"
      },
      {
        event_type: `${domainKey.toLowerCase()} continuing residue`,
        event_number: 2,
        evidence_strength: strength,
        status: "ACTIVE",
        importance: "MINOR",
        trigger_phase: "continued influence",
        carryover_to_present: "YES"
      }
    );
  } else if (score >= 4) {
    events.push({
      event_type: `${domainKey.toLowerCase()} signature`,
      event_number: 1,
      evidence_strength: strength,
      status: "RESIDUAL",
      importance: "MINOR",
      trigger_phase: "moderate activation",
      carryover_to_present: "YES"
    });
  }

  return events;
}

/* =====================================
   DOMAIN SCANNER
===================================== */

function runUniversalNanoScanner(ctx) {
  return DOMAIN_REGISTRY.map(([key, label, houses]) =>
    scanSingleDomain(key, label, houses, ctx)
  );
}

function scanSingleDomain(domainKey, domainLabel, targetHouses, ctx) {
  const { evidence, factAnchors, questionProfile, linkedExpansion } = ctx;

  const benefics = ["JUPITER", "VENUS", "MOON", "MERCURY"];
  const malefics = ["SATURN", "MARS", "RAHU", "KETU", "SUN"];

  const houseHits = [];
  const aspectHits = [];
  let rawScore = 0;

  for (const [planetName, houseNum] of Object.entries(evidence.housesByPlanet || {})) {
    if (targetHouses.includes(houseNum)) {
      houseHits.push({ planet: planetName, house: houseNum });

      let weight = 1;
      if (benefics.includes(planetName)) weight += 0.7;
      if (malefics.includes(planetName)) weight += 0.9;

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
      rawScore += 0.55;
    }
  }

  if (linkedExpansion.includes(domainKey)) rawScore += 1.6;
  if (domainKey === questionProfile.primary_domain) rawScore += 2.2;

  if (domainKey === "MARRIAGE" && factAnchors.marriage_count_claim != null) rawScore += 3;
  if (domainKey === "DIVORCE" && factAnchors.broken_marriage_claim != null) rawScore += 2.4;
  if (domainKey === "FOREIGN" && factAnchors.foreign_entry_year_claim != null) rawScore += 2.6;
  if (domainKey === "SETTLEMENT" && factAnchors.settlement_year_claim != null) rawScore += 2.8;

  if (evidence.dasha?.maha_dasha || evidence.dasha?.mahadasha) rawScore += 0.4;

  const normalizedScore = round2(Math.min(10, rawScore + targetHouses.length * 0.18));

  const density =
    normalizedScore >= 7 ? "HIGH" :
    normalizedScore >= 4 ? "MED" : "LOW";

  const residualImpact =
    normalizedScore >= 7 ? "HIGH" :
    normalizedScore >= 4 ? "MED" : "LOW";

  const events = inferUniversalEvents(domainKey, normalizedScore, factAnchors);

  return {
    domain_key: domainKey,
    domain_label: domainLabel,
    target_houses: targetHouses,
    normalized_score: normalizedScore,
    density,
    residual_impact: residualImpact,
    present_carryover: events.some((e) => e.carryover_to_present === "YES") ? "YES" : "NO",
    house_hits: houseHits,
    aspect_hits: aspectHits,
    major_event_count: events.filter((e) => e.importance === "MAJOR").length,
    minor_event_count: events.filter((e) => e.importance === "MINOR").length,
    broken_event_count: events.filter((e) => e.status === "BROKEN").length,
    active_event_count: events.filter((e) => e.status === "ACTIVE" || e.status === "STABILISING").length,
    events
  };
}

/* =====================================
   RANK / SUMMARY / TIMELINE
===================================== */

function rankDomains(domainResults, linkedExpansion, questionProfile) {
  return domainResults
    .map((d) => {
      let boost = 0;
      if (linkedExpansion.includes(d.domain_key)) boost += 3;
      if (d.domain_key === questionProfile.primary_domain) boost += 5;

      if (questionProfile.primary_domain === "GENERAL") {
        if (["DOCUMENT", "VEHICLE", "NETWORK", "TRAVEL_SHORT", "COMMUNICATION"].includes(d.domain_key)) {
          boost -= 1.4;
        }
        if (["MARRIAGE", "DIVORCE", "MULTIPLE_MARRIAGE", "FOREIGN", "SETTLEMENT", "CAREER", "HEALTH", "PROPERTY", "FAMILY"].includes(d.domain_key)) {
          boost += 1.6;
        }
      }

      return {
        ...d,
        rank_score: round2(d.normalized_score + boost)
      };
    })
    .sort((a, b) => b.rank_score - a.rank_score);
}

function buildEventSummary(rankedDomains) {
  const marriageDomain = rankedDomains.find((d) => d.domain_key === "MARRIAGE");
  const foreignDomain = rankedDomains.find((d) => d.domain_key === "FOREIGN");
  const settlementDomain = rankedDomains.find((d) => d.domain_key === "SETTLEMENT");

  const marriageEvents = marriageDomain?.events?.filter((e) => e.event_type === "marriage event") || [];

  return {
    total_estimated_events: rankedDomains.reduce((a, b) => a + b.events.length, 0),
    total_major_events: rankedDomains.reduce((a, b) => a + b.major_event_count, 0),
    total_minor_events: rankedDomains.reduce((a, b) => a + b.minor_event_count, 0),
    total_broken_events: rankedDomains.reduce((a, b) => a + b.broken_event_count, 0),
    total_active_events: rankedDomains.reduce((a, b) => a + b.active_event_count, 0),
    marriage_count: marriageEvents.length,
    broken_marriage_count: marriageEvents.filter((e) => e.status === "BROKEN").length,
    current_marriage_status:
      marriageEvents.findLast?.((e) => e.status === "STABILISING" || e.status === "ACTIVE")?.status ||
      (marriageEvents[marriageEvents.length - 1]?.status || "UNKNOWN"),
    foreign_shift_count: foreignDomain?.events?.length || 0,
    foreign_entry_year: foreignDomain?.events?.find((e) => e.event_type === "foreign entry event")?.exact_year ?? null,
    settlement_year: settlementDomain?.events?.find((e) => e.event_type === "settlement event")?.exact_year ?? null,
    top_5_domains: rankedDomains.slice(0, 5).map((d) => d.domain_label)
  };
}

function buildMasterTimeline(rankedDomains, birthContext) {
  const birthYear = safeBirthYear(birthContext.birth_datetime_iso);
  const out = [];

  rankedDomains.forEach((d) => {
    d.events.forEach((e) => {
      let date_marker = e.exact_year ?? null;
      if (date_marker == null && birthYear != null) {
        date_marker = inferPseudoYear(d.domain_key, birthYear, d.rank_score, e.event_number);
      }

      out.push({
        domain: d.domain_label,
        domain_key: d.domain_key,
        event_type: e.event_type,
        event_number: e.event_number,
        status: e.status,
        importance: e.importance,
        trigger_phase: e.trigger_phase,
        evidence_strength: e.evidence_strength,
        date_marker,
        carryover_to_present: e.carryover_to_present
      });
    });
  });

  return out.sort((a, b) => {
    const aa = a.date_marker ?? 99999;
    const bb = b.date_marker ?? 99999;
    return aa - bb;
  });
}

function buildCarryover(rankedDomains) {
  const carryover_domains = rankedDomains
    .filter((d) => d.present_carryover === "YES")
    .slice(0, 15)
    .map((d) => ({
      domain: d.domain_label,
      residual_impact: d.residual_impact
    }));

  return {
    present_carryover_detected: carryover_domains.length > 0,
    carryover_domains
  };
}

function buildValidation(rankedDomains, factAnchors) {
  const marriageDomain = rankedDomains.find((d) => d.domain_key === "MARRIAGE");
  const foreignDomain = rankedDomains.find((d) => d.domain_key === "FOREIGN");
  const settlementDomain = rankedDomains.find((d) => d.domain_key === "SETTLEMENT");

  const marriageEvents = marriageDomain?.events?.filter((e) => e.event_type === "marriage event") || [];
  const marriageCount = marriageEvents.length;
  const brokenCount = marriageEvents.filter((e) => e.status === "BROKEN").length;

  const foreignYear = foreignDomain?.events?.find((e) => e.event_type === "foreign entry event")?.exact_year ?? null;
  const settlementYear = settlementDomain?.events?.find((e) => e.event_type === "settlement event")?.exact_year ?? null;

  return {
    reality_validation_active: factAnchors.provided,
    marriage_fact_match:
      factAnchors.marriage_count_claim == null ? "NOT_PROVIDED" :
      factAnchors.marriage_count_claim === marriageCount ? "EXACT" : "CONFLICT",
    broken_marriage_fact_match:
      factAnchors.broken_marriage_claim == null ? "NOT_PROVIDED" :
      factAnchors.broken_marriage_claim === brokenCount ? "EXACT" : "CONFLICT",
    foreign_fact_match:
      factAnchors.foreign_entry_year_claim == null ? "NOT_PROVIDED" :
      factAnchors.foreign_entry_year_claim === foreignYear ? "EXACT" : "CONFLICT",
    settlement_fact_match:
      factAnchors.settlement_year_claim == null ? "NOT_PROVIDED" :
      factAnchors.settlement_year_claim === settlementYear ? "EXACT" : "CONFLICT"
  };
}

function buildVerdict(questionProfile, eventSummary, carryover, validation) {
  return {
    forensic_direction:
      `${questionProfile.primary_domain} scan shows ${eventSummary.total_major_events} major signals, ` +
      `${eventSummary.total_broken_events} broken signatures, and ` +
      `${carryover.present_carryover_detected ? "active residue" : "limited residue"}.`,
    validation_state:
      validation.marriage_fact_match === "CONFLICT" ||
      validation.foreign_fact_match === "CONFLICT" ||
      validation.settlement_fact_match === "CONFLICT"
        ? "CONFLICT_PRESENT"
        : "STABLE"
  };
}

function buildLokkotha(questionProfile, eventSummary, carryover) {
  return {
    text:
      `${questionProfile.primary_domain.toLowerCase()}-এর হিসাব সোজা পথে মেটে না; ` +
      `বড় চিহ্ন ছিল ${eventSummary.total_major_events}, ভাঙা ছিল ${eventSummary.total_broken_events}, ` +
      `আর তার ঢেউ ${carryover.present_carryover_detected ? "এখনও টিকে আছে" : "ধীরে নেমে গেছে"}.`
  };
}

function buildProjectPasteBlock({
  input,
  questionProfile,
  rankedDomains,
  eventSummary,
  masterTimeline,
  carryover,
  validation,
  verdict,
  lokkotha
}) {
  const lines = [
    "PAST UNIVERSAL NANO FORENSIC BLOCK",
    `Subject: ${input.name || "UNKNOWN"}`,
    `Primary Domain: ${questionProfile.primary_domain}`,
    `Top Domains: ${rankedDomains.slice(0, 6).map((d) => d.domain_label).join(" | ")}`,
    `Total Estimated Events: ${eventSummary.total_estimated_events}`,
    `Total Major Events: ${eventSummary.total_major_events}`,
    `Total Broken Events: ${eventSummary.total_broken_events}`,
    `Marriage Count: ${eventSummary.marriage_count}`,
    `Broken Marriage Count: ${eventSummary.broken_marriage_count}`,
    `Current Marriage Status: ${eventSummary.current_marriage_status}`,
    `Foreign Shift Count: ${eventSummary.foreign_shift_count}`,
    `Foreign Entry Year: ${eventSummary.foreign_entry_year ?? "UNKNOWN"}`,
    `Settlement Year: ${eventSummary.settlement_year ?? "UNKNOWN"}`,
    `Carryover Present: ${carryover.present_carryover_detected ? "YES" : "NO"}`,
    `Marriage Validation: ${validation.marriage_fact_match}`,
    `Broken Marriage Validation: ${validation.broken_marriage_fact_match}`,
    `Foreign Validation: ${validation.foreign_fact_match}`,
    `Settlement Validation: ${validation.settlement_fact_match}`,
    `Direction: ${verdict.forensic_direction}`,
    `Lokkotha: ${lokkotha.text}`,
    "Timeline:"
  ];

  masterTimeline.slice(0, 18).forEach((e) => {
    lines.push(`${e.domain} | #${e.event_number} | ${e.event_type} | ${e.status} | ${e.date_marker ?? "UNDATED"}`);
  });

  lines.push("PAST UNIVERSAL NANO FORENSIC BLOCK END");
  return lines.join("\n");
}

/* =====================================
   MAIN HANDLER
===================================== */

export default async function handler(req, res) {
  try {
    const q = req.query || {};

    const input = {
      name: str(q.name),
      dob: str(q.dob),
      tob: str(q.tob),
      pob: str(q.pob),
      latitude: toNum(q.latitude),
      longitude: toNum(q.longitude),
      timezone_offset: str(q.timezone_offset || "+06:00"),
      question: str(q.question),
      facts: str(q.facts),
      format: normalizeFormat(q.format),
      current_datetime_iso: str(q.current_datetime_iso)
    };

    const core = await buildChartCore(input, astroProvider);

    if (core.system_status !== "OK") {
      return res.status(400).json({
        engine_status: "PAST_ORACLE_UNIVERSAL_HARDENED_FINAL",
        system_status: "INPUT_ERROR",
        details: core
      });
    }

    const factAnchors = parseFactAnchors(input.facts, input.question);
    const questionProfile = buildQuestionProfile(input.question);
    const linkedExpansion = expandLinkedDomains(questionProfile.primary_domain);
    const evidence = normalizeEvidence(core.evidence_packet);

    const domainResults = runUniversalNanoScanner({
      input,
      core,
      evidence,
      factAnchors,
      questionProfile,
      linkedExpansion
    });

    const rankedDomains = rankDomains(domainResults, linkedExpansion, questionProfile);
    const eventSummary = buildEventSummary(rankedDomains);
    const masterTimeline = buildMasterTimeline(rankedDomains, core.birth_context);
    const carryover = buildCarryover(rankedDomains);
    const validation = buildValidation(rankedDomains, factAnchors);
    const verdict = buildVerdict(questionProfile, eventSummary, carryover, validation);
    const lokkotha = buildLokkotha(questionProfile, eventSummary, carryover);
    const projectPasteBlock = buildProjectPasteBlock({
      input,
      questionProfile,
      rankedDomains,
      eventSummary,
      masterTimeline,
      carryover,
      validation,
      verdict,
      lokkotha
    });

    const payload = {
      engine_status: "PAST_ORACLE_UNIVERSAL_HARDENED_FINAL",
      system_status: "OK",
      mode: core.mode,
      input_normalized: core.input_normalized,
      birth_context: core.birth_context,
      current_context: core.current_context,
      fact_anchor_block: factAnchors,
      question_profile: questionProfile,
      linked_domain_expansion: linkedExpansion,
      evidence_normalized: evidence.meta,
      top_ranked_domains: rankedDomains.slice(0, 12).map(minifyDomain),
      domain_results: rankedDomains,
      event_summary: eventSummary,
      master_timeline: masterTimeline,
      current_carryover: carryover,
      validation_block: validation,
      forensic_verdict: verdict,
      lokkotha_summary: lokkotha,
      project_paste_block: projectPasteBlock
    };

    if (input.format === "project") {
      return res.status(200).json({
        engine_status: "PAST_ORACLE_UNIVERSAL_HARDENED_FINAL",
        output_format: "project",
        project_paste_block: projectPasteBlock
      });
    }

    if (input.format === "compact") {
      return res.status(200).json({
        engine_status: "PAST_ORACLE_UNIVERSAL_HARDENED_FINAL",
        output_format: "compact",
        summary: {
          primary_domain: questionProfile.primary_domain,
          total_events: eventSummary.total_estimated_events,
          top_domains: rankedDomains.slice(0, 5).map((d) => d.domain_label),
          marriage_count: eventSummary.marriage_count,
          broken_marriage_count: eventSummary.broken_marriage_count,
          current_marriage_status: eventSummary.current_marriage_status,
          foreign_shift_count: eventSummary.foreign_shift_count,
          settlement_year: eventSummary.settlement_year,
          current_carryover: carryover.present_carryover_detected
        },
        verdict,
        lokkotha_summary: lokkotha
      });
    }

    return res.status(200).json(payload);
  } catch (error) {
    return res.status(500).json({
      engine_status: "PAST_ORACLE_UNIVERSAL_HARDENED_FINAL",
      system_status: "ERROR",
      error_message: error instanceof Error ? error.message : "Unknown error"
    });
  }
}