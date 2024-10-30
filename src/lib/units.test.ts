import {
  celsiusToFahrenheit,
  formatPrecipitation,
  formatPressure,
  formatTemperature,
  formatTemperatureFull,
  formatVisibility,
  formatWindSpeed,
  windDirectionLabel,
} from "./units";

describe("celsiusToFahrenheit", () => {
  it("converts the fixed points", () => {
    expect(celsiusToFahrenheit(0)).toBe(32);
    expect(celsiusToFahrenheit(100)).toBe(212);
    expect(celsiusToFahrenheit(-40)).toBe(-40);
  });
});

describe("formatTemperature", () => {
  it("rounds to a whole number in metric", () => {
    expect(formatTemperature(24.4, "metric")).toBe("24");
    expect(formatTemperature(24.6, "metric")).toBe("25");
  });

  it("converts before rounding in imperial", () => {
    // 24°C is 75.2°F — the conversion must happen before the round, or the
    // reading comes out a degree low.
    expect(formatTemperature(24, "imperial")).toBe("75");
    expect(formatTemperatureFull(24, "imperial")).toBe("75°F");
  });

  it("renders negative temperatures", () => {
    expect(formatTemperature(-3.2, "metric")).toBe("-3");
  });
});

describe("formatWindSpeed", () => {
  it("converts metres per second to km/h and mph", () => {
    expect(formatWindSpeed(10, "metric")).toEqual({ value: "36", unit: "km/h" });
    expect(formatWindSpeed(10, "imperial")).toEqual({
      value: "22",
      unit: "mph",
    });
  });
});

describe("formatPressure", () => {
  it("keeps hPa in metric and converts to inHg in imperial", () => {
    expect(formatPressure(1013, "metric")).toEqual({
      value: "1013",
      unit: "hPa",
    });
    expect(formatPressure(1013, "imperial").value).toBe("29.91");
  });
});

describe("formatVisibility", () => {
  it("drops the decimal once the distance is large", () => {
    expect(formatVisibility(10_000, "metric")).toEqual({
      value: "10",
      unit: "km",
    });
    expect(formatVisibility(1200, "metric")).toEqual({
      value: "1.2",
      unit: "km",
    });
  });
});

describe("formatPrecipitation", () => {
  it("converts millimetres to inches", () => {
    expect(formatPrecipitation(25.4, "imperial").value).toBe("1.00");
    expect(formatPrecipitation(1.5, "metric")).toEqual({
      value: "1.5",
      unit: "mm",
    });
  });
});

describe("windDirectionLabel", () => {
  it("maps bearings to compass points", () => {
    expect(windDirectionLabel(0)).toBe("N");
    expect(windDirectionLabel(90)).toBe("E");
    expect(windDirectionLabel(180)).toBe("S");
    expect(windDirectionLabel(270)).toBe("W");
  });

  it("wraps around the circle rather than overflowing the array", () => {
    expect(windDirectionLabel(359)).toBe("N");
    expect(windDirectionLabel(360)).toBe("N");
    expect(windDirectionLabel(-90)).toBe("W");
    expect(windDirectionLabel(720)).toBe("N");
  });
});
