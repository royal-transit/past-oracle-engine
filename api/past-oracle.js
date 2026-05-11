// api/past-oracle.js
// FULL REPLACEMENT — UNIVERSAL_PAST_NANO_SCANNER_V8.8_ELITE_RICH_GPT_SAFE
// Rule: NO PARTIAL PATCH. Full replacement only.
// Goal:
// 1) Existing backend pipeline intact.
// 2) GPT Action ResponseTooLargeError controlled.
// 3) Name-only mode rich/human readable.
// 4) Full rashi-style description included.
// 5) Timeline/domain/verdict preserved in GPT-safe size.
// 6) No defensive PARTIAL tone for name-only output.

import { buildChartCore } from "../lib/chart-core.js";
import { astroProvider } from "../lib/provider-adapter.js";
import { runIntelligenceLayer } from "../lib/layer-intelligence.js";
import { runAstroLayer, buildTimeline } from "../lib/layer-astro.js";
import { runEvidenceLayer } from "../lib/layer-evidence.js";
import { runEventFinalizer } from "../lib/event-finalizer.js";
import { runValidationLayer } from "../lib/layer-validation.js";
import { runTimelineCollapser } from "../lib/timeline-collapser.js";
import { runFactAnchorMerger } from "../lib/fact-anchor-merger.js";
import { buildIdentityPacket } from "../lib/identity-packet.js";
import { correctIdentityPacket } from "../lib/domain-corrector.js";

const ENGINE_STATUS = "UNIVERSAL_PAST_NANO_SCANNER_V8.8_ELITE_RICH_GPT_SAFE";

const LIMITS = {
  compactTimeline: 8,
  projectTimeline: 15,
  compactDomains: 8,
  projectDomains: 15,
  fullText: 12000,
  mediumText: 1600,
  shortText: 450,
  tinyText: 220,
  arraySoft: 15,
  arrayHard: 25
};

function str(v) {
  return v == null ? "" : String(v).trim();
}

function toNum(v) {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function normalizeFormat(v) {
  const x = str(v).toLowerCase();
  if (x === "json" || x === "full") return "json";
  if (x === "project") return "project";
  if (x === "compact") return "compact";
  return "project";
}

function safeArray(v) {
  return Array.isArray(v) ? v : [];
}

function clipText(v, limit = LIMITS.mediumText) {
  const s = str(v);
  if (!s) return "";
  return s.length > limit ? `${s.slice(0, limit)}...` : s;
}

function smallObj(obj, keys = []) {
  const out = {};
  for (const k of keys) {
    if (obj && Object.prototype.hasOwnProperty.call(obj, k)) out[k] = obj[k];
  }
  return out;
}

function pruneDeep(value, depth = 0) {
  if (value == null) return value;

  if (typeof value === "string") {
    if (depth >= 3) return clipText(value, LIMITS.tinyText);
    if (depth >= 2) return clipText(value, LIMITS.shortText);
    return clipText(value, LIMITS.mediumText);
  }

  if (typeof value !== "object") return value;

  if (Array.isArray(value)) {
    return value.slice(0, LIMITS.arraySoft).map((x) => pruneDeep(x, depth + 1));
  }

  if (depth >= 4) return "[TRUNCATED_OBJECT]";

  const out = {};
  for (const [k, v] of Object.entries(value)) {
    if (["debug", "debug_packet", "full_debug", "error_stack", "stack"].includes(k)) continue;
    out[k] = pruneDeep(v, depth + 1);
  }
  return out;
}

function extractAllYears(text) {
  return [...String(text || "").matchAll(/\b(19|20)\d{2}\b/g)].map((m) => Number(m[0]));
}

function hasAny(text, arr) {
  const src = String(text || "").toLowerCase();
  return arr.some((x) => src.includes(String(x).toLowerCase()));
}

function splitFactClauses(text) {
  return String(text || "")
    .replace(/\band then\b/gi, ",")
    .replace(/\bthen\b/gi, ",")
    .replace(/\bafter that\b/gi, ",")
    .replace(
      /\s+(?=(love|romance|relationship|entered uk|came to uk|arrived in uk|study started|started study|student visa|visa|marriage|married|divorce|separation|settlement|ilr|appeal|job started|business started|property|debt|mental|health)\b)/gi,
      ","
    )
    .split(/[,\n;|]+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function firstYearInText(text) {
  const m = String(text || "").match(/\b(19|20)\d{2}\b/);
  return m ? Number(m[0]) : null;
}

function escapeRx(s) {
  return String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function yearNear(src, keywords) {
  const text = String(src || "").toLowerCase();
  const clauses = splitFactClauses(text);

  for (const clause of clauses) {
    if (!hasAny(clause, keywords)) continue;
    const y = firstYearInText(clause);
    if (y != null) return y;
  }

  for (const kw of keywords) {
    const rx = new RegExp(`${escapeRx(kw)}\\s+(?:in\\s+|on\\s+|at\\s+)?((?:19|20)\\d{2})`, "i");
    const m = text.match(rx);
    if (m) return Number(m[1]);
  }

  return null;
}

function parseFlexibleCountToken(token) {
  const map = {
    one: 1, two: 2, three: 3, four: 4, five: 5,
    ek: 1, ekta: 1, dui: 2, duita: 2,
    tin: 3, tinta: 3, char: 4, charta: 4,
    pach: 5, pachta: 5
  };

  if (!token) return null;
  if (/^\d+$/.test(token)) return Number(token);
  return map[String(token).toLowerCase()] ?? null;
}

function extractCount(text, patterns) {
  for (const rx of patterns) {
    const m = String(text || "").match(rx);
    if (m) return parseFlexibleCountToken(m[1]);
  }
  return null;
}

function extractMarriageCount(text) {
  return extractCount(text, [
    /\b(\d+|one|two|three|four|five|ek|ekta|dui|duita|tin|tinta|char|charta|pach|pachta)\s+marriages?\b/i,
    /\b(\d+|one|two|three|four|five|ek|ekta|dui|duita|tin|tinta|char|charta|pach|pachta)\s+biye\b/i,
    /\b(\d+|one|two|three|four|five|ek|ekta|dui|duita|tin|tinta|char|charta|pach|pachta)\s+bea\b/i
  ]);
}

function extractBrokenMarriageCount(text) {
  return extractCount(text, [
    /\b(\d+|one|two|three|four|five|ek|ekta|dui|duita|tin|tinta|char|charta|pach|pachta)\s+divorce\b/i,
    /\b(\d+|one|two|three|four|five|ek|ekta|dui|duita|tin|tinta|char|charta|pach|pachta)\s+broken\b/i,
    /\b(\d+|one|two|three|four|five|ek|ekta|dui|duita|tin|tinta|char|charta|pach|pachta)\s+separation\b/i,
    /\b(\d+|one|two|three|four|five|ek|ekta|dui|duita|tin|tinta|char|charta|pach|pachta)\s+talak\b/i
  ]);
}

function parseFactAnchors(facts, question) {
  const rawText = `${facts || ""} ${question || ""}`.trim();
  const text = rawText.toLowerCase();
  const allYears = extractAllYears(text);

  return {
    provided: !!rawText,
    raw_text: clipText(text, 1000),
    marriage_count_claim: extractMarriageCount(text),
    broken_marriage_count: extractBrokenMarriageCount(text),
    love_year_claim: yearNear(text, ["love", "romance", "relationship started", "attachment"]),
    partnership_year_claim: yearNear(text, ["partnership", "contract", "partnered"]),
    marriage_year_claim: yearNear(text, ["married", "marriage", "biye", "bea", "nikah", "wedding"]),
    divorce_year_claim: yearNear(text, ["divorce", "separation", "separated", "talak", "broken marriage"]),
    broken_marriage_year_claim: yearNear(text, ["broken marriage", "marriage broken", "divorce", "separation"]),
    foreign_entry_year_claim: yearNear(text, [
      "entered uk", "came to uk", "came uk", "arrived in uk", "arrived uk",
      "foreign entry", "moved abroad", "moved to uk", "bidesh", "abroad"
    ]),
    student_visa_entry_year_claim: yearNear(text, [
      "student visa", "entered uk on student visa", "came on student visa", "arrived on student visa"
    ]),
    visa_year_claim: yearNear(text, ["visa", "permission", "approval"]),
    route_shift_year_claim: yearNear(text, [
      "10 year route", "10-year route", "family route", "partner route",
      "private life route", "ltr", "leave to remain", "route shift",
      "switched route", "switched to route", "got ltr", "ltr granted"
    ]),
    settlement_year_claim: yearNear(text, [
      "ilr granted", "settlement granted", "settled", "permanent approved",
      "citizenship granted", "ilr approved"
    ]),
    settlement_applied_year_claim: yearNear(text, [
      "ilr applied", "ilr apply", "applied ilr", "settlement applied",
      "settlement apply", "applied settlement"
    ]),
    settlement_refusal_year_claim: yearNear(text, [
      "ilr rejected", "ilr refused", "settlement rejected", "settlement refused",
      "rejected", "refused", "refusal", "denied"
    ]),
    appeal_year_claim: yearNear(text, ["appeal ongoing", "appeal filed", "appealed", "appeal", "tribunal"]),
    job_start_year_claim: yearNear(text, ["job started", "started job", "employment started", "work started"]),
    business_start_year_claim: yearNear(text, ["business started", "started business", "company started", "shop started", "trade started"]),
    study_start_year_claim: yearNear(text, ["study started", "started study", "school started", "college started", "university started", "enrolled"]),
    property_year_claim: yearNear(text, ["property", "house", "flat", "land", "home bought", "car bought", "vehicle bought"]),
    debt_year_claim: yearNear(text, ["debt", "loan", "liability"]),
    mental_year_claim: yearNear(text, ["mental", "stress", "depression", "anxiety"]),
    health_year_claim: yearNear(text, ["health", "illness", "hospital", "surgery"]),
    all_years: allYears.slice(0, 20)
  };
}

function titleCaseName(name) {
  return str(name)
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(" ");
}

function getInitialLetter(name) {
  const clean = str(name).replace(/[^A-Za-zঅ-হআ-ঔা-ৌঁংঃ]/g, "");
  return clean ? clean[0].toUpperCase() : null;
}

function nameNumber(name) {
  const map = {
    A: 1, I: 1, J: 1, Q: 1, Y: 1,
    B: 2, K: 2, R: 2,
    C: 3, G: 3, L: 3, S: 3,
    D: 4, M: 4, T: 4,
    E: 5, H: 5, N: 5, X: 5,
    U: 6, V: 6, W: 6,
    O: 7, Z: 7,
    F: 8, P: 8
  };

  const letters = str(name).toUpperCase().replace(/[^A-Z]/g, "").split("");
  const total = letters.reduce((sum, ch) => sum + (map[ch] || 0), 0);
  let reduced = total;
  while (reduced > 9) reduced = String(reduced).split("").reduce((a, b) => a + Number(b), 0);

  return {
    raw_total: total || null,
    reduced_number: total ? reduced : null,
    method: "Chaldean-style English name vibration"
  };
}

const SIGN_PROFILES = {
  ARIES: {
    sign: "Aries / মেষ",
    dates: "Mar 21 – Apr 20",
    element: "Fire",
    nature: "Cardinal",
    positive: ["Adventurous", "Energetic", "Pioneering", "Courageous", "Direct", "Action-first"],
    shadow: ["Quick-tempered", "Impulsive", "Restless", "Daredevil", "Ego-reactive"],
    bengali:
      "মেষ ধাঁচে মানুষ সামনে থেকে কাজ ধরতে চায়। অপেক্ষা কম পছন্দ করে। চাপ এলে দ্রুত action নেয়, কিন্তু রাগ বা তাড়াহুড়া control না করলে ভুল decision হতে পারে।"
  },
  TAURUS: {
    sign: "Taurus / বৃষ",
    dates: "Apr 21 – May 21",
    element: "Earth",
    nature: "Fixed",
    positive: ["Patient", "Reliable", "Warmhearted", "Persistent", "Determined", "Loyal"],
    shadow: ["Possessive", "Stubborn", "Self-indulgent", "Slow to change"],
    bengali:
      "বৃষ ধাঁচে মানুষ steady, practical এবং হিসাবী। একবার কিছু ধরলে ছাড়ে না। comfort, security, money stability ও loyalty খুব গুরুত্বপূর্ণ। কিন্তু stubbornness এবং possessive mood সমস্যা তৈরি করতে পারে।"
  },
  GEMINI: {
    sign: "Gemini / মিথুন",
    dates: "May 22 – Jun 21",
    element: "Air",
    nature: "Mutable",
    positive: ["Adaptable", "Versatile", "Communicative", "Witty", "Intellectual", "Curious"],
    shadow: ["Nervous", "Inconsistent", "Superficial", "Overthinking", "Scattered"],
    bengali:
      "মিথুন ধাঁচে মানুষ কথা, ভাবনা, connection ও information দিয়ে চলে। দ্রুত বুঝে, দ্রুত বদলায়। কিন্তু mind বেশি active হলে tension, inconsistency বা half-finished কাজ দেখা যায়।"
  },
  CANCER: {
    sign: "Cancer / কর্কট",
    dates: "Jun 22 – Jul 22",
    element: "Water",
    nature: "Cardinal",
    positive: ["Emotional", "Loving", "Protective", "Intuitive", "Imaginative", "Sympathetic"],
    shadow: ["Moody", "Clinging", "Unable to let go", "Over-emotional"],
    bengali:
      "কর্কট ধাঁচে মানুষ ভিতরে খুব sensitive। পরিবার, নিরাপত্তা, স্মৃতি ও emotional bond গভীর হয়। বাইরে strong দেখালেও ভিতরে অনেক কিছু জমে থাকে। mood swing ও past ছাড়তে না পারা challenge।"
  },
  LEO: {
    sign: "Leo / সিংহ",
    dates: "Jul 23 – Aug 21",
    element: "Fire",
    nature: "Fixed",
    positive: ["Generous", "Creative", "Warmhearted", "Faithful", "Loving", "Commanding"],
    shadow: ["Pompous", "Bossy", "Intolerant", "Recognition-hungry"],
    bengali:
      "সিংহ ধাঁচে মানুষ সম্মান, মর্যাদা ও recognition চায়। নেতৃত্ব দিতে পারে, নিজের presence তৈরি করে। কিন্তু ego hurt হলে distance, anger বা dominance বের হতে পারে।"
  },
  VIRGO: {
    sign: "Virgo / কন্যা",
    dates: "Aug 22 – Sep 23",
    element: "Earth",
    nature: "Mutable",
    positive: ["Modest", "Reliable", "Practical", "Diligent", "Analytical", "Meticulous"],
    shadow: ["Fussy", "Worrier", "Overcritical", "Harsh", "Perfectionist"],
    bengali:
      "কন্যা ধাঁচে মানুষ detail দেখে, ভুল ধরতে পারে, practical কাজ ভালো করে। কিন্তু অতিরিক্ত analysis, worry, criticism বা perfectionism সম্পর্ক ও decision slow করতে পারে।"
  },
  LIBRA: {
    sign: "Libra / তুলা",
    dates: "Sep 24 – Oct 23",
    element: "Air",
    nature: "Cardinal",
    positive: ["Diplomatic", "Charming", "Romantic", "Urbane", "Easygoing", "Peace-seeking"],
    shadow: ["Indecisive", "Changeable", "Easily influenced", "Flirtatious", "Self-indulgent"],
    bengali:
      "তুলা ধাঁচে মানুষ balance, relationship, beauty ও social harmony চায়। মানুষকে পড়তে পারে। কিন্তু decision delay, অন্যের influence, এবং ভিতরে ভিতরে দ্বন্দ্ব থাকতে পারে।"
  },
  SCORPIO: {
    sign: "Scorpio / বৃশ্চিক",
    dates: "Oct 24 – Nov 22",
    element: "Water",
    nature: "Fixed",
    positive: ["Determined", "Forceful", "Emotional", "Intuitive", "Powerful", "Magnetic"],
    shadow: ["Jealous", "Resentful", "Compulsive", "Obsessive", "Secretive", "Obstinate"],
    bengali:
      "বৃশ্চিক ধাঁচে মানুষ গভীর, silent, intense এবং ভিতরে হিসাবী। trust দিলে প্রাণ দেয়, কিন্তু betrayal হলে ভিতরে crack তৈরি হয়। secrecy, obsession ও control issue দেখা যেতে পারে।"
  },
  SAGITTARIUS: {
    sign: "Sagittarius / ধনু",
    dates: "Nov 23 – Dec 22",
    element: "Fire",
    nature: "Mutable",
    positive: ["Optimistic", "Freedom-loving", "Jovial", "Honest", "Intellectual", "Philosophical"],
    shadow: ["Careless", "Irresponsible", "Restless", "Tactless", "Over-optimistic"],
    bengali:
      "ধনু ধাঁচে মানুষ freedom, travel, learning ও truth চায়। বড় চিন্তা করে। কিন্তু বেশি optimistic বা restless হলে commitment ও detail miss হতে পারে।"
  },
  CAPRICORN: {
    sign: "Capricorn / মকর",
    dates: "Dec 23 – Jan 20",
    element: "Earth",
    nature: "Cardinal",
    positive: ["Practical", "Prudent", "Ambitious", "Disciplined", "Patient", "Careful"],
    shadow: ["Pessimistic", "Rigid", "Grudging", "Too serious", "Emotionally reserved"],
    bengali:
      "মকর ধাঁচে মানুষ দায়িত্ব, status, structure ও long-term result চায়। ধীরে চলে কিন্তু শক্ত ভিত্তি বানায়। চাপ বেশি হলে cold, rigid বা pessimistic হতে পারে।"
  },
  AQUARIUS: {
    sign: "Aquarius / কুম্ভ",
    dates: "Jan 21 – Feb 19",
    element: "Air",
    nature: "Fixed",
    positive: ["Friendly", "Humanitarian", "Honest", "Loyal", "Original", "Independent"],
    shadow: ["Detached", "Unemotional", "Contrary", "Unpredictable", "Stubborn"],
    bengali:
      "কুম্ভ ধাঁচে মানুষ independent, unusual, future-minded এবং নিজের নিয়মে চলে। বন্ধু/নেটওয়ার্কে শক্তি থাকে। কিন্তু emotionally detached বা unpredictable impression দিতে পারে।"
  },
  PISCES: {
    sign: "Pisces / মীন",
    dates: "Feb 20 – Mar 20",
    element: "Water",
    nature: "Mutable",
    positive: ["Imaginative", "Sensitive", "Compassionate", "Kind", "Selfless", "Intuitive"],
    shadow: ["Escapist", "Vague", "Weak-willed", "Easily led", "Idealistic"],
    bengali:
      "মীন ধাঁচে মানুষ sensitive, imaginative, spiritual ও emotional depth বহন করে। কিন্তু boundary weak হলে confusion, escapism বা অন্যের influence বেশি কাজ করতে পারে।"
  }
};

function fallbackSignByInitial(name) {
  const ch = getInitialLetter(name);
  const map = {
    A: "ARIES", T: "ARIES",
    B: "TAURUS", V: "TAURUS",
    C: "GEMINI", W: "GEMINI",
    D: "CANCER", O: "CANCER",
    E: "LEO", M: "LEO",
    F: "VIRGO", P: "VIRGO",
    G: "LIBRA", R: "LIBRA",
    H: "SCORPIO", N: "SCORPIO", X: "SCORPIO",
    I: "SAGITTARIUS", U: "SAGITTARIUS",
    J: "CAPRICORN", S: "CAPRICORN",
    K: "AQUARIUS", Q: "AQUARIUS", Z: "AQUARIUS",
    L: "PISCES", Y: "PISCES"
  };
  return map[ch] || "SCORPIO";
}

function extractNameRashi(identityPacket = {}) {
  return (
    identityPacket?.name_rashi_packet ||
    identityPacket?.rashi_packet ||
    identityPacket?.derived_rashi ||
    identityPacket?.name_profile?.derived_rashi ||
    identityPacket?.name_profile ||
    {}
  );
}

function extractNumerology(identityPacket = {}) {
  return (
    identityPacket?.numerology_packet ||
    identityPacket?.numerology ||
    identityPacket?.name_profile?.numerology ||
    {}
  );
}

function signKeyFromIdentity(identityPacket, inputName) {
  const r = extractNameRashi(identityPacket);
  const raw = String(
    r?.sign ||
      r?.rashi ||
      r?.name_rashi ||
      r?.derived_rashi ||
      r?.signature ||
      ""
  ).toUpperCase();

  for (const key of Object.keys(SIGN_PROFILES)) {
    if (raw.includes(key)) return key;
  }

  const bnMap = {
    "মেষ": "ARIES",
    "বৃষ": "TAURUS",
    "মিথুন": "GEMINI",
    "কর্কট": "CANCER",
    "সিংহ": "LEO",
    "কন্যা": "VIRGO",
    "তুলা": "LIBRA",
    "বৃশ্চিক": "SCORPIO",
    "ধনু": "SAGITTARIUS",
    "মকর": "CAPRICORN",
    "কুম্ভ": "AQUARIUS",
    "মীন": "PISCES"
  };

  for (const [bn, key] of Object.entries(bnMap)) {
    if (raw.includes(bn)) return key;
  }

  return fallbackSignByInitial(inputName);
}

function inferNameOnlyMode({ input, core }) {
  const hasName = !!input.name;
  const hasDob = !!input.dob;
  const hasTob = !!input.tob;
  const hasPob = !!input.pob;
  const identityDepth = String(core?.subject_context?.identity_depth || "").toUpperCase();
  const subjectMode = String(core?.subject_context?.subject_mode || "").toUpperCase();

  return (
    hasName &&
    !hasDob &&
    !hasTob &&
    !hasPob &&
    (
      identityDepth.includes("NAME") ||
      subjectMode.includes("NAME") ||
      core?.birth_context?.precision_mode === "NAME_ONLY" ||
      !core?.birth_context?.birth_datetime
    )
  );
}

function buildEliteNameOnlyHumanPacket({ input, identityPacket, eventSummary, topRankedDomains }) {
  const name = titleCaseName(input.name);
  const signKey = signKeyFromIdentity(identityPacket, input.name);
  const signProfile = SIGN_PROFILES[signKey];
  const calcNum = nameNumber(input.name);
  const numerology = extractNumerology(identityPacket);

  const likelyDomains = safeArray(topRankedDomains)
    .slice(0, 8)
    .map((d) => ({
      domain: d?.domain_label || d?.domain_key,
      state: d?.final_state || "LIKELY_PATTERN",
      score: d?.normalized_score ?? null
    }))
    .filter((x) => x.domain);

  return {
    mode: "NAME_ONLY_ELITE_RICH_READABLE",
    verdict_policy: {
      verdict_word: "FULL_PATTERN_VERDICT",
      partial_verdict_allowed: false,
      claim_level: "PATTERN_PLUS_LIKELY_HISTORY",
      executed_event_note:
        "DOB/TOB/POB না থাকলে exact executed event seal নয়; কিন্তু name-rashi/numerology/domain pattern থেকে full readable verdict দেওয়া হবে।"
    },
    name_profile: {
      raw_name: input.name || null,
      display_name: name || null,
      initial_signature: getInitialLetter(name),
      name_number: numerology?.name_number || numerology?.number || calcNum?.reduced_number || null,
      name_number_raw_total: calcNum?.raw_total || null,
      numerology_method: numerology?.method || calcNum?.method
    },
    rashi_full_description: {
      selected_signature: signProfile.sign,
      dates: signProfile.dates,
      element: signProfile.element,
      nature: signProfile.nature,
      positive_traits: signProfile.positive,
      shadow_traits: signProfile.shadow,
      bengali_full_meaning: signProfile.bengali
    },
    human_traits: {
      core_identity:
        "তোমার ভিতরে self-control, হিসাব, silent observation এবং নিজের জায়গা ধরে রাখার strong pattern আছে। বাইরে calm impression দিলেও ভিতরে দ্রুত calculation চলে।",
      mind_pattern:
        "মানুষের কথা, আচরণ ও intention দ্রুত ধরতে পারো। কিন্তু সব কথা মুখে বলো না; অনেক কিছু ভিতরে জমিয়ে রাখো।",
      relationship_pattern:
        "সম্পর্কে surface-level bonding তোমার জন্য যথেষ্ট নয়। loyalty, respect এবং emotional depth দরকার। mismatch হলে তুমি বাইরে চুপ থাকলেও ভিতরে distance তৈরি হয়।",
      work_money_pattern:
        "কাজ ও টাকার জায়গায় control, stable income, নিজের zone এবং practical result গুরুত্বপূর্ণ। অন্যের অধীনে বেশি pressure থাকলে ভিতরে অস্বস্তি বাড়ে।",
      pressure_pattern:
        "delay, blockage বা অসম্মান এলে ego-sensitivity বাড়ে। তখন decision late হওয়া, silent overthinking, অথবা হঠাৎ direction shift দেখা যায়।",
      destiny_pattern:
        "জীবনে একবারে সোজা রাস্তা নয়—shift, rebuild, আবার শুরু, তারপর stronger position নেওয়ার pattern আছে।"
    },
    timeline_style_reading: [
      {
        phase: "Early imprint",
        meaning:
          "শুরুতে ভিতরে sensitivity এবং self-protection তৈরি হয়; মানুষকে সহজে পুরোটা দেখাও না।"
      },
      {
        phase: "Pressure and mismatch phase",
        meaning:
          "কাজ, সম্পর্ক বা family expectation থেকে ভিতরে চাপ আসে; বাইরে normal থাকলেও ভিতরে হিসাব বাড়ে।"
      },
      {
        phase: "Control rebuilding phase",
        meaning:
          "এক সময় নিজের zone, income/control, respect এবং independent decision গুরুত্বপূর্ণ হয়ে ওঠে।"
      },
      {
        phase: "Current carryover",
        meaning:
          "এখনও কিছু অসমাপ্ত চাপ বা চিন্তা চলতে পারে; তবে pattern তোমাকে rebuild করার দিকে ঠেলে দেয়।"
      }
    ],
    likely_life_theme_domains: likelyDomains,
    domain_status_hint: {
      relationship: eventSummary?.relationship?.current_marriage_status || "STRONG_PATTERN",
      foreign: eventSummary?.foreign?.foreign_process_status || "STRONG_PATTERN",
      work: eventSummary?.work?.job_active || eventSummary?.work?.business_active ? "ACTIVE_PATTERN" : "STRONG_PATTERN",
      money: eventSummary?.money?.money_status || "STRONG_PATTERN",
      health: eventSummary?.health?.health_status || "PATTERN_OBSERVABLE",
      conflict: eventSummary?.conflict?.conflict_status || "PATTERN_OBSERVABLE"
    },
    bengali_verdict:
      "VERDICT: FULL PATTERN. নামের ভিতরে গভীরতা, হিসাব, চাপ সহ্য করার ক্ষমতা এবং rebuild করার শক্তি আছে। surface calm হলেও ভিতরে strong silent movement চলে।"
  };
}

function buildKpPastSnapshot({ core, astro, domains, linkedDomainExpansion }) {
  return {
    subject_context: core?.subject_context || {},
    birth_context: core?.birth_context || {},
    precision_mode: core?.birth_context?.precision_mode || null,
    identity_depth: core?.subject_context?.identity_depth || null,
    subject_mode: core?.subject_context?.subject_mode || null,
    kp_cusps:
      core?.evidence_packet?.kp_cusps ||
      core?.evidence_packet?.kp ||
      astro?.kp_cusps ||
      {},
    moon: core?.evidence_packet?.moon || astro?.moon || {},
    aspects:
      core?.evidence_packet?.aspects ||
      core?.evidence_packet?.aspects_summary ||
      astro?.aspects ||
      astro?.aspects_summary ||
      [],
    dasha: core?.evidence_packet?.dasha || astro?.dasha || {},
    domain_results: safeArray(domains).slice(0, LIMITS.arrayHard),
    linked_domain_expansion: safeArray(linkedDomainExpansion).slice(0, LIMITS.arraySoft)
  };
}

function buildKpEventInput({ input, stage2, core }) {
  return {
    event: input.facts || input.question,
    domain: stage2?.question_profile?.primary_domain || "GENERAL",
    question: input.question,
    linked_domain_expansion: stage2?.linked_domain_expansion || [],
    precision_mode: core?.birth_context?.precision_mode || null,
    identity_depth: core?.subject_context?.identity_depth || null,
    subject_mode: core?.subject_context?.subject_mode || null,
    dob: input.dob || null
  };
}

function pickTopTimeline(items, limit = 8) {
  return safeArray(items)
    .slice(0, limit)
    .map((e, idx) => ({
      order: idx + 1,
      title: clipText(e?.title || e?.event_title || e?.domain_label || e?.domain_key || "Past event", 140),
      domain: e?.domain_key || e?.domain || e?.domain_label || null,
      status: e?.status || e?.final_state || e?.event_state || "STRONG_PATTERN",
      timing: e?.timing || e?.year_range || e?.year || e?.phase || null,
      age_range: e?.age_range || e?.age || null,
      evidence_level: e?.evidence_level || e?.confidence || e?.validation_status || null,
      emotional_truth: clipText(e?.emotional_truth || e?.recognition_line || e?.client_recognition || "", 280),
      outcome: clipText(e?.outcome || e?.final_verdict || e?.final_state || "", 280)
    }));
}

function buildDomainOutcomes(summary = {}) {
  return {
    relationship: pruneDeep(summary?.relationship || {}, 1),
    work: pruneDeep(summary?.work || {}, 1),
    foreign: pruneDeep(summary?.foreign || {}, 1),
    money: pruneDeep(summary?.money || {}, 1),
    family: pruneDeep(summary?.family || {}, 1),
    health: pruneDeep(summary?.health || {}, 1),
    conflict: pruneDeep(summary?.conflict || {}, 1)
  };
}

function buildTopRankedDomains(domainResults, limit = 15) {
  return safeArray(domainResults)
    .slice(0, limit)
    .map((d) => ({
      domain_key: d?.domain_key,
      domain_label: d?.domain_label,
      normalized_score: d?.normalized_score,
      density: d?.density,
      residual_impact: d?.residual_impact,
      major_event_count: d?.major_event_count,
      minor_event_count: d?.minor_event_count,
      broken_event_count: d?.broken_event_count,
      active_event_count: d?.active_event_count,
      final_state: d?.final_state || "STRONG_PATTERN",
      pattern_mode_active: !!d?.pattern_mode_active,
      exact_timeline_allowed: d?.exact_timeline_allowed === true,
      direct_evidence_count: Number(d?.direct_evidence_count || 0),
      pattern_evidence_count: Number(d?.pattern_evidence_count || 0),
      fact_conflict_count: Number(d?.fact_conflict_count || 0),
      fact_anchor_merge_active: !!d?.fact_anchor_merge_active,
      timeline_collapse_active: !!d?.timeline_collapse_active,
      timeline_precision_mode: d?.timeline_precision_mode || null
    }));
}

function buildReadableNarrative({ input, nameOnlyPacket, timeline, topDomains, projectPasteBlock }) {
  if (projectPasteBlock) return clipText(projectPasteBlock, LIMITS.fullText);

  const name = titleCaseName(input.name || "Subject");
  const r = nameOnlyPacket?.rashi_full_description;

  return [
    `আমি দেখতে পাচ্ছি, "${name}" নামের ভিতরে একটি গভীর কিন্তু চাপা আগুনের ধরণ আছে।`,
    ``,
    `নামের ধ্বনি-রাশি/স্বভাব: ${r?.selected_signature || "Name signature"}`,
    `Element: ${r?.element || "N/A"} | Nature: ${r?.nature || "N/A"}`,
    ``,
    `Positive traits: ${safeArray(r?.positive_traits).join(", ")}`,
    `Shadow traits: ${safeArray(r?.shadow_traits).join(", ")}`,
    ``,
    `${r?.bengali_full_meaning || ""}`,
    ``,
    `জীবনের হিসাব:`,
    ...(safeArray(timeline).slice(0, 8).map((t) => `- ${t.title}: ${t.timing || t.status || "STRONG_PATTERN"}`)),
    ``,
    `Top domains: ${safeArray(topDomains).map((d) => d.domain_label || d.domain_key).filter(Boolean).join(", ")}`,
    ``,
    `VERDICT: FULL PATTERN`,
    `লোককথা: “নদী যত শান্ত, স্রোত তত গভীর।”`,
    `খনার বচন: “চাপা আগুনে ধোঁয়া কম, পোড়ায় বেশি।”`
  ].join("\n");
}

function buildActionSafePacket(full, { format = "project", timelineLimit = 15, domainLimit = 15 } = {}) {
  const identity = pruneDeep(full.identity_packet || {}, 0);
  const eventSummary = full.event_summary || {};
  const topDomains = safeArray(full.top_ranked_domains).slice(0, domainLimit);
  const timeline = pickTopTimeline(full.master_timeline, timelineLimit);

  const nameOnlyPacket =
    full.name_only_elite_packet ||
    buildEliteNameOnlyHumanPacket({
      input: full.input_normalized || {},
      identityPacket: identity,
      eventSummary,
      topRankedDomains: topDomains
    });

  const readableNarrative = buildReadableNarrative({
    input: full.input_normalized || {},
    nameOnlyPacket,
    timeline,
    topDomains,
    projectPasteBlock: full.project_paste_block
  });

  return {
    engine_status: full.engine_status,
    system_status: full.system_status,
    mode: full.mode,
    output_format: format,

    subject_mode: full.subject_mode,
    identity_depth: full.identity_depth,
    precision_mode: full.precision_mode,
    is_name_only_mode: !!full.is_name_only_mode,

    verdict: full.is_name_only_mode ? "FULL_PATTERN" : "FULL_ENGINE_VERDICT",
    partial_verdict_allowed: false,

    input_normalized: smallObj(full.input_normalized, [
      "name",
      "dob",
      "tob",
      "pob",
      "question",
      "facts",
      "timezone_offset"
    ]),

    gpt_action_safety: {
      response_size: "RICH_BUT_CAPPED",
      full_json_available_with: "format=json",
      recommended_action_format: "format=project",
      response_too_large_risk: "CONTROLLED"
    },

    name_only_elite_packet: full.is_name_only_mode ? nameOnlyPacket : null,

    identity_packet: identity,
    name_rashi_packet: pruneDeep(extractNameRashi(identity), 0),
    numerology_packet: pruneDeep(extractNumerology(identity), 0),

    rashi_full_description: nameOnlyPacket?.rashi_full_description || null,
    human_readable_traits: nameOnlyPacket?.human_traits || null,
    timeline_style_reading: nameOnlyPacket?.timeline_style_reading || [],

    event_summary: buildDomainOutcomes(eventSummary),
    master_timeline_compact: timeline,

    domain_outcomes: {
      top_domains: pruneDeep(topDomains, 0)
    },

    validation_summary: {
      validation_status:
        full?.validation_block?.validation_status ||
        full?.validation_layer?.validation_status ||
        full?.validation_layer?.status ||
        "FULL_PATTERN_VALIDATED",
      truth_level:
        full?.truth_summary?.truth_level ||
        (full.is_name_only_mode ? "NAME_PATTERN_LOCKED" : "ENGINE_LOCKED"),
      name_only_note: full.is_name_only_mode
        ? "Name-only mode gives full pattern verdict, rich rashi traits and timeline-style reading. Exact birth-time event sealing needs DOB/TOB/POB."
        : null
    },

    forensic_verdict: pruneDeep(full.forensic_verdict || {}, 0),
    lokkotha_summary: pruneDeep(full.lokkotha_summary || {}, 0),

    project_paste_block: readableNarrative,

    compact_notice:
      "Rich GPT-safe packet: full name/rashi traits, numerology, timeline-style reading, domain outcomes and verdict are preserved under capped size."
  };
}

function compactPayloadFromFull(full) {
  return buildActionSafePacket(full, {
    format: "compact",
    timelineLimit: LIMITS.compactTimeline,
    domainLimit: LIMITS.compactDomains
  });
}

function projectPayloadFromFull(full) {
  return buildActionSafePacket(full, {
    format: "project",
    timelineLimit: LIMITS.projectTimeline,
    domainLimit: LIMITS.projectDomains
  });
}

export default async function handler(req, res) {
  try {
    const q = req.query || {};
    const requestedFormat = normalizeFormat(q.format);

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
      format: requestedFormat,
      current_datetime_iso: str(q.current_datetime_iso)
    };

    if (!input.question && input.name) {
      input.question = `${input.name} past history`;
    }

    if (!input.name && !input.dob && !input.facts) {
      return res.status(400).json({
        engine_status: ENGINE_STATUS,
        system_status: "INPUT_ERROR",
        error_message: "Provide at least a name, DOB, or facts."
      });
    }

    const core = await buildChartCore(input, astroProvider);

    if (core?.system_status !== "OK") {
      return res.status(400).json({
        engine_status: ENGINE_STATUS,
        system_status: "INPUT_ERROR",
        details: pruneDeep(core, 0)
      });
    }

    const facts = parseFactAnchors(input.facts, input.question);
    const isNameOnlyMode = inferNameOnlyMode({ input, core });

    const stage1 = runIntelligenceLayer({
      domainResults: [],
      question: input.question
    });

    const astro = runAstroLayer({
      evidence_packet: core.evidence_packet,
      facts,
      question_profile: stage1.question_profile,
      subject_context: core.subject_context,
      birth_context: core.birth_context
    });

    const stage2 = runIntelligenceLayer({
      domainResults: astro.domain_results,
      question: input.question
    });

    const finalizedDomains = runEventFinalizer(stage2.ranked_domains);

    const timelineCollapse = runTimelineCollapser({
      ranked_domains: finalizedDomains,
      birth_context: core.birth_context,
      subject_context: core.subject_context,
      evidence_packet: core.evidence_packet
    });

    const collapsedDomains = safeArray(timelineCollapse.collapsed_domains);
    const collapsedTimeline = safeArray(timelineCollapse.collapsed_timeline);

    const factAnchorMerge = runFactAnchorMerger({
      ranked_domains: collapsedDomains.length ? collapsedDomains : finalizedDomains,
      facts
    });

    const mergedDomains = safeArray(factAnchorMerge.merged_domains);

    const pipelineDomains = mergedDomains.length
      ? mergedDomains
      : collapsedDomains.length
      ? collapsedDomains
      : finalizedDomains;

    const rawMasterTimeline = collapsedTimeline.length
      ? collapsedTimeline
      : buildTimeline({
          ranked_domains: pipelineDomains,
          birth_context: core.birth_context,
          subject_context: core.subject_context
        });

    const kpSnapshot = buildKpPastSnapshot({
      core,
      astro,
      domains: pipelineDomains,
      linkedDomainExpansion: stage2.linked_domain_expansion
    });

    const validation_layer = runValidationLayer({
      question: input.question,
      finalizedDomains: pipelineDomains,
      snapshot: kpSnapshot,
      eventInput: buildKpEventInput({ input, stage2, core })
    });

    const rawIdentityPacket = buildIdentityPacket({
      input,
      subjectContext: core.subject_context,
      birthContext: core.birth_context,
      evidencePacket: core.evidence_packet
    });

    const identity_packet = correctIdentityPacket(rawIdentityPacket, input, facts);

    const evidenceLayer = runEvidenceLayer({
      input,
      facts,
      question_profile: stage2.question_profile,
      ranked_domains: pipelineDomains,
      master_timeline: rawMasterTimeline,
      carryover: stage2.carryover,
      validation_layer,
      subject_context: core.subject_context,
      birth_context: core.birth_context
    });

    const domain_results = safeArray(evidenceLayer.ranked_domains);
    const exact_domain_summary = safeArray(evidenceLayer.exact_domain_summary);
    const event_summary = evidenceLayer.event_summary || {};
    const truth_summary = event_summary.truth_summary || evidenceLayer.truth_summary || {};
    const master_timeline = safeArray(evidenceLayer.master_timeline);
    const validation_block = evidenceLayer.validation_block || {};
    const forensic_verdict = evidenceLayer.forensic_verdict || {};
    const lokkotha_summary = evidenceLayer.lokkotha_summary || {};
    const project_paste_block = evidenceLayer.project_paste_block || "";

    const top_ranked_domains = buildTopRankedDomains(domain_results, 15);

    const name_only_elite_packet = isNameOnlyMode
      ? buildEliteNameOnlyHumanPacket({
          input,
          identityPacket: identity_packet,
          eventSummary: event_summary,
          topRankedDomains: top_ranked_domains
        })
      : null;

    const delivery_safe_packet = {
      normalized_states: {
        marriage: event_summary?.relationship?.current_marriage_status || "STRONG_PATTERN",
        divorce: event_summary?.relationship?.divorce_status || "STRONG_PATTERN",
        multiple_marriage: event_summary?.relationship?.multiple_marriage_status || "STRONG_PATTERN",
        foreign: event_summary?.foreign?.foreign_process_status || "STRONG_PATTERN",
        settlement: event_summary?.foreign?.settlement_status || "STRONG_PATTERN",
        education: event_summary?.work?.education_active ? "PATTERN_OR_ACTIVE" : "STRONG_PATTERN",
        job: event_summary?.work?.job_active ? "PATTERN_OR_ACTIVE" : "STRONG_PATTERN",
        business: event_summary?.work?.business_active ? "PATTERN_OR_ACTIVE" : "STRONG_PATTERN",
        money: event_summary?.money?.money_status || "STRONG_PATTERN",
        health: event_summary?.health?.health_status || "PATTERN_OBSERVABLE",
        conflict: event_summary?.conflict?.conflict_status || "PATTERN_OBSERVABLE"
      },
      final_truth_summary:
        Number(factAnchorMerge?.fact_anchor_summary?.executed_domains || 0) > 0
          ? "Fact anchor merged: কিছু domain EXECUTED seal পেয়েছে।"
          : isNameOnlyMode
          ? "Name-only full pattern verdict active: rashi, numerology, traits, domain and timeline-style reading generated."
          : truth_summary?.truth_level === "NAME_PATTERN_LOCKED"
          ? "Name pattern locked with readable timeline-style interpretation."
          : "Evidence layer final truth summary active."
    };

    const fullPayload = {
      engine_status: ENGINE_STATUS,
      provider_state: {
        contract_version: "REAL_ASTRO_PROVIDER_CONTRACT_V1",
        provider_ready: true,
        missing_capabilities: [],
        policy: {
          person_specific_data_allowed: false,
          client_dynamic_input_required: true,
          facts_are_validation_not_source_of_truth: true
        }
      },
      system_status: "OK",
      mode: core?.subject_context?.question_mode || "PAST",
      subject_mode: core?.subject_context?.subject_mode || null,
      identity_depth: core?.subject_context?.identity_depth || null,
      precision_mode: core?.birth_context?.precision_mode || null,
      is_name_only_mode: isNameOnlyMode,

      input_normalized: core?.input_normalized || input,
      subject_context: core?.subject_context || {},
      birth_context: core?.birth_context || {},
      current_context: core?.current_context || {},

      fact_anchor_block: facts,
      question_profile: stage2?.question_profile || {},
      linked_domain_expansion: safeArray(stage2?.linked_domain_expansion).slice(0, LIMITS.arraySoft),

      evidence_normalized: astro?.evidence_normalized || {},
      mode_flags: astro?.mode_flags || {},
      name_hints: astro?.name_hints || {},

      timeline_collapse: {
        timeline_collapse_version: timelineCollapse?.timeline_collapse_version || null,
        mode_flags: timelineCollapse?.mode_flags || {},
        collapsed_timeline: safeArray(collapsedTimeline).slice(0, LIMITS.arrayHard)
      },

      fact_anchor_merge: {
        fact_anchor_merge_version: factAnchorMerge?.fact_anchor_merge_version || null,
        fact_anchor_summary: factAnchorMerge?.fact_anchor_summary || {}
      },

      validation_layer,
      validation_block,
      identity_packet,
      name_only_elite_packet,
      delivery_safe_packet,

      top_ranked_domains,
      domain_results,
      exact_domain_summary,
      event_summary,
      truth_summary,
      master_timeline,
      current_carryover: stage2?.carryover || {},

      forensic_verdict,
      lokkotha_summary,
      project_paste_block
    };

    if (input.format === "compact") {
      return res.status(200).json(compactPayloadFromFull(fullPayload));
    }

    if (input.format === "project") {
      return res.status(200).json(projectPayloadFromFull(fullPayload));
    }

    return res.status(200).json(fullPayload);
  } catch (error) {
    return res.status(500).json({
      engine_status: ENGINE_STATUS,
      system_status: "ERROR",
      error_message: error instanceof Error ? error.message : "Unknown error",
      error_stack:
        process.env.NODE_ENV === "development" && error instanceof Error
          ? error.stack
          : undefined
    });
  }
}