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
    const forensicConfidence = buildForensicConfidence(mode, dobReady, hasName, hasQuestion);
    const nameVibrationBlock = buildNameVibrationBlock(rawName, hasName, dobReady);
    const domainReadiness = buildDomainReadiness(mode, dobReady, hasName);

    const response = {
      endpoint_called: "past-oracle.js",
      engine_status: "PAST_FORENSIC_ENGINE_PHASE_2",
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

      premium_past_forensic_output: {
        current_stage: "STRUCTURED_ENGINE_SCAFFOLD",
        next_stage: "EVENT_PATTERN_AND_DENSITY_LOGIC",
        notes: [
          "Timeline bands are now generated when valid DOB is supplied",
          "Name-only mode remains available as fallback but carries lower precision",
          "Question-aware forensic routing is ready for deeper expansion"
        ]
      },

      verdict: buildVerdict({
        mode,
        dobValid: dobValidation.valid,
        hasName,
        hasQuestion,
        dobReady
      })
    };

    return res.status(200).json(response);
  } catch (error) {
    return res.status(500).json({
      endpoint_called: "past-oracle.js",
      engine_status: "PAST_FORENSIC_ENGINE_PHASE_2",
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