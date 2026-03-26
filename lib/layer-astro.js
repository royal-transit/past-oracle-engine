// lib/layer-astro.js

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

const CORE_MAJOR_DOMAINS = new Set([
  "MARRIAGE",
  "DIVORCE",
  "FOREIGN",
  "SETTLEMENT",
  "IMMIGRATION",
  "CAREER",
  "JOB",
  "BUSINESS",
  "HEALTH",
  "MENTAL",
  "PROPERTY",
  "HOME",
  "LEGAL",
  "DOCUMENT",
  "DEBT"
]);

const NOISY_DOMAINS = new Set([
  "NETWORK",
  "TRAVEL_SHORT",
  "TRAVEL_LONG",
  "COMMUNICATION",
  "POWER",
  "FAME",
  "SCANDAL",
  "SUCCESS",
  "REPUTATION",
  "AUTHORITY",
  "CITIZENSHIP",
  "FRIEND",
  "ENEMY",
  "SUDDEN_GAIN",
  "SUDDEN_LOSS",
  "GAIN",
  "LOSS",
  "RELIGION",
  "SPIRITUAL",
  "TANTRIC",
  "SEX",
  "TRANSFORMATION"
]);

function inferEvents(domainKey, score, facts, questionProfile) {
  const events = [];
  const strength = score >= 8 ? "strong" : score >= 5 ? "moderate" : "light";

  const allowMajor =
    CORE_MAJOR_DOMAINS.has(domainKey) ||
    domainKey === questionProfile.primary_domain ||
    (questionProfile.primary_domain !== "GENERAL" &&
      !NOISY_DOMAINS.has(domainKey));

  if (domainKey === "MARRIAGE") {
    const total = facts.marriage_count_claim ?? 0;
    const broken = Math.min(
      facts.broken_marriage_claim ?? Math.max(0, total - 1),
      total
    );
    const activeCount = Math.max(0, total - broken);

    for (let i = 0; i < total; i += 1) {
      const isBroken = i < broken;
      const isCurrent = !isBroken && i === total - 1 && activeCount > 0;

      events.push({
        event_type: "marriage event",
        event_number: i + 1,
        evidence_strength: "strong",
        status: isBroken ? "BROKEN" : isCurrent ? "STABILISING" : "EXECUTED",
        importance: "MAJOR",
        trigger_phase: isBroken ? "union then break" : "union then continuation",
        carryover_to_present: isBroken ? "NO" : "YES"
      });
    }
    return events;
  }

  if (domainKey === "DIVORCE") {
    const broken = facts.broken_marriage_claim ?? 0;
    for (let i = 0; i < broken; i += 1) {
      events.push({
        event_type: "separation / divorce event",
        event_number: i + 1,
        evidence_strength: "strong",
        status: "BROKEN",
        importance: "MAJOR",
        trigger_phase: "rupture / severance",
        carryover_to_present: i === broken - 1 ? "YES" : "NO"
      });
    }
    return events;
  }

  if (domainKey === "FOREIGN" && facts.foreign_entry_year_claim != null) {
    events.push({
      event_type: "foreign entry event",
      event_number: 1,
      exact_year: facts.foreign_entry_year_claim,
      evidence_strength: "strong",
      status: "EXECUTED",
      importance: "MAJOR",
      trigger_phase: "movement / foreign entry",
      carryover_to_present: "NO"
    });
    return events;
  }

  if (domainKey === "SETTLEMENT" && facts.settlement_year_claim != null) {
    events.push({
      event_type: "settlement event",
      event_number: 1,
      exact_year: facts.settlement_year_claim,
      evidence_strength: "strong",
      status: "STABILISING",
      importance: "MAJOR",
      trigger_phase: "base consolidation",
      carryover_to_present: "YES"
    });
    return events;
  }

  if (
    domainKey === "IMMIGRATION" &&
    (facts.foreign_entry_year_claim != null ||
      facts.settlement_year_claim != null)
  ) {
    events.push({
      event_type: "documentation / approval event",
      event_number: 1,
      exact_year:
        facts.settlement_year_claim ?? facts.foreign_entry_year_claim ?? null,
      evidence_strength: score >= 6 ? "strong" : "moderate",
      status: score >= 6 ? "EXECUTED" : "PARTIAL",
      importance: "MAJOR",
      trigger_phase: "paperwork / authority clearance",
      carryover_to_present: score >= 6 ? "NO" : "YES"
    });
    return events;
  }

  if (
    (domainKey === "PROPERTY" || domainKey === "HOME") &&
    (facts.foreign_entry_year_claim != null ||
      facts.settlement_year_claim != null)
  ) {
    events.push({
      event_type: "property / base / asset event",
      event_number: 1,
      exact_year:
        facts.settlement_year_claim ?? facts.foreign_entry_year_claim ?? null,
      evidence_strength: score >= 6 ? "strong" : "moderate",
      status: score >= 6 ? "EXECUTED" : "ACTIVE",
      importance: "MAJOR",
      trigger_phase: "base / asset / movement",
      carryover_to_present: "YES"
    });
    return events;
  }

  if (domainKey === "MENTAL" && score >= 6) {
    events.push(
      {
        event_type: "major stress / weakness phase",
        event_number: 1,
        evidence_strength: "strong",
        status: "EXECUTED",
        importance: "MAJOR",
        trigger_phase: "health strain",
        carryover_to_present: "NO"
      },
      {
        event_type: "recurring residue phase",
        event_number: 2,
        evidence_strength: "strong",
        status: "ACTIVE",
        importance: "MAJOR",
        trigger_phase: "repeat vulnerability",
        carryover_to_present: "YES"
      }
    );
    return events;
  }

  if (
    (domainKey === "HEALTH" ||
      domainKey === "DISEASE" ||
      domainKey === "RECOVERY") &&
    score >= 7 &&
    allowMajor
  ) {
    events.push({
      event_type: "health pressure phase",
      event_number: 1,
      evidence_strength: strength,
      status: "RESIDUAL",
      importance: "MAJOR",
      trigger_phase: "imbalance / recovery cycle",
      carryover_to_present: "YES"
    });
    return events;
  }

  if (
    (domainKey === "CAREER" ||
      domainKey === "JOB" ||
      domainKey === "BUSINESS") &&
    score >= 7 &&
    allowMajor
  ) {
    events.push({
      event_type:
        domainKey === "BUSINESS"
          ? "business activity phase"
          : "career activity phase",
      event_number: 1,
      evidence_strength: strength,
      status: "ACTIVE",
      importance: "MAJOR",
      trigger_phase: "work engagement",
      carryover_to_present: "YES"
    });
    return events;
  }

  if (domainKey === "DEBT" && score >= 7 && allowMajor) {
    events.push({
      event_type: "financial pressure phase",
      event_number: 1,
      evidence_strength: strength,
      status: "RESIDUAL",
      importance: "MAJOR",
      trigger_phase: "debt / pressure cycle",
      carryover_to_present: "YES"
    });
    return events;
  }

  if (domainKey === "DOCUMENT" && score >= 7) {
    events.push({
      event_type: "documentation / approval event",
      event_number: 1,
      exact_year:
        facts.settlement_year_claim ?? facts.foreign_entry_year_claim ?? null,
      evidence_strength: strength,
      status: "EXECUTED",
      importance: "MAJOR",
      trigger_phase: "paperwork / authority clearance",
      carryover_to_present: "NO"
    });
    return events;
  }

  if (
    (domainKey === "LEGAL" || domainKey === "VISA") &&
    score >= 7 &&
    allowMajor
  ) {
    events.push({
      event_type: "legal / documentation signature",
      event_number: 1,
      evidence_strength: strength,
      status: "RESIDUAL",
      importance: "MINOR",
      trigger_phase: "paperwork / authority motion",
      carryover_to_present: "YES"
    });
    return events;
  }

  if (domainKey === "MULTIPLE_MARRIAGE" && (facts.marriage_count_claim ?? 0) >= 2) {
    events.push({
      event_type: "repeated union pattern",
      event_number: 1,
      evidence_strength: "strong",
      status: "RESIDUAL",
      importance: "MINOR",
      trigger_phase: "multiple union pattern",
      carryover_to_present: "YES"
    });
    return events;
  }

  if (!allowMajor) {
    if (score >= 8 && !NOISY_DOMAINS.has(domainKey)) {
      events.push({
        event_type: `${domainKey.toLowerCase()} signature`,
        event_number: 1,
        evidence_strength: strength,
        status: "RESIDUAL",
        importance: "MINOR",
        trigger_phase: "domain signature",
        carryover_to_present: "YES"
      });
    }
    return events;
  }

  if (score >= 8 && !NOISY_DOMAINS.has(domainKey)) {
    events.push({
      event_type: `${domainKey.toLowerCase()} signature`,
      event_number: 1,
      evidence_strength: strength,
      status: "RESIDUAL",
      importance: "MINOR",
      trigger_phase: "domain signature",
      carryover_to_present: "YES"
    });
  }

  return events;
}

export function runAstroLayer({ evidence_packet, facts, question_profile }) {
  const evidence = normalizeEvidence(evidence_packet);

  const domain_results = DOMAIN_REGISTRY.map(
    ([domainKey, domainLabel, targetHouses]) => {
      const benefics = ["JUPITER", "VENUS", "MOON", "MERCURY"];
      const malefics = ["SATURN", "MARS", "RAHU", "KETU", "SUN"];

      const houseHits = [];
      const aspectHits = [];
      let rawScore = 0;

      for (const [planetName, houseNum] of Object.entries(
        evidence.housesByPlanet || {}
      )) {
        if (targetHouses.includes(houseNum)) {
          houseHits.push({ planet: planetName, house: houseNum });

          let weight = 1;
          if (benefics.includes(planetName)) weight += 0.65;
          if (malefics.includes(planetName)) weight += 0.85;
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

      if (domainKey === "MARRIAGE" && facts.marriage_count_claim != null) rawScore += 3.4;
      if (domainKey === "DIVORCE" && facts.broken_marriage_claim != null) rawScore += 2.8;
      if (domainKey === "FOREIGN" && facts.foreign_entry_year_claim != null) rawScore += 3;
      if (domainKey === "SETTLEMENT" && facts.settlement_year_claim != null) rawScore += 3.2;
      if (
        domainKey === "IMMIGRATION" &&
        (facts.foreign_entry_year_claim != null ||
          facts.settlement_year_claim != null)
      ) rawScore += 2.2;
      if (domainKey === "PROPERTY" && facts.settlement_year_claim != null) rawScore += 1.8;
      if (domainKey === "HOME" && facts.settlement_year_claim != null) rawScore += 1.4;
      if (
        domainKey === "MULTIPLE_MARRIAGE" &&
        (facts.marriage_count_claim ?? 0) >= 2
      ) rawScore += 1.5;

      const normalizedScore = round2(
        Math.min(10, rawScore + targetHouses.length * 0.14)
      );

      const density =
        normalizedScore >= 7.5 ? "HIGH" :
        normalizedScore >= 4.5 ? "MED" : "LOW";

      const residualImpact =
        normalizedScore >= 7 ? "HIGH" :
        normalizedScore >= 4 ? "MED" : "LOW";

      const events = inferEvents(
        domainKey,
        normalizedScore,
        facts,
        question_profile
      );

      return {
        domain_key: domainKey,
        domain_label: domainLabel,
        target_houses: targetHouses,
        normalized_score: normalizedScore,
        density,
        residual_impact: residualImpact,
        present_carryover: events.some(
          (e) => e.carryover_to_present === "YES"
        )
          ? "YES"
          : "NO",
        house_hits: houseHits,
        aspect_hits: aspectHits,
        major_event_count: events.filter((e) => e.importance === "MAJOR").length,
        minor_event_count: events.filter((e) => e.importance === "MINOR").length,
        broken_event_count: events.filter((e) => e.status === "BROKEN").length,
        active_event_count: events.filter(
          (e) => e.status === "ACTIVE" || e.status === "STABILISING"
        ).length,
        events
      };
    }
  );

  return {
    evidence_normalized: evidence.meta,
    evidence_runtime: evidence,
    domain_results
  };
}

export function buildTimeline({ ranked_domains, birth_context }) {
  const birthYear = safeBirthYear(birth_context?.birth_datetime_iso);
  const out = [];

  const inferPseudoYear = (domainKey, rankScore, eventNumber) => {
    const base =
      domainKey === "MARRIAGE" ? 20 :
      domainKey === "DIVORCE" ? 21 :
      domainKey === "FOREIGN" ? 21 :
      domainKey === "SETTLEMENT" ? 26 :
      domainKey === "IMMIGRATION" ? 22 :
      domainKey === "CAREER" ? 20 :
      domainKey === "JOB" ? 20 :
      domainKey === "BUSINESS" ? 24 :
      domainKey === "MENTAL" ? 21 :
      domainKey === "HEALTH" ? 22 :
      domainKey === "PROPERTY" ? 25 :
      domainKey === "HOME" ? 25 :
      22;

    return birthYear + base + (eventNumber - 1) * 2 + Math.floor(rankScore / 5);
  };

  ranked_domains.forEach((d) => {
    d.events.forEach((e) => {
      let date_marker = e.exact_year ?? null;
      if (date_marker == null && birthYear != null) {
        date_marker = inferPseudoYear(d.domain_key, d.rank_score, e.event_number);
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

  return out
    .filter(
      (x) =>
        x.importance === "MAJOR" ||
        ["MARRIAGE", "DIVORCE", "FOREIGN", "SETTLEMENT"].includes(x.domain_key)
    )
    .sort((a, b) => {
      const aa = a.date_marker ?? 99999;
      const bb = b.date_marker ?? 99999;
      return aa - bb;
    });
}