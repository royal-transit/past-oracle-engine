// lib/layer-intelligence.js
// CRASH-SAFE QUESTION / DOMAIN INTELLIGENCE LAYER
// DOMAIN-SCOPED EXPANSION LOCK

function text(v) {
  return String(v || "").trim();
}

function low(v) {
  return text(v).toLowerCase();
}

function up(v) {
  return text(v).toUpperCase();
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
  if (hasAny(q, ["legal", "case", "court", "authority", "document", "paperwork", "appeal"])) return "LEGAL";
  if (hasAny(q, ["family", "children", "parents", "father", "mother"])) return "FAMILY";
  if (hasAny(q, ["study", "education", "school", "college", "university", "student"])) return "EDUCATION";

  return "GENERAL";
}

function buildQuestionIntent(question = "") {
  const q = low(question);

  return {
    asks_marriage: hasAny(q, ["marriage", "biye"]),
    asks_divorce: hasAny(q, ["divorce", "separation", "talak"]),
    asks_foreign: hasAny(q, ["foreign", "abroad", "uk", "visa", "immigration", "ilr", "settlement", "bidesh"]),
    asks_settlement: hasAny(q, ["settlement", "ilr", "permanent", "citizenship"]),
    asks_education: hasAny(q, ["study", "education", "school", "college", "university", "student"]),
    asks_job: hasAny(q, ["job", "employment", "service"]),
    asks_business: hasAny(q, ["business", "trade", "shop", "company"]),
    asks_money: hasAny(q, ["money", "income", "debt", "finance"]),
    asks_property: hasAny(q, ["property", "house", "land", "flat", "home"]),
    asks_health: hasAny(q, ["health", "disease", "ill", "hospital"]),
    asks_mental: hasAny(q, ["mental", "stress", "fear", "anxiety", "depression"]),
    asks_legal: hasAny(q, ["legal", "case", "court", "authority", "document", "paperwork", "appeal"]),
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
    FOREIGN: ["IMMIGRATION", "VISA", "FOREIGN", "SETTLEMENT", "DOCUMENT", "LEGAL"],
    RELATIONSHIP: ["MARRIAGE", "LOVE", "PARTNERSHIP", "DIVORCE", "FAMILY", "CHILDREN"],
    WORK: ["JOB", "CAREER", "BUSINESS", "SUCCESS", "MONEY", "LEGAL", "DOCUMENT"],
    MONEY: ["MONEY", "DEBT", "PROPERTY", "BUSINESS", "JOB", "GAIN", "LOSS"],
    HEALTH: ["HEALTH", "MENTAL", "MIND", "FAILURE"],
    LEGAL: ["LEGAL", "DOCUMENT", "AUTHORITY", "FOREIGN", "SETTLEMENT"],
    FAMILY: ["FAMILY", "CHILDREN", "MARRIAGE", "PROPERTY", "HOME"],
    EDUCATION: ["EDUCATION", "STUDY", "JOB", "FOREIGN", "VISA", "DOCUMENT"],
    GENERAL: []
  };

  return map[primaryDomain] || [];
}

function filterRankedByExpansion(rankedDomains, primaryDomain) {
  const expansion = buildLinkedDomainExpansion(primaryDomain);
  if (!expansion.length) return rankedDomains;

  const allowed = new Set(expansion.map(up));

  const scoped = rankedDomains.filter((d) => allowed.has(up(d?.domain_key)));
  const rest = rankedDomains.filter((d) => !allowed.has(up(d?.domain_key)));

  return [...scoped, ...rest];
}

function buildCarryover(domainResults = [], primaryDomain = "GENERAL") {
  const ranked = filterRankedByExpansion(safeRankDomains(domainResults), primaryDomain);
  const expansion = buildLinkedDomainExpansion(primaryDomain);
  const allowed = new Set(expansion.map(up));

  const top = expansion.length
    ? ranked.filter((d) => allowed.has(up(d?.domain_key))).slice(0, 5)
    : ranked.slice(0, 5);

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
  const ranked_domains = filterRankedByExpansion(safeRankDomains(domainResults), primary_domain);
  const question_intent = buildQuestionIntent(question);
  const linked_domain_expansion = buildLinkedDomainExpansion(primary_domain);

  return {
    question_profile: {
      primary_domain,
      question_intent
    },
    ranked_domains,
    linked_domain_expansion,
    carryover: buildCarryover(ranked_domains, primary_domain)
  };
}