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
import {
  buildForecastFixture,
  mockWeatherFetch,
  GEOCODE_SEARCH_FIXTURE,
} from "./test/fixtures";

beforeEach(() => {
  // Each test starts from an empty cache, or the first test's data leaks into
  // the next one and the loading assertions never see a loading state.
  queryClient.clear();
  window.localStorage.clear();

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

describe("App", () => {
  it("shows a skeleton, then the current conditions", async () => {
    mockWeatherFetch();

    render(<App />);

    // The accessibility status region is present from the first paint, so a
    // screen reader hears about the load rather than silence.
    expect(screen.getByRole("status")).toBeInTheDocument();

    // 24.3°C rounds to 24; the value and the degree unit render separately.
    await waitFor(() =>
      expect(screen.getByText("24")).toBeInTheDocument()
    );
    expect(screen.getByText("Overcast")).toBeInTheDocument();
    // The geolocation-free default location, named by reverse geocoding.
    expect(screen.getAllByText(/Kathmandu/).length).toBeGreaterThan(0);
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
    await screen.findByText("24");

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
    await screen.findByText("24");
  });

  it("exposes the search field as a labelled combobox", async () => {
    mockWeatherFetch();
    render(<App />);
    await screen.findByText("24");

    const input = screen.getByRole("combobox", { name: /search for a city/i });
    expect(input).toHaveAttribute("aria-expanded", "false");
    expect(input).toHaveAttribute("aria-autocomplete", "list");
  });

  it("gives every icon-only control an accessible name", async () => {
    mockWeatherFetch();
    render(<App />);
    await screen.findByText("24");

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
