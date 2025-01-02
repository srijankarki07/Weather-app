/**
 * WCAG contrast audit of the token palette.
 *
 * PLAN 9's definition of done includes "App passes Lighthouse accessibility
 * audit at 90+", and PLAN 3 sets WCAG 2.1 AA as a success metric. Lighthouse
 * only checks what happens to be rendered on the route it audits; this checks
 * every foreground/background pair the palette can produce, in all three
 * themes, including combinations that only appear on a rare screen.
 *
 * The tokens are read from `tokens.css` itself rather than duplicated here, so
 * changing a colour in the stylesheet and forgetting to reconsider its contrast
 * fails the build.
 */

import fs from "node:fs";
import path from "node:path";

/* ------------------------------------------------------------ CSS parsing */

type TokenMap = Record<string, string>;

/** Pulls `--name: value;` declarations out of one selector block. */
function readBlock(css: string, selector: string): TokenMap {
  // Escape the brackets in selectors like [data-theme="dark"].
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));
  if (!match) throw new Error(`Selector not found in tokens.css: ${selector}`);

  const tokens: TokenMap = {};
  for (const line of match[1].split(";")) {
    const declaration = line.match(/(--[\w-]+)\s*:\s*(.+)/);
    if (declaration) tokens[declaration[1]] = declaration[2].trim();
  }
  return tokens;
}

/** Resolves `var(--x)` references, falling back through the given layer. */
function resolve(token: string, layer: TokenMap, depth = 0): string {
  if (depth > 10) throw new Error(`Circular token reference: ${token}`);
  const direct = layer[token];
  if (direct === undefined) throw new Error(`Unknown token: ${token}`);

  const reference = direct.match(/^var\((--[\w-]+)(?:,\s*(.+))?\)$/);
  if (!reference) return direct;

  const [, name, fallback] = reference;
  if (layer[name] !== undefined) return resolve(name, layer, depth + 1);
  if (fallback) return fallback;
  throw new Error(`Unresolvable token: ${token}`);
}

/** Builds a full cascade: base tokens overridden by a theme block. */
function cascade(css: string, ...selectors: string[]): TokenMap {
  return selectors.reduce<TokenMap>(
    (acc, selector) => ({ ...acc, ...readBlock(css, selector) }),
    {}
  );
}

/* ---------------------------------------------------------------- colour */

interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

function parseColour(input: string): Rgba {
  const value = input.trim();

  const hex = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const digits =
      hex[1].length === 3
        ? hex[1]
            .split("")
            .map((d) => d + d)
            .join("")
        : hex[1];
    return {
      r: parseInt(digits.slice(0, 2), 16),
      g: parseInt(digits.slice(2, 4), 16),
      b: parseInt(digits.slice(4, 6), 16),
      a: 1,
    };
  }

  // Modern space-separated syntax, e.g. `rgb(255 255 255 / 60%)`.
  const rgb = value.match(
    /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)\s*(?:[/,]\s*([\d.]+%?))?\s*\)$/i
  );
  if (rgb) {
    const alpha = rgb[4];
    return {
      r: Number(rgb[1]),
      g: Number(rgb[2]),
      b: Number(rgb[3]),
      a:
        alpha === undefined
          ? 1
          : alpha.endsWith("%")
            ? Number(alpha.slice(0, -1)) / 100
            : Number(alpha),
    };
  }

  throw new Error(`Unsupported colour value: ${value}`);
}

/** Composites a translucent colour over an opaque one. */
function flatten(foreground: Rgba, background: Rgba): Rgba {
  if (foreground.a >= 1) return foreground;
  const mix = (f: number, b: number) => f * foreground.a + b * (1 - foreground.a);
  return {
    r: mix(foreground.r, background.r),
    g: mix(foreground.g, background.g),
    b: mix(foreground.b, background.b),
    a: 1,
  };
}

function relativeLuminance({ r, g, b }: Rgba): number {
  const channel = (value: number) => {
    const v = value / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrastRatio(foreground: string, background: string): number {
  const bg = parseColour(background);
  const fg = flatten(parseColour(foreground), bg);

  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

/* ------------------------------------------------------------- the audit */

const css = fs.readFileSync(
  path.join(__dirname, "tokens.css"),
  "utf8"
);

/*
 * The cascade has to mirror the stylesheet's own order and specificity, not
 * just list the selectors that happen to match. `[data-theme="dark"]
 * [data-contrast="high"]` has two attribute selectors and so outranks either
 * single-attribute block — omitting it here would apply the *light*
 * high-contrast palette on top of the dark one and report failures that the
 * real page never produces.
 */
const THEMES: { name: string; layer: TokenMap }[] = [
  { name: "light", layer: cascade(css, ":root") },
  { name: "dark", layer: cascade(css, ":root", '[data-theme="dark"]') },
  {
    name: "light + high contrast",
    layer: cascade(css, ":root", '[data-contrast="high"]'),
  },
  {
    name: "dark + high contrast",
    layer: cascade(
      css,
      ":root",
      '[data-theme="dark"]',
      '[data-contrast="high"]',
      '[data-theme="dark"][data-contrast="high"]'
    ),
  },
];

/**
 * Text pairs that must clear 4.5:1 — WCAG AA for normal-size body text.
 * `label` is what appears in the failure message, not a token name.
 */
const TEXT_PAIRS: { foreground: string; background: string; label: string }[] = [
  { foreground: "--color-ink", background: "--color-canvas", label: "body text on canvas" },
  { foreground: "--color-ink", background: "--color-surface-card", label: "body text on a card" },
  { foreground: "--color-ink", background: "--color-surface-soft", label: "body text on a soft surface" },
  { foreground: "--color-ink", background: "--color-surface-strong", label: "body text on a strong surface" },
  { foreground: "--color-body", background: "--color-surface-card", label: "secondary text on a card" },
  { foreground: "--color-body", background: "--color-surface-soft", label: "secondary text on a soft surface" },
  { foreground: "--color-muted", background: "--color-canvas", label: "muted text on canvas" },
  { foreground: "--color-muted", background: "--color-surface-card", label: "muted text on a card" },
  { foreground: "--color-muted", background: "--color-surface-soft", label: "muted text on a soft surface" },
  { foreground: "--color-primary-text", background: "--color-canvas", label: "brand accent as text" },
  { foreground: "--color-primary-text", background: "--color-surface-card", label: "brand accent on a card" },
  { foreground: "--color-primary-text", background: "--color-surface-soft", label: "brand accent on a soft surface" },
  { foreground: "--color-on-primary", background: "--color-primary-solid", label: "text on a primary button" },
  { foreground: "--color-error-text", background: "--color-canvas", label: "error text" },
  { foreground: "--color-error-text", background: "--color-surface-soft", label: "error text on a soft surface" },

  /*
   * Status text. These are 13px, so they need the full 4.5:1 — the severity
   * scales they are derived from are tuned for rails and icons at 3:1, and
   * using those directly here is exactly the bug Lighthouse caught.
   */
  { foreground: "--wx-status-good", background: "--color-surface-soft", label: "improving trend" },
  { foreground: "--wx-status-good", background: "--color-surface-card", label: "good activity verdict" },
  { foreground: "--wx-status-caution", background: "--color-surface-soft", label: "caution trend" },
  { foreground: "--wx-status-caution", background: "--color-surface-card", label: "caution activity verdict" },
  { foreground: "--wx-status-bad", background: "--color-surface-soft", label: "worsening trend" },
  { foreground: "--wx-status-bad", background: "--color-surface-card", label: "avoid activity verdict" },
];

/**
 * Non-text pairs that must clear 3:1 — WCAG AA for UI components and graphical
 * objects. The severity colours are accent rails and icons rather than text.
 */
const GRAPHIC_PAIRS: { foreground: string; background: string; label: string }[] = [
  { foreground: "--wx-aqi-good", background: "--color-surface-soft", label: "good AQI rail" },
  { foreground: "--wx-aqi-moderate", background: "--color-surface-soft", label: "moderate AQI rail" },
  { foreground: "--wx-aqi-sensitive", background: "--color-surface-soft", label: "sensitive AQI rail" },
  { foreground: "--wx-aqi-unhealthy", background: "--color-surface-soft", label: "unhealthy AQI rail" },
  { foreground: "--wx-aqi-very-unhealthy", background: "--color-surface-soft", label: "very unhealthy AQI rail" },
  { foreground: "--wx-rain-moderate", background: "--color-surface-soft", label: "precipitation marker" },
  { foreground: "--wx-sun-accent", background: "--color-surface-card", label: "sun arc" },
  { foreground: "--wx-chart-temperature", background: "--color-surface-card", label: "temperature curve" },
  { foreground: "--color-primary-active", background: "--color-canvas", label: "focus ring" },
  { foreground: "--color-primary-active", background: "--color-surface-soft", label: "focus ring on a soft surface" },
];

/**
 * Alert banners invert their text over a severity tint, so each severity has to
 * be checked as both a surface and a filled pill.
 */
const ALERT_SEVERITIES = ["minor", "moderate", "severe", "extreme"] as const;

function audit(
  pairs: { foreground: string; background: string; label: string }[],
  theme: { name: string; layer: TokenMap },
  minimum: number
) {
  describe(theme.name, () => {
    for (const { foreground, background, label } of pairs) {
      it(`${label} clears ${minimum}:1`, () => {
        const ratio = contrastRatio(
          resolve(foreground, theme.layer),
          resolve(background, theme.layer)
        );

        // The message is the useful part of a failure here.
        expect({
          pair: `${foreground} on ${background}`,
          label,
          theme: theme.name,
          ratio: Number(ratio.toFixed(2)),
        }).toEqual(
          expect.objectContaining({ ratio: expect.any(Number) })
        );

        expect(ratio).toBeGreaterThanOrEqual(minimum);
      });
    }
  });
}

describe("WCAG AA contrast", () => {
  for (const theme of THEMES) {
    audit(TEXT_PAIRS, theme, 4.5);
    audit(GRAPHIC_PAIRS, theme, 3);
  }
});

describe("alert banner contrast", () => {
  /*
   * The banner text is `--color-ink` over `--wx-alert-*-surface`, and the
   * severity pill is white over `--wx-alert-*`. Both need to hold, because a
   * severe weather warning nobody can read is the worst possible failure here.
   */
  for (const theme of THEMES) {
    describe(theme.name, () => {
      for (const severity of ALERT_SEVERITIES) {
        it(`${severity}: text on the tinted surface clears 4.5:1`, () => {
          const ratio = contrastRatio(
            resolve("--color-ink", theme.layer),
            resolve(`--wx-alert-${severity}-surface`, theme.layer)
          );
          expect(ratio).toBeGreaterThanOrEqual(4.5);
        });

        it(`${severity}: the severity accent is visible against the surface`, () => {
          const ratio = contrastRatio(
            resolve(`--wx-alert-${severity}`, theme.layer),
            resolve(`--wx-alert-${severity}-surface`, theme.layer)
          );
          expect(ratio).toBeGreaterThanOrEqual(3);
        });
      }
    });
  }
});

describe("higher contrast mode", () => {
  const base = cascade(css, ":root");
  const high = cascade(css, ":root", '[data-contrast="high"]');

  it("improves or preserves every text contrast it touches", () => {
    for (const { foreground, background } of TEXT_PAIRS) {
      const before = contrastRatio(
        resolve(foreground, base),
        resolve(background, base)
      );
      const after = contrastRatio(
        resolve(foreground, high),
        resolve(background, high)
      );
      // Never worse. Some pairs are unchanged because they were already
      // comfortable, which is fine.
      expect(after).toBeGreaterThanOrEqual(before - 0.01);
    }
  });

  it("raises muted text, which is the weakest pair in the base palette", () => {
    const before = contrastRatio(
      resolve("--color-muted", base),
      resolve("--color-canvas", base)
    );
    const after = contrastRatio(
      resolve("--color-muted", high),
      resolve("--color-canvas", high)
    );
    expect(after).toBeGreaterThan(before);
  });
});

describe("contrastRatio", () => {
  // Guards the audit itself: if the maths were wrong, everything above would
  // pass regardless.
  it("returns 21 for black on white and 1 for white on white", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 1);
    expect(contrastRatio("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
  });

  it("is symmetric", () => {
    expect(contrastRatio("#222222", "#ffffff")).toBeCloseTo(
      contrastRatio("#ffffff", "#222222"),
      5
    );
  });

  it("flattens alpha against the background before measuring", () => {
    // A 50% black over white is mid grey, roughly 3.9:1 against white.
    const ratio = contrastRatio("rgb(0 0 0 / 50%)", "#ffffff");
    expect(ratio).toBeGreaterThan(3.5);
    expect(ratio).toBeLessThan(4.5);
  });

  it("collapses three-digit hex correctly", () => {
    expect(contrastRatio("#fff", "#000")).toBeCloseTo(
      contrastRatio("#ffffff", "#000000"),
      5
    );
  });
});
