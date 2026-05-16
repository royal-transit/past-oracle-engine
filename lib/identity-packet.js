// lib/identity-packet.js
// FULL REPLACEMENT — SAFE IDENTITY PACKET V3
// HUMAN IDENTITY MIRROR ACTIVE
// NAME_ONLY = richer phonetic + rashi + numerology personality texture
// FULL_BIRTH = natal signs override name-derived fallback

function norm(v) {
  return String(v || "").trim();
}

function up(v) {
  return String(v || "").trim().toUpperCase();
}

function safeArray(v) {
  return Array.isArray(v) ? v : [];
}
function uniq(arr) {
  return [...new Set(safeArray(arr).filter(Boolean))];
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

const SIGN_ARCHETYPE = {
  Aries: {
    tone: "action-first",
    core: ["দ্রুত সিদ্ধান্ত নিতে চায়", "চাপ এলে সামনে যায়", "অপেক্ষা কম পছন্দ করে"],
    shadow: ["রাগ দ্রুত ওঠে", "তাড়াহুড়ায় ভুল হতে পারে", "ego hurt হলে reaction strong"]
  },
  Taurus: {
    tone: "stability-seeking",
    core: ["স্থিরতা চায়", "ধরে রাখতে জানে", "comfort/security গুরুত্বপূর্ণ"],
    shadow: ["stubborn হয়ে যায়", "ছাড়তে দেরি করে", "possessive tendency থাকে"]
  },
  Gemini: {
    tone: "mind-moving",
    core: ["মাথা দ্রুত কাজ করে", "দুই দিক একসাথে দেখে", "কথা/information দিয়ে চলে"],
    shadow: ["overthinking করে", "স্থিরতা সবসময় থাকে না", "এক কাজ শেষ করার আগে আরেকটা ধরে"]
  },
  Cancer: {
    tone: "emotion-absorbing",
    core: ["ভিতরের impact বেশি নেয়", "family/emotion carry করে", "স্মৃতি ধরে রাখে"],
    shadow: ["mood ভিতরে জমে", "past ছাড়তে দেরি হয়", "চুপচাপ কষ্ট নেয়"]
  },
  Leo: {
    tone: "recognition-driven",
    core: ["সম্মান ধরে রাখতে চায়", "presence strong", "leadership instinct আছে"],
    shadow: ["ego hurt হলে দূরে যায়", "dominance বের হতে পারে", "recognition না পেলে আগুন জমে"]
  },
  Virgo: {
    tone: "detail-filter",
    core: ["খুঁটিনাটি দেখে", "ভুল ধরতে পারে", "practical কাজ ভালো করে"],
    shadow: ["worry বাড়ে", "over-analysis করে", "নিজেকেও কঠিনভাবে judge করে"]
  },
  Libra: {
    tone: "balance-reader",
    core: ["মানুষ-পরিস্থিতি মাপে", "balance খোঁজে", "relationship/social harmony বোঝে"],
    shadow: ["decision delay হয়", "ভিতরে দোলাচল থাকে", "অন্যের influence নিতে পারে"]
  },
  Scorpio: {
    tone: "deep-hidden",
    core: ["গভীরে যায়", "trust দিলে গভীরভাবে দেয়", "silent observation strong"],
    shadow: ["ভিতরে জমিয়ে রাখে", "betrayal ভুলে না", "control/obsession তৈরি হতে পারে"]
  },
  Sagittarius: {
    tone: "freedom-seeking",
    core: ["দূরদৃষ্টি আছে", "truth/freedom চায়", "এক জায়গায় বাঁধা থাকতে চায় না"],
    shadow: ["restless হয়", "detail miss করতে পারে", "commitment slow হতে পারে"]
  },
  Capricorn: {
    tone: "slow-builder",
    core: ["ধীরে ওঠে", "চাপ বহন করে", "long-term result চায়"],
    shadow: ["emotion reserve করে", "too serious হয়", "ফল দেরিতে বসে"]
  },
  Aquarius: {
    tone: "independent-mind",
    core: ["নিজের মাথায় চলে", "ভিন্ন angle দেখে", "future/network ভাবনা strong"],
    shadow: ["detached দেখায়", "emotion কম দেখায়", "stubborn independence থাকে"]
  },
  Pisces: {
    tone: "sensitive-spiritual",
    core: ["feeling দিয়ে নেয়", "imagination strong", "spiritual/emotional depth থাকে"],
    shadow: ["boundary weak হতে পারে", "confusion absorb করে", "অন্যের pain নিজের করে নেয়"]
  }
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
  if ("nstx".includes(c)) return "Scorpio";
  if ("yj".includes(c)) return "Sagittarius";
  if ("q".includes(c)) return "Capricorn";
  if ("fz".includes(c)) return "Aquarius";
  return "Pisces";
}

function numerologyFromName(name = "") {
  const letters = norm(name).replace(/[^a-z]/gi, "").toUpperCase().split("");

  const chaldean = {
    A: 1, I: 1, J: 1, Q: 1, Y: 1,
    B: 2, K: 2, R: 2,
    C: 3, G: 3, L: 3, S: 3,
    D: 4, M: 4, T: 4,
    E: 5, H: 5, N: 5, X: 5,
    U: 6, V: 6, W: 6,
    O: 7, Z: 7,
    F: 8, P: 8
  };

  const values = letters.map((ch) => chaldean[ch] || 0).filter(Boolean);
  const total = values.reduce((a, b) => a + b, 0);

  let root = total || 0;
  while (root > 9) {
    root = String(root).split("").reduce((a, b) => a + Number(b), 0);
  }

  const meaningMap = {
    1: "নিজের control, leadership এবং আলাদা identity চায়",
    2: "relation-sensitive, emotional response strong",
    3: "expressive, visible, creative কিন্তু সবসময় স্থির না",
    4: "structure, discipline, resistance এবং practical burden",
    5: "change-driven, restless, movement ও communication-heavy",
    6: "bonding, family, duty, comfort ও relationship responsibility",
    7: "ভিতরে গভীর, silent, spiritual, সহজে খুলে পড়ে না",
    8: "delay, authority, pressure, responsibility ও material struggle",
    9: "forceful, direct, impact-driven, intense ও শেষ পর্যন্ত লড়াই করে"
  };

  return {
    clean_name: letters.join(""),
    values,
    total,
    root,
    method: "Chaldean-style English name vibration",
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

function buildPhoneticProfile(name = "") {
  const clean = norm(name).replace(/[^a-z]/gi, "").toUpperCase();
  const first = clean[0] || "";
  const last = clean[clean.length - 1] || "";
  const vowels = (clean.match(/[AEIOU]/g) || []).length;
  const consonants = clean.length - vowels;

  const firstMap = {
    A: "authority-start",
    B: "stability-start",
    C: "communication-start",
    D: "duty-start",
    E: "visibility-start",
    F: "network-start",
    G: "balance-start",
    H: "hidden-depth-start",
    I: "vision-start",
    J: "structure-start",
    K: "unusual-mind-start",
    L: "sensitive-start",
    M: "status-family-start",
    N: "deep-mind-start",
    O: "security-start",
    P: "practical-start",
    Q: "authority-karmic-start",
    R: "relationship-balance-start",
    S: "intense-pressure-start",
    T: "action-pressure-start",
    U: "freedom-start",
    V: "material-stability-start",
    W: "movement-mind-start",
    X: "hidden-force-start",
    Y: "freedom-spiritual-start",
    Z: "unusual-network-start"
  };

  return {
    clean,
    first_sound_key: first || null,
    last_sound_key: last || null,
    first_sound_signature: firstMap[first] || "mixed-start",
    vowel_count: vowels,
    consonant_count: consonants,
    sound_balance:
      vowels > consonants ? "emotional/open vibration" :
      consonants > vowels ? "controlled/held vibration" :
      "balanced vibration"
  };
}

function buildNumerologyMirror(root) {
  const map = {
    1: {
      strength: ["নিজের সিদ্ধান্ত নিজে নিতে চাও", "leadership নিতে পারো", "হারলে ভিতরে আগুন জমে"],
      weakness: ["ego hurt হলে distance করো", "help চাইতে দেরি হয়", "সবকিছু নিজের control-এ চাইতে পারো"],
      pattern: "জীবনে নিজের জায়গা বানানো তোমার মূল pattern।"
    },
    2: {
      strength: ["মানুষের emotion ধরতে পারো", "bond গভীর হয়", "softness আছে"],
      weakness: ["অন্যের কথায় কষ্ট বেশি লাগে", "decision emotional হতে পারে", "নীরবে কষ্ট জমাও"],
      pattern: "সম্পর্ক ও emotional response তোমার জীবনের বড় চাল।"
    },
    3: {
      strength: ["expression আছে", "মানুষের সামনে visible হতে পারো", "creative/social energy আছে"],
      weakness: ["স্থিরতা ধরে রাখা challenge", "একসাথে অনেক দিকে মন যায়", "প্রথমে উজ্জ্বল, পরে pressure এলে mood বদলায়"],
      pattern: "visibility, speech, social impression ও direction change তোমার জীবনে বারবার আসে।"
    },
    4: {
      strength: ["গোছাতে পারো", "hard reality handle করো", "দায়িত্ব নিতে পারো"],
      weakness: ["blockage বেশি লাগে", "delay-তে frustration হয়", "life ভারী মনে হতে পারে"],
      pattern: "structure বানাতে গিয়ে resistance পার হতে হয়।"
    },
    5: {
      strength: ["দ্রুত adapt করো", "communication strong", "movement/change-এ সুযোগ আসে"],
      weakness: ["restless mind", "এক জায়গায় আটকে থাকলে বিরক্তি", "decision ঘুরতে পারে"],
      pattern: "change, travel, communication ও flexible path তোমার চাল।"
    },
    6: {
      strength: ["relationship/duty strong", "family বা close bond ধরে রাখো", "comfort ও beauty বোঝো"],
      weakness: ["অন্যের burden নিজের ঘাড়ে নাও", "attachment ছাড়তে দেরি হয়", "expectation hurt করে"],
      pattern: "bond, duty, family ও relationship balance তোমার মূল lesson।"
    },
    7: {
      strength: ["ভিতরে গভীর", "silent observation sharp", "spiritual/hidden truth ধরতে পারো"],
      weakness: ["সহজে কাউকে trust করো না", "নিজের ভিতরে ঢুকে যাও", "মানুষ তোমাকে ভুল বুঝতে পারে"],
      pattern: "inner depth, isolation, hidden knowledge ও self-protection তোমার life code।"
    },
    8: {
      strength: ["pressure carry করো", "authority ও responsibility handle করো", "slow but strong rise"],
      weakness: ["delay বেশি লাগে", "money/status নিয়ে চাপ", "কঠিন হয়ে যেতে পারো"],
      pattern: "delay, responsibility, karma ও material rebuilding তোমার পথ।"
    },
    9: {
      strength: ["force আছে", "শেষ পর্যন্ত লড়ো", "impact create করো"],
      weakness: ["anger বা intensity জমে", "সবকিছু গভীরভাবে নাও", "cut-off sudden হতে পারে"],
      pattern: "conflict, courage, ending-rebirth ও strong impact তোমার জীবনে কাজ করে।"
    }
  };

  return map[root] || {
    strength: ["mixed vibration"],
    weakness: ["mixed pressure"],
    pattern: "mixed life pattern"
  };
}

function combineTraits(primarySign, moonSign, sunSign, venusSign, numerology) {
  const primary = SIGN_ARCHETYPE[primarySign] || SIGN_ARCHETYPE.Libra;
  const moon = SIGN_ARCHETYPE[moonSign || primarySign] || primary;
  const sun = SIGN_ARCHETYPE[sunSign || primarySign] || primary;
  const venus = SIGN_ARCHETYPE[venusSign || primarySign] || primary;
  const num = buildNumerologyMirror(numerology.root);

  return {
    core: [
      `${BENGALI_SIGNS[primarySign] || primarySign} রাশির টান তোমার মূল স্বভাবে কাজ করে`,
      primary.core[0],
      numerology.meaning
    ],
    mind: [
      moon.core[0],
      moon.core[1],
      "ভিতরের প্রতিক্রিয়া বাইরে সবসময় দেখা যায় না"
    ],
    behaviour: [
      primary.core[1],
      primary.core[2],
      "শুরু আর ধরে রাখার মধ্যে ফাঁক তৈরি হতে পারে"
    ],
    speech: [
      "সব কথা সঙ্গে সঙ্গে খুলো না",
      "যেটা বলো সেটা অনেক সময় আগে ভেবে বলো",
      "চাপ থাকলে tone বদলে যায়"
    ],
    relationship: [
      venus.core[0],
      "সম্পর্কে surface না, depth চাও",
      "mismatch হলে ভিতরে আগে ফাটল ধরে"
    ],
    strength: uniq([
      ...primary.core,
      ...num.strength,
      "pattern ধরতে পারো",
      "চাপের মধ্যে টিকে থাকতে পারো",
      "দিক পাল্টে আবার উঠতে পারো"
    ]).slice(0, 8),
    weakness: uniq([
      ...primary.shadow,
      ...num.weakness,
      "ভিতরে জমিয়ে রাখো",
      "ভুল জায়গায় energy দাও",
      "স্থির হওয়ার আগে দোলাচল বাড়ে"
    ]).slice(0, 8),
    inner_outer: [
      "বাইরে steady, ভিতরে pressure",
      "বাইরে calm, ভিতরে হিসাব",
      "বাইরে control, ভিতরে uncertainty",
      `ভিতরের মূল rhythm: ${moon.tone}`
    ],
    money: [
      "টাকা এলে discipline লাগে",
      "flow আসে, কিন্তু pressure-ও সাথে আসে",
      numerology.root === 8 || numerology.root === 4
        ? "financial stability দেরিতে কিন্তু structure দিয়ে বসে"
        : "financial stability direction ঠিক থাকলে বাড়ে"
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
      "যা আসে, বসতে সময় নেয়",
      num.pattern
    ]
  };
}

function buildHumanIdentityMirror({ name, primarySign, numerology, phonetic, hasFullAstro }) {
  const sign = SIGN_ARCHETYPE[primarySign] || SIGN_ARCHETYPE.Libra;
  const num = buildNumerologyMirror(numerology.root);

  return {
    mirror_mode: hasFullAstro ? "FULL_ASTRO_IDENTITY_MIRROR" : "NAME_ONLY_IDENTITY_MIRROR",
    opening_line:
      `${name || "এই নাম"}-এর ভিতরে ${BENGALI_SIGNS[primarySign] || primarySign} ধাঁচের balance/response এবং number ${numerology.root}-এর life vibration একসাথে কাজ করছে।`,
    outer_identity:
      "বাইরে calm, measured বা controlled impression দিতে পারে; কিন্তু ভিতরে দ্রুত হিসাব, reaction ও judgement চলে।",
    inner_identity:
      sign.tone === "deep-hidden"
        ? "ভিতরে গভীর সন্দেহ, trust-test এবং silent emotional storage আছে।"
        : sign.tone === "balance-reader"
        ? "ভিতরে দুদিক মাপার tendency আছে—মন চায় balance, কিন্তু সিদ্ধান্তে delay হতে পারে।"
        : sign.tone === "slow-builder"
        ? "ভিতরে দায়িত্ব, চাপ ও long-term result-এর ভার কাজ করে।"
        : "ভিতরে নিজের rhythm আছে; বাইরে যা দেখায়, ভিতরে তার চেয়ে বেশি calculation চলে।",
    relationship_identity:
      "সম্পর্কে respect, loyalty ও emotional depth দরকার; surface connection বেশিক্ষণ ধরে না।",
    work_identity:
      "কাজে নিজের zone, visible result এবং decision control চাই; অন্যের অধীনে বেশি pressure থাকলে ভিতরে অস্বস্তি বাড়ে।",
    pressure_identity:
      "চাপ এলে সে সব কথা মুখে বলে না; আগে সহ্য করে, তারপর এক পর্যায়ে direction shift করে।",
    hidden_contradiction:
      numerology.root === 3
        ? "ভিতরে visibility চায়, কিন্তু একই সাথে স্থিরতা ধরে রাখার pressure থাকে।"
        : numerology.root === 7
        ? "ভিতরে সত্য খোঁজে, কিন্তু মানুষকে পুরো trust করতে দেরি হয়।"
        : numerology.root === 8
        ? "ভিতরে authority চায়, কিন্তু delay ও responsibility তাকে বারবার পরীক্ষা করে।"
        : "ভিতরে চাই স্থিরতা, কিন্তু জীবন বারবার নতুন হিসাব খুলে দেয়।",
    phonetic_signature:
      `${phonetic.first_sound_signature}; ${phonetic.sound_balance}; first=${phonetic.first_sound_key || "N/A"}, last=${phonetic.last_sound_key || "N/A"}`,
    strongest_identity_line:
      `${name || "এই মানুষ"} সহজে পড়ে না; তাকে বুঝতে হলে তার silence, delay আর choice pattern দেখতে হয়।`
  };
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

  const nameDerivedRashi = firstSoundRashi(name);
  const derivedRashi = lagnaSign || moonSign || nameDerivedRashi;
  const numerology = numerologyFromName(name);
  const phonetic = buildPhoneticProfile(name);

  const sections = combineTraits(
    derivedRashi,
    moonSign,
    sunSign,
    venusSign,
    numerology
  );

  const human_identity_mirror = buildHumanIdentityMirror({
    name,
    primarySign: derivedRashi,
    numerology,
    phonetic,
    hasFullAstro
  });

  return {
    subject_name: name || null,
    precision_mode: precisionMode || null,
    exact_traits_allowed: precisionMode === "FULL_BIRTH" || precisionMode === "DOB_TOB",

    identity_mode: hasFullAstro ? "NATAL_IDENTITY_LOCKED" : "NAME_LOCKED_PATTERN",

    astro_identity: {
      lagna_sign: lagnaSign,
      moon_sign: moonSign,
      sun_sign: sunSign,
      venus_sign: venusSign,
      derived_rashi_sign: derivedRashi,
      derived_rashi_bengali: BENGALI_SIGNS[derivedRashi] || null,
      name_derived_rashi_sign: nameDerivedRashi,
      name_derived_rashi_bengali: BENGALI_SIGNS[nameDerivedRashi] || null
    },

    name_profile: {
      raw_name: name || null,
      clean_name: phonetic.clean,
      first_sound_key: phonetic.first_sound_key,
      last_sound_key: phonetic.last_sound_key,
      first_sound_signature: phonetic.first_sound_signature,
      sound_balance: phonetic.sound_balance,
      vowel_count: phonetic.vowel_count,
      consonant_count: phonetic.consonant_count,
      vibration_class:
        numerology.root === 3 ? "EXPRESSIVE_VISIBLE" :
        numerology.root === 7 ? "DEEP_SILENT" :
        numerology.root === 8 ? "KARMIC_PRESSURE" :
        numerology.root === 9 ? "FORCEFUL_IMPACT" :
        "MIXED_PATTERN",
      root_number: numerology.root
    },

    numerology,

    delivery_lines: {
      rashi_line: `তোমার নামের রাশি: ${BENGALI_SIGNS[nameDerivedRashi] || nameDerivedRashi}`,
      zodiac_line: hasFullAstro
        ? `জন্মতথ্য অনুযায়ী প্রধান রাশি/লগ্ন-ধাঁচ: ${BENGALI_SIGNS[derivedRashi] || derivedRashi}`
        : `রাশি অনুযায়ী তুমি: ${BENGALI_SIGNS[derivedRashi] || derivedRashi} রাশির জাতক`,
      numerology_line: `তোমার নামের সংখ্যা (Numerology): ${numerology.root}`,
      identity_line: human_identity_mirror.strongest_identity_line
    },

    sections,

    human_identity_mirror,

    precision_note: hasFullAstro
      ? "Full birth data active: identity is derived from natal chart signs plus name/numerology support."
      : "Name-only mode gives elite zodiac-pattern, phonetic and numerology identity, not full astro-exact natal identity.",

    parent_overlay_available: false
  };
}