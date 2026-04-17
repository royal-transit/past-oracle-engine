// lib/chart-core.js
// Universal chart core
// FULL REPLACEMENT
// Goals:
// - name only = valid
// - name + DOB = valid
// - name + facts/parents = valid
// - DOB does NOT force TOB/POB
// - subject depth is explicitly classified
// - name-only mode builds a reusable identity packet
// - alias candidates / name profile / confidence base available for later layers
// - stable subject packet for past/raw/future layers

export async function buildChartCore(input, provider) {
  const normalized = normalizeInput(input);
  const validation = validateInput(normalized);

  if (!validation.valid) {
    return {
      system_status: "INVALID_INPUT",
      validation,
      input_normalized: normalized
    };
  }

  const subject_context = buildSubjectContext(normalized);
  const birth_context = buildBirthContext(normalized, subject_context);
  const current_context = buildCurrentContext(normalized);

  const natal = await provider.getNatalChart({
    ...normalized,
    birth_datetime_iso: birth_context.birth_datetime_iso
  });

  const dasha = await provider.getVimshottariDasha({
    ...normalized,
    birth_datetime_iso: birth_context.birth_datetime_iso
  });

  const kp = await provider.getKPCusps({
    ...normalized,
    birth_datetime_iso: birth_context.birth_datetime_iso
  });

  const divisional = await provider.getDivisionalCharts({
    ...normalized,
    birth_datetime_iso: birth_context.birth_datetime_iso
  });

  const transit_now = await provider.getTransitChart({
    ...normalized,
    event_datetime_iso: current_context.event_datetime_iso
  });

  return {
    system_status: "OK",
    engine_status: "CHART_CORE_UNIVERSAL_V3",
    precision_mode: birth_context.precision_mode,
    subject_mode: subject_context.subject_mode,
    identity_depth: subject_context.identity_depth,
    input_normalized: normalized,
    subject_context,
    birth_context,
    current_context,
    evidence_packet: {
      natal,
      dasha,
      kp,
      divisional,
      transit_now
    }
  };
}

function safeStr(v) {
  return typeof v === "string" ? v.trim() : "";
}

function safeNum(v) {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function normalizeDob(dob) {
  if (!dob) return null;

  const iso = /^(\d{4})-(\d{2})-(\d{2})$/;
  const dmy = /^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/;

  if (iso.test(dob)) return dob;

  if (dmy.test(dob)) {
    const [, d, m, y] = dob.match(dmy) || [];
    return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }

  return null;
}

function normalizeTime(t) {
  if (!t) return null;

  const hm24 = /^([01]?\d|2[0-3]):([0-5]\d)$/;
  const hm12 = /^(\d{1,2}):([0-5]\d)\s*(AM|PM)$/i;

  if (hm24.test(t)) {
    const [, h, m] = t.match(hm24) || [];
    return `${String(h).padStart(2, "0")}:${m}`;
  }

  if (hm12.test(t)) {
    let [, h, m, ap] = t.match(hm12) || [];
    let hh = Number(h);
    const A = ap.toUpperCase();

    if (A === "AM" && hh === 12) hh = 0;
    if (A === "PM" && hh !== 12) hh += 12;

    return `${String(hh).padStart(2, "0")}:${m}`;
  }

  return null;
}

function normalizeIsoDateTime(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function normalizeName(name) {
  const raw = safeStr(name);
  if (!raw) return "";

  return raw
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizeName(name) {
  const normalized = normalizeName(name);
  return normalized ? normalized.split(" ").filter(Boolean) : [];
}

function countSyllablesApprox(name) {
  const src = normalizeName(name).replace(/\s+/g, "");
  if (!src) return 0;

  const vowelGroups = src.match(/[aeiouyāīūeoôóòö]+/gi);
  if (vowelGroups && vowelGroups.length) return vowelGroups.length;

  return Math.max(1, Math.ceil(src.length / 3));
}

function alphaValue(ch) {
  const code = ch.toUpperCase().charCodeAt(0);
  if (code >= 65 && code <= 90) return code - 64;
  return 0;
}

function calcCompoundNumber(name) {
  const src = normalizeName(name).replace(/\s+/g, "");
  if (!src) return 0;

  let sum = 0;
  for (const ch of src) {
    sum += alphaValue(ch);
  }
  return sum;
}

function reduceToRootNumber(n) {
  let x = Number(n || 0);
  if (!Number.isFinite(x) || x <= 0) return 0;

  while (x > 9 && x !== 11 && x !== 22 && x !== 33) {
    x = String(x)
      .split("")
      .reduce((a, b) => a + Number(b), 0);
  }
  return x;
}

function detectVibrationClass(rootNumber) {
  if ([1, 10, 19, 28].includes(rootNumber)) return "ASSERTIVE";
  if ([2, 11, 20, 29].includes(rootNumber)) return "RECEPTIVE";
  if ([3, 12, 21, 30].includes(rootNumber)) return "EXPRESSIVE";
  if ([4, 13, 22, 31].includes(rootNumber)) return "UNCONVENTIONAL";
  if ([5, 14, 23, 32].includes(rootNumber)) return "MOBILE";
  if ([6, 15, 24, 33].includes(rootNumber)) return "RESPONSIBLE";
  if ([7, 16, 25, 34].includes(rootNumber)) return "WITHDRAWN";
  if ([8, 17, 26, 35].includes(rootNumber)) return "HEAVY";
  if ([9, 18, 27, 36].includes(rootNumber)) return "INTENSE";
  return "NEUTRAL";
}

function buildAliasCandidates(name) {
  const raw = safeStr(name);
  if (!raw) return [];

  const normalized = normalizeName(raw);
  const tokens = tokenizeName(raw);

  const out = new Set();
  out.add(raw);
  if (normalized) out.add(normalized);

  if (tokens.length) {
    out.add(tokens.join(" "));
    out.add(tokens.join(""));
    out.add(tokens[0]);
    out.add(tokens[tokens.length - 1]);
  }

  return [...out].filter(Boolean);
}

function buildNameProfile(name) {
  const raw = safeStr(name);
  const normalized = normalizeName(raw);
  const tokens = tokenizeName(raw);
  const compoundNumber = calcCompoundNumber(raw);
  const rootNumber = reduceToRootNumber(compoundNumber);
  const firstToken = tokens[0] || "";
  const firstLetter = firstToken ? firstToken[0] : "";

  return {
    raw_name: raw || null,
    normalized_name: normalized || null,
    tokens,
    token_count: tokens.length,
    first_letter: firstLetter || null,
    first_sound_key: firstLetter ? firstLetter.toLowerCase() : null,
    name_length: normalized ? normalized.replace(/\s+/g, "").length : 0,
    syllable_count: countSyllablesApprox(raw),
    compound_number: compoundNumber,
    root_number: rootNumber,
    vibration_class: detectVibrationClass(rootNumber),
    alias_candidates: buildAliasCandidates(raw)
  };
}

function detectParentSignal(facts) {
  const src = safeStr(facts).toLowerCase();
  if (!src) return false;

  const patterns = [
    "father",
    "mother",
    "son of",
    "daughter of",
    "wife of",
    "husband of",
    "baba",
    "ma",
    "abba",
    "amma",
    "bin ",
    "bint "
  ];

  return patterns.some((x) => src.includes(x));
}

function detectQuestionMode(question) {
  const q = safeStr(question).toLowerCase();

  if (!q) return "GENERAL";
  if (/(^|\s)(past|before|earlier|history)(\s|$)/i.test(q)) return "PAST";
  if (/(^|\s)(future|next|upcoming)(\s|$)/i.test(q)) return "FUTURE";
  if (/(^|\s)(raw|live|snapshot|transit|now|current|present)(\s|$)/i.test(q)) return "RAW";
  return "GENERAL";
}

function buildIdentityDepth(input) {
  const hasName = !!input.name;
  const hasDob = !!input.dob;
  const hasTob = !!input.tob;
  const hasPob = !!input.pob;
  const hasFacts = !!input.facts;
  const hasParentSignal = detectParentSignal(input.facts);

  if (hasName && hasDob && hasTob) return "LEVEL_5_FULL_BIRTH";
  if (hasName && hasDob) return "LEVEL_4_NAME_DOB";
  if (hasName && (hasParentSignal || hasFacts)) return "LEVEL_3_NAME_CONTEXT";
  if (hasName) return "LEVEL_2_NAME_ONLY";
  if (hasDob && hasTob) return "LEVEL_4_BIRTH_ONLY";
  if (hasDob) return "LEVEL_3_DOB_ONLY";
  return "LEVEL_1_FACTS_ONLY";
}

function buildIdentityConfidence(input, identityDepth) {
  const hasName = !!input.name;
  const hasDob = !!input.dob;
  const hasTob = !!input.tob;
  const hasPob = !!input.pob;
  const hasFacts = !!input.facts;

  if (hasName && hasDob && hasTob && hasPob) return "HIGH";
  if (hasName && hasDob && hasTob) return "HIGH";
  if (hasName && hasDob) return "MEDIUM_HIGH";
  if (hasName && hasFacts) return "MEDIUM";
  if (hasName) return "MEDIUM";
  if (hasDob) return "MEDIUM";
  return "LOW";
}

function buildSubjectMode(questionMode, identityDepth) {
  if (questionMode === "PAST" && identityDepth === "LEVEL_2_NAME_ONLY") {
    return "NAME_ONLY_PAST";
  }
  if (questionMode === "PAST" && identityDepth === "LEVEL_3_NAME_CONTEXT") {
    return "NAME_CONTEXT_PAST";
  }
  if (questionMode === "PAST" && identityDepth === "LEVEL_4_NAME_DOB") {
    return "NAME_DOB_PAST";
  }
  if (questionMode === "PAST" && identityDepth === "LEVEL_5_FULL_BIRTH") {
    return "FULL_BIRTH_PAST";
  }
  if (questionMode === "RAW" && identityDepth === "LEVEL_2_NAME_ONLY") {
    return "NAME_ONLY_RAW";
  }
  if (questionMode === "RAW" && identityDepth === "LEVEL_4_NAME_DOB") {
    return "NAME_DOB_RAW";
  }
  if (questionMode === "FUTURE" && identityDepth === "LEVEL_2_NAME_ONLY") {
    return "NAME_ONLY_FUTURE";
  }
  if (questionMode === "FUTURE" && identityDepth === "LEVEL_4_NAME_DOB") {
    return "NAME_DOB_FUTURE";
  }
  return `${questionMode}_${identityDepth}`;
}

function buildSubjectContext(input) {
  const question_mode = detectQuestionMode(input.question);
  const identity_depth = buildIdentityDepth(input);
  const name_profile = input.name ? buildNameProfile(input.name) : null;
  const identity_confidence = buildIdentityConfidence(input, identity_depth);
  const subject_mode = buildSubjectMode(question_mode, identity_depth);

  return {
    question_mode,
    subject_mode,
    identity_depth,
    identity_confidence,
    subject_key: input.dob
      ? `DOB:${input.dob}`
      : input.name
        ? `NAME:${normalizeName(input.name)}`
        : "ANON",
    is_name_only_mode: identity_depth === "LEVEL_2_NAME_ONLY",
    is_name_context_mode: identity_depth === "LEVEL_3_NAME_CONTEXT",
    is_dob_locked: !!input.dob,
    is_full_birth_locked: !!(input.dob && input.tob),
    alias_candidates: name_profile?.alias_candidates || [],
    name_profile,
    parent_signal_detected: detectParentSignal(input.facts)
  };
}

function normalizeInput(input) {
  return {
    name: safeStr(input.name),
    dob: normalizeDob(safeStr(input.dob)),
    tob: normalizeTime(safeStr(input.tob)),
    pob: safeStr(input.pob),
    latitude: safeNum(input.latitude),
    longitude: safeNum(input.longitude),
    timezone_offset: safeStr(input.timezone_offset || "+06:00"),
    question: safeStr(input.question),
    facts: safeStr(input.facts),
    current_datetime_iso: normalizeIsoDateTime(safeStr(input.current_datetime_iso))
  };
}

function validateInput(input) {
  const issues = [];

  const hasName = !!input.name;
  const hasDob = !!input.dob;
  const hasTob = !!input.tob;
  const hasFacts = !!input.facts;

  if (!hasName && !hasDob && !hasFacts) {
    issues.push("Provide at least a name, DOB, or facts.");
  }

  if (hasTob && !hasDob) {
    issues.push("TOB provided without valid DOB.");
  }

  return {
    valid: issues.length === 0,
    issues
  };
}

function buildBirthContext(input, subjectContext) {
  let birth_datetime_iso = null;
  let precision_mode = "NAME_ONLY";

  if (input.dob && input.tob) {
    birth_datetime_iso = `${input.dob}T${input.tob}:00${input.timezone_offset}`;
    precision_mode = input.pob ? "FULL_BIRTH" : "DOB_TOB";
  } else if (input.dob) {
    birth_datetime_iso = `${input.dob}T12:00:00${input.timezone_offset}`;
    precision_mode = input.pob ? "DOB_POB_REDUCED" : "DOB_ONLY_REDUCED";
  } else if (input.name) {
    precision_mode = subjectContext.is_name_context_mode ? "NAME_CONTEXT" : "NAME_ONLY";
  } else {
    precision_mode = "FACTS_ONLY";
  }

  return {
    birth_datetime_iso,
    birthplace: input.pob || null,
    latitude: input.latitude,
    longitude: input.longitude,
    timezone_offset: input.timezone_offset,
    precision_mode,
    timeline_locked: !input.dob,
    exact_timeline_allowed: !!(input.dob && input.tob),
    identity_confidence: subjectContext.identity_confidence
  };
}

function buildCurrentContext(input) {
  const event_datetime_iso = input.current_datetime_iso || new Date().toISOString();

  return {
    event_datetime_iso,
    latitude: input.latitude,
    longitude: input.longitude,
    timezone_offset: input.timezone_offset
  };
}