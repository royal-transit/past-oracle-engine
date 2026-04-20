export function buildTruthLines(domainMap = {}) {
  const lines = [];

  // FOREIGN
  if (domainMap.foreign) {
    const f = domainMap.foreign;

    if (f.movement === "occurred") {
      lines.push("বিদেশে যাওয়ার ঘটনা ঘটেছে");
    }

    if (f.settlement === "not_occurred") {
      lines.push("কিন্তু এখনো স্থায়ীভাবে বসোনি");
    }

    if (f.movement === "ongoing") {
      lines.push("বিদেশ সংক্রান্ত প্রক্রিয়া এখনো চলছে");
    }
  }

  // RELATIONSHIP
  if (domainMap.relationship) {
    const r = domainMap.relationship;

    if (r.marriage === "occurred") {
      lines.push("সম্পর্ক বা বিয়ে জীবনে ঘটেছে");
    }

    if (r.marriage === "ongoing") {
      lines.push("সম্পর্কের বিষয় এখনো স্থির হয়নি, চলছে");
    }
  }

  // WORK
  if (domainMap.work) {
    const w = domainMap.work;

    if (w.job === "ongoing") {
      lines.push("কাজের লাইন চলছে, কিন্তু পুরো স্থির হয়নি");
    }

    if (w.job === "occurred") {
      lines.push("কাজের সুযোগ এসেছে");
    }
  }

  // MONEY
  if (domainMap.money) {
    const m = domainMap.money;

    if (m.money === "occurred") {
      lines.push("টাকা জীবনে এসেছে");
    }

    if (m.debt === "occurred") {
      lines.push("কিন্তু চাপ বা দায়ও সাথে এসেছে");
    }
  }

  // HEALTH
  if (domainMap.health) {
    const h = domainMap.health;

    if (h.health === "occurred") {
      lines.push("শরীর বা স্বাস্থ্য নিয়ে চাপ এসেছে");
    }

    if (h.mental === "ongoing") {
      lines.push("মনের চাপ এখনো পুরো কাটেনি");
    }
  }

  return lines;
}

export function buildFinalTruthSummary(domainMap = {}) {
  const lines = buildTruthLines(domainMap);

  return lines.join("। ") + "।";
}