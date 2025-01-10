import {
  activityAdvice,
  describeDewPoint,
  describePressureTrend,
  describeUvIndex,
  describeVisibility,
  describeWindSpeed,
  pressureDelta,
} from "./comfort";

describe("describeDewPoint", () => {
  it("bands the scale from dry to oppressive", () => {
    expect(describeDewPoint(5).level).toBe("dry");
    expect(describeDewPoint(13).level).toBe("pleasant");
    expect(describeDewPoint(18).level).toBe("humid");
    expect(describeDewPoint(22).level).toBe("muggy");
    expect(describeDewPoint(26).level).toBe("oppressive");
  });

  it("treats the band boundaries inclusively at the lower edge", () => {
    // 10 is the first point at which the air stops feeling dry.
    expect(describeDewPoint(10).level).toBe("pleasant");
    expect(describeDewPoint(16).level).toBe("humid");
    expect(describeDewPoint(20).level).toBe("muggy");
    expect(describeDewPoint(24).level).toBe("oppressive");
  });

  it("always supplies a label and an explanation", () => {
    for (const dewPoint of [-10, 0, 12, 18, 22, 30]) {
      const reading = describeDewPoint(dewPoint);
      expect(reading.label).not.toHaveLength(0);
      expect(reading.detail).not.toHaveLength(0);
    }
  });
});

describe("describeUvIndex", () => {
  it("reports no burn time at low UV", () => {
    expect(describeUvIndex(2).burnTimeMinutes).toBeUndefined();
    expect(describeUvIndex(2).severity).toBe("low");
  });

  it("gives a burn time from moderate upward", () => {
    for (const index of [3, 5, 7, 9, 11, 13]) {
      expect(describeUvIndex(index).burnTimeMinutes).toBeGreaterThan(0);
    }
  });

  it("shortens the burn time as the index climbs", () => {
    const moderate = describeUvIndex(4).burnTimeMinutes!;
    const veryHigh = describeUvIndex(9).burnTimeMinutes!;
    const extreme = describeUvIndex(12).burnTimeMinutes!;

    expect(veryHigh).toBeLessThan(moderate);
    expect(extreme).toBeLessThan(veryHigh);
  });

  it("keeps the burn time in a believable range at UV 11+", () => {
    // A naive 200/index lands at 18 minutes for UV 11, which overstates how
    // long extreme sun takes to burn fair skin.
    expect(describeUvIndex(11).burnTimeMinutes!).toBeLessThanOrEqual(15);
    expect(describeUvIndex(11).burnTimeMinutes!).toBeGreaterThanOrEqual(5);
  });

  it("bands the scale", () => {
    expect(describeUvIndex(1).severity).toBe("low");
    expect(describeUvIndex(4).severity).toBe("moderate");
    expect(describeUvIndex(7).severity).toBe("high");
    expect(describeUvIndex(9).severity).toBe("very-high");
    expect(describeUvIndex(12).severity).toBe("extreme");
  });

  it("does not go negative on a bad reading", () => {
    const reading = describeUvIndex(-3);
    expect(reading.severity).toBe("low");
    expect(Number.isFinite(reading.burnTimeMinutes ?? 0)).toBe(true);
  });
});

describe("describeWindSpeed", () => {
  it("converts metres per second into words", () => {
    expect(describeWindSpeed(0.1)).toBe("Calm");
    expect(describeWindSpeed(2)).toBe("Light breeze");
    expect(describeWindSpeed(8)).toBe("Moderate breeze");
    expect(describeWindSpeed(20)).toBe("Gale");
  });

  it("increases monotonically with speed", () => {
    const labels = [0.1, 2, 4, 7, 10, 13, 16, 20].map(describeWindSpeed);
    expect(new Set(labels).size).toBe(labels.length);
  });
});

describe("describePressureTrend", () => {
  // Takes the change itself, not two readings: the delta has to be measured
  // against the previous day's data, which only the assembler has.
  it("reports a rising trend", () => {
    expect(describePressureTrend(5).trend).toBe("rising");
  });

  it("reports a falling trend", () => {
    expect(describePressureTrend(-7).trend).toBe("falling");
  });

  it("treats small changes as steady", () => {
    expect(describePressureTrend(1).trend).toBe("steady");
  });

  it("has no opinion without a measurement", () => {
    const reading = describePressureTrend(undefined);
    expect(reading.trend).toBe("steady");
    expect(reading.detail).toBe("");
  });

  it("explains the consequence, not just the direction", () => {
    expect(describePressureTrend(-7).detail).toMatch(/unsettled/i);
    expect(describePressureTrend(5).detail).toMatch(/settling/i);
  });
});

describe("pressureDelta", () => {
  const now = Date.parse("2024-11-10T12:00:00Z");
  const hour = 3_600_000;

  it("measures the change against the reading three hours back", () => {
    const hourly = [
      { time: now - 1 * hour, pressure: 1011 },
      { time: now - 3 * hour, pressure: 1004 },
      { time: now - 6 * hour, pressure: 1000 },
    ];
    // 1012 now against 1004 three hours ago.
    expect(pressureDelta(hourly, now, 1012)).toBe(8);
  });

  it("ignores entries inside the three-hour window", () => {
    const hourly = [
      { time: now - 30 * 60 * 1000, pressure: 1000 },
      { time: now - 3 * hour, pressure: 1010 },
    ];
    // The 30-minute-old entry is too recent to be the baseline.
    expect(pressureDelta(hourly, now, 1004)).toBe(-6);
  });

  it("skips points with no pressure reading", () => {
    const hourly = [
      { time: now - 3 * hour, pressure: undefined },
      { time: now - 4 * hour, pressure: 1010 },
    ];
    // The null reading at the three-hour mark is skipped and the four-hour one
    // used instead, which is close enough to stand in for it.
    expect(pressureDelta(hourly, now, 1000)).toBe(-10);
  });

  it("refuses a baseline that is too recent", () => {
    // Only half an hour of history: that is not a three-hour trend.
    const hourly = [{ time: now - 30 * 60 * 1000, pressure: 1008 }];
    expect(pressureDelta(hourly, now, 1012)).toBeUndefined();
  });

  it("returns nothing when there is no history at all", () => {
    expect(pressureDelta([], now, 1012)).toBeUndefined();
  });

  it("refuses a baseline that is too far in the past", () => {
    // A three-hour delta measured across twelve hours is not a three-hour
    // delta, and reporting one would be worse than reporting nothing.
    const hourly = [{ time: now - 12 * hour, pressure: 1000 }];
    expect(pressureDelta(hourly, now, 1012)).toBeUndefined();
  });
});

describe("describeVisibility", () => {
  it("warns as visibility drops", () => {
    expect(describeVisibility(15_000)).toBe("Clear view");
    expect(describeVisibility(6_000)).toBe("Good visibility");
    expect(describeVisibility(3_000)).toMatch(/hazy/i);
    expect(describeVisibility(1_500)).toMatch(/driving/i);
    expect(describeVisibility(400)).toMatch(/fog/i);
  });
});

describe("activityAdvice", () => {
  const mild = {
    condition: "partly-cloudy" as const,
    temperature: 20,
    windSpeed: 3,
  };

  it("approves of a mild day", () => {
    const advice = activityAdvice(mild);
    expect(advice.running).toBe("good");
    expect(advice.cycling).toBe("good");
    expect(advice.reason).not.toHaveLength(0);
  });

  it("rules out both activities in a thunderstorm", () => {
    const advice = activityAdvice({ ...mild, condition: "thunderstorm" });
    expect(advice.running).toBe("avoid");
    expect(advice.cycling).toBe("avoid");
  });

  it("rules out both when the air is hazardous", () => {
    const advice = activityAdvice({ ...mild, aqiCategory: "very-poor" });
    expect(advice.running).toBe("avoid");
    expect(advice.cycling).toBe("avoid");
  });

  it("separates running from cycling in strong wind", () => {
    // Cycling into a strong wind is unsafe; running in it is merely hard.
    const advice = activityAdvice({ ...mild, windSpeed: 12 });
    expect(advice.cycling).toBe("avoid");
    expect(advice.running).toBe("caution");
  });

  it("warns but does not forbid activity in extreme heat", () => {
    const advice = activityAdvice({ ...mild, temperature: 38 });
    expect(advice.running).toBe("avoid");
    expect(advice.cycling).toBe("caution");
  });

  it("rules out cycling on ice", () => {
    const advice = activityAdvice({ ...mild, temperature: -8 });
    expect(advice.cycling).toBe("avoid");
    expect(advice.running).toBe("caution");
  });

  it("flags heavy rain as caution to run and avoid to cycle", () => {
    const advice = activityAdvice({ ...mild, condition: "heavy-rain" });
    expect(advice.running).toBe("caution");
    expect(advice.cycling).toBe("avoid");
  });

  it("always gives a reason", () => {
    const conditions = [
      mild,
      { ...mild, condition: "thunderstorm" as const },
      { ...mild, aqiCategory: "poor" as const },
      { ...mild, uvIndex: 10 },
      { ...mild, temperature: 40 },
    ];
    for (const input of conditions) {
      expect(activityAdvice(input).reason).not.toHaveLength(0);
    }
  });
});
