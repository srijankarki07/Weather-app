/**
 * Temperature to colour.
 *
 * PLAN 6 principle 3 asks for "colour as information: temperature gradients
 * (blue→red)". The stops below are interpolated in JS and returned as concrete
 * `rgb()` strings rather than CSS custom properties, because the value is
 * computed rather than tokenised — there is no token for "the colour of 17.4°C".
 *
 * The scale is deliberately desaturated. A full-saturation blue-to-red ramp
 * fights everything else in DESIGN.md's restrained palette, and these bars sit
 * behind text.
 */

interface Stop {
  celsius: number;
  rgb: [number, number, number];
}

const STOPS: Stop[] = [
  { celsius: -25, rgb: [74, 95, 193] },
  { celsius: -10, rgb: [74, 122, 214] },
  { celsius: 0, rgb: [66, 139, 255] },
  { celsius: 10, rgb: [63, 169, 177] },
  { celsius: 18, rgb: [79, 168, 132] },
  { celsius: 25, rgb: [214, 168, 74] },
  { celsius: 32, rgb: [226, 132, 58] },
  { celsius: 40, rgb: [214, 74, 60] },
];

/** Linear interpolation between the two nearest stops. */
export function temperatureColor(celsius: number): string {
  if (!Number.isFinite(celsius)) return "rgb(146, 146, 146)";

  const first = STOPS[0];
  const last = STOPS[STOPS.length - 1];
  if (celsius <= first.celsius) return toRgb(first.rgb);
  if (celsius >= last.celsius) return toRgb(last.rgb);

  for (let i = 1; i < STOPS.length; i += 1) {
    const upper = STOPS[i];
    if (celsius > upper.celsius) continue;

    const lower = STOPS[i - 1];
    const span = upper.celsius - lower.celsius;
    const t = span === 0 ? 0 : (celsius - lower.celsius) / span;

    return toRgb([
      Math.round(lower.rgb[0] + (upper.rgb[0] - lower.rgb[0]) * t),
      Math.round(lower.rgb[1] + (upper.rgb[1] - lower.rgb[1]) * t),
      Math.round(lower.rgb[2] + (upper.rgb[2] - lower.rgb[2]) * t),
    ]);
  }

  return toRgb(last.rgb);
}

function toRgb([r, g, b]: [number, number, number]): string {
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Positions a day's low-to-high range on a shared scale, as percentages.
 *
 * Every bar shares one scale so the days are comparable to each other — which
 * is the entire point of a trend strip. Each bar on its own scale looks
 * identical and says nothing.
 */
export function rangePosition(
  low: number,
  high: number,
  scaleMin: number,
  scaleMax: number
): { left: number; width: number } {
  const span = scaleMax - scaleMin;
  if (span <= 0) return { left: 0, width: 100 };

  const left = ((low - scaleMin) / span) * 100;
  const width = ((high - low) / span) * 100;

  return {
    left: clamp(left, 0, 100),
    // Never narrower than 6%: a day with almost no spread would otherwise
    // render as an invisible sliver.
    width: clamp(width, 6, 100 - clamp(left, 0, 100)),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
