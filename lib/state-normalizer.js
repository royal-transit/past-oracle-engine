// lib/state-normalizer.js
// STATE NORMALIZER

export function normalizeState(rawState) {
  const value = String(rawState || "").trim().toUpperCase();

  switch (value) {
    case "EXECUTED":
      return "occurred";
    case "PARTIAL":
      return "ongoing";
    case "NOT_EXECUTED":
      return "not_occurred";
    case "BUILDING":
    case "OPENING":
      return "forming";
    case "STABILISING":
      return "stabilized";
    case "BLOCKED":
      return "blocked";
    case "BROKEN":
      return "broken";
    default:
      return "unknown";
  }
}

export function normalizeSectorStates(sectorState = {}) {
  const out = {};
  for (const [key, value] of Object.entries(sectorState || {})) {
    out[key] = normalizeState(value);
  }
  return out;
}

export function buildDomainTruthMap(sectorState = {}) {
  const normalized = normalizeSectorStates(sectorState);

  return {
    foreign: {
      movement: normalized.foreign || "unknown",
      settlement: normalized.settlement || "unknown",
      immigration: normalized.immigration || "unknown",
      visa: normalized.visa || "unknown"
    },
    relationship: {
      marriage: normalized.marriage || "unknown",
      divorce: normalized.divorce || "unknown",
      multiple_marriage: normalized.multiple_marriage || "unknown"
    },
    work: {
      job: normalized.job || "unknown",
      career: normalized.career || "unknown",
      business: normalized.business || "unknown"
    },
    money: {
      money: normalized.money || "unknown",
      debt: normalized.debt || "unknown",
      property: normalized.property || "unknown"
    },
    health: {
      health: normalized.health || "unknown",
      mental: normalized.mental || "unknown"
    },
    conflict: {
      legal: normalized.legal || "unknown",
      blockage: normalized.blockage || "unknown",
      enemy: normalized.enemy || "unknown"
    },
    family: {
      family: normalized.family || "unknown",
      children: normalized.children || "unknown"
    },
    education: {
      education: normalized.education || "unknown"
    }
  };
}