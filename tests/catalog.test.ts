import { describe, expect, it } from "vitest";
import {
  CATALOG_CATEGORIES, WATCH_CATALOG_ENTRIES, WATCH_CATALOG_SOURCE, WATCH_CATALOG_TERMS, WATCH_CATALOG_WORKBOOK_ENTRIES, WATCH_CATALOG_SUPPLEMENT,
  applyCatalogOption, getCatalogAction,
} from "../src/lib/watch-catalog";
import { PRESETS, getComplications, isCompatibleDesign, setComplications } from "../src/lib/presets";
import { designSchema } from "../src/lib/validation";
import type { WatchDesign } from "../src/lib/types";

function entry(category: string, option: string) {
  const found = WATCH_CATALOG_ENTRIES.find(value => value.category === category && value.option === option);
  if (!found) throw new Error(`Missing source catalog entry: ${category} / ${option}`);
  return found;
}
const base: WatchDesign = { ...PRESETS[0].design, complication: "none", signature: "MY STUDIO", initials: "WM" };

describe("complete source watch catalog", () => {
  it("retains all 1,311 entries, all 30 terms, source rows and workbook provenance", () => {
    expect(WATCH_CATALOG_WORKBOOK_ENTRIES).toHaveLength(1311);
    expect(WATCH_CATALOG_ENTRIES).toHaveLength(1431);
    expect(WATCH_CATALOG_TERMS).toHaveLength(30);
    expect(CATALOG_CATEGORIES).toHaveLength(32);
    expect(WATCH_CATALOG_SOURCE).toMatchObject({ filename: "Mens_Watch_Options_Master_Catalog.xlsx", catalogSheet: "Catalog", termsSheet: "Terms and compatibility", headerRow: 8, firstRow: 9, lastRow: 1319, entryCount: 1311, categoryCount: 30, termCount: 30 });
    expect(WATCH_CATALOG_SOURCE.sha256).toMatch(/^[a-f\d]{64}$/);
    expect(new Set(WATCH_CATALOG_ENTRIES.map(value => value.id)).size).toBe(1431);
    expect(new Set(WATCH_CATALOG_WORKBOOK_ENTRIES.map(value => [value.category, value.subcategory, value.option].join("|"))).size).toBe(1311);
    for (const [index, value] of WATCH_CATALOG_WORKBOOK_ENTRIES.entries()) {
      expect(value.sourceRow).toBe(index + 9);
      expect(value.id).toBe(`catalog-${value.sourceRow}`);
      for (const field of [value.category, value.subcategory, value.option, value.description, value.availability]) expect(field.length).toBeGreaterThan(0);
    }
    expect(WATCH_CATALOG_WORKBOOK_ENTRIES.filter(value => value.sourceUrl)).toHaveLength(283);
    expect(WATCH_CATALOG_TERMS.find(value => value.term === "Water resistance")?.meaning).toContain("assembled tested watch");
    expect(WATCH_CATALOG_TERMS.map(value => value.sourceRow)).toEqual(Array.from({ length: 30 }, (_, index) => index + 8));
  });

  it("preserves source availability independently of app support", () => {
    const counts: Record<string, number> = {};
    for (const value of WATCH_CATALOG_WORKBOOK_ENTRIES) counts[value.availability] = (counts[value.availability] ?? 0) + 1;
    expect(counts).toEqual({ Common: 584, Specialist: 634, Bespoke: 48, "Rare/historical": 45 });
    const repeated = WATCH_CATALOG_ENTRIES.filter(value => value.option === "Circular brushing");
    expect(repeated).toHaveLength(2);
    expect(new Set(repeated.map(value => value.id)).size).toBe(2);
    expect(getCatalogAction(repeated.find(value => value.category === "Exterior finish")!)).toMatchObject({ kind: "appearance", patch: { caseFinish: "brushed" } });
    expect(getCatalogAction(repeated.find(value => value.category === "Dial")!)).toMatchObject({ kind: "reference" });
  });
});

describe("catalog options that the app can actually apply", () => {
  it("validates every mapped appearance and retains its exact intended fields", () => {
    const mapped = WATCH_CATALOG_ENTRIES.filter(value => getCatalogAction(value).kind === "appearance");
    expect(mapped.length).toBeGreaterThan(200);
    for (const value of mapped) {
      const action = getCatalogAction(value);
      if (action.kind !== "appearance") throw new Error("Unexpected action");
      const compatibleBase: WatchDesign = action.patch.secondsIndication === "chronograph" ? { ...base, complication: "chronograph" } : base;
      const result = applyCatalogOption(compatibleBase, value);
      expect(result.error, value.option).toBeUndefined();
      expect(result.design, value.option).toMatchObject({ ...action.patch, signature: base.signature, initials: base.initials, family: base.family });
      expect(isCompatibleDesign(result.design!), value.option).toBe(true);
      expect(designSchema.safeParse(result.design).success, value.option).toBe(true);
    }
  });

  it("applies new case, dial, hand, strap and finish choices without inventing functions", () => {
    const checks = [
      ["Cases", "Rectangle", { caseShape: "rectangle" }],
      ["Case materials", "Sterling silver / 925", { metal: "silver" }],
      ["Dial", "Mother-of-pearl dial", { texture: "motherofpearl" }],
      ["Hands", "Breguet or pomme", { hands: "breguet" }],
      ["Hour markers and numerals", "Mixed Roman and Arabic California dial", { markers: "california" }],
      ["Bands and straps", "NATO / G10-style", { strap: "nato" }],
      ["Bracelets", "Beads of rice", { strap: "bracelet", braceletStyle: "beads-of-rice" }],
      ["Exterior finish", "Pattern-etched Damascus", { caseFinish: "damascus" }],
      ["Crystals", "Faceted crystal", { crystalStyle: "faceted" }],
      ["Illumination and night legibility", "Full luminous dial", { lumeStyle: "full-dial" }],
    ] as const;
    for (const [category, option, expected] of checks) {
      expect(applyCatalogOption(base, entry(category, option)).design, option).toMatchObject({ ...expected, complication: "none" });
    }
    expect(base).toMatchObject({ hands: "baton", strap: "bracelet", caseShape: "octagonal" });
  });

  it("adds supported complications and preserves the existing functions", () => {
    const existing = setComplications(base, ["chronograph", "date", "gmt"]);
    const result = applyCatalogOption(existing, entry("Functions and complications", "Moon phase"));
    expect(result.error).toBeUndefined();
    expect(getComplications(result.design!)).toEqual(["chronograph", "date", "gmt", "moonphase"]);
    const again = applyCatalogOption(result.design!, entry("Functions and complications", "Moon phase"));
    expect(getComplications(again.design!)).toEqual(["chronograph", "date", "gmt", "moonphase"]);
    expect(getComplications(existing)).toEqual(["chronograph", "date", "gmt"]);
  });

  it("reports case and shared-slot conflicts instead of deleting selected functions", () => {
    const existing = setComplications(base, ["chronograph", "date", "moonphase"]);
    const daydate = applyCatalogOption(existing, entry("Functions and complications", "Day-date"));
    expect(daydate.error).toBeTruthy();
    expect(daydate.design).toBeUndefined();
    const calendar = applyCatalogOption(existing, entry("Functions and complications", "Month indication"));
    expect(calendar.error).toBeTruthy();
    expect(calendar.design).toBeUndefined();
    const round = applyCatalogOption(existing, entry("Cases", "Round"));
    expect(round.error).toMatch(/chronograph/);
    expect(round.design).toBeUndefined();
    expect(getComplications(existing)).toEqual(["chronograph", "date", "moonphase"]);
  });

  it("uses explicit digital-equivalent labels for physical function aliases", () => {
    expect(getCatalogAction(entry("Functions and complications", "Traveler GMT"))).toEqual({ kind: "complication", label: "Add GMT display", complication: "gmt" });
    expect(getCatalogAction(entry("Functions and complications", "Monopusher chronograph"))).toEqual({ kind: "complication", label: "Add chronograph display", complication: "chronograph" });
    expect(getCatalogAction(entry("Functions and complications", "Complete/triple calendar"))).toEqual({ kind: "complication", label: "Add digital calendar display", complication: "calendar" });
    expect(getCatalogAction(entry("Electronic and connected functions", "Thermometer"))).toEqual({ kind: "complication", label: "Add location weather display", complication: "weather" });
  });

  it("opens real tools separately from changing saved designs", () => {
    const targets = [
      ["Functions and complications", "Countdown timer", "instruments"],
      ["Functions and complications", "World time", "settings"],
      ["Accessibility and alternative readouts", "Talking watch/spoken time", "speak"],
    ] as const;
    for (const [category, option, target] of targets) {
      const value = entry(category, option);
      expect(getCatalogAction(value)).toMatchObject({ kind: "tool", tool: target });
      expect(applyCatalogOption(base, value).design).toBeUndefined();
    }
  });

  it("keeps unsupported sensors, certifications and physical capabilities as references", () => {
    const refs = [
      ["Performance and specifications", "Specified water-resistance rating"],
      ["Quality and certification", "COSC Chronometer Certified"],
      ["Electronic and connected functions", "ECG recording app"],
      ["Electronic and connected functions", "NFC/contactless payments"],
      ["Functions and complications", "Power-reserve indicator"],
      ["Functions and complications", "Perpetual calendar"],
      ["Functions and complications", "Tide indication"],
      ["Movement and power", "Manual-winding mechanical"],
    ];
    for (const [category, option] of refs) {
      const value = entry(category, option);
      expect(getCatalogAction(value), option).toMatchObject({ kind: "reference", reason: expect.any(String) });
      expect(applyCatalogOption(base, value).design, option).toBeUndefined();
    }
  });
});

describe("user-supplied bezel and seconds specification supplement", () => {
  it("keeps all 120 supplied specifications separate from original workbook provenance", () => {
    expect(WATCH_CATALOG_SUPPLEMENT).toHaveLength(120);
    expect(WATCH_CATALOG_SUPPLEMENT.filter(value => value.category === "Bezel specifications")).toHaveLength(89);
    expect(WATCH_CATALOG_SUPPLEMENT.filter(value => value.category === "Seconds indication and motion")).toHaveLength(31);
    for (const [index, value] of WATCH_CATALOG_SUPPLEMENT.entries()) {
      expect(value.id).toBe(`spec-${index + 1}`);
      expect(value.sourceKind).toBe("supplement");
      expect(value.sourceLabel).toBe("User-supplied specifications");
      expect(value).not.toHaveProperty("sourceRow");
    }
    expect(new Set(WATCH_CATALOG_SUPPLEMENT.filter(value => value.category === "Bezel specifications").map(value => value.subcategory)).size).toBe(14);
  });

  it("maps motion independently of physical movement type and preserves the chosen advances", () => {
    const motion = [
      ["One-second ticking", "tick", undefined],
      ["Mechanical deadbeat / jumping seconds", "tick", undefined],
      ["Continuous glide", "sweep", undefined],
      ["Multistep quartz", "stepped", 4],
      ["18,000 vph / 5 advances per second", "stepped", 5],
      ["21,600 vph / 6 advances per second", "stepped", 6],
      ["28,800 vph / 8 advances per second", "stepped", 8],
      ["36,000 vph / 10 advances per second", "stepped", 10],
      ["Precisionist / 16 advances per second", "stepped", 16],
    ] as const;
    for (const [option, secondsMotion, advances] of motion) {
      const value = entry("Seconds indication and motion", option);
      const result = applyCatalogOption(base, value);
      expect(result.design, option).toMatchObject({ secondsMotion });
      if (advances) expect(result.design?.secondsAdvances, option).toBe(advances);
      expect(value.notes).toContain("software animation");
      expect(designSchema.safeParse(result.design).success, option).toBe(true);
    }
    expect(entry("Seconds indication and motion", "Precisionist / 16 advances per second").sourceUrl).toContain("bulova.com");
    expect(entry("Seconds indication and motion", "Continuous glide").sourceUrl).toContain("grand-seiko.com");
    expect(entry("Seconds indication and motion", "Mechanical deadbeat / jumping seconds").sourceUrl).toContain("alange-soehne.com");
    expect(entry("Bezel specifications", "Bezel function selection").sourceUrl).toContain("rolex.com");
  });

  it("requires a real stopwatch source and rejects occupied seconds placements without silently normalizing", () => {
    const chrono = entry("Seconds indication and motion", "Chronograph seconds");
    expect(applyCatalogOption(base, chrono)).toEqual({ error: expect.stringMatching(/Add the chronograph/i) });
    const enabled = applyCatalogOption({ ...base, complication: "chronograph" }, chrono);
    expect(enabled.design).toMatchObject({ complication: "chronograph", secondsIndication: "chronograph" });
    const lowerOccupied = { ...base, complication: "moonphase" as const };
    const small = applyCatalogOption(lowerOccupied, entry("Seconds indication and motion", "Small seconds"));
    expect(small.error).toMatch(/lower dial/i);
    expect(small.design).toBeUndefined();
    const offCenter = applyCatalogOption({ ...base, complication: "chronograph" }, entry("Seconds indication and motion", "Off-center"));
    expect(offCenter.error).toMatch(/register/i);
    expect(offCenter.design).toBeUndefined();
    expect(applyCatalogOption(lowerOccupied, entry("Seconds indication and motion", "Peripheral")).design).toMatchObject({ complication: "moonphase", secondsPlacement: "peripheral" });
  });

  it("keeps setting mechanics, unimplemented displays and advanced stopwatch behavior as references", () => {
    for (const option of ["Hacking / stop seconds", "Non-hacking", "Zero-reset", "Flyback", "Split-seconds", "Retrograde", "Sequential / relay retrograde", "Foudroyante / flying seconds", "Low-battery jumps", "Display clearing"]) {
      const value = entry("Seconds indication and motion", option);
      expect(getCatalogAction(value), option).toMatchObject({ kind: "reference" });
      expect(applyCatalogOption(base, value).design, option).toBeUndefined();
    }
    expect(getCatalogAction(entry("Functions and complications", "Hours and minutes"))).toEqual({ kind: "reference", reason: "Hours and minutes are already included in every watch." });
  });
});
