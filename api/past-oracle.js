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

    const response = {
      endpoint_called: "past-oracle.js",
      engine_status: "PAST_FORENSIC_ENGINE_PHASE_1",
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

      forensic_readiness: {
        backend_foundation: "READY",
        reverse_scan_engine: "PENDING_NEXT_PHASE",
        memory_anchor_detection: "PENDING_NEXT_PHASE",
        timeline_band_scan: "PENDING_NEXT_PHASE",
        premium_past_forensic_output: "PENDING_NEXT_PHASE"
      },

      response_contract: {
        current_phase_output: "FOUNDATION_ONLY",
        next_phase_target: "REVERSE_SCAN_READY"
      },

      verdict: buildVerdict(mode, dobValidation.valid, hasName, hasQuestion)
    };

    return res.status(200).json(response);
  } catch (error) {
    return res.status(500).json({
      endpoint_called: "past-oracle.js",
      engine_status: "PAST_FORENSIC_ENGINE_PHASE_1",
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

function buildVerdict(mode, dobValid, hasName, hasQuestion) {
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

  return {
    outcome: "FOUNDATION_ACTIVE",
    engine_decision: "READY_FOR_NEXT_FORENSIC_PHASE",
    practical_note:
      hasName && hasQuestion
        ? "Input accepted. System is ready for deeper past forensic logic"
        : hasName
        ? "Name intake accepted. System is ready for reverse scan expansion"
        : "DOB intake accepted. System is ready for reverse scan expansion"
  };
}