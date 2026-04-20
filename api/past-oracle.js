function parseFactAnchors(facts, question) {
  const rawText = `${facts || ""} ${question || ""}`.trim();
  const text = rawText.toLowerCase();

  // SAFE DECLARE
  let allYears = [];
  try {
    allYears = extractAllYears(text) || [];
  } catch (e) {
    allYears = [];
  }

  const marriage_count_claim = extractMarriageCount(text);
  const broken_marriage_claim = extractBrokenMarriageCount(text);

  let foreign_entry_year_claim = yearNear(text, [
    "uk", "foreign", "abroad", "came", "arrived", "entry", "moved",
    "visa", "immigration", "bidesh"
  ]);

  const settlement_year_claim = yearNear(text, [
    "ilr granted", "settlement granted", "settled", "permanent approved"
  ]);

  const settlement_applied_year_claim = yearNear(text, [
    "ilr apply", "ilr applied", "settlement apply", "settlement applied",
    "applied ilr", "applied settlement"
  ]);

  const settlement_refusal_year_claim = yearNear(text, [
    "refusal", "refused", "rejected"
  ]);

  const appeal_year_claim = yearNear(text, [
    "appeal", "appealed", "appeal ongoing", "appeal filed"
  ]);

  // fallback fix (no crash guarantee)
  if (
    foreign_entry_year_claim == null &&
    Array.isArray(allYears) &&
    allYears.length > 0 &&
    hasAny(text, ["uk", "foreign", "abroad", "came", "arrived", "entry", "moved", "visa", "immigration", "bidesh"])
  ) {
    foreign_entry_year_claim = allYears[0];
  }

  return {
    provided: !!rawText,
    raw_text: text,
    marriage_count_claim,
    broken_marriage_claim,
    foreign_entry_year_claim,
    settlement_year_claim,
    settlement_applied_year_claim,
    settlement_refusal_year_claim,
    appeal_year_claim,

    // 🔒 CRASH-PROOF RETURN
    all_years: Array.isArray(allYears) ? allYears : []
  };
}