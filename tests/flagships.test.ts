import { describe, expect, it } from "vitest";
import { FLAGSHIP_PRESETS, PRESETS, WATCH_FAMILIES, normalizeDesign } from "../src/lib/presets";
import { designSchema, preferencesSchema, watchInputSchema } from "../src/lib/validation";
import { DEFAULT_PREFERENCES } from "../src/lib/types";
import { getClockParts, getDayNightState } from "../src/lib/time";

describe("five new Black Label flagships", () => {
  const additions = FLAGSHIP_PRESETS.filter(preset => preset.id !== "reactor");
  it("has five different dial architectures and a shared complete family registry", () => {
    expect(additions.map(preset => preset.id)).toEqual(["phantom", "helios", "abyss", "prism", "nocturne"]);
    expect(new Set(additions.map(preset => preset.design.texture)).size).toBe(5);
    expect(new Set(additions.map(preset => preset.design.complication)).size).toBe(5);
    expect(PRESETS.map(preset => preset.id)).toEqual([...WATCH_FAMILIES]);
  });
  it("round-trips every new design, personal engraving, and active selection through server validation", () => {
    for (const preset of additions) {
      const design = { ...preset.design, initials: "WM", signature: "MY EDITION" };
      const record = watchInputSchema.parse(JSON.parse(JSON.stringify({ name: `${preset.name} private edition`, design })));
      expect(record.design).toEqual(design);
      expect(normalizeDesign(record.design)).toEqual(design);
      expect(preferencesSchema.parse({ ...DEFAULT_PREFERENCES, activeWatchId: preset.id, favoritePresets: PRESETS.map(item => item.id) }).favoritePresets).toEqual(PRESETS.map(item => item.id));
    }
  });
  it("accepts the day/night aperture as a mutually exclusive complication", () => {
    expect(designSchema.parse({ ...PRESETS[0].design, complication: "daynight" }).complication).toBe("daynight");
    expect(designSchema.safeParse({ ...additions[4].design, complication: ["daynight", "chronograph"] }).success).toBe(false);
  });
});

describe("24-hour civil day/night indicator", () => {
  const at = (iso: string, zone = "UTC") => getDayNightState(getClockParts(Date.parse(iso), zone));
  it("shows the correct hemisphere at midnight, noon, and both daily boundaries", () => {
    expect(at("2026-10-04T00:00:00Z")).toEqual({ angle: 0, isDay: false, hour: 0 });
    expect(at("2026-10-04T05:59:59Z").isDay).toBe(false);
    expect(at("2026-10-04T06:00:00Z")).toEqual({ angle: 90, isDay: true, hour: 6 });
    expect(at("2026-10-04T12:00:00Z")).toEqual({ angle: 180, isDay: true, hour: 12 });
    expect(at("2026-10-04T17:59:59Z").isDay).toBe(true);
    expect(at("2026-10-04T18:00:00Z")).toEqual({ angle: 270, isDay: false, hour: 18 });
  });
  it("uses the selected time zone and follows DST transitions", () => {
    expect(at("2026-10-04T16:00:00Z", "America/New_York")).toEqual({ angle: 180, isDay: true, hour: 12 });
    expect(at("2026-10-04T16:00:00Z", "Asia/Tokyo")).toEqual({ angle: 15, isDay: false, hour: 1 });
    expect(at("2026-03-08T06:59:59Z", "America/New_York").hour).toBe(1);
    expect(at("2026-03-08T07:00:00Z", "America/New_York").hour).toBe(3);
    expect(at("2026-11-01T05:30:00Z", "America/New_York")).toEqual(at("2026-11-01T06:30:00Z", "America/New_York"));
  });
});
