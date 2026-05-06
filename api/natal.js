// api/natal.js
// Universal Natal Route
// No personal hardlock

export default async function handler(req, res) {
  try {
    const {
      name,
      dob,
      tob,
      pob,
      latitude,
      longitude,
      timezone_offset
    } = req.body || {};

    // minimal validation
    if (!dob) {
      return res.status(400).json({
        error: "DOB_REQUIRED"
      });
    }

    // temporary mock response
    // later real Swiss Ephemeris engine will replace this

    return res.status(200).json({
      engine: "UNIVERSAL_NATAL_ENGINE_V1",
      status: "OK",

      input_received: {
        name: name || null,
        dob,
        tob: tob || null,
        pob: pob || null,
        latitude: latitude || null,
        longitude: longitude || null,
        timezone_offset: timezone_offset || null
      },

      natal_chart: {
        ascendant: null,
        planets: [],
        houses_whole_sign: {},
        houses_by_planet: {}
      },

      kp_data: {
        kp_cusps: [],
        sub_lords: {},
        star_lords: {}
      },

      divisional_support: {
        D9: {},
        D10: {},
        D12: {}
      },

      engine_note:
        "Temporary natal scaffold active. Real astro calculation pending."
    });

  } catch (err) {
    return res.status(500).json({
      error: "NATAL_ENGINE_FAILURE",
      details: err.message
    });
  }
}