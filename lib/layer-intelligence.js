// lib/fact-intelligence.js
// UNIVERSAL FACT INTELLIGENCE — COUNTRY / VISA / LIFE DOMAIN / NAME CHANGE / FAMILY / EDUCATION

function text(v) {
  return String(v || "").trim();
}

function low(v) {
  return text(v).toLowerCase();
}

function yearsFromText(src) {
  return [...low(src).matchAll(/\b(19|20)\d{2}\b/g)].map((m) => Number(m[0]));
}

function hasAny(src, arr) {
  const s = low(src);
  return arr.some((x) => s.includes(low(x)));
}

function yearNear(src, keywords) {
  const s = text(src);
  for (const kw of keywords) {
    const idx = low(s).indexOf(low(kw));
    if (idx === -1) continue;
    const tail = s.slice(idx, idx + 140);
    const m = tail.match(/\b(19|20)\d{2}\b/);
    if (m) return Number(m[0]);
  }
  return null;
}

function extractCount(src, words) {
  const map = {
    one: 1, two: 2, three: 3, four: 4, five: 5,
    ek: 1, ekta: 1, dui: 2, duita: 2, tin: 3, tinta: 3,
    char: 4, charta: 4, pach: 5, pachta: 5
  };

  for (const w of words) {
    const rx = new RegExp(`\\b(\\d+|one|two|three|four|five|ek|ekta|dui|duita|tin|tinta|char|charta|pach|pachta)\\s+${w}\\b`, "i");
    const m = text(src).match(rx);
    if (!m) continue;
    if (/^\d+$/.test(m[1])) return Number(m[1]);
    return map[low(m[1])] ?? null;
  }
  return null;
}

function detectCountry(src) {
  const s = low(src);

  const countries = [
    "uk", "united kingdom", "england", "britain",
    "usa", "united states", "america",
    "canada", "australia", "italy", "spain", "france", "germany",
    "bangladesh", "dubai", "uae", "saudi", "qatar", "malaysia"
  ];

  for (const c of countries) {
    if (s.includes(c)) return c.toUpperCase();
  }
  return null;
}

function detectVisaType(src) {
  const s = low(src);
  if (s.includes("student visa")) return "STUDENT_VISA";
  if (s.includes("work visa")) return "WORK_VISA";
  if (s.includes("spouse visa")) return "SPOUSE_VISA";
  if (s.includes("visitor visa")) return "VISITOR_VISA";
  if (s.includes("ilr")) return "ILR";
  if (s.includes("settlement")) return "SETTLEMENT";
  if (s.includes("appeal")) return "APPEAL";
  if (s.includes("citizenship")) return "CITIZENSHIP";
  if (s.includes("refusal") || s.includes("refused") || s.includes("rejected")) return "REFUSAL";
  return null;
}

export function parseUniversalFacts({ facts = "", question = "" } = {}) {
  const raw = `${facts || ""} ${question || ""}`.trim();
  const s = low(raw);
  const allYears = yearsFromText(raw);

  // relationship
  const marriage_count_claim = extractCount(raw, ["marriages?", "bea", "biye"]);
  const broken_marriage_claim = extractCount(raw, ["divorce", "broken", "separation", "talak"]);
  const children_count_claim = extractCount(raw, ["children", "kids", "sons", "daughters", "chele", "meye"]);

  // foreign / country / visa / settlement
  const country_claim = detectCountry(raw);
  const visa_type_claim = detectVisaType(raw);

  const foreign_entry_year_claim = yearNear(raw, [
    "uk", "abroad", "foreign", "moved", "entry", "came", "arrived",
    "student visa", "work visa", "spouse visa", "immigration", "visa"
  ]);

  const settlement_year_claim = yearNear(raw, [
    "ilr granted", "settlement granted", "settled", "permanent approved", "citizenship granted"
  ]);

  const settlement_applied_year_claim = yearNear(raw, [
    "ilr apply", "ilr applied", "settlement apply", "settlement applied",
    "applied ilr", "applied settlement", "citizenship apply", "citizenship applied"
  ]);

  const settlement_refusal_year_claim = yearNear(raw, [
    "refused", "refusal", "rejected"
  ]);

  const appeal_year_claim = yearNear(raw, [
    "appeal", "appealed", "appeal filed", "appeal ongoing"
  ]);

  // education
  const school_year_claim = yearNear(raw, [
    "school", "college", "university", "study", "education", "student", "masters", "degree"
  ]);

  // work / career / business
  const job_start_year_claim = yearNear(raw, [
    "job", "employment", "service", "worked", "joined", "career"
  ]);

  const business_start_year_claim = yearNear(raw, [
    "business", "company", "self-employed", "trade", "shop"
  ]);

  // property
  const property_year_claim = yearNear(raw, [
    "property", "house", "flat", "home", "land", "residence"
  ]);

  // legal
  const legal_year_claim = yearNear(raw, [
    "case", "court", "legal", "authority", "penalty", "fine"
  ]);

  // health
  const health_year_claim = yearNear(raw, [
    "health", "ill", "disease", "stress", "hospital", "mental", "depression", "anxiety"
  ]);

  // name change
  const name_change_claim = hasAny(s, [
    "changed name", "name changed", "renamed", "alias", "new identity", "different name"
  ]);

  // parent reference
  const father_mentioned = hasAny(s, ["father", "baba", "abbu", "pita"]);
  const mother_mentioned = hasAny(s, ["mother", "ma", "ammu", "mata"]);
  const parent_overlay_claim = father_mentioned || mother_mentioned;

  return {
    provided: !!raw,
    raw_text: s,
    all_years,

    marriage_count_claim,
    broken_marriage_claim,
    children_count_claim,

    country_claim,
    visa_type_claim,

    foreign_entry_year_claim,
    settlement_year_claim,
    settlement_applied_year_claim,
    settlement_refusal_year_claim,
    appeal_year_claim,

    school_year_claim,
    job_start_year_claim,
    business_start_year_claim,
    property_year_claim,
    legal_year_claim,
    health_year_claim,

    name_change_claim,
    parent_overlay_claim,
    father_mentioned,
    mother_mentioned
  };
}