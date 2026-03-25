export default function handler(req, res) {
  try {
    const now = new Date();
    const query = req.query || {};

    const rawName = typeof query.name === "string" ? query.name.trim() : "";
    const rawDob = typeof query.dob === "string" ? query.dob.trim() : "";
    const rawQuestion = typeof query.question === "string" ? query.question.trim() : "";

    const hasName = rawName.length > 0;
    const hasDob = rawDob.length > 0;
    const hasQuestion = rawQuestion.length > 0;

    let mode = "NO_INPUT";
    if (hasDob && hasName) {
      mode = "HYBRID_MODE";
    } else if (hasDob) {
      mode = "DOB_MODE";
    } else if (hasName) {
      mode = "NAME_MODE";
    }

    const dobValidation = validateDob(rawDob);
    const dobReady = dobValidation.valid && !!dobValidation.normalized;

    const ageContext = dobReady ? buildAgeContext(dobValidation.normalized, now) : null;
    const reverseScanBands = dobReady ? buildReverseScanBands(ageContext) : [];
    const memoryAnchorScan = buildMemoryAnchorScan(mode, dobReady, hasName, ageContext);
    const nameVibrationBlock = buildNameVibrationBlock(rawName, hasName, dobReady);
    const forensicConfidence = buildForensicConfidence(mode, dobReady, hasName, hasQuestion);
    const domainReadiness = buildDomainReadiness(mode, dobReady, hasName);
    const questionRouting = buildQuestionRouting(rawQuestion, hasQuestion);

    const eventDensityLogic = buildEventDensityLogic({
      mode,
      dobReady,
      reverseScanBands,
      hasQuestion,
      questionRouting
    });

    const eventSignalMap = buildEventSignalMap({
      mode,
      dobReady,
      hasName,
      questionRouting
    });

    const yearBandNarrowing = buildYearBandNarrowing({
      dobReady,
      ageContext,
      eventDensityLogic
    });

    const anchorConvergence = buildAnchorConvergence({
      dobReady,
      hasName,
      questionRouting,
      eventSignalMap,
      yearBandNarrowing
    });

    const timelineTruthExtraction = buildTimelineTruthExtraction({
      dobReady,
      hasName,
      mode,
      questionRouting,
      eventDensityLogic,
      eventSignalMap,
      anchorConvergence
    });

    const forensicSummary = buildForensicSummary({
      mode,
      dobReady,
      hasName,
      hasQuestion,
      ageContext,
      questionRouting,
      eventDensityLogic,
      eventSignalMap,
      yearBandNarrowing,
      timelineTruthExtraction,
      anchorConvergence,
      forensicConfidence
    });

    const lokkothaSummary = buildLokkothaSummary({
      mode,
      dobReady,
      hasName,
      questionRouting,
      timelineTruthExtraction,
      eventSignalMap
    });

    const verdict = buildVerdict({
      mode,
      dobValid: dobValidation.valid,
      hasName,
      hasQuestion,
      dobReady
    });

    const projectPasteBlock = buildProjectPasteBlock({
      mode,
      rawName,
      normalizedDob: dobValidation.normalized,
      forensicConfidence,
      eventDensityLogic,
      eventSignalMap,
      yearBandNarrowing,
      timelineTruthExtraction,
      forensicSummary,
      lokkothaSummary,
      verdict
    });

    const response = {
      endpoint_called: "past-oracle.js",
      engine_status: "PAST_FORENSIC_ENGINE_PHASE_4",
      system_status: "ACTIVE",
      generated_at_utc: now.toISOString(),

      input_packet: {
        name: rawName || null,
        dob: rawDob || null,
        question: rawQuestion || null,
        has_name: hasName,
        has_dob: hasDob,
        has_question: hasQuestion
      },

      mode_detection: {
        selected_mode: mode,
        reasoning:
          mode === "HYBRID_MODE"
            ? "Both name and dob supplied"
            : mode === "DOB_MODE"
            ? "DOB supplied, name absent or optional"
            : mode === "NAME_MODE"
            ? "Name supplied, DOB absent"
            : "No usable input supplied"
      },

      validation_block: {
        dob_format_valid: dobValidation.valid,
        dob_normalized: dobValidation.normalized,
        dob_error: dobValidation.error
      },

      age_context: ageContext,

      reverse_scan_engine: {
        status: dobReady ? "ACTIVE" : "LIMITED",
        scan_mode: dobReady ? "DOB_ANCHORED_REVERSE_SCAN" : hasName ? "NAME_FALLBACK_PREP" : "NO_SCAN",
        coverage_strength: dobReady ? "HIGHER_PRECISION" : hasName ? "LOWER_PRECISION_NAME_MODE" : "UNAVAILABLE",
        bands: reverseScanBands
      },

      memory_anchor_detection: memoryAnchorScan,

      name_vibration_fallback: nameVibrationBlock,

      forensic_confidence: forensicConfidence,

      domain_readiness: domainReadiness,

      question_routing: questionRouting,

      event_density_logic: eventDensityLogic,

      event_signal_map: eventSignalMap,

      year_band_narrowing: yearBandNarrowing,

      anchor_convergence: anchorConvergence,

      timeline_truth_extraction: timelineTruthExtraction,

      forensic_summary: forensicSummary,

      lokkotha_summary: lokkothaSummary,

      premium_past_forensic_output: {
        current_stage: "EVENT_SIGNAL_AND_YEAR_BAND_PHASE",
        next_stage: "QUESTION_LOCK_AND_PASTE_OPTIMIZATION",
        notes: [
          "Event signals are now mapped by domain",
          "Approximate year bands are now narrowed when DOB is supplied",
          "Anchor convergence layer is active",
          "Readable and lokkotha summaries are stronger and more domain-aware"
        ]
      },

      project_paste_block: projectPasteBlock,

      verdict
    };

    return res.status(200).json(response);
  } catch (error) {
    return res.status(500).json({
      endpoint_called: "past-oracle.js",
      engine_status: "PAST_FORENSIC_ENGINE_PHASE_4",
      system_status: "ERROR",
      error_message: error instanceof Error ? error.message : "Unknown error"
    });
  }
}

function validateDob(dob) {
  if (!dob) {
    return {
      valid: false,
      normalized: null,
      error: "DOB not supplied"
    };
  }

  const isoLike = /^(\d{4})-(\d{2})-(\d{2})$/;
  const slashLike = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;

  if (isoLike.test(dob)) {
    const [, year, month, day] = dob.match(isoLike) || [];
    if (!isRealDate(Number(year), Number(month), Number(day))) {
      return {
        valid: false,
        normalized: null,
        error: "DOB format matched YYYY-MM-DD but date is invalid"
      };
    }

    return {
      valid: true,
      normalized: `${year}-${month}-${day}`,
      error: null
    };
  }

  if (slashLike.test(dob)) {
    const [, day, month, year] = dob.match(slashLike) || [];
    const dd = String(day).padStart(2, "0");
    const mm = String(month).padStart(2, "0");

    if (!isRealDate(Number(year), Number(mm), Number(dd))) {
      return {
        valid: false,
        normalized: null,
        error: "DOB format matched DD/MM/YYYY but date is invalid"
      };
    }

    return {
      valid: true,
      normalized: `${year}-${mm}-${dd}`,
      error: null
    };
  }

  return {
    valid: false,
    normalized: null,
    error: "Unsupported DOB format. Use YYYY-MM-DD or DD/MM/YYYY"
  };
}

function isRealDate(year, month, day) {
  if (!year || !month || !day) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function buildAgeContext(normalizedDob, now) {
  const birth = new Date(`${normalizedDob}T00:00:00Z`);
  const current = new Date(now.toISOString());

  let ageYears = current.getUTCFullYear() - birth.getUTCFullYear();
  const currentMonthDay = `${String(current.getUTCMonth() + 1).padStart(2, "0")}-${String(
    current.getUTCDate()
  ).padStart(2, "0")}`;
  const birthMonthDay = `${String(birth.getUTCMonth() + 1).padStart(2, "0")}-${String(
    birth.getUTCDate()
  ).padStart(2, "0")}`;

  if (currentMonthDay < birthMonthDay) {
    ageYears -= 1;
  }

  return {
    birth_date_utc: normalizedDob,
    approximate_age_years: ageYears >= 0 ? ageYears : 0,
    lifecycle_stage:
      ageYears < 13
        ? "CHILDHOOD"
        : ageYears < 20
        ? "ADOLESCENT"
        : ageYears < 30
        ? "YOUNG_ADULT"
        : ageYears < 45
        ? "ADULT_FORMATION"
        : ageYears < 60
        ? "MATURE_PHASE"
        : "LATE_MATURITY"
  };
}

function buildReverseScanBands(ageContext) {
  if (!ageContext) return [];

  const age = ageContext.approximate_age_years;

  const rawBands = [
    {
      label: "RECENT_0_TO_3_YEARS",
      start_age: Math.max(age - 3, 0),
      end_age: age,
      forensic_weight: "VERY_HIGH",
      memory_recall_probability: "VERY_HIGH",
      scan_purpose: "fresh memory, recent shocks, negotiations, losses, gains, relationship turns"
    },
    {
      label: "FORMATIVE_3_TO_7_YEARS",
      start_age: Math.max(age - 7, 0),
      end_age: Math.max(age - 3, 0),
      forensic_weight: "HIGH",
      memory_recall_probability: "HIGH",
      scan_purpose: "clear remembered transitions, life direction turns, work or family patterning"
    },
    {
      label: "MID_MEMORY_7_TO_12_YEARS",
      start_age: Math.max(age - 12, 0),
      end_age: Math.max(age - 7, 0),
      forensic_weight: "MEDIUM_HIGH",
      memory_recall_probability: "MEDIUM_HIGH",
      scan_purpose: "stable memory anchors, major reversals, migration, reputation, emotional shifts"
    },
    {
      label: "DEEP_MEMORY_12_TO_20_YEARS",
      start_age: Math.max(age - 20, 0),
      end_age: Math.max(age - 12, 0),
      forensic_weight: "MEDIUM",
      memory_recall_probability: "MEDIUM",
      scan_purpose: "long-cycle background causes, education, identity reformation, old karmic signatures"
    },
    {
      label: "ROOT_PHASE_BIRTH_TO_20PLUS",
      start_age: 0,
      end_age: Math.max(age - 20, 0),
      forensic_weight: age >= 20 ? "SPECIALIZED" : "MERGED_WITH_UPPER_BANDS",
      memory_recall_probability: age >= 20 ? "LOW_TO_MEDIUM" : "MERGED",
      scan_purpose: "root conditioning, family field, childhood imprint, origin-story mechanics"
    }
  ];

  return rawBands.filter((band) => band.end_age >= band.start_age);
}

function buildMemoryAnchorScan(mode, dobReady, hasName, ageContext) {
  return {
    status: dobReady || hasName ? "ACTIVE" : "LOCKED",
    anchor_method:
      dobReady
        ? "DOB_TIMELINE_ANCHORING"
        : hasName
        ? "NAME_RESONANCE_FALLBACK"
        : "NO_ANCHOR",
    likely_anchor_zones: dobReady
      ? [
          "relationships and separations",
          "work or income fluctuations",
          "house move / migration / relocation",
          "authority pressure / paperwork / legal stress",
          "family burden / emotional turning point"
        ]
      : hasName
      ? [
          "identity-linked memory clusters",
          "repeating emotional patterns",
          "social perception and naming resonance"
        ]
      : [],
    age_recall_bias: ageContext
      ? {
          strongest_band: "RECENT_0_TO_3_YEARS",
          secondary_band: "FORMATIVE_3_TO_7_YEARS",
          note: "Human recall is usually strongest in recent and transitional periods"
        }
      : null
  };
}

function buildNameVibrationBlock(name, hasName, dobReady) {
  if (!hasName) {
    return {
      status: "ABSENT",
      precision_level: "NONE",
      note: "Name not supplied"
    };
  }

  const normalized = name.toUpperCase().replace(/\s+/g, " ").trim();
  const firstChar = normalized.charAt(0) || null;
  const letterCount = normalized.replace(/\s/g, "").length;

  return {
    status: "ACTIVE",
    precision_level: dobReady ? "SUPPORTIVE_ONLY" : "PRIMARY_FALLBACK_MODE",
    normalized_name: normalized,
    first_character_anchor: firstChar,
    letter_count: letterCount,
    note: dobReady
      ? "Name vibration available as support layer"
      : "Name vibration currently acting as fallback intake layer until DOB supplied"
  };
}

function buildForensicConfidence(mode, dobReady, hasName, hasQuestion) {
  let score = 20;
  const reasons = [];

  if (dobReady) {
    score += 45;
    reasons.push("Valid DOB supplied");
  }

  if (hasName) {
    score += 15;
    reasons.push("Name supplied");
  }

  if (hasQuestion) {
    score += 10;
    reasons.push("Question context supplied");
  }

  if (mode === "NO_INPUT") {
    reasons.push("No usable forensic intake");
  }

  if (!dobReady && hasName) {
    reasons.push("Name-only fallback reduces precision");
  }

  let band = "LOW";
  if (score >= 70) band = "HIGH";
  else if (score >= 45) band = "MEDIUM";

  return {
    confidence_score: score,
    confidence_band: band,
    reasons
  };
}

function buildDomainReadiness(mode, dobReady, hasName) {
  return {
    relationship_domain: dobReady || hasName ? "READY" : "WAITING_INPUT",
    work_domain: dobReady || hasName ? "READY" : "WAITING_INPUT",
    money_domain: dobReady || hasName ? "READY" : "WAITING_INPUT",
    authority_domain: dobReady || hasName ? "READY" : "WAITING_INPUT",
    family_domain: dobReady || hasName ? "READY" : "WAITING_INPUT",
    root_cause_forensics: dobReady ? "DOB_READY" : hasName ? "NAME_LIMITED" : "NOT_READY",
    mode_summary: mode
  };
}

function buildQuestionRouting(question, hasQuestion) {
  if (!hasQuestion) {
    return {
      status: "INACTIVE",
      target_domain: "GENERAL_FORENSIC",
      intent_type: "NONE",
      route_reason: "No question supplied"
    };
  }

  const q = question.toLowerCase();

  let targetDomain = "GENERAL_FORENSIC";
  let intentType = "OPEN_FORENSIC";

  if (containsAny(q, ["love", "relationship", "marriage", "wife", "husband", "breakup", "partner"])) {
    targetDomain = "RELATIONSHIP";
    intentType = "RELATIONSHIP_FORENSIC";
  } else if (containsAny(q, ["money", "income", "business", "job", "work", "debt", "payment"])) {
    targetDomain = "MONEY_WORK";
    intentType = "MONEY_FORENSIC";
  } else if (containsAny(q, ["family", "home", "mother", "father", "brother", "sister", "child"])) {
    targetDomain = "FAMILY";
    intentType = "FAMILY_FORENSIC";
  } else if (containsAny(q, ["case", "legal", "paperwork", "authority", "court", "visa", "document"])) {
    targetDomain = "AUTHORITY_PAPERWORK";
    intentType = "AUTHORITY_FORENSIC";
  }

  return {
    status: "ACTIVE",
    target_domain: targetDomain,
    intent_type: intentType,
    route_reason: "Question language was mapped into a forensic domain"
  };
}

function containsAny(text, words) {
  return words.some((word) => text.includes(word));
}

function buildEventDensityLogic({ mode, dobReady, reverseScanBands, hasQuestion, questionRouting }) {
  if (!dobReady) {
    return {
      status: "LIMITED",
      dominant_band: "NAME_ONLY_MODE",
      secondary_band: null,
      event_density_grade: "LOW_PRECISION",
      recent_recall_strength: "MEDIUM_IF_USER_RECALLS",
      deep_recall_strength: "LOW",
      targeting_boost: hasQuestion ? "QUESTION_GUIDED_ONLY" : "NONE"
    };
  }

  const dominantBand = reverseScanBands[0]?.label || "RECENT_0_TO_3_YEARS";
  const secondaryBand = reverseScanBands[1]?.label || "FORMATIVE_3_TO_7_YEARS";

  return {
    status: "ACTIVE",
    dominant_band: dominantBand,
    secondary_band: secondaryBand,
    event_density_grade: hasQuestion ? "TARGETED_HIGH" : "GENERAL_HIGH",
    recent_recall_strength: "VERY_HIGH",
    deep_recall_strength: "MEDIUM",
    targeting_boost: hasQuestion ? questionRouting.target_domain : "GENERAL"
  };
}

function buildEventSignalMap({ mode, dobReady, hasName, questionRouting }) {
  if (!dobReady && !hasName) {
    return {
      status: "LOCKED",
      dominant_signal_family: null,
      signal_markers: []
    };
  }

  if (!dobReady && hasName) {
    return {
      status: "LIMITED",
      dominant_signal_family: "IDENTITY_REPEAT",
      signal_markers: [
        "repeating emotional response",
        "social naming resonance",
        "identity-linked memory echo"
      ]
    };
  }

  const map = {
    RELATIONSHIP: {
      family: "BOND_SHIFT",
      markers: ["distance", "miscommunication", "break", "emotional reversal", "attachment strain"]
    },
    MONEY_WORK: {
      family: "MONEY_PRESSURE",
      markers: ["income fluctuation", "deal slowdown", "payment delay", "work pressure", "financial blockage"]
    },
    FAMILY: {
      family: "HOME_BURDEN",
      markers: ["family pressure", "household strain", "responsibility load", "home shift", "emotional duty"]
    },
    AUTHORITY_PAPERWORK: {
      family: "AUTHORITY_STRESS",
      markers: ["document burden", "legal friction", "compliance stress", "paperwork delay", "official pressure"]
    },
    GENERAL_FORENSIC: {
      family: "RECENT_PRESSURE_CLUSTER",
      markers: ["stress peak", "transition point", "burden cycle", "communication issue", "directional shift"]
    }
  };

  const selected = map[questionRouting.target_domain] || map.GENERAL_FORENSIC;

  return {
    status: "ACTIVE",
    dominant_signal_family: selected.family,
    signal_markers: selected.markers
  };
}

function buildYearBandNarrowing({ dobReady, ageContext, eventDensityLogic }) {
  if (!dobReady || !ageContext) {
    return {
      status: "LIMITED",
      narrowed_window_label: "UNAVAILABLE_WITHOUT_DOB",
      approximate_years_back: null,
      note: "Year narrowing needs valid DOB"
    };
  }

  const age = ageContext.approximate_age_years;
  let yearsBack = [0, 3];

  if (eventDensityLogic.dominant_band === "FORMATIVE_3_TO_7_YEARS") {
    yearsBack = [3, 7];
  } else if (eventDensityLogic.dominant_band === "MID_MEMORY_7_TO_12_YEARS") {
    yearsBack = [7, 12];
  } else if (eventDensityLogic.dominant_band === "DEEP_MEMORY_12_TO_20_YEARS") {
    yearsBack = [12, 20];
  }

  return {
    status: "ACTIVE",
    narrowed_window_label: eventDensityLogic.dominant_band,
    approximate_years_back: {
      from: yearsBack[0],
      to: yearsBack[1]
    },
    approximate_age_window: {
      start_age: Math.max(age - yearsBack[1], 0),
      end_age: Math.max(age - yearsBack[0], 0)
    },
    note: "This is a narrowed forensic recall band, not an exact event date"
  };
}

function buildAnchorConvergence({ dobReady, hasName, questionRouting, eventSignalMap, yearBandNarrowing }) {
  if (!dobReady && !hasName) {
    return {
      status: "LOCKED",
      convergence_grade: "NONE",
      anchor_count: 0
    };
  }

  let anchorCount = 1;
  if (hasName) anchorCount += 1;
  if (dobReady) anchorCount += 2;
  if (questionRouting.status === "ACTIVE") anchorCount += 1;
  if (eventSignalMap.status === "ACTIVE") anchorCount += 1;
  if (yearBandNarrowing.status === "ACTIVE") anchorCount += 1;

  let convergenceGrade = "LOW";
  if (anchorCount >= 5) convergenceGrade = "HIGH";
  else if (anchorCount >= 3) convergenceGrade = "MEDIUM";

  return {
    status: "ACTIVE",
    convergence_grade: convergenceGrade,
    anchor_count: anchorCount,
    note: "More converging anchors usually means stronger forensic readability"
  };
}

function buildTimelineTruthExtraction({
  dobReady,
  hasName,
  mode,
  questionRouting,
  eventDensityLogic,
  eventSignalMap,
  anchorConvergence
}) {
  if (!dobReady && !hasName) {
    return {
      status: "LOCKED",
      dominant_truth_zone: null,
      secondary_truth_zone: null,
      pattern_statement: "No forensic extraction possible without basic intake"
    };
  }

  if (!dobReady && hasName) {
    return {
      status: "LIMITED",
      dominant_truth_zone: "IDENTITY_AND_REPEAT_PATTERN",
      secondary_truth_zone: "SOCIAL_PERCEPTION_AND_EMOTIONAL_REPEAT",
      pattern_statement:
        "Name fallback suggests identity-linked repeating emotional or social memory patterns, but exact timeline truth remains limited without DOB",
      convergence_grade: anchorConvergence.convergence_grade
    };
  }

  const map = {
    RELATIONSHIP: {
      dominant: "RELATIONSHIP_TENSION_OR_SHIFT",
      secondary: "EMOTIONAL_BOND_CHANGE"
    },
    MONEY_WORK: {
      dominant: "MONEY_PRESSURE_OR_WORK_SHIFT",
      secondary: "NEGOTIATION_OR_PAYMENT_BLOCK"
    },
    FAMILY: {
      dominant: "FAMILY_BURDEN_OR_HOME_SHIFT",
      secondary: "EMOTIONAL_RESPONSIBILITY_FIELD"
    },
    AUTHORITY_PAPERWORK: {
      dominant: "AUTHORITY_PRESSURE_OR_DOCUMENT_STRESS",
      secondary: "DELAY_OR_COMPLIANCE_LOAD"
    },
    GENERAL_FORENSIC: {
      dominant: "RECENT_LIFE_PRESSURE_CLUSTER",
      secondary: "TRANSITIONAL_MEMORY_ANCHOR"
    }
  };

  const selected = map[questionRouting.target_domain] || map.GENERAL_FORENSIC;

  return {
    status: "ACTIVE",
    dominant_truth_zone: selected.dominant,
    secondary_truth_zone: selected.secondary,
    dominant_signal_family: eventSignalMap.dominant_signal_family,
    pattern_statement:
      mode === "HYBRID_MODE"
        ? `DOB + name indicate that the strongest recoverable truth zone is ${selected.dominant}, supported by ${selected.secondary} and signal family ${eventSignalMap.dominant_signal_family}`
        : `DOB-anchored scan suggests the strongest recoverable truth zone is ${selected.dominant}, supported by ${selected.secondary} and signal family ${eventSignalMap.dominant_signal_family}`,
    density_alignment: eventDensityLogic.dominant_band,
    convergence_grade: anchorConvergence.convergence_grade
  };
}

function buildForensicSummary({
  mode,
  dobReady,
  hasName,
  hasQuestion,
  ageContext,
  questionRouting,
  eventDensityLogic,
  eventSignalMap,
  yearBandNarrowing,
  timelineTruthExtraction,
  anchorConvergence,
  forensicConfidence
}) {
  let readableSummary = "";

  if (mode === "NO_INPUT") {
    readableSummary =
      "No forensic scan can start yet because the system has not received a usable name or date of birth.";
  } else if (!dobReady && hasName) {
    readableSummary =
      "A name-only fallback scan is active. The system can detect identity-linked repeating patterns and emotional/social memory clusters, but full timeline accuracy remains limited until a valid DOB is supplied.";
  } else {
    readableSummary =
      `A DOB-anchored reverse scan is active. The strongest recall pressure is concentrated in ${eventDensityLogic.dominant_band}, with secondary support from ${eventDensityLogic.secondary_band}. ` +
      `The dominant signal family is ${eventSignalMap.dominant_signal_family}, and the clearest truth zone is ${timelineTruthExtraction.dominant_truth_zone}. ` +
      `Approximate narrowing currently points to ${yearBandNarrowing.narrowed_window_label}.`;
  }

  return {
    status: "ACTIVE",
    readability_grade: "HIGH",
    client_readable_summary: readableSummary,
    confidence_band: forensicConfidence.confidence_band,
    lifecycle_stage: ageContext ? ageContext.lifecycle_stage : null,
    question_guided: hasQuestion,
    anchor_convergence: anchorConvergence.convergence_grade,
    routed_domain: questionRouting.target_domain
  };
}

function buildLokkothaSummary({ mode, dobReady, hasName, questionRouting, timelineTruthExtraction, eventSignalMap }) {
  if (mode === "NO_INPUT") {
    return {
      status: "ACTIVE",
      style: "LOKKOTHA",
      text: "নামও নেই, জন্মের তারিখও নেই—ধোঁয়ার ভিতর ছায়া ধরা যায়, মানুষ ধরা যায় না।"
    };
  }

  if (!dobReady && hasName) {
    return {
      status: "ACTIVE",
      style: "LOKKOTHA",
      text: "নামের ঢেউ আছে, কিন্তু ঘাটের দাগ পুরো খোলা নয়; নাম পথ দেখায়, জন্মতারিখ দরজা খুলে।"
    };
  }

  const map = {
    RELATIONSHIP: "মনের বাঁধন যেখানে আলগা হয়েছিল, কথার সুঁতো সেখানেই আগে কেঁপেছিল।",
    MONEY_WORK: "হাঁড়ির আগুন নিভে না এক ঝড়ে; আগে দরজায় থমকায় দর কষাকষি, পরে টাকার হাঁড়ি ঠান্ডা হয়।",
    FAMILY: "ঘরের ভার চুপে নামে, কিন্তু তার শব্দ সংসারের চালেই আগে বাজে।",
    AUTHORITY_PAPERWORK: "কাগজের কাঁটা ছোট, কিন্তু গায়ে বিঁধলে পথের গতি অনেকখানি থামে।",
    GENERAL_FORENSIC: "যে ঢেউ আজও মনে লাগে, তার পাথর আগেই জলে পড়েছিল।"
  };

  return {
    status: "ACTIVE",
    style: "LOKKOTHA",
    text: map[questionRouting.target_domain] || map.GENERAL_FORENSIC,
    dominant_truth_zone: timelineTruthExtraction.dominant_truth_zone,
    signal_family: eventSignalMap.dominant_signal_family
  };
}

function buildProjectPasteBlock({
  mode,
  rawName,
  normalizedDob,
  forensicConfidence,
  eventDensityLogic,
  eventSignalMap,
  yearBandNarrowing,
  timelineTruthExtraction,
  forensicSummary,
  lokkothaSummary,
  verdict
}) {
  const lines = [];

  lines.push("PAST FORENSIC INTAKE");
  lines.push(`Mode: ${mode}`);
  lines.push(`Name: ${rawName || "N/A"}`);
  lines.push(`DOB: ${normalizedDob || "N/A"}`);
  lines.push(`Confidence Band: ${forensicConfidence.confidence_band}`);
  lines.push(`Confidence Score: ${forensicConfidence.confidence_score}`);

  lines.push(`Dominant Recall Band: ${eventDensityLogic.dominant_band || "N/A"}`);
  lines.push(`Secondary Recall Band: ${eventDensityLogic.secondary_band || "N/A"}`);
  lines.push(`Event Signal Family: ${eventSignalMap.dominant_signal_family || "N/A"}`);
  lines.push(
    `Approximate Narrowed Window: ${yearBandNarrowing.narrowed_window_label || "N/A"}`
  );

  lines.push(`Dominant Truth Zone: ${timelineTruthExtraction.dominant_truth_zone || "N/A"}`);
  lines.push(`Secondary Truth Zone: ${timelineTruthExtraction.secondary_truth_zone || "N/A"}`);

  lines.push("Readable Summary:");
  lines.push(forensicSummary.client_readable_summary);

  lines.push("Lokkotha Summary:");
  lines.push(lokkothaSummary.text);

  lines.push("Final Practical Verdict:");
  lines.push(verdict.practical_note);

  lines.push("PAST FORENSIC BLOCK END");

  return lines.join("\n");
}

function buildVerdict({ mode, dobValid, hasName, hasQuestion, dobReady }) {
  if (mode === "NO_INPUT") {
    return {
      outcome: "INSUFFICIENT_INPUT",
      engine_decision: "WAITING_FOR_NAME_OR_DOB",
      practical_note: "Supply at least a name or DOB to activate forensic intake"
    };
  }

  if (mode === "DOB_MODE" && !dobValid) {
    return {
      outcome: "INPUT_REPAIR_NEEDED",
      engine_decision: "DOB_REJECTED",
      practical_note: "DOB supplied but invalid. Correct format before forensic scan"
    };
  }

  if (mode === "HYBRID_MODE" && !dobValid) {
    return {
      outcome: "PARTIAL_ACTIVATION",
      engine_decision: "NAME_ACCEPTED_DOB_REJECTED",
      practical_note: "Name intake accepted, DOB needs correction for premium precision"
    };
  }

  if (dobReady) {
    return {
      outcome: "FORENSIC_SCAN_READY",
      engine_decision: "DOB_ANCHORED_REVERSE_SCAN_ACTIVE",
      practical_note: hasQuestion
        ? "DOB accepted. System is ready for deeper question-directed forensic past scan"
        : "DOB accepted. System is ready for reverse scan expansion"
    };
  }

  if (hasName) {
    return {
      outcome: "LIMITED_FORENSIC_READY",
      engine_decision: "NAME_FALLBACK_ACTIVE",
      practical_note: "Name intake accepted. Forensic fallback is possible, but DOB will unlock premium precision"
    };
  }

  return {
    outcome: "FOUNDATION_ACTIVE",
    engine_decision: "READY_FOR_NEXT_FORENSIC_PHASE",
    practical_note: "System foundation active"
  };
}