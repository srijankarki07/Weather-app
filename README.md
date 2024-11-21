# Mero Mausam

A weather app that answers the question you actually have: *what does this
weather mean for my day?*

Current conditions, a 7-day outlook, an hourly view and a minute-by-minute rain
nowcast for any city — built as a single scrollable screen, styled after the
design system in [`DESIGN.md`](./DESIGN.md) and built to the plan in
[`PLAN.md`](./PLAN.md).

## Quick start

```bash
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000). No API key or `.env` file
is required — see [Data sources](#data-sources).

```bash
npm test          # unit and integration tests
npm run build     # production bundle into build/
```

## What it does

- **Current conditions** with a one-line verdict — "Good to be outside", "Take
  an umbrella" — so the answer precedes the data.
- **Hourly chart** overlaying the temperature curve with precipitation
  probability, with the high and low annotated on the curve.
- **7-day forecast** where each day's range is drawn as a bar on a *shared*
  scale, so colder days genuinely look colder instead of every bar filling its
  row.
- **Highlights** that interpret rather than report: dew point as a comfort word,
  UV as a burn time, air quality as health guidance, pressure as a trend.
- **Per-activity advice** for running and cycling.
- **Sun arc** showing how much daylight is left, not just when it started.
- **Offline.** The last successful forecast is cached in IndexedDB and served
  with a timestamp when the network is gone — see [Offline](#offline).

## Offline

Every successful fetch is written to IndexedDB and the app reads it back on the
next load, so a cold start with no connection shows the last forecast rather
than a spinner. The hook that does this is
[`useWeather`](./src/hooks/useWeather.ts): two queries per location, one against
the network and one against the cache, with the network always winning.

Cached data older than twelve hours is treated as absent. A two-day-old forecast
presented as current is worse than admitting there is nothing to show, so past
that point the app says so instead.

## Data sources

Every provider used here is **free and keyless**. The app ships no API key, so
there is no secret to leak and nothing to configure.

| Data                                        | Provider                 |
| ------------------------------------------- | ------------------------ |
| Current, hourly, daily, nowcast, UV, dew pt | Open-Meteo               |
| Air quality and pollen                      | Open-Meteo Air Quality   |
| City search                                 | Open-Meteo Geocoding     |
| Coordinates → place name                    | BigDataCloud (reverse)   |

PLAN.md recommends OpenWeather One Call 3.0 for the forecast, but it requires a
paid subscription, and the plan's own security section wants API keys held
behind a server proxy — which this project cannot do, having no backend. Going
keyless resolves both constraints at once. The trade-off is that the merge of
several provider responses happens in the browser rather than at an edge
function; that work lives in [`src/api/weather.ts`](./src/api/weather.ts).

## Architecture

```
src/
├── api/          Provider clients and the normalising assembler
│   ├── http.ts        fetch wrapper: timeouts, error normalisation
│   ├── openMeteo.ts   forecast and air quality
│   ├── geocoding.ts   place search and reverse lookup
│   ├── normalize.ts   provider codes → the internal vocabulary
│   └── weather.ts     merges providers → one WeatherData
├── hooks/        TanStack Query hooks, geolocation, online status, charts
├── lib/          Units, time-in-zone, comfort indices, palette, IndexedDB
├── components/
│   ├── ui/            Card, Button, Skeleton, ErrorState, icons
│   ├── weather/       Cards specific to weather
│   └── layout/        App shell and dynamic background
├── styles/       Design tokens and base layer
├── test/         Shared fixtures and the fetch mock
└── types/        The internal weather model
```

Four rules hold the structure together:

1. **Providers are never called from components.** Only `api/` talks to the
   network, and everything it returns is normalised into the `WeatherData` type
   in [`src/types/weather.ts`](./src/types/weather.ts). Swapping a provider means
   writing a client and extending the assembler.
2. **The internal model is always metric.** Celsius, m/s, hPa, metres. Unit
   conversion happens at the display edge in [`src/lib/units.ts`](./src/lib/units.ts).
3. **Times render in the location's zone, not the browser's.** Searching for
   Tokyo from London shows Tokyo's clock, via the IANA zone the provider
   returns.
4. **Interpretation lives in `lib/`, not in components.** Thresholds for comfort,
   UV severity, pressure trend and activity advice are in
   [`comfort.ts`](./src/lib/comfort.ts) so they can be reviewed — and tested —
   in one place rather than being scattered through JSX.

### Bundle splitting

The charting library is the heaviest dependency in the project, so the hourly
chart is lazy-loaded into its own chunk and the main bundle stays around 106 kB
gzipped instead of 202 kB. The hero and the daily forecast, which a user reads
first, ship in the main bundle. PLAN §5 targets a first contentful paint under
1.5s on 3G, and PLAN §8 names lazy-loading as the mitigation for bundle weight.

## Design system

[`DESIGN.md`](./DESIGN.md) is the source of truth for colour, type, radius and
spacing, and its token names are preserved in
[`src/styles/tokens.css`](./src/styles/tokens.css) so a spec change maps 1:1
onto a variable rename. Components are styled with CSS Modules and consume
custom properties only — there are no hard-coded colours or pixel sizes in
component styles.

Two deliberate deviations from the spec:

- **Inter replaces Airbnb Cereal VF**, which is licensed to Airbnb only. The
  spec's own guidance names Inter as the closest substitute.
- **A dark palette is defined.** The spec documents Airbnb's public surfaces as
  light-only, but PLAN.md §4.6 calls for dark mode and condition-driven
  backgrounds. The dark and high-contrast values re-point the same token names
  rather than introducing a second set of components. The token layer for these
  is in place; the control that switches between them arrives in Phase 4.

## Accessibility

Implemented so far, per PLAN §4.7:

- Search is a real `role="combobox"` with a listbox popup, operable by keyboard
  (arrows, Enter, Escape) with `aria-activedescendant` tracking the active
  option. Suggestions activate on `click`, so keyboard and assistive-technology
  users can select one, not just pointer users.
- An `aria-live` region announces the current conditions when they change.
- A skip link jumps past the sticky header.
- Sizes are in relative units, so the layout survives browser text scaling.
- `prefers-reduced-motion` is honoured globally, and skeletons fall back to a
  pulse rather than a sweep.
- Loading states are single `role="status"` regions, so a screen reader hears
  one message instead of every skeleton.

Still to come: the high-contrast toggle, keyboard access to chart data points,
and a contrast pass over the full palette.

## Testing

`npm test` runs the suite: pure-function units, the provider→model assembler,
and integration tests that mount the whole tree with only `fetch` stubbed.
There is no end-to-end suite — PLAN §7 puts it in Phase 5, which this project
skipped by choice.

## Preview

[mero-mausam.vercel.app](https://mero-mausam.vercel.app/)

## License

MIT
