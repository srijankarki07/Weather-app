# Mero Mausam Revamp — Complete Plan

## 1. Executive Summary

Mero Mausam is a basic weather application that displays current conditions, a 5-day forecast, air quality, and hourly outlook for a searched location. While functional, it lacks the depth, interactivity, and intelligence that modern weather users expect in 2026. This plan outlines a comprehensive revamp targeting three pillars: **actionable intelligence** (not just data), **visual storytelling** (maps, charts, animations), and **platform maturity** (PWA, offline, accessibility, performance). The goal is to transform Mero Mausam from a data viewer into a decision-support tool that answers the question users actually care about: "What does this weather mean for my day?"

## 2. Current State Assessment

**What exists:** Search input, current location button, current temperature, condition summary, 5-day forecast, air quality index breakdown, sunrise/sunset, feels-like, humidity, visibility, wind, and a basic hourly carousel.

**What is missing (critical gaps for 2026):**

- No precipitation nowcast (minute-by-minute or short-term rain/snow prediction)
- No radar or interactive weather maps
- No severe weather alerts or push notifications
- No UV index, dew point, pressure trend, or comfort indices
- No historical data or trend comparison
- No saved locations, favorites, or multi-city dashboard
- No PWA capabilities (offline access, installability)
- No data visualization beyond raw numbers
- No accessibility considerations (screen reader, high contrast, keyboard nav)
- No error states, loading skeletons, or graceful degradation
- No dark mode or theme adaptation

## 3. Revamp Goals & Success Metrics

| Goal                                 | Success Metric                                             |
| ------------------------------------ | ---------------------------------------------------------- |
| Increase user engagement time        | >2 min average session duration                            |
| Make app "glanceable" and actionable | Users can answer "Should I go outside?" in <5 seconds      |
| Achieve offline resilience           | App loads and displays last-known forecast without network |
| Pass accessibility audit             | WCAG 2.1 AA compliance                                     |
| Reduce perceived load time           | First Contentful Paint <1.5s on 3G                         |
| Enable retention                     | Push notification opt-in rate >30%                         |

## 4. Feature Roadmap

### 4.1 Precipitation Intelligence (Highest Priority)

**Minute-by-minute nowcast:** Display a "Rain starting in 12 minutes" or "Rain ending in 25 minutes" banner using OpenWeather One Call 3.0's 1-minute forecast for the next hour, or Rainbow.AI's hyperlocal nowcast API. This is the single most actionable feature you can add.

**Precipitation probability chart:** A 24-hour horizontal bar chart showing rain probability per hour, color-coded by intensity. OpenWeather's hourly forecast provides `pop` (probability of precipitation); pair it with `rain.1h` and `snow.1h` volumes.

**Radar overlay:** Integrate Leaflet or Mapbox GL JS with radar tile layers from Visual Crossing, Tomorrow.io, or Xweather. Users should be able to scrub through time and see precipitation moving across the map.

### 4.2 Health & Environmental Data

**Air Quality enhancement:** Your current AQI display shows pollutants but lacks interpretation. Add:

- AQI trend arrow (improving/worsening vs. 24h ago)
- Health recommendations: "Sensitive groups should limit outdoor exertion"
- Pollutant-specific guidance (PM2.5: "Avoid prolonged outdoor activity")
- Pollen forecasts (grass, tree, weed, mold) — available from Ambee, Tomorrow.io, or WeatherAPI

**UV Index with burn-time estimate:** Instead of just "UV 10," show "Burn time: 15 minutes." Include hourly UV curve and peak protection window. This is a high-engagement feature that users check before outdoor plans.

**Dew point and comfort index:** Dew point is more meaningful than humidity for comfort. Add a "Muggy / Comfortable / Dry" label based on dew point ranges.

### 4.3 Severe Weather & Alerts

**Government alerts banner:** OpenWeather One Call 3.0 includes government weather alerts in the response. Display a prominent but non-intrusive banner with severity color-coding (yellow/orange/red) and event details.

**Push notifications (PWA):** Implement Web Push notifications for:

- Severe weather alerts for saved locations
- "Rain starting soon" nowcast alerts
- Daily morning summary at user-configured time

Use the Push API with a service worker. For production, you'll need a push service (VAPID keys + a backend or a service like Firebase Cloud Messaging).

### 4.4 Personalization & Location Management

**Saved locations:** Allow users to save multiple cities with nicknames ("Home," "Work," "Dad's place"). Store in IndexedDB (via Dexie or idb-keyval) for offline persistence.

**Multi-city dashboard:** A swipeable or tabbed view showing cards for each saved location with current temp, high/low, and condition icon. This transforms the app from a single-city checker into a travel/work dashboard.

**Auto-detect location with permission UX:** Improve the current geolocation flow with a clear explanation of why location is needed, fallback to manual search, and remember the user's preference.

**Recent searches:** Store last 5–10 searched locations for quick re-access.

### 4.5 Data Visualization

**Temperature curve chart:** A smooth line chart showing hourly temperature for the next 24–48 hours, with a highlighted "now" marker and high/low annotations. Libraries: Recharts (React-friendly) or Chart.js.

**Precipitation + temperature combined chart:** Overlay temperature line with precipitation bars on the same timeline. This is the "at-a-glance" view that weather enthusiasts love.

**Wind visualization:** Instead of just "0.28 km/h," show a wind rose or directional arrow with gust data. Weathergraph's widgets do this well — a simple arrow with speed label is enough.

**7-day trend bars:** Horizontal bars showing daily high/low range, with the current day highlighted. Makes week-over-week comparison intuitive.

### 4.6 UI/UX Modernization

**Dynamic backgrounds:** Change the app background based on current conditions and time of day. Clear day = warm gradient; rain = muted blues; night = deep dark tones. This is a low-effort, high-impact visual upgrade.

**Scroll-based single-screen layout:** Following meteoblue's 2026 redesign, structure the app as a scrollable single screen where key information is visible without navigation. Current conditions at top, then nowcast, then hourly chart, then 7-day, then details.

**Glassmorphism with restraint:** Use frosted-glass cards over dynamic backgrounds for a modern, layered feel. Avoid overuse — contrast and readability must remain primary.

**Skeleton loading states:** Replace spinners with skeleton screens that match the final layout. This reduces perceived latency significantly.

**Error resilience:** Handle API failures gracefully with cached data and clear "Last updated 23 minutes ago" messaging. Never show a blank screen.

### 4.7 Accessibility & Inclusivity

- **ARIA labels** on all interactive elements (search, location button, chart data points)
- **Screen reader announcements** for weather changes using `aria-live` regions
- **High-contrast mode** toggle with WCAG AA contrast ratios (4.5:1 minimum)
- **Keyboard navigation** for all controls including charts
- **Reduced motion support** via `prefers-reduced-motion` media query for animations
- **Text scaling** — avoid fixed pixel heights; use relative units

### 4.8 PWA & Offline Capabilities

**Service worker with stale-while-revalidate:** Cache API responses so the last forecast is available offline. Cache app shell assets for instant loading.

**Installable PWA:** Add a web app manifest with icons, theme color, and display mode `standalone`. This gives you "app-like" installation without app store friction.

**Offline indicator:** Show a subtle banner when offline and display the timestamp of the last successful data fetch.

### 4.9 What to Deliberately Avoid

Not every feature is worth building. Skip these for now:

- **AI weather assistant / chatbot:** High complexity, low retention value for a personal project
- **Historical archive browsing (47+ years):** Overkill for a weather app; users rarely dig into it
- **3D globe:** Beautiful but expensive in bundle size and performance
- **Social sharing:** Low priority unless you have a specific use case
- **Long-range forecast beyond 14 days:** Accuracy drops significantly; 7–10 days is the practical sweet spot

## 5. Technical Architecture

### 5.1 Recommended Stack

| Layer            | Choice                            | Rationale                                                                                    |
| ---------------- | --------------------------------- | -------------------------------------------------------------------------------------------- |
| Framework        | Next.js 15 (App Router)           | SSR for initial load performance, API routes for secure key proxying, React 19 compatibility |
| Language         | TypeScript                        | Type safety for API responses and component props                                            |
| Styling          | Tailwind CSS + shadcn/ui          | Rapid iteration, consistent design system, accessible primitives                             |
| Data Fetching    | TanStack Query (React Query)      | Caching, background refetch, stale-while-revalidate, offline persistence                     |
| State Management | Zustand                           | Lightweight global state for saved locations, preferences, theme                             |
| Charts           | Recharts                          | React-native charting, composable, good enough for weather viz                               |
| Maps             | Leaflet + react-leaflet           | Lightweight, free tile layers, easier than Mapbox GL for simple radar overlays               |
| PWA              | next-pwa or custom service worker | Offline caching, installability                                                              |
| Storage          | IndexedDB via Dexie               | Saved locations, cached forecasts, user preferences                                          |
| Testing          | Vitest + React Testing Library    | Fast unit tests; Playwright for E2E                                                          |

### 5.2 Data Layer Architecture

```
┌─────────────────────────────────────────────┐
│                  UI Layer                    │
│  (Components, Pages, Charts, Maps)          │
├─────────────────────────────────────────────┤
│              Query Layer                     │
│  (TanStack Query hooks, cache keys)          │
├─────────────────────────────────────────────┤
│             Service Layer                    │
│  (API clients, data transformers,          │
│   error normalization, unit conversion)     │
├─────────────────────────────────────────────┤
│           External APIs                      │
│  OpenWeather One Call 3.0 / Open-Meteo      │
│  + Air Quality API + Geocoding API          │
└─────────────────────────────────────────────┘
```

**Key architectural decisions:**

- **Never call weather APIs directly from the client.** Use Next.js API routes (or Route Handlers) as a proxy. This hides your API key, allows response caching at the edge, and lets you merge multiple API responses into a single payload for the client.
- **Normalize API responses** into a single internal `WeatherData` type. This makes swapping providers trivial and keeps UI components provider-agnostic.
- **Cache aggressively but invalidate intelligently.** Current weather: 10-minute stale time. Hourly forecast: 30 minutes. Daily forecast: 1 hour. Air quality: 30 minutes. Use TanStack Query's `staleTime` and `gcTime` to control this.
- **Persist saved locations and last-forecast to IndexedDB.** On app load, hydrate from IndexedDB first, then fetch fresh data in the background.

### 5.3 API Strategy

**Primary recommendation: OpenWeather One Call 3.0**

It covers current conditions, 1-minute nowcast, 48-hour hourly, 8-day daily, government alerts, and weather overview in a single call — 1,000 calls/day free. This simplifies your architecture enormously. The `exclude` parameter lets you skip minutely or daily if you only need parts, reducing payload size.

**Supplementary APIs:**

| Need                             | API                              | Free Tier              |
| -------------------------------- | -------------------------------- | ---------------------- |
| Air Quality (current pollutants) | OpenWeather Air Pollution API    | Included with One Call |
| Pollen                           | Tomorrow.io or Ambee             | Limited free tiers     |
| Radar tiles                      | Visual Crossing Weather Maps API | 1,000 records/day      |
| Geocoding (city search → coords) | OpenWeather Geocoding API        | 60 calls/min           |
| Historical comparison            | Open-Meteo (archive)             | No key, fair use       |

**Alternative consideration:** Open-Meteo offers 16-day forecasts, hourly resolution, no API key for non-commercial use, and 10,000 calls/day. If you want to avoid API key management entirely for the core forecast, build a hybrid: Open-Meteo for forecast + OpenWeather for air quality + alerts. The trade-off is more client-side merging logic.

### 5.4 Security & Environment

- API keys in `.env.local`, never committed
- All API calls proxied through Next.js Route Handlers
- Rate limiting on your own API routes (e.g., 30 requests/minute per IP) to prevent abuse if the app goes viral
- CORS restricted to your domain for production

## 6. UI/UX Blueprint

### Screen Structure (Mobile-first, scroll-based)

```
┌─────────────────────────────────┐
│  [Search Bar]    [Location Icon] │  ← Sticky header
├─────────────────────────────────┤
│                                  │
│        24°C  ☁️                  │  ← Hero card
│        Broken Clouds             │    Dynamic background
│        Kathmandu, NP             │
│        Feels like 26°            │
│                                  │
├─────────────────────────────────┤
│  ⚠️ Alert banner (if any)        │
├─────────────────────────────────┤
│  🌧️ Rain starting in 12 min     │  ← Nowcast card
├─────────────────────────────────┤
│  Hourly | 7-Day | Radar         │  ← Tab switcher
├─────────────────────────────────┤
│  [Temperature curve chart]       │
│  [Precipitation bars overlay]    │
├─────────────────────────────────┤
│  Today's Highlights               │
│  ┌──────┐ ┌──────┐ ┌──────┐    │
│  │ AQI  │ │ UV   │ │ Wind │    │
│  │  3   │ │  8   │ │ 0.3  │    │
│  └──────┘ └──────┘ └──────┘    │
│  ┌──────┐ ┌──────┐ ┌──────┐    │
│  │Humid │ │ Vis  │ │Press │    │
│  └──────┘ └──────┘ └──────┘    │
├─────────────────────────────────┤
│  Air Quality Detail              │
│  [Pollutant bars + guidance]     │
├─────────────────────────────────┤
│  Sunrise / Sunset                │
│  [Arc visualization]             │
├─────────────────────────────────┤
│  Saved Locations                 │
│  [City cards]                    │
└─────────────────────────────────┘
```

### Design Principles

1. **Glanceable first:** The most important number (current temp) should be readable from 3 feet away.
2. **Progressive disclosure:** Details appear as you scroll; the top is the summary.
3. **Color as information:** Temperature gradients (blue→red), precipitation intensity (light→dark blue), AQI severity (green→yellow→orange→red→purple).
4. **Motion with purpose:** Subtle transitions on data update, not decorative animations.
5. **Dark mode by default for evening hours:** Auto-switch based on local time or system preference.

## 7. Implementation Phases

### Phase 1: Foundation (Week 1–2)

- Set up Next.js 15 + TypeScript + Tailwind + shadcn/ui
- Build API proxy route for OpenWeather One Call 3.0
- Implement TanStack Query hooks for current + forecast data
- Create core component library (WeatherCard, MetricTile, ConditionIcon)
- Basic responsive layout with skeleton loading

### Phase 2: Data Depth (Week 3–4)

- Integrate air quality + UV + dew point into highlights grid
- Build hourly temperature + precipitation chart
- Implement 7-day trend bars
- Add sunrise/sunset arc visualization
- Error states and offline fallback with cached data

### Phase 3: Interactivity (Week 5–6)

- Leaflet map with radar overlay
- Minute-by-minute nowcast banner
- Saved locations with IndexedDB persistence
- Multi-city dashboard view
- Recent searches

### Phase 4: Platform (Week 7–8)

- Service worker + PWA manifest
- Push notification setup (VAPID + service worker)
- Accessibility audit and fixes (ARIA, keyboard, contrast)
- Performance optimization (bundle analysis, image optimization, prefetching)
- Dark mode + dynamic backgrounds

### Phase 5: Polish (Week 9–10)

- Reduced motion support
- Text scaling testing
- Comprehensive error handling
- E2E tests with Playwright
- Lighthouse audit (target: 90+ across all categories)
- Deployment with edge caching

## 8. Risks & Mitigations

| Risk                         | Mitigation                                                                    |
| ---------------------------- | ----------------------------------------------------------------------------- |
| API rate limits exceeded     | Cache aggressively; implement request deduplication; fallback to Open-Meteo   |
| Map library bundle size      | Lazy-load Leaflet only when radar tab is opened; use dynamic import           |
| Push notification complexity | Start with in-app alerts; add push only if you have a backend or use FCM      |
| Over-engineering             | Ship Phase 1 before starting Phase 3; each phase should be deployable         |
| API key exposure             | Proxy all calls through Next.js route handlers; never expose keys client-side |

## 9. Definition of Done

A revamp is complete when:

- [ ] User can check current conditions, 7-day forecast, and hourly chart without leaving the main screen
- [ ] Precipitation nowcast displays when rain/snow is imminent within 60 minutes
- [ ] Radar map loads with at least temperature and precipitation layers
- [ ] Saved locations persist across browser sessions and work offline
- [ ] App passes Lighthouse accessibility audit at 90+
- [ ] App is installable as a PWA and displays cached data offline
- [ ] All API keys are server-side only
- [ ] No console errors in production build
- [ ] App loads in under 2 seconds on a 4G connection

This plan prioritizes the features that actually change user behavior (nowcast, radar, saved locations, PWA) over vanity features (AI chat, 3D globe). The phased approach ensures you have a shippable improvement at every stage, and the technical architecture is designed to scale from a personal project to a production-grade application without a rewrite.
