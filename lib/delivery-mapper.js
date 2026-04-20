// lib/delivery-mapper.js
// DELIVERY SAFE MAPPER

export function buildTruthLines(domainMap = {}) {
  const lines = [];

  const f = domainMap.foreign || {};
  if (f.movement === "occurred") lines.push("বিদেশে যাওয়ার ঘটনা ঘটেছে");
  if (f.movement === "ongoing") lines.push("বিদেশ সংক্রান্ত প্রক্রিয়া এখনো চলছে");
  if (f.settlement === "occurred") lines.push("স্থায়ীভাবে বসার লাইনও বাস্তবে ঘটেছে");
  if (f.settlement === "ongoing") lines.push("কিন্তু স্থায়ীভাবে বসার বিষয় এখনো প্রক্রিয়ায় আছে");
  if (f.settlement === "not_occurred") lines.push("কিন্তু এখনো স্থায়ীভাবে বসোনি");

  const r = domainMap.relationship || {};
  if (r.marriage === "occurred") lines.push("সম্পর্ক বা বিয়ে জীবনে বাস্তবেই ঘটেছে");
  if (r.marriage === "ongoing") lines.push("সম্পর্কের বিষয় এখনো পুরো স্থির হয়নি, চলছে");
  if (r.divorce === "occurred") lines.push("ভাঙন বা বিচ্ছেদের ছাপও বাস্তবে ঘটেছে");

  const w = domainMap.work || {};
  if (w.job === "occurred") lines.push("কাজ বা চাকরির লাইন বাস্তবে খুলেছে");
  if (w.job === "ongoing") lines.push("কাজের লাইন চলছে, কিন্তু পুরো settle হয়নি");
  if (w.career === "occurred") lines.push("career direction বাস্তবে গড়েছে");
  if (w.career === "ongoing") lines.push("career line এগোচ্ছে, কিন্তু এখনো স্থির না");
  if (w.business === "occurred") lines.push("business / self-work line জীবনে উঠেছে");
  if (w.business === "ongoing") lines.push("business line আছে, কিন্তু ধরে বসেনি");

  const m = domainMap.money || {};
  if (m.money === "occurred") lines.push("টাকা জীবনে এসেছে");
  if (m.money === "ongoing") lines.push("টাকার line চলছে, কিন্তু steady না");
  if (m.debt === "occurred") lines.push("দায় বা financial চাপও সাথে এসেছে");
  if (m.property === "occurred") lines.push("property / asset line বাস্তবে উঠেছে");
  if (m.property === "ongoing") lines.push("property / base line চলছে, কিন্তু এখনো পুরো বসেনি");

  const h = domainMap.health || {};
  if (h.health === "occurred") lines.push("শরীর বা স্বাস্থ্য নিয়ে চাপ বাস্তবে এসেছে");
  if (h.health === "ongoing") lines.push("শরীরের চাপ এখনো পুরো কাটেনি");
  if (h.mental === "occurred") lines.push("মনের উপর চাপ বা fear phase বাস্তবে কাজ করেছে");
  if (h.mental === "ongoing") lines.push("মনের চাপ এখনো পুরো কাটেনি");
  if (h.mental === "not_occurred") lines.push("গভীর mental collapse নিশ্চিত নয়");

  const c = domainMap.conflict || {};
  if (c.legal === "occurred") lines.push("authority / legal চাপ বাস্তবে এসেছে");
  if (c.legal === "ongoing") lines.push("authority / legal line এখনো process-এ আছে");
  if (c.blockage === "occurred") lines.push("আটকে যাওয়ার pattern বাস্তবে কাজ করেছে");
  if (c.blockage === "ongoing") lines.push("blockage এখনো খোলেনি পুরো");
  if (c.enemy === "occurred") lines.push("বিরোধ বা hidden resistance বাস্তবে উঠেছে");
  if (c.enemy === "ongoing") lines.push("বিরোধের চাপ এখনো চলছে");

  const fam = domainMap.family || {};
  if (fam.family === "occurred") lines.push("পরিবার বা দায়িত্বের line বাস্তবে এসেছে");
  if (fam.family === "ongoing") lines.push("পরিবারের দায় এখনো কাঁধে আছে");
  if (fam.children === "occurred") lines.push("সন্তান / continuity line বাস্তবে ঘটেছে");
  if (fam.children === "ongoing") lines.push("সন্তান / continuity line প্রক্রিয়ায় আছে");

  const e = domainMap.education || {};
  if (e.education === "occurred") lines.push("লেখাপড়া বা study line বাস্তবে হয়েছে");
  if (e.education === "ongoing") lines.push("লেখাপড়ার line পুরো বন্ধ না, চলমান ছিল");

  return [...new Set(lines)];
}

export function buildFinalTruthSummary(domainMap = {}) {
  const lines = buildTruthLines(domainMap);
  return lines.length ? `${lines.join("। ")}।` : "";
}