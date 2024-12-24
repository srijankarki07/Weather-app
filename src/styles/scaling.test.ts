/**
 * Text-scaling audit.
 *
 * PLAN 4.7: "Text scaling — avoid fixed pixel heights; use relative units."
 *
 * jsdom does no layout, so a browser-text-size test is not possible here. This
 * checks the thing that actually causes the problem instead: a literal pixel
 * value somewhere a rem belongs. Those are the declarations that clip when a
 * user raises their browser's base font size, and they are easy to introduce by
 * accident because they look harmless at the default size.
 *
 * Component stylesheets are held to the rule; `tokens.css` is not, because its
 * px values are the type scale itself, transcribed from DESIGN.md and consumed
 * through `var()` like every other token.
 */

import fs from "node:fs";
import path from "node:path";

const COMPONENTS_DIR = path.join(__dirname, "..", "components");
const STYLES_DIR = path.join(__dirname);

function collectCssFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return collectCssFiles(full);
    return entry.name.endsWith(".css") ? [full] : [];
  });
}

/**
 * Declarations that must be relative.
 *
 * `padding` is deliberately absent. Padding in px does not clip anything — a
 * button grows with its label either way — and WCAG 1.4.4 is about content
 * being lost, not about spacing scaling. The properties that genuinely break at
 * 200% text size are the ones that pin a box or a glyph size, which is what
 * PLAN 4.7 means by "avoid fixed pixel heights".
 */
const RELATIVE_REQUIRED = ["font-size", "line-height", "height"];

/**
 * A box under this many pixels cannot hold a legible line of text, so pinning
 * its height is safe whatever the user's font size. This covers slider tracks,
 * legend swatches and icon strokes without needing a per-file exception list
 * that would rot the moment a line number moved.
 */
const DECORATIVE_MAX_PX = 10;

/**
 * Documented exceptions: purely decorative geometry whose size has nothing to
 * do with text and which would look wrong if it grew.
 */
const ALLOWED_PX: Record<string, { property: string; reason: string }[]> = {
  "SettingsMenu.module.css": [
    { property: "height", reason: "the switch track and radio dot are decorations" },
  ],
  "ConditionIcon.module.css": [
    { property: "height", reason: "glyph strokes are geometry, not text" },
  ],
};

const cssFiles = [
  ...collectCssFiles(COMPONENTS_DIR),
  path.join(STYLES_DIR, "base.css"),
];

describe("text scaling", () => {
  it("finds stylesheets to audit", () => {
    // Guards the audit itself: a broken glob would make every check below
    // vacuously pass.
    expect(cssFiles.length).toBeGreaterThan(10);
  });

  for (const file of cssFiles) {
    const name = path.basename(file);

    it(`${name} expresses text sizing in relative units`, () => {
      const css = fs.readFileSync(file, "utf8");
      const allowed = ALLOWED_PX[name] ?? [];
      const offenders: string[] = [];

      for (const [index, line] of css.split("\n").entries()) {
        // Comments talk about px; only declarations matter.
        const code = line.replace(/\/\*.*?\*\//g, "");
        const pxDeclaration = code.match(
          /^\s*([a-z-]+)\s*:\s*[^;]*?(\d*\.?\d+)px/
        );
        if (!pxDeclaration) continue;

        const [, property, value] = pxDeclaration;
        if (!RELATIVE_REQUIRED.includes(property)) continue;

        /*
         * Font size is the one property with no acceptable px value — a fixed
         * glyph size is exactly what fails to scale — so it is checked before
         * the decorative tolerance below.
         */
        const size = Number(value);
        if (property !== "font-size" && size <= DECORATIVE_MAX_PX) continue;

        if (allowed.some((entry) => entry.property === property)) continue;

        offenders.push(`${name}:${index + 1}  ${property}: ${value}px`);
      }

      expect(offenders).toEqual([]);
    });
  }

  it("keeps the header's touch targets relative", () => {
    const css = fs.readFileSync(
      path.join(COMPONENTS_DIR, "weather", "SearchBar.module.css"),
      "utf8"
    );
    // The search field and the orb are the two most-tapped controls; a fixed
    // 56px field would not grow with the user's text.
    expect(css).toMatch(/\.field\s*\{[^}]*height:\s*3\.5rem/);
    expect(css).toMatch(/\.orb\s*\{[^}]*width:\s*2\.75rem/);
  });
});
