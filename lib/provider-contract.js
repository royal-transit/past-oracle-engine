// lib/provider-contract.js
// Universal real astrology provider contract for Past Oracle
// No person hardlock. No proxy. Defines required provider capabilities.

export const PROVIDER_CONTRACT = {
  version: "REAL_ASTRO_PROVIDER_CONTRACT_V1",

  required_routes: {
    transit: "/api/transit",
    natal: "/api/natal",
    dasha: "/api/dasha",
    kp: "/api/kp",
    divisional: "/api/divisional"
  },

  past_oracle_required_capabilities: {
    natal_chart: true,
    birth_kp_cusps: true,
    vimshottari_timeline: true,
    divisional_support: true,
    live_transit: true,
    past_year_scan: true
  },

  input_contract: {
    name: "string optional",
    dob: "YYYY-MM-DD required for natal",
    tob: "HH:mm optional but required for full precision",
    pob: "string optional",
    latitude: "number optional",
    longitude: "number optional",
    timezone_offset: "+06:00 style required if dob/tob used",
    question: "string optional",
    facts: "string optional validation only"
  },

  output_contract: {
    natal: ["ascendant", "planets", "houses_by_planet", "houses_whole_sign"],
    kp: ["kp_cusps", "sub_lords", "star_lords"],
    dasha: ["mahadasha", "antardasha", "pratyantar", "timeline"],
    divisional: ["D9", "D10", "D12", "support_grade"],
    transit: ["current_planets", "micro_triggers", "panchanga"]
  },

  no_hardlock_policy: {
    person_specific_data_allowed: false,
    client_dynamic_input_required: true,
    facts_are_validation_not_source_of_truth: true
  }
};

export function assertProviderContract(packet = {}) {
  return {
    contract_version: PROVIDER_CONTRACT.version,
    provider_ready: Boolean(packet),
    missing_capabilities: [],
    policy: PROVIDER_CONTRACT.no_hardlock_policy
  };
}