// api/past-oracle.js
import { buildChartCore } from "../lib/chart-core.js";
import { astroProvider } from "../lib/provider-adapter.js";

/* =========================================
   BASIC HELPERS
========================================= */

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

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const norm360 = (x) => {
  let v = Number(x || 0) % 360;
  if (v < 0) v += 360;
  return v;
};

function signToIndex(sign) {
  const signs = [
    "Aries","Taurus","Gemini","Cancer","Leo","Virgo",
    "Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"
  ];
  return signs.indexOf(sign);
}

function houseDistance(fromHouse, toHouse) {
  return ((toHouse - fromHouse + 12) % 12) + 1;
}

function parseYear(text) {
  const m = text.match(/\b(19|20)\d{2}\b/);
  return m ? Number(m[0]) : null;
}

function extractAllYears(text) {
  return [...text.matchAll(/\b(19|20)\d{2}\b/g)].map((m) => Number(m[0]));
}

function extractCount(text) {
  const map = {
    one: 1, two: 2, three: 3, four: 4, five: 5,
    ek: 1, ekta: 1, onee: 1,
    dui: 2, duita: 2,
    tin: 3, tinta: 3,
    char: 4, charta: 4,
    pach: 5, pachta: 5
  };

  for (const [k, v] of Object.entries(map)) {
    if (text.includes(k)) return v;
  }

  const m = text.match(/\b([1-9])\b/);
  return m ? Number(m[1]) : null;
}

function hasAny(text, arr) {
  return arr.some((x) => text.includes(x));
}

/* =========================================
   MAIN
========================================= */

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
        engine_status: "PAST_ORACLE_NANO_V1",
        system_status: "INPUT_ERROR",
        details: core
      });
    }

    const factAnchors = parseFactAnchors(input.facts, input.question);
    const evidence = normalizeEvidence(core.evidence_packet);
    const questionProfile = buildQuestionProfile(input.question);

    const domainResults = runFullNanoScanner({
      input,
      core,
      evidence,
      factAnchors,
      questionProfile
    });

    const linkedExpansion = expandLinkedDomains(questionProfile.primary_domain);
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
      engine_status: "PAST_ORACLE_NANO_V1",
      system_status: "OK",
      mode: "FULL_NANO_SCANNER",
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
        engine_status: "PAST_ORACLE_NANO_V1",
        output_format: "project",
        project_paste_block: projectPasteBlock
      });
    }

    if (input.format === "compact") {
      return res.status(200).json({
        engine_status: "PAST_ORACLE_NANO_V1",
        output_format: "compact",
        summary: {
          primary_domain: questionProfile.primary_domain,
          total_events: eventSummary.total_estimated_events,
          top_domains: rankedDomains.slice(0, 5).map((d) => d.domain_label),
          marriage_count: eventSummary.marriage_count,
          foreign_shift_count: eventSummary.foreign_shift_count,
          current_carryover: carryover.present_carryover_detected
        },
        verdict,
        lokkotha_summary: lokkotha
      });
    }

    return res.status(200).json(payload);
  } catch (error) {
    return res.status(500).json({
      engine_status: "PAST_ORACLE_NANO_V1",
      system_status: "ERROR",
      error_message: error instanceof Error ? error.message : "Unknown error"
    });
  }
}

/* =========================================
   QUESTION / FACT PROFILE
========================================= */

function parseFactAnchors(facts, question) {
  const text = `${facts || ""} ${question || ""}`.toLowerCase();

  return {
    provided: !!(facts || question),
    raw_text: text,
    marriage_count_claim: hasAny(text, ["marriage", "married", "bea"]) ? extractCount(text) : null,
    broken_marriage_claim: hasAny(text, ["broken", "divorce", "separation", "broke", "veng", "venge"]) ? extractCount(text) : null,
    foreign_entry_year_claim: hasAny(text, ["uk", "foreign", "abroad", "came", "arrived", "entry"]) ? parseYear(text) : null,
    settlement_year_claim: hasAny(text, ["settlement", "stable", "stabil", "base"]) ? parseYear(text) : null,
    all_years: extractAllYears(text)
  };
}

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
    asks_count:
      hasAny(q, ["koita", "how many", "count", "number"]) ||
      hasAny(q, ["kobe", "when", "timeline", "history"]),
    asks_timing: hasAny(q, ["when", "kobe", "date", "year", "history", "timeline"]),
    asks_status: hasAny(q, ["current", "now", "status", "ase", "active"]),
    asks_general: primary_domain === "GENERAL"
  };
}

function expandLinkedDomains(primary) {
  const map = {
    MARRIAGE: ["MARRIAGE", "RELATIONSHIP", "CHILDREN", "BREAK", "LEGAL", "FAMILY"],
    RELATIONSHIP: ["RELATIONSHIP", "MARRIAGE", "BREAK", "CHILDREN", "FAMILY"],
    CAREER: ["CAREER", "MONEY", "GAIN", "FAILURE", "REPUTATION", "LEGAL"],
    MONEY: ["MONEY", "CAREER", "GAIN", "LOSS", "DEBT", "LEGAL"],
    FOREIGN: ["FOREIGN", "PROPERTY", "CAREER", "LOSS", "LEGAL", "REPUTATION"],
    HEALTH: ["HEALTH", "ACCIDENT", "MENTAL", "RECOVERY", "LOSS"],
    PROPERTY: ["PROPERTY", "FOREIGN", "MONEY", "FAMILY", "LEGAL"],
    LEGAL: ["LEGAL", "CAREER", "MONEY", "REPUTATION", "ENEMY"],
    CHILDREN: ["CHILDREN", "MARRIAGE", "RELATIONSHIP", "FAMILY"],
    GENERAL: [
      "IDENTITY","MIND","COMMUNICATION","FAMILY","HOME","LOVE","CHILDREN","HEALTH",
      "MARRIAGE","SEX","TRANSFORMATION","FOREIGN","RELIGION","CAREER","GAIN","LOSS",
      "DEBT","LEGAL","ENEMY","FRIEND","NETWORK","REPUTATION","POWER","AUTHORITY",
      "BUSINESS","JOB","PARTNERSHIP","DIVORCE","MULTIPLE_MARRIAGE","TRAVEL_SHORT",
      "TRAVEL_LONG","SETTLEMENT","CITIZENSHIP","ACCIDENT","SURGERY","DISEASE","RECOVERY",
      "MENTAL","SPIRITUAL","TANTRIC","BLOCKAGE","SUCCESS","FAILURE","DELAY","SUDDEN_GAIN",
      "SUDDEN_LOSS","FAME","SCANDAL","DOCUMENT","VISA","IMMIGRATION","PROPERTY","VEHICLE"
    ]
  };

  return map[primary] || map.GENERAL;
}

/* =========================================
   EVIDENCE NORMALIZATION
========================================= */

function normalizeEvidence(packet) {
  const natalPlanets = packet?.natal?.planets || [];
  const transitPlanets = packet?.transit_now?.planets || [];
  const aspects = packet?.natal?.aspects || [];
  const asc = packet?.natal?.ascendant || null;
  const wholeSignHouses = packet?.natal?.houses_whole_sign || null;

  const natalMap = {};
  natalPlanets.forEach((p) => {
    natalMap[(p.planet || "").toUpperCase()] = p;
  });

  const transitMap = {};
  transitPlanets.forEach((p) => {
    transitMap[(p.planet || "").toUpperCase()] = p;
  });

  const housesByPlanet = {};
  if (asc && wholeSignHouses) {
    const ascSignIndex = signToIndex(asc.sign);
    natalPlanets.forEach((p) => {
      const pSignIndex = signToIndex(p.sign);
      if (ascSignIndex >= 0 && pSignIndex >= 0) {
        const house = ((pSignIndex - ascSignIndex + 12) % 12) + 1;
        housesByPlanet[(p.planet || "").toUpperCase()] = house;
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

/* =========================================
   FULL 50+ DOMAIN NANO SCANNER
========================================= */

const DOMAIN_REGISTRY = [
  ["IDENTITY","Identity / Self / Direction",[1]],
  ["MIND","Mind / Emotion / Response",[4,5]],
  ["COMMUNICATION","Communication / Effort / Siblings",[3]],
  ["FAMILY","Family / Wealth / Speech",[2]],
  ["HOME","Home / Mother / Base",[4]],
  ["LOVE","Love / Romance / Attachment",[5,7]],
  ["CHILDREN","Children / Creativity / Continuity",[5]],
  ["HEALTH","Health / Disease / Stress",[6,8,12]],
  ["MARRIAGE","Marriage / Partnership",[7,2,8]],
  ["SEX","Intimacy / Hidden Bonding",[8]],
  ["TRANSFORMATION","Transformation / Break / Shock",[8]],
  ["FOREIGN","Foreign / Distance / Withdrawal",[9,12,4]],
  ["RELIGION","Religion / Dharma / Belief",[9]],
  ["CAREER","Career / Authority / Public Role",[10,6]],
  ["GAIN","Gain / Network / Fulfilment",[11]],
  ["LOSS","Loss / Isolation / Exit",[12]],
  ["DEBT","Debt / Liability / Pressure",[6,8]],
  ["LEGAL","Legal / Penalty / Authority",[6,7,10]],
  ["ENEMY","Opponent / Conflict / Resistance",[6]],
  ["FRIEND","Friend / Support / Ally",[11]],
  ["NETWORK","Network / Circle / Access",[11,3]],
  ["REPUTATION","Reputation / Visibility / Name",[10,11]],
  ["POWER","Power / Control / Command",[10,8]],
  ["AUTHORITY","Authority / State / Structure",[10,6]],
  ["BUSINESS","Business / Trade / Deal",[7,10,11]],
  ["JOB","Job / Service / Employment",[6,10]],
  ["PARTNERSHIP","Partnership / Contract",[7,11]],
  ["DIVORCE","Separation / Divorce / Break",[7,8,6]],
  ["MULTIPLE_MARRIAGE","Repeated union patterns",[7,8,2]],
  ["TRAVEL_SHORT","Short travel / movement",[3,9]],
  ["TRAVEL_LONG","Long travel / distance",[9,12]],
  ["SETTLEMENT","Settlement / base formation",[4,12,10]],
  ["CITIZENSHIP","Status / permanence / recognition",[9,10,11]],
  ["ACCIDENT","Accident / abrupt injury",[8,6]],
  ["SURGERY","Surgery / invasive event",[8,6]],
  ["DISEASE","Disease / recurring illness",[6,8,12]],
  ["RECOVERY","Recovery / healing phase",[6,11]],
  ["MENTAL","Mental pressure / fear / overdrive",[1,4,8]],
  ["SPIRITUAL","Spiritual turning / withdrawal",[9,12,8]],
  ["TANTRIC","Occult / hidden / ritual sensitivity",[8,12]],
  ["BLOCKAGE","Block / delay / obstruction",[6,8,12,10]],
  ["SUCCESS","Success / rise / execution",[10,11,5]],
  ["FAILURE","Failure / collapse / miss",[8,6,12]],
  ["DELAY","Delay / late materialisation",[6,10,12]],
  ["SUDDEN_GAIN","Sudden gain / windfall",[8,11]],
  ["SUDDEN_LOSS","Sudden loss / drop",[8,12,2]],
  ["FAME","Fame / larger visibility",[10,11,5]],
  ["SCANDAL","Scandal / exposure / damage",[8,10,6]],
  ["DOCUMENT","Documents / records / paperwork",[3,6,10]],
  ["VISA","Visa / permission / external clearance",[9,12,10]],
  ["IMMIGRATION","Immigration / relocation path",[9,12,4,10]],
  ["PROPERTY","Property / residence / land",[4,11,2]],
  ["VEHICLE","Vehicle / transport asset",[4,3]]
];

function runFullNanoScanner(ctx) {
  return DOMAIN_REGISTRY.map(([key, label, houses]) =>
    scanSingleDomain(key, label, houses, ctx)
  );
}

function scanSingleDomain(domainKey, domainLabel, targetHouses, ctx) {
  const { evidence, factAnchors } = ctx;

  const planetScores = [];
  const houseHits = [];
  const relevantAspects = [];

  const benefics = ["JUPITER", "VENUS", "MOON", "MERCURY"];
  const malefics = ["SATURN", "MARS", "RAHU", "KETU", "SUN"];

  for (const [planetName, houseNum] of Object.entries(evidence.housesByPlanet || {})) {
    if (targetHouses.includes(houseNum)) {
      houseHits.push({ planet: planetName, house: houseNum });

      let weight = 1;
      if (benefics.includes(planetName)) weight += 0.7;
      if (malefics.includes(planetName)) weight += 0.9;

      planetScores.push({
        planet: planetName,
        house: houseNum,
        weight
      });
    }
  }

  for (const asp of evidence.aspects || []) {
    const p1 = String(asp.planet1 || "").toUpperCase();
    const p2 = String(asp.planet2 || "").toUpperCase();
    const h1 = evidence.housesByPlanet[p1];
    const h2 = evidence.housesByPlanet[p2];

    if (targetHouses.includes(h1) || targetHouses.includes(h2)) {
      relevantAspects.push({
        planet1: p1,
        planet2: p2,
        type: asp.type,
        orb_gap: asp.orb_gap
      });
    }
  }

  const rawScore =
    planetScores.reduce((a, b) => a + b.weight, 0) +
    relevantAspects.length * 0.55 +
    targetHouses.length * 0.25;

  const normalizedScore = round2(clamp(rawScore, 0, 10));

  let density = "LOW";
  if (normalizedScore >= 7) density = "HIGH";
  else if (normalizedScore >= 4) density = "MED";

  const presentCarryover = normalizedScore >= 4;
  const residualImpact =
    normalizedScore >= 7 ? "HIGH" :
    normalizedScore >= 4 ? "MED" : "LOW";

  const domainEvents = inferDomainEvents(
    domainKey,
    normalizedScore,
    houseHits,
    relevantAspects,
    factAnchors
  );

  return {
    domain_key: domainKey,
    domain_label: domainLabel,
    target_houses: targetHouses,
    density,
    normalized_score: normalizedScore,
    residual_impact: residualImpact,
    present_carryover: presentCarryover ? "YES" : "NO",
    house_hits: houseHits,
    aspect_hits: relevantAspects,
    major_event_count: domainEvents.filter((e) => e.importance === "MAJOR").length,
    minor_event_count: domainEvents.filter((e) => e.importance === "MINOR").length,
    broken_event_count: domainEvents.filter((e) => e.status === "BROKEN").length,
    active_event_count: domainEvents.filter((e) => e.status === "ACTIVE" || e.status === "STABILISING").length,
    events: domainEvents
  };
}

function inferDomainEvents(domainKey, score, houseHits, aspectHits, factAnchors) {
  const events = [];

  const strengthLabel =
    score >= 7 ? "strong" :
    score >= 4 ? "moderate" : "light";

  if (domainKey === "MARRIAGE") {
    const count = factAnchors.marriage_count_claim ?? (score >= 7 ? 2 : 1);
    const broken = factAnchors.broken_marriage_claim ?? (count > 1 ? 1 : 0);

    for (let i = 0; i < count; i += 1) {
      const isBroken = i < broken;
      events.push({
        event_type: "marriage event",
        event_number: i + 1,
        evidence_strength: strengthLabel,
        status: isBroken ? "BROKEN" : i === count - 1 ? "STABILISING" : "EXECUTED",
        importance: "MAJOR",
        trigger_phase: isBroken ? "union then break" : "union then continuation",
        carryover_to_present: isBroken ? "NO" : "YES"
      });
    }
    return events;
  }

  if (domainKey === "FOREIGN") {
    if (factAnchors.foreign_entry_year_claim) {
      events.push({
        event_type: "foreign entry event",
        event_number: 1,
        exact_year: factAnchors.foreign_entry_year_claim,
        evidence_strength: strengthLabel,
        status: "EXECUTED",
        importance: "MAJOR",
        trigger_phase: "foreign movement",
        carryover_to_present: "NO"
      });
    } else if (score >= 4) {
      events.push({
        event_type: "foreign shift signature",
        event_number: 1,
        evidence_strength: strengthLabel,
        status: "LIKELY",
        importance: "MAJOR",
        trigger_phase: "distance / separation pattern",
        carryover_to_present: "NO"
      });
    }

    if (factAnchors.settlement_year_claim) {
      events.push({
        event_type: "foreign settlement event",
        event_number: 2,
        exact_year: factAnchors.settlement_year_claim,
        evidence_strength: strengthLabel,
        status: "STABILISING",
        importance: "MAJOR",
        trigger_phase: "base formation",
        carryover_to_present: "YES"
      });
    }

    return events;
  }

  if (domainKey === "CAREER") {
    if (score >= 7) {
      events.push(
        {
          event_type: "career establishment phase",
          event_number: 1,
          evidence_strength: strengthLabel,
          status: "EXECUTED",
          importance: "MAJOR",
          trigger_phase: "public role opening",
          carryover_to_present: "NO"
        },
        {
          event_type: "career restructuring phase",
          event_number: 2,
          evidence_strength: strengthLabel,
          status: "ACTIVE",
          importance: "MAJOR",
          trigger_phase: "authority / work re-ordering",
          carryover_to_present: "YES"
        }
      );
    } else if (score >= 4) {
      events.push({
        event_type: "career activity phase",
        event_number: 1,
        evidence_strength: strengthLabel,
        status: "ACTIVE",
        importance: "MAJOR",
        trigger_phase: "work/service engagement",
        carryover_to_present: "YES"
      });
    }
    return events;
  }

  if (domainKey === "HEALTH") {
    if (score >= 7) {
      events.push(
        {
          event_type: "major stress / weakness phase",
          event_number: 1,
          evidence_strength: strengthLabel,
          status: "EXECUTED",
          importance: "MAJOR",
          trigger_phase: "health strain",
          carryover_to_present: "NO"
        },
        {
          event_type: "recurring health residue",
          event_number: 2,
          evidence_strength: strengthLabel,
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
        evidence_strength: strengthLabel,
        status: "RESIDUAL",
        importance: "MAJOR",
        trigger_phase: "strain / imbalance",
        carryover_to_present: "YES"
      });
    }
    return events;
  }

  if (domainKey === "MONEY") {
    if (score >= 7) {
      events.push(
        {
          event_type: "cash pressure / debt cycle",
          event_number: 1,
          evidence_strength: strengthLabel,
          status: "EXECUTED",
          importance: "MAJOR",
          trigger_phase: "financial compression",
          carryover_to_present: "NO"
        },
        {
          event_type: "income recovery phase",
          event_number: 2,
          evidence_strength: strengthLabel,
          status: "STABILISING",
          importance: "MAJOR",
          trigger_phase: "money recovery",
          carryover_to_present: "YES"
        }
      );
    } else if (score >= 4) {
      events.push({
        event_type: "money movement signature",
        event_number: 1,
        evidence_strength: strengthLabel,
        status: "ACTIVE",
        importance: "MAJOR",
        trigger_phase: "financial motion",
        carryover_to_present: "YES"
      });
    }
    return events;
  }

  if (domainKey === "RELATIONSHIP") {
    if (score >= 4) {
      events.push({
        event_type: "unstable relational loop",
        event_number: 1,
        evidence_strength: strengthLabel,
        status: score >= 7 ? "BROKEN" : "RESIDUAL",
        importance: "MAJOR",
        trigger_phase: "emotional complexity",
        carryover_to_present: "YES"
      });
    }
    return events;
  }

  if (domainKey === "BREAK" || domainKey === "TRANSFORMATION" || domainKey === "DIVORCE") {
    if (score >= 4) {
      events.push({
        event_type: "break / shock phase",
        event_number: 1,
        evidence_strength: strengthLabel,
        status: "BROKEN",
        importance: "MAJOR",
        trigger_phase: "shock / rupture",
        carryover_to_present: "YES"
      });
    }
    return events;
  }

  if (score >= 7) {
    events.push({
      event_type: `${domainKey.toLowerCase()} major activation`,
      event_number: 1,
      evidence_strength: strengthLabel,
      status: "EXECUTED",
      importance: "MAJOR",
      trigger_phase: "domain activation",
      carryover_to_present: "NO"
    });
    events.push({
      event_type: `${domainKey.toLowerCase()} continuing residue`,
      event_number: 2,
      evidence_strength: strengthLabel,
      status: "ACTIVE",
      importance: "MINOR",
      trigger_phase: "continued influence",
      carryover_to_present: "YES"
    });
  } else if (score >= 4) {
    events.push({
      event_type: `${domainKey.toLowerCase()} signature`,
      event_number: 1,
      evidence_strength: strengthLabel,
      status: "RESIDUAL",
      importance: "MINOR",
      trigger_phase: "moderate activation",
      carryover_to_present: "YES"
    });
  }

  return events;
}

/* =========================================
   RANK / TIMELINE / SUMMARY
========================================= */

function rankDomains(domainResults, linkedExpansion, questionProfile) {
  return domainResults
    .map((d) => {
      let rankBoost = 0;
      if (linkedExpansion.includes(d.domain_key)) rankBoost += 3;
      if (d.domain_key === questionProfile.primary_domain) rankBoost += 5;
      return {
        ...d,
        rank_score: round2(d.normalized_score + rankBoost)
      };
    })
    .sort((a, b) => b.rank_score - a.rank_score);
}

function buildEventSummary(rankedDomains) {
  const marriageDomain = rankedDomains.find((d) => d.domain_key === "MARRIAGE");
  const foreignDomain = rankedDomains.find((d) => d.domain_key === "FOREIGN");

  return {
    total_estimated_events: rankedDomains.reduce((a, b) => a + b.events.length, 0),
    total_major_events: rankedDomains.reduce((a, b) => a + b.major_event_count, 0),
    total_minor_events: rankedDomains.reduce((a, b) => a + b.minor_event_count, 0),
    total_broken_events: rankedDomains.reduce((a, b) => a + b.broken_event_count, 0),
    total_active_events: rankedDomains.reduce((a, b) => a + b.active_event_count, 0),
    marriage_count: marriageDomain ? marriageDomain.events.filter((e) => e.event_type === "marriage event").length : 0,
    broken_marriage_count: marriageDomain ? marriageDomain.events.filter((e) => e.status === "BROKEN").length : 0,
    foreign_shift_count: foreignDomain ? foreignDomain.events.length : 0,
    top_5_domains: rankedDomains.slice(0, 5).map((d) => d.domain_label)
  };
}

function buildMasterTimeline(rankedDomains, birthContext) {
  const birthYear = safeBirthYear(birthContext.birth_datetime_iso);
  const out = [];

  rankedDomains.forEach((d) => {
    d.events.forEach((e) => {
      let date_marker = e.exact_year || null;

      if (!date_marker && birthYear) {
        const pseudoYear = inferPseudoYearFromRank(birthYear, d.rank_score, e.event_number);
        date_marker = pseudoYear;
      }

      out.push({
        domain: d.domain_label,
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
    const aa = a.date_marker || 99999;
    const bb = b.date_marker || 99999;
    return aa - bb;
  });
}

function safeBirthYear(birthIso) {
  if (!birthIso) return null;
  const d = new Date(birthIso);
  return Number.isNaN(d.getTime()) ? null : d.getUTCFullYear();
}

function inferPseudoYearFromRank(birthYear, rankScore, eventNumber) {
  const offset = Math.floor(rankScore * 1.7) + eventNumber * 2;
  return birthYear + offset;
}

function buildCarryover(rankedDomains) {
  const carryoverDomains = rankedDomains
    .filter((d) => d.present_carryover === "YES")
    .slice(0, 12)
    .map((d) => ({
      domain: d.domain_label,
      residual_impact: d.residual_impact
    }));

  return {
    present_carryover_detected: carryoverDomains.length > 0,
    carryover_domains: carryoverDomains
  };
}

function buildValidation(rankedDomains, factAnchors) {
  const marriageDomain = rankedDomains.find((d) => d.domain_key === "MARRIAGE");
  const foreignDomain = rankedDomains.find((d) => d.domain_key === "FOREIGN");

  const marriageCount = marriageDomain
    ? marriageDomain.events.filter((e) => e.event_type === "marriage event").length
    : 0;

  const brokenCount = marriageDomain
    ? marriageDomain.events.filter((e) => e.status === "BROKEN").length
    : 0;

  const foreignEntry = foreignDomain?.events?.find((e) => e.event_type === "foreign entry event")?.exact_year ?? null;
  const settlementYear = foreignDomain?.events?.find((e) => e.event_type === "foreign settlement event")?.exact_year ?? null;

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
      factAnchors.foreign_entry_year_claim === foreignEntry ? "EXACT" : "CONFLICT",
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
      ["CONFLICT"].includes(validation.marriage_fact_match) ||
      ["CONFLICT"].includes(validation.foreign_fact_match) ||
      ["CONFLICT"].includes(validation.settlement_fact_match)
        ? "CONFLICT_PRESENT"
        : "STABLE"
  };
}

function buildLokkotha(questionProfile, eventSummary, carryover) {
  return {
    text:
      `${questionProfile.primary_domain.toLowerCase()}-এর জবাব সোজা পথে আসে না; ` +
      `বড় চিহ্ন ছিল ${eventSummary.total_major_events}, ভাঙা ছিল ${eventSummary.total_broken_events}, ` +
      `আর তার ঢেউ ${carryover.present_carryover_detected ? "এখনও আছে" : "ধীরে নেমে গেছে"}.`
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
    "PAST NANO FORENSIC PROJECT BLOCK",
    `Subject: ${input.name || "UNKNOWN"}`,
    `Primary Domain: ${questionProfile.primary_domain}`,
    `Top Domains: ${rankedDomains.slice(0, 6).map((d) => d.domain_label).join(" | ")}`,
    `Total Estimated Events: ${eventSummary.total_estimated_events}`,
    `Total Major Events: ${eventSummary.total_major_events}`,
    `Total Broken Events: ${eventSummary.total_broken_events}`,
    `Marriage Count: ${eventSummary.marriage_count}`,
    `Broken Marriage Count: ${eventSummary.broken_marriage_count}`,
    `Foreign Shift Count: ${eventSummary.foreign_shift_count}`,
    `Carryover Present: ${carryover.present_carryover_detected ? "YES" : "NO"}`,
    `Marriage Validation: ${validation.marriage_fact_match}`,
    `Broken Marriage Validation: ${validation.broken_marriage_fact_match}`,
    `Foreign Validation: ${validation.foreign_fact_match}`,
    `Settlement Validation: ${validation.settlement_fact_match}`,
    `Direction: ${verdict.forensic_direction}`,
    `Lokkotha: ${lokkotha.text}`,
    "Timeline:"
  ];

  masterTimeline.slice(0, 15).forEach((e) => {
    lines.push(
      `${e.domain} | #${e.event_number} | ${e.event_type} | ${e.status} | ${e.date_marker ?? "UNDATED"}`
    );
  });

  lines.push("PAST NANO FORENSIC BLOCK END");
  return lines.join("\n");
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