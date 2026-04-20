// lib/delivery-mapper.js
// FULL REPLACEMENT — DELIVERY MAPPER V2

function pushIf(lines, condition, text) {
  if (condition) lines.push(text);
}

export function buildTruthLines(domainMap = {}) {
  const lines = [];

  const foreign = domainMap.foreign || {};
  pushIf(lines, foreign.movement === "occurred", "বিদেশে যাওয়ার ঘটনা ঘটেছে");
  pushIf(lines, foreign.movement === "ongoing", "বিদেশ সংক্রান্ত প্রক্রিয়া এখনো চলছে");
  pushIf(lines, foreign.settlement === "occurred", "স্থায়ীভাবে বসার বিষয়ও বাস্তবে ঘটেছে");
  pushIf(lines, foreign.settlement === "ongoing", "কিন্তু স্থায়ীভাবে বসার বিষয় এখনো প্রক্রিয়ায় আছে");
  pushIf(lines, foreign.settlement === "not_occurred", "কিন্তু এখনো স্থায়ীভাবে বসোনি");
  pushIf(lines, foreign.visa === "occurred", "ভিসা বা অনুমতির লাইন বাস্তবে খুলেছে");
  pushIf(lines, foreign.visa === "ongoing", "ভিসা বা অনুমতির বিষয় এখনো চলমান");

  const rel = domainMap.relationship || {};
  pushIf(lines, rel.marriage === "occurred", "সম্পর্ক বা বিয়ে জীবনে বাস্তবেই ঘটেছে");
  pushIf(lines, rel.marriage === "ongoing", "সম্পর্কের বিষয় এখনো পুরো স্থির হয়নি, চলছে");
  pushIf(lines, rel.divorce === "occurred", "ভাঙন বা বিচ্ছেদের ছাপও বাস্তবে ঘটেছে");
  pushIf(lines, rel.love === "occurred", "ভালবাসা বা emotional attachment line জীবনে উঠেছে");
  pushIf(lines, rel.love === "ongoing", "ভালবাসা বা attachment line এখনো active");

  const work = domainMap.work || {};
  pushIf(lines, work.job === "occurred", "কাজ বা চাকরির line বাস্তবে খুলেছে");
  pushIf(lines, work.job === "ongoing", "কাজের line চলছে, কিন্তু পুরো settle হয়নি");
  pushIf(lines, work.career === "occurred", "career direction বাস্তবে গড়েছে");
  pushIf(lines, work.career === "ongoing", "career line এগোচ্ছে, কিন্তু এখনো স্থির না");
  pushIf(lines, work.business === "occurred", "business line জীবনে উঠেছে");
  pushIf(lines, work.business === "ongoing", "business line আছে, কিন্তু ধরে বসেনি");

  const money = domainMap.money || {};
  pushIf(lines, money.money === "occurred", "টাকা জীবনে এসেছে");
  pushIf(lines, money.money === "ongoing", "টাকার line চলছে, কিন্তু steady না");
  pushIf(lines, money.debt === "occurred", "দায় বা financial চাপও সাথে এসেছে");
  pushIf(lines, money.property === "occurred", "property / base line বাস্তবে উঠেছে");
  pushIf(lines, money.property === "ongoing", "property / base line চলছে, কিন্তু এখনো পুরো বসেনি");
  pushIf(lines, money.vehicle === "occurred", "গাড়ি বা movement asset line জীবনে উঠেছে");

  const health = domainMap.health || {};
  pushIf(lines, health.health === "occurred", "শরীর বা স্বাস্থ্য নিয়ে চাপ বাস্তবে এসেছে");
  pushIf(lines, health.health === "ongoing", "শরীরের চাপ এখনো পুরো কাটেনি");
  pushIf(lines, health.mental === "occurred", "মনের উপর চাপ বা fear phase বাস্তবে কাজ করেছে");
  pushIf(lines, health.mental === "ongoing", "মনের চাপ এখনো পুরো কাটেনি");
  pushIf(lines, health.mental === "not_occurred", "গভীর মানসিক ভাঙন নিশ্চিত নয়");

  const conflict = domainMap.conflict || {};
  pushIf(lines, conflict.legal === "occurred", "authority / legal pressure বাস্তবে এসেছে");
  pushIf(lines, conflict.legal === "ongoing", "authority / legal line এখনো process-এ আছে");
  pushIf(lines, conflict.document === "occurred", "document / paperwork line বাস্তবে ঘটেছে");
  pushIf(lines, conflict.document === "ongoing", "document / paperwork line এখনো চলছে");
  pushIf(lines, conflict.blockage === "occurred", "আটকে যাওয়ার pattern বাস্তবে কাজ করেছে");
  pushIf(lines, conflict.blockage === "ongoing", "blockage এখনো খোলেনি পুরো");
  pushIf(lines, conflict.enemy === "occurred", "বিরোধ বা hidden resistance বাস্তবে উঠেছে");
  pushIf(lines, conflict.enemy === "ongoing", "বিরোধের চাপ এখনো চলছে");

  const family = domainMap.family || {};
  pushIf(lines, family.family === "occurred", "পরিবার বা দায়িত্বের line বাস্তবে এসেছে");
  pushIf(lines, family.family === "ongoing", "পরিবারের দায় এখনো কাঁধে আছে");
  pushIf(lines, family.parents === "occurred", "পিতা-মাতা বা family-root pressure বাস্তবে কাজ করেছে");
  pushIf(lines, family.children === "occurred", "সন্তান বা continuity line বাস্তবে ঘটেছে");
  pushIf(lines, family.children === "ongoing", "সন্তান বা continuity line প্রক্রিয়ায় আছে");

  const education = domainMap.education || {};
  pushIf(lines, education.education === "occurred", "লেখাপড়া বা study line বাস্তবে হয়েছে");
  pushIf(lines, education.education === "ongoing", "লেখাপড়ার line পুরো বন্ধ না, চলমান ছিল");

  return [...new Set(lines)];
}

export function buildFinalTruthSummary(domainMap = {}) {
  const lines = buildTruthLines(domainMap);
  return lines.length ? lines.join("। ") + "।" : "";
}