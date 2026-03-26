// lib/provider-adapter.js

function normalizeLng(x) {
  let v = x % 360;
  if (v < 0) v += 360;
  return v;
}

function signFromLongitude(lon) {
  const signs = [
    "Aries","Taurus","Gemini","Cancer","Leo","Virgo",
    "Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"
  ];
  return signs[Math.floor(normalizeLng(lon)/30)];
}

function degreeInSign(lon){
  return normalizeLng(lon)%30;
}

function fakePlanet(seed, offset){
  const lon = normalizeLng((seed*37 + offset*53) % 360);
  return {
    longitude: lon,
    sign: signFromLongitude(lon),
    degree_in_sign: degreeInSign(lon)
  };
}

export const astroProvider = {

  async getNatalChart(args){
    const seed = new Date(args.birth_datetime_iso).getTime()/10000000;

    const planets = [
      "Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn","Rahu","Ketu"
    ].map((p,i)=>({
      planet:p,
      ...fakePlanet(seed,i)
    }));

    return {
      source:"fallback_engine",
      zodiac:"sidereal",
      planets
    };
  },

  async getTransitChart(args){
    const seed = new Date(args.event_datetime_iso).getTime()/10000000;

    const planets = [
      "Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn","Rahu","Ketu"
    ].map((p,i)=>({
      planet:p,
      ...fakePlanet(seed,i+5)
    }));

    return {
      source:"fallback_engine",
      planets
    };
  },

  async getVimshottariDasha(){
    return {status:"SKIPPED"};
  },

  async getKPCusps(){
    return {status:"SKIPPED"};
  },

  async getDivisionalCharts(){
    return {status:"SKIPPED"};
  }
};