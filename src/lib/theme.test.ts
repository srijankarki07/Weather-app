import { resolveTheme } from "./theme";

const base = {
  preference: "auto" as const,
  systemPrefersDark: false,
  localHour: 12,
};

describe("resolveTheme", () => {
  it("obeys an explicit light preference regardless of anything else", () => {
    expect(
      resolveTheme({
        ...base,
        preference: "light",
        isNight: true,
        localHour: 23,
        systemPrefersDark: true,
      })
    ).toBe("light");
  });

  it("obeys an explicit dark preference regardless of anything else", () => {
    expect(
      resolveTheme({
        ...base,
        preference: "dark",
        isNight: false,
        localHour: 12,
        systemPrefersDark: false,
      })
    ).toBe("dark");
  });

  it("follows the system when asked to", () => {
    expect(
      resolveTheme({ ...base, preference: "system", systemPrefersDark: true })
    ).toBe("dark");
    expect(
      resolveTheme({ ...base, preference: "system", systemPrefersDark: false })
    ).toBe("light");
  });

  describe("in auto mode", () => {
    it("prefers the location's own day/night over the clock", () => {
      // 3pm at the location but the sun is down — polar winter. The sun wins.
      expect(
        resolveTheme({ ...base, localHour: 15, isNight: true })
      ).toBe("dark");
      // 11pm but the sun is up — polar summer.
      expect(
        resolveTheme({ ...base, localHour: 23, isNight: false })
      ).toBe("light");
    });

    it("falls back to the clock before any data has loaded", () => {
      expect(resolveTheme({ ...base, localHour: 12 })).toBe("light");
      expect(resolveTheme({ ...base, localHour: 22 })).toBe("dark");
      expect(resolveTheme({ ...base, localHour: 3 })).toBe("dark");
    });

    it("switches at the documented boundaries", () => {
      // 19:00 is the first night hour, 06:00 the first day hour.
      expect(resolveTheme({ ...base, localHour: 18 })).toBe("light");
      expect(resolveTheme({ ...base, localHour: 19 })).toBe("dark");
      expect(resolveTheme({ ...base, localHour: 5 })).toBe("dark");
      expect(resolveTheme({ ...base, localHour: 6 })).toBe("light");
    });

    it("ignores the system preference, which is what separates it from system mode", () => {
      expect(
        resolveTheme({ ...base, localHour: 12, systemPrefersDark: true })
      ).toBe("light");
    });
  });
});
