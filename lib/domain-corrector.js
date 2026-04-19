// lib/domain-corrector.js
// FULL LIFE DOMAIN CORRECTOR — HARD TRUTH ALIGNMENT LAYER

function clone(obj) {
  return JSON.parse(JSON.stringify(obj || {}));
}

function norm(v) {
  return String(v || "").trim().toUpperCase();
}

function low(v) {
  return String(v || "").trim().toLowerCase();
}

function hasYear(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0;
}

function setPartial(evt, reason = "process is active but not completed") {
  const e = clone(evt);
  e.status = "PARTIAL";
  e.trigger_phase = "partial execution";
  e.impact_summary = reason;
  return e;
}

function setNotExecuted(evt, reason = "event not confirmed") {
  const e = clone(evt);
  e.status = "NOT_EXECUTED";
  e.trigger_phase = "no confirmed execution";
  e.impact_summary = reason;
  return e;
}

function setExecuted(evt, reason = "event has definitively occurred") {
  const e = clone(evt);
  e.status = "EXECUTED";
  e.trigger_phase = "event confirmed";
  e.impact_summary = reason;
  return e;
}

function setBroken(evt, reason = "event broke or did not hold") {
  const e = clone(evt);
  e.status = "BROKEN";
  e.trigger_phase = "broken execution";
  e.impact_summary = reason;
  return e;
}

function eventTypeHas(evt, phrase) {
  return low(evt?.event_type).includes(low(phrase));
}

function familyTruthMap(deliverySafePacket) {
  return deliverySafePacket?.domain_truth_map || {};
}

function correctForeignDomain(item, facts = {}, deliverySafePacket = {}) {
  if (!item || !["FOREIGN", "IMMIGRATION", "VISA", "SETTLEMENT"].includes(item.domain_key)) {
    return item;
  }

  const out = clone(item);
  const foreignTruth = familyTruthMap(deliverySafePacket)?.foreign || {};

  const hasEntry = hasYear(facts?.foreign_entry_year_claim);
  const hasSettlementGranted = hasYear(facts?.settlement_year_claim);
  const hasSettlementApplied = hasYear(facts?.settlement_applied_year_claim);
  const hasSettlementRefusal = hasYear(facts?.settlement_refusal_year_claim);

  // FOREIGN
  if (out.domain_key === "FOREIGN") {
    if (out.primary_exact_event) {
      if (foreignTruth.movement === "occurred" || hasEntry) {
        out.primary_exact_event = setExecuted(
          out.primary_exact_event,
          "foreign movement has definitively occurred"
        );
        if (eventTypeHas(out.primary_exact_event, "settlement")) {
          out.primary_exact_event.event_type = "foreign entry event";
        }
        if (!hasYear(out.primary_exact_event.date_marker) && hasEntry) {
          out.primary_exact_event.date_marker = facts.foreign_entry_year_claim;
        }
      } else if (foreignTruth.movement === "ongoing") {
        out.primary_exact_event = setPartial(
          out.primary_exact_event,
          "foreign movement process is active but not fully confirmed"
        );
      }
    }
  }

  // IMMIGRATION / VISA
  if (out.domain_key === "IMMIGRATION" || out.domain_key === "VISA") {
    if (out.primary_exact_event) {
      if (foreignTruth.immigration === "occurred" || foreignTruth.visa === "occurred" || hasEntry) {
        out.primary_exact_event = setExecuted(
          out.primary_exact_event,
          "immigration / visa movement has definitively occurred"
        );
        if (!hasYear(out.primary_exact_event.date_marker) && hasEntry) {
          out.primary_exact_event.date_marker = facts.foreign_entry_year_claim;
        }
      } else if (
        foreignTruth.immigration === "ongoing" ||
        foreignTruth.visa === "ongoing"
      ) {
        out.primary_exact_event = setPartial(
          out.primary_exact_event,
          "immigration / visa process is active but not completed"
        );
      }
    }
  }

  // SETTLEMENT
  if (out.domain_key === "SETTLEMENT") {
    if (out.primary_exact_event) {
      // Applied / refused / appeal ongoing = ongoing, NOT executed
      if ((hasSettlementApplied || hasSettlementRefusal) && !hasSettlementGranted) {
        out.primary_exact_event = setPartial(
          out.primary_exact_event,
          "settlement process is active but not completed"
        );
        out.primary_exact_event.event_type = "settlement process / application phase";
        if (!hasYear(out.primary_exact_event.date_marker) && hasSettlementApplied) {
          out.primary_exact_event.date_marker = facts.settlement_applied_year_claim;
        }
      } else if (foreignTruth.settlement === "ongoing") {
        out.primary_exact_event = setPartial(
          out.primary_exact_event,
          "settlement process is active but not completed"
        );
        out.primary_exact_event.event_type = "settlement process / ongoing base formation";
      } else if (foreignTruth.settlement === "occurred" && hasSettlementGranted) {
        out.primary_exact_event = setExecuted(
          out.primary_exact_event,
          "settlement has definitively occurred"
        );
        out.primary_exact_event.event_type = "settlement event";
        if (!hasYear(out.primary_exact_event.date_marker)) {
          out.primary_exact_event.date_marker = facts.settlement_year_claim;
        }
      } else if (!hasSettlementGranted && !hasSettlementApplied && !hasSettlementRefusal) {
        // protect against wrongly mapping foreign entry as settlement completion
        if (eventTypeHas(out.primary_exact_event, "foreign entry")) {
          out.primary_exact_event = setPartial(
            out.primary_exact_event,
            "foreign movement detected, but settlement completion is not confirmed"
          );
          out.primary_exact_event.event_type = "settlement process / base formation phase";
        }
      }
    }

    out.alternative_exact_events = (out.alternative_exact_events || []).map((evt) => {
      let e = clone(evt);
      if ((hasSettlementApplied || hasSettlementRefusal) && !hasSettlementGranted) {
        e = setPartial(e, "settlement process is active but not completed");
        if (eventTypeHas(e, "foreign entry")) {
          e.event_type = "settlement process / application phase";
        }
      }
      return e;
    });
  }

  return out;
}

function correctRelationshipDomain(item, deliverySafePacket = {}) {
  if (!item || !["MARRIAGE", "DIVORCE", "PARTNERSHIP", "MULTIPLE_MARRIAGE"].includes(item.domain_key)) {
    return item;
  }

  const out = clone(item);
  const rel = familyTruthMap(deliverySafePacket)?.relationship || {};

  if (out.primary_exact_event) {
    if (out.domain_key === "MARRIAGE") {
      if (rel.marriage === "occurred") {
        out.primary_exact_event = setExecuted(out.primary_exact_event, "marriage / partnership has definitively occurred");
      } else if (rel.marriage === "ongoing") {
        out.primary_exact_event = setPartial(out.primary_exact_event, "relationship / marriage line is active but not fully stabilised");
      } else if (rel.marriage === "not_occurred") {
        out.primary_exact_event = setNotExecuted(out.primary_exact_event, "marriage completion is not confirmed");
      }
    }

    if (out.domain_key === "DIVORCE") {
      if (rel.divorce === "occurred") {
        out.primary_exact_event = setBroken(out.primary_exact_event, "relationship break / separation has occurred");
      } else if (rel.divorce === "ongoing") {
        out.primary_exact_event = setPartial(out.primary_exact_event, "separation pressure is active but not fully completed");
      }
    }

    if (out.domain_key === "MULTIPLE_MARRIAGE") {
      if (rel.multiple_marriage === "occurred") {
        out.primary_exact_event = setExecuted(out.primary_exact_event, "multiple relationship / marriage pattern has occurred");
      } else if (rel.multiple_marriage === "ongoing") {
        out.primary_exact_event = setPartial(out.primary_exact_event, "multiple relationship pattern is active but not fully confirmed");
      }
    }
  }

  return out;
}

function correctWorkDomain(item, deliverySafePacket = {}) {
  if (!item || !["JOB", "CAREER", "BUSINESS", "EDUCATION"].includes(item.domain_key)) {
    return item;
  }

  const out = clone(item);
  const work = familyTruthMap(deliverySafePacket)?.work || {};
  const edu = familyTruthMap(deliverySafePacket)?.education || {};

  if (!out.primary_exact_event) return out;

  if (out.domain_key === "JOB") {
    if (work.job === "occurred") out.primary_exact_event = setExecuted(out.primary_exact_event, "job / service line has occurred");
    else if (work.job === "ongoing") out.primary_exact_event = setPartial(out.primary_exact_event, "job / service line is active but not stabilised");
  }

  if (out.domain_key === "CAREER") {
    if (work.career === "occurred") out.primary_exact_event = setExecuted(out.primary_exact_event, "career direction has definitively formed");
    else if (work.career === "ongoing") out.primary_exact_event = setPartial(out.primary_exact_event, "career direction is active but not stabilised");
  }

  if (out.domain_key === "BUSINESS") {
    if (work.business === "occurred") out.primary_exact_event = setExecuted(out.primary_exact_event, "business line has occurred");
    else if (work.business === "ongoing") out.primary_exact_event = setPartial(out.primary_exact_event, "business line is active but not stabilised");
  }

  if (out.domain_key === "EDUCATION") {
    if (edu.education === "occurred") out.primary_exact_event = setExecuted(out.primary_exact_event, "education / study line has occurred");
    else if (edu.education === "ongoing") out.primary_exact_event = setPartial(out.primary_exact_event, "education / study line is active but not fully completed");
  }

  return out;
}

function correctMoneyDomain(item, deliverySafePacket = {}) {
  if (!item || !["MONEY", "DEBT", "PROPERTY", "HOME", "VEHICLE"].includes(item.domain_key)) {
    return item;
  }

  const out = clone(item);
  const money = familyTruthMap(deliverySafePacket)?.money || {};

  if (!out.primary_exact_event) return out;

  if (out.domain_key === "MONEY") {
    if (money.money === "occurred") out.primary_exact_event = setExecuted(out.primary_exact_event, "money flow has occurred");
    else if (money.money === "ongoing") out.primary_exact_event = setPartial(out.primary_exact_event, "money flow is active but not stable");
  }

  if (out.domain_key === "DEBT") {
    if (money.debt === "occurred") out.primary_exact_event = setExecuted(out.primary_exact_event, "debt / liability pressure has occurred");
    else if (money.debt === "ongoing") out.primary_exact_event = setPartial(out.primary_exact_event, "debt / liability pressure is active");
  }

  if (["PROPERTY", "HOME", "VEHICLE"].includes(out.domain_key)) {
    if (money.property === "occurred") out.primary_exact_event = setExecuted(out.primary_exact_event, "property / base / asset line has occurred");
    else if (money.property === "ongoing") out.primary_exact_event = setPartial(out.primary_exact_event, "property / base / asset line is active but not stabilised");
  }

  return out;
}

function correctHealthDomain(item, deliverySafePacket = {}) {
  if (!item || !["HEALTH", "MENTAL"].includes(item.domain_key)) {
    return item;
  }

  const out = clone(item);
  const health = familyTruthMap(deliverySafePacket)?.health || {};

  if (!out.primary_exact_event) return out;

  if (out.domain_key === "HEALTH") {
    if (health.health === "occurred") out.primary_exact_event = setExecuted(out.primary_exact_event, "health pressure has occurred");
    else if (health.health === "ongoing") out.primary_exact_event = setPartial(out.primary_exact_event, "health pressure is active but not fully resolved");
    else if (health.health === "not_occurred") out.primary_exact_event = setNotExecuted(out.primary_exact_event, "major health event is not confirmed");
  }

  if (out.domain_key === "MENTAL") {
    if (health.mental === "occurred") out.primary_exact_event = setExecuted(out.primary_exact_event, "mental pressure / fear phase has occurred");
    else if (health.mental === "ongoing") out.primary_exact_event = setPartial(out.primary_exact_event, "mental pressure remains active");
    else if (health.mental === "not_occurred") out.primary_exact_event = setNotExecuted(out.primary_exact_event, "deep mental collapse is not confirmed");
  }

  return out;
}

function correctConflictDomain(item, deliverySafePacket = {}) {
  if (!item || !["LEGAL", "DOCUMENT", "ENEMY", "BLOCKAGE"].includes(item.domain_key)) {
    return item;
  }

  const out = clone(item);
  const conflict = familyTruthMap(deliverySafePacket)?.conflict || {};

  if (!out.primary_exact_event) return out;

  if (out.domain_key === "LEGAL" || out.domain_key === "DOCUMENT") {
    if (conflict.legal === "occurred") out.primary_exact_event = setExecuted(out.primary_exact_event, "authority / legal / document event has occurred");
    else if (conflict.legal === "ongoing") out.primary_exact_event = setPartial(out.primary_exact_event, "authority / legal / document process is active");
  }

  if (out.domain_key === "BLOCKAGE") {
    if (conflict.blockage === "occurred") out.primary_exact_event = setExecuted(out.primary_exact_event, "blockage pattern has occurred");
    else if (conflict.blockage === "ongoing") out.primary_exact_event = setPartial(out.primary_exact_event, "blockage remains active");
  }

  if (out.domain_key === "ENEMY") {
    if (conflict.enemy === "occurred") out.primary_exact_event = setExecuted(out.primary_exact_event, "opposition / resistance has occurred");
    else if (conflict.enemy === "ongoing") out.primary_exact_event = setPartial(out.primary_exact_event, "opposition / resistance remains active");
  }

  return out;
}

function correctFamilyDomain(item, deliverySafePacket = {}) {
  if (!item || !["FAMILY", "CHILDREN"].includes(item.domain_key)) {
    return item;
  }

  const out = clone(item);
  const family = familyTruthMap(deliverySafePacket)?.family || {};

  if (!out.primary_exact_event) return out;

  if (out.domain_key === "FAMILY") {
    if (family.family === "occurred") out.primary_exact_event = setExecuted(out.primary_exact_event, "family / responsibility pattern has occurred");
    else if (family.family === "ongoing") out.primary_exact_event = setPartial(out.primary_exact_event, "family / responsibility pressure is active");
  }

  if (out.domain_key === "CHILDREN") {
    if (family.children === "occurred") out.primary_exact_event = setExecuted(out.primary_exact_event, "children / continuity pattern has occurred");
    else if (family.children === "ongoing") out.primary_exact_event = setPartial(out.primary_exact_event, "children / continuity process is active");
  }

  return out;
}

function correctSingleDomain(item, facts = {}, deliverySafePacket = {}) {
  let out = clone(item);
  out = correctForeignDomain(out, facts, deliverySafePacket);
  out = correctRelationshipDomain(out, deliverySafePacket);
  out = correctWorkDomain(out, deliverySafePacket);
  out = correctMoneyDomain(out, deliverySafePacket);
  out = correctHealthDomain(out, deliverySafePacket);
  out = correctConflictDomain(out, deliverySafePacket);
  out = correctFamilyDomain(out, deliverySafePacket);
  return out;
}

function applyIdentityPrecisionCorrection(identityPacket = {}, input = {}, subjectContext = {}) {
  const out = clone(identityPacket);

  const hasDob = !!String(input?.dob || "").trim();
  const hasTob = !!String(input?.tob || "").trim();
  const factsText = low(input?.facts || "");
  const hasParents =
    !!String(subjectContext?.father_name || "").trim() ||
    !!String(subjectContext?.mother_name || "").trim() ||
    factsText.includes("father") ||
    factsText.includes("mother") ||
    factsText.includes("parent");

  if (!hasDob) {
    out.identity_mode = "NAME_LOCKED_PATTERN";
    out.exact_traits_allowed = false;
    out.precision_note =
      "Name-only mode gives ultra-elite name-locked zodiac and numerology pattern, but not full astro-exact natal identity.";
  } else if (hasDob && !hasTob) {
    out.identity_mode = "DOB_LOCKED_REDUCED";
    out.exact_traits_allowed = false;
    out.precision_note =
      "DOB mode is stronger than name-only and gives reduced astro identity, but full exactness still needs birth time.";
  } else {
    out.identity_mode = "FULL_ASTRO_IDENTITY";
    out.exact_traits_allowed = true;
    out.precision_note =
      "Full birth data mode allows strongest astro identity lock.";
  }

  if (hasParents) {
    out.parent_overlay_available = true;
    out.parent_overlay_note =
      "Parent-name overlay can be shown as family-pattern support, but exact parental zodiac needs parent birth data.";
  } else {
    out.parent_overlay_available = false;
  }

  return out;
}

export function correctExactDomainSummary(exactDomainSummary = [], facts = {}, deliverySafePacket = {}) {
  return (exactDomainSummary || []).map((item) =>
    correctSingleDomain(item, facts, deliverySafePacket)
  );
}

export function correctIdentityPacket(identityPacket = {}, input = {}, subjectContext = {}) {
  return applyIdentityPrecisionCorrection(identityPacket, input, subjectContext);
}