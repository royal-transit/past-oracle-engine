// lib/domain-corrector.js
// FULL REPLACEMENT — DOMAIN CORRECTOR V3

function clone(obj) {
  return JSON.parse(JSON.stringify(obj || {}));
}

function hasYear(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0;
}

function partial(evt, reason = "event partially materialised") {
  const e = clone(evt);
  e.status = "PARTIAL";
  e.trigger_phase = "partial execution";
  e.impact_summary = reason;
  return e;
}

function executed(evt, reason = "event has definitively occurred") {
  const e = clone(evt);
  e.status = "EXECUTED";
  e.trigger_phase = "event confirmed";
  e.impact_summary = reason;
  return e;
}

export function correctExactDomainSummary(exactDomainSummary = [], facts = {}, deliverySafePacket = {}) {
  const truth = deliverySafePacket?.domain_truth_map || {};

  return (exactDomainSummary || []).map((item) => {
    const out = clone(item);

    if (!out?.primary_exact_event) return out;

    // Settlement realism — precedence matters
    if (out.domain_key === "SETTLEMENT") {
      const settlementTruth = truth?.foreign?.settlement || "unknown";
      const hasGranted = hasYear(facts?.settlement_year_claim);
      const hasApplied = hasYear(facts?.settlement_applied_year_claim);
      const hasRefused = hasYear(facts?.settlement_refusal_year_claim);
      const hasAppeal = hasYear(facts?.appeal_year_claim);

      if (hasRefused) {
        out.primary_exact_event = executed(
          out.primary_exact_event,
          "settlement refusal has occurred"
        );
        out.primary_exact_event.event_type = "refusal event";
        out.primary_exact_event.date_marker =
          facts?.settlement_refusal_year_claim || out.primary_exact_event.date_marker;
      }

      if (hasAppeal) {
        out.primary_exact_event = partial(
          out.primary_exact_event,
          "appeal is ongoing after refusal"
        );
        out.primary_exact_event.event_type = "appeal ongoing";
        out.primary_exact_event.date_marker =
          facts?.appeal_year_claim || out.primary_exact_event.date_marker;
      } else if (!hasRefused && hasApplied && !hasGranted) {
        out.primary_exact_event = partial(
          out.primary_exact_event,
          "application submitted but not completed"
        );
        out.primary_exact_event.event_type = "application in process";
        out.primary_exact_event.date_marker =
          facts?.settlement_applied_year_claim || out.primary_exact_event.date_marker;
      } else if (!hasRefused && settlementTruth === "ongoing") {
        out.primary_exact_event = partial(
          out.primary_exact_event,
          "settlement process is active but not completed"
        );
        out.primary_exact_event.event_type = "settlement process / ongoing phase";
      }
    }

    // Foreign entry realism
    if (out.domain_key === "FOREIGN" && out.primary_exact_event) {
      if (hasYear(facts?.foreign_entry_year_claim)) {
        out.primary_exact_event.date_marker =
          facts?.foreign_entry_year_claim || out.primary_exact_event.date_marker;
      }
    }

    // Visa realism
    if (out.domain_key === "VISA" && out.primary_exact_event) {
      if (hasYear(facts?.foreign_entry_year_claim) && out.primary_exact_event.status === "PARTIAL") {
        out.primary_exact_event = partial(
          out.primary_exact_event,
          "visa / permission path opened but completion is not fully confirmed"
        );
      }
    }

    return out;
  });
}

export function correctIdentityPacket(identityPacket = {}, input = {}, facts = {}) {
  const out = clone(identityPacket);
  const hasDob = !!String(input?.dob || "").trim();
  const hasTob = !!String(input?.tob || "").trim();

  if (!hasDob) {
    out.identity_mode = "NAME_LOCKED_PATTERN";
    out.exact_traits_allowed = false;
    out.precision_note =
      "Name-only mode gives elite zodiac-pattern and numerology identity, not full astro-exact natal identity.";
  } else if (hasDob && !hasTob) {
    out.identity_mode = "DOB_LOCKED_REDUCED";
    out.exact_traits_allowed = false;
    out.precision_note =
      "DOB mode is stronger than name-only, but full astro exactness still needs birth time.";
  } else {
    out.identity_mode = "FULL_ASTRO_IDENTITY";
    out.exact_traits_allowed = true;
    out.precision_note =
      "Full birth data mode allows strongest astro identity lock.";
  }

  out.parent_overlay_available = false;
  return out;
}