// lib/domain-corrector.js
// SAFE DOMAIN CORRECTOR

function clone(obj) {
  return JSON.parse(JSON.stringify(obj || {}));
}

function hasYear(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0;
}

function low(v) {
  return String(v || "").trim().toLowerCase();
}

function makeStatus(evt, status, phase, summary) {
  const e = clone(evt);
  e.status = status;
  e.trigger_phase = phase;
  e.impact_summary = summary;
  return e;
}

function occurred(evt, summary = "event has definitively occurred") {
  return makeStatus(evt, "EXECUTED", "event confirmed", summary);
}

function partial(evt, summary = "event partially materialised") {
  return makeStatus(evt, "PARTIAL", "partial execution", summary);
}

function eventHas(evt, phrase) {
  return low(evt?.event_type).includes(low(phrase));
}

export function correctExactDomainSummary(exactDomainSummary = [], facts = {}, deliverySafePacket = {}) {
  const truth = deliverySafePacket?.domain_truth_map || {};

  return (Array.isArray(exactDomainSummary) ? exactDomainSummary : []).map((item) => {
    const out = clone(item);
    if (!out?.primary_exact_event) return out;

    // settlement hard truth
    if (out.domain_key === "SETTLEMENT") {
      const hasApplied = hasYear(facts?.settlement_applied_year_claim);
      const hasRefused = hasYear(facts?.settlement_refusal_year_claim);
      const hasGranted = hasYear(facts?.settlement_year_claim);

      if ((hasApplied || hasRefused) && !hasGranted) {
        out.primary_exact_event = partial(
          out.primary_exact_event,
          "settlement process is active but not completed"
        );
        out.primary_exact_event.event_type = "settlement process / ongoing phase";
        out.primary_exact_event.date_marker =
          facts?.settlement_refusal_year_claim ||
          facts?.settlement_applied_year_claim ||
          out.primary_exact_event.date_marker;
      } else if (truth?.foreign?.settlement === "ongoing") {
        out.primary_exact_event = partial(
          out.primary_exact_event,
          "settlement process is active but not completed"
        );
        out.primary_exact_event.event_type = "settlement process / ongoing phase";
      } else if (truth?.foreign?.settlement === "occurred" && hasGranted) {
        out.primary_exact_event = occurred(
          out.primary_exact_event,
          "settlement has definitively occurred"
        );
        out.primary_exact_event.event_type = "settlement event";
        out.primary_exact_event.date_marker = facts?.settlement_year_claim || out.primary_exact_event.date_marker;
      } else if (eventHas(out.primary_exact_event, "foreign entry")) {
        out.primary_exact_event = partial(
          out.primary_exact_event,
          "foreign movement is confirmed, settlement completion is not confirmed"
        );
        out.primary_exact_event.event_type = "settlement process / base formation phase";
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
    out.precision_note = "Name-only mode gives elite zodiac-pattern and numerology identity, not full astro-exact natal identity.";
  } else if (hasDob && !hasTob) {
    out.identity_mode = "DOB_LOCKED_REDUCED";
    out.exact_traits_allowed = false;
    out.precision_note = "DOB mode is stronger than name-only, but full astro exactness still needs birth time.";
  } else {
    out.identity_mode = "FULL_ASTRO_IDENTITY";
    out.exact_traits_allowed = true;
    out.precision_note = "Full birth data mode allows strongest astro identity lock.";
  }

  out.parent_overlay_available = !!facts?.parent_overlay_claim;

  return out;
}