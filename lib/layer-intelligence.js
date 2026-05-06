// lib/layer-intelligence.js
// FULL REPLACEMENT — UNIVERSAL INTELLIGENCE RANKING GATE V9
// Purpose:
// - prevents every full-birth sector becoming equal top result
// - keeps full domain scan intact
// - client-facing event visibility limited to strongest / asked / linked sectors
// - GENERAL scan = strongest 5–7 sectors only
// - specific question = asked sector + linked sectors only
// - full domains remain available with suppressed_events metadata

function str(v) {
  return v == null ? "" : String(v).trim();
}

function low(v) {
  return str(v).toLowerCase();
}

function up(v) {
  return str(v).toUpperCase();
}

function safeArray(v) {
  return Array.isArray(v) ? v : [];
}

function round2(n) {
  return Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;
}

function hasAny(text, arr) {
  const t = low(text);
  return arr.some((x) => t.includes(low(x)));
}

const DOMAIN_GROUPS = {
  RELATIONSHIP: ["LOVE", "MARRIAGE", "DIVORCE", "MULTIPLE_MARRIAGE", "PARTNERSHIP"],
  FOREIGN: ["FOREIGN", "IMMIGRATION", "VISA", "SETTLEMENT", "DOCUMENT"],
  WORK: ["EDUCATION", "JOB", "CAREER", "BUSINESS", "SUCCESS", "NETWORK"],
  MONEY: ["MONEY", "DEBT", "GAIN", "LOSS", "PROPERTY", "VEHICLE"],
  HEALTH: ["HEALTH", "MENTAL"],
  CONFLICT: ["LEGAL", "DOCUMENT", "ENEMY", "BLOCKAGE", "FAILURE"],
  FAMILY: ["FAMILY", "HOME", "CHILDREN"],
  SPIRITUAL: ["SPIRITUAL", "RELIGION", "MIND", "IDENTITY"]
};

const DOMAIN_TO_GROUP = Object.fromEntries(
  Object.entries(DOMAIN_GROUPS).flatMap(([group, keys]) =>
    keys.map((k) => [k, group])
  )
);

function detectQuestionIntent(question = "") {
  const q = low(question);

  const asks_marriage = hasAny(q, ["marriage", "married", "wife", "husband", "spouse", "biye", "bea", "nikah"]);
  const asks_divorce = hasAny(q, ["divorce", "separation", "separated", "talak", "break"]);
  const asks_foreign = hasAny(q, ["foreign", "abroad", "uk", "visa", "immigration", "bidesh", "relocation"]);
  const asks_settlement = hasAny(q, ["settlement", "ilr", "permanent", "citizenship", "settled"]);
  const asks_education = hasAny(q, ["education", "study", "student", "university", "college", "exam"]);
  const asks_job = hasAny(q, ["job", "work", "employment", "career", "salary", "office"]);
  const asks_business = hasAny(q, ["business", "trade", "client", "company", "shop", "deal"]);
  const asks_money = hasAny(q, ["money", "income", "cash", "profit", "loss", "debt", "loan"]);
  const asks_property = hasAny(q, ["property", "house", "home", "land", "flat", "vehicle", "car"]);
  const asks_health = hasAny(q, ["health", "illness", "disease", "surgery", "hospital", "body"]);
  const asks_mental = hasAny(q, ["mental", "stress", "depression", "anxiety", "fear", "mind"]);
  const asks_legal = hasAny(q, ["legal", "court", "case", "tribunal", "appeal", "penalty"]);
  const asks_family = hasAny(q, ["family", "mother", "father", "parent", "baba", "ma"]);
  const asks_children = hasAny(q, ["child", "children", "baby", "son", "daughter", "pregnancy"]);
  const asks_spiritual = hasAny(q, ["spiritual", "religion", "allah", "dharma", "zikr", "sadhana"]);

  const anySpecific =
    asks_marriage ||
    asks_divorce ||
    asks_foreign ||
    asks_settlement ||
    asks_education ||
    asks_job ||
    asks_business ||
    asks_money ||
    asks_property ||
    asks_health ||
    asks_mental ||
    asks_legal ||
    asks_family ||
    asks_children ||
    asks_spiritual;

  return {
    asks_marriage,
    asks_divorce,
    asks_foreign,
    asks_settlement,
    asks_education,
    asks_job,
    asks_business,
    asks_money,
    asks_property,
    asks_health,
    asks_mental,
    asks_legal,
    asks_family,
    asks_children,
    asks_spiritual,
    asks_general: !anySpecific
  };
}

function primaryDomainFromIntent(intent) {
  if (intent.asks_divorce) return "DIVORCE";
  if (intent.asks_marriage) return "MARRIAGE";
  if (intent.asks_settlement) return "SETTLEMENT";
  if (intent.asks_foreign) return "FOREIGN";
  if (intent.asks_business) return "BUSINESS";
  if (intent.asks_job) return "JOB";
  if (intent.asks_education) return "EDUCATION";
  if (intent.asks_money) return "MONEY";
  if (intent.asks_property) return "PROPERTY";
  if (intent.asks_health) return "HEALTH";
  if (intent.asks_mental) return "MENTAL";
  if (intent.asks_legal) return "LEGAL";
  if (intent.asks_children) return "CHILDREN";
  if (intent.asks_family) return "FAMILY";
  if (intent.asks_spiritual) return "SPIRITUAL";
  return "GENERAL";
}

function linkedDomainsForPrimary(primary) {
  const map = {
    GENERAL: [],
    MARRIAGE: ["LOVE", "PARTNERSHIP", "DIVORCE", "MULTIPLE_MARRIAGE"],
    DIVORCE: ["MARRIAGE", "PARTNERSHIP", "MULTIPLE_MARRIAGE", "LEGAL"],
    MULTIPLE_MARRIAGE: ["MARRIAGE", "DIVORCE", "LOVE", "PARTNERSHIP"],
    FOREIGN: ["IMMIGRATION", "VISA", "SETTLEMENT", "DOCUMENT"],
    IMMIGRATION: ["FOREIGN", "VISA", "SETTLEMENT", "DOCUMENT"],
    VISA: ["FOREIGN", "IMMIGRATION", "DOCUMENT", "LEGAL"],
    SETTLEMENT: ["FOREIGN", "IMMIGRATION", "VISA", "DOCUMENT", "LEGAL"],
    JOB: ["CAREER", "MONEY", "DOCUMENT"],
    CAREER: ["JOB", "BUSINESS", "SUCCESS", "MONEY"],
    BUSINESS: ["CAREER", "MONEY", "PARTNERSHIP", "DOCUMENT"],
    EDUCATION: ["DOCUMENT", "FOREIGN", "CAREER"],
    MONEY: ["JOB", "BUSINESS", "DEBT", "GAIN", "LOSS"],
    PROPERTY: ["MONEY", "HOME", "VEHICLE", "DOCUMENT"],
    HEALTH: ["MENTAL", "DEBT", "LOSS"],
    MENTAL: ["HEALTH", "MIND", "SPIRITUAL"],
    LEGAL: ["DOCUMENT", "ENEMY", "BLOCKAGE", "MONEY"],
    FAMILY: ["HOME", "CHILDREN", "MONEY"],
    CHILDREN: ["FAMILY", "MARRIAGE", "HEALTH"],
    SPIRITUAL: ["MIND", "RELIGION", "IDENTITY"]
  };

  return map[primary] || [];
}

function evidenceWeight(domain) {
  const kp = Number(domain?.kp_weight || 0);
  const dasha = Number(domain?.dasha_weight || 0);
  const houseHits = safeArray(domain?.house_hits).length;
  const aspectHits = safeArray(domain?.aspect_hits).length;
  const direct = Number(domain?.direct_evidence_count || 0);
  const pattern = Number(domain?.pattern_evidence_count || 0);
  const support = Number(domain?.support_count || 0);

  let score = 0;
  score += kp * 1.65;
  score += dasha * 1.45;
  score += Math.min(houseHits, 5) * 0.75;
  score += Math.min(aspectHits, 6) * 0.35;
  score += direct * 4.5;
  score += pattern * 0.9;
  score += Math.min(support, 8) * 0.25;

  return round2(score);
}

function eventWeight(domain) {
  const events = safeArray(domain?.events);
  let score = 0;

  for (const e of events) {
    const status = up(e.status);
    const importance = up(e.importance);
    const evidence = up(e.evidence_type);
    const strength = low(e.evidence_strength);

    if (importance === "MAJOR") score += 2.0;
    if (importance === "MINOR") score += 0.6;

    if (status === "EXECUTED") score += 5.0;
    else if (status === "VERY_HIGH_PROBABILITY") score += 3.5;
    else if (status === "HIGH_PROBABILITY") score += 2.4;
    else if (status === "LIKELY_WINDOW") score += 1.4;
    else if (status === "PATTERN_ONLY") score += 0.7;

    if (["DIRECT", "DIRECT_FACT", "FACT_ANCHORED"].includes(evidence)) score += 4.0;
    if (["LIKELY_HISTORY", "PATTERN_CONFIRMED"].includes(evidence)) score += 1.5;
    if (evidence === "NAME_PATTERN") score += 0.8;

    if (strength.includes("strong")) score += 1.8;
    else if (strength.includes("moderate")) score += 1.0;
    else if (strength.includes("light")) score += 0.4;
  }

  return round2(score);
}

function groupPenalty(domain, seenGroups) {
  const group = DOMAIN_TO_GROUP[up(domain.domain_key)] || "OTHER";
  const count = seenGroups.get(group) || 0;

  if (count === 0) return 0;
  if (count === 1) return -1.15;
  if (count === 2) return -2.35;
  return -3.6;
}

function askedBoost(domainKey, questionProfile) {
  const primary = up(questionProfile.primary_domain);
  const linked = new Set(linkedDomainsForPrimary(primary));
  const key = up(domainKey);

  if (primary === "GENERAL") return 0;
  if (key === primary) return 6.5;
  if (linked.has(key)) return 3.3;
  return -2.6;
}

function calculateRankScore(domain, questionProfile, seenGroups) {
  const raw = Number(domain?.normalized_score || 0);
  const evi = evidenceWeight(domain);
  const ev = eventWeight(domain);
  const ask = askedBoost(domain?.domain_key, questionProfile);
  const density = up(domain?.density) === "HIGH" ? 1.2 : up(domain?.density) === "MED" ? 0.55 : 0;
  const residual = up(domain?.residual_impact) === "HIGH" ? 0.8 : up(domain?.residual_impact) === "MED" ? 0.35 : 0;
  const group = groupPenalty(domain, seenGroups);

  const score = raw * 0.62 + evi * 0.92 + ev * 0.74 + ask + density + residual + group;
  return round2(Math.max(0, score));
}

function presentationTier(index, domain, questionProfile) {
  const primary = up(questionProfile.primary_domain);
  const key = up(domain.domain_key);
  const linked = new Set(linkedDomainsForPrimary(primary));

  if (primary !== "GENERAL") {
    if (key === primary) return "PRIMARY";
    if (linked.has(key) && index <= 7) return "LINKED";
    if (index <= 10) return "SUPPORT";
    return "ARCHIVE";
  }

  if (index <= 4) return "PRIMARY";
  if (index <= 7) return "SECONDARY";
  if (index <= 12) return "SUPPORT";
  return "ARCHIVE";
}

function eventVisibilityAllowed(index, domain, questionProfile) {
  const tier = presentationTier(index, domain, questionProfile);

  if (["PRIMARY", "LINKED", "SECONDARY"].includes(tier)) return true;

  const hasDirect = Number(domain?.direct_evidence_count || 0) > 0;
  if (hasDirect && tier === "SUPPORT") return true;

  return false;
}

function compressDomainForPresentation(domain, index, questionProfile) {
  const allowEvents = eventVisibilityAllowed(index, domain, questionProfile);
  const originalEvents = safeArray(domain.events);

  if (allowEvents) {
    return {
      ...domain,
      presentation_tier: presentationTier(index, domain, questionProfile),
      client_visible: true,
      events: originalEvents,
      suppressed_events_count: 0,
      intelligence_gate_note: "VISIBLE_STRONG_OR_LINKED_DOMAIN"
    };
  }

  return {
    ...domain,
    presentation_tier: presentationTier(index, domain, questionProfile),
    client_visible: false,
    events: [],
    suppressed_events_count: originalEvents.length,
    major_event_count: 0,
    minor_event_count: 0,
    active_event_count: 0,
    broken_event_count: 0,
    final_state: "BACKGROUND_PATTERN",
    intelligence_gate_note: "BACKGROUND_SCAN_PRESERVED_EVENTS_SUPPRESSED"
  };
}

function rankDomains(domainResults, questionProfile) {
  const firstPass = safeArray(domainResults).map((d) => ({
    ...d,
    raw_normalized_score: Number(d?.normalized_score || 0)
  }));

  const preliminary = [...firstPass].sort((a, b) => {
    const ae = evidenceWeight(a) + eventWeight(a);
    const be = evidenceWeight(b) + eventWeight(b);
    if (be !== ae) return be - ae;
    return Number(b.normalized_score || 0) - Number(a.normalized_score || 0);
  });

  const seenGroups = new Map();

  const ranked = preliminary.map((domain) => {
    const score = calculateRankScore(domain, questionProfile, seenGroups);
    const group = DOMAIN_TO_GROUP[up(domain.domain_key)] || "OTHER";
    seenGroups.set(group, (seenGroups.get(group) || 0) + 1);

    return {
      ...domain,
      rank_score: score,
      rank_group: group
    };
  });

  ranked.sort((a, b) => {
    if (Number(b.rank_score || 0) !== Number(a.rank_score || 0)) {
      return Number(b.rank_score || 0) - Number(a.rank_score || 0);
    }
    return Number(b.raw_normalized_score || 0) - Number(a.raw_normalized_score || 0);
  });

  return ranked.map((domain, index) =>
    compressDomainForPresentation(domain, index, questionProfile)
  );
}

function buildCarryover(rankedDomains) {
  const visible = safeArray(rankedDomains).filter((d) => d.client_visible);

  const carryDomains = visible.filter((d) =>
    safeArray(d.events).some((e) => up(e.carryover_to_present) === "YES") ||
    ["EXECUTED", "VERY_HIGH_PROBABILITY", "HIGH_PROBABILITY"].includes(up(d.final_state))
  );

  return {
    present_carryover_detected: carryDomains.length > 0,
    top_domains_checked: visible.slice(0, 5).map((d) => d.domain_key),
    carryover_domains: carryDomains.slice(0, 5).map((d) => ({
      domain_key: d.domain_key,
      domain_label: d.domain_label,
      final_state: d.final_state,
      rank_score: d.rank_score
    }))
  };
}

function buildQuestionProfile(question) {
  const intent = detectQuestionIntent(question);
  const primary = primaryDomainFromIntent(intent);

  return {
    primary_domain: primary,
    question_intent: intent
  };
}

function buildLinkedExpansion(questionProfile) {
  const primary = up(questionProfile.primary_domain);
  return linkedDomainsForPrimary(primary).map((key) => ({
    primary_domain: primary,
    linked_domain: key,
    relation: "FORENSIC_SUPPORT_DOMAIN"
  }));
}

export function runIntelligenceLayer({ domainResults = [], question = "" }) {
  const question_profile = buildQuestionProfile(question);
  const linked_domain_expansion = buildLinkedExpansion(question_profile);

  const ranked_domains = safeArray(domainResults).length
    ? rankDomains(domainResults, question_profile)
    : [];

  const carryover = buildCarryover(ranked_domains);

  return {
    question_profile,
    linked_domain_expansion,
    ranked_domains,
    carryover,
    intelligence_gate: {
      version: "UNIVERSAL_INTELLIGENCE_RANKING_GATE_V9",
      full_domain_scan_preserved: true,
      client_visible_event_gate_active: true,
      primary_domain: question_profile.primary_domain,
      visible_domain_count: ranked_domains.filter((d) => d.client_visible).length,
      archived_domain_count: ranked_domains.filter((d) => !d.client_visible).length
    }
  };
}