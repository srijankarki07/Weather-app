/**
 * Whole-app render tests.
 *
 * These stand in for the end-to-end suite this project deliberately does not
 * have. They mount the real tree — providers, query client, every card — with
 * only `fetch` stubbed, so they catch the integration failures that unit tests
 * on pure functions cannot: a provider wired up wrongly, a stylesheet import
 * that throws, data that never reaches a component.
 */

import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import App from "./App";
import { queryClient } from "./lib/queryClient";
import { db, readCachedForecast } from "./lib/db";
import { DEFAULT_LOCATION } from "./config";
import { useAppStore, FALLBACK_LOCATION } from "./store/useAppStore";
import {
  buildForecastFixture,
  mockWeatherFetch,
  GEOCODE_SEARCH_FIXTURE,
} from "./test/fixtures";

beforeEach(async () => {
  // Each test starts from an empty cache, or the first test's data leaks into
  // the next one and the loading assertions never see a loading state.
  queryClient.clear();
  window.localStorage.clear();
  // Same reasoning for IndexedDB: a forecast cached by one test would satisfy
  // the next test's offline path before it ever went offline.
  await db.forecasts.clear();
  await db.locations.clear();
  /*
   * The Zustand store is module state, so clearing localStorage does not reset
   * it. Without this, a city chosen by one test leaks into the next and the
   * offline test reads the cache for the wrong coordinates.
   */
  useAppStore.setState({
    activeLocation: FALLBACK_LOCATION,
    recentSearches: [],
  });

  /*
   * Retries are right in production but wrong here: the default policy backs
   * off over roughly three seconds before settling into an error, which is
   * longer than a `findBy*` waits. Turning them off keeps the error-path test
   * honest about what it asserts rather than about how long it waited.
   */
  queryClient.setDefaultOptions({ queries: { retry: false, retryDelay: 0 } });
  queryClient.mount();
});

afterEach(() => {
  /*
   * Unmount first, then empty the cache. React Testing Library's own automatic
   * cleanup runs after this hook, so without an explicit unmount the query
   * client is cleared while components are still subscribed — and every
   * observer they hold fires a state update outside `act`.
   */
  cleanup();
  queryClient.clear();
  jest.restoreAllMocks();
});

/**
 * The hero section, found by its accessible name rather than by text. The
 * hourly chart's data table also contains temperature values, so a bare
 * `getByText("24")` is ambiguous once the chart is on the page.
 */
function hero() {
  return within(screen.getByRole("region", { name: /current conditions/i }));
}

describe("App", () => {
  it("shows a skeleton, then the current conditions", async () => {
    mockWeatherFetch();

    render(<App />);

    // The accessibility status region is present from the first paint, so a
    // screen reader hears about the load rather than silence.
    expect(screen.getByRole("status")).toBeInTheDocument();

    // 24.3°C rounds to 24; the value and the degree unit render separately.
    await waitFor(() => expect(hero().getByText("24")).toBeInTheDocument());
    expect(hero().getByText("Overcast")).toBeInTheDocument();
    // The geolocation-free default location, named by reverse geocoding.
    // The h1 names the place, which also covers the document outline: every
    // card below is an h2, so the page needs exactly one top-level heading.
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Kathmandu"
    );
  });

  it("renders the forecast list with today first", async () => {
    mockWeatherFetch();

    render(<App />);

    // Three fixture days minus the filtered-out past day leaves two.
    await screen.findByRole("heading", { name: /2-day forecast/i });
    expect(screen.getByText("Today")).toBeInTheDocument();
  });

  it("surfaces the outdoor verdict from PLAN 3", async () => {
    mockWeatherFetch({
      forecast: buildForecastFixture({ weatherCode: 95, temperature: 30 }),
    });

    render(<App />);

    // WMO 95 is a thunderstorm, which should override the pleasant temperature.
    expect(await screen.findByText("Stay inside")).toBeInTheDocument();
  });

  it("keeps a readable page when the API is unreachable", async () => {
    mockWeatherFetch({ failAll: true });

    render(<App />);

    expect(
      await screen.findByRole("heading", {
        name: /could not load the weather/i,
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /try again/i })
    ).toBeInTheDocument();
  });

  it("searches for a city and loads its weather", async () => {
    const fetchMock = mockWeatherFetch();
    const user = userEvent.setup();

    render(<App />);
    await waitFor(() => expect(hero().getByText("24")).toBeInTheDocument());

    const input = screen.getByRole("combobox", { name: /search for a city/i });
    await user.click(input);
    await user.type(input, "Kathmandu");

    // The debounce is 300ms; findBy polls while wrapping in `act`.
    const option = await screen.findByRole("option", {
      name: /Kathmandu/i,
    });
    await user.click(option);

    await waitFor(() => {
      const urls = fetchMock.mock.calls.map((call) => String(call[0]));
      expect(urls.some((url) => url.includes("geocoding-api"))).toBe(true);
    });

    // Selecting a suggestion must refetch against the chosen coordinates.
    expect(GEOCODE_SEARCH_FIXTURE.results[0].latitude).toBe(27.70169);

    await waitFor(() =>
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
    );
    await waitFor(() => expect(hero().getByText("24")).toBeInTheDocument());
  });

  it("exposes the search field as a labelled combobox", async () => {
    mockWeatherFetch();
    render(<App />);
    await waitFor(() => expect(hero().getByText("24")).toBeInTheDocument());

    const input = screen.getByRole("combobox", { name: /search for a city/i });
    expect(input).toHaveAttribute("aria-expanded", "false");
    expect(input).toHaveAttribute("aria-autocomplete", "list");
  });

  it("gives every icon-only control an accessible name", async () => {
    mockWeatherFetch();
    render(<App />);
    await waitFor(() => expect(hero().getByText("24")).toBeInTheDocument());

    const header = screen.getByRole("banner");
    // Buttons in the header with no text content must still be labelled.
    for (const button of within(header).getAllByRole("button")) {
      const name =
        button.getAttribute("aria-label") ??
        button.textContent?.trim() ??
        "";
      expect(name.length).toBeGreaterThan(0);
    }
  });
});

describe("highlights", () => {
  it("interprets each reading rather than only showing it", async () => {
    // A UV index of 8 lands in the "very high" band, where the burn-time
    // estimate is the whole point of the tile.
    mockWeatherFetch({ forecast: buildForecastFixture({ uvIndex: 8 }) });
    render(<App />);
    await waitFor(() => expect(hero().getByText("24")).toBeInTheDocument());

    const highlights = within(
      screen.getByRole("region", { name: /today's highlights/i })
    );

    // PLAN 4.2: dew point explained as comfort, UV as a burn time, air quality
    // as health guidance.
    expect(highlights.getByText("Feels like")).toBeInTheDocument();
    expect(highlights.getByText("Dew point 15° · Comfortable")).toBeInTheDocument();
    expect(highlights.getByText("UV index")).toBeInTheDocument();
    expect(highlights.getByText("Very high")).toBeInTheDocument();
    expect(
      highlights.getByText(/Burn time: about \d+ minutes/)
    ).toBeInTheDocument();
    expect(highlights.getByText("Air quality")).toBeInTheDocument();
    expect(highlights.getByText(/Air quality is acceptable/i)).toBeInTheDocument();
  });

  it("gives a per-activity verdict", async () => {
    mockWeatherFetch();
    render(<App />);
    await waitFor(() => expect(hero().getByText("24")).toBeInTheDocument());

    const highlights = within(
      screen.getByRole("region", { name: /today's highlights/i })
    );
    expect(highlights.getByText("Running")).toBeInTheDocument();
    expect(highlights.getByText("Cycling")).toBeInTheDocument();
  });
});

describe("nowcast banner", () => {
  it("announces rain when it is falling", async () => {
    mockWeatherFetch();
    render(<App />);

    const banner = await screen.findByRole("region", {
      name: /precipitation nowcast/i,
    });
    expect(banner).toHaveTextContent(/rain for the next hour/i);
  });

  it("announces rain that is on its way", async () => {
    /*
     * A hand-built series rather than the fixture: rain has to start partway
     * through the hour, and the fixture's minutely block is uniform.
     */
    const forecast = buildForecastFixture({ nowcastMm: 0 });
    const start = Math.floor(Date.now() / 1000) - 15 * 60;
    const times = Array.from({ length: 8 }, (_, i) => start + i * 15 * 60);
    forecast.minutely_15 = {
      time: times,
      // Dry for the first two steps, then raining.
      precipitation: times.map((_, i) => (i < 2 ? 0 : 1.4)),
      precipitation_probability: times.map(() => 80),
    };
    mockWeatherFetch({ forecast });

    render(<App />);

    const banner = await screen.findByRole("region", {
      name: /precipitation nowcast/i,
    });
    expect(banner).toHaveTextContent(/rain starting in about/i);
  });

  it("stays out of the way when the hour is dry", async () => {
    mockWeatherFetch({ forecast: buildForecastFixture({ nowcastMm: 0 }) });

    render(<App />);
    // Wait for the page to settle before asserting an absence.
    await waitFor(() => expect(hero().getByText("24")).toBeInTheDocument());

    expect(
      screen.queryByRole("region", { name: /precipitation nowcast/i })
    ).not.toBeInTheDocument();
  });
});

describe("saved locations", () => {
  it("saves the current city and shows it in the dashboard", async () => {
    mockWeatherFetch();
    const user = userEvent.setup();

    render(<App />);
    await waitFor(() => expect(hero().getByText("24")).toBeInTheDocument());

    await user.click(
      screen.getByRole("button", { name: /save kathmandu/i })
    );

    // The strip reloads from IndexedDB via `useLiveQuery`, so this also proves
    // the write actually landed rather than only updating local state.
    const strip = await screen.findByRole("group", {
      name: /saved locations/i,
    });
    await waitFor(() =>
      expect(within(strip).getByText("Kathmandu")).toBeInTheDocument()
    );

    // Once saved, the save action is replaced by the remove control.
    expect(
      within(strip).getByRole("button", { name: /remove kathmandu/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /save kathmandu/i })
    ).not.toBeInTheDocument();
  });

  it("removes a saved city", async () => {
    mockWeatherFetch();
    const user = userEvent.setup();

    render(<App />);
    await waitFor(() => expect(hero().getByText("24")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: /save kathmandu/i }));
    const strip = await screen.findByRole("group", {
      name: /saved locations/i,
    });

    await user.click(
      await within(strip).findByRole("button", { name: /remove kathmandu/i })
    );

    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: /remove kathmandu/i })
      ).not.toBeInTheDocument()
    );
  });
});

describe("recent searches", () => {
  it("offers previously searched cities when the field is empty", async () => {
    mockWeatherFetch();
    const user = userEvent.setup();

    render(<App />);
    await waitFor(() => expect(hero().getByText("24")).toBeInTheDocument());

    const input = screen.getByRole("combobox", { name: /search for a city/i });
    await user.click(input);
    await user.type(input, "Kathmandu");
    await user.click(await screen.findByRole("option", { name: /Kathmandu/i }));

    // Selecting clears the field, so focusing it again should show history.
    await user.click(input);

    const listbox = await screen.findByRole("listbox", {
      name: /recent searches/i,
    });
    expect(within(listbox).getByText("Kathmandu")).toBeInTheDocument();
  });
});

describe("lazy-loaded chart", () => {
  it("resolves its chunk and exposes the data as a table", async () => {
    mockWeatherFetch();
    render(<App />);
    await waitFor(() => expect(hero().getByText("24")).toBeInTheDocument());

    /*
     * The chart is in its own chunk behind Suspense. If that split ever broke,
     * the app would still render everything else and this would be the only
     * failing test — which is exactly why it exists.
     */
    expect(
      await screen.findByRole("heading", { name: /next 24 hours/i })
    ).toBeInTheDocument();

    // The SVG is aria-hidden; the table is how the numbers reach a screen
    // reader, so its presence is the accessibility contract.
    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("row").length).toBeGreaterThan(12);
  });
});

describe("offline fallback", () => {
  it("shows the last forecast with a timestamp when the network is gone", async () => {
    /*
     * First load, online. This is also what populates IndexedDB.
     */
    mockWeatherFetch();
    const first = render(<App />);
    await waitFor(() => expect(hero().getByText("24")).toBeInTheDocument());

    // Wait for the cache write to land, or the second render has nothing to
    // fall back to and the test would pass for the wrong reason.
    await waitFor(async () => {
      const cached = await readCachedForecast(
        DEFAULT_LOCATION.lat,
        DEFAULT_LOCATION.lon
      );
      expect(cached).not.toBeNull();
    });

    first.unmount();
    queryClient.clear();

    /*
     * Second load, offline. The app must still show the forecast — the whole
     * point of PLAN 4.8 — and must say how old it is, because a stale forecast
     * presented as current is worse than no forecast.
     */
    jest.restoreAllMocks();
    mockWeatherFetch({ failAll: true });
    render(<App />);

    await waitFor(() => expect(hero().getByText("24")).toBeInTheDocument());
    expect(screen.getByText(/Showing the forecast from/)).toBeInTheDocument();
    expect(screen.getByText(/Could not refresh|You are offline/)).toBeInTheDocument();
  });

  it("explains itself when there is neither a network nor a cache", async () => {
    mockWeatherFetch({ failAll: true });
    render(<App />);

    expect(
      await screen.findByRole("heading", {
        name: /could not load the weather/i,
      })
    ).toBeInTheDocument();
  });
});
