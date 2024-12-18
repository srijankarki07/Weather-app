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
- **Rain nowcast** — "Rain starting in about 15 minutes" — from 15-minute
  precipitation data. The banner renders nothing when the hour is dry, because
  a permanent alert is one nobody reads.
- **Radar map** with a time scrubber over 13 past frames, plus an infrared
  satellite layer. The map is mounted only when its tab is first opened.
- **Saved locations** with an at-a-glance dashboard strip, persisted in
  IndexedDB.
- **Recent searches**, recorded on selection rather than on keystroke.
- **Severe weather alerts** from the National Weather Service, with severity
  colour-coding and the full bulletin one tap away.
- **Dark mode, high contrast and reduced motion**, with light/dark/auto themes
  and a contrast-audited palette.
- **Installable PWA** with a service worker, an offline app shell and an update
  prompt that waits rather than reloading under your thumb.
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

The two heaviest dependencies are both kept out of the main bundle:

| Chunk        | Size (gzip) | Loaded when                     |
| ------------ | ----------- | ------------------------------- |
| main         | ~113 kB     | immediately                     |
| Recharts     | ~99 kB      | the Hourly tab renders          |
| Leaflet      | ~44 kB      | the Radar tab is opened         |

The radar is not merely lazy-rendered: it is not mounted at all until its tab is
first activated, so someone who never opens the map never downloads Leaflet.
PLAN §5 targets a first contentful paint under 1.5s on 3G, and PLAN §8 names
lazy-loading as the mitigation for bundle weight.

### Map layers

Precipitation radar and infrared satellite come from RainViewer, free and
keyless. PLAN §9 asks for "temperature and precipitation layers"; a temperature
*tile* layer has no keyless source — OpenWeather's is free but needs a key, and
every other provider wants a paid plan. So the temperature layer is wired up but
hidden unless `REACT_APP_OPENWEATHER_API_KEY` is set, and the map is fully
functional without it.

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

## PWA and offline

The service worker is built by create-react-app's Workbox integration from
[`src/service-worker.js`](./src/service-worker.js). It precaches the app shell
and every split chunk, serves map tiles cache-first with a 300-entry cap, and
runs weather API requests stale-while-revalidate.

Updates do not apply themselves. A waiting worker raises a prompt, because
silently reloading a page someone is reading — losing a map position or an open
search — is worse than an extra tap.

## Notifications

Severe weather alerts can raise a notification, with one honest limitation:
**there is no push, and there cannot be without a server.** PLAN §4.3 asks for
Web Push and PLAN §8 answers itself — push needs "a backend or a service like
Firebase Cloud Messaging" — and this project has no backend by instruction. So
notifications fire only while the app is open, and the settings panel says so
rather than implying a storm warning would wake you.

## Accessibility

PLAN §3 sets WCAG 2.1 AA as a success metric and PLAN §9 wants a Lighthouse
accessibility score of 90+. What that means in this codebase:

- **A contrast audit that runs as a test.** [`src/styles/contrast.test.ts`](./src/styles/contrast.test.ts)
  reads `tokens.css`, resolves the token cascade for all four theme
  combinations, and asserts WCAG ratios on every foreground/background pair the
  palette can produce — 138 checks. Changing a colour in the stylesheet and
  forgetting its contrast fails the build. This is also what found and fixed six
  real failures, including white-on-Rausch buttons at 3.5:1.
- **Rausch is not used for text.** Rausch on white measures 3.1:1, short of the
  4.5:1 body text needs. `--color-primary-text` and `--color-primary-solid` are
  derived from it for those two jobs; the one exception is the wordmark, which
  WCAG exempts as a logotype.
- **Search is a real `role="combobox"`** operable by keyboard with
  `aria-activedescendant`. Suggestions activate on `click`, not `pointerdown`, so
  keyboard and assistive-technology users can select one.
- **Charts carry a text alternative.** The SVG is `aria-hidden` and the same
  numbers are exposed as a visually-hidden table.
- **The map is not `aria-hidden`** — it holds focusable controls, and hiding a
  focusable element from the accessibility tree is an ARIA violation.
- Single `role="status"` loading regions, a skip link, `prefers-reduced-motion`
  plus a manual override, relative units throughout, and a high-contrast mode
  that removes the background gradients entirely.

## Theming

`auto` (the default) follows the sun at the location being viewed rather than
the clock in your browser, so checking Sydney from London after dark still shows
Sydney in daylight. The fallback before the forecast loads is 19:00–06:00 local.

## Testing

`npm test` runs the suite: pure-function units, the provider→model assembler,
and integration tests that mount the whole tree with only `fetch` stubbed.
There is no end-to-end suite — PLAN §7 puts it in Phase 5, which this project
skipped by choice.

## Preview

[mero-mausam.vercel.app](https://mero-mausam.vercel.app/)

## License

MIT
