// lib/layer-intelligence.js

const round2 = (n) =>
  Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;

const CORE_DOMAINS = new Set([
  "MARRIAGE",
  "DIVORCE",
  "RELATIONSHIP",
  "MULTIPLE_MARRIAGE",
  "FOREIGN",
  "SETTLEMENT",
  "IMMIGRATION",
  "VISA",
  "CAREER",
  "JOB",
  "BUSINESS",
  "MONEY",
  "DEBT",
  "GAIN",
  "LOSS",
  "HEALTH",
  "MENTAL",
  "DISEASE",
  "RECOVERY",
  "PROPERTY",
  "HOME",
  "LEGAL",
  "DOCUMENT",
  "FAMILY",
  "CHILDREN"
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
  "RELIGION",
  "SPIRITUAL",
  "TANTRIC",
  "SEX",
  "TRANSFORMATION"
]);

const EXACT_PRIORITY_DOMAINS = new Set([
  "MARRIAGE",
  "DIVORCE",
  "FOREIGN",
  "SETTLEMENT",
  "HEALTH",
  "MENTAL",
  "DISEASE",
  "RECOVERY",
  "MONEY",
  "DEBT",
  "GAIN",
  "LOSS",
  "LEGAL",
  "DOCUMENT",
  "IMMIGRATION",
  "PROPERTY",
  "CAREER",
  "BUSINESS",
  "JOB"
]);

function hasAny(text, arr) {
  return arr.some((x) => text.includes(x));
}

function toYear(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeEventDate(event) {
  if (!event) {
    return {
      exact_date: null,
      date_marker: null
    };
  }

  const exactDate =
    event.exact_date ||
    event.exactDate ||
    null;

  const dateMarker =
    event.date_marker ??
    event.exact_year ??
    event.year ??
    null;

  return {
    exact_date: exactDate,
    date_marker: toYear(dateMarker)
  };
}

function buildQuestionFlags(question) {
  const q = String(question || "").toLowerCase();

  return {
    raw_question: question || "",
    asks_count: hasAny(q, ["koita", "how many", "count", "number", "mot", "total"]),
    asks_timing: hasAny(q, [
      "when",
      "kobe",
      "date",
      "year",
      "history",
      "timeline",
      "exact",
      "time"
    ]),
    asks_status: hasAny(q, ["current", "now", "status", "active", "ase", "ongoing"]),
    asks_general: false
  };
}

export function buildQuestionProfile(question) {
  const q = String(question || "").toLowerCase();

  const primary_domain =
    hasAny(q, ["marriage", "bea", "wife", "husband", "divorce"])
      ? "MARRIAGE"
      : hasAny(q, ["relationship", "love", "partner", "breakup", "affair"])
        ? "RELATIONSHIP"
        : hasAny(q, ["career", "job", "work", "business", "profession"])
          ? "CAREER"
          : hasAny(q, ["money", "income", "cash", "debt", "finance", "loss", "gain"])
            ? "MONEY"
            : hasAny(q, ["foreign", "abroad", "uk", "visa", "migration", "settlement"])
              ? "FOREIGN"
              : hasAny(q, ["health", "disease", "hospital", "stress", "illness", "surgery"])
                ? "HEALTH"
                : hasAny(q, ["property", "land", "house", "home", "flat"])
                  ? "PROPERTY"
                  : hasAny(q, ["legal", "court", "penalty", "case", "authority", "document"])
                    ? "LEGAL"
                    : hasAny(q, ["child", "children", "daughter", "son"])
                      ? "CHILDREN"
                      : "GENERAL";

  const flags = buildQuestionFlags(question);

  return {
    ...flags,
    primary_domain,
    asks_general: primary_domain === "GENERAL"
  };
}

export function getLinkedDomains(primary) {
  const map = {
    MARRIAGE: [
      "MARRIAGE",
      "DIVORCE",
      "RELATIONSHIP",
      "LOVE",
      "MULTIPLE_MARRIAGE",
      "FAMILY",
      "CHILDREN",
      "PARTNERSHIP",
      "LEGAL"
    ],
    RELATIONSHIP: [
      "RELATIONSHIP",
      "LOVE",
      "MARRIAGE",
      "DIVORCE",
      "FAMILY"
    ],
    CAREER: [
      "CAREER",
      "JOB",
      "BUSINESS",
      "MONEY",
      "GAIN",
      "FAILURE",
      "REPUTATION",
      "AUTHORITY",
      "LEGAL",
      "DOCUMENT"
    ],
    MONEY: [
      "MONEY",
      "DEBT",
      "GAIN",
      "LOSS",
      "CAREER",
      "BUSINESS",
      "LEGAL",
      "DOCUMENT"
    ],
    FOREIGN: [
      "FOREIGN",
      "SETTLEMENT",
      "IMMIGRATION",
      "VISA",
      "PROPERTY",
      "DOCUMENT"
    ],
    HEALTH: [
      "HEALTH",
      "DISEASE",
      "RECOVERY",
      "MENTAL",
      "ACCIDENT",
      "SURGERY"
    ],
    PROPERTY: [
      "PROPERTY",
      "HOME",
      "SETTLEMENT",
      "FOREIGN",
      "VEHICLE"
    ],
    LEGAL: [
      "LEGAL",
      "DOCUMENT",
      "AUTHORITY",
      "IMMIGRATION",
      "DEBT",
      "BUSINESS"
    ],
    CHILDREN: [
      "CHILDREN",
      "LOVE",
      "MARRIAGE",
      "FAMILY"
    ],
    GENERAL: [
      "MARRIAGE",
      "DIVORCE",
      "MULTIPLE_MARRIAGE",
      "FOREIGN",
      "SETTLEMENT",
      "IMMIGRATION",
      "VISA",
      "CAREER",
      "JOB",
      "BUSINESS",
      "MONEY",
      "DEBT",
      "GAIN",
      "LOSS",
      "HEALTH",
      "MENTAL",
      "DISEASE",
      "RECOVERY",
      "PROPERTY",
      "HOME",
      "VEHICLE",
      "FAMILY",
      "RELATIONSHIP",
      "LOVE",
      "LEGAL",
      "DOCUMENT",
      "AUTHORITY"
    ]
  };

  return map[primary] || map.GENERAL;
}

function domainPressureBoost(domainKey, questionProfile) {
  let boost = 0;
  const linked = getLinkedDomains(questionProfile.primary_domain);

  if (linked.includes(domainKey)) boost += 2.2;
  if (domainKey === questionProfile.primary_domain) boost += 4.2;

  if (questionProfile.primary_domain === "GENERAL") {
    if (NOISY_DOMAINS.has(domainKey)) boost -= 2.5;
    if (CORE_DOMAINS.has(domainKey)) boost += 1.6;

    if (
      [
        "MARRIAGE",
        "DIVORCE",
        "FOREIGN",
        "SETTLEMENT",
        "PROPERTY",
        "MENTAL",
        "IMMIGRATION",
        "HEALTH",
        "MONEY",
        "LEGAL"
      ].includes(domainKey)
    ) {
      boost += 1.4;
    }
  }

  return boost;
}

function exactResolverBand(domainKey) {
  if (["LEGAL", "DOCUMENT", "IMMIGRATION", "VISA"].includes(domainKey)) {
    return "09:00-13:00";
  }

  if (["MONEY", "DEBT", "GAIN", "LOSS", "BUSINESS"].includes(domainKey)) {
    return "10:00-15:00";
  }

  if (["HEALTH", "MENTAL", "DISEASE", "RECOVERY"].includes(domainKey)) {
    return "06:00-10:00";
  }

  if (["MARRIAGE", "DIVORCE", "RELATIONSHIP", "MULTIPLE_MARRIAGE"].includes(domainKey)) {
    return "16:00-22:00";
  }

  return "11:00-17:00";
}

function exactTypeBoost(domainKey, event) {
  const type = String(event?.event_type || "").toLowerCase();
  const trigger = String(event?.trigger_phase || "").toLowerCase();
  const status = String(event?.status || "").toUpperCase();
  let boost = 0;

  if (status === "BROKEN" || status === "ACTIVE" || status === "STABILISING" || status === "EXECUTED") {
    boost += 2.5;
  }

  if (["HEALTH", "MENTAL", "DISEASE", "RECOVERY"].includes(domainKey)) {
    if (hasAny(type, ["surgery", "acute", "collapse", "health", "disease", "stress", "weakness", "recovery"])) boost += 4;
    if (hasAny(trigger, ["strain", "imbalance", "repeat", "vulnerability", "intervention", "recovery"])) boost += 3.2;
  }

  if (["MONEY", "DEBT", "GAIN", "LOSS"].includes(domainKey)) {
    if (hasAny(type, ["debt", "loss", "gain", "cash", "money", "income", "pressure"])) boost += 4;
    if (hasAny(trigger, ["compression", "recovery", "gain", "loss", "financial"])) boost += 3.2;
  }

  if (["LEGAL", "DOCUMENT", "IMMIGRATION", "VISA"].includes(domainKey)) {
    if (hasAny(type, ["legal", "document", "approval", "penalty", "authority", "paperwork", "court"])) boost += 4;
    if (hasAny(trigger, ["approval", "paperwork", "authority", "penalty", "legal"])) boost += 3.2;
  }

  if (["MARRIAGE", "DIVORCE"].includes(domainKey)) {
    if (hasAny(type, ["marriage", "divorce", "separation", "union"])) boost += 4;
    if (hasAny(trigger, ["union", "break", "rupture", "continuation"])) boost += 3.2;
  }

  return boost;
}

function exactCandidateScore(domainKey, event, rankScore = 0) {
  const strength = String(event?.evidence_strength || "").toLowerCase();
  const importance = String(event?.importance || "").toUpperCase();
  const carryover = String(event?.carryover_to_present || "").toUpperCase();
  const normalized = normalizeEventDate(event);

  let score = 0;

  score += rankScore;
  score += exactTypeBoost(domainKey, event);

  if (strength === "strong") score += 5;
  else if (strength === "moderate") score += 3;
  else if (strength === "light") score += 1.5;

  if (importance === "MAJOR") score += 4;
  else if (importance === "MINOR") score += 1.5;

  if (carryover === "YES") score += 1.2;
  if (normalized.exact_date) score += 3.2;
  if (normalized.date_marker != null) score += 2.2;

  return round2(score);
}

function sortByScoreDesc(items) {
  return [...items].sort((a, b) => b.score - a.score);
}

function buildExactEventPacket(domainKey, domainLabel, rankScore, events) {
  if (!EXACT_PRIORITY_DOMAINS.has(domainKey)) {
    return {
      exact_resolver_active: false,
      primary_exact_event: null,
      alternative_exact_events: [],
      exact_time_band: null
    };
  }

  const usable = (events || []).filter((e) => e && e.event_type);

  if (!usable.length) {
    return {
      exact_resolver_active: false,
      primary_exact_event: null,
      alternative_exact_events: [],
      exact_time_band: null
    };
  }

  const candidates = usable
    .map((e) => {
      const normalized = normalizeEventDate(e);

      return {
        domain: domainLabel,
        domain_key: domainKey,
        event_type: e.event_type,
        status: e.status,
        trigger_phase: e.trigger_phase,
        evidence_strength: e.evidence_strength,
        importance: e.importance,
        exact_date: normalized.exact_date,
        date_marker: normalized.date_marker,
        exact_time_band: exactResolverBand(domainKey),
        score: exactCandidateScore(domainKey, e, rankScore)
      };
    })
    .filter((x) => x.exact_date || x.date_marker != null);

  if (!candidates.length) {
    return {
      exact_resolver_active: true,
      primary_exact_event: null,
      alternative_exact_events: [],
      exact_time_band: exactResolverBand(domainKey)
    };
  }

  const sorted = sortByScoreDesc(candidates);

  return {
    exact_resolver_active: true,
    primary_exact_event: sorted[0],
    alternative_exact_events: sorted.slice(1, 3),
    exact_time_band: sorted[0]?.exact_time_band || exactResolverBand(domainKey)
  };
}

function mergeExactResolvers(domain) {
  const exactPacket = buildExactEventPacket(
    domain.domain_key,
    domain.domain_label,
    domain.rank_score || domain.normalized_score || 0,
    domain.events || []
  );

  return {
    ...domain,
    ...exactPacket
  };
}

export function rankDomains(domainResults, questionProfile) {
  return domainResults
    .map((d) => {
      const boost = domainPressureBoost(d.domain_key, questionProfile);

      const ranked = {
        ...d,
        rank_score: round2((d.normalized_score || 0) + boost)
      };

      return mergeExactResolvers(ranked);
    })
    .sort((a, b) => b.rank_score - a.rank_score);
}

export function narrowCarryover(rankedDomains) {
  const priority = [
    "MARRIAGE",
    "SETTLEMENT",
    "PROPERTY",
    "MENTAL",
    "HEALTH",
    "BUSINESS",
    "CAREER",
    "IMMIGRATION",
    "MONEY",
    "LEGAL",
    "DEBT"
  ];

  const carryoverDomains = rankedDomains
    .filter(
      (d) =>
        d.present_carryover === "YES" &&
        priority.includes(d.domain_key)
    )
    .slice(0, 10)
    .map((d) => ({
      domain: d.domain_label,
      residual_impact: d.residual_impact
    }));

  return {
    present_carryover_detected: carryoverDomains.length > 0,
    carryover_domains: carryoverDomains
  };
}

function buildExactDomainSummary(rankedDomains) {
  const focusDomains = [
    "MARRIAGE",
    "DIVORCE",
    "HEALTH",
    "MENTAL",
    "DISEASE",
    "RECOVERY",
    "MONEY",
    "DEBT",
    "GAIN",
    "LOSS",
    "LEGAL",
    "DOCUMENT",
    "IMMIGRATION"
  ];

  return rankedDomains
    .filter((d) => focusDomains.includes(d.domain_key))
    .filter((d) => d.exact_resolver_active)
    .slice(0, 12)
    .map((d) => ({
      domain_key: d.domain_key,
      domain_label: d.domain_label,
      exact_time_band: d.exact_time_band || null,
      primary_exact_event: d.primary_exact_event || null,
      alternative_exact_events: d.alternative_exact_events || []
    }));
}

export function runIntelligenceLayer({ domainResults, question }) {
  const questionProfile = buildQuestionProfile(question);
  const linkedDomains = getLinkedDomains(questionProfile.primary_domain);
  const rankedDomains = rankDomains(domainResults, questionProfile);
  const carryover = narrowCarryover(rankedDomains);
  const exact_domain_summary = buildExactDomainSummary(rankedDomains);

  return {
    question_profile: questionProfile,
    linked_domain_expansion: linkedDomains,
    ranked_domains: rankedDomains,
    carryover,
    exact_domain_summary
  };
}