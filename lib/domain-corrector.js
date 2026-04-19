// lib/domain-corrector.js
// FULL LIFE DOMAIN CORRECTOR — UNIVERSAL VERSION

function clone(obj) {
  return JSON.parse(JSON.stringify(obj || {}));
}

function low(v) {
  return String(v || "").trim().toLowerCase();
}

function hasYear(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0;
}

function setStatus(evt, status, reason, phase) {
  const e = clone(evt);
  e.status = status;
  e.impact_summary = reason;
  e.trigger_phase = phase;
  return e;
}

function occurred(evt, reason = "event has definitively occurred") {
  return setStatus(evt, "EXECUTED", reason, "event confirmed");
}

function partial(evt, reason = "event partially materialised") {
  return setStatus(evt, "PARTIAL", reason, "partial execution");
}

function notOccurred(evt, reason = "event not confirmed") {
  return setStatus(evt, "NOT_EXECUTED", reason, "no confirmed execution");
}

function broken(evt, reason = "event broke or did not hold") {
  return setStatus(evt, "BROKEN", reason, "broken execution");
}

function eventHas(evt, phrase) {
  return low(evt?.event_type).includes(low(phrase));
}

function getTruth(deliverySafePacket) {
  return deliverySafePacket?.domain_truth_map || {};
}

function correctForeign(item, facts, truth) {
  if (!["FOREIGN", "IMMIGRATION", "VISA", "SETTLEMENT"].includes(item.domain_key)) return item;
  const out = clone(item);
  if (!out.primary_exact_event) return out;

  const f = truth.foreign || {};
  const hasEntry = hasYear(facts.foreign_entry_year_claim);
  const hasGranted = hasYear(facts.settlement_year_claim);
  const hasApplied = hasYear(facts.settlement_applied_year_claim);
  const hasRefused = hasYear(facts.settlement_refusal_year_claim);
  const hasAppeal = hasYear(facts.appeal_year_claim);

  if (item.domain_key === "FOREIGN") {
    if (f.movement === "occurred" || hasEntry) {
      out.primary_exact_event = occurred(out.primary_exact_event, "foreign movement has definitively occurred");
      if (!hasYear(out.primary_exact_event.date_marker) && hasEntry) {
        out.primary_exact_event.date_marker = facts.foreign_entry_year_claim;
      }
      if (eventHas(out.primary_exact_event, "settlement")) {
        out.primary_exact_event.event_type = "foreign entry event";
      }
    } else if (f.movement === "ongoing") {
      out.primary_exact_event = partial(out.primary_exact_event, "foreign movement process is active");
    }
  }

  if (item.domain_key === "IMMIGRATION" || item.domain_key === "VISA") {
    if (f.immigration === "occurred" || f.visa === "occurred" || hasEntry) {
      out.primary_exact_event = occurred(out.primary_exact_event, "immigration / visa event has occurred");
      if (!hasYear(out.primary_exact_event.date_marker) && hasEntry) {
        out.primary_exact_event.date_marker = facts.foreign_entry_year_claim;
      }
    } else if (f.immigration === "ongoing" || f.visa === "ongoing") {
      out.primary_exact_event = partial(out.primary_exact_event, "immigration / visa process is active");
    }
  }

  if (item.domain_key === "SETTLEMENT") {
    if ((hasApplied || hasRefused || hasAppeal) && !hasGranted) {
      out.primary_exact_event = partial(out.primary_exact_event, "settlement process is active but not completed");
      out.primary_exact_event.event_type = "settlement process / ongoing phase";
      out.primary_exact_event.date_marker =
        facts.appeal_year_claim ||
        facts.settlement_refusal_year_claim ||
        facts.settlement_applied_year_claim ||
        out.primary_exact_event.date_marker;
    } else if (f.settlement === "ongoing") {
      out.primary_exact_event = partial(out.primary_exact_event, "settlement process is active but not completed");
      out.primary_exact_event.event_type = "settlement process / ongoing base formation";
    } else if (f.settlement === "occurred" && hasGranted) {
      out.primary_exact_event = occurred(out.primary_exact_event, "settlement has definitively occurred");
      out.primary_exact_event.event_type = "settlement event";
      out.primary_exact_event.date_marker = facts.settlement_year_claim || out.primary_exact_event.date_marker;
    } else {
      if (eventHas(out.primary_exact_event, "foreign entry")) {
        out.primary_exact_event = partial(out.primary_exact_event, "foreign movement is confirmed, settlement completion is not confirmed");
        out.primary_exact_event.event_type = "settlement process / base formation phase";
      }
    }
  }

  return out;
}

function correctRelationship(item, truth) {
  if (!["MARRIAGE", "DIVORCE", "PARTNERSHIP", "MULTIPLE_MARRIAGE"].includes(item.domain_key)) return item;
  const out = clone(item);
  if (!out.primary_exact_event) return out;

  const r = truth.relationship || {};

  if (item.domain_key === "MARRIAGE") {
    if (r.marriage === "occurred") out.primary_exact_event = occurred(out.primary_exact_event, "marriage / partnership has occurred");
    else if (r.marriage === "ongoing") out.primary_exact_event = partial(out.primary_exact_event, "relationship / marriage line is active but not fully stabilised");
    else if (r.marriage === "not_occurred") out.primary_exact_event = notOccurred(out.primary_exact_event, "marriage completion is not confirmed");
  }

  if (item.domain_key === "DIVORCE") {
    if (r.divorce === "occurred") out.primary_exact_event = broken(out.primary_exact_event, "break / separation has occurred");
    else if (r.divorce === "ongoing") out.primary_exact_event = partial(out.primary_exact_event, "separation pressure is active");
  }

  if (item.domain_key === "MULTIPLE_MARRIAGE") {
    if (r.multiple_marriage === "occurred") out.primary_exact_event = occurred(out.primary_exact_event, "multiple relationship / marriage pattern has occurred");
    else if (r.multiple_marriage === "ongoing") out.primary_exact_event = partial(out.primary_exact_event, "multiple relationship pattern is active");
  }

  if (item.domain_key === "PARTNERSHIP") {
    if (r.marriage === "occurred") out.primary_exact_event = occurred(out.primary_exact_event, "partnership line has occurred");
    else if (r.marriage === "ongoing") out.primary_exact_event = partial(out.primary_exact_event, "partnership line is active but not stable");
  }

  return out;
}

function correctWork(item, truth) {
  if (!["JOB", "CAREER", "BUSINESS", "EDUCATION"].includes(item.domain_key)) return item;
  const out = clone(item);
  if (!out.primary_exact_event) return out;

  const w = truth.work || {};
  const e = truth.education || {};

  if (item.domain_key === "JOB") {
    if (w.job === "occurred") out.primary_exact_event = occurred(out.primary_exact_event, "job / service line has occurred");
    else if (w.job === "ongoing") out.primary_exact_event = partial(out.primary_exact_event, "job / service line is active but not stabilised");
  }

  if (item.domain_key === "CAREER") {
    if (w.career === "occurred") out.primary_exact_event = occurred(out.primary_exact_event, "career direction has occurred");
    else if (w.career === "ongoing") out.primary_exact_event = partial(out.primary_exact_event, "career direction is active but not stabilised");
  }

  if (item.domain_key === "BUSINESS") {
    if (w.business === "occurred") out.primary_exact_event = occurred(out.primary_exact_event, "business line has occurred");
    else if (w.business === "ongoing") out.primary_exact_event = partial(out.primary_exact_event, "business line is active but not stabilised");
  }

  if (item.domain_key === "EDUCATION") {
    if (e.education === "occurred") out.primary_exact_event = occurred(out.primary_exact_event, "education / study line has occurred");
    else if (e.education === "ongoing") out.primary_exact_event = partial(out.primary_exact_event, "education / study line is active");
  }

  return out;
}

function correctMoney(item, truth) {
  if (!["MONEY", "DEBT", "PROPERTY", "HOME", "VEHICLE"].includes(item.domain_key)) return item;
  const out = clone(item);
  if (!out.primary_exact_event) return out;

  const m = truth.money || {};

  if (item.domain_key === "MONEY") {
    if (m.money === "occurred") out.primary_exact_event = occurred(out.primary_exact_event, "money flow has occurred");
    else if (m.money === "ongoing") out.primary_exact_event = partial(out.primary_exact_event, "money flow is active but not steady");
  }

  if (item.domain_key === "DEBT") {
    if (m.debt === "occurred") out.primary_exact_event = occurred(out.primary_exact_event, "debt / liability has occurred");
    else if (m.debt === "ongoing") out.primary_exact_event = partial(out.primary_exact_event, "debt pressure is active");
  }

  if (["PROPERTY", "HOME", "VEHICLE"].includes(item.domain_key)) {
    if (m.property === "occurred") out.primary_exact_event = occurred(out.primary_exact_event, "property / base / asset line has occurred");
    else if (m.property === "ongoing") out.primary_exact_event = partial(out.primary_exact_event, "property / base / asset line is active but not stabilised");
  }

  return out;
}

function correctHealth(item, truth) {
  if (!["HEALTH", "MENTAL"].includes(item.domain_key)) return item;
  const out = clone(item);
  if (!out.primary_exact_event) return out;

  const h = truth.health || {};

  if (item.domain_key === "HEALTH") {
    if (h.health === "occurred") out.primary_exact_event = occurred(out.primary_exact_event, "health pressure has occurred");
    else if (h.health === "ongoing") out.primary_exact_event = partial(out.primary_exact_event, "health pressure remains active");
    else if (h.health === "not_occurred") out.primary_exact_event = notOccurred(out.primary_exact_event, "major health event is not confirmed");
  }

  if (item.domain_key === "MENTAL") {
    if (h.mental === "occurred") out.primary_exact_event = occurred(out.primary_exact_event, "mental pressure / fear has occurred");
    else if (h.mental === "ongoing") out.primary_exact_event = partial(out.primary_exact_event, "mental pressure remains active");
    else if (h.mental === "not_occurred") out.primary_exact_event = notOccurred(out.primary_exact_event, "deep mental collapse is not confirmed");
  }

  return out;
}

function correctConflict(item, truth) {
  if (!["LEGAL", "DOCUMENT", "ENEMY", "BLOCKAGE"].includes(item.domain_key)) return item;
  const out = clone(item);
  if (!out.primary_exact_event) return out;

  const c = truth.conflict || {};

  if (item.domain_key === "LEGAL" || item.domain_key === "DOCUMENT") {
    if (c.legal === "occurred") out.primary_exact_event = occurred(out.primary_exact_event, "authority / legal / document event has occurred");
    else if (c.legal === "ongoing") out.primary_exact_event = partial(out.primary_exact_event, "authority / legal / document process is active");
  }

  if (item.domain_key === "BLOCKAGE") {
    if (c.blockage === "occurred") out.primary_exact_event = occurred(out.primary_exact_event, "blockage pattern has occurred");
    else if (c.blockage === "ongoing") out.primary_exact_event = partial(out.primary_exact_event, "blockage remains active");
  }

  if (item.domain_key === "ENEMY") {
    if (c.enemy === "occurred") out.primary_exact_event = occurred(out.primary_exact_event, "opposition / resistance has occurred");
    else if (c.enemy === "ongoing") out.primary_exact_event = partial(out.primary_exact_event, "opposition / resistance remains active");
  }

  return out;
}

function correctFamily(item, truth) {
  if (!["FAMILY", "CHILDREN"].includes(item.domain_key)) return item;
  const out = clone(item);
  if (!out.primary_exact_event) return out;

  const f = truth.family || {};

  if (item.domain_key === "FAMILY") {
    if (f.family === "occurred") out.primary_exact_event = occurred(out.primary_exact_event, "family / responsibility line has occurred");
    else if (f.family === "ongoing") out.primary_exact_event = partial(out.primary_exact_event, "family / responsibility pressure is active");
  }

  if (item.domain_key === "CHILDREN") {
    if (f.children === "occurred") out.primary_exact_event = occurred(out.primary_exact_event, "children / continuity line has occurred");
    else if (f.children === "ongoing") out.primary_exact_event = partial(out.primary_exact_event, "children / continuity process is active");
  }

  return out;
}

function correctSingle(item, facts, deliverySafePacket) {
  const truth = getTruth(deliverySafePacket);
  let out = clone(item);
  out = correctForeign(out, facts, truth);
  out = correctRelationship(out, truth);
  out = correctWork(out, truth);
  out = correctMoney(out, truth);
  out = correctHealth(out, truth);
  out = correctConflict(out, truth);
  out = correctFamily(out, truth);
  return out;
}

function applyIdentityPrecision(identityPacket = {}, input = {}, facts = {}) {
  const out = clone(identityPacket);
  const hasDob = !!String(input?.dob || "").trim();
  const hasTob = !!String(input?.tob || "").trim();
  const hasParents = !!facts?.parent_overlay_claim;

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

  if (hasParents) {
    out.parent_overlay_available = true;
    out.parent_overlay_note = "Parent-name overlay can be shown as family-pattern support, but exact parental zodiac needs parent birth data.";
  } else {
    out.parent_overlay_available = false;
  }

  if (facts?.name_change_claim) {
    out.name_change_overlay = "Name-change / alias pattern detected. Identity delivery should treat vibration as layered, not singular.";
  }

  return out;
}

export function correctExactDomainSummary(exactDomainSummary = [], facts = {}, deliverySafePacket = {}) {
  return (exactDomainSummary || []).map((item) => correctSingle(item, facts, deliverySafePacket));
}

export function correctIdentityPacket(identityPacket = {}, input = {}, facts = {}) {
  return applyIdentityPrecision(identityPacket, input, facts);
}