import { describeNowcast, shouldShowNowcast } from "./nowcast";
import type { MinutelyPoint } from "../types/weather";

const STEP_MS = 15 * 60 * 1000;
const NOW = Date.parse("2024-11-25T12:00:00Z");

/**
 * Builds an hour of 15-minute points starting one step in the past, matching
 * what the provider returns: the first entry is the interval already underway.
 */
function series(precipitation: number[]): MinutelyPoint[] {
  return precipitation.map((value, index) => ({
    time: NOW - STEP_MS + index * STEP_MS,
    precipitation: value,
  }));
}

describe("describeNowcast", () => {
  it("reports nothing happening for a dry hour", () => {
    const nowcast = describeNowcast(series([0, 0, 0, 0, 0]), NOW);
    expect(nowcast.kind).toBe("dry");
    expect(nowcast.headline).toMatch(/no rain/i);
  });

  it("ignores trace amounts that nobody would act on", () => {
    // 0.02 mm is below the threshold where rain becomes worth mentioning.
    const nowcast = describeNowcast(series([0.02, 0.02, 0, 0, 0]), NOW);
    expect(nowcast.kind).toBe("dry");
  });

  /*
   * Note on indexing: `series` starts one step in the past, matching what the
   * provider returns, and the assembler drops that point. So the first element
   * of the list below is always the interval already underway at NOW — putting
   * rain at index 1 means it is falling right now, and at index 2 means it
   * arrives in 15 minutes.
   */
  it("announces rain arriving in fifteen minutes", () => {
    const nowcast = describeNowcast(series([0, 0, 1.2, 1.4, 1.1]), NOW);

    expect(nowcast.kind).toBe("starting");
    expect(nowcast.headline).toMatch(/rain starting in about 15 minutes/i);
    expect(nowcast.minutesUntilChange).toBe(15);
  });

  it("announces rain arriving further out", () => {
    const nowcast = describeNowcast(series([0, 0, 0, 1.2, 1.4]), NOW);

    expect(nowcast.kind).toBe("starting");
    expect(nowcast.minutesUntilChange).toBe(30);
  });

  it("never says 'in 0 minutes'", () => {
    // Rain already falling is a different message, and no branch should be
    // able to emit a zero-minute countdown.
    for (const values of [
      [0, 1.5, 1.5, 1.4, 1.2],
      [1.5, 1.5, 1.5, 1.5, 1.5],
      [1.2, 1.2, 0, 0, 0],
    ]) {
      expect(describeNowcast(series(values), NOW).headline).not.toMatch(
        /0 minutes/
      );
    }
  });

  it("announces rain stopping", () => {
    // Wet for most of the hour, clearing at the end.
    const nowcast = describeNowcast(series([1.2, 1.2, 1.2, 1.2, 0]), NOW);

    expect(nowcast.kind).toBe("stopping");
    expect(nowcast.headline).toMatch(/stopping in about 45 minutes/i);
  });

  it("calls a brief break showers rather than a stop", () => {
    // Wet now, clearing by mid-hour — too short to call it a stop.
    const nowcast = describeNowcast(series([1.2, 1.2, 0, 0, 0]), NOW);
    expect(nowcast.kind).toBe("stopping");
    expect(nowcast.headline).toMatch(/easing/i);
  });

  it("reports rain that lasts the whole hour", () => {
    const nowcast = describeNowcast(series([1, 1.1, 1.2, 1.3, 1.4]), NOW);
    expect(nowcast.kind).toBe("continuing");
    expect(nowcast.headline).toMatch(/next hour/i);
  });

  it("describes scattered showers as on and off", () => {
    // Wet now, briefly dry, wet again — not a clean start or stop.
    const nowcast = describeNowcast(series([1.2, 0, 0, 1.1, 1.0]), NOW);
    expect(["stopping", "starting", "continuing"]).toContain(nowcast.kind);
    expect(nowcast.headline.length).toBeGreaterThan(0);
  });

  it("follows the series' own step size rather than assuming 15 minutes", () => {
    /*
     * Ten-minute steps, with two wet intervals. If the duration were computed
     * from a hard-coded 15-minute assumption it would report 30 minutes; from
     * the series' actual spacing it is 20.
     */
    const points: MinutelyPoint[] = [0, 0, 0, 1.2, 1.2].map((value, index) => ({
      time: NOW - 10 * 60 * 1000 + index * 10 * 60 * 1000,
      precipitation: value,
    }));

    const nowcast = describeNowcast(points, NOW);

    expect(nowcast.minutesUntilChange).toBe(20);
    expect(nowcast.detail).toMatch(/20 minutes/);
    expect(nowcast.detail).not.toMatch(/30 minutes/);
  });

  it("ignores points in the past", () => {
    const points: MinutelyPoint[] = [
      // An hour ago it was pouring; that should not affect the message.
      { time: NOW - 60 * 60 * 1000, precipitation: 5 },
      { time: NOW, precipitation: 0 },
      { time: NOW + STEP_MS, precipitation: 0 },
    ];

    expect(describeNowcast(points, NOW).kind).toBe("dry");
  });

  it("reports a peak intensity", () => {
    const nowcast = describeNowcast(series([0.5, 2.4, 1.1, 0.2, 0]), NOW);
    expect(nowcast.peakIntensity).toBeCloseTo(2.4, 5);
  });

  it("scales severity with intensity, capped at one", () => {
    const light = describeNowcast(series([0.4, 0.5, 0.4, 0.3, 0.3]), NOW);
    const heavy = describeNowcast(series([9, 9, 9, 9, 9]), NOW);

    expect(heavy.severity).toBeGreaterThan(light.severity);
    expect(heavy.severity).toBeLessThanOrEqual(1);
  });

  it("returns unknown when the provider sent no minutely data", () => {
    const nowcast = describeNowcast([], NOW);
    expect(nowcast.kind).toBe("unknown");
    expect(shouldShowNowcast(nowcast)).toBe(false);
  });

  it("always produces a headline for any non-empty series", () => {
    const cases = [
      [0, 0, 0, 0, 0],
      [1, 1, 1, 1, 1],
      [0, 0, 1, 0, 0],
      [1, 0, 1, 0, 1],
      [0.5, 0.5, 0, 0, 0],
    ];
    for (const values of cases) {
      const nowcast = describeNowcast(series(values), NOW);
      expect(nowcast.headline.length).toBeGreaterThan(0);
    }
  });
});

describe("shouldShowNowcast", () => {
  it("hides the banner when there is nothing to say", () => {
    expect(shouldShowNowcast(describeNowcast(series([0, 0, 0, 0, 0]), NOW))).toBe(
      false
    );
    expect(shouldShowNowcast(describeNowcast([], NOW))).toBe(false);
  });

  it("shows the banner when rain is arriving or leaving", () => {
    expect(
      shouldShowNowcast(describeNowcast(series([0, 0, 1.2, 1.2, 1.2]), NOW))
    ).toBe(true);
    expect(
      shouldShowNowcast(describeNowcast(series([1.2, 1.2, 0, 0, 0]), NOW))
    ).toBe(true);
    expect(
      shouldShowNowcast(describeNowcast(series([1.2, 1.2, 1.2, 1.2, 1.2]), NOW))
    ).toBe(true);
  });
});
