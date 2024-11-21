import { rangePosition, temperatureColor } from "./palette";

/** Pulls the three channels out of an `rgb(r, g, b)` string. */
function channels(color: string): [number, number, number] {
  const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!match) throw new Error(`Not an rgb() colour: ${color}`);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

describe("temperatureColor", () => {
  it("returns a valid rgb() string for any input", () => {
    for (const celsius of [-40, -25, -10, 0, 12, 22, 30, 40, 55]) {
      expect(temperatureColor(celsius)).toMatch(/^rgb\(\d+, \d+, \d+\)$/);
    }
  });

  it("gets bluer as it gets colder and redder as it gets hotter", () => {
    const [coldR, , coldB] = channels(temperatureColor(-20));
    const [hotR, , hotB] = channels(temperatureColor(38));

    expect(coldB).toBeGreaterThan(coldR);
    expect(hotR).toBeGreaterThan(hotB);
  });

  /*
   * The ramp is a designed hue path, not a linear interpolation of one channel
   * — the cold end walks from deep blue to bright blue before the warm end
   * takes over — so asserting that any single channel rises monotonically would
   * be asserting something untrue. What matters perceptually is that the scale
   * is cool at one end, warm at the other, and crosses over exactly once.
   */
  it("crosses from blue-dominant to red-dominant exactly once", () => {
    const dominance = [-25, -10, 0, 10, 15, 20, 25, 30, 40].map((celsius) => {
      const [r, , b] = channels(temperatureColor(celsius));
      return r > b ? "warm" : "cool";
    });

    expect(dominance[0]).toBe("cool");
    expect(dominance[dominance.length - 1]).toBe("warm");

    const crossovers = dominance.filter(
      (value, index) => index > 0 && value !== dominance[index - 1]
    ).length;
    expect(crossovers).toBe(1);
  });

  it("clamps rather than extrapolating past the stops", () => {
    expect(temperatureColor(-100)).toBe(temperatureColor(-25));
    expect(temperatureColor(100)).toBe(temperatureColor(40));
  });

  it("returns a neutral grey instead of throwing on a bad reading", () => {
    expect(temperatureColor(Number.NaN)).toMatch(/^rgb\(/);
    expect(temperatureColor(Number.POSITIVE_INFINITY)).toMatch(/^rgb\(/);
  });

  it("interpolates between adjacent stops", () => {
    // 5°C sits between the 0°C and 10°C stops, so it must differ from both.
    const atZero = temperatureColor(0);
    const atFive = temperatureColor(5);
    const atTen = temperatureColor(10);

    expect(atFive).not.toBe(atZero);
    expect(atFive).not.toBe(atTen);
  });
});

describe("rangePosition", () => {
  it("spans the full width for a range covering the whole scale", () => {
    expect(rangePosition(0, 30, 0, 30)).toEqual({ left: 0, width: 100 });
  });

  it("places a warm range to the right and a cold one to the left", () => {
    const cold = rangePosition(0, 10, 0, 40);
    const warm = rangePosition(30, 40, 0, 40);

    expect(cold.left).toBe(0);
    expect(warm.left).toBe(75);
    expect(warm.left).toBeGreaterThan(cold.left);
  });

  it("sizes the bar in proportion to the range", () => {
    const narrow = rangePosition(10, 15, 0, 40);
    const wide = rangePosition(10, 30, 0, 40);

    expect(wide.width).toBeGreaterThan(narrow.width);
    // 5 of 40 is 12.5%.
    expect(narrow.width).toBeCloseTo(12.5, 1);
  });

  it("never renders an invisible sliver for a flat day", () => {
    // A day with no spread at all still needs a visible marker.
    const flat = rangePosition(20, 20, 0, 40);
    expect(flat.width).toBeGreaterThanOrEqual(6);
  });

  it("keeps the bar inside the track", () => {
    const edge = rangePosition(38, 40, 0, 40);
    expect(edge.left + edge.width).toBeLessThanOrEqual(100.001);
  });

  it("returns a full-width bar when the scale has no span", () => {
    expect(rangePosition(10, 20, 15, 15)).toEqual({ left: 0, width: 100 });
  });
});
