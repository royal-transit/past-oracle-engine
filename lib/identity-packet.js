// lib/identity-packet.js
// IDENTITY PACKET LOCK — BACKEND DRIVEN, NOT GPT-INVENTED

function norm(v) {
  return String(v || "").trim();
}

function up(v) {
  return String(v || "").trim().toUpperCase();
}

function toNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

const BENGALI_SIGNS = {
  Aries: "মেষ",
  Taurus: "বৃষ",
  Gemini: "মিথুন",
  Cancer: "কর্কট",
  Leo: "সিংহ",
  Virgo: "কন্যা",
  Libra: "তুলা",
  Scorpio: "বৃশ্চিক",
  Sagittarius: "ধনু",
  Capricorn: "মকর",
  Aquarius: "কুম্ভ",
  Pisces: "মীন"
};

function firstSoundRashi(name = "") {
  const n = norm(name).toLowerCase();
  if (!n) return null;

  // simple deterministic fallback map
  const first = n[0];

  if ("a".includes(first)) return "Aries";
  if ("bvuwo".includes(first)) return "Taurus";
  if ("ckg".includes(first)) return "Gemini";
  if ("dhl".includes(first)) return "Cancer";
  if ("m".includes(first)) return "Leo";
  if ("p".includes(first)) return "Virgo";
  if ("r".includes(first)) return "Libra";
  if ("nst".includes(first)) return "Scorpio";
  if ("yj".includes(first)) return "Sagittarius";
  if ("q".includes(first)) return "Capricorn";
  if ("f".includes(first)) return "Aquarius";
  return "Pisces";
}

function getPrimaryAstroIdentity(evidencePacket = {}, precisionMode = "") {
  const natal = evidencePacket?.natal || {};
  const planets = Array.isArray(natal?.planets) ? natal.planets : [];
  const asc = natal?.ascendant || null;

  const moon = planets.find((p) => up(p.planet) === "MOON") || null;
  const sun = planets.find((p) => up(p.planet) === "SUN") || null;
  const venus = planets.find((p) => up(p.planet) === "VENUS") || null;

  return {
    lagna_sign: asc?.sign || null,
    moon_sign: moon?.sign || null,
    sun_sign: sun?.sign || null,
    venus_sign: venus?.sign || null,
    astro_precision:
      precisionMode === "FULL_BIRTH" || precisionMode === "DOB_TOB"
        ? "HIGH"
        : precisionMode === "DOB_ONLY_REDUCED" || precisionMode === "DOB_POB_REDUCED"
        ? "MEDIUM"
        : "LOW"
  };
}

function charValue(ch) {
  const map = "abcdefghijklmnopqrstuvwxyz";
  const idx = map.indexOf(ch.toLowerCase());
  return idx >= 0 ? (idx % 9) + 1 : 0;
}

function numerologyFromName(name = "") {
  const chars = norm(name).replace(/[^a-z]/gi, "").split("");
  const values = chars.map(charValue).filter((v) => v > 0);
  const total = values.reduce((a, b) => a + b, 0);

  let root = total;
  while (root > 9) {
    root = String(root)
      .split("")
      .reduce((a, b) => a + Number(b), 0);
  }

  return {
    clean_name: chars.join("").toUpperCase(),
    values,
    total,
    root
  };
}

function numerologyMeaning(root) {
  const map = {
    1: "নিজে পথ ধরতে চায়, control নিতে চায়",
    2: "reaction-sensitive, relation-driven, ভিতরে নরম",
    3: "expressive, visible, কিন্তু সবসময় স্থির না",
    4: "গোছাতে চায়, কিন্তু ভিতরে resistance জমে",
    5: "change-driven, fast, restless, direction-shift prone",
    6: "bonding strong, duty heavy, attachment high",
    7: "ভিতরে আলাদা, গভীর, সহজে খুলে পড়ে না",
    8: "pressure, karma, delay, heavy responsibility",
    9: "forceful, direct, heat-carrying, impact-driven"
  };
  return map[root] || "mixed vibration";
}

function signTraits(sign) {
  const map = {
    Aries: ["দ্রুত সিদ্ধান্ত নেয়", "অপেক্ষা কম পছন্দ", "ধাক্কা দিয়ে এগোয়"],
    Taurus: ["ধরে রাখতে চায়", "স্থিরতা চায়", "ভাঙতে চায় না সহজে"],
    Gemini: ["দুই দিক একসাথে দেখে", "মাথা দ্রুত কাজ করে", "স্থিরতা সবসময় থাকে না"],
    Cancer: ["ভিতরের impact বেশি নেয়", "পরিবার ও নিরাপত্তা carry করে", "চেপে রাখে"],
    Leo: ["নিজের মান ধরে রাখতে চায়", "সম্মানে আঘাত লাগলে reaction strong", "visible হতে চায়"],
    Virgo: ["খুঁটিনাটি ধরে", "ভুল ধরতে পারে", "অতিরিক্ত ভাবনায় আটকে যায়"],
    Libra: ["balance খোঁজে", "মানুষ-পরিস্থিতি মাপে", "ভিতরে দোলাচল থাকে"],
    Scorpio: ["গভীর যায়", "সহজে ছাড়ে না", "ভিতরে জমিয়ে রাখে"],
    Sagittarius: ["দূরদৃষ্টি চায়", "এক জায়গায় বাঁধা থাকতে চায় না", "খোলা রাস্তায় টানে"],
    Capricorn: ["ধীরে ওঠে", "চাপ বহন করে", "ফল দেরিতে বসে"],
    Aquarius: ["সোজা পথে না গিয়ে আলাদা ভাবে দেখে", "ভিতরে distance রাখে", "নিজের মাথায় চলে"],
    Pisces: ["sensitive", "ভিতরে absorb করে", "অনেক কিছু feeling দিয়ে নেয়"]
  };

  return map[sign] || ["মিশ্র প্রকৃতি", "একাধিক টান কাজ করে", "সোজা একরেখা না"];
}

function buildIdentitySections(primarySign, moonSign, root) {
  const primaryTraits = signTraits(primarySign);
  const moonTraits = signTraits(moonSign);
  const numText = numerologyMeaning(root);

  return {
    core: [
      `${BENGALI_SIGNS[primarySign] || primarySign} রাশির টান তোমার মূল স্বভাবে কাজ করে`,
      primaryTraits[0],
      numText
    ],
    mind: [
      moonTraits[0],
      moonTraits[1],
      "ভিতরের প্রতিক্রিয়া বাইরে সবসময় দেখা যায় না"
    ],
    behaviour: [
      primaryTraits[1],
      primaryTraits[2],
      "শুরু আর ধরে রাখার মধ্যে ফাঁক তৈরি হতে পারে"
    ],
    speech: [
      "সব কথা সঙ্গে সঙ্গে খুলো না",
      "যেটা বলো সেটা অনেক সময় আগে ভেবে বলো",
      "চাপ থাকলে tone বদলে যায়"
    ],
    strength: [
      "pattern ধরতে পারো",
      "চাপের মধ্যে টিকে থাকতে পারো",
      "দিক পাল্টে আবার উঠতে পারো"
    ],
    weakness: [
      "ভিতরে জমিয়ে রাখো",
      "ভুল জায়গায় energy দাও",
      "স্থির হওয়ার আগে দোলাচল বাড়ে"
    ],
    inner_outer: [
      "বাইরে steady, ভিতরে pressure",
      "বাইরে calm, ভিতরে হিসাব",
      "বাইরে control, ভিতরে uncertainty"
    ],
    relationship: [
      "সম্পর্কে surface না, depth চাও",
      "bond হলে ছাড়তে দেরি হয়",
      "mismatch হলে ভিতরে আগে ফাটল ধরে"
    ],
    money: [
      "টাকা এলে ধরে রাখতে discipline লাগে",
      "flow আসে, কিন্তু pressure-ও সাথে আসে",
      "financial stability delay হতে পারে"
    ],
    enemy: [
      "সামনে শত্রু কম, আড়াল থেকে চাপ বেশি",
      "misread মানুষের কারণে friction বাড়তে পারে",
      "নিজের hesitation-ও একধরনের hidden enemy"
    ],
    health: [
      "চাপ শরীর-মনে জমে",
      "ঘুম, stress, internal pressure নজরে রাখতে হয়",
      "ভিতরের টান বাইরে পরে আসে"
    ],
    life: [
      "জীবন straight line না",
      "shift, delay, rebuild pattern আছে",
      "যা আসে, বসতে সময় নেয়"
    ]
  };
}

export function buildIdentityPacket({
  input = {},
  subjectContext = {},
  birthContext = {},
  evidencePacket = {}
}) {
  const name = norm(input?.name || subjectContext?.subject_name || "");
  const precisionMode = norm(birthContext?.precision_mode || "NAME_ONLY");

  const astroIdentity = getPrimaryAstroIdentity(evidencePacket, precisionMode);

  const derivedRashi =
    astroIdentity.lagna_sign ||
    astroIdentity.moon_sign ||
    firstSoundRashi(name);

  const numerology = numerologyFromName(name);
  const rootMeaning = numerologyMeaning(numerology.root);
  const sections = buildIdentitySections(
    derivedRashi || "Libra",
    astroIdentity.moon_sign || derivedRashi || "Libra",
    numerology.root || 5
  );

  const exactTraitsAllowed =
    precisionMode === "FULL_BIRTH" || precisionMode === "DOB_TOB";

  return {
    subject_name: name || null,
    precision_mode: precisionMode || null,
    exact_traits_allowed: exactTraitsAllowed,
    astro_identity: {
      lagna_sign: astroIdentity.lagna_sign,
      moon_sign: astroIdentity.moon_sign,
      sun_sign: astroIdentity.sun_sign,
      venus_sign: astroIdentity.venus_sign,
      derived_rashi_sign: derivedRashi,
      derived_rashi_bengali: BENGALI_SIGNS[derivedRashi] || null
    },
    numerology: {
      clean_name: numerology.clean_name || null,
      values: numerology.values || [],
      total: numerology.total || 0,
      root: numerology.root || null,
      meaning: rootMeaning
    },
    delivery_lines: {
      rashi_line: derivedRashi
        ? `তোমার নামের রাশি: ${BENGALI_SIGNS[derivedRashi] || derivedRashi}`
        : null,
      zodiac_line: derivedRashi
        ? `রাশি অনুযায়ী তুমি: ${(BENGALI_SIGNS[derivedRashi] || derivedRashi)} রাশির জাতক`
        : null,
      numerology_line: numerology.root
        ? `তোমার নামের সংখ্যা (Numerology): ${numerology.root}`
        : null
    },
    sections
  };
}