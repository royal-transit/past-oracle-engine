// lib/layer-intelligence.js
// CRASH-SAFE QUESTION / DOMAIN INTELLIGENCE LAYER

function text(v) {
  return String(v || "").trim();
}

function low(v) {
  return text(v).toLowerCase();
}

function hasAny(src, arr) {
  const s = low(src);
  return arr.some((x) => s.includes(low(x)));
}

function detectPrimaryDomain(question = "") {
  const q = low(question);

  if (hasAny(q, ["foreign", "abroad", "uk", "visa", "immigration", "ilr", "settlement", "bidesh"])) return "FOREIGN";
  if (hasAny(q, ["marriage", "biye", "relationship", "love", "divorce", "separation"])) return "RELATIONSHIP";
  if (hasAny(q, ["job", "career", "work", "business", "employment"])) return "WORK";
  if (hasAny(q, ["money", "income", "debt", "finance", "property", "house", "land"])) return "MONEY";
  if (hasAny(q, ["health", "mental", "stress", "fear", "anxiety", "disease"])) return "HEALTH";
  if (hasAny(q, ["legal", "case", "court", "authority", "document", "paperwork"])) return "LEGAL";
  if (hasAny(q, ["family", "children", "parents", "father", "mother"])) return "FAMILY";
  if (hasAny(q, ["study", "education", "school", "college", "university"])) return "EDUCATION";

  return "GENERAL";
}

function buildQuestionIntent(question = "") {
  const q = low(question);

  return {
    asks_marriage: hasAny(q, ["marriage", "biye"]),
    asks_divorce: hasAny(q, ["divorce", "separation", "talak"]),
    asks_foreign: hasAny(q, ["foreign", "abroad", "uk", "visa", "immigration", "ilr", "settlement", "bidesh"]),
    asks_settlement: hasAny(q, ["settlement", "ilr", "permanent", "citizenship"]),
    asks_education: hasAny(q, ["study", "education", "school", "college", "university"]),
    asks_job: hasAny(q, ["job", "employment", "service"]),
    asks_business: hasAny(q, ["business", "trade", "shop", "company"]),
    asks_money: hasAny(q, ["money", "income", "debt", "finance"]),
    asks_property: hasAny(q, ["property", "house", "land", "flat", "home"]),
    asks_health: hasAny(q, ["health", "disease", "ill", "hospital"]),
    asks_mental: hasAny(q, ["mental", "stress", "fear", "anxiety", "depression"]),
    asks_legal: hasAny(q, ["legal", "case", "court", "authority", "document", "paperwork"]),
    asks_family: hasAny(q, ["family", "parents", "father", "mother"]),
    asks_children: hasAny(q, ["children", "child", "son", "daughter"]),
    asks_general: true
  };
}

function safeRankDomains(domainResults = []) {
  const arr = Array.isArray(domainResults) ? [...domainResults] : [];

  return arr.sort((a, b) => {
    const sa = Number(a?.normalized_score ?? a?.rank_score ?? 0);
    const sb = Number(b?.normalized_score ?? b?.rank_score ?? 0);
    return sb - sa;
  });
}

function buildLinkedDomainExpansion(primaryDomain) {
  const map = {
    FOREIGN: ["FOREIGN", "IMMIGRATION", "VISA", "SETTLEMENT", "LEGAL", "DOCUMENT"],
    RELATIONSHIP: ["MARRIAGE", "DIVORCE", "PARTNERSHIP", "FAMILY", "CHILDREN"],
    WORK: ["JOB", "CAREER", "BUSINESS", "MONEY", "LEGAL"],
    MONEY: ["MONEY", "DEBT", "PROPERTY", "BUSINESS", "JOB"],
    HEALTH: ["HEALTH", "MENTAL"],
    LEGAL: ["LEGAL", "DOCUMENT", "FOREIGN", "JOB"],
    FAMILY: ["FAMILY", "CHILDREN", "MARRIAGE", "PROPERTY"],
    EDUCATION: ["EDUCATION", "JOB", "FOREIGN"]
  };

  return map[primaryDomain] || [];
}

function buildCarryover(domainResults = []) {
  const ranked = safeRankDomains(domainResults);
  const top = ranked.slice(0, 5);

  const present_carryover_detected = top.some((d) => {
    if (String(d?.present_carryover || "").toUpperCase() === "YES") return true;
    const events = Array.isArray(d?.events) ? d.events : [];
    return events.some((e) => String(e?.carryover_to_present || "").toUpperCase() === "YES");
  });

  return {
    present_carryover_detected,
    top_domains_checked: top.map((d) => d?.domain_key || d?.domain_label || "UNKNOWN")
  };
}

export function runIntelligenceLayer({ domainResults = [], question = "" } = {}) {
  const primary_domain = detectPrimaryDomain(question);
  const ranked_domains = safeRankDomains(domainResults);
  const question_intent = buildQuestionIntent(question);

  return {
    question_profile: {
      primary_domain,
      question_intent
    },
    ranked_domains,
    linked_domain_expansion: buildLinkedDomainExpansion(primary_domain),
    carryover: buildCarryover(ranked_domains)
  };
}