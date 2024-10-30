import {
  aqiCategoryLabel,
  conditionLabel,
  dewPointFromHumidity,
  europeanAqiToCategory,
  isNightAt,
  normalizeNwsAlert,
  owmAqiToCategory,
  pickPollutants,
  usAqiToCategory,
  wmoToCondition,
} from "./normalize";

describe("wmoToCondition", () => {
  it("maps the clear and cloud codes", () => {
    expect(wmoToCondition(0)).toBe("clear");
    expect(wmoToCondition(1)).toBe("mostly-clear");
    expect(wmoToCondition(2)).toBe("partly-cloudy");
    expect(wmoToCondition(3)).toBe("overcast");
  });

  it("treats freezing precipitation as sleet regardless of phase", () => {
    expect(wmoToCondition(56)).toBe("sleet");
    expect(wmoToCondition(57)).toBe("sleet");
    expect(wmoToCondition(66)).toBe("sleet");
    expect(wmoToCondition(67)).toBe("sleet");
  });

  it("separates ordinary rain from heavy rain", () => {
    expect(wmoToCondition(61)).toBe("rain");
    expect(wmoToCondition(63)).toBe("rain");
    expect(wmoToCondition(65)).toBe("heavy-rain");
    expect(wmoToCondition(82)).toBe("heavy-rain");
  });

  it("maps every thunderstorm code", () => {
    expect(wmoToCondition(95)).toBe("thunderstorm");
    expect(wmoToCondition(96)).toBe("thunderstorm");
    expect(wmoToCondition(99)).toBe("thunderstorm");
  });

  it("falls back to unknown for null and out-of-range codes", () => {
    expect(wmoToCondition(null)).toBe("unknown");
    expect(wmoToCondition(undefined)).toBe("unknown");
    expect(wmoToCondition(1234)).toBe("unknown");
  });
});

describe("aqi category mapping", () => {
  /*
   * Regression guard. The pre-revamp `Weather.js` compared OpenWeather's 1–5
   * index against 0–500 US EPA thresholds, so every reading below 300 rendered
   * as "Good" — including genuinely hazardous air.
   */
  it("maps the OpenWeather 1-5 index on its own scale", () => {
    expect(owmAqiToCategory(1)).toBe("good");
    expect(owmAqiToCategory(2)).toBe("fair");
    expect(owmAqiToCategory(3)).toBe("moderate");
    expect(owmAqiToCategory(4)).toBe("poor");
    expect(owmAqiToCategory(5)).toBe("very-poor");
  });

  /*
   * The EPA defines six bands (Good, Moderate, USG, Unhealthy, Very Unhealthy,
   * Hazardous) which collapse onto these five categories, so "very-poor" covers
   * both of the top two. The boundaries below are the EPA's own.
   */
  it("maps the US EPA scale", () => {
    expect(usAqiToCategory(0)).toBe("good");
    expect(usAqiToCategory(50)).toBe("good");
    expect(usAqiToCategory(51)).toBe("fair");
    expect(usAqiToCategory(100)).toBe("fair");
    expect(usAqiToCategory(101)).toBe("moderate");
    expect(usAqiToCategory(150)).toBe("moderate");
    expect(usAqiToCategory(151)).toBe("poor");
    expect(usAqiToCategory(200)).toBe("poor");
    expect(usAqiToCategory(201)).toBe("very-poor");
    expect(usAqiToCategory(400)).toBe("very-poor");
  });

  it("maps the European scale", () => {
    expect(europeanAqiToCategory(10)).toBe("good");
    expect(europeanAqiToCategory(30)).toBe("fair");
    expect(europeanAqiToCategory(50)).toBe("moderate");
    expect(europeanAqiToCategory(70)).toBe("poor");
    expect(europeanAqiToCategory(95)).toBe("very-poor");
  });

  it("agrees with itself at the boundary between the two scales", () => {
    // A US reading of 200 is "poor"; the OpenWeather equivalent is 4.
    expect(usAqiToCategory(200)).toBe(owmAqiToCategory(4));
  });

  it("has a label for every category", () => {
    for (const category of [
      "good",
      "fair",
      "moderate",
      "poor",
      "very-poor",
    ] as const) {
      expect(aqiCategoryLabel(category)).not.toHaveLength(0);
    }
  });
});

describe("dewPointFromHumidity", () => {
  it("equals the air temperature at 100% humidity", () => {
    expect(dewPointFromHumidity(20, 100)).toBeCloseTo(20, 1);
  });

  it("falls well below the air temperature in dry air", () => {
    // 30°C at 20% RH gives a dew point of about 4.6°C.
    expect(dewPointFromHumidity(30, 20)).toBeCloseTo(4.57, 1);
  });

  it("stays below the dry-bulb temperature across the range", () => {
    for (const humidity of [10, 40, 70, 99]) {
      expect(dewPointFromHumidity(25, humidity)).toBeLessThan(25);
    }
  });

  it("clamps humidity instead of returning NaN at zero", () => {
    expect(Number.isFinite(dewPointFromHumidity(20, 0))).toBe(true);
  });
});

describe("pickPollutants", () => {
  it("keeps finite numbers and drops everything else", () => {
    const result = pickPollutants({
      pm2_5: 12.4,
      pm10: null,
      no2: undefined,
      o3: Number.NaN,
      so2: 3,
    });
    expect(result).toEqual({ pm2_5: 12.4, so2: 3 });
  });
});

describe("isNightAt", () => {
  const sunrise = Date.parse("2024-10-25T06:00:00Z");
  const sunset = Date.parse("2024-10-25T18:00:00Z");

  it("is night before sunrise and after sunset", () => {
    expect(isNightAt(Date.parse("2024-10-25T05:00:00Z"), sunrise, sunset)).toBe(
      true
    );
    expect(isNightAt(Date.parse("2024-10-25T19:00:00Z"), sunrise, sunset)).toBe(
      true
    );
  });

  it("is day between them", () => {
    expect(isNightAt(Date.parse("2024-10-25T12:00:00Z"), sunrise, sunset)).toBe(
      false
    );
  });
});

describe("normalizeNwsAlert", () => {
  const base = {
    id: "urn:oid:2.49.0.1.840.0.abc",
    event: "Heat Advisory",
    senderName: "NWS Phoenix AZ",
    description: "  Excessive heat expected.  ",
    onset: "2024-10-25T10:00:00-07:00",
    expires: "2099-10-26T20:00:00-07:00",
    severity: "Moderate",
  };

  it("normalises a live alert", () => {
    const alert = normalizeNwsAlert(base);
    expect(alert).not.toBeNull();
    expect(alert!.event).toBe("Heat Advisory");
    expect(alert!.severity).toBe("moderate");
    expect(alert!.description).toBe("Excessive heat expected.");
  });

  it("drops alerts that have already expired", () => {
    expect(
      normalizeNwsAlert({ ...base, expires: "2020-01-01T00:00:00-07:00" })
    ).toBeNull();
  });

  it("drops entries with unparseable timestamps rather than showing NaN", () => {
    expect(normalizeNwsAlert({ ...base, onset: "not-a-date" })).toBeNull();
    expect(normalizeNwsAlert({ ...base, expires: undefined })).toBeNull();
  });

  it("defaults unknown severities to minor", () => {
    const alert = normalizeNwsAlert({ ...base, severity: "Unknown" });
    expect(alert!.severity).toBe("minor");
  });

  it("requires an event name", () => {
    expect(normalizeNwsAlert({ ...base, event: undefined })).toBeNull();
  });
});

describe("conditionLabel", () => {
  it("has a human label for every condition", () => {
    for (const condition of [
      "clear",
      "mostly-clear",
      "partly-cloudy",
      "cloudy",
      "overcast",
      "fog",
      "haze",
      "drizzle",
      "rain",
      "heavy-rain",
      "showers",
      "thunderstorm",
      "snow",
      "sleet",
      "unknown",
    ] as const) {
      expect(conditionLabel(condition)).not.toHaveLength(0);
    }
  });
});
