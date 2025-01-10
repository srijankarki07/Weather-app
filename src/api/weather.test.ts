/**
 * Assembler tests.
 *
 * `fetchWeatherBundle` is where provider payloads become the app's model, and
 * it is where two real bugs lived during development: the daily array silently
 * beginning with yesterday (because `past_days=1` prepends it) and the nowcast
 * being truncated to a single point by a query parameter Open-Meteo does not
 * recognise. Both are guarded here.
 *
 * The provider clients are exercised for real — only `fetch` is stubbed — so
 * the fixtures have to be shaped exactly as the APIs return them.
 */

import { fetchWeatherBundle } from "./weather";
import { buildForecastFixture, mockWeatherFetch } from "../test/fixtures";

const HOUR_S = 3600;

afterEach(() => {
  jest.restoreAllMocks();
});

describe("fetchWeatherBundle", () => {
  it("starts the daily array at today, dropping the past day", async () => {
    mockWeatherFetch({ forecast: buildForecastFixture() });

    const data = await fetchWeatherBundle({
      lat: 27.7,
      lon: 85.3,
      label: { name: "Kathmandu", country: "NP" },
    });

    // Three days came back; only today and tomorrow belong in the model.
    expect(data.daily).toHaveLength(2);
    expect(data.daily[0].max).toBe(24); // today, not yesterday's 20
    expect(data.daily[1].max).toBe(27);
  });

  it("keeps the hourly window to roughly now through 48 hours", async () => {
    mockWeatherFetch({ forecast: buildForecastFixture() });

    const data = await fetchWeatherBundle({
      lat: 27.7,
      lon: 85.3,
      label: { name: "Kathmandu" },
    });

    expect(data.hourly.length).toBeGreaterThan(40);
    expect(data.hourly.length).toBeLessThanOrEqual(50);
    // The first point is allowed to be one hour in the past so the chart's
    // "now" marker has a left edge to sit against.
    expect(data.hourly[0].time).toBeLessThanOrEqual(Date.now());
    expect(data.hourly[data.hourly.length - 1].time).toBeLessThanOrEqual(
      Date.now() + 48 * HOUR_S * 1000
    );
  });

  it("trims the nowcast to the next hour", async () => {
    mockWeatherFetch({ forecast: buildForecastFixture() });

    const data = await fetchWeatherBundle({
      lat: 27.7,
      lon: 85.3,
      label: { name: "Kathmandu" },
    });

    // 96 fifteen-minute points is 24 hours; at most five fall inside the hour
    // ahead, plus the one already elapsed.
    expect(data.minutely.length).toBeGreaterThan(0);
    expect(data.minutely.length).toBeLessThanOrEqual(6);
  });

  it("survives a truncated minutely block without inventing points", async () => {
    mockWeatherFetch({ forecast: buildForecastFixture({ minutelyPoints: 1 }) });

    const data = await fetchWeatherBundle({
      lat: 27.7,
      lon: 85.3,
      label: { name: "Kathmandu" },
    });

    expect(Array.isArray(data.minutely)).toBe(true);
    expect(data.minutely.length).toBeLessThanOrEqual(1);
  });

  it("normalises the air quality response and computes a trend", async () => {
    mockWeatherFetch({ forecast: buildForecastFixture() });

    const data = await fetchWeatherBundle({
      lat: 27.7,
      lon: 85.3,
      label: { name: "Kathmandu" },
    });

    expect(data.airQuality).toBeDefined();
    expect(data.airQuality!.aqi).toBe(53);
    expect(data.airQuality!.category).toBe("fair");
    expect(data.airQuality!.pollutants.pm2_5).toBe(11.5);
    // Pollen came back null for this location, so it should be absent rather
    // than an object full of nulls.
    expect(data.airQuality!.pollen).toBeUndefined();
    // 53 now against 30 a day ago.
    expect(data.airQuality!.trend).toBe(23);
  });

  it("derives dew point when the provider omits it", async () => {
    const forecast = buildForecastFixture();
    delete forecast.hourly.dew_point_2m;
    mockWeatherFetch({ forecast });

    const data = await fetchWeatherBundle({
      lat: 27.7,
      lon: 85.3,
      label: { name: "Kathmandu" },
    });

    // 24.3°C at 62% RH is a dew point around 16.6°C.
    expect(data.current.dewPoint).toBeCloseTo(16.6, 0);
  });

  it("still returns a forecast when air quality fails", async () => {
    const fetchMock = mockWeatherFetch({ air: null });

    const data = await fetchWeatherBundle({
      lat: 27.7,
      lon: 85.3,
      label: { name: "Kathmandu" },
    });

    // One degraded card, not a dead page.
    expect(data.airQuality).toBeUndefined();
    expect(data.current.temperature).toBe(24.3);
    expect(fetchMock).toHaveBeenCalled();
  });

  it("uses the supplied label instead of reverse geocoding", async () => {
    const fetchMock = mockWeatherFetch({ forecast: buildForecastFixture() });

    const data = await fetchWeatherBundle({
      lat: 27.7,
      lon: 85.3,
      label: { name: "Kathmandu", region: "Bagmati", country: "NP" },
    });

    expect(data.location.name).toBe("Kathmandu");
    expect(data.location.country).toBe("NP");
    expect(data.location.timezone).toBe("UTC");
    // No reverse-geocode request should have gone out.
    const urls = fetchMock.mock.calls.map((call) => String(call[0]));
    expect(urls.some((url) => url.includes("bigdatacloud"))).toBe(false);
  });

  it("takes sunrise and sunset from today, not from the nearest midnight", async () => {
    /*
     * Regression guard. `daily.time` holds local midnights, so picking the
     * nearest one returns *tomorrow's* entry for the whole of the afternoon —
     * which made the daylight card claim more than 24 hours of daylight left at
     * 5pm.
     */
    const forecast = buildForecastFixture();
    mockWeatherFetch({ forecast });

    const data = await fetchWeatherBundle({
      lat: 27.7,
      lon: 85.3,
      label: { name: "Kathmandu" },
    });

    // The fixture puts sunrise at +6h and sunset at +18h on each day.
    const dayLength = data.current.sunset - data.current.sunrise;
    expect(dayLength).toBe(12 * 60 * 60 * 1000);

    // And sunset must be within a day of now, not a day and a bit beyond it.
    expect(data.current.sunset - Date.now()).toBeLessThan(24 * 60 * 60 * 1000);
  });

  it("records which providers contributed", async () => {
    mockWeatherFetch({ forecast: buildForecastFixture() });

    const data = await fetchWeatherBundle({
      lat: 27.7,
      lon: 85.3,
      label: { name: "Kathmandu" },
    });

    expect(data.sources).toEqual(["Open-Meteo", "Open-Meteo Air Quality"]);
  });
});

describe("fetchWeatherBundle response handling", () => {
  it("propagates a forecast failure rather than returning a half model", async () => {
    jest.spyOn(global, "fetch").mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({}),
    } as Response);

    await expect(
      fetchWeatherBundle({ lat: 27.7, lon: 85.3, label: { name: "K" } })
    ).rejects.toThrow(/weather service is having problems/i);
  });

  it("skips the air quality request when asked not to", async () => {
    const fetchMock = mockWeatherFetch({ forecast: buildForecastFixture() });

    await fetchWeatherBundle({
      lat: 27.7,
      lon: 85.3,
      label: { name: "Kathmandu" },
      includeAirQuality: false,
    });

    const urls = fetchMock.mock.calls.map((call) => String(call[0]));
    expect(urls.some((url) => url.includes("air-quality"))).toBe(false);
  });
});
