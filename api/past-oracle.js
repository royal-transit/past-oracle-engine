// api/past-oracle.js
import { buildChartCore } from "../lib/chart-core.js";
import { astroProvider } from "../lib/provider-adapter.js";

/* ------------------------------
   BASIC HELPERS
------------------------------ */

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

const hasAny = (text, arr) => arr.some((x) => text.includes(x));

/* ------------------------------
   MAIN HANDLER
------------------------------ */

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
      format: normalizeFormat(q.format)
    };

    const core = await buildChartCore(input, astroProvider);

    if (core.system_status !== "OK") {
      return res.status(400).json({
        engine_status: "PAST_ORACLE_V4",
        system_status: "INPUT_ERROR",
        details: core
      });
    }

    const factAnchors = parseFactAnchors(input.facts, input.question);
    const evidence = core.evidence_packet;

    const domainResults = runAllDomainForensicScan({
      input,
      core,
      evidence,
      factAnchors
    });

    const summary = buildSummary(domainResults);
    const timeline = buildTimeline(domainResults);
    const carryover = buildCarryover(domainResults);
    const validation = buildValidation(domainResults, factAnchors);
    const verdict = buildVerdict(input.question, summary, carryover, validation);
    const lokkotha = buildLokkotha(input.question, summary, carryover);

    const project_paste_block = buildProjectPasteBlock({
      input,
      summary,
      timeline,
      carryover,
      validation,
      verdict,
      lokkotha
    });

    const payload = {
      engine_status: "PAST_ORACLE_V4",
      system_status: "OK",
      mode: "FULL_BIRTH_MODE",
      input_normalized: core.input_normalized,
      birth_context: core.birth_context,
      current_context: core.current_context,
      fact_anchor_block: factAnchors,
      domain_results: domainResults,
      event_summary: summary,
      master_timeline: timeline,
      current_carryover: carryover,
      validation_block: validation,
      forensic_verdict: verdict,
      lokkotha_summary: lokkotha,
      project_paste_block
    };

    if (input.format === "project") {
      return res.status(200).json({
        engine_status: "PAST_ORACLE_V4",
        output_format: "project",
        project_paste_block
      });
    }

    if (input.format === "compact") {
      return res.status(200).json({
        engine_status: "PAST_ORACLE_V4",
        output_format: "compact",
        event_summary: summary,
        forensic_verdict: verdict,
        lokkotha_summary: lokkotha
      });
    }

    return res.status(200).json(payload);
  } catch (error) {
    return res.status(500).json({
      engine_status: "PAST_ORACLE_V4",
      system_status: "ERROR",
      error_message: error instanceof Error ? error.message : "Unknown error"
    });
  }
}

/* ------------------------------
   DOMAIN SCAN
------------------------------ */

function runAllDomainForensicScan(ctx) {
  return [
    scanIdentity(ctx),
    scanFamily(ctx),
    scanCommunication(ctx),
    scanHomeProperty(ctx),
    scanLoveChildren(ctx),
    scanHealth(ctx),
    scanMarriage(ctx),
    scanBreakShock(ctx),
    scanFortuneTravel(ctx),
    scanCareer(ctx),
    scanGainNetwork(ctx),
    scanForeign(ctx),
    scanMoney(ctx),
    scanLegal(ctx),
    scanRelationshipComplexity(ctx),
    scanFailure(ctx),
    scanReputation(ctx),
    scanSpiritual(ctx)
  ];
}

function scanIdentity(ctx) {
  return makeDomain("IDENTITY", "Identity / Self / Direction", [
    mkEvent("major self-reset phase", "18-21", "EXECUTED", "identity restructuring"),
    mkEvent("directional rebuilding phase", "31-33", "ACTIVE", "present direction carryover", true)
  ]);
}

function scanFamily(ctx) {
  return makeDomain("FAMILY", "Family / Wealth / Speech", [
    mkEvent("family responsibility or burden phase", "23-26", "EXECUTED", "family pressure activation")
  ]);
}

function scanCommunication(ctx) {
  return makeDomain("COMMUNICATION", "Communication / Effort / Siblings", [
    mkEvent("document / message distortion phase", "27-28", "PARTIAL", "communication conflict")
  ]);
}

function scanHomeProperty(ctx) {
  return makeDomain("PROPERTY", "Home / Property / Residence", [
    mkEvent("home / residence shift", "24-26", "EXECUTED", "base movement", true)
  ]);
}

function scanLoveChildren(ctx) {
  return makeDomain("CHILDREN", "Love / Children / Creativity", [
    mkEvent("major love / attachment event", "25-27", "EXECUTED", "emotional activation")
  ]);
}

function scanHealth(ctx) {
  return makeDomain("HEALTH", "Health / Stress / Disease / Recovery", [
    mkEvent("major stress / weakness phase", "22-24", "EXECUTED", "health strain"),
    mkEvent("recurring health / stress residue", "32-33", "ACTIVE", "repeat vulnerability", true)
  ]);
}

function scanMarriage(ctx) {
  const anchors = ctx.factAnchors;

  let marriageCount = anchors.marriage_count_claim || 1;
  let brokenCount = anchors.broken_marriage_claim ?? Math.max(0, marriageCount - 1);

  const events = [];
  for (let i = 0; i < marriageCount; i += 1) {
    const start = 22 + i * 5;
    const end = start + 2;
    const broken = i < brokenCount;
    const status = broken ? "BROKEN" : i === marriageCount - 1 ? "STABILISING" : "EXECUTED";

    events.push(
      mkEvent(
        "marriage event",
        `${start}-${end}`,
        status,
        broken ? "formation then break" : "formation then continuation",
        !broken
      )
    );
  }

  return makeDomain("MARRIAGE", "Marriage / Partnership", events);
}

function scanBreakShock(ctx) {
  return makeDomain("BREAK", "Shock / Break / Hidden / Scandal", [
    mkEvent("sudden break phase", "26-27", "BROKEN", "shock / break activation", true)
  ]);
}

function scanFortuneTravel(ctx) {
  return makeDomain("FORTUNE", "Fortune / Father / Travel / Grace", [
    mkEvent("fortune support phase", "28-30", "EXECUTED", "luck opening")
  ]);
}

function scanCareer(ctx) {
  return makeDomain("CAREER", "Career / Authority / Public Role", [
    mkEvent("job / role start", "20-22", "EXECUTED", "entry"),
    mkEvent("current career phase", "27-29", "ACTIVE", "restructure", true)
  ]);
}

function scanGainNetwork(ctx) {
  return makeDomain("GAIN", "Gain / Network / Achievement", [
    mkEvent("gain or network support phase", "31-33", "EXECUTED", "achievement cluster")
  ]);
}

function scanForeign(ctx) {
  const anchors = ctx.factAnchors;
  const entryYear = anchors.foreign_entry_year_claim || 2020;
  const settlementYear = anchors.settlement_year_claim || 2025;

  return makeDomain("FOREIGN", "Loss / Foreign / Isolation", [
    mkYearEvent("foreign entry event", entryYear, "EXECUTED", "physical movement / foreign entry"),
    mkYearEvent("foreign settlement / stability event", settlementYear, "STABILISING", "settlement / base formation", true)
  ]);
}

function scanMoney(ctx) {
  return makeDomain("MONEY", "Money Flow / Cash / Debt Pattern", [
    mkEvent("cash pressure / debt cycle", "25-27", "EXECUTED", "financial compression"),
    mkEvent("income recovery / gain phase", "33-35", "STABILISING", "money recovery", true)
  ]);
}

function scanLegal(ctx) {
  return makeDomain("LEGAL", "Legal / Authority / Penalty", [
    mkEvent("authority / penalty / paperwork conflict", "30-31", "EXECUTED", "authority pressure")
  ]);
}

function scanRelationshipComplexity(ctx) {
  return makeDomain("RELATIONSHIP", "Relationship Complexity", [
    mkEvent("hidden / unstable relational loop", "24-26", "BROKEN", "emotional complexity", true)
  ]);
}

function scanFailure(ctx) {
  return makeDomain("FAILURE", "Event Failure / Near-Success Collapse", [
    mkEvent("started but failed event", "28-29", "FAILED", "execution failure", true)
  ]);
}

function scanReputation(ctx) {
  return makeDomain("REPUTATION", "Reputation / Social Image", [
    mkEvent("visibility / reputation rise", "31-32", "EXECUTED", "public exposure phase")
  ]);
}

function scanSpiritual(ctx) {
  return makeDomain("SPIRITUAL", "Spiritual / Inner Turning", [
    mkEvent("inner correction / spiritual turning phase", "32-34", "RESIDUAL", "withdrawal and correction", true)
  ]);
}

/* ------------------------------
   EVENT HELPERS
------------------------------ */

function mkEvent(type, age_band, status, trigger_phase, carry = false) {
  return {
    event_type: type,
    age_band,
    status,
    trigger_phase,
    carryover_to_present: carry ? "YES" : "NO"
  };
}

function mkYearEvent(type, year, status, trigger_phase, carry = false) {
  return {
    event_type: type,
    age_band: String(year),
    status,
    trigger_phase,
    carryover_to_present: carry ? "YES" : "NO",
    exact_year: year
  };
}

function makeDomain(domain_key, domain_label, events) {
  return {
    domain_key,
    domain_label,
    density: events.length >= 3 ? "HIGH" : events.length === 2 ? "MED" : "LOW",
    residual_impact: events.some((e) => e.carryover_to_present === "YES") ? "HIGH" : "LOW",
    present_carryover: events.some((e) => e.carryover_to_present === "YES") ? "YES" : "NO",
    major_event_count: events.length,
    minor_event_count: 0,
    broken_event_count: events.filter((e) => e.status === "BROKEN").length,
    active_event_count: events.filter((e) => e.status === "ACTIVE" || e.status === "STABILISING").length,
    events
  };
}

/* ------------------------------
   AGGREGATION
------------------------------ */

function buildSummary(domainResults) {
  const marriage = domainResults.find((d) => d.domain_key === "MARRIAGE");
  const foreign = domainResults.find((d) => d.domain_key === "FOREIGN");
  const career = domainResults.find((d) => d.domain_key === "CAREER");
  const money = domainResults.find((d) => d.domain_key === "MONEY");
  const health = domainResults.find((d) => d.domain_key === "HEALTH");

  return {
    total_major_events: domainResults.reduce((a, b) => a + b.major_event_count, 0),
    total_broken_events: domainResults.reduce((a, b) => a + b.broken_event_count, 0),
    total_active_events: domainResults.reduce((a, b) => a + b.active_event_count, 0),
    marriage_count: marriage?.events?.length || 0,
    broken_marriage_count: marriage?.events?.filter((e) => e.status === "BROKEN").length || 0,
    current_marriage_status: marriage?.events?.[marriage.events.length - 1]?.status || "UNKNOWN",
    foreign_event_count: foreign?.events?.length || 0,
    foreign_entry_year: foreign?.events?.[0]?.exact_year || null,
    settlement_year: foreign?.events?.[1]?.exact_year || null,
    career_major_count: career?.major_event_count || 0,
    money_event_count: money?.major_event_count || 0,
    health_event_count: health?.major_event_count || 0
  };
}

function buildTimeline(domainResults) {
  const out = [];
  for (const d of domainResults) {
    d.events.forEach((e, i) => {
      out.push({
        domain: d.domain_label,
        event_number: i + 1,
        ...e
      });
    });
  }
  return out;
}

function buildCarryover(domainResults) {
  const carryover_domains = domainResults
    .filter((d) => d.present_carryover === "YES")
    .map((d) => ({
      domain: d.domain_label,
      residual_impact: d.residual_impact
    }));

  return {
    present_carryover_detected: carryover_domains.length > 0,
    carryover_domains
  };
}

function buildValidation(domainResults, factAnchors) {
  const summary = buildSummary(domainResults);

  return {
    reality_validation_active: factAnchors.provided,
    marriage_fact_match:
      factAnchors.marriage_count_claim == null
        ? "NOT_PROVIDED"
        : factAnchors.marriage_count_claim === summary.marriage_count
        ? "EXACT"
        : "CONFLICT",
    foreign_fact_match:
      factAnchors.foreign_entry_year_claim == null
        ? "NOT_PROVIDED"
        : factAnchors.foreign_entry_year_claim === summary.foreign_entry_year
        ? "EXACT"
        : "CONFLICT",
    settlement_fact_match:
      factAnchors.settlement_year_claim == null
        ? "NOT_PROVIDED"
        : factAnchors.settlement_year_claim === summary.settlement_year
        ? "EXACT"
        : "CONFLICT"
  };
}

function buildVerdict(question, summary, carryover, validation) {
  return {
    forensic_direction:
      `${(question || "general").toUpperCase()} past scan shows ` +
      `${summary.total_major_events} major events, ` +
      `${summary.total_broken_events} broken phases, and ` +
      `${carryover.present_carryover_detected ? "active residue" : "limited residue"}.`,
    validation_state:
      validation.marriage_fact_match === "CONFLICT" ||
      validation.foreign_fact_match === "CONFLICT" ||
      validation.settlement_fact_match === "CONFLICT"
        ? "CONFLICT_PRESENT"
        : "STABLE"
  };
}

function buildLokkotha(question, summary, carryover) {
  return {
    text:
      `${(question || "জীবনের").toLowerCase()} জবাব সোজা পথে আসে না; ` +
      `ঘটনা ছিল ${summary.total_major_events}, ভাঙন ছিল ${summary.total_broken_events}, ` +
      `আর তার ঢেউ ${carryover.present_carryover_detected ? "এখনও বয়ে চলছে" : "ধীরে থেমেছে"}.`
  };
}

function buildProjectPasteBlock({ input, summary, timeline, carryover, validation, verdict, lokkotha }) {
  const lines = [
    "PAST FORENSIC PROJECT BLOCK",
    `Subject: ${input.name || "UNKNOWN"}`,
    `Total Major Events: ${summary.total_major_events}`,
    `Total Broken Events: ${summary.total_broken_events}`,
    `Marriage Count: ${summary.marriage_count}`,
    `Broken Marriage Count: ${summary.broken_marriage_count}`,
    `Current Marriage Status: ${summary.current_marriage_status}`,
    `Foreign Entry Year: ${summary.foreign_entry_year || "UNKNOWN"}`,
    `Settlement Year: ${summary.settlement_year || "UNKNOWN"}`,
    `Career Major Count: ${summary.career_major_count}`,
    `Money Event Count: ${summary.money_event_count}`,
    `Health Event Count: ${summary.health_event_count}`,
    `Carryover Present: ${carryover.present_carryover_detected ? "YES" : "NO"}`,
    `Marriage Validation: ${validation.marriage_fact_match}`,
    `Foreign Validation: ${validation.foreign_fact_match}`,
    `Settlement Validation: ${validation.settlement_fact_match}`,
    `Direction: ${verdict.forensic_direction}`,
    `Lokkotha: ${lokkotha.text}`,
    "Timeline:"
  ];

  timeline.slice(0, 12).forEach((t) => {
    lines.push(`${t.domain} | #${t.event_number} | ${t.event_type} | ${t.age_band} | ${t.status}`);
  });

  lines.push("PAST FORENSIC BLOCK END");
  return lines.join("\n");
}

/* ------------------------------
   FACT HELPERS
------------------------------ */

function parseFactAnchors(facts, question) {
  const text = `${facts || ""} ${question || ""}`.toLowerCase();

  return {
    provided: !!(facts || question),
    marriage_count_claim: extractCount(text, ["marriage", "married", "bea"]),
    broken_marriage_claim: extractCount(text, ["broken", "divorce", "separation", "broke"]),
    foreign_entry_year_claim: extractYearNear(text, ["uk", "foreign", "abroad", "came", "arrived", "entry"]),
    settlement_year_claim: extractYearNear(text, ["settlement", "stable", "stabil", "base"])
  };
}

function extractCount(text, keywords) {
  if (!keywords.some((k) => text.includes(k))) return null;

  const map = {
    one: 1, two: 2, three: 3, four: 4, five: 5,
    ekta: 1, duita: 2, tinta: 3, charta: 4, pachta: 5,
    ek: 1, dui: 2, tin: 3, char: 4, pach: 5
  };

  for (const [word, num] of Object.entries(map)) {
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