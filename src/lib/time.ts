/**
 * Time formatting in the *location's* zone.
 *
 * A weather app that shows the browser's clock instead of the city's is subtly
 * useless — searching for Sydney from London should show Sydney's afternoon.
 * Every helper here therefore takes the location's IANA zone and falls back to
 * the browser zone only when the provider did not supply one.
 */

function formatter(
  timezone: string | undefined,
  options: Intl.DateTimeFormatOptions
): Intl.DateTimeFormat {
  try {
    return new Intl.DateTimeFormat("en-US", {
      ...options,
      ...(timezone ? { timeZone: timezone } : {}),
    });
  } catch {
    // An unrecognised zone string would otherwise throw during render.
    return new Intl.DateTimeFormat("en-US", options);
  }
}

/** e.g. "6:42 AM". */
export function formatClockTime(ms: number, timezone?: string): string {
  return formatter(timezone, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(ms));
}

/** e.g. "6 PM" — the compact label used along chart axes. */
export function formatHourLabel(ms: number, timezone?: string): string {
  return formatter(timezone, { hour: "numeric", hour12: true }).format(
    new Date(ms)
  );
}

/** e.g. "Mon". */
export function formatWeekday(ms: number, timezone?: string): string {
  return formatter(timezone, { weekday: "short" }).format(new Date(ms));
}

/** e.g. "Oct 25". */
export function formatShortDate(ms: number, timezone?: string): string {
  return formatter(timezone, { month: "short", day: "numeric" }).format(
    new Date(ms)
  );
}

/** e.g. "Friday, October 25". */
export function formatLongDate(ms: number, timezone?: string): string {
  return formatter(timezone, {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date(ms));
}

/** The calendar date as a sortable key in the location's zone. */
export function dateKeyInZone(ms: number, timezone?: string): string {
  return formatter(timezone, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(ms));
}

/** True when two instants fall on the same local calendar day. */
export function isSameLocalDay(
  a: number,
  b: number,
  timezone?: string
): boolean {
  return dateKeyInZone(a, timezone) === dateKeyInZone(b, timezone);
}

export function minutesBetween(fromMs: number, toMs: number): number {
  return Math.round((toMs - fromMs) / 60_000);
}

/**
 * Rounds to a human-friendly magnitude. Used for "Rain starting in 12 minutes"
 * and for the staleness line, where "in 14 minutes" beats "in 13.7 minutes".
 */
export function humanizeMinutes(minutes: number): string {
  const abs = Math.abs(Math.round(minutes));
  if (abs < 1) return "less than a minute";
  if (abs === 1) return "1 minute";
  if (abs < 60) return `${abs} minutes`;
  const hours = Math.floor(abs / 60);
  const rest = abs % 60;
  const hourLabel = hours === 1 ? "1 hour" : `${hours} hours`;
  if (rest === 0) return hourLabel;
  return `${hourLabel} ${rest === 1 ? "1 minute" : `${rest} minutes`}`;
}

/** "just now", "23 minutes ago", "3 hours ago". */
export function formatRelativePast(ms: number, now: number = Date.now()): string {
  const minutes = Math.round((now - ms) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${humanizeMinutes(minutes)} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours === 1 ? "1 hour" : `${hours} hours`} ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

/**
 * Hour of day, 0–23, in the given zone. Used by `auto` theme mode before the
 * forecast has loaded and there is no sunrise/sunset to consult.
 */
export function getLocalHour(ms: number, timezone?: string): number {
  const formatted = formatter(timezone, { hour: 'numeric', hour12: false }).format(
    new Date(ms)
  );
  const hour = Number.parseInt(formatted, 10);
  if (Number.isNaN(hour)) return new Date(ms).getHours();
  // `hour12: false` renders midnight as 24 in some ICU versions.
  return hour === 24 ? 0 : hour;
}
