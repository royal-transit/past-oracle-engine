// lib/identity-packet.js
// FULL REPLACEMENT — SAFE IDENTITY PACKET

function norm(v) {
  return String(v || "").trim();
}

function up(v) {
  return String(v || "").trim().toUpperCase();
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
  if (!n) return "Libra";

  const c = n[0];

  if ("a".includes(c)) return "Aries";
  if ("bvuwo".includes(c)) return "Taurus";
  if ("ckg".includes(c)) return "Gemini";
  if ("dhl".includes(c)) return "Cancer";
  if ("m".includes(c)) return "Leo";
  if ("p".includes(c)) return "Virgo";
  if ("r".includes(c)) return "Libra";
  if ("nst".includes(c)) return "Scorpio";
  if ("yj".includes(c)) return "Sagittarius";
  if ("q".includes(c)) return "Capricorn";
  if ("f".includes(c)) return "Aquarius";
  return "Pisces";
}

function numerologyFromName(name = "") {
  const letters = norm(name).replace(/[^a-z]/gi, "").toUpperCase().split("");
  const values = letters
    .map((ch) => {
      const idx = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".indexOf(ch);
      return idx >= 0 ? (idx % 9) + 1 : 0;
    })
    .filter(Boolean);

  const total = values.reduce((a, b) => a + b, 0);

  let root = total || 0;
  while (root > 9) {
    root = String(root)
      .split("")
      .reduce((a, b) => a + Number(b), 0);
  }

  const meaningMap = {
    1: "নিজের control চায়",
    2: "relation-sensitive",
    3: "expressive, visible, কিন্তু সবসময় স্থির না",
    4: "গোছাতে চায়, কিন্তু resistance জমে",
    5: "change-driven, restless",
    6: "bonding strong, duty heavy",
    7: "ভিতরে গভীর, সহজে খুলে পড়ে না",
    8: "delay, pressure, responsibility heavy",
    9: "forceful, direct, impact-driven"
  };

  return {
    clean_name: letters.join(""),
    values,
    total,
    root,
    meaning: meaningMap[root] || "mixed vibration"
  };
}

function getPlanetSign(packet = {}, planetName = "") {
  const natal = packet?.natal || {};
  const planets = Array.isArray(natal?.planets) ? natal.planets : [];
  const p = planets.find((x) => up(x?.planet) === up(planetName));
  return p?.sign || null;
}

function getAscSign(packet = {}) {
  return packet?.natal?.ascendant?.sign || null;
}

function signTraits(sign) {
  const map = {
    Aries: ["দ্রুত সিদ্ধান্ত নেয়", "অপেক্ষা কম পছন্দ", "ধাক্কা দিয়ে এগোয়"],
    Taurus: ["ধরে রাখতে চায়", "স্থিরতা চায়", "ভাঙতে চায় না সহজে"],
    Gemini: ["দুই দিক একসাথে দেখে", "মাথা দ্রুত কাজ করে", "স্থিরতা সবসময় থাকে না"],
    Cancer: ["ভিতরের impact বেশি নেয়", "পরিবার carry করে", "চেপে রাখে"],
    Leo: ["সম্মান ধরে রাখতে চায়", "আঘাত নিলে reaction strong", "visible হতে চায়"],
    Virgo: ["খুঁটিনাটি ধরে", "ভুল ধরতে পারে", "অতিরিক্ত ভাবনায় আটকে যায়"],
    Libra: ["balance খোঁজে", "মানুষ-পরিস্থিতি মাপে", "ভিতরে দোলাচল থাকে"],
    Scorpio: ["গভীর যায়", "সহজে ছাড়ে না", "ভিতরে জমিয়ে রাখে"],
    Sagittarius: ["দূরদৃষ্টি চায়", "এক জায়গায় বাঁধা থাকতে চায় না", "খোলা রাস্তায় টানে"],
    Capricorn: ["ধীরে ওঠে", "চাপ বহন করে", "ফল দেরিতে বসে"],
    Aquarius: ["আলাদা angle-এ দেখে", "ভিতরে distance রাখে", "নিজের মাথায় চলে"],
    Pisces: ["sensitive", "ভিতরে absorb করে", "feeling দিয়ে নেয়"]
  };

  return map[sign] || ["মিশ্র প্রকৃতি", "একাধিক টান কাজ করে", "সোজা একরেখা না"];
}

export function buildIdentityPacket({
  input = {},
  subjectContext = {},
  birthContext = {},
  evidencePacket = {}
} = {}) {
  const name = norm(input?.name || subjectContext?.subject_name || "");
  const precisionMode = norm(birthContext?.precision_mode || "NAME_ONLY");

  const hasFullAstro =
    precisionMode !== "NAME_ONLY" &&
    evidencePacket?.natal &&
    Array.isArray(evidencePacket?.natal?.planets) &&
    evidencePacket.natal.planets.length > 0;

  const lagnaSign = hasFullAstro ? getAscSign(evidencePacket) : null;
  const moonSign = hasFullAstro ? getPlanetSign(evidencePacket, "MOON") : null;
  const sunSign = hasFullAstro ? getPlanetSign(evidencePacket, "SUN") : null;
  const venusSign = hasFullAstro ? getPlanetSign(evidencePacket, "VENUS") : null;

  const derivedRashi = lagnaSign || moonSign || firstSoundRashi(name);
  const numerology = numerologyFromName(name);

  const primaryTraits = signTraits(derivedRashi);
  const mentalTraits = signTraits(moonSign || derivedRashi);

  return {
    subject_name: name || null,
    precision_mode: precisionMode || null,
    exact_traits_allowed: precisionMode === "FULL_BIRTH" || precisionMode === "DOB_TOB",
    astro_identity: {
      lagna_sign: lagnaSign,
      moon_sign: moonSign,
      sun_sign: sunSign,
      venus_sign: venusSign,
      derived_rashi_sign: derivedRashi,
      derived_rashi_bengali: BENGALI_SIGNS[derivedRashi] || null
    },
    numerology,
    delivery_lines: {
      rashi_line: `তোমার নামের রাশি: ${BENGALI_SIGNS[derivedRashi] || derivedRashi}`,
      zodiac_line: `রাশি অনুযায়ী তুমি: ${BENGALI_SIGNS[derivedRashi] || derivedRashi} রাশির জাতক`,
      numerology_line: `তোমার নামের সংখ্যা (Numerology): ${numerology.root}`
    },
    sections: {
      core: [
        `${BENGALI_SIGNS[derivedRashi] || derivedRashi} রাশির টান তোমার মূল স্বভাবে কাজ করে`,
        primaryTraits[0],
        numerology.meaning
      ],
      mind: [
        mentalTraits[0],
        mentalTraits[1],
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
        "টাকা এলে discipline লাগে",
        "flow আসে, কিন্তু pressure-ও সাথে আসে",
        "financial stability delay হতে পারে"
      ],
      enemy: [
        "সামনে শত্রু কম, আড়াল থেকে চাপ বেশি",
        "misread মানুষের কারণে friction বাড়তে পারে",
        "নিজের hesitation-ও hidden enemy"
      ],
      health: [
        "চাপ শরীর-মনে জমে",
        "ঘুম ও stress নজরে রাখতে হয়",
        "ভিতরের টান বাইরে পরে আসে"
      ],
      life: [
        "জীবন straight line না",
        "shift, delay, rebuild pattern আছে",
        "যা আসে, বসতে সময় নেয়"
      ]
    }
  };
}