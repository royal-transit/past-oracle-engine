export default function handler(req, res) {
  try {
    const now = new Date();
    const q = req.query || {};

    const input = {
      name: str(q.name),
      dob: str(q.dob),
      tob: str(q.tob),
      pob: str(q.pob),
      question: str(q.question),
      facts: str(q.facts),
      format: normalizeFormat(str(q.format) || "json")
    };

    const birth = parseBirthData(input.dob, input.tob, input.pob);
    const mode = detectMode(input.name, birth);
    const ageContext = buildAgeContext(birth);
    const vibration = buildNameVibration(input.name);
    const questionRouting = routeQuestion(input.question);
    const knownFacts = parseKnownFacts(input.facts, input.question);
    const dataQuality = buildDataQuality(mode, birth, knownFacts);

    const domainResults = scanPastEcosystem({
      input,
      birth,
      mode,
      ageContext,
      vibration,
      questionRouting,
      knownFacts
    });

    const domainDensityMap = domainResults.map((d) => ({
      domain_key: d.domain_key,
      domain_label: d.domain_label,
      density: d.density,
      residual_impact: d.residual_impact,
      present_carryover: d.present_carryover,
      major_event_count: d.major_event_count,
      minor_event_count: d.minor_event_count,
      broken_event_count: d.broken_event_count,
      active_event_count: d.active_event_count
    }));

    const eventSummary = buildEventSummary(domainResults);
    const timeline = buildMasterTimeline(domainResults);
    const carryover = buildCarryover(domainResults);
    const validation = buildValidation(domainResults, knownFacts);
    const confidence = buildConfidence({
      mode,
      dataQuality,
      domainResults,
      validation,
      knownFacts
    });
    const readableSummary = buildReadableSummary({
      mode,
      questionRouting,
      eventSummary,
      domainResults,
      carryover,
      confidence
    });
    const lokkotha = buildLokkotha({
      questionRouting,
      eventSummary,
      carryover,
      domainResults
    });
    const verdict = buildVerdict({
      questionRouting,
      eventSummary,
      carryover,
      confidence
    });
    const projectPasteBlock = buildProjectPasteBlock({
      input,
      mode,
      dataQuality,
      questionRouting,
      eventSummary,
      domainResults,
      timeline,
      carryover,
      validation,
      confidence,
      verdict,
      lokkotha
    });
    const compactBlock = buildCompactBlock({
      input,
      mode,
      questionRouting,
      eventSummary,
      carryover,
      confidence,
      verdict
    });

    const response = {
      engine_status: "PAST26_FORENSIC_ECOSYSTEM_V3",
      generated_at_utc: now.toISOString(),
      output_format: input.format,
      input_packet: {
        name: input.name || null,
        dob: input.dob || null,
        tob: input.tob || null,
        pob: input.pob || null,
        question: input.question || null,
        facts: input.facts || null
      },
      mode_detection: {
        mode,
        birth_data_present: birth.hasBirthData,
        name_present: !!input.name
      },
      data_quality: dataQuality,
      age_context: ageContext,
      question_routing: questionRouting,
      name_vibration_fallback: vibration,
      known_facts: knownFacts,
      domain_density_map: domainDensityMap,
      domain_results: domainResults,
      event_summary: eventSummary,
      master_timeline: timeline,
      current_carryover: carryover,
      validation_block: validation,
      forensic_confidence: confidence,
      forensic_summary: readableSummary,
      lokkotha_summary: lokkotha,
      forensic_verdict: verdict,
      project_paste_block: projectPasteBlock,
      compact_block: compactBlock
    };

    if (input.format === "project") {
      return res.status(200).json({
        engine_status: "PAST26_FORENSIC_ECOSYSTEM_V3",
        output_format: "project",
        project_paste_block: projectPasteBlock
      });
    }

    if (input.format === "compact") {
      return res.status(200).json({
        engine_status: "PAST26_FORENSIC_ECOSYSTEM_V3",
        output_format: "compact",
        compact_block: compactBlock,
        forensic_verdict: verdict
      });
    }

    return res.status(200).json(response);
  } catch (error) {
    return res.status(500).json({
      engine_status: "PAST26_FORENSIC_ECOSYSTEM_V3",
      system_status: "ERROR",
      error_message: error instanceof Error ? error.message : "Unknown error"
    });
  }
}

/* =========================
   CORE HELPERS
========================= */

function str(v) {
  return typeof v === "string" ? v.trim() : "";
}

function normalizeFormat(v) {
  const x = (v || "").toLowerCase();
  if (x === "compact") return "compact";
  if (x === "project") return "project";
  return "json";
}

function hasAny(text, arr) {
  return arr.some((x) => text.includes(x));
}

function digitalRoot(n) {
  let x = Math.abs(Number(n) || 0);
  while (x > 9) {
    x = String(x)
      .split("")
      .reduce((a, b) => a + Number(b), 0);
  }
  return x || 1;
}

function safeYearFromDob(normalizedDob) {
  if (!normalizedDob) return null;
  return Number(normalizedDob.slice(0, 4));
}

function isRealDate(y, m, d) {
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

function normalizeDob(dob) {
  if (!dob) return null;

  const iso = /^(\d{4})-(\d{2})-(\d{2})$/;
  const dmy = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/;

  if (iso.test(dob)) {
    const [, y, m, d] = dob.match(iso) || [];
    return isRealDate(+y, +m, +d) ? `${y}-${m}-${d}` : null;
    }

  if (dmy.test(dob)) {
    const [, d, m, y] = dob.match(dmy) || [];
    const dd = String(d).padStart(2, "0");
    const mm = String(m).padStart(2, "0");
    return isRealDate(+y, +mm, +dd) ? `${y}-${mm}-${dd}` : null;
  }

  return null;
}

function parseBirthData(dob, tob, pob) {
  const normalized_dob = normalizeDob(dob);
  const hasDob = !!normalized_dob;
  const hasTob = !!tob;
  const hasPob = !!pob;
  return {
    raw_dob: dob || null,
    raw_tob: tob || null,
    raw_pob: pob || null,
    normalized_dob,
    hasDob,
    hasTob,
    hasPob,
    hasBirthData: hasDob && hasTob && hasPob
  };
}

function detectMode(name, birth) {
  if (birth.hasBirthData) return "FULL_BIRTH_MODE";
  if (name) return "NAME_MODE";
  return "MINIMAL_MODE";
}

function buildAgeContext(birth) {
  if (!birth.normalized_dob) {
    return {
      age_years: null,
      age_band: "UNKNOWN",
      life_stage: "UNKNOWN"
    };
  }

  const now = new Date();
  const dob = new Date(`${birth.normalized_dob}T00:00:00Z`);
  let age = now.getUTCFullYear() - dob.getUTCFullYear();

  const nowMD = `${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(
    now.getUTCDate()
  ).padStart(2, "0")}`;
  const dobMD = `${String(dob.getUTCMonth() + 1).padStart(2, "0")}-${String(
    dob.getUTCDate()
  ).padStart(2, "0")}`;

  if (nowMD < dobMD) age -= 1;

  const lifeStage =
    age < 21
      ? "EARLY_FORMATION"
      : age < 30
      ? "FIRST_BUILD"
      : age < 40
      ? "EXPANSION_BUILD"
      : age < 52
      ? "POWER_CONSOLIDATION"
      : age < 64
      ? "LATE_AUTHORITY"
      : "LEGACY";

  return {
    age_years: age,
    age_band: `${age}-${age + 4}`,
    life_stage: lifeStage
  };
}

function buildNameVibration(name) {
  if (!name) {
    return { active: false, number: null, planet: null };
  }

  const map = {
    1: ["A", "I", "J", "Q", "Y"],
    2: ["B", "K", "R"],
    3: ["C", "G", "L", "S"],
    4: ["D", "M", "T"],
    5: ["E", "H", "N", "X"],
    6: ["U", "V", "W"],
    7: ["O", "Z"],
    8: ["F", "P"]
  };

  const reverse = {};
  for (const [num, letters] of Object.entries(map)) {
    letters.forEach((l) => {
      reverse[l] = Number(num);
    });
  }

  const clean = name.toUpperCase().replace(/[^A-Z]/g, "");
  const total = clean.split("").reduce((s, ch) => s + (reverse[ch] || 0), 0);
  const number = digitalRoot(total || 1);

  const planets = {
    1: "Sun",
    2: "Moon",
    3: "Jupiter",
    4: "Rahu",
    5: "Mercury",
    6: "Venus",
    7: "Ketu",
    8: "Saturn",
    9: "Mars"
  };

  return {
    active: true,
    number,
    planet: planets[number] || "Sun"
  };
}

function routeQuestion(question) {
  const q = (question || "").toLowerCase();
  const primary_domain = detectPrimaryDomain(q);
  const linked_domains = buildLinkedDomains(primary_domain);

  return {
    raw_question: question || null,
    primary_domain,
    linked_domains
  };
}

function detectPrimaryDomain(q) {
  if (hasAny(q, ["marriage", "wife", "husband", "bea", "divorce", "separation"])) return "MARRIAGE";
  if (hasAny(q, ["relationship", "love", "partner", "breakup", "affair"])) return "RELATIONSHIP";
  if (hasAny(q, ["career", "job", "profession", "business", "work"])) return "CAREER";
  if (hasAny(q, ["money", "income", "cash", "debt", "finance"])) return "MONEY";
  if (hasAny(q, ["foreign", "abroad", "visa", "migration", "uk", "relocation"])) return "FOREIGN";
  if (hasAny(q, ["health", "illness", "stress", "disease", "hospital", "accident"])) return "HEALTH";
  if (hasAny(q, ["property", "house", "home", "land"])) return "PROPERTY";
  if (hasAny(q, ["legal", "court", "fine", "authority", "penalty"])) return "LEGAL";
  if (hasAny(q, ["child", "children", "son", "daughter"])) return "CHILDREN";
  if (hasAny(q, ["spiritual", "inner", "zikr", "pir"])) return "SPIRITUAL";
  return "GENERAL";
}

function buildLinkedDomains(primary) {
  const map = {
    MARRIAGE: ["MARRIAGE", "RELATIONSHIP", "FAMILY", "BREAK", "CARRYOVER", "CHILDREN"],
    RELATIONSHIP: ["RELATIONSHIP", "MARRIAGE", "BREAK", "CARRYOVER"],
    CAREER: ["CAREER", "MONEY", "LEGAL", "REPUTATION", "FAILURE", "GAIN"],
    MONEY: ["MONEY", "CAREER", "GAIN", "LOSS", "FAILURE"],
    FOREIGN: ["FOREIGN", "PROPERTY", "CAREER", "LOSS", "FAMILY"],
    HEALTH: ["HEALTH", "RISK", "CARRYOVER"],
    PROPERTY: ["PROPERTY", "FOREIGN", "FAMILY", "MONEY"],
    LEGAL: ["LEGAL", "CAREER", "REPUTATION", "RISK", "MONEY"],
    CHILDREN: ["CHILDREN", "MARRIAGE", "RELATIONSHIP", "FAMILY"],
    SPIRITUAL: ["SPIRITUAL", "CARRYOVER", "IDENTITY"],
    GENERAL: [
      "IDENTITY","FAMILY","COMMUNICATION","PROPERTY","CHILDREN","HEALTH",
      "MARRIAGE","BREAK","FORTUNE","CAREER","GAIN","FOREIGN","MONEY",
      "LEGAL","RELATIONSHIP","FAILURE","REPUTATION","SPIRITUAL"
    ]
  };
  return map[primary] || map.GENERAL;
}

function parseKnownFacts(facts, question) {
  const text = `${facts || ""} ${question || ""}`.toLowerCase();

  const marriage_count_claim = extractCount(text, ["marriage", "married", "bea"]);
  const broken_marriage_claim = extractCount(text, ["broken", "divorce", "separation", "vengese", "venge", "broke"]);
  const foreign_entry_year_claim = extractYearNear(text, ["uk", "foreign", "abroad", "came", "arrived", "entry"]);
  const settlement_year_claim = extractYearNear(text, ["settlement", "stabil", "stable", "base"]);
  const job_count_claim = extractCount(text, ["job", "career", "work"]);
  const relocation_year_claim = extractYearNear(text, ["move", "relocation", "house", "home", "city"]);

  return {
    raw_text: facts || null,
    provided: !!(facts || question),
    marriage_count_claim,
    broken_marriage_claim,
    foreign_entry_year_claim,
    settlement_year_claim,
    job_count_claim,
    relocation_year_claim
  };
}

function extractCount(text, keywords) {
  const wordToNum = {
    one: 1, two: 2, three: 3, four: 4, five: 5,
    ekta: 1, duita: 2, tinta: 3, charta: 4, pachta: 5,
    ek: 1, dui: 2, tin: 3, char: 4, pach: 5
  };

  if (!keywords.some((k) => text.includes(k))) return null;

  for (const [word, num] of Object.entries(wordToNum)) {
    if (text.includes(word)) return num;
  }

  const m = text.match(/\b([1-9])\b/);
  return m ? Number(m[1]) : null;
}

function extractYearNear(text, keywords) {
  if (!keywords.some((k) => text.includes(k))) return null;
  const years = [...text.matchAll(/\b(19|20)\d{2}\b/g)].map((m) => Number(m[0]));
  return years.length ? years[0] : null;
}

function buildDataQuality(mode, birth, knownFacts) {
  const grade =
    mode === "FULL_BIRTH_MODE"
      ? "D3"
      : mode === "NAME_MODE"
      ? "D1"
      : "D0";

  return {
    grade,
    precision_mode:
      grade === "D3" ? "HIGH" : grade === "D1" ? "RESTRICTED" : "LOW",
    reality_anchors_present: !!(
      knownFacts.marriage_count_claim ||
      knownFacts.foreign_entry_year_claim ||
      knownFacts.settlement_year_claim ||
      knownFacts.job_count_claim ||
      knownFacts.relocation_year_claim
    )
  };
}

/* =========================
   DOMAIN REGISTRY / SCAN
========================= */

function scanPastEcosystem(ctx) {
  const scanners = [
    scanIdentityDomain,
    scanFamilyDomain,
    scanCommunicationDomain,
    scanPropertyDomain,
    scanChildrenDomain,
    scanHealthDomain,
    scanMarriageDomain,
    scanBreakDomain,
    scanFortuneDomain,
    scanCareerDomain,
    scanGainDomain,
    scanForeignDomain,
    scanMoneyDomain,
    scanLegalDomain,
    scanRelationshipDomain,
    scanFailureDomain,
    scanReputationDomain,
    scanSpiritualDomain
  ];

  return scanners.map((fn) => fn(ctx));
}

function domainSeed(ctx, code) {
  const base = code.split("").reduce((s, ch) => s + ch.charCodeAt(0), 0);
  const age = ctx.ageContext.age_years || 37;
  const vib = ctx.vibration.number || 0;
  const dobPart = ctx.birth.normalized_dob
    ? ctx.birth.normalized_dob.split("-").reduce((s, x) => s + Number(x), 0)
    : 0;
  const modePart =
    ctx.mode === "FULL_BIRTH_MODE" ? 101 : ctx.mode === "NAME_MODE" ? 47 : 13;

  return base + age + vib + dobPart + modePart;
}

function makeDomain(domain_key, domain_label, events, density, residual, carryover) {
  return {
    domain_key,
    domain_label,
    density,
    residual_impact: residual,
    present_carryover: carryover ? "YES" : "NO",
    major_event_count: events.filter((e) => e.importance === "MAJOR").length,
    minor_event_count: events.filter((e) => e.importance === "MINOR").length,
    broken_event_count: events.filter((e) => e.status === "BROKEN").length,
    active_event_count: events.filter((e) => e.status === "ACTIVE" || e.status === "STABILISING").length,
    events
  };
}

function makeEvent({
  domain,
  event_number,
  event_type,
  age_band,
  date_window,
  trigger_phase,
  status,
  after_effect,
  carryover_to_present = "NO",
  importance = "MAJOR",
  tags = []
}) {
  return {
    domain,
    event_number,
    event_type,
    age_band,
    date_window,
    trigger_phase,
    status,
    after_effect,
    carryover_to_present,
    importance,
    tags
  };
}

function makeAgeWindow(ctx, startAge, endAge) {
  if (!ctx.birth.normalized_dob) {
    return {
      age_band: `${startAge}-${endAge}`,
      date_window: `Approx age ${startAge}-${endAge}`
    };
  }

  const birthYear = safeYearFromDob(ctx.birth.normalized_dob);
  return {
    age_band: `${startAge}-${endAge}`,
    date_window: `${birthYear + startAge}-${birthYear + endAge}`
  };
}

function yearToAgeBand(ctx, year) {
  const birthYear = safeYearFromDob(ctx.birth.normalized_dob);
  if (!birthYear) return "UNKNOWN";
  const a = year - birthYear;
  return `${a}-${a + 1}`;
}

function includesPrimary(ctx, x) {
  return ctx.questionRouting.linked_domains.includes(x);
}

/* --- scanners --- */

function scanIdentityDomain(ctx) {
  const s = domainSeed(ctx, "IDENTITY");
  const a1 = Math.max(16, (ctx.ageContext.age_years || 40) - 18);
  const a2 = Math.max(24, (ctx.ageContext.age_years || 40) - 6);
  const w1 = makeAgeWindow(ctx, a1, a1 + 2);
  const w2 = makeAgeWindow(ctx, a2, a2 + 2);

  const events = [
    makeEvent({
      domain: "Identity / Self / Direction",
      event_number: 1,
      event_type: "major self-reset phase",
      age_band: w1.age_band,
      date_window: w1.date_window,
      trigger_phase: "identity restructuring",
      status: "EXECUTED",
      after_effect: "reshaped personal direction",
      tags: ["identity", "reset"]
    }),
    makeEvent({
      domain: "Identity / Self / Direction",
      event_number: 2,
      event_type: "directional rebuilding phase",
      age_band: w2.age_band,
      date_window: w2.date_window,
      trigger_phase: "present direction carryover",
      status: s % 2 === 0 ? "ACTIVE" : "STABILISING",
      after_effect: "still influences current life decisions",
      carryover_to_present: "YES",
      tags: ["direction", "carryover"]
    })
  ];

  return makeDomain("IDENTITY", "Identity / Self / Direction", events, "MED", "MED", true);
}

function scanFamilyDomain(ctx) {
  const s = domainSeed(ctx, "FAMILY");
  const a = Math.max(18, (ctx.ageContext.age_years || 40) - 14);
  const w = makeAgeWindow(ctx, a, a + 3);

  const events = [
    makeEvent({
      domain: "Family / Wealth / Speech",
      event_number: 1,
      event_type: "family responsibility or burden phase",
      age_band: w.age_band,
      date_window: w.date_window,
      trigger_phase: "family pressure activation",
      status: s % 3 === 0 ? "RESIDUAL" : "EXECUTED",
      after_effect: "family-linked burden shaped later choices",
      carryover_to_present: s % 3 === 0 ? "YES" : "NO",
      tags: ["family", "burden"]
    })
  ];

  return makeDomain("FAMILY", "Family / Wealth / Speech", events, "MED", "MED", s % 3 === 0);
}

function scanCommunicationDomain(ctx) {
  const s = domainSeed(ctx, "COMM");
  const a = Math.max(20, (ctx.ageContext.age_years || 40) - 10);
  const w = makeAgeWindow(ctx, a, a + 1);

  const events = [
    makeEvent({
      domain: "Communication / Effort / Siblings",
      event_number: 1,
      event_type: "document / message distortion phase",
      age_band: w.age_band,
      date_window: w.date_window,
      trigger_phase: "communication conflict",
      status: s % 2 === 0 ? "PARTIAL" : "EXECUTED",
      after_effect: "created correction or delay loop",
      tags: ["documents", "communication"]
    })
  ];

  return makeDomain("COMMUNICATION", "Communication / Effort / Siblings", events, "MED", "LOW", false);
}

function scanPropertyDomain(ctx) {
  const count = includesPrimary(ctx, "PROPERTY") || includesPrimary(ctx, "FOREIGN") ? 2 : 1;
  const events = [];

  for (let i = 0; i < count; i += 1) {
    const a = Math.max(21, 24 + i * 7);
    const w = makeAgeWindow(ctx, a, a + 2);
    events.push(
      makeEvent({
        domain: "Home / Property / Residence",
        event_number: i + 1,
        event_type: i === 0 ? "home / residence shift" : "property stability or relocation phase",
        age_band: w.age_band,
        date_window: w.date_window,
        trigger_phase: i === 0 ? "base movement" : "base re-establishment",
        status: i === 0 ? "EXECUTED" : "STABILISING",
        after_effect: i === 0 ? "changed living base" : "created stable or semi-stable base",
        carryover_to_present: i === count - 1 ? "YES" : "NO",
        tags: ["property", "residence", i === 0 ? "move" : "stability"]
      })
    );
  }

  return makeDomain("PROPERTY", "Home / Property / Residence", events, count > 1 ? "HIGH" : "MED", "MED", count > 1);
}

function scanChildrenDomain(ctx) {
  const s = domainSeed(ctx, "CHILDREN");
  const count = includesPrimary(ctx, "CHILDREN") ? 2 : 1;
  const events = [];

  for (let i = 0; i < count; i += 1) {
    const a = Math.max(24, (ctx.ageContext.age_years || 40) - (12 - i * 4));
    const w = makeAgeWindow(ctx, a, a + 2);
    events.push(
      makeEvent({
        domain: "Love / Children / Creativity",
        event_number: i + 1,
        importance: i === 0 ? "MAJOR" : "MINOR",
        event_type: i === 0 ? "major love / attachment event" : "children / family continuity event",
        age_band: w.age_band,
        date_window: w.date_window,
        trigger_phase: i === 0 ? "emotional activation" : "continuation trigger",
        status: i === 0 ? "EXECUTED" : s % 2 === 0 ? "ACTIVE" : "PARTIAL",
        after_effect: i === 0 ? "left emotional memory" : "created continuing family effect",
        carryover_to_present: i === 1 && s % 2 === 0 ? "YES" : "NO",
        tags: i === 0 ? ["love"] : ["children"]
      })
    );
  }

  return makeDomain("CHILDREN", "Love / Children / Creativity", events, count > 1 ? "HIGH" : "MED", "MED", events.some((e) => e.carryover_to_present === "YES"));
}

function scanHealthDomain(ctx) {
  const s = domainSeed(ctx, "HEALTH");
  const events = [];
  const w1 = makeAgeWindow(ctx, Math.max(18, (ctx.ageContext.age_years || 40) - 15), Math.max(20, (ctx.ageContext.age_years || 40) - 13));

  events.push(
    makeEvent({
      domain: "Health / Stress / Disease / Recovery",
      event_number: 1,
      event_type: "major stress / weakness phase",
      age_band: w1.age_band,
      date_window: w1.date_window,
      trigger_phase: "health strain",
      status: "EXECUTED",
      after_effect: "left stamina or recovery imprint",
      tags: ["health", "stress"]
    })
  );

  if (s % 2 === 0 || includesPrimary(ctx, "HEALTH")) {
    const w2 = makeAgeWindow(ctx, Math.max(26, (ctx.ageContext.age_years || 40) - 5), Math.max(27, (ctx.ageContext.age_years || 40) - 4));
    events.push(
      makeEvent({
        domain: "Health / Stress / Disease / Recovery",
        event_number: 2,
        event_type: "recurring health / stress residue",
        age_band: w2.age_band,
        date_window: w2.date_window,
        trigger_phase: "repeat vulnerability",
        status: s % 4 === 0 ? "ACTIVE" : "RESIDUAL",
        after_effect: "still influences present capacity",
        carryover_to_present: "YES",
        tags: ["health", "carryover", "repeat"]
      })
    );
  }

  return makeDomain("HEALTH", "Health / Stress / Disease / Recovery", events, events.length > 1 ? "HIGH" : "MED", "HIGH", events.some((e) => e.carryover_to_present === "YES"));
}

function scanMarriageDomain(ctx) {
  const known = ctx.knownFacts;
  let marriageCount = 1;

  if (known.marriage_count_claim != null) {
    marriageCount = known.marriage_count_claim;
  } else if (ctx.mode === "FULL_BIRTH_MODE") {
    marriageCount = inferMarriageCount(ctx);
  } else if (ctx.mode === "NAME_MODE") {
    marriageCount = 1 + (domainSeed(ctx, "MARRIAGE") % 2);
  }

  const brokenCount =
    known.broken_marriage_claim != null
      ? Math.min(known.broken_marriage_claim, Math.max(0, marriageCount - 1))
      : Math.max(0, marriageCount - 1);

  const events = [];
  for (let i = 0; i < marriageCount; i += 1) {
    const a = Math.max(19, 22 + i * 5);
    const w = makeAgeWindow(ctx, a, a + 2);
    const isBroken = i < brokenCount;
    const isLast = i === marriageCount - 1;

    events.push(
      makeEvent({
        domain: "Marriage / Partnership",
        event_number: i + 1,
        event_type: "marriage event",
        age_band: w.age_band,
        date_window: w.date_window,
        trigger_phase: isBroken ? "formation then break" : "formation then continuation",
        status: isBroken ? "BROKEN" : isLast ? "STABILISING" : "EXECUTED",
        after_effect: isBroken ? "left marital residue" : "remains active in present structure",
        carryover_to_present: !isBroken ? "YES" : "NO",
        tags: ["marriage", isBroken ? "broken" : "active"]
      })
    );
  }

  return makeDomain(
    "MARRIAGE",
    "Marriage / Partnership",
    events,
    marriageCount >= 3 ? "EXTREME" : marriageCount === 2 ? "HIGH" : "MED",
    marriageCount >= 2 ? "HIGH" : "MED",
    events.some((e) => e.carryover_to_present === "YES")
  );
}

function inferMarriageCount(ctx) {
  const s = domainSeed(ctx, "MARRIAGE_COUNT");
  const age = ctx.ageContext.age_years || 40;

  if (age >= 42 && s % 5 === 0) return 3;
  if (age >= 32 && s % 3 === 0) return 2;
  return 1;
}

function scanBreakDomain(ctx) {
  const s = domainSeed(ctx, "BREAK");
  const count = s % 3 === 0 ? 2 : 1;
  const events = [];

  for (let i = 0; i < count; i += 1) {
    const a = Math.max(20, (ctx.ageContext.age_years || 40) - (11 - i * 3));
    const w = makeAgeWindow(ctx, a, a + 1);

    events.push(
      makeEvent({
        domain: "Shock / Break / Hidden / Scandal",
        event_number: i + 1,
        event_type: i === 0 ? "sudden break phase" : "hidden obstruction phase",
        age_band: w.age_band,
        date_window: w.date_window,
        trigger_phase: "shock / break activation",
        status: i === 0 ? "BROKEN" : "RESIDUAL",
        after_effect: "changed trust or route",
        carryover_to_present: i === count - 1 ? "YES" : "NO",
        tags: ["break", "obstruction"]
      })
    );
  }

  return makeDomain("BREAK", "Shock / Break / Hidden / Scandal", events, count > 1 ? "HIGH" : "MED", "HIGH", true);
}

function scanFortuneDomain(ctx) {
  const s = domainSeed(ctx, "FORTUNE");
  const w = makeAgeWindow(ctx, Math.max(18, (ctx.ageContext.age_years || 40) - 9), Math.max(20, (ctx.ageContext.age_years || 40) - 7));

  const events = [
    makeEvent({
      domain: "Fortune / Father / Travel / Grace",
      event_number: 1,
      event_type: s % 2 === 0 ? "travel turning point" : "fortune support phase",
      age_band: w.age_band,
      date_window: w.date_window,
      trigger_phase: "luck opening",
      status: "EXECUTED",
      after_effect: "shifted supportive pattern",
      tags: ["fortune", "travel"]
    })
  ];

  return makeDomain("FORTUNE", "Fortune / Father / Travel / Grace", events, "MED", "LOW", false);
}

function scanCareerDomain(ctx) {
  const count =
    ctx.knownFacts.job_count_claim != null
      ? Math.max(1, ctx.knownFacts.job_count_claim)
      : ctx.mode === "FULL_BIRTH_MODE"
      ? 2 + (domainSeed(ctx, "CAREER") % 2)
      : 2;

  const events = [];

  for (let i = 0; i < count; i += 1) {
    const a = Math.max(18, 20 + i * 7);
    const w = makeAgeWindow(ctx, a, a + 2);
    const status =
      i === count - 1
        ? domainSeed(ctx, "CAREER_ACTIVE") % 2 === 0
          ? "STABILISING"
          : "ACTIVE"
        : i % 2 === 0
        ? "EXECUTED"
        : "FAILED";

    events.push(
      makeEvent({
        domain: "Career / Authority / Public Role",
        event_number: i + 1,
        event_type:
          i === 0
            ? "job / role start"
            : i === count - 1
            ? "current career phase"
            : "career shift / break",
        age_band: w.age_band,
        date_window: w.date_window,
        trigger_phase: i === 0 ? "entry" : "restructure",
        status,
        after_effect:
          status === "FAILED"
            ? "forced redirection"
            : status === "ACTIVE" || status === "STABILISING"
            ? "still shapes present career"
            : "added career experience",
        carryover_to_present:
          status === "ACTIVE" || status === "STABILISING" ? "YES" : "NO",
        tags: ["career", status.toLowerCase()]
      })
    );
  }

  return makeDomain("CAREER", "Career / Authority / Public Role", events, "HIGH", "HIGH", events.some((e) => e.carryover_to_present === "YES"));
}

function scanGainDomain(ctx) {
  const w = makeAgeWindow(ctx, Math.max(24, (ctx.ageContext.age_years || 40) - 6), Math.max(26, (ctx.ageContext.age_years || 40) - 4));
  const events = [
    makeEvent({
      domain: "Gain / Network / Achievement",
      event_number: 1,
      event_type: "gain or network support phase",
      age_band: w.age_band,
      date_window: w.date_window,
      trigger_phase: "achievement cluster",
      status: "EXECUTED",
      after_effect: "opened gains or support channels",
      tags: ["gain", "network"]
    })
  ];

  return makeDomain("GAIN", "Gain / Network / Achievement", events, "MED", "LOW", false);
}

function scanForeignDomain(ctx) {
  const known = ctx.knownFacts;
  const events = [];

  const entryYear = known.foreign_entry_year_claim || inferForeignEntryYear(ctx);
  const settlementYear = known.settlement_year_claim || inferSettlementYear(ctx, entryYear);

  events.push(
    makeEvent({
      domain: "Loss / Foreign / Isolation",
      event_number: 1,
      event_type: "foreign entry event",
      age_band: yearToAgeBand(ctx, entryYear),
      date_window: `${entryYear}-${entryYear}`,
      trigger_phase: "physical movement / foreign entry",
      status: "EXECUTED",
      after_effect: "life shifted outside origin base",
      tags: ["foreign", "entry"]
    })
  );

  if (settlementYear && settlementYear > entryYear) {
    events.push(
      makeEvent({
        domain: "Loss / Foreign / Isolation",
        event_number: 2,
        event_type: "foreign settlement / stability event",
        age_band: yearToAgeBand(ctx, settlementYear),
        date_window: `${settlementYear}-${settlementYear + 1}`,
        trigger_phase: "settlement / base formation",
        status: "STABILISING",
        after_effect: "foreign base became more durable",
        carryover_to_present: "YES",
        tags: ["foreign", "settlement", "stability"]
      })
    );
  }

  return makeDomain("FOREIGN", "Loss / Foreign / Isolation", events, "HIGH", "HIGH", true);
}

function inferForeignEntryYear(ctx) {
  const birthYear = safeYearFromDob(ctx.birth.normalized_dob) || 1985;
  const foreignAge =
    ctx.mode === "FULL_BIRTH_MODE"
      ? 28 + (domainSeed(ctx, "FOREIGN") % 6)
      : 27 + (domainSeed(ctx, "FOREIGN") % 7);
  return birthYear + foreignAge;
}

function inferSettlementYear(ctx, entryYear) {
  return entryYear + 4 + (domainSeed(ctx, "SETTLE") % 3);
}

function scanMoneyDomain(ctx) {
  const s = domainSeed(ctx, "MONEY");
  const w1 = makeAgeWindow(ctx, Math.max(20, (ctx.ageContext.age_years || 40) - 12), Math.max(22, (ctx.ageContext.age_years || 40) - 10));
  const w2 = makeAgeWindow(ctx, Math.max(26, (ctx.ageContext.age_years || 40) - 4), Math.max(28, (ctx.ageContext.age_years || 40) - 2));

  const events = [
    makeEvent({
      domain: "Money Flow / Cash / Debt Pattern",
      event_number: 1,
      event_type: "cash pressure / debt cycle",
      age_band: w1.age_band,
      date_window: w1.date_window,
      trigger_phase: "financial compression",
      status: s % 2 === 0 ? "EXECUTED" : "BROKEN",
      after_effect: "money pattern shifted materially",
      tags: ["money", "debt"]
    }),
    makeEvent({
      domain: "Money Flow / Cash / Debt Pattern",
      event_number: 2,
      event_type: "income recovery / gain phase",
      age_band: w2.age_band,
      date_window: w2.date_window,
      trigger_phase: "money recovery",
      status: "STABILISING",
      after_effect: "recovery improving but not fully settled",
      carryover_to_present: "YES",
      tags: ["money", "recovery", "carryover"]
    })
  ];

  return makeDomain("MONEY", "Money Flow / Cash / Debt Pattern", events, "HIGH", "HIGH", true);
}

function scanLegalDomain(ctx) {
  const s = domainSeed(ctx, "LEGAL");
  const needed = includesPrimary(ctx, "LEGAL") || s % 3 === 0;
  const events = [];

  if (needed) {
    const w = makeAgeWindow(ctx, Math.max(22, (ctx.ageContext.age_years || 40) - 7), Math.max(23, (ctx.ageContext.age_years || 40) - 6));
    events.push(
      makeEvent({
        domain: "Legal / Authority / Penalty",
        event_number: 1,
        event_type: "authority / penalty / paperwork conflict",
        age_band: w.age_band,
        date_window: w.date_window,
        trigger_phase: "authority pressure",
        status: s % 2 === 0 ? "PARTIAL" : "EXECUTED",
        after_effect: "forced correction or compliance",
        tags: ["legal", "authority", "paperwork"]
      })
    );
  }

  return makeDomain("LEGAL", "Legal / Authority / Penalty", events, needed ? "MED" : "LOW", needed ? "MED" : "LOW", false);
}

function scanRelationshipDomain(ctx) {
  const s = domainSeed(ctx, "RELATIONSHIP");
  const w = makeAgeWindow(ctx, Math.max(19, (ctx.ageContext.age_years || 40) - 13), Math.max(21, (ctx.ageContext.age_years || 40) - 11));
  const events = [
    makeEvent({
      domain: "Relationship Complexity",
      event_number: 1,
      event_type: "hidden / unstable relational loop",
      age_band: w.age_band,
      date_window: w.date_window,
      trigger_phase: "emotional complexity",
      status: s % 2 === 0 ? "BROKEN" : "RESIDUAL",
      after_effect: "left comparison pattern and emotional residue",
      carryover_to_present: "YES",
      tags: ["relationship", "complexity", "residue"]
    })
  ];

  return makeDomain("RELATIONSHIP", "Relationship Complexity", events, "MED", "HIGH", true);
}

function scanFailureDomain(ctx) {
  const w = makeAgeWindow(ctx, Math.max(20, (ctx.ageContext.age_years || 40) - 9), Math.max(21, (ctx.ageContext.age_years || 40) - 8));
  const events = [
    makeEvent({
      domain: "Event Failure / Near-Success Collapse",
      event_number: 1,
      event_type: "started but failed event",
      age_band: w.age_band,
      date_window: w.date_window,
      trigger_phase: "execution failure",
      status: "FAILED",
      after_effect: "created caution and delay tendency",
      carryover_to_present: "YES",
      tags: ["failure", "collapse", "carryover"]
    })
  ];

  return makeDomain("FAILURE", "Event Failure / Near-Success Collapse", events, "MED", "MED", true);
}

function scanReputationDomain(ctx) {
  const s = domainSeed(ctx, "REPUTATION");
  const w = makeAgeWindow(ctx, Math.max(24, (ctx.ageContext.age_years || 40) - 6), Math.max(25, (ctx.ageContext.age_years || 40) - 5));
  const events = [
    makeEvent({
      domain: "Reputation / Social Image",
      event_number: 1,
      event_type: s % 2 === 0 ? "name / respect challenge" : "visibility / reputation rise",
      age_band: w.age_band,
      date_window: w.date_window,
      trigger_phase: "public exposure phase",
      status: "EXECUTED",
      after_effect: "shifted social image pattern",
      tags: ["reputation", "public-image"]
    })
  ];

  return makeDomain("REPUTATION", "Reputation / Social Image", events, "MED", "LOW", false);
}

function scanSpiritualDomain(ctx) {
  const w = makeAgeWindow(ctx, Math.max(22, (ctx.ageContext.age_years || 40) - 5), Math.max(24, (ctx.ageContext.age_years || 40) - 3));
  const events = [
    makeEvent({
      domain: "Spiritual / Inner Turning",
      event_number: 1,
      event_type: "inner correction / spiritual turning phase",
      age_band: w.age_band,
      date_window: w.date_window,
      trigger_phase: "withdrawal and correction",
      status: "RESIDUAL",
      after_effect: "still affects patience and inner judgement",
      carryover_to_present: "YES",
      tags: ["spiritual", "inner", "carryover"]
    })
  ];

  return makeDomain("SPIRITUAL", "Spiritual / Inner Turning", events, "MED", "MED", true);
}

/* =========================
   AGGREGATION
========================= */

function buildEventSummary(domainResults) {
  const totals = domainResults.reduce(
    (acc, d) => {
      acc.total_major_events += d.major_event_count;
      acc.total_minor_events += d.minor_event_count;
      acc.total_broken_events += d.broken_event_count;
      acc.total_active_events += d.active_event_count;
      return acc;
    },
    {
      total_major_events: 0,
      total_minor_events: 0,
      total_broken_events: 0,
      total_active_events: 0
    }
  );

  const marriage = domainResults.find((d) => d.domain_key === "MARRIAGE");
  const foreign = domainResults.find((d) => d.domain_key === "FOREIGN");
  const career = domainResults.find((d) => d.domain_key === "CAREER");
  const money = domainResults.find((d) => d.domain_key === "MONEY");
  const health = domainResults.find((d) => d.domain_key === "HEALTH");

  return {
    ...totals,
    marriage_count: marriage ? marriage.events.filter((e) => e.event_type.includes("marriage")).length : 0,
    broken_marriage_count: marriage ? marriage.events.filter((e) => e.status === "BROKEN").length : 0,
    current_marriage_status: marriage ? (marriage.events[marriage.events.length - 1]?.status || "UNKNOWN") : "UNKNOWN",
    foreign_event_count: foreign ? foreign.major_event_count : 0,
    foreign_entry_year: foreign?.events?.[0]?.date_window || null,
    settlement_window: foreign?.events?.[1]?.date_window || null,
    career_major_count: career ? career.major_event_count : 0,
    money_event_count: money ? money.major_event_count : 0,
    health_event_count: health ? health.major_event_count : 0
  };
}

function buildMasterTimeline(domainResults) {
  const out = [];
  domainResults.forEach((d) => {
    d.events.forEach((e) => {
      out.push({
        domain: d.domain_label,
        event_number: e.event_number,
        event_type: e.event_type,
        age_band: e.age_band,
        date_window: e.date_window,
        status: e.status,
        carryover_to_present: e.carryover_to_present
      });
    });
  });

  return out.sort((a, b) => {
    const aa = Number(String(a.age_band).split("-")[0]) || 0;
    const bb = Number(String(b.age_band).split("-")[0]) || 0;
    return aa - bb;
  });
}

function buildCarryover(domainResults) {
  const carryover_domains = domainResults
    .filter((d) => d.present_carryover === "YES")
    .map((d) => ({
      domain: d.domain_label,
      residual_impact: d.residual_impact,
      active_residue_count: d.events.filter((e) => e.carryover_to_present === "YES").length
    }));

  return {
    present_carryover_detected: carryover_domains.length > 0,
    carryover_domains
  };
}

function buildValidation(domainResults, knownFacts) {
  const marriage = domainResults.find((d) => d.domain_key === "MARRIAGE");
  const foreign = domainResults.find((d) => d.domain_key === "FOREIGN");
  const career = domainResults.find((d) => d.domain_key === "CAREER");

  let marriage_fact_match = "NOT_PROVIDED";
  if (knownFacts.marriage_count_claim != null) {
    const predicted = marriage
      ? marriage.events.filter((e) => e.event_type.includes("marriage")).length
      : 0;
    marriage_fact_match =
      predicted === knownFacts.marriage_count_claim ? "EXACT" : "CONFLICT";
  }

  let foreign_fact_match = "NOT_PROVIDED";
  if (knownFacts.foreign_entry_year_claim != null && foreign?.events?.[0]) {
    const year = Number(String(foreign.events[0].date_window).slice(0, 4));
    foreign_fact_match =
      year === knownFacts.foreign_entry_year_claim ? "EXACT" : "CONFLICT";
  }

  let career_fact_match = "NOT_PROVIDED";
  if (knownFacts.job_count_claim != null) {
    const predicted = career ? career.events.length : 0;
    career_fact_match =
      predicted === knownFacts.job_count_claim ? "EXACT" : "PARTIAL";
  }

  const overall_validation =
    [marriage_fact_match, foreign_fact_match].includes("CONFLICT")
      ? "PARTIAL_CONFLICT"
      : [marriage_fact_match, foreign_fact_match, career_fact_match].includes("EXACT")
      ? "SUPPORTED"
      : "NOT_PROVIDED";

  return {
    reality_validation_active: knownFacts.provided,
    marriage_fact_match,
    foreign_fact_match,
    career_fact_match,
    overall_validation
  };
}

function buildConfidence({ mode, dataQuality, domainResults, validation, knownFacts }) {
  let confidence_score = 50;

  if (mode === "FULL_BIRTH_MODE") confidence_score += 20;
  else if (mode === "NAME_MODE") confidence_score += 8;

  if (dataQuality.grade === "D3") confidence_score += 10;
  if (dataQuality.reality_anchors_present) confidence_score += 6;
  if (validation.overall_validation === "SUPPORTED") confidence_score += 8;
  if (validation.overall_validation === "PARTIAL_CONFLICT") confidence_score -= 10;

  const strongDomains = domainResults.filter(
    (d) => d.density === "HIGH" || d.density === "EXTREME"
  ).length;

  confidence_score += Math.min(8, strongDomains);

  const confidence_level =
    confidence_score >= 85
      ? "HIGH"
      : confidence_score >= 70
      ? "MEDIUM_HIGH"
      : confidence_score >= 55
      ? "MEDIUM"
      : "LOW";

  return {
    confidence_score,
    confidence_level,
    reasons: [
      `Mode: ${mode}`,
      `Data quality: ${dataQuality.grade}`,
      `Reality anchors: ${dataQuality.reality_anchors_present ? "YES" : "NO"}`,
      `Validation: ${validation.overall_validation}`,
      `Strong domains: ${strongDomains}`
    ]
  };
}

function buildReadableSummary({ mode, questionRouting, eventSummary, domainResults, carryover, confidence }) {
  const strongest_domains = domainResults
    .slice()
    .sort((a, b) => b.major_event_count - a.major_event_count)
    .slice(0, 4)
    .map((d) => d.domain_label);

  return {
    mode,
    dominant_domain: questionRouting.primary_domain,
    strongest_domains,
    summary:
      `Past scan completed in ${mode}. ` +
      `Primary domain: ${questionRouting.primary_domain}. ` +
      `Strongest domains: ${strongest_domains.join(", ")}. ` +
      `Major events: ${eventSummary.total_major_events}. ` +
      `Broken events: ${eventSummary.total_broken_events}. ` +
      `Marriage count: ${eventSummary.marriage_count}. ` +
      `Current carryover: ${carryover.present_carryover_detected ? "YES" : "NO"}. ` +
      `Confidence: ${confidence.confidence_level}.`
  };
}

function buildLokkotha({ questionRouting, eventSummary, carryover, domainResults }) {
  const top = domainResults
    .slice()
    .sort((a, b) => b.major_event_count - a.major_event_count)[0];

  return {
    text:
      `${questionRouting.primary_domain.toLowerCase()}-এর জবাব একা আসে না; ` +
      `${top ? top.domain_label.toLowerCase() : "পুরোনো জীবনের পথ"} এখনও তার ছাপ ধরে রেখেছে। ` +
      `বড় ঘটনা ছিল ${eventSummary.total_major_events}, ভাঙন ছিল ${eventSummary.total_broken_events}, ` +
      `আর তার ঢেউ ${carryover.present_carryover_detected ? "এখনও চলছে" : "ধীরে বসেছে"}.`
  };
}

function buildVerdict({ questionRouting, eventSummary, carryover, confidence }) {
  return {
    forensic_direction:
      `${questionRouting.primary_domain} past scan shows ` +
      `${eventSummary.total_major_events} major events, ` +
      `${eventSummary.total_broken_events} broken phases, and ` +
      `${carryover.present_carryover_detected ? "active residue" : "limited residue"} ` +
      `with ${confidence.confidence_level} confidence.`,
    confidence: confidence.confidence_level
  };
}

function buildProjectPasteBlock({
  input,
  mode,
  dataQuality,
  questionRouting,
  eventSummary,
  domainResults,
  timeline,
  carryover,
  validation,
  confidence,
  verdict,
  lokkotha
}) {
  const topDomains = domainResults
    .slice()
    .sort((a, b) => b.major_event_count - a.major_event_count)
    .slice(0, 4)
    .map((d) => `${d.domain_label} (${d.major_event_count})`);

  const keyTimeline = timeline.slice(0, 8).map(
    (t) => `${t.domain} | #${t.event_number} | ${t.date_window} | ${t.status}`
  );

  return [
    "PAST FORENSIC PROJECT BLOCK",
    `Subject: ${input.name || "UNKNOWN"}`,
    `Mode: ${mode}`,
    `Data Quality: ${dataQuality.grade}`,
    `Primary Domain: ${questionRouting.primary_domain}`,
    `Total Major Events: ${eventSummary.total_major_events}`,
    `Total Broken Events: ${eventSummary.total_broken_events}`,
    `Marriage Count: ${eventSummary.marriage_count}`,
    `Broken Marriage Count: ${eventSummary.broken_marriage_count}`,
    `Current Marriage Status: ${eventSummary.current_marriage_status}`,
    `Foreign Event Count: ${eventSummary.foreign_event_count}`,
    `Foreign Entry: ${eventSummary.foreign_entry_year || "UNKNOWN"}`,
    `Settlement Window: ${eventSummary.settlement_window || "UNKNOWN"}`,
    `Career Major Count: ${eventSummary.career_major_count}`,
    `Money Event Count: ${eventSummary.money_event_count}`,
    `Health Event Count: ${eventSummary.health_event_count}`,
    `Top Domains: ${topDomains.join(" | ")}`,
    "Key Timeline:",
    ...keyTimeline,
    `Carryover Present: ${carryover.present_carryover_detected ? "YES" : "NO"}`,
    `Validation: ${validation.overall_validation}`,
    `Confidence: ${confidence.confidence_level} (${confidence.confidence_score})`,
    `Direction: ${verdict.forensic_direction}`,
    `Lokkotha: ${lokkotha.text}`,
    "PAST FORENSIC BLOCK END"
  ].join("\n");
}

function buildCompactBlock({
  input,
  mode,
  questionRouting,
  eventSummary,
  carryover,
  confidence,
  verdict
}) {
  return {
    subject: input.name || "UNKNOWN",
    mode,
    primary_domain: questionRouting.primary_domain,
    total_major_events: eventSummary.total_major_events,
    total_broken_events: eventSummary.total_broken_events,
    marriage_count: eventSummary.marriage_count,
    current_marriage_status: eventSummary.current_marriage_status,
    foreign_entry: eventSummary.foreign_entry_year,
    settlement_window: eventSummary.settlement_window,
    carryover_present: carryover.present_carryover_detected,
    confidence: confidence.confidence_level,
    verdict: verdict.forensic_direction
  };
}